import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { CLIPS_DIR, getCategoryStatus } from './clips.js';
import {
  PHASES,
  addPlayer,
  advanceFromWatch,
  checkGuessingComplete,
  createRoom,
  getPublicRoomState,
  proceedToContinueVote,
  removePlayer,
  selectRole,
  startGame,
  startNextRound,
  submitContinueVote,
  submitGuess,
  submitKeyframes,
  submitRatings,
  submitSketch,
  updateLiveDrawing,
} from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/clips', express.static(CLIPS_DIR));

app.get('/api/categories', (_req, res) => {
  res.json(getCategoryStatus());
});

const rooms = new Map();

function findWaitingRoomForCategory(categoryId) {
  for (const [, room] of rooms) {
    if (room.categoryId === categoryId && room.phase === PHASES.WAITING) {
      return room;
    }
  }
  return null;
}

function broadcastRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.players.forEach((p) => {
    const playerSocket = io.sockets.sockets.get(p.id);
    if (playerSocket) {
      playerSocket.emit('room:update', getPublicRoomState(room, p.id));
    }
  });
}

function startRoomTimer(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.timerInterval) return;

  room.timerInterval = setInterval(() => {
    const r = rooms.get(roomId);
    if (!r) return;

    if (r.phase !== PHASES.WAITING && r.phase !== PHASES.ROLE_SELECTION && r.phase !== PHASES.ROUND_RESULTS && r.phase !== PHASES.CONTINUE_VOTE) {
      r.sessionTimeLeft = Math.max(0, r.sessionTimeLeft - 1);
    }

    if (r.phase === PHASES.DRAWING || r.phase === PHASES.REDRAW) {
      r.sketchTimeLeft = Math.max(0, r.sketchTimeLeft - 1);
    }

    broadcastRoom(roomId);
  }, 1000);
}

function stopRoomTimer(roomId) {
  const room = rooms.get(roomId);
  if (room?.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
}

io.on('connection', (socket) => {
  let currentRoomId = null;
  let playerId = socket.id;

  socket.on('room:join', ({ roomId, categoryId, categoryFolder, playerName }, cb) => {
    let room;

    if (roomId && rooms.has(roomId)) {
      room = rooms.get(roomId);
      currentRoomId = roomId;
    } else if (categoryId && categoryFolder) {
      const existing = findWaitingRoomForCategory(categoryId);
      if (existing) {
        room = existing;
        currentRoomId = existing.id;
      } else {
        const id = uuidv4().slice(0, 8).toUpperCase();
        room = createRoom(categoryId, categoryFolder, playerId);
        room.id = id;
        rooms.set(id, room);
        currentRoomId = id;
      }
    } else {
      cb?.({ error: 'Invalid room' });
      return;
    }

    socket.join(currentRoomId);
    addPlayer(room, playerId, playerName);

    if (room.players.length === 1) {
      room.hostId = playerId;
    }

    cb?.({ roomId: currentRoomId, state: getPublicRoomState(room, playerId) });
    broadcastRoom(currentRoomId);
  });

  socket.on('room:start', (_data, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room || room.hostId !== playerId) {
      cb?.({ error: 'Not authorized' });
      return;
    }
    if (room.players.length < 2) {
      cb?.({ error: 'Need at least 2 players' });
      return;
    }
    startGame(room);
    startRoomTimer(currentRoomId);
    broadcastRoom(currentRoomId);
    cb?.({ success: true });
  });

  socket.on('role:select', ({ role }, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const ok = selectRole(room, playerId, role);
    if (ok) broadcastRoom(currentRoomId);
    cb?.({ success: ok });
  });

  socket.on('clip:watched', (_data, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const ok = advanceFromWatch(room, playerId);
    if (ok) broadcastRoom(currentRoomId);
    cb?.({ success: ok });
  });

  socket.on('keyframes:select', ({ indices }, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const ok = submitKeyframes(room, playerId, indices);
    if (ok) broadcastRoom(currentRoomId);
    cb?.({ success: ok });
  });

  socket.on('drawing:live', ({ data }) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    updateLiveDrawing(room, playerId, data);
    room.players
      .filter((p) => p.role === 'guesser')
      .forEach((p) => {
        io.to(p.id).emit('drawing:live', { data, sketchIndex: room.currentSketchIndex });
      });
  });

  socket.on('sketch:submit', ({ data }, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const result = submitSketch(room, playerId, data);
    if (result) broadcastRoom(currentRoomId);
    cb?.({ success: !!result, result });
  });

  socket.on('guess:submit', ({ guessId, ratings, comment }, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (guessId) submitGuess(room, playerId, guessId);
    if (ratings && room.phase === PHASES.GUESSING) submitRatings(room, playerId, ratings, comment);

    broadcastRoom(currentRoomId);
    cb?.({ success: true });
  });

  socket.on('round:continue-vote', ({ vote }, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    submitContinueVote(room, playerId, vote);
    broadcastRoom(currentRoomId);
    cb?.({ success: true });
  });

  socket.on('round:proceed-vote', (_data, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    proceedToContinueVote(room);
    broadcastRoom(currentRoomId);
    cb?.({ success: true });
  });

  socket.on('round:start-next', (_data, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room || room.hostId !== playerId) {
      cb?.({ error: 'Not authorized' });
      return;
    }
    const continueCount = room.players.filter((p) => p.continueVote === true).length;
    if (continueCount < 2) {
      cb?.({ error: 'Need at least 2 players to continue' });
      return;
    }
    const ok = startNextRound(room);
    if (ok) broadcastRoom(currentRoomId);
    cb?.({ success: ok });
  });

  socket.on('disconnect', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    removePlayer(room, playerId);

    if (room.players.length === 0) {
      stopRoomTimer(currentRoomId);
      rooms.delete(currentRoomId);
    } else {
      broadcastRoom(currentRoomId);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

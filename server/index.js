import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { CLIPS_DIR, hasAnyClips } from './clips.js';
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
  proceedFromLockedRoleSelection,
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

app.get('/api/status', (_req, res) => {
  res.json({ hasClips: hasAnyClips() });
});

const rooms = new Map();

function findOpenWaitingRoom() {
  for (const [, room] of rooms) {
    if (room.phase === PHASES.WAITING && !room.isInviteOnly) {
      return room;
    }
  }
  return null;
}

async function broadcastRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const sockets = await io.in(roomId).fetchSockets();
  sockets.forEach((socket) => {
    socket.emit('room:update', getPublicRoomState(room, socket.id));
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

  socket.on('room:join', async ({ roomId, playerName, createNew }, cb) => {
    let room;

    if (currentRoomId && currentRoomId !== roomId) {
      socket.leave(currentRoomId);
    }

    if (roomId && rooms.has(roomId)) {
      room = rooms.get(roomId);
      currentRoomId = roomId;
    } else if (createNew) {
      const id = uuidv4().slice(0, 8).toUpperCase();
      room = createRoom(playerId, true);
      room.id = id;
      rooms.set(id, room);
      currentRoomId = id;
    } else if (roomId) {
      cb?.({ error: 'Room not found' });
      return;
    } else {
      const existing = findOpenWaitingRoom();
      if (existing) {
        room = existing;
        currentRoomId = existing.id;
      } else {
        const id = uuidv4().slice(0, 8).toUpperCase();
        room = createRoom(playerId, false);
        room.id = id;
        rooms.set(id, room);
        currentRoomId = id;
      }
    }

    socket.join(currentRoomId);
    addPlayer(room, playerId, playerName);

    if (room.players.length === 1) {
      room.hostId = playerId;
    }

    cb?.({ roomId: currentRoomId, state: getPublicRoomState(room, playerId) });
    await broadcastRoom(currentRoomId);
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

  socket.on('drawing:live', ({ data, labels }) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    updateLiveDrawing(room, playerId, data, labels || []);
    const payload = { data, labels: labels || [], sketchIndex: room.currentSketchIndex };
    room.players
      .filter((p) => p.role === 'guesser')
      .forEach((p) => {
        const guesserSocket = io.sockets.sockets.get(p.id);
        if (guesserSocket) guesserSocket.emit('drawing:live', payload);
      });
  });

  socket.on('sketch:submit', ({ data, labels }, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const result = submitSketch(room, playerId, data, labels || []);
    if (result) broadcastRoom(currentRoomId);
    cb?.({ success: !!result, result });
  });

  socket.on('guess:submit', ({ guessId }, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;

    submitGuess(room, playerId, guessId);
    broadcastRoom(currentRoomId);
    cb?.({ success: true });
  });

  socket.on('rating:submit', ({ ratings, comment }, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;

    submitRatings(room, playerId, ratings, comment);
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
    const result = startNextRound(room);
    if (!result) {
      cb?.({ success: false });
      return;
    }
    broadcastRoom(currentRoomId);
    if (result === 'locked') {
      setTimeout(() => {
        const r = rooms.get(currentRoomId);
        if (!r) return;
        if (proceedFromLockedRoleSelection(r)) {
          broadcastRoom(currentRoomId);
        }
      }, 3000);
    }
    cb?.({ success: true });
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

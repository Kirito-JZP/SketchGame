import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { CLIPS_DIR, hasAnyClips } from './clips.js';
import { copy, ROOM_TIMINGS, GLOBAL_ROOM_ID } from './copy.js';
import {
  PHASES,
  joinPlayer,
  createRoom,
  getPublicRoomState,
  isGameInProgress,
  isActivelyPlaying,
  proceedToContinueVote,
  removePlayer,
  markPlayerDisconnected,
  connectedPlayerCount,
  abortRoundDueToPlayerLeave,
  resetRoomToWaiting,
  selectRole,
  startGame,
  proceedFromLockedRoleSelection,
  submitContinueVote,
  submitGuess,
  submitKeyframes,
  submitRatings,
  submitSketch,
  updateLiveDrawing,
  advanceFromWatch,
  normalizePlayerName,
  tickSketchTimer,
  extendSketchTime,
  requestAdditionalKeyword,
  fulfillKeywordRequest,
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

/** @type {Map<string, { refreshTimer?: NodeJS.Timeout, removeTimer?: NodeJS.Timeout, leaveInterval?: NodeJS.Timeout }>} */
const playerTimers = new Map();

function timerKey(roomId, playerId) {
  return `${roomId}:${playerId}`;
}

function clearPlayerTimers(roomId, playerId) {
  const key = timerKey(roomId, playerId);
  const timers = playerTimers.get(key);
  if (!timers) return;
  if (timers.refreshTimer) clearTimeout(timers.refreshTimer);
  if (timers.removeTimer) clearTimeout(timers.removeTimer);
  if (timers.leaveInterval) clearInterval(timers.leaveInterval);
  playerTimers.delete(key);
}

function clearRoomLeaveState(room) {
  if (!room.playerLeave) return;
  const leaveId = room.playerLeave.playerId;
  const key = timerKey(room.id, leaveId);
  const timers = playerTimers.get(key);
  if (timers?.leaveInterval) {
    clearInterval(timers.leaveInterval);
    timers.leaveInterval = undefined;
    playerTimers.set(key, timers);
  }
  room.playerLeave = null;
}

function cancelLeaveCountdownIfRejoined(room, playerId) {
  if (room.playerLeave?.playerId === playerId) {
    clearRoomLeaveState(room);
  }
}

function startOfficialRemovalTimer(roomId, playerId) {
  const key = timerKey(roomId, playerId);
  const existing = playerTimers.get(key) || {};
  if (existing.removeTimer) clearTimeout(existing.removeTimer);

  existing.removeTimer = setTimeout(() => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.connected !== false) return;

    // If leave countdown already aborted the round and removed them, skip.
    if (!room.players.some((p) => p.id === playerId)) {
      playerTimers.delete(key);
      return;
    }

    removePlayer(room, playerId);
    if (room.playerLeave?.playerId === playerId) {
      clearRoomLeaveState(room);
    }
    playerTimers.delete(key);

    if (room.players.length === 0) {
      destroyRoomIfEmpty(roomId);
      return;
    }

    if (isGameInProgress(room) && connectedPlayerCount(room) < 2) {
      resetRoomToWaiting(room);
    }

    broadcastRoom(roomId);
  }, ROOM_TIMINGS.RECONNECT_GRACE_MS);

  playerTimers.set(key, existing);
}

function startLeaveCountdown(roomId, player) {
  const room = rooms.get(roomId);
  if (!room || !isActivelyPlaying(room)) return;

  clearRoomLeaveState(room);

  room.playerLeave = {
    playerId: player.id,
    playerName: player.name,
    secondsLeft: ROOM_TIMINGS.LEAVE_COUNTDOWN_SECONDS,
  };

  const key = timerKey(roomId, player.id);
  const existing = playerTimers.get(key) || {};
  if (existing.leaveInterval) clearInterval(existing.leaveInterval);

  existing.leaveInterval = setInterval(() => {
    const r = rooms.get(roomId);
    if (!r || !r.playerLeave || r.playerLeave.playerId !== player.id) {
      if (existing.leaveInterval) clearInterval(existing.leaveInterval);
      existing.leaveInterval = undefined;
      playerTimers.set(key, existing);
      return;
    }

    r.playerLeave.secondsLeft -= 1;
    if (r.playerLeave.secondsLeft <= 0) {
      if (existing.leaveInterval) clearInterval(existing.leaveInterval);
      existing.leaveInterval = undefined;
      if (existing.removeTimer) clearTimeout(existing.removeTimer);
      existing.removeTimer = undefined;
      playerTimers.set(key, existing);

      abortRoundDueToPlayerLeave(r, player.id);
      playerTimers.delete(key);

      if (r.players.length === 0) {
        destroyRoomIfEmpty(roomId);
      } else {
        broadcastRoom(roomId);
      }
      return;
    }

    broadcastRoom(roomId);
  }, 1000);

  playerTimers.set(key, existing);
  broadcastRoom(roomId);
}

function getOrCreateGlobalRoom() {
  let room = rooms.get(GLOBAL_ROOM_ID);
  if (!room) {
    room = createRoom(null, false);
    room.id = GLOBAL_ROOM_ID;
    rooms.set(GLOBAL_ROOM_ID, room);
    startRoomTimer(GLOBAL_ROOM_ID);
  }
  return room;
}

function destroyRoomIfEmpty(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.players.length > 0) return;
  stopRoomTimer(roomId);

  for (const key of [...playerTimers.keys()]) {
    if (key.startsWith(`${roomId}:`)) {
      const timers = playerTimers.get(key);
      if (timers?.refreshTimer) clearTimeout(timers.refreshTimer);
      if (timers?.removeTimer) clearTimeout(timers.removeTimer);
      if (timers?.leaveInterval) clearInterval(timers.leaveInterval);
      playerTimers.delete(key);
    }
  }

  rooms.delete(roomId);
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

    if (
      r.phase !== PHASES.WAITING &&
      r.phase !== PHASES.ROLE_SELECTION &&
      r.phase !== PHASES.ROUND_RESULTS &&
      r.phase !== PHASES.CONTINUE_VOTE
    ) {
      r.sessionTimeLeft = Math.max(0, r.sessionTimeLeft - 1);
    }

    if (r.phase === PHASES.DRAWING || r.phase === PHASES.REDRAW) {
      tickSketchTimer(r);
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

function handleConfirmedDisconnect(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const player = room.players.find((p) => p.id === playerId);
  // Rejoined during refresh grace — nothing to do.
  if (!player || player.connected !== false) return;

  if (!isGameInProgress(room)) {
    removePlayer(room, playerId);
    if (room.players.length === 0) {
      destroyRoomIfEmpty(roomId);
    } else {
      broadcastRoom(roomId);
    }
    return;
  }

  startOfficialRemovalTimer(roomId, playerId);

  if (isActivelyPlaying(room)) {
    startLeaveCountdown(roomId, player);
  } else {
    broadcastRoom(roomId);
  }
}

function scheduleDisconnect(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return;

  // Soft-disconnect immediately so a page refresh can reclaim the same name
  // without hitting "name already taken". Leave countdown starts only after
  // the refresh grace window if they do not return.
  markPlayerDisconnected(room, playerId);

  const key = timerKey(roomId, playerId);
  const existing = playerTimers.get(key) || {};
  if (existing.refreshTimer) clearTimeout(existing.refreshTimer);

  existing.refreshTimer = setTimeout(() => {
    existing.refreshTimer = undefined;
    playerTimers.set(key, existing);
    handleConfirmedDisconnect(roomId, playerId);
  }, ROOM_TIMINGS.REFRESH_GRACE_MS);

  playerTimers.set(key, existing);
}

io.on('connection', (socket) => {
  let currentRoomId = null;
  let playerId = socket.id;

  socket.on('room:join', async ({ roomId, playerName, createNew }, cb) => {
    let room;

    if (currentRoomId && currentRoomId !== roomId && currentRoomId !== GLOBAL_ROOM_ID) {
      socket.leave(currentRoomId);
    }

    const requestedId = roomId || (createNew ? GLOBAL_ROOM_ID : null) || GLOBAL_ROOM_ID;

    if (requestedId === GLOBAL_ROOM_ID || !requestedId) {
      room = getOrCreateGlobalRoom();
      currentRoomId = GLOBAL_ROOM_ID;
    } else if (rooms.has(requestedId)) {
      room = rooms.get(requestedId);
      currentRoomId = requestedId;
    } else {
      // Stale invite / session IDs: fall back to the global room so Start Game still works.
      room = getOrCreateGlobalRoom();
      currentRoomId = GLOBAL_ROOM_ID;
    }

    const prior = room.players.find(
      (p) => normalizePlayerName(p.name) === normalizePlayerName(playerName)
    );
    const priorId = prior?.id;

    // Refresh race: new tab may join before the old socket's disconnect fires.
    // If the prior seat's socket is already gone, soft-disconnect so reclaim works.
    if (prior && prior.connected !== false && prior.id !== socket.id) {
      const priorSocket = io.sockets.sockets.get(prior.id);
      if (!priorSocket || !priorSocket.connected) {
        markPlayerDisconnected(room, prior.id);
      }
    }

    const result = joinPlayer(room, socket.id, playerName);
    if (!result.ok) {
      currentRoomId = null;
      cb?.({ error: result.error });
      return;
    }

    socket.join(currentRoomId);
    playerId = result.player.id;

    // Cancel pending disconnect/leave timers for this seat (old id + new id).
    if (priorId) clearPlayerTimers(currentRoomId, priorId);
    clearPlayerTimers(currentRoomId, playerId);
    cancelLeaveCountdownIfRejoined(room, playerId);

    if (room.players.length === 1 || !room.players.some((p) => p.id === room.hostId)) {
      room.hostId = playerId;
    }

    cb?.({ roomId: currentRoomId, state: getPublicRoomState(room, playerId) });
    await broadcastRoom(currentRoomId);
  });

  socket.on('room:start', (_data, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room || room.hostId !== playerId) {
      cb?.({ error: copy.errors.notAuthorized });
      return;
    }
    const ready = room.players.filter((p) => p.connected !== false).length;
    if (ready < 2) {
      cb?.({ error: copy.errors.needTwoPlayers });
      return;
    }
    startGame(room);
    startRoomTimer(currentRoomId);
    broadcastRoom(currentRoomId);
    setTimeout(() => {
      const r = rooms.get(currentRoomId);
      if (!r) return;
      if (proceedFromLockedRoleSelection(r)) {
        broadcastRoom(currentRoomId);
      }
    }, ROOM_TIMINGS.ROLE_REVEAL_MS);
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
      .filter((p) => p.role === 'guesser' && p.connected !== false)
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

  socket.on('sketch:extend-time', (_data, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const ok = extendSketchTime(room, playerId);
    if (ok) broadcastRoom(currentRoomId);
    cb?.({ success: ok });
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

  socket.on('keyword:request', ({ sketchIndex }, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const ok = requestAdditionalKeyword(room, playerId, sketchIndex);
    if (ok) broadcastRoom(currentRoomId);
    cb?.({ success: ok });
  });

  socket.on('keyword:fulfill', ({ sketchIndex, data, labels }, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const ok = fulfillKeywordRequest(room, playerId, sketchIndex, data, labels || []);
    if (ok) broadcastRoom(currentRoomId);
    cb?.({ success: ok });
  });

  socket.on('round:continue-vote', ({ vote }, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const outcome = submitContinueVote(room, playerId, vote);

    if (outcome.action === 'next_round' && outcome.result) {
      broadcastRoom(currentRoomId);
      if (outcome.result === 'locked') {
        setTimeout(() => {
          const r = rooms.get(currentRoomId);
          if (!r) return;
          if (proceedFromLockedRoleSelection(r)) {
            broadcastRoom(currentRoomId);
          }
        }, ROOM_TIMINGS.ROLE_REVEAL_MS);
      }
      cb?.({ success: true, action: outcome.action });
      return;
    }

    if (outcome.removed) {
      socket.leave(currentRoomId);
      currentRoomId = null;
    }

    if (room.players.length === 0) {
      destroyRoomIfEmpty(room.id);
    } else {
      broadcastRoom(room.id);
    }

    cb?.({ success: true, action: outcome.action });
  });

  socket.on('round:proceed-vote', (_data, cb) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    proceedToContinueVote(room);
    broadcastRoom(currentRoomId);
    cb?.({ success: true });
  });

  socket.on('disconnect', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    // Brief grace so a page refresh can reconnect without triggering leave flow.
    scheduleDisconnect(currentRoomId, playerId);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

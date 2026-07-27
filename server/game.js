import { pickGuessOptions, pickRandomClipFromAnyCategory } from './clips.js';
import { saveRoundSketches } from './sketchStorage.js';
import { copy, ROOM_TIMINGS } from './copy.js';

export const PHASES = {
  WAITING: 'waiting',
  ROLE_SELECTION: 'role_selection',
  WATCH_CLIP: 'watch_clip',
  SELECT_KEYFRAMES: 'select_keyframes',
  DRAWING: 'drawing',
  DRAWER_WAITING: 'drawer_waiting',
  GUESSING: 'guessing',
  REDRAW: 'redraw',
  ROUND_RESULTS: 'round_results',
  CONTINUE_VOTE: 'continue_vote',
};

const SESSION_TIME = 180;
export const SKETCH_TIME = 30;
export const SKETCH_EXTEND_SECONDS = 10;
export const SKETCH_EXTEND_PENALTY = 1;
export const SKETCH_EXTEND_PROMPT_SECONDS = 3;
export const SKETCH_TIMER_WARNING_SECONDS = 3;
export const POWER_UP_STARTING_POINTS = 50;
export const KEYWORD_REQUEST_COST = 5;
export const SELECTED_KEYFRAME_COUNT = 3;

function emptySketches() {
  return Array.from({ length: SELECTED_KEYFRAME_COUNT }, () => ({
    data: null,
    labels: [],
    ratings: [],
    redrawCount: 0,
  }));
}

function resetGuesserRatingSubmission(room) {
  room.players.forEach((p) => {
    if (p.role === 'guesser') p.hasRated = false;
  });
}

function clearSketchRatings(room, indices) {
  indices.forEach((i) => {
    if (room.sketches[i]) room.sketches[i].ratings = [];
  });
}

function resetKeywordRequestState(room) {
  room.keywordRequests = Array(SELECTED_KEYFRAME_COUNT).fill(null);
  room.privateSketchUpdates = {};
}

function resetSketchTimerState(room) {
  room.extendPromptActive = false;
  room.extendPromptTimeLeft = 0;
  room.sketchAutoSubmitRequired = false;
}

function resetRoundAdjustments(room) {
  room.roundAdjustments = [];
}

function logRoundAdjustment(room, playerId, label, points, kind = 'score') {
  room.roundAdjustments.push({ playerId, label, points, kind });
}

export function createRoom(hostId, isInviteOnly = false) {
  return {
    id: null,
    categoryId: null,
    categoryFolder: null,
    isInviteOnly,
    hostId,
    phase: PHASES.WAITING,
    players: [],
    round: 0,
    clip: null,
    guessOptions: [],
    selectedKeyframes: [],
    sketches: emptySketches(),
    currentSketchIndex: 0,
    drawerId: null,
    roleSelectionIndex: 0,
    drawerChosen: false,
    guesses: {},
    guessOrder: [],
    sessionTimeLeft: SESSION_TIME,
    sketchTimeLeft: SKETCH_TIME,
    timerInterval: null,
    continueVotes: {},
    roundScores: null,
    redrawKeyframes: [],
    redrawSketchIndices: [],
    rerateSketchIndices: [],
    liveDrawing: null,
    rolesLocked: false,
    keywordRequests: Array(SELECTED_KEYFRAME_COUNT).fill(null),
    privateSketchUpdates: {},
    extendPromptActive: false,
    extendPromptTimeLeft: 0,
    sketchAutoSubmitRequired: false,
    roundAdjustments: [],
    playerLeave: null,
  };
}

export function normalizePlayerName(name) {
  return (name || '').trim().toLowerCase();
}

export function isGameInProgress(room) {
  return room.phase !== PHASES.WAITING;
}

export function isActivelyPlaying(room) {
  return (
    room.phase !== PHASES.WAITING &&
    room.phase !== PHASES.CONTINUE_VOTE &&
    room.phase !== PHASES.ROUND_RESULTS
  );
}

function remapPlayerId(map, oldId, newId) {
  if (!map || !(oldId in map) || oldId === newId) return;
  map[newId] = map[oldId];
  delete map[oldId];
}

function reclaimPlayerSeat(room, player, newSocketId) {
  const oldId = player.id;
  if (oldId === newSocketId) {
    player.connected = true;
    player.disconnectedAt = null;
    return player;
  }

  player.id = newSocketId;
  player.connected = true;
  player.disconnectedAt = null;

  if (room.hostId === oldId) room.hostId = newSocketId;
  if (room.drawerId === oldId) room.drawerId = newSocketId;

  remapPlayerId(room.guesses, oldId, newSocketId);
  remapPlayerId(room.continueVotes, oldId, newSocketId);
  remapPlayerId(room.privateSketchUpdates, oldId, newSocketId);

  room.guessOrder = room.guessOrder.map((id) => (id === oldId ? newSocketId : id));
  room.roundAdjustments = (room.roundAdjustments || []).map((a) =>
    a.playerId === oldId ? { ...a, playerId: newSocketId } : a
  );
  if (room.roundScores) {
    room.roundScores = room.roundScores.map((rs) =>
      rs.playerId === oldId ? { ...rs, playerId: newSocketId } : rs
    );
  }
  if (room.playerLeave?.playerId === oldId) {
    room.playerLeave.playerId = newSocketId;
  }

  return player;
}

function canReclaimDisconnectedPlayer(player) {
  if (player.connected !== false) return false;
  if (!player.disconnectedAt) return true;
  return Date.now() - player.disconnectedAt <= ROOM_TIMINGS.RECONNECT_GRACE_MS;
}

/**
 * Join or reconnect a player by unique name.
 */
export function joinPlayer(room, socketId, playerName) {
  const bySocket = room.players.find((p) => p.id === socketId);
  if (bySocket) {
    if (playerName) bySocket.name = playerName.trim() || bySocket.name;
    if (bySocket.powerUpPoints == null) bySocket.powerUpPoints = POWER_UP_STARTING_POINTS;
    bySocket.connected = true;
    bySocket.disconnectedAt = null;
    return { ok: true, player: bySocket, reconnected: true };
  }

  const trimmed = (playerName || '').trim();
  const normalized = normalizePlayerName(trimmed);
  if (!normalized) {
    return { ok: false, error: copy.errors.nameRequired };
  }

  const byName = room.players.find((p) => normalizePlayerName(p.name) === normalized);
  if (byName) {
    // Another live client is using this name.
    if (byName.connected !== false && byName.id !== socketId) {
      return { ok: false, error: copy.errors.nameTaken };
    }
    // Soft-disconnected (refresh / network blip) — reclaim seat and state.
    if (byName.connected === false && !canReclaimDisconnectedPlayer(byName)) {
      return { ok: false, error: copy.errors.nameTaken };
    }
    reclaimPlayerSeat(room, byName, socketId);
    byName.name = trimmed;
    if (byName.powerUpPoints == null) byName.powerUpPoints = POWER_UP_STARTING_POINTS;
    return { ok: true, player: byName, reconnected: true };
  }

  if (isGameInProgress(room)) {
    return { ok: false, error: copy.errors.gameAlreadyStarted };
  }

  const player = {
    id: socketId,
    name: trimmed,
    role: null,
    score: 0,
    joinOrder: room.players.length,
    hasGuessed: false,
    hasRated: false,
    continueVote: null,
    powerUpPoints: POWER_UP_STARTING_POINTS,
    connected: true,
    disconnectedAt: null,
  };
  room.players.push(player);
  return { ok: true, player, reconnected: false };
}

export function markPlayerDisconnected(room, playerId) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return null;
  player.connected = false;
  player.disconnectedAt = Date.now();
  return player;
}

export function removePlayer(room, playerId) {
  const player = room.players.find((p) => p.id === playerId);
  room.players = room.players.filter((p) => p.id !== playerId);
  delete room.guesses[playerId];
  delete room.continueVotes[playerId];
  room.guessOrder = room.guessOrder.filter((id) => id !== playerId);
  room.roundAdjustments = (room.roundAdjustments || []).filter((a) => a.playerId !== playerId);

  if (room.hostId === playerId && room.players.length > 0) {
    const nextHost = room.players.find((p) => p.connected !== false) || room.players[0];
    room.hostId = nextHost.id;
  }

  if (room.drawerId === playerId) {
    room.drawerId = null;
  }

  if (room.playerLeave?.playerId === playerId) {
    room.playerLeave = null;
  }

  return player || null;
}

export function connectedPlayerCount(room) {
  return room.players.filter((p) => p.connected !== false).length;
}

export function clearRoundData(room) {
  room.categoryId = null;
  room.categoryFolder = null;
  room.clip = null;
  room.guessOptions = [];
  room.selectedKeyframes = [];
  room.sketches = emptySketches();
  room.currentSketchIndex = 0;
  room.drawerId = null;
  room.roleSelectionIndex = 0;
  room.drawerChosen = false;
  room.guesses = {};
  room.guessOrder = [];
  room.continueVotes = {};
  room.roundScores = null;
  room.redrawKeyframes = [];
  room.redrawSketchIndices = [];
  room.rerateSketchIndices = [];
  room.liveDrawing = null;
  room.rolesLocked = false;
  room.sessionTimeLeft = SESSION_TIME;
  room.sketchTimeLeft = SKETCH_TIME;
  resetSketchTimerState(room);
  resetKeywordRequestState(room);
  room.roundAdjustments = [];
  room.playerLeave = null;
  room.players.forEach((p) => {
    p.role = null;
    p.hasGuessed = false;
    p.hasRated = false;
    p.continueVote = null;
  });
}

/** End current round and open waiting for new / remaining players. */
export function resetRoomToWaiting(room) {
  clearRoundData(room);
  room.phase = PHASES.WAITING;
  room.round = 0;
  room.players.forEach((p) => {
    p.score = 0;
  });
  if (room.players.length > 0) {
    const host = room.players.find((p) => p.connected !== false) || room.players[0];
    room.hostId = host.id;
  }
  return room;
}

/** Abort active round because a player timed out after leaving. */
export function abortRoundDueToPlayerLeave(room, playerId) {
  removePlayer(room, playerId);
  resetRoomToWaiting(room);
  return room;
}

export function getPublicRoomState(room, playerId) {
  const me = room.players.find((p) => p.id === playerId);
  const isDrawer = me?.role === 'drawer';

  return {
    id: room.id,
    categoryId: room.categoryId,
    categoryFolder: room.categoryFolder,
    hostId: room.hostId,
    phase: room.phase,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      score: p.score,
      joinOrder: p.joinOrder,
      hasGuessed: p.hasGuessed,
      hasRated: p.hasRated,
      continueVote: p.continueVote,
      connected: p.connected !== false,
    })),
    playerLeave: room.playerLeave
      ? {
          playerId: room.playerLeave.playerId,
          playerName: room.playerLeave.playerName,
          secondsLeft: room.playerLeave.secondsLeft,
          message: copy.playerLeft(room.playerLeave.playerName),
        }
      : null,
    round: room.round,
    clip: room.clip
      ? {
          id: room.clip.id,
          title: isDrawer || room.phase === PHASES.GUESSING || room.phase === PHASES.ROUND_RESULTS ? room.clip.title : undefined,
          videoUrl: isDrawer && (room.phase === PHASES.WATCH_CLIP || room.phase === PHASES.SELECT_KEYFRAMES || room.phase === PHASES.DRAWING || room.phase === PHASES.REDRAW || room.phase === PHASES.GUESSING)
            ? room.clip.videoUrl
            : undefined,
          keyframes: isDrawer && (room.phase === PHASES.SELECT_KEYFRAMES || room.phase === PHASES.DRAWING || room.phase === PHASES.REDRAW || room.phase === PHASES.GUESSING)
            ? room.clip.keyframes
            : undefined,
        }
      : null,
    guessOptions:
      room.phase === PHASES.GUESSING ||
      room.phase === PHASES.DRAWING ||
      room.phase === PHASES.ROUND_RESULTS
        ? room.guessOptions.map((o) => ({ id: o.id, title: o.title, videoUrl: o.videoUrl }))
        : [],
    selectedKeyframes: isDrawer ? room.selectedKeyframes : room.selectedKeyframes.map((_, i) => i),
    sketches: room.sketches.map((s, i) => {
      const privateUpdate = me?.role === 'guesser' ? room.privateSketchUpdates?.[playerId]?.[i] : null;
      const showStoredLabels =
        isDrawer && room.phase === PHASES.REDRAW
          ? (s.labels ?? [])
          : privateUpdate || s.data
            ? []
            : (s.labels ?? []);
      return {
        data: privateUpdate?.data ?? s.data,
        labels: showStoredLabels,
        lockedRating:
          me?.role === 'guesser' &&
          room.phase === PHASES.GUESSING &&
          room.rerateSketchIndices.length > 0 &&
          !room.rerateSketchIndices.includes(i)
            ? getAverageRating(s.ratings)
            : undefined,
        ratings: room.phase === PHASES.ROUND_RESULTS ? s.ratings : undefined,
        averageRating: room.phase === PHASES.ROUND_RESULTS ? getAverageRating(s.ratings) : undefined,
        redrawCount: s.redrawCount,
        index: i,
      };
    }),
    currentSketchIndex: room.currentSketchIndex,
    drawerId: room.drawerId,
    roleSelectionIndex: room.roleSelectionIndex,
    drawerChosen: room.drawerChosen,
    guesses: room.phase === PHASES.ROUND_RESULTS
      ? Object.fromEntries(
          Object.entries(room.guesses).map(([pid, g]) => [pid, { correct: g.correct, guessId: g.guessId }])
        )
      : {},
    guessProgress: {
      completed: room.players.filter((p) => p.role === 'guesser' && p.hasGuessed).length,
      total: room.players.filter((p) => p.role === 'guesser').length,
    },
    ratingProgress: {
      completed: room.players.filter((p) => p.role === 'guesser' && p.hasRated).length,
      total: room.players.filter((p) => p.role === 'guesser').length,
    },
    sessionTimeLeft: room.sessionTimeLeft,
    sketchTimeLeft: room.sketchTimeLeft,
    extendPromptActive: isDrawer ? room.extendPromptActive : false,
    extendPromptTimeLeft: isDrawer ? room.extendPromptTimeLeft : 0,
    sketchAutoSubmitRequired: isDrawer ? room.sketchAutoSubmitRequired : false,
    liveDrawing: room.liveDrawing,
    roundScores: room.roundScores,
    redrawKeyframes: isDrawer ? room.redrawKeyframes : [],
    redrawSketchIndices: isDrawer && room.phase === PHASES.REDRAW ? room.redrawSketchIndices : [],
    rerateSketchIndices: room.phase === PHASES.GUESSING ? room.rerateSketchIndices : [],
    correctAnswer: room.phase === PHASES.ROUND_RESULTS ? room.clip?.title : undefined,
    myRole: me?.role,
    myId: playerId,
    isHost: room.hostId === playerId,
    rolesLocked: room.rolesLocked || false,
    canSelectRole:
      !room.rolesLocked &&
      room.phase === PHASES.ROLE_SELECTION &&
      room.roleSelectionIndex === me?.joinOrder,
    mustBeDrawer:
      !room.rolesLocked &&
      room.phase === PHASES.ROLE_SELECTION &&
      !room.drawerChosen &&
      room.players.length - room.roleSelectionIndex === 1 &&
      me?.joinOrder === room.roleSelectionIndex,
    continueVotes: room.phase === PHASES.CONTINUE_VOTE
      ? {
          continue: room.players.filter((p) => p.continueVote === true).length,
          exit: room.players.filter((p) => p.continueVote === false).length,
          total: room.players.length,
        }
      : null,
    myPowerUpPoints: me?.powerUpPoints ?? POWER_UP_STARTING_POINTS,
    myKeywordRequestStatus:
      me?.role === 'guesser'
        ? Array.from({ length: SELECTED_KEYFRAME_COUNT }, (_, i) => {
            const req = room.keywordRequests?.[i];
            if (!req || req.requestedBy !== playerId) return 'none';
            return req.status;
          })
        : Array(SELECTED_KEYFRAME_COUNT).fill('none'),
    bonusKeywordClaimed: (room.keywordRequests || []).map((req) => req !== null),
    keywordRequests: isDrawer
      ? (room.keywordRequests || []).map((req, i) =>
          req
            ? {
                sketchIndex: i,
                requesterName: req.requesterName,
                presetKeyword: req.presetKeyword,
                status: req.status,
              }
            : null
        )
      : Array(SELECTED_KEYFRAME_COUNT).fill(null),
  };
}

function getAverageRating(ratings) {
  if (!ratings.length) return 0;
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}

function assignRolesByJoinOrder(room, drawerJoinOrder) {
  const sorted = [...room.players].sort((a, b) => a.joinOrder - b.joinOrder);
  const newDrawer =
    sorted.find((p) => p.joinOrder === drawerJoinOrder) || sorted[0];

  room.players.forEach((p) => {
    p.role = p.id === newDrawer.id ? 'drawer' : 'guesser';
  });
  room.drawerId = newDrawer.id;
  room.drawerChosen = true;
  room.roleSelectionIndex = room.players.length;
  room.rolesLocked = true;
}

export function startGame(room) {
  room.phase = PHASES.ROLE_SELECTION;
  room.players.forEach((p) => {
    p.hasGuessed = false;
    p.hasRated = false;
  });
  // First player to join the room becomes drawer; later players are guessers.
  assignRolesByJoinOrder(room, 0);
}

function assignRotatedRoles(room) {
  const prevDrawer = room.players.find((p) => p.id === room.drawerId);
  const nextJoinOrder = prevDrawer
    ? (prevDrawer.joinOrder + 1) % room.players.length
    : 0;
  assignRolesByJoinOrder(room, nextJoinOrder);
}

export function selectRole(room, playerId, role) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.joinOrder !== room.roleSelectionIndex) return false;

  if (role === 'drawer') {
    if (room.drawerChosen) return false;
    player.role = 'drawer';
    room.drawerId = playerId;
    room.drawerChosen = true;
    room.roleSelectionIndex++;
    if (room.roleSelectionIndex >= room.players.length) {
      beginRound(room);
    }
    return true;
  }

  if (role === 'guesser') {
    const remainingAfter = room.players.length - room.roleSelectionIndex - 1;
    if (!room.drawerChosen && remainingAfter === 0) return false;

    player.role = 'guesser';
    room.roleSelectionIndex++;
    if (!room.drawerChosen && room.roleSelectionIndex >= room.players.length) {
      const nextDrawer = room.players.find((p) => p.role === null);
      if (nextDrawer) {
        nextDrawer.role = 'drawer';
        room.drawerId = nextDrawer.id;
        room.drawerChosen = true;
      }
      beginRound(room);
    } else if (room.roleSelectionIndex >= room.players.length) {
      beginRound(room);
    }
    return true;
  }

  return false;
}

function beginRound(room) {
  room.round++;
  const picked = pickRandomClipFromAnyCategory();
  if (picked) {
    room.clip = picked.clip;
    room.categoryFolder = picked.categoryFolder;
    room.categoryId = picked.categoryId;
    room.guessOptions = pickGuessOptions(picked.categoryFolder, picked.clip.id);
  } else {
    room.clip = null;
    room.guessOptions = [];
  }
  room.selectedKeyframes = [];
  room.sketches = emptySketches();
  room.currentSketchIndex = 0;
  room.guesses = {};
  room.guessOrder = [];
  room.redrawKeyframes = [];
  room.redrawSketchIndices = [];
  room.rerateSketchIndices = [];
  room.liveDrawing = null;
  room.roundScores = null;
  resetKeywordRequestState(room);
  resetRoundAdjustments(room);
  room.sessionTimeLeft = SESSION_TIME;
  room.sketchTimeLeft = SKETCH_TIME;
  resetSketchTimerState(room);
  room.phase = PHASES.WATCH_CLIP;
  room.players.forEach((p) => {
    p.hasGuessed = false;
    p.hasRated = false;
  });
}

export function submitKeyframes(room, playerId, indices) {
  if (room.drawerId !== playerId || room.phase !== PHASES.SELECT_KEYFRAMES) return false;
  if (indices.length !== SELECTED_KEYFRAME_COUNT) return false;
  room.selectedKeyframes = indices;
  room.phase = PHASES.DRAWING;
  room.currentSketchIndex = 0;
  room.sketchTimeLeft = SKETCH_TIME;
  resetSketchTimerState(room);
  return true;
}

export function tickSketchTimer(room) {
  if (room.phase !== PHASES.DRAWING && room.phase !== PHASES.REDRAW) return;

  if (room.extendPromptActive) {
    room.extendPromptTimeLeft = Math.max(0, room.extendPromptTimeLeft - 1);
    if (room.extendPromptTimeLeft === 0) {
      room.extendPromptActive = false;
      room.sketchAutoSubmitRequired = true;
    }
    return;
  }

  if (room.sketchTimeLeft > 0) {
    room.sketchTimeLeft -= 1;
    if (room.sketchTimeLeft === 0) {
      room.extendPromptActive = true;
      room.extendPromptTimeLeft = SKETCH_EXTEND_PROMPT_SECONDS;
    }
  }
}

export function extendSketchTime(room, playerId) {
  if (room.drawerId !== playerId) return false;
  if (!room.extendPromptActive) return false;
  if (room.phase !== PHASES.DRAWING && room.phase !== PHASES.REDRAW) return false;

  const drawer = room.players.find((p) => p.id === playerId);
  if (drawer) {
    drawer.score -= SKETCH_EXTEND_PENALTY;
    logRoundAdjustment(room, playerId, 'Time extension (+10s)', -SKETCH_EXTEND_PENALTY, 'score');
  }

  room.sketchTimeLeft += SKETCH_EXTEND_SECONDS;
  resetSketchTimerState(room);
  return true;
}

export function submitSketch(room, playerId, sketchData, labels = []) {
  if (room.drawerId !== playerId || (room.phase !== PHASES.DRAWING && room.phase !== PHASES.REDRAW)) return false;

  room.sketches[room.currentSketchIndex].data = sketchData;
  room.sketches[room.currentSketchIndex].labels = labels;
  room.liveDrawing = null;
  resetSketchTimerState(room);

  if (room.phase === PHASES.REDRAW) {
    const queue = room.redrawSketchIndices;
    const pos = queue.indexOf(room.currentSketchIndex);
    if (pos >= 0 && pos < queue.length - 1) {
      room.currentSketchIndex = queue[pos + 1];
      room.sketchTimeLeft = SKETCH_TIME;
      return 'next_sketch';
    }
    room.phase = PHASES.GUESSING;
    room.currentSketchIndex = 0;
    room.rerateSketchIndices = [...room.redrawSketchIndices];
    room.redrawSketchIndices = [];
    room.redrawKeyframes = [];
    resetGuesserRatingSubmission(room);
    resetKeywordRequestState(room);
    return 'guessing';
  }

  if (room.currentSketchIndex < SELECTED_KEYFRAME_COUNT - 1) {
    room.currentSketchIndex++;
    room.sketchTimeLeft = SKETCH_TIME;
    return 'next_sketch';
  }

  room.phase = PHASES.GUESSING;
  room.currentSketchIndex = 0;
  return 'guessing';
}

export function updateLiveDrawing(room, playerId, drawingData, labels = []) {
  if (room.drawerId !== playerId) return;
  room.liveDrawing = { data: drawingData, labels };
}

export function submitGuess(room, playerId, guessId) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.role !== 'guesser') return false;
  if (room.phase !== PHASES.GUESSING && room.phase !== PHASES.DRAWING) return false;
  if (player.hasGuessed) return false;

  const correct = guessId === room.clip?.id;
  player.hasGuessed = true;
  room.guesses[playerId] = { guessId, correct };
  if (correct) room.guessOrder.push(playerId);
  return true;
}

export function submitRatings(room, playerId, ratings, comment) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.role !== 'guesser' || room.phase !== PHASES.GUESSING) return false;
  if (player.hasRated) return false;

  ratings.forEach((rating, i) => {
    if (rating <= 0) return;
    if (room.rerateSketchIndices.length > 0) {
      if (room.rerateSketchIndices.includes(i)) {
        room.sketches[i].ratings.push(rating);
      }
      return;
    }
    room.sketches[i].ratings.push(rating);
  });
  player.hasRated = true;
  player.comment = comment;

  const guessers = room.players.filter((p) => p.role === 'guesser');
  if (guessers.every((p) => p.hasGuessed && p.hasRated)) {
    evaluateRound(room);
  }
  return true;
}

export function requestAdditionalKeyword(room, playerId, sketchIndex) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.role !== 'guesser') return false;
  if (room.phase !== PHASES.GUESSING || player.hasRated) return false;
  if (sketchIndex < 0 || sketchIndex >= SELECTED_KEYFRAME_COUNT) return false;
  if (!room.sketches[sketchIndex]?.data) return false;
  if (room.keywordRequests[sketchIndex] !== null) return false;
  if ((player.powerUpPoints ?? 0) < KEYWORD_REQUEST_COST) return false;

  const keyframeIndex = room.selectedKeyframes[sketchIndex];
  const presetKeyword =
    room.clip?.bonusKeywords?.[keyframeIndex] ?? `hint-${sketchIndex + 1}`;

  player.powerUpPoints -= KEYWORD_REQUEST_COST;
  logRoundAdjustment(
    room,
    playerId,
    `Keyword request (sketch ${sketchIndex + 1})`,
    -KEYWORD_REQUEST_COST,
    'power_up'
  );
  room.keywordRequests[sketchIndex] = {
    requestedBy: playerId,
    requesterName: player.name,
    presetKeyword,
    status: 'pending',
  };
  return true;
}

export function fulfillKeywordRequest(room, playerId, sketchIndex, sketchData, labels = []) {
  if (room.drawerId !== playerId || room.phase !== PHASES.GUESSING) return false;
  if (sketchIndex < 0 || sketchIndex >= SELECTED_KEYFRAME_COUNT) return false;

  const request = room.keywordRequests[sketchIndex];
  if (!request || request.status !== 'pending') return false;

  const requesterId = request.requestedBy;
  if (!room.privateSketchUpdates[requesterId]) {
    room.privateSketchUpdates[requesterId] = {};
  }
  room.privateSketchUpdates[requesterId][sketchIndex] = {
    data: sketchData,
    labels,
  };
  request.status = 'fulfilled';
  return true;
}

export function checkGuessingComplete(room) {
  const guessers = room.players.filter((p) => p.role === 'guesser');
  if (guessers.every((p) => p.hasGuessed && p.hasRated)) {
    evaluateRound(room);
    return true;
  }
  return false;
}

function evaluateRound(room) {
  const guessers = room.players.filter((p) => p.role === 'guesser');
  const correctCount = guessers.filter((p) => room.guesses[p.id]?.correct).length;
  const wrongCount = guessers.length - correctCount;
  const majorityWrong = guessers.length > 0 && wrongCount > guessers.length / 2;

  const lowRatedFrames = room.sketches
    .map((s, i) => ({ index: i, avg: getAverageRating(s.ratings) }))
    .filter((s) => s.avg < 3 && s.avg > 0);

  const majorityCorrect = guessers.length > 0 && correctCount > guessers.length / 2;

  if (majorityWrong && room.sketches.every((s) => s.redrawCount < 1)) {
    room.phase = PHASES.SELECT_KEYFRAMES;
    room.selectedKeyframes = [];
    room.currentSketchIndex = 0;
    room.sketchTimeLeft = SKETCH_TIME;
    resetSketchTimerState(room);
    room.sketches.forEach((s) => {
      s.data = null;
      s.labels = [];
      s.ratings = [];
      s.redrawCount++;
    });
    room.players.forEach((p) => {
      p.hasGuessed = false;
      p.hasRated = false;
    });
    room.guesses = {};
    room.guessOrder = [];
    room.rerateSketchIndices = [];
    resetKeywordRequestState(room);
    return;
  }

  if (majorityCorrect && lowRatedFrames.length > 0) {
    const needsRedraw = lowRatedFrames.filter((f) => room.sketches[f.index].redrawCount < 1);
    if (needsRedraw.length > 0) {
      room.phase = PHASES.REDRAW;
      room.redrawSketchIndices = needsRedraw.map((f) => f.index);
      room.redrawKeyframes = needsRedraw.map((f) => room.selectedKeyframes[f.index]);
      room.currentSketchIndex = needsRedraw[0].index;
      room.sketchTimeLeft = SKETCH_TIME;
      resetSketchTimerState(room);
      clearSketchRatings(room, needsRedraw.map((f) => f.index));
      resetGuesserRatingSubmission(room);
      needsRedraw.forEach((f) => {
        room.sketches[f.index].redrawCount++;
      });
      resetKeywordRequestState(room);
      return;
    }
  }

  finishRound(room);
}

function finishRound(room) {
  const roundScores = calculateRoundScores(room);
  room.roundScores = roundScores;

  roundScores.forEach((rs) => {
    const player = room.players.find((p) => p.id === rs.playerId);
    if (player) player.score += rs.roundPoints;
  });

  saveRoundSketches(room);
  room.rerateSketchIndices = [];
  room.phase = PHASES.ROUND_RESULTS;
}

function calculateRoundScores(room) {
  const results = [];
  const guessers = room.players.filter((p) => p.role === 'guesser');
  const drawer = room.players.find((p) => p.role === 'drawer');

  const buildBreakdown = (playerId, bonusItems) => {
    const adjustmentItems = (room.roundAdjustments || [])
      .filter((a) => a.playerId === playerId)
      .map((a) => ({ label: a.label, points: a.points, kind: a.kind }));

    const items = [...bonusItems, ...adjustmentItems];
    const scoreItems = items.filter((i) => i.kind === 'score');
    const powerUpItems = items.filter((i) => i.kind === 'power_up');
    const scoreNet = Math.round(scoreItems.reduce((sum, i) => sum + i.points, 0) * 10) / 10;
    const powerUpSpent = powerUpItems.reduce((sum, i) => sum + Math.abs(i.points), 0);

    return { items, scoreNet, powerUpSpent };
  };

  if (drawer) {
    const ratingPoints = room.sketches.reduce((sum, s) => sum + getAverageRating(s.ratings), 0);
    const correctGuesses = guessers.filter((p) => room.guesses[p.id]?.correct).length;
    const bonusItems = [];
    if (ratingPoints > 0) {
      bonusItems.push({
        label: copy.scoreBreakdown.sketchRatings,
        points: Math.round(ratingPoints * 10) / 10,
        kind: 'score',
      });
    }
    if (correctGuesses > 0) {
      bonusItems.push({ label: copy.scoreBreakdown.correctGuessers, points: correctGuesses, kind: 'score' });
    }

    const breakdown = buildBreakdown(drawer.id, bonusItems);
    const roundPoints = Math.round((ratingPoints + correctGuesses) * 10) / 10;

    results.push({
      playerId: drawer.id,
      name: drawer.name,
      role: 'drawer',
      roundPoints,
      breakdown,
    });
  }

  guessers.forEach((g) => {
    const guess = room.guesses[g.id];
    const bonusItems = [];
    if (guess?.correct) {
      bonusItems.push({ label: copy.scoreBreakdown.correctGuess, points: 5, kind: 'score' });
      if (room.guessOrder[0] === g.id) {
        bonusItems.push({ label: copy.scoreBreakdown.firstCorrectBonus, points: 5, kind: 'score' });
      }
    }

    const breakdown = buildBreakdown(g.id, bonusItems);
    const roundPoints = bonusItems.reduce((sum, i) => sum + i.points, 0);

    results.push({
      playerId: g.id,
      name: g.name,
      role: 'guesser',
      roundPoints,
      breakdown,
    });
  });

  return results;
}

export function advanceFromWatch(room, playerId) {
  if (room.drawerId !== playerId || room.phase !== PHASES.WATCH_CLIP) return false;
  room.phase = PHASES.SELECT_KEYFRAMES;
  return true;
}

export function submitContinueVote(room, playerId, vote) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { action: 'none' };

  if (vote === false) {
    removePlayer(room, playerId);
    const remaining = room.players.filter((p) => p.connected !== false);
    if (remaining.length < 2) {
      resetRoomToWaiting(room);
      return { action: 'open_waiting', removed: true };
    }
    // Someone declined — open waiting for new players; keep remaining.
    resetRoomToWaiting(room);
    return { action: 'open_waiting', removed: true };
  }

  player.continueVote = true;
  room.continueVotes[playerId] = true;

  const remaining = room.players.filter((p) => p.connected !== false);
  const allContinued =
    remaining.length >= 2 && remaining.every((p) => p.continueVote === true);

  if (allContinued) {
    const result = startNextRound(room);
    return { action: 'next_round', result };
  }

  return { action: 'waiting_votes' };
}

export function startNextRound(room) {
  const continueCount = room.players.filter(
    (p) => p.connected !== false && p.continueVote === true
  ).length;
  if (continueCount < 2) return false;

  room.continueVotes = {};
  room.players.forEach((p) => {
    p.continueVote = null;
    p.hasGuessed = false;
    p.hasRated = false;
  });

  room.phase = PHASES.ROLE_SELECTION;
  assignRotatedRoles(room);
  return 'locked';
}

export function proceedFromLockedRoleSelection(room) {
  if (room.phase !== PHASES.ROLE_SELECTION || !room.rolesLocked) return false;
  room.rolesLocked = false;
  beginRound(room);
  return true;
}

export function proceedToContinueVote(room) {
  room.phase = PHASES.CONTINUE_VOTE;
  room.players.forEach((p) => {
    p.continueVote = null;
  });
  room.continueVotes = {};
  room.playerLeave = null;
}

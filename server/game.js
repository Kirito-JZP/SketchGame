import { pickGuessOptions, pickRandomClipFromAnyCategory } from './clips.js';
import { saveRoundSketches } from './sketchStorage.js';
import { copy } from './copy.js';

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
    sketches: [
      { data: null, labels: [], ratings: [], redrawCount: 0 },
      { data: null, labels: [], ratings: [], redrawCount: 0 },
      { data: null, labels: [], ratings: [], redrawCount: 0 },
    ],
    currentSketchIndex: 0,
    drawerId: null,
    roleSelectionIndex: 0,
    drawerChosen: false,
    guesses: {},
    guessOrder: [],
    continueVotes: {},
    roundScores: null,
    redrawKeyframes: [],
    redrawSketchIndices: [],
    rerateSketchIndices: [],
    liveDrawing: null,
    rolesLocked: false,
    roundAdjustments: [],
  };
}

export function addPlayer(room, playerId, playerName) {
  const existing = room.players.find((p) => p.id === playerId);
  if (existing) {
    if (playerName) existing.name = playerName;
    return existing;
  }

  const player = {
    id: playerId,
    name: playerName || copy.defaultPlayerName(room.players.length + 1),
    role: null,
    score: 0,
    joinOrder: room.players.length,
    hasGuessed: false,
    hasRated: false,
    continueVote: null,
  };
  room.players.push(player);
  return player;
}

export function removePlayer(room, playerId) {
  room.players = room.players.filter((p) => p.id !== playerId);
  if (room.hostId === playerId && room.players.length > 0) {
    room.hostId = room.players[0].id;
  }
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
    })),
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
      const showStoredLabels =
        isDrawer && room.phase === PHASES.REDRAW
          ? (s.labels ?? [])
          : s.data
            ? []
            : (s.labels ?? []);
      return {
        data: s.data,
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
  };
}

function getAverageRating(ratings) {
  if (!ratings.length) return 0;
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}

export function startGame(room) {
  room.phase = PHASES.ROLE_SELECTION;
  room.roleSelectionIndex = 0;
  room.drawerChosen = false;
  room.rolesLocked = false;
  room.players.forEach((p) => {
    p.role = null;
    p.hasGuessed = false;
    p.hasRated = false;
  });
}

function assignRotatedRoles(room) {
  const sorted = [...room.players].sort((a, b) => a.joinOrder - b.joinOrder);
  const prevDrawer = room.players.find((p) => p.id === room.drawerId);
  const nextJoinOrder = prevDrawer
    ? (prevDrawer.joinOrder + 1) % room.players.length
    : 0;
  const newDrawer = sorted.find((p) => p.joinOrder === nextJoinOrder) || sorted[0];

  room.players.forEach((p) => {
    p.role = p.id === newDrawer.id ? 'drawer' : 'guesser';
  });
  room.drawerId = newDrawer.id;
  room.drawerChosen = true;
  room.roleSelectionIndex = room.players.length;
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
  room.sketches = [
    { data: null, labels: [], ratings: [], redrawCount: 0 },
    { data: null, labels: [], ratings: [], redrawCount: 0 },
    { data: null, labels: [], ratings: [], redrawCount: 0 },
  ];
  room.currentSketchIndex = 0;
  room.guesses = {};
  room.guessOrder = [];
  room.redrawKeyframes = [];
  room.redrawSketchIndices = [];
  room.rerateSketchIndices = [];
  room.liveDrawing = null;
  room.roundScores = null;
  resetRoundAdjustments(room);
  room.phase = PHASES.WATCH_CLIP;
  room.players.forEach((p) => {
    p.hasGuessed = false;
    p.hasRated = false;
  });
}

export function submitKeyframes(room, playerId, indices) {
  if (room.drawerId !== playerId || room.phase !== PHASES.SELECT_KEYFRAMES) return false;
  if (indices.length !== 3) return false;
  room.selectedKeyframes = indices;
  room.phase = PHASES.DRAWING;
  room.currentSketchIndex = 0;
  return true;
}

export function submitSketch(room, playerId, sketchData, labels = []) {
  if (room.drawerId !== playerId || (room.phase !== PHASES.DRAWING && room.phase !== PHASES.REDRAW)) return false;

  room.sketches[room.currentSketchIndex].data = sketchData;
  room.sketches[room.currentSketchIndex].labels = labels;
  room.liveDrawing = null;

  if (room.phase === PHASES.REDRAW) {
    const queue = room.redrawSketchIndices;
    const pos = queue.indexOf(room.currentSketchIndex);
    if (pos >= 0 && pos < queue.length - 1) {
      room.currentSketchIndex = queue[pos + 1];
      return 'next_sketch';
    }
    room.phase = PHASES.GUESSING;
    room.currentSketchIndex = 0;
    room.rerateSketchIndices = [...room.redrawSketchIndices];
    room.redrawSketchIndices = [];
    room.redrawKeyframes = [];
    resetGuesserRatingSubmission(room);
    return 'guessing';
  }

  if (room.currentSketchIndex < 2) {
    room.currentSketchIndex++;
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
    return;
  }

  if (majorityCorrect && lowRatedFrames.length > 0) {
    const needsRedraw = lowRatedFrames.filter((f) => room.sketches[f.index].redrawCount < 1);
    if (needsRedraw.length > 0) {
      room.phase = PHASES.REDRAW;
      room.redrawSketchIndices = needsRedraw.map((f) => f.index);
      room.redrawKeyframes = needsRedraw.map((f) => room.selectedKeyframes[f.index]);
      room.currentSketchIndex = needsRedraw[0].index;
      clearSketchRatings(room, needsRedraw.map((f) => f.index));
      resetGuesserRatingSubmission(room);
      needsRedraw.forEach((f) => {
        room.sketches[f.index].redrawCount++;
      });
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
  if (!player) return false;

  if (vote === false) {
    removePlayer(room, playerId);
    delete room.continueVotes[playerId];
    return true;
  }

  player.continueVote = true;
  room.continueVotes[playerId] = true;
  return true;
}

export function startNextRound(room) {
  const continueCount = room.players.filter((p) => p.continueVote === true).length;
  if (continueCount < 2) return false;

  room.continueVotes = {};
  room.players.forEach((p) => {
    p.continueVote = null;
    p.hasGuessed = false;
    p.hasRated = false;
  });

  room.phase = PHASES.ROLE_SELECTION;

  if (room.round >= 1) {
    assignRotatedRoles(room);
    room.rolesLocked = true;
    return 'locked';
  }

  room.roleSelectionIndex = 0;
  room.drawerChosen = false;
  room.rolesLocked = false;
  room.players.forEach((p) => {
    p.role = null;
  });
  return 'manual';
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
}

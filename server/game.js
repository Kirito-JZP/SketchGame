import { pickGuessOptions, pickRandomClip } from './clips.js';

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
const SKETCH_TIME = 60;

export function createRoom(categoryId, categoryFolder, hostId) {
  return {
    id: null,
    categoryId,
    categoryFolder,
    hostId,
    phase: PHASES.WAITING,
    players: [],
    round: 0,
    clip: null,
    guessOptions: [],
    selectedKeyframes: [],
    sketches: [{ data: null, ratings: [], redrawCount: 0 }, { data: null, ratings: [], redrawCount: 0 }, { data: null, ratings: [], redrawCount: 0 }],
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
    liveDrawing: null,
  };
}

export function addPlayer(room, playerId, playerName) {
  if (room.players.find((p) => p.id === playerId)) return room.players.find((p) => p.id === playerId);

  const player = {
    id: playerId,
    name: playerName || `Player ${room.players.length + 1}`,
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
          videoUrl: isDrawer && (room.phase === PHASES.WATCH_CLIP || room.phase === PHASES.SELECT_KEYFRAMES || room.phase === PHASES.DRAWING || room.phase === PHASES.REDRAW)
            ? room.clip.videoUrl
            : undefined,
          keyframes: isDrawer && (room.phase === PHASES.SELECT_KEYFRAMES || room.phase === PHASES.DRAWING || room.phase === PHASES.REDRAW)
            ? room.clip.keyframes
            : undefined,
        }
      : null,
    guessOptions:
      room.phase === PHASES.GUESSING ||
      room.phase === PHASES.DRAWING ||
      room.phase === PHASES.ROUND_RESULTS
        ? room.guessOptions.map((o) => ({ id: o.id, title: o.title, thumbnail: o.thumbnail }))
        : [],
    selectedKeyframes: isDrawer ? room.selectedKeyframes : room.selectedKeyframes.map((_, i) => i),
    sketches: room.sketches.map((s, i) => ({
      data: s.data,
      ratings: room.phase === PHASES.ROUND_RESULTS ? s.ratings : undefined,
      averageRating: room.phase === PHASES.ROUND_RESULTS ? getAverageRating(s.ratings) : undefined,
      redrawCount: s.redrawCount,
      index: i,
    })),
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
    liveDrawing: room.liveDrawing,
    roundScores: room.roundScores,
    redrawKeyframes: isDrawer ? room.redrawKeyframes : [],
    correctAnswer: room.phase === PHASES.ROUND_RESULTS ? room.clip?.title : undefined,
    myRole: me?.role,
    myId: playerId,
    isHost: room.hostId === playerId,
    canSelectRole: room.phase === PHASES.ROLE_SELECTION && room.roleSelectionIndex === me?.joinOrder,
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
  room.players.forEach((p) => {
    p.role = null;
    p.hasGuessed = false;
    p.hasRated = false;
  });
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
  room.clip = pickRandomClip(room.categoryFolder);
  room.guessOptions = room.clip ? pickGuessOptions(room.categoryFolder, room.clip.id) : [];
  room.selectedKeyframes = [];
  room.sketches = [
    { data: null, ratings: [], redrawCount: 0 },
    { data: null, ratings: [], redrawCount: 0 },
    { data: null, ratings: [], redrawCount: 0 },
  ];
  room.currentSketchIndex = 0;
  room.guesses = {};
  room.guessOrder = [];
  room.redrawKeyframes = [];
  room.liveDrawing = null;
  room.roundScores = null;
  room.sessionTimeLeft = SESSION_TIME;
  room.sketchTimeLeft = SKETCH_TIME;
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
  room.sketchTimeLeft = SKETCH_TIME;
  return true;
}

export function submitSketch(room, playerId, sketchData) {
  if (room.drawerId !== playerId || (room.phase !== PHASES.DRAWING && room.phase !== PHASES.REDRAW)) return false;

  room.sketches[room.currentSketchIndex].data = sketchData;
  room.liveDrawing = null;

  if (room.currentSketchIndex < 2) {
    room.currentSketchIndex++;
    room.sketchTimeLeft = SKETCH_TIME;
    return 'next_sketch';
  }

  room.phase = PHASES.GUESSING;
  room.currentSketchIndex = 0;
  return 'guessing';
}

export function updateLiveDrawing(room, playerId, drawingData) {
  if (room.drawerId !== playerId) return;
  room.liveDrawing = drawingData;
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
    if (rating > 0) room.sketches[i].ratings.push(rating);
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
    room.sketchTimeLeft = SKETCH_TIME;
    room.sketches.forEach((s) => {
      s.data = null;
      s.ratings = [];
      s.redrawCount++;
    });
    room.players.forEach((p) => {
      p.hasGuessed = false;
      p.hasRated = false;
    });
    room.guesses = {};
    room.guessOrder = [];
    return;
  }

  if (majorityCorrect && lowRatedFrames.length > 0) {
    const needsRedraw = lowRatedFrames.filter((f) => room.sketches[f.index].redrawCount < 1);
    if (needsRedraw.length > 0) {
      room.phase = PHASES.REDRAW;
      room.redrawKeyframes = needsRedraw.map((f) => room.selectedKeyframes[f.index]);
      room.currentSketchIndex = needsRedraw[0].index;
      room.sketchTimeLeft = SKETCH_TIME;
      needsRedraw.forEach((f) => {
        room.sketches[f.index].data = null;
        room.sketches[f.index].ratings = [];
        room.sketches[f.index].redrawCount++;
      });
      room.players.forEach((p) => {
        p.hasGuessed = false;
        p.hasRated = false;
      });
      room.guesses = {};
      room.guessOrder = [];
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

  room.phase = PHASES.ROUND_RESULTS;
}

function calculateRoundScores(room) {
  const results = [];
  const guessers = room.players.filter((p) => p.role === 'guesser');
  const drawer = room.players.find((p) => p.role === 'drawer');

  if (drawer) {
    let drawerPoints = 0;
    room.sketches.forEach((s) => {
      drawerPoints += getAverageRating(s.ratings);
    });
    const correctGuesses = guessers.filter((p) => room.guesses[p.id]?.correct).length;
    drawerPoints += correctGuesses;
    results.push({
      playerId: drawer.id,
      name: drawer.name,
      role: 'drawer',
      roundPoints: Math.round(drawerPoints * 10) / 10,
      breakdown: {
        ratingPoints: room.sketches.reduce((sum, s) => sum + getAverageRating(s.ratings), 0),
        correctGuessBonus: correctGuesses,
      },
    });
  }

  guessers.forEach((g) => {
    let points = 0;
    const guess = room.guesses[g.id];
    if (guess?.correct) {
      points = 5;
      if (room.guessOrder[0] === g.id) points += 5;
    }
    results.push({
      playerId: g.id,
      name: g.name,
      role: 'guesser',
      roundPoints: points,
      breakdown: {
        correct: guess?.correct || false,
        firstCorrect: room.guessOrder[0] === g.id,
      },
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
  player.continueVote = vote;
  room.continueVotes[playerId] = vote;
  return true;
}

export function startNextRound(room) {
  const continueCount = room.players.filter((p) => p.continueVote === true).length;
  if (continueCount < 2) return false;

  room.phase = PHASES.ROLE_SELECTION;
  room.roleSelectionIndex = 0;
  room.drawerChosen = false;
  room.continueVotes = {};
  room.players.forEach((p) => {
    p.role = null;
    p.continueVote = null;
    p.hasGuessed = false;
    p.hasRated = false;
  });
  return true;
}

export function proceedToContinueVote(room) {
  room.phase = PHASES.CONTINUE_VOTE;
  room.players.forEach((p) => {
    p.continueVote = null;
  });
  room.continueVotes = {};
}

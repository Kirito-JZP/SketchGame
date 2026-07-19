export const copy = {
  errors: {
    roomNotFound: 'Room not found',
    notAuthorized: 'Not authorized',
    needTwoPlayers: 'Need at least 2 players',
    needTwoPlayersToContinue: 'Need at least 2 players to continue',
    gameAlreadyStarted: 'Game already started, cannot join',
    nameRequired: 'Enter your name to join this game',
    nameTaken: 'This name is already taken, please choose another name.',
  },

  scoreBreakdown: {
    sketchRatings: 'Sketch ratings',
    correctGuessers: 'Correct guessers',
    correctGuess: 'Correct guess',
    firstCorrectBonus: 'First correct bonus',
  },

  playerLeft: (name) => `Player ${name} has left the game`,

  defaultPlayerName: (n) => `Player ${n}`,
};

export const ROOM_TIMINGS = {
  REFRESH_GRACE_MS: 2000,
  RECONNECT_GRACE_MS: 30000,
  LEAVE_COUNTDOWN_SECONDS: 10,
  ROLE_REVEAL_MS: 5000,
};

export const GLOBAL_ROOM_ID = 'GLOBAL';

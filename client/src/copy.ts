export const copy = {
  app: {
    title: 'Movie Draw & Guess',
    loadingGame: 'Loading game...',
    loadingPhase: (phase: string) => `Loading phase: ${phase}...`,
  },

  common: {
    cancel: 'Cancel',
    confirm: 'Confirm',
    yourName: 'Your name',
    host: 'Host',
    continue: 'Continue',
    playerNameFallback: (n: number) => `Player ${n}`,
    joinOrder: (n: number) => `#${n}`,
    guessLetter: (index: number) => String.fromCharCode(65 + index),
    points: (n: number) => `${n} pts`,
    signedPoints: (n: number) => `${n >= 0 ? '+' : ''}${n} pts`,
    powerUpPoints: (n: number) => `${n} power-up pts`,
  },

  studioMain: {
    homeAlt: 'Movie Draw',
    startGame: 'Start Game',
    creatingLink: 'Creating link...',
    shareToFriends: 'Share to friends',
    enterGameTitle: 'Enter the Game',
    enterNameHint: 'Enter your name to join the waiting room',
    joinWaitingRoom: 'Join Waiting Room',
    createAndShare: 'Create & Share',
    alerts: {
      noClips: 'Game resources are being created, please stay tuned.',
      notConnected: 'Connecting to server, please try again in a moment.',
      createRoomFailed: 'Failed to create a room. Please try again.',
      gameAlreadyStarted: 'Game already started, cannot join',
      nameTaken: 'This name is already taken, please choose another name.',
      rejoinFailed: 'Could not rejoin the game. Please try again from the home page.',
    },
  },

  game: {
    waitingForDrawer: 'Waiting for the drawer to finish preparing sketches...',
    playerLeftCountdown: (message: string, seconds: number) =>
      `${message} Waiting ${seconds}s for them to return...`,
  },

  waitingRoom: {
    joinGameRoom: 'Join Game Room',
    tryAnotherName: 'Retry',
    connecting: 'Connecting...',
    joiningRoom: 'Joining room...',
    connectingToServer: 'Connecting to server...',
    waitingForOthers: 'Waiting for Others',
    waitingRoom: 'Waiting Room',
    continueWaitingHint: 'You chose to continue. Waiting for other players...',
    roomCodeLabel: 'Room Code:',
    players: (count: number) => `Players (${count})`,
    linkCopied: 'Link copied!',
    shareLink: 'Share link with friends',
    waitingForPlayers: (ready: number, min: number) => `Waiting for players (${ready}/${min})...`,
    startNextRound: 'Start Next Round',
    startGame: 'Start Game',
    waitingHostNextRound: 'Waiting for host to start the next round...',
    waitingHostStart: 'Waiting for host to start the game...',
    friendsJoinViaLabel: 'Friends can join via:',
    copyLinkFallback: (link: string) => `Copy this link: ${link}`,
  },

  gameHeader: {
    roleLabel: 'Your role is',
    drawer: 'Drawer',
    guesser: 'Guesser',
    worldRank: (rank: number, total: number) => `Current World Rank: ${rank}/${total}`,
    currentScore: (score: number) => `Current Score: ${score}`,
    sessionTimeLeft: (time: string) => `Current session time left ${time}`,
    sketchTimeLeft: (time: string) => `Current Sketch Time Left ${time}`,
  },

  roleSelection: {
    rolesForRound: 'Roles for this round',
    rolesAssignedHint: 'Roles are assigned automatically. Starting in 5 seconds...',
    draw: 'Drawer',
    guess: 'Guesser',
    roleStatus: (name: string, role: string) => `${name}: ${role}`,
  },

  watchClip: {
    title: 'Step 1. Watch Movie Clip',
    finishWatching: 'Finish watching, next',
  },

  selectKeyframes: {
    title: 'Step 2. Select 3 keyframes that represent the film',
    keyframeLabel: (n: number) => `Keyframe #${n}`,
    keyframeAlt: (n: number) => `Keyframe ${n}`,
    finishSelecting: 'Finish selecting, next',
  },

  drawingPhase: {
    redrawTitle: 'Redraw low-rated sketches — continue from your previous drawing',
    drawTitle: 'Step 3. Draw a picture based on selected keyframe, so that someone who has not watched this clip could understand what happens in it. You may draw anything and write text anywhere or in the input box and drag them on the canvas.',
    timeUp: 'Time’s up!',
    extendTimePrompt: 'Extend time? (+10s, -1 point)',
    autoSubmitIn: (seconds: number) => `Auto-submit in ${seconds}s`,
    extendTime: 'Extend (+10s, -1 pt)',
  },

  drawingCanvas: {
    referenceKeyframes: 'Reference Keyframes',
    selectedKeyframes: 'Selected keyframes',
    originalClip: 'Original clip',
    drawingCanvas: 'Drawing Canvas',
    keyframeLabel: (n: number) => `Keyframe #${n}`,
    keyframeAlt: (n: number) => `Keyframe ${n}`,
    keyframeThumb: (n: number) => `#${n}`,
    redrawLoadedHint: 'Your previous drawing is loaded. Update keywords if needed, then submit when ready.',
    keywordsTitle: (n: number) =>
      `Keywords for keyframe #${n} (3 keywords — confirm each, then drag onto sketch)`,
    keywordSlot: (n: number) => `Keyword ${n}`,
    keywordPlaced: 'Placed on sketch — drag to reposition',
    removeKeyword: 'Remove keyword',
    enterKeyword: 'Enter keyword',
    drawHint: 'Draw on the canvas. ',
    confirmKeywordsHint: 'Confirm all 3 keywords to continue.',
    finishDrawing: 'Finish Drawing, Next',
  },

  guessingPhase: {
    seeSketches: 'Step 1. See the sketches',
    rerateSketches: 'Step 2. Re-evaluate the updated sketches only',
    rateSketches: 'Step 2. Evalutate the sketches',
    guessMovie: 'Step 3. Guess the correct movie',
    drawingInProgress: 'Drawing in progress...',
    waitingForSketch: 'Waiting for sketch...',
    waitingDrawerFinish: 'Waiting for the drawer to finish all sketches...',
    partialRerateHint: 'Only redrawn sketches can be rated again. Other ratings are locked.',
    previousRatingLocked: 'Previous evaluation (locked):',
    ratingOfSketch: 'Sketch quality',
    sketchNotRedrawn: 'This sketch was not redrawn.',
    submitAnswer: 'Submit Answer',
    submitRating: 'Submit Rating',
    answerSubmitted: 'Answer submitted!',
    ratingsSubmitted: 'Ratings submitted!',
    waitingOthers: 'Waiting for other players...',
    pleaseRerate: 'Please re-rate the updated sketches only.',
    pleaseSubmitRatings: 'Please submit your updated sketch ratings.',
    keywordUpdated: 'Updated sketch with bonus keyword',
    keywordPending: 'Waiting for drawer to add keyword...',
    keywordClaimed: 'Bonus keyword already claimed',
    keywordInsufficient: (cost: number, available: number) =>
      `Need ${cost} power-up points (you have ${available})`,
    requestKeyword: (cost: number) => `Request Additional Keyword (−${cost} pts)`,
  },

  drawerGuessing: {
    title: 'Your drawings are being guessed',
    progress: (answersDone: number, answersTotal: number, ratedDone: number, ratedTotal: number) =>
      `${answersDone}/${answersTotal} guesser(s) submitted answers, ${ratedDone}/${ratedTotal} rated`,
    waiting: 'Waiting for guessers to submit answers and ratings...',
    sessionTimeLeft: (time: string) => `${time} left`,
    keywordRequests: 'Keyword requests',
    keywordRequestHint: 'A guesser spent points to request an extra keyword. Edit the sketch and add the keyword.',
    requestedKeyword: (name: string, index: number) => `${name} requested a keyword for sketch #${index}`,
    suggestedKeyword: (keyword: string) => `Suggested keyword: ${keyword}`,
    editSketchKeyword: 'Edit sketch & add keyword',
  },

  drawerWaiting: {
    title: 'Your drawings are being guessed 👀',
    progress: (done: number, total: number) => `${done}/${total} guesser(s) complete`,
  },

  roundResults: {
    title: (round: number) => `Round ${round} Results`,
    correctAnswerLabel: 'The movie was:',
    sketchAlt: (n: number) => `Sketch ${n}`,
    avgRating: (avg: string) => `Avg Rating: ${avg}/5`,
    scoreBreakdown: 'Score Breakdown',
    noPointChanges: 'No point changes this round.',
    drawerExcellent: 'Amazing, Good Job!',
    drawerImprove: 'Do better next time!',
    netScoreChange: 'Net score change',
    powerUpSpent: 'Power-up points spent',
    roundBonus: (points: string) => `Round bonus: ${points} pts`,
    totalScores: 'Total Scores',
    rank: (n: number) => `#${n}`,
    continueOrExit: 'Continue / Exit',
  },

  continueVote: {
    title: 'Round Complete!',
    prompt: 'Do you want to play another round?',
    continuePlaying: 'Continue Playing',
    exit: 'Exit',
  },

  sketchViewer: {
    defaultPlaceholder: 'Waiting for sketch...',
    alt: 'Sketch',
  },
} as const;

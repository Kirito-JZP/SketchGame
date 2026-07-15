export interface Category {
  id: string;
  folder: string;
  label: string;
  position: string;
  hasContent: boolean;
  clipCount: number;
}

export interface Player {
  id: string;
  name: string;
  role: 'drawer' | 'guesser' | null;
  score: number;
  joinOrder: number;
  hasGuessed: boolean;
  hasRated: boolean;
  continueVote: boolean | null;
  connected?: boolean;
}

export interface SketchLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

export interface Sketch {
  data: string | null;
  labels?: SketchLabel[];
  ratings?: number[];
  averageRating?: number;
  lockedRating?: number;
  redrawCount: number;
  index: number;
}

export interface LiveDrawing {
  data: string;
  labels: SketchLabel[];
  sketchIndex: number;
}

export interface GuessOption {
  id: string;
  title: string;
  videoUrl?: string;
}

export interface ScoreBreakdownItem {
  label: string;
  points: number;
  kind: 'score' | 'power_up';
}

export interface RoundScoreBreakdown {
  items: ScoreBreakdownItem[];
  scoreNet: number;
  powerUpSpent: number;
}

export interface RoundScore {
  playerId: string;
  name: string;
  role: string;
  roundPoints: number;
  breakdown: RoundScoreBreakdown;
}

export interface RoomState {
  id: string;
  categoryId: string | null;
  categoryFolder: string | null;
  hostId: string;
  phase: string;
  players: Player[];
  round: number;
  clip: {
    id?: string;
    title?: string;
    videoUrl?: string;
    keyframes?: string[];
  } | null;
  guessOptions: GuessOption[];
  selectedKeyframes: number[];
  sketches: Sketch[];
  currentSketchIndex: number;
  drawerId: string | null;
  roleSelectionIndex: number;
  drawerChosen: boolean;
  guesses: Record<string, { correct: boolean; guessId: string }>;
  guessProgress: { completed: number; total: number };
  ratingProgress: { completed: number; total: number };
  liveDrawing: LiveDrawing | null;
  roundScores: RoundScore[] | null;
  redrawKeyframes: number[];
  redrawSketchIndices: number[];
  rerateSketchIndices: number[];
  correctAnswer?: string;
  myRole: 'drawer' | 'guesser' | null;
  myId: string;
  isHost: boolean;
  rolesLocked: boolean;
  canSelectRole: boolean;
  mustBeDrawer: boolean;
  continueVotes: { continue: number; exit: number; total: number } | null;
  playerLeave: {
    playerId: string;
    playerName: string;
    secondsLeft: number;
    message: string;
  } | null;
}

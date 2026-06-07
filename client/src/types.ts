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
}

export interface Sketch {
  data: string | null;
  ratings?: number[];
  averageRating?: number;
  redrawCount: number;
  index: number;
}

export interface GuessOption {
  id: string;
  title: string;
  thumbnail?: string;
}

export interface RoundScore {
  playerId: string;
  name: string;
  role: string;
  roundPoints: number;
  breakdown: Record<string, unknown>;
}

export interface RoomState {
  id: string;
  categoryId: string;
  categoryFolder: string;
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
  sessionTimeLeft: number;
  sketchTimeLeft: number;
  liveDrawing: string | null;
  roundScores: RoundScore[] | null;
  redrawKeyframes: number[];
  correctAnswer?: string;
  myRole: 'drawer' | 'guesser' | null;
  myId: string;
  isHost: boolean;
  canSelectRole: boolean;
  continueVotes: { continue: number; exit: number; total: number } | null;
}

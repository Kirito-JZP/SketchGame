import type { RoomState } from '../types';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  state: RoomState;
  showSketchTimer?: boolean;
}

export default function GameHeader({ state, showSketchTimer }: Props) {
  const roleLabel = state.myRole === 'drawer' ? 'Drawer' : 'Guesser';
  const roleIcon = state.myRole === 'drawer' ? '✏️' : '🔍';
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const myRank = sorted.findIndex((p) => p.id === state.myId) + 1;

  return (
    <header className="game-header">
      <div className="game-header-left">
        <h1 className="game-title">Movie Draw &amp; Guess</h1>
      </div>
      <div className="game-header-center">
        <span className="role-label">Your role is</span>
        <span className="role-pill">
          <span className="role-icon">{roleIcon}</span>
          {roleLabel}
        </span>
      </div>
      <div className="game-header-right">
        <span className="stat">Current World Rank: {myRank}/{state.players.length}</span>
        <span className="stat">Current Score: {state.players.find((p) => p.id === state.myId)?.score ?? 0}</span>
        {state.myRole === 'guesser' && (
          <span className="stat">Power-Up Points: {state.myPowerUpPoints}</span>
        )}
        <span className="timer-pill">Current session time left {formatTime(state.sessionTimeLeft)}</span>
      </div>
      {showSketchTimer && (
        <div className="sketch-timer-row">
          <span className="sketch-timer-pill">Current Sketch Time Left {formatTime(state.sketchTimeLeft)}</span>
        </div>
      )}
    </header>
  );
}

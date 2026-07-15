import { copy } from '../copy';
import type { RoomState } from '../types';

interface Props {
  state: RoomState;
}

export default function GameHeader({ state }: Props) {
  const roleLabel = state.myRole === 'drawer' ? copy.gameHeader.drawer : copy.gameHeader.guesser;
  const roleIcon = state.myRole === 'drawer' ? '✏️' : '🔍';
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const myRank = sorted.findIndex((p) => p.id === state.myId) + 1;

  return (
    <header className="game-header">
      <div className="game-header-left">
        <h1 className="game-title">{copy.app.title}</h1>
      </div>
      <div className="game-header-center">
        <span className="role-label">{copy.gameHeader.roleLabel}</span>
        <span className="role-pill">
          <span className="role-icon">{roleIcon}</span>
          {roleLabel}
        </span>
      </div>
      <div className="game-header-right">
        <span className="stat">{copy.gameHeader.worldRank(myRank, state.players.length)}</span>
        <span className="stat">
          {copy.gameHeader.currentScore(state.players.find((p) => p.id === state.myId)?.score ?? 0)}
        </span>
      </div>
    </header>
  );
}

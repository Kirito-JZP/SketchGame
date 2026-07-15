import GameHeader from '../components/GameHeader';
import { copy } from '../copy';
import type { RoomState } from '../types';

interface Props {
  state: RoomState;
}

export default function DrawerGuessingPanel({ state }: Props) {
  return (
    <div className="game-page drawer-guessing-page">
      <GameHeader state={state} />
      <div className="drawer-guessing-content">
        <h2>{copy.drawerGuessing.title}</h2>
        <p className="drawer-guessing-stats">
          {copy.drawerGuessing.progress(
            state.guessProgress.completed,
            state.guessProgress.total,
            state.ratingProgress.completed,
            state.ratingProgress.total
          )}
        </p>
        <p className="drawer-waiting-msg">{copy.drawerGuessing.waiting}</p>
      </div>
    </div>
  );
}

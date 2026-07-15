import { copy } from '../copy';
import type { RoomState } from '../types';

interface Props {
  state: RoomState;
}

export default function DrawerWaiting({ state }: Props) {
  return (
    <div className="drawer-waiting-page">
      <h2>{copy.drawerWaiting.title}</h2>
      <p>
        {copy.drawerWaiting.progress(state.guessProgress.completed, state.guessProgress.total)}
      </p>
    </div>
  );
}

import type { RoomState } from '../types';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  state: RoomState;
}

export default function DrawerWaiting({ state }: Props) {
  return (
    <div className="drawer-waiting-page">
      <h2>Your drawings are being guessed 👀</h2>
      <p>
        {state.guessProgress.completed}/{state.guessProgress.total} guesser(s) complete,{' '}
        {formatTime(state.sessionTimeLeft)} left
      </p>
    </div>
  );
}

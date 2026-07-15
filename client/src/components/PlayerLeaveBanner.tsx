import { copy } from '../copy';
import type { RoomState } from '../types';

export default function PlayerLeaveBanner({ state }: { state: RoomState }) {
  if (!state.playerLeave) return null;

  return (
    <div className="player-leave-banner" role="alert">
      <p>
        {copy.game.playerLeftCountdown(
          state.playerLeave.message,
          state.playerLeave.secondsLeft
        )}
      </p>
    </div>
  );
}

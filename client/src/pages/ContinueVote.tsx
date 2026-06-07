import type { RoomState } from '../types';

interface Props {
  state: RoomState;
  onVote: (vote: boolean) => void;
  onStartNext: () => void;
}

export default function ContinueVote({ state, onVote, onStartNext }: Props) {
  const votes = state.continueVotes;
  const myVote = state.players.find((p) => p.id === state.myId)?.continueVote;
  const canStart = state.isHost && votes && votes.continue >= 2;

  return (
    <div className="continue-vote-page">
      <h2>Round Complete!</h2>
      <p>Do you want to play another round?</p>

      {myVote === null ? (
        <div className="vote-buttons">
          <button className="btn-primary" onClick={() => onVote(true)}>Continue Playing</button>
          <button className="btn-secondary" onClick={() => onVote(false)}>Exit</button>
        </div>
      ) : (
        <p className="vote-confirmed">You voted to {myVote ? 'continue' : 'exit'}. Waiting for others...</p>
      )}

      {votes && (
        <div className="vote-status">
          <p>{votes.continue} want to continue, {votes.exit} want to exit</p>
          {canStart && state.isHost && (
            <button className="btn-primary" onClick={onStartNext}>
              Start Next Round
            </button>
          )}
          {votes.continue < 2 && (
            <p className="vote-hint">Need at least 2 players to continue</p>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { copy } from '../copy';
import type { RoomState } from '../types';
import { clearSession } from '../utils/session';

interface Props {
  state: RoomState;
  onVote: (vote: boolean) => void;
}

export default function ContinueVote({ state, onVote }: Props) {
  const navigate = useNavigate();
  const me = state.players.find((p) => p.id === state.myId);
  const myVote = me?.continueVote;
  const remaining = state.players.filter((p) => p.connected !== false);
  const continueCount = remaining.filter((p) => p.continueVote === true).length;

  useEffect(() => {
    if (myVote === false) {
      clearSession();
      navigate('/', { replace: true });
    }
  }, [myVote, navigate]);

  const handleContinue = () => {
    onVote(true);
  };

  const handleExit = () => {
    clearSession();
    onVote(false);
    navigate('/', { replace: true });
  };

  return (
    <div className="continue-vote-page">
      <h2>{copy.continueVote.title}</h2>
      <p>{copy.continueVote.prompt}</p>

      {myVote === true ? (
        <p className="vote-confirmed">
          {copy.waitingRoom.continueWaitingHint} ({continueCount}/{remaining.length})
        </p>
      ) : (
        <div className="vote-buttons">
          <button className="btn-primary" onClick={handleContinue}>
            {copy.continueVote.continuePlaying}
          </button>
          <button className="btn-secondary" onClick={handleExit}>
            {copy.continueVote.exit}
          </button>
        </div>
      )}
    </div>
  );
}

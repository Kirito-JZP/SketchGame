import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RoomState } from '../types';

interface Props {
  state: RoomState;
  onVote: (vote: boolean) => void;
}

export default function ContinueVote({ state, onVote }: Props) {
  const navigate = useNavigate();
  const myVote = state.players.find((p) => p.id === state.myId)?.continueVote;

  useEffect(() => {
    if (myVote === false) {
      navigate('/', { replace: true });
    }
  }, [myVote, navigate]);

  const handleContinue = () => {
    onVote(true);
    navigate('/waiting', { state: { roomId: state.id }, replace: true });
  };

  const handleExit = () => {
    onVote(false);
    navigate('/', { replace: true });
  };

  return (
    <div className="continue-vote-page">
      <h2>Round Complete!</h2>
      <p>Do you want to play another round?</p>

      <div className="vote-buttons">
        <button className="btn-primary" onClick={handleContinue}>Continue Playing</button>
        <button className="btn-secondary" onClick={handleExit}>Exit</button>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { copy } from '../copy';
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
      <h2>{copy.continueVote.title}</h2>
      <p>{copy.continueVote.prompt}</p>

      <div className="vote-buttons">
        <button className="btn-primary" onClick={handleContinue}>{copy.continueVote.continuePlaying}</button>
        <button className="btn-secondary" onClick={handleExit}>{copy.continueVote.exit}</button>
      </div>
    </div>
  );
}

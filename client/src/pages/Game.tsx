import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { copy } from '../copy';
import { useSocket } from '../hooks/useSocket';
import RoleSelection from './RoleSelection';
import WatchClip from './WatchClip';
import SelectKeyframes from './SelectKeyframes';
import DrawingPhase from './DrawingPhase';
import DrawerGuessingPanel from './DrawerGuessingPanel';
import GuessingPhase from './GuessingPhase';
import RoundResults from './RoundResults';
import ContinueVote from './ContinueVote';

export default function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { connected, roomState, liveDrawing, joinRoom, emit } = useSocket();

  useEffect(() => {
    if (!connected || !roomId) return;
    if (roomState?.id === roomId) return;
    joinRoom({ roomId }).catch(() => navigate('/'));
  }, [connected, roomId, roomState?.id, joinRoom, navigate]);

  if (!roomState) {
    return <div className="loading-page"><p>{copy.app.loadingGame}</p></div>;
  }

  const phase = roomState.phase;
  const isDrawer = roomState.myRole === 'drawer';
  const isGuesser = roomState.myRole === 'guesser';

  if (phase === 'waiting') {
    navigate('/waiting', { state: { roomId: roomState.id } });
    return null;
  }

  if (phase === 'role_selection') {
    return (
      <RoleSelection
        state={roomState}
        onSelect={(role) => emit('role:select', { role })}
      />
    );
  }

  if (phase === 'watch_clip' && isDrawer) {
    return <WatchClip state={roomState} onNext={() => emit('clip:watched')} />;
  }

  if (phase === 'select_keyframes' && isDrawer) {
    return (
      <SelectKeyframes
        state={roomState}
        onSubmit={(indices) => emit('keyframes:select', { indices })}
      />
    );
  }

  if ((phase === 'drawing' || phase === 'redraw') && isDrawer) {
    return (
      <DrawingPhase
        state={roomState}
        onLiveUpdate={(data, labels) => emit('drawing:live', { data, labels })}
        onSubmit={(data, labels) => emit('sketch:submit', { data, labels })}
      />
    );
  }

  if (phase === 'guessing' && isDrawer) {
    return <DrawerGuessingPanel state={roomState} />;
  }

  if ((phase === 'drawing' || phase === 'guessing') && isGuesser) {
    return (
      <GuessingPhase
        state={roomState}
        liveDrawing={liveDrawing}
        onSubmitAnswer={(guessId) => emit('guess:submit', { guessId })}
        onSubmitRating={(ratings, comment) => emit('rating:submit', { ratings, comment })}
      />
    );
  }

  if (phase === 'round_results') {
    return (
      <RoundResults
        state={roomState}
        onContinue={() => emit('round:proceed-vote')}
      />
    );
  }

  if (phase === 'continue_vote') {
    return (
      <ContinueVote
        state={roomState}
        onVote={(vote) => emit('round:continue-vote', { vote })}
      />
    );
  }

  return <div className="loading-page"><p>{copy.app.loadingPhase(phase)}</p></div>;
}

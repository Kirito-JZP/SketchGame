import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PlayerLeaveBanner from '../components/PlayerLeaveBanner';
import { copy } from '../copy';
import { useSocket } from '../hooks/useSocket';
import { loadSession } from '../utils/session';
import RoleSelection from './RoleSelection';
import WatchClip from './WatchClip';
import SelectKeyframes from './SelectKeyframes';
import DrawingPhase from './DrawingPhase';
import DrawerGuessingPanel from './DrawerGuessingPanel';
import GuessingPhase from './GuessingPhase';
import RoundResults from './RoundResults';
import ContinueVote from './ContinueVote';

function withLeaveBanner(state: import('../types').RoomState, node: React.ReactNode) {
  return (
    <>
      <PlayerLeaveBanner state={state} />
      {node}
    </>
  );
}

export default function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { connected, roomState, liveDrawing, joinRoom, emit } = useSocket();
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinAttempted, setJoinAttempted] = useState(false);

  useEffect(() => {
    if (!connected || !roomId) return;
    if (roomState?.id === roomId) return;
    if (joinAttempted || joinError) return;

    const session = loadSession();
    const playerName =
      session?.roomId === roomId || session?.roomId === 'GLOBAL'
        ? session.playerName
        : undefined;

    if (!playerName) {
      navigate(`/join/${roomId}`, { replace: true });
      return;
    }

    setJoinAttempted(true);
    joinRoom({ roomId, playerName }).catch((err: Error) => {
      setJoinError(err.message || copy.studioMain.alerts.rejoinFailed);
    });
  }, [connected, roomId, roomState?.id, joinRoom, navigate, joinAttempted, joinError]);

  if (joinError) {
    return (
      <div className="loading-page" style={{ flexDirection: 'column', gap: 16 }}>
        <p>{joinError}</p>
        <button className="btn-primary" type="button" onClick={() => navigate('/')}>
          {copy.continueVote.exit}
        </button>
      </div>
    );
  }

  if (!roomState || roomState.id !== roomId) {
    return <div className="loading-page"><p>{copy.app.loadingGame}</p></div>;
  }

  const phase = roomState.phase;
  const isDrawer = roomState.myRole === 'drawer';
  const isGuesser = roomState.myRole === 'guesser';

  if (phase === 'waiting') {
    navigate('/waiting', {
      state: {
        roomId: roomState.id,
        playerName: roomState.players.find((p) => p.id === roomState.myId)?.name,
      },
      replace: true,
    });
    return null;
  }

  if (phase === 'role_selection') {
    return withLeaveBanner(
      roomState,
      <RoleSelection state={roomState} />
    );
  }

  if (phase === 'watch_clip' && isDrawer) {
    return withLeaveBanner(
      roomState,
      <WatchClip state={roomState} onNext={() => emit('clip:watched')} />
    );
  }

  if (phase === 'select_keyframes' && isDrawer) {
    return withLeaveBanner(
      roomState,
      <SelectKeyframes
        state={roomState}
        onSubmit={(indices) => emit('keyframes:select', { indices })}
      />
    );
  }

  if ((phase === 'drawing' || phase === 'redraw') && isDrawer) {
    return withLeaveBanner(
      roomState,
      <DrawingPhase
        state={roomState}
        onLiveUpdate={(data, labels) => emit('drawing:live', { data, labels })}
        onSubmit={(data, labels) => emit('sketch:submit', { data, labels })}
      />
    );
  }

  if (phase === 'guessing' && isDrawer) {
    return withLeaveBanner(roomState, <DrawerGuessingPanel state={roomState} />);
  }

  if ((phase === 'drawing' || phase === 'redraw' || phase === 'guessing') && isGuesser) {
    return withLeaveBanner(
      roomState,
      <GuessingPhase
        state={roomState}
        liveDrawing={liveDrawing}
        onSubmitAnswer={(guessId) => emit('guess:submit', { guessId })}
        onSubmitRating={(ratings, comment) => emit('rating:submit', { ratings, comment })}
      />
    );
  }

  if ((phase === 'watch_clip' || phase === 'select_keyframes') && isGuesser) {
    return withLeaveBanner(
      roomState,
      <div className="game-page">
        <div className="loading-page">
          <p>{copy.game.waitingForDrawer}</p>
        </div>
      </div>
    );
  }

  if (phase === 'round_results') {
    return withLeaveBanner(
      roomState,
      <RoundResults
        state={roomState}
        onContinue={() => emit('round:proceed-vote')}
      />
    );
  }

  if (phase === 'continue_vote') {
    return withLeaveBanner(
      roomState,
      <ContinueVote
        state={roomState}
        onVote={(vote) => emit('round:continue-vote', { vote })}
      />
    );
  }

  if (!roomState.myRole) {
    return <div className="loading-page"><p>{copy.app.loadingGame}</p></div>;
  }

  return <div className="loading-page"><p>{copy.app.loadingPhase(phase)}</p></div>;
}

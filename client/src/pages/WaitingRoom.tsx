import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

export default function WaitingRoom() {
  const { roomId: roomIdParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { connected, roomState, joinRoom, emit } = useSocket();
  const [shareCopied, setShareCopied] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);

  const state = location.state as {
    createNew?: boolean;
    playerName?: string;
    roomId?: string;
    shareLink?: string;
  };

  const needsName = Boolean(roomIdParam && !state?.playerName && !state?.roomId);

  useEffect(() => {
    if (needsName && !nameSubmitted) {
      setShowNameModal(true);
      return;
    }
    if (!connected) return;
    if (needsName && !nameSubmitted) return;

    const name = state?.playerName || playerName.trim() || undefined;
    const roomId = roomIdParam || state?.roomId;

    joinRoom({
      roomId,
      createNew: state?.createNew === true && !roomId,
      playerName: name,
    }).catch(() => navigate('/'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, roomIdParam, state?.createNew, state?.roomId, state?.playerName, nameSubmitted, joinRoom]);

  useEffect(() => {
    if (!roomState) return;

    const myVote = roomState.players.find((p) => p.id === roomState.myId)?.continueVote;
    const inContinueLobby = roomState.phase === 'continue_vote' && myVote === true;

    if (inContinueLobby) return;

    if (roomState.phase !== 'waiting') {
      navigate(`/game/${roomState.id}`, { replace: true });
    }
  }, [roomState, navigate]);

  const handleNameSubmit = () => {
    setNameSubmitted(true);
    setShowNameModal(false);
  };

  const shareLink = state?.shareLink || (roomState ? `${window.location.origin}/join/${roomState.id}` : '');

  const copyShareLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      alert(`Copy this link: ${shareLink}`);
    }
  };

  const isContinueLobby = roomState?.phase === 'continue_vote';
  const continueCount = roomState?.players.filter((p) => p.continueVote === true).length ?? 0;

  const handleStart = async () => {
    const res = isContinueLobby
      ? await emit('round:start-next')
      : await emit('room:start');

    if (res.error) {
      alert(res.error);
      return;
    }
    if (roomState?.id) {
      navigate(`/game/${roomState.id}`, { replace: true });
    }
  };

  if (showNameModal) {
    return (
      <div className="waiting-page">
        <div className="modal-overlay">
          <div className="modal">
            <h2>Join Game Room</h2>
            <p>Enter your name to join the waiting room</p>
            <input
              type="text"
              placeholder="Your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => navigate('/')}>Cancel</button>
              <button className="btn-primary" onClick={handleNameSubmit}>Join Waiting Room</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!roomState) {
    return (
      <div className="waiting-page">
        <div className="waiting-card">
          <h2>Connecting...</h2>
          <p>{connected ? 'Joining room...' : 'Connecting to server...'}</p>
        </div>
      </div>
    );
  }

  const waitingPlayers = isContinueLobby
    ? roomState.players.filter((p) => p.continueVote === true)
    : roomState.players;

  const minPlayers = isContinueLobby ? 2 : 2;
  const readyCount = isContinueLobby ? continueCount : roomState.players.length;

  return (
    <div className="waiting-page">
      <div className="waiting-card">
        <h2>{isContinueLobby ? 'Waiting for Others' : 'Waiting Room'}</h2>
        {isContinueLobby && (
          <p className="waiting-hint">You chose to continue. Waiting for other players...</p>
        )}
        <p className="room-code">Room Code: <strong>{roomState.id}</strong></p>

        <div className="player-list">
          <h3>Players ({waitingPlayers.length})</h3>
          <ul>
            {waitingPlayers.map((p, i) => (
              <li key={p.id}>
                {p.name}
                {p.id === roomState.hostId && <span className="host-badge">Host</span>}
                {isContinueLobby && p.continueVote === true && (
                  <span className="host-badge continue-badge">Continue</span>
                )}
                {i === 0 && p.id !== roomState.hostId && !isContinueLobby && (
                  <span className="join-order">#{i + 1}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {!isContinueLobby && (
          <button className="btn-secondary share-room-btn" onClick={copyShareLink}>
            {shareCopied ? 'Link copied!' : 'Share link with friends'}
          </button>
        )}

        {roomState.isHost ? (
          <button
            className="btn-primary"
            disabled={readyCount < minPlayers}
            onClick={handleStart}
          >
            {readyCount < minPlayers
              ? `Waiting for players (${readyCount}/${minPlayers})...`
              : isContinueLobby ? 'Start Next Round' : 'Start Game'}
          </button>
        ) : (
          <p className="waiting-hint">
            {isContinueLobby
              ? 'Waiting for host to start the next round...'
              : 'Waiting for host to start the game...'}
          </p>
        )}

        {!isContinueLobby && (
          <p className="share-hint">Friends can join via: <strong>{shareLink}</strong></p>
        )}
      </div>
    </div>
  );
}

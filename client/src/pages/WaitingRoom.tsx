import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { copy } from '../copy';
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
      alert(copy.waitingRoom.copyLinkFallback(shareLink));
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
            <h2>{copy.waitingRoom.joinGameRoom}</h2>
            <p>{copy.studioMain.enterNameHint}</p>
            <input
              type="text"
              placeholder={copy.common.yourName}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => navigate('/')}>{copy.common.cancel}</button>
              <button className="btn-primary" onClick={handleNameSubmit}>{copy.studioMain.joinWaitingRoom}</button>
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
          <h2>{copy.waitingRoom.connecting}</h2>
          <p>{connected ? copy.waitingRoom.joiningRoom : copy.waitingRoom.connectingToServer}</p>
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
        <h2>{isContinueLobby ? copy.waitingRoom.waitingForOthers : copy.waitingRoom.waitingRoom}</h2>
        {isContinueLobby && (
          <p className="waiting-hint">{copy.waitingRoom.continueWaitingHint}</p>
        )}
        <p className="room-code">{copy.waitingRoom.roomCodeLabel} <strong>{roomState.id}</strong></p>

        <div className="player-list">
          <h3>{copy.waitingRoom.players(waitingPlayers.length)}</h3>
          <ul>
            {waitingPlayers.map((p, i) => (
              <li key={p.id}>
                {p.name}
                {p.id === roomState.hostId && <span className="host-badge">{copy.common.host}</span>}
                {isContinueLobby && p.continueVote === true && (
                  <span className="host-badge continue-badge">{copy.common.continue}</span>
                )}
                {i === 0 && p.id !== roomState.hostId && !isContinueLobby && (
                  <span className="join-order">{copy.common.joinOrder(i + 1)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {!isContinueLobby && (
          <button className="btn-secondary share-room-btn" onClick={copyShareLink}>
            {shareCopied ? copy.waitingRoom.linkCopied : copy.waitingRoom.shareLink}
          </button>
        )}

        {roomState.isHost ? (
          <button
            className="btn-primary"
            disabled={readyCount < minPlayers}
            onClick={handleStart}
          >
            {readyCount < minPlayers
              ? copy.waitingRoom.waitingForPlayers(readyCount, minPlayers)
              : isContinueLobby ? copy.waitingRoom.startNextRound : copy.waitingRoom.startGame}
          </button>
        ) : (
          <p className="waiting-hint">
            {isContinueLobby
              ? copy.waitingRoom.waitingHostNextRound
              : copy.waitingRoom.waitingHostStart}
          </p>
        )}

        {!isContinueLobby && (
          <p className="share-hint">{copy.waitingRoom.friendsJoinViaLabel} <strong>{shareLink}</strong></p>
        )}
      </div>
    </div>
  );
}

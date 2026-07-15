import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { copy } from '../copy';
import { useSocket } from '../hooks/useSocket';
import { loadSession } from '../utils/session';

const GLOBAL_ROOM_ID = 'GLOBAL';

export default function WaitingRoom() {
  const { roomId: roomIdParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { connected, roomState, joinRoom, emit } = useSocket();
  const [shareCopied, setShareCopied] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinAttempted, setJoinAttempted] = useState(false);

  const state = location.state as {
    playerName?: string;
    roomId?: string;
    shareLink?: string;
  };

  const session = loadSession();
  // Prefer URL / navigation state; otherwise always use the single global room.
  // Do not reuse stale session room IDs (they cause "Room not found" after restarts).
  const targetRoomId = roomIdParam || state?.roomId || GLOBAL_ROOM_ID;
  const sessionNameForRoom =
    session?.playerName &&
    (session.roomId === targetRoomId || session.roomId === GLOBAL_ROOM_ID)
      ? session.playerName
      : undefined;

  const resolvedName = state?.playerName || sessionNameForRoom || (nameSubmitted ? playerName.trim() : '');
  const needsName = !resolvedName;

  useEffect(() => {
    if (sessionNameForRoom && !playerName) {
      setPlayerName(sessionNameForRoom);
    } else if (state?.playerName && !playerName) {
      setPlayerName(state.playerName);
    }
  }, [sessionNameForRoom, state?.playerName, playerName]);

  useEffect(() => {
    if (needsName) {
      setShowNameModal(true);
      return;
    }
    if (!connected || joinAttempted || joinError) return;

    setJoinAttempted(true);
    joinRoom({
      roomId: targetRoomId,
      playerName: resolvedName,
    }).catch((err: Error) => {
      // Keep joinAttempted true so we do not retry into a Connecting ↔ error flicker.
      setJoinError(err.message || copy.studioMain.alerts.rejoinFailed);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, targetRoomId, resolvedName, joinRoom, needsName, joinAttempted, joinError]);

  useEffect(() => {
    if (!roomState) return;
    // Don't kick to /game if this client never successfully joined.
    if (joinError) return;
    if (roomState.phase !== 'waiting') {
      navigate(`/game/${roomState.id}`, { replace: true });
    }
  }, [roomState, navigate, joinError]);

  const handleNameSubmit = () => {
    if (!playerName.trim()) return;
    setNameSubmitted(true);
    setShowNameModal(false);
    setJoinError(null);
    setJoinAttempted(false);
  };

  const handleRetryWithName = () => {
    setJoinError(null);
    setJoinAttempted(false);
    setNameSubmitted(false);
    setShowNameModal(true);
  };

  const shareLink =
    state?.shareLink ||
    (roomState ? `${window.location.origin}/join/${roomState.id}` : '');

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

  const handleStart = async () => {
    const res = await emit('room:start');
    if (res.error) {
      alert(res.error);
      return;
    }
    if (roomState?.id) {
      navigate(`/game/${roomState.id}`, { replace: true });
    }
  };

  if (joinError) {
    return (
      <div className="waiting-page">
        <div className="waiting-card">
          <h2>{copy.waitingRoom.joinGameRoom}</h2>
          <p className="waiting-hint">{joinError}</p>
          <div className="modal-actions" style={{ justifyContent: 'center' }}>
            <button className="btn-secondary" type="button" onClick={handleRetryWithName}>
              {copy.waitingRoom.tryAnotherName}
            </button>
            <button className="btn-primary" type="button" onClick={() => navigate('/')}>
              {copy.continueVote.exit}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showNameModal || needsName) {
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
              <button
                className="btn-primary"
                onClick={handleNameSubmit}
                disabled={!playerName.trim()}
              >
                {copy.studioMain.joinWaitingRoom}
              </button>
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

  const connectedPlayers = roomState.players.filter((p) => p.connected !== false);
  const minPlayers = 2;
  const readyCount = connectedPlayers.length;

  return (
    <div className="waiting-page">
      <div className="waiting-card">
        <h2>{copy.waitingRoom.waitingRoom}</h2>
        <p className="room-code">{copy.waitingRoom.roomCodeLabel} <strong>{roomState.id}</strong></p>

        <div className="player-list">
          <h3>{copy.waitingRoom.players(connectedPlayers.length)}</h3>
          <ul>
            {connectedPlayers.map((p) => (
              <li key={p.id}>
                {p.name}
                {p.id === roomState.hostId && <span className="host-badge">{copy.common.host}</span>}
              </li>
            ))}
          </ul>
        </div>

        <button className="btn-secondary share-room-btn" onClick={copyShareLink}>
          {shareCopied ? copy.waitingRoom.linkCopied : copy.waitingRoom.shareLink}
        </button>

        {roomState.isHost ? (
          <button
            className="btn-primary"
            disabled={readyCount < minPlayers}
            onClick={handleStart}
          >
            {readyCount < minPlayers
              ? copy.waitingRoom.waitingForPlayers(readyCount, minPlayers)
              : copy.waitingRoom.startGame}
          </button>
        ) : (
          <p className="waiting-hint">{copy.waitingRoom.waitingHostStart}</p>
        )}

        <p className="share-hint">{copy.waitingRoom.friendsJoinViaLabel} <strong>{shareLink}</strong></p>
      </div>
    </div>
  );
}

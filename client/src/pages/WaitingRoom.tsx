import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

export default function WaitingRoom() {
  const { categoryId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { connected, roomState, joinRoom, emit } = useSocket();

  const state = location.state as { categoryId?: string; categoryFolder?: string; playerName?: string; roomId?: string };

  useEffect(() => {
    if (!connected) return;
    joinRoom({
      roomId: state?.roomId,
      categoryId: state?.categoryId || categoryId,
      categoryFolder: state?.categoryFolder,
      playerName: state?.playerName,
    }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, categoryId, state?.roomId, state?.categoryFolder, state?.playerName, joinRoom]);

  useEffect(() => {
    if (!roomState) return;
    if (roomState.phase !== 'waiting') {
      navigate(`/game/${roomState.id}`, { replace: true });
    }
  }, [roomState, navigate]);

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

  return (
    <div className="waiting-page">
      <div className="waiting-card">
        <h2>Waiting Room</h2>
        <p className="room-code">Room Code: <strong>{roomState.id}</strong></p>
        <p className="category-label">{roomState.categoryFolder}</p>

        <div className="player-list">
          <h3>Players ({roomState.players.length})</h3>
          <ul>
            {roomState.players.map((p, i) => (
              <li key={p.id}>
                {p.name}
                {p.id === roomState.hostId && <span className="host-badge">Host</span>}
                {i === 0 && p.id !== roomState.hostId && <span className="join-order">#{i + 1}</span>}
              </li>
            ))}
          </ul>
        </div>

        {roomState.isHost ? (
          <button
            className="btn-primary"
            disabled={roomState.players.length < 2}
            onClick={handleStart}
          >
            {roomState.players.length < 2
              ? `Waiting for players (${roomState.players.length}/2)...`
              : 'Start Game'}
          </button>
        ) : (
          <p className="waiting-hint">Waiting for host to start the game...</p>
        )}

        <p className="share-hint">Share room code <strong>{roomState.id}</strong> with friends to join</p>
      </div>
    </div>
  );
}

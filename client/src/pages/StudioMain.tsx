import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

type PendingAction = 'start' | 'share' | null;

export default function StudioMain() {
  const [hasClips, setHasClips] = useState(true);
  const [loadingShare, setLoadingShare] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [playerName, setPlayerName] = useState('');
  const navigate = useNavigate();
  const { connected, joinRoom } = useSocket();

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((data) => setHasClips(data.hasClips))
      .catch(() => setHasClips(false));
  }, []);

  const openNameModal = (action: PendingAction) => {
    setPendingAction(action);
    setShowNameModal(true);
  };

  const closeNameModal = () => {
    setShowNameModal(false);
    setPendingAction(null);
  };

  const resolveName = () => playerName.trim() || `Player ${Math.floor(Math.random() * 1000)}`;

  const handleStartGame = () => {
    if (!hasClips) {
      alert('Game resources are being created, please stay tuned.');
      return;
    }
    openNameModal('start');
  };

  const handleShare = () => {
    if (!connected) {
      alert('Connecting to server, please try again in a moment.');
      return;
    }
    openNameModal('share');
  };

  const handleNameSubmit = async () => {
    const name = resolveName();

    if (pendingAction === 'start') {
      closeNameModal();
      navigate('/waiting', { state: { playerName: name } });
      return;
    }

    if (pendingAction === 'share') {
      setLoadingShare(true);
      try {
        const { roomId } = await joinRoom({ createNew: true, playerName: name });
        const link = `${window.location.origin}/join/${roomId}`;
        closeNameModal();
        navigate(`/join/${roomId}`, { state: { playerName: name, shareLink: link } });
      } catch {
        alert('Failed to create a room. Please try again.');
      } finally {
        setLoadingShare(false);
      }
    }
  };

  return (
    <div className="home-page">
      <img src="/home-bg.png" alt="Movie Draw" className="home-bg" />
      <div className="home-actions">
        <button className="home-btn home-btn-primary" onClick={handleStartGame} disabled={!hasClips}>
          Start Game
        </button>
        <button className="home-btn home-btn-secondary" onClick={handleShare} disabled={loadingShare}>
          {loadingShare ? 'Creating link...' : 'Share to friends'}
        </button>
      </div>

      {showNameModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Enter the Game</h2>
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
              <button className="btn-secondary" onClick={closeNameModal}>Cancel</button>
              <button className="btn-primary" onClick={handleNameSubmit}>
                {pendingAction === 'share' ? 'Create & Share' : 'Join Waiting Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

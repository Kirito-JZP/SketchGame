import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { copy } from '../copy';
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

  const resolveName = () => playerName.trim();

  const handleStartGame = () => {
    if (!hasClips) {
      alert(copy.studioMain.alerts.noClips);
      return;
    }
    openNameModal('start');
  };

  const handleShare = () => {
    if (!connected) {
      alert(copy.studioMain.alerts.notConnected);
      return;
    }
    openNameModal('share');
  };

  const handleNameSubmit = async () => {
    const name = resolveName();
    if (!name) return;

    if (pendingAction === 'start') {
      closeNameModal();
      navigate('/waiting', { state: { playerName: name } });
      return;
    }

    if (pendingAction === 'share') {
      setLoadingShare(true);
      try {
        const { roomId } = await joinRoom({ playerName: name });
        const link = `${window.location.origin}/join/${roomId}`;
        closeNameModal();
        navigate(`/join/${roomId}`, { state: { playerName: name, shareLink: link } });
      } catch (err) {
        const message = err instanceof Error ? err.message : copy.studioMain.alerts.createRoomFailed;
        alert(message);
      } finally {
        setLoadingShare(false);
      }
    }
  };

  return (
    <div className="home-page">
      <img src="/home-bg.png" alt={copy.studioMain.homeAlt} className="home-bg" />
      <div className="home-actions">
        <button className="home-btn home-btn-primary" onClick={handleStartGame} disabled={!hasClips}>
          {copy.studioMain.startGame}
        </button>
        <button className="home-btn home-btn-secondary" onClick={handleShare} disabled={loadingShare}>
          {loadingShare ? copy.studioMain.creatingLink : copy.studioMain.shareToFriends}
        </button>
      </div>

      {showNameModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{copy.studioMain.enterGameTitle}</h2>
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
              <button className="btn-secondary" onClick={closeNameModal}>{copy.common.cancel}</button>
              <button
                className="btn-primary"
                onClick={handleNameSubmit}
                disabled={!playerName.trim()}
              >
                {pendingAction === 'share' ? copy.studioMain.createAndShare : copy.studioMain.joinWaitingRoom}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

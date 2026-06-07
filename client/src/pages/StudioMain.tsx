import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category } from '../types';

const MODULE_POSITIONS: Record<string, { top: string; left: string; label: string }> = {
  action: { top: '18%', left: '12%', label: 'Action' },
  'heavy-composition': { top: '12%', left: '72%', label: 'Heavy Composition' },
  impressionistic: { top: '42%', left: '82%', label: 'Impressionistic' },
  'long-take': { top: '72%', left: '68%', label: 'Long Take' },
  'spatial-transformation': { top: '68%', left: '8%', label: 'Spatial Transformation' },
};

export default function StudioMain() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [emptyMessage, setEmptyMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

  const handleModuleClick = (cat: Category) => {
    if (!cat.hasContent) {
      setEmptyMessage('Game resources are being created, please stay tuned.');
      setTimeout(() => setEmptyMessage(''), 3000);
      return;
    }
    setSelectedCategory(cat);
    setShowNameModal(true);
  };

  const handleJoin = () => {
    if (!selectedCategory) return;
    const name = playerName.trim() || `Player ${Math.floor(Math.random() * 1000)}`;
    navigate(`/waiting/${selectedCategory.id}`, {
      state: { categoryId: selectedCategory.id, categoryFolder: selectedCategory.folder, playerName: name },
    });
  };

  return (
    <div className="studio-page">
      <div className="studio-scene">
        <img src="/studio-bg.png" alt="Movie Studio" className="studio-bg" />
        {categories.map((cat) => {
          const pos = MODULE_POSITIONS[cat.id];
          if (!pos) return null;
          return (
            <button
              key={cat.id}
              className={`studio-module ${cat.hasContent ? 'active' : 'disabled'}`}
              style={{ top: pos.top, left: pos.left }}
              onClick={() => handleModuleClick(cat)}
              title={pos.label}
            >
              <span className="module-hit-area" />
            </button>
          );
        })}
        <div className="studio-tour-hit" title="Studio Tour" />
      </div>

      {emptyMessage && <div className="toast-message">{emptyMessage}</div>}

      {showNameModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Enter {selectedCategory?.label}</h2>
            <p>Enter your name to join the waiting room</p>
            <input
              type="text"
              placeholder="Your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowNameModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleJoin}>Join Waiting Room</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

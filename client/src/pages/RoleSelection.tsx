import type { RoomState } from '../types';

interface Props {
  state: RoomState;
  onSelect: (role: 'drawer' | 'guesser') => void;
}

export default function RoleSelection({ state, onSelect }: Props) {
  const drawerTaken = state.drawerChosen;
  const isMyTurn = state.canSelectRole;

  return (
    <div className="role-selection-page">
      <h2>Select your role</h2>
      {!isMyTurn && (
        <p className="wait-turn">
          Waiting for {state.players.find((p) => p.joinOrder === state.roleSelectionIndex)?.name} to choose...
        </p>
      )}
      <div className="role-cards">
        <button
          className={`role-card ${!isMyTurn || drawerTaken ? 'disabled' : ''}`}
          disabled={!isMyTurn || drawerTaken}
          onClick={() => onSelect('drawer')}
        >
          <span className="role-emoji">🎨</span>
          <span className="role-name">Draw</span>
        </button>
        <button
          className={`role-card ${!isMyTurn ? 'disabled' : ''}`}
          disabled={!isMyTurn}
          onClick={() => onSelect('guesser')}
        >
          <span className="role-emoji">💡</span>
          <span className="role-name">Guess</span>
        </button>
      </div>
      <div className="role-status">
        {state.players
          .filter((p) => p.role)
          .map((p) => (
            <span key={p.id} className="role-status-item">
              {p.name}: {p.role}
            </span>
          ))}
      </div>
    </div>
  );
}

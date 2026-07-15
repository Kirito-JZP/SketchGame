import { copy } from '../copy';
import type { RoomState } from '../types';

interface Props {
  state: RoomState;
  onSelect: (role: 'drawer' | 'guesser') => void;
}

export default function RoleSelection({ state, onSelect }: Props) {
  const rolesLocked = state.rolesLocked;
  const drawerTaken = state.drawerChosen;
  const isMyTurn = state.canSelectRole;
  const mustBeDrawer = state.mustBeDrawer;

  return (
    <div className="role-selection-page">
      <h2>{rolesLocked ? copy.roleSelection.rolesForRound : copy.roleSelection.selectRole}</h2>
      {rolesLocked && (
        <p className="wait-turn">{copy.roleSelection.rolesRotateHint}</p>
      )}
      {!rolesLocked && !isMyTurn && (
        <p className="wait-turn">
          {copy.roleSelection.waitingForPlayer(
            state.players.find((p) => p.joinOrder === state.roleSelectionIndex)?.name ?? ''
          )}
        </p>
      )}
      {!rolesLocked && mustBeDrawer && isMyTurn && (
        <p className="wait-turn">{copy.roleSelection.mustBeDrawer}</p>
      )}
      <div className="role-cards">
        <button
          className={`role-card ${rolesLocked || !isMyTurn || (drawerTaken && !mustBeDrawer) ? 'disabled' : ''}`}
          disabled={rolesLocked || !isMyTurn || (drawerTaken && !mustBeDrawer)}
          onClick={() => onSelect('drawer')}
        >
          <span className="role-emoji">🎨</span>
          <span className="role-name">{copy.roleSelection.draw}</span>
        </button>
        <button
          className={`role-card ${rolesLocked || !isMyTurn || mustBeDrawer ? 'disabled' : ''}`}
          disabled={rolesLocked || !isMyTurn || mustBeDrawer}
          onClick={() => onSelect('guesser')}
        >
          <span className="role-emoji">💡</span>
          <span className="role-name">{copy.roleSelection.guess}</span>
        </button>
      </div>
      <div className="role-status">
        {rolesLocked
          ? [...state.players]
              .sort((a, b) => a.joinOrder - b.joinOrder)
              .map((p) => (
                <span key={p.id} className="role-status-item">
                  {copy.roleSelection.roleStatus(p.name, p.role ?? '')}
                </span>
              ))
          : state.players
              .filter((p) => p.role)
              .map((p) => (
                <span key={p.id} className="role-status-item">
                  {copy.roleSelection.roleStatus(p.name, p.role ?? '')}
                </span>
              ))}
      </div>
    </div>
  );
}

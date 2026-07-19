import { copy } from '../copy';
import type { RoomState } from '../types';

interface Props {
  state: RoomState;
}

export default function RoleSelection({ state }: Props) {
  const isDrawer = state.myRole === 'drawer';
  const isGuesser = state.myRole === 'guesser';

  return (
    <div className="role-selection-page">
      <h2>{copy.roleSelection.rolesForRound}</h2>
      <p className="wait-turn">{copy.roleSelection.rolesAssignedHint}</p>
      <div className="role-cards">
        <div
          className={`role-card ${isDrawer ? 'role-card-assigned' : 'disabled'}`}
          aria-current={isDrawer ? 'true' : undefined}
        >
          <span className="role-emoji">🎨</span>
          <span className="role-name">{copy.roleSelection.draw}</span>
        </div>
        <div
          className={`role-card ${isGuesser ? 'role-card-assigned' : 'disabled'}`}
          aria-current={isGuesser ? 'true' : undefined}
        >
          <span className="role-emoji">💡</span>
          <span className="role-name">{copy.roleSelection.guess}</span>
        </div>
      </div>
      <div className="role-status">
        {[...state.players]
          .sort((a, b) => a.joinOrder - b.joinOrder)
          .map((p) => {
            const roleLabel =
              p.role === 'drawer'
                ? copy.roleSelection.draw
                : p.role === 'guesser'
                  ? copy.roleSelection.guess
                  : p.role ?? '';
            return (
              <span key={p.id} className="role-status-item">
                {copy.roleSelection.roleStatus(p.name, roleLabel)}
              </span>
            );
          })}
      </div>
    </div>
  );
}

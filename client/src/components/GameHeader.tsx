import { useEffect } from 'react';
import { copy } from '../copy';
import type { RoomState } from '../types';
import { playTimerWarningBeep, useTimerWarningAlert } from '../utils/timerAlert';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  state: RoomState;
  showSketchTimer?: boolean;
}

export default function GameHeader({ state, showSketchTimer }: Props) {
  const roleLabel = state.myRole === 'drawer' ? copy.gameHeader.drawer : copy.gameHeader.guesser;
  const roleIcon = state.myRole === 'drawer' ? '✏️' : '🔍';
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const myRank = sorted.findIndex((p) => p.id === state.myId) + 1;

  const timerWarningActive =
    !!showSketchTimer && !state.extendPromptActive && state.sketchTimeLeft > 0 && state.sketchTimeLeft <= 3;
  const triggerWarning = useTimerWarningAlert(timerWarningActive);

  useEffect(() => {
    if (timerWarningActive) {
      triggerWarning(state.sketchTimeLeft);
    }
  }, [timerWarningActive, state.sketchTimeLeft, triggerWarning]);

  useEffect(() => {
    if (state.extendPromptActive && state.extendPromptTimeLeft > 0) {
      playTimerWarningBeep();
    }
  }, [state.extendPromptActive, state.extendPromptTimeLeft]);

  const timerClass = timerWarningActive
    ? 'sketch-timer-pill sketch-timer-warning'
    : state.extendPromptActive
      ? 'sketch-timer-pill sketch-timer-expired'
      : 'sketch-timer-pill';

  return (
    <header className="game-header">
      <div className="game-header-left">
        <h1 className="game-title">{copy.app.title}</h1>
      </div>
      <div className="game-header-center">
        <span className="role-label">{copy.gameHeader.roleLabel}</span>
        <span className="role-pill">
          <span className="role-icon">{roleIcon}</span>
          {roleLabel}
        </span>
      </div>
      <div className="game-header-right">
        <span className="stat">{copy.gameHeader.worldRank(myRank, state.players.length)}</span>
        <span className="stat">
          {copy.gameHeader.currentScore(state.players.find((p) => p.id === state.myId)?.score ?? 0)}
        </span>
        {state.myRole === 'guesser' && (
          <span className="stat">{copy.common.powerUpPoints(state.myPowerUpPoints)}</span>
        )}
        <span className="timer-pill">{copy.gameHeader.sessionTimeLeft(formatTime(state.sessionTimeLeft))}</span>
      </div>
      {showSketchTimer && (
        <div className="sketch-timer-row">
          <span className={timerClass}>
            {copy.gameHeader.sketchTimeLeft(formatTime(state.sketchTimeLeft))}
          </span>
        </div>
      )}
    </header>
  );
}

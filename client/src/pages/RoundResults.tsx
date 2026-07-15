import { useMemo, useState } from 'react';
import GameHeader from '../components/GameHeader';
import { copy } from '../copy';
import type { RoomState, RoundScore } from '../types';

interface Props {
  state: RoomState;
  onContinue: () => void;
}

const RATING_MAX = 5;
const RATING_PASS_THRESHOLD = 0.6; // over 60%

function formatPoints(points: number) {
  const prefix = points >= 0 ? '+' : '';
  return `${prefix}${points}`;
}

function isDrawerExcellent(state: RoomState): boolean {
  const guessers = state.players.filter((p) => p.role === 'guesser');
  if (guessers.length === 0) return false;

  const allCorrect = guessers.every((g) => state.guesses[g.id]?.correct === true);
  if (!allCorrect) return false;

  return state.sketches.every((sketch) => {
    const avg = sketch.averageRating;
    if (avg == null) {
      const ratings = sketch.ratings ?? [];
      if (ratings.length === 0) return false;
      const computed = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      return computed > RATING_MAX * RATING_PASS_THRESHOLD;
    }
    // Each sketch's average rating must be over 60% (above 3/5).
    return avg > RATING_MAX * RATING_PASS_THRESHOLD;
  });
}

function ScoreBreakdown({ score }: { score: RoundScore }) {
  const { breakdown } = score;
  if (!breakdown?.items?.length) {
    return <p className="breakdown-empty">{copy.roundResults.noPointChanges}</p>;
  }

  return (
    <div className="score-breakdown">
      <ul className="breakdown-list">
        {breakdown.items.map((item, i) => (
          <li key={i} className={`breakdown-item breakdown-${item.kind}`}>
            <span className="breakdown-label">{item.label}</span>
            <span className={`breakdown-points ${item.points >= 0 ? 'positive' : 'negative'}`}>
              {item.kind === 'power_up'
                ? copy.common.powerUpPoints(item.points)
                : copy.common.signedPoints(item.points)}
            </span>
          </li>
        ))}
      </ul>
      <div className="breakdown-totals">
        <div className="breakdown-total-row">
          <span>{copy.roundResults.netScoreChange}</span>
          <span className={breakdown.scoreNet >= 0 ? 'positive' : 'negative'}>
            {copy.common.signedPoints(breakdown.scoreNet)}
          </span>
        </div>
        {breakdown.powerUpSpent > 0 && (
          <div className="breakdown-total-row breakdown-power-up-total">
            <span>{copy.roundResults.powerUpSpent}</span>
            <span className="negative">{copy.common.points(breakdown.powerUpSpent)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoundResults({ state, onContinue }: Props) {
  const isDrawer = state.myRole === 'drawer';
  const excellent = useMemo(() => isDrawerExcellent(state), [state]);
  const [showDrawerPrompt, setShowDrawerPrompt] = useState(isDrawer);

  return (
    <div className="game-page">
      <GameHeader state={state} />
      <div className="results-section">
        <h2>{copy.roundResults.title(state.round)}</h2>
        {state.correctAnswer && (
          <p className="correct-answer">
            {copy.roundResults.correctAnswerLabel} <strong>{state.correctAnswer}</strong>
          </p>
        )}

        <div className="results-sketches">
          {state.sketches.map((s, i) => (
            <div key={i} className="result-sketch-card">
              {s.data && <img src={s.data} alt={copy.roundResults.sketchAlt(i + 1)} />}
              {s.averageRating !== undefined && (
                <p>{copy.roundResults.avgRating(s.averageRating.toFixed(1))}</p>
              )}
            </div>
          ))}
        </div>

        <div className="score-breakdown-section">
          <h3>{copy.roundResults.scoreBreakdown}</h3>
          {state.roundScores?.map((rs) => (
            <div
              key={rs.playerId}
              className={`player-breakdown-card ${rs.playerId === state.myId ? 'highlight' : ''}`}
            >
              <div className="player-breakdown-header">
                <div>
                  <strong>{rs.name}</strong>
                  <span className="player-breakdown-role">{rs.role}</span>
                </div>
                <span className="player-breakdown-round-total">
                  {copy.roundResults.roundBonus(formatPoints(rs.roundPoints))}
                </span>
              </div>
              <ScoreBreakdown score={rs} />
            </div>
          ))}
        </div>

        <div className="leaderboard">
          <h3>{copy.roundResults.totalScores}</h3>
          {[...state.players]
            .sort((a, b) => b.score - a.score)
            .map((p, i) => (
              <div key={p.id} className={`leaderboard-row ${p.id === state.myId ? 'highlight' : ''}`}>
                <span className="rank">{copy.roundResults.rank(i + 1)}</span>
                <span className="name">{p.name}</span>
                <span className="score">{copy.common.points(p.score)}</span>
              </div>
            ))}
        </div>

        <button className="btn-primary" onClick={onContinue}>
          {copy.roundResults.continueOrExit}
        </button>
      </div>

      {showDrawerPrompt && (
        <div className="modal-overlay">
          <div className="modal drawer-feedback-modal">
            <h2>{excellent ? copy.roundResults.drawerExcellent : copy.roundResults.drawerImprove}</h2>
            <div className="modal-actions">
              <button className="btn-primary" type="button" onClick={() => setShowDrawerPrompt(false)}>
                {copy.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

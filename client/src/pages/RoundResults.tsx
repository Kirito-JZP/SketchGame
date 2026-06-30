import GameHeader from '../components/GameHeader';
import type { RoomState, RoundScore } from '../types';

interface Props {
  state: RoomState;
  onContinue: () => void;
}

function formatPoints(points: number) {
  const prefix = points >= 0 ? '+' : '';
  return `${prefix}${points}`;
}

function ScoreBreakdown({ score }: { score: RoundScore }) {
  const { breakdown } = score;
  if (!breakdown?.items?.length) {
    return <p className="breakdown-empty">No point changes this round.</p>;
  }

  return (
    <div className="score-breakdown">
      <ul className="breakdown-list">
        {breakdown.items.map((item, i) => (
          <li key={i} className={`breakdown-item breakdown-${item.kind}`}>
            <span className="breakdown-label">{item.label}</span>
            <span className={`breakdown-points ${item.points >= 0 ? 'positive' : 'negative'}`}>
              {item.kind === 'power_up'
                ? `${item.points} power-up pts`
                : `${formatPoints(item.points)} pts`}
            </span>
          </li>
        ))}
      </ul>
      <div className="breakdown-totals">
        <div className="breakdown-total-row">
          <span>Net score change</span>
          <span className={breakdown.scoreNet >= 0 ? 'positive' : 'negative'}>
            {formatPoints(breakdown.scoreNet)} pts
          </span>
        </div>
        {breakdown.powerUpSpent > 0 && (
          <div className="breakdown-total-row breakdown-power-up-total">
            <span>Power-up points spent</span>
            <span className="negative">{breakdown.powerUpSpent} pts</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoundResults({ state, onContinue }: Props) {
  return (
    <div className="game-page">
      <GameHeader state={state} />
      <div className="results-section">
        <h2>Round {state.round} Results</h2>
        {state.correctAnswer && (
          <p className="correct-answer">The movie was: <strong>{state.correctAnswer}</strong></p>
        )}

        <div className="results-sketches">
          {state.sketches.map((s, i) => (
            <div key={i} className="result-sketch-card">
              {s.data && <img src={s.data} alt={`Sketch ${i + 1}`} />}
              {s.averageRating !== undefined && (
                <p>Avg Rating: {s.averageRating.toFixed(1)}/5</p>
              )}
            </div>
          ))}
        </div>

        <div className="score-breakdown-section">
          <h3>Score Breakdown</h3>
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
                  Round bonus: {formatPoints(rs.roundPoints)} pts
                </span>
              </div>
              <ScoreBreakdown score={rs} />
            </div>
          ))}
        </div>

        <div className="leaderboard">
          <h3>Total Scores</h3>
          {[...state.players]
            .sort((a, b) => b.score - a.score)
            .map((p, i) => (
              <div key={p.id} className={`leaderboard-row ${p.id === state.myId ? 'highlight' : ''}`}>
                <span className="rank">#{i + 1}</span>
                <span className="name">{p.name}</span>
                <span className="score">{p.score} pts</span>
              </div>
            ))}
        </div>

        <button className="btn-primary" onClick={onContinue}>
          Continue / Exit
        </button>
      </div>
    </div>
  );
}

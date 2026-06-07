import GameHeader from '../components/GameHeader';
import type { RoomState } from '../types';

interface Props {
  state: RoomState;
  onContinue: () => void;
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

        <div className="score-table">
          <h3>Round Scores</h3>
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Role</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {state.roundScores?.map((rs) => (
                <tr key={rs.playerId} className={rs.playerId === state.myId ? 'highlight' : ''}>
                  <td>{rs.name}</td>
                  <td>{rs.role}</td>
                  <td>+{rs.roundPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

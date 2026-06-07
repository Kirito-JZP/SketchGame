import { useState } from 'react';
import GameHeader from '../components/GameHeader';
import type { RoomState } from '../types';

interface Props {
  state: RoomState;
  liveDrawing: { data: string; sketchIndex: number } | null;
  onSubmit: (guessId: string, ratings: number[], comment: string) => void;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          className={`star ${star <= value ? 'filled' : ''}`}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function GuessingPhase({ state, liveDrawing, onSubmit }: Props) {
  const [ratings, setRatings] = useState([0, 0, 0]);
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const sketches = state.sketches;
  const isDrawing = state.phase === 'drawing' || state.phase === 'redraw';
  const allSketchesDone = sketches.every((s) => s.data);
  const allRated = ratings.every((r) => r > 0);
  const canSubmit = selectedGuess && (isDrawing && !allSketchesDone ? true : allRated);

  const handleSubmit = () => {
    if (!selectedGuess) return;
    if (allSketchesDone && !allRated) return;
    onSubmit(selectedGuess, allSketchesDone ? ratings : [0, 0, 0], comment);
    if (allSketchesDone && allRated) setSubmitted(true);
    else if (!allSketchesDone) setSubmitted(true);
  };

  const displaySketches = sketches.map((s, i) => {
    if (liveDrawing && liveDrawing.sketchIndex === i && isDrawing) {
      return liveDrawing.data;
    }
    return s.data;
  });

  return (
    <div className="game-page guessing-page">
      <GameHeader state={state} />
      <div className="guessing-section">
        <div className="step-header">
          <span className="step-icon">🎨</span>
          <h2>Step 1. See the sketches</h2>
        </div>
        <div className="sketches-row">
          {displaySketches.map((data, i) => (
            <div key={i} className="sketch-card">
              {data ? (
                <img src={data} alt={`Sketch ${i + 1}`} className="sketch-img" />
              ) : (
                <div className="sketch-placeholder">
                  {isDrawing && liveDrawing?.sketchIndex === i ? 'Drawing in progress...' : 'Waiting for sketch...'}
                </div>
              )}
            </div>
          ))}
        </div>

        {allSketchesDone && (
          <>
            <div className="step-header">
              <span className="step-icon">⭐</span>
              <h2>Step 2. Rate the sketches</h2>
            </div>
            <div className="ratings-row">
              {sketches.map((_, i) => (
                <div key={i} className="rating-card">
                  <p>Rating of this sketch:</p>
                  <StarRating
                    value={ratings[i]}
                    onChange={(v) => setRatings((prev) => { const n = [...prev]; n[i] = v; return n; })}
                  />
                  <input
                    type="text"
                    placeholder="Leave comments (optional)"
                    className="comment-input"
                    value={i === 0 ? comment : ''}
                    onChange={(e) => i === 0 && setComment(e.target.value)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="guessing-section guess-movie-section">
        <div className="step-header">
          <span className="step-icon">🎬</span>
          <h2>Step 3. Guess the correct movie</h2>
        </div>
        <div className="guess-options">
          {state.guessOptions.map((opt, i) => (
            <button
              key={opt.id}
              className={`guess-option ${selectedGuess === opt.id ? 'selected' : ''}`}
              onClick={() => setSelectedGuess(opt.id)}
            >
              <span className="guess-letter">{String.fromCharCode(65 + i)}</span>
              {opt.thumbnail && <img src={opt.thumbnail} alt={opt.title} className="guess-thumb" />}
              <span className="guess-title">{opt.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="page-footer">
        {submitted ? (
          <p className="submitted-msg">Answer submitted! Waiting for other players...</p>
        ) : (
          <button
            className={`btn-primary ${canSubmit ? '' : 'btn-disabled'}`}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Finish selecting, next
          </button>
        )}
      </div>
    </div>
  );
}

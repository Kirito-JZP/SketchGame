import { useState } from 'react';
import GameHeader from '../components/GameHeader';
import SketchViewer from '../components/SketchViewer';
import type { RoomState } from '../types';

interface Props {
  state: RoomState;
  liveDrawing: { data: string; labels: import('../types').SketchLabel[]; sketchIndex: number } | null;
  onSubmitAnswer: (guessId: string) => void;
  onSubmitRating: (ratings: number[], comment: string) => void;
}

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`star-rating ${disabled ? 'disabled' : ''}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          className={`star ${star <= value ? 'filled' : ''}`}
          disabled={disabled}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function GuessingPhase({ state, liveDrawing, onSubmitAnswer, onSubmitRating }: Props) {
  const [ratings, setRatings] = useState([0, 0, 0]);
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const me = state.players.find((p) => p.id === state.myId);
  const hasSubmittedAnswer = me?.hasGuessed ?? false;
  const hasSubmittedRating = me?.hasRated ?? false;

  const sketches = state.sketches;
  const isDrawing = state.phase === 'drawing' || state.phase === 'redraw';
  const sketchesReadyForRating = state.phase === 'guessing';
  const allRated = ratings.every((r) => r > 0);
  const canSubmitAnswer = !!selectedGuess && !hasSubmittedAnswer;
  const canSubmitRating = sketchesReadyForRating && allRated && !hasSubmittedRating;

  const handleSubmitAnswer = () => {
    if (!canSubmitAnswer || !selectedGuess) return;
    onSubmitAnswer(selectedGuess);
  };

  const handleSubmitRating = () => {
    if (!canSubmitRating) return;
    onSubmitRating(ratings, comment);
  };

  const getSketchDisplay = (i: number) => {
    if (liveDrawing && liveDrawing.sketchIndex === i && isDrawing) {
      return { data: liveDrawing.data, labels: liveDrawing.labels };
    }
    return { data: sketches[i].data, labels: sketches[i].labels || [] };
  };

  return (
    <div className="game-page guessing-page">
      <GameHeader state={state} />
      <div className="guessing-section">
        <div className="step-header">
          <span className="step-icon">🎨</span>
          <h2>Step 1. See the sketches</h2>
        </div>
        <div className="sketches-row">
          {sketches.map((_, i) => {
            const display = getSketchDisplay(i);
            return (
              <div key={i} className="sketch-card">
                <SketchViewer
                  imageData={display.data}
                  labels={display.labels}
                  className="sketch-img-wrap"
                  placeholder={
                    isDrawing && liveDrawing?.sketchIndex === i
                      ? 'Drawing in progress...'
                      : 'Waiting for sketch...'
                  }
                />
              </div>
            );
          })}
        </div>

        <div className="step-header">
          <span className="step-icon">⭐</span>
          <h2>Step 2. Rate the sketches</h2>
        </div>
        {!sketchesReadyForRating && (
          <p className="rating-wait-msg">Waiting for the drawer to finish all sketches...</p>
        )}
        <div className={`ratings-row ${!sketchesReadyForRating ? 'ratings-disabled' : ''}`}>
          {sketches.map((_, i) => (
            <div key={i} className="rating-card">
              <p>Rating of this sketch:</p>
              <StarRating
                value={ratings[i]}
                disabled={!sketchesReadyForRating || hasSubmittedRating}
                onChange={(v) => setRatings((prev) => { const n = [...prev]; n[i] = v; return n; })}
              />
              <input
                type="text"
                placeholder="Leave comments (optional)"
                className="comment-input"
                disabled={!sketchesReadyForRating || hasSubmittedRating}
                value={i === 0 ? comment : ''}
                onChange={(e) => i === 0 && setComment(e.target.value)}
              />
            </div>
          ))}
        </div>
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
              disabled={hasSubmittedAnswer}
              onClick={() => setSelectedGuess(opt.id)}
            >
              <span className="guess-letter">{String.fromCharCode(65 + i)}</span>
              {opt.videoUrl && (
                <video
                  src={opt.videoUrl}
                  className="guess-video"
                  controls
                  muted
                  playsInline
                  preload="metadata"
                />
              )}
              <span className="guess-title">{opt.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="page-footer guessing-footer">
        <div className="guessing-actions">
          <div className="guessing-action">
            {hasSubmittedAnswer ? (
              <p className="submitted-msg">Answer submitted!</p>
            ) : (
              <button
                className={`btn-primary ${canSubmitAnswer ? '' : 'btn-disabled'}`}
                disabled={!canSubmitAnswer}
                onClick={handleSubmitAnswer}
              >
                Submit Answer
              </button>
            )}
          </div>
          <div className="guessing-action">
            {hasSubmittedRating ? (
              <p className="submitted-msg">Ratings submitted!</p>
            ) : (
              <button
                className={`btn-primary ${canSubmitRating ? '' : 'btn-disabled'}`}
                disabled={!canSubmitRating}
                onClick={handleSubmitRating}
              >
                Submit Rating
              </button>
            )}
          </div>
        </div>
        {hasSubmittedAnswer && hasSubmittedRating && (
          <p className="submitted-msg waiting-msg">Waiting for other players...</p>
        )}
      </div>
    </div>
  );
}

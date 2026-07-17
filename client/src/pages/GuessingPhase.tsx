import { useEffect, useRef, useState } from 'react';
import GameHeader from '../components/GameHeader';
import SketchViewer from '../components/SketchViewer';
import { copy } from '../copy';
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

export default function GuessingPhase({
  state,
  liveDrawing,
  onSubmitAnswer,
  onSubmitRating,
}: Props) {
  const [ratings, setRatings] = useState([0, 0, 0, 0]);
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);

  const me = state.players.find((p) => p.id === state.myId);
  const hasSubmittedAnswer = me?.hasGuessed ?? false;
  const hasSubmittedRating = me?.hasRated ?? false;
  const prevHasRated = useRef(me?.hasRated ?? false);
  const sketches = state.sketches;
  const rerateIndices = state.rerateSketchIndices ?? [];
  const isPartialRerate = rerateIndices.length > 0;

  useEffect(() => {
    if (prevHasRated.current && !me?.hasRated && state.phase === 'guessing') {
      if (isPartialRerate) {
        setRatings((prev) => {
          const next = [...prev];
          rerateIndices.forEach((index) => {
            next[index] = 0;
          });
          return next;
        });
      } else {
        setRatings([0, 0, 0, 0]);
      }
    }
    prevHasRated.current = me?.hasRated ?? false;
  }, [me?.hasRated, state.phase, isPartialRerate, rerateIndices.join(',')]);

  const isDrawing = state.phase === 'drawing' || state.phase === 'redraw';
  const sketchesReadyForRating = state.phase === 'guessing';
  const isRatingLocked = (index: number) =>
    isPartialRerate && !rerateIndices.includes(index);
  const allRated = isPartialRerate
    ? rerateIndices.every((index) => ratings[index] > 0)
    : ratings.every((rating) => rating > 0);
  const canSubmitAnswer = !!selectedGuess && !hasSubmittedAnswer;
  const canSubmitRating = sketchesReadyForRating && allRated && !hasSubmittedRating;

  const getRatingValue = (index: number) => {
    if (isRatingLocked(index)) {
      return Math.round(sketches[index].lockedRating ?? 0);
    }
    return ratings[index];
  };

  const handleSubmitAnswer = () => {
    if (!canSubmitAnswer || !selectedGuess) return;
    onSubmitAnswer(selectedGuess);
  };

  const handleSubmitRating = () => {
    if (!canSubmitRating) return;
    onSubmitRating(ratings, '');
  };

  const getSketchDisplay = (i: number) => {
    if (liveDrawing && liveDrawing.sketchIndex === i && isDrawing) {
      return { data: liveDrawing.data, labels: liveDrawing.labels };
    }
    return { data: sketches[i].data, labels: [] };
  };

  return (
    <div className="game-page guessing-page">
      <GameHeader state={state} />
      <div className="guessing-section">
        <div className="step-header">
          <span className="step-icon">🎨</span>
          <h2>{copy.guessingPhase.seeSketches}</h2>
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
                      ? copy.guessingPhase.drawingInProgress
                      : copy.guessingPhase.waitingForSketch
                  }
                />
              </div>
            );
          })}
        </div>

        <div className="step-header">
          <span className="step-icon">⭐</span>
          <h2>
            {isPartialRerate
              ? copy.guessingPhase.rerateSketches
              : copy.guessingPhase.rateSketches}
          </h2>
        </div>
        {!sketchesReadyForRating && (
          <p className="rating-wait-msg">{copy.guessingPhase.waitingDrawerFinish}</p>
        )}
        {isPartialRerate && sketchesReadyForRating && (
          <p className="rating-wait-msg">{copy.guessingPhase.partialRerateHint}</p>
        )}
        <div className={`ratings-row ${!sketchesReadyForRating ? 'ratings-disabled' : ''}`}>
          {sketches.map((_, i) => {
            const locked = isRatingLocked(i);
            return (
            <div key={i} className={`rating-card ${locked ? 'rating-locked' : ''}`}>
              <p>{locked ? copy.guessingPhase.previousRatingLocked : copy.guessingPhase.ratingOfSketch}</p>
              <StarRating
                value={getRatingValue(i)}
                disabled={!sketchesReadyForRating || hasSubmittedRating || locked}
                onChange={(v) => {
                  if (locked) return;
                  setRatings((prev) => {
                    const next = [...prev];
                    next[i] = v;
                    return next;
                  });
                }}
              />
              {locked && (
                <p className="rating-locked-msg">{copy.guessingPhase.sketchNotRedrawn}</p>
              )}
            </div>
            );
          })}
        </div>
      </div>

      <div className="guessing-section guess-movie-section">
        <div className="step-header">
          <span className="step-icon">🎬</span>
          <h2>{copy.guessingPhase.guessMovie}</h2>
        </div>
        <div className="guess-options">
          {state.guessOptions.map((opt, i) => (
            <button
              key={opt.id}
              className={`guess-option ${selectedGuess === opt.id ? 'selected' : ''}`}
              disabled={hasSubmittedAnswer}
              onClick={() => setSelectedGuess(opt.id)}
            >
              <span className="guess-letter">{copy.common.guessLetter(i)}</span>
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
              <p className="submitted-msg">{copy.guessingPhase.answerSubmitted}</p>
            ) : (
              <button
                className={`btn-primary ${canSubmitAnswer ? '' : 'btn-disabled'}`}
                disabled={!canSubmitAnswer}
                onClick={handleSubmitAnswer}
              >
                {copy.guessingPhase.submitAnswer}
              </button>
            )}
          </div>
          <div className="guessing-action">
            {hasSubmittedRating ? (
              <p className="submitted-msg">{copy.guessingPhase.ratingsSubmitted}</p>
            ) : (
              <button
                className={`btn-primary ${canSubmitRating ? '' : 'btn-disabled'}`}
                disabled={!canSubmitRating}
                onClick={handleSubmitRating}
              >
                {copy.guessingPhase.submitRating}
              </button>
            )}
          </div>
        </div>
        {hasSubmittedAnswer && hasSubmittedRating && (
          <p className="submitted-msg waiting-msg">{copy.guessingPhase.waitingOthers}</p>
        )}
        {hasSubmittedAnswer && !hasSubmittedRating && sketchesReadyForRating && isPartialRerate && (
          <p className="submitted-msg waiting-msg">{copy.guessingPhase.pleaseRerate}</p>
        )}
        {hasSubmittedAnswer && !hasSubmittedRating && sketchesReadyForRating && !isPartialRerate && (
          <p className="submitted-msg waiting-msg">{copy.guessingPhase.pleaseSubmitRatings}</p>
        )}
      </div>
    </div>
  );
}

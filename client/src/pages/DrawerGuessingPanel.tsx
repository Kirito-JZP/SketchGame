import { useState } from 'react';
import GameHeader from '../components/GameHeader';
import KeywordEditCanvas from '../components/KeywordEditCanvas';
import SketchViewer from '../components/SketchViewer';
import type { RoomState } from '../types';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  state: RoomState;
  onFulfillKeyword: (sketchIndex: number, data: string, labels: import('../types').SketchLabel[]) => void;
}

export default function DrawerGuessingPanel({ state, onFulfillKeyword }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const pendingRequest = editingIndex !== null ? state.keywordRequests[editingIndex] : null;
  const sketch = editingIndex !== null ? state.sketches[editingIndex] : null;

  if (editingIndex !== null && pendingRequest?.status === 'pending' && sketch?.data) {
    const keyframes = state.clip?.keyframes || [];
    const selected = state.selectedKeyframes;
    const currentKf = selected[editingIndex];

    return (
      <div className="game-page">
        <GameHeader state={state} />
        <div className="step-header">
          <span className="step-icon">✏️</span>
          <h2>Edit sketch &amp; add bonus keyword</h2>
        </div>
        <KeywordEditCanvas
          sketchIndex={editingIndex}
          keyframeIndex={currentKf}
          allKeyframes={selected}
          allKeyframeUrls={keyframes}
          videoUrl={state.clip?.videoUrl}
          initialData={sketch.data}
          initialLabels={sketch.labels || []}
          presetKeyword={pendingRequest.presetKeyword}
          requesterName={pendingRequest.requesterName}
          onSubmit={(data, labels) => {
            onFulfillKeyword(editingIndex, data, labels);
            setEditingIndex(null);
          }}
          onCancel={() => setEditingIndex(null)}
        />
      </div>
    );
  }

  const pending = state.keywordRequests
    .map((req, i) => (req?.status === 'pending' ? { ...req, sketchIndex: i } : null))
    .filter(Boolean);

  return (
    <div className="game-page drawer-guessing-page">
      <GameHeader state={state} />
      <div className="drawer-guessing-content">
        <h2>Your drawings are being guessed</h2>
        <p className="drawer-guessing-stats">
          {state.guessProgress.completed}/{state.guessProgress.total} guesser(s) submitted answers,{' '}
          {state.ratingProgress.completed}/{state.ratingProgress.total} rated —{' '}
          {formatTime(state.sessionTimeLeft)} left
        </p>

        {pending.length > 0 && (
          <div className="keyword-requests-section">
            <h3>Keyword requests</h3>
            <p className="keyword-edit-hint">A guesser spent points to request an extra keyword. Edit the sketch and add the keyword.</p>
            <div className="keyword-requests-list">
              {pending.map((req) => (
                <div key={req!.sketchIndex} className="keyword-request-card">
                  <div className="keyword-request-preview">
                    <SketchViewer
                      imageData={state.sketches[req!.sketchIndex].data}
                      labels={[]}
                      className="sketch-img-wrap"
                    />
                  </div>
                  <div className="keyword-request-info">
                    <p><strong>{req!.requesterName}</strong> requested a keyword for sketch #{req!.sketchIndex + 1}</p>
                    <p>Suggested keyword: <strong>{req!.presetKeyword}</strong></p>
                    <button
                      className="btn-primary"
                      onClick={() => setEditingIndex(req!.sketchIndex)}
                    >
                      Edit sketch &amp; add keyword
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pending.length === 0 && (
          <p className="drawer-waiting-msg">Waiting for guessers to submit answers and ratings...</p>
        )}
      </div>
    </div>
  );
}

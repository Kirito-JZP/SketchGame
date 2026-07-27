import { useState } from 'react';
import GameHeader from '../components/GameHeader';
import KeywordEditCanvas from '../components/KeywordEditCanvas';
import SketchViewer from '../components/SketchViewer';
import { copy } from '../copy';
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
        <h2>{copy.drawerGuessing.title}</h2>
        <p className="drawer-guessing-stats">
          {copy.drawerGuessing.progress(
            state.guessProgress.completed,
            state.guessProgress.total,
            state.ratingProgress.completed,
            state.ratingProgress.total
          )}{' '}— {copy.drawerGuessing.sessionTimeLeft(formatTime(state.sessionTimeLeft))}
        </p>

        {pending.length > 0 && (
          <div className="keyword-requests-section">
            <h3>{copy.drawerGuessing.keywordRequests}</h3>
            <p className="keyword-edit-hint">{copy.drawerGuessing.keywordRequestHint}</p>
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
                    <p>{copy.drawerGuessing.requestedKeyword(req!.requesterName, req!.sketchIndex + 1)}</p>
                    <p>{copy.drawerGuessing.suggestedKeyword(req!.presetKeyword)}</p>
                    <button
                      className="btn-primary"
                      onClick={() => setEditingIndex(req!.sketchIndex)}
                    >
                      {copy.drawerGuessing.editSketchKeyword}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pending.length === 0 && (
          <p className="drawer-waiting-msg">{copy.drawerGuessing.waiting}</p>
        )}
      </div>
    </div>
  );
}

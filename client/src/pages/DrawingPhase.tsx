import { useEffect, useRef, useState } from 'react';
import GameHeader from '../components/GameHeader';
import DrawingCanvas from '../components/DrawingCanvas';
import type { RoomState, SketchLabel } from '../types';

interface Props {
  state: RoomState;
  onLiveUpdate: (data: string, labels: SketchLabel[]) => void;
  onSubmit: (data: string, labels: SketchLabel[]) => void;
  onExtendTime: () => void;
}

export default function DrawingPhase({ state, onLiveUpdate, onSubmit, onExtendTime }: Props) {
  const keyframes = state.clip?.keyframes || [];
  const selected = state.selectedKeyframes;
  const currentKf = selected[state.currentSketchIndex];
  const isRedraw = state.phase === 'redraw';
  const frozenRedrawRef = useRef<{ index: number; data: string | null; labels: SketchLabel[] }>({
    index: -1,
    data: null,
    labels: [],
  });
  if (isRedraw && frozenRedrawRef.current.index !== state.currentSketchIndex) {
    const sketch = state.sketches[state.currentSketchIndex];
    frozenRedrawRef.current = {
      index: state.currentSketchIndex,
      data: sketch?.data ?? null,
      labels: sketch?.labels ?? [],
    };
  } else if (!isRedraw && frozenRedrawRef.current.index !== -1) {
    frozenRedrawRef.current = { index: -1, data: null, labels: [] };
  }
  const initialSketchData = isRedraw ? frozenRedrawRef.current.data : null;
  const initialSketchLabels = isRedraw ? frozenRedrawRef.current.labels : [];
  const [autoSubmitSignal, setAutoSubmitSignal] = useState(0);
  const prevAutoSubmit = useRef(false);

  useEffect(() => {
    if (state.sketchAutoSubmitRequired && !prevAutoSubmit.current) {
      setAutoSubmitSignal((n) => n + 1);
    }
    prevAutoSubmit.current = state.sketchAutoSubmitRequired;
  }, [state.sketchAutoSubmitRequired]);

  return (
    <div className="game-page">
      <GameHeader state={state} showSketchTimer />
      <div className="step-header">
        <span className="step-icon">{isRedraw ? '🔄' : '✏️'}</span>
        <h2>
          {isRedraw
            ? 'Redraw low-rated sketches — continue from your previous drawing'
            : 'Step 3. Draw based on the keyframes selected'}
        </h2>
      </div>
      <DrawingCanvas
        key={`${state.phase}-${state.currentSketchIndex}`}
        keyframeIndex={currentKf}
        allKeyframes={selected}
        allKeyframeUrls={keyframes}
        videoUrl={state.clip?.videoUrl}
        currentIndex={state.currentSketchIndex}
        initialData={initialSketchData}
        initialLabels={initialSketchLabels}
        isRedrawMode={isRedraw}
        redrawSketchIndices={isRedraw ? state.redrawSketchIndices : undefined}
        autoSubmitSignal={autoSubmitSignal}
        onSubmit={onSubmit}
        onLiveUpdate={onLiveUpdate}
      />
      {state.extendPromptActive && (
        <div className="extend-time-overlay">
          <div className="extend-time-dialog">
            <h3>Time&apos;s up!</h3>
            <p>Extend time? (+10s, -1 point)</p>
            <p className="extend-time-countdown">
              Auto-submit in {state.extendPromptTimeLeft}s
            </p>
            <button type="button" className="btn-primary" onClick={onExtendTime}>
              Extend (+10s, -1 pt)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

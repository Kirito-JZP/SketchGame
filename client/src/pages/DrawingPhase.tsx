import { useEffect, useRef, useState } from 'react';
import GameHeader from '../components/GameHeader';
import DrawingCanvas from '../components/DrawingCanvas';
import { copy } from '../copy';
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
            ? copy.drawingPhase.redrawTitle
            : copy.drawingPhase.drawTitle}
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
            <h3>{copy.drawingPhase.timeUp}</h3>
            <p>{copy.drawingPhase.extendTimePrompt}</p>
            <p className="extend-time-countdown">
              {copy.drawingPhase.autoSubmitIn(state.extendPromptTimeLeft)}
            </p>
            <button type="button" className="btn-primary" onClick={onExtendTime}>
              {copy.drawingPhase.extendTime}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

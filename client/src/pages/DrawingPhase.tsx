import GameHeader from '../components/GameHeader';
import DrawingCanvas from '../components/DrawingCanvas';
import type { RoomState } from '../types';

interface Props {
  state: RoomState;
  onLiveUpdate: (data: string) => void;
  onSubmit: (data: string) => void;
}

export default function DrawingPhase({ state, onLiveUpdate, onSubmit }: Props) {
  const keyframes = state.clip?.keyframes || [];
  const selected = state.selectedKeyframes;
  const currentKf = selected[state.currentSketchIndex];

  return (
    <div className="game-page">
      <GameHeader state={state} showSketchTimer />
      <div className="step-header">
        <span className="step-icon">✏️</span>
        <h2>Step 3. Draw based on the keyframes selected</h2>
      </div>
      <DrawingCanvas
        keyframeIndex={currentKf}
        allKeyframes={selected}
        allKeyframeUrls={keyframes}
        currentIndex={state.currentSketchIndex}
        onSubmit={onSubmit}
        onLiveUpdate={onLiveUpdate}
      />
    </div>
  );
}

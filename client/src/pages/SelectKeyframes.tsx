import { useState } from 'react';
import GameHeader from '../components/GameHeader';
import { copy } from '../copy';
import type { RoomState } from '../types';

interface Props {
  state: RoomState;
  onSubmit: (indices: number[]) => void;
}

export default function SelectKeyframes({ state, onSubmit }: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  const keyframes = state.clip?.keyframes || [];

  const toggle = (index: number) => {
    setSelected((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      if (prev.length >= 3) return prev;
      return [...prev, index];
    });
  };

  return (
    <div className="game-page">
      <GameHeader state={state} />
      <div className="step-header">
        <span className="step-icon">🎬</span>
        <h2>{copy.selectKeyframes.title}</h2>
      </div>
      <div className="keyframes-grid">
        {keyframes.map((url, i) => (
          <button
            key={i}
            className={`keyframe-card ${selected.includes(i) ? 'selected' : ''}`}
            onClick={() => toggle(i)}
          >
            <div className={`keyframe-checkbox ${selected.includes(i) ? 'checked' : ''}`}>
              {selected.includes(i) && '✓'}
            </div>
            <img src={url} alt={copy.selectKeyframes.keyframeAlt(i + 1)} />
            <span className="keyframe-label">{copy.selectKeyframes.keyframeLabel(i + 1)}</span>
          </button>
        ))}
      </div>
      <div className="page-footer">
        <button
          className={`btn-primary ${selected.length === 3 ? '' : 'btn-disabled'}`}
          disabled={selected.length !== 3}
          onClick={() => onSubmit(selected)}
        >
          {copy.selectKeyframes.finishSelecting}
        </button>
      </div>
    </div>
  );
}

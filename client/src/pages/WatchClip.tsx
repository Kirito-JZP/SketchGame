import { useRef, useState } from 'react';
import GameHeader from '../components/GameHeader';
import { copy } from '../copy';
import type { RoomState } from '../types';

interface Props {
  state: RoomState;
  onNext: () => void;
}

export default function WatchClip({ state, onNext }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [watched, setWatched] = useState(false);

  return (
    <div className="game-page">
      <GameHeader state={state} />
      <div className="step-header">
        <span className="step-icon">🎬</span>
        <h2>{copy.watchClip.title}</h2>
      </div>
      <div className="video-container">
        <video
          ref={videoRef}
          src={state.clip?.videoUrl}
          controls
          className="clip-video"
          onEnded={() => setWatched(true)}
        />
      </div>
      <div className="page-footer">
        <button
          className={`btn-primary ${watched ? '' : 'btn-disabled'}`}
          disabled={!watched}
          onClick={onNext}
        >
          {copy.watchClip.finishWatching}
        </button>
      </div>
    </div>
  );
}

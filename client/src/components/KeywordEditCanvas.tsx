import { useCallback, useEffect, useRef, useState } from 'react';
import type { SketchLabel } from '../types';
import { exportCanvasWithLabels } from '../utils/sketchLabels';
import { frameNumberToVideoTime, parseKeyframeFrameNumber } from '../utils/keyframeVideo';

const COLORS = ['#000000', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#ffffff'];
const BONUS_KEYWORD_COLOR = '#d7bde2';

interface Props {
  sketchIndex: number;
  keyframeIndex: number;
  allKeyframes: number[];
  allKeyframeUrls: string[];
  videoUrl?: string;
  initialData: string;
  initialLabels?: SketchLabel[];
  presetKeyword: string;
  requesterName: string;
  onSubmit: (data: string, labels: SketchLabel[]) => void;
  onCancel: () => void;
}

export default function KeywordEditCanvas({
  sketchIndex,
  keyframeIndex,
  allKeyframes,
  allKeyframeUrls,
  videoUrl,
  initialData,
  initialLabels = [],
  presetKeyword,
  requesterName,
  onSubmit,
  onCancel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const initializedRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [bonusLabels, setBonusLabels] = useState<SketchLabel[]>([]);
  const [keywordText, setKeywordText] = useState(presetKeyword);
  const [keywordConfirmed, setKeywordConfirmed] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  const bonusLabelColor = BONUS_KEYWORD_COLOR;
  const currentKeyframeUrl = allKeyframeUrls[keyframeIndex];

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  const loadSketchImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || initializedRef.current) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    if (width === 0 || height === 0) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, width, height);
      initializedRef.current = true;
      setImageReady(true);
    };
    img.src = initialData;
  }, [initialData]);

  useEffect(() => {
    loadSketchImage();
    const raf = requestAnimationFrame(() => loadSketchImage());

    const canvas = canvasRef.current;
    if (!canvas) return () => cancelAnimationFrame(raf);

    const observer = new ResizeObserver(() => {
      if (!initializedRef.current && canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
        loadSketchImage();
      }
    });
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [loadSketchImage]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl || !currentKeyframeUrl) return;

    const frameNumber = parseKeyframeFrameNumber(currentKeyframeUrl);
    if (frameNumber === null) return;

    const seekToFrame = () => {
      video.pause();
      video.currentTime = frameNumberToVideoTime(frameNumber);
    };

    if (video.readyState >= 1) {
      seekToFrame();
    } else {
      video.addEventListener('loadedmetadata', seekToFrame, { once: true });
    }
  }, [currentKeyframeUrl, videoUrl]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (draggingId) return;
    setIsDrawing(true);
    lastPos.current = getCanvasPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || draggingId) return;
    const ctx = getCtx();
    if (!ctx) return;

    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPos.current = pos;
  };

  const endDraw = () => setIsDrawing(false);

  const confirmKeyword = () => {
    const text = keywordText.trim();
    if (!text || keywordConfirmed) return;
    setBonusLabels([
      {
        id: `bonus-label-${Date.now()}`,
        text,
        x: 6 + (initialLabels.length % 3) * 12,
        y: 6 + (initialLabels.length % 3) * 10,
        color: bonusLabelColor,
      },
    ]);
    setKeywordConfirmed(true);
  };

  const startLabelDrag = (e: React.MouseEvent, label: SketchLabel) => {
    e.preventDefault();
    e.stopPropagation();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const labelX = (label.x / 100) * rect.width;
    const labelY = (label.y / 100) * rect.height;
    dragOffset.current = {
      x: e.clientX - rect.left - labelX,
      y: e.clientY - rect.top - labelY,
    };
    setDraggingId(label.id);
  };

  const moveLabelDrag = (e: React.MouseEvent) => {
    if (!draggingId || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left - dragOffset.current.x) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.current.y) / rect.height) * 100;

    const update = (prev: SketchLabel[]) =>
      prev.map((l) =>
        l.id === draggingId
          ? { ...l, x: Math.max(0, Math.min(92, x)), y: Math.max(0, Math.min(92, y)) }
          : l
      );

    if (bonusLabels.some((l) => l.id === draggingId)) {
      setBonusLabels(update);
    }
  };

  const endLabelDrag = () => setDraggingId(null);

  const handleSubmit = () => {
    if (!keywordConfirmed || bonusLabels.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSubmit(exportCanvasWithLabels(canvas, bonusLabels), []);
  };

  return (
    <div className="drawing-layout keyword-edit-layout">
      <div className="reference-panel">
        <h3>Reference Keyframes</h3>
        <div className="reference-current">
          <img src={currentKeyframeUrl} alt={`Keyframe ${keyframeIndex + 1}`} />
          <span className="keyframe-label">Keyframe #{keyframeIndex + 1}</span>
        </div>
        <div className="reference-thumbs">
          <p className="reference-thumbs-title">Selected keyframes</p>
          <div className="reference-thumbs-row">
            {allKeyframes.map((kfIdx, i) => (
              <div
                key={kfIdx}
                className={`reference-thumb ${i === sketchIndex ? 'active' : ''} ${i < sketchIndex ? 'done' : ''}`}
              >
                {i < sketchIndex && <span className="kf-check">✓</span>}
                <img src={allKeyframeUrls[kfIdx]} alt={`Keyframe ${kfIdx + 1}`} />
                <span className="keyframe-label">#{kfIdx + 1}</span>
              </div>
            ))}
          </div>
        </div>
        {videoUrl && (
          <div className="reference-video">
            <p className="reference-thumbs-title">Original clip</p>
            <video
              ref={videoRef}
              src={videoUrl}
              className="reference-clip-video"
              controls
              playsInline
              preload="metadata"
            />
          </div>
        )}
      </div>

      <div className="draw-panel keyword-edit-panel">
        <h3>Edit Sketch #{sketchIndex + 1}</h3>
        <p className="keyword-edit-hint">
          <strong>{requesterName}</strong> requested a bonus keyword. Draw on the sketch, add the keyword, then submit.
          Suggested keyword: <strong>{presetKeyword}</strong>
        </p>

        <div
          ref={wrapperRef}
          className="canvas-wrapper keyword-edit-canvas-wrap"
        onMouseMove={moveLabelDrag}
        onMouseUp={() => { endLabelDrag(); endDraw(); }}
        onMouseLeave={() => { endLabelDrag(); endDraw(); }}
      >
        <canvas
          ref={canvasRef}
          className="draw-canvas"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {bonusLabels.map((label) => (
          <span
            key={label.id}
            className={`sketch-label-tag draggable ${draggingId === label.id ? 'dragging' : ''}`}
            style={{
              left: `${label.x}%`,
              top: `${label.y}%`,
              backgroundColor: label.color,
            }}
            onMouseDown={(e) => startLabelDrag(e, label)}
          >
            {label.text}
          </span>
        ))}
      </div>

      <div className="toolbar">
        <button type="button" className={`tool-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')}>✏️</button>
        <button type="button" className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')}>🧽</button>
        <div className="line-widths">
          <button type="button" className={`lw-btn ${lineWidth === 2 ? 'active' : ''}`} onClick={() => setLineWidth(2)}>─</button>
          <button type="button" className={`lw-btn ${lineWidth === 5 ? 'active' : ''}`} onClick={() => setLineWidth(5)}>━</button>
        </div>
        <div className="color-palette">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-swatch ${color === c ? 'selected' : ''}`}
              style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #ccc' : 'none' }}
              onClick={() => { setColor(c); setTool('pen'); }}
            />
          ))}
        </div>
      </div>

      <div className="keyword-inputs-section">
        <p className="keyword-section-title">
          Bonus keyword (confirm, then drag onto sketch)
        </p>
        <div className="keyword-inputs-row keyword-inputs-row-single">
          <div
            className={`keyword-slot active ${keywordConfirmed ? 'confirmed' : ''}`}
            style={{ backgroundColor: bonusLabelColor }}
          >
            <span className="keyword-slot-label">Bonus Keyword</span>
            {keywordConfirmed ? (
              <span className="keyword-confirmed-text">Placed on sketch — drag to reposition</span>
            ) : (
              <>
                <input
                  type="text"
                  className="keyword-slot-input"
                  placeholder="Enter keyword"
                  value={keywordText}
                  onChange={(e) => setKeywordText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmKeyword()}
                />
                <button
                  type="button"
                  className="keyword-slot-confirm"
                  disabled={!keywordText.trim()}
                  onClick={confirmKeyword}
                >
                  Confirm
                </button>
              </>
            )}
          </div>
        </div>
        {keywordConfirmed && (
          <p className="keyword-hint">Drag the keyword into position, then submit.</p>
        )}
      </div>

      <div className="keyword-edit-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button
          type="button"
          className={`btn-primary ${keywordConfirmed && imageReady ? '' : 'btn-disabled'}`}
          disabled={!keywordConfirmed || !imageReady}
          onClick={handleSubmit}
        >
          Submit updated sketch
        </button>
      </div>
      </div>
    </div>
  );
}

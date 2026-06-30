import { useCallback, useEffect, useRef, useState } from 'react';
import type { SketchLabel } from '../types';
import { frameNumberToVideoTime, parseKeyframeFrameNumber } from '../utils/keyframeVideo';
import { KEYFRAME_LABEL_COLORS, exportCanvasWithLabels } from '../utils/sketchLabels';

const COLORS = ['#000000', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#ffffff'];
const KEYWORDS_PER_KEYFRAME = 3;

interface Props {
  keyframeIndex: number;
  allKeyframes: number[];
  allKeyframeUrls: string[];
  videoUrl?: string;
  currentIndex: number;
  autoSubmitSignal?: number;
  onSubmit: (data: string, labels: SketchLabel[]) => void;
  onLiveUpdate: (data: string, labels: SketchLabel[]) => void;
}

export default function DrawingCanvas({
  keyframeIndex,
  allKeyframes,
  allKeyframeUrls,
  videoUrl,
  currentIndex,
  autoSubmitSignal = 0,
  onSubmit,
  onLiveUpdate,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasDrawnRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [labels, setLabels] = useState<SketchLabel[]>([]);
  const [keywordInputs, setKeywordInputs] = useState(['', '', '']);
  const [confirmedSlots, setConfirmedSlots] = useState([false, false, false]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  const currentKeyframeUrl = allKeyframeUrls[keyframeIndex];
  const allKeywordsConfirmed = confirmedSlots.every(Boolean);
  const canFinish = hasDrawn && allKeywordsConfirmed;

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    if (width === 0 || height === 0) return;

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    const gridSize = 20;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    hasDrawnRef.current = false;
    setHasDrawn(false);
    setLabels([]);
    setKeywordInputs(['', '', '']);
    setConfirmedSlots([false, false, false]);
  }, []);

  const pushLiveUpdate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    onLiveUpdate(canvas.toDataURL('image/png'), labels);
  }, [labels, onLiveUpdate]);

  useEffect(() => {
    initCanvas();
    const raf = requestAnimationFrame(() => {
      if (canvasRef.current?.width === 0) initCanvas();
    });

    const canvas = canvasRef.current;
    if (!canvas) return () => cancelAnimationFrame(raf);

    const observer = new ResizeObserver(() => {
      if (canvas.width === 0 && canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
        initCanvas();
      }
    });
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [keyframeIndex, currentIndex, initCanvas]);

  useEffect(() => {
    pushLiveUpdate();
  }, [labels, pushLiveUpdate]);

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

  const markDrawn = () => {
    hasDrawnRef.current = true;
    setHasDrawn(true);
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
    markDrawn();
    pushLiveUpdate();
  };

  const endDraw = () => setIsDrawing(false);

  const confirmKeyword = (slotIndex: number) => {
    const text = keywordInputs[slotIndex].trim();
    if (!text || confirmedSlots[slotIndex]) return;

    const tagColor = KEYFRAME_LABEL_COLORS[slotIndex];

    const newLabel: SketchLabel = {
      id: `label-${Date.now()}-${slotIndex}`,
      text,
      x: 6 + slotIndex * 12,
      y: 6 + slotIndex * 10,
      color: tagColor,
    };

    setLabels((prev) => [...prev, newLabel]);
    setConfirmedSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = true;
      return next;
    });
    setKeywordInputs((prev) => {
      const next = [...prev];
      next[slotIndex] = '';
      return next;
    });
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

    setLabels((prev) =>
      prev.map((l) =>
        l.id === draggingId
          ? { ...l, x: Math.max(0, Math.min(92, x)), y: Math.max(0, Math.min(92, y)) }
          : l
      )
    );
  };

  const endLabelDrag = () => {
    if (draggingId) {
      setDraggingId(null);
      pushLiveUpdate();
    }
  };

  const handleSubmit = () => {
    if (!canFinish) return;
    submitSketch();
  };

  const submitSketch = () => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const data = exportCanvasWithLabels(canvas, labels);
    onSubmit(data, labels);
  };

  useEffect(() => {
    if (autoSubmitSignal > 0) {
      submitSketch();
    }
  }, [autoSubmitSignal]);

  return (
    <div className="drawing-layout">
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
                className={`reference-thumb ${i === currentIndex ? 'active' : ''} ${i < currentIndex ? 'done' : ''}`}
              >
                {i < currentIndex && <span className="kf-check">✓</span>}
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

      <div className="draw-panel">
        <h3>Drawing Canvas</h3>
        <div
          ref={wrapperRef}
          className="canvas-wrapper"
          onMouseMove={moveLabelDrag}
          onMouseUp={endLabelDrag}
          onMouseLeave={endLabelDrag}
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
          {labels.map((label) => (
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
          <button className={`tool-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')}>✏️</button>
          <button className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')}>🧽</button>
          <div className="line-widths">
            <button className={`lw-btn ${lineWidth === 2 ? 'active' : ''}`} onClick={() => setLineWidth(2)}>─</button>
            <button className={`lw-btn ${lineWidth === 5 ? 'active' : ''}`} onClick={() => setLineWidth(5)}>━</button>
          </div>
          <div className="color-palette">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`color-swatch ${color === c ? 'selected' : ''}`}
                style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #ccc' : 'none' }}
                onClick={() => { setColor(c); setTool('pen'); }}
              />
            ))}
          </div>
        </div>

        <div className="keyword-inputs-section">
          <p className="keyword-section-title">
            Keywords for keyframe #{keyframeIndex + 1} (3 keywords — confirm each, then drag onto sketch)
          </p>
          <div className="keyword-inputs-row">
            {Array.from({ length: KEYWORDS_PER_KEYFRAME }, (_, slotIndex) => {
              const tagColor = KEYFRAME_LABEL_COLORS[slotIndex];
              const isConfirmed = confirmedSlots[slotIndex];
              return (
                <div
                  key={slotIndex}
                  className={`keyword-slot active ${isConfirmed ? 'confirmed' : ''}`}
                  style={{ backgroundColor: tagColor }}
                >
                  <span className="keyword-slot-label">Keyword {slotIndex + 1}</span>
                  {isConfirmed ? (
                    <span className="keyword-confirmed-text">Placed on sketch — drag to reposition</span>
                  ) : (
                    <>
                      <input
                        type="text"
                        className="keyword-slot-input"
                        placeholder="Enter keyword"
                        value={keywordInputs[slotIndex]}
                        onChange={(e) => {
                          const next = [...keywordInputs];
                          next[slotIndex] = e.target.value;
                          setKeywordInputs(next);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && confirmKeyword(slotIndex)}
                      />
                      <button
                        className="keyword-slot-confirm"
                        disabled={!keywordInputs[slotIndex].trim()}
                        onClick={() => confirmKeyword(slotIndex)}
                      >
                        Confirm
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {!canFinish && (
            <p className="keyword-hint">
              {!hasDrawn && 'Draw on the canvas. '}
              {!allKeywordsConfirmed && 'Confirm all 3 keywords to continue.'}
            </p>
          )}
        </div>

        <div className="page-footer">
          <button
            className={`btn-primary ${canFinish ? '' : 'btn-disabled'}`}
            disabled={!canFinish}
            onClick={handleSubmit}
          >
            Finish Drawing, Next
          </button>
        </div>
      </div>
    </div>
  );
}

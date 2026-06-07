import { useCallback, useEffect, useRef, useState } from 'react';

const COLORS = ['#000000', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#ffffff'];

interface Props {
  keyframeIndex: number;
  allKeyframes: number[];
  allKeyframeUrls: string[];
  currentIndex: number;
  onSubmit: (data: string) => void;
  onLiveUpdate: (data: string) => void;
}

export default function DrawingCanvas({
  keyframeIndex,
  allKeyframes,
  allKeyframeUrls,
  currentIndex,
  onSubmit,
  onLiveUpdate,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

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

    setHasDrawn(false);
  }, [keyframeIndex, currentIndex]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
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
    setIsDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = getCtx();
    if (!ctx) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPos.current = pos;
    setHasDrawn(true);

    const canvas = canvasRef.current;
    if (canvas) {
      const data = canvas.toDataURL('image/png');
      onLiveUpdate(data);
    }
  };

  const endDraw = () => setIsDrawing(false);

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSubmit(canvas.toDataURL('image/png'));
  };

  return (
    <div className="drawing-layout">
      <div className="keyframe-panel">
        <h3>Current Keyframe</h3>
        <div className="keyframe-stack">
          {allKeyframes.map((kfIdx, i) => (
            <div
              key={kfIdx}
              className={`keyframe-thumb ${i === currentIndex ? 'active' : 'inactive'}`}
            >
              {i <= currentIndex && <span className="kf-check">✓</span>}
              <img src={allKeyframeUrls[kfIdx]} alt={`Keyframe ${kfIdx + 1}`} />
              <span className="keyframe-label">Keyframe #{kfIdx + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="canvas-panel">
        <h3>Current Keyframe</h3>
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
        <div className="page-footer">
          <button
            className={`btn-primary ${hasDrawn ? '' : 'btn-disabled'}`}
            disabled={!hasDrawn}
            onClick={handleSubmit}
          >
            Finish Drawing, Next
          </button>
        </div>
      </div>
    </div>
  );
}

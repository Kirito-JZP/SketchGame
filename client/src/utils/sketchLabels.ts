import type { SketchLabel } from '../types';

/** Three fixed colors — one per keyword slot; matches keyword inputs and on-canvas tags */
export const KEYFRAME_LABEL_COLORS = ['#a8e6cf', '#ffb3ba', '#ffd3b6'];

export const LABEL_COLORS = KEYFRAME_LABEL_COLORS;

export function getLabelBounds(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number
) {
  const padding = 8;
  ctx.font = 'bold 14px sans-serif';
  const metrics = ctx.measureText(text);
  return {
    x: x - 4,
    y: y - 4,
    width: metrics.width + padding * 2 + 8,
    height: 24 + 8,
  };
}

export function eraseLabelFromCanvas(
  canvas: HTMLCanvasElement,
  label: SketchLabel
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const x = (label.x / 100) * canvas.width;
  const y = (label.y / 100) * canvas.height;
  const bounds = getLabelBounds(ctx, label.text, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
}

export function drawLabelOnCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string
) {
  const padding = 8;
  ctx.font = 'bold 14px sans-serif';
  const metrics = ctx.measureText(text);
  const w = metrics.width + padding * 2;
  const h = 24;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();

  ctx.fillStyle = '#111';
  ctx.fillText(text, x + padding, y + 17);
}

export function exportCanvasWithLabels(
  canvas: HTMLCanvasElement,
  labels: SketchLabel[]
): string {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  ctx.drawImage(canvas, 0, 0);
  labels.forEach((label) => {
    const x = (label.x / 100) * canvas.width;
    const y = (label.y / 100) * canvas.height;
    drawLabelOnCanvas(ctx, label.text, x, y, label.color);
  });

  return exportCanvas.toDataURL('image/png');
}

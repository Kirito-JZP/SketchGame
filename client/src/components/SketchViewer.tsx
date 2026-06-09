import type { SketchLabel } from '../types';

interface Props {
  imageData: string | null;
  labels?: SketchLabel[];
  className?: string;
  placeholder?: string;
}

export default function SketchViewer({ imageData, labels = [], className = '', placeholder }: Props) {
  if (!imageData) {
    return (
      <div className={`sketch-viewer sketch-placeholder ${className}`}>
        {placeholder || 'Waiting for sketch...'}
      </div>
    );
  }

  return (
    <div className={`sketch-viewer ${className}`}>
      <img src={imageData} alt="Sketch" className="sketch-viewer-img" />
      {labels.map((label) => (
        <span
          key={label.id}
          className="sketch-label-tag"
          style={{
            left: `${label.x}%`,
            top: `${label.y}%`,
            backgroundColor: label.color,
          }}
        >
          {label.text}
        </span>
      ))}
    </div>
  );
}

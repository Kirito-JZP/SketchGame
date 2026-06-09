import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLIPS_CANDIDATES = [
  path.join(__dirname, '..', 'clips'),
  path.join(__dirname, '..', 'Clips'),
];

export const CLIPS_DIR = CLIPS_CANDIDATES.find((dir) => fs.existsSync(dir)) ?? CLIPS_CANDIDATES[0];

function isVideoFile(name) {
  return /\.(mp4|webm|mov)$/i.test(name);
}

export function resolveClipFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath).replace(/^\/+/, '');
  const normalized = path.normalize(decoded);
  if (normalized.includes('..')) return null;

  const filePath = path.join(CLIPS_DIR, normalized);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;

  return filePath;
}

export function streamClipFile(req, res) {
  const relativePath = req.path.replace(/^\/+/, '');
  const filePath = resolveClipFilePath(relativePath);

  if (!filePath) {
    res.status(404).end('Clip not found');
    return;
  }

  const stat = fs.statSync(filePath);
  if (stat.size < 1024 && isVideoFile(filePath)) {
    res.status(503).json({
      error: 'Video file missing or not downloaded. Run: git lfs pull',
    });
    return;
  }

  const contentType = isVideoFile(filePath) ? 'video/mp4' : 'application/octet-stream';
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    if (start >= stat.size || end >= stat.size) {
      res.status(416).end();
      return;
    }
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Length': stat.size,
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
  });
  fs.createReadStream(filePath).pipe(res);
}

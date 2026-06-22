import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STORAGE_DIR = path.join(__dirname, '..', 'storage');

export function parseMovieNameFromVideoUrl(videoUrl) {
  const filename = decodeURIComponent(videoUrl.split('/').pop()?.split('?')[0] ?? '');
  const baseName = filename.replace(/\.[^.]+$/, '');
  return baseName.replace(/_/g, '');
}

export function parseKeyframeFrameNumber(keyframeUrl) {
  const filename = decodeURIComponent(keyframeUrl.split('/').pop()?.split('?')[0] ?? '');
  const match = filename.match(/^(\d+)\./);
  return match ? parseInt(match[1], 10) : null;
}

function dataUrlToBuffer(dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

function formatAverageScore(ratings) {
  if (!ratings.length) return '0.0';
  const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  return (Math.round(avg * 10) / 10).toFixed(1);
}

function buildSketchFilename(movieName, frameNumber, totalGuessers, correctGuessers, averageScore) {
  return `${movieName}_${frameNumber}_${totalGuessers}_${correctGuessers}_${averageScore}.png`;
}

export function saveRoundSketches(room) {
  if (!room.clip?.videoUrl || !room.clip.keyframes?.length) return;

  fs.mkdirSync(STORAGE_DIR, { recursive: true });

  const movieName = parseMovieNameFromVideoUrl(room.clip.videoUrl);
  const guessers = room.players.filter((p) => p.role === 'guesser');
  const totalGuessers = guessers.length;
  const correctGuessers = guessers.filter((p) => room.guesses[p.id]?.correct).length;

  room.sketches.forEach((sketch, i) => {
    if (!sketch.data) return;

    const keyframeIndex = room.selectedKeyframes[i];
    const keyframeUrl = room.clip.keyframes[keyframeIndex];
    const frameNumber = keyframeUrl
      ? parseKeyframeFrameNumber(keyframeUrl) ?? keyframeIndex + 1
      : i + 1;

    const averageScore = formatAverageScore(sketch.ratings);
    const filename = buildSketchFilename(
      movieName,
      frameNumber,
      totalGuessers,
      correctGuessers,
      averageScore
    );

    const filePath = path.join(STORAGE_DIR, filename);
    fs.writeFileSync(filePath, dataUrlToBuffer(sketch.data));
  });
}

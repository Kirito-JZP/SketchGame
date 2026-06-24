import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CLIPS_DIR = path.join(__dirname, '..', 'clips');

export const CATEGORIES = [
  { id: 'action', folder: 'Action', label: 'Action', position: 'top-left' },
  { id: 'heavy-composition', folder: 'Heavy Composition', label: 'Heavy Composition', position: 'top-right' },
  { id: 'impressionistic', folder: 'Impressionistic', label: 'Impressionistic', position: 'middle-right' },
  { id: 'long-take', folder: 'Long Take', label: 'Long Take', position: 'bottom-right' },
  { id: 'spatial-transformation', folder: 'Spatial Transformation', label: 'Spatial Transformation', position: 'bottom-left' },
];

function isVideoFile(name) {
  return /\.(mp4|webm|mov)$/i.test(name);
}

function isImageFile(name) {
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(name);
}

function loadBonusKeywords(clipPath, keyframeCount) {
  const keywordsPath = path.join(clipPath, 'keywords.json');
  if (!fs.existsSync(keywordsPath)) {
    return Array.from({ length: keyframeCount }, (_, i) => `hint-${i + 1}`);
  }

  try {
    const data = JSON.parse(fs.readFileSync(keywordsPath, 'utf8'));
    if (Array.isArray(data.bonusKeywords)) {
      return Array.from({ length: keyframeCount }, (_, i) => data.bonusKeywords[i] ?? `hint-${i + 1}`);
    }
    if (Array.isArray(data)) {
      return Array.from({ length: keyframeCount }, (_, i) => data[i] ?? `hint-${i + 1}`);
    }
    return Array.from({ length: keyframeCount }, (_, i) => data[String(i)] ?? data[i] ?? `hint-${i + 1}`);
  } catch {
    return Array.from({ length: keyframeCount }, (_, i) => `hint-${i + 1}`);
  }
}

export function getCategoryStatus() {
  return CATEGORIES.map((cat) => {
    const folderPath = path.join(CLIPS_DIR, cat.folder);
    if (!fs.existsSync(folderPath)) {
      return { ...cat, hasContent: false, clipCount: 0 };
    }
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    const clipFolders = entries.filter((e) => e.isDirectory());
    const validClips = clipFolders.filter((clipDir) => {
      const clipPath = path.join(folderPath, clipDir.name);
      const files = fs.readdirSync(clipPath);
      const hasVideo = files.some(isVideoFile);
      const keyframesPath = path.join(clipPath, 'keyframes');
      const hasKeyframes =
        fs.existsSync(keyframesPath) &&
        fs.readdirSync(keyframesPath).some(isImageFile);
      return hasVideo && hasKeyframes;
    });
    return { ...cat, hasContent: validClips.length > 0, clipCount: validClips.length };
  });
}

export function getClipsForCategory(categoryFolder) {
  const folderPath = path.join(CLIPS_DIR, categoryFolder);
  if (!fs.existsSync(folderPath)) return [];

  return fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((clipDir) => {
      const clipPath = path.join(folderPath, clipDir.name);
      const files = fs.readdirSync(clipPath);
      const videoFile = files.find(isVideoFile);
      const keyframesPath = path.join(clipPath, 'keyframes');
      const keyframes = fs.existsSync(keyframesPath)
        ? fs.readdirSync(keyframesPath).filter(isImageFile).sort()
        : [];

      if (!videoFile || keyframes.length === 0) return null;

      const keyframeUrls = keyframes.map(
        (kf) =>
          `/clips/${encodeURIComponent(categoryFolder)}/${encodeURIComponent(clipDir.name)}/keyframes/${encodeURIComponent(kf)}`
      );

      return {
        id: clipDir.name,
        title: clipDir.name.replace(/-Clip-\d+$/, '').replace(/-/g, ' '),
        folderName: clipDir.name,
        videoUrl: `/clips/${encodeURIComponent(categoryFolder)}/${encodeURIComponent(clipDir.name)}/${encodeURIComponent(videoFile)}`,
        thumbnail: keyframeUrls[0],
        keyframes: keyframeUrls,
        bonusKeywords: loadBonusKeywords(clipPath, keyframes.length),
      };
    })
    .filter(Boolean);
}

export function pickRandomClip(categoryFolder, excludeId = null) {
  const clips = getClipsForCategory(categoryFolder);
  const pool = excludeId ? clips.filter((c) => c.id !== excludeId) : clips;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickRandomClipFromAnyCategory(excludeId = null) {
  const all = [];
  for (const cat of CATEGORIES) {
    const clips = getClipsForCategory(cat.folder);
    clips.forEach((clip) => {
      all.push({ clip, categoryFolder: cat.folder, categoryId: cat.id });
    });
  }
  const pool = excludeId ? all.filter((entry) => entry.clip.id !== excludeId) : all;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function hasAnyClips() {
  return CATEGORIES.some((cat) => getClipsForCategory(cat.folder).length > 0);
}

export function pickGuessOptions(categoryFolder, correctClipId) {
  const clips = getClipsForCategory(categoryFolder);
  const correct = clips.find((c) => c.id === correctClipId);
  if (!correct) return [];

  const others = clips.filter((c) => c.id !== correctClipId);
  const shuffled = [...others].sort(() => Math.random() - 0.5);
  const wrongOptions = shuffled.slice(0, 3);

  const options = [
    { id: correct.id, title: correct.title, videoUrl: correct.videoUrl, isCorrect: true },
    ...wrongOptions.map((c) => ({ id: c.id, title: c.title, videoUrl: c.videoUrl, isCorrect: false })),
  ];

  return options.sort(() => Math.random() - 0.5);
}

/** Source clip frame rate used to convert keyframe frame numbers to video time. */
export const VIDEO_FPS = 24;

export function parseKeyframeFrameNumber(url: string): number | null {
  const filename = url.split('/').pop()?.split('?')[0] ?? '';
  const match = filename.match(/^(\d+)\./);
  return match ? parseInt(match[1], 10) : null;
}

export function frameNumberToVideoTime(frameNumber: number, fps = VIDEO_FPS): number {
  return frameNumber / fps;
}

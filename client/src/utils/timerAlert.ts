import { useEffect, useRef } from 'react';

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function playTimerWarningBeep() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
  } catch {
    // Audio not available
  }
}

export function useTimerWarningAlert(active: boolean) {
  const prevSeconds = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      prevSeconds.current = null;
    }
  }, [active]);

  return (secondsLeft: number) => {
    if (!active || secondsLeft > 3 || secondsLeft <= 0) return;
    if (prevSeconds.current === secondsLeft) return;
    prevSeconds.current = secondsLeft;
    playTimerWarningBeep();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(80);
    }
  };
}

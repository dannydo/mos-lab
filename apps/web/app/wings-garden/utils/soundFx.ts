'use client';

let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const ctx = sharedAudioCtx ?? new Ctx();
  sharedAudioCtx = ctx;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
  return ctx;
}

function playTone(freq: number, durationSec: number, type: OscillatorType, delaySec: number, gainPeak: number): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const start = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + durationSec + 0.03);
}

export function playGardenFx(kind: 'scan' | 'harvest' | 'craft' | 'chest' | 'error', muted: boolean): void {
  if (muted) return;
  try {
    if (kind === 'scan') {
      playTone(660, 0.12, 'triangle', 0, 0.14);
      playTone(880, 0.16, 'triangle', 0.08, 0.14);
    } else if (kind === 'harvest') {
      playTone(587.33, 0.12, 'sine', 0, 0.16);
      playTone(783.99, 0.14, 'sine', 0.08, 0.16);
      playTone(1046.5, 0.24, 'triangle', 0.16, 0.18);
    } else if (kind === 'craft') {
      playTone(523.25, 0.16, 'triangle', 0, 0.16);
      playTone(659.25, 0.16, 'triangle', 0.1, 0.16);
      playTone(783.99, 0.18, 'triangle', 0.2, 0.16);
      playTone(1046.5, 0.34, 'sine', 0.3, 0.2);
    } else if (kind === 'chest') {
      playTone(440, 0.12, 'triangle', 0, 0.15);
      playTone(659.25, 0.12, 'triangle', 0.1, 0.15);
      playTone(880, 0.18, 'sine', 0.2, 0.18);
      playTone(1174.66, 0.32, 'sine', 0.32, 0.18);
    } else {
      playTone(220, 0.18, 'sawtooth', 0, 0.08);
    }
  } catch {
    // Non-blocking fallback when browser audio is blocked prior to user gesture
  }
}

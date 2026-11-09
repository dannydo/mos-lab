'use client';

type SafeAudioContext = AudioContext;

function createAudioContext(): SafeAudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    return new AudioCtx();
  } catch {
    return null;
  }
}

class ChatCallAudioController {
  private ctx: SafeAudioContext | null = null;
  private ringLoopTimer: ReturnType<typeof setInterval> | null = null;

  private ensureContext(): SafeAudioContext | null {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = createAudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Ignore autoplay policy restrictions until user interaction
      });
    }
    return this.ctx;
  }

  public stopRingLoop(): void {
    if (this.ringLoopTimer) {
      clearInterval(this.ringLoopTimer);
      this.ringLoopTimer = null;
    }
  }

  public startIncomingRingtone(): void {
    this.stopRingLoop();
    const playPattern = () => {
      this.playToneBurst(523.25, 659.25, 0, 0.18, 0.12);
      this.playToneBurst(523.25, 659.25, 0.24, 0.22, 0.12);
    };
    playPattern();
    this.ringLoopTimer = setInterval(playPattern, 2400);
  }

  public startOutgoingRingback(): void {
    this.stopRingLoop();
    const playPattern = () => {
      this.playToneBurst(425, 450, 0, 0.65, 0.07);
    };
    playPattern();
    this.ringLoopTimer = setInterval(playPattern, 2800);
  }

  public playConnectedChime(): void {
    this.stopRingLoop();
    this.playToneBurst(523.25, 0, 0, 0.1, 0.09);
    this.playToneBurst(659.25, 0, 0.11, 0.16, 0.1);
  }

  public playEndedTone(): void {
    this.stopRingLoop();
    this.playToneBurst(480, 0, 0, 0.12, 0.08);
    this.playToneBurst(360, 0, 0.14, 0.18, 0.08);
  }

  private playToneBurst(freq1: number, freq2: number, delaySec: number, durationSec: number, gainPeak: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const startTime = ctx.currentTime + delaySec;
      const endTime = startTime + durationSec;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(gainPeak, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);
      gainNode.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq1, startTime);
      osc1.connect(gainNode);
      osc1.start(startTime);
      osc1.stop(endTime);

      if (freq2 > 0) {
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq2, startTime);
        osc2.connect(gainNode);
        osc2.start(startTime);
        osc2.stop(endTime);
      }
    } catch {
      // Ignore audio synthesis errors in headless/restricted environments
    }
  }
}

export const chatCallAudio = new ChatCallAudioController();

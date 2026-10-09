'use client';

import React, { useEffect, useRef, useCallback } from 'react';

export interface RealisticCardFireworksProps {
  active: boolean;
  isFrenzy?: boolean;
  soundEnabled?: boolean;
  volume?: number;
  theme?: 'emerald' | 'amber' | 'blue' | 'gold';
  cardLabel?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  decay: number;
  history: { x: number; y: number }[];
  size: number;
  flicker: boolean;
}

interface Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  color: string;
  trail: { x: number; y: number; alpha: number }[];
}

// Luminous color palettes for realistic fireworks
const PALETTES: Record<string, string[]> = {
  emerald: [
    'rgb(16, 185, 129)', // Emerald 500
    'rgb(52, 211, 153)', // Emerald 400
    'rgb(110, 231, 183)', // Emerald 300
    'rgb(5, 150, 105)', // Emerald 600
    'rgb(251, 191, 36)', // Amber 400 (gold accents)
    'rgb(255, 255, 255)', // Diamond white
    'rgb(56, 189, 248)', // Sky 400
  ],
  amber: [
    'rgb(251, 191, 36)', // Amber 400
    'rgb(245, 158, 11)', // Amber 500
    'rgb(252, 211, 77)', // Amber 300
    'rgb(217, 119, 6)', // Amber 600
    'rgb(255, 255, 255)', // Diamond white
    'rgb(249, 115, 22)', // Orange 500
  ],
  blue: [
    'rgb(56, 189, 248)', // Sky 400
    'rgb(96, 165, 250)', // Blue 400
    'rgb(129, 140, 248)', // Indigo 400
    'rgb(255, 255, 255)', // Diamond white
    'rgb(251, 191, 36)', // Gold spark
    'rgb(45, 212, 191)', // Teal 400
  ],
  gold: [
    'rgb(254, 240, 138)', // Gold light
    'rgb(251, 191, 36)', // Gold standard
    'rgb(245, 158, 11)', // Amber
    'rgb(255, 255, 255)', // Sparkle white
    'rgb(254, 215, 170)', // Champagne
  ],
};

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioContext = new AudioCtx();
    }
  }
  if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

// Synthesizes a realistic physical firework launch whoosh
function playLaunchSound(volume = 0.8) {
  const ctx = getAudioContext();
  if (!ctx || volume <= 0) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    // Frequency ramps up like a rocket whistling upward (extended for graceful flight)
    osc.frequency.setValueAtTime(260 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(800 + Math.random() * 200, now + 0.65);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.Q.setValueAtTime(2.0, now);

    const masterVol = Math.min(1, Math.max(0, volume)) * 0.15;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(masterVol, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.75);
  } catch {}
}

// Synthesizes a realistic deep bass boom with crackle pops
function playExplosionSound(volume = 0.8) {
  const ctx = getAudioContext();
  if (!ctx || volume <= 0) return;

  try {
    const now = ctx.currentTime;
    const masterVol = Math.min(1, Math.max(0, volume)) * 0.28;

    // 1. Bass thump/boom using shaped noise buffer
    const bufferSize = Math.floor(ctx.sampleRate * 0.55);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + 0.45);
    filter.Q.setValueAtTime(4.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(masterVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.52);

    // 2. Delayed crackle pops (3-5 tiny sparkling snaps)
    const crackleCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < crackleCount; i++) {
      const delay = 0.12 + Math.random() * 0.28;
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();
      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(1400 + Math.random() * 800, now + delay);
      popGain.gain.setValueAtTime(masterVol * 0.25, now + delay);
      popGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.04);

      popOsc.connect(popGain);
      popGain.connect(ctx.destination);
      popOsc.start(now + delay);
      popOsc.stop(now + delay + 0.05);
    }
  } catch {}
}

export const RealisticCardFireworks: React.FC<RealisticCardFireworksProps> = ({
  active,
  isFrenzy = false,
  soundEnabled = true,
  volume = 0.8,
  theme = 'emerald',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const launchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sound ref to access latest settings inside animation loop
  const soundSettingsRef = useRef({ soundEnabled, volume });
  useEffect(() => {
    soundSettingsRef.current = { soundEnabled, volume };
  }, [soundEnabled, volume]);

  const themeColors = PALETTES[theme] || PALETTES.emerald;

  // Launch rocket helper
  const createRocket = useCallback(
    (width: number, height: number): Rocket => {
      const x = width * (0.2 + Math.random() * 0.6);
      const targetY = height * (0.15 + Math.random() * 0.35); // Explode in top 15-50% of card
      const distance = height - targetY;
      // Majestic, graceful launch at 30% speed of previous (flies steadily upward)
      const vy = (-Math.sqrt(distance * 0.95) - 5.5) * 0.3;
      const vx = (Math.random() - 0.5) * 1.8 * 0.3;
      const color = themeColors[Math.floor(Math.random() * themeColors.length)];

      if (soundSettingsRef.current.soundEnabled) {
        playLaunchSound(soundSettingsRef.current.volume);
      }

      return {
        x,
        y: height,
        vx,
        vy,
        targetY,
        color,
        trail: [],
      };
    },
    [themeColors]
  );

  // Explode rocket into particle burst
  const explodeRocket = useCallback(
    (x: number, y: number): Particle[] => {
      if (soundSettingsRef.current.soundEnabled) {
        playExplosionSound(soundSettingsRef.current.volume);
      }

      const particles: Particle[] = [];
      const particleCount = 36 + Math.floor(Math.random() * 16); // 36-52 crisp sparks

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        // Gentle slow explosion burst at 30% speed
        const speed = (Math.pow(Math.random(), 0.45) * 8 + 2.5) * 0.3;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const color = themeColors[Math.floor(Math.random() * themeColors.length)];
        const maxLife = 38 + Math.floor(Math.random() * 20); // Fades away completely in ~0.65s - 1.0s

        particles.push({
          x,
          y,
          vx,
          vy,
          color,
          alpha: 1,
          life: 0,
          maxLife,
          decay: 1 / maxLife,
          history: [{ x, y }],
          size: Math.random() * 1.8 + 1.0,
          flicker: Math.random() > 0.35,
        });
      }
      return particles;
    },
    [themeColors]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const getDimensions = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(rect.width) || container.clientWidth || 360;
      const h = Math.round(rect.height) || container.clientHeight || 180;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      return { w, h, dpr };
    };

    const updateSize = () => {
      getDimensions();
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);

    const rockets: Rocket[] = [];
    let particles: Particle[] = [];

    const launchSafely = () => {
      const { w, h } = getDimensions();
      if (w > 30 && h > 30) {
        rockets.push(createRocket(w, h));
        return true;
      }
      return false;
    };

    let initialTimer: NodeJS.Timeout | null = null;
    let frenzyBurstTimer: NodeJS.Timeout | null = null;

    // Launcher cadence with breathing room between rockets
    const scheduleNextLaunch = () => {
      if (!active) return;
      const delay = isFrenzy
        ? 800 + Math.random() * 600 // Frenzy burst: launches every 0.8s - 1.4s
        : 3500 + Math.random() * 2500; // Ambient mode: launches every 3.5s - 6.0s (clear & calm)

      launchTimerRef.current = setTimeout(() => {
        launchSafely();
        if (isFrenzy && Math.random() > 0.4) {
          frenzyBurstTimer = setTimeout(() => {
            launchSafely();
          }, 240);
        }
        scheduleNextLaunch();
      }, delay);
    };

    if (active) {
      initialTimer = setTimeout(() => {
        launchSafely();
      }, 50);
      scheduleNextLaunch();
    }

    const render = () => {
      const { w, h, dpr } = getDimensions();

      // 100% Guaranteed Full Bitmap Clear on every frame (zero trail accumulation)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 1. UPDATE & DRAW ROCKETS
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.trail.push({ x: r.x, y: r.y, alpha: 1 });
        if (r.trail.length > 5) r.trail.shift();

        // Draw rocket trail (fast additive rendering without shadowBlur)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let t = 0; t < r.trail.length; t++) {
          const pt = r.trail[t];
          pt.alpha *= 0.72;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1.5 * (t / r.trail.length) + 0.4, 0, Math.PI * 2);
          ctx.fillStyle = r.color;
          ctx.globalAlpha = Math.max(0, pt.alpha * 0.85);
          ctx.fill();
        }

        // Draw glowing rocket spark head
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.globalAlpha = 1;
        ctx.fill();
        ctx.restore();

        // Move rocket
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.066; // 30% of 0.22 rocket gravity deceleration

        // Check if rocket reached apogee / detonation point
        if (r.y <= r.targetY || r.vy >= -0.3 || r.y < -20) {
          const newSparks = explodeRocket(r.x, r.y);
          particles = particles.concat(newSparks);
          rockets.splice(i, 1);
        }
      }

      // 2. UPDATE & DRAW PARTICLES WITH LIGHT STREAKS
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;

        // Store trail history
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 4) p.history.shift();

        // Floaty physics (scaled to 30% velocity & gravity)
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.vy += 0.066;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        // Sparkling twinkle decay
        let drawAlpha = Math.max(0, Math.min(1, p.alpha));
        if (p.flicker && p.life > p.maxLife * 0.25) {
          if (Math.random() < 0.25) drawAlpha *= 0.3;
        }

        const sizeProgress = Math.max(0, 1 - p.life / p.maxLife);

        // Draw streak tail
        if (p.history.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(p.history[0].x, p.history[0].y);
          for (let h = 1; h < p.history.length; h++) {
            ctx.lineTo(p.history[h].x, p.history[h].y);
          }
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(0.6, p.size * sizeProgress * 0.8);
          ctx.globalAlpha = Math.max(0, drawAlpha * 0.8);
          ctx.stroke();
        }

        // Draw particle head (bright luminous spark)
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size * 0.6 * sizeProgress), 0, Math.PI * 2);
        ctx.fillStyle = p.life < 5 ? 'rgb(255, 255, 255)' : p.color;
        ctx.globalAlpha = Math.max(0, drawAlpha);
        ctx.fill();
      }

      ctx.restore();

      // Keep rendering as long as there are rockets, particles, or active state
      if (active || rockets.length > 0 || particles.length > 0) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (initialTimer) clearTimeout(initialTimer);
      if (frenzyBurstTimer) clearTimeout(frenzyBurstTimer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (launchTimerRef.current) clearTimeout(launchTimerRef.current);
      resizeObserver.disconnect();
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [active, isFrenzy, createRocket, explodeRocket]);

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-20"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

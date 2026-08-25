'use client';

import React from 'react';
import { Volume2 } from 'lucide-react';

const FIREWORK_COLORS = ['#22d3ee', '#60a5fa', '#a78bfa', '#fbbf24', '#fb7185', '#34d399', '#ffffff'];

interface CelebrationParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  kind: 'spark' | 'confetti';
}

export interface AcademyWorkshopPodiumCelebrationProps {
  active: boolean;
  celebrationKey: string;
}

let sharedVictoryAudioContext: AudioContext | null = null;

function getVictoryAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  sharedVictoryAudioContext ||= new AudioContextClass();
  return sharedVictoryAudioContext;
}

async function resumeVictoryAudio() {
  const audioContext = getVictoryAudioContext();
  if (!audioContext) return null;
  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch {
      return null;
    }
  }
  return audioContext.state === 'running' ? audioContext : null;
}

function playVictoryFanfare(audioContext: AudioContext) {
  const startAt = audioContext.currentTime + 0.03;
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.0001, startAt);
  master.gain.exponentialRampToValueAtTime(0.34, startAt + 0.05);
  master.gain.setValueAtTime(0.34, startAt + 1.55);
  master.gain.exponentialRampToValueAtTime(0.0001, startAt + 2.45);
  master.connect(audioContext.destination);

  const notes = [
    { frequency: 523.25, offset: 0, duration: 0.42 },
    { frequency: 659.25, offset: 0.16, duration: 0.42 },
    { frequency: 783.99, offset: 0.32, duration: 0.5 },
    { frequency: 1046.5, offset: 0.52, duration: 0.95 },
    { frequency: 659.25, offset: 0.88, duration: 1.05 },
    { frequency: 783.99, offset: 0.88, duration: 1.05 },
    { frequency: 1046.5, offset: 0.88, duration: 1.05 },
  ];

  notes.forEach(({ frequency, offset, duration }, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const noteAt = startAt + offset;
    oscillator.type = index < 4 ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, noteAt);
    gain.gain.setValueAtTime(0.0001, noteAt);
    gain.gain.exponentialRampToValueAtTime(index < 4 ? 0.3 : 0.17, noteAt + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteAt + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(noteAt);
    oscillator.stop(noteAt + duration + 0.05);
  });

  const drum = audioContext.createOscillator();
  const drumGain = audioContext.createGain();
  drum.type = 'sine';
  drum.frequency.setValueAtTime(150, startAt);
  drum.frequency.exponentialRampToValueAtTime(48, startAt + 0.34);
  drumGain.gain.setValueAtTime(0.5, startAt);
  drumGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.36);
  drum.connect(drumGain);
  drumGain.connect(master);
  drum.start(startAt);
  drum.stop(startAt + 0.4);
}

function addFireworkBurst(particles: CelebrationParticle[], x: number, y: number, scale: number, strength = 1) {
  const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
  const count = Math.round(72 * strength);
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + (Math.random() - 0.5) * 0.12;
    const speed = (135 + Math.random() * 285) * scale * strength;
    const lifetime = 1.25 + Math.random() * 1.1;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: lifetime,
      maxLife: lifetime,
      size: (2.2 + Math.random() * 3.4) * scale,
      color: Math.random() > 0.18 ? color : '#ffffff',
      rotation: 0,
      spin: 0,
      kind: 'spark',
    });
  }
}

function addConfetti(particles: CelebrationParticle[], width: number, height: number, scale: number) {
  for (let index = 0; index < 180; index += 1) {
    const lifetime = 4.4 + Math.random() * 2.2;
    particles.push({
      x: Math.random() * width,
      y: -Math.random() * height * 0.35,
      vx: (-65 + Math.random() * 130) * scale,
      vy: (80 + Math.random() * 160) * scale,
      life: lifetime,
      maxLife: lifetime,
      size: (5 + Math.random() * 7) * scale,
      color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
      rotation: Math.random() * Math.PI,
      spin: -4 + Math.random() * 8,
      kind: 'confetti',
    });
  }
}

export function AcademyWorkshopPodiumCelebration({ active, celebrationKey }: AcademyWorkshopPodiumCelebrationProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [needsAudioGesture, setNeedsAudioGesture] = React.useState(false);
  const [visualReplay, setVisualReplay] = React.useState(0);

  React.useEffect(() => {
    const unlock = () => {
      void resumeVictoryAudio();
    };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  React.useEffect(() => {
    if (!active) {
      setNeedsAudioGesture(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void resumeVictoryAudio().then((audioContext) => {
        if (cancelled) return;
        if (!audioContext) {
          setNeedsAudioGesture(true);
          return;
        }
        playVictoryFanfare(audioContext);
        setNeedsAudioGesture(false);
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, celebrationKey]);

  React.useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    let disposed = false;
    let animationFrame = 0;
    let lastFrameAt = performance.now();
    const timers: number[] = [];
    const particles: CelebrationParticle[] = [];
    const viewport = { width: 0, height: 0, scale: 1 };

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      viewport.width = window.innerWidth;
      viewport.height = window.innerHeight;
      viewport.scale = Math.max(0.9, Math.min(2.2, Math.min(viewport.width, viewport.height) / 900));
      canvas.width = Math.round(viewport.width * pixelRatio);
      canvas.height = Math.round(viewport.height * pixelRatio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const animate = (frameAt: number) => {
      if (disposed) return;
      const delta = Math.min(0.034, Math.max(0.001, (frameAt - lastFrameAt) / 1000));
      lastFrameAt = frameAt;
      context.clearRect(0, 0, viewport.width, viewport.height);
      context.globalCompositeOperation = 'lighter';

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.life -= delta;
        if (particle.life <= 0 || particle.y > viewport.height + 120) {
          particles.splice(index, 1);
          continue;
        }

        const alpha = Math.max(0, Math.min(1, particle.life / particle.maxLife));
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.rotation += particle.spin * delta;

        if (particle.kind === 'spark') {
          particle.vx *= Math.pow(0.986, delta * 60);
          particle.vy = particle.vy * Math.pow(0.986, delta * 60) + 155 * viewport.scale * delta;
          context.globalAlpha = alpha;
          context.strokeStyle = particle.color;
          context.lineWidth = particle.size;
          context.lineCap = 'round';
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(particle.x - particle.vx * 0.025, particle.y - particle.vy * 0.025);
          context.stroke();
        } else {
          particle.vy += 55 * viewport.scale * delta;
          particle.vx += Math.sin(frameAt / 420 + index) * 5 * delta;
          context.save();
          context.globalCompositeOperation = 'source-over';
          context.globalAlpha = Math.min(1, alpha * 1.5);
          context.translate(particle.x, particle.y);
          context.rotate(particle.rotation);
          context.fillStyle = particle.color;
          context.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.62);
          context.restore();
        }
      }

      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
      if (particles.length) animationFrame = window.requestAnimationFrame(animate);
    };

    const burstPlan = [
      { delay: 80, x: 0.16, y: 0.27, strength: 1.05 },
      { delay: 330, x: 0.82, y: 0.22, strength: 1.1 },
      { delay: 620, x: 0.5, y: 0.16, strength: 1.25 },
      { delay: 980, x: 0.28, y: 0.42, strength: 0.9 },
      { delay: 1240, x: 0.72, y: 0.4, strength: 0.95 },
      { delay: 1650, x: 0.12, y: 0.55, strength: 0.82 },
      { delay: 1880, x: 0.88, y: 0.5, strength: 0.85 },
      { delay: 2240, x: 0.5, y: 0.32, strength: 1.35 },
    ];

    resize();
    addConfetti(particles, viewport.width, viewport.height, viewport.scale);
    animationFrame = window.requestAnimationFrame(animate);
    burstPlan.forEach((burst) => {
      timers.push(
        window.setTimeout(() => {
          addFireworkBurst(
            particles,
            viewport.width * burst.x,
            viewport.height * burst.y,
            viewport.scale,
            burst.strength
          );
          if (!animationFrame) animationFrame = window.requestAnimationFrame(animate);
        }, burst.delay)
      );
    });
    window.addEventListener('resize', resize);

    return () => {
      disposed = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      context.clearRect(0, 0, viewport.width, viewport.height);
    };
  }, [active, celebrationKey, visualReplay]);

  const enableCelebrationAudio = React.useCallback(async () => {
    const audioContext = await resumeVictoryAudio();
    if (!audioContext) return;
    playVictoryFanfare(audioContext);
    setNeedsAudioGesture(false);
    setVisualReplay((value) => value + 1);
  }, []);

  if (!active) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-celebration="podium-fireworks"
        className="pointer-events-none fixed inset-0 z-30"
      />
      {needsAudioGesture ? (
        <button
          type="button"
          onClick={() => void enableCelebrationAudio()}
          className="fixed bottom-[4vh] right-[4vw] z-40 inline-flex min-h-12 items-center gap-[0.7vw] rounded-full border border-amber-200/35 bg-amber-400 px-[1.4vw] py-[1vh] text-[1vw] font-black text-slate-950 shadow-[0_0_40px_rgba(251,191,36,0.35)] transition hover:scale-105 hover:bg-amber-300"
        >
          <Volume2 className="h-[1.4vw] w-[1.4vw]" />
          Bật âm thanh ăn mừng
        </button>
      ) : null}
    </>
  );
}

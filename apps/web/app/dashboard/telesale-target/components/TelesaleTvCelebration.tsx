'use client';

import React, { useEffect, useRef } from 'react';

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  life: number;
  maxLife: number;
  history: { x: number; y: number }[];
}

const FIREWORK_SPARK_COLORS = [
  'rgb(251, 191, 36)', // Gold / Amber 400
  'rgb(245, 158, 11)', // Amber 500
  'rgb(255, 255, 255)', // Sparkle white core
  'rgb(52, 211, 153)', // Emerald 400
  'rgb(16, 185, 129)', // Emerald 500
  'rgb(254, 240, 138)', // Champagne light gold
];

export const TelesaleTvCelebration: React.FC<{ active: boolean; onComplete?: () => void }> = ({
  active,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const particles: SparkParticle[] = [];

    // Spawn 3-4 staggered firework burst centers across the screen (NO confetti)
    const burstCenters = [
      { x: width * 0.3, y: height * 0.35, delay: 0 },
      { x: width * 0.7, y: height * 0.38, delay: 6 },
      { x: width * 0.5, y: height * 0.25, delay: 12 },
    ];

    burstCenters.forEach((b) => {
      const sparkCount = 45;
      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.pow(Math.random(), 0.5) * 11 + 3.5;
        const maxLife = 35 + Math.floor(Math.random() * 25);
        particles.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 2.4 + 1.2,
          color: FIREWORK_SPARK_COLORS[Math.floor(Math.random() * FIREWORK_SPARK_COLORS.length)],
          alpha: 1,
          decay: 1 / maxLife,
          life: -b.delay, // Staggered explosion
          maxLife,
          history: [{ x: b.x, y: b.y }],
        });
      }
    });

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      let aliveCount = 0;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; // GPU luminous blending

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        if (p.life < 0) {
          aliveCount++;
          continue; // Waiting for delay
        }

        if (p.life < p.maxLife) {
          aliveCount++;
          p.history.push({ x: p.x, y: p.y });
          if (p.history.length > 4) p.history.shift();

          p.vx *= 0.955;
          p.vy *= 0.955;
          p.vy += 0.22; // Natural gravity
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;

          const drawAlpha = Math.max(0, p.alpha);
          const sizeProgress = 1 - p.life / p.maxLife;

          // Draw streak tail
          if (p.history.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(p.history[0].x, p.history[0].y);
            for (let h = 1; h < p.history.length; h++) {
              ctx.lineTo(p.history[h].x, p.history[h].y);
            }
            ctx.strokeStyle = p.color;
            ctx.lineWidth = Math.max(0.8, p.size * sizeProgress * 0.9);
            ctx.globalAlpha = drawAlpha * 0.85;
            ctx.stroke();
          }

          // Draw particle spark head (white core for early frames)
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.6, p.size * 0.7 * sizeProgress), 0, Math.PI * 2);
          ctx.fillStyle = p.life < 7 ? 'rgb(255, 255, 255)' : p.color;
          ctx.globalAlpha = drawAlpha;
          ctx.fill();
        }
      }

      ctx.restore();

      if (aliveCount > 0) {
        animationId = requestAnimationFrame(render);
      } else {
        onComplete?.();
      }
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      ctx.clearRect(0, 0, width, height);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return <canvas ref={canvasRef} className="fixed inset-0 z-[100] pointer-events-none w-full h-full" />;
};

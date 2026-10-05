'use client';

import React, { useEffect, useRef } from 'react';
import { ActiveCelebration } from '../hooks/useTelesaleTvLiveCelebration';
import { Sparkles, Trophy, Calendar, CheckCircle2, Volume2, Award, Flame } from 'lucide-react';

export interface TelesaleTvLiveCelebrationBannerProps {
  celebration: ActiveCelebration | null;
  isSpeaking?: boolean;
  isFadingOut?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  life: number;
  maxLife: number;
  wobble?: number;
  wobbleSpeed?: number;
  isSpark?: boolean;
}

const CONFETTI_BOOK_COLORS = [
  'rgb(96, 165, 250)', // blue-400
  'rgb(59, 130, 246)', // blue-500
  'rgb(147, 197, 253)', // blue-300
  'rgb(251, 191, 36)', // amber-400 (gold)
  'rgb(245, 158, 11)', // amber-500
  'rgb(255, 255, 255)', // crisp white
  'rgb(192, 132, 252)', // purple-400
];

const CONFETTI_DONE_COLORS = [
  'rgb(52, 211, 153)', // emerald-400
  'rgb(16, 185, 129)', // emerald-500
  'rgb(110, 231, 183)', // emerald-300
  'rgb(251, 191, 36)', // amber-400 (gold)
  'rgb(245, 158, 11)', // amber-500
  'rgb(255, 255, 255)', // crisp white
  'rgb(45, 212, 191)', // teal-400
];

const FIREWORK_COLORS = [
  'rgb(251, 191, 36)', // bright gold
  'rgb(245, 158, 11)', // warm amber
  'rgb(252, 211, 77)', // light gold
  'rgb(56, 189, 248)', // diamond cyan
  'rgb(52, 211, 153)', // emerald
  'rgb(244, 63, 94)', // ruby
  'rgb(255, 255, 255)', // white sparkle
];

// Canvas particle system supporting both Confetti and Fireworks
const CelebrationCanvas: React.FC<{ active: boolean; isMilestone: boolean; colorTheme: string }> = ({
  active,
  isMilestone,
  colorTheme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const particles: Particle[] = [];
    const colors = isMilestone
      ? FIREWORK_COLORS
      : colorTheme === 'emerald'
        ? CONFETTI_DONE_COLORS
        : CONFETTI_BOOK_COLORS;

    if (isMilestone) {
      // FIREWORKS MODE: Multiple staggered burst centers
      const burstCenters = [
        { x: width * 0.3, y: height * 0.32, delay: 0 },
        { x: width * 0.7, y: height * 0.36, delay: 18 },
        { x: width * 0.5, y: height * 0.22, delay: 35 },
        { x: width * 0.25, y: height * 0.45, delay: 55 },
        { x: width * 0.75, y: height * 0.45, delay: 70 },
      ];

      // Ambient twinkling stars
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.8,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.4 - 0.1,
          size: Math.random() * 3 + 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          spin: (Math.random() - 0.5) * 4,
          life: 0,
          maxLife: 260,
          isSpark: true,
        });
      }

      burstCenters.forEach((b) => {
        const sparkCount = 45;
        for (let i = 0; i < sparkCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.pow(Math.random(), 0.5) * 11 + 3.5;
          particles.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 3 + 1.2,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            spin: (Math.random() - 0.5) * 8,
            life: -b.delay, // staggered launch
            maxLife: Math.random() * 40 + 50,
            isSpark: true,
          });
        }
      });
    } else {
      // STANDARD CELEBRATION MODE: Twin Radiant Firework Bursts (NO Confetti)
      const burstCenters = [
        { x: width * 0.35, y: height * 0.35, delay: 0 },
        { x: width * 0.65, y: height * 0.35, delay: 8 },
      ];

      burstCenters.forEach((b) => {
        const sparkCount = 38;
        for (let i = 0; i < sparkCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.pow(Math.random(), 0.45) * 10 + 3;
          particles.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 2.8 + 1.2,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            spin: (Math.random() - 0.5) * 6,
            life: -b.delay,
            maxLife: Math.random() * 35 + 40,
            isSpark: true,
          });
        }
      });

      // Soft ambient sparkle trail
      for (let i = 0; i < 20; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.6,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -Math.random() * 0.6 - 0.2,
          size: Math.random() * 2.5 + 1.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          spin: (Math.random() - 0.5) * 4,
          life: 0,
          maxLife: 100,
          isSpark: true,
        });
      }
    }

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      let aliveCount = 0;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; // GPU hardware blending

      for (const p of particles) {
        p.life++;
        if (p.life < 0) {
          aliveCount++;
          continue; // delayed burst spark
        }

        if (p.life < p.maxLife) {
          aliveCount++;
          // Snappy spark physics
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.955; // drag
          p.vy *= 0.955;
          p.vy += 0.2; // natural gravity
          p.rotation += p.spin;

          const alpha = Math.max(0, 1 - p.life / p.maxLife) * (0.7 + Math.random() * 0.3);
          const sizeProgress = 1 - p.life / p.maxLife;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.fillStyle = p.life < 6 ? 'rgb(255, 255, 255)' : p.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0.6, p.size * sizeProgress), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.restore();

      if (aliveCount > 0) {
        animationId = requestAnimationFrame(render);
      }
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      ctx.clearRect(0, 0, width, height);
    };
  }, [active, isMilestone, colorTheme]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full z-10" />;
};

export const TelesaleTvLiveCelebrationBanner: React.FC<TelesaleTvLiveCelebrationBannerProps> = ({
  celebration,
  isSpeaking = false,
  isFadingOut = false,
}) => {
  if (!celebration) return null;

  const isMilestone = celebration.kind === 'MILESTONE';
  const isBook = celebration.kind === 'BOOK';

  const themeStyles = isMilestone
    ? {
        cardBorder: 'border-amber-400/90 shadow-[0_0_100px_rgba(251,191,36,0.55)]',
        cardBg: 'bg-gradient-to-b from-amber-950/90 via-zinc-900/95 to-zinc-950/95',
        badgeBg:
          'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-zinc-950 font-black shadow-amber-500/40',
        glowBg: 'bg-amber-500/25',
        radialRays: 'text-amber-400/20',
        ringColor: 'ring-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.65)]',
        titleGradient: 'from-amber-200 via-amber-300 to-yellow-400',
        quoteHighlight: 'text-amber-200/95',
        icon: <Trophy className="w-16 h-16 sm:w-20 sm:h-20 text-amber-300 animate-bounce drop-shadow-lg" />,
        headerLabel: '👑 ĐỈNH CAO THÀNH TÍCH · MILESTONE MỚI 👑',
      }
    : isBook
      ? {
          cardBorder: 'border-blue-400/90 shadow-[0_0_90px_rgba(59,130,246,0.5)]',
          cardBg: 'bg-gradient-to-b from-blue-950/90 via-zinc-900/95 to-zinc-950/95',
          badgeBg: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black shadow-blue-500/40',
          glowBg: 'bg-blue-500/20',
          radialRays: 'text-blue-400/20',
          ringColor: 'ring-blue-400 shadow-[0_0_60px_rgba(59,130,246,0.65)]',
          titleGradient: 'from-blue-100 via-zinc-100 to-blue-200',
          quoteHighlight: 'text-blue-200/95',
          icon: <Calendar className="w-16 h-16 sm:w-20 sm:h-20 text-blue-400 animate-pulse drop-shadow-lg" />,
          headerLabel: '★ MỞ KHÓA THÀNH TÍCH · MORE BOOK ★',
        }
      : {
          cardBorder: 'border-emerald-400/90 shadow-[0_0_90px_rgba(16,185,129,0.5)]',
          cardBg: 'bg-gradient-to-b from-emerald-950/90 via-zinc-900/95 to-zinc-950/95',
          badgeBg: 'bg-gradient-to-r from-emerald-400 to-teal-500 text-zinc-950 font-black shadow-emerald-500/40',
          glowBg: 'bg-emerald-500/20',
          radialRays: 'text-emerald-400/20',
          ringColor: 'ring-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.65)]',
          titleGradient: 'from-emerald-100 via-zinc-100 to-emerald-200',
          quoteHighlight: 'text-emerald-200/95',
          icon: <CheckCircle2 className="w-16 h-16 sm:w-20 sm:h-20 text-emerald-400 animate-pulse drop-shadow-lg" />,
          headerLabel: '★ MỞ KHÓA THÀNH TÍCH · MORE DONE ★',
        };

  const getInitials = (name?: string) => {
    if (!name) return 'TS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div
      role="dialog"
      aria-label="Live Voice Celebration Overlay"
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-zinc-950/85 backdrop-blur-xl pointer-events-none select-none overflow-hidden transition-all duration-500 ${
        isFadingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-in fade-in zoom-in-95 duration-500'
      }`}
    >
      {/* Background Interactive Canvas Particle Layer (Confetti / Fireworks) */}
      <CelebrationCanvas active={true} isMilestone={isMilestone} colorTheme={celebration.colorTheme} />

      {/* Ambient Pulsing Radial Light Burst Behind Card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className={`w-[700px] h-[700px] rounded-full ${themeStyles.glowBg} blur-[140px] animate-pulse`} />
        {/* Subtle rotating rays for Fun Achievement feel */}
        <div className="w-[900px] h-[900px] opacity-25 animate-[spin_80s_linear_infinite]">
          <svg viewBox="0 0 100 100" className={`w-full h-full fill-current ${themeStyles.radialRays}`}>
            <polygon points="50,50 48,0 52,0" />
            <polygon points="50,50 98,48 98,52" />
            <polygon points="50,50 48,100 52,100" />
            <polygon points="50,50 0,48 0,52" />
            <polygon points="50,50 84,16 86,18" />
            <polygon points="50,50 84,84 86,82" />
            <polygon points="50,50 16,84 18,86" />
            <polygon points="50,50 16,16 18,14" />
          </svg>
        </div>
      </div>

      {/* Main Full-Screen Achievement Card */}
      <div
        className={`relative z-20 w-full max-w-2xl rounded-3xl p-6 sm:p-10 border-2 overflow-hidden shadow-2xl text-center backdrop-blur-2xl transition-all duration-300 ${themeStyles.cardBorder} ${themeStyles.cardBg}`}
      >
        {/* Ambient Top Edge Glow */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${themeStyles.badgeBg}`} />

        {/* 1. Header Achievement Unlocked Pill */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-zinc-900/90 border border-zinc-700/80 text-zinc-300 shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            {themeStyles.headerLabel}
          </span>
        </div>

        {/* 2. Primary Result Badge (+1 BOOK HÔM NAY / +1 DONE HÔM NAY / MILESTONE) */}
        <div className="my-2">
          <span
            className={`inline-block px-6 py-2 rounded-2xl text-base sm:text-2xl font-black tracking-wider uppercase shadow-xl ${themeStyles.badgeBg} animate-pulse`}
          >
            {celebration.badgeText}
          </span>
        </div>

        {/* 3. Hero Avatar with Glowing Ring & Sparkles */}
        <div className="my-4 flex items-center justify-center">
          <div className="relative">
            <div
              className={`w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full flex items-center justify-center ring-4 ring-offset-4 ring-offset-zinc-950 transition-all ${themeStyles.ringColor}`}
            >
              {isMilestone ? (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-500/20 via-zinc-900 to-amber-600/30 flex items-center justify-center">
                  {themeStyles.icon}
                </div>
              ) : celebration.avatarUrl ? (
                <img
                  src={celebration.avatarUrl}
                  alt={celebration.staffName || 'Telesales'}
                  className="w-full h-full rounded-full object-cover border-4 border-amber-400/90 shadow-2xl"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-zinc-950 font-black text-3xl sm:text-4xl shadow-2xl">
                  {getInitials(celebration.staffName)}
                </div>
              )}
            </div>

            {/* Glowing Corner Badge */}
            <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-zinc-950 border-2 border-amber-400 text-amber-300 shadow-xl animate-bounce">
              {isMilestone ? <Award className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {/* 4. Staff Name / Team Recognition */}
        <div className="mt-2 mb-3">
          {!isMilestone && celebration.staffName ? (
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight m-0 uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
              {celebration.staffName}
            </h2>
          ) : (
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-amber-300 tracking-tight m-0 uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
              {celebration.staffName || 'TOÀN PHÒNG TELESALES'}
            </h2>
          )}
        </div>

        {/* 5. Celebration Quote (100% Matched With Voice) */}
        <div className="my-4 px-2 sm:px-6">
          <p
            className={`text-base sm:text-lg md:text-xl font-bold font-mono italic leading-relaxed m-0 drop-shadow-md ${themeStyles.quoteHighlight}`}
          >
            “{celebration.textToSpeak}”
          </p>
        </div>

        {/* 6. Footer: Audio Indicator & Auto-dismiss Progress Bar */}
        <div className="mt-6 flex flex-col items-center gap-3">
          {isSpeaking && (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono text-amber-300 bg-amber-950/80 border border-amber-500/50 shadow-md animate-pulse">
              <Volume2 className="w-4 h-4 animate-pulse text-amber-400" />
              Đang phát loa...
            </span>
          )}

          {/* Slim Auto-Dismiss Timer Bar */}
          <div className="w-48 h-1 bg-zinc-800/80 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full animate-[progress_4.5s_linear_forwards]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const TelesaleTvLiveCelebrationOverlay = TelesaleTvLiveCelebrationBanner;

'use client';

import React from 'react';
import { ActiveCelebration } from '../hooks/useTelesaleTvLiveCelebration';
import { Sparkles, Trophy, Calendar, CheckCircle2, Volume2 } from 'lucide-react';

interface TelesaleTvLiveCelebrationBannerProps {
  celebration: ActiveCelebration | null;
  isSpeaking?: boolean;
}

export const TelesaleTvLiveCelebrationBanner: React.FC<TelesaleTvLiveCelebrationBannerProps> = ({
  celebration,
  isSpeaking = false,
}) => {
  if (!celebration) return null;

  const isMilestone = celebration.kind === 'MILESTONE';
  const isBook = celebration.kind === 'BOOK';

  const themeStyles = isMilestone
    ? {
        border: 'border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.5)]',
        bg: 'bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-950',
        badgeBg: 'bg-amber-400 text-zinc-950',
        glowBg: 'bg-amber-500/20',
        textHighlight: 'text-amber-300',
        icon: <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />,
      }
    : isBook
      ? {
          border: 'border-blue-400 shadow-[0_0_50px_rgba(59,130,246,0.45)]',
          bg: 'bg-gradient-to-r from-blue-950/95 via-zinc-900 to-blue-950/95',
          badgeBg: 'bg-blue-500 text-white',
          glowBg: 'bg-blue-500/20',
          textHighlight: 'text-blue-300',
          icon: <Calendar className="w-8 h-8 text-blue-400 animate-pulse" />,
        }
      : {
          border: 'border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.45)]',
          bg: 'bg-gradient-to-r from-emerald-950/95 via-zinc-900 to-emerald-950/95',
          badgeBg: 'bg-emerald-500 text-zinc-950 font-black',
          glowBg: 'bg-emerald-500/20',
          textHighlight: 'text-emerald-300',
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-pulse" />,
        };

  const getInitials = (name?: string) => {
    if (!name) return 'TS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[150] w-[92%] max-w-4xl pointer-events-none animate-in fade-in slide-in-from-top-6 duration-300">
      <div
        className={`relative overflow-hidden rounded-3xl border-2 p-6 sm:p-8 backdrop-blur-2xl transition-all ${themeStyles.border} ${themeStyles.bg}`}
      >
        {/* Ambient pulsing glow background */}
        <div className={`absolute inset-0 ${themeStyles.glowBg} animate-pulse pointer-events-none`} />

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          {/* Avatar or Trophy */}
          <div className="relative shrink-0">
            {isMilestone ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Trophy className="w-12 h-12 text-amber-300 animate-bounce" />
              </div>
            ) : celebration.avatarUrl ? (
              <img
                src={celebration.avatarUrl}
                alt={celebration.staffName || 'Telesales'}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-amber-400 shadow-xl shadow-black/50"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 border-4 border-amber-300 flex items-center justify-center text-zinc-950 font-black text-2xl sm:text-3xl shadow-xl">
                {getInitials(celebration.staffName)}
              </div>
            )}

            {/* Glowing sparkle badge */}
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-zinc-950 border border-amber-400 text-amber-400 shadow-md">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
          </div>

          {/* Text & Content */}
          <div className="flex-1 min-w-0">
            {/* Top row badge */}
            <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-2">
              <span
                className={`px-3.5 py-1 rounded-full text-xs sm:text-sm font-black tracking-wider uppercase shadow-md ${themeStyles.badgeBg} animate-pulse`}
              >
                {celebration.badgeText}
              </span>

              {isSpeaking && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono text-amber-300 bg-amber-950/80 border border-amber-500/50">
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                  Đang phát loa...
                </span>
              )}
            </div>

            {/* Staff Name / Title */}
            {!isMilestone && celebration.staffName && (
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-100 tracking-tight m-0 uppercase drop-shadow-md">
                {celebration.staffName}
              </h2>
            )}

            {/* Celebration Quote */}
            <p className="mt-2 text-base sm:text-xl lg:text-2xl font-bold font-mono text-zinc-100 italic leading-relaxed m-0 drop-shadow">
              “{celebration.textToSpeak}”
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

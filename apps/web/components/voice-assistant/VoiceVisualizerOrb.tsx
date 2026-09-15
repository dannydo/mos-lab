'use client';

import React from 'react';
import { AudioOutlined, LoadingOutlined, SoundOutlined } from '@ant-design/icons';
import { VoiceStatus } from './types';

interface VoiceVisualizerOrbProps {
  status: VoiceStatus;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export const VoiceVisualizerOrb: React.FC<VoiceVisualizerOrbProps> = ({ status, size = 'medium', onClick }) => {
  const sizeClasses = {
    small: 'w-10 h-10',
    medium: 'w-14 h-14',
    large: 'w-24 h-24',
  }[size];

  const iconSizes = {
    small: 'text-sm',
    medium: 'text-xl',
    large: 'text-3xl',
  }[size];

  return (
    <div
      onClick={onClick}
      className={`relative rounded-full flex items-center justify-center cursor-pointer select-none transition-all duration-300 ${sizeClasses}`}
    >
      {/* 1. Pulsing Rings when Listening */}
      {status === 'listening' && (
        <>
          <span className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping" />
          <span className="absolute -inset-2 rounded-full bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-indigo-500/20 animate-pulse blur-sm" />
        </>
      )}

      {/* 2. Rotating Halo when Thinking */}
      {status === 'thinking' && (
        <span className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-amber-400 via-purple-500 to-emerald-400 animate-spin blur-[2px] opacity-80" />
      )}

      {/* 3. Audio Wave Halo when Speaking */}
      {status === 'speaking' && (
        <>
          <span className="absolute -inset-2 rounded-full bg-emerald-500/30 animate-pulse blur-sm" />
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-400/40 via-teal-500/40 to-cyan-500/40 animate-ping opacity-60" />
        </>
      )}

      {/* 4. Core Orb Surface */}
      <div
        className={`w-full h-full rounded-full flex items-center justify-center shadow-lg relative z-10 transition-all duration-300 ${
          status === 'listening'
            ? 'bg-gradient-to-tr from-rose-600 to-purple-600 text-white shadow-rose-500/40 scale-105 ring-2 ring-rose-400/60'
            : status === 'thinking'
              ? 'bg-gradient-to-tr from-purple-700 to-indigo-700 text-white shadow-purple-500/40'
              : status === 'speaking'
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-emerald-500/40 ring-2 ring-emerald-400/60'
                : 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-purple-500/30 hover:scale-105 hover:shadow-purple-500/50'
        }`}
      >
        {status === 'listening' ? (
          <AudioOutlined className={`${iconSizes} animate-bounce`} />
        ) : status === 'thinking' ? (
          <LoadingOutlined className={iconSizes} />
        ) : status === 'speaking' ? (
          <div className="flex items-center gap-0.5">
            <span className="w-1 h-3 bg-white rounded-full animate-pulse" />
            <span className="w-1 h-5 bg-white rounded-full animate-pulse delay-75" />
            <span className="w-1 h-4 bg-white rounded-full animate-pulse delay-150" />
          </div>
        ) : (
          <AudioOutlined className={iconSizes} />
        )}
      </div>
    </div>
  );
};

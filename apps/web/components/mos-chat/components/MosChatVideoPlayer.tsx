'use client';

import React, { useRef, useState } from 'react';
import { Download, Film, Maximize2, Play, Volume2, VolumeX } from 'lucide-react';
import { Tooltip } from 'antd';
import type { MosChatImageAttachment } from '@mos-lab/shared';
import { useTheme } from '../../../context/ThemeContext';
import { formatFileSize, formatVideoDuration } from '../utils/chat-helpers';

export interface MosChatVideoPlayerProps {
  attachment: MosChatImageAttachment;
  compact?: boolean;
  isMine?: boolean;
  className?: string;
}

export const MosChatVideoPlayer: React.FC<MosChatVideoPlayerProps> = ({
  attachment,
  compact = false,
  isMine = false,
  className = '',
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(attachment.durationSec || 0);
  const [hasStarted, setHasStarted] = useState(false);

  const videoUrl = attachment.url;
  const fileName = attachment.name || 'video.mp4';
  const ext = (attachment.fileExt || fileName.split('.').pop() || 'mp4').toUpperCase();

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setHasStarted(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen().catch(() => {});
    } else if ((videoRef.current as any).webkitEnterFullscreen) {
      (videoRef.current as any).webkitEnterFullscreen();
    }
  };

  return (
    <div
      className={`group/video relative rounded-2xl overflow-hidden border shadow-sm transition-all duration-200 ${
        isMine ? 'ml-auto' : 'mr-auto'
      } ${className}`}
      style={{
        maxWidth: compact ? '100%' : '440px',
        width: compact ? '100%' : 'auto',
        background: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(248, 250, 252, 0.9)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Top Header Bar with File Name, Size & Quick Actions */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-1.5 border-b select-none text-[11px]"
        style={{
          background: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.6)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Film size={13} className="text-amber-500 shrink-0" />
          <span className="font-medium truncate" title={fileName} style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>
            {fileName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{
              background: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
            }}
          >
            {ext}
          </span>
          {attachment.sizeBytes > 0 && (
            <span className="text-[10px] tabular-nums" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              {formatFileSize(attachment.sizeBytes)}
            </span>
          )}
          <Tooltip title="Tải video về máy">
            <a
              href={videoUrl}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-md transition-colors hover:bg-black/10 dark:hover:bg-white/10"
              style={{ color: isDark ? '#cbd5e1' : '#475569' }}
            >
              <Download size={13} />
            </a>
          </Tooltip>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={attachment.posterUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
          onPlay={() => {
            setIsPlaying(true);
            setHasStarted(true);
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={(e) => {
            setCurrentTime((e.target as HTMLVideoElement).currentTime);
          }}
          onLoadedMetadata={(e) => {
            const v = e.target as HTMLVideoElement;
            if (v.duration && !isNaN(v.duration)) {
              setDuration(Math.round(v.duration));
            }
          }}
        />

        {/* Big Center Play Overlay Button before playing */}
        {!hasStarted && (
          <div
            onClick={handlePlayToggle}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex flex-col items-center justify-center cursor-pointer transition-opacity group-hover/video:bg-black/20"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/90 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95">
              <Play size={22} className="ml-1 fill-white" />
            </div>
            {duration > 0 && (
              <span className="mt-2 text-xs font-semibold text-white/90 bg-black/60 px-2 py-0.5 rounded-full tabular-nums shadow">
                {formatVideoDuration(duration)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Duration & Progress Indicator */}
      {duration > 0 && hasStarted && (
        <div
          className="flex items-center justify-between px-3 py-1 text-[10px] tabular-nums select-none"
          style={{
            background: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.7)',
            color: isDark ? '#94a3b8' : '#64748b',
          }}
        >
          <span>
            {formatVideoDuration(currentTime)} / {formatVideoDuration(duration)}
          </span>
          <span className="text-[9.5px] text-amber-500 font-medium">mOS Video</span>
        </div>
      )}
    </div>
  );
};

'use client';

import React, { useRef, useState } from 'react';
import { AlertCircle, Download, ExternalLink, Film, Loader2, Play, RotateCcw } from 'lucide-react';
import { Tooltip } from 'antd';
import type { MosChatImageAttachment } from '@mos-lab/shared';
import { useTheme } from '../../../context/ThemeContext';
import { resolveMediaUrl } from '../../../lib/api-base-url';
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(attachment.durationSec || 0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const rawUrl = attachment.url || '';
  const videoUrl = resolveMediaUrl(rawUrl);
  const fileName = attachment.name || 'video.mp4';
  const ext = (attachment.fileExt || fileName.split('.').pop() || 'mp4').toUpperCase();

  // If this is a QuickTime MOV, derive alternative MP4 stream URL if available
  const mp4FallbackUrl =
    rawUrl.endsWith('.mov') || rawUrl.endsWith('.MOV') ? resolveMediaUrl(rawUrl.replace(/\.mov$/i, '.mp4')) : null;

  // Resolve poster thumbnail if provided, or check if an automated JPEG frame exists
  const posterUrl = attachment.posterUrl
    ? resolveMediaUrl(attachment.posterUrl)
    : rawUrl.endsWith('.mov') || rawUrl.endsWith('.MOV') || rawUrl.endsWith('.mp4')
      ? resolveMediaUrl(rawUrl.replace(/\.(mov|mp4)$/i, '.jpg'))
      : undefined;

  const isProcessing = Boolean(attachment.isProcessing);

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      setHasError(false);
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasStarted(true);
          setIsBuffering(false);
        })
        .catch(() => {
          setHasError(true);
          setIsPlaying(false);
          setIsBuffering(false);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasError(false);
    setIsBuffering(true);
    setRetryKey((prev) => prev + 1);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setHasStarted(true);
            setIsBuffering(false);
          })
          .catch(() => {
            setHasError(true);
            setIsBuffering(false);
          });
      }
    }, 100);
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
        {/* State 1: Video is currently processing on server */}
        {isProcessing ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center bg-slate-950/90 text-white">
            <Loader2 size={28} className="text-amber-400 animate-spin mb-2" />
            <span className="text-xs font-semibold text-amber-300">Đang xử lý video...</span>
            <p className="text-[11px] text-slate-300 mt-1 max-w-[280px] leading-relaxed">
              {attachment.processingStatus ||
                'Hệ thống đang tối ưu hóa định dạng và tạo bộ đệm phát trực tiếp. Vui lòng đợi trong giây lát.'}
            </p>
            <a
              href={videoUrl}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
            >
              <Download size={12} />
              <span>Tải tệp gốc về máy</span>
            </a>
          </div>
        ) : hasError ? (
          /* State 2: Video playback failed or format not directly decodable in this browser */
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center bg-slate-950/95 text-white">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
              <AlertCircle size={20} />
            </div>
            <span className="text-xs font-semibold text-amber-200">Không thể phát trực tiếp trên trình duyệt</span>
            <p className="text-[11px] text-slate-300 mt-1 max-w-[300px] leading-relaxed">
              Định dạng <span className="font-semibold text-amber-300">{ext}</span> ({fileName}) chưa được trình duyệt
              giải mã trực tiếp hoặc đang hoàn tất xử lý. Bạn có thể tải video về máy để xem ngay lập tức.
            </p>
            <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
              <a
                href={videoUrl}
                download={fileName}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all shadow hover:shadow-md"
              >
                <Download size={13} />
                <span>Tải về máy ({ext})</span>
              </a>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
              >
                <RotateCcw size={12} />
                <span>Thử lại</span>
              </button>
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Mở trong tab mới"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        ) : null}

        {/* The Native HTML5 Video Element */}
        <video
          key={retryKey}
          ref={videoRef}
          poster={posterUrl}
          controls={hasStarted && !hasError}
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
          onPlay={() => {
            setIsPlaying(true);
            setHasStarted(true);
            setIsBuffering(false);
            setHasError(false);
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            setIsBuffering(false);
            setHasError(false);
          }}
          onCanPlay={() => {
            setIsBuffering(false);
          }}
          onTimeUpdate={(e) => {
            setCurrentTime((e.target as HTMLVideoElement).currentTime);
          }}
          onLoadedMetadata={(e) => {
            const v = e.target as HTMLVideoElement;
            if (v.duration && !isNaN(v.duration)) {
              setDuration(Math.round(v.duration));
            }
          }}
          onError={() => {
            setHasError(true);
            setIsBuffering(false);
          }}
        >
          {mp4FallbackUrl && <source src={mp4FallbackUrl} type="video/mp4" />}
          <source src={videoUrl} type={attachment.mimeType || (ext === 'MOV' ? 'video/quicktime' : 'video/mp4')} />
          Trình duyệt của bạn không hỗ trợ thẻ video.
        </video>

        {/* Buffering Spinner during playback */}
        {hasStarted && isBuffering && !hasError && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 text-white text-xs shadow-lg">
              <Loader2 size={14} className="animate-spin text-amber-400" />
              <span>Đang nạp bộ đệm...</span>
            </div>
          </div>
        )}

        {/* Big Center Play Overlay Button before first play */}
        {!hasStarted && !isProcessing && !hasError && (
          <div
            onClick={handlePlayToggle}
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px] flex flex-col items-center justify-center cursor-pointer transition-opacity group-hover/video:bg-black/20 z-10"
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
      {duration > 0 && hasStarted && !hasError && (
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

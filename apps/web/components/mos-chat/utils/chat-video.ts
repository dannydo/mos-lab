import type { MosChatImageAttachment } from '@mos-lab/shared';
import { isVideoAttachment, formatVideoDuration } from './chat-helpers';

export { isVideoAttachment, formatVideoDuration };

/**
 * Kiểm tra xem File người dùng chọn có phải là video được hỗ trợ không
 */
export function isSupportedVideoFile(file: File): boolean {
  if (!file) return false;
  if (file.type && file.type.startsWith('video/')) return true;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return ['mp4', 'webm', 'mov'].includes(ext);
}

/**
 * Trích xuất thời lượng, kích thước và ảnh bìa (poster thumbnail) từ video File
 * sử dụng HTML5 Video element và Canvas trên trình duyệt client-side.
 */
export async function extractVideoMetadata(file: File): Promise<{
  durationSec: number;
  width?: number;
  height?: number;
  posterDataUrl?: string;
}> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve({ durationSec: 0 });
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve({ durationSec: 0 });
    }, 6000);

    video.onloadedmetadata = () => {
      // Seek to 0.2s or 10% to capture representative poster frame
      const targetTime = Math.min(0.2, (video.duration || 1) / 2);
      if (video.currentTime !== targetTime) {
        video.currentTime = targetTime;
      } else {
        captureFrame();
      }
    };

    const captureFrame = () => {
      let posterDataUrl: string | undefined;
      try {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          const canvas = document.createElement('canvas');
          const maxDim = 480;
          let w = video.videoWidth;
          let h = video.videoHeight;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            posterDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          }
        }
      } catch (_) {
        // Fallback gracefully without poster if browser blocks canvas
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      URL.revokeObjectURL(url);
      resolve({
        durationSec: Math.round(video.duration || 0),
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        posterDataUrl,
      });
    };

    video.onseeked = () => {
      captureFrame();
    };

    video.onerror = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      URL.revokeObjectURL(url);
      resolve({ durationSec: 0 });
    };
  });
}

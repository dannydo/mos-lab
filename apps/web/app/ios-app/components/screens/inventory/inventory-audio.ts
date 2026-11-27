export function formatInventoryDotNumber(value: number | string | null | undefined): string {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  return Math.trunc(num).toLocaleString('de-DE');
}

export function playInventoryScanSound(isSuccess: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(isSuccess ? 100 : [80, 50, 120]);
    }
    const src = isSuccess ? '/sounds/inventory/scan-code-default.mp3' : '/sounds/inventory/scan-code-error.mp3';
    const audio = new Audio(src);
    void audio.play().catch(() => undefined);
  } catch {
    // Ignore autoplay / SSR audio constraints
  }
}

/**
 * Matches legacy `InventoryScannerVC.swift` `resizeImage(targetSize: 1024x1024)` + JPEG base64 upload.
 */
export function captureSquareJpegBase64(video: HTMLVideoElement | null): string | null {
  if (!video || !video.videoWidth || !video.videoHeight) return null;
  try {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const idx = dataUrl.indexOf('base64,');
    return idx >= 0 ? dataUrl.slice(idx + 7) : null;
  } catch {
    return null;
  }
}

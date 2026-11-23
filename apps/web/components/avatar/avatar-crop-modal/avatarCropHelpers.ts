import type { PanOffset } from './avatarCropModalTypes';

export const MAX_AVATAR_FILE_BYTES = 10 * 1024 * 1024;
export const VIEWFINDER_CANVAS_SIZE = 300;
export const THUMBNAIL_MAX_DIM = 512;
export const THUMBNAIL_JPEG_QUALITY = 0.85;
export const EXPORT_CANVAS_SIZE = 400;
export const EXPORT_JPEG_QUALITY = 0.92;
export const ZOOM_MIN = 0.8;
export const ZOOM_MAX = 3.0;
export const ZOOM_STEP = 0.05;

const CONFETTI_COLORS = [
  'rgb(245, 158, 11)',
  'rgb(236, 72, 153)',
  'rgb(139, 92, 246)',
  'rgb(16, 185, 129)',
  'rgb(6, 182, 212)',
  'rgb(234, 179, 8)',
  'rgb(255, 255, 255)',
] as const;

/** Lightweight celebration confetti particles rendered on a temporary full-screen canvas. */
export function launchConfetti(): void {
  if (typeof window === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 90 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 200,
    y: canvas.height * 0.45,
    size: Math.random() * 8 + 4,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    speedX: (Math.random() - 0.5) * 16,
    speedY: Math.random() * -14 - 4,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 12,
    opacity: 1,
  }));

  let animationFrameId = 0;
  const startTime = Date.now();

  function animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const elapsed = Date.now() - startTime;

    particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.speedY += 0.45;
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - elapsed / 2800);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });

    if (elapsed < 2800) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationFrameId);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }
  }

  animate();
}

/** Create an optimized thumbnail (max 512x512) for fast Gemini Vision scoring. */
export function createAiScoringThumbnail(img: HTMLImageElement, fallbackSrc: string): string {
  try {
    const thumbCanvas = document.createElement('canvas');
    let w = img.width;
    let h = img.height;
    if (w > THUMBNAIL_MAX_DIM || h > THUMBNAIL_MAX_DIM) {
      if (w > h) {
        h = Math.round((h * THUMBNAIL_MAX_DIM) / w);
        w = THUMBNAIL_MAX_DIM;
      } else {
        w = Math.round((w * THUMBNAIL_MAX_DIM) / h);
        h = THUMBNAIL_MAX_DIM;
      }
    }
    thumbCanvas.width = w;
    thumbCanvas.height = h;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (!thumbCtx) return fallbackSrc;
    thumbCtx.drawImage(img, 0, 0, w, h);
    return thumbCanvas.toDataURL('image/jpeg', THUMBNAIL_JPEG_QUALITY);
  } catch {
    return fallbackSrc;
  }
}

/** Draw the cropped preview image onto the viewfinder canvas with zoom, rotation, and pan. */
export function drawAvatarPreviewCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  zoom: number,
  rotation: number,
  panOffset: PanOffset
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(panOffset.x, panOffset.y);

  const aspect = img.width / img.height;
  let drawWidth = size * zoom;
  let drawHeight = size * zoom;

  if (aspect > 1) {
    drawWidth = size * aspect * zoom;
    drawHeight = size * zoom;
  } else {
    drawWidth = size * zoom;
    drawHeight = (size / aspect) * zoom;
  }

  ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();
}

/** Export a circular 400x400 JPEG data URL from the preview viewfinder canvas. */
export function exportCircularAvatarDataUrl(sourceCanvas: HTMLCanvasElement): string | null {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = EXPORT_CANVAS_SIZE;
  exportCanvas.height = EXPORT_CANVAS_SIZE;
  const exportCtx = exportCanvas.getContext('2d');
  if (!exportCtx) return null;

  const radius = EXPORT_CANVAS_SIZE / 2;
  exportCtx.beginPath();
  exportCtx.arc(radius, radius, radius, 0, Math.PI * 2);
  exportCtx.clip();
  exportCtx.drawImage(sourceCanvas, 0, 0, EXPORT_CANVAS_SIZE, EXPORT_CANVAS_SIZE);

  return exportCanvas.toDataURL('image/jpeg', EXPORT_JPEG_QUALITY);
}

/** Update the cached user avatar URL in localStorage if present. */
export function persistAvatarToLocalStorage(resolvedAvatarUrl: string): void {
  try {
    const stored = localStorage.getItem('mos_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.avatarUrl = resolvedAvatarUrl;
      parsed.avatar = resolvedAvatarUrl;
      localStorage.setItem('mos_user', JSON.stringify(parsed));
    }
  } catch {
    // Ignore storage access or JSON parse issues in restricted environments
  }
}

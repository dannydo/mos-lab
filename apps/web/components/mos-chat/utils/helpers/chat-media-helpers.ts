import type { MosChatImageAttachment, MosChatImageMimeType } from '@mos-lab/shared';

export function parseGoogleDriveImageFromText(rawText: string): MosChatImageAttachment | null {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return null;
  const match =
    trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{15,})/) ||
    trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]{15,})/) ||
    trimmed.match(/drive\.google\.com\/uc\?(?:export=\w+&)?id=([a-zA-Z0-9_-]{15,})/) ||
    trimmed.match(/drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]{15,})/);
  if (!match) return null;
  const fileId = match[1];
  return {
    id: `drive-${fileId.slice(0, 8)}-${Date.now()}`,
    url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
    name: `Google-Drive-${fileId.slice(0, 6)}.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes: 0,
    source: 'drive',
  };
}

export async function readOrCompressImagePayload(
  file: File
): Promise<{ dataBase64: string; mimeType: MosChatImageMimeType; width?: number; height?: number }> {
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.(heic|heif)$/i.test(file.name);

  if (isHeic) {
    // 1. Try browser canvas decoding first (Safari on macOS/iOS supports HEIC natively)
    try {
      const objectUrl = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new window.Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Browser cannot decode HEIC natively'));
        el.src = objectUrl;
      });

      const maxDim = 1600;
      let width = img.naturalWidth || img.width || 800;
      let height = img.naturalHeight || img.height || 600;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        URL.revokeObjectURL(objectUrl);
        return {
          dataBase64: dataUrl.replace(/^data:image\/jpeg;base64,/i, ''),
          mimeType: 'image/jpeg',
          width,
          height,
        };
      }
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Browser (Chrome/Firefox/Edge) cannot decode HEIC natively.
      // Read raw HEIC bytes and send to server for automatic conversion to JPEG.
    }

    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Không thể đọc tệp HEIC'));
      reader.readAsDataURL(file);
    });

    const base64Data = rawDataUrl.replace(/^data:[^;]+;base64,/i, '');
    return {
      dataBase64: base64Data,
      mimeType: 'image/heic',
    };
  }

  if (file.type === 'image/gif') {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Không thể đọc ảnh GIF'));
      reader.readAsDataURL(file);
    });
    return {
      dataBase64: dataUrl.replace(/^data:image\/gif;base64,/i, ''),
      mimeType: 'image/gif',
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Không thể giải mã hình ảnh'));
      el.src = objectUrl;
    });

    const maxDim = 1600;
    let width = img.naturalWidth || img.width || 800;
    let height = img.naturalHeight || img.height || 600;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không khởi tạo được bộ nén ảnh');
    ctx.drawImage(img, 0, 0, width, height);

    let targetMime: MosChatImageMimeType = file.type === 'image/png' ? 'image/png' : 'image/webp';
    let dataUrl = canvas.toDataURL(targetMime, 0.86);
    if (!dataUrl.startsWith(`data:${targetMime};base64,`)) {
      targetMime = 'image/jpeg';
      dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    }

    if (targetMime === 'image/png' && dataUrl.length > 3_200_000) {
      targetMime = 'image/webp';
      dataUrl = canvas.toDataURL('image/webp', 0.86);
      if (!dataUrl.startsWith('data:image/webp;base64,')) {
        targetMime = 'image/jpeg';
        dataUrl = canvas.toDataURL('image/jpeg', 0.86);
      }
    }

    return {
      dataBase64: dataUrl.replace(/^data:image\/(?:jpeg|png|webp);base64,/i, ''),
      mimeType: targetMime,
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function extractExtension(val?: string | null): string {
  if (!val) return '';
  const clean = val.split('?')[0].split('#')[0];
  const parts = clean.split('.');
  return parts.length > 1 ? (parts.pop() || '').toLowerCase() : '';
}

export function isVideoAttachment(att?: MosChatImageAttachment | null): boolean {
  if (!att) return false;
  if (att.isVideo) return true;
  if (att.mimeType && att.mimeType.startsWith('video/')) return true;
  const nameExt = extractExtension(att.name);
  const urlExt = extractExtension(att.url);
  const videoExts = ['mp4', 'webm', 'mov'];
  return videoExts.includes(nameExt) || videoExts.includes(urlExt);
}

export function isImageAttachment(att?: MosChatImageAttachment | null): boolean {
  if (!att) return false;
  if (isVideoAttachment(att)) return false;
  if (att.mimeType && att.mimeType.startsWith('image/')) return true;
  const nameExt = extractExtension(att.name);
  const urlExt = extractExtension(att.url);
  const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'heic', 'heif'];
  return imageExts.includes(nameExt) || imageExts.includes(urlExt);
}

export function formatVideoDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function isPdfAttachment(att?: MosChatImageAttachment | null): boolean {
  if (!att) return false;
  if (att.mimeType === 'application/pdf') return true;
  const ext = ((att.name || att.url || '').split('.').pop() || '').toLowerCase();
  return ext === 'pdf';
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtension(nameOrUrl?: string): string {
  if (!nameOrUrl) return 'FILE';
  const clean = nameOrUrl.split('?')[0].split('#')[0];
  const parts = clean.split('.');
  if (parts.length <= 1) return 'FILE';
  return (parts.pop() || 'FILE').toUpperCase();
}

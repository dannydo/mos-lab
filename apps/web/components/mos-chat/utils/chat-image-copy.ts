import { message as antdMessage } from 'antd';
import { resolveMediaUrl } from '../../../lib/api-base-url';

export interface CopyImageOptions {
  showToast?: boolean;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Converts any image blob into a standard PNG blob using an offscreen Canvas.
 * Browsers (Chrome, Safari, Firefox) strictly require 'image/png' when writing image data to the system clipboard via navigator.clipboard.write.
 */
export async function convertBlobToPng(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') {
    return blob;
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Canvas chỉ khả dụng trên trình duyệt'));
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Chuyển đổi hình ảnh quá thời gian'));
    }, 3500);

    img.onload = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 300;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Không thể khởi tạo Canvas 2D context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            resolve(pngBlob);
          } else {
            reject(new Error('Không thể xuất PNG blob từ canvas'));
          }
        }, 'image/png');
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể tải hình ảnh để chuyển đổi định dạng'));
    };

    img.src = objectUrl;
  });
}

/**
 * Loads an image from a URL and converts it to a PNG Blob via an offscreen Canvas.
 */
export async function loadImageToPngBlob(imageUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Image chỉ khả dụng trên trình duyệt'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      reject(new Error('Tải hình ảnh quá thời gian'));
    }, 3500);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 300;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Không thể khởi tạo Canvas 2D context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            resolve(pngBlob);
          } else {
            reject(new Error('Không thể tạo PNG blob từ canvas'));
          }
        }, 'image/png');
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Không thể tải hình ảnh từ đường dẫn'));
    };

    img.src = imageUrl;
  });
}

/**
 * Copies an image directly to the system clipboard as image/png.
 * If writing image bytes fails (e.g. non-secure context or CORS restriction),
 * automatically falls back to copying the direct image URL.
 */
export async function copyImageToClipboard(
  rawUrl: string,
  options: CopyImageOptions = {}
): Promise<boolean> {
  const { showToast = true, onSuccess, onError } = options;

  if (typeof window === 'undefined') {
    return false;
  }

  const fullUrl = resolveMediaUrl(rawUrl);
  if (!fullUrl) {
    if (showToast) antdMessage.error('Đường dẫn hình ảnh không hợp lệ');
    return false;
  }

  try {
    let pngBlob: Blob | null = null;

    // Phase 1: Try fetching the image as a Blob directly
    try {
      const response = await fetch(fullUrl, { mode: 'cors' });
      if (response.ok) {
        const rawBlob = await response.blob();
        pngBlob = await convertBlobToPng(rawBlob);
      }
    } catch {
      // Fetch failed or blocked by CORS, proceed to image element loading
    }

    // Phase 2: If fetch was not successful, load via Image object
    if (!pngBlob) {
      try {
        pngBlob = await loadImageToPngBlob(fullUrl);
      } catch {
        // Fallback to URL copy below
      }
    }

    // Phase 3: Write image/png to clipboard
    const hasClipboardWrite =
      Boolean(navigator.clipboard) &&
      typeof navigator.clipboard.write === 'function' &&
      typeof ClipboardItem !== 'undefined';

    if (pngBlob && hasClipboardWrite) {
      const item = new ClipboardItem({
        'image/png': pngBlob,
      });
      await navigator.clipboard.write([item]);

      if (showToast) {
        antdMessage.success('Đã sao chép hình ảnh vào bộ nhớ tạm');
      }
      onSuccess?.();
      return true;
    }

    // Phase 4: Fallback to copying URL text if clipboard.write is unavailable or image could not be converted
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(fullUrl);
      if (showToast) {
        antdMessage.success('Đã sao chép đường dẫn hình ảnh');
      }
      onSuccess?.();
      return true;
    }

    throw new Error('Trình duyệt không hỗ trợ Clipboard API');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    // Final desperate fallback: copy URL via writeText
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
        if (showToast) {
          antdMessage.success('Đã sao chép đường dẫn hình ảnh');
        }
        onSuccess?.();
        return true;
      }
    } catch {
      // Ignored
    }

    if (showToast) {
      antdMessage.error(`Không thể sao chép hình ảnh: ${error.message}`);
    }
    onError?.(error);
    return false;
  }
}

/**
 * Copies the raw/resolved image link to clipboard
 */
export async function copyImageUrlToClipboard(
  rawUrl: string,
  options: CopyImageOptions = {}
): Promise<boolean> {
  const { showToast = true, onSuccess, onError } = options;
  const fullUrl = resolveMediaUrl(rawUrl);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(fullUrl);
      if (showToast) {
        antdMessage.success('Đã sao chép liên kết hình ảnh');
      }
      onSuccess?.();
      return true;
    }
    throw new Error('Clipboard API không khả dụng');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (showToast) {
      antdMessage.error(`Không thể sao chép liên kết: ${error.message}`);
    }
    onError?.(error);
    return false;
  }
}

/**
 * Initiates a browser download of an image
 */
export function downloadImage(rawUrl: string, fileName?: string): void {
  if (typeof window === 'undefined') return;
  const fullUrl = resolveMediaUrl(rawUrl);
  const a = document.createElement('a');
  a.href = fullUrl;
  a.download = fileName || 'image.png';
  a.target = '_blank';
  a.rel = 'noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Nén ảnh chụp từ camera iPhone / Thư viện theo chuẩn native iOS (tương đương toJpegData trong Swift)
 * Thu nhỏ kích thước tối đa 1024px và nén JPEG quality 0.72.
 * Giúp dung lượng giảm từ 5MB-10MB xuống ~50KB-80KB mà vẫn giữ độ nét hoàn hảo trên màn hình Retina.
 */
export async function compressLashImage(
  fileOrDataUrl: File | Blob | string,
  maxDimension = 1024,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      if (typeof fileOrDataUrl === 'string') return resolve(fileOrDataUrl);
      return resolve('');
    }

    // Nếu là đường dẫn static asset không phải base64 (ví dụ '/assets/lash_before.jpg')
    if (typeof fileOrDataUrl === 'string' && !fileOrDataUrl.startsWith('data:image')) {
      return resolve(fileOrDataUrl);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (err) {
        console.warn('[compressLashImage] Canvas compression fallback:', err);
        if (typeof fileOrDataUrl === 'string') resolve(fileOrDataUrl);
        else resolve('');
      }
    };

    img.onerror = () => {
      if (typeof fileOrDataUrl === 'string') {
        resolve(fileOrDataUrl);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.onerror = reject;
        reader.readAsDataURL(fileOrDataUrl);
      }
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

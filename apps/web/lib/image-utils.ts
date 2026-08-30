const DEFAULT_MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export async function compressImageForUpload(
  file: File,
  options: { maxDimension?: number; maxBytes?: number; quality?: number } = {}
): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Chỉ hỗ trợ file ảnh.');
  const maxDimension = options.maxDimension ?? 1600;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_IMAGE_BYTES;
  const quality = options.quality ?? 0.82;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Trình duyệt không thể xử lý ảnh.');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality));
  if (!blob) throw new Error('Không thể nén ảnh.');
  if (blob.size > maxBytes) throw new Error('Ảnh sau nén vẫn lớn hơn 3 MB.');
  const extension = mimeType === 'image/png' ? '.png' : '.jpg';
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + extension, { type: mimeType });
}

export function fileDataBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc ảnh đã chọn.'));
    reader.onload = () => {
      const encoded = String(reader.result || '');
      const separator = encoded.indexOf(',');
      if (separator < 0) return reject(new Error('Dữ liệu ảnh không hợp lệ.'));
      resolve(encoded.slice(separator + 1));
    };
    reader.readAsDataURL(file);
  });
}

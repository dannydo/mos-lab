export async function compressWorkshopImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Chỉ hỗ trợ file ảnh.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt không thể xử lý ảnh.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.84));
  if (!blob) throw new Error('Không thể nén ảnh.');
  if (blob.size > 5 * 1024 * 1024) throw new Error('Ảnh sau nén vẫn lớn hơn 5MB.');
  return new File([blob], file.name.replace(/\.[^.]+$/, mimeType === 'image/png' ? '.png' : '.jpg'), {
    type: mimeType,
  });
}

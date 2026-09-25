import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

export function staffAvatarMediaDir(): string {
  const configured = String(process.env.STAFF_AVATAR_MEDIA_DIR || '').trim();
  if (configured) return resolve(configured);
  if (process.env.NODE_ENV === 'production') return '/home/web/mos-data/staff-avatars';
  return resolve(process.cwd(), 'scratch', 'staff-avatars');
}

export class AvatarStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AvatarStorageError';
  }
}

export class AvatarStorageService {
  static readonly MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

  static async saveAvatar(photoData: string, _preferredMime?: string): Promise<{ filename: string; photoUrl: string }> {
    const trimmed = String(photoData || '').trim();
    if (!trimmed) {
      throw new AvatarStorageError('Dữ liệu ảnh không được để trống.');
    }

    let base64Data: string;

    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
    if (match) {
      base64Data = match[2];
    } else {
      base64Data = trimmed.replace(/\s/g, '');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      throw new AvatarStorageError('Nội dung ảnh không hợp lệ.');
    }

    if (buffer.length > this.MAX_FILE_BYTES) {
      throw new AvatarStorageError('Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 5MB).');
    }

    // Magic bytes verification
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp =
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    let ext: string;
    if (isPng) {
      ext = 'png';
    } else if (isWebp) {
      ext = 'webp';
    } else if (isJpeg) {
      ext = 'jpg';
    } else {
      throw new AvatarStorageError('Định dạng ảnh không được hỗ trợ. Vui lòng tải ảnh định dạng JPEG, PNG hoặc WebP.');
    }

    const dir = staffAvatarMediaDir();
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const filename = `${randomUUID()}.${ext}`;
    const filePath = join(dir, filename);
    await writeFile(filePath, buffer, { flag: 'wx', mode: 0o600 });

    return {
      filename,
      photoUrl: `/api/staff/media/avatars/${filename}`,
    };
  }

  static async readAvatar(filename: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const safeName = basename(filename);
    if (!/^[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(safeName)) {
      throw new AvatarStorageError('Tên file không hợp lệ.');
    }

    const dir = staffAvatarMediaDir();
    const filePath = join(dir, safeName);
    const buffer = await readFile(filePath);

    let mimeType = 'image/jpeg';
    if (safeName.endsWith('.png')) mimeType = 'image/png';
    else if (safeName.endsWith('.webp')) mimeType = 'image/webp';

    return { buffer, mimeType };
  }
}

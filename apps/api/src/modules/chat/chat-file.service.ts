import crypto from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, sep } from 'node:path';
import { MosChatImageAttachment, UploadMosChatImageRequest, SafeAny } from '@mos-lab/shared';

export const MAX_CHAT_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB max per image
export const MAX_CHAT_FILE_BYTES = 25 * 1024 * 1024; // 25 MB max per file / PDF / document
export const CHAT_IMAGE_BODY_LIMIT = 35 * 1024 * 1024; // 35 MB body limit for base64 payload

export const CHAT_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'jpg',
  'image/heif': 'jpg',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/x-rar-compressed': 'rar',
  'application/x-7z-compressed': '7z',
};

export const EXT_TO_CHAT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
};

const execFileAsync = promisify(execFile);

export function workspaceRoot(): string {
  const cwd = process.cwd();
  return cwd.endsWith(`${sep}apps${sep}api`) ? resolve(cwd, '..', '..') : cwd;
}

export function mosChatMediaRoot(): string {
  const configured = String(process.env.MOS_CHAT_MEDIA_DIR || '').trim();
  if (configured) return resolve(configured);
  if (process.env.NODE_ENV === 'production') return '/home/web/mos-data/mos-chat-media';
  return resolve(workspaceRoot(), 'scratch', 'mos-chat-media');
}

export async function convertHeicToJpegBuffer(heicBuffer: Buffer): Promise<Buffer> {
  const rootDir = mosChatMediaRoot();
  await mkdir(rootDir, { recursive: true, mode: 0o700 });
  const uniqueId = `heic_conv_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const inPath = resolve(rootDir, `${uniqueId}.heic`);
  const outPath = resolve(rootDir, `${uniqueId}.jpg`);

  try {
    await writeFile(inPath, heicBuffer, { mode: 0o600 });

    // 1. Try heif-convert (Linux VPS standard)
    let convertedOk = false;
    try {
      await execFileAsync('heif-convert', ['-q', '90', inPath, outPath], { timeout: 20000 });
      convertedOk = true;
    } catch {
      // 2. Fallback to sips (macOS native)
      try {
        await execFileAsync('sips', ['-s', 'format', 'jpeg', inPath, '--out', outPath], { timeout: 20000 });
        convertedOk = true;
      } catch {
        // 3. Fallback to ffmpeg
        try {
          await execFileAsync('ffmpeg', ['-y', '-i', inPath, '-q:v', '2', outPath], { timeout: 20000 });
          convertedOk = true;
        } catch {
          // All conversion tools failed
        }
      }
    }

    if (!convertedOk) {
      throw new Error('Máy chủ không thể chuyển đổi tệp HEIC sang JPEG (thiếu heif-convert hoặc sips).');
    }

    const convertedBuf = await readFile(outPath);
    if (convertedBuf.length < 50) {
      throw new Error('Dữ liệu chuyển đổi tệp HEIC không hợp lệ.');
    }
    return convertedBuf;
  } finally {
    unlink(inPath).catch(() => {});
    unlink(outPath).catch(() => {});
  }
}

export async function decodeAndValidateChatFile(input: UploadMosChatImageRequest): Promise<{
  buffer: Buffer;
  finalMimeType: string;
  ext: string;
}> {
  const rawFileName = String(input.fileName || '').trim();
  const fileExtFromFileName = (rawFileName.split('.').pop() || '').toLowerCase();
  let mimeType = String(input.mimeType || '')
    .trim()
    .toLowerCase();

  if ((!mimeType || mimeType === 'application/octet-stream') && fileExtFromFileName in EXT_TO_CHAT_MIME) {
    mimeType = EXT_TO_CHAT_MIME[fileExtFromFileName];
  }

  let ext = CHAT_MIME_EXTENSIONS[mimeType] || (fileExtFromFileName in EXT_TO_CHAT_MIME ? fileExtFromFileName : '');
  if (!ext) {
    throw new Error(
      'Định dạng tệp không được hỗ trợ (hệ thống hỗ trợ PDF, Excel, Word, PowerPoint, TXT, CSV, ZIP và hình ảnh).'
    );
  }
  if (!mimeType || !(mimeType in CHAT_MIME_EXTENSIONS)) {
    mimeType = EXT_TO_CHAT_MIME[ext] || 'application/octet-stream';
  }

  const encoded = String(input.dataBase64 || '')
    .trim()
    .replace(/^data:[^;]+;base64,/i, '');
  const maxBytes = mimeType.startsWith('image/') ? MAX_CHAT_IMAGE_BYTES : MAX_CHAT_FILE_BYTES;
  if (!encoded || encoded.length > Math.ceil(maxBytes * 1.45)) {
    throw new Error(
      `Tệp quá lớn (tối đa ${mimeType.startsWith('image/') ? '8MB' : '25MB'}) hoặc dữ liệu tệp không hợp lệ.`
    );
  }
  let buffer = Buffer.from(encoded, 'base64');
  if (buffer.length <= 0 || buffer.length > maxBytes) {
    throw new Error(`Tệp quá lớn (tối đa ${mimeType.startsWith('image/') ? '8MB' : '25MB'}).`);
  }

  let finalMimeType = mimeType;
  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    const converted = await convertHeicToJpegBuffer(buffer);
    buffer = Buffer.from(converted);
    finalMimeType = 'image/jpeg';
    ext = 'jpg';
  } else if (mimeType.startsWith('image/')) {
    const isJpeg =
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[buffer.length - 2] === 0xff &&
      buffer[buffer.length - 1] === 0xd9;
    const isPng =
      buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp =
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    const isGif =
      buffer.length >= 6 &&
      (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a');

    if (
      (mimeType === 'image/jpeg' && !isJpeg) ||
      (mimeType === 'image/png' && !isPng) ||
      (mimeType === 'image/webp' && !isWebp) ||
      (mimeType === 'image/gif' && !isGif)
    ) {
      throw new Error('Nội dung tệp không khớp định dạng ảnh.');
    }
  } else if (ext === 'pdf' || mimeType === 'application/pdf') {
    const isPdf = buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    if (!isPdf) {
      throw new Error('Nội dung tệp không phải định dạng PDF hợp lệ.');
    }
    finalMimeType = 'application/pdf';
    ext = 'pdf';
  }

  return { buffer, finalMimeType, ext };
}

export function decodeAndValidateChatImage(input: UploadMosChatImageRequest): Buffer {
  if (!(input.mimeType in CHAT_MIME_EXTENSIONS)) {
    throw new Error('Định dạng ảnh không được hỗ trợ (chỉ hỗ trợ JPG, PNG, WebP, GIF, HEIC).');
  }
  const encoded = String(input.dataBase64 || '')
    .trim()
    .replace(/^data:image\/(?:jpeg|jpg|png|webp|gif|heic|heif);base64,/i, '')
    .replace(/^data:[^;]+;base64,/i, '');
  if (!encoded || encoded.length > Math.ceil(MAX_CHAT_IMAGE_BYTES * 1.4)) {
    throw new Error('Ảnh quá lớn (tối đa 8MB) hoặc dữ liệu ảnh không hợp lệ.');
  }
  const buffer = Buffer.from(encoded, 'base64');
  if (buffer.length <= 0 || buffer.length > MAX_CHAT_IMAGE_BYTES) {
    throw new Error('Ảnh quá lớn (tối đa 8MB).');
  }

  const isJpeg =
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[buffer.length - 2] === 0xff &&
    buffer[buffer.length - 1] === 0xd9;
  const isPng =
    buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  const isGif =
    buffer.length >= 6 &&
    (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a');
  const isHeic = buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';

  if (
    (input.mimeType === 'image/jpeg' && !isJpeg) ||
    (input.mimeType === 'image/png' && !isPng) ||
    (input.mimeType === 'image/webp' && !isWebp) ||
    (input.mimeType === 'image/gif' && !isGif) ||
    ((input.mimeType === 'image/heic' || input.mimeType === 'image/heif') && !isHeic)
  ) {
    throw new Error('Nội dung tệp không khớp định dạng ảnh.');
  }
  return buffer;
}

export function sanitizeChatAttachments(raw?: MosChatImageAttachment[]): MosChatImageAttachment[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw
    .slice(0, 12)
    .filter((item) => {
      if (!item || typeof item.url !== 'string') return false;
      const u = item.url.trim();
      // Never allow raw base64 data URLs inside crm_config JSON!
      if (u.startsWith('data:')) return false;
      return (
        u.startsWith('/api/chat/media/') ||
        u.startsWith('https://drive.google.com/') ||
        u.startsWith('https://lh3.googleusercontent.com/')
      );
    })
    .map((item) => {
      const itemAny = item as SafeAny;
      const ext = (item.fileExt || itemAny.ext || item.url.split('.').pop() || '').toLowerCase();
      const rawName = item.name || itemAny.fileName || (ext ? `file.${ext}` : 'document');
      const rawSize = Number(item.sizeBytes ?? itemAny.fileSize ?? 0);
      const fallbackMime =
        EXT_TO_CHAT_MIME[ext] ||
        (item.mimeType && item.mimeType in CHAT_MIME_EXTENSIONS ? item.mimeType : 'application/octet-stream');
      return {
        id: String(item.id || `att-${crypto.randomUUID().slice(0, 8)}`),
        url: item.url.trim(),
        name: String(rawName).slice(0, 150),
        mimeType: item.mimeType && item.mimeType in CHAT_MIME_EXTENSIONS ? item.mimeType : fallbackMime,
        sizeBytes: Math.max(0, rawSize || 0),
        width: item.width ? Number(item.width) : undefined,
        height: item.height ? Number(item.height) : undefined,
        source: item.source || 'upload',
        fileExt: ext || undefined,
      };
    });
}

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type { CreateBugReportAttachmentRequest } from '@mos-lab/shared';

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const MIME_EXTENSIONS: Record<CreateBugReportAttachmentRequest['mimeType'], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export class BugReportStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BugReportStorageError';
  }
}

function workspaceRoot(): string {
  const cwd = process.cwd();
  return cwd.endsWith(`${sep}apps${sep}api`) ? resolve(cwd, '..', '..') : cwd;
}

export function bugReportStorageRoot(): string {
  const configured = String(process.env.BUG_REPORT_MEDIA_DIR || '').trim();
  if (configured) return resolve(configured);
  if (process.env.NODE_ENV === 'production') return '/home/web/mos-data/bug-reports';
  return resolve(workspaceRoot(), 'scratch', 'bug-report-media');
}

function decodedImage(input: CreateBugReportAttachmentRequest): Buffer {
  if (!(input.mimeType in MIME_EXTENSIONS)) throw new BugReportStorageError('Định dạng ảnh không được hỗ trợ.');
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_ATTACHMENT_BYTES) {
    throw new BugReportStorageError('Mỗi ảnh phải nhỏ hơn hoặc bằng 3 MB.');
  }

  const encoded = String(input.dataBase64 || '')
    .trim()
    .replace(/^data:image\/(?:jpeg|png|webp);base64,/i, '');
  if (!encoded || encoded.length > Math.ceil(MAX_ATTACHMENT_BYTES * 1.38) || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new BugReportStorageError('Dữ liệu ảnh không hợp lệ.');
  }
  const buffer = Buffer.from(encoded, 'base64');
  if (buffer.length !== input.sizeBytes) throw new BugReportStorageError('Dung lượng ảnh không khớp.');

  const isJpeg =
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[buffer.length - 2] === 0xff &&
    buffer[buffer.length - 1] === 0xd9;
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp =
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (
    (input.mimeType === 'image/jpeg' && !isJpeg) ||
    (input.mimeType === 'image/png' && !isPng) ||
    (input.mimeType === 'image/webp' && !isWebp)
  ) {
    throw new BugReportStorageError('Nội dung file không khớp định dạng ảnh.');
  }
  return buffer;
}

function absoluteStoragePath(storagePath: string): string {
  const normalized = String(storagePath || '').replace(/\\/g, '/');
  if (!/^\d+\/[a-f0-9-]+\.(?:jpg|png|webp)$/.test(normalized)) {
    throw new BugReportStorageError('Đường dẫn ảnh không hợp lệ.');
  }
  const root = bugReportStorageRoot();
  const target = resolve(root, normalized);
  if (!target.startsWith(`${root}${sep}`)) throw new BugReportStorageError('Đường dẫn ảnh nằm ngoài kho lưu trữ.');
  return target;
}

export class BugReportStorage {
  static async save(reportId: number, input: CreateBugReportAttachmentRequest) {
    const buffer = decodedImage(input);
    const extension = MIME_EXTENSIONS[input.mimeType];
    const storagePath = `${reportId}/${randomUUID()}.${extension}`;
    const target = absoluteStoragePath(storagePath);
    await mkdir(resolve(target, '..'), { recursive: true, mode: 0o700 });
    await writeFile(target, buffer, { flag: 'wx', mode: 0o600 });
    return { storagePath, sizeBytes: buffer.length };
  }

  static async read(storagePath: string): Promise<Buffer> {
    return readFile(absoluteStoragePath(storagePath));
  }

  static async remove(storagePath: string): Promise<void> {
    await rm(absoluteStoragePath(storagePath), { force: true });
  }
}

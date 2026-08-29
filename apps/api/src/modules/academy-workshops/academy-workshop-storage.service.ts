import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AcademyWorkshopPhotoUploadIntent,
  AcademyWorkshopPublicMediaUploadResult,
  CreateAcademyWorkshopPublicMediaUploadRequest,
} from '@mos-lab/shared';
import WebSocket from 'ws';
import { AcademySalesError } from '../academy-sales/academy-sales.service.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
type SupabaseClientOptions = NonNullable<Parameters<typeof createClient>[2]>;
type RealtimeTransport = NonNullable<SupabaseClientOptions['realtime']>['transport'];
const nodeWebSocketTransport = WebSocket as unknown as RealtimeTransport;

let client: SupabaseClient | null = null;
let publicMediaBucketReady: Promise<void> | null = null;

function hasSupabaseStorageConfiguration() {
  return Boolean(
    String(process.env.ACADEMY_SUPABASE_URL || '').trim() &&
    String(process.env.ACADEMY_SUPABASE_SERVICE_KEY || '').trim()
  );
}

function storageClient() {
  const url = String(process.env.ACADEMY_SUPABASE_URL || '').trim();
  const serviceKey = String(process.env.ACADEMY_SUPABASE_SERVICE_KEY || '').trim();
  if (!url || !serviceKey) {
    throw new AcademySalesError('Supabase Storage cho Workshop chưa được cấu hình.', 503);
  }
  client ||= createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    // Supabase initializes Realtime with the client even though this service
    // only uses Storage. Node 20 needs an explicit WebSocket transport.
    realtime: { transport: nodeWebSocketTransport },
  });
  return client;
}

function privateStorage() {
  return storageClient().storage.from(process.env.ACADEMY_WORKSHOP_MEDIA_BUCKET || 'academy-workshop-media');
}

function publicMediaBucketName() {
  return String(process.env.ACADEMY_WORKSHOP_PUBLIC_MEDIA_BUCKET || 'academy-workshop-public-media').trim();
}

function publicMediaStorage() {
  return storageClient().storage.from(publicMediaBucketName());
}

function serverMediaDirectory() {
  const configured = String(process.env.ACADEMY_WORKSHOP_SERVER_MEDIA_DIR || '').trim();
  if (configured) return resolve(configured);
  const workspaceRoot = process.cwd();
  return existsSync(resolve(workspaceRoot, 'apps/web/public'))
    ? resolve(workspaceRoot, 'apps/web/public/academy/workshop-media')
    : resolve(workspaceRoot, '../web/public/academy/workshop-media');
}

function mediaBuffer(dataBase64: string, sizeBytes: number) {
  const encoded = String(dataBase64 || '')
    .trim()
    .replace(/^data:image\/(?:jpeg|png|webp);base64,/i, '');
  if (!encoded || encoded.length > Math.ceil(MAX_IMAGE_BYTES * 1.37) || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new AcademySalesError('Dữ liệu ảnh tải lên không hợp lệ.');
  }
  const buffer = Buffer.from(encoded, 'base64');
  if (!buffer.length || buffer.length !== sizeBytes) {
    throw new AcademySalesError('Dung lượng ảnh tải lên không khớp.');
  }
  return buffer;
}

async function ensurePublicMediaBucket() {
  if (publicMediaBucketReady) return publicMediaBucketReady;

  publicMediaBucketReady = (async () => {
    const supabase = storageClient();
    const bucketName = publicMediaBucketName();
    if (!bucketName) throw new AcademySalesError('Tên kho ảnh công khai Workshop chưa được cấu hình.', 503);

    const existing = await supabase.storage.getBucket(bucketName);
    if (existing.error) {
      if (String(existing.error.statusCode || '') !== '404') {
        throw new AcademySalesError(`Không thể kiểm tra kho ảnh Workshop: ${existing.error.message}`, 502);
      }
      const created = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: MAX_IMAGE_BYTES,
        allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
      });
      if (created.error && !/already exists|duplicate/i.test(created.error.message)) {
        throw new AcademySalesError(`Không thể tạo kho ảnh Workshop: ${created.error.message}`, 502);
      }
    }

    const verified = await supabase.storage.getBucket(bucketName);
    if (verified.error || !verified.data) {
      throw new AcademySalesError(
        `Không thể xác nhận kho ảnh Workshop: ${verified.error?.message || 'Storage error'}`,
        502
      );
    }
    if (!verified.data.public) {
      throw new AcademySalesError(
        `Kho ảnh “${bucketName}” phải ở chế độ public để học viên xem được ảnh món và dụng cụ.`,
        503
      );
    }
  })().catch((cause) => {
    publicMediaBucketReady = null;
    throw cause;
  });

  return publicMediaBucketReady;
}

function extension(fileName: string, mimeType: string) {
  const original = String(fileName || '')
    .toLowerCase()
    .match(/\.(jpe?g|png|webp)$/)?.[1];
  if (original) return original === 'jpeg' ? 'jpg' : original;
  return mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
}

export class AcademyWorkshopStorageService {
  static validateImage(mimeType: string, sizeBytes: number) {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new AcademySalesError('Ảnh phải là JPEG, PNG hoặc WebP.');
    if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_IMAGE_BYTES) {
      throw new AcademySalesError('Ảnh sau nén phải nhỏ hơn hoặc bằng 5MB.');
    }
  }

  static async createUploadIntent(
    workshopId: number,
    participantId: number,
    fileName: string,
    mimeType: string,
    sizeBytes: number
  ): Promise<AcademyWorkshopPhotoUploadIntent> {
    this.validateImage(mimeType, sizeBytes);
    const storagePath = `workshops/${workshopId}/participants/${participantId}/${randomUUID()}.${extension(fileName, mimeType)}`;
    const { data, error } = await privateStorage().createSignedUploadUrl(storagePath, { upsert: false });
    if (error || !data)
      throw new AcademySalesError(`Không thể cấp URL tải ảnh: ${error?.message || 'Storage error'}`, 502);
    return {
      storagePath,
      signedUrl: data.signedUrl,
      token: data.token,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    };
  }

  static async verifyObject(
    workshopId: number,
    participantId: number,
    storagePath: string,
    mimeType: string,
    sizeBytes: number
  ) {
    this.validateImage(mimeType, sizeBytes);
    const prefix = `workshops/${workshopId}/participants/${participantId}/`;
    if (!storagePath.startsWith(prefix)) throw new AcademySalesError('Đường dẫn ảnh không thuộc học viên này.', 403);
    const { data, error } = await privateStorage().info(storagePath);
    if (error || !data) throw new AcademySalesError('Không tìm thấy ảnh đã tải lên Storage.', 409);
    const actualSize = Math.round(Number(data.size) || 0);
    const actualMime = String(data.metadata?.mimetype || data.metadata?.contentType || '').toLowerCase();
    if (actualSize !== sizeBytes || (actualMime && actualMime !== mimeType.toLowerCase())) {
      throw new AcademySalesError('Metadata ảnh tải lên không khớp yêu cầu ban đầu.', 409);
    }
  }

  static async signedViewUrl(storagePath: string) {
    const { data, error } = await privateStorage().createSignedUrl(storagePath, 5 * 60);
    if (error || !data) return null;
    return data.signedUrl;
  }

  static async uploadPublicMedia(
    workshopId: number,
    area: 'menu-items' | 'equipment-images' | 'hero-images' | 'quiz-images',
    input: CreateAcademyWorkshopPublicMediaUploadRequest
  ): Promise<AcademyWorkshopPublicMediaUploadResult> {
    this.validateImage(input.mimeType, input.sizeBytes);
    const buffer = mediaBuffer(input.dataBase64, input.sizeBytes);
    const storagePath = `workshops/${workshopId}/${area}/${randomUUID()}.${extension(input.fileName, input.mimeType)}`;

    if (hasSupabaseStorageConfiguration()) {
      await ensurePublicMediaBucket();
      const media = publicMediaStorage();
      const { error } = await media.upload(storagePath, buffer, {
        contentType: input.mimeType,
        cacheControl: '31536000',
        upsert: false,
      });
      if (error) throw new AcademySalesError(`Không thể lưu ảnh lên Academy Media: ${error.message}`, 502);
      const { data: publicUrl } = media.getPublicUrl(storagePath);
      return { storagePath, publicUrl: publicUrl.publicUrl };
    }

    const mediaDirectory = resolve(serverMediaDirectory(), storagePath);
    await mkdir(resolve(mediaDirectory, '..'), { recursive: true });
    await writeFile(mediaDirectory, buffer, { flag: 'wx' });
    return { storagePath, publicUrl: `/academy/workshop-media/${storagePath}` };
  }
}

import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AcademyWorkshopPhotoUploadIntent } from '@mos-lab/shared';
import { AcademySalesError } from '../academy-sales/academy-sales.service.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

let client: SupabaseClient | null = null;

function storage() {
  const url = String(process.env.ACADEMY_SUPABASE_URL || '').trim();
  const serviceKey = String(process.env.ACADEMY_SUPABASE_SERVICE_KEY || '').trim();
  if (!url || !serviceKey) {
    throw new AcademySalesError('Supabase Storage cho Workshop chưa được cấu hình.', 503);
  }
  client ||= createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client.storage.from(process.env.ACADEMY_WORKSHOP_MEDIA_BUCKET || 'academy-workshop-media');
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
    const { data, error } = await storage().createSignedUploadUrl(storagePath, { upsert: false });
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
    const { data, error } = await storage().info(storagePath);
    if (error || !data) throw new AcademySalesError('Không tìm thấy ảnh đã tải lên Storage.', 409);
    const actualSize = Math.round(Number(data.size) || 0);
    const actualMime = String(data.metadata?.mimetype || data.metadata?.contentType || '').toLowerCase();
    if (actualSize !== sizeBytes || (actualMime && actualMime !== mimeType.toLowerCase())) {
      throw new AcademySalesError('Metadata ảnh tải lên không khớp yêu cầu ban đầu.', 409);
    }
  }

  static async signedViewUrl(storagePath: string) {
    const { data, error } = await storage().createSignedUrl(storagePath, 5 * 60);
    if (error || !data) return null;
    return data.signedUrl;
  }
}

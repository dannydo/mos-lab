import type { SopPrepCriterionData, SopPrepEvidenceFile, SopPrepFileType } from '@mos-lab/shared';

export interface SopPrepCategory1DetailViewProps {
  onBack: () => void;
}

export const SOP_PREP_PILOT_CODE = 'DARK_LASHES';
export const SOP_PREP_AUTHOR_NAME = 'Cô Giang Phạm';
export const SOP_PREP_CRITERIA_TOTAL = 5;
export const DEFAULT_UPLOAD_ORIGIN = 'Ca Pilot thực tế';
export const FALLBACK_EVIDENCE_URL = '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg';

export const UPLOAD_ORIGIN_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Ca Pilot thực tế', value: 'Ca Pilot thực tế' },
  { label: 'Hồ sơ đào tạo', value: 'Hồ sơ đào tạo' },
  { label: 'Ảnh chụp lâm sàng', value: 'Ảnh chụp lâm sàng' },
  { label: 'Tài liệu kỹ thuật', value: 'Tài liệu kỹ thuật' },
];

export function formatSopPrepFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getTotalEvidenceCount(criteria: SopPrepCriterionData[]): number {
  return criteria.reduce((acc, c) => acc + (c.evidenceFiles?.length || 0), 0);
}

export function inferEvidenceFileType(file: File): SopPrepFileType {
  const lowerName = file.name.toLowerCase();
  if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/.test(lowerName)) {
    return 'image';
  }
  if (file.type.startsWith('video/') || /\.(mp4|webm|mov|avi)$/.test(lowerName)) {
    return 'video';
  }
  if (/\.(pdf|doc|docx|txt)$/.test(lowerName) || file.type.includes('pdf')) {
    return 'document';
  }
  return 'other';
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function buildLocalFallbackEvidenceFile(params: {
  file: File;
  fileBase64: string;
  description: string;
  sourceOrigin: string;
  pilotSessionCode: string;
  uploadedBy?: string;
}): SopPrepEvidenceFile {
  const { file, fileBase64, description, sourceOrigin, pilotSessionCode, uploadedBy = SOP_PREP_AUTHOR_NAME } = params;

  return {
    id: `ev-${Date.now()}`,
    name: file.name,
    url: fileBase64.startsWith('data:image/') ? fileBase64 : FALLBACK_EVIDENCE_URL,
    fileType: inferEvidenceFileType(file),
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    description: description.trim() || `Tệp minh chứng tải lên bởi ${uploadedBy}`,
    sourceOrigin: sourceOrigin.trim() || DEFAULT_UPLOAD_ORIGIN,
    pilotSessionCode: pilotSessionCode.trim() || undefined,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
  };
}

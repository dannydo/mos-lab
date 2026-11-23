import type { DarkLashesSessionStatus, PilotSession } from '@mos-lab/shared';

export interface PilotFlowDrawerProps {
  open: boolean;
  session: PilotSession | null;
  onClose: () => void;
  onSessionUpdated: (updated: PilotSession) => void;
}

export type PilotPhotoUploadType = 'before' | 'after' | 'macro';

export type PilotCriterionEvaluationMap = Record<number, { passed: boolean; note: string }>;

export interface SavePilotAssessmentOptions {
  overrideResult?: 'PASS' | 'FAIL';
  overrideReason?: string;
  overrideNotes?: string;
}

export interface PilotFlowStatusStep {
  key: DarkLashesSessionStatus;
  label: string;
  shortLabel: string;
  stepNumber: number;
}

export const PILOT_FLOW_STATUS_STEPS: PilotFlowStatusStep[] = [
  { key: 'BOOKED', label: '1. Đã đặt lịch (Booked)', shortLabel: 'Booked', stepNumber: 1 },
  { key: 'CHECKED_IN', label: '2. Đã đến shop (Checked-in)', shortLabel: 'Check-in', stepNumber: 2 },
  { key: 'ASSESSED', label: '3. Tư vấn & Đánh giá (Assessed)', shortLabel: 'Đánh giá', stepNumber: 3 },
  { key: 'BEFORE_PHOTO', label: '4. Ảnh trước khi làm (Before Photo)', shortLabel: 'Before Photo', stepNumber: 4 },
  { key: 'SERVICE_DONE', label: '5. Đã làm xong (Service Done)', shortLabel: 'Service Done', stepNumber: 5 },
  { key: 'AFTER_PHOTO', label: '6. Ảnh sau khi làm (After Photo)', shortLabel: 'After Photo', stepNumber: 6 },
  { key: 'FEEDBACK_DONE', label: '7. Khách đánh giá (Feedback Done)', shortLabel: 'Feedback', stepNumber: 7 },
  { key: 'CHECKED_OUT', label: '8. Đã ra về (Checked-out)', shortLabel: 'Check-out', stepNumber: 8 },
];

export const FEEDBACK_RATING_LABELS: Record<number, string> = {
  5: '🌟 Rất hài lòng / Tuyệt vời',
  4: '👍 Hài lòng',
  3: '😐 Bình thường',
  2: '👎 Chưa hài lòng',
  1: '⚠️ Rất không hài lòng',
};

export function getPilotFlowStatusIndex(status: DarkLashesSessionStatus): number {
  if (status === 'INELIGIBLE') return 2;
  const idx = PILOT_FLOW_STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export function getPilotErrorMessage(err: unknown, fallback: string, includeErrorMessage = false): string {
  const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
  if (apiErr?.response?.data?.message) return apiErr.response.data.message;
  if (includeErrorMessage && apiErr?.message) return apiErr.message;
  return fallback;
}

export async function compressPilotImage(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return reject(new Error('Không thể đọc tệp ảnh.'));
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(result);
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(result);
        }
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

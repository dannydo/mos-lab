import type { AcademyWorkshopMenuCategory, AcademyWorkshopPublicRegistrationInfo } from '@mos-lab/shared';
import {
  REGISTRATION_DRAFT_VERSION,
  type RegistrationFormValues,
  type WorkshopRegistrationDraft,
} from './registrationTypes';

export function draftText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.slice(0, maxLength) : undefined;
}

export function draftSelectionId(value: unknown) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export function registrationDraft(values: Partial<RegistrationFormValues>): WorkshopRegistrationDraft {
  const menuSelections: Partial<Record<AcademyWorkshopMenuCategory, number>> = {};
  for (const [category, itemId] of Object.entries(values.menuSelections || {})) {
    const normalizedItemId = draftSelectionId(itemId);
    if (normalizedItemId) menuSelections[category as AcademyWorkshopMenuCategory] = normalizedItemId;
  }

  return {
    version: REGISTRATION_DRAFT_VERSION,
    name: draftText(values.name, 160),
    phone: draftText(values.phone, 32),
    email: draftText(values.email, 320),
    goal: draftText(values.goal, 2_000),
    referrer: draftText(values.referrer, 300),
    equipmentPackageId: draftSelectionId(values.equipmentPackageId),
    designItemId: draftSelectionId(values.designItemId),
    menuSelections: Object.keys(menuSelections).length ? menuSelections : undefined,
  };
}

export function hasRegistrationDraftContent(draft: WorkshopRegistrationDraft) {
  return Boolean(
    draft.name?.trim() ||
    draft.phone?.trim() ||
    draft.email?.trim() ||
    draft.goal?.trim() ||
    draft.referrer?.trim() ||
    draft.equipmentPackageId ||
    draft.designItemId ||
    Object.keys(draft.menuSelections || {}).length
  );
}

export function readRegistrationDraft(serialized: string | null): Partial<RegistrationFormValues> | null {
  if (!serialized) return null;

  try {
    const raw = JSON.parse(serialized) as Record<string, unknown>;
    if (!raw || raw.version !== REGISTRATION_DRAFT_VERSION) return null;

    const draft = registrationDraft({
      name: raw.name as string | undefined,
      phone: raw.phone as string | undefined,
      email: raw.email as string | undefined,
      goal: raw.goal as string | undefined,
      referrer: raw.referrer as string | undefined,
      equipmentPackageId: raw.equipmentPackageId as number | undefined,
      designItemId: raw.designItemId as number | undefined,
      menuSelections: raw.menuSelections as Partial<Record<AcademyWorkshopMenuCategory, number>> | undefined,
    });

    if (!hasRegistrationDraftContent(draft)) return null;
    const { version: _version, ...values } = draft;
    return values;
  } catch {
    return null;
  }
}

export function failureMessage(cause: unknown, fallback: string) {
  return (
    (cause as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
    (cause as Error)?.message ||
    fallback
  );
}

export function formatFee(feeVnd: number) {
  return feeVnd > 0 ? `${new Intl.NumberFormat('vi-VN').format(Math.round(feeVnd))} đ` : 'Miễn phí';
}

export function equipmentEffectivePriceLabel(pkg: { effectivePriceVnd: number; isIncludedInFee: boolean }) {
  if (pkg.effectivePriceVnd === 0) {
    return pkg.isIncludedInFee ? 'Đã bao gồm trong học phí (0 đ)' : '0 đ (Không phát sinh)';
  }
  return `+${formatFee(pkg.effectivePriceVnd)}`;
}

export function formatAgendaDuration(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} giờ ${remainingMinutes} phút` : `${hours} giờ`;
}

export function formatCompactAgendaDuration(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}p`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}p` : `${hours}h`;
}

export function formatSelectionChangeCountdown(totalSeconds: number) {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  const paddedHours = String(hours).padStart(2, '0');
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(remainingSeconds).padStart(2, '0');

  return days > 0
    ? `${days} ngày ${paddedHours}:${paddedMinutes}:${paddedSeconds}`
    : `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
}

export function googleProfile(credential: string): { name: string; email: string } {
  try {
    const segment = credential.split('.')[1];
    if (!segment) return { name: '', email: '' };
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (value) => value.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { name?: unknown; email?: unknown };
    return {
      name: String(payload.name || '').trim(),
      email: String(payload.email || '')
        .trim()
        .toLowerCase(),
    };
  } catch {
    return { name: '', email: '' };
  }
}

export function zaloProfile(ticket: string): { name: string } {
  try {
    const segment = ticket.split('.')[1];
    if (!segment) return { name: '' };
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (value) => value.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { name?: unknown };
    return { name: String(payload.name || '').trim() };
  } catch {
    return { name: '' };
  }
}

export function phaseCopy(info: AcademyWorkshopPublicRegistrationInfo) {
  switch (info.phase) {
    case 'CHECKIN':
      return {
        type: 'success' as const,
        title: 'Workshop đã mở check-in',
        description: 'Nếu bạn đã đăng ký, hãy vào lobby để xác minh và bắt đầu trải nghiệm workshop.',
        action: 'Vào check-in',
      };
    case 'LIVE':
      return {
        type: 'info' as const,
        title: 'Workshop đang diễn ra',
        description: 'Bạn có thể vào lobby để xác minh danh tính và theo dõi nội dung đang diễn ra.',
        action: 'Vào workshop',
      };
    case 'COMPLETED':
      return {
        type: 'success' as const,
        title: 'Workshop đã hoàn thành',
        description: 'Cảm ơn bạn đã quan tâm. Academy sẽ liên hệ về các buổi học tiếp theo.',
        action: null,
      };
    default:
      return {
        type: 'warning' as const,
        title: 'Đăng ký hiện đang đóng',
        description: 'Vui lòng liên hệ Academy nếu bạn cần được hỗ trợ thêm.',
        action: null,
      };
  }
}

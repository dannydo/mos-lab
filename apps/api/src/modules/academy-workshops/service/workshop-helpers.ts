import { createHash, randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import {
  removeVietnameseTones,
  ACADEMY_WORKSHOP_AGENDA_KINDS,
  ACADEMY_WORKSHOP_MENU_CATEGORIES,
  type AcademyWorkshopAgendaItem,
  type AcademyWorkshopDesignDifficultyLevel,
  type AcademyWorkshopMenuCategory,
  type AcademyWorkshopZaloTemplate,
  type SafeAny,
  type UpsertAcademyWorkshopAgendaItemRequest,
} from '@mos-lab/shared';
import {
  AcademySalesError,
  canManageAcademySales,
  type AcademyActor,
} from '../../academy-sales/academy-sales.service.js';

export const WORKSHOP_STATUSES = new Set([
  'DRAFT',
  'SCHEDULED',
  'CHECKIN_OPEN',
  'LIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
]);
export const AGENDA_KINDS = new Set<string>(ACADEMY_WORKSHOP_AGENDA_KINDS);
export const MENU_CATEGORIES = new Set<AcademyWorkshopMenuCategory>(ACADEMY_WORKSHOP_MENU_CATEGORIES);
export const MENU_CATEGORY_ORDER = new Map<AcademyWorkshopMenuCategory, number>(
  ACADEMY_WORKSHOP_MENU_CATEGORIES.map((category, index) => [category, index])
);

export const ACADEMY_WORKSHOP_ZALO_TEMPLATES_KEY = 'ACADEMY_WORKSHOP_ZALO_TEMPLATES';

export const DEFAULT_ACADEMY_WORKSHOP_ZALO_TEMPLATES: AcademyWorkshopZaloTemplate[] = [
  {
    id: 'confirm',
    title: '1. Xác nhận giữ chỗ',
    isDefault: true,
    content: `Dạ em chào chị {{ten_hoc_vien}}! ❤️
Academy xin gửi chị thông tin chi tiết tham dự Workshop: {{ten_workshop}}.

⏰ Thời gian: {{thoi_gian}}
📍 Địa điểm: {{dia_diem}}
🅿️ Hướng dẫn gửi xe: Quý khách gửi xe tại tầng hầm tòa nhà và đi thang máy lên khu vực sảnh Workshop.
🍽️ Suất ăn đã chọn: {{suat_an}}
🧰 Dụng cụ thực hành: {{dung_cu}}

📲 Mã QR tự check-in vào lớp của chị:
{{qr_link}}

(Chị nhớ lưu lại tin nhắn này để quét điểm danh tại bàn lễ tân và tham gia game đố vui nhận quà trên màn hình lớn nhé ạ)

Chúc chị có một buổi trải nghiệm thật nhiều giá trị cùng Master và các bạn học viên!`,
  },
  {
    id: 'remind',
    title: '2. Nhắc lịch trước 24h',
    isDefault: true,
    content: `Chị {{ten_hoc_vien}} ơi! Ngày mai là buổi Workshop {{ten_workshop}} rồi ạ! ✨

⏰ Thời gian đón khách: {{gio_don_khach}} (Bắt đầu lúc {{gio_bat_dau}})
📍 Địa điểm: {{dia_diem}}

💡 Lưu ý nhỏ:
- Giảng viên đã chuẩn bị sẵn giáo trình và cốp đồ nghề cho chị.
- Chị nhớ đến sớm 10-15 phút để thưởng thức đồ uống chào mừng và nhận thẻ đeo nhé!

📲 Link check-in cá nhân của chị:
{{qr_link}}

Hẹn gặp chị ngày mai ạ! ❤️`,
  },
  {
    id: 'thanks',
    title: '3. Cảm ơn sau lớp',
    isDefault: true,
    content: `Dạ em chào chị {{ten_hoc_vien}}!
Cảm ơn chị đã dành trọn vẹn thời gian tham gia Workshop {{ten_workshop}} hôm nay. ❤️

Hy vọng chị đã có những trải nghiệm thật tuyệt vời và nắm vững các kỹ thuật mi chuyên sâu từ Master.
Em gửi lại chị lộ trình đào tạo chuyên sâu và ưu đãi đặc quyền dành riêng cho học viên tham dự workshop. Nếu có bất kỳ thắc mắc kỹ thuật nào trong quá trình thực hành, chị cứ nhắn em hỗ trợ ngay nhé ạ!`,
  },
];

export const STAFF_SELECT = { id: true, displayName: true, email: true };

export const PARTICIPANT_INCLUDE: SafeAny = {
  campaignLead: { include: { lead: true } },
  infoSentBy: { select: STAFF_SELECT },
  attendanceConfirmedBy: { select: STAFF_SELECT },
  checkedInBy: { select: STAFF_SELECT },
  primaryInstructor: { include: { staff: { select: { avatarUrl: true } } } },
  feePayments: { include: { confirmedBy: { select: STAFF_SELECT } }, orderBy: [{ receivedAt: 'desc' }] },
  photos: { include: { capturedBy: { select: STAFF_SELECT } }, orderBy: [{ capturedAt: 'desc' }] },
  menuSelections: { orderBy: [{ category: 'asc' }, { id: 'asc' }] },
  equipmentSelection: true,
  designSelection: true,
  assessments: {
    include: { payments: { select: { amountVnd: true } } },
    orderBy: [{ updatedAt: 'desc' }],
  },
  answers: { select: { score: true, responseTimeMs: true } },
  rewards: { select: { status: true } },
  instructorBonuses: { select: { amountVnd: true, status: true } },
};

export const WORKSHOP_INCLUDE: SafeAny = {
  campaign: true,
  parentWorkshop: { include: { campaign: true } },
  agendaTemplate: { include: { items: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } } },
  menuTemplate: { include: { items: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } } },
  equipmentTemplate: {
    include: {
      packages: {
        include: { images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
    },
  },
  designTemplate: {
    include: {
      items: {
        include: { images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
    },
  },
  agendaItems: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
  menuItems: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
  equipmentPackages: {
    include: { images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  designs: {
    include: { images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  quizzes: {
    where: { isTemplate: false },
    include: {
      sourceTemplate: { select: { id: true, title: true } },
      questions: {
        include: { options: { orderBy: { sortOrder: 'asc' as const } } },
        orderBy: { sortOrder: 'asc' as const },
      },
    },
    orderBy: { updatedAt: 'desc' as const },
  },
  participants: { include: PARTICIPANT_INCLUDE },
};

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function isPrivateLanIpv4(address: string): boolean {
  if (/^10\./.test(address) || /^192\.168\./.test(address)) return true;
  const match = address.match(/^172\.(\d{1,2})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

export function resolveAcademyWorkshopPublicOrigin(
  configuredUrl = process.env.ACADEMY_WORKSHOP_PUBLIC_URL,
  nodeEnv = process.env.NODE_ENV,
  interfaces = networkInterfaces()
): string {
  const configured = String(configuredUrl || '').trim();
  if (configured) return configured.replace(/\/$/, '');

  if (nodeEnv !== 'production') {
    const preferredInterfaces = Object.entries(interfaces)
      .filter(([name]) => /^(en\d+|wlan\d+|eth\d+)$/.test(name))
      .sort(([left], [right]) => {
        const priority = (name: string) => (['en0', 'wlan0', 'eth0'].includes(name) ? 0 : 1);
        return priority(left) - priority(right) || left.localeCompare(right);
      });

    for (const [, addresses] of preferredInterfaces) {
      const lanAddress = addresses?.find(
        (entry) => entry.family === 'IPv4' && !entry.internal && isPrivateLanIpv4(entry.address)
      );
      if (lanAddress) return `http://${lanAddress.address}:4000`;
    }
  }

  return 'http://localhost:4000';
}

export function parseDate(value: unknown, label: string, nullable = false): Date | null {
  if ((value === null || value === undefined || String(value).trim() === '') && nullable) return null;
  const raw = String(value || '').trim();
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw) ? `${raw}+07:00` : raw);
  if (!Number.isFinite(parsed.getTime())) throw new AcademySalesError(`${label} không hợp lệ.`);
  return parsed;
}

export function selectionDeadline(value: unknown, label: string, startsAt: Date): Date | null {
  const deadline = parseDate(value, label, true);
  if (deadline && deadline > startsAt) {
    throw new AcademySalesError(`${label} phải trước hoặc đúng giờ bắt đầu workshop.`);
  }
  return deadline;
}

/** The workshop schedule always ends when its planned agenda ends. */
export function calculateAcademyWorkshopEndsAtFromAgenda(
  startsAt: Date,
  agenda: ReadonlyArray<Pick<AcademyWorkshopAgendaItem, 'plannedDurationSeconds'>>
): Date {
  const plannedSeconds = agenda.reduce(
    (total, item) => total + Math.max(0, Math.round(Number(item.plannedDurationSeconds) || 0)),
    0
  );
  return new Date(startsAt.getTime() + plannedSeconds * 1_000);
}

export function normalizeHeroImageUrl(value: unknown): string | null {
  const imageUrl = String(value ?? '').trim();
  if (!imageUrl) return null;
  if (imageUrl.length > 512) {
    throw new AcademySalesError('URL banner hero không được dài quá 512 ký tự.', 400);
  }
  if (!imageUrl.startsWith('/') && !/^https?:\/\//i.test(imageUrl)) {
    throw new AcademySalesError('URL banner hero phải là đường dẫn nội bộ hoặc URL http(s).', 400);
  }
  return imageUrl;
}

export function slugify(value: string) {
  return removeVietnameseTones(value)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function positiveId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AcademySalesError(`${label} không hợp lệ.`);
  return id;
}

export function assignedStaffIds(value: string | null | undefined) {
  return Array.from(
    new Set(
      parseJson<unknown[]>(value, [])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );
}

export function staff(row: SafeAny) {
  return row ? { id: Number(row.id), displayName: String(row.displayName), email: row.email ?? null } : null;
}

export function instructor(row: SafeAny) {
  if (!row) return null;
  return {
    id: Number(row.id),
    code: String(row.code),
    staffId: row.staffId == null ? null : Number(row.staffId),
    displayName: String(row.displayName),
    description: row.description ?? null,
    avatarUrl: row.avatarUrl ?? row.staff?.avatarUrl ?? null,
    surchargePercent: Math.max(0, Math.round(Number(row.surchargePercent) || 0)),
    isActive: Boolean(row.isActive),
    sortOrder: Math.max(0, Math.round(Number(row.sortOrder) || 0)),
  };
}

export function hashQr(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function issueQrToken() {
  return randomBytes(32).toString('base64url');
}

export function displayCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}

export function registrationCode() {
  return randomBytes(18).toString('base64url');
}

export function menuCategory(value: unknown): AcademyWorkshopMenuCategory {
  if (!MENU_CATEGORIES.has(value as AcademyWorkshopMenuCategory)) {
    throw new AcademySalesError('Nhóm món ăn không hợp lệ.');
  }
  return value as AcademyWorkshopMenuCategory;
}

export function equipmentItems(value: unknown): string[] {
  const items = Array.isArray(value) ? value : parseJson<unknown[]>(String(value || ''), []);
  return Array.from(
    new Set(
      items
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => item.slice(0, 180))
    )
  );
}

export function normalizeDifficultyLevel(value: unknown): AcademyWorkshopDesignDifficultyLevel {
  const level = String(value || '')
    .trim()
    .toUpperCase();
  if (level === 'ADVANCED' || level === 'MASTER') return level;
  return 'BASIC';
}

export function canManage(actor: AcademyActor) {
  return canManageAcademySales(actor);
}

export function assertVisible(actor: AcademyActor, campaign: SafeAny) {
  if (canManage(actor)) return;
  if (!assignedStaffIds(campaign.assignedStaffIds).includes(actor.id)) {
    throw new AcademySalesError('Bạn không được phân công vào workshop này.', 403);
  }
}

export function normalizeAgenda(input: UpsertAcademyWorkshopAgendaItemRequest[]) {
  return input.map((item, index) => {
    const title = String(item.title || '').trim();
    const plannedDurationSeconds = Math.round(Number(item.plannedDurationSeconds));
    if (!title || !AGENDA_KINDS.has(item.kind) || plannedDurationSeconds < 30 || plannedDurationSeconds > 8 * 60 * 60) {
      throw new AcademySalesError(`Agenda #${index + 1} không hợp lệ.`);
    }
    return {
      title,
      description: String(item.description || '').trim() || null,
      kind: item.kind,
      plannedDurationSeconds,
      sortOrder: item.sortOrder === undefined ? index + 1 : Math.max(0, Math.round(item.sortOrder)),
    };
  });
}

export function assertCanEditAgenda(actor: AcademyActor) {
  if (!canManage(actor) && actor.academyAccess !== true) {
    throw new AcademySalesError('Chỉ Admin, Quản lý hoặc staff được phân công mới được sửa agenda.', 403);
  }
}

export function assertAgendaStructureEditable(row: SafeAny) {
  if (row.agendaItems.some((item: SafeAny) => item.status !== 'PENDING')) {
    throw new AcademySalesError('Không thể thay cấu trúc agenda sau khi workshop đã chạy.', 409);
  }
}

export async function syncAgendaDrivenEndsAt(tx: SafeAny, row: SafeAny, agenda: SafeAny[]) {
  const endsAt = calculateAcademyWorkshopEndsAtFromAgenda(new Date(row.startsAt), agenda);
  if (endsAt <= new Date(row.startsAt)) {
    throw new AcademySalesError('Agenda workshop cần có ít nhất một mục có thời lượng.');
  }
  await Promise.all([
    tx.crmAcademyWorkshop.update({ where: { id: row.id }, data: { endsAt } }),
    tx.crmAcademyCampaign.update({ where: { id: row.campaignId }, data: { endDate: endsAt } }),
  ]);
  return endsAt;
}

export function agendaItemIdForResource(row: SafeAny, agendaItemId: number | null) {
  if (agendaItemId == null) return null;
  const itemId = positiveId(agendaItemId, 'Mục agenda');
  if (!row.agendaItems.some((item: SafeAny) => Number(item.id) === itemId)) {
    throw new AcademySalesError('Mục agenda không thuộc workshop này.', 404);
  }
  return itemId;
}

export function assertCanEditWorkshopMedia(actor: AcademyActor) {
  if (!canManage(actor) && actor.academyAccess !== true) {
    throw new AcademySalesError('Chỉ Admin, Quản lý hoặc staff được phân công mới được sửa hình ảnh workshop.', 403);
  }
}

export function assertCanEditMenu(actor: AcademyActor) {
  if (!canManage(actor) && actor.academyAccess !== true) {
    throw new AcademySalesError('Chỉ Admin, Quản lý hoặc staff được phân công mới được sửa thực đơn.', 403);
  }
}

export function assertCanEditEquipment(actor: AcademyActor) {
  if (!canManage(actor) && actor.academyAccess !== true) {
    throw new AcademySalesError('Chỉ Admin, Quản lý hoặc staff được phân công mới được sửa bộ dụng cụ.', 403);
  }
}

export function assertCanEditDesign(actor: AcademyActor) {
  if (!canManage(actor) && actor.academyAccess !== true) {
    throw new AcademySalesError('Chỉ Admin, Quản lý hoặc staff được phân công mới được sửa mẫu thiết kế mi.', 403);
  }
}

export function normalizeEquipmentImage(input: { imageUrl: unknown; altText?: unknown }) {
  const imageUrl = String(input.imageUrl || '').trim();
  const altText = String(input.altText || '').trim() || null;
  if (!imageUrl || imageUrl.length > 512 || !/^(https?:\/\/|\/)/i.test(imageUrl)) {
    throw new AcademySalesError('Đường dẫn ảnh phải bắt đầu bằng https://, http:// hoặc /.');
  }
  if (altText && altText.length > 180) throw new AcademySalesError('Mô tả ảnh tối đa 180 ký tự.');
  return { imageUrl, altText };
}

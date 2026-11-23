import type { AcademyStaffOption } from '../academy-sales.js';
import type { AcademyTalentInstructor } from '../academy-talent-assessment.js';
import type { ActionResponse, PageQuery, PageResponse } from '../api.js';
import type {
  AcademyInstructorBonusStatus,
  AcademyWorkshopAgendaItem,
  AcademyWorkshopAgendaKind,
  AcademyWorkshopAgendaTemplate,
  AcademyWorkshopAttendanceStatus,
  AcademyWorkshopDetail,
  AcademyWorkshopEquipmentTemplate,
  AcademyWorkshopFeeMethod,
  AcademyWorkshopFeeStatus,
  AcademyWorkshopListItem,
  AcademyWorkshopMenuCategory,
  AcademyWorkshopMenuTemplate,
  AcademyWorkshopParticipant,
  AcademyWorkshopQuestionType,
  AcademyWorkshopQuiz,
  AcademyWorkshopRewardRule,
  AcademyWorkshopRewardStatus,
  AcademyWorkshopStatus,
  AcademyWorkshopSummary,
} from './workshop-entities.types.js';
import type {
  AcademyInstructorBonus,
  AcademyWorkshopMenuSelectionInput,
  AcademyWorkshopReward,
} from './workshop-live-and-public.types.js';

export interface CreateAcademyWorkshopRequest {
  name: string;
  slug?: string;
  description?: string | null;
  heroImageUrl?: string | null;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity?: number;
  feeVnd?: number;
  feeDueAt?: string | null;
  /** Leave empty to lock meal choices at workshop start. */
  menuSelectionDeadline?: string | null;
  /** Leave empty to lock equipment choices at workshop start. */
  equipmentSelectionDeadline?: string | null;
  /** Leave empty to lock lash design choices at workshop start. */
  designSelectionDeadline?: string | null;
  assignedStaffIds?: number[];
  showInSidebar?: boolean;
  agendaTemplateId?: number;
  /** @deprecated Use agendaPresetKey and the item-level agenda APIs instead. */
  agenda?: UpsertAcademyWorkshopAgendaItemRequest[];
}

export interface UpdateAcademyWorkshopRequest extends Partial<CreateAcademyWorkshopRequest> {
  status?: AcademyWorkshopStatus;
  registrationOpen?: boolean;
  publishedAt?: string | null;
  scheduledPublishAt?: string | null;
}

export interface ListAcademyWorkshopsParams extends PageQuery {
  search?: string;
  status?: AcademyWorkshopStatus | 'ALL';
  seriesKey?: string;
}

export interface CloneAcademyWorkshopRequest {
  name: string;
  slug?: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  capacity?: number;
  feeVnd?: number;
  feeDueAt?: string | null;
  showInSidebar?: boolean;
  // Checklist flags (defaults to true)
  includeAgenda?: boolean;
  includeMenu?: boolean;
  includeEquipment?: boolean;
  includeDesigns?: boolean;
  includeQuizzes?: boolean;
}

export interface AcademyWorkshopClonePreview {
  sourceId: number;
  sourceName: string;
  sourceSlug: string;
  seriesKey: string;
  suggestedName: string;
  suggestedSlug: string;
  suggestedStartsAt: string;
  suggestedEndsAt: string;
  location: string;
  capacity: number;
  feeVnd: number;
  counts: {
    agendaItems: number;
    menuItems: number;
    equipmentPackages: number;
    designs: number;
    quizzes: number;
    quizQuestions: number;
  };
}

export interface ListAcademyWorkshopParticipantsParams extends PageQuery {
  search?: string;
  attendanceStatus?: AcademyWorkshopAttendanceStatus | 'ALL';
  feeStatus?: AcademyWorkshopFeeStatus | 'ALL';
  checkedIn?: boolean | 'ALL';
}

export interface ListAcademyWorkshopQuizTemplatesParams extends PageQuery {
  search?: string;
}

export interface ListAcademyWorkshopAgendaTemplatesParams extends PageQuery {
  search?: string;
}

export interface ListAcademyWorkshopMenuTemplatesParams extends PageQuery {
  search?: string;
}

export interface ListAcademyWorkshopEquipmentTemplatesParams extends PageQuery {
  search?: string;
}

export interface AddAcademyWorkshopParticipantsRequest {
  leadIds: number[];
}

export interface CreateAcademyWorkshopWalkInRequest {
  name: string;
  phone?: string | null;
  email?: string | null;
  source?: string;
  primaryInstructorId?: number | null;
}

export interface UpdateAcademyWorkshopCareRequest {
  infoSent?: boolean;
  attendanceStatus?: AcademyWorkshopAttendanceStatus;
  note?: string | null;
}

export interface UpdateAcademyWorkshopParticipantSelectionsRequest {
  menuItemIds?: number[];
  menuSelections?: AcademyWorkshopMenuSelectionInput[];
  equipmentPackageId?: number | null;
  designItemId?: number | null;
}

export interface AcademyWorkshopZaloTemplate {
  id: string;
  title: string;
  content: string;
  isDefault?: boolean;
}

export interface UpdateAcademyWorkshopZaloTemplatesRequest {
  templates: AcademyWorkshopZaloTemplate[];
}

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

export interface CheckInAcademyWorkshopParticipantRequest {
  checkedIn?: boolean;
  qrToken?: string;
}

export interface SetAcademyWorkshopPhotoConsentRequest {
  consent: boolean;
  policyVersion?: string;
}

export interface AssignAcademyWorkshopInstructorRequest {
  instructorId: number | null;
}

export interface RecordAcademyWorkshopFeeRequest {
  amountVnd: number;
  method: AcademyWorkshopFeeMethod;
  reference?: string | null;
  note?: string | null;
  receivedAt?: string;
}

export interface WaiveAcademyWorkshopFeeRequest {
  waived: boolean;
  reason: string;
}

export interface UpdateAcademyWorkshopParticipantPricingRequest {
  appliedFeeVnd?: number | null;
  discountVnd?: number;
  discountReason?: string | null;
}

export interface AcademyWorkshopPricingTierPreset {
  id: string;
  label: string;
  description: string;
  type: 'FULL' | 'FIXED' | 'PERCENT' | 'CUSTOM';
  percent?: number;
  fixedAmountVnd?: number;
}

export const ACADEMY_WORKSHOP_PRICING_PRESETS: AcademyWorkshopPricingTierPreset[] = [
  {
    id: 'full',
    label: 'Vé tiêu chuẩn (Full)',
    description: 'Thu đủ 100% học phí niêm yết (tặng kèm nâng cấp bộ dụng cụ 499K Free)',
    type: 'FULL',
  },
  { id: 'discount_10', label: 'Ưu đãi 10%', description: 'Giảm 10% học phí niêm yết', type: 'PERCENT', percent: 10 },
  { id: 'discount_50', label: 'Ưu đãi 50%', description: 'Học bổng / Đối tác giảm 50%', type: 'PERCENT', percent: 50 },
  { id: 'custom', label: 'Tùy chỉnh', description: 'Nhập học phí áp dụng / mức giảm đặc biệt', type: 'CUSTOM' },
];

export interface CreateAcademyWorkshopPhotoUploadRequest {
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
}

export interface AcademyWorkshopPhotoUploadIntent {
  storagePath: string;
  signedUrl: string;
  token: string;
  expiresAt: string;
}

/** Upload an image that students may view publicly. The API persists the binary on the configured media server. */
export interface CreateAcademyWorkshopPublicMediaUploadRequest {
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  dataBase64: string;
}

export interface AcademyWorkshopPublicMediaUploadResult {
  storagePath: string;
  /** Stable, public URL persisted on the menu item or equipment gallery image. */
  publicUrl: string;
}

export interface ConfirmAcademyWorkshopPhotoRequest {
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  caption?: string | null;
  capturedAt?: string;
}

export interface UpsertAcademyWorkshopAgendaItemRequest {
  id?: number;
  title: string;
  description?: string | null;
  kind: AcademyWorkshopAgendaKind;
  plannedDurationSeconds: number;
  sortOrder?: number;
}

export interface CreateAcademyWorkshopAgendaItemRequest {
  title: string;
  description?: string | null;
  kind: AcademyWorkshopAgendaKind;
  plannedDurationSeconds: number;
}

export interface UpdateAcademyWorkshopAgendaItemRequest {
  title?: string;
  description?: string | null;
  kind?: AcademyWorkshopAgendaKind;
  plannedDurationSeconds?: number;
}

export interface CreateAcademyWorkshopMenuItemRequest {
  category: AcademyWorkshopMenuCategory;
  name: string;
  description?: string | null;
  imageUrl: string;
  isAvailable?: boolean;
}

export interface UpdateAcademyWorkshopMenuItemRequest {
  category?: AcademyWorkshopMenuCategory;
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  isAvailable?: boolean;
}

/** Assigns a workshop resource to one item in that workshop's Agenda. */
export interface SetAcademyWorkshopAgendaResourceRequest {
  agendaItemId: number | null;
}

/** @deprecated Use SetAcademyWorkshopAgendaResourceRequest. */
export type SetAcademyWorkshopMenuAgendaItemRequest = SetAcademyWorkshopAgendaResourceRequest;

/** Saves the menu currently configured on a workshop as a reusable catering template. */
export interface SaveAcademyWorkshopMenuTemplateRequest {
  title: string;
  description?: string | null;
}

/** Saves all practical-kit package choices on a workshop as one reusable template. */
export interface SaveAcademyWorkshopEquipmentTemplateRequest {
  title: string;
  description?: string | null;
}

/** An editable practical-kit package persisted inside a reusable template. */
export interface UpsertAcademyWorkshopEquipmentTemplatePackageRequest {
  name: string;
  description?: string | null;
  includedItems: string[];
  priceVnd: number;
  isAvailable?: boolean;
  isIncludedInFee?: boolean;
  images?: CreateAcademyWorkshopEquipmentPackageImageRequest[];
}

/** Replaces a reusable template's metadata and practical-kit packages for future workshop use. */
export interface UpdateAcademyWorkshopEquipmentTemplateRequest extends SaveAcademyWorkshopEquipmentTemplateRequest {
  packages: UpsertAcademyWorkshopEquipmentTemplatePackageRequest[];
}

export interface CreateAcademyWorkshopEquipmentPackageRequest {
  name: string;
  description?: string | null;
  includedItems: string[];
  priceVnd: number;
  isAvailable?: boolean;
  isIncludedInFee?: boolean;
}

export type UpdateAcademyWorkshopEquipmentPackageRequest = Partial<CreateAcademyWorkshopEquipmentPackageRequest>;

export interface CreateAcademyWorkshopEquipmentPackageImageRequest {
  imageUrl: string;
  altText?: string | null;
}

export type UpdateAcademyWorkshopEquipmentPackageImageRequest =
  Partial<CreateAcademyWorkshopEquipmentPackageImageRequest>;

export interface ReorderAcademyWorkshopAgendaRequest {
  agendaItemIds: number[];
}

export interface CreateAcademyWorkshopAgendaTemplateRequest {
  title: string;
  description?: string | null;
  items: UpsertAcademyWorkshopAgendaItemRequest[];
}

export type UpdateAcademyWorkshopAgendaTemplateRequest = Partial<CreateAcademyWorkshopAgendaTemplateRequest>;

export interface AcademyWorkshopAgendaCommandRequest {
  action: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE' | 'SKIP';
}

export interface UpsertAcademyWorkshopQuizRequest {
  title: string;
  description?: string | null;
  isTemplate?: boolean;
  podiumRewards?: Record<string, string>;
}

export interface CloneAcademyWorkshopQuizRequest {
  title?: string;
}

export interface UpsertAcademyWorkshopQuestionRequest {
  type: AcademyWorkshopQuestionType;
  prompt: string;
  imageUrl?: string | null;
  durationSeconds: number;
  sortOrder?: number;
  rewardRule?: AcademyWorkshopRewardRule;
  fastestCount?: number;
  rewardLabel?: string | null;
  rewardQuantity?: number;
  options: Array<{ id?: number; label: string; color?: string | null; isCorrect: boolean; sortOrder?: number }>;
}

export interface AcademyWorkshopGameCommandRequest {
  action:
    | 'OPEN_LOBBY'
    | 'OPEN_QUESTION'
    | 'REOPEN_QUESTION'
    | 'CLOSE_QUESTION'
    | 'REVEAL_QUESTION'
    | 'NEXT_QUESTION'
    | 'END_GAME';
  questionId?: number;
}

export interface UpdateAcademyWorkshopDisplaySettingsRequest {
  showJoinQrOnDisplay: boolean;
}

export interface RedeemAcademyWorkshopQrRequest {
  qrToken: string;
}

export interface SelectAcademyWorkshopParticipantRequest {
  displayCode: string;
  participantId: number;
  phone?: string;
}

export interface JoinAcademyWorkshopWithGoogleRequest {
  displayCode: string;
  credential: string;
}

export interface RedeemAcademyWorkshopDisplayRequest {
  displayCode: string;
}

export interface SubmitAcademyWorkshopAnswerRequest {
  questionId: number;
  optionId: number;
  idempotencyKey: string;
}

export interface AcademyWorkshopAnswerReceipt {
  answerId: number;
  questionId: number;
  selectedOptionId: number;
  acceptedAt: string;
  isCorrect: boolean;
  score: number;
  totalScore: number;
  timedOut: boolean;
}

export interface UpdateAcademyWorkshopRewardRequest {
  status: Exclude<AcademyWorkshopRewardStatus, 'PROMISED'>;
  note?: string | null;
}

export interface UpdateAcademyInstructorBonusRequest {
  status: Exclude<AcademyInstructorBonusStatus, 'EARNED' | 'MISSING_CONFIG'>;
  note?: string | null;
}

export type ListAcademyWorkshopsResponse = PageResponse<AcademyWorkshopListItem, AcademyWorkshopSummary>;
export type ListAcademyWorkshopParticipantsResponse = PageResponse<AcademyWorkshopParticipant, AcademyWorkshopSummary>;
export type ListAcademyWorkshopQuizTemplatesResponse = PageResponse<AcademyWorkshopQuiz>;
export type ListAcademyWorkshopAgendaTemplatesResponse = PageResponse<AcademyWorkshopAgendaTemplate>;
export type ListAcademyWorkshopMenuTemplatesResponse = PageResponse<AcademyWorkshopMenuTemplate>;
export type ListAcademyWorkshopEquipmentTemplatesResponse = PageResponse<AcademyWorkshopEquipmentTemplate>;
export type AcademyWorkshopActionResponse = ActionResponse<AcademyWorkshopDetail>;
export type AcademyWorkshopParticipantActionResponse = ActionResponse<AcademyWorkshopParticipant>;
export type AcademyWorkshopAgendaActionResponse = ActionResponse<AcademyWorkshopAgendaItem>;
export type AcademyWorkshopMenuTemplateActionResponse = ActionResponse<AcademyWorkshopMenuTemplate>;
export type AcademyWorkshopEquipmentTemplateActionResponse = ActionResponse<AcademyWorkshopEquipmentTemplate>;
export type AcademyWorkshopQuizActionResponse = ActionResponse<AcademyWorkshopQuiz>;
export type AcademyWorkshopRewardActionResponse = ActionResponse<AcademyWorkshopReward>;
export type AcademyInstructorBonusActionResponse = ActionResponse<AcademyInstructorBonus>;

export interface AcademyWorkshopResourcesResponse {
  staff: AcademyStaffOption[];
  instructors: AcademyTalentInstructor[];
}

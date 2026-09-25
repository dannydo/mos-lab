export interface StaffOffDayResult {
  userId: number;
  weeklyOffDays: number[]; // 1 = Thứ 2, 2 = Thứ 3, ..., 7 = Chủ Nhật
  approvedOffDates: string[]; // YYYY-MM-DD (Đơn nghỉ phép đã duyệt -> Disable)
  pendingOffDates?: string[]; // YYYY-MM-DD (Đơn nghỉ phép chưa/đang duyệt 'New' -> Cảnh báo)
  rejectedOffDates?: string[]; // YYYY-MM-DD (Đơn nghỉ phép bị từ chối 'Rejected' -> Cảnh báo)
  source: 'fixed_schedule' | 'approved_request' | 'inverted_schedule' | 'none';
}

export interface StaffOffDayBatchParams {
  userIds?: number[];
  dateFrom?: string;
  dateTo?: string;
}

export interface StaffOffDayQueryResponse {
  data: Record<number, StaffOffDayResult>;
  total: number;
}

export interface AvatarUploadRequest {
  photoData?: string;
  imageBase64?: string;
  mimeType?: string;
  targetStaffId?: number;
  staffId?: number;
}

export interface AvatarUploadResponse {
  success?: boolean;
  message?: string;
  avatarUrl: string;
  staffId: number;
  displayName: string;
}

export interface AvatarScoreRequest {
  photoData?: string;
  imageBase64?: string;
  mimeType?: string;
  staffName?: string;
  role?: string;
}

export interface AvatarScoreResponse {
  valid?: boolean;
  isHumanPortrait?: boolean;
  scores?: {
    smileRadiance: number;
    lightingClarity: number;
    composition: number;
  };
  metrics?: {
    smile: number;
    lighting: number;
    composition: number;
  };
  overallScore?: number;
  totalScore?: number;
  title?: string;
  badge?: string;
  coachFeedback?: string;
  verdict?: string;
  feedback?: string;
}

export interface AvatarNudgeRequest {
  staffName: string;
  role?: string;
  snoozeCount: number;
}

export interface AvatarNudgeResponse {
  badge?: string;
  quote?: string;
  ctaText?: string;
  snoozeText?: string;
  isBanter?: boolean;
  greeting?: string;
  banter?: string;
  callToAction?: string;
  snoozeCount?: number;
  angelAction?: string;
  angelIcon?: string;
}

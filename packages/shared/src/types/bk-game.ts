export type BkGameType = 'INDIVIDUAL' | 'TEAM';

export type BkGameMetricType = 'BOOKINGS' | 'CALLS' | 'PICKUPS' | 'DONE' | 'COMPOSITE';

export type BkGameStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type BkGameWinnerCriteria = 'TOP_1' | 'TOP_3' | 'REACH_TARGET' | 'HIGHEST_SCORE';

export type BkGameParticipantStatus = 'ACTIVE' | 'WON' | 'LOST' | 'DISQUALIFIED';

export interface BkGameParticipant {
  id: number;
  gameId: number;
  staffId: number;
  staffName: string;
  avatar?: string | null;
  teamId?: number | null;
  teamName?: string | null;
  betAmount: number;
  score: number;
  rank?: number | null;
  rewardAmount: number;
  penaltyNote?: string | null;
  status: BkGameParticipantStatus;
  targetProgressPercent?: number;
  doneBookingsCount?: number;
  totalDoneBonus?: number;
}

export interface BkGameTeam {
  id: number;
  gameId: number;
  teamName: string;
  color?: string | null;
  score: number;
  rank?: number | null;
  participants?: BkGameParticipant[];
}

export type BkGameDoneBonusConditionType = 'EXACT_PAY' | 'AMOUNT_RANGE' | 'PROMO_PERCENT' | 'FREE' | 'ANY';

export interface BkGameDoneBonusRule {
  id: string;
  serviceId?: number | null;
  serviceName: string;
  conditionType: BkGameDoneBonusConditionType;
  conditionLabel?: string;
  minPaid?: number;
  maxPaid?: number;
  promoPercent?: number;
  bonusAmount: number;
}

export interface BkGameDoneBonusRecord {
  id: number;
  gameId: number;
  orderId: number;
  orderServiceId?: number | null;
  staffId: number;
  staffName?: string;
  serviceId?: number | null;
  serviceName: string;
  originalPrice: number;
  actualPaid: number;
  discountAmount: number;
  conditionApplied?: string | null;
  bonusAmount: number;
  orderCompletedAt?: string | null;
  createdAt: string;
}

export interface BkGameDoneBonusStaffSummary {
  staffId: number;
  staffName: string;
  doneCount: number;
  totalBonus: number;
}

export interface BkGameDoneBonusesSummary {
  totalDoneBookings: number;
  totalDoneBonus: number;
  staffBonuses: BkGameDoneBonusStaffSummary[];
}

export interface BkGame {
  id: number;
  title: string;
  description?: string | null;
  gameType: BkGameType;
  metricType: BkGameMetricType;
  targetScore?: number | null;
  startDate: string;
  endDate: string;
  status: BkGameStatus;
  entryFee: number;
  rewardPool: number;
  rewardDescription?: string | null;
  penaltyDescription?: string | null;
  winnerCriteria: BkGameWinnerCriteria;
  announcedResults?: string | null;
  allowedBookingChannels?: string[] | null;
  doneBonusConfig?: BkGameDoneBonusRule[] | null;
  createdByStaffId: number;
  createdAt: string;
  updatedAt: string;
  participants?: BkGameParticipant[];
  teams?: BkGameTeam[];
}

export interface BkGameCreateInput {
  title: string;
  description?: string;
  gameType: BkGameType;
  metricType: BkGameMetricType;
  allowedBookingChannels?: string[];
  doneBonusConfig?: BkGameDoneBonusRule[] | null;
  targetScore?: number;
  startDate: string;
  endDate: string;
  entryFee?: number;
  rewardPool?: number;
  rewardDescription?: string;
  penaltyDescription?: string;
  winnerCriteria?: BkGameWinnerCriteria;
  participantIds?: number[];
  teams?: { teamName: string; color?: string; staffIds: number[] }[];
}

export interface BkGameUpdateInput {
  title?: string;
  description?: string;
  targetScore?: number;
  allowedBookingChannels?: string[] | null;
  doneBonusConfig?: BkGameDoneBonusRule[] | null;
  rewardPool?: number;
  rewardDescription?: string;
  penaltyDescription?: string;
  status?: BkGameStatus;
}

export interface BkGameFinalizeInput {
  winners?: { participantId?: number; teamId?: number; rank: number; rewardAmount: number }[];
  penalties?: { participantId?: number; teamId?: number; penaltyNote: string }[];
  notes?: string;
}

export interface BkGameListResponse {
  games: BkGame[];
  total: number;
}

export interface BkGameDetailResponse {
  game: BkGame;
  leaderboard: BkGameParticipant[];
  teams?: BkGameTeam[];
  doneBonuses?: BkGameDoneBonusRecord[];
  doneBonusesSummary?: BkGameDoneBonusesSummary;
  stats: {
    totalParticipants: number;
    totalTeams: number;
    totalScore: number;
    leaderScore: number;
    timeRemainingSeconds: number;
    isExpired: boolean;
  };
  scoringRule?: BkGameScoringRule;
}

export interface BkGameScoringRule {
  metricType: BkGameMetricType;
  label: string;
  shortLabel: string;
  unit: string;
  formula: string;
  description: string;
  dataSource: string;
  notes: string;
}

export const BK_GAME_SCORING_RULES: Record<BkGameMetricType, BkGameScoringRule> = {
  BOOKINGS: {
    metricType: 'BOOKINGS',
    label: 'Booking tạo mới',
    shortLabel: 'Booking tạo',
    unit: 'Booking',
    formula: '1 Booking tạo mới hợp lệ = 1 Điểm',
    description: 'Đếm số lượng booking do nhân viên tạo trong khoảng thời gian diễn ra game.',
    dataSource:
      'Bảng order (ngày tạo order.date_created nằm trong thời gian game, loại trừ đơn trạng thái Hủy Cancelled).',
    notes: 'Tuân thủ Kinh Thánh mOS Điều răn #10: Tính theo ngày tạo đơn thực tế, không phụ thuộc ngày hẹn đến.',
  },
  CALLS: {
    metricType: 'CALLS',
    label: 'Số cuộc gọi',
    shortLabel: 'Cuộc gọi',
    unit: 'Cuộc gọi',
    formula: '1 Cuộc gọi phát sinh = 1 Điểm',
    description: 'Đếm tất cả các cuộc gọi thực hiện từ máy lẻ OmiCall của nhân sự trong thời gian diễn ra game.',
    dataSource: 'Lịch sử cuộc gọi OmiCall (bao gồm cả cuộc gọi kết nối và gọi nhỡ).',
    notes: 'Đo lường nỗ lực và tần suất liên hệ khách hàng của nhân viên Telesales.',
  },
  PICKUPS: {
    metricType: 'PICKUPS',
    label: 'Khách nghe máy',
    shortLabel: 'Nghe máy',
    unit: 'Cuộc nghe máy',
    formula: '1 Cuộc gọi nghe máy thành công = 1 Điểm',
    description: 'Đếm số cuộc gọi qua tổng đài OmiCall được khách hàng nhấc máy thành công trong thời gian game.',
    dataSource: 'Lịch sử cuộc gọi OmiCall có thời lượng đàm thoại > 0 (trạng thái answered).',
    notes: 'Đo lường hiệu quả kết nối và tiếp cận thực tế đến khách hàng.',
  },
  DONE: {
    metricType: 'DONE',
    label: 'Booking hoàn thành (Done)',
    shortLabel: 'Done',
    unit: 'Đơn Done',
    formula: '1 Đơn hoàn thành dịch vụ = 1 Điểm',
    description: 'Đếm số lượng đơn hàng do nhân viên tạo đã hoàn tất dịch vụ trong thời gian game.',
    dataSource:
      'Bảng order có trạng thái order_state = Completed và ngày làm dịch vụ (booking_date_start) nằm trong thời gian game.',
    notes: 'Đo lường tỷ lệ chuyển đổi cuối cùng ra doanh thu từ các lịch hẹn đã đặt.',
  },
  COMPOSITE: {
    metricType: 'COMPOSITE',
    label: 'Điểm tổng hợp (Booking & Gọi)',
    shortLabel: 'Tổng hợp',
    unit: 'Điểm',
    formula: '10 × Booking tạo mới + 1 × Cuộc gọi',
    description: 'Công thức tính điểm kết hợp giữa năng suất tạo booking và nỗ lực gọi điện thoại.',
    dataSource: 'Kết hợp giữa bảng order (date_created) và lịch sử cuộc gọi OmiCall.',
    notes: 'Mỗi booking hợp lệ = 10 điểm, mỗi cuộc gọi = 1 điểm.',
  },
};

export const BK_BOOKING_CHANNELS = [
  { value: 'GB', label: 'GB (Google Business)' },
  { value: 'FB', label: 'FB (Facebook)' },
  { value: 'ZALO', label: 'Zalo' },
  { value: 'WA', label: 'WhatsApp' },
  { value: 'HOTLINE', label: 'Hotline' },
  { value: 'TELE', label: 'Telesales' },
  { value: 'WEB', label: 'Website' },
  { value: 'SMS', label: 'SMS' },
  { value: 'VL', label: 'Vãng lai (Walk-in)' },
  { value: 'FR', label: 'Giới thiệu (Friend)' },
] as const;

export type BkBookingChannel = (typeof BK_BOOKING_CHANNELS)[number]['value'];

export const DEFAULT_BK_LASH_LIFT_BONUS_RULES: BkGameDoneBonusRule[] = [
  {
    id: 'lash-lift-full',
    serviceName: 'LASH LIFT',
    conditionType: 'EXACT_PAY',
    conditionLabel: 'Thanh toán 990.000đ (Nguyên giá)',
    minPaid: 990000,
    maxPaid: 990000,
    bonusAmount: 99000,
  },
  {
    id: 'lash-lift-promo-30',
    serviceName: 'LASH LIFT',
    conditionType: 'PROMO_PERCENT',
    conditionLabel: 'Thanh toán 693.000đ (Promo 30%)',
    minPaid: 650000,
    maxPaid: 700000,
    promoPercent: 30,
    bonusAmount: 35000,
  },
  {
    id: 'lash-lift-promo-50',
    serviceName: 'LASH LIFT',
    conditionType: 'PROMO_PERCENT',
    conditionLabel: 'Thanh toán 495.000đ (Promo 50%)',
    minPaid: 450000,
    maxPaid: 500000,
    promoPercent: 50,
    bonusAmount: 15000,
  },
  {
    id: 'lash-lift-free',
    serviceName: 'LASH LIFT',
    conditionType: 'FREE',
    conditionLabel: 'Miễn phí (Promo 100%)',
    minPaid: 0,
    maxPaid: 0,
    promoPercent: 100,
    bonusAmount: 1000,
  },
];


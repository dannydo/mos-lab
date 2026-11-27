export type BranchKey = 'dt' | 'ep';
export type FmLevel = 1 | 2 | 3;
export type PillarKey = 'maps' | 'fal' | 'autonomy' | 'inventory' | 'room' | 'grooming' | 'turn';

export interface BranchSpec {
  readonly id: BranchKey;
  readonly name: string;
  readonly shortName: string;
  readonly beds: number;
  readonly minCvsGate: number;
  readonly breakevenVnd: number;
  readonly presetDefaultRev: number;
  readonly presetDefaultCvs: number;
}

export const BRANCH_SPECS: Record<BranchKey, BranchSpec> = {
  dt: {
    id: 'dt',
    name: 'Đề Thám',
    shortName: 'ĐT',
    beds: 18,
    minCvsGate: 9,
    breakevenVnd: 450_000_000,
    presetDefaultRev: 680_000_000,
    presetDefaultCvs: 14,
  },
  ep: {
    id: 'ep',
    name: 'Estella Place',
    shortName: 'EP',
    beds: 12,
    minCvsGate: 6,
    breakevenVnd: 350_000_000,
    presetDefaultRev: 480_000_000,
    presetDefaultCvs: 10,
  },
};

export const FM_BASE_SALARY_BY_LEVEL: Record<FmLevel, number> = {
  1: 8_000_000,
  2: 9_000_000,
  3: 10_000_000,
};

export const FM_STANDARD_WORK_DAYS = 26;
export const FM_COVER_SHIFT_BONUS_VND = 400_000;
export const FM_FUN_FUND_PER_CONSULT_VND = 80_000;
export const FM_DAILY_QUEST_CAP_VND = 110_000;
export const AUTONOMY_HARD_MAX_PCT = 60;
export const CUSTOMERS_PER_CV_MONTHLY = 100;
export const FM_MIN_CEO_HR_MEETINGS_PER_WEEK = 3;

// Real-DB All-In P&L constants reconciled to 0đ diff against 58 payslips (T08-T10/2026)
export const CV_FIXED_COST_VND = 7_050_000;
export const CVL_FIXED_COST_VND = 7_550_000;
export const CVLL_FIXED_COST_VND = 8_060_000;
export const LASH_PROD_BONUS_RATE = 0.042;
export const COMBO_PROD_BONUS_RATE = 0.0328;
export const EMPLOYER_SS_FLOOR_VND = 1_040_000;
export const EMPLOYER_SS_MGMT_VND = 1_160_000;
export const CHO_BASE_SALARY_VND = 11_000_000;

export interface PillarMeta {
  readonly key: PillarKey;
  readonly label: string;
  readonly shortLabel: string;
  readonly rewards: readonly [number, number, number, number];
  readonly maxSliderVnd: number;
  readonly targets: readonly [string, string, string];
  readonly hint: string;
}

export const PILLAR_SPECS: readonly PillarMeta[] = [
  {
    key: 'maps',
    label: 'Google Maps',
    shortLabel: 'Maps',
    rewards: [0, 400_000, 800_000, 1_200_000],
    maxSliderVnd: 2_000_000,
    targets: ['2% · 2 rv/CV', '3% · 3 rv/CV', '4% · 4 rv/CV'],
    hint: '4★ = 0đ · 1–3★ = Sâu · Bướm chuộc 1 sâu +1★',
  },
  {
    key: 'fal',
    label: 'Kiểm soát FAL',
    shortLabel: 'FAL',
    rewards: [0, 350_000, 700_000, 1_000_000],
    maxSliderVnd: 1_500_000,
    targets: ['≤ 1.5%', '≤ 1.0%', '≤ 0.5%'],
    hint: 'Fix · Adj · Log chuẩn SOP trước 48h',
  },
  {
    key: 'autonomy',
    label: 'Đội ngũ Tự lái',
    shortLabel: 'Tự lái',
    rewards: [0, 200_000, 400_000, 600_000],
    maxSliderVnd: 1_200_000,
    targets: ['40–49% · ≥1 CVLL', '50–59% · ≥1 CVLL', '60% · ≥2 CVLL'],
    hint: 'Trần 60% CVL/CVLL · Bắt buộc gặp CEO & HR ≥3 buổi/tuần hướng nghiệp',
  },
  {
    key: 'inventory',
    label: 'Kho & Vật tư',
    shortLabel: 'Kho',
    rewards: [0, 150_000, 300_000, 450_000],
    maxSliderVnd: 1_000_000,
    targets: ['Lệch ≤ 3%', 'Lệch ≤ 2%', 'Lệch ≤ 1%'],
    hint: 'Kiểm kho định kỳ, không thất thoát vật tư',
  },
  {
    key: 'room',
    label: 'Phòng Mi · 5 Giác Quan',
    shortLabel: 'Phòng',
    rewards: [0, 150_000, 300_000, 450_000],
    maxSliderVnd: 1_000_000,
    targets: ['90–94đ', '95–97đ', '≥ 98đ'],
    hint: 'Reception sạch thoáng, mùi hương, nhạc, ánh sáng',
  },
  {
    key: 'grooming',
    label: 'Phong thái & Diện mạo',
    shortLabel: 'Diện mạo',
    rewards: [0, 150_000, 300_000, 450_000],
    maxSliderVnd: 1_000_000,
    targets: ['Đồng phục · Mi nối', 'Son · Tóc gọn', 'Chuẩn 100%'],
    hint: 'Đồng phục chuẩn chỉnh, có mi nối, son & trang điểm nhẹ suốt ca',
  },
  {
    key: 'turn',
    label: 'Tua · Giờ công & 6 Ca TV',
    shortLabel: 'Tua/TV',
    rewards: [0, 150_000, 300_000, 450_000],
    maxSliderVnd: 1_000_000,
    targets: ['HI ≥ 75% · 6 ca', 'HI ≥ 85% · 6 ca', 'HI ≥ 92% · 6 ca'],
    hint: 'Chia tua công bằng & đủ 6 ca tư vấn/tuần',
  },
];

export type StarsByPillar = Record<PillarKey, 0 | 1 | 2 | 3>;

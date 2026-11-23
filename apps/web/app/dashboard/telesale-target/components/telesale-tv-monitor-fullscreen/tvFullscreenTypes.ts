import type { TelesaleTargetOverview, TelesaleTvEdginessLevel, TelesaleTvPersonaKey } from '@mos-lab/shared';
import type { TvCelebrationSettings, useTelesaleTvLiveCelebration } from '../../hooks/useTelesaleTvLiveCelebration';

export interface TelesaleTvMonitorFullscreenProps {
  overview: TelesaleTargetOverview;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  liveCelebration?: ReturnType<typeof useTelesaleTvLiveCelebration>;
}

export type TvFullscreenTier = 'rose' | 'amber' | 'emerald';
export type TvFullscreenCardVariant = 'book' | 'checkin';
export type TvFullscreenDemoVoiceKind = 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP' | 'MILESTONE' | 'CHECKIN_18';
export type TvFullscreenDemoFireworkKind = 'BOOK' | 'CHECKIN';

export interface TvFullscreenCardTierStyles {
  container: string;
  ambientGlow: string;
  headerTargetBadge: string;
  ribbonBorder: string;
  ribbonActualText: string;
  iconBox: string;
}

export interface ShiftTimelineProgress {
  percent: number;
  timeFormatted: string;
  isMorning: boolean;
}

export interface DemoButtonOption<T extends string> {
  kind: T;
  label: string;
  darkClass: string;
  lightClass: string;
}

export const BOOK_PANEL_STORAGE_KEY = 'mos_tv_panel_book_open';
export const CHECKIN_PANEL_STORAGE_KEY = 'mos_tv_panel_checkin_open';
export const TEST_FIREWORKS_DURATION_MS = 8000;
export const FRENZY_DURATION_MS = 8000;

export const EVENT_TYPE_FILTER_OPTIONS: {
  label: string;
  value: TvCelebrationSettings['eventTypeFilter'];
}[] = [
  { label: 'Tất cả (Book & Done)', value: 'ALL' },
  { label: 'Chỉ Book mới', value: 'BOOK_ONLY' },
  { label: 'Chỉ Done mới', value: 'DONE_ONLY' },
];

export const VOICE_STYLE_OPTIONS: {
  label: string;
  value: NonNullable<TvCelebrationSettings['voiceStyle']>;
}[] = [
  { label: '👑 Nam thần Nam Minh (Studio Neural · Trầm ấm & gợi cảm)', value: 'MALE_CHARM' },
  { label: '🌸 Nữ thần Hoài My (Studio Neural · Ngọt ngào & ân cần)', value: 'FEMALE_SWEET' },
  { label: '💻 Trình duyệt máy (Local Speech Synth)', value: 'BROWSER_LOCAL' },
];

export const PERSONA_MODE_OPTIONS: { label: string; value: TelesaleTvPersonaKey }[] = [
  { label: '🎲 Xoay vòng 5 nhân cách (Đa dạng & nham nhở)', value: 'RANDOM_MULTI' },
  { label: '🎪 MC Hội Chợ / BLV Sân Cỏ (Cháy & hào sảng)', value: 'MC_HOI_CHO' },
  { label: '🎭 Cụ Tổ Drama (Xéo xắt & cà khịa đỉnh cao)', value: 'DRAMA_QUEEN' },
  { label: '🔮 Thầy Bói Phán Số (Huyền bí & tâm linh)', value: 'THAY_BOI' },
  { label: '📱 Gen Z Chúa Tể Meme (Die up die down & đu trend)', value: 'GEN_Z' },
  { label: '🕶️ Tổng Tài Sến Sẩm (Ngọt ngào & nuông chiều)', value: 'TONG_TAI' },
];

export const EDGINESS_LEVEL_OPTIONS: { label: string; value: TelesaleTvEdginessLevel }[] = [
  { label: '🌶️🌶️🌶️ Siêu mặn & Xéo xắt (Tối đa hài hước)', value: 'SUPER_SPICY' },
  { label: '✨ Vui vẻ & Tươi mới (Hài hước vừa phải)', value: 'PLAYFUL' },
  { label: '👔 Chuẩn mực & Tinh tế (Truyền thống)', value: 'CLASSIC' },
];

export const DEMO_VOICE_PRIMARY_BUTTONS: DemoButtonOption<TvFullscreenDemoVoiceKind>[] = [
  {
    kind: 'BOOK',
    label: 'Test Book',
    darkClass: 'bg-blue-950 border-blue-600 text-blue-300 hover:bg-blue-900',
    lightClass: 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100',
  },
  {
    kind: 'CHECKIN',
    label: 'Test Check-in',
    darkClass: 'bg-emerald-950 border-emerald-600 text-emerald-300 hover:bg-emerald-900',
    lightClass: 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100',
  },
  {
    kind: 'COMBO',
    label: 'Test Combo',
    darkClass: 'bg-purple-950 border-purple-600 text-purple-300 hover:bg-purple-900',
    lightClass: 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100',
  },
  {
    kind: 'TIP',
    label: 'Test Tip',
    darkClass: 'bg-amber-950 border-amber-600 text-amber-300 hover:bg-amber-900',
    lightClass: 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100',
  },
];

export const DEMO_VOICE_SPECIAL_BUTTONS: DemoButtonOption<TvFullscreenDemoVoiceKind>[] = [
  {
    kind: 'MILESTONE',
    label: '👑 Test Milestone',
    darkClass: 'bg-amber-950/80 border-amber-500/80 text-amber-300 hover:bg-amber-900',
    lightClass: 'bg-amber-50 border-amber-400 text-amber-800 hover:bg-amber-100',
  },
  {
    kind: 'CHECKIN_18',
    label: '🎉 Check-in 18',
    darkClass: 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 hover:bg-emerald-900',
    lightClass: 'bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-100',
  },
];

export const DEMO_FIREWORK_BUTTONS: DemoButtonOption<TvFullscreenDemoFireworkKind>[] = [
  {
    kind: 'BOOK',
    label: '🎆 Pháo Book',
    darkClass: 'bg-sky-950 border-sky-500/70 text-sky-300 hover:bg-sky-900',
    lightClass: 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100',
  },
  {
    kind: 'CHECKIN',
    label: '🎆 Pháo Check-in',
    darkClass: 'bg-emerald-950 border-emerald-500/70 text-emerald-300 hover:bg-emerald-900',
    lightClass: 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100',
  },
];

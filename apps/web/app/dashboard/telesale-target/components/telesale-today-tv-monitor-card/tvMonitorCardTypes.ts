import type React from 'react';
import type { TelesaleTargetOverview, TelesaleTvEdginessLevel, TelesaleTvPersonaKey } from '@mos-lab/shared';
import type { TvCelebrationSettings, useTelesaleTvLiveCelebration } from '../../hooks/useTelesaleTvLiveCelebration';

export type TvMonitorTier = 'rose' | 'amber' | 'emerald';
export type TestFireworksKind = 'BOOK' | 'DONE' | 'CHECKIN';
export type TvMonitorGaugeVariant = 'book' | 'checkin';
export type TvDemoCelebrationKind = 'BOOK' | 'CHECKIN' | 'COMBO' | 'TIP';

export interface TvCardTierStyles {
  container: string;
  badge: string;
  title: string;
  icon: string;
  bottomBorder: string;
  bottomText: string;
  targetBadge: string;
}

export interface TelesaleTodayTvMonitorCardProps {
  overview: TelesaleTargetOverview;
  onOpenFullscreen?: () => void;
  isTvOpen?: boolean;
  liveCelebration?: ReturnType<typeof useTelesaleTvLiveCelebration>;
}

export interface TvMonitorGaugeRibbonCell {
  label: string;
  value: React.ReactNode;
  valueClassName: string;
}

export interface TvDemoCelebrationButtonConfig {
  kind: TvDemoCelebrationKind;
  label: string;
  darkClass: string;
  lightClass: string;
}

export const TV_SETTINGS_STORAGE_KEY = 'MOS_TV_MONITOR_VOICE_SETTINGS';
export const TV_SETTINGS_UPDATED_EVENT = 'mos:tv-settings-updated';
export const TEST_FIREWORKS_DURATION_MS = 8000;

export const DEFAULT_LOCAL_TV_SETTINGS: TvCelebrationSettings = {
  soundEnabled: true,
  volume: 0.9,
  eventTypeFilter: 'ALL',
  quietModeEnabled: false,
  voiceStyle: 'MALE_CHARM',
  fireworksEnabled: true,
};

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

export const DEMO_CELEBRATION_BUTTONS: TvDemoCelebrationButtonConfig[] = [
  {
    kind: 'BOOK',
    label: 'Loa Book',
    darkClass: 'bg-blue-950/80 border-blue-500/60 text-blue-300 hover:bg-blue-900',
    lightClass: 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100',
  },
  {
    kind: 'CHECKIN',
    label: 'Loa Check-in',
    darkClass: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900',
    lightClass: 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100',
  },
  {
    kind: 'COMBO',
    label: 'Loa Combo',
    darkClass: 'bg-purple-950/80 border-purple-500/60 text-purple-300 hover:bg-purple-900',
    lightClass: 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100',
  },
  {
    kind: 'TIP',
    label: 'Loa Tip',
    darkClass: 'bg-amber-950/80 border-amber-500/60 text-amber-300 hover:bg-amber-900',
    lightClass: 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100',
  },
];

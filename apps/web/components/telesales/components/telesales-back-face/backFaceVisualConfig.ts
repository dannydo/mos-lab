import { polarToXY, RADAR_ANGLES } from '../../hooks/useTelesalesDashboard';
import type { TelesalesPoint2D } from './telesalesBackFaceTypes';

export interface RadarAxisConfig {
  key: 'calls' | 'pickups' | 'happy' | 'booked' | 'done';
  label: string;
  rgb: string;
  anchor: 'start' | 'middle' | 'end';
  dy: string;
}

export interface PodiumSlotConfig {
  rank: 1 | 2 | 3;
  barHeightClass: string;
  badgeEmoji: string;
}

export const RADAR_RING_LEVELS = [0.25, 0.5, 0.75, 1.0] as const;

export const RADAR_GOLD_STROKE_RGB = 'rgb(212, 168, 75)';
export const RADAR_GOLD_FILL_DARK = 'rgba(212, 168, 75, 0.18)';
export const RADAR_GOLD_FILL_LIGHT = 'rgba(212, 168, 75, 0.12)';
export const MINI_RADAR_GOLD_FILL = 'rgba(212, 168, 75, 0.15)';
export const RADAR_POINT_ACTIVE_STROKE_RGB = 'rgb(255, 255, 255)';

export const RADAR_AXES: readonly RadarAxisConfig[] = [
  { key: 'calls', label: 'Calls', rgb: 'rgb(59, 130, 246)', anchor: 'middle', dy: '-10px' },
  { key: 'pickups', label: 'Pickups', rgb: 'rgb(139, 92, 246)', anchor: 'start', dy: '5px' },
  { key: 'happy', label: 'Happy Call', rgb: 'rgb(245, 158, 11)', anchor: 'start', dy: '12px' },
  { key: 'booked', label: 'Booked', rgb: 'rgb(249, 115, 22)', anchor: 'end', dy: '12px' },
  { key: 'done', label: 'Done Deal', rgb: 'rgb(16, 185, 129)', anchor: 'end', dy: '5px' },
];

export const PODIUM_SLOT_CONFIGS: readonly PodiumSlotConfig[] = [
  { rank: 2, barHeightClass: 'h-[70px]', badgeEmoji: '🥈' },
  { rank: 1, barHeightClass: 'h-[95px]', badgeEmoji: '👑' },
  { rank: 3, barHeightClass: 'h-[50px]', badgeEmoji: '🥉' },
];

const MINI_RADAR_CENTER = 30;
const MINI_RADAR_MAX_R = 20;

export interface MiniRadarGeometry {
  outerRingPoints: TelesalesPoint2D[];
  innerRingPoints: TelesalesPoint2D[];
  dataPoints: TelesalesPoint2D[];
}

export function buildMiniRadarGeometry(perf: SafeAny, memberTargets: SafeAny): MiniRadarGeometry {
  const outerRingPoints = RADAR_ANGLES.map((angle) =>
    polarToXY(MINI_RADAR_CENTER, MINI_RADAR_CENTER, MINI_RADAR_MAX_R, angle)
  );
  const innerRingPoints = RADAR_ANGLES.map((angle) =>
    polarToXY(MINI_RADAR_CENTER, MINI_RADAR_CENTER, MINI_RADAR_MAX_R * 0.5, angle)
  );
  const dataPoints = RADAR_AXES.map((axis, idx) => {
    const target = memberTargets?.[axis.key] || 0;
    const val = perf?.[axis.key] || 0;
    const ratio = target > 0 ? Math.min(val / target, 1) : 0;
    return polarToXY(MINI_RADAR_CENTER, MINI_RADAR_CENTER, MINI_RADAR_MAX_R * ratio, RADAR_ANGLES[idx]);
  });

  return { outerRingPoints, innerRingPoints, dataPoints };
}

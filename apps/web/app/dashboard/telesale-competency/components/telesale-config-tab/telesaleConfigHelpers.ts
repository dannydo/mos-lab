import type {
  TelesaleCompetencyConfigVersion,
  TelesaleConfigStatus,
  TelesaleLevelKpiConfig,
  TelesalePillarsWeightConfig,
  TelesaleTier,
} from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';

export interface TelesaleConfigTabProps {
  currentMonth: string;
}

export type PillarWeightKey = 'pillarAWeight' | 'pillarBWeight' | 'pillarCWeight' | 'pillarDWeight';

export type LevelTargetNumericField = 'doneTarget' | 'newCustomersTarget' | 'revenueTarget' | 'callsTarget';

export interface PillarWeightFieldMeta {
  key: PillarWeightKey;
  title: string;
  subtitle: string;
  min: number;
  max: number;
}

export const PILLAR_WEIGHT_FIELDS: readonly PillarWeightFieldMeta[] = [
  {
    key: 'pillarAWeight',
    title: 'Trụ cột A (Hiệu suất)',
    subtitle: 'Tự động tính từ BK Leaderboard',
    min: 10,
    max: 70,
  },
  {
    key: 'pillarBWeight',
    title: 'Trụ cột B (Kỹ năng)',
    subtitle: '9 kỹ năng Quản lý chấm',
    min: 10,
    max: 50,
  },
  {
    key: 'pillarCWeight',
    title: 'Trụ cột C (Chất lượng)',
    subtitle: 'Lỗi CRM + Cuộc gọi',
    min: 5,
    max: 40,
  },
  {
    key: 'pillarDWeight',
    title: 'Trụ cột D (Kỷ luật & Thái độ)',
    subtitle: 'Minh chứng sự vụ',
    min: 5,
    max: 30,
  },
];

export const TIER_ORDER: readonly TelesaleTier[] = ['FRESHER', 'JUNIOR', 'MID_LEVEL', 'SENIOR'];

export function getTierStatus(tier: TelesaleTier): StatusType {
  if (tier === 'SENIOR') return 'purple';
  if (tier === 'MID_LEVEL') return 'gold';
  if (tier === 'JUNIOR') return 'cyan';
  return 'processing';
}

export function getVersionStatusLabel(status: TelesaleConfigStatus): string {
  if (status === 'PUBLISHED') return 'Đã ban hành';
  if (status === 'DRAFT') return 'Bản nháp';
  return 'Lưu trữ';
}

export function getVersionBadgeMeta(
  status: TelesaleConfigStatus,
  effectiveDate: string
): { status: StatusType; label: string } {
  if (status === 'PUBLISHED') {
    return { status: 'success', label: `Hiệu lực từ ${effectiveDate}` };
  }
  if (status === 'DRAFT') {
    return { status: 'warning', label: 'Đang biên soạn (Bản nháp)' };
  }
  return { status: 'default', label: 'Phiên bản lịch sử (Lưu trữ)' };
}

export function getPreviewStatusMeta(status: string): { statusType: StatusType; label: string } {
  if (status === 'PROMOTION_READY') {
    return { statusType: 'success', label: 'Đủ điều kiện thăng' };
  }
  if (status === 'DEMOTION_FLAGGED') {
    return { statusType: 'error', label: 'Cảnh báo giáng' };
  }
  if (status === 'WARNING_M1') {
    return { statusType: 'warning', label: 'Cảnh báo T1' };
  }
  return { statusType: 'default', label: 'Duy trì' };
}

export function calculatePillarsSum(pillarsWeight: TelesalePillarsWeightConfig): number {
  return (
    Number(pillarsWeight.pillarAWeight || 0) +
    Number(pillarsWeight.pillarBWeight || 0) +
    Number(pillarsWeight.pillarCWeight || 0) +
    Number(pillarsWeight.pillarDWeight || 0)
  );
}

export function cloneConfigVersion(config: TelesaleCompetencyConfigVersion): TelesaleCompetencyConfigVersion {
  return JSON.parse(JSON.stringify(config)) as TelesaleCompetencyConfigVersion;
}

export function updateLevelTargetList(
  levelTargets: TelesaleLevelKpiConfig[],
  index: number,
  field: LevelTargetNumericField,
  value: number
): TelesaleLevelKpiConfig[] {
  const next = [...levelTargets];
  next[index] = { ...next[index], [field]: value };
  return next;
}

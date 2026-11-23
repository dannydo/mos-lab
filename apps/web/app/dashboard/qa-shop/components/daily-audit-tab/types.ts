import type dayjs from 'dayjs';
import type { QaAuditResult, QaSeverity, QaShopBranchCode } from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';

export type AuditShift = 'Sáng' | 'Chiều' | 'Tối' | 'Toàn ngày';

export interface DailyAuditTabProps {
  themeMode: string;
  onOpenImportDrawer: () => void;
  onAuditSubmitted: () => void;
}

export interface ItemResultState {
  result: QaAuditResult;
  note?: string;
  photoUrl?: string;
  severity?: QaSeverity;
}

export interface ComplianceStats {
  total: number;
  passed: number;
  failed: number;
  na: number;
  score: number;
  maxScore: number;
  rate: number;
}

export interface ComplianceGradeMeta {
  status: StatusType;
  label: string;
}

export interface SeverityDisplayConfig {
  dotClass: string;
  label: string;
  displayCode: string;
}

export const BRANCH_SEGMENT_OPTIONS: { label: string; value: QaShopBranchCode }[] = [
  { label: 'Đề Thám (DT)', value: 'DT' },
  { label: 'Estella Place (EP)', value: 'EP' },
];

export const SHIFT_SELECT_OPTIONS: { value: AuditShift; label: string }[] = [
  { value: 'Sáng', label: 'Ca Sáng (09:00 - 13:00)' },
  { value: 'Chiều', label: 'Ca Chiều (13:00 - 17:00)' },
  { value: 'Tối', label: 'Ca Tối (17:00 - 21:00)' },
  { value: 'Toàn ngày', label: 'Tổng Kết Cuối Ngày' },
];

export const SEVERITY_SELECT_OPTIONS: { value: QaSeverity; label: string }[] = [
  { value: 'LOW', label: '🟢 Nhẹ (Low)' },
  { value: 'MEDIUM', label: '🟡 Trung bình (Medium)' },
  { value: 'HIGH', label: '🟠 Nghiêm trọng (High)' },
  { value: 'CRITICAL', label: '🔴 Cực kỳ nghiêm trọng (Critical)' },
];

export interface DailyAuditMetadataValues {
  selectedBranch: QaShopBranchCode;
  auditDate: dayjs.Dayjs;
  shift: AuditShift;
  auditorName: string;
}

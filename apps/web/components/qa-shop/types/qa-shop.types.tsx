import React from 'react';
import { Tag, Tooltip } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { SafeAny } from '@mos-lab/shared';

// Active Store Branch Definitions fetched from Database (client_store where is_disabled = 0)
export const STORE_BRANCHES = [
  { code: 'DT', name: 'Đề Thám (DT)' },
  { code: 'EP', name: 'Estella Place (EP)' },
  { code: 'ACA-DT', name: 'Academy - Đề Thám (ACA-DT)' },
  { code: 'HQ', name: 'Văn Phòng HQ (HQ)' },
];

export interface ItemResultState {
  result?: 'PASS' | 'FAIL' | 'NA';
  failedQty?: number;
  failedPercent?: number;
  note?: string;
  photoUrl?: string;
}

export type ItemStatusMap = Record<string, ItemResultState>;

export interface FailedItemSummary {
  secTitle: string;
  itemTitle: string;
  severity: string;
  note: string;
  photoUrl: string;
}

export interface InspectionStats {
  total: number;
  passed: number;
  failed: number;
  na: number;
  passRate: number;
  failedItemsList: FailedItemSummary[];
}

export interface GroupedArea {
  id: string;
  code: string;
  title: string;
  badgeColor: string;
  subSections: SafeAny[];
  totalItems: number;
}

export interface QaStaffMember {
  id: string;
  displayName: string;
  role?: string;
}

export const parseNormalizedItem = (itm: SafeAny) => {
  let rawTitle = (itm.title || '').replace(/\s*\[[A-Z0-9_\s]+\]\s*$/gi, '').trim();
  let subject = rawTitle;
  let detailRequirement = '';

  if (rawTitle.includes(' - ')) {
    const parts = rawTitle.split(' - ');
    subject = parts[0].trim();
    detailRequirement = parts.slice(1).join(' - ').trim();
  } else if (rawTitle.includes(' – ')) {
    const parts = rawTitle.split(' – ');
    subject = parts[0].trim();
    detailRequirement = parts.slice(1).join(' – ').trim();
  }

  let unitQty = '';
  if (itm.standardRequirement) {
    const match = itm.standardRequirement.match(/Đơn vị:\s*([0-9]+)/i);
    if (match && match[1] && match[1] !== '1') {
      unitQty = `SL: ${match[1]}`;
    }
  }

  const area = itm.area ? itm.area.trim() : '';
  const dept = itm.dept ? itm.dept.trim() : 'CC';

  return { subject, detailRequirement, unitQty, area, dept };
};

export const formatReqWithoutArea = (req?: string) => {
  if (!req) return '';
  return req
    .replace(/\|\s*Khu vực:\s*[^|]+/gi, '')
    .replace(/Khu vực:\s*[^|]+\|\s*/gi, '')
    .replace(/Khu vực:\s*[^|]+/gi, '')
    .replace(/^\s*\|\s*/, '')
    .replace(/\s*\|\s*$/, '')
    .trim();
};

export const renderSeverityDot = (severity?: string) => {
  let colorClass = 'bg-slate-400';
  let label = 'Thấp';
  if (severity === 'CRITICAL') {
    colorClass = 'bg-red-500 animate-pulse';
    label = 'Cực kỳ nghiêm trọng';
  } else if (severity === 'HIGH') {
    colorClass = 'bg-orange-500';
    label = 'Nghiêm trọng';
  } else if (severity === 'MID' || severity === 'MEDIUM') {
    colorClass = 'bg-amber-400';
    label = 'Trung bình';
  } else if (severity === 'LOW') {
    colorClass = 'bg-sky-400';
    label = 'Thấp';
  }

  const displayCode = severity === 'MEDIUM' ? 'MID' : severity || 'MID';

  return (
    <Tooltip title={`Mức độ ưu tiên: ${label}`}>
      <span className="inline-flex items-center gap-1.5 text-xs select-none">
        <span className={`w-2 h-2 rounded-full inline-block ${colorClass}`} aria-hidden="true" />
        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          {displayCode}
        </span>
      </span>
    </Tooltip>
  );
};

export const getAuditComplianceRate = (record: SafeAny): number => {
  if (!record) return 100.0;
  if (record.complianceRate !== undefined && record.complianceRate !== null) {
    return Math.min(100, Math.max(0, Number(record.complianceRate)));
  }
  if (record.maxScore && record.maxScore > 0) {
    return Math.min(
      100,
      Math.max(0, Math.round((Number(record.overallScore || 0) / Number(record.maxScore)) * 1000) / 10)
    );
  }
  if (record.overallScore !== undefined && Number(record.overallScore) <= 100) {
    return Math.min(100, Math.max(0, Number(record.overallScore)));
  }
  const passed = Number(record.passedCount || 0);
  const failed = Number(record.failedCount || 0);
  if (passed + failed > 0) {
    return Math.min(100, Math.max(0, Math.round((passed / (passed + failed)) * 1000) / 10));
  }
  return 100.0;
};

export const renderAuditStatusTag = (status: string, record: SafeAny) => {
  const rate = typeof record === 'number' ? (record <= 100 ? record : 98) : getAuditComplianceRate(record);
  if (status === 'PASSED' || rate >= 90) {
    return (
      <Tag color="success" className="rounded-full border-0 font-medium" icon={<CheckCircleOutlined />}>
        ĐẠT CHUẨN
      </Tag>
    );
  }
  if (status === 'NEEDS_REMEDIATION' || rate >= 70) {
    return (
      <Tag color="warning" className="rounded-full border-0 font-medium" icon={<ExclamationCircleOutlined />}>
        CẦN KHẮC PHỤC
      </Tag>
    );
  }
  return (
    <Tag color="error" className="rounded-full border-0 font-medium" icon={<CloseCircleOutlined />}>
      KHÔNG ĐẠT
    </Tag>
  );
};

export const renderTicketStatusTag = (status: string) => {
  switch (status) {
    case 'OPEN':
      return (
        <Tag color="error" className="rounded-full border-0">
          MỚI PHÁT HIỆN
        </Tag>
      );
    case 'IN_PROGRESS':
      return (
        <Tag color="processing" className="rounded-full border-0">
          ĐANG XỬ LÝ
        </Tag>
      );
    case 'RESOLVED':
      return (
        <Tag color="warning" className="rounded-full border-0">
          ĐÃ KHẮC PHỤC
        </Tag>
      );
    case 'VERIFIED':
      return (
        <Tag color="success" className="rounded-full border-0">
          ĐÃ XÁC NHẬN QA
        </Tag>
      );
    default:
      return (
        <Tag color="default" className="rounded-full border-0">
          {status}
        </Tag>
      );
  }
};

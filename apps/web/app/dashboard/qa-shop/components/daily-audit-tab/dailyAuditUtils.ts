import type { QaChecklistTemplate, QaSaveAuditInput, QaSeverity } from '@mos-lab/shared';
import type { ComplianceGradeMeta, ComplianceStats, ItemResultState, SeverityDisplayConfig } from './types';

export function buildDefaultItemStates(template: QaChecklistTemplate): Record<string, ItemResultState> {
  const initStates: Record<string, ItemResultState> = {};
  template.sections.forEach((sec) => {
    sec.items.forEach((itm) => {
      initStates[itm.id] = { result: 'PASS' };
    });
  });
  return initStates;
}

export function computeComplianceStats(
  template: QaChecklistTemplate | null,
  itemStates: Record<string, ItemResultState>
): ComplianceStats {
  if (!template) {
    return { total: 0, passed: 0, failed: 0, na: 0, score: 0, maxScore: 0, rate: 100 };
  }

  let total = 0;
  let passed = 0;
  let failed = 0;
  let na = 0;
  let score = 0;
  let maxScore = 0;

  template.sections.forEach((sec) => {
    sec.items.forEach((itm) => {
      total++;
      const st = itemStates[itm.id];
      const res = st?.result || 'PASS';
      const weight = itm.weight || 1;

      if (res === 'PASS') {
        passed++;
        score += weight;
        maxScore += weight;
      } else if (res === 'FAIL') {
        failed++;
        maxScore += weight;
      } else {
        na++;
      }
    });
  });

  const rate = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 100;

  return { total, passed, failed, na, score, maxScore, rate };
}

export function findMissingRequiredFailPhotos(
  template: QaChecklistTemplate,
  itemStates: Record<string, ItemResultState>
): string[] {
  const missingPhotos: string[] = [];
  template.sections.forEach((sec) => {
    sec.items.forEach((itm) => {
      const st = itemStates[itm.id];
      if (st?.result === 'FAIL' && itm.requirePhotoOnFail && !st.photoUrl) {
        missingPhotos.push(`[${itm.code}] ${itm.title} (Yêu cầu có ảnh bằng chứng)`);
      }
    });
  });
  return missingPhotos;
}

export function buildAuditItemsPayload(itemStates: Record<string, ItemResultState>): QaSaveAuditInput['items'] {
  return Object.entries(itemStates).map(([itemId, st]) => ({
    itemId,
    result: st.result,
    note: st.note,
    photoUrls: st.photoUrl ? [st.photoUrl] : [],
    severity: st.severity,
  }));
}

export function getComplianceGradeMeta(rate: number): ComplianceGradeMeta {
  if (rate >= 95) {
    return { status: 'success', label: 'A+ Xuất Sắc' };
  }
  if (rate >= 85) {
    return { status: 'processing', label: 'B Đạt Chấp Nhận' };
  }
  return { status: 'error', label: 'C Cần Cải Thiện' };
}

export function getSeverityDisplayConfig(severity: QaSeverity | 'MID' | string = 'MEDIUM'): SeverityDisplayConfig {
  const normSev = severity === 'MID' ? 'MEDIUM' : severity;

  switch (normSev) {
    case 'CRITICAL':
      return {
        dotClass: 'bg-red-500 animate-pulse',
        label: 'Cực kỳ nghiêm trọng',
        displayCode: 'CRITICAL',
      };
    case 'HIGH':
      return {
        dotClass: 'bg-orange-500',
        label: 'Nghiêm trọng',
        displayCode: 'HIGH',
      };
    case 'MEDIUM':
      return {
        dotClass: 'bg-amber-400',
        label: 'Trung bình',
        displayCode: 'MID',
      };
    case 'LOW':
      return {
        dotClass: 'bg-sky-400',
        label: 'Thấp',
        displayCode: 'LOW',
      };
    default:
      return {
        dotClass: 'bg-slate-400',
        label: 'Trung bình',
        displayCode: 'MID',
      };
  }
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.length > 0) {
      return msg;
    }
  }
  return fallback;
}

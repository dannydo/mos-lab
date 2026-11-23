import type { SyntheticEvent } from 'react';
import type { PilotSession } from '@mos-lab/shared';
import { DEFAULT_PILOT_SESSIONS } from './default-pilot-sessions';
import type { EvidenceFilterType, PilotCriteriaStats } from './pilot-criteria-sop.types';

/** Merge live sessions from props or fall back to the 17 pilot records from Đề Thám. */
export function mergeDisplaySessions(sessions?: PilotSession[]): PilotSession[] {
  if (sessions && sessions.length > 0) {
    // Prioritize sessions that have assessment data or are case studies
    const evaluated = sessions.filter(
      (s) => s.assessmentStatus || s.status === 'INELIGIBLE' || s.id === 10 || s.id === 5 || s.id === 7
    );
    if (evaluated.length >= 3) return sessions;
  }
  return DEFAULT_PILOT_SESSIONS as PilotSession[];
}

/** Filter pilot evidence sessions by assessment type and search query. */
export function filterCriteriaSessions(
  sessions: PilotSession[],
  evidenceFilter: EvidenceFilterType,
  searchQuery: string
): PilotSession[] {
  return sessions.filter((s) => {
    const isFail = s.assessmentStatus === 'FAIL' || s.status === 'INELIGIBLE';
    const isPass = s.assessmentStatus === 'PASS' || s.status === 'CHECKED_OUT' || s.status === 'FEEDBACK_DONE';
    const hasPhoto = Boolean(s.beforePhotoUrl || s.afterPhotoUrl);

    if (evidenceFilter === 'FAIL' && !isFail) return false;
    if (evidenceFilter === 'PASS' && !isPass) return false;
    if (evidenceFilter === 'HAS_PHOTO' && !hasPhoto) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = s.customerName?.toLowerCase().includes(q);
      const idMatch = String(s.id).includes(q);
      const phoneMatch = s.customerPhone?.includes(q);
      const reasonMatch = s.assessmentReason?.toLowerCase().includes(q);
      const notesMatch = s.assessmentNotes?.toLowerCase().includes(q);
      if (!nameMatch && !idMatch && !phoneMatch && !reasonMatch && !notesMatch) {
        return false;
      }
    }

    return true;
  });
}

/** Compute pass/fail/photo summary metrics across displayed pilot sessions. */
export function computeCriteriaStats(sessions: PilotSession[]): PilotCriteriaStats {
  const total = sessions.length;
  const passCount = sessions.filter(
    (s) => s.assessmentStatus === 'PASS' || (s.status !== 'INELIGIBLE' && s.assessmentStatus !== 'FAIL')
  ).length;
  const failCount = sessions.filter((s) => s.assessmentStatus === 'FAIL' || s.status === 'INELIGIBLE').length;
  const withPhotosCount = sessions.filter((s) => s.beforePhotoUrl || s.afterPhotoUrl).length;

  return {
    total,
    passCount,
    failCount,
    withPhotosCount,
    passRate: total > 0 ? ((passCount / total) * 100).toFixed(1) : '0',
  };
}

/** Format an ISO session date for Vietnamese locale display. */
export function formatCriteriaDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** Graceful fallback for broken evidence image thumbnails. */
export function hideBrokenImage(event: SyntheticEvent<HTMLImageElement>): void {
  event.currentTarget.style.display = 'none';
}

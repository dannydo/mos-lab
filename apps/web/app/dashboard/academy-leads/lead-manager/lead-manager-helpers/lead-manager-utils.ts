import dayjs from 'dayjs';
import { buildAcademyCourseSelectOptions } from '@mos-lab/shared';
import type {
  AcademyCourse,
  AcademyLead,
  AcademyLeadStatus,
  AcademyStaffOption,
  AcademyTalentAssessment,
  SafeAny,
  UpdateAcademyTalentAssessmentRequest,
} from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';
import { toAcademyTalentWorkshopView } from '../../components/academy-talent-workshop.adapter';
import type { AcademyTalentDraft } from '../../components/academy-talent-workshop.types';

export const STATUS_LABELS: Record<AcademyLeadStatus, string> = {
  NEW: 'Mới',
  WARM: 'Đang tư vấn',
  SCHEDULED: 'Đã hẹn test',
  TESTED: 'Đã test',
  WON: 'Đã chốt',
  LOST: 'Không phù hợp',
};

export const STATUS_TONES: Record<AcademyLeadStatus, StatusType> = {
  NEW: 'default',
  WARM: 'warning',
  SCHEDULED: 'processing',
  TESTED: 'purple',
  WON: 'success',
  LOST: 'error',
};

const STATUS_NEXT_STEPS: Record<AcademyLeadStatus, AcademyLeadStatus[]> = {
  NEW: ['NEW', 'WARM', 'SCHEDULED', 'LOST'],
  WARM: ['WARM', 'SCHEDULED', 'LOST'],
  SCHEDULED: ['SCHEDULED', 'WARM', 'TESTED', 'LOST'],
  TESTED: ['TESTED', 'WARM', 'WON', 'LOST'],
  WON: ['WON'],
  LOST: ['LOST'],
};

export function dateLabel(value: string | null) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';
}

export function userRole() {
  if (typeof window === 'undefined') return '';
  try {
    return String((JSON.parse(window.localStorage.getItem('mos_user') || '{}') as SafeAny).role || '');
  } catch {
    return '';
  }
}

export function statusOptionsFor(status: AcademyLeadStatus) {
  return STATUS_NEXT_STEPS[status].map((value) => ({ value, label: STATUS_LABELS[value] }));
}

export function followUpLabel(lead: AcademyLead) {
  const task = lead.nextFollowUp;
  if (!task) return 'Chưa có task';
  const due = task.dueAt ? dayjs(task.dueAt).format('DD/MM HH:mm') : 'Chưa hẹn hạn';
  return `${due} · ${task.content}`;
}

export function buildCourseOptions(courses: AcademyCourse[]) {
  return buildAcademyCourseSelectOptions(courses);
}

export function buildOwnerOptions(staff: AcademyStaffOption[]) {
  return [
    { value: 'UNASSIGNED' as const, label: 'Chưa giao' },
    ...staff.map((item) => ({ value: item.id, label: item.displayName })),
  ];
}

export function talentSessionNumber(assessment: AcademyTalentAssessment, sessions: AcademyTalentAssessment[]) {
  const ordered = [...sessions]
    .filter((item) => item.id !== assessment.id)
    .concat(assessment)
    .sort((left, right) => {
      const difference = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return difference || left.id - right.id;
    });
  return Math.max(1, ordered.findIndex((item) => item.id === assessment.id) + 1);
}

export function buildTalentSessions(assessments: AcademyTalentAssessment[]) {
  return assessments.map((item) => ({
    id: item.id,
    sessionNumber: talentSessionNumber(item, assessments),
    status: item.status,
    updatedAt: item.updatedAt,
    invoiceNumber: item.invoice?.documentNumber ?? null,
  }));
}

export function talentWorkshopView(assessment: AcademyTalentAssessment, sessions: AcademyTalentAssessment[]) {
  return toAcademyTalentWorkshopView(assessment, talentSessionNumber(assessment, sessions));
}

export function talentAssessmentRequest(draft: AcademyTalentDraft): UpdateAcademyTalentAssessmentRequest {
  return {
    eyeScore: draft.eyeScore,
    handScore: draft.handScore,
    strands5Min: draft.strands5Min,
    errorSkin: draft.errors.skin,
    errorRoot: draft.errors.root,
    errorStickies: draft.errors.stickies,
    errorDirection: draft.errors.direction,
    selectedCourseIds: draft.selectedCourseIds,
    selectedSampleCourseIds: draft.selectedSampleCourseIds,
    selectedKitCourseIds: draft.selectedKitCourseIds,
    selectedInstructorIdsByCourse: draft.selectedInstructorIdsByCourse,
    paymentMode: draft.paymentMode,
    ...(draft.depositVnd === null ? {} : { depositVnd: draft.depositVnd }),
    notes: draft.note,
  };
}

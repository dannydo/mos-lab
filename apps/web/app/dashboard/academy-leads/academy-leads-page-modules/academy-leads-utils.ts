import dayjs from 'dayjs';
import {
  type AcademyCourse,
  type AcademyLead,
  type AcademyLeadStatus,
  type AcademyPlaybook,
  type SafeAny,
  type UpsertAcademyCourseRequest,
  removeVietnameseTones,
} from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';

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

export type KnowledgeEditor =
  { kind: 'playbook'; record?: AcademyPlaybook } | { kind: 'course'; record?: AcademyCourse } | null;

export type CourseFormValues = UpsertAcademyCourseRequest & { syllabusText?: string };

export function dateLabel(value: string | null): string {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';
}

export function hotLabel(lead: AcademyLead): string | null {
  if (!lead.isHot || !lead.hotMarkedAt) return null;
  const age = dayjs().diff(dayjs(lead.hotMarkedAt), 'hour');
  if (age < 72) return 'Hot <72h';
  if (age < 168) return 'Warm 72–168h';
  return 'Hot quá hạn';
}

export function userRole(): string {
  if (typeof window === 'undefined') return '';
  try {
    return String((JSON.parse(window.localStorage.getItem('mos_user') || '{}') as SafeAny).role || '');
  } catch {
    return '';
  }
}

export function filterPlaybooks(playbooks: AcademyPlaybook[], search: string): AcademyPlaybook[] {
  const query = removeVietnameseTones(search);
  if (!query) return playbooks;
  return playbooks.filter((record) =>
    removeVietnameseTones(`${record.title} ${record.category} ${record.description || ''} ${record.content}`).includes(
      query
    )
  );
}

export function filterCourses(courses: AcademyCourse[], search: string): AcademyCourse[] {
  const query = removeVietnameseTones(search);
  if (!query) return courses;
  return courses.filter((record) =>
    removeVietnameseTones(`${record.code} ${record.name} ${record.tag || ''} ${record.description || ''}`).includes(
      query
    )
  );
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return responseMessage || fallback;
}

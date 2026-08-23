import React from 'react';
import { Button, Input, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { Pencil, Trophy } from 'lucide-react';
import type {
  AcademyLead,
  AcademyLeadStatus,
  AcademyCourse,
  AcademyStaffOption,
  AcademyTalentAssessment,
  SafeAny,
  UpdateAcademyTalentAssessmentRequest,
} from '@mos-lab/shared';
import { formatVND } from '../../../../lib/format-utils';
import { AppIcon, StatusTag } from '../../../../components/ui';
import { toAcademyTalentWorkshopView } from '../components/academy-talent-workshop.adapter';
import type { AcademyTalentDraft } from '../components/academy-talent-workshop.types';

export const STATUS_LABELS: Record<AcademyLeadStatus, string> = {
  NEW: 'Mới',
  WARM: 'Đang tư vấn',
  SCHEDULED: 'Đã hẹn test',
  TESTED: 'Đã test',
  WON: 'Đã chốt',
  LOST: 'Không phù hợp',
};

export const STATUS_TONES: Record<AcademyLeadStatus, React.ComponentProps<typeof StatusTag>['status']> = {
  NEW: 'default',
  WARM: 'warning',
  SCHEDULED: 'processing',
  TESTED: 'purple',
  WON: 'success',
  LOST: 'error',
};

export function dateLabel(value: string | null) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';
}

export function pipelineTabLabel(icon: React.ReactNode, label: string, count: number) {
  return (
    <span className="academy-lead-manager-tab-label">
      {icon}
      <span>
        {label} <span className="tabular-nums">({count})</span>
      </span>
    </span>
  );
}

export function userRole() {
  if (typeof window === 'undefined') return '';
  try {
    return String((JSON.parse(window.localStorage.getItem('mos_user') || '{}') as SafeAny).role || '');
  } catch {
    return '';
  }
}

const STATUS_NEXT_STEPS: Record<AcademyLeadStatus, AcademyLeadStatus[]> = {
  NEW: ['NEW', 'WARM', 'SCHEDULED', 'LOST'],
  WARM: ['WARM', 'SCHEDULED', 'LOST'],
  SCHEDULED: ['SCHEDULED', 'WARM', 'TESTED', 'LOST'],
  TESTED: ['TESTED', 'WARM', 'WON', 'LOST'],
  WON: ['WON'],
  LOST: ['LOST'],
};

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
  return courses.map((course) => ({
    value: course.name,
    label: [course.name, course.nameEn, course.code].filter(Boolean).join(' · '),
  }));
}

export function buildOwnerOptions(staff: AcademyStaffOption[]) {
  return [
    { value: 'UNASSIGNED' as const, label: 'Chưa giao' },
    ...staff.map((item) => ({ value: item.id, label: item.displayName })),
  ];
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

type InlineTextCellProps = {
  ariaLabel: string;
  value: string | null;
  placeholder: string;
  disabled?: boolean;
  multiline?: boolean;
  onSave: (value: string | null) => Promise<void>;
};

export function InlineTextCell({
  ariaLabel,
  value,
  placeholder,
  disabled,
  multiline = false,
  onSave,
}: InlineTextCellProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value || '');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [editing, value]);

  const finish = React.useCallback(async () => {
    if (!editing || saving) return;
    const next = draft.trim() || null;
    if (next === (value || null)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [draft, editing, onSave, saving, value]);

  if (editing) {
    const commonProps = {
      autoFocus: true,
      value: draft,
      disabled: saving,
      'aria-label': ariaLabel,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
      onBlur: () => void finish(),
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key === 'Escape') {
          setDraft(value || '');
          setEditing(false);
        }
        if (!multiline && event.key === 'Enter') {
          event.preventDefault();
          void finish();
        }
      },
    };
    return multiline ? (
      <Input.TextArea {...commonProps} autoSize={{ minRows: 1, maxRows: 3 }} />
    ) : (
      <Input size="small" {...commonProps} />
    );
  }

  return (
    <button
      type="button"
      className="academy-inline-edit-trigger"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => setEditing(true)}
    >
      <span className={value ? '' : 'academy-inline-edit-placeholder'}>{value || placeholder}</span>
      {!disabled && <AppIcon icon={Pencil} />}
    </button>
  );
}

type InlineVndCellProps = {
  value: number;
  disabled?: boolean;
  ariaLabel: string;
  onSave: (value: number) => Promise<void>;
};

export function InlineVndCell({ value, disabled, ariaLabel, onSave }: InlineVndCellProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  const finish = React.useCallback(async () => {
    if (!editing || saving) return;
    const next = Math.max(0, Math.round(Number(draft) || 0));
    if (next === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [draft, editing, onSave, saving, value]);

  if (editing) {
    return (
      <InputNumber
        autoFocus
        min={0}
        controls={false}
        className="w-full"
        aria-label={ariaLabel}
        value={draft}
        disabled={saving}
        formatter={(next) => formatVND(Math.max(0, Math.round(Number(next) || 0)))}
        parser={(next) => Number(String(next || '').replace(/[^\d]/g, ''))}
        onChange={(next) => setDraft(Number(next) || 0)}
        onBlur={() => void finish()}
        onPressEnter={() => void finish()}
      />
    );
  }

  return (
    <button
      type="button"
      className="academy-inline-edit-trigger academy-inline-money"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => setEditing(true)}
    >
      <span className="tabular-nums">{formatVND(value)}</span>
      {!disabled && <AppIcon icon={Pencil} />}
    </button>
  );
}

export function leadMobileCard(
  record: AcademyLead,
  onOpen: (lead: AcademyLead) => void,
  onOpenTalent: (lead: AcademyLead) => void
) {
  return (
    <article className="w-full rounded-xl border border-inherit p-3 text-left">
      <button type="button" className="w-full text-left" onClick={() => onOpen(record)}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <strong>{record.name}</strong>
            <div className="mt-1 text-xs opacity-70">
              {record.phone || 'Chưa có SĐT'} · {record.owner?.displayName || 'Chưa giao'}
            </div>
          </div>
          <StatusTag status={STATUS_TONES[record.status]} label={STATUS_LABELS[record.status]} />
        </div>
        <div className="mt-2 text-xs opacity-70">Lịch test: {dateLabel(record.scheduledAt)}</div>
      </button>
      <div className="mt-3 border-t border-inherit pt-2">
        <Button size="small" icon={<AppIcon icon={Trophy} />} onClick={() => onOpenTalent(record)}>
          Tố Chất
        </Button>
      </div>
    </article>
  );
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

import React from 'react';
import { Avatar, Button, Dropdown, Input, InputNumber, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  CalendarDays,
  ChevronDown,
  CircleCheck,
  CircleX,
  Flame,
  Link,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plane,
  Trophy,
  User,
} from 'lucide-react';
import type {
  AcademyLead,
  AcademyLeadStatus,
  AcademyLeadSummary,
  AcademyCourse,
  AcademyStaffOption,
  AcademyTalentAssessment,
  SafeAny,
  UpdateAcademyTalentAssessmentRequest,
} from '@mos-lab/shared';
import { formatVND } from '../../../../lib/format-utils';
import { AppIcon, CopyPhoneButton, StatusTag } from '../../../../components/ui';
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
            <div className="mt-1 text-xs opacity-70 flex items-center gap-1">
              <span>{record.phone || 'Chưa có SĐT'}</span>
              {record.phone && <CopyPhoneButton phone={record.phone} size="xs" as="span" />}
              <span>· {record.owner?.displayName || 'Chưa giao'}</span>
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

export function LeadManagerMetricStrip({ summary }: { summary: AcademyLeadSummary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <AppIcon icon={CalendarDays} className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tổng lead</div>
          <div className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
            {summary.total.toLocaleString('vi-VN')}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <AppIcon icon={CalendarDays} className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Đã hẹn test</div>
          <div className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
            {summary.scheduledCount.toLocaleString('vi-VN')}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <AppIcon icon={CircleCheck} className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Doanh thu chốt</div>
          <div className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatVND(summary.wonRevenueVnd)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <AppIcon icon={Flame} className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Hot &lt; 72 giờ</div>
          <div className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
            {summary.hotCount.toLocaleString('vi-VN')}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface BuildLeadColumnsParams {
  page: number;
  pageSize: number;
  updatingLeadId: number | null;
  onOpenLead: (lead: AcademyLead) => void;
  onOpenTalent: (lead: AcademyLead) => void;
  onQuickUpdate: (
    lead: AcademyLead,
    payload: { status?: AcademyLeadStatus; isHot?: boolean },
    successMessage: string
  ) => Promise<void>;
  onMarkTested: (lead: AcademyLead) => Promise<void>;
  onMarkNoShow: (lead: AcademyLead) => Promise<void>;
}

export function buildLeadColumns({
  page,
  pageSize,
  updatingLeadId,
  onOpenLead,
  onOpenTalent,
  onQuickUpdate,
  onMarkTested,
  onMarkNoShow,
}: BuildLeadColumnsParams): ColumnsType<AcademyLead> {
  return [
    {
      title: '#',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_value, lead, index) => (
        <div className="flex flex-col items-center justify-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <span className="tabular-nums text-xs font-semibold text-slate-500 dark:text-slate-400">
            {(page - 1) * pageSize + index + 1}
          </span>
          <Tooltip title={lead.isHot ? 'Lead Hot (Click để bỏ)' : 'Đánh dấu Lead Hot'}>
            <button
              type="button"
              aria-label={`Ưu tiên của ${lead.name}`}
              disabled={updatingLeadId === lead.id}
              onClick={() =>
                void onQuickUpdate(
                  lead,
                  { isHot: !lead.isHot },
                  !lead.isHot ? `Đã đánh dấu ${lead.name} là Hot.` : `Đã bỏ ưu tiên Hot cho ${lead.name}.`
                )
              }
              className={`p-1 rounded-full transition-all cursor-pointer ${
                lead.isHot
                  ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/60 hover:scale-110'
                  : 'text-slate-300 hover:text-rose-400 hover:bg-slate-100 dark:text-slate-600 dark:hover:text-rose-400 dark:hover:bg-slate-800'
              }`}
            >
              <AppIcon icon={Flame} className={`w-3.5 h-3.5 ${lead.isHot ? 'fill-rose-500' : ''}`} />
            </button>
          </Tooltip>
        </div>
      ),
    },
    {
      key: 'customer',
      title: 'Khách hàng',
      width: 240,
      render: (_, lead) => (
        <div className="flex items-start gap-2.5">
          <Avatar
            size={34}
            src={lead.avatarUrl}
            className="shrink-0 font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
          >
            {lead.name ? lead.name.charAt(0).toUpperCase() : 'U'}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className="font-semibold text-sm truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={() => onOpenLead(lead)}
              >
                {lead.name}
              </span>
              {lead.isHot && (
                <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-bold rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 shrink-0">
                  HOT
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
              {lead.phone ? (
                <span className="font-mono tabular-nums flex items-center gap-1">
                  {lead.phone}
                  <span onClick={(e) => e.stopPropagation()}>
                    <CopyPhoneButton phone={lead.phone} size="xs" as="span" />
                  </span>
                </span>
              ) : (
                <span className="italic opacity-60">Chưa có SĐT</span>
              )}
              {lead.source && (
                <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[85px]">
                  {lead.source}
                </span>
              )}
              {lead.facebookChatLink && (
                <Tooltip title="Mở chat Facebook / Pancake">
                  <a
                    href={lead.facebookChatLink}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 inline-flex items-center"
                    aria-label={`Mở chat Facebook của ${lead.name}`}
                  >
                    <AppIcon icon={Link} className="w-3.5 h-3.5" />
                  </a>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'pipeline',
      title: 'Pipeline & Phụ trách',
      width: 175,
      render: (_, lead) => {
        const statusOptions = statusOptionsFor(lead.status);
        const menuItems = statusOptions.map((opt) => ({
          key: opt.value,
          label: (
            <div className="flex items-center gap-2 py-0.5">
              <StatusTag status={STATUS_TONES[opt.value as AcademyLeadStatus]} label={opt.label} />
            </div>
          ),
          onClick: (info: any) => {
            info.domEvent?.stopPropagation?.();
            void onQuickUpdate(
              lead,
              { status: opt.value as AcademyLeadStatus },
              `Đã chuyển ${lead.name} sang ${STATUS_LABELS[opt.value as AcademyLeadStatus]}.`
            );
          },
        }));

        return (
          <div className="flex flex-col gap-1 items-start" onClick={(e) => e.stopPropagation()}>
            <Dropdown menu={{ items: menuItems }} trigger={['click']} disabled={updatingLeadId === lead.id}>
              <button
                type="button"
                aria-label={`Đổi pipeline của ${lead.name}`}
                className="inline-flex items-center gap-1 cursor-pointer transition-all hover:opacity-80 py-0.5 rounded"
              >
                <StatusTag status={STATUS_TONES[lead.status]} label={STATUS_LABELS[lead.status]} />
                <AppIcon icon={ChevronDown} className="w-3 h-3 text-slate-400" />
              </button>
            </Dropdown>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <AppIcon icon={User} className="w-3 h-3 opacity-60 shrink-0" />
              <span className="truncate max-w-[130px]">
                {lead.owner?.displayName || (
                  <span className="italic text-amber-600 dark:text-amber-400">Chưa giao</span>
                )}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'course',
      title: 'Khóa học & Mục tiêu',
      width: 220,
      render: (_, lead) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            {lead.course ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 truncate max-w-[200px]">
                {lead.course}
              </span>
            ) : (
              <span className="text-xs italic text-slate-400 dark:text-slate-500">Chưa chọn khóa</span>
            )}
          </div>
          {lead.goal ? (
            <Tooltip title={lead.goal}>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[210px]">🎯 {lead.goal}</span>
            </Tooltip>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-slate-600 italic">Chưa có mục tiêu</span>
          )}
        </div>
      ),
    },
    {
      key: 'schedule',
      title: 'Lịch test & Follow-up',
      width: 230,
      render: (_, lead) => {
        const isOverdue =
          lead.scheduledAt && dayjs(lead.scheduledAt).isBefore(dayjs(), 'minute') && lead.status === 'SCHEDULED';
        const isToday = lead.scheduledAt && dayjs(lead.scheduledAt).isSame(dayjs(), 'day');

        return (
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              {lead.scheduledAt ? (
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    isOverdue
                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                      : isToday
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <AppIcon icon={CalendarDays} className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="tabular-nums">{dayjs(lead.scheduledAt).format('DD/MM/YYYY HH:mm')}</span>
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 italic">Chưa hẹn test</span>
              )}
              {lead.flightDate && (
                <Tooltip title={`Ngày bay: ${dayjs(lead.flightDate).format('DD/MM/YYYY')}`}>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    <AppIcon icon={Plane} className="w-2.5 h-2.5" />
                    <span className="tabular-nums">{dayjs(lead.flightDate).format('DD/MM')}</span>
                  </span>
                </Tooltip>
              )}
            </div>
            {lead.nextFollowUp ? (
              <Tooltip
                title={`Follow-up: ${lead.nextFollowUp.content}${
                  lead.nextFollowUp.dueAt ? ` (Hạn: ${dayjs(lead.nextFollowUp.dueAt).format('DD/MM HH:mm')})` : ''
                }`}
              >
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 truncate max-w-[215px]">
                  <AppIcon icon={MessageSquare} className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate">{followUpLabel(lead)}</span>
                  {lead.pendingFollowUpCount > 1 && (
                    <span className="px-1 rounded text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 tabular-nums shrink-0">
                      +{lead.pendingFollowUpCount - 1}
                    </span>
                  )}
                </div>
              </Tooltip>
            ) : (
              <span className="text-[11px] text-slate-400 dark:text-slate-600 italic">Chưa có task</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'revenue',
      title: 'Tiền cọc / Doanh thu',
      width: 130,
      align: 'right',
      render: (_, lead) => (
        <div className="text-right">
          {lead.revenueVnd && lead.revenueVnd > 0 ? (
            <span className="font-semibold text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatVND(lead.revenueVnd)}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-600 tabular-nums">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Tác vụ',
      width: 150,
      align: 'center',
      render: (_, lead) => {
        const actionItems = [
          ...(lead.scheduledAt
            ? [
                {
                  key: 'tested',
                  label: 'Đánh dấu Đã test',
                  icon: <AppIcon icon={CircleCheck} className="text-emerald-500" />,
                  onClick: (e: any) => {
                    e?.domEvent?.stopPropagation?.();
                    void onMarkTested(lead);
                  },
                },
                {
                  key: 'noshow',
                  label: 'Ghi nhận Không đến',
                  icon: <AppIcon icon={CircleX} className="text-rose-500" />,
                  danger: true,
                  onClick: (e: any) => {
                    e?.domEvent?.stopPropagation?.();
                    void onMarkNoShow(lead);
                  },
                },
              ]
            : []),
          {
            key: 'edit',
            label: 'Xem & Sửa hồ sơ',
            icon: <AppIcon icon={Pencil} />,
            onClick: (e: any) => {
              e?.domEvent?.stopPropagation?.();
              onOpenLead(lead);
            },
          },
          ...(lead.facebookChatLink
            ? [
                {
                  key: 'chat',
                  label: 'Mở chat Facebook',
                  icon: <AppIcon icon={Link} className="text-blue-500" />,
                  onClick: (e: any) => {
                    e?.domEvent?.stopPropagation?.();
                    window.open(lead.facebookChatLink!, '_blank');
                  },
                },
              ]
            : []),
        ];

        return (
          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Mở chấm điểm Tố Chất Academy">
              <Button
                size="small"
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900/80 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-xs font-medium"
                icon={<AppIcon icon={Trophy} className="text-purple-600 dark:text-purple-400" />}
                onClick={() => void onOpenTalent(lead)}
              >
                Tố Chất
              </Button>
            </Tooltip>
            <Dropdown menu={{ items: actionItems }} trigger={['click']}>
              <Button
                size="small"
                type="text"
                className="hover:bg-slate-100 dark:hover:bg-slate-800"
                icon={
                  <AppIcon
                    icon={MoreHorizontal}
                    className="w-4 h-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  />
                }
              />
            </Dropdown>
          </div>
        );
      },
    },
  ];
}

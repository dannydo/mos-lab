'use client';

import React from 'react';
import { Avatar, Button, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Check, Clock3, X } from 'lucide-react';
import {
  ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS,
  removeVietnameseTones,
  type AcademyWorkshopParticipant,
  type AcademyWorkshopResourcesResponse,
} from '@mos-lab/shared';
import { AppIcon, DataTable, StatusTag, TableIndexHeader } from '../../../../components/ui';

export const WORKSHOP_ATTENDANCE_LABELS = {
  PENDING: 'Chưa xác nhận',
  CONFIRMED: 'Sẽ đến',
  DECLINED: 'Từ chối',
} as const;

export const WORKSHOP_FEE_LABELS = {
  FREE: 'Miễn phí',
  UNPAID: 'Chưa đóng',
  PARTIAL: 'Đóng một phần',
  PAID: 'Đã đóng',
  WAIVED: 'Được miễn',
} as const;

const ATTENDANCE_PRESENTATION = {
  PENDING: { status: 'default', icon: Clock3 },
  CONFIRMED: { status: 'success', icon: Check },
  DECLINED: { status: 'error', icon: X },
} as const;

const QUICK_ACTION_CLASS =
  'rounded-md text-left transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-current disabled:cursor-wait disabled:opacity-50';

function identityInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words
      .slice(-2)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase() || '?'
  );
}

export function WorkshopIdentityAvatar({
  name,
  avatarUrl,
  size,
}: {
  name: string;
  avatarUrl?: string | null;
  size: number;
}) {
  return (
    <Avatar size={size} src={avatarUrl || undefined} className="shrink-0">
      {identityInitials(name)}
    </Avatar>
  );
}

function WorkshopAttendanceStatus({ value }: { value: AcademyWorkshopParticipant['attendanceStatus'] }) {
  const presentation = ATTENDANCE_PRESENTATION[value];
  return (
    <StatusTag
      status={presentation.status}
      label={WORKSHOP_ATTENDANCE_LABELS[value]}
      icon={<AppIcon icon={presentation.icon} size={12} />}
    />
  );
}

function instructorIdentity(displayName: string): { role: string; name: string } {
  for (const role of ['Giảng viên', 'Head Master']) {
    if (displayName.startsWith(`${role} `)) return { role, name: displayName.slice(role.length + 1) };
  }
  if (displayName === 'Tự động phân bổ giảng viên') return { role: 'Giảng viên', name: 'Tự động phân bổ' };
  return { role: 'Giảng viên', name: displayName };
}

function WorkshopInstructorIdentity({
  name,
  avatarUrl,
  avatarSize,
}: {
  name: string;
  avatarUrl?: string | null;
  avatarSize: number;
}) {
  const identity = instructorIdentity(name);
  return (
    <span className="flex min-w-0 items-center gap-2 text-left">
      <WorkshopIdentityAvatar name={identity.name} avatarUrl={avatarUrl} size={avatarSize} />
      <span className="min-w-0 leading-none">
        <span className="block truncate text-[10px] font-medium tracking-wide opacity-55">{identity.role}</span>
        <span className="mt-0.5 block truncate text-sm font-semibold leading-tight">{identity.name}</span>
      </span>
    </span>
  );
}

export interface AcademyWorkshopRosterProps {
  participants: AcademyWorkshopParticipant[];
  resources: AcademyWorkshopResourcesResponse;
  loading: boolean;
  page: number;
  pageSize: number;
  busyParticipantId: number | null;
  talentLoading: boolean;
  talentParticipantId: number | null;
  canManageRestricted: boolean;
  onPageChange: (page: number, pageSize: number) => void;
  onOpenParticipant: (participant: AcademyWorkshopParticipant) => void;
  onOpenFee: (participant: AcademyWorkshopParticipant) => void;
  onUpdateCare: (
    participant: AcademyWorkshopParticipant,
    input: { infoSent?: boolean; attendanceStatus?: AcademyWorkshopParticipant['attendanceStatus'] },
    success: string
  ) => void;
  onCheckIn: (participant: AcademyWorkshopParticipant) => void;
  onAssignInstructor: (participant: AcademyWorkshopParticipant, instructorId: number | null) => void;
  onOpenTalent: (participant: AcademyWorkshopParticipant) => void;
}

export default function AcademyWorkshopRoster({
  participants,
  resources,
  loading,
  page,
  pageSize,
  busyParticipantId,
  talentLoading,
  talentParticipantId,
  canManageRestricted,
  onPageChange,
  onOpenParticipant,
  onOpenFee,
  onUpdateCare,
  onCheckIn,
  onAssignInstructor,
  onOpenTalent,
}: AcademyWorkshopRosterProps) {
  const columns = React.useMemo<ColumnsType<AcademyWorkshopParticipant>>(
    () => [
      {
        key: 'stt',
        title: <TableIndexHeader />,
        width: 56,
        align: 'center',
        render: (_value, _row, index) => <span className="tabular-nums">{(page - 1) * pageSize + index + 1}</span>,
      },
      {
        key: 'student',
        title: 'Học viên',
        width: 230,
        render: (_value, row) => (
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 text-left"
            onClick={() => onOpenParticipant(row)}
          >
            <WorkshopIdentityAvatar name={row.lead.name} avatarUrl={row.lead.avatarUrl} size={32} />
            <span className="min-w-0">
              <span className="block truncate font-semibold hover:underline">{row.lead.name}</span>
              <span className="block truncate text-xs opacity-60">
                {row.lead.phone || row.lead.email || 'Chưa có liên hệ'}
              </span>
            </span>
          </button>
        ),
      },
      {
        key: 'care',
        title: 'Trước workshop',
        width: 190,
        render: (_value, row) => (
          <div className="space-y-1">
            {row.infoSentAt ? (
              <StatusTag status="success" label="Đã gửi thông tin" />
            ) : (
              <button
                type="button"
                className={QUICK_ACTION_CLASS}
                disabled={busyParticipantId === row.id}
                title="Bấm để ghi nhận đã gửi thông tin"
                onClick={() => onUpdateCare(row, { infoSent: true }, 'Đã ghi audit gửi thông tin.')}
              >
                <StatusTag status="default" label="Chưa gửi" />
              </button>
            )}
            <div>
              <Select<AcademyWorkshopParticipant['attendanceStatus']>
                aria-label={`Xác nhận tham dự của ${row.lead.name}`}
                size="small"
                variant="borderless"
                popupMatchSelectWidth={false}
                value={row.attendanceStatus}
                disabled={busyParticipantId === row.id}
                options={Object.entries(WORKSHOP_ATTENDANCE_LABELS).map(([value, label]) => ({
                  value: value as AcademyWorkshopParticipant['attendanceStatus'],
                  label,
                }))}
                optionRender={(option) => (
                  <WorkshopAttendanceStatus value={option.value as AcademyWorkshopParticipant['attendanceStatus']} />
                )}
                labelRender={(option) => (
                  <WorkshopAttendanceStatus value={option.value as AcademyWorkshopParticipant['attendanceStatus']} />
                )}
                onChange={(attendanceStatus) =>
                  onUpdateCare(row, { attendanceStatus }, 'Đã cập nhật xác nhận tham dự.')
                }
              />
            </div>
          </div>
        ),
      },
      {
        key: 'fee',
        title: 'Phí workshop',
        width: 155,
        render: (_value, row) => {
          const feeStatus = (
            <StatusTag
              status={['FREE', 'PAID', 'WAIVED'].includes(row.feeStatus) ? 'success' : 'warning'}
              label={WORKSHOP_FEE_LABELS[row.feeStatus]}
            />
          );
          return (
            <div className="tabular-nums">
              {canManageRestricted ? (
                <button
                  type="button"
                  className={QUICK_ACTION_CLASS}
                  disabled={busyParticipantId === row.id}
                  onClick={() => onOpenFee(row)}
                >
                  {feeStatus}
                </button>
              ) : (
                feeStatus
              )}
              {row.feePaidVnd > 0 && <div className="mt-1 text-xs">{row.feePaidVnd.toLocaleString('vi-VN')} đ</div>}
            </div>
          );
        },
      },
      {
        key: 'menu',
        title: 'Thực đơn Việt Thái',
        width: 230,
        render: (_value, row) =>
          row.menuSelections.length ? (
            <div className="space-y-1 text-xs leading-5">
              {row.menuSelections.map((selection) => (
                <div key={selection.id} className="flex min-w-0 gap-1.5">
                  <span className="shrink-0 opacity-55">
                    {ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS[selection.category]}:
                  </span>
                  <span className="truncate font-semibold">{selection.itemName}</span>
                </div>
              ))}
            </div>
          ) : (
            <StatusTag status="default" label="Chưa chọn món" />
          ),
      },
      {
        key: 'equipment',
        title: 'Dụng cụ thực hành',
        width: 210,
        render: (_value, row) =>
          row.equipmentSelection ? (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{row.equipmentSelection.packageName}</div>
              <div className="mt-1 tabular-nums text-xs opacity-65">
                Phụ thu {row.equipmentSelection.priceVnd.toLocaleString('vi-VN')} đ
              </div>
            </div>
          ) : (
            <StatusTag status="default" label="Chưa chọn dụng cụ" />
          ),
      },
      {
        key: 'checkin',
        title: 'Check-in',
        width: 140,
        render: (_value, row) =>
          row.checkedInAt ? (
            <StatusTag status="success" label={dayjs(row.checkedInAt).format('HH:mm')} className="tabular-nums" />
          ) : (
            <button
              type="button"
              className={QUICK_ACTION_CLASS}
              disabled={busyParticipantId === row.id}
              onClick={() => onCheckIn(row)}
            >
              <StatusTag status="warning" label="Chưa đến" />
            </button>
          ),
      },
      {
        key: 'teacher',
        title: 'Giáo viên chính',
        width: 180,
        render: (_value, row) => (
          <Select<number>
            aria-label={`Giáo viên chính của ${row.lead.name}`}
            allowClear
            showSearch
            size="large"
            variant="borderless"
            className="w-full"
            placeholder="Chưa phân"
            value={row.primaryInstructor?.id}
            disabled={busyParticipantId === row.id}
            filterOption={(input, option) =>
              removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))
            }
            options={resources.instructors.map((item) => ({ value: item.id, label: item.displayName }))}
            optionRender={(option) => {
              const instructor = resources.instructors.find((item) => item.id === option.value);
              return (
                <WorkshopInstructorIdentity
                  name={instructor?.displayName || String(option.label || 'Giảng viên')}
                  avatarUrl={instructor?.avatarUrl}
                  avatarSize={28}
                />
              );
            }}
            labelRender={(option) => {
              const instructor = resources.instructors.find((item) => item.id === Number(option.value));
              return (
                <WorkshopInstructorIdentity
                  name={instructor?.displayName || String(option.label || 'Giảng viên')}
                  avatarUrl={instructor?.avatarUrl}
                  avatarSize={26}
                />
              );
            }}
            onChange={(instructorId) => onAssignInstructor(row, instructorId || null)}
          />
        ),
      },
      {
        key: 'conversion',
        title: 'Chốt khóa',
        width: 160,
        render: (_value, row) => (
          <button
            type="button"
            className={QUICK_ACTION_CLASS}
            disabled={talentLoading && talentParticipantId === row.id}
            onClick={() => onOpenTalent(row)}
          >
            {row.talent ? (
              <div>
                <StatusTag
                  status={row.talent.paymentStatus === 'PAID' ? 'success' : 'processing'}
                  label={
                    row.talent.paymentStatus === 'PAID'
                      ? 'Đã đóng học phí'
                      : row.talent.invoiceNumber
                        ? 'Đã xuất phiếu'
                        : 'Đã test'
                  }
                />
                <div className="mt-1 text-xs tabular-nums">{row.talent.strands5Min} sợi / 5 phút</div>
              </div>
            ) : (
              <StatusTag status="default" label="Chưa test" />
            )}
          </button>
        ),
      },
      {
        key: 'action',
        title: 'Thao tác',
        width: 110,
        render: (_value, row) => (
          <Button size="small" onClick={() => onOpenParticipant(row)}>
            Chăm sóc
          </Button>
        ),
      },
    ],
    [
      busyParticipantId,
      canManageRestricted,
      onAssignInstructor,
      onCheckIn,
      onOpenFee,
      onOpenParticipant,
      onOpenTalent,
      onUpdateCare,
      page,
      pageSize,
      resources.instructors,
      talentLoading,
      talentParticipantId,
    ]
  );

  return (
    <DataTable
      rowKey="id"
      columns={columns}
      dataSource={participants}
      loading={loading}
      scroll={{ x: 1480 }}
      pagination={{
        current: page,
        pageSize,
        total: participants.length,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (count) => `${count} học viên`,
        onChange: onPageChange,
      }}
    />
  );
}

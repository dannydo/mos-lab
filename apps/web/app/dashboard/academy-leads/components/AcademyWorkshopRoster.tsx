'use client';

import React from 'react';
import { Avatar, Button, Input, Select, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Check, Clock3, MessageCircle, X } from 'lucide-react';
import {
  ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LABELS,
  ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS,
  removeVietnameseTones,
  type AcademyWorkshopDesignItem,
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
  'rounded-lg text-left transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-wait disabled:opacity-50';

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
  menuTitle?: string | null;
  designs?: AcademyWorkshopDesignItem[];
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
  onOpenZaloScript?: (participant: AcademyWorkshopParticipant) => void;
  onOpenSelections?: (participant: AcademyWorkshopParticipant) => void;
}

export default function AcademyWorkshopRoster({
  participants,
  resources,
  menuTitle,
  designs,
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
  onOpenZaloScript,
  onOpenSelections,
}: AcademyWorkshopRosterProps) {
  const [designFilter, setDesignFilter] = React.useState<string | number>('ALL');
  const [searchKeyword, setSearchKeyword] = React.useState<string>('');

  const filteredParticipants = React.useMemo(() => {
    return participants.filter((p) => {
      if (designFilter !== 'ALL') {
        if (designFilter === 'UNSELECTED') {
          if (p.designSelection) return false;
        } else {
          if (p.designSelection?.designItemId !== Number(designFilter)) return false;
        }
      }
      if (searchKeyword.trim()) {
        const keyword = removeVietnameseTones(searchKeyword.toLowerCase().trim());
        const matchName = removeVietnameseTones(p.lead.name.toLowerCase()).includes(keyword);
        const matchPhone = (p.lead.phone || '').includes(keyword);
        const matchEmail = (p.lead.email || '').toLowerCase().includes(keyword);
        if (!matchName && !matchPhone && !matchEmail) return false;
      }
      return true;
    });
  }, [participants, designFilter, searchKeyword]);

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
                size="middle"
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
        title: menuTitle ? `Thực đơn (${menuTitle})` : 'Thực đơn',
        width: 230,
        render: (_value, row) => (
          <button
            type="button"
            className="group block w-full text-left transition-opacity hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSelections?.(row);
            }}
          >
            {row.menuSelections.length ? (
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
              <StatusTag
                status="default"
                label="Chưa chọn món"
                className="cursor-pointer transition-opacity group-hover:opacity-80"
              />
            )}
          </button>
        ),
      },
      {
        key: 'equipment',
        title: 'Dụng cụ thực hành',
        width: 210,
        render: (_value, row) => (
          <button
            type="button"
            className="group block w-full text-left transition-opacity hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSelections?.(row);
            }}
          >
            {row.equipmentSelection ? (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{row.equipmentSelection.packageName}</div>
                <div className="mt-1 tabular-nums text-xs opacity-65">
                  Phụ thu {row.equipmentSelection.priceVnd.toLocaleString('vi-VN')} đ
                </div>
              </div>
            ) : (
              <StatusTag
                status="default"
                label="Chưa chọn dụng cụ"
                className="cursor-pointer transition-opacity group-hover:opacity-80"
              />
            )}
          </button>
        ),
      },
      {
        key: 'design',
        title: 'Mẫu thiết kế mi',
        width: 210,
        render: (_value, row) => (
          <button
            type="button"
            className="group block w-full text-left transition-opacity hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSelections?.(row);
            }}
          >
            {row.designSelection ? (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{row.designSelection.designName}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                      row.designSelection.difficultyLevel === 'MASTER'
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                        : row.designSelection.difficultyLevel === 'ADVANCED'
                          ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    }`}
                  >
                    {ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LABELS[row.designSelection.difficultyLevel] ||
                      row.designSelection.difficultyLevel}
                  </span>
                  {row.designSelection.priceVnd > 0 && (
                    <span className="tabular-nums text-xs opacity-65">
                      +{row.designSelection.priceVnd.toLocaleString('vi-VN')} đ
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <StatusTag
                status="default"
                label="Chưa chọn mẫu mi"
                className="cursor-pointer transition-opacity group-hover:opacity-80"
              />
            )}
          </button>
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
            size="middle"
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
        width: 140,
        render: (_value, row) => (
          <Space size={4}>
            <Button size="small" onClick={() => onOpenParticipant(row)}>
              Chăm sóc
            </Button>
            {onOpenZaloScript ? (
              <Button
                size="small"
                icon={<AppIcon icon={MessageCircle} size={14} />}
                aria-label="Mở kịch bản tin nhắn Zalo"
                title="Mở kịch bản tin nhắn Zalo"
                onClick={() => onOpenZaloScript(row)}
              />
            ) : null}
          </Space>
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
      onOpenSelections,
      onOpenTalent,
      onOpenZaloScript,
      onUpdateCare,
      page,
      pageSize,
      resources.instructors,
      talentLoading,
      talentParticipantId,
    ]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Input.Search
            placeholder="Tìm theo tên, SĐT học viên..."
            allowClear
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-64"
          />
          {designs && designs.length > 0 && (
            <Select
              value={designFilter}
              onChange={setDesignFilter}
              className="w-64"
              options={[
                { value: 'ALL', label: `Tất cả mẫu mi (${participants.length})` },
                {
                  value: 'UNSELECTED',
                  label: `Chưa chọn mẫu (${participants.filter((p) => !p.designSelection).length})`,
                },
                ...designs.map((des) => {
                  const count = participants.filter((p) => p.designSelection?.designItemId === des.id).length;
                  return {
                    value: des.id,
                    label: `${des.name} · [${ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LABELS[des.difficultyLevel] || des.difficultyLevel}] (${count})`,
                  };
                }),
              ]}
            />
          )}
        </div>
        {filteredParticipants.length !== participants.length && (
          <div className="text-xs text-slate-500">
            Hiển thị{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredParticipants.length}</span> /{' '}
            {participants.length} học viên
          </div>
        )}
      </div>

      <DataTable
        rowKey="id"
        columns={columns}
        dataSource={filteredParticipants}
        loading={loading}
        scroll={{ x: 1700 }}
        pagination={{
          current: page,
          pageSize,
          total: filteredParticipants.length,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (count) => `${count} học viên`,
          onChange: onPageChange,
        }}
      />
    </div>
  );
}

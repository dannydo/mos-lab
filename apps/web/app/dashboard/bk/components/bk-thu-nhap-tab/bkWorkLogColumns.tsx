'use client';

import type { ReactNode } from 'react';
import { Button, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { LogIn, LogOut, Pencil } from 'lucide-react';
import {
  TELESALES_ATTENDANCE_EXCEPTION_OPTIONS,
  type BkWorkLogRecord,
  type SafeAny,
  type TelesalesAttendanceExceptionAuditLog,
} from '@mos-lab/shared';
import { StatusTag, type StatusType } from '~/components/ui';
import { formatBkIncomeCurrency, mapExceptionBadgeColorToStatus } from './bkThuNhapUtils';

interface BuildBkWorkLogTelesalesColumnsParams {
  canManageExceptions: boolean;
  onOpenExceptionModal: (row: BkWorkLogRecord) => void;
}

const renderWorkDateCell = (val: string, record: BkWorkLogRecord) => (
  <div className="flex flex-col">
    <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200 text-xs">{val}</span>
    <span className="text-[11px] text-slate-500">{record.dayOfWeek}</span>
  </div>
);

const renderWorkingMinuteCell = (val: number, record: BkWorkLogRecord) => (
  <div className="text-right">
    <span className="tabular-nums font-semibold text-xs text-slate-700 dark:text-slate-300">
      {val > 0 ? `${val} phút` : '--'}
    </span>
    {val > 0 && <span className="block text-[10px] text-slate-400">({record.totalHours}h)</span>}
  </div>
);

const renderDailySalaryCell = (val: number) => (
  <span className={`tabular-nums font-semibold text-xs ${val > 0 ? 'text-blue-500' : 'text-slate-400'}`}>
    {val > 0 ? formatBkIncomeCurrency(val) : '0 ₫'}
  </span>
);

const renderDefaultStatusTag = (isCheckIn: boolean, record: BkWorkLogRecord) => {
  if (isCheckIn) {
    return <StatusTag status="success" label="Đủ công" className="text-[11px]" />;
  }
  if (record.dayOfWeek === 'Chủ Nhật') {
    return <StatusTag status="default" label="Chủ Nhật (OFF)" className="text-[11px] text-slate-400" />;
  }
  return <StatusTag status="warning" label="Nghỉ (OFF)" className="text-[11px]" />;
};

interface PunchCellParams {
  val: string | null;
  emptyLabel: string;
  normalStatus: StatusType;
  icon: ReactNode;
  isManual?: boolean;
  manualTime?: string | null;
  manualDirectionLabel?: 'IN' | 'OUT';
}

const renderPunchCell = ({
  val,
  emptyLabel,
  normalStatus,
  icon,
  isManual = false,
  manualTime,
  manualDirectionLabel,
}: PunchCellParams) => (
  <div className="flex flex-col items-center gap-1">
    {val ? (
      <StatusTag
        status={isManual ? 'default' : normalStatus}
        icon={icon}
        label={val}
        className={`tabular-nums font-mono font-semibold text-xs py-0.5 px-2 ${isManual ? 'opacity-60' : ''}`}
      />
    ) : (
      <StatusTag status="default" label={emptyLabel} className="tabular-nums text-slate-400 text-[11px]" />
    )}
    {isManual && manualTime && (
      <Tooltip title={`Bổ sung ${manualDirectionLabel} thủ công: ${manualTime} (Manual / Manager Approved)`}>
        <StatusTag
          status="cyan"
          icon={icon}
          label={`${manualTime} (Bổ sung)`}
          className="tabular-nums font-mono font-semibold text-[10px] py-0.5 px-1.5"
        />
      </Tooltip>
    )}
  </div>
);

/** Builds the attendance work-log columns for Telesales Executive staff (with exception overrides). */
export function buildBkWorkLogTelesalesColumns({
  canManageExceptions,
  onOpenExceptionModal,
}: BuildBkWorkLogTelesalesColumnsParams): ColumnsType<BkWorkLogRecord> {
  return [
    {
      title: 'Ngày Làm Việc',
      dataIndex: 'workDate',
      key: 'workDate',
      width: 130,
      render: renderWorkDateCell,
    },
    {
      title: 'Giờ Vào (IN)',
      dataIndex: 'firstIn',
      key: 'firstIn',
      align: 'center' as const,
      width: 130,
      render: (val: string | null, r: BkWorkLogRecord) =>
        renderPunchCell({
          val,
          emptyLabel: 'Chưa quẹt IN',
          normalStatus: 'success',
          icon: <LogIn className="w-3 h-3" />,
          isManual: r.exception?.exceptionType === 'MANUAL_CHECKIN_OUT',
          manualTime: r.exception?.manualInTime || r.manualInTime,
          manualDirectionLabel: 'IN',
        }),
    },
    {
      title: 'Giờ Ra (OUT)',
      dataIndex: 'lastOut',
      key: 'lastOut',
      align: 'center' as const,
      width: 130,
      render: (val: string | null, r: BkWorkLogRecord) =>
        renderPunchCell({
          val,
          emptyLabel: 'Chưa quẹt OUT',
          normalStatus: 'orange',
          icon: <LogOut className="w-3 h-3" />,
          isManual: r.exception?.exceptionType === 'MANUAL_CHECKIN_OUT',
          manualTime: r.exception?.manualOutTime || r.manualOutTime,
          manualDirectionLabel: 'OUT',
        }),
    },
    {
      title: 'Thời Gian Làm',
      dataIndex: 'workingMinute',
      key: 'workingMinute',
      align: 'right' as const,
      width: 110,
      render: renderWorkingMinuteCell,
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'isCheckIn',
      key: 'isCheckIn',
      align: 'center' as const,
      width: 140,
      render: (isCheckIn: boolean, r: BkWorkLogRecord) => {
        if (r.exceptionBadge) {
          return (
            <Tooltip
              title={
                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-slate-300">Loại ngoại lệ:</span>{' '}
                    <strong>
                      {TELESALES_ATTENDANCE_EXCEPTION_OPTIONS[r.exceptionBadge.type]?.label || r.exceptionBadge.text}
                    </strong>
                  </div>
                  {r.exception?.exceptionType === 'MANUAL_CHECKIN_OUT' && (
                    <>
                      <div>
                        <span className="text-slate-300">IN bổ sung:</span>{' '}
                        <strong className="text-cyan-400 font-mono">{r.exception.manualInTime || '--'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-300">OUT bổ sung:</span>{' '}
                        <strong className="text-cyan-400 font-mono">{r.exception.manualOutTime || '--'}</strong>
                      </div>
                      {r.exception.note && (
                        <div>
                          <span className="text-slate-300">Ghi chú:</span>{' '}
                          <span className="italic">{r.exception.note}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-300">Đánh dấu:</span>{' '}
                        <StatusTag status="cyan" label="Manual / Manager Approved" className="text-[10px]" />
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-slate-300">Lý do:</span> <strong>{r.exception?.reason}</strong>
                  </div>
                  {r.exception?.approvedByName && (
                    <div>
                      <span className="text-slate-300">Duyệt bởi:</span> {r.exception.approvedByName}
                    </div>
                  )}
                  {r.exception?.updatedAt && (
                    <div>
                      <span className="text-slate-300">Thời gian:</span>{' '}
                      {dayjs(r.exception.updatedAt).format('DD/MM/YYYY HH:mm')}
                    </div>
                  )}
                  <div>
                    <span className="text-slate-300">Ngày công tính lại:</span>{' '}
                    <strong className="text-emerald-400">{r.effectiveWorkCredit} ngày công</strong>
                  </div>
                </div>
              }
            >
              <span className="inline-flex cursor-help">
                <StatusTag
                  status={mapExceptionBadgeColorToStatus(r.exceptionBadge.color)}
                  label={r.exceptionBadge.text}
                  className="text-[11px] font-semibold"
                />
              </span>
            </Tooltip>
          );
        }
        return renderDefaultStatusTag(isCheckIn, r);
      },
    },
    {
      title: 'Lương Ngày',
      dataIndex: 'dailySalary',
      key: 'dailySalary',
      align: 'right' as const,
      width: 120,
      render: renderDailySalaryCell,
    },
    {
      title: 'Ngoại Lệ',
      key: 'exceptionAction',
      align: 'center' as const,
      width: 120,
      render: (_: SafeAny, r: BkWorkLogRecord) => {
        if (canManageExceptions) {
          return (
            <Button
              size="small"
              type={r.exception ? 'primary' : 'default'}
              ghost={!!r.exception}
              icon={<Pencil className="w-3 h-3" />}
              className="text-[11px] font-medium"
              onClick={() => onOpenExceptionModal(r)}
            >
              {r.exception ? 'Sửa' : 'Duyệt'}
            </Button>
          );
        }
        return (
          <Tooltip title="Chỉ Quản lý (Manager) hoặc Admin mới có quyền thao tác">
            <span className="text-[11px] text-slate-400 italic">Chỉ xem</span>
          </Tooltip>
        );
      },
    },
  ];
}

/** Builds the standard IN/OUT work-log table columns for non-Telesales-Executive BK staff. */
export function buildBkWorkLogStandardColumns(): ColumnsType<BkWorkLogRecord> {
  return [
    {
      title: 'Ngày Làm Việc',
      dataIndex: 'workDate',
      key: 'workDate',
      width: 140,
      render: renderWorkDateCell,
    },
    {
      title: 'Giờ Vào (IN)',
      dataIndex: 'firstIn',
      key: 'firstIn',
      align: 'center' as const,
      width: 130,
      render: (val: string | null) =>
        renderPunchCell({
          val,
          emptyLabel: 'Chưa quẹt IN',
          normalStatus: 'success',
          icon: <LogIn className="w-3 h-3" />,
        }),
    },
    {
      title: 'Giờ Ra (OUT)',
      dataIndex: 'lastOut',
      key: 'lastOut',
      align: 'center' as const,
      width: 130,
      render: (val: string | null) =>
        renderPunchCell({
          val,
          emptyLabel: 'Chưa quẹt OUT',
          normalStatus: 'orange',
          icon: <LogOut className="w-3 h-3" />,
        }),
    },
    {
      title: 'Thời Gian Làm',
      dataIndex: 'workingMinute',
      key: 'workingMinute',
      align: 'right' as const,
      width: 130,
      render: renderWorkingMinuteCell,
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'isCheckIn',
      key: 'isCheckIn',
      align: 'center' as const,
      width: 130,
      render: renderDefaultStatusTag,
    },
    {
      title: 'Lương Ngày',
      dataIndex: 'dailySalary',
      key: 'dailySalary',
      align: 'right' as const,
      width: 130,
      render: renderDailySalaryCell,
    },
  ];
}

/** Builds audit log columns for attendance exception change history. */
export function buildBkWorkLogAuditColumns(): ColumnsType<TelesalesAttendanceExceptionAuditLog> {
  return [
    {
      title: 'Thời Gian Chỉnh',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (val: string) => (
        <span className="tabular-nums text-xs text-slate-600 dark:text-slate-300 font-mono">
          {dayjs(val).format('DD/MM/YYYY HH:mm:ss')}
        </span>
      ),
    },
    {
      title: 'Ngày Làm Việc',
      dataIndex: 'workDate',
      key: 'workDate',
      width: 110,
      render: (val: string) => <span className="tabular-nums text-xs font-semibold">{val}</span>,
    },
    {
      title: 'Hành Động',
      dataIndex: 'action',
      key: 'action',
      width: 110,
      align: 'center' as const,
      render: (val: string) =>
        val === 'CREATE' ? (
          <StatusTag status="processing" label="Thêm mới" />
        ) : val === 'UPDATE' ? (
          <StatusTag status="orange" label="Cập nhật" />
        ) : (
          <StatusTag status="error" label="Xóa" />
        ),
    },
    {
      title: 'Trạng Thái Trước → Sau',
      key: 'statusChange',
      width: 220,
      render: (_: SafeAny, r: TelesalesAttendanceExceptionAuditLog) => {
        const prevLabel = r.previousType
          ? TELESALES_ATTENDANCE_EXCEPTION_OPTIONS[r.previousType]?.shortLabel || r.previousType
          : 'Mặc định';
        const nextLabel = r.newType
          ? TELESALES_ATTENDANCE_EXCEPTION_OPTIONS[r.newType]?.shortLabel || r.newType
          : 'Mặc định';
        return (
          <span className="text-xs">
            <span className="text-slate-400">{prevLabel}</span> →{' '}
            <strong className="text-emerald-500">{nextLabel}</strong>
          </span>
        );
      },
    },
    {
      title: 'Lý Do & Chi Tiết Bổ Sung',
      key: 'reasonDetails',
      render: (_: SafeAny, r: TelesalesAttendanceExceptionAuditLog) => (
        <div className="space-y-1">
          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">{r.reason}</div>
          {(r.manualInTime || r.manualOutTime) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <StatusTag
                status="cyan"
                label={`IN: ${r.manualInTime || '--'} · OUT: ${r.manualOutTime || '--'}`}
                className="tabular-nums font-mono text-[10px]"
              />
              {r.note && <span className="text-[11px] text-slate-400 italic">({r.note})</span>}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Người Chỉnh',
      dataIndex: 'performedByName',
      key: 'performedByName',
      width: 130,
      render: (val: string) => <span className="text-xs font-semibold text-blue-500">{val || 'Quản lý'}</span>,
    },
  ];
}

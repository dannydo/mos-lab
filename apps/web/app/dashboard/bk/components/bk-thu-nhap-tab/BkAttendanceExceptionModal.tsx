'use client';

import { Button, Input, Select, Space } from 'antd';
import { Info, LogIn, LogOut, Pencil, Trash2 } from 'lucide-react';
import {
  TELESALES_ATTENDANCE_EXCEPTION_OPTIONS,
  type BkPaystubRecord,
  type BkWorkLogRecord,
  type BkWorkLogResponse,
  type TelesalesAttendanceExceptionType,
} from '@mos-lab/shared';
import { AdaptiveModal, StatusTag } from '~/components/ui';
import { formatBkIncomeCurrency, mapExceptionBadgeColorToStatus } from './bkThuNhapUtils';

interface BkAttendanceExceptionModalProps {
  open: boolean;
  workLogRecord: BkPaystubRecord | null;
  workLogData: BkWorkLogResponse | null;
  selectedWorkLog: BkWorkLogRecord | null;
  exceptionType: TelesalesAttendanceExceptionType | 'CLEAR';
  onExceptionTypeChange: (val: TelesalesAttendanceExceptionType | 'CLEAR') => void;
  exceptionReason: string;
  onExceptionReasonChange: (val: string) => void;
  manualInTime: string;
  onManualInTimeChange: (val: string) => void;
  manualOutTime: string;
  onManualOutTimeChange: (val: string) => void;
  exceptionNote: string;
  onExceptionNoteChange: (val: string) => void;
  savingException: boolean;
  onClose: () => void;
  onSaveException: (overrideType?: TelesalesAttendanceExceptionType | 'CLEAR') => void;
}

/** Modal for reviewing and approving Telesales Executive daily attendance exceptions (MOS-BUG-88). */
export function BkAttendanceExceptionModal({
  open,
  workLogRecord,
  workLogData,
  selectedWorkLog,
  exceptionType,
  onExceptionTypeChange,
  exceptionReason,
  onExceptionReasonChange,
  manualInTime,
  onManualInTimeChange,
  manualOutTime,
  onManualOutTimeChange,
  exceptionNote,
  onExceptionNoteChange,
  savingException,
  onClose,
  onSaveException,
}: BkAttendanceExceptionModalProps) {
  const previewOption = exceptionType !== 'CLEAR' ? TELESALES_ATTENDANCE_EXCEPTION_OPTIONS[exceptionType] : null;
  const previewCredit = selectedWorkLog
    ? previewOption
      ? previewOption.workCredit
      : selectedWorkLog.isCheckIn
        ? 1.0
        : 0.0
    : 0;
  const dailyRate =
    workLogData && workLogData.standardWorkDays > 0
      ? Math.round(workLogData.monthlyBaseSalary / workLogData.standardWorkDays)
      : 0;
  const previewDailySalary = Math.round(previewCredit * dailyRate);

  return (
    <AdaptiveModal
      intent="form"
      title={
        <div className="flex items-center gap-2">
          <Pencil className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            Ngoại lệ chấm công: <strong className="text-blue-500">{selectedWorkLog?.workDate}</strong> (
            {selectedWorkLog?.dayOfWeek})
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnHidden
    >
      {selectedWorkLog && workLogData && (
        <div className="space-y-4 py-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Nhân viên:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5">
                <span>{workLogRecord?.staffName} ·</span>
                <StatusTag status="cyan" label="Telesales Executive" className="text-[10px]" />
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Dữ liệu máy quẹt thẻ:</span>
              <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                IN: {selectedWorkLog.firstIn || 'Chưa quẹt'} · OUT: {selectedWorkLog.lastOut || 'Chưa quẹt'} (
                {selectedWorkLog.workingMinute} phút)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 italic">
              * Giờ Check-in / Check-out thực tế trên hệ thống được giữ nguyên 100% để đối soát.
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Loại ngoại lệ chấm công <span className="text-rose-500">*</span>:
            </label>
            <Select
              value={exceptionType}
              onChange={(val) => onExceptionTypeChange(val)}
              className="w-full"
              options={[
                ...Object.values(TELESALES_ATTENDANCE_EXCEPTION_OPTIONS).map((opt) => ({
                  value: opt.type,
                  label: (
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-medium">{opt.label}</span>
                      <StatusTag
                        status={mapExceptionBadgeColorToStatus(opt.badgeColor)}
                        label={opt.badgeText}
                        className="text-[10px]"
                      />
                    </div>
                  ),
                })),
                ...(selectedWorkLog.exception
                  ? [
                      {
                        value: 'CLEAR' as const,
                        label: <span className="text-slate-400">(Hủy ngoại lệ · Quay về chấm công theo máy)</span>,
                      },
                    ]
                  : []),
              ]}
            />
          </div>

          {exceptionType === 'MANUAL_CHECKIN_OUT' && (
            <div className="space-y-3 p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/50">
              <div className="text-[11px] text-cyan-800 dark:text-cyan-300 font-medium flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Dữ liệu gốc máy chấm công được giữ nguyên để đối soát. IN/OUT bổ sung được đánh dấu Manual / Manager
                  Approved.
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <LogIn className="w-3.5 h-3.5 text-emerald-500" /> Giờ IN bổ sung{' '}
                    <span className="text-rose-500">*</span>:
                  </label>
                  <Input
                    placeholder="HH:mm (VD: 08:00)"
                    value={manualInTime}
                    onChange={(e) => onManualInTimeChange(e.target.value)}
                    className="tabular-nums font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <LogOut className="w-3.5 h-3.5 text-orange-500" /> Giờ OUT bổ sung{' '}
                    <span className="text-rose-500">*</span>:
                  </label>
                  <Input
                    placeholder="HH:mm (VD: 17:00)"
                    value={manualOutTime}
                    onChange={(e) => onManualOutTimeChange(e.target.value)}
                    className="tabular-nums font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ghi chú thêm (nếu cần):
                </label>
                <Input
                  placeholder="Ghi chú nội bộ cho ca làm việc..."
                  value={exceptionNote}
                  onChange={(e) => onExceptionNoteChange(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>
                Lý do duyệt ngoại lệ <span className="text-rose-500">*</span>:
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Bắt buộc nhập lý do</span>
            </label>
            <Input.TextArea
              rows={3}
              placeholder={
                exceptionType === 'MANUAL_CHECKIN_OUT'
                  ? 'Nhân viên có đi làm thực tế, chấm công lỗi không ghi nhận IN/OUT. Manager xác nhận.'
                  : 'Ví dụ: Đau bụng – xin OFF buổi sáng, Manager duyệt'
              }
              value={exceptionReason}
              onChange={(e) => onExceptionReasonChange(e.target.value)}
              maxLength={500}
              showCount
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5 tabular-nums">
            <div className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Xem trước kết quả tự động tính lại:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-500">Ngày công tính lại:</span>{' '}
                <strong className="text-blue-600 dark:text-blue-400 font-bold">{previewCredit} ngày công</strong>
              </div>
              <div>
                <span className="text-slate-500">Lương ngày tính lại:</span>{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {formatBkIncomeCurrency(previewDailySalary)}
                </strong>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
            {selectedWorkLog.exception ? (
              <Button
                danger
                icon={<Trash2 className="w-3.5 h-3.5" />}
                loading={savingException}
                onClick={() => onSaveException('CLEAR')}
              >
                Hủy ngoại lệ
              </Button>
            ) : (
              <div />
            )}
            <Space>
              <Button onClick={onClose}>Đóng</Button>
              <Button type="primary" loading={savingException} onClick={() => onSaveException()}>
                Lưu ngoại lệ
              </Button>
            </Space>
          </div>
        </div>
      )}
    </AdaptiveModal>
  );
}

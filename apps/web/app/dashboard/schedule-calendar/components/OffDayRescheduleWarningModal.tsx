'use client';

import React from 'react';
import { Button } from 'antd';
import { TriangleAlert } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { AdaptiveModal, AppIcon } from '../../../../components/ui';

export interface OffDayRescheduleWarningModalProps {
  open: boolean;
  appointment: any | null;
  targetDate: string | null;
  nextWorkingDate: Dayjs | null;
  themeMode: 'dark' | 'light';
  onCancel: () => void;
  onContinue: () => void;
}

/** Keeps the off-day warning workflow isolated from the calendar assembler. */
export function OffDayRescheduleWarningModal({
  open,
  appointment,
  targetDate,
  nextWorkingDate,
  onCancel,
  onContinue,
}: OffDayRescheduleWarningModalProps) {
  return (
    <AdaptiveModal
      intent="confirm"
      open={open}
      destroyOnClose
      onCancel={onCancel}
      width={500}
      zIndex={2000}
      title={
        <div className="off-day-reschedule-warning-title">
          <AppIcon icon={TriangleAlert} size="md" />
          <span>⚠️ CẢNH BÁO CHUYÊN VIÊN NGHỈ TUẦN</span>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy thao tác
        </Button>,
        <Button key="continue" type="primary" onClick={onContinue}>
          Tiếp tục dời lịch
        </Button>,
      ]}
    >
      <div className="off-day-reschedule-warning-content">
        <p>
          Lịch hẹn của chị{' '}
          <strong>
            {appointment?.customerName ||
              appointment?.customer_name ||
              appointment?.customer?.displayName ||
              'Khách hàng'}
          </strong>{' '}
          đang được dời sang{' '}
          <strong className="off-day-reschedule-warning-emphasis">
            {targetDate ? dayjs(targetDate).format('dddd (DD/MM/YYYY)') : 'ngày nghỉ'}
          </strong>{' '}
          – trùng với lịch nghỉ tuần cố định (<code>Off</code>) của{' '}
          <strong className="off-day-reschedule-warning-emphasis">{appointment?.technicianName || 'Trancy'}</strong>.
        </p>

        <div className="off-day-reschedule-warning-hint">
          💡 <strong>Gợi ý:</strong> {appointment?.technicianName || 'Trancy'} sẽ đi làm lại vào{' '}
          <strong>{nextWorkingDate ? nextWorkingDate.format('dddd - DD/MM/YYYY') : 'Thứ 4 (12/08/2026)'}</strong>.
        </div>
      </div>
    </AdaptiveModal>
  );
}

export default React.memo(OffDayRescheduleWarningModal);

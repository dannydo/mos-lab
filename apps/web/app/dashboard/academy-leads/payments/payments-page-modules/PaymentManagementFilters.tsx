'use client';

import { DatePicker, Select, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import type { AcademyTalentPaymentManagementStatus } from '@mos-lab/shared';
import { STATUS_OPTIONS } from '../payment-management.helpers';

export interface PaymentManagementFiltersProps {
  month: Dayjs;
  status: AcademyTalentPaymentManagementStatus;
  onMonthChange: (value: Dayjs | null) => void;
  onStatusChange: (value: AcademyTalentPaymentManagementStatus) => void;
}

export function PaymentManagementFilters({
  month,
  status,
  onMonthChange,
  onStatusChange,
}: PaymentManagementFiltersProps) {
  return (
    <Space wrap>
      <DatePicker
        picker="month"
        allowClear={false}
        value={month}
        onChange={onMonthChange}
        aria-label="Tháng ghi nhận thu học phí"
      />
      <Select
        aria-label="Lọc trạng thái thu học phí"
        value={status}
        onChange={onStatusChange}
        options={STATUS_OPTIONS}
        className="min-w-[190px]"
      />
    </Space>
  );
}

import dayjs from 'dayjs';
import type { CcPaystubRecord } from '@mos-lab/shared';
import type { FormatHoursToHoursMinutesFn, SocialSecuritySubItem } from './types';

export const defaultFormatHoursToHoursMinutes: FormatHoursToHoursMinutesFn = (hrs, compact) =>
  compact ? `${hrs}h` : `${hrs} giờ`;

export function formatPaystubPeriod(dateRange?: [dayjs.Dayjs, dayjs.Dayjs]): string {
  return dateRange?.[0] ? dayjs(dateRange[0]).format('MM.YYYY') : dayjs().format('MM.YYYY');
}

export function formatRoundedVnd(value: number | null | undefined): string {
  return `${Math.round(value || 0).toLocaleString('vi-VN')}đ`;
}

export function formatSignedRoundedVnd(value: number | null | undefined): string {
  const num = value || 0;
  if (num < 0) {
    return `-${Math.round(Math.abs(num)).toLocaleString('vi-VN')}đ`;
  }
  return `+${Math.round(num).toLocaleString('vi-VN')}đ`;
}

export function formatOffMonthLeaveDetails(record: CcPaystubRecord): string {
  if (!record.offMonthLeaveDetails || record.offMonthLeaveDetails.length === 0) {
    return '—';
  }
  const hourlyRate = (record.hourlyRate || 25000).toLocaleString('vi-VN');
  return record.offMonthLeaveDetails
    .map(
      (detail) =>
        `Ngày ${dayjs(detail.date).format('DD/MM')} (ca ${detail.shiftHours || 9}h x ${hourlyRate}đ)${
          detail.note ? `: ${detail.note}` : ''
        }`
    )
    .join('; ');
}

export function getHolidayRowTitle(record: CcPaystubRecord): string {
  const workedDays = record.holidayWorkedDays || 0;
  const paidLeaveDays = record.holidayPaidLeaveDays || 0;

  if (workedDays > 0 && paidLeaveDays === 0) {
    return 'Lương ngày lễ x1 (Đi làm ngày lễ)';
  }
  if (workedDays > 0 && paidLeaveDays > 0) {
    return `Lương & Nghỉ lễ x1 (${paidLeaveDays} ngày nghỉ + ${workedDays} ngày làm)`;
  }
  return 'Nghỉ lễ x1 (Không đi làm vẫn có tiền)';
}

export function getHolidayRowFormula(record: CcPaystubRecord): string {
  if ((record.holidayWorkedHours || 0) > 0 || (record.holidayPaidLeaveHours || 0) > 0) {
    return `${record.holidayWorkedHours || 0} giờ đi làm + ${
      record.holidayPaidLeaveHours || 0
    } giờ nghỉ lễ (1x giờ làm đã tính trong Lương giờ)`;
  }
  return '—';
}

export function getHolidayRowAmount(record: CcPaystubRecord): number {
  return record.holidayPaidLeavePay || record.holidayPayrollAddition || record.holidayBasePay || 0;
}

export function getStandardTimeAndLeaveTotal(record: CcPaystubRecord): number {
  return (
    record.hourlyWage + (record.offMonthWage || 0) + (record.holidayPaidLeavePay || record.holidayPayrollAddition || 0)
  );
}

export function getTimeBonusTotal(record: CcPaystubRecord): number {
  return (record.offDaysWorkWage || 0) + (record.holidayPremiumPay || 0);
}

export function getNetIncomeAmount(record: CcPaystubRecord): number {
  return record.netIncome ?? record.totalIncome - (record.socialSecurityAmount || 0);
}

export function getEmployerSocialSecurityItems(record: CcPaystubRecord): SocialSecuritySubItem[] {
  const employer = record.socialSecurityBreakdown?.employer;
  return [
    { label: 'BHXH (17.5%)', amount: employer?.socialAmount || 945000 },
    { label: 'BHYT (3%)', amount: employer?.healthAmount || 162000 },
    { label: 'BHTN (1%)', amount: employer?.unemploymentAmount || 54000 },
  ];
}

export function getEmployeeSocialSecurityItems(record: CcPaystubRecord): SocialSecuritySubItem[] {
  const employee = record.socialSecurityBreakdown?.employee;
  return [
    { label: 'BHXH (8%)', amount: employee?.socialAmount || 432000 },
    { label: 'BHYT (1.5%)', amount: employee?.healthAmount || 81000 },
    { label: 'BHTN (1%)', amount: employee?.unemploymentAmount || 54000 },
  ];
}

/**
 * Canonical Telesales Executive (Booker) Operational & Compensation Standards
 * Reference: MOS-FEAT-26 Approved Plan
 */
export const TELESALES_EXECUTIVE_STANDARDS = {
  roleKey: 'telesales',
  roleName: 'Telesales Executive',
  schedule: {
    workingHours: '08:00 – 17:00',
    workingDays: 'Thứ 2 – Thứ 7',
    fixedOffDay: 'Chủ Nhật (Sunday)',
    fixedOffWeekday: 7,
    notes: 'Có thể đăng ký làm ngày OFF/Chủ nhật, trực Lễ/Tết hoặc OFF không lương với sự phê duyệt của Manager.',
  },
  dailyKpi: {
    totalCalls: 83,
    answeredCalls: 25,
    happyCalls: 20,
    bookings: 5,
  },
  monthlyKpi: {
    minDone: 100,
    excellentDone: 300,
    notes: 'Tối thiểu 100 Done/tháng. Đạt trên 300 Done/tháng xếp hạng nhân viên xuất sắc.',
  },
  compensation: {
    baseSalary: 5500000,
    baseSalaryFormatted: '5.500.000đ/tháng',
    prorationRule: 'Lương thực nhận = Lương cứng * (Ngày công thực tế / Ngày công tiêu chuẩn)',
    bonusMechanism: 'Thưởng Done, BK Tip (7%), Doanh số Net, và Tỷ lệ lỡ hẹn theo hệ thống cấu hình hiện có.',
  },
} as const;

export interface TelesalesAttendanceExceptionConfigItem {
  type:
    | 'OFF_MORNING'
    | 'OFF_AFTERNOON'
    | 'OFF_FULL_DAY'
    | 'HALF_DAY'
    | 'LATE_EXCUSED'
    | 'EARLY_LEAVE_EXCUSED'
    | 'OVERTIME_OFF_DAY'
    | 'MANUAL_CHECKIN_OUT';
  label: string;
  shortLabel: string;
  badgeText: string;
  badgeColor: string;
  workCredit: number;
  description: string;
}

export const TELESALES_ATTENDANCE_EXCEPTION_OPTIONS: Record<string, TelesalesAttendanceExceptionConfigItem> = {
  OFF_MORNING: {
    type: 'OFF_MORNING',
    label: 'OFF buổi sáng (Tính 0.5 công)',
    shortLabel: 'OFF sáng',
    badgeText: 'OFF SÁNG · ĐÃ DUYỆT',
    badgeColor: 'orange',
    workCredit: 0.5,
    description: 'Nghỉ sáng có phép, làm việc buổi chiều, hưởng 0.5 ngày công',
  },
  OFF_AFTERNOON: {
    type: 'OFF_AFTERNOON',
    label: 'OFF buổi chiều (Tính 0.5 công)',
    shortLabel: 'OFF chiều',
    badgeText: 'OFF CHIỀU · ĐÃ DUYỆT',
    badgeColor: 'orange',
    workCredit: 0.5,
    description: 'Nghỉ chiều có phép, làm việc buổi sáng, hưởng 0.5 ngày công',
  },
  OFF_FULL_DAY: {
    type: 'OFF_FULL_DAY',
    label: 'OFF cả ngày (Tính 0 công)',
    shortLabel: 'OFF cả ngày',
    badgeText: 'OFF CẢ NGÀY · ĐÃ DUYỆT',
    badgeColor: 'default',
    workCredit: 0.0,
    description: 'Nghỉ cả ngày có phép / không tính lương ngày',
  },
  HALF_DAY: {
    type: 'HALF_DAY',
    label: 'Làm nửa ngày (Tính 0.5 công)',
    shortLabel: 'Làm nửa ngày',
    badgeText: 'NỬA NGÀY · ĐÃ DUYỆT',
    badgeColor: 'cyan',
    workCredit: 0.5,
    description: 'Làm nửa ca việc, hưởng 0.5 ngày công',
  },
  LATE_EXCUSED: {
    type: 'LATE_EXCUSED',
    label: 'Đi trễ có phép (Tính 1.0 công)',
    shortLabel: 'Đi trễ có phép',
    badgeText: 'TRỄ CÓ PHÉP · ĐỦ CÔNG',
    badgeColor: 'blue',
    workCredit: 1.0,
    description: 'Đi trễ có lý do chính đáng được duyệt, tính đủ 1 ngày công',
  },
  EARLY_LEAVE_EXCUSED: {
    type: 'EARLY_LEAVE_EXCUSED',
    label: 'Về sớm có phép (Tính 1.0 công)',
    shortLabel: 'Về sớm có phép',
    badgeText: 'VỀ SỚM CÓ PHÉP · ĐỦ CÔNG',
    badgeColor: 'purple',
    workCredit: 1.0,
    description: 'Về sớm có lý do chính đáng được duyệt, tính đủ 1 ngày công',
  },
  OVERTIME_OFF_DAY: {
    type: 'OVERTIME_OFF_DAY',
    label: 'Làm bù / trực ngày OFF (Tính 1.0 công)',
    shortLabel: 'Làm bù / trực OFF',
    badgeText: 'LÀM BÙ / TRỰC OFF · +1 CÔNG',
    badgeColor: 'green',
    workCredit: 1.0,
    description: 'Đi làm bù hoặc trực vào ngày nghỉ/Chủ Nhật, tính cộng thêm 1 ngày công',
  },
  MANUAL_CHECKIN_OUT: {
    type: 'MANUAL_CHECKIN_OUT',
    label: 'Bổ sung IN/OUT do lỗi hệ thống (Tính đủ 1 công)',
    shortLabel: 'IN/OUT bổ sung',
    badgeText: 'IN/OUT BỔ SUNG – MANAGER ĐÃ DUYỆT',
    badgeColor: 'cyan',
    workCredit: 1.0,
    description: 'Bổ sung IN/OUT do lỗi hệ thống chấm công hoặc không ghi nhận, Manager xác nhận tính đủ 1 ngày công',
  },
};

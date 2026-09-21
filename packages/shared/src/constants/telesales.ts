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

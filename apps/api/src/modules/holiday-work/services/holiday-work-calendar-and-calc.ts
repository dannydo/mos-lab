import {
  DEFAULT_HOLIDAY_SELECTION_WEIGHTS,
  type AnnualHolidayCalendarResponse,
  type HolidayCalendarCompanyPeriod,
  type HolidayCalendarDay,
  type HolidayCalendarOccasion,
  type HolidayCalendarSource,
  type HolidayCandidateMetrics,
  type HolidayPayBasis,
  type HolidayPayBreakdown,
  type HolidayRosterStatus,
  type HolidaySelectionWeights,
  type StaffPerformanceSeverity,
} from '@mos-lab/shared';

export const ICT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const HOLIDAY_CALCULATION_VERSION = 'HOLIDAY_PAY_V1';
export const MINIMUM_RELEVANT_INTERACTIONS = 30;
export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_KEY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const EMPTY_BREAKDOWN: HolidayPayBreakdown = {
  holidayWorkedDays: 0,
  holidayWorkedHours: 0,
  holidayPaidLeaveDays: 0,
  holidayPaidLeaveHours: 0,
  holidayWorkedBasePay: 0,
  holidayPaidLeavePay: 0,
  holidayBasePay: 0,
  holidayPremiumPay: 0,
  holidayTotalValue: 0,
  holidayPayrollAddition: 0,
  holidayPaystubAdjustment: 0,
  holidayPayrollExceptionCount: 0,
};

export const HOLIDAY_CALENDAR_SOURCES_2026: HolidayCalendarSource[] = [
  {
    id: 'LABOUR_CODE_2019',
    title: 'Bộ luật Lao động 45/2019/QH14, Điều 111–112',
    url: 'https://vanban.chinhphu.vn/?docid=198540&lang=vi&pageid=27160',
  },
  {
    id: 'OFFICIAL_TET_NATIONAL_2026',
    title: 'Lịch nghỉ Tết Bính Ngọ và Quốc khánh 2026',
    url: 'https://xaydungchinhsach.chinhphu.vn/de-xuat-phuong-an-nghi-tet-am-lich-nghi-le-quoc-khanh-nam-2026-119251002130522291.htm',
  },
  {
    id: 'OFFICIAL_NEW_YEAR_2026',
    title: 'Lịch nghỉ Tết Dương lịch 2026',
    url: 'https://xaydungchinhsach.chinhphu.vn/lich-nghi-tet-duong-lich-2026-119251225111725138.htm',
  },
  {
    id: 'OFFICIAL_HUNG_KINGS_2026',
    title: 'Lịch Giỗ Tổ Hùng Vương 2026',
    url: 'https://xaydungchinhsach.chinhphu.vn/chi-tiet-thoi-gian-ke-hoach-to-chuc-gio-to-hung-vuong-le-hoi-den-hung-va-tuan-van-hoa-du-lich-dat-to-2026-119260329161504959.htm',
  },
  {
    id: 'VIETNAM_CULTURE_DAY_2026',
    title: 'Nghị quyết 28/2026/QH16 về Ngày Văn hóa Việt Nam',
    url: 'https://quochoi.vn/tintuc/Pages/tin-hoat-dong-cua-quoc-hoi.aspx?ItemID=99708',
  },
];

export type CalendarTemplate = Omit<HolidayCalendarOccasion, 'status' | 'daysUntil' | 'companyPeriod'>;

const calendarDay = (date: string, kind: HolidayCalendarDay['kind'], label: string): HolidayCalendarDay => ({
  date,
  kind,
  label,
  isPaidLeave: kind === 'PAID_HOLIDAY',
});

export const HOLIDAY_CALENDAR_2026: CalendarTemplate[] = [
  {
    code: 'NEW_YEAR_2026',
    name: 'Tết Dương lịch',
    shortName: 'Tết Dương lịch',
    breakStartDate: '2026-01-01',
    breakEndDate: '2026-01-04',
    paidLeaveDays: 1,
    days: [
      calendarDay('2026-01-01', 'PAID_HOLIDAY', 'Tết Dương lịch'),
      calendarDay('2026-01-02', 'SWAPPED_REST', 'Nghỉ hoán đổi khối công chức'),
      calendarDay('2026-01-03', 'WEEKLY_REST', 'Nghỉ hằng tuần'),
      calendarDay('2026-01-04', 'WEEKLY_REST', 'Nghỉ hằng tuần'),
    ],
    makeupWorkDates: ['2026-01-10'],
    planningNote:
      'Theo luật là 01 ngày 01/01. Chuỗi 04 ngày và ngày làm bù 10/01 là lịch tham chiếu của khối công chức; Wings áp dụng roster nội bộ.',
    sourceIds: ['LABOUR_CODE_2019', 'OFFICIAL_NEW_YEAR_2026'],
  },
  {
    code: 'LUNAR_NEW_YEAR_2026',
    name: 'Tết Nguyên đán Bính Ngọ',
    shortName: 'Tết Nguyên đán',
    breakStartDate: '2026-02-14',
    breakEndDate: '2026-02-22',
    paidLeaveDays: 5,
    days: [
      calendarDay('2026-02-14', 'WEEKLY_REST', 'Nghỉ hằng tuần'),
      calendarDay('2026-02-15', 'WEEKLY_REST', 'Nghỉ hằng tuần'),
      calendarDay('2026-02-16', 'PAID_HOLIDAY', '29 tháng Chạp'),
      calendarDay('2026-02-17', 'PAID_HOLIDAY', 'Mùng 1 Tết'),
      calendarDay('2026-02-18', 'PAID_HOLIDAY', 'Mùng 2 Tết'),
      calendarDay('2026-02-19', 'PAID_HOLIDAY', 'Mùng 3 Tết'),
      calendarDay('2026-02-20', 'PAID_HOLIDAY', 'Mùng 4 Tết'),
      calendarDay('2026-02-21', 'WEEKLY_REST', 'Nghỉ hằng tuần'),
      calendarDay('2026-02-22', 'WEEKLY_REST', 'Nghỉ hằng tuần'),
    ],
    makeupWorkDates: [],
    planningNote:
      'Luật quy định 05 ngày. Doanh nghiệp được chọn một trong các phương án 1–4, 2–3 hoặc 3–2 ngày trước/sau Tết và phải thông báo cho nhân sự.',
    sourceIds: ['LABOUR_CODE_2019', 'OFFICIAL_TET_NATIONAL_2026'],
  },
  {
    code: 'HUNG_KINGS_2026',
    name: 'Giỗ Tổ Hùng Vương',
    shortName: 'Giỗ Tổ Hùng Vương',
    breakStartDate: '2026-04-25',
    breakEndDate: '2026-04-27',
    paidLeaveDays: 1,
    days: [
      calendarDay('2026-04-25', 'WEEKLY_REST', 'Nghỉ hằng tuần'),
      calendarDay('2026-04-26', 'PAID_HOLIDAY', 'Mùng 10 tháng 3 âm lịch'),
      calendarDay('2026-04-27', 'COMPENSATORY_REST', 'Nghỉ bù do lễ trùng Chủ nhật'),
    ],
    makeupWorkDates: [],
    planningNote:
      'Ngày lễ rơi vào Chủ nhật 26/04; người có lịch nghỉ tuần vào Chủ nhật được nghỉ bù vào ngày làm việc kế tiếp.',
    sourceIds: ['LABOUR_CODE_2019', 'OFFICIAL_HUNG_KINGS_2026'],
  },
  {
    code: 'APRIL_30_MAY_1_2026',
    name: 'Ngày Chiến thắng & Quốc tế Lao động',
    shortName: 'Lễ 30/04 – 01/05',
    breakStartDate: '2026-04-30',
    breakEndDate: '2026-05-03',
    paidLeaveDays: 2,
    days: [
      calendarDay('2026-04-30', 'PAID_HOLIDAY', 'Ngày Chiến thắng'),
      calendarDay('2026-05-01', 'PAID_HOLIDAY', 'Ngày Quốc tế Lao động'),
      calendarDay('2026-05-02', 'WEEKLY_REST', 'Nghỉ hằng tuần'),
      calendarDay('2026-05-03', 'WEEKLY_REST', 'Nghỉ hằng tuần'),
    ],
    makeupWorkDates: [],
    planningNote:
      'Có 02 ngày nghỉ hưởng nguyên lương theo luật: 30/04 và 01/05. Cuối tuần liền kề phụ thuộc lịch làm việc của từng nhân sự.',
    sourceIds: ['LABOUR_CODE_2019'],
  },
  {
    code: 'NATIONAL_DAY_2026',
    name: 'Quốc khánh 02/09',
    shortName: 'Quốc khánh',
    breakStartDate: '2026-08-29',
    breakEndDate: '2026-09-02',
    paidLeaveDays: 2,
    days: [
      calendarDay('2026-08-29', 'WEEKLY_REST', 'Nghỉ hằng tuần'),
      calendarDay('2026-08-30', 'WEEKLY_REST', 'Nghỉ hằng tuần'),
      calendarDay('2026-08-31', 'SWAPPED_REST', 'Nghỉ hoán đổi khối công chức'),
      calendarDay('2026-09-01', 'PAID_HOLIDAY', 'Ngày liền trước Quốc khánh'),
      calendarDay('2026-09-02', 'PAID_HOLIDAY', 'Quốc khánh'),
    ],
    makeupWorkDates: ['2026-08-22'],
    planningNote:
      'Wings đã chọn 01–02/09 là 02 ngày lễ. Chuỗi 29/08–02/09 và ngày làm bù 22/08 là lịch tham chiếu của khối công chức.',
    sourceIds: ['LABOUR_CODE_2019', 'OFFICIAL_TET_NATIONAL_2026'],
  },
  {
    code: 'VIETNAM_CULTURE_DAY_2026',
    name: 'Ngày Văn hóa Việt Nam',
    shortName: 'Ngày Văn hóa Việt Nam',
    breakStartDate: '2026-11-24',
    breakEndDate: '2026-11-24',
    paidLeaveDays: 1,
    days: [calendarDay('2026-11-24', 'PAID_HOLIDAY', 'Ngày Văn hóa Việt Nam')],
    makeupWorkDates: [],
    planningNote:
      'Ngày nghỉ hưởng nguyên lương mới được Quốc hội bổ sung trong năm 2026. HR cần tạo kỳ và công bố roster Wings trước ngày lễ.',
    sourceIds: ['VIETNAM_CULTURE_DAY_2026'],
  },
];

export type Actor = { id: number; role: string; username?: string; email?: string };
export type RawMetric = {
  legacyStaffId: number;
  completedServices: number;
  fixCount: number;
  tippedVisits: number;
  speedRatio: number | null;
  feedbackCount: number;
  attendanceIncidentPoints: number;
};

export class HolidayWorkError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code = 'HOLIDAY_WORK_ERROR'
  ) {
    super(message);
  }
}

export const roundMoney = (value: number) => Math.round(Number.isFinite(value) ? value : 0);
export const roundHours = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const dateKey = (value: Date | string): string => {
  if (typeof value === 'string') return value.slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ICT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
};

export const toDbDate = (value: string): Date => {
  if (!DATE_KEY_PATTERN.test(value)) throw new HolidayWorkError(`Ngày không hợp lệ: ${value}`);
  // A holiday date is a calendar key, not an instant. Prisma/MySQL DATE uses
  // the UTC date portion, so construct UTC midnight directly. A Vietnam offset
  // would roll the date, or make the final calendar day compare after a stored
  // DATE boundary.
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || dateKey(parsed) !== value) {
    throw new HolidayWorkError(`Ngày không hợp lệ: ${value}`);
  }
  return parsed;
};

export const shiftDate = (value: string, days: number): string => {
  const [year, month, day] = value.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
};

export const dateDistance = (from: string, to: string) => {
  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toTime - fromTime) / 86_400_000);
};

export function buildVietnamHolidayCalendar2026(
  asOfDate: string,
  companyPeriods: HolidayCalendarCompanyPeriod[] = []
): AnnualHolidayCalendarResponse {
  toDbDate(asOfDate);
  const holidays = HOLIDAY_CALENDAR_2026.map<HolidayCalendarOccasion>((template) => {
    const status =
      asOfDate > template.breakEndDate ? 'PAST' : asOfDate >= template.breakStartDate ? 'ONGOING' : 'UPCOMING';
    const companyPeriod = companyPeriods.find((period) =>
      template.days.some((day) => day.isPaidLeave && day.date >= period.startDate && day.date <= period.endDate)
    );
    return {
      ...template,
      days: template.days.map((day) => ({ ...day })),
      makeupWorkDates: [...template.makeupWorkDates],
      sourceIds: [...template.sourceIds],
      status,
      daysUntil: status === 'PAST' ? null : Math.max(0, dateDistance(asOfDate, template.breakStartDate)),
      companyPeriod: companyPeriod || null,
    };
  });
  const nextHoliday = holidays.find((holiday) => holiday.status !== 'PAST');
  return {
    year: 2026,
    timezone: ICT_TIME_ZONE,
    asOfDate,
    scheduleStatus: 'OFFICIAL',
    occasionCount: holidays.length,
    officialPaidLeaveDays: holidays.reduce((sum, holiday) => sum + holiday.paidLeaveDays, 0),
    remainingPaidLeaveDays: holidays.reduce(
      (sum, holiday) => sum + holiday.days.filter((day) => day.isPaidLeave && day.date >= asOfDate).length,
      0
    ),
    nextHolidayCode: nextHoliday?.code || null,
    notice:
      'Đây là lịch pháp lý và lịch nghỉ tham chiếu năm 2026. Lịch nghỉ hoặc đi làm thực tế tại Wings phải theo roster do HR/Admin công bố; ngày cuối tuần và ngày hoán đổi không tự động áp dụng cho mọi ca làm.',
    holidays,
    sources: HOLIDAY_CALENDAR_SOURCES_2026.map((source) => ({ ...source })),
  };
}

export const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const normalizeName = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const normalizeWeights = (weights?: Partial<HolidaySelectionWeights>): HolidaySelectionWeights => {
  const normalized = {
    feedback: Math.max(0, Number(weights?.feedback ?? DEFAULT_HOLIDAY_SELECTION_WEIGHTS.feedback)),
    fix: Math.max(0, Number(weights?.fix ?? DEFAULT_HOLIDAY_SELECTION_WEIGHTS.fix)),
    tip: Math.max(0, Number(weights?.tip ?? DEFAULT_HOLIDAY_SELECTION_WEIGHTS.tip)),
    speed: Math.max(0, Number(weights?.speed ?? DEFAULT_HOLIDAY_SELECTION_WEIGHTS.speed)),
    attendance: Math.max(0, Number(weights?.attendance ?? DEFAULT_HOLIDAY_SELECTION_WEIGHTS.attendance)),
  };
  const total = Object.values(normalized).reduce((sum, value) => sum + value, 0);
  if (total <= 0) throw new HolidayWorkError('Tổng trọng số đề cử phải lớn hơn 0.');
  return normalized;
};

export const severityPoints = (severity: StaffPerformanceSeverity) => {
  if (severity === 'CRITICAL') return 8;
  if (severity === 'HIGH') return 4;
  if (severity === 'MEDIUM') return 2;
  return 1;
};

export const relativePercentile = (value: number | null, peerValues: Array<number | null>, higherIsBetter: boolean) => {
  if (value === null) return null;
  const values = peerValues.filter(
    (candidate): candidate is number => candidate !== null && Number.isFinite(candidate)
  );
  if (values.length <= 1) return 100;
  const better = values.filter((candidate) => (higherIsBetter ? candidate < value : candidate > value)).length;
  const equal = values.filter((candidate) => candidate === value).length - 1;
  return Math.round(((better + Math.max(0, equal) / 2) / (values.length - 1)) * 10000) / 100;
};

export function calculateHolidayCandidateScore(
  metrics: HolidayCandidateMetrics,
  weights: HolidaySelectionWeights,
  minimumInteractions = MINIMUM_RELEVANT_INTERACTIONS
) {
  const normalizedWeights = normalizeWeights(weights);
  const applicable: Array<[keyof HolidaySelectionWeights, number | null]> = [
    ['feedback', metrics.feedbackPercentile],
    ['fix', metrics.fixPercentile],
    ['tip', metrics.tipPercentile],
    ['speed', metrics.speedPercentile],
    ['attendance', metrics.attendancePercentile],
  ];
  const applicableWeight = applicable.reduce(
    (sum, [key, value]) => sum + (value === null ? 0 : normalizedWeights[key]),
    0
  );
  const dataSufficient = metrics.completedServices >= minimumInteractions && applicableWeight > 0;
  const totalScore = dataSufficient
    ? Math.round(
        (applicable.reduce((sum, [key, value]) => sum + (value === null ? 0 : value * normalizedWeights[key]), 0) /
          applicableWeight) *
          100
      ) / 100
    : null;
  return { totalScore, dataSufficient, applicableWeight };
}

export function calculateHolidayPayroll(input: {
  rosterStatus: HolidayRosterStatus;
  payBasis: HolidayPayBasis | null;
  hourlyRate: number;
  actualMinutes: number;
  standardShiftHours: number;
  paidLeaveMultiplier: number;
  workPremiumMultiplier: number;
  approvedLeave?: boolean;
}) {
  const actualHours = roundHours(Math.max(0, input.actualMinutes) / 60);
  const hourlyRate = roundMoney(input.hourlyRate);
  const baseIncludedInMonthlySalary = input.payBasis === 'MONTHLY';
  const readyZero = {
    ledgerStatus: 'READY' as const,
    actualHours,
    baseHolidayAmount: 0,
    holidayPremiumAmount: 0,
    holidayTotalValue: 0,
    payrollAdditionAmount: 0,
    baseIncludedInMonthlySalary,
    exceptionCode: null,
    exceptionMessage: null,
  };

  if (!input.payBasis) {
    return {
      ...readyZero,
      ledgerStatus: 'EXCEPTION' as const,
      exceptionCode: 'PAY_BASIS_MISSING',
      exceptionMessage: 'Chưa cấu hình hình thức trả lương HOURLY/MONTHLY.',
    };
  }
  if (hourlyRate <= 0) {
    return {
      ...readyZero,
      ledgerStatus: 'EXCEPTION' as const,
      exceptionCode: 'HOURLY_RATE_MISSING',
      exceptionMessage: 'Không xác định được đơn giá giờ hợp lệ tại ngày lễ.',
    };
  }
  if (['BOOKED_OFF', 'CANCELLED'].includes(input.rosterStatus)) return readyZero;
  if (input.approvedLeave && input.rosterStatus !== 'HOLIDAY_OFF') return readyZero;

  if (input.rosterStatus === 'HOLIDAY_OFF') {
    const baseHolidayAmount = roundMoney(
      input.standardShiftHours * hourlyRate * Math.max(0, input.paidLeaveMultiplier)
    );
    return {
      ...readyZero,
      actualHours: 0,
      baseHolidayAmount,
      holidayTotalValue: baseHolidayAmount,
      payrollAdditionAmount: baseIncludedInMonthlySalary ? 0 : baseHolidayAmount,
    };
  }

  if (input.rosterStatus !== 'SCHEDULED') {
    return {
      ...readyZero,
      ledgerStatus: 'EXCEPTION' as const,
      exceptionCode: 'ROSTER_NOT_FINAL',
      exceptionMessage: 'Roster chưa ở trạng thái SCHEDULED/HOLIDAY_OFF/BOOKED_OFF.',
    };
  }
  if (actualHours <= 0) {
    return {
      ...readyZero,
      ledgerStatus: 'EXCEPTION' as const,
      exceptionCode: 'ATTENDANCE_MISSING',
      exceptionMessage: 'Đã xếp đi làm nhưng chưa có working_minute hợp lệ.',
    };
  }

  const baseHolidayAmount = roundMoney(actualHours * hourlyRate);
  const holidayPremiumAmount = roundMoney(actualHours * hourlyRate * Math.max(0, input.workPremiumMultiplier));
  const holidayTotalValue = baseHolidayAmount + holidayPremiumAmount;
  return {
    ...readyZero,
    baseHolidayAmount,
    holidayPremiumAmount,
    holidayTotalValue,
    payrollAdditionAmount: baseIncludedInMonthlySalary ? holidayPremiumAmount : holidayTotalValue,
  };
}

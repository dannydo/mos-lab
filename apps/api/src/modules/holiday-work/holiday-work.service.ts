import type { FastifyInstance } from 'fastify';
import {
  type AnnualHolidayCalendarResponse,
  DEFAULT_HOLIDAY_SELECTION_WEIGHTS,
  type CreateHolidayPayrollAdjustmentRequest,
  type CreateStaffPerformanceEventRequest,
  type HolidayCandidateMetrics,
  type HolidayCandidateScore,
  type HolidayCalendarCompanyPeriod,
  type HolidayCalendarDay,
  type HolidayCalendarOccasion,
  type HolidayCalendarSource,
  type HolidayCoverageRequirement,
  type HolidayPayBasis,
  type HolidayPayBreakdown,
  type HolidayPayrollLedgerEntry,
  type HolidayPayrollAdjustment,
  type HolidayPeriod,
  type HolidayPeriodListResponse,
  type HolidayPeriodQuery,
  type HolidayPeriodSummary,
  type HolidayRosterEntry,
  type HolidayRosterStatus,
  type HolidaySelectionWeights,
  type HolidayWorkspaceResponse,
  type SafeAny,
  type StaffPerformanceEvent,
  type StaffPerformanceEventListResponse,
  type StaffPerformanceEventQuery,
  type StaffPerformanceSeverity,
  type UpsertHolidayBranchCoverageRequest,
  type UpsertHolidayCoverageRequest,
  type UpsertHolidayPeriodRequest,
  type UpsertHolidayRosterRequest,
} from '@mos-lab/shared';
import { StaffOffDayService } from '../staff/services/staff-off-day.service.js';

const ICT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const HOLIDAY_CALCULATION_VERSION = 'HOLIDAY_PAY_V1';
const MINIMUM_RELEVANT_INTERACTIONS = 30;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_KEY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMPTY_BREAKDOWN: HolidayPayBreakdown = {
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

const HOLIDAY_CALENDAR_SOURCES_2026: HolidayCalendarSource[] = [
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

type CalendarTemplate = Omit<HolidayCalendarOccasion, 'status' | 'daysUntil' | 'companyPeriod'>;

const calendarDay = (date: string, kind: HolidayCalendarDay['kind'], label: string): HolidayCalendarDay => ({
  date,
  kind,
  label,
  isPaidLeave: kind === 'PAID_HOLIDAY',
});

const HOLIDAY_CALENDAR_2026: CalendarTemplate[] = [
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

type Actor = { id: number; role: string; username?: string; email?: string };
type RawMetric = {
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

const roundMoney = (value: number) => Math.round(Number.isFinite(value) ? value : 0);
const roundHours = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const dateKey = (value: Date | string): string => {
  if (typeof value === 'string') return value.slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ICT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
};

const toDbDate = (value: string): Date => {
  if (!DATE_KEY_PATTERN.test(value)) throw new HolidayWorkError(`Ngày không hợp lệ: ${value}`);
  const parsed = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(parsed.getTime()) || dateKey(parsed) !== value) {
    throw new HolidayWorkError(`Ngày không hợp lệ: ${value}`);
  }
  return parsed;
};

const shiftDate = (value: string, days: number): string => {
  const [year, month, day] = value.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
};

const dateDistance = (from: string, to: string) => {
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

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeName = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const normalizeWeights = (weights?: Partial<HolidaySelectionWeights>): HolidaySelectionWeights => {
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

const severityPoints = (severity: StaffPerformanceSeverity) => {
  if (severity === 'CRITICAL') return 8;
  if (severity === 'HIGH') return 4;
  if (severity === 'MEDIUM') return 2;
  return 1;
};

const relativePercentile = (value: number | null, peerValues: Array<number | null>, higherIsBetter: boolean) => {
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
  if (input.approvedLeave || ['BOOKED_OFF', 'CANCELLED'].includes(input.rosterStatus)) return readyZero;

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

const mapPeriod = (record: SafeAny, summary?: HolidayPeriodSummary): HolidayPeriod => ({
  id: record.id,
  code: record.code,
  name: record.name,
  startDate: dateKey(record.startDate),
  endDate: dateKey(record.endDate),
  timezone: record.timezone,
  status: record.status,
  standardShiftHours: Number(record.standardShiftHours),
  workPremiumMultiplier: Number(record.workPremiumMultiplier),
  paidLeaveMultiplier: Number(record.paidLeaveMultiplier),
  monthlyStandardDays: Number(record.monthlyStandardDays),
  monthlyStandardHours: Number(record.monthlyStandardHours),
  selectionWindowDays: Number(record.selectionWindowDays),
  selectionWeights: normalizeWeights(parseJson(record.selectionWeightsJson, DEFAULT_HOLIDAY_SELECTION_WEIGHTS)),
  notes: record.notes,
  publishedAt: record.publishedAt?.toISOString() || null,
  payrollLockedAt: record.payrollLockedAt?.toISOString() || null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
  summary,
});

const mapCoverage = (record: SafeAny): HolidayCoverageRequirement => ({
  id: record.id,
  holidayId: record.holidayId,
  workDate: dateKey(record.workDate),
  storeId: record.storeId,
  storeKey: record.storeKey,
  teamCode: record.teamCode,
  shiftStart: record.shiftStart,
  shiftEnd: record.shiftEnd,
  requiredCount: record.requiredCount,
  notes: record.notes,
});

const mapCandidate = (record: SafeAny): HolidayCandidateScore => ({
  id: record.id,
  holidayId: record.holidayId,
  workDate: dateKey(record.workDate),
  crmStaffId: record.crmStaffId,
  legacyStaffId: record.legacyStaffId,
  displayName: record.displayName,
  avatarUrl: record.avatarUrl,
  teamCode: record.teamCode,
  storeId: record.storeId,
  storeKey: record.storeKey,
  scoreWindowFrom: dateKey(record.scoreWindowFrom),
  scoreWindowTo: dateKey(record.scoreWindowTo),
  totalScore: record.totalScore === null ? null : Number(record.totalScore),
  dataSufficient: Boolean(record.dataSufficient),
  dataCoverageReason: record.dataCoverageReason,
  metrics: parseJson<HolidayCandidateMetrics>(record.metricsJson, {
    completedServices: 0,
    verifiedNegativeFeedbackCount: 0,
    feedbackRate: null,
    fixCount: 0,
    fixRate: null,
    tippedVisits: 0,
    tipRate: null,
    medianSpeedRatio: null,
    attendanceIncidentPoints: 0,
    feedbackPercentile: null,
    fixPercentile: null,
    tipPercentile: null,
    speedPercentile: null,
    attendancePercentile: null,
  }),
  explanation: parseJson<string[]>(record.explanationJson, []),
  generatedAt: record.generatedAt.toISOString(),
});

const mapRoster = (record: SafeAny): HolidayRosterEntry => ({
  id: record.id,
  holidayId: record.holidayId,
  rosterKey: record.rosterKey,
  workDate: dateKey(record.workDate),
  crmStaffId: record.crmStaffId,
  legacyStaffId: record.legacyStaffId,
  importedName: record.importedName,
  displayName: record.displayName,
  avatarUrl: record.avatarUrl || null,
  teamCode: record.teamCode,
  storeId: record.storeId,
  storeKey: record.storeKey,
  shiftStart: record.shiftStart,
  shiftEnd: record.shiftEnd,
  status: record.status,
  nominationReason: record.nominationReason,
  decisionReason: record.decisionReason,
  isApprovedLeave: Boolean(record.isApprovedLeave),
  candidateScore: record.candidateScore ? mapCandidate(record.candidateScore) : null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const mapLedger = (record: SafeAny): HolidayPayrollLedgerEntry => ({
  id: record.id,
  holidayId: record.holidayId,
  rosterId: record.rosterId,
  workDate: dateKey(record.workDate),
  crmStaffId: record.crmStaffId,
  legacyStaffId: record.legacyStaffId,
  displayName: record.displayName,
  teamCode: record.teamCode,
  storeKey: record.storeKey,
  rosterStatus: record.rosterStatus,
  payBasis: record.payBasis,
  ledgerStatus: record.ledgerStatus,
  attendanceSource: record.attendanceSource,
  actualMinutes: record.actualMinutes,
  actualHours: Number(record.actualHours),
  standardShiftHours: Number(record.standardShiftHours),
  hourlyRate: record.hourlyRate,
  baseHolidayAmount: record.baseHolidayAmount,
  holidayPremiumAmount: record.holidayPremiumAmount,
  holidayTotalValue: record.holidayTotalValue,
  payrollAdditionAmount: record.payrollAdditionAmount,
  baseIncludedInMonthlySalary: Boolean(record.baseIncludedInMonthlySalary),
  exceptionCode: record.exceptionCode,
  exceptionMessage: record.exceptionMessage,
  calculationVersion: record.calculationVersion,
  lockedAt: record.lockedAt?.toISOString() || null,
  lockedByStaffId: record.lockedByStaffId,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const mapPerformanceEvent = (record: SafeAny): StaffPerformanceEvent => ({
  id: record.id,
  crmStaffId: record.crmStaffId,
  legacyStaffId: record.legacyStaffId,
  displayName: record.displayName,
  eventType: record.eventType,
  source: record.source,
  severity: record.severity,
  occurredAt: record.occurredAt.toISOString(),
  storeId: record.storeId,
  storeKey: record.storeKey,
  relatedOrderId: record.relatedOrderId,
  relatedTicketId: record.relatedTicketId,
  evidenceUrl: record.evidenceUrl,
  note: record.note,
  status: record.status,
  createdByStaffId: record.createdByStaffId,
  verifiedByStaffId: record.verifiedByStaffId,
  verifiedAt: record.verifiedAt?.toISOString() || null,
  rejectionReason: record.rejectionReason,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const mapAdjustment = (record: SafeAny): HolidayPayrollAdjustment => ({
  id: record.id,
  holidayId: record.holidayId,
  ledgerId: record.ledgerId,
  amount: record.amount,
  reason: record.reason,
  createdByStaffId: record.createdByStaffId,
  createdAt: record.createdAt.toISOString(),
});

const emptySummary = (): HolidayPeriodSummary => ({
  coverageRequired: 0,
  scheduled: 0,
  nominated: 0,
  holidayOff: 0,
  bookedOff: 0,
  payrollExceptions: 0,
  payrollReady: 0,
  payrollLocked: 0,
  totalPayrollAddition: 0,
});

export class HolidayWorkService {
  static isAdmin(actor: Actor) {
    return ['admin', 'super_admin'].includes(String(actor.role).toLowerCase());
  }

  static async getAnnualCalendar(fastify: FastifyInstance, year: number): Promise<AnnualHolidayCalendarResponse> {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new HolidayWorkError('Năm lịch không hợp lệ.');
    }
    if (year !== 2026) {
      throw new HolidayWorkError(
        `Lịch nghỉ lễ chính thức năm ${year} chưa được cấu hình.`,
        404,
        'HOLIDAY_CALENDAR_NOT_CONFIGURED'
      );
    }
    const periods = await fastify.prisma.crm.crmHolidayPeriod.findMany({
      where: {
        startDate: { lte: toDbDate(`${year}-12-31`) },
        endDate: { gte: toDbDate(`${year}-01-01`) },
      },
      orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });
    return buildVietnamHolidayCalendar2026(
      dateKey(new Date()),
      periods.map((period) => ({
        id: period.id,
        code: period.code,
        name: period.name,
        startDate: dateKey(period.startDate),
        endDate: dateKey(period.endDate),
        status: period.status as HolidayCalendarCompanyPeriod['status'],
      }))
    );
  }

  static async getLeaderTeamCodes(fastify: FastifyInstance, actor: Actor): Promise<string[]> {
    if (this.isAdmin(actor)) {
      const teams = await fastify.prisma.crm.crmTeam.findMany({ where: { isActive: true }, select: { code: true } });
      return teams.map((team) => team.code);
    }
    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: actor.id },
      select: { legacyStaffId: true },
    });
    if (!staff?.legacyStaffId) return [];
    const memberships = await fastify.prisma.crm.crmTeamMember.findMany({
      where: { legacyStaffId: staff.legacyStaffId, isActive: true, role: 'leader', team: { isActive: true } },
      select: { team: { select: { code: true } } },
    });
    return memberships.map((membership) => membership.team.code);
  }

  static async audit(
    fastify: FastifyInstance,
    input: {
      holidayId: number;
      action: string;
      entityType: string;
      entityId?: number | null;
      actorStaffId: number;
      reason?: string | null;
      before?: unknown;
      after?: unknown;
    }
  ) {
    await fastify.prisma.crm.crmHolidayAuditLog.create({
      data: {
        holidayId: input.holidayId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        actorStaffId: input.actorStaffId,
        reason: input.reason ?? null,
        beforeJson: input.before === undefined ? null : JSON.stringify(input.before),
        afterJson: input.after === undefined ? null : JSON.stringify(input.after),
      },
    });
  }

  static async listPeriods(fastify: FastifyInstance, query: HolidayPeriodQuery): Promise<HolidayPeriodListResponse> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = clamp(Number(query.limit || 20), 1, 100);
    const search = String(query.search || '').trim();
    const where = {
      ...(query.status && query.status !== 'ALL' ? { status: query.status } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] } : {}),
    };
    const [records, total] = await Promise.all([
      fastify.prisma.crm.crmHolidayPeriod.findMany({
        where,
        orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { coverage: true, roster: true, ledger: true, adjustments: true },
      }),
      fastify.prisma.crm.crmHolidayPeriod.count({ where }),
    ]);
    const globalSummary = emptySummary();
    const data = records.map((record) => {
      const summary = emptySummary();
      const payrollExceptionKeys = new Set<string>();
      record.coverage.forEach((item) => (summary.coverageRequired += item.requiredCount));
      record.roster.forEach((item) => {
        if (item.status === 'SCHEDULED') summary.scheduled += 1;
        else if (item.status === 'NOMINATED') summary.nominated += 1;
        else if (item.status === 'HOLIDAY_OFF') summary.holidayOff += 1;
        else if (item.status === 'BOOKED_OFF') summary.bookedOff += 1;
        else if (item.status === 'PAYROLL_EXCEPTION') {
          payrollExceptionKeys.add(`${dateKey(item.workDate)}:${item.legacyStaffId || item.displayName}`);
        }
      });
      record.ledger.forEach((item) => {
        if (item.ledgerStatus === 'EXCEPTION') {
          payrollExceptionKeys.add(`${dateKey(item.workDate)}:${item.legacyStaffId || item.displayName}`);
        }
        if (item.ledgerStatus === 'READY') summary.payrollReady += 1;
        if (item.ledgerStatus === 'LOCKED') summary.payrollLocked += 1;
        summary.totalPayrollAddition += item.payrollAdditionAmount;
      });
      summary.payrollExceptions = payrollExceptionKeys.size;
      record.adjustments.forEach((item) => (summary.totalPayrollAddition += item.amount));
      Object.keys(globalSummary).forEach((key) => {
        const typedKey = key as keyof HolidayPeriodSummary;
        globalSummary[typedKey] += summary[typedKey];
      });
      return mapPeriod(record, summary);
    });
    return { data, total, page, limit, summary: globalSummary };
  }

  static async getWorkspace(
    fastify: FastifyInstance,
    holidayId: number,
    actor: Actor
  ): Promise<HolidayWorkspaceResponse> {
    const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({
      where: { id: holidayId },
      include: {
        coverage: { orderBy: [{ workDate: 'asc' }, { storeKey: 'asc' }, { teamCode: 'asc' }] },
        roster: { orderBy: [{ workDate: 'asc' }, { status: 'asc' }, { displayName: 'asc' }] },
        candidates: { orderBy: [{ workDate: 'asc' }, { totalScore: 'desc' }, { displayName: 'asc' }] },
        ledger: { orderBy: [{ workDate: 'asc' }, { displayName: 'asc' }] },
        adjustments: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404, 'HOLIDAY_NOT_FOUND');
    const candidateByStaffDay = new Map(
      period.candidates.map((candidate) => [`${dateKey(candidate.workDate)}:${candidate.legacyStaffId}`, candidate])
    );
    const crmStaffIds = period.roster.map((entry) => entry.crmStaffId).filter((id): id is number => Boolean(id));
    const staffs = crmStaffIds.length
      ? await fastify.prisma.crm.crmStaff.findMany({
          where: { id: { in: crmStaffIds } },
          select: { id: true, avatarUrl: true },
        })
      : [];
    const avatarByStaffId = new Map(staffs.map((staff) => [staff.id, staff.avatarUrl]));
    const roster = period.roster.map((entry) =>
      mapRoster({
        ...entry,
        avatarUrl: entry.crmStaffId ? avatarByStaffId.get(entry.crmStaffId) : null,
        candidateScore: entry.legacyStaffId
          ? candidateByStaffDay.get(`${dateKey(entry.workDate)}:${entry.legacyStaffId}`)
          : null,
      })
    );
    const leaderTeams = await this.getLeaderTeamCodes(fastify, actor);
    return {
      period: mapPeriod(period),
      coverage: period.coverage.map(mapCoverage),
      roster: this.isAdmin(actor) ? roster : roster.filter((entry) => leaderTeams.includes(entry.teamCode)),
      candidates: (this.isAdmin(actor)
        ? period.candidates
        : period.candidates.filter((candidate) => leaderTeams.includes(candidate.teamCode))
      ).map(mapCandidate),
      ledger: this.isAdmin(actor) ? period.ledger.map(mapLedger) : [],
      adjustments: this.isAdmin(actor) ? period.adjustments.map(mapAdjustment) : [],
      canManage: this.isAdmin(actor),
      canNominate: this.isAdmin(actor) || leaderTeams.length > 0,
    };
  }

  static validatePeriodRequest(input: UpsertHolidayPeriodRequest) {
    const startDate = toDbDate(input.startDate);
    const endDate = toDbDate(input.endDate);
    if (startDate > endDate) throw new HolidayWorkError('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
    if (!/^[A-Z0-9_]{3,50}$/.test(input.code)) {
      throw new HolidayWorkError('Mã kỳ lễ chỉ gồm A-Z, 0-9 và dấu gạch dưới.');
    }
    if (!input.name.trim()) throw new HolidayWorkError('Tên kỳ lễ là bắt buộc.');
    const standardShiftHours = Number(input.standardShiftHours ?? 9);
    const monthlyStandardHours = Number(input.monthlyStandardHours ?? 234);
    const selectionWindowDays = Number(input.selectionWindowDays ?? 90);
    if (standardShiftHours <= 0 || standardShiftHours > 24) throw new HolidayWorkError('Ca chuẩn không hợp lệ.');
    if (monthlyStandardHours <= 0) throw new HolidayWorkError('Giờ chuẩn tháng phải lớn hơn 0.');
    if (selectionWindowDays < 1 || selectionWindowDays > 365) {
      throw new HolidayWorkError('Kỳ đánh giá phải từ 1 đến 365 ngày.');
    }
    return {
      code: input.code,
      name: input.name.trim(),
      startDate,
      endDate,
      timezone: ICT_TIME_ZONE,
      standardShiftHours,
      workPremiumMultiplier: Number(input.workPremiumMultiplier ?? 3),
      paidLeaveMultiplier: Number(input.paidLeaveMultiplier ?? 1),
      monthlyStandardDays: Number(input.monthlyStandardDays ?? 26),
      monthlyStandardHours,
      selectionWindowDays,
      selectionWeightsJson: JSON.stringify(normalizeWeights(input.selectionWeights)),
      notes: input.notes?.trim() || null,
    };
  }

  static async upsertPeriod(
    fastify: FastifyInstance,
    input: UpsertHolidayPeriodRequest,
    actor: Actor,
    holidayId?: number
  ) {
    const data = this.validatePeriodRequest(input);
    if (holidayId) {
      const existing = await fastify.prisma.crm.crmHolidayPeriod.findUnique({ where: { id: holidayId } });
      if (!existing) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
      if (existing.status !== 'DRAFT') throw new HolidayWorkError('Chỉ kỳ lễ DRAFT mới được sửa policy.', 409);
      const updated = await fastify.prisma.crm.crmHolidayPeriod.update({ where: { id: holidayId }, data });
      await this.audit(fastify, {
        holidayId,
        action: 'UPDATE_PERIOD',
        entityType: 'HOLIDAY_PERIOD',
        entityId: holidayId,
        actorStaffId: actor.id,
        before: existing,
        after: updated,
      });
      return mapPeriod(updated);
    }
    const created = await fastify.prisma.crm.crmHolidayPeriod.create({
      data: { ...data, createdByStaffId: actor.id },
    });
    await this.audit(fastify, {
      holidayId: created.id,
      action: 'CREATE_PERIOD',
      entityType: 'HOLIDAY_PERIOD',
      entityId: created.id,
      actorStaffId: actor.id,
      after: created,
    });
    return mapPeriod(created);
  }

  static async upsertCoverage(
    fastify: FastifyInstance,
    holidayId: number,
    input: UpsertHolidayCoverageRequest,
    actor: Actor,
    coverageId?: number
  ) {
    const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({ where: { id: holidayId } });
    if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
    if (period.status !== 'DRAFT') throw new HolidayWorkError('Chỉ được sửa nhu cầu khi kỳ lễ còn DRAFT.', 409);
    if (!TIME_KEY_PATTERN.test(input.shiftStart) || !TIME_KEY_PATTERN.test(input.shiftEnd)) {
      throw new HolidayWorkError('Khung giờ phải có dạng HH:mm.');
    }
    if (input.shiftStart >= input.shiftEnd) throw new HolidayWorkError('Giờ kết thúc phải sau giờ bắt đầu.');
    if (input.requiredCount < 1 || !Number.isInteger(input.requiredCount)) {
      throw new HolidayWorkError('Số nhân sự cần phải là số nguyên dương.');
    }
    const workDate = toDbDate(input.workDate);
    if (workDate < period.startDate || workDate > period.endDate) {
      throw new HolidayWorkError('Ngày coverage nằm ngoài kỳ lễ.');
    }
    const data = {
      holidayId,
      workDate,
      storeId: input.storeId ?? null,
      storeKey: input.storeKey.trim().toUpperCase(),
      teamCode: input.teamCode.trim().toUpperCase(),
      shiftStart: input.shiftStart,
      shiftEnd: input.shiftEnd,
      requiredCount: input.requiredCount,
      notes: input.notes?.trim() || null,
    };
    const before = coverageId
      ? await fastify.prisma.crm.crmHolidayCoverage.findUnique({ where: { id: coverageId } })
      : null;
    if (coverageId && (!before || before.holidayId !== holidayId)) {
      throw new HolidayWorkError('Không tìm thấy coverage.', 404);
    }
    const saved = coverageId
      ? await fastify.prisma.crm.crmHolidayCoverage.update({ where: { id: coverageId }, data })
      : await fastify.prisma.crm.crmHolidayCoverage.create({ data });
    await this.audit(fastify, {
      holidayId,
      action: coverageId ? 'UPDATE_COVERAGE' : 'CREATE_COVERAGE',
      entityType: 'HOLIDAY_COVERAGE',
      entityId: saved.id,
      actorStaffId: actor.id,
      before,
      after: saved,
    });
    return mapCoverage(saved);
  }

  static async upsertBranchCoverage(
    fastify: FastifyInstance,
    holidayId: number,
    input: UpsertHolidayBranchCoverageRequest,
    actor: Actor
  ): Promise<HolidayCoverageRequirement[]> {
    const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({ where: { id: holidayId } });
    if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
    if (period.status !== 'DRAFT') throw new HolidayWorkError('Chỉ được sửa nhu cầu khi kỳ lễ còn DRAFT.', 409);
    if (!TIME_KEY_PATTERN.test(input.shiftStart) || !TIME_KEY_PATTERN.test(input.shiftEnd)) {
      throw new HolidayWorkError('Khung giờ phải có dạng HH:mm.');
    }
    if (input.shiftStart >= input.shiftEnd) throw new HolidayWorkError('Giờ kết thúc phải sau giờ bắt đầu.');

    const counts = input.requiredByTeam;
    if (!counts || !Number.isInteger(counts.CC) || !Number.isInteger(counts.CV) || counts.CC < 0 || counts.CV < 0) {
      throw new HolidayWorkError('Nhu cầu CC và CV phải là số nguyên không âm.');
    }
    if (counts.CC + counts.CV < 1) {
      throw new HolidayWorkError('Cần ít nhất 1 nhân sự CC hoặc CV.');
    }

    const workDate = toDbDate(input.workDate);
    if (workDate < period.startDate || workDate > period.endDate) {
      throw new HolidayWorkError('Ngày coverage nằm ngoài kỳ lễ.');
    }

    const branch = await fastify.prisma.crm.crmStore.findUnique({ where: { id: input.storeId } });
    if (!branch || !branch.isActive || branch.storeType !== 'SALON') {
      throw new HolidayWorkError('Chi nhánh không tồn tại hoặc không còn hoạt động.');
    }
    const storeKey = branch.code.trim().toUpperCase();
    const targetWhere = {
      holidayId,
      workDate,
      storeKey,
      shiftStart: input.shiftStart,
      shiftEnd: input.shiftEnd,
      teamCode: { in: ['CC', 'CV'] },
    };
    const sourceWhere = input.source
      ? {
          holidayId,
          workDate: toDbDate(input.source.workDate),
          storeKey: input.source.storeKey.trim().toUpperCase(),
          shiftStart: input.source.shiftStart,
          shiftEnd: input.source.shiftEnd,
          teamCode: { in: ['CC', 'CV'] },
        }
      : null;
    const sourceMoved = Boolean(
      sourceWhere &&
      (dateKey(sourceWhere.workDate) !== dateKey(targetWhere.workDate) ||
        sourceWhere.storeKey !== targetWhere.storeKey ||
        sourceWhere.shiftStart !== targetWhere.shiftStart ||
        sourceWhere.shiftEnd !== targetWhere.shiftEnd)
    );
    const before = await fastify.prisma.crm.crmHolidayCoverage.findMany({
      where: sourceMoved && sourceWhere ? { OR: [sourceWhere, targetWhere] } : targetWhere,
    });

    const saved = await fastify.prisma.crm.$transaction(async (tx) => {
      if (sourceMoved && sourceWhere) {
        await tx.crmHolidayCoverage.deleteMany({ where: sourceWhere });
      }
      const rows: HolidayCoverageRequirement[] = [];
      for (const teamCode of ['CC', 'CV'] as const) {
        const requiredCount = counts[teamCode];
        const slotWhere = { ...targetWhere, teamCode };
        const existing = await tx.crmHolidayCoverage.findFirst({ where: slotWhere });
        if (requiredCount === 0) {
          if (existing) await tx.crmHolidayCoverage.delete({ where: { id: existing.id } });
          continue;
        }
        const data = {
          holidayId,
          workDate,
          storeId: branch.id,
          storeKey,
          teamCode,
          shiftStart: input.shiftStart,
          shiftEnd: input.shiftEnd,
          requiredCount,
          notes: input.notes?.trim() || null,
        };
        const record = existing
          ? await tx.crmHolidayCoverage.update({ where: { id: existing.id }, data })
          : await tx.crmHolidayCoverage.create({ data });
        rows.push(mapCoverage(record));
      }
      return rows;
    });

    await this.audit(fastify, {
      holidayId,
      action: 'UPSERT_BRANCH_COVERAGE',
      entityType: 'HOLIDAY_COVERAGE',
      actorStaffId: actor.id,
      before,
      after: saved,
    });
    return saved;
  }

  static rosterKey(
    input: Pick<UpsertHolidayRosterRequest, 'workDate' | 'legacyStaffId' | 'importedName' | 'displayName'>
  ) {
    const identity = input.legacyStaffId
      ? `staff:${input.legacyStaffId}`
      : `name:${normalizeName(input.importedName || input.displayName)}`;
    return `${input.workDate}:${identity}`;
  }

  static async upsertRoster(
    fastify: FastifyInstance,
    holidayId: number,
    input: UpsertHolidayRosterRequest,
    actor: Actor,
    rosterId?: number
  ) {
    const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({ where: { id: holidayId } });
    if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
    if (period.status === 'PAYROLL_LOCKED') throw new HolidayWorkError('Kỳ lương đã khóa, không thể sửa roster.', 409);
    const workDate = toDbDate(input.workDate);
    if (workDate < period.startDate || workDate > period.endDate) {
      throw new HolidayWorkError('Ngày roster nằm ngoài kỳ lễ.');
    }
    if (!TIME_KEY_PATTERN.test(input.shiftStart) || !TIME_KEY_PATTERN.test(input.shiftEnd)) {
      throw new HolidayWorkError('Khung giờ phải có dạng HH:mm.');
    }
    const leaderTeams = await this.getLeaderTeamCodes(fastify, actor);
    const teamCode = input.teamCode.trim().toUpperCase();
    if (!this.isAdmin(actor) && (!leaderTeams.includes(teamCode) || input.status !== 'NOMINATED')) {
      throw new HolidayWorkError('Manager chỉ được đề cử NOMINATED trong đội mình phụ trách.', 403);
    }
    if (!this.isAdmin(actor) && !input.nominationReason?.trim()) {
      throw new HolidayWorkError('Manager phải nhập lý do đề cử.');
    }
    if (this.isAdmin(actor) && input.status === 'SCHEDULED' && !input.legacyStaffId) {
      throw new HolidayWorkError('Không thể SCHEDULED khi tên chưa khớp legacyStaffId.');
    }
    const before = rosterId ? await fastify.prisma.crm.crmHolidayRoster.findUnique({ where: { id: rosterId } }) : null;
    if (rosterId && (!before || before.holidayId !== holidayId)) {
      throw new HolidayWorkError('Không tìm thấy roster.', 404);
    }
    if (
      before?.status === 'PAYROLL_EXCEPTION' &&
      input.status !== 'PAYROLL_EXCEPTION' &&
      (!input.decisionReason?.trim() || input.decisionReason.trim() === before.decisionReason?.trim())
    ) {
      throw new HolidayWorkError('Cần ghi lý do khi xử lý ngoại lệ roster.');
    }
    if (this.isAdmin(actor) && input.status === 'SCHEDULED' && input.legacyStaffId) {
      const candidate = await fastify.prisma.crm.crmHolidayCandidateSnapshot.findUnique({
        where: {
          holiday_candidate_staff_day: {
            holidayId,
            workDate,
            legacyStaffId: input.legacyStaffId,
          },
        },
        select: { dataSufficient: true },
      });
      if (candidate && !candidate.dataSufficient && !input.decisionReason?.trim()) {
        throw new HolidayWorkError('Nhân sự chưa đủ mẫu dữ liệu; Admin phải ghi lý do khi chốt đi làm.');
      }
    }
    const data = {
      holidayId,
      rosterKey: this.rosterKey(input),
      workDate,
      crmStaffId: input.crmStaffId ?? null,
      legacyStaffId: input.legacyStaffId ?? null,
      importedName: input.importedName?.trim() || null,
      displayName: input.displayName.trim(),
      teamCode,
      storeId: input.storeId ?? null,
      storeKey: input.storeKey.trim().toUpperCase(),
      shiftStart: input.shiftStart,
      shiftEnd: input.shiftEnd,
      status: input.status,
      nominationReason: input.nominationReason?.trim() || null,
      decisionReason: input.decisionReason?.trim() || null,
      nominatedByStaffId: input.status === 'NOMINATED' ? actor.id : before?.nominatedByStaffId || null,
      scheduledByStaffId: input.status === 'SCHEDULED' ? actor.id : before?.scheduledByStaffId || null,
    };
    const saved = rosterId
      ? await fastify.prisma.crm.crmHolidayRoster.update({ where: { id: rosterId }, data })
      : await fastify.prisma.crm.crmHolidayRoster.upsert({
          where: { holiday_roster_key: { holidayId, rosterKey: data.rosterKey } },
          create: data,
          update: data,
        });
    await this.audit(fastify, {
      holidayId,
      action: rosterId ? 'UPDATE_ROSTER' : 'UPSERT_ROSTER',
      entityType: 'HOLIDAY_ROSTER',
      entityId: saved.id,
      actorStaffId: actor.id,
      reason: input.decisionReason || input.nominationReason,
      before,
      after: saved,
    });
    return mapRoster(saved);
  }

  static async generateCandidates(fastify: FastifyInstance, holidayId: number, actor: Actor) {
    const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({
      where: { id: holidayId },
      include: { coverage: true },
    });
    if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
    if (period.status === 'PAYROLL_LOCKED') throw new HolidayWorkError('Kỳ lương đã khóa.', 409);
    const teamCodes = [...new Set(period.coverage.map((item) => item.teamCode))];
    if (teamCodes.length === 0) throw new HolidayWorkError('Cần cấu hình nhu cầu nhân sự trước khi chấm điểm.');

    const teams = await fastify.prisma.crm.crmTeam.findMany({
      where: { code: { in: teamCodes }, isActive: true },
      include: { members: { where: { isActive: true } } },
    });
    const memberships = teams.flatMap((team) =>
      team.members.map((member) => ({
        teamCode: team.code,
        legacyStaffId: member.legacyStaffId,
        crmStaffId: member.crmStaffId,
        fallbackName: member.displayName,
      }))
    );
    const legacyStaffIds = [...new Set(memberships.map((member) => member.legacyStaffId).filter(Boolean))];
    if (legacyStaffIds.length === 0) throw new HolidayWorkError('Các đội chưa có nhân sự active để xếp hạng.');

    const crmStaffs = await fastify.prisma.crm.crmStaff.findMany({
      where: { legacyStaffId: { in: legacyStaffIds }, isActive: true },
      select: { id: true, legacyStaffId: true, displayName: true, avatarUrl: true },
    });
    const crmByLegacyId = new Map(crmStaffs.map((staff) => [Number(staff.legacyStaffId), staff]));
    const profileRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT up.user_id AS legacyStaffId,
              up.full_name AS displayName,
              up.client_store_id AS storeId,
              UPPER(COALESCE(cs.client_store_key, 'UNASSIGNED')) AS storeKey
       FROM user_profile up
       LEFT JOIN client_store cs ON cs.id = up.client_store_id
       WHERE up.user_id IN (${legacyStaffIds.map(() => '?').join(',')})
         AND up.is_disabled = 0 AND up.is_leaved = 0 AND up.is_deleted = 0`,
      ...legacyStaffIds
    );
    const profileById = new Map(profileRows.map((row) => [Number(row.legacyStaffId), row]));
    const uniqueDates = [...new Set(period.coverage.map((item) => dateKey(item.workDate)))];
    const allSnapshots: HolidayCandidateScore[] = [];

    for (const workDate of uniqueDates) {
      const scoreWindowTo = shiftDate(workDate, -1);
      const scoreWindowFrom = shiftDate(workDate, -period.selectionWindowDays);
      const [cvRows, ccRows, tipRows, eventRows, speedProfiles] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT os.assigned_staff_id AS legacyStaffId,
                  COUNT(DISTINCT os.id) AS completedServices,
                  SUM(CASE WHEN os.next_fix_order_service_id > 0 THEN 1 ELSE 0 END) AS fixCount
           FROM order_service os
           JOIN \`order\` o ON o.id = os.order_id
           JOIN report_order ro ON ro.order_id = o.id
           WHERE os.assigned_staff_id IN (${legacyStaffIds.map(() => '?').join(',')})
             AND o.order_state = 'Completed'
             AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ?
             AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
           GROUP BY os.assigned_staff_id`,
          ...legacyStaffIds,
          `${scoreWindowFrom} 00:00:00`,
          `${scoreWindowTo} 23:59:59`
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT os.check_in_staff_id AS legacyStaffId,
                  COUNT(DISTINCT o.id) AS completedServices,
                  AVG(CASE
                    WHEN o.booking_date_start IS NOT NULL AND ro.actual_booking_date_start IS NOT NULL
                     AND TIMESTAMPDIFF(MINUTE, o.booking_date_start, ro.actual_booking_date_start) BETWEEN 0 AND 240
                    THEN TIMESTAMPDIFF(MINUTE, o.booking_date_start, ro.actual_booking_date_start) / 15
                    ELSE NULL END) AS speedRatio
           FROM order_service os
           JOIN \`order\` o ON o.id = os.order_id
           JOIN report_order ro ON ro.order_id = o.id
           WHERE os.check_in_staff_id IN (${legacyStaffIds.map(() => '?').join(',')})
             AND o.order_state = 'Completed'
             AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ?
             AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
           GROUP BY os.check_in_staff_id`,
          ...legacyStaffIds,
          `${scoreWindowFrom} 00:00:00`,
          `${scoreWindowTo} 23:59:59`
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT st.user_id AS legacyStaffId, COUNT(DISTINCT st.order_id) AS tippedVisits
           FROM staff_tip st
           JOIN \`order\` o ON o.id = st.order_id
           JOIN report_order ro ON ro.order_id = o.id
           WHERE st.user_id IN (${legacyStaffIds.map(() => '?').join(',')})
             AND o.order_state = 'Completed'
             AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= ?
             AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= ?
           GROUP BY st.user_id`,
          ...legacyStaffIds,
          `${scoreWindowFrom} 00:00:00`,
          `${scoreWindowTo} 23:59:59`
        ),
        fastify.prisma.crm.crmStaffPerformanceEvent.findMany({
          where: {
            legacyStaffId: { in: legacyStaffIds },
            status: 'VERIFIED',
            occurredAt: { gte: toDbDate(scoreWindowFrom), lte: new Date(`${scoreWindowTo}T23:59:59+07:00`) },
          },
        }),
        fastify.prisma.crm.crmCvSpeedProfile.findMany({
          where: { staffId: { in: legacyStaffIds } },
          orderBy: { updatedAt: 'desc' },
        }),
      ]);

      const cvById = new Map(cvRows.map((row) => [Number(row.legacyStaffId), row]));
      const ccById = new Map(ccRows.map((row) => [Number(row.legacyStaffId), row]));
      const tipById = new Map(tipRows.map((row) => [Number(row.legacyStaffId), Number(row.tippedVisits || 0)]));
      const speedById = new Map<number, number>();
      speedProfiles.forEach((profile) => {
        if (!speedById.has(profile.staffId) && profile.speedDeltaPercent !== null) {
          speedById.set(profile.staffId, 1 + Number(profile.speedDeltaPercent) / 100);
        }
      });
      const eventsById = new Map<number, { feedback: number; attendance: number }>();
      eventRows.forEach((event) => {
        if (!event.legacyStaffId) return;
        const metrics = eventsById.get(event.legacyStaffId) || { feedback: 0, attendance: 0 };
        if (event.eventType === 'NEGATIVE_FEEDBACK') metrics.feedback += 1;
        else metrics.attendance += severityPoints(event.severity as StaffPerformanceSeverity);
        eventsById.set(event.legacyStaffId, metrics);
      });

      const coverageTargets = period.coverage
        .filter((coverage) => dateKey(coverage.workDate) === workDate)
        .map((coverage) => ({
          teamCode: coverage.teamCode.toUpperCase(),
          storeKey: coverage.storeKey.toUpperCase(),
        }));
      const rawCandidates = memberships
        .filter((membership) => {
          const profile = profileById.get(membership.legacyStaffId);
          const memberStoreKey = String(profile?.storeKey || 'UNASSIGNED').toUpperCase();
          return coverageTargets.some(
            (target) =>
              target.teamCode === membership.teamCode.toUpperCase() &&
              (target.storeKey === 'UNASSIGNED' || target.storeKey === memberStoreKey)
          );
        })
        .map((membership) => {
          const profile = profileById.get(membership.legacyStaffId);
          const isCv = membership.teamCode.toUpperCase().startsWith('CV');
          const isCc = membership.teamCode.toUpperCase().startsWith('CC');
          const roleRow = isCv
            ? cvById.get(membership.legacyStaffId)
            : isCc
              ? ccById.get(membership.legacyStaffId)
              : null;
          const eventStats = eventsById.get(membership.legacyStaffId) || { feedback: 0, attendance: 0 };
          const completedServices = Number(roleRow?.completedServices || 0);
          const raw: RawMetric = {
            legacyStaffId: membership.legacyStaffId,
            completedServices,
            fixCount: isCv ? Number(roleRow?.fixCount || 0) : 0,
            tippedVisits: tipById.get(membership.legacyStaffId) || 0,
            speedRatio: isCv
              ? (speedById.get(membership.legacyStaffId) ?? null)
              : isCc && roleRow?.speedRatio !== null
                ? Number(roleRow.speedRatio)
                : null,
            feedbackCount: eventStats.feedback,
            attendanceIncidentPoints: eventStats.attendance,
          };
          return {
            membership,
            profile,
            crmStaff: crmByLegacyId.get(membership.legacyStaffId),
            raw,
            groupKey: `${membership.teamCode}:${String(profile?.storeKey || 'UNASSIGNED')}`,
          };
        });

      const weights = normalizeWeights(parseJson(period.selectionWeightsJson, DEFAULT_HOLIDAY_SELECTION_WEIGHTS));
      for (const candidate of rawCandidates) {
        const peers = rawCandidates.filter((peer) => peer.groupKey === candidate.groupKey).map((peer) => peer.raw);
        const denominator = candidate.raw.completedServices;
        const feedbackRate = denominator > 0 ? candidate.raw.feedbackCount / denominator : null;
        const fixRate =
          denominator > 0 && candidate.membership.teamCode.startsWith('CV')
            ? candidate.raw.fixCount / denominator
            : null;
        const tipRate = denominator > 0 ? candidate.raw.tippedVisits / denominator : null;
        const peerFeedbackRates = peers.map((peer) =>
          peer.completedServices > 0 ? peer.feedbackCount / peer.completedServices : null
        );
        const peerFixRates = peers.map((peer) =>
          peer.completedServices > 0 ? peer.fixCount / peer.completedServices : null
        );
        const peerTipRates = peers.map((peer) =>
          peer.completedServices > 0 ? peer.tippedVisits / peer.completedServices : null
        );
        const metrics: HolidayCandidateMetrics = {
          completedServices: denominator,
          verifiedNegativeFeedbackCount: candidate.raw.feedbackCount,
          feedbackRate,
          fixCount: candidate.raw.fixCount,
          fixRate,
          tippedVisits: candidate.raw.tippedVisits,
          tipRate,
          medianSpeedRatio: candidate.raw.speedRatio,
          attendanceIncidentPoints: candidate.raw.attendanceIncidentPoints,
          feedbackPercentile: relativePercentile(feedbackRate, peerFeedbackRates, false),
          fixPercentile: relativePercentile(fixRate, peerFixRates, false),
          tipPercentile: relativePercentile(tipRate, peerTipRates, true),
          speedPercentile: relativePercentile(
            candidate.raw.speedRatio,
            peers.map((peer) => peer.speedRatio),
            false
          ),
          attendancePercentile: relativePercentile(
            candidate.raw.attendanceIncidentPoints,
            peers.map((peer) => peer.attendanceIncidentPoints),
            false
          ),
        };
        const { totalScore, dataSufficient } = calculateHolidayCandidateScore(metrics, weights);
        const explanation = [
          `Dữ liệu ${period.selectionWindowDays} ngày: ${denominator} lượt hợp lệ.`,
          `Feedback xác thực: ${candidate.raw.feedbackCount}; Fix: ${candidate.raw.fixCount}; Tip: ${candidate.raw.tippedVisits}.`,
          candidate.raw.speedRatio === null
            ? 'Chưa có dữ liệu tốc độ đủ tin cậy.'
            : `Tốc độ so với benchmark: ${Math.round(candidate.raw.speedRatio * 100)}%.`,
          `Điểm sự cố chuyên cần: ${candidate.raw.attendanceIncidentPoints}.`,
        ];
        const saved = await fastify.prisma.crm.crmHolidayCandidateSnapshot.upsert({
          where: {
            holiday_candidate_staff_day: {
              holidayId,
              workDate: toDbDate(workDate),
              legacyStaffId: candidate.membership.legacyStaffId,
            },
          },
          create: {
            holidayId,
            workDate: toDbDate(workDate),
            crmStaffId: candidate.crmStaff?.id || candidate.membership.crmStaffId || null,
            legacyStaffId: candidate.membership.legacyStaffId,
            displayName:
              candidate.profile?.displayName ||
              candidate.crmStaff?.displayName ||
              candidate.membership.fallbackName ||
              '',
            avatarUrl: candidate.crmStaff?.avatarUrl || null,
            teamCode: candidate.membership.teamCode,
            storeId: candidate.profile?.storeId ? Number(candidate.profile.storeId) : null,
            storeKey: String(candidate.profile?.storeKey || 'UNASSIGNED'),
            scoreWindowFrom: toDbDate(scoreWindowFrom),
            scoreWindowTo: toDbDate(scoreWindowTo),
            totalScore,
            dataSufficient,
            dataCoverageReason: dataSufficient
              ? null
              : `Cần tối thiểu ${MINIMUM_RELEVANT_INTERACTIONS} lượt hợp lệ; hiện có ${denominator}.`,
            metricsJson: JSON.stringify(metrics),
            explanationJson: JSON.stringify(explanation),
          },
          update: {
            crmStaffId: candidate.crmStaff?.id || candidate.membership.crmStaffId || null,
            displayName:
              candidate.profile?.displayName ||
              candidate.crmStaff?.displayName ||
              candidate.membership.fallbackName ||
              '',
            avatarUrl: candidate.crmStaff?.avatarUrl || null,
            teamCode: candidate.membership.teamCode,
            storeId: candidate.profile?.storeId ? Number(candidate.profile.storeId) : null,
            storeKey: String(candidate.profile?.storeKey || 'UNASSIGNED'),
            scoreWindowFrom: toDbDate(scoreWindowFrom),
            scoreWindowTo: toDbDate(scoreWindowTo),
            totalScore,
            dataSufficient,
            dataCoverageReason: dataSufficient
              ? null
              : `Cần tối thiểu ${MINIMUM_RELEVANT_INTERACTIONS} lượt hợp lệ; hiện có ${denominator}.`,
            metricsJson: JSON.stringify(metrics),
            explanationJson: JSON.stringify(explanation),
            generatedAt: new Date(),
          },
        });
        allSnapshots.push(mapCandidate(saved));
      }
    }
    await this.audit(fastify, {
      holidayId,
      action: 'GENERATE_CANDIDATES',
      entityType: 'CANDIDATE_SNAPSHOT',
      actorStaffId: actor.id,
      after: { count: allSnapshots.length },
    });
    return allSnapshots.sort((a, b) => (b.totalScore ?? -1) - (a.totalScore ?? -1));
  }

  static async detectUnplannedAttendance(fastify: FastifyInstance, period: SafeAny, actor: Actor) {
    const attendanceRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT rs.user_id AS legacyStaffId,
              DATE_FORMAT(rs.date, '%Y-%m-%d') AS workDate,
              SUM(rs.working_minute) AS workingMinute,
              up.full_name AS displayName,
              up.client_store_id AS storeId,
              UPPER(COALESCE(cs.client_store_key, 'UNASSIGNED')) AS storeKey
       FROM report_staff rs
       JOIN user_profile up ON up.user_id = rs.user_id
       LEFT JOIN client_store cs ON cs.id = up.client_store_id
       WHERE rs.date >= ? AND rs.date <= ? AND rs.working_minute > 0
       GROUP BY rs.user_id, rs.date, up.full_name, up.client_store_id, cs.client_store_key`,
      dateKey(period.startDate),
      dateKey(period.endDate)
    );
    if (attendanceRows.length === 0) return;
    const existing = await fastify.prisma.crm.crmHolidayRoster.findMany({ where: { holidayId: period.id } });
    const existingKeys = new Set(existing.map((entry) => `${dateKey(entry.workDate)}:${entry.legacyStaffId}`));
    const crmStaffs = await fastify.prisma.crm.crmStaff.findMany({
      where: { legacyStaffId: { in: attendanceRows.map((row) => Number(row.legacyStaffId)) } },
      select: { id: true, legacyStaffId: true },
    });
    const crmByLegacy = new Map(crmStaffs.map((staff) => [Number(staff.legacyStaffId), staff.id]));
    const teamMembers = await fastify.prisma.crm.crmTeamMember.findMany({
      where: { legacyStaffId: { in: attendanceRows.map((row) => Number(row.legacyStaffId)) }, isActive: true },
      include: { team: { select: { code: true } } },
    });
    const teamByLegacy = new Map(teamMembers.map((member) => [member.legacyStaffId, member.team.code]));
    for (const row of attendanceRows) {
      const legacyStaffId = Number(row.legacyStaffId);
      const workDate = String(row.workDate);
      if (existingKeys.has(`${workDate}:${legacyStaffId}`)) continue;
      const created = await fastify.prisma.crm.crmHolidayRoster.create({
        data: {
          holidayId: period.id,
          rosterKey: `${workDate}:staff:${legacyStaffId}`,
          workDate: toDbDate(workDate),
          crmStaffId: crmByLegacy.get(legacyStaffId) || null,
          legacyStaffId,
          displayName: String(row.displayName || `Staff #${legacyStaffId}`),
          teamCode: teamByLegacy.get(legacyStaffId) || 'UNASSIGNED',
          storeId: row.storeId ? Number(row.storeId) : null,
          storeKey: String(row.storeKey || 'UNASSIGNED'),
          shiftStart: '09:00',
          shiftEnd: '18:00',
          status: 'PAYROLL_EXCEPTION',
          decisionReason: 'Có chấm công nhưng không có trong roster đã lập.',
          scheduledByStaffId: actor.id,
        },
      });
      await this.audit(fastify, {
        holidayId: period.id,
        action: 'DETECT_UNPLANNED_ATTENDANCE',
        entityType: 'HOLIDAY_ROSTER',
        entityId: created.id,
        actorStaffId: actor.id,
        reason: created.decisionReason,
        after: created,
      });
    }
  }

  static async recalculateLedger(fastify: FastifyInstance, holidayId: number, actor: Actor) {
    const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({
      where: { id: holidayId },
      include: { roster: true },
    });
    if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
    if (period.status === 'PAYROLL_LOCKED') throw new HolidayWorkError('Kỳ lương đã khóa; không thể tính lại.', 409);
    await this.detectUnplannedAttendance(fastify, period, actor);
    const roster = await fastify.prisma.crm.crmHolidayRoster.findMany({ where: { holidayId } });
    const legacyStaffIds = [
      ...new Set(roster.map((entry) => entry.legacyStaffId).filter((id): id is number => Boolean(id))),
    ];
    const attendanceRows = legacyStaffIds.length
      ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id AS legacyStaffId,
                  DATE_FORMAT(date, '%Y-%m-%d') AS workDate,
                  SUM(working_minute) AS workingMinute
           FROM report_staff
           WHERE user_id IN (${legacyStaffIds.map(() => '?').join(',')})
             AND date >= ? AND date <= ? AND working_minute > 0
           GROUP BY user_id, date`,
          ...legacyStaffIds,
          dateKey(period.startDate),
          dateKey(period.endDate)
        )
      : [];
    const rateRows = legacyStaffIds.length
      ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id AS legacyStaffId, working_hour_rate AS hourlyRate, date, id
           FROM staff_payroll
           WHERE user_id IN (${legacyStaffIds.map(() => '?').join(',')})
             AND date <= ? AND working_hour_rate > 0
           ORDER BY user_id ASC, date DESC, id DESC`,
          ...legacyStaffIds,
          dateKey(period.endDate)
        )
      : [];
    const crmStaffIds = roster.map((entry) => entry.crmStaffId).filter((id): id is number => Boolean(id));
    const crmStaffs = await fastify.prisma.crm.crmStaff.findMany({
      where: {
        OR: [
          ...(crmStaffIds.length ? [{ id: { in: crmStaffIds } }] : []),
          ...(legacyStaffIds.length ? [{ legacyStaffId: { in: legacyStaffIds } }] : []),
        ],
      },
      select: { id: true, legacyStaffId: true, payBasis: true, baseSalary: true, hourlyWage: true },
    });
    const staffByCrmId = new Map(crmStaffs.map((staff) => [staff.id, staff]));
    const staffByLegacyId = new Map(crmStaffs.map((staff) => [Number(staff.legacyStaffId), staff]));
    const attendanceByStaffDay = new Map(
      attendanceRows.map((row) => [`${Number(row.legacyStaffId)}:${row.workDate}`, Number(row.workingMinute || 0)])
    );
    const ratesByLegacyId = new Map<number, Array<{ effectiveDate: string; hourlyRate: number }>>();
    rateRows.forEach((row) => {
      const id = Number(row.legacyStaffId);
      const rates = ratesByLegacyId.get(id) || [];
      rates.push({ effectiveDate: dateKey(row.date), hourlyRate: Number(row.hourlyRate || 0) });
      ratesByLegacyId.set(id, rates);
    });
    const offDayMap = await StaffOffDayService.getBatchStaffOffDays(fastify, legacyStaffIds, {
      dateFrom: dateKey(period.startDate),
      dateTo: dateKey(period.endDate),
    });
    const savedRows: HolidayPayrollLedgerEntry[] = [];

    for (const entry of roster) {
      const workDate = dateKey(entry.workDate);
      const staff = entry.crmStaffId
        ? staffByCrmId.get(entry.crmStaffId)
        : entry.legacyStaffId
          ? staffByLegacyId.get(entry.legacyStaffId)
          : undefined;
      const payBasis = (staff?.payBasis as HolidayPayBasis | null) || null;
      const hourlyRate =
        payBasis === 'MONTHLY'
          ? staff?.baseSalary && period.monthlyStandardHours > 0
            ? roundMoney(Number(staff.baseSalary) / period.monthlyStandardHours)
            : 0
          : entry.legacyStaffId
            ? ratesByLegacyId.get(entry.legacyStaffId)?.find((rate) => rate.effectiveDate <= workDate)?.hourlyRate ||
              roundMoney(Number(staff?.hourlyWage || 0))
            : roundMoney(Number(staff?.hourlyWage || 0));
      const approvedLeave = Boolean(
        entry.legacyStaffId && offDayMap.get(entry.legacyStaffId)?.approvedOffDates.includes(workDate)
      );
      const actualMinutes = entry.legacyStaffId
        ? attendanceByStaffDay.get(`${entry.legacyStaffId}:${workDate}`) || 0
        : 0;
      const attendanceSource = approvedLeave
        ? 'STAFF_DAY_OFF_APPROVED'
        : entry.status === 'SCHEDULED' || actualMinutes > 0
          ? 'REPORT_STAFF_WORKING_MINUTE'
          : 'HOLIDAY_ROSTER_POLICY';
      const calculation = calculateHolidayPayroll({
        rosterStatus: entry.status as HolidayRosterStatus,
        payBasis,
        hourlyRate,
        actualMinutes,
        standardShiftHours: period.standardShiftHours,
        paidLeaveMultiplier: period.paidLeaveMultiplier,
        workPremiumMultiplier: period.workPremiumMultiplier,
        approvedLeave,
      });
      await fastify.prisma.crm.crmHolidayRoster.update({
        where: { id: entry.id },
        data: { isApprovedLeave: approvedLeave },
      });
      const saved = await fastify.prisma.crm.crmHolidayPayrollLedger.upsert({
        where: { rosterId: entry.id },
        create: {
          holidayId,
          rosterId: entry.id,
          workDate: entry.workDate,
          crmStaffId: entry.crmStaffId,
          legacyStaffId: entry.legacyStaffId,
          displayName: entry.displayName,
          teamCode: entry.teamCode,
          storeKey: entry.storeKey,
          rosterStatus: entry.status,
          payBasis,
          ledgerStatus: calculation.ledgerStatus,
          attendanceSource,
          actualMinutes,
          actualHours: calculation.actualHours,
          standardShiftHours: period.standardShiftHours,
          hourlyRate,
          baseHolidayAmount: calculation.baseHolidayAmount,
          holidayPremiumAmount: calculation.holidayPremiumAmount,
          holidayTotalValue: calculation.holidayTotalValue,
          payrollAdditionAmount: calculation.payrollAdditionAmount,
          baseIncludedInMonthlySalary: calculation.baseIncludedInMonthlySalary,
          exceptionCode: calculation.exceptionCode,
          exceptionMessage: calculation.exceptionMessage,
          calculationVersion: HOLIDAY_CALCULATION_VERSION,
        },
        update: {
          crmStaffId: entry.crmStaffId,
          legacyStaffId: entry.legacyStaffId,
          displayName: entry.displayName,
          teamCode: entry.teamCode,
          storeKey: entry.storeKey,
          rosterStatus: entry.status,
          payBasis,
          ledgerStatus: calculation.ledgerStatus,
          attendanceSource,
          actualMinutes,
          actualHours: calculation.actualHours,
          standardShiftHours: period.standardShiftHours,
          hourlyRate,
          baseHolidayAmount: calculation.baseHolidayAmount,
          holidayPremiumAmount: calculation.holidayPremiumAmount,
          holidayTotalValue: calculation.holidayTotalValue,
          payrollAdditionAmount: calculation.payrollAdditionAmount,
          baseIncludedInMonthlySalary: calculation.baseIncludedInMonthlySalary,
          exceptionCode: calculation.exceptionCode,
          exceptionMessage: calculation.exceptionMessage,
          calculationVersion: HOLIDAY_CALCULATION_VERSION,
        },
      });
      savedRows.push(mapLedger(saved));
    }
    await this.audit(fastify, {
      holidayId,
      action: 'RECALCULATE_PAYROLL',
      entityType: 'HOLIDAY_LEDGER',
      actorStaffId: actor.id,
      after: {
        rows: savedRows.length,
        exceptions: savedRows.filter((row) => row.ledgerStatus === 'EXCEPTION').length,
      },
    });
    return savedRows;
  }

  static async publish(fastify: FastifyInstance, holidayId: number, actor: Actor) {
    const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({
      where: { id: holidayId },
      include: { coverage: true, roster: true },
    });
    if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
    if (period.status !== 'DRAFT') throw new HolidayWorkError('Chỉ kỳ DRAFT mới được publish.', 409);
    if (period.coverage.length === 0) throw new HolidayWorkError('Cần cấu hình nhu cầu nhân sự trước khi publish.');
    const unresolved = period.roster.filter(
      (entry) => entry.status === 'PAYROLL_EXCEPTION' || (!entry.legacyStaffId && entry.status !== 'CANCELLED')
    );
    if (unresolved.length > 0) {
      throw new HolidayWorkError(`Còn ${unresolved.length} roster chưa khớp nhân sự hoặc đang lỗi.`, 409);
    }
    for (const coverage of period.coverage) {
      const scheduled = period.roster.filter(
        (entry) =>
          dateKey(entry.workDate) === dateKey(coverage.workDate) &&
          entry.teamCode === coverage.teamCode &&
          entry.storeKey === coverage.storeKey &&
          entry.status === 'SCHEDULED'
      ).length;
      if (scheduled < coverage.requiredCount) {
        throw new HolidayWorkError(
          `${dateKey(coverage.workDate)} ${coverage.storeKey}/${coverage.teamCode} thiếu ${coverage.requiredCount - scheduled} người.`,
          409
        );
      }
    }
    const updated = await fastify.prisma.crm.crmHolidayPeriod.update({
      where: { id: holidayId },
      data: { status: 'PUBLISHED', publishedAt: new Date(), publishedByStaffId: actor.id },
    });
    await this.audit(fastify, {
      holidayId,
      action: 'PUBLISH_PERIOD',
      entityType: 'HOLIDAY_PERIOD',
      entityId: holidayId,
      actorStaffId: actor.id,
      before: period,
      after: updated,
    });
    return mapPeriod(updated);
  }

  static async lockPayroll(fastify: FastifyInstance, holidayId: number, actor: Actor) {
    const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({ where: { id: holidayId } });
    if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
    if (period.status !== 'PUBLISHED') throw new HolidayWorkError('Chỉ kỳ đã publish mới được khóa lương.', 409);
    const ledger = await this.recalculateLedger(fastify, holidayId, actor);
    const exceptions = ledger.filter((row) => row.ledgerStatus === 'EXCEPTION');
    if (exceptions.length > 0) {
      throw new HolidayWorkError(`Còn ${exceptions.length} ngoại lệ lương; chưa thể khóa kỳ.`, 409);
    }
    const now = new Date();
    await fastify.prisma.crm.$transaction([
      fastify.prisma.crm.crmHolidayPayrollLedger.updateMany({
        where: { holidayId },
        data: { ledgerStatus: 'LOCKED', lockedAt: now, lockedByStaffId: actor.id },
      }),
      fastify.prisma.crm.crmHolidayPeriod.update({
        where: { id: holidayId },
        data: { status: 'PAYROLL_LOCKED', payrollLockedAt: now, payrollLockedByStaffId: actor.id },
      }),
    ]);
    await this.audit(fastify, {
      holidayId,
      action: 'LOCK_PAYROLL',
      entityType: 'HOLIDAY_LEDGER',
      actorStaffId: actor.id,
      after: { rows: ledger.length, lockedAt: now.toISOString() },
    });
    return this.getWorkspace(fastify, holidayId, actor);
  }

  static async listPerformanceEvents(
    fastify: FastifyInstance,
    query: StaffPerformanceEventQuery
  ): Promise<StaffPerformanceEventListResponse> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = clamp(Number(query.limit || 20), 1, 100);
    const where = {
      ...(query.status && query.status !== 'ALL' ? { status: query.status } : {}),
      ...(query.eventType && query.eventType !== 'ALL' ? { eventType: query.eventType } : {}),
      ...(query.legacyStaffId ? { legacyStaffId: query.legacyStaffId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            occurredAt: {
              ...(query.dateFrom ? { gte: toDbDate(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59+07:00`) } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      fastify.prisma.crm.crmStaffPerformanceEvent.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      fastify.prisma.crm.crmStaffPerformanceEvent.count({ where }),
    ]);
    return { data: rows.map(mapPerformanceEvent), total, page, limit };
  }

  static async createPerformanceEvent(
    fastify: FastifyInstance,
    input: CreateStaffPerformanceEventRequest,
    actor: Actor
  ) {
    if (!input.note.trim()) throw new HolidayWorkError('Nội dung feedback/sự cố là bắt buộc.');
    if (!input.crmStaffId && !input.legacyStaffId) {
      throw new HolidayWorkError('Phải chọn nhân sự liên quan.');
    }
    const created = await fastify.prisma.crm.crmStaffPerformanceEvent.create({
      data: {
        crmStaffId: input.crmStaffId ?? null,
        legacyStaffId: input.legacyStaffId ?? null,
        displayName: input.displayName.trim(),
        eventType: input.eventType,
        source: input.source,
        severity: input.severity,
        occurredAt: new Date(input.occurredAt),
        storeId: input.storeId ?? null,
        storeKey: input.storeKey?.trim().toUpperCase() || null,
        relatedOrderId: input.relatedOrderId ?? null,
        relatedTicketId: input.relatedTicketId ?? null,
        evidenceUrl: input.evidenceUrl?.trim() || null,
        note: input.note.trim(),
        status: 'PENDING',
        createdByStaffId: actor.id,
      },
    });
    return mapPerformanceEvent(created);
  }

  static async reviewPerformanceEvent(
    fastify: FastifyInstance,
    eventId: number,
    status: 'VERIFIED' | 'REJECTED',
    actor: Actor,
    rejectionReason?: string
  ) {
    const event = await fastify.prisma.crm.crmStaffPerformanceEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new HolidayWorkError('Không tìm thấy performance event.', 404);
    if (status === 'REJECTED' && !rejectionReason?.trim()) {
      throw new HolidayWorkError('Cần nhập lý do từ chối.');
    }
    if (event.createdByStaffId === actor.id && !this.isAdmin(actor)) {
      throw new HolidayWorkError('Người tạo không được tự xác thực sự kiện của mình.', 403);
    }
    const updated = await fastify.prisma.crm.crmStaffPerformanceEvent.update({
      where: { id: eventId },
      data: {
        status,
        verifiedByStaffId: actor.id,
        verifiedAt: new Date(),
        rejectionReason: status === 'REJECTED' ? rejectionReason?.trim() : null,
      },
    });
    return mapPerformanceEvent(updated);
  }

  static async createPayrollAdjustment(
    fastify: FastifyInstance,
    holidayId: number,
    input: CreateHolidayPayrollAdjustmentRequest,
    actor: Actor
  ) {
    const amount = roundMoney(Number(input.amount));
    if (amount === 0) throw new HolidayWorkError('Số tiền adjustment phải khác 0.');
    if (!input.reason?.trim()) throw new HolidayWorkError('Lý do adjustment là bắt buộc.');
    const period = await fastify.prisma.crm.crmHolidayPeriod.findUnique({ where: { id: holidayId } });
    if (!period) throw new HolidayWorkError('Không tìm thấy kỳ lễ.', 404);
    if (period.status !== 'PAYROLL_LOCKED') {
      throw new HolidayWorkError('Adjustment chỉ được tạo sau khi kỳ lương đã khóa.', 409);
    }
    const ledger = await fastify.prisma.crm.crmHolidayPayrollLedger.findUnique({ where: { id: input.ledgerId } });
    if (!ledger || ledger.holidayId !== holidayId || ledger.ledgerStatus !== 'LOCKED') {
      throw new HolidayWorkError('Không tìm thấy ledger đã khóa thuộc kỳ lễ này.', 404);
    }
    const created = await fastify.prisma.crm.crmHolidayPayrollAdjustment.create({
      data: {
        holidayId,
        ledgerId: ledger.id,
        amount,
        reason: input.reason.trim(),
        createdByStaffId: actor.id,
      },
    });
    await this.audit(fastify, {
      holidayId,
      action: 'CREATE_PAYROLL_ADJUSTMENT',
      entityType: 'HOLIDAY_PAYROLL_ADJUSTMENT',
      entityId: created.id,
      actorStaffId: actor.id,
      reason: created.reason,
      after: created,
    });
    return mapAdjustment(created);
  }

  static async getPayBreakdownByLegacyStaffIds(
    fastify: FastifyInstance,
    legacyStaffIds: number[],
    dateFrom: string,
    dateTo: string
  ): Promise<Map<number, HolidayPayBreakdown>> {
    const result = new Map<number, HolidayPayBreakdown>();
    legacyStaffIds.forEach((id) => result.set(id, { ...EMPTY_BREAKDOWN }));
    if (legacyStaffIds.length === 0) return result;
    const ledger = await fastify.prisma.crm.crmHolidayPayrollLedger.findMany({
      where: {
        legacyStaffId: { in: legacyStaffIds },
        workDate: { gte: toDbDate(dateFrom), lte: toDbDate(dateTo) },
        ledgerStatus: { in: ['READY', 'LOCKED', 'EXCEPTION'] },
        holiday: { status: { in: ['PUBLISHED', 'PAYROLL_LOCKED'] } },
      },
      include: { adjustments: true },
    });
    ledger.forEach((row) => {
      if (!row.legacyStaffId) return;
      const aggregate = result.get(row.legacyStaffId) || { ...EMPTY_BREAKDOWN };
      if (row.rosterStatus === 'SCHEDULED' && row.ledgerStatus !== 'EXCEPTION') {
        aggregate.holidayWorkedDays += 1;
        aggregate.holidayWorkedHours = roundHours(aggregate.holidayWorkedHours + row.actualHours);
        aggregate.holidayWorkedBasePay += row.baseHolidayAmount;
      }
      if (row.rosterStatus === 'HOLIDAY_OFF' && row.ledgerStatus !== 'EXCEPTION') {
        aggregate.holidayPaidLeaveDays += 1;
        aggregate.holidayPaidLeaveHours = roundHours(aggregate.holidayPaidLeaveHours + Number(row.standardShiftHours));
        aggregate.holidayPaidLeavePay += row.baseHolidayAmount;
      }
      aggregate.holidayBasePay += row.baseHolidayAmount;
      aggregate.holidayPremiumPay += row.holidayPremiumAmount;
      aggregate.holidayTotalValue += row.holidayTotalValue;
      aggregate.holidayPayrollAddition += row.payrollAdditionAmount;
      aggregate.holidayPaystubAdjustment += row.baseIncludedInMonthlySalary
        ? row.payrollAdditionAmount
        : row.holidayPremiumAmount + (row.rosterStatus === 'HOLIDAY_OFF' ? row.baseHolidayAmount : 0);
      const adjustmentAmount = row.adjustments.reduce((sum, adjustment) => sum + adjustment.amount, 0);
      aggregate.holidayPayrollAddition += adjustmentAmount;
      aggregate.holidayPaystubAdjustment += adjustmentAmount;
      if (row.ledgerStatus === 'EXCEPTION') aggregate.holidayPayrollExceptionCount += 1;
      result.set(row.legacyStaffId, aggregate);
    });
    return result;
  }

  static async getPublishedHolidayWorkedDateKeys(
    fastify: FastifyInstance,
    legacyStaffIds: number[],
    dateFrom: string,
    dateTo: string
  ): Promise<Map<number, Set<string>>> {
    const result = new Map<number, Set<string>>();
    legacyStaffIds.forEach((id) => result.set(id, new Set()));
    if (legacyStaffIds.length === 0) return result;
    const rows = await fastify.prisma.crm.crmHolidayPayrollLedger.findMany({
      where: {
        legacyStaffId: { in: legacyStaffIds },
        workDate: { gte: toDbDate(dateFrom), lte: toDbDate(dateTo) },
        rosterStatus: 'SCHEDULED',
        ledgerStatus: { in: ['READY', 'LOCKED'] },
        holiday: { status: { in: ['PUBLISHED', 'PAYROLL_LOCKED'] } },
      },
      select: { legacyStaffId: true, workDate: true },
    });
    rows.forEach((row) => {
      if (row.legacyStaffId) result.get(row.legacyStaffId)?.add(dateKey(row.workDate));
    });
    return result;
  }
}

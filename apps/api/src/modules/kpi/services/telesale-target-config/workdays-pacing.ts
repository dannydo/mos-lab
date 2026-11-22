import { FastifyInstance } from 'fastify';
import { TelesalePeriodStatus, TelesalePacingStatus } from '@mos-lab/shared';

export interface TeamWorkDaysPacingResult {
  workDaysTotal: number;
  workDaysElapsed: number;
  workDaysRemaining: number;
  periodStatus: TelesalePeriodStatus;
  pacingStatus: TelesalePacingStatus;
  pacingStatusLabel: string;
  expectedProgressRate: number;
  expectedDone: number;
  expectedIncoming: number;
  expectedBook: number;
  gapDone: number;
  gapIncoming: number;
  gapBook: number;
  remainingDone: number;
  remainingIncoming: number;
  remainingBook: number;
  dailyRequiredDone: number;
  dailyRequiredIncoming: number;
  dailyRequiredBook: number;
  pacingRatio: number;
  isPacingOnTrack: boolean;
}

/**
 * Tính toán tiến độ ngày làm việc và các chỉ số quản trị KPI Team (MOS-BUG-67)
 * - Loại trừ ngày OFF cố định (Chủ Nhật) & các kỳ nghỉ lễ đã cấu hình
 * - Trạng thái: Chưa bắt đầu, Vượt nhịp, Đúng nhịp, Chậm nhịp
 * - Tính Kỳ vọng, Gap KPI, Còn lại, Cần TB/ngày cho cả Done, Incoming và Book (MOS-BUG-95)
 */
export async function calculateTeamWorkDaysPacing(
  fastify: FastifyInstance,
  month: string,
  targetStaffIds: number[],
  nowIct: Date,
  doneTarget: number,
  doneActual: number,
  bookTarget: number,
  bookActual: number,
  incomingTarget?: number,
  incomingActual?: number
): Promise<TeamWorkDaysPacingResult> {
  const [yearStr, monthNumStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthNumStr, 10);
  const lastDayOfMonth = new Date(year, monthNum, 0).getDate();

  // 1. Xác định các ngày nghỉ lễ đã cấu hình trong CRM DB
  const holidayDateSet = new Set<string>();
  try {
    if (fastify?.prisma?.crm?.crmHolidayPeriod?.findMany) {
      const holidayPeriods = await fastify.prisma.crm.crmHolidayPeriod.findMany({
        where: {
          startDate: { lte: new Date(`${month}-${String(lastDayOfMonth).padStart(2, '0')}T23:59:59.999Z`) },
          endDate: { gte: new Date(`${month}-01T00:00:00.000Z`) },
          status: { not: 'CANCELLED' },
        },
        select: { startDate: true, endDate: true },
      });

      for (const p of holidayPeriods) {
        const cur = new Date(p.startDate);
        const end = new Date(p.endDate);
        while (cur <= end) {
          const y = cur.getUTCFullYear();
          const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
          const d = String(cur.getUTCDate()).padStart(2, '0');
          holidayDateSet.add(`${y}-${m}-${d}`);
          cur.setUTCDate(cur.getUTCDate() + 1);
        }
      }
    }
  } catch (err) {
    fastify?.log?.warn?.(`Failed to query holiday periods: ${err}`);
  }

  // 2. Liệt kê các ngày làm việc thực tế trong tháng (loại trừ Chủ Nhật và ngày nghỉ lễ đã cấu hình)
  const workDaysList: string[] = [];
  for (let d = 1; d <= lastDayOfMonth; d++) {
    const dayStr = `${month}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(Date.UTC(year, monthNum - 1, d));
    const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday
    const isSunday = dayOfWeek === 0;
    const isHoliday = holidayDateSet.has(dayStr);
    if (!isSunday && !isHoliday) {
      workDaysList.push(dayStr);
    }
  }
  const workDaysTotal = workDaysList.length;

  // 3. Đánh giá trạng thái kỳ KPI & số ngày làm việc đã qua
  const currentYear = nowIct.getUTCFullYear();
  const currentMonthNum = nowIct.getUTCMonth() + 1;
  const currentDate = nowIct.getUTCDate();

  let periodStatus: TelesalePeriodStatus;
  let workDaysElapsed: number;

  if (currentYear < year || (currentYear === year && currentMonthNum < monthNum)) {
    periodStatus = 'NOT_STARTED';
    workDaysElapsed = 0;
  } else if (currentYear > year || (currentYear === year && currentMonthNum > monthNum)) {
    periodStatus = 'COMPLETED';
    workDaysElapsed = workDaysTotal;
  } else {
    periodStatus = 'IN_PROGRESS';
    const todayDateStr = `${month}-${String(currentDate).padStart(2, '0')}`;
    workDaysElapsed = workDaysList.filter((d) => d <= todayDateStr).length;
  }

  const workDaysRemaining = Math.max(0, workDaysTotal - workDaysElapsed);
  const expectedProgressRate =
    workDaysTotal > 0 && periodStatus !== 'NOT_STARTED'
      ? Number(Math.min(1, workDaysElapsed / workDaysTotal).toFixed(4))
      : 0;

  const effectiveIncomingTarget = incomingTarget !== undefined ? incomingTarget : bookTarget;
  const effectiveIncomingActual = incomingActual !== undefined ? incomingActual : bookActual;

  // 4. Mức kỳ vọng và Gap KPI
  const expectedDone = Math.round(doneTarget * expectedProgressRate);
  const expectedIncoming = Math.round(effectiveIncomingTarget * expectedProgressRate);
  const expectedBook = expectedIncoming;
  const gapDone = doneActual - expectedDone;
  const gapIncoming = effectiveIncomingActual - expectedIncoming;
  const gapBook = gapIncoming;
  const remainingDone = Math.max(0, doneTarget - doneActual);
  const remainingIncoming = Math.max(0, effectiveIncomingTarget - effectiveIncomingActual);
  const remainingBook = remainingIncoming;

  let dailyRequiredDone: number;
  let dailyRequiredIncoming: number;
  let dailyRequiredBook: number;

  if (periodStatus === 'NOT_STARTED') {
    dailyRequiredDone = workDaysTotal > 0 ? Number((doneTarget / workDaysTotal).toFixed(1)) : 0;
    dailyRequiredIncoming = workDaysTotal > 0 ? Number((effectiveIncomingTarget / workDaysTotal).toFixed(1)) : 0;
    dailyRequiredBook = dailyRequiredIncoming;
  } else if (periodStatus === 'IN_PROGRESS') {
    dailyRequiredDone = workDaysRemaining > 0 ? Number((remainingDone / workDaysRemaining).toFixed(1)) : 0;
    dailyRequiredIncoming = workDaysRemaining > 0 ? Number((remainingIncoming / workDaysRemaining).toFixed(1)) : 0;
    dailyRequiredBook = dailyRequiredIncoming;
  } else {
    dailyRequiredDone = 0;
    dailyRequiredIncoming = 0;
    dailyRequiredBook = 0;
  }

  // 5. Tỷ lệ bám đuổi & Nhãn trạng thái
  let pacingRatio: number;
  let pacingStatus: TelesalePacingStatus;
  let pacingStatusLabel: string;
  let isPacingOnTrack: boolean;

  if (periodStatus === 'NOT_STARTED') {
    pacingRatio = 0;
    pacingStatus = 'NOT_STARTED';
    pacingStatusLabel = 'Chưa bắt đầu';
    isPacingOnTrack = false;
  } else {
    if (expectedDone > 0) {
      pacingRatio = Number((doneActual / expectedDone).toFixed(2));
    } else {
      pacingRatio = doneActual >= doneTarget ? 1 : 1;
    }

    if (pacingRatio >= 1.05) {
      pacingStatus = 'AHEAD';
      pacingStatusLabel = 'Vượt nhịp';
      isPacingOnTrack = true;
    } else if (pacingRatio >= 0.95) {
      pacingStatus = 'ON_TRACK';
      pacingStatusLabel = 'Đúng nhịp';
      isPacingOnTrack = true;
    } else {
      pacingStatus = 'BEHIND';
      pacingStatusLabel = 'Chậm nhịp';
      isPacingOnTrack = false;
    }
  }

  return {
    workDaysTotal,
    workDaysElapsed,
    workDaysRemaining,
    periodStatus,
    pacingStatus,
    pacingStatusLabel,
    expectedProgressRate,
    expectedDone,
    expectedIncoming,
    expectedBook,
    gapDone,
    gapIncoming,
    gapBook,
    remainingDone,
    remainingIncoming,
    remainingBook,
    dailyRequiredDone,
    dailyRequiredIncoming,
    dailyRequiredBook,
    pacingRatio,
    isPacingOnTrack,
  };
}

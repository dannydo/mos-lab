import type { OpenNativeCcPilotPeriodResponse } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import { CcNativePilotCohortService } from './cc-native-pilot-cohort.service.js';

const PILOT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const PILOT_CALCULATION_VERSION = 'cc-native.v1';

type CurrentMonth = {
  periodKey: string;
  label: string;
  startDate: Date;
  endDate: Date;
};

function currentMonth(now: Date): CurrentMonth {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PILOT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  if (!Number.isSafeInteger(year) || !Number.isSafeInteger(month) || month < 1 || month > 12) {
    throw new Error('Unable to determine the current payroll month');
  }
  const monthText = String(month).padStart(2, '0');
  return {
    periodKey: `${year}-${monthText}`,
    label: `Pilot CC · Tháng ${monthText}/${year}`,
    startDate: new Date(Date.UTC(year, month - 1, 1)),
    endDate: new Date(Date.UTC(year, month, 0)),
  };
}

/**
 * Opens the one monthly intake boundary used by the native CC pilot.  It is
 * deliberately idempotent, but refuses to reuse a period owned by another
 * workflow or a period that has already left OPEN.
 */
export class CcNativePilotPeriodService {
  static async openCurrentMonth(fastify: FastifyInstance): Promise<OpenNativeCcPilotPeriodResponse> {
    await CcNativePilotCohortService.getCohort(fastify);
    const target = currentMonth(new Date());
    return fastify.prisma.crm.$transaction(async (tx) => {
      const existing = await tx.crmPayrollPeriod.findUnique({ where: { periodKey: target.periodKey } });
      if (existing) {
        if (existing.status !== 'OPEN' || existing.calculationVersion !== PILOT_CALCULATION_VERSION) {
          throw new Error(
            'The current month already belongs to a different payroll workflow and cannot open for this pilot'
          );
        }
        return {
          created: false,
          period: { id: existing.id, periodKey: existing.periodKey, label: existing.label, status: 'OPEN' },
        };
      }

      const period = await tx.crmPayrollPeriod.create({
        data: {
          periodKey: target.periodKey,
          label: target.label,
          startDate: target.startDate,
          endDate: target.endDate,
          timezone: PILOT_TIMEZONE,
          status: 'OPEN',
          calculationVersion: PILOT_CALCULATION_VERSION,
        },
      });
      return {
        created: true,
        period: { id: period.id, periodKey: period.periodKey, label: period.label, status: 'OPEN' },
      };
    });
  }
}

export const __test__ = { currentMonth };

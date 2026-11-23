import type { FastifyInstance } from 'fastify';
import type { SafeAny, TelesaleStaffTarget, TelesaleTvEventLog, TelesaleTvJournalOverview } from '@mos-lab/shared';
import {
  TelesaleTargetConfigService,
  formatVietnamTime,
  parseVietnamDateToIso,
} from '../telesale-target-config.service.js';

const tvJournalExecutionStore = new Map<string, Partial<TelesaleTvEventLog>>();

export function recordTvJournalSync(records: TelesaleTvEventLog[]): { success: boolean; count: number } {
  if (!Array.isArray(records)) return { success: true, count: 0 };
  for (const rec of records) {
    if (rec && rec.id) {
      tvJournalExecutionStore.set(rec.id, {
        ...tvJournalExecutionStore.get(rec.id),
        ...rec,
      });
    }
  }
  return { success: true, count: records.length };
}

function buildExecutionStatusFields(id: string, fallbackTimestamp: string) {
  const exec = tvJournalExecutionStore.get(id);
  const isExecuted = Boolean(exec);
  return {
    eventReceived: exec?.eventReceived ?? false,
    eventReceivedAt: exec?.eventReceivedAt ?? (exec?.eventReceived ? fallbackTimestamp : undefined),
    voiceTriggered: exec?.voiceTriggered ?? false,
    voiceErrorReason:
      exec?.voiceErrorReason ??
      (exec?.voiceTriggered
        ? null
        : isExecuted
          ? 'Không phát âm thanh'
          : 'Sự kiện trước ca trực / chưa qua TV Monitor online'),
    overlayTriggered: exec?.overlayTriggered ?? false,
    overlayErrorReason:
      exec?.overlayErrorReason ??
      (exec?.overlayTriggered
        ? null
        : isExecuted
          ? 'Không hiển thị Overlay'
          : 'Sự kiện trước ca trực / chưa qua TV Monitor online'),
    status: exec?.status ?? ('SUCCESS' as const),
    errorMessage: exec?.errorMessage ?? null,
  };
}

export async function getTvJournal(fastify: FastifyInstance, dateParam?: string): Promise<TelesaleTvJournalOverview> {
  const targetDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : new Date().toISOString().slice(0, 10);

  const monthStr = targetDate.slice(0, 7);
  const config = await TelesaleTargetConfigService.getConfig(fastify, monthStr);
  const activeStaff = config.staffTargets;
  const candidateIds = (activeStaff as TelesaleStaffTarget[]).map((s) => s.legacyStaffId).filter((id) => id > 0);
  const candidateIdsStr = candidateIds.length > 0 ? candidateIds.join(', ') : '0';

  const staffNameMap = new Map<number, string>();
  const staffAvatarMap = new Map<number, string | null>();
  (activeStaff as TelesaleStaffTarget[]).forEach((s) => {
    staffNameMap.set(s.legacyStaffId, s.name);
    staffAvatarMap.set(s.legacyStaffId, s.avatarUrl || null);
  });

  const dayStartStr = `${targetDate} 00:00:00`;
  const dayEndStr = `${targetDate} 23:59:59`;

  const [dayBookOrders, dayDoneOrders] = await Promise.all([
    fastify.prisma.legacy
      .$queryRawUnsafe<SafeAny[]>(
        `
        SELECT 
          o.id,
          o.created_staff_id as bookerId,
          o.order_state as orderState,
          DATE_FORMAT(o.date_created, '%Y-%m-%dT%H:%i:%s+07:00') as dateCreated
        FROM \`order\` o
        WHERE o.date_created >= '${dayStartStr}' 
          AND o.date_created <= '${dayEndStr}'
          AND o.created_staff_id IN (${candidateIdsStr})
      `
      )
      .catch(() => []),
    fastify.prisma.legacy
      .$queryRawUnsafe<SafeAny[]>(
        `
        SELECT 
          o.id as id,
          o.created_staff_id as bookerId,
          o.order_state as orderState,
          o.total_price as totalPrice,
          DATE_FORMAT(o.booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as bookingDateStart,
          DATE_FORMAT(ro.actual_booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as actualBookingDateStart,
          DATE_FORMAT(ro.actual_booking_date_end, '%Y-%m-%dT%H:%i:%s+07:00') as actualBookingDateEnd,
          DATE_FORMAT(o.date_updated, '%Y-%m-%dT%H:%i:%s+07:00') as dateUpdated,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_end, o.date_updated, ro.actual_booking_date_start, o.date_created), '%Y-%m-%dT%H:%i:%s+07:00') as doneDate
        FROM \`order\` o
        LEFT JOIN report_order ro ON ro.order_id = o.id
        WHERE o.created_staff_id IN (${candidateIdsStr})
          AND (
            (ro.actual_booking_date_start >= '${dayStartStr}' AND ro.actual_booking_date_start <= '${dayEndStr}')
            OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${dayStartStr}' AND o.booking_date_start <= '${dayEndStr}')
          )
          AND o.order_state = 'Completed'
      `
      )
      .catch(() => []),
  ]);

  const sortedDayBookOrders = [...dayBookOrders]
    .filter((o) => o && o.id)
    .sort(
      (a, b) =>
        new Date(parseVietnamDateToIso(a.dateCreated)).getTime() -
        new Date(parseVietnamDateToIso(b.dateCreated)).getTime()
    );

  const staffBookCountMap = new Map<number, number>();
  const bookEvents: TelesaleTvEventLog[] = sortedDayBookOrders.map((o) => {
    const bookerId = Number(o.bookerId);
    const prevCount = staffBookCountMap.get(bookerId) || 0;
    const newCount = prevCount + 1;
    staffBookCountMap.set(bookerId, newCount);

    const id = `book-${o.id}`;
    const timestamp = parseVietnamDateToIso(o.dateCreated);
    const timeFormatted = formatVietnamTime(timestamp);

    return {
      id,
      type: 'BOOK' as const,
      staffId: bookerId,
      staffName: staffNameMap.get(bookerId) || 'Telesales',
      avatarUrl: staffAvatarMap.get(bookerId) || null,
      timestamp,
      timeFormatted,
      changeResult: `Book ${prevCount} → ${newCount}`,
      orderId: Number(o.id),
      ...buildExecutionStatusFields(id, timestamp),
    };
  });

  const sortedDayDoneOrders = [...dayDoneOrders]
    .filter((o) => o && o.id)
    .sort((a, b) => {
      const timeA = new Date(
        parseVietnamDateToIso(a.doneDate || a.actualBookingDateEnd || a.dateUpdated || a.actualBookingDateStart || 0)
      ).getTime();
      const timeB = new Date(
        parseVietnamDateToIso(b.doneDate || b.actualBookingDateEnd || b.dateUpdated || b.actualBookingDateStart || 0)
      ).getTime();
      return timeA - timeB;
    });

  const staffDoneCountMap = new Map<number, number>();
  const doneEvents: TelesaleTvEventLog[] = sortedDayDoneOrders.map((o) => {
    const bookerId = Number(o.bookerId);
    const prevDone = staffDoneCountMap.get(bookerId) || 0;
    const newDone = prevDone + 1;
    staffDoneCountMap.set(bookerId, newDone);

    const id = `done-${o.id}`;
    const timestamp = parseVietnamDateToIso(
      o.doneDate || o.actualBookingDateEnd || o.dateUpdated || o.actualBookingDateStart || o.bookingDateStart
    );
    const timeFormatted = formatVietnamTime(timestamp);

    return {
      id,
      type: 'DONE' as const,
      staffId: bookerId,
      staffName: staffNameMap.get(bookerId) || 'Telesales',
      avatarUrl: staffAvatarMap.get(bookerId) || null,
      timestamp,
      timeFormatted,
      changeResult: `Done ${prevDone} → ${newDone}`,
      orderId: Number(o.id),
      ...buildExecutionStatusFields(id, timestamp),
    };
  });

  // Milestone events based on total Book and Done on that date
  const milestoneEvents: TelesaleTvEventLog[] = [];
  const totalBookOnDate = bookEvents.length;
  const totalDoneOnDate = doneEvents.length;

  const addMilestoneIfReached = (
    id: string,
    threshold: number,
    current: number,
    changeResult: string,
    targetTimestamp: string
  ) => {
    if (current >= threshold) {
      const timeFormatted = formatVietnamTime(targetTimestamp);
      milestoneEvents.push({
        id,
        type: 'MILESTONE' as const,
        staffName: 'Toàn team Telesales',
        avatarUrl: null,
        timestamp: targetTimestamp,
        timeFormatted,
        changeResult,
        ...buildExecutionStatusFields(id, targetTimestamp),
      });
    }
  };

  if (totalBookOnDate >= 10 && bookEvents[9]) {
    addMilestoneIfReached(
      `milestone-${targetDate}-book-10`,
      10,
      totalBookOnDate,
      'Cán mốc 10 Book',
      bookEvents[9].timestamp
    );
  }
  if (totalBookOnDate >= 20 && bookEvents[19]) {
    addMilestoneIfReached(
      `milestone-${targetDate}-book-20`,
      20,
      totalBookOnDate,
      'Chạm mốc 20 Book',
      bookEvents[19].timestamp
    );
  }
  if (totalBookOnDate >= 25 && bookEvents[24]) {
    addMilestoneIfReached(
      `milestone-${targetDate}-book-25`,
      25,
      totalBookOnDate,
      'Cán mốc 25 Book',
      bookEvents[24].timestamp
    );
  }
  if (totalBookOnDate > 25 && bookEvents[25]) {
    addMilestoneIfReached(
      `milestone-${targetDate}-book-gt25`,
      26,
      totalBookOnDate,
      'Vượt mốc 25 Book',
      bookEvents[25].timestamp
    );
  }
  if (totalDoneOnDate >= 18 && doneEvents[17]) {
    addMilestoneIfReached(
      `milestone-${targetDate}-done-18`,
      18,
      totalDoneOnDate,
      'Hoàn thành 18 Done',
      doneEvents[17].timestamp
    );
  }

  const allEvents = [...bookEvents, ...doneEvents, ...milestoneEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const voiceSuccess = allEvents.filter((e) => e.voiceTriggered).length;
  const voiceError = allEvents.filter((e) => e.eventReceived && !e.voiceTriggered).length;
  const overlaySuccess = allEvents.filter((e) => e.overlayTriggered).length;
  const overlayError = allEvents.filter((e) => e.eventReceived && !e.overlayTriggered).length;
  const latestEventTime = allEvents.length > 0 ? allEvents[0].timestamp : null;

  return {
    totalEvents: allEvents.length,
    voiceSuccess,
    voiceError,
    overlaySuccess,
    overlayError,
    latestEventTime,
    events: allEvents,
  };
}

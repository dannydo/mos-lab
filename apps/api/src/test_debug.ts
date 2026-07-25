import Fastify from 'fastify';
import prismaPlugin from './plugins/prisma.js';

async function test() {
  const app = Fastify();
  await app.register(prismaPlugin);
  await app.ready();

  const queryParams = { startDate: '2026-07-25', endDate: '2026-07-25' };
  const startDateParam = queryParams.startDate;
  const endDateParam = queryParams.endDate;

  const parseDateRange = (dateFrom?: string, dateTo?: string, defaultDaysStart = 7) => {
    const startStr =
      dateFrom || dateTo || new Date(Date.now() - defaultDaysStart * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
    const endStr = dateTo || dateFrom || new Date().toLocaleDateString('en-CA');

    const startPart = startStr.includes('T') ? startStr.split('T')[0] : startStr;
    const endPart = endStr.includes('T') ? endStr.split('T')[0] : endStr;

    return {
      startStr: startPart,
      endStr: endPart,
      start: new Date(startPart + 'T00:00:00.000Z'),
      end: new Date(endPart + 'T23:59:59.999Z'),
    };
  };

  const { startStr, endStr } = parseDateRange(startDateParam, endDateParam, 30);
  console.log('startStr:', startStr, 'endStr:', endStr);

  const staffList = await app.prisma.crm.crmStaff.findMany({
    where: { role: 'telesales', isActive: true },
    select: { id: true, displayName: true, username: true, legacyStaffId: true },
  });

  const staffNames = staffList.map((s) => s.displayName);
  const profiles = (await app.prisma.legacy.$queryRawUnsafe(
    `
    SELECT up.user_id as userId, up.full_name as fullName
    FROM \`user_profile\` up
    WHERE up.provider = 'Staff' AND up.is_disabled = 0
      AND up.full_name IN (${staffNames.map(() => '?').join(',')})
  `,
    ...staffNames
  )) as SafeAny[];

  const staffNameToProfileMap = new Map();
  profiles.forEach((p) => {
    staffNameToProfileMap.set(p.fullName.toLowerCase().trim(), p);
  });

  const legacyUserIds = staffList
    .map((s) => s.legacyStaffId || staffNameToProfileMap.get(s.displayName.toLowerCase().trim())?.userId)
    .filter((id): id is number => typeof id === 'number' && !isNaN(id));

  console.log('legacyUserIds:', legacyUserIds);

  const sqlBooked = `
    SELECT 
      o.created_staff_id as staffId,
      COUNT(DISTINCT o.id) as totalBooked
    FROM \`order\` o
    WHERE o.created_staff_id IN (${legacyUserIds.join(',')})
      AND o.date_created >= '${startStr} 00:00:00'
      AND o.date_created <= '${endStr} 23:59:59'
      AND o.order_state != 'Cancelled'
    GROUP BY o.created_staff_id
  `;

  const bookedRows = (await app.prisma.legacy.$queryRawUnsafe(sqlBooked)) as SafeAny[];
  console.log('bookedRows:', bookedRows);

  const bookedCountMap = new Map();
  bookedRows.forEach((r) => {
    bookedCountMap.set(Number(r.staffId), Number(r.totalBooked || 0));
  });

  for (const staff of staffList) {
    const profile = staffNameToProfileMap.get(staff.displayName.toLowerCase().trim());
    const legacyUserId = staff.legacyStaffId || (profile?.userId ? Number(profile.userId) : undefined);
    const totalBooked = legacyUserId ? bookedCountMap.get(legacyUserId) || 0 : 0;
    console.log(staff.displayName, '-> legacyUserId:', legacyUserId, '-> totalBooked:', totalBooked);
  }

  await app.close();
}
test();

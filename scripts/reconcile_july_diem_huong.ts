import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import prismaPlugin from '../apps/api/src/plugins/prisma.js';
import { kpiRoutes } from '../apps/api/src/modules/kpi/routes.js';

async function main() {
  const staffId = 37790; // Diễm Hương
  const dateFrom = '2026-07-01';
  const dateTo = '2026-07-31';

  console.log('========================================================================');
  console.log(`🚀 RE-AUDITING CC DIỄM HƯƠNG (ID: ${staffId}) BONUS VÒNG XOAY FOR JULY 2026`);
  console.log('========================================================================\n');

  // 1. FETCH MOS API DATA
  const server = Fastify({ logger: false });
  await server.register(jwt, { secret: 'super_secret_mos_lab_jwt_key_development_only' });
  await server.register(prismaPlugin);
  await server.register(kpiRoutes, { prefix: '/api' });
  await server.ready();

  const token = server.jwt.sign({ id: 1, username: 'admin', role: 'admin', displayName: 'Admin Test' });
  const headers = { authorization: `Bearer ${token}` };

  const mosRes = await server.inject({
    method: 'GET',
    url: `/api/kpi/cc-xoay?dateFrom=${dateFrom}&dateTo=${dateTo}&consultantId=${staffId}&limit=2000`,
    headers,
  });

  const mosData = JSON.parse(mosRes.payload);
  const mosList: any[] = mosData.data || [];
  console.log(`✅ [MOS API] Total items returned: ${mosList.length}`);

  // 2. FETCH iOS APP API DATA (All pages)
  let iosList: any[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const iosRes = await fetch('http://192.168.139.33/1/staff/client-consultant/bonus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: 'api.orb',
      },
      body: JSON.stringify({
        user_id: staffId,
        login_token: 'valid_token_37790',
        staff_user_id: staffId,
        client_store_id: 0,
        page: page,
        date_from: dateFrom,
        date_to: dateTo,
      }),
    });

    const resJson: any = await iosRes.json();
    if (resJson.status === 'success' && resJson.data && resJson.data.booking) {
      const items = resJson.data.booking.data || [];
      iosList.push(...items);
      const totalCount = resJson.data.booking.page.total || 0;
      const limit = resJson.data.booking.page.limit || 50;
      totalPages = Math.ceil(totalCount / limit);
    } else {
      console.error(`iOS API Error on page ${page}:`, resJson);
      break;
    }
    page++;
  } while (page <= totalPages);

  console.log(`✅ [iOS App API] Total items returned: ${iosList.length} (across ${totalPages} pages)\n`);

  // 3. GROUP MOS API BY DAY
  const mosByDay = new Map<string, { count: number; bonus: number; points: number; items: any[] }>();

  for (const item of mosList) {
    const day = item.checkin ? item.checkin.substring(0, 10) : '';
    if (!day) continue;
    if (!mosByDay.has(day)) {
      mosByDay.set(day, { count: 0, bonus: 0, points: 0, items: [] });
    }
    const d = mosByDay.get(day)!;
    d.count += 1;
    d.bonus += Number(item.consultantBonus || 0);
    d.points += Number(item.consultantPoints || 0);
    d.items.push(item);
  }

  // 4. GROUP iOS APP API BY DAY
  const iosByDay = new Map<string, { count: number; bonus: number; points: number; items: any[] }>();

  for (const item of iosList) {
    const checkin =
      item.report_order?.actual_booking_date_start || item.booking_date_start || item.report_order?.date || '';
    const day = checkin.substring(0, 10);
    if (!day) continue;
    if (!iosByDay.has(day)) {
      iosByDay.set(day, { count: 0, bonus: 0, points: 0, items: [] });
    }
    const d = iosByDay.get(day)!;
    d.count += 1;

    // Extract Cash bonus amount and BonusPoint from staff_bonus object
    const cashBonus = item.staff_bonus && item.staff_bonus.Cash ? Number(item.staff_bonus.Cash.bonus_amount || 0) : 0;
    const ptsBonus =
      item.staff_bonus && item.staff_bonus.BonusPoint ? Number(item.staff_bonus.BonusPoint.bonus_amount || 0) : 0;

    d.bonus += cashBonus;
    d.points += ptsBonus;
    d.items.push(item);
  }

  // 5. COMPARE DAY BY DAY FOR ALL DAYS IN JULY 2026
  console.log('======================================================================================');
  console.log('📊 DAY-BY-DAY COMPARISON TABLE FOR CC DIỄM HƯƠNG (JULY 2026)');
  console.log('======================================================================================');
  console.log('Date       | MOS Count | iOS Count | MOS Bonus (đ) | iOS Bonus (đ) | Diff Bonus (đ) | Status');
  console.log('--------------------------------------------------------------------------------------');

  let totalMosBonus = 0;
  let totalIosBonus = 0;
  let totalMosCount = 0;
  let totalIosCount = 0;

  const discrepancies: Array<{
    date: string;
    mosCount: number;
    iosCount: number;
    mosBonus: number;
    iosBonus: number;
    diffBonus: number;
    diffCount: number;
  }> = [];

  for (let i = 1; i <= 31; i++) {
    const dayNum = i < 10 ? `0${i}` : `${i}`;
    const dateStr = `2026-07-${dayNum}`;

    const mosStat = mosByDay.get(dateStr) || { count: 0, bonus: 0, points: 0, items: [] };
    const iosStat = iosByDay.get(dateStr) || { count: 0, bonus: 0, points: 0, items: [] };

    totalMosBonus += mosStat.bonus;
    totalIosBonus += iosStat.bonus;
    totalMosCount += mosStat.count;
    totalIosCount += iosStat.count;

    const diffBonus = mosStat.bonus - iosStat.bonus;
    const diffCount = mosStat.count - iosStat.count;
    const isMatched = diffBonus === 0 && diffCount === 0;

    const statusTag = isMatched ? '✅ MATCHED' : '❌ MISMATCH';

    console.log(
      `${dateStr} | ${String(mosStat.count).padStart(9)} | ${String(iosStat.count).padStart(9)} | ${String(
        mosStat.bonus
      ).padStart(13)} | ${String(iosStat.bonus).padStart(13)} | ${String(diffBonus).padStart(14)} | ${statusTag}`
    );

    if (!isMatched) {
      discrepancies.push({
        date: dateStr,
        mosCount: mosStat.count,
        iosCount: iosStat.count,
        mosBonus: mosStat.bonus,
        iosBonus: iosStat.bonus,
        diffBonus,
        diffCount,
      });
    }
  }

  console.log('--------------------------------------------------------------------------------------');
  console.log(
    `TOTAL      | ${String(totalMosCount).padStart(9)} | ${String(totalIosCount).padStart(9)} | ${String(
      totalMosBonus
    ).padStart(13)} | ${String(totalIosBonus).padStart(13)} | ${String(totalMosBonus - totalIosBonus).padStart(
      14
    )} | ${totalMosBonus === totalIosBonus && totalMosCount === totalIosCount ? '✅ MATCHED' : '❌ MISMATCH'}`
  );
  console.log('======================================================================================\n');

  console.log(`📌 TOTAL DISCREPANT DAYS: ${discrepancies.length} day(s)\n`);

  if (discrepancies.length > 0) {
    console.log('❌ LIST OF DISCREPANT DAYS & DETAILS:');
    discrepancies.forEach((d) => {
      console.log(
        `   - Date: ${d.date} | MOS Count: ${d.mosCount} vs iOS Count: ${d.iosCount} (Diff Count: ${d.diffCount}) | MOS Bonus: ${d.mosBonus.toLocaleString('vi-VN')}đ vs iOS Bonus: ${d.iosBonus.toLocaleString('vi-VN')}đ | Diff Bonus: ${d.diffBonus.toLocaleString('vi-VN')}đ`
      );
    });
  } else {
    console.log('🎉 PERFECT MATCH! No discrepancies found across all 31 days of July 2026.');
  }

  await server.close();
}

main().catch(console.error);

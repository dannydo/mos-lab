import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import prismaPlugin from '../apps/api/src/plugins/prisma.js';
import { kpiRoutes } from '../apps/api/src/modules/kpi/routes.js';

async function main() {
  const staffId = 37790;
  const dateFrom = '2026-07-01';
  const dateTo = '2026-07-31';

  // 1. MOS API
  const server = Fastify({ logger: false });
  await server.register(jwt, { secret: 'super_secret_mos_lab_jwt_key_development_only' });
  await server.register(prismaPlugin);
  await server.register(kpiRoutes, { prefix: '/api' });
  await server.ready();

  const token = server.jwt.sign({ id: 1, username: 'admin', role: 'admin', displayName: 'Admin Test' });
  const headers = { authorization: `Bearer ${token}` };

  const mosRes = await server.inject({
    method: 'GET',
    url: `/api/kpi/cc-xoay?dateFrom=${dateFrom}&dateTo=${dateTo}&consultantId=${staffId}&limit=1000`,
    headers,
  });
  const mosData = JSON.parse(mosRes.payload);
  console.log('--- MOS API RECORD SAMPLE ---');
  console.log(JSON.stringify(mosData.data[0], null, 2));

  // 2. iOS App API
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
      page: 1,
      date_from: dateFrom,
      date_to: dateTo,
    }),
  });

  const iosData: any = await iosRes.json();
  console.log('\n--- iOS APP API RECORD SAMPLE ---');
  console.log(JSON.stringify(iosData.data.booking.data[0], null, 2));
  console.log('Pagination info:', iosData.data.booking.page);

  await server.close();
}

main().catch(console.error);

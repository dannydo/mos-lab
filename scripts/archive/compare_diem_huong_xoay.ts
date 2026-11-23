import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import prismaPlugin from '../apps/api/src/plugins/prisma.js';
import { kpiRoutes } from '../apps/api/src/modules/kpi/routes.js';

async function main() {
  const staffId = 37790; // Diễm Hương
  const dateFrom = '2026-07-01';
  const dateTo = '2026-07-31';

  console.log('--- Testing iOS App API (PHP) ---');
  const urlsToTest = [
    { url: 'http://192.168.139.33/1/staff/client-consultant/bonus', host: 'api.orb' },
    { url: 'http://127.0.0.1/1/staff/client-consultant/bonus', host: 'api.orb' },
    { url: 'http://localhost/1/staff/client-consultant/bonus', host: 'api.orb' },
    { url: 'http://192.168.139.33/api/1/staff/client-consultant/bonus', host: 'api.orb' },
  ];

  const bodyData = JSON.stringify({
    client_store_id: 0,
    staff_user_id: staffId,
    page: 1,
    limit: 1000,
    date_from: dateFrom,
    date_to: dateTo,
  });

  for (const item of urlsToTest) {
    try {
      const res = await fetch(item.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Host: item.host,
        },
        body: bodyData,
      });
      console.log(`URL: ${item.url} (Host: ${item.host}) -> Status: ${res.status}`);
      if (res.status === 200) {
        const text = await res.text();
        console.log('Response sample:', text.substring(0, 400));
        break;
      }
    } catch (e: any) {
      console.log(`URL: ${item.url} -> Error: ${e.message}`);
    }
  }
}

main().catch(console.error);

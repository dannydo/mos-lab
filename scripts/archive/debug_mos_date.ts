import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import prismaPlugin from '../apps/api/src/plugins/prisma.js';
import { kpiRoutes } from '../apps/api/src/modules/kpi/routes.js';

async function main() {
  const server = Fastify({ logger: false });
  await server.register(jwt, { secret: 'super_secret_mos_lab_jwt_key_development_only' });
  await server.register(prismaPlugin);
  await server.register(kpiRoutes, { prefix: '/api' });
  await server.ready();

  const token = server.jwt.sign({ id: 1, username: 'admin', role: 'admin', displayName: 'Admin Test' });
  const headers = { authorization: `Bearer ${token}` };

  const mosRes = await server.inject({
    method: 'GET',
    url: `/api/kpi/cc-xoay?dateFrom=2026-07-01&dateTo=2026-07-31&consultantId=37790&limit=2000`,
    headers,
  });

  const mosData = JSON.parse(mosRes.payload);
  console.log('MOS Sample 0:', mosData.data[0]);
  console.log('MOS Sample 1:', mosData.data[1]);

  await server.close();
}

main().catch(console.error);

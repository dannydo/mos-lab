import Fastify from 'fastify';
import prismaPlugin from './plugins/prisma.js';

async function main() {
  const fastify = Fastify({ logger: false });
  await fastify.register(prismaPlugin);
  await fastify.ready();

  try {
    const crmStaffList = await fastify.prisma.crm.crmStaff.findMany();
    console.log('--- ALL crmStaff Count:', crmStaffList.length);
    crmStaffList.forEach((s) => {
      console.log(
        `[${s.id}] ${s.displayName} | username: ${s.username} | isActive: ${s.isActive} | legacyStaffId: ${s.legacyStaffId}`
      );
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await fastify.close();
  }
}

main();

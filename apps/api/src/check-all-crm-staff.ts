import Fastify from 'fastify';
import prismaPlugin from './plugins/prisma.js';

async function main() {
  const fastify = Fastify({ logger: false });
  await fastify.register(prismaPlugin);
  await fastify.ready();

  try {
    const crmStaffList = await fastify.prisma.crm.crmStaff.findMany();
    process.stdout.write(`--- ALL crmStaff Count: ${crmStaffList.length}\n`);
    crmStaffList.forEach((s) => {
      process.stdout.write(
        `[${s.id}] ${s.displayName} | username: ${s.username} | isActive: ${s.isActive} | legacyStaffId: ${s.legacyStaffId}\n`
      );
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await fastify.close();
  }
}

main();

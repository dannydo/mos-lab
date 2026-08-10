import Fastify from 'fastify';
import prismaPlugin from './plugins/prisma.js';

async function main() {
  const fastify = Fastify({ logger: false });
  await fastify.register(prismaPlugin);
  await fastify.ready();

  try {
    const legacyStaff = await fastify.prisma.legacy.$queryRawUnsafe<any[]>(`
      SELECT user_id, full_name, username, is_disabled, is_leaved, is_deleted, user_group_id
      FROM user_profile
      WHERE full_name LIKE '%Thanh Mai%' OR full_name LIKE '%An Nam%' OR username LIKE '%thanhmai%' OR username LIKE '%annam%'
    `);
    console.log('--- Legacy user_profile ---');
    console.table(legacyStaff);

    const crmStaff = await fastify.prisma.crm.crmStaff.findMany({
      where: {
        OR: [
          { displayName: { contains: 'Thanh Mai' } },
          { displayName: { contains: 'An Nam' } },
          { username: { contains: 'thanhmai' } },
          { username: { contains: 'annam' } },
        ],
      },
    });
    console.log('\n--- CRM crmStaff ---');
    console.table(
      crmStaff.map((s) => ({
        id: s.id,
        displayName: s.displayName,
        username: s.username,
        isActive: s.isActive,
        legacyStaffId: s.legacyStaffId,
      }))
    );

    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'ACTIVE_BK_STAFF_CONFIG' },
    });
    console.log('\n--- ACTIVE_BK_STAFF_CONFIG ---');
    console.log(configRecord?.value);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await fastify.close();
  }
}

main();

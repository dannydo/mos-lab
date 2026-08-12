import Fastify from 'fastify';
import prismaPlugin from './plugins/prisma.js';

interface LegacyStaffRow {
  user_id: number;
  full_name: string | null;
  username: string | null;
  is_disabled: number | boolean | null;
  is_leaved: number | boolean | null;
  is_deleted: number | boolean | null;
  user_group_id: number | null;
}

async function main() {
  const fastify = Fastify({ logger: false });
  await fastify.register(prismaPlugin);
  await fastify.ready();

  try {
    const legacyStaff = await fastify.prisma.legacy.$queryRawUnsafe<LegacyStaffRow[]>(`
      SELECT user_id, full_name, username, is_disabled, is_leaved, is_deleted, user_group_id
      FROM user_profile
      WHERE full_name LIKE '%Thanh Mai%' OR full_name LIKE '%An Nam%' OR username LIKE '%thanhmai%' OR username LIKE '%annam%'
    `);
    process.stdout.write(`--- Legacy user_profile ---\n${JSON.stringify(legacyStaff, null, 2)}\n`);

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
    process.stdout.write(
      `\n--- CRM crmStaff ---\n${JSON.stringify(
        crmStaff.map((s) => ({
          id: s.id,
          displayName: s.displayName,
          username: s.username,
          isActive: s.isActive,
          legacyStaffId: s.legacyStaffId,
        })),
        null,
        2
      )}\n`
    );

    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'ACTIVE_BK_STAFF_CONFIG' },
    });
    process.stdout.write(`\n--- ACTIVE_BK_STAFF_CONFIG ---\n${configRecord?.value ?? ''}\n`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await fastify.close();
  }
}

main();

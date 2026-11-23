import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { SafeAny } from '@mos-lab/shared';
import { requireAuth, requireRole } from '../../../middlewares/auth.js';
import { TeamService } from '../../teams/team.service.js';

export function registerStaffLegacySyncRoutes(fastify: FastifyInstance) {
  // GET /api/staff/legacy - Get list of legacy staff (Wings Lashes accounts)
  fastify.get('/staff/legacy', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const legacyStaff = await fastify.prisma.legacy.$queryRawUnsafe<
        { id: number | bigint; name: string | null; email: string | null; phone: string | null }[]
      >(
        `SELECT 
          up.user_id as id, 
          up.full_name as name, 
          u.email as email,
          (SELECT phone_number FROM user_contact WHERE user_id = up.user_id AND is_disabled = 0 LIMIT 1) as phone
         FROM user_profile up
         JOIN user u ON up.user_id = u.id
         WHERE up.provider = 'Staff' AND up.is_disabled = 0 AND up.user_group_id > 1
         ORDER BY up.full_name ASC`
      );
      return legacyStaff.map((row) => ({
        id: Number(row.id),
        name: row.name ? row.name.trim() : 'Unknown',
        email: row.email || null,
        phone: row.phone || null,
      }));
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Fetch legacy staff error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi lấy danh sách tài khoản Wings Lashes',
      });
    }
  });

  // POST /api/staff/sync-legacy - Import active staff from legacy database (Admin only)
  fastify.post('/staff/sync-legacy', { preHandler: [requireAuth, requireRole(['admin'])] }, async (_request, reply) => {
    try {
      // 1. Fetch active staff from legacy database
      const legacyStaff = await fastify.prisma.legacy.$queryRawUnsafe<
        {
          id: number | bigint;
          name: string | null;
          email: string | null;
          phone: string | null;
          date_created: string;
          user_group_id: number | bigint;
          avatar: string | null;
          gender: string | null;
          date_of_birth: string | null;
          address: string | null;
          working_hour_rate: number | null;
          base_salary: number | null;
        }[]
      >(
        `SELECT 
          up.user_id as id, 
          up.full_name as name, 
          u.email as email,
          (SELECT phone_number FROM user_contact WHERE user_id = up.user_id AND is_disabled = 0 LIMIT 1) as phone,
          up.date_created,
          up.user_group_id,
          up.avatar,
          u.gender,
          u.date_of_birth,
          (SELECT current_address FROM staff_profile WHERE user_id = up.user_id LIMIT 1) as address,
          (SELECT sp.working_hour_rate 
           FROM staff_payroll sp 
           WHERE sp.user_id = up.user_id 
           ORDER BY sp.date DESC LIMIT 1) as working_hour_rate,
          (SELECT spl.base_salary 
           FROM staff_payroll sp 
           LEFT JOIN staff_payroll_level spl ON sp.staff_payroll_level_id = spl.id 
           WHERE sp.user_id = up.user_id 
           ORDER BY sp.date DESC LIMIT 1) as base_salary
         FROM user_profile up
         JOIN user u ON up.user_id = u.id
         WHERE up.provider = 'Staff' AND up.is_disabled = 0 AND up.user_group_id > 1 AND up.full_name NOT LIKE 'Wings -%'
         ORDER BY up.full_name ASC`
      );

      let importedCount = 0;
      const defaultPasswordHash = await bcrypt.hash('WingsLive2026Base', 10);

      // 2. Iterate and upsert into crm_staff
      for (const row of legacyStaff) {
        const id = Number(row.id);
        const name = row.name ? row.name.trim() : 'Unknown Staff';
        const email = row.email || null;
        const phone = row.phone || null;
        const joinedAt = row.date_created ? new Date(row.date_created) : new Date();
        const groupId = Number(row.user_group_id);
        const avatarUrl = row.avatar || null;
        const gender = row.gender === 'Male' ? 'Male' : row.gender === 'Female' ? 'Female' : 'Other';
        const birthDate = row.date_of_birth ? new Date(row.date_of_birth) : null;
        const address = row.address || null;
        const baseSalary = row.base_salary !== null && row.base_salary !== undefined ? Number(row.base_salary) : null;
        const hourlyWage =
          row.working_hour_rate !== null && row.working_hour_rate !== undefined ? Number(row.working_hour_rate) : null;

        // Map role
        let role = 'telesales';
        if (groupId === 4) {
          role = 'technician';
        } else if (groupId === 5) {
          role = 'cc';
        } else if ([2, 31, 32, 45].includes(groupId)) {
          role = 'oc';
        } else if ([14, 33, 34].includes(groupId)) {
          role = 'manager';
        }

        // Generate username (email or prefix of email, or user{id} if not valid)
        let username = email ? email.trim() : `user${id}@wingslashes.com`;
        if (username.indexOf('@') === -1) {
          username = `${username}@wingslashes.com`;
        }

        // Multi-level anti-duplicate check before creating new staff
        let matchedStaff = await fastify.prisma.crm.crmStaff.findFirst({
          where: { legacyStaffId: id },
        });

        if (!matchedStaff && email) {
          matchedStaff = await fastify.prisma.crm.crmStaff.findFirst({
            where: {
              OR: [{ email: email }, { username: email }, { username: username }],
            },
          });
        }

        if (!matchedStaff && phone) {
          matchedStaff = await fastify.prisma.crm.crmStaff.findFirst({
            where: { phone: phone },
          });
        }

        if (!matchedStaff && name) {
          matchedStaff = await fastify.prisma.crm.crmStaff.findFirst({
            where: { displayName: name },
          });
        }

        if (matchedStaff) {
          // Preserve HR overrides while filling missing salary metadata from legacy payroll.
          await fastify.prisma.crm.crmStaff.update({
            where: { id: matchedStaff.id },
            data: {
              legacyStaffId: matchedStaff.legacyStaffId || id,
              displayName: name,
              email: matchedStaff.email || email,
              phone: matchedStaff.phone || phone,
              joinedAt: matchedStaff.joinedAt || joinedAt,
              avatarUrl: matchedStaff.avatarUrl || avatarUrl,
              gender: matchedStaff.gender || gender,
              birthDate: matchedStaff.birthDate || birthDate,
              address: matchedStaff.address || address,
              baseSalary:
                matchedStaff.baseSalary !== null && matchedStaff.baseSalary !== undefined
                  ? matchedStaff.baseSalary
                  : baseSalary,
              hourlyWage:
                matchedStaff.hourlyWage !== null && matchedStaff.hourlyWage !== undefined
                  ? matchedStaff.hourlyWage
                  : hourlyWage,
              payBasis:
                matchedStaff.payBasis ||
                (baseSalary && baseSalary > 0 ? 'MONTHLY' : hourlyWage && hourlyWage > 0 ? 'HOURLY' : null),
            },
          });
        } else {
          // Check if username is already taken to avoid crash
          const existingByUsername = await fastify.prisma.crm.crmStaff.findUnique({
            where: { username },
          });

          const finalUsername = existingByUsername ? `user${id}_${username}` : username;

          await fastify.prisma.crm.crmStaff.create({
            data: {
              username: finalUsername,
              displayName: name,
              passwordHash: defaultPasswordHash,
              role: role,
              isActive: true,
              email: email,
              phone: phone,
              joinedAt: joinedAt,
              legacyStaffId: id,
              seniorityOffset: 0,
              avatarUrl: avatarUrl,
              gender: gender,
              birthDate: birthDate,
              address: address,
              baseSalary: baseSalary,
              hourlyWage: hourlyWage,
              payBasis: baseSalary && baseSalary > 0 ? 'MONTHLY' : hourlyWage && hourlyWage > 0 ? 'HOURLY' : null,
            },
          });
          importedCount++;
        }

        // Ensure legacy staff_profile exists so the staff member is immediately eligible for teams and reporting
        await TeamService.ensureLegacyStaffProfile(fastify, id);
      }

      return {
        success: true,
        count: importedCount,
        message: `Đồng bộ thành công. Đã tạo mới ${importedCount} tài khoản nhân sự từ Wings Lashes.`,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Sync legacy staff error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi đồng bộ tài khoản Wings Lashes',
      });
    }
  });
}

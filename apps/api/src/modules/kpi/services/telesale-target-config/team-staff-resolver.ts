import { FastifyInstance } from 'fastify';
import { TELESALES_EXECUTIVE_STANDARDS, type SafeAny } from '@mos-lab/shared';
import {
  DEFAULT_OCTOBER_CONFIG,
  type ActiveTelesaleStaffItem,
  type FallbackStaffTargetItem,
} from './config-helpers.js';

/**
 * Nguồn danh sách nhân sự chuẩn từ Quản lý Nhân Sự & Vai Trò (HR) -> Danh sách nhân sự Active (MOS-BUG-84):
 * Điều kiện lọc:
 * - Vai trò = Telesales Executive (role IN ['telesales', 'Telesales Executive'])
 * - Trạng thái = Active (isActive = true)
 * - legacyStaffId hợp lệ (> 0)
 *
 * Tự động phản ánh khi HR thêm, đổi vai trò, khóa hoặc kích hoạt nhân viên.
 */
export async function getActiveTelesalesStaffFromHr(
  fastify: FastifyInstance,
  fallbackStaffTargets?: FallbackStaffTargetItem[]
): Promise<ActiveTelesaleStaffItem[]> {
  try {
    if (fastify?.prisma?.crm?.crmStaff?.findMany) {
      const staffList = await fastify.prisma.crm.crmStaff.findMany({
        where: {
          isActive: true,
          OR: [
            { role: 'telesales' },
            { role: 'Telesales Executive' },
            { role: TELESALES_EXECUTIVE_STANDARDS.roleKey },
            { role: TELESALES_EXECUTIVE_STANDARDS.roleName },
          ],
        },
        select: {
          id: true,
          legacyStaffId: true,
          displayName: true,
          avatarUrl: true,
        },
        orderBy: { displayName: 'asc' },
      });

      const validStaff = staffList
        .filter((s) => s.legacyStaffId && Number(s.legacyStaffId) > 0)
        .map((s) => ({
          crmStaffId: s.id,
          legacyStaffId: Number(s.legacyStaffId),
          name: s.displayName,
          avatarUrl: s.avatarUrl || null,
        }));

      if (validStaff.length > 0) {
        return validStaff;
      }
    }
  } catch (err) {
    fastify.log?.warn?.(`Failed to query active telesales staff from HR (crmStaff): ${err}`);
  }

  if (fallbackStaffTargets && fallbackStaffTargets.length > 0) {
    return fallbackStaffTargets.map((st) => ({
      crmStaffId: 0,
      legacyStaffId: st.legacyStaffId,
      name: st.name,
      avatarUrl: st.avatarUrl || null,
    }));
  }

  return DEFAULT_OCTOBER_CONFIG.staffTargets.map((st) => ({
    crmStaffId: 0,
    legacyStaffId: st.legacyStaffId,
    name: st.name,
    avatarUrl: st.avatarUrl || null,
  }));
}

export async function getTeamNameByCode(fastify: FastifyInstance, teamCode: string): Promise<string> {
  try {
    if (fastify?.prisma?.crm?.crmTeam?.findUnique) {
      const team = await fastify.prisma.crm.crmTeam.findUnique({
        where: { code: teamCode },
        select: { name: true },
      });
      if (team?.name) return team.name;
    }
  } catch {
    // ignore
  }
  if (teamCode === 'BK_TELESALES') return 'Telesales';
  if (teamCode === 'BK_CS') return 'Customer Service (CS)';
  if (teamCode === 'BK') return 'Booker';
  if (teamCode === 'CC') return 'Client Consultant';
  if (teamCode === 'CV') return 'Chuyên Viên (CV)';
  return teamCode;
}

/**
 * Nguồn danh sách nhân sự của War Room lấy từ Đội nhóm (Cấu trúc Phòng ban & Đội nhóm) (MOS-BUG-93):
 * - Team được chọn (mặc định 'BK_TELESALES')
 * - Lấy toàn bộ thành viên hiện tại của Team (crm_team_members where is_active = true)
 * - Không phụ thuộc Role cá nhân (Manager, Admin, Telesales, v.v. đều được lấy nếu thuộc Team)
 * - Áp dụng đồng bộ cho KPI cá nhân, Call/Pickup, Book/Done, TV Monitor, Đóng góp cá nhân.
 */
export async function getActiveStaffFromTeam(
  fastify: FastifyInstance,
  teamCode = 'BK_TELESALES',
  fallbackStaffTargets?: FallbackStaffTargetItem[],
  hrFallbackFn: typeof getActiveTelesalesStaffFromHr = getActiveTelesalesStaffFromHr
): Promise<ActiveTelesaleStaffItem[]> {
  try {
    if (fastify?.prisma?.crm?.crmTeam?.findMany) {
      const teams = await fastify.prisma.crm.crmTeam.findMany({
        where: {
          OR: [{ code: teamCode }, { parent: { code: teamCode } }],
          isActive: true,
        },
        include: {
          members: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
      });

      const activeMembersMap = new Map<number, SafeAny>();
      teams.forEach((t) => {
        (t.members || []).forEach((m: SafeAny) => {
          const legId = Number(m.legacyStaffId);
          if (m.isActive !== false && legId > 0 && !activeMembersMap.has(legId)) {
            activeMembersMap.set(legId, m);
          }
        });
      });

      const activeLegacyIds = Array.from(activeMembersMap.keys());

      if (activeLegacyIds.length > 0) {
        const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
          where: {
            legacyStaffId: { in: activeLegacyIds },
          },
          select: {
            id: true,
            legacyStaffId: true,
            displayName: true,
            avatarUrl: true,
          },
        });

        const staffByLegacyId = new Map(crmStaffList.map((s) => [Number(s.legacyStaffId), s]));

        let legacyProfiles: SafeAny[] = [];
        try {
          legacyProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `SELECT user_id, full_name, avatar FROM user_profile WHERE user_id IN (${activeLegacyIds.join(',')})`
          );
        } catch {
          // ignore
        }
        const legacyProfileMap = new Map(legacyProfiles.map((p) => [Number(p.user_id), p]));

        const result = activeLegacyIds.map((legId) => {
          const m = activeMembersMap.get(legId);
          const crmStaff = staffByLegacyId.get(legId);
          const legProf = legacyProfileMap.get(legId);
          const name = crmStaff?.displayName || m?.displayName || legProf?.full_name || `Nhân sự #${legId}`;
          const avatarUrl = crmStaff?.avatarUrl || legProf?.avatar || null;

          return {
            crmStaffId: crmStaff?.id || m?.crmStaffId || 0,
            legacyStaffId: legId,
            name,
            avatarUrl: typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl.trim() : null,
          };
        });

        if (result.length > 0) {
          return result;
        }
      }
    }
  } catch (err) {
    fastify.log?.warn?.(`Failed to query active team staff for ${teamCode}: ${err}`);
  }

  // Fallback to HR active telesales query for backwards compatibility
  return hrFallbackFn(fastify, fallbackStaffTargets);
}

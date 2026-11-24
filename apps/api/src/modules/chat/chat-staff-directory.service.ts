import type { FastifyInstance } from 'fastify';
import type { MosChatStaffMember } from '@mos-lab/shared';
import { STAFF_DIRECTORY_CACHE_TTL_MS } from './chat-state-defaults.js';

let memoryStaffCache: {
  staffDirectory: MosChatStaffMember[];
  fetchedAt: number;
} | null = null;

const loadStaffInFlightByFastify = new WeakMap<FastifyInstance, Promise<MosChatStaffMember[]>>();

export function getMemoryStaffFetchedAt(): number {
  return memoryStaffCache?.fetchedAt || 0;
}

export async function loadStaffDirectoryCached(fastify: FastifyInstance): Promise<MosChatStaffMember[]> {
  const nowMs = Date.now();
  if (memoryStaffCache && nowMs - memoryStaffCache.fetchedAt < STAFF_DIRECTORY_CACHE_TTL_MS) {
    return memoryStaffCache.staffDirectory;
  }
  const inFlight = loadStaffInFlightByFastify.get(fastify);
  if (inFlight) {
    return inFlight;
  }

  const staffPromise = (async () => {
    const [rawStaff, activeTeamMembers] = await Promise.all([
      fastify.prisma.crm.crmStaff.findMany({
        where: { isActive: true },
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true,
          phone: true,
          avatarUrl: true,
          lastActiveAt: true,
          legacyStaffId: true,
        },
        orderBy: { displayName: 'asc' },
        take: 250,
      }),
      fastify.prisma.crm.crmTeamMember
        .findMany({
          where: { isActive: true },
          select: {
            crmStaffId: true,
            legacyStaffId: true,
            team: {
              select: {
                code: true,
                department: { select: { code: true } },
              },
            },
          },
        })
        .catch(() => []),
    ]);

    // Fallback to legacy user_profile avatar and user_contact phone for staff who haven't set CRM values yet
    const legacyAvatarMap = new Map<number, string>();
    const legacyPhoneMap = new Map<number, string>();
    const candidateLegacyIds = rawStaff
      .filter((s) => !s.avatarUrl && s.legacyStaffId && Number(s.legacyStaffId) > 0)
      .map((s) => Number(s.legacyStaffId));
    const phoneLegacyIds = rawStaff
      .filter((s) => !s.phone?.trim() && s.legacyStaffId && Number(s.legacyStaffId) > 0)
      .map((s) => Number(s.legacyStaffId));

    if (candidateLegacyIds.length > 0 && fastify.prisma?.legacy?.$queryRawUnsafe) {
      try {
        const legacyProfiles = await fastify.prisma.legacy.$queryRawUnsafe<
          Array<{ user_id: number | string; avatarUrl: string | null }>
        >(
          `SELECT user_id, COALESCE(NULLIF(avatar, ''), NULLIF(avatar_internal, '')) as avatarUrl
           FROM \`user_profile\`
           WHERE user_id IN (${candidateLegacyIds.join(',')})`
        );
        for (const p of legacyProfiles || []) {
          const uid = Number(p.user_id);
          const rawUrl = String(p.avatarUrl || '').trim();
          if (uid > 0 && rawUrl) {
            const normalizedUrl =
              rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/api/')
                ? rawUrl.replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com/, 'https://cdn.wingslashes.com')
                : `https://cdn.wingslashes.com/${rawUrl.replace(/^\/+/, '')}`;
            legacyAvatarMap.set(uid, normalizedUrl);
          }
        }
      } catch {
        // ignore legacy avatar lookup failure in test/offline mode
      }
    }

    if (phoneLegacyIds.length > 0 && fastify.prisma?.legacy?.$queryRawUnsafe) {
      try {
        const legacyContacts = await fastify.prisma.legacy.$queryRawUnsafe<
          Array<{ user_id: number | string; phone_number: string | null }>
        >(
          `SELECT user_id, phone_number
           FROM \`user_contact\`
           WHERE is_disabled = 0 AND phone_number IS NOT NULL AND phone_number != '' AND user_id IN (${phoneLegacyIds.join(',')})
           ORDER BY id ASC`
        );
        for (const c of legacyContacts || []) {
          const uid = Number(c.user_id);
          const rawPhone = String(c.phone_number || '').trim();
          if (uid > 0 && rawPhone && !legacyPhoneMap.has(uid)) {
            legacyPhoneMap.set(uid, rawPhone);
          }
        }
      } catch {
        // ignore legacy phone lookup failure in test/offline mode
      }
    }

    const staffDirectory: MosChatStaffMember[] = rawStaff.map((s) => {
      const deptSet = new Set<string>();
      const teamSet = new Set<string>();
      const normalizedRole = String(s.role || '')
        .toLowerCase()
        .trim();

      if (['super_admin', 'admin', 'boss', 'manager', 'fm', 'cho'].includes(normalizedRole)) {
        deptSet.add('BACK_OFFICE');
        teamSet.add('ADMIN_MANAGER');
      } else if (['cc', 'coca', 'consultant'].includes(normalizedRole)) {
        deptSet.add('SHOP');
        teamSet.add('CC');
      } else if (['cv', 'lt', 'technician', 'ktv'].includes(normalizedRole)) {
        deptSet.add('SHOP');
        teamSet.add('CV');
      } else if (['telesales', 'booker', 'oc', 'ls'].includes(normalizedRole)) {
        deptSet.add('GROWTH');
        teamSet.add('BK_TELESALES');
      } else if (['teacher', 'ht'].includes(normalizedRole)) {
        deptSet.add('ACADEMY');
        teamSet.add('ACADEMY');
      } else if (['qa_qc'].includes(normalizedRole)) {
        deptSet.add('SHOP');
        teamSet.add('QA_QC');
      } else {
        deptSet.add('BACK_OFFICE');
        teamSet.add('BACK_OFFICE_STAFF');
      }

      for (const tm of activeTeamMembers) {
        const matched =
          tm.crmStaffId === s.id ||
          (s.legacyStaffId && tm.legacyStaffId && Number(tm.legacyStaffId) === Number(s.legacyStaffId));
        if (!matched) continue;
        const tCode = String(tm.team?.code || '')
          .toUpperCase()
          .trim();
        const dCode = String(tm.team?.department?.code || '')
          .toUpperCase()
          .trim();
        if (dCode) deptSet.add(dCode);
        if (tCode) {
          teamSet.add(tCode);
          if (tCode.startsWith('QA_QC')) teamSet.add('QA_QC');
          if (tCode === 'BK' || tCode === 'BK_TELESALES') teamSet.add('BK_TELESALES');
          if (tCode === 'BK_CS' || tCode === 'BK_CONTROL') teamSet.add('BK_CS_CONTROL');
          if (tCode === 'ACADEMY' || tCode === 'MARKETING_SALES') teamSet.add('ACADEMY');
          if (tCode === 'CORE' || tCode === 'CORE_TEAM') {
            teamSet.add('CORE_TEAM');
            teamSet.add('CORE');
          }
        }
      }

      const fallbackLegacyAvatar = s.legacyStaffId ? legacyAvatarMap.get(Number(s.legacyStaffId)) || null : null;
      const fallbackLegacyPhone = s.legacyStaffId ? legacyPhoneMap.get(Number(s.legacyStaffId)) || null : null;

      return {
        id: s.id,
        username: s.username,
        displayName: s.displayName || s.username,
        role: s.role,
        phone: (s.phone && s.phone.trim()) || fallbackLegacyPhone || null,
        avatarUrl: s.avatarUrl || fallbackLegacyAvatar,
        isOnline: Boolean(s.lastActiveAt && nowMs - new Date(s.lastActiveAt).getTime() < 5 * 60 * 1000),
        departmentCodes: Array.from(deptSet),
        teamCodes: Array.from(teamSet),
        legacyStaffId: s.legacyStaffId ? Number(s.legacyStaffId) : null,
      };
    });
    memoryStaffCache = {
      staffDirectory,
      fetchedAt: Date.now(),
    };
    return staffDirectory;
  })().finally(() => {
    if (loadStaffInFlightByFastify.get(fastify) === staffPromise) {
      loadStaffInFlightByFastify.delete(fastify);
    }
  });

  loadStaffInFlightByFastify.set(fastify, staffPromise);
  return staffPromise;
}

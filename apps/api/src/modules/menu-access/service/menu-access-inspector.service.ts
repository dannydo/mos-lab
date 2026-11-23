import type { FastifyInstance } from 'fastify';
import {
  getMenuAccessCategoryPolicyKey,
  getRoleGroupForRole,
  isAdminOrSuperAdminRole,
  isCvRole,
  isManagedMenuAccessCategoryPolicyKey,
  isManagedMenuAccessKey,
  MENU_ACCESS_CATEGORY_DEFINITIONS,
  MENU_ACCESS_DEFINITIONS,
  MENU_ACCESS_ROLE_GROUPS,
  type MenuAccessInspectorAllowedItem,
  type MenuAccessInspectorResponse,
  type MenuAccessTimelineEvent,
} from '@mos-lab/shared';
import {
  buildSubjectLabelMap,
  CV_DEFAULT_SET,
  MenuAccessError,
  parseAuditPolicy,
  parseBlockAudit,
  policySnapshot,
  resolveMenuVisibility,
  SECURITY_BLOCK_PREFIX,
  type ActorScopes,
  type PolicySnapshot,
} from './menu-access-core.js';

/**
 * Point-in-Time Permission & Audit Inspector ("Tra cứu Ai có quyền gì & Vào khi nào").
 * Reconstructs exact effective permissions and full audit timeline for a Staff member or Role Group.
 */
export async function inspectMenuAccessPermissions(
  fastify: FastifyInstance,
  query: { staffId?: number; roleGroupId?: number; at?: string }
): Promise<MenuAccessInspectorResponse> {
  const evalDate = query.at ? new Date(query.at) : new Date();
  const validEvalDate = isNaN(evalDate.getTime()) ? new Date() : evalDate;

  const [departments, teams, allStaff, allPolicies, allMenuAudits] = await Promise.all([
    fastify.prisma.crm.crmDepartment.findMany({ select: { id: true, code: true, name: true } }),
    fastify.prisma.crm.crmTeam.findMany({
      select: { id: true, code: true, name: true, parentTeamId: true, departmentId: true },
    }),
    fastify.prisma.crm.crmStaff.findMany({
      select: {
        id: true,
        displayName: true,
        username: true,
        role: true,
        isActive: true,
        legacyStaffId: true,
        createdAt: true,
      },
    }),
    fastify.prisma.crm.crmMenuAccessPolicy.findMany({ include: { rules: true } }),
    fastify.prisma.crm.crmMenuAccessAudit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  ]);

  const staffById = new Map(allStaff.map((s) => [s.id, s]));
  const labels = buildSubjectLabelMap(departments, teams, allStaff);
  const menuLabels = new Map([
    ...MENU_ACCESS_DEFINITIONS.map((menu) => [menu.key, menu.label] as const),
    ...MENU_ACCESS_CATEGORY_DEFINITIONS.map(
      (category) => [getMenuAccessCategoryPolicyKey(category.key), `Danh mục · ${category.label}`] as const
    ),
  ]);

  let targetType: 'STAFF' | 'ROLE' = 'STAFF';
  let targetId = Number(query.staffId || 0);
  let targetLabel: string;
  let effectiveRole: string;
  let isAccountActive = true;
  const activeTeamIds = new Set<number>();
  const activeDepartmentIds = new Set<number>();
  const staffIds = new Set<number>();
  const timeline: MenuAccessTimelineEvent[] = [];

  if (query.roleGroupId && !query.staffId) {
    targetType = 'ROLE';
    const rg = MENU_ACCESS_ROLE_GROUPS.find((g) => g.id === Number(query.roleGroupId)) || MENU_ACCESS_ROLE_GROUPS[0];
    targetId = rg.id;
    targetLabel = `Nhóm Vai trò · ${rg.name}`;
    effectiveRole = rg.roles[0];
  } else {
    const targetStaff = staffById.get(targetId) || allStaff[0];
    if (!targetStaff) {
      throw new MenuAccessError('Không tìm thấy nhân sự cần tra cứu.', 404);
    }
    targetId = targetStaff.id;
    targetLabel = `${targetStaff.displayName} (@${targetStaff.username})`;
    effectiveRole = targetStaff.role;
    isAccountActive = targetStaff.isActive;
    staffIds.add(targetStaff.id);

    // Fetch staff audit history to reconstruct historical role & isActive at `validEvalDate`
    const staffAudits = await fastify.prisma.crm.crmStaffAudit.findMany({
      where: { staffId: targetStaff.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Reconstruct role and isActive at validEvalDate by walking backwards from current state
    for (const sa of staffAudits) {
      const actorPerson = sa.actorStaffId ? staffById.get(sa.actorStaffId) : null;
      const actorName = actorPerson ? `${actorPerson.displayName} (@${actorPerson.username})` : 'Hệ thống / Admin';

      if (sa.fieldName === 'role') {
        timeline.push({
          id: `staff-audit-${sa.id}`,
          timestamp: sa.createdAt.toISOString(),
          eventType: 'ROLE_CHANGE',
          summary: `Đổi vai trò: ${sa.oldValue || '—'} → ${sa.newValue || '—'}`,
          actorLabel: actorName,
          details: `Hành động: ${sa.action}`,
        });
        if (sa.createdAt > validEvalDate && sa.oldValue) {
          effectiveRole = sa.oldValue;
        }
      } else if (sa.fieldName === 'isActive') {
        timeline.push({
          id: `staff-audit-${sa.id}`,
          timestamp: sa.createdAt.toISOString(),
          eventType: 'ACCOUNT_STATUS',
          summary: `Trạng thái đăng nhập CRM: ${sa.oldValue} → ${sa.newValue}`,
          actorLabel: actorName,
          details: sa.newValue === 'false' ? 'Khóa đăng nhập CRM' : 'Mở khóa đăng nhập CRM',
        });
        if (sa.createdAt > validEvalDate && sa.oldValue !== null) {
          isAccountActive = sa.oldValue === 'true' || sa.oldValue === '1';
        }
      }
    }

    // Active team memberships at `validEvalDate`
    const memberWhere = targetStaff.legacyStaffId
      ? { OR: [{ crmStaffId: targetStaff.id }, { legacyStaffId: targetStaff.legacyStaffId }] }
      : { crmStaffId: targetStaff.id };
    const memberships = await fastify.prisma.crm.crmTeamMember.findMany({
      where: memberWhere,
    });
    const teamById = new Map(teams.map((t) => [t.id, t]));
    for (const m of memberships) {
      const joinedOk = !m.joinedAt || m.joinedAt <= validEvalDate;
      const leftOk = !m.leftAt || m.leftAt > validEvalDate;
      if (m.isActive && joinedOk && leftOk) {
        let curr: number | null = m.teamId;
        while (curr && !activeTeamIds.has(curr)) {
          const t = teamById.get(curr);
          if (!t) break;
          activeTeamIds.add(t.id);
          if (t.departmentId) activeDepartmentIds.add(t.departmentId);
          curr = t.parentTeamId;
        }
      }
    }
  }

  const effectiveRoleGroup = getRoleGroupForRole(effectiveRole) || null;
  const roleGroupIds = new Set<number>(effectiveRoleGroup ? [effectiveRoleGroup.id] : []);
  const scopes: ActorScopes = {
    role: effectiveRole,
    roleGroupIds,
    departmentIds: activeDepartmentIds,
    teamIds: activeTeamIds,
    staffIds,
  };

  // Reconstruct policies at `validEvalDate`
  const policyAudits = allMenuAudits.filter((a) => !a.menuKey.startsWith(SECURITY_BLOCK_PREFIX));
  const reconstructedPolicies = new Map<string, { snapshot: PolicySnapshot; grantedBy?: string; grantedAt?: string }>();

  for (const p of allPolicies) {
    reconstructedPolicies.set(p.menuKey, {
      snapshot: policySnapshot(p),
      grantedAt: p.updatedAt?.toISOString(),
    });
  }

  // Walk backwards through policy audits that happened AFTER `validEvalDate`
  for (const audit of policyAudits) {
    const actorPerson = audit.actorStaffId ? staffById.get(audit.actorStaffId) : null;
    const actorName = actorPerson ? `${actorPerson.displayName} (@${actorPerson.username})` : 'Hệ thống';
    const before = parseAuditPolicy(audit.beforeJson);
    const after = parseAuditPolicy(audit.afterJson);

    if (audit.createdAt > validEvalDate) {
      reconstructedPolicies.set(audit.menuKey, {
        snapshot: { menuKey: audit.menuKey, isRestricted: before.isRestricted, rules: before.rules },
      });
    } else {
      const existing = reconstructedPolicies.get(audit.menuKey);
      if (existing && !existing.grantedBy) {
        existing.grantedBy = actorName;
        existing.grantedAt = audit.createdAt.toISOString();
      }
    }

    // Add to timeline if relevant to this target or global policy change
    const touchesTarget =
      [...before.rules, ...after.rules].some(
        (r) =>
          (r.subjectType === 'STAFF' && staffIds.has(r.subjectId)) ||
          (r.subjectType === 'TEAM' && activeTeamIds.has(r.subjectId)) ||
          (r.subjectType === 'DEPARTMENT' && activeDepartmentIds.has(r.subjectId)) ||
          (r.subjectType === 'ROLE' && roleGroupIds.has(r.subjectId))
      ) || !isCvRole(effectiveRole);

    if (touchesTarget) {
      const afterLabels = after.rules.map(
        (r) => labels.get(`${r.subjectType}:${r.subjectId}`) || `${r.subjectType}:${r.subjectId}`
      );
      timeline.push({
        id: `policy-audit-${audit.id}`,
        timestamp: audit.createdAt.toISOString(),
        eventType: 'POLICY_CHANGE',
        summary: `Cập nhật quyền "${menuLabels.get(audit.menuKey) || audit.menuKey}": ${
          after.isRestricted ? `Giới hạn (${after.rules.length} đối tượng)` : 'Mặc định theo vai trò'
        }`,
        actorLabel: actorName,
        details: afterLabels.length > 0 ? `Đối tượng được cấp: ${afterLabels.join(', ')}` : undefined,
      });
    }
  }

  // Include blocked 403 attempts for this staff member (or role group)
  const blockAudits = allMenuAudits.filter((a) => a.menuKey.startsWith(SECURITY_BLOCK_PREFIX));
  for (const block of blockAudits) {
    const parsed = parseBlockAudit(block.afterJson);
    const matchesTarget =
      targetType === 'STAFF' ? block.actorStaffId === targetId : getRoleGroupForRole(parsed.actorRole)?.id === targetId;
    if (matchesTarget) {
      const actorPerson = block.actorStaffId ? staffById.get(block.actorStaffId) : null;
      const actorName = actorPerson
        ? `${actorPerson.displayName} (@${actorPerson.username})`
        : `Nhân sự #${block.actorStaffId}`;
      timeline.push({
        id: `block-audit-${block.id}`,
        timestamp: block.createdAt.toISOString(),
        eventType: 'BLOCKED_403',
        summary: `Chặn truy cập 403: ${parsed.method || 'GET'} ${parsed.path || block.menuKey}`,
        actorLabel: actorName,
        details: parsed.reason,
      });
    }
  }

  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const activeSnapshots = [...reconstructedPolicies.values()].map((v) => v.snapshot);
  const menuPolicies = activeSnapshots.filter((p) => isManagedMenuAccessKey(p.menuKey));
  const categoryPolicies = activeSnapshots.filter((p) => isManagedMenuAccessCategoryPolicyKey(p.menuKey));
  const isAdmin = isAdminOrSuperAdminRole(effectiveRole);
  const visibility = resolveMenuVisibility(menuPolicies, categoryPolicies, scopes, isAdmin);

  const allowedMenus: MenuAccessInspectorAllowedItem[] = [];
  let deniedMenusCount = 0;

  for (const menu of MENU_ACCESS_DEFINITIONS) {
    if (visibility[menu.key]) {
      const polInfo = reconstructedPolicies.get(menu.key);
      const pol = polInfo?.snapshot;
      let grantSource = isAdmin
        ? 'Toàn quyền Admin / Super Admin'
        : isCvRole(effectiveRole) && CV_DEFAULT_SET.has(menu.key)
          ? 'Quyền mặc định nhóm Chuyên Viên (CV)'
          : `Quyền mặc định theo vai trò (${effectiveRoleGroup?.name || effectiveRole})`;

      if (pol?.isRestricted && !isAdmin) {
        const matchedRule = pol.rules.find((r) => {
          if (r.subjectType === 'STAFF') return staffIds.has(r.subjectId);
          if (r.subjectType === 'TEAM') return activeTeamIds.has(r.subjectId);
          if (r.subjectType === 'DEPARTMENT') return activeDepartmentIds.has(r.subjectId);
          if (r.subjectType === 'ROLE') return roleGroupIds.has(r.subjectId);
          return false;
        });
        if (matchedRule) {
          grantSource = `Cấp theo ${labels.get(`${matchedRule.subjectType}:${matchedRule.subjectId}`) || matchedRule.subjectType}`;
        }
      }

      allowedMenus.push({
        key: menu.key,
        label: menu.label,
        groupLabel: menu.groupLabel,
        path: menu.path,
        grantSource,
        grantedBy: polInfo?.grantedBy || null,
        grantedAt: polInfo?.grantedAt || null,
      });
    } else {
      deniedMenusCount++;
    }
  }

  return {
    targetType,
    targetId,
    targetLabel,
    evaluatedAt: validEvalDate.toISOString(),
    effectiveRole,
    effectiveRoleGroup,
    isAccountActive,
    activeTeams: teams.filter((t) => activeTeamIds.has(t.id)).map((t) => ({ id: t.id, code: t.code, name: t.name })),
    activeDepartments: departments
      .filter((d) => activeDepartmentIds.has(d.id))
      .map((d) => ({ id: d.id, code: d.code, name: d.name })),
    allowedMenus,
    deniedMenusCount,
    auditTimeline: timeline.slice(0, 50),
  };
}

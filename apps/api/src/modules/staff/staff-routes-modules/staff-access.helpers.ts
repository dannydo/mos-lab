import { FastifyInstance } from 'fastify';
import { isHrOrAdminRole, isSuperAdminRole, SafeAny } from '@mos-lab/shared';

export interface CreateStaffInput {
  username?: string;
  password?: string;
  displayName?: string;
  role?: string;
  isActive?: boolean;
  email?: string | null;
  phone?: string | null;
  joinedAt?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
  legacyStaffId?: string | number | null;
  omicallAutoInit?: boolean | null;
  baseSalary?: number | null;
  hourlyWage?: number | null;
  payBasis?: 'HOURLY' | 'MONTHLY' | null;
  seniorityOffset?: number | null;
  // HR Extensions (MOS-FEAT-26)
  staffCode?: string | null;
  employmentStatus?: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';
  contractStatus?: 'PROBATION' | 'OFFICIAL' | 'TERMINATED';
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  nationalId?: string | null;
  socialInsuranceNo?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
}

export function mayManageSuperAdmin(actorRole: string, targetRole?: string | null): boolean {
  return !isSuperAdminRole(targetRole) || isSuperAdminRole(actorRole);
}

export async function getManagedStaffIdsForManager(
  fastify: FastifyInstance,
  currentUserId: number
): Promise<Set<number>> {
  const leaderMemberships = await fastify.prisma.crm.crmTeamMember.findMany({
    where: {
      crmStaffId: currentUserId,
      isActive: true,
      role: 'leader',
    },
    select: { teamId: true },
  });

  const teamIds = leaderMemberships.map((m) => m.teamId);
  if (teamIds.length === 0) {
    const anyMemberships = await fastify.prisma.crm.crmTeamMember.findMany({
      where: {
        crmStaffId: currentUserId,
        isActive: true,
      },
      select: { teamId: true },
    });
    teamIds.push(...anyMemberships.map((m) => m.teamId));
  }

  if (teamIds.length === 0) {
    return new Set<number>();
  }

  const teamMembers = await fastify.prisma.crm.crmTeamMember.findMany({
    where: {
      teamId: { in: teamIds },
      isActive: true,
      crmStaffId: { not: null },
    },
    select: { crmStaffId: true },
  });

  const managedIds = new Set<number>();
  for (const tm of teamMembers) {
    if (tm.crmStaffId) managedIds.add(tm.crmStaffId);
  }
  return managedIds;
}

export function maskStaffSensitiveData<T extends Record<string, SafeAny>>(
  staff: T,
  currentUser: { id: number; role: string },
  managedStaffIds?: Set<number>
): T {
  // Admin, SuperAdmin, HR get full view
  if (isHrOrAdminRole(currentUser.role)) {
    return staff;
  }

  // Self gets full view of own record
  if (currentUser.id === staff.id) {
    return staff;
  }

  const isDirectManager = managedStaffIds?.has(staff.id) || false;
  const masked: Record<string, SafeAny> = { ...staff };

  // Legal and Payment info are strictly hidden from non-HR/Admin/Self
  masked.nationalId = null;
  masked.socialInsuranceNo = null;
  masked.bankName = null;
  masked.bankAccountNumber = null;

  // Direct Manager can view salary/compensation of their team members; everyone else cannot
  if (!isDirectManager) {
    masked.baseSalary = null;
    masked.hourlyWage = null;
    masked.payBasis = null;
    masked.seniorityOffset = null;
  }

  return masked as T;
}

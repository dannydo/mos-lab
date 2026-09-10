import type { Prisma } from '../../generated/crm-client/index.js';

/**
 * The single group allowed to decide payroll adjustment cases.  Membership is
 * deliberately data-driven so the later control surface can manage it without
 * hard-coding an HR or finance role into the calculator.
 */
export const PAYROLL_ADJUSTMENT_APPROVERS_TEAM_CODE = 'PAYROLL_APPROVERS';

export async function requirePayrollAdjustmentApprover(
  crm: Pick<Prisma.TransactionClient, 'crmTeamMember'>,
  actorStaffId: number
): Promise<void> {
  const membership = await crm.crmTeamMember.findFirst({
    where: {
      crmStaffId: actorStaffId,
      isActive: true,
      team: {
        code: PAYROLL_ADJUSTMENT_APPROVERS_TEAM_CODE,
        isActive: true,
      },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new Error('Only an active Payroll Adjustment Approver can decide this case');
  }
}

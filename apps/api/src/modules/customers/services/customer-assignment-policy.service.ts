export type DurableCustomerAssignmentInput = {
  staffId: number;
  assignedBy: number;
  assignedAt: Date;
};

/**
 * Single source of truth for accepted customer ownership.
 * No clock or campaign end may silently return the customer to the pool.
 */
export function buildDurableCustomerAssignmentData(input: DurableCustomerAssignmentInput) {
  return {
    staffId: input.staffId,
    assignedBy: input.assignedBy,
    assignedAt: input.assignedAt,
    expiresAt: null,
    assignedDurationDays: null,
    isRetained: false,
  };
}

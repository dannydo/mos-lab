const DEFAULT_CUSTOMER_LIST_SORT = 'id_desc';

/**
 * A telesales "Khách hàng của tôi" queue is an operational work queue, not a
 * customer-acquisition report.  Its default must surface the most recently
 * assigned current owner first so a newly accepted allocation is actionable
 * immediately.
 */
export const resolveCustomerListSort = (
  requestedSort: string | undefined,
  isPersonalAssignmentScope: boolean
): string => {
  const sort = requestedSort || DEFAULT_CUSTOMER_LIST_SORT;
  return isPersonalAssignmentScope && sort === DEFAULT_CUSTOMER_LIST_SORT ? 'assignedAt_desc' : sort;
};

export const isAssignmentTimeSort = (sort: string): boolean => sort === 'assignedAt_desc' || sort === 'assignedAt_asc';

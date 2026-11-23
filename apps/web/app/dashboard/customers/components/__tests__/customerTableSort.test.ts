import { describe, expect, it } from 'vitest';
import {
  resolveCustomerColumnSortOrder,
  resolveCustomerTableSortField,
} from '../customer-table/customer-table-utils';

describe('customer-table server-side sort helpers', () => {
  it('maps Ant Design sorter events to backend sortField values', () => {
    expect(resolveCustomerTableSortField({ field: 'totalSpent', order: 'descend' })).toBe('totalSpent_desc');
    expect(resolveCustomerTableSortField({ field: 'totalSpent', order: 'ascend' })).toBe('totalSpent_asc');
    expect(resolveCustomerTableSortField({ field: 'daysSinceLastVisit', order: 'ascend' })).toBe(
      'daysSinceLastVisit_asc'
    );
    expect(resolveCustomerTableSortField({ columnKey: 'name', order: 'ascend' })).toBe('name_asc');
    expect(resolveCustomerTableSortField({ field: 'name', order: undefined })).toBe('id_desc');
    expect(resolveCustomerTableSortField({ field: 'unknown', order: 'ascend' })).toBeNull();
  });

  it('derives controlled column sortOrder from server sortField', () => {
    expect(resolveCustomerColumnSortOrder('totalSpent_desc', 'totalSpent')).toBe('descend');
    expect(resolveCustomerColumnSortOrder('totalSpent_asc', 'totalSpent')).toBe('ascend');
    expect(resolveCustomerColumnSortOrder('totalSpent_desc', 'name')).toBeNull();
    expect(resolveCustomerColumnSortOrder(undefined, 'name')).toBeNull();
  });
});

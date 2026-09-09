import assert from 'node:assert/strict';
import test from 'node:test';
import { isAssignmentTimeSort, resolveCustomerListSort } from './customer-list-sort.js';

test('places a newly assigned customer first in a telesales personal queue by default', () => {
  assert.equal(resolveCustomerListSort(undefined, true), 'assignedAt_desc');
  assert.equal(resolveCustomerListSort('id_desc', true), 'assignedAt_desc');
});

test('keeps an explicit operational sort and manager default intact', () => {
  assert.equal(resolveCustomerListSort('daysSinceLastVisit_desc', true), 'daysSinceLastVisit_desc');
  assert.equal(resolveCustomerListSort('id_desc', false), 'id_desc');
});

test('recognizes only the audited current-assignment time sort', () => {
  assert.equal(isAssignmentTimeSort('assignedAt_desc'), true);
  assert.equal(isAssignmentTimeSort('assignedAt_asc'), true);
  assert.equal(isAssignmentTimeSort('id_desc'), false);
});

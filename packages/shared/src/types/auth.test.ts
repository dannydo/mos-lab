import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isCvRole, getDefaultRouteForRole } from './auth.js';

describe('Auth Role Invariants & Routing Tests', () => {
  it('should correctly identify CV roles', () => {
    // Valid CV roles
    assert.equal(isCvRole('cv'), true);
    assert.equal(isCvRole('lt'), true);
    assert.equal(isCvRole('technician'), true);
    assert.equal(isCvRole('ktv'), true);
    assert.equal(isCvRole('CV'), true);
    assert.equal(isCvRole('LT'), true);
    assert.equal(isCvRole('Technician'), true);
    assert.equal(isCvRole(' technician '), true);

    // Non-CV roles
    assert.equal(isCvRole('admin'), false);
    assert.equal(isCvRole('super_admin'), false);
    assert.equal(isCvRole('manager'), false);
    assert.equal(isCvRole('telesales'), false);
    assert.equal(isCvRole('booker'), false);
    assert.equal(isCvRole('cc'), false);
    assert.equal(isCvRole('cs'), false);
    assert.equal(isCvRole('qa_qc'), false);
    assert.equal(isCvRole(null), false);
    assert.equal(isCvRole(undefined), false);
    assert.equal(isCvRole(''), false);
  });

  it('should return /dashboard/cv for CV roles and /dashboard for others', () => {
    // CV roles -> /dashboard/cv
    assert.equal(getDefaultRouteForRole('cv'), '/dashboard/cv');
    assert.equal(getDefaultRouteForRole('lt'), '/dashboard/cv');
    assert.equal(getDefaultRouteForRole('technician'), '/dashboard/cv');
    assert.equal(getDefaultRouteForRole('ktv'), '/dashboard/cv');

    // Other roles -> /dashboard
    assert.equal(getDefaultRouteForRole('admin'), '/dashboard');
    assert.equal(getDefaultRouteForRole('super_admin'), '/dashboard');
    assert.equal(getDefaultRouteForRole('manager'), '/dashboard');
    assert.equal(getDefaultRouteForRole('telesales'), '/dashboard');
    assert.equal(getDefaultRouteForRole('cc'), '/dashboard');
    assert.equal(getDefaultRouteForRole('cs'), '/dashboard');
    assert.equal(getDefaultRouteForRole(null), '/dashboard');
    assert.equal(getDefaultRouteForRole(undefined), '/dashboard');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { maskPhoneNumber, shouldMaskCustomerPhone } from './phone.js';

describe('Phone Masking & Invariant Tests', () => {
  it('should identify CV and facility roles that must be masked', () => {
    // CV roles
    assert.equal(shouldMaskCustomerPhone('cv'), true);
    assert.equal(shouldMaskCustomerPhone('lt'), true);
    assert.equal(shouldMaskCustomerPhone('technician'), true);
    assert.equal(shouldMaskCustomerPhone('ktv'), true);
    assert.equal(shouldMaskCustomerPhone('CV'), true);
    assert.equal(shouldMaskCustomerPhone('Technician '), true);

    // Facility support roles
    assert.equal(shouldMaskCustomerPhone('security-guard'), true);
    assert.equal(shouldMaskCustomerPhone('office-cleaner'), true);
    assert.equal(shouldMaskCustomerPhone('teacher'), true);
    assert.equal(shouldMaskCustomerPhone('trainee'), true);
    assert.equal(shouldMaskCustomerPhone('intern'), true);

    // Only Admin / SuperAdmin are allowed to see full customer phones
    assert.equal(shouldMaskCustomerPhone('admin'), false);
    assert.equal(shouldMaskCustomerPhone('super_admin'), false);
    assert.equal(shouldMaskCustomerPhone('superadmin'), false);

    // All other roles must be masked
    assert.equal(shouldMaskCustomerPhone('boss'), true);
    assert.equal(shouldMaskCustomerPhone('manager'), true);
    assert.equal(shouldMaskCustomerPhone('telesales'), true);
    assert.equal(shouldMaskCustomerPhone('booker'), true);
    assert.equal(shouldMaskCustomerPhone('cc'), true);
    assert.equal(shouldMaskCustomerPhone('oc'), true);
    assert.equal(shouldMaskCustomerPhone(null), true);
    assert.equal(shouldMaskCustomerPhone(undefined), true);
  });

  it('should mask phone numbers into XXXX123456 format (showing last 6 digits)', () => {
    assert.equal(maskPhoneNumber('0948676769'), 'XXXX676769');
    assert.equal(maskPhoneNumber('0937699172'), 'XXXX699172');
    assert.equal(maskPhoneNumber('0902397180'), 'XXXX397180');
    assert.equal(maskPhoneNumber('0819799131'), 'XXXX799131');
    assert.equal(maskPhoneNumber('0978.665.606'), 'XXXX665606');
    assert.equal(maskPhoneNumber('0933.779.207'), 'XXXX779207');
  });

  it('should mask 11-digit numbers properly', () => {
    assert.equal(maskPhoneNumber('00948676769'), 'XXXX676769');
  });

  it('should mask formatted numbers with spaces or dashes', () => {
    assert.equal(maskPhoneNumber('0948 676 769'), 'XXXX676769');
    assert.equal(maskPhoneNumber('0948-676-769'), 'XXXX676769');
    assert.equal(maskPhoneNumber('+84948676769'), 'XXXX676769');
  });

  it('should not double-mask if already masked', () => {
    assert.equal(maskPhoneNumber('XXXX676769'), 'XXXX676769');
    assert.equal(maskPhoneNumber('XXXX******'), 'XXXX******');
  });

  it('should handle placeholders and empty inputs gracefully', () => {
    assert.equal(maskPhoneNumber(''), '');
    assert.equal(maskPhoneNumber(null), '');
    assert.equal(maskPhoneNumber(undefined), '');
    assert.equal(maskPhoneNumber('-'), '-');
    assert.equal(maskPhoneNumber('Chưa có SĐT'), 'Chưa có SĐT');
  });
});

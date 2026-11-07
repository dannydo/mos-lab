import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { maskPhoneNumber, shouldMaskCustomerPhone } from '@mos-lab/shared';

describe('Customer Phone Masking Backend Tests', () => {
  it('should verify CV and facility staff roles trigger phone masking', () => {
    // All 4 variations of CV roles
    assert.equal(shouldMaskCustomerPhone('cv'), true);
    assert.equal(shouldMaskCustomerPhone('lt'), true);
    assert.equal(shouldMaskCustomerPhone('technician'), true);
    assert.equal(shouldMaskCustomerPhone('ktv'), true);

    // Facility roles
    assert.equal(shouldMaskCustomerPhone('security-guard'), true);
    assert.equal(shouldMaskCustomerPhone('office-cleaner'), true);
    assert.equal(shouldMaskCustomerPhone('teacher'), true);
    assert.equal(shouldMaskCustomerPhone('trainee'), true);
    assert.equal(shouldMaskCustomerPhone('intern'), true);

    // Case-insensitivity
    assert.equal(shouldMaskCustomerPhone('CV'), true);
    assert.equal(shouldMaskCustomerPhone('LT'), true);
    assert.equal(shouldMaskCustomerPhone('TECHNICIAN'), true);
  });

  it('should only allow admin and superadmin to view unmasked phones', () => {
    assert.equal(shouldMaskCustomerPhone('admin'), false);
    assert.equal(shouldMaskCustomerPhone('super_admin'), false);
    assert.equal(shouldMaskCustomerPhone('superadmin'), false);

    // All others masked (including boss, manager, telesales, etc.)
    assert.equal(shouldMaskCustomerPhone('boss'), true);
    assert.equal(shouldMaskCustomerPhone('manager'), true);
    assert.equal(shouldMaskCustomerPhone('telesales'), true);
    assert.equal(shouldMaskCustomerPhone('booker'), true);
    assert.equal(shouldMaskCustomerPhone('cc'), true);
    assert.equal(shouldMaskCustomerPhone('oc'), true);
    assert.equal(shouldMaskCustomerPhone('ht'), true);
    assert.equal(shouldMaskCustomerPhone('cs'), true);
  });

  it('should mask phone numbers consistently with XXXX123456 (show last 6 digits)', () => {
    assert.equal(maskPhoneNumber('00948676769'), 'XXXX676769');
    assert.equal(maskPhoneNumber('0948676769'), 'XXXX676769');
    assert.equal(maskPhoneNumber('0937699172'), 'XXXX699172');
    assert.equal(maskPhoneNumber('0902397180'), 'XXXX397180');
    assert.equal(maskPhoneNumber('0819799131'), 'XXXX799131');
    assert.equal(maskPhoneNumber('0978.665.606'), 'XXXX665606');
    assert.equal(maskPhoneNumber('0933.779.207'), 'XXXX779207');
  });

  it('should not re-mask an already masked phone', () => {
    const masked = maskPhoneNumber('0948676769');
    assert.equal(masked, 'XXXX676769');
    assert.equal(maskPhoneNumber(masked), 'XXXX676769');
  });
});

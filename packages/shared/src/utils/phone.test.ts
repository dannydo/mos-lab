import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { maskPhoneNumber, shouldMaskCustomerPhone, CV_AND_FACILITY_ROLES } from './phone.js';

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

    // Roles allowed to see customer phones (unmasked)
    assert.equal(shouldMaskCustomerPhone('admin'), false);
    assert.equal(shouldMaskCustomerPhone('super_admin'), false);
    assert.equal(shouldMaskCustomerPhone('manager'), false);
    assert.equal(shouldMaskCustomerPhone('telesales'), false);
    assert.equal(shouldMaskCustomerPhone('booker'), false);
    assert.equal(shouldMaskCustomerPhone('cc'), false);
    assert.equal(shouldMaskCustomerPhone('oc'), false);
    assert.equal(shouldMaskCustomerPhone(null), false);
    assert.equal(shouldMaskCustomerPhone(undefined), false);
  });

  it('should mask 10-digit phone numbers into 0948***769 format', () => {
    assert.equal(maskPhoneNumber('0948676769'), '0948***769');
    assert.equal(maskPhoneNumber('0937699172'), '0937***172');
    assert.equal(maskPhoneNumber('0902397180'), '0902***180');
    assert.equal(maskPhoneNumber('0819799131'), '0819***131');
  });

  it('should mask 11-digit numbers properly', () => {
    assert.equal(maskPhoneNumber('00948676769'), '0094***769');
  });

  it('should mask formatted numbers with spaces or dashes', () => {
    assert.equal(maskPhoneNumber('0948 676 769'), '0948***769');
    assert.equal(maskPhoneNumber('0948-676-769'), '0948***769');
    assert.equal(maskPhoneNumber('+84948676769'), '8494***769');
  });

  it('should not double-mask if already masked', () => {
    assert.equal(maskPhoneNumber('0948***769'), '0948***769');
    assert.equal(maskPhoneNumber('***'), '***');
  });

  it('should handle placeholders and empty inputs gracefully', () => {
    assert.equal(maskPhoneNumber(''), '');
    assert.equal(maskPhoneNumber(null), '');
    assert.equal(maskPhoneNumber(undefined), '');
    assert.equal(maskPhoneNumber('-'), '-');
    assert.equal(maskPhoneNumber('Chưa có SĐT'), 'Chưa có SĐT');
  });
});

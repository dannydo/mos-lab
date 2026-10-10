import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { maskPhoneNumber, shouldMaskCustomerPhone, CV_AND_FACILITY_ROLES } from '@mos-lab/shared';

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

  it('should allow sales and management roles to view unmasked phones', () => {
    assert.equal(shouldMaskCustomerPhone('admin'), false);
    assert.equal(shouldMaskCustomerPhone('super_admin'), false);
    assert.equal(shouldMaskCustomerPhone('manager'), false);
    assert.equal(shouldMaskCustomerPhone('telesales'), false);
    assert.equal(shouldMaskCustomerPhone('booker'), false);
    assert.equal(shouldMaskCustomerPhone('cc'), false);
    assert.equal(shouldMaskCustomerPhone('oc'), false);
    assert.equal(shouldMaskCustomerPhone('ht'), false);
    assert.equal(shouldMaskCustomerPhone('cs'), false);
  });

  it('should mask phone numbers consistently', () => {
    assert.equal(maskPhoneNumber('00948676769'), '0094***769');
    assert.equal(maskPhoneNumber('0948676769'), '0948***769');
    assert.equal(maskPhoneNumber('0937699172'), '0937***172');
    assert.equal(maskPhoneNumber('0902397180'), '0902***180');
    assert.equal(maskPhoneNumber('0819799131'), '0819***131');
  });

  it('should not re-mask an already masked phone', () => {
    const masked = maskPhoneNumber('0948676769');
    assert.equal(masked, '0948***769');
    assert.equal(maskPhoneNumber(masked), '0948***769');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { maskPhoneNumber, shouldMaskCustomerPhone, canViewUnmaskedCustomerPhone } from '@mos-lab/shared';

describe('Customer Phone Masking Backend Tests', () => {
  it('should verify CV and facility staff roles trigger phone masking', () => {
    // All variations of CV roles
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

  it('should allow admin, superadmin, and BK_Telesales to view unmasked phones', () => {
    assert.equal(shouldMaskCustomerPhone('admin'), false);
    assert.equal(shouldMaskCustomerPhone('super_admin'), false);
    assert.equal(shouldMaskCustomerPhone('superadmin'), false);

    // BK_Telesales team allowed to see full customer phone
    assert.equal(shouldMaskCustomerPhone('telesales'), false);
    assert.equal(shouldMaskCustomerPhone('telesale'), false);
    assert.equal(shouldMaskCustomerPhone('booker'), false);
    assert.equal(shouldMaskCustomerPhone('bk'), false);
    assert.equal(shouldMaskCustomerPhone('bk_telesales'), false);
    assert.equal(shouldMaskCustomerPhone('BK_TELESALES'), false);

    assert.equal(canViewUnmaskedCustomerPhone('telesales'), true);
    assert.equal(canViewUnmaskedCustomerPhone('BK_TELESALES'), true);
    assert.equal(canViewUnmaskedCustomerPhone('admin'), true);

    // All others masked (including boss, manager, cc, etc.)
    assert.equal(shouldMaskCustomerPhone('boss'), true);
    assert.equal(shouldMaskCustomerPhone('manager'), true);
    assert.equal(shouldMaskCustomerPhone('cc'), true);
    assert.equal(shouldMaskCustomerPhone('oc'), true);
    assert.equal(shouldMaskCustomerPhone('ht'), true);
    assert.equal(shouldMaskCustomerPhone('cs'), true);
  });

  it('should mask phone numbers consistently with **** 123456 (show last 6 digits)', () => {
    assert.equal(maskPhoneNumber('00948676769'), '**** 676769');
    assert.equal(maskPhoneNumber('0948676769'), '**** 676769');
    assert.equal(maskPhoneNumber('0937699172'), '**** 699172');
    assert.equal(maskPhoneNumber('0902397180'), '**** 397180');
    assert.equal(maskPhoneNumber('0819799131'), '**** 799131');
    assert.equal(maskPhoneNumber('0978.665.606'), '**** 665606');
    assert.equal(maskPhoneNumber('0933.779.207'), '**** 779207');
  });

  it('should normalize and not corrupt already masked phones', () => {
    const masked = maskPhoneNumber('0948676769');
    assert.equal(masked, '**** 676769');
    assert.equal(maskPhoneNumber(masked), '**** 676769');
    assert.equal(maskPhoneNumber('XXXX676769'), '**** 676769');
  });
});

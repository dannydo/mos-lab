import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCustomerBirthdayThisMonthStatus, normalizeCustomerDateOfBirth } from './ios-birthday.js';

describe('iOS Customer Birthday Helpers', () => {
  it('normalizes valid YYYY-MM-DD and DD/MM/YYYY strings while filtering legacy placeholders', () => {
    assert.equal(normalizeCustomerDateOfBirth(null), null);
    assert.equal(normalizeCustomerDateOfBirth(''), null);
    assert.equal(normalizeCustomerDateOfBirth('0000-00-00'), null);
    assert.equal(normalizeCustomerDateOfBirth('1970-01-01'), null);
    assert.equal(normalizeCustomerDateOfBirth('1970-01-01T00:00:00.000Z'), null);
    assert.equal(normalizeCustomerDateOfBirth('1994-11-05'), '1994-11-05');
    assert.equal(normalizeCustomerDateOfBirth('1994-11-05T00:00:00.000Z'), '1994-11-05');
    assert.equal(normalizeCustomerDateOfBirth('05/11/1994'), '1994-11-05');
  });

  it('detects birthday in current month and exact birthday today in Vietnam timezone', () => {
    const nov21Vn = new Date('2026-11-21T13:30:00+07:00');

    const sameDay = getCustomerBirthdayThisMonthStatus('1992-11-21', nov21Vn);
    assert.equal(sameDay.isBirthdayThisMonth, true);
    assert.equal(sameDay.isBirthdayToday, true);
    assert.equal(sameDay.day, '21');
    assert.equal(sameDay.ddMm, '21/11');
    assert.equal(sameDay.ddMmYyyy, '21/11/1992');

    const sameMonthOtherDay = getCustomerBirthdayThisMonthStatus('1998-11-05', nov21Vn);
    assert.equal(sameMonthOtherDay.isBirthdayThisMonth, true);
    assert.equal(sameMonthOtherDay.isBirthdayToday, false);
    assert.equal(sameMonthOtherDay.day, '05');
    assert.equal(sameMonthOtherDay.ddMm, '05/11');

    const otherMonth = getCustomerBirthdayThisMonthStatus('1998-10-21', nov21Vn);
    assert.equal(otherMonth.isBirthdayThisMonth, false);
    assert.equal(otherMonth.isBirthdayToday, false);
    assert.equal(otherMonth.day, '');
    assert.equal(otherMonth.ddMm, '21/10');
  });
});

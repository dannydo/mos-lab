import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateStaffSeniority, TELESALES_EXECUTIVE_STANDARDS } from '@mos-lab/shared';
import { maskStaffSensitiveData } from './routes.js';

test('calculateStaffSeniority calculates elapsed months and applies seniorityOffset', () => {
  // Join 14 months ago + 3 months offset = 17 months (1 year 5 months)
  const asOfDate = new Date('2026-09-01T00:00:00Z');
  const joinedAt = new Date('2025-07-01T00:00:00Z');
  const result = calculateStaffSeniority(joinedAt, 3, asOfDate);

  assert.equal(result.calculatedMonths, 14);
  assert.equal(result.offsetMonths, 3);
  assert.equal(result.totalMonths, 17);
  assert.equal(result.years, 1);
  assert.equal(result.remainingMonths, 5);
  assert.equal(result.displayFormatted, '1 năm 5 tháng');
  assert.equal(result.isDaysOnly, false);
});

test('calculateStaffSeniority handles staff joined less than a month ago', () => {
  const asOfDate = new Date('2026-09-20T00:00:00Z');
  const joinedAt = new Date('2026-09-05T00:00:00Z');
  const result = calculateStaffSeniority(joinedAt, 0, asOfDate);

  assert.equal(result.calculatedMonths, 0);
  assert.equal(result.totalMonths, 0);
  assert.equal(result.days, 15);
  assert.equal(result.displayFormatted, '15 ngày');
  assert.equal(result.isDaysOnly, true);
});

test('calculateStaffSeniority handles null or missing joinedAt', () => {
  const result = calculateStaffSeniority(null, 5);
  assert.equal(result.calculatedMonths, 0);
  assert.equal(result.offsetMonths, 5);
  assert.equal(result.totalMonths, 5);
  assert.equal(result.displayFormatted, '5 tháng');
});

test('maskStaffSensitiveData allows full visibility for HR and Admin', () => {
  const mockStaff = {
    id: 10,
    displayName: 'Nguyễn Văn A',
    nationalId: '079201009999',
    socialInsuranceNo: '7920100999',
    bankName: 'Vietcombank',
    bankAccountNumber: '9988776655',
    baseSalary: 5500000,
    hourlyWage: null,
    payBasis: 'MONTHLY',
    seniorityOffset: 2,
  };

  const hrView = maskStaffSensitiveData(mockStaff, { id: 99, role: 'hr' });
  assert.equal(hrView.nationalId, '079201009999');
  assert.equal(hrView.socialInsuranceNo, '7920100999');
  assert.equal(hrView.bankName, 'Vietcombank');
  assert.equal(hrView.bankAccountNumber, '9988776655');
  assert.equal(hrView.baseSalary, 5500000);

  const adminView = maskStaffSensitiveData(mockStaff, { id: 1, role: 'admin' });
  assert.equal(adminView.nationalId, '079201009999');
  assert.equal(adminView.baseSalary, 5500000);
});

test('maskStaffSensitiveData allows staff to view their own full record', () => {
  const mockStaff = {
    id: 10,
    displayName: 'Nguyễn Văn A',
    nationalId: '079201009999',
    socialInsuranceNo: '7920100999',
    bankName: 'Vietcombank',
    bankAccountNumber: '9988776655',
    baseSalary: 5500000,
    hourlyWage: null,
    payBasis: 'MONTHLY',
    seniorityOffset: 2,
  };

  const selfView = maskStaffSensitiveData(mockStaff, { id: 10, role: 'telesales' });
  assert.equal(selfView.nationalId, '079201009999');
  assert.equal(selfView.bankAccountNumber, '9988776655');
  assert.equal(selfView.baseSalary, 5500000);
});

test('maskStaffSensitiveData permits Direct Manager to view salary but MASKS legal and payment info', () => {
  const mockStaff = {
    id: 10,
    displayName: 'Nguyễn Văn A',
    nationalId: '079201009999',
    socialInsuranceNo: '7920100999',
    bankName: 'Vietcombank',
    bankAccountNumber: '9988776655',
    baseSalary: 5500000,
    hourlyWage: null,
    payBasis: 'MONTHLY',
    seniorityOffset: 2,
  };

  const managedIds = new Set([10, 11, 12]);
  const managerView = maskStaffSensitiveData(mockStaff, { id: 5, role: 'manager' }, managedIds);

  // Manager CAN view salary of their team members
  assert.equal(managerView.baseSalary, 5500000);
  assert.equal(managerView.payBasis, 'MONTHLY');
  assert.equal(managerView.seniorityOffset, 2);

  // Manager CANNOT view CCCD, BHXH, Bank info
  assert.equal(managerView.nationalId, null);
  assert.equal(managerView.socialInsuranceNo, null);
  assert.equal(managerView.bankName, null);
  assert.equal(managerView.bankAccountNumber, null);
});

test('maskStaffSensitiveData masks ALL sensitive info for non-manager colleagues', () => {
  const mockStaff = {
    id: 10,
    displayName: 'Nguyễn Văn A',
    nationalId: '079201009999',
    socialInsuranceNo: '7920100999',
    bankName: 'Vietcombank',
    bankAccountNumber: '9988776655',
    baseSalary: 5500000,
    hourlyWage: null,
    payBasis: 'MONTHLY',
    seniorityOffset: 2,
  };

  const colleagueView = maskStaffSensitiveData(mockStaff, { id: 20, role: 'telesales' });

  assert.equal(colleagueView.nationalId, null);
  assert.equal(colleagueView.socialInsuranceNo, null);
  assert.equal(colleagueView.bankName, null);
  assert.equal(colleagueView.bankAccountNumber, null);
  assert.equal(colleagueView.baseSalary, null);
  assert.equal(colleagueView.hourlyWage, null);
  assert.equal(colleagueView.payBasis, null);
  assert.equal(colleagueView.seniorityOffset, null);
});

test('TELESALES_EXECUTIVE_STANDARDS conforms to canonical role specification', () => {
  assert.equal(TELESALES_EXECUTIVE_STANDARDS.roleKey, 'telesales');
  assert.equal(TELESALES_EXECUTIVE_STANDARDS.schedule.workingHours, '08:00 – 17:00');
  assert.equal(TELESALES_EXECUTIVE_STANDARDS.schedule.fixedOffDay, 'Chủ Nhật (Sunday)');
  assert.equal(TELESALES_EXECUTIVE_STANDARDS.schedule.fixedOffWeekday, 7);
  assert.equal(TELESALES_EXECUTIVE_STANDARDS.dailyKpi.totalCalls, 83);
  assert.equal(TELESALES_EXECUTIVE_STANDARDS.dailyKpi.answeredCalls, 25);
  assert.equal(TELESALES_EXECUTIVE_STANDARDS.dailyKpi.happyCalls, 20);
  assert.equal(TELESALES_EXECUTIVE_STANDARDS.dailyKpi.bookings, 5);
  assert.equal(TELESALES_EXECUTIVE_STANDARDS.monthlyKpi.minDone, 100);
  assert.equal(TELESALES_EXECUTIVE_STANDARDS.monthlyKpi.excellentDone, 300);
  assert.equal(TELESALES_EXECUTIVE_STANDARDS.compensation.baseSalary, 5500000);
});

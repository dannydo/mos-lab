import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessIosConsultationApp, normalizeCvFeatherRole, formatComboName } from '@mos-lab/shared';

test('iOS Consultation App Auth & Role Guards', () => {
  // CVL (cv_plus) must have access
  assert.equal(canAccessIosConsultationApp('cv_plus'), true);
  assert.equal(canAccessIosConsultationApp('cvl'), true);
  assert.equal(canAccessIosConsultationApp('CVL'), true);

  // CVLL must have access
  assert.equal(canAccessIosConsultationApp('cvll'), true);
  assert.equal(canAccessIosConsultationApp('cv_plus_plus'), true);

  // CC must have access
  assert.equal(canAccessIosConsultationApp('cc'), true);

  // Admin / Super Admin must have access
  assert.equal(canAccessIosConsultationApp('admin'), true);
  assert.equal(canAccessIosConsultationApp('super_admin'), true);

  // Standard CV (technician) and other staff must NOT have access
  assert.equal(canAccessIosConsultationApp('cv'), false);
  assert.equal(canAccessIosConsultationApp('technician'), false);
  assert.equal(canAccessIosConsultationApp('telesales'), false);
  assert.equal(canAccessIosConsultationApp('manager'), false);
});

test('CV Feather Role Normalization', () => {
  assert.equal(normalizeCvFeatherRole('cv_plus'), 'CVL');
  assert.equal(normalizeCvFeatherRole('cvl'), 'CVL');
  assert.equal(normalizeCvFeatherRole('CVL'), 'CVL');
  assert.equal(normalizeCvFeatherRole('cv_plus_plus'), 'CVLL');
  assert.equal(normalizeCvFeatherRole('cvll'), 'CVLL');
});

test('Combo Name Formatting', () => {
  const formatted = formatComboName('Gói Combo Mi', '4+1-hyperlight-770');
  assert.ok(formatted.includes('HyperLight') || formatted.includes('Combo'));
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeStaffDirectory, type DirectoryStaff } from './staff-directory.service.js';

const ktv = (id: number, name: string): DirectoryStaff => ({
  id,
  username: `ktv_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
  displayName: name,
  role: 'technician',
  notes: 'Estella Place',
  offDays: ['1'],
});

const crm = (id: number, name: string, role: string, legacyStaffId: number | null): DirectoryStaff => ({
  id,
  username: `${name}@x.com`,
  displayName: name,
  role,
  legacyStaffId,
});

test('telesales account sharing a legacy KTV id keeps its mOS role, id and username', () => {
  const result = mergeStaffDirectory([crm(79, 'Ngọc Huyền', 'telesales', 52853)], [ktv(52853, 'Ngọc Huyền')]);
  assert.equal(result.length, 1);
  assert.equal(result[0].role, 'telesales');
  assert.equal(result[0].id, 79);
  assert.equal(result[0].username, 'Ngọc Huyền@x.com');
  assert.equal(result[0].legacyStaffId, 52853);
  // KTV-only attributes are preserved
  assert.deepEqual(result[0].offDays, ['1']);
});

test('a different KTV with the same display name never swallows a telesales account', () => {
  const result = mergeStaffDirectory([crm(79, 'Ngọc Huyền', 'telesales', 52853)], [ktv(42076, 'Ngọc Huyền')]);
  assert.equal(result.length, 2);
  assert.equal(result.find((s) => s.id === 79)?.role, 'telesales');
  assert.equal(result.find((s) => s.id === 42076)?.role, 'technician');
});

test('CV/technician mOS staff linked to the same legacy id keep the legacy KTV record (historical behaviour)', () => {
  const result = mergeStaffDirectory([crm(11, 'Cẩm Tiên', 'cv', 3000)], [ktv(3000, 'Cẩm Tiên')]);
  assert.equal(result.length, 1);
  assert.equal(result[0].role, 'technician');
  assert.equal(result[0].id, 3000);
  assert.equal(result[0].legacyStaffId, 3000);
});

test('CV mOS staff without a legacy id still falls back to a same-name KTV', () => {
  const result = mergeStaffDirectory([crm(12, 'Kim Ngân', 'cv', null)], [ktv(3100, 'kim ngân ')]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 3100);
  assert.equal(result[0].role, 'technician');
});

test('non-CV mOS staff without a legacy id is never merged by name', () => {
  const result = mergeStaffDirectory([crm(13, 'Thanh Nhi', 'telesales', null)], [ktv(3200, 'Thanh Nhi')]);
  assert.equal(result.length, 2);
  assert.equal(result.find((s) => s.id === 13)?.role, 'telesales');
});

test('two mOS staff with the same name stay separate', () => {
  const result = mergeStaffDirectory([crm(21, 'Ngọc Huyền', 'telesales', 100), crm(22, 'Ngọc Huyền', 'cc', 101)], []);
  assert.deepEqual(
    result.map((s) => s.id),
    [21, 22]
  );
});

test('a KTV matched twice is merged once; the second mOS record stays separate', () => {
  const result = mergeStaffDirectory([crm(31, 'A', 'telesales', 500), crm(32, 'A2', 'admin', 500)], [ktv(500, 'A')]);
  assert.equal(result.length, 2);
  assert.equal(result.find((s) => s.id === 31)?.role, 'telesales');
  assert.equal(result.find((s) => s.id === 32)?.role, 'admin');
});

test('KTV slots come first, mOS-only staff follow; unmatched KTVs are kept', () => {
  const result = mergeStaffDirectory(
    [crm(41, 'Admin One', 'admin', 900), crm(42, 'Telesales Two', 'telesales', 901)],
    [ktv(7, 'Tech Seven'), ktv(901, 'Telesales Two')]
  );
  assert.deepEqual(
    result.map((s) => s.id),
    [7, 42, 41]
  );
});

test('duplicate accounts of one person (same name, role, legacy id) collapse, first wins', () => {
  const result = mergeStaffDirectory([crm(13, 'Bảo Hân', 'admin', 43554), crm(21, 'Bảo Hân', 'admin', 43554)], []);
  assert.deepEqual(
    result.map((s) => s.id),
    [13]
  );
});

test('same name and role collapse when one record has no legacy id; different legacy ids do not', () => {
  const collapsed = mergeStaffDirectory(
    [crm(1, 'Danny Do', 'super_admin', 86), crm(69, 'Danny Do', 'super_admin', null)],
    []
  );
  assert.deepEqual(
    collapsed.map((s) => s.id),
    [1]
  );
  const distinct = mergeStaffDirectory(
    [crm(1, 'Ngọc Huyền', 'telesales', 100), crm(2, 'Ngọc Huyền', 'telesales', 200)],
    []
  );
  assert.deepEqual(
    distinct.map((s) => s.id),
    [1, 2]
  );
});

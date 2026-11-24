import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MosChatStaffMember } from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import { projectStaffDirectoryForCaller } from './routes/bootstrap.routes.js';

describe('Chat Staff Directory Phone RBAC Projection', () => {
  const directory: MosChatStaffMember[] = [
    {
      id: 1,
      username: 'danny.do@wingslashes.com',
      displayName: 'Danny Do',
      role: 'super_admin',
      phone: '0901111111',
      departmentCodes: ['BACK_OFFICE'],
    },
    {
      id: 2,
      username: 'baohan@wingslashes.com',
      displayName: 'Bảo Hân',
      role: 'admin',
      phone: '0909888777',
      departmentCodes: ['BACK_OFFICE'],
    },
    {
      id: 3,
      username: 'telesale1@wingslashes.com',
      displayName: 'Telesales 1',
      role: 'telesales',
      phone: '0912345678',
      departmentCodes: ['GROWTH'],
    },
    {
      id: 4,
      username: 'growthmember@wingslashes.com',
      displayName: 'Growth Staff',
      role: 'staff',
      phone: '0987654321',
      departmentCodes: ['GROWTH'],
    },
    {
      id: 5,
      username: 'cv1@wingslashes.com',
      displayName: 'Chuyên Viên 1',
      role: 'cv',
      phone: '0933444555',
      departmentCodes: ['SHOP'],
    },
  ];

  it('retains staff phone numbers for Super Admin, Admin, Telesales, Booker, and GROWTH department members', () => {
    const callers: JwtUserPayload[] = [
      { id: 1, username: 'danny', displayName: 'Danny Do', role: 'super_admin' },
      { id: 2, username: 'baohan@wingslashes.com', displayName: 'Bảo Hân', role: 'admin' },
      { id: 3, username: 'telesale1@wingslashes.com', displayName: 'Telesales 1', role: 'telesales' },
      {
        id: 99,
        username: 'booker1@wingslashes.com',
        displayName: 'Booker 1',
        role: 'booker' as JwtUserPayload['role'],
      },
      {
        id: 4,
        username: 'growthmember@wingslashes.com',
        displayName: 'Growth Staff',
        role: 'staff' as JwtUserPayload['role'],
      },
    ];

    for (const caller of callers) {
      const projected = projectStaffDirectoryForCaller(caller, directory);
      assert.strictEqual(projected[1].phone, '0909888777');
      assert.strictEqual(projected[4].phone, '0933444555');
    }
  });

  it('strips staff phone numbers for non-OmiCall roles such as CV and CC', () => {
    const nonOmiCallCallers: JwtUserPayload[] = [
      { id: 5, username: 'cv1@wingslashes.com', displayName: 'Chuyên Viên 1', role: 'cv' as JwtUserPayload['role'] },
      { id: 6, username: 'cc1@wingslashes.com', displayName: 'Tư Vấn CC', role: 'cc' },
      undefined as unknown as JwtUserPayload,
    ];

    for (const caller of nonOmiCallCallers) {
      const projected = projectStaffDirectoryForCaller(caller, directory);
      for (const member of projected) {
        assert.strictEqual('phone' in member, false);
      }
    }
  });
});

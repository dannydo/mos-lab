import { describe, expect, it } from 'vitest';
import { getSidebarGroups } from '../sidebar.config';

describe('Sidebar Configuration CV Invariants', () => {
  const cvRoles = ['cv', 'lt', 'technician', 'ktv'];

  it.each(cvRoles)('should hide dashboard and keep cv report for CV role: %s', (role) => {
    const groups = getSidebarGroups(role);
    const allItems = groups.flatMap((g) => g.items);

    // CV must never see dashboard
    const hasDashboard = allItems.some((item) => item.key === 'dashboard');
    expect(hasDashboard).toBe(false);

    // CV must see CV report
    const hasCvReport = allItems.some((item) => item.key === 'cv');
    expect(hasCvReport).toBe(true);
  });

  it('should show dashboard for admin and manager roles', () => {
    const adminGroups = getSidebarGroups('admin');
    const adminItems = adminGroups.flatMap((g) => g.items);
    expect(adminItems.some((item) => item.key === 'dashboard')).toBe(true);

    const managerGroups = getSidebarGroups('manager');
    const managerItems = managerGroups.flatMap((g) => g.items);
    expect(managerItems.some((item) => item.key === 'dashboard')).toBe(true);
  });
});

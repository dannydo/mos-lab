import { describe, expect, it } from 'vitest';
import { getSidebarGroups } from '../sidebar.config';

describe('Sidebar Configuration CV Invariants', () => {
  const cvRoles = ['cv', 'lt', 'technician', 'ktv'];

  it.each(cvRoles)('should hide dashboard, CRM customer list, and telesales for CV role: %s', (role) => {
    const groups = getSidebarGroups(role);
    const allItems = groups.flatMap((g) => g.items);
    const allItemKeys = new Set<string>();

    const collectKeys = (items: typeof allItems) => {
      for (const item of items) {
        allItemKeys.add(item.key);
        if (item.children) {
          collectKeys(item.children);
        }
      }
    };
    collectKeys(allItems);

    // CV must never see management dashboard
    expect(allItemKeys.has('dashboard')).toBe(false);

    // CV must never see customer CRM or campaigns
    expect(allItemKeys.has('customers-parent')).toBe(false);
    expect(allItemKeys.has('customers-all')).toBe(false);
    expect(allItemKeys.has('my-customers')).toBe(false);
    expect(allItemKeys.has('referrals')).toBe(false);
    expect(allItemKeys.has('nyc-parent')).toBe(false);
    expect(allItemKeys.has('loca')).toBe(false);
    expect(allItemKeys.has('cs-hub')).toBe(false);

    // CV must never see telesales call operations
    expect(allItemKeys.has('plans')).toBe(false);
    expect(allItemKeys.has('calls')).toBe(false);
    expect(allItemKeys.has('omicall')).toBe(false);
    expect(allItemKeys.has('telesale-target')).toBe(false);
    expect(allItemKeys.has('telesale-competency')).toBe(false);

    // CV must never see other role reports
    expect(allItemKeys.has('kpi')).toBe(false);
    expect(allItemKeys.has('cc')).toBe(false);
    expect(allItemKeys.has('bk')).toBe(false);
    expect(allItemKeys.has('cs')).toBe(false);

    // CV must see CV report
    expect(allItemKeys.has('cv')).toBe(true);
  });

  it('should show dashboard and customer list for admin and manager roles', () => {
    const adminGroups = getSidebarGroups('admin');
    const adminItems = adminGroups.flatMap((g) => g.items);
    expect(adminItems.some((item) => item.key === 'dashboard')).toBe(true);
    expect(adminItems.some((item) => item.key === 'customers-parent')).toBe(true);

    const managerGroups = getSidebarGroups('manager');
    const managerItems = managerGroups.flatMap((g) => g.items);
    expect(managerItems.some((item) => item.key === 'dashboard')).toBe(true);
    expect(managerItems.some((item) => item.key === 'customers-parent')).toBe(true);
  });
});

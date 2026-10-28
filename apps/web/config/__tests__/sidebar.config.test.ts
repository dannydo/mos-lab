import { describe, expect, it } from 'vitest';
import { getSidebarGroups, getSelectedMenuKey } from '../sidebar.config';

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

    // CV must see ONLY cv and career-path (inside labs-parent) by default
    expect(allItemKeys.has('cv')).toBe(true);
    expect(allItemKeys.has('career-path')).toBe(true);
    expect([...allItemKeys].sort()).toEqual(['career-path', 'cv', 'labs-parent']);
  });

  it('should allow CV to see an additional item only when explicitly unlocked via menuVisibility', () => {
    const groups = getSidebarGroups('cv', [], true, {}, [], false, {
      cv: true,
      'career-path': true,
      'schedule-calendar': true,
      'bug-reports': false,
    });
    const allItems = groups.flatMap((g) => g.items);
    const allItemKeys = new Set<string>();
    const collectKeys = (items: typeof allItems) => {
      for (const item of items) {
        allItemKeys.add(item.key);
        if (item.children) collectKeys(item.children);
      }
    };
    collectKeys(allItems);
    expect(allItemKeys.has('cv')).toBe(true);
    expect(allItemKeys.has('career-path')).toBe(true);
    expect(allItemKeys.has('schedule-calendar')).toBe(true);
    expect(allItemKeys.has('bug-reports')).toBe(false);
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

  it('should configure internal funds under finance group with parent Quỹ Hoạt Động Nội Bộ and child Quản lý Quỹ (MOS-BUG-174)', () => {
    const adminGroups = getSidebarGroups('admin');
    const financeGroup = adminGroups.find((g) => g.groupKey === 'grp-finance');
    expect(financeGroup).toBeDefined();

    const fundsParent = financeGroup?.items.find((item) => item.key === 'finance-funds-parent');
    expect(fundsParent).toBeDefined();
    expect(fundsParent?.label).toBe('Quỹ Hoạt Động Nội Bộ');
    expect(fundsParent?.children).toBeDefined();
    expect(fundsParent?.children?.length).toBe(1);

    const fundsManage = fundsParent?.children?.[0];
    expect(fundsManage?.key).toBe('finance-funds-manage');
    expect(fundsManage?.label).toBe('Quản lý Quỹ');
    expect(fundsManage?.path).toBe('/dashboard/funds');

    expect(getSelectedMenuKey('/dashboard/funds')).toBe('finance-funds-manage');
  });

  it('should render dynamic fund items under Quỹ Hoạt Động Nội Bộ when active funds are provided (MOS-FEAT-177 Step 2)', () => {
    const mockFunds = [
      { id: 'fund-telesale', code: 'FUND_TELESALE', name: 'Quỹ Telesale' },
      { id: 'fund-marketing', code: 'FUND_MARKETING', name: 'Quỹ Marketing' },
    ];
    const adminGroups = getSidebarGroups(
      'admin',
      [],
      true,
      {},
      [],
      false,
      {},
      {},
      {},
      0,
      mockFunds
    );
    const financeGroup = adminGroups.find((g) => g.groupKey === 'grp-finance');
    const fundsParent = financeGroup?.items.find((item) => item.key === 'finance-funds-parent');
    expect(fundsParent?.children).toHaveLength(3);
    expect(fundsParent?.children?.[0].key).toBe('finance-fund-fund-telesale');
    expect(fundsParent?.children?.[0].label).toBe('Quỹ Telesale');
    expect(fundsParent?.children?.[1].key).toBe('finance-fund-fund-marketing');
    expect(fundsParent?.children?.[1].label).toBe('Quỹ Marketing');
    expect(fundsParent?.children?.[2].key).toBe('finance-funds-manage');
  });
});

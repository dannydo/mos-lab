import type { SafeAny } from '@mos-lab/shared';

export function getSelectedMenuKey(
  pathname: string,
  assignedStaffId?: string | null,
  academySidebarCampaigns: SafeAny[] = [],
  _activeTab?: string | null
): string {
  if (pathname === '/dashboard') return 'dashboard';
  if (pathname.includes('/dashboard/today')) return 'today';
  if (pathname.includes('/dashboard/branches') || pathname.includes('/branches')) return 'branches';
  if (pathname.includes('/dashboard/fal')) return 'fal-control-tower';
  if (pathname.includes('/dashboard/holiday-work')) return 'holiday-work';
  if (pathname.includes('/dashboard/customers')) {
    return assignedStaffId === 'me' ? 'my-customers' : 'customers-all';
  }
  if (pathname.includes('/dashboard/academy-leads/lead-manager')) return 'academy-lead-manager';
  if (pathname.includes('/dashboard/academy-leads/payments')) return 'academy-payment-management';
  if (pathname.includes('/dashboard/academy-leads/workshops')) return 'academy-workshops';
  if (pathname.startsWith('/dashboard/academy-leads/campaigns/')) {
    const slug = pathname.replace('/dashboard/academy-leads/campaigns/', '').split('/')[0];
    if (academySidebarCampaigns.some((campaign) => String(campaign?.slug || '') === slug)) {
      return `academy-campaign-${slug}`;
    }
    return 'academy-campaigns';
  }
  if (pathname.includes('/dashboard/academy-leads/campaigns')) return 'academy-campaigns';
  if (pathname.includes('/dashboard/academy-leads/instructors')) return 'academy-instructors';
  if (pathname.includes('/dashboard/academy-leads/courses')) return 'academy-courses';
  if (pathname.includes('/dashboard/academy-leads')) return 'academy-customers';
  if (pathname === '/dashboard/nyc') return 'nyc-main';
  if (pathname.includes('/dashboard/post-hub')) return 'post-hub';
  if (pathname === '/dashboard/nyc/campaigns') return 'nyc-campaigns-mgmt';
  if (pathname.startsWith('/dashboard/nyc/campaigns/')) {
    const slug = pathname.replace('/dashboard/nyc/campaigns/', '');
    return `nyc-campaign-${slug}`;
  }
  if (pathname.includes('/dashboard/nyc')) return 'nyc-parent';
  if (pathname.includes('/dashboard/loca')) return 'loca';
  if (pathname.includes('/dashboard/schedule-calendar')) return 'schedule-calendar';
  if (pathname.includes('/dashboard/appointments')) return 'my-appointments';
  if (pathname.includes('/dashboard/plans')) return 'plans';
  if (pathname.includes('/dashboard/calls')) return 'calls';
  if (pathname.includes('/dashboard/omicall')) return 'omicall';
  if (pathname.includes('/dashboard/qa-shop')) return 'qa-shop';
  if (pathname.includes('/dashboard/kpi')) return 'kpi';
  if (pathname.includes('/dashboard/labs')) return 'labs-hub';
  if (pathname.includes('/dashboard/career-path')) return 'career-path';
  if (pathname.includes('/dashboard/pilot-dark-lashes')) return 'pilot-dark-lashes';
  if (pathname.includes('/dashboard/payroll-pilot')) return 'cc-payroll-pilot';
  if (pathname.includes('/dashboard/fm-simulator')) return 'fm-simulator';
  if (pathname.includes('/dashboard/pnl-simulator')) return 'pnl-simulator';

  if (pathname.includes('/dashboard/financial-goals')) return 'financial-goals';
  if (pathname.includes('/dashboard/telesale-competency')) return 'telesale-competency';
  if (pathname.includes('/dashboard/telesale-target')) return 'telesale-target';
  if (pathname.includes('/dashboard/cc')) return 'cc';
  if (pathname.includes('/dashboard/cv')) return 'cv';
  if (pathname.includes('/dashboard/bk')) return 'bk';
  if (pathname.includes('/dashboard/staff/teams')) return 'teams';
  if (pathname.includes('/dashboard/staff/menu-access')) return 'menu-access';
  if (pathname.includes('/dashboard/staff')) return 'staff-directory';
  if (pathname.includes('/dashboard/referrals')) return 'referrals';
  if (pathname.includes('/dashboard/catalog')) return 'catalog';
  if (pathname.includes('/dashboard/architecture')) return 'architecture';
  if (pathname.includes('/dashboard/design-system')) return 'design-system';
  if (pathname.includes('/dashboard/funds')) return 'finance-funds-manage';
  if (pathname.includes('/dashboard/finance/cash-flow')) return 'finance-cash-flow';
  if (pathname.includes('/dashboard/bug-reports')) return 'bug-reports';
  if (pathname.includes('/dashboard/cskh')) return 'cs-hub';
  if (pathname.includes('/dashboard/cs')) return 'cs';
  return 'today';
}

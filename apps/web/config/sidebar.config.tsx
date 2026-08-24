import React from 'react';
import {
  ClockCircleOutlined,
  DashboardOutlined,
  TeamOutlined,
  HeartOutlined,
  CalendarOutlined,
  PhoneOutlined,
  AudioOutlined,
  BarChartOutlined,
  SolutionOutlined,
  ShopOutlined,
  ShareAltOutlined,
  BgColorsOutlined,
  CustomerServiceOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  BookOpen,
  Egg,
  GraduationCap,
  Rocket,
  Settings2,
  Target,
  UserRound,
  UserRoundCog,
  UserRoundPlus,
  UsersRound,
  WalletCards,
} from 'lucide-react';

import { canAccessLoca, isAdminOrSuperAdminRole, isSuperAdminRole, SafeAny } from '@mos-lab/shared';
import { AppIcon } from '../components/ui/AppIcon';

export interface SidebarItemConfig {
  key: string;
  label: string;
  icon?: React.ReactNode;
  path?: string;
  allowedRoles?: string[];
  children?: SidebarItemConfig[];
}

export interface SidebarGroupConfig {
  groupKey: string;
  groupTitle: string;
  items: SidebarItemConfig[];
}

export function getSidebarGroups(
  userRole: string = '',
  activeCampaigns: SafeAny[] = [],
  showCustomCampaigns: boolean = true,
  campaignVisibility: Record<string, boolean> = {},
  academySidebarCampaigns: SafeAny[] = [],
  academyAccess: boolean = false,
  menuVisibility: Record<string, boolean> = {},
  categoryVisibility: Record<string, boolean> = {}
): SidebarGroupConfig[] {
  const normalizedRole = userRole?.toLowerCase() || '';
  const isAdmin = isAdminOrSuperAdminRole(normalizedRole);
  const isSuperAdmin = isSuperAdminRole(normalizedRole);
  const isLocaAllowed = canAccessLoca(normalizedRole);
  const isCrmCategoryVisible = categoryVisibility.crm !== false;
  const isAcademyCategoryVisible = categoryVisibility.academy !== false;

  // Group 1: TRANG CHỦ
  const homeGroup: SidebarGroupConfig = {
    groupKey: 'grp-home',
    groupTitle: 'TRANG CHỦ',
    items: [
      {
        key: 'dashboard',
        label: 'Tổng quan',
        icon: <DashboardOutlined />,
        path: '/dashboard',
      },
      {
        key: 'today',
        label: 'Hôm nay',
        icon: <ClockCircleOutlined />,
        path: '/dashboard/today',
      },
      {
        key: 'schedule-calendar',
        label: 'Lịch & Công suất',
        icon: <CalendarOutlined />,
        path: '/dashboard/schedule-calendar',
      },
    ],
  };

  // Group 2: KHÁCH HÀNG & CHIẾN DỊCH
  const customerChildren: SidebarItemConfig[] = [];
  if (isAdmin) {
    customerChildren.push({
      key: 'customers-all',
      label: 'Tất cả KH',
      icon: <AppIcon icon={UsersRound} size="sm" />,
      path: '/dashboard/customers?assignedStaffId=all',
    });
  }
  customerChildren.push(
    {
      key: 'my-customers',
      label: 'KH của tôi',
      icon: <AppIcon icon={UserRound} size="sm" />,
      path: '/dashboard/customers?assignedStaffId=me',
    },
    {
      key: 'referrals',
      label: 'KH giới thiệu',
      icon: <AppIcon icon={UserRoundPlus} size="sm" />,
      path: '/dashboard/referrals',
    }
  );

  const nycChildren: SidebarItemConfig[] = [
    {
      key: 'nyc-main',
      label: 'NYC Chính',
      icon: <AppIcon icon={Target} size="sm" />,
      path: '/dashboard/nyc',
    },
  ];

  if (showCustomCampaigns && activeCampaigns && activeCampaigns.length > 0) {
    activeCampaigns.forEach((c: SafeAny) => {
      const isNotDeleted = c.status !== 'DELETED';
      const isVisible =
        isNotDeleted &&
        campaignVisibility[c.slug] !== false &&
        (c.id === undefined || campaignVisibility[String(c.id)] !== false);
      if (isVisible) {
        nycChildren.push({
          key: `nyc-campaign-${c.slug}`,
          label: c.name,
          icon: <AppIcon icon={Rocket} size="sm" className="text-emerald-500" />,
          path: `/dashboard/nyc/campaigns/${c.slug}`,
        });
      }
    });
  }

  nycChildren.push({
    key: 'nyc-campaigns-mgmt',
    label: 'Quản lý Chiến dịch',
    icon: <AppIcon icon={Settings2} size="sm" />,
    path: '/dashboard/nyc/campaigns',
  });

  const crmGroupItems: SidebarItemConfig[] = [
    {
      key: 'customers-parent',
      label: 'Khách hàng',
      icon: <TeamOutlined />,
      children: customerChildren,
    },
  ];

  if (isLocaAllowed) {
    crmGroupItems.push({
      key: 'loca',
      label: 'Chiến dịch LoCa',
      icon: <HeartOutlined />,
      path: '/dashboard/loca',
    });
  }

  crmGroupItems.push({
    key: 'nyc-parent',
    label: 'Chiến dịch NYC',
    icon: <ClockCircleOutlined />,
    children: nycChildren,
  });

  crmGroupItems.push({
    key: 'cs-hub',
    label: 'Trung Tâm CSKH',
    icon: <CustomerServiceOutlined />,
    path: '/dashboard/cs',
  });

  const academyItems: SidebarItemConfig[] = [];
  if (academyAccess) {
    const academyChildren: SidebarItemConfig[] = [
      {
        key: 'academy-customers',
        label: 'Khách hàng',
        icon: <AppIcon icon={UsersRound} size="sm" />,
        path: '/dashboard/academy-leads',
      },
      {
        key: 'academy-lead-manager',
        label: 'Lead Manager',
        icon: <AppIcon icon={GraduationCap} size="sm" />,
        path: '/dashboard/academy-leads/lead-manager',
      },
      {
        key: 'academy-campaigns',
        label: 'Chiến dịch',
        icon: <AppIcon icon={Rocket} size="sm" />,
        path: '/dashboard/academy-leads/campaigns',
      },
    ];

    academySidebarCampaigns.forEach((campaign: SafeAny) => {
      const slug = String(campaign?.slug || '').trim();
      const name = String(campaign?.name || '').trim();
      if (!slug || !name) return;
      academyChildren.push({
        key: `academy-campaign-${slug}`,
        label: name,
        icon: <AppIcon icon={Rocket} size="sm" className="text-emerald-500" />,
        path: `/dashboard/academy-leads/campaigns/${slug}`,
      });
    });

    academyChildren.push({
      key: 'academy-courses',
      label: 'Khóa học',
      icon: <AppIcon icon={BookOpen} size="sm" />,
      path: '/dashboard/academy-leads/courses',
    });

    if (isAdmin || normalizedRole === 'manager') {
      academyChildren.push({
        key: 'academy-payment-management',
        label: 'Thu học phí',
        icon: <AppIcon icon={WalletCards} size="sm" />,
        path: '/dashboard/academy-leads/payments',
      });
      academyChildren.push({
        key: 'academy-instructors',
        label: 'Giảng viên',
        icon: <AppIcon icon={UserRoundCog} size="sm" />,
        path: '/dashboard/academy-leads/instructors',
      });
    }

    academyItems.push({
      key: 'academy',
      label: 'Academy',
      icon: <AppIcon icon={GraduationCap} size="sm" />,
      children: academyChildren,
    });
    academyItems.push({
      key: 'post-hub',
      label: 'Chiến Thần',
      icon: <AppIcon icon={Egg} size="sm" />,
      path: '/dashboard/post-hub',
    });
  }

  const crmGroup: SidebarGroupConfig = {
    groupKey: 'grp-crm',
    groupTitle: 'KHÁCH HÀNG & CHIẾN DỊCH',
    items: crmGroupItems,
  };

  // Academy is a dedicated operating domain, separate from customer campaigns.
  const academyGroup: SidebarGroupConfig = {
    groupKey: 'grp-academy',
    groupTitle: 'ACADEMY',
    items: academyItems,
  };

  // Group 4: VẬN HÀNH CUỘC GỌI
  const operationsItems: SidebarItemConfig[] = [
    {
      key: 'my-appointments',
      label: 'Lịch hẹn của tôi',
      icon: <CalendarOutlined />,
      path: '/dashboard/appointments',
    },
    {
      key: 'plans',
      label: 'Kế hoạch gọi',
      icon: <CalendarOutlined />,
      path: '/dashboard/plans',
    },
    {
      key: 'calls',
      label: 'Lịch sử cuộc gọi',
      icon: <PhoneOutlined />,
      path: '/dashboard/calls',
    },
    {
      key: 'omicall',
      label: 'Cuộc gọi OmiCall (AI)',
      icon: <AudioOutlined />,
      path: '/dashboard/omicall',
    },
    {
      key: 'qa-shop',
      label: 'QA & QC Shop',
      icon: <SafetyCertificateOutlined />,
      path: '/dashboard/qa-shop',
    },
  ];

  if (['admin', 'manager', 'oc', 'cc'].includes(normalizedRole)) {
    operationsItems.push({
      key: 'fal-control-tower',
      label: 'FAL Control Tower',
      icon: <SafetyCertificateOutlined />,
      path: '/dashboard/fal',
    });
  }

  const operationsGroup: SidebarGroupConfig = {
    groupKey: 'grp-operations',
    groupTitle: 'VẬN HÀNH CUỘC GỌI',
    items: operationsItems,
  };

  // Group 5: BÁO CÁO & KPI
  const reportsGroup: SidebarGroupConfig = {
    groupKey: 'grp-reports',
    groupTitle: 'BÁO CÁO & KPI',
    items: [
      {
        key: 'kpi',
        label: 'KPI hiệu suất',
        icon: <BarChartOutlined />,
        path: '/dashboard/kpi',
      },
      {
        key: 'cc',
        label: 'Báo Cáo CC',
        icon: <SolutionOutlined />,
        path: '/dashboard/cc',
      },
      {
        key: 'cv',
        label: 'Báo Cáo CV',
        icon: <TeamOutlined />,
        path: '/dashboard/cv',
      },
      {
        key: 'bk',
        label: 'Báo Cáo BK',
        icon: <CalendarOutlined />,
        path: '/dashboard/bk',
      },
    ],
  };

  // Group 6: QUẢN TRỊ HỆ THỐNG (Only for Admin)
  const systemGroupItems: SidebarItemConfig[] = [];
  if (isAdmin) {
    const staffChildren: SidebarItemConfig[] = [
      {
        key: 'staff-directory',
        label: 'Danh sách nhân sự',
        icon: <SolutionOutlined />,
        path: '/dashboard/staff',
      },
      {
        key: 'teams',
        label: 'Cấu hình Đội nhóm',
        icon: <TeamOutlined />,
        path: '/dashboard/staff/teams',
      },
    ];
    if (isSuperAdmin) {
      staffChildren.push({
        key: 'menu-access',
        label: 'Quyền hiển thị menu',
        icon: <AppIcon icon={Settings2} size="sm" />,
        path: '/dashboard/staff/menu-access',
      });
    }
    systemGroupItems.push(
      {
        key: 'staff',
        label: 'Nhân sự (HR)',
        icon: <SolutionOutlined />,
        children: staffChildren,
      },
      {
        key: 'catalog',
        label: 'Quản lý Catalog',
        icon: <ShopOutlined />,
        path: '/dashboard/catalog',
      },
      {
        key: 'architecture',
        label: 'Sơ đồ Kiến trúc AI',
        icon: <ShareAltOutlined />,
        path: '/dashboard/architecture',
      },
      {
        key: 'design-system',
        label: 'Hệ Thống Thiết Kế',
        icon: <BgColorsOutlined />,
        path: '/dashboard/design-system',
      }
    );
  }

  const systemGroup: SidebarGroupConfig = {
    groupKey: 'grp-system',
    groupTitle: 'QUẢN TRỊ HỆ THỐNG',
    items: systemGroupItems,
  };

  const groups: SidebarGroupConfig[] = [homeGroup, crmGroup];
  if (academyItems.length > 0) {
    groups.push(academyGroup);
  }
  groups.push(operationsGroup, reportsGroup);
  if (systemGroupItems.length > 0) {
    groups.push(systemGroup);
  }

  const filterItems = (items: SidebarItemConfig[]): SidebarItemConfig[] =>
    items.flatMap((item) => {
      // Dynamic campaign links do not have individual static menu keys. Their
      // parent category therefore enforces the category policy for every child.
      if (!isCrmCategoryVisible && item.key === 'nyc-parent') return [];
      if (!isAcademyCategoryVisible && (item.key === 'academy' || item.key === 'post-hub')) return [];
      if (item.children?.length) {
        const visibleChildren = filterItems(item.children);
        // A parent is navigational structure, not a separate permission gate.
        // It stays when at least one visible child remains.
        return visibleChildren.length > 0 ? [{ ...item, children: visibleChildren }] : [];
      }
      return menuVisibility[item.key] === false ? [] : [item];
    });

  return groups
    .map((group) => ({ ...group, items: filterItems(group.items) }))
    .filter((group) => group.items.length > 0);
}

export function getSelectedMenuKey(
  pathname: string,
  assignedStaffId?: string | null,
  academySidebarCampaigns: SafeAny[] = []
): string {
  if (pathname === '/dashboard') return 'dashboard';
  if (pathname.includes('/dashboard/today')) return 'today';
  if (pathname.includes('/dashboard/fal')) return 'fal-control-tower';
  if (pathname.includes('/dashboard/customers')) {
    return assignedStaffId === 'me' ? 'my-customers' : 'customers-all';
  }
  if (pathname.includes('/dashboard/academy-leads/lead-manager')) return 'academy-lead-manager';
  if (pathname.includes('/dashboard/academy-leads/payments')) return 'academy-payment-management';
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
  if (pathname.includes('/dashboard/cs')) return 'cs-hub';
  return 'today';
}

import React from 'react';
import {
  ClockCircleOutlined,
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
  RocketOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { SafeAny } from '@mos-lab/shared';

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
  campaignVisibility: Record<string, boolean> = {}
): SidebarGroupConfig[] {
  const normalizedRole = userRole?.toLowerCase() || '';
  const isAdmin = normalizedRole === 'admin';
  const isLocaAllowed = ['admin', 'manager', 'oc', 'cc', 'cs', 'control'].includes(normalizedRole);

  // Group 1: TRANG CHỦ
  const homeGroup: SidebarGroupConfig = {
    groupKey: 'grp-home',
    groupTitle: 'TRANG CHỦ',
    items: [
      {
        key: 'today',
        label: 'Hôm nay',
        icon: <ClockCircleOutlined />,
        path: '/dashboard/today',
      },
    ],
  };

  // Group 2: KHÁCH HÀNG & CHIẾN DỊCH
  const customerChildren: SidebarItemConfig[] = [];
  if (isAdmin) {
    customerChildren.push({
      key: 'customers-all',
      label: 'Tất cả KH',
      path: '/dashboard/customers?assignedStaffId=all',
    });
  }
  customerChildren.push(
    {
      key: 'my-customers',
      label: 'KH của tôi',
      path: '/dashboard/customers?assignedStaffId=me',
    },
    {
      key: 'referrals',
      label: 'KH giới thiệu',
      path: '/dashboard/referrals',
    }
  );

  const nycChildren: SidebarItemConfig[] = [
    {
      key: 'nyc-main',
      label: 'NYC Chính',
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
          icon: <RocketOutlined style={{ color: '#10b981', fontSize: '12px' }} />,
          path: `/dashboard/nyc/campaigns/${c.slug}`,
        });
      }
    });
  }

  nycChildren.push({
    key: 'nyc-campaigns-mgmt',
    label: 'Quản lý Chiến dịch',
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

  const crmGroup: SidebarGroupConfig = {
    groupKey: 'grp-crm',
    groupTitle: 'KHÁCH HÀNG & CHIẾN DỊCH',
    items: crmGroupItems,
  };

  // Group 3: VẬN HÀNH CUỘC GỌI
  const operationsGroup: SidebarGroupConfig = {
    groupKey: 'grp-operations',
    groupTitle: 'VẬN HÀNH CUỘC GỌI',
    items: [
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
    ],
  };

  // Group 4: BÁO CÁO & KPI
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

  // Group 5: QUẢN TRỊ HỆ THỐNG (Only for Admin)
  const systemGroupItems: SidebarItemConfig[] = [];
  if (isAdmin) {
    systemGroupItems.push(
      {
        key: 'staff',
        label: 'Nhân sự (HR)',
        icon: <SolutionOutlined />,
        path: '/dashboard/staff',
      },
      {
        key: 'teams',
        label: 'Cấu hình Đội nhóm',
        icon: <TeamOutlined />,
        path: '/dashboard/staff/teams',
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

  const groups: SidebarGroupConfig[] = [homeGroup, crmGroup, operationsGroup, reportsGroup];
  if (systemGroupItems.length > 0) {
    groups.push(systemGroup);
  }

  return groups;
}

export function getSelectedMenuKey(pathname: string, assignedStaffId?: string | null): string {
  if (pathname.includes('/dashboard/today')) return 'today';
  if (pathname.includes('/dashboard/customers')) {
    return assignedStaffId === 'me' ? 'my-customers' : 'customers-all';
  }
  if (pathname === '/dashboard/nyc') return 'nyc-main';
  if (pathname === '/dashboard/nyc/campaigns') return 'nyc-campaigns-mgmt';
  if (pathname.startsWith('/dashboard/nyc/campaigns/')) {
    const slug = pathname.replace('/dashboard/nyc/campaigns/', '');
    return `nyc-campaign-${slug}`;
  }
  if (pathname.includes('/dashboard/nyc')) return 'nyc-parent';
  if (pathname.includes('/dashboard/loca')) return 'loca';
  if (pathname.includes('/dashboard/appointments')) return 'my-appointments';
  if (pathname.includes('/dashboard/plans')) return 'plans';
  if (pathname.includes('/dashboard/calls')) return 'calls';
  if (pathname.includes('/dashboard/omicall')) return 'omicall';
  if (pathname.includes('/dashboard/kpi')) return 'kpi';
  if (pathname.includes('/dashboard/cc')) return 'cc';
  if (pathname.includes('/dashboard/cv')) return 'cv';
  if (pathname.includes('/dashboard/bk')) return 'bk';
  if (pathname.includes('/dashboard/staff/teams')) return 'teams';
  if (pathname.includes('/dashboard/staff')) return 'staff';
  if (pathname.includes('/dashboard/referrals')) return 'referrals';
  if (pathname.includes('/dashboard/catalog')) return 'catalog';
  if (pathname.includes('/dashboard/architecture')) return 'architecture';
  if (pathname.includes('/dashboard/design-system')) return 'design-system';
  if (pathname.includes('/dashboard/cs')) return 'cs-hub';
  return 'today';
}

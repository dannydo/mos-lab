import {
  AudioOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  HeartOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  BookOpen,
  CalendarCheck,
  Egg,
  GraduationCap,
  LayoutDashboard,
  Presentation,
  Rocket,
  Settings2,
  Target,
  Trophy,
  UserRound,
  UserRoundCog,
  UserRoundPlus,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import type { SafeAny } from '@mos-lab/shared';
import { AppIcon } from '../../components/ui/AppIcon';
import type { SidebarGroupConfig, SidebarItemConfig } from './sidebar-types';

export function buildPrimarySidebarGroups(params: {
  normalizedRole: string;
  isAdmin: boolean;
  isLocaAllowed: boolean;
  activeCampaigns: SafeAny[];
  showCustomCampaigns: boolean;
  campaignVisibility: Record<string, boolean>;
  academySidebarCampaigns: SafeAny[];
  academyAccess: boolean;
}): {
  homeGroup: SidebarGroupConfig;
  crmGroup: SidebarGroupConfig;
  academyGroup: SidebarGroupConfig | null;
  operationsGroup: SidebarGroupConfig;
  qualityGroup: SidebarGroupConfig;
} {
  const {
    normalizedRole,
    isAdmin,
    isLocaAllowed,
    activeCampaigns,
    showCustomCampaigns,
    campaignVisibility,
    academySidebarCampaigns,
    academyAccess,
  } = params;

  // Group 1: TRANG CHỦ
  const homeGroup: SidebarGroupConfig = {
    groupKey: 'grp-home',
    groupTitle: 'TRANG CHỦ',
    items: [
      {
        key: 'dashboard',
        label: 'Tổng quan',
        icon: <AppIcon icon={LayoutDashboard} size="sm" />,
        path: '/dashboard',
      },
      {
        key: 'today',
        label: 'Hôm nay',
        icon: <AppIcon icon={CalendarCheck} size="sm" />,
        path: '/dashboard/today',
      },
      {
        key: 'schedule-calendar',
        label: 'Lịch & Công suất',
        icon: <CalendarOutlined />,
        path: '/dashboard/schedule-calendar',
      },
      {
        key: 'branches',
        label: 'Chi nhánh',
        icon: <ShopOutlined />,
        path: '/dashboard/branches',
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
      // A personal queue must not inherit a prior campaign/bucket tab.
      path: '/dashboard/customers?assignedStaffId=me&tab=ALL',
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

  crmGroupItems.push({
    key: 'nyc-parent',
    label: 'Chiến dịch NYC',
    icon: <ClockCircleOutlined />,
    children: nycChildren,
  });

  if (isLocaAllowed) {
    crmGroupItems.push({
      key: 'loca',
      label: 'Chiến dịch LoCa',
      icon: <HeartOutlined />,
      path: '/dashboard/loca',
    });
  }

  crmGroupItems.push({
    key: 'cs-hub',
    label: 'Trung Tâm CSKH',
    icon: <CustomerServiceOutlined />,
    path: '/dashboard/cskh',
  });

  // This is customer booking work, not internal staff scheduling.
  crmGroupItems.push({
    key: 'my-appointments',
    label: 'Lịch hẹn của tôi',
    icon: <CalendarOutlined />,
    path: '/dashboard/appointments',
  });

  const academyItems: SidebarItemConfig[] = [];
  if (academyAccess) {
    const academyChildren: SidebarItemConfig[] = [
      {
        key: 'academy-customers',
        label: 'Học viên',
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
      {
        key: 'academy-workshops',
        label: 'Workshop OS',
        icon: <AppIcon icon={Presentation} size="sm" />,
        path: '/dashboard/academy-leads/workshops',
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
  const academyGroup: SidebarGroupConfig | null =
    academyItems.length > 0
      ? {
          groupKey: 'grp-academy',
          groupTitle: 'ACADEMY',
          items: academyItems,
        }
      : null;

  // Keep call work separate from quality governance and staff scheduling so
  // each sidebar group answers one operating question.
  // Group 4: VẬN HÀNH CUỘC GỌI
  const operationsItems: SidebarItemConfig[] = [
    {
      key: 'telesale-target',
      label: 'Mục Tiêu Telesales T10',
      icon: <AppIcon icon={Target} size="sm" className="text-amber-500" />,
      path: '/dashboard/telesale-target',
    },
    {
      key: 'telesale-competency',
      label: 'Khung Năng Lực Telesales',
      icon: <AppIcon icon={Trophy} size="sm" className="text-amber-500" />,
      path: '/dashboard/telesale-competency',
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
  ];

  const operationsGroup: SidebarGroupConfig = {
    groupKey: 'grp-operations',
    groupTitle: 'VẬN HÀNH CUỘC GỌI',
    items: operationsItems,
  };

  // Group 5: QA/QC. New assessment surfaces for staff and lash technicians
  // belong here as they are introduced; this remains distinct from call work.
  const qualityItems: SidebarItemConfig[] = [
    {
      key: 'qa-shop',
      label: 'QA & QC Shop',
      icon: <SafetyCertificateOutlined />,
      path: '/dashboard/qa-shop',
    },
  ];

  if (['admin', 'manager', 'oc', 'cc'].includes(normalizedRole)) {
    qualityItems.push({
      key: 'fal-control-tower',
      label: 'FAL Control Tower',
      icon: <SafetyCertificateOutlined />,
      path: '/dashboard/fal',
    });
  }

  const qualityGroup: SidebarGroupConfig = {
    groupKey: 'grp-quality',
    groupTitle: 'QA / QC',
    items: qualityItems,
  };

  return { homeGroup, crmGroup, academyGroup, operationsGroup, qualityGroup };
}

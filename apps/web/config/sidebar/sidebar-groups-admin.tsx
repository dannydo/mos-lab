import {
  BarChartOutlined,
  BgColorsOutlined,
  CalendarOutlined,
  CustomerServiceOutlined,
  SafetyCertificateOutlined,
  ShareAltOutlined,
  ShopOutlined,
  SolutionOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  BarChart3,
  CalendarClock,
  DollarSign,
  FlaskConical,
  Rocket,
  Settings2,
  Sparkles,
  Trophy,
  Wallet,
  WalletCards,
} from 'lucide-react';
import type { SafeAny } from '@mos-lab/shared';
import { AppIcon } from '../../components/ui/AppIcon';
import type { SidebarGroupConfig, SidebarItemConfig } from './sidebar-types';

export function buildAdminAndReportSidebarGroups(params: {
  normalizedRole: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCv: boolean;
  bugInboxApprovalCount: number;
  activeFunds: SafeAny[];
}): {
  scheduleGroup: SidebarGroupConfig;
  reportsGroup: SidebarGroupConfig;
  labsGroup: SidebarGroupConfig;
  financeGroup: SidebarGroupConfig | null;
  systemGroup: SidebarGroupConfig | null;
} {
  const { normalizedRole, isAdmin, isSuperAdmin, isCv, bugInboxApprovalCount, activeFunds } = params;

  // Group 6: NHÂN SỰ & LỊCH LÀM VIỆC
  const scheduleItems: SidebarItemConfig[] = [];
  if (isAdmin || ['manager', 'hr', 'lead'].includes(normalizedRole)) {
    scheduleItems.push(
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
      }
    );
  }
  scheduleItems.push({
    key: 'holiday-work',
    label: 'Lịch nghỉ lễ',
    icon: <AppIcon icon={CalendarClock} size="sm" />,
    path: '/dashboard/holiday-work',
  });
  if (isSuperAdmin) {
    scheduleItems.push({
      key: 'menu-access',
      label: 'Quyền hiển thị menu',
      icon: <AppIcon icon={Settings2} size="sm" />,
      path: '/dashboard/staff/menu-access',
    });
  }

  const scheduleGroup: SidebarGroupConfig = {
    groupKey: 'grp-schedule',
    groupTitle: 'NHÂN SỰ & LỊCH LÀM VIỆC',
    items: scheduleItems,
  };

  // Group 7: BÁO CÁO & KPI
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
        icon: <AppIcon icon={BarChart3} size="sm" />,
        path: '/dashboard/cc',
      },
      {
        key: 'cv',
        label: 'Báo Cáo CV',
        icon: <AppIcon icon={Wallet} size="sm" />,
        path: '/dashboard/cv',
      },
      {
        key: 'bk',
        label: 'Báo Cáo BK',
        icon: <CalendarOutlined />,
        path: '/dashboard/bk',
      },
      {
        key: 'financial-goals',
        label: 'Mục Tiêu Tài Chính',
        icon: <AppIcon icon={DollarSign} size="sm" className="text-amber-500" />,
        path: '/dashboard/financial-goals',
      },
      {
        key: 'cs',
        label: 'Báo Cáo CS',
        icon: <CustomerServiceOutlined />,
        path: '/dashboard/cs',
      },
    ],
  };

  // Dedicated R&D / In-development Lab group (governed by Zero-Trust grants; career-path open by default for CV/CC)
  const labsGroup: SidebarGroupConfig = {
    groupKey: 'grp-labs',
    groupTitle: 'mOS LAB · ĐANG PHÁT TRIỂN',
    items: [
      {
        key: 'labs-hub',
        label: 'Vườn ươm mOS Lab',
        icon: <AppIcon icon={FlaskConical} size="sm" className="text-cyan-500" />,
        path: '/dashboard/labs',
      },
      {
        key: 'career-path',
        label: 'Career Path (Lộ trình CV)',
        icon: <AppIcon icon={Trophy} size="sm" />,
        path: '/dashboard/career-path',
      },
      {
        key: 'pilot-dark-lashes',
        label: 'Pilot Uốn Mi Đề Thám',
        icon: <AppIcon icon={Sparkles} size="sm" />,
        path: '/dashboard/pilot-dark-lashes',
      },
      {
        key: 'cc-payroll-pilot',
        label: 'Pilot Payroll CC',
        icon: <SafetyCertificateOutlined />,
        path: '/dashboard/payroll-pilot',
      },
    ],
  };

  // Group 8: QUẢN TRỊ HỆ THỐNG & MISSION
  const systemGroupItems: SidebarItemConfig[] = [];
  if (!isCv) {
    systemGroupItems.push({
      key: 'bug-reports',
      label: 'mOS Mission',
      icon: <AppIcon icon={Rocket} size="sm" />,
      badgeCount: bugInboxApprovalCount,
      path: '/dashboard/bug-reports',
    });
  }
  if (isAdmin) {
    systemGroupItems.push(
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

  const systemGroup: SidebarGroupConfig | null =
    systemGroupItems.length > 0
      ? {
          groupKey: 'grp-system',
          groupTitle: 'QUẢN TRỊ HỆ THỐNG',
          items: systemGroupItems,
        }
      : null;

  // Group: TÀI CHÍNH
  const financeItems: SidebarItemConfig[] = [];
  if (isAdmin || ['manager', 'accountant', 'boss', 'cho'].includes(normalizedRole)) {
    const fundChildren: SidebarItemConfig[] = [];
    if (Array.isArray(activeFunds) && activeFunds.length > 0) {
      activeFunds.forEach((f: SafeAny) => {
        fundChildren.push({
          key: `finance-fund-${f.id || f.code}`,
          label: f.name,
          icon: <AppIcon icon={WalletCards} size="sm" className="text-emerald-500" />,
          path: `/dashboard/funds?fundId=${f.id || f.code}`,
        });
      });
    }

    fundChildren.push({
      key: 'finance-funds-manage',
      label: 'Quản lý Quỹ',
      icon: <AppIcon icon={Settings2} size="sm" />,
      path: '/dashboard/funds',
    });

    financeItems.push({
      key: 'finance-funds-parent',
      label: 'Quỹ Hoạt Động Nội Bộ',
      icon: <AppIcon icon={WalletCards} size="sm" className="text-emerald-500" />,
      children: fundChildren,
    });
    financeItems.push({
      key: 'finance-cash-flow',
      label: 'Dự báo dòng tiền',
      icon: <AppIcon icon={WalletCards} size="sm" className="text-emerald-500" />,
      path: '/dashboard/finance/cash-flow',
    });
  }

  const financeGroup: SidebarGroupConfig | null =
    financeItems.length > 0
      ? {
          groupKey: 'grp-finance',
          groupTitle: 'TÀI CHÍNH',
          items: financeItems,
        }
      : null;

  return { scheduleGroup, reportsGroup, labsGroup, financeGroup, systemGroup };
}

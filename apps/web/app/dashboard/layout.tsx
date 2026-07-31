'use client';

import '../suppress-warnings';
import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { Layout, Menu, Button, Avatar, Space, Dropdown, theme, message, Tag, Badge } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  PhoneOutlined,
  BarChartOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  LeftOutlined,
  RightOutlined,
  SolutionOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  ShareAltOutlined,
  AudioOutlined,
  ShopOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTheme } from '../../context/ThemeContext';

const TelesalesDashboardModal = dynamic(() => import('../../components/TelesalesDashboardModal'), { ssr: false });
const DailyCallsDrawer = dynamic(() => import('../../components/DailyCallsDrawer'), { ssr: false });
const CallLogModal = dynamic(() => import('../../components/CallLogModal'), { ssr: false });
const PendingAllocationModal = dynamic(
  () => import('../../components/allocation/PendingAllocationModal').then((m) => m.PendingAllocationModal),
  { ssr: false }
);
import dayjs from 'dayjs';
import { apiClient } from '../../lib/api-client';
import { OmiCallProvider } from '../../context/OmiCallContext';
import OmiCallWidget from '../../components/OmiCallWidget';

const { Header, Sider, Content } = Layout;

function SidebarMenu({ themeMode, token, userRole }: { themeMode: string; token: SafeAny; userRole?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const assignedStaffId = searchParams.get('assignedStaffId');

  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<SafeAny[]>([]);

  const [showCustomCampaigns, setShowCustomCampaigns] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_sidebar_show_custom_campaigns');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const fetchActiveCampaigns = useCallback(() => {
    apiClient.campaigns
      .list({ status: 'ACTIVE' })
      .then((res: SafeAny) => {
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        setActiveCampaigns(list);
      })
      .catch((err) => {
        console.error('Fetch active campaigns for sidebar error:', err);
      });
  }, []);

  useEffect(() => {
    const handleToggle = () => {
      const saved = localStorage.getItem('mos_sidebar_show_custom_campaigns');
      setShowCustomCampaigns(saved !== null ? saved === 'true' : true);
      fetchActiveCampaigns();
    };

    window.addEventListener('storage', handleToggle);
    window.addEventListener('mos_sidebar_toggle', handleToggle);
    return () => {
      window.removeEventListener('storage', handleToggle);
      window.removeEventListener('mos_sidebar_toggle', handleToggle);
    };
  }, [fetchActiveCampaigns]);

  useEffect(() => {
    fetchActiveCampaigns();
  }, [fetchActiveCampaigns]);

  useEffect(() => {
    const savedOpenKeys = localStorage.getItem('mos_menu_openKeys');
    let keys: string[] = savedOpenKeys ? JSON.parse(savedOpenKeys) : [];
    if (pathname.includes('/dashboard/customers') || pathname.includes('/dashboard/referrals')) {
      if (!keys.includes('customers-parent')) keys.push('customers-parent');
    }
    if (pathname.includes('/dashboard/nyc')) {
      if (!keys.includes('nyc-parent')) keys.push('nyc-parent');
    }
    setOpenKeys(keys);
  }, [pathname]);

  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
    localStorage.setItem('mos_menu_openKeys', JSON.stringify(keys));
  };

  const getSelectedKey = () => {
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
    return 'customers-all';
  };

  const createNavItem = (key: string, icon: React.ReactNode | null, labelText: React.ReactNode, path: string) => ({
    key,
    icon,
    label: (
      <span onMouseEnter={() => router.prefetch(path)} style={{ display: 'inline-block', width: '100%' }}>
        {labelText}
      </span>
    ),
    onClick: () => router.push(path),
  });

  const menuItems: SafeAny[] = [];

  // Group customer pages into a SubMenu
  const customerChildren: SafeAny[] = [];

  if (userRole === 'admin') {
    customerChildren.push(
      createNavItem('customers-all', null, 'Tất cả KH', '/dashboard/customers?assignedStaffId=all')
    );
  }

  customerChildren.push(
    createNavItem('my-customers', null, 'KH của tôi', '/dashboard/customers?assignedStaffId=me'),
    createNavItem('referrals', null, 'KH giới thiệu', '/dashboard/referrals')
  );

  menuItems.push(createNavItem('today', <ClockCircleOutlined />, 'Hôm nay', '/dashboard/today'));

  menuItems.push({
    key: 'customers-parent',
    icon: <TeamOutlined />,
    label: 'Khách hàng',
    children: customerChildren,
  });

  const isLocaAllowed = ['admin', 'manager', 'oc', 'cc', 'cs', 'control'].includes(userRole?.toLowerCase() || '');

  // NYC SubMenu
  const nycChildren: SafeAny[] = [createNavItem('nyc-main', null, 'NYC Chính', '/dashboard/nyc')];

  if (showCustomCampaigns && activeCampaigns && activeCampaigns.length > 0) {
    activeCampaigns.forEach((c: SafeAny) => {
      nycChildren.push(
        createNavItem(
          `nyc-campaign-${c.slug}`,
          <RocketOutlined style={{ color: '#10b981', fontSize: '12px' }} />,
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>{c.name}</span>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                marginLeft: '6px',
              }}
            />
          </span>,
          `/dashboard/nyc/campaigns/${c.slug}`
        )
      );
    });
  }

  nycChildren.push(createNavItem('nyc-campaigns-mgmt', null, 'Quản lý Chiến dịch', '/dashboard/nyc/campaigns'));

  menuItems.push({
    key: 'nyc-parent',
    icon: <ClockCircleOutlined />,
    label: 'Chiến dịch NYC',
    children: nycChildren,
  });

  if (isLocaAllowed) {
    menuItems.push(createNavItem('loca', <HeartOutlined />, 'Chiến dịch LoCa', '/dashboard/loca'));
  }
  menuItems.push(
    createNavItem('my-appointments', <CalendarOutlined />, 'Lịch hẹn của tôi', '/dashboard/appointments'),
    createNavItem('plans', <CalendarOutlined />, 'Kế hoạch gọi', '/dashboard/plans'),
    createNavItem('calls', <PhoneOutlined />, 'Lịch sử cuộc gọi', '/dashboard/calls'),
    createNavItem('omicall', <AudioOutlined />, 'Cuộc gọi OmiCall (AI)', '/dashboard/omicall'),
    createNavItem('kpi', <BarChartOutlined />, 'KPI hiệu suất', '/dashboard/kpi'),
    createNavItem('cc', <SolutionOutlined />, 'Báo Cáo CC', '/dashboard/cc'),
    createNavItem('cv', <TeamOutlined />, 'Báo Cáo CV', '/dashboard/cv'),
    createNavItem('bk', <CalendarOutlined />, 'Báo Cáo BK', '/dashboard/bk')
  );

  // Staff menu (only for Admin) - Moved to the bottom
  if (userRole === 'admin') {
    menuItems.push(createNavItem('staff', <SolutionOutlined />, 'Nhân sự (HR)', '/dashboard/staff'));
    menuItems.push(createNavItem('teams', <TeamOutlined />, 'Cấu hình Đội nhóm', '/dashboard/staff/teams'));
    menuItems.push(createNavItem('catalog', <ShopOutlined />, 'Quản lý Catalog', '/dashboard/catalog'));
    menuItems.push(
      createNavItem('architecture', <ShareAltOutlined />, 'Sơ đồ Kiến trúc AI', '/dashboard/architecture')
    );
  }

  return (
    <nav aria-label="Main Navigation">
      <Menu
        theme={themeMode === 'dark' ? 'dark' : 'light'}
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        openKeys={openKeys}
        onOpenChange={handleOpenChange}
        items={menuItems}
        style={{
          background: themeMode === 'dark' ? '#000000' : token.colorBgContainer,
          paddingTop: '8px',
          borderRight: 0,
        }}
        className="antd-custom-menu"
      />
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { themeMode, toggleTheme } = useTheme();
  const { token } = theme.useToken();

  const [collapsed, setCollapsed] = useState(false);
  const [isDashboardVisible, setIsDashboardVisible] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [onlineMembers, setOnlineMembers] = useState<SafeAny[]>([]);
  const [isDailyCallsOpen, setIsDailyCallsOpen] = useState(false);
  const [dailyCallsCount, setDailyCallsCount] = useState(0);
  const [user, setUser] = useState<SafeAny>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const [isPendingAllocationOpen, setIsPendingAllocationOpen] = useState(false);
  const [pendingAllocationCount, setPendingAllocationCount] = useState(0);

  const fetchPendingAllocationsCount = useCallback(async () => {
    try {
      const list = await apiClient.allocation.getPendingBatches();
      setPendingAllocationCount(list?.length || 0);
    } catch (err) {
      console.error('Fetch pending allocations error:', err);
    }
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    fetchPendingAllocationsCount();
    const interval = setInterval(fetchPendingAllocationsCount, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingAllocationsCount, loading, user]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('telesalesModal') === 'true' || params.get('telesales_modal') === 'true') {
        setIsDashboardVisible(true);
      }
    }
  }, []);

  const fetchDailyCallsCount = useCallback(async () => {
    try {
      const todayStr = dayjs().format('YYYY-MM-DD');
      const res = await apiClient.calls.listDaily({ date: todayStr, scope: 'me' });
      setDailyCallsCount(res.length);
    } catch (err) {
      console.error('Fetch daily calls count error:', err);
    }
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    fetchDailyCallsCount();
    const interval = setInterval(fetchDailyCallsCount, 30000);
    return () => clearInterval(interval);
  }, [fetchDailyCallsCount, loading, user]);

  const fetchOnlineStaff = useCallback(async () => {
    try {
      const list = await apiClient.staff.list();
      const now = dayjs();

      const filtered = list.filter((m: SafeAny) => {
        const isUserActive = m.isActive === true || m.isActive === 1 || m.isActive === '1';
        const isOnline = !!(m.lastActiveAt && now.diff(dayjs(m.lastActiveAt), 'minute') < 5);

        const storedUserStr = typeof window !== 'undefined' ? localStorage.getItem('mos_user') : null;
        let currentUserId = '';
        if (storedUserStr) {
          try {
            currentUserId = JSON.parse(storedUserStr).id;
          } catch (_) {}
        }
        return isUserActive && isOnline && m.id !== currentUserId;
      });

      const mapped = filtered.map((m: SafeAny) => {
        const initials = m.displayName
          ? m.displayName
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
          : m.username?.slice(0, 2).toUpperCase() || '??';

        const memberColorMap: Record<string, string> = {
          TN: 'linear-gradient(135deg, #EC4899, #DB2777)',
          HM: 'linear-gradient(135deg, #A855F7, #9333EA)',
          VT: 'linear-gradient(135deg, #06B6D4, #0891B2)',
          KL: 'linear-gradient(135deg, #10B981, #059669)',
          TH: 'linear-gradient(135deg, #F97316, #EA580C)',
          DD: 'linear-gradient(135deg, #D4A84B, #B8902F)',
        };

        const rawAvatar = m.avatarUrl || m.avatar || null;
        const formattedAvatar = rawAvatar
          ? rawAvatar.replace(/^https?:\/\/(s|api)\.wingslashes\.com/, 'https://cdn.wingslashes.com')
          : null;

        return {
          id: String(m.id),
          initials: initials,
          name: m.displayName || m.username,
          avatarUrl: formattedAvatar,
          color: memberColorMap[initials] || 'linear-gradient(135deg, #6B7280, #4B5563)',
        };
      });

      setOnlineMembers(mapped);
    } catch (err) {
      console.error('Fetch online staff error:', err);
    }
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    fetchOnlineStaff();
    const interval = setInterval(fetchOnlineStaff, 25000);
    return () => clearInterval(interval);
  }, [fetchOnlineStaff, loading, user]);

  useEffect(() => {
    const saved = localStorage.getItem('mos_sidebar_collapsed');
    if (saved) {
      setCollapsed(saved === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const nextVal = !collapsed;
    setCollapsed(nextVal);
    localStorage.setItem('mos_sidebar_collapsed', String(nextVal));
  };

  useEffect(() => {
    // Check authentication
    const tokenStr = localStorage.getItem('mos_token');
    const storedUser = localStorage.getItem('mos_user');
    const hasOriginal = !!localStorage.getItem('mos_original_token');

    if (!tokenStr || !storedUser) {
      localStorage.removeItem('mos_token');
      localStorage.removeItem('mos_user');
      localStorage.removeItem('mos_omicall_auto_init');
      localStorage.removeItem('mos_original_token');
      localStorage.removeItem('mos_original_user');
      router.push('/login');
    } else {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      setIsImpersonating(hasOriginal);
      setLoading(false);

      // Background profile sync to fetch latest user config & auto-init roles
      apiClient.auth
        .me()
        .then((res: SafeAny) => {
          if (res?.user) {
            localStorage.setItem('mos_user', JSON.stringify(res.user));
            if (res.resolvedOmicallAutoInit !== undefined) {
              localStorage.setItem('mos_omicall_auto_init', String(!!res.resolvedOmicallAutoInit));
            }
            setUser(res.user);
          }
        })
        .catch((err) => {
          console.error('Failed to sync profile in background:', err);
        });
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('mos_token');
    localStorage.removeItem('mos_user');
    localStorage.removeItem('mos_omicall_auto_init');
    localStorage.removeItem('mos_original_token');
    localStorage.removeItem('mos_original_user');
    router.push('/login');
  };

  const handleExitImpersonation = () => {
    const origToken = localStorage.getItem('mos_original_token');
    const origUser = localStorage.getItem('mos_original_user');
    if (origToken && origUser) {
      localStorage.setItem('mos_token', origToken);
      localStorage.setItem('mos_user', origUser);
      localStorage.removeItem('mos_original_token');
      localStorage.removeItem('mos_original_user');
      message.success('Đã quay lại tài khoản Admin');
      window.location.href = '/dashboard/staff';
    }
  };

  if (loading) {
    return (
      <div
        className="flex h-screen w-screen items-center justify-center"
        style={{ background: token.colorBgLayout, color: token.colorText }}
      >
        Tải thông tin phiên đăng nhập...
      </div>
    );
  }

  const userMenu = {
    items: [
      {
        key: 'profile',
        label: `Tài khoản: ${user?.displayName}`,
        disabled: true,
      },
      {
        key: 'role',
        label: `Vai trò: ${user?.role?.toUpperCase()}`,
        disabled: true,
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'telesales_dashboard',
        icon: <BarChartOutlined className="text-gold" />,
        label: 'KPI Đội Telesales',
        onClick: () => {
          setSelectedMemberId('DD');
          setIsDashboardVisible(true);
        },
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'logout',
        danger: true,
        icon: <LogoutOutlined />,
        label: 'Đăng xuất',
        onClick: handleLogout,
      },
    ],
  };

  return (
    <OmiCallProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{
            background: themeMode === 'dark' ? '#000000' : token.colorBgContainer,
            borderRight: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <h1 className="sr-only">WINGS LASHES Management System</h1>
          <div
            className="flex items-center justify-center"
            style={{
              height: '64px',
              background: themeMode === 'dark' ? '#000000' : token.colorBgContainer,
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
              color: token.colorPrimary,
              fontSize: collapsed ? '16px' : '18px',
              fontWeight: 'bold',
              letterSpacing: '1px',
            }}
          >
            {collapsed ? 'WL' : 'WINGS LASHES'}
          </div>
          <Suspense fallback={null}>
            <SidebarMenu themeMode={themeMode} token={token} userRole={user?.role} />
          </Suspense>
        </Sider>

        <div className="sidebar-toggle-container">
          <Button
            aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            title={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            onClick={toggleSidebar}
            icon={
              collapsed ? <RightOutlined style={{ fontSize: '10px' }} /> : <LeftOutlined style={{ fontSize: '10px' }} />
            }
            className="sidebar-toggle-btn"
            style={{
              position: 'absolute',
              top: '72px',
              left: collapsed ? '68px' : '188px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              background: themeMode === 'dark' ? '#141414' : '#ffffff',
              border: `1px solid ${themeMode === 'dark' ? '#303030' : '#d9d9d9'}`,
              color: '#D4A84B',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              cursor: 'pointer',
              transition: 'left 0.2s ease, opacity 0.3s ease, background 0.3s',
              zIndex: 1010,
              opacity: 0,
              pointerEvents: 'auto',
            }}
          />
        </div>

        <Layout style={{ background: token.colorBgLayout }}>
          <Header
            style={{
              padding: '0 24px',
              background: token.colorBgContainer,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {isImpersonating && (
                <Tag
                  color="warning"
                  style={{
                    marginRight: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D4A84B',
                    background: themeMode === 'dark' ? '#2b2111' : '#fffbe6',
                  }}
                >
                  <span style={{ color: themeMode === 'dark' ? '#ffd666' : '#d46b08', fontSize: '13px' }}>
                    Đang giả lập: <strong>{user?.displayName}</strong>
                  </span>
                  <Button
                    type="primary"
                    danger
                    size="small"
                    onClick={handleExitImpersonation}
                    style={{
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '11px',
                      padding: '0 8px',
                    }}
                  >
                    Thoát
                  </Button>
                </Tag>
              )}
              {/* Online User Avatar Bubbles Stack */}
              {onlineMembers.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px' }} className="flex-shrink-0">
                  {onlineMembers.map((m, idx) => (
                    <div
                      key={m.id}
                      style={{
                        position: 'relative',
                        width: '32px',
                        height: '32px',
                        minWidth: '32px',
                        minHeight: '32px',
                        maxWidth: '32px',
                        maxHeight: '32px',
                        flexShrink: 0,
                        marginLeft: idx > 0 ? '-10px' : '0',
                        zIndex: 20 - idx,
                      }}
                    >
                      <div
                        onClick={() => {
                          setSelectedMemberId(m.id || m.initials);
                          setIsDashboardVisible(true);
                        }}
                        className="avatar-breath cursor-pointer hover:scale-110 transition-all select-none"
                        style={{
                          width: '32px',
                          height: '32px',
                          minWidth: '32px',
                          minHeight: '32px',
                          maxWidth: '32px',
                          maxHeight: '32px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                          maskImage: 'radial-gradient(white, black)',
                          WebkitTransform: 'translateZ(0)',
                          transform: 'translateZ(0)',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#ffffff',
                          background: m.color,
                          borderColor: themeMode === 'dark' ? '#000000' : '#ffffff',
                          borderWidth: '2px',
                          borderStyle: 'solid',
                          boxSizing: 'border-box',
                        }}
                        title={m.name}
                      >
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            alt={m.name}
                            style={{
                              width: '32px',
                              height: '32px',
                              minWidth: '32px',
                              minHeight: '32px',
                              maxWidth: '32px',
                              maxHeight: '32px',
                              objectFit: 'cover',
                              borderRadius: '50%',
                              display: 'block',
                            }}
                          />
                        ) : (
                          m.initials
                        )}
                      </div>
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '0px',
                          right: '0px',
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#22c55e',
                          borderRadius: '50%',
                          border: `2px solid ${themeMode === 'dark' ? '#000000' : '#ffffff'}`,
                          zIndex: 10,
                          pointerEvents: 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {pendingAllocationCount > 0 && (
                <Badge count={pendingAllocationCount} offset={[-8, 2]} size="small">
                  <Button
                    type="text"
                    aria-label="Xác nhận data mới"
                    icon={<ClockCircleOutlined style={{ color: '#F59E0B' }} />}
                    onClick={() => setIsPendingAllocationOpen(true)}
                    style={{
                      fontSize: '16px',
                      marginRight: '16px',
                      color: token.colorText,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Đợt phân bổ data chờ xác nhận 24h"
                  >
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-1">
                      {pendingAllocationCount} đợt data
                    </span>
                  </Button>
                </Badge>
              )}

              <Badge count={dailyCallsCount} offset={[-8, 2]} size="small" showZero={false}>
                <Button
                  type="text"
                  aria-label="Cuộc gọi hôm nay"
                  icon={<PhoneOutlined style={{ color: '#D4A84B' }} />}
                  onClick={() => setIsDailyCallsOpen(true)}
                  style={{
                    fontSize: '16px',
                    marginRight: '16px',
                    color: token.colorText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Cuộc gọi hôm nay"
                />
              </Badge>

              <Button
                type="text"
                aria-label={themeMode === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
                title={themeMode === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
                icon={
                  themeMode === 'dark' ? (
                    <SunOutlined style={{ color: '#FAAD14' }} />
                  ) : (
                    <MoonOutlined style={{ color: '#1890ff' }} />
                  )
                }
                onClick={toggleTheme}
                style={{
                  fontSize: '16px',
                  marginRight: '16px',
                  color: token.colorText,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
              <Dropdown menu={userMenu} placement="bottomRight" arrow>
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Avatar
                    src={
                      user?.avatarUrl
                        ? user.avatarUrl.replace(/^https?:\/\/(s|api)\.wingslashes\.com/, 'https://cdn.wingslashes.com')
                        : undefined
                    }
                    alt={user?.name ? `Ảnh đại diện ${user.name}` : 'Ảnh đại diện người dùng'}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: token.colorPrimary, color: '#000' }}
                  />
                </div>
              </Dropdown>
            </div>
          </Header>

          <Content
            style={{
              margin: '24px',
              padding: '24px',
              background: token.colorBgContainer,
              borderRadius: '8px',
              minHeight: 280,
              border: `1px solid ${token.colorBorderSecondary}`,
              overflow: 'initial',
              color: token.colorText,
            }}
          >
            {children}
          </Content>
        </Layout>

        <TelesalesDashboardModal
          visible={isDashboardVisible}
          onClose={() => setIsDashboardVisible(false)}
          initialMemberId={selectedMemberId}
        />

        <DailyCallsDrawer
          open={isDailyCallsOpen}
          onClose={() => {
            setIsDailyCallsOpen(false);
            fetchDailyCallsCount();
          }}
        />

        <PendingAllocationModal
          open={isPendingAllocationOpen}
          onClose={() => setIsPendingAllocationOpen(false)}
          onSuccessRefresh={fetchPendingAllocationsCount}
        />

        <style jsx global>{`
          /* Override Ant Design dark sidebar menu hover/select colors */
          .antd-custom-menu .ant-menu-item-selected {
            background-color: #d4a84b !important;
          }
          .antd-custom-menu .ant-menu-item-selected .ant-menu-title-content,
          .antd-custom-menu .ant-menu-item-selected .anticon {
            color: #000000 !important;
          }

          /* Keep black color on selected item hover */
          .antd-custom-menu .ant-menu-item-selected:hover,
          .antd-custom-menu .ant-menu-item-selected:hover .ant-menu-title-content,
          .antd-custom-menu .ant-menu-item-selected:hover .anticon {
            color: #000000 !important;
            background-color: #d4a84b !important;
          }

          /* Hover styles for normal items */
          .antd-custom-menu .ant-menu-item:not(.ant-menu-item-selected):hover {
            background-color: ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : 'rgba(212, 168, 75, 0.08)'} !important;
          }
          .antd-custom-menu .ant-menu-item:not(.ant-menu-item-selected):hover .ant-menu-title-content,
          .antd-custom-menu .ant-menu-item:not(.ant-menu-item-selected):hover .anticon {
            color: #d4a84b !important;
          }

          /* Show toggle button on sidebar hover */
          .ant-layout-sider:hover + .sidebar-toggle-container .sidebar-toggle-btn,
          .sidebar-toggle-container:hover .sidebar-toggle-btn {
            opacity: 1 !important;
          }

          /* Hide OmiCall LiveTalk chat widget and its warning alerts */
          #omi_nvd,
          #omiLiveTalk,
          [id^='omi_'],
          [class*='omi-lt-'] {
            display: none !important;
          }

          /* Avatar gentle breathing animation */
          @keyframes avatarBreath {
            0%,
            100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
          .avatar-breath {
            animation: avatarBreath 3s infinite ease-in-out;
          }
        `}</style>
      </Layout>
      <OmiCallWidget />
      <CallLogModal />
    </OmiCallProvider>
  );
}

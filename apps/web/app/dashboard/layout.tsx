'use client';

import '../suppress-warnings';
import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { Layout, Button, Avatar, Space, Dropdown, Drawer, theme, message, Tag } from 'antd';
import {
  TeamOutlined,
  CalendarOutlined,
  BarChartOutlined,
  LogoutOutlined,
  LeftOutlined,
  RightOutlined,
  SolutionOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  ShareAltOutlined,
  AudioOutlined,
  ShopOutlined,
  RocketOutlined,
  BgColorsOutlined,
  ColumnHeightOutlined,
} from '@ant-design/icons';
import { Clock3, EllipsisVertical, Menu, Moon, Phone, Sun, UserRound } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '../../context/ThemeContext';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';

const TelesalesDashboardModal = dynamic(() => import('../../components/TelesalesDashboardModal'), { ssr: false });
const DailyCallsDrawer = dynamic(() => import('../../components/DailyCallsDrawer'), { ssr: false });
const CallLogModal = dynamic(() => import('../../components/CallLogModal'), { ssr: false });
const PendingAllocationModal = dynamic(
  () => import('../../components/allocation/PendingAllocationModal').then((m) => m.PendingAllocationModal),
  { ssr: false }
);
const CvScheduleDrawer = dynamic(
  () => import('./schedule-calendar/components/CvScheduleDrawer').then((m) => m.CvScheduleDrawer),
  { ssr: false }
);
import dayjs from 'dayjs';
import { apiClient } from '../../lib/api-client';
import { OmiCallProvider } from '../../context/OmiCallContext';
const OmiCallWidget = dynamic(() => import('../../components/OmiCallWidget'), { ssr: false });
import SidebarNav from '../../components/layout/SidebarNav';
import HeaderLeftToolbar from '../../components/layout/HeaderLeftToolbar';
import { HeaderActionIndicator } from '../../components/ui/HeaderActionIndicator';
import { HeaderIconButton } from '../../components/ui/HeaderIconButton';

const { Header, Sider, Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { themeMode, toggleTheme, desktopDensity, setDesktopDensity } = useTheme();
  const { token } = theme.useToken();
  const responsiveTier = useResponsiveTier();
  const isMobileTier = responsiveTier === 'mobile';
  const isTabletTier = responsiveTier === 'tablet';
  const desktopDensityLabel =
    desktopDensity === 'compact' ? 'Compact' : desktopDensity === 'comfortable' ? 'Comfortable' : 'Standard';
  const persistentNavWidth =
    responsiveTier === 'uhd'
      ? 248
      : responsiveTier === 'wide'
        ? 240
        : responsiveTier === 'fhd'
          ? 232
          : isTabletTier
            ? 216
            : 224;

  const [collapsed, setCollapsed] = useState(false);
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const [isDashboardVisible, setIsDashboardVisible] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [onlineMembers, setOnlineMembers] = useState<SafeAny[]>([]);
  const [isDailyCallsOpen, setIsDailyCallsOpen] = useState(false);
  const [dailyCallsCount, setDailyCallsCount] = useState(0);
  const [user, setUser] = useState<SafeAny>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [deployedAt, setDeployedAt] = useState<string | null>(null);

  const [isPendingAllocationOpen, setIsPendingAllocationOpen] = useState(false);
  const [pendingAllocationCount, setPendingAllocationCount] = useState(0);

  // Global CV Schedule Drawer state
  const [isCvDrawerOpen, setIsCvDrawerOpen] = useState(false);
  const [cvDrawerDate, setCvDrawerDate] = useState(() => dayjs());
  const [workingCvCount, setWorkingCvCount] = useState(0);
  const hasAuthenticatedUser = !loading && Boolean(user?.id);

  const fetchWorkingCvCount = useCallback(async () => {
    try {
      const res = await apiClient.customers.getCvRealtimeStatus();
      if (res?.workingCvCount !== undefined) {
        setWorkingCvCount(res.workingCvCount);
      } else if (res?.staffStatuses) {
        setWorkingCvCount(res.staffStatuses.length);
      }
    } catch (err) {
      console.warn('Fetch working CV count error:', err);
    }
  }, []);

  useEffect(() => {
    if (!hasAuthenticatedUser) return;
    fetchWorkingCvCount();
    const interval = setInterval(fetchWorkingCvCount, 30000);
    return () => clearInterval(interval);
  }, [fetchWorkingCvCount, hasAuthenticatedUser]);

  useEffect(() => {
    if (!hasAuthenticatedUser) return;

    const fetchReleaseMarker = () => {
      apiClient.release
        .get()
        .then((release) => setDeployedAt(release.deployedAt))
        .catch(() => setDeployedAt(null));
    };

    fetchReleaseMarker();
    const interval = setInterval(fetchReleaseMarker, 60_000);
    return () => clearInterval(interval);
  }, [hasAuthenticatedUser]);

  const fetchPendingAllocationsCount = useCallback(async () => {
    try {
      const list = await apiClient.allocation.getPendingBatches();
      setPendingAllocationCount(list?.length || 0);
    } catch (err) {
      console.error('Fetch pending allocations error:', err);
    }
  }, []);

  useEffect(() => {
    if (!hasAuthenticatedUser) return;
    fetchPendingAllocationsCount();
    const interval = setInterval(fetchPendingAllocationsCount, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingAllocationsCount, hasAuthenticatedUser]);

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
    if (!hasAuthenticatedUser) return;
    fetchDailyCallsCount();
    const interval = setInterval(fetchDailyCallsCount, 30000);
    return () => clearInterval(interval);
  }, [fetchDailyCallsCount, hasAuthenticatedUser]);

  const fetchOnlineStaff = useCallback(async () => {
    try {
      const list = await apiClient.staff.list();
      if (!Array.isArray(list)) return;
      const now = dayjs();
      const storedUserStr = typeof window !== 'undefined' ? localStorage.getItem('mos_user') : null;
      let currentUserId = '';
      if (storedUserStr) {
        try {
          currentUserId = JSON.parse(storedUserStr).id;
        } catch (_) {}
      }

      const filtered = list.filter((m: SafeAny) => {
        const isUserActive = m.isActive === true || m.isActive === 1 || m.isActive === '1';
        const isOnline = !!(m.lastActiveAt && now.diff(dayjs(m.lastActiveAt), 'minute') < 5);
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
    if (!hasAuthenticatedUser) return;
    fetchOnlineStaff();
    const interval = setInterval(fetchOnlineStaff, 25000);
    return () => clearInterval(interval);
  }, [fetchOnlineStaff, hasAuthenticatedUser]);

  useEffect(() => {
    const saved = localStorage.getItem('mos_sidebar_collapsed');
    setCollapsed(saved ? saved === 'true' : isTabletTier);
  }, [isTabletTier]);

  useEffect(() => {
    setIsMobileNavigationOpen(false);
  }, [pathname]);

  const toggleSidebar = () => {
    if (isMobileTier) {
      setIsMobileNavigationOpen((open) => !open);
      return;
    }
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
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    } else {
      try {
        const parsed = JSON.parse(storedUser);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid user payload in storage');
        }
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
      } catch (err) {
        console.error('Failed to parse stored user JSON:', err);
        localStorage.removeItem('mos_token');
        localStorage.removeItem('mos_user');
        localStorage.removeItem('mos_omicall_auto_init');
        localStorage.removeItem('mos_original_token');
        localStorage.removeItem('mos_original_user');
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
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
        suppressHydrationWarning
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
        key: 'display-density',
        icon: <ColumnHeightOutlined />,
        label: isMobileTier
          ? `Mật độ desktop: ${desktopDensityLabel} (mobile dùng Compact)`
          : `Mật độ desktop: ${desktopDensityLabel}`,
        children: [
          {
            key: 'display-density-compact',
            label: 'Compact · 32px / 16px',
            onClick: () => setDesktopDensity('compact'),
          },
          {
            key: 'display-density-standard',
            label: 'Standard · 36px / 18px',
            onClick: () => setDesktopDensity('standard'),
          },
          {
            key: 'display-density-comfortable',
            label: 'Comfortable · 44px / 20px',
            onClick: () => setDesktopDensity('comfortable'),
          },
        ],
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

  const mobileUtilityMenu = {
    items: [
      ...(pendingAllocationCount > 0
        ? [
            {
              key: 'pending-allocation',
              icon: <ClockCircleOutlined />,
              label: `${pendingAllocationCount} đợt data chờ xác nhận`,
              onClick: () => setIsPendingAllocationOpen(true),
            },
          ]
        : []),
      {
        key: 'telesales-dashboard',
        icon: <BarChartOutlined />,
        label: 'KPI Đội Telesales',
        onClick: () => {
          setSelectedMemberId('DD');
          setIsDashboardVisible(true);
        },
      },
      ...(isImpersonating
        ? [
            {
              key: 'exit-impersonation',
              icon: <LogoutOutlined />,
              danger: true,
              label: 'Thoát giả lập',
              onClick: handleExitImpersonation,
            },
          ]
        : []),
    ],
  };

  const renderSidebarContent = (navCollapsed: boolean) => (
    <>
      <h1 className="sr-only">WINGS LASHES Management System</h1>
      <div
        className="flex items-center justify-center transition-all duration-200"
        style={{
          height: navCollapsed ? '44px' : '52px',
          background: themeMode === 'dark' ? '#000000' : token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          color: token.colorPrimary,
          fontSize: navCollapsed ? '13px' : '17px',
          fontWeight: 'bold',
          letterSpacing: '1px',
        }}
      >
        {navCollapsed ? 'WL' : 'WINGS LASHES'}
      </div>
      <Suspense fallback={null}>
        <div className="sidebar-nav-scroll-region">
          <SidebarNav
            collapsed={navCollapsed}
            themeMode={themeMode}
            token={token}
            userRole={user?.role}
            onNavigate={() => setIsMobileNavigationOpen(false)}
          />
        </div>
      </Suspense>
      {deployedAt && (
        <div
          title={`Updated: ${dayjs(deployedAt).format('DD/MM/YYYY · HH:mm')}`}
          style={{
            flexShrink: 0,
            padding: navCollapsed ? '10px 0' : '10px 12px',
            textAlign: navCollapsed ? 'center' : 'left',
            color: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            fontSize: '11px',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {navCollapsed ? '●' : `Updated: ${dayjs(deployedAt).format('DD/MM · HH:mm')}`}
        </div>
      )}
    </>
  );

  return (
    <OmiCallProvider>
      <Layout className="dashboard-shell" style={{ minHeight: '100dvh' }} suppressHydrationWarning>
        {isMobileTier ? (
          <Drawer
            className="dashboard-mobile-nav"
            closable={false}
            open={isMobileNavigationOpen}
            onClose={() => setIsMobileNavigationOpen(false)}
            placement="left"
            width="min(86vw, 344px)"
            styles={{ body: { background: themeMode === 'dark' ? '#000000' : token.colorBgContainer } }}
          >
            {renderSidebarContent(false)}
          </Drawer>
        ) : (
          <Sider
            className="dashboard-sider"
            trigger={null}
            collapsible
            collapsed={collapsed}
            collapsedWidth={56}
            width={persistentNavWidth}
            suppressHydrationWarning
            style={{
              background: themeMode === 'dark' ? '#000000' : token.colorBgContainer,
              borderRight: `1px solid ${token.colorBorderSecondary}`,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {renderSidebarContent(collapsed)}
          </Sider>
        )}

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
              top: '10px',
              left: collapsed ? '40px' : `${persistentNavWidth - 16}px`,
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              background: themeMode === 'dark' ? '#141414' : '#ffffff',
              border: `1px solid ${themeMode === 'dark' ? '#303030' : '#d9d9d9'}`,
              color: themeMode === 'dark' ? '#D4A84B' : '#855b0e',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              cursor: 'pointer',
              transition: 'left 0.2s ease, opacity 0.2s ease, background 0.2s, transform 0.2s ease',
              zIndex: 1010,
              opacity: collapsed ? 1 : 0.72,
              pointerEvents: 'auto',
            }}
          />
        </div>

        <Layout style={{ background: token.colorBgLayout, minWidth: 0 }}>
          <Header
            className="dashboard-header"
            style={{
              background: token.colorBgContainer,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <div className="dashboard-header-left">
              {isMobileTier && (
                <HeaderIconButton action="navigation" label="Mở điều hướng" icon={Menu} onClick={toggleSidebar} />
              )}
              <HeaderLeftToolbar onOpenCvDrawer={() => setIsCvDrawerOpen(true)} workingCvCount={workingCvCount} />
            </div>
            <div className="dashboard-header-right">
              {isImpersonating && (
                <Tag
                  className="dashboard-desktop-only"
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
                <div className="dashboard-online-member-stack dashboard-desktop-only">
                  {onlineMembers.map((m, idx) => (
                    <button
                      key={m.id}
                      type="button"
                      className="dashboard-online-member-action"
                      aria-label={`Mở KPI đội telesales của ${m.name}`}
                      title={m.name}
                      onClick={() => {
                        setSelectedMemberId(m.id || m.initials);
                        setIsDashboardVisible(true);
                      }}
                      style={{
                        position: 'relative',
                        marginLeft: idx > 0 ? '-10px' : '0',
                        zIndex: 20 - idx,
                      }}
                    >
                      <div
                        className="dashboard-online-member-avatar avatar-breath select-none"
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
                    </button>
                  ))}
                </div>
              )}

              {pendingAllocationCount > 0 && (
                <HeaderIconButton
                  action="pending-allocation"
                  className="dashboard-desktop-only"
                  label={`${pendingAllocationCount} đợt data chờ xác nhận`}
                  desktopLabel={`${pendingAllocationCount} đợt data`}
                  icon={Clock3}
                  onClick={() => setIsPendingAllocationOpen(true)}
                  tone="accent"
                />
              )}

              <HeaderIconButton
                action="daily-calls"
                label={dailyCallsCount > 0 ? `Cuộc gọi hôm nay, ${dailyCallsCount} cuộc` : 'Cuộc gọi hôm nay'}
                icon={Phone}
                onClick={() => setIsDailyCallsOpen(true)}
              />

              {isMobileTier && (
                <Dropdown menu={mobileUtilityMenu} placement="bottomRight" arrow>
                  <HeaderActionIndicator
                    variant="status"
                    active={pendingAllocationCount > 0}
                    color={token.colorWarning}
                  >
                    <HeaderIconButton
                      action="utilities"
                      label={
                        pendingAllocationCount > 0
                          ? `Thao tác phụ, ${pendingAllocationCount} đợt data chờ xác nhận`
                          : 'Thao tác phụ'
                      }
                      icon={EllipsisVertical}
                    />
                  </HeaderActionIndicator>
                </Dropdown>
              )}

              <HeaderIconButton
                action="theme"
                label={themeMode === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
                icon={themeMode === 'dark' ? Sun : Moon}
                onClick={toggleTheme}
                aria-pressed={themeMode === 'dark'}
              />
              <Dropdown menu={userMenu} placement="bottomRight" arrow>
                <button
                  type="button"
                  className="mos-header-avatar-action"
                  data-header-action="user-menu"
                  aria-label="Mở menu người dùng"
                  aria-haspopup="menu"
                  title="Mở menu người dùng"
                >
                  <Avatar
                    className="mos-header-avatar"
                    src={
                      user?.avatarUrl
                        ? user.avatarUrl.replace(/^https?:\/\/(s|api)\.wingslashes\.com/, 'https://cdn.wingslashes.com')
                        : undefined
                    }
                    alt={user?.name ? `Ảnh đại diện ${user.name}` : 'Ảnh đại diện người dùng'}
                    icon={<UserRound aria-hidden className="mos-header-avatar__icon" />}
                    style={{ backgroundColor: themeMode === 'dark' ? '#D4A84B' : '#2563eb', color: '#ffffff' }}
                  />
                </button>
              </Dropdown>
            </div>
          </Header>

          <Content
            className="dashboard-content"
            style={{
              background: token.colorBgContainer,
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
          /* Compact persistent nav rail, never used for mobile navigation. */
          .dashboard-shell .ant-layout-sider-collapsed {
            flex: 0 0 56px !important;
            max-width: 56px !important;
            min-width: 56px !important;
            width: 56px !important;
          }
          .ant-layout-sider-collapsed .ant-menu-item,
          .ant-layout-sider-collapsed .ant-menu-submenu-title {
            padding-inline: 0 !important;
            margin-inline: 3px !important;
            justify-content: center !important;
            text-align: center !important;
          }
          .ant-layout-sider-collapsed .ant-menu-item .anticon,
          .ant-layout-sider-collapsed .ant-menu-submenu-title .anticon {
            margin-inline: 0 !important;
            font-size: 16px !important;
          }
          .ant-layout-sider-collapsed .ant-menu-submenu-title .ant-menu-submenu-arrow {
            display: none !important;
          }
          /* Keep root labels available to assistive technology while preventing
             them from escaping the compact rail. The direct-child selectors are
             intentional: flyout labels remain visible inside the Sider portal. */
          .dashboard-sider.ant-layout-sider-collapsed .antd-custom-menu > .ant-menu-item > .ant-menu-title-content,
          .dashboard-sider.ant-layout-sider-collapsed
            .antd-custom-menu
            > .ant-menu-submenu
            > .ant-menu-submenu-title
            > .ant-menu-title-content {
            margin-inline-start: 0 !important;
            clip: rect(0 0 0 0);
            clip-path: inset(50%);
            height: 1px !important;
            overflow: hidden;
            position: absolute !important;
            white-space: nowrap;
            width: 1px !important;
          }
          .antd-custom-menu .ant-menu-item,
          .antd-custom-menu .ant-menu-submenu-title {
            height: 36px !important;
            display: flex !important;
            align-items: center !important;
            line-height: 1.25 !important;
            margin-block: 2px !important;
            margin-inline: 4px !important;
            border-radius: 8px !important;
          }
          .antd-custom-menu .ant-menu-item-group-list > .ant-menu-item,
          .antd-custom-menu .ant-menu-item-group-list > .ant-menu-submenu > .ant-menu-submenu-title {
            padding-inline: 10px !important;
          }
          .antd-custom-menu .ant-menu-title-content {
            display: flex !important;
            align-items: center !important;
            min-width: 0;
            line-height: 1.25 !important;
          }
          .antd-custom-menu .ant-menu-item .anticon,
          .antd-custom-menu .ant-menu-submenu-title .anticon {
            font-size: 15px !important;
            line-height: 1 !important;
          }
          .antd-custom-menu .ant-menu-submenu-title .ant-menu-submenu-arrow {
            margin-top: 0 !important;
            inset-inline-end: 10px !important;
          }
          .antd-custom-menu .sidebar-menu-chevron {
            display: block;
            flex: 0 0 auto;
          }
          .antd-custom-menu .ant-menu-submenu > .ant-menu-submenu-title {
            color: ${themeMode === 'dark' ? 'rgba(255, 255, 255, 0.76)' : 'rgba(0, 0, 0, 0.72)'} !important;
            background-color: ${themeMode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : 'rgba(0, 0, 0, 0.025)'} !important;
            font-weight: 600;
          }
          .antd-custom-menu .ant-menu-submenu-open > .ant-menu-submenu-title {
            color: ${themeMode === 'dark' ? '#e6c77a' : '#855b0e'} !important;
            background-color: ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.1)' : 'rgba(212, 168, 75, 0.1)'} !important;
          }
          .antd-custom-menu .ant-menu-submenu-title:hover {
            color: #d4a84b !important;
            background-color: ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.13)' : 'rgba(212, 168, 75, 0.09)'} !important;
          }
          .antd-custom-menu .ant-menu-item-group-title {
            margin: 8px 0 3px !important;
            padding: 0 4px !important;
          }
          .antd-custom-menu .ant-menu-item-group-list {
            margin: 0 !important;
            padding: 0 !important;
          }
          .antd-custom-menu .sidebar-group-title {
            align-items: center;
            border-radius: 8px;
            display: flex;
            font-size: 9px;
            gap: 8px;
            justify-content: space-between;
            letter-spacing: 0.075em;
            min-height: 28px;
            padding: 0 8px;
            width: 100%;
          }
          .antd-custom-menu .sidebar-group-title:hover,
          .antd-custom-menu .sidebar-group-title[aria-expanded='false'] {
            background: ${themeMode === 'dark' ? 'rgba(255, 255, 255, 0.045)' : 'rgba(0, 0, 0, 0.04)'} !important;
            color: ${themeMode === 'dark' ? 'rgba(255, 255, 255, 0.78)' : 'rgba(0, 0, 0, 0.78)'} !important;
          }
          .antd-custom-menu .sidebar-group-title:focus-visible {
            box-shadow: 0 0 0 2px var(--mos-focus-ring);
            outline: none;
          }
          .antd-custom-menu .sidebar-group-title__label {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .antd-custom-menu .sidebar-group-title__meta {
            align-items: center;
            display: inline-flex;
            flex: 0 0 auto;
            gap: 5px;
          }
          .antd-custom-menu .sidebar-group-title__count {
            align-items: center;
            background: ${themeMode === 'dark' ? 'rgba(255, 255, 255, 0.075)' : 'rgba(0, 0, 0, 0.06)'};
            border-radius: 999px;
            display: inline-flex;
            font-size: 9px;
            font-variant-numeric: tabular-nums;
            height: 17px;
            justify-content: center;
            letter-spacing: 0;
            min-width: 17px;
            padding-inline: 4px;
          }
          .antd-custom-menu .sidebar-menu-parent-label,
          .antd-custom-menu .sidebar-menu-label {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .antd-custom-menu .ant-menu-sub.ant-menu-inline {
            background: transparent !important;
            border-inline-start: 1px solid ${themeMode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'};
            margin: 2px 7px 5px 20px !important;
            padding: 1px 0 1px 7px !important;
          }
          .antd-custom-menu .ant-menu-sub.ant-menu-inline > .ant-menu-item,
          .antd-custom-menu .ant-menu-sub.ant-menu-inline > .ant-menu-submenu > .ant-menu-submenu-title {
            font-size: 12px !important;
            height: 32px !important;
            margin-inline: 0 !important;
            padding-inline: 9px !important;
          }
          .antd-custom-menu .ant-menu-sub.ant-menu-inline > .ant-menu-item .anticon,
          .antd-custom-menu .ant-menu-sub.ant-menu-inline > .ant-menu-submenu > .ant-menu-submenu-title .anticon {
            font-size: 13px !important;
          }
          .antd-custom-menu .sidebar-menu-entry--nested {
            position: relative;
          }
          .antd-custom-menu .sidebar-menu-entry--nested::before {
            background: ${themeMode === 'dark' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.18)'};
            border-radius: 999px;
            content: '';
            height: 3px;
            inset-inline-start: -9px;
            position: absolute;
            width: 3px;
          }
          .antd-custom-menu .sidebar-menu-entry--nested.ant-menu-item-selected::before {
            background: #d4a84b;
            height: 18px;
            width: 3px;
          }
          .antd-custom-menu .sidebar-menu-live-label {
            align-items: center;
            display: flex;
            gap: 6px;
            justify-content: space-between;
            min-width: 0;
            width: 100%;
          }
          .antd-custom-menu .sidebar-menu-live-dot {
            background: #10b981;
            border-radius: 999px;
            flex: 0 0 auto;
            height: 6px;
            width: 6px;
          }

          .dashboard-mobile-nav .antd-custom-menu .sidebar-group-title {
            min-height: 40px;
          }
          .dashboard-mobile-nav .antd-custom-menu .ant-menu-item,
          .dashboard-mobile-nav .antd-custom-menu .ant-menu-submenu-title,
          .dashboard-mobile-nav .antd-custom-menu .ant-menu-sub.ant-menu-inline > .ant-menu-item {
            height: 44px !important;
          }

          /* The compact navigation is a purpose-built rail rather than a
             squeezed inline menu. Only top-level destinations are rendered. */
          .sidebar-compact-nav {
            padding: 6px 0 12px;
            width: 100%;
          }
          .sidebar-compact-list {
            align-items: center;
            display: flex;
            flex-direction: column;
            list-style: none;
            margin: 0;
            padding: 0;
            width: 100%;
          }
          .sidebar-compact-item {
            height: 40px;
            margin: 3px 0;
            width: 40px;
          }
          .sidebar-rail-action {
            align-items: center;
            background: transparent;
            border: 0;
            border-radius: 10px;
            color: ${themeMode === 'dark' ? 'rgba(255, 255, 255, 0.68)' : 'rgba(15, 23, 42, 0.68)'};
            cursor: pointer;
            display: flex;
            height: 40px;
            justify-content: center;
            padding: 0;
            position: relative;
            transition:
              background 0.16s ease,
              color 0.16s ease,
              transform 0.16s ease;
            width: 40px;
          }
          .sidebar-rail-action:hover {
            background: ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.14)' : 'rgba(212, 168, 75, 0.1)'};
            color: #d4a84b;
            transform: translateY(-1px);
          }
          .sidebar-rail-action:focus-visible {
            box-shadow: 0 0 0 2px var(--mos-focus-ring);
            outline: none;
          }
          .sidebar-rail-action--active {
            background: ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.18)' : 'rgba(212, 168, 75, 0.13)'};
            box-shadow: inset 3px 0 0 #d4a84b;
            color: #d4a84b;
          }
          .sidebar-rail-action__icon {
            align-items: center;
            display: inline-flex;
            font-size: 17px;
            justify-content: center;
            line-height: 1;
          }
          .sidebar-rail-action__icon .anticon,
          .sidebar-rail-action__icon .mos-app-icon {
            color: inherit;
            font-size: 17px;
            height: 17px;
            margin: 0;
            width: 17px;
          }
          .sidebar-rail-action__submenu-indicator {
            color: ${themeMode === 'dark' ? 'rgba(255, 255, 255, 0.42)' : 'rgba(15, 23, 42, 0.42)'};
            inset-inline-end: 2px;
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            transition:
              color 0.16s ease,
              transform 0.16s ease;
          }
          .sidebar-rail-action:hover .sidebar-rail-action__submenu-indicator,
          .sidebar-rail-action--active .sidebar-rail-action__submenu-indicator {
            color: #d4a84b;
            transform: translate(1px, -50%);
          }
          .sidebar-rail-divider {
            background: ${themeMode === 'dark' ? 'rgba(255, 255, 255, 0.13)' : 'rgba(15, 23, 42, 0.13)'};
            flex: 0 0 1px;
            height: 1px;
            margin: 7px 0;
            width: 24px;
          }

          /* Compact submenus open as labelled flyouts. This restores hierarchy
             without forcing chevrons or text into the rail itself. */
          .sidebar-rail-flyout.ant-menu-submenu-popup {
            padding-inline-start: 6px;
          }
          .sidebar-rail-flyout .ant-popover-inner {
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .sidebar-rail-flyout .ant-popover-inner-content {
            padding: 0 !important;
          }
          .sidebar-rail-flyout .sidebar-rail-flyout-menu,
          .sidebar-rail-flyout.ant-menu-submenu-popup > .ant-menu {
            background: ${themeMode === 'dark' ? '#111827' : '#ffffff'} !important;
            border: 1px solid ${themeMode === 'dark' ? 'rgba(255, 255, 255, 0.14)' : 'rgba(15, 23, 42, 0.13)'};
            border-radius: 12px !important;
            box-shadow: ${
              themeMode === 'dark' ? '0 14px 36px rgba(0, 0, 0, 0.5)' : '0 14px 36px rgba(15, 23, 42, 0.18)'
            };
            min-width: 224px;
            padding: 6px !important;
          }
          .sidebar-rail-flyout .sidebar-rail-flyout-group > .ant-menu-item-group-title {
            color: ${themeMode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.56)'} !important;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.07em;
            line-height: 1.25;
            padding: 8px 10px 6px !important;
            text-transform: uppercase;
          }
          .sidebar-rail-flyout .ant-menu-item,
          .sidebar-rail-flyout .ant-menu-submenu-title {
            align-items: center;
            border-radius: 8px !important;
            color: ${themeMode === 'dark' ? 'rgba(255, 255, 255, 0.86)' : 'rgba(15, 23, 42, 0.88)'} !important;
            display: flex;
            height: 38px !important;
            justify-content: flex-start !important;
            margin: 2px !important;
            padding-inline: 10px !important;
            text-align: start !important;
            width: calc(100% - 4px) !important;
          }
          .sidebar-rail-flyout .ant-menu-title-content {
            clip: auto !important;
            clip-path: none !important;
            color: inherit !important;
            display: flex !important;
            flex: 1 1 150px !important;
            height: auto !important;
            margin-inline-start: 10px !important;
            min-width: 150px !important;
            opacity: 1 !important;
            overflow: visible !important;
            position: static !important;
            transform: none !important;
            visibility: visible !important;
            white-space: nowrap;
            width: auto !important;
          }
          .sidebar-rail-flyout .sidebar-menu-label {
            clip: auto !important;
            clip-path: none !important;
            color: inherit !important;
            display: block !important;
            height: auto !important;
            opacity: 1 !important;
            overflow: visible !important;
            position: static !important;
            transform: none !important;
            visibility: visible !important;
            width: 100% !important;
          }
          .sidebar-rail-flyout .ant-menu-item-selected {
            background: ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.18)' : 'rgba(212, 168, 75, 0.13)'} !important;
            color: ${themeMode === 'dark' ? '#e6c77a' : '#855b0e'} !important;
          }
          .sidebar-rail-flyout .sidebar-menu-entry--nested::before {
            display: none;
          }

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
            transform: scale(1.04);
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
      <CvScheduleDrawer
        open={isCvDrawerOpen}
        onClose={() => setIsCvDrawerOpen(false)}
        currentDate={cvDrawerDate}
        onDateChange={(d) => setCvDrawerDate(d)}
      />
    </OmiCallProvider>
  );
}

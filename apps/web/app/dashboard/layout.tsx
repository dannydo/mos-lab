'use client';

import '../suppress-warnings';
import '../../components/layout/dashboard-shell.css';
import React, { useEffect, useState } from 'react';
import { Layout, theme } from 'antd';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import dayjs from 'dayjs';
import { isAdminOrSuperAdminRole, isCvRole } from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';
import { SeasonalAccentProvider } from '../../context/SeasonalAccentContext';
import { OmiCallProvider } from '../../context/OmiCallContext';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { DashboardSidebarShell } from '../../components/layout/DashboardSidebarShell';
import { DashboardHeaderBar } from '../../components/layout/DashboardHeaderBar';
import { useDashboardAuthAndGuard } from '../../components/layout/useDashboardAuthAndGuard';
import { useDashboardChatShell } from '../../components/layout/useDashboardChatShell';
import { useDashboardHeaderPolling } from '../../components/layout/useDashboardHeaderPolling';
import {
  getBugReportBadgeServerSnapshot,
  getBugReportBadgeSummary,
  subscribeBugReportBadgeSummary,
} from '../../lib/bug-diagnostics';

const TelesalesDashboardModal = dynamic(() => import('../../components/TelesalesDashboardModal'), { ssr: false });
const DailyCallsDrawer = dynamic(() => import('../../components/DailyCallsDrawer'), { ssr: false });
const CallLogModal = dynamic(() => import('../../components/CallLogModal'), { ssr: false });
const QuickSearchModal = dynamic(() => import('../../components/layout/QuickSearchModal'), { ssr: false });
const PendingAllocationModal = dynamic(
  () => import('../../components/allocation/PendingAllocationModal').then((m) => m.PendingAllocationModal),
  { ssr: false }
);
const CvScheduleDrawer = dynamic(
  () => import('./schedule-calendar/components/CvScheduleDrawer').then((m) => m.CvScheduleDrawer),
  { ssr: false }
);
const BookingWizardDrawer = dynamic(() => import('../../components/BookingWizardDrawer'), { ssr: false });
const OmiCallWidget = dynamic(() => import('../../components/OmiCallWidget'), { ssr: false });
const AvatarPromptModal = dynamic(() => import('../../components/avatar/AvatarPromptModal'), { ssr: false });
const MosGoogleChatPortal = dynamic(() => import('../../components/mos-chat/MosGoogleChatPortal'), { ssr: false });

const { Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { themeMode, toggleTheme, desktopDensity, setDesktopDensity } = useTheme();
  const { token } = theme.useToken();
  const responsiveTier = useResponsiveTier();
  const isMobileTier = responsiveTier === 'mobile';
  const isTabletTier = responsiveTier === 'tablet';
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
  const [isDailyCallsOpen, setIsDailyCallsOpen] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [isPendingAllocationOpen, setIsPendingAllocationOpen] = useState(false);
  const [isCvDrawerOpen, setIsCvDrawerOpen] = useState(false);
  const [isBookingWizardOpen, setIsBookingWizardOpen] = useState(false);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [cvDrawerDate, setCvDrawerDate] = useState(() => dayjs());

  const {
    user,
    loading,
    isImpersonating,
    routeVisibility,
    hasAuthenticatedUser,
    isCvAccount,
    handleAvatarUpdated,
    handleLogout,
    handleExitImpersonation,
  } = useDashboardAuthAndGuard(pathname);

  const chatShell = useDashboardChatShell(user?.role);
  const polling = useDashboardHeaderPolling(hasAuthenticatedUser, isCvAccount);

  const bugBadgeSummary = React.useSyncExternalStore(
    subscribeBugReportBadgeSummary,
    getBugReportBadgeSummary,
    getBugReportBadgeServerSnapshot
  );
  const bugAttentionCount = !isCvRole(user?.role)
    ? bugBadgeSummary.actionRequiredCount || bugBadgeSummary.unreadCount
    : 0;

  useEffect(() => {
    if (typeof window !== 'undefined' && !isCvAccount) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('telesalesModal') === 'true' || params.get('telesales_modal') === 'true') {
        setIsDashboardVisible(true);
      }
    }
  }, [isCvAccount]);

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

  return (
    <SeasonalAccentProvider>
      <OmiCallProvider>
        <Layout className="dashboard-shell" style={{ minHeight: '100dvh' }} suppressHydrationWarning>
          <DashboardSidebarShell
            isMobileTier={isMobileTier}
            collapsed={collapsed}
            persistentNavWidth={persistentNavWidth}
            isMobileNavigationOpen={isMobileNavigationOpen}
            onCloseMobileNavigation={() => setIsMobileNavigationOpen(false)}
            onToggleSidebar={toggleSidebar}
            themeMode={themeMode}
            user={user}
            mosChatUnreadCount={chatShell.mosChatUnreadCount}
            deployedAt={polling.deployedAt}
            onOpenChat={() => chatShell.openChatWithMode()}
          />

          <Layout style={{ background: token.colorBgLayout, minWidth: 0 }}>
            <DashboardHeaderBar
              themeMode={themeMode}
              onToggleTheme={toggleTheme}
              desktopDensity={desktopDensity}
              setDesktopDensity={setDesktopDensity}
              isMobileTier={isMobileTier}
              user={user}
              isCvAccount={isCvAccount}
              isImpersonating={isImpersonating}
              routeVisibility={routeVisibility}
              onlineMembers={polling.onlineMembers}
              workingCvCount={polling.workingCvCount}
              pendingAllocationCount={polling.pendingAllocationCount}
              dailyCallsCount={polling.dailyCallsCount}
              bugAttentionCount={bugAttentionCount}
              effectiveCanAccessMosChat={chatShell.effectiveCanAccessMosChat}
              chatDisplayMode={chatShell.chatDisplayMode}
              isMosChatOpen={chatShell.isMosChatOpen}
              mosChatUnreadCount={chatShell.mosChatUnreadCount}
              mosChatTaskCount={chatShell.mosChatTaskCount}
              isProfileSheetOpen={isProfileSheetOpen}
              onProfileSheetOpenChange={setIsProfileSheetOpen}
              onToggleSidebar={toggleSidebar}
              onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
              onOpenCvDrawer={() => setIsCvDrawerOpen(true)}
              onOpenBookingWizard={() => setIsBookingWizardOpen(true)}
              onOpenPendingAllocation={() => setIsPendingAllocationOpen(true)}
              onOpenDailyCalls={() => setIsDailyCallsOpen(true)}
              onOpenTelesalesMember={(memberId) => {
                setSelectedMemberId(memberId);
                setIsDashboardVisible(true);
              }}
              onExitImpersonation={handleExitImpersonation}
              onLogout={handleLogout}
              onAvatarUpdated={handleAvatarUpdated}
              onOpenChatWithMode={chatShell.openChatWithMode}
              onSetChatDisplayMode={chatShell.setAndPersistChatDisplayMode}
              onToggleEmbeddedChat={chatShell.toggleEmbeddedChat}
            />

            <Content
              className={`dashboard-content${
                pathname === '/dashboard/bug-reports' ||
                pathname?.startsWith('/dashboard/pilot-dark-lashes') ||
                pathname?.startsWith('/dashboard/telesale-target')
                  ? ' dashboard-content--full-width'
                  : ''
              }${
                pathname?.startsWith('/dashboard/telesale-target') ||
                pathname?.startsWith('/dashboard/pilot-dark-lashes')
                  ? ' dashboard-content--war-room'
                  : ''
              }`}
              style={{
                background:
                  pathname?.startsWith('/dashboard/telesale-target') ||
                  pathname?.startsWith('/dashboard/pilot-dark-lashes')
                    ? 'transparent'
                    : token.colorBgContainer,
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
              polling.fetchDailyCallsCount();
            }}
          />

          <PendingAllocationModal
            open={isPendingAllocationOpen}
            onClose={() => setIsPendingAllocationOpen(false)}
            onSuccessRefresh={polling.fetchPendingAllocationsCount}
          />

          <BookingWizardDrawer
            open={isBookingWizardOpen}
            onClose={() => setIsBookingWizardOpen(false)}
            onSuccess={() => setIsBookingWizardOpen(false)}
          />

          <QuickSearchModal open={isQuickSearchOpen} onClose={() => setIsQuickSearchOpen(false)} />
        </Layout>
        <OmiCallWidget />
        <CallLogModal />
        <CvScheduleDrawer
          open={isCvDrawerOpen}
          onClose={() => setIsCvDrawerOpen(false)}
          currentDate={cvDrawerDate}
          onDateChange={(d) => setCvDrawerDate(d)}
        />
        <AvatarPromptModal currentUser={user} onAvatarUpdated={handleAvatarUpdated} />
        {chatShell.hasEverOpenedEmbeddedChat && (hasAuthenticatedUser || isAdminOrSuperAdminRole(user?.role)) && (
          <ErrorBoundary fallback={null}>
            <MosGoogleChatPortal
              open={chatShell.isMosChatOpen}
              onOpen={() => chatShell.setIsMosChatOpen(true)}
              onClose={() => chatShell.setIsMosChatOpen(false)}
              onToggle={chatShell.toggleEmbeddedChat}
              currentUser={user}
              onAccessChange={chatShell.setCanAccessMosChat}
              targetNavigation={chatShell.targetChatNavigation}
              onUnreadCountChange={(unread, tasks) => {
                chatShell.setMosChatUnreadCount(unread);
                chatShell.setMosChatTaskCount(tasks);
              }}
            />
          </ErrorBoundary>
        )}
      </OmiCallProvider>
    </SeasonalAccentProvider>
  );
}

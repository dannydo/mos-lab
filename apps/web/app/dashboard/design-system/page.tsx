'use client';

import React from 'react';
import { Space, Tabs } from 'antd';
import { LayoutGrid, Network, Palette, Rocket, Smartphone } from 'lucide-react';
import ReadyKitsTab from '../../../components/design-system/ReadyKitsTab';
import UiExperienceControlTower from '../../../components/design-system/UiExperienceControlTower';
import { AppIcon, ContentSurface } from '../../../components/ui';
import { DesignSystemAccessGate } from './design-system-page-modules/DesignSystemAccessGate';
import { DesignSystemDemoOverlays } from './design-system-page-modules/DesignSystemDemoOverlays';
import { DesignSystemGraphifyTab } from './design-system-page-modules/DesignSystemGraphifyTab';
import { DesignSystemHeaderSection } from './design-system-page-modules/DesignSystemHeaderSection';
import { DesignSystemInventoryTab } from './design-system-page-modules/DesignSystemInventoryTab';
import { DesignSystemResponsiveTab } from './design-system-page-modules/DesignSystemResponsiveTab';
import { DesignSystemTokensTab } from './design-system-page-modules/DesignSystemTokensTab';
import { useDesignSystemPage } from './design-system-page-modules/useDesignSystemPage';

export default function DesignSystemPage() {
  const {
    coreThemeId,
    availableCoreThemes,
    setCoreThemeId,
    themeMode,
    toggleTheme,
    desktopDensity,
    effectiveDensity,
    setDesktopDensity,
    canManageThemes,
    responsiveTier,
    user,
    loading,
    isAdmin,
    activeTab,
    setActiveTab,
    auditFilter,
    setAuditFilter,
    studioOpen,
    setStudioOpen,
    activeDemoModal,
    setActiveDemoModal,
    adaptiveModalOpen,
    setAdaptiveModalOpen,
    adaptiveDrawerOpen,
    setAdaptiveDrawerOpen,
    counter,
    currentTokens,
    auditStats,
    filteredComponents,
    groupedCategories,
    navigateToArchitecture,
  } = useDesignSystemPage();

  if (loading || !user || !isAdmin) {
    return <DesignSystemAccessGate loading={loading} user={user} />;
  }

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <DesignSystemHeaderSection
        coreThemeId={coreThemeId}
        availableCoreThemes={availableCoreThemes}
        onCoreThemeChange={setCoreThemeId}
        canManageThemes={canManageThemes}
        onOpenStudio={() => setStudioOpen(true)}
        onNavigateArchitecture={navigateToArchitecture}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        auditStats={auditStats}
      />

      <ContentSurface className="shadow-md">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          items={[
            {
              key: 'control-tower',
              label: (
                <Space>
                  <AppIcon icon={Rocket} size={14} />
                  <span>UI Control Tower</span>
                </Space>
              ),
              children: <UiExperienceControlTower />,
            },
            {
              key: 'ready-kits',
              label: (
                <Space>
                  <AppIcon icon={LayoutGrid} size={14} />
                  <span>Lắp ráp nhanh</span>
                </Space>
              ),
              children: <ReadyKitsTab />,
            },
            {
              key: 'all-components',
              label: (
                <Space>
                  <AppIcon icon={LayoutGrid} size={14} />
                  <span className="tabular-nums">Inventory &amp; Audit ({filteredComponents.length})</span>
                </Space>
              ),
              children: (
                <DesignSystemInventoryTab
                  totalCount={auditStats.totalCount}
                  foundationCount={auditStats.foundationCount}
                  migratingCount={auditStats.migratingCount}
                  auditFilter={auditFilter}
                  onAuditFilterChange={setAuditFilter}
                  desktopDensity={desktopDensity}
                  effectiveDensity={effectiveDensity}
                  onDesktopDensityChange={setDesktopDensity}
                  responsiveTier={responsiveTier}
                  themeMode={themeMode}
                  groupedCategories={groupedCategories}
                  onOpenDemoModal={setActiveDemoModal}
                />
              ),
            },
            {
              key: 'tokens',
              label: (
                <Space>
                  <AppIcon icon={Palette} size={14} />
                  <span>Design Tokens Palette Engine</span>
                </Space>
              ),
              children: <DesignSystemTokensTab currentTokens={currentTokens} counter={counter} />,
            },
            {
              key: 'responsive-foundation',
              label: (
                <Space>
                  <AppIcon icon={Smartphone} size={14} />
                  <span>Responsive Foundation</span>
                </Space>
              ),
              children: (
                <DesignSystemResponsiveTab
                  responsiveTier={responsiveTier}
                  onOpenAdaptiveModal={() => setAdaptiveModalOpen(true)}
                  onOpenAdaptiveDrawer={() => setAdaptiveDrawerOpen(true)}
                />
              ),
            },
            {
              key: 'graphify',
              label: (
                <Space>
                  <AppIcon icon={Network} size={14} />
                  <span>Knowledge Graph Sync</span>
                </Space>
              ),
              children: <DesignSystemGraphifyTab onNavigateArchitecture={navigateToArchitecture} />,
            },
          ]}
        />
      </ContentSurface>

      <DesignSystemDemoOverlays
        activeDemoModal={activeDemoModal}
        onCloseDemoModal={() => setActiveDemoModal(null)}
        adaptiveModalOpen={adaptiveModalOpen}
        onCloseAdaptiveModal={() => setAdaptiveModalOpen(false)}
        adaptiveDrawerOpen={adaptiveDrawerOpen}
        onCloseAdaptiveDrawer={() => setAdaptiveDrawerOpen(false)}
        canManageThemes={canManageThemes}
        studioOpen={studioOpen}
        onCloseStudio={() => setStudioOpen(false)}
      />
    </div>
  );
}

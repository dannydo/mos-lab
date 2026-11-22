'use client';

import '../suppress-warnings';
import React, { useRef } from 'react';
import { Card, Typography } from 'antd';
import { isLocalDevLoginEnabled } from './login-page-modules/loginConstants';
import { useLoginAuth } from './login-page-modules/useLoginAuth';
import { useDevDirectoryLogin } from './login-page-modules/useDevDirectoryLogin';
import { DevMockLoginPanel } from './login-page-modules/DevMockLoginPanel';
import { PasswordLoginSection } from './login-page-modules/PasswordLoginSection';
import { SuperAdminDevAuthModal } from './login-page-modules/SuperAdminDevAuthModal';

const { Text } = Typography;

export default function LoginPage() {
  const enableMockOnSwitchRef = useRef<() => void>(() => {});

  const { loading, showPasswordForm, setShowPasswordForm, executeLogin, onFinish } = useLoginAuth({
    onSwitchAccountEnableMock: () => enableMockOnSwitchRef.current(),
  });

  const devDirectory = useDevDirectoryLogin({ executeLogin });
  enableMockOnSwitchRef.current = () => devDirectory.setShowMockOptions(true);

  return (
    <div className="flex items-center justify-center min-h-screen p-5 bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-[450px] max-w-full rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] bg-[var(--mos-bg-container)] border border-[var(--mos-border-secondary)] box-border overflow-hidden">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex items-center justify-center w-[70px] h-[70px] rounded-full bg-[var(--mos-accent)] text-[28px] text-[var(--mos-accent-contrast)] font-bold shadow-[0_0_15px_rgba(212,168,75,0.4)]">
            W
          </div>
          <h3 className="m-0 text-2xl font-semibold text-[var(--mos-accent)] leading-snug">WINGS LASHES</h3>
          <Text className="text-[var(--mos-text-muted)]">Living Lab CRM — Telesales Portal</Text>
        </div>

        <div className="flex flex-col items-center gap-3 w-full box-border">
          {/* Real Google GIS button */}
          <div id="google-signin-btn" className="min-h-[40px] w-full flex justify-center" />

          {/* Dev Mock login selection */}
          {isLocalDevLoginEnabled && (
            <DevMockLoginPanel
              loading={loading}
              showMockOptions={devDirectory.showMockOptions}
              onOpenMockOptions={() => devDirectory.setShowMockOptions(true)}
              onCloseMockOptions={devDirectory.handleResetMockOptions}
              loadingStaffs={devDirectory.loadingStaffs}
              devStaffs={devDirectory.devStaffs}
              selectedCategory={devDirectory.selectedCategory}
              selectedCategoryTotalCount={devDirectory.selectedCategoryTotalCount}
              filteredCategoryUsers={devDirectory.filteredCategoryUsers}
              staffSearchText={devDirectory.staffSearchText}
              onStaffSearchTextChange={devDirectory.setStaffSearchText}
              mockEmail={devDirectory.mockEmail}
              onMockEmailChange={devDirectory.setMockEmail}
              onRoleCategoryClick={devDirectory.handleRoleCategoryClick}
              onBackToCategories={devDirectory.handleBackToCategories}
              onUserSelect={devDirectory.handleUserSelect}
              onCustomInputSubmit={devDirectory.handleCustomInputSubmit}
            />
          )}
        </div>

        <PasswordLoginSection
          loading={loading}
          showPasswordForm={showPasswordForm}
          onShowPasswordForm={() => setShowPasswordForm(true)}
          onHidePasswordForm={() => setShowPasswordForm(false)}
          onFinish={onFinish}
        />
      </Card>

      <SuperAdminDevAuthModal
        target={devDirectory.superAdminTarget}
        password={devDirectory.superAdminPass}
        loading={loading}
        onPasswordChange={devDirectory.setSuperAdminPass}
        onConfirm={devDirectory.handleConfirmSuperAdminLogin}
        onCancel={devDirectory.handleCloseSuperAdminModal}
      />
    </div>
  );
}

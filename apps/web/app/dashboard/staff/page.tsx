'use client';

import '../../suppress-warnings';
import React from 'react';
import { Form, message, theme } from 'antd';
import { isAdminOrSuperAdminRole, isHrOrAdminRole, isSuperAdminRole } from '@mos-lab/shared';
import { SendOnboardingEmailModal } from '~/components/staff/SendOnboardingEmailModal';
import { useTheme } from '../../../context/ThemeContext';
import { getRoleColumns, getStaffColumns } from './components/StaffColumns';
import { useStaffData } from './hooks/useStaffData';
import { MergeStaffModal } from './staff-page-modules/MergeStaffModal';
import { RoleFormModal } from './staff-page-modules/RoleFormModal';
import { StaffBulkActionBar } from './staff-page-modules/StaffBulkActionBar';
import { StaffDetailDrawer } from './staff-page-modules/StaffDetailDrawer';
import { StaffDirectoryTabs } from './staff-page-modules/StaffDirectoryTabs';
import { StaffFormModal } from './staff-page-modules/StaffFormModal';
import { StaffPageHeader } from './staff-page-modules/StaffPageHeader';
import { useStaffPageExtras } from './staff-page-modules/useStaffPageExtras';

export default function StaffPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [staffForm] = Form.useForm();
  const [roleForm] = Form.useForm();

  const {
    activeTab,
    setActiveTab,
    staffList,
    activeCount,
    lockedCount,
    currentUser,
    roles,
    loading,
    rolesLoading,
    legacyStaffList,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchQuery,
    setSearchQuery,
    filterRole,
    setFilterRole,
    setFilterStatus,
    isStaffModalOpen,
    setIsStaffModalOpen,
    editingStaff,
    staffSubmitting,
    isDrawerOpen,
    setIsDrawerOpen,
    selectedStaff,
    isRoleModalOpen,
    setIsRoleModalOpen,
    editingRole,
    roleSubmitting,
    selectedRowKeys,
    setSelectedRowKeys,
    selectedBulkRole,
    setSelectedBulkRole,
    bulkSubmitting,
    handleClearSelection,
    handleBulkUpdateRole,
    handleBulkToggleActive,
    isMergeModalOpen,
    setIsMergeModalOpen,
    targetMergeStaffId,
    setTargetMergeStaffId,
    mergeSubmitting,
    handleOpenMergeModal,
    handleConfirmMerge,
    openStaffModal,
    handleStaffSubmit,
    handleToggleActive,
    handleDeleteStaff,
    handleImpersonate,
    openStaffDetails,
    openRoleModal,
    handleRoleSubmit,
    handleDeleteRole,
    syncing,
    handleSyncLegacyStaff,
    fetchStaff,
  } = useStaffData({
    staffForm,
    roleForm,
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
  });

  const canManageStaff = isAdminOrSuperAdminRole(currentUser?.role);
  const isHrOrAdmin = isHrOrAdminRole(currentUser?.role);
  const isSuperAdmin = isSuperAdminRole(currentUser?.role);
  const assignableRoles = roles.filter((role) => role.key !== 'super_admin' || isSuperAdmin);

  const {
    auditLogs,
    loadingAuditLogs,
    isOnboardingEmailModalOpen,
    emailModalStaff,
    emailModalBulkList,
    handleOpenSingleEmailModal,
    handleOpenBulkEmailModal,
    handleCloseOnboardingEmailModal,
  } = useStaffPageExtras({
    isDrawerOpen,
    selectedStaffId: selectedStaff?.id,
    staffList,
    selectedRowKeys,
  });

  const staffColumns = getStaffColumns({
    currentPage,
    pageSize,
    roles,
    token,
    handleToggleActive,
    handleImpersonate,
    openStaffDetails,
    openStaffModal,
    handleDeleteStaff,
    openSendEmailModal: isHrOrAdmin ? handleOpenSingleEmailModal : undefined,
    currentUser,
    onRoleClick: (roleKey) => {
      setCurrentPage(1);
      setFilterRole(roleKey);
    },
  });

  const roleColumns = getRoleColumns({
    themeMode,
    openRoleModal,
    handleDeleteRole,
    canManageSuperAdmin: isSuperAdmin,
  });

  const handleSearchQueryChange = (value: string) => {
    setCurrentPage(1);
    setSearchQuery(value);
  };

  const handleFilterRoleChange = (value: string) => {
    setCurrentPage(1);
    setFilterRole(value);
  };

  const handleClearDirectoryFilters = () => {
    setCurrentPage(1);
    setSearchQuery('');
    setFilterRole('all');
    setFilterStatus('all');
  };

  const handlePaginationChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
    localStorage.setItem('mos_staff_pageSize', String(size));
  };

  return (
    <div className="responsive-page responsive-workspace staff-page p-1">
      <StaffPageHeader
        activeTab={activeTab}
        canManageStaff={canManageStaff}
        syncing={syncing}
        onSyncLegacyStaff={handleSyncLegacyStaff}
        onAddStaff={() => openStaffModal(null)}
        onAddRole={() => openRoleModal(null)}
      />

      <StaffDirectoryTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeCount={activeCount}
        lockedCount={lockedCount}
        roles={roles}
        rolesLoading={rolesLoading}
        staffList={staffList}
        staffColumns={staffColumns}
        roleColumns={roleColumns}
        loading={loading}
        canManageStaff={canManageStaff}
        selectedRowKeys={selectedRowKeys}
        onSelectedRowKeysChange={setSelectedRowKeys}
        currentPage={currentPage}
        pageSize={pageSize}
        onPaginationChange={handlePaginationChange}
        searchQuery={searchQuery}
        filterRole={filterRole}
        onSearchQueryChange={handleSearchQueryChange}
        onFilterRoleChange={handleFilterRoleChange}
        onClearFilters={handleClearDirectoryFilters}
      />

      <StaffBulkActionBar
        canManageStaff={canManageStaff}
        isHrOrAdmin={isHrOrAdmin}
        selectedRowKeys={selectedRowKeys}
        assignableRoles={assignableRoles}
        selectedBulkRole={selectedBulkRole}
        onSelectedBulkRoleChange={setSelectedBulkRole}
        bulkSubmitting={bulkSubmitting}
        onBulkUpdateRole={() => handleBulkUpdateRole()}
        onBulkToggleActive={handleBulkToggleActive}
        onOpenBulkEmailModal={handleOpenBulkEmailModal}
        onOpenMergeModal={handleOpenMergeModal}
        onClearSelection={handleClearSelection}
      />

      <StaffFormModal
        open={isStaffModalOpen}
        staffForm={staffForm}
        editingStaff={editingStaff}
        submitting={staffSubmitting}
        roles={roles}
        legacyStaffList={legacyStaffList}
        currentUser={currentUser}
        onCancel={() => setIsStaffModalOpen(false)}
        onSubmit={handleStaffSubmit}
      />

      <RoleFormModal
        open={isRoleModalOpen}
        roleForm={roleForm}
        editingRole={editingRole}
        submitting={roleSubmitting}
        onCancel={() => setIsRoleModalOpen(false)}
        onSubmit={handleRoleSubmit}
      />

      <StaffDetailDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedStaff={selectedStaff}
        roles={roles}
        legacyStaffList={legacyStaffList}
        currentUser={currentUser}
        isHrOrAdmin={isHrOrAdmin}
        canManageStaff={canManageStaff}
        auditLogs={auditLogs}
        loadingAuditLogs={loadingAuditLogs}
      />

      <MergeStaffModal
        open={isMergeModalOpen}
        staffList={staffList}
        selectedRowKeys={selectedRowKeys}
        targetMergeStaffId={targetMergeStaffId}
        mergeSubmitting={mergeSubmitting}
        onTargetMergeStaffChange={setTargetMergeStaffId}
        onCancel={() => setIsMergeModalOpen(false)}
        onConfirmMerge={handleConfirmMerge}
      />

      <SendOnboardingEmailModal
        open={isOnboardingEmailModalOpen}
        onClose={handleCloseOnboardingEmailModal}
        staff={emailModalStaff}
        bulkStaffList={emailModalBulkList}
        roles={roles}
        onSuccess={(msg) => {
          message.success(msg);
          handleClearSelection();
          fetchStaff();
        }}
      />
    </div>
  );
}

'use client';

import React from 'react';
import { Tabs } from 'antd';
import { BuildOutlined, FileTextOutlined, AlertOutlined, BarChartOutlined, TrophyOutlined } from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';
import {
  useQaShopState,
  STORE_BRANCHES,
  QaHeaderMetrics,
  QaChecklistTab,
  QaAuditsTab,
  QaTicketsTab,
  QaAnalyticsTab,
  QaMobileFocusOverlay,
  AuditDetailDrawer,
  ActionTicketModal,
  AuditReviewModal,
  ManageItemsModal,
  EditItemModal,
  CameraCaptureModal,
  ImagePreviewModal,
} from '~/components/qa-shop';
import { FullBranchAuditReportTab } from './components/FullBranchAuditReportTab';
import styles from './qa-shop.module.css';

export default function QaShopPage() {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const state = useQaShopState();

  return (
    <div
      className={`responsive-page responsive-workspace qa-shop-page ${styles.qaPage} p-3 sm:p-6 space-y-3 sm:space-y-5`}
      style={{ background: isDark ? '#0a0a0a' : '#f8fafc', minHeight: '100vh' }}
    >
      {/* Top Header & Metric Counters Bar */}
      <QaHeaderMetrics
        isDark={isDark}
        analytics={state.analytics}
        auditsCount={state.audits.length}
        openTicketsCount={state.tickets.filter((t) => t.status !== 'VERIFIED').length}
        isSavingAudit={state.isSavingAudit}
        onSaveAudit={state.handleSaveChecklistAudit}
        onRefresh={state.fetchData}
        selectedBranch={state.selectedBranch}
        onSelectBranch={state.setSelectedBranch}
        selectedShift={state.selectedShift}
        onSelectShift={state.setSelectedShift}
        auditorName={state.auditorName}
        onSelectAuditor={state.setAuditorName}
        qaStaffList={state.qaStaffList}
        isMobileFocusMode={state.isMobileFocusMode}
        onToggleMobileFocusMode={() => state.setIsMobileFocusMode((prev) => !prev)}
        isMobileScreen={state.isMobileScreen}
        requireAllPhotos={state.requireAllPhotos}
        onToggleRequireAllPhotos={state.setRequireAllPhotos}
        isEditMode={state.isEditMode}
        onToggleEditMode={state.setIsEditMode}
        onOpenManageModal={() => state.setIsManageModalOpen(true)}
        onOpenAddItemModal={() => state.handleOpenItemModal()}
        inspectionStats={state.inspectionStats}
        hasRecordedInspectionResult={state.hasRecordedInspectionResult}
        inspectionProgressLabel={state.inspectionProgressLabel}
      />

      {/* Main Tabs Container */}
      <div
        className={`${styles.tabsShell} p-3 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200`}
        style={{ background: isDark ? '#141414' : '#ffffff' }}
      >
        <Tabs
          activeKey={state.activeTab}
          onChange={state.setActiveTab}
          type="line"
          className={styles.mainTabs}
          items={[
            {
              key: 'checklist',
              label: (
                <span
                  className={`${styles.tabLabel} flex items-center gap-1.5 text-xs font-medium`}
                  title="Bảng Kiểm Tra Từng Phần"
                >
                  <BuildOutlined />
                  <span className={styles.tabDesktopLabel}>Bảng Kiểm Tra Từng Phần ({state.selectedBranch})</span>
                  <span className={styles.tabMobileLabel}>Kiểm tra</span>
                </span>
              ),
              children: (
                <QaChecklistTab
                  activeTemplate={state.activeTemplate}
                  selectedBranch={state.selectedBranch}
                  groupedAreas={state.groupedAreas}
                  itemStatuses={state.itemStatuses}
                  setItemStatuses={state.setItemStatuses}
                  itemNotesRef={state.itemNotesRef}
                  requireAllPhotos={state.requireAllPhotos}
                  isEditMode={state.isEditMode}
                  onOpenItemModal={state.handleOpenItemModal}
                  onDeleteItem={state.handleDeleteItem}
                  onFileInputChange={state.handleFileInputChange}
                />
              ),
            },
            {
              key: 'audits',
              label: (
                <span
                  className={`${styles.tabLabel} flex items-center gap-1.5 text-xs font-medium`}
                  title="Nhật Ký Biên Bản"
                >
                  <FileTextOutlined />
                  <span className={styles.tabDesktopLabel}>Nhật Ký Biên Bản ({state.audits.length})</span>
                  <span className={styles.tabMobileLabel}>Biên bản</span>
                </span>
              ),
              children: (
                <QaAuditsTab
                  audits={state.audits}
                  loading={state.loading}
                  page={state.auditTabNextPage}
                  pageSize={state.auditTabNextSize}
                  onPageChange={(p, s) => {
                    state.setAuditTabNextPage(p);
                    if (s && s !== state.auditTabNextSize) {
                      state.setAuditTabNextSize(s);
                      state.setAuditTabNextPage(1);
                    }
                  }}
                  onSelectAudit={state.setSelectedAudit}
                  onOpenReviewModal={() => state.setAuditReviewModalOpen(true)}
                />
              ),
            },
            {
              key: 'tickets',
              label: (
                <span
                  className={`${styles.tabLabel} flex items-center gap-1.5 text-xs font-medium`}
                  title="Lỗi Vi Phạm"
                >
                  <AlertOutlined />
                  <span className={styles.tabDesktopLabel}>Lỗi Vi Phạm ({state.tickets.length})</span>
                  <span className={styles.tabMobileLabel}>Lỗi</span>
                </span>
              ),
              children: (
                <QaTicketsTab
                  tickets={state.tickets}
                  loading={state.loading}
                  page={state.ticketTabNextPage}
                  pageSize={state.ticketTabNextSize}
                  onPageChange={(p, s) => {
                    state.setTicketTabNextPage(p);
                    if (s && s !== state.ticketTabNextSize) {
                      state.setTicketTabNextSize(s);
                      state.setTicketTabNextPage(1);
                    }
                  }}
                  ticketForm={state.ticketForm}
                  onSelectTicket={state.setSelectedTicket}
                  onOpenTicketModal={() => state.setIsTicketModalOpen(true)}
                />
              ),
            },
            {
              key: 'full-branch-report',
              label: (
                <span
                  className={`${styles.tabLabel} flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400`}
                  title="Báo Cáo Full Audit"
                >
                  <BarChartOutlined />
                  <span className={styles.tabDesktopLabel}>Báo Cáo Full Audit (Passed & Failed)</span>
                  <span className={styles.tabMobileLabel}>Báo cáo</span>
                </span>
              ),
              children: (
                <FullBranchAuditReportTab
                  selectedBranchCode={state.selectedBranch}
                  branches={STORE_BRANCHES}
                  audits={state.audits}
                  activeTemplate={state.activeTemplate}
                  itemStatuses={state.itemStatuses}
                  themeMode={themeMode}
                />
              ),
            },
            {
              key: 'analytics',
              label: (
                <span
                  className={`${styles.tabLabel} flex items-center gap-1.5 text-xs font-medium`}
                  title="Xếp Hạng Chi Nhánh"
                >
                  <TrophyOutlined />
                  <span className={styles.tabDesktopLabel}>Xếp Hạng Chi Nhánh</span>
                  <span className={styles.tabMobileLabel}>Xếp hạng</span>
                </span>
              ),
              children: <QaAnalyticsTab isDark={isDark} />,
            },
          ]}
        />
      </div>

      {/* Drawer: Audit Detail */}
      <AuditDetailDrawer
        open={state.isDrawerOpen}
        onClose={() => state.setIsDrawerOpen(false)}
        selectedAudit={state.selectedAudit}
      />

      {/* Modal: Update Ticket */}
      <ActionTicketModal
        open={state.isTicketModalOpen}
        form={state.ticketForm}
        onCancel={() => state.setIsTicketModalOpen(false)}
        onOk={state.handleUpdateTicket}
      />

      {/* Dedicated Audit Review Modal / Mobile Drawer */}
      <AuditReviewModal
        open={state.auditReviewModalOpen}
        selectedAudit={state.selectedAudit}
        isMobileScreen={state.isMobileScreen}
        reviewFilterTab={state.reviewFilterTab}
        setReviewFilterTab={state.setReviewFilterTab}
        onPreviewPhoto={(url) => state.setPreviewImageUrl(url)}
        onClose={() => state.setAuditReviewModalOpen(false)}
      />

      {/* Modal: Manage Checklist Items Table */}
      <ManageItemsModal
        open={state.isManageModalOpen}
        selectedBranch={state.selectedBranch}
        activeTemplate={state.activeTemplate}
        manageSearchText={state.manageSearchText}
        onSearchChange={state.setManageSearchText}
        onAddNewItem={() => state.handleOpenItemModal()}
        onEditItem={(record, secId) => state.handleOpenItemModal(record, secId)}
        onDeleteItem={state.handleDeleteItem}
        onClose={() => state.setIsManageModalOpen(false)}
      />

      {/* Modal: Create & Edit Item Form */}
      <EditItemModal
        open={state.isItemModalOpen}
        form={state.crudForm}
        editingItem={state.editingItem}
        activeTemplate={state.activeTemplate}
        onCancel={() => state.setIsItemModalOpen(false)}
        onOk={state.handleSaveItem}
      />

      {/* Modal: WebRTC Live Camera Capture */}
      <CameraCaptureModal
        open={state.isCameraModalOpen}
        activeItemId={state.activeItemIdForCamera}
        cameraStream={state.cameraStream}
        cameraError={state.cameraError}
        isCameraLoading={state.isCameraLoading}
        videoRef={state.videoRef}
        onClose={state.closeCameraModal}
        onCapture={state.captureLivePhoto}
      />

      {/* Modal: Image Full Preview */}
      <ImagePreviewModal previewImageUrl={state.previewImageUrl} onClose={() => state.setPreviewImageUrl(null)} />

      {/* Mobile Dedicated Fullscreen Focus Overlay */}
      <QaMobileFocusOverlay
        isMobileFocusMode={state.isMobileFocusMode}
        onCloseMobileFocusMode={() => state.setIsMobileFocusMode(false)}
        selectedBranch={state.selectedBranch}
        selectedShift={state.selectedShift}
        auditorName={state.auditorName}
        inspectionStats={state.inspectionStats}
        hasRecordedInspectionResult={state.hasRecordedInspectionResult}
        inspectionProgressLabel={state.inspectionProgressLabel}
        activeTemplate={state.activeTemplate}
        groupedAreas={state.groupedAreas}
        itemStatuses={state.itemStatuses}
        setItemStatuses={state.setItemStatuses}
        itemNotesRef={state.itemNotesRef}
        onSaveAudit={state.handleSaveChecklistAudit}
        isSavingAudit={state.isSavingAudit}
        onFileInputChange={state.handleFileInputChange}
      />
    </div>
  );
}

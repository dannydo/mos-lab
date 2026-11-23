'use client';

import React from 'react';
import { Tabs, message } from 'antd';
import { BookOpen } from 'lucide-react';
import type { AcademyFollowUpTask, AcademyLead } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { AppIcon, FeaturePage, SearchField, StatePanel, StatusTag } from '../../../components/ui';
import AcademyLeadDrawer from './components/AcademyLeadDrawer';
import { useAcademyAccess } from './components/AcademyAccessGate';
import { type AcademyWorkspaceTab, useAcademySalesWorkspace } from './hooks/useAcademySalesWorkspace';
import { AcademyKnowledgeDrawer } from './academy-leads-page-modules/AcademyKnowledgeDrawer';
import { AcademyKnowledgeSection } from './academy-leads-page-modules/AcademyKnowledgeSection';
import { AcademyLeadsDataSection } from './academy-leads-page-modules/AcademyLeadsDataSection';
import { AcademyLeadsFilters } from './academy-leads-page-modules/AcademyLeadsFilters';
import { AcademyLeadsHeaderActions } from './academy-leads-page-modules/AcademyLeadsHeaderActions';
import { AcademyLeadsMetrics } from './academy-leads-page-modules/AcademyLeadsMetrics';
import {
  extractApiErrorMessage,
  filterCourses,
  filterPlaybooks,
  userRole,
} from './academy-leads-page-modules/academy-leads-utils';
import { useAcademyKnowledgeEditor } from './academy-leads-page-modules/useAcademyKnowledgeEditor';

export default function AcademyLeadsPage() {
  const workspace = useAcademySalesWorkspace('customers');
  const { canAccess: academyAllowed, canManage: isContentAdmin } = useAcademyAccess();
  const [role, setRole] = React.useState('');
  const [selectedLeadId, setSelectedLeadId] = React.useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const knowledge = useAcademyKnowledgeEditor(workspace.refresh);

  React.useEffect(() => setRole(userRole()), []);

  const openLead = React.useCallback((lead?: AcademyLead) => {
    setSelectedLeadId(lead?.id || null);
    setDrawerOpen(true);
  }, []);

  const closeLead = React.useCallback(() => {
    setDrawerOpen(false);
    setSelectedLeadId(null);
  }, []);

  const { refresh: refreshWorkspace, pageSize, setPage, setPageSize } = workspace;

  const handleSyncPancake = React.useCallback(async () => {
    try {
      await apiClient.academySales.syncPancake();
      message.success('Đã gửi yêu cầu đồng bộ Pancake.');
      await refreshWorkspace();
    } catch (error) {
      message.error(extractApiErrorMessage(error, 'Không thể đồng bộ Pancake.'));
    }
  }, [refreshWorkspace]);

  const handleCompleteFollowUp = React.useCallback(
    async (task: AcademyFollowUpTask) => {
      try {
        await apiClient.academySales.updateFollowUp(task.id, { status: 'DONE' });
        message.success('Đã hoàn thành follow-up.');
        await refreshWorkspace();
      } catch {
        message.error('Không thể cập nhật follow-up.');
      }
    },
    [refreshWorkspace]
  );

  const handlePageChange = React.useCallback(
    (nextPage: number, nextPageSize: number) => {
      setPage(nextPage);
      if (nextPageSize !== pageSize) setPageSize(nextPageSize);
    },
    [pageSize, setPage, setPageSize]
  );

  const filteredPlaybooks = React.useMemo(
    () => filterPlaybooks(workspace.playbooks, workspace.search),
    [workspace.playbooks, workspace.search]
  );

  const filteredCourses = React.useMemo(
    () => filterCourses(workspace.courses, workspace.search),
    [workspace.courses, workspace.search]
  );

  if (!role) return <StatePanel kind="loading" title="Đang xác thực quyền Academy…" />;
  if (!academyAllowed) {
    return (
      <StatePanel
        kind="error"
        title="Bạn không có quyền truy cập Academy"
        description="Khu vực này chỉ dành cho Admin hoặc thành viên đang hoạt động của đội Academy."
      />
    );
  }

  const isKnowledge = workspace.activeTab === 'KNOWLEDGE';

  return (
    <FeaturePage
      title="Academy"
      subtitle="Quản lý tệp khách hàng, follow-up và tài liệu tư vấn của Academy."
      icon={<AppIcon icon={BookOpen} />}
      tag={<StatusTag status="purple" label="Khách hàng đặc biệt" />}
      headerActions={
        <AcademyLeadsHeaderActions
          isContentAdmin={isContentAdmin}
          isKnowledge={isKnowledge}
          loading={workspace.loading}
          onSyncPancake={() => void handleSyncPancake()}
          onRefresh={() => void workspace.refresh()}
          onCreateLead={() => openLead()}
        />
      }
      toolbar={{
        primary: (
          <SearchField
            behavior="filter"
            value={workspace.search}
            onChange={(event) => workspace.setSearch(event.target.value)}
            placeholder="Tìm khách hàng Academy, khóa học, playbook không dấu…"
            allowClear
          />
        ),
        filters: !isKnowledge ? (
          <AcademyLeadsFilters
            activeTab={workspace.activeTab}
            status={workspace.status}
            ownerStaffId={workspace.ownerStaffId}
            hotView={workspace.hotView}
            followUpBucket={workspace.followUpBucket}
            staff={workspace.staff}
            onStatusChange={workspace.setStatus}
            onOwnerStaffIdChange={workspace.setOwnerStaffId}
            onHotViewChange={workspace.setHotView}
            onFollowUpBucketChange={workspace.setFollowUpBucket}
          />
        ) : undefined,
        filterTitle: 'Bộ lọc Academy',
        activeFilterCount: workspace.activeFilterCount,
      }}
    >
      <AcademyLeadsMetrics summary={workspace.summary} />

      <Tabs
        activeKey={workspace.activeTab}
        onChange={(key) => workspace.setActiveTab(key as AcademyWorkspaceTab)}
        items={[
          { key: 'PIPELINE', label: `Khách hàng (${workspace.summary.total})` },
          { key: 'HOT', label: `Ưu tiên (${workspace.summary.hotCount})` },
          { key: 'FOLLOW_UPS', label: `Follow-up (${workspace.summary.pendingFollowUps})` },
          { key: 'KNOWLEDGE', label: 'Playbook & Khóa học' },
        ]}
      />

      {!isKnowledge ? (
        <AcademyLeadsDataSection
          activeTab={workspace.activeTab}
          leads={workspace.leads}
          followUps={workspace.followUps}
          total={workspace.total}
          page={workspace.page}
          pageSize={workspace.pageSize}
          loading={workspace.loading}
          error={workspace.error}
          onPageChange={handlePageChange}
          onRefresh={() => void workspace.refresh()}
          onOpenLead={openLead}
          onCompleteFollowUp={handleCompleteFollowUp}
        />
      ) : (
        <AcademyKnowledgeSection
          loading={workspace.loading}
          isContentAdmin={isContentAdmin}
          playbooks={filteredPlaybooks}
          courses={filteredCourses}
          onOpenEditor={knowledge.openKnowledgeEditor}
        />
      )}

      <AcademyLeadDrawer
        open={drawerOpen}
        leadId={selectedLeadId}
        staff={workspace.staff}
        courses={workspace.courses}
        showSalesScripts={false}
        onClose={closeLead}
        onSaved={workspace.refresh}
      />

      <AcademyKnowledgeDrawer
        editor={knowledge.knowledgeEditor}
        saving={knowledge.savingKnowledge}
        playbookForm={knowledge.playbookForm}
        courseForm={knowledge.courseForm}
        onClose={knowledge.closeKnowledgeEditor}
        onSavePlaybook={knowledge.savePlaybook}
        onSaveCourse={knowledge.saveCourse}
      />
    </FeaturePage>
  );
}

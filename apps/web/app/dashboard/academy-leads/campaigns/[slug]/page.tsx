'use client';

import React from 'react';
import { Button } from 'antd';
import { Rocket } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { AppIcon, FeaturePage, SearchField, StatePanel, StatusTag } from '~/components/ui';
import { useAcademyAccess } from '../../components/AcademyAccessGate';
import { ACADEMY_CAMPAIGN_STATUS_LABELS, ACADEMY_CAMPAIGN_STATUS_TONES } from '../components/academy-campaign-utils';
import { useCampaignLeadColumns } from './useCampaignLeadColumns';
import { CampaignDetailHeaderActions } from './slug-page-modules/CampaignDetailHeaderActions';
import { CampaignDetailOverlays } from './slug-page-modules/CampaignDetailOverlays';
import { CampaignDetailSummarySection } from './slug-page-modules/CampaignDetailSummarySection';
import { CampaignLeadToolbarFilters } from './slug-page-modules/CampaignLeadToolbarFilters';
import { CampaignOperationalLeadsSection } from './slug-page-modules/CampaignOperationalLeadsSection';
import { useCampaignDetailState } from './slug-page-modules/useCampaignDetailState';
import { useCampaignTalentWorkshop } from './slug-page-modules/useCampaignTalentWorkshop';

export default function AcademyCampaignDetailPage() {
  const { canAccess: academyAllowed, canManage, canManageRestricted } = useAcademyAccess();
  const router = useRouter();
  const routeParams = useParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(routeParams.slug) ? routeParams.slug[0] || '' : routeParams.slug || '';

  const handleSlugChanged = React.useCallback(
    (nextSlug: string) => {
      router.replace(`/dashboard/academy-leads/campaigns/${nextSlug}`);
    },
    [router]
  );

  const detail = useCampaignDetailState({
    slug,
    academyAllowed,
    canManage,
    onSlugChanged: handleSlugChanged,
  });

  const talent = useCampaignTalentWorkshop({
    enabled: detail.hydrated && academyAllowed,
    courses: detail.courses,
  });

  const columns = useCampaignLeadColumns({
    touchpoints: detail.campaign?.touchpoints || [],
    canManageMembership: detail.canManageMembership,
    touchpointWritable: detail.isTouchpointWritable,
    page: detail.query.page,
    pageSize: detail.query.pageSize,
    onOpenTalent: talent.openTalentWorkshop,
    onOpenTouchpoint: detail.openTouchpoint,
    onRemoveLead: detail.removeLead,
  });

  if (!detail.hydrated || !detail.role || detail.loadingCampaign) {
    return <StatePanel kind="loading" title="Đang tải chiến dịch Academy…" />;
  }
  if (!academyAllowed) {
    return (
      <StatePanel
        kind="error"
        title="Bạn không có quyền truy cập chiến dịch Academy"
        description="Khu vực này chỉ dành cho Admin hoặc thành viên đang hoạt động của đội Academy."
      />
    );
  }
  if (!detail.campaign) {
    return (
      <StatePanel
        kind="error"
        title="Không tìm thấy chiến dịch"
        description={detail.error || 'Chiến dịch có thể đã bị lưu trữ hoặc bạn không nằm trong đội được giao.'}
        extra={<Button onClick={() => router.push('/dashboard/academy-leads/campaigns')}>Quay lại danh sách</Button>}
      />
    );
  }

  const campaign = detail.campaign;
  const memberIdsOnPage = detail.memberships.map((membership) => membership.leadId);
  const assignmentNames = campaign.assignedStaffIds
    .map((id) => detail.staff.find((member) => member.id === id)?.displayName || `#${id}`)
    .join(', ');

  return (
    <>
      <FeaturePage
        title={campaign.name}
        subtitle={campaign.description || 'Vận hành tệp lead cố định và nhịp chạm cho Academy.'}
        icon={<AppIcon icon={Rocket} />}
        tag={
          <StatusTag
            status={ACADEMY_CAMPAIGN_STATUS_TONES[campaign.status]}
            label={ACADEMY_CAMPAIGN_STATUS_LABELS[campaign.status]}
          />
        }
        headerActions={
          <CampaignDetailHeaderActions
            campaignStatus={campaign.status}
            loadingLeads={detail.loadingLeads}
            canManageMembership={detail.canManageMembership}
            canConfigure={detail.canConfigure}
            onBack={() => router.push('/dashboard/academy-leads/campaigns')}
            onRefresh={() => void detail.refresh()}
            onOpenLeadPicker={() => detail.setLeadPickerOpen(true)}
            onUpdateLifecycle={(status) => void detail.updateLifecycle(status)}
            onOpenConfig={() => detail.setFormOpen(true)}
          />
        }
        toolbar={{
          primary: (
            <SearchField
              behavior="filter"
              value={detail.query.search}
              onChange={(event) => detail.patchQuery({ search: event.target.value }, true)}
              placeholder="Tìm lead, SĐT, khóa học hoặc nguồn…"
              allowClear
            />
          ),
          filters: (
            <CampaignLeadToolbarFilters
              status={detail.query.status}
              ownerStaffId={detail.query.ownerStaffId}
              staff={detail.staff}
              onStatusChange={(status) => detail.patchQuery({ status }, true)}
              onOwnerStaffChange={(ownerStaffId) => detail.patchQuery({ ownerStaffId }, true)}
            />
          ),
          filterTitle: 'Bộ lọc tệp lead chiến dịch',
          activeFilterCount: [
            detail.query.search.trim(),
            detail.query.status !== 'ALL',
            detail.query.ownerStaffId !== 'ALL',
          ].filter(Boolean).length,
        }}
      >
        <CampaignDetailSummarySection
          campaign={campaign}
          stats={detail.stats}
          assignmentNames={assignmentNames}
          canConfigure={detail.canConfigure}
          onOpenConfig={() => detail.setFormOpen(true)}
        />

        <CampaignOperationalLeadsSection
          campaign={campaign}
          memberships={detail.memberships}
          columns={columns}
          total={detail.total}
          page={detail.query.page}
          pageSize={detail.query.pageSize}
          loadingLeads={detail.loadingLeads}
          error={detail.error}
          canManageMembership={detail.canManageMembership}
          isTouchpointWritable={detail.isTouchpointWritable}
          onRetry={() => void detail.loadOperationalData()}
          onPageChange={(page, pageSize) => detail.patchQuery({ page, pageSize }, pageSize !== detail.query.pageSize)}
          onOpenTouchpoint={detail.openTouchpoint}
          onOpenTalent={talent.openTalentWorkshop}
        />
      </FeaturePage>

      <CampaignDetailOverlays
        campaign={campaign}
        staff={detail.staff}
        courses={detail.courses}
        canConfigure={detail.canConfigure}
        canManageMembership={detail.canManageMembership}
        canManageRestricted={canManageRestricted}
        formOpen={detail.formOpen}
        formSubmitting={detail.formSubmitting}
        onCloseForm={() => detail.setFormOpen(false)}
        onSubmitForm={detail.submitConfiguration}
        leadPickerOpen={detail.leadPickerOpen}
        memberIdsOnPage={memberIdsOnPage}
        onCloseLeadPicker={() => detail.setLeadPickerOpen(false)}
        onConfirmLeadPicker={detail.addLeads}
        touchpointContext={detail.touchpointContext}
        touchpointSubmitting={detail.touchpointSubmitting}
        onCloseTouchpoint={() => detail.setTouchpointContext(null)}
        onSubmitTouchpoint={detail.updateTouchpoint}
        talentOpen={talent.talentOpen}
        talentLead={talent.talentLead}
        selectedTalentView={talent.selectedTalentView}
        talentSessions={talent.talentSessions}
        talentLoading={talent.talentLoading}
        talentSaving={talent.talentSaving}
        talentCourseRules={talent.talentCourseRules}
        talentInstructors={detail.talentInstructors}
        talentLadderConfiguration={talent.talentLadder.configuration}
        onCloseTalent={talent.closeTalentWorkshop}
        onPreviewTalentQuote={talent.previewTalentQuote}
        onSaveTalentDraft={talent.saveTalentDraft}
        onIssueTalentInvoice={talent.issueTalentInvoice}
        onRecordTalentPayment={talent.recordTalentPayment}
        onSelectTalentSession={talent.selectTalentSession}
        onStartNewTalentSession={talent.startNewTalentSession}
        onSaveTalentLadderConfiguration={talent.talentLadder.save}
        onSaveTalentCourseConfiguration={detail.saveTalentCourseConfiguration}
        onTalentSaved={() => detail.refresh()}
      />
    </>
  );
}

'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Select, Space, Tabs, Tooltip, message } from 'antd';
import {
  CalendarDays,
  CircleCheck,
  CircleX,
  Flame,
  LayoutGrid,
  List,
  Phone,
  Plus,
  RefreshCw,
  Trophy,
  UserRoundPlus,
} from 'lucide-react';
import dayjs from 'dayjs';
import { type AcademyLead, type AcademyLeadStatus, type AcademyTalentAssessment } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  AppIcon,
  DataSection,
  DataTable,
  FeaturePage,
  PagePrimaryIconAction,
  SearchField,
  StatePanel,
  StatusTag,
} from '../../../../components/ui';
import AcademyLeadDrawer from '../components/AcademyLeadDrawer';
import { useAcademyAccess } from '../components/AcademyAccessGate';
import AcademyLeadTalentWorkshopOverlay from '../components/AcademyLeadTalentWorkshopOverlay';
import { useAcademyTalentLadderConfiguration } from '../components/useAcademyTalentLadderConfiguration';
import AcademyTestCalendar from '../components/AcademyTestCalendar';
import { academyTalentCourseSelectionRules } from '../components/academy-talent-workshop.adapter';
import type { AcademyTalentAssessmentView, AcademyTalentDraft } from '../components/academy-talent-workshop.types';
import { useAcademySalesWorkspace } from '../hooks/useAcademySalesWorkspace';
import { useAcademyTalentResources } from './useAcademyTalentResources';
import {
  LeadManagerMetricStrip,
  buildLeadColumns,
  buildTalentSessions,
  leadMobileCard,
  pipelineTabLabel,
  talentAssessmentRequest,
  talentWorkshopView,
  userRole,
} from './lead-manager.helpers';
export default function AcademyLeadManagerPage() {
  const { canAccess: academyAllowed, canManage, canManageRestricted } = useAcademyAccess();
  const workspace = useAcademySalesWorkspace('lead-manager');
  const searchParams = useSearchParams();
  const [role, setRole] = React.useState('');
  const [selectedLeadId, setSelectedLeadId] = React.useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [updatingLeadId, setUpdatingLeadId] = React.useState<number | null>(null);
  const [talentLead, setTalentLead] = React.useState<AcademyLead | null>(null);
  const [talentOpen, setTalentOpen] = React.useState(false);
  const [talentAssessments, setTalentAssessments] = React.useState<AcademyTalentAssessment[]>([]);
  const [talentAssessmentId, setTalentAssessmentId] = React.useState<number | null>(null);
  const [talentLoading, setTalentLoading] = React.useState(false);
  const [talentSaving, setTalentSaving] = React.useState(false);
  const talentLoadVersionRef = React.useRef(0);
  const talentLaunchRef = React.useRef<string | null>(null);
  const talentAssessmentIdRef = React.useRef<number | null>(null);
  const [quickFilter, setQuickFilter] = React.useState<'ALL' | 'HOT' | 'TODAY_SCHEDULE'>('ALL');

  const displayedLeads = React.useMemo(() => {
    if (quickFilter === 'HOT') {
      return workspace.leads.filter((lead) => lead.isHot);
    }
    if (quickFilter === 'TODAY_SCHEDULE') {
      return workspace.leads.filter((lead) => lead.scheduledAt && dayjs(lead.scheduledAt).isSame(dayjs(), 'day'));
    }
    return workspace.leads;
  }, [quickFilter, workspace.leads]);

  React.useEffect(() => setRole(userRole()), []);

  const talentLadder = useAcademyTalentLadderConfiguration(academyAllowed);
  const { courses, talentInstructors, saveTalentCourseConfiguration } = useAcademyTalentResources(academyAllowed);
  const isCalendar = workspace.activeTab === 'CALENDAR';

  const openLead = React.useCallback((lead?: AcademyLead) => {
    setSelectedLeadId(lead?.id || null);
    setDrawerOpen(true);
  }, []);
  const closeLead = React.useCallback(() => {
    setDrawerOpen(false);
    setSelectedLeadId(null);
  }, []);
  const closeTalentWorkshop = React.useCallback(() => {
    talentLoadVersionRef.current += 1;
    setTalentOpen(false);
    setTalentLead(null);
    setTalentAssessments([]);
    talentAssessmentIdRef.current = null;
    setTalentAssessmentId(null);
  }, []);
  const openTalentWorkshop = React.useCallback(async (lead: AcademyLead, requestedAssessmentId?: number | null) => {
    const version = ++talentLoadVersionRef.current;
    setTalentLead(lead);
    setTalentOpen(true);
    setTalentLoading(true);
    setTalentAssessments([]);
    talentAssessmentIdRef.current = null;
    setTalentAssessmentId(null);
    try {
      const response = await apiClient.academySales.listTalentAssessments(lead.id);
      if (version !== talentLoadVersionRef.current) return;
      setTalentAssessments(response.data);
      const requested =
        requestedAssessmentId && response.data.some((assessment) => assessment.id === requestedAssessmentId)
          ? requestedAssessmentId
          : (response.latest?.id ?? null);
      talentAssessmentIdRef.current = requested;
      setTalentAssessmentId(requested);
    } catch (error: any) {
      if (version !== talentLoadVersionRef.current) return;
      message.error(error?.response?.data?.message || 'Không thể tải các lần test Tố Chất.');
    } finally {
      if (version === talentLoadVersionRef.current) setTalentLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const leadId = Number(searchParams.get('leadId') || 0);
    const assessmentId = Number(searchParams.get('assessmentId') || 0);
    const isPaymentFollowUp = searchParams.get('paymentFollowUp') === '1';
    const isTalentWorkshopLink = searchParams.get('talentWorkshop') === '1';
    if (!academyAllowed || (!isPaymentFollowUp && !isTalentWorkshopLink) || !Number.isInteger(leadId) || leadId <= 0)
      return;
    const launchKey = `${isPaymentFollowUp ? 'payment' : 'workshop'}:${leadId}:${
      Number.isInteger(assessmentId) && assessmentId > 0 ? assessmentId : ''
    }`;
    if (talentLaunchRef.current === launchKey) return;
    talentLaunchRef.current = launchKey;
    void apiClient.academySales
      .getLead(leadId)
      .then((lead) => openTalentWorkshop(lead, assessmentId > 0 ? assessmentId : null))
      .catch((error: any) =>
        message.error(
          error?.response?.data?.message ||
            (isPaymentFollowUp ? 'Không thể mở phiếu học phí cần follow-up.' : 'Không thể mở phiên Tố Chất.')
        )
      );
  }, [academyAllowed, openTalentWorkshop, searchParams]);
  const markTested = React.useCallback(
    async (lead: AcademyLead) => {
      try {
        await apiClient.academySales.updateLead(lead.id, { status: 'TESTED' });
        message.success(`Đã ghi nhận ${lead.name} đã test.`);
        await workspace.refresh();
      } catch (error: any) {
        message.error(error?.response?.data?.message || 'Không thể cập nhật trạng thái test.');
      }
    },
    [workspace]
  );
  const markNoShow = React.useCallback(
    async (lead: AcademyLead) => {
      try {
        await apiClient.academySales.recordNoShow(lead.id);
        message.warning(`Đã ghi nhận ${lead.name} không đến lịch test.`);
        await workspace.refresh();
      } catch (error: any) {
        message.error(error?.response?.data?.message || 'Không thể ghi nhận không đến.');
      }
    },
    [workspace]
  );
  const quickUpdate = React.useCallback(
    async (
      lead: AcademyLead,
      payload: Parameters<typeof apiClient.academySales.updateLead>[1],
      successMessage: string
    ) => {
      setUpdatingLeadId(lead.id);
      try {
        await apiClient.academySales.updateLead(lead.id, payload);
        message.success(successMessage);
        await workspace.refresh();
      } catch (error: any) {
        message.error(error?.response?.data?.message || 'Không thể cập nhật lead Academy.');
      } finally {
        setUpdatingLeadId(null);
      }
    },
    [workspace]
  );
  const selectedTalentAssessment = React.useMemo(
    () => talentAssessments.find((item) => item.id === talentAssessmentId) ?? null,
    [talentAssessmentId, talentAssessments]
  );
  const selectedTalentView = React.useMemo<AcademyTalentAssessmentView | null>(
    () => (selectedTalentAssessment ? talentWorkshopView(selectedTalentAssessment, talentAssessments) : null),
    [selectedTalentAssessment, talentAssessments]
  );
  const talentSessions = React.useMemo(() => buildTalentSessions(talentAssessments), [talentAssessments]);
  const upsertTalentAssessment = React.useCallback(
    (assessment: AcademyTalentAssessment) => {
      const next = talentAssessments.some((item) => item.id === assessment.id)
        ? talentAssessments.map((item) => (item.id === assessment.id ? assessment : item))
        : [assessment, ...talentAssessments];
      setTalentAssessments(next);
      talentAssessmentIdRef.current = assessment.id;
      setTalentAssessmentId(assessment.id);
      return talentWorkshopView(assessment, next);
    },
    [talentAssessments]
  );
  const saveTalentDraft = React.useCallback(
    async (draft: AcademyTalentDraft) => {
      if (!talentLead) throw new Error('Chưa chọn học viên Academy cho workshop.');
      setTalentSaving(true);
      try {
        const dto = talentAssessmentRequest(draft);
        const activeAssessmentId = talentAssessmentIdRef.current;
        const response = activeAssessmentId
          ? await apiClient.academySales.updateTalentAssessment(activeAssessmentId, dto)
          : await apiClient.academySales.createTalentAssessment(talentLead.id, dto);
        return upsertTalentAssessment(response.data);
      } finally {
        setTalentSaving(false);
      }
    },
    [talentLead, upsertTalentAssessment]
  );
  const previewTalentQuote = React.useCallback(
    async (draft: AcademyTalentDraft) => {
      if (!talentLead) throw new Error('Chưa chọn học viên Academy cho workshop.');
      const response = await apiClient.academySales.previewTalentAssessmentQuote(talentLead.id, {
        assessmentId: talentAssessmentIdRef.current ?? undefined,
        eyeScore: draft.eyeScore,
        handScore: draft.handScore,
        strands5Min: draft.strands5Min,
        errorSkin: draft.errors.skin,
        errorRoot: draft.errors.root,
        errorStickies: draft.errors.stickies,
        errorDirection: draft.errors.direction,
        selectedCourseIds: draft.selectedCourseIds,
        selectedSampleCourseIds: draft.selectedSampleCourseIds,
        selectedKitCourseIds: draft.selectedKitCourseIds,
        selectedInstructorIdsByCourse: draft.selectedInstructorIdsByCourse,
        paymentMode: draft.paymentMode,
        ...(draft.depositVnd === null ? {} : { depositVnd: draft.depositVnd }),
      });
      return response.data;
    },
    [talentLead]
  );
  const issueTalentInvoice = React.useCallback(
    async (draft: AcademyTalentDraft) => {
      if (selectedTalentAssessment?.payment.status === 'PAID') {
        setTalentSaving(true);
        try {
          const response = await apiClient.academySales.printTalentAssessmentInvoice(selectedTalentAssessment.id);
          return upsertTalentAssessment(response.data);
        } finally {
          setTalentSaving(false);
        }
      }

      const saved = await saveTalentDraft(draft);
      setTalentSaving(true);
      try {
        const response = await apiClient.academySales.printTalentAssessmentInvoice(saved.id);
        return upsertTalentAssessment(response.data);
      } finally {
        setTalentSaving(false);
      }
    },
    [saveTalentDraft, selectedTalentAssessment, upsertTalentAssessment]
  );
  const recordTalentPayment = React.useCallback(
    async (assessmentId: number, input: Parameters<typeof apiClient.academySales.recordTalentAssessmentPayment>[1]) => {
      setTalentSaving(true);
      try {
        const response = await apiClient.academySales.recordTalentAssessmentPayment(assessmentId, input);
        return upsertTalentAssessment(response.data);
      } finally {
        setTalentSaving(false);
      }
    },
    [upsertTalentAssessment]
  );
  const selectTalentSession = React.useCallback(
    async (assessmentId: number) => {
      const assessment = talentAssessments.find((item) => item.id === assessmentId);
      if (!assessment) throw new Error('Không tìm thấy lần test đã chọn.');
      talentAssessmentIdRef.current = assessmentId;
      setTalentAssessmentId(assessmentId);
      return talentWorkshopView(assessment, talentAssessments);
    },
    [talentAssessments]
  );
  const startNewTalentSession = React.useCallback(() => {
    talentAssessmentIdRef.current = null;
  }, []);
  const talentCourseRules = React.useMemo(() => academyTalentCourseSelectionRules(courses), [courses]);

  const leadColumns = React.useMemo(
    () =>
      buildLeadColumns({
        page: workspace.page,
        pageSize: workspace.pageSize,
        updatingLeadId,
        onOpenLead: openLead,
        onOpenTalent: (lead) => void openTalentWorkshop(lead),
        onQuickUpdate: quickUpdate,
        onMarkTested: markTested,
        onMarkNoShow: markNoShow,
      }),
    [
      markNoShow,
      markTested,
      openLead,
      openTalentWorkshop,
      quickUpdate,
      updatingLeadId,
      workspace.page,
      workspace.pageSize,
    ]
  );

  if (!role) return <StatePanel kind="loading" title="Đang xác thực quyền Lead Manager…" />;
  if (!academyAllowed) {
    return (
      <StatePanel
        kind="error"
        title="Bạn không có quyền truy cập Lead Manager"
        description="Khu vực này chỉ dành cho Admin hoặc thành viên đang hoạt động của đội Academy."
      />
    );
  }

  const sectionState = workspace.loading ? 'loading' : workspace.error ? 'error' : undefined;

  return (
    <FeaturePage
      title="Lead Manager"
      subtitle="Quản lý pipeline, lịch test, no-show và kịch bản cho khách hàng Academy."
      icon={<AppIcon icon={CalendarDays} />}
      tag={<StatusTag status="purple" label="Academy" />}
      headerActions={
        <Space>
          <Tooltip title="Làm mới dữ liệu">
            <Button
              aria-label="Làm mới Lead Manager"
              icon={<AppIcon icon={RefreshCw} />}
              loading={workspace.loading}
              onClick={() => void workspace.refresh()}
            />
          </Tooltip>
          {!isCalendar && (
            <PagePrimaryIconAction title="Tạo lead Academy" icon={<AppIcon icon={Plus} />} onClick={() => openLead()} />
          )}
        </Space>
      }
      toolbar={{
        primary: !isCalendar ? (
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <div className="w-full sm:w-72">
              <SearchField
                behavior="filter"
                value={workspace.search}
                onChange={(event) => workspace.setSearch(event.target.value)}
                placeholder="Tìm lead, khách hàng hoặc khóa học không dấu…"
                allowClear
              />
            </div>
            <Space size={6} wrap>
              <Button
                size="small"
                type={quickFilter === 'HOT' ? 'primary' : 'default'}
                danger={quickFilter === 'HOT'}
                icon={<AppIcon icon={Flame} className="w-3.5 h-3.5" />}
                onClick={() => setQuickFilter((prev) => (prev === 'HOT' ? 'ALL' : 'HOT'))}
              >
                Hot ({workspace.leads.filter((l) => l.isHot).length})
              </Button>
              <Button
                size="small"
                type={quickFilter === 'TODAY_SCHEDULE' ? 'primary' : 'default'}
                icon={<AppIcon icon={CalendarDays} className="w-3.5 h-3.5" />}
                onClick={() => setQuickFilter((prev) => (prev === 'TODAY_SCHEDULE' ? 'ALL' : 'TODAY_SCHEDULE'))}
              >
                Hẹn hôm nay (
                {workspace.leads.filter((l) => l.scheduledAt && dayjs(l.scheduledAt).isSame(dayjs(), 'day')).length})
              </Button>
              {quickFilter !== 'ALL' && (
                <Button size="small" type="link" onClick={() => setQuickFilter('ALL')}>
                  Xóa lọc nhanh
                </Button>
              )}
            </Space>
          </div>
        ) : undefined,
        filters: (
          <Select
            value={workspace.ownerStaffId}
            onChange={workspace.setOwnerStaffId}
            style={{ minWidth: 168 }}
            options={[
              { value: 'ALL', label: 'Mọi phụ trách' },
              { value: 'UNASSIGNED', label: 'Chưa giao' },
              ...workspace.staff.map((item) => ({ value: item.id, label: item.displayName })),
            ]}
          />
        ),
        filterTitle: 'Bộ lọc Lead Manager',
        activeFilterCount: workspace.activeFilterCount + (quickFilter !== 'ALL' ? 1 : 0),
      }}
    >
      <LeadManagerMetricStrip summary={workspace.summary} />

      <Tabs
        size="small"
        activeKey={workspace.status}
        onChange={(key) => {
          workspace.setStatus(key as AcademyLeadStatus | 'ALL');
          workspace.setActiveTab('PIPELINE');
        }}
        tabBarExtraContent={
          <Tooltip title={isCalendar ? 'Quay lại pipeline' : 'Mở calendar lịch test'}>
            <Button
              size="small"
              type={isCalendar ? 'primary' : 'text'}
              icon={isCalendar ? <AppIcon icon={List} /> : <AppIcon icon={CalendarDays} />}
              onClick={() => workspace.setActiveTab(isCalendar ? 'PIPELINE' : 'CALENDAR')}
            >
              {isCalendar ? 'Pipeline' : 'Lịch test'}
            </Button>
          </Tooltip>
        }
        items={[
          {
            key: 'ALL',
            label: pipelineTabLabel(<AppIcon icon={LayoutGrid} />, 'Tất cả', workspace.summary.total),
          },
          {
            key: 'NEW',
            label: pipelineTabLabel(<AppIcon icon={UserRoundPlus} />, 'Mới', workspace.summary.newCount),
          },
          {
            key: 'WARM',
            label: pipelineTabLabel(<AppIcon icon={Phone} />, 'Khai thác', workspace.summary.warmCount),
          },
          {
            key: 'SCHEDULED',
            label: pipelineTabLabel(<AppIcon icon={CalendarDays} />, 'Hẹn test', workspace.summary.scheduledCount),
          },
          {
            key: 'TESTED',
            label: pipelineTabLabel(<AppIcon icon={CircleCheck} />, 'Đã test', workspace.summary.testedCount),
          },
          {
            key: 'WON',
            label: pipelineTabLabel(<AppIcon icon={Trophy} />, 'Đã chốt', workspace.summary.wonCount),
          },
          {
            key: 'LOST',
            label: pipelineTabLabel(<AppIcon icon={CircleX} />, 'Không phù hợp', workspace.summary.lostCount),
          },
        ]}
      />

      {isCalendar ? (
        <DataSection
          title={`Lịch test · ${dayjs(`${workspace.calendarMonth}-01`).format('MM/YYYY')}`}
          extra={
            <span className="tabular-nums opacity-70">
              {workspace.calendarEvents.length.toLocaleString('vi-VN')} khách hàng có lịch
            </span>
          }
          state={sectionState}
          stateTitle={workspace.error || 'Không thể tải lịch test'}
          stateDescription={workspace.error ? 'Hãy thử làm mới dữ liệu.' : undefined}
          stateExtra={workspace.error ? <Button onClick={() => void workspace.refresh()}>Thử lại</Button> : undefined}
        >
          <AcademyTestCalendar
            month={workspace.calendarMonth}
            events={workspace.calendarEvents}
            loading={workspace.loading}
            onMonthChange={workspace.setCalendarMonth}
            onOpenLead={(leadId) => openLead({ id: leadId } as AcademyLead)}
          />
        </DataSection>
      ) : (
        <DataSection
          title="Pipeline lead Academy"
          extra={
            <Space size={12}>
              <span className="tabular-nums opacity-70">
                {displayedLeads.length !== workspace.total
                  ? `${displayedLeads.length} / ${workspace.total.toLocaleString('vi-VN')} bản ghi`
                  : `${workspace.total.toLocaleString('vi-VN')} bản ghi`}
              </span>
            </Space>
          }
          state={sectionState || (displayedLeads.length === 0 ? 'empty' : undefined)}
          stateTitle={workspace.error || 'Chưa có lead theo bộ lọc'}
          stateDescription={workspace.error ? 'Hãy thử làm mới dữ liệu.' : undefined}
          stateExtra={workspace.error ? <Button onClick={() => void workspace.refresh()}>Thử lại</Button> : undefined}
        >
          <DataTable
            className="academy-lead-manager-table"
            rowKey="id"
            columns={leadColumns}
            dataSource={displayedLeads}
            loading={workspace.loading}
            scroll={{ x: 1200 }}
            sticky
            stickyPrimaryColumn
            onRow={(lead) => ({
              onClick: () => openLead(lead),
              className: 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors',
            })}
            columnPriority={{
              stt: 'secondary',
              customer: 'primary',
              pipeline: 'primary',
              course: 'secondary',
              schedule: 'secondary',
              revenue: 'tertiary',
              actions: 'primary',
            }}
            mobileRenderer={(lead) => leadMobileCard(lead, openLead, openTalentWorkshop)}
            pagination={{
              current: workspace.page,
              pageSize: workspace.pageSize,
              total: quickFilter !== 'ALL' ? displayedLeads.length : workspace.total,
              onChange: (page, pageSize) => {
                workspace.setPage(page);
                if (pageSize !== workspace.pageSize) workspace.setPageSize(pageSize);
              },
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / ${total.toLocaleString('vi-VN')}`,
            }}
          />
        </DataSection>
      )}

      <AcademyLeadDrawer
        open={drawerOpen}
        leadId={selectedLeadId}
        staff={workspace.staff}
        courses={courses}
        showSalesScripts
        onClose={closeLead}
        onSaved={workspace.refresh}
      />

      <AcademyLeadTalentWorkshopOverlay
        canManage={canManage}
        canManageRestricted={canManageRestricted}
        open={talentOpen}
        lead={talentLead}
        courses={courses}
        assessment={selectedTalentView}
        sessions={talentSessions}
        loading={talentLoading}
        saving={talentSaving}
        courseSelectionRules={talentCourseRules}
        instructors={talentInstructors}
        ladderConfiguration={talentLadder.configuration}
        autoOpenPaymentFollowUp={searchParams.get('paymentFollowUp') === '1'}
        onClose={closeTalentWorkshop}
        onPreviewQuote={previewTalentQuote}
        onSaveDraft={saveTalentDraft}
        onIssueInvoice={issueTalentInvoice}
        onRecordPayment={recordTalentPayment}
        onSelectSession={selectTalentSession}
        onStartNewSession={startNewTalentSession}
        onSaveLadderConfiguration={talentLadder.save}
        onSaveCourseConfiguration={saveTalentCourseConfiguration}
        onSaved={workspace.refresh}
      />
    </FeaturePage>
  );
}

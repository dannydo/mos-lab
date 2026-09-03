'use client';

import React from 'react';
import { Button, Descriptions, Select, Space, message } from 'antd';
import {
  ArrowLeft,
  CalendarDays,
  CircleCheck,
  CirclePause,
  CirclePlay,
  Pencil,
  RefreshCw,
  Rocket,
  UserRoundPlus,
  UsersRound,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import {
  type AcademyCampaign,
  type AcademyCampaignLead,
  type AcademyCampaignStats,
  type AcademyCampaignTouchpoint,
  type AcademyCourse,
  type AcademyStaffOption,
  type AcademyTalentAssessment,
  type AcademyTalentInstructor,
  type UpsertAcademyCourseRequest,
  type UpdateAcademyCampaignRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../../lib/api-client';
import {
  AppIcon,
  DataSection,
  DataTable,
  FeaturePage,
  IconButton,
  MetricGrid,
  SearchField,
  StatePanel,
  StatusTag,
} from '../../../../../components/ui';
import AcademyCampaignFormDrawer, { type AcademyCampaignFormPayload } from '../components/AcademyCampaignFormDrawer';
import AcademyCampaignLeadPicker from '../components/AcademyCampaignLeadPicker';
import AcademyCampaignTouchpointDrawer from '../components/AcademyCampaignTouchpointDrawer';
import AcademyTalentWorkshopDrawer from '../../components/AcademyTalentWorkshopDrawer';
import { useAcademyAccess } from '../../components/AcademyAccessGate';
import { useAcademyTalentLadderConfiguration } from '../../components/useAcademyTalentLadderConfiguration';
import { academyTalentCourseSelectionRules } from '../../components/academy-talent-workshop.adapter';
import type {
  AcademyTalentAssessmentView,
  AcademyTalentCourseConfigurationInput,
  AcademyTalentDraft,
  AcademyTalentLead,
} from '../../components/academy-talent-workshop.types';
import {
  ACADEMY_CAMPAIGN_STATUS_LABELS,
  ACADEMY_CAMPAIGN_STATUS_TONES,
  formatCampaignDateRange,
  readAcademyUserRole,
} from '../components/academy-campaign-utils';
import {
  type CampaignLeadQuery,
  DEFAULT_QUERY,
  DEFAULT_STATS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONES,
  campaignLeadMobileCard,
  persistLeadQuery,
  readLeadQuery,
  talentAssessmentRequest,
  talentSessionNumber,
  talentWorkshopView,
} from './academy-campaign-detail.helpers';
import styles from './AcademyCampaignDetailPage.module.css';
import { useCampaignLeadColumns } from './useCampaignLeadColumns';

export default function AcademyCampaignDetailPage() {
  const { canAccess: academyAllowed, canManage, canManageRestricted } = useAcademyAccess();
  const router = useRouter();
  const routeParams = useParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(routeParams.slug) ? routeParams.slug[0] || '' : routeParams.slug || '';
  const [role, setRole] = React.useState('');
  const [hydrated, setHydrated] = React.useState(false);
  const [campaign, setCampaign] = React.useState<AcademyCampaign | null>(null);
  const [stats, setStats] = React.useState<AcademyCampaignStats>(DEFAULT_STATS);
  const [memberships, setMemberships] = React.useState<AcademyCampaignLead[]>([]);
  const [total, setTotal] = React.useState(0);
  const [staff, setStaff] = React.useState<AcademyStaffOption[]>([]);
  const [courses, setCourses] = React.useState<AcademyCourse[]>([]);
  const [talentInstructors, setTalentInstructors] = React.useState<AcademyTalentInstructor[]>([]);
  const [query, setQuery] = React.useState<CampaignLeadQuery>(DEFAULT_QUERY);
  const [loadingCampaign, setLoadingCampaign] = React.useState(true);
  const [loadingLeads, setLoadingLeads] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formSubmitting, setFormSubmitting] = React.useState(false);
  const [leadPickerOpen, setLeadPickerOpen] = React.useState(false);
  const [addingLeads, setAddingLeads] = React.useState(false);
  const [touchpointContext, setTouchpointContext] = React.useState<{
    lead: AcademyCampaignLead;
    touchpoint: AcademyCampaignTouchpoint;
  } | null>(null);
  const [touchpointSubmitting, setTouchpointSubmitting] = React.useState(false);
  const [talentLead, setTalentLead] = React.useState<AcademyTalentLead | null>(null);
  const [talentOpen, setTalentOpen] = React.useState(false);
  const [talentAssessments, setTalentAssessments] = React.useState<AcademyTalentAssessment[]>([]);
  const [talentAssessmentId, setTalentAssessmentId] = React.useState<number | null>(null);
  const [talentLoading, setTalentLoading] = React.useState(false);
  const [talentSaving, setTalentSaving] = React.useState(false);
  const campaignRequestVersionRef = React.useRef(0);
  const leadRequestVersionRef = React.useRef(0);
  const talentLoadVersionRef = React.useRef(0);
  const talentAssessmentIdRef = React.useRef<number | null>(null);
  const deferredSearch = React.useDeferredValue(query.search);

  React.useEffect(() => {
    setRole(readAcademyUserRole());
  }, []);

  React.useEffect(() => {
    if (!slug) return;
    setQuery(readLeadQuery(slug));
    setHydrated(true);
  }, [slug]);

  React.useEffect(() => {
    if (!hydrated || !slug) return;
    persistLeadQuery(slug, query);
  }, [hydrated, query, slug]);

  const talentLadder = useAcademyTalentLadderConfiguration(hydrated && academyAllowed);
  const canConfigure = canManage;
  const canManageMembership = canConfigure || role === 'ls';
  // Mirrors the Academy API: DRAFT/SCHEDULED campaigns may capture early real
  // conversations, while paused and closed campaigns are intentionally read-only.
  const isTouchpointWritable = Boolean(campaign && ['DRAFT', 'SCHEDULED', 'ACTIVE'].includes(campaign.status));

  const loadCampaign = React.useCallback(async () => {
    if (!hydrated || !slug || !academyAllowed) return;
    const version = ++campaignRequestVersionRef.current;
    setLoadingCampaign(true);
    try {
      const [nextCampaign, nextStaff, nextCourses, nextTalentInstructors] = await Promise.all([
        apiClient.academySales.campaigns.getBySlug(slug),
        apiClient.academySales.listStaff(),
        apiClient.academySales.listCourses(),
        apiClient.academySales.listTalentInstructors(),
      ]);
      if (version !== campaignRequestVersionRef.current) return;
      setCampaign(nextCampaign);
      setStaff(nextStaff);
      setCourses(nextCourses);
      setTalentInstructors(nextTalentInstructors.data);
      setError(null);
    } catch (loadError: any) {
      if (version !== campaignRequestVersionRef.current) return;
      setCampaign(null);
      setError(loadError?.response?.data?.message || 'Không thể tải chiến dịch Academy.');
    } finally {
      if (version === campaignRequestVersionRef.current) setLoadingCampaign(false);
    }
  }, [academyAllowed, hydrated, slug]);

  const loadOperationalData = React.useCallback(async () => {
    if (!campaign || !hydrated) return;
    const version = ++leadRequestVersionRef.current;
    setLoadingLeads(true);
    try {
      const [leadResponse, nextStats] = await Promise.all([
        apiClient.academySales.campaigns.listLeads(campaign.id, {
          page: query.page,
          limit: query.pageSize,
          search: deferredSearch || undefined,
          status: query.status,
          ownerStaffId: query.ownerStaffId,
        }),
        apiClient.academySales.campaigns.getStats(campaign.id),
      ]);
      if (version !== leadRequestVersionRef.current) return;
      setMemberships(leadResponse.data);
      setTotal(leadResponse.total);
      setStats(nextStats);
      setError(null);
    } catch (loadError: any) {
      if (version !== leadRequestVersionRef.current) return;
      setError(loadError?.response?.data?.message || 'Không thể tải tệp lead của chiến dịch.');
    } finally {
      if (version === leadRequestVersionRef.current) setLoadingLeads(false);
    }
  }, [campaign, deferredSearch, hydrated, query.ownerStaffId, query.page, query.pageSize, query.status]);

  React.useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  React.useEffect(() => {
    void loadOperationalData();
  }, [loadOperationalData]);

  const refresh = React.useCallback(async () => {
    await loadCampaign();
    await loadOperationalData();
  }, [loadCampaign, loadOperationalData]);

  const saveTalentCourseConfiguration = React.useCallback(async (input: AcademyTalentCourseConfigurationInput[]) => {
    await Promise.all(
      input.map(({ id, values }) =>
        id
          ? apiClient.academySales.updateCourse(id, values as UpsertAcademyCourseRequest)
          : apiClient.academySales.createCourse(values as UpsertAcademyCourseRequest)
      )
    );
    const nextCourses = await apiClient.academySales.listCourses();
    setCourses(nextCourses);
    return nextCourses;
  }, []);

  const patchQuery = React.useCallback((patch: Partial<CampaignLeadQuery>, resetPage = false) => {
    setQuery((previous) => ({ ...previous, ...patch, page: resetPage ? 1 : (patch.page ?? previous.page) }));
  }, []);

  const openTouchpoint = React.useCallback((lead: AcademyCampaignLead, touchpoint: AcademyCampaignTouchpoint) => {
    setTouchpointContext({ lead, touchpoint });
  }, []);

  const closeTalentWorkshop = React.useCallback(() => {
    talentLoadVersionRef.current += 1;
    setTalentOpen(false);
    setTalentLead(null);
    setTalentAssessments([]);
    talentAssessmentIdRef.current = null;
    setTalentAssessmentId(null);
  }, []);

  const openTalentWorkshop = React.useCallback(async (lead: AcademyTalentLead) => {
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
      talentAssessmentIdRef.current = response.latest?.id ?? null;
      setTalentAssessmentId(response.latest?.id ?? null);
    } catch (loadError: any) {
      if (version !== talentLoadVersionRef.current) return;
      message.error(loadError?.response?.data?.message || 'Không thể tải các lần test Tố Chất.');
    } finally {
      if (version === talentLoadVersionRef.current) setTalentLoading(false);
    }
  }, []);

  const updateTouchpoint = React.useCallback(
    async (payload: Parameters<typeof apiClient.academySales.campaigns.toggleTouchpoint>[3]) => {
      if (!campaign || !touchpointContext) return;
      setTouchpointSubmitting(true);
      try {
        const result = await apiClient.academySales.campaigns.toggleTouchpoint(
          campaign.id,
          touchpointContext.lead.leadId,
          touchpointContext.touchpoint.id,
          payload
        );
        message.success(result.message || 'Đã cập nhật điểm chạm.');
        setTouchpointContext(null);
        await loadOperationalData();
      } catch (submitError: any) {
        message.error(submitError?.response?.data?.message || 'Không thể cập nhật điểm chạm.');
      } finally {
        setTouchpointSubmitting(false);
      }
    },
    [campaign, loadOperationalData, touchpointContext]
  );

  const addLeads = React.useCallback(
    async (leadIds: number[]) => {
      if (!campaign || !leadIds.length) return;
      setAddingLeads(true);
      try {
        const result = await apiClient.academySales.campaigns.addLeads(campaign.id, { leadIds });
        message.success(`Đã thêm ${result.length.toLocaleString('vi-VN')} lead vào tệp chiến dịch.`);
        setLeadPickerOpen(false);
        await refresh();
      } catch (submitError: any) {
        message.error(submitError?.response?.data?.message || 'Không thể thêm lead vào tệp chiến dịch.');
      } finally {
        setAddingLeads(false);
      }
    },
    [campaign, refresh]
  );

  const removeLead = React.useCallback(
    async (membership: AcademyCampaignLead) => {
      if (!campaign) return;
      try {
        const result = await apiClient.academySales.campaigns.removeLead(campaign.id, membership.leadId);
        message.success(result.message || 'Đã gỡ lead khỏi tệp chiến dịch.');
        await refresh();
      } catch (submitError: any) {
        message.error(submitError?.response?.data?.message || 'Không thể gỡ lead khỏi chiến dịch.');
      }
    },
    [campaign, refresh]
  );

  const submitConfiguration = React.useCallback(
    async (payload: AcademyCampaignFormPayload) => {
      if (!campaign) return;
      setFormSubmitting(true);
      try {
        const result = await apiClient.academySales.campaigns.update(
          campaign.id,
          payload as UpdateAcademyCampaignRequest
        );
        message.success(result.message || 'Đã lưu cấu hình chiến dịch.');
        window.dispatchEvent(new Event('academy-campaign-sidebar-updated'));
        setFormOpen(false);
        if (result.data?.slug && result.data.slug !== campaign.slug) {
          router.replace(`/dashboard/academy-leads/campaigns/${result.data.slug}`);
          return;
        }
        await refresh();
      } catch (submitError: any) {
        message.error(submitError?.response?.data?.message || 'Không thể lưu cấu hình chiến dịch.');
      } finally {
        setFormSubmitting(false);
      }
    },
    [campaign, refresh, router]
  );

  const updateLifecycle = React.useCallback(
    async (status: 'ACTIVE' | 'PAUSED') => {
      if (!campaign) return;
      try {
        const result = await apiClient.academySales.campaigns.setStatus(campaign.id, status);
        message.success(
          result.message || (status === 'ACTIVE' ? 'Đã kích hoạt chiến dịch.' : 'Đã tạm dừng chiến dịch.')
        );
        await refresh();
      } catch (submitError: any) {
        message.error(submitError?.response?.data?.message || 'Không thể cập nhật trạng thái chiến dịch.');
      }
    },
    [campaign, refresh]
  );

  const selectedTalentAssessment = React.useMemo(
    () => talentAssessments.find((item) => item.id === talentAssessmentId) ?? null,
    [talentAssessmentId, talentAssessments]
  );
  const selectedTalentView = React.useMemo<AcademyTalentAssessmentView | null>(
    () => (selectedTalentAssessment ? talentWorkshopView(selectedTalentAssessment, talentAssessments) : null),
    [selectedTalentAssessment, talentAssessments]
  );
  const talentSessions = React.useMemo(
    () =>
      talentAssessments.map((item) => ({
        id: item.id,
        sessionNumber: talentSessionNumber(item, talentAssessments),
        status: item.status,
        updatedAt: item.updatedAt,
        invoiceNumber: item.invoice?.documentNumber ?? null,
      })),
    [talentAssessments]
  );
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

  const columns = useCampaignLeadColumns({
    touchpoints: campaign?.touchpoints || [],
    canManageMembership,
    touchpointWritable: isTouchpointWritable,
    page: query.page,
    pageSize: query.pageSize,
    onOpenTalent: openTalentWorkshop,
    onOpenTouchpoint: openTouchpoint,
    onRemoveLead: removeLead,
  });

  if (!hydrated || !role || loadingCampaign) return <StatePanel kind="loading" title="Đang tải chiến dịch Academy…" />;
  if (!academyAllowed) {
    return (
      <StatePanel
        kind="error"
        title="Bạn không có quyền truy cập chiến dịch Academy"
        description="Khu vực này chỉ dành cho Admin hoặc thành viên đang hoạt động của đội Academy."
      />
    );
  }
  if (!campaign) {
    return (
      <StatePanel
        kind="error"
        title="Không tìm thấy chiến dịch"
        description={error || 'Chiến dịch có thể đã bị lưu trữ hoặc bạn không nằm trong đội được giao.'}
        extra={<Button onClick={() => router.push('/dashboard/academy-leads/campaigns')}>Quay lại danh sách</Button>}
      />
    );
  }

  const memberIdsOnPage = memberships.map((membership) => membership.leadId);
  const assignmentNames = campaign.assignedStaffIds
    .map((id) => staff.find((member) => member.id === id)?.displayName || `#${id}`)
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
          <Space>
            <IconButton
              label="Quay lại danh sách chiến dịch"
              icon={ArrowLeft}
              onClick={() => router.push('/dashboard/academy-leads/campaigns')}
            />
            <IconButton
              label="Làm mới dữ liệu"
              icon={RefreshCw}
              loading={loadingLeads}
              onClick={() => void refresh()}
            />
            {canManageMembership && (
              <Button icon={<AppIcon icon={UserRoundPlus} />} onClick={() => setLeadPickerOpen(true)}>
                Thêm lead
              </Button>
            )}
            {canConfigure && ['DRAFT', 'SCHEDULED', 'PAUSED'].includes(campaign.status) && (
              <Button
                type="primary"
                icon={<AppIcon icon={CirclePlay} />}
                onClick={() => void updateLifecycle('ACTIVE')}
              >
                Kích hoạt
              </Button>
            )}
            {canConfigure && campaign.status === 'ACTIVE' && (
              <Button icon={<AppIcon icon={CirclePause} />} onClick={() => void updateLifecycle('PAUSED')}>
                Tạm dừng
              </Button>
            )}
            {canConfigure && (
              <Button icon={<AppIcon icon={Pencil} />} onClick={() => setFormOpen(true)}>
                Cấu hình
              </Button>
            )}
          </Space>
        }
        toolbar={{
          primary: (
            <SearchField
              behavior="filter"
              value={query.search}
              onChange={(event) => patchQuery({ search: event.target.value }, true)}
              placeholder="Tìm lead, SĐT, khóa học hoặc nguồn…"
              allowClear
            />
          ),
          filters: (
            <Space wrap>
              <Select
                value={query.status}
                aria-label="Lọc pipeline chiến dịch"
                style={{ minWidth: 150 }}
                options={[
                  { value: 'ALL', label: 'Mọi pipeline' },
                  ...Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({ value, label })),
                ]}
                onChange={(status) => patchQuery({ status }, true)}
              />
              <Select
                value={query.ownerStaffId}
                aria-label="Lọc phụ trách chiến dịch"
                style={{ minWidth: 165 }}
                options={[
                  { value: 'ALL', label: 'Mọi phụ trách' },
                  { value: 'UNASSIGNED', label: 'Chưa giao' },
                  ...staff.map((item) => ({ value: item.id, label: item.displayName })),
                ]}
                onChange={(ownerStaffId) => patchQuery({ ownerStaffId }, true)}
              />
            </Space>
          ),
          filterTitle: 'Bộ lọc tệp lead chiến dịch',
          activeFilterCount: [query.search.trim(), query.status !== 'ALL', query.ownerStaffId !== 'ALL'].filter(Boolean)
            .length,
        }}
      >
        <MetricGrid
          className={styles.metricGrid}
          columns={4}
          items={[
            {
              key: 'leads',
              title: 'Tệp lead',
              value: stats.totalLeads,
              format: 'number',
              icon: <AppIcon icon={UsersRound} />,
              subValue: `${campaign._count?.leads || 0} lead cố định`,
            },
            {
              key: 'touched',
              title: 'Đã chạm',
              value: stats.touchedLeadCount,
              format: 'number',
              icon: <AppIcon icon={CircleCheck} />,
              subValue: `${stats.touchpointLogCount.toLocaleString('vi-VN')} lượt ghi nhận`,
            },
            {
              key: 'test',
              title: 'Hẹn / đã test',
              value: stats.scheduledCount,
              format: 'number',
              icon: <AppIcon icon={CalendarDays} />,
              subValue: `${stats.testedCount.toLocaleString('vi-VN')} đã test`,
            },
            {
              key: 'won',
              title: 'Đã chốt',
              value: stats.wonCount,
              format: 'number',
              icon: <AppIcon icon={Rocket} />,
              subValue: `${Math.round(stats.revenueVnd).toLocaleString('vi-VN')} đ · ${stats.wonRate.toLocaleString('vi-VN')}%`,
            },
          ]}
        />

        <DataSection
          title="Thiết lập chiến dịch"
          extra={
            canConfigure ? (
              <Button type="link" onClick={() => setFormOpen(true)}>
                Chỉnh cấu hình
              </Button>
            ) : undefined
          }
        >
          <Descriptions
            size="small"
            column={{ xs: 1, sm: 2, lg: 4 }}
            items={[
              {
                key: 'period',
                label: 'Thời gian',
                children: formatCampaignDateRange(campaign.startDate, campaign.endDate),
              },
              { key: 'team', label: 'Đội thực thi', children: assignmentNames || 'Chưa giao — chỉ quản lý nhìn thấy' },
              {
                key: 'snapshot',
                label: 'Tệp snapshot',
                children: `${(campaign._count?.leads || 0).toLocaleString('vi-VN')} lead cố định`,
              },
              {
                key: 'touchpoints',
                label: 'Nhịp chạm',
                children: `${(campaign._count?.touchpoints || 0).toLocaleString('vi-VN')} điểm chạm`,
              },
            ]}
          />
          {campaign.audienceSummary && <p className="mb-0 mt-3 text-sm opacity-70">{campaign.audienceSummary}</p>}
        </DataSection>

        <DataSection
          title="Tệp lead vận hành"
          extra={
            <span className="tabular-nums text-xs opacity-70">
              {total.toLocaleString('vi-VN')} lead trong phạm vi quyền xem
            </span>
          }
          bodyPadding={0}
          state={loadingLeads ? 'loading' : error ? 'error' : memberships.length ? undefined : 'empty'}
          stateTitle={error ? 'Không tải được tệp lead' : 'Chưa có lead trong chiến dịch'}
          stateDescription={
            error ||
            (canManageMembership
              ? 'Thêm lead Academy để bắt đầu vận hành chiến dịch.'
              : 'Bạn chưa được giao lead thuộc chiến dịch này.')
          }
          stateExtra={error ? <Button onClick={() => void loadOperationalData()}>Thử lại</Button> : undefined}
        >
          <DataTable<AcademyCampaignLead>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={memberships}
            stickyPrimaryColumn
            columnPriority={{
              lead: 'primary',
              status: 'primary',
              course: 'secondary',
              owner: 'secondary',
              scheduledAt: 'secondary',
              addedAt: 'tertiary',
              actions: 'primary',
              ...(campaign.touchpoints || []).reduce<Record<string, 'secondary'>>((result, touchpoint) => {
                result[`touchpoint-${touchpoint.id}`] = 'secondary';
                return result;
              }, {}),
            }}
            mobileRenderer={(membership) =>
              campaignLeadMobileCard(
                membership,
                openTouchpoint,
                openTalentWorkshop,
                campaign.touchpoints || [],
                isTouchpointWritable
              )
            }
            pagination={{
              current: query.page,
              pageSize: query.pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (count, range) => `Hiển thị ${range[0]}-${range[1]} / ${count.toLocaleString('vi-VN')} lead`,
              onChange: (page, pageSize) => patchQuery({ page, pageSize }, pageSize !== query.pageSize),
            }}
          />
        </DataSection>
      </FeaturePage>

      {canConfigure && (
        <AcademyCampaignFormDrawer
          open={formOpen}
          campaign={campaign}
          staff={staff}
          courses={courses}
          submitting={formSubmitting}
          onClose={() => setFormOpen(false)}
          onSubmit={submitConfiguration}
        />
      )}

      {canManageMembership && (
        <AcademyCampaignLeadPicker
          open={leadPickerOpen}
          title={`Thêm lead vào ${campaign.name}`}
          confirmLabel="Thêm vào chiến dịch"
          initialSelectedLeadIds={[]}
          disabledLeadIds={memberIdsOnPage}
          staff={staff}
          onClose={() => setLeadPickerOpen(false)}
          onConfirm={addLeads}
        />
      )}

      <AcademyCampaignTouchpointDrawer
        open={Boolean(touchpointContext)}
        lead={touchpointContext?.lead || null}
        touchpoint={touchpointContext?.touchpoint || null}
        submitting={touchpointSubmitting}
        onClose={() => setTouchpointContext(null)}
        onSubmit={updateTouchpoint}
      />

      <AcademyTalentWorkshopDrawer
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
        canEditLadder={canManageRestricted}
        canManageCourses={canManage}
        canConfirmPayment={canManageRestricted}
        onClose={closeTalentWorkshop}
        onPreviewQuote={previewTalentQuote}
        onSaveDraft={saveTalentDraft}
        onIssueInvoice={issueTalentInvoice}
        onRecordPayment={recordTalentPayment}
        onSelectSession={selectTalentSession}
        onStartNewSession={startNewTalentSession}
        onSaveLadderConfiguration={talentLadder.save}
        onSaveCourseConfiguration={saveTalentCourseConfiguration}
        onSaved={() => refresh()}
      />
    </>
  );
}

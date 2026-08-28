'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, DatePicker, Select, Space, Tabs, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CalendarDays,
  CircleCheck,
  CircleX,
  Flame,
  LayoutGrid,
  Link,
  List,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Trophy,
  UserRoundPlus,
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  type AcademyLead,
  type AcademyLeadStatus,
  type AcademyTalentAssessment,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  AppIcon,
  CustomerIdentityCell,
  DataSection,
  DataTable,
  FeaturePage,
  MetricGrid,
  PagePrimaryIconAction,
  SearchField,
  StatePanel,
  StatusTag,
  TableIndexHeader,
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
  InlineTextCell,
  InlineVndCell,
  STATUS_LABELS,
  STATUS_TONES,
  buildCourseOptions,
  buildOwnerOptions,
  buildTalentSessions,
  dateLabel,
  followUpLabel,
  leadMobileCard,
  pipelineTabLabel,
  statusOptionsFor,
  talentAssessmentRequest,
  talentWorkshopView,
  userRole,
} from './lead-manager.helpers';
export default function AcademyLeadManagerPage() {
  const { canAccess: academyAllowed, canManage } = useAcademyAccess();
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
  const courseOptions = React.useMemo(() => buildCourseOptions(courses), [courses]);
  const ownerOptions = React.useMemo(() => buildOwnerOptions(workspace.staff), [workspace.staff]);
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
  const assignCourse = React.useCallback(
    async (lead: AcademyLead, course: string | null) => {
      await quickUpdate(
        lead,
        { course },
        course ? `Đã chọn ${course} cho ${lead.name}.` : `Đã bỏ khóa học của ${lead.name}.`
      );
    },
    [quickUpdate]
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

  const leadColumns = React.useMemo<ColumnsType<AcademyLead>>(
    () => [
      {
        title: <TableIndexHeader />,
        key: 'stt',
        width: 52,
        align: 'center',
        render: (_value, _lead, index) => (
          <span className="tabular-nums font-medium">{(workspace.page - 1) * workspace.pageSize + index + 1}</span>
        ),
      },
      {
        key: 'lead',
        title: 'Khách hàng',
        width: 240,
        render: (_, lead) => (
          <CustomerIdentityCell
            name={lead.name}
            phone={lead.phone}
            avatar={lead.avatarUrl}
            onOpen={() => openLead(lead)}
          />
        ),
      },
      {
        key: 'status',
        title: 'Pipeline',
        width: 160,
        render: (_, lead) => (
          <Select
            size="small"
            aria-label={`Pipeline của ${lead.name}`}
            value={lead.status}
            disabled={updatingLeadId === lead.id}
            className="academy-inline-select"
            options={statusOptionsFor(lead.status)}
            optionRender={(option) => (
              <StatusTag status={STATUS_TONES[option.value as AcademyLeadStatus]} label={String(option.label)} />
            )}
            labelRender={(option) => (
              <StatusTag
                status={STATUS_TONES[option.value as AcademyLeadStatus]}
                label={STATUS_LABELS[option.value as AcademyLeadStatus]}
              />
            )}
            onChange={(status) =>
              void quickUpdate(
                lead,
                { status },
                `Đã chuyển ${lead.name} sang ${STATUS_LABELS[status as AcademyLeadStatus]}.`
              )
            }
          />
        ),
      },
      {
        key: 'course',
        title: 'Khóa học',
        width: 230,
        render: (_, lead) => {
          const legacyCourseOption =
            lead.course && !courseOptions.some((option) => option.value === lead.course)
              ? [{ value: lead.course, label: `${lead.course} · dữ liệu cũ` }]
              : [];
          return (
            <Select
              allowClear
              showSearch
              aria-label={`Khóa học của ${lead.name}`}
              value={lead.course || undefined}
              loading={updatingLeadId === lead.id}
              disabled={updatingLeadId === lead.id}
              placeholder="Chưa chọn khóa"
              className="w-full academy-inline-select"
              options={[...legacyCourseOption, ...courseOptions]}
              filterOption={(input, option) =>
                removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))
              }
              onChange={(value) => void assignCourse(lead, value || null)}
            />
          );
        },
      },
      {
        key: 'goal',
        title: 'Mục tiêu',
        width: 210,
        render: (_, lead) => (
          <InlineTextCell
            ariaLabel={`Cập nhật mục tiêu của ${lead.name}`}
            value={lead.goal}
            placeholder="Chưa có mục tiêu"
            disabled={updatingLeadId === lead.id}
            onSave={(goal) => quickUpdate(lead, { goal }, `Đã cập nhật mục tiêu của ${lead.name}.`)}
          />
        ),
      },
      {
        key: 'owner',
        title: 'Phụ trách',
        width: 170,
        render: (_, lead) => (
          <Select
            allowClear
            size="small"
            aria-label={`Người phụ trách của ${lead.name}`}
            value={lead.owner?.id ?? 'UNASSIGNED'}
            disabled={updatingLeadId === lead.id}
            className="academy-inline-select"
            options={ownerOptions}
            onChange={(ownerStaffId) =>
              void quickUpdate(
                lead,
                { ownerStaffId: ownerStaffId === 'UNASSIGNED' || !ownerStaffId ? null : Number(ownerStaffId) },
                ownerStaffId === 'UNASSIGNED' || !ownerStaffId
                  ? `Đã bỏ người phụ trách của ${lead.name}.`
                  : `Đã giao ${lead.name} cho ${ownerOptions.find((item) => item.value === ownerStaffId)?.label || 'nhân sự mới'}.`
              )
            }
          />
        ),
      },
      {
        key: 'schedule',
        title: 'Lịch test',
        width: 180,
        render: (_, lead) => (
          <DatePicker
            allowClear
            showTime={{ format: 'HH:mm' }}
            format="DD/MM/YYYY HH:mm"
            placeholder="Chưa hẹn test"
            value={lead.scheduledAt ? dayjs(lead.scheduledAt) : null}
            disabled={updatingLeadId === lead.id}
            className="w-full academy-inline-date-picker"
            aria-label={`Lịch test của ${lead.name}`}
            onChange={(value) =>
              void quickUpdate(
                lead,
                { scheduledAt: value?.toISOString() || null },
                value ? `Đã cập nhật lịch test của ${lead.name}.` : `Đã xóa lịch test của ${lead.name}.`
              )
            }
          />
        ),
      },
      {
        key: 'flightDate',
        title: 'Ngày bay',
        width: 140,
        render: (_, lead) => (
          <DatePicker
            allowClear
            format="DD/MM/YYYY"
            placeholder="Chưa có"
            value={lead.flightDate ? dayjs(lead.flightDate) : null}
            disabled={updatingLeadId === lead.id}
            className="w-full academy-inline-date-picker"
            aria-label={`Ngày bay của ${lead.name}`}
            onChange={(value) =>
              void quickUpdate(
                lead,
                { flightDate: value?.format('YYYY-MM-DD') || null },
                value ? `Đã cập nhật ngày bay của ${lead.name}.` : `Đã xóa ngày bay của ${lead.name}.`
              )
            }
          />
        ),
      },
      {
        key: 'hot',
        title: 'Ưu tiên',
        width: 124,
        render: (_, lead) => (
          <Button
            size="small"
            type={lead.isHot ? 'primary' : 'text'}
            danger={lead.isHot}
            className="academy-hot-toggle"
            icon={<AppIcon icon={Flame} />}
            loading={updatingLeadId === lead.id}
            onClick={() =>
              void quickUpdate(
                lead,
                { isHot: !lead.isHot },
                !lead.isHot ? `Đã đánh dấu ${lead.name} là Hot.` : `Đã bỏ ưu tiên Hot cho ${lead.name}.`
              )
            }
          >
            {lead.isHot ? 'Hot' : 'Đánh dấu'}
          </Button>
        ),
      },
      {
        key: 'source',
        title: 'Nguồn',
        width: 165,
        render: (_, lead) => (
          <Space size={2} className="w-full">
            <InlineTextCell
              ariaLabel={`Cập nhật nguồn của ${lead.name}`}
              value={lead.source}
              placeholder="Chưa rõ nguồn"
              disabled={updatingLeadId === lead.id}
              onSave={(source) =>
                quickUpdate(lead, { source: source || 'Manual' }, `Đã cập nhật nguồn của ${lead.name}.`)
              }
            />
            {lead.facebookChatLink && (
              <Tooltip title="Mở hội thoại Pancake/Facebook">
                <a
                  className="academy-inline-link"
                  href={lead.facebookChatLink}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Mở chat của ${lead.name}`}
                >
                  <AppIcon icon={Link} />
                </a>
              </Tooltip>
            )}
          </Space>
        ),
      },
      {
        key: 'revenue',
        title: 'Tiền cọc / doanh thu',
        width: 175,
        render: (_, lead) => (
          <InlineVndCell
            value={lead.revenueVnd}
            ariaLabel={`Cập nhật tiền cọc hoặc doanh thu của ${lead.name}`}
            disabled={updatingLeadId === lead.id}
            onSave={(revenueVnd) => quickUpdate(lead, { revenueVnd }, `Đã cập nhật doanh thu của ${lead.name}.`)}
          />
        ),
      },
      {
        key: 'followUp',
        title: 'Follow-up tiếp theo',
        width: 230,
        render: (_, lead) => (
          <Tooltip title={lead.nextFollowUp?.content || 'Tạo task follow-up trong hồ sơ khách hàng'}>
            <Button
              size="small"
              type="text"
              className="academy-follow-up-cell"
              icon={<AppIcon icon={MessageSquare} />}
              onClick={() => openLead(lead)}
            >
              <span>{followUpLabel(lead)}</span>
              {lead.pendingFollowUpCount > 1 && <span className="tabular-nums">+{lead.pendingFollowUpCount - 1}</span>}
            </Button>
          </Tooltip>
        ),
      },
      {
        key: 'updatedAt',
        title: 'Cập nhật',
        width: 145,
        render: (_, lead) => dateLabel(lead.updatedAt),
      },
      {
        key: 'actions',
        title: 'Tác vụ',
        width: 278,
        render: (_, lead) => (
          <Space size={4} wrap>
            <Button size="small" icon={<AppIcon icon={Trophy} />} onClick={() => void openTalentWorkshop(lead)}>
              Tố Chất
            </Button>
            {lead.scheduledAt ? (
              <>
                <Button
                  size="small"
                  icon={<AppIcon icon={CircleCheck} />}
                  loading={updatingLeadId === lead.id}
                  onClick={() => void markTested(lead)}
                >
                  Đã test
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<AppIcon icon={CircleX} />}
                  loading={updatingLeadId === lead.id}
                  onClick={() => void markNoShow(lead)}
                >
                  Không đến
                </Button>
              </>
            ) : (
              <Button size="small" type="link" onClick={() => openLead(lead)}>
                Hẹn lại
              </Button>
            )}
          </Space>
        ),
      },
    ],
    [
      assignCourse,
      courseOptions,
      markNoShow,
      markTested,
      openLead,
      openTalentWorkshop,
      ownerOptions,
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
          <SearchField
            behavior="filter"
            value={workspace.search}
            onChange={(event) => workspace.setSearch(event.target.value)}
            placeholder="Tìm lead, khách hàng hoặc khóa học không dấu…"
            allowClear
          />
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
        activeFilterCount: workspace.activeFilterCount,
      }}
    >
      <MetricGrid
        columns={4}
        className="lead-manager-metric-grid"
        items={[
          {
            key: 'all',
            title: 'Tổng lead',
            value: workspace.summary.total,
            format: 'number',
            icon: <AppIcon icon={CalendarDays} />,
          },
          {
            key: 'scheduled',
            title: 'Đã hẹn test',
            value: workspace.summary.scheduledCount,
            format: 'number',
            icon: <AppIcon icon={CalendarDays} />,
          },
          {
            key: 'revenue',
            title: 'Doanh thu đã chốt',
            value: workspace.summary.wonRevenueVnd,
            format: 'vnd',
            icon: <AppIcon icon={CircleCheck} />,
          },
          {
            key: 'hot',
            title: 'Hot dưới 72 giờ',
            value: workspace.summary.hotCount,
            format: 'number',
            icon: <AppIcon icon={Flame} />,
          },
        ]}
      />

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
              <span className="hidden text-xs opacity-60 lg:inline">↔ Kéo ngang để xem thêm cột</span>
              <span className="tabular-nums opacity-70">{workspace.total.toLocaleString('vi-VN')} bản ghi</span>
            </Space>
          }
          state={sectionState || (workspace.leads.length === 0 ? 'empty' : undefined)}
          stateTitle={workspace.error || 'Chưa có lead theo bộ lọc'}
          stateDescription={workspace.error ? 'Hãy thử làm mới dữ liệu.' : undefined}
          stateExtra={workspace.error ? <Button onClick={() => void workspace.refresh()}>Thử lại</Button> : undefined}
        >
          <DataTable
            className="academy-lead-manager-table"
            rowKey="id"
            columns={leadColumns}
            dataSource={workspace.leads}
            loading={workspace.loading}
            scroll={{ x: 2480 }}
            stickyPrimaryColumn
            columnPriority={{
              stt: 'secondary',
              lead: 'primary',
              status: 'primary',
              course: 'primary',
              goal: 'secondary',
              owner: 'secondary',
              schedule: 'primary',
              flightDate: 'secondary',
              hot: 'secondary',
              source: 'tertiary',
              revenue: 'secondary',
              followUp: 'secondary',
              updatedAt: 'tertiary',
              actions: 'primary',
            }}
            mobileRenderer={(lead) => leadMobileCard(lead, openLead, openTalentWorkshop)}
            pagination={{
              current: workspace.page,
              pageSize: workspace.pageSize,
              total: workspace.total,
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

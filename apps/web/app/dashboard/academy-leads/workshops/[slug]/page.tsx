'use client';

import React from 'react';
import { Button, Form, Progress, Space, Tabs, message, theme } from 'antd';
import dayjs from 'dayjs';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Gamepad2,
  ListChecks,
  PackageCheck,
  Presentation,
  QrCode,
  Trophy,
  UserPlus,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import {
  removeVietnameseTones,
  type AcademyInstructorBonus,
  type AcademyLead,
  type AcademyTalentAssessment,
  type AcademyWorkshopParticipant,
  type AcademyWorkshopResourcesResponse,
  type AcademyWorkshopReward,
} from '@mos-lab/shared';
import { apiClient } from '../../../../../lib/api-client';
import { useAcademyAccess } from '../../components/AcademyAccessGate';
import { AppIcon, DataSection, FeaturePage, IconText, StatePanel } from '../../../../../components/ui';
import AcademyTalentWorkshopDrawer from '../../components/AcademyTalentWorkshopDrawer';
import AcademyWorkshopQuizManager from '../../components/AcademyWorkshopQuizManager';
import AcademyWorkshopQuizTemplateLibrary from '../../components/AcademyWorkshopQuizTemplateLibrary';
import AcademyWorkshopQuizTemplatePanel from '../../components/AcademyWorkshopQuizTemplatePanel';
import AcademyWorkshopRoster from '../../components/AcademyWorkshopRoster';
import {
  AcademyWorkshopHeaderActions,
  AcademyWorkshopMetrics,
  AcademyWorkshopSettlement,
} from '../../components/AcademyWorkshopWorkspaceSections';
import AcademyWorkshopAgendaManager from '../../components/AcademyWorkshopAgendaManager';
import AcademyWorkshopMenuManager from '../../components/AcademyWorkshopMenuManager';
import AcademyWorkshopEquipmentManager from '../../components/AcademyWorkshopEquipmentManager';
import { compressWorkshopImage } from '../../components/academy-workshop-image';
import AcademyWorkshopParticipantOverlays, {
  type AcademyWorkshopFeeForm,
  type AcademyWorkshopWalkInForm,
} from '../../components/AcademyWorkshopParticipantOverlays';
import { academyTalentCourseSelectionRules } from '../../components/academy-talent-workshop.adapter';
import type {
  AcademyTalentAssessmentView,
  AcademyTalentDraft,
  AcademyTalentLead,
} from '../../components/academy-talent-workshop.types';
import { useAcademyTalentLadderConfiguration } from '../../components/useAcademyTalentLadderConfiguration';
import { useAcademyWorkshopQuizActions } from '../../components/useAcademyWorkshopQuizActions';
import {
  buildTalentSessions,
  talentAssessmentRequest,
  talentWorkshopView,
} from '../../lead-manager/lead-manager.helpers';
import { useAcademyTalentResources } from '../../lead-manager/useAcademyTalentResources';
import styles from './AcademyWorkshopWorkspace.module.css';

type WorkshopWorkspaceThemeStyle = React.CSSProperties & Record<`--academy-workshop-${string}`, string>;

export default function AcademyWorkshopWorkspacePage() {
  const { token } = theme.useToken();
  const { canAccess, canManage } = useAcademyAccess();
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = decodeURIComponent(String(params.slug || ''));
  const [workshop, setWorkshop] = React.useState<Awaited<
    ReturnType<typeof apiClient.academySales.workshops.getBySlug>
  > | null>(null);
  const [participants, setParticipants] = React.useState<AcademyWorkshopParticipant[]>([]);
  const [resources, setResources] = React.useState<AcademyWorkshopResourcesResponse>({ staff: [], instructors: [] });
  const [rewards, setRewards] = React.useState<AcademyWorkshopReward[]>([]);
  const [bonuses, setBonuses] = React.useState<AcademyInstructorBonus[]>([]);
  const [leadOptions, setLeadOptions] = React.useState<AcademyLead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState('roster');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [selected, setSelected] = React.useState<AcademyWorkshopParticipant | null>(null);
  const [careDrawerOpen, setCareDrawerOpen] = React.useState(false);
  const [addLeadIds, setAddLeadIds] = React.useState<number[]>([]);
  const [leadSearch, setLeadSearch] = React.useState('');
  const deferredLeadSearch = React.useDeferredValue(leadSearch);
  const [leadLoading, setLeadLoading] = React.useState(false);
  const [leadError, setLeadError] = React.useState<string | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [walkInOpen, setWalkInOpen] = React.useState(false);
  const [feeOpen, setFeeOpen] = React.useState(false);
  const [templateLibraryOpen, setTemplateLibraryOpen] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState('');
  const [qrTargetUrl, setQrTargetUrl] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [busyParticipantId, setBusyParticipantId] = React.useState<number | null>(null);
  const [talentLead, setTalentLead] = React.useState<AcademyTalentLead | null>(null);
  const [talentParticipantId, setTalentParticipantId] = React.useState<number | null>(null);
  const [talentOpen, setTalentOpen] = React.useState(false);
  const [talentAssessments, setTalentAssessments] = React.useState<AcademyTalentAssessment[]>([]);
  const [talentAssessmentId, setTalentAssessmentId] = React.useState<number | null>(null);
  const [talentLoading, setTalentLoading] = React.useState(false);
  const [talentSaving, setTalentSaving] = React.useState(false);
  const talentLoadVersionRef = React.useRef(0);
  const talentAssessmentIdRef = React.useRef<number | null>(null);
  const [walkInForm] = Form.useForm<AcademyWorkshopWalkInForm>();
  const [feeForm] = Form.useForm<AcademyWorkshopFeeForm>();

  const talentLadder = useAcademyTalentLadderConfiguration(canAccess);
  const { courses, talentInstructors, saveTalentCourseConfiguration } = useAcademyTalentResources(canAccess);
  const talentCourseRules = React.useMemo(() => academyTalentCourseSelectionRules(courses), [courses]);

  React.useEffect(() => {
    if (!slug) return;
    const requestedTab = searchParams.get('tab');
    if (requestedTab && ['roster', 'game', 'agenda', 'menu', 'equipment', 'settlement'].includes(requestedTab)) {
      setActiveTab(requestedTab);
      return;
    }
    const saved = window.localStorage.getItem(`academy-workshop:${slug}:active-tab`);
    if (saved && ['roster', 'game', 'agenda', 'menu', 'equipment', 'settlement'].includes(saved)) setActiveTab(saved);
  }, [searchParams, slug]);

  const load = React.useCallback(async () => {
    if (!canAccess || !slug) return;
    setLoading(true);
    try {
      const detail = await apiClient.academySales.workshops.getBySlug(slug);
      const [roster, nextResources, nextRewards, nextBonuses] = await Promise.all([
        apiClient.academySales.workshops.listParticipants(detail.id, { page: 1, limit: 100 }),
        apiClient.academySales.workshops.resources(),
        apiClient.academySales.workshops.listRewards(detail.id),
        apiClient.academySales.workshops.listBonuses(detail.id),
      ]);
      setWorkshop(detail);
      setParticipants(roster.data);
      setResources(nextResources);
      setRewards(nextRewards);
      setBonuses(nextBonuses);
      setSelected((previous) => roster.data.find((item) => item.id === previous?.id) || null);
      setError(null);
    } catch (cause: any) {
      setError(cause?.response?.data?.message || 'Không thể tải workspace workshop.');
    } finally {
      setLoading(false);
    }
  }, [canAccess, slug]);

  React.useEffect(() => void load(), [load]);

  React.useEffect(() => {
    if (!addOpen) return;
    let active = true;
    setLeadLoading(true);
    setLeadError(null);
    const timer = window.setTimeout(
      () => {
        void apiClient.academySales
          .listLeads({ page: 1, limit: 100, search: deferredLeadSearch.trim() || undefined })
          .then((response) => {
            if (!active) return;
            setLeadOptions((current) => {
              const byId = new Map(current.map((lead) => [lead.id, lead]));
              response.data.forEach((lead) => byId.set(lead.id, lead));
              return [...byId.values()];
            });
          })
          .catch((cause: any) => {
            if (!active) return;
            setLeadError(cause?.response?.data?.message || 'Không thể tải danh sách học viên Academy.');
          })
          .finally(() => {
            if (active) setLeadLoading(false);
          });
      },
      deferredLeadSearch ? 250 : 0
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [addOpen, deferredLeadSearch]);

  const availableLeadOptions = React.useMemo(() => {
    const rosterLeadIds = new Set(participants.map((participant) => participant.lead.id));
    const normalizedSearch = removeVietnameseTones(leadSearch);
    return leadOptions.filter((lead) => {
      if (rosterLeadIds.has(lead.id)) return false;
      if (addLeadIds.includes(lead.id) || !normalizedSearch) return true;
      return removeVietnameseTones(`${lead.name} ${lead.phone || ''} ${lead.email || ''}`).includes(normalizedSearch);
    });
  }, [addLeadIds, leadOptions, leadSearch, participants]);

  const mutateParticipant = React.useCallback(
    async (mutation: () => Promise<AcademyWorkshopParticipant>, success: string, participantId?: number) => {
      setBusy(true);
      if (participantId) setBusyParticipantId(participantId);
      try {
        const next = await mutation();
        setParticipants((rows) => rows.map((row) => (row.id === next.id ? next : row)));
        setSelected((current) => (current?.id === next.id ? next : current));
        void apiClient.academySales.workshops
          .getBySlug(slug)
          .then(setWorkshop)
          .catch(() => undefined);
        message.success(success);
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể cập nhật học viên.');
      } finally {
        setBusy(false);
        setBusyParticipantId(null);
      }
    },
    [slug]
  );

  const {
    createWorkshopQuiz,
    updateWorkshopQuiz,
    saveWorkshopQuestion,
    deleteWorkshopQuestion,
    completeWorkshopQuiz,
    cloneWorkshopQuiz,
  } = useAcademyWorkshopQuizActions({ workshop, setWorkshop, setTemplateLibraryOpen });

  const openCareDrawer = React.useCallback((participant: AcademyWorkshopParticipant) => {
    setQrDataUrl('');
    setQrTargetUrl('');
    setSelected(participant);
    setCareDrawerOpen(true);
  }, []);

  const openFeeForParticipant = React.useCallback(
    (participant: AcademyWorkshopParticipant) => {
      setSelected(participant);
      feeForm.resetFields();
      feeForm.setFieldValue('method', 'BANK_TRANSFER');
      if (participant.feeRemainingVnd > 0) feeForm.setFieldValue('amountVnd', participant.feeRemainingVnd);
      setFeeOpen(true);
    },
    [feeForm]
  );

  const closeFeeModal = React.useCallback(() => {
    setFeeOpen(false);
    feeForm.resetFields();
    if (!careDrawerOpen) setSelected(null);
  }, [careDrawerOpen, feeForm]);

  const addExisting = React.useCallback(async () => {
    if (!workshop || !addLeadIds.length) return;
    setBusy(true);
    try {
      const added = await apiClient.academySales.workshops.addParticipants(workshop.id, { leadIds: addLeadIds });
      message.success(`Đã thêm ${added.length} học viên và cấp QR.`);
      setAddOpen(false);
      setAddLeadIds([]);
      setLeadSearch('');
      await load();
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Không thể thêm học viên.');
    } finally {
      setBusy(false);
    }
  }, [addLeadIds, load, workshop]);

  const createWalkIn = React.useCallback(
    async (values: AcademyWorkshopWalkInForm) => {
      if (!workshop) return;
      setBusy(true);
      try {
        const added = await apiClient.academySales.workshops.addWalkIn(workshop.id, values);
        setWalkInOpen(false);
        walkInForm.resetFields();
        setSelected(added);
        setCareDrawerOpen(true);
        setParticipants((rows) => [added, ...rows]);
        if (added.qrUrl) {
          const QRCode = (await import('qrcode')).default;
          setQrDataUrl(await QRCode.toDataURL(added.qrUrl, { width: 520, margin: 2 }));
          setQrTargetUrl(added.qrUrl);
        }
        message.success('Đã tạo walk-in và cấp QR.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể tạo walk-in.');
      } finally {
        setBusy(false);
      }
    },
    [walkInForm, workshop]
  );

  const reissueQr = React.useCallback(async () => {
    if (!workshop || !selected) return;
    await mutateParticipant(async () => {
      const next = await apiClient.academySales.workshops.reissueQr(workshop.id, selected.id);
      if (next.qrUrl) {
        const QRCode = (await import('qrcode')).default;
        setQrDataUrl(await QRCode.toDataURL(next.qrUrl, { width: 520, margin: 2 }));
        setQrTargetUrl(next.qrUrl);
      }
      return next;
    }, 'Đã cấp QR mới; QR cũ không còn hiệu lực.');
  }, [mutateParticipant, selected, workshop]);

  const saveFee = React.useCallback(
    async (values: AcademyWorkshopFeeForm) => {
      if (!workshop || !selected) return;
      await mutateParticipant(
        () => apiClient.academySales.workshops.recordFee(workshop.id, selected.id, values),
        'Đã ghi nhận bút toán phí.',
        selected.id
      );
      closeFeeModal();
    },
    [closeFeeModal, mutateParticipant, selected, workshop]
  );

  const uploadPhoto = React.useCallback(
    async (file: File) => {
      if (!workshop || !selected) return false;
      setBusy(true);
      try {
        const compressed = await compressWorkshopImage(file);
        const intent = await apiClient.academySales.workshops.createPhotoUploadIntent(workshop.id, selected.id, {
          fileName: compressed.name,
          mimeType: compressed.type as 'image/jpeg' | 'image/png' | 'image/webp',
          sizeBytes: compressed.size,
        });
        const response = await fetch(intent.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': compressed.type, 'x-upsert': 'false' },
          body: compressed,
        });
        if (!response.ok) throw new Error('Storage từ chối upload ảnh.');
        const next = await apiClient.academySales.workshops.confirmPhoto(workshop.id, selected.id, {
          storagePath: intent.storagePath,
          mimeType: compressed.type,
          sizeBytes: compressed.size,
          capturedAt: new Date().toISOString(),
        });
        setSelected(next);
        setParticipants((rows) => rows.map((row) => (row.id === next.id ? next : row)));
        message.success('Đã lưu ảnh khoảnh khắc.');
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || cause?.message || 'Không thể tải ảnh.');
      } finally {
        setBusy(false);
      }
      return false;
    },
    [selected, workshop]
  );

  const closeTalentAssessment = React.useCallback(() => {
    talentLoadVersionRef.current += 1;
    setTalentOpen(false);
    setTalentLead(null);
    setTalentParticipantId(null);
    setTalentAssessments([]);
    setTalentLoading(false);
    talentAssessmentIdRef.current = null;
    setTalentAssessmentId(null);
  }, []);

  const openTalentAssessment = React.useCallback(
    async (participantOverride?: AcademyWorkshopParticipant) => {
      const participant = participantOverride || selected;
      if (!participant) return;
      const version = ++talentLoadVersionRef.current;
      setTalentOpen(true);
      setTalentLoading(true);
      setTalentLead(null);
      setTalentParticipantId(participant.id);
      setTalentAssessments([]);
      talentAssessmentIdRef.current = null;
      setTalentAssessmentId(null);
      try {
        const [lead, response] = await Promise.all([
          apiClient.academySales.getLead(participant.lead.id),
          apiClient.academySales.listTalentAssessments(participant.lead.id),
        ]);
        if (version !== talentLoadVersionRef.current) return;
        setTalentLead(lead);
        setTalentAssessments(response.data);
        const requestedAssessmentId = participant.talent?.assessmentId;
        const nextAssessmentId =
          requestedAssessmentId && response.data.some((assessment) => assessment.id === requestedAssessmentId)
            ? requestedAssessmentId
            : null;
        talentAssessmentIdRef.current = nextAssessmentId;
        setTalentAssessmentId(nextAssessmentId);
      } catch (cause: any) {
        if (version !== talentLoadVersionRef.current) return;
        closeTalentAssessment();
        message.error(cause?.response?.data?.message || 'Không thể tải phiên Tố Chất.');
      } finally {
        if (version === talentLoadVersionRef.current) setTalentLoading(false);
      }
    },
    [closeTalentAssessment, selected]
  );

  const selectedTalentAssessment = React.useMemo(
    () => talentAssessments.find((assessment) => assessment.id === talentAssessmentId) ?? null,
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
      if (!talentLead || !talentParticipantId) throw new Error('Chưa chọn học viên workshop.');
      setTalentSaving(true);
      try {
        const dto = talentAssessmentRequest(draft);
        const activeAssessmentId = talentAssessmentIdRef.current;
        const response = activeAssessmentId
          ? await apiClient.academySales.updateTalentAssessment(activeAssessmentId, dto)
          : await apiClient.academySales.createTalentAssessment(talentLead.id, {
              ...dto,
              workshopParticipantId: talentParticipantId,
            });
        return upsertTalentAssessment(response.data);
      } finally {
        setTalentSaving(false);
      }
    },
    [talentLead, talentParticipantId, upsertTalentAssessment]
  );

  const previewTalentQuote = React.useCallback(
    async (draft: AcademyTalentDraft) => {
      if (!talentLead) throw new Error('Chưa chọn học viên workshop.');
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

  const quickUpdateCare = React.useCallback(
    (
      participant: AcademyWorkshopParticipant,
      input: Parameters<typeof apiClient.academySales.workshops.updateCare>[2],
      success: string
    ) => {
      if (!workshop) return Promise.resolve();
      return mutateParticipant(
        () => apiClient.academySales.workshops.updateCare(workshop.id, participant.id, input),
        success,
        participant.id
      );
    },
    [mutateParticipant, workshop]
  );

  const quickCheckIn = React.useCallback(
    (participant: AcademyWorkshopParticipant) => {
      if (!workshop) return Promise.resolve();
      return mutateParticipant(
        () => apiClient.academySales.workshops.checkIn(workshop.id, participant.id, { checkedIn: true }),
        'Check-in thành công.',
        participant.id
      );
    },
    [mutateParticipant, workshop]
  );

  const quickAssignInstructor = React.useCallback(
    (participant: AcademyWorkshopParticipant, instructorId: number | null) => {
      if (!workshop) return Promise.resolve();
      return mutateParticipant(
        () => apiClient.academySales.workshops.assignInstructor(workshop.id, participant.id, { instructorId }),
        instructorId ? 'Đã phân giáo viên chính.' : 'Đã bỏ phân giáo viên chính.',
        participant.id
      );
    },
    [mutateParticipant, workshop]
  );

  if (!canAccess) return <StatePanel kind="empty" title="Bạn chưa có quyền truy cập workshop." />;
  if (error)
    return <StatePanel kind="error" title={error} extra={<Button onClick={() => void load()}>Thử lại</Button>} />;
  if (!workshop) return <StatePanel kind="loading" title="Đang dựng workspace workshop…" />;

  const selectWorkshopTab = (key: string) => {
    setActiveTab(key);
    window.localStorage.setItem(`academy-workshop:${slug}:active-tab`, key);
  };

  const workspaceThemeStyle: WorkshopWorkspaceThemeStyle = {
    '--academy-workshop-bg': token.colorBgContainer,
    '--academy-workshop-border': token.colorBorderSecondary,
    '--academy-workshop-fill': token.colorFillSecondary,
    '--academy-workshop-fill-alter': token.colorFillAlter,
    '--academy-workshop-primary': token.colorPrimary,
    '--academy-workshop-primary-bg': token.colorPrimaryBg,
    '--academy-workshop-primary-border': token.colorPrimaryBorder,
    '--academy-workshop-text': token.colorText,
    '--academy-workshop-text-secondary': token.colorTextSecondary,
  };

  return (
    <FeaturePage
      className={styles.workspace}
      contentClassName={styles.content}
      style={workspaceThemeStyle}
      title={workshop.name}
      subtitle={`${dayjs(workshop.startsAt).format('DD/MM/YYYY · HH:mm')} · ${workshop.location}`}
      icon={<AppIcon icon={Presentation} />}
      tag={`Mã ${workshop.displayCode}`}
      headerActions={
        <AcademyWorkshopHeaderActions
          workshop={workshop}
          staffOptions={resources.staff}
          canEdit={canAccess}
          loading={loading}
          onRefresh={() => void load()}
          onOpenLive={() => router.push(`/dashboard/academy-leads/workshops/${workshop.slug}/live`)}
          onUpdated={(updated) => {
            setWorkshop(updated);
            if (updated.slug !== slug)
              router.replace(`/dashboard/academy-leads/workshops/${encodeURIComponent(updated.slug)}`);
          }}
        />
      }
    >
      <AcademyWorkshopMetrics summary={workshop.summary} />

      <Tabs
        className={styles.tabs}
        activeKey={activeTab}
        onChange={selectWorkshopTab}
        items={[
          {
            key: 'roster',
            label: <IconText icon={<AppIcon icon={Users} size="sm" />}>Roster & chăm sóc</IconText>,
            children: (
              <DataSection
                title="Học viên workshop"
                extra={
                  <Space wrap align="center" size={8}>
                    <Button
                      onClick={() => {
                        const token = window.prompt('Dán QR token để check-in');
                        if (token)
                          void apiClient.academySales.workshops
                            .scanCheckIn(workshop.id, token)
                            .then(() => load())
                            .catch((cause) => message.error(cause?.response?.data?.message || 'QR không hợp lệ'));
                      }}
                    >
                      <IconText icon={<AppIcon icon={QrCode} />}>Quét / nhập QR</IconText>
                    </Button>
                    <Button onClick={() => setWalkInOpen(true)}>
                      <IconText icon={<AppIcon icon={UserPlus} />}>Học viên mới / Walk-in</IconText>
                    </Button>
                    <Button type="primary" onClick={() => setAddOpen(true)}>
                      <IconText icon={<AppIcon icon={Users} />}>Thêm học viên</IconText>
                    </Button>
                  </Space>
                }
              >
                <AcademyWorkshopRoster
                  participants={participants}
                  resources={resources}
                  loading={loading}
                  page={page}
                  pageSize={pageSize}
                  busyParticipantId={busyParticipantId}
                  talentLoading={talentLoading}
                  talentParticipantId={talentParticipantId}
                  onPageChange={(nextPage, nextSize) => {
                    setPage(nextPage);
                    setPageSize(nextSize);
                  }}
                  onOpenParticipant={openCareDrawer}
                  onOpenFee={openFeeForParticipant}
                  onUpdateCare={(participant, input, success) => {
                    void quickUpdateCare(participant, input, success);
                  }}
                  onCheckIn={(participant) => {
                    void quickCheckIn(participant);
                  }}
                  onAssignInstructor={(participant, instructorId) => {
                    void quickAssignInstructor(participant, instructorId);
                  }}
                  onOpenTalent={(participant) => {
                    void openTalentAssessment(participant);
                  }}
                />
              </DataSection>
            ),
          },
          {
            key: 'agenda',
            label: <IconText icon={<AppIcon icon={ListChecks} size="sm" />}>Agenda & timeline</IconText>,
            children: (
              <AcademyWorkshopAgendaManager
                workshop={workshop}
                canEdit={canAccess}
                onUpdated={setWorkshop}
                onRefresh={load}
                onOpenResourceTab={selectWorkshopTab}
              />
            ),
          },
          {
            key: 'game',
            label: (
              <IconText icon={<AppIcon icon={Gamepad2} />}>
                Game & câu hỏi ({workshop.activeQuiz?.questions.length || 0})
              </IconText>
            ),
            children: (
              <div className="space-y-4">
                <AcademyWorkshopQuizTemplatePanel
                  workshopId={workshop.id}
                  quiz={workshop.activeQuiz}
                  canEdit={canAccess}
                  onApplied={(quiz) => setWorkshop((current) => (current ? { ...current, activeQuiz: quiz } : current))}
                  onOpenLibrary={() => setTemplateLibraryOpen(true)}
                />
                <AcademyWorkshopQuizManager
                  workshopId={workshop.id}
                  quiz={workshop.activeQuiz}
                  onCreateQuiz={createWorkshopQuiz}
                  onUpdateQuiz={updateWorkshopQuiz}
                  onSaveQuestion={saveWorkshopQuestion}
                  onDeleteQuestion={deleteWorkshopQuestion}
                  onCompleteQuiz={completeWorkshopQuiz}
                  onCloneQuiz={cloneWorkshopQuiz}
                  onOpenLiveControl={() => router.push(`/dashboard/academy-leads/workshops/${workshop.slug}/live`)}
                />
              </div>
            ),
          },
          {
            key: 'menu',
            label: <IconText icon={<AppIcon icon={UtensilsCrossed} size="sm" />}>Thực đơn</IconText>,
            children: <AcademyWorkshopMenuManager workshop={workshop} canEdit={canAccess} onUpdated={setWorkshop} />,
          },
          {
            key: 'equipment',
            label: <IconText icon={<AppIcon icon={PackageCheck} size="sm" />}>Dụng cụ thực hành</IconText>,
            children: (
              <AcademyWorkshopEquipmentManager workshop={workshop} canEdit={canAccess} onUpdated={setWorkshop} />
            ),
          },
          {
            key: 'settlement',
            label: (
              <IconText icon={<AppIcon icon={Trophy} size="sm" />}>
                Thưởng & đối soát (
                {rewards.filter((item) => item.status === 'PROMISED').length +
                  bonuses.filter((item) => item.status === 'EARNED').length}
                )
              </IconText>
            ),
            children: (
              <AcademyWorkshopSettlement
                rewards={rewards}
                bonuses={bonuses}
                onFulfillReward={(rewardId) =>
                  void apiClient.academySales.workshops
                    .updateReward(workshop.id, rewardId, { status: 'FULFILLED' })
                    .then(load)
                }
                onPayBonus={(bonusId) =>
                  void apiClient.academySales.workshops.updateBonus(workshop.id, bonusId, { status: 'PAID' }).then(load)
                }
              />
            ),
          },
        ]}
      />

      <AcademyWorkshopQuizTemplateLibrary
        open={templateLibraryOpen}
        workshopId={workshop.id}
        onClose={() => setTemplateLibraryOpen(false)}
        onApplied={(quiz) => setWorkshop((current) => (current ? { ...current, activeQuiz: quiz } : current))}
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
        canEditLadder={canManage}
        canManageCourses={canManage}
        canConfirmPayment={canManage}
        onClose={closeTalentAssessment}
        onPreviewQuote={previewTalentQuote}
        onSaveDraft={saveTalentDraft}
        onIssueInvoice={issueTalentInvoice}
        onRecordPayment={recordTalentPayment}
        onSelectSession={selectTalentSession}
        onStartNewSession={startNewTalentSession}
        onSaveLadderConfiguration={talentLadder.save}
        onSaveCourseConfiguration={saveTalentCourseConfiguration}
        onSaved={async () => {
          await load();
        }}
      />

      <AcademyWorkshopParticipantOverlays
        workshop={workshop}
        selected={selected}
        resources={resources}
        busy={busy}
        talentLoading={talentLoading}
        careDrawerOpen={careDrawerOpen}
        qrDataUrl={qrDataUrl}
        qrTargetUrl={qrTargetUrl}
        addOpen={addOpen}
        addLeadIds={addLeadIds}
        leadSearch={leadSearch}
        leadLoading={leadLoading}
        leadError={leadError}
        availableLeadOptions={availableLeadOptions}
        walkInOpen={walkInOpen}
        feeOpen={feeOpen}
        walkInForm={walkInForm}
        feeForm={feeForm}
        onCloseCare={() => {
          setCareDrawerOpen(false);
          setSelected(null);
          setQrDataUrl('');
          setQrTargetUrl('');
        }}
        onReissueQr={() => {
          void reissueQr();
        }}
        onUpdateCare={(input, success) => {
          if (!selected) return;
          void mutateParticipant(
            () => apiClient.academySales.workshops.updateCare(workshop.id, selected.id, input),
            success,
            selected.id
          );
        }}
        onCheckIn={(checkedIn) => {
          if (!selected) return;
          void mutateParticipant(
            () => apiClient.academySales.workshops.checkIn(workshop.id, selected.id, { checkedIn }),
            checkedIn ? 'Check-in thành công.' : 'Đã hoàn tác check-in.',
            selected.id
          );
        }}
        onOpenFee={() => setFeeOpen(true)}
        onAssignInstructor={(instructorId) => {
          if (!selected) return;
          void mutateParticipant(
            () => apiClient.academySales.workshops.assignInstructor(workshop.id, selected.id, { instructorId }),
            instructorId ? 'Đã phân giáo viên chính.' : 'Đã bỏ phân giáo viên chính.',
            selected.id
          );
        }}
        onSetPhotoConsent={(consent) => {
          if (!selected) return;
          void mutateParticipant(
            () =>
              apiClient.academySales.workshops.setConsent(workshop.id, selected.id, {
                consent,
                policyVersion: 'academy-photo-v1',
              }),
            consent ? 'Đã ghi nhận consent.' : 'Đã thu hồi consent.',
            selected.id
          );
        }}
        onUploadPhoto={(file) => {
          void uploadPhoto(file);
        }}
        onOpenTalent={() => {
          void openTalentAssessment();
        }}
        onAddExisting={() => {
          void addExisting();
        }}
        onAddLeadIdsChange={setAddLeadIds}
        onLeadSearchChange={setLeadSearch}
        onCloseAdd={() => {
          setAddOpen(false);
          setAddLeadIds([]);
          setLeadSearch('');
          setLeadError(null);
        }}
        onOpenWalkInFromAdd={() => {
          setAddOpen(false);
          setAddLeadIds([]);
          setLeadSearch('');
          setWalkInOpen(true);
        }}
        onCloseWalkIn={() => setWalkInOpen(false)}
        onCreateWalkIn={(values) => {
          void createWalkIn(values);
        }}
        onCloseFee={closeFeeModal}
        onSaveFee={(values) => {
          void saveFee(values);
        }}
      />
    </FeaturePage>
  );
}

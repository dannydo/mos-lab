'use client';

import React from 'react';
import { Button, Space, Tabs, message, theme } from 'antd';
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
  Wrench,
} from 'lucide-react';
import type {
  AcademyInstructorBonus,
  AcademyWorkshopParticipant,
  AcademyWorkshopResourcesResponse,
  AcademyWorkshopReward,
} from '@mos-lab/shared';
import { apiClient } from '../../../../../lib/api-client';
import { useAcademyAccess } from '../../components/AcademyAccessGate';
import { AppIcon, DataSection, FeaturePage, IconText, StatePanel } from '../../../../../components/ui';
import AcademyTalentWorkshopDrawer from '../../components/AcademyTalentWorkshopDrawer';
import AcademyWorkshopQuizManager from '../../components/AcademyWorkshopQuizManager';
import AcademyWorkshopQuizTemplateLibrary from '../../components/AcademyWorkshopQuizTemplateLibrary';
import AcademyWorkshopQuizTemplatePanel from '../../components/AcademyWorkshopQuizTemplatePanel';
import AcademyWorkshopRoster from '../../components/AcademyWorkshopRoster';
import AcademyWorkshopRosterToolbar from '../../components/AcademyWorkshopRosterToolbar';
import AcademyWorkshopSectionTitle from '../../components/AcademyWorkshopSectionTitle';
import {
  AcademyWorkshopHeaderActions,
  AcademyWorkshopMetrics,
  AcademyWorkshopSettlement,
} from '../../components/AcademyWorkshopWorkspaceSections';
import AcademyWorkshopAgendaManager from '../../components/AcademyWorkshopAgendaManager';
import AcademyWorkshopMenuManager from '../../components/AcademyWorkshopMenuManager';
import AcademyWorkshopEquipmentManager from '../../components/AcademyWorkshopEquipmentManager';
import AcademyWorkshopParticipantOverlays from '../../components/AcademyWorkshopParticipantOverlays';
import AcademyWorkshopPrintBadgesModal from '../../components/AcademyWorkshopPrintBadgesModal';
import AcademyWorkshopZaloScriptModal from '../../components/AcademyWorkshopZaloScriptModal';
import AcademyWorkshopQrCheckInModal from '../../components/AcademyWorkshopQrCheckInModal';
import AcademyWorkshopKitchenOrderModal from '../../components/AcademyWorkshopKitchenOrderModal';
import AcademyWorkshopEquipmentPrepModal from '../../components/AcademyWorkshopEquipmentPrepModal';
import { academyTalentCourseSelectionRules } from '../../components/academy-talent-workshop.adapter';
import { useAcademyTalentLadderConfiguration } from '../../components/useAcademyTalentLadderConfiguration';
import { useAcademyWorkshopQuizActions } from '../../components/useAcademyWorkshopQuizActions';
import { useAcademyWorkshopTalentAssessment } from '../../components/useAcademyWorkshopTalentAssessment';
import { useAcademyWorkshopParticipantActions } from '../../components/useAcademyWorkshopParticipantActions';
import { useAcademyTalentResources } from '../../lead-manager/useAcademyTalentResources';
import styles from './AcademyWorkshopWorkspace.module.css';

type WorkshopWorkspaceThemeStyle = React.CSSProperties & Record<`--academy-workshop-${string}`, string>;

export default function AcademyWorkshopWorkspacePage() {
  const { token } = theme.useToken();
  const { canAccess, canManage, canManageRestricted } = useAcademyAccess();
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
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState('roster');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [templateLibraryOpen, setTemplateLibraryOpen] = React.useState(false);
  const [printBadgesOpen, setPrintBadgesOpen] = React.useState(false);
  const [zaloScriptParticipant, setZaloScriptParticipant] = React.useState<AcademyWorkshopParticipant | null>(null);
  const [qrCheckInOpen, setQrCheckInOpen] = React.useState(false);
  const [kitchenModalOpen, setKitchenModalOpen] = React.useState(false);
  const [equipmentPrepModalOpen, setEquipmentPrepModalOpen] = React.useState(false);

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
      participantActions.setSelected((previous) => roster.data.find((item) => item.id === previous?.id) || null);
      setError(null);
    } catch (cause: any) {
      setError(cause?.response?.data?.message || 'Không thể tải workspace workshop.');
    } finally {
      setLoading(false);
    }
  }, [canAccess, slug]);

  const participantActions = useAcademyWorkshopParticipantActions({
    workshop,
    slug,
    canManageRestricted,
    participants,
    setWorkshop,
    setParticipants,
    load,
  });

  const talentAssessment = useAcademyWorkshopTalentAssessment(participantActions.selected);

  React.useEffect(() => {
    void load();
  }, [load]);

  const {
    createWorkshopQuiz,
    updateWorkshopQuiz,
    saveWorkshopQuestion,
    deleteWorkshopQuestion,
    completeWorkshopQuiz,
    cloneWorkshopQuiz,
  } = useAcademyWorkshopQuizActions({ workshop, setWorkshop, setTemplateLibraryOpen });

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
          onOpenPrintBadges={() => setPrintBadgesOpen(true)}
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
                title={
                  <AcademyWorkshopSectionTitle
                    icon={Users}
                    title="Học viên workshop"
                    subtitle={<span className="tabular-nums">{participants.length} học viên</span>}
                  />
                }
                extra={
                  <AcademyWorkshopRosterToolbar
                    hasMenuItems={workshop.menuItems.length > 0}
                    hasEquipmentPackages={workshop.equipmentPackages.length > 0}
                    onOpenKitchenModal={() => setKitchenModalOpen(true)}
                    onOpenEquipmentPrepModal={() => setEquipmentPrepModalOpen(true)}
                    onOpenQrCheckIn={() => setQrCheckInOpen(true)}
                    onOpenWalkIn={() => participantActions.setWalkInOpen(true)}
                    onOpenAddParticipant={() => participantActions.setAddOpen(true)}
                  />
                }
              >
                <AcademyWorkshopRoster
                  participants={participants}
                  resources={resources}
                  menuTitle={workshop.menuTemplate?.title}
                  loading={loading}
                  page={page}
                  pageSize={pageSize}
                  busyParticipantId={participantActions.busyParticipantId}
                  talentLoading={talentAssessment.talentLoading}
                  talentParticipantId={talentAssessment.talentParticipantId}
                  canManageRestricted={canManageRestricted}
                  onPageChange={(nextPage, nextSize) => {
                    setPage(nextPage);
                    setPageSize(nextSize);
                  }}
                  onOpenParticipant={participantActions.openCareDrawer}
                  onOpenFee={participantActions.openFeeForParticipant}
                  onUpdateCare={(participant, input, success) => {
                    void participantActions.quickUpdateCare(participant, input, success);
                  }}
                  onCheckIn={(participant) => {
                    void participantActions.quickCheckIn(participant);
                  }}
                  onAssignInstructor={(participant, instructorId) => {
                    void participantActions.quickAssignInstructor(participant, instructorId);
                  }}
                  onOpenTalent={(participant) => {
                    void talentAssessment.openTalentAssessment(participant);
                  }}
                  onOpenZaloScript={(participant) => {
                    setZaloScriptParticipant(participant);
                  }}
                  onOpenSelections={participantActions.openSelectionsForParticipant}
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
            children: (
              <AcademyWorkshopMenuManager
                workshop={workshop}
                participants={participants}
                canEdit={canAccess}
                onUpdated={setWorkshop}
              />
            ),
          },
          {
            key: 'equipment',
            label: <IconText icon={<AppIcon icon={PackageCheck} size="sm" />}>Dụng cụ thực hành</IconText>,
            children: (
              <AcademyWorkshopEquipmentManager
                workshop={workshop}
                participants={participants}
                canEdit={canAccess}
                onUpdated={setWorkshop}
              />
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
                workshop={workshop}
                participants={participants}
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
        open={talentAssessment.talentOpen}
        lead={talentAssessment.talentLead}
        courses={courses}
        assessment={talentAssessment.selectedTalentView}
        sessions={talentAssessment.talentSessions}
        loading={talentAssessment.talentLoading}
        saving={talentAssessment.talentSaving}
        courseSelectionRules={talentCourseRules}
        instructors={talentInstructors}
        ladderConfiguration={talentLadder.configuration}
        canEditLadder={canManageRestricted}
        canManageCourses={canManage}
        canConfirmPayment={canManageRestricted}
        onClose={talentAssessment.closeTalentAssessment}
        onPreviewQuote={talentAssessment.previewTalentQuote}
        onSaveDraft={talentAssessment.saveTalentDraft}
        onIssueInvoice={talentAssessment.issueTalentInvoice}
        onRecordPayment={talentAssessment.recordTalentPayment}
        onSelectSession={talentAssessment.selectTalentSession}
        onStartNewSession={talentAssessment.startNewTalentSession}
        onSaveLadderConfiguration={talentLadder.save}
        onSaveCourseConfiguration={saveTalentCourseConfiguration}
        onSaved={async () => {
          await load();
        }}
      />

      <AcademyWorkshopParticipantOverlays
        workshop={workshop}
        selected={participantActions.selected}
        resources={resources}
        busy={participantActions.busy}
        talentLoading={talentAssessment.talentLoading}
        canManageRestricted={canManageRestricted}
        careDrawerOpen={participantActions.careDrawerOpen}
        qrDataUrl={participantActions.qrDataUrl}
        qrTargetUrl={participantActions.qrTargetUrl}
        addOpen={participantActions.addOpen}
        addLeadIds={participantActions.addLeadIds}
        leadSearch={participantActions.leadSearch}
        leadLoading={participantActions.leadLoading}
        leadError={participantActions.leadError}
        availableLeadOptions={participantActions.availableLeadOptions}
        walkInOpen={participantActions.walkInOpen}
        feeOpen={participantActions.feeOpen}
        walkInForm={participantActions.walkInForm}
        feeForm={participantActions.feeForm}
        selectionsOpen={participantActions.selectionsOpen}
        selectionsParticipant={participantActions.selectionsParticipant}
        onOpenSelections={participantActions.openSelectionsForParticipant}
        onCloseSelections={participantActions.closeSelectionsModal}
        onSaveSelections={participantActions.saveSelections}
        onCloseCare={() => {
          participantActions.setCareDrawerOpen(false);
          participantActions.setSelected(null);
          participantActions.setQrDataUrl('');
          participantActions.setQrTargetUrl('');
        }}
        onReissueQr={() => {
          void participantActions.reissueQr();
        }}
        onUpdateCare={(input, success) => {
          if (!participantActions.selected) return;
          void participantActions.mutateParticipant(
            () => apiClient.academySales.workshops.updateCare(workshop.id, participantActions.selected!.id, input),
            success,
            participantActions.selected.id
          );
        }}
        onCheckIn={(checkedIn) => {
          if (!participantActions.selected) return;
          void participantActions.mutateParticipant(
            () => apiClient.academySales.workshops.checkIn(workshop.id, participantActions.selected!.id, { checkedIn }),
            checkedIn ? 'Check-in thành công.' : 'Đã hoàn tác check-in.',
            participantActions.selected.id
          );
        }}
        onOpenFee={() => {
          if (canManageRestricted) participantActions.setFeeOpen(true);
        }}
        onAssignInstructor={(instructorId) => {
          if (!participantActions.selected) return;
          void participantActions.mutateParticipant(
            () =>
              apiClient.academySales.workshops.assignInstructor(workshop.id, participantActions.selected!.id, {
                instructorId,
              }),
            instructorId ? 'Đã phân giáo viên chính.' : 'Đã bỏ phân giáo viên chính.',
            participantActions.selected.id
          );
        }}
        onSetPhotoConsent={(consent) => {
          if (!participantActions.selected) return;
          void participantActions.mutateParticipant(
            () =>
              apiClient.academySales.workshops.setConsent(workshop.id, participantActions.selected!.id, {
                consent,
                policyVersion: 'academy-photo-v1',
              }),
            consent ? 'Đã ghi nhận consent.' : 'Đã thu hồi consent.',
            participantActions.selected.id
          );
        }}
        onUploadPhoto={(file) => {
          void participantActions.uploadPhoto(file);
        }}
        onOpenTalent={() => {
          void talentAssessment.openTalentAssessment();
        }}
        onAddExisting={() => {
          void participantActions.addExisting();
        }}
        onAddLeadIdsChange={participantActions.setAddLeadIds}
        onLeadSearchChange={participantActions.setLeadSearch}
        onCloseAdd={() => {
          participantActions.setAddOpen(false);
          participantActions.setAddLeadIds([]);
          participantActions.setLeadSearch('');
          participantActions.setLeadError(null);
        }}
        onOpenWalkInFromAdd={() => {
          participantActions.setAddOpen(false);
          participantActions.setAddLeadIds([]);
          participantActions.setLeadSearch('');
          participantActions.setWalkInOpen(true);
        }}
        onCloseWalkIn={() => participantActions.setWalkInOpen(false)}
        onCreateWalkIn={(values) => {
          void participantActions.createWalkIn(values);
        }}
        onCloseFee={participantActions.closeFeeModal}
        onSaveFee={(values) => {
          void participantActions.saveFee(values);
        }}
        onOpenZaloScript={(participant) => {
          setZaloScriptParticipant(participant);
        }}
      />

      <AcademyWorkshopPrintBadgesModal
        open={printBadgesOpen}
        onClose={() => setPrintBadgesOpen(false)}
        workshop={workshop}
        participants={participants}
      />

      <AcademyWorkshopZaloScriptModal
        open={Boolean(zaloScriptParticipant)}
        onClose={() => setZaloScriptParticipant(null)}
        workshop={workshop}
        participant={zaloScriptParticipant}
        onMarkInfoSent={(participant) => {
          void participantActions.quickUpdateCare(participant, { infoSent: true }, 'Đã đánh dấu đã gửi thông tin.');
        }}
      />

      <AcademyWorkshopQrCheckInModal
        open={qrCheckInOpen}
        onClose={() => setQrCheckInOpen(false)}
        workshopId={workshop.id}
        onSuccess={load}
      />

      <AcademyWorkshopKitchenOrderModal
        open={kitchenModalOpen}
        onClose={() => setKitchenModalOpen(false)}
        workshop={workshop}
        participants={participants}
      />

      <AcademyWorkshopEquipmentPrepModal
        open={equipmentPrepModalOpen}
        onClose={() => setEquipmentPrepModalOpen(false)}
        workshop={workshop}
        participants={participants}
      />
    </FeaturePage>
  );
}

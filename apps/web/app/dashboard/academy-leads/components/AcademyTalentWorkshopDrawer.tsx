'use client';

import React from 'react';
import { Skeleton, theme } from 'antd';
import { ACADEMY_TALENT_STRANDS_5_MIN_MAX } from '@mos-lab/shared';
import { AdaptiveModal, StatePanel } from '../../../../components/ui';
import { useTheme } from '../../../../context/ThemeContext';
import AcademyTalentInvoice from './AcademyTalentInvoice';
import AcademyTalentFollowUpPaymentSlip from './AcademyTalentFollowUpPaymentSlip';
import type { AcademyTalentAssessmentView, AcademyTalentWorkshopProps } from './academy-talent-workshop.types';
import styles from './AcademyTalentWorkshop.module.css';
import { CourseSelectionStep } from './academy-talent-workshop-drawer/CourseSelectionStep';
import { ScholarshipRewardFlightOverlay } from './academy-talent-workshop-drawer/ScholarshipCelebrationParts';
import { ScoreAssessmentStep } from './academy-talent-workshop-drawer/ScoreAssessmentStep';
import { useWorkshopDerivedState } from './academy-talent-workshop-drawer/useWorkshopDerivedState';
import { useWorkshopLadderEditor } from './academy-talent-workshop-drawer/useWorkshopLadderEditor';
import { useWorkshopPaymentFollowUp } from './academy-talent-workshop-drawer/useWorkshopPaymentFollowUp';
import { useWorkshopPopupLayout } from './academy-talent-workshop-drawer/useWorkshopPopupLayout';
import { useWorkshopQuotePreview } from './academy-talent-workshop-drawer/useWorkshopQuotePreview';
import { useWorkshopScholarshipFlight } from './academy-talent-workshop-drawer/useWorkshopScholarshipFlight';
import { useWorkshopSessionActions } from './academy-talent-workshop-drawer/useWorkshopSessionActions';
import { buildWorkshopSurfaceStyle, normalizeDraft } from './academy-talent-workshop-drawer/workshop-drawer-utils';
import { WorkshopCourseFooter } from './academy-talent-workshop-drawer/WorkshopCourseFooter';
import { WorkshopHeader } from './academy-talent-workshop-drawer/WorkshopHeader';
import { WorkshopOverlays } from './academy-talent-workshop-drawer/WorkshopOverlays';
import { WorkshopTopControls } from './academy-talent-workshop-drawer/WorkshopTopControls';

/**
 * Full Academy-native talent assessment workflow. This component has no
 * pricing/ranking calculation: every result panel comes from `assessment`
 * returned by the server after a save.
 */
export function AcademyTalentWorkshopDrawer({
  open,
  lead,
  courses,
  assessment,
  sessions = [],
  loading = false,
  saving = false,
  courseSelectionRules = {},
  onClose,
  onPreviewQuote,
  onSaveDraft,
  onIssueInvoice,
  onMarkInvoicePrinted,
  onSelectSession,
  onStartNewSession,
  onSaved,
  instructors = [],
  ladderConfiguration = null,
  canEditLadder = false,
  canManageCourses = false,
  canConfirmPayment = false,
  autoOpenPaymentFollowUp = false,
  onSaveLadderConfiguration,
  onSaveCourseConfiguration,
  onRecordPayment,
}: AcademyTalentWorkshopProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [draft, setDraft] = React.useState(() => normalizeDraft(assessment?.draft));
  const [view, setView] = React.useState<AcademyTalentAssessmentView | null>(assessment);
  const [isNewSession, setIsNewSession] = React.useState(false);
  const [busyAction, setBusyAction] = React.useState<'save' | 'invoice' | 'payment' | 'session' | null>(null);
  const [printView, setPrintView] = React.useState<AcademyTalentAssessmentView | null>(null);
  const [printPreviewOpen, setPrintPreviewOpen] = React.useState(false);
  const [courseMarket, setCourseMarket] = React.useState<'DOMESTIC' | 'OVERSEAS'>('DOMESTIC');
  const [instructorMenuCourseId, setInstructorMenuCourseId] = React.useState<number | null>(null);

  const displayView = isNewSession ? null : view || assessment;
  const hasPrintedInvoice = Boolean(displayView?.invoice);
  // A printed tuition document remains editable until every VND is confirmed
  // in the payment ledger. Printing itself is intent, not settlement.
  const isIssued = displayView?.payment.status === 'PAID';
  const orderedSessions = React.useMemo(
    () => [...sessions].sort((left, right) => left.sessionNumber - right.sessionNumber),
    [sessions]
  );
  const nextSessionNumber = React.useMemo(
    () => Math.max(0, ...orderedSessions.map((session) => session.sessionNumber)) + 1,
    [orderedSessions]
  );

  const {
    layoutMode,
    isAutoScaleLayout,
    customPopupWidth,
    customPopupHeight,
    isResizingPopup,
    setWorkshopLayoutMode,
    startPopupResize,
  } = useWorkshopPopupLayout();

  const {
    setPreviewQuote,
    setQuoteDirty,
    previewError,
    setPreviewError,
    shouldPreviewQuote,
    isPreviewPending,
    previewResult,
    previewPricing,
    resetQuoteState,
  } = useWorkshopQuotePreview({ open, lead, onPreviewQuote, isIssued, draft });

  const {
    result,
    pricing,
    effectiveRewards,
    rewardHeadline,
    milestones,
    draftErrorTotal,
    ladderRewards,
    scoreRewardHeadline,
    selectedCourseIds,
    hasSelectedCourses,
    selectedCourseRewardAmounts,
    coursesById,
    buomUnlocked,
    instructorsById,
    autoInstructor,
    marketCourses,
    domesticCourses,
    overseasCourses,
    recommendedIds,
    scholarshipCelebrationIntensity,
    coursePriceHint,
    courseAddOnPriceHint,
    marketPriceLabel,
  } = useWorkshopDerivedState({
    courses,
    instructors,
    ladderConfiguration,
    draft,
    displayView,
    previewResult,
    previewPricing,
    shouldPreviewQuote,
    isPreviewPending,
    previewError,
    courseMarket,
  });

  // A live, server-calculated quote is enough to review the recommended course.
  // Saving remains an explicit action in the course/payment step.
  const canOpenCourseStep = Boolean(lead && (result || displayView));
  const isBusy = saving || busyAction !== null;
  const inputDisabled = isBusy || isIssued;
  const paymentChoiceDisabled = inputDisabled || !hasSelectedCourses;
  const paymentChoiceHint = hasSelectedCourses
    ? undefined
    : 'Chọn ít nhất một khóa học trước khi chọn hình thức thanh toán.';

  const {
    scholarshipRewardFlight,
    scholarshipCelebration,
    scholarshipTargetReady,
    courseSelectionReady,
    scholarshipSourceRef,
    scholarshipTargetRef,
    resetScholarshipTransition,
    openCourseStepWithScholarshipTransfer,
    returnToScoreStep,
  } = useWorkshopScholarshipFlight({
    step,
    setStep,
    canOpenCourseStep,
    scoreRewardHeadline,
    ladderRewards,
    scholarshipCelebrationIntensity,
  });

  const {
    printDocument,
    setPrintDocument,
    paymentFollowUpOpen,
    setPaymentFollowUpOpen,
    paymentSlipOpen,
    setPaymentSlipOpen,
    paymentAmountVnd,
    setPaymentAmountVnd,
    paymentMethod,
    setPaymentMethod,
    paymentReference,
    setPaymentReference,
    paymentNote,
    setPaymentNote,
    openPaymentFollowUp,
    recordPayment,
    openPaymentSlipPreview,
    printPaymentSlip,
  } = useWorkshopPaymentFollowUp({
    printView,
    displayView,
    autoOpenPaymentFollowUp,
    onRecordPayment,
    onSaved,
    setView,
    setDraft,
    setPrintView,
    setQuoteDirty,
    setBusyAction,
  });

  const {
    editMode,
    ladderConfigurationDraft,
    setLadderConfigurationDraft,
    courseConfigurationOpen,
    savingLadderConfiguration,
    closeGlobalEditor,
    openLadderTierEditor,
    updateLadderConfigurationDraft,
    addLadderConfigurationTier,
    deleteLadderConfigurationTier,
    saveLadderConfiguration,
    toggleGlobalEditMode,
  } = useWorkshopLadderEditor({
    canEditLadder,
    ladderConfiguration,
    onSaveLadderConfiguration,
    onPreviewQuote,
    lead,
    isIssued,
    draft,
    setPreviewQuote,
    setPreviewError,
    setQuoteDirty,
  });

  const {
    updateQuoteDraft,
    updateAssessmentOnlyDraft,
    saveAssessment,
    saveSelection,
    setErrorCount,
    setCourseSelected,
    setCourseAddOnSelected,
    setCourseInstructor,
    openInvoicePreview,
    issueInvoiceAndOpenPreview,
    selectSession,
    startNewSession,
  } = useWorkshopSessionActions({
    lead,
    draft,
    setDraft,
    setView,
    displayView,
    isIssued,
    nextSessionNumber,
    pricing,
    result,
    milestones,
    coursesById,
    buomUnlocked,
    courseSelectionRules,
    setIsNewSession,
    setStep,
    setBusyAction,
    setPrintView,
    setPrintPreviewOpen,
    setPrintDocument,
    setInstructorMenuCourseId,
    resetQuoteState,
    onSaveDraft,
    onIssueInvoice,
    onMarkInvoicePrinted,
    onSelectSession,
    onStartNewSession,
    onSaved,
  });

  const surfaceStyle = React.useMemo(() => buildWorkshopSurfaceStyle(token), [token]);

  React.useEffect(() => {
    if (!open) {
      setPrintPreviewOpen(false);
      setPaymentFollowUpOpen(false);
      return;
    }
    resetScholarshipTransition();
    setStep(1);
    setView(assessment);
    setIsNewSession(false);
    setDraft(normalizeDraft(assessment?.draft));
    setPrintView(assessment?.invoice ? assessment : null);
    setPrintPreviewOpen(false);
    setPaymentFollowUpOpen(false);
    // Rehydrate the visual result from the same Fastify preview used while
    // dragging. Older sessions can contain a historical quote snapshot that
    // no longer matches their persisted score, so never pair that stale
    // summary with a current ladder marker.
    resetQuoteState(Boolean(assessment && !assessment.invoice));
    closeGlobalEditor();
    const selectedMarket = courses.find((course) => assessment?.draft.selectedCourseIds.includes(course.id))?.market;
    setCourseMarket(selectedMarket === 'OVERSEAS' ? 'OVERSEAS' : 'DOMESTIC');
    // A save returns a fresh object for the same session. Resetting on that
    // reference change would immediately pull the operator back to step 1
    // instead of continuing into course selection. Only reset when opening the
    // workshop, switching learner, or selecting a different assessment session.
  }, [assessment?.id, lead?.id, open]);

  const closeWorkshop = React.useCallback(() => {
    setPrintPreviewOpen(false);
    onClose();
  }, [onClose]);

  const workshopTitle = 'WORKSHOP: TÌM KIẾM TÀI NĂNG NỐI MI';
  const activePaymentView = printView || displayView;

  return (
    <>
      <AdaptiveModal
        open={open}
        onCancel={closeWorkshop}
        closable={false}
        footer={null}
        centered
        // Auto scale is intentionally a real popup, not a viewport-sized drawer:
        // it owns every available pixel inside a consistent 20px browser margin.
        // The workshop body is then the only scroll container.
        width={isAutoScaleLayout ? 'calc(100vw - 40px)' : `${customPopupWidth}px`}
        style={
          isAutoScaleLayout
            ? {
                ...surfaceStyle,
                height: 'calc(100dvh - 40px)',
                margin: '20px auto',
                maxHeight: 'calc(100dvh - 40px)',
                maxWidth: 'calc(100vw - 40px)',
                top: 0,
                width: 'calc(100vw - 40px)',
              }
            : {
                ...surfaceStyle,
                margin: 0,
                maxHeight: 'calc(100dvh - 40px)',
                maxWidth: 'calc(100vw - 40px)',
              }
        }
        intent="data"
        // The global OmiCall launcher lives at z-index 10040. A focused
        // workshop must sit above it so its sticky footer (especially Print)
        // remains reachable on every viewport.
        zIndex={11050}
        className={`${styles.modal} ${isAutoScaleLayout ? styles.modalAutoScale : styles.modalCustom} ${themeMode === 'dark' ? styles.themeDark : styles.themeLight}`}
        wrapClassName={styles.modalWrap}
        styles={{
          content: {
            height: isAutoScaleLayout ? 'calc(100dvh - 40px)' : `${customPopupHeight}px`,
            maxHeight: '100%',
            overflow: 'hidden',
            padding: 0,
          },
          body: {
            display: 'flex',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            padding: 0,
            position: 'relative',
          },
        }}
        destroyOnHidden={false}
        aria-label="Workshop Tố Chất Academy"
      >
        {layoutMode === 'custom' && (
          <div
            aria-label="Kéo để thay đổi kích thước popup workshop"
            className={`${styles.resizeHandle} ${isResizingPopup ? styles.resizeHandleActive : ''}`}
            onMouseDown={startPopupResize}
            title="Kéo góc phải dưới để thay đổi kích thước (tự lưu)"
          />
        )}
        <WorkshopTopControls
          layoutMode={layoutMode}
          editMode={editMode}
          step={step}
          canEditLadder={canEditLadder}
          canManageCourses={canManageCourses}
          hasLadderConfiguration={Boolean(ladderConfiguration)}
          canSaveLadderConfiguration={Boolean(onSaveLadderConfiguration)}
          canSaveCourseConfiguration={Boolean(onSaveCourseConfiguration)}
          onSetLayoutMode={setWorkshopLayoutMode}
          onToggleGlobalEdit={() => toggleGlobalEditMode(step)}
          onClose={closeWorkshop}
        />
        <div className={styles.workshop} style={surfaceStyle}>
          <WorkshopHeader
            workshopTitle={workshopTitle}
            step={step}
            canOpenCourseStep={canOpenCourseStep}
            lead={lead}
            orderedSessions={orderedSessions}
            displayView={displayView}
            isBusy={isBusy}
            isIssued={isIssued}
            isNewSession={isNewSession}
            nextSessionNumber={nextSessionNumber}
            busyAction={busyAction}
            canSelectSession={Boolean(onSelectSession)}
            canStartNewSession={Boolean(onStartNewSession)}
            onReturnToScoreStep={returnToScoreStep}
            onOpenCourseStep={openCourseStepWithScholarshipTransfer}
            onSelectSession={(assessmentId) => void selectSession(assessmentId)}
            onStartNewSession={startNewSession}
            onSaveAssessment={() => void saveAssessment()}
          />

          {!lead ? (
            <StatePanel
              kind="empty"
              surface={false}
              title="Chọn một học viên Academy để bắt đầu"
              description="Mở Tố Chất từ hồ sơ hoặc hàng lead của học viên cần được đánh giá."
            />
          ) : loading ? (
            <div className={styles.loadingState}>
              <Skeleton active paragraph={{ rows: 12 }} />
            </div>
          ) : (
            <div className={styles.body}>
              {step === 1 ? (
                <ScoreAssessmentStep
                  isIssued={isIssued}
                  hasPrintedInvoice={hasPrintedInvoice}
                  draft={draft}
                  inputDisabled={inputDisabled}
                  scoreRewardHeadline={scoreRewardHeadline}
                  ladderRewards={ladderRewards}
                  milestones={milestones}
                  sliderMax={ACADEMY_TALENT_STRANDS_5_MIN_MAX}
                  editMode={editMode}
                  draftErrorTotal={draftErrorTotal}
                  result={result}
                  scholarshipSourceRef={scholarshipSourceRef}
                  onUpdateAssessmentOnlyDraft={updateAssessmentOnlyDraft}
                  onUpdateQuoteDraft={updateQuoteDraft}
                  onEditTier={(tierKey) => openLadderTierEditor(tierKey)}
                  onSetErrorCount={setErrorCount}
                  onChangeNote={(note) => setDraft((current) => ({ ...current, note }))}
                />
              ) : (
                <CourseSelectionStep
                  courseSelectionReady={courseSelectionReady}
                  displayView={displayView}
                  lead={lead}
                  courseMarket={courseMarket}
                  domesticCourseCount={domesticCourses.length}
                  overseasCourseCount={overseasCourses.length}
                  domesticPriceLabel={marketPriceLabel('DOMESTIC')}
                  overseasPriceLabel={marketPriceLabel('OVERSEAS')}
                  marketCourses={marketCourses}
                  selectedCourseIds={selectedCourseIds}
                  recommendedIds={recommendedIds}
                  buomUnlocked={buomUnlocked}
                  inputDisabled={inputDisabled}
                  courseSelectionRules={courseSelectionRules}
                  draft={draft}
                  pricing={pricing}
                  result={result}
                  instructors={instructors}
                  instructorsById={instructorsById}
                  autoInstructor={autoInstructor}
                  instructorMenuCourseId={instructorMenuCourseId}
                  coursePriceHint={coursePriceHint}
                  courseAddOnPriceHint={courseAddOnPriceHint}
                  onChangeCourseMarket={setCourseMarket}
                  onSelectCourse={setCourseSelected}
                  onToggleInstructorMenu={(courseId) =>
                    setInstructorMenuCourseId((current) => (current === courseId ? null : courseId))
                  }
                  onSelectCourseInstructor={setCourseInstructor}
                  onToggleAddOn={setCourseAddOnSelected}
                />
              )}
            </div>
          )}

          {scholarshipRewardFlight && <ScholarshipRewardFlightOverlay flight={scholarshipRewardFlight} />}

          {lead && !loading && step === 2 && (
            <WorkshopCourseFooter
              scholarshipTargetRef={scholarshipTargetRef}
              scholarshipTargetReady={scholarshipTargetReady}
              scholarshipCelebration={scholarshipCelebration}
              selectedCourseRewardAmounts={selectedCourseRewardAmounts}
              rewardHeadline={rewardHeadline}
              effectiveRewards={effectiveRewards}
              courseSelectionReady={courseSelectionReady}
              hasSelectedCourses={hasSelectedCourses}
              draft={draft}
              pricing={pricing}
              paymentChoiceDisabled={paymentChoiceDisabled}
              paymentChoiceHint={paymentChoiceHint}
              isIssued={isIssued}
              hasPrintedInvoice={hasPrintedInvoice}
              isBusy={isBusy}
              onSelectDepositMode={() =>
                updateQuoteDraft((current) => ({
                  ...current,
                  paymentMode: 'DEPOSIT',
                  depositVnd: current.depositVnd ?? pricing?.suggestedDepositVnd ?? null,
                }))
              }
              onSelectFullMode={() => updateQuoteDraft((current) => ({ ...current, paymentMode: 'FULL' }))}
              onSaveSelection={() => void saveSelection()}
              onOpenInvoicePreview={openInvoicePreview}
            />
          )}

          {lead && printView && printDocument === 'INVOICE' && (
            <div className={styles.printOnly} aria-hidden="true">
              <AcademyTalentInvoice lead={lead} assessment={printView} />
            </div>
          )}
          {lead && paymentSlipOpen && printDocument === 'FOLLOW_UP' && activePaymentView && (
            <div className={styles.printOnly} aria-hidden="true">
              <AcademyTalentFollowUpPaymentSlip
                lead={lead}
                assessment={activePaymentView}
                amountVnd={Math.round(Number(paymentAmountVnd) || 0)}
                method={paymentMethod}
                reference={paymentReference}
              />
            </div>
          )}
        </div>
      </AdaptiveModal>

      <WorkshopOverlays
        lead={lead}
        courses={courses}
        printPreviewOpen={printPreviewOpen}
        printView={printView}
        activePaymentView={activePaymentView}
        isBusy={isBusy}
        paymentFollowUpOpen={paymentFollowUpOpen}
        paymentSlipOpen={paymentSlipOpen}
        canConfirmPayment={canConfirmPayment}
        busyAction={busyAction}
        paymentMethod={paymentMethod}
        paymentAmountVnd={paymentAmountVnd}
        paymentReference={paymentReference}
        paymentNote={paymentNote}
        canManageCourses={canManageCourses}
        courseConfigurationOpen={courseConfigurationOpen}
        ladderConfigurationDraft={ladderConfigurationDraft}
        savingLadderConfiguration={savingLadderConfiguration}
        onClosePrintPreview={() => setPrintPreviewOpen(false)}
        onOpenPaymentFollowUp={openPaymentFollowUp}
        onIssueAndPrintInvoice={() => void issueInvoiceAndOpenPreview(true)}
        onCloseFollowUp={() => setPaymentFollowUpOpen(false)}
        onCloseSlip={() => setPaymentSlipOpen(false)}
        onChangePaymentMethod={setPaymentMethod}
        onChangePaymentAmount={setPaymentAmountVnd}
        onChangePaymentReference={setPaymentReference}
        onChangePaymentNote={setPaymentNote}
        onOpenSlipPreview={openPaymentSlipPreview}
        onRecordPayment={() => void recordPayment()}
        onPrintSlip={printPaymentSlip}
        onCloseGlobalEditor={closeGlobalEditor}
        onSaveCourseConfiguration={onSaveCourseConfiguration}
        onSaveLadderConfiguration={() => void saveLadderConfiguration()}
        onReplaceLadderDraft={setLadderConfigurationDraft}
        onUpdateLadderTier={updateLadderConfigurationDraft}
        onAddLadderTier={addLadderConfigurationTier}
        onDeleteLadderTier={deleteLadderConfigurationTier}
      />
    </>
  );
}

export default AcademyTalentWorkshopDrawer;

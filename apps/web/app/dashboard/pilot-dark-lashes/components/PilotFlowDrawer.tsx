'use client';

import React from 'react';
import { AdaptiveDrawer } from '~/components/ui';
import type { PilotFlowDrawerProps } from './pilot-flow-drawer/pilot-flow-config';
import { usePilotFlowDrawer } from './pilot-flow-drawer/usePilotFlowDrawer';
import {
  PilotFlowBookingStep,
  PilotFlowCheckInStep,
  PilotFlowDrawerTitle,
  PilotFlowProgressBar,
} from './pilot-flow-drawer/PilotFlowHeaderAndCheckIn';
import { PilotAssessmentStep } from './pilot-flow-drawer/PilotAssessmentStep';
import { PilotServiceAndBeforePhotoSteps } from './pilot-flow-drawer/PilotServiceAndBeforePhotoSteps';
import { PilotAfterPhotoAndCompletionSteps } from './pilot-flow-drawer/PilotAfterPhotoAndCompletionSteps';

export type { PilotFlowDrawerProps };

export function PilotFlowDrawer({ open, session, onClose, onSessionUpdated }: PilotFlowDrawerProps) {
  const {
    submittingAction,
    feedbackRating,
    setFeedbackRating,
    feedbackNote,
    setFeedbackNote,
    sessionSteps,
    criteriaList,
    loadingCriteria,
    evaluations,
    assessmentResult,
    setAssessmentResult,
    assessmentReason,
    setAssessmentReason,
    assessmentNotes,
    setAssessmentNotes,
    isEditingAssessment,
    setIsEditingAssessment,
    aiAssessment,
    macroPhotoUrl,
    isAnalyzingAi,
    currentStatus,
    currentStepIdx,
    isIneligible,
    hasAfterPhoto,
    hasFeedback,
    canCheckOut,
    handleStepsChange,
    handleCriterionEvaluationChange,
    handleCheckIn,
    handleUploadPhoto,
    handleRunAiAnalysis,
    handleServiceDone,
    handleSaveFeedback,
    handleSaveAssessment,
    handleCheckOut,
  } = usePilotFlowDrawer({ open, session, onSessionUpdated });

  if (!session) return null;

  return (
    <AdaptiveDrawer
      intent="form"
      title={<PilotFlowDrawerTitle session={session} />}
      open={open}
      onClose={onClose}
      width={720}
      className="pilot-flow-drawer"
      destroyOnClose
    >
      <div className="space-y-6 pb-12">
        <PilotFlowProgressBar currentStepIdx={currentStepIdx} />

        <PilotFlowBookingStep session={session} />

        <PilotFlowCheckInStep
          session={session}
          currentStatus={currentStatus}
          submittingAction={submittingAction}
          onCheckIn={handleCheckIn}
        />

        <PilotAssessmentStep
          session={session}
          currentStatus={currentStatus}
          isIneligible={isIneligible}
          submittingAction={submittingAction}
          criteriaList={criteriaList}
          loadingCriteria={loadingCriteria}
          evaluations={evaluations}
          assessmentResult={assessmentResult}
          assessmentReason={assessmentReason}
          assessmentNotes={assessmentNotes}
          isEditingAssessment={isEditingAssessment}
          aiAssessment={aiAssessment}
          macroPhotoUrl={macroPhotoUrl}
          isAnalyzingAi={isAnalyzingAi}
          onCriterionChange={handleCriterionEvaluationChange}
          onUploadMacroPhoto={(file) => handleUploadPhoto('macro', file)}
          onRunAiAnalysis={() => handleRunAiAnalysis()}
          onSelectAssessmentResult={setAssessmentResult}
          onAssessmentReasonChange={setAssessmentReason}
          onAssessmentNotesChange={setAssessmentNotes}
          onSetEditingAssessment={setIsEditingAssessment}
          onSaveAssessment={handleSaveAssessment}
        />

        <PilotServiceAndBeforePhotoSteps
          session={session}
          currentStatus={currentStatus}
          isIneligible={isIneligible}
          submittingAction={submittingAction}
          sessionSteps={sessionSteps}
          aiAssessment={aiAssessment}
          onUploadBeforePhoto={(file) => handleUploadPhoto('before', file)}
          onStepsChange={handleStepsChange}
          onServiceDone={handleServiceDone}
        />

        <PilotAfterPhotoAndCompletionSteps
          session={session}
          currentStatus={currentStatus}
          isIneligible={isIneligible}
          submittingAction={submittingAction}
          feedbackRating={feedbackRating}
          feedbackNote={feedbackNote}
          hasAfterPhoto={hasAfterPhoto}
          hasFeedback={hasFeedback}
          canCheckOut={canCheckOut}
          onUploadAfterPhoto={(file) => handleUploadPhoto('after', file)}
          onFeedbackRatingChange={setFeedbackRating}
          onFeedbackNoteChange={setFeedbackNote}
          onSaveFeedback={handleSaveFeedback}
          onCheckOut={handleCheckOut}
        />
      </div>
    </AdaptiveDrawer>
  );
}

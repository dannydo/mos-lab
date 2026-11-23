'use client';

import React from 'react';
import type {
  AcademyCampaign,
  AcademyCourse,
  AcademyStaffOption,
  AcademyTalentInstructor,
  AcademyTalentLadderConfiguration,
  ToggleAcademyCampaignTouchpointLogRequest,
} from '@mos-lab/shared';
import AcademyCampaignFormDrawer, { type AcademyCampaignFormPayload } from '../../components/AcademyCampaignFormDrawer';
import AcademyCampaignLeadPicker from '../../components/AcademyCampaignLeadPicker';
import AcademyCampaignTouchpointDrawer from '../../components/AcademyCampaignTouchpointDrawer';
import AcademyTalentWorkshopDrawer from '../../../components/AcademyTalentWorkshopDrawer';
import type {
  AcademyTalentAssessmentSession,
  AcademyTalentAssessmentView,
  AcademyTalentCourseSelectionRule,
  AcademyTalentLead,
  AcademyTalentWorkshopProps,
} from '../../../components/academy-talent-workshop.types';
import type { CampaignTouchpointContext } from './useCampaignDetailState';

export interface CampaignDetailOverlaysProps {
  campaign: AcademyCampaign;
  staff: AcademyStaffOption[];
  courses: AcademyCourse[];
  canConfigure: boolean;
  canManageMembership: boolean;
  canManageRestricted: boolean;
  formOpen: boolean;
  formSubmitting: boolean;
  onCloseForm: () => void;
  onSubmitForm: (payload: AcademyCampaignFormPayload) => void | Promise<void>;
  leadPickerOpen: boolean;
  memberIdsOnPage: number[];
  onCloseLeadPicker: () => void;
  onConfirmLeadPicker: (leadIds: number[]) => void | Promise<void>;
  touchpointContext: CampaignTouchpointContext | null;
  touchpointSubmitting: boolean;
  onCloseTouchpoint: () => void;
  onSubmitTouchpoint: (payload: ToggleAcademyCampaignTouchpointLogRequest) => void | Promise<void>;
  talentOpen: boolean;
  talentLead: AcademyTalentLead | null;
  selectedTalentView: AcademyTalentAssessmentView | null;
  talentSessions: AcademyTalentAssessmentSession[];
  talentLoading: boolean;
  talentSaving: boolean;
  talentCourseRules: Record<number, AcademyTalentCourseSelectionRule>;
  talentInstructors: AcademyTalentInstructor[];
  talentLadderConfiguration: AcademyTalentLadderConfiguration | null;
  onCloseTalent: () => void;
  onPreviewTalentQuote: AcademyTalentWorkshopProps['onPreviewQuote'];
  onSaveTalentDraft: AcademyTalentWorkshopProps['onSaveDraft'];
  onIssueTalentInvoice: AcademyTalentWorkshopProps['onIssueInvoice'];
  onRecordTalentPayment: AcademyTalentWorkshopProps['onRecordPayment'];
  onSelectTalentSession: AcademyTalentWorkshopProps['onSelectSession'];
  onStartNewTalentSession: AcademyTalentWorkshopProps['onStartNewSession'];
  onSaveTalentLadderConfiguration: AcademyTalentWorkshopProps['onSaveLadderConfiguration'];
  onSaveTalentCourseConfiguration: AcademyTalentWorkshopProps['onSaveCourseConfiguration'];
  onTalentSaved: () => void | Promise<void>;
}

export function CampaignDetailOverlays({
  campaign,
  staff,
  courses,
  canConfigure,
  canManageMembership,
  canManageRestricted,
  formOpen,
  formSubmitting,
  onCloseForm,
  onSubmitForm,
  leadPickerOpen,
  memberIdsOnPage,
  onCloseLeadPicker,
  onConfirmLeadPicker,
  touchpointContext,
  touchpointSubmitting,
  onCloseTouchpoint,
  onSubmitTouchpoint,
  talentOpen,
  talentLead,
  selectedTalentView,
  talentSessions,
  talentLoading,
  talentSaving,
  talentCourseRules,
  talentInstructors,
  talentLadderConfiguration,
  onCloseTalent,
  onPreviewTalentQuote,
  onSaveTalentDraft,
  onIssueTalentInvoice,
  onRecordTalentPayment,
  onSelectTalentSession,
  onStartNewTalentSession,
  onSaveTalentLadderConfiguration,
  onSaveTalentCourseConfiguration,
  onTalentSaved,
}: CampaignDetailOverlaysProps) {
  return (
    <>
      {canConfigure && (
        <AcademyCampaignFormDrawer
          open={formOpen}
          campaign={campaign}
          staff={staff}
          courses={courses}
          submitting={formSubmitting}
          onClose={onCloseForm}
          onSubmit={onSubmitForm}
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
          onClose={onCloseLeadPicker}
          onConfirm={onConfirmLeadPicker}
        />
      )}

      <AcademyCampaignTouchpointDrawer
        open={Boolean(touchpointContext)}
        lead={touchpointContext?.lead || null}
        touchpoint={touchpointContext?.touchpoint || null}
        submitting={touchpointSubmitting}
        onClose={onCloseTouchpoint}
        onSubmit={onSubmitTouchpoint}
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
        ladderConfiguration={talentLadderConfiguration}
        canEditLadder={canManageRestricted}
        canManageCourses={canConfigure}
        canConfirmPayment={canManageRestricted}
        onClose={onCloseTalent}
        onPreviewQuote={onPreviewTalentQuote}
        onSaveDraft={onSaveTalentDraft}
        onIssueInvoice={onIssueTalentInvoice}
        onRecordPayment={onRecordTalentPayment}
        onSelectSession={onSelectTalentSession}
        onStartNewSession={onStartNewTalentSession}
        onSaveLadderConfiguration={onSaveTalentLadderConfiguration}
        onSaveCourseConfiguration={onSaveTalentCourseConfiguration}
        onSaved={onTalentSaved}
      />
    </>
  );
}

'use client';

import React from 'react';
import type {
  AcademyCourse,
  AcademyTalentPaymentMethod,
  UpdateAcademyTalentLadderConfigurationRequest,
} from '@mos-lab/shared';
import { AcademyTalentCourseConfigurationModal } from '../AcademyTalentCourseConfigurationModal';
import type {
  AcademyTalentAssessmentView,
  AcademyTalentCourseConfigurationInput,
  AcademyTalentLead,
} from '../academy-talent-workshop.types';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { LadderConfigurationModal } from './LadderConfigurationModal';
import { PaymentFollowUpModals } from './PaymentFollowUpModals';

export interface WorkshopOverlaysProps {
  lead: AcademyTalentLead | null;
  courses: AcademyCourse[];
  printPreviewOpen: boolean;
  printView: AcademyTalentAssessmentView | null;
  activePaymentView: AcademyTalentAssessmentView | null | undefined;
  isBusy: boolean;
  paymentFollowUpOpen: boolean;
  paymentSlipOpen: boolean;
  canConfirmPayment: boolean;
  busyAction: 'save' | 'invoice' | 'payment' | 'session' | null;
  paymentMethod: AcademyTalentPaymentMethod;
  paymentAmountVnd: number | null;
  paymentReference: string;
  paymentNote: string;
  canManageCourses: boolean;
  courseConfigurationOpen: boolean;
  ladderConfigurationDraft: UpdateAcademyTalentLadderConfigurationRequest['tiers'] | null;
  savingLadderConfiguration: boolean;
  onClosePrintPreview: () => void;
  onOpenPaymentFollowUp: () => void;
  onIssueAndPrintInvoice: () => void;
  onCloseFollowUp: () => void;
  onCloseSlip: () => void;
  onChangePaymentMethod: (method: AcademyTalentPaymentMethod) => void;
  onChangePaymentAmount: (amount: number | null) => void;
  onChangePaymentReference: (reference: string) => void;
  onChangePaymentNote: (note: string) => void;
  onOpenSlipPreview: () => void;
  onRecordPayment: () => void;
  onPrintSlip: () => void;
  onCloseGlobalEditor: () => void;
  onSaveCourseConfiguration?: (input: AcademyTalentCourseConfigurationInput[]) => Promise<AcademyCourse[]>;
  onSaveLadderConfiguration: () => void;
  onReplaceLadderDraft: (tiers: UpdateAcademyTalentLadderConfigurationRequest['tiers']) => void;
  onUpdateLadderTier: (
    tierKey: string,
    patch: Partial<UpdateAcademyTalentLadderConfigurationRequest['tiers'][number]>
  ) => void;
  onAddLadderTier: () => void;
  onDeleteLadderTier: (tierKey: string) => void;
}

export function WorkshopOverlays({
  lead,
  courses,
  printPreviewOpen,
  printView,
  activePaymentView,
  isBusy,
  paymentFollowUpOpen,
  paymentSlipOpen,
  canConfirmPayment,
  busyAction,
  paymentMethod,
  paymentAmountVnd,
  paymentReference,
  paymentNote,
  canManageCourses,
  courseConfigurationOpen,
  ladderConfigurationDraft,
  savingLadderConfiguration,
  onClosePrintPreview,
  onOpenPaymentFollowUp,
  onIssueAndPrintInvoice,
  onCloseFollowUp,
  onCloseSlip,
  onChangePaymentMethod,
  onChangePaymentAmount,
  onChangePaymentReference,
  onChangePaymentNote,
  onOpenSlipPreview,
  onRecordPayment,
  onPrintSlip,
  onCloseGlobalEditor,
  onSaveCourseConfiguration,
  onSaveLadderConfiguration,
  onReplaceLadderDraft,
  onUpdateLadderTier,
  onAddLadderTier,
  onDeleteLadderTier,
}: WorkshopOverlaysProps) {
  return (
    <>
      <InvoicePreviewModal
        open={printPreviewOpen}
        lead={lead}
        printView={printView}
        isBusy={isBusy}
        onClose={onClosePrintPreview}
        onOpenPaymentFollowUp={onOpenPaymentFollowUp}
        onIssueAndPrint={onIssueAndPrintInvoice}
      />

      <PaymentFollowUpModals
        lead={lead}
        paymentView={activePaymentView}
        paymentFollowUpOpen={paymentFollowUpOpen}
        paymentSlipOpen={paymentSlipOpen}
        canConfirmPayment={canConfirmPayment}
        busyAction={busyAction}
        paymentMethod={paymentMethod}
        paymentAmountVnd={paymentAmountVnd}
        paymentReference={paymentReference}
        paymentNote={paymentNote}
        onCloseFollowUp={onCloseFollowUp}
        onCloseSlip={onCloseSlip}
        onChangeMethod={onChangePaymentMethod}
        onChangeAmount={onChangePaymentAmount}
        onChangeReference={onChangePaymentReference}
        onChangeNote={onChangePaymentNote}
        onOpenSlipPreview={onOpenSlipPreview}
        onRecordPayment={onRecordPayment}
        onPrintSlip={onPrintSlip}
      />

      {canManageCourses && onSaveCourseConfiguration && (
        <AcademyTalentCourseConfigurationModal
          open={courseConfigurationOpen}
          courses={courses}
          onCancel={onCloseGlobalEditor}
          onSave={onSaveCourseConfiguration}
        />
      )}

      <LadderConfigurationModal
        draftTiers={ladderConfigurationDraft}
        saving={savingLadderConfiguration}
        onClose={onCloseGlobalEditor}
        onSave={onSaveLadderConfiguration}
        onReplaceDraft={onReplaceLadderDraft}
        onUpdateTier={onUpdateLadderTier}
        onAddTier={onAddLadderTier}
        onDeleteTier={onDeleteLadderTier}
      />
    </>
  );
}

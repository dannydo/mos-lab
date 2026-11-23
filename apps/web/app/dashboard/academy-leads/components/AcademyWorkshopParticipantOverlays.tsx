'use client';

import AcademyWorkshopParticipantSelectionsModal from './AcademyWorkshopParticipantSelectionsModal';
import { AddExistingParticipantsModal } from './academy-workshop-participant-overlays/AddExistingParticipantsModal';
import { ParticipantCareDrawer } from './academy-workshop-participant-overlays/ParticipantCareDrawer';
import { ParticipantFeeModal } from './academy-workshop-participant-overlays/ParticipantFeeModal';
import type {
  AcademyWorkshopFeeForm,
  AcademyWorkshopParticipantOverlaysProps,
  AcademyWorkshopWalkInForm,
} from './academy-workshop-participant-overlays/participant-overlay-types';
import { useWorkshopParticipantPricing } from './academy-workshop-participant-overlays/useWorkshopParticipantPricing';
import { WalkInParticipantModal } from './academy-workshop-participant-overlays/WalkInParticipantModal';

export type { AcademyWorkshopFeeForm, AcademyWorkshopParticipantOverlaysProps, AcademyWorkshopWalkInForm };

export default function AcademyWorkshopParticipantOverlays({
  workshop,
  selected,
  resources = { staff: [], instructors: [] },
  busy,
  talentLoading,
  canManageRestricted,
  careDrawerOpen,
  qrDataUrl,
  qrTargetUrl,
  addOpen,
  addLeadIds = [],
  leadSearch,
  leadLoading,
  leadError,
  availableLeadOptions = [],
  walkInOpen,
  feeOpen,
  walkInForm,
  feeForm,
  onCloseCare,
  onReissueQr,
  onUpdateCare,
  onCheckIn,
  onOpenFee,
  onAssignInstructor,
  onSetPhotoConsent,
  onUploadPhoto,
  onOpenTalent,
  onAddExisting,
  onAddLeadIdsChange,
  onLeadSearchChange,
  onCloseAdd,
  onOpenWalkInFromAdd,
  onCloseWalkIn,
  onCreateWalkIn,
  onCloseFee,
  onSaveFee,
  onDeleteFeePayment,
  onWaiveFee,
  onUpdatePricing,
  onOpenZaloScript,
  selectionsOpen = false,
  selectionsParticipant = null,
  onOpenSelections,
  onCloseSelections,
  onSaveSelections,
}: AcademyWorkshopParticipantOverlaysProps) {
  const pricing = useWorkshopParticipantPricing({
    selected,
    workshopFeeVnd: workshop.feeVnd,
    onUpdatePricing,
  });

  return (
    <>
      <ParticipantCareDrawer
        open={careDrawerOpen}
        workshop={workshop}
        selected={selected}
        resources={resources}
        busy={busy}
        talentLoading={talentLoading}
        canManageRestricted={canManageRestricted}
        qrDataUrl={qrDataUrl}
        qrTargetUrl={qrTargetUrl}
        onClose={onCloseCare}
        onReissueQr={onReissueQr}
        onUpdateCare={onUpdateCare}
        onCheckIn={onCheckIn}
        onOpenFee={onOpenFee}
        onAssignInstructor={onAssignInstructor}
        onSetPhotoConsent={onSetPhotoConsent}
        onUploadPhoto={onUploadPhoto}
        onOpenTalent={onOpenTalent}
        onOpenZaloScript={onOpenZaloScript}
        onOpenSelections={onOpenSelections}
      />

      <AddExistingParticipantsModal
        open={addOpen}
        addLeadIds={addLeadIds}
        leadSearch={leadSearch}
        leadLoading={leadLoading}
        leadError={leadError}
        availableLeadOptions={availableLeadOptions}
        busy={busy}
        onAddExisting={onAddExisting}
        onAddLeadIdsChange={onAddLeadIdsChange}
        onLeadSearchChange={onLeadSearchChange}
        onClose={onCloseAdd}
        onOpenWalkInFromAdd={onOpenWalkInFromAdd}
      />

      <WalkInParticipantModal
        open={walkInOpen}
        busy={busy}
        form={walkInForm}
        resources={resources}
        onClose={onCloseWalkIn}
        onCreateWalkIn={onCreateWalkIn}
      />

      {canManageRestricted && (
        <ParticipantFeeModal
          open={feeOpen}
          workshop={workshop}
          selected={selected}
          busy={busy}
          feeForm={feeForm}
          pricingPreset={pricing.pricingPreset}
          customAppliedFee={pricing.customAppliedFee}
          customReason={pricing.customReason}
          pricingBusy={pricing.pricingBusy}
          onSelectPreset={pricing.handleSelectPreset}
          onCustomAppliedFeeChange={pricing.setCustomAppliedFee}
          onCustomReasonChange={pricing.setCustomReason}
          onApplyPricing={pricing.handleApplyPricing}
          onUpdatePricing={onUpdatePricing}
          onDeleteFeePayment={onDeleteFeePayment}
          onWaiveFee={onWaiveFee}
          onCloseFee={onCloseFee}
          onSaveFee={onSaveFee}
        />
      )}

      {onCloseSelections && onSaveSelections && (
        <AcademyWorkshopParticipantSelectionsModal
          open={selectionsOpen}
          participant={selectionsParticipant}
          workshop={workshop}
          busy={busy}
          onClose={onCloseSelections}
          onSave={onSaveSelections}
        />
      )}
    </>
  );
}

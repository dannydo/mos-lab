'use client';

import React from 'react';
import type { AcademyWorkshopParticipant, UpdateAcademyWorkshopParticipantPricingRequest } from '@mos-lab/shared';
import {
  buildPricingUpdatePayload,
  resolvePresetSelectionState,
  resolvePricingPresetState,
} from './participant-overlay-types';

export interface UseWorkshopParticipantPricingOptions {
  selected: AcademyWorkshopParticipant | null;
  workshopFeeVnd: number;
  onUpdatePricing?: (pricing: UpdateAcademyWorkshopParticipantPricingRequest) => Promise<void>;
}

export function useWorkshopParticipantPricing({
  selected,
  workshopFeeVnd,
  onUpdatePricing,
}: UseWorkshopParticipantPricingOptions) {
  const [pricingPreset, setPricingPreset] = React.useState<string>('full');
  const [customAppliedFee, setCustomAppliedFee] = React.useState<number | null>(null);
  const [customReason, setCustomReason] = React.useState<string>('');
  const [pricingBusy, setPricingBusy] = React.useState(false);

  React.useEffect(() => {
    if (!selected) return;
    const next = resolvePricingPresetState(selected, workshopFeeVnd);
    setPricingPreset(next.preset);
    setCustomAppliedFee(next.customAppliedFee);
    setCustomReason(next.customReason);
  }, [selected?.id, selected?.appliedFeeVnd, selected?.discountVnd, selected?.discountReason, workshopFeeVnd]);

  const handleSelectPreset = React.useCallback(
    (presetId: string) => {
      const next = resolvePresetSelectionState(presetId, workshopFeeVnd, selected);
      setPricingPreset(next.preset);
      setCustomAppliedFee(next.customAppliedFee);
      setCustomReason(next.customReason);
    },
    [selected, workshopFeeVnd]
  );

  const handleApplyPricing = React.useCallback(async () => {
    if (!onUpdatePricing || !selected) return;
    setPricingBusy(true);
    try {
      const payload = buildPricingUpdatePayload(pricingPreset, workshopFeeVnd, customAppliedFee, customReason);
      await onUpdatePricing(payload);
    } finally {
      setPricingBusy(false);
    }
  }, [customAppliedFee, customReason, onUpdatePricing, pricingPreset, selected, workshopFeeVnd]);

  return {
    pricingPreset,
    customAppliedFee,
    setCustomAppliedFee,
    customReason,
    setCustomReason,
    pricingBusy,
    handleSelectPreset,
    handleApplyPricing,
  };
}

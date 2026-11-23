import type { FormInstance } from 'antd';
import type {
  AcademyLead,
  AcademyWorkshopDetail,
  AcademyWorkshopParticipant,
  AcademyWorkshopPricingTierPreset,
  AcademyWorkshopResourcesResponse,
  UpdateAcademyWorkshopParticipantPricingRequest,
} from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';

export type AcademyWorkshopFeeForm = {
  amountVnd: number;
  method: 'BANK_TRANSFER' | 'CASH';
  reference?: string;
  note?: string;
};

export type AcademyWorkshopWalkInForm = {
  name: string;
  phone?: string;
  email?: string;
  primaryInstructorId?: number;
};

export interface AcademyWorkshopParticipantOverlaysProps {
  workshop: AcademyWorkshopDetail;
  selected: AcademyWorkshopParticipant | null;
  resources: AcademyWorkshopResourcesResponse;
  busy: boolean;
  talentLoading: boolean;
  canManageRestricted: boolean;
  careDrawerOpen: boolean;
  qrDataUrl: string;
  qrTargetUrl: string;
  addOpen: boolean;
  addLeadIds: number[];
  leadSearch: string;
  leadLoading: boolean;
  leadError: string | null;
  availableLeadOptions: AcademyLead[];
  walkInOpen: boolean;
  feeOpen: boolean;
  walkInForm: FormInstance<AcademyWorkshopWalkInForm>;
  feeForm: FormInstance<AcademyWorkshopFeeForm>;
  onCloseCare: () => void;
  onReissueQr: () => void;
  onUpdateCare: (
    input: { infoSent?: boolean; attendanceStatus?: AcademyWorkshopParticipant['attendanceStatus'] },
    success: string
  ) => void;
  onCheckIn: (checkedIn: boolean) => void;
  onOpenFee: (participant?: AcademyWorkshopParticipant) => void;
  onDeleteFeePayment?: (paymentId: number) => Promise<void>;
  onWaiveFee?: (waived: boolean, reason?: string) => Promise<void>;
  onUpdatePricing?: (pricing: UpdateAcademyWorkshopParticipantPricingRequest) => Promise<void>;
  onAssignInstructor: (instructorId: number | null) => void;
  onSetPhotoConsent: (consent: boolean) => void;
  onUploadPhoto: (file: File) => void;
  onOpenTalent: () => void;
  onAddExisting: () => void;
  onAddLeadIdsChange: (leadIds: number[]) => void;
  onLeadSearchChange: (search: string) => void;
  onCloseAdd: () => void;
  onOpenWalkInFromAdd: () => void;
  onCloseWalkIn: () => void;
  onCreateWalkIn: (values: AcademyWorkshopWalkInForm) => void;
  onCloseFee: () => void;
  onSaveFee: (values: AcademyWorkshopFeeForm) => void;
  onOpenZaloScript?: (participant: AcademyWorkshopParticipant) => void;
  selectionsOpen?: boolean;
  selectionsParticipant?: AcademyWorkshopParticipant | null;
  onOpenSelections?: (participant: AcademyWorkshopParticipant) => void;
  onCloseSelections?: () => void;
  onSaveSelections?: (
    menuItemIds: number[],
    equipmentPackageId: number | null,
    designItemId?: number | null
  ) => Promise<void>;
}

export interface PricingSelectionState {
  preset: string;
  customAppliedFee: number | null;
  customReason: string;
}

export function resolveParticipantAppliedFeeVnd(
  participant: Pick<AcademyWorkshopParticipant, 'appliedFeeVnd' | 'discountVnd'>,
  workshopFeeVnd: number
): number {
  return participant.appliedFeeVnd !== null && participant.appliedFeeVnd !== undefined
    ? participant.appliedFeeVnd
    : Math.max(0, workshopFeeVnd - (participant.discountVnd || 0));
}

export function resolvePricingPresetState(
  participant: Pick<AcademyWorkshopParticipant, 'appliedFeeVnd' | 'discountVnd' | 'discountReason'>,
  workshopFeeVnd: number
): PricingSelectionState {
  if (participant.appliedFeeVnd === Math.round(workshopFeeVnd * 0.9) || participant.discountReason?.includes('10%')) {
    return { preset: 'discount_10', customAppliedFee: null, customReason: '' };
  }
  if (participant.appliedFeeVnd === Math.round(workshopFeeVnd * 0.5) || participant.discountReason?.includes('50%')) {
    return { preset: 'discount_50', customAppliedFee: null, customReason: '' };
  }
  if (participant.appliedFeeVnd !== null && participant.appliedFeeVnd !== undefined) {
    if (participant.appliedFeeVnd === workshopFeeVnd) {
      return { preset: 'full', customAppliedFee: null, customReason: '' };
    }
    return {
      preset: 'custom',
      customAppliedFee: participant.appliedFeeVnd,
      customReason: participant.discountReason || '',
    };
  }
  if (participant.discountVnd > 0) {
    return {
      preset: 'custom',
      customAppliedFee: Math.max(0, workshopFeeVnd - participant.discountVnd),
      customReason: participant.discountReason || '',
    };
  }
  return { preset: 'full', customAppliedFee: null, customReason: '' };
}

export function resolvePresetSelectionState(
  presetId: string,
  workshopFeeVnd: number,
  selected: Pick<AcademyWorkshopParticipant, 'appliedFeeVnd' | 'discountVnd' | 'discountReason'> | null
): PricingSelectionState {
  if (presetId === 'discount_10') {
    return {
      preset: presetId,
      customAppliedFee: Math.round(workshopFeeVnd * 0.9),
      customReason: 'Ưu đãi 10%',
    };
  }
  if (presetId === 'discount_50') {
    return {
      preset: presetId,
      customAppliedFee: Math.round(workshopFeeVnd * 0.5),
      customReason: 'Ưu đãi 50%',
    };
  }
  if (presetId === 'full') {
    return {
      preset: presetId,
      customAppliedFee: workshopFeeVnd,
      customReason: 'Vé tiêu chuẩn (Full)',
    };
  }
  return {
    preset: presetId,
    customAppliedFee:
      selected?.appliedFeeVnd ??
      (selected?.discountVnd ? Math.max(0, workshopFeeVnd - selected.discountVnd) : workshopFeeVnd),
    customReason: selected?.discountReason || '',
  };
}

export function buildPricingUpdatePayload(
  pricingPreset: string,
  workshopFeeVnd: number,
  customAppliedFee: number | null,
  customReason: string
): UpdateAcademyWorkshopParticipantPricingRequest {
  if (pricingPreset === 'full') {
    return {
      appliedFeeVnd: workshopFeeVnd,
      discountVnd: 0,
      discountReason: 'Vé tiêu chuẩn (Full)',
    };
  }
  if (pricingPreset === 'discount_10') {
    const appliedFeeVnd = Math.round(workshopFeeVnd * 0.9);
    return {
      appliedFeeVnd,
      discountVnd: workshopFeeVnd - appliedFeeVnd,
      discountReason: 'Ưu đãi 10%',
    };
  }
  if (pricingPreset === 'discount_50') {
    const appliedFeeVnd = Math.round(workshopFeeVnd * 0.5);
    return {
      appliedFeeVnd,
      discountVnd: workshopFeeVnd - appliedFeeVnd,
      discountReason: 'Ưu đãi 50%',
    };
  }
  const appliedFeeVnd = customAppliedFee !== null ? Math.max(0, Math.round(customAppliedFee)) : workshopFeeVnd;
  return {
    appliedFeeVnd,
    discountVnd: Math.max(0, workshopFeeVnd - appliedFeeVnd),
    discountReason: customReason.trim() || 'Ưu đãi tùy chỉnh',
  };
}

export function resolvePricingPresetTierAmount(
  preset: AcademyWorkshopPricingTierPreset,
  workshopFeeVnd: number
): number {
  if (preset.type === 'FIXED') return preset.fixedAmountVnd || 0;
  if (preset.type === 'PERCENT') return Math.round(workshopFeeVnd * (1 - (preset.percent || 0) / 100));
  return workshopFeeVnd;
}

export function resolveFeeStatusTone(feeStatus: AcademyWorkshopParticipant['feeStatus']): StatusType {
  if (feeStatus === 'PAID') return 'success';
  if (feeStatus === 'WAIVED') return 'default';
  if (feeStatus === 'PARTIAL') return 'warning';
  return 'error';
}

export function getFeePaymentMethodLabel(method: string): string {
  if (method === 'BANK_TRANSFER') return 'Chuyển khoản';
  if (method === 'CASH') return 'Tiền mặt';
  return method;
}

import type { BookingItem } from '../../../state/mockData';
import type { ActiveActorProfile } from '../../../state/useIosAppState';

export type ConsultationSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface ConsultationSavedAttributes {
  style: string;
  curl: string;
  length: string;
  thickness: string;
  material?: string;
  color?: string;
  volume?: string;
  count?: string;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  underMinkCurl?: string;
  underMinkThickness?: string;
  underMinkLength?: string;
  underMinkCount?: string;
  isOverridden?: boolean;
  overrideReason?: string;
  eyeShape?: string;
  naturalLashLength?: string;
  naturalLashThickness?: string;
  naturalLashDensity?: string;
  naturalLashCount?: string;
  isNewClientDiagnosticDone?: boolean;
  lashHealth?: string;
  lashTrail?: string;
  medicalProblem?: string;
  notes?: string;
}

export interface ConsultationSkuPricingPayload {
  skuName?: string;
  skuPrice?: number;
  upgradePrice?: number;
  cvPoints?: number;
  cvBreakdown?: string;
  serviceType?: string;
}

export interface Screen03ConsultationMatrixProps {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  isAdmin?: boolean;
  onRefreshDb?: () => Promise<any> | void;
  onBack: () => void;
  onSave: (
    attributes: ConsultationSavedAttributes,
    selectedCombo?: BookingItem['selectedCombo'] | null,
    skuPricing?: ConsultationSkuPricingPayload | null,
    targetBookingId?: number,
    selectedUnderCombo?: BookingItem['selectedUnderCombo'] | null,
    assignmentMode?: 'SELF_SERVICE' | 'ASSIGN_OTHER'
  ) => void;
  onUpdateAvatar?: (avatarUrl: string, targetBookingId?: number) => Promise<any> | void;
  onAutoSaveDraft?: (
    attributes: Record<string, any>,
    selectedCombo?: BookingItem['selectedCombo'] | null,
    skuPricing?: any,
    targetBookingId?: number,
    selectedUnderCombo?: BookingItem['selectedUnderCombo'] | null,
    notes?: string
  ) => Promise<any> | void;
}

export interface PendingOverrideState {
  type: 'CYCLE_OVERRIDE' | 'COMBO_MATERIAL_OVERRIDE';
  title: string;
  message: string;
  defaultReason: string;
  reasons: string[];
  onConfirm: (reason: string) => void;
}

export interface PendingUpgradeConfirmationState {
  comboName: string;
  comboBasePrice: number;
  targetName: string;
  targetPrice: number;
  targetSpecs?: string;
  serviceType: 'Normal' | 'Retain';
  upgradeScope: 'SINGLE' | 'ALL';
  singleDiff: number;
  normalDiff: number;
  retainDiff: number;
  comboNormalRemaining: number;
  comboRetainRemaining: number;
  totalAmount: number;
  onConfirm: () => void;
}

export interface ConsultationInfoModalPayload {
  title: string;
  badge?: string;
  advice?: string;
  content: string;
}

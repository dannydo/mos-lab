import { BookingItem } from '../../../state/mockData';
import { ActiveActorProfile } from '../../../state/useIosAppState';
import { PendingReferral } from './NewCustomerReferralModal';

export interface Screen02CheckInProfileProps {
  booking: BookingItem;
  actor?: ActiveActorProfile;
  isAdmin?: boolean;
  isSimulationMode?: boolean;
  onRefreshDb?: () => void;
  isCheckInLocked?: boolean;
  activeServicingCustomerName?: string;
  onResumeServicing?: () => void;
  onBack: () => void;
  onCheckIn: (bookingId?: number) => void;
  onQuickCheckIn?: (
    attributes: {
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
    },
    selectedCombo?: { id: string; name: string; price: number; bonus: number; sessions: number } | null,
    skuPricing?: {
      skuName?: string;
      skuPrice?: number;
      upgradePrice?: number;
      cvPoints?: number;
      cvBreakdown?: string;
      serviceType?: string;
    } | null,
    targetBookingId?: number
  ) => void;
  onUpdateAvatar?: (avatarUrl: string, targetBookingId?: number) => Promise<any> | void;
  onReferralConfirmed?: (referral: PendingReferral | null) => void;
  onSelectComboWallet?: (params: {
    targetBookingId?: number;
    selectedUpperComboBalanceId?: number | null;
    selectedUnderComboBalanceId?: number | null;
    skipUpperCombo?: boolean;
    skipUnderCombo?: boolean;
    comboRedemption?: BookingItem['comboRedemption'] | null;
  }) => void;
}

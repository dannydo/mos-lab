import type { IosSimulationMenteeOption, SafeAny } from '@mos-lab/shared';
import type { ActiveActorProfile, IosBranchConfig, IosUserRole } from '../../../app/ios-app/state/useIosAppState';

export type UnifiedProfileAppContext = 'general' | 'chat' | 'ios';

export type DesktopDensityOption = 'compact' | 'standard' | 'comfortable';

export interface UnifiedProfileSheetProps {
  open: boolean;
  onClose: () => void;
  appContext: UnifiedProfileAppContext;
  user?: SafeAny;
  onAvatarUpdated?: (newAvatarUrl: string) => void;
  onLogout?: () => Promise<void> | void;
  isImpersonating?: boolean;
  onExitImpersonation?: () => Promise<void> | void;
  // General (Dashboard) context
  desktopDensity?: DesktopDensityOption;
  setDesktopDensity?: (density: DesktopDensityOption) => void;
  dailyCallsCount?: number;
  onOpenDailyCalls?: () => void;
  onOpenTelesalesDashboard?: () => void;
  // iOS-App context
  actor?: ActiveActorProfile;
  iosRole?: IosUserRole;
  canSwitchRole?: boolean;
  onRoleChange?: (role: IosUserRole) => void;
  onOpenPaystub?: () => void;
  currentBranch?: IosBranchConfig;
  selectedStoreId?: number;
  onSelectBranch?: (storeId: number) => void;
  availableBranches?: IosBranchConfig[];
  isAdmin?: boolean;
  isSimulationMode?: boolean;
  onToggleSimulationMode?: () => void;
  menteesList?: IosSimulationMenteeOption[];
  selectedMenteeStaffId?: number;
  onSelectMentee?: (staffId: number | undefined) => void;
  onOpenCreateBooking?: () => void;
}

export interface ResolvedProfileIdentity {
  effectiveUser: SafeAny;
  effectiveRoleStr: string;
  teamCodes: string[] | undefined;
  isAdmin: boolean;
  isCv: boolean;
  isCcTeamMember: boolean;
  featherTier: 'CVL' | 'CVLL' | null;
  effectiveIosRole: IosUserRole | undefined;
  isCvl: boolean;
  isCvll: boolean;
}

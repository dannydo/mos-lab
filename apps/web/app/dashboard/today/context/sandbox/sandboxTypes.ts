export type TodaySandboxMode = 'live' | 'training' | 'sales';

export interface StaffTrainingOverride {
  attendance?: 'none' | 'checked_in' | 'checked_out' | 'late';
  status?: 'busy' | 'available';
  doing?: string;
  shift?: 'sáng' | 'chiều' | 'full' | 'off';
  timerStartedAt?: number | null; // epoch ms
  timerElapsedMinutes?: number;
  timerService?: string;
  clientsIncrement?: number;
  doneIncrement?: number;
}

export interface SimulatedComboSale {
  id: string;
  name: string;
  price: number;
  customerName: string;
  ccName: string;
  cvName: string;
  time: string;
}

export interface SimulatedProductSale {
  id: string;
  name: string;
  price: number;
  customerName: string;
  time: string;
}

export interface SimulatedGift {
  id: string;
  name: string;
  estimatedValue: number;
  customerName: string;
  time: string;
}

export type MaterialStatus = 'sufficient' | 'low' | 'restock_needed';

export interface DesignPlanItem {
  id: string;
  designName: string;
  targetCount: number;
  completedCount: number;
  assignedRoleLabel: 'CV' | 'CVL' | 'CVLL';
  assignedStaff: string;
  estimatedMinutes: number;
}

export interface MaterialChecklistItem {
  id: string;
  name: string;
  category: string;
  stockLabel: string;
  status: MaterialStatus;
  checked: boolean;
  checkedAt?: string;
}

export interface SandboxPresetScenario {
  id: string;
  code: string;
  label: string;
  description: string;
  mode: TodaySandboxMode;
  combosSnapshot?: SimulatedComboSale[];
  productsSnapshot?: SimulatedProductSale[];
  giftsSnapshot?: SimulatedGift[];
  designPlanSnapshot?: DesignPlanItem[];
  materialsSnapshot?: MaterialChecklistItem[];
}

export interface SimulatedLogAction {
  id: string;
  type:
    | 'CHECK_IN'
    | 'CHECK_OUT'
    | 'START_TIMER'
    | 'STOP_TIMER'
    | 'ADD_COMBO'
    | 'ADD_PRODUCT'
    | 'ADD_GIFT'
    | 'DESIGN_PLAN'
    | 'MATERIAL_CHECK'
    | 'PRESET_SWITCH'
    | 'RESET';
  timestamp: string;
  message: string;
}

export interface TodaySandboxContextValue {
  mode: TodaySandboxMode;
  setMode: (mode: TodaySandboxMode) => void;
  isSandbox: boolean;

  // Training Mode
  staffOverrides: Record<string, StaffTrainingOverride>;
  nowTickMs: number;
  formatStaffTimerMMSS: (staffName: string) => string;
  simulateStaffCheckIn: (staffName: string, role?: 'CV' | 'CC') => void;
  simulateStaffCheckOut: (staffName: string, role?: 'CV' | 'CC') => void;
  simulateStaffStartTimer: (staffName: string, serviceName?: string, estimatedMinutes?: number) => void;
  simulateStaffStopTimer: (staffName: string) => void;
  simulateBatchCheckInAll: (role?: 'CV' | 'CC' | 'ALL') => void;
  simulateBatchStartAllTimers: () => void;
  resetTrainingState: () => void;

  // Design Planning & Materials Checklist (Training & Planning)
  designPlanItems: DesignPlanItem[];
  materialsChecklist: MaterialChecklistItem[];
  materialReadyCount: number;
  designPlanTotals: { target: number; completed: number };
  updateDesignPlanTarget: (id: string, delta: number) => void;
  incrementDesignPlanDone: (id: string) => void;
  resetDesignPlan: () => void;
  toggleMaterialCheck: (id: string) => void;
  cycleMaterialStatus: (id: string) => void;
  resetMaterialsChecklist: () => void;

  // Sales Simulation Mode
  simulatedCombos: SimulatedComboSale[];
  simulatedProducts: SimulatedProductSale[];
  simulatedGifts: SimulatedGift[];
  totalSimulatedRevenue: number;
  totalSimulatedComboRevenue: number;
  totalSimulatedProductRevenue: number;
  baselineClosingRate: number;
  closingRate: number;
  closingUpliftPercent: number;
  simulateAddCombo: (custom?: { name?: string; price?: number; customerName?: string }) => void;
  simulateAddProduct: (custom?: { name?: string; price?: number; customerName?: string }) => void;
  simulateAddGift: (custom?: { name?: string; estimatedValue?: number; customerName?: string }) => void;
  resetSalesState: () => void;

  // Presets (PA #1, PA #2...)
  presets: SandboxPresetScenario[];
  activePresetId: string;
  applyPreset: (presetId: string) => void;
  saveCurrentAsPreset: (label?: string) => void;

  // General
  simulatedActions: SimulatedLogAction[];
  clearActionLog: () => void;
  resetAllSandbox: () => void;
}

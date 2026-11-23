import type {
  DesignPlanItem,
  MaterialChecklistItem,
  SandboxPresetScenario,
  SimulatedComboSale,
  SimulatedGift,
  SimulatedProductSale,
  StaffTrainingOverride,
  TodaySandboxContextValue,
} from './sandboxTypes';

export const STORAGE_KEY_MODE = 'mos_today_sandbox_mode';

export const DEFAULT_TRAINING_OVERRIDES: Record<string, StaffTrainingOverride> = {
  'CV Lan Anh': {
    attendance: 'checked_in',
    status: 'busy',
    doing: 'Đang làm mi Classic 60p (Bấm giờ: 35p)',
    timerStartedAt: Date.now() - 35 * 60 * 1000,
    timerElapsedMinutes: 35,
    timerService: 'Nối Mi Classic Thiết Kế (60p)',
  },
  'CV Mai Phương': {
    attendance: 'checked_in',
    status: 'available',
    doing: 'Sẵn sàng nhận khách tiếp theo',
    timerStartedAt: null,
  },
  'CV Thu Thảo': {
    attendance: 'none',
    status: 'available',
    doing: 'Chưa check-in (Ca chiều 13:00)',
    timerStartedAt: null,
  },
  'CV Ngọc Trâm': {
    attendance: 'checked_out',
    status: 'available',
    doing: 'Đã hoàn tất ca & check-out',
    timerStartedAt: null,
  },
  'CC Thảo My': {
    attendance: 'checked_in',
    doing: 'Đang tiếp đón khách tư vấn dáng mi',
  },
  'CC Diệu Nhi': {
    attendance: 'none',
    doing: 'Chưa check-in ca chiều',
  },
};

export const INITIAL_SALES_COMBOS: SimulatedComboSale[] = [
  {
    id: 'combo-init-1',
    name: 'Combo 10 Tặng 6 (Mi Thiết Kế VIP)',
    price: 2_500_000,
    customerName: 'Chị Minh Anh',
    ccName: 'CC Thảo My',
    cvName: 'CV Lan Anh',
    time: '14:15',
  },
];

export const INITIAL_SALES_PRODUCTS: SimulatedProductSale[] = [
  {
    id: 'prod-init-1',
    name: 'Serum Dưỡng Mi FKN Tế Bào Gốc',
    price: 350_000,
    customerName: 'Chị Minh Anh',
    time: '14:20',
  },
];

export const INITIAL_SALES_GIFTS: SimulatedGift[] = [
  {
    id: 'gift-init-1',
    name: 'Cọ chải mi pha lê & Túi nhung Wings',
    estimatedValue: 120_000,
    customerName: 'Chị Minh Anh',
    time: '14:22',
  },
];

export const BASELINE_CLOSING_RATE = 28;

export const INITIAL_DESIGN_PLAN: DesignPlanItem[] = [
  {
    id: 'plan-ultralight',
    designName: 'UltraLight Tự Nhiên',
    targetCount: 8,
    completedCount: 5,
    assignedRoleLabel: 'CV',
    assignedStaff: 'CV Lan Anh, CV Mai Phương',
    estimatedMinutes: 60,
  },
  {
    id: 'plan-classic',
    designName: 'Classic Thiết Kế',
    targetCount: 6,
    completedCount: 4,
    assignedRoleLabel: 'CVL',
    assignedStaff: 'Thảo Vy',
    estimatedMinutes: 65,
  },
  {
    id: 'plan-volume',
    designName: 'Volume 5D Quyến Rũ',
    targetCount: 5,
    completedCount: 2,
    assignedRoleLabel: 'CVLL',
    assignedStaff: 'Ngọc Châu',
    estimatedMinutes: 85,
  },
  {
    id: 'plan-under',
    designName: 'Mi Dưới (Under Lash)',
    targetCount: 4,
    completedCount: 2,
    assignedRoleLabel: 'CV',
    assignedStaff: 'CV Thu Thảo',
    estimatedMinutes: 25,
  },
];

export const INITIAL_MATERIALS_CHECKLIST: MaterialChecklistItem[] = [
  {
    id: 'mat-glue',
    name: 'Keo nối mi Wings Ultra-Bond (5ml)',
    category: 'Keo',
    stockLabel: 'Còn 6 chai (Độ ẩm chuẩn 48%)',
    status: 'sufficient',
    checked: true,
    checkedAt: '08:45',
  },
  {
    id: 'mat-tweezers',
    name: 'Nhíp tách & gắp mi chuẩn kỹ thuật',
    category: 'Dụng cụ',
    stockLabel: 'Đủ 8 bộ đã khử khuẩn UV',
    status: 'sufficient',
    checked: true,
    checkedAt: '08:46',
  },
  {
    id: 'mat-fans',
    name: 'Khay mi Fan UltraLight / Classic (0.07mm)',
    category: 'Mi Fan',
    stockLabel: 'Còn 4 hộp · Theo dõi size 10-12mm',
    status: 'low',
    checked: false,
  },
  {
    id: 'mat-pads',
    name: 'Gel Pad & Băng keo lụa bảo vệ mắt',
    category: 'Vật tư tiêu hao',
    stockLabel: 'Còn 42 cặp (Đủ ca hôm nay)',
    status: 'sufficient',
    checked: true,
    checkedAt: '08:48',
  },
  {
    id: 'mat-primer',
    name: 'Primer / Bonder & Dung dịch vệ sinh mi',
    category: 'Dung dịch',
    stockLabel: 'Còn 2 lọ mở nắp · Cần bổ sung cuối ca',
    status: 'restock_needed',
    checked: false,
  },
];

export const DEFAULT_PRESETS: SandboxPresetScenario[] = [
  {
    id: 'pa-1',
    code: 'PA #1',
    label: 'Training Check-in & Nguyên Vật Liệu',
    description:
      'Giả lập check-in ca, bấm giờ làm mi, check-out, lập kế hoạch thiết kế & kiểm tra tồn nguyên vật liệu.',
    mode: 'training',
    designPlanSnapshot: INITIAL_DESIGN_PLAN,
    materialsSnapshot: INITIAL_MATERIALS_CHECKLIST,
  },
  {
    id: 'pa-2',
    code: 'PA #2',
    label: 'Sales Combo 10 Tặng 6 & Quà Tặng',
    description: 'Mô phỏng chốt gói Combo, add sản phẩm dưỡng kèm quà tặng khuyến mãi và đo mức tăng tỉ lệ chốt.',
    mode: 'sales',
    combosSnapshot: [
      {
        id: 'combo-pa2-1',
        name: 'Combo 10 Tặng 6 (Mi Thiết Kế VIP)',
        price: 5_900_000,
        customerName: 'Chị Thanh',
        ccName: 'CC Thảo My',
        cvName: 'CV Lan Anh',
        time: '14:30',
      },
      ...INITIAL_SALES_COMBOS,
    ],
    productsSnapshot: INITIAL_SALES_PRODUCTS,
    giftsSnapshot: INITIAL_SALES_GIFTS,
  },
];

export const FALLBACK_SANDBOX_CONTEXT: TodaySandboxContextValue = {
  mode: 'live',
  setMode: () => {},
  isSandbox: false,
  staffOverrides: {},
  nowTickMs: 0,
  formatStaffTimerMMSS: () => '00:00',
  simulateStaffCheckIn: () => {},
  simulateStaffCheckOut: () => {},
  simulateStaffStartTimer: () => {},
  simulateStaffStopTimer: () => {},
  simulateBatchCheckInAll: () => {},
  simulateBatchStartAllTimers: () => {},
  resetTrainingState: () => {},
  designPlanItems: [],
  materialsChecklist: [],
  materialReadyCount: 0,
  designPlanTotals: { target: 0, completed: 0 },
  updateDesignPlanTarget: () => {},
  incrementDesignPlanDone: () => {},
  resetDesignPlan: () => {},
  toggleMaterialCheck: () => {},
  cycleMaterialStatus: () => {},
  resetMaterialsChecklist: () => {},
  simulatedCombos: [],
  simulatedProducts: [],
  simulatedGifts: [],
  totalSimulatedRevenue: 0,
  totalSimulatedComboRevenue: 0,
  totalSimulatedProductRevenue: 0,
  baselineClosingRate: BASELINE_CLOSING_RATE,
  closingRate: BASELINE_CLOSING_RATE,
  closingUpliftPercent: 0,
  simulateAddCombo: () => {},
  simulateAddProduct: () => {},
  simulateAddGift: () => {},
  resetSalesState: () => {},
  presets: DEFAULT_PRESETS,
  activePresetId: 'pa-1',
  applyPreset: () => {},
  saveCurrentAsPreset: () => {},
  simulatedActions: [],
  clearActionLog: () => {},
  resetAllSandbox: () => {},
};

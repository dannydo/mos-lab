'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { message } from 'antd';

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

const STORAGE_KEY_MODE = 'mos_today_sandbox_mode';

const TodaySandboxContext = createContext<TodaySandboxContextValue | undefined>(undefined);

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

const INITIAL_SALES_COMBOS: SimulatedComboSale[] = [
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

const INITIAL_SALES_PRODUCTS: SimulatedProductSale[] = [
  {
    id: 'prod-init-1',
    name: 'Serum Dưỡng Mi FKN Tế Bào Gốc',
    price: 350_000,
    customerName: 'Chị Minh Anh',
    time: '14:20',
  },
];

const INITIAL_SALES_GIFTS: SimulatedGift[] = [
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
    description: 'Giả lập check-in ca, bấm giờ làm mi, check-out, lập kế hoạch thiết kế & kiểm tra tồn nguyên vật liệu.',
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

export function TodaySandboxProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<TodaySandboxMode>('live');
  const [staffOverrides, setStaffOverrides] = useState<Record<string, StaffTrainingOverride>>(DEFAULT_TRAINING_OVERRIDES);
  const [nowTickMs, setNowTickMs] = useState<number>(() => Date.now());
  const [designPlanItems, setDesignPlanItems] = useState<DesignPlanItem[]>(INITIAL_DESIGN_PLAN);
  const [materialsChecklist, setMaterialsChecklist] = useState<MaterialChecklistItem[]>(INITIAL_MATERIALS_CHECKLIST);
  const [presets, setPresets] = useState<SandboxPresetScenario[]>(DEFAULT_PRESETS);
  const [activePresetId, setActivePresetId] = useState<string>('pa-1');
  const [simulatedCombos, setSimulatedCombos] = useState<SimulatedComboSale[]>(INITIAL_SALES_COMBOS);
  const [simulatedProducts, setSimulatedProducts] = useState<SimulatedProductSale[]>(INITIAL_SALES_PRODUCTS);
  const [simulatedGifts, setSimulatedGifts] = useState<SimulatedGift[]>(INITIAL_SALES_GIFTS);
  const [simulatedActions, setSimulatedActions] = useState<SimulatedLogAction[]>([]);

  const hasRunningTimer = useMemo(
    () => mode === 'training' && Object.values(staffOverrides).some((item) => Boolean(item.timerStartedAt)),
    [mode, staffOverrides]
  );

  useEffect(() => {
    if (!hasRunningTimer) return undefined;
    const timer = setInterval(() => {
      setNowTickMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [hasRunningTimer]);

  const formatStaffTimerMMSS = useCallback(
    (staffName: string) => {
      const ov = staffOverrides[staffName];
      if (!ov?.timerStartedAt) {
        const mins = ov?.timerElapsedMinutes || 0;
        return `${String(mins).padStart(2, '0')}:00`;
      }
      const totalSeconds = Math.max(0, Math.floor((nowTickMs - ov.timerStartedAt) / 1000));
      const mm = Math.floor(totalSeconds / 60);
      const ss = totalSeconds % 60;
      return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    },
    [nowTickMs, staffOverrides]
  );

  // Load initial mode from sessionStorage or URL query
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlMode = urlParams.get('sandboxMode') || urlParams.get('mode');
      if (urlMode === 'training' || urlMode === 'sales' || urlMode === 'live') {
        setModeState(urlMode);
        if (urlMode === 'sales') setActivePresetId('pa-2');
        return;
      }
      const saved = sessionStorage.getItem(STORAGE_KEY_MODE) as TodaySandboxMode | null;
      if (saved && (saved === 'training' || saved === 'sales' || saved === 'live')) {
        setModeState(saved);
        if (saved === 'sales') setActivePresetId('pa-2');
      }
    }
  }, []);

  const setMode = useCallback((newMode: TodaySandboxMode) => {
    setModeState(newMode);
    if (newMode === 'training') setActivePresetId((prev) => (prev === 'pa-2' ? 'pa-1' : prev));
    if (newMode === 'sales') setActivePresetId((prev) => (prev === 'pa-1' ? 'pa-2' : prev));
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY_MODE, newMode);
      } catch {
        // ignore
      }
    }
    if (newMode === 'live') {
      message.info('Đã chuyển sang Chế độ Thực tế (Live Data)');
    } else if (newMode === 'training') {
      message.success('Đã kích hoạt Sandbox: Giả lập Training Check-in / Bấm giờ / Check-out');
    } else if (newMode === 'sales') {
      message.success('Đã kích hoạt Sandbox: Giả lập Sales Chốt Gói Combo & Quà Tặng');
    }
  }, []);

  const logAction = useCallback((type: SimulatedLogAction['type'], msg: string) => {
    const action: SimulatedLogAction = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      message: msg,
    };
    setSimulatedActions((prev) => [action, ...prev.slice(0, 49)]);
  }, []);

  // Training actions
  const simulateStaffCheckIn = useCallback(
    (staffName: string, role: 'CV' | 'CC' = 'CV') => {
      setStaffOverrides((prev) => ({
        ...prev,
        [staffName]: {
          ...(prev[staffName] || {}),
          attendance: 'checked_in',
          status: 'available',
          doing: role === 'CV' ? 'Sẵn sàng nhận khách' : 'Đang đón tiếp khách tại sảnh',
          timerStartedAt: null,
          timerElapsedMinutes: 0,
        },
      }));
      logAction('CHECK_IN', `[Training] Đã giả lập Check-in cho ${role} ${staffName}`);
      message.success(`[Training] Đã giả lập Check-in cho ${staffName}`);
    },
    [logAction]
  );

  const simulateStaffCheckOut = useCallback(
    (staffName: string, role: 'CV' | 'CC' = 'CV') => {
      setStaffOverrides((prev) => ({
        ...prev,
        [staffName]: {
          ...(prev[staffName] || {}),
          attendance: 'checked_out',
          status: 'available',
          doing: 'Đã hoàn tất ca & check-out',
          timerStartedAt: null,
          timerElapsedMinutes: 0,
        },
      }));
      logAction('CHECK_OUT', `[Training] Đã giả lập Check-out kết ca cho ${role} ${staffName}`);
      message.info(`[Training] Đã giả lập Check-out cho ${staffName}`);
    },
    [logAction]
  );

  const simulateStaffStartTimer = useCallback(
    (staffName: string, serviceName = 'Nối Mi Classic Thiết Kế (60p)', estimatedMinutes = 60) => {
      const now = Date.now();
      setStaffOverrides((prev) => {
        const cur = prev[staffName] || {};
        return {
          ...prev,
          [staffName]: {
            ...cur,
            attendance: 'checked_in',
            status: 'busy',
            doing: `Đang làm ${serviceName} (Bấm giờ 0/${estimatedMinutes}p)`,
            timerStartedAt: now,
            timerElapsedMinutes: 0,
            timerService: serviceName,
            clientsIncrement: (cur.clientsIncrement || 0) + 1,
          },
        };
      });
      logAction('START_TIMER', `[Training] Bắt đầu bấm giờ phục vụ cho ${staffName} (${serviceName})`);
      message.success(`[Training] Đang bấm giờ phục vụ cho ${staffName} — ${serviceName}`);
    },
    [logAction]
  );

  const simulateStaffStopTimer = useCallback(
    (staffName: string) => {
      setStaffOverrides((prev) => {
        const cur = prev[staffName] || {};
        return {
          ...prev,
          [staffName]: {
            ...cur,
            status: 'available',
            doing: 'Vừa hoàn tất phục vụ (Đã check-out khách)',
            timerStartedAt: null,
            timerElapsedMinutes: 0,
            doneIncrement: (cur.doneIncrement || 0) + 1,
          },
        };
      });
      logAction('STOP_TIMER', `[Training] Hoàn tất phục vụ & check-out khách cho ${staffName}`);
      message.success(`[Training] Hoàn tất phục vụ cho ${staffName}`);
    },
    [logAction]
  );

  const simulateBatchCheckInAll = useCallback(
    (role: 'CV' | 'CC' | 'ALL' = 'ALL') => {
      setStaffOverrides((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((name) => {
          if (role === 'ALL' || (role === 'CV' && name.startsWith('CV')) || (role === 'CC' && name.startsWith('CC'))) {
            if (updated[name].attendance !== 'checked_out') {
              updated[name] = {
                ...updated[name],
                attendance: 'checked_in',
                status: 'available',
                doing: name.startsWith('CV') ? 'Sẵn sàng nhận khách' : 'Đang đón tiếp tại sảnh',
              };
            }
          }
        });
        return updated;
      });
      logAction('CHECK_IN', `[Training] Đã giả lập Check-in đồng loạt cho toàn bộ nhân sự ca`);
      message.success('[Training] Đã check-in đồng loạt cho nhân sự');
    },
    [logAction]
  );

  const simulateBatchStartAllTimers = useCallback(() => {
    const now = Date.now();
    setStaffOverrides((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((name) => {
        if (name.startsWith('CV') && updated[name].attendance === 'checked_in') {
          updated[name] = {
            ...updated[name],
            status: 'busy',
            doing: 'Đang làm mi Volume 5D (Bấm giờ đồng loạt)',
            timerStartedAt: now,
            timerElapsedMinutes: 15,
            timerService: 'Nối Mi Volume 5D',
            clientsIncrement: (updated[name].clientsIncrement || 0) + 1,
          };
        }
      });
      return updated;
    });
    logAction('START_TIMER', `[Training] Giả lập bấm giờ đồng loạt cho tất cả giường phục vụ`);
    message.success('[Training] Đã bấm giờ đồng loạt cho các giường');
  }, [logAction]);

  const resetTrainingState = useCallback(() => {
    setStaffOverrides(DEFAULT_TRAINING_OVERRIDES);
    logAction('RESET', '[Training] Đã khôi phục trạng thái chấm công & bấm giờ về kịch bản mẫu');
    message.info('[Training] Đã reset phòng tập check-in/bấm giờ');
  }, [logAction]);

  // Sales actions
  const simulateAddCombo = useCallback(
    (custom?: { name?: string; price?: number; customerName?: string }) => {
      const id = `combo-sim-${Date.now()}`;
      const name = custom?.name || 'Combo 10 Tặng 6 (Mi Thiết Kế VIP)';
      const price = custom?.price ?? 2_500_000;
      const customerName = custom?.customerName || `Khách VIP ${Math.floor(100 + Math.random() * 900)}`;
      const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      const newCombo: SimulatedComboSale = {
        id,
        name,
        price,
        customerName,
        ccName: 'CC Thảo My',
        cvName: 'CV Lan Anh',
        time,
      };

      setSimulatedCombos((prev) => [newCombo, ...prev]);
      logAction('ADD_COMBO', `[Sales] Chốt thành công ${name} — ${price.toLocaleString('vi-VN')} đ cho ${customerName}`);
      message.success(`[Sales] Đã giả lập chốt ${name} (+${price.toLocaleString('vi-VN')} đ)`);
    },
    [logAction]
  );

  const simulateAddProduct = useCallback(
    (custom?: { name?: string; price?: number; customerName?: string }) => {
      const id = `prod-sim-${Date.now()}`;
      const name = custom?.name || 'Serum Dưỡng Mi FKN Tế Bào Gốc';
      const price = custom?.price ?? 350_000;
      const customerName = custom?.customerName || `Khách VIP ${Math.floor(100 + Math.random() * 900)}`;
      const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      const newProd: SimulatedProductSale = {
        id,
        name,
        price,
        customerName,
        time,
      };

      setSimulatedProducts((prev) => [newProd, ...prev]);
      logAction('ADD_PRODUCT', `[Sales] Thêm sản phẩm dưỡng ${name} (+${price.toLocaleString('vi-VN')} đ)`);
      message.success(`[Sales] Đã thêm sản phẩm ${name}`);
    },
    [logAction]
  );

  const simulateAddGift = useCallback(
    (custom?: { name?: string; estimatedValue?: number; customerName?: string }) => {
      const id = `gift-sim-${Date.now()}`;
      const name = custom?.name || 'Cọ chải mi pha lê & Gương bỏ túi cao cấp';
      const estimatedValue = custom?.estimatedValue ?? 120_000;
      const customerName = custom?.customerName || `Khách VIP ${Math.floor(100 + Math.random() * 900)}`;
      const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      const newGift: SimulatedGift = {
        id,
        name,
        estimatedValue,
        customerName,
        time,
      };

      setSimulatedGifts((prev) => [newGift, ...prev]);
      logAction('ADD_GIFT', `[Sales] Tặng kèm quà tặng ${name} (Trị giá ${estimatedValue.toLocaleString('vi-VN')} đ) cho ${customerName}`);
      message.success(`[Sales] Đã thêm quà tặng: ${name}`);
    },
    [logAction]
  );

  const resetSalesState = useCallback(() => {
    setSimulatedCombos(INITIAL_SALES_COMBOS);
    setSimulatedProducts(INITIAL_SALES_PRODUCTS);
    setSimulatedGifts(INITIAL_SALES_GIFTS);
    logAction('RESET', '[Sales] Đã khôi phục kịch bản bán hàng & quà tặng về mặc định');
    message.info('[Sales] Đã đặt lại kịch bản bán hàng');
  }, [logAction]);

  // Design plan actions
  const updateDesignPlanTarget = useCallback(
    (id: string, delta: number) => {
      setDesignPlanItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, targetCount: Math.max(1, item.targetCount + delta) } : item))
      );
      logAction('DESIGN_PLAN', `[Kế hoạch] Cập nhật chỉ tiêu dáng mi (${delta > 0 ? '+' : ''}${delta} ca)`);
    },
    [logAction]
  );

  const incrementDesignPlanDone = useCallback(
    (id: string) => {
      setDesignPlanItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, completedCount: Math.min(item.targetCount + 5, item.completedCount + 1) } : item
        )
      );
      logAction('DESIGN_PLAN', `[Kế hoạch] Ghi nhận hoàn thành +1 ca thiết kế giả lập`);
    },
    [logAction]
  );

  const resetDesignPlan = useCallback(() => {
    setDesignPlanItems(INITIAL_DESIGN_PLAN);
    logAction('RESET', '[Kế hoạch] Đã đặt lại kế hoạch thiết kế dáng mi hôm nay');
  }, [logAction]);

  // Material checklist actions
  const toggleMaterialCheck = useCallback(
    (id: string) => {
      const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setMaterialsChecklist((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const nextChecked = !item.checked;
          return {
            ...item,
            checked: nextChecked,
            checkedAt: nextChecked ? timeNow : undefined,
            status: nextChecked && item.status === 'restock_needed' ? 'sufficient' : item.status,
          };
        })
      );
      logAction('MATERIAL_CHECK', `[NVL] Đã cập nhật kiểm tra nguyên vật liệu trước ca`);
    },
    [logAction]
  );

  const cycleMaterialStatus = useCallback(
    (id: string) => {
      const order: MaterialStatus[] = ['sufficient', 'low', 'restock_needed'];
      setMaterialsChecklist((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const nextStatus = order[(order.indexOf(item.status) + 1) % order.length];
          return {
            ...item,
            status: nextStatus,
            checked: nextStatus === 'sufficient' ? true : item.checked,
          };
        })
      );
      logAction('MATERIAL_CHECK', `[NVL] Đã đổi trạng thái tồn kho nguyên vật liệu giả lập`);
    },
    [logAction]
  );

  const resetMaterialsChecklist = useCallback(() => {
    setMaterialsChecklist(INITIAL_MATERIALS_CHECKLIST);
    logAction('RESET', '[NVL] Đã đặt lại danh mục kiểm tra nguyên vật liệu');
  }, [logAction]);

  // Preset actions (PA #1, PA #2...)
  const applyPreset = useCallback(
    (presetId: string) => {
      const target = presets.find((p) => p.id === presetId);
      if (!target) return;
      setActivePresetId(target.id);
      setModeState(target.mode);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(STORAGE_KEY_MODE, target.mode);
        } catch {
          // ignore
        }
      }
      if (target.designPlanSnapshot) setDesignPlanItems(target.designPlanSnapshot);
      if (target.materialsSnapshot) setMaterialsChecklist(target.materialsSnapshot);
      if (target.combosSnapshot) setSimulatedCombos(target.combosSnapshot);
      if (target.productsSnapshot) setSimulatedProducts(target.productsSnapshot);
      if (target.giftsSnapshot) setSimulatedGifts(target.giftsSnapshot);
      logAction('PRESET_SWITCH', `[Preset] Đã chuyển sang ${target.code} · ${target.label}`);
      message.success(`Đã áp dụng ${target.code}: ${target.label}`);
    },
    [presets, logAction]
  );

  const saveCurrentAsPreset = useCallback(
    (customLabel?: string) => {
      const nextIndex = presets.length + 1;
      const code = `PA #${nextIndex}`;
      const label =
        customLabel?.trim() ||
        (mode === 'sales' ? `Kịch bản Sales #${nextIndex}` : `Kịch bản Training & NVL #${nextIndex}`);
      const newPreset: SandboxPresetScenario = {
        id: `pa-${nextIndex}-${Date.now()}`,
        code,
        label,
        description:
          mode === 'sales'
            ? `Lưu kịch bản ${simulatedCombos.length} Combo · ${simulatedProducts.length} SP · ${simulatedGifts.length} Quà`
            : `Lưu kịch bản chấm công, kế hoạch thiết kế & kiểm tra nguyên vật liệu`,
        mode: mode === 'live' ? 'training' : mode,
        combosSnapshot: [...simulatedCombos],
        productsSnapshot: [...simulatedProducts],
        giftsSnapshot: [...simulatedGifts],
        designPlanSnapshot: [...designPlanItems],
        materialsSnapshot: [...materialsChecklist],
      };
      setPresets((prev) => [...prev, newPreset]);
      setActivePresetId(newPreset.id);
      logAction('PRESET_SWITCH', `[Preset] Đã lưu ${code} · ${label}`);
      message.success(`Đã lưu phương án giả lập mới: ${code}`);
    },
    [presets.length, mode, simulatedCombos, simulatedProducts, simulatedGifts, designPlanItems, materialsChecklist, logAction]
  );

  const clearActionLog = useCallback(() => {
    setSimulatedActions([]);
  }, []);

  const resetAllSandbox = useCallback(() => {
    resetTrainingState();
    resetDesignPlan();
    resetMaterialsChecklist();
    resetSalesState();
    clearActionLog();
    message.info('Đã đặt lại toàn bộ phòng tập Sandbox');
  }, [resetTrainingState, resetDesignPlan, resetMaterialsChecklist, resetSalesState, clearActionLog]);

  const totalSimulatedComboRevenue = useMemo(() => {
    return simulatedCombos.reduce((sum, item) => sum + item.price, 0);
  }, [simulatedCombos]);

  const totalSimulatedProductRevenue = useMemo(() => {
    return simulatedProducts.reduce((sum, item) => sum + item.price, 0);
  }, [simulatedProducts]);

  const totalSimulatedRevenue = useMemo(() => {
    return totalSimulatedComboRevenue + totalSimulatedProductRevenue;
  }, [totalSimulatedComboRevenue, totalSimulatedProductRevenue]);

  const materialReadyCount = useMemo(
    () => materialsChecklist.filter((m) => m.checked && m.status !== 'restock_needed').length,
    [materialsChecklist]
  );

  const designPlanTotals = useMemo(
    () => ({
      target: designPlanItems.reduce((sum, item) => sum + item.targetCount, 0),
      completed: designPlanItems.reduce((sum, item) => sum + item.completedCount, 0),
    }),
    [designPlanItems]
  );

  const closingRate = useMemo(() => {
    const comboBoost = Math.min(16, simulatedCombos.length * 6);
    const productBoost = Math.min(14, simulatedProducts.length * 4);
    const giftBoost = Math.min(18, simulatedGifts.length * 6);
    // Extra synergy when combining gift + product with combo
    const synergy = simulatedCombos.length > 0 && simulatedGifts.length > 0 && simulatedProducts.length > 0 ? 4 : 0;
    return Math.min(78, BASELINE_CLOSING_RATE + comboBoost + productBoost + giftBoost + synergy);
  }, [simulatedCombos.length, simulatedProducts.length, simulatedGifts.length]);

  const closingUpliftPercent = closingRate - BASELINE_CLOSING_RATE;

  const value: TodaySandboxContextValue = {
    mode,
    setMode,
    isSandbox: mode !== 'live',

    staffOverrides,
    nowTickMs,
    formatStaffTimerMMSS,
    simulateStaffCheckIn,
    simulateStaffCheckOut,
    simulateStaffStartTimer,
    simulateStaffStopTimer,
    simulateBatchCheckInAll,
    simulateBatchStartAllTimers,
    resetTrainingState,

    designPlanItems,
    materialsChecklist,
    materialReadyCount,
    designPlanTotals,
    updateDesignPlanTarget,
    incrementDesignPlanDone,
    resetDesignPlan,
    toggleMaterialCheck,
    cycleMaterialStatus,
    resetMaterialsChecklist,

    simulatedCombos,
    simulatedProducts,
    simulatedGifts,
    totalSimulatedRevenue,
    totalSimulatedComboRevenue,
    totalSimulatedProductRevenue,
    baselineClosingRate: BASELINE_CLOSING_RATE,
    closingRate,
    closingUpliftPercent,
    simulateAddCombo,
    simulateAddProduct,
    simulateAddGift,
    resetSalesState,

    presets,
    activePresetId,
    applyPreset,
    saveCurrentAsPreset,

    simulatedActions,
    clearActionLog,
    resetAllSandbox,
  };

  return <TodaySandboxContext.Provider value={value}>{children}</TodaySandboxContext.Provider>;
}

export function useTodaySandbox(): TodaySandboxContextValue {
  const ctx = useContext(TodaySandboxContext);
  if (!ctx) {
    // Graceful fallback if used outside provider
    return {
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
  }
  return ctx;
}

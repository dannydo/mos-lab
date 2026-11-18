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

export interface SimulatedLogAction {
  id: string;
  type: 'CHECK_IN' | 'CHECK_OUT' | 'START_TIMER' | 'STOP_TIMER' | 'ADD_COMBO' | 'ADD_PRODUCT' | 'ADD_GIFT' | 'RESET';
  timestamp: string;
  message: string;
}

export interface TodaySandboxContextValue {
  mode: TodaySandboxMode;
  setMode: (mode: TodaySandboxMode) => void;
  isSandbox: boolean;

  // Training Mode
  staffOverrides: Record<string, StaffTrainingOverride>;
  simulateStaffCheckIn: (staffName: string, role?: 'CV' | 'CC') => void;
  simulateStaffCheckOut: (staffName: string, role?: 'CV' | 'CC') => void;
  simulateStaffStartTimer: (staffName: string, serviceName?: string, estimatedMinutes?: number) => void;
  simulateStaffStopTimer: (staffName: string) => void;
  simulateBatchCheckInAll: (role?: 'CV' | 'CC' | 'ALL') => void;
  simulateBatchStartAllTimers: () => void;
  resetTrainingState: () => void;

  // Sales Simulation Mode
  simulatedCombos: SimulatedComboSale[];
  simulatedProducts: SimulatedProductSale[];
  simulatedGifts: SimulatedGift[];
  totalSimulatedRevenue: number;
  totalSimulatedComboRevenue: number;
  totalSimulatedProductRevenue: number;
  simulateAddCombo: (custom?: { name?: string; price?: number; customerName?: string }) => void;
  simulateAddProduct: (custom?: { name?: string; price?: number; customerName?: string }) => void;
  simulateAddGift: (custom?: { name?: string; estimatedValue?: number; customerName?: string }) => void;
  resetSalesState: () => void;

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

export function TodaySandboxProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<TodaySandboxMode>('live');
  const [staffOverrides, setStaffOverrides] = useState<Record<string, StaffTrainingOverride>>(DEFAULT_TRAINING_OVERRIDES);
  const [simulatedCombos, setSimulatedCombos] = useState<SimulatedComboSale[]>(INITIAL_SALES_COMBOS);
  const [simulatedProducts, setSimulatedProducts] = useState<SimulatedProductSale[]>(INITIAL_SALES_PRODUCTS);
  const [simulatedGifts, setSimulatedGifts] = useState<SimulatedGift[]>(INITIAL_SALES_GIFTS);
  const [simulatedActions, setSimulatedActions] = useState<SimulatedLogAction[]>([]);

  // Load initial mode from sessionStorage or URL query
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlMode = urlParams.get('sandboxMode') || urlParams.get('mode');
      if (urlMode === 'training' || urlMode === 'sales' || urlMode === 'live') {
        setModeState(urlMode);
        return;
      }
      const saved = sessionStorage.getItem(STORAGE_KEY_MODE) as TodaySandboxMode | null;
      if (saved && (saved === 'training' || saved === 'sales' || saved === 'live')) {
        setModeState(saved);
      }
    }
  }, []);

  const setMode = useCallback((newMode: TodaySandboxMode) => {
    setModeState(newMode);
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

  const clearActionLog = useCallback(() => {
    setSimulatedActions([]);
  }, []);

  const resetAllSandbox = useCallback(() => {
    resetTrainingState();
    resetSalesState();
    clearActionLog();
    message.info('Đã đặt lại toàn bộ phòng tập Sandbox');
  }, [resetTrainingState, resetSalesState, clearActionLog]);

  const totalSimulatedComboRevenue = useMemo(() => {
    return simulatedCombos.reduce((sum, item) => sum + item.price, 0);
  }, [simulatedCombos]);

  const totalSimulatedProductRevenue = useMemo(() => {
    return simulatedProducts.reduce((sum, item) => sum + item.price, 0);
  }, [simulatedProducts]);

  const totalSimulatedRevenue = useMemo(() => {
    return totalSimulatedComboRevenue + totalSimulatedProductRevenue;
  }, [totalSimulatedComboRevenue, totalSimulatedProductRevenue]);

  const value: TodaySandboxContextValue = {
    mode,
    setMode,
    isSandbox: mode !== 'live',

    staffOverrides,
    simulateStaffCheckIn,
    simulateStaffCheckOut,
    simulateStaffStartTimer,
    simulateStaffStopTimer,
    simulateBatchCheckInAll,
    simulateBatchStartAllTimers,
    resetTrainingState,

    simulatedCombos,
    simulatedProducts,
    simulatedGifts,
    totalSimulatedRevenue,
    totalSimulatedComboRevenue,
    totalSimulatedProductRevenue,
    simulateAddCombo,
    simulateAddProduct,
    simulateAddGift,
    resetSalesState,

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
      simulateStaffCheckIn: () => {},
      simulateStaffCheckOut: () => {},
      simulateStaffStartTimer: () => {},
      simulateStaffStopTimer: () => {},
      simulateBatchCheckInAll: () => {},
      simulateBatchStartAllTimers: () => {},
      resetTrainingState: () => {},
      simulatedCombos: [],
      simulatedProducts: [],
      simulatedGifts: [],
      totalSimulatedRevenue: 0,
      totalSimulatedComboRevenue: 0,
      totalSimulatedProductRevenue: 0,
      simulateAddCombo: () => {},
      simulateAddProduct: () => {},
      simulateAddGift: () => {},
      resetSalesState: () => {},
      simulatedActions: [],
      clearActionLog: () => {},
      resetAllSandbox: () => {},
    };
  }
  return ctx;
}

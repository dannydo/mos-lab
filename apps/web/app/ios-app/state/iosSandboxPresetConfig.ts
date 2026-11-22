'use client';

import { useCallback, useState } from 'react';

export const IOS_SIM_PRESET_MODE_SESSION_KEY = 'mos_ios_sandbox_preset_mode';

export type IosSandboxPresetMode = 'full' | 'training' | 'sales';

export interface IosSimMaterialCheckItem {
  id: string;
  label: string;
  stockNote: string;
  checked: boolean;
}

export const INITIAL_IOS_SIM_MATERIALS: IosSimMaterialCheckItem[] = [
  { id: 'glue', label: 'Keo nối mi Wings Ultra-Bond', stockNote: 'Độ ẩm 48% · Đủ ca', checked: true },
  { id: 'tweezers', label: 'Nhíp tách & gắp mi khử khuẩn', stockNote: 'Sẵn sàng tại khay', checked: true },
  { id: 'fans', label: 'Khay mi Fan UltraLight / Classic', stockNote: 'Còn 4 hộp · Theo dõi', checked: false },
  { id: 'pads', label: 'Gel Pad & Băng keo lụa', stockNote: 'Đủ dùng trong ca', checked: true },
  { id: 'primer', label: 'Primer / Bonder & Vệ sinh mi', stockNote: 'Còn 2 lọ · Cần bổ sung', checked: false },
];

export const IOS_SANDBOX_MODE_OPTIONS: Array<{
  id: IosSandboxPresetMode;
  shortLabel: string;
  title: string;
  description: string;
}> = [
  {
    id: 'training',
    shortLabel: 'Training Ca',
    title: 'Training Check-in · Bấm giờ · Check-out & NVL',
    description: 'Diễn tập check-in, bấm giờ làm mi, check-out ca, kế hoạch thiết kế & check nguyên vật liệu.',
  },
  {
    id: 'sales',
    shortLabel: 'Sales Combo',
    title: 'Sales Chốt Combo · Sản Phẩm · Quà Tặng',
    description: 'Giả lập tư vấn chốt gói Combo, thêm sản phẩm dưỡng + quà tặng và xem mức tăng tỉ lệ chốt.',
  },
  {
    id: 'full',
    shortLabel: 'Full 15 bước',
    title: 'Quy trình chuẩn 15 bước (Mặc định)',
    description: 'Thực hành trọn vẹn từ Bước 1 (Chờ đón) đến Bước 15 (In bill & hoàn tất).',
  },
];

export function useIosSandboxPresets() {
  const [simPresetMode, setSimPresetModeState] = useState<IosSandboxPresetMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const queryMode = urlParams.get('simMode') || urlParams.get('sandboxMode');
        if (queryMode === 'training' || queryMode === 'sales' || queryMode === 'full') {
          return queryMode;
        }
        const saved = window.sessionStorage.getItem(IOS_SIM_PRESET_MODE_SESSION_KEY);
        if (saved === 'training' || saved === 'sales' || saved === 'full') {
          return saved;
        }
      } catch {
        // ignore storage errors
      }
    }
    return 'training';
  });

  const [simMaterialsChecklist, setSimMaterialsChecklist] =
    useState<IosSimMaterialCheckItem[]>(INITIAL_IOS_SIM_MATERIALS);

  const selectSimPresetMode = useCallback((nextMode: IosSandboxPresetMode) => {
    setSimPresetModeState(nextMode);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(IOS_SIM_PRESET_MODE_SESSION_KEY, nextMode);
      } catch {
        // ignore
      }
    }
  }, []);

  const toggleSimMaterialCheck = useCallback((itemId: string) => {
    setSimMaterialsChecklist((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, checked: !item.checked } : item))
    );
  }, []);

  return {
    simPresetMode,
    selectSimPresetMode,
    simMaterialsChecklist,
    toggleSimMaterialCheck,
  };
}

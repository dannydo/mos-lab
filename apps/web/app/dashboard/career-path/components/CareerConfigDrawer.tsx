'use client';

import React from 'react';
import { Slider } from 'antd';
import type { CareerProgressionConfig } from '@mos-lab/shared';
import { AdaptiveDrawer } from '../../../../components/ui/AdaptiveOverlay';

interface CareerConfigDrawerProps {
  open: boolean;
  onClose: () => void;
  config: CareerProgressionConfig;
  onConfigChange: (newConfig: CareerProgressionConfig) => void;
  onSave: (cvToCcConfig: CareerProgressionConfig['cvToCc']) => Promise<void>;
  saving: boolean;
  themeMode?: 'light' | 'dark';
}

export function CareerConfigDrawer({
  open,
  onClose,
  config,
  onConfigChange,
  onSave,
  saving,
  themeMode,
}: CareerConfigDrawerProps) {
  return (
    <AdaptiveDrawer
      title="⚙️ Cấu Hình Thông Số Thăng Tiến (Zero-Code Admin)"
      placement="bottom"
      height="85%"
      open={open}
      onClose={onClose}
      className={themeMode === 'dark' ? 'dark-theme' : 'light-theme'}
    >
      <div className="max-w-md mx-auto space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Điều chỉnh trực tiếp các thông số điều kiện thăng cấp Ải CV ➔ CC. Sau khi lưu, toàn bộ hệ thống mobile và web
          sẽ áp dụng tức thì.
        </p>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Số ca làm tối thiểu:</span>
              <span className="font-mono text-pink-600">{config.cvToCc.minOrders} ca</span>
            </div>
            <Slider
              min={100}
              max={600}
              value={config.cvToCc.minOrders}
              onChange={(val) => onConfigChange({ ...config, cvToCc: { ...config.cvToCc, minOrders: val } })}
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Tỷ lệ tự bán Combo tối thiểu (Ải Trùm Cuối):</span>
              <span className="font-mono text-pink-600">{(config.cvToCc.minSelfComboRate * 100).toFixed(0)}%</span>
            </div>
            <Slider
              min={5}
              max={40}
              value={config.cvToCc.minSelfComboRate * 100}
              onChange={(val) =>
                onConfigChange({ ...config, cvToCc: { ...config.cvToCc, minSelfComboRate: val / 100 } })
              }
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Tỷ lệ lỗi Fix tối đa:</span>
              <span className="font-mono text-pink-600">{(config.cvToCc.maxFixRate * 100).toFixed(1)}%</span>
            </div>
            <Slider
              min={0.5}
              max={5}
              step={0.1}
              value={config.cvToCc.maxFixRate * 100}
              onChange={(val) => onConfigChange({ ...config, cvToCc: { ...config.cvToCc, maxFixRate: val / 100 } })}
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Số ngày thử thách tự tư vấn:</span>
              <span className="font-mono text-pink-600">{config.cvToCc.trialDurationDays} ngày</span>
            </div>
            <Slider
              min={15}
              max={60}
              value={config.cvToCc.trialDurationDays}
              onChange={(val) => onConfigChange({ ...config, cvToCc: { ...config.cvToCc, trialDurationDays: val } })}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            Hủy
          </button>
          <button
            disabled={saving}
            onClick={() => onSave(config.cvToCc)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-pink-500 text-white shadow-md shadow-pink-500/30 hover:bg-pink-600 transition"
          >
            {saving ? 'Đang Lưu...' : 'Lưu Cấu Hình Mới'}
          </button>
        </div>
      </div>
    </AdaptiveDrawer>
  );
}

'use client';

import React from 'react';
import { Slider, Switch } from 'antd';
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
  const cvToCc = config?.cvToCc || {
    minOrders: 300,
    minConsecutiveMonths: 3,
    minTipRatioAboveShop: 0.1,
    maxFixRate: 0.02,
    minHappinessIndex: 0.7,
    maxDisciplinaryViolations: 0,
    minWeeklyQaAudits: 1,
    minQaAudits: 12,
    requireZeroFailedAudits: true,
    trialDurationDays: 30,
    minSelfComboRate: 0.25,
    allowSelfConsultTrial: true,
  };

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
              <span>Số ca làm tối thiểu (trong 3 tháng liền):</span>
              <span className="font-mono text-pink-600">{cvToCc.minOrders} ca</span>
            </div>
            <Slider
              min={100}
              max={600}
              step={10}
              value={cvToCc.minOrders}
              onChange={(val) => onConfigChange({ ...config, cvToCc: { ...cvToCc, minOrders: val } })}
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Tỷ lệ tự bán Combo tối thiểu (Ải Trùm Cuối):</span>
              <span className="font-mono text-pink-600">{(cvToCc.minSelfComboRate * 100).toFixed(0)}%</span>
            </div>
            <Slider
              min={5}
              max={50}
              step={1}
              value={cvToCc.minSelfComboRate * 100}
              onChange={(val) => onConfigChange({ ...config, cvToCc: { ...cvToCc, minSelfComboRate: val / 100 } })}
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>% Tip cao hơn trung bình shop:</span>
              <span className="font-mono text-pink-600">+{(cvToCc.minTipRatioAboveShop * 100).toFixed(0)}%</span>
            </div>
            <Slider
              min={0}
              max={30}
              step={1}
              value={cvToCc.minTipRatioAboveShop * 100}
              onChange={(val) => onConfigChange({ ...config, cvToCc: { ...cvToCc, minTipRatioAboveShop: val / 100 } })}
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Chỉ số HI tối thiểu (Check-in thả tim):</span>
              <span className="font-mono text-pink-600">{(cvToCc.minHappinessIndex * 100).toFixed(0)}%</span>
            </div>
            <Slider
              min={50}
              max={95}
              step={1}
              value={cvToCc.minHappinessIndex * 100}
              onChange={(val) => onConfigChange({ ...config, cvToCc: { ...cvToCc, minHappinessIndex: val / 100 } })}
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Tỷ lệ lỗi Fix tối đa:</span>
              <span className="font-mono text-pink-600">{(cvToCc.maxFixRate * 100).toFixed(1)}%</span>
            </div>
            <Slider
              min={0.5}
              max={5}
              step={0.1}
              value={cvToCc.maxFixRate * 100}
              onChange={(val) => onConfigChange({ ...config, cvToCc: { ...cvToCc, maxFixRate: val / 100 } })}
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Số ngày thử thách tự tư vấn:</span>
              <span className="font-mono text-pink-600">{cvToCc.trialDurationDays} ngày</span>
            </div>
            <Slider
              min={15}
              max={60}
              value={cvToCc.trialDurationDays}
              onChange={(val) => onConfigChange({ ...config, cvToCc: { ...cvToCc, trialDurationDays: val } })}
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <div>
                <span>📋 Kiểm định QA/QC tối thiểu trong 3 tháng qua:</span>
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                  Tối thiểu số lần được QA/QC kiểm định tác phong & phòng mi trong 90 ngày (chuẩn 12 lần = 1 lần/tuần).
                  Đặt = 0 nếu chưa có dữ liệu QA/QC.
                </p>
              </div>
              <span className="font-mono text-pink-600 font-black">{cvToCc.minQaAudits ?? 12} lần</span>
            </div>
            <Slider
              min={0}
              max={24}
              step={1}
              value={cvToCc.minQaAudits ?? 12}
              onChange={(val) =>
                onConfigChange({
                  ...config,
                  cvToCc: { ...cvToCc, minQaAudits: val, minWeeklyQaAudits: Number((val / 12).toFixed(2)) },
                  cvToCvPlus: {
                    ...(config.cvToCvPlus || cvToCc),
                    minQaAudits: val,
                    minWeeklyQaAudits: Number((val / 12).toFixed(2)),
                  },
                })
              }
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <div>
                <span>🍌 Chuối Yêu Thương check-in (15*3 = 45 / 90N):</span>
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                  Chỉ đếm chuối nhận từ thiên thần khác lúc check-in trong 90 ngày (15 chuối/tháng)
                </p>
              </div>
              <span className="font-mono text-amber-500 font-black">{cvToCc.minBananaCount ?? 45} 🍌</span>
            </div>
            <Slider
              min={5}
              max={150}
              step={5}
              value={cvToCc.minBananaCount ?? 45}
              onChange={(val) =>
                onConfigChange({
                  ...config,
                  cvToCc: { ...cvToCc, minBananaCount: val },
                  cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), minBananaCount: val },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Khóa nâng cấp nếu có bài Failed QA/QC:
              </div>
              <div className="text-[11px] text-slate-400">
                Nếu bị 1 biên bản hoặc bài kiểm tra không đạt ➔ Bị đóng băng thăng cấp
              </div>
            </div>
            <Switch
              checked={cvToCc.requireZeroFailedAudits !== false}
              onChange={(checked) =>
                onConfigChange({ ...config, cvToCc: { ...cvToCc, requireZeroFailedAudits: checked } })
              }
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
            onClick={() => onSave(cvToCc)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-pink-500 text-white shadow-md shadow-pink-500/30 hover:bg-pink-600 transition"
          >
            {saving ? 'Đang Lưu...' : 'Lưu Cấu Hình Mới'}
          </button>
        </div>
      </div>
    </AdaptiveDrawer>
  );
}

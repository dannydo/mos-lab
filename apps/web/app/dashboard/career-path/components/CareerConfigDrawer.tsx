'use client';

import React from 'react';
import { Slider, Switch, Segmented, InputNumber } from 'antd';
import { Target, Sparkles, ShieldCheck, Flame, DollarSign, Crown, Coins, ShieldAlert } from 'lucide-react';
import { type CareerProgressionConfig } from '@mos-lab/shared';
import { calculateComboBonus } from '../career-path.constants';
import { AdaptiveDrawer } from '../../../../components/ui/AdaptiveOverlay';

interface CareerConfigDrawerProps {
  open: boolean;
  onClose: () => void;
  config: CareerProgressionConfig;
  onConfigChange: (newConfig: CareerProgressionConfig) => void;
  onSave: (payload: {
    cvToCc: CareerProgressionConfig['cvToCc'];
    cvToCvPlus: CareerProgressionConfig['cvToCvPlus'];
    cvPlusToCvPlusPlus: CareerProgressionConfig['cvPlusToCvPlusPlus'];
  }) => Promise<void>;
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
  const [activeTab, setActiveTab] = React.useState<'CV_TO_CV_PLUS' | 'CV_PLUS_TO_CV_PLUS_PLUS'>('CV_TO_CV_PLUS');

  const cvToCc = config?.cvToCc ||
    config?.cvToCvPlus || {
      minOrders: 300,
      minConsecutiveMonths: 3,
      minTipRatioAboveShop: 0.1,
      maxFixRate: 0.02,
      minHappinessIndex: 0.7,
      minBananaCount: 45,
      maxDisciplinaryViolations: 0,
      minWeeklyQaAudits: 1,
      minQaAudits: 12,
      requireZeroFailedAudits: true,
      trialDurationDays: 30,
      minSelfComboRate: 0.2,
      allowSelfConsultTrial: true,
      expectedSerumsPerWeek: 4,
      expectedCombosPerMonth: 6,
      serumOriginalPriceBonus: 100000,
      serumDiscountedPriceBonus: 50000,
      comboUnder2mBonus: 50000,
      comboUnder3mBonus: 100000,
      comboUnder4mBonus: 150000,
      comboStepPerMillionBonus: 50000,
    };

  const cvPlusToCvPlusPlus = config?.cvPlusToCvPlusPlus || {
    minMonthsInCvPlus: 2,
    minOrders: 350,
    maxFixRate: 0.015,
    minTipRatioAboveShop: 0.15,
    minBananaCount: 60,
    minHappinessIndex: 0.8,
    crossConsultCommissionRate: 0.025,
    maxDisciplinaryViolations: 0,
    minWeeklyQaAudits: 1,
    minQaAudits: 12,
    requireZeroFailedAudits: true,
    trialDurationDays: 30,
    allowSelfConsultTrial: true,
    minSelfComboRate: 0.3,
    expectedSerumsPerWeek: 4,
    expectedCombosPerMonth: 10,
    serumOriginalPriceBonus: 100000,
    serumDiscountedPriceBonus: 50000,
    comboUnder2mBonus: 50000,
    comboUnder3mBonus: 100000,
    comboUnder4mBonus: 150000,
    comboStepPerMillionBonus: 50000,
    crossConsultCvShareRate: 0.2,
  };

  const formatVnd = (num?: number | null) => {
    if (!num) return '0đ';
    return `${num.toLocaleString('vi-VN')}đ`;
  };

  // Tab 1 calculations (CV -> CV+)
  const combosPerMonth = cvToCc.expectedCombosPerMonth ?? 6;
  const serumsPerWeek = cvToCc.expectedSerumsPerWeek ?? 4;
  const serumOrigBonus = cvToCc.serumOriginalPriceBonus ?? 100000;
  const serumDiscountBonus = cvToCc.serumDiscountedPriceBonus ?? 50000;

  const sampleComboBonus = calculateComboBonus(4500000, cvToCc);
  const comboCommissionEstimated = combosPerMonth * sampleComboBonus;
  const serumCommissionWeekly = serumsPerWeek * serumOrigBonus;
  const serumCommissionMonthly = serumCommissionWeekly * 4;
  const totalSalesCommissionMonthly = comboCommissionEstimated + serumCommissionMonthly;

  // Tab 2 calculations (CV+ -> CV++)
  const cvPlusCombos = cvPlusToCvPlusPlus.expectedCombosPerMonth ?? 10;
  const cvPlusSerums = cvPlusToCvPlusPlus.expectedSerumsPerWeek ?? 4;
  const cvPlusCrossRate = cvPlusToCvPlusPlus.crossConsultCommissionRate ?? 0.025;
  const cvPlusCrossTipRate = cvPlusToCvPlusPlus.crossConsultTipRate ?? 0.2;
  const cvPlusCrossCvShare = cvPlusToCvPlusPlus.crossConsultCvShareRate ?? 0.2;
  const cvPlusCrossOrders = cvPlusToCvPlusPlus.expectedCrossConsultOrdersPerMonth ?? 20;
  const cvPlusCrossCombos = cvPlusToCvPlusPlus.expectedCrossConsultCombosPerMonth ?? 4;

  const cvPlusSampleComboBonus = calculateComboBonus(4500000, cvPlusToCvPlusPlus);
  const cvPlusComboComm = cvPlusCombos * cvPlusSampleComboBonus;
  const cvPlusSerumWeekly = cvPlusSerums * (cvPlusToCvPlusPlus.serumOriginalPriceBonus ?? 100000);
  const cvPlusSerumMonthly = cvPlusSerumWeekly * 4;
  const cvPlusCrossTipAmount = Math.round(cvPlusCrossOrders * 40000 * cvPlusCrossTipRate);
  const cvPlusCrossComboComm = Math.round(cvPlusCrossCombos * cvPlusSampleComboBonus);
  const cvPlusCrossCvSharedAmount = Math.round(cvPlusCrossComboComm * cvPlusCrossCvShare);
  const cvPlusTotalCrossConsult = cvPlusCrossTipAmount + cvPlusCrossComboComm;
  const cvPlusTotalSalesComm = cvPlusComboComm + cvPlusSerumMonthly + cvPlusTotalCrossConsult;

  const handleSaveAll = () => {
    onSave({
      cvToCc,
      cvToCvPlus: cvToCc,
      cvPlusToCvPlusPlus,
    });
  };

  return (
    <AdaptiveDrawer
      title="⚙️ Cấu Hình Thông Số Thăng Tiến (Zero-Code Admin)"
      placement="right"
      width={520}
      open={open}
      onClose={onClose}
      className={themeMode === 'dark' ? 'dark-theme' : 'light-theme'}
    >
      <div className="space-y-4 pb-20">
        {/* TAB / SEGMENTED SWITCHER: CV -> CV+ vs CV+ -> CV++ */}
        <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
          <Segmented
            block
            value={activeTab}
            onChange={(val) => setActiveTab(val as 'CV_TO_CV_PLUS' | 'CV_PLUS_TO_CV_PLUS_PLUS')}
            options={[
              {
                label: (
                  <span className="flex items-center justify-center gap-1.5 py-1 text-xs font-bold">
                    <span>🎯</span>
                    <span>Ải 1: CV ➔ CV+ (Chuyên Viên Tự Chủ)</span>
                  </span>
                ),
                value: 'CV_TO_CV_PLUS',
              },
              {
                label: (
                  <span className="flex items-center justify-center gap-1.5 py-1 text-xs font-bold">
                    <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                    <span>Ải 2: CV+ ➔ CV++ (Đàn Chị)</span>
                  </span>
                ),
                value: 'CV_PLUS_TO_CV_PLUS_PLUS',
              },
            ]}
          />
        </div>

        {activeTab === 'CV_TO_CV_PLUS' ? (
          /* ========================================================================= */
          /* TAB 1: CV ➔ CV+ (CHUYÊN VIÊN TỰ CHỦ) */
          /* ========================================================================= */
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Điều chỉnh trực tiếp các tiêu chuẩn thăng cấp <strong>Ải 1: CV ➔ CV+ (Chuyên Viên Tự Chủ)</strong>. Sau
              khi lưu, toàn bộ hệ thống web và mobile sẽ áp dụng tức thì.
            </p>

            {/* NHÓM 1: NĂNG SUẤT & KỸ THUẬT CỐT LÕI */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                    1. Năng Suất &amp; Kỹ Thuật
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-tight">
                  Kỹ thuật
                </span>
              </div>

              {/* 1.1 Số ca làm tối thiểu */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Số bộ mi tối thiểu (trong 3 tháng liền):</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-black">
                    {cvToCc.minOrders} bộ mi
                  </span>
                </div>
                <Slider
                  min={100}
                  max={600}
                  step={10}
                  value={cvToCc.minOrders}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvToCc: { ...cvToCc, minOrders: val },
                      cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), minOrders: val },
                    })
                  }
                />
              </div>

              {/* 1.2 Tỷ lệ lỗi Fix tối đa */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Tỷ lệ lỗi Fix tối đa:</span>
                  <span className="font-mono text-rose-500 font-black">{(cvToCc.maxFixRate * 100).toFixed(1)}%</span>
                </div>
                <Slider
                  min={0.5}
                  max={5}
                  step={0.1}
                  value={cvToCc.maxFixRate * 100}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvToCc: { ...cvToCc, maxFixRate: val / 100 },
                      cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), maxFixRate: val / 100 },
                    })
                  }
                />
              </div>

              {/* 1.3 % Tip cao hơn trung bình shop */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>% Tip cao hơn trung bình shop:</span>
                  <span className="font-mono text-pink-600 font-black">
                    +{(cvToCc.minTipRatioAboveShop * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={30}
                  step={1}
                  value={cvToCc.minTipRatioAboveShop * 100}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvToCc: { ...cvToCc, minTipRatioAboveShop: val / 100 },
                      cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), minTipRatioAboveShop: val / 100 },
                    })
                  }
                />
              </div>
            </div>

            {/* NHÓM 2: DỰ KIẾN BÁN HÀNG & HOA HỒNG THỰC CHIẾN */}
            <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-purple-200/50 dark:border-purple-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                    2. Bán Hàng: Tiền Tươi Theo Món &amp; Bậc Thang
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-tight">
                  Tiền tươi theo món
                </span>
              </div>

              {/* 2.1 CẤU HÌNH THƯỞNG DƯỠNG MI YEPPEUM */}
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/50 pb-1.5">
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                    <span>✨</span>
                    <span>Thưởng Bán Cây Dưỡng Mi Yeppeum</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Nhận: +{formatVnd(serumCommissionMonthly)}/tháng
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Giá Gốc (1.1M):
                    </label>
                    <InputNumber
                      className="w-full"
                      value={cvToCc.serumOriginalPriceBonus ?? 100000}
                      step={10000}
                      min={0}
                      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '') || 0)}
                      addonAfter="đ"
                      onChange={(val) =>
                        onConfigChange({
                          ...config,
                          cvToCc: { ...cvToCc, serumOriginalPriceBonus: Number(val || 0) },
                          cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), serumOriginalPriceBonus: Number(val || 0) },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Giá Giảm / Combo:
                    </label>
                    <InputNumber
                      className="w-full"
                      value={cvToCc.serumDiscountedPriceBonus ?? 50000}
                      step={5000}
                      min={0}
                      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '') || 0)}
                      addonAfter="đ"
                      onChange={(val) =>
                        onConfigChange({
                          ...config,
                          cvToCc: { ...cvToCc, serumDiscountedPriceBonus: Number(val || 0) },
                          cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), serumDiscountedPriceBonus: Number(val || 0) },
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span>Số cây dưỡng mi dự kiến / tuần:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                      {serumsPerWeek} cây/tuần (+{formatVnd(serumCommissionWeekly)}/tuần)
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={20}
                    step={1}
                    value={serumsPerWeek}
                    onChange={(val) =>
                      onConfigChange({
                        ...config,
                        cvToCc: { ...cvToCc, expectedSerumsPerWeek: val },
                        cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), expectedSerumsPerWeek: val },
                      })
                    }
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mt-0.5 italic">
                    * Bán giá gốc nhận 100K, giảm giá nhận 50K, tặng kèm 0K. Dự kiến {serumsPerWeek} cây giá gốc = +
                    {formatVnd(serumCommissionMonthly)}/tháng.
                  </p>
                </div>
              </div>

              {/* 2.2 CẤU HÌNH THƯỞNG COMBO BẬC THANG */}
              <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-3">
                <div className="flex items-center justify-between border-b border-purple-200/60 dark:border-purple-800/50 pb-1.5">
                  <span className="text-xs font-black text-purple-800 dark:text-purple-200 flex items-center gap-1.5">
                    <span>🏹</span>
                    <span>Thưởng Hoa Hồng Combo Nối Mi (Bậc Thang)</span>
                  </span>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                    Gói 4.5M: +{formatVnd(sampleComboBonus)}/combo
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Gói &lt; 2 Triệu:
                    </label>
                    <InputNumber
                      className="w-full"
                      value={cvToCc.comboUnder2mBonus ?? 50000}
                      step={5000}
                      min={0}
                      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '') || 0)}
                      addonAfter="đ"
                      onChange={(val) =>
                        onConfigChange({
                          ...config,
                          cvToCc: { ...cvToCc, comboUnder2mBonus: Number(val || 0) },
                          cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), comboUnder2mBonus: Number(val || 0) },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Gói 2M – &lt; 3 Triệu:
                    </label>
                    <InputNumber
                      className="w-full"
                      value={cvToCc.comboUnder3mBonus ?? 100000}
                      step={5000}
                      min={0}
                      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '') || 0)}
                      addonAfter="đ"
                      onChange={(val) =>
                        onConfigChange({
                          ...config,
                          cvToCc: { ...cvToCc, comboUnder3mBonus: Number(val || 0) },
                          cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), comboUnder3mBonus: Number(val || 0) },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Gói 3M – &lt; 4 Triệu:
                    </label>
                    <InputNumber
                      className="w-full"
                      value={cvToCc.comboUnder4mBonus ?? 150000}
                      step={5000}
                      min={0}
                      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '') || 0)}
                      addonAfter="đ"
                      onChange={(val) =>
                        onConfigChange({
                          ...config,
                          cvToCc: { ...cvToCc, comboUnder4mBonus: Number(val || 0) },
                          cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), comboUnder4mBonus: Number(val || 0) },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Từ 4M trở lên (+mỗi 1M):
                    </label>
                    <InputNumber
                      className="w-full"
                      value={cvToCc.comboStepPerMillionBonus ?? 50000}
                      step={5000}
                      min={0}
                      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '') || 0)}
                      addonAfter="đ"
                      onChange={(val) =>
                        onConfigChange({
                          ...config,
                          cvToCc: { ...cvToCc, comboStepPerMillionBonus: Number(val || 0) },
                          cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), comboStepPerMillionBonus: Number(val || 0) },
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span>Số gói combo cá nhân dự kiến / tháng:</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-black">
                      {combosPerMonth} combo (+{formatVnd(comboCommissionEstimated)}/tháng)
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={30}
                    step={1}
                    value={combosPerMonth}
                    onChange={(val) =>
                      onConfigChange({
                        ...config,
                        cvToCc: { ...cvToCc, expectedCombosPerMonth: val },
                        cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), expectedCombosPerMonth: val },
                      })
                    }
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mt-0.5 italic">
                    * Gói trung bình 4.5M được thưởng {formatVnd(sampleComboBonus)}/combo. Bán {combosPerMonth} combo =
                    +{formatVnd(comboCommissionEstimated)}/tháng.
                  </p>
                </div>

                {/* 2.3 TỶ LỆ CHỐT COMBO TỰ THÂN TỐI THIỂU (CHUẨN CV+) */}
                <div className="pt-2.5 border-t border-purple-200/60 dark:border-purple-800/50">
                  <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1">
                      <span>🎯</span>
                      <span>Tỷ lệ tự chốt combo tối thiểu (Chuẩn CV+):</span>
                    </span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-black text-sm">
                      {((cvToCc.minSelfComboRate ?? 0.2) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    min={5}
                    max={50}
                    step={1}
                    value={Math.round((cvToCc.minSelfComboRate ?? 0.2) * 100)}
                    onChange={(val) =>
                      onConfigChange({
                        ...config,
                        cvToCc: { ...cvToCc, minSelfComboRate: val / 100 },
                        cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), minSelfComboRate: val / 100 },
                      })
                    }
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mt-0.5 italic">
                    * Chuẩn tỷ lệ chốt combo tối thiểu trên tệp khách tiềm năng. Nếu Chuyên Viên đạt dưới mức này, chế
                    tài doanh nghiệp sẽ tạm khóa phần lương giờ tăng thêm (+2.000đ/h) và thưởng bán hàng.
                  </p>
                </div>
              </div>

              {/* Mini-Summary Box */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-emerald-500/10 border border-purple-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      Tổng hoa hồng bán hàng dự kiến (CV+)
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      Combo ({formatVnd(comboCommissionEstimated)}) + Dưỡng mi ({formatVnd(serumCommissionMonthly)})
                    </div>
                  </div>
                </div>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{formatVnd(totalSalesCommissionMonthly)}/tháng
                </span>
              </div>
            </div>

            {/* NHÓM 3: ĐÃI NGỘ LƯƠNG GIỜ, TIP & CHẾ TÀI 20% COMBO */}
            <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                    3. Lương Giờ, Tip &amp; Chế Tài 20% Combo
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-tight">
                  Đãi ngộ CV+
                </span>
              </div>

              {/* Lương theo giờ */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Lương theo giờ CV+ (Gốc CV: 25.500đ/h):</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-black">
                    {formatVnd(cvToCc.hourlyWage ?? 27500)}/h (+{formatVnd((cvToCc.hourlyWage ?? 27500) - 25500)}/h)
                  </span>
                </div>
                <InputNumber
                  className="w-full"
                  value={cvToCc.hourlyWage ?? 27500}
                  step={500}
                  min={25500}
                  max={50000}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '') || 0)}
                  addonAfter="đ/h"
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvToCc: { ...cvToCc, hourlyWage: Number(val || 0) },
                      cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), hourlyWage: Number(val || 0) },
                    })
                  }
                />
              </div>

              {/* Tỷ lệ tip hưởng trọn */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Tỷ lệ hưởng Tip khi tự tư vấn &amp; làm mi:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {((cvToCc.tipShareRatio ?? 0.9) * 100).toFixed(0)}% (70% Mi + 20% Tư vấn)
                  </span>
                </div>
                <Slider
                  min={70}
                  max={100}
                  step={5}
                  value={(cvToCc.tipShareRatio ?? 0.9) * 100}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvToCc: { ...cvToCc, tipShareRatio: val / 100 },
                      cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), tipShareRatio: val / 100 },
                    })
                  }
                />
              </div>

              {/* Chế tài bảo vệ chất lượng nếu dưới chuẩn combo */}
              <div className="p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    <span>
                      Chế tài nếu không đạt tối thiểu {((cvToCc.minSelfComboRate ?? 0.2) * 100).toFixed(0)}% combo:
                    </span>
                  </span>
                  <Switch
                    checked={cvToCc.enforceComboPenalty !== false}
                    onChange={(checked) =>
                      onConfigChange({
                        ...config,
                        cvToCc: { ...cvToCc, enforceComboPenalty: checked },
                        cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), enforceComboPenalty: checked },
                      })
                    }
                  />
                </div>
                <div className="text-[10px] text-rose-700 dark:text-rose-300 leading-relaxed">
                  Nếu tỷ lệ chốt combo &lt; {((cvToCc.minSelfComboRate ?? 0.2) * 100).toFixed(0)}%:{' '}
                  <strong>Khóa phần lương tăng thêm (+{formatVnd((cvToCc.hourlyWage ?? 27500) - 25500)}/h)</strong> và{' '}
                  <strong>toàn bộ thưởng bán hàng (combo/dưỡng mi)</strong>. Chỉ được giữ lại 20% tip tư vấn!
                </div>
              </div>
            </div>

            {/* NHÓM 4: KỶ LUẬT QA & VĂN HÓA ĐỘI NGŨ */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-emerald-200/50 dark:border-emerald-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                    4. Kỷ Luật QA &amp; Văn Hóa Đội Ngũ
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-tight">
                  Kỷ luật &amp; Văn hóa
                </span>
              </div>

              {/* 3.1 Kiểm định QA/QC */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div>
                    <span>📋 Kiểm định QA/QC tối thiểu trong tháng hoàn tất:</span>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Tối thiểu số lần được QA/QC kiểm định tác phong &amp; phòng mi trong tháng hoàn tất gần nhất
                      (chuẩn 4 lần = 1 lần/tuần).
                    </p>
                  </div>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {cvToCc.minQaAudits ?? 4} lần
                  </span>
                </div>
                <Slider
                  min={0}
                  max={12}
                  step={1}
                  value={cvToCc.minQaAudits ?? 4}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvToCc: { ...cvToCc, minQaAudits: val, minWeeklyQaAudits: Number((val / 4).toFixed(2)) },
                      cvToCvPlus: {
                        ...(config.cvToCvPlus || cvToCc),
                        minQaAudits: val,
                        minWeeklyQaAudits: Number((val / 4).toFixed(2)),
                      },
                    })
                  }
                />
              </div>

              {/* 3.2 Khóa nâng cấp nếu có bài Failed QA/QC */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Khóa nâng cấp nếu có bài Failed QA/QC:
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Nếu bị 1 biên bản hoặc bài kiểm tra không đạt ➔ Bị đóng băng thăng cấp
                  </div>
                </div>
                <Switch
                  checked={cvToCc.requireZeroFailedAudits !== false}
                  onChange={(checked) =>
                    onConfigChange({
                      ...config,
                      cvToCc: { ...cvToCc, requireZeroFailedAudits: checked },
                      cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), requireZeroFailedAudits: checked },
                    })
                  }
                />
              </div>

              {/* 3.3 Chuối Yêu Thương */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div>
                    <span>🍌 Chuối Yêu Thương check-in trong tháng hoàn tất:</span>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Chỉ đếm chuối nhận từ thiên thần khác lúc check-in trong tháng hoàn tất gần nhất (chuẩn 20
                      chuối/tháng)
                    </p>
                  </div>
                  <span className="font-mono text-amber-500 font-black">{cvToCc.minBananaCount ?? 20} 🍌</span>
                </div>
                <Slider
                  min={5}
                  max={60}
                  step={1}
                  value={cvToCc.minBananaCount ?? 20}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvToCc: { ...cvToCc, minBananaCount: val },
                      cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), minBananaCount: val },
                    })
                  }
                />
              </div>

              {/* 3.4 Chỉ số HI */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1">
                    <span>😊 Chỉ số HI tối thiểu:</span>
                    <span className="text-[10px] font-normal text-slate-400">(Teamwork check-in/out thả tim)</span>
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {(cvToCc.minHappinessIndex * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 mb-1 leading-normal">
                  Tỷ lệ % lượt đồng nghiệp tự thả tim cho nhau khi check-in / check-out ca làm việc trên app WingsBeauty
                  (đo lường sự gắn kết và tinh thần teamwork).
                </p>
                <Slider
                  min={50}
                  max={95}
                  step={1}
                  value={cvToCc.minHappinessIndex * 100}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvToCc: { ...cvToCc, minHappinessIndex: val / 100 },
                      cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), minHappinessIndex: val / 100 },
                    })
                  }
                />
              </div>
            </div>

            {/* NHÓM 4: ẢI TRÙM CUỐI & THỬ THÁCH TỰ TƯ VẤN */}
            <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Flame className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                    4. Ải Trùm Cuối &amp; Thử Thách
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-tight">
                  Ải trùm cuối
                </span>
              </div>

              {/* 4.1 Tỷ lệ tự bán Combo tối thiểu */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Tỷ lệ tự bán Combo tối thiểu (Ải Trùm Cuối):</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-black">
                    {(cvToCc.minSelfComboRate * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  min={5}
                  max={50}
                  step={1}
                  value={cvToCc.minSelfComboRate * 100}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvToCc: { ...cvToCc, minSelfComboRate: val / 100 },
                      cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), minSelfComboRate: val / 100 },
                    })
                  }
                />
              </div>

              {/* 4.2 Số ngày thử thách tự tư vấn */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Số ngày thử thách tự tư vấn:</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-black">
                    {cvToCc.trialDurationDays} ngày
                  </span>
                </div>
                <Slider
                  min={15}
                  max={60}
                  value={cvToCc.trialDurationDays}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvToCc: { ...cvToCc, trialDurationDays: val },
                      cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), trialDurationDays: val },
                    })
                  }
                />
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* TAB 2: CV+ ➔ CV++ (ĐÀN CHỊ SẢNH / SENIOR TECH) */
          /* ========================================================================= */
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Điều chỉnh trực tiếp các tiêu chuẩn thăng cấp <strong>Ải 2: CV+ ➔ CV++ (Đàn Chị Sảnh)</strong>. Đàn Chị
              Sảnh tự chủ tư vấn, giữ vững tỷ lệ combo cao và hỗ trợ tư vấn chéo cho khách của các CV khác.
            </p>

            {/* NHÓM 1: NĂNG SUẤT & KỸ THUẬT CỐT LÕI */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                    1. Năng Suất &amp; Thâm Niên CV+
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-tight">
                  CV++ Benchmarks
                </span>
              </div>

              {/* 1.1 Thâm niên tối thiểu ở vị trí CV+ */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Số tháng tối thiểu ở vị trí CV+:</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-black">
                    {cvPlusToCvPlusPlus.minMonthsInCvPlus ?? 2} tháng
                  </span>
                </div>
                <Slider
                  min={1}
                  max={6}
                  step={1}
                  value={cvPlusToCvPlusPlus.minMonthsInCvPlus ?? 2}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, minMonthsInCvPlus: val },
                    })
                  }
                />
              </div>

              {/* 1.2 Số ca làm tối thiểu trong 3 tháng liền */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Số bộ mi tối thiểu (trong 3 tháng liền):</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-black">
                    {cvPlusToCvPlusPlus.minOrders ?? 350} bộ mi
                  </span>
                </div>
                <Slider
                  min={150}
                  max={600}
                  step={10}
                  value={cvPlusToCvPlusPlus.minOrders ?? 350}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, minOrders: val },
                    })
                  }
                />
              </div>

              {/* 1.3 Tỷ lệ lỗi Fix tối đa */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Tỷ lệ lỗi Fix tối đa:</span>
                  <span className="font-mono text-rose-500 font-black">
                    {((cvPlusToCvPlusPlus.maxFixRate ?? 0.015) * 100).toFixed(1)}%
                  </span>
                </div>
                <Slider
                  min={0.5}
                  max={4}
                  step={0.1}
                  value={(cvPlusToCvPlusPlus.maxFixRate ?? 0.015) * 100}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, maxFixRate: val / 100 },
                    })
                  }
                />
              </div>

              {/* 1.4 % Tip cao hơn trung bình shop */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>% Tip cao hơn trung bình shop:</span>
                  <span className="font-mono text-pink-600 font-black">
                    +{((cvPlusToCvPlusPlus.minTipRatioAboveShop ?? 0.15) * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  min={5}
                  max={35}
                  step={1}
                  value={(cvPlusToCvPlusPlus.minTipRatioAboveShop ?? 0.15) * 100}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, minTipRatioAboveShop: val / 100 },
                    })
                  }
                />
              </div>
            </div>

            {/* NHÓM 2: BÁN HÀNG, HOA HỒNG & TƯ VẤN CHÉO */}
            <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-purple-200/50 dark:border-purple-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                    2. Bán Hàng &amp; Tư Vấn Chéo (CV++)
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-tight">
                  Hoa hồng CV++
                </span>
              </div>

              {/* 2.1 Tỷ lệ tự chốt combo khách mình */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1">
                    <span>🎯</span>
                    <span>Tỷ lệ tự chốt combo tối thiểu trên khách của mình (Chuẩn CV++):</span>
                  </span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-black text-sm">
                    {((cvPlusToCvPlusPlus.minSelfComboRate ?? 0.25) * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  min={5}
                  max={60}
                  step={1}
                  value={Math.round((cvPlusToCvPlusPlus.minSelfComboRate ?? 0.25) * 100)}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, minSelfComboRate: val / 100 },
                    })
                  }
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mt-0.5 italic">
                  * Chuẩn duy trì cho CV++. Nếu chốt dưới tỷ lệ này, hệ thống sẽ kích hoạt chế tài tạm khóa phần phụ cấp
                  lương giờ tăng thêm (+{formatVnd((cvPlusToCvPlusPlus.hourlyWage ?? 29500) - 25500)}/h) và thưởng bán
                  hàng.
                </p>
              </div>

              {/* 2.2 Số gói combo cá nhân dự kiến bán / tháng */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div>
                    <span>🏹 Số gói Combo cá nhân dự kiến / tháng:</span>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Gói 4.5M (+{formatVnd(cvPlusSampleComboBonus)}/combo). Nhận thêm: +{formatVnd(cvPlusComboComm)}
                      /tháng
                    </p>
                  </div>
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-black">
                    {cvPlusCombos} combo
                  </span>
                </div>
                <Slider
                  min={0}
                  max={30}
                  step={1}
                  value={cvPlusCombos}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, expectedCombosPerMonth: val },
                    })
                  }
                />
              </div>

              {/* 2.3 Tư vấn cho CV khác: Nhận 20% Tip */}
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-2.5">
                <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-800/50 pb-1.5">
                  <span className="text-xs font-black text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                    <span>💖</span>
                    <span>Tư vấn cho CV khác: Nhận Tip chéo</span>
                  </span>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                    +{formatVnd(cvPlusCrossTipAmount)}/tháng
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <span>% Tip nhận được khi tư vấn cho CV khác:</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                      {(cvPlusCrossTipRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    min={10}
                    max={40}
                    step={5}
                    value={cvPlusCrossTipRate * 100}
                    onChange={(val) =>
                      onConfigChange({
                        ...config,
                        cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, crossConsultTipRate: val / 100 },
                      })
                    }
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <span>Số ca bán chéo / tư vấn chéo dự kiến / tháng:</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                      {cvPlusCrossOrders} ca/tháng
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={300}
                    step={5}
                    value={cvPlusCrossOrders}
                    onChange={(val) =>
                      onConfigChange({
                        ...config,
                        cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, expectedCrossConsultOrdersPerMonth: val },
                      })
                    }
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mt-0.5 italic">
                    * Đàn Chị Sảnh tư vấn/bán chéo cho khách của CV khác được nhận{' '}
                    {(cvPlusCrossTipRate * 100).toFixed(0)}% tiền tip ({cvPlusCrossOrders} ca × ~40K tip ×{' '}
                    {(cvPlusCrossTipRate * 100).toFixed(0)}% = +{formatVnd(cvPlusCrossTipAmount)}/tháng). Chuyên Viên
                    làm mi vẫn nhận đủ 70% tiền tip!
                  </p>
                </div>
              </div>

              {/* 2.4 Tư vấn chốt combo hộ CV khác & Chia hoa hồng cho CV */}
              <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-3">
                <div className="flex items-center justify-between border-b border-purple-200/60 dark:border-purple-800/50 pb-1.5">
                  <span className="text-xs font-black text-purple-800 dark:text-purple-200 flex items-center gap-1.5">
                    <span>🏹</span>
                    <span>Tư vấn chốt combo hộ CV khác: Tiền tươi bậc thang</span>
                  </span>
                  <span className="text-xs font-black text-purple-600 dark:text-purple-400 tabular-nums">
                    +{formatVnd(cvPlusCrossComboComm)}/tháng
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <span>Số gói Combo tư vấn chéo chốt được / tháng:</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                      {cvPlusCrossCombos} combo/tháng
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={15}
                    step={1}
                    value={cvPlusCrossCombos}
                    onChange={(val) =>
                      onConfigChange({
                        ...config,
                        cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, expectedCrossConsultCombosPerMonth: val },
                      })
                    }
                  />
                </div>

                {/* TỶ LỆ CHIA HOA HỒNG CHO CHUYÊN VIÊN LÀM MI */}
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="text-emerald-700 dark:text-emerald-300">
                      💖 Tỷ lệ chia hoa hồng cho CV làm mi (CV get % of CV++):
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                      {(cvPlusCrossCvShare * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    min={10}
                    max={50}
                    step={5}
                    value={cvPlusCrossCvShare * 100}
                    onChange={(val) =>
                      onConfigChange({
                        ...config,
                        cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, crossConsultCvShareRate: val / 100 },
                      })
                    }
                  />
                  <div className="text-[10px] text-emerald-800 dark:text-emerald-200 space-y-0.5 leading-relaxed">
                    <div>
                      • <strong>Chuyên Viên làm mi được hưởng:</strong> {(cvPlusCrossCvShare * 100).toFixed(0)}% hoa
                      hồng bán combo (+{formatVnd(cvPlusCrossCvSharedAmount)}/tháng) và dưỡng mi (+
                      {formatVnd(Math.round(serumOrigBonus * cvPlusCrossCvShare))}/cây gốc).
                    </div>
                    <div>
                      • <strong>CV++ chốt hộ:</strong> Hưởng trọn 100% tiền thưởng hoa hồng (+
                      {formatVnd(cvPlusCrossComboComm)}/tháng).
                    </div>
                  </div>
                </div>
              </div>

              {/* 2.5 Số cây Dưỡng mi bán dự kiến / tuần */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div>
                    <span>✨ Số cây Dưỡng mi bán dự kiến / tuần (CV++):</span>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Thưởng giá gốc ({formatVnd(cvPlusToCvPlusPlus.serumOriginalPriceBonus ?? 100000)}/cây). Nhận thêm:
                      +{formatVnd(cvPlusSerumMonthly)}/tháng (+
                      {formatVnd(cvPlusSerumWeekly)}/tuần)
                    </p>
                  </div>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {cvPlusSerums} cây/tuần
                  </span>
                </div>
                <Slider
                  min={0}
                  max={20}
                  step={1}
                  value={cvPlusSerums}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, expectedSerumsPerWeek: val },
                    })
                  }
                />
              </div>

              {/* Mini-Summary Box CV++ */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-emerald-500/10 border border-purple-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      Tổng hoa hồng bán hàng &amp; tư vấn chéo CV++
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      Combo ({formatVnd(cvPlusComboComm)}) + Dưỡng mi ({formatVnd(cvPlusSerumMonthly)}) + Tip chéo ( +
                      {formatVnd(cvPlusCrossTipAmount)}) + Combo chéo (+{formatVnd(cvPlusCrossComboComm)})
                    </div>
                  </div>
                </div>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{formatVnd(cvPlusTotalSalesComm)}/tháng
                </span>
              </div>
            </div>

            {/* NHÓM 3: ĐÃI NGỘ LƯƠNG GIỜ & TIP ĐÀN CHỊ */}
            <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                    3. Lương Giờ &amp; Tip Đàn Chị (CV++)
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-tight">
                  Đãi ngộ CV++
                </span>
              </div>

              {/* Lương theo giờ CV++ */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Lương theo giờ CV++ (Gốc CV: 25.500đ/h):</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-black">
                    {formatVnd(cvPlusToCvPlusPlus.hourlyWage ?? 29500)}/h (+
                    {formatVnd((cvPlusToCvPlusPlus.hourlyWage ?? 29500) - 25500)}/h)
                  </span>
                </div>
                <InputNumber
                  className="w-full"
                  value={cvPlusToCvPlusPlus.hourlyWage ?? 29500}
                  step={500}
                  min={25500}
                  max={60000}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '') || 0)}
                  addonAfter="đ/h"
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, hourlyWage: Number(val || 0) },
                    })
                  }
                />
              </div>

              {/* Tỷ lệ tip trên khách của mình */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Tỷ lệ hưởng Tip khách của mình:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {((cvPlusToCvPlusPlus.tipShareRatio ?? 0.9) * 100).toFixed(0)}% (Tự tư vấn + Tự làm mi)
                  </span>
                </div>
                <Slider
                  min={70}
                  max={100}
                  step={5}
                  value={(cvPlusToCvPlusPlus.tipShareRatio ?? 0.9) * 100}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, tipShareRatio: val / 100 },
                    })
                  }
                />
              </div>

              {/* Chế tài bảo vệ chất lượng nếu dưới chuẩn combo CV++ */}
              <div className="p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    <span>
                      Chế tài nếu không đạt tối thiểu {((cvPlusToCvPlusPlus.minSelfComboRate ?? 0.25) * 100).toFixed(0)}
                      % combo:
                    </span>
                  </span>
                  <Switch
                    checked={cvPlusToCvPlusPlus.enforceComboPenalty !== false}
                    onChange={(checked) =>
                      onConfigChange({
                        ...config,
                        cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, enforceComboPenalty: checked },
                      })
                    }
                  />
                </div>
                <div className="text-[10px] text-rose-700 dark:text-rose-300 leading-relaxed">
                  Nếu tỷ lệ chốt combo &lt; {((cvPlusToCvPlusPlus.minSelfComboRate ?? 0.25) * 100).toFixed(0)}%:{' '}
                  <strong>
                    Khóa phần lương tăng thêm (+{formatVnd((cvPlusToCvPlusPlus.hourlyWage ?? 29500) - 25500)}/h)
                  </strong>{' '}
                  và <strong>toàn bộ thưởng bán hàng cá nhân</strong>. Nhân viên chỉ được giữ tip tư vấn!
                </div>
              </div>
            </div>

            {/* NHÓM 4: KỶ LUẬT QA & VĂN HÓA ĐỘI NGŨ */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-emerald-200/50 dark:border-emerald-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                    4. Kỷ Luật QA &amp; Văn Hóa Đội Ngũ
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-tight">
                  Chuẩn mực Đàn Chị
                </span>
              </div>

              {/* 3.1 Kiểm định QA/QC */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div>
                    <span>📋 Kiểm định QA/QC tối thiểu trong tháng hoàn tất:</span>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Số lần kiểm định tác phong &amp; phòng mi trong tháng hoàn tất gần nhất (chuẩn 4 lần = 1
                      lần/tuần).
                    </p>
                  </div>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {cvPlusToCvPlusPlus.minQaAudits ?? 4} lần
                  </span>
                </div>
                <Slider
                  min={0}
                  max={12}
                  step={1}
                  value={cvPlusToCvPlusPlus.minQaAudits ?? 4}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: {
                        ...cvPlusToCvPlusPlus,
                        minQaAudits: val,
                        minWeeklyQaAudits: Number((val / 4).toFixed(2)),
                      },
                    })
                  }
                />
              </div>

              {/* 3.2 Khóa nâng cấp nếu có bài Failed QA/QC */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Khóa nâng cấp nếu có bài Failed QA/QC:
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Đàn Chị gương mẫu: không có bất kỳ bài kiểm tra nào bị Failed
                  </div>
                </div>
                <Switch
                  checked={cvPlusToCvPlusPlus.requireZeroFailedAudits !== false}
                  onChange={(checked) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, requireZeroFailedAudits: checked },
                    })
                  }
                />
              </div>

              {/* 3.3 Chuối Yêu Thương (Check-in tháng hoàn tất) */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div>
                    <span>🍌 Chuối Yêu Thương check-in trong tháng hoàn tất:</span>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Chuối nhận từ thiên thần khác lúc check-in trong tháng hoàn tất gần nhất (chuẩn 25 chuối/tháng cho
                      Đàn Chị)
                    </p>
                  </div>
                  <span className="font-mono text-amber-500 font-black">
                    {cvPlusToCvPlusPlus.minBananaCount ?? 25} 🍌
                  </span>
                </div>
                <Slider
                  min={5}
                  max={60}
                  step={1}
                  value={cvPlusToCvPlusPlus.minBananaCount ?? 25}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, minBananaCount: val },
                    })
                  }
                />
              </div>

              {/* 3.4 Chỉ số HI (Đồng đội tin yêu) */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1">
                    <span>😊 Chỉ số HI tối thiểu:</span>
                    <span className="text-[10px] font-normal text-slate-400">(Đồng đội tin yêu &amp; quý mến)</span>
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {((cvPlusToCvPlusPlus.minHappinessIndex ?? 0.8) * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 mb-1 leading-normal">
                  Đàn chị sảnh gương mẫu: Yêu cầu đạt tỷ lệ đồng đội tin yêu, hỗ trợ và tự thả tim nhau ≥ 80% khi
                  check-in / check-out.
                </p>
                <Slider
                  min={50}
                  max={95}
                  step={1}
                  value={(cvPlusToCvPlusPlus.minHappinessIndex ?? 0.8) * 100}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, minHappinessIndex: val / 100 },
                    })
                  }
                />
              </div>
            </div>

            {/* NHÓM 4: ẢI TRÙM CUỐI & THỬ THÁCH DUY TRÌ */}
            <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Flame className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                    4. Ải Thử Thách &amp; Duy Trì Hiệu Suất
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-tight">
                  Thử thách CV++
                </span>
              </div>

              {/* 4.1 Số ngày thử thách duy trì */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Số ngày thử thách tự tư vấn &amp; dẫn dắt:</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-black">
                    {cvPlusToCvPlusPlus.trialDurationDays ?? 30} ngày
                  </span>
                </div>
                <Slider
                  min={15}
                  max={60}
                  value={cvPlusToCvPlusPlus.trialDurationDays ?? 30}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, trialDurationDays: val },
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STICKY FOOTER */}
      <div className="sticky bottom-0 -mx-6 -mb-6 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-between z-20 shadow-lg">
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          Đang cấu hình:{' '}
          <strong className="text-slate-700 dark:text-slate-200">
            {activeTab === 'CV_TO_CV_PLUS' ? 'Ải CV ➔ CV+' : 'Ải CV+ ➔ CV++'}
          </strong>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Hủy
          </button>
          <button
            disabled={saving}
            onClick={handleSaveAll}
            className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/30 hover:opacity-95 active:scale-95 transition disabled:opacity-50"
          >
            {saving ? 'Đang Lưu...' : 'Lưu Cấu Hình Mới'}
          </button>
        </div>
      </div>
    </AdaptiveDrawer>
  );
}

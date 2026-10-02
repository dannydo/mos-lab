'use client';

import React from 'react';
import { Slider, Switch, Segmented } from 'antd';
import { Target, Sparkles, ShieldCheck, Flame, DollarSign, Crown } from 'lucide-react';
import type { CareerProgressionConfig } from '@mos-lab/shared';
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
  };

  const formatVnd = (num?: number | null) => {
    if (!num) return '0đ';
    return `${num.toLocaleString('vi-VN')}đ`;
  };

  // Tab 1 calculations (CV -> CV+)
  const combosPerMonth = cvToCc.expectedCombosPerMonth ?? 6;
  const serumsPerWeek = cvToCc.expectedSerumsPerWeek ?? 4;
  const comboCommissionEstimated = combosPerMonth * 4500000 * 0.025;
  const serumCommissionWeekly = serumsPerWeek * 110000;
  const serumCommissionMonthly = serumCommissionWeekly * 4;
  const totalSalesCommissionMonthly = comboCommissionEstimated + serumCommissionMonthly;

  // Tab 2 calculations (CV+ -> CV++)
  const cvPlusCombos = cvPlusToCvPlusPlus.expectedCombosPerMonth ?? 10;
  const cvPlusSerums = cvPlusToCvPlusPlus.expectedSerumsPerWeek ?? 4;
  const cvPlusCrossRate = cvPlusToCvPlusPlus.crossConsultCommissionRate ?? 0.025;
  const cvPlusCrossTipRate = cvPlusToCvPlusPlus.crossConsultTipRate ?? 0.2;
  const cvPlusCrossOrders = cvPlusToCvPlusPlus.expectedCrossConsultOrdersPerMonth ?? 20;
  const cvPlusCrossCombos = cvPlusToCvPlusPlus.expectedCrossConsultCombosPerMonth ?? 4;

  const cvPlusComboComm = cvPlusCombos * 4500000 * 0.025;
  const cvPlusSerumWeekly = cvPlusSerums * 110000;
  const cvPlusSerumMonthly = cvPlusSerumWeekly * 4;
  // CV++ tư vấn cho CV khác: Nhận 20% tip + Thêm tiền bán combo
  const cvPlusCrossTipAmount = Math.round(cvPlusCrossOrders * 40000 * cvPlusCrossTipRate);
  const cvPlusCrossComboComm = Math.round(cvPlusCrossCombos * 4500000 * cvPlusCrossRate);
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
                    <span>Ải 1: CV ➔ CV+ (Thợ Tự Chủ)</span>
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
          /* TAB 1: CV ➔ CV+ (THỢ TỰ CHỦ) */
          /* ========================================================================= */
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Điều chỉnh trực tiếp các tiêu chuẩn thăng cấp <strong>Ải 1: CV ➔ CV+ (Thợ Tự Chủ)</strong>. Sau khi lưu,
              toàn bộ hệ thống web và mobile sẽ áp dụng tức thì.
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

            {/* NHÓM 2: DỰ KIẾN BÁN HÀNG & HOA HỒNG THÁNG */}
            <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-purple-200/50 dark:border-purple-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                    2. Bán Hàng &amp; Doanh Thu Tháng
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-tight">
                  Hoa hồng
                </span>
              </div>

              {/* 2.1 Số gói Combo bán dự kiến / tháng */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div>
                    <span>🏹 Số gói Combo bán dự kiến / tháng:</span>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Hoa hồng 2.5% (TB 4.5M/combo = ~112.500đ/gói). Nhận thêm: +{formatVnd(comboCommissionEstimated)}
                      /tháng
                    </p>
                  </div>
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-black">
                    {combosPerMonth} combo
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
              </div>

              {/* 2.2 Số cây Dưỡng mi bán dự kiến / tuần */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div>
                    <span>✨ Số cây Dưỡng mi bán dự kiến / tuần:</span>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Thưởng 10% (110.000đ/cây). Nhận thêm: +{formatVnd(serumCommissionMonthly)}/tháng (+
                      {formatVnd(serumCommissionWeekly)}/tuần)
                    </p>
                  </div>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {serumsPerWeek} cây/tuần
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
              </div>

              {/* Mini-Summary Box */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-emerald-500/10 border border-purple-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      Tổng hoa hồng bán hàng dự kiến
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

            {/* NHÓM 3: KỶ LUẬT QA & VĂN HÓA ĐỘI NGŨ */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-emerald-200/50 dark:border-emerald-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                    3. Kỷ Luật QA &amp; Văn Hóa Đội Ngũ
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
                    <span>📋 Kiểm định QA/QC tối thiểu trong 3 tháng:</span>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Tối thiểu số lần được QA/QC kiểm định tác phong &amp; phòng mi trong 90 ngày (chuẩn 12 lần = 1
                      lần/tuần).
                    </p>
                  </div>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {cvToCc.minQaAudits ?? 12} lần
                  </span>
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

              {/* 3.4 Chỉ số HI */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>😊 Chỉ số HI tối thiểu (Check-in thả tim):</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {(cvToCc.minHappinessIndex * 100).toFixed(0)}%
                  </span>
                </div>
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
            <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-purple-200/50 dark:border-purple-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                    2. Bán Hàng &amp; Tư Vấn Chéo
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-tight">
                  Hoa hồng CV++
                </span>
              </div>

              {/* 2.1 Tỷ lệ tự chốt combo khách mình */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>Tỷ lệ tự chốt combo trên khách của mình:</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-black">
                    {((cvPlusToCvPlusPlus.minSelfComboRate ?? 0.3) * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  min={15}
                  max={60}
                  step={1}
                  value={(cvPlusToCvPlusPlus.minSelfComboRate ?? 0.3) * 100}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, minSelfComboRate: val / 100 },
                    })
                  }
                />
              </div>

              {/* 2.2 Số gói combo dự kiến bán / tháng */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div>
                    <span>🏹 Số gói Combo bán dự kiến / tháng:</span>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Hoa hồng 2.5% (TB 4.5M/combo = ~112.500đ/gói). Nhận thêm: +{formatVnd(cvPlusComboComm)}/tháng
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
                    <span>Tư vấn cho CV khác: Nhận 20% Tip</span>
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
                    * Đàn Chị Sảnh tư vấn/bán chéo cho khách của CV khác được nhận 20% tiền tip của ca đó (
                    {cvPlusCrossOrders} ca × ~40K tip × 20% = +{formatVnd(cvPlusCrossTipAmount)}/tháng).
                  </p>
                </div>
              </div>

              {/* 2.4 Tư vấn cho CV khác: Thêm tiền bán combo */}
              <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-2.5">
                <div className="flex items-center justify-between border-b border-purple-200/60 dark:border-purple-800/50 pb-1.5">
                  <span className="text-xs font-black text-purple-800 dark:text-purple-200 flex items-center gap-1.5">
                    <span>🏹</span>
                    <span>Tư vấn cho CV khác: Thêm tiền bán combo</span>
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

                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <span>% Hoa hồng chốt combo chéo hộ CV khác:</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                      {(cvPlusCrossRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={5}
                    step={0.5}
                    value={cvPlusCrossRate * 100}
                    onChange={(val) =>
                      onConfigChange({
                        ...config,
                        cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, crossConsultCommissionRate: val / 100 },
                      })
                    }
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mt-0.5 italic">
                    * Khi chốt combo cho khách của CV khác, nhận thêm hoa hồng ({cvPlusCrossCombos} combo × 4.5M ×{' '}
                    {(cvPlusCrossRate * 100).toFixed(1)}% = +{formatVnd(cvPlusCrossComboComm)}/tháng).
                  </p>
                </div>
              </div>

              {/* 2.5 Số cây Dưỡng mi bán dự kiến / tuần */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div>
                    <span>✨ Số cây Dưỡng mi bán dự kiến / tuần:</span>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Thưởng 10% (110.000đ/cây). Nhận thêm: +{formatVnd(cvPlusSerumMonthly)}/tháng (+
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
                      Combo ({formatVnd(cvPlusComboComm)}) + Dưỡng mi ({formatVnd(cvPlusSerumMonthly)}) + 20% Tip chéo (
                      {formatVnd(cvPlusCrossTipAmount)}) + Combo chéo ({formatVnd(cvPlusCrossComboComm)})
                    </div>
                  </div>
                </div>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{formatVnd(cvPlusTotalSalesComm)}/tháng
                </span>
              </div>
            </div>

            {/* NHÓM 3: KỶ LUẬT QA & VĂN HÓA ĐỘI NGŨ */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-emerald-200/50 dark:border-emerald-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                    3. Kỷ Luật QA &amp; Văn Hóa Đội Ngũ
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
                    <span>📋 Kiểm định QA/QC tối thiểu trong 3 tháng:</span>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Số lần kiểm định tác phong &amp; phòng mi trong 90 ngày (chuẩn 12 lần = 1 lần/tuần).
                    </p>
                  </div>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {cvPlusToCvPlusPlus.minQaAudits ?? 12} lần
                  </span>
                </div>
                <Slider
                  min={0}
                  max={24}
                  step={1}
                  value={cvPlusToCvPlusPlus.minQaAudits ?? 12}
                  onChange={(val) =>
                    onConfigChange({
                      ...config,
                      cvPlusToCvPlusPlus: {
                        ...cvPlusToCvPlusPlus,
                        minQaAudits: val,
                        minWeeklyQaAudits: Number((val / 12).toFixed(2)),
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

              {/* 3.3 Chuối Yêu Thương (Check-in 90N) */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div>
                    <span>🍌 Chuối Yêu Thương check-in (20*3 = 60 / 90N):</span>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Chuối nhận từ thiên thần khác lúc check-in trong 90 ngày (chuẩn 20 chuối/tháng cho Đàn Chị)
                    </p>
                  </div>
                  <span className="font-mono text-amber-500 font-black">
                    {cvPlusToCvPlusPlus.minBananaCount ?? 60} 🍌
                  </span>
                </div>
                <Slider
                  min={10}
                  max={150}
                  step={5}
                  value={cvPlusToCvPlusPlus.minBananaCount ?? 60}
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
                  <span>😊 Chỉ số HI tối thiểu (Đồng đội tin yêu &amp; quý mến):</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {((cvPlusToCvPlusPlus.minHappinessIndex ?? 0.8) * 100).toFixed(0)}%
                  </span>
                </div>
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

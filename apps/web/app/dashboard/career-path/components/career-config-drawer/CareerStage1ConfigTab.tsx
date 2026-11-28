'use client';

import React from 'react';
import { Target, Sparkles, ShieldCheck, Flame, DollarSign, HandCoins } from 'lucide-react';
import { DEFAULT_COMBO_MIN_COLLECTED_AMOUNT, type CareerProgressionConfig } from '@mos-lab/shared';
import { calculateComboBonus } from '../../career-path.constants';
import {
  type CvToCcConfig,
  type Stage1SalesSummary,
  formatVnd,
  patchStage1Config,
} from './careerConfigTypesAndHelpers';
import {
  CareerConfigComboPenaltyBox,
  CareerConfigDebtBonusBox,
  CareerConfigSectionCard,
  CareerConfigSliderField,
  CareerConfigSwitchCard,
  CareerConfigVndInputField,
  CvlBadge,
} from './CareerConfigFieldPrimitives';

interface CareerStage1ConfigTabProps {
  config: CareerProgressionConfig;
  cvToCc: CvToCcConfig;
  summary: Stage1SalesSummary;
  onConfigChange: (nextConfig: CareerProgressionConfig) => void;
}

export function CareerStage1ConfigTab({ config, cvToCc, summary, onConfigChange }: CareerStage1ConfigTabProps) {
  const updateStage1 = (patch: Partial<CvToCcConfig>) => {
    onConfigChange(patchStage1Config(config, cvToCc, patch));
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
        Điều chỉnh trực tiếp các tiêu chuẩn thăng cấp{' '}
        <strong className="inline-flex items-center gap-1">
          <span>Ải 1: CV ➔</span>
          <CvlBadge />
        </strong>
        . Sau khi lưu, toàn bộ hệ thống web và mobile sẽ áp dụng tức thì.
      </p>

      {/* NHÓM 1: NĂNG SUẤT & KỸ THUẬT CỐT LÕI */}
      <CareerConfigSectionCard
        tone="slate"
        badgeTone="blue"
        icon={<Target className="w-3.5 h-3.5" />}
        title="1. Năng Suất & Kỹ Thuật"
        badge="Kỹ thuật"
      >
        <CareerConfigSliderField
          label="Số bộ mi tối thiểu (trong 3 tháng liền):"
          valueDisplay={`${cvToCc.minOrders} bộ mi`}
          valueClassName="font-mono text-blue-600 dark:text-blue-400 font-black"
          min={100}
          max={600}
          step={10}
          value={cvToCc.minOrders}
          onChange={(val) => updateStage1({ minOrders: val })}
        />

        <CareerConfigSliderField
          label="Tỷ lệ lỗi Fix tối đa:"
          valueDisplay={`${(cvToCc.maxFixRate * 100).toFixed(1)}%`}
          valueClassName="font-mono text-rose-500 font-black"
          min={0.5}
          max={5}
          step={0.1}
          value={cvToCc.maxFixRate * 100}
          onChange={(val) => updateStage1({ maxFixRate: val / 100 })}
        />

        <CareerConfigSliderField
          label="% Tip cao hơn trung bình shop:"
          valueDisplay={`+${(cvToCc.minTipRatioAboveShop * 100).toFixed(0)}%`}
          valueClassName="font-mono text-pink-600 font-black"
          min={0}
          max={30}
          step={1}
          value={cvToCc.minTipRatioAboveShop * 100}
          onChange={(val) => updateStage1({ minTipRatioAboveShop: val / 100 })}
        />
      </CareerConfigSectionCard>

      {/* NHÓM 2: DỰ KIẾN BÁN HÀNG & HOA HỒNG THỰC CHIẾN */}
      <CareerConfigSectionCard
        tone="purple"
        badgeTone="purple"
        icon={<Sparkles className="w-3.5 h-3.5" />}
        title="2. Bán Hàng: Tiền Tươi Theo Món & Bậc Thang"
        badge="Tiền tươi theo món"
      >
        {/* 2.1 CẤU HÌNH THƯỞNG DƯỠNG MI YEPPEUM */}
        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/50 pb-1.5">
            <span className="text-xs font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
              <span>✨</span>
              <span>Thưởng Bán Cây Dưỡng Mi Yeppeum</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              Nhận: +{formatVnd(summary.serumCommissionMonthly)}/tháng
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <CareerConfigVndInputField
              label="Giá Gốc (1.1M):"
              value={cvToCc.serumOriginalPriceBonus ?? 100000}
              step={10000}
              min={0}
              onChange={(val) => updateStage1({ serumOriginalPriceBonus: val })}
            />
            <CareerConfigVndInputField
              label="Giảm giá < 50%:"
              value={cvToCc.serumDiscountedPriceBonus ?? 50000}
              step={5000}
              min={0}
              onChange={(val) => updateStage1({ serumDiscountedPriceBonus: val })}
            />
            <CareerConfigVndInputField
              label="Giảm sâu ≥ 50% (≤ 550k):"
              value={cvToCc.serumDeepDiscountPriceBonus ?? 10000}
              step={1000}
              min={0}
              onChange={(val) => updateStage1({ serumDeepDiscountPriceBonus: val })}
            />
            <CareerConfigVndInputField
              label="Tặng kèm Free (0đ):"
              value={cvToCc.serumFreePriceBonus ?? 1000}
              step={500}
              min={0}
              onChange={(val) => updateStage1({ serumFreePriceBonus: val })}
            />
          </div>

          <CareerConfigSliderField
            label="Số cây dưỡng mi dự kiến / tuần:"
            valueDisplay={`${summary.serumsPerWeek} cây/tuần (+${formatVnd(summary.serumCommissionWeekly)}/tuần)`}
            valueClassName="font-mono text-emerald-600 dark:text-emerald-400 font-black"
            min={0}
            max={20}
            step={1}
            value={summary.serumsPerWeek}
            onChange={(val) => updateStage1({ expectedSerumsPerWeek: val })}
            footnote={
              <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mt-0.5 italic">
                * Bán giá gốc nhận 100K, giảm giá nhận 50K, giảm sâu ≥ 50% nhận 10K, tặng kèm Free nhận 1K. Dự kiến{' '}
                {summary.serumsPerWeek} cây giá gốc = +{formatVnd(summary.serumCommissionMonthly)}/tháng.
              </p>
            }
          />
        </div>

        {/* 2.2 CẤU HÌNH THƯỞNG COMBO TỐI GIẢN */}
        <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-3">
          <div className="flex items-center justify-between border-b border-purple-200/60 dark:border-purple-800/50 pb-1.5">
            <span className="text-xs font-black text-purple-800 dark:text-purple-200 flex items-center gap-1.5">
              <span>🏹</span>
              <span>Thưởng Hoa Hồng Combo Nối Mi (Công Thức Tối Giản)</span>
            </span>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 tabular-nums">
              Đơn 4.5M: +{formatVnd(summary.sampleComboBonus)}/đơn
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <CareerConfigVndInputField
              label="Thực thu tối thiểu:"
              value={cvToCc.comboMinCollectedAmount ?? DEFAULT_COMBO_MIN_COLLECTED_AMOUNT}
              step={50000}
              min={0}
              onChange={(val) => updateStage1({ comboMinCollectedAmount: val })}
            />
            <CareerConfigVndInputField
              label="Từ ngưỡng – < 2 Triệu:"
              value={cvToCc.comboUnder2mBonus ?? 50000}
              step={5000}
              min={0}
              onChange={(val) => updateStage1({ comboUnder2mBonus: val })}
            />
            <CareerConfigVndInputField
              label="Mỗi 1 Triệu kế tiếp (từ 2M):"
              value={cvToCc.comboStepPerMillionBonus ?? 50000}
              step={5000}
              min={0}
              onChange={(val) => updateStage1({ comboStepPerMillionBonus: val })}
            />
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 leading-relaxed tabular-nums">
            * Công thức: Tối thiểu thu {formatVnd(cvToCc.comboMinCollectedAmount ?? DEFAULT_COMBO_MIN_COLLECTED_AMOUNT)}{' '}
            • Từ ngưỡng–&lt;2M = +{formatVnd(cvToCc.comboUnder2mBonus ?? 50000)} • 2M–&lt;3M = +
            {formatVnd(calculateComboBonus(2000000, cvToCc))} • 3M–&lt;4M = +
            {formatVnd(calculateComboBonus(3000000, cvToCc))} • 4M–&lt;5M = +
            {formatVnd(calculateComboBonus(4000000, cvToCc))}. Nếu khách mua 2 gói Combo cùng 1 lúc trong 1 đơn, cộng
            gộp tổng tiền lại rồi tính thưởng.
          </p>

          <CareerConfigDebtBonusBox
            mode={cvToCc.comboDebtBonusMode ?? 'TIER_LADDER'}
            rate={cvToCc.comboDebtBonusRate ?? 0.015}
            comboUnder2mBonus={cvToCc.comboUnder2mBonus ?? 50000}
            comboStepPerMillionBonus={cvToCc.comboStepPerMillionBonus ?? 50000}
            comboMinCollectedAmount={cvToCc.comboMinCollectedAmount ?? DEFAULT_COMBO_MIN_COLLECTED_AMOUNT}
            onChangeMode={(mode) => updateStage1({ comboDebtBonusMode: mode })}
            onChangeRate={(rate) => updateStage1({ comboDebtBonusRate: rate })}
          />

          <CareerConfigSliderField
            label="Số gói combo cá nhân dự kiến / tháng:"
            valueDisplay={`${summary.combosPerMonth} combo (+${formatVnd(summary.comboCommissionEstimated)}/tháng)`}
            valueClassName="font-mono text-purple-600 dark:text-purple-400 font-black"
            min={0}
            max={30}
            step={1}
            value={summary.combosPerMonth}
            onChange={(val) => updateStage1({ expectedCombosPerMonth: val })}
            footnote={
              <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mt-0.5 italic">
                * Gói trung bình 4.5M được thưởng {formatVnd(summary.sampleComboBonus)}/combo. Bán{' '}
                {summary.combosPerMonth} combo = +{formatVnd(summary.comboCommissionEstimated)}/tháng.
              </p>
            }
          />

          {/* 2.3 TỶ LỆ CHỐT COMBO TỰ THÂN TỐI THIỂU (CHUẨN CVL) */}
          <div className="pt-2.5 border-t border-purple-200/60 dark:border-purple-800/50">
            <CareerConfigSliderField
              label={
                <span className="flex items-center gap-1">
                  <span>🎯</span>
                  <span className="inline-flex items-center gap-1">
                    <span>Tỷ lệ tự chốt combo tối thiểu (Chuẩn</span>
                    <CvlBadge />
                    <span>):</span>
                  </span>
                </span>
              }
              valueDisplay={`${((cvToCc.minSelfComboRate ?? 0.21) * 100).toFixed(0)}%`}
              valueClassName="font-mono text-purple-600 dark:text-purple-400 font-black text-sm"
              min={5}
              max={50}
              step={1}
              value={Math.round((cvToCc.minSelfComboRate ?? 0.21) * 100)}
              onChange={(val) => updateStage1({ minSelfComboRate: val / 100 })}
              footnote={
                <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mt-0.5 italic">
                  * Chuẩn tỷ lệ chốt combo tối thiểu trên tệp khách tiềm năng. Nếu Chuyên Viên đạt dưới mức này, chế tài
                  doanh nghiệp sẽ tạm khóa phần lương giờ tăng thêm (+2.000đ/h) và thưởng bán hàng.
                </p>
              }
            />
          </div>
        </div>

        {/* Mini-Summary Box */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-emerald-500/10 border border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1">
                <span>Tổng hoa hồng bán hàng dự kiến (</span>
                <CvlBadge />
                <span>)</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                Combo ({formatVnd(summary.comboCommissionEstimated)}) + Dưỡng mi (
                {formatVnd(summary.serumCommissionMonthly)})
              </div>
            </div>
          </div>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{formatVnd(summary.totalSalesCommissionMonthly)}/tháng
          </span>
        </div>
      </CareerConfigSectionCard>

      {/* NHÓM 3: ĐÃI NGỘ LƯƠNG GIỜ, TIP & CHẾ TÀI 20% COMBO */}
      <CareerConfigSectionCard
        tone="amber"
        badgeTone="amber"
        icon={<HandCoins className="w-3.5 h-3.5" />}
        title={`3. Lương Giờ, Tip & Chế Tài ${((cvToCc.minSelfComboRate ?? 0.2) * 100).toFixed(0)}% Combo`}
        badge={
          <span className="inline-flex items-center gap-1">
            <span>Đãi ngộ</span>
            <CvlBadge />
          </span>
        }
      >
        <CareerConfigVndInputField
          label={
            <span className="inline-flex items-center gap-1">
              <span>Lương theo giờ</span>
              <CvlBadge />
              <span>(Gốc CV: 25.500đ/h):</span>
            </span>
          }
          headerValue={`${formatVnd(cvToCc.hourlyWage ?? 27500)}/h (+${formatVnd((cvToCc.hourlyWage ?? 27500) - 25500)}/h)`}
          value={cvToCc.hourlyWage ?? 27500}
          step={500}
          min={25500}
          max={50000}
          addonAfter="đ/h"
          onChange={(val) => updateStage1({ hourlyWage: val })}
        />

        <CareerConfigSliderField
          label="Tỷ lệ hưởng Tip khi tự tư vấn & làm mi:"
          valueDisplay={`${((cvToCc.tipShareRatio ?? 0.9) * 100).toFixed(0)}% (70% Mi + 20% Tư vấn)`}
          valueClassName="font-mono text-emerald-600 dark:text-emerald-400 font-black"
          min={70}
          max={100}
          step={5}
          value={(cvToCc.tipShareRatio ?? 0.9) * 100}
          onChange={(val) => updateStage1({ tipShareRatio: val / 100 })}
        />

        <CareerConfigComboPenaltyBox
          minComboPercent={((cvToCc.minSelfComboRate ?? 0.2) * 100).toFixed(0)}
          checked={cvToCc.enforceComboPenalty !== false}
          onChange={(checked) => updateStage1({ enforceComboPenalty: checked })}
          description={
            <>
              Nếu tỷ lệ chốt combo &lt; {((cvToCc.minSelfComboRate ?? 0.2) * 100).toFixed(0)}%:{' '}
              <strong>Khóa phần lương tăng thêm (+{formatVnd((cvToCc.hourlyWage ?? 27500) - 25500)}/h)</strong> và{' '}
              <strong>toàn bộ thưởng bán hàng (combo/dưỡng mi)</strong>. Chỉ được giữ lại 20% tip tư vấn!
            </>
          }
        />
      </CareerConfigSectionCard>

      {/* NHÓM 4: KỶ LUẬT QA & VĂN HÓA ĐỘI NGŨ */}
      <CareerConfigSectionCard
        tone="emerald"
        badgeTone="emerald"
        icon={<ShieldCheck className="w-3.5 h-3.5" />}
        title="4. Kỷ Luật QA & Văn Hóa Đội Ngũ"
        badge="Kỷ luật & Văn hóa"
      >
        <CareerConfigSliderField
          label={<span>📋 Kiểm định QA/QC tối thiểu trong tháng hoàn tất:</span>}
          labelDescription="Tối thiểu số lần được QA/QC kiểm định tác phong & phòng mi trong tháng hoàn tất gần nhất (chuẩn 4 lần = 1 lần/tuần)."
          valueDisplay={`${cvToCc.minQaAudits ?? 4} lần`}
          valueClassName="font-mono text-emerald-600 dark:text-emerald-400 font-black"
          min={0}
          max={12}
          step={1}
          value={cvToCc.minQaAudits ?? 4}
          onChange={(val) => updateStage1({ minQaAudits: val, minWeeklyQaAudits: Number((val / 4).toFixed(2)) })}
        />

        <CareerConfigSwitchCard
          title="Khóa nâng cấp nếu có bài Failed QA/QC:"
          description="Nếu bị 1 biên bản hoặc bài kiểm tra không đạt ➔ Bị đóng băng thăng cấp"
          checked={cvToCc.requireZeroFailedAudits !== false}
          onChange={(checked) => updateStage1({ requireZeroFailedAudits: checked })}
        />

        <CareerConfigSliderField
          label={<span>🍌 Chuối Yêu Thương check-in trong tháng hoàn tất:</span>}
          labelDescription="Chỉ đếm chuối nhận từ thiên thần khác lúc check-in trong tháng hoàn tất gần nhất (chuẩn 20 chuối/tháng)"
          valueDisplay={`${cvToCc.minBananaCount ?? 20} 🍌`}
          valueClassName="font-mono text-amber-500 font-black"
          min={5}
          max={60}
          step={1}
          value={cvToCc.minBananaCount ?? 20}
          onChange={(val) => updateStage1({ minBananaCount: val })}
        />

        <CareerConfigSliderField
          label={
            <span className="flex items-center gap-1">
              <span>😊 Chỉ số HI tối thiểu:</span>
              <span className="text-[10px] font-normal text-slate-400">(Teamwork check-in/out thả tim)</span>
            </span>
          }
          preSliderNote={
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 mb-1 leading-normal">
              Tỷ lệ % lượt đồng nghiệp tự thả tim cho nhau khi check-in / check-out ca làm việc trên app WingsBeauty (đo
              lường sự gắn kết và tinh thần teamwork).
            </p>
          }
          valueDisplay={`${(cvToCc.minHappinessIndex * 100).toFixed(0)}%`}
          valueClassName="font-mono text-emerald-600 dark:text-emerald-400 font-black"
          min={50}
          max={95}
          step={1}
          value={cvToCc.minHappinessIndex * 100}
          onChange={(val) => updateStage1({ minHappinessIndex: val / 100 })}
        />
      </CareerConfigSectionCard>

      {/* NHÓM 4 (ẢI TRÙM CUỐI & THỬ THÁCH TỰ TƯ VẤN) */}
      <CareerConfigSectionCard
        tone="amber"
        badgeTone="amber"
        icon={<Flame className="w-3.5 h-3.5" />}
        title="4. Ải Trùm Cuối & Thử Thách"
        badge="Ải trùm cuối"
      >
        <CareerConfigSliderField
          label="Tỷ lệ tự bán Combo tối thiểu (Ải Trùm Cuối):"
          valueDisplay={`${(cvToCc.minSelfComboRate * 100).toFixed(0)}%`}
          valueClassName="font-mono text-amber-600 dark:text-amber-400 font-black"
          min={5}
          max={50}
          step={1}
          value={cvToCc.minSelfComboRate * 100}
          onChange={(val) => updateStage1({ minSelfComboRate: val / 100 })}
        />

        <CareerConfigSliderField
          label="Số ngày thử thách tự tư vấn:"
          valueDisplay={`${cvToCc.trialDurationDays} ngày`}
          valueClassName="font-mono text-amber-600 dark:text-amber-400 font-black"
          min={15}
          max={60}
          value={cvToCc.trialDurationDays}
          onChange={(val) => updateStage1({ trialDurationDays: val })}
        />
      </CareerConfigSectionCard>
    </div>
  );
}

'use client';

import React from 'react';
import { Target, Sparkles, ShieldCheck, Flame, DollarSign, HandCoins } from 'lucide-react';
import { DEFAULT_COMBO_MIN_COLLECTED_AMOUNT, type CareerProgressionConfig } from '@mos-lab/shared';
import {
  type CvPlusToCvPlusPlusConfig,
  type Stage2SalesSummary,
  formatVnd,
  patchStage2Config,
} from './careerConfigTypesAndHelpers';
import {
  CareerConfigComboPenaltyBox,
  CareerConfigDebtBonusBox,
  CareerConfigSectionCard,
  CareerConfigSliderField,
  CareerConfigSwitchCard,
  CareerConfigVndInputField,
  CvlBadge,
  CvllBadge,
} from './CareerConfigFieldPrimitives';

interface CareerStage2ConfigTabProps {
  config: CareerProgressionConfig;
  cvPlusToCvPlusPlus: CvPlusToCvPlusPlusConfig;
  summary: Stage2SalesSummary;
  stage1SerumOriginalPriceBonus: number;
  onConfigChange: (nextConfig: CareerProgressionConfig) => void;
}

export function CareerStage2ConfigTab({
  config,
  cvPlusToCvPlusPlus,
  summary,
  stage1SerumOriginalPriceBonus,
  onConfigChange,
}: CareerStage2ConfigTabProps) {
  const updateStage2 = (patch: Partial<CvPlusToCvPlusPlusConfig>) => {
    onConfigChange(patchStage2Config(config, cvPlusToCvPlusPlus, patch));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
          Điều chỉnh trực tiếp các tiêu chuẩn thăng cấp{' '}
          <strong className="inline-flex items-center gap-1">
            <span>Ải 2:</span>
            <CvlBadge />
            <span>➔</span>
            <CvllBadge />
            <span>(Chuyên Viên Tự Chủ Cấp Cao)</span>
          </strong>
          . Tư vấn hỗ trợ chéo 100/0 cho CV &amp; CVL khác khi cần thiết.
        </p>
        <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          ⚡ Mọi chỉ số điều chỉnh &amp; lưu tại đây tự động đồng bộ trực tiếp vào Kinh Thánh mOS (CV-002 &amp; CV-004).
        </div>
      </div>

      {/* NHÓM 1: NĂNG SUẤT & KỸ THUẬT CỐT LÕI */}
      <CareerConfigSectionCard
        tone="slate"
        iconTone="blue"
        badgeTone="amber"
        icon={<Target className="w-3.5 h-3.5" />}
        title={
          <span className="inline-flex items-center gap-1">
            <span>1. Năng Suất &amp; Thâm Niên</span>
            <CvlBadge />
          </span>
        }
        badge={
          <>
            <CvllBadge />
            <span>Benchmarks</span>
          </>
        }
      >
        <CareerConfigSliderField
          label={
            <span className="inline-flex items-center gap-1">
              <span>Số tháng tối thiểu ở vị trí</span>
              <CvlBadge />
              <span>:</span>
            </span>
          }
          valueDisplay={`${cvPlusToCvPlusPlus.minMonthsInCvPlus ?? 2} tháng`}
          valueClassName="font-mono text-amber-600 dark:text-amber-400 font-black"
          min={1}
          max={6}
          step={1}
          value={cvPlusToCvPlusPlus.minMonthsInCvPlus ?? 2}
          onChange={(val) => updateStage2({ minMonthsInCvPlus: val })}
        />

        <CareerConfigSliderField
          label="Số bộ mi tối thiểu (trong 3 tháng liền):"
          valueDisplay={`${cvPlusToCvPlusPlus.minOrders ?? 330} bộ mi`}
          valueClassName="font-mono text-blue-600 dark:text-blue-400 font-black"
          min={150}
          max={600}
          step={10}
          value={cvPlusToCvPlusPlus.minOrders ?? 330}
          onChange={(val) => updateStage2({ minOrders: val })}
        />

        <CareerConfigSliderField
          label="Tỷ lệ lỗi Fix tối đa:"
          valueDisplay={`${((cvPlusToCvPlusPlus.maxFixRate ?? 0.015) * 100).toFixed(1)}%`}
          valueClassName="font-mono text-rose-500 font-black"
          min={0.5}
          max={4}
          step={0.1}
          value={(cvPlusToCvPlusPlus.maxFixRate ?? 0.015) * 100}
          onChange={(val) => updateStage2({ maxFixRate: val / 100 })}
        />

        <CareerConfigSliderField
          label="% Tip cao hơn trung bình shop:"
          valueDisplay={`+${((cvPlusToCvPlusPlus.minTipRatioAboveShop ?? 0.05) * 100).toFixed(0)}%`}
          valueClassName="font-mono text-pink-600 font-black"
          min={0}
          max={35}
          step={1}
          value={(cvPlusToCvPlusPlus.minTipRatioAboveShop ?? 0.05) * 100}
          onChange={(val) => updateStage2({ minTipRatioAboveShop: val / 100 })}
        />
      </CareerConfigSectionCard>

      {/* NHÓM 2: BÁN HÀNG, HOA HỒNG & TƯ VẤN CHÉO */}
      <CareerConfigSectionCard
        tone="purple"
        badgeTone="purple"
        icon={<Sparkles className="w-3.5 h-3.5" />}
        title={
          <span className="inline-flex items-center gap-1">
            <span>2. Bán Hàng &amp; Tư Vấn Chéo (</span>
            <CvllBadge />
            <span>)</span>
          </span>
        }
        badge={
          <>
            <span>Hoa hồng</span>
            <CvllBadge />
          </>
        }
      >
        <CareerConfigSliderField
          label={
            <span className="flex items-center gap-1 flex-wrap">
              <span>🎯</span>
              <span>Ngưỡng duy trì tỷ lệ chốt Combo hàng tháng (</span>
              <CvllBadge />
              <span>):</span>
            </span>
          }
          valueDisplay={`${((cvPlusToCvPlusPlus.minSelfComboRate ?? 0.21) * 100).toFixed(0)}%`}
          valueClassName="font-mono text-purple-600 dark:text-purple-400 font-black text-sm"
          min={5}
          max={60}
          step={1}
          value={Math.round((cvPlusToCvPlusPlus.minSelfComboRate ?? 0.21) * 100)}
          onChange={(val) => updateStage2({ minSelfComboRate: val / 100 })}
          footnote={
            <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mt-0.5 italic">
              * Ngưỡng duy trì hàng tháng sau khi lên <CvllBadge />. Nếu chốt dưới tỷ lệ này, hệ thống khóa phần phụ cấp
              lương giờ tăng thêm (+{formatVnd((cvPlusToCvPlusPlus.hourlyWage ?? 29500) - 25500)}/h) và thưởng bán hàng.
            </p>
          }
        />

        {/* 2.2 CẤU HÌNH THƯỞNG COMBO TỐI GIẢN & DỰ KIẾN CÁ NHÂN */}
        <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-3">
          <div className="flex items-center justify-between border-b border-purple-200/60 dark:border-purple-800/50 pb-1.5">
            <span className="text-xs font-black text-purple-800 dark:text-purple-200 flex items-center gap-1.5">
              <span>🏹</span>
              <span>Thưởng Hoa Hồng Combo (Công Thức Tối Giản)</span>
            </span>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 tabular-nums">
              Đơn 4.5M: +{formatVnd(summary.sampleComboBonus)}/đơn
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <CareerConfigVndInputField
              label="Thực thu tối thiểu:"
              value={cvPlusToCvPlusPlus.comboMinCollectedAmount ?? DEFAULT_COMBO_MIN_COLLECTED_AMOUNT}
              step={50000}
              min={0}
              onChange={(val) => updateStage2({ comboMinCollectedAmount: val })}
            />
            <CareerConfigVndInputField
              label="Từ ngưỡng – < 2 Triệu:"
              value={cvPlusToCvPlusPlus.comboUnder2mBonus ?? 50000}
              step={5000}
              min={0}
              onChange={(val) => updateStage2({ comboUnder2mBonus: val })}
            />
            <CareerConfigVndInputField
              label="Mỗi 1 Triệu kế tiếp (từ 2M):"
              value={cvPlusToCvPlusPlus.comboStepPerMillionBonus ?? 50000}
              step={5000}
              min={0}
              onChange={(val) => updateStage2({ comboStepPerMillionBonus: val })}
            />
          </div>

          <CareerConfigSliderField
            label="Số đơn Combo cá nhân dự kiến / tháng:"
            valueDisplay={`${summary.combosPerMonth} đơn (+${formatVnd(summary.comboComm)}/tháng)`}
            valueClassName="font-mono text-purple-600 dark:text-purple-400 font-black tabular-nums"
            min={0}
            max={30}
            step={1}
            value={summary.combosPerMonth}
            onChange={(val) => updateStage2({ expectedCombosPerMonth: val })}
          />

          <CareerConfigDebtBonusBox
            mode={cvPlusToCvPlusPlus.comboDebtBonusMode ?? 'TIER_LADDER'}
            rate={cvPlusToCvPlusPlus.comboDebtBonusRate ?? 0.015}
            comboUnder2mBonus={cvPlusToCvPlusPlus.comboUnder2mBonus ?? 50000}
            comboStepPerMillionBonus={cvPlusToCvPlusPlus.comboStepPerMillionBonus ?? 50000}
            comboMinCollectedAmount={cvPlusToCvPlusPlus.comboMinCollectedAmount ?? DEFAULT_COMBO_MIN_COLLECTED_AMOUNT}
            onChangeMode={(mode) => updateStage2({ comboDebtBonusMode: mode })}
            onChangeRate={(rate) => updateStage2({ comboDebtBonusRate: rate })}
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
              +{formatVnd(summary.crossTipAmount)}/tháng
            </span>
          </div>

          <CareerConfigSliderField
            label="% Tip nhận được khi tư vấn cho CV khác:"
            labelClassName="text-xs text-slate-700 dark:text-slate-300 font-medium"
            valueDisplay={`${(summary.crossTipRate * 100).toFixed(0)}%`}
            valueClassName="font-mono text-amber-600 dark:text-amber-400 font-bold"
            min={10}
            max={40}
            step={5}
            value={summary.crossTipRate * 100}
            onChange={(val) => updateStage2({ crossConsultTipRate: val / 100 })}
          />

          <CareerConfigSliderField
            label="Số ca bán chéo / tư vấn chéo dự kiến / tháng:"
            labelClassName="text-xs text-slate-700 dark:text-slate-300 font-medium"
            valueDisplay={`${summary.crossOrdersPerMonth} ca/tháng`}
            valueClassName="font-mono text-amber-600 dark:text-amber-400 font-bold"
            min={0}
            max={300}
            step={5}
            value={summary.crossOrdersPerMonth}
            onChange={(val) => updateStage2({ expectedCrossConsultOrdersPerMonth: val })}
            footnote={
              <p className="text-[10px] text-slate-500 dark:text-slate-400 m-0 mt-0.5 italic tabular-nums">
                * Đàn Chị Sảnh tư vấn/bán chéo cho khách của CV khác được nhận {(summary.crossTipRate * 100).toFixed(0)}
                % tiền tip ({summary.crossOrdersPerMonth} ca × ~40K tip × {(summary.crossTipRate * 100).toFixed(0)}% = +
                {formatVnd(summary.crossTipAmount)}/tháng). Chuyên Viên làm mi vẫn nhận đủ 70% tiền tip!
              </p>
            }
          />
        </div>

        {/* 2.4 Tư vấn chốt combo hộ CV khác & Chia hoa hồng cho CV */}
        <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-3">
          <div className="flex items-center justify-between border-b border-purple-200/60 dark:border-purple-800/50 pb-1.5">
            <span className="text-xs font-black text-purple-800 dark:text-purple-200 flex items-center gap-1.5">
              <span>🏹</span>
              <span>Tư vấn chốt combo hộ CV khác: Tiền tươi bậc thang</span>
            </span>
            <span className="text-xs font-black text-purple-600 dark:text-purple-400 tabular-nums">
              +{formatVnd(summary.crossComboComm)}/tháng
            </span>
          </div>

          <CareerConfigSliderField
            label="Số gói Combo tư vấn chéo chốt được / tháng:"
            labelClassName="text-xs text-slate-700 dark:text-slate-300 font-medium"
            valueDisplay={`${summary.crossCombosPerMonth} combo/tháng`}
            valueClassName="font-mono text-purple-600 dark:text-purple-400 font-bold"
            min={0}
            max={15}
            step={1}
            value={summary.crossCombosPerMonth}
            onChange={(val) => updateStage2({ expectedCrossConsultCombosPerMonth: val })}
          />

          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
            <CareerConfigSliderField
              label={
                <span className="text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1 flex-wrap">
                  <span>💖 Tỷ lệ chia hoa hồng cho CV/CVL làm mi (0% = Mô hình 100/0):</span>
                </span>
              }
              valueDisplay={`${(summary.crossCvShareRate * 100).toFixed(0)}%`}
              valueClassName="font-mono text-emerald-600 dark:text-emerald-400 font-black"
              min={0}
              max={50}
              step={5}
              value={summary.crossCvShareRate * 100}
              onChange={(val) => updateStage2({ crossConsultCvShareRate: val / 100 })}
            />
            <div className="text-[10px] text-emerald-800 dark:text-emerald-200 space-y-0.5 leading-relaxed tabular-nums">
              {summary.crossCvShareRate === 0 ? (
                <div>
                  • <strong>Mô hình 100/0:</strong> <CvllBadge /> nhận trọn <strong>100%</strong> thưởng Combo &amp; Sản
                  phẩm khi tư vấn hộ; CV/CVL làm mi nhận <strong>0đ</strong> bán hàng và giữ nguyên quyền lợi Tip.
                </div>
              ) : (
                <>
                  <div>
                    • <strong>Chuyên Viên làm mi được hưởng:</strong> {(summary.crossCvShareRate * 100).toFixed(0)}% hoa
                    hồng bán combo (+{formatVnd(summary.crossCvSharedAmount)}/tháng) và dưỡng mi (+
                    {formatVnd(Math.round(stage1SerumOriginalPriceBonus * summary.crossCvShareRate))}/cây gốc).
                  </div>
                  <div>
                    • <CvllBadge /> <strong>chốt hộ:</strong> Hưởng phần còn lại (
                    {((1 - summary.crossCvShareRate) * 100).toFixed(0)}%).
                  </div>
                </>
              )}
            </div>
            <CareerConfigSwitchCard
              title="Miễn trừ mẫu số % Combo cho CVL khi nhờ CVLL chốt hộ:"
              description="Không tính ca nhờ CVLL chốt hộ vào mẫu số Not Combo Live của CVL"
              checked={cvPlusToCvPlusPlus.exemptCvlDenominatorOnCrossConsult !== false}
              onChange={(checked) => updateStage2({ exemptCvlDenominatorOnCrossConsult: checked })}
            />
            <CareerConfigSwitchCard
              title="Bắt buộc đi tua khách của chính mình:"
              description="CVLL bỏ tua để đi hỗ trợ sảnh sẽ bị xử phạt theo quy định công ty"
              checked={cvPlusToCvPlusPlus.enforceMandatoryOwnQueue !== false}
              onChange={(checked) => updateStage2({ enforceMandatoryOwnQueue: checked })}
            />
          </div>
        </div>

        {/* 2.5 Số cây Dưỡng mi bán dự kiến / tuần */}
        <CareerConfigSliderField
          label={
            <span className="inline-flex items-center gap-1">
              <span>✨ Số cây Dưỡng mi bán dự kiến / tuần (</span>
              <CvllBadge />
              <span>):</span>
            </span>
          }
          labelDescription={`Thưởng giá gốc (${formatVnd(cvPlusToCvPlusPlus.serumOriginalPriceBonus ?? 100000)}/cây). Nhận thêm: +${formatVnd(summary.serumMonthly)}/tháng (+${formatVnd(summary.serumWeekly)}/tuần)`}
          valueDisplay={`${summary.serumsPerWeek} cây/tuần`}
          valueClassName="font-mono text-emerald-600 dark:text-emerald-400 font-black"
          min={0}
          max={20}
          step={1}
          value={summary.serumsPerWeek}
          onChange={(val) => updateStage2({ expectedSerumsPerWeek: val })}
        />

        {/* Mini-Summary Box CVLL */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-emerald-500/10 border border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1">
                <span>Tổng hoa hồng bán hàng &amp; tư vấn chéo</span>
                <CvllBadge />
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                Combo ({formatVnd(summary.comboComm)}) + Dưỡng mi ({formatVnd(summary.serumMonthly)}) + Tip chéo ( +
                {formatVnd(summary.crossTipAmount)}) + Combo chéo (+{formatVnd(summary.crossComboComm)})
              </div>
            </div>
          </div>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{formatVnd(summary.totalSalesComm)}/tháng
          </span>
        </div>
      </CareerConfigSectionCard>

      {/* NHÓM 3: ĐÃI NGỘ LƯƠNG GIỜ & TIP ĐÀN CHỊ */}
      <CareerConfigSectionCard
        tone="amber"
        badgeTone="amber"
        icon={<HandCoins className="w-3.5 h-3.5" />}
        title={
          <span className="inline-flex items-center gap-1">
            <span>3. Lương Giờ &amp; Tip Đàn Chị (</span>
            <CvllBadge />
            <span>)</span>
          </span>
        }
        badge={
          <>
            <span>Đãi ngộ</span>
            <CvllBadge />
          </>
        }
      >
        <CareerConfigVndInputField
          label={
            <span className="inline-flex items-center gap-1">
              <span>Lương theo giờ</span>
              <CvllBadge />
              <span>(Gốc CV: 25.500đ/h):</span>
            </span>
          }
          headerValue={`${formatVnd(cvPlusToCvPlusPlus.hourlyWage ?? 29500)}/h (+${formatVnd((cvPlusToCvPlusPlus.hourlyWage ?? 29500) - 25500)}/h)`}
          value={cvPlusToCvPlusPlus.hourlyWage ?? 29500}
          step={500}
          min={25500}
          max={60000}
          addonAfter="đ/h"
          onChange={(val) => updateStage2({ hourlyWage: val })}
        />

        <CareerConfigSliderField
          label="Tỷ lệ hưởng Tip khách của mình:"
          valueDisplay={`${((cvPlusToCvPlusPlus.tipShareRatio ?? 0.9) * 100).toFixed(0)}% (Tự tư vấn + Tự làm mi)`}
          valueClassName="font-mono text-emerald-600 dark:text-emerald-400 font-black"
          min={70}
          max={100}
          step={5}
          value={(cvPlusToCvPlusPlus.tipShareRatio ?? 0.9) * 100}
          onChange={(val) => updateStage2({ tipShareRatio: val / 100 })}
        />

        <CareerConfigComboPenaltyBox
          minComboPercent={((cvPlusToCvPlusPlus.minSelfComboRate ?? 0.21) * 100).toFixed(0)}
          checked={cvPlusToCvPlusPlus.enforceComboPenalty !== false}
          onChange={(checked) => updateStage2({ enforceComboPenalty: checked })}
          description={
            <>
              Nếu tỷ lệ chốt combo &lt; {((cvPlusToCvPlusPlus.minSelfComboRate ?? 0.21) * 100).toFixed(0)}%:{' '}
              <strong>
                Khóa phần lương tăng thêm (+{formatVnd((cvPlusToCvPlusPlus.hourlyWage ?? 29500) - 25500)}/h)
              </strong>{' '}
              và <strong>toàn bộ thưởng bán hàng cá nhân</strong>. Nhân viên chỉ được giữ tip tư vấn!
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
        badge="Chuẩn mực Đàn Chị"
      >
        <CareerConfigSliderField
          label={<span>📋 Kiểm định QA/QC tối thiểu trong tháng hoàn tất:</span>}
          labelDescription="Số lần kiểm định tác phong & phòng mi trong tháng hoàn tất gần nhất (chuẩn 4 lần = 1 lần/tuần)."
          valueDisplay={`${cvPlusToCvPlusPlus.minQaAudits ?? 4} lần`}
          valueClassName="font-mono text-emerald-600 dark:text-emerald-400 font-black"
          min={0}
          max={12}
          step={1}
          value={cvPlusToCvPlusPlus.minQaAudits ?? 4}
          onChange={(val) => updateStage2({ minQaAudits: val, minWeeklyQaAudits: Number((val / 4).toFixed(2)) })}
        />

        <CareerConfigSwitchCard
          title="Khóa nâng cấp nếu có bài Failed QA/QC:"
          description="Đàn Chị gương mẫu: không có bất kỳ bài kiểm tra nào bị Failed"
          checked={cvPlusToCvPlusPlus.requireZeroFailedAudits !== false}
          onChange={(checked) => updateStage2({ requireZeroFailedAudits: checked })}
        />

        <CareerConfigSliderField
          label={<span>🍌 Chuối Yêu Thương check-in trong tháng hoàn tất:</span>}
          labelDescription="Chuối nhận từ thiên thần khác lúc check-in trong tháng hoàn tất gần nhất (chuẩn 20 chuối/tháng)"
          valueDisplay={`${cvPlusToCvPlusPlus.minBananaCount ?? 20} 🍌`}
          valueClassName="font-mono text-amber-500 font-black"
          min={5}
          max={60}
          step={1}
          value={cvPlusToCvPlusPlus.minBananaCount ?? 20}
          onChange={(val) => updateStage2({ minBananaCount: val })}
        />

        <CareerConfigSliderField
          label={
            <span className="flex items-center gap-1">
              <span>😊 Chỉ số HI tối thiểu:</span>
              <span className="text-[10px] font-normal text-slate-400">(Đồng đội tin yêu &amp; quý mến)</span>
            </span>
          }
          preSliderNote={
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 mb-1 leading-normal">
              Yêu cầu đạt tỷ lệ đồng đội tin yêu, hỗ trợ và tự thả tim nhau ≥{' '}
              {((cvPlusToCvPlusPlus.minHappinessIndex ?? 0.7) * 100).toFixed(0)}% khi check-in / check-out.
            </p>
          }
          valueDisplay={`${((cvPlusToCvPlusPlus.minHappinessIndex ?? 0.7) * 100).toFixed(0)}%`}
          valueClassName="font-mono text-emerald-600 dark:text-emerald-400 font-black"
          min={50}
          max={95}
          step={1}
          value={(cvPlusToCvPlusPlus.minHappinessIndex ?? 0.7) * 100}
          onChange={(val) => updateStage2({ minHappinessIndex: val / 100 })}
        />
      </CareerConfigSectionCard>

      {/* NHÓM 5 (ẢI TRÙM CUỐI LÊN CVLL & DUY TRÌ / GIÁNG CẤP) */}
      <CareerConfigSectionCard
        tone="amber"
        badgeTone="amber"
        icon={<Flame className="w-3.5 h-3.5" />}
        title="5. Ải Trùm Cuối Lên CVLL &amp; Giáng Cấp"
        badge={
          <>
            <span>Thăng hạng</span>
            <CvllBadge />
          </>
        }
      >
        <CareerConfigSliderField
          label="🎯 Tỷ lệ bán Combo tối thiểu để lên CVLL:"
          valueDisplay={`${((cvPlusToCvPlusPlus.promotionMinComboRate ?? 0.3) * 100).toFixed(0)}%`}
          valueClassName="font-mono text-amber-600 dark:text-amber-400 font-black"
          min={15}
          max={50}
          step={1}
          value={Math.round((cvPlusToCvPlusPlus.promotionMinComboRate ?? 0.3) * 100)}
          onChange={(val) => updateStage2({ promotionMinComboRate: val / 100 })}
        />

        <CareerConfigSliderField
          label="📅 Số tháng liên tiếp đạt chuẩn Combo để lên CVLL:"
          valueDisplay={`${cvPlusToCvPlusPlus.promotionConsecutiveMonths ?? 2} tháng liền`}
          valueClassName="font-mono text-amber-600 dark:text-amber-400 font-black"
          min={1}
          max={6}
          step={1}
          value={cvPlusToCvPlusPlus.promotionConsecutiveMonths ?? 2}
          onChange={(val) => updateStage2({ promotionConsecutiveMonths: val })}
        />

        <CareerConfigSliderField
          label="🔄 Số tháng trượt ngưỡng duy trì liên tiếp sẽ giáng về CVL:"
          valueDisplay={`${cvPlusToCvPlusPlus.consecutiveFailedMonthsToDemote ?? 2} tháng liền`}
          valueClassName="font-mono text-rose-500 font-black"
          min={1}
          max={4}
          step={1}
          value={cvPlusToCvPlusPlus.consecutiveFailedMonthsToDemote ?? 2}
          onChange={(val) => updateStage2({ consecutiveFailedMonthsToDemote: val })}
        />

        <CareerConfigSliderField
          label="Số ngày thử thách tự tư vấn &amp; dẫn dắt:"
          valueDisplay={`${cvPlusToCvPlusPlus.trialDurationDays ?? 30} ngày`}
          valueClassName="font-mono text-amber-600 dark:text-amber-400 font-black"
          min={15}
          max={60}
          value={cvPlusToCvPlusPlus.trialDurationDays ?? 30}
          onChange={(val) => updateStage2({ trialDurationDays: val })}
        />
      </CareerConfigSectionCard>
    </div>
  );
}

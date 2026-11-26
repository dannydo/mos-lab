'use client';

import React from 'react';
import { Award, Building2, MapPin, ShieldCheck } from 'lucide-react';
import type { CareerProgressionConfig, FmFloorFarmConfig } from '@mos-lab/shared';
import { formatVnd, patchFmFloorFarmConfig } from './careerConfigTypesAndHelpers';
import {
  CareerConfigSectionCard,
  CareerConfigSliderField,
  CareerConfigSwitchCard,
  CareerConfigVndInputField,
  CvllBadge,
} from './CareerConfigFieldPrimitives';

interface CareerStage3FmConfigTabProps {
  config: CareerProgressionConfig;
  fmFloorFarm: FmFloorFarmConfig;
  onConfigChange: (nextConfig: CareerProgressionConfig) => void;
}

export function CareerStage3FmConfigTab({ config, fmFloorFarm, onConfigChange }: CareerStage3FmConfigTabProps) {
  const updateFm = (patch: Partial<FmFloorFarmConfig>) => {
    onConfigChange(patchFmFloorFarmConfig(config, fmFloorFarm, patch));
  };

  const star1Total =
    fmFloorFarm.gmaps1StarBonus + fmFloorFarm.inv1StarBonus + fmFloorFarm.fac1StarBonus + fmFloorFarm.ops1StarBonus;
  const star2Total =
    fmFloorFarm.gmaps2StarBonus + fmFloorFarm.inv2StarBonus + fmFloorFarm.fac2StarBonus + fmFloorFarm.ops2StarBonus;
  const star3Total =
    fmFloorFarm.gmaps3StarBonus + fmFloorFarm.inv3StarBonus + fmFloorFarm.fac3StarBonus + fmFloorFarm.ops3StarBonus;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
          Điều chỉnh trực tiếp luật vận hành <strong>Ải 3: Floor Manager (FM 1–2–3 · Nông Trại Sàn)</strong>, nối thẳng
          từ <CvllBadge /> lên <strong>CHO (11M)</strong>.
        </p>
        <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          ⚡ Mọi thông số FM điều chỉnh &amp; lưu tại đây tự động đồng bộ trực tiếp vào Kinh Thánh mOS (FM-001) và Đảo
          FM.
        </div>
      </div>

      {/* NHÓM 1: 3 BẬC LƯƠNG CỨNG FM, CÔNG NGÀY & TƯỚI HỘ */}
      <CareerConfigSectionCard
        tone="amber"
        badgeTone="amber"
        icon={<Award className="w-3.5 h-3.5" />}
        title="1. 3 Bậc Lương Cứng FM, Công Ngày & Tưới Hộ"
        badge="FM 1–2–3 ➔ CHO"
      >
        <div className="grid grid-cols-3 gap-2">
          <CareerConfigVndInputField
            label="Lương FM 1:"
            value={fmFloorFarm.fm1BaseSalary}
            step={500_000}
            min={5_000_000}
            max={15_000_000}
            onChange={(val) => updateFm({ fm1BaseSalary: val })}
          />
          <CareerConfigVndInputField
            label="Lương FM 2:"
            value={fmFloorFarm.fm2BaseSalary}
            step={500_000}
            min={6_000_000}
            max={16_000_000}
            onChange={(val) => updateFm({ fm2BaseSalary: val })}
          />
          <CareerConfigVndInputField
            label="Lương FM 3:"
            value={fmFloorFarm.fm3BaseSalary}
            step={500_000}
            min={7_000_000}
            max={18_000_000}
            onChange={(val) => updateFm({ fm3BaseSalary: val })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <CareerConfigVndInputField
            label="Thưởng Tưới Hộ đồng đội nghỉ:"
            value={fmFloorFarm.coverShiftBonus}
            step={50_000}
            min={0}
            max={1_000_000}
            addonAfter="đ/ca"
            onChange={(val) => updateFm({ coverShiftBonus: val })}
          />
          <CareerConfigVndInputField
            label="Thưởng 4 khung giờ/ngày:"
            value={fmFloorFarm.dailyQuestBonusTotal}
            step={10_000}
            min={0}
            max={500_000}
            addonAfter="đ/ngày"
            onChange={(val) => updateFm({ dailyQuestBonusTotal: val })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CareerConfigSliderField
            label="Công chuẩn/tháng:"
            valueDisplay={`${fmFloorFarm.workingDaysPerMonth} công`}
            min={22}
            max={28}
            step={1}
            value={fmFloorFarm.workingDaysPerMonth}
            onChange={(val) => updateFm({ workingDaysPerMonth: val })}
          />
          <CareerConfigSliderField
            label="Rớt liên tiếp lùi 1 bậc:"
            valueDisplay={`${fmFloorFarm.demoteConsecutiveMonths} tháng`}
            valueClassName="font-mono text-rose-500 font-black tabular-nums"
            min={1}
            max={4}
            step={1}
            value={fmFloorFarm.demoteConsecutiveMonths}
            onChange={(val) => updateFm({ demoteConsecutiveMonths: val })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CareerConfigSliderField
            label="Sao tối thiểu lên FM 2:"
            valueDisplay={`${fmFloorFarm.fm2MinStars}/12★ (${fmFloorFarm.fm2PromotionMonths}T)`}
            valueClassName="font-mono text-amber-600 dark:text-amber-400 font-black tabular-nums"
            min={6}
            max={11}
            step={1}
            value={fmFloorFarm.fm2MinStars}
            onChange={(val) => updateFm({ fm2MinStars: val })}
          />
          <CareerConfigSliderField
            label="Sao tối thiểu lên FM 3:"
            valueDisplay={`${fmFloorFarm.fm3MinStars}/12★ (${fmFloorFarm.fm3PromotionMonths}T)`}
            valueClassName="font-mono text-amber-600 dark:text-amber-400 font-black tabular-nums"
            min={8}
            max={12}
            step={1}
            value={fmFloorFarm.fm3MinStars}
            onChange={(val) => updateFm({ fm3MinStars: val })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CareerConfigSliderField
            label="Số tháng liền lên FM 2:"
            valueDisplay={`${fmFloorFarm.fm2PromotionMonths} tháng`}
            min={1}
            max={6}
            step={1}
            value={fmFloorFarm.fm2PromotionMonths}
            onChange={(val) => updateFm({ fm2PromotionMonths: val })}
          />
          <CareerConfigSliderField
            label="Số tháng liền lên FM 3:"
            valueDisplay={`${fmFloorFarm.fm3PromotionMonths} tháng`}
            min={1}
            max={6}
            step={1}
            value={fmFloorFarm.fm3PromotionMonths}
            onChange={(val) => updateFm({ fm3PromotionMonths: val })}
          />
        </div>

        <CareerConfigSwitchCard
          title="Chế độ Active Claim (Nhấn tiền mới vào Ví):"
          description="Thưởng ngày & rương tuần yêu cầu bấm thu hoạch kiểu game (quên bấm công ngày cuối tháng vẫn tự trả 100%)."
          checked={fmFloorFarm.requireActiveClaimWallet}
          onChange={(checked) => updateFm({ requireActiveClaimWallet: checked })}
        />
      </CareerConfigSectionCard>

      {/* NHÓM 2: BIÊN CHẾ, CÔNG SUẤT & QUỸ DT BẬC THANG (60/40) */}
      <CareerConfigSectionCard
        tone="slate"
        iconTone="blue"
        badgeTone="blue"
        icon={<Building2 className="w-3.5 h-3.5" />}
        title="2. Biên Chế, Công Suất & Quỹ DT 60/40"
        badge="Mở FM #2 & Quỹ DT"
      >
        <div className="grid grid-cols-2 gap-3">
          <CareerConfigSliderField
            label="Định mức 1 FM / số CV:"
            valueDisplay={`${fmFloorFarm.cvsPerFm} CV`}
            min={5}
            max={12}
            step={1}
            value={fmFloorFarm.cvsPerFm}
            onChange={(val) => updateFm({ cvsPerFm: val })}
          />
          <CareerConfigSliderField
            label="Mốc bắt buộc tuyển FM #2 (> 1.5×):"
            valueDisplay={`≥ ${fmFloorFarm.minCvsForSecondFm} CV (> ${fmFloorFarm.minCvsForSecondFm - 1} CV)`}
            min={10}
            max={18}
            step={1}
            value={fmFloorFarm.minCvsForSecondFm}
            onChange={(val) => updateFm({ minCvsForSecondFm: val })}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <CareerConfigSliderField
            label="DT dưới 2/3 giường:"
            valueDisplay={`${(fmFloorFarm.dtRateBelowTarget * 100).toFixed(1)}%`}
            min={0.5}
            max={2}
            step={0.1}
            value={Number((fmFloorFarm.dtRateBelowTarget * 100).toFixed(1))}
            onChange={(val) => updateFm({ dtRateBelowTarget: Number((val / 100).toFixed(3)) })}
          />
          <CareerConfigSliderField
            label="DT đạt ≥ 2/3 giường:"
            valueDisplay={`${(fmFloorFarm.dtRateAtTarget * 100).toFixed(1)}%`}
            valueClassName="font-mono text-emerald-600 dark:text-emerald-400 font-black tabular-nums"
            min={1}
            max={3}
            step={0.1}
            value={Number((fmFloorFarm.dtRateAtTarget * 100).toFixed(1))}
            onChange={(val) => updateFm({ dtRateAtTarget: Number((val / 100).toFixed(3)) })}
          />
          <CareerConfigSliderField
            label="DT vượt ≥ 80% giường:"
            valueDisplay={`${(fmFloorFarm.dtRateAccelerator * 100).toFixed(1)}%`}
            valueClassName="font-mono text-amber-600 dark:text-amber-400 font-black tabular-nums"
            min={1.5}
            max={4}
            step={0.1}
            value={Number((fmFloorFarm.dtRateAccelerator * 100).toFixed(1))}
            onChange={(val) => updateFm({ dtRateAccelerator: Number((val / 100).toFixed(3)) })}
          />
        </div>

        <CareerConfigSliderField
          label="Tỷ trọng chia Quỹ DT (Chung Toàn Đội / Nhóm phụ trách):"
          valueDisplay={`${Math.round(fmFloorFarm.dtBranchSharedWeight * 100)}% / ${Math.round(fmFloorFarm.dtGroupOwnedWeight * 100)}%`}
          valueClassName="font-mono text-blue-600 dark:text-blue-400 font-black tabular-nums"
          min={30}
          max={80}
          step={5}
          value={Math.round(fmFloorFarm.dtBranchSharedWeight * 100)}
          onChange={(val) => {
            const shared = Number((val / 100).toFixed(2));
            updateFm({
              dtBranchSharedWeight: shared,
              dtGroupOwnedWeight: Number((1 - shared).toFixed(2)),
            });
          }}
        />
      </CareerConfigSectionCard>

      {/* NHÓM 3: HỆ SAO GOOGLE MAPS (CHỈ 5★) & CHẾ TÀI SÂU */}
      <CareerConfigSectionCard
        tone="purple"
        badgeTone="purple"
        icon={<MapPin className="w-3.5 h-3.5" />}
        title="3. Google Maps (Chỉ 5★) & Chế Tài Sâu"
        badge={`Max ${formatVnd(star3Total)}`}
      >
        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-purple-200/70 dark:border-purple-800/60 flex items-center justify-between text-[11px] tabular-nums">
          <span className="font-bold text-slate-600 dark:text-slate-300">Tổng Quỹ 4 Trụ Sao:</span>
          <span className="font-mono font-black text-purple-600 dark:text-purple-400">
            1★ {formatVnd(star1Total)} · 2★ {formatVnd(star2Total)} · 3★ {formatVnd(star3Total)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <CareerConfigSliderField
            label="1★ (quả 5★/CV):"
            valueDisplay={`${fmFloorFarm.gmaps1StarReviewsPerCv}`}
            min={1}
            max={6}
            step={1}
            value={fmFloorFarm.gmaps1StarReviewsPerCv}
            onChange={(val) => updateFm({ gmaps1StarReviewsPerCv: val })}
          />
          <CareerConfigSliderField
            label="2★ (quả 5★/CV):"
            valueDisplay={`${fmFloorFarm.gmaps2StarReviewsPerCv}`}
            min={2}
            max={8}
            step={1}
            value={fmFloorFarm.gmaps2StarReviewsPerCv}
            onChange={(val) => updateFm({ gmaps2StarReviewsPerCv: val })}
          />
          <CareerConfigSliderField
            label="3★ (quả 5★/CV):"
            valueDisplay={`${fmFloorFarm.gmaps3StarReviewsPerCv}`}
            min={3}
            max={10}
            step={1}
            value={fmFloorFarm.gmaps3StarReviewsPerCv}
            onChange={(val) => updateFm({ gmaps3StarReviewsPerCv: val })}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <CareerConfigVndInputField
            label="Thưởng Maps 1★:"
            value={fmFloorFarm.gmaps1StarBonus}
            step={50_000}
            min={0}
            onChange={(val) => updateFm({ gmaps1StarBonus: val })}
          />
          <CareerConfigVndInputField
            label="Thưởng Maps 2★:"
            value={fmFloorFarm.gmaps2StarBonus}
            step={50_000}
            min={0}
            onChange={(val) => updateFm({ gmaps2StarBonus: val })}
          />
          <CareerConfigVndInputField
            label="Thưởng Maps 3★:"
            value={fmFloorFarm.gmaps3StarBonus}
            step={50_000}
            min={0}
            onChange={(val) => updateFm({ gmaps3StarBonus: val })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CareerConfigSliderField
            label="Trần sâu Maps tối đa/tháng:"
            valueDisplay={`≤ ${fmFloorFarm.gmapsMaxNegativeWormsPerMonth} sâu`}
            valueClassName="font-mono text-rose-500 font-black tabular-nums"
            min={0}
            max={3}
            step={1}
            value={fmFloorFarm.gmapsMaxNegativeWormsPerMonth}
            onChange={(val) => updateFm({ gmapsMaxNegativeWormsPerMonth: val })}
          />
          <CareerConfigSliderField
            label="Mốc sâu khóa 0★ Maps:"
            valueDisplay={`≥ ${fmFloorFarm.gmapsZeroBonusWormsThreshold} sâu`}
            valueClassName="font-mono text-rose-500 font-black tabular-nums"
            min={2}
            max={5}
            step={1}
            value={fmFloorFarm.gmapsZeroBonusWormsThreshold}
            onChange={(val) => updateFm({ gmapsZeroBonusWormsThreshold: val })}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <CareerConfigVndInputField
            label="Maps trễ 24–48h:"
            value={fmFloorFarm.mapsWormLate24hPenalty}
            step={50_000}
            min={0}
            addonAfter="đ"
            onChange={(val) => updateFm({ mapsWormLate24hPenalty: val })}
          />
          <CareerConfigVndInputField
            label="FAL trễ 24–48h:"
            value={fmFloorFarm.falWormLate24hPenalty}
            step={50_000}
            min={0}
            addonAfter="đ"
            onChange={(val) => updateFm({ falWormLate24hPenalty: val })}
          />
          <CareerConfigVndInputField
            label="FAL trễ > 48h:"
            value={fmFloorFarm.falWormLate48hPenalty}
            step={50_000}
            min={0}
            addonAfter="đ"
            onChange={(val) => updateFm({ falWormLate48hPenalty: val })}
          />
        </div>

        <CareerConfigSwitchCard
          title="Cơ chế Sâu Hóa Bướm (Maps 5★ Redemption):"
          description="Khách đánh giá 1–3★ sau khi được chăm sóc chân thành tự sửa lên 5★ sẽ được xóa khỏi bộ đếm sâu."
          checked={fmFloorFarm.gmapsAllowButterflyRedemption}
          onChange={(checked) => updateFm({ gmapsAllowButterflyRedemption: checked })}
        />
      </CareerConfigSectionCard>

      {/* NHÓM 4: KHO · CSVC · FAL · TƯ VẤN GIỮ LỬA · NGHỈ LỄ */}
      <CareerConfigSectionCard
        tone="emerald"
        badgeTone="emerald"
        icon={<ShieldCheck className="w-3.5 h-3.5" />}
        title="4. Kho · CSVC · FAL · Tư Vấn & Nghỉ Lễ"
        badge="3 Trụ & Lễ Tự Lái"
      >
        <div className="grid grid-cols-3 gap-2">
          <CareerConfigVndInputField
            label="Kho 1★ (≤3%):"
            value={fmFloorFarm.inv1StarBonus}
            step={50_000}
            min={0}
            onChange={(val) => updateFm({ inv1StarBonus: val })}
          />
          <CareerConfigVndInputField
            label="Kho 2★ (≤2%):"
            value={fmFloorFarm.inv2StarBonus}
            step={50_000}
            min={0}
            onChange={(val) => updateFm({ inv2StarBonus: val })}
          />
          <CareerConfigVndInputField
            label="Kho 3★ (≤1%):"
            value={fmFloorFarm.inv3StarBonus}
            step={50_000}
            min={0}
            onChange={(val) => updateFm({ inv3StarBonus: val })}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <CareerConfigVndInputField
            label="CSVC 1★ (≥90đ):"
            value={fmFloorFarm.fac1StarBonus}
            step={50_000}
            min={0}
            onChange={(val) => updateFm({ fac1StarBonus: val })}
          />
          <CareerConfigVndInputField
            label="CSVC 2★ (≥95đ):"
            value={fmFloorFarm.fac2StarBonus}
            step={50_000}
            min={0}
            onChange={(val) => updateFm({ fac2StarBonus: val })}
          />
          <CareerConfigVndInputField
            label="CSVC 3★ (≥98đ):"
            value={fmFloorFarm.fac3StarBonus}
            step={50_000}
            min={0}
            onChange={(val) => updateFm({ fac3StarBonus: val })}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <CareerConfigVndInputField
            label="Tua/FAL 1★:"
            value={fmFloorFarm.ops1StarBonus}
            step={50_000}
            min={0}
            onChange={(val) => updateFm({ ops1StarBonus: val })}
          />
          <CareerConfigVndInputField
            label="Tua/FAL 2★:"
            value={fmFloorFarm.ops2StarBonus}
            step={50_000}
            min={0}
            onChange={(val) => updateFm({ ops2StarBonus: val })}
          />
          <CareerConfigVndInputField
            label="Tua/FAL 3★:"
            value={fmFloorFarm.ops3StarBonus}
            step={50_000}
            min={0}
            onChange={(val) => updateFm({ ops3StarBonus: val })}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <CareerConfigSliderField
            label="FAL 1★ tối đa:"
            valueDisplay={`${(fmFloorFarm.falMaxRate1Star * 100).toFixed(1)}%`}
            min={0.5}
            max={3}
            step={0.1}
            value={Number((fmFloorFarm.falMaxRate1Star * 100).toFixed(1))}
            onChange={(val) => updateFm({ falMaxRate1Star: Number((val / 100).toFixed(3)) })}
          />
          <CareerConfigSliderField
            label="FAL 2★ tối đa:"
            valueDisplay={`${(fmFloorFarm.falMaxRate2Star * 100).toFixed(1)}%`}
            min={0.3}
            max={2}
            step={0.1}
            value={Number((fmFloorFarm.falMaxRate2Star * 100).toFixed(1))}
            onChange={(val) => updateFm({ falMaxRate2Star: Number((val / 100).toFixed(3)) })}
          />
          <CareerConfigSliderField
            label="FAL 3★ tối đa:"
            valueDisplay={`${(fmFloorFarm.falMaxRate3Star * 100).toFixed(1)}%`}
            valueClassName="font-mono text-emerald-600 dark:text-emerald-400 font-black tabular-nums"
            min={0.1}
            max={1.5}
            step={0.1}
            value={Number((fmFloorFarm.falMaxRate3Star * 100).toFixed(1))}
            onChange={(val) => updateFm({ falMaxRate3Star: Number((val / 100).toFixed(3)) })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CareerConfigSliderField
            label="Ca tư vấn thường/tuần:"
            valueDisplay={`${fmFloorFarm.weeklyRegularConsultTarget} ca`}
            min={2}
            max={12}
            step={1}
            value={fmFloorFarm.weeklyRegularConsultTarget}
            onChange={(val) => updateFm({ weeklyRegularConsultTarget: val })}
          />
          <CareerConfigSliderField
            label="Khách Mới tối thiểu/tuần:"
            valueDisplay={`≥ ${fmFloorFarm.weeklyNewCustomerConsultMin} ca`}
            min={1}
            max={6}
            step={1}
            value={fmFloorFarm.weeklyNewCustomerConsultMin}
            onChange={(val) => updateFm({ weeklyNewCustomerConsultMin: val })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CareerConfigSliderField
            label="Sàn % Combo giữ lửa:"
            valueDisplay={`${Math.round(fmFloorFarm.consultMinComboRate * 100)}%`}
            min={15}
            max={40}
            step={1}
            value={Math.round(fmFloorFarm.consultMinComboRate * 100)}
            onChange={(val) => updateFm({ consultMinComboRate: Number((val / 100).toFixed(2)) })}
          />
          <CareerConfigSliderField
            label="Chuẩn giỏi % Combo:"
            valueDisplay={`${Math.round(fmFloorFarm.consultExcellentComboRate * 100)}%`}
            valueClassName="font-mono text-emerald-600 dark:text-emerald-400 font-black tabular-nums"
            min={20}
            max={50}
            step={1}
            value={Math.round(fmFloorFarm.consultExcellentComboRate * 100)}
            onChange={(val) => updateFm({ consultExcellentComboRate: Number((val / 100).toFixed(2)) })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CareerConfigSliderField
            label="Mở Nghỉ Lễ Tự Lái (tỷ lệ CVL/CVLL):"
            valueDisplay={`≥ ${Math.round(fmFloorFarm.holidayAutopilotMinCvlRatio * 100)}%`}
            valueClassName="font-mono text-emerald-600 dark:text-emerald-400 font-black tabular-nums"
            min={30}
            max={80}
            step={5}
            value={Math.round(fmFloorFarm.holidayAutopilotMinCvlRatio * 100)}
            onChange={(val) => updateFm({ holidayAutopilotMinCvlRatio: Number((val / 100).toFixed(2)) })}
          />
          <CareerConfigSliderField
            label="Khiên tối thiểu giữ Rương tuần:"
            valueDisplay={`≥ ${fmFloorFarm.minShieldHpForChest} HP`}
            min={50}
            max={100}
            step={5}
            value={fmFloorFarm.minShieldHpForChest}
            onChange={(val) => updateFm({ minShieldHpForChest: val })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <CareerConfigVndInputField
            label="Vòng Quay 4 Tuần Xanh (Min):"
            value={fmFloorFarm.wheelMinPrize}
            step={100_000}
            min={0}
            onChange={(val) => updateFm({ wheelMinPrize: val })}
          />
          <CareerConfigVndInputField
            label="Vòng Quay 4 Tuần Xanh (Max):"
            value={fmFloorFarm.wheelMaxPrize}
            step={100_000}
            min={500_000}
            onChange={(val) => updateFm({ wheelMaxPrize: val })}
          />
        </div>

        <CareerConfigSwitchCard
          title="Đổ 20% Tip tư vấn của FM vào Quỹ Ăn Chơi Team:"
          description="FM không nhận hoa hồng Combo/SP cá nhân để không tranh khách với CVLL; Tip tư vấn chảy về Quỹ Chi Nhánh."
          checked={fmFloorFarm.consultTipToFunFund}
          onChange={(checked) => updateFm({ consultTipToFunFund: checked })}
        />
        <CareerConfigSwitchCard
          title="100% ca FAL (Fix · Adjust · Log) qua cổng kiểm định FM:"
          description="FM xác minh đúng bản chất lỗi trong 24h; cấm FM tự duyệt ca Adjust của chính mình."
          checked={fmFloorFarm.requireAllFalThroughFm}
          onChange={(checked) => updateFm({ requireAllFalThroughFm: checked })}
        />
      </CareerConfigSectionCard>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  Activity,
  Award,
  Building2,
  Crown,
  Gift,
  HeartHandshake,
  Layers,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { CvFeather1Badge, CvFeather2Badge } from '../../app/ios-app/components/ui-kit/CvFeatherLabels';
import {
  AppleKpiHero,
  AppleProgressRow,
  AppleSegmented,
  AppleSliderRow,
  AppleStepperRow,
  AppleSurface,
  AppleToggleRow,
} from './ApplePrimitives';
import { FmHubModePanel } from './FmHubModePanel';
import { FmInfoTrigger } from './FmInfoGuideModal';
import { FmRevPerCvLockRow } from './FmRevPerCvLockRow';
import {
  AUTONOMY_HARD_MAX_PCT,
  BRANCH_SPECS,
  BranchKey,
  FM_ROOKIE_GRACE_DAYS,
  FmLevel,
  FmSimulationResult,
  PnlSimulationResult,
  SimulatorInput,
  computeLockedRevVnd,
  createUniformStars,
  formatM,
  resolveAutonomyStar,
} from './fm-simulator.engine';

export type PnlPresetKey = 'dt-680' | 'dt-800' | 'ep-480' | 'low-8';

interface PnlCockpitViewProps {
  readonly input: SimulatorInput;
  readonly fm: FmSimulationResult;
  readonly pnl: PnlSimulationResult;
  readonly starTier: 0 | 1 | 2 | 3;
  readonly compact: boolean;
  readonly onChange: (patch: Partial<SimulatorInput>) => void;
  readonly onChangeStarTier: (tier: 0 | 1 | 2 | 3) => void;
  readonly onApplyPreset: (preset: PnlPresetKey) => void;
}

export function PnlCockpitView({
  input,
  fm,
  pnl,
  starTier,
  compact,
  onChange,
  onChangeStarTier,
  onApplyPreset,
}: PnlCockpitViewProps) {
  const spec = BRANCH_SPECS[input.branch];
  const revM = Math.round(input.revVnd / 1_000_000);
  const currentRevPerCvM = Math.max(20, Math.min(80, Math.round(fm.revPerMatureCvVnd / 1_000_000)));
  const [revPerCvLocked, setRevPerCvLocked] = useState(false);
  const [lockedRevPerCvM, setLockedRevPerCvM] = useState(currentRevPerCvM);
  const displayedRevPerCvM = revPerCvLocked ? lockedRevPerCvM : currentRevPerCvM;
  const revPctBase = Math.max(1, input.revVnd);

  const handleToggleRevLock = () => {
    if (revPerCvLocked) {
      setRevPerCvLocked(false);
      return;
    }
    setLockedRevPerCvM(currentRevPerCvM);
    setRevPerCvLocked(true);
    onChange({
      revVnd: computeLockedRevVnd(input.cvs, input.rookieCvs, currentRevPerCvM),
    });
  };

  const handleRevPerCvChange = (nextM: number) => {
    setLockedRevPerCvM(nextM);
    setRevPerCvLocked(true);
    onChange({
      revVnd: computeLockedRevVnd(input.cvs, input.rookieCvs, nextM),
    });
  };

  const handleAutonomyChange = (nextPct: number, nextKeyholders = input.cvllKeyholders) => {
    const capped = Math.min(AUTONOMY_HARD_MAX_PCT, Math.max(0, nextPct));
    const star = resolveAutonomyStar(capped, nextKeyholders);
    onChange({
      autonomyPct: capped,
      cvllKeyholders: nextKeyholders,
      stars: { ...input.stars, autonomy: star },
    });
  };

  const handleStarTierSelect = (tier: 0 | 1 | 2 | 3) => {
    onChangeStarTier(tier);
    const nextStars = createUniformStars(tier);
    const autonomyStar = resolveAutonomyStar(input.autonomyPct, input.cvllKeyholders);
    onChange({
      stars: { ...nextStars, autonomy: autonomyStar },
    });
  };

  return (
    <div className="space-y-4">
      {/* Independent P&L Presets */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          {
            id: 'dt-680' as const,
            label: 'ĐT 680M · 14 CV',
            icon: <Sparkles className="h-3.5 w-3.5 text-amber-500" />,
          },
          {
            id: 'dt-800' as const,
            label: 'ĐT 800M · 16 CV',
            icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />,
          },
          {
            id: 'ep-480' as const,
            label: 'EP 480M · 10 CV',
            icon: <Building2 className="h-3.5 w-3.5 text-blue-500" />,
          },
          { id: 'low-8' as const, label: 'Thấp 8 CV', icon: <Activity className="h-3.5 w-3.5 text-rose-500" /> },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onApplyPreset(p.id)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-black/5 bg-white/80 px-3.5 text-xs font-medium text-neutral-700 shadow-xs backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-neutral-900/80 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            {p.icon}
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Top 4 KPI Strip */}
      <div className={compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-4 gap-3'}>
        <AppleKpiHero
          icon={<TrendingUp className="h-3.5 w-3.5 text-blue-500" />}
          label="Doanh thu sàn"
          infoSlot={<FmInfoTrigger guideId="ctrl-revenue" label="Doanh thu sàn" />}
          value={formatM(pnl.revVnd, 0)}
          hint={`${formatM(fm.revPerCvVnd, 1)} / CV · ${fm.fmCount} FM`}
          tone="blue"
        />
        <AppleKpiHero
          icon={<Users className="h-3.5 w-3.5 text-amber-500" />}
          label="Tổng chi nhân sự"
          infoSlot={<FmInfoTrigger guideId="pnl-people" label="Tổng chi nhân sự" />}
          value={formatM(pnl.totalPeopleCostVnd, 1)}
          hint={`${pnl.peoplePctOfRev.toFixed(1)}% doanh thu`}
          tone="amber"
        />
        <AppleKpiHero
          icon={<Wallet className="h-3.5 w-3.5 text-emerald-500" />}
          label="Dư ròng trước mặt bằng"
          infoSlot={<FmInfoTrigger guideId="pnl-residual" label="Dư ròng trước mặt bằng" />}
          value={formatM(pnl.netResidualVnd, 1)}
          hint={`${pnl.netResidualPct.toFixed(1)}% biên giữ lại`}
          tone={pnl.isProfitable ? 'emerald' : 'rose'}
        />
        <AppleKpiHero
          icon={<Award className="h-3.5 w-3.5 text-violet-500" />}
          label="Quỹ 1 FM (hạch toán)"
          infoSlot={<FmInfoTrigger guideId="kpi-income" label="Quỹ 1 FM (hạch toán)" />}
          value={formatM(fm.fmIncomeOneVnd, 2)}
          hint={`FM ${input.fmLevel} · ${fm.totalEffectiveStars}/24★`}
          tone="neutral"
        />
      </div>

      {/* Main Split Grid */}
      <div className={compact ? 'space-y-4' : 'grid grid-cols-12 gap-4'}>
        <AppleSurface className={compact ? 'space-y-4 p-4' : 'col-span-5 space-y-4 p-5'}>
          <AppleSegmented<BranchKey>
            ariaLabel="Chọn chi nhánh"
            value={input.branch}
            onChange={(branch) => {
              const target = BRANCH_SPECS[branch];
              onChange({
                branch,
                revVnd: revPerCvLocked
                  ? computeLockedRevVnd(target.presetDefaultCvs, 0, lockedRevPerCvM)
                  : target.presetDefaultRev,
                cvs: target.presetDefaultCvs,
                rookieCvs: 0,
              });
            }}
            options={[
              { value: 'dt', label: 'Đề Thám · 18G', icon: <Building2 className="h-3.5 w-3.5" /> },
              { value: 'ep', label: 'Estella · 12G', icon: <Building2 className="h-3.5 w-3.5" /> },
            ]}
            className="w-full"
          />

          <AppleSliderRow
            id="pnl-rev-slider"
            icon={<TrendingUp className="h-3.5 w-3.5 text-blue-500" />}
            label="Doanh thu tháng"
            infoSlot={<FmInfoTrigger guideId="ctrl-revenue" label="Doanh thu tháng" />}
            valueText={`${revM}M`}
            value={revM}
            min={250}
            max={1100}
            step={10}
            hint={`Hòa vốn ${spec.shortName}: ${formatM(spec.breakevenVnd, 0)}`}
            onChange={(nextM) => {
              if (revPerCvLocked) setRevPerCvLocked(false);
              onChange({ revVnd: nextM * 1_000_000 });
            }}
          />

          <FmRevPerCvLockRow
            revPerCvM={displayedRevPerCvM}
            locked={revPerCvLocked}
            matureCvs={fm.matureCvs}
            rookieCvs={input.rookieCvs}
            revVnd={input.revVnd}
            onToggleLock={handleToggleRevLock}
            onChangeRevPerCvM={handleRevPerCvChange}
          />

          <AppleStepperRow
            icon={<Users className="h-3.5 w-3.5 text-neutral-500" />}
            label="Quân số sàn"
            infoSlot={<FmInfoTrigger guideId="ctrl-cvs" label="Quân số sàn" />}
            hint={`Min cổng giường: ${spec.minCvsGate} · ≥13 chính thức & ≥650M tách 2 FM`}
            value={input.cvs}
            min={6}
            max={18}
            suffix=" CV"
            onChange={(cvs) => {
              const nextRookies = Math.min(input.rookieCvs, Math.max(0, cvs - 1));
              onChange({
                cvs,
                rookieCvs: nextRookies,
                ...(revPerCvLocked ? { revVnd: computeLockedRevVnd(cvs, nextRookies, lockedRevPerCvM) } : {}),
              });
            }}
          />

          <AppleStepperRow
            icon={<UserPlus className="h-3.5 w-3.5 text-emerald-500" />}
            label={`CV mới ≤ ${FM_ROOKIE_GRACE_DAYS} ngày (Miễn mẫu số)`}
            infoSlot={<FmInfoTrigger guideId="ctrl-rookies" label={`CV mới ≤ ${FM_ROOKIE_GRACE_DAYS} ngày`} />}
            hint="Cộng DT, không làm loãng REV/CV & Maps"
            value={input.rookieCvs}
            min={0}
            max={Math.max(0, input.cvs - 1)}
            suffix=" mới"
            onChange={(rookieCvs) =>
              onChange({
                rookieCvs,
                ...(revPerCvLocked ? { revVnd: computeLockedRevVnd(input.cvs, rookieCvs, lockedRevPerCvM) } : {}),
              })
            }
          />

          <AppleSliderRow
            id="pnl-autonomy-slider"
            icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
            label="Tỷ lệ Tự lái (Trần 60%)"
            infoSlot={<FmInfoTrigger guideId="ctrl-autonomy-pct" label="Tỷ lệ Tự lái" />}
            valueText={`${pnl.team.effectiveAutonomyPct}%`}
            value={input.autonomyPct}
            min={0}
            max={AUTONOMY_HARD_MAX_PCT}
            step={5}
            hint="Giữ tối thiểu 40% CV để đảm bảo giá trị CVLL"
            onChange={(nextPct) => handleAutonomyChange(nextPct, input.cvllKeyholders)}
          />

          <AppleStepperRow
            icon={<Crown className="h-3.5 w-3.5 text-amber-500" />}
            label="Số CVLL Keyholder"
            infoSlot={<FmInfoTrigger guideId="ctrl-cvll-keyholders" label="Số CVLL Keyholder" />}
            hint="Mở mốc 1★/2★ (≥1) và 3★ (≥2)"
            value={input.cvllKeyholders}
            min={0}
            max={4}
            onChange={(cvll) => handleAutonomyChange(input.autonomyPct, cvll)}
          />

          {/* Self-contained FM Assumptions inside P&L */}
          <div className="space-y-2.5 border-t border-black/5 pt-3 dark:border-white/10">
            <FmHubModePanel input={input} fm={fm} onChange={onChange} />

            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <span>Giả định bậc FM &amp; mức Sao hạch toán</span>
              <FmInfoTrigger guideId="ctrl-fm-level" label="Giả định bậc FM & mức Sao" />
            </div>

            <AppleSegmented<string>
              ariaLabel="Chọn bậc FM hạch toán P&L"
              value={String(input.fmLevel)}
              onChange={(next) => onChange({ fmLevel: Number(next) as FmLevel })}
              options={[
                { value: '1', label: 'FM 1 · 8M' },
                { value: '2', label: 'FM 2 · 9M' },
                { value: '3', label: 'FM 3 · 10M' },
              ]}
              className="w-full"
            />

            <AppleSegmented<string>
              ariaLabel="Mức sao FM giả định"
              value={String(starTier)}
              onChange={(next) => handleStarTierSelect(Number(next) as 0 | 1 | 2 | 3)}
              options={[
                { value: '0', label: '0★' },
                { value: '1', label: '1★ · 1.7M' },
                { value: '2', label: '2★ · 3.4M' },
                { value: '3', label: '3★ · 5.05M' },
              ]}
              className="w-full"
            />
          </div>

          <div className="space-y-1 border-t border-black/5 pt-2 dark:border-white/10">
            <AppleToggleRow
              icon={<HeartHandshake className="h-3.5 w-3.5 text-blue-500" />}
              label="BHXH Doanh nghiệp"
              infoSlot={<FmInfoTrigger guideId="pnl-toggles" label="BHXH Doanh nghiệp" />}
              hint="1.04M/Sàn · 1.16M/Quản lý"
              checked={input.includeEmployerSs}
              onChange={(includeEmployerSs) => onChange({ includeEmployerSs })}
            />
            <AppleToggleRow
              icon={<UserCheck className="h-3.5 w-3.5 text-violet-500" />}
              label="KPI Thưởng CHO"
              infoSlot={<FmInfoTrigger guideId="pnl-toggles" label="KPI Thưởng CHO" />}
              hint="Cứng 11M + Vượt hòa vốn 3% + Khách mới"
              checked={input.choBonusEnabled}
              onChange={(choBonusEnabled) => onChange({ choBonusEnabled })}
            />
            {input.choBonusEnabled ? (
              <AppleStepperRow
                icon={<UserPlus className="h-3.5 w-3.5 text-emerald-500" />}
                label="Khách mới / tháng"
                infoSlot={<FmInfoTrigger guideId="pnl-toggles" label="Khách mới / tháng" />}
                hint="≥ 40 khách mới nhận 3.5M"
                value={input.newCustomers}
                min={10}
                max={80}
                onChange={(newCustomers) => onChange({ newCustomers })}
              />
            ) : null}
          </div>
        </AppleSurface>

        <div className={compact ? 'space-y-4' : 'col-span-7 space-y-4'}>
          <AppleSurface className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <Layers className="h-3.5 w-3.5" />
                <span>Cơ cấu đội ngũ &amp; thực nhận trung bình</span>
              </div>
              <span className="text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                {input.cvs} Sàn · {fm.fmCount} FM · 1 CHO
              </span>
            </div>

            <div className={compact ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-5 gap-2.5'}>
              <div className="rounded-xl bg-neutral-100/80 p-3 dark:bg-neutral-800/70">
                <div className="text-[11px] text-neutral-400 dark:text-neutral-500">CV · {pnl.team.nCv}</div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
                  {formatM(pnl.avgCvTakeHomeVnd, 1)}
                </div>
              </div>

              <div className="rounded-xl bg-amber-50/80 p-3 dark:bg-amber-950/30">
                <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                  <CvFeather1Badge featherClass="h-2.5 w-2.5 text-amber-500" />
                  <span>· {pnl.team.nCvl}</span>
                </div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
                  {formatM(pnl.avgCvlTakeHomeVnd, 1)}
                </div>
              </div>

              <div className="rounded-xl bg-amber-100/70 p-3 dark:bg-amber-900/35">
                <div className="flex items-center gap-1 text-[11px] text-amber-800 dark:text-amber-200">
                  <CvFeather2Badge featherClass="h-2.5 w-2.5 text-amber-500" />
                  <span>· {pnl.team.nCvll}</span>
                </div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
                  {formatM(pnl.avgCvllTakeHomeVnd, 1)}
                </div>
              </div>

              <div className="rounded-xl bg-blue-50/80 p-3 dark:bg-blue-950/30">
                <div className="text-[11px] text-blue-600 dark:text-blue-400">FM · {fm.fmCount}</div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
                  {formatM(fm.fmIncomeOneVnd, 1)}
                </div>
              </div>

              <div className="rounded-xl bg-violet-50/80 p-3 dark:bg-violet-950/30">
                <div className="text-[11px] text-violet-600 dark:text-violet-400">CHO · 1</div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
                  {formatM(pnl.choTotalCashVnd, 1)}
                </div>
              </div>
            </div>
          </AppleSurface>

          <AppleSurface className="space-y-3.5 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <Gift className="h-3.5 w-3.5" />
                <span>Phân bổ quỹ lương &amp; bonus (Real-DB)</span>
              </span>
              <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">Ngoài Tip khách</span>
            </div>

            <AppleProgressRow
              icon={<Users className="h-3.5 w-3.5 text-blue-500" />}
              label="Cứng + Phụ cấp Sàn"
              amountText={formatM(pnl.floorFixedVnd, 1)}
              pctOfRev={(pnl.floorFixedVnd / revPctBase) * 100}
              tone="blue"
              hint="7.05M CV · 7.55M CVL · 8.06M CVLL"
            />

            <AppleProgressRow
              icon={<Sparkles className="h-3.5 w-3.5 text-emerald-500" />}
              label="Thưởng SP Mi (4.2%)"
              amountText={formatM(pnl.floorLashBonusVnd, 1)}
              pctOfRev={4.2}
              tone="emerald"
            />

            <AppleProgressRow
              icon={<Gift className="h-3.5 w-3.5 text-amber-500" />}
              label="Combo &amp; SP phụ (3.28%)"
              amountText={formatM(pnl.floorComboBonusVnd, 1)}
              pctOfRev={3.28}
              tone="amber"
            />

            <AppleProgressRow
              icon={<Award className="h-3.5 w-3.5 text-violet-500" />}
              label={`Quỹ FM (${fm.fmCount} người)`}
              amountText={formatM(pnl.fmTotalCashVnd, 1)}
              pctOfRev={(pnl.fmTotalCashVnd / revPctBase) * 100}
              tone="violet"
              hint={`${(fm.revPoolRate * 100).toFixed(2)}% DT/FM · ${fm.matureCvs} chính thức${fm.rookieCvs > 0 ? ` + ${fm.rookieCvs} mới` : ''}`}
            />

            <AppleProgressRow
              icon={<Crown className="h-3.5 w-3.5 text-rose-500" />}
              label="Quỹ CHO (1 người)"
              amountText={formatM(pnl.choTotalCashVnd, 1)}
              pctOfRev={(pnl.choTotalCashVnd / revPctBase) * 100}
              tone="rose"
              hint={`Cứng 11.0M · KPI ${formatM(pnl.choBonusVnd, 1)}`}
            />

            {input.includeEmployerSs ? (
              <AppleProgressRow
                icon={<HeartHandshake className="h-3.5 w-3.5 text-neutral-500" />}
                label="BHXH Doanh nghiệp"
                amountText={formatM(pnl.employerSsVnd, 1)}
                pctOfRev={(pnl.employerSsVnd / revPctBase) * 100}
                tone="blue"
              />
            ) : null}

            <AppleProgressRow
              icon={<Sparkles className="h-3.5 w-3.5 text-amber-500" />}
              label="Quỹ Shop & Weekly Quest (Văn hóa)"
              amountText={formatM(pnl.shopCultureFundVnd, 1)}
              pctOfRev={pnl.shopCulturePctOfRev}
              tone="amber"
              hint={`Ngoài lương FM · Fun ${formatM(fm.funFundVnd * fm.fmCount, 1)} + Quest ${formatM(fm.weeklyQuestFundVnd, 1)}`}
            />
          </AppleSurface>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  PackageCheck,
  ClipboardList,
  Sparkles,
  Gift,
  TrendingUp,
  RotateCcw,
  Save,
  Plus,
  Minus,
  Play,
  LogOut,
  UserCheck,
  AlertTriangle,
  FlaskConical,
} from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { useTodaySandbox, type MaterialStatus } from '../context/SandboxModeContext';
import { formatVND } from '../../../../lib/format-utils';
import { CvFeather1Badge, CvFeather2Badge } from '../../../ios-app/components/ui-kit/CvFeatherLabels';

const MATERIAL_STATUS_META: Record<
  MaterialStatus,
  { label: string; lightClass: string; darkClass: string }
> = {
  sufficient: {
    label: 'Đủ dùng',
    lightClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    darkClass: 'bg-emerald-950/40 text-emerald-300 border-emerald-800',
  },
  low: {
    label: 'Sắp hết',
    lightClass: 'bg-amber-50 text-amber-700 border-amber-200',
    darkClass: 'bg-amber-950/40 text-amber-300 border-amber-800',
  },
  restock_needed: {
    label: 'Cần bổ sung',
    lightClass: 'bg-rose-50 text-rose-700 border-rose-200',
    darkClass: 'bg-rose-950/40 text-rose-300 border-rose-800',
  },
};

export default function SandboxControlPanel() {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const sandbox = useTodaySandbox();
  const [customerDraft, setCustomerDraft] = useState('Chị Thanh');

  if (!sandbox.isSandbox) return null;

  const surfaceCard = isDark
    ? 'bg-slate-900/90 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';

  const subCard = isDark
    ? 'bg-slate-950/70 border-slate-800 text-slate-200'
    : 'bg-slate-50 border-slate-200 text-slate-800';

  const staffEntries = Object.entries(sandbox.staffOverrides);

  return (
    <section
      aria-label="Bảng điều khiển đa chế độ Sandbox"
      className={`rounded-xl border p-4 shadow-sm transition-colors space-y-4 ${surfaceCard}`}
    >
      {/* Top Preset Bar (PA #1, PA #2, Save & Reset) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <FlaskConical className="w-4 h-4" />
            <span>Kịch bản mẫu (Presets):</span>
          </span>
          {sandbox.presets.map((preset) => {
            const isActive = sandbox.activePresetId === preset.id && sandbox.mode === preset.mode;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => sandbox.applyPreset(preset.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-amber-50 border-amber-400 text-amber-900'
                    : isDark
                      ? 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="font-bold">{preset.code}</span>
                <span>· {preset.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => sandbox.saveCurrentAsPreset()}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Save className="w-3.5 h-3.5 text-blue-500" />
            <span>Lưu PA mới</span>
          </button>
          <button
            type="button"
            onClick={sandbox.resetAllSandbox}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
            <span>Đặt lại tất cả</span>
          </button>
        </div>
      </div>

      {sandbox.mode === 'training' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Column 1: Giả lập Check-in / Bấm giờ / Check-out */}
          <div className={`rounded-xl border p-3.5 flex flex-col gap-3 ${subCard}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                <h3 className="text-sm font-bold m-0">Giả lập Check-in · Bấm giờ · Check-out</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => sandbox.simulateBatchCheckInAll('ALL')}
                  className="px-2 py-1 rounded text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
                >
                  Check-in cả ca
                </button>
                <button
                  type="button"
                  onClick={() => sandbox.simulateBatchStartAllTimers()}
                  className="px-2 py-1 rounded text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-500 cursor-pointer"
                >
                  Bấm giờ đồng loạt
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {staffEntries.map(([staffName, ov]) => {
                const isTimerRunning = Boolean(ov.timerStartedAt);
                const roleType: 'CV' | 'CC' = staffName.startsWith('CC') ? 'CC' : 'CV';
                return (
                  <div
                    key={staffName}
                    className={`rounded-lg border p-2.5 flex items-center justify-between gap-2 ${
                      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate">{staffName}</span>
                        {isTimerRunning && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-500 tabular-nums leading-none">
                            <Clock className="w-3 h-3" />
                            <span>{sandbox.formatStaffTimerMMSS(staffName)}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate m-0 mt-0.5">
                        {ov.doing || 'Sẵn sàng mô phỏng'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {ov.attendance === 'none' || ov.attendance === 'checked_out' ? (
                        <button
                          type="button"
                          onClick={() => sandbox.simulateStaffCheckIn(staffName, roleType)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Check-in</span>
                        </button>
                      ) : isTimerRunning ? (
                        <button
                          type="button"
                          onClick={() => sandbox.simulateStaffStopTimer(staffName)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Xong mi</span>
                        </button>
                      ) : (
                        <>
                          {roleType === 'CV' && (
                            <button
                              type="button"
                              onClick={() => sandbox.simulateStaffStartTimer(staffName)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                            >
                              <Play className="w-3 h-3" />
                              <span>Bấm giờ</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => sandbox.simulateStaffCheckOut(staffName, roleType)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                              isDark
                                ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Check-out</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Kế hoạch thiết kế hôm nay */}
          <div className={`rounded-xl border p-3.5 flex flex-col gap-3 ${subCard}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-purple-500 shrink-0" />
                <h3 className="text-sm font-bold m-0">Kế hoạch thiết kế hôm nay</h3>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-600 dark:text-purple-300 tabular-nums leading-none">
                {sandbox.designPlanTotals.completed}/{sandbox.designPlanTotals.target} ca
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {sandbox.designPlanItems.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-lg border p-2.5 flex items-center justify-between gap-2 ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold">{plan.designName}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        ({plan.estimatedMinutes}p)
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {plan.assignedRoleLabel === 'CVL' && <CvFeather1Badge featherClass="w-3 h-3" />}
                      {plan.assignedRoleLabel === 'CVLL' && <CvFeather2Badge featherClass="w-3 h-3" />}
                      <span className="truncate">{plan.assignedStaff}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      aria-label={`Giảm chỉ tiêu ${plan.designName}`}
                      onClick={() => sandbox.updateDesignPlanTarget(plan.id, -1)}
                      className={`p-1 rounded border cursor-pointer ${
                        isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold tabular-nums min-w-10 text-center">
                      {plan.completedCount}/{plan.targetCount}
                    </span>
                    <button
                      type="button"
                      aria-label={`Tăng chỉ tiêu ${plan.designName}`}
                      onClick={() => sandbox.updateDesignPlanTarget(plan.id, 1)}
                      className={`p-1 rounded border cursor-pointer ${
                        isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => sandbox.incrementDesignPlanDone(plan.id)}
                      className="px-2 py-1 rounded text-[11px] font-semibold bg-purple-600 text-white hover:bg-purple-500 cursor-pointer tabular-nums"
                    >
                      +1 Ca
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Check nguyên vật liệu */}
          <div className={`rounded-xl border p-3.5 flex flex-col gap-3 ${subCard}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <h3 className="text-sm font-bold m-0">Check nguyên vật liệu trước ca</h3>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold tabular-nums leading-none ${
                  sandbox.materialReadyCount === sandbox.materialsChecklist.length
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                }`}
              >
                <span>
                  {sandbox.materialReadyCount}/{sandbox.materialsChecklist.length} Đạt
                </span>
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {sandbox.materialsChecklist.map((mat) => {
                const statusMeta = MATERIAL_STATUS_META[mat.status];
                return (
                  <div
                    key={mat.id}
                    className={`rounded-lg border p-2.5 flex items-center justify-between gap-2 ${
                      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => sandbox.toggleMaterialCheck(mat.id)}
                      className="flex items-start gap-2 text-left min-w-0 cursor-pointer"
                    >
                      <span
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          mat.checked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : isDark
                              ? 'border-slate-600'
                              : 'border-slate-300'
                        }`}
                      >
                        {mat.checked && <CheckCircle2 className="w-3 h-3" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold truncate">{mat.name}</span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {mat.stockLabel}
                          {mat.checkedAt ? ` · Đã check ${mat.checkedAt}` : ''}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => sandbox.cycleMaterialStatus(mat.id)}
                      title="Bấm để chuyển trạng thái tồn kho giả lập"
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border shrink-0 leading-none cursor-pointer ${
                        isDark ? statusMeta.darkClass : statusMeta.lightClass
                      }`}
                    >
                      {mat.status === 'restock_needed' && <AlertTriangle className="w-3 h-3" />}
                      <span>{statusMeta.label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* SALES SIMULATION MODE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Form chốt gói Combo, add sản phẩm & quà tặng */}
          <div className={`lg:col-span-7 rounded-xl border p-3.5 space-y-3 ${subCard}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold m-0">Mô phỏng bán gói Combo · Sản phẩm · Quà tặng</h3>
              </div>
              <input
                type="text"
                value={customerDraft}
                onChange={(e) => setCustomerDraft(e.target.value)}
                aria-label="Tên khách hàng giả lập"
                placeholder="Tên khách giả lập..."
                className={`px-2.5 py-1 rounded-lg border text-xs w-44 ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-100'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  sandbox.simulateAddCombo({
                    name: 'Combo 10 Tặng 6 (Mi Thiết Kế VIP)',
                    price: 5_900_000,
                    customerName: customerDraft || 'Chị Thanh',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer tabular-nums"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Chốt Combo 10 tặng 6 (+5.900.000 đ)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  sandbox.simulateAddCombo({
                    name: 'Combo Mi Dưỡng Phục Hồi',
                    price: 1_800_000,
                    customerName: customerDraft || 'Chị Thanh',
                  })
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer tabular-nums ${
                  isDark
                    ? 'bg-slate-900 border-amber-500/40 text-amber-300 hover:bg-slate-800'
                    : 'bg-white border-amber-300 text-amber-800 hover:bg-amber-50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Combo Mi Dưỡng (+1.800.000 đ)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  sandbox.simulateAddProduct({
                    name: 'Serum Dưỡng Mi FKN Tế Bào Gốc',
                    price: 450_000,
                    customerName: customerDraft || 'Chị Thanh',
                  })
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer tabular-nums ${
                  isDark
                    ? 'bg-slate-900 border-blue-500/40 text-blue-300 hover:bg-slate-800'
                    : 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Serum (+450.000 đ)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  sandbox.simulateAddGift({
                    name: 'Tặng Cọ pha lê + Mặt nạ mắt Collagen',
                    estimatedValue: 180_000,
                    customerName: customerDraft || 'Chị Thanh',
                  })
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-pink-500/40 text-pink-300 hover:bg-slate-800'
                    : 'bg-white border-pink-300 text-pink-700 hover:bg-pink-50'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>+ Tặng Quà VIP (Tăng tỉ lệ chốt)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className={`rounded-lg border p-2.5 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Gói Combo đã chốt</span>
                <div className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                  {sandbox.simulatedCombos.length} gói · {formatVND(sandbox.totalSimulatedComboRevenue)}
                </div>
              </div>
              <div className={`rounded-lg border p-2.5 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Sản phẩm bán kèm</span>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums mt-0.5">
                  {sandbox.simulatedProducts.length} SP · {formatVND(sandbox.totalSimulatedProductRevenue)}
                </div>
              </div>
              <div className={`rounded-lg border p-2.5 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Quà tặng kèm ưu đãi</span>
                <div className="text-sm font-bold text-pink-600 dark:text-pink-400 tabular-nums mt-0.5">
                  {sandbox.simulatedGifts.length} quà tặng
                </div>
              </div>
            </div>
          </div>

          {/* Đồng hồ đo Tỉ lệ chốt dự kiến */}
          <div className={`lg:col-span-5 rounded-xl border p-3.5 flex flex-col justify-start gap-4 ${subCard}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold m-0">Đồng hồ đo Tỉ lệ chốt dự kiến</h3>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 tabular-nums leading-none">
                +{sandbox.closingUpliftPercent}% uplift
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Mức nền không quà: <strong className="tabular-nums">{sandbox.baselineClosingRate}%</strong>
                </span>
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {sandbox.closingRate}%
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full overflow-hidden">
                <svg
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                  className="w-full h-full block"
                  role="progressbar"
                  aria-label="Tỉ lệ chốt dự kiến"
                  aria-valuenow={sandbox.closingRate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <rect x="0" y="0" width="100" height="8" className="fill-slate-200 dark:fill-slate-800" />
                  <rect
                    x="0"
                    y="0"
                    width={sandbox.closingRate}
                    height="8"
                    rx="4"
                    className="fill-emerald-500 transition-all duration-300"
                  />
                </svg>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">
                Tổng doanh thu mô phỏng:{' '}
                <strong className="text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatVND(sandbox.totalSimulatedRevenue)}
                </strong>{' '}
                (Kết hợp Combo + Sản phẩm + Quà tặng giúp nâng tỉ lệ chốt dự kiến).
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

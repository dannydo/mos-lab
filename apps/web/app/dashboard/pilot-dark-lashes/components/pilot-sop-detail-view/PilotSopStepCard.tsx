'use client';

import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  HelpCircle,
  Image as ImageIcon,
  Maximize2,
  Package,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
} from 'lucide-react';
import type { PilotSopStepDetail, PilotSopStepEmpiricalStat } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui/AppIcon';
import {
  PILOT_REAL_STEP_MEDIA,
  formatSecondsToDisplay,
  tagInstruction,
  type PilotRealStepMedia,
} from './pilot-sop-detail-helpers';
import { PilotSopStepDeepDive } from './PilotSopStepDeepDive';

interface PilotSopStepCardProps {
  step: PilotSopStepDetail;
  stat?: PilotSopStepEmpiricalStat;
  isExpanded: boolean;
  isDeepDiveOpen: boolean;
  onToggleExpand: (stepOrder: number) => void;
  onToggleDeepDive: (stepOrder: number) => void;
  onOpenPreviewMedia: (media: PilotRealStepMedia) => void;
  onViewSessionId?: (sessionId: number) => void;
}

export function PilotSopStepCard({
  step,
  stat,
  isExpanded,
  isDeepDiveOpen,
  onToggleExpand,
  onToggleDeepDive,
  onOpenPreviewMedia,
  onViewSessionId,
}: PilotSopStepCardProps) {
  const hasEmpirical = Boolean(stat && stat.completedCount > 0);
  const stepRealMedia = PILOT_REAL_STEP_MEDIA[step.stepOrder];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all duration-300">
      {/* Step Card Header (Click to toggle collapse) */}
      <div
        onClick={() => onToggleExpand(step.stepOrder)}
        className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
        data-testid={`step-header-${step.stepOrder}`}
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs">
            {step.stepOrder}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Bước {step.stepOrder}/7
              </span>
              <span className="inline-flex items-center justify-center leading-none text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 tabular-nums">
                <AppIcon icon={Timer} size={11} className="mr-1" />
                Tiêu chuẩn: {step.targetMinutes} phút
              </span>
              {hasEmpirical && stat && (
                <span className="inline-flex items-center justify-center leading-none text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 tabular-nums">
                  <AppIcon icon={Clock} size={11} className="mr-1" />
                  Thực tế TB: {formatSecondsToDisplay(stat.avgDurationSeconds)} ({stat.completedCount} ca)
                </span>
              )}
              <span className="text-[11px] text-slate-400 font-medium">
                • {step.materials.length} vật tư • {step.qualityCheckpoints.length} điểm QC • {step.commonErrors.length}{' '}
                lỗi phòng tránh
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0 mt-0.5">
              {step.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          {step.unverifiedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/25 shrink-0">
              <AppIcon icon={HelpCircle} size={13} className="text-amber-600 shrink-0" />
              <span>{step.unverifiedNotice}</span>
            </span>
          )}

          <div className="w-8 h-8 rounded-lg bg-slate-200/60 dark:bg-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <AppIcon icon={isExpanded ? ChevronUp : ChevronDown} size={16} />
          </div>
        </div>
      </div>

      {/* Step Card Body (5 phần chuẩn mực) */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6 animate-fadeIn">
          {/* PHẦN 1: MỤC ĐÍCH CHUYÊN MÔN */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <AppIcon icon={Compass} size={14} className="text-teal-600" />
                <span>Mục đích chuyên môn</span>
              </div>
              <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold bg-teal-500/10 px-2 py-0.5 rounded-md">
                Ý nghĩa kỹ thuật
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-teal-500/5 dark:bg-teal-500/10 p-3.5 rounded-xl border border-teal-500/15 m-0 font-medium">
              {step.purpose}
            </p>
          </div>

          {/* PHẦN 2 & PHẦN 3: CÁCH THỰC HIỆN & VẬT TƯ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* PHẦN 2: CÁCH THỰC HIỆN (HƯỚNG DẪN THAO TÁC TUẦN TỰ) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <AppIcon icon={BookOpen} size={14} className="text-emerald-600" />
                  <span>Hướng dẫn thao tác kỹ thuật chuẩn mực</span>
                </div>
                <span className="text-[11px] text-slate-400">{step.instructions.length} bước con tuần tự</span>
              </div>

              <ol className="m-0 p-0 list-none space-y-2.5">
                {step.instructions.map((ins, idx) => {
                  const tagged = tagInstruction(ins);
                  return (
                    <li
                      key={`${step.stepOrder}-ins-${idx}`}
                      className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800"
                    >
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        {idx + 1}
                      </span>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {tagged.level === 'MANDATORY' && (
                            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              <AppIcon icon={CheckCircle2} size={10} className="mr-1" />
                              Bắt buộc
                            </span>
                          )}
                          {tagged.level === 'TECH_TIP' && (
                            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              <AppIcon icon={Sparkles} size={10} className="mr-1" />
                              Lưu ý kỹ thuật
                            </span>
                          )}
                          {tagged.level === 'SAFETY_ALERT' && (
                            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              <AppIcon icon={AlertTriangle} size={10} className="mr-1" />
                              Cảnh báo an toàn
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                            Thao tác {step.stepOrder}.{idx + 1}
                          </span>
                        </div>
                        <p className="leading-relaxed m-0 text-slate-700 dark:text-slate-300">{tagged.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* PHẦN 3: DỤNG CỤ & VẬT TƯ SỬ DỤNG */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <AppIcon icon={Package} size={14} className="text-purple-600" />
                  <span>Dụng cụ &amp; Vật tư sử dụng</span>
                </div>
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded-md">
                  Định lượng chuẩn
                </span>
              </div>

              <div className="space-y-2">
                {step.materials.map((mat, idx) => (
                  <div
                    key={`${step.stepOrder}-mat-${idx}-${mat.name}`}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-start justify-between gap-2 shadow-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">{mat.name}</span>
                      {mat.purposeNote && (
                        <span className="text-[11.5px] text-slate-500 dark:text-slate-400 block leading-snug">
                          {mat.purposeNote}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {mat.estimatedAmount && (
                        <span className="inline-block text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 tabular-nums">
                          {mat.estimatedAmount}
                        </span>
                      )}
                      {mat.isDisposable && (
                        <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">Tiêu hao 1 lần</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PHẦN 4 & PHẦN 5: ĐIỂM KIỂM SOÁT QC & LỖI THƯỜNG GẶP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            {/* PHẦN 4: ĐIỂM KIỂM SOÁT CHẤT LƯỢNG (QC) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <AppIcon icon={ShieldCheck} size={14} className="text-emerald-600" />
                  <span>Điểm kiểm soát chất lượng &amp; Tiêu chuẩn hoàn thành</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  100% Đạt
                </span>
              </div>

              <ul className="m-0 p-0 list-none space-y-2">
                {step.qualityCheckpoints.map((qc, idx) => (
                  <li
                    key={`${step.stepOrder}-qc-${idx}`}
                    className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/20 shadow-2xs"
                  >
                    <AppIcon icon={CheckCircle2} size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{qc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* PHẦN 5: LỖI KỸ THUẬT THƯỜNG GẶP & PHƯƠNG ÁN XỬ LÝ */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <AppIcon icon={ShieldAlert} size={14} className="text-rose-600" />
                  <span>Lỗi kỹ thuật thường gặp &amp; Phương án xử lý</span>
                </div>
                <span className="text-[10px] font-semibold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md">
                  Khắc phục tức thì
                </span>
              </div>

              <div className="space-y-2.5">
                {step.commonErrors.map((err, idx) => (
                  <div
                    key={`${step.stepOrder}-err-${idx}-${err.error}`}
                    className="p-3.5 rounded-xl border border-rose-500/25 bg-rose-50/40 dark:bg-rose-950/20 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                      <AppIcon icon={AlertTriangle} size={14} className="shrink-0" />
                      <span>{err.error}</span>
                    </div>
                    {err.cause && (
                      <p className="text-[11.5px] text-slate-600 dark:text-slate-400 m-0 leading-snug">
                        <strong className="text-slate-700 dark:text-slate-300">Nguyên nhân:</strong> {err.cause}
                      </p>
                    )}
                    <p className="text-[11.5px] text-emerald-800 dark:text-emerald-300 m-0 leading-snug font-medium pt-1.5 border-t border-rose-200/50 dark:border-rose-900/40 flex items-start gap-1.5">
                      <AppIcon icon={Check} size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Khắc phục tức thì:</strong> {err.remedy}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* HÌNH ẢNH MINH HỌA THỰC TẾ NẾU CÓ DỮ LIỆU */}
          {stepRealMedia && (
            <div className="p-3.5 rounded-xl border border-teal-500/20 bg-teal-500/5 dark:bg-teal-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-teal-500/30 shrink-0 relative bg-slate-900">
                  <img src={stepRealMedia.photoUrl} alt={stepRealMedia.label} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300">
                    <AppIcon icon={ImageIcon} size={13} className="text-teal-600" />
                    <span>{stepRealMedia.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 m-0 mt-0.5">
                    {stepRealMedia.sessionNote}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenPreviewMedia(stepRealMedia)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-teal-500/30 hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <AppIcon icon={Maximize2} size={12} />
                <span>Xem ảnh phóng to</span>
              </button>
            </div>
          )}

          {/* KHỐI MỞ RỘNG: DỮ LIỆU CHUYÊN SÂU & MINH CHỨNG CA PILOT THỰC TẾ */}
          <PilotSopStepDeepDive
            stepOrder={step.stepOrder}
            stat={stat}
            isOpen={isDeepDiveOpen}
            onToggle={onToggleDeepDive}
            onViewSessionId={onViewSessionId}
          />
        </div>
      )}
    </div>
  );
}

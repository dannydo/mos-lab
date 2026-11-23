'use client';

import React from 'react';
import { Card } from 'antd';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Info,
  Maximize2,
  Sliders,
  XCircle,
} from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';
import { hideBrokenImage } from './pilot-criteria-sop.helpers';
import type { PreviewPhotoState, SopCriterionDetail } from './pilot-criteria-sop.types';

interface CriteriaChecklistCardProps {
  criterion: SopCriterionDetail;
  isExpanded: boolean;
  isDeepDiveOpen: boolean;
  onToggleExpand: (id: number) => void;
  onToggleDeepDive: (id: number) => void;
  onPreviewPhoto: (photo: PreviewPhotoState) => void;
}

export function CriteriaChecklistCard({
  criterion: crit,
  isExpanded,
  isDeepDiveOpen,
  onToggleExpand,
  onToggleDeepDive,
  onPreviewPhoto,
}: CriteriaChecklistCardProps) {
  return (
    <Card
      variant="outlined"
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        isExpanded
          ? 'border-emerald-500/30 dark:border-emerald-500/20 shadow-xs'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
      data-testid={`sop-criterion-card-${crit.id}`}
    >
      {/* Header Tiêu chí có thể bấm mở/thu gọn */}
      <div
        onClick={() => onToggleExpand(crit.id)}
        className="flex items-center justify-between gap-3 cursor-pointer select-none"
        data-testid={`sop-criterion-header-${crit.id}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm transition-colors tabular-nums ${
              isExpanded
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {crit.order}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                Tiêu chí {crit.order}: {crit.name}
              </h3>
              <span className="inline-flex items-center justify-center leading-none text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Checklist Bước 3
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">ĐẠT: {crit.quickBadge.pass}</span>
              <span>•</span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">FAIL: {crit.quickBadge.fail}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs text-slate-400 hidden sm:inline tabular-nums">
            {crit.pilotEvidences.length} ca minh chứng
          </span>
          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
            <AppIcon icon={isExpanded ? ChevronUp : ChevronDown} size={15} />
          </div>
        </div>
      </div>

      {/* Nội dung chi tiết 5 phần theo chuẩn */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
          {/* Phần 1: MỤC ĐÍCH */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <AppIcon icon={Info} size={14} className="text-emerald-500" />
              <span>1. Mục đích kiểm tra:</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 m-0 leading-relaxed">{crit.purpose}</p>
          </div>

          {/* Phần 2: CÁCH KIỂM TRA & DỤNG CỤ */}
          <div className="p-3 rounded-xl bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/20 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300">
                <AppIcon icon={Eye} size={14} className="text-teal-500" />
                <span>2. Cách kiểm tra thực tế:</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-teal-700 dark:text-teal-400 flex-wrap">
                <span className="font-semibold">Dụng cụ:</span>
                {crit.inspectionTools.map((tool) => (
                  <span
                    key={tool}
                    className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/20 text-[10.5px]"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 m-0 leading-relaxed">{crit.inspectionMethod}</p>
          </div>

          {/* Phần 3: ĐẠT (PASS) vs KHÔNG ĐẠT (FAIL) */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">3. Tiêu chuẩn ĐẠT / KHÔNG ĐẠT:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Cột ĐẠT (PASS) */}
              <div className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <AppIcon icon={CheckCircle2} size={15} className="text-emerald-500 shrink-0" />
                    <span>{crit.passStandard.title}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    ĐẠT CHUẨN
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 m-0">{crit.passStandard.description}</p>
                <ul className="m-0 p-0 list-none space-y-1 pt-1">
                  {crit.passStandard.indicators.map((ind) => (
                    <li key={ind} className="flex items-start gap-1.5 text-[11.5px] text-slate-700 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span className="leading-tight">{ind}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cột KHÔNG ĐẠT (FAIL) */}
              <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                    <AppIcon icon={XCircle} size={15} className="text-rose-500 shrink-0" />
                    <span>{crit.failStandard.title}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300">
                    TỪ CHỐI AN TOÀN
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 m-0">{crit.failStandard.description}</p>
                <ul className="m-0 p-0 list-none space-y-1 pt-1">
                  {crit.failStandard.indicators.map((ind) => (
                    <li key={ind} className="flex items-start gap-1.5 text-[11.5px] text-slate-700 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <span className="leading-tight">{ind}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Phần 4: VÍ DỤ THỰC TẾ TỪ 17 CA PILOT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                4. Minh chứng thực tế từ 17 ca Pilot Đề Thám:
              </div>
              <span className="text-[11px] text-slate-400">Ảnh chụp lâm sàng thật · Không dùng ảnh minh họa</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {crit.pilotEvidences.map((ev, idx) => {
                const isFail = ev.type === 'FAIL';
                return (
                  <div
                    key={`${crit.id}-ev-${ev.sessionId}-${idx}`}
                    className={`p-3 rounded-xl border text-xs space-y-2 ${
                      isFail
                        ? 'bg-rose-500/5 dark:bg-rose-950/10 border-rose-500/20 text-rose-900 dark:text-rose-200'
                        : 'bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                            isFail
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                              : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {isFail ? `FAIL #${ev.sessionId}` : `PASS #${ev.sessionId}`}
                        </span>
                        <span>{ev.customerName}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 tabular-nums">{ev.date}</span>
                    </div>

                    {ev.photoUrl ? (
                      <div className="space-y-1">
                        <div
                          onClick={() =>
                            onPreviewPhoto({
                              url: ev.photoUrl!,
                              title: `Minh chứng Ca #${ev.sessionId} – ${ev.customerName}`,
                              subtitle: ev.detail,
                            })
                          }
                          className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-24 bg-slate-950 cursor-pointer group"
                        >
                          <img
                            src={ev.photoUrl}
                            alt={`Ảnh ca #${ev.sessionId}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            onError={hideBrokenImage}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] gap-1">
                            <AppIcon icon={Maximize2} size={12} />
                            <span>Phóng to</span>
                          </div>
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9.5px] font-medium backdrop-blur-xs">
                            Ảnh thực tế
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <AppIcon icon={FileText} size={12} className="shrink-0" />
                        <span>Biên bản đánh giá lâm sàng (Không lưu ảnh)</span>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 m-0 leading-tight">{ev.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phần 5: LƯU Ý CHUYÊN MÔN & THÔNG SỐ KTV MỞ RỘNG */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            {crit.expertConfirmationNote && (
              <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl">
                <AppIcon icon={AlertTriangle} size={14} className="text-amber-500 shrink-0" />
                <span>
                  <strong>Lưu ý chuyên môn:</strong> {crit.expertConfirmationNote}
                </span>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden">
              <button
                type="button"
                onClick={() => onToggleDeepDive(crit.id)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                data-testid={`toggle-deep-dive-${crit.id}`}
              >
                <div className="flex items-center gap-2">
                  <AppIcon icon={Sliders} size={13} className="text-violet-500" />
                  <span>{crit.ktvDeepDive.title}</span>
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  {isDeepDiveOpen ? 'Thu gọn thông số' : 'Mở rộng thông số KTV'}
                  <AppIcon icon={isDeepDiveOpen ? ChevronUp : ChevronDown} size={13} />
                </span>
              </button>

              {isDeepDiveOpen && (
                <div className="px-3.5 pb-3.5 pt-1 space-y-2 text-xs border-t border-slate-200/50 dark:border-slate-800/50">
                  <ul className="m-0 p-0 list-none space-y-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                    {crit.ktvDeepDive.specifications.map((spec) => (
                      <li key={spec} className="flex items-start gap-1.5">
                        <span className="text-violet-500 font-bold mt-0.5">•</span>
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                  {crit.ktvDeepDive.chemistryNote && (
                    <div className="p-2 rounded-lg bg-violet-500/10 text-violet-800 dark:text-violet-200 border border-violet-500/20 text-[11px]">
                      <strong>Cơ chế hóa sinh:</strong> {crit.ktvDeepDive.chemistryNote}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

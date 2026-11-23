'use client';

import React from 'react';
import { Button } from 'antd';
import { CheckCircle2, ExternalLink, FileText, XCircle } from 'lucide-react';
import type { PilotSession } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui/AppIcon';
import { formatCriteriaDate, hideBrokenImage } from './pilot-criteria-sop.helpers';
import type { PreviewPhotoState } from './pilot-criteria-sop.types';
import { CRIT_NAME_LIST } from './sop-criteria-catalog';

interface CriteriaEvidenceCardProps {
  session: PilotSession;
  onPreviewPhoto: (photo: PreviewPhotoState) => void;
  onOpenSessionFlow?: (session: PilotSession) => void;
}

export function CriteriaEvidenceCard({ session: s, onPreviewPhoto, onOpenSessionFlow }: CriteriaEvidenceCardProps) {
  const isFail = s.assessmentStatus === 'FAIL' || s.status === 'INELIGIBLE';
  const isCase10 = s.id === 10;
  const hasPhoto = Boolean(s.beforePhotoUrl || s.afterPhotoUrl);

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
        isCase10
          ? 'border-rose-500/40 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent ring-1 ring-rose-500/30 shadow-sm'
          : isFail
            ? 'border-rose-500/20 bg-rose-500/[0.02] dark:bg-rose-950/10'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Cột 1: Thông tin ca */}
        <div className="space-y-1.5 min-w-[220px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 tabular-nums">
              Ca #{s.id}
            </span>
            {isCase10 && (
              <span className="inline-flex items-center justify-center leading-none text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-xs">
                Điển hình FAIL Case Study
              </span>
            )}
            <span
              className={`inline-flex items-center justify-center leading-none text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                isFail
                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
              }`}
            >
              {isFail ? 'FAIL · TỪ CHỐI AN TOÀN' : 'PASS · ĐỦ ĐIỀU KIỆN'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{s.customerName}</span>
            <span>•</span>
            <span className="tabular-nums">{formatCriteriaDate(s.sessionDate)}</span>
            <span>•</span>
            <span>CV: {s.technicianName || 'Cô Đẫm'}</span>
          </div>
        </div>

        {/* Cột 2: Ảnh minh chứng thu nhỏ nếu có */}
        <div className="shrink-0 flex items-center gap-2">
          {s.beforePhotoUrl ? (
            <div
              onClick={() =>
                onPreviewPhoto({
                  url: s.beforePhotoUrl!,
                  title: `Ảnh Trước Uốn – Ca #${s.id} (${s.customerName})`,
                  subtitle: s.assessmentNotes || s.assessmentReason || 'Hồ sơ lâm sàng ca Pilot Đề Thám',
                })
              }
              className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 cursor-pointer relative group shrink-0"
              title="Bấm xem ảnh Before lớn"
            >
              <img
                src={s.beforePhotoUrl}
                alt="Before"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                onError={hideBrokenImage}
              />
              <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-white text-center py-0.5">
                Before
              </span>
            </div>
          ) : null}

          {s.afterPhotoUrl ? (
            <div
              onClick={() =>
                onPreviewPhoto({
                  url: s.afterPhotoUrl!,
                  title: `Ảnh Sau Uốn Hoàn Tất – Ca #${s.id} (${s.customerName})`,
                  subtitle: s.assessmentNotes || 'Kết quả uốn mi bóng tối chuẩn mực',
                })
              }
              className="w-14 h-14 rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-950 cursor-pointer relative group shrink-0"
              title="Bấm xem ảnh After lớn"
            >
              <img
                src={s.afterPhotoUrl}
                alt="After"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                onError={hideBrokenImage}
              />
              <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-[9px] text-white text-center py-0.5 font-bold">
                After
              </span>
            </div>
          ) : null}

          {!hasPhoto && (
            <div className="w-14 h-14 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-[9.5px] text-slate-400 text-center px-1">
              <AppIcon icon={FileText} size={14} className="mb-0.5" />
              <span>Biên bản</span>
            </div>
          )}
        </div>

        {/* Cột 3: Checklist 5 tiêu chí */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Checklist 5 Tiêu chí:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {CRIT_NAME_LIST.map((crit) => {
              const evalItem = s.assessmentCriteria?.find((c) => c.criterionId === crit.id || c.name === crit.short);
              const passed = evalItem ? evalItem.passed : !isFail;
              return (
                <span
                  key={crit.id}
                  className={`inline-flex items-center justify-center leading-none gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${
                    passed
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                  }`}
                >
                  {passed ? (
                    <AppIcon icon={CheckCircle2} size={11} className="text-emerald-500" />
                  ) : (
                    <AppIcon icon={XCircle} size={11} className="text-rose-500" />
                  )}
                  <span>{crit.short}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Cột 4: Lý do & Hướng xử lý */}
        <div className="flex-1 max-w-xl text-xs space-y-1">
          {s.assessmentReason && (
            <div className="text-rose-700 dark:text-rose-300">
              <strong>Lý do từ chối:</strong> {s.assessmentReason}
            </div>
          )}
          {s.assessmentNotes && (
            <div className="text-slate-600 dark:text-slate-300">
              <strong>Hướng xử lý:</strong> {s.assessmentNotes}
            </div>
          )}
          {!s.assessmentReason && !s.assessmentNotes && (
            <div className="text-slate-500 dark:text-slate-400 italic">
              Đủ điều kiện, hoàn tất quy trình uốn mi bóng tối chuẩn mực.
            </div>
          )}
        </div>

        {/* Cột 5: Nút Xem Ca Gốc */}
        <div className="shrink-0 flex items-center gap-2">
          {onOpenSessionFlow && (
            <Button
              size="small"
              onClick={() => onOpenSessionFlow(s)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-xl ${
                isCase10
                  ? 'border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              data-testid={`view-session-flow-${s.id}`}
            >
              <AppIcon icon={ExternalLink} size={12} />
              <span>Xem ca gốc #{s.id}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

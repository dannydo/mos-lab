'use client';

import React from 'react';
import { Button } from 'antd';
import { AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';
import type { PilotAiAssessment, PilotSession } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';

export interface PilotAssessmentSummaryViewProps {
  session: PilotSession;
  aiAssessment: PilotAiAssessment | null;
  onEdit: () => void;
}

export function PilotAssessmentSummaryView({ session, aiAssessment, onEdit }: PilotAssessmentSummaryViewProps) {
  const activeAiAssessment = session.aiAssessment || aiAssessment;

  return (
    <div className="space-y-3">
      <div
        className={`p-3.5 rounded-xl border ${
          session.assessmentStatus === 'PASS'
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100'
            : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-100'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {session.assessmentStatus === 'PASS' ? (
              <AppIcon icon={CheckCircle} size="sm" className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AppIcon icon={AlertTriangle} size="sm" className="text-rose-600 dark:text-rose-400" />
            )}
            <span className="font-bold text-sm">
              {session.assessmentStatus === 'PASS'
                ? 'Khách ĐỦ ĐIỀU KIỆN thực hiện dịch vụ'
                : 'Khách KHÔNG ĐỦ ĐIỀU KIỆN thực hiện dịch vụ'}
            </span>
          </div>
          <span className="text-[11px] opacity-75 tabular-nums">
            {dayjs(session.assessedAt).format('HH:mm · DD/MM/YYYY')}
          </span>
        </div>

        {session.assessmentStatus === 'FAIL' && session.assessmentReason && (
          <div className="mt-2 p-2.5 rounded-lg bg-rose-100/70 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 text-xs">
            <span className="font-bold block mb-0.5">Lý do không đủ điều kiện:</span>
            <span>{session.assessmentReason}</span>
          </div>
        )}

        {session.assessmentNotes && (
          <div className="mt-2 p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 text-xs">
            <span className="font-bold block mb-0.5">Ghi chú tư vấn / Giải pháp:</span>
            <span>{session.assessmentNotes}</span>
          </div>
        )}

        {/* AI Assessment Summary if available */}
        {activeAiAssessment && (
          <div className="mt-3 p-3 rounded-xl bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-violet-800 dark:text-violet-300">
                <AppIcon icon={Sparkles} size="sm" className="text-violet-600 dark:text-violet-400" />
                <span>Hồ sơ AI Lash Assessment</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-200/60 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-semibold">
                {activeAiAssessment.method === 'MACRO_15X' ? 'Kính Macro 15x' : 'Ảnh thường'}
              </span>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-200">
              <strong>Lash Profile:</strong> {activeAiAssessment.lashProfile?.summary}
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {activeAiAssessment.lashProfile?.estimatedThickness && (
                <div className="p-1.5 rounded bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300">
                  📏 Sợi mi: <strong>{activeAiAssessment.lashProfile.estimatedThickness}</strong>
                </div>
              )}
              {activeAiAssessment.lashProfile?.cuticleCondition && (
                <div className="p-1.5 rounded bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300">
                  🧬 Biểu bì: <strong>{activeAiAssessment.lashProfile.cuticleCondition}</strong>
                </div>
              )}
            </div>

            {activeAiAssessment.riskAttention && (
              <div className="text-[11px] p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 text-amber-800 dark:text-amber-300">
                <strong>Lưu ý kỹ thuật:</strong> {activeAiAssessment.riskAttention}
              </div>
            )}

            {activeAiAssessment.recommendation && (
              <div className="text-[11px] p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300">
                <strong>Đề xuất SOP:</strong> Thuốc 1:{' '}
                {activeAiAssessment.recommendation.solution1DurationMinutes || 10}p · Thuốc 2:{' '}
                {activeAiAssessment.recommendation.solution2DurationMinutes || 8}p · Trục:{' '}
                {activeAiAssessment.recommendation.recommendedRodSize || 'M'}
              </div>
            )}
          </div>
        )}

        {Array.isArray(session.assessmentCriteria) && session.assessmentCriteria.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Chi tiết kiểm tra tiêu chuẩn mi:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              {session.assessmentCriteria.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-1.5 px-2.5 rounded-md bg-white/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50"
                >
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{item.name}</span>
                  <span
                    className={`inline-flex items-center justify-center leading-none px-2 py-0.5 rounded text-[11px] font-semibold ${
                      item.passed
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {item.passed ? 'Đạt' : 'Không đạt'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button size="small" icon={<AppIcon icon={Sparkles} size="sm" className="text-violet-600" />} onClick={onEdit}>
          Phân tích lại AI / Chỉnh sửa
        </Button>
      </div>
    </div>
  );
}

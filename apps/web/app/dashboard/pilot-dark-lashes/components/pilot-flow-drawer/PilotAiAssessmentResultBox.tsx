'use client';

import React from 'react';
import { Button, message } from 'antd';
import { AlertTriangle, Bot, CheckCircle, XCircle, Zap } from 'lucide-react';
import type { PilotAiAssessment } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import type { SavePilotAssessmentOptions } from './pilot-flow-config';

export interface PilotAiAssessmentResultBoxProps {
  aiAssessment: PilotAiAssessment;
  submittingAction: string | null;
  onSaveAssessment: (options?: SavePilotAssessmentOptions) => void;
  onSelectAssessmentResult: (result: 'PASS' | 'FAIL') => void;
}

export function PilotAiAssessmentResultBox({
  aiAssessment,
  submittingAction,
  onSaveAssessment,
  onSelectAssessmentResult,
}: PilotAiAssessmentResultBoxProps) {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-b from-violet-500/10 via-purple-500/5 to-transparent border border-violet-300 dark:border-violet-700/60 shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-violet-200/60 dark:border-violet-800/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-sm">
            <AppIcon icon={Bot} size="sm" />
          </div>
          <div>
            <div className="font-bold text-xs text-violet-900 dark:text-violet-200 uppercase tracking-wide">
              Kết quả AI Lash Assessment
            </div>
            <div className="text-[10px] text-slate-400">
              Mô hình:{' '}
              {aiAssessment.modelUsed === 'gemini-2.5-flash'
                ? 'Google Gemini 2.5 Flash Multimodal'
                : 'Hệ Thống Phân Tích Quy Tắc SOP'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {aiAssessment.suitability === 'PASS' && (
            <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm">
              PASS · ĐỦ ĐIỀU KIỆN
            </span>
          )}
          {aiAssessment.suitability === 'CAUTION' && (
            <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">
              CAUTION · CẦN CÂN NHẮC
            </span>
          )}
          {aiAssessment.suitability === 'NOT_SUITABLE' && (
            <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-sm">
              NOT SUITABLE · KHÔNG PHÙ HỢP
            </span>
          )}
        </div>
      </div>

      {/* 4.1 LASH PROFILE */}
      <div className="space-y-1.5">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
          <span>1. Lash Profile (Hồ Sơ Sợi Mi):</span>
        </div>
        <div className="text-xs text-slate-700 dark:text-slate-300 p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800">
          {aiAssessment.lashProfile.summary}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {aiAssessment.lashProfile.estimatedThickness && (
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Độ dày sợi mi (Macro):</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {aiAssessment.lashProfile.estimatedThickness}
              </span>
            </div>
          )}
          {aiAssessment.lashProfile.cuticleCondition && (
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Biểu bì Keratin:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {aiAssessment.lashProfile.cuticleCondition}
              </span>
            </div>
          )}
          {aiAssessment.lashProfile.lengthAssessment && (
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Độ dài mi:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {aiAssessment.lashProfile.lengthAssessment}
              </span>
            </div>
          )}
          {aiAssessment.lashProfile.densityAssessment && (
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Mật độ sợi mi:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {aiAssessment.lashProfile.densityAssessment}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4.2 RISK / ATTENTION */}
      <div className="space-y-1">
        <div className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
          <AppIcon icon={AlertTriangle} size="sm" className="text-amber-500" />
          <span>2. Điểm lưu ý kỹ thuật (Risk / Attention):</span>
        </div>
        <div className="text-xs p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
          {aiAssessment.riskAttention}
        </div>
      </div>

      {/* 4.3 RECOMMENDATION */}
      <div className="space-y-1.5">
        <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
          <AppIcon icon={Zap} size="sm" className="text-indigo-500" />
          <span>3. Đề xuất kỹ thuật (Recommendation):</span>
        </div>
        <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200 space-y-1.5">
          <div>{aiAssessment.recommendation.action}</div>
          {aiAssessment.suitability !== 'NOT_SUITABLE' && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-indigo-200/40 dark:border-indigo-800/40 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 font-bold text-indigo-800 dark:text-indigo-300">
                Thuốc 1 (Làm mềm): {aiAssessment.recommendation.solution1DurationMinutes || 10} phút
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 font-bold text-indigo-800 dark:text-indigo-300">
                Thuốc 2 (Tạo form): {aiAssessment.recommendation.solution2DurationMinutes || 8} phút
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 font-bold text-indigo-800 dark:text-indigo-300">
                Trục uốn: {aiAssessment.recommendation.recommendedRodSize || 'M'}
              </span>
            </div>
          )}
          {aiAssessment.recommendation.alternativeCare && (
            <div className="pt-1 text-rose-700 dark:text-rose-300 font-medium">
              🌱 <strong>Chăm sóc phục hồi:</strong> {aiAssessment.recommendation.alternativeCare}
            </div>
          )}
        </div>
      </div>

      {/* CÔ ĐẪM QUICK CONFIRM ACTIONS */}
      <div className="pt-2 border-t border-violet-200/60 dark:border-violet-800/60 space-y-2">
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Cô Đẫm xác nhận theo kết luận của AI:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {aiAssessment.suitability !== 'NOT_SUITABLE' ? (
            <>
              <Button
                type="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl shadow flex items-center justify-center gap-1.5"
                onClick={() => onSaveAssessment({ overrideResult: 'PASS' })}
                loading={submittingAction === 'save-assessment'}
              >
                <AppIcon icon={CheckCircle} size="sm" />
                <span>Xác Nhận ĐỦ ĐIỀU KIỆN (PASS)</span>
              </Button>
              <Button
                danger
                className="font-semibold h-10 rounded-xl"
                onClick={() => {
                  onSelectAssessmentResult('FAIL');
                  message.info('Đã chuyển sang Không Đủ Điều Kiện. Vui lòng ghi lý do bên dưới.');
                }}
              >
                Đổi Sang Không Đạt (FAIL)
              </Button>
            </>
          ) : (
            <>
              <Button
                type="primary"
                danger
                className="font-bold h-10 rounded-xl shadow flex items-center justify-center gap-1.5"
                onClick={() => onSaveAssessment({ overrideResult: 'FAIL' })}
                loading={submittingAction === 'save-assessment'}
              >
                <AppIcon icon={XCircle} size="sm" />
                <span>Xác Nhận KHÔNG ĐỦ ĐIỀU KIỆN (FAIL)</span>
              </Button>
              <Button
                className="font-semibold h-10 rounded-xl"
                onClick={() => {
                  onSelectAssessmentResult('PASS');
                  message.info('Đã đổi sang Đủ Điều Kiện (PASS).');
                }}
              >
                Đổi Sang Đủ Điều Kiện (PASS)
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="text-[10px] text-slate-400 italic text-center pt-1">
        * AI chỉ hỗ trợ đánh giá thẩm mỹ và kỹ thuật mi, không chẩn đoán y khoa. Quyết định cuối cùng do cô Đẫm xác
        nhận.
      </div>
    </div>
  );
}

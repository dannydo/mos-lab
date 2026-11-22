'use client';

import React from 'react';
import { Button, Input, Radio } from 'antd';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Check,
  CheckCircle,
  Image as ImageIcon,
  Microscope,
  Sparkles,
} from 'lucide-react';
import type {
  DarkLashesSessionStatus,
  PilotAiAssessment,
  PilotAssessmentCriterion,
  PilotSession,
} from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { resolveMediaUrl } from '~/lib/api-client';
import type { PilotCriterionEvaluationMap, SavePilotAssessmentOptions } from './pilot-flow-config';
import { PilotPhotoPicker } from './PilotPhotoPicker';
import { PilotAssessmentSummaryView } from './PilotAssessmentSummaryView';
import { PilotAiAssessmentResultBox } from './PilotAiAssessmentResultBox';

const { TextArea } = Input;

export interface PilotAssessmentStepProps {
  session: PilotSession;
  currentStatus: DarkLashesSessionStatus;
  isIneligible: boolean;
  submittingAction: string | null;
  criteriaList: PilotAssessmentCriterion[];
  loadingCriteria: boolean;
  evaluations: PilotCriterionEvaluationMap;
  assessmentResult: 'PASS' | 'FAIL';
  assessmentReason: string;
  assessmentNotes: string;
  isEditingAssessment: boolean;
  aiAssessment: PilotAiAssessment | null;
  macroPhotoUrl: string | null;
  isAnalyzingAi: boolean;
  onCriterionChange: (criterionId: number, passed: boolean) => void;
  onUploadMacroPhoto: (file: File) => void;
  onRunAiAnalysis: () => void;
  onSelectAssessmentResult: (result: 'PASS' | 'FAIL') => void;
  onAssessmentReasonChange: (reason: string) => void;
  onAssessmentNotesChange: (notes: string) => void;
  onSetEditingAssessment: (editing: boolean) => void;
  onSaveAssessment: (options?: SavePilotAssessmentOptions) => void;
}

export function PilotAssessmentStep({
  session,
  currentStatus,
  isIneligible,
  submittingAction,
  criteriaList,
  loadingCriteria,
  evaluations,
  assessmentResult,
  assessmentReason,
  assessmentNotes,
  isEditingAssessment,
  aiAssessment,
  macroPhotoUrl,
  isAnalyzingAi,
  onCriterionChange,
  onUploadMacroPhoto,
  onRunAiAnalysis,
  onSelectAssessmentResult,
  onAssessmentReasonChange,
  onAssessmentNotesChange,
  onSetEditingAssessment,
  onSaveAssessment,
}: PilotAssessmentStepProps) {
  return (
    <>
      <div
        className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
          currentStatus === 'CHECKED_IN' || currentStatus === 'ASSESSED'
            ? 'border-emerald-400 ring-2 ring-emerald-500/20'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                session.assessmentStatus
                  ? session.assessmentStatus === 'PASS'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              3
            </span>
            <div>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Tư Vấn &amp; Đánh Giá Điều Kiện Mi
              </span>
              <div className="text-xs text-slate-400">
                Kiểm tra tiêu chuẩn mi ngay sau check-in trước khi làm dịch vụ
              </div>
            </div>
          </div>

          {session.assessmentStatus === 'PASS' && (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              Đủ điều kiện (PASS)
            </span>
          )}
          {(session.assessmentStatus === 'FAIL' || session.status === 'INELIGIBLE') && (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
              Không đủ điều kiện (FAIL)
            </span>
          )}
          {!session.assessmentStatus && session.status !== 'INELIGIBLE' && (
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              Chờ đánh giá
            </span>
          )}
        </div>

        {!session.checkInAt ? (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-500 flex items-center gap-2">
            <AppIcon icon={AlertCircle} size="sm" className="text-amber-500 shrink-0" />
            <span>Cần bấm Check-in khách đến (Bước 2) trước khi thực hiện tư vấn &amp; đánh giá mi.</span>
          </div>
        ) : session.assessedAt && !isEditingAssessment ? (
          <PilotAssessmentSummaryView
            session={session}
            aiAssessment={aiAssessment}
            onEdit={() => onSetEditingAssessment(true)}
          />
        ) : (
          <div className="space-y-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            {/* 1. CHECKLIST TIÊU CHÍ */}
            <div>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>1. Bảng kiểm tra tiêu chuẩn mi uốn</span>
                {loadingCriteria && <span className="text-[11px] text-slate-400">Đang tải tiêu chí...</span>}
              </div>

              <div className="space-y-2">
                {criteriaList.map((crit, idx) => {
                  const isPassed = evaluations[crit.id]?.passed ?? true;
                  return (
                    <div
                      key={crit.id}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">{crit.name}</span>
                        </div>
                        {crit.description && (
                          <div className="text-[11px] text-slate-400 pl-6 mt-0.5">{crit.description}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pl-6 sm:pl-0">
                        <Radio.Group
                          size="small"
                          value={isPassed ? 'PASS' : 'FAIL'}
                          onChange={(e) => onCriterionChange(crit.id, e.target.value === 'PASS')}
                        >
                          <Radio.Button value="PASS" className={isPassed ? 'ant-radio-button-checked-emerald' : ''}>
                            Đạt
                          </Radio.Button>
                          <Radio.Button value="FAIL" className={!isPassed ? 'ant-radio-button-checked-rose' : ''}>
                            Không đạt
                          </Radio.Button>
                        </Radio.Group>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. CHỤP ẢNH MI KÍNH MACRO 15X */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AppIcon icon={Microscope} size="sm" className="text-violet-600 dark:text-violet-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    2. Ảnh chụp mi phóng đại cận cảnh
                  </span>
                </div>
                <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                  Kính Macro 15x · Cự ly chuẩn 2cm
                </span>
              </div>

              <PilotPhotoPicker onSelectFile={onUploadMacroPhoto}>
                {({ openCamera, openLibrary }) => (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    {macroPhotoUrl || session.beforePhotoUrl ? (
                      <div className="flex items-center gap-3">
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 shrink-0">
                          <img
                            src={resolveMediaUrl(macroPhotoUrl || session.beforePhotoUrl)}
                            alt="Macro Lash Photo"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/70 text-[9px] text-white font-bold">
                            MACRO
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <AppIcon icon={CheckCircle} size="sm" className="text-emerald-500" />
                            <span>Đã có ảnh mi macro 15x</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Sợi mi hiển thị rõ nét, sẵn sàng để AI đo đường kính và biểu bì keratin.
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="small"
                              icon={<AppIcon icon={Camera} size="sm" />}
                              onClick={openCamera}
                              loading={submittingAction === 'upload-macro'}
                            >
                              Chụp lại
                            </Button>
                            <Button
                              size="small"
                              icon={<AppIcon icon={ImageIcon} size="sm" />}
                              onClick={openLibrary}
                              loading={submittingAction === 'upload-macro'}
                            >
                              Đổi ảnh
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Kẹp kính Macro 15x vào camera điện thoại, tựa nhẹ vành kính cách mắt khách 2cm để chụp ảnh sợi
                          mi phóng đại rõ nhất.
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            icon={<AppIcon icon={Camera} size="sm" />}
                            onClick={openCamera}
                            loading={submittingAction === 'upload-macro'}
                            className="h-10 rounded-lg font-semibold"
                          >
                            Chụp Kính Macro 15x
                          </Button>
                          <Button
                            icon={<AppIcon icon={ImageIcon} size="sm" />}
                            onClick={openLibrary}
                            loading={submittingAction === 'upload-macro'}
                            className="h-10 rounded-lg"
                          >
                            Chọn từ thư viện
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </PilotPhotoPicker>
            </div>

            {/* 3. NÚT KÍCH HOẠT AI ANALYZE */}
            <div className="pt-1">
              <Button
                type="primary"
                size="large"
                block
                className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold h-12 rounded-xl shadow-md flex items-center justify-center gap-2 border-0"
                onClick={onRunAiAnalysis}
                loading={isAnalyzingAi}
              >
                <AppIcon icon={Sparkles} size="sm" className="text-amber-300" />
                <span>AI Phân Tích Điều Kiện Mi (Macro 15x)</span>
              </Button>
            </div>

            {/* 4. HỘP KẾT QUẢ AI PHÂN TÍCH */}
            {aiAssessment && (
              <PilotAiAssessmentResultBox
                aiAssessment={aiAssessment}
                submittingAction={submittingAction}
                onSaveAssessment={onSaveAssessment}
                onSelectAssessmentResult={onSelectAssessmentResult}
              />
            )}

            {/* 5. FORM KẾT LUẬN & ĐIỀU CHỈNH THỦ CÔNG */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                Kết luận đánh giá cuối cùng của Cô Đẫm: <span className="text-rose-500">*</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div
                  onClick={() => onSelectAssessmentResult('PASS')}
                  className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex items-start gap-2.5 ${
                    assessmentResult === 'PASS'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full mt-0.5 flex items-center justify-center shrink-0 ${
                      assessmentResult === 'PASS'
                        ? 'bg-emerald-500 text-white'
                        : 'border border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {assessmentResult === 'PASS' && <AppIcon icon={Check} size="sm" />}
                  </div>
                  <div>
                    <div className="font-bold text-xs">ĐỦ ĐIỀU KIỆN (PASS)</div>
                    <div className="text-[11px] opacity-75">
                      Mi đạt chuẩn uốn bóng tối. Tiếp tục sang các bước làm dịch vụ.
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => onSelectAssessmentResult('FAIL')}
                  className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex items-start gap-2.5 ${
                    assessmentResult === 'FAIL'
                      ? 'border-rose-500 bg-rose-500/10 text-rose-900 dark:text-rose-100 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-rose-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full mt-0.5 flex items-center justify-center shrink-0 ${
                      assessmentResult === 'FAIL'
                        ? 'bg-rose-500 text-white'
                        : 'border border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {assessmentResult === 'FAIL' && <AppIcon icon={Check} size="sm" />}
                  </div>
                  <div>
                    <div className="font-bold text-xs">KHÔNG ĐỦ ĐIỀU KIỆN (FAIL)</div>
                    <div className="text-[11px] opacity-75">
                      Bỏ qua các bước làm dịch vụ, chuyển thẳng sang Check-out.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {assessmentResult === 'FAIL' && (
              <div className="space-y-1">
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Lý do không đủ điều kiện: <span className="text-rose-500">* (Bắt buộc)</span>
                </div>
                <TextArea
                  rows={2}
                  value={assessmentReason}
                  onChange={(e) => onAssessmentReasonChange(e.target.value)}
                  placeholder="VD: Mi quá ngắn dưới 4mm, sợi mi yếu gãy rụng nhiều, mi cháy do từng nối..."
                  className="rounded-lg"
                />
              </div>
            )}

            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {assessmentResult === 'FAIL'
                  ? 'Giải pháp thay thế & Ghi chú tư vấn khách:'
                  : 'Ghi chú kỹ thuật & Lưu ý cho ca làm (Tùy chọn):'}
              </div>
              <TextArea
                rows={2}
                value={assessmentNotes}
                onChange={(e) => onAssessmentNotesChange(e.target.value)}
                placeholder={
                  assessmentResult === 'FAIL'
                    ? 'VD: Tư vấn khách dưỡng mi bằng serum 2-3 tuần, đề xuất làm dịch vụ phục hồi mi...'
                    : 'VD: Khách mi dài mỏng, sử dụng trục size S, thời gian ủ thuốc 9 phút...'
                }
                className="rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="primary"
                block
                className={`font-bold h-11 rounded-xl shadow-md ${
                  assessmentResult === 'FAIL'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
                onClick={() => onSaveAssessment()}
                loading={submittingAction === 'save-assessment'}
              >
                <AppIcon icon={CheckCircle} size="sm" />
                {assessmentResult === 'FAIL'
                  ? 'Xác Nhận Không Đủ Điều Kiện & Chuyển Check-out'
                  : 'Xác Nhận Đủ Điều Kiện & Tiếp Tục Làm Dịch Vụ'}
              </Button>
              {isEditingAssessment && session.assessedAt && (
                <Button className="h-11 rounded-xl font-medium" onClick={() => onSetEditingAssessment(false)}>
                  Hủy
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Banner cảnh báo nếu ca KHÔNG ĐỦ ĐIỀU KIỆN */}
      {isIneligible && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 shadow-sm flex items-start gap-3">
          <AppIcon icon={AlertTriangle} size="md" className="text-rose-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-rose-800 dark:text-rose-200">
              Ca không đủ điều kiện uốn mi bóng tối · Bỏ qua các bước làm dịch vụ
            </div>
            <div className="text-xs text-rose-700 dark:text-rose-300">
              Lý do: <strong>{session.assessmentReason || 'Không đáp ứng tiêu chuẩn mi'}</strong>
            </div>
            <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
              Các bước thực hiện dịch vụ (Ảnh trước/sau, Quy trình SOP, Khảo sát Feedback) đã được tự động bỏ qua. Quý
              CV vui lòng di chuyển xuống <strong>Bước 8: Check-out</strong> để hoàn tất ghi nhận thời gian khách tại
              salon.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

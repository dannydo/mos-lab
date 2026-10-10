'use client';

import React, { useState, useRef } from 'react';
import { Button, Input, Rate, Radio, message, Popconfirm, Tooltip } from 'antd';
import { AdaptiveDrawer } from '../../../../components/ui/AdaptiveOverlay';
import {
  Calendar,
  Camera,
  Check,
  CheckCircle,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  MessageSquare,
  Phone,
  RefreshCw,
  Sparkles,
  Star,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
  ClipboardCheck,
  Edit3,
  XCircle,
  Microscope,
  Bot,
  Zap,
  Scan,
} from 'lucide-react';
import dayjs from 'dayjs';
import type {
  DarkLashesSessionStatus,
  PilotAssessmentCriterion,
  PilotCriterionEvaluation,
  PilotSession,
  PilotSessionStep,
  SavePilotAssessmentRequest,
  PilotAiAssessment,
  PilotAiSuitability,
} from '@mos-lab/shared';
import { apiClient, resolveMediaUrl } from '../../../../lib/api-client';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { CopyPhoneButton } from '../../../../components/ui/CopyPhoneButton';
import { PilotStepTimer } from './PilotStepTimer';

const { TextArea } = Input;

const STATUS_STEPS: { key: DarkLashesSessionStatus; label: string; shortLabel: string; stepNumber: number }[] = [
  { key: 'BOOKED', label: '1. Đã đặt lịch (Booked)', shortLabel: 'Booked', stepNumber: 1 },
  { key: 'CHECKED_IN', label: '2. Đã đến shop (Checked-in)', shortLabel: 'Check-in', stepNumber: 2 },
  { key: 'ASSESSED', label: '3. Tư vấn & Đánh giá (Assessed)', shortLabel: 'Đánh giá', stepNumber: 3 },
  { key: 'BEFORE_PHOTO', label: '4. Ảnh trước khi làm (Before Photo)', shortLabel: 'Before Photo', stepNumber: 4 },
  { key: 'SERVICE_DONE', label: '5. Đã làm xong (Service Done)', shortLabel: 'Service Done', stepNumber: 5 },
  { key: 'AFTER_PHOTO', label: '6. Ảnh sau khi làm (After Photo)', shortLabel: 'After Photo', stepNumber: 6 },
  { key: 'FEEDBACK_DONE', label: '7. Khách đánh giá (Feedback Done)', shortLabel: 'Feedback', stepNumber: 7 },
  { key: 'CHECKED_OUT', label: '8. Đã ra về (Checked-out)', shortLabel: 'Check-out', stepNumber: 8 },
];

function getStatusIndex(status: DarkLashesSessionStatus): number {
  if (status === 'INELIGIBLE') return 2;
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

interface PilotFlowDrawerProps {
  open: boolean;
  session: PilotSession | null;
  onClose: () => void;
  onSessionUpdated: (updated: PilotSession) => void;
}

async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return reject(new Error('Không thể đọc tệp ảnh.'));
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(result);
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(result);
        }
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PilotFlowDrawer({ open, session, onClose, onSessionUpdated }: PilotFlowDrawerProps) {
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(session?.feedbackRating || session?.csatScore || 5);
  const [feedbackNote, setFeedbackNote] = useState<string>(session?.feedbackNote || '');

  const beforeCameraInputRef = useRef<HTMLInputElement>(null);
  const beforeLibraryInputRef = useRef<HTMLInputElement>(null);
  const afterCameraInputRef = useRef<HTMLInputElement>(null);
  const afterLibraryInputRef = useRef<HTMLInputElement>(null);
  const macroCameraInputRef = useRef<HTMLInputElement>(null);
  const macroLibraryInputRef = useRef<HTMLInputElement>(null);

  const [sessionSteps, setSessionSteps] = useState<PilotSessionStep[]>(session?.steps || []);
  const [criteriaList, setCriteriaList] = useState<PilotAssessmentCriterion[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState<boolean>(false);
  const [evaluations, setEvaluations] = useState<Record<number, { passed: boolean; note: string }>>({});
  const [assessmentResult, setAssessmentResult] = useState<'PASS' | 'FAIL'>(
    (session?.assessmentStatus as 'PASS' | 'FAIL') || 'PASS'
  );
  const [assessmentReason, setAssessmentReason] = useState<string>(session?.assessmentReason || '');
  const [assessmentNotes, setAssessmentNotes] = useState<string>(session?.assessmentNotes || '');
  const [isEditingAssessment, setIsEditingAssessment] = useState<boolean>(!session?.assessmentStatus);
  const [aiAssessment, setAiAssessment] = useState<PilotAiAssessment | null>(session?.aiAssessment || null);
  const [macroPhotoUrl, setMacroPhotoUrl] = useState<string | null>(
    session?.beforePhotoUrl || session?.aiAssessment?.photoUrl || null
  );
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);

  React.useEffect(() => {
    if (open) {
      setLoadingCriteria(true);
      apiClient.pilot
        .listAssessmentCriteria({ pilotCode: 'DARK_LASHES' })
        .then((res) => {
          setCriteriaList(res || []);
        })
        .catch(() => {})
        .finally(() => {
          setLoadingCriteria(false);
        });
    }
  }, [open]);

  // Sync state when session changes
  React.useEffect(() => {
    if (session) {
      setFeedbackRating(session.feedbackRating || session.csatScore || 5);
      setFeedbackNote(session.feedbackNote || '');
      setAssessmentResult((session.assessmentStatus as 'PASS' | 'FAIL') || 'PASS');
      setAssessmentReason(session.assessmentReason || '');
      setAssessmentNotes(session.assessmentNotes || '');
      setIsEditingAssessment(!session.assessmentStatus);
      setAiAssessment(session.aiAssessment || null);
      setMacroPhotoUrl(session.beforePhotoUrl || session.aiAssessment?.photoUrl || null);

      if (session.assessmentCriteria && session.assessmentCriteria.length > 0) {
        const evals: Record<number, { passed: boolean; note: string }> = {};
        for (const item of session.assessmentCriteria) {
          evals[item.criterionId] = { passed: item.passed, note: item.note || '' };
        }
        setEvaluations(evals);
      }

      if (session.steps && session.steps.length > 0) {
        setSessionSteps(session.steps);
      } else {
        apiClient.pilot
          .getSessionSteps(session.id)
          .then((res) => {
            if (res && res.length > 0) {
              setSessionSteps(res);
              onSessionUpdated({ ...session, steps: res });
            }
          })
          .catch(() => {});
      }
    }
  }, [session]);

  const handleStepsChange = (newSteps: PilotSessionStep[]) => {
    setSessionSteps(newSteps);
    let totalSec = 0;
    for (const s of newSteps) {
      if (s.durationSeconds && s.durationSeconds > 0) totalSec += s.durationSeconds;
    }
    if (session) {
      onSessionUpdated({
        ...session,
        steps: newSteps,
        totalTechnicalDurationSeconds: totalSec > 0 ? totalSec : null,
      });
    }
  };

  if (!session) return null;

  const currentStatus = session.status || 'BOOKED';
  const currentStepIdx = getStatusIndex(currentStatus);

  // Action Handlers
  const handleCheckIn = async () => {
    try {
      setSubmittingAction('check-in');
      const updated = await apiClient.pilot.checkIn(session.id);
      message.success('Đã ghi nhận Check-in khách đến shop!');
      onSessionUpdated(updated);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể check-in.');
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleUploadPhoto = async (type: 'before' | 'after' | 'macro', file: File) => {
    try {
      setSubmittingAction(`upload-${type}`);
      const typeLabel = type === 'before' ? 'Trước' : type === 'after' ? 'Sau' : 'Kính Macro 15x';
      message.loading({ content: `Đang xử lý và tải ảnh ${typeLabel}...`, key: `upload-${type}` });
      const compressedBase64 = await compressImage(file);
      const uploadRes = await apiClient.pilot.uploadPhoto({
        photoData: compressedBase64,
        mimeType: 'image/jpeg',
      });
      const photoUrl = uploadRes.photoUrl || compressedBase64;

      let updated: PilotSession;
      if (type === 'before') {
        updated = await apiClient.pilot.saveBeforePhoto(session.id, { beforePhotoUrl: photoUrl });
        setMacroPhotoUrl(photoUrl);
        message.success({ content: 'Đã lưu ảnh Trước khi làm (Before Photo)!', key: `upload-${type}` });
      } else if (type === 'after') {
        updated = await apiClient.pilot.saveAfterPhoto(session.id, { afterPhotoUrl: photoUrl });
        message.success({ content: 'Đã lưu ảnh Sau khi làm (After Photo)!', key: `upload-${type}` });
      } else {
        // Macro photo for AI analysis
        setMacroPhotoUrl(photoUrl);
        // If session doesn't have before photo, also sync it as before photo
        if (!session.beforePhotoUrl) {
          updated = await apiClient.pilot.saveBeforePhoto(session.id, { beforePhotoUrl: photoUrl });
        } else {
          updated = { ...session };
        }
        message.success({
          content: 'Đã tải ảnh Kính Macro 15x thành công! Sẵn sàng bấm AI Phân Tích.',
          key: `upload-${type}`,
        });
      }
      onSessionUpdated(updated);
    } catch (err: any) {
      console.error(`[Upload ${type} error]`, err);
      message.error({
        content: err?.response?.data?.message || err?.message || `Lỗi tải ảnh ${type}. Vui lòng thử lại.`,
        key: `upload-${type}`,
      });
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleRunAiAnalysis = async (customPhotoUrl?: string) => {
    const photoToUse = customPhotoUrl || macroPhotoUrl || session.beforePhotoUrl;
    const currentEvaluations: PilotCriterionEvaluation[] = criteriaList.map((c) => ({
      criterionId: c.id,
      name: c.name,
      passed: evaluations[c.id]?.passed ?? true,
      note: evaluations[c.id]?.note || '',
    }));

    try {
      setIsAnalyzingAi(true);
      message.loading({
        content: 'AI đang phân tích điều kiện mi từ ảnh Macro 15x và checklist...',
        key: 'ai-analyzing',
      });
      const res = await apiClient.pilot.aiAnalyzeLash(session.id, {
        photoUrl: photoToUse || undefined,
        criteriaSnapshot: currentEvaluations,
        technicianNotes: assessmentNotes || undefined,
        captureMethod: 'MACRO_15X',
      });

      setAiAssessment(res.aiAssessment);
      if (res.session) {
        onSessionUpdated(res.session);
      }

      // Pre-fill fields based on AI suitability suggestion
      if (res.aiAssessment.suitability === 'NOT_SUITABLE') {
        setAssessmentResult('FAIL');
        setAssessmentReason(
          res.aiAssessment.recommendation.action ||
            res.aiAssessment.lashProfile.summary ||
            'Không đáp ứng tiêu chuẩn mi uốn'
        );
        if (res.aiAssessment.recommendation.alternativeCare) {
          setAssessmentNotes(res.aiAssessment.recommendation.alternativeCare);
        }
      } else {
        setAssessmentResult('PASS');
        const s1 = res.aiAssessment.recommendation.solution1DurationMinutes;
        const s2 = res.aiAssessment.recommendation.solution2DurationMinutes;
        const rod = res.aiAssessment.recommendation.recommendedRodSize;
        const noteItems: string[] = [];
        if (s1 || s2 || rod) {
          noteItems.push(`Đề xuất AI: Thuốc 1 ${s1 || 10}p · Thuốc 2 ${s2 || 8}p · Trục ${rod || 'M'}`);
        }
        if (res.aiAssessment.riskAttention) {
          noteItems.push(`Lưu ý kỹ thuật: ${res.aiAssessment.riskAttention}`);
        }
        if (noteItems.length > 0) {
          setAssessmentNotes(noteItems.join('. '));
        }
      }

      message.success({ content: 'AI đã hoàn tất phân tích điều kiện mi!', key: 'ai-analyzing' });
    } catch (err: any) {
      console.error('[AI Analyze error]', err);
      message.error({
        content: err?.response?.data?.message || err?.message || 'Lỗi khi phân tích AI.',
        key: 'ai-analyzing',
      });
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleServiceDone = async () => {
    try {
      setSubmittingAction('service-done');
      const updated = await apiClient.pilot.markServiceDone(session.id);
      message.success('Đã hoàn tất dịch vụ Uốn Mi Bóng Tối!');
      onSessionUpdated(updated);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể cập nhật trạng thái làm xong.');
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleSaveFeedback = async () => {
    try {
      setSubmittingAction('feedback');
      const updated = await apiClient.pilot.saveFeedback(session.id, {
        feedbackRating,
        feedbackNote,
      });
      message.success('Đã lưu đánh giá của khách!');
      onSessionUpdated(updated);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể lưu feedback.');
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleSaveAssessment = async (options?: {
    overrideResult?: 'PASS' | 'FAIL';
    overrideReason?: string;
    overrideNotes?: string;
  }) => {
    const finalResult = options?.overrideResult || assessmentResult;
    const finalReason = options?.overrideReason !== undefined ? options.overrideReason : assessmentReason;
    const finalNotes = options?.overrideNotes !== undefined ? options.overrideNotes : assessmentNotes;

    if (!finalResult) {
      message.error('Vui lòng chọn kết luận Đủ điều kiện hoặc Không đủ điều kiện.');
      return;
    }
    if (finalResult === 'FAIL' && !finalReason?.trim()) {
      message.error('Bắt buộc phải ghi Lý do không đủ điều kiện.');
      return;
    }

    try {
      setSubmittingAction('save-assessment');
      const criteriaSnapshot: PilotCriterionEvaluation[] = criteriaList.map((c) => ({
        criterionId: c.id,
        name: c.name,
        passed: evaluations[c.id]?.passed ?? true,
        note: evaluations[c.id]?.note ?? '',
      }));

      const payload: SavePilotAssessmentRequest = {
        result: finalResult,
        reason: finalResult === 'FAIL' ? finalReason.trim() : null,
        notes: finalNotes.trim() || null,
        criteriaSnapshot,
        aiAssessment: aiAssessment || undefined,
      };

      const updated = await apiClient.pilot.saveAssessment(session.id, payload);
      setAssessmentResult(finalResult);
      setAssessmentReason(finalReason);
      setAssessmentNotes(finalNotes);
      if (finalResult === 'PASS') {
        message.success('Đánh giá hoàn tất: Khách ĐỦ ĐIỀU KIỆN làm dịch vụ!');
      } else {
        message.warning('Đã ghi nhận: Khách KHÔNG ĐỦ ĐIỀU KIỆN làm dịch vụ. Chuyển thẳng Check-out.');
      }
      setIsEditingAssessment(false);
      onSessionUpdated(updated);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể lưu kết quả đánh giá.');
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleCheckOut = async () => {
    try {
      setSubmittingAction('check-out');
      const updated = await apiClient.pilot.checkOut(session.id);
      message.success(
        `Đã check-out thành công! Tổng thời gian khách tại shop: ${updated.totalDurationMinutes || 0} phút.`
      );
      onSessionUpdated(updated);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể check-out.');
    } finally {
      setSubmittingAction(null);
    }
  };

  // Check-out requirements
  const isIneligible = session.status === 'INELIGIBLE' || session.assessmentStatus === 'FAIL';
  const hasAfterPhoto = Boolean(session.afterPhotoUrl);
  const hasFeedback = Boolean(session.feedbackRating || session.csatScore);
  const canCheckOut = isIneligible ? true : hasAfterPhoto && hasFeedback;

  return (
    <AdaptiveDrawer
      intent="form"
      title={
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <AppIcon icon={Sparkles} size="sm" />
              </span>
              <div>
                <div className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>{session.customerName}</span>
                  <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-medium border bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20 tabular-nums">
                    {session.customerPhone}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Mã ca #{session.id}</span>
                  <span>•</span>
                  <span>Ngày {session.sessionDate ? dayjs(session.sessionDate).format('DD/MM/YYYY') : '--'}</span>
                  {session.bookingTime && (
                    <>
                      <span>•</span>
                      <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        {session.bookingTime}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      }
      open={open}
      onClose={onClose}
      width={720}
      className="pilot-flow-drawer"
      destroyOnClose
    >
      <div className="space-y-6 pb-12">
        {/* Step Progression Bar */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Tiến trình ca dịch vụ ({STATUS_STEPS.length} bước)
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 sm:gap-2">
            {STATUS_STEPS.map((s, idx) => {
              const isPassed = currentStepIdx > idx;
              const isCurrent = currentStepIdx === idx;
              let bgClass = 'bg-slate-200 dark:bg-slate-800 text-slate-400';
              let ringClass = '';

              if (isPassed) {
                bgClass = 'bg-emerald-500 text-white font-semibold';
              } else if (isCurrent) {
                bgClass = 'bg-emerald-600 text-white font-bold shadow-md';
                ringClass = 'ring-2 ring-emerald-400 ring-offset-1 dark:ring-offset-slate-900';
              }

              return (
                <div key={s.key} className="flex flex-col items-center text-center gap-1">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs transition-all ${bgClass} ${ringClass}`}
                  >
                    {isPassed ? <AppIcon icon={Check} size="sm" /> : s.stepNumber}
                  </div>
                  <span
                    className={`text-[10px] leading-tight line-clamp-1 ${
                      isCurrent
                        ? 'font-bold text-emerald-600 dark:text-emerald-400'
                        : isPassed
                          ? 'text-slate-600 dark:text-slate-300 font-medium'
                          : 'text-slate-400'
                    }`}
                  >
                    {s.shortLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            BƯỚC 1: BOOKING INFO
        ═══════════════════════════════════════════════════════ */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Thông tin Booking</span>
            </div>
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              Đã xác nhận
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Ngày hẹn:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                {session.sessionDate ? dayjs(session.sessionDate).format('DD/MM/YYYY') : '--'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Giờ hẹn:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {session.bookingTime || 'Chưa đặt giờ'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Chuyên Viên:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {session.technicianName || 'Cô Đẫm (Lead)'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Số điện thoại:</span>
              <div className="flex items-center gap-1">
                <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                  {session.customerPhone}
                </span>
                <CopyPhoneButton phone={session.customerPhone} size="xs" />
              </div>
            </div>
          </div>

          {session.bookingNote && (
            <div className="text-xs p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
              <span className="font-bold">Ghi chú booking: </span>
              {session.bookingNote}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════
            BƯỚC 2: CHECK-IN
        ═══════════════════════════════════════════════════════ */}
        <div
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
            currentStatus === 'BOOKED'
              ? 'border-emerald-400 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  session.checkInAt
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                2
              </span>
              <div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Check-in Khách Đến</span>
                <div className="text-xs text-slate-400">Ghi nhận chính xác ngày + giờ khách có mặt tại shop</div>
              </div>
            </div>
            {session.checkInAt ? (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Đã Check-in
              </span>
            ) : (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                Chờ khách đến
              </span>
            )}
          </div>

          {session.checkInAt ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                <AppIcon icon={CheckCircle} size="sm" className="text-emerald-600" />
                <span>Khách đã check-in lúc:</span>
                <span className="font-bold tabular-nums">
                  {dayjs(session.checkInAt).format('HH:mm:ss · DD/MM/YYYY')}
                </span>
              </div>
              <Button size="small" type="text" onClick={handleCheckIn} loading={submittingAction === 'check-in'}>
                Cập nhật lại giờ
              </Button>
            </div>
          ) : (
            <Button
              type="primary"
              size="large"
              block
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-md flex items-center justify-center gap-2"
              onClick={handleCheckIn}
              loading={submittingAction === 'check-in'}
            >
              <AppIcon icon={Clock} size="sm" />
              Bấm Check-in Khách Đến Ngay
            </Button>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════
            BƯỚC 3: TƯ VẤN & ĐÁNH GIÁ ĐIỀU KIỆN MI
        ═══════════════════════════════════════════════════════ */}
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
                  Tư Vấn & Đánh Giá Điều Kiện Mi
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
              <span>Cần bấm Check-in khách đến (Bước 2) trước khi thực hiện tư vấn & đánh giá mi.</span>
            </div>
          ) : session.assessedAt && !isEditingAssessment ? (
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
                {(session.aiAssessment || aiAssessment) && (
                  <div className="mt-3 p-3 rounded-xl bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-violet-800 dark:text-violet-300">
                        <AppIcon icon={Sparkles} size="sm" className="text-violet-600 dark:text-violet-400" />
                        <span>Hồ sơ AI Lash Assessment</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-200/60 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-semibold">
                        {(session.aiAssessment || aiAssessment)?.method === 'MACRO_15X'
                          ? 'Kính Macro 15x'
                          : 'Ảnh thường'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-200">
                      <strong>Lash Profile:</strong> {(session.aiAssessment || aiAssessment)?.lashProfile?.summary}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {(session.aiAssessment || aiAssessment)?.lashProfile?.estimatedThickness && (
                        <div className="p-1.5 rounded bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300">
                          📏 Sợi mi:{' '}
                          <strong>{(session.aiAssessment || aiAssessment)?.lashProfile?.estimatedThickness}</strong>
                        </div>
                      )}
                      {(session.aiAssessment || aiAssessment)?.lashProfile?.cuticleCondition && (
                        <div className="p-1.5 rounded bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300">
                          🧬 Biểu bì:{' '}
                          <strong>{(session.aiAssessment || aiAssessment)?.lashProfile?.cuticleCondition}</strong>
                        </div>
                      )}
                    </div>

                    {(session.aiAssessment || aiAssessment)?.riskAttention && (
                      <div className="text-[11px] p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 text-amber-800 dark:text-amber-300">
                        <strong>Lưu ý kỹ thuật:</strong> {(session.aiAssessment || aiAssessment)?.riskAttention}
                      </div>
                    )}

                    {(session.aiAssessment || aiAssessment)?.recommendation && (
                      <div className="text-[11px] p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300">
                        <strong>Đề xuất SOP:</strong> Thuốc 1:{' '}
                        {(session.aiAssessment || aiAssessment)?.recommendation?.solution1DurationMinutes || 10}p ·
                        Thuốc 2: {(session.aiAssessment || aiAssessment)?.recommendation?.solution2DurationMinutes || 8}
                        p · Trục: {(session.aiAssessment || aiAssessment)?.recommendation?.recommendedRodSize || 'M'}
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
                <Button
                  size="small"
                  icon={<AppIcon icon={Sparkles} size="sm" className="text-violet-600" />}
                  onClick={() => setIsEditingAssessment(true)}
                >
                  Phân tích lại AI / Chỉnh sửa
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
              {/* Hidden file inputs for macro lens capture */}
              <input
                type="file"
                ref={macroCameraInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadPhoto('macro', file);
                  e.target.value = '';
                }}
              />
              <input
                type="file"
                ref={macroLibraryInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadPhoto('macro', file);
                  e.target.value = '';
                }}
              />

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
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">
                              {crit.name}
                            </span>
                          </div>
                          {crit.description && (
                            <div className="text-[11px] text-slate-400 pl-6 mt-0.5">{crit.description}</div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pl-6 sm:pl-0">
                          <Radio.Group
                            size="small"
                            value={isPassed ? 'PASS' : 'FAIL'}
                            onChange={(e) => {
                              const passed = e.target.value === 'PASS';
                              setEvaluations((prev) => ({
                                ...prev,
                                [crit.id]: {
                                  criterionId: crit.id,
                                  name: crit.name,
                                  passed,
                                  note: prev[crit.id]?.note || '',
                                },
                              }));
                            }}
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

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  {macroPhotoUrl || session.beforePhotoUrl ? (
                    <div className="flex items-center gap-3">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 shrink-0">
                        <img
                          src={resolveMediaUrl(macroPhotoUrl || session.beforePhotoUrl!)}
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
                            onClick={() => macroCameraInputRef.current?.click()}
                            loading={submittingAction === 'upload-macro'}
                          >
                            Chụp lại
                          </Button>
                          <Button
                            size="small"
                            icon={<AppIcon icon={ImageIcon} size="sm" />}
                            onClick={() => macroLibraryInputRef.current?.click()}
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
                          onClick={() => macroCameraInputRef.current?.click()}
                          loading={submittingAction === 'upload-macro'}
                          className="h-10 rounded-lg font-semibold"
                        >
                          Chụp Kính Macro 15x
                        </Button>
                        <Button
                          icon={<AppIcon icon={ImageIcon} size="sm" />}
                          onClick={() => macroLibraryInputRef.current?.click()}
                          loading={submittingAction === 'upload-macro'}
                          className="h-10 rounded-lg"
                        >
                          Chọn từ thư viện
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. NÚT KÍCH HOẠT AI ANALYZE */}
              <div className="pt-1">
                <Button
                  type="primary"
                  size="large"
                  block
                  className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold h-12 rounded-xl shadow-md flex items-center justify-center gap-2 border-0"
                  onClick={() => handleRunAiAnalysis()}
                  loading={isAnalyzingAi}
                >
                  <AppIcon icon={Sparkles} size="sm" className="text-amber-300" />
                  <span>AI Phân Tích Điều Kiện Mi (Macro 15x)</span>
                </Button>
              </div>

              {/* 4. HỘP KẾT QUẢ AI PHÂN TÍCH */}
              {aiAssessment && (
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
                            onClick={() => handleSaveAssessment({ overrideResult: 'PASS' })}
                            loading={submittingAction === 'save-assessment'}
                          >
                            <AppIcon icon={CheckCircle} size="sm" />
                            <span>Xác Nhận ĐỦ ĐIỀU KIỆN (PASS)</span>
                          </Button>
                          <Button
                            danger
                            className="font-semibold h-10 rounded-xl"
                            onClick={() => {
                              setAssessmentResult('FAIL');
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
                            onClick={() => handleSaveAssessment({ overrideResult: 'FAIL' })}
                            loading={submittingAction === 'save-assessment'}
                          >
                            <AppIcon icon={XCircle} size="sm" />
                            <span>Xác Nhận KHÔNG ĐỦ ĐIỀU KIỆN (FAIL)</span>
                          </Button>
                          <Button
                            className="font-semibold h-10 rounded-xl"
                            onClick={() => {
                              setAssessmentResult('PASS');
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
                    * AI chỉ hỗ trợ đánh giá thẩm mỹ và kỹ thuật mi, không chẩn đoán y khoa. Quyết định cuối cùng do cô
                    Đẫm xác nhận.
                  </div>
                </div>
              )}

              {/* 5. FORM KẾT LUẬN & ĐIỀU CHỈNH THỦ CÔNG */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Kết luận đánh giá cuối cùng của Cô Đẫm: <span className="text-rose-500">*</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setAssessmentResult('PASS')}
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
                    onClick={() => setAssessmentResult('FAIL')}
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
                    onChange={(e) => setAssessmentReason(e.target.value)}
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
                  onChange={(e) => setAssessmentNotes(e.target.value)}
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
                  onClick={() => handleSaveAssessment()}
                  loading={submittingAction === 'save-assessment'}
                >
                  <AppIcon icon={CheckCircle} size="sm" />
                  {assessmentResult === 'FAIL'
                    ? 'Xác Nhận Không Đủ Điều Kiện & Chuyển Check-out'
                    : 'Xác Nhận Đủ Điều Kiện & Tiếp Tục Làm Dịch Vụ'}
                </Button>
                {isEditingAssessment && session.assessedAt && (
                  <Button className="h-11 rounded-xl font-medium" onClick={() => setIsEditingAssessment(false)}>
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

        {/* ═══════════════════════════════════════════════════
            BƯỚC 4: BEFORE PHOTO (Bắt buộc trước khi làm)
        ═══════════════════════════════════════════════════════ */}
        <div
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
            isIneligible
              ? 'opacity-40 pointer-events-none border-slate-200 dark:border-slate-800'
              : currentStatus === 'ASSESSED' || currentStatus === 'CHECKED_IN'
                ? 'border-emerald-400 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  session.beforePhotoUrl
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                4
              </span>
              <div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Ảnh Trước Khi Làm (Before Photo)
                </span>
                <div className="text-xs text-rose-500 font-medium">Bắt buộc chụp trước khi bắt đầu dịch vụ</div>
              </div>
            </div>
            {isIneligible ? (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                Bỏ qua (FAIL)
              </span>
            ) : session.beforePhotoUrl ? (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Đã có ảnh Before
              </span>
            ) : (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                Chưa chụp
              </span>
            )}
          </div>

          {/* Hidden inputs for Camera and Photo Library */}
          <input
            type="file"
            ref={beforeCameraInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadPhoto('before', file);
              e.target.value = '';
            }}
          />
          <input
            type="file"
            ref={beforeLibraryInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadPhoto('before', file);
              e.target.value = '';
            }}
          />

          {session.beforePhotoUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 aspect-[4/3] max-h-64 flex items-center justify-center">
                <img
                  src={resolveMediaUrl(session.beforePhotoUrl)}
                  alt="Before Photo"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-white text-xs font-bold">
                  BEFORE PHOTO
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  icon={<AppIcon icon={Camera} size="sm" />}
                  onClick={() => beforeCameraInputRef.current?.click()}
                  loading={submittingAction === 'upload-before'}
                >
                  Chụp lại Camera
                </Button>
                <Button
                  icon={<AppIcon icon={ImageIcon} size="sm" />}
                  onClick={() => beforeLibraryInputRef.current?.click()}
                  loading={submittingAction === 'upload-before'}
                >
                  Đổi từ thư viện
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center bg-slate-50 dark:bg-slate-800/40">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2">
                <AppIcon icon={Camera} size="md" />
              </div>
              <div className="font-bold text-sm text-slate-800 dark:text-slate-100">Chụp / Tải ảnh Trước khi làm</div>
              <div className="text-xs text-slate-400 mt-1 mb-4">
                Chụp trực tiếp bằng Camera hoặc chọn ảnh có sẵn từ thư viện điện thoại
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                <Button
                  type="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  icon={<AppIcon icon={Camera} size="sm" />}
                  onClick={() => beforeCameraInputRef.current?.click()}
                  loading={submittingAction === 'upload-before'}
                >
                  Chụp Camera
                </Button>
                <Button
                  icon={<AppIcon icon={ImageIcon} size="sm" />}
                  onClick={() => beforeLibraryInputRef.current?.click()}
                  loading={submittingAction === 'upload-before'}
                  className="border-slate-300 dark:border-slate-700 font-medium"
                >
                  Thư viện ảnh
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════
            BƯỚC 5: SERVICE DONE
        ═══════════════════════════════════════════════════════ */}
        <div
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
            isIneligible
              ? 'opacity-40 pointer-events-none border-slate-200 dark:border-slate-800'
              : currentStatus === 'BEFORE_PHOTO'
                ? 'border-emerald-400 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  session.serviceDoneAt
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                5
              </span>
              <div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Hoàn Thành Dịch Vụ (Service Done)
                </span>
                <div className="text-xs text-slate-400">Chuyên Viên hoàn tất uốn mi bóng tối cho khách</div>
              </div>
            </div>
            {isIneligible ? (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                Bỏ qua (FAIL)
              </span>
            ) : session.serviceDoneAt ? (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Đã hoàn thành
              </span>
            ) : (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
                Đang thực hiện
              </span>
            )}
          </div>

          {/* Step-by-step SOP timer */}
          <div className="mb-4">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
              Bấm giờ theo từng bước kỹ thuật (SOP Timer)
            </div>
            <PilotStepTimer
              sessionId={session.id}
              steps={sessionSteps}
              onStepsChange={handleStepsChange}
              readOnly={isIneligible}
              aiAssessment={session.aiAssessment || aiAssessment}
            />
          </div>

          {session.serviceDoneAt ? (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between text-xs">
              <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                Dịch vụ hoàn thành lúc:{' '}
                <strong className="tabular-nums font-bold">
                  {dayjs(session.serviceDoneAt).format('HH:mm:ss · DD/MM/YYYY')}
                </strong>
              </span>
              <Button
                size="small"
                type="text"
                onClick={handleServiceDone}
                loading={submittingAction === 'service-done'}
              >
                Cập nhật lại
              </Button>
            </div>
          ) : (
            <Button
              type="primary"
              size="large"
              block
              disabled={!session.beforePhotoUrl || isIneligible}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl shadow-md flex items-center justify-center gap-2"
              onClick={handleServiceDone}
              loading={submittingAction === 'service-done'}
            >
              <AppIcon icon={CheckCircle} size="sm" />
              Đánh Dấu Hoàn Thành Dịch Vụ
            </Button>
          )}
          {!session.beforePhotoUrl && !session.serviceDoneAt && !isIneligible && (
            <div className="text-[11px] text-rose-500 mt-2 flex items-center gap-1">
              <AppIcon icon={AlertCircle} size="sm" />
              <span>Cần chụp ảnh Before (Bước 4) trước khi bấm hoàn tất dịch vụ.</span>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════
            BƯỚC 6: AFTER PHOTO & BEFORE/AFTER COMPARISON
        ═══════════════════════════════════════════════════════ */}
        <div
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
            isIneligible
              ? 'opacity-40 pointer-events-none border-slate-200 dark:border-slate-800'
              : currentStatus === 'SERVICE_DONE'
                ? 'border-emerald-400 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  session.afterPhotoUrl
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                6
              </span>
              <div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Ảnh Sau Khi Làm (After Photo)
                </span>
                <div className="text-xs text-rose-500 font-medium">Bắt buộc để đối chiếu Before/After & Check-out</div>
              </div>
            </div>
            {isIneligible ? (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                Bỏ qua (FAIL)
              </span>
            ) : session.afterPhotoUrl ? (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Đã có ảnh After
              </span>
            ) : (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                Chưa chụp
              </span>
            )}
          </div>

          {/* Hidden inputs for Camera and Photo Library */}
          <input
            type="file"
            ref={afterCameraInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadPhoto('after', file);
              e.target.value = '';
            }}
          />
          <input
            type="file"
            ref={afterLibraryInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadPhoto('after', file);
              e.target.value = '';
            }}
          />

          {session.afterPhotoUrl ? (
            <div className="space-y-4">
              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 aspect-[4/3] flex items-center justify-center">
                  <img
                    src={resolveMediaUrl(session.beforePhotoUrl)}
                    alt="Before Photo"
                    className="w-full h-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-white text-[11px] font-bold">
                    TRƯỚC (BEFORE)
                  </div>
                </div>

                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 aspect-[4/3] flex items-center justify-center">
                  <img
                    src={resolveMediaUrl(session.afterPhotoUrl)}
                    alt="After Photo"
                    className="w-full h-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-600/90 backdrop-blur-md text-white text-[11px] font-bold">
                    SAU (AFTER) ✨
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  icon={<AppIcon icon={Camera} size="sm" />}
                  onClick={() => afterCameraInputRef.current?.click()}
                  loading={submittingAction === 'upload-after'}
                >
                  Chụp lại Camera
                </Button>
                <Button
                  icon={<AppIcon icon={ImageIcon} size="sm" />}
                  onClick={() => afterLibraryInputRef.current?.click()}
                  loading={submittingAction === 'upload-after'}
                >
                  Đổi từ thư viện
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center bg-slate-50 dark:bg-slate-800/40">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-2">
                <AppIcon icon={Camera} size="md" />
              </div>
              <div className="font-bold text-sm text-slate-800 dark:text-slate-100">Chụp / Tải ảnh Sau khi làm</div>
              <div className="text-xs text-slate-400 mt-1 mb-4">
                Chụp trực tiếp bằng Camera hoặc chọn ảnh có sẵn từ thư viện điện thoại
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                <Button
                  type="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                  icon={<AppIcon icon={Camera} size="sm" />}
                  onClick={() => afterCameraInputRef.current?.click()}
                  loading={submittingAction === 'upload-after'}
                >
                  Chụp Camera
                </Button>
                <Button
                  icon={<AppIcon icon={ImageIcon} size="sm" />}
                  onClick={() => afterLibraryInputRef.current?.click()}
                  loading={submittingAction === 'upload-after'}
                  className="border-slate-300 dark:border-slate-700 font-medium"
                >
                  Thư viện ảnh
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════
            BƯỚC 7: CUSTOMER FEEDBACK TẠI CHỖ
        ═══════════════════════════════════════════════════════ */}
        <div
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
            isIneligible
              ? 'opacity-40 pointer-events-none border-slate-200 dark:border-slate-800'
              : currentStatus === 'AFTER_PHOTO'
                ? 'border-emerald-400 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  session.feedbackRating
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                7
              </span>
              <div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Customer Feedback Tại ChỖ</span>
                <div className="text-xs text-rose-500 font-medium">
                  Bắt buộc khách chấm sao & góp ý trước khi Check-out
                </div>
              </div>
            </div>
            {isIneligible ? (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                Bỏ qua (FAIL)
              </span>
            ) : session.feedbackRating ? (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                {session.feedbackRating} ⭐ Đã đánh giá
              </span>
            ) : (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                Chưa đánh giá
              </span>
            )}
          </div>

          <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <div>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                Khách hàng đánh giá mức độ hài lòng (1 - 5 sao):
              </div>
              <div className="flex items-center gap-3">
                <Rate
                  value={feedbackRating}
                  onChange={(val) => setFeedbackRating(val)}
                  disabled={isIneligible}
                  className="text-amber-400 text-2xl"
                />
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                  {feedbackRating === 5 && '🌟 Rất hài lòng / Tuyệt vời'}
                  {feedbackRating === 4 && '👍 Hài lòng'}
                  {feedbackRating === 3 && '😐 Bình thường'}
                  {feedbackRating === 2 && '👎 Chưa hài lòng'}
                  {feedbackRating === 1 && '⚠️ Rất không hài lòng'}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Góp ý hoặc cảm nhận của khách (ngắn gọn):
              </div>
              <TextArea
                rows={2}
                placeholder="VD: Mi cong tự nhiên rất êm, nhân viên tư vấn nhiệt tình..."
                value={feedbackNote}
                disabled={isIneligible}
                onChange={(e) => setFeedbackNote(e.target.value)}
                className="rounded-lg"
              />
            </div>

            <Button
              type="primary"
              block
              disabled={isIneligible}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 rounded-xl"
              onClick={handleSaveFeedback}
              loading={submittingAction === 'feedback'}
            >
              Lưu Đánh Giá Feedback
            </Button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            BƯỚC 8: CHECK-OUT (Total Visit Duration)
        ═══════════════════════════════════════════════════════ */}
        <div
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
            currentStatus === 'FEEDBACK_DONE' || (isIneligible && currentStatus === 'INELIGIBLE')
              ? 'border-emerald-400 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  session.checkOutAt
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                8
              </span>
              <div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Check-out & Tính Thời Gian Phục Vụ
                </span>
                <div className="text-xs text-slate-400">Total Visit Duration = Check-out time – Check-in time</div>
              </div>
            </div>
            {session.checkOutAt ? (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Đã Check-out
              </span>
            ) : (
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
                Chưa Check-out
              </span>
            )}
          </div>

          {session.checkOutAt ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80">
                  <div className="text-[11px] text-slate-400 mb-0.5">Giờ Check-in</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm tabular-nums">
                    {session.checkInAt ? dayjs(session.checkInAt).format('HH:mm') : '--'}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80">
                  <div className="text-[11px] text-slate-400 mb-0.5">Giờ Check-out</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm tabular-nums">
                    {session.checkOutAt ? dayjs(session.checkOutAt).format('HH:mm') : '--'}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mb-0.5">
                    Thời lượng tại shop
                  </div>
                  <div className="font-extrabold text-emerald-800 dark:text-emerald-200 text-sm tabular-nums">
                    {session.totalDurationMinutes || 0} phút
                  </div>
                </div>
              </div>

              <div className="text-right">
                <Button size="small" type="text" onClick={handleCheckOut} loading={submittingAction === 'check-out'}>
                  Cập nhật lại giờ Check-out
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {!canCheckOut && !isIneligible && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AppIcon icon={AlertCircle} size="sm" className="text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold block mb-0.5">Chưa đủ điều kiện Check-out:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {!hasAfterPhoto && <li>Chưa upload ảnh Sau khi làm (After Photo - Bước 6)</li>}
                      {!hasFeedback && <li>Chưa hoàn thành đánh giá Feedback tại chỗ (Bước 7)</li>}
                    </ul>
                  </div>
                </div>
              )}

              <Button
                type="primary"
                size="large"
                block
                disabled={!canCheckOut}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold h-12 rounded-xl shadow-lg flex items-center justify-center gap-2"
                onClick={handleCheckOut}
                loading={submittingAction === 'check-out'}
              >
                <AppIcon icon={Check} size="md" />
                Check-out Khách Ra Về
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdaptiveDrawer>
  );
}

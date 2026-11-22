'use client';

import { useEffect, useState } from 'react';
import { message } from 'antd';
import type {
  PilotAiAssessment,
  PilotAssessmentCriterion,
  PilotCriterionEvaluation,
  PilotSession,
  PilotSessionStep,
  SavePilotAssessmentRequest,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  compressPilotImage,
  getPilotErrorMessage,
  getPilotFlowStatusIndex,
  type PilotCriterionEvaluationMap,
  type PilotPhotoUploadType,
  type SavePilotAssessmentOptions,
} from './pilot-flow-config';

export type { SavePilotAssessmentOptions };

interface UsePilotFlowDrawerParams {
  open: boolean;
  session: PilotSession | null;
  onSessionUpdated: (updated: PilotSession) => void;
}

export function usePilotFlowDrawer({ open, session, onSessionUpdated }: UsePilotFlowDrawerParams) {
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(session?.feedbackRating || session?.csatScore || 5);
  const [feedbackNote, setFeedbackNote] = useState<string>(session?.feedbackNote || '');

  const [sessionSteps, setSessionSteps] = useState<PilotSessionStep[]>(session?.steps || []);
  const [criteriaList, setCriteriaList] = useState<PilotAssessmentCriterion[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState<boolean>(false);
  const [evaluations, setEvaluations] = useState<PilotCriterionEvaluationMap>({});
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

  useEffect(() => {
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
  useEffect(() => {
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
        const evals: PilotCriterionEvaluationMap = {};
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

  const handleCriterionEvaluationChange = (criterionId: number, passed: boolean) => {
    setEvaluations((prev) => ({
      ...prev,
      [criterionId]: {
        passed,
        note: prev[criterionId]?.note || '',
      },
    }));
  };

  const handleCheckIn = async () => {
    if (!session) return;
    try {
      setSubmittingAction('check-in');
      const updated = await apiClient.pilot.checkIn(session.id);
      message.success('Đã ghi nhận Check-in khách đến shop!');
      onSessionUpdated(updated);
    } catch (err: unknown) {
      message.error(getPilotErrorMessage(err, 'Không thể check-in.'));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleUploadPhoto = async (type: PilotPhotoUploadType, file: File) => {
    if (!session) return;
    try {
      setSubmittingAction(`upload-${type}`);
      const typeLabel = type === 'before' ? 'Trước' : type === 'after' ? 'Sau' : 'Kính Macro 15x';
      message.loading({ content: `Đang xử lý và tải ảnh ${typeLabel}...`, key: `upload-${type}` });
      const compressedBase64 = await compressPilotImage(file);
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
    } catch (err: unknown) {
      console.error(`[Upload ${type} error]`, err);
      message.error({
        content: getPilotErrorMessage(err, `Lỗi tải ảnh ${type}. Vui lòng thử lại.`, true),
        key: `upload-${type}`,
      });
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleRunAiAnalysis = async (customPhotoUrl?: string) => {
    if (!session) return;
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
    } catch (err: unknown) {
      console.error('[AI Analyze error]', err);
      message.error({
        content: getPilotErrorMessage(err, 'Lỗi khi phân tích AI.', true),
        key: 'ai-analyzing',
      });
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleServiceDone = async () => {
    if (!session) return;
    try {
      setSubmittingAction('service-done');
      const updated = await apiClient.pilot.markServiceDone(session.id);
      message.success('Đã hoàn tất dịch vụ Uốn Mi Bóng Tối!');
      onSessionUpdated(updated);
    } catch (err: unknown) {
      message.error(getPilotErrorMessage(err, 'Không thể cập nhật trạng thái làm xong.'));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleSaveFeedback = async () => {
    if (!session) return;
    try {
      setSubmittingAction('feedback');
      const updated = await apiClient.pilot.saveFeedback(session.id, {
        feedbackRating,
        feedbackNote,
      });
      message.success('Đã lưu đánh giá của khách!');
      onSessionUpdated(updated);
    } catch (err: unknown) {
      message.error(getPilotErrorMessage(err, 'Không thể lưu feedback.'));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleSaveAssessment = async (options?: SavePilotAssessmentOptions) => {
    if (!session) return;
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
    } catch (err: unknown) {
      message.error(getPilotErrorMessage(err, 'Không thể lưu kết quả đánh giá.'));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleCheckOut = async () => {
    if (!session) return;
    try {
      setSubmittingAction('check-out');
      const updated = await apiClient.pilot.checkOut(session.id);
      message.success(
        `Đã check-out thành công! Tổng thời gian khách tại shop: ${updated.totalDurationMinutes || 0} phút.`
      );
      onSessionUpdated(updated);
    } catch (err: unknown) {
      message.error(getPilotErrorMessage(err, 'Không thể check-out.'));
    } finally {
      setSubmittingAction(null);
    }
  };

  const currentStatus = session?.status || 'BOOKED';
  const currentStepIdx = getPilotFlowStatusIndex(currentStatus);
  const isIneligible = session ? session.status === 'INELIGIBLE' || session.assessmentStatus === 'FAIL' : false;
  const hasAfterPhoto = Boolean(session?.afterPhotoUrl);
  const hasFeedback = Boolean(session?.feedbackRating || session?.csatScore);
  const canCheckOut = isIneligible ? true : hasAfterPhoto && hasFeedback;

  return {
    submittingAction,
    feedbackRating,
    setFeedbackRating,
    feedbackNote,
    setFeedbackNote,
    sessionSteps,
    criteriaList,
    loadingCriteria,
    evaluations,
    assessmentResult,
    setAssessmentResult,
    assessmentReason,
    setAssessmentReason,
    assessmentNotes,
    setAssessmentNotes,
    isEditingAssessment,
    setIsEditingAssessment,
    aiAssessment,
    macroPhotoUrl,
    isAnalyzingAi,
    currentStatus,
    currentStepIdx,
    isIneligible,
    hasAfterPhoto,
    hasFeedback,
    canCheckOut,
    handleStepsChange,
    handleCriterionEvaluationChange,
    handleCheckIn,
    handleUploadPhoto,
    handleRunAiAnalysis,
    handleServiceDone,
    handleSaveFeedback,
    handleSaveAssessment,
    handleCheckOut,
  };
}

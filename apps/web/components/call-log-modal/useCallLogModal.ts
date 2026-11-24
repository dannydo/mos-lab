'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Form, message } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import type { CallOutcome, CallResult, CreateCallRequest } from '@mos-lab/shared';
import { useOmiCall } from '~/context/OmiCallContext';
import { useTheme } from '~/context/ThemeContext';
import { apiClient } from '~/lib/api-client';
import { notifyCallLogSaved } from '~/lib/call-events';
import { clearSessionDraft, readSessionDraft, writeSessionDraft } from '~/lib/note-draft-storage';
import {
  buildFormSubmitPayload,
  buildQuickActionPayload,
  resolveCallTargetCustomer,
  resolveDispositionDefaults,
  resolveInitialCallDefaults,
} from './callLogModalHelpers';
import type {
  CallLogFormValues,
  CallLogModalProps,
  CallLogSubmitPayload,
  QuickActionType,
  QuickNotePreset,
  ResolvedCallLog,
} from './callLogModalTypes';

export function useCallLogModal({
  visible: propVisible,
  onCancel: propOnCancel,
  onSuccess: propOnSuccess,
  planId: propPlanId,
  legacyUserId: propLegacyUserId,
  customerName: propCustomerName,
}: CallLogModalProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const [form] = Form.useForm<CallLogFormValues>();
  const [loading, setLoading] = useState(false);
  const [callResult, setCallResult] = useState<CallResult>('ANSWERED');
  const [outcome, setOutcome] = useState<CallOutcome>('PENDING');
  const [unlockedLogOverride, setUnlockedLogOverride] = useState<ResolvedCallLog | null>(null);
  const [canReviewQa, setCanReviewQa] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSubmittingRef = useRef(false);
  const noteInputRef = useRef<TextAreaRef | null>(null);

  const {
    isCallLogModalOpen,
    callLogCustomerInfo,
    closeCallLogModal,
    callState,
    currentCall,
    callDuration,
    resolvedLog: rawResolvedLog,
  } = useOmiCall();

  const baseResolvedLog = (rawResolvedLog ?? null) as ResolvedCallLog | null;
  const resolvedLog: ResolvedCallLog | null = unlockedLogOverride
    ? {
        ...(baseResolvedLog || {}),
        ...unlockedLogOverride,
        // Keep fresh AI fields if background poll finishes after staff self-rated
        analysisStatus:
          baseResolvedLog?.analysisStatus === 'DONE' && unlockedLogOverride.analysisStatus !== 'DONE'
            ? baseResolvedLog.analysisStatus
            : (unlockedLogOverride.analysisStatus ?? baseResolvedLog?.analysisStatus),
      }
    : baseResolvedLog;
  const visible = propVisible !== undefined ? propVisible : isCallLogModalOpen;
  const onCancel = propOnCancel || closeCallLogModal;
  const onSuccess = propOnSuccess || (() => {});

  const activeCall = currentCall || (callState === 'wrapup' ? currentCall : null);
  const { legacyUserId, customerName, planId } = resolveCallTargetCustomer({
    activeCall,
    currentCall,
    callLogCustomerInfo,
    propLegacyUserId,
    propCustomerName,
    propPlanId,
  });
  const noteDraftKey =
    legacyUserId && legacyUserId > 0
      ? `mos_call_log_note_draft:${legacyUserId}`
      : activeCall?.phone
        ? `mos_call_log_note_draft:phone:${activeCall.phone}`
        : null;
  const watchedNote = Form.useWatch('note', form);

  const focusNoteInput = useCallback((delayMs: number) => {
    return setTimeout(() => {
      if (noteInputRef.current) {
        try {
          noteInputRef.current.focus({ cursor: 'end' });
        } catch {
          noteInputRef.current.focus?.();
        }
      }
    }, delayMs);
  }, []);

  // 1. Initial defaults on open (restore any unsaved note draft for this target)
  const prevVisibleRef = useRef(false);
  useEffect(() => {
    const justOpened = visible && !prevVisibleRef.current;
    prevVisibleRef.current = visible;
    if (!visible) {
      setUnlockedLogOverride(null);
      return;
    }
    if (!justOpened) return;
    setUnlockedLogOverride(null);
    try {
      const stored = localStorage.getItem('mos_user');
      if (stored) {
        const parsed = JSON.parse(stored) as { role?: string };
        const role = String(parsed.role || '').toLowerCase();
        setCanReviewQa(['admin', 'super_admin', 'manager', 'qa', 'qc', 'qa_qc'].includes(role));
      }
    } catch {
      setCanReviewQa(false);
    }
    form.resetFields();
    const defaults = resolveInitialCallDefaults(activeCall, resolvedLog, callDuration);
    const savedNoteDraft = readSessionDraft<string>(noteDraftKey);
    form.setFieldsValue({
      callResult: defaults.callResult,
      outcome: defaults.outcome,
      note: savedNoteDraft && savedNoteDraft.trim().length > 0 ? savedNoteDraft : defaults.note,
    });
    setCallResult(defaults.callResult);
    setOutcome(defaults.outcome);
  }, [visible, form, activeCall, resolvedLog, callDuration, noteDraftKey]);

  useEffect(() => {
    if (!visible || !noteDraftKey || watchedNote === undefined) return;
    if (String(watchedNote).trim().length > 0) {
      writeSessionDraft<string>(noteDraftKey, String(watchedNote));
    } else {
      clearSessionDraft(noteDraftKey);
    }
  }, [visible, noteDraftKey, watchedNote]);

  // 2. Update when resolvedLog is loaded if user hasn't touched the fields yet
  useEffect(() => {
    if (!visible || !activeCall || !resolvedLog) return;
    const { callResult: newResult, note: newNote } = resolveDispositionDefaults(resolvedLog.disposition);

    if (!form.isFieldTouched('callResult')) {
      form.setFieldsValue({ callResult: newResult });
      setCallResult(newResult);
    }
    if (newNote && !form.isFieldTouched('note') && !form.getFieldValue('note')) {
      form.setFieldsValue({ note: newNote });
    }
  }, [visible, activeCall, resolvedLog, form]);

  // 3. Auto-focus note textarea when modal opens
  useEffect(() => {
    if (!visible) return;
    const timer = focusNoteInput(150);
    return () => clearTimeout(timer);
  }, [visible, focusNoteInput]);

  const handleApplyQuickNotePreset = useCallback(
    (preset: QuickNotePreset) => {
      form.setFieldsValue({ note: preset.text });
      if (preset.result) {
        form.setFieldsValue({ callResult: preset.result });
        setCallResult(preset.result);
      }
      if (preset.outcome) {
        form.setFieldsValue({ outcome: preset.outcome });
        setOutcome(preset.outcome);
      }
      focusNoteInput(50);
    },
    [form, focusNoteInput]
  );

  const handleCallResultChange = useCallback(
    (value: CallResult) => {
      setCallResult(value);
      if (value !== 'ANSWERED') {
        form.setFieldsValue({ outcome: 'PENDING' });
        setOutcome('PENDING');
      }
    },
    [form]
  );

  const handleOutcomeChange = useCallback((value: CallOutcome) => {
    setOutcome(value);
  }, []);

  const handleApplyAiAnalysisToNote = useCallback(() => {
    if (!resolvedLog?.satisfactionAnalysis) return;
    const currentNote = form.getFieldValue('note') || '';
    const prefix = currentNote ? `${currentNote}\n` : '';
    form.setFieldValue('note', `${prefix}${resolvedLog.satisfactionAnalysis}`);
  }, [form, resolvedLog]);

  const handleSubmitShortcut = useCallback(() => {
    if (!loading && !isSubmittingRef.current) {
      form.submit();
    }
  }, [form, loading]);

  const resolveTargetUserId = async (): Promise<number | null> => {
    if (legacyUserId && legacyUserId > 0) return legacyUserId;
    const phoneToLookup = activeCall?.phone || currentCall?.phone;
    if (phoneToLookup) {
      try {
        const found = await apiClient.customers.list({ search: phoneToLookup, limit: '1' });
        if (found?.data && found.data.length > 0) {
          return found.data[0].id;
        }
      } catch (err) {
        console.error('Lookup customer by phone failed:', err);
      }
    }
    return null;
  };

  const submitCallLog = async (
    buildPayload: (targetUserId: number) => CallLogSubmitPayload,
    successMessage: string,
    errorLabel: string
  ) => {
    if (isSubmittingRef.current || loading) return;
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const targetUserId = await resolveTargetUserId();
      if (!targetUserId) {
        message.error('Không tìm thấy thông tin khách hàng để lưu nhật ký. Vui lòng thử lại!');
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      const data = buildPayload(targetUserId);
      const savedLog = await apiClient.calls.create(data as CreateCallRequest);
      clearSessionDraft(noteDraftKey);
      message.success(successMessage);
      notifyCallLogSaved({
        customerId: targetUserId,
        callLog: {
          id: savedLog?.id,
          createdAt: savedLog?.createdAt || new Date().toISOString(),
          durationSec: data.durationSec,
          callResult: data.callResult,
          note: data.note,
        },
      });
      window.dispatchEvent(new CustomEvent('mos-booking-updated'));
      onSuccess();
      onCancel();
    } catch (error) {
      console.error(`${errorLabel}:`, error);
      message.error('Không thể ghi nhận cuộc gọi.');
    } finally {
      setLoading(false);
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 500);
    }
  };

  const handleQuickAction = async (actionType: QuickActionType) => {
    await submitCallLog(
      (targetUserId) =>
        buildQuickActionPayload({
          actionType,
          targetUserId,
          planId,
          activeCall,
          callDuration,
          resolvedLog,
        }),
      'Ghi nhận cuộc gọi nhanh thành công!',
      'Quick call log error'
    );
  };

  const handleFinish = async (values: CallLogFormValues) => {
    await submitCallLog(
      (targetUserId) =>
        buildFormSubmitPayload({
          values,
          targetUserId,
          planId,
          activeCall,
          callDuration,
          resolvedLog,
        }),
      'Ghi nhận lịch sử cuộc gọi thành công!',
      'Save call log error'
    );
  };

  const handleSelfAssessmentSubmitted = useCallback((updatedLog: ResolvedCallLog) => {
    setUnlockedLogOverride(updatedLog);
  }, []);

  return {
    form,
    isDark,
    visible,
    loading,
    onCancel,
    activeCall,
    customerName,
    callDuration,
    resolvedLog,
    canReviewQa,
    callResult,
    outcome,
    audioRef,
    noteInputRef,
    handleSelfAssessmentSubmitted,
    handleQuickAction,
    handleFinish,
    handleApplyQuickNotePreset,
    handleCallResultChange,
    handleOutcomeChange,
    handleApplyAiAnalysisToNote,
    handleSubmitShortcut,
  };
}

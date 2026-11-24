import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
import { apiClient } from '../../lib/api-client';
import { notifyCallLogSaved } from '../../lib/call-events';

export const useWrapupForm = (
  currentCall: SafeAny,
  callState: string,
  isSimulated: boolean,
  callDuration: number,
  setCallState: (state: SafeAny) => void,
  setCurrentCall: (call: SafeAny) => void,
  setWidgetMinimized: (min: boolean) => void
) => {
  const [noteForm] = Form.useForm();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submittingWrapup, setSubmittingWrapup] = useState(false);
  const [resolvedLog, setResolvedLog] = useState<SafeAny>(null);

  const availableTags = ['Đặt lịch hẹn', 'Khách quan tâm', 'Đã gửi Zalo', 'Hẹn gọi lại', 'Đặt cọc thành công'];

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  // Polling AI analysis log during wrapup
  const currentPhone = currentCall?.phone || '';
  const currentDirection = currentCall?.direction || 'outbound';
  const currentCallUuid = currentCall?.callUuid || '';
  const currentName = currentCall?.name || '';
  const currentLegacyUserId = currentCall?.legacyUserId || 0;
  const hasCurrentCall = Boolean(currentCall);

  useEffect(() => {
    if (callState !== 'wrapup' || !hasCurrentCall) {
      setResolvedLog(null);
      return;
    }

    if (isSimulated) {
      setResolvedLog({
        id: 0,
        customerName: currentName,
        legacyUserId: currentLegacyUserId,
        callUuid: currentCallUuid || 'simulated-' + Date.now(),
        analysisStatus: 'PROCESSING',
      });

      const simTimer = setTimeout(() => {
        setResolvedLog({
          id: 0,
          customerName: currentName,
          legacyUserId: currentLegacyUserId,
          callUuid: currentCallUuid || 'simulated-' + Date.now(),
          analysisStatus: 'DONE',
          happyCallStatus: 'APPROVED',
          happyCallReason: 'auto_laughter_30s',
          callType: 'CSKH',
          qaTags: ['CSKH', 'Xuất sắc'],
          customerSatisfactionScore: 5,
          customerSentiment: 'HAPPY',
          satisfactionAnalysis:
            'Khách hàng rất hài lòng với thái độ tư vấn nhẹ nhàng và thông tin rõ ràng của nhân viên.',
          laughCount: 3,
          laughCountAgent: 2,
          laughCountCustomer: 1,
          laughTimestamps: [
            { start: 4, end: 6, speaker: 'agent', confidence: 0.95 },
            { start: 12, end: 15, speaker: 'customer', confidence: 0.98 },
            { start: 22, end: 24, speaker: 'agent', confidence: 0.93 },
          ],
          recordingUrl: 'https://github.com/rafaelreis-hotmart/Audio-Sample-files/raw/master/sample.wav',
        });
      }, 2500);

      return () => clearTimeout(simTimer);
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;

    const pollLog = async () => {
      if (cancelled) return;
      attempts++;
      try {
        const data = (await apiClient.omicall.getLatestLog({
          phone: currentPhone,
          direction: currentDirection,
          ...(currentCallUuid ? { callUuid: currentCallUuid } : {}),
        })) as SafeAny;

        if (cancelled) return;

        if (data && data.id) {
          setResolvedLog(data);

          // Update current call with resolved customer name and ID only if changed
          setCurrentCall((prev: SafeAny) => {
            if (!prev) return null;
            const nextLegacyUserId = data.legacyUserId || prev.legacyUserId;
            const nextName = data.customerName || prev.name;
            const nextCallUuid = data.callUuid || prev.callUuid;
            if (nextLegacyUserId === prev.legacyUserId && nextName === prev.name && nextCallUuid === prev.callUuid) {
              return prev;
            }
            return {
              ...prev,
              legacyUserId: nextLegacyUserId,
              name: nextName,
              callUuid: nextCallUuid,
            };
          });

          if (['DONE', 'FAILED', 'SKIPPED'].includes(data.analysisStatus)) {
            if (intervalId) clearInterval(intervalId);
            return;
          }
        }
      } catch (_err) {
        // Log not ready yet
      }

      if (attempts >= 30) {
        console.warn('[OmiCallWidget] AI analysis polling timed out');
        if (intervalId) clearInterval(intervalId);
        setResolvedLog((prev: SafeAny) => {
          if (prev && ['DONE', 'FAILED', 'SKIPPED'].includes(prev.analysisStatus)) {
            return prev;
          }
          return {
            ...(prev || {}),
            analysisStatus: 'TIMEOUT',
            analysisError:
              'Chưa nhận được kết quả phân tích từ OmiCall/AI (quá 90 giây). Bạn vẫn có thể lưu nhật ký bình thường.',
          };
        });
      }
    };

    intervalId = setInterval(() => {
      void pollLog();
    }, 3000);
    void pollLog();
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [
    callState,
    currentCallUuid,
    currentDirection,
    currentLegacyUserId,
    currentName,
    currentPhone,
    hasCurrentCall,
    isSimulated,
    setCurrentCall,
  ]);

  const handleSaveWrapup = useCallback(async () => {
    if (!currentCall) return;

    try {
      const values = await noteForm.validateFields();
      setSubmittingWrapup(true);

      const payload = {
        legacyUserId: currentCall.legacyUserId || 0,
        callType: currentCall.direction === 'outbound' ? ('OUTBOUND' as const) : ('INBOUND' as const),
        callResult: callDuration > 0 ? ('ANSWERED' as const) : ('NO_ANSWER' as const),
        note: values.note || '',
        outcome: selectedTags.join(', '),
        durationSec: callDuration > 0 ? callDuration : resolvedLog?.duration || 0,
        callbackDate: values.callbackDate ? values.callbackDate.toISOString() : null,
        omicallLogId: resolvedLog?.id || null,
        callUuid: currentCall.callUuid || null,
      };

      const savedLog = await apiClient.calls.create(payload as SafeAny);
      message.success('Đã lưu ghi chú cuộc gọi thành công!');
      notifyCallLogSaved({
        customerId: payload.legacyUserId,
        callLog: {
          id: savedLog?.id,
          createdAt: savedLog?.createdAt || new Date().toISOString(),
          durationSec: payload.durationSec,
          callResult: payload.callResult,
          note: payload.note,
        },
      });

      // Reset states
      setCallState('idle');
      setCurrentCall(null);
      setResolvedLog(null);
      setSelectedTags([]);
      noteForm.resetFields();
      setWidgetMinimized(false);
    } catch (err) {
      console.error('[OmiCallWidget] Failed to save call log:', err);
      message.error((err as SafeAny).response?.data?.message || 'Không thể lưu ghi chú cuộc gọi');
    } finally {
      setSubmittingWrapup(false);
    }
  }, [
    currentCall,
    callDuration,
    selectedTags,
    resolvedLog,
    noteForm,
    setCallState,
    setCurrentCall,
    setWidgetMinimized,
  ]);

  return {
    noteForm,
    selectedTags,
    setSelectedTags,
    submittingWrapup,
    resolvedLog,
    setResolvedLog,
    availableTags,
    handleTagToggle,
    handleSaveWrapup,
  };
};
export default useWrapupForm;

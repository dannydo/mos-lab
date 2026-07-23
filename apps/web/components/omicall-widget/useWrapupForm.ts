import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
import { apiClient } from '../../lib/api-client';

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
  useEffect(() => {
    if (callState !== 'wrapup' || !currentCall) {
      setResolvedLog(null);
      return;
    }

    if (isSimulated) {
      setResolvedLog({
        id: 0,
        customerName: currentCall.name,
        legacyUserId: currentCall.legacyUserId || 0,
        callUuid: currentCall.callUuid || 'simulated-' + Date.now(),
        analysisStatus: 'PROCESSING',
      });

      const simTimer = setTimeout(() => {
        setResolvedLog({
          id: 0,
          customerName: currentCall.name,
          legacyUserId: currentCall.legacyUserId || 0,
          callUuid: currentCall.callUuid || 'simulated-' + Date.now(),
          analysisStatus: 'DONE',
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

    let intervalId: SafeAny = null;
    let attempts = 0;

    const pollLog = async () => {
      attempts++;
      try {
        const data = (await apiClient.omicall.getLatestLog({
          phone: currentCall.phone,
          direction: currentCall.direction,
        })) as SafeAny;

        if (data && data.id) {
          setResolvedLog(data);

          // Update current call with resolved customer name and ID
          setCurrentCall((prev: SafeAny) =>
            prev
              ? {
                  ...prev,
                  legacyUserId: data.legacyUserId || prev.legacyUserId,
                  name: data.customerName || prev.name,
                  callUuid: data.callUuid || prev.callUuid,
                }
              : null
          );

          if (['DONE', 'FAILED', 'SKIPPED'].includes(data.analysisStatus)) {
            if (intervalId) clearInterval(intervalId);
            return;
          }
        }
      } catch (err) {
        // Log not ready yet
      }

      if (attempts >= 30) {
        console.warn('[OmiCallWidget] AI analysis polling timed out');
        if (intervalId) clearInterval(intervalId);
      }
    };

    intervalId = setInterval(pollLog, 3000);
    pollLog();
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [callState, currentCall, isSimulated, setCurrentCall]);

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

      await apiClient.calls.create(payload as SafeAny);
      message.success('Đã lưu ghi chú cuộc gọi thành công!');

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

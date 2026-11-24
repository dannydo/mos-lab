import { Dispatch, SetStateAction, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';
import { CallState, CurrentCall } from './types';

interface UseOmiCallWrapupPollingParams {
  callState: CallState;
  currentCall: CurrentCall | null;
  isSimulated: boolean;
  setResolvedLog: Dispatch<SetStateAction<SafeAny>>;
  setCurrentCall: Dispatch<SetStateAction<CurrentCall | null>>;
}

export function useOmiCallWrapupPolling({
  callState,
  currentCall,
  isSimulated,
  setResolvedLog,
  setCurrentCall,
}: UseOmiCallWrapupPollingParams) {
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
        // Log not persisted from webhook yet; keep polling until threshold
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
    currentDirection,
    currentLegacyUserId,
    currentName,
    currentPhone,
    currentCallUuid,
    hasCurrentCall,
    isSimulated,
    setCurrentCall,
    setResolvedLog,
  ]);
}

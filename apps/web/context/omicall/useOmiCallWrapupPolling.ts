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
  useEffect(() => {
    if (callState !== 'wrapup' || !currentCall) {
      setResolvedLog(null);
      return;
    }

    if (isSimulated) {
      // Step 1: Initial state (processing)
      setResolvedLog({
        id: 0,
        customerName: currentCall.name,
        legacyUserId: currentCall.legacyUserId || 0,
        callUuid: currentCall.callUuid || 'simulated-' + Date.now(),
        analysisStatus: 'PROCESSING',
      });

      // Step 2: Transition to DONE after 2.5 seconds with mock AI insights
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

          // Only stop polling when analysis is finalized or skipped
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
      }
    };

    intervalId = setInterval(pollLog, 3000);
    pollLog();
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [callState, currentCall, isSimulated, setCurrentCall, setResolvedLog]);
}

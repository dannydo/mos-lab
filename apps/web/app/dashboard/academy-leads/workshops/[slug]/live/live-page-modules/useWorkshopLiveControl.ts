'use client';

import React from 'react';
import { message } from 'antd';
import type {
  AcademyWorkshopDetail,
  AcademyWorkshopGameCommandRequest,
  AcademyWorkshopLiveState,
  AcademyWorkshopQuiz,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { connectAcademyWorkshopSocket, formatAgendaExecutionText } from '~/lib/academy-workshop-live';
import { safeStorage } from '~/lib/safe-storage';
import { SAMPLE_QUIZ_QUESTIONS, type AgendaCommandAction } from './live-control-constants';

function extractErrorMessage(cause: unknown, fallback: string): string {
  const err = cause as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message || fallback;
}

export function useWorkshopLiveControl(slug: string) {
  const [detail, setDetail] = React.useState<AcademyWorkshopDetail | null>(null);
  const [workshopId, setWorkshopId] = React.useState<number | null>(null);
  const [state, setState] = React.useState<AcademyWorkshopLiveState | null>(null);
  const [receivedAt, setReceivedAt] = React.useState(Date.now());
  const [connected, setConnected] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [, forceTick] = React.useReducer((value) => value + 1, 0);

  const acceptState = React.useCallback((next: AcademyWorkshopLiveState) => {
    setState(next);
    setReceivedAt(Date.now());
  }, []);

  React.useEffect(() => {
    const timer = window.setInterval(() => forceTick(), 250);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (!slug) return;
    let disposed = false;
    void apiClient.academySales.workshops
      .getBySlug(slug)
      .then(async (nextDetail) => {
        if (disposed) return;
        setDetail(nextDetail);
        setWorkshopId(nextDetail.id);
        const liveSnapshot = await apiClient.academySales.workshops.liveState(nextDetail.id);
        if (!disposed) {
          acceptState(liveSnapshot);
        }
      })
      .catch((cause: unknown) => {
        if (!disposed) {
          setError(extractErrorMessage(cause, 'Không thể mở Live Control.'));
        }
      });
    return () => {
      disposed = true;
    };
  }, [acceptState, slug]);

  const acceptStateRef = React.useRef(acceptState);
  React.useEffect(() => {
    acceptStateRef.current = acceptState;
  }, [acceptState]);

  React.useEffect(() => {
    if (!workshopId || typeof window === 'undefined') return;
    const staffToken = safeStorage.getItem('mos_token') || window.localStorage.getItem('mos_token');
    if (!staffToken) return;
    return connectAcademyWorkshopSocket({
      token: staffToken,
      workshopId,
      onState: (next) => acceptStateRef.current(next),
      onConnection: setConnected,
    });
  }, [workshopId]);

  const refresh = React.useCallback(async () => {
    if (!detail) return;
    const nextState = await apiClient.academySales.workshops.liveState(detail.id);
    acceptState(nextState);
  }, [acceptState, detail]);

  const agendaCommand = React.useCallback(
    async (agendaItemId: number, action: AgendaCommandAction) => {
      if (!detail) return;
      setBusy(true);
      try {
        const res = await apiClient.academySales.workshops.agendaCommand(detail.id, agendaItemId, { action });
        const updatedItem = res?.data;
        if (updatedItem) {
          setDetail((prev) =>
            prev
              ? {
                  ...prev,
                  liveAgendaItemId: ['COMPLETE', 'SKIP'].includes(action)
                    ? prev.liveAgendaItemId === agendaItemId
                      ? null
                      : prev.liveAgendaItemId
                    : updatedItem.id,
                  agenda: prev.agenda.map((it) => (it.id === updatedItem.id ? updatedItem : it)),
                }
              : null
          );
          setState((prev) =>
            prev
              ? {
                  ...prev,
                  activeAgendaItem: ['COMPLETE', 'SKIP'].includes(action)
                    ? prev.activeAgendaItem?.id === agendaItemId
                      ? null
                      : prev.activeAgendaItem
                    : updatedItem,
                  agenda: (prev.agenda || []).map((it) => (it.id === updatedItem.id ? updatedItem : it)),
                }
              : null
          );
        }
        if (action === 'COMPLETE') {
          const text = updatedItem ? formatAgendaExecutionText(updatedItem, true) : null;
          message.success(text || 'Đã hoàn thành phần agenda.');
        } else if (action === 'START') {
          message.success('Đã bắt đầu phần agenda.');
        }
        await refresh();
      } catch (cause: unknown) {
        message.error(extractErrorMessage(cause, 'Không thể cập nhật agenda.'));
      } finally {
        setBusy(false);
      }
    },
    [detail, refresh]
  );

  const addMissingSampleQuestions = React.useCallback(
    async (quiz: AcademyWorkshopQuiz) => {
      if (!detail) return 0;
      const existingPrompts = new Set(quiz.questions.map((question) => question.prompt));
      const missingQuestions = SAMPLE_QUIZ_QUESTIONS.filter((question) => !existingPrompts.has(question.prompt));
      for (const question of missingQuestions) {
        await apiClient.academySales.workshops.addQuestion(detail.id, quiz.id, question);
      }
      return missingQuestions.length;
    },
    [detail]
  );

  const seedQuiz = React.useCallback(async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const quiz = await apiClient.academySales.workshops.createQuiz(detail.id, {
        title: 'Academy Challenge',
        description: 'Game tương tác realtime trong workshop',
        podiumRewards: { '1': 'Quà Champion', '2': 'Quà Á quân', '3': 'Quà Hạng ba' },
      });
      await addMissingSampleQuestions(quiz);
      message.success('Đã tạo game mẫu; bạn có thể chạy ngay.');
      await refresh();
    } catch (cause: unknown) {
      message.error(extractErrorMessage(cause, 'Không thể tạo game mẫu.'));
    } finally {
      setBusy(false);
    }
  }, [addMissingSampleQuestions, detail, refresh]);

  const repairSampleQuiz = React.useCallback(async () => {
    if (!state?.activeQuiz || state.activeQuiz.status !== 'DRAFT') return;
    setBusy(true);
    try {
      const addedCount = await addMissingSampleQuestions(state.activeQuiz);
      message.success(addedCount ? `Đã bổ sung ${addedCount} câu còn thiếu.` : 'Game đã đủ câu hỏi.');
      await refresh();
    } catch (cause: unknown) {
      message.error(extractErrorMessage(cause, 'Không thể bổ sung câu hỏi còn thiếu.'));
    } finally {
      setBusy(false);
    }
  }, [addMissingSampleQuestions, refresh, state]);

  const gameCommand = React.useCallback(
    async (action: AcademyWorkshopGameCommandRequest['action'], questionId?: number) => {
      if (!detail || !state?.activeQuiz) return;
      setBusy(true);
      try {
        await apiClient.academySales.workshops.gameCommand(detail.id, state.activeQuiz.id, { action, questionId });
        await refresh();
        if (action === 'REVEAL_QUESTION') {
          message.success('Đã công bố đáp án đúng và cập nhật bảng xếp hạng.');
        }
      } catch (cause: unknown) {
        message.error(extractErrorMessage(cause, 'Không thể điều khiển game.'));
      } finally {
        setBusy(false);
      }
    },
    [detail, refresh, state]
  );

  const toggleLeaderboardQr = React.useCallback(async () => {
    if (!detail || !state) return;
    setBusy(true);
    try {
      const nextState = await apiClient.academySales.workshops.updateDisplaySettings(detail.id, {
        showJoinQrOnDisplay: !state.showJoinQrOnDisplay,
      });
      acceptState(nextState);
      message.success(nextState.showJoinQrOnDisplay ? 'Đã hiện QR check-in trên Leaderboard.' : 'Đã ẩn QR check-in.');
    } catch (cause: unknown) {
      message.error(extractErrorMessage(cause, 'Không thể cập nhật QR trên Leaderboard.'));
    } finally {
      setBusy(false);
    }
  }, [acceptState, detail, state]);

  return {
    detail,
    state,
    receivedAt,
    connected,
    busy,
    error,
    agendaCommand,
    seedQuiz,
    repairSampleQuiz,
    gameCommand,
    toggleLeaderboardQr,
  };
}

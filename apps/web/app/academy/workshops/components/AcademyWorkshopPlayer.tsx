'use client';

import React from 'react';
import { Avatar, Button, Result, Spin, message } from 'antd';
import { Check, CheckCircle2, Clock3, Gamepad2, LogOut, Trophy, Wifi, WifiOff, XCircle } from 'lucide-react';
import type {
  AcademyWorkshopAnswerReceipt,
  AcademyWorkshopLiveState,
  AcademyWorkshopPublicSession,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  connectAcademyWorkshopSocket,
  createAcademyWorkshopIdempotencyKey,
  formatWorkshopClock,
  isWorkshopQuestionExpired,
  workshopInitials,
  workshopRemainingMs,
} from '../../../../lib/academy-workshop-live';

const OPTION_STYLES = [
  'bg-rose-500 hover:bg-rose-600',
  'bg-blue-500 hover:bg-blue-600',
  'bg-amber-500 hover:bg-amber-600',
  'bg-emerald-500 hover:bg-emerald-600',
  'bg-violet-500 hover:bg-violet-600',
  'bg-cyan-500 hover:bg-cyan-600',
];

export interface AcademyWorkshopPlayerProps {
  session: AcademyWorkshopPublicSession;
  onExit?: () => void;
}

export default function AcademyWorkshopPlayer({ session, onExit }: AcademyWorkshopPlayerProps) {
  const [state, setState] = React.useState<AcademyWorkshopLiveState | null>(null);
  const [receivedAt, setReceivedAt] = React.useState(Date.now());
  const [connected, setConnected] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [answeredQuestionId, setAnsweredQuestionId] = React.useState<number | null>(null);
  const [receipt, setReceipt] = React.useState<AcademyWorkshopAnswerReceipt | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [, tick] = React.useReducer((value) => value + 1, 0);

  const acceptState = React.useCallback((next: AcademyWorkshopLiveState) => {
    setState(next);
    setReceivedAt(Date.now());
    setError(null);
  }, []);

  React.useEffect(() => {
    const timer = window.setInterval(() => tick(), 250);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    let disposed = false;
    setLoading(true);
    void apiClient.academyWorkshopsPublic
      .getState(session.token)
      .then((next) => {
        if (!disposed) acceptState(next);
      })
      .catch((cause) => {
        if (!disposed) setError(cause?.response?.data?.message || 'Không thể tải trạng thái workshop.');
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [acceptState, session.token]);

  React.useEffect(
    () =>
      connectAcademyWorkshopSocket({
        token: session.token,
        onState: acceptState,
        onConnection: setConnected,
      }),
    [acceptState, session.token]
  );

  React.useEffect(() => {
    if (state?.activeQuestion?.id !== answeredQuestionId) setReceipt(null);
  }, [answeredQuestionId, state?.activeQuestion?.id]);

  const answer = React.useCallback(
    async (optionId: number) => {
      if (!state?.activeQuestion || answeredQuestionId === state.activeQuestion.id) return;
      setSubmitting(true);
      try {
        const next = await apiClient.academyWorkshopsPublic.submitAnswer(session.token, {
          questionId: state.activeQuestion.id,
          optionId,
          idempotencyKey: createAcademyWorkshopIdempotencyKey(),
        });
        setAnsweredQuestionId(next.questionId);
        setReceipt(next);
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể ghi nhận câu trả lời.');
      } finally {
        setSubmitting(false);
      }
    },
    [answeredQuestionId, session.token, state]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071a2c] text-white">
        <Spin size="large" />
        <span className="ml-3">Đang vào workshop…</span>
      </main>
    );
  }
  if (error || !state) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071a2c] p-6">
        <Result
          status="warning"
          title="Không thể vào workshop"
          subTitle={error || 'Session không hợp lệ.'}
          extra={onExit ? <Button onClick={onExit}>Chọn lại học viên</Button> : undefined}
        />
      </main>
    );
  }

  const remaining = state.activeQuiz?.questionClosesAt
    ? Math.ceil(workshopRemainingMs(state.activeQuiz.questionClosesAt, state.serverNow, receivedAt) / 1000)
    : 0;
  const leaderboardEntry = state.gameLeaderboard.find((entry) => entry.participantId === session.participant.id);
  const answered = answeredQuestionId === state.activeQuestion?.id;
  const status = state.activeQuiz?.status;
  const questionExpired = isWorkshopQuestionExpired(status, remaining);
  const correctOption =
    status === 'REVEALED' ? state.activeQuestion?.options.find((option) => option.isCorrect) : undefined;
  const selectedOption = receipt
    ? state.activeQuestion?.options.find((option) => option.id === receipt.selectedOptionId)
    : undefined;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#154a67_0%,#071a2c_48%,#04101c_100%)] p-4 text-white sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl flex-col">
        <header className="rounded-3xl border border-white/10 bg-white/10 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-300">Wings Academy</div>
            <span
              role="status"
              aria-label={connected ? 'Đang kết nối trực tiếp' : 'Đang kết nối lại'}
              className={`inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold leading-none ${
                connected
                  ? 'border-emerald-300/25 bg-emerald-400/15 text-emerald-200'
                  : 'border-amber-300/25 bg-amber-400/15 text-amber-100'
              }`}
            >
              {connected ? <Wifi size={13} className="shrink-0" /> : <WifiOff size={13} className="shrink-0" />}
              <span>{connected ? 'Live' : 'Kết nối lại'}</span>
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Workshop</div>
              <div className="mt-0.5 truncate text-lg font-extrabold leading-tight">{state.workshop.name}</div>
            </div>
            {onExit ? (
              <Button
                ghost
                aria-label="Thoát và chọn học viên khác"
                icon={<LogOut size={15} />}
                onClick={onExit}
                className="!flex !h-10 shrink-0 !items-center !rounded-xl !border-white/15 !bg-white/5 !px-3 !font-semibold !text-white"
              >
                Đổi học viên
              </Button>
            ) : null}
          </div>
        </header>

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar size={44} src={session.participant.lead.avatarUrl || undefined}>
                {workshopInitials(session.participant.lead.name)}
              </Avatar>
              <div className="min-w-0">
                <div className="text-xs text-white/60">Xin chào</div>
                <strong className="block truncate text-lg">{session.participant.lead.name}</strong>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/60">Điểm</div>
              <strong className="text-2xl tabular-nums text-amber-300">
                {(leaderboardEntry?.score || receipt?.totalScore || 0).toLocaleString('vi-VN')}
              </strong>
            </div>
          </div>
        </section>

        <section className="mt-4 flex flex-1 flex-col justify-center rounded-3xl border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-xl sm:p-7">
          {!state.activeQuiz || ['DRAFT', 'LOBBY'].includes(status || '') ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-400/15 text-cyan-300">
                <Gamepad2 size={42} />
              </div>
              <h1 className="mt-6 text-2xl font-black">Bạn đã vào phòng!</h1>
              <p className="mt-2 text-white/60">
                Host sẽ mở câu hỏi ngay. Giữ màn hình này và chuẩn bị phản xạ thật nhanh.
              </p>
              <div className="mt-6 text-sm text-cyan-200 tabular-nums">
                {state.connectedParticipantCount} học viên đang online
              </div>
            </div>
          ) : status === 'COMPLETED' ? (
            <div className="py-10 text-center">
              <Trophy size={64} className="mx-auto text-amber-300" />
              <h1 className="mt-5 text-3xl font-black">Hoàn thành!</h1>
              <div className="mt-4 text-6xl font-black tabular-nums text-amber-300">
                #{leaderboardEntry?.rank || '—'}
              </div>
              <p className="mt-3 text-white/60">Tổng điểm: {(leaderboardEntry?.score || 0).toLocaleString('vi-VN')}</p>
            </div>
          ) : state.activeQuestion ? (
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Câu hỏi</span>
                <div
                  className={`flex items-center gap-2 text-2xl font-black tabular-nums ${remaining <= 5 && status === 'QUESTION_OPEN' ? 'text-rose-400' : ''}`}
                >
                  <Clock3 size={20} />{' '}
                  {questionExpired ? 'HẾT GIỜ' : status === 'QUESTION_OPEN' ? formatWorkshopClock(remaining) : '--:--'}
                </div>
              </div>
              <h1 className="mt-5 text-center text-2xl font-black leading-snug sm:text-3xl">
                {state.activeQuestion.prompt}
              </h1>

              {status === 'REVEALED' ? (
                <div className="mt-7">
                  <div
                    className={`rounded-3xl p-6 text-center ring-1 ${
                      receipt?.isCorrect && !receipt.timedOut
                        ? 'bg-emerald-400/15 ring-emerald-300/30'
                        : receipt
                          ? 'bg-rose-400/15 ring-rose-300/30'
                          : 'bg-white/10 ring-white/15'
                    }`}
                  >
                    {receipt?.isCorrect && !receipt.timedOut ? (
                      <CheckCircle2 size={52} className="mx-auto text-emerald-300" />
                    ) : receipt ? (
                      <XCircle size={52} className="mx-auto text-rose-300" />
                    ) : (
                      <Clock3 size={52} className="mx-auto text-white/50" />
                    )}
                    <div className="mt-3 text-2xl font-black">
                      {receipt?.isCorrect && !receipt.timedOut
                        ? 'Chính xác!'
                        : receipt?.timedOut && receipt.isCorrect
                          ? 'Đúng nhưng quá giờ'
                          : receipt?.timedOut
                            ? 'Quá giờ và chưa chính xác'
                            : receipt
                              ? 'Chưa chính xác'
                              : 'Bạn chưa trả lời'}
                    </div>
                    {receipt ? (
                      <div className="mt-2 text-4xl font-black tabular-nums text-amber-300">+{receipt.score}</div>
                    ) : null}
                    {selectedOption ? (
                      <div className="mt-3 text-sm text-white/60">
                        Bạn đã chọn: <strong className="text-white">{selectedOption.label}</strong>
                      </div>
                    ) : null}
                  </div>
                  {correctOption ? (
                    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-300/35 bg-emerald-400/15 p-4 text-emerald-50">
                      <CheckCircle2 size={24} className="shrink-0 text-emerald-300" />
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-200/70">
                          Đáp án đúng
                        </div>
                        <div className="mt-1 text-lg font-black">{correctOption.label}</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : receipt ? (
                <div className="mt-8 rounded-3xl bg-cyan-400/15 p-7 text-center ring-1 ring-cyan-300/30">
                  {receipt.timedOut ? (
                    <Clock3 size={50} className="mx-auto text-amber-300" />
                  ) : (
                    <Check size={50} className="mx-auto text-cyan-300" />
                  )}
                  <div className="mt-3 text-xl font-bold">
                    {receipt.timedOut ? 'Đã ghi nhận sau giờ' : 'Đã ghi nhận!'}
                  </div>
                  <p className="mt-2 text-white/60">Chờ Host công bố đáp án và điểm của câu này.</p>
                </div>
              ) : status === 'QUESTION_OPEN' ? (
                <>
                  {questionExpired && (
                    <div className="mt-6 rounded-2xl bg-amber-400/15 px-4 py-3 text-center text-sm font-semibold text-amber-100 ring-1 ring-amber-300/25">
                      Đã hết giờ · Bạn vẫn có thể chọn, câu trả lời sẽ được ghi nhận 0 điểm.
                    </div>
                  )}
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    {state.activeQuestion.options.map((option, index) => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={submitting || answered}
                        onClick={() => void answer(option.id)}
                        className={`min-h-24 touch-manipulation rounded-2xl p-4 text-left text-lg font-extrabold shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${OPTION_STYLES[index % OPTION_STYLES.length]}`}
                      >
                        <span className="mr-2 opacity-70">{String.fromCharCode(65 + index)}.</span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-8 rounded-2xl bg-white/10 p-6 text-center text-white/70">
                  Host đang khóa và chuẩn bị reveal đáp án…
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-white/60">Đang đồng bộ câu hỏi tiếp theo…</div>
          )}
        </section>

        <footer className="py-4 text-center text-xs text-white/35">
          Academy Workshop OS · Câu trả lời được ACK đúng một lần
        </footer>
      </div>
    </main>
  );
}

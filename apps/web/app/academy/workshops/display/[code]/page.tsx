'use client';

import React from 'react';
import { Spin } from 'antd';
import { CheckCircle2, Clock3, Crown, Gamepad2, Medal, Trophy, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import type { AcademyWorkshopLiveState } from '@mos-lab/shared';
import { apiClient } from '../../../../../lib/api-client';
import {
  connectAcademyWorkshopSocket,
  formatWorkshopClock,
  isWorkshopQuestionExpired,
  workshopInitials,
  workshopRemainingMs,
} from '../../../../../lib/academy-workshop-live';
import { AcademyWorkshopPodiumCelebration } from '../../components/AcademyWorkshopPodiumCelebration';

const OPTION_COLORS = ['bg-rose-500', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-violet-500', 'bg-cyan-500'];

function Avatar({ name, url, large = false }: { name: string; url: string | null; large?: boolean }) {
  const size = large ? 'h-28 w-28 text-4xl' : 'h-16 w-16 text-xl';
  return url ? (
    <img src={url} alt={name} className={`${size} rounded-full object-cover ring-4 ring-white/15`} />
  ) : (
    <div
      className={`${size} flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 font-black ring-4 ring-white/15`}
    >
      {workshopInitials(name)}
    </div>
  );
}

export default function AcademyWorkshopDisplayPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(String(params.code || '')).toUpperCase();
  const [sessionToken, setSessionToken] = React.useState('');
  const [state, setState] = React.useState<AcademyWorkshopLiveState | null>(null);
  const [receivedAt, setReceivedAt] = React.useState(Date.now());
  const [error, setError] = React.useState<string | null>(null);
  const [stageSelection, setStageSelection] = React.useState<{ questionId: number; optionId: number } | null>(null);
  const [sharedQrDataUrl, setSharedQrDataUrl] = React.useState('');
  const [, tick] = React.useReducer((value) => value + 1, 0);

  const acceptState = React.useCallback((next: AcademyWorkshopLiveState) => {
    setState(next);
    setReceivedAt(Date.now());
  }, []);

  React.useEffect(() => {
    const timer = window.setInterval(() => tick(), 250);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (!code) return;
    const key = `academy-workshop-display:${code}`;
    void (async () => {
      try {
        const cached = JSON.parse(window.localStorage.getItem(key) || 'null') as {
          token: string;
          expiresAt: string;
        } | null;
        let session =
          cached && new Date(cached.expiresAt) > new Date()
            ? cached
            : await apiClient.academyWorkshopsPublic.redeemDisplay({ displayCode: code });
        try {
          acceptState(await apiClient.academyWorkshopsPublic.getState(session.token));
        } catch (cause) {
          if (session !== cached) throw cause;
          session = await apiClient.academyWorkshopsPublic.redeemDisplay({ displayCode: code });
          acceptState(await apiClient.academyWorkshopsPublic.getState(session.token));
        }
        window.localStorage.setItem(key, JSON.stringify(session));
        setSessionToken(session.token);
        setError(null);
      } catch (cause: any) {
        setError(cause?.response?.data?.message || 'Mã màn hình workshop không hợp lệ.');
      }
    })();
  }, [acceptState, code]);

  React.useEffect(() => {
    if (!sessionToken) return;
    return connectAcademyWorkshopSocket({ token: sessionToken, onState: acceptState });
  }, [acceptState, sessionToken]);

  React.useEffect(() => {
    const joinUrl = state?.workshop.sharedJoinUrl;
    if (!joinUrl || sharedQrDataUrl) return;
    let disposed = false;
    void import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(joinUrl, { width: 900, margin: 2, errorCorrectionLevel: 'M' }))
      .then((dataUrl) => {
        if (!disposed) setSharedQrDataUrl(dataUrl);
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
  }, [sharedQrDataUrl, state?.workshop.sharedJoinUrl]);

  if (error)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020a14] text-4xl font-bold text-white">
        {error}
      </main>
    );
  if (!state)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020a14] text-white">
        <Spin size="large" />
      </main>
    );

  const quiz = state.activeQuiz;
  const question = state.activeQuestion;
  const remaining = quiz?.questionClosesAt
    ? Math.ceil(workshopRemainingMs(quiz.questionClosesAt, state.serverNow, receivedAt) / 1000)
    : 0;
  const agendaRemaining = state.activeAgendaItem
    ? state.activeAgendaItem.remainingSeconds -
      (state.activeAgendaItem.status === 'RUNNING' ? Math.floor((Date.now() - receivedAt) / 1000) : 0)
    : 0;
  const showingQuestion = question && ['QUESTION_OPEN', 'QUESTION_CLOSED'].includes(quiz?.status || '');
  const showingReveal = question && quiz?.status === 'REVEALED';
  const showingGameResults = quiz?.status === 'COMPLETED';
  const showingLobby = quiz?.status === 'LOBBY';
  const questionExpired = isWorkshopQuestionExpired(quiz?.status, remaining);
  const selectedStageOptionId =
    stageSelection && stageSelection.questionId === question?.id ? stageSelection.optionId : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020a14] text-white">
      <AcademyWorkshopPodiumCelebration
        active={Boolean(showingGameResults)}
        celebrationKey={`${quiz?.id || 'none'}:${quiz?.activeQuestionId || 'complete'}`}
      />
      <div className="pointer-events-none absolute -left-[10vw] -top-[25vh] h-[65vh] w-[65vh] rounded-full bg-cyan-500/20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-[25vh] -right-[10vw] h-[70vh] w-[70vh] rounded-full bg-violet-600/20 blur-[160px]" />
      <div className="relative flex min-h-screen flex-col px-[4vw] py-[3vh]">
        <header className="flex items-center justify-between gap-[2vw] border-b border-white/10 pb-[2vh]">
          <div>
            <div className="text-[1vw] font-black uppercase tracking-[0.38em] text-cyan-300">
              Wings Academy · Workshop Live
            </div>
            <h1 className="mt-[0.5vh] max-w-[65vw] truncate text-[2.4vw] font-black">{state.workshop.name}</h1>
          </div>
          <div className="flex items-center gap-[1vw] rounded-full border border-white/10 bg-white/5 px-[1.4vw] py-[0.8vh] text-[1vw]">
            <Users className="h-[1.3vw] w-[1.3vw] text-cyan-300" />
            <strong className="tabular-nums">{state.connectedParticipantCount}</strong> online
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center py-[2vh]">
          {showingLobby ? (
            <div className="mx-auto grid w-full max-w-[82vw] grid-cols-[1fr_20vw] items-center gap-[5vw]">
              <div className="text-left">
                <div className="flex h-[8vw] w-[8vw] items-center justify-center rounded-[2vw] bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/25">
                  <Gamepad2 className="h-[4.5vw] w-[4.5vw]" />
                </div>
                <div className="mt-[4vh] text-[1.3vw] font-black uppercase tracking-[0.3em] text-cyan-300">
                  Game realtime
                </div>
                <h2 className="mt-[1.5vh] text-[4.2vw] font-black leading-tight">{quiz.title}</h2>
                <p className="mt-[2vh] max-w-[52vw] text-[1.5vw] text-white/55">
                  Quét QR chung, chọn avatar và tên của bạn để vào phòng chơi.
                </p>
                <div className="mt-[5vh] inline-flex items-center gap-[1vw] rounded-full border border-white/10 bg-white/[0.07] px-[2vw] py-[1.4vh] text-[1.5vw]">
                  <Users className="h-[2vw] w-[2vw] text-cyan-300" />
                  <strong className="text-[2.2vw] tabular-nums">{state.connectedParticipantCount}</strong>
                  học viên đã sẵn sàng
                </div>
              </div>
              <div className="rounded-[1.5vw] bg-white p-[1vw] text-center shadow-2xl">
                {sharedQrDataUrl ? (
                  <img src={sharedQrDataUrl} alt="QR chung vào workshop" className="aspect-square w-full" />
                ) : (
                  <div className="aspect-square w-full animate-pulse rounded-[1vw] bg-slate-200" />
                )}
                <div className="mt-[0.5vh] text-[1vw] font-black uppercase tracking-[0.1em] text-slate-900">
                  Quét để vào lobby
                </div>
              </div>
            </div>
          ) : showingQuestion ? (
            <div className="w-full">
              <div className="flex items-start justify-between gap-[3vw]">
                <div className="max-w-[75vw] text-[3.2vw] font-black leading-[1.18]">{question.prompt}</div>
                <div className={`shrink-0 text-right font-black ${remaining <= 5 ? 'text-rose-400' : 'text-cyan-300'}`}>
                  <div className="text-[1vw] uppercase tracking-[0.18em] text-white/55">
                    Chọn trên màn hình hoặc điện thoại
                  </div>
                  <div className="mt-[0.5vh] flex items-center justify-end gap-[0.8vw] text-[4.2vw] tabular-nums">
                    <Clock3 className="h-[2.8vw] w-[2.8vw]" />{' '}
                    {questionExpired
                      ? 'HẾT GIỜ'
                      : quiz?.status === 'QUESTION_OPEN'
                        ? formatWorkshopClock(remaining)
                        : '--:--'}
                  </div>
                </div>
              </div>
              <div className="mt-[5vh] grid grid-cols-2 gap-[1.2vw]">
                {question.options.map((option, index) => {
                  const optionLetter = String.fromCharCode(65 + index);
                  const selected = selectedStageOptionId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Chọn đáp án ${optionLetter}: ${option.label} trên màn hình Stage`}
                      onClick={() => setStageSelection({ questionId: question.id, optionId: option.id })}
                      className={`flex min-h-[15vh] touch-manipulation items-center rounded-[1.4vw] px-[2vw] text-left text-[2vw] font-black shadow-2xl transition duration-150 active:scale-[0.99] ${selected ? 'scale-[1.01] ring-[0.35vw] ring-white' : questionExpired ? 'opacity-65 grayscale-[20%]' : 'hover:brightness-110'} ${OPTION_COLORS[index % OPTION_COLORS.length]}`}
                    >
                      <span className="mr-[1vw] text-[2.8vw] opacity-70">{optionLetter}</span>
                      <span className="min-w-0 flex-1">{option.label}</span>
                      {selected ? <CheckCircle2 className="ml-[1vw] h-[2.8vw] w-[2.8vw] shrink-0" /> : null}
                    </button>
                  );
                })}
              </div>
              <div className="mt-[2vh] text-center text-[1vw] font-semibold uppercase tracking-[0.12em] text-white/50">
                {selectedStageOptionId
                  ? `Đã chọn trên Stage${questionExpired ? ' sau khi hết giờ' : ''} · Không tính điểm cá nhân`
                  : 'Lựa chọn Stage dùng cho trình chiếu · QR học viên dùng để tính điểm'}
              </div>
            </div>
          ) : showingReveal ? (
            <div className="w-full">
              <div className="text-center text-[1.25vw] font-black uppercase tracking-[0.32em] text-emerald-300">
                Đáp án chính xác
              </div>
              <div className="mx-auto mt-[1.5vh] max-w-[84vw] text-center text-[3vw] font-black leading-tight">
                {question.prompt}
              </div>
              <div className="mt-[4vh] grid grid-cols-[1.35fr_0.65fr] gap-[2vw]">
                <div className="grid grid-cols-2 gap-[1.2vw]">
                  {question.options.map((option, index) => {
                    const optionLetter = String.fromCharCode(65 + index);
                    return (
                      <div
                        key={option.id}
                        className={`flex min-h-[13vh] items-center rounded-[1.4vw] border px-[2vw] text-[1.8vw] font-black shadow-2xl ${
                          option.isCorrect
                            ? 'border-emerald-300 bg-emerald-500 text-white ring-[0.3vw] ring-emerald-200/80'
                            : 'border-white/10 bg-white/[0.05] text-white/35'
                        }`}
                      >
                        <span className="mr-[1vw] text-[2.5vw] opacity-70">{optionLetter}</span>
                        <span className="min-w-0 flex-1">{option.label}</span>
                        {option.isCorrect ? <CheckCircle2 className="ml-[1vw] h-[2.8vw] w-[2.8vw] shrink-0" /> : null}
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-[1.4vw] border border-white/10 bg-white/[0.055] p-[1.5vw]">
                  <div className="mb-[1.5vh] flex items-center gap-[0.7vw] text-[1.15vw] font-black uppercase tracking-[0.18em] text-cyan-300">
                    <Trophy className="h-[1.5vw] w-[1.5vw]" /> BXH sau câu này
                  </div>
                  <div className="grid gap-[0.8vh]">
                    {state.gameLeaderboard.slice(0, 5).map((entry) => (
                      <div
                        key={entry.participantId}
                        className="grid grid-cols-[2.5vw_2.5vw_1fr_auto] items-center gap-[0.7vw] rounded-[0.8vw] bg-white/[0.07] px-[0.9vw] py-[0.8vh]"
                      >
                        <strong className="text-center text-[1.15vw] tabular-nums">#{entry.rank}</strong>
                        <Avatar name={entry.name} url={entry.avatarUrl} />
                        <span className="truncate text-[1.05vw] font-bold">{entry.name}</span>
                        <strong className="text-[1.15vw] tabular-nums text-amber-300">
                          {entry.score.toLocaleString('vi-VN')}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : showingGameResults ? (
            <div className="w-full">
              <div className="mb-[3vh] flex items-center justify-center gap-[1vw] text-[3vw] font-black">
                <Gamepad2 className="h-[3vw] w-[3vw] text-cyan-300" /> PODIUM CHUNG CUỘC
              </div>
              {quiz ? (
                <div className="mx-auto grid max-w-[78vw] grid-cols-3 items-end gap-[2vw] pt-[5vh]">
                  {[state.gameLeaderboard[1], state.gameLeaderboard[0], state.gameLeaderboard[2]].map(
                    (entry, index) => {
                      const rank = [2, 1, 3][index];
                      const height = rank === 1 ? 'min-h-[48vh]' : rank === 2 ? 'min-h-[38vh]' : 'min-h-[32vh]';
                      return entry ? (
                        <div
                          key={entry.participantId}
                          className={`${height} flex flex-col items-center justify-center rounded-t-[2vw] border border-white/10 bg-gradient-to-t from-white/5 to-white/15 p-[2vw] text-center shadow-2xl`}
                        >
                          {rank === 1 ? (
                            <Crown className="mb-[1vh] h-[4vw] w-[4vw] text-amber-300" />
                          ) : (
                            <Medal className="mb-[1vh] h-[3vw] w-[3vw] text-cyan-300" />
                          )}
                          <Avatar name={entry.name} url={entry.avatarUrl} large={rank === 1} />
                          <div className="mt-[2vh] text-[1.8vw] font-black">{entry.name}</div>
                          <div className="mt-[1vh] text-[2.5vw] font-black tabular-nums text-amber-300">
                            {entry.score.toLocaleString('vi-VN')}
                          </div>
                          <div className="mt-[1vh] text-[1.3vw] font-bold">Hạng {rank}</div>
                        </div>
                      ) : (
                        <div key={rank} />
                      );
                    }
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="w-full">
              <div className="flex items-end justify-between gap-[3vw]">
                <div>
                  <div className="flex items-center gap-[0.8vw] text-[1.3vw] font-black uppercase tracking-[0.24em] text-cyan-300">
                    <Trophy className="h-[1.6vw] w-[1.6vw]" /> Leaderboard Tố Chất
                  </div>
                  <div className="mt-[1vh] text-[2.7vw] font-black">Tài năng nổi bật hôm nay</div>
                </div>
                {state.activeAgendaItem && (
                  <div className={`text-right ${agendaRemaining < 0 ? 'text-rose-400' : ''}`}>
                    <div className="max-w-[34vw] truncate text-[1.2vw] font-bold opacity-70">
                      {state.activeAgendaItem.title}
                    </div>
                    <div className="mt-[0.5vh] text-[3.3vw] font-black tabular-nums">
                      {formatWorkshopClock(agendaRemaining)}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-[3vh] grid gap-[1.2vh]">
                {state.talentLeaderboard.slice(0, 8).map((entry) => (
                  <div
                    key={entry.participantId}
                    className="grid grid-cols-[5vw_4vw_1.35fr_0.8fr_1.5fr] items-center gap-[1.2vw] rounded-[1vw] border border-white/10 bg-white/[0.065] px-[1.6vw] py-[1.1vh] shadow-xl"
                  >
                    <div
                      className={`text-center text-[2vw] font-black tabular-nums ${entry.rank <= 3 ? 'text-amber-300' : ''}`}
                    >
                      #{entry.rank}
                    </div>
                    <Avatar name={entry.name} url={entry.avatarUrl} />
                    <div className="truncate text-[1.6vw] font-black">{entry.name}</div>
                    <div>
                      <div className="text-[0.9vw] uppercase tracking-wider text-white/45">Số sợi / 5 phút</div>
                      <div className="text-[1.8vw] font-black tabular-nums text-cyan-300">{entry.strands5Min}</div>
                    </div>
                    <div className="text-[1.15vw] font-semibold leading-snug text-amber-200 tabular-nums">
                      {entry.rewardLabel}
                    </div>
                  </div>
                ))}
                {!state.talentLeaderboard.length && (
                  <div className="py-[16vh] text-center">
                    <Trophy className="mx-auto h-[6vw] w-[6vw] text-white/20" />
                    <div className="mt-[2vh] text-[2vw] font-bold text-white/40">
                      Kết quả Tố Chất sẽ xuất hiện tại đây
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <footer className="flex items-center justify-between border-t border-white/10 pt-[1.5vh] text-[0.9vw] text-white/35">
          <span>ACADEMY WORKSHOP OS · LIVE FROM SERVER TIMESTAMP</span>
          <span className="tabular-nums">{new Date(state.serverNow).toLocaleTimeString('vi-VN')}</span>
        </footer>
      </div>
    </main>
  );
}

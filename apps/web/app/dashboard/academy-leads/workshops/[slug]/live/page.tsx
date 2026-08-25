'use client';

import React from 'react';
import { Avatar, Button, Card, Popconfirm, Progress, Space, message, theme } from 'antd';
import dayjs from 'dayjs';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CircleCheckBig,
  CirclePause,
  CirclePlay,
  Clock3,
  Eye,
  Gamepad2,
  MonitorUp,
  Presentation,
  QrCode,
  SkipForward,
  Square,
  Trophy,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  getAcademyWorkshopQuizProgress,
  type AcademyWorkshopGameCommandRequest,
  type AcademyWorkshopLiveState,
  type AcademyWorkshopQuiz,
  type UpsertAcademyWorkshopQuestionRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../../../lib/api-client';
import {
  connectAcademyWorkshopSocket,
  formatWorkshopClock,
  isWorkshopQuestionExpired,
  workshopInitials,
  workshopRemainingMs,
} from '../../../../../../lib/academy-workshop-live';
import { AppIcon, FeaturePage, IconText, MetricGrid, StatePanel, StatusTag } from '../../../../../../components/ui';
import AcademyWorkshopSharedQrButton from '../../../components/AcademyWorkshopSharedQrButton';

const AGENDA_STATUS_LABELS = {
  PENDING: 'Chưa bắt đầu',
  RUNNING: 'Đang chạy',
  PAUSED: 'Đang tạm dừng',
  COMPLETED: 'Đã hoàn thành',
  SKIPPED: 'Đã bỏ qua',
} as const;

const SAMPLE_QUIZ_QUESTIONS = [
  {
    type: 'SINGLE_CHOICE',
    prompt: 'Điều quan trọng nhất để giữ fan mi đẹp là gì?',
    durationSeconds: 20,
    sortOrder: 1,
    rewardRule: 'FASTEST_N',
    fastestCount: 1,
    rewardLabel: 'Quà trả lời nhanh nhất',
    rewardQuantity: 1,
    options: [
      { label: 'Tách mi chuẩn', isCorrect: true },
      { label: 'Dùng thật nhiều keo', isCorrect: false },
      { label: 'Nối càng nhanh càng tốt', isCorrect: false },
      { label: 'Bỏ qua vệ sinh mi', isCorrect: false },
    ],
  },
  {
    type: 'TRUE_FALSE',
    prompt: 'Tốc độ tốt luôn phải đi cùng độ chính xác.',
    durationSeconds: 15,
    sortOrder: 2,
    rewardRule: 'ALL_CORRECT',
    rewardLabel: 'Sticker Academy',
    rewardQuantity: 1,
    options: [
      { label: 'Đúng', isCorrect: true },
      { label: 'Sai', isCorrect: false },
    ],
  },
  {
    type: 'SINGLE_CHOICE',
    prompt: 'Một workshop tốt kết thúc bằng điều gì?',
    durationSeconds: 20,
    sortOrder: 3,
    rewardRule: 'NONE',
    options: [
      { label: 'Một lộ trình hành động rõ ràng', isCorrect: true },
      { label: 'Thêm thật nhiều lý thuyết', isCorrect: false },
      { label: 'Không cần follow-up', isCorrect: false },
    ],
  },
] satisfies UpsertAcademyWorkshopQuestionRequest[];

export default function WorkshopLiveControlPage() {
  const { token } = theme.useToken();
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = decodeURIComponent(String(params.slug || ''));
  const [detail, setDetail] = React.useState<Awaited<
    ReturnType<typeof apiClient.academySales.workshops.getBySlug>
  > | null>(null);
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
        acceptState(await apiClient.academySales.workshops.liveState(nextDetail.id));
      })
      .catch((cause) => setError(cause?.response?.data?.message || 'Không thể mở Live Control.'));
    return () => {
      disposed = true;
    };
  }, [acceptState, slug]);

  React.useEffect(() => {
    if (!detail || typeof window === 'undefined') return;
    const staffToken = window.localStorage.getItem('mos_token');
    if (!staffToken) return;
    return connectAcademyWorkshopSocket({
      token: staffToken,
      workshopId: detail.id,
      onState: acceptState,
      onConnection: setConnected,
    });
  }, [acceptState, detail]);

  const refresh = React.useCallback(async () => {
    if (!detail) return;
    acceptState(await apiClient.academySales.workshops.liveState(detail.id));
  }, [acceptState, detail]);

  const agendaCommand = React.useCallback(
    async (agendaItemId: number, action: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE' | 'SKIP') => {
      if (!detail) return;
      setBusy(true);
      try {
        await apiClient.academySales.workshops.agendaCommand(detail.id, agendaItemId, { action });
        await refresh();
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể cập nhật agenda.');
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
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Không thể tạo game mẫu.');
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
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Không thể bổ sung câu hỏi còn thiếu.');
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
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Không thể điều khiển game.');
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
    } catch (cause: any) {
      message.error(cause?.response?.data?.message || 'Không thể cập nhật QR trên Leaderboard.');
    } finally {
      setBusy(false);
    }
  }, [acceptState, detail, state]);

  if (error) return <StatePanel kind="error" title={error} />;
  if (!detail || !state) return <StatePanel kind="loading" title="Đang kết nối Live Control…" />;

  const questionRemaining = state.activeQuiz?.questionClosesAt
    ? Math.ceil(workshopRemainingMs(state.activeQuiz.questionClosesAt, state.serverNow, receivedAt) / 1000)
    : 0;
  const agendaRemaining = state.activeAgendaItem
    ? state.activeAgendaItem.remainingSeconds -
      (state.activeAgendaItem.status === 'RUNNING' ? Math.floor((Date.now() - receivedAt) / 1000) : 0)
    : 0;
  const questionDuration = state.activeQuestion?.durationSeconds || 1;
  const questionProgress = Math.max(0, Math.min(100, (questionRemaining / questionDuration) * 100));
  const questionExpired = isWorkshopQuestionExpired(state.activeQuiz?.status, questionRemaining);
  const quizProgress = getAcademyWorkshopQuizProgress(
    state.activeQuiz?.questions || [],
    state.activeQuiz?.activeQuestionId ?? null
  );

  return (
    <FeaturePage
      title={`Live Control · ${detail.name}`}
      subtitle="Host commands qua REST transaction; WebSocket chỉ broadcast snapshot để reconnect an toàn."
      icon={<AppIcon icon={Presentation} />}
      tag={connected ? 'Realtime connected' : 'Đang reconnect'}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => router.push(`/dashboard/academy-leads/workshops/${detail.slug}`)}>
            <IconText icon={<AppIcon icon={ArrowLeft} />}>Workspace</IconText>
          </Button>
          <AcademyWorkshopSharedQrButton
            workshopName={detail.name}
            joinUrl={detail.sharedJoinUrl}
            label="QR học viên"
          />
          <Button
            type={state.showJoinQrOnDisplay ? 'primary' : 'default'}
            loading={busy}
            onClick={() => void toggleLeaderboardQr()}
          >
            <IconText icon={<AppIcon icon={QrCode} />}>
              {state.showJoinQrOnDisplay ? 'Ẩn QR trên BXH' : 'Hiện QR trên BXH'}
            </IconText>
          </Button>
          <Button onClick={() => window.open(`/academy/workshops/display/${detail.displayCode}`, '_blank')}>
            <IconText icon={<AppIcon icon={MonitorUp} />}>Leaderboard</IconText>
          </Button>
          <StatusTag
            className="!h-8 !px-2"
            status={connected ? 'success' : 'orange'}
            label={
              <IconText gap={4} icon={<AppIcon icon={connected ? Wifi : WifiOff} />} textClassName="leading-none">
                {connected ? 'Live' : 'Fallback REST'}
              </IconText>
            }
          />
        </div>
      }
    >
      <MetricGrid
        items={[
          {
            key: 'participants',
            title: 'Roster',
            value: state.participantCount,
            format: 'number',
            icon: <AppIcon icon={Users} />,
          },
          { key: 'online', title: 'Đang online', value: state.connectedParticipantCount, format: 'number' },
          {
            key: 'answers',
            title: 'Đã vào BXH game',
            value: state.gameLeaderboard.filter((item) => item.score > 0).length,
            format: 'number',
          },
          {
            key: 'talent',
            title: 'Đã có kết quả Tố Chất',
            value: state.talentLeaderboard.length,
            format: 'number',
            icon: <AppIcon icon={Trophy} />,
          },
        ]}
      />

      <div className="grid gap-4 2xl:grid-cols-[1.15fr_1fr]">
        <Card
          title={
            <span className="flex items-center gap-2">
              <AppIcon icon={Clock3} /> Agenda live
            </span>
          }
        >
          {state.activeAgendaItem && (
            <div
              className="mb-4 rounded-2xl p-5 text-center"
              style={{ background: agendaRemaining < 0 ? token.colorErrorBg : token.colorPrimaryBg }}
            >
              <div className="text-sm font-semibold uppercase tracking-[0.18em] opacity-65">Phần đang chạy</div>
              <div className="mt-2 text-2xl font-bold">{state.activeAgendaItem.title}</div>
              <div className={`mt-3 text-6xl font-black tabular-nums ${agendaRemaining < 0 ? 'text-red-500' : ''}`}>
                {formatWorkshopClock(agendaRemaining)}
              </div>
              {agendaRemaining < 0 && <div className="mt-2 font-bold text-red-500">QUÁ GIỜ</div>}
            </div>
          )}
          <div className="space-y-2">
            {detail.agenda.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-inherit p-3"
              >
                <div>
                  <strong>
                    {item.sortOrder}. {item.title}
                  </strong>
                  <div className="text-xs opacity-60 tabular-nums">
                    {Math.round(item.plannedDurationSeconds / 60)} phút · {AGENDA_STATUS_LABELS[item.status]}
                  </div>
                </div>
                <Space wrap className="justify-end">
                  {item.status === 'PENDING' && (
                    <Button
                      type="primary"
                      icon={<AppIcon icon={CirclePlay} />}
                      loading={busy}
                      onClick={() => void agendaCommand(item.id, 'START')}
                    >
                      Bắt đầu
                    </Button>
                  )}
                  {item.status === 'RUNNING' && (
                    <Button
                      icon={<AppIcon icon={CirclePause} />}
                      loading={busy}
                      onClick={() => void agendaCommand(item.id, 'PAUSE')}
                    >
                      Tạm dừng
                    </Button>
                  )}
                  {item.status === 'PAUSED' && (
                    <Button
                      icon={<AppIcon icon={CirclePlay} />}
                      loading={busy}
                      onClick={() => void agendaCommand(item.id, 'RESUME')}
                    >
                      Tiếp tục
                    </Button>
                  )}
                  {['RUNNING', 'PAUSED'].includes(item.status) && (
                    <Popconfirm
                      title="Hoàn thành phần này?"
                      description="Timeline sẽ chốt thời lượng thực tế và không tự chuyển sang phần kế tiếp."
                      okText="Hoàn thành"
                      cancelText="Chưa"
                      onConfirm={() => void agendaCommand(item.id, 'COMPLETE')}
                    >
                      <Button
                        type="primary"
                        icon={<AppIcon icon={CircleCheckBig} />}
                        loading={busy}
                        className="font-semibold"
                      >
                        Hoàn thành phần này
                      </Button>
                    </Popconfirm>
                  )}
                  {item.status === 'PENDING' && (
                    <Popconfirm
                      title="Bỏ qua phần này?"
                      description="Phần này sẽ được ghi nhận là đã bỏ qua trong timeline."
                      okText="Bỏ qua"
                      cancelText="Chưa"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => void agendaCommand(item.id, 'SKIP')}
                    >
                      <Button danger type="text" icon={<AppIcon icon={SkipForward} />} loading={busy}>
                        Bỏ qua
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <AppIcon icon={Gamepad2} /> Game realtime
            </span>
          }
        >
          {!state.activeQuiz ? (
            <StatePanel
              kind="empty"
              title="Chưa có game trong workshop"
              description="Tạo nhanh game mẫu 3 câu để kiểm thử trọn luồng lobby → question → reveal → podium."
              extra={
                <Button
                  type="primary"
                  size="large"
                  icon={<AppIcon icon={Gamepad2} />}
                  loading={busy}
                  onClick={() => void seedQuiz()}
                >
                  Tạo game 3 câu ngay
                </Button>
              }
              surface={false}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold">{state.activeQuiz.title}</div>
                  <div className="text-xs opacity-60">
                    {state.activeQuiz.status} · {state.activeQuiz.questions.length} câu
                    {quizProgress.currentQuestionNumber > 0 &&
                      ` · Câu ${quizProgress.currentQuestionNumber}/${quizProgress.totalQuestions}`}
                    {state.activeQuiz.status === 'REVEALED' && quizProgress.isLastQuestion && ' · Câu cuối'}
                  </div>
                </div>
                <Space wrap>
                  {state.activeQuiz.status === 'DRAFT' && (
                    <Button type="primary" onClick={() => void gameCommand('OPEN_LOBBY')}>
                      Mở lobby
                    </Button>
                  )}
                  {state.activeQuiz.status === 'DRAFT' &&
                    state.activeQuiz.questions.length < SAMPLE_QUIZ_QUESTIONS.length && (
                      <Button loading={busy} onClick={() => void repairSampleQuiz()}>
                        Bổ sung đủ {SAMPLE_QUIZ_QUESTIONS.length} câu
                      </Button>
                    )}
                  {state.activeQuiz.status === 'LOBBY' && (
                    <Button
                      type="primary"
                      onClick={() => void gameCommand('OPEN_QUESTION', state.activeQuiz!.questions[0]?.id)}
                    >
                      Mở câu 1
                    </Button>
                  )}
                  {questionExpired && state.activeQuestion && (
                    <Button
                      type="primary"
                      loading={busy}
                      icon={<AppIcon icon={CirclePlay} />}
                      onClick={() => void gameCommand('REOPEN_QUESTION', state.activeQuestion!.id)}
                    >
                      Mở lại {state.activeQuestion.durationSeconds} giây
                    </Button>
                  )}
                  {state.activeQuiz.status === 'QUESTION_OPEN' && (
                    <Button
                      danger
                      icon={<AppIcon icon={Square} />}
                      loading={busy}
                      onClick={() => void gameCommand('CLOSE_QUESTION')}
                    >
                      Khóa câu
                    </Button>
                  )}
                  {state.activeQuiz.status === 'QUESTION_CLOSED' && (
                    <Button
                      type="primary"
                      loading={busy}
                      icon={<AppIcon icon={Eye} />}
                      onClick={() => void gameCommand('REVEAL_QUESTION')}
                    >
                      Công bố đáp án
                    </Button>
                  )}
                  {state.activeQuiz.status === 'REVEALED' && quizProgress.hasNextQuestion && (
                    <Button
                      type="primary"
                      loading={busy}
                      icon={<AppIcon icon={SkipForward} />}
                      onClick={() => void gameCommand('NEXT_QUESTION')}
                    >
                      Câu tiếp
                    </Button>
                  )}
                  {!['DRAFT', 'COMPLETED'].includes(state.activeQuiz.status) && (
                    <Button
                      type={
                        state.activeQuiz.status === 'REVEALED' && quizProgress.isLastQuestion ? 'primary' : 'default'
                      }
                      loading={busy}
                      icon={
                        state.activeQuiz.status === 'REVEALED' && quizProgress.isLastQuestion ? (
                          <AppIcon icon={Trophy} />
                        ) : undefined
                      }
                      onClick={() => void gameCommand('END_GAME')}
                    >
                      {state.activeQuiz.status === 'REVEALED' && quizProgress.isLastQuestion
                        ? 'Kết thúc & mở podium'
                        : 'Kết thúc & podium'}
                    </Button>
                  )}
                </Space>
              </div>
              {['DRAFT', 'LOBBY'].includes(state.activeQuiz.status) && (
                <div className="rounded-2xl border border-inherit p-4">
                  {state.activeQuiz.status === 'LOBBY' ? (
                    <div className="py-3 text-center">
                      <Gamepad2 className="mx-auto h-10 w-10" style={{ color: token.colorPrimary }} />
                      <div className="mt-3 text-xl font-bold">Lobby đang mở</div>
                      <div className="mt-1 text-sm opacity-60 tabular-nums">
                        {state.connectedParticipantCount} học viên online · Sẵn sàng mở câu đầu tiên
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 font-semibold">Bộ câu hỏi sẽ chạy</div>
                      <div className="space-y-2">
                        {state.activeQuiz.questions.map((question, index) => (
                          <div
                            key={question.id}
                            className="flex items-center gap-3 rounded-xl border border-inherit px-3 py-2"
                          >
                            <strong className="w-8 text-center tabular-nums">{index + 1}</strong>
                            <span className="min-w-0 flex-1 truncate">{question.prompt}</span>
                            <StatusTag className="shrink-0 tabular-nums" label={`${question.durationSeconds} giây`} />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {state.activeQuestion && (
                <div className="rounded-2xl border border-inherit p-5">
                  <div className="text-center text-xl font-bold">{state.activeQuestion.prompt}</div>
                  {state.activeQuiz.status === 'QUESTION_OPEN' && (
                    <>
                      <div
                        className={`mt-4 text-center text-6xl font-black tabular-nums ${questionRemaining <= 5 ? 'text-red-500' : ''}`}
                      >
                        {questionExpired ? 'HẾT GIỜ' : formatWorkshopClock(questionRemaining)}
                      </div>
                      <Progress
                        percent={questionExpired ? 0 : questionProgress}
                        showInfo={false}
                        status={questionRemaining <= 5 ? 'exception' : 'active'}
                      />
                      {questionExpired && (
                        <div className="mt-3 text-center text-sm font-medium text-red-500">
                          Học viên đang bị khóa trả lời. Mở lại câu hỏi để cấp một lượt thời gian mới cho người chưa trả
                          lời.
                        </div>
                      )}
                    </>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {state.activeQuestion.options.map((option) => {
                      const isRevealed = state.activeQuiz?.status === 'REVEALED';
                      return (
                        <div
                          key={option.id}
                          className="flex min-h-12 items-center gap-2 rounded-xl border p-3 font-semibold transition"
                          style={
                            isRevealed
                              ? option.isCorrect
                                ? {
                                    background: token.colorSuccessBg,
                                    borderColor: token.colorSuccessBorder,
                                    color: token.colorSuccessText,
                                  }
                                : { borderColor: token.colorBorder, opacity: 0.42 }
                              : { borderColor: token.colorBorder }
                          }
                        >
                          {isRevealed && option.isCorrect ? <AppIcon icon={CircleCheckBig} /> : null}
                          <span>{option.label}</span>
                          {isRevealed && option.isCorrect ? (
                            <StatusTag status="success" className="!ml-auto" label="Đáp án đúng" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <div className="mb-2 font-semibold">BXH hiện tại</div>
                <div className="space-y-2">
                  {state.gameLeaderboard.slice(0, 8).map((entry) => (
                    <div
                      key={entry.participantId}
                      className="flex items-center gap-3 rounded-xl border border-inherit px-3 py-2"
                    >
                      <strong className="w-8 text-center tabular-nums">#{entry.rank}</strong>
                      <Avatar
                        className="shrink-0"
                        size={32}
                        src={entry.avatarUrl || undefined}
                        style={{ backgroundColor: token.colorPrimaryBg, color: token.colorPrimary }}
                      >
                        {workshopInitials(entry.name)}
                      </Avatar>
                      <span className="flex-1 truncate">{entry.name}</span>
                      <strong className="tabular-nums">{entry.score.toLocaleString('vi-VN')}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </FeaturePage>
  );
}

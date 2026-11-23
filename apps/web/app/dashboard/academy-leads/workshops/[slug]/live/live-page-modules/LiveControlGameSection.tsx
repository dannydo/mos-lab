'use client';

import { Button, Card, Progress, Space } from 'antd';
import { CircleCheckBig, CirclePlay, Eye, Gamepad2, SkipForward, Square, Trophy } from 'lucide-react';
import type {
  AcademyWorkshopGameCommandRequest,
  AcademyWorkshopGameLeaderboardEntry,
  AcademyWorkshopQuiz,
  AcademyWorkshopQuizQuestion,
} from '@mos-lab/shared';
import { AppIcon, StatePanel, StatusTag } from '~/components/ui';
import { formatWorkshopClock } from '~/lib/academy-workshop-live';
import { SAMPLE_QUIZ_QUESTIONS, type LiveControlTimers } from './live-control-constants';
import { LiveControlLeaderboard } from './LiveControlLeaderboard';

export interface LiveControlGameSectionProps {
  activeQuiz: AcademyWorkshopQuiz | null;
  activeQuestion: AcademyWorkshopQuizQuestion | null;
  connectedParticipantCount: number;
  gameLeaderboard: AcademyWorkshopGameLeaderboardEntry[];
  timers: LiveControlTimers;
  busy: boolean;
  onSeedQuiz: () => Promise<void> | void;
  onRepairSampleQuiz: () => Promise<void> | void;
  onGameCommand: (action: AcademyWorkshopGameCommandRequest['action'], questionId?: number) => Promise<void> | void;
}

export function LiveControlGameSection({
  activeQuiz,
  activeQuestion,
  connectedParticipantCount,
  gameLeaderboard,
  timers,
  busy,
  onSeedQuiz,
  onRepairSampleQuiz,
  onGameCommand,
}: LiveControlGameSectionProps) {
  const { questionRemaining, questionProgress, questionExpired, quizProgress } = timers;

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <AppIcon icon={Gamepad2} /> Game realtime
        </span>
      }
    >
      {!activeQuiz ? (
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
              onClick={() => void onSeedQuiz()}
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
              <div className="text-lg font-bold">{activeQuiz.title}</div>
              <div className="text-xs opacity-60">
                {activeQuiz.status} · {activeQuiz.questions.length} câu
                {quizProgress.currentQuestionNumber > 0 &&
                  ` · Câu ${quizProgress.currentQuestionNumber}/${quizProgress.totalQuestions}`}
                {activeQuiz.status === 'REVEALED' && quizProgress.isLastQuestion && ' · Câu cuối'}
              </div>
            </div>
            <Space wrap>
              {activeQuiz.status === 'DRAFT' && (
                <Button type="primary" onClick={() => void onGameCommand('OPEN_LOBBY')}>
                  Mở lobby
                </Button>
              )}
              {activeQuiz.status === 'DRAFT' && activeQuiz.questions.length < SAMPLE_QUIZ_QUESTIONS.length && (
                <Button loading={busy} onClick={() => void onRepairSampleQuiz()}>
                  Bổ sung đủ {SAMPLE_QUIZ_QUESTIONS.length} câu
                </Button>
              )}
              {activeQuiz.status === 'LOBBY' && (
                <Button type="primary" onClick={() => void onGameCommand('OPEN_QUESTION', activeQuiz.questions[0]?.id)}>
                  Mở câu 1
                </Button>
              )}
              {questionExpired && activeQuestion && (
                <Button
                  type="primary"
                  loading={busy}
                  icon={<AppIcon icon={CirclePlay} />}
                  onClick={() => void onGameCommand('REOPEN_QUESTION', activeQuestion.id)}
                >
                  Mở lại {activeQuestion.durationSeconds} giây
                </Button>
              )}
              {activeQuiz.status === 'QUESTION_OPEN' && (
                <Button
                  danger
                  icon={<AppIcon icon={Square} />}
                  loading={busy}
                  onClick={() => void onGameCommand('CLOSE_QUESTION')}
                >
                  Khóa câu
                </Button>
              )}
              {activeQuiz.status === 'QUESTION_CLOSED' && (
                <Button
                  type="primary"
                  loading={busy}
                  icon={<AppIcon icon={Eye} />}
                  onClick={() => void onGameCommand('REVEAL_QUESTION')}
                >
                  Công bố đáp án
                </Button>
              )}
              {activeQuiz.status === 'REVEALED' && quizProgress.hasNextQuestion && (
                <Button
                  type="primary"
                  loading={busy}
                  icon={<AppIcon icon={SkipForward} />}
                  onClick={() => void onGameCommand('NEXT_QUESTION')}
                >
                  Câu tiếp
                </Button>
              )}
              {!['DRAFT', 'COMPLETED'].includes(activeQuiz.status) && (
                <Button
                  type={activeQuiz.status === 'REVEALED' && quizProgress.isLastQuestion ? 'primary' : 'default'}
                  loading={busy}
                  icon={
                    activeQuiz.status === 'REVEALED' && quizProgress.isLastQuestion ? (
                      <AppIcon icon={Trophy} />
                    ) : undefined
                  }
                  onClick={() => void onGameCommand('END_GAME')}
                >
                  {activeQuiz.status === 'REVEALED' && quizProgress.isLastQuestion
                    ? 'Kết thúc & mở podium'
                    : 'Kết thúc & podium'}
                </Button>
              )}
            </Space>
          </div>

          {['DRAFT', 'LOBBY'].includes(activeQuiz.status) && (
            <div className="rounded-2xl border border-inherit p-4">
              {activeQuiz.status === 'LOBBY' ? (
                <div className="py-3 text-center">
                  <Gamepad2 className="mx-auto h-10 w-10 text-[var(--mos-accent)]" />
                  <div className="mt-3 text-xl font-bold">Lobby đang mở</div>
                  <div className="mt-1 text-sm opacity-60 tabular-nums">
                    {connectedParticipantCount} học viên online · Sẵn sàng mở câu đầu tiên
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3 font-semibold">Bộ câu hỏi sẽ chạy</div>
                  <div className="space-y-2">
                    {activeQuiz.questions.map((question, index) => (
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

          {activeQuestion && (
            <div className="rounded-2xl border border-inherit p-5">
              <div className="text-center text-xl font-bold">{activeQuestion.prompt}</div>
              {activeQuiz.status === 'QUESTION_OPEN' && (
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
                {activeQuestion.options.map((option) => {
                  const isRevealed = activeQuiz.status === 'REVEALED';
                  const optionToneClass = isRevealed
                    ? option.isCorrect
                      ? 'border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/45 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'border-[var(--mos-surface-border)] opacity-40'
                    : 'border-[var(--mos-surface-border)]';
                  return (
                    <div
                      key={option.id}
                      className={`flex min-h-12 items-center gap-2 rounded-xl border p-3 font-semibold transition ${optionToneClass}`}
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

          <LiveControlLeaderboard entries={gameLeaderboard} />
        </div>
      )}
    </Card>
  );
}

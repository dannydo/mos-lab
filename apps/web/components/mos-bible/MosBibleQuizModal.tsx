'use client';

import React from 'react';
import { Tabs } from 'antd';
import { Award, Zap } from 'lucide-react';
import { AdaptiveModal, AppIcon } from '../ui';
import { QuizModalHeader } from './mos-bible-quiz-modal/QuizModalHeader';
import { SpeedQuizTab } from './mos-bible-quiz-modal/SpeedQuizTab';
import { WeeklyQuizTab } from './mos-bible-quiz-modal/WeeklyQuizTab';
import { useMosBibleQuizModal } from './mos-bible-quiz-modal/useMosBibleQuizModal';

export type { QuizOptionKey, QuizTabKey, SpeedQuizState } from './mos-bible-quiz-modal/types';

export interface MosBibleQuizModalProps {
  open: boolean;
  onClose: () => void;
}

export function MosBibleQuizModal({ open, onClose }: MosBibleQuizModalProps) {
  const quiz = useMosBibleQuizModal(open);

  return (
    <AdaptiveModal
      intent="form"
      open={open}
      onCancel={onClose}
      width={680}
      title={<QuizModalHeader profile={quiz.profile} />}
      footer={null}
    >
      <Tabs
        activeKey={quiz.activeTab}
        onChange={quiz.handleTabChange}
        items={[
          {
            key: 'SPEED',
            label: (
              <span className="flex items-center gap-1.5 font-medium">
                <AppIcon icon={Zap} size="sm" className="text-amber-500" />⚡ Speed Quiz Săn Chuối (10s/câu)
              </span>
            ),
          },
          {
            key: 'WEEKLY',
            label: (
              <span className="flex items-center gap-1.5 font-medium">
                <AppIcon icon={Award} size="sm" className="text-emerald-500" />
                Mini-Quiz Tuần
              </span>
            ),
          },
        ]}
      />

      {quiz.activeTab === 'SPEED' && (
        <SpeedQuizTab
          speedState={quiz.speedState}
          profile={quiz.profile}
          speedLoading={quiz.speedLoading}
          buyingAttempt={quiz.buyingAttempt}
          speedQuestions={quiz.speedQuestions}
          currentSpeedQuestion={quiz.currentSpeedQuestion}
          speedIndex={quiz.speedIndex}
          speedTimeLeft={quiz.speedTimeLeft}
          speedStreak={quiz.speedStreak}
          speedSubmitting={quiz.speedSubmitting}
          speedRunResult={quiz.speedRunResult}
          onStartSpeedQuiz={quiz.handleStartSpeedQuiz}
          onBuyAttempt={quiz.handleBuyAttempt}
          onSelectSpeedOption={quiz.handleSelectSpeedOption}
          onClose={onClose}
        />
      )}

      {quiz.activeTab === 'WEEKLY' && (
        <WeeklyQuizTab
          weeklyLoading={quiz.weeklyLoading}
          weeklyQuestions={quiz.weeklyQuestions}
          currentWeeklyQuestion={quiz.currentWeeklyQuestion}
          weeklyIndex={quiz.weeklyIndex}
          weeklySelectedKey={quiz.weeklySelectedKey}
          weeklySubmitting={quiz.weeklySubmitting}
          weeklyResult={quiz.weeklyResult}
          weeklyEarnedPoints={quiz.weeklyEarnedPoints}
          onSelectKey={quiz.setWeeklySelectedKey}
          onSubmit={quiz.handleWeeklySubmit}
          onNext={quiz.handleWeeklyNext}
          onSwitchToSpeed={quiz.switchToSpeedTab}
        />
      )}
    </AdaptiveModal>
  );
}

export default MosBibleQuizModal;

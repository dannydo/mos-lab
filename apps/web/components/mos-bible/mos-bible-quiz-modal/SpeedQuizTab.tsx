'use client';

import React from 'react';
import type { MosBibleQuizQuestion, MosBibleSpeedQuizProfile, MosBibleSpeedQuizResult } from '@mos-lab/shared';
import type { QuizOptionKey, SpeedQuizState } from './types';
import { SpeedQuizIdleView } from './SpeedQuizIdleView';
import { SpeedQuizPlayingView } from './SpeedQuizPlayingView';
import { SpeedQuizResultView } from './SpeedQuizResultView';

export interface SpeedQuizTabProps {
  speedState: SpeedQuizState;
  profile: MosBibleSpeedQuizProfile;
  speedLoading: boolean;
  buyingAttempt: boolean;
  speedQuestions: MosBibleQuizQuestion[];
  currentSpeedQuestion: MosBibleQuizQuestion | undefined;
  speedIndex: number;
  speedTimeLeft: number;
  speedStreak: number;
  speedSubmitting: boolean;
  speedRunResult: MosBibleSpeedQuizResult | null;
  onStartSpeedQuiz: () => void;
  onBuyAttempt: () => void;
  onSelectSpeedOption: (selectedKey: QuizOptionKey) => void;
  onClose: () => void;
}

export function SpeedQuizTab({
  speedState,
  profile,
  speedLoading,
  buyingAttempt,
  speedQuestions,
  currentSpeedQuestion,
  speedIndex,
  speedTimeLeft,
  speedStreak,
  speedSubmitting,
  speedRunResult,
  onStartSpeedQuiz,
  onBuyAttempt,
  onSelectSpeedOption,
  onClose,
}: SpeedQuizTabProps) {
  return (
    <div className="pt-2">
      {speedState === 'IDLE' && (
        <SpeedQuizIdleView
          profile={profile}
          speedLoading={speedLoading}
          buyingAttempt={buyingAttempt}
          onStartSpeedQuiz={onStartSpeedQuiz}
          onBuyAttempt={onBuyAttempt}
        />
      )}

      {speedState === 'PLAYING' && currentSpeedQuestion && (
        <SpeedQuizPlayingView
          question={currentSpeedQuestion}
          speedIndex={speedIndex}
          totalQuestions={speedQuestions.length}
          speedStreak={speedStreak}
          speedTimeLeft={speedTimeLeft}
          speedSubmitting={speedSubmitting}
          onSelectOption={onSelectSpeedOption}
        />
      )}

      {speedState === 'RESULT' && speedRunResult && (
        <SpeedQuizResultView
          profile={profile}
          result={speedRunResult}
          buyingAttempt={buyingAttempt}
          onStartSpeedQuiz={onStartSpeedQuiz}
          onBuyAttempt={onBuyAttempt}
          onClose={onClose}
        />
      )}
    </div>
  );
}

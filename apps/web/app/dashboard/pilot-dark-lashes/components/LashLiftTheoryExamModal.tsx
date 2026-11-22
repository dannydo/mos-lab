'use client';

import React from 'react';
import { GraduationCap } from 'lucide-react';
import { AdaptiveModal } from '~/components/ui';
import {
  THEORY_QUESTIONS,
  type Essay19Answers,
  type EssayScores,
  type LashLiftTheoryExamModalProps,
  type QuizOptionKey,
  type QuizQuestion,
} from './lash-lift-theory-exam-modal/theory-exam-questions';
import { useLashLiftTheoryExam } from './lash-lift-theory-exam-modal/useLashLiftTheoryExam';
import { TheoryExamBanner } from './lash-lift-theory-exam-modal/TheoryExamBanner';
import { TheoryMcqSection } from './lash-lift-theory-exam-modal/TheoryMcqSection';
import { TheoryEssaySection } from './lash-lift-theory-exam-modal/TheoryEssaySection';
import { TheoryExamFooter } from './lash-lift-theory-exam-modal/TheoryExamFooter';

export type { QuizQuestion, QuizOptionKey, Essay19Answers, EssayScores, LashLiftTheoryExamModalProps };
export { THEORY_QUESTIONS };

export function LashLiftTheoryExamModal({
  open,
  onClose,
  onSubmitScore,
  candidateName = 'Chuyên Viên Giang Hồ',
  examinerName = 'CEO Danny Đỗ',
}: LashLiftTheoryExamModalProps) {
  const {
    secondsLeft,
    timerRunning,
    toggleTimer,
    answers,
    handleSelectOption,
    essay18,
    setEssay18,
    essay19,
    handleUpdateEssay19Case,
    essay20,
    setEssay20,
    essayScores,
    handleUpdateEssayScore,
    isSubmitted,
    showExplanations,
    toggleExplanations,
    correctCount,
    mcqScore,
    finalTheoryScore,
    handleSubmit,
  } = useLashLiftTheoryExam({ open, onSubmitScore });

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <GraduationCap size={18} />
          </div>
          <div>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100 block">
              Bài Thi Lý Thuyết Kỹ Thuật Uốn Mi (Wings Academy)
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              Thí sinh: <strong>{candidateName}</strong> · Giám khảo: <strong>{examinerName}</strong>
            </span>
          </div>
        </div>
      }
      width={760}
      footer={
        <TheoryExamFooter
          correctCount={correctCount}
          totalQuestions={THEORY_QUESTIONS.length}
          mcqScore={mcqScore}
          finalTheoryScore={finalTheoryScore}
          isSubmitted={isSubmitted}
          showExplanations={showExplanations}
          onClose={onClose}
          onSubmit={handleSubmit}
          onToggleExplanations={toggleExplanations}
        />
      }
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
        <TheoryExamBanner secondsLeft={secondsLeft} timerRunning={timerRunning} onToggleTimer={toggleTimer} />

        <TheoryMcqSection
          questions={THEORY_QUESTIONS}
          answers={answers}
          isSubmitted={isSubmitted}
          showExplanations={showExplanations}
          onSelectOption={handleSelectOption}
        />

        <TheoryEssaySection
          essay18={essay18}
          onChangeEssay18={setEssay18}
          essay19={essay19}
          onChangeEssay19Case={handleUpdateEssay19Case}
          essay20={essay20}
          onChangeEssay20={setEssay20}
          essayScores={essayScores}
          onChangeEssayScore={handleUpdateEssayScore}
          isSubmitted={isSubmitted}
        />
      </div>
    </AdaptiveModal>
  );
}

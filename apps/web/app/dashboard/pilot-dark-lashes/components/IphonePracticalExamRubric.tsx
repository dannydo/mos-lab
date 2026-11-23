'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import {
  PRACTICAL_EXAM_STAGES,
  type IphonePracticalExamRubricProps,
  type PracticalRubricScores,
} from './iphone-practical-exam-rubric/rubric-config';
import { useIphonePracticalExam } from './iphone-practical-exam-rubric/useIphonePracticalExam';
import { ExamStickyHeader } from './iphone-practical-exam-rubric/ExamStickyHeader';
import { RubricStageCard } from './iphone-practical-exam-rubric/RubricStageCard';
import { MacroPhotoCaptureCard } from './iphone-practical-exam-rubric/MacroPhotoCaptureCard';
import { ExaminerNotesCard } from './iphone-practical-exam-rubric/ExaminerNotesCard';
import { ExamBottomBar } from './iphone-practical-exam-rubric/ExamBottomBar';
import { CertSignConfirmModal } from './iphone-practical-exam-rubric/CertSignConfirmModal';

export type { PracticalRubricScores, IphonePracticalExamRubricProps };

export function IphonePracticalExamRubric({
  onClose,
  onApproveCert,
  candidateName = 'Chuyên Viên Giang Hồ',
  examinerName = 'CEO Danny Đỗ',
  initialScores,
}: IphonePracticalExamRubricProps) {
  const {
    secondsLeft,
    timerRunning,
    timerColorClass,
    toggleTimer,
    resetTimer,
    scores,
    setStageScore,
    totalScore,
    rank,
    leftEyePhoto,
    rightEyePhoto,
    captureLeftEyePhoto,
    captureRightEyePhoto,
    examinerNotes,
    setExaminerNotes,
    appendQuickTag,
    signModalOpen,
    setSignModalOpen,
    isSigned,
    handleApprove,
  } = useIphonePracticalExam({
    candidateName,
    initialScores,
    onApproveCert,
  });

  return (
    <div
      className="max-w-md mx-auto bg-slate-50 dark:bg-slate-950 min-h-screen pb-28 text-slate-800 dark:text-slate-100 flex flex-col font-sans border-x border-slate-200 dark:border-slate-800 shadow-2xl relative"
      data-testid="iphone-exam-rubric-view"
    >
      <ExamStickyHeader
        candidateName={candidateName}
        examinerName={examinerName}
        secondsLeft={secondsLeft}
        timerRunning={timerRunning}
        timerColorClass={timerColorClass}
        onToggleTimer={toggleTimer}
        onResetTimer={resetTimer}
        onClose={onClose}
      />

      <main className="p-4 space-y-4 flex-1">
        {/* Banner Nhắc Nhở Tiêu Chuẩn */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <AppIcon icon={ShieldCheck} size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="leading-tight text-[11.5px]">
            Chấm thi độc lập 4 chặng: <strong>100 điểm tuyệt đối</strong>. Thao tác 1-chạm cực nhạy, không gây tiếng
            động ảnh hưởng khách đang làm mi.
          </span>
        </div>

        {PRACTICAL_EXAM_STAGES.map((stage) => (
          <RubricStageCard
            key={stage.key}
            stage={stage}
            currentScore={scores[stage.key]}
            onSelectScore={(value) => setStageScore(stage.key, value)}
          />
        ))}

        <MacroPhotoCaptureCard
          leftEyePhoto={leftEyePhoto}
          rightEyePhoto={rightEyePhoto}
          onCaptureLeftEye={captureLeftEyePhoto}
          onCaptureRightEye={captureRightEyePhoto}
        />

        <ExaminerNotesCard
          examinerNotes={examinerNotes}
          onChangeNotes={setExaminerNotes}
          onQuickTagClick={appendQuickTag}
        />
      </main>

      <ExamBottomBar
        totalScore={totalScore}
        rank={rank}
        isSigned={isSigned}
        onOpenSignModal={() => setSignModalOpen(true)}
      />

      <CertSignConfirmModal
        open={signModalOpen}
        candidateName={candidateName}
        totalScore={totalScore}
        rank={rank}
        onCancel={() => setSignModalOpen(false)}
        onConfirmApprove={handleApprove}
      />
    </div>
  );
}

'use client';

import React from 'react';
import { GiangHoLearningJourneyCard } from '../GiangHoLearningJourneyCard';
import type { TechnicianAssessmentRecord } from './assessment-cert-config';
import { ExamGradingFormCard } from './ExamGradingFormCard';
import { ExamResultsTableCard } from './ExamResultsTableCard';
import { ExamStructureAndCriteriaSection } from './ExamStructureAndCriteriaSection';

interface AssessmentExamTabProps {
  records: TechnicianAssessmentRecord[];
  selectedTechId: string;
  examFormScores: Record<string, number>;
  theoryInputScore: number;
  examinerNotesInput: string;
  evidenceNoteInput: string;
  currentPracticalTotal: number;
  currentPassConclusion: boolean;
  onOpenExamRubric: () => void;
  onOpenTheoryQuiz: () => void;
  onSelectTechnician: (techId: string) => void;
  onTheoryScoreChange: (score: number) => void;
  onCriterionScoreChange: (criterionId: string, score: number) => void;
  onExaminerNotesChange: (notes: string) => void;
  onEvidenceNoteChange: (note: string) => void;
  onSaveExamResult: () => void;
  onPreviewCert: (record: TechnicianAssessmentRecord) => void;
}

export function AssessmentExamTab({
  records,
  selectedTechId,
  examFormScores,
  theoryInputScore,
  examinerNotesInput,
  evidenceNoteInput,
  currentPracticalTotal,
  currentPassConclusion,
  onOpenExamRubric,
  onOpenTheoryQuiz,
  onSelectTechnician,
  onTheoryScoreChange,
  onCriterionScoreChange,
  onExaminerNotesChange,
  onEvidenceNoteChange,
  onSaveExamResult,
  onPreviewCert,
}: AssessmentExamTabProps) {
  return (
    <div className="space-y-6" data-testid="section-exam-management">
      {/* Card Học Viên Giang Hồ: Nhật Ký Thực Hành 4 Buổi & Thi Tốt Nghiệp 31/10 */}
      <GiangHoLearningJourneyCard onOpenExamRubric={onOpenExamRubric} onOpenTheoryQuiz={onOpenTheoryQuiz} />

      <ExamStructureAndCriteriaSection />

      <ExamGradingFormCard
        records={records}
        selectedTechId={selectedTechId}
        examFormScores={examFormScores}
        theoryInputScore={theoryInputScore}
        examinerNotesInput={examinerNotesInput}
        evidenceNoteInput={evidenceNoteInput}
        currentPracticalTotal={currentPracticalTotal}
        currentPassConclusion={currentPassConclusion}
        onSelectTechnician={onSelectTechnician}
        onTheoryScoreChange={onTheoryScoreChange}
        onCriterionScoreChange={onCriterionScoreChange}
        onExaminerNotesChange={onExaminerNotesChange}
        onEvidenceNoteChange={onEvidenceNoteChange}
        onSaveExamResult={onSaveExamResult}
      />

      <ExamResultsTableCard records={records} onPreviewCert={onPreviewCert} />
    </div>
  );
}

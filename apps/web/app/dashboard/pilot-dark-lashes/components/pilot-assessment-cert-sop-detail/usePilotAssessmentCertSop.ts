'use client';

import { useMemo, useState } from 'react';
import { message } from 'antd';
import type { PilotSession } from '@mos-lab/shared';
import {
  buildNextCertificateCode,
  calculatePracticalTotal,
  computeCsatMetrics,
  DEFAULT_EVIDENCE_NOTE_INPUT,
  DEFAULT_EXAM_FORM_SCORES,
  DEFAULT_EXAMINER_NOTES_INPUT,
  DEFAULT_SELECTED_TECH_ID,
  DEFAULT_THEORY_INPUT_SCORE,
  evaluateExamPass,
  INITIAL_TECHNICIAN_RECORDS,
  type AssessmentSopTabKey,
  type TechnicianAssessmentRecord,
} from './assessment-cert-config';

export function usePilotAssessmentCertSop(sessions: PilotSession[]) {
  const [activeTab, setActiveTab] = useState<AssessmentSopTabKey>('exam');
  const [records, setRecords] = useState<TechnicianAssessmentRecord[]>(INITIAL_TECHNICIAN_RECORDS);

  // State cho việc chấm thi của CEO Danny
  const [selectedTechId, setSelectedTechId] = useState<string>(DEFAULT_SELECTED_TECH_ID);
  const [examFormScores, setExamFormScores] = useState<Record<string, number>>(DEFAULT_EXAM_FORM_SCORES);
  const [theoryInputScore, setTheoryInputScore] = useState<number>(DEFAULT_THEORY_INPUT_SCORE);
  const [examinerNotesInput, setExaminerNotesInput] = useState<string>(DEFAULT_EXAMINER_NOTES_INPUT);
  const [evidenceNoteInput, setEvidenceNoteInput] = useState<string>(DEFAULT_EVIDENCE_NOTE_INPUT);

  // State cho Certificate Preview Modal
  const [previewCertTech, setPreviewCertTech] = useState<TechnicianAssessmentRecord | null>(null);

  // State cho iPhone Rubric Coi Thi & Bài Thi Lý Thuyết (MOS-BUG-182)
  const [iphoneRubricOpen, setIphoneRubricOpen] = useState<boolean>(false);
  const [theoryQuizOpen, setTheoryQuizOpen] = useState<boolean>(false);

  const handleSelectTechnician = (techId: string) => {
    setSelectedTechId(techId);
    const rec = records.find((r) => r.id === techId);
    if (rec) {
      setTheoryInputScore(rec.theoryScore);
      setExamFormScores(rec.practicalScores);
      setExaminerNotesInput(rec.examinerNotes);
      setEvidenceNoteInput(rec.evidenceNote);
    }
  };

  const handleUpdateCriterionScore = (criterionId: string, value: number) => {
    setExamFormScores((prev) => ({
      ...prev,
      [criterionId]: value,
    }));
  };

  const handleRubricApprove = (finalScore: number, notes: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === 'tech-giang-ho'
          ? {
              ...r,
              practicalTotalScore: finalScore,
              examinerNotes: notes,
              status: finalScore >= 90 ? 'PASSED' : 'FAILED',
              certificateApproved: finalScore >= 95,
              certificateCode: 'WINGS-DL-2026-004-GH',
              certificateIssuedAt: '31/10/2026',
            }
          : r
      )
    );
  };

  const handleTheoryQuizSubmit = (score: number, summary: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === 'tech-giang-ho'
          ? {
              ...r,
              theoryScore: score,
              evidenceNote: `${r.evidenceNote} | Lý thuyết: ${score}/100đ (${summary})`,
            }
          : r
      )
    );
  };

  const currentPracticalTotal = useMemo(() => calculatePracticalTotal(examFormScores), [examFormScores]);

  const currentPassConclusion = useMemo(
    () => evaluateExamPass(examFormScores, theoryInputScore, currentPracticalTotal),
    [examFormScores, theoryInputScore, currentPracticalTotal]
  );

  // Handler khi CEO Danny lưu kết quả chấm thi
  const handleSaveExamResult = () => {
    const targetTech = records.find((r) => r.id === selectedTechId);
    if (!targetTech) return;

    const isPassed = currentPassConclusion;
    const updated: TechnicianAssessmentRecord = {
      ...targetTech,
      theoryScore: theoryInputScore,
      practicalScores: { ...examFormScores },
      practicalTotalScore: currentPracticalTotal,
      isEliminationViolated: (examFormScores['crit-safety'] || 0) < 20,
      status: isPassed ? 'PASSED' : 'FAILED',
      examinerNotes: examinerNotesInput,
      evidenceNote: evidenceNoteInput,
      examDate: new Date().toLocaleDateString('vi-VN'),
    };

    setRecords((prev) => prev.map((r) => (r.id === selectedTechId ? updated : r)));
    message.success(
      `Đã cập nhật kết quả sát hạch cho ${targetTech.technicianName}: ${isPassed ? 'ĐẠT (PASS)' : 'KHÔNG ĐẠT (FAIL)'}`
    );
  };

  // Handler phê duyệt cấp chứng chỉ của CEO Danny
  const handleApproveCertificate = (techId: string) => {
    const target = records.find((r) => r.id === techId);
    if (!target) return;
    if (target.status !== 'PASSED') {
      message.error('Chuyên Viên chưa đạt kỳ sát hạch, không thể cấp chứng chỉ vận hành!');
      return;
    }

    const code = buildNextCertificateCode(records, target.certificateCode);
    const updated: TechnicianAssessmentRecord = {
      ...target,
      certificateCode: code,
      certificateIssuedAt: new Date().toLocaleDateString('vi-VN'),
      certificateApproved: true,
    };

    setRecords((prev) => prev.map((r) => (r.id === techId ? updated : r)));
    message.success(`CEO Danny Đỗ đã ký duyệt cấp Chứng chỉ Chuyên Môn số ${code} cho ${target.technicianName}!`);
  };

  const csatMetrics = useMemo(() => computeCsatMetrics(sessions), [sessions]);

  return {
    activeTab,
    setActiveTab,
    records,
    selectedTechId,
    examFormScores,
    theoryInputScore,
    setTheoryInputScore,
    examinerNotesInput,
    setExaminerNotesInput,
    evidenceNoteInput,
    setEvidenceNoteInput,
    previewCertTech,
    setPreviewCertTech,
    iphoneRubricOpen,
    setIphoneRubricOpen,
    theoryQuizOpen,
    setTheoryQuizOpen,
    currentPracticalTotal,
    currentPassConclusion,
    csatMetrics,
    handleSelectTechnician,
    handleUpdateCriterionScore,
    handleSaveExamResult,
    handleApproveCertificate,
    handleRubricApprove,
    handleTheoryQuizSubmit,
  };
}

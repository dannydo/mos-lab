'use client';

import React from 'react';
import { Award } from 'lucide-react';
import { AdaptiveModal } from '~/components/ui';
import { IphonePracticalExamRubric } from './IphonePracticalExamRubric';
import { LashLiftTheoryExamModal } from './LashLiftTheoryExamModal';
import {
  PRACTICAL_CRITERIA_LIST,
  type PilotAssessmentCertSopDetailProps,
  type PracticalExamCriterion,
  type TechnicianAssessmentRecord,
} from './pilot-assessment-cert-sop-detail/assessment-cert-config';
import { AssessmentCertificateTab } from './pilot-assessment-cert-sop-detail/AssessmentCertificateTab';
import { AssessmentCsatAuditTab } from './pilot-assessment-cert-sop-detail/AssessmentCsatAuditTab';
import { AssessmentExamTab } from './pilot-assessment-cert-sop-detail/AssessmentExamTab';
import { AssessmentSopHeaderAndTabs } from './pilot-assessment-cert-sop-detail/AssessmentSopHeaderAndTabs';
import { CertificatePreviewModal } from './pilot-assessment-cert-sop-detail/CertificatePreviewModal';
import { usePilotAssessmentCertSop } from './pilot-assessment-cert-sop-detail/usePilotAssessmentCertSop';

export type { PracticalExamCriterion, TechnicianAssessmentRecord, PilotAssessmentCertSopDetailProps };
export { PRACTICAL_CRITERIA_LIST };

export function PilotAssessmentCertSopDetail({ onBack, sessions = [] }: PilotAssessmentCertSopDetailProps) {
  const {
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
  } = usePilotAssessmentCertSop(sessions);

  return (
    <div className="space-y-6" data-testid="pilot-assessment-sop-detail">
      <AssessmentSopHeaderAndTabs
        onBack={onBack}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        technicianCount={records.length}
        avgCsatScore={csatMetrics.avgScore}
      />

      {activeTab === 'exam' && (
        <AssessmentExamTab
          records={records}
          selectedTechId={selectedTechId}
          examFormScores={examFormScores}
          theoryInputScore={theoryInputScore}
          examinerNotesInput={examinerNotesInput}
          evidenceNoteInput={evidenceNoteInput}
          currentPracticalTotal={currentPracticalTotal}
          currentPassConclusion={currentPassConclusion}
          onOpenExamRubric={() => setIphoneRubricOpen(true)}
          onOpenTheoryQuiz={() => setTheoryQuizOpen(true)}
          onSelectTechnician={handleSelectTechnician}
          onTheoryScoreChange={setTheoryInputScore}
          onCriterionScoreChange={handleUpdateCriterionScore}
          onExaminerNotesChange={setExaminerNotesInput}
          onEvidenceNoteChange={setEvidenceNoteInput}
          onSaveExamResult={handleSaveExamResult}
          onPreviewCert={setPreviewCertTech}
        />
      )}

      {activeTab === 'csat' && <AssessmentCsatAuditTab csatMetrics={csatMetrics} />}

      {activeTab === 'cert' && (
        <AssessmentCertificateTab
          records={records}
          onPreviewCert={setPreviewCertTech}
          onApproveCertificate={handleApproveCertificate}
        />
      )}

      <CertificatePreviewModal previewCertTech={previewCertTech} onClose={() => setPreviewCertTech(null)} />

      {/* Modal Bài Thi Lý Thuyết (MOS-BUG-182) */}
      <LashLiftTheoryExamModal
        open={theoryQuizOpen}
        onClose={() => setTheoryQuizOpen(false)}
        onSubmitScore={handleTheoryQuizSubmit}
        candidateName="Chuyên Viên Giang Hồ"
        examinerName="CEO Danny Đỗ"
      />

      {/* Modal iPhone 12+ Coi Thi 1-Chạm (MOS-BUG-182) */}
      <AdaptiveModal
        open={iphoneRubricOpen}
        onCancel={() => setIphoneRubricOpen(false)}
        footer={null}
        width={460}
        centered
        className="iphone-exam-rubric-modal"
        title={null}
      >
        <IphonePracticalExamRubric
          onClose={() => setIphoneRubricOpen(false)}
          onApproveCert={handleRubricApprove}
          candidateName="Chuyên Viên Giang Hồ"
          examinerName="CEO Danny Đỗ"
        />
      </AdaptiveModal>

      {/* Khối Báo Cáo Tiến Độ Hạng Mục 5 & Thẩm Quyền CEO */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="font-bold text-slate-800 dark:text-slate-200 block">
            Trạng Thái Nghiệp Vụ Hạng Mục 5: ĐÃ HOÀN THIỆN ĐẦY ĐỦ NỘI DUNG SÁT HẠCH &amp; CSAT
          </span>
          <p className="text-slate-500 dark:text-slate-400 m-0">
            Hồ sơ năng lực chuyên môn và CSAT đã sẵn sàng làm căn cứ trình CEO Danny Đỗ xem xét phê duyệt Scale. Tính
            năng tự động Scale toàn hệ thống tiếp tục giữ nguyên chế độ bảo vệ.
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <Award size={13} />
          <span>Sẵn sàng trình CEO</span>
        </span>
      </div>
    </div>
  );
}

export default PilotAssessmentCertSopDetail;

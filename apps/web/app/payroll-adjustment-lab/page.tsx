'use client';

import { Card, Space, Typography } from 'antd';
import { AdjustmentReviewQueue } from './adjustment-review-queue';
import { HrCustomAdjustmentCard } from './hr-custom-adjustment-card';
import { SettlementReviewCard } from './settlement-review-card';
import { ApproverRehearsalSection } from './payroll-adjustment-lab-page-modules/ApproverRehearsalSection';
import { LabPageHeaderSection } from './payroll-adjustment-lab-page-modules/LabPageHeaderSection';
import { LocalCaseRehearsalSection } from './payroll-adjustment-lab-page-modules/LocalCaseRehearsalSection';
import { ShadowSimulationSection } from './payroll-adjustment-lab-page-modules/ShadowSimulationSection';
import {
  formatAmountInput,
  formatDong,
  parseWholeDong,
} from './payroll-adjustment-lab-page-modules/payrollAdjustmentLabUtils';
import { usePayrollAdjustmentLabPage } from './payroll-adjustment-lab-page-modules/usePayrollAdjustmentLabPage';

const { Paragraph } = Typography;

export default function PayrollAdjustmentLabPage() {
  const lab = usePayrollAdjustmentLabPage();

  if (!lab.authorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-10">
      <section className="mx-auto max-w-5xl">
        <Space direction="vertical" size={18} className="w-full">
          <LabPageHeaderSection safeDevEnabled={lab.safeDevEnabled} />

          <AdjustmentReviewQueue cases={lab.queueCases} />

          <SettlementReviewCard
            review={lab.settlementReview}
            locking={lab.settlementLocking}
            canLock={lab.approverStaffId !== null}
            onLock={() => void lab.lockSettlementReview()}
          />

          <ApproverRehearsalSection
            approverGroup={lab.approverGroup}
            requesterStaffId={lab.requesterStaffId}
            approverStaffId={lab.approverStaffId}
            approvalResult={lab.approvalResult}
            approvalLoading={lab.approvalLoading}
            onRequesterChange={lab.setRequesterStaffId}
            onApproverChange={lab.setApproverStaffId}
            onRunApprovalCheck={() => void lab.runApprovalCheck()}
          />

          <LocalCaseRehearsalSection
            localCase={lab.localCase}
            eligibleCase={lab.eligibleCase}
            caseLoading={lab.caseLoading}
            caseError={lab.caseError}
            blockedScenario={lab.blockedScenario}
            blockedResult={lab.blockedResult}
            blockedLoading={lab.blockedLoading}
            onCreateLocalDraft={() => void lab.createLocalDraft()}
            onDecideLocalCase={(decision) => void lab.decideLocalCase(decision)}
            onBlockedScenarioChange={(value) => {
              lab.setBlockedScenario(value);
              lab.setBlockedResult(null);
            }}
            onRunBlockedScenario={() => void lab.runBlockedScenario()}
            onCreateEligibleLocalDraft={() => void lab.createEligibleLocalDraft()}
            onDecideEligibleLocalCase={(decision) => void lab.decideEligibleLocalCase(decision)}
          />

          <ShadowSimulationSection
            caseSnapshotLocked={lab.caseSnapshotLocked}
            sourceStatus={lab.sourceStatus}
            sourceLocked={lab.sourceLocked}
            beforeAmount={lab.beforeAmount}
            afterAmount={lab.afterAmount}
            targetStatus={lab.targetStatus}
            eligibility={lab.eligibility}
            amountsAreValid={lab.amountsAreValid}
            loading={lab.loading}
            error={lab.error}
            localCase={lab.localCase}
            result={lab.result}
            onSourceStatusChange={lab.setSourceStatus}
            onBeforeAmountChange={lab.setBeforeAmount}
            onAfterAmountChange={lab.setAfterAmount}
            onTargetStatusChange={lab.setTargetStatus}
            onEligibilityChange={lab.setEligibility}
            onRunShadow={() => void lab.runShadow()}
          />

          <HrCustomAdjustmentCard
            amount={lab.customAmount}
            comment={lab.customComment}
            targetStatus={lab.customTargetStatus}
            result={lab.customResult}
            error={lab.customError}
            loading={lab.customLoading}
            adjustmentCase={lab.hrCustomCase}
            onAmountChange={lab.setCustomAmount}
            onCommentChange={lab.setCustomComment}
            onTargetStatusChange={(value) => lab.setCustomTargetStatus(value)}
            onValidate={() => void lab.runCustomAdjustment()}
            onCreateDraft={() => void lab.createHrCustomLocalDraft()}
            onDecision={(decision) => void lab.decideHrCustomLocalCase(decision)}
            formatAmountInput={formatAmountInput}
            parseWholeDong={parseWholeDong}
            formatDong={formatDong}
          />

          <Card size="small" title="Case khởi điểm để Danny thử">
            <Paragraph className="mb-0">
              Case mặc định là giảm từ <strong>2,990 đ</strong> xuống <strong>2,925 đ</strong>, nên kết quả phải là
              <strong> -65 đ</strong> ở kỳ hiện tại. Thử đổi kỳ nguồn sang REVIEWING hoặc Log chờ duyệt: calculator phải
              chặn, không được tạo payout.
            </Paragraph>
          </Card>
        </Space>
      </section>
    </main>
  );
}

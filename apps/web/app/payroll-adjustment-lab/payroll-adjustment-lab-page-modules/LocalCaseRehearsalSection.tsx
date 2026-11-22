'use client';

import { Alert, Button, Card, Segmented, Space, Typography } from 'antd';
import type { FalAdjustmentShadowResult, PayrollAdjustmentLabCase } from '@mos-lab/shared';
import { AdjustmentCaseMetricsSummary } from './AdjustmentCaseMetricsSummary';
import { BLOCKED_SCENARIO_COPY, type BlockedScenario, type CaseDecision } from './payrollAdjustmentLabTypes';

const { Text } = Typography;

interface LocalCaseRehearsalSectionProps {
  localCase: PayrollAdjustmentLabCase | null;
  eligibleCase: PayrollAdjustmentLabCase | null;
  caseLoading: boolean;
  caseError: string | null;
  blockedScenario: BlockedScenario;
  blockedResult: FalAdjustmentShadowResult | null;
  blockedLoading: boolean;
  onCreateLocalDraft: () => void;
  onDecideLocalCase: (decision: CaseDecision) => void;
  onBlockedScenarioChange: (scenario: BlockedScenario) => void;
  onRunBlockedScenario: () => void;
  onCreateEligibleLocalDraft: () => void;
  onDecideEligibleLocalCase: (decision: CaseDecision) => void;
}

export function LocalCaseRehearsalSection({
  localCase,
  eligibleCase,
  caseLoading,
  caseError,
  blockedScenario,
  blockedResult,
  blockedLoading,
  onCreateLocalDraft,
  onDecideLocalCase,
  onBlockedScenarioChange,
  onRunBlockedScenario,
  onCreateEligibleLocalDraft,
  onDecideEligibleLocalCase,
}: LocalCaseRehearsalSectionProps) {
  return (
    <>
      <Card size="small" title="Adjustment Case local · snapshot và audit">
        <Space direction="vertical" size={12} className="w-full">
          <Alert
            type="info"
            showIcon
            message="Case mẫu chỉ dùng snapshot synthetic đã LOCKED"
            description="Tạo draft sẽ ghi case, snapshot, line và audit vào database loopback. Nó không thể post tiền hoặc chạm payslip."
          />
          {localCase ? (
            <AdjustmentCaseMetricsSummary adjustmentCase={localCase} />
          ) : (
            <Text type="secondary">Chưa có case local. Chọn người tạo draft ở thẻ trên rồi tạo case mẫu.</Text>
          )}
          {caseError ? <Alert type="error" showIcon message={caseError} /> : null}
          {!localCase ? (
            <Button type="primary" loading={caseLoading} onClick={onCreateLocalDraft}>
              Tạo draft local từ snapshot LOCKED
            </Button>
          ) : localCase.status === 'READY_FOR_APPROVAL' ? (
            <Space wrap>
              <Button type="primary" loading={caseLoading} onClick={() => onDecideLocalCase('APPROVE')}>
                Duyệt case local
              </Button>
              <Button danger loading={caseLoading} onClick={() => onDecideLocalCase('REJECT')}>
                Từ chối case local
              </Button>
            </Space>
          ) : null}
        </Space>
      </Card>

      <Card size="small" title="Scenario #2 · chốt chặn trước khi tạo Case">
        <Space direction="vertical" size={12} className="w-full">
          <Alert
            type="warning"
            showIcon
            message="Scenario này chỉ kiểm tra việc bị chặn"
            description="Nó dùng một event synthetic khác với case đã duyệt, không tạo draft, snapshot, audit hay payout. Case đầu tiên vẫn giữ nguyên."
          />
          <div>
            <Text strong>Điều kiện cố tình chưa đạt</Text>
            <Segmented<BlockedScenario>
              className="mt-2 w-full"
              options={(Object.keys(BLOCKED_SCENARIO_COPY) as BlockedScenario[]).map((value) => ({
                label: BLOCKED_SCENARIO_COPY[value].label,
                value,
              }))}
              value={blockedScenario}
              onChange={onBlockedScenarioChange}
            />
          </div>
          <Text type="secondary">{BLOCKED_SCENARIO_COPY[blockedScenario].detail}</Text>
          <Button type="default" loading={blockedLoading} onClick={onRunBlockedScenario}>
            Chạy kiểm tra chặn local
          </Button>
          {blockedResult ? (
            <Alert
              type={blockedResult.status === 'REQUIRES_REVIEW' ? 'success' : 'error'}
              showIcon
              message={
                blockedResult.status === 'REQUIRES_REVIEW'
                  ? 'Đã chặn đúng: không có snapshot, draft, audit hay payout mới.'
                  : 'Sai chốt an toàn: scenario không được phép đi tiếp.'
              }
              description={BLOCKED_SCENARIO_COPY[blockedScenario].detail}
            />
          ) : null}
        </Space>
      </Card>

      <Card size="small" title="Scenario #3 · event mới đủ điều kiện">
        <Space direction="vertical" size={12} className="w-full">
          <Alert
            type="info"
            showIcon
            message="Chỉ event mới được phép tạo draft riêng"
            description="Scenario này dùng nguồn LOCKED, kỳ nhận OPEN, FAL READY và snapshot của một CV synthetic khác. Nó không mở lại hoặc sửa case đã duyệt phía trên."
          />
          {eligibleCase ? (
            <AdjustmentCaseMetricsSummary adjustmentCase={eligibleCase} />
          ) : (
            <Text type="secondary">Chưa có case thứ hai. Nút bên dưới mới tạo một draft độc lập từ event mới.</Text>
          )}
          {!eligibleCase ? (
            <Button type="primary" loading={caseLoading} onClick={onCreateEligibleLocalDraft}>
              Tạo draft riêng từ event mới
            </Button>
          ) : eligibleCase.status === 'READY_FOR_APPROVAL' ? (
            <Space wrap>
              <Button type="primary" loading={caseLoading} onClick={() => onDecideEligibleLocalCase('APPROVE')}>
                Duyệt case thứ hai
              </Button>
              <Button danger loading={caseLoading} onClick={() => onDecideEligibleLocalCase('REJECT')}>
                Từ chối case thứ hai
              </Button>
            </Space>
          ) : null}
        </Space>
      </Card>
    </>
  );
}

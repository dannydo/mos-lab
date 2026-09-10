'use client';

import { Alert, Button, Card, Divider, Input, Segmented, Space, Statistic, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  FalAdjustmentSnapshotInput,
  FalAdjustmentShadowResult,
  PayrollAdjustmentLabApproverGroupResponse,
  PayrollAdjustmentLabApprovalCheckResponse,
  PayrollAdjustmentLabCase,
  PayrollAdjustmentLabCaseResponse,
  PayrollAdjustmentLabHrCustomResponse,
  PayrollAdjustmentLabSettlementReviewResponse,
} from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { AdjustmentReviewQueue } from './adjustment-review-queue';
import { HrCustomAdjustmentCard } from './hr-custom-adjustment-card';
import { SettlementReviewCard } from './settlement-review-card';

const { Title, Paragraph, Text } = Typography;

type PeriodStatus = 'LOCKED' | 'OPEN' | 'REVIEWING';
type Eligibility = 'READY' | 'PENDING_LOG_APPROVAL';
type BlockedScenario = 'SOURCE_REVIEWING' | 'TARGET_REVIEWING' | 'PENDING_LOG_APPROVAL';

const blockedScenarioCopy: Record<BlockedScenario, { label: string; detail: string }> = {
  SOURCE_REVIEWING: {
    label: 'Nguồn REVIEWING',
    detail: 'Nguồn chưa LOCKED nên chưa có snapshot bất biến để tham chiếu.',
  },
  TARGET_REVIEWING: {
    label: 'Kỳ nhận REVIEWING',
    detail: 'Kỳ nhận chưa OPEN nên không thể nhận Adjustment.',
  },
  PENDING_LOG_APPROVAL: {
    label: 'Log chờ duyệt',
    detail: 'Log chưa được duyệt nên chưa đủ điều kiện tài chính để tạo Adjustment.',
  },
};

function parseWholeDong(value: string): number | null {
  const normalized = value.trim().replace(/[,.\s]/g, '');
  if (!/^-?\d+$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) ? amount : null;
}

function formatAmountInput(value: string): string {
  const trimmed = value.trim();
  const negative = trimmed.startsWith('-');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return negative ? '-' : '';
  const amount = Number(digits);
  if (!Number.isSafeInteger(amount)) return value;
  return `${negative ? '-' : ''}${amount.toLocaleString('en-US')}`;
}

function formatDong(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value.toLocaleString('en-US')} đ`;
}

function statusColor(status: FalAdjustmentShadowResult['status']) {
  return status === 'READY_FOR_APPROVAL' ? 'green' : 'gold';
}

export default function PayrollAdjustmentLabPage() {
  const [beforeAmount, setBeforeAmount] = useState('2,990');
  const [afterAmount, setAfterAmount] = useState('2,925');
  const [sourceStatus, setSourceStatus] = useState<PeriodStatus>('LOCKED');
  const [targetStatus, setTargetStatus] = useState<PeriodStatus>('OPEN');
  const [eligibility, setEligibility] = useState<Eligibility>('READY');
  const [result, setResult] = useState<FalAdjustmentShadowResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState('-65');
  const [customComment, setCustomComment] = useState('Sai số đã được HR xác nhận');
  const [customTargetStatus, setCustomTargetStatus] = useState<'OPEN' | 'REVIEWING'>('OPEN');
  const [customResult, setCustomResult] = useState<PayrollAdjustmentLabHrCustomResponse | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [hrCustomCase, setHrCustomCase] = useState<PayrollAdjustmentLabCaseResponse['adjustmentCase'] | null>(null);
  const [approverGroup, setApproverGroup] = useState<PayrollAdjustmentLabApproverGroupResponse['group'] | null>(null);
  const [requesterStaffId, setRequesterStaffId] = useState<number | null>(null);
  const [approverStaffId, setApproverStaffId] = useState<number | null>(null);
  const [approvalResult, setApprovalResult] = useState<PayrollAdjustmentLabApprovalCheckResponse | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [localCase, setLocalCase] = useState<PayrollAdjustmentLabCaseResponse['adjustmentCase'] | null>(null);
  const [eligibleCase, setEligibleCase] = useState<PayrollAdjustmentLabCaseResponse['adjustmentCase'] | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [blockedScenario, setBlockedScenario] = useState<BlockedScenario>('SOURCE_REVIEWING');
  const [blockedResult, setBlockedResult] = useState<FalAdjustmentShadowResult | null>(null);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [queueCases, setQueueCases] = useState<PayrollAdjustmentLabCase[]>([]);
  const [settlementReview, setSettlementReview] = useState<PayrollAdjustmentLabSettlementReviewResponse | null>(null);
  const [settlementLocking, setSettlementLocking] = useState(false);

  const amountsAreValid = useMemo(
    () => parseWholeDong(beforeAmount) !== null && parseWholeDong(afterAmount) !== null,
    [afterAmount, beforeAmount]
  );
  const sourceLocked = sourceStatus === 'LOCKED';
  const caseSnapshotLocked = localCase !== null;

  const runShadow = useCallback(async () => {
    const before = parseWholeDong(beforeAmount);
    const after = parseWholeDong(afterAmount);
    if (before === null || after === null) {
      setError('Nhập số tiền nguyên VND hợp lệ. Màn thử không nhận số lẻ hoặc làm tròn ở giao diện.');
      setResult(null);
      return;
    }

    const input: FalAdjustmentSnapshotInput = {
      eventKey: 'local-lab:synthetic-adjustment',
      falRule: 'Adjust',
      financialEligibility: eligibility,
      sourcePeriod: {
        periodKey: '2026-08',
        status: sourceStatus,
        calculationVersion: 'fal-transactional.v1',
      },
      targetPeriod: { periodKey: '2026-09', status: targetStatus },
      beforeSettlement: {
        mode: 'SHADOW_READ_ONLY',
        sourcePeriodKey: '2026-08',
        calculationVersion: 'fal-transactional.v1',
        subjectKey: 'synthetic:cc:001',
        lineCount: 1,
        grossAmount: before,
        capAmount: null,
        receivedAmount: before,
        holdAmount: 0,
      },
      afterSettlement: {
        mode: 'SHADOW_READ_ONLY',
        sourcePeriodKey: '2026-08',
        calculationVersion: 'fal-transactional.v1',
        subjectKey: 'synthetic:cc:001',
        lineCount: 1,
        grossAmount: after,
        capAmount: null,
        receivedAmount: after,
        holdAmount: 0,
      },
    };

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.safeDevPayrollAdjustmentLab.calculateShadow({ input });
      setResult(response.result);
    } catch {
      setError('Không chạy được calculator local. Hột Mít sẽ kiểm tra runtime trước khi tiếp tục.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [afterAmount, beforeAmount, eligibility, sourceStatus, targetStatus]);

  const runCustomAdjustment = useCallback(async () => {
    const amount = parseWholeDong(customAmount);
    if (amount === null || amount === 0) {
      setCustomError('Custom Adjustment phải là số VND nguyên khác 0.');
      setCustomResult(null);
      return;
    }
    setCustomLoading(true);
    setCustomError(null);
    try {
      const response = await apiClient.safeDevPayrollAdjustmentLab.validateHrCustom({
        input: {
          amount,
          comment: customComment,
          targetPeriodKey: '2026-09',
          targetPeriodStatus: customTargetStatus,
        },
      });
      setCustomResult(response);
    } catch {
      setCustomError('Custom Adjustment chưa hợp lệ: phải có comment và kỳ nhận đang OPEN.');
      setCustomResult(null);
    } finally {
      setCustomLoading(false);
    }
  }, [customAmount, customComment, customTargetStatus]);

  useEffect(() => {
    void runShadow();
  }, [runShadow]);

  useEffect(() => {
    void apiClient.safeDevPayrollAdjustmentLab.approverGroup().then((response) => {
      setApproverGroup(response.group);
      setRequesterStaffId(response.group.members[0]?.staffId ?? null);
      setApproverStaffId(response.group.members[1]?.staffId ?? response.group.members[0]?.staffId ?? null);
    });
  }, []);

  const refreshLocalCase = useCallback(async () => {
    const response = await apiClient.safeDevPayrollAdjustmentLab.getCase();
    setLocalCase(response.adjustmentCase);
  }, []);

  const refreshEligibleCase = useCallback(async () => {
    const response = await apiClient.safeDevPayrollAdjustmentLab.getEligibleCase();
    setEligibleCase(response.adjustmentCase);
  }, []);

  const refreshHrCustomCase = useCallback(async () => {
    const response = await apiClient.safeDevPayrollAdjustmentLab.getHrCustomCase();
    setHrCustomCase(response.adjustmentCase);
  }, []);

  const refreshQueue = useCallback(async () => {
    const response = await apiClient.safeDevPayrollAdjustmentLab.listCases();
    setQueueCases(response.adjustmentCases);
  }, []);

  useEffect(() => {
    void refreshLocalCase();
  }, [refreshLocalCase]);

  useEffect(() => {
    void refreshEligibleCase();
  }, [refreshEligibleCase]);

  useEffect(() => {
    void refreshHrCustomCase();
  }, [refreshHrCustomCase]);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  useEffect(() => {
    void apiClient.safeDevPayrollAdjustmentLab.settlementReview().then(setSettlementReview);
  }, []);

  const lockSettlementReview = useCallback(async () => {
    if (!settlementReview || approverStaffId === null) return;
    setSettlementLocking(true);
    try {
      await apiClient.safeDevPayrollAdjustmentLab.lockSettlementReview({
        actorStaffId: approverStaffId,
        periodKey: settlementReview.period.periodKey,
        version: settlementReview.period.version,
      });
      setSettlementReview(await apiClient.safeDevPayrollAdjustmentLab.settlementReview());
    } finally {
      setSettlementLocking(false);
    }
  }, [approverStaffId, settlementReview]);

  useEffect(() => {
    if (!localCase || localCase.beforeAmount === null || localCase.afterAmount === null) return;
    setBeforeAmount(formatAmountInput(String(localCase.beforeAmount)));
    setAfterAmount(formatAmountInput(String(localCase.afterAmount)));
    setSourceStatus('LOCKED');
    setTargetStatus('OPEN');
    setEligibility('READY');
    setError(null);
  }, [localCase]);

  const runApprovalCheck = useCallback(async () => {
    if (requesterStaffId === null || approverStaffId === null) return;
    setApprovalLoading(true);
    try {
      const response = await apiClient.safeDevPayrollAdjustmentLab.checkApproval({ requesterStaffId, approverStaffId });
      setApprovalResult(response);
    } finally {
      setApprovalLoading(false);
    }
  }, [approverStaffId, requesterStaffId]);

  const createLocalDraft = useCallback(async () => {
    if (requesterStaffId === null) return;
    setCaseLoading(true);
    setCaseError(null);
    try {
      const response = await apiClient.safeDevPayrollAdjustmentLab.createDraft({ requesterStaffId });
      setLocalCase(response.adjustmentCase);
      void refreshQueue();
    } catch {
      setCaseError('Không tạo được draft local. Kiểm tra lại kỳ nguồn LOCKED và người tạo.');
    } finally {
      setCaseLoading(false);
    }
  }, [refreshQueue, requesterStaffId]);

  const decideLocalCase = useCallback(
    async (decision: 'APPROVE' | 'REJECT') => {
      if (approverStaffId === null) return;
      setCaseLoading(true);
      setCaseError(null);
      try {
        const response = await apiClient.safeDevPayrollAdjustmentLab.decideCase({
          approverStaffId,
          decision,
          reason: decision === 'REJECT' ? 'Local-only rehearsal rejection.' : undefined,
        });
        setLocalCase(response.adjustmentCase);
        void refreshQueue();
      } catch {
        setCaseError('Quyết định local bị chặn: người duyệt phải khác người tạo và thuộc nhóm duyệt.');
      } finally {
        setCaseLoading(false);
      }
    },
    [approverStaffId, refreshQueue]
  );

  const runBlockedScenario = useCallback(async () => {
    const sourceStatusForScenario: PeriodStatus = blockedScenario === 'SOURCE_REVIEWING' ? 'REVIEWING' : 'LOCKED';
    const targetStatusForScenario: PeriodStatus = blockedScenario === 'TARGET_REVIEWING' ? 'REVIEWING' : 'OPEN';
    const eligibilityForScenario: Eligibility =
      blockedScenario === 'PENDING_LOG_APPROVAL' ? 'PENDING_LOG_APPROVAL' : 'READY';
    const beforeSettlement = {
      mode: 'SHADOW_READ_ONLY' as const,
      sourcePeriodKey: '2026-08',
      calculationVersion: 'fal-transactional.v1',
      subjectKey: 'synthetic:cc:002',
      lineCount: 1,
      grossAmount: 2_990,
      capAmount: null,
      receivedAmount: 2_990,
      holdAmount: 0,
    };

    setBlockedLoading(true);
    try {
      const response = await apiClient.safeDevPayrollAdjustmentLab.calculateShadow({
        input: {
          eventKey: `local-lab:fal-adjustment:blocked:${blockedScenario.toLowerCase()}`,
          falRule: 'Log',
          financialEligibility: eligibilityForScenario,
          sourcePeriod: {
            periodKey: '2026-08',
            status: sourceStatusForScenario,
            calculationVersion: 'fal-transactional.v1',
          },
          targetPeriod: { periodKey: '2026-09', status: targetStatusForScenario },
          beforeSettlement,
          afterSettlement: { ...beforeSettlement, grossAmount: 2_925, receivedAmount: 2_925 },
        },
      });
      setBlockedResult(response.result);
    } finally {
      setBlockedLoading(false);
    }
  }, [blockedScenario]);

  const createEligibleLocalDraft = useCallback(async () => {
    if (requesterStaffId === null) return;
    setCaseLoading(true);
    setCaseError(null);
    try {
      const response = await apiClient.safeDevPayrollAdjustmentLab.createEligibleDraft({ requesterStaffId });
      setEligibleCase(response.adjustmentCase);
      void refreshQueue();
    } catch {
      setCaseError(
        'Không tạo được draft thứ hai. Chỉ event mới, nguồn LOCKED, kỳ nhận OPEN và điều kiện READY mới được đi tiếp.'
      );
    } finally {
      setCaseLoading(false);
    }
  }, [refreshQueue, requesterStaffId]);

  const decideEligibleLocalCase = useCallback(
    async (decision: 'APPROVE' | 'REJECT') => {
      if (approverStaffId === null) return;
      setCaseLoading(true);
      setCaseError(null);
      try {
        const response = await apiClient.safeDevPayrollAdjustmentLab.decideEligibleCase({
          approverStaffId,
          decision,
          reason: decision === 'REJECT' ? 'Local-only rehearsal rejection.' : undefined,
        });
        setEligibleCase(response.adjustmentCase);
        void refreshQueue();
      } catch {
        setCaseError('Quyết định thứ hai bị chặn: người duyệt phải khác người tạo và thuộc nhóm duyệt.');
      } finally {
        setCaseLoading(false);
      }
    },
    [approverStaffId, refreshQueue]
  );

  const createHrCustomLocalDraft = useCallback(async () => {
    const amount = parseWholeDong(customAmount);
    if (requesterStaffId === null || amount === null || amount === 0) return;
    setCustomLoading(true);
    setCustomError(null);
    try {
      const response = await apiClient.safeDevPayrollAdjustmentLab.createHrCustomDraft({
        requesterStaffId,
        input: {
          amount,
          comment: customComment,
          targetPeriodKey: '2026-09',
          targetPeriodStatus: customTargetStatus,
        },
      });
      setHrCustomCase(response.adjustmentCase);
      void refreshQueue();
    } catch {
      setCustomError('Không tạo được HR Custom draft. Comment bắt buộc và kỳ nhận phải OPEN.');
    } finally {
      setCustomLoading(false);
    }
  }, [customAmount, customComment, customTargetStatus, refreshQueue, requesterStaffId]);

  const decideHrCustomLocalCase = useCallback(
    async (decision: 'APPROVE' | 'REJECT') => {
      if (approverStaffId === null) return;
      setCustomLoading(true);
      setCustomError(null);
      try {
        const response = await apiClient.safeDevPayrollAdjustmentLab.decideHrCustomCase({
          approverStaffId,
          decision,
          reason: decision === 'REJECT' ? 'Local-only HR Custom rehearsal rejection.' : undefined,
        });
        setHrCustomCase(response.adjustmentCase);
        void refreshQueue();
      } catch {
        setCustomError('Quyết định HR Custom bị chặn: người duyệt phải khác người tạo và thuộc nhóm duyệt.');
      } finally {
        setCustomLoading(false);
      }
    },
    [approverStaffId, refreshQueue]
  );

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-10">
      <section className="mx-auto max-w-5xl">
        <Space direction="vertical" size={18} className="w-full">
          <div>
            <Tag color="blue">LOCAL-ONLY</Tag>
            <Title level={1} className="mb-2 mt-3!">
              Payroll Adjustment Lab
            </Title>
            <Paragraph className="max-w-3xl text-base">
              Màn cùng kiểm thử case Adjustment. Dữ liệu là mô phỏng, calculator chạy từ backend local; không tạo case,
              không ghi database, không đổi payslip và không thể chi tiền.
            </Paragraph>
          </div>

          <Alert
            type="info"
            showIcon
            message="Quy tắc đang thử"
            description="Kỳ nguồn phải LOCKED; kỳ nhận phải OPEN; snapshot của cùng một người phải khớp; kết quả chỉ là delta của kỳ hiện tại để chờ duyệt."
          />

          <AdjustmentReviewQueue cases={queueCases} />

          <SettlementReviewCard
            review={settlementReview}
            locking={settlementLocking}
            canLock={approverStaffId !== null}
            onLock={() => void lockSettlementReview()}
          />

          <Card size="small" title="Nhóm duyệt Adjustment">
            {approverGroup ? (
              <Space direction="vertical" size={8} className="w-full">
                <Text strong>{approverGroup.name}</Text>
                <Space wrap>
                  {approverGroup.members.map((member) => (
                    <Tag color="purple" key={member.displayName}>
                      {member.displayName}
                    </Tag>
                  ))}
                </Space>
                <Text type="secondary">
                  Người tạo case không thể tự duyệt. Nhóm này chỉ duyệt hoặc từ chối; chưa có quyền post tiền.
                </Text>
              </Space>
            ) : (
              <Text type="secondary">Đang tải nhóm duyệt local…</Text>
            )}
          </Card>

          <Card size="small" title="Thử quyền duyệt local">
            {approverGroup && requesterStaffId !== null && approverStaffId !== null ? (
              <Space direction="vertical" size={12} className="w-full">
                <Text type="secondary">Đây là rehearsal quyền hạn: không tạo draft, audit hoặc payout.</Text>
                <div>
                  <Text strong>Người tạo draft mô phỏng</Text>
                  <Segmented<number>
                    className="mt-2 w-full"
                    options={approverGroup.members.map((member) => ({
                      label: member.displayName,
                      value: member.staffId,
                    }))}
                    value={requesterStaffId}
                    onChange={setRequesterStaffId}
                  />
                </div>
                <div>
                  <Text strong>Người duyệt thử</Text>
                  <Segmented<number>
                    className="mt-2 w-full"
                    options={[
                      ...approverGroup.members.map((member) => ({ label: member.displayName, value: member.staffId })),
                      { label: 'Người ngoài nhóm', value: 0 },
                    ]}
                    value={approverStaffId}
                    onChange={setApproverStaffId}
                  />
                </div>
                <Button type="default" loading={approvalLoading} onClick={() => void runApprovalCheck()}>
                  Kiểm tra quyền duyệt local
                </Button>
                {approvalResult ? (
                  <Alert
                    type={approvalResult.allowed ? 'success' : 'warning'}
                    showIcon
                    message={approvalResult.reason}
                  />
                ) : null}
              </Space>
            ) : (
              <Text type="secondary">Đang tải thành viên local…</Text>
            )}
          </Card>

          <Card size="small" title="Adjustment Case local · snapshot và audit">
            <Space direction="vertical" size={12} className="w-full">
              <Alert
                type="info"
                showIcon
                message="Case mẫu chỉ dùng snapshot synthetic đã LOCKED"
                description="Tạo draft sẽ ghi case, snapshot, line và audit vào database loopback. Nó không thể post tiền hoặc chạm payslip."
              />
              {localCase ? (
                <Space direction="vertical" size={8} className="w-full">
                  <div>
                    <Tag color={localCase.status === 'APPROVED' ? 'green' : 'gold'}>{localCase.status}</Tag>
                    <Text className="ml-2">
                      Người tạo: {localCase.requestedBy || '—'} · Người duyệt: {localCase.approvedBy || '—'}
                    </Text>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Statistic title="Trước" value={formatDong(localCase.beforeAmount)} />
                    <Statistic title="Sau" value={formatDong(localCase.afterAmount)} />
                    <Statistic title="Delta" value={formatDong(localCase.deltaAmount)} />
                  </div>
                  <Text type="secondary">
                    Audit: {localCase.audit.map((entry) => `${entry.action} · ${entry.actorName}`).join(' → ')}
                  </Text>
                  <Text type="secondary">Posting: {localCase.lines.map((line) => line.postingState).join(', ')}</Text>
                </Space>
              ) : (
                <Text type="secondary">Chưa có case local. Chọn người tạo draft ở thẻ trên rồi tạo case mẫu.</Text>
              )}
              {caseError ? <Alert type="error" showIcon message={caseError} /> : null}
              {!localCase ? (
                <Button type="primary" loading={caseLoading} onClick={() => void createLocalDraft()}>
                  Tạo draft local từ snapshot LOCKED
                </Button>
              ) : localCase.status === 'READY_FOR_APPROVAL' ? (
                <Space wrap>
                  <Button type="primary" loading={caseLoading} onClick={() => void decideLocalCase('APPROVE')}>
                    Duyệt case local
                  </Button>
                  <Button danger loading={caseLoading} onClick={() => void decideLocalCase('REJECT')}>
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
                  options={(Object.keys(blockedScenarioCopy) as BlockedScenario[]).map((value) => ({
                    label: blockedScenarioCopy[value].label,
                    value,
                  }))}
                  value={blockedScenario}
                  onChange={(value) => {
                    setBlockedScenario(value);
                    setBlockedResult(null);
                  }}
                />
              </div>
              <Text type="secondary">{blockedScenarioCopy[blockedScenario].detail}</Text>
              <Button type="default" loading={blockedLoading} onClick={() => void runBlockedScenario()}>
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
                  description={blockedScenarioCopy[blockedScenario].detail}
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
                <Space direction="vertical" size={8} className="w-full">
                  <div>
                    <Tag color={eligibleCase.status === 'APPROVED' ? 'green' : 'gold'}>{eligibleCase.status}</Tag>
                    <Text className="ml-2">
                      Người tạo: {eligibleCase.requestedBy || '—'} · Người duyệt: {eligibleCase.approvedBy || '—'}
                    </Text>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Statistic title="Trước" value={formatDong(eligibleCase.beforeAmount)} />
                    <Statistic title="Sau" value={formatDong(eligibleCase.afterAmount)} />
                    <Statistic title="Delta" value={formatDong(eligibleCase.deltaAmount)} />
                  </div>
                  <Text type="secondary">
                    Audit: {eligibleCase.audit.map((entry) => `${entry.action} · ${entry.actorName}`).join(' → ')}
                  </Text>
                  <Text type="secondary">
                    Posting: {eligibleCase.lines.map((line) => line.postingState).join(', ')}
                  </Text>
                </Space>
              ) : (
                <Text type="secondary">Chưa có case thứ hai. Nút bên dưới mới tạo một draft độc lập từ event mới.</Text>
              )}
              {!eligibleCase ? (
                <Button type="primary" loading={caseLoading} onClick={() => void createEligibleLocalDraft()}>
                  Tạo draft riêng từ event mới
                </Button>
              ) : eligibleCase.status === 'READY_FOR_APPROVAL' ? (
                <Space wrap>
                  <Button type="primary" loading={caseLoading} onClick={() => void decideEligibleLocalCase('APPROVE')}>
                    Duyệt case thứ hai
                  </Button>
                  <Button danger loading={caseLoading} onClick={() => void decideEligibleLocalCase('REJECT')}>
                    Từ chối case thứ hai
                  </Button>
                </Space>
              ) : null}
            </Space>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title={caseSnapshotLocked ? 'Snapshot case đã khóa' : 'Snapshot mô phỏng'} bordered>
              <Space direction="vertical" size={16} className="w-full">
                {caseSnapshotLocked ? (
                  <Alert
                    type="success"
                    showIcon
                    message="Đang hiển thị snapshot bất biến của case local"
                    description="Các số bên dưới được đồng bộ từ audit case. Muốn thử một giả định khác, cần tạo scenario local mới; không sửa chồng lên snapshot đã duyệt."
                  />
                ) : null}
                <div>
                  <Text strong>Kỳ nguồn</Text>
                  <Segmented<PeriodStatus>
                    className="mt-2 w-full"
                    options={[
                      { label: 'LOCKED', value: 'LOCKED' },
                      { label: 'REVIEWING', value: 'REVIEWING' },
                    ]}
                    value={sourceStatus}
                    onChange={setSourceStatus}
                    disabled={caseSnapshotLocked}
                  />
                </div>
                {sourceLocked ? (
                  <>
                    <label className="block">
                      <Text strong>Thực nhận trước khi sửa · VND</Text>
                      <Input
                        value={beforeAmount}
                        onChange={(event) => setBeforeAmount(formatAmountInput(event.target.value))}
                        inputMode="numeric"
                        disabled={caseSnapshotLocked}
                      />
                    </label>
                    <label className="block">
                      <Text strong>Thực nhận đúng sau khi sửa · VND</Text>
                      <Input
                        value={afterAmount}
                        onChange={(event) => setAfterAmount(formatAmountInput(event.target.value))}
                        inputMode="numeric"
                        disabled={caseSnapshotLocked}
                      />
                    </label>
                  </>
                ) : (
                  <Alert
                    type="warning"
                    showIcon
                    message="Kỳ nguồn đang REVIEWING"
                    description="Chưa có snapshot đã chốt, nên không có số Trước, Sau hay Delta để tạo Adjustment. Chỉ khi kỳ nguồn LOCKED, Lab mới hiển thị và so sánh các số này."
                  />
                )}
                <div>
                  <Text strong>Kỳ nhận</Text>
                  <Segmented<PeriodStatus>
                    className="mt-2 w-full"
                    options={[
                      { label: 'OPEN', value: 'OPEN' },
                      { label: 'REVIEWING', value: 'REVIEWING' },
                    ]}
                    value={targetStatus}
                    onChange={setTargetStatus}
                    disabled={!sourceLocked || caseSnapshotLocked}
                  />
                </div>
                <div>
                  <Text strong>Điều kiện FAL</Text>
                  <Segmented<Eligibility>
                    className="mt-2 w-full"
                    options={[
                      { label: 'READY', value: 'READY' },
                      { label: 'Log chờ duyệt', value: 'PENDING_LOG_APPROVAL' },
                    ]}
                    value={eligibility}
                    onChange={setEligibility}
                    disabled={!sourceLocked || caseSnapshotLocked}
                  />
                </div>
                <Button
                  type="primary"
                  size="large"
                  loading={loading}
                  disabled={!amountsAreValid || caseSnapshotLocked}
                  onClick={() => void runShadow()}
                >
                  {caseSnapshotLocked
                    ? 'Snapshot đã khóa theo Case'
                    : sourceLocked
                      ? 'Chạy calculator local'
                      : 'Xác nhận chốt an toàn'}
                </Button>
              </Space>
            </Card>

            <Card title="Kết quả chỉ-đọc" bordered>
              {error ? <Alert type="error" showIcon message={error} /> : null}
              {localCase ? (
                <Space direction="vertical" size={16} className="w-full">
                  <div>
                    <Tag color={localCase.status === 'APPROVED' ? 'green' : 'gold'}>{localCase.status}</Tag>
                    <Text className="ml-2">Kết quả đã audit của case local; posting vẫn là `NOT_POSTED`.</Text>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Statistic title="Trước" value={formatDong(localCase.beforeAmount)} />
                    <Statistic title="Sau" value={formatDong(localCase.afterAmount)} />
                    <Statistic
                      title="Delta kỳ hiện tại"
                      value={formatDong(localCase.deltaAmount)}
                      valueStyle={{ color: (localCase.deltaAmount || 0) < 0 ? '#cf1322' : '#389e0d' }}
                    />
                  </div>
                  <Divider className="my-1!" />
                  <Text type="secondary">Hiệu lực: Adjustment đã được duyệt trong local; chưa có payout.</Text>
                </Space>
              ) : result ? (
                <Space direction="vertical" size={16} className="w-full">
                  <div>
                    <Tag color={statusColor(result.status)}>{result.status}</Tag>
                    <Text className="ml-2">
                      {result.reason || 'Đủ điều kiện để một người khác duyệt — chưa có quyền post.'}
                    </Text>
                  </div>
                  {result.beforeNetAmount === null ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="Không có snapshot để tính"
                      description="Kỳ nguồn chưa LOCKED nên Lab không hiện Trước, Sau hay Delta và không thể tạo Adjustment."
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Statistic title="Trước" value={formatDong(result.beforeNetAmount)} />
                      <Statistic title="Sau" value={formatDong(result.afterNetAmount)} />
                      <Statistic
                        title="Delta kỳ hiện tại"
                        value={formatDong(result.netDelta)}
                        valueStyle={{ color: (result.netDelta || 0) < 0 ? '#cf1322' : '#389e0d' }}
                      />
                    </div>
                  )}
                  <Divider className="my-1!" />
                  <Text type="secondary">
                    Hiệu lực:{' '}
                    {result.effect === 'CURRENT_PAYROLL_ADJUSTMENT'
                      ? 'Adjustment ở kỳ hiện tại, chờ duyệt.'
                      : 'Không có payout.'}
                  </Text>
                </Space>
              ) : (
                <Text type="secondary">Chưa có kết quả.</Text>
              )}
            </Card>
          </div>

          <HrCustomAdjustmentCard
            amount={customAmount}
            comment={customComment}
            targetStatus={customTargetStatus}
            result={customResult}
            error={customError}
            loading={customLoading}
            adjustmentCase={hrCustomCase}
            onAmountChange={setCustomAmount}
            onCommentChange={setCustomComment}
            onTargetStatusChange={(value) => setCustomTargetStatus(value)}
            onValidate={() => void runCustomAdjustment()}
            onCreateDraft={() => void createHrCustomLocalDraft()}
            onDecision={(decision) => void decideHrCustomLocalCase(decision)}
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

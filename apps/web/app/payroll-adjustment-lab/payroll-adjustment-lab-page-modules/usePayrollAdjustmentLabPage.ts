'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  isAdminOrSuperAdminRole,
  isCvRole,
  type FalAdjustmentShadowResult,
  type PayrollAdjustmentLabApprovalCheckResponse,
  type PayrollAdjustmentLabApproverGroupResponse,
  type PayrollAdjustmentLabCase,
  type PayrollAdjustmentLabCaseResponse,
  type PayrollAdjustmentLabHrCustomResponse,
  type PayrollAdjustmentLabSettlementReviewResponse,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type {
  BlockedScenario,
  CaseDecision,
  CustomTargetStatus,
  Eligibility,
  PeriodStatus,
} from './payrollAdjustmentLabTypes';
import {
  buildBlockedScenarioInput,
  buildShadowSnapshotInput,
  formatAmountInput,
  parseWholeDong,
} from './payrollAdjustmentLabUtils';

export function usePayrollAdjustmentLabPage() {
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [safeDevEnabled, setSafeDevEnabled] = useState<boolean | null>(null);
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
  const [customTargetStatus, setCustomTargetStatus] = useState<CustomTargetStatus>('OPEN');
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

    const input = buildShadowSnapshotInput({ before, after, sourceStatus, targetStatus, eligibility });
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
    if (!authorized || safeDevEnabled !== true) return;
    void runShadow();
  }, [authorized, safeDevEnabled, runShadow]);

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
    if (!authorized || safeDevEnabled !== true) return;
    void apiClient.safeDevPayrollAdjustmentLab.approverGroup().then((response) => {
      setApproverGroup(response.group);
      setRequesterStaffId(response.group.members[0]?.staffId ?? null);
      setApproverStaffId(response.group.members[1]?.staffId ?? response.group.members[0]?.staffId ?? null);
    });
    void refreshLocalCase();
    void refreshEligibleCase();
    void refreshHrCustomCase();
    void refreshQueue();
    void apiClient.safeDevPayrollAdjustmentLab.settlementReview().then(setSettlementReview);
  }, [authorized, safeDevEnabled, refreshEligibleCase, refreshHrCustomCase, refreshLocalCase, refreshQueue]);

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
    async (decision: CaseDecision) => {
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
    setBlockedLoading(true);
    try {
      const input = buildBlockedScenarioInput(blockedScenario);
      const response = await apiClient.safeDevPayrollAdjustmentLab.calculateShadow({ input });
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
    async (decision: CaseDecision) => {
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
    async (decision: CaseDecision) => {
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let active = true;
    try {
      const token = window.localStorage.getItem('mos_token');
      const rawUser = window.localStorage.getItem('mos_user');
      if (!token || !rawUser) {
        window.location.replace('/login');
        return;
      }
      const parsed = JSON.parse(rawUser);
      if (isCvRole(parsed?.role)) {
        window.location.replace('/dashboard/cv');
        return;
      }
      if (!isAdminOrSuperAdminRole(parsed?.role)) {
        window.location.replace('/dashboard');
        return;
      }
      setAuthorized(true);
      void apiClient.health
        .get()
        .then((health) => {
          if (active) setSafeDevEnabled(health?.mode === 'safe-dev');
        })
        .catch(() => {
          if (active) setSafeDevEnabled(false);
        });
    } catch {
      window.location.replace('/login');
    }
    return () => {
      active = false;
    };
  }, []);

  return {
    authorized,
    safeDevEnabled,
    beforeAmount,
    setBeforeAmount,
    afterAmount,
    setAfterAmount,
    sourceStatus,
    setSourceStatus,
    targetStatus,
    setTargetStatus,
    eligibility,
    setEligibility,
    result,
    error,
    loading,
    amountsAreValid,
    sourceLocked,
    caseSnapshotLocked,
    runShadow,
    customAmount,
    setCustomAmount,
    customComment,
    setCustomComment,
    customTargetStatus,
    setCustomTargetStatus,
    customResult,
    customError,
    customLoading,
    hrCustomCase,
    runCustomAdjustment,
    createHrCustomLocalDraft,
    decideHrCustomLocalCase,
    approverGroup,
    requesterStaffId,
    setRequesterStaffId,
    approverStaffId,
    setApproverStaffId,
    approvalResult,
    approvalLoading,
    runApprovalCheck,
    localCase,
    eligibleCase,
    caseLoading,
    caseError,
    createLocalDraft,
    decideLocalCase,
    createEligibleLocalDraft,
    decideEligibleLocalCase,
    blockedScenario,
    setBlockedScenario,
    blockedResult,
    setBlockedResult,
    blockedLoading,
    runBlockedScenario,
    queueCases,
    settlementReview,
    settlementLocking,
    lockSettlementReview,
  };
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import type { BugPriority, BugReportDetail, BugReportStatus, TriageBugReportRequest } from '@mos-lab/shared';
import { parseDuplicateKey } from '../bug-report-presenters';
import type { useBugReports } from './useBugReports';

export type BugReportDetailOptions = Pick<
  ReturnType<typeof useBugReports>,
  | 'getDetail'
  | 'triage'
  | 'approveImplementation'
  | 'approveImplementationCommit'
  | 'requestImplementationChanges'
  | 'approveImplementationDeploy'
  | 'retryImplementation'
  | 'authorizeWorkerRecoveryRetry'
  | 'authorizeSchemaRecoveryRetry'
  | 'authorizeQualityGateRecoveryRetry'
  | 'authorizeBuildLockRecoveryRetry'
  | 'confirmClose'
> & { reportId: number | null; liveVersion?: string };

export function useBugReportDetail({
  reportId,
  liveVersion,
  getDetail,
  triage,
  approveImplementation,
  approveImplementationCommit,
  requestImplementationChanges,
  approveImplementationDeploy,
  retryImplementation,
  authorizeWorkerRecoveryRetry: authorizeWorkerRecoveryRetryAction,
  authorizeSchemaRecoveryRetry: authorizeSchemaRecoveryRetryAction,
  authorizeQualityGateRecoveryRetry: authorizeQualityGateRecoveryRetryAction,
  authorizeBuildLockRecoveryRetry: authorizeBuildLockRecoveryRetryAction,
  confirmClose,
}: BugReportDetailOptions) {
  const [messageApi, messageContext] = message.useMessage();
  const [detail, setDetail] = useState<BugReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<BugReportStatus>('NEW');
  const [priority, setPriority] = useState<BugPriority | null>(null);
  const [businessContext, setBusinessContext] = useState('');
  const [note, setNote] = useState('');
  const [duplicateKey, setDuplicateKey] = useState('');
  const reviewPending = useRef(false);
  const approvalPending = useRef(false);
  const [approvalReceived, setApprovalReceived] = useState(false);

  const hydrateForm = useCallback((report: BugReportDetail) => {
    setDetail(report);
    setStatus(report.status);
    setPriority(report.priority);
    setBusinessContext(report.businessContext || '');
    setNote(report.triageNote || '');
    setDuplicateKey(report.duplicateOfKey || '');
  }, []);

  const load = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    setLoadError(null);
    try {
      hydrateForm(await getDetail(reportId));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không thể tải chi tiết ticket.');
    } finally {
      setLoading(false);
    }
  }, [getDetail, hydrateForm, reportId]);

  useEffect(() => {
    if (reportId) void load();
    else setDetail(null);
  }, [load, reportId, liveVersion]);

  useEffect(() => {
    setApprovalReceived(false);
  }, [reportId]);

  const save = useCallback(
    async (override?: Partial<TriageBugReportRequest>) => {
      if (!detail) return;
      const nextStatus = override?.status ?? status;
      const duplicateOfId = nextStatus === 'DUPLICATE' ? parseDuplicateKey(duplicateKey) : undefined;
      if (nextStatus === 'DUPLICATE' && !duplicateOfId) {
        messageApi.error('Nhập ticket gốc theo dạng MOS-BUG-123 hoặc MOS-FEAT-123.');
        return;
      }
      setSaving(true);
      try {
        const updated = await triage(detail.id, {
          status: nextStatus,
          priority: override?.priority === undefined ? priority : override.priority,
          businessContext,
          note,
          duplicateOfId,
        });
        hydrateForm(updated);
        messageApi.success(
          nextStatus === 'APPROVED' && detail.status === 'NEW'
            ? detail.requestType === 'FEATURE'
              ? 'Đã duyệt yêu cầu vào hàng triển khai.'
              : 'Đã approve ticket cho Agent.'
            : 'Đã cập nhật ticket.'
        );
      } catch (error) {
        const responseMessage =
          error && typeof error === 'object' && 'response' in error
            ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
            : null;
        messageApi.error(responseMessage || (error instanceof Error ? error.message : 'Không thể cập nhật ticket.'));
      } finally {
        setSaving(false);
      }
    },
    [businessContext, detail, duplicateKey, hydrateForm, messageApi, note, priority, status, triage]
  );

  const confirmResolvedAndClose = useCallback(async () => {
    if (!detail) return;
    if (note.trim().length < 10) {
      messageApi.error('Ghi ít nhất 10 ký tự về bằng chứng hoặc lý do đóng ngoại lệ.');
      return;
    }
    setSaving(true);
    try {
      const updated = await confirmClose(detail.id, {
        businessContext,
        note: note.trim(),
      });
      hydrateForm(updated);
      messageApi.success('Đã xác nhận sửa đúng và đóng ticket.');
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(responseMessage || (error instanceof Error ? error.message : 'Không thể đóng ticket.'));
    } finally {
      setSaving(false);
    }
  }, [businessContext, confirmClose, detail, hydrateForm, messageApi, note]);

  const approveCodeExecution = useCallback(async () => {
    if (!detail || approvalPending.current || approvalReceived) return;
    approvalPending.current = true;
    setSaving(true);
    try {
      const outcome = await approveImplementation(detail.id);
      setApprovalReceived(true);
      if (outcome.implementationQueued) {
        setStatus('IN_PROGRESS');
        setDetail((current) => (current ? { ...current, status: 'IN_PROGRESS' } : current));
      }
      // The rich ticket refresh is non-blocking. The durable receipt above is
      // enough to stop the button spinner even if a later read is slow.
      void getDetail(outcome.reportId)
        .then(hydrateForm)
        .catch(() => undefined);
      messageApi.success(
        outcome.implementationQueued
          ? 'Đã tạo job code/test trong worktree riêng.'
          : outcome.planRequested
            ? 'Đã lưu duyệt; worker đang làm mới plan native trước khi chạy code.'
            : 'Đã lưu duyệt implementation.'
      );
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(responseMessage || (error instanceof Error ? error.message : 'Không thể duyệt implementation.'));
    } finally {
      approvalPending.current = false;
      setSaving(false);
    }
  }, [approvalReceived, approveImplementation, detail, getDetail, hydrateForm, messageApi]);

  const requestChanges = useCallback(
    async (reason: string): Promise<boolean> => {
      const candidate = detail?.implementation?.reviewCandidate;
      if (!detail || !candidate || reviewPending.current) return false;
      if (reason.trim().length < 10) {
        messageApi.error('Ghi rõ điều cần sửa, ít nhất 10 ký tự.');
        return false;
      }
      reviewPending.current = true;
      setSaving(true);
      try {
        hydrateForm(
          await requestImplementationChanges(detail.id, { ...candidate, acknowledged: true, reason: reason.trim() })
        );
        setApprovalReceived(false);
        messageApi.success('Đã yêu cầu sửa lại. Agent lập plan mới; code/test cần duyệt mới.');
        return true;
      } catch (error) {
        messageApi.error(error instanceof Error ? error.message : 'Không thể yêu cầu sửa lại. Hãy tải lại ticket.');
        return false;
      } finally {
        reviewPending.current = false;
        setSaving(false);
      }
    },
    [detail, hydrateForm, messageApi, requestImplementationChanges]
  );

  const retryCodeExecution = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const outcome = await retryImplementation(detail.id);
      if (outcome.implementationQueued) {
        setStatus('IN_PROGRESS');
        setDetail((current) => (current ? { ...current, status: 'IN_PROGRESS' } : current));
      }
      void getDetail(outcome.reportId)
        .then(hydrateForm)
        .catch(() => undefined);
      messageApi.success('Đã tạo đúng một retry liên kết trong worktree mới.');
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(responseMessage || (error instanceof Error ? error.message : 'Không thể retry implementation.'));
    } finally {
      setSaving(false);
    }
  }, [detail, getDetail, hydrateForm, messageApi, retryImplementation]);

  const authorizeWorkerRecoveryRetry = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const outcome = await authorizeWorkerRecoveryRetryAction(detail.id);
      if (outcome.implementationQueued) {
        setStatus('IN_PROGRESS');
        setDetail((current) => (current ? { ...current, status: 'IN_PROGRESS' } : current));
      }
      void getDetail(outcome.reportId)
        .then(hydrateForm)
        .catch(() => undefined);
      messageApi.success('Đã cấp một retry khôi phục Worker trong worktree mới.');
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(
        responseMessage || (error instanceof Error ? error.message : 'Không thể cấp retry khôi phục Worker.')
      );
    } finally {
      setSaving(false);
    }
  }, [authorizeWorkerRecoveryRetryAction, detail, getDetail, hydrateForm, messageApi]);

  const authorizeSchemaRecoveryRetry = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const outcome = await authorizeSchemaRecoveryRetryAction(detail.id);
      if (outcome.implementationQueued) {
        setStatus('IN_PROGRESS');
        setDetail((current) => (current ? { ...current, status: 'IN_PROGRESS' } : current));
      }
      void getDetail(outcome.reportId)
        .then(hydrateForm)
        .catch(() => undefined);
      messageApi.success('Đã cấp một retry sau khi sửa schema trong worktree mới.');
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(
        responseMessage || (error instanceof Error ? error.message : 'Không thể cấp retry sau khi sửa schema.')
      );
    } finally {
      setSaving(false);
    }
  }, [authorizeSchemaRecoveryRetryAction, detail, getDetail, hydrateForm, messageApi]);

  const authorizeQualityGateRecoveryRetry = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const outcome = await authorizeQualityGateRecoveryRetryAction(detail.id);
      if (outcome.implementationQueued) {
        setStatus('IN_PROGRESS');
        setDetail((current) => (current ? { ...current, status: 'IN_PROGRESS' } : current));
      }
      void getDetail(outcome.reportId)
        .then(hydrateForm)
        .catch(() => undefined);
      messageApi.success('Đã cấp retry sau khi sửa cổng kiểm thử trong worktree mới.');
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(
        responseMessage || (error instanceof Error ? error.message : 'Không thể cấp retry sau khi sửa cổng kiểm thử.')
      );
    } finally {
      setSaving(false);
    }
  }, [authorizeQualityGateRecoveryRetryAction, detail, getDetail, hydrateForm, messageApi]);

  const authorizeBuildLockRecoveryRetry = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await authorizeBuildLockRecoveryRetryAction(detail.id);
      messageApi.success('Đã tạo retry sau khi sửa lock build.');
      const refreshed = await getDetail(detail.id);
      hydrateForm(refreshed);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'Không thể tạo retry sau khi sửa lock build.');
    } finally {
      setSaving(false);
    }
  }, [authorizeBuildLockRecoveryRetryAction, detail, getDetail, hydrateForm, messageApi]);

  const approveCommit = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const outcome = await approveImplementationCommit(detail.id);
      if (!outcome.commitQueued) throw new Error('Checkpoint commit đã thay đổi. Vui lòng tải lại ticket.');
      void getDetail(outcome.reportId)
        .then(hydrateForm)
        .catch(() => undefined);
      messageApi.success('Đã duyệt commit. Worker Mac chỉ commit bản diff đã review, rồi dừng chờ deploy.');
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(responseMessage || (error instanceof Error ? error.message : 'Không thể duyệt commit.'));
    } finally {
      setSaving(false);
    }
  }, [approveImplementationCommit, detail, getDetail, hydrateForm, messageApi]);

  const approveDeploy = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const outcome = await approveImplementationDeploy(detail.id);
      if (!outcome.deploymentQueued) throw new Error('Checkpoint deploy đã thay đổi. Vui lòng tải lại ticket.');
      void getDetail(outcome.reportId)
        .then(hydrateForm)
        .catch(() => undefined);
      messageApi.success(
        'Đã duyệt deploy. Worker Mac sẽ merge, push, chạy pipeline production và tự xác minh release.'
      );
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(responseMessage || (error instanceof Error ? error.message : 'Không thể duyệt deploy.'));
    } finally {
      setSaving(false);
    }
  }, [approveImplementationDeploy, detail, getDetail, hydrateForm, messageApi]);

  return {
    messageContext,
    detail,
    loading,
    saving,
    approvalReceived,
    requestChanges,
    loadError,
    status,
    setStatus,
    priority,
    setPriority,
    businessContext,
    setBusinessContext,
    note,
    setNote,
    duplicateKey,
    setDuplicateKey,
    hydrateForm,
    load,
    save,
    confirmResolvedAndClose,
    approveCodeExecution,
    retryCodeExecution,
    authorizeWorkerRecoveryRetry,
    authorizeSchemaRecoveryRetry,
    authorizeQualityGateRecoveryRetry,
    authorizeBuildLockRecoveryRetry,
    approveCommit,
    approveDeploy,
  };
}

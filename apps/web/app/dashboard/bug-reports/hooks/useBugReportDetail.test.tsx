import { act, renderHook, waitFor } from '@testing-library/react';
import type { BugReportDetail } from '@mos-lab/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeDetail } from '../__tests__/detail-fixtures';
import { useBugReportDetail, type BugReportDetailOptions } from './useBugReportDetail';

const feedback = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('antd', async (importOriginal) => ({
  ...(await importOriginal<typeof import('antd')>()),
  message: { useMessage: () => [feedback, null] },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function makeActions(detail = makeDetail()) {
  const receipt = { reportId: detail.id, implementationQueued: true, planRequested: false };
  return {
    reportId: detail.id as number | null,
    getDetail: vi.fn<BugReportDetailOptions['getDetail']>().mockResolvedValue(detail),
    triage: vi.fn<BugReportDetailOptions['triage']>().mockResolvedValue(detail),
    requestPlanChanges: vi.fn<BugReportDetailOptions['requestPlanChanges']>().mockResolvedValue(detail),
    requestImplementationChanges: vi
      .fn<BugReportDetailOptions['requestImplementationChanges']>()
      .mockResolvedValue(detail),
    approveImplementation: vi.fn<BugReportDetailOptions['approveImplementation']>().mockResolvedValue(receipt),
    approveImplementationCommit: vi
      .fn<BugReportDetailOptions['approveImplementationCommit']>()
      .mockResolvedValue({ reportId: detail.id, commitQueued: true }),
    approveImplementationDeploy: vi
      .fn<BugReportDetailOptions['approveImplementationDeploy']>()
      .mockResolvedValue({ reportId: detail.id, deploymentQueued: true }),
    retryImplementation: vi.fn<BugReportDetailOptions['retryImplementation']>().mockResolvedValue(receipt),
    authorizeWorkerRecoveryRetry: vi
      .fn<BugReportDetailOptions['authorizeWorkerRecoveryRetry']>()
      .mockResolvedValue(receipt),
    authorizeSchemaRecoveryRetry: vi
      .fn<BugReportDetailOptions['authorizeSchemaRecoveryRetry']>()
      .mockResolvedValue(receipt),
    authorizeQualityGateRecoveryRetry: vi
      .fn<BugReportDetailOptions['authorizeQualityGateRecoveryRetry']>()
      .mockResolvedValue(receipt),
    authorizeBuildLockRecoveryRetry: vi
      .fn<BugReportDetailOptions['authorizeBuildLockRecoveryRetry']>()
      .mockResolvedValue(receipt),
    confirmClose: vi.fn<BugReportDetailOptions['confirmClose']>().mockResolvedValue(detail),
  } satisfies BugReportDetailOptions;
}

describe('useBugReportDetail preserved request contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('plan revision locks duplicate/competing clicks, hydrates success, and exposes server errors', async () => {
    const planReview = {
      planJobId: 'ae32a70f-8490-4247-aa4f-2f0e45bcdc40',
      sourceVersion: 'v1:s',
      planVersion: 'v1:p',
    };
    const detail = makeDetail({ status: 'APPROVED', planReview });
    const actions = makeActions(detail);
    const pending = deferred<BugReportDetail>();
    actions.requestPlanChanges.mockReturnValueOnce(pending.promise);
    const { result } = renderHook(useBugReportDetail, { initialProps: actions });
    await waitFor(() => expect(result.current.detail).toEqual(detail));
    let submitted!: Promise<boolean>;
    await act(async () => {
      submitted = result.current.revisePlan('Lý do cần sửa kế hoạch.', planReview);
      expect(await result.current.revisePlan('Lý do cần sửa kế hoạch.', planReview)).toBe(false);
      await result.current.approveCodeExecution();
    });
    expect(result.current.saving).toBe(true);
    expect(actions.requestPlanChanges).toHaveBeenCalledTimes(1);
    expect(actions.approveImplementation).not.toHaveBeenCalled();
    await act(async () => {
      pending.resolve(makeDetail({ planReview: null }));
      expect(await submitted).toBe(true);
    });
    expect(result.current.saving).toBe(false);
    expect(result.current.detail?.planReview).toBeNull();
    act(() => result.current.hydrateForm(detail));
    actions.requestPlanChanges.mockRejectedValueOnce(new Error('Plan đã thay đổi.'));
    await act(async () => {
      expect(await result.current.revisePlan('Lý do cần sửa kế hoạch.', planReview)).toBe(false);
    });
    expect(feedback.error).toHaveBeenCalledWith('Plan đã thay đổi.');
    expect(result.current.saving).toBe(false);
    expect(result.current.detail).toEqual(detail);
  });

  it('a dialog opened for an older plan cannot submit against a freshly hydrated plan', async () => {
    const planReview = { planJobId: 'old', sourceVersion: 'old', planVersion: 'old' };
    const actions = makeActions(makeDetail({ planReview }));
    const { result } = renderHook(useBugReportDetail, { initialProps: actions });
    await waitFor(() => expect(result.current.detail?.planReview).toEqual(planReview));
    act(() => result.current.hydrateForm(makeDetail({ planReview: { ...planReview, planJobId: 'new' } })));
    await act(async () => {
      expect(await result.current.revisePlan('Lý do cần sửa kế hoạch.', planReview)).toBe(false);
    });
    expect(actions.requestPlanChanges).not.toHaveBeenCalled();
    expect(feedback.error).toHaveBeenCalledWith(expect.stringContaining('Plan đã thay đổi'));
  });

  it('loads only a selected report, hydrates the form and clears detail when closed', async () => {
    const detail = makeDetail();
    const actions = makeActions(detail);
    const { result, rerender } = renderHook(useBugReportDetail, {
      initialProps: { ...actions, reportId: null as number | null },
    });
    expect(actions.getDetail).not.toHaveBeenCalled();
    rerender(actions);
    await waitFor(() => expect(result.current.detail).toEqual(detail));
    expect(result.current).toMatchObject({
      status: detail.status,
      priority: detail.priority,
      businessContext: detail.businessContext,
      note: detail.triageNote,
      duplicateKey: '',
      loading: false,
    });
    expect(actions.getDetail).toHaveBeenCalledExactlyOnceWith(detail.id);
    rerender({ ...actions, reportId: null });
    expect(result.current.detail).toBeNull();
  });

  it('exposes load errors and retries with the same report callback', async () => {
    const actions = makeActions();
    actions.getDetail.mockRejectedValueOnce(new Error('Chi tiết tạm lỗi.'));
    const { result } = renderHook(useBugReportDetail, { initialProps: actions });
    await waitFor(() => expect(result.current.loadError).toBe('Chi tiết tạm lỗi.'));
    expect(result.current.loading).toBe(false);
    const pending = deferred<BugReportDetail>();
    actions.getDetail.mockReturnValueOnce(pending.promise);
    act(() => {
      void result.current.load();
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.loadError).toBeNull();
    await act(async () => pending.resolve(makeDetail()));
    expect(result.current.detail?.id).toBe(actions.reportId);
    expect(result.current.loading).toBe(false);
  });

  it('validates duplicate keys and preserves the exact triage payload and hydration', async () => {
    const actions = makeActions();
    const { result } = renderHook(useBugReportDetail, { initialProps: actions });
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    act(() => {
      result.current.setStatus('DUPLICATE');
      result.current.setDuplicateKey('wrong');
    });
    await act(async () => {
      await result.current.save();
    });
    expect(actions.triage).not.toHaveBeenCalled();
    expect(feedback.error).toHaveBeenCalledWith('Nhập ticket gốc theo dạng MOS-BUG-123 hoặc MOS-FEAT-123.');
    act(() => {
      result.current.setDuplicateKey('MOS-FEAT-123');
      result.current.setBusinessContext('Nghiệp vụ hiện tại');
      result.current.setNote('  Giữ nguyên ghi chú  ');
      result.current.setPriority('P2');
    });
    const updated = makeDetail({
      status: 'DUPLICATE',
      priority: 'P0',
      duplicateOfId: 123,
      duplicateOfKey: 'MOS-FEAT-123',
    });
    actions.triage.mockResolvedValueOnce(updated);
    await act(async () => {
      await result.current.save({ priority: 'P0' });
    });
    expect(actions.triage).toHaveBeenCalledExactlyOnceWith(actions.reportId, {
      status: 'DUPLICATE',
      priority: 'P0',
      businessContext: 'Nghiệp vụ hiện tại',
      note: '  Giữ nguyên ghi chú  ',
      duplicateOfId: 123,
    });
    expect(result.current.detail).toEqual(updated);
    expect(result.current.saving).toBe(false);
  });

  it('requires close evidence and trims only the close note', async () => {
    const actions = makeActions();
    const { result } = renderHook(useBugReportDetail, { initialProps: actions });
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    act(() => result.current.setNote('short'));
    await act(async () => {
      await result.current.confirmResolvedAndClose();
    });
    expect(actions.confirmClose).not.toHaveBeenCalled();
    act(() => result.current.setNote('  Bằng chứng nghiệm thu đã đủ  '));
    await act(async () => {
      await result.current.confirmResolvedAndClose();
    });
    expect(actions.confirmClose).toHaveBeenCalledExactlyOnceWith(actions.reportId, {
      businessContext: makeDetail().businessContext,
      note: 'Bằng chứng nghiệm thu đã đủ',
    });
  });

  it.each([
    ['approveCodeExecution', 'approveImplementation'],
    ['retryCodeExecution', 'retryImplementation'],
    ['authorizeWorkerRecoveryRetry', 'authorizeWorkerRecoveryRetry'],
    ['authorizeSchemaRecoveryRetry', 'authorizeSchemaRecoveryRetry'],
    ['authorizeQualityGateRecoveryRetry', 'authorizeQualityGateRecoveryRetry'],
  ] as const)(
    '%s finishes from the durable receipt even while detail refresh remains pending',
    async (handler, action) => {
      const actions = makeActions(makeDetail({ status: 'APPROVED' }));
      const pending = deferred<BugReportDetail>();
      actions.getDetail.mockResolvedValueOnce(makeDetail({ status: 'APPROVED' })).mockReturnValueOnce(pending.promise);
      const { result } = renderHook(useBugReportDetail, { initialProps: actions });
      await waitFor(() => expect(result.current.detail).not.toBeNull());
      await act(async () => {
        await result.current[handler]();
      });
      expect(actions[action]).toHaveBeenCalledExactlyOnceWith(actions.reportId);
      expect(result.current.saving).toBe(false);
      expect(result.current.status).toBe('IN_PROGRESS');
      expect(actions.getDetail).toHaveBeenCalledTimes(2);
      await act(async () => pending.resolve(makeDetail({ status: 'IN_PROGRESS' })));
    }
  );

  it('does not invent an implementation queue while a new plan is requested', async () => {
    const actions = makeActions(makeDetail({ status: 'APPROVED' }));
    actions.approveImplementation.mockResolvedValueOnce({
      reportId: actions.reportId!,
      implementationQueued: false,
      planRequested: true,
    });
    const { result } = renderHook(useBugReportDetail, { initialProps: actions });
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    await act(async () => {
      await result.current.approveCodeExecution();
    });
    expect(result.current.status).toBe('APPROVED');
    expect(feedback.success).toHaveBeenCalledWith('Đã lưu duyệt; worker đang làm mới plan native trước khi chạy code.');
  });

  it.each([
    ['approveCommit', 'approveImplementationCommit', 'commitQueued'],
    ['approveDeploy', 'approveImplementationDeploy', 'deploymentQueued'],
  ] as const)('%s validates its receipt and does not wait for the background read', async (handler, action, queued) => {
    const actions = makeActions();
    const pending = deferred<BugReportDetail>();
    const { result } = renderHook(useBugReportDetail, { initialProps: actions });
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    if (queued === 'commitQueued')
      actions.approveImplementationCommit.mockResolvedValueOnce({ reportId: actions.reportId!, commitQueued: false });
    else
      actions.approveImplementationDeploy.mockResolvedValueOnce({
        reportId: actions.reportId!,
        deploymentQueued: false,
      });
    await act(async () => {
      await result.current[handler]();
    });
    expect(feedback.error).toHaveBeenCalledWith(expect.stringContaining('Checkpoint'));
    expect(result.current.saving).toBe(false);
    expect(actions.getDetail).toHaveBeenCalledTimes(1);
    actions.getDetail.mockReturnValueOnce(pending.promise);
    await act(async () => {
      await result.current[handler]();
    });
    expect(actions[action]).toHaveBeenCalledTimes(2);
    expect(result.current.saving).toBe(false);
    await act(async () => pending.resolve(makeDetail()));
  });

  it('keeps the existing awaited refresh for the separate build-lock recovery action', async () => {
    const actions = makeActions();
    const pending = deferred<BugReportDetail>();
    actions.getDetail.mockResolvedValueOnce(makeDetail()).mockReturnValueOnce(pending.promise);
    const { result } = renderHook(useBugReportDetail, { initialProps: actions });
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    let running!: Promise<void>;
    await act(async () => {
      running = result.current.authorizeBuildLockRecoveryRetry();
    });
    expect(result.current.saving).toBe(true);
    expect(actions.authorizeBuildLockRecoveryRetry).toHaveBeenCalledExactlyOnceWith(actions.reportId);
    await act(async () => {
      pending.resolve(makeDetail({ status: 'IN_PROGRESS' }));
      await running;
    });
    expect(result.current.saving).toBe(false);
    expect(result.current.status).toBe('IN_PROGRESS');
  });

  it('keeps server errors visible and releases the saving state', async () => {
    const actions = makeActions();
    actions.triage.mockRejectedValueOnce({ response: { data: { message: 'Không có quyền thay đổi ticket.' } } });
    const { result } = renderHook(useBugReportDetail, { initialProps: actions });
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    await act(async () => {
      await result.current.save();
    });
    expect(feedback.error).toHaveBeenCalledWith('Không có quyền thay đổi ticket.');
    expect(result.current.saving).toBe(false);
    expect(result.current.detail?.status).toBe('NEW');
  });
});

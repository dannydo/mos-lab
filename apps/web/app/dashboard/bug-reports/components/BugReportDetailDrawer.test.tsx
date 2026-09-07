import type { ComponentProps } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BugReportDetailDrawer } from './BugReportDetailDrawer';
import { capturedAt, makeDetail, makeImplementation } from '../__tests__/detail-fixtures';
import styles from './BugReportDetailDrawer.module.css';

const feedback = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock('antd', async (importOriginal) => ({
  ...(await importOriginal<typeof import('antd')>()),
  message: { useMessage: () => [feedback, null] },
}));

type Props = ComponentProps<typeof BugReportDetailDrawer>;
function propsFor(detail = makeDetail(), canTriage = true) {
  const receipt = { reportId: detail.id, implementationQueued: true, planRequested: false };
  return {
    reportId: detail.id,
    canTriage,
    onClose: vi.fn(),
    getDetail: vi.fn<Props['getDetail']>().mockResolvedValue(detail),
    triage: vi.fn<Props['triage']>().mockResolvedValue(detail),
    requestPlanChanges: vi.fn<Props['requestPlanChanges']>().mockResolvedValue(
      makeDetail({
        status: 'APPROVED',
        planReview: null,
        clarification: { status: 'PENDING_AGENT', summary: null, clarifiedAt: null },
      })
    ),
    requestImplementationChanges: vi
      .fn<Props['requestImplementationChanges']>()
      .mockResolvedValue(
        makeDetail({ status: 'APPROVED', clarification: { status: 'PENDING_AGENT', summary: null, clarifiedAt: null } })
      ),
    approveImplementation: vi.fn<Props['approveImplementation']>().mockResolvedValue(receipt),
    approveImplementationCommit: vi
      .fn<Props['approveImplementationCommit']>()
      .mockResolvedValue({ reportId: detail.id, commitQueued: true }),
    approveImplementationDeploy: vi
      .fn<Props['approveImplementationDeploy']>()
      .mockResolvedValue({ reportId: detail.id, deploymentQueued: true }),
    retryImplementation: vi.fn<Props['retryImplementation']>().mockResolvedValue(receipt),
    authorizeWorkerRecoveryRetry: vi.fn<Props['authorizeWorkerRecoveryRetry']>().mockResolvedValue(receipt),
    authorizeSchemaRecoveryRetry: vi.fn<Props['authorizeSchemaRecoveryRetry']>().mockResolvedValue(receipt),
    authorizeQualityGateRecoveryRetry: vi.fn<Props['authorizeQualityGateRecoveryRetry']>().mockResolvedValue(receipt),
    authorizeBuildLockRecoveryRetry: vi.fn<Props['authorizeBuildLockRecoveryRetry']>().mockResolvedValue(receipt),
    confirmClose: vi.fn<Props['confirmClose']>().mockResolvedValue(detail),
    comment: vi.fn<Props['comment']>().mockResolvedValue({ report: detail, attachmentWarnings: [] }),
  } satisfies Props;
}

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
});

describe('BugReportDetailDrawer behavior', () => {
  it('shows all three plan gate actions, requires a reason, and refreshes without execution', async () => {
    const planReview = {
      planJobId: 'ae32a70f-8490-4247-aa4f-2f0e45bcdc40',
      sourceVersion: 'v1:s',
      planVersion: 'v1:p',
    };
    const props = propsFor(
      makeDetail({
        status: 'APPROVED',
        planReview,
        agentProgress: { stage: 'AWAITING_DANNY_IMPLEMENTATION_APPROVAL', note: null, updatedAt: capturedAt },
      })
    );
    render(<BugReportDetailDrawer {...props} />);
    const revise = (await screen.findByText('Yêu cầu sửa lại plan', { exact: true })).closest('button')!;
    expect(screen.getByText('Duyệt code/test', { exact: true }).closest('button')).toBeVisible();
    expect(screen.getByText('Đóng ngoại lệ', { exact: true }).closest('button')).toBeVisible();
    fireEvent.click(revise);
    const submit = screen.getByText('Gửi yêu cầu sửa plan', { exact: true }).closest('button')!;
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Lý do yêu cầu sửa plan'), {
      target: { value: 'Bổ sung tiêu chí nghiệm thu trong plan.' },
    });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() =>
      expect(props.requestPlanChanges).toHaveBeenCalledExactlyOnceWith(props.reportId, {
        ...planReview,
        acknowledged: true,
        reason: 'Bổ sung tiêu chí nghiệm thu trong plan.',
      })
    );
    await waitFor(() => expect(revise).not.toBeInTheDocument());
    expect(screen.queryByText('Duyệt code/test', { exact: true })).not.toBeInTheDocument();
    expect(props.approveImplementation).not.toHaveBeenCalled();
    expect(props.confirmClose).not.toHaveBeenCalled();
  });

  it.each([false, true])('hides plan revision without server eligibility (viewer=%s)', async (canTriage) => {
    const detail = makeDetail({ planReview: null });
    render(<BugReportDetailDrawer {...propsFor(detail, canTriage)} />);
    await screen.findByText(detail.description);
    expect(screen.queryByRole('button', { name: 'Yêu cầu sửa lại plan' })).not.toBeInTheDocument();
  });
  it('requires a reason for request changes and never approves code, commit or closes', async () => {
    const candidate = {
      jobId: 'ae32a70f-8490-4247-aa4f-2f0e45bcdc40',
      sourceVersion: 'v1:source',
      planVersion: 'v1:plan',
    };
    const detail = makeDetail({
      status: 'IN_PROGRESS',
      agentProgress: { stage: 'AWAITING_DANNY_COMMIT_REVIEW', note: null, updatedAt: capturedAt },
      implementation: makeImplementation({ status: 'AWAITING_COMMIT_REVIEW', reviewCandidate: candidate }),
    });
    const props = propsFor(detail);
    render(<BugReportDetailDrawer {...props} />);
    fireEvent.click(await screen.findByText('Yêu cầu sửa lại', { exact: true }));
    const submit = screen.getByText('Gửi yêu cầu sửa lại', { exact: true }).closest('button')!;
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Lý do yêu cầu sửa lại'), {
      target: { value: 'Cần bổ sung toàn bộ tiêu chí đã duyệt.' },
    });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(props.requestImplementationChanges).toHaveBeenCalledExactlyOnceWith(detail.id, {
        ...candidate,
        acknowledged: true,
        reason: 'Cần bổ sung toàn bộ tiêu chí đã duyệt.',
      })
    );
    expect(props.approveImplementation).not.toHaveBeenCalled();
    expect(props.approveImplementationCommit).not.toHaveBeenCalled();
    expect(props.confirmClose).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Duyệt commit', { exact: true })).not.toBeInTheDocument());
    expect(screen.queryByText('Duyệt code/test', { exact: true })).not.toBeInTheDocument();
  });

  it('does not offer duplicate code approval for an already queued implementation', async () => {
    const detail = makeDetail({ status: 'APPROVED', implementation: makeImplementation({ status: 'PENDING' }) });
    render(<BugReportDetailDrawer {...propsFor(detail)} />);
    await screen.findByText(detail.description);
    expect(screen.queryByRole('button', { name: 'Duyệt code/test' })).not.toBeInTheDocument();
  });

  it('surfaces an IDE-owned handoff with its durable reference and no execution lease', async () => {
    const detail = makeDetail({
      status: 'APPROVED',
      implementation: makeImplementation({
        status: 'PENDING',
        phase: 'IDE_HANDOFF_READY',
        ideHandoff: { reference: 'ide-handoff-job-30', phase: 'IDE_HANDOFF_READY' },
      }),
      nextAction: {
        actor: 'AGENT',
        type: 'IMPLEMENT',
        label: 'Chờ Codex IDE nhận handoff',
        detail: 'Handoff Codex IDE ide-handoff-job-30 đã sẵn sàng.',
        waitingSince: capturedAt,
      },
    });
    render(<BugReportDetailDrawer {...propsFor(detail)} />);
    expect(await screen.findByText('Handoff Codex IDE')).toBeVisible();
    expect(screen.getByText('ide-handoff-job-30')).toBeVisible();
    expect(screen.getByText(/Không cấp lease thực thi/)).toBeVisible();
  });

  it('keeps code approval hidden while the revised native plan is still being prepared', async () => {
    const detail = makeDetail({
      status: 'APPROVED',
      agentProgress: { stage: 'CHECKING_BUSINESS_LOGIC', note: 'Đang lập plan mới', updatedAt: capturedAt },
    });
    render(<BugReportDetailDrawer {...propsFor(detail)} />);
    await screen.findByText(detail.description);
    expect(screen.queryByText('Duyệt code/test', { exact: true })).not.toBeInTheDocument();
  });
  it('keeps read-only viewers out of every mutation and preserves detail/context/audit display', async () => {
    const detail = makeDetail({
      audits: [
        { id: 1, action: 'CREATED', actor: null, note: 'Audit đầu', before: null, after: null, createdAt: capturedAt },
        {
          id: 2,
          action: 'AGENT_PLAN_POSTED',
          actor: null,
          note: 'Audit sau',
          before: null,
          after: null,
          createdAt: capturedAt,
        },
      ],
    });
    const props = propsFor(detail, false);
    render(<BugReportDetailDrawer {...props} />);
    await screen.findByText(detail.description);
    expect(screen.getByText('Xem plan hiện tại.')).toBeVisible();
    expect(screen.getByText('Context tự động')).toBeVisible();
    expect(screen.getByText('/dashboard/bk')).toBeVisible();
    expect(screen.getByText('Không ghi nhận API lỗi gần đây.')).toBeVisible();
    expect(screen.getByText('Không ghi nhận JavaScript error gần đây.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu triage' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gửi bình luận' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Audit sau').compareDocumentPosition(screen.getByText('Audit đầu')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0);
    expect(props.triage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it.each([
    { requestType: 'BUG' as const, ready: false, businessContext: '', enabled: false },
    { requestType: 'BUG' as const, ready: false, businessContext: 'Nghiệp vụ đúng đã rõ', enabled: true },
    { requestType: 'FEATURE' as const, ready: false, businessContext: 'Nghiệp vụ đúng đã rõ', enabled: false },
    { requestType: 'FEATURE' as const, ready: true, businessContext: '', enabled: true },
  ])(
    'preserves $requestType approval clarity gate (ready=$ready, context=$businessContext)',
    async ({ requestType, ready, businessContext, enabled }) => {
      const detail = makeDetail({
        requestType,
        businessContext,
        clarification: { status: ready ? 'READY' : 'PENDING_AGENT', summary: null, clarifiedAt: null },
      });
      render(<BugReportDetailDrawer {...propsFor(detail)} />);
      const button = await screen.findByRole('button', {
        name: requestType === 'FEATURE' ? 'Duyệt triển khai' : 'Approve',
      });
      if (enabled) expect(button).toBeEnabled();
      else expect(button).toBeDisabled();
    }
  );

  it('requires the code/test confirmation before invoking the existing approval callback', async () => {
    const props = propsFor(
      makeDetail({
        status: 'APPROVED',
        agentProgress: {
          stage: 'AWAITING_DANNY_IMPLEMENTATION_APPROVAL',
          note: null,
          updatedAt: capturedAt,
        },
      })
    );
    render(<BugReportDetailDrawer {...props} />);
    const trigger = await screen.findByRole('button', { name: 'Duyệt code/test' });
    expect(props.approveImplementation).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    await screen.findByText('Duyệt AI chạy code/test?');
    expect(props.approveImplementation).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Duyệt code/test' }).at(-1)!);
    await waitFor(() => expect(props.approveImplementation).toHaveBeenCalledExactlyOnceWith(props.reportId));
  });

  it.each([
    ['AWAITING_DANNY_IMPLEMENTATION_APPROVAL', 'Duyệt code/test', 'approveImplementation'],
    ['AWAITING_DANNY_COMMIT_REVIEW', 'Duyệt commit', 'approveImplementationCommit'],
  ] as const)('keeps the %s popup root scoped and cancellation side-effect free', async (stage, label, action) => {
    const props = propsFor(
      makeDetail({
        status: stage === 'AWAITING_DANNY_IMPLEMENTATION_APPROVAL' ? 'APPROVED' : 'IN_PROGRESS',
        agentProgress: { stage, note: null, updatedAt: capturedAt },
      })
    );
    render(<BugReportDetailDrawer {...props} />);
    const trigger = await screen.findByRole('button', { name: label });
    fireEvent.click(trigger);
    const cancel = await screen.findByRole('button', { name: 'Chưa duyệt' });
    const popup = cancel.closest('.ant-popover');
    expect(popup).toHaveClass(styles.confirmationPopup);
    fireEvent.click(cancel);
    // Assert closed interaction state here; real-browser QA covers placement and animation completion.
    await waitFor(() => expect(trigger).not.toHaveClass('ant-popover-open'));
    expect(popup).toHaveStyle({ pointerEvents: 'none' });
    expect(props[action]).not.toHaveBeenCalled();
    expect(props.triage).not.toHaveBeenCalled();
  });

  const recoveryCases = [
    ['canAuthorizeBuildLockRecoveryRetry', 'authorizeBuildLockRecoveryRetry', 'Cho phép retry sau khi sửa lock build'],
    [
      'canAuthorizeQualityGateRecoveryRetry',
      'authorizeQualityGateRecoveryRetry',
      'Cho phép retry sau khi sửa cổng kiểm thử',
    ],
    ['canAuthorizeSchemaRecoveryRetry', 'authorizeSchemaRecoveryRetry', 'Cho phép retry sau khi sửa schema'],
    ['canAuthorizeWorkerRecoveryRetry', 'authorizeWorkerRecoveryRetry', 'Cho phép retry sau khi sửa Worker'],
    ['canRetryImplementation', 'retryImplementation', 'Tạo retry sạch'],
  ] as const;

  it.each(recoveryCases)(
    'preserves server recovery precedence for %s and requires confirmation',
    async (flag, action, label) => {
      const index = recoveryCases.findIndex((item) => item[0] === flag);
      const flags = Object.fromEntries(recoveryCases.map((item, current) => [item[0], current >= index]));
      const props = propsFor(
        makeDetail({
          status: 'IN_PROGRESS',
          agentProgress: { stage: 'IMPLEMENTATION_FAILED', note: null, updatedAt: capturedAt },
          implementation: makeImplementation(flags),
        })
      );
      render(<BugReportDetailDrawer {...props} />);
      const trigger = await screen.findByRole('button', { name: label });
      for (const item of recoveryCases) {
        if (item[0] !== flag) expect(screen.queryByRole('button', { name: item[2] })).not.toBeInTheDocument();
        expect(props[item[1]]).not.toHaveBeenCalled();
      }
      fireEvent.click(trigger);
      const confirmation = await screen.findByRole('button', {
        name: flag === 'canRetryImplementation' ? 'Tạo retry' : 'Cho phép retry',
      });
      expect(props[action]).not.toHaveBeenCalled();
      fireEvent.click(confirmation);
      await waitFor(() => expect(props[action]).toHaveBeenCalledExactlyOnceWith(props.reportId));
    }
  );

  it.each([
    ['AWAITING_DANNY_COMMIT_REVIEW', 'Duyệt commit', 'approveImplementationCommit'],
    ['AWAITING_DANNY_DEPLOY_APPROVAL', 'Duyệt deploy', 'approveImplementationDeploy'],
  ] as const)('preserves the %s checkpoint without automatic release', async (stage, label, action) => {
    const props = propsFor(
      makeDetail({ status: 'IN_PROGRESS', agentProgress: { stage, note: null, updatedAt: capturedAt } })
    );
    render(<BugReportDetailDrawer {...props} />);
    fireEvent.click(await screen.findByRole('button', { name: label }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: label })).toHaveLength(2));
    expect(props[action]).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: label }).at(-1)!);
    await waitFor(() => expect(props[action]).toHaveBeenCalledExactlyOnceWith(props.reportId));
  });

  it('keeps reporter acceptance out of the administrative close exception', async () => {
    render(
      <BugReportDetailDrawer
        {...propsFor(
          makeDetail({
            status: 'FIXED',
            agentProgress: { stage: 'AWAITING_REPORTER_ACCEPTANCE', note: null, updatedAt: capturedAt },
          })
        )}
      />
    );
    await screen.findByText(makeDetail().description);
    expect(screen.queryByRole('button', { name: 'Đóng ngoại lệ' })).not.toBeInTheDocument();
  });

  it('keeps detail retry UI and recovers from a read error', async () => {
    const props = propsFor();
    props.getDetail.mockRejectedValueOnce(new Error('Lỗi đọc tổng hợp.'));
    render(<BugReportDetailDrawer {...props} />);
    await screen.findByText('Lỗi đọc tổng hợp.');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByText(makeDetail().description);
    expect(props.getDetail).toHaveBeenCalledTimes(2);
  });

  it('renders client-error evidence through theme-aware typography without changing the stack text', async () => {
    const detail = makeDetail();
    detail.context.recentClientErrors = [
      { occurredAt: capturedAt, name: 'TypeError', message: 'Synthetic diagnostic', stack: 'Frame one\n  Frame two' },
    ];
    render(<BugReportDetailDrawer {...propsFor(detail, false)} />);
    const stack = await screen.findByText('Frame one Frame two');
    expect(stack.textContent).toBe('Frame one\n  Frame two');
    expect(stack).toHaveClass('ant-typography-secondary', 'font-mono', 'whitespace-pre-wrap');
    expect(screen.getByText(detail.description)).toHaveClass('![font-size:var(--text-base)]');
  });

  it('passes the conversation payload through and hydrates the returned report', async () => {
    const props = propsFor();
    props.comment.mockResolvedValueOnce({ report: makeDetail({ title: 'Đã nhận bình luận' }), attachmentWarnings: [] });
    render(<BugReportDetailDrawer {...props} />);
    const input = await screen.findByPlaceholderText('Bổ sung chi tiết hoặc bằng chứng; có thể dán ảnh trực tiếp…');
    fireEvent.change(input, { target: { value: '  Bằng chứng bổ sung  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }));
    await waitFor(() =>
      expect(props.comment).toHaveBeenCalledExactlyOnceWith(props.reportId, {
        body: 'Bằng chứng bổ sung',
        attachments: [],
      })
    );
    await screen.findByText('MOS-BUG-900001 · Đã nhận bình luận');
  });
});

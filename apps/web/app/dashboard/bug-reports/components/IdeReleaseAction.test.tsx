import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IdeReleaseAction } from './IdeReleaseAction';
import { apiClient } from '../../../../lib/api-client';
import { makeDetail } from '../__tests__/detail-fixtures';

vi.mock('../../../../lib/api-client', () => ({
  apiClient: { bugReports: { previewIdeRelease: vi.fn(), recordIdeRelease: vi.fn() } },
}));
const token = {
  jobId: 'test-job',
  manifestDigest: 'digest',
  commitSha: 'a'.repeat(40),
  apiRelease: 'b'.repeat(40),
  webRelease: null,
  approvalAuditIds: [1, 2, 3],
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.bugReports.previewIdeRelease).mockReset();
  vi.mocked(apiClient.bugReports.recordIdeRelease).mockReset();
});
afterEach(cleanup);

describe('IDE release action', () => {
  it('shows server rejection and cannot confirm without evidence', async () => {
    vi.mocked(apiClient.bugReports.previewIdeRelease).mockResolvedValue({
      eligible: false,
      code: 'MISSING',
      reason: 'Thiếu manifest bất biến',
      token: null,
    });
    render(<IdeReleaseAction reportId={29} disabled={false} onRecorded={vi.fn()} />);
    fireEvent.click(screen.getByText('Ghi nhận release IDE', { exact: true }));
    await screen.findByText('Thiếu manifest bất biến');
    expect(screen.getByText('Xác nhận bàn giao nghiệm thu').closest('button')).toBeDisabled();
    expect(apiClient.bugReports.recordIdeRelease).not.toHaveBeenCalled();
  });

  it('retains exact reviewed token, prevents duplicate click and hydrates authoritative success', async () => {
    vi.mocked(apiClient.bugReports.previewIdeRelease).mockResolvedValue({
      eligible: true,
      code: null,
      reason: 'Đủ bằng chứng',
      token,
    });
    let finish!: (value: Awaited<ReturnType<typeof apiClient.bugReports.recordIdeRelease>>) => void;
    vi.mocked(apiClient.bugReports.recordIdeRelease).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const onRecorded = vi.fn();
    const event = vi.fn();
    window.addEventListener('mos-bug-inbox-updated', event);
    render(<IdeReleaseAction reportId={29} disabled={false} onRecorded={onRecorded} />);
    fireEvent.click(screen.getByText('Ghi nhận release IDE', { exact: true }));
    await screen.findByText('Đủ bằng chứng');
    const confirm = screen.getByText('Xác nhận bàn giao nghiệm thu').closest('button')!;
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(apiClient.bugReports.recordIdeRelease).toHaveBeenCalledExactlyOnceWith(29, { acknowledged: true, token });
    expect(confirm).toBeDisabled();
    const detail = makeDetail({ status: 'FIXED' });
    finish({ success: true, data: detail });
    await waitFor(() => expect(onRecorded).toHaveBeenCalledExactlyOnceWith(detail));
    expect(event).toHaveBeenCalledTimes(1);
    window.removeEventListener('mos-bug-inbox-updated', event);
  });

  it('keeps errors visible and supports safe retry with the same token', async () => {
    vi.mocked(apiClient.bugReports.previewIdeRelease).mockResolvedValue({
      eligible: true,
      code: null,
      reason: 'Đủ bằng chứng',
      token,
    });
    vi.mocked(apiClient.bugReports.recordIdeRelease).mockRejectedValue({
      response: { data: { message: 'Bằng chứng đã đổi' } },
    });
    const onRecorded = vi.fn();
    render(<IdeReleaseAction reportId={29} disabled={false} onRecorded={onRecorded} />);
    fireEvent.click(screen.getByText('Ghi nhận release IDE', { exact: true }));
    await screen.findByText('Đủ bằng chứng');
    fireEvent.click(screen.getByText('Xác nhận bàn giao nghiệm thu'));
    await screen.findByText('Bằng chứng đã đổi');
    expect(onRecorded).not.toHaveBeenCalled();
    expect(screen.getByText('Kiểm tra lại bằng chứng').closest('button')).toBeEnabled();
  });
});

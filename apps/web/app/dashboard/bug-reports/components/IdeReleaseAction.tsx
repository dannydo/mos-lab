'use client';

import { Alert, Button, Descriptions, Typography } from 'antd';
import type { BugReportDetail } from '@mos-lab/shared';
import { AdaptiveModal, StatePanel } from '../../../../components/ui';
import { useIdeRelease } from '../hooks/useIdeRelease';

export function IdeReleaseAction({
  reportId,
  disabled,
  onRecorded,
}: {
  reportId: number;
  disabled: boolean;
  onRecorded: (detail: BugReportDetail) => void;
}) {
  const state = useIdeRelease(reportId, onRecorded);
  return (
    <>
      <Button disabled={disabled || state.pending} onClick={() => void state.inspect()}>
        Ghi nhận release IDE
      </Button>
      <AdaptiveModal
        title="Ghi nhận release IDE"
        open={state.open}
        onCancel={state.close}
        okText="Xác nhận bàn giao nghiệm thu"
        cancelText="Hủy"
        confirmLoading={state.pending}
        okButtonProps={{ disabled: state.loading || !state.preview?.eligible || state.pending }}
        onOk={() => void state.confirm()}
      >
        <Typography.Paragraph>
          Chỉ ghi nhận bản đã được duyệt và phát hành. Không chạy worker, commit, push, deploy hoặc nghiệm thu thay
          người báo.
        </Typography.Paragraph>
        {state.loading ? <StatePanel kind="loading" title="Server đang đối chiếu bằng chứng release" /> : null}
        {state.error ? <Alert type="error" showIcon message={state.error} role="alert" /> : null}
        {state.preview ? (
          <Alert
            type={state.preview.eligible ? 'success' : 'warning'}
            showIcon
            message={state.preview.reason}
            role="status"
          />
        ) : null}
        {state.preview?.token ? (
          <Descriptions
            column={1}
            size="small"
            styles={{ content: { overflowWrap: 'anywhere' } }}
            items={[
              { key: 'job', label: 'Job đã duyệt', children: state.preview.token.jobId },
              { key: 'commit', label: 'Commit', children: state.preview.token.commitSha },
              { key: 'release', label: 'Release API', children: state.preview.token.apiRelease },
              { key: 'manifest', label: 'Manifest', children: state.preview.token.manifestDigest },
            ]}
          />
        ) : null}
        <Button disabled={state.loading || state.pending} onClick={() => void state.inspect()}>
          Kiểm tra lại bằng chứng
        </Button>
      </AdaptiveModal>
    </>
  );
}

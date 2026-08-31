'use client';

import type { BugReportDetail } from '@mos-lab/shared';
import { Button, Descriptions, Timeline, Typography } from 'antd';
import { ExternalLink } from 'lucide-react';
import { AppIcon, SectionCard } from '../../../../components/ui';
import { durationBetween, formatDate, formatElapsed } from '../bug-report-presenters';

const { Text } = Typography;

export function BugReportResolutionTracking({ detail }: { detail: BugReportDetail }) {
  return (
    <>
      <SectionCard title="Tracking xử lý">
        <Timeline
          items={[
            {
              color: 'blue',
              children: (
                <Text>
                  <strong>Báo lỗi</strong> · {formatDate(detail.timeline.reportedAt)} ·{' '}
                  {formatElapsed(detail.timeline.reportedAt)}
                </Text>
              ),
            },
            {
              color: detail.timeline.approvedAt ? 'blue' : 'gray',
              children: (
                <Text>
                  <strong>Danny duyệt</strong> · {formatDate(detail.timeline.approvedAt)}
                  {durationBetween(detail.timeline.reportedAt, detail.timeline.approvedAt)
                    ? ` · sau ${durationBetween(detail.timeline.reportedAt, detail.timeline.approvedAt)}`
                    : ''}
                </Text>
              ),
            },
            {
              color: detail.timeline.startedAt ? 'blue' : 'gray',
              children: (
                <Text>
                  <strong>Bắt đầu xử lý</strong> · {formatDate(detail.timeline.startedAt)}
                </Text>
              ),
            },
            {
              color: detail.timeline.fixedAt ? 'green' : 'gray',
              children: (
                <Text>
                  <strong>Gửi người báo duyệt</strong> · {formatDate(detail.timeline.fixedAt)}
                  {durationBetween(detail.timeline.startedAt, detail.timeline.fixedAt)
                    ? ` · xử lý ${durationBetween(detail.timeline.startedAt, detail.timeline.fixedAt)}`
                    : ''}
                </Text>
              ),
            },
            {
              color: detail.timeline.closedAt ? 'green' : 'gray',
              children: (
                <Text>
                  <strong>Đóng ticket</strong> · {formatDate(detail.timeline.closedAt)}
                </Text>
              ),
            },
          ]}
        />
      </SectionCard>

      {detail.resolution ? (
        <SectionCard title="AI resolution · dùng lại cho case tương tự">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Tóm tắt vấn đề">{detail.resolution.problemSummary}</Descriptions.Item>
            <Descriptions.Item label="Nguyên nhân gốc">{detail.resolution.rootCause}</Descriptions.Item>
            <Descriptions.Item label="Cách sửa">{detail.resolution.solutionSummary}</Descriptions.Item>
            <Descriptions.Item label="Đã kiểm thử">{detail.resolution.verificationSummary}</Descriptions.Item>
            <Descriptions.Item label="Commit">
              <Text code copyable>
                {detail.resolution.commitSha || 'unknown'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Link bản sửa">
              {detail.resolution.releaseUrl ? (
                <Button
                  type="link"
                  href={detail.resolution.releaseUrl}
                  target="_blank"
                  icon={<AppIcon icon={ExternalLink} size="sm" />}
                >
                  Mở bản đã sửa
                </Button>
              ) : (
                'Chưa có'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Files">
              {detail.resolution.changedFiles.length
                ? detail.resolution.changedFiles.map((file) => (
                    <div key={file}>
                      <Text code>{file}</Text>
                    </div>
                  ))
                : 'Không ghi nhận'}
            </Descriptions.Item>
          </Descriptions>
        </SectionCard>
      ) : null}
    </>
  );
}

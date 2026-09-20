'use client';

import { Descriptions, List, Typography } from 'antd';
import type { BugReportDetail } from '@mos-lab/shared';
import { SectionCard } from '../../../../components/ui';
import { formatDate } from '../bug-report-presenters';

const { Text } = Typography;

export interface BugReportDiagnosticsSectionProps {
  context: NonNullable<BugReportDetail['context']>;
}

export function BugReportDiagnosticsSection({ context }: BugReportDiagnosticsSectionProps) {
  return (
    <>
      <SectionCard title="Context tự động">
        <Descriptions column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }} size="small" bordered>
          <Descriptions.Item label="Trang">{context.path}</Descriptions.Item>
          <Descriptions.Item label="Popup / drawer">{context.overlays.join(' → ') || 'Không có'}</Descriptions.Item>
          <Descriptions.Item label="Web commit">
            <Text code copyable>
              {context.webCommit || 'unknown'}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="API commit">
            <Text code copyable>
              {context.apiCommit || 'unknown'}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Theme">{context.themeMode}</Descriptions.Item>
          <Descriptions.Item label="Viewport">
            {context.viewport.width} × {context.viewport.height} · DPR {context.viewport.devicePixelRatio}
          </Descriptions.Item>
          <Descriptions.Item label="Mạng">{context.online ? 'Online' : 'Offline'}</Descriptions.Item>
          <Descriptions.Item label="Múi giờ">{context.timeZone}</Descriptions.Item>
          <Descriptions.Item label="Trình duyệt" span={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }}>
            {context.userAgent}
          </Descriptions.Item>
        </Descriptions>
      </SectionCard>

      <SectionCard title={`API lỗi gần nhất (${context.recentApiFailures.length})`}>
        {context.recentApiFailures.length === 0 ? (
          <Text type="secondary">Không ghi nhận API lỗi gần đây.</Text>
        ) : (
          <List
            size="small"
            dataSource={context.recentApiFailures}
            renderItem={(item) => (
              <List.Item>
                <div className="min-w-0">
                  <Text code>{item.method}</Text> <Text>{item.url}</Text>
                  <div>
                    <Text type="secondary">
                      {item.status ?? 'NETWORK'} · {item.message} · {formatDate(item.occurredAt)}
                    </Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </SectionCard>

      <SectionCard title={`JavaScript lỗi gần nhất (${context.recentClientErrors.length})`}>
        {context.recentClientErrors.length === 0 && !context.errorBoundary ? (
          <Text type="secondary">Không ghi nhận JavaScript error gần đây.</Text>
        ) : (
          <List
            size="small"
            dataSource={[...(context.errorBoundary ? [context.errorBoundary] : []), ...context.recentClientErrors]}
            renderItem={(item) => (
              <List.Item>
                <div className="min-w-0">
                  <Text strong>
                    {item.name}: {item.message}
                  </Text>
                  {item.stack && (
                    <Text
                      type="secondary"
                      className="mt-2 block max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs"
                    >
                      {item.stack}
                    </Text>
                  )}
                </div>
              </List.Item>
            )}
          />
        )}
      </SectionCard>
    </>
  );
}

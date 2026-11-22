'use client';

import React from 'react';
import { Alert, Card, Descriptions, Divider, Space, Steps, Typography } from 'antd';
import { AdaptiveDrawer, StatusTag } from '~/components/ui';
import { CompactConsultant, TraceStaff } from './FalIndicators';
import {
  compareLedgerByRole,
  formatMoney,
  getLedgerRoleStatus,
  getLedgerRoles,
  getOriginLedgerImpact,
  isSameStaffId,
  originRule,
  remediationRule,
  rotationLabel,
} from './falPageHelpers';
import type { FalCase, LedgerItem, TraceService } from './falPageTypes';

const { Text } = Typography;

function LedgerList({
  ledger,
  service,
  rule,
  isOrigin,
  remediationOrderServiceId,
}: {
  ledger: LedgerItem[];
  service: TraceService;
  rule: string;
  isOrigin: boolean;
  remediationOrderServiceId: number;
}) {
  if (!ledger.length) return <Text type="secondary">Chưa có bút toán trong staff_bonus.</Text>;
  return (
    <div className="space-y-2">
      {[...ledger]
        .sort((left, right) => compareLedgerByRole(left, right, service))
        .map((item) => {
          const roles = getLedgerRoles(item, service);
          const impact = isOrigin
            ? getOriginLedgerImpact(item, service, rule, remediationOrderServiceId)
            : 'Ledger ca xử lý';
          return (
            <div key={item.staffId} className="rounded-lg border border-slate-200 dark:border-slate-700/80 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Space size={6} wrap className="min-w-0">
                  <Text strong ellipsis>
                    {item.staffName}
                  </Text>
                  {roles.map((role) => (
                    <StatusTag key={role} status={getLedgerRoleStatus(role)} label={role} />
                  ))}
                </Space>
                <Space size={4} wrap className="ml-auto">
                  <StatusTag
                    status={item.bananaCredit === 0 ? 'default' : 'gold'}
                    label={<span className="tabular-nums">{item.bananaCredit.toLocaleString('vi-VN')} Chuối</span>}
                  />
                  <StatusTag
                    status={item.bonusPoints === 0 ? 'default' : 'processing'}
                    label={
                      <span className="tabular-nums">{`${item.bonusPoints.toLocaleString('vi-VN')}\u00A0điểm`}</span>
                    }
                  />
                  <StatusTag
                    status={item.cash === 0 ? 'default' : 'success'}
                    label={<span className="tabular-nums">{formatMoney(item.cash)}</span>}
                  />
                </Space>
              </div>
              <Text type="secondary" className="text-xs">
                {impact}
              </Text>
            </div>
          );
        })}
    </div>
  );
}

function TraceCaseCard({
  title,
  service,
  fallback,
  rule,
  isOrigin,
  remediationOrderServiceId,
}: {
  title: string;
  service: TraceService | null;
  fallback: string;
  rule: string;
  isOrigin: boolean;
  remediationOrderServiceId: number;
}) {
  if (!service) {
    return (
      <Card size="small" title={title}>
        <Text type="secondary">{fallback}</Text>
      </Card>
    );
  }
  return (
    <Card size="small" title={title}>
      <Descriptions
        size="small"
        column={1}
        items={[
          { key: 'id', label: 'Mã ca', children: <span className="tabular-nums">#{service.orderServiceId}</span> },
          { key: 'time', label: 'Thời gian', children: <span className="tabular-nums">{service.checkin || '-'}</span> },
          { key: 'service', label: 'Dịch vụ', children: service.serviceName || '-' },
          {
            key: 'bk',
            label: 'BK',
            children: <TraceStaff name={service.bookerName} avatar={service.bookerAvatar} />,
          },
          {
            key: 'cc',
            label: 'CC IN / OUT',
            children: (
              <CompactConsultant
                inName={service.ccInName}
                outName={service.ccOutName}
                inAvatar={
                  service.ccInAvatar || (isSameStaffId(service.ccInId, service.bookerId) ? service.bookerAvatar : null)
                }
                outAvatar={
                  service.ccOutAvatar ||
                  (isSameStaffId(service.ccOutId, service.bookerId) ? service.bookerAvatar : null)
                }
              />
            ),
          },
          {
            key: 'cv',
            label: 'CV',
            children: <TraceStaff name={service.cvName} avatar={service.cvAvatar} />,
          },
        ]}
      />
      <Divider className="!my-3" />
      <Text strong>Ledger đã chốt (`staff_bonus`)</Text>
      <div className="mt-2">
        <LedgerList
          ledger={service.ledger}
          service={service}
          rule={rule}
          isOrigin={isOrigin}
          remediationOrderServiceId={remediationOrderServiceId}
        />
      </div>
    </Card>
  );
}

interface FalTraceDrawerProps {
  open: boolean;
  width: number;
  isResizing: boolean;
  selected: FalCase | null;
  onClose: () => void;
  onStartResize: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function FalTraceDrawer({ open, width, isResizing, selected, onClose, onStartResize }: FalTraceDrawerProps) {
  return (
    <AdaptiveDrawer
      intent="detail"
      open={open}
      onClose={onClose}
      width={width}
      title={`Trace FAL #${selected?.orderServiceId || ''}`}
      classNames={{ body: 'p-0' }}
    >
      <div
        className={`relative h-full overflow-y-auto p-4 md:p-5 ${isResizing ? 'select-none cursor-col-resize' : ''}`}
      >
        <div
          role="separator"
          aria-label="Kéo để đổi độ rộng Trace FAL"
          aria-orientation="vertical"
          onMouseDown={onStartResize}
          className="absolute inset-y-0 left-0 z-10 hidden w-3 -translate-x-1/2 cursor-col-resize touch-none md:block"
        >
          <span className="absolute inset-y-8 left-1/2 w-px -translate-x-1/2 bg-slate-400/40 transition-colors hover:bg-amber-400" />
        </div>
        {selected ? (
          <div className="space-y-4">
            <Alert type="info" showIcon message={`${selected.falRule}: ${originRule(selected.falRule)}`} />
            <Card size="small" title="Liên kết FAL">
              <Steps
                size="small"
                current={2}
                items={[
                  {
                    title: 'Ca gốc',
                    description: selected.trace.origin
                      ? `#${selected.trace.origin.orderServiceId}`
                      : 'Chưa ghi nhận liên kết',
                  },
                  { title: selected.falRule, description: 'CC chọn trong Wings' },
                  { title: 'Ca xử lý', description: `#${selected.trace.remediation.orderServiceId}` },
                ]}
              />
            </Card>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
              <TraceCaseCard
                title="1. Ca gốc"
                service={selected.trace.origin}
                fallback="Wings chưa lưu liên kết ca gốc cho record này."
                rule={selected.falRule}
                isOrigin
                remediationOrderServiceId={selected.trace.remediation.orderServiceId}
              />
              <TraceCaseCard
                title="2. Ca đang xử lý"
                service={selected.trace.remediation}
                fallback="Không có dữ liệu ca xử lý."
                rule={selected.falRule}
                isOrigin={false}
                remediationOrderServiceId={selected.trace.remediation.orderServiceId}
              />
            </div>
            <Card size="small" title="3. Quyền lợi phải áp dụng">
              <div className="space-y-2">
                <Text>{originRule(selected.falRule)}</Text>
                <Divider className="!my-2" />
                <Text>{remediationRule(selected)}</Text>
              </div>
            </Card>
            <Card size="small" title="4. Tua CV vận hành">
              <Descriptions
                size="small"
                column={1}
                items={[
                  {
                    key: 'mode',
                    label: 'Phân loại',
                    children:
                      selected.fal?.rotationMode === 'HEAD'
                        ? 'Tua đầu (1–25 phút)'
                        : selected.fal?.rotationMode === 'FINAL'
                          ? 'Tua cuối (>25 phút)'
                          : 'Chưa đủ thời lượng',
                  },
                  { key: 'status', label: 'Trạng thái', children: rotationLabel(selected) },
                  {
                    key: 'completed',
                    label: 'Hoàn tất lúc',
                    children: (
                      <span className="tabular-nums">{selected.fal?.rotationPriority?.completedAt || '-'}</span>
                    ),
                  },
                ]}
              />
              <Text type="secondary" className="text-xs">
                Tua là quyền vận hành của CV, chạy độc lập với approval Log và ledger `staff_bonus`.
              </Text>
            </Card>
            <Alert
              type="warning"
              showIcon
              message="Cách đối soát"
              description="So sánh rule ở bước 3 với ledger ở hai ca. Nếu ledger khác rule, chưa có bút toán hoặc ca gốc không liên kết, quản lý cần mở issue trước khi chốt quyền lợi."
            />
          </div>
        ) : null}
      </div>
    </AdaptiveDrawer>
  );
}

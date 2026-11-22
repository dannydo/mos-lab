'use client';

import { Alert, Button, Card, Divider, Input, Segmented, Space, Typography } from 'antd';
import type { FalAdjustmentShadowResult, PayrollAdjustmentLabCase } from '@mos-lab/shared';
import { StatCard, StatusTag } from '~/components/ui';
import type { Eligibility, PeriodStatus } from './payrollAdjustmentLabTypes';
import {
  formatAmountInput,
  formatDong,
  getCaseStatusTagType,
  getShadowStatusTagType,
} from './payrollAdjustmentLabUtils';

const { Text } = Typography;

interface ShadowSimulationSectionProps {
  caseSnapshotLocked: boolean;
  sourceStatus: PeriodStatus;
  sourceLocked: boolean;
  beforeAmount: string;
  afterAmount: string;
  targetStatus: PeriodStatus;
  eligibility: Eligibility;
  amountsAreValid: boolean;
  loading: boolean;
  error: string | null;
  localCase: PayrollAdjustmentLabCase | null;
  result: FalAdjustmentShadowResult | null;
  onSourceStatusChange: (value: PeriodStatus) => void;
  onBeforeAmountChange: (value: string) => void;
  onAfterAmountChange: (value: string) => void;
  onTargetStatusChange: (value: PeriodStatus) => void;
  onEligibilityChange: (value: Eligibility) => void;
  onRunShadow: () => void;
}

function renderDeltaValue(amount: number | null | undefined) {
  const toneClass = (amount || 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
  return <span className={`tabular-nums ${toneClass}`}>{formatDong(amount)}</span>;
}

export function ShadowSimulationSection({
  caseSnapshotLocked,
  sourceStatus,
  sourceLocked,
  beforeAmount,
  afterAmount,
  targetStatus,
  eligibility,
  amountsAreValid,
  loading,
  error,
  localCase,
  result,
  onSourceStatusChange,
  onBeforeAmountChange,
  onAfterAmountChange,
  onTargetStatusChange,
  onEligibilityChange,
  onRunShadow,
}: ShadowSimulationSectionProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title={caseSnapshotLocked ? 'Snapshot case đã khóa' : 'Snapshot mô phỏng'} variant="outlined">
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
              onChange={onSourceStatusChange}
              disabled={caseSnapshotLocked}
            />
          </div>
          {sourceLocked ? (
            <>
              <label className="block">
                <Text strong>Thực nhận trước khi sửa · VND</Text>
                <Input
                  value={beforeAmount}
                  onChange={(event) => onBeforeAmountChange(formatAmountInput(event.target.value))}
                  inputMode="numeric"
                  disabled={caseSnapshotLocked}
                />
              </label>
              <label className="block">
                <Text strong>Thực nhận đúng sau khi sửa · VND</Text>
                <Input
                  value={afterAmount}
                  onChange={(event) => onAfterAmountChange(formatAmountInput(event.target.value))}
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
              onChange={onTargetStatusChange}
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
              onChange={onEligibilityChange}
              disabled={!sourceLocked || caseSnapshotLocked}
            />
          </div>
          <Button
            type="primary"
            size="large"
            loading={loading}
            disabled={!amountsAreValid || caseSnapshotLocked}
            onClick={onRunShadow}
          >
            {caseSnapshotLocked
              ? 'Snapshot đã khóa theo Case'
              : sourceLocked
                ? 'Chạy calculator local'
                : 'Xác nhận chốt an toàn'}
          </Button>
        </Space>
      </Card>

      <Card title="Kết quả chỉ-đọc" variant="outlined">
        {error ? <Alert type="error" showIcon message={error} /> : null}
        {localCase ? (
          <Space direction="vertical" size={16} className="w-full">
            <div className="flex flex-wrap items-center gap-2">
              <StatusTag status={getCaseStatusTagType(localCase.status)} label={localCase.status} />
              <Text>Kết quả đã audit của case local; posting vẫn là `NOT_POSTED`.</Text>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard title="Trước" value={formatDong(localCase.beforeAmount)} />
              <StatCard title="Sau" value={formatDong(localCase.afterAmount)} />
              <StatCard title="Delta kỳ hiện tại" value={renderDeltaValue(localCase.deltaAmount)} />
            </div>
            <Divider className="my-1!" />
            <Text type="secondary">Hiệu lực: Adjustment đã được duyệt trong local; chưa có payout.</Text>
          </Space>
        ) : result ? (
          <Space direction="vertical" size={16} className="w-full">
            <div className="flex flex-wrap items-center gap-2">
              <StatusTag status={getShadowStatusTagType(result.status)} label={result.status} />
              <Text>{result.reason || 'Đủ điều kiện để một người khác duyệt — chưa có quyền post.'}</Text>
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
                <StatCard title="Trước" value={formatDong(result.beforeNetAmount)} />
                <StatCard title="Sau" value={formatDong(result.afterNetAmount)} />
                <StatCard title="Delta kỳ hiện tại" value={renderDeltaValue(result.netDelta)} />
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
  );
}

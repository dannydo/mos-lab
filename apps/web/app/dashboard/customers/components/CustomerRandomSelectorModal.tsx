'use client';

import React from 'react';
import { Button, Checkbox, Input, Tag, theme } from 'antd';
import { AdaptiveModal } from '../../../../components/ui';

export interface CustomerRandomSelectorModalProps {
  open: boolean;
  loading: boolean;
  count: number | '';
  setCount: (value: number | '') => void;
  excludeAssigned: boolean;
  setExcludeAssigned: (value: boolean) => void;
  excludeUnconfirmedAllocation: boolean;
  setExcludeUnconfirmedAllocation: (value: boolean) => void;
  excludeFutureBooking: boolean;
  setExcludeFutureBooking: (value: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

/** Isolated UI for random customer selection; state and selection logic remain in the feature hook. */
export function CustomerRandomSelectorModal({
  open,
  loading,
  count,
  setCount,
  excludeAssigned,
  setExcludeAssigned,
  excludeUnconfirmedAllocation,
  setExcludeUnconfirmedAllocation,
  excludeFutureBooking,
  setExcludeFutureBooking,
  onCancel,
  onSubmit,
}: CustomerRandomSelectorModalProps) {
  const { token } = theme.useToken();

  return (
    <AdaptiveModal
      intent="confirm"
      className="customer-random-selector-overlay"
      title={<span style={{ color: token.colorText, fontSize: 18, fontWeight: 700 }}>Chọn ngẫu nhiên khách hàng</span>}
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={onSubmit}>
          Chọn
        </Button>,
      ]}
    >
      <div className="my-4 flex flex-col gap-4">
        <p className="m-0" style={{ color: token.colorTextDescription }}>
          Hệ thống sẽ chọn ngẫu nhiên khách hàng thỏa bộ lọc hiện tại.
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span style={{ color: token.colorText, fontWeight: 500 }}>Số lượng khách hàng:</span>
            <Input
              type="number"
              min={1}
              max={1000}
              placeholder="Nhập số..."
              value={count}
              onChange={(event) => {
                const value = event.target.value;
                if (value === '') {
                  setCount('');
                  return;
                }
                const parsed = Number.parseInt(value, 10);
                setCount(Number.isNaN(parsed) ? '' : parsed);
              }}
              style={{ width: 110 }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs" style={{ color: token.colorTextDescription }}>
              Chọn nhanh:
            </span>
            {[10, 20, 50, 100, 200].map((preset) => (
              <Tag.CheckableTag
                key={preset}
                checked={count === preset}
                onChange={() => setCount(preset)}
                style={{
                  border: `1px solid ${count === preset ? token.colorPrimary : token.colorBorder}`,
                  background: count === preset ? token.colorPrimary : 'transparent',
                  color: count === preset ? token.colorTextLightSolid : token.colorText,
                  fontWeight: count === preset ? 600 : 400,
                }}
              >
                {preset} KH
              </Tag.CheckableTag>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Checkbox checked={excludeAssigned} onChange={(event) => setExcludeAssigned(event.target.checked)}>
            Chỉ chọn khách hàng chưa được phân bổ Booker
          </Checkbox>
          <Checkbox
            checked={excludeUnconfirmedAllocation}
            onChange={(event) => setExcludeUnconfirmedAllocation(event.target.checked)}
          >
            Bỏ khách hàng đã phân bổ, chưa xác nhận
          </Checkbox>
          <Checkbox checked={excludeFutureBooking} onChange={(event) => setExcludeFutureBooking(event.target.checked)}>
            Bỏ khách hàng đã có lịch book tương lai
          </Checkbox>
        </div>
      </div>
    </AdaptiveModal>
  );
}

export default React.memo(CustomerRandomSelectorModal);

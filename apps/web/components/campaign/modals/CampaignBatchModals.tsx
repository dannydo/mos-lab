'use client';

import React from 'react';
import { Button, Checkbox, Divider, Input, Modal, Select, Tag, Typography, theme } from 'antd';

const { Text } = Typography;

export interface BatchAllocationModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  confirmLoading: boolean;
  selectedCount: number;
  targetBookerId?: number | null;
  onTargetBookerChange: (val: any) => void;
  bookerStaffList: Array<{ id: number; displayName: string }>;
}

export const BatchAllocationModal: React.FC<BatchAllocationModalProps> = ({
  open,
  onCancel,
  onOk,
  confirmLoading,
  selectedCount,
  targetBookerId,
  onTargetBookerChange,
  bookerStaffList,
}) => {
  return (
    <Modal
      title="Tạo đợt phân bổ Booker cho khách hàng chiến dịch"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
      okText="Xác nhận Phân bổ"
      cancelText="Hủy"
    >
      <div className="my-4">
        <Text className="block mb-2 font-semibold">Chọn Booker nhận {selectedCount} khách hàng đã chọn:</Text>
        <Select
          placeholder="Chọn Booker..."
          style={{ width: '100%' }}
          value={targetBookerId}
          onChange={(val) => onTargetBookerChange(val)}
          options={bookerStaffList.map((s) => ({ value: s.id, label: s.displayName }))}
        />
      </div>
    </Modal>
  );
};

export interface RandomSelectModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  loading: boolean;
  randomCount: number | '';
  onRandomCountChange: (count: number | '') => void;
  excludeAssigned: boolean;
  onExcludeAssignedChange: (checked: boolean) => void;
  excludeUnconfirmedAllocation: boolean;
  onExcludeUnconfirmedAllocationChange: (checked: boolean) => void;
  excludeFutureBooking: boolean;
  onExcludeFutureBookingChange: (checked: boolean) => void;
  themeMode: string;
}

export const RandomSelectModal: React.FC<RandomSelectModalProps> = ({
  open,
  onCancel,
  onSubmit,
  loading,
  randomCount,
  onRandomCountChange,
  excludeAssigned,
  onExcludeAssignedChange,
  excludeUnconfirmedAllocation,
  onExcludeUnconfirmedAllocationChange,
  excludeFutureBooking,
  onExcludeFutureBookingChange,
  themeMode,
}) => {
  const { token } = theme.useToken();

  return (
    <Modal
      title={<span style={{ color: '#D4A84B', fontSize: '18px', fontWeight: 'bold' }}>Chọn Ngẫu Nhiên Khách Hàng</span>}
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={onSubmit}
          style={{ backgroundColor: '#D4A84B', borderColor: '#D4A84B', color: '#000', fontWeight: 'bold' }}
        >
          Chọn
        </Button>,
      ]}
    >
      <div style={{ margin: '16px 0' }}>
        <p style={{ color: token.colorTextDescription, marginBottom: '16px', fontSize: '13px' }}>
          Hệ thống sẽ tự động tìm kiếm và chọn ngẫu nhiên các khách hàng thỏa mãn bộ lọc hiện tại của anh/chị.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: token.colorText, fontWeight: 500 }}>Số lượng khách hàng:</span>
              <Input
                type="number"
                min={1}
                max={1000}
                placeholder="Nhập số..."
                value={randomCount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    onRandomCountChange('');
                  } else {
                    const num = parseInt(val, 10);
                    onRandomCountChange(isNaN(num) ? '' : num);
                  }
                }}
                style={{ width: '110px', borderRadius: '6px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              <span style={{ fontSize: '12px', color: token.colorTextDescription }}>Preset chọn nhanh:</span>
              {[10, 20, 50, 100, 200].map((preset) => (
                <Tag.CheckableTag
                  key={preset}
                  checked={randomCount === preset}
                  onChange={() => onRandomCountChange(preset)}
                  style={{
                    borderRadius: '12px',
                    padding: '2px 10px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    border: `1px solid ${
                      randomCount === preset ? '#D4A84B' : themeMode === 'dark' ? '#434343' : '#d9d9d9'
                    }`,
                  }}
                >
                  {preset} KH
                </Tag.CheckableTag>
              ))}
            </div>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Checkbox checked={excludeAssigned} onChange={(e) => onExcludeAssignedChange(e.target.checked)}>
              Chỉ chọn khách hàng chưa được phân bổ Booker
            </Checkbox>
            <Checkbox
              checked={excludeUnconfirmedAllocation}
              onChange={(e) => onExcludeUnconfirmedAllocationChange(e.target.checked)}
            >
              Bỏ khách hàng đã phân bổ, chưa xác nhận
            </Checkbox>
            <Checkbox checked={excludeFutureBooking} onChange={(e) => onExcludeFutureBookingChange(e.target.checked)}>
              Bỏ khách hàng đã có lịch book tương lai
            </Checkbox>
          </div>
        </div>
      </div>
    </Modal>
  );
};

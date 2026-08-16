import React from 'react';
import { Input, Typography } from 'antd';
import { AdaptiveModal } from '../../../../../components/ui';

const { Text } = Typography;

interface SaveFilterModalProps {
  visible: boolean;
  onOk: () => void;
  onCancel: () => void;
  newFilterName: string;
  setNewFilterName: (val: string) => void;
}

export const SaveFilterModal: React.FC<SaveFilterModalProps> = ({
  visible,
  onOk,
  onCancel,
  newFilterName,
  setNewFilterName,
}) => {
  return (
    <AdaptiveModal
      intent="confirm"
      className="customer-save-filter-overlay"
      title={<span style={{ color: '#D4A84B', fontWeight: 'bold' }}>Lưu bộ lọc khách hàng</span>}
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText="Lưu lại"
      cancelText="Hủy"
      okButtonProps={{ style: { background: '#D4A84B', borderColor: '#D4A84B' } }}
    >
      <div style={{ marginTop: '16px' }}>
        <Text>Nhập tên gợi nhớ cho bộ lọc này (bộ lọc sẽ được lưu vào cơ sở dữ liệu để booker sử dụng):</Text>
        <Input
          style={{ marginTop: '12px' }}
          placeholder="VD: Combo Dead mới hết hạn dưới 30 ngày"
          value={newFilterName}
          onChange={(e) => setNewFilterName(e.target.value)}
        />
      </div>
    </AdaptiveModal>
  );
};
export default SaveFilterModal;

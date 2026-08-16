import React from 'react';
import { Modal, Alert, Table, Button, Tag, Typography } from 'antd';
import { WarningOutlined, UsergroupAddOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { ServiceLiveComboCheckResult } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';

const { Text, Title } = Typography;

interface ServiceDeactivateConfirmModalProps {
  open: boolean;
  loading?: boolean;
  serviceName?: string;
  data: ServiceLiveComboCheckResult | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ServiceDeactivateConfirmModal: React.FC<ServiceDeactivateConfirmModalProps> = ({
  open,
  loading = false,
  serviceName,
  data,
  onCancel,
  onConfirm,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  if (!data) return null;

  const columns = [
    {
      title: 'Tên Gói Combo',
      dataIndex: 'comboName',
      key: 'comboName',
      render: (val: string) => (
        <span className="font-semibold flex items-center gap-1.5" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
          <ThunderboltOutlined style={{ color: isDark ? '#fbbf24' : '#d97706' }} />
          {val}
        </span>
      ),
    },
    {
      title: 'Đơn Giá',
      dataIndex: 'packagePrice',
      key: 'packagePrice',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-mono font-semibold" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>
          {new Intl.NumberFormat('vi-VN').format(val)} đ
        </span>
      ),
    },
    {
      title: 'Khách Đang Giữ',
      dataIndex: 'ownerCount',
      key: 'ownerCount',
      align: 'center' as const,
      render: (val: number) => (
        <Tag color="orange" className="font-bold tabular-nums rounded-full px-2.5">
          {val} người
        </Tag>
      ),
    },
    {
      title: 'Lượt Nối Tồn',
      dataIndex: 'totalNormalBalance',
      key: 'totalNormalBalance',
      align: 'center' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
          {val} lượt
        </span>
      ),
    },
    {
      title: 'Lượt Dặm Tồn',
      dataIndex: 'totalRetainBalance',
      key: 'totalRetainBalance',
      align: 'center' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold" style={{ color: isDark ? '#22d3ee' : '#0891b2' }}>
          {val} lượt
        </span>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={720}
      centered
      destroyOnHidden
      className="catalog-deactivate-modal"
    >
      <div className="pt-2 pb-1">
        {/* Header Warning */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="p-3 rounded-2xl shrink-0 flex items-center justify-center"
            style={{
              background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbe6',
              border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : '#ffe58f'}`,
            }}
          >
            <WarningOutlined style={{ fontSize: 28, color: '#d97706' }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: isDark ? '#f8fafc' : '#0f172a' }} className="font-bold">
              Cảnh báo: Dịch vụ đang có Gói Combo Live còn hạn!
            </Title>
            <Text style={{ color: isDark ? '#94a3b8' : '#475569' }} className="text-sm">
              Dịch vụ <strong style={{ color: '#d97706' }}>{serviceName || `#${data.serviceId}`}</strong> hiện đang có
              khách hàng sở hữu các gói Combo Live còn hạn sử dụng.
            </Text>
          </div>
        </div>

        {/* Summary Badges */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div
            className="rounded-xl p-3 text-center transition-colors"
            style={{
              background: isDark ? 'rgba(120, 53, 15, 0.25)' : '#fffbe6',
              border: `1px solid ${isDark ? 'rgba(180, 83, 9, 0.4)' : '#ffe58f'}`,
            }}
          >
            <div
              className="text-xs font-medium flex items-center justify-center gap-1"
              style={{ color: isDark ? '#fbbf24' : '#b45309' }}
            >
              <UsergroupAddOutlined className="mr-1" />∑ Khách Đang Giữ
            </div>
            <div className="text-2xl font-bold tabular-nums mt-0.5" style={{ color: isDark ? '#f59e0b' : '#b45309' }}>
              {data.totalOwners} <span className="text-xs font-normal opacity-80">khách</span>
            </div>
          </div>

          <div
            className="rounded-xl p-3 text-center transition-colors"
            style={{
              background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
              border: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.5)' : '#e2e8f0'}`,
            }}
          >
            <div className="text-xs font-medium" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
              ∑ Lượt Nối Tồn
            </div>
            <div className="text-2xl font-bold tabular-nums mt-0.5" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>
              {data.totalNormalBalance} <span className="text-xs font-normal opacity-80">lượt</span>
            </div>
          </div>

          <div
            className="rounded-xl p-3 text-center transition-colors"
            style={{
              background: isDark ? 'rgba(8, 51, 68, 0.3)' : '#ecfeff',
              border: `1px solid ${isDark ? 'rgba(21, 94, 117, 0.5)' : '#a5f3fc'}`,
            }}
          >
            <div className="text-xs font-medium" style={{ color: isDark ? '#22d3ee' : '#0891b2' }}>
              ∑ Lượt Dặm Tồn
            </div>
            <div className="text-2xl font-bold tabular-nums mt-0.5" style={{ color: isDark ? '#06b6d4' : '#0e7490' }}>
              {data.totalRetainBalance} <span className="text-xs font-normal opacity-80">lượt</span>
            </div>
          </div>
        </div>

        {/* Affected Combos Table */}
        <div className="mb-4">
          <div
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
          >
            Danh sách các gói Combo bị ảnh hưởng ({data.affectedCombos.length} loại gói)
          </div>
          <Table
            dataSource={data.affectedCombos}
            columns={columns}
            rowKey={(r) => `${r.comboName}_${r.packagePrice}`}
            pagination={false}
            size="small"
            bordered
            className="rounded-xl overflow-hidden shadow-sm"
          />
        </div>

        {/* Notice Banner */}
        <Alert
          type="warning"
          showIcon
          className="rounded-xl mb-5 text-xs leading-relaxed"
          style={{
            background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbe6',
            border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : '#ffe58f'}`,
            color: isDark ? '#fcd34d' : '#78350f',
          }}
          message={
            <span style={{ color: isDark ? '#fcd34d' : '#78350f' }}>
              <strong>Lưu ý về quyền lợi số dư:</strong> Việc ngưng hoạt động sẽ ẩn Dịch vụ và các gói Combo tương ứng
              khỏi danh mục bán mới.{' '}
              <strong>Quyền lợi số dư lượt nối/dặm của các khách hàng đã mua vẫn được GIỮ NGUYÊN</strong> để khách hàng
              dùng hết lượt đến khi hết hạn.
            </span>
          }
        />

        {/* Footer Actions */}
        <div
          className="flex items-center justify-end gap-3 pt-3 border-t"
          style={{ borderColor: isDark ? '#334155' : '#f1f5f9' }}
        >
          <Button onClick={onCancel} disabled={loading} size="large" className="rounded-xl px-5">
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            danger
            loading={loading}
            onClick={onConfirm}
            size="large"
            className="rounded-xl px-5 font-semibold shadow-md shadow-red-500/20"
          >
            Xác nhận ngưng hoạt động
          </Button>
        </div>
      </div>
    </Modal>
  );
};

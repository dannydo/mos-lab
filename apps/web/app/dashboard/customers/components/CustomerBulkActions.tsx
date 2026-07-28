'use client';

import React, { useState } from 'react';
import { Space, Button, Typography, Popconfirm, Modal, Select, InputNumber, Radio } from 'antd';
import { TeamOutlined, DeleteOutlined, WarningOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { RevokeAssignmentModal } from './RevokeAssignmentModal';
import { RetainDataButton } from './RetainDataButton';
import { SafeAny, Staff } from '@mos-lab/shared';

const { Text } = Typography;

interface CustomerBulkActionsProps {
  themeMode: string;
  token: SafeAny;
  currentUser: SafeAny;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: (keys: React.Key[]) => void;
  setAssignModalVisible: (visible: boolean) => void;
  bulkDeleteLoading: boolean;
  handleBulkDeleteCustomers: () => Promise<void>;
  assignModalVisible: boolean;
  targetStaffId: number | undefined;
  setTargetStaffId: (id: number | undefined) => void;
  durationDays?: number;
  setDurationDays?: (days: number | undefined) => void;
  staffList: Staff[];
  assigning: boolean;
  unassigning: boolean;
  handleAssignCustomers: (sourceTypeOverride?: unknown, randomBatchId?: string | null) => Promise<void>;
  handleUnassignCustomers: () => Promise<void>;
  onRefresh?: () => void;
  randomBatchId?: string | null;
}

const DURATION_PRESETS = [
  { label: '1 ngày', value: 1 },
  { label: '3 ngày', value: 3 },
  { label: '5 ngày', value: 5 },
  { label: '7 ngày', value: 7 },
  { label: '14 ngày', value: 14 },
  { label: '30 ngày', value: 30 },
  { label: 'Không giới hạn', value: 0 },
];

const CustomerBulkActions = React.memo(function CustomerBulkActions({
  themeMode,
  token,
  currentUser,
  selectedRowKeys,
  setSelectedRowKeys,
  setAssignModalVisible,
  bulkDeleteLoading,
  handleBulkDeleteCustomers,
  assignModalVisible,
  targetStaffId,
  setTargetStaffId,
  durationDays = 7,
  setDurationDays,
  staffList,
  assigning,
  unassigning,
  handleAssignCustomers,
  handleUnassignCustomers,
  onRefresh,
  randomBatchId,
}: CustomerBulkActionsProps) {
  const [revokeModalVisible, setRevokeModalVisible] = useState(false);
  const [customDays, setCustomDays] = useState<number | undefined>(undefined);
  const [isCustomMode, setIsCustomMode] = useState(false);

  const selectedNumericIds = selectedRowKeys.map((k) => Number(k));

  if (selectedRowKeys.length === 0) {
    return null;
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          background: themeMode === 'dark' ? '#1f1f1f' : '#e6f7ff',
          border: `1px solid ${themeMode === 'dark' ? '#303030' : '#91d5ff'}`,
          borderRadius: '8px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Space>
          <Text strong style={{ color: token.colorText }}>
            Đã chọn <span style={{ color: '#D4A84B', fontSize: '16px' }}>{selectedRowKeys.length}</span> khách hàng
          </Text>
        </Space>
        <Space flex-wrap="wrap">
          <Button onClick={() => setSelectedRowKeys([])} style={{ borderRadius: '6px' }}>
            Hủy chọn
          </Button>
          <RetainDataButton
            mode="bulk"
            selectedRowKeys={selectedRowKeys}
            onSuccess={() => {
              setSelectedRowKeys([]);
              if (onRefresh) onRefresh();
            }}
          />
          <Button
            type="primary"
            icon={<TeamOutlined />}
            onClick={() => setAssignModalVisible(true)}
            style={{ background: '#D4A84B', borderColor: '#D4A84B', borderRadius: '6px', fontWeight: 600 }}
          >
            Phân bổ Booker
          </Button>

          {currentUser?.role === 'admin' && (
            <Button
              danger
              icon={<WarningOutlined />}
              onClick={() => setRevokeModalVisible(true)}
              style={{ borderRadius: '6px', fontWeight: 600 }}
            >
              Thu hồi data
            </Button>
          )}

          {currentUser?.role === 'admin' && (
            <Popconfirm
              title={`Anh/chị có chắc chắn muốn xóa ${selectedRowKeys.length} khách hàng đã chọn không?`}
              onConfirm={handleBulkDeleteCustomers}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
            >
              <Button
                danger
                type="primary"
                icon={<DeleteOutlined />}
                loading={bulkDeleteLoading}
                style={{ borderRadius: '6px', fontWeight: 600 }}
              >
                Xóa hàng loạt
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* ASSIGN BOOKER MODAL WITH EXPIRATION PRESETS */}
      <Modal
        title={<span style={{ color: '#D4A84B', fontWeight: 'bold' }}>Phân bổ khách hàng cho Booker</span>}
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={[
          <Button
            key="unassign"
            danger
            type="dashed"
            loading={unassigning}
            onClick={handleUnassignCustomers}
            style={{ float: 'left' }}
          >
            Hủy phân bổ (Gỡ Booker)
          </Button>,
          <Button key="cancel" onClick={() => setAssignModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={assigning}
            onClick={() => handleAssignCustomers(undefined, randomBatchId)}
            style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000' }}
          >
            Xác nhận phân bổ
          </Button>,
        ]}
      >
        <div style={{ marginTop: '12px' }}>
          <Text>
            Chọn Booker phụ trách cho{' '}
            <span style={{ fontWeight: 'bold', color: '#D4A84B' }}>{selectedRowKeys.length}</span> khách hàng đã chọn:
          </Text>

          <div style={{ marginTop: '16px' }}>
            <Text strong>Booker nhận data:</Text>
            <Select
              style={{ width: '100%', marginTop: '6px' }}
              placeholder="Chọn nhân viên Booker"
              value={targetStaffId}
              onChange={(val) => setTargetStaffId(val)}
              options={staffList
                .filter((s) => ['telesales', 'booker'].includes(s.role?.toLowerCase() || ''))
                .map((s) => ({ value: s.id, label: `${s.displayName} (${s.username})` }))}
            />
          </div>

          <div style={{ marginTop: '20px' }}>
            <Text strong>
              <ClockCircleOutlined style={{ marginRight: 6 }} />
              Thời hạn phân bổ data:
            </Text>
            <div style={{ marginTop: '8px' }}>
              <Radio.Group
                value={isCustomMode ? 'CUSTOM' : durationDays}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'CUSTOM') {
                    setIsCustomMode(true);
                  } else {
                    setIsCustomMode(false);
                    if (setDurationDays) setDurationDays(Number(val));
                  }
                }}
                buttonStyle="solid"
              >
                {DURATION_PRESETS.map((p) => (
                  <Radio.Button key={p.value} value={p.value}>
                    {p.label}
                  </Radio.Button>
                ))}
                <Radio.Button value="CUSTOM">Tùy chỉnh...</Radio.Button>
              </Radio.Group>

              {isCustomMode && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text>Nhập số ngày:</Text>
                  <InputNumber
                    min={1}
                    max={365}
                    value={customDays}
                    onChange={(val) => {
                      setCustomDays(val || undefined);
                      if (val && setDurationDays) setDurationDays(val);
                    }}
                    placeholder="Số ngày..."
                    style={{ width: 120 }}
                  />
                  <Text type="secondary">ngày</Text>
                </div>
              )}
            </div>
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                * Hết thời hạn, data tự động quay về Pool tổng nếu Booker không chọn giữ lại data.
              </Text>
            </div>
          </div>
        </div>
      </Modal>

      {/* REVOKE ASSIGNMENT MODAL */}
      <RevokeAssignmentModal
        visible={revokeModalVisible}
        onClose={() => setRevokeModalVisible(false)}
        onSuccess={() => {
          setSelectedRowKeys([]);
          if (onRefresh) onRefresh();
        }}
        customerIds={selectedNumericIds}
        staffList={staffList}
        parentBatchId={randomBatchId}
      />
    </>
  );
});

export default CustomerBulkActions;

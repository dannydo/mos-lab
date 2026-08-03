'use client';

import React, { useState } from 'react';
import { Space, Button, Typography, Popconfirm, Modal, Select, InputNumber, Radio } from 'antd';
import { TeamOutlined, DeleteOutlined, WarningOutlined, ClockCircleOutlined, RocketOutlined } from '@ant-design/icons';
import { RevokeAssignmentModal } from './RevokeAssignmentModal';
import { RetainDataButton } from './RetainDataButton';
import { AddToCampaignModal } from '../../../../components/campaign/AddToCampaignModal';
import { SafeAny, Staff } from '@mos-lab/shared';
import CampaignPlusIcon from '../../../../components/icons/CampaignPlusIcon';

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
  const [addToCampaignModalVisible, setAddToCampaignModalVisible] = useState(false);
  const [customDays, setCustomDays] = useState<number | undefined>(undefined);
  const [isCustomMode, setIsCustomMode] = useState(false);

  const selectedNumericIds = selectedRowKeys.map((k) => Number(k));

  const userRole = currentUser?.role ? String(currentUser.role).toLowerCase() : '';
  const isManagerOrAdmin = userRole === 'admin' || userRole === 'manager';

  if (selectedRowKeys.length === 0 || !isManagerOrAdmin) {
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

          <Button
            type="primary"
            icon={<CampaignPlusIcon fontSize={16} badgeBg="#047857" />}
            onClick={() => setAddToCampaignModalVisible(true)}
            style={{
              background: '#10b981',
              borderColor: '#10b981',
              borderRadius: '6px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Thêm vào chiến dịch
          </Button>

          {isManagerOrAdmin && (
            <Button
              danger
              icon={<WarningOutlined />}
              onClick={() => setRevokeModalVisible(true)}
              style={{ borderRadius: '6px', fontWeight: 600 }}
            >
              Thu hồi data
            </Button>
          )}

          {isManagerOrAdmin && (
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

      <AddToCampaignModal
        visible={addToCampaignModalVisible}
        onClose={() => setAddToCampaignModalVisible(false)}
        selectedCustomerIds={selectedNumericIds}
        onSuccess={() => {
          setSelectedRowKeys([]);
          if (onRefresh) onRefresh();
        }}
      />

      {/* MODAL PHÂN BỔ BOOKER */}
      <Modal
        title={`Phân bổ ${selectedRowKeys.length} khách hàng cho Booker`}
        open={assignModalVisible}
        onOk={() => handleAssignCustomers(undefined, randomBatchId)}
        onCancel={() => setAssignModalVisible(false)}
        confirmLoading={assigning}
        okText="Xác nhận Phân bổ"
        cancelText="Hủy"
        okButtonProps={{ disabled: !targetStaffId, style: { background: '#D4A84B', borderColor: '#D4A84B' } }}
      >
        <div style={{ margin: '16px 0' }}>
          <p style={{ marginBottom: '8px' }}>Chọn Booker nhận phân bổ:</p>
          <Select
            showSearch
            style={{ width: '100%', marginBottom: '16px' }}
            placeholder="Tìm và chọn Booker..."
            optionFilterProp="children"
            value={targetStaffId}
            onChange={(value) => setTargetStaffId(value)}
            filterOption={(input, option) =>
              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
            options={staffList.map((staff) => ({
              value: staff.id,
              label: `${staff.displayName || staff.username} (ID: ${staff.id})`,
            }))}
          />

          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #303030' }}>
            <p style={{ marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ClockCircleOutlined style={{ color: '#D4A84B' }} /> Thời hạn tự động thu hồi (Retention Days):
            </p>
            <Radio.Group
              value={isCustomMode ? 'custom' : durationDays}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'custom') {
                  setIsCustomMode(true);
                  if (setDurationDays && customDays !== undefined) setDurationDays(customDays);
                } else {
                  setIsCustomMode(false);
                  if (setDurationDays) setDurationDays(Number(val));
                }
              }}
              style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}
            >
              {DURATION_PRESETS.map((preset) => (
                <Radio.Button key={preset.value} value={preset.value}>
                  {preset.label}
                </Radio.Button>
              ))}
              <Radio.Button value="custom">Tùy chỉnh...</Radio.Button>
            </Radio.Group>

            {isCustomMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <span>Nhập số ngày:</span>
                <InputNumber
                  min={1}
                  max={365}
                  value={customDays}
                  onChange={(val) => {
                    setCustomDays(val ?? undefined);
                    if (setDurationDays && val !== null && val !== undefined) {
                      setDurationDays(val);
                    }
                  }}
                  placeholder="Ví dụ: 10"
                  style={{ width: '120px' }}
                />
                <span>ngày</span>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
});

export default CustomerBulkActions;

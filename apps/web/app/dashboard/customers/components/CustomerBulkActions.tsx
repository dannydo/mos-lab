'use client';

import React, { useState } from 'react';
import { Alert, Space, Button, Typography, Popconfirm, Select, Dropdown } from 'antd';
import { TeamOutlined, DeleteOutlined, WarningOutlined, RocketOutlined, MoreOutlined } from '@ant-design/icons';
import { RevokeAssignmentModal } from './RevokeAssignmentModal';
import { RetainDataButton } from './RetainDataButton';
import { AddToCampaignModal } from '../../../../components/campaign/AddToCampaignModal';
import { canManageCustomerAllocation, SafeAny, Staff, vietnameseSearchFilter } from '@mos-lab/shared';
import CampaignPlusIcon from '../../../../components/icons/CampaignPlusIcon';
import { AdaptiveModal, ResponsiveFormField, ResponsiveFormGrid } from '../../../../components/ui';
import { useResponsiveTier } from '../../../../hooks/useResponsiveTier';

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
  staffList: Staff[];
  assigning: boolean;
  unassigning: boolean;
  handleAssignCustomers: (sourceTypeOverride?: unknown, randomBatchId?: string | null) => Promise<void>;
  handleUnassignCustomers: () => Promise<void>;
  onRefresh?: () => void;
  randomBatchId?: string | null;
}

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
  const [mobileDeleteConfirmVisible, setMobileDeleteConfirmVisible] = useState(false);
  const responsiveTier = useResponsiveTier();
  const isMobile = responsiveTier === 'mobile';

  const selectedNumericIds = selectedRowKeys.map((k) => Number(k));

  const isManagerOrAdmin = canManageCustomerAllocation(currentUser?.role);

  if (selectedRowKeys.length === 0 || !isManagerOrAdmin) {
    return null;
  }

  return (
    <>
      <div
        className="customer-bulk-actions"
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
        {isMobile ? (
          <Space className="customer-bulk-actions-mobile" size={6}>
            <Button onClick={() => setSelectedRowKeys([])} style={{ borderRadius: '6px' }}>
              Hủy
            </Button>
            <RetainDataButton
              mode="bulk-compact"
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
              Phân bổ
            </Button>
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'campaign',
                    icon: <CampaignPlusIcon fontSize={16} badgeBg="#047857" />,
                    label: 'Thêm vào chiến dịch',
                    onClick: () => setAddToCampaignModalVisible(true),
                  },
                  {
                    key: 'revoke',
                    danger: true,
                    icon: <WarningOutlined />,
                    label: 'Thu hồi data',
                    onClick: () => setRevokeModalVisible(true),
                  },
                  { type: 'divider' },
                  {
                    key: 'delete',
                    danger: true,
                    icon: <DeleteOutlined />,
                    label: 'Xóa hàng loạt',
                    onClick: () => setMobileDeleteConfirmVisible(true),
                  },
                ],
              }}
            >
              <Button aria-label="Thao tác khác" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        ) : (
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
        )}
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

      <AdaptiveModal
        intent="confirm"
        open={mobileDeleteConfirmVisible}
        title="Xóa khách hàng đã chọn?"
        onCancel={() => setMobileDeleteConfirmVisible(false)}
        onOk={async () => {
          await handleBulkDeleteCustomers();
          setMobileDeleteConfirmVisible(false);
        }}
        okText="Xóa"
        cancelText="Hủy"
        confirmLoading={bulkDeleteLoading}
        okButtonProps={{ danger: true }}
      >
        Bạn sắp xóa {selectedRowKeys.length} khách hàng đã chọn. Khách hàng sẽ được chuyển vào thùng rác.
      </AdaptiveModal>

      {/* MODAL PHÂN BỔ BOOKER */}
      <AdaptiveModal
        intent="form"
        className="customer-allocation-overlay"
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
          <ResponsiveFormGrid columns={2}>
            <ResponsiveFormField fullWidth>
              <p style={{ marginBottom: '8px' }}>Chọn Booker nhận phân bổ:</p>
              <Select
                showSearch
                style={{ width: '100%' }}
                placeholder="Tìm và chọn Booker..."
                value={targetStaffId}
                onChange={(value) => setTargetStaffId(value)}
                filterOption={vietnameseSearchFilter}
                getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                options={staffList.map((staff) => ({
                  value: staff.id,
                  label: `${staff.displayName || staff.username} (ID: ${staff.id})`,
                }))}
              />
            </ResponsiveFormField>
          </ResponsiveFormGrid>

          <Alert
            className="mt-4"
            type="info"
            showIcon
            message="Assignment được giữ lâu dài"
            description="Sau khi Booker chấp nhận, data chỉ rời danh sách khi Quản lý chủ động thu hồi hoặc phân bổ lại."
          />
        </div>
      </AdaptiveModal>
    </>
  );
});

export default CustomerBulkActions;

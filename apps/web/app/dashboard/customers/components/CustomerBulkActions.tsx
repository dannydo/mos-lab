'use client';

import React from 'react';
import { Space, Button, Typography, Popconfirm, Modal, Select } from 'antd';
import { TeamOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface CustomerBulkActionsProps {
  themeMode: string;
  token: SafeAny;
  currentUser: SafeAny;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: (keys: React.Key[]) => void;
  setAssignModalVisible: (visible: boolean) => void;
  setRandomModalVisible: (visible: boolean) => void;
  setHistoryDrawerVisible: (visible: boolean) => void;
  bulkDeleteLoading: boolean;
  handleBulkDeleteCustomers: () => Promise<void>;
  assignModalVisible: boolean;
  targetStaffId: number | undefined;
  setTargetStaffId: (id: number | undefined) => void;
  staffList: SafeAny[];
  assigning: boolean;
  unassigning: boolean;
  handleAssignCustomers: () => Promise<void>;
  handleUnassignCustomers: () => Promise<void>;
}

const CustomerBulkActions = React.memo(function CustomerBulkActions({
  themeMode,
  token,
  currentUser,
  selectedRowKeys,
  setSelectedRowKeys,
  setAssignModalVisible,
  setRandomModalVisible,
  setHistoryDrawerVisible,
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
}: CustomerBulkActionsProps) {
  if (selectedRowKeys.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <Space>
          <Button icon={<TeamOutlined />} onClick={() => setRandomModalVisible(true)}>
            Chọn ngẫu nhiên Booker
          </Button>
          {currentUser?.role === 'admin' && (
            <Button
              icon={<HistoryOutlined />}
              onClick={() => setHistoryDrawerVisible(true)}
              style={{ borderColor: '#D4A84B', color: '#D4A84B' }}
            >
              Lịch sử phân bổ
            </Button>
          )}
        </Space>
      </div>
    );
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
        <Space>
          <Button onClick={() => setSelectedRowKeys([])} style={{ borderRadius: '6px' }}>
            Hủy chọn
          </Button>
          <Button
            type="primary"
            icon={<TeamOutlined />}
            onClick={() => setAssignModalVisible(true)}
            style={{ background: '#D4A84B', borderColor: '#D4A84B', borderRadius: '6px', fontWeight: 600 }}
          >
            Phân bổ Booker
          </Button>
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

      {/* ASSIGN BOOKER MODAL */}
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
            onClick={handleAssignCustomers}
            style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000' }}
          >
            Xác nhận phân bổ
          </Button>,
        ]}
      >
        <div style={{ marginTop: '16px' }}>
          <Text>
            Chọn Booker phụ trách cho{' '}
            <span style={{ fontWeight: 'bold', color: '#D4A84B' }}>{selectedRowKeys.length}</span> khách hàng đã chọn:
          </Text>
          <div style={{ marginTop: '16px' }}>
            <Select
              style={{ width: '100%' }}
              placeholder="Chọn nhân viên Booker"
              value={targetStaffId}
              onChange={(val) => setTargetStaffId(val)}
              options={staffList.map((s) => ({ value: s.id, label: `${s.displayName} (${s.username})` }))}
            />
          </div>
        </div>
      </Modal>
    </>
  );
});

export default CustomerBulkActions;

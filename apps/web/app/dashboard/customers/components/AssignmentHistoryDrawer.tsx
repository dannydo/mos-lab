'use client';

import React, { useState, useMemo } from 'react';
import {
  Drawer,
  Spin,
  Card,
  Tag,
  Tooltip,
  Button,
  Space,
  Table,
  Pagination,
  Input,
  Radio,
  Typography,
  Badge,
} from 'antd';
import {
  HistoryOutlined,
  FilterOutlined,
  UndoOutlined,
  UserOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  UpOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  CalendarOutlined,
  TeamOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons';
import { SafeAny } from '@mos-lab/shared';

const { Text, Title } = Typography;

interface AssignmentHistoryDrawerProps {
  themeMode: string;
  token: SafeAny;
  open: boolean;
  onClose: () => void;
  historyLoading: boolean;
  historyData: SafeAny[];
  historyTotal: number;
  historyPage: number;
  expandedBatchId: string | null;
  batchDetailsLoading: boolean;
  batchDetails: SafeAny[];
  undoingBatchId: string | null;
  revokingBatchId?: string | null;
  fetchAssignmentHistory: (page: number) => Promise<void>;
  fetchBatchDetails: (batchId: string) => Promise<void>;
  setExpandedBatchId: (batchId: string | null) => void;
  setBatchDetails: (details: SafeAny[]) => void;
  applyFilterFromJson: (jsonStr: string) => void;
  onOpenUndoModal: (batchId: string, customerCount: number) => void;
  onOpenRevokeBatchModal?: (batchId: string, customerCount: number) => void;
}

export const AssignmentHistoryDrawer: React.FC<AssignmentHistoryDrawerProps> = ({
  themeMode,
  token,
  open,
  onClose,
  historyLoading,
  historyData,
  historyTotal,
  historyPage,
  expandedBatchId,
  batchDetailsLoading,
  batchDetails,
  undoingBatchId,
  revokingBatchId,
  fetchAssignmentHistory,
  fetchBatchDetails,
  setExpandedBatchId,
  setBatchDetails,
  applyFilterFromJson,
  onOpenUndoModal,
  onOpenRevokeBatchModal,
}) => {
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter history items locally for fast UX feedback
  const filteredHistory = useMemo(() => {
    return historyData.filter((item) => {
      // Filter by action status
      if (filterAction === 'ASSIGN' && (item.isUndone || item.actionType !== 'ASSIGN')) return false;
      if (filterAction === 'REVOKE' && item.actionType !== 'REVOKE') return false;
      if (filterAction === 'TRANSFER' && item.actionType !== 'TRANSFER') return false;
      if (filterAction === 'UNDONE' && !item.isUndone) return false;

      // Filter by text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchStaff = (item.newStaffName || '').toLowerCase().includes(q) || (item.prevStaffName || '').toLowerCase().includes(q);
        const matchPerformer = (item.assignedBy || '').toLowerCase().includes(q);
        const matchFormula = (item.sourceFilterSummary || '').toLowerCase().includes(q);
        const matchReason = (item.reason || '').toLowerCase().includes(q);
        return matchStaff || matchPerformer || matchFormula || matchReason;
      }

      return true;
    });
  }, [historyData, filterAction, searchQuery]);

  const getActionBadge = (item: SafeAny) => {
    if (item.isUndone) {
      return { label: 'Đã hoàn tác', color: 'default', borderLeft: '#8c8c8c' };
    }
    switch (item.actionType) {
      case 'TRANSFER':
        return { label: 'Chuyển Booker', color: 'blue', borderLeft: '#1890ff' };
      case 'REVOKE':
        return { label: 'Thu hồi', color: 'volcano', borderLeft: '#ff4d4f' };
      case 'EXPIRE':
        return { label: 'Hết hạn', color: 'magenta', borderLeft: '#eb2f96' };
      case 'ASSIGN':
      default:
        return { label: 'Phân bổ', color: 'green', borderLeft: '#52c41a' };
    }
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.2)' : 'rgba(212, 168, 75, 0.1)',
                color: '#D4A84B',
              }}
            >
              <HistoryOutlined style={{ fontSize: '18px' }} />
            </span>
            <div>
              <div style={{ color: '#D4A84B', fontWeight: 700, fontSize: '16px', lineHeight: 1.2 }}>
                Lịch Sử Phân Bổ Data
              </div>
              <Text style={{ fontSize: '12px', color: token.colorTextDescription }}>
                Tổng cộng {historyTotal} đợt phân bổ & thu hồi
              </Text>
            </div>
          </div>

          <Tooltip title="Làm mới lịch sử">
            <Button
              type="text"
              icon={<ReloadOutlined spin={historyLoading} />}
              onClick={() => fetchAssignmentHistory(historyPage)}
            />
          </Tooltip>
        </div>
      }
      placement="right"
      onClose={() => {
        onClose();
        setExpandedBatchId(null);
        setBatchDetails([]);
      }}
      open={open}
      width={680}
      styles={{
        header: {
          borderBottom: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0'}`,
          padding: '16px 24px',
          background: themeMode === 'dark' ? '#1a1a1a' : '#fafafa',
        },
        body: {
          padding: '20px 24px',
          background: themeMode === 'dark' ? '#141414' : '#f5f7fa',
        },
      }}
    >
      {/* TOOLBAR FILTER & SEARCH */}
      <div
        style={{
          background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
          border: `1px solid ${themeMode === 'dark' ? '#303030' : '#e8e8e8'}`,
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            placeholder="Tìm theo tên Booker, người thực hiện, công thức, lý do..."
            prefix={<SearchOutlined style={{ color: token.colorTextDescription }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            size="middle"
            style={{ borderRadius: '6px' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Radio.Group
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              size="small"
              buttonStyle="solid"
            >
              <Radio.Button value="ALL">Tất cả</Radio.Button>
              <Radio.Button value="ASSIGN">🟢 Phân bổ</Radio.Button>
              <Radio.Button value="REVOKE">🔴 Thu hồi</Radio.Button>
              <Radio.Button value="TRANSFER">🔵 Chuyển</Radio.Button>
              <Radio.Button value="UNDONE">⚪ Đã hoàn tác</Radio.Button>
            </Radio.Group>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              Hiển thị: <strong>{filteredHistory.length}</strong> đợt
            </Text>
          </div>
        </div>
      </div>

      {/* HISTORY CARDS LIST */}
      <Spin spinning={historyLoading && historyData.length === 0}>
        {filteredHistory.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
              borderRadius: '10px',
              border: `1px dashed ${themeMode === 'dark' ? '#303030' : '#d9d9d9'}`,
              color: token.colorTextDescription,
            }}
          >
            <HistoryOutlined style={{ fontSize: '36px', color: '#ccc', marginBottom: '12px' }} />
            <div>Không tìm thấy dữ liệu phân bổ phù hợp.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredHistory.map((batch) => {
              const isExpanded = expandedBatchId === batch.batchId;
              const formattedDate = new Date(batch.assignedAt).toLocaleString('vi-VN');
              const formattedExpire = batch.expiresAt ? new Date(batch.expiresAt).toLocaleString('vi-VN') : null;
              const isUndone = batch.isUndone;
              const badge = getActionBadge(batch);

              // Check if expired
              const isExpired = batch.expiresAt && new Date(batch.expiresAt).getTime() < Date.now();

              return (
                <div
                  key={batch.batchId}
                  style={{
                    background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
                    border: `1px solid ${themeMode === 'dark' ? '#2d2d2d' : '#e6e8ec'}`,
                    borderLeft: `4px solid ${badge.borderLeft}`,
                    borderRadius: '10px',
                    padding: '14px 18px',
                    boxShadow: themeMode === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s ease-in-out',
                    opacity: isUndone ? 0.75 : 1,
                  }}
                >
                  {/* CARD HEADER */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: themeMode === 'dark' ? '#2a2a2a' : '#f0f2f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#D4A84B',
                          fontWeight: 'bold',
                        }}
                      >
                        <TeamOutlined style={{ fontSize: '15px' }} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px', color: token.colorText }}>
                            {batch.newStaffName
                              ? `Phân bổ cho ${batch.newStaffName}`
                              : batch.prevStaffName
                              ? `Thu hồi từ ${batch.prevStaffName}`
                              : 'Gỡ Booker'}
                          </span>

                          <Tag color={badge.color} style={{ borderRadius: '12px', padding: '1px 10px', fontWeight: 600 }}>
                            {badge.label}
                          </Tag>
                        </div>

                        <div style={{ fontSize: '12px', color: token.colorTextDescription, marginTop: 2 }}>
                          Thực hiện bởi: <strong style={{ color: token.colorText }}>{batch.assignedBy || 'Hệ thống'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* COUNT BADGE */}
                    <div
                      style={{
                        background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : '#fffbe6',
                        border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.3)' : '#ffe58f'}`,
                        borderRadius: '20px',
                        padding: '3px 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: '12px', color: themeMode === 'dark' ? '#d48806' : '#d46b08', fontWeight: 600 }}>
                        Số lượng:
                      </Text>
                      <span style={{ fontWeight: 800, fontSize: '14px', color: '#D4A84B', fontVariantNumeric: 'tabular-nums' }}>
                        {batch.customerCount} KH
                      </span>
                    </div>
                  </div>

                  {/* FILTER FORMULA RE-USE TAG */}
                  {batch.sourceFilterSummary && (
                    <div style={{ marginTop: 10 }}>
                      <Tooltip
                        title={
                          batch.sourceFilterJson
                            ? 'Bấm vào đây để TÁI SỬ DỤNG ngay công thức & bộ lọc này cho danh sách khách hàng!'
                            : 'Công thức phân bổ'
                        }
                      >
                        <div
                          onClick={() => {
                            if (batch.sourceFilterJson) {
                              onClose();
                              applyFilterFromJson(batch.sourceFilterJson);
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: themeMode === 'dark' ? 'rgba(22, 119, 255, 0.12)' : '#e6f7ff',
                            border: `1px solid ${themeMode === 'dark' ? 'rgba(22, 119, 255, 0.3)' : '#91d5ff'}`,
                            borderRadius: '8px',
                            padding: '4px 10px',
                            cursor: batch.sourceFilterJson ? 'pointer' : 'default',
                            transition: 'all 0.2s ease',
                            fontSize: '12px',
                            color: themeMode === 'dark' ? '#40a9ff' : '#0958d9',
                            fontWeight: 500,
                          }}
                          className="hover:scale-[1.01] hover:shadow-sm"
                        >
                          <FilterOutlined style={{ color: '#1677ff' }} />
                          <span>🎯 {batch.sourceFilterSummary}</span>
                          {batch.sourceFilterJson && (
                            <span style={{ fontSize: '11px', textDecoration: 'underline', opacity: 0.85, marginLeft: 4 }}>
                              (Bấm để lọc lại)
                            </span>
                          )}
                        </div>
                      </Tooltip>
                    </div>
                  )}

                  {/* METADATA BAR (ASSIGNED AT & EXPIRES AT) */}
                  <div
                    style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      background: themeMode === 'dark' ? '#181818' : '#fafafa',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: token.colorTextDescription }}>
                      <ClockCircleOutlined />
                      <span>Thời gian: {formattedDate}</span>
                    </div>

                    {formattedExpire && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          color: isExpired ? '#ff4d4f' : '#faad14',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        <CalendarOutlined />
                        <span>
                          {isExpired ? 'Đã hết hạn: ' : 'Hết hạn: '}
                          {formattedExpire}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* REASON ALERT */}
                  {batch.reason && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: '12px',
                        color: '#ff4d4f',
                        background: themeMode === 'dark' ? '#2c1515' : '#fff2f0',
                        border: `1px solid ${themeMode === 'dark' ? '#5c2223' : '#ffccc7'}`,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <ExclamationCircleOutlined />
                      <span>
                        <strong>Lý do:</strong> {batch.reason}
                      </span>
                    </div>
                  )}

                  {/* ACTION FOOTER */}
                  <div
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Button
                      size="small"
                      icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedBatchId(null);
                          setBatchDetails([]);
                        } else {
                          fetchBatchDetails(batch.batchId);
                        }
                      }}
                      style={{ borderRadius: '6px' }}
                    >
                      {isExpanded ? 'Thu gọn chi tiết' : 'Xem chi tiết KH'}
                    </Button>

                    {!isUndone && (
                      <>
                        {onOpenRevokeBatchModal && (
                          <Button
                            danger
                            size="small"
                            icon={<UserDeleteOutlined />}
                            loading={revokingBatchId === batch.batchId}
                            onClick={() => {
                              onOpenRevokeBatchModal(batch.batchId, batch.customerCount);
                            }}
                            style={{ borderRadius: '6px', fontWeight: 600 }}
                          >
                            Thu hồi data
                          </Button>
                        )}

                        <Button
                          size="small"
                          type="primary"
                          icon={<UndoOutlined />}
                          loading={undoingBatchId === batch.batchId}
                          onClick={() => {
                            onOpenUndoModal(batch.batchId, batch.customerCount);
                          }}
                          style={{
                            borderRadius: '6px',
                            fontWeight: 600,
                            background: '#D4A84B',
                            borderColor: '#D4A84B',
                            color: '#000',
                          }}
                        >
                          Hoàn tác đợt này
                        </Button>
                      </>
                    )}
                  </div>

                  {/* EXPANDED CUSTOMER DETAILS TABLE */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: 12,
                        borderTop: `1px dashed ${themeMode === 'dark' ? '#303030' : '#e8e8e8'}`,
                        paddingTop: 12,
                      }}
                    >
                      <Spin spinning={batchDetailsLoading}>
                        <div className="antd-custom-table">
                          <Table
                            size="small"
                            pagination={false}
                            dataSource={batchDetails}
                            rowKey="id"
                            columns={[
                              {
                                title: 'ID',
                                dataIndex: 'id',
                                key: 'id',
                                width: 60,
                                render: (id) => <Text type="secondary">#{id}</Text>,
                              },
                              {
                                title: 'Họ và tên',
                                dataIndex: 'fullName',
                                key: 'fullName',
                                render: (text) => <span style={{ fontWeight: 600, color: token.colorText }}>{text}</span>,
                              },
                              {
                                title: 'Số điện thoại',
                                dataIndex: 'phone',
                                key: 'phone',
                                render: (phone) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{phone}</span>,
                              },
                              {
                                title: 'Booker cũ',
                                dataIndex: 'prevStaffName',
                                key: 'prevStaffName',
                                render: (text) => (text ? <Tag>{text}</Tag> : <Text type="secondary">-</Text>),
                              },
                              {
                                title: isUndone ? 'Booker được chọn (Đã hoàn tác)' : 'Booker mới',
                                dataIndex: 'newStaffName',
                                key: 'newStaffName',
                                render: (text) => {
                                  if (!text) return <Text type="secondary">Chưa phân bổ</Text>;
                                  if (isUndone) {
                                    return (
                                      <Space size={4}>
                                        <Tag color="default" style={{ textDecoration: 'line-through', opacity: 0.85 }}>
                                          {text}
                                        </Tag>
                                        <Tag color="volcano" style={{ fontSize: '10px', padding: '0 6px' }}>
                                          Đã hủy
                                        </Tag>
                                      </Space>
                                    );
                                  }
                                  return <Tag color="blue">{text}</Tag>;
                                },
                              },
                            ]}
                          />
                        </div>
                      </Spin>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Spin>

      {/* PAGINATION FOOTER */}
      {historyTotal > 10 && (
        <div
          style={{
            marginTop: 20,
            paddingTop: 14,
            borderTop: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0'}`,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Pagination
            size="small"
            current={historyPage}
            pageSize={10}
            total={historyTotal}
            onChange={(page) => fetchAssignmentHistory(page)}
            showSizeChanger={false}
            showTotal={(total) => `Tổng ${total} đợt`}
          />
        </div>
      )}
    </Drawer>
  );
};

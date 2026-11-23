'use client';

import React, { useEffect, useState } from 'react';
import { Button, Pagination, Space, Spin, Table, Tag, Tooltip, Typography } from 'antd';
import { History, RefreshCw } from 'lucide-react';
import type { SafeAny } from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon, CopyPhoneButton } from '../../../../components/ui';
import { AssignmentHistoryBatchCard } from './assignment-history/AssignmentHistoryBatchCard';
import { AssignmentHistoryToolbar } from './assignment-history/AssignmentHistoryToolbar';

const { Text } = Typography;

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
  fetchAssignmentHistory: (page?: number, search?: string, actionType?: string) => Promise<void>;
  fetchBatchDetails: (batchId: string) => Promise<void>;
  setExpandedBatchId: (batchId: string | null) => void;
  setBatchDetails: (details: SafeAny[]) => void;
  applyFilterFromJson: (jsonStr: string, batchId?: string) => void;
  onOpenUndoModal: (batchId: string, customerCount: number) => void;
  onOpenRevokeBatchModal?: (batchId: string, customerCount: number) => void;
  onOpenCustomerDetail?: (customerId: number) => void;
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
  onOpenCustomerDetail,
}) => {
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;

    const updateTimestamp = () => setNowTimestamp(Date.now());
    updateTimestamp();
    const interval = setInterval(updateTimestamp, 60_000);

    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (!open && searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, [open]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      searchTimerRef.current = null;
      fetchAssignmentHistory(1, val, filterAction);
    }, 350);
  };

  const handleFilterChange = (val: string) => {
    // A pending debounced search captured the previous action type. Cancel it
    // before fetching the newly selected filter to avoid a stale follow-up response.
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    setFilterAction(val);
    fetchAssignmentHistory(1, searchQuery, val);
  };

  return (
    <AdaptiveDrawer
      intent="data"
      className="customer-assignment-history-overlay"
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
                background: `${token.colorPrimary}20`,
                color: token.colorPrimary,
              }}
            >
              <AppIcon icon={History} size={18} />
            </span>
            <div>
              <div style={{ color: token.colorPrimary, fontWeight: 700, fontSize: '16px', lineHeight: 1.2 }}>
                Lịch Sử Phân Bổ Data
              </div>
              <Text style={{ fontSize: '12px', color: token.colorTextDescription }}>
                Tổng cộng {historyTotal}&nbsp;đợt phân bổ &amp; thu hồi
              </Text>
            </div>
          </div>

          <Tooltip title="Làm mới lịch sử">
            <Button
              type="text"
              icon={<AppIcon icon={RefreshCw} size={14} className={historyLoading ? 'animate-spin' : undefined} />}
              onClick={() => fetchAssignmentHistory(historyPage, searchQuery, filterAction)}
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
      <AssignmentHistoryToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        filterAction={filterAction}
        onFilterChange={handleFilterChange}
        displayedCount={historyData.length}
      />

      {/* HISTORY CARDS LIST */}
      <Spin spinning={historyLoading && historyData.length === 0}>
        {historyData.length === 0 ? (
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
            <AppIcon icon={History} size={36} className="mx-auto mb-3 text-neutral-300" />
            <div>Không tìm thấy dữ liệu phân bổ phù hợp.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {historyData.map((batch) => {
              const isExpanded = expandedBatchId === batch.batchId;
              const isUndone = batch.isUndone;

              return (
                <AssignmentHistoryBatchCard
                  key={batch.batchId}
                  batch={batch}
                  isExpanded={isExpanded}
                  nowTimestamp={nowTimestamp}
                  undoingBatchId={undoingBatchId}
                  revokingBatchId={revokingBatchId}
                  onClose={onClose}
                  applyFilterFromJson={applyFilterFromJson}
                  onToggleExpand={() => {
                    if (isExpanded) {
                      setExpandedBatchId(null);
                      setBatchDetails([]);
                    } else {
                      fetchBatchDetails(batch.batchId);
                    }
                  }}
                  onOpenRevokeBatchModal={onOpenRevokeBatchModal}
                  onOpenUndoModal={onOpenUndoModal}
                  expandedContent={
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
                                render: (text, record: SafeAny) => {
                                  if (onOpenCustomerDetail && record.legacyUserId) {
                                    return (
                                      <Button
                                        type="link"
                                        onClick={() => {
                                          onClose();
                                          onOpenCustomerDetail(record.legacyUserId);
                                        }}
                                        style={{
                                          padding: 0,
                                          height: 'auto',
                                          fontWeight: 600,
                                          color: token.colorPrimary,
                                        }}
                                      >
                                        {text || `Khách hàng #${record.legacyUserId}`}
                                      </Button>
                                    );
                                  }
                                  return <span style={{ fontWeight: 600, color: token.colorText }}>{text}</span>;
                                },
                              },
                              {
                                title: 'Số điện thoại',
                                dataIndex: 'phone',
                                key: 'phone',
                                render: (phone) =>
                                  phone ? (
                                    <span
                                      className="inline-flex items-center gap-1"
                                      style={{ fontVariantNumeric: 'tabular-nums' }}
                                    >
                                      <span>{phone}</span>
                                      <CopyPhoneButton phone={phone} size="xs" />
                                    </span>
                                  ) : (
                                    '-'
                                  ),
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
                  }
                />
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
            onChange={(page) => fetchAssignmentHistory(page, searchQuery, filterAction)}
            showSizeChanger={false}
            showTotal={(total) => `Tổng ${total}\u00a0đợt`}
          />
        </div>
      )}
    </AdaptiveDrawer>
  );
};

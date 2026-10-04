'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  Table,
  Tag,
  Button,
  Input,
  Select,
  Space,
  Tooltip,
  Popconfirm,
  Alert,
  message,
  Typography,
  theme,
  Spin,
  Badge,
} from 'antd';
import {
  StopOutlined,
  ReloadOutlined,
  SearchOutlined,
  UndoOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { apiClient } from '../../lib/api-client';
import { useTheme } from '../../context/ThemeContext';
import { CopyPhoneButton } from '../ui/CopyPhoneButton';

dayjs.extend(relativeTime);

const { Text } = Typography;

interface SharedPoolExcludedDrawerProps {
  open: boolean;
  onClose: () => void;
  campaignId: number;
  totalBatches?: number;
  activeBatchNumber?: number;
  isAdmin: boolean;
  onDataChanged?: () => void;
}

const CALL_RESULT_TAGS: Record<string, { label: string; color: string }> = {
  NO_NEED: { label: '🚫 Không có nhu cầu', color: 'volcano' },
  REJECTED: { label: '❌ Từ chối thẳng thừng', color: 'red' },
  WRONG_NUMBER: { label: '⚠️ Sai số / Nhầm máy', color: 'orange' },
  CLOSED: { label: '🔒 Đóng hồ sơ', color: 'purple' },
  NOT_INTERESTED: { label: '🚫 Không quan tâm', color: 'volcano' },
  DO_NOT_CALL: { label: '⛔ Yêu cầu không gọi', color: 'magenta' },
  CANCELLED: { label: '✖️ Đã hủy', color: 'default' },
};

export const SharedPoolExcludedDrawer: React.FC<SharedPoolExcludedDrawerProps> = ({
  open,
  onClose,
  campaignId,
  totalBatches = 1,
  activeBatchNumber = 1,
  isAdmin,
  onDataChanged,
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [loading, setLoading] = useState<boolean>(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Filters
  const [selectedBatch, setSelectedBatch] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchExcludedCustomers = useCallback(async () => {
    if (!campaignId || !open) return;
    setLoading(true);
    try {
      const params: any = {
        poolStatus: 'EXCLUDED',
        page: currentPage,
        pageSize: pageSize,
      };
      if (selectedBatch !== 'ALL') {
        params.batchNumber = selectedBatch;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res: any = await apiClient.campaigns.getCustomers(campaignId, params);
      const items = Array.isArray(res) ? res : res?.items || res?.data || [];
      const total = Array.isArray(res) ? items.length : Number(res?.total ?? items.length);
      setCustomers(items);
      setTotalCount(total);
    } catch (err: any) {
      console.error('Fetch excluded customers error:', err);
      message.error(err?.response?.data?.message || 'Không thể tải danh sách Data loại trừ');
    } finally {
      setLoading(false);
    }
  }, [campaignId, open, currentPage, pageSize, selectedBatch, searchQuery]);

  useEffect(() => {
    if (open) {
      fetchExcludedCustomers();
      setSelectedRowKeys([]);
    }
  }, [open, fetchExcludedCustomers]);

  // Single Action: Return to pool
  const handleReturnToPool = async (record: any) => {
    const customerId = record.id || record.legacyUserId;
    setActionLoading(true);
    try {
      const res = await apiClient.campaigns.managerSharedPoolAction(campaignId, {
        customerId,
        action: 'RETURN_TO_POOL',
        reason: 'Quản lý duyệt khôi phục từ danh sách Data loại trừ',
      });
      message.success(res.message || 'Đã khôi phục khách hàng về Pool sẵn sàng nhận!');
      onDataChanged?.();
      await fetchExcludedCustomers();
    } catch (err: any) {
      console.error('Return to pool error:', err);
      message.error(err?.response?.data?.message || 'Không thể khôi phục khách hàng');
    } finally {
      setActionLoading(false);
    }
  };

  // Single Action: Keep excluded
  const handleKeepExcluded = async (record: any) => {
    const customerId = record.id || record.legacyUserId;
    setActionLoading(true);
    try {
      const res = await apiClient.campaigns.managerSharedPoolAction(campaignId, {
        customerId,
        action: 'KEEP_EXCLUDED',
        reason: 'Quản lý xác nhận giữ trạng thái loại trừ',
      });
      message.success(res.message || 'Đã xác nhận giữ trạng thái loại trừ!');
      onDataChanged?.();
      await fetchExcludedCustomers();
    } catch (err: any) {
      console.error('Keep excluded error:', err);
      message.error(err?.response?.data?.message || 'Thao tác không thành công');
    } finally {
      setActionLoading(false);
    }
  };

  // Single Action: Remove from campaign
  const handleRemoveFromCampaign = async (record: any) => {
    const customerId = record.id || record.legacyUserId;
    setActionLoading(true);
    try {
      const res: any = await apiClient.campaigns.removeCustomer(campaignId, customerId, {
        reason: 'Quản lý gỡ khỏi chiến dịch từ danh sách Data loại trừ',
      });
      message.success(res?.message || 'Đã gỡ khách hàng khỏi chiến dịch hiện tại (hồ sơ CRM giữ nguyên)!');
      onDataChanged?.();
      await fetchExcludedCustomers();
    } catch (err: any) {
      console.error('Remove from campaign error:', err);
      message.error(err?.response?.data?.message || 'Không thể gỡ khách hàng');
    } finally {
      setActionLoading(false);
    }
  };

  // Batch Action: Return to pool
  const handleBatchReturnToPool = async () => {
    if (selectedRowKeys.length === 0) return;
    const customerIds = selectedRowKeys.map((k) => Number(k));
    setActionLoading(true);
    try {
      const res = await apiClient.campaigns.batchManagerSharedPoolAction(campaignId, {
        customerIds,
        action: 'RETURN_TO_POOL',
        reason: 'Quản lý duyệt khôi phục hàng loạt về Pool',
      });
      message.success(res.message || `Đã khôi phục ${selectedRowKeys.length} khách hàng về Pool!`);
      setSelectedRowKeys([]);
      onDataChanged?.();
      await fetchExcludedCustomers();
    } catch (err: any) {
      console.error('Batch return to pool error:', err);
      message.error(err?.response?.data?.message || 'Không thể khôi phục hàng loạt');
    } finally {
      setActionLoading(false);
    }
  };

  // Batch Action: Keep excluded
  const handleBatchKeepExcluded = async () => {
    if (selectedRowKeys.length === 0) return;
    const customerIds = selectedRowKeys.map((k) => Number(k));
    setActionLoading(true);
    try {
      const res = await apiClient.campaigns.batchManagerSharedPoolAction(campaignId, {
        customerIds,
        action: 'KEEP_EXCLUDED',
        reason: 'Quản lý xác nhận giữ trạng thái loại trừ hàng loạt',
      });
      message.success(res.message || `Đã xác nhận giữ loại trừ cho ${selectedRowKeys.length} khách hàng!`);
      setSelectedRowKeys([]);
      onDataChanged?.();
      await fetchExcludedCustomers();
    } catch (err: any) {
      console.error('Batch keep excluded error:', err);
      message.error(err?.response?.data?.message || 'Không thể xác nhận hàng loạt');
    } finally {
      setActionLoading(false);
    }
  };

  // Batch Action: Remove from campaign
  const handleBatchRemoveFromCampaign = async () => {
    if (selectedRowKeys.length === 0) return;
    const customerIds = selectedRowKeys.map((k) => Number(k));
    setActionLoading(true);
    try {
      const res: any = await apiClient.campaigns.removeCustomersBatch(campaignId, {
        customerIds,
        reason: 'Quản lý gỡ hàng loạt khỏi chiến dịch từ danh sách Data loại trừ',
      });
      message.success(
        res?.message || `Đã gỡ ${selectedRowKeys.length} khách hàng khỏi chiến dịch (hồ sơ CRM giữ nguyên)!`
      );
      setSelectedRowKeys([]);
      onDataChanged?.();
      await fetchExcludedCustomers();
    } catch (err: any) {
      console.error('Batch remove error:', err);
      message.error(err?.response?.data?.message || 'Không thể gỡ hàng loạt');
    } finally {
      setActionLoading(false);
    }
  };

  const batchOptions = [
    { label: 'Tất cả các Batch', value: 'ALL' },
    ...Array.from({ length: totalBatches }, (_, i) => i + 1).map((b) => ({
      label: `Batch #${b}${b === activeBatchNumber ? ' (Đang mở)' : ''}`,
      value: b,
    })),
  ];

  const columns = [
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 240,
      render: (_: any, record: any) => {
        const name = record.customerName || `Khách hàng #${record.legacyUserId}`;
        const phone = record.customerPhone;
        const batchNo = record.batchNumber;
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{name}</span>
              {batchNo && (
                <Tag color="purple" className="m-0 text-[10px] px-1 py-0 font-mono">
                  B#{batchNo}
                </Tag>
              )}
            </div>
            {phone ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                <PhoneOutlined className="text-slate-400 text-[11px]" />
                <span className="tabular-nums">{phone}</span>
                <CopyPhoneButton phone={phone} size="xs" />
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic">Không có SĐT</span>
            )}
            <span className="text-[10px] text-gray-400 font-mono">ID: #{record.legacyUserId}</span>
          </div>
        );
      },
    },
    {
      title: 'Nhân viên xử lý',
      key: 'staff',
      width: 170,
      render: (_: any, record: any) => {
        const staffName =
          record.lastCallStaffName ||
          record.assignedBookerName ||
          record.assignedStaff?.displayName ||
          record.claimedByStaffName ||
          'Chưa ghi nhận';
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
            <UserOutlined className="text-purple-500 text-xs shrink-0" />
            <span className="font-medium truncate">{staffName}</span>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái cuối',
      key: 'lastStatus',
      width: 180,
      render: (_: any, record: any) => {
        const resKey = record.lastCallResult || record.lastCall?.callResult || 'EXCLUDED';
        const config = CALL_RESULT_TAGS[resKey] || { label: `🔴 ${resKey}`, color: 'red' };
        return (
          <div className="flex flex-col gap-0.5">
            <Tag color={config.color} className="font-semibold text-xs m-0 inline-flex items-center w-fit">
              {config.label}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Lý do / Ghi chú',
      key: 'note',
      render: (_: any, record: any) => {
        const note = record.lastCallNote || record.lastCall?.note || record.removedReason;
        if (!note) return <span className="text-xs text-gray-400 italic">Không có ghi chú</span>;
        return (
          <div
            className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 line-clamp-3"
            title={note}
          >
            {note}
          </div>
        );
      },
    },
    {
      title: 'Thời gian bị loại',
      key: 'excludedAt',
      width: 160,
      render: (_: any, record: any) => {
        const time = record.lastCallAt || record.addedAt;
        if (!time) return <span className="text-xs text-gray-400">N/A</span>;
        const d = dayjs(time);
        return (
          <div className="flex flex-col text-xs text-slate-600 dark:text-slate-400 tabular-nums">
            <span className="font-medium text-slate-800 dark:text-slate-200">{d.format('DD/MM/YYYY HH:mm')}</span>
            <span className="text-[10px] text-gray-400">{d.fromNow()}</span>
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 190,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        if (!isAdmin) {
          return <span className="text-xs text-gray-400 italic">Chỉ Quản lý / Admin</span>;
        }

        return (
          <Space size={4} wrap>
            <Popconfirm
              title="Khôi phục về Pool?"
              description="Khách hàng sẽ chuyển sang SẴN SÀNG (AVAILABLE) và có thể được nhận Claim lại."
              okText="Khôi phục"
              cancelText="Hủy"
              onConfirm={() => handleReturnToPool(record)}
            >
              <Tooltip title="Khôi phục về Pool (AVAILABLE)">
                <Button
                  size="small"
                  type="primary"
                  icon={<UndoOutlined />}
                  loading={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 font-semibold text-white text-xs"
                >
                  Khôi phục
                </Button>
              </Tooltip>
            </Popconfirm>

            <Popconfirm
              title="Xác nhận giữ loại trừ?"
              description="Xác nhận khách hàng này đúng là không có nhu cầu / sai số và tiếp tục giữ ở danh sách loại trừ."
              okText="Giữ loại trừ"
              cancelText="Hủy"
              onConfirm={() => handleKeepExcluded(record)}
            >
              <Tooltip title="Giữ trạng thái loại trừ">
                <Button size="small" icon={<CheckCircleOutlined />} loading={actionLoading} className="text-xs">
                  Giữ
                </Button>
              </Tooltip>
            </Popconfirm>

            <Popconfirm
              title="Xóa khỏi Campaign này?"
              description="Chỉ gỡ khách hàng khỏi Campaign hiện tại, hồ sơ khách trong CRM vẫn được bảo toàn nguyên vẹn."
              okText="Xóa khỏi Campaign"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleRemoveFromCampaign(record)}
            >
              <Tooltip title="Gỡ khỏi Campaign (không xóa CRM)">
                <Button size="small" danger icon={<DeleteOutlined />} loading={actionLoading} className="text-xs" />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between gap-3 pr-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center justify-center">
              <StopOutlined className="text-rose-600 dark:text-rose-400 text-base" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-800 dark:text-slate-100">
                  Data loại trừ – Chờ kiểm tra
                </span>
                <Tag color="error" className="font-bold text-xs m-0 px-2 py-0.5 rounded-full tabular-nums">
                  {totalCount} khách hàng
                </Tag>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0 mt-0.5">
                Danh sách khách bị loại (Không có nhu cầu, Từ chối, Sai số, Closed...). Quản lý kiểm tra để khôi phục về
                Pool hoặc gỡ khỏi chiến dịch.
              </p>
            </div>
          </div>

          <Button size="small" icon={<ReloadOutlined />} onClick={fetchExcludedCustomers} loading={loading}>
            Làm mới
          </Button>
        </div>
      }
      placement="right"
      width={1000}
      open={open}
      onClose={onClose}
      destroyOnClose
      className="shared-pool-excluded-drawer"
    >
      <div className="space-y-3.5">
        {/* Notice Banner */}
        <Alert
          type="info"
          showIcon
          icon={<ExclamationCircleOutlined className="text-rose-500 text-base" />}
          message={
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
              Quy tắc bảo vệ Shared Pool (Kinh thánh mOS)
            </span>
          }
          description={
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 mt-0.5">
              <div>
                • Khách hàng trong danh sách này <strong>không xuất hiện</strong> trong Pool hoạt động, không thể nhận
                Claim và <strong>không tự động tái sinh (Recycle)</strong>.
              </div>
              <div>
                • <strong>Khôi phục về Pool</strong>: Đưa khách trở lại trạng thái SẴN SÀNG (AVAILABLE) để nhân viên nhận
                xử lý lại.
              </div>
              <div>
                • <strong>Xóa khỏi Campaign</strong>: Chỉ xóa khỏi Campaign hiện tại, <em>hoàn toàn không xóa</em> hồ sơ
                khách hàng trong CRM.
              </div>
            </div>
          }
          className="rounded-xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20"
        />

        {/* Toolbar: Search, Batch filter & Bulk Actions */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Input
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder="Tìm theo tên hoặc SĐT..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              allowClear
              style={{ width: 230 }}
              size="middle"
            />

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-medium">Đợt:</span>
              <Select
                value={selectedBatch}
                onChange={(val) => {
                  setSelectedBatch(val);
                  setCurrentPage(1);
                }}
                options={batchOptions}
                style={{ width: 170 }}
                size="middle"
              />
            </div>
          </div>

          {/* Bulk Action Buttons (Admin only) */}
          {isAdmin && selectedRowKeys.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Đã chọn <strong className="text-purple-600 tabular-nums">{selectedRowKeys.length}</strong> KH:
              </span>

              <Popconfirm
                title={`Khôi phục ${selectedRowKeys.length} khách về Pool?`}
                description="Các khách hàng được chọn sẽ chuyển sang SẴN SÀNG (AVAILABLE)."
                onConfirm={handleBatchReturnToPool}
                okText="Khôi phục"
                cancelText="Hủy"
              >
                <Button
                  size="small"
                  type="primary"
                  icon={<UndoOutlined />}
                  loading={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 font-semibold text-white text-xs"
                >
                  Khôi phục ({selectedRowKeys.length})
                </Button>
              </Popconfirm>

              <Popconfirm
                title={`Xác nhận giữ loại trừ cho ${selectedRowKeys.length} khách?`}
                description="Tiếp tục giữ trạng thái loại trừ cho toàn bộ danh sách đã chọn."
                onConfirm={handleBatchKeepExcluded}
                okText="Giữ loại trừ"
                cancelText="Hủy"
              >
                <Button size="small" icon={<CheckCircleOutlined />} loading={actionLoading} className="text-xs">
                  Giữ loại trừ ({selectedRowKeys.length})
                </Button>
              </Popconfirm>

              <Popconfirm
                title={`Gỡ ${selectedRowKeys.length} khách khỏi Campaign?`}
                description="Chỉ gỡ khỏi chiến dịch hiện tại, hồ sơ khách trong CRM vẫn giữ nguyên."
                onConfirm={handleBatchRemoveFromCampaign}
                okText="Gỡ khỏi Campaign"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} loading={actionLoading} className="text-xs">
                  Gỡ khỏi Campaign ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            </div>
          )}
        </div>

        {/* Data Table */}
        <Table
          size="small"
          rowKey={(r) => r.id || r.legacyUserId}
          columns={columns}
          dataSource={customers}
          loading={loading}
          rowSelection={
            isAdmin
              ? {
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                  preserveSelectedRowKeys: true,
                }
              : undefined
          }
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalCount,
            onChange: (p, pz) => {
              setCurrentPage(p);
              if (pz && pz !== pageSize) setPageSize(pz);
            },
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Tổng cộng: ${total} khách hàng loại trừ`,
          }}
          className="border rounded-xl overflow-hidden"
          scroll={{ x: 920 }}
        />
      </div>
    </Drawer>
  );
};

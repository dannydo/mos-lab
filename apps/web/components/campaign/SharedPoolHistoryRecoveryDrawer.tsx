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
  Modal,
  Radio,
  Alert,
  message,
  Typography,
  theme,
  Spin,
} from 'antd';
import {
  HistoryOutlined,
  ReloadOutlined,
  SearchOutlined,
  UndoOutlined,
  LockOutlined,
  UnlockOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  UserOutlined,
  ThunderboltOutlined,
  FilterOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { CampaignSharedPoolDetailedLog, SharedPoolRecoveryAction, SharedPoolRecoveryDto } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { useTheme } from '../../context/ThemeContext';

dayjs.extend(relativeTime);

const { Text } = Typography;

interface SharedPoolHistoryRecoveryDrawerProps {
  open: boolean;
  onClose: () => void;
  campaignId: number;
  isAdmin: boolean;
  onDataChanged?: () => void;
}

export const SharedPoolHistoryRecoveryDrawer: React.FC<SharedPoolHistoryRecoveryDrawerProps> = ({
  open,
  onClose,
  campaignId,
  isAdmin,
  onDataChanged,
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  // History state
  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<CampaignSharedPoolDetailedLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Recovery Modal state
  const [recoveryModalOpen, setRecoveryModalOpen] = useState<boolean>(false);
  const [recoveryLoading, setRecoveryLoading] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<CampaignSharedPoolDetailedLog | null>(null);
  const [recoveryAction, setRecoveryAction] = useState<SharedPoolRecoveryAction>('ROLLBACK_TO_LOG');
  const [targetPoolStatus, setTargetPoolStatus] = useState<string>('AVAILABLE');
  const [recoveryReason, setRecoveryReason] = useState<string>('');
  const [driftConfirmed, setDriftConfirmed] = useState<boolean>(false);

  // Quick recovery modal state
  const [quickModalOpen, setQuickModalOpen] = useState<boolean>(false);
  const [quickCustomerId, setQuickCustomerId] = useState<string>('');
  const [quickAction, setQuickAction] = useState<SharedPoolRecoveryAction>('FORCE_UNLOCK');
  const [quickTargetStatus, setQuickTargetStatus] = useState<string>('AVAILABLE');
  const [quickReason, setQuickReason] = useState<string>('');
  const [quickLoading, setQuickLoading] = useState<boolean>(false);

  // Fetch history logs
  const fetchHistory = useCallback(async () => {
    if (!campaignId || !open) return;
    setLoading(true);
    try {
      const res = await apiClient.campaigns.getSharedPoolHistory(campaignId, {
        page: currentPage,
        pageSize,
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setLogs(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      console.error('Fetch shared pool history error:', err);
      message.error(err?.response?.data?.message || 'Không thể tải lịch sử thao tác Shared Pool');
    } finally {
      setLoading(false);
    }
  }, [campaignId, open, currentPage, pageSize, actionFilter, searchQuery]);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, fetchHistory]);

  // Open Recovery Modal for a specific log row
  const handleOpenRecovery = (record: CampaignSharedPoolDetailedLog) => {
    setSelectedLog(record);
    setRecoveryAction('ROLLBACK_TO_LOG');
    setTargetPoolStatus('AVAILABLE');
    setRecoveryReason('');
    setDriftConfirmed(false);
    setRecoveryModalOpen(true);
  };

  // Submit Recovery
  const handleSubmitRecovery = async () => {
    if (!selectedLog || !campaignId) return;
    const trimmedReason = recoveryReason.trim();
    if (!trimmedReason) {
      message.error('Bắt buộc nhập lý do khi thực hiện khôi phục theo nguyên tắc an toàn mOS.');
      return;
    }

    setRecoveryLoading(true);
    try {
      const dto: SharedPoolRecoveryDto = {
        customerId: selectedLog.campaignCustomerId || selectedLog.legacyUserId,
        action: recoveryAction,
        logId: selectedLog.id,
        targetPoolStatus: recoveryAction === 'RESET_POOL_STATUS' ? targetPoolStatus : undefined,
        reason: trimmedReason,
        forceOverride: driftConfirmed,
      };

      const res = await apiClient.campaigns.recoverSharedPoolCustomer(campaignId, dto);

      if (res.requiresConfirmation) {
        // Warning: Data has drifted
        Modal.confirm({
          title: 'Cảnh báo dữ liệu đã thay đổi (State Drift)',
          icon: <WarningOutlined className="text-amber-500" />,
          content: (
            <div className="space-y-2 mt-2 text-sm">
              <p>{res.message}</p>
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                <div>
                  Trạng thái hiện tại: <strong>{res.currentStatus}</strong>
                </div>
                <div>
                  Trạng thái dự kiến khôi phục: <strong>{res.targetPreviousStatus}</strong>
                </div>
              </div>
            </div>
          ),
          okText: 'Tôi hiểu, vẫn khôi phục',
          okType: 'danger',
          cancelText: 'Hủy bỏ',
          onOk: async () => {
            setDriftConfirmed(true);
            try {
              setRecoveryLoading(true);
              const retryRes = await apiClient.campaigns.recoverSharedPoolCustomer(campaignId, {
                ...dto,
                forceOverride: true,
              });
              message.success(retryRes.message || 'Khôi phục trạng thái thành công!');
              setRecoveryModalOpen(false);
              fetchHistory();
              onDataChanged?.();
            } catch (retryErr: any) {
              message.error(retryErr?.response?.data?.message || 'Khôi phục thất bại');
            } finally {
              setRecoveryLoading(false);
            }
          },
        });
        return;
      }

      message.success(res.message || 'Khôi phục trạng thái thành công!');
      setRecoveryModalOpen(false);
      fetchHistory();
      onDataChanged?.();
    } catch (err: any) {
      console.error('Recovery error:', err);
      message.error(err?.response?.data?.message || 'Khôi phục dữ liệu thất bại');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Submit Quick Recovery
  const handleSubmitQuickRecovery = async () => {
    if (!campaignId) return;
    const cid = parseInt(quickCustomerId.trim(), 10);
    if (isNaN(cid) || cid <= 0) {
      message.error('Vui lòng nhập ID khách hàng hợp lệ.');
      return;
    }
    const trimmedReason = quickReason.trim();
    if (!trimmedReason) {
      message.error('Bắt buộc nhập lý do khi thực hiện khôi phục.');
      return;
    }

    setQuickLoading(true);
    try {
      const dto: SharedPoolRecoveryDto = {
        customerId: cid,
        action: quickAction,
        targetPoolStatus: quickAction === 'RESET_POOL_STATUS' ? quickTargetStatus : undefined,
        reason: trimmedReason,
        forceOverride: true,
      };

      const res = await apiClient.campaigns.recoverSharedPoolCustomer(campaignId, dto);
      message.success(res.message || 'Đã khôi phục trạng thái khách hàng thành công!');
      setQuickModalOpen(false);
      setQuickCustomerId('');
      setQuickReason('');
      fetchHistory();
      onDataChanged?.();
    } catch (err: any) {
      console.error('Quick recovery error:', err);
      message.error(err?.response?.data?.message || 'Khôi phục thất bại');
    } finally {
      setQuickLoading(false);
    }
  };

  // Render Action Badge
  const renderActionBadge = (action: string, actionLabel: string) => {
    switch (action) {
      case 'CLAIM':
        return (
          <Tag color="orange" className="font-semibold inline-flex items-center gap-1 m-0">
            <LockOutlined /> {actionLabel || 'Lock / Giữ data'}
          </Tag>
        );
      case 'RELEASE_MANUAL':
        return (
          <Tag color="cyan" className="font-semibold inline-flex items-center gap-1 m-0">
            <UnlockOutlined /> {actionLabel || 'Nhả Claim'}
          </Tag>
        );
      case 'RELEASE_MANAGER':
        return (
          <Tag color="red" className="font-semibold inline-flex items-center gap-1 m-0">
            <UnlockOutlined /> {actionLabel || 'QL nhả Claim'}
          </Tag>
        );
      case 'RELEASE_EXPIRED':
        return (
          <Tag color="volcano" className="font-semibold inline-flex items-center gap-1 m-0">
            <ClockCircleOutlined /> {actionLabel || 'Hết hạn TTL'}
          </Tag>
        );
      case 'CALL':
      case 'STATUS_UPDATE':
        return (
          <Tag color="purple" className="font-semibold inline-flex items-center gap-1 m-0">
            <PhoneOutlined /> {actionLabel || 'Báo cáo gọi'}
          </Tag>
        );
      case 'BOOK':
      case 'BOOKING':
        return (
          <Tag color="green" className="font-semibold inline-flex items-center gap-1 m-0">
            <CheckCircleOutlined /> {actionLabel || 'Chốt Booking'}
          </Tag>
        );
      case 'RECYCLE':
      case 'RECYCLE_RETURN':
        return (
          <Tag color="blue" className="font-semibold inline-flex items-center gap-1 m-0">
            <ReloadOutlined /> {actionLabel || 'Recycle'}
          </Tag>
        );
      case 'EXCLUDE':
        return (
          <Tag color="default" className="font-semibold inline-flex items-center gap-1 m-0">
            <CloseCircleOutlined /> {actionLabel || 'Loại khỏi Pool'}
          </Tag>
        );
      case 'RETURN_TO_POOL':
        return (
          <Tag color="lime" className="font-semibold inline-flex items-center gap-1 m-0">
            <ReloadOutlined /> {actionLabel || 'Về lại Pool'}
          </Tag>
        );
      case 'RECOVERY_OVERRIDE':
        return (
          <Tag color="magenta" className="font-semibold inline-flex items-center gap-1 m-0">
            <UndoOutlined /> {actionLabel || 'Khôi phục'}
          </Tag>
        );
      default:
        return <Tag className="m-0">{actionLabel || action}</Tag>;
    }
  };

  // Render Status Tag
  const renderStatusTag = (status: string | null | undefined) => {
    if (!status) return <span className="text-gray-400 text-xs">—</span>;
    switch (status) {
      case 'AVAILABLE':
        return (
          <Tag color="success" className="m-0 text-[11px] font-semibold">
            🟢 SẴN SÀNG
          </Tag>
        );
      case 'CLAIMED':
        return (
          <Tag color="warning" className="m-0 text-[11px] font-semibold">
            🟠 ĐANG GIỮ
          </Tag>
        );
      case 'RECYCLING':
        return (
          <Tag color="purple" className="m-0 text-[11px] font-semibold">
            🟣 CHỜ LẠI
          </Tag>
        );
      case 'EXPLOITED':
        return (
          <Tag color="default" className="m-0 text-[11px] font-semibold">
            ⚪ ĐÃ GỌI
          </Tag>
        );
      case 'BOOKED':
        return (
          <Tag color="blue" className="m-0 text-[11px] font-semibold">
            🔵 ĐÃ BOOK
          </Tag>
        );
      case 'EXCLUDED':
        return (
          <Tag color="error" className="m-0 text-[11px] font-semibold">
            🔴 ĐÃ LOẠI
          </Tag>
        );
      default:
        return <Tag className="m-0 text-[11px]">{status}</Tag>;
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 145,
      render: (val: string) => {
        const d = dayjs(val);
        return (
          <Tooltip title={d.fromNow()}>
            <div className="text-xs">
              <div className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                {d.format('DD/MM/YYYY')}
              </div>
              <div className="text-[11px] text-gray-400 font-mono tabular-nums">{d.format('HH:mm:ss')}</div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 200,
      render: (_: any, record: CampaignSharedPoolDetailedLog) => {
        if (!record.legacyUserId && !record.campaignCustomerId) {
          return <span className="text-xs text-gray-400">Toàn chiến dịch / Hệ thống</span>;
        }
        return (
          <div className="text-xs">
            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1 truncate">
              <UserOutlined className="text-purple-500 text-[11px]" />
              <span className="truncate">{record.customerName || `KH #${record.legacyUserId}`}</span>
            </div>
            {record.customerPhone && (
              <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono">{record.customerPhone}</div>
            )}
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-gray-400 font-mono">#{record.legacyUserId}</span>
              {record.currentPoolStatus && (
                <Tooltip title="Trạng thái thực tế hiện tại của khách hàng">
                  {renderStatusTag(record.currentPoolStatus)}
                </Tooltip>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Nhân viên thao tác',
      key: 'staff',
      width: 150,
      render: (_: any, record: CampaignSharedPoolDetailedLog) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {record.staffName || (record.staffId ? `NV #${record.staffId}` : 'Hệ thống tự động')}
          </span>
          {record.staffId && <div className="text-[10px] text-gray-400 font-mono">ID: #{record.staffId}</div>}
        </div>
      ),
    },
    {
      title: 'Loại thao tác',
      key: 'action',
      width: 170,
      render: (_: any, record: CampaignSharedPoolDetailedLog) => renderActionBadge(record.action, record.actionLabel),
    },
    {
      title: 'Chuyển đổi trạng thái',
      key: 'statusTransition',
      width: 190,
      render: (_: any, record: CampaignSharedPoolDetailedLog) => {
        if (!record.previousPoolStatus && !record.nextPoolStatus) {
          return <span className="text-xs text-gray-400">—</span>;
        }
        return (
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            {renderStatusTag(record.previousPoolStatus)}
            <span className="text-gray-400 font-bold">→</span>
            {renderStatusTag(record.nextPoolStatus)}
          </div>
        );
      },
    },
    {
      title: 'Kết quả / Ghi chú',
      key: 'note',
      render: (_: any, record: CampaignSharedPoolDetailedLog) => (
        <div className="text-xs space-y-1">
          {record.result && <div className="font-semibold text-slate-800 dark:text-slate-200">{record.result}</div>}
          {record.note && (
            <div className="text-gray-600 dark:text-gray-400 bg-black/5 dark:bg-white/5 p-1.5 rounded-md text-[11px] leading-relaxed">
              {record.note}
            </div>
          )}
          {record.isDrifted && (
            <Tooltip title={`Dữ liệu đã thay đổi sau log này. Hiện tại là "${record.currentPoolStatus}".`}>
              <Tag color="warning" className="m-0 text-[10px] inline-flex items-center gap-1">
                <WarningOutlined /> Đã đổi trạng thái sau đó
              </Tag>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Khôi phục',
      key: 'actionButton',
      width: 110,
      fixed: 'right' as const,
      render: (_: any, record: CampaignSharedPoolDetailedLog) => {
        if (!isAdmin || !record.canRestore) return null;
        return (
          <Button
            size="small"
            icon={<UndoOutlined />}
            onClick={() => handleOpenRecovery(record)}
            className="text-xs font-semibold hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400"
          >
            Khôi phục
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <Drawer
        title={
          <div className="flex items-center justify-between w-full pr-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <HistoryOutlined className="text-purple-600 text-lg" />
              <div>
                <span className="font-bold text-base text-slate-800 dark:text-slate-100">
                  Lịch Sử Thao Tác & Khôi Phục Shared Pool
                </span>
                <span className="ml-2 text-xs font-normal text-purple-600 dark:text-purple-400 font-mono">
                  (Realtime Audit & Safe Recovery)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  size="small"
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={() => setQuickModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-500 font-semibold"
                >
                  Khôi phục nhanh Data
                </Button>
              )}
              <Button size="small" icon={<ReloadOutlined />} onClick={fetchHistory} loading={loading}>
                Làm mới
              </Button>
            </div>
          </div>
        }
        open={open}
        onClose={onClose}
        width="92%"
        style={{ maxWidth: 1400 }}
        destroyOnHidden
      >
        {/* Safety Guarantees Notice */}
        <div className="mb-4 p-3 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200">
            <ShieldCheckIcon />
            <span>
              <strong>Nguyên tắc an toàn mOS:</strong> Nhật ký lưu trữ bất biến (Append-only). Mỗi lần hoàn tác tạo thêm
              1 log mới, bắt buộc có lý do và ghi nhận danh tính Quản lý.
            </span>
          </div>
          <span className="text-gray-400 font-mono tabular-nums">
            Tổng cộng: <strong>{total}</strong> thao tác
          </span>
        </div>

        {/* Filter Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <FilterOutlined /> Lọc thao tác:
            </span>
            <Select
              size="small"
              value={actionFilter}
              onChange={(val) => {
                setActionFilter(val);
                setCurrentPage(1);
              }}
              style={{ width: 190 }}
              options={[
                { label: 'Tất cả thao tác', value: 'ALL' },
                { label: '🔒 Lock / Claim (Giữ data)', value: 'CLAIM' },
                { label: '🔓 Nhả Claim (Release)', value: 'RELEASE' },
                { label: '📞 Báo cáo cuộc gọi', value: 'CALL' },
                { label: '🎯 Chốt Booking', value: 'BOOKING' },
                { label: '♻️ Chờ quay lại (Recycle)', value: 'RECYCLE' },
                { label: '🚫 Đã loại (Excluded)', value: 'EXCLUDE' },
                { label: '👑 Can thiệp Quản lý', value: 'MANAGER' },
                { label: '↩️ Đã Khôi phục', value: 'RECOVERY' },
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <Input
              size="small"
              placeholder="Tìm theo Tên KH, SĐT, Mã KH hoặc Tên NV..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPressEnter={() => {
                setCurrentPage(1);
                fetchHistory();
              }}
              allowClear
              style={{ width: 280 }}
            />
            <Button
              size="small"
              type="primary"
              onClick={() => {
                setCurrentPage(1);
                fetchHistory();
              }}
            >
              Tìm
            </Button>
          </div>
        </div>

        {/* Realtime Table */}
        <Table
          size="small"
          loading={loading}
          dataSource={logs}
          columns={columns}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => {
              setCurrentPage(p);
              setPageSize(ps);
            },
            showTotal: (tot) => `Tổng cộng ${tot} bản ghi`,
          }}
          scroll={{ x: 1000 }}
          className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800"
        />
      </Drawer>

      {/* Modal Khôi phục / Rollback theo log */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
            <UndoOutlined className="text-purple-600" />
            <span>Khôi Phục Trạng Thái Khách Hàng (Manager Override)</span>
          </div>
        }
        open={recoveryModalOpen}
        onCancel={() => setRecoveryModalOpen(false)}
        onOk={handleSubmitRecovery}
        confirmLoading={recoveryLoading}
        okText="Xác nhận khôi phục"
        cancelText="Hủy bỏ"
        okButtonProps={{
          disabled: !recoveryReason.trim(),
          className: 'bg-purple-600 hover:bg-purple-500 font-semibold',
        }}
        destroyOnHidden
        width={560}
      >
        {selectedLog && (
          <div className="space-y-4 pt-2">
            {/* Customer Summary */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs">
              <div className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center justify-between">
                <span>{selectedLog.customerName || `Khách hàng #${selectedLog.legacyUserId}`}</span>
                <span className="font-mono text-purple-600 dark:text-purple-400">
                  {selectedLog.customerPhone || `#${selectedLog.legacyUserId}`}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-gray-500">
                <span>
                  Trạng thái hiện tại: <strong>{renderStatusTag(selectedLog.currentPoolStatus)}</strong>
                </span>
                <span>·</span>
                <span>
                  Log được chọn:{' '}
                  <strong>
                    #{selectedLog.id} ({selectedLog.actionLabel})
                  </strong>
                </span>
              </div>
            </div>

            {/* Warning if data drifted */}
            {selectedLog.isDrifted && (
              <Alert
                type="warning"
                showIcon
                icon={<WarningOutlined className="text-amber-500" />}
                message={
                  <span className="font-bold text-amber-800 dark:text-amber-200">
                    Cảnh báo: Dữ liệu đã thay đổi sau log này!
                  </span>
                }
                description={`Trạng thái của khách hàng hiện tại ("${selectedLog.currentPoolStatus}") đã khác với kết quả của log được chọn. Thao tác khôi phục sẽ cưỡng chế đưa trạng thái về lựa chọn bên dưới.`}
                className="rounded-xl border-amber-300 dark:border-amber-800"
              />
            )}

            {/* Recovery Action Radio Options */}
            <div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Chọn phương thức khôi phục:
              </div>
              <Radio.Group
                value={recoveryAction}
                onChange={(e) => setRecoveryAction(e.target.value)}
                className="w-full space-y-2"
              >
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-all">
                  <Radio value="ROLLBACK_TO_LOG">
                    <span className="font-semibold text-xs">Khôi phục về trạng thái trước bản ghi này</span>
                    <div className="text-[11px] text-gray-400 ml-6">
                      Hoàn tác trạng thái về <strong>{selectedLog.previousPoolStatus || 'SẴN SÀNG (AVAILABLE)'}</strong>
                      .
                    </div>
                  </Radio>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-all">
                  <Radio value="FORCE_UNLOCK">
                    <span className="font-semibold text-xs">Cưỡng chế giải phóng Lock / Claim (Force Unlock)</span>
                    <div className="text-[11px] text-gray-400 ml-6">
                      Xóa lock đang kẹt, đưa khách hàng ngay về SẴN SÀNG (AVAILABLE).
                    </div>
                  </Radio>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-all">
                  <Radio value="RESTORE_EXCLUDED">
                    <span className="font-semibold text-xs">Khôi phục khách hàng từ ĐÃ LOẠI → SẴN SÀNG</span>
                    <div className="text-[11px] text-gray-400 ml-6">
                      Hủy bỏ trạng thái loại khỏi pool, cho phép đội ngũ tiếp tục khai thác.
                    </div>
                  </Radio>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-all">
                  <Radio value="RESET_RECYCLE">
                    <span className="font-semibold text-xs">Reset hàng đợi Recycle (Chờ quay lại)</span>
                    <div className="text-[11px] text-gray-400 ml-6">
                      Bỏ qua thời gian chờ hẹn gọi lại, đưa ngay về Pool sẵn sàng nhận.
                    </div>
                  </Radio>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-all">
                  <Radio value="RESET_POOL_STATUS">
                    <span className="font-semibold text-xs">Chuyển sang trạng thái Pool tùy chỉnh</span>
                    {recoveryAction === 'RESET_POOL_STATUS' && (
                      <div className="mt-2 ml-6">
                        <Select
                          size="small"
                          value={targetPoolStatus}
                          onChange={(v) => setTargetPoolStatus(v)}
                          style={{ width: 220 }}
                          options={[
                            { label: '🟢 Sẵn sàng (AVAILABLE)', value: 'AVAILABLE' },
                            { label: '🟣 Chờ quay lại (RECYCLING)', value: 'RECYCLING' },
                            { label: '⚪ Đã gọi (EXPLOITED)', value: 'EXPLOITED' },
                            { label: '🔵 Đã chốt (BOOKED)', value: 'BOOKED' },
                            { label: '🔴 Đã loại (EXCLUDED)', value: 'EXCLUDED' },
                          ]}
                        />
                      </div>
                    )}
                  </Radio>
                </div>
              </Radio.Group>
            </div>

            {/* Mandatory Reason Input */}
            <div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>
                  Lý do khôi phục <span className="text-red-500">*</span>
                </span>
                <span className="text-[10px] text-gray-400">(Bắt buộc theo nguyên tắc an toàn mOS)</span>
              </div>
              <Input.TextArea
                rows={3}
                placeholder="Nhập lý do cụ thể (VD: Telesales kẹt mạng không nhả được claim / Loại nhầm khách hẹn gọi lại...)"
                value={recoveryReason}
                onChange={(e) => setRecoveryReason(e.target.value)}
                className="rounded-lg text-xs"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Khôi phục nhanh Data */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
            <ThunderboltOutlined className="text-amber-500" />
            <span>Khôi Phục Nhanh Khách Hàng (Quick Data Recovery)</span>
          </div>
        }
        open={quickModalOpen}
        onCancel={() => setQuickModalOpen(false)}
        onOk={handleSubmitQuickRecovery}
        confirmLoading={quickLoading}
        okText="Thực hiện khôi phục"
        cancelText="Hủy bỏ"
        okButtonProps={{
          disabled: !quickCustomerId.trim() || !quickReason.trim(),
          className: 'bg-purple-600 hover:bg-purple-500 font-semibold',
        }}
        destroyOnHidden
        width={500}
      >
        <div className="space-y-4 pt-2">
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ID khách hàng trong chiến dịch / Mã User <span className="text-red-500">*</span>
            </div>
            <Input
              placeholder="Nhập User ID (VD: 20043 hoặc Campaign Customer ID)"
              value={quickCustomerId}
              onChange={(e) => setQuickCustomerId(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Hành động khôi phục</div>
            <Select
              className="w-full"
              value={quickAction}
              onChange={(v) => setQuickAction(v)}
              options={[
                { label: '🔓 Force Unlock (Xóa kẹt Lock / Claim)', value: 'FORCE_UNLOCK' },
                { label: '🟢 Khôi phục EXCLUDED → AVAILABLE', value: 'RESTORE_EXCLUDED' },
                { label: '♻️ Reset Recycle → AVAILABLE', value: 'RESET_RECYCLE' },
                { label: '⚙️ Đổi trạng thái Pool tùy chỉnh', value: 'RESET_POOL_STATUS' },
              ]}
            />
          </div>

          {quickAction === 'RESET_POOL_STATUS' && (
            <div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Trạng thái mục tiêu</div>
              <Select
                className="w-full"
                value={quickTargetStatus}
                onChange={(v) => setQuickTargetStatus(v)}
                options={[
                  { label: '🟢 Sẵn sàng (AVAILABLE)', value: 'AVAILABLE' },
                  { label: '🟣 Chờ quay lại (RECYCLING)', value: 'RECYCLING' },
                  { label: '⚪ Đã gọi (EXPLOITED)', value: 'EXPLOITED' },
                  { label: '🔵 Đã chốt (BOOKED)', value: 'BOOKED' },
                  { label: '🔴 Đã loại (EXCLUDED)', value: 'EXCLUDED' },
                ]}
              />
            </div>
          )}

          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>
                Lý do khôi phục <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-gray-400">(Bắt buộc)</span>
            </div>
            <Input.TextArea
              rows={3}
              placeholder="Nhập lý do quản lý thực hiện khôi phục..."
              value={quickReason}
              onChange={(e) => setQuickReason(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

function ShieldCheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

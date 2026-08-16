'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Select,
  Typography,
  Space,
  Button,
  message,
  Tag,
  Spin,
  Empty,
  Table,
  Alert,
  Input,
  Radio,
  Tooltip,
} from 'antd';
import {
  FieldTimeOutlined,
  GiftOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  UserSwitchOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  FilterOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { apiClient } from '../../lib/api-client';
import { Campaign, AddCustomerDetail, AddCampaignCustomersResponse } from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';
import CampaignPlusIcon from '../icons/CampaignPlusIcon';
import { AdaptiveModal } from '../ui';

const { Text, Paragraph } = Typography;

interface AddToCampaignModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCustomerIds: number[];
  customerName?: string;
  onSuccess: () => void;
}

export function AddToCampaignModal({
  visible,
  onClose,
  selectedCustomerIds,
  customerName,
  onSuccess,
}: AddToCampaignModalProps) {
  const { themeMode } = useTheme();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [transferring, setTransferring] = useState<boolean>(false);
  const [resultData, setResultData] = useState<AddCampaignCustomersResponse | null>(null);

  // Result Summary View Controls (Search, Filter, Checkbox selection, Table Page Size)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ADDED' | 'SKIPPED'>('ALL');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    if (visible) {
      fetchActiveCampaigns();
      setResultData(null);
      setSearchQuery('');
      setStatusFilter('ALL');
      setSelectedRowKeys([]);
    } else {
      setSelectedCampaignId(null);
      setResultData(null);
      setSearchQuery('');
      setStatusFilter('ALL');
      setSelectedRowKeys([]);
    }
  }, [visible]);

  const fetchActiveCampaigns = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.campaigns.list({ pageSize: 100 });
      const list = Array.isArray(res) ? res : res?.items || res?.data || [];
      const selectable = list.filter((c: any) => !['COMPLETED', 'ENDED', 'ARCHIVED', 'DELETED'].includes(c.status));
      setCampaigns(selectable);
      if (selectable.length > 0) {
        setSelectedCampaignId(selectable[0].id);
      }
    } catch (err) {
      console.error('Fetch active campaigns error:', err);
      message.error('Không thể tải danh sách chiến dịch');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedCampaignId) {
      message.warning('Vui lòng chọn 1 chiến dịch');
      return;
    }
    if (!selectedCustomerIds || selectedCustomerIds.length === 0) {
      message.warning('Không có khách hàng nào được chọn');
      return;
    }

    setSubmitting(true);
    try {
      const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
      const res = await apiClient.campaigns.addCustomers(selectedCampaignId, {
        customerIds: selectedCustomerIds,
      });

      if (res && res.details && res.details.length > 0 && res.skippedCount > 0) {
        // Show result summary report modal if there are skipped customers
        setResultData(res);
      } else {
        message.success(
          res?.message ||
            `Đã thêm ${res?.addedCount || selectedCustomerIds.length} khách hàng vào chiến dịch "${selectedCampaign?.name}"!`
        );
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Add customers to campaign error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể thêm khách hàng vào chiến dịch';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  const handleTransferSingle = async (userId: number) => {
    if (!selectedCampaignId) return;
    setTransferring(true);
    try {
      const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
      await apiClient.campaigns.transferCustomers(selectedCampaignId, {
        customerIds: [userId],
        reason: `Chuyển trực tiếp sang chiến dịch "${selectedCampaign?.name}"`,
      });
      message.success(`Đã chuyển khách hàng sang chiến dịch "${selectedCampaign?.name}" thành công!`);

      setResultData((prev) => {
        if (!prev) return null;
        const updatedDetails = prev.details.map((d) =>
          d.legacyUserId === userId ? { ...d, status: 'ADDED' as const, reason: undefined } : d
        );
        const addedCount = updatedDetails.filter((d) => d.status === 'ADDED').length;
        const skippedCount = updatedDetails.filter((d) => d.status === 'SKIPPED').length;
        return {
          ...prev,
          addedCount,
          skippedCount,
          details: updatedDetails,
        };
      });
      setSelectedRowKeys((prev) => prev.filter((k) => k !== userId));
    } catch (err: any) {
      console.error('Transfer customer error:', err);
      message.error(err?.response?.data?.message || 'Không thể chuyển chiến dịch');
    } finally {
      setTransferring(false);
    }
  };

  const handleTransferGroup = async (groupCampaignName: string, customerIds: number[]) => {
    if (!selectedCampaignId || customerIds.length === 0) return;
    setTransferring(true);
    try {
      const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
      await apiClient.campaigns.transferCustomers(selectedCampaignId, {
        customerIds,
        reason: `Chuyển nhóm ${customerIds.length} KH từ "${groupCampaignName}" sang "${selectedCampaign?.name}"`,
      });
      message.success(`Đã chuyển nhóm ${customerIds.length} KH từ chiến dịch "${groupCampaignName}" thành công!`);

      setResultData((prev) => {
        if (!prev) return null;
        const updatedDetails = prev.details.map((d) =>
          customerIds.includes(d.legacyUserId) ? { ...d, status: 'ADDED' as const, reason: undefined } : d
        );
        const addedCount = updatedDetails.filter((d) => d.status === 'ADDED').length;
        const skippedCount = updatedDetails.filter((d) => d.status === 'SKIPPED').length;
        return {
          ...prev,
          addedCount,
          skippedCount,
          details: updatedDetails,
        };
      });
      setSelectedRowKeys((prev) => prev.filter((k) => !customerIds.includes(Number(k))));
    } catch (err: any) {
      console.error('Transfer group error:', err);
      message.error(err?.response?.data?.message || 'Không thể chuyển nhóm chiến dịch');
    } finally {
      setTransferring(false);
    }
  };

  const handleTransferSelectedCheckboxes = async () => {
    if (!selectedCampaignId || selectedRowKeys.length === 0 || !resultData) return;
    const targetIds = selectedRowKeys.map((k) => Number(k));
    setTransferring(true);
    try {
      const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
      await apiClient.campaigns.transferCustomers(selectedCampaignId, {
        customerIds: targetIds,
        reason: `Chuyển ${targetIds.length} KH chọn lọc sang chiến dịch "${selectedCampaign?.name}"`,
      });
      message.success(
        `Đã chuyển ${targetIds.length} khách hàng đã chọn sang chiến dịch "${selectedCampaign?.name}" thành công!`
      );

      setResultData((prev) => {
        if (!prev) return null;
        const updatedDetails = prev.details.map((d) =>
          targetIds.includes(d.legacyUserId) ? { ...d, status: 'ADDED' as const, reason: undefined } : d
        );
        const addedCount = updatedDetails.filter((d) => d.status === 'ADDED').length;
        const skippedCount = updatedDetails.filter((d) => d.status === 'SKIPPED').length;
        return {
          ...prev,
          addedCount,
          skippedCount,
          details: updatedDetails,
        };
      });
      setSelectedRowKeys([]);
    } catch (err: any) {
      console.error('Transfer selected checkboxes error:', err);
      message.error(err?.response?.data?.message || 'Không thể chuyển khách hàng đã chọn');
    } finally {
      setTransferring(false);
    }
  };

  const handleTransferAll = async () => {
    if (!selectedCampaignId || !resultData) return;
    const skippedIds = resultData.details
      .filter((d) => d.status === 'SKIPPED' && d.currentCampaignId && d.currentCampaignId !== selectedCampaignId)
      .map((d) => d.legacyUserId);

    if (skippedIds.length === 0) return;

    setTransferring(true);
    try {
      const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
      await apiClient.campaigns.transferCustomers(selectedCampaignId, {
        customerIds: skippedIds,
        reason: `Chuyển hàng loạt sang chiến dịch "${selectedCampaign?.name}"`,
      });
      message.success(
        `Đã chuyển ${skippedIds.length} khách hàng sang chiến dịch "${selectedCampaign?.name}" thành công!`
      );

      setResultData((prev) => {
        if (!prev) return null;
        const updatedDetails = prev.details.map((d) =>
          skippedIds.includes(d.legacyUserId) ? { ...d, status: 'ADDED' as const, reason: undefined } : d
        );
        return {
          ...prev,
          addedCount: prev.details.length,
          skippedCount: 0,
          details: updatedDetails,
        };
      });
      setSelectedRowKeys([]);
    } catch (err: any) {
      console.error('Transfer all error:', err);
      message.error(err?.response?.data?.message || 'Không thể chuyển tất cả chiến dịch');
    } finally {
      setTransferring(false);
    }
  };

  // Group skipped customers by existing campaign
  const campaignGroups = useMemo(() => {
    if (!resultData) return [];
    const map = new Map<number, { id: number; name: string; items: AddCustomerDetail[] }>();
    resultData.details.forEach((d) => {
      if (d.status === 'SKIPPED' && d.currentCampaignId && d.currentCampaignId !== selectedCampaignId) {
        const existing = map.get(d.currentCampaignId);
        if (existing) {
          existing.items.push(d);
        } else {
          map.set(d.currentCampaignId, {
            id: d.currentCampaignId,
            name: d.currentCampaignName || `Chiến dịch #${d.currentCampaignId}`,
            items: [d],
          });
        }
      }
    });
    return Array.from(map.values());
  }, [resultData, selectedCampaignId]);

  // Filter details based on search and statusFilter
  const filteredDetails = useMemo(() => {
    if (!resultData) return [];
    return resultData.details.filter((d) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) {
        return false;
      }
      if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.trim().toLowerCase();
        const matchName = d.customerName.toLowerCase().includes(query);
        const matchPhone = d.customerPhone ? d.customerPhone.includes(query) : false;
        const matchId = String(d.legacyUserId).includes(query);
        return matchName || matchPhone || matchId;
      }
      return true;
    });
  }, [resultData, statusFilter, searchQuery]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  // Render Result Summary View when resultData is present
  if (resultData) {
    const skippedWithOtherCampaign = resultData.details.filter(
      (d) => d.status === 'SKIPPED' && d.currentCampaignId && d.currentCampaignId !== selectedCampaignId
    );

    const columns = [
      {
        title: 'Khách hàng',
        key: 'customer',
        render: (_: any, record: AddCustomerDetail) => (
          <div>
            <span className="font-semibold">{record.customerName}</span>
            {record.customerPhone && (
              <span className="text-xs text-slate-400 block font-mono">{record.customerPhone}</span>
            )}
          </div>
        ),
      },
      {
        title: 'Trạng thái',
        key: 'status',
        width: 140,
        render: (_: any, record: AddCustomerDetail) =>
          record.status === 'ADDED' ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              ĐÃ THÊM
            </Tag>
          ) : (
            <Tag color="warning" icon={<WarningOutlined />}>
              BỊ BỎ QUA
            </Tag>
          ),
      },
      {
        title: 'Lý do / Thao tác',
        key: 'action',
        render: (_: any, record: AddCustomerDetail) => {
          if (record.status === 'ADDED') {
            return <span className="text-xs text-emerald-500 font-medium">Đã thêm vào chiến dịch thành công</span>;
          }
          return (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-amber-500 font-medium">{record.reason}</span>
              {record.currentCampaignId && record.currentCampaignId !== selectedCampaignId && (
                <Button
                  size="small"
                  type="primary"
                  className="bg-amber-600 hover:bg-amber-500 text-xs flex items-center gap-1"
                  icon={<UserSwitchOutlined />}
                  loading={transferring}
                  onClick={() => handleTransferSingle(record.legacyUserId)}
                >
                  Chuyển ngay
                </Button>
              )}
            </div>
          );
        },
      },
    ];

    return (
      <AdaptiveModal
        intent="data"
        className="customer-campaign-result-overlay"
        title={
          <Space align="center">
            <CheckCircleOutlined className="text-emerald-500 text-xl" />
            <span className="font-bold text-base">Báo cáo kết quả phân bổ chiến dịch</span>
          </Space>
        }
        open={visible}
        onCancel={handleDone}
        width={820}
        footer={[
          skippedWithOtherCampaign.length > 0 && (
            <Button
              key="transferAll"
              type="primary"
              className="bg-amber-600 hover:bg-amber-500 font-semibold"
              icon={<ArrowRightOutlined />}
              loading={transferring}
              onClick={handleTransferAll}
            >
              Chuyển tất cả ({skippedWithOtherCampaign.length} KH) sang chiến dịch này
            </Button>
          ),
          <Button key="close" type="default" onClick={handleDone}>
            Hoàn tất
          </Button>,
        ]}
      >
        <div className="py-2 space-y-4">
          <Alert
            type={resultData.addedCount > 0 ? 'info' : 'warning'}
            showIcon
            message={
              <span className="font-semibold text-xs">
                Tổng số {resultData.details.length} khách hàng: Đã thêm {resultData.addedCount} KH thành công ✅, Bỏ qua{' '}
                {resultData.skippedCount} KH ❌
              </span>
            }
            description={
              resultData.skippedCount > 0
                ? 'Hệ thống đã tự động gom nhóm khách hàng theo chiến dịch cũ bên dưới. Bạn có thể nhấn "Chuyển nhóm" hoặc chọn Checkbox từng dòng để chuyển linh hoạt sang chiến dịch mới.'
                : undefined
            }
          />

          {/* Grouped Campaign Summary Cards (Phân Loại Nhóm Chiến Dịch Cũ) */}
          {campaignGroups.length > 0 && (
            <div className="space-y-2">
              <Text strong className="block text-xs uppercase tracking-wider text-slate-400">
                <FilterOutlined /> Nhóm khách hàng thuộc chiến dịch cũ ({campaignGroups.length} nhóm):
              </Text>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {campaignGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs ${
                      themeMode === 'dark' ? 'bg-white/[0.04] border-amber-500/30' : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate flex items-center gap-1.5 text-amber-500">
                        <RocketOutlined className="text-amber-500" /> {group.name}
                      </div>
                      <div className="text-slate-400 text-[11px] font-medium tabular-nums">
                        Số lượng: <span className="font-semibold text-slate-200">{group.items.length} KH</span>
                      </div>
                    </div>
                    <Button
                      size="small"
                      type="primary"
                      className="bg-amber-600 hover:bg-amber-500 text-xs font-semibold shrink-0"
                      icon={<UserSwitchOutlined />}
                      loading={transferring}
                      onClick={() =>
                        handleTransferGroup(
                          group.name,
                          group.items.map((i) => i.legacyUserId)
                        )
                      }
                    >
                      Chuyển {group.items.length} KH này
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toolbar: Tabs Filter + Search + Checkbox Batch Action */}
          <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-white/5">
            <Radio.Group
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="ALL">Tất cả ({resultData.details.length})</Radio.Button>
              <Radio.Button value="ADDED">Đã thêm ({resultData.addedCount})</Radio.Button>
              <Radio.Button value="SKIPPED">Bị bỏ qua ({resultData.skippedCount})</Radio.Button>
            </Radio.Group>

            <div className="flex items-center gap-2">
              {selectedRowKeys.length > 0 && (
                <Button
                  size="small"
                  type="primary"
                  className="bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs flex items-center gap-1"
                  icon={<UserSwitchOutlined />}
                  loading={transferring}
                  onClick={handleTransferSelectedCheckboxes}
                >
                  Chuyển {selectedRowKeys.length} KH đã chọn
                </Button>
              )}
              <Input
                placeholder="Tìm Tên, SĐT, ID..."
                prefix={<SearchOutlined style={{ color: '#aaa' }} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                size="small"
                style={{ width: 180 }}
              />
            </div>
          </div>

          {/* Details Table with Checkbox Selection and Page Size Switcher */}
          <Table
            dataSource={filteredDetails}
            columns={columns}
            rowKey="legacyUserId"
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
              getCheckboxProps: (record: AddCustomerDetail) => ({
                disabled: record.status === 'ADDED',
              }),
            }}
            pagination={{
              pageSize,
              onChange: (_, size) => setPageSize(size),
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total) => (
                <span className="tabular-nums text-xs text-slate-400">Tổng số {total} khách hàng</span>
              ),
            }}
            size="small"
          />
        </div>
      </AdaptiveModal>
    );
  }

  return (
    <AdaptiveModal
      intent="form"
      className="customer-add-to-campaign-overlay"
      title={
        <Space>
          <CampaignPlusIcon fontSize={18} badgeBg="#047857" />
          <span className="font-bold">
            {customerName
              ? `Thêm khách hàng "${customerName}" vào Chiến dịch`
              : `Thêm ${selectedCustomerIds.length} khách hàng vào Chiến dịch`}
          </span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<CampaignPlusIcon fontSize={16} badgeBg="#047857" />}
          loading={submitting}
          disabled={!selectedCampaignId || campaigns.length === 0}
          onClick={handleConfirm}
          style={{
            backgroundColor: '#10b981',
            borderColor: '#10b981',
            fontWeight: 'bold',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Xác nhận thêm vào chiến dịch
        </Button>,
      ]}
      destroyOnClose
    >
      <div className="py-2">
        <Paragraph type="secondary" className="text-xs mb-4">
          Khách hàng được thêm vào chiến dịch sẽ tự động chuyển sang theo dõi riêng của chiến dịch đó và ẩn khỏi danh
          sách NYC chính.
        </Paragraph>

        {loading ? (
          <div className="text-center py-8">
            <Spin tip="Đang tải danh sách chiến dịch..." />
          </div>
        ) : campaigns.length === 0 ? (
          <Empty description="Hiện chưa có chiến dịch custom nào ở trạng thái HOẠT ĐỘNG." className="my-4">
            <Text type="secondary" className="text-xs">
              Vui lòng tạo chiến dịch mới tại trang <strong>Quản lý Chiến dịch NYC</strong> trước.
            </Text>
          </Empty>
        ) : (
          <div className="space-y-4">
            <div>
              <Text strong className="block text-xs mb-1.5">
                Chọn Chiến Dịch Đích:
              </Text>
              <Select
                value={selectedCampaignId}
                onChange={(val) => setSelectedCampaignId(val)}
                className="w-full"
                size="large"
                options={campaigns.map((c) => ({
                  value: c.id,
                  label: (
                    <div className="flex justify-between items-center w-full pr-2">
                      <span className="font-semibold">{c.name}</span>
                      <Tag color="green" className="m-0 text-[10px]">
                        {c._count?.customers ?? 0} KH hiện tại
                      </Tag>
                    </div>
                  ),
                }))}
              />
            </div>

            {selectedCampaign && (
              <div
                className={`p-3 rounded-lg border text-xs space-y-2 ${
                  themeMode === 'dark' ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex justify-between items-center font-medium">
                  <span className="text-slate-400">Slug đường dẫn:</span>
                  <code className="text-emerald-500 font-mono">/dashboard/nyc/campaigns/{selectedCampaign.slug}</code>
                </div>
                {selectedCampaign.description && (
                  <div>
                    <span className="text-slate-400">Mô tả: </span>
                    <span>{selectedCampaign.description}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 text-slate-400 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    <FieldTimeOutlined /> {selectedCampaign._count?.touchpoints ?? 0} Chạm
                  </span>
                  <span className="flex items-center gap-1">
                    <GiftOutlined /> {selectedCampaign._count?.promotions ?? 0} Ưu đãi
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdaptiveModal>
  );
}

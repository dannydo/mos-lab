'use client';

import type { Key } from 'react';
import { Alert, Button, Input, Radio, Space, Table, Tag, Typography } from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  FilterOutlined,
  RocketOutlined,
  SearchOutlined,
  UserSwitchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { AddCampaignCustomersResponse, AddCustomerDetail } from '@mos-lab/shared';
import { AdaptiveModal, CopyPhoneButton } from '../../ui';
import type { AddToCampaignStatusFilter, SkippedCampaignGroup } from './add-to-campaign-utils';

const { Text } = Typography;

interface AddToCampaignResultModalProps {
  visible: boolean;
  onDone: () => void;
  resultData: AddCampaignCustomersResponse;
  campaignGroups: SkippedCampaignGroup[];
  filteredDetails: AddCustomerDetail[];
  selectedCampaignId: number | null;
  statusFilter: AddToCampaignStatusFilter;
  onChangeStatusFilter: (value: AddToCampaignStatusFilter) => void;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  selectedRowKeys: Key[];
  onChangeSelectedRowKeys: (keys: Key[]) => void;
  pageSize: number;
  onChangePageSize: (size: number) => void;
  transferring: boolean;
  onTransferSingle: (userId: number) => void;
  onTransferGroup: (groupCampaignName: string, customerIds: number[]) => void;
  onTransferSelectedCheckboxes: () => void;
  onTransferAll: () => void;
  themeMode: 'light' | 'dark';
}

export function AddToCampaignResultModal({
  visible,
  onDone,
  resultData,
  campaignGroups,
  filteredDetails,
  selectedCampaignId,
  statusFilter,
  onChangeStatusFilter,
  searchQuery,
  onChangeSearchQuery,
  selectedRowKeys,
  onChangeSelectedRowKeys,
  pageSize,
  onChangePageSize,
  transferring,
  onTransferSingle,
  onTransferGroup,
  onTransferSelectedCheckboxes,
  onTransferAll,
  themeMode,
}: AddToCampaignResultModalProps) {
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
            <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
              <span>{record.customerPhone}</span>
              <CopyPhoneButton phone={record.customerPhone} size="xs" />
            </span>
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
                onClick={() => onTransferSingle(record.legacyUserId)}
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
      onCancel={onDone}
      width={820}
      footer={[
        skippedWithOtherCampaign.length > 0 && (
          <Button
            key="transferAll"
            type="primary"
            className="bg-amber-600 hover:bg-amber-500 font-semibold"
            icon={<ArrowRightOutlined />}
            loading={transferring}
            onClick={onTransferAll}
          >
            Chuyển tất cả ({skippedWithOtherCampaign.length} KH) sang chiến dịch này
          </Button>
        ),
        <Button key="close" type="default" onClick={onDone}>
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
                      onTransferGroup(
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
            onChange={(e) => onChangeStatusFilter(e.target.value)}
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
                onClick={onTransferSelectedCheckboxes}
              >
                Chuyển {selectedRowKeys.length} KH đã chọn
              </Button>
            )}
            <Input
              placeholder="Tìm Tên, SĐT, ID..."
              prefix={<SearchOutlined style={{ color: '#aaa' }} />}
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
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
            onChange: (keys) => onChangeSelectedRowKeys(keys),
            getCheckboxProps: (record: AddCustomerDetail) => ({
              disabled: record.status === 'ADDED',
            }),
          }}
          pagination={{
            pageSize,
            onChange: (_, size) => onChangePageSize(size),
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

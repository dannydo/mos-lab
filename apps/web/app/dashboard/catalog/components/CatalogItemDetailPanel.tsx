'use client';

import { TableIndexHeader } from '~/components/ui';

import React from 'react';
import { Card, Table, Tag, Typography, Button, Space, Row, Col, Statistic, theme, Popconfirm } from 'antd';
import {
  CloseOutlined,
  EditOutlined,
  ShoppingOutlined,
  UserOutlined,
  DollarOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CatalogItemHistoryResponse, CatalogItemType } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';

const { Text, Title } = Typography;

interface CatalogItemDetailPanelProps {
  selectedItem: { itemId: number; itemType: CatalogItemType; name: string } | null;
  historyData: CatalogItemHistoryResponse | null;
  loading?: boolean;
  onClose: () => void;
  onEditItem?: (itemId: number, itemType: CatalogItemType) => void;
  onToggleStatus?: (itemId: number, itemType: CatalogItemType, currentDisabled: boolean) => void;
}

export default function CatalogItemDetailPanel({
  selectedItem,
  historyData,
  loading = false,
  onClose,
  onEditItem,
  onToggleStatus,
}: CatalogItemDetailPanelProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();

  if (!selectedItem) return null;

  const itemInfo = historyData?.item;
  const orders = historyData?.orders || [];

  const columns = [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="tabular-nums text-xs text-slate-400">#{index + 1}</span>
      ),
    },
    {
      title: 'Mã Đơn Hàng',
      dataIndex: 'orderCode',
      key: 'orderCode',
      render: (code: string) => <span className="tabular-nums font-semibold text-xs text-blue-500">{code}</span>,
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string, record: any) => (
        <div>
          <div className="font-semibold text-xs text-slate-700 dark:text-slate-200">{name}</div>
          {record.customerPhone && (
            <div className="tabular-nums text-[11px] text-slate-400">{record.customerPhone}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Thời Gian Thực Hiện',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (dateStr: string) => (
        <span className="tabular-nums text-xs text-slate-500 dark:text-slate-400">
          {dayjs(dateStr).format('DD/MM/YYYY HH:mm')}
        </span>
      ),
    },
    {
      title: 'Nhân Sự Phụ Trách',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (name: string) => (
        <Tag color="cyan" className="text-[11px] font-medium m-0">
          {name || 'KTV'}
        </Tag>
      ),
    },
    {
      title: 'Số Lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center' as const,
      render: (qty: number) => <span className="tabular-nums font-semibold text-xs">{qty}</span>,
    },
    {
      title: 'Số Tiền Thu',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-xs text-emerald-500">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
  ];

  return (
    <Card
      size="small"
      style={{
        background: token.colorBgContainer,
        borderColor: token.colorBorderSecondary,
      }}
      className="rounded-xl shadow-md border-amber-500/30 mb-6"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <ShoppingOutlined className="text-amber-500 text-xl" />
          <div>
            <div className="flex items-center gap-2">
              <Title level={5} className="m-0 font-bold">
                {selectedItem.name}
              </Title>
              {selectedItem.itemType === 'service' && <Tag color="blue">Dịch vụ lẻ</Tag>}
              {selectedItem.itemType === 'combo' && <Tag color="purple">Gói Combo</Tag>}
              {selectedItem.itemType === 'product' && <Tag color="emerald">Sản phẩm</Tag>}
              {itemInfo?.isDisabled && <Tag color="red">Đã vô hiệu hóa</Tag>}
            </div>
            <Text className="text-xs text-slate-400">Chi tiết doanh số và danh sách khách hàng sử dụng trong kỳ</Text>
          </div>
        </div>

        {/* Action Controls */}
        <Space size={8}>
          {onEditItem && (
            <Button
              type="primary"
              ghost
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEditItem(selectedItem.itemId, selectedItem.itemType)}
            >
              Chỉnh sửa món này
            </Button>
          )}

          {onToggleStatus && itemInfo && (
            <Popconfirm
              title={itemInfo.isDisabled ? 'Kích hoạt lại món này?' : 'Vô hiệu hóa món này?'}
              description={`Bạn có chắc chắn muốn ${itemInfo.isDisabled ? 'bật' : 'ẩn'} mục "${selectedItem.name}"?`}
              onConfirm={() => onToggleStatus(selectedItem.itemId, selectedItem.itemType, itemInfo.isDisabled)}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button size="small" danger={!itemInfo.isDisabled}>
                {itemInfo.isDisabled ? 'Bật hoạt động' : 'Ẩn mục này'}
              </Button>
            </Popconfirm>
          )}

          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          />
        </Space>
      </div>

      {/* Summary KPI Badges */}
      <Row gutter={[16, 12]} className="mb-4">
        <Col xs={12} sm={8}>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium uppercase">Đơn giá niêm yết</div>
            <div className="tabular-nums text-base font-bold text-slate-700 dark:text-slate-200">
              {Math.round(itemInfo?.unitPrice || 0).toLocaleString('vi-VN')} đ
            </div>
          </div>
        </Col>

        <Col xs={12} sm={8}>
          <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
            <div className="text-[11px] text-blue-500 font-medium uppercase">∑ Lượt bán trong kỳ</div>
            <div className="tabular-nums text-base font-bold text-blue-500">
              {(itemInfo?.totalUnitsSold || 0).toLocaleString('vi-VN')} lượt
            </div>
          </div>
        </Col>

        <Col xs={24} sm={8}>
          <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
            <div className="text-[11px] text-amber-500 font-medium uppercase">∑ Doanh thu thu về</div>
            <div className="tabular-nums text-base font-bold text-amber-500">
              {Math.round(itemInfo?.totalRevenue || 0).toLocaleString('vi-VN')} đ
            </div>
          </div>
        </Col>
      </Row>

      {/* Recent Completed Orders Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Danh sách đơn hàng hoàn thành trong kỳ ({orders.length} đơn)
          </Text>
        </div>

        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn hàng`,
          }}
          loading={loading}
          scroll={{ x: 'max-content' }}
          className="antd-custom-table"
        />
      </div>
    </Card>
  );
}

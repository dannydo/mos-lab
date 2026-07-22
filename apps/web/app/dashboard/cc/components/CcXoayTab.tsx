'use client';

import React, { useState } from 'react';
import { Card, Table, Tag, Input, Space, Button, Typography, theme, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, InfoCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { CcXoayRecord } from '@mos-lab/shared';
import { useTableConfig } from '../../../../hooks/useTableConfig';
import { TableConfigDrawer } from '../../../../components/TableConfigDrawer';

const { Text } = Typography;

interface CcXoayTabProps {
  data: CcXoayRecord[];
  loading?: boolean;
  total?: number;
  onRefresh?: () => void;
}

export default function CcXoayTab({ data, loading, total = 0, onRefresh }: CcXoayTabProps) {
  const { token } = theme.useToken();
  const [searchText, setSearchText] = useState('');

  const filteredData = React.useMemo(() => {
    if (!searchText) return data;
    const lower = searchText.toLowerCase();
    return data.filter(
      (r) =>
        r.clientName.toLowerCase().includes(lower) ||
        r.serviceName.toLowerCase().includes(lower) ||
        r.consultantName.toLowerCase().includes(lower) ||
        String(r.serviceId).includes(lower) ||
        r.store.toLowerCase().includes(lower)
    );
  }, [data, searchText]);

  const staticColumns = [
    {
      title: 'Service ID',
      dataIndex: 'serviceId',
      key: 'serviceId',
      width: 100,
      fixed: 'left' as const,
      render: (val: number) => <span className="tabular-nums font-mono font-medium">#{val}</span>,
    },
    {
      title: 'Check-in',
      dataIndex: 'checkin',
      key: 'checkin',
      width: 150,
      render: (val: string) => <span className="tabular-nums text-xs">{val}</span>,
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      width: 140,
      render: (val: string) => <span className="font-semibold">{val}</span>,
    },
    {
      title: 'Chi Nhánh',
      dataIndex: 'store',
      key: 'store',
      width: 100,
      render: (val: string) => (
        <Tag color={val === 'PXL' ? 'blue' : 'purple'} className="font-medium">
          {val}
        </Tag>
      ),
    },
    {
      title: 'Tên Dịch Vụ / Bộ Mi',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 220,
      render: (val: string) => <span className="font-medium text-amber-600 dark:text-amber-400">{val}</span>,
    },
    {
      title: 'Loại',
      dataIndex: 'serviceType',
      key: 'serviceType',
      width: 90,
      render: (val: string) => <Tag color={val === 'Normal' ? 'green' : 'orange'}>{val}</Tag>,
    },
    {
      title: 'CC Tư Vấn',
      dataIndex: 'consultantName',
      key: 'consultantName',
      width: 150,
      render: (val: string) => <span className="font-medium">{val}</span>,
    },
    {
      title: 'Level CC',
      dataIndex: 'consultantLevel',
      key: 'consultantLevel',
      width: 90,
      align: 'right' as const,
      render: (val: number) => <span className="tabular-nums">{val}</span>,
    },
    {
      title: 'CC Bonus (đ)',
      dataIndex: 'consultantBonus',
      key: 'consultantBonus',
      width: 130,
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-emerald-500">
          +{Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Points Accu',
      dataIndex: 'pointsAccu',
      key: 'pointsAccu',
      width: 120,
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-blue-500">{val.toLocaleString('vi-VN')}</span>
      ),
    },
    {
      title: 'Điểm CC',
      dataIndex: 'consultantPoints',
      key: 'consultantPoints',
      width: 90,
      align: 'right' as const,
      render: (val: number) => (
        <Tag color="cyan" className="tabular-nums font-bold">
          +{val} pts
        </Tag>
      ),
    },
    {
      title: 'CC In',
      dataIndex: 'ccInName',
      key: 'ccInName',
      width: 140,
    },
    {
      title: 'CC Out',
      dataIndex: 'ccOutName',
      key: 'ccOutName',
      width: 140,
    },
    {
      title: 'Class',
      dataIndex: 'class',
      key: 'class',
      width: 140,
      render: (val: string, r: CcXoayRecord) => (
        <span className="text-xs">
          {val}{' '}
          <Tag color="default" className="tabular-nums text-[10px] ml-1">
            {r.classPts}p
          </Tag>
        </span>
      ),
    },
    {
      title: 'Fan',
      dataIndex: 'fan',
      key: 'fan',
      width: 80,
      render: (val: string, r: CcXoayRecord) => (
        <Tag color="geekblue" className="tabular-nums">
          {val} ({r.fanPts}p)
        </Tag>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (val: string, r: CcXoayRecord) => (
        <span>
          {val} ({r.typePts}p)
        </span>
      ),
    },
    {
      title: 'Số Sợi',
      dataIndex: 'lashCount',
      key: 'lashCount',
      width: 100,
      align: 'right' as const,
      render: (val: number, r: CcXoayRecord) => (
        <span className="tabular-nums font-mono">
          {val} sợi ({r.lashPts}p)
        </span>
      ),
    },
    {
      title: 'Dáng Mi',
      dataIndex: 'design',
      key: 'design',
      width: 110,
      render: (val: string, r: CcXoayRecord) => (
        <Tag color="magenta">
          {val} ({r.designPts}p)
        </Tag>
      ),
    },
    {
      title: 'Màu Mi',
      dataIndex: 'color',
      key: 'color',
      width: 100,
      render: (val: string, r: CcXoayRecord) => (
        <Tag color={val === 'Đen' ? 'black' : val === 'Nâu' ? 'gold' : 'purple'}>
          {val} ({r.colorPts}p)
        </Tag>
      ),
    },
    {
      title: 'FAL Rule',
      dataIndex: 'falRule',
      key: 'falRule',
      width: 90,
      render: (val?: string) => val || '-',
    },
  ];

  const {
    loading: configLoading,
    columns: configuredColumns,
    rawConfig,
    configVisible,
    openConfig,
    closeConfig,
    saveConfig,
    resetConfig,
  } = useTableConfig('cc_xoay_table', staticColumns);

  return (
    <Card
      title={
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base" style={{ color: token.colorText }}>
              Bảng Dữ Liệu Báo Cáo CC Xoay (Chi Tiết Từng Lượt Dịch Vụ)
            </span>
            <Tooltip title="Thưởng công thức chạy theo tháng trên lượt khách check-in và bóc tách kỹ thuật bộ mi">
              <InfoCircleOutlined className="text-gray-400" />
            </Tooltip>
          </div>

          <Space wrap>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm khách hàng, dịch vụ, CC..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            {onRefresh && (
              <Button icon={<ReloadOutlined />} onClick={onRefresh}>
                Làm mới
              </Button>
            )}
            <Button icon={<SettingOutlined />} onClick={openConfig}>
              Cấu hình cột
            </Button>
          </Space>
        </div>
      }
      variant="outlined"
      style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
      className="shadow-sm rounded-xl"
    >
      <Table
        dataSource={filteredData}
        columns={configuredColumns}
        rowKey={(record) => `${record.serviceId}-${record.checkin}`}
        loading={loading || configLoading}
        size="small"
        bordered
        scroll={{ x: 2300 }}
        pagination={{
          defaultPageSize: 50,
          pageSizeOptions: ['20', '50', '100', '200'],
          showSizeChanger: true,
          showTotal: (totalCount) => `Tổng cộng ${totalCount} bản ghi lượt dịch vụ`,
        }}
        className="antd-custom-table"
        locale={{ emptyText: 'Không có dữ liệu CC Xoay trong khoảng thời gian này' }}
      />

      <TableConfigDrawer
        visible={configVisible}
        onClose={closeConfig}
        title="Cấu hình cột Báo Cáo CC Xoay"
        columns={rawConfig}
        onSave={saveConfig}
        onReset={resetConfig}
      />
    </Card>
  );
}

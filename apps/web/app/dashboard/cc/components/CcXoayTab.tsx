'use client';

import React, { useState, useMemo } from 'react';
import { Card, Table, Tag, Input, Space, Button, Typography, theme, Tooltip } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  CompressOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import { CcXoayRecord } from '@mos-lab/shared';
import { useTableConfig } from '../../../../hooks/useTableConfig';
import { TableConfigDrawer } from '../../../../components/TableConfigDrawer';
import CcAvatar from './CcAvatar';

interface CcXoayTabProps {
  data: CcXoayRecord[];
  loading?: boolean;
  total?: number;
  onRefresh?: () => void;
}

function CcXoayTabComponent({ data, loading, onRefresh }: CcXoayTabProps) {
  const { token } = theme.useToken();
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const lower = searchText.toLowerCase();
    return data.filter((item) => {
      return (
        item.clientName?.toLowerCase().includes(lower) ||
        item.serviceName?.toLowerCase().includes(lower) ||
        item.consultantName?.toLowerCase().includes(lower) ||
        item.store?.toLowerCase().includes(lower)
      );
    });
  }, [data, searchText]);

  const staticColumns = useMemo(
    () => [
      {
        title: 'Check-in',
        dataIndex: 'checkin',
        key: 'checkin',
        width: 150,
        render: (val: string) => <span className="tabular-nums text-xs text-slate-400">{val}</span>,
      },
      {
        title: 'Khách Hàng',
        dataIndex: 'clientName',
        key: 'clientName',
        width: 140,
        render: (val: string) => <span className="font-semibold text-slate-200">{val}</span>,
      },
      {
        title: 'Chi Nhánh',
        dataIndex: 'store',
        key: 'store',
        width: 90,
        render: (val: string) => {
          const storeCode = val === 'ESTELLA-PLACE' || val === 'ESTELLA' ? 'EP' : val === 'DE-THAM' || val === 'Đề Thám' ? 'DT' : val;
          return <span className="text-xs font-medium text-slate-400 whitespace-nowrap">· {storeCode}</span>;
        },
      },
      {
        title: 'Tên Dịch Vụ / Bộ Mi',
        dataIndex: 'serviceName',
        key: 'serviceName',
        width: 220,
        render: (val: string) => <span className="font-medium text-amber-400">{val}</span>,
      },
      {
        title: 'Loại',
        dataIndex: 'serviceType',
        key: 'serviceType',
        width: 90,
        render: (val: string) =>
          val === 'Normal' ? (
            <span className="text-xs text-slate-500">Normal</span>
          ) : (
            <Tag color="amber" className="m-0 text-[11px] font-semibold border-amber-500/30">
              {val}
            </Tag>
          ),
      },
      {
        title: 'CC Tư Vấn',
        dataIndex: 'consultantName',
        key: 'consultantName',
        width: 160,
        render: (val: string, record: CcXoayRecord) => (
          <Space size={6}>
            <CcAvatar name={val} src={record.avatar} size={24} />
            <span className="font-semibold text-xs">{val}</span>
          </Space>
        ),
      },
      {
        title: 'Level CC',
        dataIndex: 'consultantLevel',
        key: 'consultantLevel',
        width: 80,
        align: 'right' as const,
        render: (val: number) => <span className="tabular-nums font-semibold text-xs text-slate-300">{val}</span>,
      },
      {
        title: 'CC Bonus (đ)',
        dataIndex: 'consultantBonus',
        key: 'consultantBonus',
        width: 120,
        align: 'right' as const,
        render: (val: number) => (
          <span className="tabular-nums font-bold text-emerald-400 text-xs">
            +{Math.round(val || 0).toLocaleString('vi-VN')} đ
          </span>
        ),
      },
      {
        title: 'Points Accu',
        dataIndex: 'pointsAccu',
        key: 'pointsAccu',
        width: 110,
        align: 'right' as const,
        render: (val: number) => (
          <span className="tabular-nums font-semibold text-blue-400 text-xs">{val.toLocaleString('vi-VN')}</span>
        ),
      },
      {
        title: 'Điểm CC',
        dataIndex: 'consultantPoints',
        key: 'consultantPoints',
        width: 90,
        align: 'right' as const,
        render: (val: number) => (
          <span className="tabular-nums font-bold text-cyan-400 text-xs">
            +{val} pts
          </span>
        ),
      },
      {
        title: 'CC In',
        dataIndex: 'ccInName',
        key: 'ccInName',
        width: 140,
        render: (val: string, r: CcXoayRecord) => {
          if (!val) return <span className="text-slate-500 text-xs">-</span>;
          const isSame = !r.ccOutName || r.ccInName === r.ccOutName;
          if (isSame) {
            return (
              <Space size={4} className="text-xs text-slate-300">
                <CcAvatar name={val} size={20} />
                <span>{val}</span>
                <span className="text-emerald-400 font-bold text-[10px]" title="CC In/Out đồng nhất">✓</span>
              </Space>
            );
          }
          return (
            <Tag color="orange" className="m-0 text-[11px] font-medium border-orange-500/30">
              In: {val}
            </Tag>
          );
        },
      },
      {
        title: 'CC Out',
        dataIndex: 'ccOutName',
        key: 'ccOutName',
        width: 140,
        render: (val: string, r: CcXoayRecord) => {
          if (!val) return <span className="text-slate-500 text-xs">-</span>;
          const isSame = !r.ccInName || r.ccInName === r.ccOutName;
          if (isSame) {
            return <span className="text-slate-500 text-xs italic">Đồng nhất</span>;
          }
          return (
            <Tag color="purple" className="m-0 text-[11px] font-medium border-purple-500/30">
              Out: {val}
            </Tag>
          );
        },
      },
      {
        title: 'Class',
        dataIndex: 'class',
        key: 'class',
        width: 130,
        render: (val: string, r: CcXoayRecord) => (
          <span className="text-xs text-slate-300">
            {val} <span className="text-slate-500 text-[10px]">({r.classPts}p)</span>
          </span>
        ),
      },
      {
        title: 'Fan',
        dataIndex: 'fan',
        key: 'fan',
        width: 80,
        render: (val: string, r: CcXoayRecord) => (
          <span className="tabular-nums text-xs text-slate-400">
            {val} <span className="text-slate-500 text-[10px]">({r.fanPts}p)</span>
          </span>
        ),
      },
      {
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        width: 90,
        render: (val: string, r: CcXoayRecord) => (
          <span className="text-xs text-slate-400">
            {val} <span className="text-slate-500 text-[10px]">({r.typePts}p)</span>
          </span>
        ),
      },
      {
        title: 'Số Sợi',
        dataIndex: 'lashCount',
        key: 'lashCount',
        width: 95,
        align: 'right' as const,
        render: (val: number, r: CcXoayRecord) => (
          <span className="tabular-nums text-xs text-slate-300">
            {val}s <span className="text-slate-500 text-[10px]">({r.lashPts}p)</span>
          </span>
        ),
      },
      {
        title: 'Dáng Mi',
        dataIndex: 'design',
        key: 'design',
        width: 100,
        render: (val: string, r: CcXoayRecord) => (
          <span className="text-xs text-slate-400">
            {val} <span className="text-slate-500 text-[10px]">({r.designPts}p)</span>
          </span>
        ),
      },
      {
        title: 'Màu Mi',
        dataIndex: 'color',
        key: 'color',
        width: 90,
        render: (val: string, r: CcXoayRecord) => (
          <span className="text-xs text-slate-400">
            {val} <span className="text-slate-500 text-[10px]">({r.colorPts}p)</span>
          </span>
        ),
      },
      {
        title: 'FAL Rule',
        dataIndex: 'falRule',
        key: 'falRule',
        width: 80,
        render: (val?: string) => <span className="text-xs text-slate-500">{val || '-'}</span>,
      },
    ],
    []
  );

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
              Bảng Dữ Liệu Báo Cáo CC Xoay
            </span>
          </div>

          <Space wrap>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm khách hàng, dịch vụ, CC..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            <Tooltip title={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}>
              <Button
                icon={isCompact ? <ExpandOutlined /> : <CompressOutlined />}
                onClick={() => setIsCompact(!isCompact)}
                className={isCompact ? 'text-amber-500 border-amber-500/50' : ''}
              />
            </Tooltip>
            {onRefresh && (
              <Tooltip title="Làm mới dữ liệu">
                <Button icon={<ReloadOutlined />} onClick={onRefresh} />
              </Tooltip>
            )}
            <Tooltip title="Cấu hình cột">
              <Button icon={<SettingOutlined />} onClick={openConfig} />
            </Tooltip>
          </Space>
        </div>
      }
      variant="outlined"
      style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
      styles={{ body: { padding: 0 } }}
      className="full-bleed-card shadow-sm rounded-xl"
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
        className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
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

export default React.memo(CcXoayTabComponent);

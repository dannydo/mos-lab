'use client';

import React from 'react';
import { Tabs, Select, Button, Table, Space, Avatar, Tag, Typography, theme } from 'antd';
import { SettingOutlined, PhoneOutlined, EyeOutlined } from '@ant-design/icons';
import { useOmiCall } from '../../../../context/OmiCallContext';
import { useTableConfig } from '../../../../hooks/useTableConfig';
import { TableConfigDrawer } from '../../../../components/TableConfigDrawer';
import { ComingClientData } from '../hooks/useTodayData';
import { SectionCard } from '../../../../components/ui';

const { Text } = Typography;

const getChannelColor = (channel: string) => {
  const c = (channel || '').toUpperCase();
  if (c.includes('FB')) return 'blue';
  if (c.includes('ZALO')) return 'cyan';
  if (c.includes('VL')) return 'magenta';
  if (c.includes('WEB')) return 'orange';
  if (c.includes('HOTLINE')) return 'red';
  if (c.includes('WA')) return 'green';
  if (c.includes('GB')) return 'geekblue';
  return 'purple';
};

const getStoreColor = (store: string) => {
  const s = (store || '').toLowerCase();
  if (s.includes('thám')) return 'gold';
  if (s.includes('pxl') || s.includes('long')) return 'blue';
  if (s.includes('estella') || s.includes('este')) return 'magenta';
  return 'cyan';
};

interface TodayComingTableProps {
  activeComingList: ComingClientData[];
  comingBranch: 'all' | 'detham' | 'pxl' | 'estella';
  setComingBranch: (branch: 'all' | 'detham' | 'pxl' | 'estella') => void;
  comingCategory: 'all' | 'combo' | 'oc' | 'other';
  setComingCategory: (category: 'all' | 'combo' | 'oc' | 'other') => void;
  selectedBooker?: string | null;
  setSelectedBooker?: (booker: string | null) => void;
  openCustomerDrawer: (record: SafeAny) => void;
  allComingList: ComingClientData[];
}

const TodayComingTable = React.memo(function TodayComingTable({
  activeComingList,
  comingBranch,
  setComingBranch,
  comingCategory,
  setComingCategory,
  selectedBooker,
  setSelectedBooker,
  openCustomerDrawer,
  allComingList,
}: TodayComingTableProps) {
  const { token } = theme.useToken();
  const { makeCall } = useOmiCall();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const tabCounts = React.useMemo(() => {
    const branchComing = (allComingList || []).filter((item) => {
      if (comingBranch !== 'all' && item.branchKey !== comingBranch) {
        return false;
      }
      return true;
    });

    const all = branchComing.length;
    let combo = 0;
    let oc = 0;
    let other = 0;

    branchComing.forEach((item) => {
      if (item.category === 'combo') combo++;
      else if (item.category === 'oc') oc++;
      else if (item.category === 'other') other++;
    });

    return { all, combo, oc, other };
  }, [allComingList, comingBranch]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('today_coming_page_size');
      if (saved) {
        setPageSize(parseInt(saved, 10));
      }
    }
  }, []);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [comingCategory, comingBranch]);

  const renderComingStatus = (status: 'completed' | 'serving' | 'arrived' | 'confirmed' | 'pending' | 'late') => {
    switch (status) {
      case 'completed':
        return <Tag color="success">Hoàn thành</Tag>;
      case 'serving':
      case 'arrived':
        return <Tag color="cyan">Đang làm</Tag>;
      case 'confirmed':
        return <Tag color="processing">Đã xác nhận</Tag>;
      case 'pending':
        return <Tag color="warning">Chờ đến</Tag>;
      case 'late':
        return <Tag color="error">Đến muộn</Tag>;
      default:
        return <Tag color="default">Chờ xử lý</Tag>;
    }
  };

  const comingColumns = [
    {
      title: 'STT',
      key: 'index',
      width: 50,
      align: 'center' as const,
      render: (_: SafeAny, __: SafeAny, index: number) => <Text type="secondary">{index + 1}</Text>,
    },
    {
      title: 'Giờ Hẹn',
      dataIndex: 'time',
      key: 'time',
      render: (t: string) => <strong style={{ color: '#D4A84B' }}>{t}</strong>,
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (b: string) => {
        const branchName = b || 'Đề Thám';
        const branchKey = branchName === 'Đề Thám' ? 'detham' : branchName === 'PXL' ? 'pxl' : 'estella';
        return (
          <Tag
            color={getStoreColor(branchName)}
            className="cursor-pointer hover:opacity-80 font-bold transition-opacity"
            onClick={() => setComingBranch(branchKey)}
            title={`Lọc danh sách khách đến theo chi nhánh: ${branchName}`}
          >
            {branchName}
          </Tag>
        );
      },
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: SafeAny, record: ComingClientData) => (
        <Space size="middle" style={{ cursor: 'pointer' }} onClick={() => openCustomerDrawer(record)}>
          <Avatar
            src={record.avatar || undefined}
            style={{
              backgroundColor: record.avatarColor || '#D4A84B',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
            size="small"
          >
            {record.customer.trim().split(' ').pop()?.substring(0, 2).toUpperCase()}
          </Avatar>
          <strong className="hover:underline">{record.customer}</strong>
        </Space>
      ),
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      render: (t: string, record: SafeAny) =>
        t ? (
          <span
            className="inline-flex items-center gap-1.5 cursor-pointer hover:underline select-text"
            onClick={() => makeCall(t, record.customer, record.customerId, record.avatar || undefined)}
            style={{ color: token.colorText, fontWeight: '600' }}
          >
            <PhoneOutlined style={{ color: '#D4A84B' }} />
            <span>{t}</span>
          </span>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Nhóm',
      dataIndex: 'group',
      key: 'group',
      render: (g: 'combo_live' | 'combo_dead' | 'single') => {
        if (g === 'combo_live')
          return (
            <Tag color="gold" style={{ fontWeight: 'bold' }}>
              combo live
            </Tag>
          );
        if (g === 'combo_dead') return <Tag color="error">combo dead</Tag>;
        return <Tag color="blue">single</Tag>;
      },
    },
    {
      title: 'Promo',
      dataIndex: 'promo',
      key: 'promo',
      render: (p: string | null) =>
        p ? (
          <Tag color="pink" style={{ fontSize: '10px' }}>
            {p}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Booker',
      dataIndex: 'booker',
      key: 'booker',
      render: (b: string) => (
        <span
          className="font-semibold text-amber-500 hover:underline cursor-pointer transition-colors"
          onClick={() => setSelectedBooker && setSelectedBooker(b)}
          title={`Lọc danh sách khách đến theo Booker: ${b}`}
        >
          {b}
        </span>
      ),
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      render: (c: string) => <Tag color={getChannelColor(c)}>{c || 'N/A'}</Tag>,
    },
    {
      title: 'CC',
      dataIndex: 'cc',
      key: 'cc',
      render: (cc: string) => <strong style={{ color: '#1890ff' }}>{cc}</strong>,
    },
    {
      title: 'CV',
      dataIndex: 'cv',
      key: 'cv',
      render: (cv: string) => (
        <Tag color={cv === 'Chưa phân công' ? 'default' : cv === 'Nghỉ phép' ? 'red' : 'blue'}>{cv}</Tag>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      align: 'right' as const,
      render: (status: SafeAny) => renderComingStatus(status),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right' as const,
      render: (_: SafeAny, record: ComingClientData) => (
        <Button
          size="small"
          type="link"
          icon={<EyeOutlined style={{ fontSize: '16px', color: '#D4A84B' }} />}
          onClick={() => openCustomerDrawer(record)}
          style={{ padding: 0 }}
        />
      ),
    },
  ];

  const {
    columns: comingConfigColumns,
    rawConfig: comingRawConfig,
    configVisible: comingConfigVisible,
    openConfig: openComingConfig,
    closeConfig: closeComingConfig,
    saveConfig: saveComingConfig,
    resetConfig: resetComingConfig,
  } = useTableConfig('today_coming_table', comingColumns);

  return (
    <SectionCard
      title={
        <div className="flex justify-between items-center flex-wrap gap-3">
          <span className="text-sm font-bold" style={{ color: token.colorPrimary }}>
            Danh sách khách đến cửa hàng ({activeComingList.length})
          </span>
          <Space>
            <Select
              value={comingBranch}
              onChange={(val) => {
                setComingBranch(val);
                localStorage.setItem('today_coming_branch', val);
              }}
              options={[
                { value: 'all', label: 'Tất cả chi nhánh' },
                { value: 'detham', label: 'Đề Thám' },
                { value: 'pxl', label: 'Phan Xích Long' },
                { value: 'estella', label: 'Estella' },
              ]}
              style={{ width: '180px' }}
            />
            <Button icon={<SettingOutlined />} onClick={openComingConfig}>
              Cấu hình cột
            </Button>
          </Space>
        </div>
      }
      bodyPadding="12px"
    >
      <Tabs
        activeKey={comingCategory}
        onChange={(key) => {
          setComingCategory(key as SafeAny);
          localStorage.setItem('today_coming_category', key);
        }}
        items={[
          { key: 'all', label: `Tất cả khách đến (${tabCounts.all})` },
          { key: 'combo', label: `Khách gói Combo (${tabCounts.combo})` },
          { key: 'oc', label: `Khách Telesales (${tabCounts.oc})` },
          { key: 'other', label: `Khách Lẻ / Khác (${tabCounts.other})` },
        ]}
        size="small"
        style={{ marginBottom: '12px' }}
      />

      {(comingBranch !== 'all' || selectedBooker) && (
        <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Bộ lọc đang mở:</span>
          {comingBranch !== 'all' && (
            <Tag
              color="cyan"
              closable
              onClose={() => setComingBranch('all')}
              className="font-semibold text-xs py-0.5"
            >
              Chi nhánh: {comingBranch === 'detham' ? 'Đề Thám' : comingBranch === 'pxl' ? 'PXL' : 'Estella'}
            </Tag>
          )}
          {selectedBooker && (
            <Tag
              color="gold"
              closable
              onClose={() => setSelectedBooker && setSelectedBooker(null)}
              className="font-semibold text-xs py-0.5"
            >
              Booker: {selectedBooker}
            </Tag>
          )}
          <Button
            type="link"
            size="small"
            danger
            className="text-xs p-0 h-auto font-medium"
            onClick={() => {
              setComingBranch('all');
              if (setSelectedBooker) setSelectedBooker(null);
            }}
          >
            Xoá bộ lọc
          </Button>
        </div>
      )}

      <Table
        dataSource={activeComingList}
        columns={comingConfigColumns}
        rowKey={(record) => record.key || `${record.customer}-${record.time}`}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
            localStorage.setItem('today_coming_page_size', size.toString());
          },
          showTotal: (total) => `Tổng số: ${total} khách`,
        }}
        size="small"
        bordered
        className="antd-custom-table"
      />

      <TableConfigDrawer
        visible={comingConfigVisible}
        onClose={closeComingConfig}
        columns={comingRawConfig}
        onSave={saveComingConfig}
        onReset={resetComingConfig}
      />
    </SectionCard>
  );
});

export default TodayComingTable;

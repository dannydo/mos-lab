'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Input,
  Tag,
  Button,
  Space,
  Badge,
  Tooltip,
  Switch,
  Statistic,
  Row,
  Col,
  Typography,
  theme,
  Spin,
  Empty,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import dayjs from 'dayjs';
import { apiClient } from '../../../../lib/api-client';
import { ComboLiveSummaryItem, ComboLiveOwnerItem, ComboLiveResponse } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';

const CustomerDetailDrawer = dynamic(() => import('../../../../components/CustomerDetailDrawer'), { ssr: false });

const { Text, Title } = Typography;

export default function CatalogComboLiveTab() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<ComboLiveSummaryItem[]>([]);
  const [meta, setMeta] = useState<ComboLiveResponse['meta']>({
    totalCombos: 0,
    totalActiveOwners: 0,
    totalNormalBalance: 0,
    totalRetainBalance: 0,
    totalExpiringSoonOwners: 0,
  });

  const [search, setSearch] = useState<string>('');
  const [expiringSoon, setExpiringSoon] = useState<boolean>(false);

  // Controlled Pagination State (Rule #24)
  const [page, setPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catalog_combo_live_page');
      return saved ? parseInt(saved, 10) || 1 : 1;
    }
    return 1;
  });

  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('catalog_combo_live_pagesize');
      return saved ? parseInt(saved, 10) || 10 : 10;
    }
    return 10;
  });

  const handlePaginationChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
    if (typeof window !== 'undefined') {
      localStorage.setItem('catalog_combo_live_page', String(newPage));
      localStorage.setItem('catalog_combo_live_pagesize', String(newPageSize));
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('catalog_combo_live_page', '1');
    }
  };

  const handleExpiringSoonChange = (checked: boolean) => {
    setExpiringSoon(checked);
    setPage(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('catalog_combo_live_page', '1');
    }
  };

  // Customer Drawer detail state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState<boolean>(false);

  const fetchComboLive = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.catalog.getComboLive({
        search: search.trim() || undefined,
        expiringSoon: expiringSoon || undefined,
      });

      if (res && res.success) {
        setData(res.data || []);
        setMeta(
          res.meta || {
            totalCombos: 0,
            totalActiveOwners: 0,
            totalNormalBalance: 0,
            totalRetainBalance: 0,
            totalExpiringSoonOwners: 0,
          }
        );
      }
    } catch (err) {
      console.error('Failed to fetch combo live data:', err);
    } finally {
      setLoading(false);
    }
  }, [search, expiringSoon]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchComboLive();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchComboLive]);

  const handleOpenCustomer = (userId: number) => {
    setSelectedCustomerId(userId);
    setCustomerDrawerOpen(true);
  };

  // ─── Child Table (Expanded Row: List of Owners) ───────────────────────────
  const renderExpandedRow = (record: ComboLiveSummaryItem) => {
    const ownerColumns = [
      {
        title: 'STT',
        key: 'stt',
        width: 50,
        align: 'center' as const,
        render: (_: any, __: any, index: number) => (
          <span className="tabular-nums text-xs font-semibold text-slate-400 dark:text-slate-400">{index + 1}</span>
        ),
      },
      {
        title: 'Khách hàng',
        dataIndex: 'customerName',
        key: 'customerName',
        render: (text: string, owner: ComboLiveOwnerItem) => (
          <div
            onClick={() => handleOpenCustomer(owner.userId)}
            className="cursor-pointer group inline-flex items-center gap-1.5 transition-all"
            title={`Bấm để xem hồ sơ chi tiết ${text}`}
          >
            <UserOutlined className="text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-amber-400 group-hover:underline">
              {text}
            </span>
            <Tag color="blue" className="text-xs font-mono group-hover:border-amber-400">
              #{owner.userId}
            </Tag>
          </div>
        ),
      },
      {
        title: 'Số điện thoại',
        dataIndex: 'customerPhone',
        key: 'customerPhone',
        render: (phone?: string) =>
          phone ? (
            <Space size={4}>
              <PhoneOutlined className="text-emerald-400 text-xs" />
              <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">{phone}</span>
            </Space>
          ) : (
            <span className="text-slate-500">-</span>
          ),
      },
      {
        title: 'Lượt nối còn',
        dataIndex: 'normalCount',
        key: 'normalCount',
        align: 'center' as const,
        render: (count: number) => (
          <Tag color="emerald" className="font-bold tabular-nums text-sm">
            {count} lượt
          </Tag>
        ),
      },
      {
        title: 'Lượt dặm còn',
        dataIndex: 'retainCount',
        key: 'retainCount',
        align: 'center' as const,
        render: (count: number) => (
          <Tag color={count > 0 ? 'cyan' : 'default'} className="font-semibold tabular-nums text-xs">
            {count} lượt
          </Tag>
        ),
      },
      {
        title: 'Hạn sử dụng',
        dataIndex: 'dateExpired',
        key: 'dateExpired',
        render: (_: any, owner: ComboLiveOwnerItem) => {
          if (!owner.dateExpired) {
            return <Tag color="green">Vô thời hạn</Tag>;
          }
          const formatted = dayjs(owner.dateExpired).format('DD/MM/YYYY');
          if (owner.isExpiringSoon) {
            return (
              <Space size="small">
                <span className="tabular-nums text-xs text-amber-400 font-semibold">{formatted}</span>
                <Tag color="error" className="tabular-nums font-bold text-xs">
                  Còn {owner.daysRemaining ?? 0} ngày
                </Tag>
              </Space>
            );
          }
          return (
            <Space size="small">
              <span className="tabular-nums text-xs text-slate-600 dark:text-slate-300">{formatted}</span>
              {owner.daysRemaining !== null && (
                <Tag color="success" className="tabular-nums text-xs">
                  Còn {owner.daysRemaining} ngày
                </Tag>
              )}
            </Space>
          );
        },
      },
      {
        title: 'Ngày mua',
        dataIndex: 'dateCreated',
        key: 'dateCreated',
        render: (dateStr: string) => (
          <span className="tabular-nums text-xs text-slate-400 dark:text-slate-400">
            {dayjs(dateStr).format('DD/MM/YYYY')}
          </span>
        ),
      },
      {
        title: 'Thao tác',
        key: 'action',
        align: 'right' as const,
        render: (_: any, owner: ComboLiveOwnerItem) => (
          <Button
            type="primary"
            ghost
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenCustomer(owner.userId)}
            className="hover:scale-105 transition-all text-xs"
          >
            Xem hồ sơ
          </Button>
        ),
      },
    ];

    return (
      <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 shadow-inner my-1">
        <div className="flex justify-between items-center mb-2 px-1">
          <Text className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
            <UserOutlined /> Danh sách {record.owners.length} khách hàng đang giữ gói &quot;{record.comboName}&quot;
          </Text>
          {record.expiringSoonOwnerCount > 0 && (
            <Tag color="warning" icon={<ExclamationCircleOutlined />}>
              {record.expiringSoonOwnerCount} khách sắp hết hạn (&lt; 30 ngày)
            </Tag>
          )}
        </div>
        <Table
          columns={ownerColumns}
          dataSource={record.owners}
          rowKey="balanceId"
          pagination={false}
          size="small"
          className="ant-table-dark-custom"
          style={{ background: 'transparent' }}
        />
      </div>
    );
  };

  // ─── Main Columns (Grouped Combos) ─────────────────────────────────────────
  const mainColumns = [
    {
      title: 'Tên Gói Combo',
      dataIndex: 'comboName',
      key: 'comboName',
      render: (name: string, record: ComboLiveSummaryItem) => (
        <Space direction="vertical" size={2}>
          <Space>
            <ThunderboltOutlined className="text-amber-400 text-base" />
            <span className="font-bold text-base text-slate-700 dark:text-slate-100">{name}</span>
          </Space>
          {record.packageKey && record.packageKey !== name && (
            <Tag color="purple" className="text-xs font-mono">
              Key: {record.packageKey}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Giá gói (VNĐ)',
      dataIndex: 'packagePrice',
      key: 'packagePrice',
      align: 'right' as const,
      render: (price: number) => (
        <span className="font-extrabold text-amber-400 tabular-nums text-sm">
          {Math.round(price).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Số khách đang giữ',
      dataIndex: 'ownerCount',
      key: 'ownerCount',
      align: 'center' as const,
      render: (count: number, record: ComboLiveSummaryItem) => (
        <Badge
          count={record.expiringSoonOwnerCount ? `${record.expiringSoonOwnerCount} sắp hết hạn` : 0}
          offset={[10, 0]}
          color="#f59e0b"
        >
          <Tag color="gold" className="font-bold tabular-nums px-2.5 py-0.5 text-sm">
            {count} người
          </Tag>
        </Badge>
      ),
    },
    {
      title: 'Tổng lượt nối tồn (Normal)',
      dataIndex: 'totalNormalBalance',
      key: 'totalNormalBalance',
      align: 'center' as const,
      render: (total: number) => (
        <Tag color="emerald" className="font-extrabold tabular-nums px-2.5 py-0.5 text-sm">
          {total} lượt
        </Tag>
      ),
    },
    {
      title: 'Tổng lượt dặm tồn (Retain)',
      dataIndex: 'totalRetainBalance',
      key: 'totalRetainBalance',
      align: 'center' as const,
      render: (total: number) => (
        <Tag color={total > 0 ? 'cyan' : 'default'} className="font-bold tabular-nums px-2 py-0.5 text-xs">
          {total} lượt
        </Tag>
      ),
    },
    {
      title: 'Hạn gói gốc',
      dataIndex: 'expiryAfterDay',
      key: 'expiryAfterDay',
      align: 'center' as const,
      render: (days: number) => (
        <span className="tabular-nums text-xs text-slate-600 dark:text-slate-300">
          {days > 0 ? `${days} ngày` : 'Vô thời hạn'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* ─── Metric Overview Cards ────────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card
            variant="outlined"
            className="shadow-sm rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm"
            styles={{ body: { padding: '16px' } }}
          >
            <Statistic
              title={<span className="text-xs font-medium text-slate-400">Gói Combo đang có khách dùng</span>}
              value={meta.totalCombos}
              valueStyle={{ color: '#f59e0b', fontWeight: 800, fontFamily: 'monospace' }}
              prefix={<ThunderboltOutlined className="text-amber-500 mr-1" />}
              suffix={<span className="text-xs text-slate-400 ml-1">loại gói</span>}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            variant="outlined"
            className="shadow-sm rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm"
            styles={{ body: { padding: '16px' } }}
          >
            <Statistic
              title={<span className="text-xs font-medium text-slate-400">Tổng số Khách hàng sở hữu</span>}
              value={meta.totalActiveOwners}
              valueStyle={{ color: '#38bdf8', fontWeight: 800, fontFamily: 'monospace' }}
              prefix={<UserOutlined className="text-sky-400 mr-1" />}
              suffix={<span className="text-xs text-slate-400 ml-1">khách</span>}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            variant="outlined"
            className="shadow-sm rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm"
            styles={{ body: { padding: '16px' } }}
          >
            <Statistic
              title={<span className="text-xs font-medium text-slate-400">Tổng lượt Nối tồn (Normal)</span>}
              value={meta.totalNormalBalance}
              valueStyle={{ color: '#34d399', fontWeight: 800, fontFamily: 'monospace' }}
              prefix={<SafetyCertificateOutlined className="text-emerald-400 mr-1" />}
              suffix={<span className="text-xs text-slate-400 ml-1">lượt</span>}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            variant="outlined"
            className="shadow-sm rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm"
            styles={{ body: { padding: '16px' } }}
          >
            <Statistic
              title={<span className="text-xs font-medium text-slate-400">Sắp hết hạn (&lt; 30 ngày)</span>}
              value={meta.totalExpiringSoonOwners}
              valueStyle={{
                color: meta.totalExpiringSoonOwners > 0 ? '#ef4444' : '#10b981',
                fontWeight: 800,
                fontFamily: 'monospace',
              }}
              prefix={
                <ClockCircleOutlined
                  className={meta.totalExpiringSoonOwners > 0 ? 'text-red-400 mr-1' : 'text-emerald-400 mr-1'}
                />
              }
              suffix={<span className="text-xs text-slate-400 ml-1">khách</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* ─── Toolbar Controls ────────────────────────────────────────────── */}
      <Card
        variant="outlined"
        className="shadow-sm rounded-xl border border-slate-800 bg-slate-900/40"
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div className="flex flex-row items-center gap-3 flex-nowrap overflow-x-auto">
          <Input
            placeholder="Tìm theo tên Combo / Khách / SĐT..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            allowClear
            style={{ width: 280 }}
            className="rounded-lg shrink-0"
          />

          <div className="inline-flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 shrink-0 whitespace-nowrap">
            <Switch checked={expiringSoon} onChange={(checked) => handleExpiringSoonChange(checked)} size="small" />
            <Text
              className="text-xs text-slate-600 dark:text-slate-300 font-medium cursor-pointer select-none"
              onClick={() => handleExpiringSoonChange(!expiringSoon)}
            >
              Chỉ hiện Combo sắp hết hạn (&lt; 30 ngày)
            </Text>
          </div>

          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={() => fetchComboLive()}
            className="rounded-lg shrink-0"
          >
            Làm mới
          </Button>
        </div>
      </Card>

      {/* ─── Grouped Combo Table ──────────────────────────────────────────── */}
      <Card
        variant="outlined"
        className="shadow-sm rounded-xl border border-slate-800"
        styles={{ body: { padding: 0 } }}
      >
        {loading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
            <Spin size="large" />
            <span className="text-xs text-slate-400 font-medium">Đang tải dữ liệu Combo Live...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center">
            <Empty description="Không tìm thấy dữ liệu Combo Live phù hợp" />
          </div>
        ) : (
          <Table
            columns={mainColumns}
            dataSource={data}
            rowKey={(item) => item.id}
            expandable={{
              expandedRowRender: (record) => renderExpandedRow(record),
              expandRowByClick: true,
            }}
            pagination={{
              current: page,
              pageSize: pageSize,
              onChange: handlePaginationChange,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} loại Combo`,
            }}
            className="rounded-xl overflow-hidden"
          />
        )}
      </Card>

      {/* ─── Customer Detail Drawer ─────────────────────────────────────── */}
      {selectedCustomerId && (
        <CustomerDetailDrawer
          customerId={selectedCustomerId}
          open={customerDrawerOpen}
          onClose={() => {
            setCustomerDrawerOpen(false);
            setSelectedCustomerId(null);
          }}
        />
      )}
    </div>
  );
}

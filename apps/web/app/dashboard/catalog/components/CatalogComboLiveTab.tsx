'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CalendarClock, CircleAlert, Eye, Phone, RefreshCw, ShieldCheck, UserRound, Users, Zap } from 'lucide-react';
import dynamic from 'next/dynamic';
import dayjs from 'dayjs';
import { apiClient } from '../../../../lib/api-client';
import { ComboLiveOwnerItem, ComboLiveResponse, ComboLiveSummaryItem } from '@mos-lab/shared';
import {
  AppIcon,
  DataSection,
  DataTable,
  FeatureToolbar,
  IconButton,
  MetricGrid,
  SearchField,
  StatePanel,
  StatusTag,
  TableIndexHeader,
  ToolbarToggle,
} from '~/components/ui';
import styles from './CatalogComboLiveTab.module.css';

const CustomerDetailDrawer = dynamic(() => import('../../../../components/CustomerDetailDrawer'), { ssr: false });

const EMPTY_META: ComboLiveResponse['meta'] = {
  totalCombos: 0,
  totalActiveOwners: 0,
  totalNormalBalance: 0,
  totalRetainBalance: 0,
  totalExpiringSoonOwners: 0,
};

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')} đ`;
}

export default function CatalogComboLiveTab() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [data, setData] = useState<ComboLiveSummaryItem[]>([]);
  const [meta, setMeta] = useState<ComboLiveResponse['meta']>(EMPTY_META);
  const [search, setSearch] = useState('');
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [page, setPage] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const saved = localStorage.getItem('catalog_combo_live_page');
    return saved ? parseInt(saved, 10) || 1 : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window === 'undefined') return 10;
    const saved = localStorage.getItem('catalog_combo_live_pagesize');
    return saved ? parseInt(saved, 10) || 10 : 10;
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);

  const persistPage = (nextPage: number, nextPageSize = pageSize) => {
    setPage(nextPage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('catalog_combo_live_page', String(nextPage));
      localStorage.setItem('catalog_combo_live_pagesize', String(nextPageSize));
    }
  };

  const handlePaginationChange = (nextPage: number, nextPageSize: number) => {
    setPageSize(nextPageSize);
    persistPage(nextPage, nextPageSize);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    persistPage(1);
  };

  const handleExpiringSoonChange = (checked: boolean) => {
    setExpiringSoon(checked);
    persistPage(1);
  };

  const fetchComboLive = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    try {
      const response = await apiClient.catalog.getComboLive({
        search: search.trim() || undefined,
        expiringSoon: expiringSoon || undefined,
      });

      if (response?.success) {
        setData(response.data || []);
        setMeta(response.meta || EMPTY_META);
        return;
      }

      setLoadError('Không thể tải dữ liệu Combo Live.');
    } catch (error) {
      console.error('Failed to fetch combo live data:', error);
      setLoadError('Không thể tải dữ liệu Combo Live.');
    } finally {
      setLoading(false);
    }
  }, [expiringSoon, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchComboLive(), 300);
    return () => window.clearTimeout(timer);
  }, [fetchComboLive]);

  const handleOpenCustomer = useCallback((userId: number) => {
    setSelectedCustomerId(userId);
    setCustomerDrawerOpen(true);
  }, []);

  const ownerColumns = useMemo<ColumnsType<ComboLiveOwnerItem>>(
    () => [
      {
        title: <TableIndexHeader />,
        key: 'stt',
        width: 48,
        align: 'center',
        render: (_value, _record, index) => <span className={styles.indexCell}>{index + 1}</span>,
      },
      {
        title: 'Khách hàng',
        dataIndex: 'customerName',
        key: 'customerName',
        render: (name: string, owner) => (
          <Button
            type="link"
            className={styles.customerLink}
            icon={<AppIcon icon={UserRound} size="disclosure" />}
            onClick={() => handleOpenCustomer(owner.userId)}
          >
            <span>{name}</span>
            <StatusTag status="processing" label={`#${owner.userId}`} bordered={false} />
          </Button>
        ),
      },
      {
        title: 'Số điện thoại',
        dataIndex: 'customerPhone',
        key: 'customerPhone',
        render: (phone?: string) =>
          phone ? (
            <span className={styles.phoneCell}>
              <AppIcon icon={Phone} size="disclosure" />
              <span className="tabular-nums">{phone}</span>
            </span>
          ) : (
            '-'
          ),
      },
      {
        title: 'Lượt nối còn',
        dataIndex: 'normalCount',
        key: 'normalCount',
        align: 'center',
        render: (count: number) => <StatusTag status="success" label={`${count} lượt`} />,
      },
      {
        title: 'Lượt dặm còn',
        dataIndex: 'retainCount',
        key: 'retainCount',
        align: 'center',
        render: (count: number) => <StatusTag status={count > 0 ? 'cyan' : 'default'} label={`${count} lượt`} />,
      },
      {
        title: 'Hạn sử dụng',
        dataIndex: 'dateExpired',
        key: 'dateExpired',
        render: (_value, owner) => {
          if (!owner.dateExpired) return <StatusTag status="success" label="Vô thời hạn" />;

          const daysRemaining = owner.daysRemaining;
          const isUrgent = owner.isExpiringSoon;
          return (
            <span className={styles.expiryCell}>
              <span className="tabular-nums">{dayjs(owner.dateExpired).format('DD/MM/YYYY')}</span>
              {daysRemaining !== null && (
                <StatusTag status={isUrgent ? 'error' : 'success'} label={`Còn ${daysRemaining} ngày`} />
              )}
            </span>
          );
        },
      },
      {
        title: 'Ngày mua',
        dataIndex: 'dateCreated',
        key: 'dateCreated',
        render: (value: string) => <span className={styles.mutedDate}>{dayjs(value).format('DD/MM/YYYY')}</span>,
      },
      {
        title: 'Thao tác',
        key: 'action',
        align: 'right',
        render: (_value, owner) => (
          <Button
            type="text"
            icon={<AppIcon icon={Eye} size="disclosure" />}
            onClick={() => handleOpenCustomer(owner.userId)}
          >
            Xem hồ sơ
          </Button>
        ),
      },
    ],
    [handleOpenCustomer]
  );

  const mainColumns = useMemo<ColumnsType<ComboLiveSummaryItem>>(
    () => [
      {
        title: 'Tên Gói Combo',
        dataIndex: 'comboName',
        key: 'comboName',
        render: (name: string, record) => (
          <div className={styles.comboNameCell}>
            <span>
              <AppIcon icon={Zap} size="disclosure" />
              <strong>{name}</strong>
            </span>
            {record.packageKey && record.packageKey !== name && (
              <StatusTag status="purple" label={record.packageKey} bordered={false} />
            )}
          </div>
        ),
      },
      {
        title: 'Giá gói (VNĐ)',
        dataIndex: 'packagePrice',
        key: 'packagePrice',
        align: 'right',
        render: (value: number) => <strong className={styles.currencyValue}>{formatVnd(value)}</strong>,
      },
      {
        title: 'Khách đang giữ',
        dataIndex: 'ownerCount',
        key: 'ownerCount',
        align: 'center',
        render: (count: number, record) => (
          <span className={styles.ownerStatus}>
            <StatusTag status="gold" label={`${count} khách`} />
            {record.expiringSoonOwnerCount > 0 && (
              <StatusTag status="warning" label={`${record.expiringSoonOwnerCount} sắp hết hạn`} />
            )}
          </span>
        ),
      },
      {
        title: 'Lượt nối còn',
        dataIndex: 'totalNormalBalance',
        key: 'totalNormalBalance',
        align: 'center',
        render: (value: number) => <StatusTag status="success" label={`${value} lượt`} />,
      },
      {
        title: 'Lượt dặm còn',
        dataIndex: 'totalRetainBalance',
        key: 'totalRetainBalance',
        align: 'center',
        render: (value: number) => <StatusTag status={value > 0 ? 'cyan' : 'default'} label={`${value} lượt`} />,
      },
      {
        title: 'Hạn gói gốc',
        dataIndex: 'expiryAfterDay',
        key: 'expiryAfterDay',
        align: 'center',
        render: (days: number) => <span className={styles.mutedDate}>{days > 0 ? `${days} ngày` : 'Vô thời hạn'}</span>,
      },
    ],
    []
  );

  const metrics = [
    {
      key: 'combos',
      title: 'Gói Combo đang dùng',
      value: meta.totalCombos,
      format: 'number' as const,
      icon: <AppIcon icon={Zap} size="md" />,
      subValue: 'loại gói',
      loading,
    },
    {
      key: 'owners',
      title: 'Khách hàng sở hữu',
      value: meta.totalActiveOwners,
      format: 'number' as const,
      icon: <AppIcon icon={Users} size="md" />,
      subValue: 'khách',
      loading,
    },
    {
      key: 'normal-balance',
      title: 'Lượt nối còn',
      value: meta.totalNormalBalance,
      format: 'number' as const,
      icon: <AppIcon icon={ShieldCheck} size="md" />,
      subValue: 'lượt',
      loading,
    },
    {
      key: 'expiring',
      title: 'Sắp hết hạn',
      value: meta.totalExpiringSoonOwners,
      format: 'number' as const,
      icon: <AppIcon icon={CalendarClock} size="md" />,
      subValue: 'khách trong 30 ngày',
      loading,
    },
  ];

  const renderExpandedRow = (record: ComboLiveSummaryItem) => (
    <div className={styles.expandedRow}>
      <div className={styles.expandedRowHeader}>
        <span>
          <AppIcon icon={Users} size="sm" />
          Danh sách {record.owners.length} khách đang giữ “{record.comboName}”
        </span>
        {record.expiringSoonOwnerCount > 0 && (
          <StatusTag
            status="warning"
            icon={<AppIcon icon={CircleAlert} size="sm" />}
            label={`${record.expiringSoonOwnerCount} khách sắp hết hạn`}
          />
        )}
      </div>
      <DataTable<ComboLiveOwnerItem>
        columns={ownerColumns}
        dataSource={record.owners}
        rowKey="balanceId"
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
        className={styles.ownerTable}
      />
    </div>
  );

  return (
    <div className={styles.page}>
      <MetricGrid items={metrics} columns={4} className={styles.metricGrid} />

      <FeatureToolbar
        primary={
          <SearchField
            behavior="filter"
            className={styles.searchField}
            placeholder="Tìm theo tên Combo, khách hoặc SĐT…"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            allowClear
          />
        }
        filters={
          <ToolbarToggle
            label="Sắp hết hạn trong 30 ngày"
            aria-label="Chỉ hiện Combo sắp hết hạn trong 30 ngày"
            checked={expiringSoon}
            onChange={handleExpiringSoonChange}
          />
        }
        actions={
          <IconButton
            label="Làm mới Combo Live"
            icon={RefreshCw}
            onClick={() => void fetchComboLive()}
            loading={loading}
          />
        }
        filterTitle="Lọc Combo Live"
        filterTriggerLabel="Mở bộ lọc Combo Live"
        activeFilterCount={expiringSoon ? 1 : 0}
      />

      <DataSection
        title={
          <span className={styles.dataSectionTitle}>
            <AppIcon icon={Zap} size="sm" />
            Gói Combo đang được sử dụng
          </span>
        }
        extra={!loading && <StatusTag status="default" label={`${data.length.toLocaleString('vi-VN')} loại gói`} />}
        state={loading ? 'loading' : loadError ? 'error' : data.length === 0 ? 'empty' : undefined}
        stateTitle={loadError || (data.length === 0 ? 'Không tìm thấy Combo Live phù hợp' : 'Đang tải Combo Live')}
        stateDescription={loadError ? 'Hãy thử làm mới dữ liệu hoặc đổi điều kiện tìm kiếm.' : undefined}
        stateExtra={loadError ? <Button onClick={() => void fetchComboLive()}>Thử lại</Button> : undefined}
        stateMinHeight={320}
        bodyPadding={data.length > 0 ? 0 : undefined}
      >
        <DataTable<ComboLiveSummaryItem>
          columns={mainColumns}
          dataSource={data}
          rowKey="id"
          expandable={{ expandedRowRender: renderExpandedRow, expandRowByClick: true }}
          pagination={{
            current: page,
            pageSize,
            onChange: handlePaginationChange,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} loại Combo`,
          }}
          scroll={{ x: 'max-content' }}
        />
      </DataSection>

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

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Table, Input, Card, Space, Button, Tag, Typography, theme, Spin, Tabs } from 'antd';
import { SearchOutlined, ShareAltOutlined, EyeOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import type { ReferralTabCounts, ReferrerSummaryItem } from '@mos-lab/shared';
import { useTheme } from '../../../context/ThemeContext';
import { apiClient } from '../../../lib/api-client';
import { CopyPhoneButton, DataTable } from '../../../components/ui';

const CustomerDetailDrawer = dynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });

const { Title, Text } = Typography;

type ReferralTimeFilterKey = 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'all_time';

const EMPTY_TAB_COUNTS: ReferralTabCounts = {
  all_time: 0,
  this_month: 0,
  last_month: 0,
  this_year: 0,
  last_year: 0,
};

export default function ReferralsPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [loading, setLoading] = useState(false);
  const [referrers, setReferrers] = useState<ReferrerSummaryItem[]>([]);
  const [totalReferrers, setTotalReferrers] = useState(0);
  const [tabCounts, setTabCounts] = useState<ReferralTabCounts>(EMPTY_TAB_COUNTS);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [timeFilter, setTimeFilter] = useState<ReferralTimeFilterKey>('all_time');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_referrals_pageSize');
      if (saved && Number.isFinite(Number(saved)) && Number(saved) > 0) {
        setPageSize(Number(saved));
      }
      const urlParams = new URLSearchParams(window.location.search);
      const urlFilter = urlParams.get('timeFilter') || urlParams.get('tab');
      const savedFilter = urlFilter || localStorage.getItem('mos_referrals_timeFilter');
      if (savedFilter && ['this_month', 'last_month', 'this_year', 'last_year', 'all_time'].includes(savedFilter)) {
        setTimeFilter(savedFilter as ReferralTimeFilterKey);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch((prev) => {
        const next = searchText.trim();
        if (prev !== next) {
          setCurrentPage(1);
        }
        return next;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const handleTimeFilterChange = (key: string) => {
    setTimeFilter(key as ReferralTimeFilterKey);
    setCurrentPage(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_referrals_timeFilter', key);
      const url = new URL(window.location.href);
      url.searchParams.set('timeFilter', key);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  const handlePageSizeChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
    localStorage.setItem('mos_referrals_pageSize', String(size));
  };

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.customers.getReferrals({
        timeFilter,
        search: debouncedSearch || undefined,
        page: currentPage,
        pageSize,
      });
      if (Array.isArray(data)) {
        setReferrers(data as unknown as ReferrerSummaryItem[]);
        setTotalReferrers(data.length);
      } else {
        setReferrers(data?.items || []);
        setTotalReferrers(Number(data?.total || 0));
        if (data?.tabCounts) {
          setTabCounts(data.tabCounts);
        }
      }
    } catch (err) {
      console.error('[ReferralsPage] Failed to fetch referrals:', err);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, debouncedSearch, currentPage, pageSize]);

  useEffect(() => {
    void fetchReferrals();
  }, [fetchReferrals]);

  const showCustomerDetails = useCallback((id: number) => {
    setSelectedCustomerId(id);
    setDrawerOpen(true);
  }, []);

  const columns = React.useMemo(
    () => [
      {
        title: 'Khách hàng giới thiệu',
        key: 'referrer',
        render: (record: ReferrerSummaryItem) => (
          <Space direction="vertical" size={2}>
            <span
              onClick={() => showCustomerDetails(record.referrerId)}
              style={{
                fontWeight: 'bold',
                color: token.colorPrimary,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {record.referrerName}
            </span>
            <Text type="secondary" style={{ fontSize: '12px' }} className="inline-flex items-center gap-1">
              <span>SĐT: {record.referrerPhone}</span>
              {record.referrerPhone && <CopyPhoneButton phone={record.referrerPhone} size="xs" />}
            </Text>
          </Space>
        ),
      },
      {
        title: 'Số người đã giới thiệu',
        dataIndex: 'totalReferred',
        key: 'totalReferred',
        sorter: (a: ReferrerSummaryItem, b: ReferrerSummaryItem) => a.totalReferred - b.totalReferred,
        render: (val: number) => (
          <Tag color="blue" className="tabular-nums font-mono" style={{ fontWeight: 'bold', borderRadius: '4px' }}>
            {val} người bạn
          </Tag>
        ),
      },
      {
        title: 'Tổng Kim Cương tích luỹ',
        dataIndex: 'totalRewardDiamonds',
        key: 'totalRewardDiamonds',
        sorter: (a: ReferrerSummaryItem, b: ReferrerSummaryItem) => a.totalRewardDiamonds - b.totalRewardDiamonds,
        render: (val: number) => (
          <Tag color="warning" className="tabular-nums font-mono" style={{ fontWeight: 'bold', borderRadius: '4px' }}>
            💎 {val} KC
          </Tag>
        ),
      },
      {
        title: 'Hành động',
        key: 'actions',
        render: (record: ReferrerSummaryItem) => (
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => showCustomerDetails(record.referrerId)}
            style={{ padding: 0 }}
          >
            Xem chi tiết khách hàng
          </Button>
        ),
      },
    ],
    [token, showCustomerDetails]
  );

  const subColumns = React.useMemo(
    () => [
      {
        title: 'Bạn bè được giới thiệu',
        key: 'name',
        render: (subRec: SafeAny) => (
          <span
            onClick={() => showCustomerDetails(subRec.id)}
            style={{
              fontWeight: '600',
              color: token.colorPrimary,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {subRec.name}
          </span>
        ),
      },
      {
        title: 'Số điện thoại',
        dataIndex: 'phone',
        key: 'phone',
        render: (phone: string) =>
          phone ? (
            <span className="tabular-nums font-mono inline-flex items-center gap-1">
              <span>{phone}</span>
              <CopyPhoneButton phone={phone} size="xs" />
            </span>
          ) : (
            '-'
          ),
      },
      {
        title: 'Ngày tham gia',
        dataIndex: 'dateCreated',
        key: 'dateCreated',
        render: (text: string) => (text ? new Date(text).toLocaleDateString('vi-VN') : 'N/A'),
      },
      {
        title: 'Kim Cương thưởng',
        dataIndex: 'rewardDiamonds',
        key: 'rewardDiamonds',
        render: (val: number) => (
          <span className="tabular-nums font-mono" style={{ fontWeight: 'bold', color: val > 0 ? '#52c41a' : '#888' }}>
            {val > 0 ? `+${val} 💎` : '0 💎'}
          </span>
        ),
      },
    ],
    [token.colorPrimary, showCustomerDetails]
  );

  const expandedRowRender = useCallback(
    (record: ReferrerSummaryItem) => {
      return (
        <Table
          columns={subColumns}
          dataSource={record.referredUsers || []}
          pagination={false}
          rowKey="id"
          size="small"
          bordered
          locale={{ emptyText: 'Chưa có thông tin bạn bè.' }}
          style={{ margin: '8px 0' }}
        />
      );
    },
    [subColumns]
  );

  return (
    <div
      className="responsive-page responsive-workspace referrals-page"
      style={{ padding: '24px', minHeight: '100vh' }}
    >
      {/* Header card */}
      <Card
        style={{
          marginBottom: '20px',
          background: token.colorBgContainer,
          borderColor: token.colorBorderSecondary,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <Space size={12}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(212, 168, 75, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D4A84B',
                fontSize: '20px',
              }}
            >
              <ShareAltOutlined />
            </div>
            <div>
              <Title level={3} style={{ margin: 0, color: token.colorText }}>
                QUẢN LÝ GIỚI THIỆU KHÁCH HÀNG
              </Title>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Danh sách khách hàng đã giới thiệu bạn bè tham gia làm mi tại Mosquito Lashes.
              </Text>
            </div>
          </Space>

          <Input
            placeholder="Tìm kiếm theo tên, SĐT khách giới thiệu..."
            prefix={<SearchOutlined style={{ color: '#888' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '320px', borderRadius: '6px' }}
            allowClear
          />
        </div>
      </Card>

      {/* Time Filter Tabs */}
      <Card
        style={{
          marginBottom: '16px',
          background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }}
        styles={{ body: { padding: '0px 16px' } }}
      >
        <Tabs
          activeKey={timeFilter}
          onChange={handleTimeFilterChange}
          style={{ marginBottom: 0 }}
          items={[
            { key: 'all_time', label: `All time (${tabCounts.all_time})` },
            { key: 'this_month', label: `This month (${tabCounts.this_month})` },
            { key: 'last_month', label: `Last month (${tabCounts.last_month})` },
            { key: 'this_year', label: `This Year (${tabCounts.this_year})` },
            { key: 'last_year', label: `Last Year (${tabCounts.last_year})` },
          ]}
        />
      </Card>

      {/* Main content table card */}
      <Card
        style={{
          background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }}
        styles={{ body: { padding: '16px' } }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <DataTable
            dataSource={referrers}
            columns={columns}
            rowKey="referrerId"
            expandable={{
              expandedRowRender,
              rowExpandable: (record) => record.referredUsers && record.referredUsers.length > 0,
            }}
            pagination={{
              current: currentPage,
              pageSize,
              total: totalReferrers,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: handlePageSizeChange,
            }}
            bordered
            locale={{ emptyText: 'Không tìm thấy dữ liệu khách giới thiệu.' }}
            stickyPrimaryColumn
          />
        )}
      </Card>

      {/* Drawer showing customer detailed profile */}
      <CustomerDetailDrawer
        open={drawerOpen}
        customerId={selectedCustomerId}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedCustomerId(null);
          void fetchReferrals();
        }}
      />
    </div>
  );
}

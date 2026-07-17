'use client';

import React, { useState, useEffect } from 'react';
import { Table, Input, Card, Space, Button, Tag, Typography, theme, Spin, Tooltip, Tabs } from 'antd';
import { SearchOutlined, ShareAltOutlined, EyeOutlined } from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';
import api from '../../../lib/api';
import CustomerDetailDrawer from '../../../components/CustomerDetailDrawer';

const { Title, Text } = Typography;

export default function ReferralsPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [loading, setLoading] = useState(false);
  const [referrers, setReferrers] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');

  const [timeFilter, setTimeFilter] = useState<'this_month' | 'last_month' | 'this_year' | 'last_year' | 'all_time'>(
    'all_time'
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const saved = localStorage.getItem('mos_referrals_pageSize');
    if (saved) {
      setPageSize(Number(saved));
    }
    const savedFilter = localStorage.getItem('mos_referrals_timeFilter');
    if (savedFilter) {
      setTimeFilter(savedFilter as any);
    }
  }, []);

  const handleTimeFilterChange = (key: string) => {
    setTimeFilter(key as any);
    setCurrentPage(1);
    localStorage.setItem('mos_referrals_timeFilter', key);
  };

  const handlePageSizeChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
    localStorage.setItem('mos_referrals_pageSize', String(size));
  };

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers/referrals');
      setReferrers(res.data || []);
    } catch (err) {
      console.error('[ReferralsPage] Failed to fetch referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  const showCustomerDetails = (id: number) => {
    setSelectedCustomerId(id);
    setDrawerOpen(true);
  };

  const isInRange = (dateStr: string | null, filter: string) => {
    if (filter === 'all_time') return true;
    if (!dateStr) return false;

    const date = new Date(dateStr);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const year = date.getFullYear();
    const month = date.getMonth();

    if (filter === 'this_month') {
      return year === currentYear && month === currentMonth;
    }
    if (filter === 'last_month') {
      const targetMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const targetYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return year === targetYear && month === targetMonth;
    }
    if (filter === 'this_year') {
      return year === currentYear;
    }
    if (filter === 'last_year') {
      return year === currentYear - 1;
    }
    return true;
  };

  const tabCounts = React.useMemo(() => {
    const counts = {
      all_time: 0,
      this_month: 0,
      last_month: 0,
      this_year: 0,
      last_year: 0,
    };

    for (const r of referrers) {
      const users = r.referredUsers || [];
      let cAllTime = 0;
      let cThisMonth = 0;
      let cLastMonth = 0;
      let cThisYear = 0;
      let cLastYear = 0;

      for (const ru of users) {
        if (isInRange(ru.dateCreated, 'all_time')) cAllTime++;
        if (isInRange(ru.dateCreated, 'this_month')) cThisMonth++;
        if (isInRange(ru.dateCreated, 'last_month')) cLastMonth++;
        if (isInRange(ru.dateCreated, 'this_year')) cThisYear++;
        if (isInRange(ru.dateCreated, 'last_year')) cLastYear++;
      }

      if (cAllTime > 0) counts.all_time++;
      if (cThisMonth > 0) counts.this_month++;
      if (cLastMonth > 0) counts.last_month++;
      if (cThisYear > 0) counts.this_year++;
      if (cLastYear > 0) counts.last_year++;
    }

    return counts;
  }, [referrers]);

  const processedReferrers = referrers
    .map((r) => {
      const filteredUsers = (r.referredUsers || []).filter((ru: any) => isInRange(ru.dateCreated, timeFilter));
      const totalReferred = filteredUsers.length;
      const totalRewardDiamonds = filteredUsers.reduce((sum: number, ru: any) => sum + (ru.rewardDiamonds || 0), 0);

      return {
        ...r,
        totalReferred,
        totalRewardDiamonds,
        referredUsers: filteredUsers,
      };
    })
    .filter((r) => r.totalReferred > 0);

  // Filter local referrers based on name or phone
  const filteredReferrers = processedReferrers.filter((r) => {
    const term = searchText.toLowerCase().trim();
    if (!term) return true;
    return (r.referrerName || '').toLowerCase().includes(term) || (r.referrerPhone || '').toLowerCase().includes(term);
  });

  const columns = [
    {
      title: 'Khách hàng giới thiệu',
      key: 'referrer',
      render: (record: any) => (
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
          <Text type="secondary" style={{ fontSize: '12px' }}>
            SĐT: {record.referrerPhone}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Số người đã giới thiệu',
      dataIndex: 'totalReferred',
      key: 'totalReferred',
      sorter: (a: any, b: any) => a.totalReferred - b.totalReferred,
      render: (val: number) => (
        <Tag color="blue" style={{ fontWeight: 'bold', borderRadius: '4px' }}>
          {val} người bạn
        </Tag>
      ),
    },
    {
      title: 'Tổng Kim Cương tích luỹ',
      dataIndex: 'totalRewardDiamonds',
      key: 'totalRewardDiamonds',
      sorter: (a: any, b: any) => a.totalRewardDiamonds - b.totalRewardDiamonds,
      render: (val: number) => (
        <Tag color="warning" style={{ fontWeight: 'bold', borderRadius: '4px' }}>
          💎 {val} KC
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (record: any) => (
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
  ];

  const expandedRowRender = (record: any) => {
    const subColumns = [
      {
        title: 'Bạn bè được giới thiệu',
        key: 'name',
        render: (subRec: any) => (
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
          <span style={{ fontWeight: 'bold', color: val > 0 ? '#52c41a' : '#888' }}>
            {val > 0 ? `+${val} 💎` : '0 💎'}
          </span>
        ),
      },
    ];

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
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: themeMode === 'dark' ? '#0f172a' : '#f8fafc' }}>
      {/* Header card */}
      <Card
        style={{
          marginBottom: '20px',
          background: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb',
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
              <Title level={3} style={{ margin: 0, color: themeMode === 'dark' ? '#fff' : '#1f2937' }}>
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
          <Table
            dataSource={filteredReferrers}
            columns={columns}
            rowKey="referrerId"
            expandable={{
              expandedRowRender,
              rowExpandable: (record) => record.referredUsers && record.referredUsers.length > 0,
            }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: handlePageSizeChange,
            }}
            bordered
            locale={{ emptyText: 'Không tìm thấy dữ liệu khách giới thiệu.' }}
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
          // Refresh list to update any diamonds or changes
          fetchReferrals();
        }}
      />
    </div>
  );
}

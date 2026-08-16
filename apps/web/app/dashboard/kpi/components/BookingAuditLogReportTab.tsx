'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, DatePicker, Select, Switch, Button, Row, Col, Statistic, Tooltip, Space, Badge } from 'antd';
import {
  HistoryOutlined,
  WarningOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../../../context/ThemeContext';
import { apiClient } from '../../../../lib/api-client';
import { BookingAuditLog, BookingAuditSummary } from '@mos-lab/shared';

const { RangePicker } = DatePicker;

const ACTION_TAG_MAP: Record<string, { color: string; label: string }> = {
  CANCEL: { color: 'error', label: '❌ Hủy lịch' },
  RESCHEDULE: { color: 'warning', label: '📅 Dời lịch' },
  CHANGE_CV: { color: 'processing', label: '💇 Đổi CV' },
  CHANGE_KTV: { color: 'processing', label: '💇 Đổi CV' },
  CHANGE_STORE: { color: 'purple', label: '🏢 Đổi chi nhánh' },
  EDIT: { color: 'default', label: '✏️ Sửa đơn' },
};

export const BookingAuditLogReportTab: React.FC = () => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [actorStaffId, setActorStaffId] = useState<string>('ALL');
  const [originalStaffId, setOriginalStaffId] = useState<string>('ALL');
  const [actionType, setActionType] = useState<string>('ALL');
  const [isCrossActionOnly, setIsCrossActionOnly] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const [loading, setLoading] = useState<boolean>(false);
  const [items, setItems] = useState<BookingAuditLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [summary, setSummary] = useState<BookingAuditSummary>({
    totalLogs: 0,
    totalCrossActions: 0,
    totalCrossCancels: 0,
    totalCrossReschedules: 0,
  });

  const [staffOptions, setStaffOptions] = useState<Array<{ value: number; label: string }>>([]);

  // Fetch staff options for filter dropdowns
  useEffect(() => {
    apiClient.staff
      .list()
      .then((res) => {
        if (res && Array.isArray(res)) {
          const unique = new Map<number, string>();
          for (const s of res) {
            if (s.displayName) unique.set(s.id, s.displayName);
          }
          setStaffOptions(Array.from(unique.entries()).map(([id, name]) => ({ value: id, label: name })));
        }
      })
      .catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.bookingAudit.getAuditLogReport({
        dateFrom: dateRange[0].format('YYYY-MM-DD'),
        dateTo: dateRange[1].format('YYYY-MM-DD'),
        actorStaffId: actorStaffId !== 'ALL' ? actorStaffId : undefined,
        originalStaffId: originalStaffId !== 'ALL' ? originalStaffId : undefined,
        actionType: actionType !== 'ALL' ? actionType : undefined,
        isCrossActionOnly,
        page,
        limit: pageSize,
      });

      if (res) {
        setItems(res.items || []);
        setTotal(res.pagination?.total || 0);
        if (res.summary) {
          setSummary(res.summary);
        }
      }
    } catch (err) {
      console.error('Failed to fetch booking audit report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, actorStaffId, originalStaffId, actionType, isCrossActionOnly, page, pageSize]);

  const columns = [
    {
      title: 'Mã Đơn / Khách hàng',
      key: 'order',
      render: (_: any, record: BookingAuditLog) => (
        <div>
          <div style={{ fontWeight: '700', color: isDark ? '#60a5fa' : '#2563eb' }}>
            {record.orderKey || `#${record.orderId}`}
          </div>
          {record.customerName && (
            <div style={{ fontSize: '12px', color: isDark ? '#cbd5e1' : '#475569' }}>
              {record.customerName} {record.customerPhone ? `(${record.customerPhone})` : ''}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Hành động',
      dataIndex: 'actionType',
      key: 'actionType',
      align: 'center' as const,
      render: (val: string, record: BookingAuditLog) => {
        const tag = ACTION_TAG_MAP[val] || { color: 'default', label: val };
        return (
          <Space direction="vertical" size={2} align="center">
            <Tag color={tag.color}>{tag.label}</Tag>
            {record.isCrossAction && (
              <Badge count="⚠️ CẢNH BÁO CHÉO" style={{ backgroundColor: '#ef4444', fontSize: '10px' }} />
            )}
          </Space>
        );
      },
    },
    {
      title: 'Người Thao Tác (Actor)',
      key: 'actor',
      render: (_: any, record: BookingAuditLog) => (
        <div>
          <Tag icon={<UserOutlined />} color={record.isCrossAction ? 'warning' : 'blue'}>
            <strong>{record.actorStaffName || `#${record.actorStaffId}`}</strong>
          </Tag>
        </div>
      ),
    },
    {
      title: 'Booker Tạo Đơn Gốc',
      key: 'original',
      render: (_: any, record: BookingAuditLog) => (
        <div>
          {record.originalStaffName ? (
            <span style={{ fontWeight: '600', color: record.isCrossAction ? '#ef4444' : 'inherit' }}>
              {record.originalStaffName}
            </span>
          ) : (
            <span style={{ color: '#94a3b8' }}>-</span>
          )}
        </div>
      ),
    },
    {
      title: 'Lý Do Hủy / Dời Lịch',
      key: 'reason',
      render: (_: any, record: BookingAuditLog) => (
        <div>
          {record.reasonCategory && (
            <div style={{ fontWeight: '600', color: isDark ? '#38bdf8' : '#0284c7' }}>{record.reasonCategory}</div>
          )}
          {record.reasonNote ? (
            <div style={{ fontStyle: 'italic', fontSize: '12px', color: isDark ? '#cbd5e1' : '#475569' }}>
              &quot;{record.reasonNote}&quot;
            </div>
          ) : (
            !record.reasonCategory && <span style={{ color: '#94a3b8' }}>-</span>
          )}
        </div>
      ),
    },
    {
      title: 'Thời gian thao tác',
      dataIndex: 'dateCreated',
      key: 'dateCreated',
      align: 'center' as const,
      render: (val: string) => (
        <span className="tabular-nums" style={{ fontSize: '12px' }}>
          {new Date(val).toLocaleString('vi-VN')}
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: '4px' }}>
      {/* Stat Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: '8px', background: isDark ? '#1e293b' : '#ffffff' }}>
            <Statistic
              title="∑ Nhật Ký Ghi Nhận"
              value={summary.totalLogs}
              prefix={<HistoryOutlined style={{ color: '#3b82f6' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            style={{
              borderRadius: '8px',
              background: isDark ? '#2d1f05' : '#fffbeb',
              border: '1px solid #f59e0b',
            }}
          >
            <Statistic
              title="∑ Thao Tác Chéo Đơn"
              value={summary.totalCrossActions}
              valueStyle={{ color: '#f59e0b', fontWeight: '700' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            style={{
              borderRadius: '8px',
              background: isDark ? '#311414' : '#fef2f2',
              border: '1px solid #ef4444',
            }}
          >
            <Statistic
              title="Hủy Chéo Đơn Đồng Nghiệp"
              value={summary.totalCrossCancels}
              valueStyle={{ color: '#ef4444', fontWeight: '700' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            style={{
              borderRadius: '8px',
              background: isDark ? '#1a2332' : '#f0f9ff',
              border: '1px solid #0284c7',
            }}
          >
            <Statistic
              title="Dời Chéo Đơn Đồng Nghiệp"
              value={summary.totalCrossReschedules}
              valueStyle={{ color: '#0284c7', fontWeight: '700' }}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filter Bar */}
      <Card
        size="small"
        style={{ marginBottom: '16px', borderRadius: '8px', background: isDark ? '#1e293b' : '#ffffff' }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <span style={{ fontWeight: '600', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Khoảng thời gian:
            </span>
            <RangePicker
              value={dateRange}
              onChange={(val) => {
                if (val && val[0] && val[1]) {
                  setDateRange([val[0], val[1]]);
                }
              }}
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <span style={{ fontWeight: '600', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Người Thao Tác:
            </span>
            <Select
              value={actorStaffId}
              onChange={setActorStaffId}
              style={{ width: '100%' }}
              options={[{ value: 'ALL', label: 'Tất cả Booker' }, ...staffOptions]}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <span style={{ fontWeight: '600', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Booker Tạo Gốc:
            </span>
            <Select
              value={originalStaffId}
              onChange={setOriginalStaffId}
              style={{ width: '100%' }}
              options={[{ value: 'ALL', label: 'Tất cả Booker' }, ...staffOptions]}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <span style={{ fontWeight: '600', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Loại thao tác:
            </span>
            <Select
              value={actionType}
              onChange={setActionType}
              style={{ width: '100%' }}
              options={[
                { value: 'ALL', label: 'Tất cả hành động' },
                { value: 'CANCEL', label: '❌ Hủy lịch' },
                { value: 'RESCHEDULE', label: '📅 Dời lịch' },
                { value: 'CHANGE_CV', label: '💇 Đổi CV' },
                { value: 'CHANGE_STORE', label: '🏢 Đổi chi nhánh' },
                { value: 'EDIT', label: '✏️ Sửa đơn' },
              ]}
            />
          </Col>

          <Col xs={24} sm={12} md={6} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Switch checked={isCrossActionOnly} onChange={setIsCrossActionOnly} id="crossActionSwitch" />
              <label htmlFor="crossActionSwitch" style={{ fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                Chỉ hiện Can Thiệp Chéo
              </label>
            </div>

            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Tải lại
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <Table
        dataSource={items}
        columns={columns}
        rowKey="id"
        loading={loading}
        rowClassName={(record) => (record.isCrossAction ? 'bg-amber-500/10 dark:bg-amber-950/20' : '')}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
          showTotal: (t) => `Tổng cộng ${t} dòng nhật ký`,
        }}
        size="small"
      />
    </div>
  );
};

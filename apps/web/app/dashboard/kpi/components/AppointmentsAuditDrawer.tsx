'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Drawer,
  Spin,
  Space,
  Row,
  Col,
  Card,
  Input,
  Select,
  Table,
  Tag,
  Badge,
  Typography,
  message,
  theme,
} from 'antd';
import { SearchOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { LeaderboardEntry } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

const { Text } = Typography;

interface AppointmentsAuditDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedBookerId: number | null;
  selectedBookerName: string;
  selectedStaffRecord: LeaderboardEntry | null;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs];
  themeMode: string;
}

export default function AppointmentsAuditDrawer({
  open,
  onClose,
  selectedBookerId,
  selectedBookerName,
  selectedStaffRecord,
  dateRange,
  themeMode,
}: AppointmentsAuditDrawerProps) {
  const { token } = theme.useToken();

  // Appointments data state
  const [bookerAppointments, setBookerAppointments] = useState<SafeAny[]>([]);
  const [loading, setLoading] = useState(false);

  // Search and filter states
  const [drillSearchText, setDrillSearchText] = useState('');
  const [drillStatusFilter, setDrillStatusFilter] = useState('ALL');
  const [drillServiceFilter, setDrillServiceFilter] = useState('ALL');

  // Lazy loading state
  const [visibleCount, setVisibleCount] = useState(25);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch detailed appointments
  useEffect(() => {
    if (!open || !selectedBookerId) return;

    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const startDate = dateRange[0].format('YYYY-MM-DD');
        const endDate = dateRange[1].format('YYYY-MM-DD');
        const data = await apiClient.kpi.getBookerAppointments({
          staffId: selectedBookerId,
          startDate,
          endDate,
        });
        setBookerAppointments(data as SafeAny[]);
        setDrillSearchText('');
        setDrillStatusFilter('ALL');
        setDrillServiceFilter('ALL');
        setVisibleCount(25);
      } catch (err) {
        console.error('Fetch booker appointments error:', err);
        message.error('Không thể tải danh sách khách hàng đặt lịch.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [open, selectedBookerId, dateRange]);

  // Local client-side filtering for appointments
  const filteredAppointments = useMemo(() => {
    return bookerAppointments.filter((item) => {
      // 1. Search text filter (Name or Phone)
      if (drillSearchText) {
        const query = drillSearchText.toLowerCase();
        const nameMatch = (item.clientName || '').toLowerCase().includes(query);
        const phoneMatch = (item.clientPhone || '').includes(query);
        if (!nameMatch && !phoneMatch) return false;
      }

      // 2. Status filter
      if (drillStatusFilter !== 'ALL') {
        const isComp = !!item.isCompleted;
        if (drillStatusFilter === 'COMPLETED' && !isComp) return false;
        if (drillStatusFilter === 'PENDING' && isComp) return false;
      }

      // 3. Service filter
      if (drillServiceFilter !== 'ALL') {
        const name = (item.serviceName || '').toLowerCase();
        const isRefill = name.includes('refill');
        const isNoInfo = name.includes('không có thông tin') || name.includes('không rõ');

        if (drillServiceFilter === 'FULLSET' && (isRefill || isNoInfo)) return false;
        if (drillServiceFilter === 'REFILL' && !isRefill) return false;
      }

      return true;
    });
  }, [bookerAppointments, drillSearchText, drillStatusFilter, drillServiceFilter]);

  // Reset pagination on filter changes
  useEffect(() => {
    setVisibleCount(25);
  }, [drillSearchText, drillStatusFilter, drillServiceFilter]);

  // Totals for filtered appointments
  const drilldownTotals = useMemo(() => {
    let totalNetRevenue = 0;
    let totalTips = 0;
    let totalBookingBonus = 0;
    let checkinCount = 0;

    filteredAppointments.forEach((appt: SafeAny) => {
      totalNetRevenue += appt.netRevenue || 0;
      totalTips += appt.tipAmount || 0;
      totalBookingBonus += appt.bookingBonus || 0;
      if (appt.isCompleted) {
        checkinCount++;
      }
    });

    return {
      totalNetRevenue,
      totalTips,
      totalBookingBonus,
      checkinCount,
      totalCount: filteredAppointments.length,
    };
  }, [filteredAppointments]);

  // Live Total Salary including live booking bonus
  const liveTotalSalary = useMemo(() => {
    if (!selectedStaffRecord) return 0;
    const sal = selectedStaffRecord.salary;
    return (
      (sal.baseSalary || 0) +
      (drilldownTotals.totalBookingBonus || 0) +
      (sal.doneBonus || 0) +
      (sal.missedBonus || 0) +
      (sal.tipBonus || 0) +
      (sal.revBonus || 0)
    );
  }, [selectedStaffRecord, drilldownTotals.totalBookingBonus]);

  // Infinite scroll intersection observer for lazy loading
  useEffect(() => {
    if (!open) return;

    let observer: IntersectionObserver | null = null;
    let active = true;

    // Wait a brief moment to ensure Ant Design has rendered .ant-drawer-body in the DOM portal
    const timer = setTimeout(() => {
      if (!active) return;

      const drawerBody = document.querySelector('.ant-drawer-body');

      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisibleCount((prev) => Math.min(prev + 25, filteredAppointments.length));
          }
        },
        {
          root: drawerBody || null,
          rootMargin: '150px',
          threshold: 0.1,
        }
      );

      const currentTarget = loadMoreRef.current;
      if (currentTarget) {
        observer.observe(currentTarget);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
      const currentTarget = loadMoreRef.current;
      if (currentTarget && observer) {
        observer.unobserve(currentTarget);
      }
    };
  }, [open, filteredAppointments.length]);

  return (
    <Drawer
      title={
        <span>
          <CalendarOutlined style={{ color: token.colorPrimary, marginRight: '8px' }} />
          Danh sách Khách hàng đặt lịch của Online Consultant: <strong>{selectedBookerName}</strong>
        </span>
      }
      placement="right"
      width="95vw"
      onClose={onClose}
      open={open}
      style={{ background: token.colorBgContainer }}
    >
      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" />
          <span style={{ color: token.colorTextDescription, fontSize: '14px' }}>Đang tải danh sách...</span>
        </div>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Search & Filter Controls */}
          <Row gutter={[16, 16]} align="middle" justify="space-between">
            <Col>
              <Space size="middle" wrap>
                <Input
                  placeholder="Tìm kiếm tên, số điện thoại khách hàng..."
                  prefix={<SearchOutlined style={{ color: token.colorTextDescription }} />}
                  value={drillSearchText}
                  onChange={(e) => setDrillSearchText(e.target.value)}
                  style={{ width: 280 }}
                  allowClear
                />
                <Select
                  value={drillStatusFilter}
                  onChange={setDrillStatusFilter}
                  style={{ width: 190 }}
                  options={[
                    { label: 'Tất cả trạng thái', value: 'ALL' },
                    { label: 'Check-in thành công', value: 'COMPLETED' },
                    { label: 'Chưa đến / Khác', value: 'PENDING' },
                  ]}
                />
                <Select
                  value={drillServiceFilter}
                  onChange={setDrillServiceFilter}
                  style={{ width: 190 }}
                  options={[
                    { label: 'Tất cả dịch vụ', value: 'ALL' },
                    { label: 'Full Set', value: 'FULLSET' },
                    { label: 'Refill (Dặm mi)', value: 'REFILL' },
                  ]}
                />
              </Space>
            </Col>
            <Col>
              <Text type="secondary">
                Hiển thị <strong>{filteredAppointments.length}</strong> / {bookerAppointments.length} khách hàng
              </Text>
            </Col>
          </Row>

          {/* Summary Statistics Cards (Live Paystub Summary) */}
          <Row gutter={[8, 8]}>
            {/* Card 1: Lịch hẹn & Check-in */}
            <Col xs={12} sm={6} md={3}>
              <Card
                size="small"
                style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#fafafa',
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
                styles={{ body: { padding: '6px 8px' } }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    color: token.colorTextDescription,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  LỊCH HẸN / CHECK-IN
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: token.colorText,
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {drilldownTotals.totalCount}{' '}
                  <span style={{ fontSize: '10px', fontWeight: 'normal', color: token.colorTextDescription }}>
                    lượt
                  </span>
                  {' / '}
                  <span style={{ color: '#52C41A' }}>{drilldownTotals.checkinCount}</span>
                </div>
                <div style={{ fontSize: '9px', color: token.colorTextDescription, marginTop: '2px' }}>
                  Tỷ lệ đến:{' '}
                  {drilldownTotals.totalCount > 0
                    ? Math.round((drilldownTotals.checkinCount / drilldownTotals.totalCount) * 100)
                    : 0}
                  %
                </div>
              </Card>
            </Col>
            {/* Card 2: Lương cứng */}
            <Col xs={12} sm={6} md={3}>
              <Card
                size="small"
                style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#fafafa',
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
                styles={{ body: { padding: '6px 8px' } }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    color: token.colorTextDescription,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  LƯƠNG CỨNG
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: token.colorText,
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {(selectedStaffRecord?.salary?.baseSalary || 0).toLocaleString('vi-VN')}{' '}
                  <span style={{ fontSize: '10px', fontWeight: 'normal', color: token.colorTextDescription }}>đ</span>
                </div>
                <div style={{ fontSize: '9px', color: token.colorTextDescription, marginTop: '2px' }}>
                  Cố định hàng tháng
                </div>
              </Card>
            </Col>
            {/* Card 3: Hoa hồng Đặt lịch */}
            <Col xs={12} sm={6} md={3}>
              <Card
                size="small"
                style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#fafafa',
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
                styles={{ body: { padding: '6px 8px' } }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    color: token.colorTextDescription,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  HOA HỒNG ĐẶT LỊCH (LIVE)
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#52C41A',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {drilldownTotals.totalBookingBonus.toLocaleString('vi-VN')}{' '}
                  <span style={{ fontSize: '10px', fontWeight: 'normal', color: token.colorTextDescription }}>đ</span>
                </div>
                <div style={{ fontSize: '9px', color: token.colorTextDescription, marginTop: '2px' }}>
                  Cộng dồn đơn thành công
                </div>
              </Card>
            </Col>
            {/* Card 4: Thưởng mốc Done */}
            <Col xs={12} sm={6} md={3}>
              <Card
                size="small"
                style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#fafafa',
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
                styles={{ body: { padding: '6px 8px' } }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    color: token.colorTextDescription,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  THƯỞNG MỐC DONE
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: (selectedStaffRecord?.salary?.doneBonus || 0) > 0 ? '#52C41A' : token.colorText,
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {(selectedStaffRecord?.salary?.doneBonus || 0).toLocaleString('vi-VN')}{' '}
                  <span style={{ fontSize: '10px', fontWeight: 'normal', color: token.colorTextDescription }}>đ</span>
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: token.colorTextDescription,
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedStaffRecord?.salary?.doneLevelCount
                    ? `Mốc đạt: >= ${selectedStaffRecord?.salary?.doneLevelCount} lượt`
                    : 'Chưa đạt mốc thưởng'}
                </div>
              </Card>
            </Col>

            {/* Card 5: Thưởng / Phạt Lỡ */}
            <Col xs={12} sm={6} md={3}>
              <Card
                size="small"
                style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#fafafa',
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
                styles={{ body: { padding: '6px 8px' } }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    color: token.colorTextDescription,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  THƯỞNG / PHẠT LỠ
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color:
                      (selectedStaffRecord?.salary?.missedBonus || 0) < 0
                        ? '#FF4D4F'
                        : (selectedStaffRecord?.salary?.missedBonus || 0) > 0
                          ? '#52C41A'
                          : token.colorText,
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {(selectedStaffRecord?.salary?.missedBonus || 0) > 0 ? '+' : ''}
                  {(selectedStaffRecord?.salary?.missedBonus || 0).toLocaleString('vi-VN')}{' '}
                  <span style={{ fontSize: '10px', fontWeight: 'normal', color: token.colorTextDescription }}>đ</span>
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: token.colorTextDescription,
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Lỡ: {((selectedStaffRecord?.salary?.missedRate || 0) * 100).toFixed(1)}%{' '}
                  {selectedStaffRecord?.salary?.missedLevelRate
                    ? `(Mốc <= ${selectedStaffRecord.salary.missedLevelRate}%)`
                    : ''}
                </div>
              </Card>
            </Col>
            {/* Card 6: Thưởng Tips (7%) */}
            <Col xs={12} sm={6} md={3}>
              <Card
                size="small"
                style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#fafafa',
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
                styles={{ body: { padding: '6px 8px' } }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    color: token.colorTextDescription,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  THƯỞNG TIPS (7%)
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: token.colorText,
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {(selectedStaffRecord?.salary?.tipBonus || 0).toLocaleString('vi-VN')}{' '}
                  <span style={{ fontSize: '10px', fontWeight: 'normal', color: token.colorTextDescription }}>đ</span>
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: token.colorTextDescription,
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Tổng tips: {drilldownTotals.totalTips.toLocaleString('vi-VN')} đ
                </div>
              </Card>
            </Col>
            {/* Card 7: Thưởng Doanh Net */}
            <Col xs={12} sm={6} md={3}>
              <Card
                size="small"
                style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#fafafa',
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
                styles={{ body: { padding: '6px 8px' } }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    color: token.colorTextDescription,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  THƯỞNG DOANH THU NET
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: (selectedStaffRecord?.salary?.revBonus || 0) > 0 ? '#52C41A' : token.colorText,
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {(selectedStaffRecord?.salary?.revBonus || 0).toLocaleString('vi-VN')}{' '}
                  <span style={{ fontSize: '10px', fontWeight: 'normal', color: token.colorTextDescription }}>đ</span>
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: token.colorTextDescription,
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {(selectedStaffRecord?.salary?.revLevelRate || 0) > 0
                    ? `${((selectedStaffRecord?.salary?.revLevelRate || 0) * 100).toFixed(1)}% (Mốc >= ${(selectedStaffRecord?.salary?.revLevelMin || 0) / 1000000}M)`
                    : `Chưa đạt (DS: ${(drilldownTotals.totalNetRevenue / 1000000).toFixed(1)}M)`}
                </div>
              </Card>
            </Col>
            {/* Card 8: TỔNG THU NHẬP TẠM TÍNH (LIVE) */}
            <Col xs={12} sm={6} md={3}>
              <Card
                size="small"
                style={{
                  background: themeMode === 'dark' ? '#2b2111' : '#FFFBE6',
                  border: `1px solid ${themeMode === 'dark' ? '#d4a84b' : '#FFE58F'}`,
                }}
                styles={{ body: { padding: '6px 8px' } }}
              >
                <div
                  style={{
                    fontSize: '9px',
                    color: themeMode === 'dark' ? '#d4a84b' : '#D4A84B',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  TỔNG THU NHẬP (LIVE)
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: '800',
                    color: themeMode === 'dark' ? '#e2b353' : '#B8820B',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {liveTotalSalary.toLocaleString('vi-VN')}{' '}
                  <span style={{ fontSize: '10px', fontWeight: 'normal' }}>đ</span>
                </div>
                <div style={{ fontSize: '9px', color: themeMode === 'dark' ? '#a7833a' : '#9E7415', marginTop: '2px' }}>
                  Lương cứng + thưởng live
                </div>
              </Card>
            </Col>
          </Row>

          <Table
            dataSource={filteredAppointments.slice(0, visibleCount)}
            size="small"
            columns={[
              {
                title: 'Khách hàng',
                key: 'client',
                render: (record: SafeAny) => (
                  <div>
                    <div style={{ fontWeight: '600', color: token.colorText }}>{record.clientName || 'N/A'}</div>
                    <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                      {record.clientPhone || 'N/A'}
                    </div>
                  </div>
                ),
              },
              {
                title: 'Kênh đặt',
                dataIndex: 'channel',
                key: 'channel',
                render: (val: string) => <Tag color="blue">{val}</Tag>,
              },
              {
                title: 'Ngày hẹn',
                dataIndex: 'appointmentDate',
                key: 'appointmentDate',
                sorter: (a: SafeAny, b: SafeAny) =>
                  new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime(),
                defaultSortOrder: 'descend',
                render: (val: string) => dayjs(val).format('DD/MM/YYYY HH:mm'),
              },
              {
                title: 'Dịch vụ chính',
                key: 'service',
                render: (record: SafeAny) => (
                  <div>
                    <div style={{ fontSize: '13px', color: token.colorText }}>{record.serviceName}</div>
                    {record.servicePrice > 0 && (
                      <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                        Giá: {record.servicePrice.toLocaleString('vi-VN')} đ | Giảm: {record.discountPercent}%
                      </div>
                    )}
                  </div>
                ),
              },
              {
                title: 'Doanh thu Net',
                dataIndex: 'netRevenue',
                key: 'netRevenue',
                sorter: (a: SafeAny, b: SafeAny) => a.netRevenue - b.netRevenue,
                render: (val: number) =>
                  val > 0 ? (
                    <span style={{ fontWeight: '600', color: token.colorText }}>{val.toLocaleString('vi-VN')} đ</span>
                  ) : (
                    <span style={{ color: token.colorTextDescription }}>-</span>
                  ),
              },
              {
                title: 'Tiền tips',
                dataIndex: 'tipAmount',
                key: 'tipAmount',
                sorter: (a: SafeAny, b: SafeAny) => a.tipAmount - b.tipAmount,
                render: (val: number) =>
                  val > 0 ? (
                    <span style={{ color: token.colorText }}>{val.toLocaleString('vi-VN')} đ</span>
                  ) : (
                    <span style={{ color: token.colorTextDescription }}>-</span>
                  ),
              },
              {
                title: 'Hoa hồng OC',
                dataIndex: 'bookingBonus',
                key: 'bookingBonus',
                sorter: (a: SafeAny, b: SafeAny) => a.bookingBonus - b.bookingBonus,
                render: (val: number) =>
                  val > 0 ? (
                    <span style={{ fontWeight: '600', color: '#52C41A' }}>+{val.toLocaleString('vi-VN')} đ</span>
                  ) : (
                    <span style={{ color: token.colorTextDescription }}>-</span>
                  ),
              },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                key: 'status',
                render: (val: string, record: SafeAny) => (
                  <Badge status={record.isCompleted ? 'success' : 'default'} text={val} />
                ),
              },
            ]}
            rowKey="id"
            pagination={false}
            bordered
            locale={{ emptyText: 'Không tìm thấy kết quả nào phù hợp với bộ lọc.' }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row
                  style={{ background: themeMode === 'dark' ? '#1d1d1d' : '#fafafa', fontWeight: 'bold' }}
                >
                  <Table.Summary.Cell index={0} colSpan={4}>
                    Tổng cộng (Kết quả lọc)
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <span style={{ color: token.colorText }}>
                      {drilldownTotals.totalNetRevenue.toLocaleString('vi-VN')} đ
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>
                    <span style={{ color: token.colorText }}>
                      {drilldownTotals.totalTips.toLocaleString('vi-VN')} đ
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6}>
                    <span style={{ color: '#52C41A' }}>
                      {drilldownTotals.totalBookingBonus.toLocaleString('vi-VN')} đ
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7}>
                    <span style={{ color: token.colorTextDescription }}>
                      {drilldownTotals.checkinCount} / {drilldownTotals.totalCount} Check-in
                    </span>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />

          {/* Lazy loading detector trigger div */}
          <div ref={loadMoreRef}>
            {visibleCount < filteredAppointments.length ? (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center',
                }}
              >
                <Spin size="small" />
                <span style={{ color: token.colorTextDescription, fontSize: '13px' }}>Đang tải thêm khách hàng...</span>
              </div>
            ) : (
              filteredAppointments.length > 0 && (
                <div
                  style={{ padding: '20px', textAlign: 'center', color: token.colorTextDescription, fontSize: '13px' }}
                >
                  Đã hiển thị toàn bộ <strong>{filteredAppointments.length}</strong> khách hàng
                </div>
              )
            )}
          </div>
        </Space>
      )}
    </Drawer>
  );
}

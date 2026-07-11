'use client';

import '../../suppress-warnings';
import React, { useEffect, useState, useCallback } from 'react';
import { 
  Typography, 
  Card, 
  theme, 
  DatePicker, 
  Select, 
  Radio,
  Space, 
  Row, 
  Col, 
  Table, 
  Progress, 
  Badge, 
  Spin, 
  message, 
  Divider,
  Button,
  Tag,
  Tooltip
} from 'antd';
import { 
  PhoneOutlined, 
  CalendarOutlined, 
  CheckCircleOutlined, 
  PieChartOutlined, 
  TrophyOutlined, 
  TeamOutlined, 
  UserOutlined,
  DollarOutlined,
  SettingOutlined,
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);
import api from '../../../lib/api';
import { useTheme } from '../../../context/ThemeContext';

// Modular Sub-components
import KpiTrendsChart from './components/KpiTrendsChart';
import SalaryConfigDrawer from './components/SalaryConfigDrawer';
import AppointmentsAuditDrawer from './components/AppointmentsAuditDrawer';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

interface BookerSalary {
  role?: 'telesales' | 'oc';
  baseSalary: number;
  doneCount?: number;
  missedCount?: number;
  missedRate?: number;
  clientBonus?: number;
  doneBonus?: number;
  missedBonus?: number;
  tipBonus?: number;
  revBonus?: number;
  totalTips?: number;
  totalNetRev?: number;
  totalSalary: number;

  // Online Consultant specific fields
  salesReward?: number;
  servicingReward?: number;
  growthReward?: number;
  storeServicingReward?: number;
  checkins?: number;
  checkinLateMin?: number;

  // Match tier info
  doneLevelCount?: number;
  missedLevelRate?: number;
  revLevelRate?: number;
  revLevelMin?: number;
}

interface KpiSummary {
  totalPlanned: number;
  totalCalled: number;
  totalAnswered: number;
  totalBooked: number;
  totalCheckin: number;
  totalEarnings: number;
  salary: BookerSalary | null;
}

interface OutcomeBreakdown {
  BOOKED: number;
  CALL_BACK: number;
  NO_ANSWER: number;
  BUSY: number;
  WRONG_NUMBER: number;
  OTHERS: number;
}

interface TrendDay {
  date: string;
  planned: number;
  called: number;
}

interface LeaderboardEntry {
  staffId: number;
  displayName: string;
  username: string;
  totalPlanned: number;
  totalCalled: number;
  totalAnswered: number;
  totalBooked: number;
  totalCheckin: number;
  answerRate: number;
  bookingRate: number;
  checkinRate: number;
  totalEarnings: number;
  salary: BookerSalary;
}

export default function KPIPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Filters state
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [referenceDate, setReferenceDate] = useState<dayjs.Dayjs>(dayjs());
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(() => {
    const start = dayjs().startOf('month');
    const end = dayjs().endOf('month');
    return [start, end];
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  // Sync dateRange when viewMode or referenceDate changes
  useEffect(() => {
    let start = referenceDate;
    let end = referenceDate;

    if (viewMode === 'month') {
      start = referenceDate.startOf('month');
      end = referenceDate.endOf('month');
    } else if (viewMode === 'week') {
      start = referenceDate.startOf('isoWeek');
      end = referenceDate.endOf('isoWeek');
    } else if (viewMode === 'day') {
      start = referenceDate.startOf('day');
      end = referenceDate.endOf('day');
    }

    setDateRange([start, end]);
  }, [viewMode, referenceDate]);

  // Booker detailed appointments drilldown
  const [selectedBookerId, setSelectedBookerId] = useState<number | null>(null);
  const [selectedBookerName, setSelectedBookerName] = useState<string>('');
  const [selectedStaffRecord, setSelectedStaffRecord] = useState<LeaderboardEntry | null>(null);
  const [appointmentsDrawerOpen, setAppointmentsDrawerOpen] = useState(false);

  const handleShowAppointments = (staffId: number, displayName: string) => {
    setSelectedBookerId(staffId);
    setSelectedBookerName(displayName);
    const matchedRecord = leaderboard.find(item => item.staffId === staffId);
    setSelectedStaffRecord(matchedRecord || null);
    setAppointmentsDrawerOpen(true);
  };

  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<'telesales' | 'oc'>('telesales');

  // Reset staff selection when role changes
  useEffect(() => {
    setSelectedStaffId('ALL');
  }, [selectedRole]);

  // Data state
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [breakdown, setBreakdown] = useState<OutcomeBreakdown | null>(null);
  const [trends, setTrends] = useState<TrendDay[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Configuration Drawer state
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);

  // Fetch logged in user
  useEffect(() => {
    const stored = localStorage.getItem('mos_user');
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }
  }, []);

  // Fetch KPI data
  const fetchKpiData = useCallback(async () => {
    if (!dateRange[0] || !dateRange[1]) return;
    
    setLoading(true);
    const startDate = dateRange[0].format('YYYY-MM-DD');
    const endDate = dateRange[1].format('YYYY-MM-DD');

    const params: any = { startDate, endDate, role: selectedRole };
    if (selectedStaffId !== 'ALL') {
      params.staffId = selectedStaffId;
    }

    try {
      // 1. Fetch Summary
      const summaryRes = await api.get('/kpi/summary', { params });
      setSummary(summaryRes.data);

      // 2. Fetch Trends and Outcome Breakdown
      const trendsRes = await api.get('/kpi/trends', { params });
      setBreakdown(trendsRes.data.breakdown);
      setTrends(trendsRes.data.dailyTrends);

      // 3. Fetch Leaderboard if Admin
      const stored = localStorage.getItem('mos_user');
      const userObj = stored ? JSON.parse(stored) : null;
      if (userObj && userObj.role === 'admin') {
        const leaderboardRes = await api.get('/kpi/leaderboard', { 
          params: { startDate, endDate, role: selectedRole } 
        });
        setLeaderboard(leaderboardRes.data);
      }
    } catch (err: any) {
      console.error('Fetch KPI data error:', err);
      message.error(err.response?.data?.message || 'Không thể tải báo cáo hiệu suất');
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedStaffId, selectedRole]);

  useEffect(() => {
    fetchKpiData();
  }, [fetchKpiData]);



  // Quick Date presets and navigation
  const getPeriodLabel = () => {
    if (!dateRange[0] || !dateRange[1]) return 'Chọn thời gian';
    
    const [start, end] = dateRange;
    let expectedStart = referenceDate;
    let expectedEnd = referenceDate;
    
    if (viewMode === 'month') {
      expectedStart = referenceDate.startOf('month');
      expectedEnd = referenceDate.endOf('month');
    } else if (viewMode === 'week') {
      expectedStart = referenceDate.startOf('isoWeek');
      expectedEnd = referenceDate.endOf('isoWeek');
    } else if (viewMode === 'day') {
      expectedStart = referenceDate.startOf('day');
      expectedEnd = referenceDate.endOf('day');
    }

    const isMatched = start.isSame(expectedStart, 'day') && end.isSame(expectedEnd, 'day');
    
    if (!isMatched) {
      return `${start.format('DD/MM')} - ${end.format('DD/MM')}`;
    }

    if (viewMode === 'month') {
      return `Tháng ${referenceDate.format('MM/YYYY')}`;
    }
    if (viewMode === 'week') {
      const startStr = referenceDate.startOf('isoWeek').format('DD/MM');
      const endStr = referenceDate.endOf('isoWeek').format('DD/MM');
      return `Tuần ${referenceDate.isoWeek()} (${startStr} - ${endStr})`;
    }
    
    // Day mode
    const today = dayjs().startOf('day');
    const yesterday = dayjs().subtract(1, 'day').startOf('day');
    const ref = referenceDate.startOf('day');
    if (ref.isSame(today)) {
      return `Hôm nay (${ref.format('DD/MM')})`;
    }
    if (ref.isSame(yesterday)) {
      return `Hôm qua (${ref.format('DD/MM')})`;
    }
    return ref.format('DD/MM/YYYY');
  };

  const handleNavigate = (direction: number) => {
    setReferenceDate(prev => prev.add(direction, viewMode as any));
  };

  const isAdmin = currentUser?.role === 'admin';

  // Calculate percentages safely
  const getPercent = (value: number, total: number) => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Custom Leaderboard columns
  const leaderboardColumns = selectedRole === 'oc' ? [
    {
      title: 'Client Consultant',
      key: 'name',
      render: (record: LeaderboardEntry) => (
        <Space>
          <UserOutlined style={{ color: '#722ED1' }} />
          <span style={{ fontWeight: '600', color: token.colorText }}>{record.displayName}</span>
          <Text type="secondary" style={{ fontSize: '12px' }}>({record.username})</Text>
        </Space>
      )
    },
    {
      title: 'Số lần check-in',
      dataIndex: 'totalCheckin',
      key: 'totalCheckin',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.totalCheckin - b.totalCheckin,
      render: (val: number) => <span style={{ fontWeight: '600', color: token.colorText }}>{val}</span>
    },
    {
      title: 'Tổng số phút trễ',
      key: 'checkinLateMin',
      render: (record: LeaderboardEntry) => {
        const mins = record.salary?.checkinLateMin || 0;
        return <span style={{ color: mins < 0 ? '#FF4D4F' : token.colorText }}>{mins < 0 ? `${Math.abs(mins)} phút` : 'Đúng giờ'}</span>;
      }
    },
    {
      title: 'Lương cứng',
      key: 'baseSalary',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => (a.salary?.baseSalary || 0) - (b.salary?.baseSalary || 0),
      render: (record: LeaderboardEntry) => <span>{(record.salary?.baseSalary || 0).toLocaleString('vi-VN')} đ</span>
    },
    {
      title: 'Thưởng doanh số',
      key: 'salesReward',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => (a.salary?.salesReward || 0) - (b.salary?.salesReward || 0),
      render: (record: LeaderboardEntry) => <span>{(record.salary?.salesReward || 0).toLocaleString('vi-VN')} đ</span>
    },
    {
      title: 'Thưởng phục vụ',
      key: 'servicingReward',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => (a.salary?.servicingReward || 0) - (b.salary?.servicingReward || 0),
      render: (record: LeaderboardEntry) => <span>{(record.salary?.servicingReward || 0).toLocaleString('vi-VN')} đ</span>
    },
    {
      title: 'Thưởng tăng trưởng',
      key: 'growthReward',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => (a.salary?.growthReward || 0) - (b.salary?.growthReward || 0),
      render: (record: LeaderboardEntry) => <span>{(record.salary?.growthReward || 0).toLocaleString('vi-VN')} đ</span>
    },
    {
      title: 'Thưởng phục vụ CH',
      key: 'storeServicingReward',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => (a.salary?.storeServicingReward || 0) - (b.salary?.storeServicingReward || 0),
      render: (record: LeaderboardEntry) => <span>{(record.salary?.storeServicingReward || 0).toLocaleString('vi-VN')} đ</span>
    },
    {
      title: 'Thu nhập Client Consultant',
      key: 'totalEarnings',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.totalEarnings - b.totalEarnings,
      render: (record: LeaderboardEntry) => (
        <span style={{ fontWeight: 'bold', color: '#D4A84B', fontSize: '15px' }}>
          {(record.totalEarnings || 0).toLocaleString('vi-VN')} đ
        </span>
      )
    }
  ] : [
    {
      title: 'Online Consultant (Booker)',
      key: 'name',
      render: (record: LeaderboardEntry) => (
        <Space>
          <UserOutlined style={{ color: token.colorPrimary }} />
          <span 
            style={{ 
              fontWeight: '600', 
              color: token.colorPrimary, 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={() => handleShowAppointments(record.staffId, record.displayName)}
          >
            {record.displayName}
          </span>
          <Text type="secondary" style={{ fontSize: '12px' }}>({record.username})</Text>
        </Space>
      )
    },
    {
      title: 'Kế hoạch',
      dataIndex: 'totalPlanned',
      key: 'totalPlanned',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.totalPlanned - b.totalPlanned,
    },
    {
      title: 'Đã gọi',
      key: 'totalCalled',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.totalCalled - b.totalCalled,
      render: (record: LeaderboardEntry) => (
        <span>{record.totalCalled} <Text type="secondary" style={{ fontSize: '12px' }}>({getPercent(record.totalCalled, record.totalPlanned)}%)</Text></span>
      )
    },
    {
      title: 'Đặt lịch (Booked)',
      key: 'bookingRate',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.totalBooked - b.totalBooked,
      render: (record: LeaderboardEntry) => (
        <span>
          <b style={{ color: token.colorPrimary }}>{record.totalBooked}</b>
          <Progress percent={record.bookingRate} size="small" strokeColor={token.colorPrimary} style={{ width: '80px', marginLeft: '8px' }} />
        </span>
      )
    },
    {
      title: 'Đến tiệm (Checkin)',
      key: 'checkinRate',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.totalCheckin - b.totalCheckin,
      render: (record: LeaderboardEntry) => (
        <span>
          <b style={{ color: '#722ED1' }}>{record.totalCheckin}</b>
          <Progress percent={record.checkinRate} size="small" strokeColor="#722ED1" style={{ width: '80px', marginLeft: '8px' }} />
        </span>
      )
    },
    {
      title: 'Lương cứng',
      key: 'baseSalary',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => (a.salary?.baseSalary || 0) - (b.salary?.baseSalary || 0),
      render: (record: LeaderboardEntry) => <span>{(record.salary?.baseSalary || 0).toLocaleString('vi-VN')} đ</span>
    },
    {
      title: 'Thưởng check-in',
      key: 'clientBonus',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => (a.salary?.clientBonus || 0) - (b.salary?.clientBonus || 0),
      render: (record: LeaderboardEntry) => <span>{(record.salary?.clientBonus || 0).toLocaleString('vi-VN')} đ</span>
    },
    {
      title: 'Thưởng mốc DONE',
      key: 'doneBonus',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => (a.salary?.doneBonus || 0) - (b.salary?.doneBonus || 0),
      render: (record: LeaderboardEntry) => <span>{(record.salary?.doneBonus || 0).toLocaleString('vi-VN')} đ</span>
    },
    {
      title: 'Thưởng/Phạt lỡ',
      key: 'missedBonus',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => (a.salary?.missedBonus || 0) - (b.salary?.missedBonus || 0),
      render: (record: LeaderboardEntry) => {
        const val = record.salary?.missedBonus || 0;
        return <span style={{ color: val < 0 ? '#FF4D4F' : token.colorText }}>{(val >= 0 ? '+' : '')}{val.toLocaleString('vi-VN')} đ</span>;
      }
    },
    {
      title: 'Thưởng tips (7%)',
      key: 'tipBonus',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => (a.salary?.tipBonus || 0) - (b.salary?.tipBonus || 0),
      render: (record: LeaderboardEntry) => <span>{(record.salary?.tipBonus || 0).toLocaleString('vi-VN')} đ</span>
    },
    {
      title: 'Thưởng doanh thu',
      key: 'revBonus',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => (a.salary?.revBonus || 0) - (b.salary?.revBonus || 0),
      render: (record: LeaderboardEntry) => <span>{(record.salary?.revBonus || 0).toLocaleString('vi-VN')} đ</span>
    },
    {
      title: 'Thu nhập Online Consultant',
      key: 'totalEarnings',
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.totalEarnings - b.totalEarnings,
      render: (record: LeaderboardEntry) => (
        <span style={{ fontWeight: 'bold', color: '#D4A84B', fontSize: '15px' }}>
          {(record.totalEarnings || 0).toLocaleString('vi-VN')} đ
        </span>
      )
    }
  ];

  return (
    <div>
      {/* HEADER SECTION */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <Title level={2} style={{ color: token.colorPrimary, margin: 0 }}>KPI & Báo Cáo Hiệu Suất</Title>
          <Text style={{ color: token.colorTextDescription }}>Giám sát tỷ lệ chuyển đổi cuộc gọi thành lịch hẹn và doanh thu thưởng commission</Text>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <Space wrap>
            <Radio.Group 
              value={viewMode} 
              onChange={(e) => {
                setViewMode(e.target.value);
                setReferenceDate(dayjs());
              }}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="month">Tháng</Radio.Button>
              <Radio.Button value="week">Tuần</Radio.Button>
              <Radio.Button value="day">Ngày</Radio.Button>
            </Radio.Group>

            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Space.Compact>
                <Button 
                  icon={<LeftOutlined />} 
                  onClick={() => handleNavigate(-1)} 
                />
                <Button 
                  onClick={() => setPickerOpen(true)}
                  style={{ 
                    fontWeight: '600', 
                    minWidth: '210px', 
                    textAlign: 'center', 
                    color: token.colorText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {getPeriodLabel()} <CalendarOutlined style={{ color: token.colorPrimary }} />
                </Button>
                <Button 
                  icon={<RightOutlined />} 
                  onClick={() => handleNavigate(1)} 
                />
              </Space.Compact>

              {/* Invisible RangePicker that gets triggered programmatically */}
              <RangePicker 
                value={dateRange} 
                onChange={(dates) => {
                  if (dates) setDateRange([dates[0]!, dates[1]!]);
                }}
                format="DD/MM/YYYY"
                open={pickerOpen}
                onOpenChange={(open) => setPickerOpen(open)}
                style={{ 
                  position: 'absolute', 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  height: '100%', 
                  opacity: 0, 
                  pointerEvents: 'none',
                  zIndex: -1 
                }}
              />
            </div>
          </Space>

          {isAdmin && (
            <>
              <Radio.Group 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value)}
                optionType="button"
                buttonStyle="solid"
                style={{ marginRight: '8px' }}
              >
                <Radio.Button value="telesales">Online Consultant</Radio.Button>
                <Radio.Button value="oc">Client Consultant</Radio.Button>
              </Radio.Group>
              <Select
                value={selectedStaffId}
                onChange={setSelectedStaffId}
                style={{ width: 170 }}
                options={[
                  { value: 'ALL', label: selectedRole === 'oc' ? 'Tất cả Client Consultant' : 'Tất cả Online Consultant' },
                  ...leaderboard.map(s => ({ value: s.staffId.toString(), label: s.displayName }))
                ]}
                placeholder="Chọn nhân viên"
              />
              {selectedRole === 'telesales' && (
                <Button 
                  type="primary" 
                  icon={<SettingOutlined />} 
                  onClick={() => setConfigDrawerOpen(true)}
                  style={{ background: '#D4A84B', borderColor: '#D4A84B', color: 'black', fontWeight: '500' }}
                >
                  Cấu hình lương
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24" style={{ height: '300px' }}>
          <Space direction="vertical" align="center">
            <Spin size="large" />
            <Text type="secondary">Đang tải dữ liệu báo cáo...</Text>
          </Space>
        </div>
      ) : (
        <div>
          {/* STATS OVERVIEW CARDS */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card variant="outlined" style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>TỔNG KẾ HOẠCH</Text>
                <div style={{ fontSize: '26px', fontWeight: 'bold', margin: '8px 0', color: token.colorText }}>
                  {summary?.totalPlanned}
                </div>
                <Progress percent={100} showInfo={false} strokeColor={token.colorTextDescription} size="small" />
                <Text type="secondary" style={{ fontSize: '11px' }}>Kế hoạch đã lên</Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card variant="outlined" style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>ĐÃ THỰC HIỆN</Text>
                <div style={{ fontSize: '26px', fontWeight: 'bold', margin: '8px 0', color: '#1890FF' }}>
                  {summary?.totalCalled}
                </div>
                <Progress percent={getPercent(summary?.totalCalled || 0, summary?.totalPlanned || 0)} showInfo={false} strokeColor="#1890FF" size="small" />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  Đạt: {getPercent(summary?.totalCalled || 0, summary?.totalPlanned || 0)}% kế hoạch
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card variant="outlined" style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>BẮT MÁY</Text>
                <div style={{ fontSize: '26px', fontWeight: 'bold', margin: '8px 0', color: '#52C41A' }}>
                  {getPercent(summary?.totalAnswered || 0, summary?.totalCalled || 0)}%
                </div>
                <Progress percent={getPercent(summary?.totalAnswered || 0, summary?.totalCalled || 0)} showInfo={false} strokeColor="#52C41A" size="small" />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {summary?.totalAnswered} cuộc bắt máy
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card variant="outlined" style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>ĐẶT LỊCH (BOOKED)</Text>
                <div style={{ fontSize: '26px', fontWeight: 'bold', margin: '8px 0', color: token.colorPrimary }}>
                  {getPercent(summary?.totalBooked || 0, summary?.totalAnswered || 0)}%
                </div>
                <Progress percent={getPercent(summary?.totalBooked || 0, summary?.totalAnswered || 0)} showInfo={false} strokeColor={token.colorPrimary} size="small" />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {summary?.totalBooked} lịch hẹn thành công
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card variant="outlined" style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>ĐẾN TIỆM (CHECKIN)</Text>
                <div style={{ fontSize: '26px', fontWeight: 'bold', margin: '8px 0', color: '#722ED1' }}>
                  {getPercent(summary?.totalCheckin || 0, summary?.totalBooked || 0)}%
                </div>
                <Progress percent={getPercent(summary?.totalCheckin || 0, summary?.totalBooked || 0)} showInfo={false} strokeColor="#722ED1" size="small" />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {summary?.totalCheckin} khách ghé tiệm
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card variant="outlined" style={{ background: token.colorBgContainer, borderColor: '#D4A84B' }}>
                <Space>
                  <DollarOutlined style={{ color: '#D4A84B', fontSize: '15px' }} />
                  <Text type="secondary" style={{ fontSize: '12px' }}>THU NHẬP LIVE</Text>
                </Space>
                <div style={{ fontSize: '26px', fontWeight: 'bold', margin: '8px 0', color: '#D4A84B' }}>
                  {(summary?.totalEarnings || 0).toLocaleString('vi-VN')} đ
                </div>
                <Progress percent={100} showInfo={false} strokeColor="#D4A84B" size="small" />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {selectedRole === 'oc' ? 'Tổng lương & thưởng Client Consultant (CC)' : 'Tổng lương & thưởng Online Consultant (OC)'}
                </Text>
              </Card>
            </Col>
          </Row>

          {/* SALARY BREAKDOWN CARD (LIVE PAYSTUB) */}
          {summary?.salary && (
            <Card 
              title={
                <span style={{ color: token.colorText }}>
                  <DollarOutlined style={{ color: '#D4A84B' }} /> {summary.salary.role === 'oc' ? 'Chi Tiết Lương & Thưởng Client Consultant (Live Paystub)' : 'Chi Tiết Lương & Hoa Hồng Online Consultant (Live Paystub)'}
                </span>
              }
              variant="outlined"
              className="mb-6"
              style={{ background: token.colorBgContainer, borderColor: '#D4A84B' }}
            >
              {summary.salary.role === 'oc' ? (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <div style={{ padding: '12px', borderRight: `1px solid ${token.colorBorderSecondary}` }} className="md:border-r">
                      <Text type="secondary" style={{ fontSize: '12px', fontWeight: '600' }}>LƯƠNG CƠ BẢN & CHIẾN DỊCH</Text>
                      <div className="flex justify-between items-center mt-3">
                        <Text style={{ color: token.colorText }}>Lương cứng (Wage):</Text>
                        <Text style={{ fontWeight: '600', color: token.colorText }}>
                          {(summary.salary.baseSalary || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Text style={{ color: token.colorText }}>Tổng số check-in:</Text>
                        <Text style={{ fontWeight: '600', color: token.colorText }}>
                          {summary.salary.checkins || 0} khách
                        </Text>
                      </div>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <div style={{ padding: '12px', borderRight: `1px solid ${token.colorBorderSecondary}` }} className="md:border-r">
                      <Text type="secondary" style={{ fontSize: '12px', fontWeight: '600' }}>THƯỞNG DOANH SỐ & PHỤC VỤ</Text>
                      <div className="flex justify-between items-center mt-3">
                        <Text style={{ color: token.colorText }}>Thưởng doanh số (Sales KPI):</Text>
                        <Text style={{ fontWeight: '600', color: '#52C41A' }}>
                          +{(summary.salary.salesReward || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Text style={{ color: token.colorText }}>Thưởng phục vụ (Servicing KPI):</Text>
                        <Text style={{ fontWeight: '600', color: '#52C41A' }}>
                          +{(summary.salary.servicingReward || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <div style={{ padding: '12px' }}>
                      <Text type="secondary" style={{ fontSize: '12px', fontWeight: '600' }}>THƯỞNG TĂNG TRƯỞNG & CỬA HÀNG</Text>
                      <div className="flex justify-between items-center mt-3">
                        <Text style={{ color: token.colorText }}>Thưởng tăng trưởng (Growth):</Text>
                        <Text style={{ fontWeight: '600', color: '#52C41A' }}>
                          +{(summary.salary.growthReward || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Text style={{ color: token.colorText }}>Thưởng phục vụ tiệm (Store):</Text>
                        <Text style={{ fontWeight: '600', color: '#52C41A' }}>
                          +{(summary.salary.storeServicingReward || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              ) : (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <div style={{ padding: '12px', borderRight: isAdmin ? 'none' : `1px solid ${token.colorBorderSecondary}` }} className="md:border-r">
                      <Text type="secondary" style={{ fontSize: '12px', fontWeight: '600' }}>LƯƠNG CỨNG & HOA HỒNG GỌI</Text>
                      <div className="flex justify-between items-center mt-3">
                        <Text style={{ color: token.colorText }}>Lương cứng cơ bản (Based):</Text>
                        <Text style={{ fontWeight: '600', color: token.colorText }}>
                          {summary.salary.baseSalary.toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Text style={{ color: token.colorText }}>Thưởng check-in (Client):</Text>
                        <Text style={{ fontWeight: '600', color: token.colorText }}>
                          {(summary.salary.clientBonus || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <div style={{ padding: '12px', borderRight: isAdmin ? 'none' : `1px solid ${token.colorBorderSecondary}` }} className="md:border-r">
                      <Text type="secondary" style={{ fontSize: '12px', fontWeight: '600' }}>THƯỞNG HIỆU SUẤT ĐẠT MỐC</Text>
                      <div className="flex justify-between items-center mt-3">
                        <Text style={{ color: token.colorText }}>Thưởng mốc check-in ({summary.salary.doneCount || 0} khách):</Text>
                        <Text style={{ fontWeight: '600', color: '#52C41A' }}>
                          +{(summary.salary.doneBonus || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Text style={{ color: token.colorText }}>Thưởng tỷ lệ lỡ ({Math.round((summary.salary.missedRate || 0) * 100)}%):</Text>
                        <Text style={{ 
                          fontWeight: '600', 
                          color: (summary.salary.missedBonus || 0) >= 0 ? '#52C41A' : '#FF4D4F' 
                        }}>
                          {(summary.salary.missedBonus || 0) >= 0 ? '+' : ''}{(summary.salary.missedBonus || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                    </div>
                  </Col>

                  <Col xs={24} md={8}>
                    <div style={{ padding: '12px' }}>
                      <Text type="secondary" style={{ fontSize: '12px', fontWeight: '600' }}>HOA HỒNG TIPS & DOANH THU</Text>
                      <div className="flex justify-between items-center mt-3">
                        <Text style={{ color: token.colorText }}>Thưởng Tips (7% trên {(summary.salary.totalTips || 0).toLocaleString('vi-VN')} đ):</Text>
                        <Text style={{ fontWeight: '600', color: token.colorText }}>
                          {(summary.salary.tipBonus || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Text style={{ color: token.colorText }}>Thưởng doanh thu net (trên {(summary.salary.totalNetRev || 0).toLocaleString('vi-VN')} đ):</Text>
                        <Text style={{ fontWeight: '600', color: token.colorText }}>
                          {(summary.salary.revBonus || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              )}
              
              <Divider style={{ margin: '16px 0' }} />
              
              <div className="flex justify-between items-center px-3 flex-wrap gap-2">
                <Text style={{ fontSize: '15px', fontWeight: 'bold', color: token.colorText }}>TỔNG THU NHẬP TẠM TÍNH (LIVE SALARY):</Text>
                <Text style={{ fontSize: '22px', fontWeight: 'bold', color: '#D4A84B' }}>
                  {summary.salary.totalSalary.toLocaleString('vi-VN')} đ
                </Text>
              </div>
            </Card>
          )}

          {/* CHARTS SECTION */}
          <Row gutter={[16, 16]} className="mb-6">
            {/* CALL VOLUME TRENDS CHART */}
            <Col xs={24} lg={16}>
              <KpiTrendsChart trends={trends} />
            </Col>

            {/* CALL OUTCOMES BREAKDOWN */}
            <Col xs={24} lg={8}>
              <Card 
                title={<span style={{ color: token.colorText }}><PieChartOutlined /> Phân bổ kết quả cuộc gọi</span>}
                variant="outlined"
                style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary, height: '400px' }}
              >
                {!breakdown || Object.values(breakdown).reduce((a, b) => a + b, 0) === 0 ? (
                  <div className="flex justify-center items-center h-64 text-secondary">Chưa có cuộc gọi được thực hiện</div>
                ) : (
                  <div className="flex flex-col gap-4 mt-2">
                    {(() => {
                      const totalLogs = Object.values(breakdown).reduce((a, b) => a + b, 0);
                      const items = [
                        { key: 'BOOKED', label: 'Đặt Lịch (Booked)', value: breakdown.BOOKED, color: '#52C41A' },
                        { key: 'CALL_BACK', label: 'Hẹn Gọi Lại', value: breakdown.CALL_BACK, color: '#FAAD14' },
                        { key: 'NO_ANSWER', label: 'Không Nhấc Máy', value: breakdown.NO_ANSWER, color: '#FF4D4F' },
                        { key: 'BUSY', label: 'Máy Bận', value: breakdown.BUSY, color: '#13C2C2' },
                        { key: 'WRONG_NUMBER', label: 'Sai Số', value: breakdown.WRONG_NUMBER, color: '#F5222D' },
                        { key: 'OTHERS', label: 'Khác', value: breakdown.OTHERS, color: '#8C8C8C' }
                      ];

                      return (
                        <>
                          <div className="w-full flex h-5 rounded-full overflow-hidden mb-4">
                            {items.filter(i => i.value > 0).map(item => (
                              <Tooltip key={item.key} title={`${item.label}: ${item.value} (${getPercent(item.value, totalLogs)}%)`}>
                                <div 
                                  style={{ 
                                    width: `${(item.value / totalLogs) * 100}%`, 
                                    background: item.color 
                                  }} 
                                  className="h-full cursor-pointer hover:opacity-80 transition-opacity"
                                />
                              </Tooltip>
                            ))}
                          </div>
                          
                          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                            {items.map(item => (
                              <div key={item.key} className="flex justify-between items-center">
                                <Space>
                                  <Badge color={item.color} />
                                  <span style={{ fontSize: '13px', color: token.colorText }}>{item.label}</span>
                                </Space>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: token.colorText }}>
                                  {item.value} cuộc <Text type="secondary" style={{ fontSize: '11px' }}>({getPercent(item.value, totalLogs)}%)</Text>
                                </span>
                              </div>
                            ))}
                          </div>
                          
                          <Divider style={{ margin: '10px 0' }} />
                          <div className="text-center" style={{ fontSize: '12px', color: token.colorTextDescription }}>
                            Tổng số cuộc gọi đã kết nối: <strong>{totalLogs}</strong>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* ADMIN LEADERBOARD SECTION */}
          {isAdmin && (
            <Card 
              title={
                <span style={{ color: token.colorText }}>
                  <TrophyOutlined style={{ color: selectedRole === 'oc' ? '#722ED1' : '#D4A84B' }} /> Bảng Xếp Hạng Doanh Thu Thưởng ({selectedRole === 'oc' ? 'Online Consultant Leaderboard' : 'Booker Leaderboard'})
                </span>
              }
              variant="outlined"
              style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            >
              <Table 
                dataSource={leaderboard} 
                columns={leaderboardColumns} 
                rowKey="staffId" 
                pagination={false}
                bordered
                scroll={{ x: 'max-content' }}
                className="antd-custom-table"
                locale={{ emptyText: 'Chưa có dữ liệu thống kê nhân viên' }}
                summary={(pageData) => {
                  let totalPlanned = 0;
                  let totalCalled = 0;
                  let totalBooked = 0;
                  let totalCheckin = 0;
                  
                  let totalBaseSalary = 0;
                  let totalClientBonus = 0;
                  let totalDoneBonus = 0;
                  let totalMissedBonus = 0;
                  let totalTipBonus = 0;
                  let totalRevBonus = 0;

                  let totalSalesReward = 0;
                  let totalServicingReward = 0;
                  let totalGrowthReward = 0;
                  let totalStoreServicingReward = 0;

                  let totalEarnings = 0;

                  pageData.forEach((record: any) => {
                    totalPlanned += record.totalPlanned || 0;
                    totalCalled += record.totalCalled || 0;
                    totalBooked += record.totalBooked || 0;
                    totalCheckin += record.totalCheckin || 0;

                    totalBaseSalary += record.salary?.baseSalary || 0;
                    totalClientBonus += record.salary?.clientBonus || 0;
                    totalDoneBonus += record.salary?.doneBonus || 0;
                    totalMissedBonus += record.salary?.missedBonus || 0;
                    totalTipBonus += record.salary?.tipBonus || 0;
                    totalRevBonus += record.salary?.revBonus || 0;

                    totalSalesReward += record.salary?.salesReward || 0;
                    totalServicingReward += record.salary?.servicingReward || 0;
                    totalGrowthReward += record.salary?.growthReward || 0;
                    totalStoreServicingReward += record.salary?.storeServicingReward || 0;

                    totalEarnings += record.totalEarnings || 0;
                  });

                  return (
                    <Table.Summary fixed="bottom">
                      <Table.Summary.Row style={{ background: selectedRole === 'oc' ? 'rgba(114, 46, 209, 0.05)' : 'rgba(212, 168, 75, 0.05)' }}>
                        <Table.Summary.Cell index={0} colSpan={1}>
                          <span style={{ fontWeight: 'bold', color: token.colorText }}>Tổng cộng</span>
                        </Table.Summary.Cell>
                        {selectedRole === 'oc' ? (
                          <>
                            <Table.Summary.Cell index={1}>
                              <span style={{ fontWeight: 'bold', color: token.colorText }}>{totalCheckin}</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2}>
                              <span style={{ fontWeight: 'bold', color: token.colorText }}>-</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3}>
                              <span style={{ fontWeight: 'bold', color: token.colorText }}>{totalBaseSalary.toLocaleString('vi-VN')} đ</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4}>
                              <span style={{ fontWeight: 'bold', color: token.colorText }}>{totalSalesReward.toLocaleString('vi-VN')} đ</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={5}>
                              <span style={{ fontWeight: 'bold', color: token.colorText }}>{totalServicingReward.toLocaleString('vi-VN')} đ</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={6}>
                              <span style={{ fontWeight: 'bold', color: token.colorText }}>{totalGrowthReward.toLocaleString('vi-VN')} đ</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={7}>
                              <span style={{ fontWeight: 'bold', color: token.colorText }}>{totalStoreServicingReward.toLocaleString('vi-VN')} đ</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={8}>
                              <span style={{ fontWeight: 'bold', color: '#D4A84B', fontSize: '15px' }}>
                                {totalEarnings.toLocaleString('vi-VN')} đ
                              </span>
                            </Table.Summary.Cell>
                          </>
                        ) : (
                          <>
                            <Table.Summary.Cell index={1}>
                              <span style={{ fontWeight: 'bold', color: token.colorText }}>{totalPlanned}</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2}>
                              <span style={{ fontWeight: 'bold', color: token.colorText }}>{totalCalled}</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3}>
                              <span style={{ fontWeight: 'bold', color: token.colorPrimary }}>{totalBooked}</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4}>
                              <span style={{ fontWeight: 'bold', color: '#722ED1' }}>{totalCheckin}</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={5}>
                              <span style={{ fontWeight: 'bold', color: token.colorText }}>{totalBaseSalary.toLocaleString('vi-VN')} đ</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={6}>
                              <span style={{ fontWeight: 'bold', color: token.colorText }}>{totalClientBonus.toLocaleString('vi-VN')} đ</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={7}>
                              <span style={{ fontWeight: 'bold', color: token.colorText }}>{totalDoneBonus.toLocaleString('vi-VN')} đ</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={8}>
                              <span style={{ fontWeight: 'bold', color: totalMissedBonus < 0 ? '#FF4D4F' : token.colorText }}>
                                {(totalMissedBonus >= 0 ? '+' : '')}{totalMissedBonus.toLocaleString('vi-VN')} đ
                              </span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={9}>
                              <span style={{ fontWeight: 'bold', color: token.colorText }}>{totalTipBonus.toLocaleString('vi-VN')} đ</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={10}>
                              <span style={{ fontWeight: 'bold', color: token.colorText }}>{totalRevBonus.toLocaleString('vi-VN')} đ</span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={11}>
                              <span style={{ fontWeight: 'bold', color: '#D4A84B', fontSize: '15px' }}>
                                {totalEarnings.toLocaleString('vi-VN')} đ
                              </span>
                            </Table.Summary.Cell>
                          </>
                        )}
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            </Card>
          )}

          {/* MODULAR CONFIG AND AUDIT DRAWERS */}
          <SalaryConfigDrawer
            open={configDrawerOpen}
            onClose={() => setConfigDrawerOpen(false)}
            onSaveSuccess={() => {
              setConfigDrawerOpen(false);
              fetchKpiData();
            }}
          />

          <AppointmentsAuditDrawer
            open={appointmentsDrawerOpen}
            onClose={() => setAppointmentsDrawerOpen(false)}
            selectedBookerId={selectedBookerId}
            selectedBookerName={selectedBookerName}
            selectedStaffRecord={selectedStaffRecord}
            dateRange={dateRange}
            themeMode={themeMode}
          />
        </div>
      )}
    </div>
  );
}

'use client';

import '../../suppress-warnings';
import React from 'react';
import {
  Table,
  Tabs,
  Button,
  Card,
  Space,
  Radio,
  DatePicker,
  Typography,
  Select,
  theme,
  Popover,
  Checkbox,
  Slider,
  Badge,
  Row,
  Col,
  Spin,
  message,
} from 'antd';
import { CalendarOutlined, LeftOutlined, RightOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';
import { useOmiCall } from '../../../context/OmiCallContext';

const CustomerDetailDrawer = dynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });
const BookingWizardDrawer = dynamic(() => import('../../../components/BookingWizardDrawer'), { ssr: false });
const RescheduleBookingModal = dynamic(
  () => import('../../../components/RescheduleBookingModal').then((m) => m.RescheduleBookingModal),
  { ssr: false }
);
import { useAppointmentsData } from './hooks/useAppointmentsData';
import { getPendingColumns, getCompletedColumns, getMissedColumns } from './components/AppointmentColumns';
import MissedSummaryCards from './components/MissedSummaryCards';
import MissedReasonModal from './components/MissedReasonModal';
import { MissedSummaryStats, Appointment } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';

dayjs.extend(isoWeek);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

import { formatVND } from '../../../lib/format-utils';
import { ResizableHeaderCell } from '../../../components/ResizableHeaderCell';

const defaultColumnConfig = {
  customerName: { visible: true, width: 220, label: 'Khách hàng' },
  customerPhone: { visible: true, width: 140, label: 'Số Điện Thoại' },
  appointmentTime: { visible: true, width: 150, label: 'Thời Gian Hẹn' },
  serviceName: { visible: true, width: 200, label: 'Dịch vụ chính' },
  totalPrice: { visible: true, width: 130, label: 'Giá trị ước tính' },
  netRevenue: { visible: true, width: 130, label: 'Doanh thu Net' },
  tipAmount: { visible: true, width: 120, label: 'Tiền tips' },
  bookingBonus: { visible: true, width: 130, label: 'Hoa hồng OC' },
  bookingChannel: { visible: true, width: 120, label: 'Kênh đặt lịch' },
  promotion: { visible: true, width: 150, label: 'Khuyến mãi' },
  bookingNote: { visible: true, width: 220, label: 'Ghi chú đặt lịch' },
  orderState: { visible: true, width: 120, label: 'Trạng thái' },
};

export default function AppointmentsPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const { makeCall } = useOmiCall();

  const hookOptions = React.useMemo(
    () => ({
      onSuccess: (msg: string) => message.success(msg),
      onError: (msg: string) => message.error(msg),
    }),
    []
  );

  const {
    currentUser,
    columnConfig,
    saveColumnConfig,
    viewMode,
    setViewMode,
    referenceDate,
    setReferenceDate,
    customRange,
    setCustomRange,
    dateRange,
    pickerOpen,
    setPickerOpen,
    activeTab,
    setActiveTab,
    missedStatusFilter,
    setMissedStatusFilter,
    selectedStaffId,
    setSelectedStaffId,
    staffList,
    appointments,
    loading,
    hasMore,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    total,
    summary,
    sentinelRef,
    selectedCustomer,
    detailModalVisible,
    setDetailModalVisible,
    detailModalLoading,
    customerHistory,
    bookingWizardVisible,
    setBookingWizardVisible,
    bookingInitialCustomer,
    setBookingInitialCustomer,
    rescheduleModalVisible,
    setRescheduleModalVisible,
    selectedBookingForReschedule,
    setSelectedBookingForReschedule,
    fetchAppointments,
    handleCancelBooking,
    handleNavigate,
    getPeriodLabel,
    openDetailModal,
  } = useAppointmentsData(hookOptions);

  const [missedReasonModalVisible, setMissedReasonModalVisible] = React.useState(false);
  const [selectedMissedAppointment, setSelectedMissedAppointment] = React.useState<Appointment | null>(null);
  const [missedSummary, setMissedSummary] = React.useState<MissedSummaryStats | null>(null);
  const [missedSummaryLoading, setMissedSummaryLoading] = React.useState(false);

  const dateFromStr = dateRange?.[0]?.format('YYYY-MM-DD') || '';
  const dateToStr = dateRange?.[1]?.format('YYYY-MM-DD') || '';

  const fetchMissedSummary = React.useCallback(async () => {
    if (!dateFromStr || !dateToStr) return;
    setMissedSummaryLoading(true);
    try {
      const res = await apiClient.customers.getMissedSummary({ dateFrom: dateFromStr, dateTo: dateToStr });
      setMissedSummary(res);
    } catch (err) {
      // ignore
    } finally {
      setMissedSummaryLoading(false);
    }
  }, [dateFromStr, dateToStr]);

  React.useEffect(() => {
    if (activeTab === 'missed' && dateFromStr && dateToStr) {
      fetchMissedSummary();
    }
  }, [activeTab, dateFromStr, dateToStr, fetchMissedSummary]);

  const pendingColumns = React.useMemo(
    () =>
      getPendingColumns({
        themeMode,
        token,
        formatVND,
        openDetailModal,
        makeCall,
        setSelectedBookingForReschedule,
        setRescheduleModalVisible,
        handleCancelBooking,
      }),
    [
      themeMode,
      token,
      openDetailModal,
      makeCall,
      setSelectedBookingForReschedule,
      setRescheduleModalVisible,
      handleCancelBooking,
    ]
  );

  const missedColumns = React.useMemo(
    () =>
      getMissedColumns({
        themeMode,
        token,
        formatVND,
        openDetailModal,
        makeCall,
        setBookingInitialCustomer,
        setBookingWizardVisible,
        onOpenMissedReasonModal: (record) => {
          setSelectedMissedAppointment(record);
          setMissedReasonModalVisible(true);
        },
      }),
    [themeMode, token, openDetailModal, makeCall, setBookingInitialCustomer, setBookingWizardVisible]
  );

  const completedColumns = React.useMemo(
    () =>
      getCompletedColumns({
        themeMode,
        token,
        formatVND,
        openDetailModal,
      }),
    [themeMode, token, openDetailModal]
  );

  const baseColumns =
    activeTab === 'completed' ? completedColumns : activeTab === 'missed' ? missedColumns : pendingColumns;

  const columns = React.useMemo(
    () =>
      baseColumns
        .filter((col) => {
          if (col.key === 'action' || col.key === 'stt') return true;
          const config = columnConfig[col.key as string];
          return config ? config.visible : true;
        })
        .map((col) => {
          const colKey = col.key as string;
          const config = columnConfig[colKey];
          const colWidth = config?.width || col.width || 150;
          return {
            ...col,
            width: colWidth,
            onHeaderCell: (column: SafeAny) => ({
              width: column.width,
              onResize: (newWidth: number) => {
                if (colKey && columnConfig[colKey]) {
                  saveColumnConfig({
                    ...columnConfig,
                    [colKey]: {
                      ...columnConfig[colKey],
                      width: Math.round(newWidth),
                    },
                  });
                }
              },
            }),
          };
        }),
    [baseColumns, columnConfig, saveColumnConfig]
  );

  const totalWidth = React.useMemo(() => columns.reduce((sum, col) => sum + (Number(col.width) || 120), 0), [columns]);

  const tableComponents = React.useMemo(
    () => ({
      header: {
        cell: ResizableHeaderCell,
      },
    }),
    []
  );

  const handleRow = React.useCallback(
    (record: Appointment) => {
      const isPast = record.bookingDateStart ? dayjs(record.bookingDateStart).isBefore(dayjs()) : false;
      const isCompleted = record.orderState === 'Completed';
      const isInService = ['CheckIn', 'ServiceCleaned', 'CheckOut'].includes(record.orderState);

      const style: React.CSSProperties = {};

      if (isPast && !isCompleted && !isInService) {
        style.backgroundColor = themeMode === 'dark' ? '#2d1818' : '#fff1f0';
      } else if (!isCompleted && !isInService) {
        const isToday = record.bookingDateStart ? dayjs(record.bookingDateStart).isSame(dayjs(), 'day') : false;
        if (isToday) {
          style.backgroundColor = themeMode === 'dark' ? '#252115' : '#fefbe6';
        }
      } else if (isInService) {
        style.backgroundColor = themeMode === 'dark' ? '#112134' : '#e6f7ff';
      }

      return { style };
    },
    [themeMode]
  );

  return (
    <div>
      {/* HEADER SECTION */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <Title level={2} style={{ color: token.colorPrimary, margin: 0 }}>
              Quản Lý Lịch Hẹn Của Tôi
            </Title>
            <Text style={{ color: token.colorTextDescription }}>
              Theo dõi và quản lý lịch hẹn của khách hàng đã được phân bổ cho bạn
            </Text>
          </div>
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            style={{
              backgroundColor: '#D4A84B',
              borderColor: '#D4A84B',
              height: '38px',
              borderRadius: '6px',
              fontWeight: 'bold',
              marginTop: '4px',
            }}
            onClick={() => setBookingWizardVisible(true)}
          >
            Đặt lịch mới
          </Button>
        </div>

        {/* Date Filter & Staff Selection */}
        <div className="flex items-center gap-3 flex-wrap">
          {currentUser?.role === 'admin' && (
            <Select
              value={selectedStaffId}
              onChange={(value) => {
                setSelectedStaffId(value);
                localStorage.setItem('mos_appointments_selectedStaffId', value);
              }}
              style={{ width: '180px' }}
              options={[
                { value: 'all', label: 'Tất cả Booker' },
                ...staffList.map((s) => ({ value: s.id.toString(), label: s.displayName })),
              ]}
              placeholder="Chọn Booker"
            />
          )}

          <Space wrap>
            <Space.Compact>
              <Button
                type={viewMode === 'month' ? 'primary' : 'default'}
                onClick={() => {
                  setViewMode('month');
                  setCustomRange(null);
                  localStorage.setItem('mos_appointments_viewMode', 'month');
                }}
              >
                Tháng
              </Button>
              <Button
                type={viewMode === 'week' ? 'primary' : 'default'}
                onClick={() => {
                  setViewMode('week');
                  setCustomRange(null);
                  localStorage.setItem('mos_appointments_viewMode', 'week');
                }}
              >
                Tuần
              </Button>
              <Button
                type={viewMode === 'day' ? 'primary' : 'default'}
                onClick={() => {
                  setViewMode('day');
                  setCustomRange(null);
                  localStorage.setItem('mos_appointments_viewMode', 'day');
                }}
              >
                Ngày
              </Button>
            </Space.Compact>

            <Space.Compact>
              <Button
                icon={<LeftOutlined />}
                onClick={() => handleNavigate(-1)}
                aria-label="Ngày trước đó"
                title="Ngày trước đó"
              />
              <div style={{ position: 'relative', display: 'inline-block' }}>
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
                    gap: '8px',
                  }}
                >
                  {getPeriodLabel()} <CalendarOutlined style={{ color: token.colorPrimary }} />
                </Button>
                {pickerOpen && (
                  <RangePicker
                    value={dateRange}
                    onChange={(dates) => {
                      if (dates && dates[0] && dates[1]) {
                        setCustomRange([dates[0]!, dates[1]!]);
                        setPickerOpen(false);
                      }
                    }}
                    format="DD/MM/YYYY"
                    open={true}
                    onOpenChange={(open) => {
                      if (!open) setPickerOpen(false);
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 0,
                      height: 0,
                      padding: 0,
                      border: 'none',
                      visibility: 'hidden',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
              <Button
                icon={<RightOutlined />}
                onClick={() => handleNavigate(1)}
                aria-label="Ngày tiếp theo"
                title="Ngày tiếp theo"
              />
            </Space.Compact>

            <Popover
              title={
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>Cấu hình hiển thị cột</span>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => saveColumnConfig(defaultColumnConfig)}
                    style={{ padding: 0 }}
                  >
                    Khôi phục
                  </Button>
                </div>
              }
              trigger="click"
              placement="bottomRight"
              content={
                <div className="custom-scrollbar" style={{ width: '300px', maxHeight: '400px' }}>
                  {Object.entries(columnConfig)
                    .filter(([key]) => {
                      if (activeTab === 'completed') {
                        return !['totalPrice', 'bookingNote'].includes(key);
                      } else {
                        return !['netRevenue', 'tipAmount', 'bookingBonus', 'serviceName'].includes(key);
                      }
                    })
                    .map(([key, config]) => (
                      <div key={key} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Checkbox
                            checked={config.visible}
                            onChange={(e) => {
                              saveColumnConfig({
                                ...columnConfig,
                                [key]: { ...config, visible: e.target.checked },
                              });
                            }}
                          >
                            <span style={{ fontWeight: '500' }}>{config.label}</span>
                          </Checkbox>
                          <span style={{ fontSize: '12px', color: token.colorTextDescription }}>{config.width}px</span>
                        </div>
                        {config.visible && (
                          <div style={{ paddingLeft: '24px', marginTop: '4px' }}>
                            <Slider
                              min={80}
                              max={400}
                              step={10}
                              value={config.width}
                              onChange={(val) => {
                                saveColumnConfig({
                                  ...columnConfig,
                                  [key]: { ...config, width: val },
                                });
                              }}
                              tooltip={{ formatter: (v) => `${v}px` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              }
            >
              <Button icon={<SettingOutlined />} title="Cấu hình cột" />
            </Popover>
          </Space>
        </div>
      </div>

      {/* 3 INTERACTIVE SUMMARY KPI CARDS */}
      <div style={{ marginBottom: '20px' }}>
        <Row gutter={[16, 16]}>
          {/* Card 1: Lịch Hẹn */}
          <Col xs={24} sm={8}>
            <div
              onClick={() => {
                setActiveTab('pending');
                localStorage.setItem('mos_appointments_activeTab', 'pending');
              }}
              style={{
                cursor: 'pointer',
                background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
                border:
                  activeTab === 'pending'
                    ? '2px solid #D4A84B'
                    : `1px solid ${themeMode === 'dark' ? '#303030' : '#e8e8e8'}`,
                boxShadow: activeTab === 'pending' ? '0 0 12px rgba(212, 168, 75, 0.3)' : '0 2px 6px rgba(0,0,0,0.04)',
                borderRadius: '12px',
                padding: '16px 20px',
                transition: 'all 0.25s ease-in-out',
                position: 'relative',
              }}
              className="hover:scale-[1.01]"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#D4A84B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    📅 LỊCH HẸN (ĐANG CHỜ)
                  </div>
                  <div
                    style={{ fontSize: '24px', fontWeight: '800', color: token.colorText, marginTop: '4px' }}
                    className="tabular-nums"
                  >
                    {summary?.totalPending ?? (activeTab === 'pending' ? total : 0)}{' '}
                    <span style={{ fontSize: '13px', fontWeight: 'normal', color: token.colorTextDescription }}>
                      lượt
                    </span>
                  </div>
                  <div
                    style={{ fontSize: '12px', color: token.colorTextDescription, marginTop: '2px' }}
                    className="tabular-nums"
                  >
                    Ước tính:{' '}
                    <span style={{ fontWeight: '600', color: '#D4A84B' }}>{formatVND(summary?.pendingValue || 0)}</span>
                  </div>
                </div>
                {activeTab === 'pending' && (
                  <Badge count="Đang xem" style={{ backgroundColor: '#D4A84B', fontWeight: 'bold' }} />
                )}
              </div>
            </div>
          </Col>

          {/* Card 2: Lịch Missed */}
          <Col xs={24} sm={8}>
            <div
              onClick={() => {
                setActiveTab('missed');
                localStorage.setItem('mos_appointments_activeTab', 'missed');
              }}
              style={{
                cursor: 'pointer',
                background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
                border:
                  activeTab === 'missed'
                    ? '2px solid #FF4D4F'
                    : `1px solid ${themeMode === 'dark' ? '#303030' : '#e8e8e8'}`,
                boxShadow: activeTab === 'missed' ? '0 0 12px rgba(255, 77, 79, 0.3)' : '0 2px 6px rgba(0,0,0,0.04)',
                borderRadius: '12px',
                padding: '16px 20px',
                transition: 'all 0.25s ease-in-out',
                position: 'relative',
              }}
              className="hover:scale-[1.01]"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#FF4D4F',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    ⚠️ LỊCH MISSED (LỠ / HỦY)
                  </div>
                  <div
                    style={{ fontSize: '24px', fontWeight: '800', color: token.colorText, marginTop: '4px' }}
                    className="tabular-nums"
                  >
                    {summary?.totalMissed ?? (activeTab === 'missed' ? total : 0)}{' '}
                    <span style={{ fontSize: '13px', fontWeight: 'normal', color: token.colorTextDescription }}>
                      lượt
                    </span>
                  </div>
                  <div
                    style={{ fontSize: '12px', color: token.colorTextDescription, marginTop: '2px' }}
                    className="tabular-nums"
                  >
                    Tỷ lệ Missed:{' '}
                    <span style={{ fontWeight: '600', color: '#FF4D4F' }}>
                      {summary?.missedRate ?? summary?.missedRatePct ?? 0}%
                    </span>
                  </div>
                </div>
                {activeTab === 'missed' && (
                  <Badge count="Đang xem" style={{ backgroundColor: '#FF4D4F', fontWeight: 'bold' }} />
                )}
              </div>
            </div>
          </Col>

          {/* Card 3: Lịch Done */}
          <Col xs={24} sm={8}>
            <div
              onClick={() => {
                setActiveTab('completed');
                localStorage.setItem('mos_appointments_activeTab', 'completed');
              }}
              style={{
                cursor: 'pointer',
                background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
                border:
                  activeTab === 'completed'
                    ? '2px solid #52C41A'
                    : `1px solid ${themeMode === 'dark' ? '#303030' : '#e8e8e8'}`,
                boxShadow: activeTab === 'completed' ? '0 0 12px rgba(82, 196, 26, 0.3)' : '0 2px 6px rgba(0,0,0,0.04)',
                borderRadius: '12px',
                padding: '16px 20px',
                transition: 'all 0.25s ease-in-out',
                position: 'relative',
              }}
              className="hover:scale-[1.01]"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#52C41A',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    ✅ LỊCH DONE (ĐÃ ĐẾN)
                  </div>
                  <div
                    style={{ fontSize: '24px', fontWeight: '800', color: token.colorText, marginTop: '4px' }}
                    className="tabular-nums"
                  >
                    {summary?.totalCompleted ?? (activeTab === 'completed' ? total : 0)}{' '}
                    <span style={{ fontSize: '13px', fontWeight: 'normal', color: token.colorTextDescription }}>
                      lượt
                    </span>
                  </div>
                  <div
                    style={{ fontSize: '12px', color: token.colorTextDescription, marginTop: '2px' }}
                    className="tabular-nums"
                  >
                    Doanh thu Net:{' '}
                    <span style={{ fontWeight: '600', color: '#52C41A' }}>
                      {formatVND(summary?.completedRevenue || summary?.totalNetRev || 0)}
                    </span>
                  </div>
                </div>
                {activeTab === 'completed' && (
                  <Badge count="Đang xem" style={{ backgroundColor: '#52C41A', fontWeight: 'bold' }} />
                )}
              </div>
            </div>
          </Col>
        </Row>
      </div>

      <Card style={{ background: token.colorBgContainer, borderRadius: '8px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as SafeAny);
            localStorage.setItem('mos_appointments_activeTab', key);
          }}
          style={{ color: token.colorText }}
          items={[
            {
              key: 'pending',
              label: (
                <span style={{ fontSize: '15px', fontWeight: '500' }}>
                  Lịch hẹn / Đang chờ
                  <Badge
                    count={summary?.totalPending ?? (activeTab === 'pending' ? total : 0)}
                    style={{ marginLeft: 8, backgroundColor: '#D4A84B' }}
                  />
                </span>
              ),
            },
            {
              key: 'missed',
              label: (
                <span style={{ fontSize: '15px', fontWeight: '500' }}>
                  Lịch Missed (Không đến)
                  <Badge
                    count={summary?.totalMissed ?? (activeTab === 'missed' ? total : 0)}
                    style={{ marginLeft: 8, backgroundColor: '#FF4D4F' }}
                  />
                </span>
              ),
            },
            {
              key: 'completed',
              label: (
                <span style={{ fontSize: '15px', fontWeight: '500' }}>
                  Lịch Done (Đã đến)
                  <Badge
                    count={summary?.totalCompleted ?? (activeTab === 'completed' ? total : 0)}
                    style={{ marginLeft: 8, backgroundColor: '#52C41A' }}
                  />
                </span>
              ),
            },
          ]}
        />

        {activeTab === 'missed' && (
          <div className="mt-4 mb-4 flex flex-col gap-3">
            <MissedSummaryCards summary={missedSummary} loading={missedSummaryLoading} />

            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                Lọc công việc theo dõi Missed:
              </div>
              <Radio.Group
                value={missedStatusFilter}
                onChange={(e) => setMissedStatusFilter(e.target.value)}
                optionType="button"
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="ALL">Tất cả ({missedSummary?.totalMissed ?? 0})</Radio.Button>
                <Radio.Button value="UNTAGGED">⚠️ Chưa ghi lý do ({missedSummary?.untaggedCount ?? 0})</Radio.Button>
                <Radio.Button value="FOLLOWUP">📞 Cần chăm sóc / Hẹn lại</Radio.Button>
                <Radio.Button value="RESOLVED">✅ Đã giải quyết / Đã hẹn mới</Radio.Button>
              </Radio.Group>
            </div>
          </div>
        )}

        {activeTab === 'completed' && summary && (
          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={6} md={3}>
                <div
                  style={{
                    background: themeMode === 'dark' ? '#1f1f1f' : '#f9f9f9',
                    border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: token.colorTextDescription,
                      textTransform: 'uppercase',
                    }}
                  >
                    LỊCH HẸN / CHECK-IN
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: token.colorText }}>
                    {summary.totalPlanned} lượt / <span style={{ color: '#52C41A' }}>{summary.totalCheckin}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                    Tỷ lệ đến: {summary.checkInRate}%
                  </div>
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div
                  style={{
                    background: themeMode === 'dark' ? '#1f1f1f' : '#f9f9f9',
                    border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: token.colorTextDescription,
                      textTransform: 'uppercase',
                    }}
                  >
                    LƯƠNG CỨNG
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: token.colorText }}>
                    {formatVND(summary.baseSalary)}
                  </div>
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>Cố định hàng tháng</div>
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div
                  style={{
                    background: themeMode === 'dark' ? '#1f1f1f' : '#f9f9f9',
                    border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: token.colorTextDescription,
                      textTransform: 'uppercase',
                    }}
                  >
                    HOA HỒNG ĐẶT LỊCH (LIVE)
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#52C41A' }}>
                    {formatVND(summary.clientBonus)}
                  </div>
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>Cộng dồn đơn thành công</div>
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div
                  style={{
                    background: themeMode === 'dark' ? '#1f1f1f' : '#f9f9f9',
                    border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: token.colorTextDescription,
                      textTransform: 'uppercase',
                    }}
                  >
                    THƯỞNG MỐC DONE
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: summary.doneBonus > 0 ? '#52C41A' : token.colorText,
                    }}
                  >
                    {formatVND(summary.doneBonus)}
                  </div>
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                    {summary.doneBonus > 0 ? `Đạt mốc ${summary.doneLevelCount} đơn` : 'Chưa đạt mốc thưởng'}
                  </div>
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div
                  style={{
                    background: themeMode === 'dark' ? '#1f1f1f' : '#f9f9f9',
                    border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: token.colorTextDescription,
                      textTransform: 'uppercase',
                    }}
                  >
                    THƯỞNG / PHẠT LỖI
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color:
                        summary.missedBonus < 0 ? '#FF4D4F' : summary.missedBonus > 0 ? '#52C41A' : token.colorText,
                    }}
                  >
                    {summary.missedBonus > 0 ? '+' : ''}
                    {formatVND(summary.missedBonus)}
                  </div>
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                    Lỗi {summary.missedRatePct}% (Mốc &lt;= {summary.missedLevelRate || 10}%)
                  </div>
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div
                  style={{
                    background: themeMode === 'dark' ? '#1f1f1f' : '#f9f9f9',
                    border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: token.colorTextDescription,
                      textTransform: 'uppercase',
                    }}
                  >
                    THƯỞNG TIPS (7%)
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: summary.tipBonus > 0 ? '#52C41A' : token.colorText,
                    }}
                  >
                    {formatVND(summary.tipBonus)}
                  </div>
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                    Tổng tips: {formatVND(summary.totalTips)}
                  </div>
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div
                  style={{
                    background: themeMode === 'dark' ? '#1f1f1f' : '#f9f9f9',
                    border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#e8e8e8'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: token.colorTextDescription,
                      textTransform: 'uppercase',
                    }}
                  >
                    THƯỞNG DOANH THU NET
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: summary.revBonus > 0 ? '#52C41A' : token.colorText,
                    }}
                  >
                    {formatVND(summary.revBonus)}
                  </div>
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                    {summary.revBonus > 0
                      ? `Đạt mốc ${summary.revLevelMin / 1000000}M (${Math.round(summary.revLevelRate * 100 * 100) / 100}%)`
                      : `Chưa đạt (DS: ${Math.round(summary.totalNetRev / 100000) / 10}M)`}
                  </div>
                </div>
              </Col>

              <Col xs={12} sm={6} md={3}>
                <div
                  style={{
                    background: themeMode === 'dark' ? '#2c220f' : '#fefaf0',
                    border: `1px solid #D4A84B`,
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    height: '100%',
                    boxShadow:
                      themeMode === 'dark' ? '0 0 10px rgba(212, 168, 75, 0.15)' : '0 0 10px rgba(212, 168, 75, 0.08)',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#D4A84B', textTransform: 'uppercase' }}>
                    TỔNG THU NHẬP (LIVE)
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#D4A84B' }}>
                    {formatVND(summary.totalSalary)}
                  </div>
                  <div style={{ fontSize: '11px', color: themeMode === 'dark' ? '#bfa36b' : '#a38445' }}>
                    Lương cứng + thưởng live
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        )}

        <Table
          components={tableComponents}
          dataSource={appointments}
          columns={columns}
          rowKey="id"
          size="small"
          loading={loading && appointments.length === 0}
          pagination={false}
          scroll={{ x: totalWidth }}
          tableLayout="fixed"
          style={{
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: '8px',
            marginTop: '16px',
          }}
          className="antd-custom-table"
          onRow={handleRow}
        />

        {/* Infinite Scroll Sentinel */}
        <div
          ref={sentinelRef}
          style={{
            padding: '20px 0',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            color: token.colorTextDescription,
            fontSize: '14px',
          }}
        >
          {loading && appointments.length > 0 && (
            <>
              <Spin size="small" />
              <span>Đang tải thêm dữ liệu...</span>
            </>
          )}
          {!loading && !hasMore && appointments.length > 0 && (
            <span style={{ fontStyle: 'italic', opacity: 0.8 }}>
              Đã hiển thị tất cả {appointments.length} / {total} lịch hẹn
            </span>
          )}
        </div>
      </Card>

      {/* CUSTOMER DETAIL DRAWER */}
      {detailModalVisible && (
        <CustomerDetailDrawer
          open={detailModalVisible}
          customerId={selectedCustomer?.id || null}
          onClose={() => setDetailModalVisible(false)}
          onBookAppointment={(cust) => {
            setDetailModalVisible(false);
            setBookingInitialCustomer({
              id: cust.id,
              name: cust.name,
              phone: cust.phone,
              bucket: cust.bucket,
            });
            setBookingWizardVisible(true);
          }}
        />
      )}

      {/* BOOKING WIZARD DRAWER */}
      {bookingWizardVisible && (
        <BookingWizardDrawer
          open={bookingWizardVisible}
          initialCustomer={bookingInitialCustomer}
          onClose={() => {
            setBookingWizardVisible(false);
            setBookingInitialCustomer(null);
          }}
          onSuccess={fetchAppointments}
        />
      )}

      {rescheduleModalVisible && (
        <RescheduleBookingModal
          open={rescheduleModalVisible}
          booking={selectedBookingForReschedule}
          onClose={() => {
            setRescheduleModalVisible(false);
            setSelectedBookingForReschedule(null);
          }}
          onSuccess={fetchAppointments}
        />
      )}

      {missedReasonModalVisible && (
        <MissedReasonModal
          visible={missedReasonModalVisible}
          appointment={selectedMissedAppointment}
          onCancel={() => {
            setMissedReasonModalVisible(false);
            setSelectedMissedAppointment(null);
          }}
          onSuccess={(status) => {
            fetchAppointments();
            fetchMissedSummary();
            if (status === 'RESCHEDULED' && selectedMissedAppointment) {
              setBookingInitialCustomer({
                id: selectedMissedAppointment.customerId,
                fullName: selectedMissedAppointment.customerName,
                phoneNumber: selectedMissedAppointment.customerPhone || '',
              });
              setBookingWizardVisible(true);
            }
          }}
          makeCall={makeCall}
          onOpenReschedule={(apt) => {
            setSelectedBookingForReschedule(apt);
            setRescheduleModalVisible(true);
          }}
        />
      )}
    </div>
  );
}

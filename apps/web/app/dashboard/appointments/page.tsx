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
  Tooltip,
} from 'antd';
import {
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  SettingOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';
import { useOmiCall } from '../../../context/OmiCallContext';

const CustomerDetailDrawer = dynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });
const BookingWizardDrawer = dynamic(() => import('../../../components/BookingWizardDrawer'), { ssr: false });
import CalendarPlusIcon from '../../../components/icons/CalendarPlusIcon';
const RescheduleBookingModal = dynamic(
  () => import('../../../components/RescheduleBookingModal').then((m) => m.RescheduleBookingModal),
  { ssr: false }
);
import { useAppointmentsData } from './hooks/useAppointmentsData';
import { ColumnsType } from 'antd/es/table';
import { getPendingColumns, getCompletedColumns, getMissedColumns } from './components/AppointmentColumns';
import MissedSummaryCards from './components/MissedSummaryCards';
import DoneSummaryStrip from './components/DoneSummaryStrip';
import MissedReasonModal from './components/MissedReasonModal';
import { MissedSummaryStats, Appointment, vietnameseSearchFilter } from '@mos-lab/shared';
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
    handlePageChange,
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

  const columns = React.useMemo<ColumnsType<Appointment>>(
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
          <Tooltip title="Đặt lịch mới">
            <Button
              type="primary"
              icon={<CalendarPlusIcon fontSize={18} />}
              style={{
                backgroundColor: '#D4A84B',
                borderColor: '#D4A84B',
                height: '38px',
                width: '38px',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(212, 168, 75, 0.3)',
                marginTop: '4px',
              }}
              onClick={() => setBookingWizardVisible(true)}
            />
          </Tooltip>
        </div>

        {/* Date Filter & Staff Selection */}
        <div className="flex items-center gap-3 flex-wrap">
          {currentUser?.role === 'admin' && (
            <Select
              showSearch
              filterOption={vietnameseSearchFilter}
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

      {/* ULTRA-COMPACT SEGMENTED PILL TAB BAR (macOS / iOS Control Center Style) */}
      <div
        role="tablist"
        aria-label="Danh sách trạng thái lịch hẹn"
        className="mb-3 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800 inline-flex flex-row items-center gap-1.5 max-w-full overflow-x-auto"
      >
        {/* Tab 1: Lịch Hẹn */}
        <button
          type="button"
          role="tab"
          id="tab-pending"
          aria-selected={activeTab === 'pending'}
          aria-controls="panel-appointments"
          tabIndex={activeTab === 'pending' ? 0 : -1}
          onClick={() => {
            setActiveTab('pending');
            localStorage.setItem('mos_appointments_activeTab', 'pending');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTab('pending');
              localStorage.setItem('mos_appointments_activeTab', 'pending');
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setActiveTab('missed');
              localStorage.setItem('mos_appointments_activeTab', 'missed');
              document.getElementById('tab-missed')?.focus();
            }
          }}
          className={`inline-flex items-center gap-2.5 h-9 px-3.5 rounded-lg transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 text-xs whitespace-nowrap shrink-0 ${
            activeTab === 'pending'
              ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 font-bold shadow-xs border border-amber-500/40'
              : 'text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <span className="flex items-center gap-1.5 text-xs sm:text-sm">
            <CalendarOutlined className="text-amber-500 text-sm" />
            <span>Lịch Hẹn</span>
          </span>
          <span className="tabular-nums flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-sm">
              {summary?.totalPending ?? (activeTab === 'pending' ? total : 0)}
            </span>
            <span className="text-xs text-slate-400 font-semibold">({formatVND(summary?.pendingValue || 0)})</span>
          </span>
        </button>

        {/* Tab 2: Lịch Missed */}
        <button
          type="button"
          role="tab"
          id="tab-missed"
          aria-selected={activeTab === 'missed'}
          aria-controls="panel-appointments"
          tabIndex={activeTab === 'missed' ? 0 : -1}
          onClick={() => {
            setActiveTab('missed');
            localStorage.setItem('mos_appointments_activeTab', 'missed');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTab('missed');
              localStorage.setItem('mos_appointments_activeTab', 'missed');
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setActiveTab('completed');
              localStorage.setItem('mos_appointments_activeTab', 'completed');
              document.getElementById('tab-completed')?.focus();
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setActiveTab('pending');
              localStorage.setItem('mos_appointments_activeTab', 'pending');
              document.getElementById('tab-pending')?.focus();
            }
          }}
          className={`inline-flex items-center gap-2.5 h-9 px-3.5 rounded-lg transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 text-xs whitespace-nowrap shrink-0 ${
            activeTab === 'missed'
              ? 'bg-white dark:bg-slate-800 text-red-500 dark:text-red-400 font-bold shadow-xs border border-red-500/40'
              : 'text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <span className="flex items-center gap-1.5 text-xs sm:text-sm">
            <WarningOutlined className="text-red-500 text-sm" />
            <span>Lịch Missed</span>
          </span>
          <span className="tabular-nums flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 dark:text-red-400 font-black text-sm">
              {summary?.totalMissed ?? (activeTab === 'missed' ? total : 0)}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              ({summary?.missedRate ?? summary?.missedRatePct ?? 0}%)
            </span>
          </span>
        </button>

        {/* Tab 3: Lịch Done */}
        <button
          type="button"
          role="tab"
          id="tab-completed"
          aria-selected={activeTab === 'completed'}
          aria-controls="panel-appointments"
          tabIndex={activeTab === 'completed' ? 0 : -1}
          onClick={() => {
            setActiveTab('completed');
            localStorage.setItem('mos_appointments_activeTab', 'completed');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTab('completed');
              localStorage.setItem('mos_appointments_activeTab', 'completed');
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setActiveTab('missed');
              localStorage.setItem('mos_appointments_activeTab', 'missed');
              document.getElementById('tab-missed')?.focus();
            }
          }}
          className={`inline-flex items-center gap-2.5 h-9 px-3.5 rounded-lg transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 text-xs whitespace-nowrap shrink-0 ${
            activeTab === 'completed'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs border border-emerald-500/40'
              : 'text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <span className="flex items-center gap-1.5 text-xs sm:text-sm">
            <CheckCircleOutlined className="text-emerald-500 text-sm" />
            <span>Lịch Done</span>
          </span>
          <span className="tabular-nums flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-sm">
              {summary?.totalCompleted ?? (activeTab === 'completed' ? total : 0)}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              ({formatVND(summary?.completedRevenue || summary?.totalNetRev || 0)})
            </span>
          </span>
        </button>
      </div>

      <Card
        id="panel-appointments"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        style={{ background: token.colorBgContainer, borderRadius: '8px' }}
      >
        {activeTab === 'missed' && (
          <div className="mb-4 flex flex-col gap-3">
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

        {activeTab === 'completed' && summary && <DoneSummaryStrip summary={summary} />}

        <Table
          components={tableComponents}
          dataSource={appointments}
          columns={columns}
          rowKey="id"
          size="small"
          loading={loading && appointments.length === 0}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (totalCount, range) => (
              <span style={{ fontSize: '13px', color: token.colorTextDescription, fontVariantNumeric: 'tabular-nums' }}>
                Hiển thị {range[0]}-{range[1]} / Tổng số {totalCount} ca
              </span>
            ),
            onChange: (page, size) => {
              handlePageChange(page, size);
            },
          }}
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
      </Card>

      {/* CUSTOMER DETAIL DRAWER */}
      {detailModalVisible && (
        <CustomerDetailDrawer
          open={detailModalVisible}
          customerId={selectedCustomer?.id || null}
          onClose={() => setDetailModalVisible(false)}
          onUpdate={fetchAppointments}
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

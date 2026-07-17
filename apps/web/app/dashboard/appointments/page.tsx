'use client';

import '../../suppress-warnings';
import React, { useEffect } from 'react';
import {
  Table,
  Tabs,
  Button,
  Card,
  Space,
  Radio,
  DatePicker,
  Avatar,
  Tag,
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
  Tooltip,
  Popconfirm,
  message,
} from 'antd';
import {
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  UserOutlined,
  PhoneOutlined,
  EyeOutlined,
  CloseCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
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
import { getPendingColumns, getCompletedColumns } from './components/AppointmentColumns';

dayjs.extend(isoWeek);

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

import { Appointment } from '@mos-lab/shared';
import { formatVND } from '../../../lib/format-utils';

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
  bookingNote: { visible: true, width: 220, label: 'Ghi chú đặt lịch' },
  orderState: { visible: true, width: 120, label: 'Trạng thái' },
};

export default function AppointmentsPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const { makeCall } = useOmiCall();

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
    handleCancelBooking,
    handleNavigate,
    getPeriodLabel,
    openDetailModal,
  } = useAppointmentsData({
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
  });

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

  const baseColumns = activeTab === 'completed' ? completedColumns : pendingColumns;

  const columns = React.useMemo(
    () =>
      baseColumns
        .filter((col) => {
          if (col.key === 'action') return true;
          const config = columnConfig[col.key as string];
          return config ? config.visible : true;
        })
        .map((col) => {
          const config = columnConfig[col.key as string];
          if (config) {
            return {
              ...col,
              width: config.width,
            };
          }
          return col;
        }),
    [baseColumns, columnConfig]
  );

  const totalWidth = React.useMemo(() => columns.reduce((sum, col) => sum + (Number(col.width) || 120), 0), [columns]);

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
            <Radio.Group
              value={viewMode}
              onChange={(e) => {
                const val = e.target.value;
                setViewMode(val);
                setCustomRange(null);
                setReferenceDate(dayjs());
                localStorage.setItem('mos_appointments_viewMode', val);
              }}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Group value={viewMode}>
                <Radio.Button value="month">Tháng</Radio.Button>
                <Radio.Button value="week">Tuần</Radio.Button>
                <Radio.Button value="day">Ngày</Radio.Button>
              </Radio.Group>
            </Radio.Group>

            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Space.Compact>
                <Button icon={<LeftOutlined />} onClick={() => handleNavigate(-1)} />
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
                <Button icon={<RightOutlined />} onClick={() => handleNavigate(1)} />
              </Space.Compact>

              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates) setCustomRange([dates[0]!, dates[1]!]);
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
                  zIndex: -1,
                }}
              />
            </div>

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
                  Lịch hẹn / Chưa đến
                  <Badge
                    count={activeTab === 'pending' ? total : 0}
                    style={{ marginLeft: 8, backgroundColor: '#D4A84B' }}
                  />
                </span>
              ),
            },
            {
              key: 'completed',
              label: (
                <span style={{ fontSize: '15px', fontWeight: '500' }}>
                  Khách hàng đã đến
                  <Badge
                    count={activeTab === 'completed' ? total : 0}
                    style={{ marginLeft: 8, backgroundColor: '#52C41A' }}
                  />
                </span>
              ),
            },
          ]}
        />

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
          onRow={(record) => {
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
          }}
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
          {!loading && appointments.length >= total && total > 0 && (
            <span style={{ fontStyle: 'italic', opacity: 0.8 }}>Đã hiển thị tất cả {total} lịch hẹn</span>
          )}
        </div>
      </Card>

      {/* CUSTOMER DETAIL DRAWER */}
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

      {/* BOOKING WIZARD DRAWER */}
      <BookingWizardDrawer
        open={bookingWizardVisible}
        initialCustomer={bookingInitialCustomer}
        onClose={() => {
          setBookingWizardVisible(false);
          setBookingInitialCustomer(null);
        }}
        onSuccess={fetchAppointments}
      />

      <RescheduleBookingModal
        open={rescheduleModalVisible}
        booking={selectedBookingForReschedule}
        onClose={() => {
          setRescheduleModalVisible(false);
          setSelectedBookingForReschedule(null);
        }}
        onSuccess={fetchAppointments}
      />
    </div>
  );
}

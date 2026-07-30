'use client';

import '../../suppress-warnings';
import React, { useEffect, useState } from 'react';
import {
  Table,
  Avatar,
  Tabs,
  Input,
  Button,
  Card,
  Badge,
  Space,
  Modal,
  Tag,
  Typography,
  Divider,
  Select,
  theme,
  Form,
  InputNumber,
  Row,
  Col,
  Spin,
  Timeline,
  Tooltip,
  message,
  Segmented,
  DatePicker,
  ConfigProvider,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  CalendarOutlined,
  PhoneOutlined,
  SettingOutlined,
  UserOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  PlusOutlined,
  UndoOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  LeftOutlined,
  RightOutlined,
  UnorderedListOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';

const CustomerDetailDrawer = dynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });
const BookingWizardDrawer = dynamic(() => import('../../../components/BookingWizardDrawer'), { ssr: false });
const TableConfigDrawer = dynamic(
  () => import('../../../components/TableConfigDrawer').then((m) => m.TableConfigDrawer),
  { ssr: false }
);
const SMSModal = dynamic(() => import('../../../components/sms/SMSModal').then((m) => m.SMSModal), { ssr: false });
import { ResizableHeaderCell } from '../../../components/ResizableHeaderCell';
import { useTableConfig } from '../../../hooks/useTableConfig';
import { Customer, CALL_RESULT_LABELS, vietnameseSearchFilter } from '@mos-lab/shared';
import dayjs from 'dayjs';
import { useLocaData, TAB_KEYS } from './hooks/useLocaData';
import { getLocaColumns, getNewLocaColumns } from './components/LocaColumns';
import { formatDuration, formatVND } from '../../../lib/format-utils';
import { useOmiCall } from '../../../context/OmiCallContext';

const { Title, Text } = Typography;

export default function LocaCampaignPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [settingsForm] = Form.useForm();
  const { makeCall } = useOmiCall();

  // Resizable Modal States
  const [modalWidth, setModalWidth] = useState<number>(700);
  const [modalHeight, setModalHeight] = useState<number>(550);

  const {
    currentUser,
    activeTab,
    activeTouchpointKey,
    contactSubTab,
    searchQuery,
    sortField,
    assignedStaffId,
    configs,
    customers,
    loading,
    total,
    currentPage,
    pageSize,
    tabCounts,
    touchpointCounts,
    overallStats,
    staffList,
    settingsModalVisible,
    detailModalVisible,
    bookingWizardVisible,
    bookingInitialCustomer,
    selectedCustomer,
    dailyPlanList,
    addingIds,
    datePreset,
    selectedDate,
    bookingStatusFilter,
    // setters
    setActiveTab,
    setActiveTouchpointKey,
    setContactSubTab,
    setSearchQuery,
    setSortField,
    setAssignedStaffId,
    setBookingStatusFilter,
    setCurrentPage,
    setPageSize,
    setDatePreset,
    setSelectedDate,
    setSettingsModalVisible,
    setDetailModalVisible,
    setBookingWizardVisible,
    setBookingInitialCustomer,
    setSelectedCustomer,
    // handlers
    fetchCustomerList,
    fetchOverallStats,
    handlePrevDate,
    handleNextDate,
    handleAddToPlan,
    handleOpenDetailModal,
    handleOpenSettings,
    handleSaveConfig,
    resetConfigDefaults,
    handleAssignTelesales,
    handleToggleTouchpoint,
    getRowClassName,
  } = useLocaData({
    settingsForm,
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
    onWarning: (msg) => message.warning(msg),
  });

  const [smsModalVisible, setSmsModalVisible] = useState<boolean>(false);

  const handleOpenSmsModal = React.useCallback(
    (customer: Customer) => {
      setSelectedCustomer(customer);
      setSmsModalVisible(true);
    },
    [setSelectedCustomer]
  );

  const handleDetailClose = React.useCallback(() => {
    setDetailModalVisible(false);
  }, [setDetailModalVisible]);

  const handleDetailDeleteSuccess = React.useCallback(() => {
    setDetailModalVisible(false);
    fetchCustomerList();
    fetchOverallStats();
  }, [setDetailModalVisible, fetchCustomerList, fetchOverallStats]);

  const handleBookingWizardClose = React.useCallback(() => {
    setBookingWizardVisible(false);
  }, [setBookingWizardVisible]);

  const handleBookingWizardSuccess = React.useCallback(() => {
    setBookingWizardVisible(false);
    fetchCustomerList();
    fetchOverallStats();
  }, [setBookingWizardVisible, fetchCustomerList, fetchOverallStats]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedW = localStorage.getItem('mos_loca_settings_modal_width');
      if (savedW) {
        const val = parseInt(savedW, 10);
        if (!isNaN(val)) setModalWidth(val);
      }
      const savedH = localStorage.getItem('mos_loca_settings_modal_height');
      if (savedH) {
        const val = parseInt(savedH, 10);
        if (!isNaN(val)) setModalHeight(val);
      }
    }
  }, []);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleEl = e.currentTarget as HTMLElement;
    const modalEl = (handleEl.closest('.ant-modal') || handleEl.closest('.ant-modal-content')) as HTMLElement;
    const listEl = document.getElementById('loca-touchpoints-list') as HTMLElement;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = modalEl ? modalEl.offsetWidth : modalWidth;
    const startHeight = listEl ? listEl.offsetHeight + 180 : modalHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newWidth = Math.max(500, Math.min(1800, startWidth + deltaX));
      const newHeight = Math.max(350, Math.min(1000, startHeight + deltaY));

      if (modalEl) {
        modalEl.style.setProperty('width', `${newWidth}px`, 'important');
        modalEl.style.setProperty('max-width', '95vw', 'important');
      }
      if (listEl) {
        listEl.style.height = `${newHeight - 180}px`;
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const finalX = upEvent.clientX - startX;
      const finalY = upEvent.clientY - startY;
      const finalWidth = Math.max(500, Math.min(1800, startWidth + finalX));
      const finalHeight = Math.max(350, Math.min(1000, startHeight + finalY));

      setModalWidth(finalWidth);
      setModalHeight(finalHeight);

      localStorage.setItem('mos_loca_settings_modal_width', finalWidth.toString());
      localStorage.setItem('mos_loca_settings_modal_height', finalHeight.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResetConfigDefaults = () => {
    Modal.confirm({
      title: 'Xác nhận khôi phục mặc định',
      content: 'Bạn có chắc chắn muốn xóa tất cả cấu hình hiện tại và quay về cài đặt gốc không?',
      okText: 'Đồng ý',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await resetConfigDefaults();
          message.success('Đã khôi phục cài đặt mặc định thành công.');
        } catch (err) {
          message.error('Khôi phục thất bại.');
        }
      },
    });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, activeTouchpointKey, contactSubTab, searchQuery, sortField, assignedStaffId, setCurrentPage]);

  const getActiveTabLabelCount = (id: string) => {
    return tabCounts[id] || 0;
  };

  const columns = getLocaColumns({
    themeMode,
    token,
    handleOpenDetailModal,
    formatVND,
    formatDuration,
    dailyPlanList,
    handleAddToPlan,
    makeCall,
    handleOpenSmsModal,
    handleToggleTouchpoint,
    addingIds,
    sortField,
    currentPage,
    pageSize,
  });

  const newLocaColumns = getNewLocaColumns({
    themeMode,
    token,
    handleOpenDetailModal,
    formatVND,
    formatDuration,
    dailyPlanList,
    handleAddToPlan,
    makeCall,
    handleOpenSmsModal,
    addingIds,
    sortField,
    currentPage,
    pageSize,
  });

  const {
    loading: locaConfigLoading,
    columns: locaConfigColumns,
    rawConfig: locaRawConfig,
    configVisible: locaConfigVisible,
    openConfig: openLocaConfig,
    closeConfig: closeLocaConfig,
    saveConfig: saveLocaConfig,
    resetConfig: resetLocaConfig,
  } = useTableConfig('loca_campaign_table', columns);

  const activeTouchpointsList = configs['LOCA_ALL'] || [];

  return (
    <div>
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <Title
            level={2}
            style={{
              color: themeMode === 'dark' ? token.colorPrimary : '#87640a',
              margin: 0,
              fontWeight: 'bold',
              letterSpacing: '0.5px',
            }}
          >
            <HeartOutlined style={{ color: '#ff4d4f' }} /> CHIẾN DỊCH KHÁCH HÀNG LoCa (Lớp Care)
          </Title>
          <Text style={{ color: themeMode === 'dark' ? token.colorTextDescription : '#555555' }}>
            Hệ thống chăm sóc đặc biệt dành cho khách hàng Combo Live (còn hạn, còn lần sử dụng).
          </Text>
        </div>
        <Space wrap>
          {currentUser?.role === 'admin' && (
            <Select
              showSearch
              filterOption={vietnameseSearchFilter}
              placeholder="Chọn Booker/Telesales"
              value={assignedStaffId}
              onChange={(val) => setAssignedStaffId(val)}
              style={{ width: 200 }}
              options={[
                { value: 'ALL', label: 'All Bookers' },
                { value: 'unassigned', label: 'Chưa phân bổ' },
                ...staffList.map((s) => ({ value: s.id.toString(), label: s.displayName })),
              ]}
            />
          )}
          <Tooltip title="Đặt lịch mới">
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              style={{
                backgroundColor: themeMode === 'dark' ? '#D4A84B' : '#a07818',
                borderColor: themeMode === 'dark' ? '#D4A84B' : '#a07818',
                fontWeight: 'bold',
              }}
              onClick={() => {
                setBookingInitialCustomer(null);
                setBookingWizardVisible(true);
              }}
            />
          </Tooltip>
          {currentUser?.role === 'admin' && (
            <Tooltip title="Cấu hình Quy trình">
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={handleOpenSettings}
                style={{ background: token.colorPrimary, borderColor: token.colorPrimary, color: '#000' }}
              />
            </Tooltip>
          )}
        </Space>
      </div>

      {/* METRICS CARDS */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fff',
              border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : '#e8e8e8'}`,
              borderRadius: '8px',
            }}
          >
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Tổng KH LoCa (Combo Live)
            </Text>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: token.colorText, marginTop: '4px' }}>
              {overallStats.totalComboLive}{' '}
              <span style={{ fontSize: '13px', fontWeight: 'normal', color: token.colorTextDescription }}>khách</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fff',
              border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : '#e8e8e8'}`,
              borderRadius: '8px',
            }}
          >
            <Text type="secondary" style={{ fontSize: '13px' }}>
              HSD 30 (Sắp hết hạn)
            </Text>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 'bold',
                color: themeMode === 'dark' ? '#ff7875' : '#cf1322',
                marginTop: '4px',
              }}
            >
              {tabCounts['HSD_30'] || 0}{' '}
              <span style={{ fontSize: '13px', fontWeight: 'normal', color: token.colorTextDescription }}>khách</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fff',
              border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : '#e8e8e8'}`,
              borderRadius: '8px',
            }}
          >
            <Text type="secondary" style={{ fontSize: '13px' }}>
              LSD 1 (Còn 1 lần dùng)
            </Text>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 'bold',
                color: themeMode === 'dark' ? '#fa8c16' : '#d46b08',
                marginTop: '4px',
              }}
            >
              {tabCounts['LSD_1'] || 0}{' '}
              <span style={{ fontSize: '13px', fontWeight: 'normal', color: token.colorTextDescription }}>khách</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fff',
              border: `1px solid ${themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : '#e8e8e8'}`,
              borderRadius: '8px',
            }}
          >
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Đã gọi hôm nay
            </Text>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 'bold',
                color: themeMode === 'dark' ? token.colorPrimary : '#87640a',
                marginTop: '4px',
              }}
            >
              {overallStats.totalCalledToday}{' '}
              <span style={{ fontSize: '13px', fontWeight: 'normal', color: token.colorTextDescription }}>
                cuộc gọi
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* TABS CONTAINER */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setActiveTouchpointKey('ALL');
        }}
        type="card"
        destroyOnHidden
        style={{ marginBottom: '16px' }}
        items={TAB_KEYS.map((tab) => ({
          key: tab.id,
          label: (
            <Space>
              <span>{tab.name}</span>
              <Badge
                count={getActiveTabLabelCount(tab.id)}
                overflowCount={9999}
                style={{
                  backgroundColor: activeTab === tab.id ? '#D4A84B' : themeMode === 'dark' ? '#333' : '#d9d9d9',
                  color: activeTab === tab.id ? '#000' : themeMode === 'dark' ? '#fff' : '#434343',
                }}
              />
            </Space>
          ),
        }))}
      />

      {/* FILTER & PIPELINE SECTION (MINIMALIST SINGLE ROW FILTER) */}
      <div className="flex flex-col gap-4 mb-6">
        {/* PIPELINE FOR LOCA_ALL TAB */}
        {activeTab === 'LOCA_ALL' && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <Text
                style={{ fontWeight: '700', color: token.colorText, fontSize: '12px', letterSpacing: '0.05em' }}
                className="uppercase"
              >
                QUY TRÌNH CHĂM SÓC THEO CHẠM
              </Text>
              {activeTouchpointKey !== 'ALL' && (
                <Button type="link" size="small" onClick={() => setActiveTouchpointKey('ALL')} style={{ padding: 0 }}>
                  Xem tất cả khách hàng
                </Button>
              )}
            </div>

            <div
              className={`p-2.5 rounded-xl flex items-center justify-between gap-1.5 overflow-x-auto min-h-[68px] border ${
                themeMode === 'dark' ? 'bg-[#1a1a1a] border-white/5' : 'bg-slate-50/50 border-slate-100'
              }`}
            >
              {/* All touchpoints capsule */}
              <div
                onClick={() => setActiveTouchpointKey('ALL')}
                className={`flex-1 min-w-[72px] px-2.5 py-1.5 rounded-lg cursor-pointer text-center select-none transition-all duration-300 border-2 ${
                  activeTouchpointKey === 'ALL'
                    ? 'border-gold bg-gold/10 shadow-[0_2px_10px_rgba(212,168,75,0.15)] scale-[1.02]'
                    : themeMode === 'dark'
                      ? 'border-transparent bg-white/[0.01] hover:bg-white/[0.03]'
                      : 'border-transparent bg-white hover:bg-white hover:border-slate-200'
                }`}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#888',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Tất cả chạm
                </div>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: '900',
                    marginTop: '1px',
                    fontVariantNumeric: 'tabular-nums',
                    fontFeatureSettings: '"tnum"',
                    color:
                      activeTouchpointKey === 'ALL' ? (themeMode === 'dark' ? '#D4A84B' : '#87640a') : token.colorText,
                  }}
                >
                  {tabCounts['LOCA_ALL'] || 0}
                </div>
              </div>

              {/* Individual touchpoints */}
              {activeTouchpointsList.map((tp, idx) => {
                const isSelected = activeTouchpointKey === tp.key;
                const count = touchpointCounts[tp.key] || 0;
                return (
                  <React.Fragment key={tp.key}>
                    {idx > 0 && (
                      <div
                        style={{
                          width: '6px',
                          height: '2px',
                          backgroundColor: themeMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div
                      onClick={() => setActiveTouchpointKey(tp.key)}
                      className={`flex-1 min-w-[68px] px-2 py-1.5 rounded-lg cursor-pointer text-center select-none transition-all duration-300 border-2 ${
                        isSelected
                          ? 'border-gold bg-gold/10 shadow-[0_2px_10px_rgba(212,168,75,0.15)] scale-[1.02]'
                          : themeMode === 'dark'
                            ? 'border-transparent bg-white/[0.01] hover:bg-white/[0.03]'
                            : 'border-transparent bg-white hover:bg-white hover:border-slate-200'
                      }`}
                    >
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          whiteSpace: 'nowrap',
                          color:
                            tp.color === 'red'
                              ? themeMode === 'dark'
                                ? '#ff4d4f'
                                : '#d9363e'
                              : tp.color === 'orange'
                                ? themeMode === 'dark'
                                  ? '#fa8c16'
                                  : '#d46b08'
                                : tp.color === 'green'
                                  ? themeMode === 'dark'
                                    ? '#52c41a'
                                    : '#389e0d'
                                  : themeMode === 'dark'
                                    ? '#1890ff'
                                    : '#096dd9',
                          textTransform: 'uppercase',
                        }}
                      >
                        {tp.label}
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: '900',
                          marginTop: '1px',
                          fontVariantNumeric: 'tabular-nums',
                          fontFeatureSettings: '"tnum"',
                          color: isSelected ? (themeMode === 'dark' ? '#D4A84B' : '#87640a') : token.colorText,
                        }}
                      >
                        {count}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* CONTACTED SUB-TAB SELECTOR */}
        {activeTab === 'CONTACTED' && (
          <div className="flex items-center gap-3 py-1">
            <Text style={{ fontWeight: '600', fontSize: '13px' }}>Hình thức liên hệ:</Text>
            <Segmented
              value={contactSubTab}
              onChange={(val) => setContactSubTab(val as 'ALL' | 'CALL' | 'TEXT')}
              options={[
                { value: 'ALL', label: 'Tất cả' },
                { value: 'CALL', label: 'Cuộc gọi', icon: <PhoneOutlined /> },
                { value: 'TEXT', label: 'Tin nhắn', icon: <MessageOutlined /> },
              ]}
              style={{ background: themeMode === 'dark' ? '#1f1f1f' : '#f5f5f5' }}
            />
          </div>
        )}

        {/* MINIMALIST FILTER BAR (SINGLE ROW - RIGHT ALIGNED) */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 py-2 border-b border-slate-100 dark:border-slate-800/60 w-full">
          {/* Segmented Preset (NEW_LOCA only) */}
          {activeTab === 'NEW_LOCA' && (
            <ConfigProvider
              theme={{
                components: {
                  Segmented: {
                    itemSelectedBg: '#D4A84B',
                    itemSelectedColor: '#000000',
                    trackBg: themeMode === 'dark' ? '#141414' : '#f5f5f5',
                    itemColor: themeMode === 'dark' ? '#aaa' : '#555',
                  },
                },
              }}
            >
              <Segmented
                value={datePreset}
                onChange={(val) => setDatePreset(val as 'today' | 'week' | 'month')}
                options={[
                  { value: 'month', label: 'Tháng' },
                  { value: 'week', label: 'Tuần' },
                  { value: 'today', label: 'Ngày' },
                ]}
                style={{
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: '600',
                }}
              />
            </ConfigProvider>
          )}

          {/* DatePicker with minimalist arrows (NEW_LOCA only) */}
          {activeTab === 'NEW_LOCA' && (
            <div className="flex items-center border border-slate-200 dark:border-slate-800/60 bg-slate-500/5 h-8 rounded-lg overflow-hidden transition-colors hover:border-slate-300 dark:hover:border-slate-700">
              <Button
                type="text"
                size="small"
                icon={<LeftOutlined style={{ fontSize: '10px', color: '#888' }} />}
                onClick={handlePrevDate}
                style={{
                  width: 28,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 0,
                }}
                className="hover:bg-slate-500/10"
              />
              <DatePicker
                value={selectedDate}
                onChange={(date) => {
                  if (date) setSelectedDate(date);
                }}
                picker={datePreset === 'month' ? 'month' : datePreset === 'week' ? 'week' : 'date'}
                format={
                  datePreset === 'month' ? '[Tháng] MM/YYYY' : datePreset === 'week' ? '[Tuần] ww/YYYY' : 'DD/MM/YYYY'
                }
                allowClear={false}
                variant="borderless"
                suffixIcon={<CalendarOutlined style={{ color: '#D4A84B', fontSize: '13px' }} />}
                style={{
                  width: 150,
                  padding: '0 8px',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
                className="text-center font-semibold"
              />
              <Button
                type="text"
                size="small"
                icon={<RightOutlined style={{ fontSize: '10px', color: '#888' }} />}
                onClick={handleNextDate}
                style={{
                  width: 28,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 0,
                }}
                className="hover:bg-slate-500/10"
              />
            </div>
          )}

          {/* Minimalist Booking Status Filter Buttons (Square Buttons matching Gear Button style) */}
          <div className="flex items-center gap-1.5">
            <Tooltip title="Tất cả khách hàng (Cả đã book & chưa book)">
              <button
                type="button"
                onClick={() => setBookingStatusFilter('ALL')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                  bookingStatusFilter === 'ALL'
                    ? 'bg-slate-800 text-amber-400 border-slate-600 shadow-sm dark:bg-slate-800 dark:border-slate-700'
                    : 'bg-slate-500/5 hover:bg-slate-500/10 text-slate-400 border-slate-200/60 dark:border-slate-800/60'
                }`}
              >
                <UnorderedListOutlined style={{ fontSize: '14px' }} />
              </button>
            </Tooltip>

            <Tooltip title="Đã book (Có lịch hẹn tương lai)">
              <button
                type="button"
                onClick={() => setBookingStatusFilter('BOOKED')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                  bookingStatusFilter === 'BOOKED'
                    ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-500/5 hover:bg-slate-500/10 text-slate-400 border-slate-200/60 dark:border-slate-800/60'
                }`}
              >
                <CalendarOutlined
                  style={{ fontSize: '14px', color: bookingStatusFilter === 'BOOKED' ? '#10B981' : undefined }}
                />
              </button>
            </Tooltip>

            <Tooltip title="Chưa book (Chưa có lịch hẹn tương lai)">
              <button
                type="button"
                onClick={() => setBookingStatusFilter('NOT_BOOKED')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                  bookingStatusFilter === 'NOT_BOOKED'
                    ? 'bg-rose-950/50 text-rose-400 border-rose-500/50 shadow-sm'
                    : 'bg-slate-500/5 hover:bg-slate-500/10 text-slate-400 border-slate-200/60 dark:border-slate-800/60'
                }`}
              >
                <CloseCircleOutlined
                  style={{ fontSize: '14px', color: bookingStatusFilter === 'NOT_BOOKED' ? '#F43F5E' : undefined }}
                />
              </button>
            </Tooltip>
          </div>

          {/* Borderless Search Input */}
          <div className="flex items-center border border-slate-200 dark:border-slate-800/60 bg-slate-500/5 px-2.5 h-8 rounded-lg max-w-[280px] focus-within:border-slate-300 dark:focus-within:border-slate-700 transition-colors">
            <SearchOutlined style={{ color: '#aaa', marginRight: '6px' }} />
            <Input
              placeholder="Tìm khách hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              variant="borderless"
              style={{ padding: 0, fontSize: '13px', width: 180 }}
            />
          </div>

          {/* Action buttons (Settings) */}
          <Tooltip title="Cấu hình cột bảng">
            <Button
              type="primary"
              icon={<SettingOutlined style={{ color: '#000000', fontSize: '14px' }} />}
              onClick={openLocaConfig}
              style={{
                backgroundColor: '#D4A84B',
                borderColor: '#D4A84B',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                padding: 0,
              }}
            />
          </Tooltip>
        </div>
      </div>

      {/* CUSTOMERS DATA TABLE */}
      <Table
        size="small"
        columns={activeTab === 'NEW_LOCA' ? newLocaColumns : locaConfigColumns}
        dataSource={customers}
        rowKey="id"
        loading={loading}
        className="antd-custom-table"
        scroll={{ x: 1650 }}
        onChange={(pagination, filters, sorter: SafeAny) => {
          if (sorter && sorter.field) {
            const field = sorter.field;
            const order = sorter.order;
            if (!order) {
              setSortField('daysSinceLastVisit_asc');
            } else if (field === 'daysSinceLastVisit') {
              setSortField(order === 'ascend' ? 'daysSinceLastVisit_asc' : 'daysSinceLastVisit_desc');
            } else if (field === 'totalSpent') {
              setSortField(order === 'ascend' ? 'totalSpent_asc' : 'totalSpent_desc');
            } else if (field === 'name') {
              setSortField(order === 'ascend' ? 'name_asc' : 'name_desc');
            } else if (field === 'id') {
              setSortField(order === 'ascend' ? 'id_asc' : 'id_desc');
            }
          }
        }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (page, size) => {
            setCurrentPage(page);
            if (size !== pageSize) {
              setPageSize(size);
              localStorage.setItem('mos_loca_pageSize', size.toString());
            }
          },
          showTotal: (totalCount) => `Tổng số: ${totalCount} khách hàng`,
        }}
        rowClassName={(record) => getRowClassName(record, themeMode)}
        components={{
          header: {
            cell: ResizableHeaderCell,
          },
        }}
      />

      {/* RESIZABLE TOUCHPOINT CONFIGURATION MODAL (Admin only) */}
      {currentUser?.role === 'admin' && (
        <Modal
          title={<div style={{ fontSize: '16px', fontWeight: 'bold' }}>⚙️ Cấu hình quy trình chạm LoCa</div>}
          open={settingsModalVisible}
          onCancel={() => setSettingsModalVisible(false)}
          onOk={handleSaveConfig}
          okText="Xuất bản Cấu hình"
          cancelText="Hủy"
          width={modalWidth}
          styles={{
            body: {
              padding: '16px 0 0 0',
              maxHeight: 'calc(100vh - 300px)',
              overflowY: 'auto',
            },
          }}
          modalRender={(modal) => {
            if (React.isValidElement(modal)) {
              return React.cloneElement(modal as SafeAny, {
                style: {
                  ...(modal.props as SafeAny)?.style,
                  position: 'relative',
                  width: `${modalWidth}px`,
                  maxWidth: '95vw',
                  pointerEvents: 'auto',
                },
                children: (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    {(modal.props as SafeAny)?.children}
                    <div
                      onMouseDown={handleResizeMouseDown}
                      title="Kéo góc để thay đổi kích thước Modal (Kích thước được tự động lưu)"
                      style={{
                        position: 'absolute',
                        right: '4px',
                        bottom: '4px',
                        width: '20px',
                        height: '20px',
                        cursor: 'nwse-resize',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#D4A84B',
                        opacity: 0.85,
                        transition: 'opacity 0.2s',
                      }}
                      className="hover:opacity-100"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M11 1v10H1V1h10m1-1H0v12h12V0z M9 9H7v2h2V9z M9 5H7v2h2V5z M5 9H3v2h2V9z" />
                      </svg>
                    </div>
                  </div>
                ),
              });
            }
            return modal;
          }}
        >
          <div className="px-5">
            <div className="flex justify-end items-center mb-4">
              <Button type="dashed" danger onClick={handleResetConfigDefaults} icon={<UndoOutlined />}>
                Khôi phục mặc định
              </Button>
            </div>
            <Form form={settingsForm} name="loca_touchpoints_form" layout="vertical">
              <Form.List name="touchpoints">
                {(fields, { add, remove }) => (
                  <div
                    id="loca-touchpoints-list"
                    style={{
                      height: `${modalHeight - 200}px`,
                      overflowY: 'auto',
                      paddingRight: '6px',
                    }}
                    className="space-y-4 pr-1"
                  >
                    {fields.map(({ key, name, ...restField }) => (
                      <Card
                        key={key}
                        size="small"
                        title={<span style={{ fontSize: '12px', fontWeight: 'bold' }}>Touchpoint #{name + 1}</span>}
                        extra={
                          <Button type="text" danger onClick={() => remove(name)} icon={<MinusCircleOutlined />} />
                        }
                        className={themeMode === 'dark' ? 'bg-[#1c1c1e]' : 'bg-slate-50'}
                      >
                        <Row gutter={12}>
                          <Col span={6}>
                            <Form.Item
                              {...restField}
                              name={[name, 'key']}
                              label="Mã định danh (Key)"
                              rules={[{ required: true, message: 'Nhập key' }]}
                            >
                              <Input placeholder="Ví dụ: chạm-17" />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item
                              {...restField}
                              name={[name, 'label']}
                              label="Tên hiển thị (Label)"
                              rules={[{ required: true, message: 'Nhập nhãn' }]}
                            >
                              <Input placeholder="Ví dụ: Chạm 17 ngày" />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item
                              {...restField}
                              name={[name, 'daysMin']}
                              label="Min (Ngày)"
                              rules={[{ required: true, message: 'Nhập min' }]}
                            >
                              <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item
                              {...restField}
                              name={[name, 'daysMax']}
                              label="Max (Ngày)"
                              rules={[{ required: true, message: 'Nhập max' }]}
                            >
                              <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item
                              {...restField}
                              name={[name, 'color']}
                              label="Màu sắc đại diện"
                              rules={[{ required: true, message: 'Chọn màu' }]}
                            >
                              <Select
                                options={[
                                  { value: 'blue', label: 'Xanh dương' },
                                  { value: 'cyan', label: 'Xanh ngọc' },
                                  { value: 'green', label: 'Xanh lá' },
                                  { value: 'orange', label: 'Cam' },
                                  { value: 'red', label: 'Đỏ' },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Thêm Mốc Chạm Mới
                    </Button>
                  </div>
                )}
              </Form.List>
            </Form>
          </div>
        </Modal>
      )}

      {/* DRAWERS */}
      {detailModalVisible && selectedCustomer && (
        <CustomerDetailDrawer
          open={detailModalVisible}
          customerId={selectedCustomer.id}
          onClose={handleDetailClose}
          onDeleteSuccess={handleDetailDeleteSuccess}
          onUpdate={fetchCustomerList}
        />
      )}

      {bookingWizardVisible && (
        <BookingWizardDrawer
          open={bookingWizardVisible}
          onClose={handleBookingWizardClose}
          onSuccess={handleBookingWizardSuccess}
          initialCustomer={bookingInitialCustomer}
        />
      )}

      <TableConfigDrawer
        visible={locaConfigVisible}
        columns={locaRawConfig}
        onClose={closeLocaConfig}
        onSave={saveLocaConfig}
        onReset={resetLocaConfig}
      />

      <SMSModal
        open={smsModalVisible}
        onClose={() => setSmsModalVisible(false)}
        customer={selectedCustomer}
        onSuccess={fetchCustomerList}
      />
    </div>
  );
}

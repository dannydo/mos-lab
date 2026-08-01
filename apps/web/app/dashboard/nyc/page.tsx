'use client';

import '../../suppress-warnings';
import React, { useEffect, useState, useMemo } from 'react';
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
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  CalendarOutlined,
  PhoneOutlined,
  SettingOutlined,
  UserOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  UndoOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';
import CalendarPlusIcon from '../../../components/icons/CalendarPlusIcon';

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
import { useNycData, TAB_KEYS } from './hooks/useNycData';
import { getNycColumns } from './components/NycColumns';
import { formatDuration, formatVND } from '../../../lib/format-utils';
import { useOmiCall } from '../../../context/OmiCallContext';

const { Title, Text } = Typography;

export default function NycCampaignPage() {
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
    selectedConfigTab,
    selectedCustomer,
    dailyPlanList,
    addingIds,
    // setters
    setActiveTab,
    setActiveTouchpointKey,
    setSearchQuery,
    setSortField,
    setAssignedStaffId,
    setCurrentPage,
    setPageSize,
    setSettingsModalVisible,
    setDetailModalVisible,
    setBookingWizardVisible,
    setBookingInitialCustomer,
    setSelectedConfigTab,
    setSelectedCustomer,
    // handlers
    fetchCustomerList,
    fetchOverallStats,
    handleAddToPlan,
    handleOpenDetailModal,
    handleOpenSettings,
    handleConfigTabChange,
    handleSaveConfig,
    resetConfigDefaults,
    handleAssignTelesales,
    getRowClassName,
  } = useNycData({
    settingsForm,
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
    onWarning: (msg) => message.warning(msg),
  });

  const [smsModalVisible, setSmsModalVisible] = useState<boolean>(false);

  const bookerStaffList = useMemo(() => {
    const seenNames = new Set<string>();
    return (staffList || [])
      .filter((s: any) => {
        const role = (s.role || s.staff_role || '').toLowerCase();
        return role === 'telesales' || role === 'booker';
      })
      .filter((s: any) => {
        const nameKey = (s.displayName || s.name || s.username || '').trim().toLowerCase();
        if (!nameKey || seenNames.has(nameKey)) return false;
        seenNames.add(nameKey);
        return true;
      });
  }, [staffList]);

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
      const savedW = localStorage.getItem('mos_nyc_settings_modal_width');
      if (savedW) {
        const val = parseInt(savedW, 10);
        if (!isNaN(val)) setModalWidth(val);
      }
      const savedH = localStorage.getItem('mos_nyc_settings_modal_height');
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
    const listEl = document.getElementById('nyc-touchpoints-list') as HTMLElement;

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

      localStorage.setItem('mos_nyc_settings_modal_width', finalWidth.toString());
      localStorage.setItem('mos_nyc_settings_modal_height', finalHeight.toString());
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
  }, [activeTab, activeTouchpointKey, searchQuery, sortField, assignedStaffId, setCurrentPage]);

  const getActiveTabLabelCount = (id: string) => {
    return tabCounts[id] || 0;
  };

  const columns = getNycColumns({
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
    loading: nycConfigLoading,
    columns: nycConfigColumns,
    rawConfig: nycRawConfig,
    configVisible: nycConfigVisible,
    openConfig: openNycConfig,
    closeConfig: closeNycConfig,
    saveConfig: saveNycConfig,
    resetConfig: resetNycConfig,
  } = useTableConfig('nyc_campaign_table', columns);

  const activeTouchpointsList = configs[activeTab] || [];

  return (
    <div>
      {/* MINIMALIST COMPACT EXECUTIVE HEADER BANNER */}
      <div
        className={`p-4 rounded-xl mb-5 border transition-all duration-300 ${
          themeMode === 'dark'
            ? 'bg-gradient-to-r from-[#141a29]/90 via-[#111827]/95 to-[#192238]/90 border-gold/20 shadow-lg shadow-black/40'
            : 'bg-gradient-to-r from-white via-amber-50/30 to-slate-50 border-amber-200/60 shadow-sm'
        }`}
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Title & Subtitle */}
          <div>
            <div className="flex items-center gap-2">
              <Title
                level={3}
                style={{
                  color: themeMode === 'dark' ? token.colorPrimary : '#87640a',
                  margin: 0,
                  fontWeight: '800',
                  letterSpacing: '0.3px',
                  fontSize: '20px',
                }}
              >
                <ClockCircleOutlined className="mr-1.5" /> CHIẾN DỊCH KHÁCH HÀNG NYC
              </Title>
              <Tag
                style={{
                  backgroundColor: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.15)' : '#fffbe6',
                  borderColor: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.3)' : '#ffe58f',
                  color: themeMode === 'dark' ? '#D4A84B' : '#87640a',
                  fontSize: '11px',
                  fontWeight: '600',
                }}
              >
                Single / Combo Hết Hạn
              </Tag>
            </div>
            <Text style={{ fontSize: '12px', color: themeMode === 'dark' ? token.colorTextDescription : '#666' }}>
              Quy trình chăm sóc đặc biệt dành cho khách hàng chưa mua gói Combo
            </Text>
          </div>

          {/* Inline Compact KPIs & Action Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            {/* Inline Stats Badge Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Stat 1: Total NYC */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                  themeMode === 'dark' ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <UserOutlined style={{ color: themeMode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '14px' }} />
                <div>
                  <div style={{ fontSize: '10px', color: token.colorTextDescription, lineHeight: 1 }}>Tổng KH</div>
                  <div
                    style={{ fontSize: '15px', fontWeight: '800', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}
                  >
                    {Object.values(tabCounts).reduce((sum, val) => sum + val, 0)}
                  </div>
                </div>
              </div>

              {/* Stat 2: NYC 30 */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                  themeMode === 'dark' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
                }`}
              >
                <ClockCircleOutlined
                  style={{ color: themeMode === 'dark' ? '#D4A84B' : '#87640a', fontSize: '14px' }}
                />
                <div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: themeMode === 'dark' ? '#D4A84B' : '#87640a',
                      fontWeight: '600',
                      lineHeight: 1,
                    }}
                  >
                    NYC 30
                  </div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      color: themeMode === 'dark' ? '#D4A84B' : '#87640a',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.2,
                    }}
                  >
                    {tabCounts['NYC_30'] || 0}
                  </div>
                </div>
              </div>

              {/* Stat 3: Booked Rate */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                  themeMode === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <CheckCircleOutlined style={{ color: '#22c55e', fontSize: '14px' }} />
                <div>
                  <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: '600', lineHeight: 1 }}>
                    Đã đặt lịch
                  </div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      color: '#22c55e',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.2,
                    }}
                  >
                    {overallStats.totalCalledToday > 0
                      ? Math.round((overallStats.totalBookedToday / overallStats.totalCalledToday) * 100)
                      : 0}
                    %
                  </div>
                </div>
              </div>

              {/* Stat 4: Calls Today */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                  themeMode === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <PhoneOutlined style={{ color: '#3b82f6', fontSize: '14px' }} />
                <div>
                  <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: '600', lineHeight: 1 }}>
                    Đã gọi hôm nay
                  </div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      color: '#3b82f6',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.2,
                    }}
                  >
                    {overallStats.totalCalledToday}
                  </div>
                </div>
              </div>
            </div>

            {/* Booker Filter & Action Buttons */}
            <Space wrap size="small">
              {currentUser?.role === 'admin' && (
                <Select
                  showSearch
                  filterOption={vietnameseSearchFilter}
                  placeholder="Chọn Booker"
                  value={assignedStaffId}
                  onChange={(val) => setAssignedStaffId(val)}
                  style={{ width: 160 }}
                  size="middle"
                  options={[
                    { value: 'ALL', label: 'Tất cả Booker' },
                    { value: 'unassigned', label: 'Chưa phân bổ' },
                    ...bookerStaffList.map((s) => ({ value: s.id.toString(), label: s.displayName })),
                  ]}
                />
              )}
              <Tooltip title="Đặt lịch mới">
                <Button
                  type="primary"
                  icon={<CalendarPlusIcon fontSize={16} />}
                  size="middle"
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
                    size="middle"
                    icon={<SettingOutlined />}
                    onClick={handleOpenSettings}
                    style={{ background: token.colorPrimary, borderColor: token.colorPrimary, color: '#000' }}
                  />
                </Tooltip>
              )}
            </Space>
          </div>
        </div>
      </div>

      {/* TABS CONTAINER */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setActiveTouchpointKey('ALL');
        }}
        type="card"
        style={{ marginBottom: '12px' }}
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

      {/* UNIFIED MINIMALIST TOOLBAR CARD (PIPELINE + FILTERS) */}
      <div
        className={`p-3 rounded-xl mb-4 border transition-all duration-300 ${
          themeMode === 'dark' ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* TOUCHPOINTS PIPELINE (Minimalist Segment Pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar min-w-0 flex-1">
            {/* All touchpoints pill */}
            <button
              type="button"
              onClick={() => setActiveTouchpointKey('ALL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 select-none whitespace-nowrap border ${
                activeTouchpointKey === 'ALL'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 font-bold shadow-sm'
                  : themeMode === 'dark'
                    ? 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                    : 'bg-slate-100/70 border-slate-200/60 text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span>Tất cả chạm</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                  activeTouchpointKey === 'ALL'
                    ? 'bg-amber-500 text-black'
                    : themeMode === 'dark'
                      ? 'bg-white/10 text-slate-300'
                      : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tabCounts[activeTab] || 0}
              </span>
            </button>

            {/* Individual touchpoint pills */}
            {activeTouchpointsList.map((tp) => {
              const isSelected = activeTouchpointKey === tp.key;
              const count = touchpointCounts[tp.key] || 0;
              const isRed = tp.color === 'red';
              const isOrange = tp.color === 'orange';
              const isGreen = tp.color === 'green';

              return (
                <button
                  key={tp.key}
                  type="button"
                  onClick={() => setActiveTouchpointKey(tp.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 select-none whitespace-nowrap border ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 font-bold shadow-sm'
                      : themeMode === 'dark'
                        ? 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05]'
                        : 'bg-slate-100/70 border-slate-200/60 text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRed ? 'bg-rose-500' : isOrange ? 'bg-amber-500' : isGreen ? 'bg-emerald-500' : 'bg-sky-500'
                    }`}
                  />
                  <span>{tp.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                      isSelected
                        ? 'bg-amber-500 text-black'
                        : isRed
                          ? 'bg-rose-500/20 text-rose-400'
                          : isOrange
                            ? 'bg-amber-500/20 text-amber-400'
                            : isGreen
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : themeMode === 'dark'
                                ? 'bg-sky-500/20 text-sky-400'
                                : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* SEARCH & SORT TOOLBAR CONTROLS */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Input
              placeholder="Tìm khách hàng (Tên, SĐT, ID)..."
              prefix={<SearchOutlined style={{ color: '#aaa' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              size="middle"
              style={{ width: 220 }}
            />
            <Select
              value={sortField}
              onChange={(val) => setSortField(val)}
              size="middle"
              style={{ width: 170 }}
              options={[
                { value: 'daysSinceLastVisit_asc', label: 'Chưa ghé ↑' },
                { value: 'daysSinceLastVisit_desc', label: 'Chưa ghé ↓' },
                { value: 'totalSpent_desc', label: 'Doanh thu LTV ↓' },
                { value: 'lastCallDate_desc', label: 'Gọi gần nhất' },
                { value: 'lastCallDate_asc', label: 'Gọi lâu nhất' },
              ]}
            />
            <Tooltip title="Cấu hình cột bảng">
              <Button icon={<SettingOutlined />} size="middle" onClick={openNycConfig} />
            </Tooltip>
          </div>
        </div>
      </div>

      {/* CUSTOMERS DATA TABLE */}
      <Table
        columns={nycConfigColumns}
        dataSource={customers}
        rowKey="id"
        loading={loading}
        className="antd-custom-table"
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
              localStorage.setItem('mos_nyc_pageSize', size.toString());
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
          title={<div style={{ fontSize: '16px', fontWeight: 'bold' }}>⚙️ Cấu hình quy trình chạm NYC</div>}
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
                    {/* Bottom-right corner drag handle */}
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
            <div className="flex justify-between items-center mb-4">
              <Select
                value={selectedConfigTab}
                onChange={handleConfigTabChange}
                style={{ width: 220 }}
                options={TAB_KEYS.map((k) => ({ value: k.id, label: `${k.name} (${k.rangeText})` }))}
              />
              <Button type="dashed" danger onClick={handleResetConfigDefaults} icon={<UndoOutlined />}>
                Khôi phục mặc định
              </Button>
            </div>
            <Form form={settingsForm} name="touchpoints_configs_form" layout="vertical">
              <Form.List name="touchpoints">
                {(fields, { add, remove }) => (
                  <div
                    id="nyc-touchpoints-list"
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
                              <Input placeholder="Ví dụ: chạm-7" />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item
                              {...restField}
                              name={[name, 'label']}
                              label="Tên hiển thị (Label)"
                              rules={[{ required: true, message: 'Nhập nhãn' }]}
                            >
                              <Input placeholder="Ví dụ: Chạm 7 ngày" />
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
                    <Button
                      type="dashed"
                      onClick={() => add({ key: '', label: '', daysMin: 0, daysMax: 0, color: 'blue' })}
                      block
                      icon={<PlusCircleOutlined />}
                      style={{ color: '#D4A84B', borderColor: '#D4A84B' }}
                    >
                      Thêm chặng chạm mới
                    </Button>
                  </div>
                )}
              </Form.List>
            </Form>
          </div>
        </Modal>
      )}

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
        visible={nycConfigVisible}
        onClose={closeNycConfig}
        columns={nycRawConfig}
        onSave={saveNycConfig}
        onReset={resetNycConfig}
      />

      <SMSModal
        open={smsModalVisible}
        onClose={() => setSmsModalVisible(false)}
        customer={selectedCustomer}
        onSuccess={fetchCustomerList}
      />

      <style jsx global>{`
        /* Custom styles for Ant Design Table under Dark & Light Mode */
        .dark-theme .antd-custom-table .ant-table {
          background: #111827 !important;
          color: #cbd5e1 !important;
        }
        .light-theme .antd-custom-table .ant-table {
          background: #ffffff !important;
          color: #0f172a !important;
        }
        .dark-theme .antd-custom-table .ant-table-thead > tr > th {
          background: #1e293b !important;
          color: #d4a84b !important;
          border-bottom: 1px solid #334155 !important;
        }
        .light-theme .antd-custom-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #9e7118 !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .dark-theme .antd-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #1f2937 !important;
        }
        .light-theme .antd-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .dark-theme .antd-custom-table .ant-table-row:hover > td {
          background: #1e293b !important;
        }
        .light-theme .antd-custom-table .ant-table-row:hover > td {
          background: #f1f5f9 !important;
        }

        /* Row highlighting - Light Theme */
        .light-theme .row-missed-light > td {
          background-color: #fff1f0 !important;
        }
        .light-theme .row-booked-future-light > td {
          background-color: #f6ffed !important;
        }
        .light-theme .row-hope-light > td {
          background-color: #fffbe6 !important;
        }
        .light-theme .row-missed-light:hover > td {
          background-color: #ffe8e6 !important;
        }
        .light-theme .row-booked-future-light:hover > td {
          background-color: #ebfcdd !important;
        }
        .light-theme .row-hope-light:hover > td {
          background-color: #fffac6 !important;
        }

        /* Row highlighting - Dark Theme */
        .dark-theme .row-missed-dark > td {
          background-color: #2a1215 !important;
        }
        .dark-theme .row-booked-future-dark > td {
          background-color: #162c1b !important;
        }
        .dark-theme .row-hope-dark > td {
          background-color: #2b2111 !important;
        }
        .dark-theme .row-missed-dark:hover > td {
          background-color: #381b1e !important;
        }
        .dark-theme .row-booked-future-dark:hover > td {
          background-color: #1e3a24 !important;
        }
        .dark-theme .row-hope-dark:hover > td {
          background-color: #382c16 !important;
        }

        /* Gold highlights for both light/dark */
        .antd-custom-table .ant-pagination-item-active {
          border-color: #d4a84b !important;
        }
        .antd-custom-table .ant-pagination-item-active a {
          color: #d4a84b !important;
        }

        /* Compact line height & padding */
        .antd-custom-table .ant-table-tbody > tr > td {
          padding: 6px 8px !important;
          line-height: 1.25 !important;
        }
        .antd-custom-table .ant-table-thead > tr > th {
          padding: 8px 8px !important;
          line-height: 1.25 !important;
        }
      `}</style>
    </div>
  );
}

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
            <ClockCircleOutlined /> CHIẾN DỊCH KHÁCH HÀNG NYC
          </Title>
          <Text style={{ color: themeMode === 'dark' ? token.colorTextDescription : '#555555' }}>
            Hệ thống chăm sóc đặc biệt dành cho khách hàng chưa mua gói Combo (Single/Combo hết hạn).
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
              Tổng Khách Hàng NYC
            </Text>
            <div style={{ fontSize: '26px', fontWeight: 'bold', color: token.colorText, marginTop: '4px' }}>
              {Object.values(tabCounts).reduce((sum, val) => sum + val, 0)}{' '}
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
              NYC 30 (Quan trọng nhất)
            </Text>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 'bold',
                color: themeMode === 'dark' ? '#D4A84B' : '#87640a',
                marginTop: '4px',
              }}
            >
              {tabCounts['NYC_30'] || 0}{' '}
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
              Hiệu suất Đặt Lịch (Booked Rate)
            </Text>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 'bold',
                color: themeMode === 'dark' ? '#52C41A' : '#237804',
                marginTop: '4px',
              }}
            >
              {overallStats.totalCalledToday > 0
                ? Math.round((overallStats.totalBookedToday / overallStats.totalCalledToday) * 100)
                : 0}
              %{' '}
              <span style={{ fontSize: '13px', fontWeight: 'normal', color: token.colorTextDescription }}>
                đặt lịch
              </span>
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

      {/* FILTER & PIPELINE SECTION */}
      <Card
        style={{
          background: themeMode === 'dark' ? '#111827' : '#ffffff',
          border: `1px solid ${token.colorBorderSecondary}`,
          marginBottom: '24px',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* TOUCHPOINTS PIPELINE TIMELINE */}
          <div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <Text style={{ fontWeight: '600', color: token.colorText }}>QUY TRÌNH CHĂM SÓC THEO CHẠM</Text>
              {activeTouchpointKey !== 'ALL' && (
                <Button type="link" size="small" onClick={() => setActiveTouchpointKey('ALL')}>
                  Xem tất cả khách hàng
                </Button>
              )}
            </div>

            <div
              className={`p-2.5 rounded-xl border ${
                themeMode === 'dark' ? 'bg-[#1a1a1a] border-white/5' : 'bg-slate-50/50 border-slate-100'
              }`}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                overflowX: 'auto',
                minHeight: '68px',
              }}
            >
              {/* All touchpoints capsule */}
              <div
                onClick={() => setActiveTouchpointKey('ALL')}
                className={`rounded-lg cursor-pointer text-center select-none transition-all duration-300 border-2 ${
                  activeTouchpointKey === 'ALL'
                    ? 'border-gold bg-gold/10 shadow-[0_2px_10px_rgba(212,168,75,0.15)] scale-[1.02]'
                    : themeMode === 'dark'
                      ? 'border-transparent bg-white/[0.01] hover:bg-white/[0.03]'
                      : 'border-transparent bg-white hover:bg-white hover:border-slate-200'
                }`}
                style={{
                  flex: 1,
                  minWidth: '72px',
                  flexShrink: 0,
                  padding: '6px 10px',
                }}
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
                  {tabCounts[activeTab] || 0}
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
                      className={`rounded-lg cursor-pointer text-center select-none transition-all duration-300 border-2 ${
                        isSelected
                          ? 'border-gold bg-gold/10 shadow-[0_2px_10px_rgba(212,168,75,0.15)] scale-[1.02]'
                          : themeMode === 'dark'
                            ? 'border-transparent bg-white/[0.01] hover:bg-white/[0.03]'
                            : 'border-transparent bg-white hover:bg-white hover:border-slate-200'
                      }`}
                      style={{
                        flex: 1,
                        minWidth: '68px',
                        flexShrink: 0,
                        padding: '6px 8px',
                      }}
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
                      <div style={{ fontSize: '8.5px', color: '#888', marginTop: '1px' }}>
                        {tp.daysMin === tp.daysMax ? `${tp.daysMin}d` : `${tp.daysMin}-${tp.daysMax}d`}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <Divider style={{ margin: 0, opacity: 0.5 }} />

          {/* SEARCH & FILTERS BAR */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <Space wrap className="w-full md:w-auto">
              <Input
                placeholder="Tìm khách hàng (Tên, SĐT, ID)..."
                prefix={<SearchOutlined style={{ color: '#aaa' }} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                style={{ width: 280 }}
              />
              <Select
                value={sortField}
                onChange={(val) => setSortField(val)}
                style={{ width: 220 }}
                options={[
                  { value: 'daysSinceLastVisit_asc', label: 'Chưa ghé tăng dần' },
                  { value: 'daysSinceLastVisit_desc', label: 'Chưa ghé giảm dần' },
                  { value: 'totalSpent_desc', label: 'Doanh thu LTV lớn nhất' },
                  { value: 'lastCallDate_desc', label: 'Gọi gần nhất' },
                  { value: 'lastCallDate_asc', label: 'Gọi lâu nhất' },
                ]}
              />
            </Space>
            <Space>
              <Tooltip title="Cấu hình cột bảng">
                <Button icon={<SettingOutlined />} onClick={openNycConfig} />
              </Tooltip>
            </Space>
          </div>
        </div>
      </Card>

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

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
  Result,
  ConfigProvider,
} from 'antd';
import { GoogleSheetColorPicker } from '../../../components/GoogleSheetColorPicker';
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
  TableOutlined,
  SaveOutlined,
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
import { useLocaData, TAB_KEYS } from './hooks/useLocaData';
import { getLocaColumns, getNewLocaColumns } from './components/LocaColumns';
import { formatDuration, formatVND } from '../../../lib/format-utils';
import { useOmiCall } from '../../../context/OmiCallContext';

const { Title, Text } = Typography;

export interface TouchpointPalette {
  bg: string;
  border: string;
  text: string;
  dot: string;
}

export const getTouchpointPalette = (colorStr: string | undefined, themeMode: string): TouchpointPalette => {
  const isDark = themeMode === 'dark';

  if (!colorStr) {
    return {
      bg: isDark ? 'rgba(59,130,246,0.12)' : '#eff6ff',
      border: isDark ? 'rgba(59,130,246,0.3)' : '#bfdbfe',
      text: isDark ? '#93c5fd' : '#1d4ed8',
      dot: '#3b82f6',
    };
  }

  const hex = colorStr.startsWith('#')
    ? colorStr
    : {
        blue: '#2563eb',
        cyan: '#0891b2',
        green: '#16a34a',
        emerald: '#059669',
        amber: '#d97706',
        orange: '#ea580c',
        rose: '#e11d48',
        red: '#dc2626',
        purple: '#9333ea',
        indigo: '#4f46e5',
        pink: '#db2777',
        slate: '#475569',
      }[colorStr.toLowerCase()] || '#2563eb';

  let r = 37,
    g = 99,
    b = 235;
  if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) {
    const fullHex = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
    r = parseInt(fullHex.slice(1, 3), 16);
    g = parseInt(fullHex.slice(3, 5), 16);
    b = parseInt(fullHex.slice(5, 7), 16);
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (isDark) {
    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.15)`,
      border: `rgba(${r}, ${g}, ${b}, 0.32)`,
      text: luminance > 0.7 ? `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})` : hex,
      dot: hex,
    };
  } else {
    let textR = r,
      textG = g,
      textB = b;
    if (luminance > 0.55) {
      textR = Math.round(r * 0.52);
      textG = Math.round(g * 0.52);
      textB = Math.round(b * 0.52);
    } else {
      textR = Math.round(r * 0.75);
      textG = Math.round(g * 0.75);
      textB = Math.round(b * 0.75);
    }

    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.07)`,
      border: `rgba(${r}, ${g}, ${b}, 0.25)`,
      text: `rgb(${textR}, ${textG}, ${textB})`,
      dot: hex,
    };
  }
};

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
    onCloseDrawer: () => closeLocaConfig(),
  });

  const isLocaAllowed = ['admin', 'manager', 'oc', 'cc', 'cs', 'control'].includes(
    currentUser?.role?.toLowerCase() || ''
  );

  const [smsModalVisible, setSmsModalVisible] = useState<boolean>(false);

  const handleOpenSmsModal = React.useCallback(
    (customer: Customer) => {
      setSelectedCustomer(customer);
      setSmsModalVisible(true);
    },
    [setSelectedCustomer, setSmsModalVisible]
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
    handleOpenBookingWizard: (cust: any) => {
      setBookingInitialCustomer(cust);
      setBookingWizardVisible(true);
    },
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

  useEffect(() => {
    if (locaConfigVisible) {
      const currentConfigs = configs['LOCA_ALL'] || [];
      settingsForm.setFieldsValue({ touchpoints: currentConfigs });
    }
  }, [locaConfigVisible, configs, settingsForm]);

  if (currentUser && !isLocaAllowed) {
    return (
      <Card style={{ marginTop: 24, textAlign: 'center', borderRadius: 8 }}>
        <Result
          status="403"
          title="403 - Không Có Quyền Truy Cập"
          subTitle="Chiến dịch LoCa chỉ dành cho Admin, Manager, CS (Customer Care) và Control (Operations Coordinator)."
        />
      </Card>
    );
  }

  return (
    <div>
      {/* HEADER SECTION (Compact Single-Line Layout) */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
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

        <div className="flex items-center gap-3 flex-wrap">
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
                icon={<CalendarPlusIcon fontSize={16} />}
                style={{
                  backgroundColor: themeMode === 'dark' ? '#D4A84B' : '#2563eb',
                  borderColor: themeMode === 'dark' ? '#D4A84B' : '#2563eb',
                  color: '#ffffff',
                  fontWeight: 'bold',
                }}
                onClick={() => {
                  setBookingInitialCustomer(null);
                  setBookingWizardVisible(true);
                }}
              />
            </Tooltip>
          </Space>
        </div>
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
                  {tabCounts['LOCA_ALL'] || 0}
                </div>
              </div>

              {/* Individual touchpoints */}
              {activeTouchpointsList.map((tp, idx) => {
                const isSelected = activeTouchpointKey === tp.key;
                const count = touchpointCounts[tp.key] || 0;
                const palette = getTouchpointPalette(tp.color, themeMode);

                return (
                  <React.Fragment key={tp.key}>
                    {idx > 0 && (
                      <div
                        style={{
                          width: '4px',
                          height: '2px',
                          backgroundColor: themeMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div
                      onClick={() => setActiveTouchpointKey(tp.key)}
                      className={`rounded-xl cursor-pointer text-center select-none transition-all duration-300 border ${
                        isSelected
                          ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-md scale-[1.03]'
                          : 'hover:scale-[1.01]'
                      }`}
                      style={{
                        flex: 1,
                        minWidth: '76px',
                        flexShrink: 0,
                        padding: '6px 10px',
                        backgroundColor: isSelected
                          ? themeMode === 'dark'
                            ? 'rgba(212,168,75,0.15)'
                            : '#fffbeb'
                          : palette.bg,
                        borderColor: isSelected ? '#f59e0b' : palette.border,
                      }}
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: palette.dot,
                            flexShrink: 0,
                            boxShadow: `0 0 4px ${palette.dot}80`,
                          }}
                        />
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            whiteSpace: 'nowrap',
                            color: palette.text,
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {tp.label}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: '900',
                          fontVariantNumeric: 'tabular-nums',
                          fontFeatureSettings: '"tnum"',
                          color: isSelected ? (themeMode === 'dark' ? '#fbbf24' : '#b45309') : palette.text,
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
                    ? 'bg-blue-50 text-blue-600 border-blue-300 shadow-xs dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40'
                    : 'bg-slate-100/60 hover:bg-slate-200/60 text-slate-400 border-slate-200/60 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 dark:text-slate-500 dark:border-slate-800/60'
                }`}
              >
                <UnorderedListOutlined
                  style={{
                    fontSize: '14px',
                    color: bookingStatusFilter === 'ALL' ? (themeMode === 'dark' ? '#60a5fa' : '#2563eb') : undefined,
                  }}
                />
              </button>
            </Tooltip>

            <Tooltip title="Đã book (Có lịch hẹn tương lai)">
              <button
                type="button"
                onClick={() => setBookingStatusFilter('BOOKED')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                  bookingStatusFilter === 'BOOKED'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-300 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40'
                    : 'bg-slate-100/60 hover:bg-slate-200/60 text-slate-400 border-slate-200/60 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 dark:text-slate-500 dark:border-slate-800/60'
                }`}
              >
                <CalendarOutlined
                  style={{
                    fontSize: '14px',
                    color:
                      bookingStatusFilter === 'BOOKED' ? (themeMode === 'dark' ? '#34d399' : '#059669') : undefined,
                  }}
                />
              </button>
            </Tooltip>

            <Tooltip title="Chưa book (Chưa có lịch hẹn tương lai)">
              <button
                type="button"
                onClick={() => setBookingStatusFilter('NOT_BOOKED')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                  bookingStatusFilter === 'NOT_BOOKED'
                    ? 'bg-rose-50 text-rose-600 border-rose-300 shadow-xs dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/40'
                    : 'bg-slate-100/60 hover:bg-slate-200/60 text-slate-400 border-slate-200/60 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 dark:text-slate-500 dark:border-slate-800/60'
                }`}
              >
                <CloseCircleOutlined
                  style={{
                    fontSize: '14px',
                    color:
                      bookingStatusFilter === 'NOT_BOOKED' ? (themeMode === 'dark' ? '#f87171' : '#e11d48') : undefined,
                  }}
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
              icon={<SettingOutlined style={{ color: '#ffffff', fontSize: '14px' }} />}
              onClick={openLocaConfig}
              style={{
                backgroundColor: themeMode === 'dark' ? '#D4A84B' : '#2563eb',
                borderColor: themeMode === 'dark' ? '#D4A84B' : '#2563eb',
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
        scroll={{ x: 'max-content' }}
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
        extraTabTitle="Quy Trình & Nghiệp Vụ"
        extraTabContent={
          <div className="space-y-3">
            {/* Header info banner */}
            <div
              className={`flex justify-between items-center px-3 py-2 rounded-lg border ${
                themeMode === 'dark'
                  ? 'bg-slate-900/90 border-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-amber-500 font-semibold text-xs">⚡ Quy trình CSKH</span>
                <span className="text-[11px] opacity-75 hidden sm:inline">
                  (Cấu hình mốc thời gian & màu sắc hiển thị)
                </span>
              </div>
              <Tooltip title="Khôi phục quy trình mốc chạm mặc định">
                <Button
                  type="text"
                  danger
                  icon={<UndoOutlined />}
                  onClick={handleResetConfigDefaults}
                  size="small"
                  className="hover:bg-rose-500/10 text-xs"
                >
                  Mặc định
                </Button>
              </Tooltip>
            </div>

            {/* Table Header Bar */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-md font-semibold text-xs uppercase tracking-wider ${
                themeMode === 'dark'
                  ? 'bg-slate-800/80 border border-slate-700/60 text-amber-400'
                  : 'bg-slate-100 border border-slate-200 text-slate-700'
              }`}
            >
              <span className="w-8 text-center">STT</span>
              <span className="w-24">Mã Key</span>
              <span className="flex-1">Tên hiển thị</span>
              <span className="w-32 text-center">Thời gian (Min - Max)</span>
              <span className="w-28 text-center">Màu Badge</span>
              <span className="w-8 text-center">Xóa</span>
            </div>

            <Form form={settingsForm} name="loca_touchpoints_form" layout="vertical">
              <Form.List name="touchpoints">
                {(fields, { add, remove }) => (
                  <div id="loca-touchpoints-list" className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {fields.map(({ key, name, ...restField }) => (
                      <div
                        key={key}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all duration-150 ${
                          themeMode === 'dark'
                            ? 'bg-[#131b2e]/90 border-slate-800 hover:border-amber-500/50 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-blue-400/50 shadow-sm'
                        }`}
                      >
                        <Tag
                          color={themeMode === 'dark' ? 'gold' : 'blue'}
                          className="text-xs font-semibold m-0 px-2 py-0.5 rounded-md min-w-[32px] text-center tabular-nums"
                        >
                          #{name + 1}
                        </Tag>

                        <Tooltip title="Mã định danh Key (ví dụ: now, 17)">
                          <div className="w-24">
                            <Form.Item {...restField} name={[name, 'key']} noStyle rules={[{ required: true }]}>
                              <Input
                                placeholder="Key"
                                size="small"
                                className={`text-xs ${
                                  themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : ''
                                }`}
                              />
                            </Form.Item>
                          </div>
                        </Tooltip>

                        <Tooltip title="Tên nhãn hiển thị (ví dụ: Chạm 24h)">
                          <div className="flex-1 min-w-0">
                            <Form.Item {...restField} name={[name, 'label']} noStyle rules={[{ required: true }]}>
                              <Input
                                placeholder="Tên hiển thị"
                                size="small"
                                className={`text-xs ${
                                  themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : ''
                                }`}
                              />
                            </Form.Item>
                          </div>
                        </Tooltip>

                        <div className="flex items-center gap-1 w-32">
                          <Tooltip title="Số ngày Min">
                            <Form.Item {...restField} name={[name, 'daysMin']} noStyle rules={[{ required: true }]}>
                              <InputNumber
                                min={0}
                                placeholder="Min"
                                size="small"
                                className={`w-full text-xs tabular-nums ${
                                  themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : ''
                                }`}
                              />
                            </Form.Item>
                          </Tooltip>
                          <span className="text-slate-400 text-xs font-bold">-</span>
                          <Tooltip title="Số ngày Max">
                            <Form.Item {...restField} name={[name, 'daysMax']} noStyle rules={[{ required: true }]}>
                              <InputNumber
                                min={0}
                                placeholder="Max"
                                size="small"
                                className={`w-full text-xs tabular-nums ${
                                  themeMode === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : ''
                                }`}
                              />
                            </Form.Item>
                          </Tooltip>
                        </div>

                        <Tooltip title="Màu sắc đại diện">
                          <div className="w-28 flex justify-center">
                            <Form.Item {...restField} name={[name, 'color']} noStyle rules={[{ required: true }]}>
                              <GoogleSheetColorPicker size="small" />
                            </Form.Item>
                          </div>
                        </Tooltip>

                        <Tooltip title="Xóa mốc chạm">
                          <div className="w-8 flex justify-center">
                            <Button
                              type="text"
                              danger
                              size="small"
                              onClick={() => remove(name)}
                              icon={<MinusCircleOutlined />}
                              className="hover:bg-rose-500/10"
                            />
                          </div>
                        </Tooltip>
                      </div>
                    ))}

                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                      size="small"
                      className={`mt-2 py-1.5 font-medium transition-all ${
                        themeMode === 'dark'
                          ? 'border-slate-700 hover:border-amber-400 hover:text-amber-400 text-slate-300'
                          : 'border-slate-300 hover:border-blue-500 hover:text-blue-600'
                      }`}
                    >
                      Thêm Mốc Chạm Mới
                    </Button>
                  </div>
                )}
              </Form.List>
            </Form>

            <Divider style={{ margin: '12px 0' }} />

            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveConfig}
              block
              size="large"
              className={`font-semibold shadow-md transition-all ${
                themeMode === 'dark'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-500 text-slate-950 hover:from-amber-400 hover:to-amber-500'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-600 text-white'
              }`}
            >
              Xuất bản quy trình LoCa
            </Button>
          </div>
        }
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

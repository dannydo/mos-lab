'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  DatePicker,
  Radio,
  Button,
  Space,
  Card,
  Tag,
  Avatar,
  Typography,
  Tooltip,
  theme,
  Spin,
  message,
  Select,
} from 'antd';
import {
  PhoneOutlined,
  UserOutlined,
  SettingOutlined,
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dynamic from 'next/dynamic';
import { useTheme } from '../context/ThemeContext';
import { useOmiCall } from '../context/OmiCallContext';
import { useTableConfig } from '../hooks/useTableConfig';
import { ResizableHeaderCell } from './ResizableHeaderCell';
import { apiClient } from '../lib/api-client';
import { formatVND, formatDuration } from '../lib/format-utils';
import { DailyCallEntry } from '@mos-lab/shared';

const CustomerDetailDrawer = dynamic(() => import('./CustomerDetailDrawer'), { ssr: false });
const TableConfigDrawer = dynamic(() => import('./TableConfigDrawer').then((m) => m.TableConfigDrawer), { ssr: false });

const { Text, Title } = Typography;

interface DailyCallsTableProps {
  initialScope?: 'all' | 'me' | 'nyc';
  isDrawerMode?: boolean;
}

export default function DailyCallsTable({ initialScope = 'all', isDrawerMode = false }: DailyCallsTableProps) {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const { makeCall } = useOmiCall();

  // Filter & Navigation states
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [scope, setScope] = useState<'all' | 'me' | 'nyc'>(initialScope);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DailyCallEntry[]>([]);

  // Admin filter states
  const [currentUser, setCurrentUser] = useState<SafeAny | null>(null);
  const [staffList, setStaffList] = useState<SafeAny[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');

  // Pagination states
  const [pageSize, setPageSize] = useState<number>(isDrawerMode ? 10 : 15);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isReady, setIsReady] = useState(false);

  // Drawer states
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);

  // Load current user and restore settings from localStorage on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCurrentUser(parsed);

          if (parsed.role === 'admin') {
            apiClient.staff
              .list()
              .then((list) => {
                setStaffList(list);
              })
              .catch((err) => console.error('Fetch staff list error:', err));
          }
        } catch (e) {
          console.error('Failed to parse user', e);
        }
      }

      // Restore selections
      const savedDate = localStorage.getItem('mos_daily_calls_selectedDate');
      if (savedDate) {
        setSelectedDate(dayjs(savedDate));
      }

      const savedScope = localStorage.getItem('mos_daily_calls_scope');
      if (savedScope && ['all', 'me', 'nyc'].includes(savedScope)) {
        setScope(savedScope as 'all' | 'me' | 'nyc');
      }

      const savedStaffId = localStorage.getItem('mos_daily_calls_selectedStaffId');
      if (savedStaffId) {
        setSelectedStaffId(savedStaffId);
      }

      const savedPageSize = localStorage.getItem('mos_daily_calls_pageSize');
      if (savedPageSize) {
        const parsedSize = parseInt(savedPageSize, 10);
        if (!isNaN(parsedSize)) {
          setPageSize(parsedSize);
        }
      }

      const savedPage = localStorage.getItem('mos_daily_calls_currentPage');
      if (savedPage) {
        const parsedPage = parseInt(savedPage, 10);
        if (!isNaN(parsedPage)) {
          setCurrentPage(parsedPage);
        }
      }

      setIsReady(true);
    }
  }, []);

  // Sync initialScope if it changes (e.g. when route transitions)
  useEffect(() => {
    if (isReady) {
      setScope(initialScope);
      localStorage.setItem('mos_daily_calls_scope', initialScope);
      setCurrentPage(1);
      localStorage.setItem('mos_daily_calls_currentPage', '1');
    }
  }, [initialScope, isReady]);

  // Fetch daily calls
  const fetchDailyCalls = useCallback(
    async (date: dayjs.Dayjs, currentScope: 'all' | 'me' | 'nyc', staffFilterId: string) => {
      setLoading(true);
      try {
        const dateStr = date.format('YYYY-MM-DD');
        const res = await apiClient.calls.listDaily({
          date: dateStr,
          scope: currentScope,
          staffId: currentScope === 'me' ? undefined : staffFilterId,
        });
        setData(res);
      } catch (err) {
        console.error('Fetch daily calls error:', err);
        message.error('Không thể tải danh sách cuộc gọi.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isReady) {
      fetchDailyCalls(selectedDate, scope, selectedStaffId);
    }
  }, [selectedDate, scope, selectedStaffId, fetchDailyCalls, isReady]);

  const handlePrevDay = () => {
    setSelectedDate((prev) => {
      const next = prev.subtract(1, 'day');
      localStorage.setItem('mos_daily_calls_selectedDate', next.format('YYYY-MM-DD'));
      return next;
    });
    setCurrentPage(1);
    localStorage.setItem('mos_daily_calls_currentPage', '1');
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => {
      const next = prev.add(1, 'day');
      localStorage.setItem('mos_daily_calls_selectedDate', next.format('YYYY-MM-DD'));
      return next;
    });
    setCurrentPage(1);
    localStorage.setItem('mos_daily_calls_currentPage', '1');
  };

  const handleToday = () => {
    const today = dayjs();
    setSelectedDate(today);
    localStorage.setItem('mos_daily_calls_selectedDate', today.format('YYYY-MM-DD'));
    setCurrentPage(1);
    localStorage.setItem('mos_daily_calls_currentPage', '1');
  };

  const openCustomerDetail = (id: number) => {
    setSelectedCustomerId(id);
    setCustomerDrawerOpen(true);
  };

  // Define static columns for useTableConfig
  const staticColumns = useMemo(() => {
    return [
      {
        title: 'Mã KH',
        dataIndex: ['customer', 'id'],
        key: 'customerId',
        width: 80,
        render: (_: SafeAny, record: DailyCallEntry) => record.customer?.id || '-',
      },
      {
        title: 'Khách Hàng',
        dataIndex: ['customer', 'name'],
        key: 'client',
        render: (_: SafeAny, record: DailyCallEntry) => {
          if (!record.customer) return '-';
          return (
            <Space
              size="small"
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => openCustomerDetail(record.customer!.id)}
            >
              <Avatar
                size="small"
                src={record.customer.avatar || undefined}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: themeMode === 'dark' ? '#333' : '#f5f5f5',
                  color: '#D4A84B',
                  border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#d9d9d9'}`,
                  flexShrink: 0,
                }}
              />
              <div>
                <span className="hover:underline font-semibold" style={{ color: token.colorText }}>
                  {record.customer.name}
                </span>
                <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                  {record.customer.phone || 'Không có SĐT'}
                </div>
              </div>
            </Space>
          );
        },
      },
      {
        title: 'Gọi Điện',
        key: 'makeCall',
        width: 130,
        render: (_: SafeAny, record: DailyCallEntry) => {
          const phone = record.customer?.phone;
          if (!phone) return '-';
          return (
            <Button
              type="link"
              size="small"
              icon={<PhoneOutlined style={{ color: '#D4A84B' }} />}
              onClick={(e) => {
                e.stopPropagation();
                makeCall(phone, record.customer!.name, record.customer!.id, record.customer?.avatar || undefined);
              }}
              style={{ padding: 0, fontWeight: '600', color: token.colorText }}
            >
              {phone}
            </Button>
          );
        },
      },
      {
        title: 'Last time in bed',
        dataIndex: ['customer', 'daysSinceLastVisit'],
        key: 'lastTimeInBed',
        width: 180,
        render: (_: SafeAny, record: DailyCallEntry) => {
          if (!record.customer) return '-';
          const days = record.customer.daysSinceLastVisit;
          const lastBookingDate = record.customer.lastBookingDate;

          const isBookingInFuture = lastBookingDate ? new Date(lastBookingDate) > new Date() : false;
          if (isBookingInFuture) {
            const bookingFormatted = dayjs(lastBookingDate).format('DD/MM/YYYY');
            return (
              <span style={{ color: themeMode === 'dark' ? '#95de64' : '#237804', fontWeight: 'bold' }}>
                📅 Booked: {bookingFormatted}
              </span>
            );
          }

          return days !== null && days !== undefined ? (
            `${days} ngày`
          ) : (
            <Text style={{ color: token.colorTextDescription }}>Chưa từng đến</Text>
          );
        },
      },
      {
        title: 'Lifetime Value',
        dataIndex: ['customer', 'totalSpent'],
        key: 'lifetimeValue',
        width: 140,
        render: (spent: number) => formatVND(spent),
      },
      {
        title: 'Booker',
        dataIndex: ['customer', 'assignedStaff'],
        key: 'assignedStaff',
        width: 140,
        render: (staff: SafeAny) =>
          staff ? (
            <Tag color="cyan" style={{ fontWeight: '500' }}>
              {staff.displayName}
            </Tag>
          ) : (
            <span style={{ fontStyle: 'italic', color: token.colorTextDescription }}>Chưa phân bổ</span>
          ),
      },
      {
        title: 'Last call',
        dataIndex: 'createdAt',
        key: 'lastCall',
        width: 90,
        render: (dateStr: string) => dayjs(dateStr).format('HH:mm'),
      },
      {
        title: 'SL Booker (Thời lượng)',
        dataIndex: 'durationSec',
        key: 'duration',
        width: 110,
        render: (sec: number | null) => {
          const formatted = formatDuration(sec);
          return (
            <Tag color="blue" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
              {formatted === '-' ? '00:00' : formatted}
            </Tag>
          );
        },
      },
      {
        title: 'Call Status',
        dataIndex: 'callResult',
        key: 'callStatus',
        width: 160,
        render: (result: string | null) => {
          if (result === 'ANSWERED') {
            return (
              <Tag color="success" style={{ fontWeight: '600', borderRadius: '4px' }}>
                Có bắt máy
              </Tag>
            );
          }
          if (result === 'NO_ANSWER') {
            return (
              <Tag color="warning" style={{ fontWeight: '600', borderRadius: '4px' }}>
                Không trả lời [Gọi nhỡ]
              </Tag>
            );
          }
          if (result === 'WRONG_NUMBER') {
            return (
              <Tag color="error" style={{ fontWeight: '600', borderRadius: '4px' }}>
                Sai số
              </Tag>
            );
          }
          if (result === 'BUSY') {
            return (
              <Tag color="error" style={{ fontWeight: '600', borderRadius: '4px' }}>
                Máy bận
              </Tag>
            );
          }
          if (result === 'FAILED') {
            return (
              <Tag color="error" style={{ fontWeight: '600', borderRadius: '4px' }}>
                Lỗi cuộc gọi
              </Tag>
            );
          }
          return <Tag color="default">{result || 'Chưa rõ'}</Tag>;
        },
      },
      {
        title: 'Call Notes',
        dataIndex: 'note',
        key: 'callNotes',
        render: (text: string | null) => (
          <Text style={{ fontSize: '13px', color: token.colorText }} ellipsis={{ tooltip: text || undefined }}>
            {text || '-'}
          </Text>
        ),
      },
    ];
  }, [themeMode, token, makeCall]);

  // Hook for column config customizations
  const {
    loading: configLoading,
    columns: configuredColumns,
    rawConfig,
    configVisible,
    openConfig,
    closeConfig,
    saveConfig,
    resetConfig,
  } = useTableConfig('daily_calls_table', staticColumns);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Table Headers Controls */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          background: themeMode === 'dark' ? '#111827' : '#fafafa',
          borderRadius: '8px',
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Space size="middle" style={{ flexWrap: 'wrap' }}>
          {/* Date controls */}
          <Space.Compact>
            <Button icon={<LeftOutlined />} onClick={handlePrevDay} />
            <DatePicker
              value={selectedDate}
              onChange={(date) => {
                if (date) {
                  setSelectedDate(date);
                  localStorage.setItem('mos_daily_calls_selectedDate', date.format('YYYY-MM-DD'));
                  setCurrentPage(1);
                  localStorage.setItem('mos_daily_calls_currentPage', '1');
                }
              }}
              format="DD/MM/YYYY"
              allowClear={false}
              style={{ width: '130px', textAlign: 'center' }}
            />
            <Button icon={<RightOutlined />} onClick={handleNextDay} />
          </Space.Compact>

          <Button type="default" onClick={handleToday} disabled={selectedDate.isSame(dayjs(), 'day')}>
            Hôm nay
          </Button>

          {/* Scope selection */}
          <Radio.Group
            value={scope}
            onChange={(e) => {
              const val = e.target.value;
              setScope(val);
              localStorage.setItem('mos_daily_calls_scope', val);
              setCurrentPage(1);
              localStorage.setItem('mos_daily_calls_currentPage', '1');
            }}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="all">Tất cả cuộc gọi</Radio.Button>
            <Radio.Button value="me">Khách của tôi</Radio.Button>
            <Radio.Button value="nyc">Chiến dịch NYC</Radio.Button>
          </Radio.Group>
          {/* Lọc theo nhân viên cho Admin (chỉ hiển thị khi không ở tab 'Khách của tôi') */}
          {currentUser?.role === 'admin' && scope !== 'me' && (
            <Select
              value={selectedStaffId}
              onChange={(val) => {
                setSelectedStaffId(val);
                localStorage.setItem('mos_daily_calls_selectedStaffId', val);
                setCurrentPage(1);
                localStorage.setItem('mos_daily_calls_currentPage', '1');
              }}
              style={{ width: '180px' }}
              options={[
                { value: 'all', label: 'Tất cả Booker/Staff' },
                ...staffList.map((s) => ({ value: s.id.toString(), label: `Booker: ${s.displayName}` })),
              ]}
              popupMatchSelectWidth={false}
              placeholder="Lọc theo Booker"
            />
          )}
        </Space>

        <Space>
          <Tooltip title="Cấu hình cột">
            <Button icon={<SettingOutlined />} onClick={openConfig} />
          </Tooltip>
          <Tooltip title="Tải lại dữ liệu">
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              style={{ backgroundColor: '#D4A84B', borderColor: '#D4A84B', color: '#000' }}
              onClick={() => fetchDailyCalls(selectedDate, scope, selectedStaffId)}
              loading={loading}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Table Section */}
      <div className="antd-custom-table" style={{ width: '100%' }}>
        <Table<DailyCallEntry>
          components={{
            header: {
              cell: ResizableHeaderCell,
            },
          }}
          columns={configuredColumns}
          dataSource={data}
          rowKey="id"
          loading={loading || configLoading || !isReady}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (page, size) => {
              setCurrentPage(page);
              localStorage.setItem('mos_daily_calls_currentPage', page.toString());
              if (size !== pageSize) {
                setPageSize(size);
                localStorage.setItem('mos_daily_calls_pageSize', size.toString());
                setCurrentPage(1);
                localStorage.setItem('mos_daily_calls_currentPage', '1');
              }
            },
            showTotal: (total) => `Tổng cộng ${total} cuộc gọi`,
          }}
          bordered
          scroll={{ x: 'max-content' }}
          className="daily-calls-custom-table"
        />
      </div>

      {/* Table configuration Drawer */}
      <TableConfigDrawer
        visible={configVisible}
        onClose={closeConfig}
        columns={rawConfig}
        onSave={saveConfig}
        onReset={resetConfig}
      />

      {/* Customer details drawer */}
      <CustomerDetailDrawer
        open={customerDrawerOpen}
        customerId={selectedCustomerId}
        onClose={() => setCustomerDrawerOpen(false)}
      />

      <style jsx global>{`
        /* Overrides specific to daily calls table inside Dark Theme */
        .dark-theme .daily-calls-custom-table .ant-table {
          background: #141414 !important;
          color: #ccc !important;
        }
        .dark-theme .daily-calls-custom-table .ant-table-thead > tr > th {
          background: #1f1f1f !important;
          color: #d4a84b !important;
          border-bottom: 1px solid #2a2a2a !important;
        }
        .dark-theme .daily-calls-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #1a1a1a !important;
        }
        .dark-theme .daily-calls-custom-table .ant-table-row:hover > td {
          background: #1e1e1e !important;
        }

        /* Padding adjustments for desktop view */
        .daily-calls-custom-table .ant-table-tbody > tr > td {
          padding: 8px 12px !important;
          line-height: 1.3 !important;
        }
        .daily-calls-custom-table .ant-table-thead > tr > th {
          padding: 10px 12px !important;
          line-height: 1.3 !important;
        }
      `}</style>
    </div>
  );
}

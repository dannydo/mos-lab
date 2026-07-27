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
const QAPlayerDrawer = dynamic(() => import('./QAPlayerDrawer').then((m) => m.QAPlayerDrawer), { ssr: false });

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
  const [qaDrawerOpen, setQaDrawerOpen] = useState(false);
  const [selectedOmicallLogId, setSelectedOmicallLogId] = useState<number | null>(null);

  const openQADrawer = useCallback((omicallLogId: number) => {
    setSelectedOmicallLogId(omicallLogId);
    setQaDrawerOpen(true);
  }, []);

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
                  backgroundColor: 'var(--avatar-bg)',
                  color: '#D4A84B',
                  border: '1px solid var(--avatar-border)',
                  flexShrink: 0,
                }}
              />
              <div>
                <span className="hover:underline font-semibold" style={{ color: 'var(--client-name-color)' }}>
                  {record.customer.name}
                </span>
                <div style={{ fontSize: '11px', color: 'var(--client-phone-color)' }}>
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
              style={{ padding: 0, fontWeight: '600', color: 'var(--client-name-color)' }}
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
            <Text style={{ color: 'var(--client-desc-color)' }}>Chưa từng đến</Text>
          );
        },
      },
      {
        title: 'Lifetime Value',
        dataIndex: ['customer', 'totalSpent'],
        key: 'lifetimeValue',
        width: 140,
        render: (spent: number) => <span className="tabular-nums">{formatVND(spent)}</span>,
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
            <span style={{ fontStyle: 'italic', color: 'var(--client-desc-color)' }}>Chưa phân bổ</span>
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
          const seconds = sec || 0;
          const formatted = seconds === 0 ? '00:00' : formatDuration(seconds);

          let tagStyles: React.CSSProperties = {
            fontFamily: 'monospace',
            fontWeight: '600',
            borderRadius: '4px',
            borderWidth: '1.5px',
            borderStyle: 'solid',
            padding: '2px 8px',
            fontSize: '13px',
          };

          if (seconds === 0) {
            tagStyles = {
              ...tagStyles,
              color: themeMode === 'dark' ? '#595959' : '#8c8c8c',
              borderColor: themeMode === 'dark' ? '#303030' : '#d9d9d9',
              background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
              opacity: 0.5,
              fontWeight: '400',
            };
          } else if (seconds < 30) {
            tagStyles = {
              ...tagStyles,
              color: themeMode === 'dark' ? '#13c2c2' : '#08979c',
              borderColor: themeMode === 'dark' ? '#00474f' : '#87e8de',
              background: themeMode === 'dark' ? '#002329' : '#e6fffb',
            };
          } else if (seconds < 60) {
            tagStyles = {
              ...tagStyles,
              color: themeMode === 'dark' ? '#1890ff' : '#096dd9',
              borderColor: themeMode === 'dark' ? '#003a8c' : '#91d5ff',
              background: themeMode === 'dark' ? '#001d66' : '#e6f7ff',
            };
          } else if (seconds < 180) {
            tagStyles = {
              ...tagStyles,
              color: themeMode === 'dark' ? '#fa8c16' : '#d46b08',
              borderColor: themeMode === 'dark' ? '#873800' : '#ffd591',
              background: themeMode === 'dark' ? '#612500' : '#fff7e6',
              fontWeight: '700',
            };
          } else {
            tagStyles = {
              ...tagStyles,
              color: themeMode === 'dark' ? '#52c41a' : '#389e0d',
              borderColor: themeMode === 'dark' ? '#237804' : '#b7eb8f',
              background: themeMode === 'dark' ? '#135200' : '#f6ffed',
              fontWeight: '800',
              borderWidth: '2px',
              boxShadow: '0 2px 0 rgba(0, 0, 0, 0.015)',
            };
          }

          return <Tag style={tagStyles}>{formatted === '-' ? '00:00' : formatted}</Tag>;
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
          <Text
            style={{ fontSize: '13px', color: 'var(--client-name-color)' }}
            ellipsis={{ tooltip: text || undefined }}
          >
            {text || '-'}
          </Text>
        ),
      },
      {
        title: 'Happy Call',
        key: 'action',
        width: 120,
        fixed: 'right' as const,
        render: (_: SafeAny, record: DailyCallEntry) => {
          const logId = record.omicallLogId;
          const status = record.happyCallStatus || 'NONE';
          const isAnswered = record.callResult === 'ANSWERED';

          if (!isAnswered) {
            return <span style={{ fontSize: '12px', color: '#8c8c8c' }}>Không bắt máy</span>;
          }

          if (!logId) {
            return <span style={{ fontSize: '12px', fontStyle: 'italic', color: '#8c8c8c' }}>Không ghi âm</span>;
          }

          let btnText = 'Chưa xét';
          let btnType: 'primary' | 'default' = 'primary';
          const borderStyle: React.CSSProperties = {
            fontWeight: '600',
            borderRadius: '6px',
            fontSize: '12px',
          };

          if (status === 'APPROVED') {
            btnText = 'Đồng ý';
            btnType = 'default';
            borderStyle.borderColor = '#52c41a';
            borderStyle.color = '#52c41a';
          } else if (status === 'REJECTED') {
            btnText = 'Từ chối';
            btnType = 'default';
            borderStyle.borderColor = '#ff4d4f';
            borderStyle.color = '#ff4d4f';
          } else if (status === 'PENDING_APPROVAL') {
            btnText = 'Chờ duyệt';
            btnType = 'default';
            borderStyle.borderColor = '#faad14';
            borderStyle.color = '#faad14';
          } else {
            // NONE -> Chưa xét
            btnType = 'primary';
            borderStyle.backgroundColor = token.colorPrimary;
            borderStyle.borderColor = token.colorPrimary;
            borderStyle.color = '#000';
          }

          return (
            <Button
              size="small"
              type={btnType}
              style={borderStyle}
              onClick={(e) => {
                e.stopPropagation();
                openQADrawer(logId);
              }}
              className="hover:scale-105 active:scale-95 transition-all duration-150"
            >
              {btnText}
            </Button>
          );
        },
      },
    ];
  }, [themeMode, token, makeCall, openQADrawer]);

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

      {/* QA Player Drawer */}
      <QAPlayerDrawer
        open={qaDrawerOpen}
        omicallLogId={selectedOmicallLogId}
        onClose={() => setQaDrawerOpen(false)}
        onVerifySuccess={() => {
          fetchDailyCalls(selectedDate, scope, selectedStaffId);
        }}
      />

      <style jsx global>{`
        /* Overrides specific to daily calls table inside Dark & Light Theme */
        .dark-theme .daily-calls-custom-table .ant-table {
          background: #111827 !important;
          color: #cbd5e1 !important;
        }
        .light-theme .daily-calls-custom-table .ant-table {
          background: #ffffff !important;
          color: #0f172a !important;
        }
        .dark-theme .daily-calls-custom-table .ant-table-thead > tr > th {
          background: #1e293b !important;
          color: #d4a84b !important;
          border-bottom: 1px solid #334155 !important;
        }
        .light-theme .daily-calls-custom-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #9e7118 !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .dark-theme .daily-calls-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #1f2937 !important;
        }
        .light-theme .daily-calls-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .dark-theme .daily-calls-custom-table .ant-table-row:hover > td {
          background: #1e293b !important;
        }
        .light-theme .daily-calls-custom-table .ant-table-row:hover > td {
          background: #f1f5f9 !important;
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

'use client';

import '../../suppress-warnings';
import React, { useEffect, useState, useCallback } from 'react';
import {
  Button,
  Card,
  Typography,
  Space,
  Checkbox,
  Tooltip,
  Badge,
  Tag,
  Modal,
  Descriptions,
  message,
  Row,
  Col,
  Tabs,
  List,
  Divider,
  Drawer,
  theme,
} from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  PhoneOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  BulbOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { apiClient } from '../../../lib/api-client';

import { useOmiCall } from '../../../context/OmiCallContext';
import { Customer, CustomerWeeklyProgress, BucketType } from '@mos-lab/shared';
import dayjs from 'dayjs';
import { useTheme } from '../../../context/ThemeContext';
import { DataTable } from '../../../components/ui';

const { Title, Text } = Typography;

export default function PlansPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [weeklyProgress, setWeeklyProgress] = useState<CustomerWeeklyProgress[]>([]);

  // Date controls
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const mon = new Date(d.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
  });

  // Suggestion Drawer
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [suggests, setSuggests] = useState<SafeAny>({
    happyCall: [],
    single21d: [],
    combo25d: [],
    singleLost: [],
    campaignComboT7: [],
    campaignPromo2: [],
  });
  const [suggestsLoading, setSuggestsLoading] = useState(false);

  const { openCallLogModal } = useOmiCall();

  // Helper: Format Vietnamese Date
  const formatShortDate = React.useCallback((date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  }, []);

  // Build week days dates
  const weekDays = React.useMemo(() => {
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(currentWeekMonday);
      d.setDate(currentWeekMonday.getDate() + idx);
      return d;
    });
  }, [currentWeekMonday]);

  // Fetch Weekly Timeline Progress
  const fetchWeeklyPlans = useCallback(async () => {
    setLoading(true);
    try {
      const weekStartStr = currentWeekMonday.toISOString().split('T')[0];
      const data = await apiClient.plans.getWeekly({ weekStart: weekStartStr });
      setWeeklyProgress(data);
    } catch (error) {
      console.error('Fetch weekly plans error:', error);
      message.error('Không thể tải kế hoạch tuần.');
    } finally {
      setLoading(false);
    }
  }, [currentWeekMonday]);

  // Fetch Suggestions
  const fetchSuggestions = useCallback(async () => {
    setSuggestsLoading(true);
    try {
      const data = await apiClient.plans.getSuggestions();
      setSuggests(data);
    } catch (error) {
      console.error('Fetch suggestions error:', error);
    } finally {
      setSuggestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeeklyPlans();
  }, [fetchWeeklyPlans]);

  // Handle navigate weeks
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekMonday);
    prev.setDate(currentWeekMonday.getDate() - 7);
    setCurrentWeekMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekMonday);
    next.setDate(currentWeekMonday.getDate() + 7);
    setCurrentWeekMonday(next);
  };

  const handleCurrentWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    setCurrentWeekMonday(mon);
  };

  // Add customer to today's plan
  const addToPlan = async (customerId: number, planDate?: Date) => {
    const targetDate = planDate || new Date();
    try {
      await apiClient.plans.create({
        legacyUserId: customerId,
        date: targetDate.toISOString().split('T')[0],
      });
      message.success('Đã thêm khách hàng vào kế hoạch gọi!');
      fetchWeeklyPlans();
      fetchSuggestions(); // Refresh suggestions
    } catch (error) {
      console.error('Add to plan error:', error);
      message.error((error as SafeAny).response?.data?.message || 'Không thể thêm khách hàng.');
    }
  };

  // Confirm booking booking checkbox
  const handleConfirmToggle = React.useCallback(
    async (planId: number, checked: boolean) => {
      try {
        await apiClient.plans.confirm(planId, {
          isConfirmed: checked,
        });
        message.success(checked ? 'Đã chốt đặt lịch hẹn thành công!' : 'Đã hủy trạng thái đặt lịch.');
        fetchWeeklyPlans();
      } catch (error) {
        console.error('Toggle confirm error:', error);
        message.error('Không thể cập nhật trạng thái chốt.');
      }
    },
    [fetchWeeklyPlans]
  );

  // Open call log modal
  const openCallLog = React.useCallback(
    (record: CustomerWeeklyProgress, dayDate: Date) => {
      openCallLogModal({
        legacyUserId: record.customer.id,
        customerName: record.customer.name,
        planId: record.planId,
      });
    },
    [openCallLogModal]
  );

  // Listen to global call log saved event to refresh weekly plans
  useEffect(() => {
    const handleLogSaved = () => {
      fetchWeeklyPlans();
    };
    window.addEventListener('mos-data-updated', handleLogSaved);
    window.addEventListener('mos-call-log-saved', handleLogSaved);
    window.addEventListener('mos-customer-updated', handleLogSaved);
    window.addEventListener('mos-booking-updated', handleLogSaved);
    return () => {
      window.removeEventListener('mos-data-updated', handleLogSaved);
      window.removeEventListener('mos-call-log-saved', handleLogSaved);
      window.removeEventListener('mos-customer-updated', handleLogSaved);
      window.removeEventListener('mos-booking-updated', handleLogSaved);
    };
  }, [fetchWeeklyPlans]);

  // Check if date is today
  const isToday = React.useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  // Get week range string
  const getWeekRangeString = () => {
    const mon = currentWeekMonday;
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return `${mon.toLocaleDateString('vi-VN')} - ${sun.toLocaleDateString('vi-VN')}`;
  };

  const getRowClassName = React.useCallback(
    (record: Customer) => {
      // 1. check callback date ("có hẹn gọi lại -> màu hy vọng")
      const hasCallback = record.callbackDate
        ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
        : false;
      if (hasCallback) {
        return themeMode === 'dark' ? 'row-hope-dark' : 'row-hope-light';
      }

      // 2. check if they have a future booking ("đã booked -> sẽ đến, chuyển sang màu xanh")
      const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
      if (isBookingInFuture) {
        const state = record.lastBookingState;
        const isBooked = state === 'New' || state === 'Confirmed';
        if (isBooked) {
          return themeMode === 'dark' ? 'row-booked-future-dark' : 'row-booked-future-light';
        }
      }

      // 3. check positive daysSinceLastVisit but missed booking ("đã booked mà chưa tới (missed), chuyển sang màu đỏ lợt")
      const isBookingInPast = record.lastBookingDate ? new Date(record.lastBookingDate) < new Date() : false;
      if (isBookingInPast) {
        const state = record.lastBookingState;
        const isMissed =
          state &&
          state !== 'Completed' &&
          state !== 'ServiceCompleted' &&
          state !== 'CheckIn' &&
          state !== 'CheckOut' &&
          state !== 'ServiceStart';
        if (isMissed) {
          return themeMode === 'dark' ? 'row-missed-dark' : 'row-missed-light';
        }
      }

      return '';
    },
    [themeMode]
  );

  // Columns definition
  const columns = React.useMemo(
    () => [
      {
        title: 'Mã KH',
        dataIndex: ['customer', 'id'],
        key: 'id',
        width: 70,
        fixed: 'left' as const,
        render: (id: number) => <span style={{ color: token.colorTextDescription }}>{id}</span>,
      },
      {
        title: 'Khách Hàng',
        dataIndex: ['customer', 'name'],
        key: 'name',
        width: 140,
        fixed: 'left' as const,
        render: (text: string, record: CustomerWeeklyProgress) => (
          <div>
            <div style={{ fontWeight: '600', color: token.colorText }}>{text}</div>
            <div style={{ fontSize: '11px', color: token.colorTextDescription }}>{record.customer.phone}</div>
          </div>
        ),
      },
      {
        title: 'Nhóm',
        dataIndex: ['customer', 'bucket'],
        key: 'bucket',
        width: 100,
        render: (bucket: BucketType) => {
          if (bucket === 'COMBO_LIVE')
            return (
              <Tag color="green" style={{ fontSize: '10px' }}>
                LIVE
              </Tag>
            );
          if (bucket === 'COMBO_DEAD')
            return (
              <Tag color="red" style={{ fontSize: '10px' }}>
                DEAD
              </Tag>
            );
          return (
            <Tag color="warning" style={{ fontSize: '10px' }}>
              SINGLE
            </Tag>
          );
        },
      },
      {
        title: 'Chưa tới tiệm (Ngày)',
        dataIndex: ['customer', 'daysSinceLastVisit'],
        key: 'daysSince',
        width: 180,
        render: (days: number | null, record: CustomerWeeklyProgress) => {
          const cust = record.customer;
          // 1. check callback date ("có hẹn gọi lại")
          const hasCallback = cust.callbackDate
            ? new Date(cust.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
            : false;
          if (hasCallback) {
            const callbackFormatted = dayjs(cust.callbackDate).format('DD/MM/YYYY');
            return (
              <span style={{ color: themeMode === 'dark' ? '#ffd666' : '#d4b106', fontWeight: 'bold' }}>
                🕒 Hẹn gọi lại: {callbackFormatted}
              </span>
            );
          }

          // 2. check future booking ("đã booked -> sẽ đến")
          const isBookingInFuture = cust.lastBookingDate ? new Date(cust.lastBookingDate) > new Date() : false;
          if (isBookingInFuture) {
            const state = cust.lastBookingState;
            const isBooked = state === 'New' || state === 'Confirmed';
            if (isBooked) {
              const bookingFormatted = dayjs(cust.lastBookingDate).format('DD/MM/YYYY');
              return (
                <span style={{ color: themeMode === 'dark' ? '#73d13d' : '#389e0d', fontWeight: 'bold' }}>
                  📅 Booked: {bookingFormatted}
                </span>
              );
            }
          }

          // 3. check missed booking ("đã booked mà chưa tới (missed)")
          const isBookingInPast = cust.lastBookingDate ? new Date(cust.lastBookingDate) < new Date() : false;
          if (isBookingInPast) {
            const state = cust.lastBookingState;
            const isMissed =
              state &&
              state !== 'Completed' &&
              state !== 'ServiceCompleted' &&
              state !== 'CheckIn' &&
              state !== 'CheckOut' &&
              state !== 'ServiceStart';
            if (isMissed) {
              let missedDays = days;
              if (cust.lastBookingDate) {
                const bookingDate = new Date(cust.lastBookingDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                bookingDate.setHours(0, 0, 0, 0);
                const diffMs = today.getTime() - bookingDate.getTime();
                missedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
              }
              return (
                <span style={{ color: themeMode === 'dark' ? '#ff7875' : '#cf1322', fontWeight: 'bold' }}>
                  ⚠️ Missed: {missedDays} ngày
                </span>
              );
            }
          }

          // 4. normal daysSinceLastVisit ("số dương -> chưa ghé x days, bình thường")
          return days !== null ? `${days} ngày` : <Text style={{ color: '#888' }}>Chưa từng đến</Text>;
        },
      },
      // Monday to Sunday dynamic columns
      ...weekDays.map((date, idx) => {
        const weekdayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        const headerText = `${weekdayNames[idx]} (${formatShortDate(date)})`;
        const isTodayColumn = isToday(date);

        return {
          title: (
            <span style={{ color: isTodayColumn ? '#D4A84B' : 'inherit' }}>
              {headerText} {isTodayColumn && <Badge status="processing" />}
            </span>
          ),
          key: `day_${idx}`,
          width: 100,
          align: 'center' as const,
          className: isTodayColumn ? 'bg-today-column' : '',
          render: (_: SafeAny, record: CustomerWeeklyProgress) => {
            const activity = record.dailyActivities[idx];

            if (!activity) return null;

            return (
              <Space direction="vertical" size={2}>
                {/* Checkin Badge */}
                {activity.hasCheckin && (
                  <Tooltip title={`Đã đến tiệm (Đơn #${activity.orderId})`}>
                    <Tag color="success" style={{ fontWeight: 'bold', margin: 0, padding: '0 8px' }}>
                      CK
                    </Tag>
                  </Tooltip>
                )}

                {/* Call Log representation */}
                {activity.hasCall ? (
                  <Tooltip
                    title={
                      <div>
                        <div>
                          <b>Kết quả:</b> {activity.callResult === 'ANSWERED' ? 'Có bắt máy' : 'Gọi nhỡ'}
                        </div>
                        {activity.callOutcome && (
                          <div>
                            <b>Chi tiết:</b> {activity.callOutcome}
                          </div>
                        )}
                        {activity.note && (
                          <div>
                            <b>Ghi chú:</b> {activity.note}
                          </div>
                        )}
                      </div>
                    }
                  >
                    <Button
                      type="text"
                      shape="circle"
                      icon={<PhoneOutlined />}
                      style={{
                        color: activity.callResult === 'ANSWERED' ? '#52C41A' : '#FF4D4F',
                        background: token.colorFillTertiary,
                      }}
                      onClick={() => openCallLog(record, date)}
                    />
                  </Tooltip>
                ) : (
                  // Quick Call Button for planned or today
                  isTodayColumn &&
                  !record.isConfirmed && (
                    <Button
                      type="dashed"
                      shape="circle"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => openCallLog(record, date)}
                      style={{ borderColor: '#444', color: '#888' }}
                    />
                  )
                )}
              </Space>
            );
          },
        };
      }),
      {
        title: 'Confirm',
        key: 'confirm',
        width: 80,
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: SafeAny, record: CustomerWeeklyProgress) => {
          if (!record.planId) return null;
          return (
            <Tooltip
              title={
                record.isConfirmed
                  ? `Đã chốt hẹn lúc ${new Date(record.confirmTime || '').toLocaleTimeString()}`
                  : 'Chốt lịch hẹn'
              }
            >
              <Checkbox
                checked={record.isConfirmed}
                onChange={(e) => handleConfirmToggle(record.planId!, e.target.checked)}
                className="custom-gold-checkbox"
              />
            </Tooltip>
          );
        },
      },
    ],
    [token, themeMode, weekDays, formatShortDate, isToday, openCallLog, handleConfirmToggle]
  );

  // Render suggestion lists
  const renderSuggestList = (dataList: SafeAny[], touchpointName: string, tipMsg: string) => {
    return (
      <div className="mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <Text strong style={{ color: token.colorPrimary }}>
            {touchpointName}
          </Text>
          <Text style={{ fontSize: '11px', color: token.colorTextDescription }}>{dataList.length} khách</Text>
        </div>
        <div className="mb-2" style={{ fontSize: '11px', color: token.colorTextDescription, fontStyle: 'italic' }}>
          {tipMsg}
        </div>
        <List
          size="small"
          dataSource={dataList}
          style={{
            background: token.colorBgLayout,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: '6px',
          }}
          renderItem={(cust: SafeAny) => (
            <List.Item
              actions={[
                <Button
                  key="add"
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => addToPlan(cust.id)}
                  style={{ color: token.colorPrimary }}
                />,
              ]}
            >
              <List.Item.Meta
                title={<span style={{ color: token.colorText, fontWeight: '500', fontSize: '13px' }}>{cust.name}</span>}
                description={
                  <div style={{ fontSize: '11px', color: token.colorTextDescription }}>
                    SĐT: {cust.phone} | Trễ:{' '}
                    {cust.daysSinceLastVisit !== null ? `${cust.daysSinceLastVisit} ngày` : 'Chưa ghé'}
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{
            emptyText: <span style={{ color: token.colorTextDescription, fontSize: '12px' }}>Không có gợi ý</span>,
          }}
        />
      </div>
    );
  };

  return (
    <div className="responsive-page responsive-workspace plans-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} style={{ color: token.colorPrimary, margin: 0 }}>
            Bảng Tiến Độ Cuộc Gọi Tuần
          </Title>
          <Text style={{ color: token.colorTextDescription }}>
            Theo dõi timeline checkin và lịch sử gọi điện trong tuần của Telesales
          </Text>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<BulbOutlined />}
            onClick={() => {
              setDrawerVisible(true);
              fetchSuggestions();
            }}
            style={{
              background: token.colorPrimary,
              borderColor: token.colorPrimary,
              color: '#000',
              fontWeight: '500',
            }}
          >
            Gợi ý cuộc gọi & Chiến dịch
          </Button>
        </Space>
      </div>

      <Card
        style={{
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          marginBottom: '24px',
        }}
      >
        <div className="flex justify-between items-center flex-wrap gap-4">
          <Space>
            <Button icon={<LeftOutlined />} onClick={handlePrevWeek} />
            <Text strong style={{ color: token.colorText, fontSize: '16px' }}>
              {getWeekRangeString()}
            </Text>
            <Button icon={<RightOutlined />} onClick={handleNextWeek} />
            <Button onClick={handleCurrentWeek}>Tuần Này</Button>
          </Space>

          <Space size="large">
            <Space>
              <Badge status="success" /> <Text style={{ color: token.colorTextDescription }}>Checkin (CK)</Text>
            </Space>
            <Space>
              <PhoneOutlined style={{ color: '#52C41A' }} />{' '}
              <Text style={{ color: token.colorTextDescription }}>Có bắt máy</Text>
            </Space>
            <Space>
              <PhoneOutlined style={{ color: '#FF4D4F' }} />{' '}
              <Text style={{ color: token.colorTextDescription }}>Gọi nhỡ</Text>
            </Space>
          </Space>
        </div>
      </Card>

      <DataTable
        dataSource={weeklyProgress}
        columns={columns}
        rowKey={(record) => record.customer.id.toString()}
        loading={loading}
        rowClassName={(record) => getRowClassName(record.customer)}
        pagination={false}
        scroll={{ x: 1000 }}
        style={{
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: '8px',
        }}
        className="antd-custom-table weekly-grid-table"
        stickyPrimaryColumn
      />

      {/* SUGGESTIONS DRAWER */}
      <Drawer
        title={
          <span style={{ color: token.colorPrimary, fontSize: '16px', fontWeight: 'bold' }}>
            Gợi Ý Khách Hàng Cần Gọi
          </span>
        }
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={400}
        styles={{
          body: { background: token.colorBgContainer, padding: '20px' },
          header: { background: token.colorBgLayout, borderBottom: `1px solid ${token.colorBorderSecondary}` },
        }}
      >
        {suggestsLoading ? (
          <div className="text-center py-8" style={{ color: token.colorTextDescription }}>
            Đang quét danh sách gợi ý...
          </div>
        ) : (
          <div>
            <Tabs
              defaultActiveKey="1"
              type="card"
              items={[
                {
                  key: '1',
                  label: 'Điểm Chạm',
                  children: (
                    <div>
                      {renderSuggestList(
                        suggests.happyCall,
                        '📞 Happy Call 24h',
                        'Khách vừa ghé tiệm ngày hôm qua. Gọi hỏi thăm mức độ hài lòng.'
                      )}
                      {renderSuggestList(
                        suggests.single21d,
                        '⏳ Single 21d (Cận Dặm Lẻ)',
                        'Khách lẻ ghé tiệm 19-21 ngày trước. Nhắc hẹn để được tính giá dặm (tiết kiệm 57-64%).'
                      )}
                      {renderSuggestList(
                        suggests.combo25d,
                        '💎 Combo 25d (Cận Dặm Gói)',
                        'Khách combo ghé tiệm 23-25 ngày trước. Nhắc hẹn để được trừ dặm combo (hạn chót 25 ngày).'
                      )}
                      {renderSuggestList(
                        suggests.singleLost,
                        '❌ Single 22d+ (Trễ Hạn Dặm)',
                        'Khách lẻ trễ hẹn dặm > 21 ngày. Cần gọi thuyết phục quay lại nối mới.'
                      )}
                    </div>
                  ),
                },
                {
                  key: '2',
                  label: 'Chiến Dịch',
                  children: (
                    <div>
                      {renderSuggestList(
                        suggests.campaignComboT7,
                        '🎯 Chiến dịch Combo T7',
                        'Tải từ Google Sheet [V2]COMBO T7. Các khách hàng ưu tiên chăm sóc.'
                      )}
                      {renderSuggestList(
                        suggests.campaignPromo2,
                        '🔥 Chiến dịch Promo NLC',
                        'Tải từ Google Sheet NLC.PROMO 2. Khách hàng theo dõi khuyến mãi.'
                      )}
                    </div>
                  ),
                },
                {
                  key: '3',
                  label: 'Khách Của Tôi',
                  children: (
                    <div>
                      {renderSuggestList(
                        suggests.myCustomers || [],
                        '👤 Khách hàng phụ trách',
                        'Danh sách khách hàng được phân bổ cho riêng bạn chưa lập lịch gọi tuần này.'
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>

      <style jsx global>{`
        /* Highlight today's column */
        .weekly-grid-table .bg-today-column {
          background: rgba(212, 168, 75, 0.04) !important;
          border-left: 1px dashed rgba(212, 168, 75, 0.2) !important;
          border-right: 1px dashed rgba(212, 168, 75, 0.2) !important;
        }

        /* Gold checkbox styling */
        .custom-gold-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #d4a84b !important;
          border-color: #d4a84b !important;
        }
        .custom-gold-checkbox .ant-checkbox-checked::after {
          border-color: #d4a84b !important;
        }
        .dark-theme .custom-gold-checkbox .ant-checkbox-inner {
          background-color: #1f1f1f;
          border-color: #444;
        }
        .light-theme .custom-gold-checkbox .ant-checkbox-inner {
          background-color: #ffffff;
          border-color: #d9d9d9;
        }
        .custom-gold-checkbox .ant-checkbox-wrapper:hover .ant-checkbox-inner {
          border-color: #d4a84b !important;
        }

        /* Custom tabs inside drawer */
        .dark-theme .ant-drawer .ant-tabs-card .ant-tabs-tab {
          background: #1c1c1c !important;
          border-color: #2c2c2c !important;
          color: #888 !important;
        }
        .light-theme .ant-drawer .ant-tabs-card .ant-tabs-tab {
          background: #f5f5f5 !important;
          border-color: #e8e8e8 !important;
          color: #555 !important;
        }
        .ant-drawer .ant-tabs-card .ant-tabs-tab-active {
          background: #d4a84b !important;
          color: #000 !important;
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
      `}</style>
    </div>
  );
}

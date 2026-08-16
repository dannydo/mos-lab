'use client';

import { TableIndexHeader } from '~/components/ui';

import React from 'react';
import { Space, Avatar, Typography, Tag, Tooltip, Button } from 'antd';
import { UserOutlined, PhoneOutlined, CheckCircleOutlined, MessageOutlined } from '@ant-design/icons';
import { CalendarPlus } from 'lucide-react';
import dayjs from 'dayjs';
import { Customer, TouchpointStatus, CALL_RESULT_LABELS } from '@mos-lab/shared';
import { LocaTouchpointCell } from './LocaTouchpointCell';

import { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

interface LocaColumnsOptions {
  themeMode: 'light' | 'dark';
  token: SafeAny;
  handleOpenDetailModal: (record: Customer) => void;
  formatVND: (value: number) => string;
  formatDuration: (secs: number) => string;
  dailyPlanList: number[];
  handleAddToPlan: (id: number) => void;
  makeCall: (
    phone: string,
    name?: string,
    customerId?: number,
    avatar?: string,
    planId?: number
  ) => Promise<void> | void;
  handleOpenSmsModal?: (record: Customer) => void;
  handleOpenBookingWizard?: (customer: Customer) => void;
  handleToggleTouchpoint?: (
    customerId: number,
    touchpointKey: string,
    isChecked: boolean,
    note?: string,
    status?: TouchpointStatus | null,
    hasReferredDiamond?: boolean,
    callbackDate?: string
  ) => Promise<void>;
  touchpointConfigs?: Array<{
    key: string;
    label: string;
    daysMin: number;
    daysMax: number;
    color?: string;
  }>;
  addingIds?: number[];
  sortField?: string;
  currentPage?: number;
  pageSize?: number;
}

export const getLocaColumns = ({
  themeMode,
  token,
  handleOpenDetailModal,
  formatVND,
  formatDuration,
  dailyPlanList,
  handleAddToPlan,
  makeCall,
  handleOpenSmsModal,
  handleOpenBookingWizard,
  handleToggleTouchpoint,
  touchpointConfigs = [],
  addingIds = [],
  sortField = 'daysSinceLastVisit_asc',
  currentPage = 1,
  pageSize = 20,
}: LocaColumnsOptions): ColumnsType<Customer> => {
  // Filter touchpoint configs from 24h to 30 days
  const baseConfigs =
    touchpointConfigs && touchpointConfigs.length > 0
      ? touchpointConfigs.filter((tp) => tp.key === 'now' || tp.daysMin <= 30)
      : [
          { key: 'now', label: 'Chạm 24h', daysMin: 1, daysMax: 1 },
          { key: '17', label: 'Chạm 17', daysMin: 17, daysMax: 17 },
          { key: '19', label: 'Chạm 19', daysMin: 19, daysMax: 19 },
          { key: '21', label: 'Chạm 20', daysMin: 20, daysMax: 20 },
          { key: '23', label: 'Chạm 23', daysMin: 23, daysMax: 23 },
          { key: '25', label: 'Chạm 25', daysMin: 25, daysMax: 25 },
          { key: '30', label: 'Chạm 30', daysMin: 30, daysMax: 30 },
        ];

  const has30Plus = baseConfigs.some((tp) => tp.key === '30plus');
  const activeTouchpoints = has30Plus
    ? baseConfigs
    : [...baseConfigs, { key: '30plus', label: '30+', daysMin: 31, daysMax: 999 }];

  const touchpointChildren = activeTouchpoints.map((tp) => {
    const displayLabel = tp.label || (tp.key === 'now' ? 'Chạm 24h' : tp.key === '30plus' ? '30+' : `Chạm ${tp.key}`);
    const headerText = displayLabel.replace(/^Chạm\s*/i, '');
    const tooltipText = `${displayLabel}: Mốc ${
      tp.key === 'now' ? '24 giờ' : tp.key === '30plus' ? 'trên 30 ngày' : `${tp.daysMin} ngày`
    } sau khi làm mi`;

    return {
      title: (
        <Tooltip title={tooltipText}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: themeMode === 'dark' ? '#fbbf24' : '#d97706',
              whiteSpace: 'nowrap',
              padding: '0 1px',
            }}
          >
            {headerText}
          </div>
        </Tooltip>
      ),
      key: `tp_${tp.key}`,
      width: 46,
      align: 'center' as const,
      render: (_: SafeAny, record: Customer) => (
        <LocaTouchpointCell
          customer={record}
          touchpointKey={tp.key}
          label={displayLabel}
          targetDays={tp.daysMin}
          themeMode={themeMode}
          onToggle={handleToggleTouchpoint || (async () => {})}
          onOpenBooking={handleOpenBookingWizard}
        />
      ),
    };
  });
  return [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 55,
      align: 'center' as const,
      fixed: 'left' as const,
      render: (_: SafeAny, __: Customer, index: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
          {(currentPage - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: 'Mã KH',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      fixed: 'left' as const,
      sorter: true,
      sortOrder: sortField === 'id_asc' ? ('ascend' as const) : sortField === 'id_desc' ? ('descend' as const) : null,
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'name',
      key: 'name',
      width: 170,
      fixed: 'left' as const,
      sorter: true,
      sortOrder:
        sortField === 'name_asc' ? ('ascend' as const) : sortField === 'name_desc' ? ('descend' as const) : null,
      render: (text: string, record: Customer) => (
        <Space
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => handleOpenDetailModal(record)}
        >
          <Avatar
            src={record.avatar || undefined}
            icon={<UserOutlined />}
            style={{
              backgroundColor: 'var(--avatar-bg)',
              color: '#D4A84B',
              border: '1px solid var(--avatar-border)',
              flexShrink: 0,
            }}
          />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                style={{ fontWeight: '600', color: 'var(--client-name-color)' }}
                className="hover:underline transition-all"
              >
                {text}
              </span>
            </div>
            {record.phone && (
              <div
                style={{ fontSize: '12px', color: themeMode === 'dark' ? '#fbbf24' : '#d97706', fontWeight: '600' }}
                className="hover:underline cursor-pointer flex items-center gap-1 mt-0.5"
                role="button"
                tabIndex={0}
                aria-label={`Gọi điện thoại cho ${record.name || 'khách hàng'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  makeCall(record.phone, record.name, record.id, record.avatar || undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    makeCall(record.phone, record.name, record.id, record.avatar || undefined);
                  }
                }}
              >
                <PhoneOutlined style={{ fontSize: '10px' }} />
                <span>{record.phone}</span>
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Số Dư Combo',
      key: 'comboBalance',
      width: 130,
      fixed: 'left' as const,
      render: (_: SafeAny, record: Customer) => {
        if (!record.comboBalance) return <Text type="secondary">Không có</Text>;
        const totalRemaining = (record.comboBalance.normalCount || 0) + (record.comboBalance.retainCount || 0);
        return (
          <div>
            <Tag color={totalRemaining === 1 ? 'red' : 'green'} style={{ fontWeight: 'bold' }}>
              Còn {totalRemaining} lần
            </Tag>
            <div style={{ fontSize: '11px', color: 'var(--client-desc-color)', marginTop: '2px' }}>
              (Mới: {record.comboBalance.normalCount || 0} | Dặm: {record.comboBalance.retainCount || 0})
            </div>
          </div>
        );
      },
    },
    {
      title: 'HSD',
      key: 'expiryDate',
      width: 130,
      render: (_: SafeAny, record: Customer) => {
        if (!record.comboBalance?.expiryDate) return <Text type="secondary">-</Text>;
        const expDate = dayjs(record.comboBalance.expiryDate);
        const daysLeft = expDate.diff(dayjs(), 'day');
        const isExpiringSoon = daysLeft <= 30;

        return (
          <div>
            <div style={{ fontWeight: '600', color: isExpiringSoon ? '#ff4d4f' : token.colorText }}>
              {expDate.format('DD/MM/YYYY')}
            </div>
            <div style={{ fontSize: '11px', color: isExpiringSoon ? '#ff4d4f' : 'var(--client-desc-color)' }}>
              {daysLeft > 0 ? `Còn ${daysLeft} ngày` : 'Đã hết hạn'}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Đã Ghé',
      dataIndex: 'daysSinceLastVisit',
      key: 'daysSinceLastVisit',
      width: 160,
      sorter: true,
      sortOrder:
        sortField === 'daysSinceLastVisit_asc'
          ? ('ascend' as const)
          : sortField === 'daysSinceLastVisit_desc'
            ? ('descend' as const)
            : null,
      render: (days: number | null, record: Customer) => {
        const hasCallback = record.callbackDate
          ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
          : false;
        if (hasCallback) {
          const callbackFormatted = dayjs(record.callbackDate).format('DD/MM/YYYY');
          return (
            <span style={{ color: themeMode === 'dark' ? '#ffd666' : '#855b00', fontWeight: 'bold' }}>
              🕒 Hẹn gọi lại: {callbackFormatted}
            </span>
          );
        }

        const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
        if (isBookingInFuture) {
          const state = record.lastBookingState;
          const isBooked = state === 'New' || state === 'Confirmed';
          if (isBooked) {
            const bookingFormatted = dayjs(record.lastBookingDate).format('DD/MM/YYYY');
            return (
              <span style={{ color: themeMode === 'dark' ? '#95de64' : '#237804', fontWeight: 'bold' }}>
                📅 Booked: {bookingFormatted}
              </span>
            );
          }
        }

        return days !== null ? (
          `${days} ngày`
        ) : (
          <Text style={{ color: 'var(--client-desc-color)' }}>Chưa từng đến</Text>
        );
      },
    },
    {
      key: 'touchpointGroup',
      title: (
        <div
          style={{
            textAlign: 'center',
            fontWeight: 'bold',
            color: themeMode === 'dark' ? '#fbbf24' : '#d97706',
            fontSize: '13px',
            background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.12)' : 'rgba(212, 168, 75, 0.08)',
            padding: '2px 8px',
            borderRadius: '4px',
          }}
        >
          ✨ Tiến Trình Chạm CSKH
        </div>
      ),
      children: touchpointChildren,
    },

    {
      title: '∑ Chi Tiêu',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      width: 130,
      sorter: true,
      sortOrder:
        sortField === 'totalSpent_asc'
          ? ('ascend' as const)
          : sortField === 'totalSpent_desc'
            ? ('descend' as const)
            : null,
      render: (val: number) => (
        <span className="tabular-nums font-semibold" style={{ whiteSpace: 'nowrap' }}>
          {formatVND(val)}
        </span>
      ),
    },
    {
      title: 'Đã phân bổ',
      key: 'allocatedDays',
      width: 120,
      render: (_: SafeAny, record: Customer) => {
        const assignedAt = record.assignedStaff?.assignedAt || record.assignedAt || record.lastAllocation?.assignedAt;
        if (!assignedAt) {
          return (
            <span style={{ fontStyle: 'italic', color: 'var(--client-desc-color)', whiteSpace: 'nowrap' }}>
              Chưa từng phân bổ
            </span>
          );
        }
        const assignedDate = dayjs(assignedAt);
        const today = dayjs();
        const diffDays = Math.max(0, today.diff(assignedDate, 'day'));
        const formattedDate = assignedDate.format('DD/MM/YYYY HH:mm');
        const isCurrentlyAssigned = !!record.assignedStaff;
        const staffName = record.assignedStaff?.displayName || record.lastAllocation?.staffName;
        const tooltipTitle = isCurrentlyAssigned
          ? `Đang phân bổ cho: ${staffName || 'Booker'} (từ ${formattedDate})`
          : `Lần cuối phân bổ: ${formattedDate}${staffName ? ` (Booker trước: ${staffName})` : ''}`;
        return (
          <Tooltip title={tooltipTitle}>
            <span
              className="tabular-nums font-semibold"
              style={{
                opacity: isCurrentlyAssigned ? 1 : 0.7,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {diffDays} ngày
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'BK Assigned',
      dataIndex: 'assignedStaff',
      key: 'assignedStaff',
      width: 140,
      render: (staff: SafeAny) =>
        staff ? (
          <Tag color="cyan" style={{ whiteSpace: 'nowrap' }}>
            {staff.displayName}
          </Tag>
        ) : (
          <span style={{ fontStyle: 'italic', color: 'var(--client-desc-color)', whiteSpace: 'nowrap' }}>
            Chưa phân bổ
          </span>
        ),
    },
    {
      title: 'Last Called',
      key: 'lastCallDate',
      width: 140,
      render: (_: SafeAny, record: Customer) => {
        if (!record.lastCall?.createdAt) return '-';
        return (
          <span style={{ whiteSpace: 'nowrap' }}>{dayjs(record.lastCall.createdAt).format('DD/MM/YYYY HH:mm')}</span>
        );
      },
    },
    {
      title: 'Duration',
      key: 'lastCallDuration',
      width: 95,
      render: (_: SafeAny, record: Customer) => {
        if (record.lastCall?.durationSec === undefined || record.lastCall?.durationSec === null) return '-';
        return <span style={{ whiteSpace: 'nowrap' }}>{formatDuration(record.lastCall.durationSec)}</span>;
      },
    },
    {
      title: 'Call Status',
      key: 'lastCallResult',
      width: 130,
      render: (_: SafeAny, record: Customer) => {
        if (!record.lastCall?.callResult) return '-';
        const result = record.lastCall.callResult;
        const rawLabel = CALL_RESULT_LABELS[result as keyof typeof CALL_RESULT_LABELS] || result;
        const cleanLabel = rawLabel.includes('|') ? rawLabel.split('|')[0].trim() : rawLabel;
        const displayLabel = cleanLabel.length > 14 ? `${cleanLabel.substring(0, 14)}...` : cleanLabel;

        let color = 'default';
        if (result === 'ANSWERED' || cleanLabel.includes('Thành công')) color = 'success';
        else if (result === 'NO_ANSWER' || cleanLabel.includes('Không nghe máy') || cleanLabel.includes('Lỡ'))
          color = 'error';
        else if (result === 'BUSY' || cleanLabel.includes('Máy bận')) color = 'warning';
        else if (result === 'FAILED' || result === 'WRONG_NUMBER') color = 'error';

        return (
          <Tooltip title={rawLabel}>
            <Tag
              color={color}
              style={{
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginRight: 0,
              }}
            >
              {displayLabel}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Call Notes',
      key: 'lastCallNote',
      width: 150,
      render: (_: SafeAny, record: Customer) => {
        if (!record.lastCall?.note) return '-';
        const note = record.lastCall.note;
        const compactNote = note.length > 20 ? `${note.substring(0, 20)}...` : note;
        return (
          <Tooltip title={note}>
            <div
              style={{
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {compactNote}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Action',
      key: 'actions',
      width: 104,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: SafeAny, record: Customer) => {
        const isPlanned = dailyPlanList.includes(record.id);
        const isAdding = addingIds.includes(record.id);
        return (
          <Space size={4} align="center" style={{ justifyContent: 'center' }}>
            <Tooltip title={isPlanned ? 'Đã lên lịch gọi' : 'Lên lịch gọi vào KH ngày'}>
              <Button
                type="text"
                aria-label={isPlanned ? 'Đã lên lịch gọi' : 'Thêm vào kế hoạch gọi'}
                loading={isAdding}
                icon={
                  isPlanned ? (
                    <CheckCircleOutlined style={{ color: '#34D399', fontSize: 16 }} />
                  ) : (
                    <CalendarPlus size={16} strokeWidth={2.4} color="#D4A84B" />
                  )
                }
                onClick={() => !isPlanned && !isAdding && handleAddToPlan(record.id)}
                style={
                  isPlanned
                    ? {
                        width: 30,
                        height: 30,
                        minWidth: 30,
                        padding: 0,
                        border: '1px solid rgba(52, 211, 153, 0.45)',
                        background: 'rgba(52, 211, 153, 0.12)',
                      }
                    : {
                        width: 30,
                        height: 30,
                        minWidth: 30,
                        padding: 0,
                        border: '1px solid #D4A84B',
                        background: 'rgba(212, 168, 75, 0.12)',
                      }
                }
                disabled={isPlanned || isAdding}
              />
            </Tooltip>
            <Tooltip title="Gửi tin nhắn SMS">
              <Button
                type="text"
                aria-label="Gửi tin nhắn SMS"
                icon={<MessageOutlined style={{ color: '#D4A84B', fontSize: 16 }} />}
                onClick={() => handleOpenSmsModal?.(record)}
                style={{
                  width: 30,
                  height: 30,
                  minWidth: 30,
                  padding: 0,
                  border: '1px solid #D4A84B',
                  background: 'rgba(212, 168, 75, 0.12)',
                }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];
};

export const getNewLocaColumns = ({
  themeMode,
  token,
  handleOpenDetailModal,
  formatVND,
  dailyPlanList,
  handleAddToPlan,
  makeCall,
  handleOpenSmsModal,
  addingIds = [],
  sortField = 'id_desc',
  currentPage = 1,
  pageSize = 20,
}: LocaColumnsOptions): ColumnsType<Customer> => {
  return [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 60,
      align: 'center' as const,
      render: (_: SafeAny, __: Customer, index: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
          {(currentPage - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: 'Mã KH',
      dataIndex: 'id',
      key: 'id',
      width: 85,
      sorter: true,
      sortOrder: sortField === 'id_asc' ? ('ascend' as const) : sortField === 'id_desc' ? ('descend' as const) : null,
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'name',
      key: 'name',
      width: 170,
      sorter: true,
      sortOrder:
        sortField === 'name_asc' ? ('ascend' as const) : sortField === 'name_desc' ? ('descend' as const) : null,
      render: (text: string, record: Customer) => (
        <Space
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => handleOpenDetailModal(record)}
        >
          <Avatar
            src={record.avatar || undefined}
            icon={<UserOutlined />}
            style={{
              backgroundColor: 'var(--avatar-bg)',
              color: '#D4A84B',
              border: '1px solid var(--avatar-border)',
              flexShrink: 0,
            }}
          />
          <div>
            <div
              style={{ fontWeight: '600', color: 'var(--client-name-color)' }}
              className="hover:underline transition-all"
            >
              {text}
            </div>
            {record.phone && (
              <div
                style={{ fontSize: '12px', color: '#D4A84B', fontWeight: '500' }}
                className="hover:underline cursor-pointer flex items-center gap-1 mt-0.5"
                role="button"
                tabIndex={0}
                aria-label={`Gọi điện thoại cho ${record.name || 'khách hàng'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  makeCall(record.phone, record.name, record.id, record.avatar || undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    makeCall(record.phone, record.name, record.id, record.avatar || undefined);
                  }
                }}
              >
                <PhoneOutlined style={{ fontSize: '10px' }} />
                <span>{record.phone}</span>
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Combo Mới & Doanh Thu',
      key: 'comboDetails',
      align: 'right',
      width: 170,
      render: (_: SafeAny, record: Customer) => {
        const details = record.newComboDetails;
        if (!details) return <Text type="secondary">Không có thông tin</Text>;
        return (
          <div>
            <div style={{ fontWeight: '600', color: token.colorText }}>{details.comboName || 'Combo Mới Mua'}</div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#D4A84B',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
              }}
            >
              {formatVND(details.comboPrice || 0)}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Booker (BK)',
      key: 'booker',
      width: 130,
      render: (_: SafeAny, record: Customer) => {
        const booker = record.newComboDetails?.bookerName || record.assignedStaff?.displayName;
        return booker ? (
          <Tag color="cyan">{booker}</Tag>
        ) : (
          <span style={{ fontStyle: 'italic', color: 'var(--client-desc-color)' }}>System</span>
        );
      },
    },
    {
      title: 'CC In / CC Out',
      key: 'ccInOut',
      width: 140,
      render: (_: SafeAny, record: Customer) => {
        const details = record.newComboDetails;
        return (
          <div style={{ fontSize: '12px' }}>
            <div>
              <span style={{ opacity: 0.7 }}>In: </span>
              <Tag color="blue" style={{ margin: 0 }}>
                {details?.ccInName || 'Chưa nhận'}
              </Tag>
            </div>
            <div style={{ marginTop: '3px' }}>
              <span style={{ opacity: 0.7 }}>Out: </span>
              <Tag color="purple" style={{ margin: 0 }}>
                {details?.ccOutName || 'Chưa nhận'}
              </Tag>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Chuyên Viên (CV)',
      key: 'cv',
      width: 130,
      render: (_: SafeAny, record: Customer) => {
        const cv = record.newComboDetails?.cvName;
        return cv && cv !== 'Chưa phân công' ? (
          <Tag color="gold">{cv}</Tag>
        ) : (
          <span style={{ fontStyle: 'italic', color: 'var(--client-desc-color)' }}>Chưa phân công</span>
        );
      },
    },
    {
      title: 'Ngày Mua',
      key: 'purchaseDate',
      width: 140,
      render: (_: SafeAny, record: Customer) => {
        const date = record.newComboDetails?.purchaseDate;
        return date ? (
          <span style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"', whiteSpace: 'nowrap' }}>
            {dayjs(date).format('DD/MM/YYYY HH:mm')}
          </span>
        ) : (
          '-'
        );
      },
    },
    {
      title: 'Action',
      key: 'actions',
      width: 104,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: SafeAny, record: Customer) => {
        const isPlanned = dailyPlanList.includes(record.id);
        const isAdding = addingIds.includes(record.id);
        return (
          <Space size={4} align="center" style={{ justifyContent: 'center' }}>
            <Tooltip title={isPlanned ? 'Đã lên lịch gọi' : 'Lên lịch gọi vào KH ngày'}>
              <Button
                type="text"
                aria-label={isPlanned ? 'Đã lên lịch gọi' : 'Thêm vào kế hoạch gọi'}
                loading={isAdding}
                icon={
                  isPlanned ? (
                    <CheckCircleOutlined style={{ color: '#34D399', fontSize: 16 }} />
                  ) : (
                    <CalendarPlus size={16} strokeWidth={2.4} color="#D4A84B" />
                  )
                }
                onClick={() => !isPlanned && !isAdding && handleAddToPlan(record.id)}
                style={
                  isPlanned
                    ? {
                        width: 30,
                        height: 30,
                        minWidth: 30,
                        padding: 0,
                        border: '1px solid rgba(52, 211, 153, 0.45)',
                        background: 'rgba(52, 211, 153, 0.12)',
                      }
                    : {
                        width: 30,
                        height: 30,
                        minWidth: 30,
                        padding: 0,
                        border: '1px solid #D4A84B',
                        background: 'rgba(212, 168, 75, 0.12)',
                      }
                }
                disabled={isPlanned || isAdding}
              />
            </Tooltip>
            <Tooltip title="Gửi tin nhắn SMS">
              <Button
                type="text"
                aria-label="Gửi tin nhắn SMS"
                icon={<MessageOutlined style={{ color: '#D4A84B', fontSize: 16 }} />}
                onClick={() => handleOpenSmsModal?.(record)}
                style={{
                  width: 30,
                  height: 30,
                  minWidth: 30,
                  padding: 0,
                  border: '1px solid #D4A84B',
                  background: 'rgba(212, 168, 75, 0.12)',
                }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];
};

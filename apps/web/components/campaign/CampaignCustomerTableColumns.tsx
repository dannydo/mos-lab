'use client';

import React from 'react';
import { Avatar, Button, Popconfirm, Space, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { GlobalToken } from 'antd/es/theme/interface';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  HistoryOutlined,
  LockOutlined,
  MessageOutlined,
  PhoneOutlined,
  SettingOutlined,
  UnlockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CALL_RESULT_LABELS } from '@mos-lab/shared';
import { CopyPhoneButton, TableIndexHeader } from '~/components/ui';
import CalendarPlusIcon from '~/components/icons/CalendarPlusIcon';
import { CampaignTouchpointCell } from '~/components/campaign/CampaignTouchpointCell';
import { getIconComponent } from '~/components/campaign/TouchpointIconPicker';
import { CampaignClaimCountdown } from '~/components/campaign/CampaignClaimCountdown';
import { formatDuration, formatVND } from '~/lib/format-utils';

export interface UseCampaignCustomerColumnsOptions {
  currentPage: number;
  pageSize: number;
  themeMode: 'light' | 'dark';
  token: GlobalToken;
  displayTouchpoints: any[];
  campaign: { operationMode?: string; [key: string]: any } | null;
  isAdmin: boolean;
  actionLoadingId: number | null;
  onSelectCustomer: (customer: any) => void;
  onOpenCustomerDetail: (customer: any) => void;
  onMakeCall: (phone: string) => void;
  onToggleTouchpoint: (customer: any, touchpoint: any, active: boolean) => Promise<void>;
  onOpenBooking: (customer: any) => void;
  onOpenSMS: (customer: any) => void;
  onClaimCustomer: (customer: any) => void;
  onCallClaimedCustomer: (customer: any) => void;
  onReleaseCustomer: (customer: any) => void;
  onOpenAuditLogs: (customer: any) => void;
  onManagerCustomerAction: (customer: any, action: any) => void;
  onRemoveCustomer: (customerId: number, customerName: string) => void;
  onClaimExpiredLocally: (customer: any) => void;
}

export function useCampaignCustomerColumns(options: UseCampaignCustomerColumnsOptions): ColumnsType<any> {
  const {
    currentPage,
    pageSize,
    themeMode,
    token,
    displayTouchpoints,
    campaign,
    isAdmin,
    actionLoadingId,
    onSelectCustomer,
    onOpenCustomerDetail,
    onMakeCall,
    onToggleTouchpoint,
    onOpenBooking,
    onOpenSMS,
    onClaimCustomer,
    onCallClaimedCustomer,
    onReleaseCustomer,
    onOpenAuditLogs,
    onManagerCustomerAction,
    onRemoveCustomer,
    onClaimExpiredLocally,
  } = options;

  const isSharedPool = campaign?.operationMode === 'SHARED_POOL';

  const columns: ColumnsType<any> = [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 45,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="tabular-nums font-mono text-[11px] text-gray-500 font-medium">
          {(currentPage - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 160,
      render: (_: any, record: any) => {
        const name = record.customerName || record.name || 'Khách hàng';
        const phone = record.customerPhone || record.phone || record.phones?.[0]?.phone_number;
        return (
          <Space
            size={6}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => {
              onSelectCustomer(record);
              onOpenCustomerDetail(record);
            }}
          >
            <Avatar
              size={24}
              src={record.avatar || undefined}
              icon={<UserOutlined style={{ fontSize: '12px' }} />}
              style={{
                backgroundColor: token.colorBgContainer,
                color: token.colorPrimary,
                border: `1px solid ${token.colorBorderSecondary}`,
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: themeMode === 'dark' ? '#f3f4f6' : '#111827',
                  lineHeight: '1.2',
                }}
                className="hover:underline transition-all"
              >
                {name}
              </div>
              {phone && (
                <div className="flex items-center gap-1 mt-0.5">
                  <div
                    style={{ fontSize: '11px', color: '#D4A84B', fontWeight: '500', lineHeight: '1.2' }}
                    className="hover:underline cursor-pointer flex items-center gap-1 tabular-nums font-mono"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMakeCall(phone);
                    }}
                  >
                    <PhoneOutlined style={{ fontSize: '9px' }} />
                    <span>{phone}</span>
                  </div>
                  <CopyPhoneButton phone={phone} size="xs" />
                </div>
              )}
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Chưa tới tiệm (Ngày)',
      dataIndex: 'daysSinceLastVisit',
      key: 'daysSinceLastVisit',
      width: 130,
      render: (_: any, record: any) => {
        const days = record.daysSinceLastVisit;
        const daysDisplay =
          days !== null && days !== undefined ? (
            <span className="tabular-nums font-semibold text-xs">{days} ngày</span>
          ) : (
            <span className="text-gray-400 italic text-xs">Chưa tới</span>
          );

        const hasCallback = record.callbackDate
          ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
          : false;
        if (hasCallback) {
          const callbackFormatted = dayjs(record.callbackDate).format('DD/MM/YYYY');
          return (
            <div className="flex flex-col">
              {daysDisplay}
              <span
                style={{ color: themeMode === 'dark' ? '#ffd666' : '#855b00', fontWeight: 'bold', fontSize: '11px' }}
              >
                🕒 Hẹn gọi: {callbackFormatted}
              </span>
            </div>
          );
        }

        const lastBookingDate = record.lastBookingDate || record.bookingDate;
        const lastBookingState = record.lastBookingState || record.bookingState;

        const isBookingInFuture = lastBookingDate ? new Date(lastBookingDate) > new Date() : false;
        if (isBookingInFuture) {
          const isBooked = lastBookingState === 'New' || lastBookingState === 'Confirmed';
          if (isBooked) {
            const bookingFormatted = dayjs(lastBookingDate).format('DD/MM/YYYY');
            return (
              <div className="flex flex-col">
                {daysDisplay}
                <span
                  style={{ color: themeMode === 'dark' ? '#95de64' : '#237804', fontWeight: 'bold', fontSize: '11px' }}
                >
                  📅 Booked: {bookingFormatted}
                </span>
              </div>
            );
          }
        }

        const isBookingInPast = lastBookingDate ? new Date(lastBookingDate) < new Date() : false;
        if (isBookingInPast) {
          const isMissed =
            lastBookingState &&
            lastBookingState !== 'Completed' &&
            lastBookingState !== 'ServiceCompleted' &&
            lastBookingState !== 'CheckIn' &&
            lastBookingState !== 'CheckOut' &&
            lastBookingState !== 'ServiceStart';
          if (isMissed) {
            let missedDays = record.daysSinceLastVisit ?? 0;
            if (lastBookingDate) {
              const bookingDate = new Date(lastBookingDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              bookingDate.setHours(0, 0, 0, 0);
              const diffMs = today.getTime() - bookingDate.getTime();
              missedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            }
            return (
              <div className="flex flex-col">
                {daysDisplay}
                <span
                  style={{ color: themeMode === 'dark' ? '#ff7875' : '#cf1322', fontWeight: 'bold', fontSize: '11px' }}
                >
                  ⚠️ Missed: {missedDays}n
                </span>
              </div>
            );
          }
        }

        return daysDisplay;
      },
    },
    {
      title: '∑ Chi Tiêu',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      align: 'right',
      width: 110,
      render: (val: number, record: any) => {
        const spent = val ?? record.totalSpent ?? 0;
        return <span className="tabular-nums font-medium text-xs">{formatVND(spent)}</span>;
      },
    },
    {
      title: 'Booker phụ trách',
      key: 'booker',
      width: 120,
      render: (_: any, record: any) => {
        const bookerName =
          record.assignedBookerName || record.assignedBooker?.name || record.assignedStaff?.displayName;
        return bookerName ? (
          <Tag color="cyan" className="font-semibold text-[11px] px-1.5 py-0 m-0">
            {bookerName}
          </Tag>
        ) : (
          <span className="text-gray-400 italic text-xs">Chưa phân bổ</span>
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
            fontSize: '12px',
            background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.12)' : 'rgba(212, 168, 75, 0.08)',
            padding: '1px 6px',
            borderRadius: '4px',
          }}
        >
          ✨ Tiến Trình Chạm CSKH
        </div>
      ),
      children: displayTouchpoints.map((tp, tpIndex) => {
        const rawLabel = (tp.label || tp.key).replace(/^Chạm\s*/i, '').replace(/^Chăm sóc\s*/i, '');
        let displayLabel = rawLabel.replace(/n$/i, '');
        if (tp.key === '24h' || rawLabel === '24h') displayLabel = '24h';
        else if (tp.key === '30plus' || rawLabel === '30+' || rawLabel === '30n+') displayLabel = '30+';

        const labelStr = tp.label || `Chạm ${displayLabel}`;
        const daysStr =
          tp.daysMin !== undefined && tp.daysMin !== null
            ? ` (Ngày ${tp.daysMin}${tp.daysMax !== null && tp.daysMax !== undefined ? (tp.daysMax === tp.daysMin ? '' : `-${tp.daysMax}`) : '+'})`
            : '';
        const fullTooltipText = `${labelStr}${daysStr}`;

        const rawSortOrder = (tp as any).sortOrder;
        const idx = typeof rawSortOrder === 'number' ? rawSortOrder - 1 : tpIndex;
        const iconKey =
          tp.icon ||
          (idx === 0
            ? 'Smile'
            : idx === 1
              ? 'Handshake'
              : idx === 2
                ? 'Kiss'
                : idx === 3
                  ? 'Heart'
                  : idx === 4
                    ? 'BedDouble'
                    : tp.key);
        const headerIconNode = getIconComponent(iconKey);

        return {
          title: (
            <Tooltip title={fullTooltipText}>
              <div
                data-ui="campaign-touchpoint-header"
                data-touchpoint-icon={iconKey}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: themeMode === 'dark' ? '#cbd5e1' : '#475569',
                }}
              >
                {headerIconNode}
              </div>
            </Tooltip>
          ),
          key: `tp_${tp.key || tp.id}`,
          width: 44,
          align: 'center' as const,
          render: (_: any, record: any) => (
            <CampaignTouchpointCell
              customer={record}
              touchpoint={tp}
              themeMode={themeMode}
              onToggle={onToggleTouchpoint}
              onOpenBooking={onOpenBooking}
            />
          ),
        };
      }),
    },
    {
      title: 'Ngày gọi gần nhất',
      key: 'lastCallDate',
      width: 120,
      render: (_: any, record: any) => {
        const date = record.lastCallAt || record.lastCall?.createdAt;
        if (!date) return '-';
        return <span className="tabular-nums text-[11px]">{dayjs(date).format('DD/MM HH:mm')}</span>;
      },
    },
    {
      title: 'Thời lượng',
      key: 'lastCallDuration',
      width: 80,
      render: (_: any, record: any) => {
        const secs = record.lastCallDuration ?? record.lastCall?.durationSec;
        if (secs === undefined || secs === null) return '-';
        return <span className="tabular-nums text-[11px]">{formatDuration(secs)}</span>;
      },
    },
    {
      title: 'Trạng thái cuộc gọi',
      key: 'lastCallResult',
      width: 120,
      render: (_: any, record: any) => {
        const result = record.lastCallResult || record.lastCall?.callResult;
        if (!result) return '-';
        const label = (CALL_RESULT_LABELS as Record<string, string>)[result] || result;
        let color = 'default';
        if (result === 'ANSWERED' || result === 'Có bắt máy') color = 'success';
        else if (result === 'NO_ANSWER' || result === 'Không nghe máy') color = 'warning';
        else if (result === 'BUSY' || result === 'Bận') color = 'orange';
        else if (result === 'FAILED' || result === 'WRONG_NUMBER' || result === 'Sai số') color = 'error';
        return (
          <Tag color={color} className="text-[11px] px-1 m-0">
            {label}
          </Tag>
        );
      },
    },
    {
      title: 'Ghi chú cuộc gọi',
      key: 'lastCallNote',
      width: 130,
      render: (_: any, record: any) => {
        const note = record.lastCallNote || record.lastCall?.note;
        if (!note) return '-';
        const compactNote = note.length > 20 ? `${note.substring(0, 20)}...` : note;
        return (
          <Tooltip title={note}>
            <span className="cursor-pointer text-[11px] italic text-gray-300 line-clamp-1">{compactNote}</span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Đã phân bổ',
      key: 'allocatedDays',
      width: 100,
      render: (_: any, record: any) => {
        const assignedAt = record.assignedAt || record.assignedStaff?.assignedAt || record.lastAllocation?.assignedAt;
        if (!assignedAt) {
          return <span className="text-gray-400 italic text-[11px]">Chưa phân bổ</span>;
        }
        const assignedDate = dayjs(assignedAt);
        const today = dayjs();
        const diffDays = Math.max(0, today.diff(assignedDate, 'day'));
        const formattedDate = assignedDate.format('DD/MM/YYYY HH:mm');
        const staffName =
          record.assignedBookerName ||
          record.assignedBooker?.name ||
          record.assignedStaff?.displayName ||
          record.lastAllocation?.staffName;
        const tooltipTitle = `Phân bổ cho: ${staffName || 'Booker'} (từ ${formattedDate})`;
        return (
          <Tooltip title={tooltipTitle}>
            <span className="tabular-nums font-semibold text-[11px]">{diffDays} ngày</span>
          </Tooltip>
        );
      },
    },
    ...(isSharedPool
      ? [
          {
            title: 'Trạng thái Pool',
            key: 'poolStatus',
            width: 170,
            render: (_: any, record: any) => {
              const rawStatus = record.poolStatus || 'AVAILABLE';
              const isClaimExpired =
                rawStatus === 'CLAIMED' &&
                record.claimExpiresAt &&
                new Date(record.claimExpiresAt).getTime() <= Date.now();
              const isRecycleExpired =
                (rawStatus === 'RECYCLING' || rawStatus === 'RECYCLE') &&
                record.availableAt &&
                new Date(record.availableAt).getTime() <= Date.now();
              const status = isClaimExpired || isRecycleExpired ? 'AVAILABLE' : rawStatus;
              const isClaimed = status === 'CLAIMED';
              const isMe = isClaimed && record.isClaimedByMe;
              const hasCooldown = record.cooldownUntil && new Date(record.cooldownUntil) > new Date();
              const cooldownMinutes = hasCooldown
                ? Math.ceil((new Date(record.cooldownUntil).getTime() - Date.now()) / (60 * 1000))
                : 0;

              return (
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-1 flex-wrap">
                    {status === 'AVAILABLE' && (
                      <Tag color="success" className="font-bold text-[11px] m-0">
                        🟢 SẴN SÀNG
                      </Tag>
                    )}
                    {status === 'CLAIMED' && (
                      <Tag
                        color={isMe ? 'purple' : 'orange'}
                        className="font-bold text-[11px] m-0 inline-flex items-center gap-1"
                      >
                        <LockOutlined />
                        <span>{isMe ? 'BẠN ĐANG GIỮ' : `ĐANG GIỮ: ${record.claimedByStaffName || 'NV'}`}</span>
                        <CampaignClaimCountdown
                          expiresAt={record.claimExpiresAt}
                          onExpire={() => onClaimExpiredLocally(record)}
                        />
                      </Tag>
                    )}
                    {(status === 'RECYCLING' || status === 'RECYCLE') && (
                      <Tag color="magenta" className="font-semibold text-[11px] m-0">
                        🟣 CHỜ QUAY LẠI{' '}
                        {record.availableAt ? `(${dayjs(record.availableAt).format('DD/MM HH:mm')})` : ''}
                      </Tag>
                    )}
                    {status === 'EXPLOITED' && (
                      <Tag color="default" className="text-[11px] m-0">
                        ⚪ ĐÃ GỌI {record.lastCallStaffName ? `(${record.lastCallStaffName})` : ''}
                      </Tag>
                    )}
                    {status === 'BOOKED' && (
                      <Tag color="processing" className="font-bold text-[11px] m-0 inline-flex items-center gap-1">
                        <CheckCircleOutlined /> ĐÃ BOOKING ({record.bookedByStaffName || 'NV'})
                      </Tag>
                    )}
                    {status === 'EXCLUDED' && (
                      <Tag color="error" className="text-[11px] m-0">
                        🔴 ĐÃ LOẠI
                      </Tag>
                    )}
                  </div>

                  {hasCooldown && (
                    <Tag color="warning" className="text-[10px] tabular-nums m-0 inline-flex items-center gap-1 w-fit">
                      <ClockCircleOutlined /> Giãn cách còn {cooldownMinutes}p
                    </Tag>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
    {
      title: 'Thao tác',
      key: 'actions',
      width: isSharedPool ? 180 : 100,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const isLoadingThis = actionLoadingId === (record.id || record.legacyUserId);
        const isClaimExpired =
          record.poolStatus === 'CLAIMED' &&
          record.claimExpiresAt &&
          new Date(record.claimExpiresAt).getTime() <= Date.now();
        const isRecycleExpired =
          (record.poolStatus === 'RECYCLING' || record.poolStatus === 'RECYCLE') &&
          record.availableAt &&
          new Date(record.availableAt).getTime() <= Date.now();
        const effectiveCanClaim = record.canClaim || isClaimExpired || isRecycleExpired;
        const effectiveIsClaimedByMe = record.isClaimedByMe && !isClaimExpired;

        return (
          <Space size="small" wrap>
            {isSharedPool && (
              <>
                {effectiveCanClaim && (
                  <Tooltip title="Nhận khách này vào xử lý (Claim)">
                    <Button
                      size="small"
                      type="primary"
                      icon={<LockOutlined />}
                      loading={isLoadingThis}
                      onClick={() => onClaimCustomer(record)}
                      className="bg-emerald-600 hover:bg-emerald-500 font-semibold text-white text-xs"
                    >
                      Nhận
                    </Button>
                  </Tooltip>
                )}

                {effectiveIsClaimedByMe && (
                  <>
                    <Tooltip title="Gọi khách qua luồng chuẩn mOS">
                      <Button
                        size="small"
                        type="primary"
                        icon={<PhoneOutlined />}
                        onClick={() => onCallClaimedCustomer(record)}
                        className="bg-purple-600 hover:bg-purple-500 font-semibold text-white text-xs"
                      >
                        Gọi khách
                      </Button>
                    </Tooltip>

                    <Tooltip title="Nhả khách lại về Shared Pool">
                      <Button
                        size="small"
                        icon={<UnlockOutlined />}
                        loading={isLoadingThis}
                        onClick={() => onReleaseCustomer(record)}
                        className="text-xs"
                      >
                        Nhả
                      </Button>
                    </Tooltip>
                  </>
                )}

                <Tooltip title="Lịch sử tương tác & Chống tranh công">
                  <Button size="small" icon={<HistoryOutlined />} onClick={() => onOpenAuditLogs(record)} />
                </Tooltip>

                {isAdmin && (
                  <Popconfirm
                    title="Thao tác quản lý khách hàng"
                    description="Chọn hành động đối với khách hàng trong Shared Pool"
                    okText="Đưa về Pool"
                    cancelText="Hủy"
                    onConfirm={() => onManagerCustomerAction(record, 'RETURN_TO_POOL')}
                  >
                    <Tooltip title="Menu Quản lý Pool">
                      <Button size="small" icon={<SettingOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                )}
              </>
            )}

            <Tooltip title="Gửi SMS">
              <Button
                size="small"
                icon={<MessageOutlined style={{ color: '#D4A84B' }} />}
                onClick={() => onOpenSMS(record)}
                style={{ borderColor: '#D4A84B', color: '#D4A84B' }}
              />
            </Tooltip>
            <Tooltip title="Đặt lịch hẹn">
              <Button
                type="primary"
                size="small"
                icon={<CalendarPlusIcon fontSize={14} />}
                style={{
                  backgroundColor: '#D4A84B',
                  borderColor: '#D4A84B',
                  color: '#ffffff',
                  borderRadius: '6px',
                }}
                onClick={() => onOpenBooking(record)}
              />
            </Tooltip>
            {isAdmin && (
              <Tooltip title="Xóa khỏi chiến dịch">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    onRemoveCustomer(
                      record.legacyUserId || record.customerId || record.id,
                      record.customerName || record.name
                    )
                  }
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  return columns;
}

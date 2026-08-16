'use client';

import { TableIndexHeader } from '~/components/ui';

import React from 'react';
import { Avatar, Checkbox, Tag, Typography, Space, Tooltip, Button, theme } from 'antd';
import type { TableProps } from 'antd';
import { UserOutlined, PhoneOutlined, CheckCircleOutlined, PlusOutlined, MessageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../../../context/ThemeContext';
import { useOmiCall } from '../../../../context/OmiCallContext';
import { Customer, CALL_RESULT_LABELS } from '@mos-lab/shared';
import { formatVND } from '../../../../lib/format-utils';
import { ResizableHeaderCell } from '../../../../components/ResizableHeaderCell';
import { TableConfigDrawer } from '../../../../components/TableConfigDrawer';
import { ColumnsType } from 'antd/es/table';
import { useTableConfig } from '../../../../hooks/useTableConfig';
import { DataTable } from '../../../../components/ui';

const { Text } = Typography;

type OperationalTone = 'callback' | 'booked' | 'missed' | 'neutral';

const formatDuration = (secs?: number | null) => {
  if (secs === undefined || secs === null) return '-';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

interface CustomerTableProps {
  customers: Customer[];
  loading: boolean;
  total: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: (keys: React.Key[]) => void;
  currentUser: SafeAny;
  openDetailModal: (customer: Customer) => void;
  sentinelRef?: SafeAny;
  dailyPlanList?: number[];
  addingIds?: number[];
  handleAddToPlan?: (customerId: number) => void;
  handleOpenSmsModal?: (customer: Customer) => void;
}

const CustomerTable = React.memo(
  React.forwardRef<{ openConfig: () => void }, CustomerTableProps>(function CustomerTable(
    {
      customers,
      loading,
      total,
      currentPage,
      setCurrentPage,
      pageSize,
      setPageSize,
      selectedRowKeys,
      setSelectedRowKeys,
      currentUser,
      openDetailModal,
      dailyPlanList = [],
      addingIds = [],
      handleAddToPlan,
      handleOpenSmsModal,
    },
    ref
  ) {
    const { themeMode } = useTheme();
    const { token } = theme.useToken();
    const { makeCall } = useOmiCall();
    const isManagerOrAdmin =
      currentUser?.role === 'admin' ||
      currentUser?.role === 'manager' ||
      currentUser?.role?.toLowerCase() === 'admin' ||
      currentUser?.role?.toLowerCase() === 'manager';

    const getOperationalStatus = React.useCallback((record: Customer): { label: string; tone: OperationalTone } => {
      const days = record.daysSinceLastVisit;
      const hasCallback = record.callbackDate
        ? new Date(record.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
        : false;

      if (hasCallback) {
        return { label: `Hẹn gọi lại: ${dayjs(record.callbackDate).format('DD/MM/YYYY')}`, tone: 'callback' };
      }

      const isBookingInFuture = record.lastBookingDate ? new Date(record.lastBookingDate) > new Date() : false;
      if (isBookingInFuture && (record.lastBookingState === 'New' || record.lastBookingState === 'Confirmed')) {
        return { label: `Booked: ${dayjs(record.lastBookingDate).format('DD/MM/YYYY')}`, tone: 'booked' };
      }

      const isBookingInPast = record.lastBookingDate ? new Date(record.lastBookingDate) < new Date() : false;
      const isMissed =
        isBookingInPast &&
        record.lastBookingState &&
        !['Completed', 'ServiceCompleted', 'CheckIn', 'CheckOut', 'ServiceStart'].includes(record.lastBookingState);
      if (isMissed) {
        const bookingDate = dayjs(record.lastBookingDate).startOf('day');
        return {
          label: `Missed: ${Math.max(0, dayjs().startOf('day').diff(bookingDate, 'day'))} ngày`,
          tone: 'missed',
        };
      }

      return {
        label: days !== null && days !== undefined ? `${days} ngày chưa tới` : 'Chưa từng đến',
        tone: 'neutral',
      };
    }, []);

    const renderOperationalStatus = React.useCallback(
      (record: Customer) => {
        const status = getOperationalStatus(record);
        const toneStyle = {
          callback: { color: themeMode === 'dark' ? '#fbbf24' : '#92400e', fontWeight: 'bold' },
          booked: { color: themeMode === 'dark' ? '#4ade80' : '#15803d', fontWeight: 'bold' },
          missed: {
            background: themeMode === 'dark' ? 'rgba(244, 63, 94, 0.18)' : '#ffe4e6',
            color: themeMode === 'dark' ? '#fda4af' : '#be123c',
            border: `1px solid ${themeMode === 'dark' ? 'rgba(244, 63, 94, 0.35)' : '#fecdd3'}`,
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
          },
          neutral: { color: themeMode === 'dark' ? '#94a3b8' : '#475569' },
        } as const;
        const icon =
          status.tone === 'callback' ? '🕒 ' : status.tone === 'booked' ? '📅 ' : status.tone === 'missed' ? '⚠️ ' : '';
        return (
          <span style={toneStyle[status.tone]}>
            {icon}
            {status.label}
          </span>
        );
      },
      [getOperationalStatus, themeMode]
    );

    const getCallResult = React.useCallback((record: Customer) => {
      const result = record.lastCall?.callResult;
      if (!result) return null;
      let color = 'default';
      if (result === 'ANSWERED' || result === 'SUCCESS' || result === 'COMPLETED') color = 'success';
      else if (result === 'NO_ANSWER') color = 'warning';
      else if (result === 'BUSY') color = 'orange';
      else if (result === 'FAILED' || result === 'WRONG_NUMBER') color = 'error';
      return { color, label: CALL_RESULT_LABELS[result as keyof typeof CALL_RESULT_LABELS] || result };
    }, []);

    const getRowClassName = (record: Customer) => {
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
    };

    const columns: ColumnsType<Customer> = React.useMemo<ColumnsType<Customer>>(
      () => [
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
          title: 'Khách Hàng',
          dataIndex: 'name',
          key: 'name',
          sorter: (a: Customer, b: Customer) => (a.name || '').localeCompare(b.name || ''),
          render: (text: string, record: Customer) => (
            <Space
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => openDetailModal(record)}
            >
              <Avatar
                src={record.avatar || undefined}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: themeMode === 'dark' ? '#333' : '#f5f5f5',
                  color: themeMode === 'dark' ? '#D4A84B' : '#855b0e',
                  border: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#d9d9d9'}`,
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: '600', color: token.colorText }} className="hover:underline transition-all">
                    {text}
                  </div>
                  {record.isForeign && (
                    <Tag
                      color="purple"
                      style={{
                        margin: 0,
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '0 4px',
                        borderRadius: '4px',
                        lineHeight: '18px',
                      }}
                    >
                      🌐 Nước ngoài
                    </Tag>
                  )}
                </div>
                {record.phone && (
                  <div
                    style={{ fontSize: '12px', color: themeMode === 'dark' ? '#D4A84B' : '#855b0e', fontWeight: '500' }}
                    className="hover:underline cursor-pointer flex items-center gap-1 mt-0.5 tabular-nums"
                    onClick={(e) => {
                      e.stopPropagation();
                      makeCall(record.phone, record.name, record.id, record.avatar || undefined);
                    }}
                  >
                    <PhoneOutlined style={{ fontSize: '10px' }} />
                    <span>{record.phone}</span>
                  </div>
                )}
                {record.dob && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: themeMode === 'dark' ? '#cbd5e1' : '#475569',
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    className="tabular-nums"
                  >
                    <span>
                      🎂{' '}
                      {dayjs(record.dob).year() >= 2024
                        ? dayjs(record.dob).format('DD/MM')
                        : dayjs(record.dob).format('DD/MM/YYYY')}
                    </span>
                    {record.age !== undefined && record.age !== null && dayjs(record.dob).year() < 2024 && (
                      <span
                        style={{
                          background: themeMode === 'dark' ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
                          color: themeMode === 'dark' ? '#38bdf8' : '#0369a1',
                          border: `1px solid ${themeMode === 'dark' ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
                          padding: '0 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600,
                        }}
                      >
                        {record.age} tuổi
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Space>
          ),
        },
        {
          title: 'Chưa tới tiệm (Ngày)',
          dataIndex: 'daysSinceLastVisit',
          key: 'daysSinceLastVisit',
          width: 180,
          sorter: (a: Customer, b: Customer) => (a.daysSinceLastVisit ?? 0) - (b.daysSinceLastVisit ?? 0),
          render: (_days: number | null, record: Customer) => renderOperationalStatus(record),
        },
        {
          title: 'Tổng Chi Tiêu',
          dataIndex: 'totalSpent',
          key: 'totalSpent',
          align: 'right',
          sorter: (a: Customer, b: Customer) => (a.totalSpent || 0) - (b.totalSpent || 0),
          render: (val: number) => <span className="tabular-nums">{formatVND(val)}</span>,
        },
        {
          title: 'Booker phụ trách',
          dataIndex: 'assignedStaff',
          key: 'assignedStaff',
          render: (staff: SafeAny) => {
            if (staff) {
              const isPending = staff.status === 'PENDING_ACCEPT' || staff.displayName?.includes('(Chờ xác nhận)');
              return <Tag color={isPending ? 'gold' : 'cyan'}>{staff.displayName}</Tag>;
            }
            return (
              <span style={{ color: themeMode === 'dark' ? '#94a3b8' : '#475569', fontStyle: 'italic' }}>
                Chưa phân bổ
              </span>
            );
          },
        },
        {
          title: 'Ngày gọi gần nhất',
          key: 'lastCallDate',
          render: (_: SafeAny, record: Customer) => {
            if (!record.lastCall?.createdAt) return '-';
            return dayjs(record.lastCall.createdAt).format('DD/MM/YYYY HH:mm');
          },
        },
        {
          title: 'Thời lượng',
          key: 'lastCallDuration',
          render: (_: SafeAny, record: Customer) => {
            if (record.lastCall?.durationSec === undefined || record.lastCall?.durationSec === null) return '-';
            return formatDuration(record.lastCall.durationSec);
          },
        },
        {
          title: 'Trạng thái cuộc gọi',
          key: 'lastCallResult',
          render: (_: SafeAny, record: Customer) => {
            const result = getCallResult(record);
            return result ? <Tag color={result.color}>{result.label}</Tag> : '-';
          },
        },
        {
          title: 'Ghi chú cuộc gọi',
          key: 'lastCallNote',
          render: (_: SafeAny, record: Customer) => {
            if (!record.lastCall?.note) return '-';
            const note = record.lastCall.note;
            const compactNote = note.length > 25 ? `${note.substring(0, 25)}...` : note;
            return (
              <Tooltip title={note}>
                <span style={{ cursor: 'pointer' }}>{compactNote}</span>
              </Tooltip>
            );
          },
        },
        {
          title: 'Đã phân bổ',
          key: 'allocatedDays',
          width: 120,
          render: (_: SafeAny, record: Customer) => {
            const assignedAt =
              record.assignedStaff?.assignedAt || record.assignedAt || record.lastAllocation?.assignedAt;

            if (!assignedAt) {
              return (
                <span style={{ color: themeMode === 'dark' ? '#94a3b8' : '#475569', fontStyle: 'italic' }}>
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
                    color: isCurrentlyAssigned ? token.colorText : token.colorTextDescription,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {diffDays} ngày
                </span>
              </Tooltip>
            );
          },
        },
        {
          title: 'Thao tác',
          key: 'actions',
          width: 110,
          align: 'center' as const,
          render: (_: SafeAny, record: Customer) => {
            const isPlanned = dailyPlanList.includes(record.id);
            const isAdding = addingIds.includes(record.id);
            return (
              <Space size="small">
                <Tooltip title={isPlanned ? 'Đã lên lịch gọi' : 'Lên lịch gọi'}>
                  <Button
                    type={isPlanned ? 'dashed' : 'primary'}
                    ghost={!isPlanned}
                    size="small"
                    loading={isAdding}
                    icon={isPlanned ? <CheckCircleOutlined style={{ color: '#52C41A' }} /> : <PlusOutlined />}
                    onClick={() => !isPlanned && !isAdding && handleAddToPlan?.(record.id)}
                    style={
                      !isPlanned
                        ? {
                            borderColor: themeMode === 'dark' ? token.colorPrimary : '#87640a',
                            color: themeMode === 'dark' ? token.colorPrimary : '#87640a',
                          }
                        : {}
                    }
                    disabled={isPlanned || isAdding}
                  />
                </Tooltip>
                <Tooltip title="Gửi SMS">
                  <Button
                    type="default"
                    size="small"
                    icon={<MessageOutlined style={{ color: '#D4A84B' }} />}
                    onClick={() => handleOpenSmsModal?.(record)}
                    style={{
                      borderColor: '#D4A84B',
                      color: '#D4A84B',
                    }}
                  />
                </Tooltip>
              </Space>
            );
          },
        },
      ],
      [
        themeMode,
        token,
        makeCall,
        renderOperationalStatus,
        getCallResult,
        openDetailModal,
        currentPage,
        pageSize,
        dailyPlanList,
        addingIds,
        handleAddToPlan,
        handleOpenSmsModal,
      ]
    );

    const staticColumns: ColumnsType<Customer> = React.useMemo<ColumnsType<Customer>>(() => {
      return columns.filter((col) => col.key !== 'assignedStaff' || isManagerOrAdmin);
    }, [columns, isManagerOrAdmin]);

    const {
      loading: configLoading,
      columns: mergedColumns,
      rawConfig,
      configVisible,
      openConfig,
      closeConfig,
      saveConfig,
      resetConfig,
    } = useTableConfig('customer_table', staticColumns);

    React.useImperativeHandle(ref, () => ({
      openConfig,
    }));

    const getSelectionCheckboxProps = React.useCallback(
      (record: Customer) =>
        ({
          // Ant Design forwards this DOM attribute, but its CheckboxProps type
          // omits ARIA attributes. Keep the input name specific to the record.
          'aria-label': `Chọn ${record.name}`,
        }) as unknown as ReturnType<NonNullable<NonNullable<TableProps<Customer>['rowSelection']>['getCheckboxProps']>>,
      []
    );

    return (
      <>
        <DataTable
          dataSource={customers}
          columns={mergedColumns}
          rowKey="id"
          rowClassName={getRowClassName}
          size="small"
          loading={loading || configLoading}
          rowSelection={
            isManagerOrAdmin
              ? {
                  selectedRowKeys,
                  onChange: (newSelectedRowKeys) => {
                    setSelectedRowKeys(newSelectedRowKeys);
                  },
                  columnTitle: <span className="sr-only">Chọn khách hàng</span>,
                  getCheckboxProps: getSelectionCheckboxProps,
                  preserveSelectedRowKeys: true,
                }
              : undefined
          }
          columnPriority={{
            stt: 'tertiary',
            name: 'primary',
            daysSinceLastVisit: 'primary',
            totalSpent: 'secondary',
            assignedStaff: 'secondary',
            lastCallDate: 'secondary',
            lastCallDuration: 'tertiary',
            lastCallResult: 'primary',
            lastCallNote: 'tertiary',
            allocatedDays: 'tertiary',
            actions: 'primary',
          }}
          mobileRecordKey={(record) => record.id}
          mobileEmptyDescription="Không tìm thấy khách hàng phù hợp"
          mobileRenderer={(record) => {
            const isSelected = selectedRowKeys.some((key) => String(key) === String(record.id));
            const callResult = getCallResult(record);
            const assignedName = record.assignedStaff?.displayName;
            const isPlanned = dailyPlanList.includes(record.id);

            return (
              <div className="customer-mobile-card">
                <div className="customer-mobile-card-header">
                  {isManagerOrAdmin && (
                    <Checkbox
                      checked={isSelected}
                      aria-label={`Chọn ${record.name}`}
                      onChange={(event) => {
                        setSelectedRowKeys(
                          event.target.checked
                            ? [...selectedRowKeys, record.id]
                            : selectedRowKeys.filter((key) => String(key) !== String(record.id))
                        );
                      }}
                    />
                  )}
                  <div className="customer-mobile-card-identity">
                    <Avatar src={record.avatar || undefined} icon={<UserOutlined />} />
                    <button
                      type="button"
                      className="customer-mobile-card-open min-w-0"
                      onClick={() => openDetailModal(record)}
                    >
                      <div className="customer-mobile-card-name">
                        <span>{record.name}</span>
                        {record.isForeign && <Tag color="purple">🌐 Nước ngoài</Tag>}
                      </div>
                      {record.phone && <span className="customer-mobile-card-phone tabular-nums">{record.phone}</span>}
                    </button>
                  </div>
                  <span className="customer-mobile-card-bucket">{record.bucket || 'Chưa phân loại'}</span>
                </div>

                <div className="customer-mobile-card-insights">
                  <div>{renderOperationalStatus(record)}</div>
                  <div className="customer-mobile-card-meta">
                    {callResult ? (
                      <Tag color={callResult.color}>{callResult.label}</Tag>
                    ) : (
                      <span>Chưa có cuộc gọi</span>
                    )}
                    {assignedName ? <span>Booker: {assignedName}</span> : <span>Chưa phân bổ</span>}
                    {record.totalSpent ? <span className="tabular-nums">{formatVND(record.totalSpent)}</span> : null}
                  </div>
                </div>

                <div className="customer-mobile-card-actions" onClick={(event) => event.stopPropagation()}>
                  {record.phone && (
                    <Button
                      type="primary"
                      icon={<PhoneOutlined />}
                      onClick={() => makeCall(record.phone!, record.name, record.id, record.avatar || undefined)}
                    >
                      Gọi
                    </Button>
                  )}
                  <Button onClick={() => openDetailModal(record)}>Hồ sơ</Button>
                  {handleAddToPlan && (
                    <Tooltip title={isPlanned ? 'Đã lên lịch gọi' : 'Lên lịch gọi'}>
                      <Button
                        aria-label={isPlanned ? 'Đã lên lịch gọi' : 'Lên lịch gọi'}
                        disabled={isPlanned || addingIds.includes(record.id)}
                        loading={addingIds.includes(record.id)}
                        icon={isPlanned ? <CheckCircleOutlined /> : <PlusOutlined />}
                        onClick={() => !isPlanned && handleAddToPlan(record.id)}
                      />
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          }}
          stickyPrimaryColumn
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
                localStorage.setItem('mos_customers_pageSize', size.toString());
              }
              window.scrollTo({ top: 200, behavior: 'smooth' });
            },
            showTotal: (totalCount) => `Tổng số: ${totalCount} khách hàng`,
          }}
          scroll={{ x: 'max-content', y: 650 }}
          components={{
            header: {
              cell: ResizableHeaderCell,
            },
          }}
          className="customer-data-table"
        />

        <TableConfigDrawer
          visible={configVisible}
          onClose={closeConfig}
          columns={rawConfig}
          onSave={saveConfig}
          onReset={resetConfig}
        />
      </>
    );
  })
);

export default CustomerTable;

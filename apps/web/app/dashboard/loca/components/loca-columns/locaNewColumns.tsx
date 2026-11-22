'use client';

import { Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Customer } from '@mos-lab/shared';
import { StatusTag, TableIndexHeader } from '~/components/ui';
import { LocaActionCell, LocaCustomerCell } from './LocaColumnCells';
import { getSortOrder } from './locaColumnHelpers';
import type { LocaColumnsOptions } from './types';

const { Text } = Typography;

export const getNewLocaColumns = ({
  themeMode,
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
        <span className="font-medium tabular-nums">{(currentPage - 1) * pageSize + index + 1}</span>
      ),
    },
    {
      title: 'Mã KH',
      dataIndex: 'id',
      key: 'id',
      width: 85,
      sorter: true,
      sortOrder: getSortOrder(sortField, 'id_asc', 'id_desc'),
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'name',
      key: 'name',
      width: 170,
      sorter: true,
      sortOrder: getSortOrder(sortField, 'name_asc', 'name_desc'),
      render: (text: string, record: Customer) => (
        <LocaCustomerCell
          name={text}
          record={record}
          themeMode={themeMode}
          phoneTone="gold"
          onOpenDetail={handleOpenDetailModal}
          onMakeCall={makeCall}
        />
      ),
    },
    {
      title: 'Combo Mới & Doanh Thu',
      key: 'comboDetails',
      align: 'right' as const,
      width: 170,
      render: (_: SafeAny, record: Customer) => {
        const details = record.newComboDetails;
        if (!details) return <Text type="secondary">Không có thông tin</Text>;
        return (
          <div>
            <div className="font-semibold text-[var(--client-name-color)]">{details.comboName || 'Combo Mới Mua'}</div>
            <div className="text-xs font-bold text-amber-500 tabular-nums">{formatVND(details.comboPrice || 0)}</div>
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
          <StatusTag status="cyan" label={booker} />
        ) : (
          <span className="italic text-[var(--client-desc-color)]">System</span>
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
          <div className="text-xs">
            <div>
              <span className="opacity-70">In: </span>
              <StatusTag status="processing" label={details?.ccInName || 'Chưa nhận'} className="m-0" />
            </div>
            <div className="mt-1">
              <span className="opacity-70">Out: </span>
              <StatusTag status="purple" label={details?.ccOutName || 'Chưa nhận'} className="m-0" />
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
          <StatusTag status="gold" label={cv} />
        ) : (
          <span className="italic text-[var(--client-desc-color)]">Chưa phân công</span>
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
          <span className="whitespace-nowrap tabular-nums">{dayjs(date).format('DD/MM/YYYY HH:mm')}</span>
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
      render: (_: SafeAny, record: Customer) => (
        <LocaActionCell
          customer={record}
          isPlanned={dailyPlanList.includes(record.id)}
          isAdding={addingIds.includes(record.id)}
          onAddToPlan={handleAddToPlan}
          onOpenSms={handleOpenSmsModal}
        />
      ),
    },
  ];
};

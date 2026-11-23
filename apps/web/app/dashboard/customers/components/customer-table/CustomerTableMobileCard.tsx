'use client';

import type { Key } from 'react';
import { Avatar, Button, Checkbox, Tooltip } from 'antd';
import { CheckCircle2, Phone, Plus, User } from 'lucide-react';
import { CALL_RESULT_LABELS, type Customer } from '@mos-lab/shared';
import { AppIcon, CopyPhoneButton, StatusTag } from '~/components/ui';
import { formatVND } from '../../../../../lib/format-utils';
import { CustomerOperationalStatus } from './CustomerOperationalStatus';
import { getCallResult } from './customer-table-utils';

interface CustomerTableMobileCardProps {
  record: Customer;
  isManagerOrAdmin: boolean;
  selectedRowKeys: Key[];
  onChangeSelectedRowKeys: (keys: Key[]) => void;
  openDetailModal: (customer: Customer) => void;
  canMakeCall: boolean;
  makeCall: (phone: string, name: string, id: number, avatar?: string) => void;
  dailyPlanList: number[];
  addingIds: number[];
  handleAddToPlan?: (customerId: number) => void;
}

export function CustomerTableMobileCard({
  record,
  isManagerOrAdmin,
  selectedRowKeys,
  onChangeSelectedRowKeys,
  openDetailModal,
  canMakeCall,
  makeCall,
  dailyPlanList,
  addingIds,
  handleAddToPlan,
}: CustomerTableMobileCardProps) {
  const isSelected = selectedRowKeys.some((key) => String(key) === String(record.id));
  const callResult = getCallResult(record, CALL_RESULT_LABELS);
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
              onChangeSelectedRowKeys(
                event.target.checked
                  ? [...selectedRowKeys, record.id]
                  : selectedRowKeys.filter((key) => String(key) !== String(record.id))
              );
            }}
          />
        )}
        <div className="customer-mobile-card-identity">
          <Avatar src={record.avatar || undefined} icon={<AppIcon icon={User} size={14} />} />
          <button type="button" className="customer-mobile-card-open min-w-0" onClick={() => openDetailModal(record)}>
            <div className="customer-mobile-card-name">
              <span>{record.name}</span>
              {record.isForeign && <StatusTag status="purple" label="🌐 Nước ngoài" />}
            </div>
            {record.phone && (
              <div className="flex items-center gap-1">
                <span className="customer-mobile-card-phone tabular-nums">{record.phone}</span>
                <CopyPhoneButton phone={record.phone} size="xs" />
              </div>
            )}
          </button>
        </div>
        <span className="customer-mobile-card-bucket">{record.bucket || 'Chưa phân loại'}</span>
      </div>

      <div className="customer-mobile-card-insights">
        <div>
          <CustomerOperationalStatus record={record} />
        </div>
        <div className="customer-mobile-card-meta">
          {callResult ? (
            <StatusTag status={callResult.status} label={callResult.label} />
          ) : (
            <span>Chưa có cuộc gọi</span>
          )}
          {assignedName ? <span>Booker: {assignedName}</span> : <span>Chưa phân bổ</span>}
          {record.totalSpent ? <span className="tabular-nums">{formatVND(record.totalSpent)}</span> : null}
        </div>
      </div>

      <div className="customer-mobile-card-actions" onClick={(event) => event.stopPropagation()}>
        {record.phone && canMakeCall && (
          <Button
            type="primary"
            icon={<AppIcon icon={Phone} size={14} />}
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
              icon={<AppIcon icon={isPlanned ? CheckCircle2 : Plus} size={14} />}
              onClick={() => !isPlanned && handleAddToPlan(record.id)}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
}

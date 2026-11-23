'use client';

import { Avatar, Button, Space, Typography } from 'antd';
import { Clock, Eye, Phone } from 'lucide-react';
import { maskPhoneNumber } from '@mos-lab/shared';
import { AdaptiveModal, CopyPhoneButton, StatusTag } from '~/components/ui';
import { BRANCH_CALENDAR_CONFIG, getCalendarBorderClass } from './calendarSummaryConstants';
import { getCustomerAvatarBgClass } from './calendarSummaryHelpers';
import type { CalendarSlotItems, CalendarThemeMode, SelectedCalendarSlot } from './types';

const { Text } = Typography;

export interface SlotDetailModalProps {
  themeMode: CalendarThemeMode;
  selectedSlot: SelectedCalendarSlot | null;
  modalSlotItems: CalendarSlotItems;
  isMaskedRole: boolean;
  onClose: () => void;
  onCallCustomer: (phone: string, customerName: string, customerId?: number) => void;
  onOpenCustomerDrawer: (record: SafeAny) => void;
}

export function SlotDetailModal({
  themeMode,
  selectedSlot,
  modalSlotItems,
  isMaskedRole,
  onClose,
  onCallCustomer,
  onOpenCustomerDrawer,
}: SlotDetailModalProps) {
  const isDark = themeMode === 'dark';
  const borderClass = getCalendarBorderClass(themeMode);
  const subTextClass = isDark ? 'text-slate-400 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400';

  return (
    <AdaptiveModal
      intent="detail"
      open={!!selectedSlot}
      onCancel={onClose}
      footer={null}
      width={750}
      title={
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            Chi Tiết Lịch Hẹn Khung Giờ {selectedSlot?.hour}
            {selectedSlot?.branchKey && ` - ${BRANCH_CALENDAR_CONFIG[selectedSlot.branchKey]?.name}`}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pt-3">
        {/* Scheduled / Coming list */}
        <div>
          <div className="font-bold text-[13px] text-amber-500 mb-2">
            📅 Lịch Hẹn Khách Đến (<span className="tabular-nums">{modalSlotItems.scheduled.length}</span> lượt)
          </div>
          {modalSlotItems.scheduled.length === 0 ? (
            <Text type="secondary">Không có lịch hẹn trong khung giờ này.</Text>
          ) : (
            <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
              {modalSlotItems.scheduled.map((item) => (
                <div
                  key={item.key}
                  className={`flex justify-between items-center px-3 py-2 rounded-md border ${borderClass} ${
                    isDark ? 'bg-slate-800 dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  <Space size="middle">
                    <Avatar className={getCustomerAvatarBgClass(item.customer || item.key)}>
                      {item.customer ? item.customer[0]?.toUpperCase() : 'K'}
                    </Avatar>
                    <div>
                      <div className="font-bold">{item.customer}</div>
                      <div className={`text-[11px] flex items-center gap-1 ${subTextClass}`}>
                        <span className="tabular-nums">{isMaskedRole ? maskPhoneNumber(item.phone) : item.phone}</span>
                        {!isMaskedRole && !item.phone.includes('*') && <CopyPhoneButton phone={item.phone} size="xs" />}
                        <span>
                          | Booker: <strong>{item.booker}</strong> | CV: {item.cv || '-'}
                        </span>
                      </div>
                    </div>
                  </Space>

                  <Space size="small">
                    <StatusTag
                      status={item.status === 'completed' ? 'success' : item.status === 'late' ? 'error' : 'warning'}
                      label={item.status.toUpperCase()}
                    />
                    {!isMaskedRole && !item.phone.includes('*') && (
                      <Button
                        size="small"
                        icon={<Phone className="w-3.5 h-3.5" />}
                        onClick={() => onCallCustomer(item.phone, item.customer, item.customerId)}
                        title="Gọi OmiCall"
                      />
                    )}
                    <Button
                      size="small"
                      icon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => {
                        onClose();
                        onOpenCustomerDrawer(item);
                      }}
                      title="Xem chi tiết"
                    />
                  </Space>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Created List */}
        <div>
          <div className="font-bold text-[13px] text-sky-600 mb-2">
            📝 Đơn Hàng Được Tạo Trong Khung Giờ Này (
            <span className="tabular-nums">{modalSlotItems.created.length}</span>&nbsp;đơn)
          </div>
          {modalSlotItems.created.length === 0 ? (
            <Text type="secondary">Không có đơn tạo mới trong giờ này.</Text>
          ) : (
            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
              {modalSlotItems.created.map((b) => (
                <div
                  key={b.key}
                  className={`flex justify-between items-center px-3 py-2 rounded-md border ${borderClass} ${
                    isDark ? 'bg-slate-900 dark:bg-slate-900' : 'bg-sky-50 dark:bg-slate-900'
                  }`}
                >
                  <Space size="middle">
                    <Avatar className="bg-sky-600">{b.customer ? b.customer[0]?.toUpperCase() : 'K'}</Avatar>
                    <div>
                      <div className="font-bold">{b.customer}</div>
                      <div className={`text-[11px] ${subTextClass}`}>
                        Booker: <strong>{b.booker}</strong> | Kênh: {b.channel || 'FB'} | Tạo: {b.createdTime}
                      </div>
                    </div>
                  </Space>

                  <Button
                    size="small"
                    icon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => {
                      onClose();
                      onOpenCustomerDrawer(b);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdaptiveModal>
  );
}

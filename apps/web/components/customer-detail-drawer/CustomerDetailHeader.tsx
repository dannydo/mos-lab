'use client';

import React from 'react';
import dayjs from 'dayjs';
import { Avatar, Button, Popconfirm, Space, Tooltip } from 'antd';
import { ExternalLink, FilePenLine, Mic, Pencil, Phone, Trash2, Undo2, User } from 'lucide-react';
import { maskPhoneNumber } from '@mos-lab/shared';
import { CopyPhoneButton, StatusTag } from '~/components/ui';
import CalendarPlusIcon from '../icons/CalendarPlusIcon';

export interface CustomerDetailHeaderProps {
  customer: SafeAny;
  themeMode: 'light' | 'dark';
  isCompactTier: boolean;
  isMaskedRole: boolean;
  canMakeCall: boolean;
  isManagerOrAdmin: boolean;
  canViewOmicallQa?: boolean;
  restoreLoading: boolean;
  deleteLoading: boolean;
  legacyProfileUrl: string;
  onClose: () => void;
  makeCall: (phoneNumber: string, customerName?: string, customerId?: number, avatar?: string) => void;
  onRestoreCustomer: () => void;
  onDeleteCustomer: () => void;
  onOpenEditModal: () => void;
  onOpenNoteModal: () => void;
  onOpenBookingWizard: () => void;
}

export const CustomerDetailHeader: React.FC<CustomerDetailHeaderProps> = ({
  customer,
  themeMode,
  isCompactTier,
  isMaskedRole,
  canMakeCall,
  isManagerOrAdmin,
  canViewOmicallQa = false,
  restoreLoading,
  deleteLoading,
  legacyProfileUrl,
  onClose,
  makeCall,
  onRestoreCustomer,
  onDeleteCustomer,
  onOpenEditModal,
  onOpenNoteModal,
  onOpenBookingWizard,
}) => {
  const isDark = themeMode === 'dark';
  const mutedTextClass = isDark ? 'text-slate-300' : 'text-slate-600';

  return (
    <div className="customer-detail-header flex w-full items-center justify-between pr-3">
      {isCompactTier && (
        <div
          className={`customer-detail-mobile-topbar mb-1.5 flex w-full items-center justify-between border-b pb-2 ${
            isDark ? 'border-slate-700' : 'border-gray-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-400 transition-all hover:bg-amber-400/20 active:scale-95"
            aria-label="Quay lại"
          >
            <Undo2 className="h-[13px] w-[13px]" />
            <span>Quay lại</span>
          </button>
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${mutedTextClass}`}>
            Hồ sơ khách hàng
          </span>
        </div>
      )}

      <div className="customer-detail-identity flex items-center gap-3">
        <Avatar
          className={`customer-detail-avatar shrink-0 border-2 shadow-xs ${
            isDark ? 'border-slate-600 bg-slate-700' : 'border-white bg-amber-500'
          }`}
          size={40}
          src={customer.avatar || undefined}
          icon={!customer.avatar && <User className="h-5 w-5" />}
        />

        <div className="customer-detail-identity-copy">
          <div
            className={`customer-detail-name flex flex-wrap items-center gap-1.5 text-base font-bold ${
              isDark ? 'text-white' : 'text-gray-800'
            }`}
          >
            {customer.name}
            <span className="text-sm text-amber-500">⭐⭐⭐⭐•</span>
            {customer.isForeign && (
              <StatusTag
                status="purple"
                label="🌐 Nước ngoài"
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold leading-4"
              />
            )}
          </div>

          <div
            className={`customer-detail-contact-row mt-0.5 flex flex-wrap items-center gap-3 text-xs ${mutedTextClass}`}
          >
            <div className="customer-detail-phone-list flex flex-col gap-1">
              {customer.phones && customer.phones.length > 0 ? (
                customer.phones.map((phoneObj: SafeAny) => {
                  const displayPhone = isMaskedRole ? maskPhoneNumber(phoneObj.phone_number) : phoneObj.phone_number;

                  return (
                    <div key={phoneObj.id} className="inline-flex items-center gap-1">
                      <span
                        className={`inline-flex items-center gap-1.5 select-text text-xs tabular-nums ${
                          phoneObj.is_disabled
                            ? `font-normal line-through opacity-50 ${isDark ? 'text-slate-500' : 'text-slate-400'}`
                            : `font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`
                        } ${!isMaskedRole && canMakeCall ? 'cursor-pointer hover:underline' : ''}`}
                        onClick={() => {
                          if (!isMaskedRole && !phoneObj.is_disabled && canMakeCall) {
                            makeCall(phoneObj.phone_number, customer.name, customer.id, customer.avatar || undefined);
                          }
                        }}
                      >
                        <Phone
                          className={`h-3 w-3 shrink-0 ${phoneObj.is_disabled ? 'text-neutral-400' : 'text-amber-500'}`}
                        />
                        <span>
                          {displayPhone} {phoneObj.is_disabled && '(Vô hiệu hóa)'}
                        </span>
                      </span>
                      {!isMaskedRole && <CopyPhoneButton phone={phoneObj.phone_number} size="xs" />}
                    </div>
                  );
                })
              ) : customer.phone ? (
                <div className="inline-flex items-center gap-1">
                  <span
                    className={`inline-flex items-center gap-1.5 select-text text-xs font-semibold tabular-nums ${
                      isDark ? 'text-slate-100' : 'text-slate-900'
                    } ${!isMaskedRole && canMakeCall ? 'cursor-pointer hover:underline' : ''}`}
                    onClick={() => {
                      if (!isMaskedRole && canMakeCall) {
                        makeCall(customer.phone, customer.name, customer.id, customer.avatar || undefined);
                      }
                    }}
                  >
                    <Phone className="h-3 w-3 shrink-0 text-amber-500" />
                    <span>{isMaskedRole ? maskPhoneNumber(customer.phone) : customer.phone}</span>
                  </span>
                  {!isMaskedRole && <CopyPhoneButton phone={customer.phone} size="xs" />}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" /> -
                </span>
              )}
            </div>

            {!isMaskedRole && (
              <Tooltip title="Mở hồ sơ trên hệ thống Legacy">
                <a
                  className={`customer-detail-legacy-profile inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs transition-all ${
                    isDark
                      ? 'border-blue-400/30 bg-blue-600/15 text-blue-400 hover:bg-blue-600/25'
                      : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                  href={legacyProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Tooltip>
            )}

            {customer.email && <span>Email: {customer.email}</span>}

            {customer.dob && (
              <span className="customer-detail-birthday inline-flex items-center gap-1 tabular-nums">
                🎂 {dayjs(customer.dob).format('DD/MM/YYYY')}
                {customer.age !== undefined && customer.age !== null && (
                  <span
                    className={`rounded-[10px] px-1.5 text-[11px] font-semibold tabular-nums ${
                      isDark ? 'bg-neutral-800 text-sky-400' : 'bg-sky-50 text-sky-700'
                    }`}
                  >
                    {customer.age} tuổi
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      <Space className="customer-detail-actions">
        {isManagerOrAdmin &&
          (customer.isDeleted ? (
            <Popconfirm
              title="Khôi phục khách hàng"
              description="Bạn có chắc chắn muốn khôi phục khách hàng này?"
              onConfirm={onRestoreCustomer}
              okText="Khôi phục"
              cancelText="Hủy"
              okButtonProps={{ loading: restoreLoading }}
            >
              <Tooltip title="Khôi Phục Khách Hàng">
                <Button
                  className="customer-detail-action border-emerald-600 bg-emerald-600 font-bold text-white hover:bg-emerald-500"
                  type="primary"
                  icon={<Undo2 className="h-3.5 w-3.5" />}
                />
              </Tooltip>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Xóa khách hàng"
              description="Bạn có chắc chắn muốn xóa khách hàng này không? Khách hàng sẽ bị chuyển vào thùng rác."
              onConfirm={onDeleteCustomer}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true, loading: deleteLoading }}
            >
              <Tooltip title="Xóa Khách Hàng">
                <Button
                  className="customer-detail-action font-bold"
                  danger
                  type="dashed"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                />
              </Tooltip>
            </Popconfirm>
          ))}

        <Tooltip title="Sửa Thông Tin">
          <Button
            className={`customer-detail-action font-bold ${
              isDark ? 'border-slate-700 text-white' : 'border-neutral-300 text-gray-800'
            }`}
            type="default"
            icon={<Pencil className="h-3.5 w-3.5" />}
            onClick={onOpenEditModal}
          />
        </Tooltip>

        <Tooltip title="Thêm Ghi Chú">
          <Button
            className={`customer-detail-action font-bold ${
              isDark ? 'border-slate-700 text-white' : 'border-neutral-300 text-gray-800'
            }`}
            type="default"
            icon={<FilePenLine className="h-3.5 w-3.5" />}
            onClick={onOpenNoteModal}
          />
        </Tooltip>

        <Tooltip title="Đặt Lịch Hẹn">
          <Button
            className="customer-detail-action customer-detail-primary-action inline-flex h-9 w-9 items-center justify-center rounded-lg border-amber-500 bg-amber-500 p-0 shadow-[0_2px_6px_rgba(212,168,75,0.3)] hover:bg-amber-600"
            type="primary"
            icon={<CalendarPlusIcon fontSize={18} />}
            onClick={onOpenBookingWizard}
          />
        </Tooltip>

        {canViewOmicallQa && customer?.id && (
          <Tooltip title="Nghe ghi âm & AI OmiCall của khách hàng">
            <a
              href={`/dashboard/omicall?legacyUserId=${customer.id}${
                customer.name ? `&customerName=${encodeURIComponent(customer.name)}` : ''
              }`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Nghe ghi âm & AI OmiCall của khách hàng"
              className={`customer-detail-action inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-semibold transition-colors ${
                isDark
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                  : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <Mic className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ghi âm &amp; AI</span>
            </a>
          </Tooltip>
        )}
      </Space>
    </div>
  );
};

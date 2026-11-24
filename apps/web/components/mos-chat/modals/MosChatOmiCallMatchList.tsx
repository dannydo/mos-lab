'use client';

import React from 'react';
import { Avatar, Button, Spin } from 'antd';
import { PhoneCall, User } from 'lucide-react';
import type { Customer, MosChatStaffMember } from '@mos-lab/shared';
import { formatDisplayPhone, isValidDialablePhone, normalizeVietnamDialPhone } from '../utils/omicall-dial-helpers';

export interface MosChatOmiCallMatchListProps {
  isDark: boolean;
  cardSurface: string;
  callState: string;
  matchedStaff: MosChatStaffMember[];
  matchedCustomers: Customer[];
  searchingCustomers: boolean;
  onSelectTarget: (target: { id?: number; name: string; phone: string; avatar?: string | null }) => void;
  onDialTarget: (target: { phone: string; name?: string; customerId?: number; avatar?: string | null }) => void;
}

export const MosChatOmiCallMatchList: React.FC<MosChatOmiCallMatchListProps> = ({
  isDark,
  cardSurface,
  callState,
  matchedStaff,
  matchedCustomers,
  searchingCustomers,
  onSelectTarget,
  onDialTarget,
}) => {
  const showCustomers = searchingCustomers || matchedCustomers.length > 0;
  if (matchedStaff.length === 0 && !showCustomers) {
    return null;
  }

  return (
    <div className="space-y-2">
      {matchedStaff.length > 0 && (
        <div className={`rounded-xl border p-2 space-y-1 max-h-36 overflow-y-auto ${cardSurface}`}>
          <div className="flex items-center justify-between px-1 text-[11px] font-semibold opacity-70">
            <span>Nhân sự nội bộ</span>
            <span className="tabular-nums">{matchedStaff.length}</span>
          </div>
          {matchedStaff.map((staff) => {
            if (!staff.phone) return null;
            const normalized = normalizeVietnamDialPhone(staff.phone);
            return (
              <div
                key={`staff-${staff.id}`}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-slate-800/80' : 'hover:bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    onSelectTarget({
                      name: staff.displayName || staff.username,
                      phone: normalized,
                      avatar: staff.avatarUrl || null,
                    })
                  }
                  className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer bg-transparent border-0 p-0"
                >
                  <Avatar size={26} src={staff.avatarUrl || undefined} icon={<User size={13} />} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                      <span className="truncate">{staff.displayName || staff.username}</span>
                      {staff.role && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 font-semibold uppercase shrink-0">
                          {staff.role}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] opacity-75 font-mono tabular-nums truncate">
                      {formatDisplayPhone(normalized)}
                    </div>
                  </div>
                </button>
                <Button
                  size="small"
                  type="primary"
                  data-testid="mos-chat-omicall-staff-call-btn"
                  disabled={callState !== 'idle'}
                  icon={<PhoneCall size={12} />}
                  onClick={() =>
                    onDialTarget({
                      phone: normalized,
                      name: staff.displayName || staff.username,
                      avatar: staff.avatarUrl || null,
                    })
                  }
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                >
                  Gọi
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {showCustomers && (
        <div className={`rounded-xl border p-2 space-y-1 max-h-40 overflow-y-auto ${cardSurface}`}>
          <div className="flex items-center justify-between px-1 text-[11px] font-semibold opacity-70">
            <span>Khách hàng CRM phù hợp</span>
            {searchingCustomers && <Spin size="small" />}
          </div>
          {matchedCustomers.map((customer) => {
            const dialable = isValidDialablePhone(customer.phone);
            return (
              <div
                key={`customer-${customer.id}`}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-slate-800/80' : 'hover:bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!customer.phone) return;
                    const normalized = normalizeVietnamDialPhone(customer.phone);
                    onSelectTarget({
                      id: customer.id,
                      name: customer.name || 'Khách hàng',
                      phone: normalized,
                      avatar: customer.avatar || null,
                    });
                  }}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer bg-transparent border-0 p-0"
                >
                  <Avatar size={26} src={customer.avatar || undefined} icon={<User size={13} />} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">{customer.name || `KH #${customer.id}`}</div>
                    <div className="text-[11px] opacity-75 font-mono tabular-nums truncate">
                      {customer.phone || 'Chưa có SĐT'}
                    </div>
                  </div>
                </button>
                {dialable && customer.phone && (
                  <Button
                    size="small"
                    type="primary"
                    disabled={callState !== 'idle'}
                    icon={<PhoneCall size={12} />}
                    onClick={() =>
                      onDialTarget({
                        phone: customer.phone!,
                        name: customer.name || 'Khách hàng',
                        customerId: customer.id,
                        avatar: customer.avatar || null,
                      })
                    }
                    style={{ background: '#10b981', borderColor: '#10b981' }}
                  >
                    Gọi
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

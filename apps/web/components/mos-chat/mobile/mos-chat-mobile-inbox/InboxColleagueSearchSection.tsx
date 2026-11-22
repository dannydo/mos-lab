'use client';

import React from 'react';
import { MessageSquare, Users } from 'lucide-react';
import type { MosChatStaffMember } from '@mos-lab/shared';
import { MosChatAvatar } from '../../MosChatAvatar';
import { formatStaffRole } from './inboxHelpers';

export interface InboxColleagueSearchSectionProps {
  isDark: boolean;
  matchedStaff: MosChatStaffMember[];
  staffDirectory: MosChatStaffMember[];
  onSelectStaff: (staff: MosChatStaffMember) => void;
}

export const InboxColleagueSearchSection: React.FC<InboxColleagueSearchSectionProps> = ({
  isDark,
  matchedStaff,
  staffDirectory,
  onSelectStaff,
}) => {
  if (matchedStaff.length === 0) return null;

  return (
    <div className="bg-[var(--mos-surface-muted)] border-b border-[var(--mos-surface-border)]">
      <div
        className={`px-4 py-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider bg-[var(--mos-surface)] ${
          isDark ? 'text-amber-400' : 'text-amber-600'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Đồng nghiệp ({matchedStaff.length})
        </span>
        <span className="text-[10px] text-[var(--mos-text-muted)] font-normal lowercase">Chạm để nhắn DM</span>
      </div>
      <div className="divide-y divide-[var(--mos-surface-border)]">
        {matchedStaff.map((staff) => {
          const staffName = staff.displayName || staff.username || `Nhân sự #${staff.id}`;
          return (
            <div
              key={`search-staff-${staff.id}`}
              onClick={() => onSelectStaff(staff)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectStaff(staff);
                }
              }}
              className="w-full px-4 py-3 flex items-center gap-3 active:bg-[var(--mos-surface-raised)] hover:bg-[var(--mos-surface-muted)] transition-colors select-none cursor-pointer"
            >
              <div className="relative shrink-0">
                <MosChatAvatar
                  size={44}
                  shape="square"
                  showOnline
                  isOnline={Boolean(staff.isOnline ?? true)}
                  src={staff.avatarUrl}
                  name={staffName}
                  staffId={staff.id}
                  username={staff.username}
                  staffDirectory={staffDirectory}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5 mb-0.5">
                  <h4 className="text-sm font-semibold text-[var(--mos-text)] truncate">{staffName}</h4>
                  <span
                    className={`inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/15 border border-amber-500/30 shrink-0 ${
                      isDark ? 'text-amber-300' : 'text-amber-700'
                    }`}
                  >
                    {formatStaffRole(staff.role)}
                  </span>
                </div>
                <p className="text-xs text-[var(--mos-text-muted)] truncate flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-[var(--mos-text-muted)] shrink-0" />
                  <span>Mở cuộc trò chuyện trực tiếp 1-1</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

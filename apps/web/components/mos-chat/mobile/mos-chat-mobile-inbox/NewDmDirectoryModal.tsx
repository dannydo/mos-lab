'use client';

import React, { useEffect } from 'react';
import { Search, Sparkles, UserPlus, Users, X } from 'lucide-react';
import type { MosChatStaffMember } from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../../constants/chat-constants';
import { MosChatAvatar } from '../../MosChatAvatar';
import { formatStaffRole, NEW_DM_DEPT_CHIPS, shouldShowAiCopilotShortcut } from './inboxHelpers';
import type { NewDmDeptFilter } from './inboxTypes';

export interface NewDmDirectoryModalProps {
  open: boolean;
  isDark: boolean;
  searchQuery: string;
  deptFilter: NewDmDeptFilter;
  staffList: MosChatStaffMember[];
  staffDirectory: MosChatStaffMember[];
  onClose: () => void;
  onChangeSearchQuery: (value: string) => void;
  onChangeDeptFilter: (filter: NewDmDeptFilter) => void;
  onSelectAiCopilot: (convId: string) => void;
  onSelectStaff: (staff: MosChatStaffMember) => void;
}

export const NewDmDirectoryModal: React.FC<NewDmDirectoryModalProps> = ({
  open,
  isDark,
  searchQuery,
  deptFilter,
  staffList,
  staffDirectory,
  onClose,
  onChangeSearchQuery,
  onChangeDeptFilter,
  onSelectAiCopilot,
  onSelectStaff,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const showAiShortcut = shouldShowAiCopilotShortcut(deptFilter, searchQuery);

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`absolute inset-0 backdrop-blur-sm transition-opacity ${isDark ? 'bg-black/65' : 'bg-slate-900/45'}`}
      />

      {/* Centered Dialog Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mos-new-dm-modal-title"
        className="relative w-full max-w-[460px] max-h-[85vh] flex flex-col rounded-[20px] p-5 bg-[var(--mos-surface-raised)] border border-[var(--mos-surface-border-strong)] text-[var(--mos-text)] shadow-2xl"
      >
        {/* Header with top-right close icon */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--mos-surface-border)] shrink-0">
          <div
            id="mos-new-dm-modal-title"
            className="flex items-center gap-2 text-[var(--mos-text)] font-bold text-base"
          >
            <UserPlus className="w-5 h-5 text-[var(--mos-accent)]" />
            <span>Tin nhắn trực tiếp mới</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại tin nhắn trực tiếp mới"
            className="p-1.5 rounded-full bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] active:scale-95 transition-transform cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 min-h-0 flex-1">
          {/* Search inside modal */}
          <div className="relative flex items-center bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] rounded-xl px-3 py-2 text-sm text-[var(--mos-text)] focus-within:border-[var(--mos-accent)] transition-colors">
            <Search className="w-4 h-4 text-[var(--mos-text-muted)] shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc số điện thoại..."
              className="w-full bg-transparent border-none outline-none text-xs text-[var(--mos-text)] placeholder-[var(--mos-text-muted)]"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onChangeSearchQuery('')}
                aria-label="Xóa từ khóa tìm đồng nghiệp"
                className="p-0.5 text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {NEW_DM_DEPT_CHIPS.map((dept) => {
              const active = deptFilter === dept.id;
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => onChangeDeptFilter(dept.id)}
                  className={`inline-flex items-center justify-center leading-none px-2.5 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                    active
                      ? 'bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] font-bold shadow-sm'
                      : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] border border-[var(--mos-surface-border)]'
                  }`}
                >
                  {dept.label}
                </button>
              );
            })}
          </div>

          {/* Staff List */}
          <div className="flex-1 overflow-y-auto max-h-[50vh] divide-y divide-[var(--mos-surface-border)] overscroll-contain pr-1">
            {showAiShortcut && (
              <div
                onClick={() => {
                  onClose();
                  onSelectAiCopilot(AI_COPILOT_CONV_ID);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClose();
                    onSelectAiCopilot(AI_COPILOT_CONV_ID);
                  }
                }}
                className="w-full py-2.5 px-2 flex items-center justify-between hover:bg-[var(--mos-surface-muted)] active:bg-[var(--mos-surface-muted)] rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-[var(--mos-text)] truncate">🤖 MAI</p>
                      <span
                        className={`inline-flex items-center justify-center leading-none text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                          isDark
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-purple-500/15 text-purple-700 border-purple-500/35'
                        }`}
                      >
                        mOS AI
                      </span>
                    </div>
                    <p className={`text-xs truncate ${isDark ? 'text-purple-300/80' : 'text-purple-700/80'}`}>
                      Trợ lý AI · Tra cứu dữ liệu & Phân tích riêng tư
                    </p>
                  </div>
                </div>
                <Sparkles className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
            )}

            {staffList.length === 0 ? (
              <div className="py-8 text-center text-[var(--mos-text-muted)]">
                <Users className="w-8 h-8 opacity-50 mx-auto mb-2" />
                <p className="text-xs">Không tìm thấy đồng nghiệp phù hợp</p>
              </div>
            ) : (
              staffList.map((staff) => {
                const staffName = staff.displayName || staff.username || `Nhân sự #${staff.id}`;
                return (
                  <div
                    key={`modal-staff-${staff.id}`}
                    onClick={() => onSelectStaff(staff)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectStaff(staff);
                      }
                    }}
                    className="w-full py-2.5 px-2 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] active:bg-[var(--mos-surface-muted)] rounded-xl transition-colors cursor-pointer"
                  >
                    <MosChatAvatar
                      size={40}
                      shape="square"
                      src={staff.avatarUrl}
                      name={staffName}
                      staffId={staff.id}
                      staffDirectory={staffDirectory}
                      showOnline={true}
                      isOnline={Boolean(staff.isOnline)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-semibold text-[var(--mos-text)] truncate">{staffName}</h4>
                        <span
                          className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 border border-amber-500/30 shrink-0 ${
                            isDark ? 'text-amber-300' : 'text-amber-700'
                          }`}
                        >
                          {formatStaffRole(staff.role)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--mos-text-muted)] truncate">Nhắn tin trực tiếp</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

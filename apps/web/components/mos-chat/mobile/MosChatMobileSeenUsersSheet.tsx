'use client';

import React from 'react';
import { X, CheckCheck, Check } from 'lucide-react';
import { useMosChat } from '../context/MosChatContext';
import { useTheme } from '../../../context/ThemeContext';
import { formatReadAtLabel } from '../utils/chat-helpers';
import { MosChatAvatar } from '../MosChatAvatar';

export const MosChatMobileSeenUsersSheet: React.FC = () => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const {
    seenUsersTarget,
    closeSeenUsersSheet,
    staffDirectory,
    currentUser,
  } = useMosChat();

  if (!seenUsersTarget) return null;

  const { seenBy = [], unseenBy = [], scopeLabel = 'Người đã xem' } = seenUsersTarget;
  const total = seenBy.length + unseenBy.length;
  const myStaffId = Number(currentUser?.id || 0);

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={closeSeenUsersSheet}
      data-testid="mos-chat-mobile-seen-sheet"
    >
      <div
        className="w-full max-h-[82vh] flex flex-col rounded-t-3xl bg-[var(--mos-surface)] border-t border-[var(--mos-surface-border)] shadow-2xl animate-slide-up overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: isDark
            ? '0 -10px 30px rgba(0, 0, 0, 0.7)'
            : '0 -10px 30px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Drag Handle Bar */}
        <div className="w-12 h-1.5 bg-[var(--mos-surface-border-strong)] rounded-full mx-auto mt-2.5 mb-1.5 shrink-0 opacity-60" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--mos-surface-border)] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
              <CheckCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--mos-text)] leading-tight">
                {scopeLabel}
              </h3>
              <p className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 tabular-nums">
                {seenBy.length}/{total} đã xem
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeSeenUsersSheet}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)] active:scale-95 transition-all cursor-pointer"
            aria-label="Đóng"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto px-4 py-2.5 space-y-4">
          {/* Seen Section */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider mb-2">
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="tabular-nums">Đã xem ({seenBy.length})</span>
            </div>

            {seenBy.length === 0 ? (
              <div className="text-xs italic py-2 px-3 rounded-xl bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)]">
                Chưa có thành viên nào xem tin nhắn này
              </div>
            ) : (
              <div className="space-y-1.5">
                {seenBy.map((reader) => {
                  const isMe = reader.staffId === myStaffId;
                  return (
                    <div
                      key={`seen-${reader.staffId}-${reader.displayName}`}
                      className="flex items-center justify-between py-2 px-2.5 rounded-xl transition-colors bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MosChatAvatar
                          size="sm"
                          src={reader.avatarUrl}
                          name={reader.displayName}
                          staffId={reader.staffId}
                          staffDirectory={staffDirectory}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm text-[var(--mos-text)] truncate">
                              {reader.displayName}
                            </span>
                            {isMe && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] font-bold">
                                Bạn
                              </span>
                            )}
                          </div>
                          {reader.role && (
                            <p className="text-xs text-[var(--mos-text-muted)] truncate">{reader.role}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-500 dark:text-emerald-400 tabular-nums shrink-0">
                        <span>{formatReadAtLabel(reader.readAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unseen Section */}
          {unseenBy.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--mos-text-muted)] uppercase tracking-wider mb-2">
                <Check className="w-3.5 h-3.5" />
                <span className="tabular-nums">Chưa xem ({unseenBy.length})</span>
              </div>

              <div className="space-y-1.5">
                {unseenBy.map((member) => (
                  <div
                    key={`unseen-${member.staffId}-${member.displayName}`}
                    className="flex items-center justify-between py-2 px-2.5 rounded-xl opacity-75 bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MosChatAvatar
                        size="sm"
                        src={member.avatarUrl}
                        name={member.displayName}
                        staffId={member.staffId}
                        staffDirectory={staffDirectory}
                      />
                      <div className="min-w-0">
                        <span className="font-medium text-sm text-[var(--mos-text)] truncate block">
                          {member.displayName}
                        </span>
                        {member.role && (
                          <p className="text-xs text-[var(--mos-text-muted)] truncate">{member.role}</p>
                        )}
                      </div>
                    </div>

                    <span className="text-xs text-[var(--mos-text-muted)] tabular-nums shrink-0">
                      Đã gửi
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

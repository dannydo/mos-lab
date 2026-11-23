'use client';

import React from 'react';
import { Input, type GlobalToken } from 'antd';
import { Check, Search, UserPlus } from 'lucide-react';
import type { MosChatAccessConfig, MosChatStaffMember, SafeAny } from '@mos-lab/shared';
import { SPACE_DEPARTMENT_AND_TEAM_GROUPS, type SpaceDepartmentOrTeamGroup } from '../constants/chat-constants';
import { matchesStaffGroup } from '../utils/chat-helpers';

export interface MosChatAccessControlListsProps {
  token: GlobalToken;
  surfaceBg: string;
  surfaceRaised: string;
  borderStrong: string;
  renderUserAvatarNode: (props: SafeAny) => React.ReactNode;
  isChatTab: boolean;
  accessConfig: MosChatAccessConfig;
  persistAccessConfig: (cfg: MosChatAccessConfig, silent?: boolean) => Promise<void> | void;
  staffDirectory: MosChatStaffMember[];
  activeGroupKeys: string[];
  activeStaffIds: number[];
  totalAllowedCount: number;
  filteredStaffForAccess: MosChatStaffMember[];
  accessStaffSearch: string;
  setAccessStaffSearch: (val: string) => void;
  accessGroupFilter: string;
  setAccessGroupFilter: (val: string) => void;
  toggleGroupKey: (groupKey: string) => void;
  toggleIndividualStaff: (staffId: number) => void;
  isStaffMemberAllowedInChat: (
    member: MosChatStaffMember,
    cfg?: MosChatAccessConfig
  ) => {
    allowed: boolean;
    reason: 'admin' | 'all' | 'individual' | 'group' | 'none';
    matchedGroups: SpaceDepartmentOrTeamGroup[];
  };
  isStaffMemberAllowedInAi: (
    member: MosChatStaffMember,
    cfg?: MosChatAccessConfig
  ) => {
    allowed: boolean;
    reason: 'admin' | 'individual' | 'group' | 'none';
    matchedGroups: SpaceDepartmentOrTeamGroup[];
  };
}

export const MosChatAccessControlLists: React.FC<MosChatAccessControlListsProps> = ({
  token,
  surfaceBg,
  surfaceRaised,
  borderStrong,
  renderUserAvatarNode,
  isChatTab,
  accessConfig,
  persistAccessConfig,
  staffDirectory,
  activeGroupKeys,
  activeStaffIds,
  totalAllowedCount,
  filteredStaffForAccess,
  accessStaffSearch,
  setAccessStaffSearch,
  accessGroupFilter,
  setAccessGroupFilter,
  toggleGroupKey,
  toggleIndividualStaff,
  isStaffMemberAllowedInChat,
  isStaffMemberAllowedInAi,
}) => {
  return (
    <>
      {/* SECTION 1: DEPARTMENT & TEAM GROUPS SELECTOR */}
      <div
        className="p-3 rounded-xl space-y-2.5"
        style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-500">
            1. Phân quyền theo Bộ phận (Department) & Đội nhóm
          </span>
          <span className="text-[10.5px] text-slate-400">
            Bấm để Bật / Tắt quyền truy cập cho toàn bộ nhân sự trong nhóm
          </span>
        </div>

        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Bộ phận chủ quản (Departments)
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter((g) => g.category === 'department').map((group) => {
              const count = staffDirectory.filter((m) => matchesStaffGroup(m, group.key)).length;
              const isEnabled = (isChatTab && accessConfig.allowAllStaff) || activeGroupKeys.includes(group.key);
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => toggleGroupKey(group.key)}
                  className="px-2.5 py-2 rounded-lg text-left flex items-center justify-between gap-2 cursor-pointer transition-all"
                  style={{
                    background: isEnabled ? `${group.color}1f` : surfaceBg,
                    border: isEnabled ? `1.5px solid ${group.color}` : `1px solid ${borderStrong}`,
                  }}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: group.color }} />
                    <div className="min-w-0">
                      <div
                        className="text-[11.5px] font-extrabold truncate"
                        style={{ color: isEnabled ? group.color : token.colorText }}
                      >
                        {group.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{group.defaultSubtitle}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-extrabold tabular-nums"
                      style={{
                        background: isEnabled ? group.color : 'rgba(148,163,184,0.16)',
                        color: isEnabled ? '#090d16' : token.colorTextSecondary,
                      }}
                    >
                      {count} người
                    </span>
                    {isEnabled && <Check size={14} style={{ color: group.color }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Đội chuyên môn (Specialized Teams)
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter((g) => g.category === 'team').map((group) => {
              const count = staffDirectory.filter((m) => matchesStaffGroup(m, group.key)).length;
              const isEnabled = (isChatTab && accessConfig.allowAllStaff) || activeGroupKeys.includes(group.key);
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => toggleGroupKey(group.key)}
                  className="px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between gap-2 cursor-pointer transition-all"
                  style={{
                    background: isEnabled ? `${group.color}1f` : surfaceBg,
                    border: isEnabled ? `1.5px solid ${group.color}` : `1px solid ${borderStrong}`,
                  }}
                >
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: group.color }} />
                    <span
                      className="text-[11px] font-bold truncate"
                      style={{ color: isEnabled ? group.color : token.colorText }}
                    >
                      {group.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className="px-1.5 py-0.2 rounded text-[9.5px] font-extrabold tabular-nums"
                      style={{
                        background: isEnabled ? group.color : 'rgba(148,163,184,0.16)',
                        color: isEnabled ? '#090d16' : token.colorTextSecondary,
                      }}
                    >
                      {count}
                    </span>
                    {isEnabled && <Check size={13} style={{ color: group.color }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: INDIVIDUAL STAFF OVERRIDE & LIVE ACCESS STATUS */}
      <div
        className="p-3 rounded-xl space-y-2.5"
        style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-violet-400">
            2. Phân quyền Đặc cách theo Cá Nhân ({activeStaffIds.length} cá nhân đặc cách · Tổng {totalAllowedCount}/
            {staffDirectory.length} nhân sự được mở)
          </span>
          {activeStaffIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (isChatTab) {
                  void persistAccessConfig({ ...accessConfig, allowedStaffIds: [] }, true);
                } else {
                  void persistAccessConfig({ ...accessConfig, aiCopilotAllowedStaffIds: [] }, true);
                }
              }}
              className="text-[10.5px] font-bold text-rose-400 hover:underline cursor-pointer shrink-0"
            >
              Xóa chọn cá nhân ({activeStaffIds.length})
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Input
            value={accessStaffSearch}
            onChange={(e) => setAccessStaffSearch(e.target.value)}
            placeholder="Tìm cá nhân theo tên, username hoặc chức danh..."
            prefix={<Search size={13} className="text-slate-400" />}
            allowClear
          />
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {[
              { key: 'ALL', label: `Tất cả (${staffDirectory.length})` },
              { key: 'ALLOWED_ONLY', label: `Đang có quyền (${totalAllowedCount})` },
              { key: 'INDIVIDUAL_ONLY', label: `Đặc cách cá nhân (${activeStaffIds.length})` },
              ...SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((g) => ({
                key: g.key,
                label: g.shortLabel,
              })),
            ].map((pill) => {
              const active = accessGroupFilter === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setAccessGroupFilter(pill.key)}
                  className="h-6 px-2 rounded-full text-[10px] font-extrabold whitespace-nowrap cursor-pointer shrink-0 transition-all"
                  style={{
                    background: active ? '#d4a84b' : surfaceBg,
                    color: active ? '#090d16' : token.colorTextSecondary,
                    border: `1px solid ${active ? '#d4a84b' : borderStrong}`,
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="max-h-[230px] overflow-y-auto rounded-lg divide-y"
          style={{
            background: surfaceBg,
            border: `1px solid ${borderStrong}`,
            borderColor: borderStrong,
          }}
        >
          {filteredStaffForAccess.length === 0 ? (
            <div className="py-6 text-center text-[11.5px] text-slate-400">
              Không tìm thấy nhân sự phù hợp với bộ lọc.
            </div>
          ) : (
            filteredStaffForAccess.map((member) => {
              const status = isChatTab
                ? isStaffMemberAllowedInChat(member, accessConfig)
                : isStaffMemberAllowedInAi(member, accessConfig);
              const isIndividualSelected = activeStaffIds.includes(member.id);

              return (
                <div key={member.id} className="p-2 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {renderUserAvatarNode({
                      staffId: member.id,
                      name: member.displayName || member.username,
                      rawAvatar: member.avatarUrl,
                      sizeClass: 'w-7 h-7',
                      roundedClass: 'rounded-full',
                    })}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[12px] font-bold truncate" style={{ color: token.colorText }}>
                          {member.displayName || member.username}
                        </span>
                        <span className="text-[10.5px] text-slate-400 truncate">@{member.username}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span>{member.role}</span>
                        <span>·</span>
                        <span
                          className="font-bold tabular-nums"
                          style={{ color: status.allowed ? '#10b981' : '#f43f5e' }}
                        >
                          {status.allowed
                            ? status.reason === 'admin'
                              ? '👑 Admin (Mặc định)'
                              : status.reason === 'all'
                                ? '🌐 Mở toàn hệ thống'
                                : status.reason === 'individual'
                                  ? '⭐ Đặc cách cá nhân'
                                  : `👥 Thuộc nhóm (${status.matchedGroups.map((g) => g.shortLabel).join(', ')})`
                            : '🔒 Đang bị chặn'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {status.reason === 'admin' ? (
                      <span
                        className="h-7 px-2.5 rounded-lg inline-flex items-center gap-1 text-[10.5px] font-extrabold"
                        style={{
                          background: 'rgba(212, 168, 75, 0.16)',
                          color: '#d4a84b',
                          border: '1px solid rgba(212, 168, 75, 0.35)',
                        }}
                      >
                        <Check size={12} /> Mặc định
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleIndividualStaff(member.id)}
                        className="h-7 px-2.5 rounded-lg inline-flex items-center gap-1 text-[11px] font-extrabold cursor-pointer transition-all"
                        style={{
                          background: isIndividualSelected
                            ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                            : status.allowed
                              ? 'rgba(16, 185, 129, 0.14)'
                              : surfaceRaised,
                          color: isIndividualSelected
                            ? '#ffffff'
                            : status.allowed
                              ? '#10b981'
                              : token.colorTextSecondary,
                          border: isIndividualSelected
                            ? '1px solid #8b5cf6'
                            : status.allowed
                              ? '1px solid rgba(16, 185, 129, 0.35)'
                              : `1px solid ${borderStrong}`,
                        }}
                      >
                        {isIndividualSelected ? (
                          <>
                            <Check size={12} />
                            <span>Đã cấp cá nhân</span>
                          </>
                        ) : status.allowed ? (
                          <>
                            <Check size={12} />
                            <span>Đã mở theo Đội (+ Cá nhân)</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={12} />
                            <span>+ Cấp quyền cá nhân</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

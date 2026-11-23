'use client';

import React from 'react';
import { Modal, type GlobalToken } from 'antd';
import { Bot, MessageSquare, ShieldCheck } from 'lucide-react';
import {
  removeVietnameseTones,
  type MosChatAccessConfig,
  type MosChatStaffMember,
  type SafeAny,
} from '@mos-lab/shared';
import { SPACE_DEPARTMENT_AND_TEAM_GROUPS, type SpaceDepartmentOrTeamGroup } from '../constants/chat-constants';
import { matchesStaffGroup } from '../utils/chat-helpers';
import { MosChatAccessControlLists } from './MosChatAccessControlLists';

export interface MosChatAccessControlModalProps {
  isMobile: boolean;
  token: GlobalToken;
  surfaceBg: string;
  surfaceRaised: string;
  borderStrong: string;
  renderUserAvatarNode: (props: SafeAny) => React.ReactNode;
  staffDirectory: MosChatStaffMember[];
  accessConfigModalOpen: boolean;
  setAccessConfigModalOpen: (open: boolean) => void;
  savingAccessConfig: boolean;
  accessConfigTab: 'chat' | 'ai';
  setAccessConfigTab: (tab: 'chat' | 'ai') => void;
  accessConfig: MosChatAccessConfig;
  persistAccessConfig: (cfg: MosChatAccessConfig, silent?: boolean) => Promise<void> | void;
  accessStaffSearch: string;
  setAccessStaffSearch: (val: string) => void;
  accessGroupFilter: string;
  setAccessGroupFilter: (val: string) => void;
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

export const MosChatAccessControlModal: React.FC<MosChatAccessControlModalProps> = ({
  isMobile,
  token,
  surfaceBg,
  surfaceRaised,
  borderStrong,
  renderUserAvatarNode,
  staffDirectory,
  accessConfigModalOpen,
  setAccessConfigModalOpen,
  savingAccessConfig,
  accessConfigTab,
  setAccessConfigTab,
  accessConfig,
  persistAccessConfig,
  accessStaffSearch,
  setAccessStaffSearch,
  accessGroupFilter,
  setAccessGroupFilter,
  isStaffMemberAllowedInChat,
  isStaffMemberAllowedInAi,
}) => {
  const isChatTab = accessConfigTab === 'chat';
  const activeGroupKeys = isChatTab
    ? accessConfig.allowedGroupKeys || []
    : accessConfig.aiCopilotAllowedGroupKeys || [];
  const activeStaffIds = isChatTab ? accessConfig.allowedStaffIds || [] : accessConfig.aiCopilotAllowedStaffIds || [];

  const toggleGroupKey = (groupKey: string) => {
    const exists = activeGroupKeys.includes(groupKey);
    const nextGroups = exists ? activeGroupKeys.filter((k: string) => k !== groupKey) : [...activeGroupKeys, groupKey];
    if (isChatTab) {
      void persistAccessConfig({ ...accessConfig, allowAllStaff: false, allowedGroupKeys: nextGroups }, true);
    } else {
      void persistAccessConfig({ ...accessConfig, aiCopilotAllowedGroupKeys: nextGroups }, true);
    }
  };

  const toggleIndividualStaff = (staffId: number) => {
    if (!staffId || staffId <= 0) return;
    const exists = activeStaffIds.includes(staffId);
    const nextStaffIds = exists ? activeStaffIds.filter((id: number) => id !== staffId) : [...activeStaffIds, staffId];
    if (isChatTab) {
      void persistAccessConfig({ ...accessConfig, allowedStaffIds: nextStaffIds }, true);
    } else {
      void persistAccessConfig({ ...accessConfig, aiCopilotAllowedStaffIds: nextStaffIds }, true);
    }
  };

  const totalAllowedCount = staffDirectory.filter((m) =>
    isChatTab ? isStaffMemberAllowedInChat(m, accessConfig).allowed : isStaffMemberAllowedInAi(m, accessConfig).allowed
  ).length;

  const q = removeVietnameseTones(accessStaffSearch.trim().toLowerCase());
  const filteredStaffForAccess = staffDirectory.filter((m) => {
    if (accessGroupFilter === 'ALLOWED_ONLY') {
      const allowed = isChatTab
        ? isStaffMemberAllowedInChat(m, accessConfig).allowed
        : isStaffMemberAllowedInAi(m, accessConfig).allowed;
      if (!allowed) return false;
    } else if (accessGroupFilter === 'INDIVIDUAL_ONLY') {
      if (!activeStaffIds.includes(m.id)) return false;
    } else if (accessGroupFilter !== 'ALL') {
      if (!matchesStaffGroup(m, accessGroupFilter)) return false;
    }
    if (!q) return true;
    const hay = removeVietnameseTones(`${m.displayName} ${m.username} ${m.role}`.toLowerCase());
    return hay.includes(q);
  });

  return (
    <Modal
      className="mos-chat-theme-scope"
      open={accessConfigModalOpen}
      zIndex={1350}
      onCancel={() => setAccessConfigModalOpen(false)}
      footer={null}
      width={isMobile ? 'calc(100vw - 24px)' : 680}
      destroyOnClose
      title={
        <div className="flex items-center justify-between pr-6">
          <div className="flex items-center gap-2 text-[14px] font-extrabold">
            <ShieldCheck size={17} className="text-violet-400" />
            <span>Phân quyền truy cập mOS Chat & mOS AI (MAI)</span>
          </div>
          {savingAccessConfig && (
            <span className="text-[11px] font-bold text-amber-400 animate-pulse">Đang lưu cấu hình...</span>
          )}
        </div>
      }
    >
      <div className="space-y-3.5 pt-2">
        <div
          className="grid grid-cols-2 gap-2 p-1 rounded-xl"
          style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
        >
          <button
            type="button"
            onClick={() => setAccessConfigTab('chat')}
            className="h-9 rounded-lg px-3 flex items-center justify-center gap-2 text-[12px] font-extrabold cursor-pointer transition-all"
            style={{
              background: isChatTab ? 'linear-gradient(135deg, #d4a84b, #b8860b)' : 'transparent',
              color: isChatTab ? '#090d16' : token.colorTextSecondary,
            }}
          >
            <MessageSquare size={14} />
            <span>
              Quyền vào mOS Chat (
              {staffDirectory.filter((m) => isStaffMemberAllowedInChat(m, accessConfig).allowed).length}/
              {staffDirectory.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAccessConfigTab('ai')}
            className="h-9 rounded-lg px-3 flex items-center justify-center gap-2 text-[12px] font-extrabold cursor-pointer transition-all"
            style={{
              background: !isChatTab ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent',
              color: !isChatTab ? '#ffffff' : token.colorTextSecondary,
            }}
          >
            <Bot size={15} />
            <span>
              Quyền dùng mOS AI (MAI) (
              {staffDirectory.filter((m) => isStaffMemberAllowedInAi(m, accessConfig).allowed).length}/
              {staffDirectory.length})
            </span>
          </button>
        </div>

        <div
          className="p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2"
          style={{
            background: isChatTab ? 'rgba(212, 168, 75, 0.08)' : 'rgba(139, 92, 246, 0.08)',
            border: isChatTab ? '1px solid rgba(212, 168, 75, 0.28)' : '1px solid rgba(139, 92, 246, 0.28)',
          }}
        >
          <div className="text-[11.5px] leading-relaxed" style={{ color: token.colorText }}>
            {isChatTab ? (
              <>
                Chọn <b>Bộ phận / Đội nhóm</b> hoặc <b>Cá nhân</b> được phép nhìn thấy biểu tượng và truy cập{' '}
                <b>mOS Chat</b>. (Admin & Danny luôn có toàn quyền).
              </>
            ) : (
              <>
                Chọn <b>Bộ phận / Đội nhóm</b> hoặc <b>Cá nhân</b> được phép chat 1-1 với <b>🤖 MAI</b> và gọi{' '}
                <code>@MAI</code> trong nhóm Space.
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {isChatTab ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    void persistAccessConfig(
                      { ...accessConfig, allowAllStaff: false, allowedGroupKeys: [], allowedStaffIds: [] },
                      true
                    )
                  }
                  className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                  style={{
                    background:
                      !accessConfig.allowAllStaff &&
                      accessConfig.allowedGroupKeys.length === 0 &&
                      accessConfig.allowedStaffIds.length === 0
                        ? '#d4a84b'
                        : surfaceBg,
                    color:
                      !accessConfig.allowAllStaff &&
                      accessConfig.allowedGroupKeys.length === 0 &&
                      accessConfig.allowedStaffIds.length === 0
                        ? '#090d16'
                        : token.colorTextSecondary,
                    border: `1px solid ${borderStrong}`,
                  }}
                >
                  👑 Chỉ Admin / Danny
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void persistAccessConfig(
                      { ...accessConfig, allowAllStaff: false, allowedGroupKeys: ['TEAM_ADMIN_MANAGER'] },
                      true
                    )
                  }
                  className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                  style={{
                    background:
                      !accessConfig.allowAllStaff &&
                      accessConfig.allowedGroupKeys.length === 1 &&
                      accessConfig.allowedGroupKeys[0] === 'TEAM_ADMIN_MANAGER'
                        ? '#f59e0b'
                        : surfaceBg,
                    color:
                      !accessConfig.allowAllStaff &&
                      accessConfig.allowedGroupKeys.length === 1 &&
                      accessConfig.allowedGroupKeys[0] === 'TEAM_ADMIN_MANAGER'
                        ? '#090d16'
                        : token.colorTextSecondary,
                    border: `1px solid ${borderStrong}`,
                  }}
                >
                  🛡️ Ban Quản Trị & Manager
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void persistAccessConfig({ ...accessConfig, allowAllStaff: !accessConfig.allowAllStaff }, true)
                  }
                  className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                  style={{
                    background: accessConfig.allowAllStaff ? '#10b981' : surfaceBg,
                    color: accessConfig.allowAllStaff ? '#052e16' : token.colorTextSecondary,
                    border: `1px solid ${accessConfig.allowAllStaff ? '#10b981' : borderStrong}`,
                  }}
                >
                  🌐 {accessConfig.allowAllStaff ? 'Đang mở Toàn hệ thống (ON)' : 'Mở Toàn hệ thống'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    void persistAccessConfig(
                      { ...accessConfig, aiCopilotAllowedGroupKeys: [], aiCopilotAllowedStaffIds: [] },
                      true
                    )
                  }
                  className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                  style={{
                    background:
                      (accessConfig.aiCopilotAllowedGroupKeys || []).length === 0 &&
                      (accessConfig.aiCopilotAllowedStaffIds || []).length === 0
                        ? '#8b5cf6'
                        : surfaceBg,
                    color:
                      (accessConfig.aiCopilotAllowedGroupKeys || []).length === 0 &&
                      (accessConfig.aiCopilotAllowedStaffIds || []).length === 0
                        ? '#ffffff'
                        : token.colorTextSecondary,
                    border: `1px solid ${borderStrong}`,
                  }}
                >
                  👑 Chỉ Admin / Danny
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void persistAccessConfig(
                      { ...accessConfig, aiCopilotAllowedGroupKeys: ['TEAM_ADMIN_MANAGER'] },
                      true
                    )
                  }
                  className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                  style={{
                    background:
                      (accessConfig.aiCopilotAllowedGroupKeys || []).length === 1 &&
                      accessConfig.aiCopilotAllowedGroupKeys?.[0] === 'TEAM_ADMIN_MANAGER'
                        ? '#a855f7'
                        : surfaceBg,
                    color:
                      (accessConfig.aiCopilotAllowedGroupKeys || []).length === 1 &&
                      accessConfig.aiCopilotAllowedGroupKeys?.[0] === 'TEAM_ADMIN_MANAGER'
                        ? '#ffffff'
                        : token.colorTextSecondary,
                    border: `1px solid ${borderStrong}`,
                  }}
                >
                  🛡️ Ban Quản Trị & Manager
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void persistAccessConfig(
                      {
                        ...accessConfig,
                        aiCopilotAllowedGroupKeys: SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((g) => g.key),
                      },
                      true
                    )
                  }
                  className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                  style={{
                    background:
                      (accessConfig.aiCopilotAllowedGroupKeys || []).length === SPACE_DEPARTMENT_AND_TEAM_GROUPS.length
                        ? '#10b981'
                        : surfaceBg,
                    color:
                      (accessConfig.aiCopilotAllowedGroupKeys || []).length === SPACE_DEPARTMENT_AND_TEAM_GROUPS.length
                        ? '#052e16'
                        : token.colorTextSecondary,
                    border: `1px solid ${borderStrong}`,
                  }}
                >
                  🌐 Mở Cho Tất Cả Bộ Phận
                </button>
              </>
            )}
          </div>
        </div>

        <MosChatAccessControlLists
          token={token}
          surfaceBg={surfaceBg}
          surfaceRaised={surfaceRaised}
          borderStrong={borderStrong}
          renderUserAvatarNode={renderUserAvatarNode}
          isChatTab={isChatTab}
          accessConfig={accessConfig}
          persistAccessConfig={persistAccessConfig}
          staffDirectory={staffDirectory}
          activeGroupKeys={activeGroupKeys}
          activeStaffIds={activeStaffIds}
          totalAllowedCount={totalAllowedCount}
          filteredStaffForAccess={filteredStaffForAccess}
          accessStaffSearch={accessStaffSearch}
          setAccessStaffSearch={setAccessStaffSearch}
          accessGroupFilter={accessGroupFilter}
          setAccessGroupFilter={setAccessGroupFilter}
          toggleGroupKey={toggleGroupKey}
          toggleIndividualStaff={toggleIndividualStaff}
          isStaffMemberAllowedInChat={isStaffMemberAllowedInChat}
          isStaffMemberAllowedInAi={isStaffMemberAllowedInAi}
        />

        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-400">
            Mọi thay đổi được lưu tự động lên máy chủ và đồng bộ tức thì cho các thành viên.
          </div>
          <button
            type="button"
            onClick={() => setAccessConfigModalOpen(false)}
            className="h-8 px-4 rounded-lg text-[12px] font-extrabold cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #d4a84b, #b8860b)', color: '#090d16' }}
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </Modal>
  );
};

'use client';

import React from 'react';
import { Modal, Select, Tooltip, Popconfirm } from 'antd';
import { Pencil, Plus, UserMinus, UserPlus, Users } from 'lucide-react';
import {
  removeVietnameseTones,
  type MosChatConversation,
  type MosChatStaffMember,
  type SafeAny,
} from '@mos-lab/shared';
import { SPACE_DEPARTMENT_AND_TEAM_GROUPS } from '../constants/chat-constants';
import { matchesStaffGroup } from '../utils/chat-helpers';

export interface MosChatSpaceMembersDesktopModalProps {
  isMobile: boolean;
  surfaceRaised: string;
  borderColor: string;
  renderUserAvatarNode: (props: SafeAny) => React.ReactNode;
  currentUser: SafeAny;
  isStrictDannySuperAdmin: boolean;
  staffDirectory: MosChatStaffMember[];
  activeConversation: MosChatConversation | null;
  spaceMembersModalOpen: boolean;
  setSpaceMembersModalOpen: (open: boolean) => void;
  addMemberSelectedStaffId: number | null;
  setAddMemberSelectedStaffId: (id: number | null) => void;
  handleAddMemberToSpace: (id: number) => Promise<void> | void;
  handleBulkAddGroupToSpace: (group: SafeAny) => Promise<void> | void;
  handleRemoveMemberFromSpace: (id: number) => Promise<void> | void;
  handleOpenNicknameModal: (staffId: number) => void;
}

export const MosChatSpaceMembersDesktopModal: React.FC<MosChatSpaceMembersDesktopModalProps> = ({
  isMobile,
  surfaceRaised,
  borderColor,
  renderUserAvatarNode,
  currentUser,
  isStrictDannySuperAdmin,
  staffDirectory,
  activeConversation,
  spaceMembersModalOpen,
  setSpaceMembersModalOpen,
  addMemberSelectedStaffId,
  setAddMemberSelectedStaffId,
  handleAddMemberToSpace,
  handleBulkAddGroupToSpace,
  handleRemoveMemberFromSpace,
  handleOpenNicknameModal,
}) => {
  return (
    <Modal
      className="mos-chat-theme-scope"
      open={spaceMembersModalOpen}
      zIndex={1350}
      onCancel={() => setSpaceMembersModalOpen(false)}
      footer={null}
      title={
        <div className="flex items-center gap-2">
          <Users size={18} className="text-blue-500" />
          <span className="text-[15px] font-extrabold">Thành viên Không gian · #{activeConversation?.name}</span>
        </div>
      }
      width={isMobile ? 'calc(100vw - 24px)' : 520}
    >
      <div className="space-y-4 py-2">
        <div className="p-3 rounded-xl border space-y-2.5" style={{ background: surfaceRaised, borderColor }}>
          <div className="text-[11.5px] font-bold text-slate-300 flex items-center gap-1.5">
            <UserPlus size={14} className="text-emerald-500" />
            <span>Thêm thành viên hoặc cả Bộ phận / Nhóm vào Không gian</span>
          </div>
          <div className="flex items-center gap-2">
            <Select
              showSearch
              className="flex-1"
              placeholder="Chọn đồng nghiệp để thêm..."
              value={addMemberSelectedStaffId}
              onChange={setAddMemberSelectedStaffId}
              filterOption={(input, option) => {
                const normInput = removeVietnameseTones(input.trim().toLowerCase());
                if (!normInput) return true;
                const normLabel = removeVietnameseTones(String(option?.label || '').toLowerCase());
                return normLabel.includes(normInput);
              }}
              options={staffDirectory
                .filter((s) => !activeConversation?.memberIds?.includes(s.id))
                .map((s) => ({
                  value: s.id,
                  label: `${s.displayName || s.username} (${s.role || 'NV'})`,
                }))}
            />
            <button
              type="button"
              disabled={!addMemberSelectedStaffId}
              onClick={async () => {
                if (addMemberSelectedStaffId) {
                  await handleAddMemberToSpace(addMemberSelectedStaffId);
                  setAddMemberSelectedStaffId(null);
                }
              }}
              className="h-8 px-3 rounded-lg text-xs font-bold text-white transition-opacity disabled:opacity-40 cursor-pointer"
              style={{ background: '#10b981' }}
            >
              Thêm
            </button>
          </div>

          <div className="pt-1 border-t" style={{ borderColor }}>
            <div className="text-[10.5px] font-bold text-slate-400 mb-1.5">
              Thêm nhanh cả Bộ phận (Department) / Nhóm:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((grp) => {
                const existingSet = new Set(activeConversation?.memberIds || []);
                const missingCount = staffDirectory.filter(
                  (m) => matchesStaffGroup(m, grp.key) && !existingSet.has(m.id)
                ).length;
                if (missingCount === 0) return null;
                return (
                  <button
                    key={grp.key}
                    type="button"
                    onClick={() => handleBulkAddGroupToSpace(grp)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] font-bold cursor-pointer transition-all hover:opacity-90"
                    style={{
                      background: `${grp.color}18`,
                      border: `1px solid ${grp.color}66`,
                      color: grp.color,
                    }}
                  >
                    <Plus size={11} />
                    <span>{grp.label}</span>
                    <span className="tabular-nums opacity-85">(+{missingCount})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Danh sách thành viên hiện tại</span>
            <span className="text-emerald-400 font-extrabold tabular-nums">
              {activeConversation?.memberCount || activeConversation?.memberIds?.length || 1} người
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {staffDirectory
              .filter((s) => activeConversation?.memberIds?.includes(s.id))
              .map((m) => {
                const isMe = Number(m.id) === Number(currentUser?.id);
                const isAdm = m.role?.toLowerCase().includes('admin');
                const nick = activeConversation?.memberNicknames?.[String(m.id)];
                const canEditNick = isMe || isStrictDannySuperAdmin;

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-lg border gap-2"
                    style={{ background: surfaceRaised, borderColor }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {renderUserAvatarNode({
                        name: m.displayName || m.username,
                        avatarUrl: m.avatarUrl,
                        staffId: m.id,
                        sizeClass: 'w-8 h-8',
                        textClass: 'text-xs',
                        bgStyle: isAdm ? '#a855f7' : '#3b82f6',
                        onlineDot: Boolean(m.isOnline),
                      })}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {nick ? (
                            <>
                              <span className="font-extrabold text-[12.5px] text-emerald-400 truncate">{nick}</span>
                              <span className="text-[11px] text-slate-400 truncate font-normal">
                                ({m.displayName || m.username})
                              </span>
                            </>
                          ) : (
                            <span className="font-bold text-[12.5px] truncate">{m.displayName || m.username}</span>
                          )}
                          {isMe && (
                            <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <span>{m.role || 'Nhân sự'}</span>
                          {nick && <span className="text-emerald-500/80 font-medium">· Đã đặt biệt danh</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {canEditNick && (
                        <Tooltip
                          title={
                            isMe
                              ? 'Đổi biệt danh của bạn trong Không gian này'
                              : `Đổi biệt danh cho ${m.displayName || m.username}`
                          }
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenNicknameModal(m.id)}
                            className="h-7 px-2 rounded-md inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:bg-amber-500/10 cursor-pointer transition-colors"
                          >
                            <Pencil size={11} />
                            <span>{nick ? 'Sửa biệt danh' : 'Đặt biệt danh'}</span>
                          </button>
                        </Tooltip>
                      )}

                      {!isMe && (
                        <Popconfirm
                          title="Xóa thành viên"
                          description={`Bạn có chắc muốn xóa ${m.displayName || m.username} khỏi Không gian này?`}
                          onConfirm={() => handleRemoveMemberFromSpace(m.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <button
                            type="button"
                            aria-label={`Xóa ${m.displayName || m.username} khỏi nhóm`}
                            className="h-7 px-2 rounded-md inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                          >
                            <UserMinus size={13} />
                            <span>Xóa</span>
                          </button>
                        </Popconfirm>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </Modal>
  );
};

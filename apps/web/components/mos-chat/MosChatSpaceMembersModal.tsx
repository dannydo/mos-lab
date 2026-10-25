'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Modal, Select, Input, Tooltip, Popconfirm, message as antdMessage } from 'antd';
import { Users, UserPlus, UserMinus, Plus, Pencil, Check, X, Search } from 'lucide-react';
import {
  removeVietnameseTones,
  isCanonicalSuperAdminIdentity,
  type MosChatConversation,
  type MosChatStaffMember,
  type SafeAny,
} from '@mos-lab/shared';
import { useMosChat } from './context/MosChatContext';
import { MosChatAvatar } from './MosChatAvatar';
import { SPACE_DEPARTMENT_AND_TEAM_GROUPS, type SpaceDepartmentOrTeamGroup } from './constants/chat-constants';
import { matchesStaffGroup } from './utils/chat-helpers';
import { apiClient } from '../../lib/api-client';

export interface MosChatSpaceMembersModalProps {
  open: boolean;
  conversation: MosChatConversation | null;
  onClose: () => void;
  onUpdated?: (updatedConv: MosChatConversation) => void;
}

export const MosChatSpaceMembersModal: React.FC<MosChatSpaceMembersModalProps> = ({
  open,
  conversation,
  onClose,
  onUpdated,
}) => {
  const {
    staffDirectory,
    currentUser,
    addMemberToSpace,
    removeMemberFromSpace,
    updateMemberNickname,
  } = useMosChat();

  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [searchMemberQuery, setSearchMemberQuery] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [bulkAddingKey, setBulkAddingKey] = useState<string | null>(null);

  // Nickname editing state
  const [editingNicknameStaffId, setEditingNicknameStaffId] = useState<number | null>(null);
  const [nicknameInput, setNicknameInput] = useState<string>('');
  const [isSavingNickname, setIsSavingNickname] = useState<boolean>(false);

  const myStaffId = useMemo(() => {
    return Number(currentUser?.staffId) || Number(currentUser?.id) || 0;
  }, [currentUser]);

  const isSuperAdmin = useMemo(() => {
    return isCanonicalSuperAdminIdentity(currentUser) || Boolean(currentUser?.role?.toLowerCase().includes('admin'));
  }, [currentUser]);

  // Current members in space
  const memberIdSet = useMemo(() => {
    if (!conversation) return new Set<number>();
    const ids = new Set<number>((conversation.memberIds || []).map(Number));
    (conversation.members || []).forEach((m) => ids.add(Number(m.id)));
    return ids;
  }, [conversation]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    if (!conversation) return [];
    let list = staffDirectory.filter((s) => memberIdSet.has(Number(s.id)));
    if (searchMemberQuery.trim()) {
      const qNorm = removeVietnameseTones(searchMemberQuery.trim().toLowerCase());
      list = list.filter((m) => {
        const nameNorm = removeVietnameseTones((m.displayName || m.username || '').toLowerCase());
        const nick = conversation.memberNicknames?.[String(m.id)];
        const nickNorm = nick ? removeVietnameseTones(nick.toLowerCase()) : '';
        const roleNorm = removeVietnameseTones((m.role || '').toLowerCase());
        return nameNorm.includes(qNorm) || nickNorm.includes(qNorm) || roleNorm.includes(qNorm);
      });
    }
    return list;
  }, [conversation, staffDirectory, memberIdSet, searchMemberQuery]);

  // Staff available to add (not yet members)
  const availableToAdd = useMemo(() => {
    return staffDirectory
      .filter((s) => !memberIdSet.has(Number(s.id)))
      .map((s) => ({
        value: Number(s.id),
        label: `${s.displayName || s.username} (${s.role || 'Nhân sự'})`,
      }));
  }, [staffDirectory, memberIdSet]);

  // Add individual member
  const handleAddMember = async () => {
    if (!selectedStaffId || !conversation) return;
    setIsAdding(true);
    try {
      let updated: MosChatConversation | null = null;
      if (addMemberToSpace) {
        updated = await addMemberToSpace(selectedStaffId, conversation.id);
      } else {
        const res = await apiClient.chat.addMember(conversation.id, selectedStaffId);
        updated = res?.conversation || null;
      }
      antdMessage.success('Đã thêm thành viên vào Không gian');
      setSelectedStaffId(null);
      if (updated && onUpdated) onUpdated(updated);
    } catch (err: SafeAny) {
      antdMessage.error(err?.message || 'Không thể thêm thành viên');
    } finally {
      setIsAdding(false);
    }
  };

  // 1-Click Bulk Add entire department / team
  const handleBulkAddGroup = async (group: SpaceDepartmentOrTeamGroup) => {
    if (!conversation) return;
    const missingIds = staffDirectory
      .filter((m) => matchesStaffGroup(m, group.key) && !memberIdSet.has(Number(m.id)))
      .map((m) => Number(m.id));

    if (missingIds.length === 0) {
      antdMessage.info(`Tất cả thành viên của ${group.label} đã có mặt trong Không gian này`);
      return;
    }

    setBulkAddingKey(group.key);
    try {
      let updated: MosChatConversation | null = null;
      if (addMemberToSpace) {
        updated = await addMemberToSpace(missingIds, conversation.id);
      } else {
        const res = await apiClient.chat.addMember(conversation.id, missingIds);
        updated = res?.conversation || null;
      }
      antdMessage.success(`Đã thêm ${missingIds.length} thành viên thuộc ${group.label} vào Không gian`);
      if (updated && onUpdated) onUpdated(updated);
    } catch (err: SafeAny) {
      antdMessage.error(err?.message || 'Không thể thêm nhóm thành viên');
    } finally {
      setBulkAddingKey(null);
    }
  };

  // Remove member
  const handleRemoveMember = async (targetStaffId: number) => {
    if (!conversation) return;
    try {
      let updated: MosChatConversation | null = null;
      if (removeMemberFromSpace) {
        updated = await removeMemberFromSpace(targetStaffId, conversation.id);
      } else {
        const res = await apiClient.chat.removeMember(conversation.id, targetStaffId);
        updated = res?.conversation || null;
      }
      antdMessage.success('Đã xóa thành viên khỏi Không gian');
      if (updated && onUpdated) onUpdated(updated);
    } catch (err: SafeAny) {
      antdMessage.error(err?.message || 'Không thể xóa thành viên');
    }
  };

  // Start editing nickname
  const startEditingNickname = (staffId: number, currentNick?: string) => {
    setEditingNicknameStaffId(staffId);
    setNicknameInput(currentNick || '');
  };

  // Save nickname
  const handleSaveNickname = async () => {
    if (!conversation || !editingNicknameStaffId) return;
    setIsSavingNickname(true);
    const trimmed = nicknameInput.trim();
    try {
      if (updateMemberNickname) {
        await updateMemberNickname(editingNicknameStaffId, trimmed, conversation.id);
      } else {
        await apiClient.chat.updateNickname(conversation.id, {
          targetStaffId: editingNicknameStaffId,
          nickname: trimmed,
        });
      }
      antdMessage.success(trimmed ? 'Đã lưu biệt danh thành công' : 'Đã xóa biệt danh');
      setEditingNicknameStaffId(null);
      setNicknameInput('');
    } catch (err: SafeAny) {
      antdMessage.error(err?.message || 'Không thể cập nhật biệt danh');
    } finally {
      setIsSavingNickname(false);
    }
  };

  if (!conversation) return null;

  const totalMembers = conversation.memberCount || memberIdSet.size || 1;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      zIndex={1350}
      footer={null}
      centered
      width={540}
      title={
        <div className="flex items-center gap-2 pr-6">
          <Users size={18} className="text-blue-500 shrink-0" />
          <span className="text-[15px] font-extrabold truncate text-slate-900 dark:text-slate-100">
            Thành viên Không gian · #{conversation.name}
          </span>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Add member section */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 space-y-3">
          <div className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <UserPlus size={14} className="text-emerald-500" />
            <span>Thêm đồng nghiệp hoặc cả Bộ phận / Nhóm vào Không gian</span>
          </div>

          <div className="flex items-center gap-2">
            <Select
              showSearch
              className="flex-1"
              placeholder="Chọn đồng nghiệp để thêm..."
              value={selectedStaffId}
              onChange={setSelectedStaffId}
              disabled={isAdding}
              filterOption={(input, option) => {
                const normInput = removeVietnameseTones(input.trim().toLowerCase());
                if (!normInput) return true;
                const normLabel = removeVietnameseTones(String(option?.label || '').toLowerCase());
                return normLabel.includes(normInput);
              }}
              options={availableToAdd}
              notFoundContent={<div className="p-2 text-xs text-slate-400">Không tìm thấy đồng nghiệp phù hợp</div>}
            />
            <button
              type="button"
              disabled={!selectedStaffId || isAdding}
              onClick={handleAddMember}
              className="h-8 px-3.5 rounded-lg text-xs font-bold text-white transition-opacity disabled:opacity-40 cursor-pointer bg-emerald-600 hover:bg-emerald-700 active:scale-95 shrink-0"
            >
              {isAdding ? 'Đang thêm...' : 'Thêm'}
            </button>
          </div>

          {/* 1-Click Add Entire Department / Team into Existing Space */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <div className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
              Thêm nhanh cả Bộ phận / Nhóm:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((grp) => {
                const missingCount = staffDirectory.filter(
                  (m) => matchesStaffGroup(m, grp.key) && !memberIdSet.has(Number(m.id))
                ).length;
                if (missingCount === 0) return null;
                const isGroupLoading = bulkAddingKey === grp.key;
                return (
                  <button
                    key={grp.key}
                    type="button"
                    disabled={Boolean(bulkAddingKey)}
                    onClick={() => handleBulkAddGroup(grp)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold cursor-pointer transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                    style={{
                      background: `${grp.color}18`,
                      border: `1px solid ${grp.color}66`,
                      color: grp.color,
                    }}
                  >
                    <Plus size={11} />
                    <span>{grp.label}</span>
                    <span className="tabular-nums opacity-85">
                      {isGroupLoading ? '(Đang thêm...)' : `(+${missingCount})`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Current members list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Danh sách thành viên hiện tại
            </span>
            <span className="text-emerald-500 font-extrabold tabular-nums text-xs">
              {totalMembers} người
            </span>
          </div>

          {/* Search within members */}
          {memberIdSet.size > 5 && (
            <div className="mb-2">
              <Input
                size="small"
                prefix={<Search size={13} className="text-slate-400 mr-1" />}
                placeholder="Tìm thành viên trong không gian..."
                value={searchMemberQuery}
                onChange={(e) => setSearchMemberQuery(e.target.value)}
                allowClear
              />
            </div>
          )}

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {filteredMembers.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Không tìm thấy thành viên phù hợp
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isMe = Number(m.id) === myStaffId;
                const canEditNick = isMe || isSuperAdmin;
                const nick = conversation.memberNicknames?.[String(m.id)];
                const isEditingThis = editingNicknameStaffId === Number(m.id);

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <MosChatAvatar
                        staffId={m.id}
                        src={m.avatarUrl}
                        name={nick || m.displayName || m.username}
                        size="md"
                        showOnline={true}
                        isOnline={Boolean(m.isOnline)}
                      />
                      <div className="min-w-0 flex-1">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1.5 py-0.5">
                            <Input
                              size="small"
                              value={nicknameInput}
                              onChange={(e) => setNicknameInput(e.target.value)}
                              placeholder="Nhập biệt danh..."
                              maxLength={40}
                              onPressEnter={handleSaveNickname}
                              className="text-xs max-w-[160px]"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={handleSaveNickname}
                              disabled={isSavingNickname}
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer text-xs"
                              title="Lưu biệt danh"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingNicknameStaffId(null)}
                              className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 cursor-pointer text-xs"
                              title="Hủy"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {nick ? (
                                <>
                                  <span className="font-extrabold text-[12.5px] text-emerald-500 dark:text-emerald-400 truncate">
                                    {nick}
                                  </span>
                                  <span className="text-[11px] text-slate-400 truncate font-normal">
                                    ({m.displayName || m.username})
                                  </span>
                                </>
                              ) : (
                                <span className="font-bold text-[12.5px] text-slate-900 dark:text-slate-100 truncate">
                                  {m.displayName || m.username}
                                </span>
                              )}
                              {isMe && (
                                <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 dark:text-blue-400">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span>{m.role || 'Nhân sự'}</span>
                              {nick && (
                                <span className="text-emerald-500/80 font-medium">· Biệt danh</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {!isEditingThis && (
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
                              onClick={() => startEditingNickname(Number(m.id), nick)}
                              className="h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:bg-amber-500/10 cursor-pointer transition-colors"
                            >
                              <Pencil size={11} />
                              <span className="hidden sm:inline">{nick ? 'Sửa' : 'Biệt danh'}</span>
                            </button>
                          </Tooltip>
                        )}

                        {/* Remove button */}
                        {!isMe && (isSuperAdmin || canEditNick) && (
                          <Popconfirm
                            title="Xóa thành viên"
                            description={`Bạn có chắc muốn xóa ${m.displayName || m.username} khỏi Không gian này?`}
                            onConfirm={() => handleRemoveMember(Number(m.id))}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <button
                              type="button"
                              aria-label={`Xóa ${m.displayName || m.username} khỏi nhóm`}
                              className="h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                            >
                              <UserMinus size={13} />
                              <span className="hidden sm:inline">Xóa</span>
                            </button>
                          </Popconfirm>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

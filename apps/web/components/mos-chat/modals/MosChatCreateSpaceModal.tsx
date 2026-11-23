'use client';

import React from 'react';
import { Modal, Input, Select, type GlobalToken } from 'antd';
import { Check, Hash, MessageSquare, Minus, Search, Users } from 'lucide-react';
import { removeVietnameseTones, type MosChatStaffMember, type SafeAny } from '@mos-lab/shared';
import { SPACE_DEPARTMENT_AND_TEAM_GROUPS } from '../constants/chat-constants';
import { matchesStaffGroup } from '../utils/chat-helpers';
import { MosChatSpaceEmojiColorPicker } from '../MosChatSpaceEmojiColorPicker';

export interface MosChatCreateSpaceModalProps {
  isMobile: boolean;
  token: GlobalToken;
  surfaceRaised: string;
  canvasBg: string;
  borderColor: string;
  renderUserAvatarNode: (props: SafeAny) => React.ReactNode;
  currentUser: SafeAny;
  staffDirectory: MosChatStaffMember[];
  newRoomModalOpen: boolean;
  setNewRoomModalOpen: (open: boolean) => void;
  newRoomType: 'space' | 'dm';
  roomSearchQuery: string;
  setRoomSearchQuery: (val: string) => void;
  roomGroupFilter: string;
  setRoomGroupFilter: (val: string) => void;
  selectedMemberIds: number[];
  setSelectedMemberIds: React.Dispatch<React.SetStateAction<number[]>>;
  newRoomEmoji: string;
  setNewRoomEmoji: (val: string) => void;
  newRoomColor: string;
  setNewRoomColor: (val: string) => void;
  newRoomName: string;
  setNewRoomName: (val: string) => void;
  newRoomSubtitle: string;
  setNewRoomSubtitle: (val: string) => void;
  handleCreateSpace: () => Promise<void> | void;
  handleSelectSelfChat: () => Promise<void> | void;
  handleSelectColleague: (colleague: MosChatStaffMember) => Promise<void> | void;
  handleToggleDepartmentOrTeam: (group: SafeAny) => void;
}

export const MosChatCreateSpaceModal: React.FC<MosChatCreateSpaceModalProps> = ({
  isMobile,
  token,
  surfaceRaised,
  canvasBg,
  borderColor,
  renderUserAvatarNode,
  currentUser,
  staffDirectory,
  newRoomModalOpen,
  setNewRoomModalOpen,
  newRoomType,
  roomSearchQuery,
  setRoomSearchQuery,
  roomGroupFilter,
  setRoomGroupFilter,
  selectedMemberIds,
  setSelectedMemberIds,
  newRoomEmoji,
  setNewRoomEmoji,
  newRoomColor,
  setNewRoomColor,
  newRoomName,
  setNewRoomName,
  newRoomSubtitle,
  setNewRoomSubtitle,
  handleCreateSpace,
  handleSelectSelfChat,
  handleSelectColleague,
  handleToggleDepartmentOrTeam,
}) => {
  return (
    <Modal
      className="mos-chat-theme-scope"
      open={newRoomModalOpen}
      zIndex={1350}
      onCancel={() => {
        setNewRoomModalOpen(false);
        setRoomSearchQuery('');
        setRoomGroupFilter('ALL');
        setSelectedMemberIds([]);
      }}
      footer={
        newRoomType === 'space' ? (
          <div className="flex items-center justify-between pt-2">
            <span className="text-[12px] text-slate-400 font-medium tabular-nums">
              Đã chọn: <strong className="text-emerald-500">{selectedMemberIds.length}</strong> thành viên
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewRoomModalOpen(false);
                  setRoomSearchQuery('');
                  setRoomGroupFilter('ALL');
                  setSelectedMemberIds([]);
                  setNewRoomEmoji('');
                  setNewRoomColor('#1a73e8');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}`, color: token.colorText }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateSpace}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer"
                style={{ background: '#3b82f6' }}
              >
                Tạo Space
              </button>
            </div>
          </div>
        ) : null
      }
      title={
        <span className="text-[15px] font-extrabold flex items-center gap-2">
          {newRoomType === 'space' ? (
            <>
              <Hash size={18} className="text-blue-500" />
              <span>Tạo Không gian làm việc mới (Space)</span>
            </>
          ) : (
            <>
              <MessageSquare size={18} className="text-emerald-500" />
              <span>Bắt đầu cuộc trò chuyện 1-1</span>
            </>
          )}
        </span>
      }
      width={isMobile ? 'calc(100vw - 24px)' : 520}
    >
      {newRoomType === 'dm' ? (
        <div className="space-y-3 py-2">
          <Input
            prefix={<Search size={14} className="text-slate-400 mr-1" />}
            value={roomSearchQuery}
            onChange={(e) => setRoomSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc username đồng nghiệp..."
            allowClear
          />

          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setRoomGroupFilter('ALL')}
              className="px-2 py-1 rounded-full text-[10.5px] font-bold shrink-0 cursor-pointer transition-colors"
              style={{
                background: roomGroupFilter === 'ALL' ? '#3b82f6' : surfaceRaised,
                color: roomGroupFilter === 'ALL' ? '#ffffff' : token.colorTextSecondary,
                border: `1px solid ${roomGroupFilter === 'ALL' ? '#3b82f6' : borderColor}`,
              }}
            >
              Tất cả ({staffDirectory.length})
            </button>
            {SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((grp) => {
              const count = staffDirectory.filter((m) => matchesStaffGroup(m, grp.key)).length;
              if (count === 0) return null;
              const active = roomGroupFilter === grp.key;
              return (
                <button
                  key={grp.key}
                  type="button"
                  onClick={() => setRoomGroupFilter(active ? 'ALL' : grp.key)}
                  className="px-2 py-1 rounded-full text-[10.5px] font-bold shrink-0 cursor-pointer transition-colors"
                  style={{
                    background: active ? `${grp.color}28` : surfaceRaised,
                    color: active ? grp.color : token.colorTextSecondary,
                    border: `1px solid ${active ? grp.color : borderColor}`,
                  }}
                >
                  {grp.label} ({count})
                </button>
              );
            })}
          </div>

          <div
            onClick={handleSelectSelfChat}
            className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all hover:brightness-105 border border-amber-500/30"
            style={{ background: 'rgba(212, 168, 75, 0.08)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
              style={{ background: '#d4a84b', color: '#000' }}
            >
              Tôi
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[12.5px] text-amber-500">Tin nhắn cho chính tôi (Self Chat)</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                  Sổ tay cá nhân
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Lưu trữ ghi chú, nháp tin nhắn, ảnh, tài liệu và tạo task nhắc hẹn riêng tư
              </div>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
              Danh bạ đồng nghiệp ({staffDirectory.length})
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {staffDirectory
                .filter((m) => {
                  if (Number(m.id) === Number(currentUser?.id)) return false;
                  if (roomGroupFilter !== 'ALL' && !matchesStaffGroup(m, roomGroupFilter)) return false;
                  if (!roomSearchQuery.trim()) return true;
                  const q = removeVietnameseTones(roomSearchQuery.trim().toLowerCase());
                  const name = removeVietnameseTones((m.displayName || '').toLowerCase());
                  const user = removeVietnameseTones((m.username || '').toLowerCase());
                  const role = removeVietnameseTones((m.role || '').toLowerCase());
                  return name.includes(q) || user.includes(q) || role.includes(q);
                })
                .map((m) => {
                  const isAdm = m.role?.toLowerCase().includes('admin');
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleSelectColleague(m)}
                      className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-500/10"
                      style={{ border: `1px solid ${borderColor}` }}
                    >
                      {renderUserAvatarNode({
                        name: m.displayName || m.username,
                        avatarUrl: m.avatarUrl,
                        staffId: m.id,
                        sizeClass: 'w-8 h-8',
                        textClass: 'text-xs',
                        bgStyle: isAdm ? '#a855f7' : '#3b82f6',
                        onlineDot: Boolean(m.isOnline),
                      })}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[12.5px] truncate">{m.displayName || m.username}</span>
                          <span
                            className="text-[9.5px] font-bold px-1.5 py-0.5 rounded leading-none shrink-0"
                            style={{
                              background: isAdm ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: isAdm ? '#c084fc' : '#60a5fa',
                            }}
                          >
                            {m.role || 'Nhân sự'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">@{m.username}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 py-2">
          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Biểu tượng Emoji & Màu sắc Space
            </div>
            <MosChatSpaceEmojiColorPicker
              selectedEmoji={newRoomEmoji}
              selectedColor={newRoomColor}
              spaceName={newRoomName}
              onEmojiChange={setNewRoomEmoji}
              onColorChange={setNewRoomColor}
              size="large"
            />
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-1">Tên Không gian (Space) *</div>
            <Input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="VD: ke-hoach-tuan-moi, chien-dich-tet"
            />
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-1">Mục đích hoạt động (Tùy chọn)</div>
            <Input
              value={newRoomSubtitle}
              onChange={(e) => setNewRoomSubtitle(e.target.value)}
              placeholder="VD: Không gian trao đổi ban quản trị và trưởng bộ phận"
            />
          </div>

          <div
            className="p-2.5 rounded-xl space-y-2"
            style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={13} />
                <span>Chọn nhanh theo Bộ phận (Department) & Nhóm</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedMemberIds(staffDirectory.map((s) => s.id))}
                  className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 cursor-pointer"
                >
                  Chọn tất cả ({staffDirectory.length})
                </button>
                {selectedMemberIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const myId = Number(currentUser?.id);
                      setSelectedMemberIds(myId ? [myId] : []);
                    }}
                    className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 mb-1">Bộ phận (Department):</div>
              <div className="grid grid-cols-2 gap-1.5">
                {SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter((g) => g.category === 'department').map((dept) => {
                  const deptMembers = staffDirectory.filter((m) => matchesStaffGroup(m, dept.key));
                  const total = deptMembers.length;
                  const selectedCount = deptMembers.filter((m) => selectedMemberIds.includes(m.id)).length;
                  const isAllSelected = total > 0 && selectedCount === total;
                  const isPartial = selectedCount > 0 && selectedCount < total;

                  return (
                    <button
                      key={dept.key}
                      type="button"
                      onClick={() => handleToggleDepartmentOrTeam(dept)}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-all"
                      style={{
                        background: isAllSelected ? `${dept.color}24` : isPartial ? `${dept.color}12` : canvasBg,
                        border: `1px solid ${isAllSelected || isPartial ? dept.color : borderColor}`,
                      }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-white"
                          style={{
                            background: isAllSelected || isPartial ? dept.color : 'transparent',
                            border: `1px solid ${isAllSelected || isPartial ? dept.color : '#64748b'}`,
                          }}
                        >
                          {isAllSelected ? (
                            <Check size={10} strokeWidth={3} />
                          ) : isPartial ? (
                            <Minus size={10} strokeWidth={3} />
                          ) : null}
                        </span>
                        <span className="text-[11.5px] font-bold truncate" style={{ color: token.colorText }}>
                          {dept.label}
                        </span>
                      </div>
                      <span
                        className="text-[10.5px] font-extrabold tabular-nums ml-1.5 shrink-0"
                        style={{ color: isAllSelected || isPartial ? dept.color : token.colorTextSecondary }}
                      >
                        {selectedCount}/{total}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 mb-1">Nhóm chuyên môn (Team / Chức danh):</div>
              <div className="flex flex-wrap gap-1.5">
                {SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter((g) => g.category === 'team').map((team) => {
                  const teamMembers = staffDirectory.filter((m) => matchesStaffGroup(m, team.key));
                  const total = teamMembers.length;
                  const selectedCount = teamMembers.filter((m) => selectedMemberIds.includes(m.id)).length;
                  const isAllSelected = total > 0 && selectedCount === total;
                  const isPartial = selectedCount > 0 && selectedCount < total;

                  return (
                    <button
                      key={team.key}
                      type="button"
                      onClick={() => handleToggleDepartmentOrTeam(team)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-left cursor-pointer transition-all"
                      style={{
                        background: isAllSelected ? `${team.color}24` : isPartial ? `${team.color}12` : canvasBg,
                        border: `1px solid ${isAllSelected || isPartial ? team.color : borderColor}`,
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-full flex items-center justify-center shrink-0 text-white"
                        style={{
                          background: isAllSelected || isPartial ? team.color : 'transparent',
                          border: `1px solid ${isAllSelected || isPartial ? team.color : '#64748b'}`,
                        }}
                      >
                        {isAllSelected ? (
                          <Check size={8} strokeWidth={3} />
                        ) : isPartial ? (
                          <Minus size={8} strokeWidth={3} />
                        ) : null}
                      </span>
                      <span className="text-[10.5px] font-bold whitespace-nowrap" style={{ color: token.colorText }}>
                        {team.label}
                      </span>
                      <span
                        className="text-[9.5px] font-extrabold tabular-nums opacity-85"
                        style={{ color: isAllSelected || isPartial ? team.color : token.colorTextSecondary }}
                      >
                        ({selectedCount}/{total})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Chọn thành viên tham gia nhóm
              </span>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {selectedMemberIds.length}/{staffDirectory.length} người
              </span>
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <Input
                prefix={<Search size={13} className="text-slate-400 mr-1" />}
                value={roomSearchQuery}
                onChange={(e) => setRoomSearchQuery(e.target.value)}
                placeholder="Tìm thành viên..."
                size="small"
                className="flex-1"
                allowClear
              />
              <Select
                size="small"
                value={roomGroupFilter}
                onChange={setRoomGroupFilter}
                className="w-44"
                options={[
                  { value: 'ALL', label: `Tất cả bộ phận (${staffDirectory.length})` },
                  ...SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((g) => ({
                    value: g.key,
                    label: `${g.label} (${staffDirectory.filter((m) => matchesStaffGroup(m, g.key)).length})`,
                  })),
                ]}
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {staffDirectory
                .filter((m) => {
                  if (roomGroupFilter !== 'ALL' && !matchesStaffGroup(m, roomGroupFilter)) return false;
                  if (!roomSearchQuery.trim()) return true;
                  const q = removeVietnameseTones(roomSearchQuery.trim().toLowerCase());
                  const name = removeVietnameseTones((m.displayName || '').toLowerCase());
                  const user = removeVietnameseTones((m.username || '').toLowerCase());
                  const role = removeVietnameseTones((m.role || '').toLowerCase());
                  return name.includes(q) || user.includes(q) || role.includes(q);
                })
                .map((m) => {
                  const isSelected = selectedMemberIds.includes(m.id);
                  const isMe = Number(m.id) === Number(currentUser?.id);
                  const isAdm = m.role?.toLowerCase().includes('admin');
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (isMe) return;
                        setSelectedMemberIds((prev) =>
                          prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                        );
                      }}
                      className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors border ${
                        isSelected ? 'border-blue-500/50 bg-blue-500/10' : 'border-transparent hover:bg-slate-500/10'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border text-white shrink-0 ${
                          isSelected || isMe ? 'bg-blue-500 border-blue-500' : 'border-slate-400'
                        }`}
                      >
                        {(isSelected || isMe) && <Check size={11} strokeWidth={3} />}
                      </div>
                      {renderUserAvatarNode({
                        name: m.displayName || m.username,
                        avatarUrl: m.avatarUrl,
                        staffId: m.id,
                        sizeClass: 'w-6 h-6',
                        textClass: 'text-[10px]',
                        bgStyle: isAdm ? '#a855f7' : '#3b82f6',
                        onlineDot: Boolean(m.isOnline),
                      })}
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="text-xs font-semibold truncate">
                          {m.displayName || m.username} {isMe && '(Bạn - Trưởng nhóm)'}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1 shrink-0">{m.role}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

'use client';

import React from 'react';
import { Modal, Input, Tooltip, Popconfirm, type GlobalToken } from 'antd';
import {
  Bell,
  BellOff,
  Eye,
  EyeOff,
  FolderKanban,
  FolderPlus,
  Hash,
  Pencil,
  Pin,
  Plus,
  RotateCcw,
  Sliders,
  X,
} from 'lucide-react';
import type { MosChatConversation, SafeAny } from '@mos-lab/shared';

export interface MosChatSidebarCustomizationModalsProps {
  isMobile: boolean;
  token: GlobalToken;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
  renderUserAvatarNode: (props: SafeAny) => React.ReactNode;
  currentUser: SafeAny;
  quickCreateSectionModalOpen: boolean;
  setQuickCreateSectionModalOpen: (open: boolean) => void;
  quickCreateSectionTargetConvId: string | null;
  setQuickCreateSectionTargetConvId: (id: string | null) => void;
  quickCreateSectionName: string;
  setQuickCreateSectionName: (val: string) => void;
  handleCreateCustomSection: (name: string, targetConvId?: string | null) => void;
  sidebarCustomizeModalOpen: boolean;
  setSidebarCustomizeModalOpen: (open: boolean) => void;
  editingSectionId: string | null;
  setEditingSectionId: (id: string | null) => void;
  sidebarCustomizeTab: 'sections' | 'conversations';
  setSidebarCustomizeTab: (tab: 'sections' | 'conversations') => void;
  sidebarSections: SafeAny[];
  allUserConversations: MosChatConversation[];
  userPrefs: SafeAny;
  handleResetSidebarPrefs: () => void;
  newSectionNameInput: string;
  setNewSectionNameInput: (val: string) => void;
  editingSectionNameInput: string;
  setEditingSectionNameInput: (val: string) => void;
  handleRenameCustomSection: (id: string, name: string) => void;
  handleDeleteCustomSection: (id: string) => void;
  handleMoveSectionOrder: (id: string, dir: 'up' | 'down') => void;
  togglePinConversation: (id: string, pinned?: boolean) => void | Promise<SafeAny>;
  toggleMuteConversation: (id: string) => void;
  toggleHideConversation: (conv: MosChatConversation) => void;
}

export const MosChatSidebarCustomizationModals: React.FC<MosChatSidebarCustomizationModalsProps> = ({
  isMobile,
  token,
  surfaceBg,
  surfaceRaised,
  borderColor,
  renderUserAvatarNode,
  currentUser,
  quickCreateSectionModalOpen,
  setQuickCreateSectionModalOpen,
  quickCreateSectionTargetConvId,
  setQuickCreateSectionTargetConvId,
  quickCreateSectionName,
  setQuickCreateSectionName,
  handleCreateCustomSection,
  sidebarCustomizeModalOpen,
  setSidebarCustomizeModalOpen,
  editingSectionId,
  setEditingSectionId,
  sidebarCustomizeTab,
  setSidebarCustomizeTab,
  sidebarSections,
  allUserConversations,
  userPrefs,
  handleResetSidebarPrefs,
  newSectionNameInput,
  setNewSectionNameInput,
  editingSectionNameInput,
  setEditingSectionNameInput,
  handleRenameCustomSection,
  handleDeleteCustomSection,
  handleMoveSectionOrder,
  togglePinConversation,
  toggleMuteConversation,
  toggleHideConversation,
}) => {
  return (
    <>
      {/* ================= QUICK CREATE CUSTOM SECTION MODAL ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={quickCreateSectionModalOpen}
        onCancel={() => {
          setQuickCreateSectionModalOpen(false);
          setQuickCreateSectionTargetConvId(null);
        }}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 420}
        centered
        zIndex={1350}
        title={
          <div className="flex items-center gap-2">
            <FolderPlus size={16} className="text-sky-400" />
            <span className="font-extrabold text-[14px]">Tạo mục tuỳ chỉnh mới (Google Chat Section)</span>
          </div>
        }
      >
        <div className="space-y-3 pt-2">
          <div className="text-[12px] text-slate-400">
            Tạo mục riêng để nhóm các cuộc trò chuyện 1-1 hoặc #Spaces quan trọng theo ý của bạn (ví dụ:{' '}
            <span className="font-semibold text-amber-400">⭐ Ưu tiên</span>,{' '}
            <span className="font-semibold text-amber-400">📌 Ca hôm nay</span>,{' '}
            <span className="font-semibold text-amber-400">Khách VIP</span>).
          </div>
          <Input
            value={quickCreateSectionName}
            onChange={(e) => setQuickCreateSectionName(e.target.value)}
            placeholder="Nhập tên mục tuỳ chỉnh..."
            maxLength={40}
            autoFocus
            onPressEnter={(e) => {
              e.preventDefault();
              const name = quickCreateSectionName.trim();
              if (!name) return;
              setQuickCreateSectionName('');
              setQuickCreateSectionModalOpen(false);
              const target = quickCreateSectionTargetConvId;
              setQuickCreateSectionTargetConvId(null);
              handleCreateCustomSection(name, target);
            }}
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setQuickCreateSectionModalOpen(false);
                setQuickCreateSectionTargetConvId(null);
                setQuickCreateSectionName('');
              }}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer"
              style={{
                background: surfaceRaised,
                border: `1px solid ${borderColor}`,
                color: token.colorTextSecondary,
              }}
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const name = quickCreateSectionName.trim();
                if (!name) return;
                setQuickCreateSectionName('');
                setQuickCreateSectionModalOpen(false);
                const target = quickCreateSectionTargetConvId;
                setQuickCreateSectionTargetConvId(null);
                handleCreateCustomSection(name, target);
              }}
              className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              Tạo mục
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= PERSONAL SIDEBAR CUSTOMIZATION MODAL (GOOGLE CHAT WORKSPACE) ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={sidebarCustomizeModalOpen}
        onCancel={() => {
          setSidebarCustomizeModalOpen(false);
          setEditingSectionId(null);
        }}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 680}
        centered
        zIndex={1350}
        title={
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <FolderKanban size={17} style={{ color: '#d4a84b' }} />
              <span className="font-extrabold text-[14.5px]">Tuỳ chỉnh Danh sách Cá nhân (Google Chat Workspace)</span>
            </div>
            <span className="inline-flex items-center justify-center leading-none py-1 px-2.5 rounded-full text-[10.5px] font-bold bg-amber-500/15 text-amber-400">
              Lưu riêng cho {currentUser?.displayName || currentUser?.username || 'bạn'}
            </span>
          </div>
        }
      >
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <div
              className="inline-flex p-1 rounded-xl gap-1"
              style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
            >
              <button
                type="button"
                onClick={() => setSidebarCustomizeTab('sections')}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5"
                style={{
                  background: sidebarCustomizeTab === 'sections' ? surfaceBg : 'transparent',
                  color: sidebarCustomizeTab === 'sections' ? '#d4a84b' : token.colorTextSecondary,
                }}
              >
                <FolderKanban size={14} />
                <span>1. Quản lý Mục & Thứ tự ({sidebarSections.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSidebarCustomizeTab('conversations')}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5"
                style={{
                  background: sidebarCustomizeTab === 'conversations' ? surfaceBg : 'transparent',
                  color: sidebarCustomizeTab === 'conversations' ? '#d4a84b' : token.colorTextSecondary,
                }}
              >
                <Sliders size={14} />
                <span>
                  2. Quản lý DIRECT MESSAGES & SPACES ({allUserConversations.length})
                  {(userPrefs.hiddenIds?.length || 0) > 0 ? ` · ${userPrefs.hiddenIds.length} đang ẩn` : ''}
                </span>
              </button>
            </div>

            <Popconfirm
              title="Khôi phục bố cục danh sách về mặc định?"
              description="Các mục tuỳ chỉnh, ghim và danh sách ẩn của bạn sẽ được đặt lại."
              onConfirm={handleResetSidebarPrefs}
              okText="Đặt lại"
              cancelText="Huỷ"
            >
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold inline-flex items-center gap-1 cursor-pointer hover:bg-rose-500/10 text-rose-400"
                style={{ border: `1px solid ${borderColor}` }}
              >
                <RotateCcw size={12} />
                <span>Đặt lại mặc định</span>
              </button>
            </Popconfirm>
          </div>

          {sidebarCustomizeTab === 'sections' ? (
            <div className="space-y-3">
              <div
                className="p-3 rounded-xl space-y-2"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                <div className="text-[12px] font-bold flex items-center gap-1.5">
                  <FolderPlus size={14} className="text-sky-400" />
                  <span>Tạo mục tuỳ chỉnh mới (Giống Custom Sections trên Google Chat)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={newSectionNameInput}
                    onChange={(e) => setNewSectionNameInput(e.target.value)}
                    placeholder="Ví dụ: ⭐ Quan trọng, 📌 Ca làm việc hôm nay, Dự án VIP..."
                    maxLength={40}
                    onPressEnter={(e) => {
                      e.preventDefault();
                      const name = newSectionNameInput.trim();
                      if (!name) return;
                      setNewSectionNameInput('');
                      handleCreateCustomSection(name);
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const name = newSectionNameInput.trim();
                      if (!name) return;
                      setNewSectionNameInput('');
                      handleCreateCustomSection(name);
                    }}
                    className="px-3.5 h-8 rounded-lg text-[12px] font-bold cursor-pointer bg-amber-500 text-slate-950 hover:bg-amber-400 shrink-0 inline-flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Thêm mục</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                {sidebarSections.map((sec, idx) => {
                  const isEditing = editingSectionId === sec.id;
                  return (
                    <div
                      key={sec.id}
                      className="px-3 py-2.5 rounded-xl flex items-center justify-between gap-2"
                      style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-[11px] font-extrabold text-slate-400 tabular-nums shrink-0 w-4">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                size="small"
                                value={editingSectionNameInput}
                                onChange={(e) => setEditingSectionNameInput(e.target.value)}
                                onPressEnter={() => {
                                  const name = editingSectionNameInput.trim();
                                  if (name) {
                                    handleRenameCustomSection(sec.id, name);
                                    setEditingSectionId(null);
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const name = editingSectionNameInput.trim();
                                  if (name) {
                                    handleRenameCustomSection(sec.id, name);
                                    setEditingSectionId(null);
                                  }
                                }}
                                className="px-2.5 py-1 rounded text-xs font-bold bg-amber-500 text-slate-950"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSectionId(null)}
                                className="px-2 py-1 rounded text-xs text-slate-400"
                              >
                                Huỷ
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-[13px]">{sec.name}</span>
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded leading-none shrink-0"
                                style={{
                                  background: sec.isSystem ? 'rgba(59, 130, 246, 0.15)' : 'rgba(212, 168, 75, 0.15)',
                                  color: sec.isSystem ? '#60a5fa' : '#d4a84b',
                                }}
                              >
                                {sec.isSystem ? 'Hệ thống' : 'Tuỳ chỉnh cá nhân'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveSectionOrder(sec.id, 'up')}
                          className="w-7 h-7 rounded inline-flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-white/10"
                          title="Di chuyển lên trên"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={idx === sidebarSections.length - 1}
                          onClick={() => handleMoveSectionOrder(sec.id, 'down')}
                          className="w-7 h-7 rounded inline-flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-white/10"
                          title="Di chuyển xuống dưới"
                        >
                          ↓
                        </button>
                        {!sec.isSystem && !isEditing && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSectionId(sec.id);
                                setEditingSectionNameInput(sec.name);
                              }}
                              className="w-7 h-7 rounded inline-flex items-center justify-center cursor-pointer hover:bg-white/10 text-amber-400"
                              title="Đổi tên mục"
                            >
                              <Pencil size={12} />
                            </button>
                            <Popconfirm
                              title="Xoá mục tuỳ chỉnh này?"
                              description="Các cuộc trò chuyện trong mục sẽ được chuyển về vị trí mặc định."
                              onConfirm={() => handleDeleteCustomSection(sec.id)}
                              okText="Xoá"
                              cancelText="Huỷ"
                            >
                              <button
                                type="button"
                                className="w-7 h-7 rounded inline-flex items-center justify-center cursor-pointer hover:bg-rose-500/15 text-rose-400"
                                title="Xoá mục"
                              >
                                <X size={13} />
                              </button>
                            </Popconfirm>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {allUserConversations.map((conv) => {
                const isPinned = (userPrefs.pinnedIds || []).includes(conv.id);
                const isMuted = (userPrefs.mutedIds || []).includes(conv.id);
                const isHidden = (userPrefs.hiddenIds || []).includes(conv.id);
                const isAiConv = conv.id === 'ai-copilot-dm';

                return (
                  <div
                    key={conv.id}
                    className="px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 transition-colors"
                    style={{
                      background: surfaceRaised,
                      border: `1px solid ${borderColor}`,
                      opacity: isHidden ? 0.5 : 1,
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {conv.type === 'dm' ? (
                        renderUserAvatarNode({
                          staffId: conv.participantStaffId,
                          name: conv.name,
                          avatarUrl: conv.avatar,
                          sizeClass: 'w-7 h-7',
                          textClass: 'text-[10px]',
                        })
                      ) : (
                        <Hash size={15} style={{ color: conv.color || '#10b981' }} className="shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-[12.5px] truncate">{conv.name}</span>
                          {isHidden && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 font-bold shrink-0">
                              Đang ẩn
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-slate-400 truncate">
                          {conv.type === 'dm' ? 'Cuộc trò chuyện 1-1' : `Không gian #${conv.name}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip title={isPinned ? 'Bỏ ghim' : 'Ghim lên đầu mục'}>
                        <button
                          type="button"
                          onClick={() => togglePinConversation(conv.id)}
                          className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer"
                          style={{
                            background: isPinned ? 'rgba(212, 168, 75, 0.2)' : surfaceBg,
                            border: `1px solid ${isPinned ? '#d4a84b' : borderColor}`,
                            color: isPinned ? '#d4a84b' : token.colorTextSecondary,
                          }}
                        >
                          <Pin size={13} />
                        </button>
                      </Tooltip>

                      <Tooltip title={isMuted ? 'Bật thông báo' : 'Tắt thông báo'}>
                        <button
                          type="button"
                          onClick={() => toggleMuteConversation(conv.id)}
                          className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer"
                          style={{
                            background: isMuted ? 'rgba(239, 68, 68, 0.16)' : surfaceBg,
                            border: `1px solid ${isMuted ? 'rgba(239, 68, 68, 0.4)' : borderColor}`,
                            color: isMuted ? '#f87171' : token.colorTextSecondary,
                          }}
                        >
                          {isMuted ? <BellOff size={13} /> : <Bell size={13} />}
                        </button>
                      </Tooltip>

                      {!isAiConv && (
                        <Tooltip title={isHidden ? 'Hiện lại trên danh sách' : 'Ẩn khỏi danh sách'}>
                          <button
                            type="button"
                            onClick={() => toggleHideConversation(conv)}
                            className="px-2 h-7 rounded-md inline-flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer"
                            style={{
                              background: isHidden ? 'rgba(16, 185, 129, 0.16)' : surfaceBg,
                              border: `1px solid ${isHidden ? 'rgba(16, 185, 129, 0.4)' : borderColor}`,
                              color: isHidden ? '#34d399' : token.colorTextSecondary,
                            }}
                          >
                            {isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                            <span>{isHidden ? 'Hiện lại' : 'Ẩn'}</span>
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

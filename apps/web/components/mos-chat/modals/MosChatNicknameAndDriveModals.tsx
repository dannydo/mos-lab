'use client';

import React from 'react';
import { Modal, Input } from 'antd';
import { HardDrive, ImagePlus, Pencil } from 'lucide-react';
import type { MosChatConversation, SafeAny } from '@mos-lab/shared';

export interface MosChatNicknameAndDriveModalsProps {
  isMobile: boolean;
  surfaceRaised: string;
  borderColor: string;
  borderStrong: string;
  activeConversation: MosChatConversation | null;
  editingNicknameTarget: { staffId: number; displayName: string; currentNickname: string; isMe: boolean } | null;
  setEditingNicknameTarget: (target: SafeAny) => void;
  nicknameInputVal: string;
  setNicknameInputVal: (val: string) => void;
  isUpdatingNickname: boolean;
  handleSaveNickname: (overrideVal?: string) => Promise<void> | void;
  driveLinkModalOpen: boolean;
  setDriveLinkModalOpen: (open: boolean) => void;
  driveLinkInput: string;
  setDriveLinkInput: (val: string) => void;
  handleConfirmDriveLink: () => void;
  triggerFilePicker: (scope: SafeAny, convId?: string) => void;
  uploadTargetRef: React.MutableRefObject<{ scope: SafeAny; convId?: string }>;
}

export const MosChatNicknameAndDriveModals: React.FC<MosChatNicknameAndDriveModalsProps> = ({
  isMobile,
  surfaceRaised,
  borderColor,
  borderStrong,
  activeConversation,
  editingNicknameTarget,
  setEditingNicknameTarget,
  nicknameInputVal,
  setNicknameInputVal,
  isUpdatingNickname,
  handleSaveNickname,
  driveLinkModalOpen,
  setDriveLinkModalOpen,
  driveLinkInput,
  setDriveLinkInput,
  handleConfirmDriveLink,
  triggerFilePicker,
  uploadTargetRef,
}) => {
  return (
    <>
      {/* ================= MODAL: EDIT MEMBER NICKNAME IN GROUP (PER-SPACE NICKNAMES) ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={Boolean(editingNicknameTarget)}
        zIndex={1400}
        onCancel={() => {
          if (!isUpdatingNickname) {
            setEditingNicknameTarget(null);
            setNicknameInputVal('');
          }
        }}
        footer={null}
        width={420}
        title={
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-amber-500" />
            <span className="text-[14.5px] font-extrabold">
              {editingNicknameTarget?.isMe
                ? 'Đổi biệt danh của bạn'
                : `Đổi biệt danh cho ${editingNicknameTarget?.displayName || 'thành viên'}`}
            </span>
          </div>
        }
      >
        <div className="py-2 space-y-3">
          <div className="text-[12px] text-slate-400">
            Biệt danh này chỉ áp dụng riêng cho Không gian{' '}
            <strong className="text-amber-500 font-bold">#{activeConversation?.name}</strong>. Mọi người trong nhóm sẽ
            thấy tên này và có thể tag bạn bằng biệt danh này.
          </div>

          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-300">Biệt danh trong nhóm:</label>
            <Input
              autoFocus
              placeholder="Nhập biệt danh (VD: Danny Cực Chill, Bé Hoa Lash...)"
              value={nicknameInputVal}
              maxLength={40}
              onChange={(e) => setNicknameInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveNickname();
                }
              }}
              disabled={isUpdatingNickname}
            />
            <div className="text-[10.5px] text-slate-500 flex justify-between pt-0.5">
              <span>Để trống và bấm Lưu nếu muốn quay lại tên thật ban đầu.</span>
              <span className="tabular-nums">{nicknameInputVal.length}/40</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor }}>
            {editingNicknameTarget?.currentNickname && (
              <button
                type="button"
                disabled={isUpdatingNickname}
                onClick={() => handleSaveNickname('')}
                className="h-8 px-3 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors mr-auto"
              >
                Gỡ biệt danh
              </button>
            )}
            <button
              type="button"
              disabled={isUpdatingNickname}
              onClick={() => {
                setEditingNicknameTarget(null);
                setNicknameInputVal('');
              }}
              className="h-8 px-3 rounded-lg text-xs font-bold text-slate-400 hover:bg-white/5 cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isUpdatingNickname}
              onClick={() => handleSaveNickname(nicknameInputVal)}
              className="h-8 px-4 rounded-lg text-xs font-bold text-black transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
              style={{ background: '#d4a84b' }}
            >
              {isUpdatingNickname ? 'Đang lưu...' : 'Lưu biệt danh'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: ATTACH IMAGE FROM GOOGLE DRIVE / LOCAL DRIVE ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={driveLinkModalOpen}
        zIndex={1350}
        onCancel={() => setDriveLinkModalOpen(false)}
        onOk={handleConfirmDriveLink}
        okText="Đính kèm hình Drive"
        cancelText="Đóng"
        title={
          <span className="flex items-center gap-2 text-[14px] font-bold">
            <HardDrive size={16} className="text-amber-500" />
            <span>Tải hình từ Google Drive / Ổ đĩa</span>
          </span>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 430}
      >
        <div className="space-y-3 py-1">
          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-1">
              Cách 1: Dán đường dẫn hình ảnh trên Google Drive
            </div>
            <Input
              value={driveLinkInput}
              onChange={(e) => setDriveLinkInput(e.target.value)}
              onPressEnter={handleConfirmDriveLink}
              placeholder="https://drive.google.com/file/d/..."
            />
          </div>

          <div className="pt-1">
            <div className="text-[11px] font-bold text-slate-400 mb-1.5">
              Cách 2: Chọn tệp hình từ Google Drive Desktop / Máy tính
            </div>
            <button
              type="button"
              onClick={() => {
                setDriveLinkModalOpen(false);
                const target = uploadTargetRef.current;
                triggerFilePicker(target.scope, target.convId);
              }}
              className="w-full h-9 rounded-lg inline-flex items-center justify-center gap-2 text-[12px] font-bold cursor-pointer"
              style={{
                background: surfaceRaised,
                border: `1px dashed ${borderStrong}`,
                color: '#d4a84b',
              }}
            >
              <ImagePlus size={15} />
              <span>Chọn tệp ảnh từ Ổ đĩa / Google Drive...</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

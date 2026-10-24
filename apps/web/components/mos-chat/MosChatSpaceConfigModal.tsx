'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Input, message as antdMessage, theme, Tooltip } from 'antd';
import { Settings, Hash, Users, Sparkles } from 'lucide-react';
import type { MosChatConversation } from '@mos-lab/shared';
import { MosChatSpaceEmojiColorPicker } from './MosChatSpaceEmojiColorPicker';
import { chatApi } from '../../lib/api/chat.api';

export interface MosChatSpaceConfigModalProps {
  open: boolean;
  conversation: MosChatConversation | null;
  onClose: () => void;
  onUpdated: (updatedConv: MosChatConversation) => void;
  onOpenMembersModal?: () => void;
}

export const MosChatSpaceConfigModal: React.FC<MosChatSpaceConfigModalProps> = ({
  open,
  conversation,
  onClose,
  onUpdated,
  onOpenMembersModal,
}) => {
  const { token } = theme.useToken();
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [emoji, setEmoji] = useState('');
  const [color, setColor] = useState('#1a73e8');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (conversation && open) {
      setName(conversation.name || '');
      setSubtitle(conversation.subtitle || '');
      setEmoji(conversation.avatar || '');
      setColor(conversation.color || '#1a73e8');
    }
  }, [conversation, open]);

  const handleSave = async () => {
    if (!conversation) return;
    const cleanName = name.trim();
    if (!cleanName) {
      antdMessage.warning('Vui lòng nhập tên Không gian (Space)');
      return;
    }

    setSaving(true);
    try {
      const res = await chatApi.chat.updateSpaceConfig(conversation.id, {
        name: cleanName,
        subtitle: subtitle.trim(),
        avatar: emoji.trim(),
        color: color.trim() || '#1a73e8',
      });

      if (res?.success && res.conversation) {
        antdMessage.success('Đã lưu cấu hình Không gian thành công!');
        onUpdated(res.conversation);
        onClose();
      } else {
        antdMessage.error('Không thể lưu cấu hình Không gian');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Có lỗi xảy ra khi lưu cấu hình';
      antdMessage.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!conversation) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      closable={true}
      title={
        <div className="flex items-center gap-2 text-[15px] font-extrabold pr-6">
          <Settings size={18} className="text-blue-500" />
          <span>Cài đặt & Cấu hình Không gian (Space Settings)</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between pt-2">
          {onOpenMembersModal ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMembersModal();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-600 hover:underline cursor-pointer"
            >
              <Users size={14} />
              <span>Quản lý thành viên ({conversation.memberCount || conversation.memberIds?.length || 1})</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>
      }
      width={540}
      centered
    >
      <div className="space-y-4 py-2">
        {/* Emoji & Theme Color Picker */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
            Biểu tượng đại diện & Nhận diện thương hiệu
          </div>
          <MosChatSpaceEmojiColorPicker
            selectedEmoji={emoji}
            selectedColor={color}
            spaceName={name}
            onEmojiChange={setEmoji}
            onColorChange={setColor}
            size="large"
          />
        </div>

        {/* Space Name */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 mb-1">
            Tên Không gian (Space) <span className="text-rose-500">*</span>
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: ke-hoach-tuan-moi, chien-dich-tet"
            prefix={<Hash size={14} className="text-slate-400 mr-1" />}
            maxLength={80}
          />
          <p className="text-[10.5px] text-slate-400 mt-1">
            Tên không gian được chuẩn hóa dạng slug (chữ thường, gạch nối) để đồng nghiệp dễ tag và tìm kiếm.
          </p>
        </div>

        {/* Subtitle / Purpose */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 mb-1">
            Mục đích hoạt động / Mô tả Không gian
          </div>
          <Input.TextArea
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="VD: Không gian trao đổi chiến dịch, cập nhật tiến độ công việc và giải quyết vấn đề nóng"
            rows={2}
            maxLength={255}
          />
        </div>
      </div>
    </Modal>
  );
};

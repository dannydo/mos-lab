'use client';

import React from 'react';
import { Button, Checkbox, Popconfirm, Space, message } from 'antd';
import dayjs from 'dayjs';
import { ArrowLeft, Copy, MessageCircle, RotateCcw, Save, Settings2 } from 'lucide-react';
import {
  DEFAULT_ACADEMY_WORKSHOP_ZALO_TEMPLATES,
  type AcademyWorkshopDetail,
  type AcademyWorkshopParticipant,
  type AcademyWorkshopZaloTemplate,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AdaptiveModal, AppIcon } from '../../../../components/ui';
import { interpolateZaloTemplate } from './zalo-script/zalo-script-utils';
import { ZaloTemplateManagerView } from './zalo-script/ZaloTemplateManagerView';
import { ZaloSendScriptView } from './zalo-script/ZaloSendScriptView';

export interface AcademyWorkshopZaloScriptModalProps {
  open: boolean;
  onClose: () => void;
  workshop: AcademyWorkshopDetail;
  participant: AcademyWorkshopParticipant | null;
  onMarkInfoSent?: (participant: AcademyWorkshopParticipant) => void;
}

export default function AcademyWorkshopZaloScriptModal({
  open,
  onClose,
  workshop,
  participant,
  onMarkInfoSent,
}: AcademyWorkshopZaloScriptModalProps) {
  const [templates, setTemplates] = React.useState<AcademyWorkshopZaloTemplate[]>(
    DEFAULT_ACADEMY_WORKSHOP_ZALO_TEMPLATES
  );
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>('confirm');
  const [activeMessage, setActiveMessage] = React.useState<string>('');
  const [isCustomEdited, setIsCustomEdited] = React.useState(false);
  const [autoMarkSent, setAutoMarkSent] = React.useState(true);

  // Management Mode State
  const [isManaging, setIsManaging] = React.useState(false);
  const [editingTemplateId, setEditingTemplateId] = React.useState<string>('confirm');
  const [editTitle, setEditTitle] = React.useState<string>('');
  const [editContent, setEditContent] = React.useState<string>('');
  const [isSaving, setIsSaving] = React.useState(false);

  const editTextAreaRef = React.useRef<any>(null);

  const participantName = participant?.lead.name || 'chị';
  const qrUrl =
    participant?.qrUrl ||
    (typeof window !== 'undefined' && participant?.qrToken
      ? `${window.location.origin}/academy/workshops/join/${encodeURIComponent(participant.qrToken)}`
      : '');

  const mealsText = React.useMemo(() => {
    if (!participant?.menuSelections.length) return 'Tự do thưởng thức';
    return participant.menuSelections.map((s) => s.itemName).join(' + ');
  }, [participant]);

  const equipmentText = React.useMemo(() => {
    if (!participant?.equipmentSelection) return 'Bộ dụng cụ cơ bản';
    return participant.equipmentSelection.packageName;
  }, [participant]);

  const variables = React.useMemo(() => {
    const startsAtText = dayjs(workshop.startsAt).format('HH:mm, [ngày] DD/MM/YYYY');
    const startTimeText = dayjs(workshop.startsAt).format('HH:mm');
    const checkinTimeText = dayjs(workshop.startsAt).subtract(15, 'minute').format('HH:mm');

    return {
      ten_hoc_vien: participantName,
      ten_workshop: workshop.name,
      thoi_gian: startsAtText,
      gio_bat_dau: startTimeText,
      gio_don_khach: checkinTimeText,
      dia_diem: workshop.location || 'Học viện Wings Academy',
      suat_an: mealsText,
      dung_cu: equipmentText,
      qr_link: qrUrl || 'Link check-in được gửi tại bàn đón khách',
      sdt: participant?.lead.phone || '',
    };
  }, [equipmentText, mealsText, participant?.lead.phone, participantName, qrUrl, workshop]);

  // Load templates from API
  const loadTemplates = React.useCallback(async () => {
    try {
      const data = await apiClient.academySales.workshops.listZaloTemplates();
      if (Array.isArray(data) && data.length > 0) {
        setTemplates(data);
      }
    } catch {
      // fallback to default
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      loadTemplates();
      setIsManaging(false);
      setIsCustomEdited(false);
    }
  }, [open, loadTemplates]);

  // When templates or selectedTemplateId or variables change, update activeMessage
  React.useEffect(() => {
    const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (currentTemplate) {
      const interpolated = interpolateZaloTemplate(currentTemplate.content, variables);
      setActiveMessage(interpolated);
      setIsCustomEdited(false);
    }
  }, [selectedTemplateId, templates, variables]);

  // Sync editing fields when editingTemplateId changes
  React.useEffect(() => {
    const t = templates.find((item) => item.id === editingTemplateId) || templates[0];
    if (t) {
      setEditTitle(t.title);
      setEditContent(t.content);
    }
  }, [editingTemplateId, templates]);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
  };

  const handleResetToTemplate = () => {
    const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (currentTemplate) {
      const interpolated = interpolateZaloTemplate(currentTemplate.content, variables);
      setActiveMessage(interpolated);
      setIsCustomEdited(false);
      message.info('Đã tải lại nội dung chuẩn theo mẫu.');
    }
  };

  const handleCopyPhone = () => {
    if (!participant?.lead.phone) return;
    navigator.clipboard
      .writeText(participant.lead.phone)
      .then(() => {
        message.success(`Đã sao chép SĐT: ${participant.lead.phone}`);
      })
      .catch(() => message.error('Không thể sao chép SĐT.'));
  };

  const handleCopy = React.useCallback(() => {
    if (!activeMessage.trim()) {
      message.warning('Nội dung tin nhắn trống.');
      return;
    }
    navigator.clipboard
      .writeText(activeMessage)
      .then(() => {
        message.success(`Đã sao chép tin nhắn Zalo gửi ${participantName}!`);
        if (autoMarkSent && participant && onMarkInfoSent && !participant.infoSentAt) {
          onMarkInfoSent(participant);
        }
        onClose();
      })
      .catch(() => message.error('Không thể sao chép văn bản.'));
  }, [activeMessage, autoMarkSent, onClose, onMarkInfoSent, participant, participantName]);

  // Template Management Handlers
  const handleAddNewTemplate = () => {
    const newId = `custom_${Date.now()}`;
    const newTitle = `${templates.length + 1}. Mẫu mới`;
    const newTmpl: AcademyWorkshopZaloTemplate = {
      id: newId,
      title: newTitle,
      content: `Dạ em chào chị {{ten_hoc_vien}}!\n\nThông báo từ Workshop {{ten_workshop}}.\nThời gian: {{thoi_gian}}\nĐịa điểm: {{dia_diem}}`,
    };
    const updated = [...templates, newTmpl];
    setTemplates(updated);
    setEditingTemplateId(newId);
    setEditTitle(newTitle);
    setEditContent(newTmpl.content);
    setIsManaging(true);
    message.success('Đã thêm mẫu kịch bản mới.');
  };

  const handleDeleteTemplate = (idToDelete: string) => {
    if (templates.length <= 1) {
      message.warning('Phải giữ lại ít nhất 1 mẫu kịch bản.');
      return;
    }
    const updated = templates.filter((t) => t.id !== idToDelete);
    setTemplates(updated);
    if (editingTemplateId === idToDelete) {
      setEditingTemplateId(updated[0].id);
    }
    if (selectedTemplateId === idToDelete) {
      setSelectedTemplateId(updated[0].id);
    }
    message.info('Đã xóa mẫu kịch bản.');
  };

  const handleSaveAllTemplates = async () => {
    setIsSaving(true);
    try {
      // Sync current editing template first
      const updated = templates.map((t) =>
        t.id === editingTemplateId ? { ...t, title: editTitle.trim() || t.title, content: editContent } : t
      );
      setTemplates(updated);
      const saved = await apiClient.academySales.workshops.saveZaloTemplates(updated);
      if (Array.isArray(saved)) {
        setTemplates(saved);
      }
      message.success('Đã lưu toàn bộ mẫu kịch bản Zalo vào hệ thống!');
      setIsManaging(false);
    } catch {
      message.error('Không thể lưu mẫu kịch bản. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setIsSaving(true);
    try {
      const saved = await apiClient.academySales.workshops.saveZaloTemplates(DEFAULT_ACADEMY_WORKSHOP_ZALO_TEMPLATES);
      setTemplates(saved || DEFAULT_ACADEMY_WORKSHOP_ZALO_TEMPLATES);
      setSelectedTemplateId('confirm');
      setEditingTemplateId('confirm');
      message.success('Đã khôi phục về các mẫu mặc định ban đầu.');
      setIsManaging(false);
    } catch {
      message.error('Không thể khôi phục mẫu mặc định.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertTag = (tag: string) => {
    const textarea = editTextAreaRef.current?.resizableTextArea?.textArea;
    if (!textarea) {
      setEditContent((prev) => prev + tag);
      return;
    }
    const start = textarea.selectionStart ?? editContent.length;
    const end = textarea.selectionEnd ?? editContent.length;
    const nextContent = editContent.substring(0, start) + tag + editContent.substring(end);
    setEditContent(nextContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleSwitchEditingTemplate = (nextId: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === editingTemplateId ? { ...t, title: editTitle, content: editContent } : t))
    );
    setEditingTemplateId(nextId);
  };

  const handleChangeEditTitle = (value: string) => {
    setEditTitle(value);
    setTemplates((prev) => prev.map((t) => (t.id === editingTemplateId ? { ...t, title: value } : t)));
  };

  const handleChangeEditContent = (value: string) => {
    setEditContent(value);
    setTemplates((prev) => prev.map((t) => (t.id === editingTemplateId ? { ...t, content: value } : t)));
  };

  const handleChangeActiveMessage = (value: string) => {
    setActiveMessage(value);
    setIsCustomEdited(true);
  };

  if (!participant) return null;

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 shrink-0">
              <AppIcon icon={MessageCircle} size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base text-slate-900 dark:text-slate-100">
                  {isManaging ? 'Quản lý mẫu kịch bản Zalo' : 'Gửi kịch bản Zalo cho học viên'}
                </span>
                {!isManaging && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium border border-blue-200/60 dark:border-blue-800/60">
                    {participant.lead.name}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">
                {isManaging
                  ? 'Tùy chỉnh nội dung và các biến thông tin tự động của từng mẫu'
                  : 'Chọn mẫu kịch bản phù hợp theo từng giai đoạn tham gia Workshop'}
              </p>
            </div>
          </div>
          <div>
            {!isManaging ? (
              <Button
                size="small"
                icon={<AppIcon icon={Settings2} size={13} />}
                onClick={() => {
                  setEditingTemplateId(selectedTemplateId);
                  setIsManaging(true);
                }}
                className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs"
              >
                Quản lý mẫu
              </Button>
            ) : (
              <Button
                size="small"
                icon={<AppIcon icon={ArrowLeft} size={13} />}
                onClick={() => setIsManaging(false)}
                className="text-slate-600 dark:text-slate-300 text-xs"
              >
                Quay lại gửi tin
              </Button>
            )}
          </div>
        </div>
      }
      width={880}
      footer={
        isManaging ? (
          <div className="flex items-center justify-between w-full pt-1">
            <Popconfirm
              title="Khôi phục mẫu mặc định?"
              description="Hành động này sẽ ghi đè toàn bộ mẫu hiện tại về các mẫu chuẩn ban đầu."
              okText="Khôi phục"
              cancelText="Hủy"
              onConfirm={handleResetDefaults}
            >
              <Button danger icon={<AppIcon icon={RotateCcw} size="sm" />} disabled={isSaving}>
                Khôi phục mẫu gốc
              </Button>
            </Popconfirm>
            <Space size={8}>
              <Button onClick={() => setIsManaging(false)} disabled={isSaving}>
                Hủy bỏ
              </Button>
              <Button
                type="primary"
                icon={<AppIcon icon={Save} size="sm" />}
                loading={isSaving}
                onClick={handleSaveAllTemplates}
              >
                Lưu toàn bộ mẫu
              </Button>
            </Space>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full pt-1">
            <Checkbox
              checked={autoMarkSent}
              onChange={(e) => setAutoMarkSent(e.target.checked)}
              disabled={Boolean(participant.infoSentAt)}
              className="text-xs"
            >
              {participant.infoSentAt ? 'Đã đánh dấu gửi thông tin' : 'Tự động tick "Đã gửi thông tin" cho học viên'}
            </Checkbox>
            <Space size={8}>
              <Button onClick={onClose}>Đóng</Button>
              <Button
                type="primary"
                icon={<AppIcon icon={Copy} size={14} />}
                onClick={handleCopy}
                className="bg-blue-600 hover:bg-blue-700 font-medium px-4"
              >
                Sao chép tin nhắn Zalo
              </Button>
            </Space>
          </div>
        )
      }
    >
      {isManaging ? (
        <ZaloTemplateManagerView
          templates={templates}
          editingTemplateId={editingTemplateId}
          editTitle={editTitle}
          editContent={editContent}
          editTextAreaRef={editTextAreaRef}
          onAddNewTemplate={handleAddNewTemplate}
          onSwitchTemplate={handleSwitchEditingTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onChangeEditTitle={handleChangeEditTitle}
          onChangeEditContent={handleChangeEditContent}
          onInsertTag={handleInsertTag}
        />
      ) : (
        <ZaloSendScriptView
          participant={participant}
          mealsText={mealsText}
          equipmentText={equipmentText}
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          activeMessage={activeMessage}
          isCustomEdited={isCustomEdited}
          onCopyPhone={handleCopyPhone}
          onSelectTemplate={handleSelectTemplate}
          onResetToTemplate={handleResetToTemplate}
          onChangeActiveMessage={handleChangeActiveMessage}
        />
      )}
    </AdaptiveModal>
  );
}

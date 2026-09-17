'use client';

import React from 'react';
import { Button, Checkbox, Input, InputRef, Popconfirm, Space, Tooltip, message } from 'antd';
import dayjs from 'dayjs';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  MessageCircle,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_ACADEMY_WORKSHOP_ZALO_TEMPLATES,
  type AcademyWorkshopDetail,
  type AcademyWorkshopParticipant,
  type AcademyWorkshopZaloTemplate,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AdaptiveModal, AppIcon, StatusTag } from '../../../../components/ui';

export interface AcademyWorkshopZaloScriptModalProps {
  open: boolean;
  onClose: () => void;
  workshop: AcademyWorkshopDetail;
  participant: AcademyWorkshopParticipant | null;
  onMarkInfoSent?: (participant: AcademyWorkshopParticipant) => void;
}

const VARIABLE_TAGS = [
  { tag: '{{ten_hoc_vien}}', label: 'Tên học viên' },
  { tag: '{{ten_workshop}}', label: 'Tên Workshop' },
  { tag: '{{thoi_gian}}', label: 'Ngày & Giờ' },
  { tag: '{{gio_bat_dau}}', label: 'Giờ bắt đầu' },
  { tag: '{{gio_don_khach}}', label: 'Giờ đón khách' },
  { tag: '{{dia_diem}}', label: 'Địa điểm' },
  { tag: '{{suat_an}}', label: 'Suất ăn đã chọn' },
  { tag: '{{dung_cu}}', label: 'Cốp đồ nghề' },
  { tag: '{{qr_link}}', label: 'Link check-in QR' },
  { tag: '{{sdt}}', label: 'Số điện thoại' },
];

function interpolateZaloTemplate(content: string, variables: Record<string, string>): string {
  if (!content) return '';
  return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{\s*([a-zA-Z0-9_]+)\s*\}/g, (match, p1, p2) => {
    const key = p1 || p2;
    return variables[key] !== undefined ? variables[key] : match;
  });
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

  if (!participant) return null;

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center justify-between pr-6">
          <div className="flex items-center gap-2">
            <AppIcon icon={MessageCircle} className="text-blue-500" />
            <span className="font-semibold">
              {isManaging ? 'Quản lý các mẫu kịch bản Zalo' : `Kịch bản Zalo · ${participant.lead.name}`}
            </span>
          </div>
          {isManaging && <StatusTag status="processing" label="Đang tùy biến mẫu" />}
        </div>
      }
      width={800}
      footer={
        isManaging ? (
          <div className="flex items-center justify-between w-full pt-1">
            <Popconfirm
              title="Khôi phục mẫu mặc định?"
              description="Hành động này sẽ ghi đè toàn bộ mẫu hiện tại về 3 mẫu chuẩn ban đầu."
              okText="Khôi phục"
              cancelText="Hủy"
              onConfirm={handleResetDefaults}
            >
              <Button danger icon={<AppIcon icon={RotateCcw} size="sm" />} disabled={isSaving}>
                Khôi phục mẫu gốc
              </Button>
            </Popconfirm>
            <Space>
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
            >
              {participant.infoSentAt ? 'Đã đánh dấu gửi thông tin' : 'Tự động tick "Đã gửi thông tin"'}
            </Checkbox>
            <Space>
              <Button onClick={onClose}>Đóng</Button>
              <Button type="primary" icon={<AppIcon icon={Copy} size="sm" />} onClick={handleCopy}>
                Sao chép tin nhắn Zalo
              </Button>
            </Space>
          </div>
        )
      }
    >
      {isManaging ? (
        /* TEMPLATE MANAGEMENT VIEW */
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <Button
              type="text"
              size="small"
              icon={<AppIcon icon={ArrowLeft} size="sm" />}
              onClick={() => setIsManaging(false)}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Quay lại xem tin nhắn
            </Button>
            <Button
              type="dashed"
              size="small"
              icon={<AppIcon icon={Plus} size="sm" />}
              onClick={handleAddNewTemplate}
              className="border-blue-300 text-blue-600 hover:border-blue-500 dark:border-blue-700 dark:text-blue-400"
            >
              Thêm mẫu mới
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Left list of templates */}
            <div className="md:col-span-4 border-r border-slate-100 pr-2 dark:border-slate-800 space-y-1.5 max-h-[420px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 px-2 pb-1">
                Danh sách mẫu ({templates.length})
              </div>
              {templates.map((tmpl) => {
                const isSelected = tmpl.id === editingTemplateId;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      // Save title/content for previous item before switching
                      setTemplates((prev) =>
                        prev.map((t) =>
                          t.id === editingTemplateId ? { ...t, title: editTitle, content: editContent } : t
                        )
                      );
                      setEditingTemplateId(tmpl.id);
                    }}
                    className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all text-xs ${
                      isSelected
                        ? 'bg-blue-50/80 border border-blue-200 text-blue-700 font-medium dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 shadow-sm'
                        : 'hover:bg-slate-50 border border-transparent text-slate-700 dark:hover:bg-slate-800/60 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate pr-1">{tmpl.title}</span>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                      {tmpl.isDefault && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Chuẩn</span>
                      )}
                      {templates.length > 1 && (
                        <Popconfirm
                          title="Xóa mẫu này?"
                          okText="Xóa"
                          cancelText="Hủy"
                          onConfirm={(e) => {
                            e?.stopPropagation();
                            handleDeleteTemplate(tmpl.id);
                          }}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            className="p-0 h-5 w-5 flex items-center justify-center opacity-40 hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AppIcon icon={Trash2} size={12} />
                          </Button>
                        </Popconfirm>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right editor form */}
            <div className="md:col-span-8 space-y-3 pl-1">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Tiêu đề mẫu kịch bản
                </label>
                <Input
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    setTemplates((prev) =>
                      prev.map((t) => (t.id === editingTemplateId ? { ...t, title: e.target.value } : t))
                    );
                  }}
                  placeholder="Ví dụ: 4. Khảo sát chất lượng sau workshop"
                  className="rounded-lg"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <AppIcon icon={Sparkles} size={14} className="text-amber-500" />
                    Chèn biến tự động (Click để chèn)
                  </label>
                </div>
                <div className="flex flex-wrap gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100 dark:bg-slate-900/60 dark:border-slate-800">
                  {VARIABLE_TAGS.map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => handleInsertTag(item.tag)}
                      className="px-2 py-0.5 text-[11px] rounded bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <span className="font-mono text-blue-500 dark:text-blue-400 font-semibold">{item.tag}</span>
                      <span className="ml-1 text-slate-400">({item.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Nội dung mẫu (hỗ trợ các biến trong dấu ngoặc nhọn)
                </label>
                <Input.TextArea
                  ref={editTextAreaRef}
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    setTemplates((prev) =>
                      prev.map((t) => (t.id === editingTemplateId ? { ...t, content: e.target.value } : t))
                    );
                  }}
                  autoSize={{ minRows: 9, maxRows: 16 }}
                  className="font-mono text-xs leading-relaxed rounded-lg resize-none p-3"
                  placeholder="Nhập nội dung tin nhắn Zalo..."
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MAIN SEND VIEW */
        <div className="space-y-3 pt-1">
          {/* Top Bar with Template Selector and Manage Buttons */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5 dark:border-slate-800">
            <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {templates.map((tmpl) => {
                const isActive = tmpl.id === selectedTemplateId;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className={`px-3 py-1 text-xs rounded-full whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 border font-medium ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isActive && <AppIcon icon={Check} size={12} />}
                    <span>{tmpl.title}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Tooltip title="Thêm mẫu kịch bản mới">
                <Button
                  size="small"
                  icon={<AppIcon icon={Plus} size="sm" />}
                  onClick={handleAddNewTemplate}
                  className="text-blue-600 border-blue-300 hover:border-blue-500 dark:border-blue-700 dark:text-blue-400"
                >
                  Mẫu mới
                </Button>
              </Tooltip>
              <Tooltip title="Chỉnh sửa hoặc xóa các mẫu kịch bản">
                <Button
                  size="small"
                  icon={<AppIcon icon={Settings2} size="sm" />}
                  onClick={() => {
                    setEditingTemplateId(selectedTemplateId);
                    setIsManaging(true);
                  }}
                  className="text-slate-600 dark:text-slate-300"
                >
                  Quản lý mẫu
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Recipient Details & Action Bar */}
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <span>
                Học viên: <strong className="text-slate-700 dark:text-slate-200">{participant.lead.name}</strong>
              </span>
              <span>
                SĐT:{' '}
                <strong className="text-slate-700 dark:text-slate-200 tabular-nums">
                  {participant.lead.phone || 'Chưa có'}
                </strong>
              </span>
            </div>
            {isCustomEdited && (
              <Button
                type="link"
                size="small"
                icon={<AppIcon icon={RotateCcw} size={12} />}
                onClick={handleResetToTemplate}
                className="p-0 text-amber-600 hover:text-amber-700 dark:text-amber-400"
              >
                Khôi phục theo mẫu gốc
              </Button>
            )}
          </div>

          {/* Text Area for Final Message */}
          <div className="relative">
            <Input.TextArea
              value={activeMessage}
              onChange={(e) => {
                setActiveMessage(e.target.value);
                setIsCustomEdited(true);
              }}
              autoSize={{ minRows: 11, maxRows: 18 }}
              className="font-mono text-[13px] leading-relaxed bg-slate-50/70 dark:bg-slate-900/50 rounded-xl p-3.5 pb-8 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 resize-none"
              placeholder="Nội dung kịch bản tin nhắn Zalo..."
            />
            {isCustomEdited && (
              <div className="absolute bottom-3 right-3">
                <StatusTag status="warning" label="Đã chỉnh sửa thủ công" />
              </div>
            )}
          </div>
        </div>
      )}
    </AdaptiveModal>
  );
}

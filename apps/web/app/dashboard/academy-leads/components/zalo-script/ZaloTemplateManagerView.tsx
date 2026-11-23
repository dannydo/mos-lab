'use client';

import type { RefObject } from 'react';
import { Button, Input, Popconfirm } from 'antd';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import type { AcademyWorkshopZaloTemplate } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { ZALO_SCRIPT_VARIABLE_TAGS } from './zalo-script-utils';

export interface ZaloTemplateManagerViewProps {
  templates: AcademyWorkshopZaloTemplate[];
  editingTemplateId: string;
  editTitle: string;
  editContent: string;
  editTextAreaRef: RefObject<any>;
  onAddNewTemplate: () => void;
  onSwitchTemplate: (nextId: string) => void;
  onDeleteTemplate: (idToDelete: string) => void;
  onChangeEditTitle: (value: string) => void;
  onChangeEditContent: (value: string) => void;
  onInsertTag: (tag: string) => void;
}

export function ZaloTemplateManagerView({
  templates,
  editingTemplateId,
  editTitle,
  editContent,
  editTextAreaRef,
  onAddNewTemplate,
  onSwitchTemplate,
  onDeleteTemplate,
  onChangeEditTitle,
  onChangeEditContent,
  onInsertTag,
}: ZaloTemplateManagerViewProps) {
  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Chỉnh sửa các mẫu tin nhắn mẫu để CSKH gửi nhanh cho toàn bộ học viên Workshop.
        </div>
        <Button
          type="dashed"
          size="small"
          icon={<AppIcon icon={Plus} size={13} />}
          onClick={onAddNewTemplate}
          className="border-blue-300 text-blue-600 hover:border-blue-500 dark:border-blue-700 dark:text-blue-400"
        >
          Thêm mẫu mới
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
        {/* Left list of templates */}
        <div className="md:col-span-4 border-r border-slate-100 pr-2.5 dark:border-slate-800 space-y-1.5 max-h-[420px] overflow-y-auto [scrollbar-width:thin]">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 px-1 pb-1">
            Danh sách mẫu ({templates.length})
          </div>
          {templates.map((tmpl, idx) => {
            const isSelected = tmpl.id === editingTemplateId;
            return (
              <div
                key={tmpl.id}
                onClick={() => onSwitchTemplate(tmpl.id)}
                className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all text-xs ${
                  isSelected
                    ? 'bg-blue-50/90 border border-blue-300 text-blue-700 font-medium dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300 shadow-2xs'
                    : 'hover:bg-slate-50 border border-transparent text-slate-700 dark:hover:bg-slate-800/60 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <span className="text-[10px] text-slate-400 font-mono">{idx + 1}.</span>
                  <span className="truncate">{tmpl.title}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {tmpl.isDefault && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Gốc</span>
                  )}
                  {templates.length > 1 && (
                    <Popconfirm
                      title="Xóa mẫu này?"
                      okText="Xóa"
                      cancelText="Hủy"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        onDeleteTemplate(tmpl.id);
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
              onChange={(e) => onChangeEditTitle(e.target.value)}
              placeholder="Ví dụ: 4. Khảo sát chất lượng sau workshop"
              className="rounded-lg"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <AppIcon icon={Sparkles} size={14} className="text-amber-500" />
                Chèn biến tự động (Click để chèn vào con trỏ)
              </label>
            </div>
            <div className="flex flex-wrap gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100 dark:bg-slate-900/60 dark:border-slate-800">
              {ZALO_SCRIPT_VARIABLE_TAGS.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => onInsertTag(item.tag)}
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
              Nội dung mẫu (hỗ trợ các biến trong ngoặc nhọn kép)
            </label>
            <Input.TextArea
              ref={editTextAreaRef}
              value={editContent}
              onChange={(e) => onChangeEditContent(e.target.value)}
              autoSize={{ minRows: 9, maxRows: 15 }}
              className="font-mono text-xs leading-relaxed rounded-lg resize-none p-3"
              placeholder="Nhập nội dung tin nhắn Zalo..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

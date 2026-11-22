'use client';

import { Button, Input, Tooltip } from 'antd';
import { Briefcase, CheckCircle2, Copy, Phone, RotateCcw, User, Utensils } from 'lucide-react';
import type { AcademyWorkshopParticipant, AcademyWorkshopZaloTemplate } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';

export interface ZaloSendScriptViewProps {
  participant: AcademyWorkshopParticipant;
  mealsText: string;
  equipmentText: string;
  templates: AcademyWorkshopZaloTemplate[];
  selectedTemplateId: string;
  activeMessage: string;
  isCustomEdited: boolean;
  onCopyPhone: () => void;
  onSelectTemplate: (id: string) => void;
  onResetToTemplate: () => void;
  onChangeActiveMessage: (value: string) => void;
}

export function ZaloSendScriptView({
  participant,
  mealsText,
  equipmentText,
  templates,
  selectedTemplateId,
  activeMessage,
  isCustomEdited,
  onCopyPhone,
  onSelectTemplate,
  onResetToTemplate,
  onChangeActiveMessage,
}: ZaloSendScriptViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-1">
      {/* Left Column: Student Summary & Journey Stages (5 cols) */}
      <div className="md:col-span-5 space-y-3">
        {/* Student Summary Card */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Học viên nhận tin
              </span>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5 truncate">
                <AppIcon icon={User} size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{participant.lead.name}</span>
              </div>
            </div>
            <div className="shrink-0">
              {participant.infoSentAt ? (
                <StatusTag status="success" label="Đã gửi tin" />
              ) : (
                <StatusTag status="default" label="Chưa gửi tin" />
              )}
            </div>
          </div>

          {participant.lead.phone && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <AppIcon icon={Phone} size={13} className="text-emerald-500 shrink-0" />
                <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {participant.lead.phone}
                </span>
              </div>
              <Tooltip title="Sao chép SĐT để tìm kiếm trên Zalo">
                <Button
                  type="text"
                  size="small"
                  icon={<AppIcon icon={Copy} size={12} />}
                  onClick={onCopyPhone}
                  className="h-6 px-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 flex items-center gap-1 font-medium"
                >
                  Copy SĐT
                </Button>
              </Tooltip>
            </div>
          )}

          <div className="grid grid-cols-1 gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800 text-xs">
            <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
              <AppIcon icon={Utensils} size={13} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-slate-400 dark:text-slate-500">Suất ăn: </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{mealsText}</span>
              </div>
            </div>
            <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
              <AppIcon icon={Briefcase} size={13} className="text-purple-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-slate-400 dark:text-slate-500">Cốp đồ: </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{equipmentText}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Journey Stage Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Giai đoạn kịch bản ({templates.length})
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Bấm để đổi kịch bản</span>
          </div>

          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1 [scrollbar-width:thin]">
            {templates.map((tmpl, idx) => {
              const isSelected = tmpl.id === selectedTemplateId;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => onSelectTemplate(tmpl.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all text-xs border ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-400/80 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-2xs font-medium'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate">{tmpl.title}</span>
                  </div>
                  {isSelected && (
                    <div className="shrink-0 text-blue-600 dark:text-blue-400">
                      <AppIcon icon={CheckCircle2} size={15} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Authentic Zalo Preview & Direct Editor (7 cols) */}
      <div className="md:col-span-7 flex flex-col space-y-2">
        {/* Preview Top Bar */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Nội dung tin nhắn Zalo</span>
            {isCustomEdited ? (
              <StatusTag status="warning" label="Đã sửa riêng" />
            ) : (
              <StatusTag status="success" label="Chuẩn theo mẫu" />
            )}
          </div>
          <div className="flex items-center gap-2.5">
            {isCustomEdited && (
              <Button
                type="link"
                size="small"
                icon={<AppIcon icon={RotateCcw} size={12} />}
                onClick={onResetToTemplate}
                className="p-0 text-amber-600 hover:text-amber-700 dark:text-amber-400 text-xs font-medium"
              >
                Khôi phục gốc
              </Button>
            )}
            <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
              {activeMessage.length} ký tự
            </span>
          </div>
        </div>

        {/* Message Bubble Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pb-1.5 border-b border-slate-200/50 dark:border-slate-800/60">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Đã tự động điền thông tin học viên
            </span>
            <span className="text-slate-400 dark:text-slate-500">Có thể sửa trực tiếp trước khi copy</span>
          </div>

          <Input.TextArea
            value={activeMessage}
            onChange={(e) => onChangeActiveMessage(e.target.value)}
            autoSize={{ minRows: 13, maxRows: 18 }}
            className="font-mono text-xs leading-relaxed rounded-xl p-3 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 resize-none shadow-2xs"
            placeholder="Nội dung kịch bản tin nhắn Zalo..."
          />
        </div>
      </div>
    </div>
  );
}

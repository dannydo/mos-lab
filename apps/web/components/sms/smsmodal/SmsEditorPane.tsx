'use client';

import React from 'react';
import { Button, Input, Select, Space, Tooltip, Typography } from 'antd';
import { Copy, Phone, Save, Send } from 'lucide-react';
import { DEFAULT_SMS_VARIABLE_TAGS, type SmsTemplate } from '@mos-lab/shared';
import { AppIcon, CopyPhoneButton } from '~/components/ui';
import type { SmsSegmentMetrics } from './smsModalTypes';

const { TextArea } = Input;
const { Text } = Typography;

export interface SmsEditorPaneProps {
  isDark: boolean;
  isAdmin: boolean;
  selectedPhone: string;
  onChangePhone: (value: string) => void;
  templates: SmsTemplate[];
  loadingTemplates: boolean;
  selectedTemplateId?: string;
  onTemplateChange: (templateId: string) => void;
  onInsertTag: (tag: string) => void;
  messageBody: string;
  onChangeMessageBody: (value: string) => void;
  livePreview: string;
  segmentMetrics: SmsSegmentMetrics;
  sending: boolean;
  onCopyLivePreview: () => void;
  onOpenSaveTemplate: () => void;
  onClose: () => void;
  onSendSms: () => void;
}

export const SmsEditorPane: React.FC<SmsEditorPaneProps> = ({
  isDark,
  isAdmin,
  selectedPhone,
  onChangePhone,
  templates,
  loadingTemplates,
  selectedTemplateId,
  onTemplateChange,
  onInsertTag,
  messageBody,
  onChangeMessageBody,
  livePreview,
  segmentMetrics,
  sending,
  onCopyLivePreview,
  onOpenSaveTemplate,
  onClose,
  onSendSms,
}) => (
  <div className="md:col-span-7 flex flex-col justify-between space-y-4">
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <Text className="text-xs font-bold">Số điện thoại người nhận:</Text>
          {selectedPhone && <CopyPhoneButton phone={selectedPhone} size="xs" tooltip="Sao chép SĐT người nhận" />}
        </div>
        <Input
          prefix={<AppIcon icon={Phone} size={14} className="text-amber-500" />}
          value={selectedPhone}
          onChange={(e) => onChangePhone(e.target.value)}
          placeholder="Nhập số điện thoại..."
          className={`w-full tabular-nums font-semibold ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}
        />
      </div>

      <div>
        <Text className="text-xs font-bold block mb-1">Mẫu tin nhắn SMS hệ thống:</Text>
        <Select
          value={selectedTemplateId}
          onChange={onTemplateChange}
          loading={loadingTemplates}
          placeholder="Chọn mẫu SMS sẵn có..."
          className="w-full"
          options={templates.map((t) => ({
            value: t.id,
            label: `${t.title} ${t.category ? `(${t.category})` : ''}`,
          }))}
        />
      </div>

      <div>
        <Text className="text-xs font-bold block mb-1.5">Chèn nhanh biến động (nhấp vào thẻ để chèn):</Text>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_SMS_VARIABLE_TAGS.map((item) => (
            <Tooltip key={item.tag} title={`${item.description} (Ví dụ: ${item.exampleValue})`}>
              <button
                type="button"
                onClick={() => onInsertTag(item.tag)}
                className={`cursor-pointer hover:scale-105 transition-transform select-none font-semibold text-xs py-0.5 px-2 rounded border ${
                  isDark
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                    : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                }`}
              >
                + {item.label}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      <div>
        <Text className="text-xs font-bold block mb-1">Nội dung tùy chỉnh (gốc):</Text>
        <TextArea
          rows={4}
          value={messageBody}
          onChange={(e) => onChangeMessageBody(e.target.value)}
          placeholder="Nhập nội dung tin nhắn hoặc chèn các thẻ biến..."
          className={`font-mono text-[12.5px] ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
          }`}
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <Space size="small" align="center">
            <Text className="text-xs font-bold">Xem trước thực tế (Live Preview):</Text>
            <Tooltip title="Sao chép nội dung tin nhắn (1-click)">
              <Button
                type="text"
                size="small"
                shape="circle"
                aria-label="Sao chép nội dung tin nhắn thực tế"
                icon={<AppIcon icon={Copy} size={13} className="text-amber-500" />}
                onClick={onCopyLivePreview}
                className="w-[22px] h-[22px] min-w-[22px] p-0 hover:bg-amber-500/10 inline-flex items-center justify-center transition-colors"
              />
            </Tooltip>
          </Space>

          <span
            className={`text-xs font-bold tabular-nums ${
              segmentMetrics.characterCount > segmentMetrics.maxSingleSegment ? 'text-amber-500' : 'text-emerald-500'
            }`}
          >
            {segmentMetrics.characterCount} / {segmentMetrics.maxSingleSegment} ký tự ({segmentMetrics.smsSegments} SMS
            {segmentMetrics.isUnicode ? ' - UCS-2' : ''})
          </span>
        </div>

        <div
          className={`p-3 rounded-lg border text-xs whitespace-pre-wrap leading-relaxed ${
            isDark
              ? 'bg-amber-950/20 border-amber-500/30 text-slate-100'
              : 'bg-amber-50 border-amber-200 text-slate-800'
          }`}
        >
          {livePreview || <span className="italic text-slate-400">Nội dung xem trước sẽ hiển thị ở đây...</span>}
        </div>
      </div>
    </div>

    <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
      <div>
        {isAdmin && (
          <Button icon={<AppIcon icon={Save} size={14} />} onClick={onOpenSaveTemplate} disabled={!messageBody.trim()}>
            Lưu Template Mẫu
          </Button>
        )}
      </div>

      <Space>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          type="primary"
          icon={<AppIcon icon={Send} size={14} />}
          loading={sending}
          onClick={onSendSms}
          className="font-bold"
        >
          Gửi SMS
        </Button>
      </Space>
    </div>
  </div>
);

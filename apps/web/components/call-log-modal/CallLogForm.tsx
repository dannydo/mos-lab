'use client';

import React from 'react';
import { Button, DatePicker, Divider, Form, Input, Select, Space } from 'antd';
import type { FormInstance } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { RefreshCw } from 'lucide-react';
import { CALL_OUTCOME_LABELS, CALL_RESULT_LABELS, type CallOutcome, type CallResult } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { QUICK_NOTE_PRESETS } from './callLogModalConstants';
import type { CallLogFormValues, QuickNotePreset, ResolvedCallLog } from './callLogModalTypes';

const { TextArea } = Input;

export interface CallLogFormProps {
  form: FormInstance<CallLogFormValues>;
  isDark: boolean;
  loading: boolean;
  callResult: CallResult;
  outcome: CallOutcome;
  resolvedLog: ResolvedCallLog | null;
  noteInputRef: React.RefObject<TextAreaRef | null>;
  onCancel: () => void;
  onFinish: (values: CallLogFormValues) => void;
  onCallResultChange: (value: CallResult) => void;
  onOutcomeChange: (value: CallOutcome) => void;
  onApplyQuickNotePreset: (preset: QuickNotePreset) => void;
  onApplyAiAnalysisToNote: () => void;
  onSubmitShortcut: () => void;
}

export const CallLogForm: React.FC<CallLogFormProps> = ({
  form,
  isDark,
  loading,
  callResult,
  outcome,
  resolvedLog,
  noteInputRef,
  onCancel,
  onFinish,
  onCallResultChange,
  onOutcomeChange,
  onApplyQuickNotePreset,
  onApplyAiAnalysisToNote,
  onSubmitShortcut,
}) => {
  const labelColorClass = isDark ? 'text-zinc-300' : 'text-zinc-700';

  return (
    <>
      <Divider className={`my-3.5 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`} />

      <div className="relative" aria-busy={loading}>
        {loading && (
          <div
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg backdrop-blur-[1px] ${
              isDark ? 'bg-zinc-950/70 text-zinc-200' : 'bg-white/75 text-zinc-700'
            }`}
          >
            <AppIcon icon={RefreshCw} size={20} className="animate-spin text-amber-500" />
            <span className="text-xs font-medium">Đang lưu nhật ký cuộc gọi...</span>
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            callResult: 'ANSWERED',
            outcome: 'PENDING',
          }}
        >
          <Form.Item
            name="callResult"
            label={<span className={labelColorClass}>Kết quả cuộc gọi</span>}
            rules={[{ required: true }]}
          >
            <Select
              disabled={loading}
              getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
              onChange={(val) => onCallResultChange(val as CallResult)}
              options={Object.entries(CALL_RESULT_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>

          {callResult === 'ANSWERED' && (
            <Form.Item
              name="outcome"
              label={<span className={labelColorClass}>Kết quả chi tiết</span>}
              rules={[{ required: true }]}
            >
              <Select
                disabled={loading}
                getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                onChange={(val) => onOutcomeChange(val as CallOutcome)}
                options={Object.entries(CALL_OUTCOME_LABELS)
                  .filter(([k]) => k !== 'RENEWED')
                  .map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
          )}

          {callResult === 'ANSWERED' && outcome === 'CALL_BACK' && (
            <Form.Item
              name="callbackDate"
              label={<span className={labelColorClass}>Ngày hẹn gọi lại</span>}
              rules={[{ required: true, message: 'Vui lòng chọn ngày hẹn gọi lại' }]}
            >
              <DatePicker disabled={loading} className="w-full" format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
          )}

          {/* Quick Note Presets */}
          <div className="mb-2">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="text-[11px] text-zinc-400 mr-1">Thẻ ghi nhanh:</span>
              {QUICK_NOTE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (!loading) {
                      onApplyQuickNotePreset(preset);
                    }
                  }}
                  className={`rounded border text-[11px] select-none py-0.5 px-2 transition-all ${
                    isDark
                      ? 'bg-white/[0.06] border-white/[0.12] text-zinc-100'
                      : 'bg-zinc-100 border-zinc-200 text-zinc-900'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-85 active:scale-95'}`}
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>

          <Form.Item
            name="note"
            label={
              <div className="flex justify-between items-center w-full gap-2">
                <span className={labelColorClass}>Ghi chú cuộc gọi</span>
                {resolvedLog?.satisfactionAnalysis && (
                  <Button
                    type="link"
                    size="small"
                    disabled={loading}
                    onClick={onApplyAiAnalysisToNote}
                    className="p-0 h-auto text-[11.5px] font-medium text-amber-600 dark:text-amber-400"
                  >
                    📋 Áp dụng phân tích AI làm ghi chú
                  </Button>
                )}
              </div>
            }
            extra={
              <div className="flex justify-between items-center text-[10.5px] text-zinc-400 mt-1">
                <span>
                  💡 Phím tắt: <strong>Ctrl + Enter</strong> để lưu nhanh từ bàn phím
                </span>
                <span>Click thẻ ở trên để tự động điền</span>
              </div>
            }
          >
            <TextArea
              ref={noteInputRef}
              rows={4}
              autoFocus
              disabled={loading}
              placeholder="Nhập ghi chú chi tiết về cuộc hội thoại... (Nhấn Ctrl + Enter để lưu nhanh)"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  onSubmitShortcut();
                }
              }}
            />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={onCancel} disabled={loading}>
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={loading}
                className="font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {loading ? 'Đang lưu...' : 'Lưu Nhật Ký (Ctrl + Enter)'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </>
  );
};

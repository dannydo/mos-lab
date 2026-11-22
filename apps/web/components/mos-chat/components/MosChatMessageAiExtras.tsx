'use client';

import React, { useState } from 'react';
import { Tooltip, Dropdown } from 'antd';
import { Check, ChevronDown, ChevronUp, Copy, Sliders, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { MosChatMessage, SafeAny } from '@mos-lab/shared';

export const MainMessageInlineEditor: React.FC<{
  initialText: string;
  setEditingText: (text: string) => void;
  handleCancelEdit: () => void;
  handleSaveEdit: () => void;
  isSavingEdit: boolean;
  isComposingRef: React.MutableRefObject<boolean>;
  lastCompositionEndMsRef: React.MutableRefObject<number>;
  surfaceRaised: string;
  colorText: string;
  colorTextSecondary: string;
}> = React.memo(
  ({
    initialText,
    setEditingText,
    handleCancelEdit,
    handleSaveEdit,
    isSavingEdit,
    isComposingRef,
    lastCompositionEndMsRef,
    surfaceRaised,
    colorText,
    colorTextSecondary,
  }) => {
    const [localText, setLocalText] = useState(initialText);
    React.useEffect(() => {
      setLocalText(initialText);
    }, [initialText]);
    return (
      <div
        className="w-full max-w-[85%] rounded-2xl p-2.5 space-y-2 select-text"
        style={{ background: surfaceRaised, border: '1.5px solid #d4a84b' }}
      >
        <textarea
          autoFocus
          value={localText}
          onChange={(e) => {
            const next = e.target.value;
            setLocalText(next);
            setEditingText(next);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation?.();
              handleCancelEdit();
            } else if (e.key === 'Enter' && !e.shiftKey) {
              if (
                e.nativeEvent.isComposing ||
                isComposingRef.current ||
                e.keyCode === 229 ||
                Date.now() - lastCompositionEndMsRef.current < 60
              ) {
                return;
              }
              e.preventDefault();
              handleSaveEdit();
            }
          }}
          rows={3}
          className="w-full bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none text-[13px] leading-relaxed resize-y p-1"
          style={{ color: colorText, outline: 'none', boxShadow: 'none' }}
        />
        <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
          <span className="text-slate-400">Shift+Enter: xuống dòng · Esc: huỷ · Enter: lưu</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-2.5 py-1 rounded-md cursor-pointer hover:bg-white/10"
              style={{ color: colorTextSecondary }}
            >
              Huỷ
            </button>
            <button
              type="button"
              disabled={isSavingEdit || !localText.trim()}
              onClick={handleSaveEdit}
              className="px-3 py-1 rounded-md font-bold cursor-pointer disabled:opacity-50"
              style={{ background: '#d4a84b', color: '#000' }}
            >
              {isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    );
  }
);
MainMessageInlineEditor.displayName = 'MainMessageInlineEditor';

export const MosChatMessageAiReasoning: React.FC<{
  messageId: string;
  aiThinking?: string | null;
  isDark: boolean;
  expanded: boolean;
  onToggle: () => void;
  colorTextSecondary: string;
}> = ({ aiThinking, isDark, expanded, onToggle, colorTextSecondary }) => {
  if (!aiThinking) return null;
  return (
    <div
      className="mb-1.5 rounded-lg overflow-hidden w-full max-w-[88%]"
      style={{
        background: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.06)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-2.5 py-1 flex items-center justify-between text-[11px] font-bold cursor-pointer"
        style={{ color: isDark ? '#c4b5fd' : '#6d28d9' }}
      >
        <span className="inline-flex items-center gap-1.5">
          <Sparkles size={12} />
          <span>Quá trình suy luận của MAI</span>
        </span>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {expanded && (
        <div
          className="px-2.5 pb-2 pt-1 text-[11.5px] leading-relaxed whitespace-pre-wrap text-left"
          style={{
            color: colorTextSecondary,
            borderTop: '1px dashed rgba(139, 92, 246, 0.2)',
          }}
        >
          {aiThinking}
        </div>
      )}
    </div>
  );
};

export const MosChatMessageAiActionsAndVoice: React.FC<{
  m: MosChatMessage;
  isAiMessage: boolean;
  appliedActionIds: Record<string, boolean>;
  handleExecuteAiAction: (action: SafeAny, msgId: string, actionKey: string) => void;
  speakingMsgId: string | null;
  ttsSpeed: number;
  handleSpeakAiMessage: (m: MosChatMessage) => void;
  handleSetTtsSpeed: (speed: number) => void;
  surfaceRaised: string;
  borderColor: string;
  colorTextSecondary: string;
  antdMessage: SafeAny;
}> = ({
  m,
  isAiMessage,
  appliedActionIds,
  handleExecuteAiAction,
  speakingMsgId,
  ttsSpeed,
  handleSpeakAiMessage,
  handleSetTtsSpeed,
  surfaceRaised,
  borderColor,
  colorTextSecondary,
  antdMessage,
}) => {
  const actionsList =
    m.aiActions && m.aiActions.length > 0
      ? m.aiActions
      : m.aiAction?.actions && m.aiAction.actions.length > 0
        ? m.aiAction.actions
        : m.aiAction
          ? [m.aiAction]
          : [];

  return (
    <>
      {actionsList.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {actionsList.map((action, actionIdx) => {
            const actionKey = `${m.id}-${actionIdx}`;
            const isApplied = Boolean(appliedActionIds[actionKey] || (actionIdx === 0 && appliedActionIds[m.id]));
            return (
              <button
                key={actionKey}
                type="button"
                onClick={() => handleExecuteAiAction(action, m.id, actionKey)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold cursor-pointer transition-all active:scale-95"
                style={{
                  background: isApplied ? 'rgba(16, 185, 129, 0.16)' : 'rgba(139, 92, 246, 0.16)',
                  border: `1px solid ${isApplied ? 'rgba(16, 185, 129, 0.4)' : 'rgba(139, 92, 246, 0.4)'}`,
                  color: isApplied ? '#10b981' : '#a78bfa',
                }}
              >
                {isApplied ? <Check size={13} /> : <Sliders size={13} />}
                <span>{isApplied ? `Đã áp dụng: ${action.label}` : action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {isAiMessage && m.text && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <Tooltip
            title={speakingMsgId === m.id ? 'Dừng đọc giọng nói' : `Đọc câu trả lời bằng giọng Hoài My (${ttsSpeed}x)`}
          >
            <button
              type="button"
              aria-label="Đọc câu trả lời AI"
              onClick={() => handleSpeakAiMessage(m)}
              className="inline-flex items-center justify-center p-1.5 rounded-md cursor-pointer transition-all hover:scale-105 active:scale-95"
              style={{
                background: speakingMsgId === m.id ? 'rgba(139, 92, 246, 0.2)' : surfaceRaised,
                border: `1px solid ${speakingMsgId === m.id ? 'rgba(139, 92, 246, 0.5)' : borderColor}`,
                color: speakingMsgId === m.id ? '#a78bfa' : colorTextSecondary,
              }}
            >
              {speakingMsgId === m.id ? <VolumeX size={13} className="animate-pulse" /> : <Volume2 size={13} />}
            </button>
          </Tooltip>

          <Dropdown
            menu={{
              items: [
                { key: '0.8', label: '0.8x (Chậm)' },
                { key: '1.0', label: '1.0x (Chuẩn)' },
                { key: '1.25', label: '1.25x (Nhanh vừa)' },
                { key: '1.5', label: '1.5x (Nhanh)' },
                { key: '1.75', label: '1.75x (Rất nhanh)' },
                { key: '2.0', label: '2.0x (Tối đa)' },
              ],
              selectedKeys: [String(ttsSpeed)],
              onClick: ({ key }) => {
                const s = parseFloat(key);
                if (s) handleSetTtsSpeed(s);
              },
            }}
            trigger={['click']}
            placement="bottomLeft"
          >
            <button
              type="button"
              className="text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer tabular-nums"
              style={{
                background: surfaceRaised,
                border: `1px solid ${borderColor}`,
                color: colorTextSecondary,
              }}
            >
              {ttsSpeed}x
            </button>
          </Dropdown>

          <Tooltip title="Sao chép nội dung">
            <button
              type="button"
              aria-label="Sao chép nội dung AI"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(m.text || '');
                }
                antdMessage.success('Đã sao chép nội dung câu trả lời AI');
              }}
              className="inline-flex items-center justify-center p-1.5 rounded-md cursor-pointer transition-all hover:scale-105 active:scale-95"
              style={{
                background: surfaceRaised,
                border: `1px solid ${borderColor}`,
                color: colorTextSecondary,
              }}
            >
              <Copy size={13} />
            </button>
          </Tooltip>
        </div>
      )}
    </>
  );
};

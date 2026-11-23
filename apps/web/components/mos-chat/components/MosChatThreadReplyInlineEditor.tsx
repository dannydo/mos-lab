'use client';

import React, { useState } from 'react';

export interface ThreadReplyInlineEditorProps {
  initialText: string;
  setEditingText: (text: string) => void;
  handleCancelEdit: () => void;
  handleSaveEdit: () => void;
  isSavingEdit: boolean;
  isComposingRef: React.MutableRefObject<boolean>;
  lastCompositionEndMsRef: React.MutableRefObject<number>;
  surfaceRaised: string;
  colorText: string;
}

export const ThreadReplyInlineEditor: React.FC<ThreadReplyInlineEditorProps> = React.memo(
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
  }) => {
    const [localText, setLocalText] = useState(initialText);
    React.useEffect(() => {
      setLocalText(initialText);
    }, [initialText]);

    return (
      <div
        className="rounded-xl p-2 space-y-1.5 select-text"
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
          rows={2}
          className="w-full bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none text-[12px] leading-relaxed resize-y p-0.5"
          style={{ color: colorText, outline: 'none', boxShadow: 'none' }}
        />
        <div className="flex items-center justify-between pt-0.5 border-t border-white/10 text-[10px]">
          <span className="text-slate-400">Esc: huỷ · Enter: lưu</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-2 py-0.5 rounded cursor-pointer hover:bg-white/10 text-slate-400"
            >
              Huỷ
            </button>
            <button
              type="button"
              disabled={isSavingEdit || !localText.trim()}
              onClick={handleSaveEdit}
              className="px-2 py-0.5 rounded font-bold cursor-pointer disabled:opacity-50"
              style={{ background: '#d4a84b', color: '#000' }}
            >
              {isSavingEdit ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

ThreadReplyInlineEditor.displayName = 'ThreadReplyInlineEditor';

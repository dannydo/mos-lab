'use client';

import React from 'react';
import { Button, Divider, Space, Tooltip, theme } from 'antd';
import { Bold, Italic, List, ListOrdered, Redo2, Underline, Undo2 } from 'lucide-react';
import { AppIcon } from '../../../../../components/ui';

const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h3', 'h4', 'blockquote']);

function sanitizeEditorHtml(value: string | null | undefined) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withoutUnsafeBlocks = raw.replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const sanitized = withoutUnsafeBlocks.replace(/<[^>]*>/g, (tag) => {
    const match = /^<\s*(\/?)\s*([a-z0-9]+)(?:\s+[^>]*)?\s*\/?\s*>$/i.exec(tag);
    if (!match || !ALLOWED_TAGS.has(match[2].toLowerCase())) return '';
    return `<${match[1]}${match[2].toLowerCase()}>`;
  });
  return /^(?:<br>|<p><br><\/p>)$/i.test(sanitized.trim()) ? '' : sanitized.trim();
}

export interface CourseRichTextEditorProps {
  value?: string | null;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * A focused, dependency-free course-material editor. It stores only the
 * safe formatting subset accepted by the Academy API and pastes as plain text.
 */
export default function CourseRichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = 'Soạn giáo trình, mục tiêu từng buổi và lưu ý cho học viên…',
}: CourseRichTextEditorProps) {
  const { token } = theme.useToken();
  const editorRef = React.useRef<HTMLDivElement>(null);
  const lastEmittedRef = React.useRef<string>('');
  const normalizedValue = sanitizeEditorHtml(value);

  React.useEffect(() => {
    const editor = editorRef.current;
    if (!editor || lastEmittedRef.current === normalizedValue) return;
    editor.innerHTML = normalizedValue;
    lastEmittedRef.current = normalizedValue;
  }, [normalizedValue]);

  const emitValue = React.useCallback(() => {
    const nextValue = sanitizeEditorHtml(editorRef.current?.innerHTML);
    if (editorRef.current && editorRef.current.innerHTML !== nextValue) editorRef.current.innerHTML = nextValue;
    lastEmittedRef.current = nextValue;
    onChange?.(nextValue);
  }, [onChange]);

  const runCommand = React.useCallback(
    (command: string, commandValue?: string) => {
      if (disabled) return;
      editorRef.current?.focus();
      document.execCommand(command, false, commandValue);
      emitValue();
    },
    [disabled, emitValue]
  );

  const toolbarButton = (title: string, command: string, icon: React.ReactNode, commandValue?: string) => (
    <Tooltip title={title}>
      <Button
        type="text"
        size="small"
        aria-label={title}
        icon={icon}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => runCommand(command, commandValue)}
      />
    </Tooltip>
  );

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorder}`,
        borderRadius: token.borderRadiusLG,
        overflow: 'hidden',
        background: token.colorBgContainer,
      }}
    >
      <div
        aria-label="Thanh công cụ giáo trình"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          minHeight: 40,
          padding: '4px 8px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorFillQuaternary,
        }}
      >
        <Space size={2} wrap>
          {toolbarButton('Đậm', 'bold', <AppIcon icon={Bold} />)}
          {toolbarButton('Nghiêng', 'italic', <AppIcon icon={Italic} />)}
          {toolbarButton('Gạch chân', 'underline', <AppIcon icon={Underline} />)}
          <Divider type="vertical" />
          {toolbarButton('Tiêu đề', 'formatBlock', <span className="text-xs font-semibold">H3</span>, 'h3')}
          {toolbarButton('Đoạn văn', 'formatBlock', <span className="text-xs">¶</span>, 'p')}
          <Divider type="vertical" />
          {toolbarButton('Danh sách dấu chấm', 'insertUnorderedList', <AppIcon icon={List} />)}
          {toolbarButton('Danh sách đánh số', 'insertOrderedList', <AppIcon icon={ListOrdered} />)}
          <Divider type="vertical" />
          {toolbarButton('Hoàn tác', 'undo', <AppIcon icon={Undo2} />)}
          {toolbarButton('Làm lại', 'redo', <AppIcon icon={Redo2} />)}
        </Space>
      </div>
      <div style={{ position: 'relative' }}>
        {!normalizedValue && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              right: 12,
              color: token.colorTextPlaceholder,
              pointerEvents: 'none',
            }}
          >
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          role="textbox"
          aria-label="Giáo trình rich text"
          aria-multiline="true"
          contentEditable={!disabled}
          suppressContentEditableWarning
          tabIndex={disabled ? -1 : 0}
          onInput={emitValue}
          onBlur={emitValue}
          onPaste={(event) => {
            event.preventDefault();
            document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
            emitValue();
          }}
          style={{
            minHeight: 220,
            padding: 12,
            outline: 'none',
            color: token.colorText,
            cursor: disabled ? 'not-allowed' : 'text',
            lineHeight: 1.6,
          }}
        />
      </div>
    </div>
  );
}

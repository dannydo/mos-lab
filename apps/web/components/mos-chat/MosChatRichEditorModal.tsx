'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Modal, Tooltip, Popover, theme as antdTheme } from 'antd';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Table,
  Link as LinkIcon,
  Columns2,
  Eye,
  FilePenLine,
  FileText,
  Minus,
  SendHorizontal,
  Sigma,
  GitFork,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Bot,
  HelpCircle,
  Check,
  Zap,
  SquareCode,
} from 'lucide-react';
import { MosChatRichText } from './MosChatRichText';

export type EditorFormatType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'color'
  | 'code'
  | 'codeblock'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'number'
  | 'todo'
  | 'quote'
  | 'table'
  | 'link'
  | 'divider'
  | 'mermaid'
  | 'math'
  | 'clear';

export type RichEditorViewMode = 'compact' | 'edit' | 'split' | 'preview';

export interface MosChatRichEditorModalProps {
  open: boolean;
  onClose: () => void;
  initialValue: string;
  onApply: (text: string) => void;
  onSend: (text: string) => void;
  title?: string;
  isDark?: boolean;
  canUseAiCopilot?: boolean;
  initialMode?: RichEditorViewMode;
  zIndex?: number;
}

export const QUICK_TEXT_COLORS = [
  { id: 'amber', label: 'Vàng Gold', hex: '#f59e0b' },
  { id: 'red', label: 'Đỏ nổi bật', hex: '#ef4444' },
  { id: 'orange', label: 'Cam năng lượng', hex: '#f97316' },
  { id: 'emerald', label: 'Xanh ngọc', hex: '#10b981' },
  { id: 'sky', label: 'Xanh dương', hex: '#0ea5e9' },
  { id: 'purple', label: 'Tím sáng tạo', hex: '#a855f7' },
  { id: 'pink', label: 'Hồng phấn', hex: '#ec4899' },
];

const TEMPLATES = [
  {
    id: 'announcement',
    title: '📢 Thông báo nội bộ',
    desc: 'Mẫu thông báo thông tin, chính sách hoặc quy định mới',
    content: `# 📢 THÔNG BÁO NỘI BỘ
**Kính gửi:** Toàn thể đội ngũ Wings

## 1. Mục đích thông báo
• 

## 2. Nội dung chi tiết & Thời gian áp dụng
• **Thời gian áp dụng:** Bắt đầu từ ngày ...
• **Phạm vi áp dụng:** Toàn bộ chi nhánh

## 3. Lưu ý quan trọng
> Mọi thắc mắc xin vui lòng phản hồi trực tiếp dưới tin nhắn này để được giải đáp kịp thời.
`,
  },
  {
    id: 'plan',
    title: '📋 Kế hoạch công việc',
    desc: 'Mẫu phân công nhiệm vụ và checklist theo dõi tiến độ',
    content: `# 📋 KẾ HOẠCH TRIỂN KHAI CÔNG VIỆC

## 🎯 Mục tiêu trọng tâm
• 

## 📝 Danh sách nhiệm vụ
- [ ] Nhiệm vụ 1 (Phụ trách: @, Deadline: )
- [ ] Nhiệm vụ 2 (Phụ trách: @, Deadline: )
- [ ] Nhiệm vụ 3 (Phụ trách: @, Deadline: )

## ⚠️ Lưu ý phối hợp
> Đội ngũ vui lòng cập nhật trạng thái ngay sau khi hoàn tất từng hạng mục.
`,
  },
  {
    id: 'progress_report',
    title: '📊 Báo cáo tiến độ',
    desc: 'Mẫu báo cáo chỉ số, bảng biểu và kết quả đạt được',
    content: `# 📊 BÁO CÁO TIẾN ĐỘ CÔNG VIỆC

## 1. Bảng số liệu tổng hợp
| Hạng mục | Chỉ tiêu | Thực tế | Đạt (%) |
|---|---|---|---|
| Khách hàng phục vụ | 50 | 52 | 104% |
| Đánh giá hài lòng | 98% | 100% | 102% |

## 2. Kết quả nổi bật
• 

## 3. Khó khăn & Kiến nghị
• 
`,
  },
  {
    id: 'meeting_minutes',
    title: '📝 Biên bản cuộc họp',
    desc: 'Mẫu ghi chép nội dung thống nhất và đầu việc giao kết',
    content: `# 📝 BIÊN BẢN CUỘC HỌP
• **Thời gian:** Ngày ... tháng ... năm ...
• **Thành phần tham dự:** @Danny Do, ...

## 1. Nội dung đã trao đổi
1. 
2. 

## 2. Kết luận & Phân công trách nhiệm
- [ ] @: Phụ trách triển khai ...
- [ ] @: Theo dõi và báo cáo ...
`,
  },
  {
    id: 'process_flow',
    title: '🔄 Sơ đồ quy trình (Mermaid)',
    desc: 'Mẫu trực quan hóa quy trình làm việc bằng sơ đồ',
    content: `# 🔄 QUY TRÌNH LÀM VIỆC CHUẨN

\`\`\`mermaid
graph TD
  A[Bước 1: Tiếp nhận yêu cầu] --> B[Bước 2: Phân tích & Xử lý]
  B --> C{Kiểm tra chất lượng}
  C -->|Đạt| D[Bước 3: Bàn giao & Nghiệm thu]
  C -->|Chưa đạt| B
\`\`\`
`,
  },
];

/**
 * Nhận diện các định dạng đang bật tại vị trí con trỏ
 */
export function detectActiveFormatsAtCursor(text: string, cursor: number): Record<string, boolean> {
  const safeCursor = Math.max(0, Math.min(cursor, text.length));
  const lineStart = text.lastIndexOf('\n', safeCursor - 1) + 1;
  const nextNewline = text.indexOf('\n', safeCursor);
  const lineEnd = nextNewline === -1 ? text.length : nextNewline;
  const currentLine = text.substring(lineStart, lineEnd);

  const beforeCursor = text.substring(lineStart, safeCursor);
  const afterCursor = text.substring(safeCursor, lineEnd);

  return {
    bullet: /^[•\-*]\s/.test(currentLine),
    number: /^\d+\.\s/.test(currentLine),
    todo: /^-\s\[[ xX]\]\s/.test(currentLine),
    quote: /^>\s?/.test(currentLine),
    h1: /^#\s/.test(currentLine),
    h2: /^##\s/.test(currentLine),
    h3: /^###\s/.test(currentLine),
    bold: /\*\*[^*]*$/.test(beforeCursor) && /^[^*]*\*\*/.test(afterCursor),
    italic: /(?<!\*)\*[^*]*$/.test(beforeCursor) && /^[^*]*\*(?!\*)/.test(afterCursor),
    underline: /<u>(?:(?!<\/u>).)*$/i.test(beforeCursor) && /^(?:(?!<u>).)*<\/u>/i.test(afterCursor),
    strike: /~~[^~]*$/.test(beforeCursor) && /^[^~]*~~/.test(afterCursor),
    code: /`[^`]*$/.test(beforeCursor) && /^[^`]*`/.test(afterCursor),
  };
}

/**
 * Tự động tiếp nối danh sách (• , - , 1. , - [ ] , > ) khi nhấn Enter / Shift+Enter
 * Trả về { handled: true, nextText, nextCursor } nếu đã xử lý tự động.
 */
export function handleSmartListEnterKey(
  text: string,
  selectionStart: number,
  selectionEnd: number
): { handled: boolean; nextText: string; nextCursor: number } {
  if (selectionStart !== selectionEnd) {
    return { handled: false, nextText: text, nextCursor: selectionStart };
  }

  const lineStart = text.lastIndexOf('\n', selectionStart - 1) + 1;
  const lineUpToCursor = text.substring(lineStart, selectionStart);

  // 1. Checklist: - [ ] hoặc - [x]
  const todoMatch = lineUpToCursor.match(/^(\s*-\s\[[ xX]\]\s)(.*)$/);
  if (todoMatch) {
    const [, prefix, itemBody] = todoMatch;
    if (!itemBody.trim()) {
      // Dòng rỗng -> Thoát chế độ danh sách
      const nextText = text.substring(0, lineStart) + text.substring(selectionStart);
      return { handled: true, nextText, nextCursor: lineStart };
    }
    const cleanPrefix = prefix.replace(/\[[xX]\]/, '[ ]');
    const insertion = `\n${cleanPrefix}`;
    const nextText = text.substring(0, selectionStart) + insertion + text.substring(selectionEnd);
    return { handled: true, nextText, nextCursor: selectionStart + insertion.length };
  }

  // 2. Bullet list: • hoặc - hoặc *
  const bulletMatch = lineUpToCursor.match(/^(\s*[•\-*]\s)(.*)$/);
  if (bulletMatch) {
    const [, prefix, itemBody] = bulletMatch;
    if (!itemBody.trim()) {
      // Dòng rỗng -> Xóa dấu đầu dòng để thoát danh sách mượt mà
      const nextText = text.substring(0, lineStart) + text.substring(selectionStart);
      return { handled: true, nextText, nextCursor: lineStart };
    }
    const insertion = `\n${prefix}`;
    const nextText = text.substring(0, selectionStart) + insertion + text.substring(selectionEnd);
    return { handled: true, nextText, nextCursor: selectionStart + insertion.length };
  }

  // 3. Numbered list: 1. , 2. ...
  const numberMatch = lineUpToCursor.match(/^(\s*)(\d+)(\.\s)(.*)$/);
  if (numberMatch) {
    const [, indent, numStr, dotSpace, itemBody] = numberMatch;
    if (!itemBody.trim()) {
      const nextText = text.substring(0, lineStart) + text.substring(selectionStart);
      return { handled: true, nextText, nextCursor: lineStart };
    }
    const nextNum = parseInt(numStr, 10) + 1;
    const insertion = `\n${indent}${nextNum}${dotSpace}`;
    const nextText = text.substring(0, selectionStart) + insertion + text.substring(selectionEnd);
    return { handled: true, nextText, nextCursor: selectionStart + insertion.length };
  }

  // 4. Quote: >
  const quoteMatch = lineUpToCursor.match(/^(\s*>\s)(.*)$/);
  if (quoteMatch) {
    const [, prefix, itemBody] = quoteMatch;
    if (!itemBody.trim()) {
      const nextText = text.substring(0, lineStart) + text.substring(selectionStart);
      return { handled: true, nextText, nextCursor: lineStart };
    }
    const insertion = `\n${prefix}`;
    const nextText = text.substring(0, selectionStart) + insertion + text.substring(selectionEnd);
    return { handled: true, nextText, nextCursor: selectionStart + insertion.length };
  }

  return { handled: false, nextText: text, nextCursor: selectionStart };
}

const EditorTooltip: React.FC<{
  title: React.ReactNode;
  disabled?: boolean;
  children: React.ReactElement;
  [key: string]: unknown;
}> = ({ title, disabled, children, ...rest }) => {
  const child = Object.keys(rest).length > 0 ? React.cloneElement(children, rest) : children;
  if (disabled) return child;
  return <Tooltip title={title}>{child}</Tooltip>;
};

export const MosChatRichEditorModal: React.FC<MosChatRichEditorModalProps> = ({
  open,
  onClose,
  initialValue,
  onApply,
  onSend,
  title = 'Soạn thảo phong phú (CKEditor)',
  isDark = true,
  canUseAiCopilot = true,
  initialMode,
  zIndex = 2000,
}) => {
  const { token } = antdTheme.useToken();
  const [content, setContent] = useState(initialValue);
  const [viewMode, setViewMode] = useState<RichEditorViewMode>(initialMode || 'split');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [activeColor, setActiveColor] = useState<string>('#f59e0b');
  const [cursorPos, setCursorPos] = useState<number>(0);
  const [showCompactPreview, setShowCompactPreview] = useState<boolean>(false);

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth > 0) {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);
  const [visibleHeight, setVisibleHeight] = useState<number>(0);
  const [visualViewportOffsetTop, setVisualViewportOffsetTop] = useState<number>(0);
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // iOS Safari / Chrome Android Virtual Keyboard & Viewport listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (window.visualViewport) {
        const vv = window.visualViewport;
        const offsetTop = Math.max(0, vv.offsetTop);
        const offset = Math.max(0, window.innerHeight - vv.height - offsetTop);
        setVisualViewportOffsetTop(offsetTop);
        setKeyboardOffset(offset);
        setVisibleHeight(vv.height);
      } else {
        setVisualViewportOffsetTop(0);
        setKeyboardOffset(0);
        setVisibleHeight(window.innerHeight);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, [open]);

  // Sync initialValue when modal opens
  useEffect(() => {
    if (open) {
      setContent(initialValue);
      setCursorPos(initialValue.length);
      lastSelectionRef.current = { start: initialValue.length, end: initialValue.length };
      if (initialMode) {
        setViewMode(initialMode);
      } else if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setViewMode('compact');
      } else {
        setViewMode('split');
      }
    }
  }, [open, initialValue, initialMode]);

  const activeFormats = useMemo(() => detectActiveFormatsAtCursor(content, cursorPos), [content, cursorPos]);

  // Statistics
  const stats = useMemo(() => {
    const chars = content.length;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const lines = content ? content.split('\n').length : 0;
    return { chars, words, lines };
  }, [content]);

  const captureSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const isFocused = typeof document !== 'undefined' && document.activeElement === textarea;
    if (!isFocused) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? start;
    lastSelectionRef.current = { start, end };
  }, []);

  const getEffectiveSelection = useCallback(
    (textarea: HTMLTextAreaElement | null) => {
      const maxLen = content.length;
      const clamp = (n: number) => Math.max(0, Math.min(n, maxLen));
      if (!textarea) {
        return {
          start: clamp(lastSelectionRef.current.start),
          end: clamp(lastSelectionRef.current.end),
        };
      }
      const isFocused = typeof document !== 'undefined' && document.activeElement === textarea;
      let start = clamp(textarea.selectionStart ?? maxLen);
      let end = clamp(textarea.selectionEnd ?? maxLen);
      if (!isFocused || (start === end && lastSelectionRef.current.start !== lastSelectionRef.current.end)) {
        start = clamp(lastSelectionRef.current.start);
        end = clamp(lastSelectionRef.current.end);
      }
      return { start, end };
    },
    [content.length]
  );

  /**
   * Toggle prefix on the current line (e.g., • , 1. , - [ ] , > , # )
   */
  const toggleLinePrefix = useCallback(
    (targetPrefix: string, stripPattern: RegExp) => {
      const textarea = textareaRef.current;
      const { start, end } = getEffectiveSelection(textarea);
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      const nextNewline = content.indexOf('\n', start);
      const lineEnd = nextNewline === -1 ? content.length : nextNewline;

      const beforeLine = content.substring(0, lineStart);
      const currentLine = content.substring(lineStart, lineEnd);
      const afterLine = content.substring(lineEnd);

      let updatedLine: string;
      let delta = 0;

      if (stripPattern.test(currentLine)) {
        // Nếu dòng hiện tại đã có cùng định dạng -> Bỏ định dạng (Toggle OFF)
        updatedLine = currentLine.replace(stripPattern, '');
        delta = updatedLine.length - currentLine.length;
      } else {
        // Xóa các tiền tố danh sách khác nếu có trước khi gắn tiền tố mới
        const cleanedLine = currentLine.replace(/^(?:-\s\[[ xX]\]\s|[•\-*]\s|\d+\.\s|>\s|#{1,3}\s)/, '');
        updatedLine = `${targetPrefix}${cleanedLine}`;
        delta = updatedLine.length - currentLine.length;
      }

      const nextVal = `${beforeLine}${updatedLine}${afterLine}`;
      const nextStart = Math.max(lineStart, start + delta);
      const nextEnd = Math.max(lineStart, end + delta);
      setContent(nextVal);
      setCursorPos(nextStart);
      lastSelectionRef.current = { start: nextStart, end: nextEnd };
      setTimeout(() => {
        textarea?.focus();
        textarea?.setSelectionRange(nextStart, nextEnd);
      }, 0);
    },
    [content, getEffectiveSelection]
  );

  /**
   * Toggle inline wrapper (e.g., **bold**, *italic*, <u>underline</u>, ~~strike~~, `code`)
   * Hỗ trợ gõ nhanh: khi chưa chọn chữ, đặt con trỏ ngay chính giữa cặp ký hiệu để gõ trực tiếp!
   */
  const toggleInlineWrapper = useCallback(
    (openTag: string, closeTag: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { start, end } = getEffectiveSelection(textarea);
      const selected = content.substring(start, end);

      const before = content.substring(0, start);
      const after = content.substring(end);

      // Nếu con trỏ đang nằm giữa cặp rỗng (VD: **|**) và bấm lần nữa -> Xóa cặp rỗng
      if (!selected && before.endsWith(openTag) && after.startsWith(closeTag)) {
        const nextVal = before.slice(0, -openTag.length) + after.slice(closeTag.length);
        const nextCursor = start - openTag.length;
        setContent(nextVal);
        setCursorPos(nextCursor);
        lastSelectionRef.current = { start: nextCursor, end: nextCursor };
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(nextCursor, nextCursor);
        }, 0);
        return;
      }

      // Nếu đoạn văn bản được chọn đã bọc sẵn -> Gỡ bọc
      if (
        selected.startsWith(openTag) &&
        selected.endsWith(closeTag) &&
        selected.length >= openTag.length + closeTag.length
      ) {
        const unwrapped = selected.slice(openTag.length, -closeTag.length);
        const nextVal = before + unwrapped + after;
        setContent(nextVal);
        setCursorPos(start + unwrapped.length);
        lastSelectionRef.current = { start, end: start + unwrapped.length };
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + unwrapped.length);
        }, 0);
        return;
      }

      // Nếu chọn cả dòng có tiền tố danh sách / tiêu đề (VD: "1. Doanh thu", "• Duy trì") -> Giữ tiền tố ngoài cặp thẻ để không làm hỏng cú pháp danh sách
      const isAtLineStart = start === 0 || content[start - 1] === '\n';
      const singleLinePrefixMatch =
        isAtLineStart && !selected.includes('\n')
          ? selected.match(/^(\s*(?:-\s\[[ xX]\]\s+|[•\-*]\s+|\d+\.\s+|>\s+|#{1,6}\s+))(.+)$/)
          : null;
      if (singleLinePrefixMatch) {
        const [, linePrefix, itemBody] = singleLinePrefixMatch;
        if (
          itemBody.startsWith(openTag) &&
          itemBody.endsWith(closeTag) &&
          itemBody.length >= openTag.length + closeTag.length
        ) {
          const unwrappedLine = `${linePrefix}${itemBody.slice(openTag.length, -closeTag.length)}`;
          const nextVal = before + unwrappedLine + after;
          setContent(nextVal);
          setCursorPos(start + unwrappedLine.length);
          lastSelectionRef.current = { start, end: start + unwrappedLine.length };
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start, start + unwrappedLine.length);
          }, 0);
          return;
        }
        const wrappedLine = `${linePrefix}${openTag}${itemBody}${closeTag}`;
        const nextVal = before + wrappedLine + after;
        setContent(nextVal);
        setCursorPos(start + wrappedLine.length);
        lastSelectionRef.current = { start, end: start + wrappedLine.length };
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + wrappedLine.length);
        }, 0);
        return;
      }

      const wrapped = `${openTag}${selected}${closeTag}`;
      const nextVal = before + wrapped + after;
      const nextCursor = selected ? start + wrapped.length : start + openTag.length;
      setContent(nextVal);
      setCursorPos(nextCursor);
      lastSelectionRef.current = selected
        ? { start, end: start + wrapped.length }
        : { start: nextCursor, end: nextCursor };
      setTimeout(() => {
        textarea.focus();
        if (selected) {
          textarea.setSelectionRange(start, start + wrapped.length);
        } else {
          textarea.setSelectionRange(nextCursor, nextCursor);
        }
      }, 0);
    },
    [content]
  );

  const handleApplyColor = useCallback(
    (hex: string) => {
      setActiveColor(hex);
      setColorPopoverOpen(false);
      toggleInlineWrapper(`<span style="color:${hex}">`, '</span>');
    },
    [toggleInlineWrapper]
  );

  /**
   * Apply formatting to textarea selection
   */
  const handleFormat = useCallback(
    (formatType: EditorFormatType) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { start, end } = getEffectiveSelection(textarea);
      const selected = content.substring(start, end);

      switch (formatType) {
        case 'bold':
          toggleInlineWrapper('**', '**');
          return;
        case 'italic':
          toggleInlineWrapper('*', '*');
          return;
        case 'underline':
          toggleInlineWrapper('<u>', '</u>');
          return;
        case 'strike':
          toggleInlineWrapper('~~', '~~');
          return;
        case 'color':
          toggleInlineWrapper(`<span style="color:${activeColor}">`, '</span>');
          return;
        case 'code':
          toggleInlineWrapper('`', '`');
          return;
        case 'h1':
          toggleLinePrefix('# ', /^#\s/);
          return;
        case 'h2':
          toggleLinePrefix('## ', /^##\s/);
          return;
        case 'h3':
          toggleLinePrefix('### ', /^###\s/);
          return;
        case 'bullet':
          toggleLinePrefix('• ', /^[•\-*]\s/);
          return;
        case 'number':
          toggleLinePrefix('1. ', /^\d+\.\s/);
          return;
        case 'todo':
          toggleLinePrefix('- [ ] ', /^-\s\[[ xX]\]\s/);
          return;
        case 'quote':
          toggleLinePrefix('> ', /^>\s?/);
          return;
        case 'link':
          if (selected) {
            setLinkText(selected);
            setLinkUrl('');
          } else {
            setLinkText('');
            setLinkUrl('');
          }
          setLinkModalOpen(true);
          return;
        default:
          break;
      }

      let replacement = '';
      let cursorOffset = 0;

      switch (formatType) {
        case 'codeblock':
          replacement = selected ? `\`\`\`\n${selected}\n\`\`\`` : '```\n\n```';
          cursorOffset = selected ? replacement.length : 4;
          break;
        case 'table':
          replacement = `\n| Cột 1 | Cột 2 | Cột 3 |\n|---|---|---|\n| Dữ liệu 1 | Dữ liệu 2 | Chi tiết |\n| Dữ liệu 3 | Dữ liệu 4 | Chi tiết |\n`;
          cursorOffset = replacement.length;
          break;
        case 'divider':
          replacement = `\n\n---\n\n`;
          cursorOffset = replacement.length;
          break;
        case 'mermaid':
          replacement = `\n\`\`\`mermaid\ngraph TD\n  A[Bắt đầu] --> B[Xử lý]\n  B --> C[Hoàn tất]\n\`\`\`\n`;
          cursorOffset = replacement.length;
          break;
        case 'math':
          replacement = `\n$$\n\\sum_{i=1}^{n} X_i = \\text{Tổng}\n$$\n`;
          cursorOffset = replacement.length;
          break;
        case 'clear':
          if (!selected) return;
          replacement = selected
            .replace(/<span\s+style=["']color:[^"']+["']>([\s\S]*?)<\/span>/gi, '$1')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/~~(.*?)~~/g, '$1')
            .replace(/<u>(.*?)<\/u>/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/^#+\s+/gm, '')
            .replace(/^[-*•]\s+/gm, '')
            .replace(/^\d+\.\s+/gm, '')
            .replace(/^-\s*\[[ xX]\]\s+/gm, '')
            .replace(/^>\s+/gm, '');
          cursorOffset = replacement.length;
          break;
      }

      const nextVal = content.substring(0, start) + replacement + content.substring(end);
      setContent(nextVal);
      const nextCursor = start + cursorOffset;
      setCursorPos(nextCursor);
      lastSelectionRef.current =
        selected && formatType !== 'clear'
          ? { start, end: start + replacement.length }
          : { start: nextCursor, end: nextCursor };
      setTimeout(() => {
        textarea.focus();
        if (selected && formatType !== 'clear') {
          textarea.setSelectionRange(start, start + replacement.length);
        } else {
          textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
        }
      }, 0);
    },
    [content, activeColor, toggleInlineWrapper, toggleLinePrefix, getEffectiveSelection]
  );

  const handleInsertLink = () => {
    const textToInsert = linkText.trim() || linkUrl.trim();
    const urlToInsert = linkUrl.trim() || 'https://';
    const linkMd = `[${textToInsert}](${urlToInsert})`;

    const textarea = textareaRef.current;
    if (textarea) {
      const { start, end } = getEffectiveSelection(textarea);
      const nextVal = content.substring(0, start) + linkMd + content.substring(end);
      setContent(nextVal);
      const nextPos = start + linkMd.length;
      setCursorPos(nextPos);
      lastSelectionRef.current = { start: nextPos, end: nextPos };
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(nextPos, nextPos);
      }, 0);
    } else {
      setContent((prev) => `${prev} ${linkMd}`);
    }
    setLinkModalOpen(false);
    setLinkText('');
    setLinkUrl('');
  };

  const handleSelectTemplate = (templateContent: string) => {
    if (content.trim()) {
      setContent((prev) => `${prev}\n\n${templateContent}`);
    } else {
      setContent(templateContent);
    }
    setTemplatePopoverOpen(false);
  };

  const isCompactMode = viewMode === 'compact';
  const surfaceBg = isDark ? '#18181b' : '#ffffff';
  const toolbarBg = isDark ? 'rgba(39, 39, 42, 0.7)' : 'rgba(244, 244, 245, 0.8)';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  const mobileSafeTopMinPx = 56;
  const mobileMaxModalHeight =
    isMobile && visibleHeight > 0 ? Math.max(220, visibleHeight - mobileSafeTopMinPx) : undefined;
  const isKeyboardOpen = keyboardOffset > 40;

  const getBtnClass = (isActive?: boolean) =>
    `w-8 h-8 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
      isActive
        ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-xs font-bold'
        : 'hover:bg-black/5 dark:hover:bg-white/10'
    }`;

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        zIndex={zIndex}
        className={isMobile ? 'adaptive-overlay mos-rich-editor-mobile-modal' : undefined}
        wrapClassName={isMobile ? 'mos-rich-editor-mobile-wrap' : undefined}
        width={
          isMobile
            ? '100%'
            : isFullscreen
              ? '98vw'
              : isCompactMode
                ? 'min(580px, calc(100vw - 16px))'
                : 'min(1000px, calc(100vw - 16px))'
        }
        style={
          isMobile
            ? {
                top: 0,
                maxWidth: '100vw',
                margin: 0,
                paddingBottom: 0,
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
              }
            : {
                top: isFullscreen ? 10 : isCompactMode ? 16 : 28,
                maxWidth: 'calc(100vw - 16px)',
                margin: '0 auto',
                paddingBottom: keyboardOffset > 0 ? `${keyboardOffset}px` : undefined,
              }
        }
        styles={{
          wrapper: isMobile
            ? {
                position: 'fixed',
                top: `${visualViewportOffsetTop}px`,
                left: 0,
                right: 0,
                bottom: 'auto',
                height: visibleHeight > 0 ? `${visibleHeight}px` : '100dvh',
                paddingBottom: 0,
                paddingLeft: 0,
                paddingRight: 0,
              }
            : undefined,
          content: {
            padding: 0,
            borderRadius: isMobile ? '20px 20px 0 0' : isFullscreen ? 12 : 20,
            overflow: 'hidden',
            background: surfaceBg,
            border: `1px solid ${borderCol}`,
            borderBottom: isMobile ? 'none' : `1px solid ${borderCol}`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: isMobile ? 'flex' : undefined,
            flexDirection: isMobile ? 'column' : undefined,
            maxHeight: isMobile
              ? mobileMaxModalHeight !== undefined
                ? `${mobileMaxModalHeight}px`
                : 'calc(100dvh - 56px)'
              : undefined,
          },
          body: isMobile
            ? {
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
                padding: 0,
              }
            : undefined,
        }}
        closable={true}
        destroyOnHidden
      >
        <div
          className={`flex flex-col select-text transition-all ${
            isMobile
              ? 'flex-1 min-h-0'
              : isCompactMode
                ? 'min-h-[280px] max-h-[72vh]'
                : 'h-[82vh] max-h-[900px]'
          }`}
          style={{
            height:
              isMobile && !isCompactMode && mobileMaxModalHeight !== undefined
                ? `${isFullscreen ? mobileMaxModalHeight : Math.min(mobileMaxModalHeight, Math.round((visibleHeight || 800) * 0.82))}px`
                : isMobile && isFullscreen && mobileMaxModalHeight !== undefined
                  ? `${mobileMaxModalHeight}px`
                  : undefined,
            maxHeight: isMobile
              ? mobileMaxModalHeight !== undefined
                ? `${mobileMaxModalHeight}px`
                : 'calc(100dvh - 56px)'
              : undefined,
          }}
        >
          {/* Header */}
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-2 sm:py-3 border-b shrink-0 select-none gap-2"
            style={{ borderColor: borderCol, background: toolbarBg }}
          >
            {/* Title & Badge */}
            <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0 pr-11 sm:pr-0 min-h-[30px]">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/25 shrink-0 shadow-sm">
                  {isCompactMode ? <Zap size={14} /> : <FilePenLine size={15} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h3
                      className="text-[13px] sm:text-[13.5px] font-bold m-0 leading-tight truncate"
                      style={{ color: token.colorText }}
                    >
                      {title}
                    </h3>
                    <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                      CKEditor Mode
                    </span>
                  </div>
                  {/* Desktop Stats */}
                  <div
                    className="hidden sm:flex items-center gap-1.5 mt-0.5 text-[11px] tabular-nums"
                    style={{ color: token.colorTextSecondary }}
                  >
                    <span>{stats.words} từ</span>
                    <span>·</span>
                    <span>{stats.chars} ký tự</span>
                    <span>·</span>
                    <span>{stats.lines} dòng</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls: Stats (on mobile), Templates & Mode switcher */}
            <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:mr-7 overflow-x-auto no-scrollbar">
              {/* Mobile Stats */}
              <div
                className="sm:hidden flex items-center gap-1 text-[10.5px] tabular-nums shrink-0"
                style={{ color: token.colorTextSecondary }}
              >
                <span>{stats.words} từ</span>
                <span>·</span>
                <span>{stats.chars} ký tự</span>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto sm:ml-0">
                {/* Template Selector */}
                {!isCompactMode && (
                  <Popover
                    open={templatePopoverOpen}
                    onOpenChange={setTemplatePopoverOpen}
                    trigger="click"
                    placement={isMobile ? 'bottom' : 'bottomRight'}
                    zIndex={zIndex + 20}
                    content={
                      <div className="w-[min(288px,calc(100vw-32px))] max-h-[45vh] overflow-y-auto p-1 space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 text-amber-500 flex items-center gap-1.5">
                          <Sparkles size={13} />
                          <span>Mẫu soạn thảo sẵn</span>
                        </div>
                        {TEMPLATES.map((tmpl) => (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => handleSelectTemplate(tmpl.content)}
                            className="w-full text-left p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex flex-col gap-0.5 cursor-pointer"
                          >
                            <span className="text-[12.5px] font-semibold" style={{ color: token.colorText }}>
                              {tmpl.title}
                            </span>
                            <span className="text-[11px] opacity-75" style={{ color: token.colorTextSecondary }}>
                              {tmpl.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    }
                  >
                    <button
                      type="button"
                      className="h-6.5 sm:h-7 px-2 sm:px-2.5 rounded-lg border flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      style={{ borderColor: borderCol, color: token.colorText }}
                    >
                      <Sparkles size={12} className="text-amber-500" />
                      <span className="sm:hidden">Mẫu</span>
                      <span className="hidden sm:inline">Mẫu nhanh</span>
                    </button>
                  </Popover>
                )}

                {/* View Mode Segmented Controls */}
                <div
                  className="flex items-center p-0.5 rounded-lg border shrink-0"
                  style={{ borderColor: borderCol, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)' }}
                >
                  <EditorTooltip
                    disabled={isMobile}
                    title="Bản gọn (Type nhanh): Khung nhỏ gọn kiểu Google Chat, tự xuống dòng dấu đầu dòng • khi nhấn Enter"
                  >
                    <button
                      type="button"
                      data-testid="rich-editor-mode-compact"
                      onClick={() => setViewMode('compact')}
                      className={`h-6 sm:h-6.5 px-1.5 sm:px-2 rounded-md flex items-center gap-1 text-[10.5px] sm:text-[11px] font-medium transition-all cursor-pointer ${
                        viewMode === 'compact'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Zap size={11} />
                      <span>Bản gọn</span>
                    </button>
                  </EditorTooltip>

                  <EditorTooltip disabled={isMobile} title="Chỉ soạn thảo (Soạn mã Markdown / Text)">
                    <button
                      type="button"
                      onClick={() => setViewMode('edit')}
                      className={`h-6 sm:h-6.5 px-1.5 sm:px-2 rounded-md flex items-center gap-1 text-[10.5px] sm:text-[11px] font-medium transition-all cursor-pointer ${
                        viewMode === 'edit'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <FileText size={11} />
                      <span className="hidden md:inline">Soạn thảo</span>
                    </button>
                  </EditorTooltip>

                  <EditorTooltip disabled={isMobile} title="Xem song song: Soạn thảo bên trái, Xem trước bên phải">
                    <button
                      type="button"
                      onClick={() => setViewMode('split')}
                      className={`h-6 sm:h-6.5 px-1.5 sm:px-2 rounded-md flex items-center gap-1 text-[10.5px] sm:text-[11px] font-medium transition-all cursor-pointer ${
                        viewMode === 'split'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Columns2 size={11} />
                      <span className="hidden md:inline">Song song</span>
                    </button>
                  </EditorTooltip>

                  <EditorTooltip disabled={isMobile} title="Xem trước trực quan (WYSIWYG Preview)">
                    <button
                      type="button"
                      onClick={() => setViewMode('preview')}
                      className={`h-6 sm:h-6.5 px-1.5 sm:px-2 rounded-md flex items-center gap-1 text-[10.5px] sm:text-[11px] font-medium transition-all cursor-pointer ${
                        viewMode === 'preview'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Eye size={11} />
                      <span className="hidden md:inline">Xem trước</span>
                    </button>
                  </EditorTooltip>
                </div>

                {/* Fullscreen Toggle */}
                {!isCompactMode && (
                  <EditorTooltip disabled={isMobile} title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình'}>
                    <button
                      type="button"
                      onClick={() => setIsFullscreen((prev) => !prev)}
                      className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg border flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      style={{ borderColor: borderCol, color: token.colorTextSecondary }}
                    >
                      {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    </button>
                  </EditorTooltip>
                )}
              </div>
            </div>
          </div>

          {/* Formatting Toolbar (Sleek Google-Chat style in Compact Mode, Full Studio in other modes) */}
          <div
            className="overflow-x-auto no-scrollbar flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 border-b shrink-0 select-none touch-pan-x"
            style={{
              borderColor: borderCol,
              background: isDark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(250, 250, 250, 0.95)',
            }}
          >
            {/* Core Inline Styles: B, I, U, A (Color), S */}
            <div className="flex items-center gap-0.5">
              <EditorTooltip disabled={isMobile} title="In đậm (⌘B)">
                <button
                  type="button"
                  aria-label="In đậm"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('bold')}
                  className={getBtnClass(activeFormats.bold)}
                  style={{ color: activeFormats.bold ? undefined : token.colorText }}
                >
                  <Bold size={14} strokeWidth={2.5} />
                </button>
              </EditorTooltip>

              <EditorTooltip disabled={isMobile} title="In nghiêng (⌘I)">
                <button
                  type="button"
                  aria-label="In nghiêng"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('italic')}
                  className={getBtnClass(activeFormats.italic)}
                  style={{ color: activeFormats.italic ? undefined : token.colorText }}
                >
                  <Italic size={14} />
                </button>
              </EditorTooltip>

              <EditorTooltip disabled={isMobile} title="Gạch chân (⌘U)">
                <button
                  type="button"
                  aria-label="Gạch chân"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('underline')}
                  className={getBtnClass(activeFormats.underline)}
                  style={{ color: activeFormats.underline ? undefined : token.colorText }}
                >
                  <Underline size={14} />
                </button>
              </EditorTooltip>

              {/* [A] Text Color Picker */}
              <Popover
                open={colorPopoverOpen}
                onOpenChange={setColorPopoverOpen}
                trigger="click"
                placement="bottom"
                zIndex={zIndex + 20}
                content={
                  <div className="p-1.5 flex items-center gap-1.5">
                    {QUICK_TEXT_COLORS.map((c) => (
                      <EditorTooltip key={c.id} disabled={isMobile} title={c.label}>
                        <button
                          type="button"
                          aria-label={`Màu chữ ${c.label}`}
                          onPointerDown={captureSelection}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleApplyColor(c.hex)}
                          className="w-7 h-7 sm:w-6 sm:h-6 rounded-full border border-white/20 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                          style={{ background: c.hex }}
                        >
                          {activeColor === c.hex && <Check size={12} className="text-slate-950 stroke-[3]" />}
                        </button>
                      </EditorTooltip>
                    ))}
                  </div>
                }
              >
                <button
                  type="button"
                  aria-label="Chọn màu chữ"
                  title={isMobile ? undefined : 'Màu chữ nổi bật (A)'}
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  className="w-7 h-7 rounded-lg flex flex-col items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shrink-0"
                  style={{ color: token.colorText }}
                >
                  <span className="font-bold text-[12px] leading-none">A</span>
                  <span className="w-3.5 h-[2.5px] rounded-full mt-0.5" style={{ background: activeColor }} />
                </button>
              </Popover>

              <EditorTooltip disabled={isMobile} title="Gạch ngang (~~text~~)">
                <button
                  type="button"
                  aria-label="Gạch ngang"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('strike')}
                  className={getBtnClass(activeFormats.strike)}
                  style={{ color: activeFormats.strike ? undefined : token.colorText }}
                >
                  <Strikethrough size={14} />
                </button>
              </EditorTooltip>
            </div>

            <div className="h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />

            {/* Lists: Bullet (•), Numbered (1.), Checklist ([ ]) */}
            <div className="flex items-center gap-0.5">
              <EditorTooltip
                disabled={isMobile}
                title="Danh sách dấu đầu dòng (• Mục) — Nhấn Enter để tự động thêm dấu • dòng tiếp theo"
              >
                <button
                  type="button"
                  aria-label="Danh sách dấu đầu dòng"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('bullet')}
                  className={getBtnClass(activeFormats.bullet)}
                  style={{ color: activeFormats.bullet ? undefined : token.colorText }}
                >
                  <List size={15} />
                </button>
              </EditorTooltip>

              <EditorTooltip
                disabled={isMobile}
                title="Danh sách đánh số (1. Mục) — Nhấn Enter để tự động tăng số thứ tự"
              >
                <button
                  type="button"
                  aria-label="Danh sách số thứ tự"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('number')}
                  className={getBtnClass(activeFormats.number)}
                  style={{ color: activeFormats.number ? undefined : token.colorText }}
                >
                  <ListOrdered size={15} />
                </button>
              </EditorTooltip>

              <EditorTooltip disabled={isMobile} title="Danh sách việc cần làm (- [ ] Todo)">
                <button
                  type="button"
                  aria-label="Danh sách việc cần làm"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('todo')}
                  className={getBtnClass(activeFormats.todo)}
                  style={{ color: activeFormats.todo ? undefined : '#f59e0b' }}
                >
                  <ListTodo size={15} />
                </button>
              </EditorTooltip>
            </div>

            <div className="h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />

            {/* Quote & Link & Code (matching Google Chat bar) */}
            <div className="flex items-center gap-0.5">
              <EditorTooltip disabled={isMobile} title="Trích dẫn (> Trích dẫn)">
                <button
                  type="button"
                  aria-label="Trích dẫn"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('quote')}
                  className={getBtnClass(activeFormats.quote)}
                  style={{ color: activeFormats.quote ? undefined : token.colorText }}
                >
                  <Quote size={14} />
                </button>
              </EditorTooltip>

              <EditorTooltip disabled={isMobile} title="Chèn liên kết URL [Tên](https://...)">
                <button
                  type="button"
                  aria-label="Chèn liên kết"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('link')}
                  className={getBtnClass(false)}
                  style={{ color: token.colorText }}
                >
                  <LinkIcon size={14} />
                </button>
              </EditorTooltip>
            </div>

            <div className="h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />

            <div className="flex items-center gap-0.5">
              <EditorTooltip disabled={isMobile} title="Mã nội dòng (`code`)">
                <button
                  type="button"
                  aria-label="Mã nội dòng"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('code')}
                  className={getBtnClass(activeFormats.code)}
                  style={{ color: activeFormats.code ? undefined : token.colorText }}
                >
                  <Code size={14} />
                </button>
              </EditorTooltip>

              <EditorTooltip disabled={isMobile} title="Khối mã đa dòng (```)">
                <button
                  type="button"
                  aria-label="Khối mã đa dòng"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('codeblock')}
                  className={getBtnClass(false)}
                  style={{ color: token.colorText }}
                >
                  <SquareCode size={14} />
                </button>
              </EditorTooltip>
            </div>

            {/* Headings & Tables & Dividers: Available in all modes via horizontal scrolling */}
            <div className="h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />
            <div className="flex items-center gap-0.5">
              <EditorTooltip disabled={isMobile} title="Tiêu đề chính lớn (# H1)">
                <button
                  type="button"
                  aria-label="Tiêu đề H1"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('h1')}
                  className={`h-7 px-1.5 rounded-md flex items-center justify-center font-bold text-[11.5px] cursor-pointer shrink-0 ${
                    activeFormats.h1 ? 'bg-amber-500/20 text-amber-400' : 'text-amber-500 hover:bg-white/10'
                  }`}
                >
                  H1
                </button>
              </EditorTooltip>
              <EditorTooltip disabled={isMobile} title="Tiêu đề nhánh (## H2)">
                <button
                  type="button"
                  aria-label="Tiêu đề H2"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('h2')}
                  className={`h-7 px-1.5 rounded-md flex items-center justify-center font-semibold text-[11px] cursor-pointer shrink-0 ${
                    activeFormats.h2 ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/10'
                  }`}
                  style={{ color: token.colorText }}
                >
                  H2
                </button>
              </EditorTooltip>
              <EditorTooltip disabled={isMobile} title="Tiêu đề nhỏ (### H3)">
                <button
                  type="button"
                  aria-label="Tiêu đề H3"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('h3')}
                  className={`h-7 px-1.5 rounded-md flex items-center justify-center font-medium text-[10.5px] cursor-pointer shrink-0 ${
                    activeFormats.h3 ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/10'
                  }`}
                  style={{ color: token.colorText }}
                >
                  H3
                </button>
              </EditorTooltip>
              <EditorTooltip disabled={isMobile} title="Chèn bảng dữ liệu Markdown">
                <button
                  type="button"
                  aria-label="Chèn bảng"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('table')}
                  className={getBtnClass(false)}
                  style={{ color: token.colorText }}
                >
                  <Table size={14} />
                </button>
              </EditorTooltip>
              <EditorTooltip disabled={isMobile} title="Đường kẻ phân cách ngang (---)">
                <button
                  type="button"
                  aria-label="Đường kẻ phân cách"
                  onPointerDown={captureSelection}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('divider')}
                  className={getBtnClass(false)}
                  style={{ color: token.colorText }}
                >
                  <Minus size={15} />
                </button>
              </EditorTooltip>
            </div>

            {/* Extended Studio Diagrams (Mermaid, KaTeX - shown in non-compact modes) */}
            {!isCompactMode && (
              <>
                <div className="h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />
                <div className="flex items-center gap-0.5">
                  <EditorTooltip disabled={isMobile} title="Sơ đồ quy trình tương tác Mermaid (```mermaid)">
                    <button
                      type="button"
                      onPointerDown={captureSelection}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleFormat('mermaid')}
                      className="h-7 px-1.5 rounded-md flex items-center gap-1 text-[11px] font-medium text-purple-400 hover:bg-purple-500/10 cursor-pointer shrink-0"
                    >
                      <GitFork size={13} />
                      <span>Mermaid</span>
                    </button>
                  </EditorTooltip>
                  <EditorTooltip disabled={isMobile} title="Công thức toán học KaTeX ($$ formula $$)">
                    <button
                      type="button"
                      onPointerDown={captureSelection}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleFormat('math')}
                      className="h-7 px-1.5 rounded-md flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/10 cursor-pointer shrink-0"
                    >
                      <Sigma size={13} />
                      <span>KaTeX</span>
                    </button>
                  </EditorTooltip>
                </div>
              </>
            )}

            <div className="hidden sm:block h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />

            {/* Clear Format */}
            <EditorTooltip disabled={isMobile} title="Xóa ký tự định dạng của đoạn đã chọn">
              <button
                type="button"
                aria-label="Xóa định dạng"
                onPointerDown={captureSelection}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormat('clear')}
                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer opacity-75 hover:opacity-100 shrink-0"
                style={{ color: token.colorTextSecondary }}
              >
                <RotateCcw size={13} />
              </button>
            </EditorTooltip>

            {/* MAI trigger */}
            {canUseAiCopilot && (
              <EditorTooltip disabled={isMobile} title="Gắn tag @MAI để gọi mOS AI">
                <button
                  type="button"
                  onPointerDown={captureSelection}
                  onClick={() => {
                    setContent((prev) => (/(?:^|\s)@\s*mai\b/i.test(prev) ? prev : `@MAI ${prev}`));
                  }}
                  className="h-7 px-2 rounded-md flex items-center gap-1 text-[11px] font-black text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-colors cursor-pointer ml-auto shrink-0"
                >
                  <Bot size={13} />
                  <span>@MAI</span>
                </button>
              </EditorTooltip>
            )}
          </div>

          {/* Main Content Area */}
          {isCompactMode ? (
            /* COMPACT QUICK-TYPE MODE (Bản gọn gõ nhanh kiểu Google Chat) */
            <div className="flex-1 flex flex-col min-h-[120px] sm:min-h-[160px] overflow-hidden">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  const pos = e.target.selectionStart ?? e.target.value.length;
                  setCursorPos(pos);
                  lastSelectionRef.current = { start: pos, end: e.target.selectionEnd ?? pos };
                }}
                onClick={(e) => {
                  const pos = e.currentTarget.selectionStart ?? 0;
                  setCursorPos(pos);
                  lastSelectionRef.current = { start: pos, end: e.currentTarget.selectionEnd ?? pos };
                }}
                onKeyUp={(e) => {
                  const pos = e.currentTarget.selectionStart ?? 0;
                  setCursorPos(pos);
                  lastSelectionRef.current = { start: pos, end: e.currentTarget.selectionEnd ?? pos };
                }}
                onSelect={(e) => {
                  const pos = e.currentTarget.selectionStart ?? 0;
                  setCursorPos(pos);
                  lastSelectionRef.current = { start: pos, end: e.currentTarget.selectionEnd ?? pos };
                }}
                onTouchEnd={(e) => {
                  const pos = e.currentTarget.selectionStart ?? 0;
                  setCursorPos(pos);
                  lastSelectionRef.current = { start: pos, end: e.currentTarget.selectionEnd ?? pos };
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    if (content.trim()) {
                      onSend(content);
                      onClose();
                    }
                    return;
                  }
                  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                    e.preventDefault();
                    handleFormat('bold');
                    return;
                  }
                  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
                    e.preventDefault();
                    handleFormat('italic');
                    return;
                  }
                  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
                    e.preventDefault();
                    handleFormat('underline');
                    return;
                  }
                  if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                    const el = e.currentTarget;
                    const smart = handleSmartListEnterKey(
                      content,
                      el.selectionStart ?? content.length,
                      el.selectionEnd ?? content.length
                    );
                    if (smart.handled) {
                      e.preventDefault();
                      setContent(smart.nextText);
                      setCursorPos(smart.nextCursor);
                      setTimeout(() => {
                        el.focus();
                        el.setSelectionRange(smart.nextCursor, smart.nextCursor);
                      }, 0);
                    }
                  }
                }}
                data-testid="rich-editor-compact-textarea"
                placeholder="Gõ nhanh nội dung... (Bấm • để tạo danh sách, nhấn Enter tự động xuống dòng • tiếp theo, ⌘+Enter để gửi ngay)"
                className="flex-1 w-full p-3 sm:p-4 bg-transparent border-0 outline-none resize-none text-[15px] sm:text-[14px] leading-relaxed select-text min-h-[120px] sm:min-h-[140px] overscroll-contain"
                style={{ color: token.colorText }}
              />

              {/* Optional Collapsible Live Preview inside Compact Mode */}
              {content.trim() && (
                <div className="border-t px-4 py-2 bg-black/5 dark:bg-white/[0.02]" style={{ borderColor: borderCol }}>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowCompactPreview((prev) => !prev)}
                      className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <Eye size={12} />
                      <span>{showCompactPreview ? 'Ẩn xem trước' : 'Xem trước hiển thị'}</span>
                    </button>
                    <span className="text-[10.5px] opacity-60" style={{ color: token.colorTextSecondary }}>
                      Enter: Xuống dòng · ⌘+Enter: Gửi ngay
                    </span>
                  </div>
                  {showCompactPreview && (
                    <div className="mt-2 pt-2 border-t border-white/5 max-h-[140px] overflow-y-auto">
                      <MosChatRichText content={content} isMe={false} isDark={isDark} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* STUDIO SPLIT / EDIT / PREVIEW MODES */
            <div
              className={`flex-1 flex overflow-hidden min-h-0 ${viewMode === 'split' ? 'flex-col md:flex-row' : ''}`}
            >
              {/* Editor Pane (Left / Full) */}
              {viewMode !== 'preview' && (
                <div
                  className={`flex-1 flex flex-col min-w-0 min-h-0 ${
                    viewMode === 'split' ? 'border-b md:border-b-0 md:border-r' : ''
                  }`}
                  style={{ borderColor: borderCol }}
                >
                  <div
                    className="px-4 py-1.5 border-b text-[11px] font-semibold flex items-center justify-between uppercase tracking-wider shrink-0"
                    style={{ borderColor: borderCol, color: token.colorTextSecondary, background: toolbarBg }}
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText size={12} className="text-amber-500" />
                      <span>Khung soạn thảo (Markdown / CKEditor Source)</span>
                    </div>
                    <span className="text-[10px] lowercase opacity-75">⌘B đậm · ⌘I nghiêng · ⌘U gạch chân</span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      const pos = e.target.selectionStart ?? e.target.value.length;
                      setCursorPos(pos);
                      lastSelectionRef.current = { start: pos, end: e.target.selectionEnd ?? pos };
                    }}
                    onClick={(e) => {
                      const pos = e.currentTarget.selectionStart ?? 0;
                      setCursorPos(pos);
                      lastSelectionRef.current = { start: pos, end: e.currentTarget.selectionEnd ?? pos };
                    }}
                    onKeyUp={(e) => {
                      const pos = e.currentTarget.selectionStart ?? 0;
                      setCursorPos(pos);
                      lastSelectionRef.current = { start: pos, end: e.currentTarget.selectionEnd ?? pos };
                    }}
                    onSelect={(e) => {
                      const pos = e.currentTarget.selectionStart ?? 0;
                      setCursorPos(pos);
                      lastSelectionRef.current = { start: pos, end: e.currentTarget.selectionEnd ?? pos };
                    }}
                    onTouchEnd={(e) => {
                      const pos = e.currentTarget.selectionStart ?? 0;
                      setCursorPos(pos);
                      lastSelectionRef.current = { start: pos, end: e.currentTarget.selectionEnd ?? pos };
                    }}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                        e.preventDefault();
                        handleFormat('bold');
                      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
                        e.preventDefault();
                        handleFormat('italic');
                      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
                        e.preventDefault();
                        handleFormat('underline');
                      } else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                        const el = e.currentTarget;
                        const smart = handleSmartListEnterKey(
                          content,
                          el.selectionStart ?? content.length,
                          el.selectionEnd ?? content.length
                        );
                        if (smart.handled) {
                          e.preventDefault();
                          setContent(smart.nextText);
                          setCursorPos(smart.nextCursor);
                          setTimeout(() => {
                            el.focus();
                            el.setSelectionRange(smart.nextCursor, smart.nextCursor);
                          }, 0);
                        }
                      }
                    }}
                    placeholder="Nhập nội dung tin nhắn, thông báo, quy trình hoặc tài liệu cần soạn thảo..."
                    className="flex-1 w-full p-3 sm:p-4 bg-transparent border-0 outline-none resize-none font-mono text-[14px] sm:text-[13.5px] leading-relaxed select-text overscroll-contain"
                    style={{ color: token.colorText }}
                  />
                </div>
              )}

              {/* Preview Pane (Right / Full) */}
              {viewMode !== 'edit' && (
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black/5 dark:bg-white/[0.02]">
                  <div
                    className="px-4 py-1.5 border-b text-[11px] font-semibold flex items-center justify-between uppercase tracking-wider shrink-0"
                    style={{ borderColor: borderCol, color: token.colorTextSecondary, background: toolbarBg }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Eye size={12} className="text-emerald-500" />
                      <span>Xem trước trực quan (Live Render)</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold lowercase">Trực quan thời gian thực</span>
                  </div>
                  <div className="flex-1 p-4 sm:p-5 overflow-y-auto overscroll-contain select-text">
                    {content.trim() ? (
                      <div className="prose max-w-none">
                        <MosChatRichText content={content} isMe={false} isDark={isDark} />
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                        <FilePenLine size={36} className="mb-2 opacity-30 text-amber-500" />
                        <p className="text-[13px] font-medium m-0">Chưa có nội dung để hiển thị</p>
                        <p className="text-[11.5px] opacity-75 mt-1 max-w-sm">
                          Hãy nhập nội dung vào khung bên trái hoặc chọn một mẫu soạn thảo nhanh ở trên.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Controls */}
          <div
            className={`flex items-center justify-between px-3 sm:px-4 pt-2 sm:py-2.5 border-t shrink-0 flex-wrap sm:flex-nowrap gap-2 ${
              isMobile
                ? isKeyboardOpen
                  ? 'pb-2'
                  : 'pb-[max(env(safe-area-inset-bottom,12px),12px)]'
                : 'pb-2'
            }`}
            style={{ borderColor: borderCol, background: toolbarBg }}
          >
            <div
              className="hidden sm:flex items-center gap-1.5 text-[11px] sm:text-[11.5px]"
              style={{ color: token.colorTextSecondary }}
            >
              <HelpCircle size={14} className="text-amber-500 shrink-0" />
              <span>
                {isCompactMode
                  ? 'Bản gọn gõ nhanh: Nhấn • để liệt kê ý, Enter tự tiếp nối dòng mới.'
                  : 'Hỗ trợ bảng biểu, sơ đồ Mermaid, công thức KaTeX, danh sách việc cần làm và các phím tắt soạn thảo.'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto sm:ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="h-10 sm:h-8 px-3 rounded-xl border flex items-center justify-center text-[12px] font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                style={{ borderColor: borderCol, color: token.colorText }}
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={() => {
                  onApply(content);
                  onClose();
                }}
                className="flex-1 sm:flex-initial h-10 sm:h-8 px-2.5 sm:px-3.5 rounded-xl border flex items-center justify-center gap-1 sm:gap-1.5 text-[12px] font-semibold hover:bg-amber-500/10 transition-colors cursor-pointer text-amber-500 border-amber-500/40"
              >
                <Check size={14} />
                <span>Áp dụng vào chat</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!content.trim()) return;
                  onSend(content);
                  onClose();
                }}
                disabled={!content.trim()}
                className={`flex-1 sm:flex-initial h-10 sm:h-8 px-3 sm:px-3.5 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 text-[12px] font-bold shadow-md transition-all cursor-pointer ${
                  content.trim()
                    ? 'bg-[#d4a84b] hover:bg-[#c3973a] text-slate-950 active:scale-95'
                    : 'bg-zinc-700 text-zinc-400 opacity-50 cursor-not-allowed'
                }`}
              >
                <SendHorizontal size={14} />
                <span>Gửi tin nhắn ngay</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Insert Link Modal */}
      <Modal
        open={linkModalOpen}
        zIndex={zIndex + 10}
        onCancel={() => setLinkModalOpen(false)}
        onOk={handleInsertLink}
        title="Chèn liên kết URL"
        okText="Chèn liên kết"
        cancelText="Hủy"
        centered={isMobile}
        className={isMobile ? 'adaptive-overlay' : undefined}
        width={isMobile ? 'min(420px, calc(100vw - 24px))' : 420}
        destroyOnHidden
      >
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-[12px] font-medium mb-1 text-zinc-400">Tiêu đề hiển thị:</label>
            <input
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="VD: Xem bảng chỉ tiêu..."
              className="w-full px-3 py-1.5 rounded-lg border bg-transparent text-[13px] outline-none"
              style={{ borderColor: borderCol, color: token.colorText }}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1 text-zinc-400">Đường dẫn liên kết (URL):</label>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-1.5 rounded-lg border bg-transparent text-[13px] outline-none"
              style={{ borderColor: borderCol, color: token.colorText }}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Modal, Tooltip, Popover, theme as antdTheme } from 'antd';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
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
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Bot,
  HelpCircle,
  Check,
} from 'lucide-react';
import { MosChatRichText } from './MosChatRichText';

export type EditorFormatType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
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

export interface MosChatRichEditorModalProps {
  open: boolean;
  onClose: () => void;
  initialValue: string;
  onApply: (text: string) => void;
  onSend: (text: string) => void;
  title?: string;
  isDark?: boolean;
  canUseAiCopilot?: boolean;
}

const TEMPLATES = [
  {
    id: 'announcement',
    title: '📢 Thông báo nội bộ',
    desc: 'Mẫu thông báo thông tin, chính sách hoặc quy định mới',
    content: `# 📢 THÔNG BÁO NỘI BỘ
**Kính gửi:** Toàn thể đội ngũ Wings

## 1. Mục đích thông báo
- 

## 2. Nội dung chi tiết & Thời gian áp dụng
- **Thời gian áp dụng:** Bắt đầu từ ngày ...
- **Phạm vi áp dụng:** Toàn bộ chi nhánh

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
- 

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
- 

## 3. Khó khăn & Kiến nghị
- 
`,
  },
  {
    id: 'meeting_minutes',
    title: '📝 Biên bản cuộc họp',
    desc: 'Mẫu ghi chép nội dung thống nhất và đầu việc giao kết',
    content: `# 📝 BIÊN BẢN CUỘC HỌP
- **Thời gian:** Ngày ... tháng ... năm ...
- **Thành phần tham dự:** @Danny Do, ...

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

export const MosChatRichEditorModal: React.FC<MosChatRichEditorModalProps> = ({
  open,
  onClose,
  initialValue,
  onApply,
  onSend,
  title = 'Soạn thảo phong phú (CKEditor)',
  isDark = true,
  canUseAiCopilot = true,
}) => {
  const { token } = antdTheme.useToken();
  const [content, setContent] = useState(initialValue);
  const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('split');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync initialValue when modal opens
  useEffect(() => {
    if (open) {
      setContent(initialValue);
      // Default to split mode on larger screens, edit mode on small screens
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setViewMode('edit');
      } else {
        setViewMode('split');
      }
    }
  }, [open, initialValue]);

  // Statistics
  const stats = useMemo(() => {
    const chars = content.length;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const lines = content ? content.split('\n').length : 0;
    return { chars, words, lines };
  }, [content]);

  /**
   * Apply formatting to textarea selection
   */
  const handleFormat = useCallback(
    (formatType: EditorFormatType) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart ?? content.length;
      const end = textarea.selectionEnd ?? content.length;
      const selected = content.substring(start, end);

      let replacement = '';
      let cursorOffset = 0;

      switch (formatType) {
        case 'bold':
          replacement = selected ? `**${selected}**` : '**chữ đậm**';
          cursorOffset = selected ? replacement.length : 2;
          break;
        case 'italic':
          replacement = selected ? `*${selected}*` : '*chữ nghiêng*';
          cursorOffset = selected ? replacement.length : 1;
          break;
        case 'underline':
          replacement = selected ? `<u>${selected}</u>` : '<u>gạch chân</u>';
          cursorOffset = selected ? replacement.length : 3;
          break;
        case 'strike':
          replacement = selected ? `~~${selected}~~` : '~~gạch ngang~~';
          cursorOffset = selected ? replacement.length : 2;
          break;
        case 'code':
          replacement = selected ? `\`${selected}\`` : '`mã code`';
          cursorOffset = selected ? replacement.length : 1;
          break;
        case 'codeblock':
          replacement = selected ? `\`\`\`typescript\n${selected}\n\`\`\`` : '```typescript\n// Mã lập trình tại đây\n```';
          cursorOffset = selected ? replacement.length : 14;
          break;
        case 'h1': {
          const lineStart = content.lastIndexOf('\n', start - 1) + 1;
          const prefix = content.substring(0, lineStart);
          const rest = content.substring(lineStart);
          const newText = `${prefix}# ${rest}`;
          setContent(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 2, end + 2);
          }, 0);
          return;
        }
        case 'h2': {
          const lineStart = content.lastIndexOf('\n', start - 1) + 1;
          const prefix = content.substring(0, lineStart);
          const rest = content.substring(lineStart);
          const newText = `${prefix}## ${rest}`;
          setContent(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 3, end + 3);
          }, 0);
          return;
        }
        case 'h3': {
          const lineStart = content.lastIndexOf('\n', start - 1) + 1;
          const prefix = content.substring(0, lineStart);
          const rest = content.substring(lineStart);
          const newText = `${prefix}### ${rest}`;
          setContent(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 4, end + 4);
          }, 0);
          return;
        }
        case 'bullet': {
          const lineStart = content.lastIndexOf('\n', start - 1) + 1;
          const prefix = content.substring(0, lineStart);
          const rest = content.substring(lineStart);
          const newText = `${prefix}- ${rest}`;
          setContent(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 2, end + 2);
          }, 0);
          return;
        }
        case 'number': {
          const lineStart = content.lastIndexOf('\n', start - 1) + 1;
          const prefix = content.substring(0, lineStart);
          const rest = content.substring(lineStart);
          const newText = `${prefix}1. ${rest}`;
          setContent(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 3, end + 3);
          }, 0);
          return;
        }
        case 'todo': {
          const lineStart = content.lastIndexOf('\n', start - 1) + 1;
          const prefix = content.substring(0, lineStart);
          const rest = content.substring(lineStart);
          const newText = `${prefix}- [ ] ${rest}`;
          setContent(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 6, end + 6);
          }, 0);
          return;
        }
        case 'quote': {
          const lineStart = content.lastIndexOf('\n', start - 1) + 1;
          const prefix = content.substring(0, lineStart);
          const rest = content.substring(lineStart);
          const newText = `${prefix}> ${rest}`;
          setContent(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 2, end + 2);
          }, 0);
          return;
        }
        case 'table':
          replacement = `\n| Cột 1 | Cột 2 | Cột 3 |\n|---|---|---|\n| Dữ liệu 1 | Dữ liệu 2 | Chi tiết |\n| Dữ liệu 3 | Dữ liệu 4 | Chi tiết |\n`;
          cursorOffset = replacement.length;
          break;
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
          // Strip basic markdown symbols
          replacement = selected
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/~~(.*?)~~/g, '$1')
            .replace(/<u>(.*?)<\/u>/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/^#+\s+/gm, '')
            .replace(/^[-*•]\s+/gm, '')
            .replace(/^\d+\.\s+/gm, '')
            .replace(/^-\s*\[[ x]\]\s+/gm, '')
            .replace(/^>\s+/gm, '');
          cursorOffset = replacement.length;
          break;
      }

      const nextVal = content.substring(0, start) + replacement + content.substring(end);
      setContent(nextVal);
      setTimeout(() => {
        textarea.focus();
        if (selected && formatType !== 'clear') {
          textarea.setSelectionRange(start, start + replacement.length);
        } else {
          textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
        }
      }, 0);
    },
    [content]
  );

  const handleInsertLink = () => {
    const textToInsert = linkText.trim() || linkUrl.trim();
    const urlToInsert = linkUrl.trim() || '#';
    const linkMd = `[${textToInsert}](${urlToInsert})`;

    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart ?? content.length;
      const end = textarea.selectionEnd ?? content.length;
      const nextVal = content.substring(0, start) + linkMd + content.substring(end);
      setContent(nextVal);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + linkMd.length, start + linkMd.length);
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

  const surfaceBg = isDark ? '#18181b' : '#ffffff';
  const toolbarBg = isDark ? 'rgba(39, 39, 42, 0.7)' : 'rgba(244, 244, 245, 0.8)';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={isFullscreen ? '98vw' : 1000}
        style={{ top: isFullscreen ? 10 : 28, maxWidth: '100vw' }}
        styles={{
          content: {
            padding: 0,
            borderRadius: isFullscreen ? 12 : 20,
            overflow: 'hidden',
            background: surfaceBg,
            border: `1px solid ${borderCol}`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          },
        }}
        closable={true}
        destroyOnHidden
      >
        <div className="flex flex-col h-[82vh] max-h-[900px] select-text">
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
            style={{ borderColor: borderCol, background: toolbarBg }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/25 shrink-0 shadow-sm">
                <FilePenLine size={17} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-bold m-0 leading-tight" style={{ color: token.colorText }}>
                    {title}
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    CKEditor Mode
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px]" style={{ color: token.colorTextSecondary }}>
                  <span>{stats.words} từ</span>
                  <span>·</span>
                  <span>{stats.chars} ký tự</span>
                  <span>·</span>
                  <span>{stats.lines} dòng</span>
                </div>
              </div>
            </div>

            {/* Top Right Controls */}
            <div className="flex items-center gap-2 mr-7">
              {/* Template Selector */}
              <Popover
                open={templatePopoverOpen}
                onOpenChange={setTemplatePopoverOpen}
                trigger="click"
                placement="bottomRight"
                content={
                  <div className="w-72 p-1 space-y-1">
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
                  className="h-8 px-2.5 rounded-lg border flex items-center gap-1.5 text-[11.5px] font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  style={{ borderColor: borderCol, color: token.colorText }}
                >
                  <Sparkles size={13} className="text-amber-500" />
                  <span className="hidden sm:inline">Mẫu nhanh</span>
                </button>
              </Popover>

              {/* View Mode Segmented Controls */}
              <div
                className="flex items-center p-0.5 rounded-lg border shrink-0"
                style={{ borderColor: borderCol, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)' }}
              >
                <Tooltip title="Chỉ soạn thảo (Soạn mã Markdown / Text)">
                  <button
                    type="button"
                    onClick={() => setViewMode('edit')}
                    className={`h-7 px-2.5 rounded-md flex items-center gap-1 text-[11.5px] font-medium transition-all cursor-pointer ${
                      viewMode === 'edit'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <FileText size={13} />
                    <span className="hidden md:inline">Soạn thảo</span>
                  </button>
                </Tooltip>

                <Tooltip title="Xem song song: Soạn thảo bên trái, Xem trước bên phải">
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`h-7 px-2.5 rounded-md flex items-center gap-1 text-[11.5px] font-medium transition-all cursor-pointer ${
                      viewMode === 'split'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Columns2 size={13} />
                    <span className="hidden md:inline">Song song</span>
                  </button>
                </Tooltip>

                <Tooltip title="Xem trước trực quan (WYSIWYG Preview)">
                  <button
                    type="button"
                    onClick={() => setViewMode('preview')}
                    className={`h-7 px-2.5 rounded-md flex items-center gap-1 text-[11.5px] font-medium transition-all cursor-pointer ${
                      viewMode === 'preview'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Eye size={13} />
                    <span className="hidden md:inline">Xem trước</span>
                  </button>
                </Tooltip>
              </div>

              {/* Fullscreen Toggle */}
              <Tooltip title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình'}>
                <button
                  type="button"
                  onClick={() => setIsFullscreen((prev) => !prev)}
                  className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  style={{ borderColor: borderCol, color: token.colorTextSecondary }}
                >
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </Tooltip>
            </div>
          </div>

          {/* CKEditor-Style Formatting Toolbar */}
          <div
            className="flex items-center gap-1 px-4 py-2 border-b overflow-x-auto no-scrollbar shrink-0 select-none"
            style={{
              borderColor: borderCol,
              background: isDark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(250, 250, 250, 0.95)',
            }}
          >
            {/* Headings */}
            <div className="flex items-center gap-0.5">
              <Tooltip title="Tiêu đề chính lớn (# H1)">
                <button
                  type="button"
                  onClick={() => handleFormat('h1')}
                  className="h-7 px-2 rounded-md flex items-center justify-center font-bold text-[11.5px] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-amber-500"
                >
                  H1
                </button>
              </Tooltip>
              <Tooltip title="Tiêu đề nhánh (## H2)">
                <button
                  type="button"
                  onClick={() => handleFormat('h2')}
                  className="h-7 px-2 rounded-md flex items-center justify-center font-semibold text-[11px] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  style={{ color: token.colorText }}
                >
                  H2
                </button>
              </Tooltip>
              <Tooltip title="Tiêu đề nhỏ (### H3)">
                <button
                  type="button"
                  onClick={() => handleFormat('h3')}
                  className="h-7 px-2 rounded-md flex items-center justify-center font-medium text-[10.5px] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer opacity-85"
                  style={{ color: token.colorText }}
                >
                  H3
                </button>
              </Tooltip>
            </div>

            <div className="h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />

            {/* Inline Styles */}
            <div className="flex items-center gap-0.5">
              <Tooltip title="In đậm (⌘B / **text**)">
                <button
                  type="button"
                  onClick={() => handleFormat('bold')}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer font-bold"
                  style={{ color: token.colorText }}
                >
                  <Bold size={14} strokeWidth={2.5} />
                </button>
              </Tooltip>
              <Tooltip title="In nghiêng (⌘I / *text*)">
                <button
                  type="button"
                  onClick={() => handleFormat('italic')}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer italic"
                  style={{ color: token.colorText }}
                >
                  <Italic size={14} />
                </button>
              </Tooltip>
              <Tooltip title="Gạch chân (⌘U / <u>text</u>)">
                <button
                  type="button"
                  onClick={() => handleFormat('underline')}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  style={{ color: token.colorText }}
                >
                  <Underline size={14} />
                </button>
              </Tooltip>
              <Tooltip title="Gạch ngang (~~text~~)">
                <button
                  type="button"
                  onClick={() => handleFormat('strike')}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  style={{ color: token.colorText }}
                >
                  <Strikethrough size={14} />
                </button>
              </Tooltip>
              <Tooltip title="Mã nội dòng (`code`)">
                <button
                  type="button"
                  onClick={() => handleFormat('code')}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer font-mono text-[11px]"
                  style={{ color: token.colorText }}
                >
                  <Code size={14} />
                </button>
              </Tooltip>
            </div>

            <div className="h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />

            {/* Lists */}
            <div className="flex items-center gap-0.5">
              <Tooltip title="Danh sách việc cần làm (- [ ] Todo)">
                <button
                  type="button"
                  onClick={() => handleFormat('todo')}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-amber-500"
                >
                  <ListTodo size={15} />
                </button>
              </Tooltip>
              <Tooltip title="Danh sách dấu chấm (- Mục)">
                <button
                  type="button"
                  onClick={() => handleFormat('bullet')}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  style={{ color: token.colorText }}
                >
                  <List size={15} />
                </button>
              </Tooltip>
              <Tooltip title="Danh sách số thứ tự (1. Mục)">
                <button
                  type="button"
                  onClick={() => handleFormat('number')}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  style={{ color: token.colorText }}
                >
                  <ListOrdered size={15} />
                </button>
              </Tooltip>
            </div>

            <div className="h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />

            {/* Blocks & Inserts */}
            <div className="flex items-center gap-0.5">
              <Tooltip title="Trích dẫn (> Trích dẫn)">
                <button
                  type="button"
                  onClick={() => handleFormat('quote')}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  style={{ color: token.colorText }}
                >
                  <Quote size={14} />
                </button>
              </Tooltip>
              <Tooltip title="Chèn bảng dữ liệu Markdown">
                <button
                  type="button"
                  onClick={() => handleFormat('table')}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  style={{ color: token.colorText }}
                >
                  <Table size={14} />
                </button>
              </Tooltip>
              <Tooltip title="Chèn liên kết URL [Tên](https://...)">
                <button
                  type="button"
                  onClick={() => handleFormat('link')}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  style={{ color: token.colorText }}
                >
                  <LinkIcon size={14} />
                </button>
              </Tooltip>
              <Tooltip title="Khối mã lập trình đa dòng (```)">
                <button
                  type="button"
                  onClick={() => handleFormat('codeblock')}
                  className="h-7 px-1.5 rounded-md flex items-center gap-1 font-mono text-[11px] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  style={{ color: token.colorText }}
                >
                  <Code size={13} />
                  <span>Block</span>
                </button>
              </Tooltip>
              <Tooltip title="Sơ đồ quy trình tương tác Mermaid (```mermaid)">
                <button
                  type="button"
                  onClick={() => handleFormat('mermaid')}
                  className="h-7 px-1.5 rounded-md flex items-center gap-1 text-[11px] font-medium text-purple-400 hover:bg-purple-500/10 cursor-pointer"
                >
                  <GitFork size={13} />
                  <span>Mermaid</span>
                </button>
              </Tooltip>
              <Tooltip title="Công thức toán học KaTeX ($$ formula $$)">
                <button
                  type="button"
                  onClick={() => handleFormat('math')}
                  className="h-7 px-1.5 rounded-md flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                >
                  <Sigma size={13} />
                  <span>KaTeX</span>
                </button>
              </Tooltip>
              <Tooltip title="Đường kẻ phân cách ngang (---)">
                <button
                  type="button"
                  onClick={() => handleFormat('divider')}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  style={{ color: token.colorText }}
                >
                  <Minus size={15} />
                </button>
              </Tooltip>
            </div>

            <div className="h-4 w-[1px] bg-zinc-700/40 shrink-0 mx-1" />

            {/* Clear Format */}
            <Tooltip title="Xóa ký tự định dạng của đoạn đã chọn">
              <button
                type="button"
                onClick={() => handleFormat('clear')}
                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer opacity-75 hover:opacity-100"
                style={{ color: token.colorTextSecondary }}
              >
                <RotateCcw size={13} />
              </button>
            </Tooltip>

            {/* MAI trigger */}
            {canUseAiCopilot && (
              <Tooltip title="Gắn tag @MAI để gọi mOS AI">
                <button
                  type="button"
                  onClick={() => {
                    setContent((prev) => (/(?:^|\s)@\s*mai\b/i.test(prev) ? prev : `@MAI ${prev}`));
                  }}
                  className="h-7 px-2 rounded-md flex items-center gap-1 text-[11px] font-black text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-colors cursor-pointer ml-auto shrink-0"
                >
                  <Bot size={13} />
                  <span>@MAI</span>
                </button>
              </Tooltip>
            )}
          </div>

          {/* Main Content Area: Split, Edit Only, or Preview Only */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Editor Pane (Left / Full) */}
            {viewMode !== 'preview' && (
              <div
                className={`flex-1 flex flex-col min-w-0 ${
                  viewMode === 'split' ? 'border-r' : ''
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
                  onChange={(e) => setContent(e.target.value)}
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
                    }
                  }}
                  placeholder="Nhập nội dung tin nhắn, thông báo, quy trình hoặc tài liệu cần soạn thảo..."
                  className="flex-1 w-full p-4 bg-transparent border-0 outline-none resize-none font-mono text-[13.5px] leading-relaxed select-text"
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
                <div className="flex-1 p-5 overflow-y-auto select-text">
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

          {/* Footer Controls */}
          <div
            className="flex items-center justify-between px-5 py-3 border-t shrink-0"
            style={{ borderColor: borderCol, background: toolbarBg }}
          >
            <div className="flex items-center gap-2 text-[11.5px]" style={{ color: token.colorTextSecondary }}>
              <HelpCircle size={14} className="text-amber-500 shrink-0" />
              <span className="hidden sm:inline">
                Hỗ trợ bảng biểu, sơ đồ Mermaid, công thức KaTeX, danh sách việc cần làm và các phím tắt soạn thảo.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-xl border flex items-center justify-center text-[12.5px] font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
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
                className="h-9 px-4 rounded-xl border flex items-center justify-center gap-1.5 text-[12.5px] font-semibold hover:bg-amber-500/10 transition-colors cursor-pointer text-amber-500 border-amber-500/40"
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
                className={`h-9 px-4 rounded-xl flex items-center justify-center gap-1.5 text-[12.5px] font-bold shadow-md transition-all cursor-pointer ${
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
        onCancel={() => setLinkModalOpen(false)}
        onOk={handleInsertLink}
        title="Chèn liên kết URL"
        okText="Chèn liên kết"
        cancelText="Hủy"
        width={420}
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

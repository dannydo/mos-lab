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

export interface EditorStats {
  chars: number;
  words: number;
  lines: number;
}

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

export const RICH_EDITOR_TEMPLATES = [
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

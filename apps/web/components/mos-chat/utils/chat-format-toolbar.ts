export type ChatComposerFormatType =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'underline'
  | 'color'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'todo'
  | 'bullet'
  | 'number'
  | 'quote'
  | 'code'
  | 'codeblock'
  | 'table'
  | 'link'
  | 'divider'
  | 'mermaid'
  | 'math'
  | 'clear';

export interface ApplyComposerFormatParams {
  formatType: ChatComposerFormatType;
  textarea: HTMLTextAreaElement | null;
  currentValue: string;
  inlineTextColor: string;
  customColorHex?: string;
  setValue: (val: string) => void;
  setCursor: (pos: number) => void;
}

/**
 * Applies Markdown / Google Chat quick-formatting syntax around the textarea selection
 * and restores focus + selection range safely.
 */
export function applyChatComposerFormat({
  formatType,
  textarea,
  currentValue,
  inlineTextColor,
  customColorHex,
  setValue,
  setCursor,
}: ApplyComposerFormatParams): void {
  if (!textarea) return;

  const start = textarea.selectionStart ?? currentValue.length;
  const end = textarea.selectionEnd ?? currentValue.length;
  const selectedText = currentValue.substring(start, end);

  const toggleLinePrefixInComposer = (targetPrefix: string, stripPattern: RegExp) => {
    const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
    const nextNewline = currentValue.indexOf('\n', start);
    const lineEnd = nextNewline === -1 ? currentValue.length : nextNewline;

    const beforeLine = currentValue.substring(0, lineStart);
    const currentLine = currentValue.substring(lineStart, lineEnd);
    const afterLine = currentValue.substring(lineEnd);

    let updatedLine: string;
    if (stripPattern.test(currentLine)) {
      updatedLine = currentLine.replace(stripPattern, '');
    } else {
      const cleanedLine = currentLine.replace(/^(?:-\s\[[ xX]\]\s|[•\-*]\s|\d+\.\s|>\s|#{1,3}\s)/, '');
      updatedLine = `${targetPrefix}${cleanedLine}`;
    }
    const delta = updatedLine.length - currentLine.length;

    const newText = `${beforeLine}${updatedLine}${afterLine}`;
    const nextStart = Math.max(lineStart, start + delta);
    const nextEnd = Math.max(lineStart, end + delta);
    setValue(newText);
    setCursor(nextStart);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(nextStart, nextEnd);
    }, 0);
  };

  const toggleInlineInComposer = (openTag: string, closeTag: string) => {
    const before = currentValue.substring(0, start);
    const after = currentValue.substring(end);

    if (!selectedText && before.endsWith(openTag) && after.startsWith(closeTag)) {
      const newText = before.slice(0, -openTag.length) + after.slice(closeTag.length);
      const nextPos = start - openTag.length;
      setValue(newText);
      setCursor(nextPos);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(nextPos, nextPos);
      }, 0);
      return;
    }

    if (
      selectedText.startsWith(openTag) &&
      selectedText.endsWith(closeTag) &&
      selectedText.length >= openTag.length + closeTag.length
    ) {
      const unwrapped = selectedText.slice(openTag.length, -closeTag.length);
      const newText = before + unwrapped + after;
      setValue(newText);
      setCursor(start + unwrapped.length);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + unwrapped.length);
      }, 0);
      return;
    }

    const wrapped = `${openTag}${selectedText}${closeTag}`;
    const newText = before + wrapped + after;
    const nextPos = selectedText ? start + wrapped.length : start + openTag.length;
    setValue(newText);
    setCursor(nextPos);
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start, start + wrapped.length);
      } else {
        textarea.setSelectionRange(nextPos, nextPos);
      }
    }, 0);
  };

  switch (formatType) {
    case 'bold':
      toggleInlineInComposer('**', '**');
      return;
    case 'italic':
      toggleInlineInComposer('*', '*');
      return;
    case 'strike':
      toggleInlineInComposer('~~', '~~');
      return;
    case 'underline':
      toggleInlineInComposer('<u>', '</u>');
      return;
    case 'color': {
      const hex = customColorHex || inlineTextColor || '#f59e0b';
      toggleInlineInComposer(`<span style="color:${hex}">`, '</span>');
      return;
    }
    case 'code':
      toggleInlineInComposer('`', '`');
      return;
    case 'h1':
      toggleLinePrefixInComposer('# ', /^#\s/);
      return;
    case 'h2':
      toggleLinePrefixInComposer('## ', /^##\s/);
      return;
    case 'h3':
      toggleLinePrefixInComposer('### ', /^###\s/);
      return;
    case 'todo':
      toggleLinePrefixInComposer('- [ ] ', /^-\s\[[ xX]\]\s/);
      return;
    case 'bullet':
      toggleLinePrefixInComposer('• ', /^[•\-*]\s/);
      return;
    case 'number':
      toggleLinePrefixInComposer('1. ', /^\d+\.\s/);
      return;
    case 'quote':
      toggleLinePrefixInComposer('> ', /^>\s?/);
      return;
    default:
      break;
  }

  let replacement = '';
  let cursorOffset = 0;

  switch (formatType) {
    case 'codeblock':
      replacement = selectedText ? `\`\`\`\n${selectedText}\n\`\`\`` : '```\n\n```';
      cursorOffset = selectedText ? replacement.length : 4;
      break;
    case 'table':
      replacement = `\n| Cột 1 | Cột 2 | Cột 3 |\n|---|---|---|\n| Dữ liệu 1 | Dữ liệu 2 | Chi tiết |\n| Dữ liệu 3 | Dữ liệu 4 | Chi tiết |\n`;
      cursorOffset = replacement.length;
      break;
    case 'link':
      replacement = selectedText ? `[${selectedText}](https://)` : '[Liên kết](https://)';
      cursorOffset = selectedText ? replacement.length - 1 : 19;
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
      if (!selectedText) return;
      replacement = selectedText
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

  const newValue = currentValue.substring(0, start) + replacement + currentValue.substring(end);
  setValue(newValue);
  setCursor(start + cursorOffset);
  setTimeout(() => {
    textarea.focus();
    if (selectedText && formatType !== 'clear' && formatType !== 'link') {
      textarea.setSelectionRange(start, start + replacement.length);
    } else {
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }
  }, 0);
}

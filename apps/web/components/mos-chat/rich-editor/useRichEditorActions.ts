'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type EditorFormatType,
  type EditorStats,
  type RichEditorViewMode,
  detectActiveFormatsAtCursor,
  handleSmartListEnterKey,
} from './richEditorUtils';

interface UseRichEditorActionsParams {
  open: boolean;
  initialValue: string;
  initialMode?: RichEditorViewMode;
  onSend: (text: string) => void;
  onClose: () => void;
}

export function useRichEditorActions({ open, initialValue, initialMode, onSend, onClose }: UseRichEditorActionsParams) {
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

  const stats: EditorStats = useMemo(() => {
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
    [content]
  );

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
        updatedLine = currentLine.replace(stripPattern, '');
        delta = updatedLine.length - currentLine.length;
      } else {
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

  const toggleInlineWrapper = useCallback(
    (openTag: string, closeTag: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { start, end } = getEffectiveSelection(textarea);
      const selected = content.substring(start, end);

      const before = content.substring(0, start);
      const after = content.substring(end);

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
    [content, getEffectiveSelection]
  );

  const handleApplyColor = useCallback(
    (hex: string) => {
      setActiveColor(hex);
      setColorPopoverOpen(false);
      toggleInlineWrapper(`<span style="color:${hex}">`, '</span>');
    },
    [toggleInlineWrapper]
  );

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

  const updateSelectionState = (target: HTMLTextAreaElement, fallbackPos = 0) => {
    const pos = target.selectionStart ?? fallbackPos;
    setCursorPos(pos);
    lastSelectionRef.current = { start: pos, end: target.selectionEnd ?? pos };
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, allowMetaEnterSend: boolean) => {
    if (allowMetaEnterSend && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
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
  };

  const handleTagMai = () => {
    setContent((prev) => (/(?:^|\s)@\s*mai\b/i.test(prev) ? prev : `@MAI ${prev}`));
  };

  const mobileSafeTopMinPx = 56;
  const mobileMaxModalHeight =
    isMobile && visibleHeight > 0 ? Math.max(220, visibleHeight - mobileSafeTopMinPx) : undefined;

  return {
    content,
    setContent,
    viewMode,
    setViewMode,
    isFullscreen,
    setIsFullscreen,
    linkModalOpen,
    setLinkModalOpen,
    linkText,
    setLinkText,
    linkUrl,
    setLinkUrl,
    templatePopoverOpen,
    setTemplatePopoverOpen,
    colorPopoverOpen,
    setColorPopoverOpen,
    activeColor,
    showCompactPreview,
    setShowCompactPreview,
    isMobile,
    keyboardOffset,
    visibleHeight,
    visualViewportOffsetTop,
    mobileMaxModalHeight,
    isCompactMode: viewMode === 'compact',
    isKeyboardOpen: keyboardOffset > 40,
    textareaRef,
    activeFormats,
    stats,
    captureSelection,
    handleApplyColor,
    handleFormat,
    handleInsertLink,
    handleSelectTemplate,
    updateSelectionState,
    handleTextareaKeyDown,
    handleTagMai,
  };
}

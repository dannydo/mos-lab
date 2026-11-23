'use client';

import React, { useCallback, useContext, useMemo } from 'react';
import type { SafeAny } from '@mos-lab/shared';
import { MosChatContext } from './context/MosChatContext';
import { parseInlineRichTextNodes } from './rich-text/parseInlineRichText';
import { renderRichTextBlocks } from './rich-text/renderRichTextBlocks';
import {
  buildInlineRegexSource,
  buildKnownMultiWordStaffNames,
  decodeHtmlEntities,
  toCaseInsensitivePattern,
} from './rich-text/richTextUtils';

export { decodeHtmlEntities };

export interface MosChatRichTextProps {
  content?: string | null;
  isMe?: boolean;
  isDark?: boolean;
  className?: string;
  staffDirectory?: SafeAny[];
  memberNicknames?: Record<string, string>;
  currentUser?: SafeAny;
  /** Callback khi user click vào blockquote — dùng để scroll về message gốc */
  onQuoteClick?: (senderName: string, quotedContent: string) => void;
}

/**
 * Component render nội dung tin nhắn phong cách Rich Text / Markdown / HTML nâng cao cho mOS Chat
 */
export const MosChatRichTextPure: React.FC<MosChatRichTextProps> = React.memo(
  ({
    content,
    isMe = false,
    isDark = true,
    className = '',
    staffDirectory = [],
    memberNicknames,
    currentUser,
    onQuoteClick,
  }) => {
    const knownMultiWordStaffNames = useMemo(
      () => buildKnownMultiWordStaffNames(staffDirectory, memberNicknames),
      [staffDirectory, memberNicknames]
    );

    const staffPattern = useMemo(() => {
      return knownMultiWordStaffNames.length > 0
        ? `|(@(?:${knownMultiWordStaffNames.map(toCaseInsensitivePattern).join('|')})(?:\\s*[\\p{Extended_Pictographic}\\uFE0F\\u200D]+)?(?=\\s|[.,!?:;]|$))`
        : '';
    }, [knownMultiWordStaffNames]);

    const inlineRegexSource = useMemo(() => buildInlineRegexSource(staffPattern), [staffPattern]);

    const parseInlineRichText = useCallback(
      (text: string, keyPrefix = 'inline', depth = 0): React.ReactNode[] =>
        parseInlineRichTextNodes(
          text,
          { inlineRegexSource, isMe, isDark, currentUser, memberNicknames },
          keyPrefix,
          depth
        ),
      [inlineRegexSource, isMe, isDark, currentUser, memberNicknames]
    );

    const renderedContent = useMemo(
      () => renderRichTextBlocks({ content, isDark, onQuoteClick, parseInlineRichText }),
      [content, isDark, onQuoteClick, parseInlineRichText]
    );

    if (!renderedContent) return null;

    return <div className={`space-y-0.5 text-left ${className}`}>{renderedContent}</div>;
  }
);

MosChatRichTextPure.displayName = 'MosChatRichTextPure';

const MosChatRichTextWithContext: React.FC<MosChatRichTextProps> = (props) => {
  const chatContext = useContext(MosChatContext);
  const currentUser = props.currentUser || chatContext?.currentUser;
  const staffDirectory = props.staffDirectory || chatContext?.staffDirectory || [];

  const memberNicknames = useMemo(() => {
    const merged: Record<string, string> = {};
    if (chatContext?.conversations) {
      chatContext.conversations.forEach((c) => {
        if (c.memberNicknames) {
          Object.assign(merged, c.memberNicknames);
        }
      });
    }
    if (chatContext?.activeConversation?.memberNicknames) {
      Object.assign(merged, chatContext.activeConversation.memberNicknames);
    }
    if (props.memberNicknames) {
      Object.assign(merged, props.memberNicknames);
    }
    return merged;
  }, [chatContext, props.memberNicknames]);

  return (
    <MosChatRichTextPure
      {...props}
      currentUser={currentUser}
      staffDirectory={staffDirectory}
      memberNicknames={memberNicknames}
    />
  );
};

export const MosChatRichText: React.FC<MosChatRichTextProps> = React.memo((props) => {
  if (props.staffDirectory !== undefined && props.currentUser !== undefined && props.memberNicknames !== undefined) {
    return <MosChatRichTextPure {...props} />;
  }
  return <MosChatRichTextWithContext {...props} />;
});

MosChatRichText.displayName = 'MosChatRichText';

export default MosChatRichText;

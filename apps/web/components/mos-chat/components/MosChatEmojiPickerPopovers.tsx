'use client';

import React from 'react';
import type { MosChatMessage, MosChatThreadReply } from '@mos-lab/shared';
import { GOOGLE_CHAT_REACTION_EMOJIS, WINGS_SIGNATURE_EMOJIS } from '../constants/chat-constants';
import {
  formatStickerToken,
  MosChatStickerAndEmojiPicker,
  type MosChatStickerItem,
  type MosChatStickerPackId,
} from '../mos-chat-stickers';

export interface MosChatReactionPickerPopoverProps {
  msgId: string;
  msgObj?: MosChatMessage | MosChatThreadReply;
  replyId?: string;
  isDark: boolean;
  borderColor: string;
  surfaceRaised: string;
  hasUserReacted: (msgObj: MosChatMessage | MosChatThreadReply | undefined, key: string) => boolean;
  setOpenStickerPopoverKey: (key: string | null) => void;
  handleToggleReaction: (msgId: string, emoji: string, replyId?: string) => Promise<void> | void;
}

export const MosChatReactionPickerPopover: React.FC<MosChatReactionPickerPopoverProps> = ({
  msgId,
  msgObj,
  replyId,
  isDark,
  borderColor,
  surfaceRaised,
  hasUserReacted,
  setOpenStickerPopoverKey,
  handleToggleReaction,
}) => (
  <MosChatStickerAndEmojiPicker
    isDark={isDark}
    borderColor={borderColor}
    surfaceRaised={surfaceRaised}
    wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
    popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
    defaultPack="emoji"
    mode="reaction"
    hasUserReacted={(key) => hasUserReacted(msgObj, key)}
    onSelectEmoji={(emoji) => {
      setOpenStickerPopoverKey(null);
      void handleToggleReaction(msgId, emoji, replyId);
    }}
    onSelectSticker={(sticker) => {
      setOpenStickerPopoverKey(null);
      void handleToggleReaction(msgId, formatStickerToken(sticker.id), replyId);
    }}
  />
);

export interface MosChatComposerEmojiPickerPopoverProps {
  target?: 'main' | 'thread' | { dockConvId: string };
  defaultPack?: MosChatStickerPackId;
  isDark: boolean;
  borderColor: string;
  surfaceRaised: string;
  composerInputRef: React.RefObject<HTMLTextAreaElement | null>;
  composerTextRef: React.MutableRefObject<string>;
  updateComposerText: (val: string) => void;
  threadInputRef: React.RefObject<HTMLTextAreaElement | null>;
  threadTextRef: React.MutableRefObject<string>;
  updateThreadInput: (val: string) => void;
  dockInputRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  setDockInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setOpenStickerPopoverKey: (key: string | null) => void;
  handleSendSticker: (
    sticker: MosChatStickerItem,
    target?: 'main' | 'thread' | { dockConvId: string }
  ) => Promise<void> | void;
}

export const MosChatComposerEmojiPickerPopover: React.FC<MosChatComposerEmojiPickerPopoverProps> = ({
  target = 'main',
  defaultPack = 'emoji',
  isDark,
  borderColor,
  surfaceRaised,
  composerInputRef,
  composerTextRef,
  updateComposerText,
  threadInputRef,
  threadTextRef,
  updateThreadInput,
  dockInputRefs,
  setDockInputs,
  setOpenStickerPopoverKey,
  handleSendSticker,
}) => (
  <MosChatStickerAndEmojiPicker
    isDark={isDark}
    borderColor={borderColor}
    surfaceRaised={surfaceRaised}
    wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
    popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
    defaultPack={defaultPack}
    mode="composer"
    onSelectEmoji={(emoji) => {
      if (target === 'main') {
        const el = composerInputRef.current;
        if (el && typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
          const start = el.selectionStart;
          const end = el.selectionEnd;
          const currentVal = composerTextRef.current || el.value || '';
          updateComposerText(currentVal.slice(0, start) + emoji + currentVal.slice(end));
          const newCursor = start + emoji.length;
          setTimeout(() => {
            el.focus();
            try {
              el.setSelectionRange(newCursor, newCursor);
            } catch {}
          }, 0);
        } else {
          updateComposerText(composerTextRef.current + emoji);
          composerInputRef.current?.focus();
        }
      } else if (target === 'thread') {
        const el = threadInputRef.current;
        if (el && typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
          const start = el.selectionStart;
          const end = el.selectionEnd;
          const currentVal = threadTextRef.current || el.value || '';
          updateThreadInput(currentVal.slice(0, start) + emoji + currentVal.slice(end));
          const newCursor = start + emoji.length;
          setTimeout(() => {
            el.focus();
            try {
              el.setSelectionRange(newCursor, newCursor);
            } catch {}
          }, 0);
        } else {
          updateThreadInput(threadTextRef.current + emoji);
          threadInputRef.current?.focus();
        }
      } else if (typeof target === 'object' && target.dockConvId) {
        const cid = target.dockConvId;
        const el = dockInputRefs.current[cid];
        if (el && typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
          const start = el.selectionStart;
          const end = el.selectionEnd;
          const currentVal = el.value || '';
          const nextVal = currentVal.slice(0, start) + emoji + currentVal.slice(end);
          setDockInputs((p) => ({ ...p, [cid]: nextVal }));
          const newCursor = start + emoji.length;
          setTimeout(() => {
            el.focus();
            try {
              el.setSelectionRange(newCursor, newCursor);
            } catch {}
          }, 0);
        } else {
          setDockInputs((p) => ({ ...p, [cid]: `${p[cid] || ''}${emoji}` }));
          dockInputRefs.current[cid]?.focus();
        }
      }
    }}
    onSelectSticker={(sticker) => {
      setOpenStickerPopoverKey(null);
      void handleSendSticker(sticker, target);
    }}
  />
);

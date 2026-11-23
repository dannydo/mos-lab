import { MOS_CHAT_STICKERS_CORE_PACKS, type MosChatStickerItem } from './sticker-packs-core';
import { MOS_CHAT_STICKERS_EXTENDED_PACKS } from './sticker-packs-extended';

export const MOS_CHAT_STICKERS: MosChatStickerItem[] = [
  ...MOS_CHAT_STICKERS_CORE_PACKS,
  ...MOS_CHAT_STICKERS_EXTENDED_PACKS,
];

const STICKER_MAP = new Map<string, MosChatStickerItem>(MOS_CHAT_STICKERS.map((s) => [s.id, s]));

export function getStickerById(stickerId: string | undefined | null): MosChatStickerItem | undefined {
  if (!stickerId) return undefined;
  return STICKER_MAP.get(stickerId.trim());
}

export function formatStickerToken(stickerId: string): string {
  return `[sticker:${stickerId}]`;
}

export function parsePureStickerMessage(text: string | undefined | null): MosChatStickerItem | null {
  if (!text) return null;
  const trimmed = text.trim();
  const match = trimmed.match(/^\[sticker:([a-z0-9-]+)\]$/i);
  if (!match) return null;
  return getStickerById(match[1]) || null;
}

export function parseStickerReactionKey(reactionKey: string | undefined | null): MosChatStickerItem | null {
  if (!reactionKey) return null;
  return parsePureStickerMessage(reactionKey);
}

export function formatChatPreviewWithStickers(text: string | undefined | null): string {
  if (!text) return '';
  const pure = parsePureStickerMessage(text);
  if (pure) {
    return `${pure.fallbackEmoji} [Nhãn dán: ${pure.caption || pure.title}]`;
  }
  return text.replace(/\[sticker:([a-z0-9-]+)\]/gi, (_, id: string) => {
    const found = getStickerById(id);
    return found ? `${found.fallbackEmoji} [${found.caption || found.title}]` : '[Nhãn dán]';
  });
}

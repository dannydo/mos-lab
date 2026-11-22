import dayjs from 'dayjs';
import type { MosChatImageAttachment, MosChatMessage } from '@mos-lab/shared';
import { resolveMediaUrl } from '../../../../lib/api-base-url';
import { getFileExtension, isImageAttachment, isVideoAttachment } from '../../utils/chat-helpers';
import type { FileAttachmentDisplayMeta, PartitionedMobileAttachments } from './mobileMessageItemTypes';

export function isConsecutiveMobileMessage(message: MosChatMessage, prevMessage?: MosChatMessage): boolean {
  if (!prevMessage) return false;
  return (
    prevMessage.senderId === message.senderId &&
    Math.abs(dayjs(message.createdAt).diff(dayjs(prevMessage.createdAt), 'minute')) < 2
  );
}

export function formatMobileMessageTime(message: MosChatMessage): string {
  return message.timeLabel || dayjs(message.createdAt).format('HH:mm');
}

export function partitionMessageAttachments(attachments?: MosChatImageAttachment[]): PartitionedMobileAttachments {
  if (!attachments || attachments.length === 0) {
    return { videoAttachments: [], imageAttachments: [], fileAttachments: [] };
  }

  return {
    videoAttachments: attachments.filter(isVideoAttachment),
    imageAttachments: attachments.filter((att) => isImageAttachment(att) && !isVideoAttachment(att)),
    fileAttachments: attachments.filter((att) => !isImageAttachment(att) && !isVideoAttachment(att)),
  };
}

export function getFileAttachmentDisplayMeta(att: MosChatImageAttachment): FileAttachmentDisplayMeta {
  const fullUrl = resolveMediaUrl(att.url);
  const ext = getFileExtension(att.name || att.url).toLowerCase();

  return {
    fullUrl,
    ext,
    isPdf: ext === 'pdf' || att.mimeType === 'application/pdf',
    isExcel: ['xls', 'xlsx', 'csv'].includes(ext),
    isWord: ['doc', 'docx'].includes(ext),
    isZip: ['zip', 'rar', '7z'].includes(ext),
  };
}

export function getMessageAiActions(message: MosChatMessage) {
  return message.aiActions || (message.aiAction ? [message.aiAction] : []);
}

export function scrollToMessageElement(targetMessageId: string, options?: { flash?: boolean }): void {
  const targetEl = document.getElementById(`mos-chat-msg-${targetMessageId}`);
  if (!targetEl) return;

  if (typeof targetEl.scrollIntoView === 'function') {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (options?.flash) {
    targetEl.classList.remove('mos-chat-quote-flash');
    requestAnimationFrame(() => {
      targetEl.classList.add('mos-chat-quote-flash');
      setTimeout(() => targetEl.classList.remove('mos-chat-quote-flash'), 900);
    });
  }
}

export function jumpToForwardedSource(params: {
  sourceConversationId: string;
  sourceMessageId: string;
  activeConversationId?: string;
  setActiveConvId: (convId: string) => void;
}): void {
  const { sourceConversationId, sourceMessageId, activeConversationId, setActiveConvId } = params;
  if (sourceConversationId !== activeConversationId) {
    setActiveConvId(sourceConversationId);
  }
  setTimeout(() => {
    scrollToMessageElement(sourceMessageId);
  }, 120);
}

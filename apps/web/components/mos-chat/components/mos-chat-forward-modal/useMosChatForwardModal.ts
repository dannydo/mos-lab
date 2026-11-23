import { useEffect, useMemo, useRef, useState } from 'react';
import { message as antdMessage } from 'antd';
import type {
  ForwardMosChatMessageRequest,
  ForwardMosChatMessageResponse,
  MosChatConversation,
  MosChatMessage,
  MosChatStaffMember,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';
import { MAX_FORWARD_TARGETS, type ForwardTargetOption } from './forwardModalTypes';
import {
  buildForwardTargetOptions,
  filterAndGroupForwardTargets,
  resolveCurrentStaffId,
  summarizeThreadReplies,
} from './forwardModalHelpers';

export interface UseMosChatForwardModalParams {
  open: boolean;
  onClose: () => void;
  sourceConversation?: MosChatConversation | null;
  sourceMessage: MosChatMessage | null;
  sourceReply?: MosChatThreadReply | null;
  conversations: MosChatConversation[];
  staffDirectory: MosChatStaffMember[];
  currentUser?: SafeAny;
  pinnedIds?: string[];
  onSubmit: (payload: ForwardMosChatMessageRequest) => Promise<ForwardMosChatMessageResponse | null>;
  onNavigateToConversation?: (conversationId: string) => void;
}

export function useMosChatForwardModal({
  open,
  onClose,
  sourceConversation,
  sourceMessage,
  sourceReply,
  conversations,
  staffDirectory,
  currentUser,
  pinnedIds = [],
  onSubmit,
  onNavigateToConversation,
}: UseMosChatForwardModalParams) {
  const [searchQuery, setSearchQuery] = useState('');
  const [note, setNote] = useState('');
  const [includeThread, setIncludeThread] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openTargetAfterForward, setOpenTargetAfterForward] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const sourceMessageId = sourceMessage?.id ?? null;
  const sourceReplyId = sourceReply?.id ?? null;

  const { activeReplies, threadParticipantsSummary, threadAttachmentsCount } = useMemo(
    () => summarizeThreadReplies(sourceMessage, sourceReply),
    [sourceMessage, sourceReply]
  );

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setNote('');
      setIncludeThread(true);
      setSelectedKeys([]);
      setIsSubmitting(false);
      setOpenTargetAfterForward(false);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [open, sourceMessageId, sourceReplyId]);

  const myStaffId = useMemo(() => resolveCurrentStaffId(currentUser, staffDirectory), [currentUser, staffDirectory]);

  const allTargetOptions = useMemo<ForwardTargetOption[]>(
    () =>
      buildForwardTargetOptions({
        conversations,
        staffDirectory,
        pinnedIds,
        myStaffId,
        currentUser,
      }),
    [conversations, staffDirectory, pinnedIds, myStaffId, currentUser]
  );

  const groupedTargets = useMemo(
    () => filterAndGroupForwardTargets(allTargetOptions, searchQuery),
    [allTargetOptions, searchQuery]
  );

  const optionByKey = useMemo(() => {
    const map = new Map<string, ForwardTargetOption>();
    for (const opt of allTargetOptions) {
      map.set(opt.key, opt);
    }
    return map;
  }, [allTargetOptions]);

  const toggleSelectKey = (key: string) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= MAX_FORWARD_TARGETS) {
        antdMessage.warning(`Chỉ có thể chọn tối đa ${MAX_FORWARD_TARGETS} nơi nhận trong một lần.`);
        return prev;
      }
      return [...prev, key];
    });
  };

  const handleConfirmForward = async () => {
    if (!sourceMessage || !sourceConversation || selectedKeys.length === 0 || isSubmitting) return;

    const targetConversationIds: string[] = [];
    const targetStaffIds: number[] = [];

    for (const key of selectedKeys) {
      const opt = optionByKey.get(key);
      if (!opt) continue;
      if (opt.kind === 'conv' && opt.conversationId) {
        targetConversationIds.push(opt.conversationId);
      } else if (opt.kind === 'staff' && opt.staffId) {
        targetStaffIds.push(opt.staffId);
      }
    }

    if (targetConversationIds.length === 0 && targetStaffIds.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await onSubmit({
        sourceConversationId: sourceConversation.id,
        sourceMessageId: sourceMessage.id,
        sourceReplyId: sourceReply?.id || null,
        includeThread: !sourceReply && activeReplies.length > 0 ? includeThread : false,
        targetConversationIds,
        targetStaffIds,
        note: note.trim() || null,
      });
      if (res?.success) {
        const firstDestId = res.results?.[0]?.conversationId;
        onClose();
        if (openTargetAfterForward && firstDestId && onNavigateToConversation) {
          onNavigateToConversation(firstDestId);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    note,
    setNote,
    includeThread,
    setIncludeThread,
    selectedKeys,
    isSubmitting,
    openTargetAfterForward,
    setOpenTargetAfterForward,
    searchInputRef,
    activeReplies,
    threadParticipantsSummary,
    threadAttachmentsCount,
    groupedTargets,
    optionByKey,
    toggleSelectKey,
    handleConfirmForward,
  };
}

'use client';

import React from 'react';
import { X } from 'lucide-react';
import { AdaptiveModal } from '~/components/ui';
import { ForwardModalFooter } from './mos-chat-forward-modal/ForwardModalFooter';
import { ForwardModalHeader } from './mos-chat-forward-modal/ForwardModalHeader';
import { ForwardSourcePreviewCard } from './mos-chat-forward-modal/ForwardSourcePreviewCard';
import { ForwardTargetPickerSection } from './mos-chat-forward-modal/ForwardTargetPickerSection';
import type { MosChatForwardModalProps } from './mos-chat-forward-modal/forwardModalTypes';
import { useMosChatForwardModal } from './mos-chat-forward-modal/useMosChatForwardModal';

export type { MosChatForwardModalProps } from './mos-chat-forward-modal/forwardModalTypes';

export const MosChatForwardModal: React.FC<MosChatForwardModalProps> = ({
  open,
  onClose,
  sourceConversation,
  sourceMessage,
  sourceReply,
  conversations,
  staffDirectory,
  currentUser,
  pinnedIds = [],
  isDark,
  onSubmit,
  onNavigateToConversation,
}) => {
  const {
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
  } = useMosChatForwardModal({
    open,
    onClose,
    sourceConversation,
    sourceMessage,
    sourceReply,
    conversations,
    staffDirectory,
    currentUser,
    pinnedIds,
    onSubmit,
    onNavigateToConversation,
  });

  if (!sourceMessage) return null;

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnHidden
      intent="confirm"
      zIndex={1550}
      width={540}
      wrapClassName={isDark ? 'dark-theme' : 'light-theme'}
      closable={{
        closeIcon: (
          <span
            aria-label="Đóng hộp thoại chuyển tiếp"
            className={`inline-flex items-center justify-center p-1 rounded-lg ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <X size={16} />
          </span>
        ),
      }}
      styles={{
        content: {
          padding: 0,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: isDark ? 'rgb(20, 20, 20)' : 'rgb(255, 255, 255)',
          border: isDark ? '1px solid rgb(42, 42, 47)' : '1px solid rgb(226, 232, 240)',
        },
        body: {
          padding: 0,
          overscrollBehavior: 'contain',
        },
      }}
      title={null}
    >
      <div className="flex flex-col max-h-[86vh]">
        <ForwardModalHeader isDark={isDark} isReplyForward={Boolean(sourceReply)} />

        <div className="px-4 py-3 space-y-3 overflow-y-auto overscroll-contain flex-1">
          <ForwardSourcePreviewCard
            isDark={isDark}
            sourceConversation={sourceConversation}
            sourceMessage={sourceMessage}
            sourceReply={sourceReply}
            activeRepliesCount={activeReplies.length}
            threadParticipantsSummary={threadParticipantsSummary}
            threadAttachmentsCount={threadAttachmentsCount}
            includeThread={includeThread}
            onChangeIncludeThread={setIncludeThread}
          />

          <ForwardTargetPickerSection
            isDark={isDark}
            note={note}
            onChangeNote={setNote}
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            searchInputRef={searchInputRef}
            selectedKeys={selectedKeys}
            optionByKey={optionByKey}
            groupedTargets={groupedTargets}
            onToggleSelectKey={toggleSelectKey}
            sourceConversation={sourceConversation}
            staffDirectory={staffDirectory}
          />
        </div>

        <ForwardModalFooter
          isDark={isDark}
          selectedCount={selectedKeys.length}
          isSubmitting={isSubmitting}
          canNavigateToConversation={Boolean(onNavigateToConversation)}
          openTargetAfterForward={openTargetAfterForward}
          onChangeOpenTargetAfterForward={setOpenTargetAfterForward}
          onClose={onClose}
          onConfirm={() => void handleConfirmForward()}
        />
      </div>
    </AdaptiveModal>
  );
};

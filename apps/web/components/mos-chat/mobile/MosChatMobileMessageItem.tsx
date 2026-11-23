'use client';

import React from 'react';
import { Heart, MessageSquareReply } from 'lucide-react';
import { useMosChat } from '../context/MosChatContext';
import { useTheme } from '../../../context/ThemeContext';
import { isUserMessageOwner } from '../utils/chat-helpers';
import type { MosChatMobileMessageItemProps } from './mos-chat-mobile-message-item/mobileMessageItemTypes';
import {
  formatMobileMessageTime,
  isConsecutiveMobileMessage,
} from './mos-chat-mobile-message-item/mobileMessageItemHelpers';
import { useMobileMessageGestures } from './mos-chat-mobile-message-item/useMobileMessageGestures';
import { MobileMessageSenderHeader } from './mos-chat-mobile-message-item/MobileMessageSenderHeader';
import { MobileMessageBubble } from './mos-chat-mobile-message-item/MobileMessageBubble';
import {
  MobileMessageMiniSeenStack,
  MobileMessageReactionsBar,
  MobileMessageThreadBadge,
} from './mos-chat-mobile-message-item/MobileMessageReactionsAndThread';

export type { MosChatMobileMessageItemProps } from './mos-chat-mobile-message-item/mobileMessageItemTypes';

export const MosChatMobileMessageItem: React.FC<MosChatMobileMessageItemProps> = React.memo(
  ({ message, prevMessage, onOpenThread, onOpenGallery, onOpenCustomer }) => {
    const { themeMode = 'dark' } = useTheme();
    const isDark = themeMode === 'dark';
    const {
      currentUser,
      reactToMessage,
      hasUserReacted,
      openReactionUsersSheet,
      setSelectedMsgForAction,
      setReplyingToMessage,
      messages,
      staffDirectory,
      openCustomerDetail,
      conversations,
      setActiveConvId,
      activeConversation,
      getMessageReadBreakdown,
      stoppedReadersByMsgId,
      openSeenUsersSheetForMessage,
      executeMissionAction,
    } = useMosChat();

    const isMe = isUserMessageOwner(message, currentUser);
    const isAiBot = Boolean(message.isAiBot || message.senderId === 'wings-ai-copilot');
    const isConsecutive = isConsecutiveMobileMessage(message, prevMessage);

    const { swipeOffset, showHeartFly, handleTouchStart, handleTouchMove, handleTouchEnd } = useMobileMessageGestures({
      message,
      reactToMessage,
      setSelectedMsgForAction,
      setReplyingToMessage,
    });

    // Find quoted message if replying
    const quotedMessage =
      message.replyTo || (message.replyToId ? messages?.find((m) => m.id === message.replyToId) : null);

    // Time & thread metadata
    const timeFormatted = formatMobileMessageTime(message);
    const threadCount = message.thread?.length || 0;

    // Read status breakdown for this message (MOS-BUG-229)
    const msgReadBreakdown = getMessageReadBreakdown
      ? getMessageReadBreakdown(activeConversation, message)
      : { seenBy: [], unseenBy: [] };
    const stoppedReadersForMsg = (stoppedReadersByMsgId && stoppedReadersByMsgId[message.id]) || [];
    const isSeen = msgReadBreakdown.seenBy.length > 0;

    return (
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        id={`mos-chat-msg-${message.id}`}
        onContextMenu={(e) => {
          e.preventDefault();
          if (message.isDeleted) return;
          setSelectedMsgForAction?.(message);
        }}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          touchAction: 'pan-y',
        }}
        className={`relative flex flex-col my-1 select-none transition-all duration-300 rounded-2xl ${
          isMe ? 'items-end' : 'items-start'
        }`}
      >
        {/* Swipe Right Indicator */}
        {swipeOffset > 10 && (
          <div
            style={{
              opacity: Math.min(1, swipeOffset / 35),
              transform: `scale(${Math.min(1, 0.5 + swipeOffset / 70)}) translateY(-50%)`,
            }}
            className="absolute left-2 top-1/2 w-8 h-8 rounded-full bg-[var(--mos-accent)] flex items-center justify-center text-[var(--mos-accent-contrast)] shadow-md z-30 pointer-events-none"
          >
            <MessageSquareReply className="w-4 h-4" />
          </div>
        )}

        {/* Swipe Left Indicator */}
        {swipeOffset < -10 && (
          <div
            style={{
              opacity: Math.min(1, Math.abs(swipeOffset) / 35),
              transform: `scale(${Math.min(1, 0.5 + Math.abs(swipeOffset) / 70)}) translateY(-50%)`,
            }}
            className="absolute right-2 top-1/2 w-8 h-8 rounded-full bg-[var(--mos-accent)] flex items-center justify-center text-[var(--mos-accent-contrast)] shadow-md z-30 pointer-events-none"
          >
            <MessageSquareReply className="w-4 h-4" />
          </div>
        )}

        {/* Floating Heart Fly Animation */}
        {showHeartFly && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 animate-bounce">
            <Heart className="w-12 h-12 text-rose-500 fill-rose-500 drop-shadow-lg" />
          </div>
        )}

        {/* Sender info & avatar for both own and other messages */}
        {!isConsecutive && (
          <MobileMessageSenderHeader
            message={message}
            isMe={isMe}
            isAiBot={isAiBot}
            isDark={isDark}
            staffDirectory={staffDirectory}
          />
        )}

        {/* Message Bubble Box */}
        <MobileMessageBubble
          message={message}
          quotedMessage={quotedMessage}
          isMe={isMe}
          isAiBot={isAiBot}
          isDark={isDark}
          timeFormatted={timeFormatted}
          isSeen={isSeen}
          seenBy={msgReadBreakdown.seenBy}
          staffDirectory={staffDirectory}
          conversations={conversations}
          activeConversationId={activeConversation?.id}
          setActiveConvId={setActiveConvId}
          openCustomerDetail={openCustomerDetail}
          onOpenCustomer={onOpenCustomer}
          onOpenGallery={onOpenGallery}
          openSeenUsersSheetForMessage={openSeenUsersSheetForMessage}
          currentUser={currentUser}
          executeMissionAction={executeMissionAction}
        />

        {/* Reactions Bar Below Bubble */}
        <MobileMessageReactionsBar
          message={message}
          isMe={isMe}
          isDark={isDark}
          hasUserReacted={hasUserReacted}
          reactToMessage={reactToMessage}
          openReactionUsersSheet={openReactionUsersSheet}
          setSelectedMsgForAction={setSelectedMsgForAction}
        />

        {/* Mini Seen Avatars Stack (MOS-BUG-229) */}
        <MobileMessageMiniSeenStack
          message={message}
          stoppedReadersForMsg={stoppedReadersForMsg}
          staffDirectory={staffDirectory}
          isMe={isMe}
          onOpenSeenUsersSheet={openSeenUsersSheetForMessage}
        />

        {/* Thread reply counter badge (Google Chat style) */}
        <MobileMessageThreadBadge
          message={message}
          threadCount={threadCount}
          isMe={isMe}
          isDark={isDark}
          onOpenThread={onOpenThread}
        />
      </div>
    );
  }
);

MosChatMobileMessageItem.displayName = 'MosChatMobileMessageItem';

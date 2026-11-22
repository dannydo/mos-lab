import React, { useState } from 'react';
import { Tooltip } from 'antd';
import { Bot, CornerDownRight, ImagePlus } from 'lucide-react';
import { formatQuotePayload } from '../utils/quoteUtils';
import { syncTextareaHeightSmart } from './MosChatComposer';
import type { MosChatThreadDrawerProps } from './MosChatThreadDrawer.types';
import { MosChatThreadPaneBar } from './MosChatThreadPaneBar';
import { MosChatThreadRootContent } from './MosChatThreadRootHeader';
import { MosChatThreadReplyItem } from './MosChatThreadReplyItem';
import { MosChatThreadComposer } from './MosChatThreadComposer';

export type { MosChatThreadDrawerProps } from './MosChatThreadDrawer.types';

export const MosChatThreadDrawer: React.FC<MosChatThreadDrawerProps> = React.memo(
  (props) => {
    const {
      threadOpen,
      activeThreadMessage,
      activeConversation,
      isMobile,
      mobileActiveView,
      threadWidth,
      setThreadWidth,
      persistPersonalLayout,
      isResizingTarget,
      setIsResizingTarget,
      hoverResizeHandle,
      setHoverResizeHandle,
      surfaceBg,
      borderColor,
      isDark,
      draggingRootMsgId,
      setDraggingRootMsgId,
      setDragOverTargetMsgId,
      dragOverThreadPane,
      setDragOverThreadPane,
      isDraggingOverThread,
      setIsDraggingOverThread,
      isDraggingOver,
      setIsDraggingOver,
      handleMoveThreadItem,
      handleProcessImageFiles,
      handleClipboardPaste,
      formatMoveTargetSnippet,
      threadMessagesContainerRef,
      threadMessagesEndRef,
      isMessageFromCurrentUser,
      getMemberNickname,
      threadInputRef,
      threadInput,
      setThreadInput,
      handleSendThreadReply,
      threadAttachments,
      getThreadReplyReadBreakdown,
      stoppedReadersByReplyId,
      aiThinkingActive,
      aiElapsedSec,
      stagedCustomerCard,
      isUrgentSendThread,
      setIsUrgentSendThread,
      threadTextRef,
      threadHasText,
      updateThreadInput,
      threadHasTextListenerRef,
      staffDirectory = [],
    } = props;

    const [formatBarOpenThread, setFormatBarOpenThread] = useState<boolean>(true);
    const [isPreviewModeThread, setIsPreviewModeThread] = useState<boolean>(false);
    const [openMoreReplyId, setOpenMoreReplyId] = useState<string | null>(null);
    const [replyingToReply, setReplyingToReply] = useState<{ id: string; senderName: string; text: string } | null>(
      null
    );
    const [mobileActionOpen, setMobileActionOpen] = useState<boolean>(false);
    const [localUrgentSend, setLocalUrgentSend] = useState<boolean>(false);
    const isUrgent = isUrgentSendThread ?? localUrgentSend;
    const setIsUrgent = setIsUrgentSendThread ?? setLocalUrgentSend;

    const fallbackThreadTextRef = React.useRef<string>(threadInput || '');
    const effectiveThreadTextRef = threadTextRef || fallbackThreadTextRef;
    const [localThreadHasText, setLocalThreadHasText] = useState<boolean>(() =>
      Boolean(threadHasText || (effectiveThreadTextRef.current || threadInput || '').trim())
    );

    React.useEffect(() => {
      if (threadHasTextListenerRef) {
        threadHasTextListenerRef.current = (next: boolean) => {
          setLocalThreadHasText((prev) => (prev === next ? prev : next));
        };
        return () => {
          threadHasTextListenerRef.current = null;
        };
      }
    }, [threadHasTextListenerRef]);

    React.useEffect(() => {
      if (!threadTextRef) {
        fallbackThreadTextRef.current = threadInput || '';
        const nextHas = Boolean((threadInput || '').trim());
        setLocalThreadHasText((prev) => (prev === nextHas ? prev : nextHas));
        if (threadInputRef.current && threadInputRef.current.value !== (threadInput || '')) {
          threadInputRef.current.value = threadInput || '';
          syncTextareaHeightSmart(threadInputRef.current, isMobile ? 120 : 140, 36);
        }
      }
    }, [threadInput, threadTextRef, threadInputRef, isMobile]);

    React.useEffect(() => {
      if (threadHasText !== undefined) {
        setLocalThreadHasText((prev) => (prev === threadHasText ? prev : threadHasText));
      }
    }, [threadHasText]);

    const applyThreadTextUpdate = (updater: string | ((prev: string) => string)) => {
      const prev = effectiveThreadTextRef.current || threadInputRef.current?.value || '';
      const next = typeof updater === 'function' ? updater(prev) : updater;
      effectiveThreadTextRef.current = next;
      const nextHasText = Boolean(next.trim());
      setLocalThreadHasText((old) => (old === nextHasText ? old : nextHasText));
      if (threadInputRef.current && threadInputRef.current.value !== next) {
        threadInputRef.current.value = next;
        syncTextareaHeightSmart(threadInputRef.current, isMobile ? 120 : 140, 36);
      }
      if (updateThreadInput) {
        updateThreadInput(next);
      } else {
        setThreadInput(next);
      }
    };

    React.useEffect(() => {
      setReplyingToReply(null);
    }, [activeThreadMessage, threadOpen]);

    const handleThreadSubmit = () => {
      const rawText = effectiveThreadTextRef.current || threadInputRef.current?.value || threadInput || '';
      const trimmed = rawText.trim();
      if (!trimmed && threadAttachments.length === 0 && !stagedCustomerCard) return;
      let finalText = trimmed;
      if (replyingToReply) {
        finalText = formatQuotePayload(replyingToReply.senderName, replyingToReply.text, trimmed);
        setReplyingToReply(null);
      }
      handleSendThreadReply(finalText, stagedCustomerCard, activeThreadMessage?.id);
    };

    if (!threadOpen || !activeThreadMessage) return null;

    return (
      <aside
        data-chat-thread-pane="true"
        onDragOver={(e) => {
          if (draggingRootMsgId) {
            if (draggingRootMsgId === activeThreadMessage.id) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            if (!dragOverThreadPane) setDragOverThreadPane(true);
            return;
          }
          const hasFiles = Boolean(e.dataTransfer?.types?.includes('Files')) || Boolean(e.dataTransfer?.files?.length);
          if (hasFiles) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            if (!isDraggingOverThread) setIsDraggingOverThread(true);
            if (isDraggingOver) setIsDraggingOver(false);
          }
        }}
        onDragLeave={(e) => {
          if (dragOverThreadPane && !e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setDragOverThreadPane(false);
          }
          if (isDraggingOverThread && !e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setIsDraggingOverThread(false);
          }
        }}
        onDrop={(e) => {
          if (draggingRootMsgId) {
            if (draggingRootMsgId === activeThreadMessage.id) return;
            e.preventDefault();
            e.stopPropagation();
            const srcId = draggingRootMsgId;
            setDraggingRootMsgId(null);
            setDragOverTargetMsgId(null);
            setDragOverThreadPane(false);
            setIsDraggingOver(false);
            setIsDraggingOverThread(false);
            void handleMoveThreadItem({
              mode: 'MERGE_ROOT_TO_THREAD',
              sourceMessageId: srcId,
              targetMessageId: activeThreadMessage.id,
            });
            return;
          }
          if (e.dataTransfer?.files?.length) {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingOver(false);
            setIsDraggingOverThread(false);
            void handleProcessImageFiles(e.dataTransfer.files, 'upload', 'thread');
          }
        }}
        onPaste={(e) => handleClipboardPaste(e, 'thread')}
        className={`${isMobile ? 'absolute inset-0 z-30 w-full' : ''} flex flex-col shrink-0 relative`}
        style={{
          width: isMobile ? '100%' : threadWidth,
          background: surfaceBg,
          borderLeft: isMobile
            ? 'none'
            : `1px solid ${
                dragOverThreadPane ||
                isDraggingOverThread ||
                isResizingTarget === 'thread' ||
                hoverResizeHandle === 'thread'
                  ? '#d4a84b'
                  : borderColor
              }`,
          display: isMobile && mobileActiveView !== 'thread' ? 'none' : 'flex',
          transition: isResizingTarget === 'thread' ? 'none' : 'width 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {dragOverThreadPane && draggingRootMsgId && draggingRootMsgId !== activeThreadMessage.id && (
          <div
            className="absolute inset-2 rounded-xl z-30 flex flex-col items-center justify-center gap-2 pointer-events-none px-4 text-center"
            style={{ background: 'rgba(15, 23, 42, 0.86)', border: '2px dashed #d4a84b', color: '#fbbf24' }}
          >
            <CornerDownRight size={28} />
            <div className="text-[13px] font-extrabold">
              Thả vào đây để gộp tin nhắn (kèm ảnh & phản hồi) vào luồng này
            </div>
            <div className="text-[11px] text-slate-300 max-w-[260px] truncate">
              {getMemberNickname(activeThreadMessage.senderId) || activeThreadMessage.senderName}:{' '}
              {formatMoveTargetSnippet(activeThreadMessage)}
            </div>
          </div>
        )}
        {isDraggingOverThread && !draggingRootMsgId && (
          <div
            className="absolute inset-2 rounded-xl z-30 flex flex-col items-center justify-center gap-2 pointer-events-none px-4 text-center select-none"
            style={{
              background: 'rgba(15, 23, 42, 0.88)',
              border: '2px dashed #d4a84b',
              color: '#fbbf24',
              backdropFilter: 'blur(4px)',
            }}
          >
            <ImagePlus size={32} className="animate-bounce" />
            <div className="text-[13px] font-extrabold">Thả hình ảnh vào luồng phụ này</div>
            <div className="text-[11px] text-amber-200/80">
              Hình ảnh sẽ tự động được tải lên và đính kèm vào câu trả lời luồng
            </div>
          </div>
        )}

        {!isMobile && (
          <Tooltip title="Kéo sang trái/phải để đổi độ rộng luồng · Nhấp đúp để đặt lại 440px">
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Kéo để thay đổi độ rộng luồng trả lời"
              data-no-chat-autofocus="true"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsResizingTarget('thread');
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                setThreadWidth(440);
                persistPersonalLayout({ threadWidth: 440 });
              }}
              onMouseEnter={() => setHoverResizeHandle('thread')}
              onMouseLeave={() => setHoverResizeHandle((prev) => (prev === 'thread' ? null : prev))}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: -5,
                width: 10,
                cursor: 'col-resize',
                zIndex: 25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                className="rounded-full transition-all"
                style={{
                  width: isResizingTarget === 'thread' || hoverResizeHandle === 'thread' ? 3.5 : 1.5,
                  height: isResizingTarget === 'thread' || hoverResizeHandle === 'thread' ? 64 : 36,
                  background:
                    isResizingTarget === 'thread' || hoverResizeHandle === 'thread'
                      ? '#d4a84b'
                      : isDark
                        ? 'rgba(148, 163, 184, 0.35)'
                        : 'rgba(100, 116, 139, 0.3)',
                  boxShadow: isResizingTarget === 'thread' ? '0 0 10px rgba(212, 168, 75, 0.65)' : 'none',
                }}
              />
              {isResizingTarget === 'thread' && (
                <div
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums shadow-lg pointer-events-none"
                  style={{
                    position: 'absolute',
                    right: 14,
                    background: '#111827',
                    color: '#d4a84b',
                    border: '1px solid rgba(212, 168, 75, 0.45)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {threadWidth}px
                </div>
              )}
            </div>
          </Tooltip>
        )}

        <MosChatThreadPaneBar {...props} activeThreadMessage={activeThreadMessage} />

        <div ref={threadMessagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
          <MosChatThreadRootContent
            {...props}
            activeThreadMessage={activeThreadMessage}
            staffDirectory={staffDirectory}
            setReplyingToReply={setReplyingToReply}
          />

          <div className="text-[10.5px] font-bold uppercase text-slate-400 tabular-nums">
            {activeThreadMessage.thread?.length || 0} câu trả lời
          </div>

          {(activeThreadMessage.thread || []).map((r) => {
            const isReplyMine = isMessageFromCurrentUser(r);
            const isAiReply = Boolean(r.isAiBot || r.senderId === 'wings-ai-copilot');
            const replyBreakdown = getThreadReplyReadBreakdown(activeConversation, activeThreadMessage, r);
            const stoppedReadersForReply = stoppedReadersByReplyId[r.id] || [];
            return (
              <MosChatThreadReplyItem
                {...props}
                key={r.id}
                r={r}
                activeThreadMessage={activeThreadMessage}
                staffDirectory={staffDirectory}
                isReplyMine={isReplyMine}
                isAiReply={isAiReply}
                replyBreakdown={replyBreakdown}
                stoppedReadersForReply={stoppedReadersForReply}
                setReplyingToReply={setReplyingToReply}
                openMoreReplyId={openMoreReplyId}
                setOpenMoreReplyId={setOpenMoreReplyId}
              />
            );
          })}

          {aiThinkingActive && (
            <div className="flex gap-2 items-start text-left p-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #d4a84b 100%)' }}
              >
                <Bot size={13} className="animate-spin" />
              </div>
              <div
                className="p-2 rounded-xl text-[11.5px] max-w-[85%]"
                style={{
                  background: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                <span className="font-semibold text-purple-400">🤖 MAI</span>
                <span className="text-slate-400 ml-1.5 animate-pulse tabular-nums">
                  Đang phân tích luồng ({aiElapsedSec}s)...
                </span>
              </div>
            </div>
          )}
          <div ref={threadMessagesEndRef} />
        </div>

        <MosChatThreadComposer
          {...props}
          activeThreadMessage={activeThreadMessage}
          replyingToReply={replyingToReply}
          setReplyingToReply={setReplyingToReply}
          mobileActionOpen={mobileActionOpen}
          setMobileActionOpen={setMobileActionOpen}
          formatBarOpenThread={formatBarOpenThread}
          setFormatBarOpenThread={setFormatBarOpenThread}
          isPreviewModeThread={isPreviewModeThread}
          setIsPreviewModeThread={setIsPreviewModeThread}
          localThreadHasText={localThreadHasText}
          setLocalThreadHasText={setLocalThreadHasText}
          isUrgent={isUrgent}
          setIsUrgent={setIsUrgent}
          effectiveThreadTextRef={effectiveThreadTextRef}
          applyThreadTextUpdate={applyThreadTextUpdate}
          handleThreadSubmit={handleThreadSubmit}
        />
      </aside>
    );
  },
  (prev, next) => {
    if (!prev.threadOpen && !next.threadOpen) return true;
    return (
      prev.threadOpen === next.threadOpen &&
      prev.activeThreadMessage === next.activeThreadMessage &&
      prev.activeConversation === next.activeConversation &&
      prev.isMobile === next.isMobile &&
      prev.mobileActiveView === next.mobileActiveView &&
      prev.threadWidth === next.threadWidth &&
      prev.isResizingTarget === next.isResizingTarget &&
      prev.hoverResizeHandle === next.hoverResizeHandle &&
      prev.isDark === next.isDark &&
      prev.draggingRootMsgId === next.draggingRootMsgId &&
      prev.dragOverTargetMsgId === next.dragOverTargetMsgId &&
      prev.dragOverThreadPane === next.dragOverThreadPane &&
      prev.isDraggingOverThread === next.isDraggingOverThread &&
      prev.isDraggingOver === next.isDraggingOver &&
      prev.highlightedMsgId === next.highlightedMsgId &&
      prev.speakingMsgId === next.speakingMsgId &&
      prev.ttsSpeed === next.ttsSpeed &&
      prev.editingReplyId === next.editingReplyId &&
      prev.isSavingEdit === next.isSavingEdit &&
      prev.openStickerPopoverKey === next.openStickerPopoverKey &&
      prev.openMovePopoverKey === next.openMovePopoverKey &&
      prev.movingThreadItemKey === next.movingThreadItemKey &&
      prev.threadInput === next.threadInput &&
      prev.threadHasText === next.threadHasText &&
      prev.threadAttachments === next.threadAttachments &&
      prev.stagedCustomerCard === next.stagedCustomerCard &&
      prev.isUrgentSendThread === next.isUrgentSendThread &&
      prev.aiThinkingActive === next.aiThinkingActive &&
      prev.aiElapsedSec === next.aiElapsedSec &&
      prev.uniqueTasks === next.uniqueTasks &&
      prev.stoppedReadersByReplyId === next.stoppedReadersByReplyId &&
      prev.mentionRenderKey === next.mentionRenderKey &&
      prev.getMemberNickname === next.getMemberNickname
    );
  }
);

MosChatThreadDrawer.displayName = 'MosChatThreadDrawer';

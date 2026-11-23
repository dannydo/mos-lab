'use client';

import React, { useMemo, useRef, useState } from 'react';
import { message as antdMessage } from 'antd';
import type { MosChatCustomerCard, MosChatImageAttachment, MosChatMessage, MosChatThreadReply } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import { MosChatMobileHeader } from './MosChatMobileHeader';
import { MosChatMobileInbox } from './MosChatMobileInbox';
import { MosChatMobileStream } from './MosChatMobileStream';
import { MosChatMobileComposer } from './MosChatMobileComposer';
import { MosChatMobileThreadSheet } from './MosChatMobileThreadSheet';
import { MosChatMobileTasksTab } from './MosChatMobileTasksTab';
import { MosChatMobilePinnedTab } from './MosChatMobilePinnedTab';
import { MosChatFilesPane } from '../components/MosChatFilesPane';
import { formatStickerToken, type MosChatStickerItem, type MosChatStickerPackId } from '../mos-chat-stickers';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import { uploadMultipleChatImages } from '../utils/chat-upload';
import { MosChatActiveCallRoomBanner } from '../components/MosChatVoiceCallWidget';
import { useTheme } from '../../../context/ThemeContext';
import '../../../app/ios-app/ios-typography.css';
import { useIosFontScale } from '../../../app/ios-app/state/useIosFontScale';
import { useMobileAppNavigation, type MobileInitialNavTarget } from './app/useMobileAppNavigation';
import { useMobileTaskWorkflow } from './app/useMobileTaskWorkflow';
import { MobileAppModalsAndSheets } from './app/MobileAppModalsAndSheets';

export interface MosChatMobileAppProps {
  standalone?: boolean;
  onStartVoiceCall?: (conversationId: string) => void;
  onClose?: () => void;
  initialNavTarget?: MobileInitialNavTarget | null;
}

export const MosChatMobileApp: React.FC<MosChatMobileAppProps> = ({
  standalone = false,
  onStartVoiceCall,
  onClose,
  initialNavTarget,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

  const {
    currentUser,
    activeConversation,
    conversations,
    messages,
    mobileView,
    setMobileView,
    activeSubtab,
    setActiveSubtab,
    selectedMsgForAction,
    setSelectedMsgForAction,
    activeThreadMsg,
    setActiveThreadMsg,
    setActiveConvId,
    tasks,
    createTask,
    updateTask,
    dispatchMissionFromTask,
    editMessage,
    staffDirectory,
    sendMessage,
    sendThreadReply,
    forwardMessage,
    updateSpaceConfig,
    togglePinConversation,
    pinnedConvIds,
    openAiSessionById,
  } = useMosChat();

  const resolvedFontStaffId =
    Number((currentUser as { legacyStaffId?: unknown; id?: unknown } | null)?.legacyStaffId ?? currentUser?.id) ||
    undefined;
  useIosFontScale(resolvedFontStaffId);

  const [spaceConfigModalOpen, setSpaceConfigModalOpen] = useState<boolean>(false);
  const [spaceMembersModalOpen, setSpaceMembersModalOpen] = useState<boolean>(false);
  const [actionSheetOpen, setActionSheetOpen] = useState<boolean>(false);
  const [newDmModalOpen, setNewDmModalOpen] = useState<boolean>(false);
  const [ckEditorOpen, setCkEditorOpen] = useState<boolean>(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState<boolean>(false);
  const [stickerPickerInitialPack, setStickerPickerInitialPack] = useState<MosChatStickerPackId>('emoji');
  const [composerText, setComposerText] = useState<string>('');
  const [editingMessage, setEditingMessage] = useState<MosChatMessage | null>(null);
  const [movingMsgForThread, setMovingMsgForThread] = useState<MosChatMessage | null>(null);
  const [movingReplyForThread, setMovingReplyForThread] = useState<{
    parentMsg: MosChatMessage;
    replyId: string;
  } | null>(null);
  const [forwardTarget, setForwardTarget] = useState<{
    message: MosChatMessage;
    reply?: MosChatThreadReply | null;
  } | null>(null);
  const [attachedImages, setAttachedImages] = useState<MosChatImageAttachment[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);
  const [stagedCustomerCard, setStagedCustomerCard] = useState<MosChatCustomerCard | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = useState<boolean>(false);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const prevMsgForMoving = useMemo(() => {
    if (!movingMsgForThread) return null;
    const idx = messages.findIndex((m) => m.id === movingMsgForThread.id);
    if (idx > 0) return messages[idx - 1];
    return null;
  }, [messages, movingMsgForThread]);

  const nav = useMobileAppNavigation({
    standalone,
    onStartVoiceCall,
    initialNavTarget,
    currentUser,
    activeConversation,
    conversations,
    messages,
    mobileView,
    setMobileView,
    setActiveThreadMsg,
    setActiveConvId,
    openAiSessionById,
  });

  const taskWorkflow = useMobileTaskWorkflow({
    currentUser,
    staffDirectory,
    activeConversation,
    conversations,
    activeThreadMsg,
    tasks,
    createTask,
    updateTask,
    dispatchMissionFromTask,
    sendThreadReply,
    setActiveConvId,
    setActiveThreadMsg,
    setMobileView,
  });

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const count = files.length;
    setIsUploadingImages(true);
    const hideMsg = antdMessage.loading(`Đang tải ${count} tệp lên...`, 0);

    try {
      const uploaded = await uploadMultipleChatImages(files);
      hideMsg();
      if (uploaded.length > 0) {
        setAttachedImages((prev) => [...prev, ...uploaded]);
        if (uploaded.length === count) {
          antdMessage.success(`Đã đính kèm ${uploaded.length} tệp`);
        } else {
          antdMessage.warning(`Đã tải ${uploaded.length}/${count} tệp`);
        }
      } else {
        antdMessage.error('Không thể tải tệp lên, vui lòng thử lại');
      }
    } catch {
      hideMsg();
      antdMessage.error('Có lỗi xảy ra khi tải ảnh lên');
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectSticker = (sticker: MosChatStickerItem) => {
    sendMessage(formatStickerToken(sticker.id));
    setStickerPickerOpen(false);
  };

  return (
    <div
      onTouchStart={nav.handleTouchStart}
      onTouchEnd={nav.handleTouchEnd}
      className={`ios-app-font-scope flex flex-col bg-[var(--background)] text-[var(--mos-text)] overflow-hidden ${
        standalone ? 'h-[100dvh] w-screen fixed inset-0 z-50' : 'h-full w-full'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.mp4,.webm,.mov,.heic,.heif,.HEIC,.HEIF,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.zip,.rar"
        onChange={handleImageFileChange}
        className="hidden"
        aria-label="Tải nhiều ảnh đính kèm"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*,.mp4,.webm,.mov"
        onChange={handleImageFileChange}
        className="hidden"
        aria-label="Tải video đính kèm"
      />

      <MosChatMobileHeader
        onOpenSettings={() => setSpaceConfigModalOpen(true)}
        onOpenMembersModal={() => setSpaceMembersModalOpen(true)}
        onOpenTaskModal={() => taskWorkflow.openTaskModalForThread()}
        onOpenSearch={() => {
          nav.setSearchInitialQuery('');
          nav.setSearchInitialScope(
            activeConversation?.id && activeConversation.id !== AI_COPILOT_CONV_ID ? 'CURRENT_CONV' : 'ALL'
          );
          nav.setSearchSheetOpen(true);
        }}
        onOpenPushSettings={() => setPushModalOpen(true)}
        onOpenThemeSheet={() => setThemeSheetOpen(true)}
        onOpenNewDm={() => setNewDmModalOpen(true)}
        isPushSubscribed={nav.webPush.isSubscribed}
        onCallRoom={nav.handleCallCurrentRoom}
        onClose={onClose}
      />

      {mobileView === 'inbox' && (
        <MosChatMobileInbox
          newDmModalOpen={newDmModalOpen}
          onNewDmModalOpenChange={setNewDmModalOpen}
          onOpenSearchSheet={(q) => {
            nav.setSearchInitialQuery(q || '');
            nav.setSearchInitialScope('ALL');
            nav.setSearchSheetOpen(true);
          }}
        />
      )}

      {mobileView === 'room' && (
        <>
          {standalone && (
            <MosChatActiveCallRoomBanner
              call={nav.standaloneVoiceCall.getActiveCallForConversation(activeConversation?.id)}
              currentCallId={nav.standaloneVoiceCall.currentCall?.callId}
              isDark={isDark}
              onJoinCall={(cid) => void nav.standaloneVoiceCall.startOrJoinVoiceCall(cid)}
            />
          )}
          {activeSubtab === 'chat' && (
            <>
              <MosChatMobileStream
                onOpenThread={(msg) => {
                  setActiveThreadMsg(msg);
                  setMobileView('thread');
                }}
                onOpenGallery={nav.handleOpenStreamGallery}
                onOpenPinnedTab={() => setActiveSubtab('pinned')}
              />
              <MosChatMobileComposer
                onOpenActionSheet={() => setActionSheetOpen(true)}
                onOpenCKEditor={() => setCkEditorOpen(true)}
                onOpenStickerSheet={(pack = 'emoji') => {
                  setStickerPickerInitialPack(pack);
                  setStickerPickerOpen(true);
                }}
                attachedImages={attachedImages}
                onRemoveAttachment={(id) => setAttachedImages((prev) => prev.filter((img) => img.id !== id))}
                isUploadingImages={isUploadingImages}
                onSendSuccess={() => {
                  setAttachedImages([]);
                  setStagedCustomerCard(null);
                }}
                text={composerText}
                onTextChange={setComposerText}
                stagedCustomerCard={stagedCustomerCard}
                onRemoveCustomerCard={() => setStagedCustomerCard(null)}
              />
            </>
          )}

          {activeSubtab === 'tasks' && (
            <MosChatMobileTasksTab
              onOpenCreateTaskModal={() => taskWorkflow.openCreateTaskModal()}
              onSelectTask={(task) => taskWorkflow.setSelectedDetailTaskId(task.id)}
            />
          )}

          {activeSubtab === 'pinned' && (
            <MosChatMobilePinnedTab
              onGoToMessage={(msg) => {
                setActiveSubtab('chat');
                setTimeout(() => {
                  const el = document.getElementById(`mos-chat-msg-${msg.id}`);
                  if (el && typeof el.scrollIntoView === 'function') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-2', 'ring-amber-400', 'bg-amber-500/10');
                    setTimeout(() => {
                      el.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-500/10');
                    }, 2500);
                  }
                }, 150);
              }}
              onBackToChat={() => setActiveSubtab('chat')}
            />
          )}

          {activeSubtab === 'files' && (
            <MosChatFilesPane
              activeConversation={activeConversation}
              setActiveSubtab={setActiveSubtab}
              navigateToMessage={(convId, msgId) => {
                if (convId) setActiveConvId(convId);
                setActiveSubtab('chat');
                setTimeout(() => {
                  const el = document.getElementById(`mos-chat-msg-${msgId}`);
                  if (el && typeof el.scrollIntoView === 'function') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-2', 'ring-emerald-400', 'bg-emerald-500/10');
                    setTimeout(() => {
                      el.classList.remove('ring-2', 'ring-emerald-400', 'bg-emerald-500/10');
                    }, 2500);
                  }
                }, 150);
              }}
              isDark={isDark}
              surfaceBg="var(--mos-surface)"
              surfaceRaised="var(--mos-surface-muted)"
              borderColor="var(--mos-surface-border)"
              isMobile={true}
            />
          )}
        </>
      )}

      {mobileView === 'thread' && (
        <MosChatMobileThreadSheet
          onOpenTaskModal={taskWorkflow.openTaskModalForThread}
          onOpenMoveReply={(sourceMsg, replyId) => setMovingReplyForThread({ parentMsg: sourceMsg, replyId })}
          onForwardMessage={(sourceMsg, reply) => setForwardTarget({ message: sourceMsg, reply: reply || null })}
        />
      )}

      <MobileAppModalsAndSheets
        standalone={standalone}
        isDark={isDark}
        currentUser={currentUser}
        activeConversation={activeConversation}
        conversations={conversations}
        staffDirectory={staffDirectory}
        pinnedConvIds={pinnedConvIds}
        selectedMsgForAction={selectedMsgForAction}
        setSelectedMsgForAction={setSelectedMsgForAction}
        setActiveThreadMsg={setActiveThreadMsg}
        setMobileView={setMobileView}
        setActiveConvId={setActiveConvId}
        setActiveSubtab={setActiveSubtab}
        sendMessage={sendMessage}
        editMessage={editMessage}
        forwardMessage={forwardMessage}
        updateSpaceConfig={updateSpaceConfig}
        togglePinConversation={togglePinConversation}
        actionSheetOpen={actionSheetOpen}
        setActionSheetOpen={setActionSheetOpen}
        ckEditorOpen={ckEditorOpen}
        setCkEditorOpen={setCkEditorOpen}
        composerText={composerText}
        setComposerText={setComposerText}
        attachedImages={attachedImages}
        setAttachedImages={setAttachedImages}
        stagedCustomerCard={stagedCustomerCard}
        setStagedCustomerCard={setStagedCustomerCard}
        customerPickerOpen={customerPickerOpen}
        setCustomerPickerOpen={setCustomerPickerOpen}
        stickerPickerOpen={stickerPickerOpen}
        setStickerPickerOpen={setStickerPickerOpen}
        stickerPickerInitialPack={stickerPickerInitialPack}
        setStickerPickerInitialPack={setStickerPickerInitialPack}
        editingMessage={editingMessage}
        setEditingMessage={setEditingMessage}
        movingMsgForThread={movingMsgForThread}
        setMovingMsgForThread={setMovingMsgForThread}
        prevMsgForMoving={prevMsgForMoving}
        movingReplyForThread={movingReplyForThread}
        setMovingReplyForThread={setMovingReplyForThread}
        forwardTarget={forwardTarget}
        setForwardTarget={setForwardTarget}
        spaceConfigModalOpen={spaceConfigModalOpen}
        setSpaceConfigModalOpen={setSpaceConfigModalOpen}
        spaceMembersModalOpen={spaceMembersModalOpen}
        setSpaceMembersModalOpen={setSpaceMembersModalOpen}
        pushModalOpen={pushModalOpen}
        setPushModalOpen={setPushModalOpen}
        themeSheetOpen={themeSheetOpen}
        setThemeSheetOpen={setThemeSheetOpen}
        fileInputRef={fileInputRef}
        videoInputRef={videoInputRef}
        handleSelectSticker={handleSelectSticker}
        nav={nav}
        taskWorkflow={taskWorkflow}
      />
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { Tooltip } from 'antd';
import { AdaptiveDrawer } from '../../../../components/ui';
import { AI_LAUNCHER_SIZE } from '../../../../lib/ai-assistant-launcher';
import type { AIAssistantWidgetProps } from './aiassistant-widget/copilot-utils';
import { useCopilotLauncherDrag } from './aiassistant-widget/useCopilotLauncherDrag';
import { useCopilotSpeech } from './aiassistant-widget/useCopilotSpeech';
import { useCopilotChat } from './aiassistant-widget/useCopilotChat';
import { CopilotDrawerHeader } from './aiassistant-widget/CopilotDrawerHeader';
import { CopilotSessionBar } from './aiassistant-widget/CopilotSessionBar';
import { CopilotMessageList } from './aiassistant-widget/CopilotMessageList';
import { CopilotInputArea } from './aiassistant-widget/CopilotInputArea';

export type { AIAssistantWidgetProps, CopilotCurrentUser } from './aiassistant-widget/copilot-utils';

export function AIAssistantWidget({ currentFilterCriteria, onApplyFilter, currentUser }: AIAssistantWidgetProps) {
  const [open, setOpen] = useState(false);

  const {
    copilotVisible,
    launcherPosition,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    shouldSuppressClick,
  } = useCopilotLauncherDrag();

  const {
    speakingMessageId,
    copiedMessageId,
    autoSpeakEnabled,
    playbackRate,
    handleToggleAutoSpeak,
    handleCyclePlaybackRate,
    handleToggleSpeak,
    speakIfAutoEnabled,
    handleCopyContent,
  } = useCopilotSpeech(open);

  const {
    sessions,
    activeSessionId,
    messages,
    inputMessage,
    setInputMessage,
    pastedImage,
    setPastedImage,
    lastFailedMessage,
    sending,
    loadingHistory,
    showSessionDrawer,
    setShowSessionDrawer,
    expandedThinking,
    appliedActions,
    elapsedSeconds,
    chatBottomRef,
    inputRef,
    loadSession,
    handleStartNewSession,
    handleNewSession,
    handleDeleteSession,
    handlePaste,
    handleSendMessage,
    handleExecuteAction,
    toggleThinking,
  } = useCopilotChat({
    open,
    currentFilterCriteria,
    currentUser,
    onApplyFilter,
    onAssistantReply: speakIfAutoEnabled,
  });

  if (!copilotVisible) {
    return null;
  }

  return (
    <>
      {/* Floating Launcher Trigger with Drag & Drop + Persistence */}
      <div
        data-ai-assistant-launcher-container
        className="fixed z-40 select-none"
        style={{
          left: launcherPosition ? `${launcherPosition.x}px` : undefined,
          top: launcherPosition ? `${launcherPosition.y}px` : undefined,
          right: launcherPosition ? undefined : '24px',
          bottom: launcherPosition ? undefined : '24px',
          width: AI_LAUNCHER_SIZE,
          height: AI_LAUNCHER_SIZE,
          touchAction: 'none',
        }}
      >
        <Tooltip
          title={isDragging ? 'Đang di chuyển...' : 'mOS Copilot · Trợ lý AI riêng tư (Kéo để di chuyển)'}
          placement="left"
        >
          <button
            type="button"
            data-ai-assistant-launcher
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={(e) => {
              if (shouldSuppressClick()) {
                e.preventDefault();
                return;
              }
              setOpen(true);
            }}
            aria-label="mOS Copilot (Riêng tư)"
            className={`group relative flex items-center justify-center w-12 h-12 rounded-full shadow-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-500 hover:to-pink-400 text-white shadow-indigo-500/30 border border-white/25 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
              isDragging
                ? 'cursor-grabbing scale-[1.08] transition-none'
                : 'cursor-grab transition-[transform,box-shadow] duration-200 ease-out'
            }`}
          >
            <Sparkles className="w-5 h-5 text-white transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 pointer-events-none" />
            <span
              className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm pointer-events-none"
              title="Bảo mật riêng tư"
            >
              <ShieldCheck className="w-2 h-2 text-white" />
            </span>
            {/* Screen reader text for accessibility & automated tests */}
            <span className="sr-only">mOS Copilot</span>
            <span className="sr-only">Riêng tư</span>
          </button>
        </Tooltip>
      </div>

      {/* Adaptive Slide-over Assistant Drawer */}
      <AdaptiveDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={
          <CopilotDrawerHeader
            autoSpeakEnabled={autoSpeakEnabled}
            playbackRate={playbackRate}
            onToggleAutoSpeak={handleToggleAutoSpeak}
            onCyclePlaybackRate={handleCyclePlaybackRate}
            onToggleSessionDrawer={() => setShowSessionDrawer((prev) => !prev)}
            onCreateNewSession={handleNewSession}
          />
        }
        width={560}
      >
        <div className="flex flex-col h-full -mx-4 -my-4 bg-slate-50/50 dark:bg-slate-950/50">
          <CopilotSessionBar
            sessions={sessions}
            activeSessionId={activeSessionId}
            hasMessages={messages.length > 0}
            loadingHistory={loadingHistory}
            showSessionDrawer={showSessionDrawer}
            onStartNewSession={handleStartNewSession}
            onCreateNewSession={handleNewSession}
            onLoadSession={loadSession}
            onDeleteSession={handleDeleteSession}
            onToggleSessionDrawer={() => setShowSessionDrawer((prev) => !prev)}
          />

          <CopilotMessageList
            messages={messages}
            expandedThinking={expandedThinking}
            appliedActions={appliedActions}
            speakingMessageId={speakingMessageId}
            copiedMessageId={copiedMessageId}
            lastFailedMessage={lastFailedMessage}
            sending={sending}
            elapsedSeconds={elapsedSeconds}
            chatBottomRef={chatBottomRef}
            onSendMessage={handleSendMessage}
            onToggleThinking={toggleThinking}
            onToggleSpeak={handleToggleSpeak}
            onCopyContent={handleCopyContent}
            onExecuteAction={handleExecuteAction}
          />

          <CopilotInputArea
            hasMessages={messages.length > 0}
            inputMessage={inputMessage}
            pastedImage={pastedImage}
            sending={sending}
            inputRef={inputRef}
            onInputChange={setInputMessage}
            onPaste={handlePaste}
            onClearImage={() => setPastedImage(null)}
            onSendMessage={handleSendMessage}
          />
        </div>
      </AdaptiveDrawer>
    </>
  );
}

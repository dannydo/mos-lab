'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { useVoiceAssistant } from './useVoiceAssistant';
import { VoiceVisualizerOrb } from './VoiceVisualizerOrb';
import { VoiceAssistantModal } from './VoiceAssistantModal';

interface GlobalVoiceAssistantProps {
  userName?: string;
  userRole?: string;
}

export const GlobalVoiceAssistant: React.FC<GlobalVoiceAssistantProps> = ({ userName, userRole }) => {
  const {
    isOpen,
    setIsOpen,
    status,
    transcript,
    messages,
    isMuted,
    setIsMuted,
    toggleListening,
    handleStopSpeaking,
    replayLastMessage,
    sendMessage,
  } = useVoiceAssistant({ userName, userRole });

  return (
    <>
      {/* 1. Floating Voice Trigger Button (Bottom-Right) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[9990] select-none">
          <Tooltip
            title={
              <div className="text-center p-0.5">
                <div className="font-semibold text-xs text-white">mOS Voice Copilot</div>
                <div className="text-[11px] text-slate-300">
                  Nhấn <kbd className="px-1 py-0.5 rounded bg-slate-700 text-[10px] font-mono">Ctrl</kbd> 2 lần để nói
                  chuyện
                </div>
              </div>
            }
            placement="left"
          >
            <div
              onClick={() => {
                setIsOpen(true);
                toggleListening();
              }}
              className="p-1 rounded-full shadow-2xl backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer group flex items-center gap-2"
            >
              <VoiceVisualizerOrb status={status} size="medium" />
              <div className="hidden group-hover:flex flex-col pr-3 pl-1 text-left">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">mOS Voice AI</span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Ctrl × 2 để nói</span>
              </div>
            </div>
          </Tooltip>
        </div>
      )}

      {/* 2. Interactive Voice Assistant Modal Dialog */}
      <VoiceAssistantModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        status={status}
        transcript={transcript}
        messages={messages}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted((prev) => !prev)}
        onToggleListening={toggleListening}
        onStopSpeaking={handleStopSpeaking}
        onReplayLastMessage={replayLastMessage}
        onSendMessage={sendMessage}
      />
    </>
  );
};

export default GlobalVoiceAssistant;

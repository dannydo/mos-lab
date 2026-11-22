'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, Sliders, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { message as antdMessage } from 'antd';
import type { MosChatMessage } from '@mos-lab/shared';
import { speakText, stopSpeaking } from '../../../voice-assistant/speech-utils';
import { getMessageAiActions } from './mobileMessageItemHelpers';

export interface MobileMessageAiReasoningProps {
  aiThinking?: string | null;
  isDark: boolean;
}

export const MobileMessageAiReasoning: React.FC<MobileMessageAiReasoningProps> = ({ aiThinking, isDark }) => {
  const [thinkingOpen, setThinkingOpen] = useState<boolean>(false);

  if (!aiThinking) return null;

  return (
    <div
      className={`mb-2 rounded-xl overflow-hidden w-full border border-purple-500/30 ${
        isDark ? 'bg-purple-950/40' : 'bg-purple-500/10'
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setThinkingOpen((prev) => !prev);
        }}
        className={`w-full px-2.5 py-1.5 flex items-center justify-between text-xs font-bold transition-colors ${
          isDark ? 'text-purple-300 active:bg-purple-900/40' : 'text-purple-700 active:bg-purple-500/15'
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
          <span>Quá trình suy luận của MAI</span>
        </span>
        {thinkingOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {thinkingOpen && (
        <div className="px-2.5 pb-2 pt-1 text-xs leading-relaxed whitespace-pre-wrap text-[var(--mos-text)] border-t border-dashed border-purple-500/20 text-left">
          {aiThinking}
        </div>
      )}
    </div>
  );
};

export interface MobileMessageAiActionsAndVoiceProps {
  message: MosChatMessage;
  isAiBot: boolean;
  isDark: boolean;
}

export const MobileMessageAiActionsAndVoice: React.FC<MobileMessageAiActionsAndVoiceProps> = ({
  message,
  isAiBot,
  isDark,
}) => {
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({});
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const actions = getMessageAiActions(message);

  return (
    <>
      {/* AI Action Buttons */}
      {actions && actions.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-purple-500/20 flex flex-wrap gap-1.5">
          {actions.map((act, aIdx) => {
            const actionKey = `${message.id}_${aIdx}`;
            const isApplied = Boolean(appliedActions[actionKey]);
            return (
              <button
                key={actionKey}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof window !== 'undefined' && act.payload) {
                    window.dispatchEvent(
                      new CustomEvent('mos-ai-copilot-apply-customer-filter', { detail: act.payload })
                    );
                  }
                  setAppliedActions((prev) => ({ ...prev, [actionKey]: true }));
                  antdMessage.success(`Đã kích hoạt: ${act.label}`);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm ${
                  isApplied
                    ? `bg-emerald-500/20 border border-emerald-500/40 ${
                        isDark ? 'text-emerald-300' : 'text-emerald-700'
                      }`
                    : `bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 ${
                        isDark ? 'text-purple-300' : 'text-purple-700'
                      }`
                }`}
              >
                {isApplied ? <Check className="w-3.5 h-3.5" /> : <Sliders className="w-3.5 h-3.5" />}
                <span>{isApplied ? `Đã áp dụng: ${act.label}` : act.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Quick Voice TTS & Copy Bar for AI Bot Replies */}
      {isAiBot && message.text && (
        <div className="mt-2 pt-1.5 border-t border-purple-500/20 flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isSpeaking) {
                stopSpeaking();
                setIsSpeaking(false);
              } else {
                setIsSpeaking(true);
                speakText(message.text, {
                  onEnd: () => setIsSpeaking(false),
                  onError: () => setIsSpeaking(false),
                });
              }
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
              isSpeaking
                ? `bg-purple-500/30 ${isDark ? 'text-purple-200' : 'text-purple-800'}`
                : 'text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]'
            }`}
          >
            {isSpeaking ? (
              <VolumeX className={`w-3.5 h-3.5 animate-pulse ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span>{isSpeaking ? 'Dừng đọc' : 'Đọc'}</span>
          </button>

          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                await navigator.clipboard.writeText(message.text);
                antdMessage.success('Đã sao chép câu trả lời của MAI');
              }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Sao chép</span>
          </button>
        </div>
      )}
    </>
  );
};

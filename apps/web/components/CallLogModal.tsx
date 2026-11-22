'use client';

import React from 'react';
import { Phone } from 'lucide-react';
import { AdaptiveModal, AppIcon } from './ui';
import { CallActiveBanner } from './call-log-modal/CallActiveBanner';
import { CallAiAnalysisPanel } from './call-log-modal/CallAiAnalysisPanel';
import { CallLogForm } from './call-log-modal/CallLogForm';
import { QuickActionsPanel } from './call-log-modal/QuickActionsPanel';
import { QUICK_NOTE_PRESETS } from './call-log-modal/callLogModalConstants';
import type { CallLogModalProps } from './call-log-modal/callLogModalTypes';
import { useCallLogModal } from './call-log-modal/useCallLogModal';

export { QUICK_NOTE_PRESETS };
export type { CallLogModalProps, QuickActionType, QuickNotePreset } from './call-log-modal/callLogModalTypes';

export default function CallLogModal(props: CallLogModalProps) {
  const {
    form,
    isDark,
    visible,
    loading,
    onCancel,
    activeCall,
    customerName,
    callDuration,
    resolvedLog,
    callResult,
    outcome,
    audioRef,
    noteInputRef,
    handleQuickAction,
    handleFinish,
    handleApplyQuickNotePreset,
    handleCallResultChange,
    handleOutcomeChange,
    handleApplyAiAnalysisToNote,
    handleSubmitShortcut,
  } = useCallLogModal(props);

  return (
    <AdaptiveModal
      intent="form"
      className="call-log-modal"
      title={
        <div className={`flex items-center gap-2 text-lg font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
          <AppIcon icon={Phone} size={18} />
          <span>
            Ghi Nhận Cuộc Gói: <span className={isDark ? 'text-zinc-100' : 'text-zinc-900'}>{customerName}</span>
          </span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      style={{ top: 80 }}
    >
      {activeCall && <CallActiveBanner activeCall={activeCall} callDuration={callDuration} isDark={isDark} />}

      <QuickActionsPanel isDark={isDark} loading={loading} onQuickAction={handleQuickAction} />

      {activeCall && callDuration > 0 && (
        <CallAiAnalysisPanel
          callDuration={callDuration}
          resolvedLog={resolvedLog}
          isDark={isDark}
          audioRef={audioRef}
        />
      )}

      <CallLogForm
        form={form}
        isDark={isDark}
        loading={loading}
        callResult={callResult}
        outcome={outcome}
        resolvedLog={resolvedLog}
        noteInputRef={noteInputRef}
        onCancel={onCancel}
        onFinish={handleFinish}
        onCallResultChange={handleCallResultChange}
        onOutcomeChange={handleOutcomeChange}
        onApplyQuickNotePreset={handleApplyQuickNotePreset}
        onApplyAiAnalysisToNote={handleApplyAiAnalysisToNote}
        onSubmitShortcut={handleSubmitShortcut}
      />
    </AdaptiveModal>
  );
}

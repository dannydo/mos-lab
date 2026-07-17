'use client';

import React from 'react';
import { useOmiCall } from '../context/OmiCallContext';
import { useTheme } from '../context/ThemeContext';
import { theme } from 'antd';

// Custom Hooks
import useWidgetPosition from './omicall-widget/useWidgetPosition';
import useWrapupForm from './omicall-widget/useWrapupForm';

// Components
import WidgetHeader from './omicall-widget/components/WidgetHeader';
import AudioDeviceControls from './omicall-widget/components/AudioDeviceControls';
import CallConfirming from './omicall-widget/components/CallConfirming';
import WidgetIdle from './omicall-widget/components/WidgetIdle';
import CallRinging from './omicall-widget/components/CallRinging';
import CallIncoming from './omicall-widget/components/CallIncoming';
import CallConnected from './omicall-widget/components/CallConnected';
import CallAnalyzing from './omicall-widget/components/CallAnalyzing';
import WrapupPanel from './omicall-widget/components/WrapupPanel';
import WidgetMinimized from './omicall-widget/components/WidgetMinimized';
import TabMuted from './omicall-widget/components/TabMuted';

export default function OmiCallWidget() {
  const {
    isRegistered,
    isTabMuted,
    callState,
    callDuration,
    currentCall,
    executeCall,
    cancelConfirm,
    answerCall,
    rejectCall,
    hangUp,
    toggleMute,
    toggleHold,
    isMuted,
    isHeld,
    sipConfig,
    setCallState,
    setCurrentCall,
    isSimulated,
    audioInputDevices,
    audioOutputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    setSelectedAudioInputId,
    setSelectedAudioOutputId,
    refreshAudioDevices,
  } = useOmiCall();

  const { themeMode } = useTheme();

  // Position & sizing hook
  const positionHook = useWidgetPosition();
  const { widgetMinimized, setWidgetMinimized, position, size, handleDragStart, handleResizeStart } = positionHook;

  // AI Wrapup & Form Hook
  const wrapupHook = useWrapupForm(
    currentCall,
    callState,
    isSimulated,
    callDuration,
    setCallState,
    setCurrentCall,
    setWidgetMinimized
  );

  const {
    noteForm,
    selectedTags,
    submittingWrapup,
    resolvedLog,
    setResolvedLog,
    availableTags,
    handleTagToggle,
    handleSaveWrapup,
  } = wrapupHook;

  // Format call duration (seconds to MM:SS)
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Connected progress bar calculations
  const getProgressPercentage = () => {
    if (callDuration >= 180) return 100;
    return (callDuration / 180) * 100;
  };

  const getProgressBarColor = () => {
    if (callDuration < 30) return '#ef4444'; // Red
    if (callDuration < 180) return '#f59e0b'; // Amber/Yellow
    return '#10b981'; // Emerald/Green
  };

  // Standby or idle check
  if (!isRegistered && callState === 'idle') {
    return null;
  }

  // Theme styling overrides
  const isDark = themeMode === 'dark';
  const containerBg = isDark ? 'rgba(9, 9, 11, 0.95)' : 'rgba(255, 255, 255, 0.98)';
  const borderColor = isDark ? '#27272a' : '#e4e4e7';
  const textColor = isDark ? '#f4f4f5' : '#18181b';
  const descColor = isDark ? '#a1a1aa' : '#71717a';
  const subBg = isDark ? 'rgba(24, 24, 27, 0.8)' : 'rgba(244, 244, 245, 0.8)';

  const renderAudioDeviceControls = () => (
    <AudioDeviceControls
      audioInputDevices={audioInputDevices}
      audioOutputDevices={audioOutputDevices}
      selectedAudioInputId={selectedAudioInputId}
      selectedAudioOutputId={selectedAudioOutputId}
      setSelectedAudioInputId={setSelectedAudioInputId}
      setSelectedAudioOutputId={setSelectedAudioOutputId}
      refreshAudioDevices={refreshAudioDevices}
      descColor={descColor}
    />
  );

  // RENDER MINIMIZED WIDGET
  if (widgetMinimized) {
    return (
      <WidgetMinimized
        callState={callState}
        callDuration={callDuration}
        formatDuration={formatDuration}
        onDragStart={(e) => handleDragStart(e, true)}
        position={position}
      />
    );
  }

  return (
    <div
      className="fixed rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md flex flex-col"
      style={{
        background: containerBg,
        borderColor: borderColor,
        color: textColor,
        width: `${size.width}px`,
        height: `${size.height}px`,
        left: position ? `${position.x}px` : undefined,
        top: position ? `${position.y}px` : undefined,
        right: position ? undefined : '24px',
        bottom: position ? undefined : '24px',
        zIndex: 9999,
      }}
    >
      {/* HEADER */}
      <WidgetHeader
        callState={callState}
        isRegistered={isRegistered}
        isTabMuted={isTabMuted}
        isSimulated={isSimulated}
        themeMode={themeMode}
        onMinimize={() => setWidgetMinimized(true)}
        onDragStart={(e) => handleDragStart(e, false)}
        borderColor={borderColor}
      />

      {/* CONTENT BODY */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
        {/* TAB MUTED */}
        {isTabMuted && callState !== 'wrapup' && <TabMuted descColor={descColor} subBg={subBg} />}

        {/* CONFIRMING CALL STATE */}
        {!isTabMuted && callState === 'confirming' && (
          <CallConfirming
            currentCall={currentCall}
            isRegistered={isRegistered}
            isSimulated={isSimulated}
            isDark={isDark}
            textColor={textColor}
            descColor={descColor}
            subBg={subBg}
            borderColor={borderColor}
            executeCall={executeCall}
            cancelConfirm={cancelConfirm}
          />
        )}

        {/* IDLE STATE */}
        {!isTabMuted && callState === 'idle' && (
          <WidgetIdle isSimulated={isSimulated} sipConfig={sipConfig} descColor={descColor} subBg={subBg}>
            {renderAudioDeviceControls()}
          </WidgetIdle>
        )}

        {/* RINGING OUTGOING STATE */}
        {!isTabMuted && callState === 'ringing' && (
          <CallRinging currentCall={currentCall} isSimulated={isSimulated} descColor={descColor} hangUp={hangUp}>
            {renderAudioDeviceControls()}
          </CallRinging>
        )}

        {/* INCOMING CALL STATE */}
        {!isTabMuted && callState === 'incoming' && (
          <CallIncoming currentCall={currentCall} descColor={descColor} answerCall={answerCall} rejectCall={rejectCall}>
            {renderAudioDeviceControls()}
          </CallIncoming>
        )}

        {/* CONNECTED CALL STATE */}
        {!isTabMuted && callState === 'connected' && (
          <CallConnected
            currentCall={currentCall}
            callDuration={callDuration}
            isSimulated={isSimulated}
            isMuted={isMuted}
            isHeld={isHeld}
            descColor={descColor}
            borderColor={borderColor}
            subBg={subBg}
            toggleMute={toggleMute}
            toggleHold={toggleHold}
            hangUp={hangUp}
            getProgressPercentage={getProgressPercentage}
            getProgressBarColor={getProgressBarColor}
            formatDuration={formatDuration}
          >
            {renderAudioDeviceControls()}
          </CallConnected>
        )}

        {/* AI ANALYZING STATE */}
        {!isTabMuted && callState === 'analyzing' && <CallAnalyzing descColor={descColor} />}

        {/* WRAP-UP STATE */}
        {!isTabMuted && callState === 'wrapup' && (
          <WrapupPanel
            currentCall={currentCall}
            callDuration={callDuration}
            resolvedLog={resolvedLog}
            submittingWrapup={submittingWrapup}
            availableTags={availableTags}
            selectedTags={selectedTags}
            handleTagToggle={handleTagToggle}
            handleSaveWrapup={handleSaveWrapup}
            noteForm={noteForm}
            isDark={isDark}
            textColor={textColor}
            descColor={descColor}
            borderColor={borderColor}
            subBg={subBg}
            setCallState={setCallState}
            setCurrentCall={setCurrentCall}
            setResolvedLog={setResolvedLog}
            formatDuration={formatDuration}
          />
        )}
      </div>

      {/* Resize handles */}
      {/* Bottom right handle */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '12px',
          height: '12px',
          cursor: 'se-resize',
          zIndex: 10000,
        }}
        onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
      />
      {/* Bottom left handle */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '12px',
          height: '12px',
          cursor: 'sw-resize',
          zIndex: 10000,
        }}
        onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
      />
      {/* Bottom edge handle */}
      <div
        style={{
          position: 'absolute',
          left: '12px',
          right: '12px',
          bottom: 0,
          height: '6px',
          cursor: 's-resize',
          zIndex: 10000,
        }}
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
      />
    </div>
  );
}

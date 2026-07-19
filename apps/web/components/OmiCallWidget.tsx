'use client';

import React, { useEffect } from 'react';
import { useOmiCall } from '../context/OmiCallContext';
import { useTheme } from '../context/ThemeContext';
import { theme } from 'antd';
import { PhoneOutlined } from '@ant-design/icons';

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
    omicallReady,
    setOmicallReady,
    lastRegisterEvent,
  } = useOmiCall();

  const { themeMode } = useTheme();

  // Position & sizing hook
  const positionHook = useWidgetPosition();
  const {
    widgetMinimized,
    setWidgetMinimized,
    position,
    size,
    handleDragStart,
    handleResizeStart,
    isDragging,
    isResizing,
  } = positionHook;

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

  // Auto-expand widget when there is an incoming call
  useEffect(() => {
    if (callState === 'incoming') {
      setWidgetMinimized(false);
    }
  }, [callState, setWidgetMinimized]);

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

  const isDark = themeMode === 'dark';
  const containerBg = isDark ? 'rgba(15, 15, 18, 0.82)' : 'rgba(255, 255, 255, 0.88)';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const textColor = isDark ? '#f4f4f5' : '#18181b';
  const descColor = isDark ? '#a1a1aa' : '#71717a';
  const subBg = isDark ? 'rgba(24, 24, 27, 0.6)' : 'rgba(244, 244, 245, 0.6)';

  // Standby or idle check
  if (!isRegistered && callState === 'idle') {
    if (!omicallReady) {
      return (
        <div
          className="fixed bottom-6 right-6 z-[9999] group cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
          onClick={() => setOmicallReady(true)}
        >
          {/* Pulse glow background */}
          <div className="absolute inset-0 rounded-full bg-slate-500/20 dark:bg-slate-800/30 blur-md group-hover:bg-amber-500/20 transition-all duration-300" />

          <div
            className="relative flex items-center justify-center h-12 w-12 rounded-full shadow-lg border transition-all duration-300"
            style={{
              background: containerBg,
              borderColor: borderColor,
              color: descColor,
            }}
          >
            <PhoneOutlined className="text-lg text-slate-500 dark:text-slate-400 group-hover:text-amber-500 transition-colors duration-300" />

            {/* Tooltip */}
            <div className="absolute right-14 whitespace-nowrap bg-zinc-900 text-zinc-100 text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-xl border border-zinc-800">
              Sẵn sàng nhận cuộc gọi
            </div>
          </div>
        </div>
      );
    }

    // When omicallReady is true but not registered yet (connecting state)
    return (
      <div
        className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-full shadow-lg border p-1 pr-4 transition-all duration-300"
        style={{
          background: containerBg,
          borderColor: borderColor,
          color: textColor,
        }}
      >
        <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-amber-500/10 text-amber-500">
          <PhoneOutlined className="text-md animate-pulse" />
          <span className="absolute inset-0 rounded-full border border-amber-500/40 animate-ping opacity-75" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-500">OmiCall</span>
          <span className="text-[11px] font-medium" style={{ color: descColor }}>
            Đang kết nối SIP...
          </span>
        </div>
        {/* Toggle off */}
        <button
          onClick={() => setOmicallReady(false)}
          className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-md hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
          style={{ color: descColor }}
        >
          Tắt
        </button>
      </div>
    );
  }

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

  const isMoving = isDragging || isResizing;
  const currentContainerBg = isDark
    ? isMoving
      ? '#0f0f12'
      : 'rgba(15, 15, 18, 0.82)'
    : isMoving
      ? '#ffffff'
      : 'rgba(255, 255, 255, 0.88)';

  return (
    <div
      className={`fixed rounded-2xl border overflow-hidden flex flex-col ${
        isMoving ? 'transition-none shadow-2xl scale-[1.01]' : 'backdrop-blur-xl transition-all duration-300'
      }`}
      style={{
        background: currentContainerBg,
        borderColor: borderColor,
        color: textColor,
        width: `${size.width}px`,
        height: `${size.height}px`,
        left: position ? `${position.x}px` : undefined,
        top: position ? `${position.y}px` : undefined,
        right: position ? undefined : '24px',
        bottom: position ? undefined : '24px',
        zIndex: 9999,
        boxShadow: isDark
          ? '0 20px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 20px 40px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
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
          <WidgetIdle
            isSimulated={isSimulated}
            sipConfig={sipConfig}
            descColor={descColor}
            subBg={subBg}
            lastRegisterEvent={lastRegisterEvent}
          >
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

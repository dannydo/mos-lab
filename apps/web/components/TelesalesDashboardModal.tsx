'use client';

import React, { useEffect, useRef } from 'react';
import { message } from 'antd';
import { useTheme } from '../context/ThemeContext';
import { useTelesalesDashboard } from './telesales/hooks/useTelesalesDashboard';
import TelesalesConfigPanel from './telesales/components/TelesalesConfigPanel';
import { TelesalesFrontFace } from './telesales/components/TelesalesFrontFace';
import { TelesalesBackFace } from './telesales/components/TelesalesBackFace';
import { metricConfigs, periods } from './telesales/components/TelesalesConstants';

interface TelesalesDashboardModalProps {
  visible: boolean;
  onClose: () => void;
  initialMemberId?: string;
}

export default function TelesalesDashboardModal({
  visible,
  onClose,
  initialMemberId = 'TN',
}: TelesalesDashboardModalProps) {
  const { themeMode } = useTheme();
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    modalSize,
    currentMemberId,
    currentPeriodId,
    currentMetricKey,
    isFlipped,
    isConfigOpen,
    configTab,
    systemStaff,
    selectedStaffIds,
    isAdmin,
    isRadialOpen,
    periodDataMap,
    loading,
    targets,
    expandedSections,
    // computed
    activeMember,
    activePerformance,
    activeValue,
    activeMemberTargets,
    activeTarget,
    activePercent,
    activeLevelIdx,
    activePreset,
    dailyTarget,
    weeklyTarget,
    monthlyTarget,
    podiumOrder,
    remaining,
    podiumOrderBack,
    remainingBack,
    dataPoints,
    // setters & callbacks
    setCurrentMemberId,
    setCurrentPeriodId,
    setCurrentMetricKey,
    setIsFlipped,
    setIsConfigOpen,
    setConfigTab,
    setIsRadialOpen,
    setExpandedSections,
    setStaffLevels,
    handleResize,
    toggleStaffSelection,
    saveVisibleStaff,
    handleUpdateLevel,
    getMemberLevelIdx,
    getMemberTarget,
    handleTargetChange,
    saveTargets,
  } = useTelesalesDashboard({
    visible,
    initialMemberId,
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
  });

  useEffect(() => {
    if (!visible) return;
    const container = modalContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.target.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        handleResize(width, height);
      }
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [visible, handleResize]);

  // Reset flip & config state when opened
  useEffect(() => {
    if (visible) {
      setIsFlipped(false);
      setIsConfigOpen(false);
    }
  }, [visible, setIsFlipped, setIsConfigOpen]);

  // Synchronize target expansion when period changes
  useEffect(() => {
    if (visible) {
      setExpandedSections((prev) => {
        const next = { ...prev };
        periods.forEach((p) => {
          next[p.id] = p.id === currentPeriodId;
        });
        return next;
      });
    }
  }, [visible, currentPeriodId, setExpandedSections]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[1010] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1010,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        WebkitBackdropFilter: 'blur(4px)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        ref={modalContainerRef}
        className={`relative transition-transform duration-500 ${
          modalSize ? 'w-auto h-auto' : 'w-full max-w-[780px] h-[92vh] min-h-[820px] max-h-[920px]'
        }`}
        style={{
          position: 'relative',
          WebkitPerspective: '1500px',
          perspective: '1500px',
          resize: 'both',
          overflow: 'hidden',
          minWidth: '600px',
          minHeight: '780px',
          maxWidth: '95vw',
          maxHeight: '95vh',
          width: modalSize ? modalSize.width : undefined,
          height: modalSize ? modalSize.height : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative w-full h-full transition-transform duration-700 ease-in-out"
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            WebkitTransformStyle: 'preserve-3d',
            transformStyle: 'preserve-3d',
            WebkitTransform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 0.7s ease-in-out',
          }}
        >
          {/* ============================== FRONT FACE (DONUT VIEW) ============================== */}
          <TelesalesFrontFace
            themeMode={themeMode}
            currentMemberId={currentMemberId}
            currentPeriodId={currentPeriodId}
            currentMetricKey={currentMetricKey}
            activeMember={activeMember}
            activePerformance={activePerformance}
            activePercent={activePercent}
            activeLevelIdx={activeLevelIdx}
            activePreset={activePreset}
            dailyTarget={dailyTarget}
            weeklyTarget={weeklyTarget}
            monthlyTarget={monthlyTarget}
            podiumOrder={podiumOrder}
            remaining={remaining}
            isRadialOpen={isRadialOpen}
            loading={loading}
            isAdmin={isAdmin}
            activeValue={activeValue}
            activeTarget={activeTarget}
            onClose={onClose}
            setIsFlipped={setIsFlipped}
            setIsConfigOpen={setIsConfigOpen}
            setIsRadialOpen={setIsRadialOpen}
            setCurrentPeriodId={setCurrentPeriodId}
            setCurrentMetricKey={setCurrentMetricKey}
            setCurrentMemberId={setCurrentMemberId}
            handleUpdateLevel={handleUpdateLevel}
            getMemberTarget={getMemberTarget}
            periodDataMap={periodDataMap}
            activeMemberTargets={activeMemberTargets}
          />

          {/* ============================== BACK FACE (RADAR VIEW) ============================== */}
          <TelesalesBackFace
            themeMode={themeMode}
            currentMemberId={currentMemberId}
            currentPeriodId={currentPeriodId}
            currentMetricKey={currentMetricKey}
            activeMember={activeMember}
            activePerformance={activePerformance}
            activePercent={activePercent}
            activeLevelIdx={activeLevelIdx}
            activePreset={activePreset}
            dailyTarget={dailyTarget}
            weeklyTarget={weeklyTarget}
            monthlyTarget={monthlyTarget}
            podiumOrderBack={podiumOrderBack}
            remainingBack={remainingBack}
            isRadialOpen={isRadialOpen}
            loading={loading}
            isAdmin={isAdmin}
            onClose={onClose}
            setIsFlipped={setIsFlipped}
            setIsConfigOpen={setIsConfigOpen}
            setIsRadialOpen={setIsRadialOpen}
            setCurrentPeriodId={setCurrentPeriodId}
            setCurrentMetricKey={setCurrentMetricKey}
            setCurrentMemberId={setCurrentMemberId}
            handleUpdateLevel={handleUpdateLevel}
            getMemberTarget={getMemberTarget}
            periodDataMap={periodDataMap}
            dataPoints={dataPoints}
            activeMemberTargets={activeMemberTargets}
          />
        </div>

        {/* Target Config Panel Slide-in (rendered once over the current face) */}
        <TelesalesConfigPanel
          themeMode={themeMode}
          isConfigOpen={isConfigOpen}
          setIsConfigOpen={setIsConfigOpen}
          configTab={configTab}
          setConfigTab={setConfigTab}
          periods={periods}
          currentPeriodId={currentPeriodId}
          expandedSections={expandedSections}
          setExpandedSections={setExpandedSections}
          targets={targets}
          metricConfigs={metricConfigs}
          handleTargetChange={handleTargetChange}
          saveTargets={saveTargets}
          systemStaff={systemStaff}
          selectedStaffIds={selectedStaffIds}
          toggleStaffSelection={toggleStaffSelection}
          getMemberLevelIdx={getMemberLevelIdx}
          setStaffLevels={setStaffLevels}
          saveVisibleStaff={saveVisibleStaff}
          isAdmin={isAdmin}
        />

        {/* Drag resize handle visual indicator */}
        <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 pointer-events-none z-[1050] flex items-end justify-end opacity-40">
          <svg className="w-3 h-3 text-gold" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="8" y1="2" x2="2" y2="8" />
            <line x1="8" y1="5" x2="5" y2="8" />
          </svg>
        </div>
      </div>
    </div>
  );
}

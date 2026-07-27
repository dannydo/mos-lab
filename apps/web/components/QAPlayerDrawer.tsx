'use client';

import React, { useEffect, useState } from 'react';
import { Drawer, Spin, theme, message, Row, Col } from 'antd';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../lib/api-client';

// Custom Hook
import useAudioPlayer from './qa-player/useAudioPlayer';

// Sub-components
import QAHeader from './qa-player/components/QAHeader';
import AudioTimeline from './qa-player/components/AudioTimeline';
import TranscriptChat from './qa-player/components/TranscriptChat';
import AISatisfactionPanel from './qa-player/components/AISatisfactionPanel';
import QAEvaluationForm from './qa-player/components/QAEvaluationForm';

interface QAPlayerDrawerProps {
  open: boolean;
  omicallLogId: number | null;
  onClose: () => void;
  onVerifySuccess?: () => void;
}

export const QAPlayerDrawer: React.FC<QAPlayerDrawerProps> = ({ open, omicallLogId, onClose, onVerifySuccess }) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [loading, setLoading] = useState(false);
  const [logDetails, setLogDetails] = useState<SafeAny>(null);

  // Form states
  const [happyCallStatus, setHappyCallStatus] = useState<string>('NONE');
  const [happyCallReason, setHappyCallReason] = useState<string>('');
  const [qaNotes, setQaNotes] = useState<string>('');
  const [qaScore, setQaScore] = useState<number>(0);
  const [qaTags, setQaTags] = useState<string[]>([]);
  const [qaChecklist, setQaChecklist] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  // Resizable Drawer Width (persists on F5)
  const [drawerWidth, setDrawerWidth] = useState<number>(1100);

  // Audio player hook
  const audioPlayer = useAudioPlayer(logDetails);
  const {
    audioRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    playbackRate,
    togglePlay,
    skipTime,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleAudioEnded,
    handleSliderChange,
    handleSpeedChange,
    seekTo,
    formatTime,
  } = audioPlayer;

  // Retrieve saved width or set default on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('qa_drawer_width');
      if (savedWidth) {
        setDrawerWidth(parseInt(savedWidth, 10));
      } else {
        const defaultWidth = Math.min(1100, window.innerWidth * 0.95);
        setDrawerWidth(defaultWidth);
      }
    }
  }, []);

  // Mouse drag handler to resize the drawer from the left edge
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = drawerWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX; // Drag left -> positive
      const newWidth = Math.max(500, Math.min(window.innerWidth * 0.98, startWidth + deltaX));
      setDrawerWidth(newWidth);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const currentWidth = startWidth + (startX - upEvent.clientX);
      const finalWidth = Math.max(500, Math.min(window.innerWidth * 0.98, currentWidth));
      localStorage.setItem('qa_drawer_width', String(finalWidth));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    if (open && omicallLogId) {
      fetchLogDetails();
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      handleSpeedChange(1);
      setLogDetails(null);
    }
  }, [open, omicallLogId]);

  const fetchLogDetails = async () => {
    if (!omicallLogId) return;
    setLoading(true);
    try {
      const data = (await apiClient.omicall.getPlayDetails(omicallLogId)) as SafeAny;
      setLogDetails(data);
      setHappyCallStatus(data.happyCallStatus || 'NONE');
      setHappyCallReason(data.happyCallReason || '');
      setQaNotes(data.qaNotes || '');
      setQaScore(data.qaScore || 0);
      setQaTags(data.qaTags || []);
      setQaChecklist(data.qaChecklist || {});
    } catch (err) {
      console.error('[QAPlayerDrawer] Failed to fetch log details:', err);
      message.error((err as SafeAny).response?.data?.message || 'Không thể tải chi tiết cuộc gọi');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async () => {
    if (!omicallLogId) return;
    setSubmitting(true);
    try {
      const data = (await apiClient.omicall.verifyLog(omicallLogId, {
        happyCallStatus,
        happyCallReason: happyCallReason || null,
        qaNotes: qaNotes || null,
        qaScore: qaScore || null,
        qaTags: qaTags || [],
        qaChecklist: qaChecklist || {},
      })) as SafeAny;
      message.success('Cập nhật kết quả thẩm định QA thành công!');
      if (onVerifySuccess) {
        onVerifySuccess();
      }
      setLogDetails(data);
      setHappyCallStatus(data.happyCallStatus || 'NONE');
      setHappyCallReason(data.happyCallReason || '');
      setQaNotes(data.qaNotes || '');
      setQaScore(data.qaScore || 0);
      setQaTags(data.qaTags || []);
      setQaChecklist(data.qaChecklist || {});
    } catch (err) {
      console.error('[QAPlayerDrawer] Failed to verify log:', err);
      message.error((err as SafeAny).response?.data?.message || 'Thẩm định cuộc gọi thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const getLaughTimestamps = () => {
    if (!logDetails?.laughTimestamps) return [];
    try {
      if (typeof logDetails.laughTimestamps === 'string') {
        return JSON.parse(logDetails.laughTimestamps);
      }
      return logDetails.laughTimestamps;
    } catch (e) {
      return [];
    }
  };

  const laughList = getLaughTimestamps();

  const isEvaluationDisabled = !logDetails?.recordingUrl || !logDetails?.transcript;

  return (
    <Drawer
      title={null} // custom header design inside the drawer content
      width={drawerWidth}
      onClose={onClose}
      open={open}
      destroyOnClose
      style={{
        background: themeMode === 'dark' ? '#141414' : '#f9f9f9',
        color: token.colorText,
      }}
      styles={{ body: { padding: '20px', position: 'relative' } }}
    >
      {/* Absolute positioned Drag handle on the left edge */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 left-0 bottom-0 w-[5px] cursor-col-resize hover:bg-[#D4A84B]/40 active:bg-[#D4A84B] transition-colors duration-150 z-[9999]"
        title="Kéo để thay đổi kích thước"
      />

      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-3">
          <Spin size="large" />
          <span className="text-xs text-slate-400 font-medium">Đang tải chi tiết cuộc gọi...</span>
        </div>
      ) : logDetails ? (
        <div>
          {/* HIDDEN AUDIO ELEMENT */}
          {logDetails.recordingUrl && (
            <audio
              ref={audioRef}
              src={logDetails.recordingUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleAudioEnded}
            />
          )}

          {/* Premium Header */}
          <QAHeader logDetails={logDetails} themeMode={themeMode} token={token} formatTime={formatTime} />

          <Row gutter={24}>
            {/* LEFT COLUMN: PLAYER & TRANSCRIPT & AI INSIGHTS (60%) */}
            <Col xs={24} lg={14}>
              <AudioTimeline
                recordingUrl={logDetails.recordingUrl}
                currentTime={currentTime}
                duration={duration}
                playbackRate={playbackRate}
                isPlaying={isPlaying}
                themeMode={themeMode}
                token={token}
                laughList={laughList}
                formatTime={formatTime}
                handleSliderChange={handleSliderChange}
                handleSpeedChange={handleSpeedChange}
                skipTime={skipTime}
                togglePlay={togglePlay}
                seekTo={seekTo}
                logDetails={logDetails}
              />

              <TranscriptChat
                logDetails={logDetails}
                currentTime={currentTime}
                themeMode={themeMode}
                token={token}
                laughList={laughList}
                seekTo={seekTo}
              />

              <AISatisfactionPanel logDetails={logDetails} themeMode={themeMode} token={token} />
            </Col>

            {/* RIGHT COLUMN: QA EVALUATION FORM (40%) */}
            <Col xs={24} lg={10}>
              <QAEvaluationForm
                happyCallStatus={happyCallStatus}
                setHappyCallStatus={setHappyCallStatus}
                happyCallReason={happyCallReason}
                setHappyCallReason={setHappyCallReason}
                qaNotes={qaNotes}
                setQaNotes={setQaNotes}
                qaScore={qaScore}
                setQaScore={setQaScore}
                qaTags={qaTags}
                setQaTags={setQaTags}
                qaChecklist={qaChecklist}
                setQaChecklist={setQaChecklist}
                submitting={submitting}
                handleVerifySubmit={handleVerifySubmit}
                themeMode={themeMode}
                token={token}
                disabled={isEvaluationDisabled}
              />
            </Col>
          </Row>
        </div>
      ) : (
        <div className="py-20 text-center">
          <span className="text-slate-400">Không thể tải thông tin chi tiết cuộc gọi.</span>
        </div>
      )}
    </Drawer>
  );
};

export default QAPlayerDrawer;

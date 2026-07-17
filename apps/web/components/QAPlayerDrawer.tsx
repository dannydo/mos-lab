'use client';

import React, { useEffect, useState } from 'react';
import { Drawer, Spin, theme, message, Space, Tag, Row, Col, Typography } from 'antd';
import { AudioOutlined } from '@ant-design/icons';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../lib/api-client';

const { Text } = Typography;

// Custom Hook
import useAudioPlayer from './qa-player/useAudioPlayer';

// Sub-components
import CallMetadataCard from './qa-player/components/CallMetadataCard';
import AudioPlayerCard from './qa-player/components/AudioPlayerCard';
import QAVerificationForm from './qa-player/components/QAVerificationForm';
import LaughterBadges from './qa-player/components/LaughterBadges';
import TranscriptPanel from './qa-player/components/TranscriptPanel';

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
  const [submitting, setSubmitting] = useState(false);

  // Drawer Width sizing
  const [drawerWidth, setDrawerWidth] = useState(1000);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const minWidth = Math.min(1000, window.innerWidth * 0.95);
      setDrawerWidth(minWidth);
    }
  }, []);

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
      const data = await apiClient.omicall.verifyLog(omicallLogId, {
        happyCallStatus,
        happyCallReason: happyCallReason || null,
        qaNotes: qaNotes || null,
      });
      message.success('Cập nhật kết quả thẩm định QA thành công!');
      if (onVerifySuccess) {
        onVerifySuccess();
      }
      setLogDetails(data);
    } catch (err) {
      console.error('[QAPlayerDrawer] Failed to verify log:', err);
      message.error((err as SafeAny).response?.data?.message || 'Thẩm định cuộc gọi thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const getHappyCallTagColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'PENDING_APPROVAL':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getHappyCallTagLabel = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Đồng Ý';
      case 'REJECTED':
        return 'Từ Chối';
      case 'PENDING_APPROVAL':
        return 'Chờ Duyệt';
      default:
        return 'Chưa Duyệt';
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

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between w-full">
          <Space>
            <AudioOutlined style={{ color: token.colorPrimary }} />
            <span>Thẩm định chất lượng cuộc gọi (QA)</span>
          </Space>
          {logDetails && (
            <Tag color={getHappyCallTagColor(logDetails.happyCallStatus)} className="ml-3">
              {getHappyCallTagLabel(logDetails.happyCallStatus)}
            </Tag>
          )}
        </div>
      }
      width={drawerWidth}
      onClose={onClose}
      open={open}
      destroyOnClose
      style={{
        background: themeMode === 'dark' ? '#141414' : '#f9f9f9',
        color: token.colorText,
      }}
      styles={{ body: { padding: '20px' } }}
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" tip="Đang tải chi tiết cuộc gọi..." />
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

          <Row gutter={24}>
            {/* LEFT COLUMN: PLAYER, METADATA, QA VERIFICATION */}
            <Col xs={24} lg={11}>
              <CallMetadataCard logDetails={logDetails} themeMode={themeMode} token={token} formatTime={formatTime} />

              <AudioPlayerCard
                recordingUrl={logDetails.recordingUrl}
                currentTime={currentTime}
                duration={duration}
                playbackRate={playbackRate}
                isPlaying={isPlaying}
                themeMode={themeMode}
                token={token}
                formatTime={formatTime}
                handleSliderChange={handleSliderChange}
                handleSpeedChange={handleSpeedChange}
                skipTime={skipTime}
                togglePlay={togglePlay}
              />

              <QAVerificationForm
                happyCallStatus={happyCallStatus}
                setHappyCallStatus={setHappyCallStatus}
                happyCallReason={happyCallReason}
                setHappyCallReason={setHappyCallReason}
                qaNotes={qaNotes}
                setQaNotes={setQaNotes}
                submitting={submitting}
                handleVerifySubmit={handleVerifySubmit}
                themeMode={themeMode}
                token={token}
              />
            </Col>

            {/* RIGHT COLUMN: TRANSCRIPT & LAUGHTER DETAILS */}
            <Col xs={24} lg={13}>
              <LaughterBadges
                laughList={laughList}
                currentTime={currentTime}
                token={token}
                themeMode={themeMode}
                seekTo={seekTo}
                formatTime={formatTime}
              />

              <TranscriptPanel
                logDetails={logDetails}
                currentTime={currentTime}
                themeMode={themeMode}
                token={token}
                laughList={laughList}
                seekTo={seekTo}
              />
            </Col>
          </Row>
        </div>
      ) : (
        <div className="py-20 text-center">
          <Text type="secondary">Không thể tải thông tin chi tiết cuộc gọi.</Text>
        </div>
      )}
    </Drawer>
  );
};

export default QAPlayerDrawer;

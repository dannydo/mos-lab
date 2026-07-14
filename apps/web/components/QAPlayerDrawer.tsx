'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Drawer,
  Spin,
  Card,
  Tag,
  theme,
  message,
  Space,
  Button,
  Form,
  Radio,
  Input,
  Select,
  Slider,
  Typography,
  Divider,
  Row,
  Col
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  FastForwardOutlined,
  FastBackwardOutlined,
  SmileOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  AudioOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';

const { Title, Text, Paragraph } = Typography;

interface QAPlayerDrawerProps {
  open: boolean;
  omicallLogId: number | null;
  onClose: () => void;
  onVerifySuccess?: () => void;
}

export const QAPlayerDrawer: React.FC<QAPlayerDrawerProps> = ({
  open,
  omicallLogId,
  onClose,
  onVerifySuccess
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [loading, setLoading] = useState(false);
  const [logDetails, setLogDetails] = useState<any>(null);
  
  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Form states
  const [happyCallStatus, setHappyCallStatus] = useState<string>('NONE');
  const [happyCallReason, setHappyCallReason] = useState<string>('');
  const [qaNotes, setQaNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Drawer Width sizing
  const [drawerWidth, setDrawerWidth] = useState(1000);

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
      // Pause audio and reset state when drawer closed
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setPlaybackRate(1);
      setLogDetails(null);
    }
  }, [open, omicallLogId]);

  const fetchLogDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/omicall/logs/${omicallLogId}/play`);
      const data = res.data;
      setLogDetails(data);
      setHappyCallStatus(data.happyCallStatus || 'NONE');
      setHappyCallReason(data.happyCallReason || '');
      setQaNotes(data.qaNotes || '');
    } catch (err: any) {
      console.error('[QAPlayerDrawer] Failed to fetch log details:', err);
      message.error(err.response?.data?.message || 'Không thể tải chi tiết cuộc gọi');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post(`/omicall/logs/${omicallLogId}/verify`, {
        happyCallStatus,
        happyCallReason: happyCallReason || null,
        qaNotes: qaNotes || null
      });
      message.success('Cập nhật kết quả thẩm định QA thành công!');
      if (onVerifySuccess) {
        onVerifySuccess();
      }
      setLogDetails(res.data);
    } catch (err: any) {
      console.error('[QAPlayerDrawer] Failed to verify log:', err);
      message.error(err.response?.data?.message || 'Thẩm định cuộc gọi thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Audio Handlers
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error('Audio play error:', err);
        message.error('Không thể phát file âm thanh này.');
      });
      setIsPlaying(true);
    }
  };

  const skipTime = (amount: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + amount));
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || logDetails?.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSliderChange = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const seekTo = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      if (!isPlaying) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (secs: number | undefined) => {
    if (secs === undefined || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getHappyCallTagColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      case 'PENDING_APPROVAL': return 'warning';
      default: return 'default';
    }
  };

  const getHappyCallTagLabel = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Đồng Ý';
      case 'REJECTED': return 'Từ Chối';
      case 'PENDING_APPROVAL': return 'Chờ Duyệt';
      default: return 'Chưa Duyệt';
    }
  };

  // Parse laugh timestamps JSON
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
        color: token.colorText
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
              {/* METADATA CARD */}
              <Card
                className="mb-4 shadow-sm"
                style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
                  borderColor: token.colorBorderSecondary,
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Call UUID:</Text>
                    <div style={{ wordBreak: 'break-all', fontWeight: '500' }}>{logDetails.callUuid}</div>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <Row gutter={12}>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Telesales:</Text>
                      <div style={{ fontWeight: '600' }}>{logDetails.staff?.displayName || `Staff - ${logDetails.staffId}`}</div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Khách hàng:</Text>
                      <div style={{ fontWeight: '600', color: token.colorPrimary }}>{logDetails.destinationNumber}</div>
                    </Col>
                  </Row>
                  <Divider style={{ margin: '8px 0' }} />
                  <Row gutter={12}>
                    <Col span={8}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Thời lượng:</Text>
                      <div>{formatTime(logDetails.duration)}</div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Tính cước:</Text>
                      <div>{formatTime(logDetails.billSec)}</div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Kết quả:</Text>
                      <div>
                        <Tag color={logDetails.status === 'ANSWER' ? 'success' : 'error'}>
                          {logDetails.status}
                        </Tag>
                      </div>
                    </Col>
                  </Row>
                  <Divider style={{ margin: '8px 0' }} />
                  <Row gutter={12}>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Ngày gọi:</Text>
                      <div>{new Date(logDetails.createdAt).toLocaleString('vi-VN')}</div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Tiếng cười phát hiện:</Text>
                      <div>
                        <Tag color={logDetails.laughCount > 0 ? 'purple' : 'default'} style={{ fontWeight: 'bold' }}>
                          <SmileOutlined /> {logDetails.laughCount || 0} lần
                        </Tag>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Card>

              {/* CUSTOM PREMIUM AUDIO PLAYER */}
              <Card
                className="mb-4 shadow-sm"
                style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
                  borderColor: token.colorBorderSecondary,
                  borderRadius: '12px'
                }}
              >
                {!logDetails.recordingUrl ? (
                  <div className="text-center py-6">
                    <Text type="secondary" style={{ fontStyle: 'italic' }}>
                      Không tìm thấy liên kết file ghi âm (OmiCall chưa đồng bộ file)
                    </Text>
                  </div>
                ) : (
                  <div>
                    {/* Time sliders */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text style={{ fontSize: '12px', fontWeight: '500' }}>{formatTime(currentTime)}</Text>
                      <Text style={{ fontSize: '12px', fontWeight: '500' }}>{formatTime(duration)}</Text>
                    </div>
                    
                    <Slider
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSliderChange}
                      tooltip={{ formatter: formatTime }}
                      className="mb-4"
                      trackStyle={{ backgroundColor: token.colorPrimary }}
                      handleStyle={{ borderColor: token.colorPrimary }}
                    />

                    {/* Controls row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <Space size="middle">
                        <Button
                          icon={<FastBackwardOutlined />}
                          onClick={() => skipTime(-10)}
                          type="text"
                          style={{ fontSize: '16px' }}
                          title="Tua lại 10s"
                        />
                        <Button
                          type="primary"
                          shape="circle"
                          size="large"
                          icon={isPlaying ? <PauseCircleOutlined style={{ fontSize: '24px' }} /> : <PlayCircleOutlined style={{ fontSize: '24px' }} />}
                          onClick={togglePlay}
                          style={{
                            background: token.colorPrimary,
                            borderColor: token.colorPrimary,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '50px',
                            height: '50px'
                          }}
                        />
                        <Button
                          icon={<FastForwardOutlined />}
                          onClick={() => skipTime(10)}
                          type="text"
                          style={{ fontSize: '16px' }}
                          title="Tua đi 10s"
                        />
                      </Space>

                      {/* Playback speed selector */}
                      <Space>
                        <SettingOutlined type="secondary" />
                        <Select
                          size="small"
                          value={playbackRate}
                          onChange={handleSpeedChange}
                          style={{ width: 85 }}
                          options={[
                            { value: 1, label: '1.0x' },
                            { value: 1.25, label: '1.25x' },
                            { value: 1.5, label: '1.5x' },
                            { value: 2, label: '2.0x' }
                          ]}
                        />
                      </Space>
                    </div>
                  </div>
                )}
              </Card>

              {/* QA VERIFICATION PANEL */}
              <Card
                title={<span style={{ fontWeight: 'bold' }}>Biểu mẫu đánh giá QA</span>}
                className="shadow-sm"
                style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
                  borderColor: token.colorBorderSecondary,
                  borderRadius: '12px'
                }}
              >
                <Form layout="vertical">
                  <Form.Item label={<span style={{ fontWeight: '500' }}>Trạng thái Happy Call:</span>} required>
                    <Radio.Group
                      value={happyCallStatus}
                      onChange={(e) => setHappyCallStatus(e.target.value)}
                      optionType="button"
                      buttonStyle="solid"
                      className="w-full flex justify-between gap-1"
                    >
                      <Radio.Button value="APPROVED" className="flex-1 text-center" style={{ borderColor: happyCallStatus === 'APPROVED' ? '#52C41A' : undefined }}>
                        <CheckOutlined style={{ color: '#52C41A' }} /> Đồng ý
                      </Radio.Button>
                      <Radio.Button value="REJECTED" className="flex-1 text-center" style={{ borderColor: happyCallStatus === 'REJECTED' ? '#FF4D4F' : undefined }}>
                        <CloseOutlined style={{ color: '#FF4D4F' }} /> Từ chối
                      </Radio.Button>
                      <Radio.Button value="PENDING_APPROVAL" className="flex-1 text-center" style={{ borderColor: happyCallStatus === 'PENDING_APPROVAL' ? '#FAAD14' : undefined }}>
                        Chờ duyệt
                      </Radio.Button>
                    </Radio.Group>
                  </Form.Item>

                  {(happyCallStatus === 'APPROVED' || happyCallStatus === 'REJECTED') && (
                    <Form.Item label={<span style={{ fontWeight: '500' }}>Lý do (Phân loại):</span>}>
                      <Select
                        value={happyCallReason}
                        onChange={setHappyCallReason}
                        placeholder="Chọn lý do cụ thể..."
                        options={
                          happyCallStatus === 'APPROVED'
                            ? [
                                { value: 'auto_180s', label: 'Cuộc gọi tự động đạt ≥ 180 giây' },
                                { value: 'auto_laughter_30s', label: 'Cuộc gọi tự động đạt ≥ 30 giây + có tiếng cười' },
                                { value: 'manual_approved', label: 'Duyệt thủ công bởi QA Manager' }
                              ]
                            : [
                                { value: 'no_show_outcome', label: 'Khách hàng không phản hồi thực chất' },
                                { value: 'wrong_number', label: 'Sai số điện thoại / Nhầm máy' },
                                { value: 'short_spam', label: 'Cuộc gọi rác / thời lượng quá ngắn' },
                                { value: 'other', label: 'Lý do khác' }
                              ]
                        }
                      />
                    </Form.Item>
                  )}

                  <Form.Item label={<span style={{ fontWeight: '500' }}>Ghi chú thẩm định QA:</span>}>
                    <Input.TextArea
                      rows={3}
                      value={qaNotes}
                      onChange={(e) => setQaNotes(e.target.value)}
                      placeholder="Nhập ghi chú phản hồi, đánh giá ngữ cảnh cuộc gọi tại đây..."
                    />
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="primary"
                      onClick={handleVerifySubmit}
                      loading={submitting}
                      style={{
                        width: '100%',
                        background: '#D4A84B',
                        borderColor: '#D4A84B',
                        color: 'black',
                        fontWeight: '600',
                        height: '40px',
                        borderRadius: '8px'
                      }}
                    >
                      Lưu Kết Quả Thẩm Định
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            {/* RIGHT COLUMN: TRANSCRIPT & LAUGHTER DETAILS */}
            <Col xs={24} lg={13}>
              {/* LAUGHTER TIMESTAMPS CLICKABLE BADGES */}
              {laughList.length > 0 && (
                <Card
                  title={<span style={{ fontWeight: 'bold' }}>Tiếng cười phát hiện ({laughList.length})</span>}
                  className="mb-4 shadow-sm"
                  style={{
                    background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
                    borderColor: token.colorBorderSecondary,
                    borderRadius: '12px'
                  }}
                  styles={{ body: { padding: '12px' } }}
                >
                  <Space wrap size="small">
                    {laughList.map((laugh: any, index: number) => {
                      const isActive = currentTime >= laugh.start && currentTime <= laugh.end;
                      return (
                        <Button
                          key={index}
                          size="small"
                          icon={<SmileOutlined style={{ color: '#722ED1' }} />}
                          onClick={() => seekTo(laugh.start)}
                          style={{
                            borderColor: isActive ? '#722ED1' : token.colorBorder,
                            background: isActive ? 'rgba(114, 46, 209, 0.08)' : undefined,
                            fontWeight: isActive ? '600' : 'normal',
                            borderRadius: '20px'
                          }}
                        >
                          {formatTime(laugh.start)} - {formatTime(laugh.end)} ({Math.round(laugh.confidence * 100)}%)
                        </Button>
                      );
                    })}
                  </Space>
                </Card>
              )}

              {/* TRANSCRIPT PANEL */}
              <Card
                title={<span style={{ fontWeight: 'bold' }}>Văn bản cuộc gọi (AI Transcript)</span>}
                className="shadow-sm"
                style={{
                  background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
                  borderColor: token.colorBorderSecondary,
                  borderRadius: '12px',
                  height: laughList.length > 0 ? 'calc(100vh - 280px)' : 'calc(100vh - 195px)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                styles={{ body: { overflowY: 'auto', flex: 1, padding: '16px' } }}
              >
                {logDetails.analysisStatus === 'PENDING' || logDetails.analysisStatus === 'PROCESSING' ? (
                  <div className="flex flex-col justify-center items-center py-20">
                    <Spin size="default" />
                    <Paragraph className="mt-3 text-center" style={{ color: token.colorTextDescription }}>
                      AI đang xử lý nhận diện tiếng cười và dịch giọng nói. Vui lòng quay lại sau vài giây...
                    </Paragraph>
                  </div>
                ) : logDetails.analysisStatus === 'FAILED' ? (
                  <div className="py-10 text-center">
                    <Text type="danger" style={{ fontWeight: '500' }}>AI xử lý thất bại</Text>
                    {logDetails.analysisError && (
                      <Paragraph type="secondary" style={{ marginTop: '8px', fontSize: '13px' }}>
                        Chi tiết: {logDetails.analysisError}
                      </Paragraph>
                    )}
                  </div>
                ) : !logDetails.transcript ? (
                  <div className="py-20 text-center">
                    <Text type="secondary" style={{ fontStyle: 'italic' }}>
                      Không có dữ liệu văn bản. Cuộc gọi có thể không có hội thoại hoặc âm thanh trống.
                    </Text>
                  </div>
                ) : (
                  <div>
                    {/* Render transcript paragraphs */}
                    <div style={{ lineHeight: '1.7', fontSize: '15px' }}>
                      {logDetails.transcript.split('\n').map((line: string, idx: number) => {
                        // Extract timestamp if exists in transcript like [00:12] Text
                        const match = line.match(/^\[(\d{2}):(\d{2})\]/);
                        if (match) {
                          const mins = parseInt(match[1], 10);
                          const secs = parseInt(match[2], 10);
                          const totalSecs = mins * 60 + secs;
                          const content = line.replace(/^\[\d{2}:\d{2}\]/, '').trim();

                          // Check if current playback time is close to this line
                          const isClose = Math.abs(currentTime - totalSecs) < 3;

                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                marginBottom: '10px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: isClose ? 'rgba(212, 168, 75, 0.08)' : 'transparent',
                                transition: 'background 0.3s ease'
                              }}
                            >
                              <Button
                                size="small"
                                type="text"
                                style={{
                                  padding: 0,
                                  color: token.colorPrimary,
                                  fontWeight: '600',
                                  fontSize: '13px',
                                  height: 'auto'
                                }}
                                onClick={() => seekTo(totalSecs)}
                              >
                                {match[0]}
                              </Button>
                              <div style={{ color: token.colorText }}>{content}</div>
                            </div>
                          );
                        }

                        return (
                          <Paragraph key={idx} style={{ marginBottom: '10px', color: token.colorText }}>
                            {line}
                          </Paragraph>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
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

'use client';

import React, { useState, useEffect } from 'react';
import { useOmiCall, CurrentCall } from '../context/OmiCallContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Input, DatePicker, Tag, Space, Form, theme, message } from 'antd';
import { 
  PhoneOutlined, 
  CloseOutlined, 
  AudioMutedOutlined, 
  BorderOutlined, 
  PauseOutlined, 
  CheckCircleOutlined, 
  WarningOutlined,
  SyncOutlined,
  LoadingOutlined,
  SmileOutlined
} from '@ant-design/icons';
import { apiClient } from '../lib/api-client';
import dayjs from 'dayjs';

export default function OmiCallWidget() {
  const { 
    isRegistered, 
    isTabMuted,
    callState, 
    callDuration, 
    currentCall, 
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
    isSimulated
  } = useOmiCall();

  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [widgetMinimized, setWidgetMinimized] = useState(false);
  const [resolvedLog, setResolvedLog] = useState<any>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  
  // Wrap-up Form States
  const [noteForm] = Form.useForm();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submittingWrapup, setSubmittingWrapup] = useState(false);

  const availableTags = ['Đặt lịch hẹn', 'Khách quan tâm', 'Đã gửi Zalo', 'Hẹn gọi lại', 'Đặt cọc thành công'];

  // Toggle wrap-up tag
  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

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

  // Polling AI analysis result during 'wrapup' state
  useEffect(() => {
    if (callState !== 'wrapup' || !currentCall) {
      setResolvedLog(null);
      return;
    }

    if (isSimulated) {
      console.log('[OmiCallWidget] Resolving simulated call log...');
      setResolvedLog({
        id: 0,
        customerName: currentCall.name,
        legacyUserId: currentCall.legacyUserId || 0,
        callUuid: currentCall.callUuid || 'simulated-' + Date.now()
      });
      return;
    }

    let intervalId: any = null;
    let attempts = 0;

    const pollLog = async () => {
      attempts++;
      try {
        const data = await apiClient.omicall.getLatestLog({
          phone: currentCall.phone,
          direction: currentCall.direction
        });

        if (data && data.id) {
          console.log('[OmiCallWidget] Log resolved successfully:', data);
          setResolvedLog(data);
          
          // Update current call with customer name and ID
          if (currentCall) {
            setCurrentCall({
              ...currentCall,
              legacyUserId: data.legacyUserId,
              name: data.customerName || currentCall.name,
              callUuid: data.callUuid
            });
          }

          clearInterval(intervalId);
          return;
        }
      } catch (err) {
        console.log('[OmiCallWidget] Log not ready yet. Retrying...');
      }

      if (attempts >= 20) { // 60 seconds timeout
        console.warn('[OmiCallWidget] AI analysis polling timed out');
        clearInterval(intervalId);
      }
    };

    // Poll every 3 seconds
    intervalId = setInterval(pollLog, 3000);
    pollLog(); // Poll immediately
    return () => clearInterval(intervalId);
  }, [callState, currentCall, setCurrentCall]);

  // Handle Wrap-up Form Submission
  const handleSaveWrapup = async () => {
    if (!currentCall) return;

    try {
      const values = await noteForm.validateFields();
      setSubmittingWrapup(true);

      const payload = {
        legacyUserId: currentCall.legacyUserId || 0, // Fallback if customer not matched
        callType: currentCall.direction === 'outbound' ? ('OUTBOUND' as const) : ('INBOUND' as const),
        callResult: callDuration > 0 ? ('ANSWERED' as const) : ('NO_ANSWER' as const),
        note: values.note || '',
        outcome: selectedTags.join(', '),
        callbackDate: values.callbackDate ? values.callbackDate.toISOString() : null,
        omicallLogId: resolvedLog?.id || null, // Link with actual OmiCall log
        callUuid: currentCall.callUuid || null // Link asynchronously using callUuid
      };

      await apiClient.calls.create(payload as any);
      message.success('Đã lưu ghi chú cuộc gọi thành công!');
      
      // Reset State
      setCallState('idle');
      setCurrentCall(null);
      setResolvedLog(null);
      setSelectedTags([]);
      noteForm.resetFields();
      setWidgetMinimized(false);
    } catch (err: any) {
      console.error('[OmiCallWidget] Failed to save call log:', err);
      message.error(err.response?.data?.message || 'Không thể lưu ghi chú cuộc gọi');
    } finally {
      setSubmittingWrapup(false);
    }
  };

  // If SIP device not registered and not in any call, we show nothing or disabled
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

  // RENDER MINIMIZED WIDGET (STANDBY OR ACTIVE CALL)
  if (widgetMinimized) {
    return (
      <div 
        onClick={() => setWidgetMinimized(false)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full flex items-center justify-center cursor-pointer shadow-2xl transition-all duration-300 hover:scale-105 z-50 animate-pulse"
        style={{
          background: '#D4A84B',
          boxShadow: '0 8px 30px rgba(212, 168, 75, 0.4)',
          border: '2px solid white'
        }}
      >
        {callState === 'connected' ? (
          <span className="text-black font-bold text-xs">{formatDuration(callDuration)}</span>
        ) : (
          <PhoneOutlined style={{ fontSize: '20px', color: 'black' }} />
        )}
      </div>
    );
  }

  return (
    <div 
      className="fixed bottom-6 right-6 w-96 rounded-2xl border shadow-2xl z-50 overflow-hidden backdrop-blur-md transition-all duration-300 flex flex-col"
      style={{
        background: containerBg,
        borderColor: borderColor,
        color: textColor
      }}
    >
      {/* HEADER */}
      <div 
        className="px-4 py-3 flex items-center justify-between border-b"
        style={{ borderColor: borderColor, background: isDark ? '#18181b' : '#f4f4f5' }}
      >
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${callState !== 'idle' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-500 font-sans">
            {isTabMuted ? 'OmiCall (Tab khác)' : 'OmiCall WebRTC'}
          </span>
          {isSimulated && (
            <Tag color="warning" className="m-0 text-[9px] font-extrabold uppercase px-1 py-0 border-0 leading-none">MÔ PHỎNG</Tag>
          )}
        </div>
        <div className="flex items-center gap-2">
          {callState !== 'wrapup' && (
            <Button 
              type="text" 
              size="small" 
              icon={<BorderOutlined />} 
              onClick={() => setWidgetMinimized(true)}
              style={{ color: descColor }}
            />
          )}
        </div>
      </div>

      {/* TAB MUTED (CONCURRENT CALL IN ANOTHER TAB) */}
      {isTabMuted && callState !== 'wrapup' && (
        <div className="p-6 text-center space-y-4">
          <div className="h-14 w-14 rounded-full flex items-center justify-center mx-auto text-amber-500" style={{ background: subBg }}>
            <SyncOutlined spin className="text-2xl" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Cuộc gọi đang diễn ra ở tab khác</h4>
            <p className="text-xs mt-1" style={{ color: descColor }}>Hệ thống đã khóa các thao tác gọi điện ở tab này để tránh xung đột.</p>
          </div>
        </div>
      )}

      {/* IDLE STATE */}
      {!isTabMuted && callState === 'idle' && (
        <div className="p-6 text-center space-y-4">
          <div className="h-14 w-14 rounded-full flex items-center justify-center mx-auto text-emerald-500" style={{ background: subBg }}>
            <PhoneOutlined className="text-2xl" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Tổng đài đang hoạt động</h4>
            {isSimulated ? (
              <p className="text-xs mt-1 text-amber-500 font-semibold">
                ⚠️ Chế độ mô phỏng. Cấu hình máy lẻ <a href="/dashboard/omicall" className="text-blue-500 underline hover:text-blue-600">tại đây</a>.
              </p>
            ) : (
              <p className="text-xs mt-1" style={{ color: descColor }}>Extension: <span className="font-bold text-amber-500">{sipConfig?.sipUser}</span> (Sẵn sàng nghe gọi)</p>
            )}
          </div>
        </div>
      )}

      {/* RINGING OUTGOING STATE */}
      {!isTabMuted && callState === 'ringing' && (
        <div className="p-6 text-center space-y-5">
          <div className="h-14 w-14 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 animate-bounce">
            <PhoneOutlined className="text-2xl" />
          </div>
          <div>
            {isSimulated ? (
              <p className="text-xs uppercase tracking-widest font-semibold text-amber-500">MÔ PHỎNG: Tự kết nối sau 2s...</p>
            ) : (
              <p className="text-xs uppercase tracking-widest font-semibold text-amber-500">Đang đổ chuông...</p>
            )}
            <h4 className="text-base font-bold mt-1">{currentCall?.name}</h4>
            <p className="text-xs font-mono" style={{ color: descColor }}>{currentCall?.phone}</p>
          </div>
          <div className="flex justify-center">
            <Button 
              danger 
              type="primary"
              shape="round" 
              icon={<CloseOutlined />} 
              onClick={hangUp}
              className="px-6 font-semibold"
            >
              Hủy gọi
            </Button>
          </div>
        </div>
      )}

      {/* INCOMING CALL STATE */}
      {!isTabMuted && callState === 'incoming' && (
        <div className="p-6 text-center space-y-5">
          <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500 animate-bounce">
            <PhoneOutlined className="text-2xl" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold text-amber-500">Cuộc gọi đến...</p>
            <h4 className="text-base font-bold mt-1">{currentCall?.name}</h4>
            <p className="text-xs font-mono" style={{ color: descColor }}>{currentCall?.phone}</p>
          </div>
          <div className="flex justify-center gap-4">
            <Button 
              type="primary" 
              shape="round" 
              onClick={answerCall}
              style={{ background: '#10b981', borderColor: '#10b981', color: 'white' }}
              className="px-6 font-semibold"
            >
              Nghe máy
            </Button>
            <Button 
              danger 
              type="primary" 
              shape="round" 
              icon={<CloseOutlined />} 
              onClick={rejectCall}
              className="px-6 font-semibold"
            >
              Từ chối
            </Button>
          </div>
        </div>
      )}

      {/* CONNECTED CALL STATE */}
      {!isTabMuted && callState === 'connected' && (
        <div className="p-6 space-y-5">
          <div className="text-center">
            <div className="text-3xl font-bold font-mono tracking-tight">{formatDuration(callDuration)}</div>
            <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: descColor }}>Thời gian đàm thoại</p>
          </div>

          <div className="p-3 border rounded-xl" style={{ borderColor: borderColor, background: subBg }}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>{currentCall?.name}</span>
              <span className="font-mono text-zinc-500">{currentCall?.phone}</span>
            </div>
            {isSimulated ? (
              <div className="text-[10px] flex items-center gap-1.5 border-t mt-2 pt-2 text-amber-500" style={{ borderColor: borderColor }}>
                <span className="font-bold">⚠️ CUỘC GỌI MÔ PHỎNG</span>
                <span>Tài khoản chưa có cấu hình máy lẻ</span>
              </div>
            ) : (
              <div className="text-[10px] flex items-center gap-1.5 border-t mt-2 pt-2" style={{ borderColor: borderColor, color: descColor }}>
                <span className="text-red-500 animate-pulse font-bold">● REC</span>
                <span>Ghi âm đang bật — AI sẽ quét sau khi gác máy</span>
              </div>
            )}
          </div>

          {/* Color Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs" style={{ color: descColor }}>
              <span>Tiến trình KPI cuộc gọi</span>
              <span className="font-bold">{callDuration}s</span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden relative">
              {/* 30s marker */}
              <div className="absolute top-0 bottom-0 left-[16.6%] w-px bg-white/30 z-10" title="Mốc 30 giây"></div>
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${getProgressPercentage()}%`,
                  background: getProgressBarColor()
                }}
              />
            </div>
            <div className="flex justify-between text-[9px]" style={{ color: descColor }}>
              <span>0s</span>
              <span className="text-amber-500 font-bold">30s (Min Happy)</span>
              <span className="text-emerald-500 font-bold">180s (Auto Happy)</span>
            </div>
          </div>

          {/* Controls toolbar */}
          <div className="flex justify-center gap-4 pt-2">
            <Button 
              shape="circle" 
              icon={<AudioMutedOutlined />} 
              onClick={toggleMute}
              style={{
                background: isMuted ? '#f59e0b' : '',
                color: isMuted ? 'black' : ''
              }}
            />
            <Button 
              shape="circle" 
              icon={<PauseOutlined />} 
              onClick={toggleHold}
              style={{
                background: isHeld ? '#f59e0b' : '',
                color: isHeld ? 'black' : ''
              }}
            />
            <Button 
              danger 
              type="primary" 
              shape="round" 
              onClick={hangUp}
              className="px-6 font-bold"
            >
              Gác máy
            </Button>
          </div>
        </div>
      )}

      {/* AI ANALYZING STATE */}
      {!isTabMuted && callState === 'analyzing' && (
        <div className="p-6 space-y-4 text-center">
          <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
            <LoadingOutlined className="text-2xl" />
          </div>
          <div>
            <h4 className="text-sm font-bold">🤖 AI đang phân tích cuộc gọi...</h4>
            <p className="text-xs mt-1" style={{ color: descColor }}>
              Đang phân tích tiếng cười và kết luận Happy Call từ ghi âm.
            </p>
          </div>

          {/* Animated Waveform */}
          <div className="flex items-end justify-center gap-[3px] h-12 my-4 bg-zinc-900/5 border border-zinc-800/10 rounded-lg p-2 overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent to-amber-500/10 animate-pulse border-r border-amber-500/30"></div>
            {[...Array(24)].map((_, i) => (
              <div 
                key={i} 
                className="w-[3px] bg-amber-500 rounded-full animate-bounce" 
                style={{ 
                  height: `${10 + Math.sin(i * 0.5) * 20 + Math.random() * 10}px`,
                  animationDelay: `${i * 0.05}s`,
                  animationDuration: '0.9s'
                }}
              />
            ))}
          </div>

          <div className="text-[11px] font-mono" style={{ color: descColor }}>
            Thời gian chờ dự kiến: ~10 giây
          </div>
        </div>
      )}

      {/* WRAP-UP STATE */}
      {!isTabMuted && callState === 'wrapup' && (
        <div className="p-4 space-y-4 max-h-[550px] overflow-y-auto">
          <div className="text-center border-b pb-3" style={{ borderColor: borderColor }}>
            <h4 className="text-sm font-bold">Ghi nhận cuộc gọi</h4>
            <p className="text-xs mt-1" style={{ color: descColor }}>
              Đàm thoại: <span className="font-mono font-bold">{formatDuration(callDuration)}</span>
              {resolvedLog?.happyCallStatus === 'APPROVED' && (
                <span className="text-emerald-500 font-bold ml-2">✅ Happy Call</span>
              )}
              {resolvedLog?.happyCallStatus === 'PENDING_APPROVAL' && (
                <span className="text-amber-500 font-bold ml-2">⏳ Chờ duyệt Happy</span>
              )}
            </p>
          </div>

          {/* AI Analysis and CSAT Panel */}
          {callDuration > 0 && (
            !resolvedLog ? (
              <div 
                className="p-3 rounded-lg border text-xs flex flex-col gap-1 items-center justify-center text-amber-500 text-center"
                style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.15)' }}
              >
                <div className="flex items-center gap-2">
                  <SyncOutlined spin />
                  <span className="font-bold">🤖 AI đang phân tích cuộc gọi ngầm...</span>
                </div>
                <span className="text-[10px]" style={{ color: descColor }}>
                  Booker có thể ghi chú và bấm lưu luôn mà không cần chờ.
                </span>
              </div>
            ) : resolvedLog.analysisStatus !== 'SKIPPED' ? (
              <div 
                className="p-3.5 rounded-lg border text-xs space-y-3"
                style={{ background: subBg, borderColor }}
              >
                {/* Laughter & CSAT Score */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold" style={{ color: textColor }}>Điểm hài lòng (CSAT)</span>
                    <div className="flex items-center gap-0.5 mt-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className="text-base">
                          {i < (resolvedLog.customerSatisfactionScore || 0) ? '★' : '☆'}
                        </span>
                      ))}
                      <span className="text-[10px] ml-1 font-bold" style={{ color: descColor }}>
                        ({resolvedLog.customerSatisfactionScore || 0}/5)
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold" style={{ color: textColor }}>Thái độ KH</span>
                    <Tag 
                      className="mt-0.5 font-bold text-[9px] px-1.5 py-0"
                      color={
                        resolvedLog.customerSentiment === 'HAPPY' ? 'emerald' :
                        resolvedLog.customerSentiment === 'SATISFIED' ? 'green' :
                        resolvedLog.customerSentiment === 'NEUTRAL' ? 'blue' :
                        resolvedLog.customerSentiment === 'FRUSTRATED' ? 'orange' :
                        resolvedLog.customerSentiment === 'ANGRY' ? 'red' : 'default'
                      }
                    >
                      {resolvedLog.customerSentiment || 'NEUTRAL'}
                    </Tag>
                  </div>
                </div>

                {/* Satisfaction Analysis Detail */}
                {resolvedLog.satisfactionAnalysis && (
                  <div className="text-[10.5px] border-t pt-2" style={{ borderColor, color: descColor }}>
                    <span className="font-bold text-zinc-400">Phân tích:</span> {resolvedLog.satisfactionAnalysis}
                  </div>
                )}

                {/* Laughter Breakdown */}
                <div className="border-t pt-2 space-y-1.5" style={{ borderColor }}>
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span>👤 Khách hàng cười: <strong>{resolvedLog.laughCountCustomer || 0}</strong> lần</span>
                    <span>🎧 Nhân viên cười: <strong>{resolvedLog.laughCountAgent || 0}</strong> lần</span>
                  </div>

                  {/* Click-to-seek badges */}
                  {(() => {
                    try {
                      const laughs = typeof resolvedLog.laughTimestamps === 'string'
                        ? JSON.parse(resolvedLog.laughTimestamps)
                        : resolvedLog.laughTimestamps;
                      if (Array.isArray(laughs) && laughs.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {laughs.map((l: any, i: number) => {
                              const isCustomer = l.speaker === 'customer';
                              return (
                                <Tag 
                                  key={i}
                                  onClick={() => {
                                    if (audioRef.current) {
                                      audioRef.current.currentTime = l.start;
                                      audioRef.current.play().catch(() => {});
                                    }
                                  }}
                                  className="cursor-pointer text-[9px] font-mono hover:opacity-85 active:scale-95 transition-all py-0 px-1.5"
                                  color={isCustomer ? 'purple' : 'blue'}
                                >
                                  😂 {isCustomer ? 'KH' : 'NV'}: {Math.floor(l.start)}s
                                </Tag>
                              );
                            })}
                          </div>
                        );
                      }
                    } catch (e) {}
                    return null;
                  })()}
                </div>

                {/* Audio player element */}
                {resolvedLog.recordingUrl && (
                  <div className="border-t pt-2" style={{ borderColor }}>
                    <audio 
                      ref={audioRef}
                      src={resolvedLog.recordingUrl} 
                      controls 
                      className="w-full h-7 mt-1"
                      style={{ outline: 'none' }}
                    />
                  </div>
                )}
              </div>
            ) : null
          )}

          {/* Wrapup Form */}
          <Form form={noteForm} layout="vertical" onFinish={handleSaveWrapup}>
            {/* Outcome Tags */}
            <Form.Item label={<span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Kết quả cuộc gọi (Outcome)</span>}>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {availableTags.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <Tag 
                      key={tag} 
                      onClick={() => handleTagToggle(tag)}
                      className="cursor-pointer py-1 px-2.5 rounded-md text-xs font-medium transition-all"
                      style={{
                        background: isSelected ? '#D4A84B' : (isDark ? '#27272a' : '#f4f4f5'),
                        color: isSelected ? 'black' : textColor,
                        borderColor: isSelected ? '#D4A84B' : borderColor
                      }}
                    >
                      {tag}
                    </Tag>
                  );
                })}
              </div>
            </Form.Item>

            {/* Note Textarea */}
            <Form.Item 
              name="note" 
              label={<span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Ghi chú cuộc gọi</span>}
              rules={[{ required: true, message: 'Vui lòng nhập ghi chú cuộc gọi' }]}
            >
              <Input.TextArea 
                placeholder="Nhập chi tiết cuộc gọi, trạng thái khách hàng..." 
                rows={3} 
                style={{
                  background: isDark ? '#18181b' : '#ffffff',
                  color: textColor,
                  borderColor: borderColor
                }}
              />
            </Form.Item>

            {/* Callback Date */}
            <Form.Item 
              name="callbackDate" 
              label={<span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Hẹn ngày gọi lại (Nếu có)</span>}
            >
              <DatePicker 
                showTime 
                format="DD/MM/YYYY HH:mm"
                placeholder="Chọn thời gian hẹn lại"
                style={{ width: '100%', background: isDark ? '#18181b' : '#ffffff', borderColor: borderColor }}
              />
            </Form.Item>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: borderColor }}>
              <Button onClick={() => {
                setCallState('idle');
                setCurrentCall(null);
                setResolvedLog(null);
              }}>
                Bỏ qua
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={submittingWrapup}
                style={{ background: '#D4A84B', borderColor: '#D4A84B', color: 'black', fontWeight: 'bold' }}
              >
                Lưu & Đóng
              </Button>
            </div>
          </Form>
        </div>
      )}
    </div>
  );
}

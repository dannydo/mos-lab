'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  DatePicker,
  Button,
  Space,
  message,
  Divider,
  theme,
  Tag,
  ConfigProvider,
} from 'antd';
import {
  PhoneOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { apiClient } from '../lib/api-client';
import { CALL_RESULT_LABELS, CALL_OUTCOME_LABELS } from '@mos-lab/shared';
import { useTheme } from '../context/ThemeContext';
import { useOmiCall } from '../context/OmiCallContext';

const { TextArea } = Input;

interface CallLogModalProps {
  visible?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
  planId?: number | null;
  legacyUserId?: number;
  customerName?: string;
}

export default function CallLogModal({
  visible: propVisible,
  onCancel: propOnCancel,
  onSuccess: propOnSuccess,
  planId: propPlanId,
  legacyUserId: propLegacyUserId,
  customerName: propCustomerName,
}: CallLogModalProps) {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [callResult, setCallResult] = useState<string>('ANSWERED');
  const [outcome, setOutcome] = useState<string>('PENDING');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Read from OmiCall global context
  const {
    isCallLogModalOpen,
    callLogCustomerInfo,
    closeCallLogModal,
    callState,
    currentCall,
    callDuration,
    resolvedLog,
  } = useOmiCall();

  // Resolve visibility and callbacks (supports both legacy props and global context)
  const visible = propVisible !== undefined ? propVisible : isCallLogModalOpen;
  const onCancel = propOnCancel || closeCallLogModal;
  const onSuccess = propOnSuccess || (() => {});

  // Resolve target customer details
  const activeCall = currentCall || (callState === 'wrapup' ? currentCall : null);
  const customer =
    activeCall && (activeCall.legacyUserId || activeCall.name)
      ? {
          legacyUserId: activeCall.legacyUserId || 0,
          customerName: activeCall.name || 'Khách hàng',
          planId: activeCall.planId || null,
        }
      : propLegacyUserId !== undefined && propLegacyUserId > 0
        ? {
            legacyUserId: propLegacyUserId,
            customerName: propCustomerName || '',
            planId: propPlanId || null,
          }
        : callLogCustomerInfo;

  const legacyUserId =
    customer?.legacyUserId || currentCall?.legacyUserId || callLogCustomerInfo?.legacyUserId || propLegacyUserId || 0;
  const customerName =
    customer?.customerName || currentCall?.name || callLogCustomerInfo?.customerName || propCustomerName || '';
  const planId = customer?.planId || currentCall?.planId || callLogCustomerInfo?.planId || propPlanId || null;

  // 1. Initial defaults on mount
  useEffect(() => {
    if (visible) {
      form.resetFields();

      let defaultCallResult = 'ANSWERED';
      const defaultOutcome = 'PENDING';
      let defaultNote = '';

      if (activeCall) {
        const disposition = resolvedLog?.disposition;
        const duration = callDuration;

        if (disposition) {
          if (disposition === 'ANSWERED') {
            defaultCallResult = 'ANSWERED';
          } else if (disposition === 'BUSY') {
            defaultCallResult = 'BUSY';
            defaultNote = 'Máy bận';
          } else if (disposition === 'FAILED') {
            defaultCallResult = 'FAILED';
            defaultNote = 'Lỗi cuộc gọi / Không liên lạc được';
          } else {
            defaultCallResult = 'NO_ANSWER';
            defaultNote = 'Gọi nhỡ - Không trả lời';
          }
        } else {
          if (duration > 0) {
            defaultCallResult = 'ANSWERED';
          } else {
            defaultCallResult = 'NO_ANSWER';
            defaultNote = 'Gọi nhỡ - Không trả lời';
          }
        }
      }

      form.setFieldsValue({
        callResult: defaultCallResult,
        outcome: defaultOutcome,
        note: defaultNote,
      });
      setCallResult(defaultCallResult);
      setOutcome(defaultOutcome);
    }
  }, [visible, form]); // Run on open

  // 2. Update when resolvedLog is loaded, but only if they haven't been touched by user
  useEffect(() => {
    if (visible && activeCall && resolvedLog) {
      const disposition = resolvedLog.disposition;
      let newResult = 'ANSWERED';
      let newNote = '';

      if (disposition === 'ANSWERED') {
        newResult = 'ANSWERED';
      } else if (disposition === 'BUSY') {
        newResult = 'BUSY';
        newNote = 'Máy bận';
      } else if (disposition === 'FAILED') {
        newResult = 'FAILED';
        newNote = 'Lỗi cuộc gọi / Không liên lạc được';
      } else {
        newResult = 'NO_ANSWER';
        newNote = 'Gọi nhỡ - Không trả lời';
      }

      if (!form.isFieldTouched('callResult')) {
        form.setFieldsValue({ callResult: newResult });
        setCallResult(newResult);
      }
      if (newNote && !form.isFieldTouched('note') && !form.getFieldValue('note')) {
        form.setFieldsValue({ note: newNote });
      }
    }
  }, [visible, activeCall, resolvedLog, form]);

  const resolveTargetUserId = async (): Promise<number | null> => {
    if (legacyUserId && legacyUserId > 0) return legacyUserId;
    const phoneToLookup = activeCall?.phone || currentCall?.phone;
    if (phoneToLookup) {
      try {
        const found = await apiClient.customers.list({ search: phoneToLookup, limit: '1' });
        if (found?.data && found.data.length > 0) {
          return found.data[0].id;
        }
      } catch (err) {
        console.error('Lookup customer by phone failed:', err);
      }
    }
    return null;
  };

  const handleQuickAction = async (actionType: 'NO_ANSWER' | 'CALL_BACK' | 'BOOKED' | 'RENEWED') => {
    setLoading(true);
    try {
      const targetUserId = await resolveTargetUserId();
      if (!targetUserId) {
        message.error('Không tìm thấy thông tin khách hàng để lưu nhật ký. Vui lòng thử lại!');
        setLoading(false);
        return;
      }

      const data: SafeAny = {
        planId: planId || undefined,
        legacyUserId: targetUserId,
        callType: activeCall
          ? activeCall.direction === 'outbound'
            ? ('OUTBOUND' as const)
            : ('INBOUND' as const)
          : ('OUTBOUND' as const),
        durationSec: callDuration > 0 ? callDuration : resolvedLog?.duration || 0,
        omicallLogId: resolvedLog?.id || null,
        callUuid: activeCall?.callUuid || null,
      };

      if (actionType === 'NO_ANSWER') {
        data.callResult = 'NO_ANSWER';
        data.outcome = 'PENDING';
        data.note = 'Gọi nhỡ - Không trả lời';
      } else if (actionType === 'CALL_BACK') {
        data.callResult = 'ANSWERED';
        data.outcome = 'CALL_BACK';
        data.note = 'Hẹn gọi lại sau';
        // Suggest callback tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        data.callbackDate = tomorrow.toISOString().split('T')[0];
      } else if (actionType === 'BOOKED') {
        data.callResult = 'ANSWERED';
        data.outcome = 'BOOKED';
        data.note = 'Đã book lịch hẹn mới';
      } else if (actionType === 'RENEWED') {
        data.callResult = 'ANSWERED';
        data.outcome = 'RENEWED';
        data.note = 'Đã gia hạn/mua combo mới';
      }

      await apiClient.calls.create(data);
      message.success('Ghi nhận cuộc gọi nhanh thành công!');
      window.dispatchEvent(new CustomEvent('mos-call-log-saved'));
      window.dispatchEvent(new CustomEvent('mos-customer-updated'));
      window.dispatchEvent(new CustomEvent('mos-booking-updated'));
      window.dispatchEvent(new CustomEvent('mos-data-updated', { detail: { type: 'call-log' } }));
      onSuccess();
      onCancel();
    } catch (error) {
      console.error('Quick call log error:', error);
      message.error('Không thể ghi nhận cuộc gọi.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async (values: SafeAny) => {
    setLoading(true);
    try {
      const targetUserId = await resolveTargetUserId();
      if (!targetUserId) {
        message.error('Không tìm thấy thông tin khách hàng để lưu nhật ký. Vui lòng thử lại!');
        setLoading(false);
        return;
      }

      const data = {
        planId: planId || undefined,
        legacyUserId: targetUserId,
        callType: activeCall
          ? activeCall.direction === 'outbound'
            ? ('OUTBOUND' as const)
            : ('INBOUND' as const)
          : ('OUTBOUND' as const),
        callResult: values.callResult,
        outcome: values.outcome,
        note: values.note,
        durationSec: callDuration > 0 ? callDuration : resolvedLog?.duration || 0,
        callbackDate: values.callbackDate ? values.callbackDate.format('YYYY-MM-DD') : null,
        omicallLogId: resolvedLog?.id || null,
        callUuid: activeCall?.callUuid || null,
      };

      await apiClient.calls.create(data);
      message.success('Ghi nhận lịch sử cuộc gọi thành công!');
      window.dispatchEvent(new CustomEvent('mos-call-log-saved'));
      window.dispatchEvent(new CustomEvent('mos-customer-updated'));
      window.dispatchEvent(new CustomEvent('mos-booking-updated'));
      window.dispatchEvent(new CustomEvent('mos-data-updated', { detail: { type: 'call-log' } }));
      onSuccess();
      onCancel();
    } catch (error) {
      console.error('Save call log error:', error);
      message.error('Không thể ghi nhận cuộc gọi.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to format call duration to MM:SS
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isDark = themeMode === 'dark';
  const subBg = isDark ? 'rgba(24, 24, 27, 0.6)' : 'rgba(244, 244, 245, 0.6)';
  const borderColor = token.colorBorderSecondary;
  const textColor = token.colorText;
  const descColor = token.colorTextDescription;

  const isAnalyzing =
    !resolvedLog ||
    !resolvedLog.analysisStatus ||
    ['PENDING', 'PROCESSING', 'WAITING_RECORDING'].includes(resolvedLog.analysisStatus);

  return (
    <ConfigProvider theme={{ token: { zIndexPopupBase: 10000 } }}>
      <Modal
        title={
          <div style={{ color: token.colorPrimary, fontSize: '18px', fontWeight: 'bold' }}>
            <PhoneOutlined /> Ghi Nhận Cuộc Gói: <span style={{ color: token.colorText }}>{customerName}</span>
          </div>
        }
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={550}
        style={{ top: 80 }}
        zIndex={10050}
      >
        {activeCall && (
          <div
            className="mt-4 p-3 rounded-lg border text-xs flex items-center justify-between"
            style={{
              background: isDark ? 'rgba(212, 168, 75, 0.04)' : 'rgba(212, 168, 75, 0.02)',
              borderColor: isDark ? 'rgba(212, 168, 75, 0.15)' : 'rgba(212, 168, 75, 0.1)',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${callDuration > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}
              />
              <span className="font-semibold" style={{ color: textColor }}>
                {activeCall.direction === 'outbound' ? '📞 Cuộc gọi đi' : '📥 Cuộc gọi đến'}
              </span>
              <span className="text-zinc-500 font-mono">({activeCall.phone})</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-zinc-400"
                style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}
              >
                ⏱ {formatDuration(callDuration)}
              </span>
              <Tag
                color={callDuration > 0 ? 'success' : 'error'}
                className="m-0 border-0 font-bold text-[10px] uppercase"
              >
                {callDuration > 0 ? 'Đã kết nối' : 'Không bắt máy'}
              </Tag>
            </div>
          </div>
        )}

        <div className="mb-4 mt-4">
          <div style={{ color: token.colorTextDescription, marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
            GHI NHANH (1-CLICK):
          </div>
          <Space wrap>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleQuickAction('NO_ANSWER')}
              loading={loading}
            >
              Gọi Nhỡ (No Ans)
            </Button>
            <Button
              style={{ color: '#FAAD14', borderColor: '#FAAD14' }}
              ghost
              icon={<CalendarOutlined />}
              onClick={() => handleQuickAction('CALL_BACK')}
              loading={loading}
            >
              Hẹn Gọi Lại (Call Bk)
            </Button>
            <Button
              type="primary"
              style={{ background: '#52C41A', borderColor: '#52C41A', color: '#fff' }}
              icon={<CheckCircleOutlined />}
              onClick={() => handleQuickAction('BOOKED')}
              loading={loading}
            >
              Đã Book Lịch (Booked)
            </Button>
          </Space>
        </div>

        {/* Integrated OmiCall AI Analysis and CSAT Panel */}
        {activeCall && callDuration > 0 && (
          <div className="my-4">
            <Divider style={{ borderColor, margin: '15px 0' }} />
            <div
              style={{ color: token.colorTextDescription, marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}
            >
              KẾT QUẢ CUỘC GỌI OMICALL & PHÂN TÍCH AI:
            </div>

            {isAnalyzing ? (
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
            ) : resolvedLog.analysisStatus === 'DONE' ? (
              <div className="p-3.5 rounded-lg border text-xs space-y-3" style={{ background: subBg, borderColor }}>
                {/* Laughter & CSAT Score */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold" style={{ color: textColor }}>
                      Điểm hài lòng (CSAT)
                    </span>
                    <div className="flex items-center gap-0.5 mt-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className="text-base">
                          {i < (resolvedLog.customerSatisfactionScore || 0) ? '★' : '☆'}
                        </span>
                      ))}
                      <span
                        className="text-[10px] ml-1 font-bold"
                        style={{ color: descColor, fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}
                      >
                        ({resolvedLog.customerSatisfactionScore || 0}/5) - Thời lượng: {formatDuration(callDuration)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold" style={{ color: textColor }}>
                      Thái độ KH
                    </span>
                    <Tag
                      className="mt-0.5 font-bold text-[9px] px-1.5 py-0"
                      color={
                        resolvedLog.customerSentiment === 'HAPPY'
                          ? 'emerald'
                          : resolvedLog.customerSentiment === 'SATISFIED'
                            ? 'green'
                            : resolvedLog.customerSentiment === 'NEUTRAL'
                              ? 'blue'
                              : resolvedLog.customerSentiment === 'FRUSTRATED'
                                ? 'orange'
                                : resolvedLog.customerSentiment === 'ANGRY'
                                  ? 'red'
                                  : 'default'
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
                    <span>
                      👤 Khách hàng cười:{' '}
                      <strong style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}>
                        {resolvedLog.laughCountCustomer || 0}
                      </strong>{' '}
                      lần
                    </span>
                    <span>
                      🎧 Nhân viên cười:{' '}
                      <strong style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}>
                        {resolvedLog.laughCountAgent || 0}
                      </strong>{' '}
                      lần
                    </span>
                  </div>

                  {/* Click-to-seek badges */}
                  {(() => {
                    try {
                      const laughs =
                        typeof resolvedLog.laughTimestamps === 'string'
                          ? JSON.parse(resolvedLog.laughTimestamps)
                          : resolvedLog.laughTimestamps;
                      if (Array.isArray(laughs) && laughs.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {laughs.map((l: SafeAny, i: number) => {
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
                                  style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}
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
            ) : resolvedLog.analysisStatus === 'FAILED' ? (
              <div
                className="p-3 rounded-lg border text-xs flex flex-col gap-1 items-center justify-center text-zinc-400 text-center"
                style={{ background: subBg, borderColor }}
              >
                <span>⚠️ Không thể tự động phân tích cuộc gọi này.</span>
                {resolvedLog.analysisError && (
                  <span className="text-[10px] opacity-75">{resolvedLog.analysisError}</span>
                )}
              </div>
            ) : null}
          </div>
        )}

        <Divider style={{ borderColor, margin: '15px 0' }} />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{
            callResult: 'ANSWERED',
            outcome: 'PENDING',
          }}
        >
          <Form.Item
            name="callResult"
            label={<span style={{ color: token.colorTextSecondary }}>Kết quả cuộc gọi</span>}
            rules={[{ required: true }]}
          >
            <Select
              onChange={(val) => {
                setCallResult(val);
                if (val !== 'ANSWERED') {
                  form.setFieldsValue({ outcome: 'PENDING' });
                  setOutcome('PENDING');
                }
              }}
              options={Object.entries(CALL_RESULT_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>

          {callResult === 'ANSWERED' && (
            <Form.Item
              name="outcome"
              label={<span style={{ color: token.colorTextSecondary }}>Kết quả chi tiết</span>}
              rules={[{ required: true }]}
            >
              <Select
                onChange={(val) => setOutcome(val)}
                options={Object.entries(CALL_OUTCOME_LABELS)
                  .filter(([k]) => k !== 'RENEWED')
                  .map(([k, v]) => ({ value: k, label: v }))}
              />
            </Form.Item>
          )}

          {callResult === 'ANSWERED' && outcome === 'CALL_BACK' && (
            <Form.Item
              name="callbackDate"
              label={<span style={{ color: token.colorTextSecondary }}>Ngày hẹn gọi lại</span>}
              rules={[{ required: true, message: 'Vui lòng chọn ngày hẹn gọi lại' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
          )}

          <Form.Item
            name="note"
            label={
              <div className="flex justify-between items-center w-full">
                <span style={{ color: token.colorTextSecondary }}>Ghi chú cuộc gọi</span>
                {resolvedLog?.satisfactionAnalysis && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      const currentNote = form.getFieldValue('note') || '';
                      const prefix = currentNote ? `${currentNote}\n` : '';
                      form.setFieldValue('note', `${prefix}${resolvedLog.satisfactionAnalysis}`);
                    }}
                    className="p-0 h-auto text-[11.5px] font-medium"
                    style={{ color: '#D4A84B' }}
                  >
                    📋 Áp dụng phân tích AI làm ghi chú
                  </Button>
                )}
              </div>
            }
          >
            <TextArea rows={4} placeholder="Nhập ghi chú chi tiết về cuộc hội thoại..." />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={onCancel}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{ background: token.colorPrimary, borderColor: token.colorPrimary, color: '#000' }}
              >
                Lưu Nhật Ký
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  );
}

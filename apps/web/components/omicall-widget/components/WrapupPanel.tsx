import React, { useRef } from 'react';
import { Button, Input, DatePicker, Tag, Form, Space } from 'antd';
import { SyncOutlined } from '@ant-design/icons';

interface WrapupPanelProps {
  currentCall: SafeAny;
  callDuration: number;
  resolvedLog: SafeAny;
  submittingWrapup: boolean;
  availableTags: string[];
  selectedTags: string[];
  handleTagToggle: (tag: string) => void;
  handleSaveWrapup: () => Promise<void>;
  noteForm: SafeAny;
  isDark: boolean;
  textColor: string;
  descColor: string;
  borderColor: string;
  subBg: string;
  setCallState: (state: SafeAny) => void;
  setCurrentCall: (call: SafeAny) => void;
  setResolvedLog: (log: SafeAny) => void;
  formatDuration: (secs: number) => string;
}

export const WrapupPanel: React.FC<WrapupPanelProps> = ({
  currentCall,
  callDuration,
  resolvedLog,
  submittingWrapup,
  availableTags,
  selectedTags,
  handleTagToggle,
  handleSaveWrapup,
  noteForm,
  isDark,
  textColor,
  descColor,
  borderColor,
  subBg,
  setCallState,
  setCurrentCall,
  setResolvedLog,
  formatDuration,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  return (
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
      {callDuration > 0 &&
        (!resolvedLog ? (
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
                  <span className="text-[10px] ml-1 font-bold" style={{ color: descColor }}>
                    ({resolvedLog.customerSatisfactionScore || 0}/5)
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
                  👤 Khách hàng cười: <strong>{resolvedLog.laughCountCustomer || 0}</strong> lần
                </span>
                <span>
                  🎧 Nhân viên cười: <strong>{resolvedLog.laughCountAgent || 0}</strong> lần
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
        ) : null)}

      {/* Wrapup Form */}
      <Form form={noteForm} layout="vertical" onFinish={handleSaveWrapup}>
        {/* Outcome Tags */}
        <Form.Item
          label={
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Kết quả cuộc gọi (Outcome)</span>
          }
        >
          <div className="flex flex-wrap gap-1.5 mt-1">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <Tag
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className="cursor-pointer py-1 px-2.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: isSelected ? '#D4A84B' : isDark ? '#27272a' : '#f4f4f5',
                    color: isSelected ? 'black' : textColor,
                    borderColor: isSelected ? '#D4A84B' : borderColor,
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
              borderColor: borderColor,
            }}
          />
        </Form.Item>

        {/* Callback Date */}
        <Form.Item
          name="callbackDate"
          label={
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Hẹn ngày gọi lại (Nếu có)</span>
          }
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
          <Button
            onClick={() => {
              setCallState('idle');
              setCurrentCall(null);
              setResolvedLog(null);
            }}
          >
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
  );
};
export default WrapupPanel;

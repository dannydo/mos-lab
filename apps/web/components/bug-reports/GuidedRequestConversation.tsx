'use client';

import * as React from 'react';
import { Alert, Button, Input, Space, Tag } from 'antd';
import type { BugReportRequestType, RequestConversation, RequestConversationSummary } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';

function summaryText(summary: RequestConversationSummary): string {
  const labels: Array<[keyof Omit<RequestConversationSummary, 'requestType'>, string]> =
    summary.requestType === 'FEATURE'
      ? [
          ['userOrAudience', 'Người dùng'],
          ['problem', 'Vấn đề'],
          ['desiredOutcome', 'Kết quả mong muốn'],
          ['currentWorkaround', 'Cách làm hiện tại'],
          ['priorityOrImpact', 'Ưu tiên/tác động'],
          ['constraints', 'Ràng buộc'],
        ]
      : [
          ['whereItHappened', 'Ở đâu'],
          ['userAction', 'Đã làm gì'],
          ['observedResult', 'Đã xảy ra'],
          ['expectedResult', 'Mong đợi'],
          ['impact', 'Tác động'],
        ];
  return labels
    .filter(([key]) => summary[key])
    .map(([key, label]) => `${label}: ${summary[key]}`)
    .join('\n');
}
const manualHint = (type: BugReportRequestType) =>
  type === 'FEATURE'
    ? 'Gợi ý: ai cần việc này, đang vướng gì, kết quả mong muốn, cách làm tạm và ràng buộc.'
    : 'Gợi ý: ở màn nào, đã bấm/làm gì, điều gì xảy ra, mong đợi gì và ảnh hưởng ra sao.';

export function GuidedRequestConversation({
  description,
  requestType,
  path,
  pageTitle,
  attachmentCount,
  onApply,
  onTypeRecommendation,
  onSession,
}: {
  description: string;
  requestType: BugReportRequestType;
  path: string;
  pageTitle: string;
  attachmentCount: number;
  onApply: (value: string) => void;
  onTypeRecommendation: (value: BugReportRequestType) => void;
  onSession: (id: string | null) => void;
}) {
  const [conversation, setConversation] = React.useState<RequestConversation | null>(null);
  const [answer, setAnswer] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [fallback, setFallback] = React.useState<string | null>(null);
  const poll = React.useCallback(async (id: string) => {
    try {
      const value = await apiClient.bugReports.conversationStatus(id);
      setConversation(value);
      return value;
    } catch {
      setFallback('AI đang chậm hoặc không kết nối được. Bạn vẫn có thể tự nhập và gửi ngay.');
      return null;
    }
  }, []);
  React.useEffect(() => {
    if (!conversation || !['PENDING', 'LEASED'].includes(conversation.status)) return;
    const timer = window.setTimeout(() => void poll(conversation.id), 1200);
    return () => window.clearTimeout(timer);
  }, [conversation, poll]);
  const start = async () => {
    if (description.trim().length < 3) {
      setFallback('Hãy viết vài từ đầu tiên, rồi mOS sẽ hỏi từng câu ngắn.');
      return;
    }
    if (!navigator.onLine) {
      setFallback('Bạn đang offline. ' + manualHint(requestType));
      return;
    }
    setBusy(true);
    setFallback(null);
    try {
      const response = await apiClient.bugReports.createConversation({
        description: description.trim(),
        preferredRequestType: requestType,
        context: { path, pageTitle },
        attachmentCount,
      });
      if (!response.data) throw new Error();
      setConversation(response.data);
      onSession(response.data.id);
    } catch {
      setFallback('Không thể bắt đầu hội thoại lúc này. ' + manualHint(requestType));
    } finally {
      setBusy(false);
    }
  };
  const reply = async (message: string) => {
    if (!conversation || !message.trim()) return;
    setBusy(true);
    try {
      const response = await apiClient.bugReports.replyConversation(conversation.id, { message: message.trim() });
      if (response.data) {
        setConversation(response.data);
        setAnswer('');
      }
    } catch {
      setFallback('Không thể gửi câu trả lời. Bạn có thể tiếp tục điền thủ công.');
    } finally {
      setBusy(false);
    }
  };
  const isReady = conversation?.status === 'READY';
  return (
    <div className="space-y-3 rounded-xl border p-3" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong>Chưa biết mô tả thế nào?</strong>
          <div className="text-xs text-slate-500">mOS hỏi từng câu ngắn, bạn có thể bỏ qua hoặc sửa tóm tắt.</div>
        </div>
        {conversation ? (
          <Tag color={isReady ? 'green' : 'blue'}>{isReady ? 'Tóm tắt sẵn sàng' : 'Đang làm rõ'}</Tag>
        ) : (
          <Button size="small" onClick={() => void start()} loading={busy}>
            Mô tả cùng AI
          </Button>
        )}
      </div>
      {fallback ? (
        <Alert type="warning" showIcon message="Bạn vẫn gửi được theo cách thủ công" description={fallback} />
      ) : null}
      {conversation?.status === 'PENDING' || conversation?.status === 'LEASED' ? (
        <Alert type="info" showIcon message="mOS đang chuẩn bị câu hỏi tiếp theo…" />
      ) : null}
      {conversation?.status === 'WAITING_REPORTER' && conversation.nextQuestion ? (
        <div className="space-y-2">
          <Alert type="info" showIcon message={conversation.nextQuestion} />
          <Input.TextArea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={2}
            maxLength={1200}
            placeholder="Trả lời ngắn theo cách bạn biết"
          />
          <Space>
            <Button type="primary" size="small" loading={busy} onClick={() => void reply(answer)}>
              Tiếp tục
            </Button>
            <Button
              size="small"
              disabled={busy}
              onClick={() => void reply('Bỏ qua câu này, tiếp tục với thông tin hiện có.')}
            >
              Bỏ qua
            </Button>
          </Space>
        </div>
      ) : null}
      {isReady && conversation ? (
        <div className="space-y-2">
          <Alert
            type="success"
            showIcon
            message="Tóm tắt có thể sửa trước khi gửi"
            description={
              <Input.TextArea
                value={summaryText(conversation.summary)}
                rows={6}
                onChange={(event) => onApply(event.target.value)}
              />
            }
          />
          <Space>
            <Button size="small" onClick={() => onTypeRecommendation(conversation.summary.requestType)}>
              Dùng loại {conversation.summary.requestType === 'FEATURE' ? 'chức năng' : 'báo lỗi'} gợi ý
            </Button>
            <Button type="primary" size="small" onClick={() => onApply(summaryText(conversation.summary))}>
              Dùng tóm tắt
            </Button>
          </Space>
        </div>
      ) : null}
    </div>
  );
}

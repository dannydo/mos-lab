'use client';

import React from 'react';
import { Alert, Avatar, Button, Image, Input, Tag, Typography, Upload, message, theme } from 'antd';
import type {
  BugReportClarification,
  BugReportComment,
  BugReportCommentCreateResult,
  BugReportRequestType,
  BugReportStatus,
  CreateBugReportAttachmentRequest,
  CreateBugReportCommentRequest,
} from '@mos-lab/shared';
import dayjs from 'dayjs';
import { Bot, ImagePlus, Send, X } from 'lucide-react';
import { compressImageForUpload, fileDataBase64 } from '../../lib/image-utils';
import { AppIcon, StatePanel } from '../ui';
import { BugReportAttachmentPreview } from './BugReportAttachmentPreview';

const { Text, Paragraph } = Typography;
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

const CLARIFICATION_COPY: Record<
  BugReportClarification['status'],
  { type: 'info' | 'warning' | 'success'; title: string; description: string }
> = {
  PENDING_AGENT: {
    type: 'info',
    title: 'AI đang đối chiếu biz logic',
    description: 'Agent sẽ tìm rule và source liên quan trước. Nếu vẫn thiếu dữ kiện, Agent sẽ hỏi ngay tại đây.',
  },
  WAITING_REPORTER: {
    type: 'warning',
    title: 'Cần bạn trả lời thêm',
    description: 'Ticket chưa được phép sửa cho đến khi câu hỏi bên dưới được trả lời và Agent xác nhận đã đủ rõ.',
  },
  READY: {
    type: 'success',
    title: 'Đã đủ thông tin để triage',
    description: 'Biz logic hoặc kết quả đúng đã được đối chiếu. Danny có thể duyệt ticket vào hàng sửa lỗi.',
  },
};

const FEATURE_CLARIFICATION_COPY: typeof CLARIFICATION_COPY = {
  PENDING_AGENT: {
    type: 'info',
    title: 'AI đang phân tích nhu cầu',
    description: 'Agent sẽ làm rõ người dùng, vấn đề, phạm vi và kết quả mong muốn trước khi trình Danny duyệt.',
  },
  WAITING_REPORTER: {
    type: 'warning',
    title: 'Cần bạn trả lời thêm',
    description: 'Yêu cầu chưa được trình Danny cho đến khi bạn trả lời và Agent xác nhận đã đủ rõ.',
  },
  READY: {
    type: 'success',
    title: 'Yêu cầu đã đủ rõ để Danny quyết định',
    description: 'Danny sẽ là người duyệt cuối cùng có đưa chức năng này vào hàng triển khai hay không.',
  },
};

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function CommentFileThumbnail({ file }: { file: File }) {
  const [url, setUrl] = React.useState('');

  React.useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return url ? (
    <Image src={url} alt={`Ảnh chờ gửi ${file.name}`} width={48} height={48} style={{ objectFit: 'cover' }} />
  ) : (
    <span className="h-12 w-12" />
  );
}

export function BugReportConversation({
  reportId,
  requestType,
  status,
  clarification,
  comments,
  onSubmit,
  readOnly = false,
}: {
  reportId: number;
  requestType: BugReportRequestType;
  status: BugReportStatus;
  clarification: BugReportClarification;
  comments: BugReportComment[];
  onSubmit: (request: CreateBugReportCommentRequest) => Promise<BugReportCommentCreateResult>;
  readOnly?: boolean;
}) {
  const { token } = theme.useToken();
  const [messageApi, messageContext] = message.useMessage();
  const [body, setBody] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [processing, setProcessing] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const clarificationCopy = (requestType === 'FEATURE' ? FEATURE_CLARIFICATION_COPY : CLARIFICATION_COPY)[
    clarification.status
  ];
  const locked = ['CLOSED', 'REJECTED', 'DUPLICATE'].includes(status);
  const isReadOnly = readOnly || locked;

  const addFiles = React.useCallback(
    async (selected: File[]) => {
      const available = Math.max(0, MAX_ATTACHMENTS - files.length);
      if (!available) {
        messageApi.warning('Mỗi bình luận nhận tối đa 3 ảnh.');
        return;
      }
      setProcessing(true);
      const next: File[] = [];
      try {
        for (const file of selected.slice(0, available)) {
          try {
            next.push(await compressImageForUpload(file, { maxBytes: MAX_ATTACHMENT_BYTES }));
          } catch (error) {
            messageApi.error(error instanceof Error ? error.message : 'Không thể xử lý ảnh.');
          }
        }
        if (next.length) setFiles((current) => [...current, ...next].slice(0, MAX_ATTACHMENTS));
        if (selected.length > available) messageApi.warning('Chỉ 3 ảnh đầu tiên được giữ lại.');
      } finally {
        setProcessing(false);
      }
    },
    [files.length, messageApi]
  );

  const submit = async () => {
    if (!body.trim() && !files.length) return;
    setSending(true);
    try {
      const attachments: CreateBugReportAttachmentRequest[] = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          mimeType: file.type as CreateBugReportAttachmentRequest['mimeType'],
          sizeBytes: file.size,
          dataBase64: await fileDataBase64(file),
        }))
      );
      const result = await onSubmit({ body: body.trim() || null, attachments });
      setBody('');
      setFiles([]);
      messageApi.success('Đã gửi bình luận.');
      result.attachmentWarnings.forEach((warning) => messageApi.warning(warning));
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(responseMessage || (error instanceof Error ? error.message : 'Không thể gửi bình luận.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="space-y-4"
      onPaste={(event) => {
        if (isReadOnly) return;
        const pasted = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'));
        if (pasted.length) {
          event.preventDefault();
          void addFiles(pasted);
        }
      }}
    >
      {messageContext}
      <Alert
        type={clarificationCopy.type}
        showIcon
        message={clarificationCopy.title}
        description={clarification.summary || clarificationCopy.description}
      />

      {comments.length ? (
        <div className="space-y-3" aria-label="Hội thoại làm rõ yêu cầu">
          {comments.map((comment) => {
            const isAgent = comment.authorType === 'AGENT';
            const authorName = isAgent ? 'AI Agent' : comment.author?.displayName || 'Nhân viên';
            return (
              <article
                key={comment.id}
                className="rounded-xl border p-3"
                style={{
                  borderColor: isAgent ? token.colorPrimaryBorder : token.colorBorderSecondary,
                  background: isAgent ? token.colorPrimaryBg : token.colorFillQuaternary,
                }}
              >
                <div className="mb-2 flex items-start gap-2">
                  <Avatar size={32} src={comment.author?.avatarUrl || undefined}>
                    {isAgent ? <AppIcon icon={Bot} size="sm" /> : initials(authorName)}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text strong>{authorName}</Text>
                      {comment.kind === 'CLARIFICATION_QUESTION' ? <Tag color="gold">Câu hỏi làm rõ</Tag> : null}
                      {comment.kind === 'CLARIFICATION_REVIEW' ? <Tag color="green">Đã đối chiếu biz logic</Tag> : null}
                    </div>
                    <Text type="secondary" className="text-xs tabular-nums">
                      {dayjs(comment.createdAt).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </div>
                </div>
                {comment.body ? (
                  <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{comment.body}</Paragraph>
                ) : null}
                {comment.attachments.some((item) => !item.deletedAt) ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {comment.attachments
                      .filter((item) => !item.deletedAt)
                      .map((attachment) => (
                        <BugReportAttachmentPreview
                          key={attachment.id}
                          reportId={reportId}
                          attachment={attachment}
                          compact
                        />
                      ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <StatePanel
          kind="empty"
          title="Chưa có trao đổi"
          description={
            requestType === 'FEATURE'
              ? 'Agent sẽ hỏi tại đây nếu nhu cầu, phạm vi hoặc kết quả mong muốn chưa đủ rõ.'
              : 'Agent sẽ hỏi tại đây nếu mô tả hoặc biz logic chưa đủ rõ.'
          }
        />
      )}

      {isReadOnly ? (
        <Text type="secondary">
          {locked ? 'Ticket đã kết thúc; hội thoại đang ở chế độ chỉ đọc.' : 'mOS Inbox chỉ phục vụ theo dõi.'}
        </Text>
      ) : (
        <div className="rounded-xl border p-3" style={{ borderColor: token.colorBorderSecondary }}>
          <Input.TextArea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={
              clarification.status === 'WAITING_REPORTER'
                ? 'Trả lời câu hỏi của Agent; có thể dán ảnh trực tiếp vào đây…'
                : 'Bổ sung chi tiết hoặc bằng chứng; có thể dán ảnh trực tiếp…'
            }
            maxLength={2000}
            autoSize={{ minRows: 2, maxRows: 6 }}
            showCount
            disabled={sending}
          />

          {files.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex max-w-full items-center gap-2 rounded-lg border p-1.5"
                  style={{ borderColor: token.colorBorderSecondary }}
                >
                  <CommentFileThumbnail file={file} />
                  <Text ellipsis title={file.name} className="max-w-32 text-xs">
                    {file.name}
                  </Text>
                  <Button
                    type="text"
                    size="small"
                    aria-label={`Xóa ảnh ${file.name}`}
                    icon={<AppIcon icon={X} size="sm" />}
                    onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Upload
              accept="image/jpeg,image/png,image/webp"
              multiple
              showUploadList={false}
              disabled={processing || sending || files.length >= MAX_ATTACHMENTS}
              beforeUpload={(file, selected) => {
                if (file.uid === selected[0]?.uid) void addFiles(selected as File[]);
                return Upload.LIST_IGNORE;
              }}
            >
              <Button icon={<AppIcon icon={ImagePlus} size="sm" />} loading={processing}>
                Thêm ảnh
              </Button>
            </Upload>
            <Button
              type="primary"
              icon={<AppIcon icon={Send} size="sm" />}
              loading={sending}
              disabled={processing || (!body.trim() && !files.length)}
              onClick={() => void submit()}
            >
              Gửi bình luận
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

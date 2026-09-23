'use client';

import React from 'react';
import { Alert, Button, Checkbox, Image, Input, Modal, Typography, message, theme } from 'antd';
import type { CreateBugReportAttachmentRequest } from '@mos-lab/shared';
import { BUG_REPORT_MAX_ATTACHMENTS, BUG_REPORT_MAX_ATTACHMENT_BYTES } from '@mos-lab/shared';
import { AlertCircle, ImagePlus, RotateCcw, UploadCloud, X } from 'lucide-react';
import { compressImageForUpload, fileDataBase64 } from '../../lib/image-utils';
import { AppIcon } from '../ui';

const { Text } = Typography;

const MAX_ATTACHMENTS = BUG_REPORT_MAX_ATTACHMENTS ?? 10;
const MAX_ATTACHMENT_BYTES = BUG_REPORT_MAX_ATTACHMENT_BYTES ?? 5 * 1024 * 1024;

export interface BugReportRejectionModalProps {
  open: boolean;
  reportKey: string;
  reportTitle?: string;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (data: {
    note?: string;
    reopenIntent: 'UNCHANGED' | 'DETAILS';
    attachments: CreateBugReportAttachmentRequest[];
  }) => Promise<void>;
}

export function BugReportRejectionModal({
  open,
  reportKey,
  reportTitle,
  submitting,
  onCancel,
  onSubmit,
}: BugReportRejectionModalProps) {
  const { token } = theme.useToken();
  const [messageApi, contextHolder] = message.useMessage();

  const [note, setNote] = React.useState('');
  const [unchanged, setUnchanged] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [processing, setProcessing] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset form when modal closes or opens
  React.useEffect(() => {
    if (open) {
      setNote('');
      setUnchanged(false);
      setFiles([]);
      setProcessing(false);
      setIsDragging(false);
    }
  }, [open]);

  const handleAddFiles = React.useCallback(
    async (selected: File[]) => {
      const imageFiles = selected.filter((file) => file.type.startsWith('image/'));
      if (!imageFiles.length) {
        messageApi.warning('Vui lòng chỉ chọn tệp hình ảnh (PNG, JPG, WebP...).');
        return;
      }
      const available = Math.max(0, MAX_ATTACHMENTS - files.length);
      if (!available) {
        messageApi.warning(`Mỗi phản hồi nhận tối đa ${MAX_ATTACHMENTS} ảnh minh họa.`);
        return;
      }
      setProcessing(true);
      const next: File[] = [];
      try {
        for (const file of imageFiles.slice(0, available)) {
          try {
            next.push(await compressImageForUpload(file, { maxBytes: MAX_ATTACHMENT_BYTES }));
          } catch (error) {
            messageApi.error(error instanceof Error ? error.message : 'Không thể xử lý ảnh.');
          }
        }
        if (next.length) setFiles((current) => [...current, ...next].slice(0, MAX_ATTACHMENTS));
        if (imageFiles.length > available) messageApi.warning(`Chỉ ${available} ảnh đầu tiên được giữ lại.`);
      } finally {
        setProcessing(false);
      }
    },
    [files.length, messageApi]
  );

  const handleRemoveFile = (index: number) => {
    setFiles((current) => current.filter((_, i) => i !== index));
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length) {
      e.preventDefault();
      await handleAddFiles(pastedFiles);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      await handleAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleSubmit = async () => {
    if (!unchanged && !note.trim() && !files.length) {
      messageApi.warning('Vui lòng mô tả cụ thể điểm chưa đúng hoặc đính kèm ảnh để Agent sửa lại.');
      return;
    }
    setProcessing(true);
    try {
      const attachments: CreateBugReportAttachmentRequest[] = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          mimeType: file.type as CreateBugReportAttachmentRequest['mimeType'],
          sizeBytes: file.size,
          dataBase64: await fileDataBase64(file),
        }))
      );
      await onSubmit({
        note: unchanged ? undefined : note.trim() || undefined,
        reopenIntent: unchanged ? 'UNCHANGED' : 'DETAILS',
        attachments,
      });
    } finally {
      setProcessing(false);
    }
  };

  // Create preview URLs for thumbnails
  const previewUrls = React.useMemo(() => {
    return files.map((file) => URL.createObjectURL(file));
  }, [files]);

  // Clean up object URLs on unmount or when files change
  React.useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <div className="flex items-center gap-2 text-base font-semibold">
          <AppIcon icon={AlertCircle} className="text-amber-500" size={20} />
          <span>Phản hồi điểm chưa đúng — {reportKey}</span>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={submitting || processing}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          danger
          loading={submitting || processing}
          icon={<AppIcon icon={RotateCcw} size="sm" />}
          onClick={() => void handleSubmit()}
        >
          Gửi phản hồi & Yêu cầu sửa lại
        </Button>,
      ]}
      width={600}
      zIndex={12050}
      destroyOnHidden
    >
      {contextHolder}
      <div className="space-y-4 py-2" onPaste={handlePaste}>
        {reportTitle ? (
          <div
            className="rounded-lg p-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400"
            style={{ background: token.colorFillQuaternary, border: `1px solid ${token.colorBorderSecondary}` }}
          >
            <span className="font-semibold text-slate-700 dark:text-slate-300">Yêu cầu: </span>
            {reportTitle}
          </div>
        ) : null}

        <Alert
          type="warning"
          showIcon
          message="Hướng dẫn phản hồi nghiệm thu"
          description="Để Agent sửa chính xác ngay lần này, bạn hãy nêu rõ điểm chưa đạt hoặc dán ảnh chụp màn hình (screenshot) vị trí xảy ra lỗi."
          className="text-xs"
        />

        <div className="rounded-lg border p-3" style={{ borderColor: token.colorBorderSecondary }}>
          <Checkbox
            checked={unchanged}
            onChange={(e) => setUnchanged(e.target.checked)}
            className="select-none font-medium text-slate-700 dark:text-slate-300"
          >
            Triệu chứng vẫn hoàn toàn như cũ ban đầu (không cần giải thích thêm)
          </Checkbox>
          <div className="mt-1 pl-6 text-xs text-slate-500">
            Chọn mục này nếu vấn đề chưa có bất kỳ thay đổi nào và không cần bổ sung thông tin mới.
          </div>
        </div>

        {!unchanged ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <Text strong className="text-xs">
                  Mô tả điểm chưa đúng hoặc hành vi thực tế trên máy bạn:
                </Text>
                <Text type="secondary" className="text-xs">
                  (Dán ảnh bằng Cmd+V / Ctrl+V)
                </Text>
              </div>
              <Input.TextArea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Em bấm vào tạo game mới thì không có ô chọn Booking Channel GB như yêu cầu, hoặc chọn xong nhưng bảng điểm không cộng đúng..."
                maxLength={2000}
                showCount
                disabled={submitting || processing}
                className="text-sm"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Text strong className="text-xs">
                  Hình ảnh minh họa ({files.length}/{MAX_ATTACHMENTS}):
                </Text>
                {files.length < MAX_ATTACHMENTS ? (
                  <Button
                    size="small"
                    type="dashed"
                    icon={<AppIcon icon={ImagePlus} size="sm" />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting || processing}
                  >
                    Thêm ảnh
                  </Button>
                ) : null}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    void handleAddFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }
                }}
              />

              {files.length === 0 ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                    isDragging
                      ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20'
                      : 'hover:border-amber-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
                  style={{ borderColor: isDragging ? token.colorWarning : token.colorBorderSecondary }}
                >
                  <AppIcon icon={UploadCloud} size={32} className="mb-2 text-slate-400" />
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Bấm để chọn ảnh, kéo thả ảnh vào đây, hoặc nhấn{' '}
                    <kbd className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-semibold dark:bg-slate-800">
                      Cmd+V
                    </kbd>{' '}
                    để dán ảnh
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Hỗ trợ PNG, JPG, WebP tối đa 5MB mỗi ảnh (tối đa {MAX_ATTACHMENTS} ảnh)
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Image.PreviewGroup
                    preview={{
                      zIndex: 12030,
                      countRender: (current: number, total: number) => (
                        <span className="tabular-nums font-semibold tracking-wide">
                          {current} / {total}
                        </span>
                      ),
                    }}
                  >
                    <div className="grid grid-cols-3 gap-3">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="group relative overflow-hidden rounded-xl border bg-slate-50 dark:bg-slate-900"
                          style={{ borderColor: token.colorBorderSecondary }}
                        >
                          <div className="aspect-video w-full overflow-hidden">
                            <Image
                              src={previewUrls[index]}
                              alt={file.name}
                              className="h-full w-full object-cover"
                              preview={{ mask: 'Xem phóng to' }}
                            />
                          </div>
                          <div className="truncate p-1.5 text-[11px] text-slate-600 dark:text-slate-400">{file.name}</div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-white transition-opacity hover:bg-red-600"
                            title="Xóa ảnh này"
                          >
                            <AppIcon icon={X} size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </Image.PreviewGroup>
                  {files.length < MAX_ATTACHMENTS ? (
                    <div className="text-right">
                      <Button
                        size="small"
                        type="link"
                        icon={<AppIcon icon={ImagePlus} size="sm" />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Thêm ảnh khác ({files.length}/{MAX_ATTACHMENTS})
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

'use client';

import React from 'react';
import { Button, Image, Input, Upload, message, theme } from 'antd';
import { ImagePlus, MessageSquareWarning, Send, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { BugReportClientError, BugReportContext, CreateBugReportAttachmentRequest } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { captureBugReportContext, OPEN_BUG_REPORT_EVENT, recordClientError } from '../../lib/bug-diagnostics';
import { compressImageForUpload, fileDataBase64 } from '../../lib/image-utils';
import { safeStorage } from '../../lib/safe-storage';
import { AdaptiveModal, AdaptiveOverlayFooter, AppIcon, IconText } from '../ui';

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

type ReleaseMarker = { deployedAt: string | null; commitSha: string | null };

function BugReportFileThumbnail({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = React.useState('');

  React.useEffect(() => {
    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  if (!previewUrl) {
    return (
      <span aria-label={`Đang tạo ảnh xem trước ${file.name}`} className="h-[52px] w-[52px] shrink-0 rounded-md" />
    );
  }

  return (
    <Image
      alt={`Ảnh xem trước ${file.name}`}
      src={previewUrl}
      width={52}
      height={52}
      style={{ borderRadius: 6, objectFit: 'cover' }}
      preview={{ zIndex: 12030 }}
    />
  );
}

export function BugReportSurface() {
  const pathname = usePathname();
  const { token } = theme.useToken();
  const [open, setOpen] = React.useState(false);
  const [description, setDescription] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [processingImages, setProcessingImages] = React.useState(false);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [release, setRelease] = React.useState<ReleaseMarker | null>(null);
  const [context, setContext] = React.useState<BugReportContext | null>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  const enabled = authenticated && pathname.startsWith('/dashboard');

  React.useEffect(() => {
    setAuthenticated(Boolean(safeStorage.getItem('mos_token')));
  }, [pathname]);

  React.useEffect(() => {
    if (!enabled) return;
    apiClient.release
      .get()
      .then(setRelease)
      .catch(() => setRelease(null));
  }, [enabled]);

  React.useEffect(() => {
    if (!enabled) return;
    const onError = (event: ErrorEvent) => recordClientError(event.error || event.message);
    const onUnhandledRejection = (event: PromiseRejectionEvent) => recordClientError(event.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, [enabled]);

  const showReporter = React.useCallback(
    (errorBoundary?: BugReportClientError | null) => {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setContext(captureBugReportContext(release, errorBoundary));
      setOpen(true);
    },
    [release]
  );

  React.useEffect(() => {
    if (!enabled) return;
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ errorBoundary?: BugReportClientError }>).detail;
      showReporter(detail?.errorBoundary || null);
    };
    window.addEventListener(OPEN_BUG_REPORT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_BUG_REPORT_EVENT, onOpen);
  }, [enabled, showReporter]);

  const closeReporter = React.useCallback(() => {
    if (submitting) return;
    setOpen(false);
    window.setTimeout(() => previousFocusRef.current?.focus?.(), 0);
  }, [submitting]);

  const addFiles = React.useCallback(
    async (selected: File[]) => {
      const available = Math.max(0, MAX_ATTACHMENTS - files.length);
      if (!available) {
        message.warning('Mỗi báo lỗi nhận tối đa 3 ảnh.');
        return;
      }
      setProcessingImages(true);
      const next: File[] = [];
      try {
        for (const file of selected.slice(0, available)) {
          try {
            next.push(await compressImageForUpload(file, { maxBytes: MAX_ATTACHMENT_BYTES }));
          } catch (error) {
            message.error(error instanceof Error ? error.message : 'Không thể xử lý ảnh.');
          }
        }
        if (next.length) setFiles((current) => [...current, ...next].slice(0, MAX_ATTACHMENTS));
        if (selected.length > available) message.warning('Chỉ 3 ảnh đầu tiên được giữ lại.');
      } finally {
        setProcessingImages(false);
      }
    },
    [files.length]
  );

  const submit = async () => {
    const normalizedDescription = description.trim();
    if (normalizedDescription.length < 3 || !context) return;
    setSubmitting(true);
    try {
      const attachments: CreateBugReportAttachmentRequest[] = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          mimeType: file.type as CreateBugReportAttachmentRequest['mimeType'],
          sizeBytes: file.size,
          dataBase64: await fileDataBase64(file),
        }))
      );
      const response = await apiClient.bugReports.create({
        description: normalizedDescription,
        context,
        attachments,
      });
      const result = response.data;
      if (!result) throw new Error('Server không trả mã ticket.');
      message.success(`Đã ghi nhận ${result.key}. Cảm ơn bạn!`);
      result.attachmentWarnings.forEach((warning) => message.warning(warning));
      setDescription('');
      setFiles([]);
      setContext(null);
      setOpen(false);
      window.setTimeout(() => previousFocusRef.current?.focus?.(), 0);
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || 'Không thể gửi báo lỗi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!enabled) return null;

  return (
    <>
      <Button
        type="primary"
        aria-label="Báo lỗi mOS"
        title="Báo lỗi mOS"
        data-bug-report-launcher
        onClick={() => showReporter(null)}
        icon={<AppIcon icon={MessageSquareWarning} size="sm" />}
        style={{
          position: 'fixed',
          left: 'max(12px, env(safe-area-inset-left))',
          bottom: 'max(14px, env(safe-area-inset-bottom))',
          zIndex: 12000,
          height: 40,
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowSecondary,
        }}
      >
        Báo lỗi
      </Button>

      <AdaptiveModal
        intent="form"
        title="Báo lỗi mOS"
        open={open}
        onCancel={closeReporter}
        maskClosable={false}
        keyboard={!submitting}
        zIndex={12010}
        destroyOnHidden
        footer={
          <AdaptiveOverlayFooter>
            <Button onClick={closeReporter} disabled={submitting}>
              Hủy
            </Button>
            <Button
              type="primary"
              loading={submitting}
              disabled={description.trim().length < 3 || processingImages}
              onClick={() => void submit()}
            >
              <IconText icon={<AppIcon icon={Send} size="sm" />}>Gửi báo lỗi</IconText>
            </Button>
          </AdaptiveOverlayFooter>
        }
      >
        <div
          className="space-y-5"
          onPaste={(event) => {
            const pasted = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'));
            if (pasted.length) {
              event.preventDefault();
              void addFiles(pasted);
            }
          }}
        >
          <div>
            <label htmlFor="mos-bug-description" className="mb-2 block text-sm font-semibold">
              Bạn đang gặp vấn đề gì?
            </label>
            <Input.TextArea
              id="mos-bug-description"
              autoFocus
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              showCount
              rows={5}
              placeholder="Ví dụ: Tôi bấm Lưu nhưng popup vẫn đứng yên…"
            />
            <p className="mb-0 mt-6 text-xs" style={{ color: token.colorTextSecondary }}>
              mOS tự đính kèm trang, popup, phiên bản và lỗi kỹ thuật gần nhất. Bạn không cần biết thuật ngữ kỹ thuật.
            </p>
          </div>

          <Upload.Dragger
            accept="image/jpeg,image/png,image/webp"
            multiple
            showUploadList={false}
            disabled={processingImages || files.length >= MAX_ATTACHMENTS}
            beforeUpload={(file, selected) => {
              if (file.uid === selected[0]?.uid) void addFiles(selected as File[]);
              return Upload.LIST_IGNORE;
            }}
          >
            <div className="flex flex-col items-center gap-2 py-2">
              <AppIcon icon={ImagePlus} size="lg" style={{ color: token.colorTextSecondary }} />
              <span className="text-sm font-medium">Dán, kéo hoặc chọn ảnh nếu cần</span>
              <span className="text-xs" style={{ color: token.colorTextSecondary }}>
                Không bắt buộc · tối đa 3 ảnh · mỗi ảnh 3 MB
              </span>
            </div>
          </Upload.Dragger>

          {files.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex min-w-0 items-center gap-3 rounded-lg border p-2"
                  style={{ borderColor: token.colorBorderSecondary, background: token.colorFillQuaternary }}
                >
                  <BugReportFileThumbnail file={file} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium" title={file.name}>
                      {file.name}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: token.colorTextSecondary }}>
                      {(file.size / 1024).toFixed(0)} KB · bấm ảnh để xem
                    </div>
                  </div>
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
          )}
        </div>
      </AdaptiveModal>
    </>
  );
}

export default BugReportSurface;

'use client';

import React from 'react';
import type { CreateBugReportAttachmentRequest, RequestClassificationJob } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { fileDataBase64 } from '../../lib/image-utils';

export function useRequestClassification(params: {
  open: boolean;
  activeView: 'bug' | 'feature' | 'history';
  description: string;
  files: File[];
  contextPath?: string;
  contextPageTitle?: string;
  pathname: string;
}): RequestClassificationJob | null {
  const { open, activeView, description, files, contextPath, contextPageTitle, pathname } = params;
  const [classification, setClassification] = React.useState<RequestClassificationJob | null>(null);
  const classificationVersionRef = React.useRef(0);

  React.useEffect(() => {
    if (!open || activeView === 'history') return;
    const trimmedDescription = description.trim();
    const version = ++classificationVersionRef.current;
    setClassification(null);
    if (trimmedDescription.length < 3) return;
    if (!navigator.onLine) {
      setClassification({
        id: `offline-${version}`,
        status: 'FAILED',
        recommendation: null,
        fallbackReason: 'Bạn đang offline; vẫn có thể tự chọn Báo lỗi hoặc Yêu cầu chức năng.',
        expiresAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    let cancelled = false;
    let pollTimer: number | null = null;
    const poll = async (jobId: string) => {
      try {
        const next = await apiClient.bugReports.classificationStatus(jobId);
        if (cancelled || version !== classificationVersionRef.current) return;
        setClassification(next);
        if (next.status === 'PENDING' || next.status === 'LEASED') {
          pollTimer = window.setTimeout(() => void poll(jobId), 1500);
        }
      } catch {
        if (cancelled || version !== classificationVersionRef.current) return;
        setClassification({
          id: jobId,
          status: 'FAILED',
          recommendation: null,
          fallbackReason: 'AI tạm thời không phản hồi; bạn vẫn có thể tự chọn loại yêu cầu.',
          expiresAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    };
    const debounce = window.setTimeout(() => {
      void (async () => {
        try {
          const attachments: CreateBugReportAttachmentRequest[] = await Promise.all(
            files.map(async (file) => ({
              fileName: file.name,
              mimeType: file.type as CreateBugReportAttachmentRequest['mimeType'],
              sizeBytes: file.size,
              dataBase64: await fileDataBase64(file),
            }))
          );
          const response = await apiClient.bugReports.classifyRequest({
            description: trimmedDescription,
            context: {
              path: contextPath || pathname,
              pageTitle: contextPageTitle || document.title,
              online: true,
            },
            attachments,
          });
          const job = response.data;
          if (!job || cancelled || version !== classificationVersionRef.current) return;
          setClassification(job);
          void poll(job.id);
        } catch {
          if (cancelled || version !== classificationVersionRef.current) return;
          setClassification({
            id: `unavailable-${version}`,
            status: 'FAILED',
            recommendation: null,
            fallbackReason: 'Không thể hỏi AI lúc này; bạn vẫn có thể tự chọn loại yêu cầu.',
            expiresAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      })();
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
      if (pollTimer !== null) window.clearTimeout(pollTimer);
    };
  }, [activeView, contextPageTitle, contextPath, description, files, open, pathname]);

  return classification;
}

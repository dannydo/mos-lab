'use client';

import React from 'react';
import { Button } from 'antd';
import { FileText } from 'lucide-react';
import type { SopPrepEvidenceFile } from '@mos-lab/shared';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import { formatSopPrepFileSize } from './sop-prep-category1-helpers';
import { SopPrepFileTypeIcon } from './SopPrepFileTypeIcon';

interface SopPrepEvidencePreviewModalProps {
  open: boolean;
  file: SopPrepEvidenceFile | null;
  onClose: () => void;
}

export function SopPrepEvidencePreviewModal({ open, file, onClose }: SopPrepEvidencePreviewModalProps) {
  return (
    <AdaptiveModal
      intent="detail"
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          {file && <SopPrepFileTypeIcon fileType={file.fileType} />}
          <span className="truncate max-w-md">{file?.name || 'Xem trước tệp minh chứng'}</span>
        </div>
      }
      footer={[
        <Button key="close" onClick={onClose} className="rounded-xl font-medium">
          Đóng
        </Button>,
        file && (
          <a
            key="download"
            href={file.url}
            download={file.name}
            target="_blank"
            rel="noopener noreferrer"
            className="ant-btn ant-btn-primary rounded-xl font-medium inline-flex items-center justify-center h-8 px-4"
          >
            Tải tệp về máy
          </a>
        ),
      ]}
      className="rounded-2xl"
    >
      {file && (
        <div className="space-y-3 py-2">
          {file.fileType === 'image' ? (
            <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center max-h-[480px]">
              <img
                src={file.url}
                alt={file.name}
                className="max-h-[450px] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          ) : file.fileType === 'video' ? (
            <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <video src={file.url} controls className="w-full max-h-[400px]">
                <track kind="captions" />
                Trình duyệt không hỗ trợ phát video này.
              </video>
            </div>
          ) : (
            <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <AppIcon icon={FileText} size={32} />
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{file.name}</div>
              <div className="text-xs text-slate-500 tabular-nums">
                Tài liệu định dạng {file.mimeType} ({formatSopPrepFileSize(file.sizeBytes)})
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mô tả minh chứng:</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 m-0">
              {file.description || 'Chưa có mô tả chi tiết.'}
            </p>
            <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-3 flex-wrap">
              <span>
                Nguồn: <strong>{file.sourceOrigin}</strong>
              </span>
              {file.pilotSessionCode && (
                <span>
                  Mã ca: <strong>{file.pilotSessionCode}</strong>
                </span>
              )}
              <span>
                Tải lên bởi: <strong>{file.uploadedBy}</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </AdaptiveModal>
  );
}

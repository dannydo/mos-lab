'use client';

import React, { useState, type ChangeEvent } from 'react';
import { Button, Card, Input, Popconfirm, Select } from 'antd';
import { ExternalLink, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import type { SopPrepCriterionData, SopPrepEvidenceFile } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { formatSopPrepFileSize, UPLOAD_ORIGIN_OPTIONS } from './sop-prep-category1-helpers';
import { SopPrepFileTypeIcon } from './SopPrepFileTypeIcon';

interface SopPrepEvidenceSectionProps {
  criterion: SopPrepCriterionData;
  fileInputId: string;
  selectedFile: File | null;
  uploadDescription: string;
  uploadOrigin: string;
  uploadSessionCode: string;
  uploading: boolean;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onUploadDescriptionChange: (value: string) => void;
  onUploadOriginChange: (value: string) => void;
  onUploadSessionCodeChange: (value: string) => void;
  onUploadEvidence: () => void;
  onPreviewFile: (file: SopPrepEvidenceFile) => void;
  onDeleteEvidence: (fileId: string) => void;
}

export function SopPrepEvidenceSection({
  criterion,
  fileInputId,
  selectedFile,
  uploadDescription,
  uploadOrigin,
  uploadSessionCode,
  uploading,
  onFileChange,
  onUploadDescriptionChange,
  onUploadOriginChange,
  onUploadSessionCodeChange,
  onUploadEvidence,
  onPreviewFile,
  onDeleteEvidence,
}: SopPrepEvidenceSectionProps) {
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({});
  const evidenceFiles = criterion.evidenceFiles || [];

  const handleImageError = (fileId: string) => {
    setFailedImageIds((prev) => (prev[fileId] ? prev : { ...prev, [fileId]: true }));
  };

  return (
    <Card
      variant="outlined"
      className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
      data-testid="sop-prep-evidence-section"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-0.5">
          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 m-0 flex items-center gap-2">
            <AppIcon icon={ImageIcon} size={17} className="text-indigo-600 dark:text-indigo-400" />
            <span>Tệp minh chứng thực tế cho Tiêu chí {criterion.name}</span>
          </h4>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Hỗ trợ tải lên nhiều tệp: Ảnh chụp lâm sàng, video clip thao tác, tài liệu hướng dẫn (PDF/DOC)
          </div>
        </div>

        <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 self-start sm:self-auto tabular-nums">
          {evidenceFiles.length} tệp đã đính kèm
        </span>
      </div>

      {/* Upload Box Component */}
      <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="shrink-0">
            <input
              type="file"
              id={fileInputId}
              onChange={onFileChange}
              accept="image/*,video/*,.pdf,.doc,.docx"
              className="hidden"
              data-testid="sop-prep-file-input"
            />
            <label
              htmlFor={fileInputId}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:border-indigo-500 hover:text-indigo-600 cursor-pointer shadow-xs transition-colors"
            >
              <AppIcon icon={Upload} size={15} />
              <span>{selectedFile ? 'Đổi tệp khác' : 'Chọn tệp từ thiết bị'}</span>
            </label>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 truncate flex-1">
            {selectedFile ? (
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                Đã chọn: {selectedFile.name} ({formatSopPrepFileSize(selectedFile.size)})
              </span>
            ) : (
              <span>Hỗ trợ ảnh JPG/PNG/WebP, Video MP4/WebM, Tài liệu PDF/DOCX (tối đa 50MB)</span>
            )}
          </div>
        </div>

        {/* Upload Metadata Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="sm:col-span-2">
            <Input
              placeholder="Mô tả tệp minh chứng (ví dụ: Ảnh cữ đo mi 9.5mm tại bàn tư vấn...)"
              value={uploadDescription}
              onChange={(e) => onUploadDescriptionChange(e.target.value)}
              className="rounded-xl text-xs"
              data-testid="sop-prep-upload-desc-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select
              value={uploadOrigin}
              onChange={onUploadOriginChange}
              className="w-full text-xs rounded-xl"
              options={UPLOAD_ORIGIN_OPTIONS}
            />

            <Input
              placeholder="Mã ca Pilot (vd: PILOT-001)"
              value={uploadSessionCode}
              onChange={(e) => onUploadSessionCodeChange(e.target.value)}
              className="rounded-xl text-xs"
              data-testid="sop-prep-upload-session-input"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="primary"
            icon={<AppIcon icon={Upload} size={14} />}
            loading={uploading}
            disabled={!selectedFile}
            onClick={onUploadEvidence}
            className="rounded-xl font-medium text-xs h-8 bg-emerald-600 hover:bg-emerald-700 border-none shadow-sm flex items-center"
            data-testid="sop-prep-upload-submit-btn"
          >
            Tải lên tệp minh chứng
          </Button>
        </div>
      </div>

      {/* Evidence Files List / Gallery */}
      <div className="mt-4">
        {evidenceFiles.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-slate-100 dark:border-slate-800 rounded-xl">
            Chưa có tệp minh chứng nào cho tiêu chí này. Hãy tải lên ảnh hoặc tài liệu đầu tiên ở trên.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="sop-prep-evidence-list">
            {evidenceFiles.map((file) => {
              const showImage = file.fileType === 'image' && Boolean(file.url) && !failedImageIds[file.id];

              return (
                <div
                  key={file.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-2.5"
                  data-testid={`sop-prep-evidence-item-${file.id}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail / Icon */}
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                      {showImage ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(file.id)}
                        />
                      ) : (
                        <SopPrepFileTypeIcon fileType={file.fileType} />
                      )}
                    </div>

                    {/* File Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block max-w-[200px]"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          ({formatSopPrepFileSize(file.sizeBytes)})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {file.sourceOrigin || 'Ca Pilot'}
                        </span>
                        {file.pilotSessionCode && (
                          <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                            {file.pilotSessionCode}
                          </span>
                        )}
                      </div>

                      {file.description && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 m-0 line-clamp-2 leading-relaxed">
                          {file.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* File Card Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <span className="text-slate-400 tabular-nums">
                      {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString('vi-VN') : ''}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        size="small"
                        type="text"
                        icon={<AppIcon icon={ExternalLink} size={13} />}
                        onClick={() => onPreviewFile(file)}
                        className="text-indigo-600 dark:text-indigo-400 text-xs px-2 h-7 rounded-lg"
                        data-testid={`preview-evidence-${file.id}`}
                      >
                        Xem trước
                      </Button>

                      <Popconfirm
                        title="Xác nhận xóa tệp minh chứng"
                        description="Bạn có chắc chắn muốn gỡ tệp này khỏi tiêu chí không?"
                        okText="Xóa tệp"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => onDeleteEvidence(file.id)}
                      >
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<AppIcon icon={Trash2} size={13} />}
                          className="text-xs px-2 h-7 rounded-lg"
                          data-testid={`delete-evidence-${file.id}`}
                        >
                          Xóa
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

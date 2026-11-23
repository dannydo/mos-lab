'use client';

import React from 'react';
import { Button } from 'antd';
import { CheckCircle2, Play, Save, Send } from 'lucide-react';

interface ConfigActionFloatingBarProps {
  isDraft: boolean;
  saving: boolean;
  previewLoading: boolean;
  onValidate: () => void;
  onPreview: () => void;
  onSaveDraft: () => void;
  onOpenPublishModal: () => void;
}

export function ConfigActionFloatingBar({
  isDraft,
  saving,
  previewLoading,
  onValidate,
  onPreview,
  onSaveDraft,
  onOpenPublishModal,
}: ConfigActionFloatingBarProps) {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-md flex flex-wrap items-center justify-between gap-3 sticky bottom-4 z-10 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Button icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} onClick={onValidate}>
          Kiểm Tra Tính Hợp Lệ
        </Button>

        <Button icon={<Play className="w-4 h-4 text-indigo-500" />} onClick={onPreview} loading={previewLoading}>
          Xem Trước Điểm Kỳ Này
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {isDraft && (
          <>
            <Button icon={<Save className="w-4 h-4" />} onClick={onSaveDraft} loading={saving}>
              Lưu Bản Nháp
            </Button>

            <Button
              type="primary"
              icon={<Send className="w-4 h-4" />}
              onClick={onOpenPublishModal}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Ban Hành Chính Thức
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

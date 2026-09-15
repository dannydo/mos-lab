'use client';

import React from 'react';
import { Modal } from 'antd';

interface ImagePreviewModalProps {
  previewImageUrl: string | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ previewImageUrl, onClose }) => {
  return (
    <Modal
      open={!!previewImageUrl}
      onCancel={onClose}
      footer={null}
      width={700}
      centered
      destroyOnHidden
      getContainer={() => document.body}
    >
      {previewImageUrl && (
        <div className="p-2 text-center">
          <img
            src={previewImageUrl}
            alt="Ảnh Bằng Chứng QA/QC"
            className="max-h-[600px] mx-auto rounded-lg shadow-lg border border-slate-200 dark:border-slate-800"
          />
        </div>
      )}
    </Modal>
  );
};

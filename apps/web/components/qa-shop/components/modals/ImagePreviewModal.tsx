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
      width="calc(100vw - 32px)"
      centered
      destroyOnHidden
      className="max-w-none"
      style={{ top: 16, maxWidth: 'calc(100vw - 32px)', margin: '0 auto' }}
      styles={{
        content: {
          padding: '12px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRadius: '16px',
        },
      }}
      getContainer={() => document.body}
    >
      {previewImageUrl && (
        <div className="p-1 text-center flex items-center justify-center">
          <img
            src={previewImageUrl}
            alt="Ảnh Bằng Chứng QA/QC"
            className="max-h-[calc(100vh-100px)] max-w-full mx-auto rounded-lg shadow-lg border border-slate-700/60 object-contain select-none"
          />
        </div>
      )}
    </Modal>
  );
};

'use client';

import React from 'react';
import { Modal, Button, Alert, Spin } from 'antd';
import { CameraOutlined, CloudUploadOutlined } from '@ant-design/icons';

interface CameraCaptureModalProps {
  open: boolean;
  activeItemId: string | null;
  cameraStream: MediaStream | null;
  cameraError: string | null;
  isCameraLoading: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onClose: () => void;
  onCapture: () => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  open,
  activeItemId,
  cameraStream,
  cameraError,
  isCameraLoading,
  videoRef,
  onClose,
  onCapture,
}) => {
  return (
    <Modal
      title={
        <span className="flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
          <CameraOutlined /> Máy Ảnh Chụp Bằng Chứng Vi Phạm QA Shop
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} size="small">
          Hủy
        </Button>,
        <Button
          key="capture"
          type="primary"
          danger
          icon={<CameraOutlined />}
          onClick={onCapture}
          size="small"
          disabled={!cameraStream || !!cameraError}
          className="font-semibold"
        >
          Chụp Ảnh Ngay
        </Button>,
      ]}
      width={640}
      destroyOnHidden
      getContainer={() => document.body}
    >
      <div className="space-y-3 py-2">
        {cameraError ? (
          <Alert
            type="error"
            showIcon
            message="Lỗi Truy Cập Camera"
            description={
              <div>
                <p className="text-xs">{cameraError}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Bạn có thể sử dụng nút <b>&quot;Tải Ảnh&quot;</b> bên cạnh để chọn ảnh trực tiếp từ thiết bị.
                </p>
              </div>
            }
          />
        ) : (
          <div className="relative rounded-lg overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800 shadow-inner">
            {isCameraLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white gap-2 z-10">
                <Spin size="large" />
                <span className="text-xs">Đang mở camera...</span>
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {/* Frame Viewfinder Overlay */}
            <div className="absolute inset-4 border-2 border-dashed border-rose-500/60 rounded-lg pointer-events-none flex items-center justify-center">
              <span className="text-[11px] text-rose-300/80 bg-slate-950/60 px-2 py-0.5 rounded">
                Căn chỉnh vết vi phạm vào khung hình
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Định dạng: JPEG (Chất lượng cao)</span>
          <label htmlFor={`file-input-${activeItemId}`}>
            <Button
              size="small"
              icon={<CloudUploadOutlined />}
              onClick={() => {
                onClose();
                const el = document.getElementById(`file-input-${activeItemId}`);
                if (el) el.click();
              }}
            >
              Tải Ảnh Từ Máy
            </Button>
          </label>
        </div>
      </div>
    </Modal>
  );
};

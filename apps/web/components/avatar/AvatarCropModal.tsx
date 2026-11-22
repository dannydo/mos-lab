'use client';

import React from 'react';
import { X } from 'lucide-react';
import { AdaptiveModal } from '~/components/ui';
import { AvatarAiScoreCard } from './avatar-crop-modal/AvatarAiScoreCard';
import { AvatarCropFooter } from './avatar-crop-modal/AvatarCropFooter';
import { AvatarCropHeader } from './avatar-crop-modal/AvatarCropHeader';
import type { AvatarCropModalProps } from './avatar-crop-modal/avatarCropModalTypes';
import { AvatarViewfinderControls } from './avatar-crop-modal/AvatarViewfinderControls';
import { useAvatarCropModal } from './avatar-crop-modal/useAvatarCropModal';

export type { AvatarCropModalProps } from './avatar-crop-modal/avatarCropModalTypes';

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({ open, onClose, currentUser, onSuccess }) => {
  const {
    isDark,
    selectedImageSrc,
    zoom,
    setZoom,
    aiScoreState,
    isUploading,
    canvasRef,
    cameraInputRef,
    galleryInputRef,
    handleFileChange,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleRotate,
    handleSaveAvatar,
    handleClose,
  } = useAvatarCropModal({ onClose, currentUser, onSuccess });

  return (
    <AdaptiveModal
      intent="confirm"
      open={open}
      onCancel={handleClose}
      footer={null}
      centered
      width={480}
      destroyOnHidden
      wrapClassName={isDark ? 'dark-theme' : 'light-theme'}
      closeIcon={
        <X size={18} className={isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} />
      }
      styles={{
        content: {
          background: isDark
            ? 'linear-gradient(180deg, rgb(24, 24, 28) 0%, rgb(16, 16, 20) 100%)'
            : 'linear-gradient(180deg, rgb(255, 255, 255) 0%, rgb(249, 250, 251) 100%)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '28px',
          boxShadow: isDark
            ? '0 25px 60px -15px rgba(0, 0, 0, 0.85)'
            : '0 25px 60px -15px rgba(0, 0, 0, 0.18), 0 10px 25px -5px rgba(0, 0, 0, 0.06)',
          padding: 0,
          overflow: 'hidden',
        },
        mask: {
          backdropFilter: 'blur(16px)',
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.45)',
        },
      }}
    >
      <div
        className={`flex flex-col max-h-[85vh] overflow-y-auto no-scrollbar p-5 md:p-6 select-none ${
          isDark ? 'text-slate-100' : 'text-slate-900'
        }`}
      >
        <AvatarCropHeader isDark={isDark} />

        <AvatarViewfinderControls
          isDark={isDark}
          selectedImageSrc={selectedImageSrc}
          zoom={zoom}
          canvasRef={canvasRef}
          cameraInputRef={cameraInputRef}
          galleryInputRef={galleryInputRef}
          onFileChange={handleFileChange}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onRotate={handleRotate}
          onZoomChange={setZoom}
        />

        {selectedImageSrc && <AvatarAiScoreCard isDark={isDark} aiScoreState={aiScoreState} />}

        <AvatarCropFooter
          isDark={isDark}
          canSave={Boolean(selectedImageSrc)}
          isUploading={isUploading}
          onClose={handleClose}
          onSave={handleSaveAvatar}
        />
      </div>
    </AdaptiveModal>
  );
};

export default AvatarCropModal;

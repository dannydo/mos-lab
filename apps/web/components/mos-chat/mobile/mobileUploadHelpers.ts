import type React from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import type { MosChatImageAttachment } from '@mos-lab/shared';
import type { ChatUploadScope, PendingChatUploadItem } from '../shared/hooks/useChatUploadQueue';
import { isVideoAttachment } from '../utils/chat-helpers';
import { uploadMultipleChatImages } from '../utils/chat-upload';
import { isSupportedVideoFile } from '../utils/chat-video';

export async function dispatchMobileSelectedFiles(params: {
  files: FileList;
  scope: ChatUploadScope;
  attachedImages: MosChatImageAttachment[];
  setAttachedImages: React.Dispatch<React.SetStateAction<MosChatImageAttachment[]>>;
  setIsUploadingNonVideo: React.Dispatch<React.SetStateAction<boolean>>;
  enqueueVideoUpload: (input: {
    file: File;
    scope: ChatUploadScope;
    existingVideoCount?: number;
    onSuccess: (att: MosChatImageAttachment, item: PendingChatUploadItem) => void;
    onError?: (message: string, item: PendingChatUploadItem) => void;
  }) => { accepted: boolean; reason?: string };
  antdMessage: MessageInstance;
  successSuffix?: string;
}): Promise<void> {
  const {
    files,
    scope,
    attachedImages,
    setAttachedImages,
    setIsUploadingNonVideo,
    enqueueVideoUpload,
    antdMessage,
    successSuffix = '',
  } = params;

  const allFiles = Array.from(files);
  const videoFiles = allFiles.filter(isSupportedVideoFile);
  const otherFiles = allFiles.filter((f) => !isSupportedVideoFile(f));

  const existingVideoCount = attachedImages.filter(isVideoAttachment).length;
  let queuedOffset = 0;

  for (const vf of videoFiles) {
    const res = enqueueVideoUpload({
      file: vf,
      scope,
      existingVideoCount: existingVideoCount + queuedOffset,
      onSuccess: (uploadedAtt) => {
        setAttachedImages((prev) => [...prev, uploadedAtt]);
        antdMessage.success(`Đã đính kèm video "${vf.name}"${successSuffix}`);
      },
      onError: (errMsg) => {
        antdMessage.error(errMsg);
      },
    });
    if (!res.accepted && res.reason) {
      antdMessage.error(res.reason);
    } else if (res.accepted) {
      queuedOffset += 1;
    }
  }

  if (otherFiles.length === 0) return;

  setIsUploadingNonVideo(true);
  const hideMsg = antdMessage.loading(`Đang tải ${otherFiles.length} tệp lên...`, 0);
  try {
    const uploaded = await uploadMultipleChatImages(otherFiles);
    hideMsg();
    if (uploaded.length > 0) {
      setAttachedImages((prev) => [...prev, ...uploaded]);
      if (uploaded.length === otherFiles.length) {
        antdMessage.success(`Đã đính kèm ${uploaded.length} tệp${successSuffix}`);
      } else {
        antdMessage.warning(`Đã tải ${uploaded.length}/${otherFiles.length} tệp`);
      }
    } else {
      antdMessage.error('Không thể tải tệp lên, vui lòng thử lại');
    }
  } catch {
    hideMsg();
    antdMessage.error('Có lỗi xảy ra khi tải tệp lên');
  } finally {
    setIsUploadingNonVideo(false);
  }
}

import type { MosChatImageAttachment, MosChatMessage } from '@mos-lab/shared';

export interface MosChatMobileMessageItemProps {
  message: MosChatMessage;
  prevMessage?: MosChatMessage;
  onOpenThread?: (msg: MosChatMessage) => void;
  onOpenGallery?: (message: MosChatMessage, attachmentIndex: number) => void;
  onOpenCustomer?: (customerId: number) => void;
}

export interface PartitionedMobileAttachments {
  videoAttachments: MosChatImageAttachment[];
  imageAttachments: MosChatImageAttachment[];
  fileAttachments: MosChatImageAttachment[];
}

export interface FileAttachmentDisplayMeta {
  fullUrl: string;
  ext: string;
  isPdf: boolean;
  isExcel: boolean;
  isWord: boolean;
  isZip: boolean;
}

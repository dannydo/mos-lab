import type { AvatarScoreResponse, SafeAny } from '@mos-lab/shared';

export interface AvatarCropModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: SafeAny;
  onSuccess?: (newAvatarUrl: string) => void;
}

export type AiScoreStatus = 'idle' | 'analyzing' | 'scored' | 'error';

export interface AiScoreState {
  status: AiScoreStatus;
  data?: AvatarScoreResponse;
  errorMessage?: string;
}

export interface PanOffset {
  x: number;
  y: number;
}

import type { LucideIcon } from 'lucide-react';
import type { PilotSession } from '@mos-lab/shared';

export interface PilotCriteriaSopDetailProps {
  onBack?: () => void;
  onOpenCriteriaModal?: () => void;
  onOpenSopModal?: () => void;
  sessions?: PilotSession[];
  onOpenSessionFlow?: (session: PilotSession) => void;
}

export interface PilotEvidenceItem {
  type: 'PASS' | 'FAIL';
  sessionId: number;
  customerName: string;
  date: string;
  detail: string;
  photoUrl?: string | null;
}

export interface SopCriterionDetail {
  id: number;
  name: string;
  order: number;
  icon: LucideIcon;
  quickBadge: {
    pass: string;
    fail: string;
  };
  purpose: string;
  inspectionMethod: string;
  inspectionTools: string[];
  passStandard: {
    title: string;
    description: string;
    indicators: string[];
  };
  failStandard: {
    title: string;
    description: string;
    indicators: string[];
  };
  pilotEvidences: PilotEvidenceItem[];
  expertConfirmationNote?: string;
  ktvDeepDive: {
    title: string;
    specifications: string[];
    chemistryNote?: string;
  };
}

export interface GlossaryTermItem {
  term: string;
  simpleExplain: string;
}

export interface CriterionShortName {
  id: number;
  short: string;
}

export type EvidenceFilterType = 'ALL' | 'FAIL' | 'PASS' | 'HAS_PHOTO';

export interface PreviewPhotoState {
  url: string;
  title: string;
  subtitle: string;
}

export interface PilotCriteriaStats {
  total: number;
  passCount: number;
  failCount: number;
  withPhotosCount: number;
  passRate: string;
}

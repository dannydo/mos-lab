'use client';

import React from 'react';
import {
  Alert,
  Button,
  Input,
  InputNumber,
  Popconfirm,
  Rate,
  Select,
  Skeleton,
  Space,
  Tooltip,
  message,
  theme,
} from 'antd';
import {
  ChevronDown,
  CircleCheck,
  CircleDollarSign,
  Compass,
  Eye,
  Gift,
  GripVertical,
  Landmark,
  Link,
  Maximize2,
  Minus,
  Pencil,
  Plus,
  Printer,
  Save,
  Star,
  Trash2,
  TriangleAlert,
  Trophy,
  Unlink,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import { ACADEMY_TALENT_STRANDS_5_MIN_MAX, ACADEMY_TALENT_STRANDS_5_MIN_MIN } from '@mos-lab/shared';
import type {
  AcademyCourse,
  AcademyTalentAssessmentQuote,
  AcademyTalentPaymentMethod,
  UpdateAcademyTalentLadderConfigurationRequest,
} from '@mos-lab/shared';
import { formatVND } from '../../../../lib/format-utils';
import { AdaptiveModal, AdaptiveOverlayFooter, AppIcon, StatePanel } from '../../../../components/ui';
import { useTheme } from '../../../../context/ThemeContext';
import AcademyTalentInvoice from './AcademyTalentInvoice';
import AcademyTalentFollowUpPaymentSlip from './AcademyTalentFollowUpPaymentSlip';
import { AcademyTalentCourseConfigurationModal } from './AcademyTalentCourseConfigurationModal';
import { AcademyMilestoneLadder } from './AcademyMilestoneLadder';
import { toAcademyTalentWorkshopPricing, toAcademyTalentWorkshopResult } from './academy-talent-workshop.adapter';
import type {
  AcademyTalentAssessmentView,
  AcademyTalentCourseSelectionRule,
  AcademyTalentDraft,
  AcademyTalentErrorKey,
  AcademyTalentMilestone,
  AcademyTalentWorkshopProps,
} from './academy-talent-workshop.types';
import styles from './AcademyTalentWorkshop.module.css';

const ERROR_CARDS: Array<{ key: AcademyTalentErrorKey; title: string; description: string; icon: React.ReactNode }> = [
  {
    key: 'skin',
    title: 'Dính da',
    description: 'Keo hoặc chân mi chạm vào da',
    icon: <AppIcon icon={TriangleAlert} />,
  },
  { key: 'root', title: 'Hở chân', description: 'Chân mi hở, không ôm khít', icon: <AppIcon icon={Unlink} /> },
  { key: 'stickies', title: 'Dính mi', description: 'Dính chùm hoặc dính mi tơ', icon: <AppIcon icon={Link} /> },
  { key: 'direction', title: 'Hướng mi', description: 'Mi nghiêng veo, lệch hướng', icon: <AppIcon icon={Compass} /> },
];

/** Server stores the legacy 0–4 score; visual stars are intentionally +1. */
const RATING_LABELS = ['Kiểm tra lại', 'Khá', 'Đạt', 'Giỏi', 'Xuất sắc'];

function AcademyLearnerAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => setImageFailed(false), [avatarUrl]);

  if (avatarUrl && !imageFailed) {
    return (
      <img
        alt={`Ảnh đại diện ${name}`}
        className={styles.learnerAvatar}
        src={avatarUrl}
        onError={() => setImageFailed(true)}
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <span aria-label={`Chưa có ảnh đại diện của ${name}`} className={styles.learnerAvatar}>
      {initials || <AppIcon icon={UserRound} />}
    </span>
  );
}

const FALLBACK_MILESTONES: AcademyTalentMilestone[] = [
  {
    key: 'level1',
    title: 'Nhập môn',
    strands: 1,
    scholarshipPct: 0,
    sampleRewardPct: 0,
    kitRewardPct: 0,
    bubbleHeightPercent: 20,
    tone: 'slate',
  },
  {
    key: 'level2',
    title: 'Khá',
    strands: 3,
    scholarshipPct: 2,
    sampleRewardPct: 2,
    kitRewardPct: 2,
    bubbleHeightPercent: 29,
    tone: 'orange',
  },
  {
    key: 'level3',
    title: 'Triển vọng',
    strands: 5,
    scholarshipPct: 5,
    sampleRewardPct: 5,
    kitRewardPct: 5,
    bubbleHeightPercent: 38,
    tone: 'indigo',
  },
  {
    key: 'level4',
    title: 'Vượt trội',
    strands: 10,
    scholarshipPct: 10,
    sampleRewardPct: 10,
    kitRewardPct: 10,
    bubbleHeightPercent: 47,
    tone: 'emerald',
  },
  {
    key: 'level5',
    title: 'Thiên bẩm',
    strands: 20,
    scholarshipPct: 50,
    sampleRewardPct: 20,
    kitRewardPct: 20,
    bubbleHeightPercent: 57,
    tone: 'gold',
  },
  {
    key: 'level6',
    title: 'Thiên thần bóng tối',
    strands: 35,
    scholarshipPct: 90,
    sampleRewardPct: 20,
    kitRewardPct: 20,
    bubbleHeightPercent: 67,
    tone: 'violet',
  },
];

type ScholarshipRewardFlight = {
  id: number;
  headline: string;
  fromX: number;
  fromY: number;
  width: number;
  deltaX: number;
  deltaY: number;
  scale: number;
  scholarshipPct: number;
  sampleRewardPct: number;
  kitRewardPct: number;
};

type ScholarshipCelebration = {
  id: number;
  intensity: 0 | 1 | 2 | 3;
};

const SCHOLARSHIP_FIREWORKS = [
  { left: '17%', top: '34%', color: '#fbbf24', delay: '0ms' },
  { left: '35%', top: '19%', color: '#38bdf8', delay: '95ms' },
  { left: '51%', top: '31%', color: '#d8b4fe', delay: '55ms' },
  { left: '69%', top: '17%', color: '#f472b6', delay: '145ms' },
  { left: '83%', top: '37%', color: '#34d399', delay: '85ms' },
  { left: '27%', top: '55%', color: '#fde68a', delay: '195ms' },
  { left: '76%', top: '57%', color: '#67e8f9', delay: '225ms' },
] as const;

function defaultLadderConfigurationDraft(): UpdateAcademyTalentLadderConfigurationRequest['tiers'] {
  return FALLBACK_MILESTONES.map((tier) => ({
    key: tier.key,
    title: tier.title,
    strands: tier.strands,
    scholarshipPercent: tier.scholarshipPct,
    sampleRewardPercent: tier.sampleRewardPct || 0,
    kitRewardPercent: tier.kitRewardPct || 0,
    bubbleHeightPercent: tier.bubbleHeightPercent || 20,
  }));
}

function createLadderTierKey() {
  return `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * These are the five approved Academy catalogue covers that originally
 * shipped with the workshop. Courses may still override them in the native
 * catalogue; the fallback means a missing optional cover never degrades the
 * sales canvas into a generic placeholder.
 */
const ACADEMY_COURSE_COVER_FALLBACKS: Record<string, string> = {
  combo: '/academy/courses/lash_combo.jpg',
  basic: '/academy/courses/lash_basic.jpg',
  advanced: '/academy/courses/lash_advanced.jpg',
  fan: '/academy/courses/lash_volume.jpg',
  design: '/academy/courses/lash_design.jpg',
};

const ACADEMY_COURSE_TONES: Record<string, string> = {
  combo: 'combo',
  basic: 'basic',
  advanced: 'advanced',
  fan: 'fan',
  design: 'design',
};

function academyCourseCoverUrl(course: Pick<AcademyCourse, 'code' | 'coverImageUrl'>) {
  return course.coverImageUrl || ACADEMY_COURSE_COVER_FALLBACKS[course.code.trim().toLowerCase()] || null;
}

function academyCourseTone(course: Pick<AcademyCourse, 'code'>, fallbackIndex: number) {
  return ACADEMY_COURSE_TONES[course.code.trim().toLowerCase()] || String(fallbackIndex % 5);
}

function clampInteger(value: number | null | undefined, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
}

function emptyDraft(): AcademyTalentDraft {
  return {
    eyeScore: 0,
    handScore: 0,
    strands5Min: ACADEMY_TALENT_STRANDS_5_MIN_MIN,
    errors: { skin: 0, root: 0, stickies: 0, direction: 0 },
    selectedCourseIds: [],
    selectedSampleCourseIds: [],
    selectedKitCourseIds: [],
    selectedInstructorIdsByCourse: {},
    primaryCourseId: null,
    paymentMode: 'THINKING',
    depositVnd: null,
    note: null,
  };
}

function normalizeDraft(value?: AcademyTalentDraft | null): AcademyTalentDraft {
  const base = emptyDraft();
  if (!value) return base;
  const selectedCourseIds = Array.from(
    new Set((value.selectedCourseIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))
  );
  return {
    ...base,
    ...value,
    // A quote without courses cannot have a payment decision. This also
    // clears older drafts that defaulted to a deposit before course selection.
    paymentMode:
      selectedCourseIds.length === 0
        ? 'THINKING'
        : value.paymentMode === 'FULL'
          ? 'FULL'
          : value.paymentMode === 'DEPOSIT'
            ? 'DEPOSIT'
            : 'THINKING',
    eyeScore: clampInteger(value.eyeScore, 0, 4),
    handScore: clampInteger(value.handScore, 0, 4),
    strands5Min: clampInteger(value.strands5Min, ACADEMY_TALENT_STRANDS_5_MIN_MIN, ACADEMY_TALENT_STRANDS_5_MIN_MAX),
    errors: {
      skin: Math.max(0, Math.round(Number(value.errors?.skin) || 0)),
      root: Math.max(0, Math.round(Number(value.errors?.root) || 0)),
      stickies: Math.max(0, Math.round(Number(value.errors?.stickies) || 0)),
      direction: Math.max(0, Math.round(Number(value.errors?.direction) || 0)),
    },
    selectedCourseIds,
    selectedSampleCourseIds: Array.from(
      new Set((value.selectedSampleCourseIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))
    ),
    selectedKitCourseIds: Array.from(
      new Set((value.selectedKitCourseIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))
    ),
    selectedInstructorIdsByCourse: Object.fromEntries(
      Object.entries(value.selectedInstructorIdsByCourse || {})
        .map(([courseId, instructorId]) => [Number(courseId), Number(instructorId)] as const)
        .filter(
          ([courseId, instructorId]) =>
            Number.isInteger(courseId) && courseId > 0 && Number.isInteger(instructorId) && instructorId > 0
        )
        .map(([courseId, instructorId]) => [String(courseId), instructorId])
    ),
    primaryCourseId: value.primaryCourseId ? Number(value.primaryCourseId) : null,
    depositVnd:
      value.depositVnd === null || value.depositVnd === undefined
        ? null
        : Math.max(0, Math.round(Number(value.depositVnd) || 0)),
    note: value.note?.trim() || null,
  };
}

/** The Academy checkout defaults to the scholarship-retention deposit. */
function withDefaultDeposit(
  draft: AcademyTalentDraft,
  suggestedDepositVnd: number | null | undefined
): AcademyTalentDraft {
  if (draft.paymentMode !== 'THINKING') return draft;
  return {
    ...draft,
    paymentMode: 'DEPOSIT',
    depositVnd: draft.depositVnd ?? suggestedDepositVnd ?? null,
  };
}

function retainInstructorSelections(
  selections: Record<string, number>,
  selectedCourseIds: Iterable<number>
): Record<string, number> {
  const allowed = new Set(selectedCourseIds);
  return Object.fromEntries(Object.entries(selections).filter(([courseId]) => allowed.has(Number(courseId))));
}

/**
 * Full Academy-native talent assessment workflow.  This component has no
 * pricing/ranking calculation: every result panel comes from `assessment`
 * returned by the server after a save.
 */
export function AcademyTalentWorkshopDrawer({
  open,
  lead,
  courses,
  assessment,
  sessions = [],
  loading = false,
  saving = false,
  courseSelectionRules = {},
  onClose,
  onPreviewQuote,
  onSaveDraft,
  onIssueInvoice,
  onMarkInvoicePrinted,
  onSelectSession,
  onStartNewSession,
  onSaved,
  instructors = [],
  ladderConfiguration = null,
  canEditLadder = false,
  canManageCourses = false,
  canConfirmPayment = false,
  autoOpenPaymentFollowUp = false,
  onSaveLadderConfiguration,
  onSaveCourseConfiguration,
  onRecordPayment,
}: AcademyTalentWorkshopProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [draft, setDraft] = React.useState<AcademyTalentDraft>(() => normalizeDraft(assessment?.draft));
  const [view, setView] = React.useState<AcademyTalentAssessmentView | null>(assessment);
  const [isNewSession, setIsNewSession] = React.useState(false);
  const [busyAction, setBusyAction] = React.useState<'save' | 'invoice' | 'payment' | 'session' | null>(null);
  const [printView, setPrintView] = React.useState<AcademyTalentAssessmentView | null>(null);
  const [printPreviewOpen, setPrintPreviewOpen] = React.useState(false);
  const [printDocument, setPrintDocument] = React.useState<'INVOICE' | 'FOLLOW_UP' | null>(null);
  const [paymentFollowUpOpen, setPaymentFollowUpOpen] = React.useState(false);
  const [paymentSlipOpen, setPaymentSlipOpen] = React.useState(false);
  const [paymentAmountVnd, setPaymentAmountVnd] = React.useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<AcademyTalentPaymentMethod>('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = React.useState('');
  const [paymentNote, setPaymentNote] = React.useState('');
  const [previewQuote, setPreviewQuote] = React.useState<AcademyTalentAssessmentQuote | null>(null);
  const [quoteDirty, setQuoteDirty] = React.useState(false);
  const [previewError, setPreviewError] = React.useState(false);
  const [courseMarket, setCourseMarket] = React.useState<'DOMESTIC' | 'OVERSEAS'>('DOMESTIC');
  const [instructorMenuCourseId, setInstructorMenuCourseId] = React.useState<number | null>(null);
  const [layoutMode, setLayoutMode] = React.useState<'viewport' | 'custom'>('viewport');
  const [customPopupWidth, setCustomPopupWidth] = React.useState(1280);
  const [customPopupHeight, setCustomPopupHeight] = React.useState(900);
  const [isResizingPopup, setIsResizingPopup] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [ladderConfigurationDraft, setLadderConfigurationDraft] = React.useState<
    UpdateAcademyTalentLadderConfigurationRequest['tiers'] | null
  >(null);
  const [courseConfigurationOpen, setCourseConfigurationOpen] = React.useState(false);
  const [savingLadderConfiguration, setSavingLadderConfiguration] = React.useState(false);
  const [scholarshipRewardFlight, setScholarshipRewardFlight] = React.useState<ScholarshipRewardFlight | null>(null);
  const [scholarshipCelebration, setScholarshipCelebration] = React.useState<ScholarshipCelebration | null>(null);
  const [scholarshipTargetReady, setScholarshipTargetReady] = React.useState(true);
  const [courseSelectionReady, setCourseSelectionReady] = React.useState(true);
  const previewRequestRef = React.useRef(0);
  const scholarshipSourceRef = React.useRef<HTMLDivElement>(null);
  const scholarshipTargetRef = React.useRef<HTMLDivElement>(null);
  const scholarshipTransitionTimerRef = React.useRef<number | null>(null);
  const courseSelectionTimerRef = React.useRef<number | null>(null);
  const scholarshipTransitionIdRef = React.useRef(0);
  const autoOpenedPaymentFollowUpRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const savedMode = window.localStorage.getItem('mos_academy_talent_workshop_layout_mode');
    const savedWidth = Number(window.localStorage.getItem('mos_academy_talent_workshop_custom_width'));
    if (savedMode === 'custom') setLayoutMode('custom');
    if (Number.isFinite(savedWidth) && savedWidth >= 760) {
      setCustomPopupWidth(Math.min(savedWidth, Math.max(760, window.innerWidth - 24)));
    }
    const savedHeight = Number(window.localStorage.getItem('mos_academy_talent_workshop_custom_height'));
    if (Number.isFinite(savedHeight) && savedHeight >= 560) {
      setCustomPopupHeight(Math.min(savedHeight, Math.max(560, window.innerHeight - 24)));
    }
  }, []);

  React.useEffect(() => {
    if (!open) {
      setPrintPreviewOpen(false);
      setPaymentFollowUpOpen(false);
      return;
    }
    if (scholarshipTransitionTimerRef.current !== null) {
      window.clearTimeout(scholarshipTransitionTimerRef.current);
      scholarshipTransitionTimerRef.current = null;
    }
    if (courseSelectionTimerRef.current !== null) {
      window.clearTimeout(courseSelectionTimerRef.current);
      courseSelectionTimerRef.current = null;
    }
    setStep(1);
    setView(assessment);
    setIsNewSession(false);
    setDraft(normalizeDraft(assessment?.draft));
    setPrintView(assessment?.invoice ? assessment : null);
    setPrintPreviewOpen(false);
    setPaymentFollowUpOpen(false);
    setPreviewQuote(null);
    // Rehydrate the visual result from the same Fastify preview used while
    // dragging. Older sessions can contain a historical quote snapshot that
    // no longer matches their persisted score, so never pair that stale
    // summary with a current ladder marker.
    setQuoteDirty(Boolean(assessment && !assessment.invoice));
    setPreviewError(false);
    setEditMode(false);
    setLadderConfigurationDraft(null);
    setCourseConfigurationOpen(false);
    setScholarshipRewardFlight(null);
    setScholarshipCelebration(null);
    setScholarshipTargetReady(true);
    setCourseSelectionReady(true);
    const selectedMarket = courses.find((course) => assessment?.draft.selectedCourseIds.includes(course.id))?.market;
    setCourseMarket(selectedMarket === 'OVERSEAS' ? 'OVERSEAS' : 'DOMESTIC');
    // A save returns a fresh object for the same session. Resetting on that
    // reference change would immediately pull the operator back to step 1
    // instead of continuing into course selection. Only reset when opening the
    // workshop, switching learner, or selecting a different assessment session.
  }, [assessment?.id, lead?.id, open]);

  React.useEffect(
    () => () => {
      if (scholarshipTransitionTimerRef.current !== null) {
        window.clearTimeout(scholarshipTransitionTimerRef.current);
      }
      if (courseSelectionTimerRef.current !== null) {
        window.clearTimeout(courseSelectionTimerRef.current);
      }
    },
    []
  );

  const surfaceStyle = React.useMemo(
    () =>
      ({
        '--academy-talent-surface': token.colorBgContainer,
        '--academy-talent-surface-raised': token.colorBgElevated,
        '--academy-talent-surface-muted': token.colorFillQuaternary,
        '--academy-talent-border': token.colorBorderSecondary,
        '--academy-talent-border-strong': token.colorBorder,
        '--academy-talent-text': token.colorText,
        '--academy-talent-muted': token.colorTextSecondary,
        '--academy-talent-cyan': token.colorInfo,
        '--academy-talent-gold': token.colorWarning,
        '--academy-talent-success': token.colorSuccess,
        '--academy-talent-danger': token.colorError,
      }) as React.CSSProperties,
    [token]
  );

  const displayView = isNewSession ? null : view || assessment;
  const hasPrintedInvoice = Boolean(displayView?.invoice);
  // A printed tuition document remains editable until every VND is confirmed
  // in the payment ledger. Printing itself is intent, not settlement.
  const isIssued = displayView?.payment.status === 'PAID';
  const orderedSessions = React.useMemo(
    () => [...sessions].sort((left, right) => left.sessionNumber - right.sessionNumber),
    [sessions]
  );
  const nextSessionNumber = React.useMemo(
    () => Math.max(0, ...orderedSessions.map((session) => session.sessionNumber)) + 1,
    [orderedSessions]
  );

  const setWorkshopLayoutMode = React.useCallback((nextMode: 'viewport' | 'custom') => {
    setLayoutMode(nextMode);
    window.localStorage.setItem('mos_academy_talent_workshop_layout_mode', nextMode);
  }, []);

  const startPopupResize = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = customPopupWidth;
      const startHeight = customPopupHeight;
      setIsResizingPopup(true);

      const onMove = (moveEvent: MouseEvent) => {
        const maxWidth = Math.max(760, window.innerWidth - 24);
        const maxHeight = Math.max(560, window.innerHeight - 24);
        setCustomPopupWidth(Math.round(Math.min(Math.max(startWidth + moveEvent.clientX - startX, 760), maxWidth)));
        setCustomPopupHeight(Math.round(Math.min(Math.max(startHeight + moveEvent.clientY - startY, 560), maxHeight)));
      };
      const onUp = () => {
        setIsResizingPopup(false);
        setCustomPopupWidth((width) => {
          window.localStorage.setItem('mos_academy_talent_workshop_custom_width', String(width));
          return width;
        });
        setCustomPopupHeight((height) => {
          window.localStorage.setItem('mos_academy_talent_workshop_custom_height', String(height));
          return height;
        });
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [customPopupHeight, customPopupWidth]
  );
  const shouldPreviewQuote = Boolean(open && lead && onPreviewQuote && quoteDirty && !isIssued);
  // Only the dummy challenge and course choices can change a monetary quote.
  // Eye/hand observations remain part of the saved assessment, but must not
  // flicker the ladder or trigger a pricing request while an assessor rates
  // the learner's baseline ability.
  const quotePreviewFingerprint = [
    draft.strands5Min,
    draft.errors.skin,
    draft.errors.root,
    draft.errors.stickies,
    draft.errors.direction,
    draft.selectedCourseIds.join(','),
    draft.selectedSampleCourseIds.join(','),
    draft.selectedKitCourseIds.join(','),
    Object.entries(draft.selectedInstructorIdsByCourse)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([courseId, instructorId]) => `${courseId}:${instructorId}`)
      .join(','),
    draft.paymentMode,
    draft.depositVnd ?? '',
  ].join('|');
  const quotePreviewDraft = React.useMemo(
    () => normalizeDraft(draft),
    // The fingerprint intentionally omits eyeScore, handScore and note.
    [quotePreviewFingerprint]
  );

  React.useEffect(() => {
    const requestId = ++previewRequestRef.current;
    if (!shouldPreviewQuote || !onPreviewQuote) {
      setPreviewQuote(null);
      setPreviewError(false);
      return;
    }

    let retryTimer: number | null = null;
    const requestQuote = (attempt: number) => {
      void onPreviewQuote(quotePreviewDraft)
        .then((quote) => {
          if (previewRequestRef.current !== requestId) return;
          setPreviewQuote(quote);
          setPreviewError(false);
        })
        .catch(() => {
          if (previewRequestRef.current !== requestId) return;
          // A slider interaction can coincide with a short API reload or a
          // network hiccup. Retry once before showing zero-value placeholders;
          // the result itself still comes exclusively from Fastify.
          if (attempt === 0) {
            retryTimer = window.setTimeout(() => requestQuote(1), 320);
            return;
          }
          setPreviewQuote(null);
          setPreviewError(true);
        });
    };
    const timer = window.setTimeout(() => {
      requestQuote(0);
    }, 160);

    return () => {
      window.clearTimeout(timer);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [onPreviewQuote, quotePreviewDraft, shouldPreviewQuote]);

  const previewResult = React.useMemo(
    () =>
      previewQuote
        ? toAcademyTalentWorkshopResult(previewQuote, { eyeScore: draft.eyeScore, handScore: draft.handScore })
        : null,
    [draft.eyeScore, draft.handScore, previewQuote]
  );
  const previewPricing = React.useMemo(
    () => (previewQuote ? toAcademyTalentWorkshopPricing(previewQuote) : null),
    [previewQuote]
  );
  // Once a quote-relevant field changes, never show a rank from the previous
  // draft. The short preview request is server-only and does not write audit
  // history while an evaluator is dragging the slider.
  const result = previewResult || (shouldPreviewQuote ? null : displayView?.result);
  const pricing = previewPricing || (shouldPreviewQuote ? null : displayView?.pricing);
  // A live, server-calculated quote is enough to review the recommended course.
  // Saving remains an explicit action in the course/payment step.
  const canOpenCourseStep = Boolean(lead && (result || displayView));
  const isPreviewPending = shouldPreviewQuote && !previewQuote && !previewError;
  // Step 2's financial quote must always come from the server because it
  // applies expiry and qualification rules. Step 1 keeps a separate,
  // immediate ladder preview so the result follows the slider without
  // waiting for the quote request.
  const effectiveRewards =
    isPreviewPending || previewError || !result || !pricing
      ? { scholarshipPct: 0, sampleRewardPct: 0, kitRewardPct: 0 }
      : {
          scholarshipPct: Math.max(0, Math.round(result.scholarshipPct || 0)),
          sampleRewardPct: Math.max(0, Math.round(pricing.sampleRewardPct || 0)),
          kitRewardPct: Math.max(0, Math.round(pricing.kitRewardPct || 0)),
        };
  const scholarshipPct = effectiveRewards.scholarshipPct;
  const rewardHeadline = isPreviewPending
    ? 'ĐANG TÍNH HỌC BỔNG…'
    : previewError
      ? 'CHƯA THỂ CẬP NHẬT'
      : result?.resultTitle === 'Ưu đãi đã hết hạn'
        ? 'ƯU ĐÃI ĐÃ HẾT HẠN'
        : scholarshipPct > 0
          ? `HỌC BỔNG ${scholarshipPct}%`
          : 'CHƯA ĐẠT HỌC BỔNG';
  const configuredLadderTiers = ladderConfiguration?.tiers;
  const milestones = React.useMemo(() => {
    if (configuredLadderTiers?.length) {
      return [...configuredLadderTiers]
        .map((tier) => ({
          key: tier.key,
          title: tier.title,
          strands: tier.strands,
          scholarshipPct: tier.scholarshipPercent,
          sampleRewardPct: tier.sampleRewardPercent,
          kitRewardPct: tier.kitRewardPercent,
          bubbleHeightPercent: tier.bubbleHeightPercent,
        }))
        .sort((left, right) => left.strands - right.strands);
    }
    return result?.levels?.length ? result.levels : FALLBACK_MILESTONES;
  }, [configuredLadderTiers, result?.levels]);
  // The five-minute challenge is a fixed Academy 0–50 measurement. Keeping
  // this range independent of the tiers makes every configured milestone
  // comparable and prevents a historical draft from stretching the rail.
  const sliderMax = ACADEMY_TALENT_STRANDS_5_MIN_MAX;
  const draftErrorTotal = Object.values(draft.errors).reduce((sum, item) => sum + item, 0);
  // These cards are direct feedback for the slider. They deliberately use the
  // globally configured tiers rather than waiting for the debounced preview
  // request, while the server remains the authority for saved quote amounts.
  const activeLadderMilestone = React.useMemo(
    () => [...milestones].reverse().find((milestone) => draft.strands5Min >= milestone.strands) || null,
    [draft.strands5Min, milestones]
  );
  const ladderRewards =
    draft.strands5Min <= 0 || draftErrorTotal > 5
      ? { scholarshipPct: 0, sampleRewardPct: 0, kitRewardPct: 0 }
      : {
          scholarshipPct: Math.round(activeLadderMilestone?.scholarshipPct || 0),
          sampleRewardPct: Math.round(activeLadderMilestone?.sampleRewardPct || 0),
          kitRewardPct: Math.round(activeLadderMilestone?.kitRewardPct || 0),
        };
  const scoreRewardHeadline =
    activeLadderMilestone && draft.strands5Min > 0 && draftErrorTotal <= 5
      ? `KẾT QUẢ: ${activeLadderMilestone.title.toUpperCase()}`
      : 'CHƯA ĐẠT HỌC BỔNG';
  const selectedCourseIds = new Set(draft.selectedCourseIds);
  const hasSelectedCourses = draft.selectedCourseIds.length > 0;
  const selectedCourseRewardAmounts =
    hasSelectedCourses && pricing
      ? {
          scholarshipVnd: pricing.courseScholarshipVnd,
          sampleVnd: pricing.sampleScholarshipVnd,
          kitVnd: pricing.kitScholarshipVnd,
        }
      : undefined;
  const activeCourses = React.useMemo(() => courses.filter((course) => course.isActive), [courses]);
  const instructorsById = React.useMemo(
    () => new Map(instructors.map((instructor) => [instructor.id, instructor])),
    [instructors]
  );
  const autoInstructor = React.useMemo(
    () => instructors.find((instructor) => instructor.code === 'auto') || null,
    [instructors]
  );
  const marketCourses = React.useMemo(
    () => activeCourses.filter((course) => course.market === courseMarket),
    [activeCourses, courseMarket]
  );
  const recommendedIds = new Set(result?.recommendedCourseIds || []);
  const selectedCourseNames = activeCourses
    .filter((course) => selectedCourseIds.has(course.id))
    .map((course) => course.name);
  const isBusy = saving || busyAction !== null;
  const inputDisabled = isBusy || isIssued;
  const paymentChoiceDisabled = inputDisabled || !hasSelectedCourses;
  const paymentChoiceHint = hasSelectedCourses
    ? undefined
    : 'Chọn ít nhất một khóa học trước khi chọn hình thức thanh toán.';
  const scholarshipCelebrationIntensity: 0 | 1 | 2 | 3 =
    ladderRewards.scholarshipPct <= 0
      ? 0
      : ladderRewards.scholarshipPct >= 50
        ? 3
        : ladderRewards.scholarshipPct >= 15
          ? 2
          : 1;

  const completeScholarshipTransfer = React.useCallback(() => {
    scholarshipTransitionTimerRef.current = null;
    setScholarshipRewardFlight(null);
    setScholarshipTargetReady(true);
    setScholarshipCelebration({
      id: ++scholarshipTransitionIdRef.current,
      intensity: scholarshipCelebrationIntensity,
    });
    courseSelectionTimerRef.current = window.setTimeout(
      () => {
        courseSelectionTimerRef.current = null;
        setCourseSelectionReady(true);
      },
      scholarshipCelebrationIntensity > 0 ? 1180 : 620
    );
  }, [scholarshipCelebrationIntensity]);

  const openCourseStepWithScholarshipTransfer = React.useCallback(() => {
    if (!canOpenCourseStep || step === 2) return;

    const source = scholarshipSourceRef.current?.getBoundingClientRect() || null;
    if (scholarshipTransitionTimerRef.current !== null) {
      window.clearTimeout(scholarshipTransitionTimerRef.current);
      scholarshipTransitionTimerRef.current = null;
    }
    if (courseSelectionTimerRef.current !== null) {
      window.clearTimeout(courseSelectionTimerRef.current);
      courseSelectionTimerRef.current = null;
    }
    setScholarshipRewardFlight(null);
    setScholarshipCelebration(null);
    setScholarshipTargetReady(false);
    setCourseSelectionReady(false);
    setStep(2);

    // The footer is mounted with the next step. On a large canvas it can take
    // more than two frames to receive its final geometry, so wait briefly for
    // a real destination instead of silently skipping the flight.
    const launchFlight = (attempt = 0) => {
      const target = scholarshipTargetRef.current?.getBoundingClientRect() || null;
      if (!source || !target) {
        if (source && attempt < 8) {
          window.requestAnimationFrame(() => launchFlight(attempt + 1));
          return;
        }
        completeScholarshipTransfer();
        return;
      }

      const fromWidth = Math.max(source.width, 1);
      const targetWidth = Math.max(target.width, 1);
      const id = ++scholarshipTransitionIdRef.current;
      setScholarshipRewardFlight({
        id,
        // Transfer the same live ladder result that the evaluator just saw.
        // The footer still renders the server quote after landing, including
        // its expiry rules and selected-course VND amounts.
        headline: scoreRewardHeadline,
        fromX: source.left + source.width / 2,
        fromY: source.top + source.height / 2,
        width: source.width,
        deltaX: target.left + target.width / 2 - (source.left + source.width / 2),
        deltaY: target.top + target.height / 2 - (source.top + source.height / 2),
        scale: Math.min(1.35, Math.max(0.45, targetWidth / fromWidth)),
        scholarshipPct: ladderRewards.scholarshipPct,
        sampleRewardPct: ladderRewards.sampleRewardPct,
        kitRewardPct: ladderRewards.kitRewardPct,
      });
      scholarshipTransitionTimerRef.current = window.setTimeout(completeScholarshipTransfer, 760);
    };

    window.requestAnimationFrame(() => launchFlight());
  }, [canOpenCourseStep, completeScholarshipTransfer, ladderRewards, scoreRewardHeadline, step]);

  const returnToScoreStep = React.useCallback(() => {
    if (scholarshipTransitionTimerRef.current !== null) {
      window.clearTimeout(scholarshipTransitionTimerRef.current);
      scholarshipTransitionTimerRef.current = null;
    }
    if (courseSelectionTimerRef.current !== null) {
      window.clearTimeout(courseSelectionTimerRef.current);
      courseSelectionTimerRef.current = null;
    }
    setScholarshipRewardFlight(null);
    setScholarshipCelebration(null);
    setScholarshipTargetReady(true);
    setCourseSelectionReady(true);
    setStep(1);
  }, []);

  const closeGlobalEditor = React.useCallback(() => {
    setLadderConfigurationDraft(null);
    setCourseConfigurationOpen(false);
    setEditMode(false);
  }, []);

  const openLadderTierEditor = React.useCallback(
    (_tierKey: string, openFromGlobalControl = false) => {
      if (!canEditLadder || (!editMode && !openFromGlobalControl) || !onSaveLadderConfiguration) return;
      if (!ladderConfiguration) return;
      setLadderConfigurationDraft(
        ladderConfiguration.tiers.map((tier) => ({
          key: tier.key,
          title: tier.title,
          strands: tier.strands,
          scholarshipPercent: tier.scholarshipPercent,
          sampleRewardPercent: tier.sampleRewardPercent,
          kitRewardPercent: tier.kitRewardPercent,
          bubbleHeightPercent: tier.bubbleHeightPercent,
        }))
      );
    },
    [canEditLadder, editMode, ladderConfiguration, onSaveLadderConfiguration]
  );

  const updateLadderConfigurationDraft = React.useCallback(
    (tierKey: string, patch: Partial<UpdateAcademyTalentLadderConfigurationRequest['tiers'][number]>) => {
      setLadderConfigurationDraft(
        (current) => current?.map((tier) => (tier.key === tierKey ? { ...tier, ...patch } : tier)) || current
      );
    },
    []
  );

  const addLadderConfigurationTier = React.useCallback(() => {
    setLadderConfigurationDraft((current) => {
      if (!current || current.length >= 10) return current;
      const highestStrands = Math.max(0, ...current.map((tier) => tier.strands));
      if (highestStrands >= ACADEMY_TALENT_STRANDS_5_MIN_MAX) return current;
      const highestBubble = Math.max(20, ...current.map((tier) => tier.bubbleHeightPercent));
      return [
        ...current,
        {
          key: createLadderTierKey(),
          title: `Mốc ${current.length + 1}`,
          strands: highestStrands + 1,
          scholarshipPercent: 0,
          sampleRewardPercent: 0,
          kitRewardPercent: 0,
          bubbleHeightPercent: Math.min(80, highestBubble + 8),
        },
      ];
    });
  }, []);

  const deleteLadderConfigurationTier = React.useCallback((tierKey: string) => {
    setLadderConfigurationDraft((current) => {
      if (!current || current.length <= 1) return current;
      return current.filter((tier) => tier.key !== tierKey);
    });
  }, []);

  const saveLadderConfiguration = React.useCallback(async () => {
    if (!ladderConfigurationDraft || !onSaveLadderConfiguration) return;
    const tiers = ladderConfigurationDraft.map((tier) => ({
      ...tier,
      title: tier.title.trim(),
      strands: clampInteger(tier.strands, 1, ACADEMY_TALENT_STRANDS_5_MIN_MAX),
      scholarshipPercent: clampInteger(tier.scholarshipPercent, 0, 100),
      sampleRewardPercent: clampInteger(tier.sampleRewardPercent, 0, 100),
      kitRewardPercent: clampInteger(tier.kitRewardPercent, 0, 100),
      bubbleHeightPercent: clampInteger(tier.bubbleHeightPercent, 0, 80),
    }));
    if (tiers.some((tier) => !tier.title)) {
      message.warning('Mỗi bubble phải có tên trước khi lưu.');
      return;
    }
    const uniqueStrands = new Set(tiers.map((tier) => tier.strands));
    if (uniqueStrands.size !== tiers.length) {
      message.warning('Mỗi mốc cần có số sợi riêng, không được trùng nhau.');
      return;
    }
    setSavingLadderConfiguration(true);
    try {
      await onSaveLadderConfiguration({ tiers });
      closeGlobalEditor();
      message.success('Đã lưu bảng quyền lợi cho toàn bộ Academy.');
      // The global percentage is financial policy, not decorative text. Refresh
      // the current unsaved quote so the result cards immediately agree with
      // the bubble the admin has just configured.
      if (onPreviewQuote && lead && !isIssued) {
        try {
          const refreshedQuote = await onPreviewQuote(normalizeDraft(draft));
          setPreviewQuote(refreshedQuote);
          setPreviewError(false);
          setQuoteDirty(true);
        } catch {
          message.warning('Cấu hình đã lưu; báo giá hiện tại sẽ cập nhật ở lần thay đổi điểm tiếp theo.');
        }
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || 'Không thể lưu cấu hình bubble.');
    } finally {
      setSavingLadderConfiguration(false);
    }
  }, [closeGlobalEditor, draft, isIssued, ladderConfigurationDraft, lead, onPreviewQuote, onSaveLadderConfiguration]);
  const presentationView = React.useMemo<AcademyTalentAssessmentView | null>(() => {
    if (!displayView || !previewQuote || !previewResult || !previewPricing) return displayView;
    // Keep every number in the preview document in the same non-persistent
    // Fastify quote. Showing the previous saved strands beside a new
    // scholarship would make the operator's quote look internally inconsistent.
    return { ...displayView, draft: normalizeDraft(draft), result: previewResult, pricing: previewPricing };
  }, [displayView, draft, previewPricing, previewQuote, previewResult]);

  const updateQuoteDraft = React.useCallback((updater: (current: AcademyTalentDraft) => AcademyTalentDraft) => {
    setPreviewQuote(null);
    setPreviewError(false);
    setQuoteDirty(true);
    setDraft(updater);
  }, []);
  const updateAssessmentOnlyDraft = React.useCallback(
    (updater: (current: AcademyTalentDraft) => AcademyTalentDraft) => {
      setDraft(updater);
    },
    []
  );

  const persist = React.useCallback(
    async (nextDraft = draft) => {
      if (!lead) return null;
      setBusyAction('save');
      try {
        const saved = await onSaveDraft(normalizeDraft(nextDraft));
        setView(saved);
        setIsNewSession(false);
        setDraft(normalizeDraft(saved.draft));
        setPreviewQuote(null);
        setQuoteDirty(false);
        setPreviewError(false);
        await onSaved?.(saved);
        return saved;
      } catch (error: any) {
        message.error(error?.response?.data?.message || error?.message || 'Không thể lưu đánh giá Tố Chất.');
        return null;
      } finally {
        setBusyAction(null);
      }
    },
    [draft, lead, onSaveDraft, onSaved]
  );

  const saveAssessment = React.useCallback(async () => {
    const saved = await persist();
    if (saved) message.success('Đã lưu chấm điểm.');
  }, [persist]);

  const saveSelection = React.useCallback(async () => {
    await persist();
  }, [persist]);

  const setErrorCount = React.useCallback(
    (key: AcademyTalentErrorKey, delta: number) => {
      updateQuoteDraft((current) => ({
        ...current,
        errors: {
          ...current.errors,
          [key]: Math.max(0, current.errors[key] + delta),
        },
      }));
    },
    [updateQuoteDraft]
  );

  const setCourseSelected = React.useCallback(
    (courseId: number) => {
      updateQuoteDraft((current) => {
        const selected = new Set(current.selectedCourseIds);
        const rule: AcademyTalentCourseSelectionRule = courseSelectionRules[courseId] || { kind: 'COURSE' };
        const isSelected = selected.has(courseId);

        if (isSelected) {
          selected.delete(courseId);
          return {
            ...current,
            selectedCourseIds: [...selected],
            selectedSampleCourseIds: current.selectedSampleCourseIds.filter((id) => id !== courseId),
            selectedKitCourseIds: current.selectedKitCourseIds.filter((id) => id !== courseId),
            selectedInstructorIdsByCourse: retainInstructorSelections(current.selectedInstructorIdsByCourse, selected),
            primaryCourseId: current.primaryCourseId === courseId ? null : current.primaryCourseId,
            paymentMode: selected.size ? current.paymentMode : 'THINKING',
          };
        }

        if (rule.kind === 'COMBO') {
          // Legacy sales flow treats a combo as the complete curriculum: it
          // intentionally replaces every individual course selection.
          selected.clear();
          selected.add(courseId);
          return {
            ...current,
            selectedCourseIds: [...selected],
            selectedSampleCourseIds: current.selectedSampleCourseIds.filter((id) => id === courseId),
            selectedKitCourseIds: current.selectedKitCourseIds.filter((id) => id === courseId),
            selectedInstructorIdsByCourse: retainInstructorSelections(current.selectedInstructorIdsByCourse, selected),
            primaryCourseId: courseId,
            paymentMode: current.paymentMode === 'THINKING' ? 'DEPOSIT' : current.paymentMode,
          };
        }

        // An individual course can be combined with other individual courses,
        // but it must first remove a previously selected full combo.
        for (const selectedId of selected) {
          if ((courseSelectionRules[selectedId] || { kind: 'COURSE' }).kind === 'COMBO') selected.delete(selectedId);
        }
        selected.add(courseId);
        return {
          ...current,
          selectedCourseIds: [...selected],
          selectedSampleCourseIds: current.selectedSampleCourseIds.filter((id) => selected.has(id)),
          selectedKitCourseIds: current.selectedKitCourseIds.filter((id) => selected.has(id)),
          selectedInstructorIdsByCourse: retainInstructorSelections(current.selectedInstructorIdsByCourse, selected),
          primaryCourseId:
            current.primaryCourseId && selected.has(current.primaryCourseId) ? current.primaryCourseId : courseId,
          paymentMode: current.paymentMode === 'THINKING' ? 'DEPOSIT' : current.paymentMode,
        };
      });
    },
    [courseSelectionRules, updateQuoteDraft]
  );

  const setCourseAddOnSelected = React.useCallback(
    (courseId: number, kind: 'SAMPLE' | 'KIT') => {
      updateQuoteDraft((current) => {
        if (!current.selectedCourseIds.includes(courseId)) return current;
        const field = kind === 'SAMPLE' ? 'selectedSampleCourseIds' : 'selectedKitCourseIds';
        const selected = new Set(current[field]);
        if (selected.has(courseId)) selected.delete(courseId);
        else selected.add(courseId);
        return { ...current, [field]: [...selected] };
      });
    },
    [updateQuoteDraft]
  );

  const setCourseInstructor = React.useCallback(
    (courseId: number, instructorId: number) => {
      updateQuoteDraft((current) => {
        if (!current.selectedCourseIds.includes(courseId)) return current;
        return {
          ...current,
          selectedInstructorIdsByCourse: {
            ...current.selectedInstructorIdsByCourse,
            [String(courseId)]: instructorId,
          },
        };
      });
      setInstructorMenuCourseId(null);
    },
    [updateQuoteDraft]
  );

  const openInvoicePreview = React.useCallback(() => {
    if (!lead) return;
    if (!draft.selectedCourseIds.length) {
      message.warning('Chọn ít nhất một khóa học trước khi xem phiếu.');
      return;
    }
    if (!result || !pricing) {
      message.info('Đang tính báo giá theo lựa chọn khóa học. Vui lòng thử lại sau giây lát.');
      return;
    }

    const now = new Date().toISOString();
    const previewDraft = withDefaultDeposit(draft, pricing.suggestedDepositVnd);
    const previewAssessment: AcademyTalentAssessmentView = displayView
      ? {
          ...displayView,
          draft: previewDraft,
          result,
          pricing,
        }
      : {
          id: 0,
          sessionNumber: nextSessionNumber,
          status: 'DRAFT',
          draft: previewDraft,
          result,
          pricing,
          invoice: null,
          payment: {
            status: 'UNPAID',
            totalPaidVnd: 0,
            remainingVnd: Math.max(0, pricing.finalTotalVnd),
            payments: [],
          },
          createdAt: now,
          updatedAt: now,
        };

    setPrintView(previewAssessment);
    setPrintPreviewOpen(true);
  }, [displayView, draft, lead, nextSessionNumber, pricing, result]);

  const issueInvoiceAndOpenPreview = React.useCallback(
    async (openNativeDialog = false) => {
      if (!lead) return;
      // An issued assessment already has an immutable server invoice.  Reprints
      // must not depend on a historical draft still containing course ids.
      if (!isIssued && !draft.selectedCourseIds.length) {
        message.warning('Chọn ít nhất một khóa học trước khi in phiếu.');
        return;
      }
      // Legacy drafts may contain selected courses but no payment choice. The
      // source flow treats the scholarship deposit as the default, so resolve it
      // before saving instead of letting the API reject the print request with
      // no visible document.
      const draftForInvoice = !isIssued ? withDefaultDeposit(draft, pricing?.suggestedDepositVnd) : draft;
      setBusyAction('invoice');
      try {
        if (draftForInvoice !== draft) {
          setDraft(draftForInvoice);
          message.info('Đã áp dụng cọc giữ suất học bổng mặc định để lập phiếu.');
        }
        const issued = await onIssueInvoice(normalizeDraft(draftForInvoice));
        setView(issued);
        setDraft(normalizeDraft(issued.draft));
        setPreviewQuote(null);
        setQuoteDirty(false);
        setPreviewError(false);
        setPrintView(issued);
        await onSaved?.(issued);
        if (onMarkInvoicePrinted) await onMarkInvoicePrinted(issued.id);
        // Let the consultant inspect the immutable document before opening the
        // native printer. The print-only copy stays mounted for the print media
        // rule, while this preview is the visible operational hand-off.
        setPrintPreviewOpen(true);
        if (openNativeDialog) {
          setPrintDocument('INVOICE');
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
        }
      } catch (error: any) {
        message.error(error?.response?.data?.message || error?.message || 'Không thể tạo phiếu học phí.');
      } finally {
        setBusyAction(null);
      }
    },
    [draft, isIssued, lead, onIssueInvoice, onMarkInvoicePrinted, onSaved, pricing?.suggestedDepositVnd]
  );

  const openPaymentFollowUp = React.useCallback(() => {
    const paymentView = printView || displayView;
    if (!paymentView?.invoice) {
      message.info('Lập và in phiếu trước khi xác nhận tiền đã nhận.');
      return;
    }
    const dueForFirstReceipt =
      paymentView.payment.totalPaidVnd > 0
        ? paymentView.payment.remainingVnd
        : (paymentView.pricing?.dueNowVnd ?? paymentView.payment.remainingVnd);
    setPaymentAmountVnd(Math.max(0, Math.round(dueForFirstReceipt || 0)) || null);
    setPaymentMethod('BANK_TRANSFER');
    setPaymentReference('');
    setPaymentNote('');
    setPaymentFollowUpOpen(true);
  }, [displayView, printView]);

  React.useEffect(() => {
    const paymentView = printView || displayView;
    if (!autoOpenPaymentFollowUp) {
      autoOpenedPaymentFollowUpRef.current = null;
      return;
    }
    if (
      !paymentView?.invoice ||
      paymentView.payment.status === 'PAID' ||
      autoOpenedPaymentFollowUpRef.current === paymentView.id
    )
      return;
    autoOpenedPaymentFollowUpRef.current = paymentView.id;
    openPaymentFollowUp();
  }, [autoOpenPaymentFollowUp, displayView, openPaymentFollowUp, printView]);

  const recordPayment = React.useCallback(async () => {
    const paymentView = printView || displayView;
    if (!paymentView || !onRecordPayment) return;
    const amountVnd = Math.round(Number(paymentAmountVnd) || 0);
    if (amountVnd <= 0) {
      message.warning('Nhập số tiền thực tế đã nhận.');
      return;
    }
    if (amountVnd > paymentView.payment.remainingVnd) {
      message.warning(`Số tiền không được vượt quá phần còn lại ${formatVND(paymentView.payment.remainingVnd)}.`);
      return;
    }
    setBusyAction('payment');
    try {
      const updated = await onRecordPayment(paymentView.id, {
        amountVnd,
        method: paymentMethod,
        reference: paymentReference.trim() || null,
        note: paymentNote.trim() || null,
      });
      setView(updated);
      setDraft(normalizeDraft(updated.draft));
      setPrintView(updated);
      setQuoteDirty(false);
      await onSaved?.(updated);
      if (updated.payment.status === 'PAID') {
        setPaymentFollowUpOpen(false);
        setPaymentSlipOpen(false);
        message.success('Đã xác nhận thanh toán đủ. Phiếu đã được khóa.');
      } else {
        message.success(`Đã xác nhận tiền nhận được. Còn ${formatVND(updated.payment.remainingVnd)} để follow-up.`);
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || 'Không thể xác nhận tiền đã nhận.');
    } finally {
      setBusyAction(null);
    }
  }, [
    displayView,
    onRecordPayment,
    onSaved,
    paymentAmountVnd,
    paymentMethod,
    paymentNote,
    paymentReference,
    printView,
  ]);

  const openPaymentSlipPreview = React.useCallback(() => {
    const paymentView = printView || displayView;
    const amountVnd = Math.round(Number(paymentAmountVnd) || 0);
    if (!paymentView || amountVnd <= 0) {
      message.warning('Nhập số tiền cần lập phiếu thanh toán.');
      return;
    }
    if (amountVnd > paymentView.payment.remainingVnd) {
      message.warning(`Số tiền không được vượt quá phần còn lại ${formatVND(paymentView.payment.remainingVnd)}.`);
      return;
    }
    setPaymentSlipOpen(true);
  }, [displayView, paymentAmountVnd, printView]);

  const printPaymentSlip = React.useCallback(() => {
    setPrintDocument('FOLLOW_UP');
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }, []);

  const selectSession = React.useCallback(
    async (assessmentId: number) => {
      if (!onSelectSession || assessmentId === displayView?.id) return;
      setBusyAction('session');
      try {
        const selected = await onSelectSession(assessmentId);
        setView(selected);
        setIsNewSession(false);
        setDraft(normalizeDraft(selected.draft));
        setPrintView(selected.invoice ? selected : null);
        setPrintPreviewOpen(false);
        setPreviewQuote(null);
        setQuoteDirty(!selected.invoice);
        setPreviewError(false);
        setStep(1);
      } catch (error: any) {
        message.error(error?.response?.data?.message || error?.message || 'Không thể mở lần test này.');
      } finally {
        setBusyAction(null);
      }
    },
    [displayView?.id, onSelectSession]
  );

  const startNewSession = React.useCallback(() => {
    if (!onStartNewSession) return;
    onStartNewSession();
    setView(null);
    setIsNewSession(true);
    setDraft(normalizeDraft(null));
    setPrintView(null);
    setPrintPreviewOpen(false);
    setPreviewQuote(null);
    setQuoteDirty(false);
    setPreviewError(false);
    setStep(1);
    message.info(`Đang soạn lần test #${nextSessionNumber}. Bấm Lưu để tạo phiên.`);
  }, [nextSessionNumber, onStartNewSession]);

  const coursePriceHint = React.useCallback(
    (courseId: number) => pricing?.lineItems.find((item) => item.courseId === courseId) || null,
    [pricing?.lineItems]
  );
  const courseAddOnPriceHint = React.useCallback(
    (courseId: number, kind: 'SAMPLE' | 'KIT') =>
      pricing?.addOnItems.find((item) => item.courseId === courseId && item.kind === kind) || null,
    [pricing?.addOnItems]
  );
  const domesticCourses = React.useMemo(
    () => activeCourses.filter((course) => course.market === 'DOMESTIC'),
    [activeCourses]
  );
  const overseasCourses = React.useMemo(
    () => activeCourses.filter((course) => course.market === 'OVERSEAS'),
    [activeCourses]
  );
  const marketPriceLabel = React.useCallback(
    (market: 'DOMESTIC' | 'OVERSEAS') => {
      const values = (market === 'DOMESTIC' ? domesticCourses : overseasCourses)
        .map((course) => course.promoPriceVnd || course.listPriceVnd)
        .filter((value) => value > 0);
      return values.length ? `Từ ${formatVND(Math.min(...values))}` : 'Đang cập nhật học phí';
    },
    [domesticCourses, overseasCourses]
  );
  const closeWorkshop = React.useCallback(() => {
    setPrintPreviewOpen(false);
    onClose();
  }, [onClose]);
  const workshopTitle = 'WORKSHOP: TÌM KIẾM TÀI NĂNG NỐI MI';
  const isAutoScaleLayout = layoutMode === 'viewport';

  return (
    <>
      <AdaptiveModal
        open={open}
        onCancel={closeWorkshop}
        closable={false}
        footer={null}
        centered
        // Auto scale is intentionally a real popup, not a viewport-sized drawer:
        // it owns every available pixel inside a consistent 20px browser margin.
        // The workshop body is then the only scroll container.
        width={isAutoScaleLayout ? 'calc(100vw - 40px)' : `${customPopupWidth}px`}
        style={
          isAutoScaleLayout
            ? {
                ...surfaceStyle,
                height: 'calc(100dvh - 40px)',
                margin: '20px auto',
                maxHeight: 'calc(100dvh - 40px)',
                maxWidth: 'calc(100vw - 40px)',
                top: 0,
                width: 'calc(100vw - 40px)',
              }
            : {
                ...surfaceStyle,
                margin: 0,
                maxHeight: 'calc(100dvh - 40px)',
                maxWidth: 'calc(100vw - 40px)',
              }
        }
        intent="data"
        // The global OmiCall launcher lives at z-index 10040. A focused
        // workshop must sit above it so its sticky footer (especially Print)
        // remains reachable on every viewport.
        zIndex={11050}
        className={`${styles.modal} ${isAutoScaleLayout ? styles.modalAutoScale : styles.modalCustom} ${themeMode === 'dark' ? styles.themeDark : styles.themeLight}`}
        wrapClassName={styles.modalWrap}
        styles={{
          content: {
            height: isAutoScaleLayout ? 'calc(100dvh - 40px)' : `${customPopupHeight}px`,
            maxHeight: '100%',
            overflow: 'hidden',
            padding: 0,
          },
          body: {
            display: 'flex',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            padding: 0,
            position: 'relative',
          },
        }}
        destroyOnClose={false}
        aria-label="Workshop Tố Chất Academy"
      >
        {layoutMode === 'custom' && (
          <div
            aria-label="Kéo để thay đổi kích thước popup workshop"
            className={`${styles.resizeHandle} ${isResizingPopup ? styles.resizeHandleActive : ''}`}
            onMouseDown={startPopupResize}
            title="Kéo góc phải dưới để thay đổi kích thước (tự lưu)"
          />
        )}
        <div className={styles.topControls} aria-label="Điều khiển hiển thị workshop">
          <Tooltip title="Tự căn theo màn hình (margin 20px)">
            <Button
              aria-label="Tự căn workshop theo màn hình"
              className={`${styles.topControlButton} ${layoutMode === 'viewport' ? styles.topControlButtonActive : ''}`}
              icon={<AppIcon icon={Maximize2} />}
              size="small"
              type="text"
              onClick={() => setWorkshopLayoutMode('viewport')}
            />
          </Tooltip>
          <Tooltip title="Tùy chỉnh kích thước (kéo góc phải dưới để resize, tự nhớ sau F5)">
            <Button
              aria-label="Tùy chỉnh kích thước workshop"
              className={`${styles.topControlButton} ${layoutMode === 'custom' ? styles.topControlButtonActive : ''}`}
              icon={<AppIcon icon={GripVertical} />}
              size="small"
              type="text"
              onClick={() => setWorkshopLayoutMode('custom')}
            />
          </Tooltip>
          {(canEditLadder || canManageCourses) && (
            <Tooltip
              title={
                editMode
                  ? 'Tắt chế độ chỉnh sửa toàn cục'
                  : step === 2
                    ? 'Chỉnh sửa khóa học toàn cục'
                    : 'Chỉnh sửa bảng quyền lợi toàn cục'
              }
            >
              <Button
                aria-label={
                  editMode
                    ? 'Tắt chế độ chỉnh sửa toàn cục'
                    : step === 2
                      ? 'Chỉnh sửa khóa học toàn cục'
                      : 'Chỉnh sửa bảng quyền lợi toàn cục'
                }
                className={`${styles.topControlButton} ${editMode ? styles.topControlButtonActive : ''}`}
                disabled={
                  step === 2
                    ? !canManageCourses || !onSaveCourseConfiguration
                    : !canEditLadder || !ladderConfiguration || !onSaveLadderConfiguration
                }
                icon={<AppIcon icon={Pencil} />}
                size="small"
                type="text"
                onClick={() => {
                  if (editMode) {
                    closeGlobalEditor();
                    return;
                  }
                  setLadderConfigurationDraft(null);
                  setEditMode(true);
                  if (step === 2) {
                    setCourseConfigurationOpen(true);
                    return;
                  }
                  setCourseConfigurationOpen(false);
                  openLadderTierEditor('', true);
                }}
              />
            </Tooltip>
          )}
          <span className={styles.topControlDivider} aria-hidden="true" />
          <Tooltip title="Đóng workshop">
            <Button
              aria-label="Đóng workshop Tố Chất"
              className={`${styles.topControlButton} ${styles.topControlCloseButton}`}
              icon={<AppIcon icon={X} />}
              size="small"
              type="text"
              onClick={closeWorkshop}
            />
          </Tooltip>
        </div>
        <div className={styles.workshop} style={surfaceStyle}>
          <header className={styles.topbar}>
            <div className={styles.titleBlock}>
              <div className={styles.workshopTitle}>
                <AppIcon icon={Trophy} /> <span>{workshopTitle}</span>
              </div>
              <div className={styles.stepPills} aria-label="Các bước workshop">
                <button
                  type="button"
                  className={`${styles.stepPill} ${step === 1 ? styles.stepPillActive : ''}`}
                  onClick={returnToScoreStep}
                >
                  <span>1</span> Chấm điểm năng khiếu
                </button>
                <button
                  type="button"
                  className={`${styles.stepPill} ${step === 2 ? styles.stepPillActive : ''}`}
                  onClick={openCourseStepWithScholarshipTransfer}
                  disabled={!canOpenCourseStep}
                >
                  <span>2</span> Chọn khóa học phù hợp
                </button>
              </div>
            </div>
            <div className={styles.learnerHeader}>
              <div className={styles.learnerIdentity}>
                <AcademyLearnerAvatar name={lead?.name || 'Học viên'} avatarUrl={lead?.avatarUrl} />
                <div className={styles.learnerDetails}>
                  <span>Học viên</span>
                  <strong>{lead?.name || 'Chưa chọn học viên'}</strong>
                </div>
              </div>
              <div className={styles.headerDivider} aria-hidden="true" />
              <div className={styles.sessionMeta}>
                <span>Lần test</span>
                <div className={styles.sessionControls}>
                  {orderedSessions.length > 4 && onSelectSession ? (
                    <Select
                      size="small"
                      className={styles.sessionSelect}
                      aria-label="Chọn lần test"
                      value={displayView?.id}
                      disabled={isBusy}
                      options={orderedSessions.map((session) => ({
                        value: session.id,
                        label: String(session.sessionNumber),
                      }))}
                      onChange={(value) => void selectSession(Number(value))}
                    />
                  ) : orderedSessions.length > 1 && onSelectSession ? (
                    <div className={styles.sessionNumberList} aria-label="Chọn lần test">
                      {orderedSessions.map((session) => (
                        <Button
                          key={session.id}
                          aria-label={`Chọn lần test ${session.sessionNumber}`}
                          className={`${styles.sessionNumberButton} ${session.id === displayView?.id ? styles.sessionNumberButtonActive : ''}`}
                          disabled={isBusy}
                          size="small"
                          type="text"
                          onClick={() => void selectSession(session.id)}
                        >
                          {session.sessionNumber}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <strong className={styles.sessionNumberStatic}>{displayView?.sessionNumber || 1}</strong>
                  )}
                  {onStartNewSession && (
                    <Tooltip title="Tạo lần test mới">
                      <Button
                        aria-label="Tạo lần test mới"
                        className={styles.newSessionButton}
                        size="small"
                        type="text"
                        icon={<AppIcon icon={Plus} />}
                        disabled={isBusy}
                        onClick={startNewSession}
                      />
                    </Tooltip>
                  )}
                  {!isIssued && (
                    <Tooltip title="Lưu chấm điểm">
                      <Button
                        aria-label="Lưu chấm điểm"
                        className={styles.headerSaveButton}
                        disabled={isBusy}
                        icon={<AppIcon icon={Save} />}
                        loading={busyAction === 'save'}
                        size="small"
                        type="text"
                        onClick={() => void saveAssessment()}
                      />
                    </Tooltip>
                  )}
                </div>
              </div>
              {isNewSession && <span className={styles.unsavedSession}>#{nextSessionNumber} chưa lưu</span>}
            </div>
          </header>

          {!lead ? (
            <StatePanel
              kind="empty"
              surface={false}
              title="Chọn một học viên Academy để bắt đầu"
              description="Mở Tố Chất từ hồ sơ hoặc hàng lead của học viên cần được đánh giá."
            />
          ) : loading ? (
            <div className={styles.loadingState}>
              <Skeleton active paragraph={{ rows: 12 }} />
            </div>
          ) : (
            <div className={styles.body}>
              {step === 1 ? (
                <section className={`${styles.stepPanel} ${styles.scorePanel}`}>
                  {isIssued ? (
                    <Alert
                      type="info"
                      showIcon
                      className={styles.lockedAlert}
                      message="Phiếu đã thanh toán đủ"
                      description="Nội dung và học phí đã được khóa để khớp với khoản tiền đã xác nhận. Tạo lần test mới nếu cần một báo giá khác."
                    />
                  ) : hasPrintedInvoice ? (
                    <Alert
                      type="warning"
                      showIcon
                      className={styles.lockedAlert}
                      message="Phiếu đã in nhưng chưa thanh toán đủ"
                      description="Bạn vẫn có thể điều chỉnh nội dung. Sau khi lưu, hãy in phiên bản mới để học viên nhận đúng QR và số tiền."
                    />
                  ) : null}

                  <section className={styles.scoreSection} aria-labelledby="academy-talent-eye-hand-title">
                    <WorkshopSectionHeader
                      index="I."
                      title="Kiểm tra cơ địa mắt & tay"
                      titleId="academy-talent-eye-hand-title"
                    />
                    <div className={styles.ratingGrid}>
                      <RatingCard
                        title="Kiểm tra mắt"
                        description="Đánh giá độ phù hợp của mắt và tư thế thao tác"
                        icon={<AppIcon icon={Eye} />}
                        tone="cyan"
                        value={draft.eyeScore}
                        onChange={(value) =>
                          updateAssessmentOnlyDraft((current) => ({ ...current, eyeScore: clampInteger(value, 0, 4) }))
                        }
                        disabled={inputDisabled}
                      />
                      <RatingCard
                        title="Kiểm tra tay"
                        description="Đánh giá độ ổn định, điều khiển nhíp và tay nghề nền"
                        icon={
                          <span aria-label="Bàn tay" role="img">
                            🖐️
                          </span>
                        }
                        tone="orange"
                        value={draft.handScore}
                        onChange={(value) =>
                          updateAssessmentOnlyDraft((current) => ({ ...current, handScore: clampInteger(value, 0, 4) }))
                        }
                        disabled={inputDisabled}
                      />
                    </div>
                  </section>

                  <section
                    className={`${styles.scoreSection} ${styles.practiceSection}`}
                    aria-labelledby="academy-talent-strands-title"
                  >
                    <WorkshopSectionHeader
                      hint="Nhập số sợi thực tế để nhận kết quả và mức ưu đãi."
                      index="II."
                      title="Thử thách nối mi 5 phút trên dummy"
                      titleId="academy-talent-strands-title"
                    />
                    <div className={styles.summitScene}>
                      <ScholarshipRewardSummary
                        ref={scholarshipSourceRef}
                        className={`${styles.scholarshipRewardSummary} ${styles.summitRewardSummary}`}
                        headline={scoreRewardHeadline}
                        scholarshipPct={ladderRewards.scholarshipPct}
                        sampleRewardPct={ladderRewards.sampleRewardPct}
                        kitRewardPct={ladderRewards.kitRewardPct}
                      />
                      <AcademyMilestoneLadder
                        milestones={milestones}
                        sliderMax={sliderMax}
                        value={draft.strands5Min}
                        disabled={inputDisabled}
                        onChange={(nextValue) =>
                          updateQuoteDraft((current) => ({
                            ...current,
                            strands5Min: clampInteger(
                              nextValue,
                              ACADEMY_TALENT_STRANDS_5_MIN_MIN,
                              ACADEMY_TALENT_STRANDS_5_MIN_MAX
                            ),
                          }))
                        }
                        editMode={editMode}
                        onEditTier={openLadderTierEditor}
                      />
                    </div>
                  </section>

                  <details className={styles.coachingDisclosure}>
                    <summary>
                      <span className={styles.coachingDisclosureTitle}>
                        <span>III.</span>
                        <strong id="academy-talent-errors-title">Hoàn thiện tay nghề 1-1</strong>
                        <small>Các lỗi cần tránh & nhận xét cho học viên</small>
                      </span>
                      <span
                        className={`${styles.errorSummary} ${draftErrorTotal > 0 ? styles.errorSummaryHasErrors : ''}`}
                      >
                        <span>Cần tinh chỉnh:</span>{' '}
                        <strong className="tabular-nums">{result?.totalErrors ?? draftErrorTotal} điểm</strong>
                      </span>
                      <span className={styles.coachingDisclosureAction} aria-hidden="true">
                        <AppIcon icon={ChevronDown} />
                      </span>
                    </summary>
                    <div className={styles.coachingDisclosureBody} aria-labelledby="academy-talent-errors-title">
                      <div className={styles.errorGrid}>
                        {ERROR_CARDS.map((item) => (
                          <ErrorCounter
                            key={item.key}
                            title={item.title}
                            description={item.description}
                            icon={item.icon}
                            value={draft.errors[item.key]}
                            disabled={inputDisabled}
                            onChange={(delta) => setErrorCount(item.key, delta)}
                          />
                        ))}
                      </div>
                      <div className={styles.noteField}>
                        <label htmlFor="academy-talent-note">Nhận xét thêm cho học viên</label>
                        <Input.TextArea
                          id="academy-talent-note"
                          value={draft.note || ''}
                          autoSize={{ minRows: 1, maxRows: 2 }}
                          placeholder="Ghi lại điểm mạnh, kỹ năng cần ưu tiên hoặc lời hẹn tư vấn…"
                          disabled={inputDisabled}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, note: event.target.value || null }))
                          }
                        />
                      </div>
                    </div>
                  </details>
                </section>
              ) : (
                <section className={styles.stepPanel} aria-label="Chọn khóa học phù hợp">
                  {courseSelectionReady && (
                    <>
                      {!displayView && (
                        <Alert
                          type="info"
                          showIcon
                          message="Lưu chấm điểm trước để nhận đề xuất chính xác"
                          description="Tố Chất không tự tính học bổng ở trình duyệt. Hãy quay lại bước 1 và lưu đánh giá."
                          className={styles.inlineAlert}
                        />
                      )}

                      <section className={styles.courseSelectionContent} aria-labelledby="academy-talent-courses-title">
                        <h3 className={styles.visuallyHidden} id="academy-talent-courses-title">
                          Chọn lộ trình phù hợp
                        </h3>

                        <div className={styles.marketSwitcher} role="tablist" aria-label="Nhóm học viên Academy">
                          <button
                            type="button"
                            role="tab"
                            aria-selected={courseMarket === 'DOMESTIC'}
                            className={courseMarket === 'DOMESTIC' ? styles.marketActive : ''}
                            onClick={() => setCourseMarket('DOMESTIC')}
                          >
                            <strong>Học viên trong nước</strong>
                            <small>
                              {domesticCourses.length} khóa học · {marketPriceLabel('DOMESTIC')}
                            </small>
                          </button>
                          <span
                            aria-hidden="true"
                            className={styles.marketFlag}
                            data-has-avatar={lead?.avatarUrl ? 'true' : undefined}
                          >
                            {lead?.avatarUrl ? <img alt="" src={lead.avatarUrl} /> : '🇻🇳'}
                          </span>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={courseMarket === 'OVERSEAS'}
                            className={courseMarket === 'OVERSEAS' ? styles.marketActive : ''}
                            onClick={() => setCourseMarket('OVERSEAS')}
                          >
                            <strong>Việt kiều & định cư</strong>
                            <small>
                              {overseasCourses.length} khóa học · {marketPriceLabel('OVERSEAS')}
                            </small>
                          </button>
                        </div>

                        {marketCourses.length ? (
                          <div
                            className={styles.coursePickerGrid}
                            role="listbox"
                            aria-label={`Khóa học ${courseMarket === 'DOMESTIC' ? 'trong nước' : 'Việt kiều và định cư'}`}
                          >
                            {marketCourses.map((course, index) => {
                              const selected = selectedCourseIds.has(course.id);
                              const recommended = recommendedIds.has(course.id);
                              const courseRule = courseSelectionRules[course.id] || { kind: 'COURSE' as const };
                              const coursePrice = coursePriceHint(course.id);
                              const sampleSelected = draft.selectedSampleCourseIds.includes(course.id);
                              const kitSelected = draft.selectedKitCourseIds.includes(course.id);
                              const sampleQuote = courseAddOnPriceHint(course.id, 'SAMPLE');
                              const kitQuote = courseAddOnPriceHint(course.id, 'KIT');
                              const selectedInstructorId = draft.selectedInstructorIdsByCourse[String(course.id)];
                              const instructor =
                                instructorsById.get(selectedInstructorId) || coursePrice?.instructor || autoInstructor;
                              const instructorSurchargeVnd = coursePrice?.instructorSurchargeVnd || 0;
                              const sampleRewardPct = Math.round(pricing?.sampleRewardPct || 0);
                              const kitRewardPct = Math.round(pricing?.kitRewardPct || 0);
                              const sampleRewardLabel =
                                sampleSelected && sampleQuote
                                  ? sampleQuote.scholarshipVnd > 0
                                    ? `Ưu đãi tố chất ${sampleRewardPct}% · giảm ${formatVND(sampleQuote.scholarshipVnd)}`
                                    : 'Chưa có ưu đãi'
                                  : sampleRewardPct > 0
                                    ? `Ưu đãi tố chất ${sampleRewardPct}% khi thêm`
                                    : 'Chưa có ưu đãi';
                              const kitRewardLabel =
                                kitSelected && kitQuote
                                  ? kitQuote.scholarshipVnd > 0
                                    ? `Ưu đãi tố chất ${kitRewardPct}% · giảm ${formatVND(kitQuote.scholarshipVnd)}`
                                    : 'Chưa có ưu đãi'
                                  : kitRewardPct > 0
                                    ? `Ưu đãi tố chất ${kitRewardPct}% khi thêm`
                                    : 'Chưa có ưu đãi';
                              const courseScholarshipVnd = coursePrice?.scholarshipVnd || 0;
                              const courseFeeRewardLabel =
                                courseScholarshipVnd > 0
                                  ? `Ưu đãi tố chất ${Math.round(result?.scholarshipPct || 0)}% · giảm ${formatVND(courseScholarshipVnd)}`
                                  : Math.round(result?.scholarshipPct || 0) > 0
                                    ? `Ưu đãi tố chất ${Math.round(result?.scholarshipPct || 0)}% khi chọn`
                                    : 'Chưa có ưu đãi tố chất';
                              const courseRewardLabel = selected
                                ? courseScholarshipVnd > 0
                                  ? `Học bổng tố chất: giảm ${formatVND(courseScholarshipVnd)}`
                                  : 'Chưa có ưu đãi học bổng'
                                : Math.round(result?.scholarshipPct || 0) > 0
                                  ? `Học bổng tố chất ${Math.round(result?.scholarshipPct || 0)}% khi chọn`
                                  : 'Chưa có ưu đãi học bổng';
                              const coverUrl = academyCourseCoverUrl(course);
                              const courseTone = academyCourseTone(course, index);
                              const totalInvestment = selected
                                ? (coursePrice?.finalPriceVnd ?? course.promoPriceVnd ?? course.listPriceVnd) +
                                  instructorSurchargeVnd +
                                  (sampleQuote?.finalPriceVnd ?? (sampleSelected ? course.samplePriceVnd : 0)) +
                                  (kitQuote?.finalPriceVnd ?? (kitSelected ? course.kitPriceVnd : 0))
                                : course.promoPriceVnd || course.listPriceVnd;
                              return (
                                <article
                                  key={course.id}
                                  role="option"
                                  aria-selected={selected}
                                  data-course-tone={courseTone}
                                  data-course-kind={courseRule.kind.toLowerCase()}
                                  tabIndex={inputDisabled ? -1 : 0}
                                  className={`${styles.coursePickerCard} ${selected ? styles.coursePickerCardSelected : ''} ${recommended ? styles.coursePickerCardRecommended : ''}`}
                                  onClick={() => !inputDisabled && setCourseSelected(course.id)}
                                  onKeyDown={(event) => {
                                    if (!inputDisabled && (event.key === 'Enter' || event.key === ' ')) {
                                      event.preventDefault();
                                      setCourseSelected(course.id);
                                    }
                                  }}
                                >
                                  <div className={styles.coursePickerMeta}>
                                    <span className={styles.courseTag}>{course.tag || course.code}</span>
                                    <span>{course.lessonCount} buổi</span>
                                    <button
                                      type="button"
                                      aria-label={`${selected ? 'Bỏ chọn' : 'Chọn'} ${course.name}`}
                                      aria-pressed={selected}
                                      disabled={inputDisabled}
                                      className={styles.courseSelectButton}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setCourseSelected(course.id);
                                      }}
                                    >
                                      {selected ? <AppIcon icon={CircleCheck} /> : <span />}
                                    </button>
                                  </div>
                                  <div
                                    className={styles.courseVisual}
                                    data-tone={courseTone}
                                    style={
                                      coverUrl
                                        ? {
                                            backgroundImage: `linear-gradient(180deg, rgba(8, 13, 29, .08), rgba(8, 13, 29, .82)), url("${coverUrl}")`,
                                          }
                                        : undefined
                                    }
                                  >
                                    {!coverUrl && <span>{course.tag || 'WINGS'}</span>}
                                    {recommended && <b className={styles.courseRecommendedMark}>Phù hợp</b>}
                                  </div>
                                  <div className={styles.coursePickerCopy}>
                                    <h4>{course.name}</h4>
                                    <p>{course.description || 'Lộ trình Academy được tư vấn theo kết quả workshop.'}</p>
                                    <a
                                      href="/dashboard/academy-leads/courses"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      Xem chi tiết buổi học →
                                    </a>
                                  </div>
                                  <div className={styles.courseFeeRow}>
                                    <span>
                                      Giá gốc <del>{formatVND(course.listPriceVnd)}</del>
                                    </span>
                                    <span>
                                      Học phí{' '}
                                      <strong>
                                        {formatVND(
                                          coursePrice?.finalPriceVnd ?? (course.promoPriceVnd || course.listPriceVnd)
                                        )}
                                      </strong>
                                    </span>
                                    <small className={styles.courseFeeReward}>{courseFeeRewardLabel}</small>
                                  </div>
                                  <div className={styles.courseInstructorPicker}>
                                    <button
                                      type="button"
                                      className={styles.courseInstructorTrigger}
                                      disabled={inputDisabled || !selected || !instructor}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setInstructorMenuCourseId((current) =>
                                          current === course.id ? null : course.id
                                        );
                                      }}
                                      aria-expanded={instructorMenuCourseId === course.id}
                                      aria-controls={`academy-talent-instructor-menu-${course.id}`}
                                    >
                                      {instructor?.avatarUrl ? (
                                        <img
                                          src={instructor.avatarUrl}
                                          alt=""
                                          className={styles.courseInstructorAvatar}
                                        />
                                      ) : (
                                        <span className={styles.courseInstructorAvatar}>
                                          <AppIcon icon={UserRound} />
                                        </span>
                                      )}
                                      <span>
                                        <b>{instructor?.displayName || 'Chưa có giảng viên'}</b>
                                        <small>
                                          {instructor && (instructor.surchargePercent || 0) > 0
                                            ? `${instructor.description || 'Chỉ định giảng viên chính'} · phụ phí +${formatVND(instructorSurchargeVnd)}`
                                            : instructor?.description || 'Chọn giảng viên sau khi chọn khóa học'}
                                        </small>
                                      </span>
                                      <strong>
                                        {instructor && instructor.surchargePercent > 0
                                          ? `+${instructor.surchargePercent}%`
                                          : 'Miễn phí'}
                                      </strong>
                                    </button>
                                    {instructorMenuCourseId === course.id && selected && !inputDisabled && (
                                      <div
                                        id={`academy-talent-instructor-menu-${course.id}`}
                                        className={styles.courseInstructorMenu}
                                        role="menu"
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        {instructors.map((option) => {
                                          const active =
                                            option.id ===
                                            (selectedInstructorId || autoInstructor?.id || coursePrice?.instructor?.id);
                                          return (
                                            <button
                                              key={option.id}
                                              type="button"
                                              role="menuitemradio"
                                              aria-checked={active}
                                              className={active ? styles.courseInstructorOptionActive : ''}
                                              onClick={() => setCourseInstructor(course.id, option.id)}
                                            >
                                              {option.avatarUrl ? (
                                                <img src={option.avatarUrl} alt="" />
                                              ) : (
                                                <span>
                                                  <AppIcon icon={UserRound} />
                                                </span>
                                              )}
                                              <span>
                                                <b>{option.displayName}</b>
                                                <small>{option.description || 'Giảng viên Academy'}</small>
                                              </span>
                                              <strong>
                                                {option.surchargePercent > 0
                                                  ? `+${option.surchargePercent}%`
                                                  : 'Miễn phí'}
                                              </strong>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                  <div className={styles.courseAddOns}>
                                    <button
                                      type="button"
                                      disabled={inputDisabled || !selected || course.samplePriceVnd <= 0}
                                      aria-pressed={sampleSelected}
                                      className={sampleSelected ? styles.courseAddOnSelected : ''}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setCourseAddOnSelected(course.id, 'SAMPLE');
                                      }}
                                    >
                                      <span className={styles.courseAddOnCopy}>
                                        <b>
                                          <AppIcon icon={Gift} /> Mẫu {course.lashModelCount} mẫu
                                        </b>
                                      </span>
                                      <strong>
                                        {sampleSelected && sampleQuote
                                          ? formatVND(sampleQuote.finalPriceVnd)
                                          : formatVND(course.samplePriceVnd)}
                                      </strong>
                                      <i>{sampleSelected ? <AppIcon icon={CircleCheck} /> : <AppIcon icon={Plus} />}</i>
                                      <small className={styles.courseAddOnReward}>{sampleRewardLabel}</small>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={inputDisabled || !selected || course.kitPriceVnd <= 0}
                                      aria-pressed={kitSelected}
                                      className={kitSelected ? styles.courseAddOnSelected : ''}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setCourseAddOnSelected(course.id, 'KIT');
                                      }}
                                    >
                                      <span className={styles.courseAddOnCopy}>
                                        <b>
                                          <AppIcon icon={Wrench} /> {course.kitName || 'Đồ nghề học viên'}
                                        </b>
                                      </span>
                                      <strong>
                                        {kitSelected && kitQuote
                                          ? formatVND(kitQuote.finalPriceVnd)
                                          : formatVND(course.kitPriceVnd)}
                                      </strong>
                                      <i>{kitSelected ? <AppIcon icon={CircleCheck} /> : <AppIcon icon={Plus} />}</i>
                                      <small className={styles.courseAddOnReward}>{kitRewardLabel}</small>
                                    </button>
                                  </div>
                                  <div className={styles.courseInvestment}>
                                    <span>Tổng đầu tư</span>
                                    <strong>{formatVND(totalInvestment)}</strong>
                                    <small>{courseRewardLabel}</small>
                                  </div>
                                  <small className={styles.coursePickerRule}>
                                    {courseRule.kind === 'COMBO'
                                      ? 'Combo trọn gói · chọn riêng'
                                      : 'Khóa học lẻ · có thể chọn nhiều'}
                                  </small>
                                </article>
                              );
                            })}
                          </div>
                        ) : (
                          <StatePanel
                            kind="empty"
                            surface={false}
                            title="Chưa có khóa học đang dùng"
                            description="Admin hoặc Manager cần kích hoạt khóa học ở danh mục Academy trước."
                          />
                        )}
                      </section>
                    </>
                  )}
                </section>
              )}
            </div>
          )}

          {scholarshipRewardFlight && <ScholarshipRewardFlightOverlay flight={scholarshipRewardFlight} />}

          {lead && !loading && step === 2 && (
            <AdaptiveOverlayFooter className={styles.footer}>
              <div className={styles.footerSummaryWrap}>
                <div className={styles.selectionSummary} aria-label="Tóm tắt học phí Tố Chất">
                  <div
                    ref={scholarshipTargetRef}
                    className={styles.courseScholarshipFooter}
                    data-celebrating={scholarshipTargetReady && scholarshipCelebration ? 'true' : undefined}
                    data-flight-pending={scholarshipTargetReady ? undefined : 'true'}
                    data-has-course-selection={selectedCourseRewardAmounts ? 'true' : undefined}
                  >
                    {scholarshipTargetReady && (
                      <ScholarshipRewardSummary
                        className={`${styles.scholarshipRewardSummary} ${styles.courseScholarshipFooterSummary}`}
                        headline={rewardHeadline}
                        scholarshipPct={effectiveRewards.scholarshipPct}
                        sampleRewardPct={effectiveRewards.sampleRewardPct}
                        kitRewardPct={effectiveRewards.kitRewardPct}
                        rewardAmounts={selectedCourseRewardAmounts}
                        showTotalReward
                      />
                    )}
                    {scholarshipTargetReady && <ScholarshipFireworks celebration={scholarshipCelebration} />}
                  </div>
                  {courseSelectionReady && (
                    <div className={styles.salesDockCheckout}>
                      <div className={styles.salesDockPaymentHeader}>Hình thức thanh toán</div>
                      <div
                        className={styles.salesDockPaymentModes}
                        role="group"
                        aria-label={
                          hasSelectedCourses
                            ? 'Hình thức học phí'
                            : 'Hình thức học phí — chọn ít nhất một khóa học để tiếp tục'
                        }
                      >
                        <button
                          type="button"
                          aria-pressed={hasSelectedCourses && draft.paymentMode === 'DEPOSIT'}
                          disabled={paymentChoiceDisabled}
                          title={paymentChoiceHint}
                          onClick={() =>
                            updateQuoteDraft((current) => ({
                              ...current,
                              paymentMode: 'DEPOSIT',
                              depositVnd: current.depositVnd ?? pricing?.suggestedDepositVnd ?? null,
                            }))
                          }
                        >
                          <span>Cọc học bổng</span>
                          <strong>{formatVND(draft.depositVnd ?? pricing?.suggestedDepositVnd ?? 0)}</strong>
                        </button>
                        <button
                          type="button"
                          aria-pressed={hasSelectedCourses && draft.paymentMode === 'FULL'}
                          disabled={paymentChoiceDisabled}
                          title={paymentChoiceHint}
                          onClick={() => updateQuoteDraft((current) => ({ ...current, paymentMode: 'FULL' }))}
                        >
                          <span>Đầu tư trọn gói</span>
                          <strong>{formatVND(pricing?.finalTotalVnd || 0)}</strong>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {courseSelectionReady && (
                <div className={styles.salesDockActionSection}>
                  <div className={styles.salesDockPaymentHeader}>Đầu tư ngay</div>
                  <Space className={styles.salesDockActions}>
                    <Tooltip
                      title={
                        isIssued
                          ? 'Phiếu đã thanh toán đủ'
                          : hasPrintedInvoice
                            ? 'Lưu điều chỉnh trước khi in phiên bản mới'
                            : 'Lưu lựa chọn'
                      }
                    >
                      <Button
                        aria-label={
                          isIssued ? 'Phiếu đã thanh toán đủ' : hasPrintedInvoice ? 'Lưu điều chỉnh' : 'Lưu lựa chọn'
                        }
                        icon={<AppIcon icon={Save} />}
                        disabled={isIssued}
                        loading={!isIssued && isBusy}
                        onClick={() => void saveSelection()}
                      >
                        {isIssued ? 'Đã chốt' : hasPrintedInvoice ? 'Lưu điều chỉnh' : 'Lưu'}
                      </Button>
                    </Tooltip>
                    <Tooltip
                      title={
                        isIssued
                          ? 'Xem & in lại phiếu đã thanh toán'
                          : hasPrintedInvoice
                            ? 'Xem và in phiên bản điều chỉnh'
                            : 'Xem trước hóa đơn trước khi lập và in'
                      }
                    >
                      <Button
                        aria-label={
                          isIssued
                            ? 'Xem & in lại phiếu đã thanh toán'
                            : hasPrintedInvoice
                              ? 'Xem và in phiên bản điều chỉnh'
                              : 'Xem trước hóa đơn trước khi lập và in'
                        }
                        type="primary"
                        icon={<AppIcon icon={Printer} />}
                        loading={isBusy}
                        disabled={!isIssued && !draft.selectedCourseIds.length}
                        onClick={openInvoicePreview}
                      >
                        {isIssued ? 'In lại' : hasPrintedInvoice ? 'In phiên bản mới' : 'In phiếu'}
                      </Button>
                    </Tooltip>
                  </Space>
                </div>
              )}
            </AdaptiveOverlayFooter>
          )}

          {lead && printView && printDocument === 'INVOICE' && (
            <div className={styles.printOnly} aria-hidden="true">
              <AcademyTalentInvoice lead={lead} assessment={printView} />
            </div>
          )}
          {lead && paymentSlipOpen && printDocument === 'FOLLOW_UP' && (printView || displayView) && (
            <div className={styles.printOnly} aria-hidden="true">
              <AcademyTalentFollowUpPaymentSlip
                lead={lead}
                assessment={printView || displayView!}
                amountVnd={Math.round(Number(paymentAmountVnd) || 0)}
                method={paymentMethod}
                reference={paymentReference}
              />
            </div>
          )}
        </div>
      </AdaptiveModal>

      <AdaptiveModal
        className={styles.invoicePreviewModal}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => setPrintPreviewOpen(false)}>
            Quay lại workshop
          </Button>,
          printView?.invoice && printView.payment.status !== 'PAID' && (
            <Button key="follow-up" onClick={openPaymentFollowUp}>
              Follow-up thanh toán
            </Button>
          ),
          <Button
            key="print"
            type="primary"
            icon={<AppIcon icon={Printer} />}
            loading={isBusy}
            onClick={() => void issueInvoiceAndOpenPreview(true)}
          >
            {printView?.payment.status === 'PAID'
              ? 'In lại phiếu đã thanh toán'
              : printView?.invoice
                ? 'In phiên bản mới'
                : 'Lập phiếu & mở hộp thoại in'}
          </Button>,
        ]}
        intent="detail"
        open={printPreviewOpen && Boolean(lead && printView)}
        title="Xem trước phiếu học phí"
        zIndex={11060}
        onCancel={() => setPrintPreviewOpen(false)}
      >
        {lead && printView && (
          <>
            {!printView.invoice && (
              <Alert
                showIcon
                type="info"
                message="Bản xem trước hóa đơn"
                description="Nội dung sẽ được chốt thành phiếu chính thức khi bạn bấm “Lập phiếu & mở hộp thoại in”."
              />
            )}
            {printView.invoice && printView.payment.status !== 'PAID' && (
              <Alert
                showIcon
                type="warning"
                message="Phiếu đã in, đang chờ thanh toán"
                description={`Đã xác nhận ${formatVND(printView.payment.totalPaidVnd)}; còn ${formatVND(printView.payment.remainingVnd)}. Phiếu vẫn có thể điều chỉnh và in phiên bản mới cho đến khi thanh toán đủ.`}
              />
            )}
            {printView.payment.status === 'PAID' && (
              <Alert
                showIcon
                type="success"
                message="Đã thanh toán đủ — phiếu được khóa"
                description="Mọi khoản tiền đã được xác nhận. Bạn chỉ có thể in lại chứng từ đã chốt."
              />
            )}
            <div className={styles.invoicePreviewSheet}>
              <AcademyTalentInvoice lead={lead} assessment={printView} className={styles.invoicePreviewInvoice} />
            </div>
          </>
        )}
      </AdaptiveModal>

      <AdaptiveModal
        className={styles.paymentFollowUpModal}
        destroyOnClose
        footer={[
          <Button key="payment-slip" icon={<AppIcon icon={Printer} />} onClick={openPaymentSlipPreview}>
            Lập phiếu thanh toán
          </Button>,
          <Button key="cancel" onClick={() => setPaymentFollowUpOpen(false)}>
            Đóng
          </Button>,
          canConfirmPayment && (
            <Button
              key="confirm"
              type="primary"
              loading={busyAction === 'payment'}
              onClick={() => void recordPayment()}
            >
              Xác nhận đã nhận tiền
            </Button>
          ),
        ]}
        intent="detail"
        open={paymentFollowUpOpen && Boolean(printView || displayView)}
        title="Follow-up thanh toán học phí"
        zIndex={11070}
        onCancel={() => setPaymentFollowUpOpen(false)}
      >
        {(() => {
          const paymentView = printView || displayView;
          if (!paymentView) return null;
          const isPaid = paymentView.payment.status === 'PAID';
          return (
            <div className={styles.paymentFollowUpPage}>
              <div className={styles.paymentFollowUpSummary}>
                <div>
                  <span>Trạng thái</span>
                  <strong>
                    {isPaid
                      ? 'Đã thanh toán đủ'
                      : paymentView.payment.status === 'DEPOSIT_RECEIVED'
                        ? 'Đã cọc · cần follow-up'
                        : 'Đang chờ thanh toán'}
                  </strong>
                </div>
                <div>
                  <span>Đã nhận</span>
                  <strong>{formatVND(paymentView.payment.totalPaidVnd)}</strong>
                </div>
                <div>
                  <span>Còn lại</span>
                  <strong>{formatVND(paymentView.payment.remainingVnd)}</strong>
                </div>
              </div>
              {isPaid ? (
                <Alert type="success" showIcon message="Phiếu đã được khóa sau khi nhận đủ tiền." />
              ) : (
                <>
                  <Alert
                    type="info"
                    showIcon
                    message={
                      paymentView.payment.status === 'DEPOSIT_RECEIVED'
                        ? 'Cần follow-up phần học phí còn lại'
                        : 'Lập phiếu trước, xác nhận tiền sau khi đối soát'
                    }
                    description={`Chọn chuyển khoản để lập QR hoặc tiền mặt để lập phiếu nộp quầy. Phần còn lại hiện là ${formatVND(paymentView.payment.remainingVnd)}.`}
                  />
                  <div
                    className={styles.paymentMethodSelection}
                    role="radiogroup"
                    aria-label="Phương thức thanh toán follow-up"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === 'BANK_TRANSFER'}
                      className={
                        paymentMethod === 'BANK_TRANSFER'
                          ? styles.paymentMethodChoiceActive
                          : styles.paymentMethodChoice
                      }
                      onClick={() => setPaymentMethod('BANK_TRANSFER')}
                    >
                      <AppIcon icon={Landmark} />
                      <span>
                        Chuyển khoản<small>Lập QR cho đúng số tiền</small>
                      </span>
                      {paymentMethod === 'BANK_TRANSFER' && <AppIcon icon={CircleCheck} />}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === 'CASH'}
                      className={
                        paymentMethod === 'CASH' ? styles.paymentMethodChoiceActive : styles.paymentMethodChoice
                      }
                      onClick={() => setPaymentMethod('CASH')}
                    >
                      <AppIcon icon={CircleDollarSign} />
                      <span>
                        Tiền mặt<small>Lập phiếu nộp tiền tại quầy</small>
                      </span>
                      {paymentMethod === 'CASH' && <AppIcon icon={CircleCheck} />}
                    </button>
                  </div>
                  <div className={styles.paymentFollowUpForm}>
                    <label>
                      Số tiền cần lập phiếu (VNĐ)
                      <InputNumber
                        min={1}
                        max={paymentView.payment.remainingVnd}
                        precision={0}
                        value={paymentAmountVnd}
                        onChange={(value) => setPaymentAmountVnd(typeof value === 'number' ? value : null)}
                      />
                    </label>
                    <label>
                      {paymentMethod === 'BANK_TRANSFER'
                        ? 'Mã giao dịch / nội dung chuyển khoản'
                        : 'Số phiếu thu / người nộp'}
                      <Input
                        value={paymentReference}
                        maxLength={160}
                        onChange={(event) => setPaymentReference(event.target.value)}
                        placeholder={
                          paymentMethod === 'BANK_TRANSFER' ? 'Ví dụ: MBVCB.123456' : 'Ví dụ: PT-000123 / Nguyễn Thị A'
                        }
                      />
                    </label>
                    <label className={styles.paymentFollowUpFieldFull}>
                      Ghi chú đối soát
                      <Input.TextArea
                        value={paymentNote}
                        rows={3}
                        onChange={(event) => setPaymentNote(event.target.value)}
                        placeholder={
                          paymentMethod === 'BANK_TRANSFER'
                            ? 'Ghi nhận sau khi kiểm tra sao kê'
                            : 'Ghi nhận sau khi thu ngân kiểm đếm'
                        }
                      />
                    </label>
                  </div>
                  {!canConfirmPayment && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Chờ quản lý xác nhận giao dịch"
                      description="Bạn có thể lập phiếu chuyển khoản hoặc tiền mặt ở trên. Chỉ admin hoặc quản lý mới xác nhận khoản thu sau khi đối soát."
                    />
                  )}
                  {canConfirmPayment && (
                    <p className={styles.paymentConfirmationHint}>
                      Chỉ bấm “Xác nhận đã nhận tiền” sau khi đã đối soát{' '}
                      {paymentMethod === 'CASH' ? 'tiền mặt thực nhận' : 'sao kê ngân hàng'}.
                    </p>
                  )}
                </>
              )}
              <section className={styles.paymentHistory}>
                <h3>Lịch sử tiền đã xác nhận</h3>
                {paymentView.payment.payments.length ? (
                  paymentView.payment.payments.map((payment) => (
                    <div key={payment.id} className={styles.paymentHistoryItem}>
                      <div>
                        <strong>{formatVND(payment.amountVnd)}</strong>
                        <span>
                          {payment.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'} ·{' '}
                          {payment.reference || 'Chưa có mã giao dịch'}
                        </span>
                      </div>
                      <div>
                        <span>{new Date(payment.receivedAt).toLocaleString('vi-VN')}</span>
                        <span>{payment.confirmedBy?.displayName || 'Hệ thống'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>Chưa có khoản tiền nào được xác nhận.</p>
                )}
              </section>
            </div>
          );
        })()}
      </AdaptiveModal>

      <AdaptiveModal
        className={styles.paymentSlipPreviewModal}
        destroyOnClose
        footer={[
          <Button key="back" onClick={() => setPaymentSlipOpen(false)}>
            Quay lại follow-up
          </Button>,
          <Button key="print" type="primary" icon={<AppIcon icon={Printer} />} onClick={printPaymentSlip}>
            In phiếu {paymentMethod === 'BANK_TRANSFER' ? 'chuyển khoản' : 'nộp tiền mặt'}
          </Button>,
        ]}
        intent="detail"
        open={paymentSlipOpen && Boolean(lead && (printView || displayView))}
        title="Xem trước phiếu yêu cầu thanh toán"
        zIndex={11080}
        onCancel={() => setPaymentSlipOpen(false)}
      >
        {lead && (printView || displayView) && (
          <div className={styles.paymentSlipPreviewSheet}>
            <AcademyTalentFollowUpPaymentSlip
              lead={lead}
              assessment={printView || displayView!}
              amountVnd={Math.round(Number(paymentAmountVnd) || 0)}
              method={paymentMethod}
              reference={paymentReference}
            />
          </div>
        )}
      </AdaptiveModal>

      {canManageCourses && onSaveCourseConfiguration && (
        <AcademyTalentCourseConfigurationModal
          open={courseConfigurationOpen}
          courses={courses}
          onCancel={closeGlobalEditor}
          onSave={onSaveCourseConfiguration}
        />
      )}

      <AdaptiveModal
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={closeGlobalEditor}>
            Hủy
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={savingLadderConfiguration}
            onClick={() => void saveLadderConfiguration()}
          >
            Lưu toàn cục
          </Button>,
        ]}
        className={styles.ladderEditorModal}
        intent="detail"
        open={Boolean(ladderConfigurationDraft)}
        title={
          <div className={styles.ladderEditorModalTitle}>
            <span>Cấu hình toàn bộ bậc thang quyền lợi</span>
            <small>Chính sách dùng chung cho Academy</small>
          </div>
        }
        zIndex={11070}
        onCancel={closeGlobalEditor}
      >
        {ladderConfigurationDraft && (
          <div className={styles.ladderEditor}>
            <section className={styles.ladderEditorIntro}>
              <div>
                <span className={styles.ladderEditorEyebrow}>BẢNG QUYỀN LỢI TOÀN CỤC</span>
                <p>
                  Thêm, sửa hoặc xoá mốc trực tiếp. Hệ thống tự sắp xếp theo số sợi khi lưu và áp dụng cho báo giá mới.
                </p>
              </div>
              <div className={styles.ladderEditorCount}>
                <strong className="tabular-nums">{ladderConfigurationDraft.length}</strong>
                <span>mốc đang cấu hình</span>
              </div>
            </section>

            <div className={styles.ladderEditorToolbar}>
              <span>Mốc số sợi phải khác nhau · tối đa 10 mốc</span>
              <Space size={8} wrap>
                <Popconfirm
                  cancelText="Giữ bản nháp"
                  okText="Khôi phục"
                  title="Khôi phục 6 mốc Academy mặc định?"
                  onConfirm={() => setLadderConfigurationDraft(defaultLadderConfigurationDraft())}
                >
                  <Button size="small">Khôi phục mặc định</Button>
                </Popconfirm>
                <Button
                  type="primary"
                  size="small"
                  icon={<AppIcon icon={Plus} />}
                  disabled={
                    ladderConfigurationDraft.length >= 10 ||
                    Math.max(...ladderConfigurationDraft.map((tier) => tier.strands)) >=
                      ACADEMY_TALENT_STRANDS_5_MIN_MAX
                  }
                  onClick={addLadderConfigurationTier}
                >
                  Thêm mốc
                </Button>
              </Space>
            </div>

            <div className={styles.ladderEditorTableWrap}>
              <table className={styles.ladderEditorTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Mốc</th>
                    <th>Sợi</th>
                    <th>Học phí (%)</th>
                    <th>Mẫu (%)</th>
                    <th>Đồ nghề (%)</th>
                    <th>Độ cao (%)</th>
                    <th aria-label="Thao tác" />
                  </tr>
                </thead>
                <tbody>
                  {ladderConfigurationDraft.map((tier, index) => {
                    const tierLabel = tier.title.trim() || `mốc ${index + 1}`;
                    return (
                      <tr key={tier.key}>
                        <td>
                          <span className={styles.ladderEditorIndex}>{index + 1}</span>
                        </td>
                        <td>
                          <Input
                            aria-label={`Tên bubble ${tierLabel}`}
                            maxLength={80}
                            value={tier.title}
                            onChange={(event) =>
                              updateLadderConfigurationDraft(tier.key, { title: event.target.value })
                            }
                          />
                        </td>
                        <td>
                          <InputNumber
                            aria-label={`Mốc số sợi ${tierLabel}`}
                            min={1}
                            max={ACADEMY_TALENT_STRANDS_5_MIN_MAX}
                            precision={0}
                            value={tier.strands}
                            onChange={(value) =>
                              updateLadderConfigurationDraft(tier.key, {
                                strands: clampInteger(value, 1, ACADEMY_TALENT_STRANDS_5_MIN_MAX),
                              })
                            }
                          />
                        </td>
                        <td>
                          <InputNumber
                            aria-label={`Học phí ${tierLabel}`}
                            min={0}
                            max={100}
                            precision={0}
                            value={tier.scholarshipPercent}
                            onChange={(value) =>
                              updateLadderConfigurationDraft(tier.key, {
                                scholarshipPercent: clampInteger(value, 0, 100),
                              })
                            }
                          />
                        </td>
                        <td>
                          <InputNumber
                            aria-label={`Ưu đãi mẫu ${tierLabel}`}
                            min={0}
                            max={100}
                            precision={0}
                            value={tier.sampleRewardPercent}
                            onChange={(value) =>
                              updateLadderConfigurationDraft(tier.key, {
                                sampleRewardPercent: clampInteger(value, 0, 100),
                              })
                            }
                          />
                        </td>
                        <td>
                          <InputNumber
                            aria-label={`Ưu đãi đồ nghề ${tierLabel}`}
                            min={0}
                            max={100}
                            precision={0}
                            value={tier.kitRewardPercent}
                            onChange={(value) =>
                              updateLadderConfigurationDraft(tier.key, {
                                kitRewardPercent: clampInteger(value, 0, 100),
                              })
                            }
                          />
                        </td>
                        <td>
                          <InputNumber
                            aria-label={`Độ cao bubble ${tierLabel}`}
                            min={0}
                            max={80}
                            precision={0}
                            value={tier.bubbleHeightPercent}
                            onChange={(value) =>
                              updateLadderConfigurationDraft(tier.key, {
                                bubbleHeightPercent: clampInteger(value, 0, 80),
                              })
                            }
                          />
                        </td>
                        <td>
                          <Popconfirm
                            cancelText="Giữ lại"
                            disabled={ladderConfigurationDraft.length <= 1}
                            okButtonProps={{ danger: true }}
                            okText="Xoá mốc"
                            title={`Xoá “${tierLabel}” khỏi bảng quyền lợi?`}
                            onConfirm={() => deleteLadderConfigurationTier(tier.key)}
                          >
                            <Tooltip
                              title={
                                ladderConfigurationDraft.length <= 1 ? 'Cần giữ ít nhất một mốc' : `Xoá ${tierLabel}`
                              }
                            >
                              <Button
                                aria-label={`Xoá mốc ${tierLabel}`}
                                danger
                                type="text"
                                icon={<AppIcon icon={Trash2} />}
                                disabled={ladderConfigurationDraft.length <= 1}
                              />
                            </Tooltip>
                          </Popconfirm>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AdaptiveModal>
    </>
  );
}

function RatingCard({
  title,
  description,
  icon,
  tone,
  value,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: 'cyan' | 'orange';
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const visibleStars = clampInteger(value, 0, 4) + 1;
  const scoreLabel = RATING_LABELS[clampInteger(value, 0, 4)];
  const caption = description.startsWith(`${value}đ:`) ? description : `${value}đ: ${scoreLabel} · ${description}`;

  return (
    <div className={`${styles.ratingCard} ${tone === 'orange' ? styles.ratingOrange : styles.ratingCyan}`}>
      <span className={styles.ratingIcon}>{icon}</span>
      <div className={styles.ratingCopy}>
        <strong>{title}</strong>
        <small>
          <b>{caption}</b>
        </small>
      </div>
      <Rate
        count={5}
        value={visibleStars}
        disabled={disabled}
        character={<AppIcon icon={Star} fill="currentColor" />}
        aria-label={`${title}: ${value} điểm (${scoreLabel}), hiển thị ${visibleStars} trên 5 sao`}
        onChange={(stars) => onChange(clampInteger(stars - 1, 0, 4))}
      />
    </div>
  );
}

function WorkshopSectionHeader({
  index,
  title,
  titleId,
  hint,
}: {
  index: string;
  title: string;
  titleId: string;
  hint?: string;
}) {
  return (
    <div className={styles.sectionTitle}>
      <span>{index}</span>
      <h3 id={titleId}>{title}</h3>
      {hint && <small className={styles.sectionHint}>{hint}</small>}
    </div>
  );
}

function ResultStat({
  label,
  value,
  tone,
  rewardVnd,
}: {
  label: string;
  value: string;
  tone: 'gold' | 'cyan' | 'amber';
  rewardVnd?: number;
}) {
  return (
    <div
      className={`${styles.resultStat} ${styles[`resultStat${tone[0].toUpperCase()}${tone.slice(1)}`]}`}
      data-has-amount={rewardVnd !== undefined ? 'true' : undefined}
    >
      <span>{label}</span>
      <strong className="tabular-nums">{value}</strong>
      {rewardVnd !== undefined && (
        <small className={`${styles.resultStatAmount} tabular-nums`}>Giá trị {formatVND(rewardVnd)}</small>
      )}
    </div>
  );
}

const ScholarshipRewardSummary = React.forwardRef<
  HTMLDivElement,
  {
    className: string;
    headline: string;
    scholarshipPct: number;
    sampleRewardPct: number;
    kitRewardPct: number;
    showTotalReward?: boolean;
    rewardAmounts?: {
      scholarshipVnd: number;
      sampleVnd: number;
      kitVnd: number;
    };
  }
>(function ScholarshipRewardSummary(
  { className, headline, scholarshipPct, sampleRewardPct, kitRewardPct, rewardAmounts, showTotalReward = false },
  ref
) {
  const totalRewardVnd =
    (rewardAmounts?.scholarshipVnd ?? 0) + (rewardAmounts?.sampleVnd ?? 0) + (rewardAmounts?.kitVnd ?? 0);

  return (
    <div ref={ref} className={className} data-has-total-reward={showTotalReward ? 'true' : undefined}>
      <h3 aria-live="polite">{headline}</h3>
      <div className={styles.resultStats}>
        <ResultStat
          label="Học bổng"
          value={`${scholarshipPct}%`}
          tone="gold"
          rewardVnd={rewardAmounts?.scholarshipVnd}
        />
        <ResultStat label="Ưu đãi mẫu" value={`${sampleRewardPct}%`} tone="cyan" rewardVnd={rewardAmounts?.sampleVnd} />
        <ResultStat label="Đồ nghề" value={`${kitRewardPct}%`} tone="amber" rewardVnd={rewardAmounts?.kitVnd} />
        {showTotalReward && <ResultStat label="Tổng thưởng" value={formatVND(totalRewardVnd)} tone="gold" />}
      </div>
    </div>
  );
});

ScholarshipRewardSummary.displayName = 'ScholarshipRewardSummary';

function ScholarshipRewardFlightOverlay({ flight }: { flight: ScholarshipRewardFlight }) {
  const flightStyle = {
    '--scholarship-flight-x': `${flight.deltaX}px`,
    '--scholarship-flight-y': `${flight.deltaY}px`,
    '--scholarship-flight-x-18': `${flight.deltaX * 0.18}px`,
    '--scholarship-flight-y-18': `${flight.deltaY * 0.18}px`,
    '--scholarship-flight-x-82': `${flight.deltaX * 0.82}px`,
    '--scholarship-flight-y-82': `${flight.deltaY * 0.82}px`,
    '--scholarship-flight-scale': String(flight.scale),
    '--scholarship-flight-overshoot-scale': String(flight.scale * 1.08),
    left: `${flight.fromX}px`,
    top: `${flight.fromY}px`,
    width: `${flight.width}px`,
  } as React.CSSProperties;

  return (
    <div aria-hidden="true" className={styles.scholarshipRewardFlight} key={flight.id} style={flightStyle}>
      <ScholarshipRewardSummary
        className={`${styles.scholarshipRewardSummary} ${styles.scholarshipRewardFlightSummary}`}
        headline={flight.headline}
        scholarshipPct={flight.scholarshipPct}
        sampleRewardPct={flight.sampleRewardPct}
        kitRewardPct={flight.kitRewardPct}
      />
    </div>
  );
}

function ScholarshipFireworks({ celebration }: { celebration: ScholarshipCelebration | null }) {
  if (!celebration || celebration.intensity === 0) return null;
  const burstCount = celebration.intensity === 1 ? 3 : celebration.intensity === 2 ? 5 : SCHOLARSHIP_FIREWORKS.length;

  return (
    <div aria-hidden="true" className={styles.scholarshipFireworks} key={celebration.id}>
      {SCHOLARSHIP_FIREWORKS.slice(0, burstCount).map((burst, index) => (
        <span
          key={`${celebration.id}-${index}`}
          className={styles.scholarshipFireworkBurst}
          style={
            {
              '--scholarship-firework-color': burst.color,
              '--scholarship-firework-delay': burst.delay,
              left: burst.left,
              top: burst.top,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function ErrorCounter({
  title,
  description,
  icon,
  value,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  value: number;
  disabled: boolean;
  onChange: (delta: number) => void;
}) {
  return (
    <div className={`${styles.errorCard} ${value > 0 ? styles.errorCardHasErrors : ''}`}>
      <div className={styles.errorCopy}>
        <span className={styles.errorIcon}>{icon}</span>
        <div>
          <strong>{title}</strong>
          <small>{description}</small>
        </div>
      </div>
      <div className={styles.counterControls}>
        <Button
          aria-label={`Giảm lỗi ${title}`}
          icon={<AppIcon icon={Minus} />}
          disabled={disabled || value <= 0}
          onClick={() => onChange(-1)}
        />
        <strong className="tabular-nums" aria-label={`${value} lỗi ${title}`}>
          {value}
        </strong>
        <Button
          aria-label={`Tăng lỗi ${title}`}
          icon={<AppIcon icon={Plus} />}
          disabled={disabled}
          onClick={() => onChange(1)}
        />
      </div>
    </div>
  );
}

export default AcademyTalentWorkshopDrawer;

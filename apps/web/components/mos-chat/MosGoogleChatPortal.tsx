'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Tooltip,
  Modal,
  Input,
  Select,
  Popover,
  Popconfirm,
  DatePicker,
  Switch,
  Dropdown,
  message as antdMessageStatic,
  notification as notificationStatic,
  theme,
} from 'antd';
import {
  MessageSquare,
  MessageSquareReply,
  Flag,
  AlarmClock,
  AlarmClockPlus,
  Calendar,
  BellRing,
  Pin,
  SmilePlus,
  SendHorizontal,
  UserRoundPlus,
  AtSign,
  Minimize2,
  Maximize2,
  X,
  Plus,
  Hash,
  Inbox,
  Mail,
  CheckSquare,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  PanelRightOpen,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Minus,
  ImagePlus,
  HardDrive,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Bot,
  Sparkles,
  ShieldCheck,
  Sliders,
  Trash2,
  Volume2,
  VolumeX,
  Settings,
  Copy,
  Users,
  UserMinus,
  UserPlus,
  Bookmark,
  MoreVertical,
  PinOff,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  FolderPlus,
  FolderKanban,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  LogOut,
  MailOpen,
  Pencil,
  History,
  Bold,
  Italic,
  Strikethrough,
  Underline,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Type,
  Rocket,
  CheckCircle2,
  RefreshCw,
  CornerDownRight,
  ArrowUpRight,
  Archive,
  ArchiveRestore,
  CalendarClock,
  AlertTriangle,
  Handshake,
  Activity,
  Zap,
  FilePenLine,
  Table as TableIcon,
  Sigma,
  GitFork,
  Heading1,
  Heading2,
  Heading3,
  Columns2,
  Link as LinkIcon,
  SquareCode,
  PenLine,
  Send,
  UserCheck,
  Paperclip,
  FileText,
  FileSpreadsheet,
  FileArchive,
  File,
  Download,
} from 'lucide-react';
import {
  MosChatRichEditorModal,
  detectActiveFormatsAtCursor,
  handleSmartListEnterKey,
  QUICK_TEXT_COLORS,
  type RichEditorViewMode,
} from './MosChatRichEditorModal';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { formatRelativeTime } from '../../lib/date-utils';

dayjs.extend(relativeTime);
import type {
  MosChatMessageEditHistoryItem,
  MosChatAccessConfig,
  MosChatBuzzEvent,
  MosChatConversation,
  MosChatCustomSection,
  MosChatCustomerCard,
  MosChatImageAttachment,
  MosChatImageMimeType,
  MosChatMessage,
  MosChatMissionActionType,
  MosChatMissionSummary,
  MosChatReadReceiptEntry,
  MosChatThreadMoveMode,
  MosChatThreadReadReceiptEntry,
  MosChatThreadReply,
  MosChatPresenceStatus,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatTaskPriority,
  UpdateMosChatTaskRequest,
  MosChatUserSidebarPrefs,
  MosChatNotificationMode,
  MosChatChannelNotificationOverride,
  MosChatWorkflowInstance,
  MosChatWorkflowTemplate,
  SafeAny,
} from '@mos-lab/shared';
import { hexToRgba, isCanonicalSuperAdminIdentity, removeVietnameseTones } from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../lib/api-client';
import { resolveMediaUrl } from '../../lib/api-base-url';
import { playNeuralSpeech, stopSpeaking, setNeuralSpeechSpeed } from '../voice-assistant/speech-utils';
import {
  MosChatStickerAndEmojiPicker,
  MosChatStickerVisual,
  formatChatPreviewWithStickers,
  formatStickerToken,
  parsePureStickerMessage,
  parseStickerReactionKey,
  type MosChatStickerItem,
} from './mos-chat-stickers';
import {
  AI_COPILOT_CONV_ID,
  AI_COPILOT_GROUP_ACCESS_KEY,
  AI_QUICK_PROMPTS,
  DEADLINE_PRESETS,
  FALLBACK_CONVERSATIONS,
  FALLBACK_TASKS,
  GOOGLE_CHAT_QUICK_EMOJIS,
  GOOGLE_CHAT_REACTION_EMOJIS,
  REMINDER_PRESETS,
  SAMPLE_CUSTOMER_CARDS,
  SPACE_DEPARTMENT_AND_TEAM_GROUPS,
  STAFF_DIRECTORY_CACHE_KEY,
  WINGS_SIGNATURE_EMOJIS,
  getInitialStaffDirectory,
  isSpaceEmoji,
  type SpaceDepartmentOrTeamGroup,
} from './constants/chat-constants';
import { MosChatSpaceEmojiColorPicker } from './MosChatSpaceEmojiColorPicker';
import { MosChatSpaceConfigModal } from './MosChatSpaceConfigModal';
import {
  buildMaiUrgentVoiceAnnouncement,
  cleanTextForUrgentVoiceAnnouncement,
  formatCountdown,
  getTaskDeadlineInfo,
  isUserMentionedInText,
  matchesStaffGroup,
  parseGoogleDriveImageFromText,
  playWebAudioBuzzChime,
  playWebAudioReminderChime,
  readOrCompressImagePayload,
  triggerBuzzVibration,
  isImageAttachment,
  isPdfAttachment,
  formatFileSize,
  getFileExtension,
  formatBackendAiMessage,
} from './utils/chat-helpers';
import { useMosChatBridgeListener } from './store/mos-chat-bridge';
import { mergeDeltaConversations, mergeDeltaTasks, useChatRealtimeSync } from './store/useChatRealtimeSync';
import { MosChatWorkflowCard } from './workflows/MosChatWorkflowCard';
import { MosChatSaveThreadWorkflowModal, MosChatTriggerWorkflowModal } from './workflows/MosChatWorkflowModals';
import { MosChatMermaidBlock } from './MosChatMermaidBlock';
import { MosChatMathBlock, MosChatMathInline, isMathValid } from './MosChatMathBlock';
import { MosChatRichText } from './MosChatRichText';
import { MosChatProvider } from './context/MosChatContext';
import { MosChatMobileApp } from './mobile/MosChatMobileApp';
import { MosChatSidebar } from './components/MosChatSidebar';
import { MosChatMessageFeed } from './components/MosChatMessageFeed';
import { MosChatComposer } from './components/MosChatComposer';
import { MosChatThreadDrawer } from './components/MosChatThreadDrawer';
import { MosChatModals } from './components/MosChatModals';
import { MosChatNotificationSettingsModal } from './components/MosChatNotificationSettings';
import { MosChatTasksPane } from './components/MosChatTasksPane';
import { MosChatPinnedPane } from './components/MosChatPinnedPane';
import {
  MosChatDockedWindows,
  DOCKED_STORAGE_KEY_V2,
  type MosChatDockDimension,
} from './components/MosChatDockedWindows';
import { MosChatReminderAlert } from './components/MosChatReminderAlert';
import { tabNotificationManager, playMessengerChime, showDesktopNotification } from '../../lib/tab-notification';
import dynamic from 'next/dynamic';

const CustomerDetailDrawer = dynamic(() => import('../CustomerDetailDrawer'), { ssr: false });

export { AI_COPILOT_CONV_ID };

export interface MosGoogleChatPortalProps {
  open: boolean;
  standalone?: boolean;
  onOpen?: () => void;
  onClose: () => void;
  onToggle: () => void;
  currentUser?: SafeAny;
  onAccessChange?: (canAccess: boolean) => void;
  onUnreadCountChange?: (unreadCount: number, activeTaskCount: number) => void;
  targetNavigation?: {
    conversationId?: string;
    messageId?: string;
    timestamp?: number;
    openTab?: 'chat' | 'tasks' | 'pinned';
    taskId?: string;
  } | null;
}

const LiveTaskCountdownBadge: React.FC<{ remindAt: string }> = React.memo(({ remindAt }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <span>{formatCountdown(remindAt, now)}</span>;
});
LiveTaskCountdownBadge.displayName = 'LiveTaskCountdownBadge';

export const MosGoogleChatPortal: React.FC<MosGoogleChatPortalProps> = ({
  open,
  standalone = false,
  onOpen,
  onClose,
  onToggle,
  currentUser,
  onAccessChange,
  onUnreadCountChange,
  targetNavigation,
}) => {
  const { themeMode, activeThemeDefinition } = useTheme();
  const { token } = theme.useToken();
  const isDark = themeMode === 'dark';
  const [antdMessage, messageContextHolder] = antdMessageStatic.useMessage();
  const [notification, notificationContextHolder] = notificationStatic.useNotification({
    maxCount: 3, // Anti-flooding: max 3 toasts visible simultaneously
  });

  const activeMode =
    activeThemeDefinition.modes[themeMode] ?? activeThemeDefinition.modes[activeThemeDefinition.defaultMode];
  const currentModeColors = activeMode.colors;
  const currentModeSemantic = activeMode.semantic;
  const surfaceBg = currentModeSemantic.surface;
  const surfaceRaised = currentModeSemantic.surfaceRaised;
  const canvasBg = currentModeColors.bgLayout;
  const borderColor = currentModeSemantic.border;
  const borderStrong = currentModeSemantic.borderStrong;
  const accentColor = currentModeSemantic.accent;
  const accentContrast = currentModeSemantic.accentContrast;
  const accentSoftBg = hexToRgba(accentColor, isDark ? 0.16 : 0.12);
  const accentBorder = hexToRgba(accentColor, isDark ? 0.38 : 0.34);

  const [conversations, setConversations] = useState<MosChatConversation[]>(FALLBACK_CONVERSATIONS);
  const [tasks, setTasks] = useState<MosChatTaskItem[]>(FALLBACK_TASKS);
  const [staffDirectory, setStaffDirectory] = useState<MosChatStaffMember[]>(getInitialStaffDirectory);
  const [workflowTemplates, setWorkflowTemplates] = useState<MosChatWorkflowTemplate[]>([]);
  const [workflowInstances, setWorkflowInstances] = useState<MosChatWorkflowInstance[]>([]);
  const [triggerWorkflowModalOpen, setTriggerWorkflowModalOpen] = useState<boolean>(false);
  const [initialWorkflowCode, setInitialWorkflowCode] = useState<string>('WF_CASH_ADVANCE');
  const [saveThreadWorkflowModalOpen, setSaveThreadWorkflowModalOpen] = useState<boolean>(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const navigateToMessageRef = useRef<(convId: string, msgId?: string) => void>(() => {});
  const pendingNavRef = useRef<{ convId: string; msgId?: string } | null>(null);
  const retriedMissingMsgRef = useRef<Set<string>>(new Set());
  const openRef = useRef<boolean>(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const ensurePortalOpen = useCallback(() => {
    if (onOpen) {
      onOpen();
    } else if (!openRef.current) {
      onToggle();
    }
  }, [onOpen, onToggle]);
  const personalLayoutStorageKey = useMemo(() => {
    let resolvedKey = String(currentUser?.id || currentUser?.username || '').trim();
    if (!resolvedKey && typeof window !== 'undefined') {
      try {
        const storedUser = window.localStorage.getItem('mos_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          resolvedKey = String(parsedUser?.id || parsedUser?.username || '').trim();
        }
      } catch {
        // ignore parse error
      }
    }
    return `mos_chat_personal_layout_v2_${resolvedKey || 'default'}`;
  }, [currentUser?.id, currentUser?.username]);

  const readStoredPersonalLayout = useCallback((storageKey: string) => {
    const getResponsiveDefaultPanelWidth = () => {
      if (typeof window === 'undefined') return 960;
      const w = window.innerWidth || 1920;
      if (w >= 1920) return 1080;
      if (w >= 1600) return 980;
      if (w >= 1440) return 920;
      return 840;
    };
    const defaults = {
      panelWidth: getResponsiveDefaultPanelWidth(),
      sidebarWidth: 264,
      threadWidth: 440,
      maximized: false,
      activeConvId: 'space-cc',
    };
    if (typeof window === 'undefined') return defaults;
    try {
      const legacyKey = storageKey.replace('mos_chat_personal_layout_v2_', 'mos_chat_personal_layout_v1_');
      const raw =
        window.localStorage.getItem(storageKey) ||
        window.localStorage.getItem('mos_chat_personal_layout_v2_global') ||
        window.localStorage.getItem(legacyKey) ||
        window.localStorage.getItem('mos_chat_personal_layout_v1_default');
      const storedThread = Number(window.localStorage.getItem('mos_chat_thread_width_v1'));
      if (!raw) {
        if (Number.isFinite(storedThread) && storedThread > 0) {
          return { ...defaults, threadWidth: Math.max(300, Math.min(850, Math.round(storedThread))) };
        }
        return defaults;
      }
      const parsed = JSON.parse(raw) as {
        panelWidth?: number;
        sidebarWidth?: number;
        threadWidth?: number;
        maximized?: boolean;
        activeConvId?: string;
      };
      const maxAllowed = Math.max(520, (window.innerWidth || 1920) - 56);
      const rawThread =
        typeof parsed.threadWidth === 'number' && Number.isFinite(parsed.threadWidth)
          ? parsed.threadWidth
          : Number.isFinite(storedThread) && storedThread > 0
            ? storedThread
            : defaults.threadWidth;

      return {
        panelWidth:
          typeof parsed.panelWidth === 'number' && Number.isFinite(parsed.panelWidth)
            ? Math.max(520, Math.min(maxAllowed, Math.round(parsed.panelWidth)))
            : defaults.panelWidth,
        sidebarWidth:
          typeof parsed.sidebarWidth === 'number' && Number.isFinite(parsed.sidebarWidth)
            ? Math.max(190, Math.min(460, Math.round(parsed.sidebarWidth)))
            : defaults.sidebarWidth,
        threadWidth: Math.max(300, Math.min(850, Math.round(rawThread))),
        maximized: typeof parsed.maximized === 'boolean' ? parsed.maximized : defaults.maximized,
        activeConvId:
          typeof parsed.activeConvId === 'string' && parsed.activeConvId ? parsed.activeConvId : defaults.activeConvId,
      };
    } catch {
      return defaults;
    }
  }, []);

  const [activeConvId, setActiveConvId] = useState<string>(
    () => readStoredPersonalLayout(personalLayoutStorageKey).activeConvId
  );
  const [activeSubtab, setActiveSubtab] = useState<'chat' | 'tasks' | 'pinned'>('chat');
  const [pinnedBannerIndex, setPinnedBannerIndex] = useState<number>(0);
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'unread' | 'spaces'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [maximized, setMaximized] = useState<boolean>(
    () => readStoredPersonalLayout(personalLayoutStorageKey).maximized
  );
  const [panelWidth, setPanelWidth] = useState<number>(
    () => readStoredPersonalLayout(personalLayoutStorageKey).panelWidth
  );
  const [sidebarWidth, setSidebarWidth] = useState<number>(
    () => readStoredPersonalLayout(personalLayoutStorageKey).sidebarWidth
  );
  const [threadWidth, setThreadWidth] = useState<number>(
    () => readStoredPersonalLayout(personalLayoutStorageKey).threadWidth
  );
  const [isResizingTarget, setIsResizingTarget] = useState<'panel' | 'sidebar' | 'thread' | null>(null);
  const [hoverResizeHandle, setHoverResizeHandle] = useState<'panel' | 'sidebar' | 'thread' | null>(null);
  const justFinishedResizingRef = useRef<boolean>(false);
  const [presence, setPresence] = useState<MosChatPresenceStatus>('active');
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth > 0) {
      return window.innerWidth <= 768;
    }
    return false;
  });
  const [mobileActiveView, setMobileActiveView] = useState<'inbox' | 'conversation' | 'thread'>('inbox');
  const [mobileActionOpen, setMobileActionOpen] = useState<boolean>(false);
  const [mobileActiveMsgId, setMobileActiveMsgId] = useState<string | null>(null);
  const [heartFlyMsgId, setHeartFlyMsgId] = useState<string | null>(null);
  const lastTapRef = useRef<{ msgId: string; time: number }>({ msgId: '', time: 0 });
  const notifiedBuzzIdsRef = useRef<Set<string>>(new Set());
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const isInitialBootstrapRef = useRef<boolean>(true);

  useEffect(() => {
    setMobileActionOpen(false);
    setMobileActiveMsgId(null);
  }, [activeConvId]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth <= 768 : false;
      setIsMobile(mobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const panelWidthRef = useRef<number>(panelWidth);
  const sidebarWidthRef = useRef<number>(sidebarWidth);
  const threadWidthRef = useRef<number>(threadWidth);
  const maximizedRef = useRef<boolean>(maximized);
  const activeConvIdRef = useRef<string>(activeConvId);

  useEffect(() => {
    panelWidthRef.current = panelWidth;
  }, [panelWidth]);
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);
  useEffect(() => {
    threadWidthRef.current = threadWidth;
  }, [threadWidth]);
  useEffect(() => {
    maximizedRef.current = maximized;
  }, [maximized]);
  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  const persistPersonalLayout = useCallback(
    (
      patch?: Partial<{
        panelWidth: number;
        sidebarWidth: number;
        threadWidth: number;
        maximized: boolean;
        activeConvId: string;
      }>
    ) => {
      if (typeof window === 'undefined') return;
      const next = {
        panelWidth: patch?.panelWidth ?? panelWidthRef.current,
        sidebarWidth: patch?.sidebarWidth ?? sidebarWidthRef.current,
        threadWidth: patch?.threadWidth ?? threadWidthRef.current,
        maximized: patch?.maximized ?? maximizedRef.current,
        activeConvId: patch?.activeConvId ?? activeConvIdRef.current,
        updatedAt: Date.now(),
      };
      try {
        const serialized = JSON.stringify(next);
        window.localStorage.setItem(personalLayoutStorageKey, serialized);
        window.localStorage.setItem('mos_chat_personal_layout_v2_global', serialized);
        window.localStorage.setItem('mos_chat_thread_width_v1', String(next.threadWidth));
      } catch {
        // ignore storage quota error
      }
    },
    [personalLayoutStorageKey]
  );

  // Sync layout when personalLayoutStorageKey resolves to a specific user without ever overwriting stored values
  useEffect(() => {
    const stored = readStoredPersonalLayout(personalLayoutStorageKey);
    setPanelWidth(stored.panelWidth);
    setSidebarWidth(stored.sidebarWidth);
    setThreadWidth(stored.threadWidth);
    setMaximized(stored.maximized);
    if (stored.activeConvId) {
      setActiveConvId(stored.activeConvId);
    }
  }, [personalLayoutStorageKey, readStoredPersonalLayout]);

  // Persist activeConvId when user switches conversations
  useEffect(() => {
    persistPersonalLayout({ activeConvId });
  }, [activeConvId, persistPersonalLayout]);

  // Interactive drag-resize handler for main chat panel (left edge) and conversation sidebar divider
  useEffect(() => {
    if (!isResizingTarget) return;

    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = isResizingTarget === 'panel' ? 'ew-resize' : 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingTarget === 'panel') {
        const maxAllowed = Math.max(520, window.innerWidth - 56);
        const nextWidth = Math.max(520, Math.min(maxAllowed, window.innerWidth - e.clientX));
        const rounded = Math.round(nextWidth);
        panelWidthRef.current = rounded;
        setPanelWidth(rounded);
        persistPersonalLayout({ panelWidth: rounded, maximized: false });
      } else if (isResizingTarget === 'sidebar') {
        const effectivePanelWidth = maximizedRef.current
          ? Math.max(520, window.innerWidth - 224)
          : panelWidthRef.current;
        const panelLeftEdge = window.innerWidth - effectivePanelWidth;
        const maxSidebarAllowed = Math.min(460, Math.max(190, effectivePanelWidth - 320));
        const nextSidebarWidth = Math.max(190, Math.min(maxSidebarAllowed, e.clientX - panelLeftEdge));
        const rounded = Math.round(nextSidebarWidth);
        sidebarWidthRef.current = rounded;
        setSidebarWidth(rounded);
        persistPersonalLayout({ sidebarWidth: rounded });
      } else if (isResizingTarget === 'thread') {
        const effectivePanelWidth = maximizedRef.current
          ? Math.max(520, window.innerWidth - 224)
          : panelWidthRef.current;
        const maxThreadAllowed = Math.min(850, Math.max(340, effectivePanelWidth - sidebarWidthRef.current - 320));
        const nextThreadWidth = Math.max(300, Math.min(maxThreadAllowed, window.innerWidth - e.clientX));
        const rounded = Math.round(nextThreadWidth);
        threadWidthRef.current = rounded;
        setThreadWidth(rounded);
        persistPersonalLayout({ threadWidth: rounded });
      }
    };

    const handleMouseUp = () => {
      persistPersonalLayout();
      setIsResizingTarget(null);
      justFinishedResizingRef.current = true;
      window.setTimeout(() => {
        justFinishedResizingRef.current = false;
      }, 150);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTarget, persistPersonalLayout]);

  // ================= MOS CHAT & MAI COPILOT ACCESS CONTROL (DEPARTMENT / TEAM / INDIVIDUAL) =================
  const isDannyAccount = useMemo(() => {
    const isCanon = isCanonicalSuperAdminIdentity({ username: currentUser?.username, email: currentUser?.email });
    const roleLower = String(currentUser?.role || '')
      .toLowerCase()
      .trim();
    return isCanon || roleLower === 'super_admin' || roleLower === 'admin';
  }, [currentUser?.username, currentUser?.email, currentUser?.role]);

  // Chỉ duy nhất Super Admin Danny mới thấy và sử dụng nút gửi task vào mOS Mission (Điều răn UI-009)
  const isStrictDannySuperAdmin = useMemo(() => {
    const isCanon = isCanonicalSuperAdminIdentity({ username: currentUser?.username, email: currentUser?.email });
    const roleLower = String(currentUser?.role || '')
      .toLowerCase()
      .trim();
    return (roleLower === 'super_admin' && isCanon) || isCanon || Number(currentUser?.id) === 1;
  }, [currentUser?.id, currentUser?.username, currentUser?.email, currentUser?.role]);

  const [accessConfig, setAccessConfig] = useState<MosChatAccessConfig>({
    allowAllStaff: false,
    allowedGroupKeys: ['TEAM_ADMIN_MANAGER', 'TEAM_CC', 'TEAM_TELESALES'],
    allowedStaffIds: [],
    aiCopilotAllowedGroupKeys: ['TEAM_ADMIN_MANAGER', 'TEAM_TELESALES'],
    aiCopilotAllowedStaffIds: [],
  });
  const [serverCanAccessChat, setServerCanAccessChat] = useState<boolean | null>(null);
  const [accessConfigModalOpen, setAccessConfigModalOpen] = useState<boolean>(false);
  const [accessConfigTab, setAccessConfigTab] = useState<'chat' | 'ai'>('chat');
  const [accessStaffSearch, setAccessStaffSearch] = useState<string>('');
  const [accessGroupFilter, setAccessGroupFilter] = useState<string>('ALL');
  const [savingAccessConfig, setSavingAccessConfig] = useState<boolean>(false);

  const [allowedAiGroups, setAllowedAiGroups] = useState<string[]>([]);
  const aiPersonalStorageKey = useMemo(
    () => `mos_chat_ai_private_conv_v1_${currentUser?.id || currentUser?.username || 'default'}`,
    [currentUser?.id, currentUser?.username]
  );
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<MosChatMessage[]>([]);
  const [aiThinkingActive, setAiThinkingActive] = useState<boolean>(false);
  const [aiElapsedSec, setAiElapsedSec] = useState<number>(0);
  const [expandedThinkingIds, setExpandedThinkingIds] = useState<Record<string, boolean>>({});
  const [appliedActionIds, setAppliedActionIds] = useState<Record<string, boolean>>({});
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [ttsSpeed, setTtsSpeed] = useState<number>(() => {
    if (typeof window === 'undefined') return 1.0;
    try {
      const saved = localStorage.getItem('mos_chat_tts_speed');
      const val = saved ? parseFloat(saved) : 1.0;
      return [0.8, 1.0, 1.25, 1.5, 1.75, 2.0].includes(val) ? val : 1.0;
    } catch {
      return 1.0;
    }
  });

  const handleSetTtsSpeed = useCallback((speed: number) => {
    setTtsSpeed(speed);
    try {
      localStorage.setItem('mos_chat_tts_speed', String(speed));
    } catch {
      // ignore storage error
    }
    setNeuralSpeechSpeed(speed);
  }, []);

  // MOS-BUG-135: MAI Spoken Urgent Announcements (iPhone Siri-style)
  const [maiVoiceAnnounceEnabled, setMaiVoiceAnnounceEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('mos_chat_mai_voice_announce_v1');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleMaiVoiceAnnounce = useCallback((enabled: boolean) => {
    setMaiVoiceAnnounceEnabled(enabled);
    try {
      localStorage.setItem('mos_chat_mai_voice_announce_v1', String(enabled));
    } catch {}
  }, []);

  const [isUrgentSend, setIsUrgentSend] = useState<boolean>(false);
  const aiHydratedRef = useRef<boolean>(false);

  const buildInitialAiWelcomeMessage = useCallback((): MosChatMessage => {
    const userDisplayName = currentUser?.displayName || currentUser?.username || 'Anh Danny';
    return {
      id: 'msg-ai-welcome',
      conversationId: AI_COPILOT_CONV_ID,
      senderId: 'wings-ai-copilot',
      senderName: '🤖 MAI',
      senderRole: 'mOS AI',
      senderAvatar: 'MAI',
      roleColor: '#8b5cf6',
      isAiBot: true,
      text:
        `Xin chào ${userDisplayName}! MAI là **mOS AI** đã được tích hợp trực tiếp vào **mOS Chat**.\n` +
        '• **Kênh 1-1 riêng tư**: Mọi trao đổi và phân tích dữ liệu tại đây chỉ một mình bạn nhìn thấy.\n' +
        '• **Gọi @MAI trong #Space**: Gõ `@MAI` kèm câu hỏi trong bất kỳ nhóm Space nào để MAI phân tích và trả lời công khai cho cả nhóm.',
      timeLabel: dayjs().format('HH:mm'),
      createdAt: new Date().toISOString(),
      reactions: {},
      thread: [],
    };
  }, [currentUser?.displayName, currentUser?.username]);

  // Hydrate allowed AI groups + personal private 1-1 AI chat history
  useEffect(() => {
    aiHydratedRef.current = false;
    try {
      const rawGroups = window.localStorage.getItem(AI_COPILOT_GROUP_ACCESS_KEY);
      if (rawGroups) {
        const parsedGroups = JSON.parse(rawGroups);
        if (Array.isArray(parsedGroups)) {
          setAllowedAiGroups(parsedGroups.filter((g): g is string => typeof g === 'string'));
        }
      }
    } catch {
      // ignore
    }

    try {
      const rawAi = window.localStorage.getItem(aiPersonalStorageKey);
      if (rawAi) {
        const parsedAi = JSON.parse(rawAi) as {
          sessionId?: string | null;
          messages?: MosChatMessage[];
        };
        if (parsedAi.sessionId) setAiSessionId(parsedAi.sessionId);
        if (Array.isArray(parsedAi.messages) && parsedAi.messages.length > 0) {
          const sanitizedMessages = parsedAi.messages.map((m) => {
            if (m.text && /<action/i.test(m.text)) {
              const actionMatches: NonNullable<MosChatMessage['aiAction']>[] = [];
              const regex = /<action(?:\s+type="([^"]*)")?(?:\s+label="([^"]*)")?>([\s\S]*?)<\/action>/gi;
              let match: RegExpExecArray | null;
              while ((match = regex.exec(m.text)) !== null) {
                try {
                  actionMatches.push({
                    type: match[1]?.trim() || 'APPLY_FILTER',
                    label: match[2]?.trim() || 'Áp dụng bộ lọc gợi ý',
                    payload: JSON.parse(match[3]?.trim() || '{}'),
                  });
                } catch {
                  // ignore
                }
              }
              const cleanText = m.text
                .replace(/<action[\s\S]*?<\/action>/gi, '')
                .replace(/<\/?action[^>]*>/gi, '')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
              const existingActions =
                m.aiActions || (m.aiAction?.actions ? m.aiAction.actions : m.aiAction ? [m.aiAction] : []);
              const allActions = [...existingActions, ...actionMatches].filter(
                (act, index, self) =>
                  index ===
                  self.findIndex(
                    (a) => a.label === act.label && JSON.stringify(a.payload) === JSON.stringify(act.payload)
                  )
              );
              return {
                ...m,
                text: cleanText,
                aiAction: allActions[0] || m.aiAction,
                aiActions: allActions.length > 0 ? allActions : m.aiActions,
              };
            }
            return m;
          });
          setAiMessages(sanitizedMessages);
          aiHydratedRef.current = true;
          return;
        }
      }
    } catch {
      // ignore
    }
    setAiMessages([buildInitialAiWelcomeMessage()]);
    aiHydratedRef.current = true;
  }, [aiPersonalStorageKey, buildInitialAiWelcomeMessage]);

  useEffect(() => {
    if (!aiHydratedRef.current) return;
    try {
      window.localStorage.setItem(
        aiPersonalStorageKey,
        JSON.stringify({
          sessionId: aiSessionId,
          messages: aiMessages.slice(-80),
          updatedAt: Date.now(),
        })
      );
    } catch {
      // ignore
    }
  }, [aiPersonalStorageKey, aiSessionId, aiMessages]);

  // Synchronize latest messages from backend if aiSessionId exists or discover active session (MOS-BUG-170)
  const isSyncingDesktopAiRef = useRef<boolean>(false);
  const syncDesktopAiSession = useCallback(
    async (targetSessionId?: string | null) => {
      if (!currentUser?.id && !currentUser?.username) return;
      if (isSyncingDesktopAiRef.current) return;
      isSyncingDesktopAiRef.current = true;
      try {
        let resolvedSessionId = targetSessionId || aiSessionId;

        // Discover active mos-chat-private session if missing locally
        if (!resolvedSessionId) {
          const sessionsRes = await apiClient.ai.listSessions({ scope: 'mos-chat-private' });
          if (sessionsRes?.sessions && sessionsRes.sessions.length > 0) {
            resolvedSessionId = sessionsRes.sessions[0].id;
            setAiSessionId(resolvedSessionId);
          }
        }

        if (!resolvedSessionId) return;

        const sessRes = await apiClient.ai.getSession(resolvedSessionId);
        if (!sessRes?.messages || sessRes.messages.length === 0) return;

        const mappedBackend: MosChatMessage[] = sessRes.messages.map((bm) => formatBackendAiMessage(bm, currentUser));
        const welcome = buildInitialAiWelcomeMessage();
        setAiMessages((prev) => {
          const serverMsgIds = new Set(mappedBackend.map((m) => m.id));
          const pendingOptimistic = prev.filter(
            (m) => (m.id.startsWith('temp_') || m.id.startsWith('msg-user-')) && !serverMsgIds.has(m.id)
          );
          return [welcome, ...mappedBackend, ...pendingOptimistic];
        });
      } catch {
        // ignore sync error
      } finally {
        isSyncingDesktopAiRef.current = false;
      }
    },
    [aiSessionId, buildInitialAiWelcomeMessage, currentUser]
  );

  useEffect(() => {
    void syncDesktopAiSession();
  }, [syncDesktopAiSession]);

  useEffect(() => {
    if (activeConvId === AI_COPILOT_CONV_ID) {
      void syncDesktopAiSession();
    }
  }, [activeConvId, syncDesktopAiSession]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (activeConvId === AI_COPILOT_CONV_ID || aiSessionId)) {
        void syncDesktopAiSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [activeConvId, aiSessionId, syncDesktopAiSession]);

  const currentUserStaffMember = useMemo<MosChatStaffMember>(() => {
    const myId = Number(currentUser?.id);
    const uname = String(currentUser?.username || '')
      .toLowerCase()
      .trim();
    const found = staffDirectory.find(
      (s) =>
        (Number.isFinite(myId) && myId > 0 && s.id === myId) ||
        (uname &&
          String(s.username || '')
            .toLowerCase()
            .trim() === uname)
    );
    if (found) return found;
    return {
      id: Number.isFinite(myId) ? myId : 0,
      username: currentUser?.username || '',
      displayName: currentUser?.displayName || currentUser?.username || '',
      role: currentUser?.role || '',
      departmentCodes: [],
      teamCodes: [],
    };
  }, [currentUser?.id, currentUser?.username, currentUser?.displayName, currentUser?.role, staffDirectory]);

  const canManageChatThreads = useMemo(() => {
    if (isDannyAccount) return true;
    const roleLower = String(currentUser?.role || currentUserStaffMember?.role || '')
      .toLowerCase()
      .trim();
    return (
      roleLower === 'manager' ||
      roleLower === 'oc' ||
      roleLower === 'admin' ||
      roleLower === 'super_admin' ||
      matchesStaffGroup(currentUserStaffMember, 'TEAM_ADMIN_MANAGER')
    );
  }, [isDannyAccount, currentUser?.role, currentUserStaffMember]);

  const isStaffMemberAllowedInChat = useCallback(
    (
      member: MosChatStaffMember,
      cfg: MosChatAccessConfig = accessConfig
    ): {
      allowed: boolean;
      reason: 'admin' | 'all' | 'individual' | 'group' | 'none';
      matchedGroups: SpaceDepartmentOrTeamGroup[];
    } => {
      const roleLower = String(member.role || '')
        .toLowerCase()
        .trim();
      const unameLower = String(member.username || '')
        .toLowerCase()
        .trim();
      if (unameLower === 'danny' || roleLower === 'super_admin' || roleLower === 'admin') {
        return { allowed: true, reason: 'admin', matchedGroups: [] };
      }
      if (cfg.allowAllStaff) {
        return { allowed: true, reason: 'all', matchedGroups: [] };
      }
      const isIndividual = member.id > 0 && (cfg.allowedStaffIds || []).includes(member.id);
      const matchedGroups = SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter(
        (g) => (cfg.allowedGroupKeys || []).includes(g.key) && matchesStaffGroup(member, g.key)
      );
      if (isIndividual) {
        return { allowed: true, reason: 'individual', matchedGroups };
      }
      if (matchedGroups.length > 0) {
        return { allowed: true, reason: 'group', matchedGroups };
      }
      return { allowed: false, reason: 'none', matchedGroups: [] };
    },
    [accessConfig]
  );

  const isStaffMemberAllowedInAi = useCallback(
    (
      member: MosChatStaffMember,
      cfg: MosChatAccessConfig = accessConfig
    ): {
      allowed: boolean;
      reason: 'admin' | 'individual' | 'group' | 'none';
      matchedGroups: SpaceDepartmentOrTeamGroup[];
    } => {
      const roleLower = String(member.role || '')
        .toLowerCase()
        .trim();
      const unameLower = String(member.username || '')
        .toLowerCase()
        .trim();
      if (unameLower === 'danny' || roleLower === 'super_admin' || roleLower === 'admin') {
        return { allowed: true, reason: 'admin', matchedGroups: [] };
      }
      const isIndividual = member.id > 0 && (cfg.aiCopilotAllowedStaffIds || []).includes(member.id);
      const matchedGroups = SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter(
        (g) => (cfg.aiCopilotAllowedGroupKeys || []).includes(g.key) && matchesStaffGroup(member, g.key)
      );
      if (isIndividual) {
        return { allowed: true, reason: 'individual', matchedGroups };
      }
      if (matchedGroups.length > 0) {
        return { allowed: true, reason: 'group', matchedGroups };
      }
      return { allowed: false, reason: 'none', matchedGroups: [] };
    },
    [accessConfig]
  );

  const canUserAccessChat = useMemo(() => {
    if (isDannyAccount) return true;
    if (serverCanAccessChat !== null) return serverCanAccessChat;
    return isStaffMemberAllowedInChat(currentUserStaffMember, accessConfig).allowed;
  }, [isDannyAccount, serverCanAccessChat, isStaffMemberAllowedInChat, currentUserStaffMember, accessConfig]);

  useEffect(() => {
    onAccessChange?.(canUserAccessChat);
  }, [canUserAccessChat, onAccessChange]);

  const canUseAiCopilot = useMemo(() => {
    if (isDannyAccount) return true;
    if (isStaffMemberAllowedInAi(currentUserStaffMember, accessConfig).allowed) return true;
    const r = String(currentUser?.role || '')
      .trim()
      .toLowerCase();
    if (!r) return false;
    if (allowedAiGroups.includes(r)) return true;
    if (r === 'booker' && allowedAiGroups.includes('telesales')) return true;
    if (r === 'consultant' && allowedAiGroups.includes('cc')) return true;
    if (r === 'oc' && allowedAiGroups.includes('manager')) return true;
    if ((r === 'ktv' || r === 'technician') && allowedAiGroups.includes('cv')) return true;
    return false;
  }, [
    isDannyAccount,
    isStaffMemberAllowedInAi,
    currentUserStaffMember,
    accessConfig,
    currentUser?.role,
    allowedAiGroups,
  ]);

  // 1-second timer while AI is thinking
  useEffect(() => {
    if (!aiThinkingActive) {
      setAiElapsedSec(0);
      return;
    }
    const interval = setInterval(() => {
      setAiElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [aiThinkingActive]);

  // Side Thread Pane state
  const [threadOpen, setThreadOpen] = useState(false);
  const [activeThreadMsgId, setActiveThreadMsgId] = useState<string | null>('msg-seed-1');
  const [threadInput, setThreadInput] = useState('');
  const [threadAttachments, setThreadAttachments] = useState<MosChatImageAttachment[]>([]);

  // Composer state — Performance: composerText is stored in a ref (NOT useState)
  // to avoid re-rendering the entire 10K+ line God Component on every keystroke.
  // Only `composerHasText` (boolean) is a state to control send-button styling.
  const composerTextRef = useRef('');
  const [composerHasText, setComposerHasText] = useState(false);
  const composerHasTextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Write to composerTextRef + sync DOM + debounce hasText boolean state */
  const updateComposerText = useCallback(
    (val: string) => {
      composerTextRef.current = val;
      if (composerInputRef.current && composerInputRef.current.value !== val) {
        composerInputRef.current.value = val;
      }
      // Debounced boolean state update for send button styling (no full re-render per key)
      if (composerHasTextTimerRef.current) clearTimeout(composerHasTextTimerRef.current);
      const hasText = val.trim().length > 0;
      if (hasText !== composerHasText) {
        composerHasTextTimerRef.current = setTimeout(() => setComposerHasText(hasText), 80);
      }
    },
    [composerHasText]
  );

  // Legacy compatibility: setComposerText alias for child components that still use the setter pattern
  const setComposerText = useCallback(
    (valOrFn: string | ((prev: string) => string)) => {
      const nextVal = typeof valOrFn === 'function' ? valOrFn(composerTextRef.current) : valOrFn;
      updateComposerText(nextVal);
    },
    [updateComposerText]
  );

  // Legacy compatibility: composerText getter for read-only usages (callbacks, memos)
  // IMPORTANT: This is NOT reactive — do NOT use it in render paths that need re-render on change.
  const composerText = composerTextRef.current;
  const [stagedAttachments, setStagedAttachments] = useState<MosChatImageAttachment[]>([]);
  const [stagedCustomerCard, setStagedCustomerCard] = useState<MosChatCustomerCard | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const handleOpenCustomerPicker = useCallback(() => setCustomerPickerOpen(true), []);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [sampleCardIndex, setSampleCardIndex] = useState(0);
  const [formatBarOpenMain, setFormatBarOpenMain] = useState(true);
  const [formatBarOpenThread, setFormatBarOpenThread] = useState(false);

  // MOS-FEAT-138: CKEditor Rich Editor Modal & Live Preview states
  const [richEditorModalState, setRichEditorModalState] = useState<{
    open: boolean;
    scope: 'main' | 'thread';
    title: string;
    initialMode?: RichEditorViewMode;
  }>({
    open: false,
    scope: 'main',
    title: 'Soạn thảo phong phú (CKEditor)',
    initialMode: 'split',
  });
  const [isPreviewModeMain, setIsPreviewModeMain] = useState(false);
  const [isPreviewModeThread, setIsPreviewModeThread] = useState(false);
  // Performance: cursor positions stored as refs — they're only read in useCallback
  // bodies (renderAppleNotesFormatToolbar), never in render/JSX paths.
  // Converting to refs avoids ~2 parent re-renders per keystroke.
  const composerCursorPosRef = useRef(0);
  const setComposerCursorPos = useCallback((v: React.SetStateAction<number>) => {
    composerCursorPosRef.current = typeof v === 'function' ? v(composerCursorPosRef.current) : v;
  }, []);
  const threadCursorPosRef = useRef(0);
  const setThreadCursorPos = useCallback((v: React.SetStateAction<number>) => {
    threadCursorPosRef.current = typeof v === 'function' ? v(threadCursorPosRef.current) : v;
  }, []);
  const [inlineTextColor, setInlineTextColor] = useState('#f59e0b');
  const [colorPopoverScope, setColorPopoverScope] = useState<'main' | 'thread' | null>(null);

  // @Mention Autocomplete state (tagging group/space members)
  const [mentionState, setMentionState] = useState<{
    open: boolean;
    scope: 'main' | 'thread';
    query: string;
    atIndex: number;
    cursorIndex: number;
    highlightedIndex: number;
  }>({
    open: false,
    scope: 'main',
    query: '',
    atIndex: -1,
    cursorIndex: -1,
    highlightedIndex: 0,
  });
  // Performance: ref mirror for mention state to skip identical setMentionState calls
  // that would trigger parent re-render cascade on every keystroke.
  const mentionStateRef = useRef(mentionState);
  mentionStateRef.current = mentionState;

  // Nickname Editing State (Per-Space Nicknames)
  const [editingNicknameTarget, setEditingNicknameTarget] = useState<{
    staffId: number;
    displayName: string;
    currentNickname: string;
    isMe: boolean;
  } | null>(null);
  const [nicknameInputVal, setNicknameInputVal] = useState('');
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false);

  // Mini Docked Pop-out Windows (iPhone Cupertino style with full F5 persistence)
  const [dockedConvIds, setDockedConvIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(DOCKED_STORAGE_KEY_V2);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.dockedConvIds)) return parsed.dockedConvIds;
      }
    } catch (_) {}
    return [];
  });

  const [collapsedDockIds, setCollapsedDockIds] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(DOCKED_STORAGE_KEY_V2);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.collapsedDockIds && typeof parsed.collapsedDockIds === 'object') {
          return parsed.collapsedDockIds;
        }
      }
    } catch (_) {}
    return {};
  });

  const [dockInputs, setDockInputs] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(DOCKED_STORAGE_KEY_V2);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.dockInputs && typeof parsed.dockInputs === 'object') {
          return parsed.dockInputs;
        }
      }
    } catch (_) {}
    return {};
  });

  const [dockDimensions, setDockDimensions] = useState<Record<string, MosChatDockDimension>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(DOCKED_STORAGE_KEY_V2);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.dimensions && typeof parsed.dimensions === 'object') {
          return parsed.dimensions;
        }
      }
    } catch (_) {}
    return {};
  });

  const [dockActiveTabs, setDockActiveTabs] = useState<Record<string, 'chat' | 'tasks'>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(DOCKED_STORAGE_KEY_V2);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.activeTabs && typeof parsed.activeTabs === 'object') {
          return parsed.activeTabs;
        }
      }
    } catch (_) {}
    return {};
  });

  const [dockActiveThreadMsgIds, setDockActiveThreadMsgIds] = useState<Record<string, string | null>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(DOCKED_STORAGE_KEY_V2);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.activeThreadMsgIds && typeof parsed.activeThreadMsgIds === 'object') {
          return parsed.activeThreadMsgIds;
        }
      }
    } catch (_) {}
    return {};
  });

  const [dockAttachments, setDockAttachments] = useState<Record<string, MosChatImageAttachment[]>>({});

  // Persist docked state to localStorage on changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        DOCKED_STORAGE_KEY_V2,
        JSON.stringify({
          dockedConvIds,
          collapsedDockIds,
          dockInputs,
          dimensions: dockDimensions,
          activeTabs: dockActiveTabs,
          activeThreadMsgIds: dockActiveThreadMsgIds,
        })
      );
    } catch (_) {}
  }, [dockedConvIds, collapsedDockIds, dockInputs, dockDimensions, dockActiveTabs, dockActiveThreadMsgIds]);

  // Image Upload / Google Drive Modal / Full-Screen Lightbox state
  const [uploadingCount, setUploadingCount] = useState<number>(0);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isDraggingOverThread, setIsDraggingOverThread] = useState<boolean>(false);
  const [driveLinkModalOpen, setDriveLinkModalOpen] = useState<boolean>(false);
  const [driveLinkInput, setDriveLinkInput] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<{
    items: Array<{ id: string; url: string; name: string }>;
    currentIndex: number;
    zoom: number;
    rotate: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetRef = useRef<{ scope: 'main' | 'thread' | 'dock'; convId?: string }>({ scope: 'main' });

  // Global drag listener to reset drag overlays on dragend, drop, or leaving window
  useEffect(() => {
    if (!open) return;
    const handleGlobalDragEnd = () => {
      setIsDraggingOver(false);
      setIsDraggingOverThread(false);
    };
    const handleWindowDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) {
        setIsDraggingOver(false);
        setIsDraggingOverThread(false);
      }
    };
    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('drop', handleGlobalDragEnd);
    window.addEventListener('dragleave', handleWindowDragLeave);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('drop', handleGlobalDragEnd);
      window.removeEventListener('dragleave', handleWindowDragLeave);
    };
  }, [open]);

  // Task & Reminder Creation / Edit Modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalSourceMsg, setTaskModalSourceMsg] = useState<MosChatMessage | null>(null);
  const [editingTask, setEditingTask] = useState<MosChatTaskItem | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState<string>('');
  const [taskPriority, setTaskPriority] = useState<MosChatTaskPriority>('HIGH');
  const [taskDoneState, setTaskDoneState] = useState(false);
  const [taskArchivedState, setTaskArchivedState] = useState(false);
  const [taskRemindMode, setTaskRemindMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('none');
  const [taskRemindSeconds, setTaskRemindSeconds] = useState<number>(0);
  const [customRemindDate, setCustomRemindDate] = useState<dayjs.Dayjs | null>(null);

  // Deadline & Negotiation states (MOS-BUG-125)
  const [taskDeadlineMode, setTaskDeadlineMode] = useState<'preset' | 'custom' | 'none'>('preset');
  const [selectedDeadlinePresetId, setSelectedDeadlinePresetId] = useState<string>('today-1730');
  const [taskDeadline, setTaskDeadline] = useState<dayjs.Dayjs | null>(null);
  const [taskNegotiatedDeadline, setTaskNegotiatedDeadline] = useState<dayjs.Dayjs | null>(null);
  const [taskNegotiationNote, setTaskNegotiationNote] = useState<string>('');

  // Quick Deadline Negotiation Modal state
  const [negotiateModalOpen, setNegotiateModalOpen] = useState(false);
  const [negotiatingTask, setNegotiatingTask] = useState<MosChatTaskItem | null>(null);
  const [negotiateProposedDeadline, setNegotiateProposedDeadline] = useState<dayjs.Dayjs | null>(null);
  const [negotiateReason, setNegotiateReason] = useState('');
  const [isSubmittingNegotiation, setIsSubmittingNegotiation] = useState(false);

  // Tasks Tab filter & search state (MOS-BUG-129)
  const [taskFilter, setTaskFilter] = useState<'ACTIVE' | 'MINE' | 'OVERDUE' | 'DONE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [taskScopeFilter, setTaskScopeFilter] = useState<'ALL' | 'MINE' | 'SPACE'>('ALL');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [collapseOtherSpaces, setCollapseOtherSpaces] = useState(false);

  // mOS Mission Dispatch & Inline Action state (2-way bridge between mOS Chat & mOS Mission)
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [missionSourceMsg, setMissionSourceMsg] = useState<MosChatMessage | null>(null);
  const [missionSourceTask, setMissionSourceTask] = useState<MosChatTaskItem | null>(null);
  const [missionSourceConvId, setMissionSourceConvId] = useState<string>('');
  const [missionTitle, setMissionTitle] = useState('');
  const [missionType, setMissionType] = useState<'BUG' | 'FEATURE'>('FEATURE');
  const [missionNote, setMissionNote] = useState('');
  const [isDispatchingMission, setIsDispatchingMission] = useState(false);
  const [missionActionLoadingKey, setMissionActionLoadingKey] = useState<string | null>(null);
  const [missionReopenInputOpenByReportId, setMissionReopenInputOpenByReportId] = useState<Record<number, boolean>>({});
  const [missionReopenFeedbackByReportId, setMissionReopenFeedbackByReportId] = useState<Record<number, string>>({});

  // New Space / DM Modal
  const [newRoomModalOpen, setNewRoomModalOpen] = useState(false);
  const [newRoomType, setNewRoomType] = useState<'space' | 'dm'>('space');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomSubtitle, setNewRoomSubtitle] = useState('');
  const [newRoomEmoji, setNewRoomEmoji] = useState('');
  const [newRoomColor, setNewRoomColor] = useState('#1a73e8');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomGroupFilter, setRoomGroupFilter] = useState<string>('ALL');

  // Space Members Management Modal
  const [spaceMembersModalOpen, setSpaceMembersModalOpen] = useState(false);
  const [addMemberSelectedStaffId, setAddMemberSelectedStaffId] = useState<number | null>(null);

  // Space Settings / Configuration Modal (MOS-BUG-140)
  const [spaceConfigModalOpen, setSpaceConfigModalOpen] = useState(false);

  // Notification Settings Modal (Tiered Notification Filter)
  const [notifSettingsModalOpen, setNotifSettingsModalOpen] = useState(false);

  // Personal Sidebar Customization (Google Chat Workspace style - per individual user)
  const userSidebarPrefsStorageKey = useMemo(() => {
    let resolvedKey = String(currentUser?.id || currentUser?.username || '').trim();
    if (!resolvedKey && typeof window !== 'undefined') {
      try {
        const storedUser = window.localStorage.getItem('mos_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          resolvedKey = String(parsedUser?.id || parsedUser?.username || '').trim();
        }
      } catch {
        // ignore
      }
    }
    return `mos_chat_user_sidebar_prefs_v1_${resolvedKey || 'default'}`;
  }, [currentUser?.id, currentUser?.username]);

  const readStoredUserSidebarPrefs = useCallback((storageKey: string): MosChatUserSidebarPrefs => {
    const defaults: MosChatUserSidebarPrefs = {
      pinnedIds: [],
      mutedIds: [],
      hiddenIds: [],
      manualUnreadIds: [],
      readMessageCountByConv: {},
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
    };
    if (typeof window === 'undefined') return defaults;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as Partial<MosChatUserSidebarPrefs>;
      return {
        pinnedIds: Array.isArray(parsed.pinnedIds) ? parsed.pinnedIds : [],
        mutedIds: Array.isArray(parsed.mutedIds) ? parsed.mutedIds : [],
        hiddenIds: Array.isArray(parsed.hiddenIds) ? parsed.hiddenIds : [],
        manualUnreadIds: Array.isArray(parsed.manualUnreadIds) ? parsed.manualUnreadIds : [],
        readMessageCountByConv:
          parsed.readMessageCountByConv && typeof parsed.readMessageCountByConv === 'object'
            ? parsed.readMessageCountByConv
            : {},
        collapsedSections:
          parsed.collapsedSections && typeof parsed.collapsedSections === 'object' ? parsed.collapsedSections : {},
        unreadOnlySections:
          parsed.unreadOnlySections && typeof parsed.unreadOnlySections === 'object' ? parsed.unreadOnlySections : {},
        sectionOrder:
          Array.isArray(parsed.sectionOrder) && parsed.sectionOrder.length > 0 ? parsed.sectionOrder : ['dm', 'spaces'],
        customSections: (() => {
          const raw = Array.isArray(parsed.customSections) ? parsed.customSections : [];
          const seenN = new Set<string>();
          const seenI = new Set<string>();
          const clean: MosChatCustomSection[] = [];
          for (const s of raw) {
            if (!s || typeof s.id !== 'string' || typeof s.name !== 'string') continue;
            const norm = s.name.trim().toLowerCase();
            if (!norm || seenN.has(norm) || seenI.has(s.id)) continue;
            seenN.add(norm);
            seenI.add(s.id);
            clean.push({
              id: s.id,
              name: s.name.trim(),
              conversationIds: Array.isArray(s.conversationIds) ? s.conversationIds : [],
              collapsed: Boolean(s.collapsed),
              unreadOnly: Boolean(s.unreadOnly),
            });
          }
          return clean;
        })(),
        conversationOrder:
          parsed.conversationOrder && typeof parsed.conversationOrder === 'object' ? parsed.conversationOrder : {},
        updatedAt: parsed.updatedAt,
        notificationMode:
          parsed.notificationMode && ['ALL', 'MENTIONS_ONLY', 'NOTHING'].includes(parsed.notificationMode)
            ? parsed.notificationMode
            : undefined,
        channelNotificationOverrides:
          parsed.channelNotificationOverrides && typeof parsed.channelNotificationOverrides === 'object'
            ? parsed.channelNotificationOverrides
            : undefined,
      };
    } catch {
      return defaults;
    }
  }, []);

  const [userPrefs, setUserPrefs] = useState<MosChatUserSidebarPrefs>(() =>
    readStoredUserSidebarPrefs(userSidebarPrefsStorageKey)
  );
  const lastLocalPrefsMutationAtRef = useRef<number>(0);
  const hasHydratedPrefsFromServerRef = useRef<boolean>(false);
  const [draggingSidebarConv, setDraggingSidebarConv] = useState<{ convId: string; sectionId: string } | null>(null);
  const [dragOverSidebarConvId, setDragOverSidebarConvId] = useState<string | null>(null);
  const [sidebarCustomizeModalOpen, setSidebarCustomizeModalOpen] = useState(false);
  const [sidebarCustomizeTab, setSidebarCustomizeTab] = useState<'sections' | 'conversations'>('sections');
  const [newSectionNameInput, setNewSectionNameInput] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [openConvMenuId, setOpenConvMenuId] = useState<string | null>(null);
  const [openSectionMenuId, setOpenSectionMenuId] = useState<string | null>(null);
  const [quickCreateSectionModalOpen, setQuickCreateSectionModalOpen] = useState(false);
  const [quickCreateSectionName, setQuickCreateSectionName] = useState('');
  const [quickCreateSectionTargetConvId, setQuickCreateSectionTargetConvId] = useState<string | null>(null);
  const isSubmittingSectionRef = useRef(false);

  useEffect(() => {
    hasHydratedPrefsFromServerRef.current = false;
    setUserPrefs(readStoredUserSidebarPrefs(userSidebarPrefsStorageKey));
  }, [userSidebarPrefsStorageKey, readStoredUserSidebarPrefs]);

  // Live Reminder Alert Toast & IME Composition Guards
  const [activeAlertTask, setActiveAlertTask] = useState<MosChatTaskItem | null>(null);
  const firedTaskIdsRef = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mainMessagesContainerRef = useRef<HTMLDivElement | null>(null);
  const threadMessagesContainerRef = useRef<HTMLDivElement | null>(null);
  const threadMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const dockMessagesContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevMainMsgCountRef = useRef<{ convId: string; count: number }>({ convId: '', count: 0 });
  const prevThreadReplyCountRef = useRef<{ msgId: string; count: number }>({ msgId: '', count: 0 });
  const [openStickerPopoverKey, setOpenStickerPopoverKey] = useState<string | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const threadInputRef = useRef<HTMLTextAreaElement | null>(null);
  const dockInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const isComposingRef = useRef<boolean>(false);
  const lastCompositionEndMsRef = useRef<number>(0);
  const lastSentRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Inline Message Edit & Delete History States
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [historyModalMessage, setHistoryModalMessage] = useState<MosChatMessage | MosChatThreadReply | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);

  // Move / Merge Thread & Subthread States (Popover + Drag & Drop)
  const [movingThreadItemKey, setMovingThreadItemKey] = useState<string | null>(null);
  const [openMovePopoverKey, setOpenMovePopoverKey] = useState<string | null>(null);
  const [moveThreadSearchQuery, setMoveThreadSearchQuery] = useState<string>('');
  const [draggingRootMsgId, setDraggingRootMsgId] = useState<string | null>(null);
  const [dragOverTargetMsgId, setDragOverTargetMsgId] = useState<string | null>(null);
  const [dragOverThreadPane, setDragOverThreadPane] = useState<boolean>(false);

  const lastVersionRef = useRef<number>(0);

  const notifyLivePeers = useCallback(() => {
    try {
      broadcastChannelRef.current?.postMessage({ type: 'MOS_CHAT_SYNC', ts: Date.now() });
    } catch (_) {}
  }, []);

  const scrollToChatBottom = useCallback(
    (target: 'main' | 'thread' | { dockConvId: string } = 'main', behavior: ScrollBehavior = 'smooth') => {
      const executeScroll = (mode: ScrollBehavior) => {
        if (target === 'main') {
          const el = mainMessagesContainerRef.current;
          if (el) {
            if (typeof el.scrollTo === 'function') {
              try {
                el.scrollTo({ top: el.scrollHeight, behavior: mode });
              } catch {}
            }
            try {
              el.scrollTop = el.scrollHeight;
            } catch {}
          }
          if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
            try {
              messagesEndRef.current.scrollIntoView({ behavior: mode, block: 'end' });
            } catch {}
          }
        } else if (target === 'thread') {
          const el = threadMessagesContainerRef.current;
          if (el) {
            if (typeof el.scrollTo === 'function') {
              try {
                el.scrollTo({ top: el.scrollHeight, behavior: mode });
              } catch {}
            }
            try {
              el.scrollTop = el.scrollHeight;
            } catch {}
          }
          if (typeof threadMessagesEndRef.current?.scrollIntoView === 'function') {
            try {
              threadMessagesEndRef.current.scrollIntoView({ behavior: mode, block: 'end' });
            } catch {}
          }
        } else if (typeof target === 'object' && target.dockConvId) {
          const el = dockMessagesContainerRefs.current[target.dockConvId];
          if (el) {
            if (typeof el.scrollTo === 'function') {
              try {
                el.scrollTo({ top: el.scrollHeight, behavior: mode });
              } catch {}
            }
            try {
              el.scrollTop = el.scrollHeight;
            } catch {}
          }
        }
      };

      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => executeScroll(behavior));
        window.setTimeout(() => executeScroll(behavior), 90);
        window.setTimeout(() => executeScroll(behavior), 220);
        window.setTimeout(() => executeScroll(behavior), 450);
      }
    },
    []
  );

  const updateUserPrefsLocalOnly = useCallback(
    (updater: (prev: MosChatUserSidebarPrefs) => MosChatUserSidebarPrefs) => {
      setUserPrefs((prev) => {
        const next = updater(prev);
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(userSidebarPrefsStorageKey, JSON.stringify(next));
          } catch {
            // ignore
          }
        }
        return next;
      });
    },
    [userSidebarPrefsStorageKey]
  );

  const updateUserSidebarPrefs = useCallback(
    (updater: (prev: MosChatUserSidebarPrefs) => MosChatUserSidebarPrefs) => {
      lastLocalPrefsMutationAtRef.current = Date.now();
      setUserPrefs((prev) => {
        const computed = updater(prev);
        // Strict deduplication of custom sections by ID and normalized name
        const seenN = new Set<string>();
        const seenI = new Set<string>();
        const cleanCustom: MosChatCustomSection[] = [];
        (computed.customSections || []).forEach((s) => {
          const norm = (s.name || '').trim().toLowerCase();
          if (!norm || seenN.has(norm) || seenI.has(s.id)) return;
          seenN.add(norm);
          seenI.add(s.id);
          cleanCustom.push(s);
        });
        const customIds = cleanCustom.map((s) => s.id);
        const mergedSectionOrder = Array.from(
          new Set([...customIds, ...(computed.sectionOrder || []), 'dm', 'spaces'])
        ).filter((id) => id === 'dm' || id === 'spaces' || customIds.includes(id));
        const next: MosChatUserSidebarPrefs = {
          ...computed,
          customSections: cleanCustom,
          sectionOrder: mergedSectionOrder,
          updatedAt: new Date().toISOString(),
        };
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(userSidebarPrefsStorageKey, JSON.stringify(next));
          } catch {
            // ignore
          }
        }
        apiClient.chat
          .updateUserPrefs(next)
          .then((res) => {
            if (res?.userPrefs && typeof window !== 'undefined') {
              try {
                window.localStorage.setItem(userSidebarPrefsStorageKey, JSON.stringify(res.userPrefs));
              } catch {
                // ignore
              }
            }
          })
          .catch(() => {});
        return next;
      });
    },
    [userSidebarPrefsStorageKey]
  );

  const persistAccessConfig = useCallback(
    async (next: MosChatAccessConfig, showToast = false) => {
      setAccessConfig(next);
      setSavingAccessConfig(true);
      try {
        const res = await apiClient.chat.updateAccessConfig({
          allowAllStaff: next.allowAllStaff,
          allowedGroupKeys: next.allowedGroupKeys,
          allowedStaffIds: next.allowedStaffIds,
          aiCopilotAllowedGroupKeys: next.aiCopilotAllowedGroupKeys,
          aiCopilotAllowedStaffIds: next.aiCopilotAllowedStaffIds,
        });
        if (res?.accessConfig) {
          setAccessConfig(res.accessConfig);
        }
        notifyLivePeers();
        if (showToast) {
          antdMessage.success('Đã lưu cấu hình phân quyền mOS Chat');
        }
      } catch (err: SafeAny) {
        antdMessage.error(err?.response?.data?.message || 'Không thể lưu cấu hình phân quyền mOS Chat');
      } finally {
        setSavingAccessConfig(false);
      }
    },
    [notifyLivePeers]
  );

  const staffDirectoryHashRef = useRef<string>('');
  const staffDirectoryLenRef = useRef<number>(staffDirectory.length);
  staffDirectoryLenRef.current = staffDirectory.length;

  const fetchBootstrap = useCallback(
    async (forceFull = false) => {
      try {
        const shouldForceFull = forceFull || staffDirectoryLenRef.current === 0;
        const res = await apiClient.chat.bootstrap(
          { sinceVersion: shouldForceFull ? undefined : lastVersionRef.current || undefined },
          { isPolling: true }
        );
        if (res?.accessConfig) {
          setAccessConfig((prev) => {
            try {
              return JSON.stringify(prev) === JSON.stringify(res.accessConfig) ? prev : res.accessConfig!;
            } catch {
              return res.accessConfig!;
            }
          });
        }
        if (typeof res?.canAccessChat === 'boolean') {
          setServerCanAccessChat((prev) => (prev === res.canAccessChat ? prev : res.canAccessChat!));
        }
        if (res?.userPrefs) {
          setUserPrefs((prev) => {
            // Never overwrite an in-flight local sidebar customization (pin, reorder, move section)
            if (Date.now() - lastLocalPrefsMutationAtRef.current < 4000) {
              return prev;
            }
            const serverTs = res.userPrefs?.updatedAt ? new Date(res.userPrefs.updatedAt).getTime() : 0;
            const localTs = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
            const hasServerCustomizations =
              (res.userPrefs?.pinnedIds?.length || 0) > 0 ||
              (res.userPrefs?.mutedIds?.length || 0) > 0 ||
              (res.userPrefs?.hiddenIds?.length || 0) > 0 ||
              (res.userPrefs?.customSections?.length || 0) > 0 ||
              Object.keys(res.userPrefs?.conversationOrder || {}).length > 0;
            const isFirstHydration = !hasHydratedPrefsFromServerRef.current;
            hasHydratedPrefsFromServerRef.current = true;
            if (
              (!prev.updatedAt && (hasServerCustomizations || isFirstHydration)) ||
              (isFirstHydration && hasServerCustomizations && serverTs >= localTs) ||
              serverTs > localTs
            ) {
              try {
                if (JSON.stringify(prev) === JSON.stringify(res.userPrefs)) {
                  return prev;
                }
              } catch {
                // ignore
              }
              if (typeof window !== 'undefined') {
                try {
                  window.localStorage.setItem(userSidebarPrefsStorageKey, JSON.stringify(res.userPrefs));
                } catch {
                  // ignore
                }
              }
              return res.userPrefs!;
            }
            return prev;
          });
        }
        if (Array.isArray(res?.staffDirectory) && res.staffDirectory.length > 0) {
          let serializedStaff = '';
          try {
            serializedStaff = JSON.stringify(res.staffDirectory);
          } catch {
            // ignore
          }
          if (!serializedStaff || staffDirectoryHashRef.current !== serializedStaff) {
            staffDirectoryHashRef.current = serializedStaff;
            setStaffDirectory(res.staffDirectory);
            if (typeof window !== 'undefined' && serializedStaff) {
              try {
                window.localStorage.setItem(STAFF_DIRECTORY_CACHE_KEY, serializedStaff);
              } catch {
                // ignore
              }
            }
          }
        }
        if (res?.unchanged) {
          return;
        }
        if (res?.version) {
          lastVersionRef.current = res.version;
        }
        if (Array.isArray(res?.conversations)) {
          setConversations(res.conversations);

          if (pendingNavRef.current) {
            const pending = pendingNavRef.current;
            const foundInLoaded = res.conversations.some((c) => c.id === pending.convId);
            if (foundInLoaded) {
              pendingNavRef.current = null;
              setTimeout(() => {
                navigateToMessageRef.current(pending.convId, pending.msgId);
              }, 60);
            }
          }

          // Detect new unread buzzed messages or replies for current user (MOS-BUG-131, MOS-BUG-135, MOS-BUG-141)
          const myId = String(currentUser?.id || '');
          const myStaffId = Number(currentUserStaffMember?.id) || Number(currentUser?.id) || 0;
          const myName = String(
            currentUserStaffMember?.displayName || currentUser?.displayName || currentUser?.username || ''
          )
            .trim()
            .toLowerCase();

          // On initial bootstrap, seed ALL existing message and thread reply IDs across all conversations
          // so old messages in previously-read spaces NEVER trigger false live alerts when a new message arrives later.
          if (isInitialBootstrapRef.current) {
            for (const conv of res.conversations) {
              for (const m of conv.messages || []) {
                seenMessageIdsRef.current.add(m.id);
                if (m.thread && m.thread.length > 0) {
                  for (const r of m.thread) {
                    seenMessageIdsRef.current.add(r.id);
                  }
                }
              }
            }
          }

          for (const conv of res.conversations) {
            const convIdStr = String(conv.id || '');
            if (conv.isSelf || convIdStr.startsWith('dm-self-')) continue;
            if ((userPrefs.mutedIds || []).includes(conv.id)) continue;
            if (conv.type === 'dm') {
              const dmIds = Array.isArray(conv.memberIds) ? conv.memberIds.map(Number) : [];
              if (myStaffId > 0 && dmIds.length === 2 && !dmIds.includes(myStaffId)) continue;
            }
            if (
              conv.type === 'space' &&
              !isStrictDannySuperAdmin &&
              Array.isArray(conv.memberIds) &&
              conv.memberIds.length > 0
            ) {
              const mNums = conv.memberIds.map(Number).filter((n) => Number.isFinite(n) && n > 0);
              if (mNums.length > 0 && myStaffId > 0 && !mNums.includes(myStaffId)) continue;
            }

            if (conv.hasUnreadBuzz || (conv.unreadCount || 0) > 0 || (conv.unreadThreadCount || 0) > 0) {
              // ──── Tiered Notification Filter ────
              // Resolves the effective notification mode for this conversation:
              // 1. Check per-channel override first
              // 2. Fall back to global default mode
              // 3. DMs and @mentions always pass through (Invariant)
              const getEffectiveNotifMode = () => {
                const channelOverride = userPrefs.channelNotificationOverrides?.[conv.id];
                if (channelOverride && channelOverride !== 'INHERIT') return channelOverride;
                return userPrefs.notificationMode || 'ALL';
              };
              const effectiveNotifMode = getEffectiveNotifMode();

              // shouldShowPopupAndSound: determines if a message should trigger popup + chime
              // isTargetedByUser: true when the user is @mentioned or it's a DM (always allowed)
              const shouldShowPopupAndSound = (isTargetedByUser: boolean): boolean => {
                // DMs and @mentions always pass through — INVARIANT
                if (isTargetedByUser) return true;
                // Per effective mode
                if (effectiveNotifMode === 'ALL') return true;
                if (effectiveNotifMode === 'MENTIONS_ONLY') return false;
                if (effectiveNotifMode === 'MUTED' || effectiveNotifMode === 'NOTHING') return false;
                return true;
              };

              // ──── Toast Anti-Flooding Controller ────
              // Track active toasts and limit to MAX_VISIBLE_TOASTS
              const MAX_VISIBLE_TOASTS = 3;

              const handleUrgentBuzzItem = (item: MosChatMessage | MosChatThreadReply) => {
                if (!item.isBuzzed || !item.buzzedAt) return;
                const buzzKey = `${item.id}-${item.buzzedAt}`;
                const isMine =
                  String(item.senderId) === myId ||
                  (myStaffId > 0 && Number(item.senderId) === myStaffId) ||
                  Boolean(
                    myName &&
                    String(item.senderName || '')
                      .trim()
                      .toLowerCase() === myName
                  );
                if (isMine || notifiedBuzzIdsRef.current.has(buzzKey)) return;

                const userObj = {
                  id: myStaffId || myId,
                  displayName: currentUserStaffMember?.displayName || currentUser?.displayName,
                  username: currentUserStaffMember?.username || currentUser?.username,
                };
                const isDirectMsg = conv.type === 'dm';
                const isTargeted = isUserMentionedInText(item.text || '', userObj, {
                  nicknames: conv.memberNicknames,
                  isDirectMessage: isDirectMsg,
                });

                notifiedBuzzIdsRef.current.add(buzzKey);

                // ──── Tiered Notification Filter for BUZZ ────
                // Check if this BUZZ should produce popup + sound based on the effective notification mode.
                // DMs and @mentions always pass through (invariant).
                if (!shouldShowPopupAndSound(isTargeted || isDirectMsg)) return;

                // ──── Toast Anti-Flooding for BUZZ ────
                // Count active buzz toasts; if >= MAX_VISIBLE_TOASTS, destroy oldest and show collapsed summary
                const activeBuzzToastKeys = Array.from(notifiedBuzzIdsRef.current)
                  .slice(-MAX_VISIBLE_TOASTS * 2)
                  .map((k) => `buzz-notify-${k.split('-')[0]}`);
                // We let Antd's built-in maxCount handle overflow (set via notification.config)

                playWebAudioBuzzChime();
                triggerBuzzVibration();

                const senderLabel = item.latestBuzz?.senderName || item.senderName || 'Đồng nghiệp';
                const convLabel = conv.name ? `[${conv.name}]` : '';
                const preview = item.text
                  ? item.text.length > 70
                    ? `${item.text.slice(0, 70)}...`
                    : item.text
                  : 'Tin nhắn khẩn cấp';

                // MOS-BUG-135: @MAI tự động phát âm thanh thông báo trực tiếp đến người được tag (Kiểu iPhone)
                if (isTargeted && maiVoiceAnnounceEnabled) {
                  const spokenText = buildMaiUrgentVoiceAnnouncement({
                    senderName: senderLabel,
                    conversationName: conv.name,
                    isSpace: conv.type === 'space',
                    messageText: item.text || '',
                    note: item.latestBuzz?.note,
                  });

                  setTimeout(() => {
                    void playNeuralSpeech(spokenText, {
                      voice: 'vi-VN-HoaiMyNeural',
                      speed: ttsSpeed || 1.0,
                    });
                  }, 380);
                }

                notification.warning({
                  message: `⚡ TIN NHẮN KHẨN CẤP (BUZZ) ${convLabel}`,
                  description: (
                    <div className="space-y-1">
                      <div>{`${senderLabel} vừa Buzz tin nhắn khẩn cấp: "${preview}"`}</div>
                      {isTargeted && maiVoiceAnnounceEnabled && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1">
                          <span>🤖</span>
                          <span>@MAI đã phát âm thanh thông báo trực tiếp đến bạn</span>
                        </div>
                      )}
                    </div>
                  ),
                  duration: 9,
                  style: {
                    background: surfaceRaised,
                    border: `1.5px solid ${accentColor}`,
                    color: token.colorText,
                    boxShadow: 'var(--mos-shadow)',
                    borderRadius: 12,
                  },
                  btn: (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const spokenText = buildMaiUrgentVoiceAnnouncement({
                            senderName: senderLabel,
                            conversationName: conv.name,
                            isSpace: conv.type === 'space',
                            messageText: item.text || '',
                            note: item.latestBuzz?.note,
                          });
                          void playNeuralSpeech(spokenText, { voice: 'vi-VN-HoaiMyNeural', speed: ttsSpeed || 1.0 });
                        }}
                        className="px-2.5 py-1 rounded font-semibold text-xs cursor-pointer shadow-sm border border-amber-500/40 hover:bg-amber-500/10 transition-colors"
                        style={{ color: token.colorText }}
                      >
                        🔊 Nghe lại
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          ensurePortalOpen();
                          navigateToMessage(conv.id, item.id);
                          notification.destroy(`buzz-notify-${item.id}`);
                        }}
                        className="px-3 py-1 rounded font-bold text-xs cursor-pointer shadow-sm transition-opacity hover:opacity-90"
                        style={{
                          background: accentColor,
                          color: accentContrast,
                        }}
                      >
                        Xem ngay
                      </button>
                    </div>
                  ),
                  onClick: () => {
                    ensurePortalOpen();
                    navigateToMessage(conv.id, item.id);
                    notification.destroy(`buzz-notify-${item.id}`);
                  },
                  key: `buzz-notify-${item.id}`,
                });
              };

              // MOS-BUG-139 & MOS-BUG-141: Detect new messages directed at current user and trigger alert + chime + toast
              const handleIncomingMessageItem = (
                item: MosChatMessage | MosChatThreadReply,
                parentMsg?: MosChatMessage
              ) => {
                if (isInitialBootstrapRef.current) {
                  seenMessageIdsRef.current.add(item.id);
                  return;
                }

                if (seenMessageIdsRef.current.has(item.id)) return;
                seenMessageIdsRef.current.add(item.id);

                const isMine =
                  String(item.senderId) === myId ||
                  (myStaffId > 0 && Number(item.senderId) === myStaffId) ||
                  Boolean(
                    myName &&
                    String(item.senderName || '')
                      .trim()
                      .toLowerCase() === myName
                  );

                if (isMine || item.isBuzzed || (item as MosChatThreadReply).isMissionMilestone) return;

                const userObj = {
                  id: myStaffId || myId,
                  displayName: currentUserStaffMember?.displayName || currentUser?.displayName,
                  username: currentUserStaffMember?.username || currentUser?.username,
                };
                const isDirectMsg = conv.type === 'dm';
                const isMentioned = isUserMentionedInText(item.text || '', userObj, {
                  nicknames: conv.memberNicknames,
                  isDirectMessage: isDirectMsg,
                });
                const isMyThreadReply = Boolean(
                  parentMsg &&
                  (Number(parentMsg.senderId) === myStaffId ||
                    String(parentMsg.senderId) === myId ||
                    isUserMentionedInText(parentMsg.text || '', userObj, {
                      nicknames: conv.memberNicknames,
                      isDirectMessage: false,
                    }) ||
                    (parentMsg.thread || []).some(
                      (r) => r.id !== item.id && (Number(r.senderId) === myStaffId || String(r.senderId) === myId)
                    ))
                );

                // In Spaces, if a message tags someone else (has '@') and neither mentions current user nor replies to current user's thread, ignore!
                const tagsSomeoneElseOnly =
                  !isDirectMsg && !isMentioned && !isMyThreadReply && /@\S+/.test(item.text || '');
                if (tagsSomeoneElseOnly) return;

                const isPersonalForMe = isDirectMsg || isMentioned || isMyThreadReply;

                // ──── Tiered Notification Filter for regular messages ────
                // Apply the same tiered filter as BUZZ: DMs and @mentions always pass through.
                if (!shouldShowPopupAndSound(isPersonalForMe)) return;

                if (isPersonalForMe && typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('mos-notifications:refresh'));
                }

                tabNotificationManager.triggerAlert({
                  senderName: item.senderName || 'Đồng nghiệp',
                  snippet: item.text || '',
                  conversationName: conv.name,
                  isDirect: isDirectMsg,
                });

                if (presence !== 'dnd') {
                  playMessengerChime();
                }

                if (typeof document !== 'undefined' && document.hidden) {
                  showDesktopNotification(
                    isDirectMsg ? item.senderName || 'mOS Chat' : `${conv.name} · ${item.senderName}`,
                    {
                      body: item.text
                        ? item.text.length > 80
                          ? `${item.text.slice(0, 80)}...`
                          : item.text
                        : 'Đã gửi một tin nhắn',
                      tag: `mos-msg-${conv.id}`,
                      conversationId: conv.id,
                      messageId: item.id,
                    }
                  );
                } else if (
                  isPersonalForMe &&
                  (!openRef.current || activeConvIdRef.current !== conv.id || activeSubtab !== 'chat')
                ) {
                  const senderLabel = item.senderName || conv.name || 'Đồng nghiệp';
                  const preview = item.text
                    ? item.text.length > 90
                      ? `${item.text.slice(0, 90)}...`
                      : item.text
                    : 'Đã gửi một hình ảnh / tin nhắn mới';
                  const toastTitle = isDirectMsg
                    ? `💬 Tin nhắn mới từ ${senderLabel}`
                    : isMentioned
                      ? `💬 ${senderLabel} đã nhắc tên bạn trong #${conv.name}`
                      : `💬 ${senderLabel} phản hồi luồng của bạn trong #${conv.name}`;
                  notification.info({
                    key: `chat-msg-notify-${item.id}`,
                    message: <span className="font-semibold text-xs">{toastTitle}</span>,
                    description: <div className="text-xs line-clamp-2">{preview}</div>,
                    placement: 'topRight',
                    duration: 5,
                    style: {
                      background: surfaceRaised,
                      border: `1px solid ${borderColor}`,
                      color: token.colorText,
                      borderRadius: 12,
                      cursor: 'pointer',
                    },
                    onClick: () => {
                      ensurePortalOpen();
                      navigateToMessageRef.current(conv.id, item.id);
                      notification.destroy(`chat-msg-notify-${item.id}`);
                    },
                  });
                }
              };

              for (const m of conv.messages || []) {
                handleUrgentBuzzItem(m);
                handleIncomingMessageItem(m);
                if (m.thread && m.thread.length > 0) {
                  for (const r of m.thread) {
                    handleUrgentBuzzItem(r);
                    handleIncomingMessageItem(r, m);
                  }
                }
              }
            }
          }
          if (isInitialBootstrapRef.current) {
            isInitialBootstrapRef.current = false;
          }
        }
        if (res?.tasks) {
          setTasks(res.tasks);
        }
        if (Array.isArray(res?.workflowTemplates)) {
          setWorkflowTemplates(res.workflowTemplates);
        }
        if (Array.isArray(res?.workflowInstances)) {
          setWorkflowInstances(res.workflowInstances);
        }
      } catch (_) {
        // Fallback state already initialized
      }
    },
    [userSidebarPrefsStorageKey, maiVoiceAnnounceEnabled, ttsSpeed]
  );

  useMosChatBridgeListener(
    useCallback(
      (payload) => {
        if (payload.type === 'OPEN_CONVERSATION') {
          navigateToMessageRef.current(payload.conversationId, payload.messageId);
        } else if (payload.type === 'OPEN_WORKFLOW_MODAL' && isStrictDannySuperAdmin) {
          if (payload.conversationId) {
            setActiveConvId(payload.conversationId);
          }
          setInitialWorkflowCode(payload.templateCode || 'WF_CASH_ADVANCE');
          setTriggerWorkflowModalOpen(true);
        } else if (payload.type === 'SHARE_ENTITY_CONTEXT') {
          if (payload.conversationId) {
            setActiveConvId(payload.conversationId);
          }
          if (payload.initialDraftText) {
            updateComposerText(payload.initialDraftText);
          }
        }
      },
      [isStrictDannySuperAdmin]
    )
  );

  useEffect(() => {
    fetchBootstrap();
    let timer: NodeJS.Timeout;

    const scheduleNext = () => {
      const isHidden = typeof document !== 'undefined' && document.hidden;
      // In background tab: poll every 20000ms so tab title & favicon alerts trigger without burning background CPU!
      // In visible active tab: poll every 5000ms (if open or docked) or 15000ms.
      const delay = isHidden ? 20000 : open || dockedConvIds.length > 0 ? 5000 : 15000;
      timer = setTimeout(() => {
        fetchBootstrap();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchBootstrap();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchBootstrap, open, dockedConvIds.length]);

  useChatRealtimeSync({
    enabled: Boolean(open || dockedConvIds.length > 0),
    intervalMs: 12_000,
    onDeltaSynced: (delta) => {
      if (
        delta.updatedConversations.length > 0 ||
        delta.updatedMessages.length > 0 ||
        delta.updatedMissions.length > 0
      ) {
        setConversations((prev) =>
          mergeDeltaConversations(prev, delta.updatedConversations, delta.updatedMessages, delta.updatedMissions)
        );
      }
      if (delta.updatedTasks.length > 0 || delta.updatedMissions.length > 0) {
        setTasks((prev) => mergeDeltaTasks(prev, delta.updatedTasks, delta.updatedMissions));
      }
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('mos_google_chat_live_v1');
    broadcastChannelRef.current = channel;
    channel.onmessage = () => {
      fetchBootstrap(true);
    };
    return () => {
      channel.close();
      broadcastChannelRef.current = null;
    };
  }, [fetchBootstrap]);

  // Global keyboard shortcut Cmd/Ctrl + J & Lightbox Esc / ArrowLeft / ArrowRight / Zoom controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxImage) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setLightboxImage(null);
          return;
        }
        if (e.key === 'ArrowLeft' && lightboxImage.items.length > 1) {
          e.preventDefault();
          setLightboxImage((prev) =>
            prev
              ? {
                  ...prev,
                  currentIndex: (prev.currentIndex - 1 + prev.items.length) % prev.items.length,
                  zoom: 1,
                  rotate: 0,
                }
              : null
          );
          return;
        }
        if (e.key === 'ArrowRight' && lightboxImage.items.length > 1) {
          e.preventDefault();
          setLightboxImage((prev) =>
            prev
              ? {
                  ...prev,
                  currentIndex: (prev.currentIndex + 1) % prev.items.length,
                  zoom: 1,
                  rotate: 0,
                }
              : null
          );
          return;
        }
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          setLightboxImage((prev) =>
            prev ? { ...prev, zoom: Math.min(4, Number((prev.zoom + 0.25).toFixed(2))) } : null
          );
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          setLightboxImage((prev) =>
            prev ? { ...prev, zoom: Math.max(0.5, Number((prev.zoom - 0.25).toFixed(2))) } : null
          );
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          setLightboxImage((prev) => (prev ? { ...prev, zoom: 1, rotate: 0 } : null));
          return;
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        onToggle();
        return;
      }
      if (open && e.key === 'Escape') {
        const hasInnerModalOpen =
          taskModalOpen ||
          newRoomModalOpen ||
          spaceMembersModalOpen ||
          accessConfigModalOpen ||
          sidebarCustomizeModalOpen ||
          quickCreateSectionModalOpen ||
          driveLinkModalOpen ||
          negotiateModalOpen ||
          missionModalOpen ||
          historyModalOpen ||
          triggerWorkflowModalOpen ||
          saveThreadWorkflowModalOpen;
        if (hasInnerModalOpen) {
          return;
        }
        if (threadOpen) {
          e.preventDefault();
          setThreadOpen(false);
          return;
        }
        e.preventDefault();
        onClose?.();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onToggle,
    onClose,
    open,
    lightboxImage,
    threadOpen,
    taskModalOpen,
    newRoomModalOpen,
    spaceMembersModalOpen,
    accessConfigModalOpen,
    sidebarCustomizeModalOpen,
    quickCreateSectionModalOpen,
    driveLinkModalOpen,
    negotiateModalOpen,
    missionModalOpen,
    historyModalOpen,
    triggerWorkflowModalOpen,
    saveThreadWorkflowModalOpen,
  ]);

  // Auto-focus composer input when chat opens or switches room
  useEffect(() => {
    if (
      open &&
      activeSubtab === 'chat' &&
      !taskModalOpen &&
      !newRoomModalOpen &&
      !spaceMembersModalOpen &&
      !accessConfigModalOpen &&
      !sidebarCustomizeModalOpen &&
      !quickCreateSectionModalOpen &&
      !driveLinkModalOpen &&
      !lightboxImage
    ) {
      const t = setTimeout(() => {
        composerInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(t);
    }
  }, [
    open,
    activeConvId,
    activeSubtab,
    taskModalOpen,
    newRoomModalOpen,
    spaceMembersModalOpen,
    accessConfigModalOpen,
    sidebarCustomizeModalOpen,
    quickCreateSectionModalOpen,
    driveLinkModalOpen,
    lightboxImage,
  ]);

  // Smart click-anywhere-on-screen to auto-focus chat composer (ignores links, buttons, inputs, modals, and text selection)
  useEffect(() => {
    const hasExpandedDock = dockedConvIds.some((id) => !collapsedDockIds[id]);
    if (!open && !hasExpandedDock) return;
    if (
      taskModalOpen ||
      newRoomModalOpen ||
      spaceMembersModalOpen ||
      accessConfigModalOpen ||
      sidebarCustomizeModalOpen ||
      quickCreateSectionModalOpen ||
      driveLinkModalOpen ||
      lightboxImage
    )
      return;

    const INTERACTIVE_SELECTOR = [
      'a',
      'button',
      'input',
      'textarea',
      'select',
      'label',
      'summary',
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="option"]',
      '[role="tab"]',
      '[role="switch"]',
      '[role="checkbox"]',
      '[role="combobox"]',
      '[role="dialog"]',
      '[contenteditable="true"]',
      '[data-no-chat-autofocus="true"]',
      '.ant-modal',
      '.ant-drawer',
      '.ant-select',
      '.ant-select-dropdown',
      '.ant-picker',
      '.ant-picker-dropdown',
      '.ant-dropdown',
      '.ant-popover',
      '.ant-popconfirm',
      '.ant-tooltip',
      '.ant-pagination',
      '.ant-tabs-tab',
      '.ant-table-thead th.ant-table-column-has-sorters',
      '.ant-checkbox-wrapper',
      '.ant-radio-wrapper',
      '.ant-switch',
      '.ant-upload',
    ].join(', ');

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // Preserve text selection if the user dragged to highlight text
      const selection = window.getSelection()?.toString().trim();
      if (selection && selection.length > 0) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Do not hijack clicks on links, buttons, inputs, or interactive controls
      if (target.closest(INTERACTIVE_SELECTOR)) return;

      // 1. If clicked inside a Mini Dock window, focus that dock's input
      const dockEl = target.closest('[data-dock-conv-id]') as HTMLElement | null;
      if (dockEl) {
        const dockConvId = dockEl.getAttribute('data-dock-conv-id');
        if (dockConvId && dockInputRefs.current[dockConvId]) {
          dockInputRefs.current[dockConvId]?.focus();
          return;
        }
      }

      // 2. If clicked inside the Side Thread pane, focus the thread input
      if (open && threadOpen && target.closest('[data-chat-thread-pane="true"]')) {
        threadInputRef.current?.focus();
        return;
      }

      // 3. If main chat panel is open on 'chat' tab, focus the main composer input
      if (open && activeSubtab === 'chat') {
        composerInputRef.current?.focus();
        return;
      }

      // 4. Fallback: if main chat panel is closed but an expanded Mini Dock window exists, focus the latest expanded dock input
      const activeDockId = [...dockedConvIds].reverse().find((id) => !collapsedDockIds[id]);
      if (activeDockId && dockInputRefs.current[activeDockId]) {
        dockInputRefs.current[activeDockId]?.focus();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [
    open,
    activeSubtab,
    threadOpen,
    dockedConvIds,
    collapsedDockIds,
    taskModalOpen,
    newRoomModalOpen,
    spaceMembersModalOpen,
    accessConfigModalOpen,
    sidebarCustomizeModalOpen,
    quickCreateSectionModalOpen,
    driveLinkModalOpen,
    lightboxImage,
  ]);

  /**
   * Strict Conversation Privacy Guard:
   * - A 1-1 Direct Message (`type === 'dm'`) is ONLY visible to the 2 participants (`memberIds.includes(myStaffId)`).
   * - A Self-Chat (`isSelf`) is ONLY visible to its single owner.
   * - A Restricted Space with specific memberIds (`conv.memberIds.length > 0`) is ONLY visible to its members or Danny/SuperAdmin.
   * - Public spaces remain visible to all users.
   */
  const isConversationVisibleToCurrentUser = useCallback(
    (conv: MosChatConversation): boolean => {
      if (conv.id === AI_COPILOT_CONV_ID) return canUseAiCopilot;
      const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
      if (myStaffId <= 0) return false;
      const convIdStr = String(conv.id || '');
      if (convIdStr === 'dm-tuyetnhi' || convIdStr === 'dm-hamy') return false;

      if (conv.type === 'dm') {
        if (conv.isSelf || convIdStr.startsWith('dm-self-')) {
          return Number(conv.participantStaffId) === myStaffId || convIdStr === `dm-self-${myStaffId}`;
        }
        if (Array.isArray(conv.memberIds) && conv.memberIds.length > 0) {
          const nums = conv.memberIds.map(Number).filter((n) => Number.isFinite(n) && n > 0);
          return nums.length === 2 && nums.includes(myStaffId);
        }
        const pairMatch = convIdStr.match(/^dm-pair-(\d+)-(\d+)$/);
        if (pairMatch) {
          const a = Number(pairMatch[1]);
          const b = Number(pairMatch[2]);
          return a === myStaffId || b === myStaffId;
        }
        return Number(conv.participantStaffId) === myStaffId;
      }

      if (conv.type === 'space') {
        if (isStrictDannySuperAdmin) return true;
        if (Array.isArray(conv.memberIds) && conv.memberIds.length > 0) {
          const nums = conv.memberIds.map(Number).filter((n) => Number.isFinite(n) && n > 0);
          if (nums.length > 0) {
            return nums.includes(myStaffId);
          }
        }
        return true;
      }

      return true;
    },
    [canUseAiCopilot, currentUserStaffMember.id, currentUser?.id, isStrictDannySuperAdmin]
  );

  const visibleConversations = useMemo(
    () => conversations.filter(isConversationVisibleToCurrentUser),
    [conversations, isConversationVisibleToCurrentUser]
  );

  const getEffectiveUnreadCount = useCallback(
    (conv: MosChatConversation): number => {
      const manualUnread = (userPrefs.manualUnreadIds || []).includes(conv.id);
      if (manualUnread) return Math.max(1, conv.unreadCount || 0);

      // If this conversation is currently open and active in the main panel, it is being read right now!
      if (open && activeConvId === conv.id && activeSubtab === 'chat') {
        return 0;
      }

      // If open in an active mini dock window, it is also visible
      if (dockedConvIds.includes(conv.id) && !collapsedDockIds[conv.id]) {
        return 0;
      }

      const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
      const msgs = conv.messages || [];
      if (msgs.length === 0) return 0;

      const unreadThreadTotal = conv.unreadThreadCount || 0;
      const readCount = userPrefs.readMessageCountByConv?.[conv.id];
      if (typeof readCount === 'number') {
        const unreadMsgs = msgs.slice(readCount).filter((m) => {
          const senderNum = Number(m.senderId);
          return senderNum !== myStaffId;
        });
        return unreadMsgs.length + unreadThreadTotal;
      }

      // If readCount is undefined:
      if (conv.type === 'dm') {
        let unread = 0;
        for (let i = msgs.length - 1; i >= 0; i--) {
          const m = msgs[i];
          const senderNum = Number(m.senderId);
          if (senderNum === myStaffId) {
            break;
          }
          unread++;
        }
        return Math.max(conv.unreadCount || 0, unread) + unreadThreadTotal;
      }

      return (conv.unreadCount || 0) + unreadThreadTotal;
    },
    [
      userPrefs.manualUnreadIds,
      userPrefs.readMessageCountByConv,
      open,
      activeConvId,
      activeSubtab,
      dockedConvIds,
      collapsedDockIds,
      currentUserStaffMember.id,
      currentUser?.id,
    ]
  );

  const isConversationHiddenByUser = useCallback(
    (conv: MosChatConversation): boolean => {
      if (!(userPrefs.hiddenIds || []).includes(conv.id)) return false;
      const hiddenAtMsgCount = userPrefs.readMessageCountByConv?.[conv.id];
      if (typeof hiddenAtMsgCount === 'number' && conv.messages.length > hiddenAtMsgCount) {
        // New message arrived since the user hid this conversation -> auto-resurface like Google Chat!
        return false;
      }
      return true;
    },
    [userPrefs.hiddenIds, userPrefs.readMessageCountByConv]
  );

  // Listen to global custom event 'mos-chat:open' (e.g. clicking an online colleague avatar on Header or from Notification)
  useEffect(() => {
    const handleGlobalChatOpen = async (ev: Event) => {
      const customEv = ev as CustomEvent<{
        conversationId?: string;
        messageId?: string;
        participantStaffId?: number;
        participantName?: string;
        customerCard?: MosChatCustomerCard;
        openTab?: 'chat' | 'tasks' | 'pinned';
        taskId?: string;
      }>;
      const detail = customEv.detail || {};

      ensurePortalOpen();

      if (detail.openTab) {
        setActiveSubtab(detail.openTab);
      }

      if (detail.conversationId) {
        navigateToMessageRef.current(detail.conversationId, detail.messageId);
        return;
      }
      if (detail.participantName || detail.participantStaffId) {
        const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
        const targetPeerId = Number(detail.participantStaffId) || 0;
        const normalizedTarget = detail.participantName
          ? removeVietnameseTones(detail.participantName.toLowerCase())
          : '';
        const matched = visibleConversations.find((c) => {
          if (c.type !== 'dm' || c.isSelf) return false;
          if (targetPeerId > 0 && myStaffId > 0 && Array.isArray(c.memberIds)) {
            const nums = c.memberIds.map(Number);
            if (nums.includes(myStaffId) && nums.includes(targetPeerId)) return true;
          }
          if (targetPeerId > 0 && Number(c.participantStaffId) === targetPeerId) return true;
          return Boolean(normalizedTarget && removeVietnameseTones(c.name.toLowerCase()).includes(normalizedTarget));
        });
        if (matched) {
          setActiveConvId(matched.id);
          setActiveSubtab('chat');
          if (isMobile) setMobileActiveView('conversation');
          return;
        }
        try {
          const created = await apiClient.chat.createConversation({
            type: 'dm',
            name: detail.participantName || 'Trò chuyện 1-1',
            participantStaffId: detail.participantStaffId,
          });
          if (created?.conversation) {
            setConversations((prev) => [created.conversation, ...prev.filter((x) => x.id !== created.conversation.id)]);
            setActiveConvId(created.conversation.id);
            setActiveSubtab('chat');
            if (isMobile) setMobileActiveView('conversation');
            notifyLivePeers();
          }
        } catch (_) {}
      }
    };
    window.addEventListener('mos-chat:open', handleGlobalChatOpen);
    return () => window.removeEventListener('mos-chat:open', handleGlobalChatOpen);
  }, [visibleConversations, currentUserStaffMember.id, currentUser?.id, notifyLivePeers]);

  const uniqueTasks = useMemo<MosChatTaskItem[]>(() => {
    const out: MosChatTaskItem[] = [];
    const byId = new Map<string, MosChatTaskItem>();
    const byMsgKey = new Map<string, MosChatTaskItem>();
    const byTitleKey = new Map<string, MosChatTaskItem>();
    const byMissionKey = new Map<string, MosChatTaskItem>();

    for (const raw of tasks) {
      if (!raw || !raw.id || !String(raw.title || '').trim()) continue;
      if (String(raw.id).startsWith('task-seed-')) continue;
      const missionIdNum = raw.missionId && Number(raw.missionId) > 0 ? Number(raw.missionId) : 0;
      if (
        !missionIdNum &&
        (String(raw.assigneeName || '').includes('Hà My') || String(raw.sourceAuthorName || '').includes('Hà My'))
      ) {
        continue;
      }

      const convId = String(raw.conversationId || '').trim();
      const msgId = raw.sourceMessageId ? String(raw.sourceMessageId).trim() : '';
      const normTitle = String(raw.title || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

      const msgKey = convId && msgId ? `${convId}::msg::${msgId}` : '';
      const titleKey = convId && normTitle ? `${convId}::title::${normTitle}` : '';
      const mKey = missionIdNum > 0 ? `mission::${missionIdNum}` : '';

      const existing =
        byId.get(raw.id) ||
        (msgKey ? byMsgKey.get(msgKey) : undefined) ||
        (mKey ? byMissionKey.get(mKey) : undefined) ||
        (titleKey ? byTitleKey.get(titleKey) : undefined);

      if (existing) {
        if (!existing.missionId && missionIdNum > 0) {
          existing.missionId = missionIdNum;
          existing.missionKey = raw.missionKey || existing.missionKey;
          existing.mission = raw.mission || existing.mission;
          if (mKey) byMissionKey.set(mKey, existing);
        } else if (!existing.mission && raw.mission) {
          existing.mission = raw.mission;
        }
        if (!existing.sourceMessageId && msgId) {
          existing.sourceMessageId = msgId;
          if (msgKey) byMsgKey.set(msgKey, existing);
        }
        if (
          String(existing.assigneeName || '').includes('Hà My') &&
          raw.assigneeName &&
          !String(raw.assigneeName).includes('Hà My')
        ) {
          existing.assigneeName = raw.assigneeName;
          existing.assigneeId = raw.assigneeId ?? existing.assigneeId;
        }
        if (raw.archived !== undefined) {
          existing.archived = raw.archived;
          existing.archivedAt = raw.archivedAt ?? existing.archivedAt;
        }
        continue;
      }

      const cloned: MosChatTaskItem = { ...raw };
      if (String(cloned.assigneeName || '').includes('Hà My')) {
        cloned.assigneeName = cloned.creatorName || 'Chưa phân công';
        cloned.assigneeId = undefined;
      }
      out.push(cloned);
      byId.set(cloned.id, cloned);
      if (msgKey) byMsgKey.set(msgKey, cloned);
      if (titleKey) byTitleKey.set(titleKey, cloned);
      if (mKey) byMissionKey.set(mKey, cloned);
    }
    return out;
  }, [tasks]);

  // Report unread & active task counts up to Header
  useEffect(() => {
    const totalUnread = visibleConversations.reduce((sum, c) => {
      if ((userPrefs.mutedIds || []).includes(c.id)) return sum;
      return sum + getEffectiveUnreadCount(c);
    }, 0);
    const openTaskCount = uniqueTasks.filter((t) => !t.done && !t.archived).length;
    onUnreadCountChange?.(totalUnread, openTaskCount);
    tabNotificationManager.setUnreadCount('chat', totalUnread);
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        const syncChannel = new BroadcastChannel('mos_chat_sync');
        syncChannel.postMessage({
          type: 'UNREAD_UPDATE',
          unreadCount: totalUnread,
          activeTaskCount: openTaskCount,
        });
        syncChannel.close();
      } catch {}
    }
  }, [visibleConversations, uniqueTasks, userPrefs.mutedIds, getEffectiveUnreadCount, onUnreadCountChange]);

  const triggerTaskReminderAlert = useCallback(
    async (task: MosChatTaskItem) => {
      firedTaskIdsRef.current.add(task.id);
      const isConvMuted = (userPrefs.mutedIds || []).includes(task.conversationId);
      if (presence !== 'dnd' && !isConvMuted) {
        playWebAudioReminderChime();
      }
      setActiveAlertTask(task);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, fired: true } : t)));

      try {
        await apiClient.chat.updateTask(task.id, { triggerReminderNow: true });
        notifyLivePeers();
      } catch (_) {}
    },
    [presence, userPrefs.mutedIds, notifyLivePeers]
  );

  // 1-second ticker for task reminder alerts (only active when there are unfired pending tasks)
  useEffect(() => {
    const pendingReminderTasks = uniqueTasks.filter(
      (t) => !t.done && !t.archived && !t.fired && Boolean(t.remindAt) && !firedTaskIdsRef.current.has(t.id)
    );
    if (pendingReminderTasks.length === 0) return;

    const timer = setInterval(() => {
      const currentNow = Date.now();
      pendingReminderTasks.forEach((t) => {
        if (!t.done && !t.archived && !t.fired && !firedTaskIdsRef.current.has(t.id)) {
          const remainMs = new Date(t.remindAt).getTime() - currentNow;
          if (remainMs <= 0) {
            triggerTaskReminderAlert(t);
          }
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [uniqueTasks, triggerTaskReminderAlert]);

  const aiCopilotConversation = useMemo<MosChatConversation | null>(() => {
    if (!canUseAiCopilot) return null;
    return {
      id: AI_COPILOT_CONV_ID,
      type: 'dm',
      name: '🤖 MAI',
      subtitle: 'mOS AI · Tra cứu dữ liệu & Phân tích riêng tư',
      roleTag: 'mOS AI',
      color: '#8b5cf6',
      avatar: 'MAI',
      unreadCount: 0,
      messages: aiMessages,
      updatedAt: new Date().toISOString(),
    };
  }, [canUseAiCopilot, aiMessages]);

  const activeConversation = useMemo(() => {
    if (activeConvId === AI_COPILOT_CONV_ID && aiCopilotConversation) {
      return aiCopilotConversation;
    }
    return visibleConversations.find((c) => c.id === activeConvId) || aiCopilotConversation || visibleConversations[0];
  }, [visibleConversations, activeConvId, aiCopilotConversation]);

  const pinnedMessages = useMemo(() => {
    return (activeConversation?.messages || []).filter((m) => m.pinned);
  }, [activeConversation?.messages]);

  const allUserConversations = useMemo<MosChatConversation[]>(() => {
    return aiCopilotConversation ? [aiCopilotConversation, ...visibleConversations] : [...visibleConversations];
  }, [aiCopilotConversation, visibleConversations]);

  const filteredConversations = useMemo(() => {
    const q = removeVietnameseTones(searchQuery.trim().toLowerCase());
    return allUserConversations.filter((c) => {
      if (!q && isConversationHiddenByUser(c)) return false;
      const effUnread = getEffectiveUnreadCount(c);
      if (sidebarFilter === 'unread' && effUnread <= 0) return false;
      if (sidebarFilter === 'spaces' && c.type !== 'space') return false;
      if (!q) return true;
      const inName = removeVietnameseTones(c.name.toLowerCase()).includes(q);
      const inMsg = c.messages.some((m) => removeVietnameseTones(m.text.toLowerCase()).includes(q));
      return inName || inMsg;
    });
  }, [allUserConversations, isConversationHiddenByUser, getEffectiveUnreadCount, sidebarFilter, searchQuery]);

  const isMyTask = useCallback(
    (t: MosChatTaskItem): boolean => {
      if (!t) return false;
      const myId = currentUser?.id ? String(currentUser.id) : null;
      const myStaffId = currentUserStaffMember?.id ? String(currentUserStaffMember.id) : null;
      const myName = (currentUser?.displayName || '').trim().toLowerCase();
      const myUsername = (currentUser?.username || '').trim().toLowerCase();

      if (t.assigneeId != null) {
        const aid = String(t.assigneeId);
        if (aid === myId || aid === myStaffId) return true;
      }
      const aName = (t.assigneeName || '').trim().toLowerCase();
      if (aName) {
        if (myName && (aName === myName || aName.includes(myName) || myName.includes(aName))) return true;
        if (myUsername && (aName === myUsername || aName.includes(myUsername))) return true;
      }
      return false;
    },
    [currentUser?.id, currentUser?.displayName, currentUser?.username, currentUserStaffMember?.id]
  );

  const taskCounts = useMemo(() => {
    let active = 0;
    let done = 0;
    let archived = 0;
    let overdue = 0;
    let mine = 0;
    let space = 0;
    const now = dayjs();
    for (const t of uniqueTasks) {
      if (t.archived) {
        archived++;
      } else if (t.done) {
        done++;
      } else {
        active++;
        if (t.deadline && dayjs(t.deadline).isBefore(now)) {
          overdue++;
        }
      }
      if (!t.done && !t.archived && isMyTask(t)) {
        mine++;
      }
      if (activeConversation && t.conversationId === activeConversation.id && !t.done && !t.archived) {
        space++;
      }
    }
    return { active, done, archived, overdue, mine, space, total: uniqueTasks.length };
  }, [uniqueTasks, isMyTask, activeConversation]);

  const filteredTasks = useMemo(() => {
    const now = dayjs();
    const query = taskSearchQuery.trim().toLowerCase();

    return uniqueTasks.filter((t) => {
      // 1. Status Filter
      if (taskFilter === 'ACTIVE' && (t.done || t.archived)) return false;
      if (taskFilter === 'MINE' && (t.done || t.archived || !isMyTask(t))) return false;
      if (taskFilter === 'OVERDUE' && (t.done || t.archived || !t.deadline || !dayjs(t.deadline).isBefore(now))) {
        return false;
      }
      if (taskFilter === 'DONE' && (!t.done || t.archived)) return false;
      if (taskFilter === 'ARCHIVED' && !t.archived) return false;

      // 2. Scope Filter (Tất cả / Của tôi / Không gian này)
      if (taskScopeFilter === 'MINE' && !isMyTask(t)) return false;
      if (taskScopeFilter === 'SPACE' && activeConversation && t.conversationId !== activeConversation.id) {
        return false;
      }

      // 3. Search Query Filter
      if (query) {
        const titleMatch = (t.title || '').toLowerCase().includes(query);
        const codeMatch = (t.id || '').toLowerCase().includes(query);
        const assigneeMatch = (t.assigneeName || '').toLowerCase().includes(query);
        const creatorMatch = (t.creatorName || '').toLowerCase().includes(query);
        const convMatch = (t.conversationName || '').toLowerCase().includes(query);
        if (!titleMatch && !codeMatch && !assigneeMatch && !creatorMatch && !convMatch) {
          return false;
        }
      }

      return true;
    });
  }, [uniqueTasks, taskFilter, taskScopeFilter, taskSearchQuery, isMyTask, activeConversation]);

  const { currentSpaceTasks, otherSpaceTasks } = useMemo(() => {
    if (!activeConversation) {
      return { currentSpaceTasks: [], otherSpaceTasks: filteredTasks };
    }
    const current: MosChatTaskItem[] = [];
    const other: MosChatTaskItem[] = [];
    for (const t of filteredTasks) {
      if (t.conversationId === activeConversation.id) {
        current.push(t);
      } else {
        other.push(t);
      }
    }
    return { currentSpaceTasks: current, otherSpaceTasks: other };
  }, [filteredTasks, activeConversation]);

  const sortConversationsForSection = useCallback(
    (items: MosChatConversation[], sectionId: string): MosChatConversation[] => {
      const pinnedArr = userPrefs.pinnedIds || [];
      const pinnedSet = new Set(pinnedArr);
      const pinnedIdxMap = new Map<string, number>();
      pinnedArr.forEach((id, idx) => pinnedIdxMap.set(id, idx));

      const orderArr = userPrefs.conversationOrder?.[sectionId] || [];
      const orderMap = new Map<string, number>();
      orderArr.forEach((id, idx) => orderMap.set(id, idx));

      return [...items].sort((a, b) => {
        const aPinned = pinnedSet.has(a.id) ? 1 : 0;
        const bPinned = pinnedSet.has(b.id) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;

        // If both are pinned, prefer explicit conversationOrder if both are present, otherwise pinnedIds order
        if (aPinned && bPinned) {
          if (orderMap.has(a.id) && orderMap.has(b.id)) {
            return orderMap.get(a.id)! - orderMap.get(b.id)!;
          }
          const aPinIdx = pinnedIdxMap.has(a.id) ? pinnedIdxMap.get(a.id)! : 9999;
          const bPinIdx = pinnedIdxMap.has(b.id) ? pinnedIdxMap.get(b.id)! : 9999;
          if (aPinIdx !== bPinIdx) return aPinIdx - bPinIdx;
        }

        const aOrder = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
        const bOrder = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        if (a.id === AI_COPILOT_CONV_ID) return -1;
        if (b.id === AI_COPILOT_CONV_ID) return 1;
        return 0;
      });
    },
    [userPrefs.pinnedIds, userPrefs.conversationOrder]
  );

  // Compute Google Chat Workspace sections (Custom Sections + DIRECT MESSAGES + SPACES)
  const sidebarSections = useMemo(() => {
    const rawCustomSecs = userPrefs.customSections || [];
    const seenSecNames = new Set<string>();
    const seenSecIds = new Set<string>();
    const customSecs: MosChatCustomSection[] = [];
    rawCustomSecs.forEach((s) => {
      const normName = (s.name || '').trim().toLowerCase();
      if (!normName || seenSecNames.has(normName) || seenSecIds.has(s.id)) return;
      seenSecNames.add(normName);
      seenSecIds.add(s.id);
      customSecs.push(s);
    });

    const assignedToCustom = new Set<string>();
    customSecs.forEach((s) => {
      (s.conversationIds || []).forEach((cid) => assignedToCustom.add(cid));
    });

    const customIds = customSecs.map((s) => s.id);
    const orderedSectionIds = Array.from(
      new Set([...(userPrefs.sectionOrder || []), ...customIds, 'dm', 'spaces'])
    ).filter((id) => id === 'dm' || id === 'spaces' || customIds.includes(id));

    const isSearching = searchQuery.trim().length > 0;

    return orderedSectionIds
      .map((secId) => {
        if (secId === 'dm') {
          if (sidebarFilter === 'spaces') return null;
          const rawItems = filteredConversations.filter((c) => c.type === 'dm' && !assignedToCustom.has(c.id));
          const sorted = sortConversationsForSection(rawItems, 'dm');
          const unreadOnly = Boolean(userPrefs.unreadOnlySections?.['dm']);
          const displayItems =
            unreadOnly && !isSearching
              ? sorted.filter((c) => getEffectiveUnreadCount(c) > 0 || c.id === activeConversation?.id)
              : sorted;
          return {
            id: 'dm',
            title: 'DIRECT MESSAGES',
            isCustom: false,
            items: displayItems,
            totalCount: sorted.length,
            unreadCount: sorted.reduce((s, c) => s + getEffectiveUnreadCount(c), 0),
            collapsed: Boolean(userPrefs.collapsedSections?.['dm']),
            unreadOnly,
          };
        }
        if (secId === 'spaces') {
          const rawItems = filteredConversations.filter((c) => c.type === 'space' && !assignedToCustom.has(c.id));
          const sorted = sortConversationsForSection(rawItems, 'spaces');
          const unreadOnly = Boolean(userPrefs.unreadOnlySections?.['spaces']);
          const displayItems =
            unreadOnly && !isSearching
              ? sorted.filter((c) => getEffectiveUnreadCount(c) > 0 || c.id === activeConversation?.id)
              : sorted;
          return {
            id: 'spaces',
            title: 'SPACES',
            isCustom: false,
            items: displayItems,
            totalCount: sorted.length,
            unreadCount: sorted.reduce((s, c) => s + getEffectiveUnreadCount(c), 0),
            collapsed: Boolean(userPrefs.collapsedSections?.['spaces']),
            unreadOnly,
          };
        }
        const customSec = customSecs.find((s) => s.id === secId);
        if (!customSec) return null;
        const idSet = new Set(customSec.conversationIds || []);
        const rawItems = filteredConversations.filter((c) => idSet.has(c.id));
        const sorted = sortConversationsForSection(rawItems, customSec.id);
        const unreadOnly = Boolean(userPrefs.unreadOnlySections?.[customSec.id] || customSec.unreadOnly);
        const displayItems =
          unreadOnly && !isSearching
            ? sorted.filter((c) => getEffectiveUnreadCount(c) > 0 || c.id === activeConversation?.id)
            : sorted;
        return {
          id: customSec.id,
          title: customSec.name,
          isCustom: true,
          items: displayItems,
          totalCount: sorted.length,
          unreadCount: sorted.reduce((s, c) => s + getEffectiveUnreadCount(c), 0),
          collapsed: Boolean(userPrefs.collapsedSections?.[customSec.id] ?? customSec.collapsed),
          unreadOnly,
        };
      })
      .filter((sec): sec is NonNullable<typeof sec> => Boolean(sec));
  }, [
    userPrefs.customSections,
    userPrefs.sectionOrder,
    userPrefs.unreadOnlySections,
    userPrefs.collapsedSections,
    searchQuery,
    sidebarFilter,
    filteredConversations,
    sortConversationsForSection,
    getEffectiveUnreadCount,
    activeConversation?.id,
  ]);

  const [isTabVisible, setIsTabVisible] = useState<boolean>(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  );

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const syncVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        setIsTabVisible(true);
      }
    };
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const markConversationReadOptimisticAndSync = useCallback(
    (convId: string, msgCount: number, lastMsgId?: string) => {
      if (!convId) return;
      const nowIso = new Date().toISOString();
      const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
      const myName = currentUserStaffMember.displayName || currentUser?.displayName || currentUser?.username || 'Bạn';
      const myRole = currentUserStaffMember.role || currentUser?.role || 'Member';
      const myAvatar = currentUserStaffMember.avatarUrl || null;

      if (convId === AI_COPILOT_CONV_ID) {
        updateUserSidebarPrefs((prev) => ({
          ...prev,
          manualUnreadIds: (prev.manualUnreadIds || []).filter((id) => id !== convId),
          readMessageCountByConv: {
            ...(prev.readMessageCountByConv || {}),
            [convId]: msgCount,
          },
          readAtByConv: {
            ...(prev.readAtByConv || {}),
            [convId]: nowIso,
          },
          ...(lastMsgId
            ? {
                lastReadMessageIdByConv: {
                  ...(prev.lastReadMessageIdByConv || {}),
                  [convId]: lastMsgId,
                },
              }
            : {}),
        }));
        return;
      }

      const targetConv = conversations.find((c) => c.id === convId);
      const threadRepliesUpdates: Record<string, number> = {};
      const threadAtUpdates: Record<string, string> = {};
      const threadLastReplyUpdates: Record<string, string> = {};
      for (const m of targetConv?.messages || []) {
        if (m.thread && m.thread.length > 0) {
          const threadKey = `${convId}::${m.id}`;
          const repCount = m.thread.length;
          threadRepliesUpdates[m.id] = repCount;
          threadRepliesUpdates[threadKey] = repCount;
          threadAtUpdates[m.id] = nowIso;
          threadAtUpdates[threadKey] = nowIso;
          const lastRep = m.thread[m.thread.length - 1];
          if (lastRep?.id) {
            threadLastReplyUpdates[m.id] = lastRep.id;
            threadLastReplyUpdates[threadKey] = lastRep.id;
          }
        }
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const existingReceipts = c.readReceipts || [];
          const updatedReceipts =
            myStaffId > 0
              ? [
                  ...existingReceipts.filter((r) => r.staffId !== myStaffId),
                  {
                    staffId: myStaffId,
                    displayName: myName,
                    role: myRole,
                    avatarUrl: myAvatar,
                    readCount: msgCount,
                    lastReadMessageId: lastMsgId || null,
                    readAt: nowIso,
                  },
                ]
              : existingReceipts;
          const nextMessages = (c.messages || []).map((m) =>
            m.thread && m.thread.length > 0 ? { ...m, unreadThreadReplyCount: 0 } : m
          );
          return {
            ...c,
            unreadCount: 0,
            unreadThreadCount: 0,
            readReceipts: updatedReceipts,
            messages: nextMessages,
          };
        })
      );

      updateUserPrefsLocalOnly((prev) => ({
        ...prev,
        manualUnreadIds: (prev.manualUnreadIds || []).filter((id) => id !== convId),
        hiddenIds: (prev.hiddenIds || []).filter((id) => id !== convId),
        readMessageCountByConv: {
          ...(prev.readMessageCountByConv || {}),
          [convId]: msgCount,
        },
        readAtByConv: {
          ...(prev.readAtByConv || {}),
          [convId]: nowIso,
        },
        ...(lastMsgId
          ? {
              lastReadMessageIdByConv: {
                ...(prev.lastReadMessageIdByConv || {}),
                [convId]: lastMsgId,
              },
            }
          : {}),
        readThreadReplyCountByMsg: {
          ...(prev.readThreadReplyCountByMsg || {}),
          ...threadRepliesUpdates,
        },
        readThreadAtByMsg: {
          ...(prev.readThreadAtByMsg || {}),
          ...threadAtUpdates,
        },
        lastReadThreadReplyIdByMsg: {
          ...(prev.lastReadThreadReplyIdByMsg || {}),
          ...threadLastReplyUpdates,
        },
      }));

      apiClient.chat
        .markAsRead(convId)
        .then((res) => {
          if (res?.conversation) {
            setConversations((prev) => prev.map((c) => (c.id === convId ? res.conversation! : c)));
          }
          notifyLivePeers();
        })
        .catch(() => {});
    },
    [
      currentUserStaffMember.id,
      currentUserStaffMember.displayName,
      currentUserStaffMember.role,
      currentUserStaffMember.avatarUrl,
      currentUser?.id,
      currentUser?.displayName,
      currentUser?.username,
      currentUser?.role,
      conversations,
      updateUserSidebarPrefs,
      updateUserPrefsLocalOnly,
      notifyLivePeers,
    ]
  );

  const selectConversation = (convId: string) => {
    setActiveConvId(convId);
    setActiveSubtab('chat');
    if (isMobile) {
      setMobileActiveView('conversation');
    }
    const targetConv = allUserConversations.find((c) => c.id === convId);
    const msgs = targetConv?.messages || [];
    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
    if (isTabVisible) {
      markConversationReadOptimisticAndSync(convId, msgs.length, lastMsg?.id);
    }
    scrollToChatBottom('main', 'auto');
  };

  // Automatically mark active conversation (or open mini dock) as read ONLY when browser tab is visible
  useEffect(() => {
    if (!isTabVisible) return;
    if (open && activeSubtab === 'chat' && activeConversation) {
      const convId = activeConversation.id;
      const msgs = activeConversation.messages || [];
      const msgCount = msgs.length;
      const lastMsg = msgCount > 0 ? msgs[msgCount - 1] : undefined;
      const currentRead = userPrefs.readMessageCountByConv?.[convId];
      const isManualUnread = (userPrefs.manualUnreadIds || []).includes(convId);
      const hasUnreadThreads = (activeConversation.unreadThreadCount || 0) > 0;
      if (
        !isManualUnread &&
        (currentRead !== msgCount || (activeConversation.unreadCount || 0) > 0 || hasUnreadThreads)
      ) {
        markConversationReadOptimisticAndSync(convId, msgCount, lastMsg?.id);
      }
    }
    // Also mark any expanded mini dock conversations as read when tab is visible
    for (const dockConvId of dockedConvIds) {
      if (collapsedDockIds[dockConvId]) continue;
      const dockConv = conversations.find((c) => c.id === dockConvId);
      if (!dockConv) continue;
      const msgs = dockConv.messages || [];
      const msgCount = msgs.length;
      const lastMsg = msgCount > 0 ? msgs[msgCount - 1] : undefined;
      const currentRead = userPrefs.readMessageCountByConv?.[dockConvId];
      const isManualUnread = (userPrefs.manualUnreadIds || []).includes(dockConvId);
      const hasUnreadThreads = (dockConv.unreadThreadCount || 0) > 0;
      if (!isManualUnread && (currentRead !== msgCount || (dockConv.unreadCount || 0) > 0 || hasUnreadThreads)) {
        markConversationReadOptimisticAndSync(dockConvId, msgCount, lastMsg?.id);
      }
    }
  }, [
    isTabVisible,
    open,
    activeSubtab,
    activeConversation?.id,
    activeConversation?.messages?.length,
    activeConversation?.unreadCount,
    activeConversation?.unreadThreadCount,
    dockedConvIds,
    collapsedDockIds,
    conversations,
    userPrefs.readMessageCountByConv,
    userPrefs.manualUnreadIds,
    markConversationReadOptimisticAndSync,
  ]);

  // ================= GOOGLE CHAT WORKSPACE PERSONAL SIDEBAR ACTIONS =================
  const togglePinConversation = useCallback(
    (convId: string) => {
      const targetConv = allUserConversations.find((c) => c.id === convId);
      const convLabel = targetConv
        ? targetConv.type === 'space'
          ? `#${targetConv.name}`
          : targetConv.name
        : 'mục này';
      updateUserSidebarPrefs((prev) => {
        const exists = (prev.pinnedIds || []).includes(convId);
        const nextPinned = exists
          ? (prev.pinnedIds || []).filter((id) => id !== convId)
          : [convId, ...(prev.pinnedIds || []).filter((id) => id !== convId)];

        const nextConvOrder: Record<string, string[]> = { ...(prev.conversationOrder || {}) };
        if (!exists) {
          for (const [secKey, arr] of Object.entries(nextConvOrder)) {
            if (Array.isArray(arr) && arr.length > 0) {
              nextConvOrder[secKey] = [convId, ...arr.filter((id) => id !== convId)];
            }
          }
        }

        antdMessage.success(
          exists
            ? `Đã bỏ ghim ${convLabel} khỏi danh sách cá nhân`
            : `📌 Đã ghim ${convLabel} lên đầu danh sách cá nhân (đã lưu)`
        );
        return {
          ...prev,
          pinnedIds: nextPinned,
          conversationOrder: nextConvOrder,
        };
      });
    },
    [allUserConversations, updateUserSidebarPrefs]
  );

  const toggleMuteConversation = useCallback(
    (convId: string) => {
      updateUserSidebarPrefs((prev) => {
        const exists = (prev.mutedIds || []).includes(convId);
        const nextMuted = exists
          ? (prev.mutedIds || []).filter((id) => id !== convId)
          : [...(prev.mutedIds || []), convId];
        antdMessage.success(exists ? 'Đã bật lại thông báo' : 'Đã tắt thông báo cuộc trò chuyện này');
        return { ...prev, mutedIds: nextMuted };
      });
    },
    [updateUserSidebarPrefs]
  );

  // ──── Tiered Notification Filter Handlers ────
  const handleChangeGlobalNotificationMode = useCallback(
    (mode: MosChatNotificationMode) => {
      updateUserSidebarPrefs((prev) => {
        const modeLabels: Record<MosChatNotificationMode, string> = {
          ALL: 'Nhận tất cả thông báo',
          MENTIONS_ONLY: 'Chỉ nhận khi được @Mention',
          NOTHING: 'Tắt toàn bộ thông báo',
        };
        antdMessage.success(`🔔 Đã đổi chế độ thông báo: ${modeLabels[mode]}`);
        return { ...prev, notificationMode: mode };
      });
    },
    [updateUserSidebarPrefs, antdMessage]
  );

  const handleChangeChannelNotificationOverride = useCallback(
    (convId: string, mode: MosChatChannelNotificationOverride) => {
      updateUserSidebarPrefs((prev) => {
        const nextOverrides = { ...(prev.channelNotificationOverrides || {}) };
        if (mode === 'INHERIT') {
          delete nextOverrides[convId];
        } else {
          nextOverrides[convId] = mode;
        }
        // Also sync with legacy mutedIds for backward compatibility
        let nextMuted = [...(prev.mutedIds || [])];
        if (mode === 'MUTED') {
          if (!nextMuted.includes(convId)) nextMuted.push(convId);
        } else {
          nextMuted = nextMuted.filter((id) => id !== convId);
        }
        return {
          ...prev,
          channelNotificationOverrides: nextOverrides,
          mutedIds: nextMuted,
        };
      });
    },
    [updateUserSidebarPrefs]
  );

  const toggleManualUnreadConversation = useCallback(
    (conv: MosChatConversation) => {
      const currentlyUnread = getEffectiveUnreadCount(conv) > 0 || (conv.unreadThreadCount || 0) > 0;
      if (currentlyUnread) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conv.id
              ? {
                  ...c,
                  unreadCount: 0,
                  unreadThreadCount: 0,
                  messages: (c.messages || []).map((m) =>
                    m.thread && m.thread.length > 0 ? { ...m, unreadThreadReplyCount: 0 } : m
                  ),
                }
              : c
          )
        );
        const threadRepliesUpdates: Record<string, number> = {};
        for (const m of conv.messages || []) {
          if (m.thread && m.thread.length > 0) {
            threadRepliesUpdates[m.id] = m.thread.length;
            threadRepliesUpdates[`${conv.id}::${m.id}`] = m.thread.length;
          }
        }
        updateUserSidebarPrefs((prev) => ({
          ...prev,
          manualUnreadIds: (prev.manualUnreadIds || []).filter((id) => id !== conv.id),
          readMessageCountByConv: {
            ...(prev.readMessageCountByConv || {}),
            [conv.id]: conv.messages.length,
          },
          readThreadReplyCountByMsg: {
            ...(prev.readThreadReplyCountByMsg || {}),
            ...threadRepliesUpdates,
          },
        }));
        if (conv.id !== AI_COPILOT_CONV_ID) {
          apiClient.chat.markAsRead(conv.id).catch(() => {});
        }
        antdMessage.success('Đã đánh dấu đã đọc');
      } else {
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: Math.max(1, c.unreadCount || 1) } : c))
        );
        updateUserSidebarPrefs((prev) => ({
          ...prev,
          manualUnreadIds: Array.from(new Set([...(prev.manualUnreadIds || []), conv.id])),
          readMessageCountByConv: {
            ...(prev.readMessageCountByConv || {}),
            [conv.id]: Math.max(0, conv.messages.length - 1),
          },
        }));
        if (conv.id !== AI_COPILOT_CONV_ID) {
          apiClient.chat.markAsUnread(conv.id).catch(() => {});
        }
        antdMessage.success('Đã đánh dấu chưa đọc (Mark as unread)');
      }
    },
    [getEffectiveUnreadCount, updateUserSidebarPrefs]
  );

  const toggleHideConversation = useCallback(
    (conv: MosChatConversation) => {
      updateUserSidebarPrefs((prev) => {
        const isHidden = (prev.hiddenIds || []).includes(conv.id);
        const nextHidden = isHidden
          ? (prev.hiddenIds || []).filter((id) => id !== conv.id)
          : Array.from(new Set([...(prev.hiddenIds || []), conv.id]));
        antdMessage.success(
          isHidden
            ? `Đã hiển thị lại "${conv.name}" trên danh sách`
            : `Đã ẩn "${conv.name}" khỏi danh sách (tự hiện lại khi có tin nhắn mới)`
        );
        return {
          ...prev,
          hiddenIds: nextHidden,
          readMessageCountByConv: {
            ...(prev.readMessageCountByConv || {}),
            [conv.id]: conv.messages.length,
          },
        };
      });
    },
    [updateUserSidebarPrefs]
  );

  const moveConversationToSection = useCallback(
    (convId: string, targetSectionId: string) => {
      updateUserSidebarPrefs((prev) => {
        const nextCustom = (prev.customSections || []).map((sec) => {
          const filtered = (sec.conversationIds || []).filter((id) => id !== convId);
          if (sec.id === targetSectionId) {
            return { ...sec, conversationIds: [convId, ...filtered] };
          }
          return { ...sec, conversationIds: filtered };
        });
        return {
          ...prev,
          customSections: nextCustom,
          hiddenIds: (prev.hiddenIds || []).filter((id) => id !== convId),
        };
      });
      antdMessage.success('Đã chuyển cuộc trò chuyện sang mục mới');
    },
    [updateUserSidebarPrefs]
  );

  const moveConversationOrderInSection = useCallback(
    (convId: string, sectionId: string, direction: 'up' | 'down', currentItems: MosChatConversation[]) => {
      const currentIds = currentItems.map((c) => c.id);
      const idx = currentIds.indexOf(convId);
      if (idx === -1) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= currentIds.length) return;
      const nextOrder = [...currentIds];
      const temp = nextOrder[idx];
      nextOrder[idx] = nextOrder[swapIdx];
      nextOrder[swapIdx] = temp;
      updateUserSidebarPrefs((prev) => {
        const pinnedSet = new Set(prev.pinnedIds || []);
        const reorderedSectionPinned = nextOrder.filter((id) => pinnedSet.has(id));
        const otherPinned = (prev.pinnedIds || []).filter((id) => !currentIds.includes(id));
        return {
          ...prev,
          pinnedIds: [...reorderedSectionPinned, ...otherPinned],
          conversationOrder: {
            ...(prev.conversationOrder || {}),
            [sectionId]: nextOrder,
          },
        };
      });
    },
    [updateUserSidebarPrefs]
  );

  const reorderConversationByDragDrop = useCallback(
    (sourceConvId: string, targetConvId: string, sectionId: string, currentItems: MosChatConversation[]) => {
      if (!sourceConvId || !targetConvId || sourceConvId === targetConvId) return;
      const currentIds = currentItems.map((c) => c.id);
      const fromIdx = currentIds.indexOf(sourceConvId);
      const toIdx = currentIds.indexOf(targetConvId);
      if (fromIdx === -1 || toIdx === -1) return;
      const nextOrder = [...currentIds];
      nextOrder.splice(fromIdx, 1);
      nextOrder.splice(toIdx, 0, sourceConvId);

      updateUserSidebarPrefs((prev) => {
        const pinnedSet = new Set(prev.pinnedIds || []);
        // If user dragged an unpinned Space onto a pinned Space, automatically pin it at that exact position!
        if (!pinnedSet.has(sourceConvId) && pinnedSet.has(targetConvId)) {
          pinnedSet.add(sourceConvId);
          antdMessage.success('📌 Đã ghim và sắp xếp vị trí Space theo ý bạn');
        }
        const reorderedSectionPinned = nextOrder.filter((id) => pinnedSet.has(id));
        const otherPinned = (prev.pinnedIds || []).filter((id) => !currentIds.includes(id));
        return {
          ...prev,
          pinnedIds: [...reorderedSectionPinned, ...otherPinned],
          conversationOrder: {
            ...(prev.conversationOrder || {}),
            [sectionId]: nextOrder,
          },
        };
      });
    },
    [updateUserSidebarPrefs]
  );

  const toggleCollapseSection = useCallback(
    (sectionId: string) => {
      updateUserSidebarPrefs((prev) => ({
        ...prev,
        collapsedSections: {
          ...(prev.collapsedSections || {}),
          [sectionId]: !prev.collapsedSections?.[sectionId],
        },
      }));
    },
    [updateUserSidebarPrefs]
  );

  const toggleUnreadOnlySection = useCallback(
    (sectionId: string) => {
      updateUserSidebarPrefs((prev) => {
        const nextVal = !prev.unreadOnlySections?.[sectionId];
        antdMessage.info(
          nextVal ? 'Chỉ hiển thị cuộc trò chuyện chưa đọc trong mục này' : 'Hiển thị tất cả trong mục này'
        );
        return {
          ...prev,
          unreadOnlySections: {
            ...(prev.unreadOnlySections || {}),
            [sectionId]: nextVal,
          },
        };
      });
    },
    [updateUserSidebarPrefs]
  );

  const handleCreateCustomSection = useCallback(
    (rawName: string, targetConvId?: string | null) => {
      const clean = rawName.trim();
      if (!clean) {
        antdMessage.warning('Vui lòng nhập tên mục tuỳ chỉnh');
        return;
      }
      if (isSubmittingSectionRef.current) return;
      isSubmittingSectionRef.current = true;
      setTimeout(() => {
        isSubmittingSectionRef.current = false;
      }, 500);

      let created = false;
      updateUserSidebarPrefs((prev) => {
        const existing = (prev.customSections || []).find((s) => s.name.trim().toLowerCase() === clean.toLowerCase());
        if (existing) {
          antdMessage.warning(`Mục "${clean}" đã tồn tại!`);
          return prev;
        }
        created = true;
        const newSecId = `sec-custom-${Date.now()}`;
        const cleanedCustom = (prev.customSections || []).map((s) =>
          targetConvId ? { ...s, conversationIds: (s.conversationIds || []).filter((id) => id !== targetConvId) } : s
        );
        const newSec: MosChatCustomSection = {
          id: newSecId,
          name: clean,
          conversationIds: targetConvId ? [targetConvId] : [],
          collapsed: false,
          unreadOnly: false,
        };
        return {
          ...prev,
          customSections: [newSec, ...cleanedCustom],
          sectionOrder: [newSecId, ...(prev.sectionOrder || ['dm', 'spaces'])],
        };
      });
      if (created) {
        antdMessage.success(`Đã tạo mục "${clean}"`);
      }
    },
    [updateUserSidebarPrefs]
  );

  const handleRenameCustomSection = useCallback(
    (sectionId: string, rawName: string) => {
      const clean = rawName.trim();
      if (!clean) return;
      updateUserSidebarPrefs((prev) => ({
        ...prev,
        customSections: (prev.customSections || []).map((s) => (s.id === sectionId ? { ...s, name: clean } : s)),
      }));
      setEditingSectionId(null);
      setEditingSectionName('');
      antdMessage.success('Đã đổi tên mục tuỳ chỉnh');
    },
    [updateUserSidebarPrefs]
  );

  const handleDeleteCustomSection = useCallback(
    (sectionId: string) => {
      updateUserSidebarPrefs((prev) => ({
        ...prev,
        customSections: (prev.customSections || []).filter((s) => s.id !== sectionId),
        sectionOrder: (prev.sectionOrder || []).filter((id) => id !== sectionId),
      }));
      antdMessage.success('Đã xoá mục tuỳ chỉnh (các cuộc trò chuyện đã trở về mục mặc định)');
    },
    [updateUserSidebarPrefs]
  );

  const handleMoveSectionOrder = useCallback(
    (sectionId: string, direction: 'up' | 'down') => {
      updateUserSidebarPrefs((prev) => {
        const customIds = (prev.customSections || []).map((s) => s.id);
        const order = Array.from(new Set([...(prev.sectionOrder || []), ...customIds, 'dm', 'spaces'])).filter(
          (id) => id === 'dm' || id === 'spaces' || customIds.includes(id)
        );
        const idx = order.indexOf(sectionId);
        if (idx === -1) return prev;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= order.length) return prev;
        const nextOrder = [...order];
        const tmp = nextOrder[idx];
        nextOrder[idx] = nextOrder[swapIdx];
        nextOrder[swapIdx] = tmp;
        return {
          ...prev,
          sectionOrder: nextOrder,
        };
      });
    },
    [updateUserSidebarPrefs]
  );

  const handleResetSidebarPrefs = useCallback(() => {
    updateUserSidebarPrefs(() => ({
      pinnedIds: [],
      mutedIds: [],
      hiddenIds: [],
      manualUnreadIds: [],
      readMessageCountByConv: {},
      collapsedSections: {},
      unreadOnlySections: {},
      sectionOrder: ['dm', 'spaces'],
      customSections: [],
      conversationOrder: {},
    }));
    antdMessage.success('Đã khôi phục bố cục danh sách về mặc định');
  }, [updateUserSidebarPrefs]);

  const handleLeaveOrJoinSpace = useCallback(
    async (conv: MosChatConversation) => {
      if (conv.type !== 'space') return;
      const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
      if (myStaffId <= 0) return;
      const isMember = (conv.memberIds || []).map(Number).includes(myStaffId);
      try {
        if (isMember) {
          const res = await apiClient.chat.removeMember(conv.id, myStaffId);
          if (res?.conversation) {
            setConversations((prev) => prev.map((c) => (c.id === conv.id ? res.conversation : c)));
          }
          toggleHideConversation(conv);
          notifyLivePeers();
          antdMessage.success(`Đã rời khỏi #${conv.name}`);
        } else {
          const res = await apiClient.chat.addMember(conv.id, myStaffId);
          if (res?.conversation) {
            setConversations((prev) => prev.map((c) => (c.id === conv.id ? res.conversation : c)));
          }
          updateUserSidebarPrefs((prev) => ({
            ...prev,
            hiddenIds: (prev.hiddenIds || []).filter((id) => id !== conv.id),
          }));
          notifyLivePeers();
          antdMessage.success(`Đã tham gia #${conv.name}`);
        }
      } catch (_) {
        antdMessage.error('Không thể cập nhật trạng thái thành viên Space');
      }
    },
    [currentUserStaffMember.id, currentUser?.id, toggleHideConversation, updateUserSidebarPrefs, notifyLivePeers]
  );

  const appendAttachmentToTarget = useCallback(
    (attachment: MosChatImageAttachment, scope: 'main' | 'thread' | 'dock', convId?: string) => {
      if (scope === 'thread') {
        setThreadAttachments((prev) => [...prev, attachment].slice(-8));
        return;
      }
      if (scope === 'dock' && convId) {
        setDockAttachments((prev) => ({
          ...prev,
          [convId]: [...(prev[convId] || []), attachment].slice(-8),
        }));
        return;
      }
      setStagedAttachments((prev) => [...prev, attachment].slice(-8));
    },
    []
  );

  const removeStagedAttachment = useCallback((attId: string, scope: 'main' | 'thread' | 'dock', convId?: string) => {
    if (scope === 'thread') {
      setThreadAttachments((prev) => prev.filter((a) => a.id !== attId));
      return;
    }
    if (scope === 'dock' && convId) {
      setDockAttachments((prev) => ({
        ...prev,
        [convId]: (prev[convId] || []).filter((a) => a.id !== attId),
      }));
      return;
    }
    setStagedAttachments((prev) => prev.filter((a) => a.id !== attId));
  }, []);

  const isImageOrHeicFile = (f: File): boolean => {
    if (f.type && f.type.startsWith('image/')) return true;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    return ['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext);
  };

  const isSupportedChatFile = (f: File): boolean => {
    if (isImageOrHeicFile(f)) return true;
    if (
      f.type &&
      (f.type.startsWith('text/') ||
        f.type.includes('pdf') ||
        f.type.includes('document') ||
        f.type.includes('sheet') ||
        f.type.includes('presentation') ||
        f.type.includes('zip'))
    ) {
      return true;
    }
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'json', 'zip', 'rar', '7z'].includes(ext);
  };

  const handleProcessImageFiles = useCallback(
    async (
      files: FileList | File[],
      source: 'clipboard' | 'drive' | 'upload',
      scope: 'main' | 'thread' | 'dock' = 'main',
      convId?: string
    ) => {
      const candidateFiles = Array.from(files).filter(isSupportedChatFile);
      if (candidateFiles.length === 0) {
        antdMessage.warning('Định dạng tệp không được hỗ trợ (hỗ trợ PDF, Excel, Word, TXT, ZIP và hình ảnh).');
        return;
      }

      setUploadingCount((c) => c + candidateFiles.length);
      for (const file of candidateFiles.slice(0, 10)) {
        try {
          if (isImageOrHeicFile(file)) {
            const compressed = await readOrCompressImagePayload(file);
            const uploaded = await apiClient.chat.uploadImage({
              dataBase64: compressed.dataBase64,
              mimeType: compressed.mimeType,
              fileName: file.name || `paste-${Date.now()}.webp`,
              width: compressed.width,
              height: compressed.height,
              source,
            });
            if (uploaded?.attachment) {
              appendAttachmentToTarget(uploaded.attachment, scope, convId);
            }
          } else {
            // General document / PDF upload without image canvas compression
            const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (evt) => {
                const result = evt.target?.result as string;
                resolve(result?.split(',')[1] || '');
              };
              reader.onerror = () => reject(new Error('Không thể đọc tệp tin'));
              reader.readAsDataURL(file);
            });
            if (!base64Data) continue;

            const ext = (file.name.split('.').pop() || '').toLowerCase();
            let mimeType = file.type || '';
            if (!mimeType || mimeType === 'application/octet-stream') {
              if (ext === 'pdf') mimeType = 'application/pdf';
              else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
              else if (ext === 'xls') mimeType = 'application/vnd.ms-excel';
              else if (ext === 'docx')
                mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              else if (ext === 'doc') mimeType = 'application/msword';
              else if (ext === 'txt') mimeType = 'text/plain';
              else if (ext === 'csv') mimeType = 'text/csv';
              else if (ext === 'zip') mimeType = 'application/zip';
              else mimeType = 'application/octet-stream';
            }

            const uploaded = await apiClient.chat.uploadFile({
              dataBase64: base64Data,
              mimeType: mimeType as SafeAny,
              fileName: file.name,
              source,
            });
            if (uploaded?.attachment) {
              appendAttachmentToTarget(uploaded.attachment, scope, convId);
            }
          }
        } catch (err: SafeAny) {
          antdMessage.error(err?.response?.data?.message || err?.message || 'Không thể tải tệp lên.');
        } finally {
          setUploadingCount((c) => Math.max(0, c - 1));
        }
      }
    },
    [appendAttachmentToTarget]
  );

  const handleClipboardPaste = useCallback(
    (
      e: React.ClipboardEvent<HTMLInputElement | HTMLElement>,
      scope: 'main' | 'thread' | 'dock' = 'main',
      convId?: string
    ) => {
      const items = e.clipboardData?.items;
      if (items && items.length > 0) {
        const pastedFiles: File[] = [];
        for (let i = 0; i < items.length; i += 1) {
          const item = items[i];
          if (item.type.startsWith('image/') || item.kind === 'file') {
            const file = item.getAsFile();
            if (file && isSupportedChatFile(file)) pastedFiles.push(file);
          }
        }
        if (pastedFiles.length > 0) {
          e.preventDefault();
          void handleProcessImageFiles(pastedFiles, 'clipboard', scope, convId);
          return;
        }
      }

      // Also detect pasted Google Drive image link directly from clipboard text
      const pastedText = e.clipboardData?.getData('text/plain') || '';
      const driveAttachment = parseGoogleDriveImageFromText(pastedText);
      if (driveAttachment) {
        appendAttachmentToTarget(driveAttachment, scope, convId);
        antdMessage.success('Đã tự động đính kèm hình ảnh từ Google Drive');
      }
    },
    [handleProcessImageFiles, appendAttachmentToTarget]
  );

  const triggerFilePicker = (scope: 'main' | 'thread' | 'dock' = 'main', convId?: string) => {
    uploadTargetRef.current = { scope, convId };
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleConfirmDriveLink = () => {
    const driveAtt = parseGoogleDriveImageFromText(driveLinkInput);
    if (!driveAtt) {
      antdMessage.warning('Vui lòng dán link hình ảnh Google Drive hợp lệ (drive.google.com/file/d/...)');
      return;
    }
    const target = uploadTargetRef.current;
    appendAttachmentToTarget(driveAtt, target.scope, target.convId);
    setDriveLinkInput('');
    setDriveLinkModalOpen(false);
    antdMessage.success('Đã đính kèm ảnh từ Google Drive');
  };

  const convertAttachmentToDataUrl = useCallback(
    async (attachment?: MosChatImageAttachment): Promise<string | undefined> => {
      if (!attachment?.url) return undefined;
      try {
        const resolvedUrl = resolveMediaUrl(attachment.url);
        const resp = await fetch(resolvedUrl);
        if (!resp.ok) return undefined;
        const blob = await resp.blob();
        return await new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(blob);
        });
      } catch {
        return undefined;
      }
    },
    []
  );

  const handleClearAiChat = useCallback(() => {
    setAiSessionId(null);
    setAiMessages([buildInitialAiWelcomeMessage()]);
    antdMessage.success('Đã làm mới phiên hội thoại riêng tư với MAI');
  }, [buildInitialAiWelcomeMessage]);

  const handleExecuteAiAction = useCallback(
    (action: { type: string; label: string; payload: Record<string, unknown> }, msgId: string, actionKey?: string) => {
      if (typeof window !== 'undefined' && action.payload) {
        window.dispatchEvent(new CustomEvent('mos-ai-copilot-apply-customer-filter', { detail: action.payload }));
      }
      setAppliedActionIds((prev) => ({
        ...prev,
        [msgId]: true,
        ...(actionKey ? { [actionKey]: true } : {}),
      }));
      antdMessage.success(`Đã kích hoạt: ${action.label}`);
    },
    []
  );

  const handleSpeakAiMessage = useCallback(
    (msg: MosChatMessage) => {
      if (speakingMsgId === msg.id) {
        stopSpeaking();
        setSpeakingMsgId(null);
        return;
      }
      stopSpeaking();
      setSpeakingMsgId(msg.id);
      void playNeuralSpeech(msg.text || '', {
        voice: 'vi-VN-HoaiMyNeural',
        speed: ttsSpeed,
        onStart: () => {
          setSpeakingMsgId(msg.id);
        },
        onEnd: () => {
          setSpeakingMsgId((prev) => (prev === msg.id ? null : prev));
        },
        onError: () => {
          setSpeakingMsgId((prev) => (prev === msg.id ? null : prev));
        },
      });
    },
    [speakingMsgId, ttsSpeed]
  );

  const handleSendMessage = async (
    targetConvId: string,
    rawText: string,
    customerCard?: MosChatCustomerCard | null,
    attachments?: MosChatImageAttachment[]
  ) => {
    const text = rawText.trim();
    const cleanAttachments = attachments && attachments.length > 0 ? attachments : undefined;
    if (!text && !customerCard && !cleanAttachments) return;

    // Guard against macOS Vietnamese IME (Telex/VNI) flushing the last syllable on Enter
    const now = Date.now();
    if (
      !customerCard &&
      !cleanAttachments &&
      now - lastSentRef.current.time < 1200 &&
      (lastSentRef.current.text === text || lastSentRef.current.text.endsWith(` ${text}`))
    ) {
      return;
    }
    lastSentRef.current = { text, time: now };

    const senderName = currentUser?.displayName || currentUser?.username || 'Danny Do';
    const optimisticId = `msg-${now}`;
    const optimisticMsg: MosChatMessage = {
      id: optimisticId,
      conversationId: targetConvId,
      senderId: currentUser?.id || 'me',
      senderName,
      senderRole: 'Super Admin',
      senderAvatar: senderName.slice(0, 2).toUpperCase(),
      roleColor: '#d4a84b',
      text: text || (customerCard ? `Hỗ trợ hồ sơ ${customerCard.name}` : ''),
      timeLabel: dayjs().format('HH:mm'),
      createdAt: new Date().toISOString(),
      customerCard: customerCard || null,
      attachments: cleanAttachments,
      reactions: {},
      thread: [],
    };

    // CASE 1: Private 1-1 Chat with 🤖 MAI (mOS AI) (100% personal)
    if (targetConvId === AI_COPILOT_CONV_ID) {
      setAiMessages((prev) => [...prev, optimisticMsg]);
      setAiThinkingActive(true);
      scrollToChatBottom('main', 'smooth');
      try {
        const imageDataUrl = await convertAttachmentToDataUrl(cleanAttachments?.[0]);
        const promptForAi =
          text ||
          (customerCard
            ? `Phân tích hồ sơ khách hàng ${customerCard.name} (${customerCard.meta})`
            : 'Phân tích hình ảnh đính kèm này giúp tôi.');
        const aiRes = await apiClient.ai.sendMessage({
          sessionId: aiSessionId || undefined,
          message: promptForAi,
          scope: 'mos-chat-private',
          imageDataUrl,
          context: {
            page: 'mos-chat-private',
            userName: senderName,
            myRole: currentUser?.role || 'super_admin',
          },
        });
        if (aiRes?.session?.id) {
          setAiSessionId(aiRes.session.id);
        }
        const botMsg: MosChatMessage = {
          id: aiRes?.message?.id || `msg-ai-${Date.now()}`,
          conversationId: AI_COPILOT_CONV_ID,
          senderId: 'wings-ai-copilot',
          senderName: '🤖 MAI',
          senderRole: 'mOS AI',
          senderAvatar: 'MAI',
          roleColor: '#8b5cf6',
          isAiBot: true,
          text: (aiRes?.message?.content || 'MAI đã xử lý xong yêu cầu của bạn.')
            .replace(/<action[\s\S]*?<\/action>/gi, '')
            .replace(/<\/?action[^>]*>/gi, '')
            .trim(),
          aiThinking: aiRes?.message?.thinking || null,
          aiAction: aiRes?.message?.suggestedAction || null,
          aiActions:
            aiRes?.message?.suggestedActions ||
            aiRes?.message?.suggestedAction?.actions ||
            (aiRes?.message?.suggestedAction ? [aiRes.message.suggestedAction] : null),
          timeLabel: dayjs().format('HH:mm'),
          createdAt: new Date().toISOString(),
          reactions: {},
          thread: [],
        };
        setAiMessages((prev) => [...prev, botMsg]);
      } catch (err: SafeAny) {
        let recoveredMsg: MosChatMessage | null = null;
        if (aiSessionId) {
          for (let poll = 0; poll < 3; poll++) {
            await new Promise((r) => setTimeout(r, 2000));
            try {
              const sessRes = await apiClient.ai.getSession(aiSessionId);
              const lastAssistant = sessRes?.messages?.filter((m) => m.role === 'assistant')?.pop();
              if (lastAssistant && lastAssistant.content) {
                const rawContent = lastAssistant.content;
                const actionMatches: NonNullable<MosChatMessage['aiAction']>[] = [];
                const regex = /<action(?:\s+type="([^"]*)")?(?:\s+label="([^"]*)")?>([\s\S]*?)<\/action>/gi;
                let match: RegExpExecArray | null;
                while ((match = regex.exec(rawContent)) !== null) {
                  try {
                    actionMatches.push({
                      type: match[1]?.trim() || 'APPLY_FILTER',
                      label: match[2]?.trim() || 'Áp dụng bộ lọc gợi ý',
                      payload: JSON.parse(match[3]?.trim() || '{}'),
                    });
                  } catch {
                    // ignore
                  }
                }
                const cleanText = rawContent
                  .replace(/<action[\s\S]*?<\/action>/gi, '')
                  .replace(/<\/?action[^>]*>/gi, '')
                  .replace(/\n{3,}/g, '\n\n')
                  .trim();

                const existingActions =
                  lastAssistant.suggestedActions ||
                  (lastAssistant.suggestedAction ? [lastAssistant.suggestedAction] : []);
                const allActions = [...existingActions, ...actionMatches].filter(
                  (act, index, self) =>
                    index ===
                    self.findIndex(
                      (a) => a.label === act.label && JSON.stringify(a.payload) === JSON.stringify(act.payload)
                    )
                );

                recoveredMsg = {
                  id: lastAssistant.id || `msg-ai-${Date.now()}`,
                  conversationId: AI_COPILOT_CONV_ID,
                  senderId: 'wings-ai-copilot',
                  senderName: '🤖 MAI',
                  senderRole: 'mOS AI',
                  senderAvatar: 'MAI',
                  roleColor: '#8b5cf6',
                  isAiBot: true,
                  text: cleanText,
                  aiThinking: lastAssistant.thinking || null,
                  aiAction: allActions[0] || lastAssistant.suggestedAction || null,
                  aiActions: allActions.length > 0 ? allActions : null,
                  timeLabel: dayjs(lastAssistant.createdAt).format('HH:mm'),
                  createdAt: lastAssistant.createdAt || new Date().toISOString(),
                  reactions: {},
                  thread: [],
                };
                break;
              }
            } catch {
              // ignore poll error
            }
          }
        }

        if (recoveredMsg) {
          setAiMessages((prev) => [...prev, recoveredMsg!]);
        } else {
          const fallbackErr: MosChatMessage = {
            id: `msg-ai-err-${Date.now()}`,
            conversationId: AI_COPILOT_CONV_ID,
            senderId: 'wings-ai-copilot',
            senderName: '🤖 MAI',
            senderRole: 'mOS AI',
            senderAvatar: 'MAI',
            roleColor: '#8b5cf6',
            isAiBot: true,
            text: err?.response?.data?.message || 'Hiện kết nối MAI đang bận, bạn vui lòng thử lại sau giây lát nhé.',
            timeLabel: dayjs().format('HH:mm'),
            createdAt: new Date().toISOString(),
            reactions: {},
            thread: [],
          };
          setAiMessages((prev) => [...prev, fallbackErr]);
        }
      } finally {
        setAiThinkingActive(false);
      }
      return;
    }

    // CASE 2: Standard Space / 1-1 Conversation (plus @MAI trigger for authorized users)
    setConversations((prev) =>
      prev.map((c) => (c.id === targetConvId ? { ...c, messages: [...c.messages, optimisticMsg] } : c))
    );
    if (activeConversation?.id === targetConvId) {
      scrollToChatBottom('main', 'smooth');
    }
    if (dockedConvIds.includes(targetConvId)) {
      scrollToChatBottom({ dockConvId: targetConvId }, 'smooth');
    }

    let sentMessage: MosChatMessage = optimisticMsg;
    try {
      const res = await apiClient.chat.sendMessage({
        conversationId: targetConvId,
        text: optimisticMsg.text,
        customerCard: customerCard || null,
        attachments: cleanAttachments,
      });
      if (res?.message) {
        sentMessage = res.message;
      }
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === targetConvId ? res.conversation : c)));
      }
      notifyLivePeers();
    } catch (_) {}

    // If user is authorized to use MAI (mOS AI) and tagged @MAI in the message, invoke MAI and post reply publicly to this room!
    if (canUseAiCopilot && /(?:^|\s)@\s*mai\b/i.test(text)) {
      const cleanedPrompt = text.replace(/(?:^|\s)@\s*mai\b/gi, '').trim() || 'Hãy phân tích nội dung trên giúp nhóm.';
      setAiThinkingActive(true);
      try {
        const imageDataUrl = await convertAttachmentToDataUrl(cleanAttachments?.[0]);
        const aiRes = await apiClient.ai.sendMessage({
          sessionId: aiSessionId || undefined,
          message: cleanedPrompt,
          scope: `mos-chat-space:${targetConvId}`,
          imageDataUrl,
          context: {
            page: `mos-chat-space:${targetConvId}`,
            userName: senderName,
            myRole: currentUser?.role || 'super_admin',
          },
        });
        if (aiRes?.session?.id) {
          setAiSessionId(aiRes.session.id);
        }
        // Backend auto-delivers the bot reply directly to targetConvId in DB!
        // Sync fresh conversation state from server to immediately display MAI's reply
        await fetchBootstrap(true);
        notifyLivePeers();
        scrollToChatBottom('main', 'smooth');
      } catch (_) {
        // ignore space AI error
      } finally {
        setAiThinkingActive(false);
      }
    }
    return sentMessage;
  };

  const handleSendMain = async () => {
    if (!activeConversation) return;
    const text = composerTextRef.current;
    const attachmentsToSend = stagedAttachments;
    const cardToSend = stagedCustomerCard;
    if (!text.trim() && attachmentsToSend.length === 0 && !cardToSend) return;

    // Super Admin Slash Commands for Dynamic Workflow Engine (/tam-ung, /kiem-kho, /tao-quy-trinh)
    const trimmedCmd = text.trim().toLowerCase();
    if (isStrictDannySuperAdmin && attachmentsToSend.length === 0 && !cardToSend) {
      if (trimmedCmd === '/tam-ung' || trimmedCmd.startsWith('/tam-ung ')) {
        updateComposerText('');
        setInitialWorkflowCode('WF_CASH_ADVANCE');
        setTriggerWorkflowModalOpen(true);
        return;
      }
      if (trimmedCmd === '/kiem-kho' || trimmedCmd.startsWith('/kiem-kho ')) {
        updateComposerText('');
        setInitialWorkflowCode('WF_INVENTORY_AUDIT');
        setTriggerWorkflowModalOpen(true);
        return;
      }
      if (trimmedCmd === '/tao-quy-trinh' || trimmedCmd === '/workflow') {
        updateComposerText('');
        setSaveThreadWorkflowModalOpen(true);
        return;
      }
    }

    const wasUrgent = isUrgentSend;
    if (wasUrgent) {
      setIsUrgentSend(false);
    }

    setMentionState((prev) => (prev.open ? { ...prev, open: false } : prev));
    updateComposerText('');
    setStagedAttachments([]);
    setStagedCustomerCard(null);
    const sent = await handleSendMessage(activeConversation.id, text, cardToSend, attachmentsToSend);
    if (wasUrgent && sent?.id) {
      void handleBuzzMessage(sent.id);
    }
  };

  const handleSelectCustomerCard = async (card: MosChatCustomerCard, sendImmediately = false) => {
    if (sendImmediately && activeConversation) {
      await handleSendMessage(activeConversation.id, `Lưu ý hỗ trợ chu đáo khách hàng ${card.name}:`, card);
      antdMessage.success(`Đã gửi thẻ khách hàng ${card.name}`);
    } else {
      setStagedCustomerCard(card);
      antdMessage.success(`Đã đính kèm thẻ khách hàng ${card.name} vào ô soạn thảo`);
    }
    setCustomerPickerOpen(false);
  };

  const openCustomerDetail = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setCustomerDrawerOpen(true);
  };

  const handleSendQuickCustomerCard = async () => {
    setCustomerPickerOpen(true);
  };

  const currentUserReactionKey = String(currentUser?.id || 'me');

  const hasUserReacted = (
    m: { reactions?: Record<string, number>; reactionUsers?: Record<string, Array<number | string>> } | undefined,
    emoji: string
  ): boolean => {
    if (!m) return false;
    const count = m.reactions?.[emoji] || 0;
    if (count <= 0) return false;
    const users = m.reactionUsers?.[emoji];
    if (!Array.isArray(users)) {
      // Legacy reaction before per-user tracking — treat as reacted so clicking undoes it
      return true;
    }
    return users.map(String).includes(currentUserReactionKey);
  };

  const applyReactionToggleToMessage = <
    T extends { reactions?: Record<string, number>; reactionUsers?: Record<string, Array<number | string>> },
  >(
    m: T,
    emoji: string
  ): T => {
    const nextReactions = { ...(m.reactions || {}) };
    const nextReactionUsers = { ...(m.reactionUsers || {}) };
    const existingUsers = nextReactionUsers[emoji];
    const currentCount = nextReactions[emoji] || 0;

    if (Array.isArray(existingUsers)) {
      const normalized = existingUsers.map(String);
      if (normalized.includes(currentUserReactionKey)) {
        const remaining = normalized.filter((u) => u !== currentUserReactionKey);
        if (remaining.length === 0) {
          delete nextReactions[emoji];
          delete nextReactionUsers[emoji];
        } else {
          nextReactionUsers[emoji] = remaining;
          nextReactions[emoji] = remaining.length;
        }
      } else {
        const updated = [...normalized, currentUserReactionKey];
        nextReactionUsers[emoji] = updated;
        nextReactions[emoji] = updated.length;
      }
    } else if (currentCount > 0) {
      // Legacy reaction without per-user tracking (e.g. inflated count): clicking undoes/clears it
      delete nextReactions[emoji];
      delete nextReactionUsers[emoji];
    } else {
      nextReactionUsers[emoji] = [currentUserReactionKey];
      nextReactions[emoji] = 1;
    }

    return {
      ...m,
      reactions: nextReactions,
      reactionUsers: nextReactionUsers,
    };
  };

  const handleToggleReaction = async (msgId: string, emoji: string, replyId?: string) => {
    if (!activeConversation) return;
    if (activeConversation.id === AI_COPILOT_CONV_ID) {
      setAiMessages((prev) => prev.map((m) => (m.id === msgId ? applyReactionToggleToMessage(m, emoji) : m)));
      return;
    }
    const targetConvId = activeConversation.id;

    if (replyId) {
      // Subthread reply reaction toggle (optimistic)
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetConvId) return c;
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== msgId) return m;
              return {
                ...m,
                thread: (m.thread || []).map((r) => (r.id === replyId ? applyReactionToggleToMessage(r, emoji) : r)),
              };
            }),
          };
        })
      );
      try {
        const res = await apiClient.chat.reactToMessage(msgId, targetConvId, emoji, replyId);
        if (res?.reactions) {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== targetConvId) return c;
              return {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id !== msgId) return m;
                  return {
                    ...m,
                    thread: (m.thread || []).map((r) =>
                      r.id === replyId
                        ? {
                            ...r,
                            reactions: res.reactions,
                            reactionUsers: res.reactionUsers ?? r.reactionUsers,
                          }
                        : r
                    ),
                  };
                }),
              };
            })
          );
        }
        notifyLivePeers();
      } catch (_) {}
      return;
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== targetConvId) return c;
        return {
          ...c,
          messages: c.messages.map((m) => (m.id === msgId ? applyReactionToggleToMessage(m, emoji) : m)),
        };
      })
    );
    try {
      const res = await apiClient.chat.reactToMessage(msgId, targetConvId, emoji);
      if (res?.reactions) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== targetConvId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      reactions: res.reactions,
                      reactionUsers: res.reactionUsers ?? m.reactionUsers,
                    }
                  : m
              ),
            };
          })
        );
      }
      notifyLivePeers();
    } catch (_) {}
  };

  const handleTogglePin = async (msgId: string) => {
    if (!activeConversation) return;
    if (activeConversation.id === AI_COPILOT_CONV_ID) {
      setAiMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, pinned: !m.pinned } : m)));
      return;
    }
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConversation.id) return c;
        return {
          ...c,
          messages: c.messages.map((m) => (m.id === msgId ? { ...m, pinned: !m.pinned } : m)),
        };
      })
    );
    try {
      await apiClient.chat.togglePinMessage(msgId, activeConversation.id);
    } catch (_) {}
  };

  const handleStartEdit = (msg: MosChatMessage, replyId?: string) => {
    if (replyId) {
      const reply = msg.thread?.find((r) => r.id === replyId);
      if (reply) {
        if (!isMessageFromCurrentUser(reply)) {
          antdMessage.warning('Bạn chỉ có thể chỉnh sửa tin nhắn của chính mình');
          return;
        }
        setEditingMessageId(msg.id);
        setEditingReplyId(replyId);
        setEditingText(reply.text);
      }
    } else {
      if (!isMessageFromCurrentUser(msg)) {
        antdMessage.warning('Bạn chỉ có thể chỉnh sửa tin nhắn của chính mình');
        return;
      }
      setEditingMessageId(msg.id);
      setEditingReplyId(null);
      setEditingText(msg.text);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingReplyId(null);
    setEditingText('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !activeConversation) return;
    const trimmed = editingText.trim();
    if (!trimmed) {
      antdMessage.warning('Nội dung tin nhắn không được để trống');
      return;
    }

    setIsSavingEdit(true);
    const now = new Date();
    const myId = currentUser?.id || 'me';
    const myName = currentUser?.displayName || currentUser?.username || 'Bạn';
    const editMsgId = editingMessageId;
    const editRepId = editingReplyId;

    if (activeConversation.id === AI_COPILOT_CONV_ID) {
      setAiMessages((prev) =>
        prev.map((m) => {
          if (m.id !== editMsgId) return m;
          const oldHistory = m.editHistory || [];
          return {
            ...m,
            editHistory: [
              ...oldHistory,
              { text: m.text, editedAt: now.toISOString(), editedBy: myId, editorName: myName },
            ],
            text: trimmed,
            editedAt: now.toISOString(),
            editedBy: myId,
          };
        })
      );
      handleCancelEdit();
      setIsSavingEdit(false);
      antdMessage.success('Đã lưu chỉnh sửa tin nhắn');
      return;
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConversation.id) return c;
        return {
          ...c,
          messages: c.messages.map((m) => {
            if (m.id !== editMsgId) return m;
            if (editRepId) {
              return {
                ...m,
                thread: (m.thread || []).map((r) => {
                  if (r.id !== editRepId) return r;
                  const oldHistory = r.editHistory || [];
                  return {
                    ...r,
                    editHistory: [
                      ...oldHistory,
                      { text: r.text, editedAt: now.toISOString(), editedBy: myId, editorName: myName },
                    ],
                    text: trimmed,
                    editedAt: now.toISOString(),
                    editedBy: myId,
                  };
                }),
              };
            }
            const oldHistory = m.editHistory || [];
            return {
              ...m,
              editHistory: [
                ...oldHistory,
                { text: m.text, editedAt: now.toISOString(), editedBy: myId, editorName: myName },
              ],
              text: trimmed,
              editedAt: now.toISOString(),
              editedBy: myId,
            };
          }),
        };
      })
    );

    try {
      await apiClient.chat.editMessage(editMsgId, {
        conversationId: activeConversation.id,
        text: trimmed,
        replyId: editRepId || undefined,
      });
      notifyLivePeers();
      antdMessage.success('Đã lưu chỉnh sửa tin nhắn');
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || 'Lỗi khi cập nhật tin nhắn');
    } finally {
      setIsSavingEdit(false);
      handleCancelEdit();
    }
  };

  const handleDeleteMessage = async (msgId: string, replyId?: string) => {
    if (!activeConversation) return;
    const now = new Date();
    const myId = currentUser?.id || 'me';
    const myName = currentUser?.displayName || currentUser?.username || 'Bạn';

    if (activeConversation.id === AI_COPILOT_CONV_ID) {
      setAiMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId) return m;
          return {
            ...m,
            originalText: m.originalText || m.text,
            isDeleted: true,
            deletedAt: now.toISOString(),
            deletedBy: myId,
            deletedByName: myName,
          };
        })
      );
      if (historyModalMessage && (historyModalMessage.id === msgId || historyModalMessage.id === replyId)) {
        setHistoryModalMessage((prev) =>
          prev
            ? {
                ...prev,
                originalText: prev.originalText || prev.text,
                isDeleted: true,
                deletedAt: now.toISOString(),
                deletedBy: myId,
                deletedByName: myName,
              }
            : null
        );
      }
      antdMessage.success('Đã xoá tin nhắn (lịch sử đã được lưu lại)');
      return;
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConversation.id) return c;
        return {
          ...c,
          messages: c.messages.map((m) => {
            if (m.id !== msgId) return m;
            if (replyId) {
              return {
                ...m,
                thread: (m.thread || []).map((r) => {
                  if (r.id !== replyId) return r;
                  return {
                    ...r,
                    originalText: r.originalText || r.text,
                    isDeleted: true,
                    deletedAt: now.toISOString(),
                    deletedBy: myId,
                    deletedByName: myName,
                  };
                }),
              };
            }
            return {
              ...m,
              originalText: m.originalText || m.text,
              isDeleted: true,
              deletedAt: now.toISOString(),
              deletedBy: myId,
              deletedByName: myName,
            };
          }),
        };
      })
    );

    if (historyModalMessage && (historyModalMessage.id === msgId || historyModalMessage.id === replyId)) {
      setHistoryModalMessage((prev) =>
        prev
          ? {
              ...prev,
              originalText: prev.originalText || prev.text,
              isDeleted: true,
              deletedAt: now.toISOString(),
              deletedBy: myId,
              deletedByName: myName,
            }
          : null
      );
    }

    try {
      await apiClient.chat.deleteMessage(msgId, {
        conversationId: activeConversation.id,
        replyId: replyId || undefined,
      });
      notifyLivePeers();
      antdMessage.success('Đã xoá tin nhắn (lịch sử đã được lưu lại)');
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || 'Lỗi khi xoá tin nhắn');
    }
  };

  const handleRestoreMessage = async (msgId: string, replyId?: string) => {
    if (!activeConversation) return;
    const now = new Date();
    const myId = currentUser?.id || 'me';
    const myName = currentUser?.displayName || currentUser?.username || 'Bạn';

    if (activeConversation.id === AI_COPILOT_CONV_ID) {
      setAiMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId) return m;
          const restoredText = m.text || m.originalText || '';
          return {
            ...m,
            text: restoredText,
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            deletedByName: null,
          };
        })
      );
      if (historyModalMessage && (historyModalMessage.id === msgId || historyModalMessage.id === replyId)) {
        setHistoryModalMessage((prev) =>
          prev
            ? {
                ...prev,
                text: prev.text || prev.originalText || '',
                isDeleted: false,
                deletedAt: null,
                deletedBy: null,
                deletedByName: null,
              }
            : null
        );
      }
      antdMessage.success('Đã khôi phục tin nhắn thành công');
      return;
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConversation.id) return c;
        return {
          ...c,
          messages: c.messages.map((m) => {
            if (m.id !== msgId) return m;
            if (replyId) {
              return {
                ...m,
                thread: (m.thread || []).map((r) => {
                  if (r.id !== replyId) return r;
                  const restoredText = r.text || r.originalText || '';
                  return {
                    ...r,
                    text: restoredText,
                    isDeleted: false,
                    deletedAt: null,
                    deletedBy: null,
                    deletedByName: null,
                  };
                }),
              };
            }
            const restoredText = m.text || m.originalText || '';
            return {
              ...m,
              text: restoredText,
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              deletedByName: null,
            };
          }),
        };
      })
    );

    if (historyModalMessage && (historyModalMessage.id === msgId || historyModalMessage.id === replyId)) {
      setHistoryModalMessage((prev) =>
        prev
          ? {
              ...prev,
              text: prev.text || prev.originalText || '',
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              deletedByName: null,
            }
          : null
      );
    }

    try {
      await apiClient.chat.restoreMessage(msgId, {
        conversationId: activeConversation.id,
        replyId: replyId || undefined,
      });
      notifyLivePeers();
      antdMessage.success('Đã khôi phục tin nhắn thành công');
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || 'Lỗi khi khôi phục tin nhắn');
    }
  };

  const handleRestoreVersion = async (msgId: string, versionText: string, replyId?: string) => {
    if (!activeConversation) return;
    try {
      await apiClient.chat.editMessage(msgId, {
        conversationId: activeConversation.id,
        text: versionText,
        replyId: replyId || undefined,
      });
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConversation.id) return c;
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== msgId) return m;
              if (replyId) {
                return {
                  ...m,
                  thread: (m.thread || []).map((r) => {
                    if (r.id !== replyId) return r;
                    return {
                      ...r,
                      text: versionText,
                      editedAt: new Date().toISOString(),
                    };
                  }),
                };
              }
              return {
                ...m,
                text: versionText,
                editedAt: new Date().toISOString(),
              };
            }),
          };
        })
      );
      if (historyModalMessage && (historyModalMessage.id === msgId || historyModalMessage.id === replyId)) {
        setHistoryModalMessage((prev) =>
          prev
            ? {
                ...prev,
                text: versionText,
                editedAt: new Date().toISOString(),
              }
            : null
        );
      }
      notifyLivePeers();
      antdMessage.success('Đã khôi phục nội dung phiên bản đã chọn');
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || 'Lỗi khi khôi phục phiên bản');
    }
  };

  const handleBuzzMessage = async (msgId: string, replyId?: string) => {
    if (!activeConversation) return;
    try {
      antdMessage.loading({ content: 'Đang gửi tín hiệu Buzz khẩn cấp...', key: `buzz-${msgId}` });
      const res = await apiClient.chat.buzzMessage(msgId, {
        conversationId: activeConversation.id,
        replyId,
      });
      if (res?.success) {
        playWebAudioBuzzChime();
        triggerBuzzVibration();
        antdMessage.success({
          content: '⚡ Đã Buzz tin nhắn khẩn cấp thành công! Hệ thống đã gửi cảnh báo đến người nhận.',
          key: `buzz-${msgId}`,
          duration: 3,
        });

        // Update local state immediately
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeConversation.id) return c;
            return {
              ...c,
              updatedAt: res.buzzEvent.buzzedAt,
              messages: c.messages.map((m) => {
                if (m.id !== msgId) return m;
                if (replyId && m.thread) {
                  return {
                    ...m,
                    thread: m.thread.map((r) =>
                      r.id === replyId
                        ? {
                            ...r,
                            isBuzzed: true,
                            buzzedAt: res.buzzEvent.buzzedAt,
                            buzzCount: (r.buzzCount || 0) + 1,
                            latestBuzz: res.buzzEvent,
                            buzzHistory: [...(r.buzzHistory || []), res.buzzEvent],
                          }
                        : r
                    ),
                  };
                }
                return {
                  ...m,
                  isBuzzed: true,
                  buzzedAt: res.buzzEvent.buzzedAt,
                  buzzCount: (m.buzzCount || 0) + 1,
                  latestBuzz: res.buzzEvent,
                  buzzHistory: [...(m.buzzHistory || []), res.buzzEvent],
                };
              }),
            };
          })
        );
        notifyLivePeers();
      }
    } catch (err: SafeAny) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Không thể Buzz tin nhắn này';
      antdMessage.error({ content: errorMsg, key: `buzz-${msgId}`, duration: 4 });
    }
  };

  const markThreadReadOptimisticAndSync = useCallback(
    (convId: string, msgId: string) => {
      if (!convId || !msgId || convId === AI_COPILOT_CONV_ID) return;
      const nowIso = new Date().toISOString();
      const myStaffId = Number(currentUserStaffMember.id || currentUser?.id || 0);
      const myName =
        currentUserStaffMember.displayName || currentUser?.displayName || currentUser?.username || 'Danny Do';
      const myRole = currentUserStaffMember.role || currentUser?.role || 'Staff';
      const myAvatar = currentUserStaffMember.avatarUrl || undefined;

      let resolvedReplyCount = 0;
      let resolvedLastReplyId: string | undefined;

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          let unreadThreadTotal = 0;
          const nextMessages = c.messages.map((m) => {
            if (m.id !== msgId) {
              unreadThreadTotal += m.unreadThreadReplyCount || 0;
              return m;
            }
            const visibleReplies = (m.thread || []).filter((r) => !r.deletedAt);
            resolvedReplyCount = visibleReplies.length;
            resolvedLastReplyId = visibleReplies.length > 0 ? visibleReplies[visibleReplies.length - 1]?.id : undefined;
            const existingReceipts = m.threadReadReceipts || [];
            const updatedReceipts =
              myStaffId > 0
                ? [
                    ...existingReceipts.filter((r) => r.staffId !== myStaffId),
                    {
                      staffId: myStaffId,
                      displayName: myName,
                      role: myRole,
                      avatarUrl: myAvatar,
                      readReplyCount: resolvedReplyCount,
                      lastReadReplyId: resolvedLastReplyId || null,
                      readAt: nowIso,
                    },
                  ]
                : existingReceipts;
            return {
              ...m,
              unreadThreadReplyCount: 0,
              threadReadReceipts: updatedReceipts,
            };
          });
          return {
            ...c,
            unreadThreadCount: unreadThreadTotal,
            messages: nextMessages,
          };
        })
      );

      updateUserPrefsLocalOnly((prev) => ({
        ...prev,
        readThreadReplyCountByMsg: {
          ...(prev.readThreadReplyCountByMsg || {}),
          [msgId]: resolvedReplyCount,
          [`${convId}::${msgId}`]: resolvedReplyCount,
        },
        readThreadAtByMsg: {
          ...(prev.readThreadAtByMsg || {}),
          [msgId]: nowIso,
          [`${convId}::${msgId}`]: nowIso,
        },
        ...(resolvedLastReplyId
          ? {
              lastReadThreadReplyIdByMsg: {
                ...(prev.lastReadThreadReplyIdByMsg || {}),
                [msgId]: resolvedLastReplyId,
                [`${convId}::${msgId}`]: resolvedLastReplyId,
              },
            }
          : {}),
      }));

      apiClient.chat
        ?.markThreadAsRead?.(convId, msgId)
        ?.then((res) => {
          if (res?.conversation) {
            setConversations((prev) => prev.map((c) => (c.id === convId ? res.conversation! : c)));
          }
          notifyLivePeers();
        })
        ?.catch?.(() => {});
    },
    [
      currentUserStaffMember.id,
      currentUserStaffMember.displayName,
      currentUserStaffMember.role,
      currentUserStaffMember.avatarUrl,
      currentUser?.id,
      currentUser?.displayName,
      currentUser?.username,
      currentUser?.role,
      updateUserPrefsLocalOnly,
      notifyLivePeers,
    ]
  );

  const handleOpenThread = useCallback(
    (msgId: string, convIdOverride?: string, options?: { autoFocus?: boolean }) => {
      setActiveThreadMsgId(msgId);
      setThreadOpen(true);
      if (isMobile) {
        setMobileActiveView('thread');
      } else if (!maximizedRef.current && typeof window !== 'undefined') {
        const minComfort = sidebarWidthRef.current + threadWidthRef.current + 380;
        if (panelWidthRef.current < minComfort) {
          const maxAllowed = Math.max(520, window.innerWidth - 56);
          const nextW = Math.min(maxAllowed, minComfort);
          panelWidthRef.current = nextW;
          setPanelWidth(nextW);
          persistPersonalLayout({ panelWidth: nextW });
        }
      }
      const targetConvId = convIdOverride || activeConversation?.id;
      if (targetConvId && isTabVisible) {
        markThreadReadOptimisticAndSync(targetConvId, msgId);
      }
      scrollToChatBottom('thread', 'auto');
      if (options?.autoFocus !== false) {
        setTimeout(() => {
          threadInputRef.current?.focus();
        }, 120);
      }
    },
    [
      isMobile,
      activeConversation,
      isTabVisible,
      markThreadReadOptimisticAndSync,
      scrollToChatBottom,
      persistPersonalLayout,
    ]
  );

  const navigateToMessage = useCallback(
    (convId: string, msgId?: string) => {
      if ((userPrefs.hiddenIds || []).includes(convId)) {
        updateUserSidebarPrefs((prev) => ({
          ...prev,
          hiddenIds: (prev.hiddenIds || []).filter((id) => id !== convId),
        }));
      }
      setSidebarFilter('all');
      setSearchQuery('');
      setActiveConvId(convId);
      setActiveSubtab('chat');
      if (isMobile) setMobileActiveView('conversation');

      const targetConv =
        convId === AI_COPILOT_CONV_ID ? aiCopilotConversation : conversations.find((c) => c.id === convId);

      if (!targetConv) {
        pendingNavRef.current = { convId, msgId };
        void fetchBootstrap(true);
        return;
      }

      const msgs = targetConv.messages || [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
      markConversationReadOptimisticAndSync(convId, msgs.length, lastMsg?.id);

      if (!msgId) {
        scrollToChatBottom('main', 'auto');
        return;
      }

      let rootMsg = targetConv.messages.find((m) => m.id === msgId);
      let isReply = false;

      if (!rootMsg) {
        for (const m of targetConv.messages) {
          const foundReply = (m.thread || []).find((r) => r.id === msgId);
          if (foundReply) {
            rootMsg = m;
            isReply = true;
            break;
          }
        }
      }

      const retryKey = `${convId}:${msgId}`;
      if (!rootMsg && !retriedMissingMsgRef.current.has(retryKey)) {
        retriedMissingMsgRef.current.add(retryKey);
        pendingNavRef.current = { convId, msgId };
        void fetchBootstrap(true);
        return;
      }

      if (rootMsg) {
        const hasSubthread = Boolean(rootMsg.thread && rootMsg.thread.length > 0);
        if (hasSubthread || isReply) {
          handleOpenThread(rootMsg.id, convId);
        }
      }

      setHighlightedMsgId(msgId);

      const attemptScroll = () => {
        const targetId = isReply ? `mos-chat-reply-${msgId}` : `mos-chat-msg-${msgId}`;
        const el = document.getElementById(targetId) || document.getElementById(`mos-chat-msg-${msgId}`);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return true;
        }
        return false;
      };

      setTimeout(() => {
        if (!attemptScroll()) {
          setTimeout(attemptScroll, 200);
        }
      }, 250);

      setTimeout(() => {
        setHighlightedMsgId((prev) => (prev === msgId ? null : prev));
      }, 4000);
    },
    [
      conversations,
      aiCopilotConversation,
      isMobile,
      handleOpenThread,
      isTabVisible,
      markConversationReadOptimisticAndSync,
      userPrefs.hiddenIds,
      updateUserSidebarPrefs,
      fetchBootstrap,
      scrollToChatBottom,
    ]
  );

  useEffect(() => {
    navigateToMessageRef.current = navigateToMessage;
  }, [navigateToMessage]);

  const lastProcessedNavRef = useRef<string | null>(null);

  useEffect(() => {
    if (targetNavigation?.openTab) {
      setActiveSubtab(targetNavigation.openTab);
    }
    if (targetNavigation?.conversationId) {
      const navKey = `${targetNavigation.conversationId}:${targetNavigation.messageId || ''}:${targetNavigation.timestamp || 0}:${targetNavigation.openTab || ''}`;
      if (lastProcessedNavRef.current === navKey) return;
      lastProcessedNavRef.current = navKey;
      navigateToMessageRef.current(targetNavigation.conversationId, targetNavigation.messageId);
    }
  }, [
    targetNavigation?.timestamp,
    targetNavigation?.conversationId,
    targetNavigation?.messageId,
    targetNavigation?.openTab,
  ]);

  const handleMessageTap = (m: MosChatMessage, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('[role="button"]')
    ) {
      return;
    }
    const msgId = m.id;
    const now = Date.now();
    const hasSubthread = Boolean(m.thread && m.thread.length > 0);

    if (lastTapRef.current.msgId === msgId && now - lastTapRef.current.time < 380) {
      // Double tap detected: Instant Heart reaction toggle
      handleToggleReaction(msgId, '❤️');
      setHeartFlyMsgId(msgId);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(25);
        } catch (_) {}
      }
      setTimeout(() => setHeartFlyMsgId((cur) => (cur === msgId ? null : cur)), 850);
      lastTapRef.current = { msgId: '', time: 0 };
    } else {
      // Single tap: toggle mobile reaction bar
      lastTapRef.current = { msgId, time: now };
      if (isMobile) {
        setMobileActiveMsgId((prev) => (prev === msgId ? null : msgId));
      }
      // If message has subthread, auto-open subthread on click!
      if (hasSubthread) {
        handleOpenThread(msgId);
      }
    }
  };

  const handleSendThreadReply = async (replyTextOverride?: string) => {
    const text = (typeof replyTextOverride === 'string' ? replyTextOverride : threadInput).trim();
    const attachmentsToSend = threadAttachments;
    if ((!text && attachmentsToSend.length === 0) || !activeConversation || !activeThreadMsgId) return;
    setMentionState((prev) => (prev.open ? { ...prev, open: false } : prev));
    setThreadInput('');
    setThreadAttachments([]);
    if (threadInputRef.current) {
      threadInputRef.current.value = '';
      threadInputRef.current.style.height = 'auto';
    }

    const senderName = currentUser?.displayName || 'Danny Do';
    const newReply = {
      id: `th-${Date.now()}`,
      senderId: currentUser?.id || 'me',
      senderName,
      senderRole: 'Super Admin',
      senderAvatar: 'DD',
      text,
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      timeLabel: dayjs().format('HH:mm'),
      createdAt: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConversation.id) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === activeThreadMsgId
              ? { ...m, unreadThreadReplyCount: 0, thread: [...(m.thread || []), newReply] }
              : m
          ),
        };
      })
    );
    scrollToChatBottom('thread', 'smooth');

    try {
      const res = await apiClient.chat.sendThreadReply({
        conversationId: activeConversation.id,
        messageId: activeThreadMsgId,
        text,
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      });
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === activeConversation.id ? res.conversation! : c)));
      }
      notifyLivePeers();
    } catch (_) {}

    // If user tagged @MAI in the thread reply, invoke MAI with full thread context!
    if (canUseAiCopilot && /(?:^|\s)@\s*mai\b/i.test(text)) {
      const cleanedPrompt =
        text.replace(/(?:^|\s)@\s*mai\b/gi, '').trim() || 'Hãy phân tích nội dung luồng thảo luận trên giúp nhóm.';
      setAiThinkingActive(true);
      try {
        const rootMsg = activeConversation.messages.find((m) => m.id === activeThreadMsgId);
        const rootContent = rootMsg ? `[Tin nhắn gốc từ ${rootMsg.senderName}]: ${rootMsg.text || ''}` : '';
        const threadReplies = (rootMsg?.thread || [])
          .slice(-10)
          .map((r) => `- ${r.senderName}: ${r.text || ''}`)
          .join('\n');
        const contextPayload = [
          `[Bối cảnh Luồng thảo luận (Thread) trong không gian "${activeConversation.name}"]:`,
          rootContent,
          threadReplies ? `[Các phản hồi trước đó trong luồng]:\n${threadReplies}` : '',
          `[Câu hỏi từ ${senderName}]: ${cleanedPrompt}`,
        ]
          .filter(Boolean)
          .join('\n\n');

        const imageDataUrl = await convertAttachmentToDataUrl(attachmentsToSend?.[0]);
        const aiRes = await apiClient.ai.sendMessage({
          sessionId: aiSessionId || undefined,
          message: contextPayload,
          scope: `mos-chat-thread:${activeConversation.id}:${activeThreadMsgId}`,
          imageDataUrl,
          context: {
            page: `mos-chat-thread:${activeConversation.id}:${activeThreadMsgId}`,
            userName: senderName,
            myRole: currentUser?.role || 'super_admin',
          },
        });
        if (aiRes?.session?.id) {
          setAiSessionId(aiRes.session.id);
        }
        // Backend auto-delivers the bot reply directly to activeThreadMsgId in DB!
        // Sync fresh conversation state from server to immediately display MAI's thread reply
        await fetchBootstrap(true);
        notifyLivePeers();
        scrollToChatBottom('thread', 'smooth');
      } catch (_) {
        // ignore thread AI error
      } finally {
        setAiThinkingActive(false);
      }
    }
  };

  const handleSendSticker = async (
    sticker: MosChatStickerItem,
    target: 'main' | 'thread' | { dockConvId: string } = 'main'
  ) => {
    setOpenStickerPopoverKey(null);
    const tokenText = formatStickerToken(sticker.id);
    if (target === 'main') {
      if (!activeConversation) return;
      scrollToChatBottom('main', 'smooth');
      await handleSendMessage(activeConversation.id, tokenText, null, []);
      scrollToChatBottom('main', 'smooth');
      return;
    }
    if (typeof target === 'object' && target.dockConvId) {
      scrollToChatBottom({ dockConvId: target.dockConvId }, 'smooth');
      await handleSendMessage(target.dockConvId, tokenText, null, []);
      scrollToChatBottom({ dockConvId: target.dockConvId }, 'smooth');
      return;
    }
    if (target === 'thread') {
      if (!activeConversation || !activeThreadMsgId) return;
      const senderName = currentUser?.displayName || 'Danny Do';
      const newReply = {
        id: `th-${Date.now()}`,
        senderId: currentUser?.id || 'me',
        senderName,
        senderRole: 'Super Admin',
        senderAvatar: 'DD',
        text: tokenText,
        timeLabel: dayjs().format('HH:mm'),
        createdAt: new Date().toISOString(),
      };
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConversation.id) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === activeThreadMsgId
                ? { ...m, unreadThreadReplyCount: 0, thread: [...(m.thread || []), newReply] }
                : m
            ),
          };
        })
      );
      scrollToChatBottom('thread', 'smooth');
      try {
        const res = await apiClient.chat.sendThreadReply({
          conversationId: activeConversation.id,
          messageId: activeThreadMsgId,
          text: tokenText,
        });
        if (res?.conversation) {
          setConversations((prev) => prev.map((c) => (c.id === activeConversation.id ? res.conversation! : c)));
        }
        scrollToChatBottom('thread', 'smooth');
        notifyLivePeers();
      } catch (_) {}
    }
  };

  const openTaskModalFromMessage = (msg: MosChatMessage | null) => {
    setEditingTask(null);
    setTaskModalSourceMsg(msg);
    setTaskDoneState(false);
    setTaskArchivedState(false);
    if (staffDirectory.length === 0) {
      fetchBootstrap(true);
      apiClient.staff
        .list()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const mapped: MosChatStaffMember[] = data.map((s: SafeAny) => ({
              id: s.id,
              username: s.username || s.name || s.displayName || `staff_${s.id}`,
              displayName: s.name || s.displayName || `Staff #${s.id}`,
              role: s.role || 'Staff',
              avatar: s.avatar || undefined,
              department: s.department || undefined,
              userGroupName: s.userGroupName || undefined,
            }));
            setStaffDirectory((prev) => (prev.length === 0 ? mapped : prev));
            if (typeof window !== 'undefined') {
              try {
                window.localStorage.setItem(STAFF_DIRECTORY_CACHE_KEY, JSON.stringify(mapped));
              } catch {}
            }
          }
        })
        .catch(() => {});
    }
    const existingTask = msg ? uniqueTasks.find((t) => t.sourceMessageId === msg.id || t.id === msg.taskId) : null;
    setTaskTitle(
      existingTask?.title ||
        (msg ? msg.text : composerTextRef.current.trim() || 'Kiểm tra lịch hẹn & chuẩn bị đón khách VIP')
    );
    const existingAssignee =
      existingTask?.assigneeName &&
      !String(existingTask.assigneeName).includes('Hà My') &&
      existingTask.assigneeName !== 'Chưa phân công'
        ? existingTask.assigneeName
        : currentUser?.displayName || '';
    setTaskAssignee(existingAssignee);
    if (existingTask?.priority) {
      setTaskPriority(existingTask.priority);
    }
    setTaskRemindMode('preset');
    setSelectedPresetId('none');
    setTaskRemindSeconds(0);
    setCustomRemindDate(dayjs().add(1, 'hour').minute(0).second(0));

    // Deadline initialization for new task (MOS-BUG-125)
    if (existingTask?.deadline || existingTask?.dueAt) {
      const d = dayjs(existingTask.deadline || existingTask.dueAt);
      setTaskDeadline(d.isValid() ? d : null);
      setTaskDeadlineMode('custom');
      setSelectedDeadlinePresetId('custom');
    } else {
      const defaultD = DEADLINE_PRESETS[0].getDate();
      setTaskDeadline(defaultD);
      setTaskDeadlineMode('preset');
      setSelectedDeadlinePresetId('today-1730');
    }
    setTaskNegotiatedDeadline(existingTask?.negotiatedDeadline ? dayjs(existingTask.negotiatedDeadline) : null);
    setTaskNegotiationNote(existingTask?.negotiationNote || '');

    setTaskModalOpen(true);
  };

  const openEditTaskModal = (task: MosChatTaskItem) => {
    setEditingTask(task);
    setTaskModalSourceMsg(null);
    if (staffDirectory.length === 0) {
      fetchBootstrap(true);
      apiClient.staff
        .list()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const mapped: MosChatStaffMember[] = data.map((s: SafeAny) => ({
              id: s.id,
              username: s.username || s.name || s.displayName || `staff_${s.id}`,
              displayName: s.name || s.displayName || `Staff #${s.id}`,
              role: s.role || 'Staff',
              avatar: s.avatar || undefined,
              department: s.department || undefined,
              userGroupName: s.userGroupName || undefined,
            }));
            setStaffDirectory((prev) => (prev.length === 0 ? mapped : prev));
            if (typeof window !== 'undefined') {
              try {
                window.localStorage.setItem(STAFF_DIRECTORY_CACHE_KEY, JSON.stringify(mapped));
              } catch {}
            }
          }
        })
        .catch(() => {});
    }
    setTaskTitle(task.title || '');
    setTaskAssignee(task.assigneeName || currentUser?.displayName || '');
    setTaskPriority(task.priority || 'HIGH');
    setTaskDoneState(Boolean(task.done));
    setTaskArchivedState(Boolean(task.archived));

    const remindDate = dayjs(task.remindAt);
    if (remindDate.isValid() && remindDate.isAfter(dayjs())) {
      setTaskRemindMode('custom');
      setCustomRemindDate(remindDate);
      setSelectedPresetId('custom');
      setTaskRemindSeconds(Math.max(60, remindDate.diff(dayjs(), 'second')));
    } else {
      setTaskRemindMode('preset');
      setSelectedPresetId('none');
      setTaskRemindSeconds(0);
      setCustomRemindDate(dayjs().add(1, 'hour').minute(0).second(0));
    }

    // Deadline initialization for edit (MOS-BUG-125)
    if (task.deadline || task.dueAt) {
      const d = dayjs(task.deadline || task.dueAt);
      setTaskDeadline(d.isValid() ? d : null);
      setTaskDeadlineMode('custom');
      setSelectedDeadlinePresetId('custom');
    } else {
      setTaskDeadline(null);
      setTaskDeadlineMode('none');
      setSelectedDeadlinePresetId('none');
    }
    setTaskNegotiatedDeadline(task.negotiatedDeadline ? dayjs(task.negotiatedDeadline) : null);
    setTaskNegotiationNote(task.negotiationNote || '');

    setTaskModalOpen(true);
  };

  const handleOpenNegotiateModal = (task: MosChatTaskItem) => {
    setNegotiatingTask(task);
    const initialProposed = task.deadline ? dayjs(task.deadline).add(2, 'hour') : dayjs().hour(17).minute(30).second(0);
    setNegotiateProposedDeadline(initialProposed);
    setNegotiateReason(task.negotiationNote || '');
    setNegotiateModalOpen(true);
  };

  const handleSubmitNegotiation = async () => {
    if (!negotiatingTask) return;
    if (!negotiateProposedDeadline || !negotiateProposedDeadline.isValid()) {
      antdMessage.warning('Vui lòng chọn thời hạn bạn đề xuất dời sang');
      return;
    }
    if (!negotiateReason.trim()) {
      antdMessage.warning('Vui lòng nhập lý do / giải trình thương lượng dời hạn');
      return;
    }

    setIsSubmittingNegotiation(true);
    const proposedIso = negotiateProposedDeadline.toISOString();
    const cleanReason = negotiateReason.trim();
    const myName = currentUser?.displayName || 'Nhân sự';
    const nowIso = new Date().toISOString();

    setTasks((prev) =>
      prev.map((t) =>
        t.id === negotiatingTask.id
          ? {
              ...t,
              negotiatedDeadline: proposedIso,
              negotiationNote: cleanReason,
              negotiatedBy: myName,
              negotiatedAt: nowIso,
            }
          : t
      )
    );

    setNegotiateModalOpen(false);
    antdMessage.success('Đã gửi đề xuất thương lượng dời hạn chót thành công!');

    try {
      await apiClient.chat.updateTask(negotiatingTask.id, {
        negotiatedDeadline: proposedIso,
        negotiationNote: cleanReason,
        negotiatedBy: myName,
        negotiatedAt: nowIso,
      });
      notifyLivePeers();
    } catch (_) {
      antdMessage.error('Không thể gửi đề xuất thương lượng');
    } finally {
      setIsSubmittingNegotiation(false);
      setNegotiatingTask(null);
    }
  };

  const handleAcceptNegotiatedDeadline = async (task: MosChatTaskItem) => {
    if (!task.negotiatedDeadline) return;
    const newDeadline = task.negotiatedDeadline;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              deadline: newDeadline,
              dueAt: newDeadline,
              negotiatedDeadline: null,
              negotiationNote: null,
              negotiatedBy: null,
              negotiatedAt: null,
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );

    antdMessage.success(`Đã chấp thuận dời hạn sang ${dayjs(newDeadline).format('HH:mm DD/MM/YYYY')}!`);

    try {
      await apiClient.chat.updateTask(task.id, {
        acceptNegotiatedDeadline: true,
      });
      notifyLivePeers();
    } catch (_) {}
  };

  const handleRejectNegotiatedDeadline = async (task: MosChatTaskItem) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              negotiatedDeadline: null,
              negotiationNote: null,
              negotiatedBy: null,
              negotiatedAt: null,
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );

    antdMessage.info('Đã từ chối đề xuất dời hạn và giữ nguyên hạn cũ');

    try {
      await apiClient.chat.updateTask(task.id, {
        rejectNegotiatedDeadline: true,
      });
      notifyLivePeers();
    } catch (_) {}
  };

  const handleToggleArchiveTask = async (taskId: string, archived: boolean) => {
    const nowIso = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              archived,
              archivedAt: archived ? nowIso : null,
              fired: archived ? true : t.fired,
            }
          : t
      )
    );
    if (activeAlertTask?.id === taskId && archived) {
      setActiveAlertTask(null);
    }
    antdMessage.success(archived ? 'Đã chuyển công việc vào Lưu trữ' : 'Đã khôi phục công việc');
    try {
      await apiClient.chat.updateTask(taskId, { archived });
      notifyLivePeers();
    } catch (_) {}
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (activeAlertTask?.id === taskId) {
      setActiveAlertTask(null);
    }
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        messages: c.messages.map((m) => (m.taskId === taskId ? { ...m, taskId: undefined } : m)),
      }))
    );
    antdMessage.success('Đã xoá công việc thành công');
    try {
      await apiClient.chat.deleteTask(taskId);
      notifyLivePeers();
    } catch (_) {}
  };

  const handleConfirmCreateTask = async () => {
    const cleanTitle = taskTitle.trim();
    const cleanAssignee = taskAssignee.trim();
    if (!cleanTitle) {
      antdMessage.warning('Vui lòng nhập tên công việc');
      return;
    }
    if (!cleanAssignee) {
      antdMessage.warning('Vui lòng chọn Người phụ trách công việc từ danh sách nhân sự đang hoạt động');
      return;
    }

    const matchedAssignee = staffDirectory.find(
      (s) => s.displayName === cleanAssignee || `${s.displayName} (${s.role})` === cleanAssignee
    );
    const resolvedAssigneeName = matchedAssignee?.displayName || cleanAssignee;
    const isNoReminder = taskRemindMode === 'preset' && (selectedPresetId === 'none' || taskRemindSeconds <= 0);

    let remindAtIso: string;
    let remindSecondsToSend: number;

    if (taskRemindMode === 'custom' && customRemindDate && customRemindDate.isValid()) {
      remindAtIso = customRemindDate.toISOString();
      const diffSec = customRemindDate.diff(dayjs(), 'second');
      remindSecondsToSend = Math.max(60, diffSec);
    } else if (isNoReminder) {
      remindAtIso = new Date().toISOString();
      remindSecondsToSend = 0;
    } else {
      remindAtIso = new Date(Date.now() + taskRemindSeconds * 1000).toISOString();
      remindSecondsToSend = taskRemindSeconds;
    }

    const deadlineIso = taskDeadline && taskDeadline.isValid() ? taskDeadline.toISOString() : null;
    const negotiatedDeadlineIso =
      taskNegotiatedDeadline && taskNegotiatedDeadline.isValid() ? taskNegotiatedDeadline.toISOString() : null;
    const cleanNegotiationNote = taskNegotiationNote.trim() || null;

    if (editingTask) {
      const updatedTask: MosChatTaskItem = {
        ...editingTask,
        title: cleanTitle,
        assigneeId: matchedAssignee?.id ?? editingTask.assigneeId,
        assigneeName: resolvedAssigneeName,
        priority: taskPriority,
        done: taskDoneState,
        archived: taskArchivedState,
        archivedAt: taskArchivedState ? editingTask.archivedAt || new Date().toISOString() : null,
        remindAt: remindAtIso,
        deadline: deadlineIso,
        dueAt: deadlineIso,
        negotiatedDeadline: negotiatedDeadlineIso,
        negotiationNote: cleanNegotiationNote,
        fired: isNoReminder || taskDoneState || taskArchivedState,
        updatedAt: new Date().toISOString(),
      };

      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updatedTask : t)));
      setTaskModalOpen(false);
      setEditingTask(null);
      antdMessage.success(`Đã cập nhật công việc "${cleanTitle}"`);

      try {
        await apiClient.chat.updateTask(editingTask.id, {
          title: cleanTitle,
          assigneeId: matchedAssignee?.id ?? editingTask.assigneeId,
          assigneeName: resolvedAssigneeName,
          priority: taskPriority,
          done: taskDoneState,
          archived: taskArchivedState,
          remindInSeconds: remindSecondsToSend,
          remindAt: remindAtIso,
          deadline: deadlineIso,
          dueAt: deadlineIso,
          negotiatedDeadline: negotiatedDeadlineIso,
          negotiationNote: cleanNegotiationNote,
        });
        notifyLivePeers();
      } catch (_) {}
      return;
    }

    if (!activeConversation) return;

    const normalizedTitle = cleanTitle.replace(/\s+/g, ' ').toLowerCase();
    const existingTask = uniqueTasks.find(
      (t) =>
        (taskModalSourceMsg?.id && t.sourceMessageId === taskModalSourceMsg.id) ||
        (t.conversationId === activeConversation.id &&
          (t.title || '').trim().replace(/\s+/g, ' ').toLowerCase() === normalizedTitle)
    );

    const tempTaskId = existingTask?.id || `task-${Date.now()}`;
    const newTask: MosChatTaskItem = {
      ...(existingTask || {}),
      id: tempTaskId,
      conversationId: activeConversation.id,
      conversationName: activeConversation.name,
      sourceMessageId: taskModalSourceMsg?.id || existingTask?.sourceMessageId || null,
      sourceAuthorName:
        taskModalSourceMsg?.senderName || existingTask?.sourceAuthorName || currentUser?.displayName || 'Danny Do',
      title: cleanTitle,
      assigneeId: matchedAssignee?.id,
      assigneeName: resolvedAssigneeName,
      creatorName: currentUser?.displayName || 'Danny Do',
      priority: taskPriority,
      remindAt: remindAtIso,
      deadline: deadlineIso,
      dueAt: deadlineIso,
      negotiatedDeadline: negotiatedDeadlineIso,
      negotiationNote: cleanNegotiationNote,
      done: false,
      fired: isNoReminder,
      createdAt: existingTask?.createdAt || new Date().toISOString(),
    };

    setTasks((prev) => {
      if (existingTask) {
        return prev.map((t) => (t.id === existingTask.id ? newTask : t));
      }
      return [newTask, ...prev];
    });
    if (taskModalSourceMsg) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                messages: c.messages.map((m) => (m.id === taskModalSourceMsg.id ? { ...m, taskId: tempTaskId } : m)),
              }
            : c
        )
      );
    } else if (!existingTask) {
      const taskMsg: MosChatMessage = {
        id: `msg-task-${Date.now()}`,
        conversationId: activeConversation.id,
        senderId: currentUser?.id || 'me',
        senderName: currentUser?.displayName || 'Danny Do',
        senderRole: 'Super Admin',
        senderAvatar: 'DD',
        roleColor: '#d4a84b',
        text: `Giao việc cho ${resolvedAssigneeName}:`,
        timeLabel: dayjs().format('HH:mm'),
        createdAt: new Date().toISOString(),
        taskId: tempTaskId,
        reactions: {},
        thread: [],
      };
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, messages: [...c.messages, taskMsg] } : c))
      );
    }

    setTaskModalOpen(false);
    antdMessage.success(
      existingTask
        ? `Đã cập nhật Task (${resolvedAssigneeName})`
        : isNoReminder
          ? `Đã giao Task cho ${resolvedAssigneeName}`
          : `Đã giao Task & bật nhắc hẹn (${resolvedAssigneeName})`
    );

    try {
      const res = await apiClient.chat.createTask({
        conversationId: activeConversation.id,
        sourceMessageId: taskModalSourceMsg?.id || existingTask?.sourceMessageId || null,
        title: cleanTitle,
        assigneeId: matchedAssignee?.id,
        assigneeName: resolvedAssigneeName,
        priority: taskPriority,
        remindInSeconds: remindSecondsToSend,
        remindAt: remindAtIso,
        deadline: deadlineIso,
        dueAt: deadlineIso,
        negotiationNote: cleanNegotiationNote,
      });
      if (res?.task) {
        setTasks((prev) => prev.map((t) => (t.id === tempTaskId || t.id === res.task.id ? res.task : t)));
      }
      notifyLivePeers();
    } catch (_) {}
  };

  const handleToggleTaskDone = async (taskId: string) => {
    let nextDone = true;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        nextDone = !t.done;
        return { ...t, done: nextDone };
      })
    );
    if (activeAlertTask?.id === taskId) {
      setActiveAlertTask(null);
    }
    try {
      const res = await apiClient.chat.updateTask(taskId, { done: nextDone });
      if (res && res.task) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
      }
    } catch (_) {}
  };

  const handleUpdateTask = useCallback(
    async (taskId: string, payload: UpdateMosChatTaskRequest) => {
      try {
        const res = await apiClient.chat.updateTask(taskId, payload);
        if (res && res.task) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)));
        }
      } catch (err: any) {
        console.error('handleUpdateTask error:', err);
        antdMessage.error(err?.message || 'Không thể cập nhật công việc');
      }
    },
    [antdMessage]
  );

  const handleSnoozeTask = async (taskId: string, snoozeSec = 600) => {
    const nextRemindAt = new Date(Date.now() + snoozeSec * 1000).toISOString();
    firedTaskIdsRef.current.delete(taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, remindAt: nextRemindAt, fired: false, done: false } : t))
    );
    setActiveAlertTask(null);
    antdMessage.info('Đã dời lịch nhắc lại sau 10 phút');
    try {
      await apiClient.chat.updateTask(taskId, { snoozeSeconds: snoozeSec });
    } catch (_) {}
  };

  const handlePopOutToMiniDock = () => {
    if (!activeConversation) return;
    setDockedConvIds((prev) => {
      const next = prev.includes(activeConversation.id) ? prev : [...prev, activeConversation.id];
      return next.slice(-2);
    });
    onClose();
  };

  const handleQuickCreateTaskForDock = async ({ conversationId, title }: { conversationId: string; title: string }) => {
    const cleanTitle = (title || '').trim();
    if (!cleanTitle) return;

    const tempTaskId = `task_temp_${Date.now()}`;
    const myName = currentUser?.displayName || currentUser?.fullName || 'Danny Do';
    const myId = currentUser?.id ? String(currentUser.id) : 'me';
    const targetConv = conversations.find((c) => c.id === conversationId);
    const convName = targetConv?.name || 'Không gian';

    const optimisticTask: MosChatTaskItem = {
      id: tempTaskId,
      conversationId,
      conversationName: convName,
      title: cleanTitle,
      done: false,
      priority: 'NORMAL',
      creatorName: myName,
      assigneeName: myName,
      assigneeId: myId,
      remindAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [optimisticTask, ...prev]);

    try {
      const res = await apiClient.chat.createTask({
        conversationId,
        title: cleanTitle,
        assigneeName: myName,
        assigneeId: myId,
        priority: 'NORMAL',
      });
      if (res?.task) {
        setTasks((prev) => prev.map((t) => (t.id === tempTaskId ? res.task : t)));
      }
      notifyLivePeers();
    } catch (_) {}
  };

  const handleSendThreadReplyForDock = async (
    convId: string,
    rootMsgId: string,
    text: string,
    attachments?: MosChatImageAttachment[]
  ) => {
    const cleanText = (text || '').trim();
    const attsToSend = attachments || [];
    if (!cleanText && attsToSend.length === 0) return;

    const senderName = currentUser?.displayName || 'Danny Do';
    const newReply: MosChatThreadReply = {
      id: `th-${Date.now()}`,
      senderId: currentUser?.id || 'me',
      senderName,
      senderRole: 'Super Admin',
      senderAvatar: 'DD',
      text: cleanText,
      attachments: attsToSend.length > 0 ? attsToSend : undefined,
      timeLabel: dayjs().format('HH:mm'),
      createdAt: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === rootMsgId ? { ...m, unreadThreadReplyCount: 0, thread: [...(m.thread || []), newReply] } : m
          ),
        };
      })
    );

    try {
      const res = await apiClient.chat.sendThreadReply({
        conversationId: convId,
        messageId: rootMsgId,
        text: cleanText,
        attachments: attsToSend.length > 0 ? attsToSend : undefined,
      });
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === convId ? res.conversation! : c)));
      }
      notifyLivePeers();
    } catch (_) {}
  };

  const handleSelectSelfChat = async () => {
    setNewRoomModalOpen(false);
    const selfId = `dm-self-${currentUser?.id || 'me'}`;
    const existing = visibleConversations.find((c) => c.id === selfId || (c.type === 'dm' && c.isSelf));
    if (existing) {
      setActiveConvId(existing.id);
      setActiveSubtab('chat');
      if (isMobile) setMobileActiveView('conversation');
      return;
    }
    try {
      const res = await apiClient.chat.createConversation({
        type: 'dm',
        name: `${currentUser?.displayName || currentUser?.username || 'Tôi'} (Ghi chú cho tôi)`,
        isSelf: true,
      });
      if (res?.conversation) {
        setConversations((prev) => [res.conversation, ...prev.filter((c) => c.id !== res.conversation.id)]);
        setActiveConvId(res.conversation.id);
        setActiveSubtab('chat');
        if (isMobile) setMobileActiveView('conversation');
        notifyLivePeers();
      }
    } catch (_) {
      antdMessage.error('Không thể tạo không gian ghi chú cá nhân');
    }
  };

  const handleSelectColleague = async (colleague: MosChatStaffMember) => {
    setNewRoomModalOpen(false);
    const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
    const peerId = Number(colleague.id) || 0;
    const existing = visibleConversations.find((c) => {
      if (c.type !== 'dm' || c.isSelf) return false;
      if (myStaffId > 0 && peerId > 0 && Array.isArray(c.memberIds)) {
        const nums = c.memberIds.map(Number);
        if (nums.includes(myStaffId) && nums.includes(peerId)) return true;
      }
      return Number(c.participantStaffId) === peerId || c.name === colleague.displayName;
    });
    if (existing) {
      setActiveConvId(existing.id);
      setActiveSubtab('chat');
      if (isMobile) setMobileActiveView('conversation');
      return;
    }
    try {
      const res = await apiClient.chat.createConversation({
        type: 'dm',
        name: colleague.displayName,
        participantStaffId: colleague.id,
      });
      if (res?.conversation) {
        setConversations((prev) => [res.conversation, ...prev.filter((c) => c.id !== res.conversation.id)]);
        setActiveConvId(res.conversation.id);
        setActiveSubtab('chat');
        if (isMobile) setMobileActiveView('conversation');
        notifyLivePeers();
      }
    } catch (_) {
      antdMessage.error('Không thể mở cuộc trò chuyện');
    }
  };

  const handleCreateSpace = async () => {
    const cleanName = newRoomName.trim();
    if (!cleanName) {
      antdMessage.warning('Vui lòng nhập tên Không gian (Space)');
      return;
    }
    const emoji = newRoomEmoji.trim();
    const color = newRoomColor.trim() || '#1a73e8';
    setNewRoomModalOpen(false);
    setNewRoomName('');
    setNewRoomSubtitle('');
    setNewRoomEmoji('');
    setNewRoomColor('#1a73e8');
    const memberIds = [...selectedMemberIds];
    setSelectedMemberIds([]);
    try {
      const res = await apiClient.chat.createConversation({
        type: 'space',
        name: cleanName,
        subtitle: newRoomSubtitle.trim() || undefined,
        avatar: emoji || undefined,
        color,
        memberIds,
      });
      if (res?.conversation) {
        setConversations((prev) => [res.conversation, ...prev.filter((c) => c.id !== res.conversation.id)]);
        setActiveConvId(res.conversation.id);
        setActiveSubtab('chat');
        if (isMobile) setMobileActiveView('conversation');
        notifyLivePeers();
      }
    } catch (_) {
      antdMessage.error('Không thể tạo Không gian làm việc');
    }
  };

  const handleToggleDepartmentOrTeam = (group: SpaceDepartmentOrTeamGroup) => {
    const groupMembers = staffDirectory.filter((m) => matchesStaffGroup(m, group.key));
    if (groupMembers.length === 0) {
      antdMessage.info(`Hiện chưa có nhân sự thuộc ${group.label}`);
      return;
    }
    const groupIds = groupMembers.map((m) => m.id);
    const allSelected = groupIds.every((id) => selectedMemberIds.includes(id));

    if (allSelected) {
      const myId = Number(currentUser?.id);
      setSelectedMemberIds((prev) => prev.filter((id) => id === myId || !groupIds.includes(id)));
    } else {
      setSelectedMemberIds((prev) => Array.from(new Set([...prev, ...groupIds])));
      if (!newRoomName.trim()) {
        setNewRoomName(group.defaultSlug);
      }
      if (!newRoomSubtitle.trim()) {
        setNewRoomSubtitle(group.defaultSubtitle);
      }
    }
  };

  const handleAddMemberToSpace = async (staffId: number) => {
    if (!activeConversation || activeConversation.type !== 'space') return;
    try {
      const res = await apiClient.chat.addMember(activeConversation.id, staffId);
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
        notifyLivePeers();
        antdMessage.success('Đã thêm thành viên vào Không gian');
      }
    } catch (err: SafeAny) {
      antdMessage.error(err?.message || 'Không thể thêm thành viên');
    }
  };

  const handleBulkAddGroupToSpace = async (group: SpaceDepartmentOrTeamGroup) => {
    if (!activeConversation || activeConversation.type !== 'space') return;
    const existingIds = new Set(activeConversation.memberIds || []);
    const missingIds = staffDirectory
      .filter((m) => matchesStaffGroup(m, group.key) && !existingIds.has(m.id))
      .map((m) => m.id);
    if (missingIds.length === 0) {
      antdMessage.info(`Tất cả thành viên của ${group.label} đã có mặt trong Không gian này`);
      return;
    }
    try {
      const res = await apiClient.chat.addMember(activeConversation.id, missingIds);
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
        notifyLivePeers();
        antdMessage.success(`Đã thêm ${missingIds.length} thành viên thuộc ${group.label} vào Không gian`);
      }
    } catch (err: SafeAny) {
      antdMessage.error(err?.message || 'Không thể thêm nhóm thành viên');
    }
  };

  const handleRemoveMemberFromSpace = async (staffId: number) => {
    if (!activeConversation || activeConversation.type !== 'space') return;
    try {
      const res = await apiClient.chat.removeMember(activeConversation.id, staffId);
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
        notifyLivePeers();
        antdMessage.success('Đã xóa thành viên khỏi Không gian');
      }
    } catch (err: SafeAny) {
      antdMessage.error(err?.message || 'Không thể xóa thành viên');
    }
  };

  const getMemberNickname = useCallback(
    (staffId: number | string | undefined | null): string | undefined => {
      if (!staffId || !activeConversation || activeConversation.type !== 'space') return undefined;
      return activeConversation.memberNicknames?.[String(staffId)]?.trim() || undefined;
    },
    [activeConversation]
  );

  const handleOpenNicknameModal = useCallback(
    (targetStaffId: number) => {
      if (!activeConversation || activeConversation.type !== 'space') return;
      const targetStaff = staffDirectory.find((s) => s.id === targetStaffId);
      const myId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
      const isMe = targetStaffId === myId;
      const currentNick = activeConversation.memberNicknames?.[String(targetStaffId)] || '';
      const name = targetStaff?.displayName || targetStaff?.username || (isMe ? 'Bạn' : `Nhân sự #${targetStaffId}`);

      setEditingNicknameTarget({
        staffId: targetStaffId,
        displayName: name,
        currentNickname: currentNick,
        isMe,
      });
      setNicknameInputVal(currentNick);
    },
    [activeConversation, currentUserStaffMember.id, currentUser?.id, staffDirectory]
  );

  const handleSaveNickname = useCallback(
    async (overrideValue?: string) => {
      if (!activeConversation || !editingNicknameTarget) return;
      const newNick = (overrideValue !== undefined ? overrideValue : nicknameInputVal).trim();
      setIsUpdatingNickname(true);
      try {
        const res = await apiClient.chat.updateNickname(activeConversation.id, {
          targetStaffId: editingNicknameTarget.staffId,
          nickname: newNick,
        });

        if (res.success) {
          const updatedConv = res.conversation;
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversation.id
                ? {
                    ...c,
                    memberNicknames: res.memberNicknames,
                    messages: updatedConv?.messages || c.messages,
                    updatedAt: updatedConv?.updatedAt || new Date().toISOString(),
                  }
                : c
            )
          );

          notifyLivePeers();
          antdMessage.success(newNick ? `Đã đổi biệt danh thành "${newNick}"!` : 'Đã gỡ biệt danh, trở về tên thật!');
          setEditingNicknameTarget(null);
          setNicknameInputVal('');
        }
      } catch (err: SafeAny) {
        antdMessage.error(err?.response?.data?.message || err?.message || 'Không thể lưu biệt danh');
      } finally {
        setIsUpdatingNickname(false);
      }
    },
    [activeConversation, editingNicknameTarget, nicknameInputVal, notifyLivePeers]
  );

  const activeThreadMessage = useMemo(() => {
    if (!activeConversation) return null;
    return (
      activeConversation.messages.find((m) => m.id === activeThreadMsgId) || activeConversation.messages[0] || null
    );
  }, [activeConversation, activeThreadMsgId]);

  // Automatically scroll main conversation stream to bottom when switching conversations or when new messages arrive
  useEffect(() => {
    if (!open || activeSubtab !== 'chat' || !activeConversation) return;
    const convId = activeConversation.id;
    const count = (activeConversation.messages || []).length;
    const prev = prevMainMsgCountRef.current;
    if (prev.convId !== convId) {
      prevMainMsgCountRef.current = { convId, count };
      scrollToChatBottom('main', 'auto');
    } else if (count > prev.count) {
      prevMainMsgCountRef.current = { convId, count };
      scrollToChatBottom('main', 'smooth');
    } else {
      prevMainMsgCountRef.current = { convId, count };
    }
  }, [open, activeSubtab, activeConversation?.id, activeConversation?.messages?.length, scrollToChatBottom]);

  // Automatically scroll sub-thread stream to bottom when opening thread or when new replies arrive
  useEffect(() => {
    if (!open || !threadOpen || !activeThreadMessage) return;
    const msgId = activeThreadMessage.id;
    const count = (activeThreadMessage.thread || []).length;
    const prev = prevThreadReplyCountRef.current;
    if (prev.msgId !== msgId) {
      prevThreadReplyCountRef.current = { msgId, count };
      scrollToChatBottom('thread', 'auto');
    } else if (count > prev.count) {
      prevThreadReplyCountRef.current = { msgId, count };
      scrollToChatBottom('thread', 'smooth');
    } else {
      prevThreadReplyCountRef.current = { msgId, count };
    }
  }, [open, threadOpen, activeThreadMessage?.id, activeThreadMessage?.thread?.length, scrollToChatBottom]);

  // Automatically mark open Sub-thread as read ONLY when the sub-thread drawer is open and browser tab is visible
  useEffect(() => {
    if (!isTabVisible || !open || !threadOpen || !activeConversation || !activeThreadMessage) return;
    if (activeConversation.id === AI_COPILOT_CONV_ID) return;
    const visibleReplies = (activeThreadMessage.thread || []).filter((r) => !r.deletedAt);
    if (visibleReplies.length === 0) return;
    const currentReadReplyCount =
      userPrefs.readThreadReplyCountByMsg?.[activeThreadMessage.id] ??
      userPrefs.readThreadReplyCountByMsg?.[`${activeConversation.id}::${activeThreadMessage.id}`];
    if (currentReadReplyCount !== visibleReplies.length || (activeThreadMessage.unreadThreadReplyCount || 0) > 0) {
      markThreadReadOptimisticAndSync(activeConversation.id, activeThreadMessage.id);
    }
  }, [
    isTabVisible,
    open,
    threadOpen,
    activeConversation?.id,
    activeThreadMessage?.id,
    activeThreadMessage?.thread?.length,
    activeThreadMessage?.unreadThreadReplyCount,
    userPrefs.readThreadReplyCountByMsg,
    markThreadReadOptimisticAndSync,
  ]);

  const assigneeOptions = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    const existingSet = new Set<string>();
    staffDirectory.forEach((s) => {
      if (s.displayName && !existingSet.has(s.displayName)) {
        existingSet.add(s.displayName);
        out.push({ value: s.displayName, label: `${s.displayName} (${s.role || 'Nhân sự'})` });
      }
    });
    if (currentUser?.displayName && !existingSet.has(currentUser.displayName)) {
      out.unshift({
        value: currentUser.displayName,
        label: `${currentUser.displayName} (${currentUser.role || 'Tôi'})`,
      });
    }
    return out;
  }, [staffDirectory, currentUser?.displayName, currentUser?.role]);

  const formatMoveTargetSnippet = (msg: MosChatMessage): string => {
    const raw = String(msg.text || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (raw) {
      return raw.length > 72 ? `${raw.slice(0, 72)}…` : raw;
    }
    const linkedTask = uniqueTasks.find((t) => t.sourceMessageId === msg.id || (msg.taskId && t.id === msg.taskId));
    if (linkedTask?.title) {
      const taskText = `📌 ${linkedTask.title.replace(/\s+/g, ' ').trim()}`;
      return taskText.length > 72 ? `${taskText.slice(0, 72)}…` : taskText;
    }
    if (msg.attachments && msg.attachments.length > 0) {
      return `[Đính kèm ${msg.attachments.length} hình ảnh]`;
    }
    return '[Tin nhắn]';
  };

  const handleMoveThreadItem = async (params: {
    mode: MosChatThreadMoveMode;
    sourceMessageId: string;
    replyId?: string;
    targetMessageId?: string;
  }) => {
    if (!activeConversation || activeConversation.id === AI_COPILOT_CONV_ID) return;
    const convId = activeConversation.id;
    const loadingKey = `${params.mode}:${params.sourceMessageId}:${params.replyId || ''}`;
    setMovingThreadItemKey(loadingKey);
    setOpenMovePopoverKey(null);
    setMoveThreadSearchQuery('');
    try {
      const res = await apiClient.chat.moveThreadItem({
        conversationId: convId,
        mode: params.mode,
        sourceMessageId: params.sourceMessageId,
        replyId: params.replyId,
        targetMessageId: params.targetMessageId,
      });
      lastVersionRef.current = Date.now();
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === convId ? res.conversation : c)));
      }
      if (res?.tasks) {
        setTasks(res.tasks);
      }
      if (
        (params.mode === 'MERGE_ROOT_TO_THREAD' || params.mode === 'MOVE_REPLY_TO_THREAD') &&
        params.targetMessageId
      ) {
        setActiveThreadMsgId(params.targetMessageId);
        setThreadOpen(true);
        if (isMobile) {
          setMobileActiveView('thread');
        }
      }
      notifyLivePeers();
      if (params.mode === 'MERGE_ROOT_TO_THREAD') {
        antdMessage.success('Đã gộp tin nhắn (kèm ảnh & phản hồi) vào luồng trả lời phụ!');
      } else if (params.mode === 'PROMOTE_REPLY_TO_ROOT') {
        antdMessage.success('Đã tách phản hồi ra thành tin nhắn độc lập ở luồng chính!');
      } else {
        antdMessage.success('Đã chuyển phản hồi sang luồng trả lời đích!');
      }
    } catch (err: SafeAny) {
      antdMessage.error(
        err?.response?.data?.message || err?.message || 'Không thể di chuyển tin nhắn / luồng trả lời.'
      );
    } finally {
      setMovingThreadItemKey(null);
    }
  };

  const openMissionModalFromChat = (
    msg: MosChatMessage | null,
    task?: MosChatTaskItem | null,
    convIdOverride?: string
  ) => {
    if (!isStrictDannySuperAdmin) {
      return;
    }

    const targetConvId = convIdOverride || task?.conversationId || msg?.conversationId || activeConversation?.id || '';
    const targetConv = conversations.find((c) => c.id === targetConvId) || activeConversation;
    const resolvedMsg =
      msg ||
      (task?.sourceMessageId ? targetConv?.messages.find((m) => m.id === task.sourceMessageId) || null : null) ||
      (task ? targetConv?.messages.find((m) => m.taskId === task.id) || null : null);

    const existingMission = resolvedMsg?.mission || task?.mission;
    if (existingMission && resolvedMsg) {
      if (targetConvId && targetConvId !== activeConversation?.id) {
        selectConversation(targetConvId);
      }
      handleOpenThread(resolvedMsg.id);
      return;
    }

    const baseRaw = String(task?.title || resolvedMsg?.text || '').trim();
    const firstLine = (baseRaw.split('\n')[0] || 'Yêu cầu từ mOS Chat').trim().slice(0, 140);
    const lowerAll = `${baseRaw} ${(resolvedMsg?.thread || []).map((r) => r.text).join(' ')}`.toLowerCase();
    const isLikelyBug = /(lỗi|sai|hư|không bấm|không chạy|trắng trang|crash|500|404)/i.test(lowerAll);

    setMissionSourceMsg(resolvedMsg);
    setMissionSourceTask(task || null);
    setMissionSourceConvId(targetConvId);
    setMissionTitle(firstLine || 'Nâng cấp tính năng từ mOS Chat');
    setMissionType(isLikelyBug ? 'BUG' : 'FEATURE');
    setMissionNote('');
    setMissionModalOpen(true);
  };

  const handleConfirmDispatchMission = async () => {
    if (!isStrictDannySuperAdmin) {
      antdMessage.error('Chỉ Super Admin Danny mới có quyền gửi công việc vào mOS Mission.');
      return;
    }

    const convId = missionSourceConvId || activeConversation?.id || '';
    const msgId = missionSourceMsg?.id || missionSourceTask?.sourceMessageId || '';
    if (!convId || !msgId) {
      antdMessage.warning('Không tìm thấy tin nhắn gốc để đóng gói ngữ cảnh chuyển vào mOS Mission.');
      return;
    }

    setIsDispatchingMission(true);
    try {
      const res = await apiClient.chat.createMission({
        conversationId: convId,
        messageId: msgId,
        taskId: missionSourceTask?.id || missionSourceMsg?.taskId || null,
        title: missionTitle.trim() || undefined,
        type: missionType,
        note: missionNote.trim() || undefined,
        pageUrl: typeof window !== 'undefined' ? window.location.pathname : '/dashboard',
      });

      if (res?.mission) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            return {
              ...c,
              messages: c.messages.map((m) => (m.id === msgId ? res.message || { ...m, mission: res.mission } : m)),
            };
          })
        );
        if (res.task) {
          setTasks((prev) => prev.map((t) => (t.id === res.task?.id ? res.task : t)));
        }
        setMissionModalOpen(false);
        if (convId !== activeConversation?.id) {
          selectConversation(convId);
        }
        handleOpenThread(msgId);
        notifyLivePeers();
        antdMessage.success(
          `🚀 Đã chuyển vào mOS Mission #${res.mission.missionKey} (${res.mission.missionCode}) & duyệt Cổng 1!`
        );
      }
    } catch (err: SafeAny) {
      antdMessage.error(err?.response?.data?.message || err?.message || 'Không thể chuyển nhiệm vụ sang mOS Mission.');
    } finally {
      setIsDispatchingMission(false);
    }
  };

  const handleMissionInlineAction = async (
    mission: MosChatMissionSummary,
    action: MosChatMissionActionType,
    feedback?: string
  ) => {
    const loadingKey = `${mission.reportId}:${action}`;
    setMissionActionLoadingKey(loadingKey);
    try {
      const res = await apiClient.chat.missionAction(mission.reportId, {
        conversationId: mission.conversationId,
        messageId: mission.messageId,
        taskId: mission.taskId || null,
        action,
        feedback,
      });

      if (res?.mission) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== mission.conversationId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === mission.messageId ? res.message || { ...m, mission: res.mission } : m
              ),
            };
          })
        );
        if (res.task) {
          setTasks((prev) => prev.map((t) => (t.id === res.task?.id ? res.task : t)));
        } else if (action === 'REPORTER_ACCEPT' && mission.taskId) {
          setTasks((prev) =>
            prev.map((t) => (t.id === mission.taskId ? { ...t, done: true, mission: res.mission } : t))
          );
        }
        setMissionReopenInputOpenByReportId((prev) => ({ ...prev, [mission.reportId]: false }));
        setMissionReopenFeedbackByReportId((prev) => ({ ...prev, [mission.reportId]: '' }));
        notifyLivePeers();

        if (action === 'APPROVE_IMPLEMENTATION') {
          antdMessage.success(
            `🚀 Đã duyệt Cổng 1 & chuyển #${mission.missionKey} vào hàng đợi thực thi của mOS Mission!`
          );
        } else if (action === 'APPROVE_COMMIT') {
          antdMessage.success(`✅ Đã duyệt Commit (Cổng 2) cho #${mission.missionKey}!`);
        } else if (action === 'APPROVE_DEPLOY') {
          antdMessage.success(`🚀 Đã duyệt Deploy lên Web (Cổng 3) cho #${mission.missionKey}!`);
        } else if (action === 'REPORTER_ACCEPT') {
          antdMessage.success(`🎉 Đã xác nhận nghiệm thu #${mission.missionKey} & tự động hoàn tất Task!`);
        } else if (action === 'REPORTER_REOPEN') {
          antdMessage.info(
            `🔄 Đã ghi nhận yêu cầu nâng cấp / chỉnh thêm trên #${mission.missionKey} (chờ anh Danny duyệt Cổng 1 mOS Mission)!`
          );
        }
      }
    } catch (err: SafeAny) {
      antdMessage.error(
        err?.response?.data?.message || err?.message || 'Không thể thực thi thao tác trên mOS Mission.'
      );
    } finally {
      setMissionActionLoadingKey(null);
    }
  };

  const renderLiveMissionCard = (
    mission: MosChatMissionSummary,
    msg?: MosChatMessage | null,
    mode: 'thread' | 'inline' | 'task' | 'embedded' = 'inline'
  ) => {
    const stageColors: Record<
      MosChatMissionSummary['stage'],
      { accent: string; bg: string; border: string; badgeBg: string }
    > = {
      RECEIVED: {
        accent: '#60a5fa',
        bg: isDark ? 'rgba(30, 58, 138, 0.18)' : 'rgba(239, 246, 255, 0.92)',
        border: 'rgba(59, 130, 246, 0.38)',
        badgeBg: 'rgba(59, 130, 246, 0.16)',
      },
      NEEDS_INFO: {
        accent: '#f59e0b',
        bg: isDark ? 'rgba(120, 53, 15, 0.2)' : 'rgba(255, 251, 235, 0.95)',
        border: 'rgba(245, 158, 11, 0.45)',
        badgeBg: 'rgba(245, 158, 11, 0.18)',
      },
      BUILDING: {
        accent: '#a78bfa',
        bg: isDark ? 'rgba(76, 29, 149, 0.18)' : 'rgba(245, 243, 255, 0.95)',
        border: 'rgba(139, 92, 246, 0.4)',
        badgeBg: 'rgba(139, 92, 246, 0.16)',
      },
      AWAITING_RELEASE: {
        accent: '#d4a84b',
        bg: isDark ? 'rgba(120, 83, 15, 0.2)' : 'rgba(254, 249, 195, 0.45)',
        border: 'rgba(212, 168, 75, 0.5)',
        badgeBg: 'rgba(212, 168, 75, 0.2)',
      },
      READY_FOR_REVIEW: {
        accent: '#10b981',
        bg: isDark ? 'rgba(6, 78, 59, 0.22)' : 'rgba(236, 253, 245, 0.95)',
        border: 'rgba(16, 185, 129, 0.48)',
        badgeBg: 'rgba(16, 185, 129, 0.18)',
      },
      COMPLETED: {
        accent: '#10b981',
        bg: isDark ? 'rgba(6, 78, 59, 0.14)' : 'rgba(240, 253, 244, 0.85)',
        border: 'rgba(16, 185, 129, 0.35)',
        badgeBg: 'rgba(16, 185, 129, 0.14)',
      },
      NOT_PROCEEDING: {
        accent: '#94a3b8',
        bg: isDark ? 'rgba(30, 41, 59, 0.28)' : 'rgba(248, 250, 252, 0.92)',
        border: 'rgba(148, 163, 184, 0.4)',
        badgeBg: 'rgba(148, 163, 184, 0.16)',
      },
    };

    const palette = stageColors[mission.stage] || stageColors.RECEIVED;
    const steps = [
      { idx: 1, label: '1. Tiếp nhận' },
      { idx: 2, label: '2. Đang xử lý' },
      { idx: 3, label: '3. Nghiệm thu' },
      { idx: 4, label: '4. Hoàn tất' },
    ];
    const isReopenOpen = Boolean(missionReopenInputOpenByReportId[mission.reportId]);
    const reopenText = missionReopenFeedbackByReportId[mission.reportId] || '';
    const canApproveImplementation = Boolean(mission.superAdminActions?.canApproveImplementation);
    const canRequestUpgradeOrRework =
      mission.canReporterAccept || Boolean(mission.reporterActions?.canAcceptOrReopen) || mission.stage === 'COMPLETED';

    return (
      <div
        data-no-chat-autofocus="true"
        onClick={(e) => e.stopPropagation()}
        className={`rounded-xl ${mode === 'embedded' ? 'p-2 mt-1' : 'p-2.5'} text-left space-y-2 transition-all ${
          mode === 'inline' ? 'mt-1.5 w-full max-w-[88%]' : 'w-full'
        }`}
        style={{
          background: mode === 'embedded' ? (isDark ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.6)') : palette.bg,
          border: `1px solid ${palette.border}`,
          borderLeft: `3.5px solid ${palette.accent}`,
        }}
      >
        {/* Top Header Row: Mission Code + Stage Pill + Link to mOS Mission */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span
              className="inline-flex items-center justify-center leading-none gap-1 px-2 py-1 rounded-md text-[10.5px] font-extrabold tracking-tight"
              style={{
                background: 'rgba(212, 168, 75, 0.2)',
                color: '#d4a84b',
                border: '1px solid rgba(212, 168, 75, 0.4)',
              }}
            >
              <Rocket size={11} />
              <span>mOS MISSION · #{mission.missionKey}</span>
            </span>
            <span
              className="inline-flex items-center justify-center leading-none px-2 py-1 rounded-md text-[10.5px] font-bold"
              style={{
                background: palette.badgeBg,
                color: palette.accent,
              }}
            >
              {mission.stageLabel}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {mode !== 'thread' && mode !== 'embedded' && msg && (
              <Tooltip title="Mở luồng trao đổi & theo dõi tiến độ mOS Mission">
                <button
                  type="button"
                  onClick={() => {
                    if (mission.conversationId && mission.conversationId !== activeConversation?.id) {
                      selectConversation(mission.conversationId);
                    }
                    handleOpenThread(msg.id);
                  }}
                  className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[10.5px] font-bold cursor-pointer hover:opacity-90"
                  style={{
                    background: surfaceRaised,
                    border: `1px solid ${borderColor}`,
                    color: token.colorText,
                  }}
                >
                  <MessageSquareReply size={11} className="text-amber-400" />
                  <span>Luồng</span>
                </button>
              </Tooltip>
            )}
            <Tooltip title="Xem chi tiết kỹ thuật trên bảng điều khiển mOS Mission">
              <a
                href={`/dashboard/bug-reports?reportId=${mission.reportId}`}
                onClick={(e) => e.stopPropagation()}
                className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[10.5px] font-bold no-underline hover:opacity-90"
                style={{
                  background: surfaceRaised,
                  border: `1px solid ${borderColor}`,
                  color: '#d4a84b',
                }}
              >
                <span>{mission.missionCode}</span>
                <ExternalLink size={10} />
              </a>
            </Tooltip>
          </div>
        </div>

        {/* Mission Title (omitted in embedded mode) */}
        {mode !== 'embedded' && (
          <div className="text-[12.5px] font-extrabold leading-snug" style={{ color: token.colorText }}>
            {mission.title}
          </div>
        )}

        {/* 4-Step Human Progress Bar */}
        <div className="grid grid-cols-4 gap-1 pt-0.5">
          {steps.map((s) => {
            const active = mission.stepIndex >= s.idx;
            const current = mission.stepIndex === s.idx;
            return (
              <div key={s.idx} className="space-y-1">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    background: active ? palette.accent : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)',
                    boxShadow: current ? `0 0 8px ${palette.accent}` : 'none',
                  }}
                />
                <div
                  className="text-[9.5px] font-bold truncate tabular-nums"
                  style={{
                    color: active ? palette.accent : token.colorTextSecondary,
                    opacity: active ? 1 : 0.65,
                  }}
                >
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Plain Human Language Explanation for Staff & Super Admin */}
        <div
          className="text-[11.5px] leading-relaxed rounded-lg px-2.5 py-1.5"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.78)',
            border: `1px solid ${borderColor}`,
            color: token.colorText,
          }}
        >
          {mission.humanStatusSummary}
        </div>

        {/* Super Admin Inline Gate Controls (Gate 1 Implementation, Gate 2 Commit & Gate 3 Deploy) */}
        {isStrictDannySuperAdmin &&
          (canApproveImplementation || mission.canSuperAdminApproveCommit || mission.canSuperAdminApproveDeploy) && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {canApproveImplementation && (
                <button
                  type="button"
                  disabled={missionActionLoadingKey === `${mission.reportId}:APPROVE_IMPLEMENTATION`}
                  onClick={() => void handleMissionInlineAction(mission, 'APPROVE_IMPLEMENTATION')}
                  className="h-7 px-3 rounded-lg text-[11.5px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                    color: '#fff',
                  }}
                >
                  {missionActionLoadingKey === `${mission.reportId}:APPROVE_IMPLEMENTATION` ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Rocket size={13} />
                  )}
                  <span>Duyệt nâng cấp tiếp · Cổng 1 (mOS Mission)</span>
                </button>
              )}

              {mission.canSuperAdminApproveCommit && (
                <button
                  type="button"
                  disabled={missionActionLoadingKey === `${mission.reportId}:APPROVE_COMMIT`}
                  onClick={() => void handleMissionInlineAction(mission, 'APPROVE_COMMIT')}
                  className="h-7 px-3 rounded-lg text-[11.5px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  style={{
                    background: '#d4a84b',
                    color: '#000',
                  }}
                >
                  {missionActionLoadingKey === `${mission.reportId}:APPROVE_COMMIT` ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={13} />
                  )}
                  <span>✅ Duyệt Commit (Cổng 2)</span>
                </button>
              )}

              {mission.canSuperAdminApproveDeploy && (
                <button
                  type="button"
                  disabled={missionActionLoadingKey === `${mission.reportId}:APPROVE_DEPLOY`}
                  onClick={() => void handleMissionInlineAction(mission, 'APPROVE_DEPLOY')}
                  className="h-7 px-3 rounded-lg text-[11.5px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  style={{
                    background: '#10b981',
                    color: '#000',
                  }}
                >
                  {missionActionLoadingKey === `${mission.reportId}:APPROVE_DEPLOY` ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Rocket size={13} />
                  )}
                  <span>🚀 Duyệt Deploy lên Web (Cổng 3)</span>
                </button>
              )}
            </div>
          )}

        {/* Reporter / Staff & Super Admin Inline Acceptance & Subthread Upgrade Controls */}
        {canRequestUpgradeOrRework && (
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {mission.canReporterAccept && (
                <button
                  type="button"
                  disabled={missionActionLoadingKey === `${mission.reportId}:REPORTER_ACCEPT`}
                  onClick={() => void handleMissionInlineAction(mission, 'REPORTER_ACCEPT')}
                  className="h-7 px-3 rounded-lg text-[11.5px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  style={{
                    background: '#10b981',
                    color: '#000',
                  }}
                >
                  {missionActionLoadingKey === `${mission.reportId}:REPORTER_ACCEPT` ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Check size={13} strokeWidth={3} />
                  )}
                  <span>✅ Đã đúng ý (Hoàn tất)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setMissionReopenInputOpenByReportId((prev) => ({
                    ...prev,
                    [mission.reportId]: !prev[mission.reportId],
                  }))
                }
                className="h-7 px-2.5 rounded-lg text-[11.5px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                style={{
                  background: surfaceRaised,
                  border: `1px solid ${borderStrong}`,
                  color: mission.stage === 'COMPLETED' ? '#a78bfa' : '#f59e0b',
                }}
              >
                <RefreshCw size={12} />
                <span>{mission.stage === 'COMPLETED' ? '✨ Nâng cấp / Chỉnh thêm' : '🔄 Cần chỉnh thêm'}</span>
              </button>
            </div>

            {isReopenOpen && (
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={reopenText}
                  onChange={(e) =>
                    setMissionReopenFeedbackByReportId((prev) => ({
                      ...prev,
                      [mission.reportId]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && reopenText.trim()) {
                      e.preventDefault();
                      void handleMissionInlineAction(mission, 'REPORTER_REOPEN', reopenText.trim());
                    }
                  }}
                  placeholder={
                    mission.stage === 'COMPLETED'
                      ? 'Nhập nội dung cần nâng cấp tiếp trong luồng này (chờ anh Danny duyệt Cổng 1 mOS Mission)...'
                      : 'Nhập điểm cần điều chỉnh thêm (VD: Thêm cột tổng số buổi còn lại)...'
                  }
                  className="flex-1 h-7 px-2.5 rounded-lg text-[11.5px] outline-none"
                  style={{
                    background: surfaceBg,
                    border: `1px solid ${borderStrong}`,
                    color: token.colorText,
                  }}
                />
                <button
                  type="button"
                  disabled={!reopenText.trim() || missionActionLoadingKey === `${mission.reportId}:REPORTER_REOPEN`}
                  onClick={() => void handleMissionInlineAction(mission, 'REPORTER_REOPEN', reopenText.trim())}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer disabled:opacity-50 shrink-0"
                  style={{
                    background: mission.stage === 'COMPLETED' ? '#8b5cf6' : '#f59e0b',
                    color: mission.stage === 'COMPLETED' ? '#fff' : '#000',
                  }}
                >
                  Gửi đề xuất
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTaskCard = (
    task: MosChatTaskItem,
    sourceMsg?: MosChatMessage | null,
    mode: 'inline' | 'list' | 'thread' = 'inline'
  ) => {
    const isDone = Boolean(task.done);
    const deadlineInfo = getTaskDeadlineInfo(task.deadline, isDone);
    const hasNegotiation = Boolean(task.negotiatedDeadline);
    const taskCode = `#TASK-${
      (task.id || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(-5)
        .toUpperCase() || 'CHAT'
    }`;

    // Priority pill styling
    let priorityBg = 'rgba(59, 130, 246, 0.15)';
    let priorityColor = '#60a5fa';
    let priorityBorder = 'rgba(59, 130, 246, 0.35)';
    let priorityCode = 'P2';
    let priorityLabel = 'P2 · Thường';

    if (task.priority === 'URGENT') {
      priorityBg = 'rgba(239, 68, 68, 0.18)';
      priorityColor = '#f87171';
      priorityBorder = 'rgba(239, 68, 68, 0.4)';
      priorityCode = 'P0';
      priorityLabel = 'P0 · Khẩn cấp';
    } else if (task.priority === 'HIGH') {
      priorityBg = 'rgba(245, 158, 11, 0.18)';
      priorityColor = '#fbbf24';
      priorityBorder = 'rgba(245, 158, 11, 0.4)';
      priorityCode = 'P1';
      priorityLabel = 'P1 · Quan trọng';
    }

    const isCreator = Boolean(
      task.creatorName && currentUser?.displayName && task.creatorName === currentUser.displayName
    );
    const canApproveNegotiation = isCreator || isStrictDannySuperAdmin;
    const taskConv = conversations.find((c) => c.id === task.conversationId);
    const taskMission = task.mission || sourceMsg?.mission || null;
    const threadReplyCount = sourceMsg?.thread?.length || 0;

    return (
      <div
        key={task.id}
        className={`group/task relative rounded-xl transition-all ${
          mode === 'inline' ? 'mt-2 max-w-[92%]' : 'w-full'
        } p-3 space-y-2 text-left`}
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255, 255, 255, 0.95)',
          border: `1.5px solid ${
            isDone
              ? 'rgba(16, 185, 129, 0.3)'
              : deadlineInfo?.isOverdue
                ? 'rgba(239, 68, 68, 0.45)'
                : isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.08)'
          }`,
          boxShadow: isDark ? '0 3px 12px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(15, 23, 42, 0.05)',
          opacity: isDone ? 0.75 : 1,
        }}
      >
        {/* Header: Done Checkbox + Task Code + Space Badge + Priority Icon + Overdue Badge + Thread Button */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {/* Minimalist Circular Done Checkbox */}
            <Tooltip title={isDone ? 'Mở lại công việc' : 'Đánh dấu hoàn thành'}>
              <button
                type="button"
                aria-label={isDone ? 'Mở lại công việc' : 'Đánh dấu hoàn thành'}
                onClick={() => handleToggleTaskDone(task.id)}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isDone
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'border border-slate-500/40 hover:border-emerald-500 hover:bg-emerald-500/10 text-transparent hover:text-emerald-500'
                }`}
              >
                <Check size={11} strokeWidth={isDone ? 3 : 2} />
              </button>
            </Tooltip>

            {/* Task Code */}
            <span className="font-mono text-[10.5px] font-black tracking-wider uppercase tabular-nums text-slate-400 select-all">
              {taskCode}
            </span>

            {/* Space / Conversation Badge with quick switch */}
            {taskConv && (
              <Tooltip title={`Thuộc không gian: ${taskConv.name} · Nhấp để mở hội thoại`}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (task.conversationId && task.conversationId !== activeConversation?.id) {
                      selectConversation(task.conversationId);
                    }
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all hover:opacity-85"
                  style={{
                    background:
                      taskConv.type === 'space'
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.15)'
                          : '#eff6ff'
                        : isDark
                          ? 'rgba(168, 85, 247, 0.15)'
                          : '#faf5ff',
                    color:
                      taskConv.type === 'space' ? (isDark ? '#93c5fd' : '#2563eb') : isDark ? '#c084fc' : '#7e22ce',
                  }}
                >
                  {taskConv.type === 'space' ? <Hash size={9} /> : <MessageSquare size={9} />}
                  <span className="truncate max-w-[110px]">
                    {taskConv.name || task.conversationName || 'Hội thoại'}
                  </span>
                </button>
              </Tooltip>
            )}

            {/* Priority Flag Icon Pill */}
            <Tooltip title={`Mức ưu tiên: ${priorityLabel}`}>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold cursor-default"
                style={{
                  background: priorityBg,
                  color: priorityColor,
                  border: `1px solid ${priorityBorder}`,
                }}
              >
                <Flag size={9} fill={priorityColor} />
                <span>{priorityCode}</span>
              </span>
            </Tooltip>

            {/* Checklist progress pill */}
            {task.checklist &&
              task.checklist.length > 0 &&
              (() => {
                const chkTotal = task.checklist.length;
                const chkDone = task.checklist.filter((c) => c.done).length;
                const isAllDone = chkDone === chkTotal;
                return (
                  <Tooltip title={`Tiến độ checklist: ${chkDone}/${chkTotal} việc hoàn thành`}>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums cursor-default ${
                        isAllDone
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      <ListTodo size={9} />
                      <span>
                        {chkDone}/{chkTotal}
                      </span>
                    </span>
                  </Tooltip>
                );
              })()}

            {/* Overdue alert badge */}
            {deadlineInfo?.isOverdue && !isDone && (
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase tracking-wide bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                QUÁ HẠN
              </span>
            )}

            {task.archived && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                Lưu trữ
              </span>
            )}
          </div>

          {/* Header Right: Instant Reply Thread Button with auto-focus */}
          <div className="flex items-center gap-1.5 shrink-0">
            {mode !== 'thread' && (sourceMsg || task.sourceMessageId || task.conversationId) && (
              <Tooltip title="Mở luồng trao đổi & gõ phản hồi tức thì">
                <button
                  type="button"
                  onClick={() => {
                    const targetConvId = task.conversationId;
                    if (targetConvId && targetConvId !== activeConversation?.id) {
                      selectConversation(targetConvId);
                    }
                    const msgId = sourceMsg?.id || task.sourceMessageId;
                    if (msgId) {
                      handleOpenThread(msgId, targetConvId, { autoFocus: true });
                    }
                  }}
                  className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[10.5px] font-bold cursor-pointer transition-all hover:bg-amber-500/15 text-slate-300 hover:text-amber-400"
                  style={{
                    background: surfaceRaised,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <MessageSquareReply size={12} className="text-amber-400" />
                  {threadReplyCount > 0 ? (
                    <span className="text-[10px] tabular-nums font-bold text-amber-400">{threadReplyCount}</span>
                  ) : (
                    <span className="text-[10px] opacity-80">Luồng</span>
                  )}
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Task Title */}
        <div
          className={`text-[13px] font-semibold leading-snug ${isDone ? 'line-through opacity-65' : ''}`}
          style={{ color: token.colorText }}
        >
          {task.title}
        </div>

        {/* Assignee-centric & Meta Row (People + Deadline) */}
        {(() => {
          const creator = task.sourceAuthorName || task.creatorName || 'Hệ thống';
          const assigner = task.assignerName || task.creatorName || task.sourceAuthorName || 'Hệ thống';
          const assignee = task.assigneeName || 'Chung';
          const isSelfAssigned = creator === assignee && assigner === assignee;

          return (
            <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] pt-0.5">
              {/* Left: Assignee + Sender */}
              <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
                <div className="flex items-center gap-1.5" title={`Người nhận việc: ${assignee}`}>
                  {renderUserAvatarNode({
                    staffId: task.assigneeId,
                    name: assignee,
                    sizeClass: 'w-[18px] h-[18px]',
                    textSizeClass: 'text-[8.5px]',
                    roundedClass: 'rounded-full',
                    bgColor: '#d97706',
                  })}
                  <span className="font-semibold text-amber-400 truncate max-w-[130px]">{assignee}</span>
                </div>

                {!isSelfAssigned && (
                  <span
                    className="text-[10.5px] text-slate-400 opacity-75 truncate max-w-[110px]"
                    title={`Giao bởi: ${assigner}`}
                  >
                    từ {assigner}
                  </span>
                )}
              </div>

              {/* Right: Deadline & Reminder */}
              <div className="flex items-center gap-1.5 shrink-0">
                {deadlineInfo ? (
                  <Tooltip title={`Hạn chót: ${dayjs(task.deadline).format('HH:mm DD/MM/YYYY')}`}>
                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold tabular-nums"
                      style={{
                        background: isDone
                          ? 'rgba(16, 185, 129, 0.12)'
                          : deadlineInfo.isOverdue
                            ? 'rgba(239, 68, 68, 0.16)'
                            : deadlineInfo.isDueSoon
                              ? 'rgba(245, 158, 11, 0.16)'
                              : isDark
                                ? 'rgba(139, 92, 246, 0.12)'
                                : '#f5f3ff',
                        color: isDone
                          ? '#10b981'
                          : deadlineInfo.isOverdue
                            ? '#ef4444'
                            : deadlineInfo.isDueSoon
                              ? '#f59e0b'
                              : '#8b5cf6',
                        border: `1px solid ${
                          isDone
                            ? 'rgba(16, 185, 129, 0.3)'
                            : deadlineInfo.isOverdue
                              ? 'rgba(239, 68, 68, 0.35)'
                              : deadlineInfo.isDueSoon
                                ? 'rgba(245, 158, 11, 0.35)'
                                : 'rgba(139, 92, 246, 0.35)'
                        }`,
                      }}
                    >
                      <CalendarClock size={11} className="shrink-0" />
                      <span>{deadlineInfo.relative}</span>
                    </div>
                  </Tooltip>
                ) : (
                  !isDone && (
                    <Tooltip title="Đặt hạn chót cho công việc">
                      <button
                        type="button"
                        onClick={() => openEditTaskModal(task)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/10"
                      >
                        <CalendarClock size={11} className="opacity-60" />
                        <span className="opacity-75">Đặt hạn</span>
                      </button>
                    </Tooltip>
                  )
                )}

                {task.remindAt && !isDone && (
                  <Tooltip title={`Nhắc hẹn: ${dayjs(task.remindAt).format('HH:mm DD/MM')}`}>
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 tabular-nums">
                      <Bell size={10} />
                      <LiveTaskCountdownBadge remindAt={task.remindAt} />
                    </div>
                  </Tooltip>
                )}
              </div>
            </div>
          );
        })()}

        {/* Embedded mOS Mission Section (Unified Card - avoids duplicated cards and titles) */}
        {taskMission && (
          <div className="pt-0.5">{renderLiveMissionCard(taskMission, sourceMsg || null, 'embedded')}</div>
        )}

        {/* Negotiation Banner (if negotiatedDeadline is pending) */}
        {hasNegotiation && !isDone && (
          <div
            className="p-2.5 rounded-xl text-left space-y-2"
            style={{
              background: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb',
              border: '1.5px dashed rgba(245, 158, 11, 0.5)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-amber-500 font-extrabold text-[11.5px]">
                <Handshake size={14} className="shrink-0" />
                <span>Đề xuất thương lượng dời hạn chót</span>
              </div>
              <span className="text-[10px] text-slate-400 tabular-nums">
                {task.negotiatedAt ? dayjs(task.negotiatedAt).format('HH:mm DD/MM') : ''}
              </span>
            </div>

            <div className="text-[11.5px] space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-slate-400">Đề xuất hạn mới:</span>
                <span className="font-extrabold text-amber-400 tabular-nums">
                  {dayjs(task.negotiatedDeadline).format('HH:mm DD/MM/YYYY')}
                </span>
                {(() => {
                  const relText = formatRelativeTime(task.negotiatedDeadline);
                  if (!relText) return null;
                  return <span className="text-[10px] text-amber-500 font-semibold">({relText})</span>;
                })()}
              </div>
              {task.negotiationNote && (
                <div className="text-slate-300 italic bg-black/20 p-1.5 rounded-lg text-[11px] leading-relaxed">
                  &ldquo;{task.negotiationNote}&rdquo;
                </div>
              )}
              <div className="text-[10.5px] text-slate-400">
                Bởi: <span className="font-semibold text-slate-300">{task.negotiatedBy || 'Người nhận task'}</span>
              </div>
            </div>

            {/* Negotiation approval buttons */}
            <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
              {canApproveNegotiation ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAcceptNegotiatedDeadline(task)}
                    className="h-6 px-2.5 rounded-lg text-[10.5px] font-extrabold inline-flex items-center gap-1 cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                  >
                    <Check size={12} strokeWidth={3} />
                    <span>Duyệt dời hạn</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectNegotiatedDeadline(task)}
                    className="h-6 px-2.5 rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
                  >
                    <X size={12} />
                    <span>Từ chối</span>
                  </button>
                </div>
              ) : (
                <span className="text-[10.5px] text-amber-400 italic">
                  Đang chờ người giao ({task.creatorName || 'người tạo'}) xét duyệt...
                </span>
              )}
            </div>
          </div>
        )}

        {/* Card Actions Footer: Icon-first buttons */}
        <div className="pt-1 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {!isDone && (
              <Tooltip title={hasNegotiation ? 'Sửa đề xuất dời hạn' : 'Xin dời hạn chót'}>
                <button
                  type="button"
                  onClick={() => handleOpenNegotiateModal(task)}
                  className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[10.5px] font-bold cursor-pointer transition-all hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  style={{
                    background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fef3c7',
                  }}
                >
                  <Handshake size={12} />
                  <span>{hasNegotiation ? 'Đề xuất hạn' : 'Dời hạn'}</span>
                </button>
              </Tooltip>
            )}

            {isStrictDannySuperAdmin && !taskMission && (
              <Tooltip title="Chuyển công việc này thành mOS Mission">
                <button
                  type="button"
                  onClick={() => openMissionModalFromChat(sourceMsg || null, task, task.conversationId)}
                  className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[10.5px] font-bold cursor-pointer transition-all hover:opacity-90 shrink-0 whitespace-nowrap text-white"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  }}
                >
                  <Rocket size={11} />
                  <span>mOS Mission</span>
                </button>
              </Tooltip>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Tooltip title="Chỉnh sửa công việc">
              <button
                type="button"
                aria-label="Chỉnh sửa công việc"
                onClick={() => openEditTaskModal(task)}
                className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10 text-amber-400"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                <Pencil size={11} />
              </button>
            </Tooltip>

            <Tooltip title={task.archived ? 'Khôi phục công việc' : 'Lưu trữ công việc'}>
              <button
                type="button"
                aria-label={task.archived ? 'Khôi phục công việc' : 'Lưu trữ công việc'}
                onClick={() => handleToggleArchiveTask(task.id, !task.archived)}
                className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                {task.archived ? (
                  <ArchiveRestore size={11} className="text-emerald-400" />
                ) : (
                  <Archive size={11} className="text-slate-400" />
                )}
              </button>
            </Tooltip>

            <Popconfirm
              title="Xoá vĩnh viễn công việc này?"
              description="Bạn có chắc chắn muốn xoá task này không?"
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDeleteTask(task.id)}
            >
              <Tooltip title="Xoá task">
                <button
                  type="button"
                  aria-label="Xoá task"
                  className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-rose-500/20 text-rose-400"
                  style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                >
                  <Trash2 size={11} />
                </button>
              </Tooltip>
            </Popconfirm>

            <Tooltip title="Thử chuông nhắc hẹn">
              <button
                type="button"
                aria-label="Thử chuông nhắc hẹn"
                onClick={() => triggerTaskReminderAlert(task)}
                className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10 text-amber-400"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                <BellRing size={11} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  };

  const openLightbox = useCallback((attachments: MosChatImageAttachment[], initialIndex = 0) => {
    if (!attachments || attachments.length === 0) return;
    const normalized = attachments.map((att, idx) => ({
      id: att.id || `img-${idx}`,
      url: resolveMediaUrl(att.url),
      name: att.name || `Hình đính kèm ${idx + 1}`,
    }));
    const safeIdx = Math.max(0, Math.min(initialIndex, normalized.length - 1));
    setLightboxImage({
      items: normalized,
      currentIndex: safeIdx,
      zoom: 1,
      rotate: 0,
    });
  }, []);

  const renderMessageAttachments = (attachments?: MosChatImageAttachment[], compact = false, isMine = false) => {
    if (!attachments || attachments.length === 0) return null;
    const images = attachments.filter(isImageAttachment);
    const files = attachments.filter((att) => !isImageAttachment(att));
    const totalImages = images.length;

    return (
      <div className={`mt-1.5 flex flex-col gap-2 ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Document & File Attachments (PDF, Excel, Word, ZIP...) */}
        {files.length > 0 && (
          <div className={`flex flex-wrap gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {files.map((att) => {
              const fullUrl = resolveMediaUrl(att.url);
              const ext = getFileExtension(att.name || att.url).toLowerCase();
              const isPdf = ext === 'pdf' || att.mimeType === 'application/pdf';
              const isExcel = ['xls', 'xlsx', 'csv'].includes(ext);
              const isWord = ['doc', 'docx'].includes(ext);
              const isZip = ['zip', 'rar', '7z'].includes(ext);

              return (
                <div
                  key={att.id}
                  onClick={() => window.open(fullUrl, '_blank')}
                  className="flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md select-none group/file"
                  style={{
                    background: surfaceRaised,
                    borderColor: borderStrong,
                    maxWidth: compact ? 220 : 320,
                    minWidth: compact ? 180 : 240,
                  }}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs shadow-sm ${
                      isPdf
                        ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                        : isExcel
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                          : isWord
                            ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                            : isZip
                              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                              : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                    }`}
                  >
                    {isPdf ? (
                      <FileText size={20} className="text-rose-500" />
                    ) : isExcel ? (
                      <FileSpreadsheet size={20} className="text-emerald-500" />
                    ) : isWord ? (
                      <FileText size={20} className="text-blue-500" />
                    ) : isZip ? (
                      <FileArchive size={20} className="text-amber-500" />
                    ) : (
                      <File size={20} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-semibold truncate group-hover/file:text-amber-400 transition-colors"
                      title={att.name}
                      style={{ color: token.colorText }}
                    >
                      {att.name}
                    </p>
                    <div
                      className="flex items-center gap-2 mt-0.5 text-[10.5px]"
                      style={{ color: token.colorTextSecondary }}
                    >
                      <span
                        className="uppercase font-extrabold tracking-wider text-[9px] px-1 py-0.2 rounded"
                        style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                      >
                        {ext.toUpperCase()}
                      </span>
                      {att.sizeBytes > 0 && <span className="tabular-nums">{formatFileSize(att.sizeBytes)}</span>}
                    </div>
                  </div>
                  <Tooltip title="Mở / Tải về tệp này">
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={att.name}
                      onClick={(e) => e.stopPropagation()}
                      className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
                      style={{ color: token.colorTextSecondary }}
                    >
                      <Download size={14} />
                    </a>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}

        {/* Image Attachments */}
        {images.length > 0 && (
          <div className={`flex flex-wrap gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {images.map((att, idx) => {
              const fullUrl = resolveMediaUrl(att.url);
              return (
                <Tooltip
                  key={att.id}
                  title={
                    totalImages > 1
                      ? `Nhấn để phóng to (${idx + 1}/${totalImages} · Dùng phím ← → để chuyển hình)`
                      : 'Nhấn để phóng to xem chi tiết'
                  }
                >
                  <button
                    type="button"
                    data-no-chat-autofocus="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLightbox(images, idx);
                    }}
                    className="relative rounded-xl overflow-hidden group/img cursor-zoom-in text-left block p-0"
                    style={{
                      border: `1px solid ${borderStrong}`,
                      background: surfaceRaised,
                      maxWidth: compact ? 180 : 280,
                    }}
                  >
                    <img
                      src={fullUrl}
                      alt={att.name || 'Hình đính kèm'}
                      style={{
                        maxHeight: compact ? 120 : 200,
                        maxWidth: compact ? 180 : 280,
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <span className="opacity-0 group-hover/img:opacity-100 transition-opacity absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none">
                      <span
                        className="w-8 h-8 rounded-full inline-flex items-center justify-center shadow-lg"
                        style={{
                          background: 'rgba(15, 23, 42, 0.88)',
                          color: '#fbbf24',
                          border: '1px solid rgba(251, 191, 36, 0.45)',
                        }}
                      >
                        <ZoomIn size={15} />
                      </span>
                    </span>
                    {totalImages > 1 && (
                      <span
                        className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-extrabold tabular-nums pointer-events-none"
                        style={{
                          background: 'rgba(15, 23, 42, 0.82)',
                          color: '#f8fafc',
                          border: '1px solid rgba(255, 255, 255, 0.16)',
                        }}
                      >
                        {idx + 1}/{totalImages}
                      </span>
                    )}
                    {att.source === 'drive' && (
                      <span
                        className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold inline-flex items-center gap-1 pointer-events-none"
                        style={{ background: 'rgba(15, 23, 42, 0.82)', color: '#fbbf24' }}
                      >
                        <HardDrive size={10} />
                        <span>Drive</span>
                      </span>
                    )}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Trích xuất các tên nhân sự nhiều từ (có khoảng trắng) để tạo pattern khớp chính xác tên, không nuốt từ tiếp theo
  const knownMultiWordStaffNames = useMemo(() => {
    const set = new Set<string>();
    staffDirectory.forEach((s) => {
      if (s.displayName && s.displayName.includes(' ')) set.add(s.displayName.trim());
      const extraName = (s as SafeAny).realName || (s as SafeAny).nickname;
      if (typeof extraName === 'string' && extraName.includes(' ')) set.add(extraName.trim());
    });
    if (activeConversation?.memberNicknames) {
      Object.values(activeConversation.memberNicknames).forEach((nick) => {
        if (nick && nick.includes(' ')) set.add(nick.trim());
      });
    }
    return Array.from(set).sort((a, b) => b.length - a.length);
  }, [staffDirectory, activeConversation?.memberNicknames]);

  // Tổng hợp toàn bộ biệt danh từ mọi không gian (conversations) và không gian hiện tại để nhận diện tag chuẩn xác
  const allSpaceNicknames = useMemo(() => {
    const map: Record<string, string> = {};
    conversations.forEach((c) => {
      if (c.memberNicknames) {
        Object.assign(map, c.memberNicknames);
      }
    });
    if (activeConversation?.memberNicknames) {
      Object.assign(map, activeConversation.memberNicknames);
    }
    return map;
  }, [conversations, activeConversation?.memberNicknames]);

  /**
   * Bộ Renderer chuẩn Rich Text / Markdown / HTML cho bong bóng chat và thread/subthread:
   * Hỗ trợ toàn diện bảng biểu Markdown, thẻ HTML (<br>, <b>, <i>, <u>, <table>...), Headings, KaTeX, Mermaid.
   */
  const renderRichTextMessage = useCallback(
    (rawText?: string | null, _isMine = false): React.ReactNode => {
      if (!rawText) return null;
      return (
        <MosChatRichText
          content={rawText}
          isMe={_isMine}
          isDark={isDark}
          staffDirectory={staffDirectory}
          memberNicknames={allSpaceNicknames}
          currentUser={currentUser}
        />
      );
    },
    [isDark, staffDirectory, allSpaceNicknames, currentUser]
  );

  /**
   * Áp dụng cú pháp định dạng CKEditor / Quick-Type vào textarea tại vị trí con trỏ chuột.
   * Hỗ trợ bật/tắt (toggle) thông minh cho dấu đầu dòng (•), đánh số (1.), việc cần làm (- [ ]),
   * và đặt con trỏ ngay chính giữa cặp định dạng (**|**, *|*, <u>|</u>, ~~|~~) để gõ nhanh không vướng chữ thừa.
   */
  const handleApplyFormat = useCallback(
    (
      formatType:
        | 'bold'
        | 'italic'
        | 'strike'
        | 'underline'
        | 'color'
        | 'h1'
        | 'h2'
        | 'h3'
        | 'todo'
        | 'bullet'
        | 'number'
        | 'quote'
        | 'code'
        | 'codeblock'
        | 'table'
        | 'link'
        | 'divider'
        | 'mermaid'
        | 'math'
        | 'clear',
      scope: 'main' | 'thread',
      customColorHex?: string
    ) => {
      const textarea = scope === 'main' ? composerInputRef.current : threadInputRef.current;
      const currentValue = scope === 'main' ? composerTextRef.current : threadInput;
      const setValue = scope === 'main' ? updateComposerText : setThreadInput;
      const setCursor = scope === 'main' ? setComposerCursorPos : setThreadCursorPos;

      if (!textarea) return;

      const start = textarea.selectionStart ?? currentValue.length;
      const end = textarea.selectionEnd ?? currentValue.length;
      const selectedText = currentValue.substring(start, end);

      const toggleLinePrefixInComposer = (targetPrefix: string, stripPattern: RegExp) => {
        const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
        const nextNewline = currentValue.indexOf('\n', start);
        const lineEnd = nextNewline === -1 ? currentValue.length : nextNewline;

        const beforeLine = currentValue.substring(0, lineStart);
        const currentLine = currentValue.substring(lineStart, lineEnd);
        const afterLine = currentValue.substring(lineEnd);

        let updatedLine: string;
        let delta = 0;

        if (stripPattern.test(currentLine)) {
          updatedLine = currentLine.replace(stripPattern, '');
          delta = updatedLine.length - currentLine.length;
        } else {
          const cleanedLine = currentLine.replace(/^(?:-\s\[[ xX]\]\s|[•\-*]\s|\d+\.\s|>\s|#{1,3}\s)/, '');
          updatedLine = `${targetPrefix}${cleanedLine}`;
          delta = updatedLine.length - currentLine.length;
        }

        const newText = `${beforeLine}${updatedLine}${afterLine}`;
        const nextStart = Math.max(lineStart, start + delta);
        const nextEnd = Math.max(lineStart, end + delta);
        setValue(newText);
        setCursor(nextStart);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(nextStart, nextEnd);
        }, 0);
      };

      const toggleInlineInComposer = (openTag: string, closeTag: string) => {
        const before = currentValue.substring(0, start);
        const after = currentValue.substring(end);

        if (!selectedText && before.endsWith(openTag) && after.startsWith(closeTag)) {
          const newText = before.slice(0, -openTag.length) + after.slice(closeTag.length);
          const nextPos = start - openTag.length;
          setValue(newText);
          setCursor(nextPos);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(nextPos, nextPos);
          }, 0);
          return;
        }

        if (
          selectedText.startsWith(openTag) &&
          selectedText.endsWith(closeTag) &&
          selectedText.length >= openTag.length + closeTag.length
        ) {
          const unwrapped = selectedText.slice(openTag.length, -closeTag.length);
          const newText = before + unwrapped + after;
          setValue(newText);
          setCursor(start + unwrapped.length);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start, start + unwrapped.length);
          }, 0);
          return;
        }

        const wrapped = `${openTag}${selectedText}${closeTag}`;
        const newText = before + wrapped + after;
        const nextPos = selectedText ? start + wrapped.length : start + openTag.length;
        setValue(newText);
        setCursor(nextPos);
        setTimeout(() => {
          textarea.focus();
          if (selectedText) {
            textarea.setSelectionRange(start, start + wrapped.length);
          } else {
            textarea.setSelectionRange(nextPos, nextPos);
          }
        }, 0);
      };

      switch (formatType) {
        case 'bold':
          toggleInlineInComposer('**', '**');
          return;
        case 'italic':
          toggleInlineInComposer('*', '*');
          return;
        case 'strike':
          toggleInlineInComposer('~~', '~~');
          return;
        case 'underline':
          toggleInlineInComposer('<u>', '</u>');
          return;
        case 'color': {
          const hex = customColorHex || inlineTextColor || '#f59e0b';
          toggleInlineInComposer(`<span style="color:${hex}">`, '</span>');
          return;
        }
        case 'code':
          toggleInlineInComposer('`', '`');
          return;
        case 'h1':
          toggleLinePrefixInComposer('# ', /^#\s/);
          return;
        case 'h2':
          toggleLinePrefixInComposer('## ', /^##\s/);
          return;
        case 'h3':
          toggleLinePrefixInComposer('### ', /^###\s/);
          return;
        case 'todo':
          toggleLinePrefixInComposer('- [ ] ', /^-\s\[[ xX]\]\s/);
          return;
        case 'bullet':
          toggleLinePrefixInComposer('• ', /^[•\-*]\s/);
          return;
        case 'number':
          toggleLinePrefixInComposer('1. ', /^\d+\.\s/);
          return;
        case 'quote':
          toggleLinePrefixInComposer('> ', /^>\s?/);
          return;
        default:
          break;
      }

      let replacement = '';
      let cursorOffset = 0;

      switch (formatType) {
        case 'codeblock':
          replacement = selectedText ? `\`\`\`\n${selectedText}\n\`\`\`` : '```\n\n```';
          cursorOffset = selectedText ? replacement.length : 4;
          break;
        case 'table':
          replacement = `\n| Cột 1 | Cột 2 | Cột 3 |\n|---|---|---|\n| Dữ liệu 1 | Dữ liệu 2 | Chi tiết |\n| Dữ liệu 3 | Dữ liệu 4 | Chi tiết |\n`;
          cursorOffset = replacement.length;
          break;
        case 'link':
          replacement = selectedText ? `[${selectedText}](https://)` : '[Liên kết](https://)';
          cursorOffset = selectedText ? replacement.length - 1 : 19;
          break;
        case 'divider':
          replacement = `\n\n---\n\n`;
          cursorOffset = replacement.length;
          break;
        case 'mermaid':
          replacement = `\n\`\`\`mermaid\ngraph TD\n  A[Bắt đầu] --> B[Xử lý]\n  B --> C[Hoàn tất]\n\`\`\`\n`;
          cursorOffset = replacement.length;
          break;
        case 'math':
          replacement = `\n$$\n\\sum_{i=1}^{n} X_i = \\text{Tổng}\n$$\n`;
          cursorOffset = replacement.length;
          break;
        case 'clear':
          if (!selectedText) return;
          replacement = selectedText
            .replace(/<span\s+style=["']color:[^"']+["']>([\s\S]*?)<\/span>/gi, '$1')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/~~(.*?)~~/g, '$1')
            .replace(/<u>(.*?)<\/u>/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/^#+\s+/gm, '')
            .replace(/^[-*•]\s+/gm, '')
            .replace(/^\d+\.\s+/gm, '')
            .replace(/^-\s*\[[ xX]\]\s+/gm, '')
            .replace(/^>\s+/gm, '');
          cursorOffset = replacement.length;
          break;
      }

      const newValue = currentValue.substring(0, start) + replacement + currentValue.substring(end);
      setValue(newValue);
      setCursor(start + cursorOffset);
      setTimeout(() => {
        textarea.focus();
        if (selectedText && formatType !== 'clear' && formatType !== 'link') {
          textarea.setSelectionRange(start, start + replacement.length);
        } else {
          textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
        }
      }, 0);
    },
    [composerTextRef, threadInput, inlineTextColor]
  );

  /**
   * Thanh công cụ định dạng gọn gõ nhanh kiểu Google Chat / CKEditor Inline (phù hợp cả iPhone & Desktop)
   * Tích hợp liền mạch ngay đầu khung nhập chữ hoặc nổi phía trên trên di động.
   */
  const renderAppleNotesFormatToolbar = useCallback(
    (scope: 'main' | 'thread', variant: 'inline' | 'floating' = 'floating') => {
      const isMain = scope === 'main';
      const isPreview = isMain ? isPreviewModeMain : isPreviewModeThread;
      const currentVal = isMain ? composerTextRef.current : threadInput;
      const currentPos = isMain ? composerCursorPosRef.current : threadCursorPosRef.current;
      const activeFormats = detectActiveFormatsAtCursor(currentVal, currentPos);

      const togglePreview = () => {
        if (isMain) setIsPreviewModeMain((prev) => !prev);
        else setIsPreviewModeThread((prev) => !prev);
      };
      const close = () => {
        if (isMain) setFormatBarOpenMain(false);
        else setFormatBarOpenThread(false);
      };

      const getInlineBtnClass = (isActive?: boolean) =>
        `min-w-[28px] h-[28px] px-1.5 rounded-lg flex items-center justify-center text-[13px] shrink-0 active:scale-95 transition-all cursor-pointer ${
          isActive
            ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 font-bold shadow-xs'
            : 'hover:bg-black/5 dark:hover:bg-white/10'
        }`;

      const isInline = variant === 'inline';

      return (
        <div
          data-format-toolbar={scope}
          data-testid={`chat-format-toolbar-${scope}`}
          className={
            isInline
              ? 'flex items-center gap-0.5 pb-1.5 mb-1.5 border-b overflow-x-auto no-scrollbar select-none'
              : 'flex items-center gap-1 px-2 py-1.5 overflow-x-auto no-scrollbar rounded-xl mb-1.5 shadow-md border animate-in slide-in-from-bottom-2 duration-150 select-none'
          }
          style={
            isInline
              ? {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)',
                }
              : {
                  background: isDark ? 'rgba(28, 28, 30, 0.96)' : 'rgba(242, 242, 247, 0.96)',
                  backdropFilter: 'blur(16px)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
                }
          }
        >
          {/* Bold (B) */}
          <button
            type="button"
            aria-label="In đậm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleApplyFormat('bold', scope)}
            title="In đậm (⌘B)"
            className={getInlineBtnClass(activeFormats.bold)}
            style={{ color: activeFormats.bold ? undefined : token.colorText }}
          >
            <Bold size={14} strokeWidth={2.5} />
          </button>

          {/* Italic (I) */}
          <button
            type="button"
            aria-label="In nghiêng"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleApplyFormat('italic', scope)}
            title="In nghiêng (⌘I)"
            className={getInlineBtnClass(activeFormats.italic)}
            style={{ color: activeFormats.italic ? undefined : token.colorText }}
          >
            <Italic size={14} />
          </button>

          {/* Underline (U) */}
          <button
            type="button"
            aria-label="Gạch chân"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleApplyFormat('underline', scope)}
            title="Gạch chân (⌘U)"
            className={getInlineBtnClass(activeFormats.underline)}
            style={{ color: activeFormats.underline ? undefined : token.colorText }}
          >
            <Underline size={14} />
          </button>

          {/* Text Color (A with color bar underneath — matching Google Chat) */}
          <Popover
            open={colorPopoverScope === scope}
            onOpenChange={(vis) => setColorPopoverScope(vis ? scope : null)}
            trigger="click"
            placement="top"
            content={
              <div className="p-1.5 flex items-center gap-1.5">
                {QUICK_TEXT_COLORS.map((c) => (
                  <Tooltip key={c.id} title={c.label}>
                    <button
                      type="button"
                      aria-label={`Màu chữ ${c.label}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setInlineTextColor(c.hex);
                        setColorPopoverScope(null);
                        handleApplyFormat('color', scope, c.hex);
                      }}
                      className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                      style={{ background: c.hex }}
                    >
                      {inlineTextColor === c.hex && <Check size={12} className="text-slate-950 stroke-[3]" />}
                    </button>
                  </Tooltip>
                ))}
              </div>
            }
          >
            <button
              type="button"
              aria-label="Màu chữ"
              onMouseDown={(e) => e.preventDefault()}
              title="Màu chữ nổi bật (A)"
              className="min-w-[28px] h-[28px] px-1.5 rounded-lg flex flex-col items-center justify-center shrink-0 active:scale-95 transition-all hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              style={{ color: token.colorText }}
            >
              <span className="font-bold text-[12px] leading-none">A</span>
              <span className="w-3.5 h-[2.5px] rounded-full mt-0.5" style={{ background: inlineTextColor }} />
            </button>
          </Popover>

          {/* Strikethrough (S) */}
          <button
            type="button"
            aria-label="Gạch ngang"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleApplyFormat('strike', scope)}
            title="Gạch ngang (~~text~~)"
            className={getInlineBtnClass(activeFormats.strike)}
            style={{ color: activeFormats.strike ? undefined : token.colorText }}
          >
            <Strikethrough size={14} />
          </button>

          <div className="h-4 w-[1px] bg-zinc-500/20 shrink-0 mx-0.5" />

          {/* Bullet List (• ≡) — highlighted when current line is bullet */}
          <button
            type="button"
            aria-label="Danh sách dấu đầu dòng"
            data-testid={`chat-format-btn-${scope}-bullet`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleApplyFormat('bullet', scope)}
            title="Danh sách dấu đầu dòng (• Mục) — Shift+Enter để tự động thêm • dòng tiếp theo"
            className={getInlineBtnClass(activeFormats.bullet)}
            style={{ color: activeFormats.bullet ? undefined : token.colorText }}
          >
            <List size={15} />
          </button>

          {/* Numbered List (1. ≡) */}
          <button
            type="button"
            aria-label="Danh sách đánh số"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleApplyFormat('number', scope)}
            title="Danh sách đánh số (1. Mục) — Shift+Enter tự tăng số thứ tự"
            className={getInlineBtnClass(activeFormats.number)}
            style={{ color: activeFormats.number ? undefined : token.colorText }}
          >
            <ListOrdered size={15} />
          </button>

          {/* Checklist / Todo (- [ ]) */}
          <button
            type="button"
            aria-label="Danh sách việc cần làm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleApplyFormat('todo', scope)}
            title="Việc cần làm (- [ ] Việc)"
            className={getInlineBtnClass(activeFormats.todo)}
            style={{ color: activeFormats.todo ? undefined : '#f59e0b' }}
          >
            <ListTodo size={15} />
          </button>

          <div className="h-4 w-[1px] bg-zinc-500/20 shrink-0 mx-0.5" />

          {/* Quote (“) */}
          <button
            type="button"
            aria-label="Trích dẫn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleApplyFormat('quote', scope)}
            title="Trích dẫn (> Trích dẫn)"
            className={getInlineBtnClass(activeFormats.quote)}
            style={{ color: activeFormats.quote ? undefined : token.colorText }}
          >
            <Quote size={14} />
          </button>

          {/* Link (🔗) */}
          <button
            type="button"
            aria-label="Chèn liên kết"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleApplyFormat('link', scope)}
            title="Chèn liên kết URL [Tên](https://...)"
            className={getInlineBtnClass(false)}
            style={{ color: token.colorText }}
          >
            <LinkIcon size={14} />
          </button>

          <div className="h-4 w-[1px] bg-zinc-500/20 shrink-0 mx-0.5" />

          {/* Inline Code (<>) */}
          <button
            type="button"
            aria-label="Mã nội dòng"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleApplyFormat('code', scope)}
            title="Mã nội dòng (`code`)"
            className={getInlineBtnClass(activeFormats.code)}
            style={{ color: activeFormats.code ? undefined : token.colorText }}
          >
            <Code size={14} />
          </button>

          {/* Code Block ([<>]) */}
          <button
            type="button"
            aria-label="Khối mã code"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleApplyFormat('codeblock', scope)}
            title="Khối mã đa dòng (```)"
            className={getInlineBtnClass(false)}
            style={{ color: token.colorText }}
          >
            <SquareCode size={14} />
          </button>

          {/* Right side quick actions */}
          <div className="ml-auto flex items-center gap-1 pl-1 shrink-0">
            {/* Live Preview Toggle Button */}
            <button
              type="button"
              onClick={togglePreview}
              title={isPreview ? 'Quay lại chế độ soạn thảo' : 'Xem trước trực quan (WYSIWYG Preview)'}
              className={`h-[26px] px-2 rounded-lg flex items-center gap-1 text-[10.5px] font-bold shrink-0 active:scale-95 transition-all cursor-pointer ${
                isPreview
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30'
              }`}
            >
              <Eye size={12} />
              <span className="hidden sm:inline">{isPreview ? 'Đang xem' : 'Xem trước'}</span>
            </button>

            {/* Quick Compact Popup Editor Button */}
            <button
              type="button"
              onClick={() => {
                setRichEditorModalState({
                  open: true,
                  scope,
                  title: scope === 'main' ? 'Soạn thảo phong phú (CKEditor)' : 'Soạn thảo phản hồi (CKEditor)',
                  initialMode: 'compact',
                });
              }}
              title="Mở cửa sổ Bản gọn (Type nhanh) — nhấn Enter tự xuống dòng •"
              className="h-[26px] px-2 rounded-lg flex items-center gap-1 text-[10.5px] font-bold shrink-0 active:scale-95 transition-all cursor-pointer text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30"
            >
              <Zap size={12} />
              <span className="hidden sm:inline">Bản gọn</span>
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={close}
              title="Đóng thanh định dạng"
              className="w-[26px] h-[26px] rounded-lg flex items-center justify-center text-[12px] shrink-0 active:scale-95 transition-all hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer opacity-70 hover:opacity-100"
              style={{ color: token.colorTextSecondary }}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      );
    },
    [
      handleApplyFormat,
      isDark,
      isPreviewModeMain,
      isPreviewModeThread,
      composerTextRef,
      threadInput,
      // composerCursorPosRef and threadCursorPosRef are refs — no dep needed
      colorPopoverScope,
      inlineTextColor,
      token.colorText,
      token.colorTextSecondary,
    ]
  );

  const [brokenAvatarUrls, setBrokenAvatarUrls] = useState<Record<string, boolean>>({});

  const normalizeAvatarImageUrl = useCallback(
    (raw?: string | null): string | null => {
      if (!raw || typeof raw !== 'string') return null;
      const trimmed = raw.trim();
      if (!trimmed) return null;
      const isLikelyImageUrl =
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('/api/') ||
        trimmed.startsWith('/uploads/') ||
        trimmed.startsWith('data:image/') ||
        /\.(?:jpg|jpeg|png|webp|gif|svg)(?:\?|$)/i.test(trimmed);
      if (!isLikelyImageUrl) return null;
      const normalized = resolveMediaUrl(
        trimmed.replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com/, 'https://cdn.wingslashes.com')
      );
      if (!normalized || brokenAvatarUrls[normalized]) return null;
      return normalized;
    },
    [brokenAvatarUrls]
  );

  const resolveUserAvatarUrl = useCallback(
    ({
      staffId,
      name,
      username,
      rawAvatar,
    }: {
      staffId?: number | string | null;
      name?: string | null;
      username?: string | null;
      rawAvatar?: string | null;
    }): string | null => {
      const direct = normalizeAvatarImageUrl(rawAvatar);
      if (direct) return direct;

      const cleanName = String(name || '')
        .replace(/\s*\(Ghi chú cho tôi\)\s*$/i, '')
        .replace(/^Chuyên Viên\s+/i, '')
        .trim()
        .toLowerCase();
      const cleanUser = String(username || '')
        .trim()
        .toLowerCase();
      const myId = currentUser?.id;
      const myName = String(currentUser?.displayName || '')
        .trim()
        .toLowerCase();
      const myUser = String(currentUser?.username || '')
        .trim()
        .toLowerCase();

      const isMeMatch =
        staffId === 'me' ||
        (myId && staffId && String(staffId) === String(myId)) ||
        (cleanName && myName && cleanName === myName) ||
        (cleanUser && myUser && cleanUser === myUser);

      if (isMeMatch) {
        const myDirectAvatar = normalizeAvatarImageUrl(currentUser?.avatarUrl || currentUser?.avatar);
        if (myDirectAvatar) return myDirectAvatar;
      }

      if (staffDirectory.length > 0) {
        const matchedStaff = staffDirectory.find((s) => {
          if (staffId && Number(s.id) === Number(staffId)) return true;
          if (isMeMatch && myId && Number(s.id) === Number(myId)) return true;
          const sName = String(s.displayName || '')
            .trim()
            .toLowerCase();
          const sUser = String(s.username || '')
            .trim()
            .toLowerCase();
          if (cleanName && sName && (sName === cleanName || sName.endsWith(` ${cleanName}`))) return true;
          if (cleanUser && sUser && sUser === cleanUser) return true;
          return false;
        });
        if (matchedStaff?.avatarUrl) {
          const dirAvatar = normalizeAvatarImageUrl(matchedStaff.avatarUrl);
          if (dirAvatar) return dirAvatar;
        }
      }

      return null;
    },
    [normalizeAvatarImageUrl, currentUser, staffDirectory]
  );

  const getAvatarInitials = useCallback((name?: string | null, fallback?: string | null): string => {
    const cleanFallback = String(fallback || '').trim();
    if (cleanFallback && cleanFallback.length <= 3 && !cleanFallback.includes('/') && !cleanFallback.includes('.')) {
      return cleanFallback.toUpperCase();
    }
    const clean = String(name || '')
      .replace(/\s*\(Ghi chú cho tôi\)\s*$/i, '')
      .replace(/^Chuyên Viên\s+/i, '')
      .trim();
    if (!clean) return 'NV';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }, []);

  // ================= @MENTION AUTOCOMPLETE IN SPACES & DIRECT MESSAGES =================
  const getRoleBadgeInfo = useCallback((role?: string | null): { label: string; color: string } => {
    const normalized = String(role || '')
      .toLowerCase()
      .trim();
    if (normalized === 'super_admin') return { label: 'Super Admin', color: '#d4a84b' };
    if (normalized === 'admin') return { label: 'Admin', color: '#a855f7' };
    if (normalized === 'telesales' || normalized === 'booker') return { label: 'Telesales', color: '#0ea5e9' };
    if (normalized === 'cc' || normalized === 'consultant') return { label: 'Tư Vấn (CC)', color: '#10b981' };
    if (normalized === 'technician' || normalized === 'ktv' || normalized === 'cv') {
      return { label: 'Chuyên Viên (CV)', color: '#14b8a6' };
    }
    return { label: role ? role.toUpperCase() : 'Nhân sự', color: '#3b82f6' };
  }, []);

  interface MentionItem {
    id: string;
    type: 'special' | 'staff';
    tagText: string;
    displayName: string;
    realName?: string;
    nickname?: string;
    username?: string;
    role?: string;
    avatarUrl?: string | null;
    avatarText?: string;
    color?: string;
    isOnline?: boolean;
  }

  // Danh sách ứng viên có thể tag trong phòng hiện tại
  const mentionCandidates = useMemo<MentionItem[]>(() => {
    const list: MentionItem[] = [];

    // 1. Trong Space: Thêm tag @All (Toàn bộ thành viên)
    if (activeConversation?.type === 'space') {
      list.push({
        id: 'all',
        type: 'special',
        tagText: 'All',
        displayName: 'All (Tất cả mọi người)',
        role: 'Toàn nhóm',
        color: '#3b82f6',
        avatarText: '👥',
      });
    }

    // 2. Thêm tag @MAI nếu có Copilot
    if (canUseAiCopilot) {
      list.push({
        id: 'mai',
        type: 'special',
        tagText: 'MAI',
        displayName: 'MAI (mOS AI)',
        role: 'Trợ lý AI',
        color: '#8b5cf6',
        avatarText: '🤖',
      });
    }

    // 3. Danh sách thành viên của phòng hiện tại
    let roomStaff: MosChatStaffMember[] = [];
    if (activeConversation?.type === 'space') {
      if (Array.isArray(activeConversation.memberIds) && activeConversation.memberIds.length > 0) {
        const mSet = new Set(activeConversation.memberIds.map(Number));
        roomStaff = staffDirectory.filter((s) => mSet.has(s.id));
      } else if (Array.isArray(activeConversation.members) && activeConversation.members.length > 0) {
        roomStaff = activeConversation.members;
      } else {
        // Phòng mở public (chung, cc, telesales) -> Cho phép tag đồng nghiệp
        roomStaff = staffDirectory;
      }
    } else if (activeConversation?.type === 'dm') {
      const peerId = Number(activeConversation.participantStaffId);
      if (peerId > 0) {
        const peer = staffDirectory.find((s) => s.id === peerId);
        if (peer) roomStaff = [peer];
      } else if (Array.isArray(activeConversation.memberIds)) {
        const myId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
        const otherId = activeConversation.memberIds.find((id) => Number(id) !== myId);
        if (otherId) {
          const peer = staffDirectory.find((s) => s.id === Number(otherId));
          if (peer) roomStaff = [peer];
        }
      }
    } else {
      roomStaff = staffDirectory;
    }

    for (const s of roomStaff) {
      if (!s || !s.id) continue;
      if (list.some((item) => item.id === `staff-${s.id}`)) continue;
      const realName = s.displayName || s.username || `Nhân sự #${s.id}`;
      const badge = getRoleBadgeInfo(s.role);
      const nick =
        activeConversation?.type === 'space' && activeConversation.memberNicknames
          ? activeConversation.memberNicknames[String(s.id)]?.trim()
          : undefined;

      const tagText = nick || realName;
      const displayName = nick ? `${nick} (${realName})` : realName;

      list.push({
        id: `staff-${s.id}`,
        type: 'staff',
        tagText,
        displayName,
        realName,
        nickname: nick,
        username: s.username,
        role: badge.label,
        avatarUrl: s.avatarUrl || undefined,
        avatarText: getAvatarInitials(tagText, s.username),
        color: badge.color,
        isOnline: s.isOnline,
      });
    }

    return list;
  }, [
    activeConversation,
    canUseAiCopilot,
    currentUserStaffMember.id,
    currentUser?.id,
    getAvatarInitials,
    getRoleBadgeInfo,
    staffDirectory,
  ]);

  // Bộ lọc danh sách thành viên khớp với chuỗi gõ sau dấu @ (Hỗ trợ tiếng Việt không dấu, họ tên thật, username và biệt danh)
  const filteredMentions = useMemo(() => {
    if (!mentionState.open) return [];
    const rawQ = mentionState.query.trim().toLowerCase();
    const q = removeVietnameseTones(rawQ);
    if (!q) return mentionCandidates.slice(0, 10);

    const qTokens = q.split(/\s+/).filter(Boolean);

    return mentionCandidates
      .filter((item) => {
        const tagNorm = removeVietnameseTones(item.tagText.toLowerCase());
        const nameNorm = removeVietnameseTones(item.displayName.toLowerCase());
        const realNorm = item.realName ? removeVietnameseTones(item.realName.toLowerCase()) : '';
        const nickNorm = item.nickname ? removeVietnameseTones(item.nickname.toLowerCase()) : '';
        const unameNorm = item.username ? removeVietnameseTones(item.username.toLowerCase()) : '';
        const roleNorm = item.role ? removeVietnameseTones(item.role.toLowerCase()) : '';

        // Khớp toàn chuỗi
        if (
          tagNorm.includes(q) ||
          nameNorm.includes(q) ||
          realNorm.includes(q) ||
          nickNorm.includes(q) ||
          unameNorm.includes(q) ||
          roleNorm.includes(q)
        ) {
          return true;
        }

        // Khớp từng từ (token) không phân biệt thứ tự (VD: "danh do" khớp "do danh")
        const combined = `${tagNorm} ${nameNorm} ${realNorm} ${nickNorm} ${unameNorm} ${roleNorm}`;
        return qTokens.length > 0 && qTokens.every((tok) => combined.includes(tok));
      })
      .slice(0, 10);
  }, [mentionState.open, mentionState.query, mentionCandidates]);

  // Kiểm tra con trỏ chuột có đang nằm trong từ khoá bắt đầu bằng @ hay không
  // Performance: uses mentionStateRef to skip setMentionState when state is unchanged,
  // avoiding parent re-render cascade on every keystroke.
  const checkForMentionTrigger = useCallback((text: string, cursor: number, scope: 'main' | 'thread') => {
    const textBeforeCursor = text.slice(0, cursor);
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_\u00C0-\u1EF9\s]*)$/u);
    if (match && match.index !== undefined) {
      const rawMatch = match[0];
      const atOffset = rawMatch.indexOf('@');
      const atIndex = match.index + atOffset;
      const query = match[1];

      if (query.includes('\n') || query.length > 25 || (query.match(/\s/g) || []).length > 2) {
        setMentionState((prev) => (prev.open ? { ...prev, open: false } : prev));
        return;
      }

      // Skip state update if mention popup is already showing the same query/position
      const prev = mentionStateRef.current;
      if (prev.open && prev.scope === scope && prev.query === query && prev.atIndex === atIndex) {
        return;
      }

      setMentionState({
        open: true,
        scope,
        query,
        atIndex,
        cursorIndex: cursor,
        highlightedIndex: 0,
      });
      return;
    }
    setMentionState((prev) => (prev.open ? { ...prev, open: false } : prev));
  }, []);

  // Chọn thành viên và tự động hoàn tất cú pháp @Tên Thành Viên vào văn bản
  const handleSelectMention = useCallback(
    (item: MentionItem, scope: 'main' | 'thread') => {
      const textarea = scope === 'main' ? composerInputRef.current : threadInputRef.current;
      const currentVal = (textarea?.value ?? (scope === 'main' ? composerTextRef.current : threadInput)) || '';
      if (!textarea) return;

      const atIdx = mentionState.atIndex >= 0 ? mentionState.atIndex : currentVal.lastIndexOf('@');
      const cursor = Math.max(textarea.selectionEnd ?? currentVal.length, atIdx + 1);
      const before = currentVal.slice(0, Math.max(0, atIdx));
      const after = currentVal.slice(cursor);
      const inserted = `@${item.tagText} `;
      const nextVal = `${before}${inserted}${after}`;

      // Ghi nhận trực tiếp giá trị vào DOM textarea trước để ngăn chặn hiện tượng trễ của React/IME
      textarea.value = nextVal;
      isComposingRef.current = false;
      lastCompositionEndMsRef.current = Date.now();

      if (scope === 'main') {
        updateComposerText(nextVal);
      } else {
        setThreadInput(nextVal);
      }

      setMentionState({
        open: false,
        scope,
        query: '',
        atIndex: -1,
        cursorIndex: -1,
        highlightedIndex: 0,
      });

      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = before.length + inserted.length;
        textarea.setSelectionRange(newPos, newPos);
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, scope === 'main' ? 180 : 140)}px`;
      });
    },
    [composerTextRef, threadInput, mentionState.atIndex, mentionState.cursorIndex]
  );

  // Điều hướng bằng phím mũi tên Lên/Xuống, Enter/Tab để chọn, Escape để đóng
  const handleMentionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, scope: 'main' | 'thread'): boolean => {
      if (!mentionState.open || mentionState.scope !== scope || filteredMentions.length === 0) {
        return false;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionState((prev) => ({
          ...prev,
          highlightedIndex: (prev.highlightedIndex + 1) % filteredMentions.length,
        }));
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionState((prev) => ({
          ...prev,
          highlightedIndex: (prev.highlightedIndex - 1 + filteredMentions.length) % filteredMentions.length,
        }));
        return true;
      }

      // Phím TAB: Luôn luôn hoàn tất autocomplete ngay lập tức và NGĂN CHẶN trình duyệt nhảy focus xuống nút Aa
      if (e.key === 'Tab' || e.code === 'Tab' || e.keyCode === 9) {
        e.preventDefault();
        e.stopPropagation();
        isComposingRef.current = false;
        const targetItem = filteredMentions[mentionState.highlightedIndex] || filteredMentions[0];
        if (targetItem) {
          handleSelectMention(targetItem, scope);
        }
        return true;
      }

      // Phím ENTER: Hoàn tất tag khi không trong trạng thái gõ phím tiếng Việt (IME composition)
      if (e.key === 'Enter') {
        if (e.nativeEvent.isComposing || isComposingRef.current || e.keyCode === 229) {
          return false;
        }
        e.preventDefault();
        e.stopPropagation();
        const targetItem = filteredMentions[mentionState.highlightedIndex] || filteredMentions[0];
        if (targetItem) {
          handleSelectMention(targetItem, scope);
        }
        return true;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionState((prev) => ({ ...prev, open: false }));
        return true;
      }
      return false;
    },
    [filteredMentions, handleSelectMention, mentionState.highlightedIndex, mentionState.open, mentionState.scope]
  );

  // Tự động cuộn mục đang chọn vào tầm nhìn
  useEffect(() => {
    if (!mentionState.open) return;
    const el = document.getElementById(`mention-item-${mentionState.highlightedIndex}`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [mentionState.highlightedIndex, mentionState.open]);

  // Đóng danh sách gợi ý khi bấm chuột ra ngoài
  useEffect(() => {
    if (!mentionState.open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.mos-chat-mention-dropdown')) return;
      if (target === composerInputRef.current || target === threadInputRef.current) return;
      setMentionState((prev) => (prev.open ? { ...prev, open: false } : prev));
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [mentionState.open]);

  // Component Popup hiển thị gợi ý thành viên khi gõ @
  const renderMentionAutocompleteDropdown = useCallback(
    (scope: 'main' | 'thread') => {
      if (!mentionState.open || mentionState.scope !== scope || filteredMentions.length === 0) {
        return null;
      }

      return (
        <div
          className="mos-chat-mention-dropdown absolute bottom-full left-0 mb-2 z-50 rounded-2xl shadow-2xl border backdrop-blur-xl overflow-hidden transition-all duration-150 animate-in fade-in slide-in-from-bottom-2 select-none w-72 md:w-84 max-w-[calc(100vw-32px)]"
          style={{
            background: isDark ? 'rgba(23, 23, 23, 0.96)' : 'rgba(255, 255, 255, 0.98)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.12)',
            boxShadow: isDark
              ? '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)'
              : '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Header */}
          <div
            className="px-3.5 py-2 flex items-center justify-between text-[11px] font-semibold tracking-wide"
            style={{
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
              color: token.colorTextSecondary,
            }}
          >
            <span className="flex items-center gap-1.5 uppercase font-bold text-amber-500">
              <AtSign size={13} className="shrink-0" />
              <span>Gợi ý thành viên ({filteredMentions.length})</span>
            </span>
            <span className="text-[10px] font-normal lowercase opacity-70">↑ ↓ chọn · Enter/Tab tag · Esc huỷ</span>
          </div>

          {/* Danh sách thành viên */}
          <div className="overflow-y-auto max-h-56 py-1 scrollbar-thin">
            {filteredMentions.map((item, idx) => {
              const isHighlighted = idx === mentionState.highlightedIndex;
              return (
                <div
                  key={item.id}
                  id={`mention-item-${idx}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectMention(item, scope);
                  }}
                  onMouseEnter={() => setMentionState((prev) => ({ ...prev, highlightedIndex: idx }))}
                  className={`px-3 py-2 flex items-center gap-2.5 cursor-pointer transition-colors ${
                    isHighlighted
                      ? isDark
                        ? 'bg-amber-500/20 text-white'
                        : 'bg-amber-50 text-slate-900'
                      : isDark
                        ? 'hover:bg-white/5 text-slate-300'
                        : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  style={{
                    borderLeft: isHighlighted ? '3px solid #d4a84b' : '3px solid transparent',
                  }}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt={item.displayName} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] text-white shadow-sm"
                        style={{ background: item.color || '#d4a84b' }}
                      >
                        {item.avatarText || '@'}
                      </div>
                    )}
                    {item.type === 'staff' && item.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-neutral-900" />
                    )}
                  </div>

                  {/* Tên & Chức vụ */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.nickname ? (
                        <>
                          <span className="font-extrabold text-[13px] text-emerald-400 truncate">{item.nickname}</span>
                          <span className="text-[11px] text-slate-400 truncate font-normal">({item.realName})</span>
                        </>
                      ) : (
                        <span className="font-semibold text-[13px] truncate">{item.displayName}</span>
                      )}
                      {item.role && (
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-medium shrink-0"
                          style={{
                            background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                            color: item.color || token.colorTextSecondary,
                          }}
                        >
                          {item.role}
                        </span>
                      )}
                    </div>
                    {item.username && <div className="text-[11px] opacity-60 truncate font-mono">@{item.username}</div>}
                  </div>

                  {/* Tag Cú pháp Preview */}
                  <div
                    className="shrink-0 text-[10.5px] font-mono font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: isHighlighted
                        ? 'rgba(212, 168, 75, 0.28)'
                        : isDark
                          ? 'rgba(255, 255, 255, 0.06)'
                          : 'rgba(0, 0, 0, 0.05)',
                      color: isHighlighted ? '#d4a84b' : token.colorTextSecondary,
                    }}
                  >
                    @{item.tagText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    },
    [
      filteredMentions,
      handleSelectMention,
      isDark,
      mentionState.highlightedIndex,
      mentionState.open,
      mentionState.scope,
      token.colorTextSecondary,
    ]
  );

  const isMessageFromCurrentUser = useCallback(
    (m: {
      senderId?: number | string | null;
      senderName?: string | null;
      isAiBot?: boolean;
      isSystemReminder?: boolean;
    }): boolean => {
      if (
        m.isAiBot ||
        m.isSystemReminder ||
        m.senderId === 'wings-ai-copilot' ||
        m.senderId === 'system' ||
        m.senderId === 'system-reminder'
      ) {
        return false;
      }
      if (m.senderId === 'me') return true;
      if (currentUser?.id && m.senderId && String(m.senderId) === String(currentUser.id)) {
        return true;
      }
      const senderClean = String(m.senderName || '')
        .trim()
        .toLowerCase();
      const myNameClean = String(currentUser?.displayName || '')
        .trim()
        .toLowerCase();
      const myUserClean = String(currentUser?.username || '')
        .trim()
        .toLowerCase();
      if (
        senderClean &&
        ((myNameClean && senderClean === myNameClean) || (myUserClean && senderClean === myUserClean))
      ) {
        return true;
      }
      if (!currentUser?.id && senderClean === 'danny do') {
        return true;
      }
      return false;
    },
    [currentUser?.id, currentUser?.displayName, currentUser?.username]
  );

  const isConversationParticipantOnline = useCallback(
    (conv: MosChatConversation | null | undefined): boolean => {
      if (!conv || conv.type === 'space') return false;
      const convIdStr = String(conv.id || '');
      if (convIdStr === AI_COPILOT_CONV_ID) return false;
      if (conv.isSelf || convIdStr.startsWith('dm-self-')) {
        return presence === 'active';
      }
      const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
      let peerStaffId = 0;
      if (Number(conv.participantStaffId) > 0 && Number(conv.participantStaffId) !== myStaffId) {
        peerStaffId = Number(conv.participantStaffId);
      } else if (Array.isArray(conv.memberIds) && conv.memberIds.length > 0) {
        const otherId = conv.memberIds.map(Number).find((id) => Number.isFinite(id) && id > 0 && id !== myStaffId);
        if (otherId) peerStaffId = otherId;
      }
      if (!peerStaffId) {
        const pairMatch = convIdStr.match(/^dm-(?:pair-)?(\d+)-(\d+)$/);
        if (pairMatch) {
          const a = Number(pairMatch[1]);
          const b = Number(pairMatch[2]);
          peerStaffId = a !== myStaffId ? a : b;
        }
      }
      if (peerStaffId > 0) {
        const matchedById = staffDirectory.find((s) => Number(s.id) === peerStaffId);
        if (matchedById) {
          return Boolean(matchedById.isOnline);
        }
      }
      const normName = removeVietnameseTones(
        String(conv.name || '')
          .trim()
          .toLowerCase()
      );
      if (normName) {
        const matchedByName = staffDirectory.find((s) => {
          const dName = removeVietnameseTones(
            String(s.displayName || '')
              .trim()
              .toLowerCase()
          );
          const uName = removeVietnameseTones(
            String(s.username || '')
              .trim()
              .toLowerCase()
          );
          return (dName && dName === normName) || (uName && uName === normName);
        });
        if (matchedByName) {
          return Boolean(matchedByName.isOnline);
        }
      }
      return false;
    },
    [currentUser?.id, currentUserStaffMember.id, presence, staffDirectory]
  );

  const renderUserAvatarNode = ({
    staffId,
    name,
    username,
    rawAvatar,
    avatarUrl,
    bgColor = '#3b82f6',
    bgStyle,
    sizeClass = 'w-8 h-8',
    roundedClass = 'rounded-full',
    textSizeClass = 'text-[11px]',
    textClass,
    textColor = '#ffffff',
    isOnline,
    onlineDot,
    isAiBot,
    isSelfBookmark,
  }: {
    staffId?: number | string | null;
    name?: string | null;
    username?: string | null;
    rawAvatar?: string | null;
    avatarUrl?: string | null;
    bgColor?: string;
    bgStyle?: string;
    sizeClass?: string;
    roundedClass?: string;
    textSizeClass?: string;
    textClass?: string;
    textColor?: string;
    isOnline?: boolean;
    onlineDot?: boolean;
    isAiBot?: boolean;
    isSelfBookmark?: boolean;
  }) => {
    const effectiveRawAvatar = rawAvatar ?? avatarUrl ?? null;
    const effectiveTextSize = textClass || textSizeClass;
    const effectiveOnline = Boolean(isOnline ?? onlineDot);
    const effectiveBg = bgStyle || bgColor;
    const resolvedImgUrl = isAiBot
      ? null
      : resolveUserAvatarUrl({ staffId, name, username, rawAvatar: effectiveRawAvatar });
    const initials = getAvatarInitials(name, effectiveRawAvatar);

    return (
      <div
        className={`${sizeClass} ${roundedClass} flex items-center justify-center ${effectiveTextSize} font-extrabold shrink-0 relative select-none`}
        style={{
          color: textColor,
          background: isAiBot
            ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #d4a84b 100%)'
            : isSelfBookmark && !resolvedImgUrl
              ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
              : effectiveBg,
        }}
      >
        {isAiBot ? (
          <Bot size={15} />
        ) : resolvedImgUrl ? (
          <img
            src={resolvedImgUrl}
            alt={name || username || 'User avatar'}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover ${roundedClass} block`}
            onError={() => setBrokenAvatarUrls((prev) => ({ ...prev, [resolvedImgUrl]: true }))}
          />
        ) : isSelfBookmark ? (
          <Bookmark size={14} />
        ) : (
          <span>{initials}</span>
        )}
        {effectiveOnline && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 z-10"
            style={{ border: `1.5px solid ${surfaceBg}` }}
          />
        )}
      </div>
    );
  };

  // =========================================================================
  // Read Receipts (Seen Status ✓ / ✓✓ + Mini Seen Avatars + Breakdown Popover)
  // =========================================================================
  const formatReadAtLabel = (iso?: string | null) => {
    if (!iso) return 'Đã xem';
    const d = dayjs(iso);
    if (!d.isValid()) return 'Đã xem';
    if (d.isSame(dayjs(), 'day')) {
      return `Lúc ${d.format('HH:mm')}`;
    }
    return `${d.format('HH:mm')} · ${d.format('DD/MM')}`;
  };

  const doesReceiptMatchAuthor = useCallback(
    (receiptStaffId: number, receiptName: string, senderId?: string | number, senderName?: string) => {
      if (senderId !== undefined && senderId !== null && String(senderId) === String(receiptStaffId)) return true;
      if (receiptName && senderName && receiptName.trim().toLowerCase() === senderName.trim().toLowerCase()) {
        return true;
      }
      return false;
    },
    []
  );

  const getMessageReadBreakdown = useCallback(
    (conv: MosChatConversation | null | undefined, msg: MosChatMessage) => {
      if (!conv || conv.id === AI_COPILOT_CONV_ID || conv.isSelf) {
        return { seenBy: [] as MosChatReadReceiptEntry[], unseenBy: [] as MosChatReadReceiptEntry[] };
      }
      const visibleMessages = (conv.messages || []).filter((m) => !m.deletedAt);
      const msgIdx = visibleMessages.findIndex((m) => m.id === msg.id);
      if (msgIdx < 0) {
        return { seenBy: [] as MosChatReadReceiptEntry[], unseenBy: [] as MosChatReadReceiptEntry[] };
      }
      const myStaffId = Number(currentUserStaffMember.id || currentUser?.id || 0);
      const rawReceipts = (conv.readReceipts || []).filter(
        (r) =>
          r.staffId !== myStaffId && !doesReceiptMatchAuthor(r.staffId, r.displayName, msg.senderId, msg.senderName)
      );
      // Dedup by staffId — keep the entry with the highest readCount (most recently read)
      const receiptMap = new Map<number, (typeof rawReceipts)[0]>();
      for (const r of rawReceipts) {
        const existing = receiptMap.get(r.staffId);
        if (!existing || r.readCount > existing.readCount) {
          receiptMap.set(r.staffId, r);
        }
      }
      const otherReceipts = Array.from(receiptMap.values());
      const seenBy = otherReceipts.filter((r) => r.readCount >= msgIdx + 1);
      const unseenBy = otherReceipts.filter((r) => r.readCount < msgIdx + 1);
      return { seenBy, unseenBy };
    },
    [currentUserStaffMember.id, currentUser?.id, doesReceiptMatchAuthor]
  );

  const getThreadReplyReadBreakdown = useCallback(
    (conv: MosChatConversation | null | undefined, parentMsg: MosChatMessage, reply: MosChatThreadReply) => {
      if (!conv || conv.id === AI_COPILOT_CONV_ID || conv.isSelf) {
        return { seenBy: [] as MosChatThreadReadReceiptEntry[], unseenBy: [] as MosChatThreadReadReceiptEntry[] };
      }
      const visibleReplies = (parentMsg.thread || []).filter((r) => !r.deletedAt);
      const replyIdx = visibleReplies.findIndex((r) => r.id === reply.id);
      if (replyIdx < 0) {
        return { seenBy: [] as MosChatThreadReadReceiptEntry[], unseenBy: [] as MosChatThreadReadReceiptEntry[] };
      }
      const myStaffId = Number(currentUserStaffMember.id || currentUser?.id || 0);
      const rawThreadReceipts = (parentMsg.threadReadReceipts || []).filter(
        (r) =>
          r.staffId !== myStaffId && !doesReceiptMatchAuthor(r.staffId, r.displayName, reply.senderId, reply.senderName)
      );
      // Dedup by staffId — keep the entry with the highest readReplyCount
      const threadReceiptMap = new Map<number, (typeof rawThreadReceipts)[0]>();
      for (const r of rawThreadReceipts) {
        const existing = threadReceiptMap.get(r.staffId);
        if (!existing || r.readReplyCount > existing.readReplyCount) {
          threadReceiptMap.set(r.staffId, r);
        }
      }
      const otherReceipts = Array.from(threadReceiptMap.values());
      const seenBy = otherReceipts.filter((r) => r.readReplyCount >= replyIdx + 1);
      const unseenBy = otherReceipts.filter((r) => r.readReplyCount < replyIdx + 1);
      return { seenBy, unseenBy };
    },
    [currentUserStaffMember.id, currentUser?.id, doesReceiptMatchAuthor]
  );

  // Map each message ID in the active conversation to the list of participants whose latest read message stops at that message
  const stoppedReadersByMsgId = useMemo(() => {
    const out: Record<string, MosChatReadReceiptEntry[]> = {};
    if (!activeConversation || activeConversation.id === AI_COPILOT_CONV_ID || activeConversation.isSelf) {
      return out;
    }
    const visibleMessages = (activeConversation.messages || []).filter((m) => !m.deletedAt);
    if (visibleMessages.length === 0) return out;
    const myStaffId = Number(currentUserStaffMember.id || currentUser?.id || 0);
    for (const r of activeConversation.readReceipts || []) {
      if (r.staffId === myStaffId || r.readCount <= 0) continue;
      const maxIdx = Math.min(r.readCount, visibleMessages.length) - 1;
      for (let i = maxIdx; i >= 0; i--) {
        const candidate = visibleMessages[i];
        if (!candidate) continue;
        if (!doesReceiptMatchAuthor(r.staffId, r.displayName, candidate.senderId, candidate.senderName)) {
          if (!out[candidate.id]) out[candidate.id] = [];
          out[candidate.id].push(r);
          break;
        }
      }
    }
    return out;
  }, [activeConversation, currentUserStaffMember.id, currentUser?.id, doesReceiptMatchAuthor]);

  // Map each reply ID in the active sub-thread to the list of participants whose latest read reply stops at that reply
  const stoppedReadersByReplyId = useMemo(() => {
    const out: Record<string, MosChatThreadReadReceiptEntry[]> = {};
    if (
      !activeConversation ||
      activeConversation.id === AI_COPILOT_CONV_ID ||
      activeConversation.isSelf ||
      !activeThreadMessage
    ) {
      return out;
    }
    const visibleReplies = (activeThreadMessage.thread || []).filter((r) => !r.deletedAt);
    if (visibleReplies.length === 0) return out;
    const myStaffId = Number(currentUserStaffMember.id || currentUser?.id || 0);
    for (const r of activeThreadMessage.threadReadReceipts || []) {
      if (r.staffId === myStaffId || r.readReplyCount <= 0) continue;
      const maxIdx = Math.min(r.readReplyCount, visibleReplies.length) - 1;
      for (let i = maxIdx; i >= 0; i--) {
        const candidate = visibleReplies[i];
        if (!candidate) continue;
        if (!doesReceiptMatchAuthor(r.staffId, r.displayName, candidate.senderId, candidate.senderName)) {
          if (!out[candidate.id]) out[candidate.id] = [];
          out[candidate.id].push(r);
          break;
        }
      }
    }
    return out;
  }, [activeConversation, activeThreadMessage, currentUserStaffMember.id, currentUser?.id, doesReceiptMatchAuthor]);

  const renderSeenBreakdownPopoverContent = (
    seenBy: Array<{
      staffId: number;
      displayName: string;
      role: string;
      avatarUrl?: string | null;
      readAt?: string | null;
    }>,
    unseenBy: Array<{
      staffId: number;
      displayName: string;
      role: string;
      avatarUrl?: string | null;
      readAt?: string | null;
    }>,
    scopeLabel = 'Trạng thái đọc tin nhắn'
  ) => {
    return (
      <div className="w-64 max-h-72 overflow-y-auto p-1 select-none" onClick={(e) => e.stopPropagation()}>
        <div
          className="text-[11px] font-bold uppercase tracking-wider pb-1.5 mb-1.5 border-b flex items-center justify-between"
          style={{
            color: isDark ? '#94a3b8' : '#64748b',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
          }}
        >
          <span>{scopeLabel}</span>
          <span className="tabular-nums text-[10.5px] font-semibold" style={{ color: '#10b981' }}>
            {seenBy.length}/{seenBy.length + unseenBy.length} đã xem
          </span>
        </div>

        {/* Seen Section */}
        <div className="mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold mb-1" style={{ color: '#10b981' }}>
            <CheckCheck size={12.5} />
            <span className="tabular-nums">Đã xem ({seenBy.length})</span>
          </div>
          {seenBy.length === 0 ? (
            <div className="text-[11px] italic pl-4 py-0.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
              Chưa có người nhận nào đọc
            </div>
          ) : (
            <div className="space-y-1">
              {seenBy.map((reader) => (
                <div
                  key={`seen-${reader.staffId}-${reader.displayName}`}
                  className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-md"
                  style={{ background: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)' }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {renderUserAvatarNode({
                      staffId: reader.staffId,
                      name: reader.displayName,
                      avatarUrl: reader.avatarUrl,
                      sizeClass: 'w-5 h-5',
                      roundedClass: 'rounded-full',
                      textSizeClass: 'text-[9px]',
                    })}
                    <div className="min-w-0">
                      <div
                        className="text-[11.5px] font-semibold truncate leading-tight"
                        style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
                      >
                        {reader.displayName}
                      </div>
                      <div
                        className="text-[9.5px] truncate leading-tight"
                        style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                      >
                        {reader.role}
                      </div>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-medium tabular-nums shrink-0"
                    style={{ color: isDark ? '#34d399' : '#059669' }}
                  >
                    {formatReadAtLabel(reader.readAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unseen Section */}
        {unseenBy.length > 0 && (
          <div>
            <div
              className="flex items-center gap-1.5 text-[11px] font-bold mb-1"
              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            >
              <Check size={12} />
              <span className="tabular-nums">Chưa xem ({unseenBy.length})</span>
            </div>
            <div className="space-y-1">
              {unseenBy.map((member) => (
                <div
                  key={`unseen-${member.staffId}-${member.displayName}`}
                  className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-md opacity-80"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {renderUserAvatarNode({
                      staffId: member.staffId,
                      name: member.displayName,
                      avatarUrl: member.avatarUrl,
                      sizeClass: 'w-5 h-5',
                      roundedClass: 'rounded-full',
                      textSizeClass: 'text-[9px]',
                    })}
                    <div className="min-w-0">
                      <div
                        className="text-[11.5px] font-medium truncate leading-tight"
                        style={{ color: isDark ? '#cbd5e1' : '#334155' }}
                      >
                        {member.displayName}
                      </div>
                      <div
                        className="text-[9.5px] truncate leading-tight"
                        style={{ color: isDark ? '#64748b' : '#94a3b8' }}
                      >
                        {member.role}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] tabular-nums shrink-0" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                    Đã gửi
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReadStatusCheckmark = (
    seenBy: Array<{
      staffId: number;
      displayName: string;
      role: string;
      avatarUrl?: string | null;
      readAt?: string | null;
    }>,
    unseenBy: Array<{
      staffId: number;
      displayName: string;
      role: string;
      avatarUrl?: string | null;
      readAt?: string | null;
    }>,
    options?: { compact?: boolean; scopeLabel?: string; showLabel?: boolean }
  ) => {
    const isSeen = seenBy.length > 0;
    const totalPeers = seenBy.length + unseenBy.length;
    if (totalPeers === 0) return null;

    const iconSize = options?.compact ? 11.5 : 13;
    return (
      <Popover
        trigger={['hover', 'click']}
        placement="top"
        content={renderSeenBreakdownPopoverContent(seenBy, unseenBy, options?.scopeLabel)}
      >
        <span
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-0.5 cursor-pointer select-none leading-none transition-opacity hover:opacity-85 tabular-nums"
          style={{
            color: isSeen ? '#10b981' : isDark ? '#64748b' : '#94a3b8',
          }}
          title={isSeen ? `Đã xem bởi ${seenBy.map((s) => s.displayName).join(', ')}` : 'Đã gửi · Chưa có người xem'}
        >
          {isSeen ? <CheckCheck size={iconSize} strokeWidth={2.4} /> : <Check size={iconSize} strokeWidth={2.2} />}
          {options?.showLabel && (
            <span className="text-[10px] font-semibold">
              {isSeen ? (totalPeers > 1 ? `Đã xem (${seenBy.length})` : 'Đã xem') : 'Đã gửi'}
            </span>
          )}
        </span>
      </Popover>
    );
  };

  const renderMiniSeenAvatarStack = (
    readers: Array<{
      staffId: number;
      displayName: string;
      role: string;
      avatarUrl?: string | null;
      readAt?: string | null;
    }>,
    unseenBy: Array<{
      staffId: number;
      displayName: string;
      role: string;
      avatarUrl?: string | null;
      readAt?: string | null;
    }> = [],
    options?: {
      align?: 'left' | 'right';
      compact?: boolean;
      scopeLabel?: string;
    }
  ) => {
    if (!readers || readers.length === 0) return null;
    const maxVisible = 4;
    const visibleReaders = readers.slice(0, maxVisible);
    const overflowCount = Math.max(0, readers.length - maxVisible);
    const sizeClass = options?.compact ? 'w-3.5 h-3.5' : 'w-4 h-4';
    const textSizeClass = options?.compact ? 'text-[7.5px]' : 'text-[8px]';
    const alignClass = options?.align === 'left' ? 'justify-start' : 'justify-end';

    return (
      <Popover
        trigger={['hover', 'click']}
        placement="topRight"
        content={renderSeenBreakdownPopoverContent(readers, unseenBy, options?.scopeLabel)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center ${alignClass} gap-1 cursor-pointer select-none group/seen`}
        >
          {!options?.compact && (
            <span
              className="text-[10px] font-medium opacity-0 group-hover/seen:opacity-100 transition-opacity tabular-nums"
              style={{ color: isDark ? '#34d399' : '#059669' }}
            >
              Đã xem{readers.length > 1 ? ` (${readers.length})` : ''}
            </span>
          )}
          <div className="flex items-center -space-x-1">
            {visibleReaders.map((r) => (
              <div
                key={`mini-seen-${r.staffId}-${r.displayName}`}
                className="rounded-full transition-transform group-hover/seen:scale-105"
                style={{
                  boxShadow: `0 0 0 1.5px ${surfaceBg}`,
                }}
              >
                {renderUserAvatarNode({
                  staffId: r.staffId,
                  name: r.displayName,
                  avatarUrl: r.avatarUrl,
                  sizeClass,
                  roundedClass: 'rounded-full',
                  textSizeClass,
                })}
              </div>
            ))}
            {overflowCount > 0 && (
              <span
                className={`inline-flex items-center justify-center rounded-full font-extrabold tabular-nums leading-none ${sizeClass} ${textSizeClass}`}
                style={{
                  background: isDark ? '#1e293b' : '#e2e8f0',
                  color: isDark ? '#e2e8f0' : '#334155',
                  boxShadow: `0 0 0 1.5px ${surfaceBg}`,
                }}
              >
                +{overflowCount}
              </span>
            )}
          </div>
        </div>
      </Popover>
    );
  };

  const renderStagedAttachmentsStrip = (
    items: MosChatImageAttachment[],
    scope: 'main' | 'thread' | 'dock',
    convId?: string
  ) => {
    const showUploading = (scope === 'main' || scope === 'thread') && uploadingCount > 0;
    if (items.length === 0 && !showUploading) return null;
    return (
      <div className="flex items-center gap-2 pb-2 overflow-x-auto">
        {items.map((att, idx) => {
          const isImg = isImageAttachment(att);
          const ext = getFileExtension(att.name || att.url);
          const isPdf = ext.toLowerCase() === 'pdf' || att.mimeType === 'application/pdf';

          if (isImg) {
            return (
              <div
                key={att.id}
                data-no-chat-autofocus="true"
                className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 group/stage"
                style={{ border: `1px solid ${borderStrong}`, background: surfaceRaised }}
              >
                <Tooltip title="Nhấn để phóng to xem chi tiết">
                  <button
                    type="button"
                    data-no-chat-autofocus="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLightbox(items.filter(isImageAttachment), idx);
                    }}
                    className="w-full h-full block p-0 cursor-zoom-in relative"
                  >
                    <img src={resolveMediaUrl(att.url)} alt={att.name} className="w-full h-full object-cover block" />
                    <span className="opacity-0 group-hover/stage:opacity-100 transition-opacity absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                      <ZoomIn size={14} className="text-amber-400" />
                    </span>
                  </button>
                </Tooltip>
                <span
                  className="absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded text-[8.5px] font-bold leading-tight pointer-events-none"
                  style={{ background: 'rgba(0,0,0,0.75)', color: '#fbbf24' }}
                >
                  {att.source === 'clipboard' ? '⌘V' : att.source === 'drive' ? 'Drive' : 'Ảnh'}
                </span>
                <Tooltip title="Bỏ hình này">
                  <button
                    type="button"
                    aria-label="Bỏ hình đính kèm"
                    data-no-chat-autofocus="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStagedAttachment(att.id, scope, convId);
                    }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/80 text-white inline-flex items-center justify-center cursor-pointer hover:bg-rose-500 z-10"
                  >
                    <X size={10} />
                  </button>
                </Tooltip>
              </div>
            );
          }

          return (
            <div
              key={att.id}
              data-no-chat-autofocus="true"
              className="relative h-14 min-w-[130px] max-w-[200px] px-2.5 rounded-lg flex items-center gap-2 shrink-0 group/stage border"
              style={{ border: `1px solid ${borderStrong}`, background: surfaceRaised }}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-extrabold text-[10px] ${
                  isPdf
                    ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                }`}
              >
                {isPdf ? <FileText size={18} /> : <File size={18} />}
              </div>
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-[11px] font-semibold truncate" title={att.name} style={{ color: token.colorText }}>
                  {att.name}
                </p>
                <div className="flex items-center gap-1.5 text-[9.5px]" style={{ color: token.colorTextSecondary }}>
                  <span className="font-extrabold">{ext}</span>
                  {att.sizeBytes > 0 && <span className="tabular-nums">· {formatFileSize(att.sizeBytes)}</span>}
                </div>
              </div>
              <Tooltip title="Bỏ tệp này">
                <button
                  type="button"
                  aria-label="Bỏ tệp đính kèm"
                  data-no-chat-autofocus="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStagedAttachment(att.id, scope, convId);
                  }}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/80 text-white inline-flex items-center justify-center cursor-pointer hover:bg-rose-500 z-10"
                >
                  <X size={10} />
                </button>
              </Tooltip>
            </div>
          );
        })}
        {showUploading && (
          <div
            className="h-14 px-3 rounded-lg inline-flex items-center gap-1.5 text-[11px] font-semibold shrink-0"
            style={{ border: `1px dashed ${borderStrong}`, background: surfaceRaised, color: '#d4a84b' }}
          >
            <Loader2 size={14} className="animate-spin" />
            <span>Đang tải tệp ({uploadingCount})...</span>
          </div>
        )}
      </div>
    );
  };

  const renderReactionPickerContent = (
    msgId: string,
    msgObj?: MosChatMessage | MosChatThreadReply,
    replyId?: string
  ) => (
    <MosChatStickerAndEmojiPicker
      isDark={isDark}
      borderColor={borderColor}
      surfaceRaised={surfaceRaised}
      wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
      popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
      mode="reaction"
      hasUserReacted={(key) => hasUserReacted(msgObj, key)}
      onSelectEmoji={(emoji) => {
        setOpenStickerPopoverKey(null);
        void handleToggleReaction(msgId, emoji, replyId);
      }}
      onSelectSticker={(sticker) => {
        setOpenStickerPopoverKey(null);
        void handleToggleReaction(msgId, formatStickerToken(sticker.id), replyId);
      }}
    />
  );

  const renderComposerEmojiPickerContent = (target: 'main' | 'thread' | { dockConvId: string } = 'main') => (
    <MosChatStickerAndEmojiPicker
      isDark={isDark}
      borderColor={borderColor}
      surfaceRaised={surfaceRaised}
      wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
      popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
      mode="composer"
      onSelectEmoji={(emoji) => {
        if (target === 'main') {
          updateComposerText(composerTextRef.current + emoji);
          composerInputRef.current?.focus();
        } else if (target === 'thread') {
          setThreadInput((prev) => `${prev}${emoji}`);
          threadInputRef.current?.focus();
        } else if (typeof target === 'object' && target.dockConvId) {
          const cid = target.dockConvId;
          setDockInputs((p) => ({ ...p, [cid]: `${p[cid] || ''}${emoji}` }));
          dockInputRefs.current[cid]?.focus();
        }
      }}
      onSelectSticker={(sticker) => {
        setOpenStickerPopoverKey(null);
        void handleSendSticker(sticker, target);
      }}
    />
  );

  if (!canUserAccessChat) {
    return null;
  }

  return (
    <>
      {messageContextHolder}
      {notificationContextHolder}
      {/* Hidden File Input for Local Drive & Google Drive Desktop Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif,.HEIC,.HEIF,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.zip,.rar,.7z"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const target = uploadTargetRef.current;
            void handleProcessImageFiles(e.target.files, 'upload', target.scope, target.convId);
          }
        }}
      />

      {/* ================= MOS CHAT BACKDROP / OVERLAY (DIM + BLUR + CLICK-OUTSIDE TO CLOSE) ================= */}
      {!standalone && (
        <div
          aria-hidden="true"
          data-testid="mos-chat-backdrop"
          onClick={() => {
            if (isResizingTarget || justFinishedResizingRef.current) return;
            onClose?.();
          }}
          className={`fixed inset-0 transition-opacity duration-300 ${
            open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: isMobile ? 1190 : 990,
          }}
        />
      )}

      {/* ================= GOOGLE CHAT RIGHT WORKSPACE PANEL (FHD, VECTOR ICONS + TOOLTIPS) ================= */}
      <section
        aria-label="mOS Google Chat Workspace"
        className="mos-chat-theme-scope"
        style={{
          position: 'fixed',
          top: standalone ? 0 : isMobile ? 0 : 52,
          right: 0,
          bottom: 0,
          left: standalone || isMobile ? 0 : undefined,
          width: standalone ? '100vw' : isMobile ? '100vw' : maximized ? 'calc(100vw - 224px)' : panelWidth,
          maxWidth: standalone ? '100vw' : isMobile ? '100vw' : 'calc(100vw - 56px)',
          background: surfaceBg,
          color: token.colorText,
          borderLeft:
            standalone || isMobile
              ? 'none'
              : `1px solid ${isResizingTarget === 'panel' || hoverResizeHandle === 'panel' ? accentColor : borderStrong}`,
          boxShadow: standalone ? 'none' : 'var(--mos-shadow)',
          display: 'flex',
          zIndex: standalone ? 100 : isMobile ? 1200 : 995,
          transform: standalone || open ? 'translateX(0)' : 'translateX(104%)',
          transition: isResizingTarget
            ? 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
            : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), width 0.2s ease',
        }}
      >
        {/* LEFT EDGE RESIZE HANDLE (Drag to resize chat panel width, double-click to reset) */}
        {!standalone && !isMobile && (
          <Tooltip
            title="Kéo sang trái/phải để thay đổi kích thước khung Chat (Tự động lưu riêng cho bạn · Nhấp đúp để đặt lại mặc định)"
            placement="left"
            mouseEnterDelay={0.5}
          >
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Kéo để thay đổi chiều rộng khung Chat"
              data-no-chat-autofocus="true"
              onMouseEnter={() => setHoverResizeHandle('panel')}
              onMouseLeave={() => setHoverResizeHandle((prev) => (prev === 'panel' ? null : prev))}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (maximized && typeof window !== 'undefined') {
                  const maxAllowed = Math.max(520, window.innerWidth - 56);
                  const nextW = Math.max(520, Math.min(maxAllowed, Math.round(window.innerWidth - e.clientX)));
                  maximizedRef.current = false;
                  panelWidthRef.current = nextW;
                  setMaximized(false);
                  setPanelWidth(nextW);
                  persistPersonalLayout({ maximized: false, panelWidth: nextW });
                }
                setIsResizingTarget('panel');
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const resetW = typeof window !== 'undefined' && window.innerWidth >= 1920 ? 1080 : 960;
                maximizedRef.current = false;
                panelWidthRef.current = resetW;
                setMaximized(false);
                setPanelWidth(resetW);
                persistPersonalLayout({ maximized: false, panelWidth: resetW });
              }}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: -5,
                width: 10,
                cursor: 'ew-resize',
                zIndex: 35,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                className="rounded-full transition-all"
                style={{
                  width: isResizingTarget === 'panel' || hoverResizeHandle === 'panel' ? 4 : 2,
                  height: isResizingTarget === 'panel' || hoverResizeHandle === 'panel' ? 56 : 36,
                  background:
                    isResizingTarget === 'panel' || hoverResizeHandle === 'panel'
                      ? accentColor
                      : isDark
                        ? 'rgba(148, 163, 184, 0.32)'
                        : 'rgba(100, 116, 139, 0.28)',
                  boxShadow: isResizingTarget === 'panel' ? `0 0 10px ${accentBorder}` : 'none',
                }}
              />
              {isResizingTarget === 'panel' && (
                <div
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums shadow-lg pointer-events-none"
                  style={{
                    position: 'absolute',
                    left: -64,
                    background: surfaceRaised,
                    color: accentColor,
                    border: `1px solid ${accentBorder}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {panelWidth}px
                </div>
              )}
            </div>
          </Tooltip>
        )}

        {isMobile ? (
          <div className="w-full h-full flex flex-col relative bg-slate-950">
            {/* Top Close Bar on mobile overlay */}
            <div className="absolute top-[max(env(safe-area-inset-top),14px)] right-3 z-50">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700/80 active:scale-95 shadow-md"
                aria-label="Đóng Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <MosChatProvider
              currentUser={currentUser}
              initialConvId={activeConvId}
              onUnreadCountChange={onUnreadCountChange}
            >
              <MosChatMobileApp standalone={false} />
            </MosChatProvider>
          </div>
        ) : (
          <>
            {/* LEFT COLUMN: NAVIGATION, FILTERS, 1-1 & SPACES */}
            <MosChatSidebar
              isMobile={isMobile}
              mobileActiveView={mobileActiveView}
              setMobileActiveView={setMobileActiveView}
              sidebarWidth={sidebarWidth}
              setSidebarWidth={setSidebarWidth}
              isResizingTarget={isResizingTarget}
              setIsResizingTarget={setIsResizingTarget}
              hoverResizeHandle={hoverResizeHandle}
              setHoverResizeHandle={setHoverResizeHandle}
              sidebarWidthRef={sidebarWidthRef}
              persistPersonalLayout={persistPersonalLayout}
              presence={presence}
              setPresence={setPresence}
              currentUser={currentUser}
              isDannyAccount={isDannyAccount}
              accessConfig={accessConfig}
              userPrefs={userPrefs}
              onOpenAccessConfigModal={() => {
                setAccessConfigTab('chat');
                setAccessConfigModalOpen(true);
              }}
              onOpenSidebarCustomizeModal={(tab) => {
                setSidebarCustomizeTab(tab);
                setSidebarCustomizeModalOpen(true);
              }}
              onOpenNewRoomModal={(type) => {
                if (type) setNewRoomType(type);
                setNewRoomModalOpen(true);
              }}
              onClose={onClose}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sidebarFilter={sidebarFilter}
              setSidebarFilter={setSidebarFilter}
              activeSubtab={activeSubtab}
              setActiveSubtab={setActiveSubtab}
              sidebarSections={sidebarSections}
              visibleConversations={visibleConversations}
              activeConversation={activeConversation}
              uniqueTasks={uniqueTasks}
              selectConversation={selectConversation}
              togglePinConversation={togglePinConversation}
              toggleManualUnreadConversation={toggleManualUnreadConversation}
              toggleMuteConversation={toggleMuteConversation}
              onChangeChannelNotificationOverride={handleChangeChannelNotificationOverride}
              moveConversationToSection={moveConversationToSection}
              moveConversationOrderInSection={moveConversationOrderInSection}
              reorderConversationByDragDrop={reorderConversationByDragDrop}
              toggleCollapseSection={toggleCollapseSection}
              toggleUnreadOnlySection={toggleUnreadOnlySection}
              handleMoveSectionOrder={handleMoveSectionOrder}
              handleDeleteCustomSection={handleDeleteCustomSection}
              handleLeaveOrJoinSpace={handleLeaveOrJoinSpace}
              getEffectiveUnreadCount={getEffectiveUnreadCount}
              formatChatPreviewWithStickers={formatChatPreviewWithStickers}
              isConversationParticipantOnline={isConversationParticipantOnline}
              isMessageFromCurrentUser={isMessageFromCurrentUser}
              getMessageReadBreakdown={getMessageReadBreakdown}
              renderReadStatusCheckmark={renderReadStatusCheckmark}
              renderUserAvatarNode={renderUserAvatarNode}
              setDockedConvIds={setDockedConvIds}
              toggleHideConversation={toggleHideConversation}
              setActiveConvId={setActiveConvId}
              setSpaceConfigModalOpen={setSpaceConfigModalOpen}
              setEditingSectionId={setEditingSectionId}
              setEditingSectionName={setEditingSectionName}
              setQuickCreateSectionTargetConvId={setQuickCreateSectionTargetConvId}
              setQuickCreateSectionName={setQuickCreateSectionName}
              setQuickCreateSectionModalOpen={setQuickCreateSectionModalOpen}
              isDark={isDark}
              token={token}
              surfaceBg={surfaceBg}
              surfaceRaised={surfaceRaised}
              borderColor={borderColor}
              accentColor={accentColor}
            />

            {/* CENTER COLUMN: CONVERSATION STREAM / TASKS HUB */}
            <div
              className="flex-1 flex flex-col min-w-0"
              style={{
                background: canvasBg,
                display: isMobile && mobileActiveView !== 'conversation' ? 'none' : 'flex',
              }}
            >
              {/* Conversation Header */}
              <div
                className="h-[52px] px-3 flex items-center justify-between gap-2 shrink-0"
                style={{ background: surfaceBg, borderBottom: `1px solid ${borderColor}` }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isMobile && (
                    <button
                      type="button"
                      aria-label="Quay lại danh sách hội thoại"
                      onClick={() => {
                        setMobileActiveView('inbox');
                        if (activeSubtab === 'tasks') {
                          setActiveSubtab('chat');
                        }
                      }}
                      className="w-7 h-7 -ml-1 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10 shrink-0"
                      style={{ color: token.colorText }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  {activeSubtab === 'tasks' ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0"
                        style={{
                          background: 'rgba(212, 168, 75, 0.18)',
                          color: '#d4a84b',
                        }}
                      >
                        <AlarmClock size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-[13.5px] truncate">Kho Công Việc & Nhắc Hẹn</div>
                        <div className="text-[11px] text-slate-400">
                          {uniqueTasks.filter((t) => !t.done).length} đầu việc chưa xong
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {activeConversation?.type === 'space' ? (
                        <Tooltip title="Cài đặt & Cấu hình Không gian (Tên, Emoji, Màu sắc)">
                          <div
                            onClick={() => setSpaceConfigModalOpen(true)}
                            role="button"
                            tabIndex={0}
                            aria-label="Cài đặt Không gian"
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-base shrink-0 cursor-pointer hover:scale-105 transition-transform"
                            style={{
                              background: `${activeConversation?.color || '#10b981'}24`,
                              color: activeConversation?.color || '#10b981',
                            }}
                          >
                            {activeConversation.avatar && isSpaceEmoji(activeConversation.avatar) ? (
                              <span className="select-none leading-none">{activeConversation.avatar}</span>
                            ) : (
                              <Hash size={16} />
                            )}
                          </div>
                        </Tooltip>
                      ) : (
                        renderUserAvatarNode({
                          staffId: activeConversation?.isSelf
                            ? currentUser?.id || 'me'
                            : activeConversation?.participantStaffId,
                          name: activeConversation?.name,
                          rawAvatar: activeConversation?.avatar,
                          bgColor: activeConversation?.color || '#10b981',
                          sizeClass: 'w-8 h-8',
                          roundedClass: 'rounded-full',
                          isOnline: isConversationParticipantOnline(activeConversation),
                          isAiBot: activeConversation?.id === AI_COPILOT_CONV_ID,
                          isSelfBookmark: Boolean(
                            activeConversation?.isSelf || activeConversation?.id.startsWith('dm-self-')
                          ),
                        })
                      )}
                      <div className="min-w-0 flex items-center gap-1.5">
                        <span className="font-extrabold text-[13.5px] truncate">{activeConversation?.name}</span>
                        {activeConversation && (userPrefs.pinnedIds || []).includes(activeConversation.id) && (
                          <Tooltip title="Đã ghim lên đầu mục (Pinned)">
                            <Pin size={12} className="text-amber-400 fill-amber-400 shrink-0" />
                          </Tooltip>
                        )}
                        {activeConversation && (userPrefs.manualUnreadIds || []).includes(activeConversation.id) && (
                          <Tooltip title="Đã đánh dấu chưa đọc (Mark as unread)">
                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-400 shrink-0 border border-rose-500/30">
                              Chưa đọc
                            </span>
                          </Tooltip>
                        )}
                        {activeConversation?.roleTag && activeConversation?.type !== 'space' && (
                          <span
                            className="inline-flex items-center justify-center leading-none py-1 px-2 rounded-full text-[10px] font-bold tabular-nums shrink-0"
                            style={{
                              background:
                                activeConversation.id === AI_COPILOT_CONV_ID
                                  ? 'rgba(139, 92, 246, 0.16)'
                                  : 'rgba(16, 185, 129, 0.14)',
                              color: activeConversation.id === AI_COPILOT_CONV_ID ? '#a78bfa' : '#10b981',
                            }}
                          >
                            {activeConversation.roleTag}
                          </span>
                        )}
                        {activeConversation?.type === 'space' && (
                          <Tooltip
                            title={`Xem và quản lý thành viên Không gian (${activeConversation.memberCount || activeConversation.memberIds?.length || 1} thành viên)`}
                          >
                            <button
                              type="button"
                              aria-label="Quản lý thành viên Không gian"
                              onClick={() => setSpaceMembersModalOpen(true)}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors cursor-pointer hover:opacity-90 ml-0.5 shrink-0"
                              style={{
                                background: 'rgba(59, 130, 246, 0.15)',
                                color: '#3b82f6',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                              }}
                            >
                              <Users size={13} />
                            </button>
                          </Tooltip>
                        )}
                        {activeConversation?.type === 'space' && (
                          <Tooltip title="Cài đặt & Cấu hình Không gian (Tên, Emoji, Màu sắc)">
                            <button
                              type="button"
                              aria-label="Cài đặt Không gian"
                              onClick={() => setSpaceConfigModalOpen(true)}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors cursor-pointer hover:opacity-90 ml-0.5 shrink-0"
                              style={{
                                background: 'rgba(59, 130, 246, 0.15)',
                                color: '#3b82f6',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                              }}
                            >
                              <Settings size={13} />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Sub-tabs: Chat | Tasks | Pinned */}
                <div
                  className="flex items-center gap-0.5 p-0.5 rounded-lg"
                  style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                >
                  <Tooltip title="Luồng trò chuyện">
                    <button
                      type="button"
                      aria-label="Luồng trò chuyện"
                      onClick={() => setActiveSubtab('chat')}
                      className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors"
                      style={{
                        background: activeSubtab === 'chat' ? surfaceBg : 'transparent',
                        color: activeSubtab === 'chat' ? '#d4a84b' : token.colorTextSecondary,
                      }}
                    >
                      <MessageSquare size={14} />
                    </button>
                  </Tooltip>

                  <Tooltip title={`Công việc & Nhắc hẹn (${uniqueTasks.filter((t) => !t.done).length} đang mở)`}>
                    <button
                      type="button"
                      aria-label="Tab Tasks"
                      onClick={() => setActiveSubtab('tasks')}
                      className="h-7 px-1.5 rounded-md inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer tabular-nums transition-colors"
                      style={{
                        background: activeSubtab === 'tasks' ? surfaceBg : 'transparent',
                        color: activeSubtab === 'tasks' ? '#d4a84b' : token.colorTextSecondary,
                      }}
                    >
                      <CheckSquare size={14} />
                      <span className="text-amber-500 font-extrabold">{uniqueTasks.filter((t) => !t.done).length}</span>
                    </button>
                  </Tooltip>

                  <Tooltip
                    title={`Tin nhắn đã ghim (${activeConversation?.messages.filter((m) => m.pinned).length || 0})`}
                  >
                    <button
                      type="button"
                      aria-label="Tab tin nhắn đã ghim"
                      onClick={() => setActiveSubtab('pinned')}
                      className="h-7 px-1.5 rounded-md inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer tabular-nums transition-colors"
                      style={{
                        background: activeSubtab === 'pinned' ? surfaceBg : 'transparent',
                        color: activeSubtab === 'pinned' ? '#d4a84b' : token.colorTextSecondary,
                      }}
                    >
                      <Pin size={14} />
                      <span>{activeConversation?.messages.filter((m) => m.pinned).length || 0}</span>
                    </button>
                  </Tooltip>
                </div>

                {/* ── Header Right: Essential Icons + ⋯ More Overflow ── */}
                <div className="flex items-center gap-0.5">
                  {/* Group 1: Notification & Thread (feature toggles) */}
                  {/* Notification Settings Button (Tiered Notification Filter) */}
                  <Tooltip title="Cài đặt thông báo (Lọc tin nhắn & BUZZ)">
                    <button
                      type="button"
                      aria-label="Cài đặt thông báo"
                      onClick={() => setNotifSettingsModalOpen(true)}
                      className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors"
                      style={{
                        background:
                          userPrefs.notificationMode && userPrefs.notificationMode !== 'ALL'
                            ? 'rgba(59, 130, 246, 0.14)'
                            : 'transparent',
                        border: `1px solid ${
                          userPrefs.notificationMode && userPrefs.notificationMode !== 'ALL'
                            ? 'rgba(59, 130, 246, 0.35)'
                            : borderColor
                        }`,
                        color:
                          userPrefs.notificationMode && userPrefs.notificationMode !== 'ALL'
                            ? '#3b82f6'
                            : token.colorTextSecondary,
                      }}
                    >
                      <BellRing size={14} />
                    </button>
                  </Tooltip>

                  <Tooltip title="Đóng / Mở cột Luồng trả lời (Threads)">
                    <button
                      type="button"
                      aria-label="Đóng / Mở cột Luồng trả lời"
                      onClick={() => setThreadOpen((p) => !p)}
                      className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer"
                      style={{
                        background: threadOpen ? 'rgba(212, 168, 75, 0.16)' : 'transparent',
                        color: threadOpen ? '#d4a84b' : token.colorTextSecondary,
                      }}
                    >
                      <MessageSquareReply size={15} />
                    </button>
                  </Tooltip>

                  {/* ⋯ More overflow menu */}
                  <Dropdown
                    trigger={['click']}
                    placement="bottomRight"
                    menu={{
                      items: [
                        // MAI Voice toggle
                        {
                          key: 'mai-voice',
                          icon: maiVoiceAnnounceEnabled ? (
                            <Volume2 size={15} className="text-amber-500" />
                          ) : (
                            <VolumeX size={15} className="opacity-60" />
                          ),
                          label: (
                            <span style={{ color: maiVoiceAnnounceEnabled ? '#d4a84b' : undefined }}>
                              {maiVoiceAnnounceEnabled ? '@MAI đọc thông báo ✓ BẬT' : '@MAI đọc thông báo · Tắt'}
                            </span>
                          ),
                        },
                        // Pin conversation
                        ...(activeConversation
                          ? [
                              {
                                key: 'pin-conv',
                                icon: (
                                  <Pin
                                    size={15}
                                    className={
                                      (userPrefs.pinnedIds || []).includes(activeConversation.id)
                                        ? 'fill-amber-400 text-amber-400'
                                        : ''
                                    }
                                  />
                                ),
                                label: (
                                  <span
                                    style={{
                                      color: (userPrefs.pinnedIds || []).includes(activeConversation.id)
                                        ? '#d4a84b'
                                        : undefined,
                                    }}
                                  >
                                    {(userPrefs.pinnedIds || []).includes(activeConversation.id)
                                      ? 'Bỏ ghim cuộc trò chuyện ✓'
                                      : 'Ghim cuộc trò chuyện'}
                                  </span>
                                ),
                              },
                            ]
                          : []),
                        // Mark unread
                        ...(activeConversation && activeConversation.id !== AI_COPILOT_CONV_ID
                          ? [
                              {
                                key: 'mark-unread',
                                icon: (userPrefs.manualUnreadIds || []).includes(activeConversation.id) ? (
                                  <MailOpen size={15} className="text-rose-400" />
                                ) : (
                                  <Mail size={15} />
                                ),
                                label: (
                                  <span
                                    style={{
                                      color: (userPrefs.manualUnreadIds || []).includes(activeConversation.id)
                                        ? '#f43f5e'
                                        : undefined,
                                    }}
                                  >
                                    {(userPrefs.manualUnreadIds || []).includes(activeConversation.id)
                                      ? 'Đánh dấu đã đọc ✓'
                                      : 'Đánh dấu chưa đọc'}
                                  </span>
                                ),
                              },
                            ]
                          : []),
                        // Mini Dock (desktop only)
                        ...(!isMobile && activeConversation
                          ? [
                              {
                                key: 'mini-dock',
                                icon: <ExternalLink size={15} />,
                                label: 'Mở cửa sổ thu nhỏ (Mini Dock)',
                              },
                            ]
                          : []),
                        // Clear AI Chat (AI copilot only)
                        ...(activeConversation?.id === AI_COPILOT_CONV_ID
                          ? [
                              { type: 'divider' as const },
                              {
                                key: 'clear-ai',
                                icon: <Trash2 size={15} className="text-rose-400" />,
                                label: <span style={{ color: '#f43f5e' }}>Làm mới hội thoại MAI</span>,
                                danger: true,
                              },
                            ]
                          : []),
                        // Access config (Danny only)
                        ...(isDannyAccount
                          ? [
                              { type: 'divider' as const },
                              {
                                key: 'access-config',
                                icon: <ShieldCheck size={15} className="text-violet-400" />,
                                label: (
                                  <span style={{ color: '#a78bfa' }}>
                                    Phân quyền Đội nhóm
                                    {accessConfig.allowAllStaff ||
                                    accessConfig.allowedGroupKeys.length > 0 ||
                                    accessConfig.allowedStaffIds.length > 0
                                      ? ' ✓'
                                      : ''}
                                  </span>
                                ),
                              },
                            ]
                          : []),
                      ],
                      onClick: ({ key }) => {
                        if (key === 'mai-voice') {
                          const next = !maiVoiceAnnounceEnabled;
                          handleToggleMaiVoiceAnnounce(next);
                          if (next) {
                            antdMessage.success(
                              'Đã BẬT @MAI tự động phát âm thanh thông báo khẩn cấp khi bạn được tag'
                            );
                            void playNeuralSpeech('MAI đã sẵn sàng đọc thông báo khẩn cấp khi bạn được tag.', {
                              voice: 'vi-VN-HoaiMyNeural',
                              speed: ttsSpeed,
                            });
                          } else {
                            antdMessage.info('Đã TẮT @MAI đọc thông báo khẩn cấp');
                          }
                        } else if (key === 'pin-conv' && activeConversation) {
                          togglePinConversation(activeConversation.id);
                        } else if (key === 'mark-unread' && activeConversation) {
                          toggleManualUnreadConversation(activeConversation);
                        } else if (key === 'mini-dock') {
                          handlePopOutToMiniDock();
                        } else if (key === 'clear-ai') {
                          handleClearAiChat();
                        } else if (key === 'access-config') {
                          setAccessConfigTab(activeConversation?.id === AI_COPILOT_CONV_ID ? 'ai' : 'chat');
                          setAccessConfigModalOpen(true);
                        }
                      },
                    }}
                  >
                    <Tooltip title="Thêm tùy chọn">
                      <button
                        type="button"
                        aria-label="Thêm tùy chọn"
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <MoreVertical size={15} />
                      </button>
                    </Tooltip>
                  </Dropdown>

                  {/* 1px Separator */}
                  <div
                    className="mx-1 self-stretch"
                    style={{
                      width: 1,
                      background: token.colorBorderSecondary,
                      marginTop: 4,
                      marginBottom: 4,
                    }}
                  />

                  {/* Group 2: Window controls */}
                  {!isMobile && (
                    <Tooltip title={maximized ? 'Thu hẹp khung Chat' : 'Phóng to toàn màn hình'}>
                      <button
                        type="button"
                        aria-label="Phóng to / Thu hẹp khung Chat"
                        onClick={() => {
                          const nextVal = !maximized;
                          maximizedRef.current = nextVal;
                          setMaximized(nextVal);
                          persistPersonalLayout({ maximized: nextVal });
                        }}
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
                        style={{ color: token.colorTextSecondary }}
                      >
                        {maximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                      </button>
                    </Tooltip>
                  )}

                  {!standalone && (
                    <Tooltip title="Mở trong tab riêng biệt (Pop-out sang tab mới)">
                      <button
                        type="button"
                        aria-label="Mở tab Chat riêng biệt"
                        onClick={() => {
                          const params = new URLSearchParams();
                          if (activeConversation?.id) params.set('convId', activeConversation.id);
                          if (activeThreadMsgId) params.set('msgId', activeThreadMsgId);
                          if (activeSubtab && activeSubtab !== 'chat') params.set('tab', activeSubtab);
                          const qs = params.toString();
                          window.open(qs ? `/chat?${qs}` : '/chat', 'mOS_Chat_Window');
                          onClose();
                        }}
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <ExternalLink size={15} />
                      </button>
                    </Tooltip>
                  )}

                  {standalone && (
                    <Tooltip title="Ghim lại vào CRM (Mở dạng cửa sổ nhúng trượt phải)">
                      <button
                        type="button"
                        aria-label="Ghim lại vào CRM"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.localStorage.setItem('mos_chat_display_mode_v1', 'embedded');
                            window.localStorage.setItem('mos_chat_is_open_v1', 'true');
                            if (window.opener) {
                              try {
                                window.opener.focus();
                                const evt = new CustomEvent('mos-chat:open', {
                                  detail: {
                                    conversationId: activeConversation?.id,
                                    messageId: activeThreadMsgId || undefined,
                                    forceMode: 'embedded',
                                  },
                                });
                                window.opener.dispatchEvent(evt);
                                window.close();
                                return;
                              } catch {}
                            }
                            window.location.href = '/dashboard';
                          }
                        }}
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <PanelRightOpen size={15} />
                      </button>
                    </Tooltip>
                  )}

                  <Tooltip title={standalone ? 'Quay lại mOS Dashboard' : 'Đóng mOS Chat (⌘J)'}>
                    <button
                      type="button"
                      aria-label="Đóng mOS Chat"
                      onClick={() => {
                        if (standalone) {
                          if (typeof window !== 'undefined' && window.opener) {
                            window.close();
                          } else if (typeof window !== 'undefined') {
                            window.location.href = '/dashboard';
                          }
                          return;
                        }
                        onClose();
                      }}
                      className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-rose-500/15 hover:text-rose-400"
                      style={{ color: token.colorTextSecondary }}
                    >
                      <X size={16} />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* VIEW 1: GOOGLE CHAT LEFT-ALIGNED STREAM */}
              {activeSubtab === 'chat' && (
                <div
                  data-chat-main-stream="true"
                  className="flex-1 flex flex-col min-h-0 relative"
                  onDragOver={(e) => {
                    if (draggingRootMsgId || e.dataTransfer?.types?.includes('application/x-mos-chat-msg-id')) {
                      return;
                    }
                    e.preventDefault();
                    if (!isDraggingOver) setIsDraggingOver(true);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setIsDraggingOver(false);
                    }
                  }}
                  onDrop={(e) => {
                    if (draggingRootMsgId || e.dataTransfer?.types?.includes('application/x-mos-chat-msg-id')) {
                      return;
                    }
                    e.preventDefault();
                    setIsDraggingOver(false);
                    setIsDraggingOverThread(false);
                    if (e.dataTransfer?.files?.length) {
                      void handleProcessImageFiles(e.dataTransfer.files, 'upload', 'main');
                    }
                  }}
                >
                  <MosChatMessageFeed
                    isMobile={isMobile}
                    activeConversation={activeConversation}
                    currentUser={currentUser}
                    isDark={isDark}
                    token={token}
                    surfaceRaised={surfaceRaised}
                    borderColor={borderColor}
                    borderStrong={borderStrong}
                    accentSoftBg={accentSoftBg}
                    accentBorder={accentBorder}
                    pinnedMessages={pinnedMessages}
                    pinnedBannerIndex={pinnedBannerIndex}
                    setPinnedBannerIndex={setPinnedBannerIndex}
                    navigateToMessage={navigateToMessage}
                    setActiveSubtab={setActiveSubtab}
                    handleTogglePin={handleTogglePin}
                    formatMoveTargetSnippet={formatMoveTargetSnippet}
                    mainMessagesContainerRef={mainMessagesContainerRef}
                    messagesEndRef={messagesEndRef}
                    uniqueTasks={uniqueTasks}
                    isMessageFromCurrentUser={isMessageFromCurrentUser}
                    getMessageReadBreakdown={getMessageReadBreakdown}
                    stoppedReadersByMsgId={stoppedReadersByMsgId}
                    canManageChatThreads={canManageChatThreads}
                    AI_COPILOT_CONV_ID={AI_COPILOT_CONV_ID}
                    draggingRootMsgId={draggingRootMsgId}
                    setDraggingRootMsgId={setDraggingRootMsgId}
                    dragOverTargetMsgId={dragOverTargetMsgId}
                    setDragOverTargetMsgId={setDragOverTargetMsgId}
                    setDragOverThreadPane={setDragOverThreadPane}
                    handleMoveThreadItem={handleMoveThreadItem}
                    highlightedMsgId={highlightedMsgId}
                    getMemberNickname={getMemberNickname}
                    renderReadStatusCheckmark={renderReadStatusCheckmark}
                    renderUserAvatarNode={renderUserAvatarNode}
                    expandedThinkingIds={expandedThinkingIds}
                    setExpandedThinkingIds={setExpandedThinkingIds}
                    editingMessageId={editingMessageId}
                    editingReplyId={editingReplyId}
                    editingText={editingText}
                    setEditingText={setEditingText}
                    handleCancelEdit={handleCancelEdit}
                    handleSaveEdit={handleSaveEdit}
                    isSavingEdit={isSavingEdit}
                    isComposingRef={isComposingRef}
                    lastCompositionEndMsRef={lastCompositionEndMsRef}
                    setHistoryModalMessage={setHistoryModalMessage}
                    setHistoryModalOpen={setHistoryModalOpen}
                    isDannyAccount={isDannyAccount}
                    handleRestoreMessage={handleRestoreMessage}
                    handleMessageTap={handleMessageTap}
                    heartFlyMsgId={heartFlyMsgId}
                    renderRichTextMessage={renderRichTextMessage}
                    appliedActionIds={appliedActionIds}
                    handleExecuteAiAction={handleExecuteAiAction}
                    speakingMsgId={speakingMsgId}
                    ttsSpeed={ttsSpeed}
                    handleSpeakAiMessage={handleSpeakAiMessage}
                    handleSetTtsSpeed={handleSetTtsSpeed}
                    hasUserReacted={hasUserReacted}
                    handleToggleReaction={handleToggleReaction}
                    mobileActiveMsgId={mobileActiveMsgId}
                    openMovePopoverKey={openMovePopoverKey}
                    setOpenMovePopoverKey={setOpenMovePopoverKey}
                    openStickerPopoverKey={openStickerPopoverKey}
                    setOpenStickerPopoverKey={setOpenStickerPopoverKey}
                    renderReactionPickerContent={renderReactionPickerContent}
                    handleOpenThread={handleOpenThread}
                    openTaskModalFromMessage={openTaskModalFromMessage}
                    isStrictDannySuperAdmin={isStrictDannySuperAdmin}
                    openMissionModalFromChat={openMissionModalFromChat}
                    handleBuzzMessage={handleBuzzMessage}
                    handleStartEdit={handleStartEdit}
                    handleDeleteMessage={handleDeleteMessage}
                    renderMiniSeenAvatarStack={renderMiniSeenAvatarStack}
                    aiThinkingActive={aiThinkingActive}
                    aiElapsedSec={aiElapsedSec}
                    getThreadReplyReadBreakdown={getThreadReplyReadBreakdown}
                    renderTaskCard={renderTaskCard}
                    renderLiveMissionCard={renderLiveMissionCard}
                    workflowInstances={workflowInstances}
                    setWorkflowInstances={setWorkflowInstances}
                    currentUserStaffMember={currentUserStaffMember}
                    fetchBootstrap={fetchBootstrap}
                    setLightboxImage={setLightboxImage}
                    movingThreadItemKey={movingThreadItemKey}
                    threadOpen={threadOpen}
                    activeThreadMessage={activeThreadMessage}
                    isDraggingOver={isDraggingOver}
                    antdMessage={antdMessage}
                    renderMessageAttachments={renderMessageAttachments}
                    openCustomerDetail={openCustomerDetail}
                  />

                  {/* Clean Single-Line Composer with Staging Thumbnails, AI Quick Prompts & Icon-only Toolbar */}
                  <MosChatComposer
                    isMobile={isMobile}
                    activeConversation={activeConversation}
                    currentUser={currentUser}
                    canUseAiCopilot={canUseAiCopilot}
                    isStrictDannySuperAdmin={isStrictDannySuperAdmin}
                    aiThinkingActive={aiThinkingActive}
                    isDark={isDark}
                    surfaceBg={surfaceBg}
                    surfaceRaised={surfaceRaised}
                    borderColor={borderColor}
                    borderStrong={borderStrong}
                    composerTextRef={composerTextRef}
                    composerHasText={composerHasText}
                    updateComposerText={updateComposerText}
                    setComposerText={setComposerText}
                    composerCursorPos={composerCursorPosRef.current}
                    setComposerCursorPos={setComposerCursorPos}
                    composerInputRef={composerInputRef}
                    stagedAttachments={stagedAttachments}
                    renderStagedAttachmentsStrip={renderStagedAttachmentsStrip}
                    stagedCustomerCard={stagedCustomerCard}
                    setStagedCustomerCard={setStagedCustomerCard}
                    isUrgentSend={isUrgentSend}
                    setIsUrgentSend={setIsUrgentSend}
                    handleSendMessage={handleSendMessage}
                    handleSendMain={handleSendMain}
                    triggerFilePicker={triggerFilePicker}
                    handleSendQuickCustomerCard={handleSendQuickCustomerCard}
                    handleOpenCustomerPicker={handleOpenCustomerPicker}
                    openTaskModalFromMessage={openTaskModalFromMessage}
                    checkForMentionTrigger={checkForMentionTrigger}
                    handleClipboardPaste={handleClipboardPaste}
                    handleMentionKeyDown={handleMentionKeyDown}
                    handleApplyFormat={handleApplyFormat}
                    renderMentionAutocompleteDropdown={renderMentionAutocompleteDropdown}
                    renderAppleNotesFormatToolbar={renderAppleNotesFormatToolbar}
                    renderComposerEmojiPickerContent={renderComposerEmojiPickerContent}
                    renderRichTextMessage={renderRichTextMessage}
                    setDriveLinkModalOpen={setDriveLinkModalOpen}
                    uploadTargetRef={uploadTargetRef}
                    setTriggerWorkflowModalOpen={setTriggerWorkflowModalOpen}
                    setInitialWorkflowCode={setInitialWorkflowCode}
                    setRichEditorModalState={setRichEditorModalState}
                    isComposingRef={isComposingRef}
                    lastCompositionEndMsRef={lastCompositionEndMsRef}
                  />
                </div>
              )}

              {/* VIEW 2: TASKS & REMINDERS HUB (Task Manager - MOS-BUG-129) */}
              {activeSubtab === 'tasks' && (
                <MosChatTasksPane
                  activeConversation={activeConversation}
                  isDark={isDark}
                  surfaceBg={surfaceBg}
                  surfaceRaised={surfaceRaised}
                  borderColor={borderColor}
                  token={token}
                  uniqueTasks={uniqueTasks}
                  taskCounts={taskCounts}
                  taskSearchQuery={taskSearchQuery}
                  setTaskSearchQuery={setTaskSearchQuery}
                  taskScopeFilter={taskScopeFilter}
                  setTaskScopeFilter={setTaskScopeFilter}
                  taskFilter={taskFilter}
                  setTaskFilter={setTaskFilter}
                  currentSpaceTasks={currentSpaceTasks}
                  otherSpaceTasks={otherSpaceTasks}
                  filteredTasks={filteredTasks}
                  conversations={conversations}
                  collapseOtherSpaces={collapseOtherSpaces}
                  setCollapseOtherSpaces={setCollapseOtherSpaces}
                  triggerTaskReminderAlert={triggerTaskReminderAlert}
                  openTaskModalFromMessage={openTaskModalFromMessage}
                  renderTaskCard={renderTaskCard}
                  renderLiveMissionCard={renderLiveMissionCard}
                />
              )}

              {/* VIEW 3: PINNED MESSAGES */}
              {activeSubtab === 'pinned' && (
                <MosChatPinnedPane
                  pinnedMessages={pinnedMessages}
                  activeConversation={activeConversation}
                  setActiveSubtab={setActiveSubtab}
                  surfaceBg={surfaceBg}
                  borderColor={borderColor}
                  borderStrong={borderStrong}
                  navigateToMessage={navigateToMessage}
                  handleTogglePin={handleTogglePin}
                  renderMessageAttachments={renderMessageAttachments}
                />
              )}
            </div>

            {/* RIGHT SIDE THREAD PANE (Google Spaces Threading) */}
            <MosChatThreadDrawer
              threadOpen={threadOpen}
              activeThreadMessage={activeThreadMessage}
              activeConversation={activeConversation}
              currentUser={currentUser}
              isMobile={isMobile}
              mobileActiveView={mobileActiveView}
              setMobileActiveView={setMobileActiveView}
              threadWidth={threadWidth}
              setThreadWidth={setThreadWidth}
              persistPersonalLayout={persistPersonalLayout}
              isResizingTarget={isResizingTarget}
              setIsResizingTarget={setIsResizingTarget}
              hoverResizeHandle={hoverResizeHandle}
              setHoverResizeHandle={setHoverResizeHandle}
              surfaceBg={surfaceBg}
              surfaceRaised={surfaceRaised}
              canvasBg={canvasBg}
              borderColor={borderColor}
              borderStrong={borderStrong}
              accentColor={accentColor}
              accentSoftBg={accentSoftBg}
              accentBorder={accentBorder}
              isDark={isDark}
              token={token}
              draggingRootMsgId={draggingRootMsgId}
              setDraggingRootMsgId={setDraggingRootMsgId}
              dragOverTargetMsgId={dragOverTargetMsgId}
              setDragOverTargetMsgId={setDragOverTargetMsgId}
              dragOverThreadPane={dragOverThreadPane}
              setDragOverThreadPane={setDragOverThreadPane}
              isDraggingOverThread={isDraggingOverThread}
              setIsDraggingOverThread={setIsDraggingOverThread}
              isDraggingOver={isDraggingOver}
              setIsDraggingOver={setIsDraggingOver}
              handleMoveThreadItem={handleMoveThreadItem}
              handleProcessImageFiles={handleProcessImageFiles}
              handleClipboardPaste={handleClipboardPaste}
              formatMoveTargetSnippet={formatMoveTargetSnippet}
              setThreadOpen={setThreadOpen}
              navigateToMessage={navigateToMessage}
              highlightedMsgId={highlightedMsgId}
              renderUserAvatarNode={renderUserAvatarNode}
              renderRichTextMessage={renderRichTextMessage}
              speakingMsgId={speakingMsgId}
              ttsSpeed={ttsSpeed}
              handleSpeakAiMessage={handleSpeakAiMessage}
              handleSetTtsSpeed={handleSetTtsSpeed}
              threadMessagesContainerRef={threadMessagesContainerRef}
              threadMessagesEndRef={threadMessagesEndRef}
              isMessageFromCurrentUser={isMessageFromCurrentUser}
              canManageChatThreads={canManageChatThreads}
              AI_COPILOT_CONV_ID={AI_COPILOT_CONV_ID}
              getMemberNickname={getMemberNickname}
              renderReadStatusCheckmark={renderReadStatusCheckmark}
              renderMiniSeenAvatarStack={renderMiniSeenAvatarStack}
              editingReplyId={editingReplyId}
              editingText={editingText}
              setEditingText={setEditingText}
              handleCancelEdit={handleCancelEdit}
              handleSaveEdit={handleSaveEdit}
              isSavingEdit={isSavingEdit}
              isComposingRef={isComposingRef}
              lastCompositionEndMsRef={lastCompositionEndMsRef}
              handleRestoreMessage={handleRestoreMessage}
              isDannyAccount={isDannyAccount}
              hasUserReacted={hasUserReacted}
              handleToggleReaction={handleToggleReaction}
              openStickerPopoverKey={openStickerPopoverKey}
              setOpenStickerPopoverKey={setOpenStickerPopoverKey}
              renderReactionPickerContent={renderReactionPickerContent}
              handleBuzzMessage={handleBuzzMessage}
              handleStartEdit={handleStartEdit}
              handleDeleteMessage={handleDeleteMessage}
              threadInputRef={threadInputRef}
              threadInput={threadInput}
              setThreadInput={setThreadInput}
              handleSendThreadReply={handleSendThreadReply}
              threadAttachments={threadAttachments}
              setThreadAttachments={setThreadAttachments}
              triggerFilePicker={triggerFilePicker}
              setRichEditorModalState={setRichEditorModalState}
              renderComposerEmojiPickerContent={renderComposerEmojiPickerContent}
              antdMessage={antdMessage}
              getThreadReplyReadBreakdown={getThreadReplyReadBreakdown}
              stoppedReadersByReplyId={stoppedReadersByReplyId}
              aiThinkingActive={aiThinkingActive}
              aiElapsedSec={aiElapsedSec}
              renderStagedAttachmentsStrip={renderStagedAttachmentsStrip}
              renderMentionAutocompleteDropdown={renderMentionAutocompleteDropdown}
              renderAppleNotesFormatToolbar={renderAppleNotesFormatToolbar}
              checkForMentionTrigger={checkForMentionTrigger}
              handleMentionKeyDown={handleMentionKeyDown}
              handleApplyFormat={handleApplyFormat}
              handleSmartListEnterKey={handleSmartListEnterKey}
              setThreadCursorPos={setThreadCursorPos}
              canUseAiCopilot={canUseAiCopilot}
              isStrictDannySuperAdmin={isStrictDannySuperAdmin}
              openMissionModalFromChat={openMissionModalFromChat}
              uniqueTasks={uniqueTasks}
              setSaveThreadWorkflowModalOpen={setSaveThreadWorkflowModalOpen}
              renderMessageAttachments={renderMessageAttachments}
              renderLiveMissionCard={renderLiveMissionCard}
              setHistoryModalMessage={setHistoryModalMessage}
              setHistoryModalOpen={setHistoryModalOpen}
              movingThreadItemKey={movingThreadItemKey}
              openMovePopoverKey={openMovePopoverKey}
              setOpenMovePopoverKey={setOpenMovePopoverKey}
              handleUpdateTask={handleUpdateTask}
              renderTaskCard={renderTaskCard}
            />
          </>
        )}
      </section>

      {/* ================= MINI DOCKED POP-OUT CHAT WINDOWS (BOTTOM RIGHT LIKE GMAIL) ================= */}
      <MosChatDockedWindows
        isMobile={isMobile}
        dockedConvIds={dockedConvIds}
        conversations={conversations}
        collapsedDockIds={collapsedDockIds}
        setCollapsedDockIds={setCollapsedDockIds}
        userPrefs={userPrefs}
        getEffectiveUnreadCount={getEffectiveUnreadCount}
        dockAttachments={dockAttachments}
        setDockAttachments={setDockAttachments}
        dockInputs={dockInputs}
        setDockInputs={setDockInputs}
        surfaceBg={surfaceBg}
        surfaceRaised={surfaceRaised}
        canvasBg={canvasBg}
        borderColor={borderColor}
        borderStrong={borderStrong}
        accentColor={accentColor}
        accentSoftBg={accentSoftBg}
        accentBorder={accentBorder}
        accentContrast={accentContrast}
        token={token}
        renderUserAvatarNode={renderUserAvatarNode}
        isConversationParticipantOnline={isConversationParticipantOnline}
        togglePinConversation={togglePinConversation}
        toggleManualUnreadConversation={toggleManualUnreadConversation}
        selectConversation={selectConversation}
        onToggle={onToggle}
        setDockedConvIds={setDockedConvIds}
        dockMessagesContainerRefs={dockMessagesContainerRefs}
        isMessageFromCurrentUser={isMessageFromCurrentUser}
        getMessageReadBreakdown={getMessageReadBreakdown}
        renderReadStatusCheckmark={renderReadStatusCheckmark}
        openTaskModalFromMessage={openTaskModalFromMessage}
        renderRichTextMessage={renderRichTextMessage}
        renderMessageAttachments={renderMessageAttachments}
        renderStagedAttachmentsStrip={renderStagedAttachmentsStrip}
        dockInputRefs={dockInputRefs}
        handleClipboardPaste={handleClipboardPaste}
        isComposingRef={isComposingRef}
        lastCompositionEndMsRef={lastCompositionEndMsRef}
        handleSendMessage={handleSendMessage}
        openStickerPopoverKey={openStickerPopoverKey}
        setOpenStickerPopoverKey={setOpenStickerPopoverKey}
        renderComposerEmojiPickerContent={renderComposerEmojiPickerContent}
        triggerFilePicker={triggerFilePicker}
        tasks={tasks}
        onToggleTaskDone={handleToggleTaskDone}
        onQuickCreateTask={handleQuickCreateTaskForDock}
        onSendThreadReply={handleSendThreadReplyForDock}
        dockDimensions={dockDimensions}
        setDockDimensions={setDockDimensions}
        dockActiveTabs={dockActiveTabs}
        setDockActiveTabs={setDockActiveTabs}
        dockActiveThreadMsgIds={dockActiveThreadMsgIds}
        setDockActiveThreadMsgIds={setDockActiveThreadMsgIds}
      />

      {/* ================= LIVE REMINDER ALERT TOAST POPUP ================= */}
      <MosChatReminderAlert
        activeAlertTask={activeAlertTask}
        setActiveAlertTask={setActiveAlertTask}
        handleToggleTaskDone={handleToggleTaskDone}
        handleSnoozeTask={handleSnoozeTask}
        selectConversation={selectConversation}
        surfaceRaised={surfaceRaised}
        accentColor={accentColor}
        borderColor={borderColor}
        token={token}
      />

      {/* ================= ALL DOMAIN MODALS & OVERLAYS ================= */}

      {/* Notification Settings Modal (Tiered Notification Filter) */}
      <MosChatNotificationSettingsModal
        open={notifSettingsModalOpen}
        onClose={() => setNotifSettingsModalOpen(false)}
        userPrefs={userPrefs}
        conversations={allUserConversations}
        onChangeGlobalMode={handleChangeGlobalNotificationMode}
        onChangeChannelOverride={handleChangeChannelNotificationOverride}
        themeMode={themeMode}
      />

      <MosChatModals
        isDark={isDark}
        isMobile={isMobile}
        token={token}
        surfaceBg={surfaceBg}
        surfaceRaised={surfaceRaised}
        canvasBg={canvasBg}
        borderColor={borderColor}
        borderStrong={borderStrong}
        accentColor={accentColor}
        renderUserAvatarNode={renderUserAvatarNode}
        currentUser={currentUser}
        isDannyAccount={isDannyAccount}
        isStrictDannySuperAdmin={isStrictDannySuperAdmin}
        canUseAiCopilot={canUseAiCopilot}
        staffDirectory={staffDirectory}
        activeConversation={activeConversation}
        setConversations={setConversations}
        notifyLivePeers={notifyLivePeers}
        taskModalOpen={taskModalOpen}
        setTaskModalOpen={setTaskModalOpen}
        editingTask={editingTask}
        setEditingTask={setEditingTask}
        taskModalSourceMsg={taskModalSourceMsg}
        taskTitle={taskTitle}
        setTaskTitle={setTaskTitle}
        taskDoneState={taskDoneState}
        setTaskDoneState={setTaskDoneState}
        taskArchivedState={taskArchivedState}
        setTaskArchivedState={setTaskArchivedState}
        taskAssignee={taskAssignee}
        setTaskAssignee={setTaskAssignee}
        assigneeOptions={assigneeOptions}
        taskPriority={taskPriority}
        setTaskPriority={setTaskPriority}
        taskDeadline={taskDeadline}
        setTaskDeadline={setTaskDeadline}
        taskDeadlineMode={taskDeadlineMode}
        setTaskDeadlineMode={setTaskDeadlineMode}
        selectedDeadlinePresetId={selectedDeadlinePresetId}
        setSelectedDeadlinePresetId={setSelectedDeadlinePresetId}
        taskNegotiatedDeadline={taskNegotiatedDeadline}
        setTaskNegotiatedDeadline={setTaskNegotiatedDeadline}
        taskNegotiationNote={taskNegotiationNote}
        setTaskNegotiationNote={setTaskNegotiationNote}
        taskRemindMode={taskRemindMode}
        setTaskRemindMode={setTaskRemindMode}
        selectedPresetId={selectedPresetId}
        setSelectedPresetId={setSelectedPresetId}
        setTaskRemindSeconds={setTaskRemindSeconds}
        customRemindDate={customRemindDate}
        setCustomRemindDate={setCustomRemindDate}
        handleConfirmCreateTask={handleConfirmCreateTask}
        negotiateModalOpen={negotiateModalOpen}
        setNegotiateModalOpen={setNegotiateModalOpen}
        negotiatingTask={negotiatingTask}
        setNegotiatingTask={setNegotiatingTask}
        negotiateProposedDeadline={negotiateProposedDeadline}
        setNegotiateProposedDeadline={setNegotiateProposedDeadline}
        negotiateReason={negotiateReason}
        setNegotiateReason={setNegotiateReason}
        isSubmittingNegotiation={isSubmittingNegotiation}
        handleSubmitNegotiation={handleSubmitNegotiation}
        missionModalOpen={missionModalOpen}
        setMissionModalOpen={setMissionModalOpen}
        missionSourceMsg={missionSourceMsg}
        missionTitle={missionTitle}
        setMissionTitle={setMissionTitle}
        missionType={missionType}
        setMissionType={setMissionType}
        missionNote={missionNote}
        setMissionNote={setMissionNote}
        isDispatchingMission={isDispatchingMission}
        handleConfirmDispatchMission={handleConfirmDispatchMission}
        newRoomModalOpen={newRoomModalOpen}
        setNewRoomModalOpen={setNewRoomModalOpen}
        newRoomType={newRoomType}
        roomSearchQuery={roomSearchQuery}
        setRoomSearchQuery={setRoomSearchQuery}
        roomGroupFilter={roomGroupFilter}
        setRoomGroupFilter={setRoomGroupFilter}
        selectedMemberIds={selectedMemberIds}
        setSelectedMemberIds={setSelectedMemberIds}
        newRoomEmoji={newRoomEmoji}
        setNewRoomEmoji={setNewRoomEmoji}
        newRoomColor={newRoomColor}
        setNewRoomColor={setNewRoomColor}
        newRoomName={newRoomName}
        setNewRoomName={setNewRoomName}
        newRoomSubtitle={newRoomSubtitle}
        setNewRoomSubtitle={setNewRoomSubtitle}
        handleCreateSpace={handleCreateSpace}
        handleSelectSelfChat={handleSelectSelfChat}
        handleSelectColleague={handleSelectColleague}
        handleToggleDepartmentOrTeam={handleToggleDepartmentOrTeam}
        spaceMembersModalOpen={spaceMembersModalOpen}
        setSpaceMembersModalOpen={setSpaceMembersModalOpen}
        addMemberSelectedStaffId={addMemberSelectedStaffId}
        setAddMemberSelectedStaffId={setAddMemberSelectedStaffId}
        handleAddMemberToSpace={handleAddMemberToSpace}
        handleBulkAddGroupToSpace={handleBulkAddGroupToSpace}
        handleRemoveMemberFromSpace={handleRemoveMemberFromSpace}
        handleOpenNicknameModal={handleOpenNicknameModal}
        spaceConfigModalOpen={spaceConfigModalOpen}
        setSpaceConfigModalOpen={setSpaceConfigModalOpen}
        editingNicknameTarget={editingNicknameTarget}
        setEditingNicknameTarget={setEditingNicknameTarget}
        nicknameInputVal={nicknameInputVal}
        setNicknameInputVal={setNicknameInputVal}
        isUpdatingNickname={isUpdatingNickname}
        handleSaveNickname={handleSaveNickname}
        driveLinkModalOpen={driveLinkModalOpen}
        setDriveLinkModalOpen={setDriveLinkModalOpen}
        driveLinkInput={driveLinkInput}
        setDriveLinkInput={setDriveLinkInput}
        handleConfirmDriveLink={handleConfirmDriveLink}
        triggerFilePicker={triggerFilePicker}
        uploadTargetRef={uploadTargetRef}
        lightboxImage={lightboxImage}
        setLightboxImage={setLightboxImage}
        accessConfigModalOpen={accessConfigModalOpen}
        setAccessConfigModalOpen={setAccessConfigModalOpen}
        savingAccessConfig={savingAccessConfig}
        accessConfigTab={accessConfigTab}
        setAccessConfigTab={setAccessConfigTab}
        accessConfig={accessConfig}
        persistAccessConfig={persistAccessConfig}
        accessStaffSearch={accessStaffSearch}
        setAccessStaffSearch={setAccessStaffSearch}
        accessGroupFilter={accessGroupFilter}
        setAccessGroupFilter={setAccessGroupFilter}
        isStaffMemberAllowedInChat={isStaffMemberAllowedInChat}
        isStaffMemberAllowedInAi={isStaffMemberAllowedInAi}
        quickCreateSectionModalOpen={quickCreateSectionModalOpen}
        setQuickCreateSectionModalOpen={setQuickCreateSectionModalOpen}
        quickCreateSectionTargetConvId={quickCreateSectionTargetConvId}
        setQuickCreateSectionTargetConvId={setQuickCreateSectionTargetConvId}
        quickCreateSectionName={quickCreateSectionName}
        setQuickCreateSectionName={setQuickCreateSectionName}
        handleCreateCustomSection={handleCreateCustomSection}
        sidebarCustomizeModalOpen={sidebarCustomizeModalOpen}
        setSidebarCustomizeModalOpen={setSidebarCustomizeModalOpen}
        editingSectionId={editingSectionId}
        setEditingSectionId={setEditingSectionId}
        sidebarCustomizeTab={sidebarCustomizeTab}
        setSidebarCustomizeTab={setSidebarCustomizeTab}
        sidebarSections={sidebarSections}
        allUserConversations={allUserConversations}
        userPrefs={userPrefs}
        handleResetSidebarPrefs={handleResetSidebarPrefs}
        newSectionNameInput={newSectionNameInput}
        setNewSectionNameInput={setNewSectionNameInput}
        editingSectionNameInput={editingSectionName}
        setEditingSectionNameInput={setEditingSectionName}
        handleRenameCustomSection={handleRenameCustomSection}
        handleDeleteCustomSection={handleDeleteCustomSection}
        handleMoveSectionOrder={handleMoveSectionOrder}
        togglePinConversation={togglePinConversation}
        toggleMuteConversation={toggleMuteConversation}
        toggleHideConversation={toggleHideConversation}
        historyModalOpen={historyModalOpen}
        setHistoryModalOpen={setHistoryModalOpen}
        historyModalMessage={historyModalMessage}
        setHistoryModalMessage={setHistoryModalMessage}
        isMessageFromCurrentUser={isMessageFromCurrentUser}
        handleRestoreVersion={handleRestoreVersion}
        handleRestoreMessage={handleRestoreMessage}
        triggerWorkflowModalOpen={triggerWorkflowModalOpen}
        setTriggerWorkflowModalOpen={setTriggerWorkflowModalOpen}
        workflowTemplates={workflowTemplates}
        setWorkflowTemplates={setWorkflowTemplates}
        initialWorkflowCode={initialWorkflowCode}
        setWorkflowInstances={setWorkflowInstances}
        setTasks={setTasks}
        saveThreadWorkflowModalOpen={saveThreadWorkflowModalOpen}
        setSaveThreadWorkflowModalOpen={setSaveThreadWorkflowModalOpen}
        activeThreadMessage={activeThreadMessage}
        fetchBootstrap={fetchBootstrap}
        richEditorModalState={richEditorModalState}
        setRichEditorModalState={setRichEditorModalState}
        composerText={composerTextRef.current}
        setComposerText={setComposerText}
        threadInput={threadInput}
        setThreadInput={setThreadInput}
        composerInputRef={composerInputRef}
        threadInputRef={threadInputRef}
        stagedAttachments={stagedAttachments}
        setStagedAttachments={setStagedAttachments}
        handleSendMessage={handleSendMessage}
        activeThreadMsgId={activeThreadMsgId}
        threadAttachments={threadAttachments}
        setThreadAttachments={setThreadAttachments}
        scrollToChatBottom={scrollToChatBottom}
        customerPickerOpen={customerPickerOpen}
        setCustomerPickerOpen={setCustomerPickerOpen}
        onSelectCustomerCard={handleSelectCustomerCard}
      />

      {/* ================= CUSTOMER DETAIL DRAWER ================= */}
      {customerDrawerOpen && selectedCustomerId && (
        <CustomerDetailDrawer
          open={customerDrawerOpen}
          customerId={selectedCustomerId}
          onClose={() => {
            setCustomerDrawerOpen(false);
            setSelectedCustomerId(null);
          }}
        />
      )}
    </>
  );
};

export default MosGoogleChatPortal;

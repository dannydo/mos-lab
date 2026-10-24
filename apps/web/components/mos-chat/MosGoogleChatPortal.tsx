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
  MosChatUserSidebarPrefs,
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
} from './utils/chat-helpers';
import { useMosChatBridgeListener } from './store/mos-chat-bridge';
import { MosChatWorkflowCard } from './workflows/MosChatWorkflowCard';
import { MosChatSaveThreadWorkflowModal, MosChatTriggerWorkflowModal } from './workflows/MosChatWorkflowModals';
import { MosChatMermaidBlock } from './MosChatMermaidBlock';
import { MosChatMathBlock, MosChatMathInline, isMathValid } from './MosChatMathBlock';
import { MosChatProvider } from './context/MosChatContext';
import { MosChatMobileApp } from './mobile/MosChatMobileApp';
import { tabNotificationManager, playMessengerChime, showDesktopNotification } from '../../lib/tab-notification';

export { AI_COPILOT_CONV_ID };

export interface MosGoogleChatPortalProps {
  open: boolean;
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

export const MosGoogleChatPortal: React.FC<MosGoogleChatPortalProps> = ({
  open,
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
  const [notification, notificationContextHolder] = notificationStatic.useNotification();

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

  // Synchronize latest messages from backend if aiSessionId exists
  useEffect(() => {
    if (!aiSessionId) return;
    let isCancelled = false;
    (async () => {
      try {
        const sessRes = await apiClient.ai.getSession(aiSessionId);
        if (isCancelled || !sessRes?.messages || sessRes.messages.length === 0) return;

        const mappedBackend: MosChatMessage[] = sessRes.messages.map((bm) => {
          const isBot = bm.role === 'assistant';
          const rawContent = bm.content || '';
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

          const existingActions = bm.suggestedActions || (bm.suggestedAction ? [bm.suggestedAction] : []);
          const allActions = [...existingActions, ...actionMatches].filter(
            (act, index, self) =>
              index ===
              self.findIndex((a) => a.label === act.label && JSON.stringify(a.payload) === JSON.stringify(act.payload))
          );

          return {
            id: bm.id,
            conversationId: AI_COPILOT_CONV_ID,
            senderId: isBot ? 'wings-ai-copilot' : String(currentUser?.id || 'me'),
            senderName: isBot ? '🤖 MAI' : currentUser?.displayName || currentUser?.username || 'Bạn',
            senderRole: isBot ? 'mOS AI' : currentUser?.role || 'Staff',
            senderAvatar: isBot ? 'MAI' : 'U',
            roleColor: isBot ? '#8b5cf6' : '#2563eb',
            isAiBot: isBot,
            text: cleanText,
            aiThinking: bm.thinking || null,
            aiAction: allActions[0] || bm.suggestedAction || null,
            aiActions: allActions.length > 0 ? allActions : null,
            timeLabel: dayjs(bm.createdAt).format('HH:mm'),
            createdAt: bm.createdAt,
            reactions: {},
            thread: [],
          };
        });

        const welcome = buildInitialAiWelcomeMessage();
        setAiMessages((prev) => {
          // If local has pending optimistic messages, keep them
          if (prev.length > mappedBackend.length + 1) {
            return prev;
          }
          return [welcome, ...mappedBackend];
        });
      } catch {
        // ignore sync error
      }
    })();
    return () => {
      isCancelled = true;
    };
  }, [
    aiSessionId,
    buildInitialAiWelcomeMessage,
    currentUser?.id,
    currentUser?.displayName,
    currentUser?.username,
    currentUser?.role,
  ]);

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

  // Composer state
  const [composerText, setComposerText] = useState('');
  const [stagedAttachments, setStagedAttachments] = useState<MosChatImageAttachment[]>([]);
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
  const [composerCursorPos, setComposerCursorPos] = useState(0);
  const [threadCursorPos, setThreadCursorPos] = useState(0);
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

  // Nickname Editing State (Per-Space Nicknames)
  const [editingNicknameTarget, setEditingNicknameTarget] = useState<{
    staffId: number;
    displayName: string;
    currentNickname: string;
    isMe: boolean;
  } | null>(null);
  const [nicknameInputVal, setNicknameInputVal] = useState('');
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false);

  // Mini Docked Pop-out Windows (Bottom right like Gmail)
  const [dockedConvIds, setDockedConvIds] = useState<string[]>([]);
  const [collapsedDockIds, setCollapsedDockIds] = useState<Record<string, boolean>>({});
  const [dockInputs, setDockInputs] = useState<Record<string, string>>({});
  const [dockAttachments, setDockAttachments] = useState<Record<string, MosChatImageAttachment[]>>({});

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
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
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
          if (el && typeof el.scrollTo === 'function') {
            el.scrollTo({ top: el.scrollHeight, behavior: mode });
          } else if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
            messagesEndRef.current.scrollIntoView({ behavior: mode, block: 'end' });
          }
        } else if (target === 'thread') {
          const el = threadMessagesContainerRef.current;
          if (el && typeof el.scrollTo === 'function') {
            el.scrollTo({ top: el.scrollHeight, behavior: mode });
          } else if (typeof threadMessagesEndRef.current?.scrollIntoView === 'function') {
            threadMessagesEndRef.current.scrollIntoView({ behavior: mode, block: 'end' });
          }
        } else if (typeof target === 'object' && target.dockConvId) {
          const el = dockMessagesContainerRefs.current[target.dockConvId];
          if (el && typeof el.scrollTo === 'function') {
            el.scrollTo({ top: el.scrollHeight, behavior: mode });
          }
        }
      };

      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => executeScroll(behavior));
        window.setTimeout(() => executeScroll(behavior), 90);
        window.setTimeout(() => executeScroll(behavior), 220);
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

  const fetchBootstrap = useCallback(
    async (forceFull = false) => {
      try {
        const shouldForceFull = forceFull || staffDirectory.length === 0;
        const res = await apiClient.chat.bootstrap(
          { sinceVersion: shouldForceFull ? undefined : lastVersionRef.current || undefined },
          { isPolling: true }
        );
        if (res?.accessConfig) {
          setAccessConfig(res.accessConfig);
        }
        if (typeof res?.canAccessChat === 'boolean') {
          setServerCanAccessChat(res.canAccessChat);
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
          setStaffDirectory(res.staffDirectory);
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem(STAFF_DIRECTORY_CACHE_KEY, JSON.stringify(res.staffDirectory));
            } catch {
              // ignore
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

          // Detect new unread buzzed messages or replies for current user (MOS-BUG-131, MOS-BUG-135)
          const myId = String(currentUser?.id || '');
          const myStaffId = Number(currentUserStaffMember?.id) || Number(currentUser?.id) || 0;
          const myName = String(
            currentUserStaffMember?.displayName || currentUser?.displayName || currentUser?.username || ''
          )
            .trim()
            .toLowerCase();

          for (const conv of res.conversations) {
            if (conv.hasUnreadBuzz || (conv.unreadCount || 0) > 0) {
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

                notifiedBuzzIdsRef.current.add(buzzKey);
                playWebAudioBuzzChime();
                triggerBuzzVibration();

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
                          if (!open) {
                            onToggle();
                          }
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
                    if (!open) {
                      onToggle();
                    }
                    navigateToMessage(conv.id, item.id);
                    notification.destroy(`buzz-notify-${item.id}`);
                  },
                  key: `buzz-notify-${item.id}`,
                });
              };

              // MOS-BUG-139: Detect new messages and trigger Messenger-style tab title & favicon alert + chime
              const handleIncomingMessageItem = (item: MosChatMessage | MosChatThreadReply) => {
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

                if (!isMine && !item.isBuzzed) {
                  tabNotificationManager.triggerAlert({
                    senderName: item.senderName || 'Đồng nghiệp',
                    snippet: item.text || '',
                    conversationName: conv.name,
                    isDirect: conv.type === 'dm',
                  });

                  if (presence !== 'dnd') {
                    playMessengerChime();
                  }

                  if (typeof document !== 'undefined' && document.hidden) {
                    showDesktopNotification(
                      conv.type === 'dm' ? item.senderName || 'mOS Chat' : `${conv.name} · ${item.senderName}`,
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
                  }
                }
              };

              for (const m of conv.messages || []) {
                handleUrgentBuzzItem(m);
                handleIncomingMessageItem(m);
                if (m.thread && m.thread.length > 0) {
                  for (const r of m.thread) {
                    handleUrgentBuzzItem(r);
                    handleIncomingMessageItem(r);
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
    [userSidebarPrefsStorageKey, staffDirectory.length, maiVoiceAnnounceEnabled, ttsSpeed]
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
            setComposerText(payload.initialDraftText);
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
      // In background tab: poll every 8000ms so tab title & favicon alerts trigger in near-real-time!
      // In visible active tab: poll every 4000ms (if open or docked) or 15000ms.
      const delay = isHidden ? 8000 : open || dockedConvIds.length > 0 ? 4000 : 15000;
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
        if (isDannyAccount) return true;
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
    [canUseAiCopilot, currentUserStaffMember.id, currentUser?.id, isDannyAccount]
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

      const readCount = userPrefs.readMessageCountByConv?.[conv.id];
      if (typeof readCount === 'number') {
        const unreadMsgs = msgs.slice(readCount).filter((m) => {
          const senderNum = Number(m.senderId);
          return senderNum !== myStaffId;
        });
        return unreadMsgs.length;
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
        return Math.max(conv.unreadCount || 0, unread);
      }

      return conv.unreadCount || 0;
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

      if (!open) {
        onToggle();
      }

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

  // 1-second ticker for live task countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      const currentNow = Date.now();
      setNowMs(currentNow);
      uniqueTasks.forEach((t) => {
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

  const handleProcessImageFiles = useCallback(
    async (
      files: FileList | File[],
      source: 'clipboard' | 'drive' | 'upload',
      scope: 'main' | 'thread' | 'dock' = 'main',
      convId?: string
    ) => {
      const imageFiles = Array.from(files).filter(isImageOrHeicFile);
      if (imageFiles.length === 0) return;

      setUploadingCount((c) => c + imageFiles.length);
      for (const file of imageFiles.slice(0, 6)) {
        try {
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
        } catch (err: SafeAny) {
          antdMessage.error(err?.response?.data?.message || err?.message || 'Không thể tải ảnh lên.');
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
        const pastedImages: File[] = [];
        for (let i = 0; i < items.length; i += 1) {
          const item = items[i];
          if (item.type.startsWith('image/') || item.kind === 'file') {
            const file = item.getAsFile();
            if (file && isImageOrHeicFile(file)) pastedImages.push(file);
          }
        }
        if (pastedImages.length > 0) {
          e.preventDefault();
          void handleProcessImageFiles(pastedImages, 'clipboard', scope, convId);
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
    const text = composerText;
    const attachmentsToSend = stagedAttachments;
    if (!text.trim() && attachmentsToSend.length === 0) return;

    // Super Admin Slash Commands for Dynamic Workflow Engine (/tam-ung, /kiem-kho, /tao-quy-trinh)
    const trimmedCmd = text.trim().toLowerCase();
    if (isStrictDannySuperAdmin && attachmentsToSend.length === 0) {
      if (trimmedCmd === '/tam-ung' || trimmedCmd.startsWith('/tam-ung ')) {
        setComposerText('');
        if (composerInputRef.current) composerInputRef.current.value = '';
        setInitialWorkflowCode('WF_CASH_ADVANCE');
        setTriggerWorkflowModalOpen(true);
        return;
      }
      if (trimmedCmd === '/kiem-kho' || trimmedCmd.startsWith('/kiem-kho ')) {
        setComposerText('');
        if (composerInputRef.current) composerInputRef.current.value = '';
        setInitialWorkflowCode('WF_INVENTORY_AUDIT');
        setTriggerWorkflowModalOpen(true);
        return;
      }
      if (trimmedCmd === '/tao-quy-trinh' || trimmedCmd === '/workflow') {
        setComposerText('');
        if (composerInputRef.current) composerInputRef.current.value = '';
        setSaveThreadWorkflowModalOpen(true);
        return;
      }
    }

    const wasUrgent = isUrgentSend;
    if (wasUrgent) {
      setIsUrgentSend(false);
    }

    setMentionState((prev) => (prev.open ? { ...prev, open: false } : prev));
    setComposerText('');
    setStagedAttachments([]);
    if (composerInputRef.current) {
      composerInputRef.current.value = '';
    }
    const sent = await handleSendMessage(activeConversation.id, text, null, attachmentsToSend);
    if (wasUrgent && sent?.id) {
      void handleBuzzMessage(sent.id);
    }
  };

  const handleSendQuickCustomerCard = async () => {
    if (!activeConversation) return;
    const card = SAMPLE_CUSTOMER_CARDS[sampleCardIndex % SAMPLE_CUSTOMER_CARDS.length];
    setSampleCardIndex((prev) => prev + 1);
    await handleSendMessage(activeConversation.id, `Lưu ý hỗ trợ chu đáo khách hàng ${card.name}:`, card);
    antdMessage.success(`Đã đính kèm thẻ khách hàng ${card.name}`);
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
    (msgId: string, convIdOverride?: string) => {
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

      if (isTabVisible) {
        const msgs = targetConv.messages || [];
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
        markConversationReadOptimisticAndSync(convId, msgs.length, lastMsg?.id);
      }

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

  const handleSendThreadReply = async () => {
    const text = threadInput.trim();
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
      existingTask?.title || (msg ? msg.text : composerText.trim() || 'Kiểm tra lịch hẹn & chuẩn bị đón khách VIP')
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
      await apiClient.chat.updateTask(taskId, { done: nextDone });
    } catch (_) {}
  };

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

  const renderMoveRootToThreadPopover = (
    sourceMsg: MosChatMessage,
    prevMsg: MosChatMessage | null,
    allVisibleMessages: MosChatMessage[]
  ) => {
    const qNorm = removeVietnameseTones(moveThreadSearchQuery.trim().toLowerCase());
    const candidates = allVisibleMessages
      .filter((m) => m.id !== sourceMsg.id && !m.isDeleted && !m.isSystemReminder)
      .slice()
      .reverse()
      .filter((m) => {
        if (!qNorm) return true;
        const hay = removeVietnameseTones(
          `${m.senderName} ${m.text || ''} ${m.mission?.missionKey || ''}`.toLowerCase()
        );
        return hay.includes(qNorm);
      });

    const isBusy = movingThreadItemKey === `MERGE_ROOT_TO_THREAD:${sourceMsg.id}:`;
    const openThreadTarget =
      threadOpen && activeThreadMessage && activeThreadMessage.id !== sourceMsg.id && !activeThreadMessage.isDeleted
        ? activeThreadMessage
        : null;

    return (
      <div
        data-no-chat-autofocus="true"
        onClick={(e) => e.stopPropagation()}
        className="w-[320px] space-y-2 text-[12px]"
        style={{ color: token.colorText }}
      >
        <div
          className="flex items-center justify-between gap-2 pb-1"
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          <div className="font-extrabold flex items-center gap-1.5 text-[12.5px]">
            <CornerDownRight size={14} className="text-amber-500 shrink-0" />
            <span>Gộp tin nhắn vào luồng phụ (Subthread)</span>
          </div>
        </div>

        {/* 1-Click Primary Action: Merge into the message immediately above */}
        {prevMsg && !prevMsg.isDeleted && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() =>
              void handleMoveThreadItem({
                mode: 'MERGE_ROOT_TO_THREAD',
                sourceMessageId: sourceMsg.id,
                targetMessageId: prevMsg.id,
              })
            }
            className="w-full p-2 rounded-lg text-left cursor-pointer transition-all hover:brightness-105 disabled:opacity-50"
            style={{
              background: isDark ? 'rgba(212, 168, 75, 0.16)' : 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(212, 168, 75, 0.45)',
            }}
          >
            <div
              className="flex items-center justify-between gap-1.5 font-extrabold text-[11.5px]"
              style={{ color: '#d4a84b' }}
            >
              <span>⚡ Gộp vào luồng ngay phía trên (1-Click)</span>
              <span className="tabular-nums text-[10.5px]">
                {(prevMsg.thread || []).filter((r) => !r.deletedAt).length} trả lời
              </span>
            </div>
            <div className="mt-0.5 text-[11px] truncate" style={{ color: token.colorText }}>
              <span className="font-bold">{prevMsg.senderName}:</span> {formatMoveTargetSnippet(prevMsg)}
            </div>
          </button>
        )}

        {/* 1-Click Secondary Action: Merge into the currently open Right-Side Thread */}
        {openThreadTarget && openThreadTarget.id !== prevMsg?.id && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() =>
              void handleMoveThreadItem({
                mode: 'MERGE_ROOT_TO_THREAD',
                sourceMessageId: sourceMsg.id,
                targetMessageId: openThreadTarget.id,
              })
            }
            className="w-full p-2 rounded-lg text-left cursor-pointer transition-all hover:brightness-105 disabled:opacity-50"
            style={{
              background: isDark ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.42)',
            }}
          >
            <div className="flex items-center justify-between gap-1.5 font-extrabold text-[11.5px] text-indigo-400">
              <span>👉 Gộp vào luồng đang mở bên phải</span>
              <span className="tabular-nums text-[10.5px]">
                {(openThreadTarget.thread || []).filter((r) => !r.deletedAt).length} trả lời
              </span>
            </div>
            <div className="mt-0.5 text-[11px] truncate" style={{ color: token.colorText }}>
              <span className="font-bold">{openThreadTarget.senderName}:</span>{' '}
              {formatMoveTargetSnippet(openThreadTarget)}
            </div>
          </button>
        )}

        {/* Search & Pick any other message / thread in conversation */}
        <div className="space-y-1.5 pt-0.5">
          <Input
            size="small"
            allowClear
            placeholder="Tìm luồng / tin nhắn đích..."
            value={moveThreadSearchQuery}
            onChange={(e) => setMoveThreadSearchQuery(e.target.value)}
            prefix={<Search size={12} className="text-slate-400" />}
          />
          <div className="max-h-[190px] overflow-y-auto space-y-1 pr-0.5">
            {candidates.length === 0 ? (
              <div className="py-3 text-center text-[11px] text-slate-400">Không tìm thấy tin nhắn đích phù hợp</div>
            ) : (
              candidates.slice(0, 25).map((target) => {
                const replyCount = (target.thread || []).filter((r) => !r.deletedAt).length;
                const missionKey = target.mission?.missionKey;
                return (
                  <button
                    key={target.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      void handleMoveThreadItem({
                        mode: 'MERGE_ROOT_TO_THREAD',
                        sourceMessageId: sourceMsg.id,
                        targetMessageId: target.id,
                      })
                    }
                    className="w-full px-2 py-1.5 rounded-md text-left cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/10 flex flex-col gap-0.5"
                    style={{ border: `1px solid ${borderColor}` }}
                  >
                    <div className="flex items-center justify-between gap-1.5 text-[11px]">
                      <span className="font-bold truncate">
                        {target.senderName}{' '}
                        <span className="text-slate-400 font-normal tabular-nums">· {target.timeLabel}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 shrink-0 tabular-nums text-[10px] font-bold text-blue-400">
                        {missionKey && (
                          <span className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300">#{missionKey}</span>
                        )}
                        <span>💬 {replyCount}</span>
                      </span>
                    </div>
                    <div className="text-[11px] truncate" style={{ color: token.colorTextSecondary }}>
                      {formatMoveTargetSnippet(target)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div
          className="pt-1.5 text-[10.5px] leading-snug text-slate-400"
          style={{ borderTop: `1px dashed ${borderColor}` }}
        >
          💡 <span className="font-semibold">Mẹo nhanh:</span> Bạn cũng có thể kéo thả tin nhắn này trực tiếp vào tin
          nhắn đích hoặc thả vào khung Luồng trả lời bên phải.
        </div>
      </div>
    );
  };

  const renderMoveReplyPopover = (parentMsg: MosChatMessage, reply: MosChatThreadReply) => {
    const allMsgs = (activeConversation?.messages || []).filter(
      (m) =>
        m.id !== parentMsg.id &&
        !m.isDeleted &&
        !m.isSystemReminder &&
        m.senderId !== 'system-reminder' &&
        m.senderName !== 'mOS Reminder'
    );
    const qNorm = removeVietnameseTones(moveThreadSearchQuery.trim().toLowerCase());
    const candidates = allMsgs
      .slice()
      .reverse()
      .filter((m) => {
        if (!qNorm) return true;
        const hay = removeVietnameseTones(
          `${m.senderName} ${m.text || ''} ${m.mission?.missionKey || ''}`.toLowerCase()
        );
        return hay.includes(qNorm);
      });

    const isBusy =
      movingThreadItemKey === `PROMOTE_REPLY_TO_ROOT:${parentMsg.id}:${reply.id}` ||
      movingThreadItemKey === `MOVE_REPLY_TO_THREAD:${parentMsg.id}:${reply.id}`;

    return (
      <div
        data-no-chat-autofocus="true"
        onClick={(e) => e.stopPropagation()}
        className="w-[300px] space-y-2 text-[12px]"
        style={{ color: token.colorText }}
      >
        <div
          className="font-extrabold flex items-center gap-1.5 text-[12px] pb-1"
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          <ArrowUpRight size={14} className="text-amber-500 shrink-0" />
          <span>Tách hoặc chuyển câu trả lời sang luồng khác</span>
        </div>

        {/* 1-Click Promote Reply to Standalone Root Message */}
        <button
          type="button"
          disabled={isBusy}
          onClick={() =>
            void handleMoveThreadItem({
              mode: 'PROMOTE_REPLY_TO_ROOT',
              sourceMessageId: parentMsg.id,
              replyId: reply.id,
            })
          }
          className="w-full p-2 rounded-lg text-left cursor-pointer transition-all hover:brightness-105 disabled:opacity-50"
          style={{
            background: isDark ? 'rgba(212, 168, 75, 0.16)' : 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(212, 168, 75, 0.45)',
          }}
        >
          <div className="font-extrabold text-[11.5px] flex items-center gap-1" style={{ color: '#d4a84b' }}>
            <ArrowUpRight size={13} />
            <span>Tách ra thành tin nhắn riêng ở luồng chính</span>
          </div>
          <div className="text-[10.5px] mt-0.5" style={{ color: token.colorTextSecondary }}>
            Đưa câu trả lời này (kèm hình ảnh) ra ngoài cuộc trò chuyện chính
          </div>
        </button>

        {/* Move Reply to another message's thread */}
        <div className="space-y-1.5 pt-0.5">
          <div className="text-[10.5px] font-bold uppercase text-slate-400">
            Hoặc chuyển sang luồng của tin nhắn khác:
          </div>
          <Input
            size="small"
            allowClear
            placeholder="Tìm tin nhắn đích..."
            value={moveThreadSearchQuery}
            onChange={(e) => setMoveThreadSearchQuery(e.target.value)}
            prefix={<Search size={12} className="text-slate-400" />}
          />
          <div className="max-h-[165px] overflow-y-auto space-y-1 pr-0.5">
            {candidates.length === 0 ? (
              <div className="py-2 text-center text-[11px] text-slate-400">Không có tin nhắn đích khác</div>
            ) : (
              candidates.slice(0, 20).map((target) => {
                const replyCount = (target.thread || []).filter((r) => !r.deletedAt).length;
                return (
                  <button
                    key={target.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      void handleMoveThreadItem({
                        mode: 'MOVE_REPLY_TO_THREAD',
                        sourceMessageId: parentMsg.id,
                        replyId: reply.id,
                        targetMessageId: target.id,
                      })
                    }
                    className="w-full px-2 py-1.5 rounded-md text-left cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/10 flex flex-col gap-0.5"
                    style={{ border: `1px solid ${borderColor}` }}
                  >
                    <div className="flex items-center justify-between gap-1.5 text-[11px]">
                      <span className="font-bold truncate">
                        {target.senderName}{' '}
                        <span className="text-slate-400 font-normal tabular-nums">· {target.timeLabel}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-[10px] font-bold text-blue-400">💬 {replyCount}</span>
                    </div>
                    <div className="text-[11px] truncate" style={{ color: token.colorTextSecondary }}>
                      {formatMoveTargetSnippet(target)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
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
    mode: 'thread' | 'inline' | 'task' = 'inline'
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
        className={`rounded-xl p-2.5 text-left space-y-2 transition-all ${
          mode === 'inline' ? 'mt-1.5 w-full max-w-[88%]' : 'w-full'
        }`}
        style={{
          background: palette.bg,
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
            {mode !== 'thread' && msg && (
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

        {/* Mission Title */}
        <div className="text-[12.5px] font-extrabold leading-snug" style={{ color: token.colorText }}>
          {mission.title}
        </div>

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
    let priorityLabel = 'P2 · Thường';

    if (task.priority === 'URGENT') {
      priorityBg = 'rgba(239, 68, 68, 0.18)';
      priorityColor = '#f87171';
      priorityBorder = 'rgba(239, 68, 68, 0.4)';
      priorityLabel = 'P0 · Khẩn cấp';
    } else if (task.priority === 'HIGH') {
      priorityBg = 'rgba(245, 158, 11, 0.18)';
      priorityColor = '#fbbf24';
      priorityBorder = 'rgba(245, 158, 11, 0.4)';
      priorityLabel = 'P1 · Quan trọng';
    }

    // Status badge styling
    let statusBg = 'rgba(100, 116, 139, 0.18)';
    let statusColor = '#94a3b8';
    let statusBorder = 'rgba(100, 116, 139, 0.35)';
    let statusLabel = 'ĐANG THỰC HIỆN';

    if (isDone) {
      statusBg = 'rgba(16, 185, 129, 0.18)';
      statusColor = '#34d399';
      statusBorder = 'rgba(16, 185, 129, 0.4)';
      statusLabel = 'ĐÃ HOÀN THÀNH';
    } else if (deadlineInfo?.isOverdue) {
      statusBg = 'rgba(239, 68, 68, 0.2)';
      statusColor = '#f87171';
      statusBorder = 'rgba(239, 68, 68, 0.45)';
      statusLabel = 'QUÁ HẠN';
    } else if (deadlineInfo?.isDueSoon) {
      statusBg = 'rgba(245, 158, 11, 0.2)';
      statusColor = '#fbbf24';
      statusBorder = 'rgba(245, 158, 11, 0.45)';
      statusLabel = 'SẮP ĐẾN HẠN';
    }

    const isCreator = Boolean(
      task.creatorName && currentUser?.displayName && task.creatorName === currentUser.displayName
    );
    const canApproveNegotiation = isCreator || isStrictDannySuperAdmin;
    const taskConv = conversations.find((c) => c.id === task.conversationId);

    return (
      <div
        key={task.id}
        className={`rounded-xl transition-all ${mode === 'inline' ? 'mt-2 max-w-[92%]' : 'w-full'} p-3 space-y-2.5 text-left`}
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255, 255, 255, 0.95)',
          border: `1.5px solid ${isDone ? 'rgba(16, 185, 129, 0.4)' : deadlineInfo?.isOverdue ? 'rgba(239, 68, 68, 0.45)' : 'rgba(212, 168, 75, 0.4)'}`,
          boxShadow: isDark ? '0 4px 18px rgba(0, 0, 0, 0.35)' : '0 4px 14px rgba(15, 23, 42, 0.06)',
          opacity: isDone ? 0.85 : 1,
        }}
      >
        {/* Header: Task Code + Space Badge + Priority + Status Badge + Done Toggle */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="px-2 py-0.5 rounded-md text-[10.5px] font-black tracking-wider uppercase tabular-nums"
              style={{
                background: isDark ? 'rgba(212, 168, 75, 0.18)' : '#fef3c7',
                color: isDark ? '#fbbf24' : '#b45309',
                border: '1px solid rgba(212, 168, 75, 0.35)',
              }}
            >
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
                  className="px-2 py-0.5 rounded-md text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer transition-all hover:opacity-85"
                  style={{
                    background:
                      taskConv.type === 'space'
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.18)'
                          : '#eff6ff'
                        : isDark
                          ? 'rgba(168, 85, 247, 0.18)'
                          : '#faf5ff',
                    color:
                      taskConv.type === 'space' ? (isDark ? '#93c5fd' : '#2563eb') : isDark ? '#c084fc' : '#7e22ce',
                    border: `1px solid ${
                      taskConv.type === 'space'
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.35)'
                          : 'rgba(59, 130, 246, 0.25)'
                        : isDark
                          ? 'rgba(168, 85, 247, 0.35)'
                          : 'rgba(168, 85, 247, 0.25)'
                    }`,
                  }}
                >
                  {taskConv.type === 'space' ? <Hash size={10} /> : <MessageSquare size={10} />}
                  <span className="truncate max-w-[120px]">
                    {taskConv.name || task.conversationName || 'Hội thoại'}
                  </span>
                </button>
              </Tooltip>
            )}

            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-extrabold"
              style={{
                background: priorityBg,
                color: priorityColor,
                border: `1px solid ${priorityBorder}`,
              }}
            >
              {priorityLabel}
            </span>

            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1"
              style={{
                background: statusBg,
                color: statusColor,
                border: `1px solid ${statusBorder}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: statusColor,
                  boxShadow:
                    !isDone && (deadlineInfo?.isOverdue || deadlineInfo?.isDueSoon) ? `0 0 6px ${statusColor}` : 'none',
                }}
              />
              {statusLabel}
            </span>

            {task.archived && (
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                Lưu trữ
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {mode !== 'thread' && sourceMsg && (
              <Tooltip title="Mở luồng tin nhắn trao đổi">
                <button
                  type="button"
                  onClick={() => {
                    if (task.conversationId && task.conversationId !== activeConversation?.id) {
                      selectConversation(task.conversationId);
                    }
                    handleOpenThread(sourceMsg.id);
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

            <Tooltip title={isDone ? 'Mở lại công việc' : 'Đánh dấu hoàn thành'}>
              <button
                type="button"
                aria-label={isDone ? 'Mở lại công việc' : 'Đánh dấu hoàn thành'}
                onClick={() => handleToggleTaskDone(task.id)}
                className="h-6 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11px] font-extrabold cursor-pointer transition-all"
                style={{
                  background: isDone ? '#10b981' : isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                  color: isDone ? '#fff' : '#059669',
                  border: `1.5px solid ${isDone ? '#10b981' : 'rgba(16, 185, 129, 0.4)'}`,
                }}
              >
                <Check size={12} strokeWidth={isDone ? 3 : 2} />
                <span>{isDone ? 'Đã xong' : 'Hoàn thành'}</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Task Title */}
        <div
          className={`text-[13px] font-bold leading-snug ${isDone ? 'line-through opacity-70' : ''}`}
          style={{ color: token.colorText }}
        >
          {task.title}
        </div>

        {/* People Flow (Creator -> Assignee) */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="opacity-70">Giao bởi:</span>
            <span className="font-semibold text-slate-300">{task.creatorName || 'Hệ thống'}</span>
          </div>
          <span>→</span>
          <div className="flex items-center gap-1">
            <span className="opacity-70">Người nhận:</span>
            <span className="font-semibold text-amber-400">{task.assigneeName || 'Chung'}</span>
          </div>
        </div>

        {/* Deadline & Reminder visual row */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {deadlineInfo ? (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums"
              style={{
                background: isDone
                  ? 'rgba(16, 185, 129, 0.12)'
                  : deadlineInfo.isOverdue
                    ? 'rgba(239, 68, 68, 0.16)'
                    : deadlineInfo.isDueSoon
                      ? 'rgba(245, 158, 11, 0.16)'
                      : isDark
                        ? 'rgba(139, 92, 246, 0.15)'
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
              <CalendarClock size={13} className="shrink-0" />
              <span>Hạn: {deadlineInfo.label}</span>
              <span className="font-extrabold opacity-90">({deadlineInfo.relative})</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] text-slate-400 bg-slate-500/10 border border-slate-500/20">
              <CalendarClock size={12} className="opacity-60" />
              <span>Chưa đặt hạn chót</span>
            </div>
          )}

          {task.remindAt && !isDone && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 tabular-nums">
              <Bell size={11} />
              <span>Nhắc: {formatCountdown(task.remindAt, nowMs)}</span>
            </div>
          )}
        </div>

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

        {/* Card Actions Footer */}
        <div className="pt-1 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {!isDone && (
              <button
                type="button"
                onClick={() => handleOpenNegotiateModal(task)}
                className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[10.5px] font-bold cursor-pointer transition-all hover:bg-amber-500/20 text-amber-400"
                style={{
                  background: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fef3c7',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                <Handshake size={12} />
                <span>{hasNegotiation ? 'Sửa đề xuất hạn' : 'Xin dời hạn'}</span>
              </button>
            )}

            {isStrictDannySuperAdmin && !task.mission && (
              <button
                type="button"
                onClick={() => openMissionModalFromChat(sourceMsg || null, task, task.conversationId)}
                className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[10.5px] font-bold cursor-pointer transition-all hover:opacity-90 shrink-0 whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: '#fff',
                }}
              >
                <Rocket size={11} />
                <span>Chuyển mOS Mission</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Tooltip title="Chỉnh sửa công việc">
              <button
                type="button"
                aria-label="Chỉnh sửa công việc"
                onClick={() => openEditTaskModal(task)}
                className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                <Pencil size={11} className="text-amber-400" />
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

  const renderMessageAttachments = (attachments?: MosChatImageAttachment[], compact = false) => {
    if (!attachments || attachments.length === 0) return null;
    const total = attachments.length;
    return (
      <div className="mt-1.5 flex flex-wrap gap-2">
        {attachments.map((att, idx) => {
          const fullUrl = resolveMediaUrl(att.url);
          return (
            <Tooltip
              key={att.id}
              title={
                total > 1
                  ? `Nhấn để phóng to (${idx + 1}/${total} · Dùng phím ← → để chuyển hình)`
                  : 'Nhấn để phóng to xem chi tiết'
              }
            >
              <button
                type="button"
                data-no-chat-autofocus="true"
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox(attachments, idx);
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
                {total > 1 && (
                  <span
                    className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-extrabold tabular-nums pointer-events-none"
                    style={{
                      background: 'rgba(15, 23, 42, 0.82)',
                      color: '#f8fafc',
                      border: '1px solid rgba(255, 255, 255, 0.16)',
                    }}
                  >
                    {idx + 1}/{total}
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

  /**
   * Tokenizer phân tích inline markup an toàn thành React Nodes:
   * **đậm**, *nghiêng*, ~~gạch ngang~~, <u>gạch chân</u>, `code`, https://..., @mentions
   */
  const parseInlineRichText = useCallback(
    (text: string, keyPrefix = 'inline'): React.ReactNode[] => {
      if (!text) return [];
      const staffPattern =
        knownMultiWordStaffNames.length > 0
          ? `|(@(?:${knownMultiWordStaffNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b)`
          : '';

      const regex = new RegExp(
        `(\\*\\*(.+?)\\*\\*)|(~~(.+?)~~)|(<u>(.+?)<\\/u>)|(\`([^\`]+)\`)|\\*([^\\*\\n]+)\\*|(https?:\\/\\/[^\\s<]+)|(\\$\\$([^\\$]+?)\\$\\$)|(\\$([^\\$\\s\\n](?:[^\\$\\n]*?[^\\$\\s\\n])?)\\$)|(@\\s*(?:AI|copilot|all|mọi\\s+người|moi\\s+nguoi)\\b)${staffPattern}|(@[a-zA-Z0-9_\\u00C0-\\u1EF9]+)`,
        'gui'
      );

      const elements: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let i = 0;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          elements.push(text.substring(lastIndex, match.index));
        }

        const fullMatch = match[0];
        const key = `${keyPrefix}-${i++}`;

        if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
          elements.push(
            <strong key={key} className="font-bold text-amber-500/90 dark:text-amber-400">
              {fullMatch.slice(2, -2)}
            </strong>
          );
        } else if (fullMatch.startsWith('~~') && fullMatch.endsWith('~~')) {
          elements.push(
            <del key={key} className="line-through opacity-70">
              {fullMatch.slice(2, -2)}
            </del>
          );
        } else if (fullMatch.startsWith('<u>') && fullMatch.endsWith('</u>')) {
          elements.push(
            <u key={key} className="underline underline-offset-2">
              {fullMatch.slice(3, -4)}
            </u>
          );
        } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
          elements.push(
            <code
              key={key}
              className="px-1.5 py-0.5 rounded text-[11.5px] font-mono bg-black/15 dark:bg-white/10 text-amber-600 dark:text-amber-300"
            >
              {fullMatch.slice(1, -1)}
            </code>
          );
        } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
          elements.push(
            <em key={key} className="italic opacity-90">
              {fullMatch.slice(1, -1)}
            </em>
          );
        } else if (fullMatch.startsWith('http://') || fullMatch.startsWith('https://')) {
          elements.push(
            <a
              key={key}
              href={fullMatch}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-500 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 break-all font-medium"
            >
              <span>{fullMatch}</span>
              <ExternalLink size={10} className="inline shrink-0 opacity-70" />
            </a>
          );
        } else if (fullMatch.startsWith('$$') && fullMatch.endsWith('$$') && fullMatch.length > 2) {
          const math = fullMatch.slice(2, -2).trim();
          if (isMathValid(math)) {
            elements.push(<MosChatMathBlock key={key} math={math} isDark={isDark} />);
          } else {
            elements.push(fullMatch);
          }
        } else if (fullMatch.startsWith('$') && fullMatch.endsWith('$') && fullMatch.length > 1) {
          const math = fullMatch.slice(1, -1).trim();
          if (isMathValid(math)) {
            elements.push(<MosChatMathInline key={key} math={math} />);
          } else {
            elements.push(fullMatch);
          }
        } else if (fullMatch.startsWith('@')) {
          const cleanTag = fullMatch.replace(/^@\s*/, '').trim().toLowerCase();
          const isAi = cleanTag === 'ai' || cleanTag.includes('copilot');
          const isAll = cleanTag === 'all' || cleanTag === 'mọi người' || cleanTag === 'moi nguoi';
          const myId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
          const myNick = activeConversation?.memberNicknames?.[String(myId)];
          const myNickNorm = myNick ? removeVietnameseTones(myNick.toLowerCase()) : '';
          const myName = removeVietnameseTones(
            (
              currentUserStaffMember.displayName ||
              currentUser?.displayName ||
              currentUser?.username ||
              ''
            ).toLowerCase()
          );
          const myUname = (currentUser?.username || '').toLowerCase();
          const tagNorm = removeVietnameseTones(cleanTag);
          const isMentioningMe = Boolean(
            (myName && (tagNorm.includes(myName) || myName.includes(tagNorm))) ||
            (myUname && cleanTag.includes(myUname)) ||
            (myNickNorm && (tagNorm.includes(myNickNorm) || myNickNorm.includes(tagNorm))) ||
            isAll
          );

          elements.push(
            <span
              key={key}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11.5px] transition-all font-semibold select-text ${
                isAi
                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30'
                  : isMentioningMe
                    ? 'bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/50 shadow-sm ring-1 ring-amber-500/30 font-bold'
                    : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30'
              }`}
            >
              <AtSign size={10.5} className="shrink-0 opacity-80" />
              <span>{isAi ? 'AI' : fullMatch.replace(/^@\s*/, '')}</span>
            </span>
          );
        } else {
          elements.push(fullMatch);
        }

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        elements.push(text.substring(lastIndex));
      }

      return elements.length > 0 ? elements : [text];
    },
    [
      currentUserStaffMember.displayName,
      currentUser?.displayName,
      currentUser?.username,
      knownMultiWordStaffNames,
      activeConversation?.memberNicknames,
      isDark,
    ]
  );

  /**
   * Bộ Renderer chuẩn Rich Text phong cách Apple Notes cho bong bóng chat:
   * Hỗ trợ Headings (#, ##, ###), Checklist Todo (- [ ] / - [x]), Bullet (- / *), Number (1.),
   * Blockquote (>), Code Block (```), Inline styles.
   */
  const renderRichTextMessage = useCallback(
    (rawText?: string | null, _isMine = false): React.ReactNode => {
      if (!rawText) return null;

      const cleanText = rawText
        .replace(/<action[\s\S]*?<\/action>/gi, '')
        .replace(/<\/?action[^>]*>/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (!cleanText) return null;

      // Pure Sticker Message: render large animated borderless sticker (Zalo / Telegram style)
      const pureSticker = parsePureStickerMessage(cleanText);
      if (pureSticker) {
        return <MosChatStickerVisual sticker={pureSticker} size="chat" />;
      }

      const lines = cleanText.split('\n');
      const result: React.ReactNode[] = [];
      let inCodeBlock = false;
      let codeBlockLang = '';
      let codeBlockLines: string[] = [];
      let inMathBlock = false;
      let mathBlockLines: string[] = [];

      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];

        // Code block fences
        if (line.trim().startsWith('```')) {
          if (inCodeBlock) {
            const codeContent = codeBlockLines.join('\n');
            const lang = (codeBlockLang || '').trim().toLowerCase();
            const isMermaid = lang === 'mermaid' || lang.startsWith('mermaid');

            if (isMermaid) {
              result.push(<MosChatMermaidBlock key={`cb-mermaid-${idx}`} code={codeContent} isDark={isDark} />);
            } else {
              result.push(
                <div
                  key={`cb-${idx}`}
                  className="my-2 rounded-xl overflow-hidden shadow-sm text-[11.5px] font-mono select-text"
                  style={{
                    background: isDark ? '#0f172a' : '#f8fafc',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <div
                    className="flex items-center justify-between px-3 py-1 text-[10px]"
                    style={{
                      background: surfaceRaised,
                      borderBottom: `1px solid ${borderColor}`,
                      color: token.colorTextSecondary,
                    }}
                  >
                    <span className="font-semibold">{codeBlockLang || 'Code'}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void navigator.clipboard?.writeText(codeContent);
                        antdMessage.success('Đã sao chép mã code');
                      }}
                      className="cursor-pointer inline-flex items-center gap-1 transition-opacity hover:opacity-80"
                      style={{ color: accentColor }}
                    >
                      <Copy size={11} />
                      <span>Sao chép</span>
                    </button>
                  </div>
                  <pre className="p-3 overflow-x-auto leading-relaxed m-0">
                    <code>{codeContent}</code>
                  </pre>
                </div>
              );
            }
            inCodeBlock = false;
            codeBlockLines = [];
            codeBlockLang = '';
          } else {
            inCodeBlock = true;
            codeBlockLang = line.trim().slice(3).trim();
            codeBlockLines = [];
          }
          continue;
        }

        if (inCodeBlock) {
          codeBlockLines.push(line);
          continue;
        }

        const trimmed = line.trim();

        // Math Block fences: $$ on its own line or opening a multi-line math formula
        if (trimmed === '$$') {
          if (inMathBlock) {
            const mathContent = mathBlockLines.join('\n');
            result.push(<MosChatMathBlock key={`mb-${idx}`} math={mathContent} isDark={isDark} />);
            inMathBlock = false;
            mathBlockLines = [];
          } else {
            inMathBlock = true;
            mathBlockLines = [];
          }
          continue;
        }

        if (inMathBlock) {
          if (trimmed.endsWith('$$')) {
            const lastPart = trimmed.slice(0, -2).trim();
            if (lastPart) mathBlockLines.push(lastPart);
            const mathContent = mathBlockLines.join('\n');
            result.push(<MosChatMathBlock key={`mb-${idx}`} math={mathContent} isDark={isDark} />);
            inMathBlock = false;
            mathBlockLines = [];
          } else {
            mathBlockLines.push(line);
          }
          continue;
        }

        // Single-line Block Math: $$formula$$
        if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 2) {
          const mathContent = trimmed.slice(2, -2).trim();
          result.push(<MosChatMathBlock key={`mb-${idx}`} math={mathContent} isDark={isDark} />);
          continue;
        }

        // Horizontal divider / Thematic break: ---, ***, ___
        if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
          result.push(<hr key={`hr-${idx}`} className="my-2 border-t border-slate-200/60 dark:border-slate-700/60" />);
          continue;
        }

        // Headings: # H1 through ###### H6
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const content = headingMatch[2];
          let headingClass = 'text-[12px] font-semibold opacity-80 mt-1 mb-0.5';
          if (level === 1) {
            headingClass = 'text-[15px] font-bold text-amber-500 dark:text-amber-400 tracking-tight mt-1.5 mb-1';
          } else if (level === 2) {
            headingClass = 'text-[13.5px] font-bold opacity-90 mt-1 mb-0.5 text-amber-600 dark:text-amber-300';
          } else if (level === 3) {
            headingClass = 'text-[12.5px] font-semibold opacity-85 mt-1 mb-0.5';
          } else if (level === 4) {
            headingClass = 'text-[12px] font-bold tracking-tight text-amber-600 dark:text-amber-400 mt-1 mb-0.5';
          }
          result.push(
            <div key={`h${level}-${idx}`} className={headingClass}>
              {parseInlineRichText(content, `h${level}-${idx}`)}
            </div>
          );
          continue;
        }

        // Blockquote: > text
        if (line.startsWith('> ') || line === '>') {
          result.push(
            <blockquote
              key={`quote-${idx}`}
              className="my-1 pl-2.5 py-0.5 border-l-2 border-amber-500/70 italic text-[12.5px] opacity-90 rounded-r bg-amber-500/5"
            >
              {parseInlineRichText(line.replace(/^>\s?/, ''), `q-${idx}`)}
            </blockquote>
          );
          continue;
        }

        // Apple Notes Checklist / Todo: - [ ] or - [x]
        if (/^-\s?\[([ xX])\]\s/.test(trimmed)) {
          const isChecked = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]');
          const content = trimmed.replace(/^-\s?\[([ xX])\]\s/, '');
          result.push(
            <div key={`todo-${idx}`} className="flex items-start gap-2 my-0.5 text-[12.5px]">
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  isChecked
                    ? 'bg-amber-500 text-black font-bold'
                    : 'border-2 border-amber-500/70 hover:border-amber-400'
                }`}
              >
                {isChecked ? <Check size={11} strokeWidth={3} /> : null}
              </span>
              <span className={`flex-1 break-words ${isChecked ? 'line-through opacity-60' : ''}`}>
                {parseInlineRichText(content, `t-${idx}`)}
              </span>
            </div>
          );
          continue;
        }

        // Bullet List: - item, * item, or • item
        if (/^[-*•]\s/.test(trimmed) || /^\u2022\s/.test(trimmed)) {
          const content = trimmed.replace(/^[-*•\u2022]\s+/, '');
          result.push(
            <div key={`bullet-${idx}`} className="flex items-start gap-1.5 my-0.5 text-[12.5px]">
              <span className="text-amber-500 shrink-0 select-none font-bold">•</span>
              <span className="flex-1 break-words">{parseInlineRichText(content, `b-${idx}`)}</span>
            </div>
          );
          continue;
        }

        // Numbered List: 1. item
        const numMatch = trimmed.match(/^(\d+)\.\s(.*)$/);
        if (numMatch) {
          const num = numMatch[1];
          const content = numMatch[2];
          result.push(
            <div key={`num-${idx}`} className="flex items-start gap-1.5 my-0.5 text-[12.5px]">
              <span className="text-amber-500 shrink-0 tabular-nums select-none font-semibold text-[11.5px] min-w-[14px]">
                {num}.
              </span>
              <span className="flex-1 break-words">{parseInlineRichText(content, `n-${idx}`)}</span>
            </div>
          );
          continue;
        }

        // Blank lines or standard text
        if (line === '') {
          result.push(<div key={`blank-${idx}`} className="h-2" />);
        } else {
          result.push(
            <div key={`p-${idx}`} className="break-words leading-relaxed">
              {parseInlineRichText(line, `p-${idx}`)}
            </div>
          );
        }
      }

      if (inCodeBlock && codeBlockLines.length > 0) {
        const codeContent = codeBlockLines.join('\n');
        const lang = (codeBlockLang || '').trim().toLowerCase();
        const isMermaid = lang === 'mermaid' || lang.startsWith('mermaid');
        if (isMermaid) {
          result.push(<MosChatMermaidBlock key="cb-mermaid-unclosed" code={codeContent} isDark={isDark} />);
        } else {
          result.push(
            <pre
              key="cb-unclosed"
              className="p-3 my-2 rounded-xl text-[11.5px] font-mono overflow-x-auto leading-relaxed select-text"
              style={{
                background: isDark ? '#0f172a' : '#f8fafc',
                color: isDark ? '#f1f5f9' : '#0f172a',
                border: `1px solid ${borderColor}`,
              }}
            >
              <code>{codeContent}</code>
            </pre>
          );
        }
      }

      if (inMathBlock && mathBlockLines.length > 0) {
        result.push(<MosChatMathBlock key="mb-unclosed" math={mathBlockLines.join('\n')} isDark={isDark} />);
      }

      return <div className="space-y-0.5">{result}</div>;
    },
    [parseInlineRichText, isDark, borderColor, surfaceRaised, token.colorTextSecondary, accentColor, antdMessage]
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
      const currentValue = scope === 'main' ? composerText : threadInput;
      const setValue = scope === 'main' ? setComposerText : setThreadInput;
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
    [composerText, threadInput, inlineTextColor]
  );

  /**
   * Thanh công cụ định dạng gọn gõ nhanh kiểu Google Chat / CKEditor Inline (phù hợp cả iPhone & Desktop)
   * Tích hợp liền mạch ngay đầu khung nhập chữ hoặc nổi phía trên trên di động.
   */
  const renderAppleNotesFormatToolbar = useCallback(
    (scope: 'main' | 'thread', variant: 'inline' | 'floating' = 'floating') => {
      const isMain = scope === 'main';
      const isPreview = isMain ? isPreviewModeMain : isPreviewModeThread;
      const currentVal = isMain ? composerText : threadInput;
      const currentPos = isMain ? composerCursorPos : threadCursorPos;
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
      composerText,
      threadInput,
      composerCursorPos,
      threadCursorPos,
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
      const currentVal = (textarea?.value ?? (scope === 'main' ? composerText : threadInput)) || '';
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
        setComposerText(nextVal);
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
    [composerText, threadInput, mentionState.atIndex, mentionState.cursorIndex]
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
      const otherReceipts = (conv.readReceipts || []).filter(
        (r) =>
          r.staffId !== myStaffId && !doesReceiptMatchAuthor(r.staffId, r.displayName, msg.senderId, msg.senderName)
      );
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
      const otherReceipts = (parentMsg.threadReadReceipts || []).filter(
        (r) =>
          r.staffId !== myStaffId && !doesReceiptMatchAuthor(r.staffId, r.displayName, reply.senderId, reply.senderName)
      );
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
        {items.map((att, idx) => (
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
                  openLightbox(items, idx);
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
        ))}
        {showUploading && (
          <div
            className="h-14 px-3 rounded-lg inline-flex items-center gap-1.5 text-[11px] font-semibold shrink-0"
            style={{ border: `1px dashed ${borderStrong}`, background: surfaceRaised, color: '#d4a84b' }}
          >
            <Loader2 size={14} className="animate-spin" />
            <span>Đang tải ảnh ({uploadingCount})...</span>
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
          setComposerText((prev) => `${prev}${emoji}`);
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
        accept="image/*,.heic,.heif,.HEIC,.HEIF"
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

      {/* ================= GOOGLE CHAT RIGHT WORKSPACE PANEL (FHD, VECTOR ICONS + TOOLTIPS) ================= */}
      <section
        aria-label="mOS Google Chat Workspace"
        className="mos-chat-theme-scope"
        style={{
          position: 'fixed',
          top: isMobile ? 0 : 52,
          right: 0,
          bottom: 0,
          left: isMobile ? 0 : undefined,
          width: isMobile ? '100vw' : maximized ? 'calc(100vw - 224px)' : panelWidth,
          maxWidth: isMobile ? '100vw' : 'calc(100vw - 56px)',
          background: surfaceBg,
          color: token.colorText,
          borderLeft: isMobile
            ? 'none'
            : `1px solid ${isResizingTarget === 'panel' || hoverResizeHandle === 'panel' ? accentColor : borderStrong}`,
          boxShadow: 'var(--mos-shadow)',
          display: 'flex',
          zIndex: isMobile ? 1200 : 995,
          transform: open ? 'translateX(0)' : 'translateX(104%)',
          transition: isResizingTarget
            ? 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
            : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), width 0.2s ease',
        }}
      >
        {/* LEFT EDGE RESIZE HANDLE (Drag to resize chat panel width, double-click to reset) */}
        {!isMobile && (
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
            <div
              style={{
                position: 'relative',
                width: isMobile ? '100%' : sidebarWidth,
                borderRight: isMobile
                  ? 'none'
                  : `1px solid ${
                      isResizingTarget === 'sidebar' || hoverResizeHandle === 'sidebar' ? accentColor : borderColor
                    }`,
                display: isMobile && mobileActiveView !== 'inbox' ? 'none' : 'flex',
                flexDirection: 'column',
                background: surfaceBg,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: 10,
                  borderBottom: `1px solid ${borderColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <Tooltip title="Đổi trạng thái: Đang hoạt động / Không làm phiền (Tắt chuông)">
                    <button
                      type="button"
                      onClick={() => setPresence((p) => (p === 'active' ? 'dnd' : 'active'))}
                      className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer min-w-0"
                      style={{
                        background: surfaceRaised,
                        border: `1px solid ${borderColor}`,
                        color: token.colorText,
                      }}
                    >
                      {renderUserAvatarNode({
                        staffId: currentUser?.id || 'me',
                        name: currentUser?.displayName || currentUser?.username || 'Danny Do',
                        username: currentUser?.username,
                        rawAvatar: currentUser?.avatarUrl || currentUser?.avatar,
                        bgColor: '#d4a84b',
                        sizeClass: 'w-5 h-5',
                        textSizeClass: 'text-[9.5px]',
                      })}
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ background: presence === 'active' ? '#22c55e' : '#ef4444' }}
                      />
                      <span className="truncate">{presence === 'active' ? 'Đang hoạt động' : 'Không làm phiền'}</span>
                      <ChevronDown size={13} className="shrink-0" />
                    </button>
                  </Tooltip>

                  <div className="flex items-center gap-1 shrink-0">
                    {isDannyAccount && (
                      <Tooltip title="Phân quyền Đội nhóm & Cá nhân vào mOS Chat">
                        <button
                          type="button"
                          aria-label="Phân quyền Đội nhóm & Cá nhân vào mOS Chat"
                          onClick={() => {
                            setAccessConfigTab('chat');
                            setAccessConfigModalOpen(true);
                          }}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer shrink-0 transition-colors"
                          style={{
                            background:
                              accessConfig.allowAllStaff ||
                              accessConfig.allowedGroupKeys.length > 0 ||
                              accessConfig.allowedStaffIds.length > 0
                                ? 'rgba(139, 92, 246, 0.16)'
                                : surfaceRaised,
                            border: `1px solid ${borderColor}`,
                            color: '#a78bfa',
                          }}
                        >
                          <ShieldCheck size={14} />
                        </button>
                      </Tooltip>
                    )}

                    <Tooltip title="Tuỳ chỉnh danh sách cá nhân (Mục tuỳ chỉnh / Ghim / Ẩn - Giống Google Chat Workspace)">
                      <button
                        type="button"
                        aria-label="Tuỳ chỉnh danh sách cá nhân"
                        onClick={() => {
                          setSidebarCustomizeTab('sections');
                          setSidebarCustomizeModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer shrink-0 transition-colors"
                        style={{
                          background:
                            (userPrefs.customSections?.length || 0) > 0 ||
                            (userPrefs.pinnedIds?.length || 0) > 0 ||
                            (userPrefs.hiddenIds?.length || 0) > 0
                              ? 'rgba(212, 168, 75, 0.16)'
                              : surfaceRaised,
                          border: `1px solid ${borderColor}`,
                          color:
                            (userPrefs.customSections?.length || 0) > 0 ||
                            (userPrefs.pinnedIds?.length || 0) > 0 ||
                            (userPrefs.hiddenIds?.length || 0) > 0
                              ? '#d4a84b'
                              : token.colorTextSecondary,
                        }}
                      >
                        <FolderKanban size={14} />
                      </button>
                    </Tooltip>

                    <Tooltip title="Tạo cuộc trò chuyện hoặc Space mới">
                      <button
                        type="button"
                        aria-label="Tạo cuộc trò chuyện hoặc Space mới"
                        onClick={() => setNewRoomModalOpen(true)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer shrink-0"
                        style={{
                          background: surfaceRaised,
                          border: `1px solid ${borderColor}`,
                          color: token.colorTextSecondary,
                        }}
                      >
                        <Plus size={15} />
                      </button>
                    </Tooltip>

                    {isMobile && (
                      <button
                        type="button"
                        aria-label="Đóng mOS Chat"
                        onClick={onClose}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer shrink-0 transition-colors"
                        style={{
                          background: surfaceRaised,
                          border: `1px solid ${borderColor}`,
                          color: token.colorTextSecondary,
                        }}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Search Input */}
                <div
                  className="flex items-center gap-2 px-2.5 h-8 rounded-lg"
                  style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                >
                  <Search size={14} style={{ color: token.colorTextTertiary }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm đồng nghiệp, #Space..."
                    className="w-full bg-transparent border-0 outline-none text-[12px]"
                    style={{ color: token.colorText }}
                  />
                </div>

                {/* Icon-only Filter Bar with Tooltips */}
                <div
                  className="grid grid-cols-4 gap-1 p-1 rounded-lg"
                  style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                >
                  <Tooltip title="Tất cả hội thoại">
                    <button
                      type="button"
                      aria-label="Tất cả hội thoại"
                      onClick={() => {
                        setSidebarFilter('all');
                        setActiveSubtab('chat');
                        if (isMobile) {
                          setMobileActiveView('inbox');
                        }
                      }}
                      className="h-7 rounded-md inline-flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer"
                      style={{
                        background: sidebarFilter === 'all' && activeSubtab !== 'tasks' ? surfaceBg : 'transparent',
                        color:
                          sidebarFilter === 'all' && activeSubtab !== 'tasks' ? '#d4a84b' : token.colorTextSecondary,
                      }}
                    >
                      <Inbox size={14} />
                    </button>
                  </Tooltip>

                  <Tooltip title="Tin nhắn chưa đọc">
                    <button
                      type="button"
                      aria-label="Tin nhắn chưa đọc"
                      onClick={() => {
                        setSidebarFilter('unread');
                        setActiveSubtab('chat');
                        if (isMobile) {
                          setMobileActiveView('inbox');
                        }
                      }}
                      className="h-7 rounded-md inline-flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer tabular-nums"
                      style={{
                        background: sidebarFilter === 'unread' ? surfaceBg : 'transparent',
                        color: sidebarFilter === 'unread' ? '#d4a84b' : token.colorTextSecondary,
                      }}
                    >
                      <Mail size={14} />
                      <span>
                        {visibleConversations.reduce((s, c) => {
                          if ((userPrefs.mutedIds || []).includes(c.id)) return s;
                          return s + getEffectiveUnreadCount(c);
                        }, 0)}
                      </span>
                    </button>
                  </Tooltip>

                  <Tooltip title="Nhóm & Phòng ban (#Spaces)">
                    <button
                      type="button"
                      aria-label="Nhóm & Phòng ban (#Spaces)"
                      onClick={() => {
                        setSidebarFilter('spaces');
                        setActiveSubtab('chat');
                        if (isMobile) {
                          setMobileActiveView('inbox');
                        }
                      }}
                      className="h-7 rounded-md inline-flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer"
                      style={{
                        background: sidebarFilter === 'spaces' ? surfaceBg : 'transparent',
                        color: sidebarFilter === 'spaces' ? '#d4a84b' : token.colorTextSecondary,
                      }}
                    >
                      <Hash size={14} />
                    </button>
                  </Tooltip>

                  <Tooltip title="Kho Công việc & Nhắc hẹn (Tasks)">
                    <button
                      type="button"
                      aria-label="Kho Công việc & Nhắc hẹn (Tasks)"
                      onClick={() => {
                        setActiveSubtab('tasks');
                        if (isMobile) {
                          setMobileActiveView('conversation');
                        }
                      }}
                      className="h-7 rounded-md inline-flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer tabular-nums"
                      style={{
                        background: activeSubtab === 'tasks' ? surfaceBg : 'transparent',
                        color: activeSubtab === 'tasks' ? '#d4a84b' : token.colorTextSecondary,
                      }}
                    >
                      <AlarmClock size={14} />
                      <span>{uniqueTasks.filter((t) => !t.done).length}</span>
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Scrollable List of Custom Sections, DIRECT MESSAGES & SPACES (Google Chat Workspace Per-User Layout) */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                {sidebarSections.map((sec, secIdx) => {
                  const isSectionMenuOpen = openSectionMenuId === sec.id;
                  const sectionMenuContent = (
                    <div
                      data-no-chat-autofocus="true"
                      onClick={(e) => e.stopPropagation()}
                      className="w-56 py-1 select-none text-[12px]"
                    >
                      <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Tuỳ chỉnh mục · {sec.title}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          toggleUnreadOnlySection(sec.id);
                          setOpenSectionMenuId(null);
                        }}
                        className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                        style={{ color: token.colorText }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Mail size={13} className="text-amber-500" />
                          <span>Chỉ hiện tin chưa đọc</span>
                        </span>
                        {sec.unreadOnly && <Check size={13} className="text-emerald-500" />}
                      </button>

                      <button
                        type="button"
                        disabled={secIdx === 0}
                        onClick={() => {
                          handleMoveSectionOrder(sec.id, 'up');
                          setOpenSectionMenuId(null);
                        }}
                        className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ color: token.colorText }}
                      >
                        <ArrowUp size={13} />
                        <span>Di chuyển mục lên trên</span>
                      </button>

                      <button
                        type="button"
                        disabled={secIdx === sidebarSections.length - 1}
                        onClick={() => {
                          handleMoveSectionOrder(sec.id, 'down');
                          setOpenSectionMenuId(null);
                        }}
                        className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ color: token.colorText }}
                      >
                        <ArrowDown size={13} />
                        <span>Di chuyển mục xuống dưới</span>
                      </button>

                      <div className="my-1" style={{ borderTop: `1px solid ${borderColor}` }} />

                      <button
                        type="button"
                        onClick={() => {
                          setOpenSectionMenuId(null);
                          setQuickCreateSectionTargetConvId(null);
                          setQuickCreateSectionName('');
                          setQuickCreateSectionModalOpen(true);
                        }}
                        className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                        style={{ color: token.colorText }}
                      >
                        <FolderPlus size={13} className="text-sky-400" />
                        <span>Tạo mục tuỳ chỉnh mới...</span>
                      </button>

                      {sec.isCustom && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenSectionMenuId(null);
                              setEditingSectionId(sec.id);
                              setEditingSectionName(sec.title);
                              setSidebarCustomizeTab('sections');
                              setSidebarCustomizeModalOpen(true);
                            }}
                            className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                            style={{ color: token.colorText }}
                          >
                            <Pencil size={13} />
                            <span>Đổi tên mục...</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteCustomSection(sec.id);
                              setOpenSectionMenuId(null);
                            }}
                            className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-rose-500/10 cursor-pointer text-left text-rose-500"
                          >
                            <Trash2 size={13} />
                            <span>Xoá mục tuỳ chỉnh</span>
                          </button>
                        </>
                      )}

                      <div className="my-1" style={{ borderTop: `1px solid ${borderColor}` }} />

                      <button
                        type="button"
                        onClick={() => {
                          setOpenSectionMenuId(null);
                          setSidebarCustomizeTab('sections');
                          setSidebarCustomizeModalOpen(true);
                        }}
                        className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left font-semibold"
                        style={{ color: '#d4a84b' }}
                      >
                        <FolderKanban size={13} />
                        <span>Quản lý tất cả mục & Đã ẩn...</span>
                      </button>
                    </div>
                  );

                  return (
                    <div key={sec.id} className="mb-1">
                      {/* Section Header */}
                      <div className="group/sec flex items-center justify-between px-1.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <button
                          type="button"
                          onClick={() => toggleCollapseSection(sec.id)}
                          className="flex items-center gap-1 min-w-0 flex-1 text-left cursor-pointer"
                          style={{ color: sec.isCustom ? '#d4a84b' : undefined }}
                        >
                          {sec.collapsed ? (
                            <ChevronRight size={13} className="shrink-0" />
                          ) : (
                            <ChevronDown size={13} className="shrink-0" />
                          )}
                          <span className="truncate">{sec.title}</span>
                          {sec.unreadOnly && (
                            <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold bg-amber-500/20 text-amber-400 shrink-0">
                              Chưa đọc
                            </span>
                          )}
                          {sec.collapsed && sec.unreadCount > 0 ? (
                            <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold tabular-nums shrink-0">
                              {sec.unreadCount}
                            </span>
                          ) : sec.collapsed && sec.totalCount > 0 ? (
                            <span className="text-[9.5px] text-slate-500 tabular-nums shrink-0">
                              ({sec.totalCount})
                            </span>
                          ) : null}
                        </button>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <Popover
                            open={isSectionMenuOpen}
                            onOpenChange={(v) => setOpenSectionMenuId(v ? sec.id : null)}
                            trigger="click"
                            placement="bottomRight"
                            zIndex={1150}
                            content={sectionMenuContent}
                          >
                            <Tooltip title={`Tuỳ chỉnh mục ${sec.title}`}>
                              <button
                                type="button"
                                aria-label={`Tuỳ chỉnh mục ${sec.title}`}
                                onClick={(e) => e.stopPropagation()}
                                className="w-5 h-5 rounded inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer opacity-70 group-hover/sec:opacity-100"
                              >
                                <MoreVertical size={12} />
                              </button>
                            </Tooltip>
                          </Popover>

                          <Tooltip
                            title={
                              sec.id === 'dm'
                                ? 'Bắt đầu Chat 1-1 mới'
                                : sec.id === 'spaces'
                                  ? 'Tạo Space nhóm mới'
                                  : `Thêm cuộc trò chuyện vào ${sec.title}`
                            }
                          >
                            <button
                              type="button"
                              aria-label={
                                sec.id === 'dm'
                                  ? 'Bắt đầu Chat 1-1 mới'
                                  : sec.id === 'spaces'
                                    ? 'Tạo Space nhóm mới'
                                    : `Thêm cuộc trò chuyện vào ${sec.title}`
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                if (sec.id === 'dm') {
                                  setNewRoomType('dm');
                                  setNewRoomModalOpen(true);
                                } else if (sec.id === 'spaces') {
                                  setNewRoomType('space');
                                  setNewRoomModalOpen(true);
                                } else {
                                  setSidebarCustomizeTab('conversations');
                                  setSidebarCustomizeModalOpen(true);
                                }
                              }}
                              className="w-5 h-5 rounded inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                            >
                              <Plus size={13} />
                            </button>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Section Items */}
                      {!sec.collapsed &&
                        (sec.items.length === 0 ? (
                          <div className="px-2.5 py-1.5 text-[11px] text-slate-500 italic">
                            {sec.unreadOnly
                              ? 'Không có tin nhắn chưa đọc trong mục này'
                              : sec.isCustom
                                ? 'Mục trống · Nhấn ⋮ trên cuộc trò chuyện để chuyển vào đây'
                                : 'Chưa có cuộc trò chuyện'}
                          </div>
                        ) : (
                          (() => {
                            const pinnedSetForSec = new Set(userPrefs.pinnedIds || []);
                            const pinnedCountInSec = sec.items.filter((c) => pinnedSetForSec.has(c.id)).length;
                            const unpinnedCountInSec = sec.items.length - pinnedCountInSec;

                            return sec.items.map((conv, itemIdx) => {
                              const isAiConv = conv.id === AI_COPILOT_CONV_ID;
                              const isSelfConv = Boolean(conv.isSelf || conv.id.startsWith('dm-self-'));
                              const isSpace = conv.type === 'space';
                              const lastMsg = conv.messages[conv.messages.length - 1];
                              const isSelected = conv.id === activeConversation?.id;
                              const isPinned = pinnedSetForSec.has(conv.id);
                              const prevItem = itemIdx > 0 ? sec.items[itemIdx - 1] : null;
                              const showPinnedSubHeader = itemIdx === 0 && isPinned;
                              const showUnpinnedSubHeader =
                                pinnedCountInSec > 0 && !isPinned && (!prevItem || pinnedSetForSec.has(prevItem.id));
                              const isMuted = (userPrefs.mutedIds || []).includes(conv.id);
                              const effUnread = getEffectiveUnreadCount(conv);
                              const isConvMenuOpen = openConvMenuId === conv.id;
                              const isDragTarget =
                                dragOverSidebarConvId === conv.id &&
                                draggingSidebarConv?.sectionId === sec.id &&
                                draggingSidebarConv?.convId !== conv.id;
                              const currentCustomSec = (userPrefs.customSections || []).find((cs) =>
                                (cs.conversationIds || []).includes(conv.id)
                              );
                              const previewText =
                                formatChatPreviewWithStickers(lastMsg?.text) ||
                                (lastMsg?.attachments?.length
                                  ? `Hình ảnh (${lastMsg.attachments.length})`
                                  : conv.subtitle);

                              const convMenuContent = (
                                <div
                                  data-no-chat-autofocus="true"
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-60 py-1 select-none text-[12px]"
                                >
                                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
                                    {isSpace ? `#${conv.name}` : conv.name}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      togglePinConversation(conv.id);
                                      setOpenConvMenuId(null);
                                    }}
                                    className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                                    style={{ color: token.colorText }}
                                  >
                                    {isPinned ? (
                                      <PinOff size={13} className="text-amber-500" />
                                    ) : (
                                      <Pin size={13} className="text-amber-500" />
                                    )}
                                    <span>{isPinned ? 'Bỏ ghim khỏi đầu mục' : 'Ghim lên đầu mục (Pin)'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      toggleManualUnreadConversation(conv);
                                      setOpenConvMenuId(null);
                                    }}
                                    className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                                    style={{ color: token.colorText }}
                                  >
                                    {effUnread > 0 ? (
                                      <MailOpen size={13} />
                                    ) : (
                                      <Mail size={13} className="text-rose-500" />
                                    )}
                                    <span>{effUnread > 0 ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      toggleMuteConversation(conv.id);
                                      setOpenConvMenuId(null);
                                    }}
                                    className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                                    style={{ color: token.colorText }}
                                  >
                                    {isMuted ? (
                                      <Bell size={13} className="text-emerald-500" />
                                    ) : (
                                      <BellOff size={13} className="text-slate-400" />
                                    )}
                                    <span>{isMuted ? 'Bật thông báo' : 'Tắt thông báo (Mute)'}</span>
                                  </button>

                                  <div className="my-1" style={{ borderTop: `1px solid ${borderColor}` }} />

                                  <div className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Chuyển tới mục (Google Chat Sections)
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      moveConversationToSection(conv.id, 'default');
                                      setOpenConvMenuId(null);
                                    }}
                                    className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                                    style={{ color: token.colorText }}
                                  >
                                    <span className="truncate">
                                      {isSpace ? 'SPACES (Mặc định)' : 'DIRECT MESSAGES (Mặc định)'}
                                    </span>
                                    {!currentCustomSec && <Check size={13} className="text-emerald-500 shrink-0" />}
                                  </button>

                                  {(userPrefs.customSections || []).map((cs) => (
                                    <button
                                      key={cs.id}
                                      type="button"
                                      onClick={() => {
                                        moveConversationToSection(conv.id, cs.id);
                                        setOpenConvMenuId(null);
                                      }}
                                      className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                                      style={{ color: token.colorText }}
                                    >
                                      <span className="truncate">📁 {cs.name}</span>
                                      {currentCustomSec?.id === cs.id && (
                                        <Check size={13} className="text-emerald-500 shrink-0" />
                                      )}
                                    </button>
                                  ))}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenConvMenuId(null);
                                      setQuickCreateSectionTargetConvId(conv.id);
                                      setQuickCreateSectionName('');
                                      setQuickCreateSectionModalOpen(true);
                                    }}
                                    className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left text-sky-400 font-semibold"
                                  >
                                    <FolderPlus size={13} />
                                    <span>+ Tạo mục mới & chuyển vào...</span>
                                  </button>

                                  <div className="my-1" style={{ borderTop: `1px solid ${borderColor}` }} />

                                  <div className="grid grid-cols-2 gap-1 px-1">
                                    <button
                                      type="button"
                                      disabled={itemIdx === 0}
                                      onClick={() => {
                                        moveConversationOrderInSection(conv.id, sec.id, 'up', sec.items);
                                        setOpenConvMenuId(null);
                                      }}
                                      className="px-2 py-1 flex items-center justify-center gap-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
                                      style={{ color: token.colorText }}
                                    >
                                      <ArrowUp size={12} />
                                      <span>Lên trên</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={itemIdx === sec.items.length - 1}
                                      onClick={() => {
                                        moveConversationOrderInSection(conv.id, sec.id, 'down', sec.items);
                                        setOpenConvMenuId(null);
                                      }}
                                      className="px-2 py-1 flex items-center justify-center gap-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
                                      style={{ color: token.colorText }}
                                    >
                                      <ArrowDown size={12} />
                                      <span>Xuống dưới</span>
                                    </button>
                                  </div>

                                  <div className="my-1" style={{ borderTop: `1px solid ${borderColor}` }} />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDockedConvIds((prev) => {
                                        const next = prev.includes(conv.id) ? prev : [...prev, conv.id];
                                        return next.slice(-2);
                                      });
                                      setOpenConvMenuId(null);
                                    }}
                                    className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                                    style={{ color: token.colorText }}
                                  >
                                    <ExternalLink size={13} />
                                    <span>Mở cửa sổ thu nhỏ (Mini Dock)</span>
                                  </button>

                                  {!isAiConv && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        toggleHideConversation(conv);
                                        setOpenConvMenuId(null);
                                      }}
                                      className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left text-amber-500"
                                    >
                                      <EyeOff size={13} />
                                      <span>Ẩn khỏi danh sách của tôi</span>
                                    </button>
                                  )}

                                  {isSpace && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenConvMenuId(null);
                                        setActiveConvId(conv.id);
                                        setSpaceConfigModalOpen(true);
                                      }}
                                      className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left text-blue-500 font-semibold"
                                    >
                                      <Settings size={13} />
                                      <span>Cài đặt & Cấu hình Space...</span>
                                    </button>
                                  )}

                                  {isSpace && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void handleLeaveOrJoinSpace(conv);
                                        setOpenConvMenuId(null);
                                      }}
                                      className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-rose-500/10 cursor-pointer text-left text-rose-500"
                                    >
                                      <LogOut size={13} />
                                      <span>Rời khỏi Space này</span>
                                    </button>
                                  )}
                                </div>
                              );

                              return (
                                <React.Fragment key={conv.id}>
                                  {showPinnedSubHeader && (
                                    <div className="px-2 pt-1 pb-0.5 flex items-center justify-between text-[9.5px] font-extrabold uppercase tracking-wider text-amber-400 select-none">
                                      <span className="inline-flex items-center gap-1">
                                        <Pin size={10} className="fill-amber-400 text-amber-400" />
                                        <span>ĐÃ GHIM CÁ NHÂN ({pinnedCountInSec})</span>
                                      </span>
                                      <span className="text-[9px] font-medium text-slate-400 normal-case">
                                        Kéo thả / ↑↓ để xếp
                                      </span>
                                    </div>
                                  )}
                                  {showUnpinnedSubHeader && (
                                    <div
                                      className="px-2 pt-1.5 pb-0.5 mt-1 flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-slate-400 select-none"
                                      style={{ borderTop: `1px dashed ${borderColor}` }}
                                    >
                                      <span>
                                        {sec.id === 'spaces'
                                          ? `TẤT CẢ SPACES (${unpinnedCountInSec})`
                                          : `KHÁC (${unpinnedCountInSec})`}
                                      </span>
                                    </div>
                                  )}
                                  <div
                                    draggable
                                    onDragStart={(e) => {
                                      setDraggingSidebarConv({ convId: conv.id, sectionId: sec.id });
                                      e.dataTransfer.effectAllowed = 'move';
                                      try {
                                        e.dataTransfer.setData('text/plain', conv.id);
                                      } catch {
                                        // ignore
                                      }
                                    }}
                                    onDragOver={(e) => {
                                      if (draggingSidebarConv && draggingSidebarConv.sectionId === sec.id) {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'move';
                                        if (dragOverSidebarConvId !== conv.id) {
                                          setDragOverSidebarConvId(conv.id);
                                        }
                                      }
                                    }}
                                    onDragLeave={() => {
                                      if (dragOverSidebarConvId === conv.id) {
                                        setDragOverSidebarConvId(null);
                                      }
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (
                                        draggingSidebarConv &&
                                        draggingSidebarConv.sectionId === sec.id &&
                                        draggingSidebarConv.convId !== conv.id
                                      ) {
                                        reorderConversationByDragDrop(
                                          draggingSidebarConv.convId,
                                          conv.id,
                                          sec.id,
                                          sec.items
                                        );
                                      }
                                      setDraggingSidebarConv(null);
                                      setDragOverSidebarConvId(null);
                                    }}
                                    onDragEnd={() => {
                                      setDraggingSidebarConv(null);
                                      setDragOverSidebarConvId(null);
                                    }}
                                    onClick={() => selectConversation(conv.id)}
                                    className="group/conv relative flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer mb-0.5 transition-all"
                                    style={{
                                      background: isDragTarget
                                        ? 'rgba(245, 158, 11, 0.16)'
                                        : isSelected
                                          ? isAiConv
                                            ? 'rgba(139, 92, 246, 0.18)'
                                            : isSelfConv
                                              ? 'rgba(99, 102, 241, 0.18)'
                                              : 'rgba(59, 130, 246, 0.14)'
                                          : isPinned
                                            ? isDark
                                              ? 'rgba(245, 158, 11, 0.06)'
                                              : 'rgba(245, 158, 11, 0.08)'
                                            : isAiConv
                                              ? 'rgba(139, 92, 246, 0.07)'
                                              : isSelfConv
                                                ? 'rgba(99, 102, 241, 0.06)'
                                                : 'transparent',
                                      border: isDragTarget
                                        ? '1px dashed #f59e0b'
                                        : isAiConv
                                          ? '1px solid rgba(139, 92, 246, 0.28)'
                                          : isSelfConv
                                            ? '1px solid rgba(99, 102, 241, 0.25)'
                                            : isPinned
                                              ? '1px solid rgba(245, 158, 11, 0.22)'
                                              : '1px solid transparent',
                                      borderLeft: isPinned ? '2.5px solid #f59e0b' : undefined,
                                      opacity:
                                        draggingSidebarConv?.convId === conv.id
                                          ? 0.5
                                          : isMuted && !isSelected
                                            ? 0.72
                                            : 1,
                                    }}
                                  >
                                    {isSpace ? (
                                      <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base"
                                        style={{ background: `${conv.color}22`, color: conv.color }}
                                      >
                                        {conv.avatar && isSpaceEmoji(conv.avatar) ? (
                                          <span className="select-none leading-none">{conv.avatar}</span>
                                        ) : (
                                          <Hash size={16} />
                                        )}
                                      </div>
                                    ) : (
                                      renderUserAvatarNode({
                                        staffId: isSelfConv ? currentUser?.id || 'me' : conv.participantStaffId,
                                        name: conv.name,
                                        rawAvatar: conv.avatar,
                                        bgColor: conv.color || '#ec4899',
                                        sizeClass: 'w-8 h-8',
                                        roundedClass: 'rounded-full',
                                        isOnline: isConversationParticipantOnline(conv),
                                        isAiBot: isAiConv,
                                        isSelfBookmark: isSelfConv,
                                      })
                                    )}

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-1 min-w-0">
                                          <span
                                            className={`text-[12.5px] truncate ${
                                              effUnread > 0 || isAiConv || isSelfConv
                                                ? 'font-extrabold'
                                                : 'font-semibold'
                                            }`}
                                            style={{
                                              color: isAiConv
                                                ? isDark
                                                  ? '#c4b5fd'
                                                  : '#6d28d9'
                                                : isSelfConv
                                                  ? isDark
                                                    ? '#a5b4fc'
                                                    : '#4338ca'
                                                  : undefined,
                                            }}
                                          >
                                            {conv.name}
                                          </span>
                                          {isSelfConv && (
                                            <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-400 shrink-0">
                                              Bạn
                                            </span>
                                          )}
                                          {isPinned && (
                                            <Tooltip title="Đã ghim cá nhân · Nhấn để bỏ ghim">
                                              <button
                                                type="button"
                                                aria-label="Bỏ ghim"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  togglePinConversation(conv.id);
                                                }}
                                                className="inline-flex items-center justify-center w-4 h-4 rounded hover:bg-amber-500/20 cursor-pointer shrink-0"
                                              >
                                                <Pin size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                                              </button>
                                            </Tooltip>
                                          )}
                                          {isMuted && (
                                            <Tooltip title="Đang tắt thông báo">
                                              <BellOff size={11} className="text-slate-400 shrink-0" />
                                            </Tooltip>
                                          )}
                                        </div>

                                        {/* Right side: Time / Badge OR Hover Quick Action Buttons (Pin + Up/Down + More ⋮) */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          <div
                                            className={`${
                                              isConvMenuOpen ? 'hidden' : 'flex group-hover/conv:hidden'
                                            } items-center gap-1`}
                                          >
                                            {isAiConv ? (
                                              <span
                                                className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                                                style={{ background: 'rgba(139, 92, 246, 0.18)', color: '#a78bfa' }}
                                              >
                                                Riêng tư
                                              </span>
                                            ) : (
                                              <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                                                {lastMsg?.timeLabel || ''}
                                              </span>
                                            )}
                                          </div>

                                          <div
                                            onClick={(e) => e.stopPropagation()}
                                            className={`${
                                              isConvMenuOpen ? 'flex' : 'hidden group-hover/conv:flex'
                                            } items-center gap-0.5`}
                                          >
                                            <Tooltip
                                              title={
                                                isPinned
                                                  ? 'Bỏ ghim khỏi đầu danh sách cá nhân'
                                                  : '📌 Ghim lên đầu danh sách cá nhân (lưu tự động)'
                                              }
                                            >
                                              <button
                                                type="button"
                                                aria-label={isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                                                onClick={() => togglePinConversation(conv.id)}
                                                className="w-5 h-5 rounded inline-flex items-center justify-center hover:bg-amber-500/20 cursor-pointer"
                                                style={{
                                                  color: isPinned ? '#f59e0b' : token.colorTextSecondary,
                                                  background: isPinned ? 'rgba(245, 158, 11, 0.15)' : undefined,
                                                }}
                                              >
                                                <Pin size={11.5} className={isPinned ? 'fill-amber-400' : ''} />
                                              </button>
                                            </Tooltip>

                                            {sec.items.length > 1 && (
                                              <>
                                                <Tooltip title="Đưa lên trên">
                                                  <button
                                                    type="button"
                                                    aria-label="Đưa lên trên"
                                                    disabled={itemIdx === 0}
                                                    onClick={() =>
                                                      moveConversationOrderInSection(conv.id, sec.id, 'up', sec.items)
                                                    }
                                                    className="w-4 h-5 rounded inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                    style={{ color: token.colorTextSecondary }}
                                                  >
                                                    <ArrowUp size={10.5} />
                                                  </button>
                                                </Tooltip>
                                                <Tooltip title="Đưa xuống dưới">
                                                  <button
                                                    type="button"
                                                    aria-label="Đưa xuống dưới"
                                                    disabled={itemIdx === sec.items.length - 1}
                                                    onClick={() =>
                                                      moveConversationOrderInSection(conv.id, sec.id, 'down', sec.items)
                                                    }
                                                    className="w-4 h-5 rounded inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                    style={{ color: token.colorTextSecondary }}
                                                  >
                                                    <ArrowDown size={10.5} />
                                                  </button>
                                                </Tooltip>
                                              </>
                                            )}

                                            <Tooltip title={effUnread > 0 ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}>
                                              <button
                                                type="button"
                                                aria-label={effUnread > 0 ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
                                                onClick={() => toggleManualUnreadConversation(conv)}
                                                className="w-5 h-5 rounded inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer"
                                                style={{ color: effUnread > 0 ? '#f43f5e' : token.colorTextSecondary }}
                                              >
                                                {effUnread > 0 ? <MailOpen size={11} /> : <Mail size={11} />}
                                              </button>
                                            </Tooltip>

                                            <Popover
                                              open={isConvMenuOpen}
                                              onOpenChange={(v) => setOpenConvMenuId(v ? conv.id : null)}
                                              trigger="click"
                                              placement="bottomRight"
                                              zIndex={1150}
                                              content={convMenuContent}
                                            >
                                              <Tooltip title="Tuỳ chọn cuộc trò chuyện (Ghim / Chuyển mục / Tắt thông báo / Ẩn)">
                                                <button
                                                  type="button"
                                                  aria-label="Tuỳ chọn cuộc trò chuyện"
                                                  className="w-5 h-5 rounded inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer"
                                                  style={{ color: token.colorTextSecondary }}
                                                >
                                                  <MoreVertical size={12} />
                                                </button>
                                              </Tooltip>
                                            </Popover>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-1 min-w-0 flex-1">
                                          {lastMsg &&
                                            !isAiConv &&
                                            !isSelfConv &&
                                            isMessageFromCurrentUser(lastMsg) &&
                                            (() => {
                                              const { seenBy, unseenBy } = getMessageReadBreakdown(conv, lastMsg);
                                              return renderReadStatusCheckmark(seenBy, unseenBy, {
                                                compact: true,
                                                scopeLabel: 'Trạng thái tin nhắn cuối',
                                              });
                                            })()}
                                          <span
                                            className={`text-[11px] truncate ${
                                              effUnread > 0
                                                ? 'font-bold text-slate-200 dark:text-slate-200'
                                                : 'text-slate-400'
                                            }`}
                                          >
                                            {previewText}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          {conv.hasUnreadBuzz && effUnread > 0 && (
                                            <Tooltip title="🚨 Có tin nhắn KHẨN CẤP (BUZZ) chưa đọc!">
                                              <span className="inline-flex items-center gap-0.5 justify-center px-1.5 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black animate-pulse shadow-sm shrink-0">
                                                <Zap size={9} className="fill-slate-950" />
                                                BUZZ
                                              </span>
                                            </Tooltip>
                                          )}
                                          {(conv.unreadThreadCount || 0) > 0 && conv.id !== activeConvId && (
                                            <Tooltip
                                              title={`${conv.unreadThreadCount} câu trả lời mới trong luồng phụ (Sub-thread)`}
                                            >
                                              <span className="inline-flex items-center gap-0.5 justify-center px-1.5 h-4 rounded-full bg-indigo-500/20 text-indigo-400 text-[9.5px] font-extrabold tabular-nums shrink-0">
                                                <MessageSquareReply size={9.5} />
                                                {conv.unreadThreadCount}
                                              </span>
                                            </Tooltip>
                                          )}
                                          {effUnread > 0 && (
                                            <span className="inline-flex items-center justify-center px-1.5 h-4 rounded-full bg-rose-500 text-white text-[10px] font-extrabold tabular-nums shrink-0">
                                              {effUnread}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </React.Fragment>
                              );
                            });
                          })()
                        ))}
                    </div>
                  );
                })}

                {/* Hidden Conversations / Quick Customize Footer */}
                <div className="pt-2 px-1.5 flex items-center justify-between gap-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarCustomizeTab((userPrefs.hiddenIds?.length || 0) > 0 ? 'conversations' : 'sections');
                      setSidebarCustomizeModalOpen(true);
                    }}
                    className="w-full py-1.5 px-2 rounded-lg flex items-center justify-between gap-1.5 text-[11px] font-semibold cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{ color: token.colorTextSecondary }}
                  >
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <FolderKanban size={13} className="text-amber-500 shrink-0" />
                      <span className="truncate">Tuỳ chỉnh mục & danh sách</span>
                    </span>
                    {(userPrefs.hiddenIds?.length || 0) > 0 && (
                      <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500/20 text-amber-400 tabular-nums shrink-0">
                        {userPrefs.hiddenIds.length} đang ẩn
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* SIDEBAR DIVIDER RESIZE HANDLE (Drag to resize sidebar width, double-click to reset) */}
              {!isMobile && (
                <Tooltip
                  title="Kéo để thay đổi độ rộng cột danh sách (Nhấp đúp để đặt lại 264px)"
                  placement="right"
                  mouseEnterDelay={0.5}
                >
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Kéo để thay đổi chiều rộng cột danh sách"
                    data-no-chat-autofocus="true"
                    onMouseEnter={() => setHoverResizeHandle('sidebar')}
                    onMouseLeave={() => setHoverResizeHandle((prev) => (prev === 'sidebar' ? null : prev))}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsResizingTarget('sidebar');
                    }}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      sidebarWidthRef.current = 264;
                      setSidebarWidth(264);
                      persistPersonalLayout({ sidebarWidth: 264 });
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      right: -4,
                      width: 8,
                      cursor: 'col-resize',
                      zIndex: 25,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isResizingTarget === 'sidebar' && (
                      <div
                        className="px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums shadow-lg pointer-events-none"
                        style={{
                          position: 'absolute',
                          left: 10,
                          background: '#111827',
                          color: '#d4a84b',
                          border: '1px solid rgba(212, 168, 75, 0.45)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sidebarWidth}px
                      </div>
                    )}
                  </div>
                </Tooltip>
              )}
            </div>

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
                        {activeConversation?.type === 'space' &&
                          (() => {
                            const myId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
                            const myNick = activeConversation.memberNicknames?.[String(myId)];
                            return (
                              <Tooltip
                                title={
                                  myNick
                                    ? `Biệt danh của bạn trong nhóm: "${myNick}" (Bấm để đổi)`
                                    : 'Đặt biệt danh của bạn trong nhóm này'
                                }
                              >
                                <button
                                  type="button"
                                  aria-label="Đổi biệt danh trong nhóm"
                                  onClick={() => handleOpenNicknameModal(myId)}
                                  className="inline-flex items-center gap-1 h-6 px-2 rounded-full transition-all cursor-pointer hover:opacity-90 ml-1 shrink-0 text-[11px]"
                                  style={{
                                    background: myNick ? 'rgba(16, 185, 129, 0.15)' : 'rgba(212, 168, 75, 0.14)',
                                    color: myNick ? '#10b981' : '#d4a84b',
                                    border: `1px solid ${myNick ? 'rgba(16, 185, 129, 0.3)' : 'rgba(212, 168, 75, 0.25)'}`,
                                  }}
                                >
                                  <Pencil size={10} />
                                  <span className="font-bold max-w-[100px] truncate">{myNick || 'Đặt biệt danh'}</span>
                                </button>
                              </Tooltip>
                            );
                          })()}
                      </div>
                    </>
                  )}
                </div>

                {/* Sub-tabs: Chat | Tasks | Pinned */}
                <div
                  className="flex items-center gap-0.5 p-1 rounded-lg"
                  style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                >
                  <Tooltip title="Luồng trò chuyện">
                    <button
                      type="button"
                      onClick={() => setActiveSubtab('chat')}
                      className="h-7 px-2 sm:px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-bold cursor-pointer"
                      style={{
                        background: activeSubtab === 'chat' ? surfaceBg : 'transparent',
                        color: activeSubtab === 'chat' ? '#d4a84b' : token.colorTextSecondary,
                      }}
                    >
                      <MessageSquare size={14} />
                      {!isMobile && <span>Chat</span>}
                    </button>
                  </Tooltip>

                  <Tooltip title="Công việc & Nhắc hẹn từ tin nhắn">
                    <button
                      type="button"
                      onClick={() => setActiveSubtab('tasks')}
                      className="h-7 px-2 sm:px-2.5 rounded-md inline-flex items-center gap-1.5 text-[11.5px] font-bold cursor-pointer tabular-nums"
                      style={{
                        background: activeSubtab === 'tasks' ? surfaceBg : 'transparent',
                        color: activeSubtab === 'tasks' ? '#d4a84b' : token.colorTextSecondary,
                      }}
                    >
                      <CheckSquare size={14} />
                      {!isMobile && <span>Tasks</span>}
                      <span className="text-amber-500">{uniqueTasks.filter((t) => !t.done).length}</span>
                    </button>
                  </Tooltip>

                  <Tooltip title="Tin nhắn đã ghim">
                    <button
                      type="button"
                      aria-label="Tab tin nhắn đã ghim"
                      onClick={() => setActiveSubtab('pinned')}
                      className="h-7 px-2 rounded-md inline-flex items-center gap-1 text-[11.5px] font-bold cursor-pointer tabular-nums"
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

                {/* MOS-BUG-135: MAI Spoken Urgent Announcements Toggle */}
                <Tooltip
                  title={
                    maiVoiceAnnounceEnabled
                      ? 'Đang BẬT @MAI đọc thông báo khẩn cấp khi bạn được tag (Siri-style). Nhấp để tắt tiếng'
                      : 'Đang TẮT @MAI đọc thông báo khẩn cấp. Nhấp để bật lại'
                  }
                >
                  <button
                    type="button"
                    aria-label="Bật tắt @MAI đọc thông báo khẩn cấp"
                    onClick={() => {
                      const next = !maiVoiceAnnounceEnabled;
                      handleToggleMaiVoiceAnnounce(next);
                      if (next) {
                        antdMessage.success('Đã BẬT @MAI tự động phát âm thanh thông báo khẩn cấp khi bạn được tag');
                        void playNeuralSpeech('MAI đã sẵn sàng đọc thông báo khẩn cấp khi bạn được tag.', {
                          voice: 'vi-VN-HoaiMyNeural',
                          speed: ttsSpeed,
                        });
                      } else {
                        antdMessage.info('Đã TẮT @MAI đọc thông báo khẩn cấp');
                      }
                    }}
                    className="h-7 px-2 rounded-md inline-flex items-center gap-1.5 text-[11px] font-bold cursor-pointer transition-colors"
                    style={{
                      background: maiVoiceAnnounceEnabled ? 'rgba(212, 168, 75, 0.16)' : 'transparent',
                      border: `1px solid ${maiVoiceAnnounceEnabled ? 'rgba(212, 168, 75, 0.35)' : borderColor}`,
                      color: maiVoiceAnnounceEnabled ? '#d4a84b' : token.colorTextSecondary,
                    }}
                  >
                    {maiVoiceAnnounceEnabled ? (
                      <Volume2 size={13} className="text-amber-500 animate-pulse" />
                    ) : (
                      <VolumeX size={13} className="opacity-60" />
                    )}
                    <span className="hidden md:inline">@MAI Đọc khẩn cấp</span>
                  </button>
                </Tooltip>

                {/* 100% Icon-only Window Controls (Right-aligned close button invariant) */}
                <div className="flex items-center gap-1">
                  {activeConversation && (
                    <Tooltip
                      title={
                        (userPrefs.pinnedIds || []).includes(activeConversation.id)
                          ? 'Bỏ ghim cuộc trò chuyện'
                          : 'Ghim cuộc trò chuyện lên đầu mục (Pin)'
                      }
                    >
                      <button
                        type="button"
                        aria-label="Ghim cuộc trò chuyện"
                        onClick={() => togglePinConversation(activeConversation.id)}
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        style={{
                          background: (userPrefs.pinnedIds || []).includes(activeConversation.id)
                            ? 'rgba(212, 168, 75, 0.16)'
                            : 'transparent',
                          color: (userPrefs.pinnedIds || []).includes(activeConversation.id)
                            ? '#d4a84b'
                            : token.colorTextSecondary,
                        }}
                      >
                        <Pin
                          size={15}
                          className={
                            (userPrefs.pinnedIds || []).includes(activeConversation.id) ? 'fill-amber-400' : ''
                          }
                        />
                      </button>
                    </Tooltip>
                  )}

                  {activeConversation && activeConversation.id !== AI_COPILOT_CONV_ID && (
                    <Tooltip
                      title={
                        (userPrefs.manualUnreadIds || []).includes(activeConversation.id)
                          ? 'Đánh dấu đã đọc'
                          : 'Đánh dấu chưa đọc (Mark as unread)'
                      }
                    >
                      <button
                        type="button"
                        aria-label="Đánh dấu chưa đọc"
                        onClick={() => toggleManualUnreadConversation(activeConversation)}
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        style={{
                          background: (userPrefs.manualUnreadIds || []).includes(activeConversation.id)
                            ? 'rgba(244, 63, 94, 0.16)'
                            : 'transparent',
                          color: (userPrefs.manualUnreadIds || []).includes(activeConversation.id)
                            ? '#f43f5e'
                            : token.colorTextSecondary,
                        }}
                      >
                        {(userPrefs.manualUnreadIds || []).includes(activeConversation.id) ? (
                          <MailOpen size={15} />
                        ) : (
                          <Mail size={15} />
                        )}
                      </button>
                    </Tooltip>
                  )}

                  {!isMobile && activeConversation && (
                    <Tooltip title="Mở cửa sổ thu nhỏ (Mini Dock / Box chat)">
                      <button
                        type="button"
                        aria-label="Mở cửa sổ thu nhỏ"
                        onClick={handlePopOutToMiniDock}
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <ExternalLink size={15} />
                      </button>
                    </Tooltip>
                  )}

                  {activeConversation?.id === AI_COPILOT_CONV_ID && (
                    <Tooltip title="Làm mới phiên hội thoại riêng tư với MAI">
                      <button
                        type="button"
                        aria-label="Làm mới phiên hội thoại AI"
                        onClick={handleClearAiChat}
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-rose-500/15 hover:text-rose-400"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </Tooltip>
                  )}

                  {isDannyAccount && (
                    <Tooltip title="Phân quyền Đội nhóm & Cá nhân vào mOS Chat & AI">
                      <button
                        type="button"
                        aria-label="Phân quyền Đội nhóm & Cá nhân vào mOS Chat & AI"
                        onClick={() => {
                          setAccessConfigTab(activeConversation?.id === AI_COPILOT_CONV_ID ? 'ai' : 'chat');
                          setAccessConfigModalOpen(true);
                        }}
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors"
                        style={{
                          background:
                            accessConfig.allowAllStaff ||
                            accessConfig.allowedGroupKeys.length > 0 ||
                            accessConfig.allowedStaffIds.length > 0
                              ? 'rgba(139, 92, 246, 0.16)'
                              : 'transparent',
                          color: '#a78bfa',
                        }}
                      >
                        <ShieldCheck size={15} />
                      </button>
                    </Tooltip>
                  )}

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

                  <Tooltip title="Đóng mOS Chat (⌘J)">
                    <button
                      type="button"
                      aria-label="Đóng mOS Chat"
                      onClick={onClose}
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
                  {isDraggingOver && !draggingRootMsgId && (
                    <div
                      className="absolute inset-2 rounded-xl z-20 flex flex-col items-center justify-center gap-1.5 pointer-events-none"
                      style={{
                        background: 'rgba(15, 23, 42, 0.84)',
                        border: '2px dashed #d4a84b',
                        color: '#fbbf24',
                      }}
                    >
                      <ImagePlus size={28} />
                      <span className="text-[13px] font-bold">Thả hình ảnh từ máy tính hoặc Google Drive vào đây</span>
                    </div>
                  )}

                  {/* STICKY PINNED MESSAGE BANNER */}
                  {pinnedMessages.length > 0 && activeConversation && (
                    <div
                      className="px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 z-10 transition-colors text-[12px]"
                      style={{
                        background: isDark ? 'rgba(30, 41, 59, 0.72)' : 'rgba(254, 243, 199, 0.65)',
                        borderBottom: `1px solid ${borderColor}`,
                        backdropFilter: 'blur(6px)',
                      }}
                    >
                      {/* Left: Icon + Text snippet (click to navigate) */}
                      <div
                        onClick={() => {
                          const msg = pinnedMessages[pinnedBannerIndex % pinnedMessages.length];
                          if (msg) navigateToMessage(activeConversation.id, msg.id);
                        }}
                        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer hover:opacity-85 transition-opacity"
                        title="Nhấn để đi đến tin nhắn đã ghim"
                      >
                        <div
                          className="w-6 h-6 rounded-md inline-flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(212, 168, 75, 0.2)', color: '#d4a84b' }}
                        >
                          <Pin size={13} className="fill-amber-400" />
                        </div>

                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 shrink-0">
                            {pinnedMessages.length > 1
                              ? `Ghim (${(pinnedBannerIndex % pinnedMessages.length) + 1}/${pinnedMessages.length}):`
                              : 'Đã ghim:'}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100 shrink-0">
                            {pinnedMessages[pinnedBannerIndex % pinnedMessages.length]?.senderName}:
                          </span>
                          <span className="text-slate-600 dark:text-slate-300 truncate">
                            {formatMoveTargetSnippet(pinnedMessages[pinnedBannerIndex % pinnedMessages.length])}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Cycle pinned messages if > 1 */}
                        {pinnedMessages.length > 1 && (
                          <Tooltip title="Xem tin nhắn đã ghim tiếp theo">
                            <button
                              type="button"
                              aria-label="Tin nhắn ghim tiếp theo"
                              onClick={() => setPinnedBannerIndex((prev) => (prev + 1) % pinnedMessages.length)}
                              className="w-6 h-6 rounded inline-flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                            >
                              <ChevronRight size={13} />
                            </button>
                          </Tooltip>
                        )}

                        {/* Nút bấm dẫn đến tin nhắn */}
                        <Tooltip title="Đi đến tin nhắn này trong cuộc trò chuyện">
                          <button
                            type="button"
                            aria-label="Đi đến tin nhắn đã ghim"
                            onClick={() => {
                              const msg = pinnedMessages[pinnedBannerIndex % pinnedMessages.length];
                              if (msg) navigateToMessage(activeConversation.id, msg.id);
                            }}
                            className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors"
                            style={{
                              background: 'rgba(212, 168, 75, 0.18)',
                              color: '#d4a84b',
                              border: '1px solid rgba(212, 168, 75, 0.35)',
                            }}
                          >
                            <CornerDownRight size={12} />
                            <span className="hidden sm:inline">Đi đến tin nhắn</span>
                          </button>
                        </Tooltip>

                        {/* Xem danh sách tất cả tin ghim */}
                        <Tooltip title="Xem danh sách tất cả tin nhắn đã ghim">
                          <button
                            type="button"
                            aria-label="Xem tất cả tin ghim"
                            onClick={() => setActiveSubtab('pinned')}
                            className="h-6 px-1.5 rounded-md inline-flex items-center text-[11px] font-semibold text-slate-400 hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                          >
                            Tất cả ({pinnedMessages.length})
                          </button>
                        </Tooltip>

                        {/* Bỏ ghim */}
                        <Tooltip title="Bỏ ghim tin nhắn này">
                          <button
                            type="button"
                            aria-label="Bỏ ghim"
                            onClick={() => {
                              const msg = pinnedMessages[pinnedBannerIndex % pinnedMessages.length];
                              if (msg) handleTogglePin(msg.id);
                            }}
                            className="w-6 h-6 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                          >
                            <PinOff size={13} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  )}

                  <div ref={mainMessagesContainerRef} className="flex-1 overflow-y-auto py-3">
                    {(activeConversation?.messages || [])
                      .filter(
                        (m) =>
                          !m.isSystemReminder &&
                          m.senderId !== 'system-reminder' &&
                          m.senderName !== 'mOS Reminder' &&
                          !String(m.text || '').startsWith('Đến giờ nhắc việc:') &&
                          m.senderName !== 'Hà My'
                      )
                      .map((m, idx, filteredMessages) => {
                        const linkedTask = uniqueTasks.find((t) => t.id === m.taskId || t.sourceMessageId === m.id);
                        const isMine = isMessageFromCurrentUser(m);
                        const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
                        const prevIsMine = prevMsg ? isMessageFromCurrentUser(prevMsg) : false;
                        const isCont = Boolean(
                          prevMsg &&
                          prevMsg.senderName === m.senderName &&
                          prevIsMine === isMine &&
                          !prevMsg.isSystemReminder &&
                          !m.isSystemReminder
                        );
                        const isAiMessage = Boolean(m.isAiBot || m.senderId === 'wings-ai-copilot');
                        const msgReadBreakdown = getMessageReadBreakdown(activeConversation, m);
                        const stoppedReadersForMsg = stoppedReadersByMsgId[m.id] || [];
                        const canMoveThisMsg =
                          (isMine || canManageChatThreads) &&
                          !m.isDeleted &&
                          !isAiMessage &&
                          activeConversation?.id !== AI_COPILOT_CONV_ID;
                        const isBeingDragged = draggingRootMsgId === m.id;
                        const isDropTarget = Boolean(
                          draggingRootMsgId &&
                          draggingRootMsgId !== m.id &&
                          dragOverTargetMsgId === m.id &&
                          !m.isDeleted
                        );

                        return (
                          <div
                            key={m.id}
                            data-message-side={isMine ? 'right' : 'left'}
                            draggable={canMoveThisMsg && editingMessageId !== m.id}
                            onDragStart={(e) => {
                              if (!canMoveThisMsg || editingMessageId === m.id) {
                                e.preventDefault();
                                return;
                              }
                              const sel = typeof window !== 'undefined' ? window.getSelection()?.toString().trim() : '';
                              if (sel) {
                                e.preventDefault();
                                return;
                              }
                              setDraggingRootMsgId(m.id);
                              try {
                                e.dataTransfer.setData('application/x-mos-chat-msg-id', m.id);
                                e.dataTransfer.effectAllowed = 'move';
                              } catch (_) {}
                            }}
                            onDragEnd={() => {
                              setDraggingRootMsgId(null);
                              setDragOverTargetMsgId(null);
                              setDragOverThreadPane(false);
                            }}
                            onDragOver={(e) => {
                              if (!draggingRootMsgId || draggingRootMsgId === m.id || m.isDeleted) return;
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'move';
                              if (dragOverTargetMsgId !== m.id) {
                                setDragOverTargetMsgId(m.id);
                              }
                            }}
                            onDragLeave={(e) => {
                              if (
                                dragOverTargetMsgId === m.id &&
                                !e.currentTarget.contains(e.relatedTarget as Node | null)
                              ) {
                                setDragOverTargetMsgId(null);
                              }
                            }}
                            onDrop={(e) => {
                              if (!draggingRootMsgId || draggingRootMsgId === m.id || m.isDeleted) return;
                              e.preventDefault();
                              e.stopPropagation();
                              const srcId = draggingRootMsgId;
                              setDraggingRootMsgId(null);
                              setDragOverTargetMsgId(null);
                              setDragOverThreadPane(false);
                              void handleMoveThreadItem({
                                mode: 'MERGE_ROOT_TO_THREAD',
                                sourceMessageId: srcId,
                                targetMessageId: m.id,
                              });
                            }}
                            id={`mos-chat-msg-${m.id}`}
                            className={`group relative flex items-start gap-2.5 px-4 ${
                              isMine ? 'flex-row-reverse' : 'flex-row'
                            } ${
                              isCont ? 'py-0.5' : 'pt-2.5 pb-1'
                            } transition-all hover:bg-black/[0.03] dark:hover:bg-white/[0.03] ${
                              isBeingDragged ? 'opacity-45 scale-[0.99]' : ''
                            }`}
                            style={{
                              background: isDropTarget
                                ? 'rgba(212, 168, 75, 0.14)'
                                : highlightedMsgId === m.id
                                  ? 'rgba(212, 168, 75, 0.18)'
                                  : linkedTask
                                    ? 'rgba(212, 168, 75, 0.06)'
                                    : undefined,
                              boxShadow: isDropTarget
                                ? 'inset 0 0 0 1.5px #d4a84b'
                                : highlightedMsgId === m.id
                                  ? '0 0 0 2px #d4a84b, inset 0 0 14px rgba(212, 168, 75, 0.28)'
                                  : undefined,
                              borderRadius: isDropTarget || highlightedMsgId === m.id ? 10 : undefined,
                            }}
                          >
                            {isDropTarget && (
                              <div
                                className="absolute -top-2.5 left-4 z-20 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold inline-flex items-center gap-1 shadow-md pointer-events-none"
                                style={{
                                  background: '#d4a84b',
                                  color: '#000',
                                }}
                              >
                                <CornerDownRight size={11} />
                                <span>
                                  Thả để gộp vào luồng trả lời của {getMemberNickname(m.senderId) || m.senderName}
                                </span>
                              </div>
                            )}
                            {isCont ? (
                              <div
                                className={`w-8 shrink-0 flex flex-col ${
                                  isMine ? 'items-start pl-0.5' : 'items-end pr-0.5'
                                } pt-1 select-none gap-0.5`}
                              >
                                <span className="opacity-0 group-hover:opacity-100 text-[9.5px] text-slate-400 tabular-nums transition-opacity">
                                  {m.timeLabel}
                                </span>
                                {isMine &&
                                  !m.isDeleted &&
                                  renderReadStatusCheckmark(msgReadBreakdown.seenBy, msgReadBreakdown.unseenBy, {
                                    compact: true,
                                    scopeLabel: 'Trạng thái đọc tin nhắn',
                                  })}
                              </div>
                            ) : (
                              <div className="mt-0.5 shrink-0">
                                {renderUserAvatarNode({
                                  staffId: isMine ? currentUser?.id || m.senderId : m.senderId,
                                  name: m.senderName,
                                  rawAvatar: m.senderAvatar,
                                  bgColor: m.roleColor || (isMine ? '#d4a84b' : '#3b82f6'),
                                  sizeClass: 'w-8 h-8',
                                  roundedClass: 'rounded-full',
                                  isAiBot: isAiMessage,
                                })}
                              </div>
                            )}

                            <div className={`flex-1 min-w-0 flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                              {!isCont && (
                                <div
                                  className={`flex items-center gap-1.5 mb-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                  {(() => {
                                    const nick = getMemberNickname(m.senderId);
                                    if (nick && nick !== m.senderName) {
                                      return (
                                        <span className="flex items-center gap-1">
                                          <span className="text-[12.5px] font-bold text-emerald-500 dark:text-emerald-400">
                                            {nick}
                                          </span>
                                          <span className="text-[11px] text-slate-400 font-normal">
                                            ({m.senderName})
                                          </span>
                                        </span>
                                      );
                                    }
                                    return <span className="text-[12.5px] font-bold">{m.senderName}</span>;
                                  })()}
                                  {isMine && (
                                    <span
                                      className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[9px] font-extrabold"
                                      style={{
                                        background: 'rgba(212, 168, 75, 0.2)',
                                        color: '#d4a84b',
                                      }}
                                    >
                                      Bạn
                                    </span>
                                  )}
                                  <span
                                    className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[9.5px] font-bold"
                                    style={{
                                      background: `${m.roleColor || '#d4a84b'}22`,
                                      color: m.roleColor || '#d4a84b',
                                    }}
                                  >
                                    {m.senderRole}
                                  </span>
                                  <span className="text-[10.5px] text-slate-400 tabular-nums">{m.timeLabel}</span>
                                  {isMine &&
                                    !m.isDeleted &&
                                    renderReadStatusCheckmark(msgReadBreakdown.seenBy, msgReadBreakdown.unseenBy, {
                                      compact: false,
                                      scopeLabel: 'Trạng thái đọc tin nhắn',
                                    })}
                                  {m.pinned && (
                                    <Tooltip title="Đã ghim">
                                      <span className="inline-flex text-amber-400">
                                        <Pin size={12} />
                                      </span>
                                    </Tooltip>
                                  )}
                                </div>
                              )}

                              {/* Collapsible AI Reasoning (<thinking>) Block */}
                              {m.aiThinking && (
                                <div
                                  className="mb-1.5 rounded-lg overflow-hidden w-full max-w-[88%]"
                                  style={{
                                    background: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.06)',
                                    border: '1px solid rgba(139, 92, 246, 0.25)',
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setExpandedThinkingIds((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                                    className="w-full px-2.5 py-1 flex items-center justify-between text-[11px] font-bold cursor-pointer"
                                    style={{ color: isDark ? '#c4b5fd' : '#6d28d9' }}
                                  >
                                    <span className="inline-flex items-center gap-1.5">
                                      <Sparkles size={12} />
                                      <span>Quá trình suy luận của MAI</span>
                                    </span>
                                    {expandedThinkingIds[m.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  </button>
                                  {expandedThinkingIds[m.id] && (
                                    <div
                                      className="px-2.5 pb-2 pt-1 text-[11.5px] leading-relaxed whitespace-pre-wrap text-left"
                                      style={{
                                        color: token.colorTextSecondary,
                                        borderTop: '1px dashed rgba(139, 92, 246, 0.2)',
                                      }}
                                    >
                                      {m.aiThinking}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Message Content: Inline Edit Mode vs Soft-Deleted vs Normal Text Bubble */}
                              {editingMessageId === m.id && !editingReplyId ? (
                                <div
                                  className="w-full max-w-[85%] rounded-2xl p-2.5 space-y-2 select-text"
                                  style={{ background: surfaceRaised, border: '1.5px solid #d4a84b' }}
                                >
                                  <textarea
                                    autoFocus
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') {
                                        e.preventDefault();
                                        handleCancelEdit();
                                      } else if (e.key === 'Enter' && !e.shiftKey) {
                                        if (
                                          e.nativeEvent.isComposing ||
                                          isComposingRef.current ||
                                          e.keyCode === 229 ||
                                          Date.now() - lastCompositionEndMsRef.current < 60
                                        ) {
                                          return;
                                        }
                                        e.preventDefault();
                                        handleSaveEdit();
                                      }
                                    }}
                                    rows={3}
                                    className="w-full bg-transparent border-0 outline-none text-[13px] leading-relaxed resize-y p-1"
                                    style={{ color: token.colorText }}
                                  />
                                  <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
                                    <span className="text-slate-400">
                                      Shift+Enter: xuống dòng · Esc: huỷ · Enter: lưu
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="px-2.5 py-1 rounded-md cursor-pointer hover:bg-white/10"
                                        style={{ color: token.colorTextSecondary }}
                                      >
                                        Huỷ
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSavingEdit || !editingText.trim()}
                                        onClick={handleSaveEdit}
                                        className="px-3 py-1 rounded-md font-bold cursor-pointer disabled:opacity-50"
                                        style={{ background: '#d4a84b', color: '#000' }}
                                      >
                                        {isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : m.isDeleted ? (
                                <div
                                  className={`relative inline-block text-left px-3.5 py-2 rounded-2xl ${
                                    isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'
                                  } text-[12.5px] italic max-w-[85%] select-none transition-all`}
                                  style={{
                                    background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                                    border: `1px dashed ${borderColor}`,
                                    color: token.colorTextSecondary,
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="opacity-75">💬 Tin nhắn này đã bị xoá</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setHistoryModalMessage(m);
                                        setHistoryModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold not-italic hover:underline cursor-pointer"
                                      style={{ color: '#d4a84b' }}
                                    >
                                      <History size={12} />
                                      <span>Xem lịch sử</span>
                                    </button>
                                    {(isMine || isDannyAccount) && (
                                      <button
                                        type="button"
                                        onClick={() => handleRestoreMessage(m.id)}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold not-italic hover:underline cursor-pointer text-emerald-400 hover:text-emerald-300"
                                      >
                                        <RotateCcw size={11} />
                                        <span>Khôi phục</span>
                                      </button>
                                    )}
                                  </div>
                                  {m.deletedByName && (
                                    <div className="text-[10px] text-slate-400 not-italic mt-0.5 tabular-nums">
                                      Bởi {m.deletedByName} ·{' '}
                                      {m.deletedAt ? dayjs(m.deletedAt).format('HH:mm') : m.timeLabel}
                                    </div>
                                  )}
                                </div>
                              ) : m.text ? (
                                (() => {
                                  const isPureSticker = Boolean(parsePureStickerMessage(m.text));
                                  const hasSubthread = Boolean(m.thread && m.thread.length > 0);
                                  return (
                                    <div
                                      onClick={(e) => handleMessageTap(m, e)}
                                      title={
                                        hasSubthread
                                          ? `Nhấn để mở luồng trả lời phụ (${m.thread?.length} phản hồi)`
                                          : undefined
                                      }
                                      className={`relative inline-block text-left ${
                                        isPureSticker
                                          ? 'px-1 py-0.5 rounded-2xl'
                                          : `px-3.5 py-2 rounded-2xl ${isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'}`
                                      } text-[13px] leading-relaxed whitespace-pre-wrap break-words max-w-[85%] cursor-pointer select-none active:scale-[0.985] transition-all ${
                                        m.isBuzzed ? 'ring-2 ring-amber-500/70 shadow-lg shadow-amber-500/15' : ''
                                      } ${hasSubthread ? 'hover:ring-1 hover:ring-amber-500/50' : ''}`}
                                      style={{
                                        background: isPureSticker
                                          ? 'transparent'
                                          : m.isBuzzed
                                            ? isDark
                                              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(225, 29, 72, 0.14) 100%)'
                                              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(225, 29, 72, 0.1) 100%)'
                                            : isMine
                                              ? accentSoftBg
                                              : surfaceRaised,
                                        border: isPureSticker
                                          ? 'none'
                                          : m.isBuzzed
                                            ? '1px solid rgba(245, 158, 11, 0.8)'
                                            : `1px solid ${isMine ? accentBorder : borderColor}`,
                                        color: token.colorText,
                                      }}
                                    >
                                      {/* Buzz / Bump Urgent Header Banner */}
                                      {m.isBuzzed && (
                                        <div
                                          onClick={(e) => e.stopPropagation()}
                                          className="mb-1.5 px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-between gap-1 text-[11px] font-bold text-amber-500 dark:text-amber-400 select-none"
                                        >
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9.5px] animate-pulse shrink-0">
                                              ⚡
                                            </span>
                                            <span className="truncate">TIN NHẮN KHẨN CẤP · BUZZ</span>
                                            {m.buzzCount && m.buzzCount > 1 && (
                                              <span className="px-1 py-0.2 rounded bg-amber-500/30 text-[9.5px] tabular-nums font-extrabold text-amber-300 shrink-0">
                                                x{m.buzzCount}
                                              </span>
                                            )}
                                          </div>
                                          {m.latestBuzz && (
                                            <Popover
                                              title="Lịch sử Buzz khẩn cấp"
                                              trigger="click"
                                              content={
                                                <div className="max-w-[270px] flex flex-col gap-1.5 text-xs">
                                                  {(m.buzzHistory || [m.latestBuzz]).map((b, idx) => (
                                                    <div
                                                      key={b.id || idx}
                                                      className="flex flex-col border-b border-black/5 dark:border-white/10 pb-1.5 last:border-b-0"
                                                    >
                                                      <div className="flex items-center justify-between font-semibold text-amber-500">
                                                        <span>
                                                          Lần {idx + 1}: {b.senderName}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-normal">
                                                          {b.senderRole || 'Staff'}
                                                        </span>
                                                      </div>
                                                      <div className="text-[10.5px] text-slate-400 tabular-nums">
                                                        {dayjs(b.buzzedAt).format('HH:mm:ss DD/MM/YYYY')}
                                                      </div>
                                                      {b.note && (
                                                        <div className="text-slate-300 italic text-[11px] mt-0.5">
                                                          {b.note}
                                                        </div>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              }
                                            >
                                              <button
                                                type="button"
                                                aria-label="Xem lịch sử Buzz"
                                                className="text-[10px] font-medium text-amber-400/90 hover:underline hover:text-amber-300 cursor-pointer inline-flex items-center gap-0.5 shrink-0"
                                              >
                                                <History size={10} />
                                                <span>Lịch sử</span>
                                              </button>
                                            </Popover>
                                          )}
                                          <button
                                            type="button"
                                            aria-label="Nghe @MAI đọc tin nhắn khẩn cấp"
                                            onClick={() => {
                                              const spokenText = buildMaiUrgentVoiceAnnouncement({
                                                senderName: m.latestBuzz?.senderName || m.senderName || 'Đồng nghiệp',
                                                conversationName: activeConversation?.name,
                                                isSpace: activeConversation?.type === 'space',
                                                messageText: m.text || '',
                                                note: m.latestBuzz?.note,
                                              });
                                              void playNeuralSpeech(spokenText, {
                                                voice: 'vi-VN-HoaiMyNeural',
                                                speed: ttsSpeed || 1.0,
                                              });
                                            }}
                                            className="text-[10px] font-semibold text-amber-400/90 hover:underline hover:text-amber-300 cursor-pointer inline-flex items-center gap-1 shrink-0 ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20"
                                            title="Nghe @MAI đọc âm thanh thông báo khẩn cấp"
                                          >
                                            <Volume2 size={10} />
                                            <span>@MAI đọc</span>
                                          </button>
                                        </div>
                                      )}

                                      {renderRichTextMessage(m.text, isMine)}

                                      {/* Edited Badge with Clickable Audit History */}
                                      {m.editHistory && m.editHistory.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setHistoryModalMessage(m);
                                            setHistoryModalOpen(true);
                                          }}
                                          className="inline-flex items-center gap-0.5 text-[10.5px] font-medium text-amber-500/80 hover:text-amber-400 hover:underline cursor-pointer select-none ml-1.5 align-baseline"
                                          title="Xem lịch sử chỉnh sửa"
                                        >
                                          <History size={10} />
                                          <span>(đã chỉnh sửa)</span>
                                        </button>
                                      )}

                                      {/* Floating Heart Burst on Double-Tap */}
                                      {heartFlyMsgId === m.id && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 select-none overflow-hidden">
                                          <span className="text-[38px] drop-shadow-xl animate-heart-burst leading-none">
                                            ❤️
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : null}

                              {/* Suggested AI Action Button(s) (e.g. APPLY_FILTER) */}
                              {(() => {
                                const actionsList =
                                  m.aiActions && m.aiActions.length > 0
                                    ? m.aiActions
                                    : m.aiAction?.actions && m.aiAction.actions.length > 0
                                      ? m.aiAction.actions
                                      : m.aiAction
                                        ? [m.aiAction]
                                        : [];
                                if (!actionsList || actionsList.length === 0) return null;

                                return (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {actionsList.map((action, actionIdx) => {
                                      const actionKey = `${m.id}-${actionIdx}`;
                                      const isApplied = Boolean(
                                        appliedActionIds[actionKey] || (actionIdx === 0 && appliedActionIds[m.id])
                                      );
                                      return (
                                        <button
                                          key={actionKey}
                                          type="button"
                                          onClick={() => {
                                            handleExecuteAiAction(action, m.id, actionKey);
                                          }}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold cursor-pointer transition-all active:scale-95"
                                          style={{
                                            background: isApplied
                                              ? 'rgba(16, 185, 129, 0.16)'
                                              : 'rgba(139, 92, 246, 0.16)',
                                            border: `1px solid ${
                                              isApplied ? 'rgba(16, 185, 129, 0.4)' : 'rgba(139, 92, 246, 0.4)'
                                            }`,
                                            color: isApplied ? '#10b981' : '#a78bfa',
                                          }}
                                        >
                                          {isApplied ? <Check size={13} /> : <Sliders size={13} />}
                                          <span>{isApplied ? `Đã áp dụng: ${action.label}` : action.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              })()}

                              {/* Quick Voice Read-Aloud & Copy Bar for AI Bot Replies */}
                              {isAiMessage && m.text && (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <Tooltip
                                    title={
                                      speakingMsgId === m.id
                                        ? 'Dừng đọc giọng nói'
                                        : `Đọc câu trả lời bằng giọng Hoài My (${ttsSpeed}x)`
                                    }
                                  >
                                    <button
                                      type="button"
                                      aria-label="Đọc câu trả lời AI"
                                      onClick={() => handleSpeakAiMessage(m)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold cursor-pointer transition-colors"
                                      style={{
                                        background: speakingMsgId === m.id ? 'rgba(139, 92, 246, 0.2)' : surfaceRaised,
                                        border: `1px solid ${speakingMsgId === m.id ? 'rgba(139, 92, 246, 0.5)' : borderColor}`,
                                        color: speakingMsgId === m.id ? '#a78bfa' : token.colorTextSecondary,
                                      }}
                                    >
                                      {speakingMsgId === m.id ? (
                                        <VolumeX size={12} className="animate-pulse" />
                                      ) : (
                                        <Volume2 size={12} />
                                      )}
                                      <span>{speakingMsgId === m.id ? 'Dừng đọc' : 'Nghe'}</span>
                                    </button>
                                  </Tooltip>

                                  {/* Tùy chỉnh tốc độ đọc cá nhân */}
                                  <Dropdown
                                    menu={{
                                      items: [
                                        { key: '0.8', label: '0.8x (Chậm)' },
                                        { key: '1.0', label: '1.0x (Chuẩn)' },
                                        { key: '1.25', label: '1.25x (Nhanh vừa)' },
                                        { key: '1.5', label: '1.5x (Nhanh)' },
                                        { key: '1.75', label: '1.75x (Rất nhanh)' },
                                        { key: '2.0', label: '2.0x (Tối đa)' },
                                      ],
                                      selectedKeys: [String(ttsSpeed)],
                                      onClick: ({ key }) => {
                                        const s = parseFloat(key);
                                        if (s) handleSetTtsSpeed(s);
                                      },
                                    }}
                                    trigger={['click']}
                                    placement="bottomLeft"
                                  >
                                    <button
                                      type="button"
                                      aria-label="Tùy chỉnh tốc độ đọc"
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium cursor-pointer transition-colors hover:text-violet-400"
                                      style={{
                                        background: surfaceRaised,
                                        border: `1px solid ${borderColor}`,
                                        color: token.colorTextSecondary,
                                      }}
                                      title={`Tốc độ đọc giọng nói cá nhân: ${ttsSpeed}x (nhấp để đổi)`}
                                    >
                                      <span className="tabular-nums font-semibold">{ttsSpeed}x</span>
                                      <ChevronDown size={10} />
                                    </button>
                                  </Dropdown>

                                  <Tooltip title="Sao chép nội dung">
                                    <button
                                      type="button"
                                      aria-label="Sao chép nội dung AI"
                                      onClick={() => {
                                        void navigator.clipboard?.writeText(m.text);
                                        antdMessage.success('Đã sao chép nội dung câu trả lời AI');
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold cursor-pointer"
                                      style={{
                                        background: surfaceRaised,
                                        border: `1px solid ${borderColor}`,
                                        color: token.colorTextSecondary,
                                      }}
                                    >
                                      <Copy size={11} />
                                      <span>Sao chép</span>
                                    </button>
                                  </Tooltip>
                                </div>
                              )}

                              {/* Inline Image Attachments with Lightbox Preview */}
                              {renderMessageAttachments(m.attachments)}

                              {/* Smart Customer Card */}
                              {m.customerCard && (
                                <div
                                  className="mt-1.5 px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 text-left max-w-[85%]"
                                  style={{
                                    background: surfaceBg,
                                    border: `1px solid ${borderStrong}`,
                                    borderLeft: '3px solid #3b82f6',
                                  }}
                                >
                                  <div className="min-w-0">
                                    <div className="text-[12px] font-bold truncate">
                                      {m.customerCard.name} ·{' '}
                                      <span style={{ color: '#d4a84b' }}>{m.customerCard.meta}</span>
                                    </div>
                                    {m.customerCard.cvName && (
                                      <div className="text-[11px] text-slate-400 truncate">{m.customerCard.cvName}</div>
                                    )}
                                  </div>
                                  <Tooltip title="Mở hồ sơ khách hàng">
                                    <button
                                      type="button"
                                      aria-label="Mở hồ sơ khách hàng"
                                      onClick={() => antdMessage.info(`Đã mở hồ sơ: ${m.customerCard?.name}`)}
                                      className="w-7 h-7 rounded-md inline-flex items-center justify-center shrink-0 cursor-pointer"
                                      style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                                    >
                                      <ExternalLink size={14} />
                                    </button>
                                  </Tooltip>
                                </div>
                              )}

                              {/* Inline Task & Reminder Card (mOS Mission Inspired) */}
                              {linkedTask && renderTaskCard(linkedTask, m, 'inline')}

                              {/* Live mOS Mission Card (Synced 2-way with AG & mOS Mission) */}
                              {(m.mission || linkedTask?.mission) &&
                                renderLiveMissionCard((m.mission || linkedTask?.mission)!, m, 'inline')}

                              {/* Interactive Operational Workflow Card (Cash Advance -> Thu Chi, Inventory Audit -> mOS Kho) */}
                              {(m.workflow ||
                                (m.workflowInstanceId &&
                                  workflowInstances.find((wf) => wf.id === m.workflowInstanceId))) && (
                                <MosChatWorkflowCard
                                  workflow={
                                    (m.workflow || workflowInstances.find((wf) => wf.id === m.workflowInstanceId))!
                                  }
                                  isDark={isDark}
                                  isSuperAdmin={isStrictDannySuperAdmin}
                                  currentStaffId={currentUserStaffMember?.id}
                                  currentUserName={
                                    currentUserStaffMember?.displayName ||
                                    currentUser?.fullName ||
                                    currentUser?.username
                                  }
                                  onWorkflowUpdated={(updatedWf) => {
                                    setWorkflowInstances((prev) =>
                                      prev.some((w) => w.id === updatedWf.id)
                                        ? prev.map((w) => (w.id === updatedWf.id ? updatedWf : w))
                                        : [updatedWf, ...prev]
                                    );
                                    void fetchBootstrap(true);
                                  }}
                                  onOpenLightbox={(url, name) =>
                                    setLightboxImage({
                                      items: [{ id: url, url, name }],
                                      currentIndex: 0,
                                      zoom: 1,
                                      rotate: 0,
                                    })
                                  }
                                />
                              )}

                              {/* Thread Chip with Unread Reply Badge & Seen Indicators */}
                              {m.thread &&
                                m.thread.length > 0 &&
                                (() => {
                                  const visibleThreadReplies = m.thread.filter((r) => !r.deletedAt);
                                  const lastThreadReply =
                                    visibleThreadReplies.length > 0
                                      ? visibleThreadReplies[visibleThreadReplies.length - 1]
                                      : undefined;
                                  const unreadReplyCount = m.unreadThreadReplyCount || 0;
                                  const lastReplyBreakdown = lastThreadReply
                                    ? getThreadReplyReadBreakdown(activeConversation, m, lastThreadReply)
                                    : { seenBy: [], unseenBy: [] };
                                  const isLastReplyMine = lastThreadReply
                                    ? isMessageFromCurrentUser(lastThreadReply)
                                    : false;

                                  return (
                                    <div
                                      className={`mt-1.5 flex items-center gap-1.5 flex-wrap ${
                                        isMine ? 'flex-row-reverse' : 'flex-row'
                                      }`}
                                    >
                                      <Tooltip title="Xem luồng trả lời phụ bên phải (Sub-thread)">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenThread(m.id)}
                                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer tabular-nums transition-all hover:brightness-110"
                                          style={{
                                            background:
                                              unreadReplyCount > 0
                                                ? 'rgba(99, 102, 241, 0.22)'
                                                : 'rgba(59, 130, 246, 0.14)',
                                            border:
                                              unreadReplyCount > 0
                                                ? '1px solid rgba(99, 102, 241, 0.55)'
                                                : '1px solid rgba(59, 130, 246, 0.3)',
                                            color: unreadReplyCount > 0 ? '#818cf8' : '#60a5fa',
                                          }}
                                        >
                                          <MessageSquareReply size={13} />
                                          <span>{visibleThreadReplies.length} trả lời</span>
                                          {unreadReplyCount > 0 && (
                                            <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9.5px] font-extrabold tabular-nums">
                                              +{unreadReplyCount} mới
                                            </span>
                                          )}
                                        </button>
                                      </Tooltip>

                                      {/* Sub-thread outer Seen Status (✓/✓✓ + compact mini avatars for latest reply) */}
                                      {lastThreadReply && (
                                        <div className="inline-flex items-center gap-1">
                                          {isLastReplyMine &&
                                            renderReadStatusCheckmark(
                                              lastReplyBreakdown.seenBy,
                                              lastReplyBreakdown.unseenBy,
                                              {
                                                compact: true,
                                                scopeLabel: 'Trạng thái đọc luồng trả lời phụ',
                                              }
                                            )}
                                          {lastReplyBreakdown.seenBy.length > 0 &&
                                            renderMiniSeenAvatarStack(
                                              lastReplyBreakdown.seenBy,
                                              lastReplyBreakdown.unseenBy,
                                              {
                                                compact: true,
                                                align: isMine ? 'right' : 'left',
                                                scopeLabel: 'Đã xem phản hồi mới nhất trong luồng phụ',
                                              }
                                            )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                              {/* Unified Message Footer: Reaction Pills + Adjacent Quick Emoji & Action Set */}
                              <div
                                className={`mt-1 flex flex-wrap items-center gap-1.5 min-h-[26px] ${
                                  isMine ? 'flex-row-reverse justify-start' : 'justify-start'
                                }`}
                              >
                                {m.reactions &&
                                  Object.entries(m.reactions)
                                    .filter(([, count]) => count > 0)
                                    .map(([emoji, count]) => {
                                      const reactedByMe = hasUserReacted(m, emoji);
                                      const stickerReaction = parseStickerReactionKey(emoji);
                                      const label = stickerReaction
                                        ? stickerReaction.caption || stickerReaction.title
                                        : emoji;
                                      return (
                                        <Tooltip
                                          key={emoji}
                                          title={
                                            reactedByMe
                                              ? `Bạn đã thả ${label} · Nhấn để gỡ cảm xúc (Undo)`
                                              : `Nhấn để thả cùng ${label}`
                                          }
                                        >
                                          <button
                                            type="button"
                                            onClick={() => handleToggleReaction(m.id, emoji)}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-bold cursor-pointer tabular-nums transition-all hover:scale-105"
                                            style={{
                                              background: reactedByMe ? 'rgba(212, 168, 75, 0.16)' : surfaceRaised,
                                              border: `1px solid ${reactedByMe ? 'rgba(212, 168, 75, 0.55)' : borderColor}`,
                                              color: reactedByMe ? '#d4a84b' : token.colorText,
                                            }}
                                          >
                                            {stickerReaction ? (
                                              <MosChatStickerVisual sticker={stickerReaction} size="reaction" />
                                            ) : (
                                              <span>{emoji}</span>
                                            )}
                                            <span>{count}</span>
                                          </button>
                                        </Tooltip>
                                      );
                                    })}

                                {/* Adjacent Quick Emoji & Action Bar (placed right next to reaction pills) */}
                                <div
                                  className={`${
                                    mobileActiveMsgId === m.id || openMovePopoverKey === `root:${m.id}`
                                      ? 'opacity-100 pointer-events-auto scale-100 ring-1 ring-amber-500/50 shadow-md'
                                      : 'opacity-0 pointer-events-none'
                                  } group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto transition-all inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full shadow-sm`}
                                  style={{
                                    background: surfaceRaised,
                                    border: `1px solid ${
                                      mobileActiveMsgId === m.id || openMovePopoverKey === `root:${m.id}`
                                        ? 'rgba(212, 168, 75, 0.6)'
                                        : borderStrong
                                    }`,
                                  }}
                                >
                                  {GOOGLE_CHAT_QUICK_EMOJIS.map((emoji) => {
                                    const reactedByMe = hasUserReacted(m, emoji);
                                    return (
                                      <Tooltip
                                        key={emoji}
                                        title={
                                          reactedByMe ? `Đã thả ${emoji} · Nhấn để gỡ (Undo)` : `Thả nhanh ${emoji}`
                                        }
                                      >
                                        <button
                                          type="button"
                                          aria-label={reactedByMe ? `Gỡ cảm xúc ${emoji}` : `Thả nhanh ${emoji}`}
                                          onClick={() => handleToggleReaction(m.id, emoji)}
                                          className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[13px] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-transform hover:scale-110"
                                          style={{
                                            background: reactedByMe ? 'rgba(212, 168, 75, 0.22)' : 'transparent',
                                            boxShadow: reactedByMe
                                              ? 'inset 0 0 0 1px rgba(212, 168, 75, 0.55)'
                                              : 'none',
                                          }}
                                        >
                                          {emoji}
                                        </button>
                                      </Tooltip>
                                    );
                                  })}

                                  <Popover
                                    trigger="click"
                                    placement={isMine ? 'topRight' : 'topLeft'}
                                    open={openStickerPopoverKey === `react:${m.id}`}
                                    onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? `react:${m.id}` : null)}
                                    content={renderReactionPickerContent(m.id, m)}
                                  >
                                    <Tooltip title="Chọn thêm biểu tượng cảm xúc (Wings & phổ biến)">
                                      <button
                                        type="button"
                                        aria-label="Chọn biểu tượng cảm xúc"
                                        className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                                        style={{ color: token.colorTextSecondary }}
                                      >
                                        <SmilePlus size={13} />
                                      </button>
                                    </Tooltip>
                                  </Popover>

                                  <span className="w-px h-3.5 mx-0.5" style={{ background: borderStrong }} />

                                  <Tooltip title="Trả lời theo luồng (Thread)">
                                    <button
                                      type="button"
                                      aria-label="Trả lời theo luồng"
                                      onClick={() => handleOpenThread(m.id)}
                                      className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                                      style={{ color: token.colorTextSecondary }}
                                    >
                                      <MessageSquareReply size={13} />
                                    </button>
                                  </Tooltip>

                                  {canMoveThisMsg && filteredMessages.length > 1 && (
                                    <Popover
                                      trigger="click"
                                      placement={isMine ? 'topRight' : 'topLeft'}
                                      open={openMovePopoverKey === `root:${m.id}`}
                                      onOpenChange={(vis) => {
                                        setOpenMovePopoverKey(vis ? `root:${m.id}` : null);
                                        if (!vis) setMoveThreadSearchQuery('');
                                      }}
                                      content={renderMoveRootToThreadPopover(m, prevMsg, filteredMessages)}
                                    >
                                      <Tooltip title="Gộp tin nhắn này vào luồng trả lời phụ (Subthread) của tin nhắn khác">
                                        <button
                                          type="button"
                                          aria-label="Gộp tin nhắn vào luồng trả lời phụ"
                                          className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-amber-500/15 cursor-pointer transition-transform hover:scale-110"
                                          style={{
                                            color:
                                              openMovePopoverKey === `root:${m.id}`
                                                ? '#d4a84b'
                                                : token.colorTextSecondary,
                                          }}
                                        >
                                          <CornerDownRight size={13} />
                                        </button>
                                      </Tooltip>
                                    </Popover>
                                  )}

                                  <Tooltip title="Tạo Task & Hẹn giờ nhắc từ tin nhắn">
                                    <button
                                      type="button"
                                      aria-label="Tạo Task & Hẹn giờ nhắc từ tin nhắn"
                                      onClick={() => openTaskModalFromMessage(m)}
                                      className="w-6 h-6 rounded-full inline-flex items-center justify-center cursor-pointer"
                                      style={{
                                        background: 'rgba(212, 168, 75, 0.16)',
                                        color: '#d4a84b',
                                      }}
                                    >
                                      <AlarmClockPlus size={13} />
                                    </button>
                                  </Tooltip>

                                  {isStrictDannySuperAdmin && (
                                    <Tooltip
                                      title={
                                        m.mission || linkedTask?.mission
                                          ? `Mở tiến độ mOS Mission #${(m.mission || linkedTask?.mission)?.missionKey}`
                                          : '🚀 Chuyển vào mOS Mission (Đóng gói trọn luồng & hình ảnh)'
                                      }
                                    >
                                      <button
                                        type="button"
                                        aria-label="Chuyển vào mOS Mission"
                                        onClick={() => openMissionModalFromChat(m, linkedTask)}
                                        className="w-6 h-6 rounded-full inline-flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                                        style={{
                                          background:
                                            m.mission || linkedTask?.mission
                                              ? 'rgba(16, 185, 129, 0.2)'
                                              : 'rgba(139, 92, 246, 0.2)',
                                          color: m.mission || linkedTask?.mission ? '#10b981' : '#a78bfa',
                                        }}
                                      >
                                        <Rocket size={13} />
                                      </button>
                                    </Tooltip>
                                  )}

                                  <Tooltip title={m.pinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}>
                                    <button
                                      type="button"
                                      aria-label="Ghim tin nhắn"
                                      onClick={() => handleTogglePin(m.id)}
                                      className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                                      style={{ color: m.pinned ? '#d4a84b' : token.colorTextSecondary }}
                                    >
                                      <Pin size={13} />
                                    </button>
                                  </Tooltip>

                                  {/* Buzz / Bump Urgent Message Button */}
                                  {!m.isDeleted && (
                                    <Tooltip
                                      title={
                                        m.isBuzzed
                                          ? `Đã Buzz ${m.buzzCount || 1} lần · Nhấp để Buzz lại tin nhắn khẩn cấp`
                                          : '⚡ Buzz / Bump tin nhắn khẩn cấp (Cảnh báo chuông & rung)'
                                      }
                                    >
                                      <Popconfirm
                                        title="⚡ Buzz / Bump tin nhắn khẩn cấp?"
                                        description="Gửi tín hiệu cảnh báo nổi bật kèm âm thanh & rung để người nhận chú ý xử lý ngay."
                                        onConfirm={() => handleBuzzMessage(m.id)}
                                        okText="⚡ Buzz ngay"
                                        cancelText="Huỷ"
                                        okButtonProps={{
                                          style: {
                                            backgroundColor: '#f59e0b',
                                            borderColor: '#f59e0b',
                                            color: '#000',
                                            fontWeight: 'bold',
                                          },
                                        }}
                                        zIndex={1350}
                                        overlayStyle={{ zIndex: 1350 }}
                                      >
                                        <button
                                          type="button"
                                          aria-label="Buzz / Bump tin nhắn khẩn cấp"
                                          className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-amber-500/20 cursor-pointer transition-transform hover:scale-110"
                                          style={{
                                            background: m.isBuzzed ? 'rgba(245, 158, 11, 0.22)' : 'transparent',
                                            color: m.isBuzzed ? '#f59e0b' : token.colorTextSecondary,
                                          }}
                                        >
                                          <Zap
                                            size={13}
                                            className={m.isBuzzed ? 'fill-amber-500 animate-pulse text-amber-500' : ''}
                                          />
                                        </button>
                                      </Popconfirm>
                                    </Tooltip>
                                  )}

                                  {/* Edit Message Button (author only, and not deleted) */}
                                  {isMine && !m.isDeleted && (
                                    <Tooltip title="Chỉnh sửa tin nhắn">
                                      <button
                                        type="button"
                                        aria-label="Chỉnh sửa tin nhắn"
                                        onClick={() => handleStartEdit(m)}
                                        className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                                        style={{ color: token.colorTextSecondary }}
                                      >
                                        <Pencil size={13} />
                                      </button>
                                    </Tooltip>
                                  )}

                                  {/* Delete Message Button (Popconfirm, soft delete with history) */}
                                  {(isMine || isDannyAccount) && !m.isDeleted && (
                                    <Tooltip title="Xoá tin nhắn (lưu lại lịch sử)">
                                      <Popconfirm
                                        title="Xoá tin nhắn này?"
                                        description="Nội dung sẽ bị ẩn nhưng toàn bộ lịch sử chỉnh sửa & xoá vẫn được lưu lại an toàn."
                                        onConfirm={() => handleDeleteMessage(m.id)}
                                        okText="Xoá"
                                        cancelText="Huỷ"
                                        okButtonProps={{ danger: true }}
                                        zIndex={1350}
                                        overlayStyle={{ zIndex: 1350 }}
                                      >
                                        <button
                                          type="button"
                                          aria-label="Xoá tin nhắn"
                                          className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-rose-500/15 cursor-pointer hover:text-rose-400"
                                          style={{ color: token.colorTextSecondary }}
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </Popconfirm>
                                    </Tooltip>
                                  )}

                                  {/* View History Button (if edited or deleted) */}
                                  {(m.isDeleted || (m.editHistory && m.editHistory.length > 0)) && (
                                    <Tooltip title="Xem lịch sử chỉnh sửa & xoá">
                                      <button
                                        type="button"
                                        aria-label="Xem lịch sử chỉnh sửa & xoá"
                                        onClick={() => {
                                          setHistoryModalMessage(m);
                                          setHistoryModalOpen(true);
                                        }}
                                        className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-amber-500/15 cursor-pointer text-amber-400"
                                      >
                                        <History size={13} />
                                      </button>
                                    </Tooltip>
                                  )}
                                </div>
                              </div>

                              {/* Mini Seen Avatars Stack (Participants whose latest read message stops here) */}
                              {stoppedReadersForMsg.length > 0 && (
                                <div className={`mt-0.5 w-full flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                  {renderMiniSeenAvatarStack(stoppedReadersForMsg, msgReadBreakdown.unseenBy, {
                                    align: isMine ? 'right' : 'left',
                                    scopeLabel: 'Đã xem đến tin nhắn này',
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {aiThinkingActive && (
                      <div className="px-4 py-2 flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #d4a84b 100%)',
                          }}
                        >
                          <Loader2 size={15} className="animate-spin" />
                        </div>
                        <div
                          className="px-3 py-1.5 rounded-xl text-[12px] font-semibold inline-flex items-center gap-2 tabular-nums"
                          style={{
                            background: 'rgba(139, 92, 246, 0.12)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            color: isDark ? '#c4b5fd' : '#6d28d9',
                          }}
                        >
                          <Sparkles size={13} />
                          <span>MAI đang suy luận & phân tích dữ liệu... ({aiElapsedSec}s)</span>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Clean Single-Line Composer with Staging Thumbnails, AI Quick Prompts & Icon-only Toolbar */}
                  <div className="p-3" style={{ background: surfaceBg, borderTop: `1px solid ${borderColor}` }}>
                    {activeConversation?.id === AI_COPILOT_CONV_ID && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-1 no-scrollbar">
                        {AI_QUICK_PROMPTS.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            disabled={aiThinkingActive}
                            onClick={() => void handleSendMessage(AI_COPILOT_CONV_ID, item.prompt)}
                            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors hover:scale-[1.02]"
                            style={{
                              background: isDark ? 'rgba(139, 92, 246, 0.14)' : 'rgba(139, 92, 246, 0.09)',
                              border: '1px solid rgba(139, 92, 246, 0.32)',
                              color: isDark ? '#c4b5fd' : '#6d28d9',
                            }}
                          >
                            <Sparkles size={11} />
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {renderStagedAttachmentsStrip(stagedAttachments, 'main')}

                    {isMobile ? (
                      <div className="flex flex-col gap-2">
                        {/* Quick action grid drawer on mobile (Symmetric 3 columns x 2 rows, sleek iOS proportions) */}
                        {mobileActionOpen && (
                          <div
                            className="p-3 rounded-2xl grid grid-cols-3 gap-2.5 transition-all shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150"
                            style={{
                              background: surfaceRaised,
                              border: `1px solid ${borderStrong}`,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                triggerFilePicker('main');
                                setMobileActionOpen(false);
                              }}
                              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
                            >
                              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 overflow-hidden shrink-0">
                                <ImagePlus size={16} />
                              </div>
                              <span
                                className="text-[10.5px] font-medium text-center leading-tight"
                                style={{ color: token.colorText }}
                              >
                                Gửi ảnh
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                uploadTargetRef.current = { scope: 'main' };
                                setDriveLinkModalOpen(true);
                                setMobileActionOpen(false);
                              }}
                              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
                            >
                              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-400 border border-amber-500/20 overflow-hidden shrink-0">
                                <HardDrive size={16} />
                              </div>
                              <span
                                className="text-[10.5px] font-medium text-center leading-tight"
                                style={{ color: token.colorText }}
                              >
                                Drive
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleSendQuickCustomerCard();
                                setMobileActionOpen(false);
                              }}
                              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
                            >
                              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20 overflow-hidden shrink-0">
                                <UserRoundPlus size={16} />
                              </div>
                              <span
                                className="text-[10.5px] font-medium text-center leading-tight"
                                style={{ color: token.colorText }}
                              >
                                Thẻ khách
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                openTaskModalFromMessage(null);
                                setMobileActionOpen(false);
                              }}
                              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
                            >
                              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-400/15 text-[#d4a84b] border border-[#d4a84b]/30 overflow-hidden shrink-0">
                                <AlarmClockPlus size={16} />
                              </div>
                              <span
                                className="text-[10.5px] font-medium text-center leading-tight"
                                style={{ color: token.colorText }}
                              >
                                Giao việc
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setComposerText((prev) => {
                                  const next = `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}@`;
                                  setTimeout(() => {
                                    composerInputRef.current?.focus();
                                    const len = next.length;
                                    composerInputRef.current?.setSelectionRange(len, len);
                                    checkForMentionTrigger(next, len, 'main');
                                  }, 20);
                                  return next;
                                });
                                setMobileActionOpen(false);
                              }}
                              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
                            >
                              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-sky-500/10 text-sky-400 border border-sky-500/20 overflow-hidden shrink-0">
                                <AtSign size={16} />
                              </div>
                              <span
                                className="text-[10.5px] font-medium text-center leading-tight"
                                style={{ color: token.colorText }}
                              >
                                Nhắc tên
                              </span>
                            </button>

                            {canUseAiCopilot && activeConversation?.id !== AI_COPILOT_CONV_ID && (
                              <button
                                type="button"
                                onClick={() => {
                                  setComposerText((prev) => (/(?:^|\s)@\s*mai\b/i.test(prev) ? prev : `@MAI ${prev}`));
                                  setMobileActionOpen(false);
                                  composerInputRef.current?.focus();
                                }}
                                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
                              >
                                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-purple-500/15 text-purple-400 border border-purple-500/30 overflow-hidden shrink-0 font-black text-[11px]">
                                  MAI
                                </div>
                                <span
                                  className="text-[10.5px] font-medium text-center leading-tight"
                                  style={{ color: token.colorText }}
                                >
                                  Gọi @MAI
                                </span>
                              </button>
                            )}

                            {/* CKEditor Mobile Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setRichEditorModalState({
                                  open: true,
                                  scope: 'main',
                                  title: 'Soạn thảo phong phú (CKEditor)',
                                });
                                setMobileActionOpen(false);
                              }}
                              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
                            >
                              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-500/15 text-amber-400 border border-amber-500/30 overflow-hidden shrink-0">
                                <FilePenLine size={16} />
                              </div>
                              <span
                                className="text-[10.5px] font-medium text-center leading-tight"
                                style={{ color: token.colorText }}
                              >
                                CKEditor
                              </span>
                            </button>
                          </div>
                        )}

                        {/* Apple Notes Style Format Toolbar for Mobile */}
                        {formatBarOpenMain && renderAppleNotesFormatToolbar('main')}

                        {/* Mobile Main Row */}
                        <div className="flex items-center gap-1.5">
                          {/* [+] Action expander button (34x34px, 15px icon) */}
                          <button
                            type="button"
                            aria-label={mobileActionOpen ? 'Đóng tiện ích đính kèm' : 'Mở tiện ích đính kèm'}
                            onClick={() => setMobileActionOpen((prev) => !prev)}
                            className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm overflow-hidden"
                            style={{
                              background: mobileActionOpen ? '#d4a84b' : surfaceRaised,
                              border: `1px solid ${mobileActionOpen ? '#d4a84b' : borderStrong}`,
                              color: mobileActionOpen ? '#000' : token.colorTextSecondary,
                            }}
                          >
                            {mobileActionOpen ? <X size={15} /> : <Plus size={15} />}
                          </button>

                          {/* [Aa] Apple Notes Format Button for Mobile (34x34px) */}
                          <button
                            type="button"
                            aria-label="Định dạng chữ Apple Notes"
                            onClick={() => setFormatBarOpenMain((prev) => !prev)}
                            className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm overflow-hidden"
                            style={{
                              background: formatBarOpenMain ? '#d4a84b' : surfaceRaised,
                              border: `1px solid ${formatBarOpenMain ? '#d4a84b' : borderStrong}`,
                              color: formatBarOpenMain ? '#000' : token.colorTextSecondary,
                            }}
                          >
                            <span className="font-serif font-bold text-[13px] tracking-tight">Aa</span>
                          </button>

                          {/* Text Input Pill (38px min-height) with Floating @Mention Autocomplete */}
                          <div
                            className="relative flex-1 min-h-[38px] max-h-[120px] rounded-2xl px-3 py-1 flex items-center gap-1.5"
                            style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
                          >
                            {renderMentionAutocompleteDropdown('main')}

                            <textarea
                              ref={composerInputRef}
                              rows={1}
                              value={composerText}
                              onChange={(e) => {
                                const val = e.target.value;
                                setComposerText(val);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                checkForMentionTrigger(val, e.target.selectionStart ?? val.length, 'main');
                              }}
                              onClick={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                checkForMentionTrigger(
                                  target.value,
                                  target.selectionStart ?? target.value.length,
                                  'main'
                                );
                              }}
                              onKeyUp={(e) => {
                                if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Backspace', 'Delete'].includes(e.key)) {
                                  const target = e.target as HTMLTextAreaElement;
                                  checkForMentionTrigger(
                                    target.value,
                                    target.selectionStart ?? target.value.length,
                                    'main'
                                  );
                                }
                              }}
                              onPaste={(e) => handleClipboardPaste(e, 'main')}
                              onCompositionStart={() => {
                                isComposingRef.current = true;
                              }}
                              onCompositionEnd={() => {
                                lastCompositionEndMsRef.current = Date.now();
                                setTimeout(() => {
                                  isComposingRef.current = false;
                                }, 50);
                              }}
                              onKeyDown={(e) => {
                                if (handleMentionKeyDown(e, 'main')) return;
                                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                                  e.preventDefault();
                                  handleApplyFormat('bold', 'main');
                                  return;
                                }
                                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
                                  e.preventDefault();
                                  handleApplyFormat('italic', 'main');
                                  return;
                                }
                                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
                                  e.preventDefault();
                                  handleApplyFormat('underline', 'main');
                                  return;
                                }
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  if (
                                    e.nativeEvent.isComposing ||
                                    isComposingRef.current ||
                                    e.keyCode === 229 ||
                                    Date.now() - lastCompositionEndMsRef.current < 60
                                  ) {
                                    return;
                                  }
                                  e.preventDefault();
                                  handleSendMain();
                                }
                              }}
                              placeholder="Nhắn tin... (Shift+Enter để xuống dòng)"
                              className="flex-1 bg-transparent border-0 outline-none text-[13.5px] resize-none leading-relaxed py-1"
                              style={{ color: token.colorText, maxHeight: 110 }}
                            />

                            <Popover
                              trigger="click"
                              placement="topRight"
                              open={openStickerPopoverKey === 'composer:main:mobile'}
                              onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? 'composer:main:mobile' : null)}
                              content={renderComposerEmojiPickerContent('main')}
                            >
                              <button
                                type="button"
                                aria-label="Chèn biểu tượng cảm xúc Wings"
                                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer hover:bg-white/10 active:scale-95"
                                style={{ color: token.colorTextSecondary }}
                              >
                                <SmilePlus size={16} />
                              </button>
                            </Popover>
                          </div>

                          {/* Send Button (34x34px with delicate, centered 14px SendHorizontal) */}
                          <button
                            type="button"
                            aria-label="Gửi tin nhắn"
                            onClick={handleSendMain}
                            className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm overflow-hidden"
                            style={{
                              background:
                                composerText.trim() || stagedAttachments.length > 0 ? '#d4a84b' : surfaceRaised,
                              border: `1px solid ${composerText.trim() || stagedAttachments.length > 0 ? '#d4a84b' : borderStrong}`,
                              color:
                                composerText.trim() || stagedAttachments.length > 0 ? '#000' : token.colorTextSecondary,
                            }}
                          >
                            <SendHorizontal size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Desktop Layout: Spacious, 2-Tier Modern Google Chat Workspace Composer Card */
                      <div className="space-y-1.5">
                        <div
                          className="relative rounded-2xl px-3.5 pt-2.5 pb-2 flex flex-col transition-all shadow-sm focus-within:shadow-md focus-within:border-[#d4a84b]/60"
                          style={{
                            background: surfaceRaised,
                            border: `1px solid ${borderStrong}`,
                          }}
                        >
                          {renderMentionAutocompleteDropdown('main')}

                          {/* Inline Compact Format Toolbar (Google Chat Quick-Type Style) */}
                          {formatBarOpenMain && renderAppleNotesFormatToolbar('main', 'inline')}

                          {/* Top: Live Preview or 100% Full-Width Textarea */}
                          {isPreviewModeMain ? (
                            <div
                              className="w-full min-h-[58px] max-h-[220px] overflow-y-auto px-1 py-1 rounded-lg select-text mb-1"
                              style={{ color: token.colorText }}
                            >
                              <div className="flex items-center justify-between pb-1 mb-2 border-b border-amber-500/20 text-[11px] font-bold text-amber-500">
                                <div className="flex items-center gap-1.5">
                                  <Eye size={13} />
                                  <span>Đang xem trước trực quan (WYSIWYG)</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setIsPreviewModeMain(false)}
                                  className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-medium transition-colors cursor-pointer"
                                >
                                  Quay lại chỉnh sửa
                                </button>
                              </div>
                              {composerText.trim() ? (
                                <div className="prose max-w-none text-[13.5px]">
                                  {renderRichTextMessage(composerText, false)}
                                </div>
                              ) : (
                                <div className="text-zinc-500 text-[12px] italic py-2">
                                  Chưa có nội dung để xem trước... Nhập văn bản để xem hiển thị định dạng.
                                </div>
                              )}
                            </div>
                          ) : (
                            <textarea
                              ref={composerInputRef}
                              rows={1}
                              value={composerText}
                              onChange={(e) => {
                                const val = e.target.value;
                                const cur = e.target.selectionStart ?? val.length;
                                setComposerText(val);
                                setComposerCursorPos(cur);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
                                checkForMentionTrigger(val, cur, 'main');
                              }}
                              onClick={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                const cur = target.selectionStart ?? target.value.length;
                                setComposerCursorPos(cur);
                                checkForMentionTrigger(target.value, cur, 'main');
                              }}
                              onKeyUp={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                const cur = target.selectionStart ?? target.value.length;
                                setComposerCursorPos(cur);
                                if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Backspace', 'Delete'].includes(e.key)) {
                                  checkForMentionTrigger(target.value, cur, 'main');
                                }
                              }}
                              onPaste={(e) => handleClipboardPaste(e, 'main')}
                              onCompositionStart={() => {
                                isComposingRef.current = true;
                              }}
                              onCompositionEnd={() => {
                                lastCompositionEndMsRef.current = Date.now();
                                setTimeout(() => {
                                  isComposingRef.current = false;
                                }, 50);
                              }}
                              onKeyDown={(e) => {
                                if (handleMentionKeyDown(e, 'main')) return;
                                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                                  e.preventDefault();
                                  handleApplyFormat('bold', 'main');
                                  return;
                                }
                                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
                                  e.preventDefault();
                                  handleApplyFormat('italic', 'main');
                                  return;
                                }
                                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
                                  e.preventDefault();
                                  handleApplyFormat('underline', 'main');
                                  return;
                                }
                                if (e.key === 'Enter' && e.shiftKey) {
                                  const el = e.currentTarget;
                                  const smart = handleSmartListEnterKey(
                                    composerText,
                                    el.selectionStart ?? composerText.length,
                                    el.selectionEnd ?? composerText.length
                                  );
                                  if (smart.handled) {
                                    e.preventDefault();
                                    setComposerText(smart.nextText);
                                    setComposerCursorPos(smart.nextCursor);
                                    setTimeout(() => {
                                      el.focus();
                                      el.setSelectionRange(smart.nextCursor, smart.nextCursor);
                                    }, 0);
                                    return;
                                  }
                                }
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  if (
                                    e.nativeEvent.isComposing ||
                                    isComposingRef.current ||
                                    e.keyCode === 229 ||
                                    Date.now() - lastCompositionEndMsRef.current < 60
                                  ) {
                                    return;
                                  }
                                  e.preventDefault();
                                  handleSendMain();
                                }
                              }}
                              placeholder={
                                activeConversation?.id === AI_COPILOT_CONV_ID
                                  ? 'Hỏi MAI, Paste hình (⌘V) hoặc yêu cầu phân tích khách hàng... (Shift+Enter để xuống dòng)'
                                  : canUseAiCopilot
                                    ? 'Nhắn tin, gõ @MAI để gọi mOS AI, Paste hình (⌘V)... (Shift+Enter để xuống dòng)'
                                    : 'Nhắn tin, Paste hình (⌘V) hoặc dán link Google Drive... (Shift+Enter để xuống dòng)'
                              }
                              className="w-full bg-transparent border-0 outline-none text-[13.5px] resize-none leading-relaxed px-0.5 py-1 min-h-[42px]"
                              style={{ color: token.colorText, maxHeight: 180 }}
                            />
                          )}

                          {/* Bottom Toolbar: Action Icons on Left, Send Button on Right */}
                          <div
                            className="flex items-center justify-between gap-2 pt-1.5 mt-1 border-t"
                            style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }}
                          >
                            <div className="flex items-center gap-1 flex-wrap">
                              {/* [Aa] Inline Quick-Type Format Bar Toggle */}
                              <Tooltip title="Thanh định dạng gọn gõ nhanh (B, I, U, Màu chữ, Danh sách •)">
                                <button
                                  type="button"
                                  aria-label="Định dạng chữ Apple Notes"
                                  onClick={() => setFormatBarOpenMain((prev) => !prev)}
                                  className="w-7 h-7 rounded-lg inline-flex flex-col items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-all"
                                  style={{
                                    background: formatBarOpenMain ? 'rgba(236, 72, 153, 0.18)' : 'transparent',
                                    color: formatBarOpenMain ? '#f472b6' : token.colorTextSecondary,
                                    border: formatBarOpenMain ? '1px solid rgba(236, 72, 153, 0.35)' : 'none',
                                  }}
                                >
                                  <span className="font-serif font-bold text-[12px] leading-none tracking-tight">Aa</span>
                                  <span
                                    className="w-3.5 h-[2px] rounded-full mt-0.5"
                                    style={{ background: formatBarOpenMain ? '#f472b6' : 'currentColor', opacity: 0.75 }}
                                  />
                                </button>
                              </Tooltip>

                              {/* [⚡ Gọn] Compact Quick-Type Editor Button */}
                              <Tooltip title="Mở Bản gọn (Type nhanh) — Nhấn Enter tự động xuống dòng dấu • như Google Chat">
                                <button
                                  type="button"
                                  aria-label="Mở trình soạn thảo Bản gọn Type nhanh"
                                  onClick={() => {
                                    setRichEditorModalState({
                                      open: true,
                                      scope: 'main',
                                      title: 'Soạn thảo phong phú (CKEditor)',
                                      initialMode: 'compact',
                                    });
                                  }}
                                  className="h-7 px-2 rounded-lg inline-flex items-center gap-1 hover:bg-pink-500/15 cursor-pointer transition-colors text-[11px] font-bold text-pink-400 border border-pink-500/30"
                                >
                                  <Zap size={12} />
                                  <span className="hidden xl:inline">Bản gọn</span>
                                </button>
                              </Tooltip>

                              {/* [CKEditor] Full Studio Rich Editor Modal Button */}
                              <Tooltip title="Mở rộng trình soạn thảo phong phú (CKEditor Mode) với mẫu văn bản & bảng biểu">
                                <button
                                  type="button"
                                  aria-label="Mở trình soạn thảo phong phú CKEditor"
                                  onClick={() => {
                                    setRichEditorModalState({
                                      open: true,
                                      scope: 'main',
                                      title: 'Soạn thảo phong phú (CKEditor)',
                                      initialMode: 'split',
                                    });
                                  }}
                                  className="h-7 px-2 rounded-lg inline-flex items-center gap-1 hover:bg-amber-500/15 cursor-pointer transition-colors text-[11px] font-bold text-amber-500 border border-amber-500/30"
                                >
                                  <FilePenLine size={13} />
                                  <span className="hidden xl:inline">CKEditor</span>
                                </button>
                              </Tooltip>

                              <Popover
                                trigger="click"
                                placement="topRight"
                                open={openStickerPopoverKey === 'composer:main:desktop'}
                                onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? 'composer:main:desktop' : null)}
                                content={renderComposerEmojiPickerContent('main')}
                              >
                                <Tooltip title="Chèn biểu tượng cảm xúc Wings">
                                  <button
                                    type="button"
                                    aria-label="Chèn biểu tượng cảm xúc Wings"
                                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                                    style={{ color: token.colorTextSecondary }}
                                  >
                                    <SmilePlus size={16} />
                                  </button>
                                </Tooltip>
                              </Popover>

                              <Tooltip title="Tải hình từ Ổ đĩa / Google Drive Desktop hoặc Paste ảnh (⌘V)">
                                <button
                                  type="button"
                                  aria-label="Tải hình từ ổ đĩa hoặc Google Drive"
                                  onClick={() => triggerFilePicker('main')}
                                  className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                                  style={{ color: token.colorTextSecondary }}
                                >
                                  <ImagePlus size={16} />
                                </button>
                              </Tooltip>

                              <Tooltip title="Đính kèm hình từ link Google Drive">
                                <button
                                  type="button"
                                  aria-label="Đính kèm hình từ link Google Drive"
                                  onClick={() => {
                                    uploadTargetRef.current = { scope: 'main' };
                                    setDriveLinkModalOpen(true);
                                  }}
                                  className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                                  style={{ color: token.colorTextSecondary }}
                                >
                                  <HardDrive size={16} />
                                </button>
                              </Tooltip>

                              <Tooltip title="Đính kèm thẻ Khách hàng / Booking mOS">
                                <button
                                  type="button"
                                  aria-label="Đính kèm thẻ Khách hàng"
                                  onClick={handleSendQuickCustomerCard}
                                  className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                                  style={{ color: token.colorTextSecondary }}
                                >
                                  <UserRoundPlus size={16} />
                                </button>
                              </Tooltip>

                              {canUseAiCopilot && activeConversation?.id !== AI_COPILOT_CONV_ID && (
                                <Tooltip title="Gọi @MAI để mOS AI phân tích & trả lời công khai vào nhóm này">
                                  <button
                                    type="button"
                                    aria-label="Gọi @MAI trong nhóm"
                                    onClick={() => {
                                      setComposerText((prev) =>
                                        /(?:^|\s)@\s*mai\b/i.test(prev) ? prev : `@MAI ${prev}`
                                      );
                                      composerInputRef.current?.focus();
                                    }}
                                    className="h-7 px-2 rounded-lg inline-flex items-center justify-center gap-1 hover:bg-purple-500/15 cursor-pointer transition-colors text-[11px] font-black"
                                    style={{ color: '#a78bfa' }}
                                  >
                                    <Bot size={15} />
                                    <span>@MAI</span>
                                  </button>
                                </Tooltip>
                              )}

                              <Tooltip title="Nhắc tên đồng nghiệp (@)">
                                <button
                                  type="button"
                                  aria-label="Nhắc tên đồng nghiệp"
                                  onClick={() => {
                                    setComposerText((prev) => {
                                      const next = `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}@`;
                                      setTimeout(() => {
                                        composerInputRef.current?.focus();
                                        const len = next.length;
                                        composerInputRef.current?.setSelectionRange(len, len);
                                        checkForMentionTrigger(next, len, 'main');
                                      }, 20);
                                      return next;
                                    });
                                  }}
                                  className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                                  style={{ color: token.colorTextSecondary }}
                                >
                                  <AtSign size={16} />
                                </button>
                              </Tooltip>

                              <Tooltip
                                title={
                                  isUrgentSend
                                    ? 'Đang bật chế độ khẩn cấp (Buzz): Nhấp để tắt'
                                    : 'Bật chế độ khẩn cấp (Buzz): Gửi và tự động phát âm thanh thông báo @MAI đến người được tag'
                                }
                              >
                                <button
                                  type="button"
                                  aria-label="Chế độ khẩn cấp"
                                  onClick={() => setIsUrgentSend((prev) => !prev)}
                                  className={`h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[11px] font-extrabold cursor-pointer transition-all ${
                                    isUrgentSend
                                      ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-400 font-black'
                                      : 'hover:bg-amber-500/15 text-amber-500/80 border border-amber-500/30'
                                  }`}
                                >
                                  <Zap size={13} className={isUrgentSend ? 'animate-bounce' : ''} />
                                  <span>Khẩn cấp</span>
                                </button>
                              </Tooltip>

                              <Tooltip title="Giao Task & Cài nhắc hẹn mới">
                                <button
                                  type="button"
                                  aria-label="Giao Task & Cài nhắc hẹn mới"
                                  onClick={() => openTaskModalFromMessage(null)}
                                  className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-amber-500/15 cursor-pointer transition-colors"
                                  style={{ color: '#d4a84b' }}
                                >
                                  <AlarmClockPlus size={16} />
                                </button>
                              </Tooltip>

                              {/* Super Admin Only: [⚡ Quy trình] Trigger Button */}
                              {isStrictDannySuperAdmin && activeConversation?.id !== AI_COPILOT_CONV_ID && (
                                <Tooltip title="⚡ Khởi tạo Quy trình Sống (/tam-ung, /kiem-kho, /tao-quy-trinh) — Chỉ dành cho Super Admin">
                                  <button
                                    type="button"
                                    aria-label="Khởi tạo Quy trình Sống"
                                    onClick={() => {
                                      setInitialWorkflowCode('WF_CASH_ADVANCE');
                                      setTriggerWorkflowModalOpen(true);
                                    }}
                                    className="h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[11px] font-extrabold hover:bg-blue-500/15 cursor-pointer transition-colors"
                                    style={{
                                      color: '#60a5fa',
                                      border: '1px solid rgba(59, 130, 246, 0.35)',
                                    }}
                                  >
                                    <Activity size={13} />
                                    <span>⚡ Quy trình</span>
                                  </button>
                                </Tooltip>
                              )}
                            </div>

                            {/* Send button with hint */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className="text-[11px] select-none hidden sm:inline"
                                style={{ color: token.colorTextQuaternary }}
                              >
                                Enter gửi · Shift+Enter xuống dòng
                              </span>
                              <Tooltip title="Gửi tin nhắn (Enter)">
                                <button
                                  type="button"
                                  aria-label="Gửi tin nhắn"
                                  onClick={handleSendMain}
                                  className="w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all"
                                  style={{
                                    background:
                                      composerText.trim() || stagedAttachments.length > 0
                                        ? '#d4a84b'
                                        : isDark
                                          ? 'rgba(255, 255, 255, 0.08)'
                                          : 'rgba(0, 0, 0, 0.06)',
                                    color:
                                      composerText.trim() || stagedAttachments.length > 0
                                        ? '#000'
                                        : token.colorTextQuaternary,
                                  }}
                                >
                                  <SendHorizontal size={15} />
                                </button>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 2: TASKS & REMINDERS HUB (Task Manager - MOS-BUG-129) */}
              {activeSubtab === 'tasks' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {/* Header: Title + Space Indicator + Quick Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-white/5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-extrabold flex items-center gap-1.5">
                        <ListTodo size={17} className="text-amber-400" />
                        <span>Quản Lý Công Việc & Nhắc Hẹn</span>
                      </span>
                      {activeConversation && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10.5px] font-bold flex items-center gap-1"
                          style={{
                            background: isDark ? 'rgba(212, 168, 75, 0.15)' : '#fef3c7',
                            color: isDark ? '#fbbf24' : '#b45309',
                            border: '1px solid rgba(212, 168, 75, 0.3)',
                          }}
                        >
                          {activeConversation.type === 'space' ? <Hash size={11} /> : <MessageSquare size={11} />}
                          <span className="truncate max-w-[160px]">{activeConversation.name}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Tooltip title="Test nổ chuông nhắc hẹn ngay">
                        <button
                          type="button"
                          aria-label="Test nổ chuông nhắc hẹn ngay"
                          onClick={() => {
                            const firstOpen = uniqueTasks.find((t) => !t.done) || uniqueTasks[0];
                            if (firstOpen) triggerTaskReminderAlert(firstOpen);
                          }}
                          className="w-7 h-7 rounded-lg inline-flex items-center justify-center cursor-pointer"
                          style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                        >
                          <BellRing size={14} className="text-amber-400" />
                        </button>
                      </Tooltip>
                      <Tooltip title="Tạo Task mới">
                        <button
                          type="button"
                          aria-label="Tạo Task mới"
                          onClick={() => openTaskModalFromMessage(null)}
                          className="h-7 px-2.5 rounded-lg inline-flex items-center gap-1 text-[11.5px] font-extrabold cursor-pointer"
                          style={{ background: '#d4a84b', color: '#000' }}
                        >
                          <Plus size={15} />
                          <span className="hidden sm:inline">Tạo Task</span>
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Search Bar + Scope Selector + Status Filter */}
                  <div className="space-y-2">
                    {/* Search input */}
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        type="text"
                        value={taskSearchQuery}
                        onChange={(e) => setTaskSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm công việc (tiêu đề, mã task, người nhận, người tạo)..."
                        className="w-full h-8 pl-8 pr-7 rounded-lg text-[12px] transition-all outline-none"
                        style={{
                          background: surfaceBg,
                          border: `1px solid ${taskSearchQuery ? '#d4a84b' : borderColor}`,
                          color: token.colorText,
                        }}
                      />
                      {taskSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTaskSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Scope Filter Buttons: Tất cả task | Task của tôi | Không gian này */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11.5px]">
                      <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Phạm vi:</span>
                      {[
                        {
                          key: 'ALL',
                          label: `Tất cả task (${uniqueTasks.filter((t) => !t.done && !t.archived).length})`,
                        },
                        { key: 'MINE', label: `Task của tôi (${taskCounts.mine})` },
                        ...(activeConversation
                          ? [
                              {
                                key: 'SPACE',
                                label: `Trong ${activeConversation.name} (${taskCounts.space})`,
                              },
                            ]
                          : []),
                      ].map((s) => {
                        const isSel = taskScopeFilter === s.key;
                        return (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => setTaskScopeFilter(s.key as any)}
                            className="px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all whitespace-nowrap text-[11px] flex items-center gap-1"
                            style={{
                              background: isSel ? 'rgba(212, 168, 75, 0.2)' : surfaceRaised,
                              color: isSel ? '#fbbf24' : token.colorTextSecondary,
                              border: `1px solid ${isSel ? '#d4a84b' : borderColor}`,
                            }}
                          >
                            {s.key === 'MINE' && <Users size={11} />}
                            {s.key === 'SPACE' && <Hash size={11} />}
                            {s.key === 'ALL' && <FolderKanban size={11} />}
                            <span>{s.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Status Filter Pills: Đang làm | Của tôi | Quá hạn | Đã xong | Lưu trữ | Tất cả */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11.5px]">
                      <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Trạng thái:</span>
                      {[
                        { key: 'ACTIVE', label: `Đang làm (${taskCounts.active})` },
                        { key: 'MINE', label: `Của tôi (${taskCounts.mine})` },
                        { key: 'OVERDUE', label: `Quá hạn (${taskCounts.overdue})` },
                        { key: 'DONE', label: `Đã xong (${taskCounts.done})` },
                        { key: 'ARCHIVED', label: `Lưu trữ (${taskCounts.archived})` },
                        { key: 'ALL', label: `Tất cả (${taskCounts.total})` },
                      ].map((f) => {
                        const isSel = taskFilter === f.key;
                        return (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() => setTaskFilter(f.key as any)}
                            className="px-2.5 py-0.5 rounded-full font-bold cursor-pointer transition-all whitespace-nowrap text-[11px]"
                            style={{
                              background: isSel ? '#d4a84b' : surfaceRaised,
                              color: isSel ? '#000' : token.colorTextSecondary,
                              border: `1px solid ${isSel ? '#d4a84b' : borderColor}`,
                            }}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* IF IN A CONVERSATION/SPACE AND SCOPE IS NOT STRICTLY 'SPACE': PRIORITIZE THIS SPACE FIRST, OTHER TASKS BELOW */}
                  {activeConversation && taskScopeFilter !== 'SPACE' ? (
                    <div className="space-y-4 pt-1">
                      {/* SECTION 1: TRONG KHÔNG GIAN NÀY */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            {activeConversation.type === 'space' ? (
                              <Hash size={15} className="text-amber-400" />
                            ) : (
                              <MessageSquare size={15} className="text-indigo-400" />
                            )}
                            <span className="text-[12.5px] font-black uppercase tracking-wide">
                              Trong không gian này: {activeConversation.name}
                            </span>
                            <span
                              className="px-2 py-0.2 rounded-full text-[10px] font-bold tabular-nums"
                              style={{
                                background: isDark ? 'rgba(212, 168, 75, 0.2)' : '#fef3c7',
                                color: isDark ? '#fbbf24' : '#b45309',
                              }}
                            >
                              {currentSpaceTasks.length} việc
                            </span>
                            <span className="hidden sm:inline px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                              Ưu tiên không gian hiện tại
                            </span>
                          </div>
                        </div>

                        {currentSpaceTasks.length > 0 ? (
                          <div className="space-y-2">
                            {currentSpaceTasks.map((t) => {
                              const taskConv = conversations.find((c) => c.id === t.conversationId);
                              const taskSourceMsg =
                                taskConv?.messages.find((m) => m.id === t.sourceMessageId || m.taskId === t.id) || null;
                              const taskMission = t.mission || taskSourceMsg?.mission || null;
                              return (
                                <div key={t.id} className="space-y-1.5">
                                  {renderTaskCard(t, taskSourceMsg, 'list')}
                                  {taskMission && renderLiveMissionCard(taskMission, taskSourceMsg, 'task')}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div
                            className="p-3 rounded-xl text-center text-slate-400 text-[12px] flex items-center justify-between gap-2"
                            style={{ background: surfaceRaised, border: `1px dashed ${borderColor}` }}
                          >
                            <span>Không có công việc nào thuộc không gian này.</span>
                            <button
                              type="button"
                              onClick={() => openTaskModalFromMessage(null)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              style={{ background: '#d4a84b', color: '#000' }}
                            >
                              <Plus size={12} />
                              <span>Tạo việc trong không gian này</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* SECTION 2: CÁC KHÔNG GIAN & HỘI THOẠI KHÁC */}
                      {otherSpaceTasks.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between pb-1 border-b border-white/5">
                            <div className="flex items-center gap-2">
                              <FolderKanban size={15} className="text-slate-400" />
                              <span className="text-[12.5px] font-black uppercase tracking-wide text-slate-300">
                                Các không gian & hội thoại khác
                              </span>
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold tabular-nums bg-slate-500/20 text-slate-300">
                                {otherSpaceTasks.length} việc
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setCollapseOtherSpaces((prev) => !prev)}
                              className="px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                            >
                              {collapseOtherSpaces ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                              <span>{collapseOtherSpaces ? 'Mở rộng' : 'Thu gọn'}</span>
                            </button>
                          </div>

                          {!collapseOtherSpaces && (
                            <div className="space-y-2">
                              {otherSpaceTasks.map((t) => {
                                const taskConv = conversations.find((c) => c.id === t.conversationId);
                                const taskSourceMsg =
                                  taskConv?.messages.find((m) => m.id === t.sourceMessageId || m.taskId === t.id) ||
                                  null;
                                const taskMission = t.mission || taskSourceMsg?.mission || null;
                                return (
                                  <div key={t.id} className="space-y-1.5">
                                    {renderTaskCard(t, taskSourceMsg, 'list')}
                                    {taskMission && renderLiveMissionCard(taskMission, taskSourceMsg, 'task')}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* SINGLE LIST (E.G. WHEN NO ACTIVE CONVERSATION OR WHEN FILTERED STRICTLY TO THIS SPACE) */
                    <div className="space-y-2 pt-1">
                      {filteredTasks.map((t) => {
                        const taskConv = conversations.find((c) => c.id === t.conversationId);
                        const taskSourceMsg =
                          taskConv?.messages.find((m) => m.id === t.sourceMessageId || m.taskId === t.id) || null;
                        const taskMission = t.mission || taskSourceMsg?.mission || null;
                        return (
                          <div key={t.id} className="space-y-1.5">
                            {renderTaskCard(t, taskSourceMsg, 'list')}
                            {taskMission && renderLiveMissionCard(taskMission, taskSourceMsg, 'task')}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {filteredTasks.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-500 mb-3">
                        <AlarmClock size={24} />
                      </div>
                      <div className="text-[13.5px] font-bold text-slate-300 mb-1">
                        {taskFilter === 'ARCHIVED'
                          ? 'Chưa có công việc nào trong Lưu trữ'
                          : taskFilter === 'DONE'
                            ? 'Chưa có công việc nào hoàn thành'
                            : taskScopeFilter === 'MINE'
                              ? 'Bạn chưa có công việc nào được giao'
                              : taskScopeFilter === 'SPACE'
                                ? `Không có công việc nào trong "${activeConversation?.name || 'không gian này'}"`
                                : 'Chưa có đầu việc hoặc nhắc hẹn nào'}
                      </div>
                      <div className="text-[12px] max-w-xs mb-4">
                        {taskFilter === 'ARCHIVED'
                          ? 'Các công việc được lưu trữ sẽ xuất hiện tại đây và có thể khôi phục bất kỳ lúc nào.'
                          : 'Bạn có thể tạo đầu việc mới hoặc bấm vào biểu tượng hẹn giờ trên bất kỳ tin nhắn nào.'}
                      </div>
                      {taskFilter !== 'ARCHIVED' && (
                        <button
                          type="button"
                          onClick={() => openTaskModalFromMessage(null)}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                          style={{ background: '#d4a84b', color: '#000' }}
                        >
                          <Plus size={14} />
                          <span>Tạo đầu việc mới</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 3: PINNED MESSAGES */}
              {activeSubtab === 'pinned' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[13.5px] font-extrabold flex items-center gap-2">
                      <Pin size={15} className="text-amber-500 fill-amber-400" />
                      <span>Tin nhắn đã ghim</span>
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-bold tabular-nums"
                        style={{ background: 'rgba(212, 168, 75, 0.16)', color: '#d4a84b' }}
                      >
                        {pinnedMessages.length}
                      </span>
                    </div>
                    {pinnedMessages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveSubtab('chat')}
                        className="text-[12px] font-semibold text-amber-500 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Quay lại trò chuyện</span>
                        <CornerDownRight size={13} />
                      </button>
                    )}
                  </div>

                  {pinnedMessages.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center p-8 rounded-xl text-center space-y-2 mt-4"
                      style={{
                        background: surfaceBg,
                        border: `1px dashed ${borderColor}`,
                      }}
                    >
                      <Pin size={32} className="text-slate-400/60 mb-1" />
                      <div className="text-[13px] font-bold text-slate-400">
                        Chưa có tin nhắn nào được ghim trong cuộc trò chuyện này
                      </div>
                      <div className="text-[11.5px] text-slate-500 max-w-sm">
                        Rê chuột vào bất kỳ tin nhắn nào trong luồng trò chuyện và nhấn biểu tượng Ghim (Pin) để lưu
                        nhanh tại đây.
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSubtab('chat')}
                        className="mt-2 h-7 px-3 rounded-md text-[11.5px] font-bold text-amber-500 hover:bg-amber-400/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        style={{ border: '1px solid rgba(212, 168, 75, 0.3)' }}
                      >
                        <MessageSquare size={13} />
                        <span>Quay lại cuộc trò chuyện</span>
                      </button>
                    </div>
                  ) : (
                    pinnedMessages.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (activeConversation) {
                            navigateToMessage(activeConversation.id, m.id);
                          }
                        }}
                        className="p-3 rounded-lg text-[12.5px] transition-all hover:shadow-md cursor-pointer group relative"
                        style={{
                          background: surfaceBg,
                          border: `1px solid ${borderStrong}`,
                          borderLeft: '4px solid #d4a84b',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <div className="text-[11.5px] font-bold flex items-center gap-1.5 truncate">
                            <span className="text-amber-500 font-extrabold">{m.senderName}</span>
                            <span className="text-slate-400 font-normal">·</span>
                            <span className="text-slate-400 tabular-nums font-normal">{m.timeLabel}</span>
                            {m.thread && m.thread.length > 0 && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-sky-500 tabular-nums"
                                style={{ background: 'rgba(14, 165, 233, 0.12)' }}
                              >
                                {m.thread.length} phản hồi
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Nút bấm dẫn đến tin nhắn */}
                            <Tooltip title="Đi đến tin nhắn này trong cuộc trò chuyện">
                              <button
                                type="button"
                                aria-label="Đi đến tin nhắn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeConversation) {
                                    navigateToMessage(activeConversation.id, m.id);
                                  }
                                }}
                                className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors"
                                style={{
                                  background: 'rgba(212, 168, 75, 0.16)',
                                  color: '#d4a84b',
                                  border: '1px solid rgba(212, 168, 75, 0.3)',
                                }}
                              >
                                <CornerDownRight size={12} />
                                <span>Đi đến tin nhắn</span>
                              </button>
                            </Tooltip>

                            {/* Nút bỏ ghim */}
                            <Tooltip title="Bỏ ghim tin nhắn này">
                              <button
                                type="button"
                                aria-label="Bỏ ghim tin nhắn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePin(m.id);
                                }}
                                className="w-6 h-6 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                              >
                                <PinOff size={13} />
                              </button>
                            </Tooltip>
                          </div>
                        </div>

                        {m.text && (
                          <div className="text-slate-700 dark:text-slate-200 line-clamp-3 mb-1 break-words">
                            {m.text}
                          </div>
                        )}
                        {renderMessageAttachments(m.attachments, true)}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* RIGHT SIDE THREAD PANE (Google Spaces Threading) */}
            {threadOpen && activeThreadMessage && (
              <aside
                data-chat-thread-pane="true"
                onDragOver={(e) => {
                  if (draggingRootMsgId) {
                    if (draggingRootMsgId === activeThreadMessage.id) return;
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    if (!dragOverThreadPane) setDragOverThreadPane(true);
                    return;
                  }
                  // Dragging files/images into subthread pane
                  const hasFiles =
                    Boolean(e.dataTransfer?.types?.includes('Files')) || Boolean(e.dataTransfer?.files?.length);
                  if (hasFiles) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'copy';
                    if (!isDraggingOverThread) setIsDraggingOverThread(true);
                    if (isDraggingOver) setIsDraggingOver(false);
                  }
                }}
                onDragLeave={(e) => {
                  if (dragOverThreadPane && !e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setDragOverThreadPane(false);
                  }
                  if (isDraggingOverThread && !e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setIsDraggingOverThread(false);
                  }
                }}
                onDrop={(e) => {
                  if (draggingRootMsgId) {
                    if (draggingRootMsgId === activeThreadMessage.id) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const srcId = draggingRootMsgId;
                    setDraggingRootMsgId(null);
                    setDragOverTargetMsgId(null);
                    setDragOverThreadPane(false);
                    setIsDraggingOver(false);
                    setIsDraggingOverThread(false);
                    void handleMoveThreadItem({
                      mode: 'MERGE_ROOT_TO_THREAD',
                      sourceMessageId: srcId,
                      targetMessageId: activeThreadMessage.id,
                    });
                    return;
                  }
                  // Dropping files/images into subthread pane
                  if (e.dataTransfer?.files?.length) {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(false);
                    setIsDraggingOverThread(false);
                    void handleProcessImageFiles(e.dataTransfer.files, 'upload', 'thread');
                  }
                }}
                onPaste={(e) => handleClipboardPaste(e, 'thread')}
                className={`${isMobile ? 'absolute inset-0 z-30 w-full' : ''} flex flex-col shrink-0 relative`}
                style={{
                  width: isMobile ? '100%' : threadWidth,
                  background: surfaceBg,
                  borderLeft: isMobile
                    ? 'none'
                    : `1px solid ${
                        dragOverThreadPane ||
                        isDraggingOverThread ||
                        isResizingTarget === 'thread' ||
                        hoverResizeHandle === 'thread'
                          ? '#d4a84b'
                          : borderColor
                      }`,
                  display: isMobile && mobileActiveView !== 'thread' ? 'none' : 'flex',
                  transition: isResizingTarget === 'thread' ? 'none' : 'width 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {dragOverThreadPane && draggingRootMsgId && draggingRootMsgId !== activeThreadMessage.id && (
                  <div
                    className="absolute inset-2 rounded-xl z-30 flex flex-col items-center justify-center gap-2 pointer-events-none px-4 text-center"
                    style={{
                      background: 'rgba(15, 23, 42, 0.86)',
                      border: '2px dashed #d4a84b',
                      color: '#fbbf24',
                    }}
                  >
                    <CornerDownRight size={28} />
                    <div className="text-[13px] font-extrabold">
                      Thả vào đây để gộp tin nhắn (kèm ảnh & phản hồi) vào luồng này
                    </div>
                    <div className="text-[11px] text-slate-300 max-w-[260px] truncate">
                      {activeThreadMessage.senderName}: {formatMoveTargetSnippet(activeThreadMessage)}
                    </div>
                  </div>
                )}
                {isDraggingOverThread && !draggingRootMsgId && (
                  <div
                    className="absolute inset-2 rounded-xl z-30 flex flex-col items-center justify-center gap-2 pointer-events-none px-4 text-center select-none"
                    style={{
                      background: 'rgba(15, 23, 42, 0.88)',
                      border: '2px dashed #d4a84b',
                      color: '#fbbf24',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <ImagePlus size={32} className="animate-bounce" />
                    <div className="text-[13px] font-extrabold">Thả hình ảnh vào luồng phụ này</div>
                    <div className="text-[11px] text-amber-200/80">
                      Hình ảnh sẽ tự động được tải lên và đính kèm vào câu trả lời luồng
                    </div>
                  </div>
                )}
                {/* THREAD PANE RESIZE DIVIDER (Drag to resize & persistent width) */}
                {!isMobile && (
                  <Tooltip title="Kéo sang trái/phải để đổi độ rộng luồng · Nhấp đúp để đặt lại 440px">
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      aria-label="Kéo để thay đổi độ rộng luồng trả lời"
                      data-no-chat-autofocus="true"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsResizingTarget('thread');
                      }}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        setThreadWidth(440);
                        persistPersonalLayout({ threadWidth: 440 });
                      }}
                      onMouseEnter={() => setHoverResizeHandle('thread')}
                      onMouseLeave={() => setHoverResizeHandle((prev) => (prev === 'thread' ? null : prev))}
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: -5,
                        width: 10,
                        cursor: 'col-resize',
                        zIndex: 25,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        className="rounded-full transition-all"
                        style={{
                          width: isResizingTarget === 'thread' || hoverResizeHandle === 'thread' ? 3.5 : 1.5,
                          height: isResizingTarget === 'thread' || hoverResizeHandle === 'thread' ? 64 : 36,
                          background:
                            isResizingTarget === 'thread' || hoverResizeHandle === 'thread'
                              ? '#d4a84b'
                              : isDark
                                ? 'rgba(148, 163, 184, 0.35)'
                                : 'rgba(100, 116, 139, 0.3)',
                          boxShadow: isResizingTarget === 'thread' ? '0 0 10px rgba(212, 168, 75, 0.65)' : 'none',
                        }}
                      />
                      {isResizingTarget === 'thread' && (
                        <div
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums shadow-lg pointer-events-none"
                          style={{
                            position: 'absolute',
                            right: 14,
                            background: '#111827',
                            color: '#d4a84b',
                            border: '1px solid rgba(212, 168, 75, 0.45)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {threadWidth}px
                        </div>
                      )}
                    </div>
                  </Tooltip>
                )}

                <div
                  className="h-[52px] px-3 flex items-center justify-between text-[12.5px] font-extrabold"
                  style={{ borderBottom: `1px solid ${borderColor}` }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isMobile && (
                      <button
                        type="button"
                        aria-label="Quay lại hội thoại"
                        onClick={() => {
                          setThreadOpen(false);
                          setMobileActiveView('conversation');
                        }}
                        className="w-7 h-7 -ml-1 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10 shrink-0"
                        style={{ color: token.colorText }}
                      >
                        <ChevronLeft size={20} />
                      </button>
                    )}
                    <span className="flex items-center gap-1.5 truncate">
                      <MessageSquareReply size={14} className="shrink-0 text-amber-500" />
                      <span>Luồng trả lời</span>
                    </span>
                    {!isMobile && (
                      <span className="text-[10px] text-slate-400 tabular-nums font-normal ml-1">
                        ({threadWidth}px)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {isStrictDannySuperAdmin && !activeThreadMessage.mission && (
                      <Tooltip title="Đóng gói trọn luồng này (tin nhắn gốc + câu trả lời + hình ảnh) chuyển vào mOS Mission (Cổng 1)">
                        <button
                          type="button"
                          onClick={() =>
                            openMissionModalFromChat(
                              activeThreadMessage,
                              uniqueTasks.find(
                                (t) =>
                                  t.id === activeThreadMessage.taskId || t.sourceMessageId === activeThreadMessage.id
                              ) || null
                            )
                          }
                          className="h-7 px-2.5 rounded-md inline-flex items-center gap-1 text-[11px] font-extrabold cursor-pointer transition-all hover:scale-[1.02] shrink-0 whitespace-nowrap"
                          style={{
                            background: 'rgba(139, 92, 246, 0.2)',
                            border: '1px solid rgba(139, 92, 246, 0.45)',
                            color: '#c4b5fd',
                          }}
                        >
                          <Rocket size={12} />
                          <span>Chuyển vào mOS Mission</span>
                        </button>
                      </Tooltip>
                    )}
                    {isStrictDannySuperAdmin && (
                      <Tooltip title="✨ Chuẩn hóa luồng thảo luận này thành Workflow hoặc Nâng cấp Workflow (Chỉ Super Admin)">
                        <button
                          type="button"
                          onClick={() => setSaveThreadWorkflowModalOpen(true)}
                          className="h-7 px-2.5 rounded-md inline-flex items-center gap-1 text-[11px] font-extrabold cursor-pointer transition-all hover:scale-[1.02]"
                          style={{
                            background: 'rgba(59, 130, 246, 0.18)',
                            border: '1px solid rgba(59, 130, 246, 0.45)',
                            color: '#93c5fd',
                          }}
                        >
                          <Activity size={12} />
                          <span>✨ Lưu Workflow</span>
                        </button>
                      </Tooltip>
                    )}
                    {/* Nút phóng to / thu gọn nhanh luồng trả lời trên màn hình lớn */}
                    {!isMobile && (
                      <Tooltip title={threadWidth >= 560 ? 'Thu gọn luồng về 440px' : 'Mở rộng luồng sang 620px (FHD)'}>
                        <button
                          type="button"
                          aria-label="Mở rộng hoặc thu gọn luồng"
                          onClick={() => {
                            const targetWidth = threadWidth >= 560 ? 440 : 620;
                            setThreadWidth(targetWidth);
                            persistPersonalLayout({ threadWidth: targetWidth });
                          }}
                          className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
                          style={{ color: token.colorTextSecondary }}
                        >
                          {threadWidth >= 560 ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip title="Đóng luồng">
                      <button
                        type="button"
                        aria-label="Đóng luồng"
                        onClick={() => {
                          setThreadOpen(false);
                          if (isMobile) setMobileActiveView('conversation');
                        }}
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <X size={15} />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                <div ref={threadMessagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  <div
                    id={`mos-chat-thread-root-${activeThreadMessage.id}`}
                    className="p-2.5 rounded-lg text-[12px] transition-all"
                    style={{
                      background: surfaceRaised,
                      borderLeft: '3px solid #d4a84b',
                      boxShadow:
                        highlightedMsgId === activeThreadMessage.id
                          ? '0 0 0 2px #d4a84b, 0 0 14px rgba(212, 168, 75, 0.4)'
                          : undefined,
                    }}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      {renderUserAvatarNode({
                        name: activeThreadMessage.senderName,
                        avatarUrl: activeThreadMessage.senderAvatar,
                        sizeClass: 'w-5 h-5',
                        textClass: 'text-[9px]',
                      })}
                      <span className="truncate">{activeThreadMessage.senderName}</span>
                      <span className="text-slate-400 text-[10.5px] tabular-nums">
                        · {activeThreadMessage.timeLabel}
                      </span>
                    </div>
                    {activeThreadMessage.text && (
                      <div className="text-[13px] leading-relaxed break-words">
                        {renderRichTextMessage(activeThreadMessage.text)}
                      </div>
                    )}
                    {Boolean(activeThreadMessage.isAiBot || activeThreadMessage.senderId === 'wings-ai-copilot') &&
                      activeThreadMessage.text && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <Tooltip
                            title={
                              speakingMsgId === activeThreadMessage.id
                                ? 'Dừng đọc giọng nói'
                                : `Đọc câu trả lời bằng giọng Hoài My (${ttsSpeed}x)`
                            }
                          >
                            <button
                              type="button"
                              aria-label="Đọc câu trả lời AI trong luồng"
                              onClick={() => handleSpeakAiMessage(activeThreadMessage)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold cursor-pointer transition-colors"
                              style={{
                                background:
                                  speakingMsgId === activeThreadMessage.id ? 'rgba(139, 92, 246, 0.2)' : surfaceRaised,
                                border: `1px solid ${
                                  speakingMsgId === activeThreadMessage.id ? 'rgba(139, 92, 246, 0.5)' : borderColor
                                }`,
                                color: speakingMsgId === activeThreadMessage.id ? '#a78bfa' : token.colorTextSecondary,
                              }}
                            >
                              {speakingMsgId === activeThreadMessage.id ? (
                                <VolumeX size={12} className="animate-pulse" />
                              ) : (
                                <Volume2 size={12} />
                              )}
                              <span>{speakingMsgId === activeThreadMessage.id ? 'Dừng đọc' : 'Nghe'}</span>
                            </button>
                          </Tooltip>

                          <Dropdown
                            menu={{
                              items: [
                                { key: '0.8', label: '0.8x (Chậm)' },
                                { key: '1.0', label: '1.0x (Chuẩn)' },
                                { key: '1.25', label: '1.25x (Nhanh vừa)' },
                                { key: '1.5', label: '1.5x (Nhanh)' },
                                { key: '1.75', label: '1.75x (Rất nhanh)' },
                                { key: '2.0', label: '2.0x (Tối đa)' },
                              ],
                              selectedKeys: [String(ttsSpeed)],
                              onClick: ({ key }) => {
                                const s = parseFloat(key);
                                if (s) handleSetTtsSpeed(s);
                              },
                            }}
                            trigger={['click']}
                            placement="bottomLeft"
                          >
                            <button
                              type="button"
                              aria-label="Tùy chỉnh tốc độ đọc"
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium cursor-pointer transition-colors hover:text-violet-400"
                              style={{
                                background: surfaceRaised,
                                border: `1px solid ${borderColor}`,
                                color: token.colorTextSecondary,
                              }}
                              title={`Tốc độ đọc giọng nói cá nhân: ${ttsSpeed}x (nhấp để đổi)`}
                            >
                              <span className="tabular-nums font-semibold">{ttsSpeed}x</span>
                              <ChevronDown size={10} />
                            </button>
                          </Dropdown>

                          <Tooltip title="Sao chép nội dung">
                            <button
                              type="button"
                              aria-label="Sao chép nội dung AI"
                              onClick={() => {
                                void navigator.clipboard?.writeText(activeThreadMessage.text);
                                antdMessage.success('Đã sao chép nội dung câu trả lời AI');
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold cursor-pointer"
                              style={{
                                background: surfaceRaised,
                                border: `1px solid ${borderColor}`,
                                color: token.colorTextSecondary,
                              }}
                            >
                              <Copy size={11} />
                              <span>Sao chép</span>
                            </button>
                          </Tooltip>
                        </div>
                      )}
                    {renderMessageAttachments(activeThreadMessage.attachments, true)}
                    {activeThreadMessage.reactions &&
                      Object.entries(activeThreadMessage.reactions).filter(([, count]) => count > 0).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {Object.entries(activeThreadMessage.reactions)
                            .filter(([, count]) => count > 0)
                            .map(([emoji, count]) => {
                              const reactedByMe = hasUserReacted(activeThreadMessage, emoji);
                              const stickerReaction = parseStickerReactionKey(emoji);
                              const label = stickerReaction ? stickerReaction.caption || stickerReaction.title : emoji;
                              return (
                                <Tooltip
                                  key={emoji}
                                  title={reactedByMe ? `Đã thả ${label} · Nhấn để gỡ cảm xúc` : `Thả cùng ${label}`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleToggleReaction(activeThreadMessage.id, emoji)}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-bold cursor-pointer tabular-nums transition-all hover:scale-105"
                                    style={{
                                      background: reactedByMe ? 'rgba(212, 168, 75, 0.16)' : canvasBg,
                                      border: `1px solid ${reactedByMe ? 'rgba(212, 168, 75, 0.55)' : borderColor}`,
                                      color: reactedByMe ? '#d4a84b' : token.colorText,
                                    }}
                                  >
                                    {stickerReaction ? (
                                      <MosChatStickerVisual sticker={stickerReaction} size="reaction" />
                                    ) : (
                                      <span>{emoji}</span>
                                    )}
                                    <span>{count}</span>
                                  </button>
                                </Tooltip>
                              );
                            })}
                        </div>
                      )}
                  </div>

                  {/* Pinned Live mOS Mission Card at the top of the Thread */}
                  {activeThreadMessage.mission &&
                    renderLiveMissionCard(activeThreadMessage.mission, activeThreadMessage, 'thread')}

                  <div className="text-[10.5px] font-bold uppercase text-slate-400 tabular-nums">
                    {activeThreadMessage.thread?.length || 0} câu trả lời
                  </div>

                  {(activeThreadMessage.thread || []).map((r) => {
                    const isReplyMine = isMessageFromCurrentUser(r);
                    const isAiReply = Boolean(r.isAiBot || r.senderId === 'wings-ai-copilot');
                    const replyBreakdown = getThreadReplyReadBreakdown(activeConversation, activeThreadMessage, r);
                    const stoppedReadersForReply = stoppedReadersByReplyId[r.id] || [];
                    return (
                      <div key={r.id} id={`mos-chat-reply-${r.id}`} className="space-y-1">
                        <div className={`flex gap-2 items-start ${isReplyMine ? 'flex-row-reverse' : 'flex-row'}`}>
                          {renderUserAvatarNode({
                            name: r.senderName,
                            avatarUrl: r.senderAvatar,
                            sizeClass: 'w-6 h-6 mt-0.5',
                            textClass: 'text-[9.5px]',
                            bgStyle: isReplyMine
                              ? 'linear-gradient(135deg, #d4a84b 0%, #b45309 100%)'
                              : isAiReply
                                ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #d4a84b 100%)'
                                : '#2563eb',
                            textColor: isReplyMine ? '#000' : '#fff',
                            isAiBot: isAiReply,
                          })}
                          <div
                            className={`max-w-[85%] p-2 rounded-xl text-[12px] group relative transition-all ${
                              isReplyMine ? 'rounded-tr-sm text-right' : 'rounded-tl-sm text-left'
                            }`}
                            style={{
                              background: isReplyMine
                                ? accentSoftBg
                                : isAiReply
                                  ? isDark
                                    ? 'rgba(139, 92, 246, 0.12)'
                                    : 'rgba(139, 92, 246, 0.08)'
                                  : canvasBg,
                              border: `1px solid ${
                                isReplyMine
                                  ? accentBorder
                                  : isAiReply
                                    ? isDark
                                      ? 'rgba(139, 92, 246, 0.4)'
                                      : 'rgba(139, 92, 246, 0.3)'
                                    : borderColor
                              }`,
                              boxShadow:
                                highlightedMsgId === r.id
                                  ? `0 0 0 2px ${accentColor}, 0 0 14px ${accentBorder}`
                                  : undefined,
                            }}
                          >
                            <div
                              className={`font-bold text-[10.5px] mb-0.5 flex items-center gap-1 ${
                                isReplyMine ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              {(() => {
                                const nick = getMemberNickname(r.senderId);
                                if (nick && nick !== r.senderName) {
                                  return (
                                    <span className="inline-flex items-center gap-1">
                                      <span
                                        style={{ color: isReplyMine ? '#d4a84b' : isAiReply ? '#a855f7' : '#10b981' }}
                                      >
                                        {nick}
                                      </span>
                                      <span className="text-slate-400 font-normal">({r.senderName})</span>
                                    </span>
                                  );
                                }
                                return (
                                  <span
                                    style={{ color: isReplyMine ? '#d4a84b' : isAiReply ? '#a855f7' : token.colorText }}
                                  >
                                    {r.senderName}
                                  </span>
                                );
                              })()}
                              <span className="text-slate-400 tabular-nums">· {r.timeLabel}</span>
                              {isReplyMine &&
                                !r.isDeleted &&
                                renderReadStatusCheckmark(replyBreakdown.seenBy, replyBreakdown.unseenBy, {
                                  compact: true,
                                  scopeLabel: 'Trạng thái đọc phản hồi trong luồng',
                                })}
                              {r.editHistory && r.editHistory.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setHistoryModalMessage(r as SafeAny);
                                    setHistoryModalOpen(true);
                                  }}
                                  className="text-[9.5px] text-amber-500/80 hover:text-amber-400 hover:underline cursor-pointer select-none"
                                  title="Xem lịch sử chỉnh sửa"
                                >
                                  (đã sửa)
                                </button>
                              )}
                            </div>

                            {/* Reply Content: Inline Edit vs Deleted vs Normal Text */}
                            {editingMessageId === activeThreadMessage.id && editingReplyId === r.id ? (
                              <div className="space-y-1.5 pt-1 text-left">
                                <textarea
                                  autoFocus
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      handleCancelEdit();
                                    } else if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveEdit();
                                    }
                                  }}
                                  rows={2}
                                  className="w-full bg-transparent border border-amber-500/50 rounded-lg p-1 text-[12px] outline-none"
                                  style={{ color: token.colorText }}
                                />
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-slate-400">Shift+Enter: dòng mới</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={handleCancelEdit}
                                      className="px-1.5 py-0.5 rounded cursor-pointer hover:bg-white/10"
                                      style={{ color: token.colorTextSecondary }}
                                    >
                                      Huỷ
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSavingEdit || !editingText.trim()}
                                      onClick={handleSaveEdit}
                                      className="px-2 py-0.5 rounded font-bold cursor-pointer"
                                      style={{ background: '#d4a84b', color: '#000' }}
                                    >
                                      {isSavingEdit ? 'Lưu...' : 'Lưu'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : r.isDeleted ? (
                              <div className="italic opacity-70 text-[11.5px] flex items-center gap-1.5 text-left">
                                <span>💬 Tin nhắn trong luồng đã bị xoá</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setHistoryModalMessage(r as SafeAny);
                                    setHistoryModalOpen(true);
                                  }}
                                  className="text-[10px] text-amber-500 hover:underline not-italic font-bold cursor-pointer"
                                >
                                  Xem
                                </button>
                                {(isReplyMine || isDannyAccount) && (
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreMessage(activeThreadMessage.id, r.id)}
                                    className="text-[10px] text-emerald-400 hover:underline not-italic font-bold cursor-pointer inline-flex items-center gap-0.5"
                                  >
                                    <RotateCcw size={10} />
                                    <span>Khôi phục</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <>
                                {r.aiThinking && (
                                  <div
                                    className="mb-1 rounded-lg overflow-hidden w-full text-left"
                                    style={{
                                      background: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.06)',
                                      border: '1px solid rgba(139, 92, 246, 0.25)',
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedThinkingIds((prev) => ({
                                          ...prev,
                                          [r.id]: !prev[r.id],
                                        }))
                                      }
                                      className="w-full px-2 py-1 flex items-center justify-between text-[10px] font-semibold text-purple-400 hover:bg-purple-500/10 cursor-pointer transition-colors"
                                    >
                                      <span className="inline-flex items-center gap-1">
                                        <Sparkles size={11} />
                                        <span>Quá trình suy luận của MAI</span>
                                      </span>
                                      {expandedThinkingIds[r.id] ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                    </button>
                                    {expandedThinkingIds[r.id] && (
                                      <div
                                        className="px-2 py-1.5 text-[11px] font-mono leading-relaxed whitespace-pre-wrap select-text"
                                        style={{
                                          color: token.colorTextSecondary,
                                          borderTop: '1px dashed rgba(139, 92, 246, 0.2)',
                                        }}
                                      >
                                        {r.aiThinking}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {r.isBuzzed && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="mb-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-between gap-1 text-[10px] font-bold text-amber-500 dark:text-amber-400 select-none"
                                  >
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 font-black text-[8.5px] animate-pulse shrink-0">
                                        ⚡
                                      </span>
                                      <span className="truncate">KHẨN CẤP · BUZZ</span>
                                      {r.buzzCount && r.buzzCount > 1 && (
                                        <span className="px-1 py-0.2 rounded bg-amber-500/30 text-[9px] tabular-nums font-extrabold text-amber-300 shrink-0">
                                          x{r.buzzCount}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {r.latestBuzz && (
                                        <span className="text-[9.5px] opacity-75 font-normal tabular-nums">
                                          {dayjs(r.latestBuzz.buzzedAt).format('HH:mm')}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        aria-label="Nghe @MAI đọc câu trả lời khẩn cấp"
                                        onClick={() => {
                                          const spokenText = buildMaiUrgentVoiceAnnouncement({
                                            senderName: r.latestBuzz?.senderName || r.senderName || 'Đồng nghiệp',
                                            conversationName: activeConversation?.name,
                                            isSpace: activeConversation?.type === 'space',
                                            messageText: r.text || '',
                                            note: r.latestBuzz?.note,
                                          });
                                          void playNeuralSpeech(spokenText, {
                                            voice: 'vi-VN-HoaiMyNeural',
                                            speed: ttsSpeed || 1.0,
                                          });
                                        }}
                                        className="text-[9px] font-semibold text-amber-400 hover:underline cursor-pointer inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500/10 hover:bg-amber-500/20"
                                        title="Nghe @MAI đọc câu trả lời khẩn cấp"
                                      >
                                        <Volume2 size={9} />
                                        <span>@MAI đọc</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {r.text && (
                                  <div className="text-left break-words leading-relaxed">
                                    {renderRichTextMessage(r.text, isReplyMine)}
                                  </div>
                                )}
                                {isAiReply && r.text && (
                                  <div className="mt-1.5 flex items-center gap-1.5">
                                    <Tooltip
                                      title={
                                        speakingMsgId === r.id
                                          ? 'Dừng đọc giọng nói'
                                          : `Đọc câu trả lời bằng giọng Hoài My (${ttsSpeed}x)`
                                      }
                                    >
                                      <button
                                        type="button"
                                        aria-label="Đọc câu trả lời AI trong luồng"
                                        onClick={() => handleSpeakAiMessage(r as SafeAny)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold cursor-pointer transition-colors"
                                        style={{
                                          background:
                                            speakingMsgId === r.id ? 'rgba(139, 92, 246, 0.2)' : surfaceRaised,
                                          border: `1px solid ${
                                            speakingMsgId === r.id ? 'rgba(139, 92, 246, 0.5)' : borderColor
                                          }`,
                                          color: speakingMsgId === r.id ? '#a78bfa' : token.colorTextSecondary,
                                        }}
                                      >
                                        {speakingMsgId === r.id ? (
                                          <VolumeX size={12} className="animate-pulse" />
                                        ) : (
                                          <Volume2 size={12} />
                                        )}
                                        <span>{speakingMsgId === r.id ? 'Dừng đọc' : 'Nghe'}</span>
                                      </button>
                                    </Tooltip>

                                    <Dropdown
                                      menu={{
                                        items: [
                                          { key: '0.8', label: '0.8x (Chậm)' },
                                          { key: '1.0', label: '1.0x (Chuẩn)' },
                                          { key: '1.25', label: '1.25x (Nhanh vừa)' },
                                          { key: '1.5', label: '1.5x (Nhanh)' },
                                          { key: '1.75', label: '1.75x (Rất nhanh)' },
                                          { key: '2.0', label: '2.0x (Tối đa)' },
                                        ],
                                        selectedKeys: [String(ttsSpeed)],
                                        onClick: ({ key }) => {
                                          const s = parseFloat(key);
                                          if (s) handleSetTtsSpeed(s);
                                        },
                                      }}
                                      trigger={['click']}
                                      placement="bottomLeft"
                                    >
                                      <button
                                        type="button"
                                        aria-label="Tùy chỉnh tốc độ đọc"
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium cursor-pointer transition-colors hover:text-violet-400"
                                        style={{
                                          background: surfaceRaised,
                                          border: `1px solid ${borderColor}`,
                                          color: token.colorTextSecondary,
                                        }}
                                        title={`Tốc độ đọc giọng nói cá nhân: ${ttsSpeed}x (nhấp để đổi)`}
                                      >
                                        <span className="tabular-nums font-semibold">{ttsSpeed}x</span>
                                        <ChevronDown size={10} />
                                      </button>
                                    </Dropdown>

                                    <Tooltip title="Sao chép nội dung">
                                      <button
                                        type="button"
                                        aria-label="Sao chép nội dung AI"
                                        onClick={() => {
                                          void navigator.clipboard?.writeText(r.text);
                                          antdMessage.success('Đã sao chép nội dung câu trả lời AI');
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold cursor-pointer"
                                        style={{
                                          background: surfaceRaised,
                                          border: `1px solid ${borderColor}`,
                                          color: token.colorTextSecondary,
                                        }}
                                      >
                                        <Copy size={11} />
                                        <span>Sao chép</span>
                                      </button>
                                    </Tooltip>
                                  </div>
                                )}
                              </>
                            )}

                            {renderMessageAttachments(r.attachments, true)}

                            {/* Reaction Pills for Thread Reply */}
                            {r.reactions && Object.entries(r.reactions).filter(([, count]) => count > 0).length > 0 && (
                              <div
                                className={`mt-1.5 flex flex-wrap items-center gap-1 ${
                                  isReplyMine ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                {Object.entries(r.reactions)
                                  .filter(([, count]) => count > 0)
                                  .map(([emoji, count]) => {
                                    const reactedByMe = hasUserReacted(r, emoji);
                                    const stickerReaction = parseStickerReactionKey(emoji);
                                    const label = stickerReaction
                                      ? stickerReaction.caption || stickerReaction.title
                                      : emoji;
                                    return (
                                      <Tooltip
                                        key={emoji}
                                        title={
                                          reactedByMe
                                            ? `Bạn đã thả ${label} · Nhấn để gỡ cảm xúc`
                                            : `Nhấn để thả cùng ${label}`
                                        }
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleToggleReaction(activeThreadMessage.id, emoji, r.id)}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-bold cursor-pointer tabular-nums transition-all hover:scale-105"
                                          style={{
                                            background: reactedByMe ? 'rgba(212, 168, 75, 0.16)' : surfaceRaised,
                                            border: `1px solid ${reactedByMe ? 'rgba(212, 168, 75, 0.55)' : borderColor}`,
                                            color: reactedByMe ? '#d4a84b' : token.colorText,
                                          }}
                                        >
                                          {stickerReaction ? (
                                            <MosChatStickerVisual sticker={stickerReaction} size="reaction" />
                                          ) : (
                                            <span>{emoji}</span>
                                          )}
                                          <span>{count}</span>
                                        </button>
                                      </Tooltip>
                                    );
                                  })}
                              </div>
                            )}

                            {/* Reply Hover Action Toolbar */}
                            <div
                              className={`${
                                openMovePopoverKey === `reply:${activeThreadMessage.id}:${r.id}` ||
                                openStickerPopoverKey === `reply:${activeThreadMessage.id}:${r.id}`
                                  ? 'opacity-100 pointer-events-auto ring-1 ring-amber-500/50'
                                  : 'opacity-0'
                              } group-hover:opacity-100 transition-opacity absolute -top-3.5 right-1 flex items-center gap-0.5 px-1 py-0.5 rounded-full shadow-sm`}
                              style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
                            >
                              {!r.isDeleted && (
                                <>
                                  {GOOGLE_CHAT_QUICK_EMOJIS.slice(0, 3).map((emoji) => {
                                    const reactedByMe = hasUserReacted(r, emoji);
                                    return (
                                      <Tooltip
                                        key={emoji}
                                        title={reactedByMe ? `Đã thả ${emoji} · Nhấn để gỡ` : `Thả nhanh ${emoji}`}
                                      >
                                        <button
                                          type="button"
                                          aria-label={reactedByMe ? `Gỡ cảm xúc ${emoji}` : `Thả nhanh ${emoji}`}
                                          onClick={() => handleToggleReaction(activeThreadMessage.id, emoji, r.id)}
                                          className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-transform hover:scale-110"
                                          style={{
                                            background: reactedByMe ? 'rgba(212, 168, 75, 0.22)' : 'transparent',
                                            boxShadow: reactedByMe
                                              ? 'inset 0 0 0 1px rgba(212, 168, 75, 0.55)'
                                              : 'none',
                                          }}
                                        >
                                          {emoji}
                                        </button>
                                      </Tooltip>
                                    );
                                  })}

                                  <Popover
                                    trigger="click"
                                    placement={isReplyMine ? 'topRight' : 'topLeft'}
                                    open={openStickerPopoverKey === `reply:${activeThreadMessage.id}:${r.id}`}
                                    onOpenChange={(vis) =>
                                      setOpenStickerPopoverKey(vis ? `reply:${activeThreadMessage.id}:${r.id}` : null)
                                    }
                                    content={renderReactionPickerContent(activeThreadMessage.id, r, r.id)}
                                  >
                                    <Tooltip title="Chọn biểu tượng cảm xúc">
                                      <button
                                        type="button"
                                        aria-label="Chọn biểu tượng cảm xúc"
                                        className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                                        style={{ color: token.colorTextSecondary }}
                                      >
                                        <SmilePlus size={11} />
                                      </button>
                                    </Tooltip>
                                  </Popover>

                                  <span className="w-px h-3 mx-0.5" style={{ background: borderStrong }} />
                                </>
                              )}

                              {/* Buzz / Bump Urgent Reply Button */}
                              {!r.isDeleted && (
                                <Tooltip
                                  title={
                                    r.isBuzzed
                                      ? `Đã Buzz ${r.buzzCount || 1} lần · Nhấp để Buzz lại phản hồi khẩn cấp`
                                      : '⚡ Buzz / Bump phản hồi khẩn cấp'
                                  }
                                >
                                  <Popconfirm
                                    title="⚡ Buzz / Bump phản hồi khẩn cấp?"
                                    description="Gửi tín hiệu cảnh báo nổi bật kèm âm thanh & rung để người nhận chú ý xử lý ngay."
                                    onConfirm={() => handleBuzzMessage(activeThreadMessage.id, r.id)}
                                    okText="⚡ Buzz ngay"
                                    cancelText="Huỷ"
                                    okButtonProps={{
                                      style: {
                                        backgroundColor: '#f59e0b',
                                        borderColor: '#f59e0b',
                                        color: '#000',
                                        fontWeight: 'bold',
                                      },
                                    }}
                                    zIndex={1350}
                                    overlayStyle={{ zIndex: 1350 }}
                                  >
                                    <button
                                      type="button"
                                      aria-label="Buzz / Bump phản hồi khẩn cấp"
                                      className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-amber-500/20 cursor-pointer text-amber-500 transition-transform hover:scale-110"
                                      style={{
                                        background: r.isBuzzed ? 'rgba(245, 158, 11, 0.22)' : 'transparent',
                                      }}
                                    >
                                      <Zap
                                        size={11}
                                        className={r.isBuzzed ? 'fill-amber-500 animate-pulse text-amber-500' : ''}
                                      />
                                    </button>
                                  </Popconfirm>
                                </Tooltip>
                              )}
                              {(isReplyMine || canManageChatThreads) && !r.isDeleted && !r.isMissionMilestone && (
                                <Popover
                                  trigger="click"
                                  placement="topRight"
                                  open={openMovePopoverKey === `reply:${activeThreadMessage.id}:${r.id}`}
                                  onOpenChange={(vis) => {
                                    setOpenMovePopoverKey(vis ? `reply:${activeThreadMessage.id}:${r.id}` : null);
                                    if (!vis) setMoveThreadSearchQuery('');
                                  }}
                                  content={renderMoveReplyPopover(activeThreadMessage, r)}
                                >
                                  <Tooltip title="Tách ra luồng chính hoặc chuyển sang luồng khác">
                                    <button
                                      type="button"
                                      aria-label="Tách hoặc chuyển câu trả lời sang luồng khác"
                                      className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-amber-500/15 cursor-pointer"
                                      style={{
                                        color:
                                          openMovePopoverKey === `reply:${activeThreadMessage.id}:${r.id}`
                                            ? '#d4a84b'
                                            : token.colorTextSecondary,
                                      }}
                                    >
                                      <ArrowUpRight size={11} />
                                    </button>
                                  </Tooltip>
                                </Popover>
                              )}
                              {/* Edit Reply Button (author only, and not deleted) */}
                              {isReplyMine && !r.isDeleted && (
                                <Tooltip title="Chỉnh sửa">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(activeThreadMessage, r.id)}
                                    className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-white/10 cursor-pointer"
                                    style={{ color: token.colorTextSecondary }}
                                  >
                                    <Pencil size={11} />
                                  </button>
                                </Tooltip>
                              )}
                              {(isReplyMine || isDannyAccount) && !r.isDeleted && (
                                <Tooltip title="Xoá câu trả lời">
                                  <Popconfirm
                                    title="Xoá câu trả lời này?"
                                    onConfirm={() => handleDeleteMessage(activeThreadMessage.id, r.id)}
                                    okText="Xoá"
                                    cancelText="Huỷ"
                                    okButtonProps={{ danger: true }}
                                    zIndex={1350}
                                    overlayStyle={{ zIndex: 1350 }}
                                  >
                                    <button
                                      type="button"
                                      className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-rose-500/15 cursor-pointer text-rose-400"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </Popconfirm>
                                </Tooltip>
                              )}
                              {(r.isDeleted || (r.editHistory && r.editHistory.length > 0)) && (
                                <Tooltip title="Lịch sử">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHistoryModalMessage(r as SafeAny);
                                      setHistoryModalOpen(true);
                                    }}
                                    className="w-5 h-5 rounded-full inline-flex items-center justify-center text-amber-400 cursor-pointer hover:bg-amber-500/10"
                                  >
                                    <History size={11} />
                                  </button>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </div>
                        {stoppedReadersForReply.length > 0 && (
                          <div className={`w-full flex ${isReplyMine ? 'justify-end pr-8' : 'justify-start pl-8'}`}>
                            {renderMiniSeenAvatarStack(stoppedReadersForReply, replyBreakdown.unseenBy, {
                              align: isReplyMine ? 'right' : 'left',
                              scopeLabel: 'Đã xem đến phản hồi này trong luồng',
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {aiThinkingActive && (
                    <div className="flex gap-2 items-start text-left p-1">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5"
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #d4a84b 100%)',
                        }}
                      >
                        <Bot size={13} className="animate-spin" />
                      </div>
                      <div
                        className="p-2 rounded-xl text-[11.5px] max-w-[85%]"
                        style={{
                          background: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                        }}
                      >
                        <span className="font-semibold text-purple-400">🤖 MAI</span>
                        <span className="text-slate-400 ml-1.5 animate-pulse tabular-nums">
                          Đang phân tích luồng ({aiElapsedSec}s)...
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={threadMessagesEndRef} />
                </div>

                <div
                  className="p-2.5 space-y-1.5"
                  style={{ borderTop: `1px solid ${borderColor}` }}
                  onDragOver={(e) => {
                    if (draggingRootMsgId) return;
                    const hasFiles =
                      Boolean(e.dataTransfer?.types?.includes('Files')) || Boolean(e.dataTransfer?.files?.length);
                    if (hasFiles) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'copy';
                      if (!isDraggingOverThread) setIsDraggingOverThread(true);
                      if (isDraggingOver) setIsDraggingOver(false);
                    }
                  }}
                  onDrop={(e) => {
                    if (draggingRootMsgId) return;
                    if (e.dataTransfer?.files?.length) {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOver(false);
                      setIsDraggingOverThread(false);
                      void handleProcessImageFiles(e.dataTransfer.files, 'upload', 'thread');
                    }
                  }}
                >
                  {renderStagedAttachmentsStrip(threadAttachments, 'thread')}
                  <div
                    className={`relative rounded-2xl px-3 pt-2 pb-1.5 flex flex-col transition-all shadow-sm focus-within:shadow-md focus-within:border-[#d4a84b]/60 ${
                      isDraggingOverThread ? 'ring-2 ring-amber-500/70 border-[#d4a84b]' : ''
                    }`}
                    style={{
                      background: surfaceRaised,
                      border: `1px solid ${isDraggingOverThread ? '#d4a84b' : borderStrong}`,
                    }}
                    onDragOver={(e) => {
                      if (draggingRootMsgId) return;
                      const hasFiles =
                        Boolean(e.dataTransfer?.types?.includes('Files')) || Boolean(e.dataTransfer?.files?.length);
                      if (hasFiles) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'copy';
                        if (!isDraggingOverThread) setIsDraggingOverThread(true);
                        if (isDraggingOver) setIsDraggingOver(false);
                      }
                    }}
                    onDrop={(e) => {
                      if (draggingRootMsgId) return;
                      if (e.dataTransfer?.files?.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingOver(false);
                        setIsDraggingOverThread(false);
                        void handleProcessImageFiles(e.dataTransfer.files, 'upload', 'thread');
                      }
                    }}
                  >
                    {renderMentionAutocompleteDropdown('thread')}

                    {/* Inline Compact Format Toolbar in Thread */}
                    {formatBarOpenThread && renderAppleNotesFormatToolbar('thread', 'inline')}

                    {isPreviewModeThread ? (
                      <div
                        className="w-full min-h-[50px] max-h-[160px] overflow-y-auto px-1 py-1 rounded-lg select-text mb-1"
                        style={{ color: token.colorText }}
                      >
                        <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-amber-500/20 text-[10.5px] font-bold text-amber-500">
                          <div className="flex items-center gap-1.5">
                            <Eye size={12} />
                            <span>Đang xem trước phản hồi luồng</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsPreviewModeThread(false)}
                            className="text-[10.5px] px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-medium transition-colors cursor-pointer"
                          >
                            Quay lại sửa
                          </button>
                        </div>
                        {threadInput.trim() ? (
                          <div className="prose max-w-none text-[13px]">
                            {renderRichTextMessage(threadInput, false)}
                          </div>
                        ) : (
                          <div className="text-zinc-500 text-[11.5px] italic py-1">
                            Chưa có nội dung để xem trước...
                          </div>
                        )}
                      </div>
                    ) : (
                      <textarea
                        ref={threadInputRef}
                        rows={1}
                        value={threadInput}
                        onDragOver={(e) => {
                          if (draggingRootMsgId) return;
                          const hasFiles =
                            Boolean(e.dataTransfer?.types?.includes('Files')) || Boolean(e.dataTransfer?.files?.length);
                          if (hasFiles) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = 'copy';
                            if (!isDraggingOverThread) setIsDraggingOverThread(true);
                            if (isDraggingOver) setIsDraggingOver(false);
                          }
                        }}
                        onDrop={(e) => {
                          if (draggingRootMsgId) return;
                          if (e.dataTransfer?.files?.length) {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDraggingOver(false);
                            setIsDraggingOverThread(false);
                            void handleProcessImageFiles(e.dataTransfer.files, 'upload', 'thread');
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          const cursor = e.target.selectionStart ?? val.length;
                          setThreadInput(val);
                          setThreadCursorPos(cursor);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                          checkForMentionTrigger(val, cursor, 'thread');
                        }}
                        onClick={(e) => {
                          const target = e.currentTarget;
                          const cursor = target.selectionStart ?? target.value.length;
                          setThreadCursorPos(cursor);
                          checkForMentionTrigger(target.value, cursor, 'thread');
                        }}
                        onKeyUp={(e) => {
                          const target = e.currentTarget;
                          const cursor = target.selectionStart ?? target.value.length;
                          setThreadCursorPos(cursor);
                          if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Backspace', 'Delete'].includes(e.key)) {
                            checkForMentionTrigger(target.value, cursor, 'thread');
                          }
                        }}
                        onPaste={(e) => handleClipboardPaste(e, 'thread')}
                        onCompositionStart={() => {
                          isComposingRef.current = true;
                        }}
                        onCompositionEnd={() => {
                          lastCompositionEndMsRef.current = Date.now();
                          setTimeout(() => {
                            isComposingRef.current = false;
                          }, 50);
                        }}
                        onKeyDown={(e) => {
                          if (handleMentionKeyDown(e, 'thread')) {
                            return;
                          }
                          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                            e.preventDefault();
                            handleApplyFormat('bold', 'thread');
                            return;
                          }
                          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
                            e.preventDefault();
                            handleApplyFormat('italic', 'thread');
                            return;
                          }
                          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
                            e.preventDefault();
                            handleApplyFormat('underline', 'thread');
                            return;
                          }
                          if (e.key === 'Enter' && e.shiftKey) {
                            const el = e.currentTarget;
                            const smart = handleSmartListEnterKey(
                              threadInput,
                              el.selectionStart ?? threadInput.length,
                              el.selectionEnd ?? threadInput.length
                            );
                            if (smart.handled) {
                              e.preventDefault();
                              setThreadInput(smart.nextText);
                              setThreadCursorPos(smart.nextCursor);
                              setTimeout(() => {
                                el.focus();
                                el.setSelectionRange(smart.nextCursor, smart.nextCursor);
                              }, 0);
                              return;
                            }
                          }
                          if (e.key === 'Enter' && !e.shiftKey) {
                            if (
                              e.nativeEvent.isComposing ||
                              isComposingRef.current ||
                              e.keyCode === 229 ||
                              Date.now() - lastCompositionEndMsRef.current < 60
                            ) {
                              return;
                            }
                            e.preventDefault();
                            handleSendThreadReply();
                          }
                        }}
                        placeholder="Trả lời vào luồng... (gõ @MAI để gọi mOS AI, @ để nhắc tên, Shift+Enter xuống dòng)"
                        className="w-full bg-transparent border-0 outline-none text-[13px] resize-none leading-relaxed px-0.5 py-1 min-h-[36px]"
                        style={{
                          color: token.colorText,
                          maxHeight: 140,
                        }}
                      />
                    )}

                    {/* Bottom row: Tools on Left, Send on Right */}
                    <div
                      className="flex items-center justify-between gap-1.5 pt-1 mt-0.5 border-t"
                      style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }}
                    >
                      <div className="flex items-center gap-0.5">
                        {/* [Bot] Call @MAI in Thread */}
                        {canUseAiCopilot && (
                          <Tooltip title="Gọi @MAI để mOS AI phân tích & tư vấn trực tiếp vào luồng này">
                            <button
                              type="button"
                              aria-label="Gọi @MAI trong luồng"
                              onClick={() => {
                                setThreadInput((prev) => (/(?:^|\s)@\s*mai\b/i.test(prev) ? prev : `@MAI ${prev}`));
                                setTimeout(() => {
                                  threadInputRef.current?.focus();
                                }, 20);
                              }}
                              className="h-7 px-2 rounded-lg inline-flex items-center justify-center gap-1 shrink-0 cursor-pointer hover:bg-purple-500/20 active:scale-95 transition-all text-purple-400 hover:text-purple-300 text-[11px] font-black"
                            >
                              <Bot size={14} />
                              <span>@MAI</span>
                            </button>
                          </Tooltip>
                        )}

                        {/* [@] Mention Button in Thread */}
                        <Tooltip title="Nhắc tên đồng nghiệp (@)">
                          <button
                            type="button"
                            aria-label="Nhắc tên đồng nghiệp trong luồng"
                            onClick={() => {
                              setThreadInput((prev) => {
                                const next = `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}@`;
                                setTimeout(() => {
                                  threadInputRef.current?.focus();
                                  const len = next.length;
                                  threadInputRef.current?.setSelectionRange(len, len);
                                  checkForMentionTrigger(next, len, 'thread');
                                }, 20);
                                return next;
                              });
                            }}
                            className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                            style={{ color: token.colorTextSecondary }}
                          >
                            <AtSign size={15} />
                          </button>
                        </Tooltip>

                        {/* [Aa] Inline Quick-Type Format Bar Button in Thread */}
                        <Tooltip title="Thanh định dạng gọn gõ nhanh (B, I, U, Màu chữ, Danh sách •)">
                          <button
                            type="button"
                            aria-label="Định dạng chữ Apple Notes trong luồng"
                            onClick={() => setFormatBarOpenThread((prev) => !prev)}
                            className="w-7 h-7 rounded-lg inline-flex flex-col items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                            style={{
                              background: formatBarOpenThread ? 'rgba(236, 72, 153, 0.18)' : 'transparent',
                              color: formatBarOpenThread ? '#f472b6' : token.colorTextSecondary,
                              border: formatBarOpenThread ? '1px solid rgba(236, 72, 153, 0.35)' : 'none',
                            }}
                          >
                            <span className="font-serif font-bold text-[11.5px] leading-none tracking-tight">Aa</span>
                            <span
                              className="w-3 h-[2px] rounded-full mt-0.5"
                              style={{ background: formatBarOpenThread ? '#f472b6' : 'currentColor', opacity: 0.75 }}
                            />
                          </button>
                        </Tooltip>

                        {/* [⚡ Gọn] Compact Quick-Type Editor in Thread */}
                        <Tooltip title="Mở Bản gọn (Type nhanh) cho luồng phản hồi">
                          <button
                            type="button"
                            aria-label="Mở trình soạn thảo Bản gọn trong luồng"
                            onClick={() => {
                              setRichEditorModalState({
                                open: true,
                                scope: 'thread',
                                title: 'Soạn thảo phản hồi (CKEditor)',
                                initialMode: 'compact',
                              });
                            }}
                            className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-pink-500/15 active:scale-95 transition-all text-pink-400"
                          >
                            <Zap size={13} />
                          </button>
                        </Tooltip>

                        {/* [CKEditor] Button in Thread */}
                        <Tooltip title="Mở rộng trình soạn thảo CKEditor cho luồng phản hồi">
                          <button
                            type="button"
                            aria-label="Mở trình soạn thảo phong phú CKEditor trong luồng"
                            onClick={() => {
                              setRichEditorModalState({
                                open: true,
                                scope: 'thread',
                                title: 'Soạn thảo phản hồi (CKEditor)',
                                initialMode: 'split',
                              });
                            }}
                            className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-amber-500/15 active:scale-95 transition-all text-amber-500"
                          >
                            <FilePenLine size={14} />
                          </button>
                        </Tooltip>

                        <Popover
                          trigger="click"
                          placement="topRight"
                          open={openStickerPopoverKey === 'composer:thread'}
                          onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? 'composer:thread' : null)}
                          content={renderComposerEmojiPickerContent('thread')}
                        >
                          <Tooltip title="Gửi Sticker động / Meme / Emoji vào luồng">
                            <button
                              type="button"
                              aria-label="Gửi Sticker động hoặc Emoji vào luồng"
                              className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
                              style={{ color: token.colorTextSecondary }}
                            >
                              <SmilePlus size={15} />
                            </button>
                          </Tooltip>
                        </Popover>

                        <Tooltip title="Tải hình vào luồng">
                          <button
                            type="button"
                            aria-label="Tải hình vào luồng"
                            onClick={() => triggerFilePicker('thread')}
                            className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
                            style={{ color: token.colorTextSecondary }}
                          >
                            <ImagePlus size={15} />
                          </button>
                        </Tooltip>
                      </div>

                      <Tooltip title="Gửi vào luồng (Enter)">
                        <button
                          type="button"
                          aria-label="Gửi vào luồng"
                          onClick={handleSendThreadReply}
                          className="w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all shadow-sm"
                          style={{
                            background:
                              threadInput.trim() || threadAttachments.length > 0
                                ? '#d4a84b'
                                : isDark
                                  ? 'rgba(255, 255, 255, 0.08)'
                                  : 'rgba(0, 0, 0, 0.06)',
                            color:
                              threadInput.trim() || threadAttachments.length > 0 ? '#000' : token.colorTextQuaternary,
                          }}
                        >
                          <SendHorizontal size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </>
        )}
      </section>

      {/* ================= MINI DOCKED POP-OUT CHAT WINDOWS (BOTTOM RIGHT LIKE GMAIL) ================= */}
      {!isMobile && dockedConvIds.length > 0 && (
        <div
          className="mos-chat-theme-scope fixed bottom-0 right-5 flex items-end gap-2.5 z-[990]"
          style={{ pointerEvents: 'none', color: token.colorText }}
        >
          {dockedConvIds.map((cid) => {
            const conv = conversations.find((c) => c.id === cid);
            if (!conv) return null;
            const isCollapsed = Boolean(collapsedDockIds[cid]);
            const isDockPinned = (userPrefs.pinnedIds || []).includes(cid);
            const isDockManualUnread = (userPrefs.manualUnreadIds || []).includes(cid);
            const dockUnread = getEffectiveUnreadCount(conv);
            const recentMsgs = conv.messages.slice(-4);
            const dockStaged = dockAttachments[cid] || [];
            return (
              <div
                key={cid}
                data-dock-conv-id={cid}
                className="w-[312px] rounded-t-xl overflow-hidden flex flex-col shadow-2xl"
                style={{
                  background: surfaceBg,
                  border: `1px solid ${borderStrong}`,
                  borderBottom: 'none',
                  pointerEvents: 'auto',
                }}
              >
                <div
                  data-no-chat-autofocus="true"
                  onClick={() => setCollapsedDockIds((p) => ({ ...p, [cid]: !p[cid] }))}
                  className="h-9 px-2.5 flex items-center justify-between cursor-pointer"
                  style={{ background: surfaceRaised, borderBottom: `1px solid ${borderColor}` }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {conv.type === 'dm' ? (
                      renderUserAvatarNode({
                        staffId: conv.participantStaffId,
                        name: conv.name,
                        avatarUrl: conv.avatar,
                        sizeClass: 'w-5 h-5',
                        textClass: 'text-[9px]',
                        isOnline: isConversationParticipantOnline(conv),
                      })
                    ) : (
                      <Hash size={13} className="shrink-0" style={{ color: conv.color || '#10b981' }} />
                    )}
                    <span className="text-[12px] font-extrabold truncate">{conv.name}</span>
                    {isDockPinned && (
                      <Tooltip title="Đã ghim (Pinned)">
                        <Pin size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                      </Tooltip>
                    )}
                    {(dockUnread > 0 || isDockManualUnread) && (
                      <span className="inline-flex items-center justify-center px-1.5 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold tabular-nums shrink-0">
                        {dockUnread > 0 ? dockUnread : 1}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title={isDockPinned ? 'Bỏ ghim box chat' : 'Ghim box chat lên đầu mục (Pin)'}>
                      <button
                        type="button"
                        aria-label={isDockPinned ? 'Bỏ ghim box chat' : 'Ghim box chat'}
                        onClick={() => togglePinConversation(cid)}
                        className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                        style={{ color: isDockPinned ? '#d4a84b' : token.colorTextSecondary }}
                      >
                        <Pin size={12} className={isDockPinned ? 'fill-amber-400' : ''} />
                      </button>
                    </Tooltip>
                    <Tooltip
                      title={
                        dockUnread > 0 || isDockManualUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc (Mark as unread)'
                      }
                    >
                      <button
                        type="button"
                        aria-label={dockUnread > 0 || isDockManualUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
                        onClick={() => toggleManualUnreadConversation(conv)}
                        className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                        style={{
                          color: dockUnread > 0 || isDockManualUnread ? '#f43f5e' : token.colorTextSecondary,
                        }}
                      >
                        {dockUnread > 0 || isDockManualUnread ? <MailOpen size={12} /> : <Mail size={12} />}
                      </button>
                    </Tooltip>
                    <Tooltip title="Mở rộng vào Bảng Chat">
                      <button
                        type="button"
                        onClick={() => {
                          selectConversation(cid);
                          onToggle();
                        }}
                        className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <Maximize2 size={12} />
                      </button>
                    </Tooltip>
                    <Tooltip title={isCollapsed ? 'Mở rộng box chat' : 'Thu gọn box chat'}>
                      <button
                        type="button"
                        onClick={() => setCollapsedDockIds((p) => ({ ...p, [cid]: !p[cid] }))}
                        className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <Minus size={12} />
                      </button>
                    </Tooltip>
                    <Tooltip title="Đóng box chat">
                      <button
                        type="button"
                        onClick={() => setDockedConvIds((prev) => prev.filter((id) => id !== cid))}
                        className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer hover:bg-rose-500/15 hover:text-rose-400"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <X size={12} />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="h-[280px] flex flex-col" style={{ background: canvasBg }}>
                    <div
                      ref={(el) => {
                        dockMessagesContainerRefs.current[cid] = el;
                      }}
                      className="flex-1 overflow-y-auto p-2.5 space-y-2"
                    >
                      {recentMsgs.map((m) => {
                        const isDockMine = isMessageFromCurrentUser(m);
                        const dockBreakdown = isDockMine
                          ? getMessageReadBreakdown(conv, m)
                          : { seenBy: [], unseenBy: [] };
                        return (
                          <div
                            key={m.id}
                            className={`flex gap-1.5 items-start ${isDockMine ? 'flex-row-reverse' : 'flex-row'}`}
                          >
                            {renderUserAvatarNode({
                              name: m.senderName,
                              avatarUrl: m.senderAvatar,
                              sizeClass: 'w-6 h-6 mt-0.5',
                              textClass: 'text-[9.5px]',
                              bgStyle: isDockMine ? 'linear-gradient(135deg, #d4a84b 0%, #b45309 100%)' : '#2563eb',
                              textColor: isDockMine ? '#000' : '#fff',
                            })}
                            <div
                              className={`max-w-[82%] p-2 rounded-xl text-[12px] ${
                                isDockMine ? 'rounded-tr-sm' : 'rounded-tl-sm'
                              }`}
                              style={{
                                background: isDockMine ? accentSoftBg : surfaceBg,
                                border: `1px solid ${isDockMine ? accentBorder : borderColor}`,
                              }}
                            >
                              <div
                                className={`flex items-center justify-between gap-2 mb-0.5 ${
                                  isDockMine ? 'flex-row-reverse' : 'flex-row'
                                }`}
                              >
                                <span
                                  className="text-[10.5px] font-bold inline-flex items-center gap-1"
                                  style={{ color: accentColor }}
                                >
                                  <span>{m.senderName}</span>
                                  <span>·</span>
                                  <span className="tabular-nums">{m.timeLabel}</span>
                                  {isDockMine &&
                                    !m.isDeleted &&
                                    renderReadStatusCheckmark(dockBreakdown.seenBy, dockBreakdown.unseenBy, {
                                      compact: true,
                                      scopeLabel: 'Trạng thái đọc tin nhắn',
                                    })}
                                </span>
                                <Tooltip title="Tạo Task & Nhắc hẹn">
                                  <button
                                    type="button"
                                    onClick={() => openTaskModalFromMessage(m)}
                                    className="w-5 h-5 rounded inline-flex items-center justify-center cursor-pointer"
                                    style={{ color: accentColor }}
                                  >
                                    <AlarmClockPlus size={12} />
                                  </button>
                                </Tooltip>
                              </div>
                              {m.text && (
                                <div className="break-words leading-relaxed text-[12px]">
                                  {renderRichTextMessage(m.text, isDockMine)}
                                </div>
                              )}
                              {renderMessageAttachments(m.attachments, true)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="p-2" style={{ background: surfaceBg, borderTop: `1px solid ${borderColor}` }}>
                      {renderStagedAttachmentsStrip(dockStaged, 'dock', cid)}
                      <div className="flex items-center gap-1">
                        <textarea
                          ref={(el) => {
                            dockInputRefs.current[cid] = el;
                          }}
                          rows={1}
                          value={dockInputs[cid] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDockInputs((p) => ({ ...p, [cid]: val }));
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                          }}
                          onPaste={(e) => handleClipboardPaste(e, 'dock', cid)}
                          onCompositionStart={() => {
                            isComposingRef.current = true;
                          }}
                          onCompositionEnd={() => {
                            lastCompositionEndMsRef.current = Date.now();
                            setTimeout(() => {
                              isComposingRef.current = false;
                            }, 50);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              if (
                                e.nativeEvent.isComposing ||
                                isComposingRef.current ||
                                e.keyCode === 229 ||
                                Date.now() - lastCompositionEndMsRef.current < 60
                              ) {
                                return;
                              }
                              e.preventDefault();
                              const val = dockInputs[cid] || '';
                              const atts = dockAttachments[cid] || [];
                              setDockInputs((p) => ({ ...p, [cid]: '' }));
                              setDockAttachments((p) => ({ ...p, [cid]: [] }));
                              if (dockInputRefs.current[cid]) {
                                dockInputRefs.current[cid]!.style.height = 'auto';
                              }
                              handleSendMessage(cid, val, null, atts);
                            }
                          }}
                          placeholder="Nhắn nhanh... (Shift+Enter xuống dòng)"
                          className="flex-1 min-h-[28px] max-h-[80px] rounded-xl px-2.5 py-1 text-[12px] outline-none resize-none leading-relaxed"
                          style={{
                            background: surfaceRaised,
                            border: `1px solid ${borderColor}`,
                            color: token.colorText,
                          }}
                        />
                        <Popover
                          trigger="click"
                          placement="topRight"
                          open={openStickerPopoverKey === `composer:dock:${cid}`}
                          onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? `composer:dock:${cid}` : null)}
                          content={renderComposerEmojiPickerContent({ dockConvId: cid })}
                        >
                          <Tooltip title="Gửi Sticker động / Emoji">
                            <button
                              type="button"
                              aria-label="Gửi Sticker động hoặc Emoji"
                              className="w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
                              style={{ color: token.colorTextSecondary }}
                            >
                              <SmilePlus size={13} />
                            </button>
                          </Tooltip>
                        </Popover>
                        <Tooltip title="Tải hình lên">
                          <button
                            type="button"
                            onClick={() => triggerFilePicker('dock', cid)}
                            className="w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
                            style={{ color: token.colorTextSecondary }}
                          >
                            <ImagePlus size={13} />
                          </button>
                        </Tooltip>
                        <button
                          type="button"
                          onClick={() => {
                            const val = dockInputs[cid] || '';
                            const atts = dockAttachments[cid] || [];
                            setDockInputs((p) => ({ ...p, [cid]: '' }));
                            setDockAttachments((p) => ({ ...p, [cid]: [] }));
                            handleSendMessage(cid, val, null, atts);
                          }}
                          className="w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer"
                          style={{ background: accentColor, color: accentContrast }}
                        >
                          <SendHorizontal size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ================= LIVE REMINDER ALERT TOAST POPUP ================= */}
      {activeAlertTask && (
        <div
          role="alert"
          className="mos-chat-theme-scope fixed top-16 right-5 w-[356px] rounded-xl p-3.5 shadow-2xl z-[1100]"
          style={{
            background: surfaceRaised,
            border: `1.5px solid ${accentColor}`,
            color: token.colorText,
            boxShadow: 'var(--mos-shadow)',
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-[12px] font-extrabold" style={{ color: accentColor }}>
              <BellRing size={14} />
              <span>NHẮC HẸN CÔNG VIỆC</span>
            </span>
            <Tooltip title="Đóng">
              <button
                type="button"
                onClick={() => setActiveAlertTask(null)}
                className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer"
                style={{ color: token.colorTextSecondary }}
              >
                <X size={14} />
              </button>
            </Tooltip>
          </div>
          <div className="text-[13px] font-bold mb-1">{activeAlertTask.title}</div>
          <div className="text-[11px] text-slate-400 mb-2.5">
            {activeAlertTask.assigneeName} · #{activeAlertTask.conversationName}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleToggleTaskDone(activeAlertTask.id)}
              className="flex-1 h-8 rounded-lg bg-emerald-500 text-black font-extrabold text-[12px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check size={14} />
              <span>Hoàn thành</span>
            </button>
            <Tooltip title="Nhắc lại sau 10 phút (Snooze)">
              <button
                type="button"
                onClick={() => handleSnoozeTask(activeAlertTask.id, 600)}
                className="w-8 h-8 rounded-lg inline-flex items-center justify-center cursor-pointer"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                <Clock size={14} />
              </button>
            </Tooltip>
            <Tooltip title="Mở cuộc trò chuyện">
              <button
                type="button"
                onClick={() => {
                  selectConversation(activeAlertTask.conversationId);
                  setActiveAlertTask(null);
                }}
                className="w-8 h-8 rounded-lg inline-flex items-center justify-center cursor-pointer"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                <ExternalLink size={14} />
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {/* ================= MODAL: MESSAGE TO TASK -> REMINDER ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={taskModalOpen}
        zIndex={1350}
        onCancel={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onOk={handleConfirmCreateTask}
        okText={
          editingTask
            ? 'Lưu thay đổi'
            : taskRemindMode === 'preset' && selectedPresetId === 'none'
              ? 'Lưu Task'
              : 'Lưu & Hẹn giờ'
        }
        cancelText="Hủy"
        title={
          <span className="flex items-center gap-2 text-[14px] font-bold">
            {editingTask ? (
              <>
                <Pencil size={16} className="text-amber-500" />
                <span>Chỉnh Sửa Công Việc</span>
              </>
            ) : (
              <>
                <AlarmClockPlus size={16} className="text-amber-500" />
                <span>Giao Task & Hẹn Giờ Nhắc</span>
              </>
            )}
          </span>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 440}
      >
        <div className="space-y-3 py-1">
          {taskModalSourceMsg && (
            <div
              className="p-2 rounded-lg text-[11.5px]"
              style={{ background: surfaceRaised, borderLeft: '3px solid #d4a84b' }}
            >
              <strong>{taskModalSourceMsg.senderName}:</strong> &ldquo;{taskModalSourceMsg.text}&rdquo;
            </div>
          )}

          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-1">Tên công việc</div>
            <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          </div>

          {editingTask && (
            <div
              className="p-2.5 rounded-lg space-y-2.5"
              style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
            >
              <div className="text-[11px] font-bold text-slate-400">Trạng thái công việc</div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] flex items-center gap-2 font-medium">
                  <Check size={14} className={taskDoneState ? 'text-emerald-400' : 'text-slate-400'} />
                  <span>Đã hoàn thành</span>
                </span>
                <Switch checked={taskDoneState} onChange={(checked) => setTaskDoneState(checked)} size="small" />
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                <span className="text-[12px] flex items-center gap-2 font-medium">
                  <Archive size={14} className={taskArchivedState ? 'text-amber-400' : 'text-slate-400'} />
                  <span>Lưu trữ (Archived)</span>
                </span>
                <Switch
                  checked={taskArchivedState}
                  onChange={(checked) => setTaskArchivedState(checked)}
                  size="small"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1">
                Người phụ trách <span className="text-rose-400">*</span>
              </div>
              <Select
                className="w-full"
                value={taskAssignee || undefined}
                onChange={(val) => setTaskAssignee(val || '')}
                options={assigneeOptions}
                showSearch
                allowClear
                loading={assigneeOptions.length === 0}
                notFoundContent={
                  assigneeOptions.length === 0 ? 'Đang tải danh sách nhân sự...' : 'Không tìm thấy nhân sự'
                }
                getPopupContainer={(trigger) => trigger?.parentElement || document.body}
                dropdownStyle={{ zIndex: 1400 }}
                status={!taskAssignee ? 'warning' : undefined}
                placeholder="Chọn nhân sự phụ trách..."
                filterOption={(input, option) => {
                  const normInput = removeVietnameseTones(input.trim().toLowerCase());
                  if (!normInput) return true;
                  const normLabel = removeVietnameseTones(String(option?.label || '').toLowerCase());
                  const normValue = removeVietnameseTones(String(option?.value || '').toLowerCase());
                  return normLabel.includes(normInput) || normValue.includes(normInput);
                }}
              />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1">Mức ưu tiên</div>
              <Select
                className="w-full"
                value={taskPriority}
                onChange={setTaskPriority}
                options={[
                  { value: 'URGENT', label: 'Khẩn cấp' },
                  { value: 'HIGH', label: 'Quan trọng' },
                  { value: 'NORMAL', label: 'Bình thường' },
                ]}
              />
            </div>
          </div>

          {/* Deadline Section (MOS-BUG-125) */}
          <div
            className="p-2.5 rounded-lg space-y-2 text-left"
            style={{
              background: surfaceRaised,
              border: `1px solid ${taskDeadline ? 'rgba(212, 168, 75, 0.4)' : borderColor}`,
            }}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5 text-amber-500">
                <CalendarClock size={13} />
                <span>Hạn chót hoàn thành (Deadline)</span>
              </span>
              {taskDeadline && (
                <span className="text-amber-500 font-semibold tabular-nums text-[10.5px]">
                  Hạn: {taskDeadline.format('HH:mm DD/MM/YYYY')}
                </span>
              )}
            </div>

            {/* Deadline Presets */}
            <div className="grid grid-cols-3 gap-1.5">
              {DEADLINE_PRESETS.map((preset) => {
                const isSelected = taskDeadlineMode === 'preset' && selectedDeadlinePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setTaskDeadlineMode('preset');
                      setSelectedDeadlinePresetId(preset.id);
                      setTaskDeadline(preset.getDate());
                    }}
                    className="h-8 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                    style={{
                      background: isSelected ? 'rgba(212, 168, 75, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${isSelected ? '#d4a84b' : borderColor}`,
                      color: isSelected ? '#d4a84b' : token.colorText,
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}

              {/* Custom Deadline Picker Button */}
              <button
                type="button"
                onClick={() => {
                  setTaskDeadlineMode('custom');
                  if (!taskDeadline) {
                    setTaskDeadline(dayjs().hour(17).minute(30).second(0));
                  }
                }}
                className="h-8 rounded-lg text-[11px] font-bold cursor-pointer transition-colors col-span-3 flex items-center justify-center gap-1.5"
                style={{
                  background: taskDeadlineMode === 'custom' ? 'rgba(212, 168, 75, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${taskDeadlineMode === 'custom' ? '#d4a84b' : borderColor}`,
                  color: taskDeadlineMode === 'custom' ? '#d4a84b' : token.colorText,
                }}
              >
                <Calendar size={13} />
                <span>Tùy chỉnh ngày & giờ chót (Deadline)</span>
              </button>
            </div>

            {/* Custom Deadline DatePicker */}
            {taskDeadlineMode === 'custom' && (
              <div className="pt-1 space-y-1.5">
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="DD/MM/YYYY HH:mm"
                  value={taskDeadline}
                  onChange={(val) => setTaskDeadline(val)}
                  className="w-full h-8 text-[12px]"
                  placeholder="Chọn ngày và giờ hạn chót..."
                />
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-slate-400 mr-0.5">Nhanh:</span>
                  {[
                    { label: 'Hôm nay 17:30', get: () => dayjs().hour(17).minute(30).second(0) },
                    { label: 'Hôm nay 22:00', get: () => dayjs().hour(22).minute(0).second(0) },
                    { label: 'Trưa mai 12:00', get: () => dayjs().add(1, 'day').hour(12).minute(0).second(0) },
                    { label: 'Chiều mai 17:30', get: () => dayjs().add(1, 'day').hour(17).minute(30).second(0) },
                    { label: '+2 ngày', get: () => dayjs().add(2, 'day').hour(17).minute(30).second(0) },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setTaskDeadline(chip.get())}
                      className="px-2 py-0.5 rounded text-[10px] cursor-pointer hover:opacity-80 transition-opacity tabular-nums"
                      style={{
                        background: 'rgba(212, 168, 75, 0.12)',
                        color: '#d4a84b',
                        border: '1px solid rgba(212, 168, 75, 0.25)',
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Negotiation review banner in Edit modal */}
          {editingTask && taskNegotiatedDeadline && (
            <div
              className="p-2.5 rounded-lg space-y-1.5 text-left"
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1.5px dashed rgba(245, 158, 11, 0.45)',
              }}
            >
              <div className="flex items-center justify-between text-amber-500 font-bold text-[11.5px]">
                <span className="flex items-center gap-1">
                  <Handshake size={13} />
                  <span>Đề xuất dời hạn từ người nhận</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {taskNegotiatedDeadline ? dayjs(taskNegotiatedDeadline).format('HH:mm DD/MM/YYYY') : ''}
                </span>
              </div>
              {taskNegotiationNote && (
                <div className="text-[11px] italic text-slate-300 bg-black/20 p-1.5 rounded">
                  &ldquo;{taskNegotiationNote}&rdquo;
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  className="h-6 px-2.5 rounded-md text-[11px] font-bold cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm inline-flex items-center gap-1"
                  onClick={() => {
                    if (taskNegotiatedDeadline) {
                      setTaskDeadline(taskNegotiatedDeadline);
                      setTaskNegotiatedDeadline(null);
                      setTaskNegotiationNote('');
                      antdMessage.success('Đã áp dụng hạn mới từ đề xuất thương lượng!');
                    }
                  }}
                >
                  <Check size={12} strokeWidth={3} />
                  <span>Áp dụng hạn đề xuất này</span>
                </button>
                <button
                  type="button"
                  className="h-6 px-2.5 rounded-md text-[11px] font-bold cursor-pointer bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1"
                  onClick={() => {
                    setTaskNegotiatedDeadline(null);
                    setTaskNegotiationNote('');
                    antdMessage.info('Đã hủy bỏ đề xuất thương lượng');
                  }}
                >
                  <X size={12} />
                  <span>Bác bỏ đề xuất</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
              <span>Hẹn giờ nhắc (Reminder)</span>
              {taskRemindMode === 'custom' && customRemindDate && (
                <span className="text-amber-500 font-semibold tabular-nums text-[10.5px]">
                  {customRemindDate.isAfter(dayjs())
                    ? `Nhắc lúc: ${customRemindDate.format('HH:mm DD/MM')}`
                    : 'Chọn thời gian tương lai'}
                </span>
              )}
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {REMINDER_PRESETS.map((preset) => {
                const isSelected = taskRemindMode === 'preset' && selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setTaskRemindMode('preset');
                      setSelectedPresetId(preset.id);
                      setTaskRemindSeconds(preset.getSeconds());
                    }}
                    className="h-8 rounded-lg text-[11.5px] font-semibold cursor-pointer transition-colors"
                    style={{
                      background: isSelected ? 'rgba(212, 168, 75, 0.18)' : surfaceRaised,
                      border: `1px solid ${isSelected ? '#d4a84b' : borderColor}`,
                      color: isSelected ? '#d4a84b' : token.colorText,
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}

              {/* Custom Date & Time Option */}
              <button
                type="button"
                onClick={() => {
                  setTaskRemindMode('custom');
                  if (!customRemindDate) {
                    setCustomRemindDate(dayjs().add(1, 'hour').minute(0).second(0));
                  }
                }}
                className="h-8 rounded-lg text-[11.5px] font-bold cursor-pointer transition-colors col-span-3 flex items-center justify-center gap-1.5"
                style={{
                  background: taskRemindMode === 'custom' ? 'rgba(212, 168, 75, 0.18)' : surfaceRaised,
                  border: `1px solid ${taskRemindMode === 'custom' ? '#d4a84b' : borderColor}`,
                  color: taskRemindMode === 'custom' ? '#d4a84b' : token.colorText,
                }}
              >
                <Calendar size={13} />
                <span>Tùy chỉnh ngày & giờ nhắc hẹn (như ý)</span>
              </button>
            </div>

            {/* Custom Date & Time Picker */}
            {taskRemindMode === 'custom' && (
              <div
                className="p-2.5 rounded-lg space-y-2"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                <div className="flex items-center gap-2">
                  <DatePicker
                    showTime={{ format: 'HH:mm' }}
                    format="DD/MM/YYYY HH:mm"
                    value={customRemindDate}
                    onChange={(val) => setCustomRemindDate(val)}
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                    className="w-full h-8 text-[12px]"
                    placeholder="Chọn ngày và giờ nhắc hẹn..."
                  />
                </div>

                {/* Quick Add Helper Chips */}
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-[10px] text-slate-400 mr-0.5">Nhanh:</span>
                  {[
                    { label: '+10 phút', get: () => dayjs().add(10, 'minute') },
                    { label: '+30 phút', get: () => dayjs().add(30, 'minute') },
                    { label: '+1 giờ', get: () => dayjs().add(1, 'hour') },
                    { label: '+2 giờ', get: () => dayjs().add(2, 'hour') },
                    {
                      label: '17:30 hôm nay',
                      get: () => {
                        const t = dayjs().hour(17).minute(30).second(0);
                        return t.isBefore(dayjs()) ? t.add(1, 'day') : t;
                      },
                    },
                    {
                      label: '09:00 sáng mai',
                      get: () => dayjs().add(1, 'day').hour(9).minute(0).second(0),
                    },
                    {
                      label: '14:00 chiều mai',
                      get: () => dayjs().add(1, 'day').hour(14).minute(0).second(0),
                    },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setCustomRemindDate(chip.get())}
                      className="px-2 py-0.5 rounded text-[10.5px] cursor-pointer hover:opacity-80 transition-opacity tabular-nums"
                      style={{
                        background: 'rgba(212, 168, 75, 0.12)',
                        color: '#d4a84b',
                        border: '1px solid rgba(212, 168, 75, 0.25)',
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Live preview banner */}
                {customRemindDate && (
                  <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 pt-0.5">
                    <Clock size={12} className="shrink-0 text-emerald-400" />
                    <span>
                      Sẽ nhắc hẹn vào lúc{' '}
                      <strong className="text-emerald-300">{customRemindDate.format('HH:mm - DD/MM/YYYY')}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: THƯƠNG LƯỢNG DỜI HẠN CHÓT (MOS-BUG-125) ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={negotiateModalOpen}
        zIndex={1360}
        onCancel={() => {
          setNegotiateModalOpen(false);
          setNegotiatingTask(null);
        }}
        onOk={handleSubmitNegotiation}
        confirmLoading={isSubmittingNegotiation}
        okText="Gửi đề xuất dời hạn"
        cancelText="Đóng"
        title={
          <span className="flex items-center gap-2 text-[14px] font-bold text-amber-500">
            <Handshake size={16} />
            <span>Thương Lượng Dời Hạn Chót Task</span>
          </span>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 460}
      >
        <div className="space-y-3 py-1">
          {negotiatingTask && (
            <div
              className="p-2.5 rounded-lg text-[12px] space-y-1 text-left"
              style={{ background: surfaceRaised, borderLeft: '3px solid #d4a84b' }}
            >
              <div className="font-extrabold text-[13px]">{negotiatingTask.title}</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                <span>
                  Giao bởi: <strong>{negotiatingTask.creatorName || 'Hệ thống'}</strong>
                </span>
                <span>·</span>
                <span>
                  Hạn hiện tại:{' '}
                  <strong className="text-amber-400">
                    {negotiatingTask.deadline
                      ? dayjs(negotiatingTask.deadline).format('HH:mm DD/MM/YYYY')
                      : 'Chưa đặt hạn'}
                  </strong>
                </span>
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-1">
              Thời hạn đề xuất dời sang <span className="text-rose-400">*</span>
            </div>
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              value={negotiateProposedDeadline}
              onChange={(val) => setNegotiateProposedDeadline(val)}
              className="w-full h-9 text-[12px]"
              placeholder="Chọn ngày và giờ bạn xin dời hạn..."
            />
            {/* Quick helper chips */}
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              <span className="text-[10px] text-slate-400 mr-0.5">Gợi ý:</span>
              {[
                { label: '+2 giờ', get: () => dayjs().add(2, 'hour') },
                {
                  label: '17:30 hôm nay',
                  get: () => {
                    const t = dayjs().hour(17).minute(30).second(0);
                    return t.isBefore(dayjs()) ? t.add(1, 'day') : t;
                  },
                },
                {
                  label: '22:00 hôm nay',
                  get: () => {
                    const t = dayjs().hour(22).minute(0).second(0);
                    return t.isBefore(dayjs()) ? t.add(1, 'day') : t;
                  },
                },
                { label: '12:00 trưa mai', get: () => dayjs().add(1, 'day').hour(12).minute(0).second(0) },
                { label: '17:30 chiều mai', get: () => dayjs().add(1, 'day').hour(17).minute(30).second(0) },
                { label: '+2 ngày', get: () => dayjs().add(2, 'day').hour(17).minute(30).second(0) },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setNegotiateProposedDeadline(chip.get())}
                  className="px-2 py-0.5 rounded text-[10.5px] cursor-pointer hover:opacity-80 transition-opacity tabular-nums"
                  style={{
                    background: 'rgba(212, 168, 75, 0.12)',
                    color: '#d4a84b',
                    border: '1px solid rgba(212, 168, 75, 0.25)',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-1">
              Lý do / Giải trình đề xuất dời hạn <span className="text-rose-400">*</span>
            </div>
            <Input.TextArea
              rows={3}
              value={negotiateReason}
              onChange={(e) => setNegotiateReason(e.target.value)}
              placeholder="VD: Đang xử lý khẩn cấp khách VIP tại quầy, xin dời hạn sang 22:00 tối nay..."
            />
          </div>

          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 leading-relaxed text-left">
            💡 Khi gửi đề xuất, người giao việc ({negotiatingTask?.creatorName || 'người tạo'}) sẽ nhận được thông báo
            để xét duyệt hoặc phản hồi trao đổi.
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: CHUYỂN VÀO mOS MISSION (1-CLICK DISPATCH) ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={missionModalOpen && isStrictDannySuperAdmin}
        zIndex={1360}
        onCancel={() => !isDispatchingMission && setMissionModalOpen(false)}
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400 text-left leading-snug min-w-0">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/15 text-amber-400 shrink-0 text-[10px]">
                ⚡
              </span>
              <span className="truncate">
                Tự động duyệt <strong className="text-slate-200 font-semibold">Cổng 1</strong> & đồng bộ 2 chiều ngay
                trong luồng Chat
              </span>
            </div>
            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={isDispatchingMission}
                onClick={() => setMissionModalOpen(false)}
                className="h-9 px-3.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center justify-center cursor-pointer transition-all hover:opacity-90 shrink-0 whitespace-nowrap"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}`, color: token.colorText }}
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={isDispatchingMission || !missionTitle.trim()}
                onClick={() => void handleConfirmDispatchMission()}
                className="h-9 px-4 rounded-lg text-[12.5px] font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all hover:brightness-105 disabled:opacity-50 shrink-0 whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#04130d',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                }}
              >
                {isDispatchingMission ? (
                  <Loader2 size={14} className="animate-spin shrink-0" />
                ) : (
                  <Rocket size={15} className="shrink-0" />
                )}
                <span>{isDispatchingMission ? 'Đang chuyển sang mOS Mission...' : 'Chuyển vào mOS Mission'}</span>
              </button>
            </div>
          </div>
        }
        title={
          <div className="flex items-center justify-between gap-2 pr-6 flex-wrap">
            <span className="inline-flex items-center gap-2 text-[15px] font-extrabold">
              <span
                className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(167, 139, 250, 0.16)',
                  border: '1px solid rgba(167, 139, 250, 0.35)',
                  color: '#c4b5fd',
                }}
              >
                <Rocket size={15} />
              </span>
              <span>Chuyển vào mOS Mission</span>
            </span>
            <span
              className="inline-flex items-center justify-center leading-none gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold"
              style={{
                background: 'rgba(16, 185, 129, 0.14)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#34d399',
              }}
            >
              <span>Đích kế tiếp: mOS Mission · Cổng 1</span>
            </span>
          </div>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 560}
      >
        <div className="space-y-3.5 py-1.5">
          {/* Next Destination Flow Banner */}
          <div
            className="px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-[11px]"
            style={{
              background: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(248, 250, 252, 0.95)',
              border: `1px solid ${borderColor}`,
            }}
          >
            <div className="flex items-center gap-1.5 font-semibold text-slate-400 min-w-0">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold shrink-0">
                1
              </span>
              <span className="truncate">Luồng mOS Chat</span>
            </div>
            <span className="text-slate-500 shrink-0">→</span>
            <div className="flex items-center gap-1.5 font-extrabold text-emerald-400 min-w-0">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">
                2
              </span>
              <span className="truncate">mOS Mission (Cổng 1)</span>
            </div>
            <span className="text-slate-500 shrink-0">→</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-400 min-w-0">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0">
                3
              </span>
              <span className="truncate">Xử lý & Nghiệm thu</span>
            </div>
          </div>

          {missionSourceMsg && (
            <div
              className="p-3 rounded-xl text-[12px] space-y-1.5"
              style={{
                background: surfaceRaised,
                border: `1px solid ${borderStrong}`,
                borderLeft: '3.5px solid #a78bfa',
              }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-bold text-purple-300 inline-flex items-center gap-1.5">
                  <span>📦 Gói ngữ cảnh từ {missionSourceMsg.senderName}</span>
                </span>
                <span
                  className="inline-flex items-center justify-center leading-none px-2 py-1 rounded-md text-[10.5px] font-bold tabular-nums"
                  style={{
                    background: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
                    color: token.colorTextSecondary,
                  }}
                >
                  {1 + (missionSourceMsg.thread?.length || 0)} tin nhắn ·{' '}
                  {(missionSourceMsg.attachments?.length || 0) +
                    (missionSourceMsg.thread || []).reduce((acc, r) => acc + (r.attachments?.length || 0), 0)}{' '}
                  hình ảnh
                </span>
              </div>
              <div className="text-[11.5px] opacity-90 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                &ldquo;{missionSourceMsg.text}&rdquo;
              </div>
            </div>
          )}

          <div>
            <div className="text-[11.5px] font-bold text-slate-300 mb-1.5">Tiêu đề Ticket trên mOS Mission</div>
            <Input
              value={missionTitle}
              onChange={(e) => setMissionTitle(e.target.value)}
              placeholder="Nhập tiêu đề nhiệm vụ chuyển vào mOS Mission..."
            />
          </div>

          <div>
            <div className="text-[11.5px] font-bold text-slate-300 mb-1.5">Phân loại nhiệm vụ</div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { key: 'FEATURE' as const, label: '✨ Tính năng / Nâng cấp mới', color: '#a78bfa' },
                { key: 'BUG' as const, label: '🐞 Sửa lỗi vận hành (Bug)', color: '#f43f5e' },
              ].map((opt) => {
                const active = missionType === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setMissionType(opt.key)}
                    className="h-9 px-3 rounded-lg text-[12px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
                    style={{
                      background: active ? `${opt.color}22` : surfaceRaised,
                      border: `1.5px solid ${active ? opt.color : borderColor}`,
                      color: active ? opt.color : token.colorText,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[11.5px] font-bold text-slate-300 mb-1.5">
              Chỉ đạo / Ghi chú triển khai cho mOS Mission (Tuỳ chọn)
            </div>
            <Input.TextArea
              rows={2}
              value={missionNote}
              onChange={(e) => setMissionNote(e.target.value)}
              placeholder="VD: Áp dụng đúng quy chuẩn Combo Elsa của Bảo Hân, giữ nguyên layout bảng..."
            />
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: CREATE NEW SPACE OR DM ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={newRoomModalOpen}
        zIndex={1350}
        onCancel={() => {
          setNewRoomModalOpen(false);
          setRoomSearchQuery('');
          setRoomGroupFilter('ALL');
          setSelectedMemberIds([]);
        }}
        footer={
          newRoomType === 'space' ? (
            <div className="flex items-center justify-between pt-2">
              <span className="text-[12px] text-slate-400 font-medium tabular-nums">
                Đã chọn: <strong className="text-emerald-500">{selectedMemberIds.length}</strong> thành viên
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewRoomModalOpen(false);
                    setRoomSearchQuery('');
                    setRoomGroupFilter('ALL');
                    setSelectedMemberIds([]);
                    setNewRoomEmoji('');
                    setNewRoomColor('#1a73e8');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ background: surfaceRaised, border: `1px solid ${borderColor}`, color: token.colorText }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreateSpace}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer"
                  style={{ background: '#3b82f6' }}
                >
                  Tạo Space
                </button>
              </div>
            </div>
          ) : null
        }
        title={
          <span className="text-[15px] font-extrabold flex items-center gap-2">
            {newRoomType === 'space' ? (
              <>
                <Hash size={18} className="text-blue-500" />
                <span>Tạo Không gian làm việc mới (Space)</span>
              </>
            ) : (
              <>
                <MessageSquare size={18} className="text-emerald-500" />
                <span>Bắt đầu cuộc trò chuyện 1-1</span>
              </>
            )}
          </span>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 520}
      >
        {newRoomType === 'dm' ? (
          <div className="space-y-3 py-2">
            {/* Search Input */}
            <Input
              prefix={<Search size={14} className="text-slate-400 mr-1" />}
              value={roomSearchQuery}
              onChange={(e) => setRoomSearchQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc username đồng nghiệp..."
              allowClear
            />

            {/* Quick Department / Team Filter Pills for 1-1 Directory */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setRoomGroupFilter('ALL')}
                className="px-2 py-1 rounded-full text-[10.5px] font-bold shrink-0 cursor-pointer transition-colors"
                style={{
                  background: roomGroupFilter === 'ALL' ? '#3b82f6' : surfaceRaised,
                  color: roomGroupFilter === 'ALL' ? '#ffffff' : token.colorTextSecondary,
                  border: `1px solid ${roomGroupFilter === 'ALL' ? '#3b82f6' : borderColor}`,
                }}
              >
                Tất cả ({staffDirectory.length})
              </button>
              {SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((grp) => {
                const count = staffDirectory.filter((m) => matchesStaffGroup(m, grp.key)).length;
                if (count === 0) return null;
                const active = roomGroupFilter === grp.key;
                return (
                  <button
                    key={grp.key}
                    type="button"
                    onClick={() => setRoomGroupFilter(active ? 'ALL' : grp.key)}
                    className="px-2 py-1 rounded-full text-[10.5px] font-bold shrink-0 cursor-pointer transition-colors"
                    style={{
                      background: active ? `${grp.color}28` : surfaceRaised,
                      color: active ? grp.color : token.colorTextSecondary,
                      border: `1px solid ${active ? grp.color : borderColor}`,
                    }}
                  >
                    {grp.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Self Chat Option ("Chat với chính tôi") */}
            <div
              onClick={handleSelectSelfChat}
              className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors border"
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                borderColor: 'rgba(99, 102, 241, 0.28)',
              }}
            >
              {renderUserAvatarNode({
                name: currentUser?.displayName || currentUser?.username || 'Tôi',
                avatarUrl: currentUser?.avatarUrl,
                staffId: currentUser?.id ? Number(currentUser.id) : null,
                sizeClass: 'w-10 h-10',
                textClass: 'text-[13px]',
                bgStyle: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                onlineDot: presence === 'active',
              })}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[13px] text-indigo-400">
                    {currentUser?.displayName || currentUser?.username || 'Tôi'} (Bạn)
                  </span>
                  <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[9.5px] font-extrabold bg-indigo-500/20 text-indigo-400">
                    Ghi chú cho tôi
                  </span>
                </div>
                <div className="text-[11.5px] text-slate-400 truncate mt-0.5">
                  Lưu trữ tin nhắn, ảnh, tài liệu và tạo task nhắc hẹn riêng tư
                </div>
              </div>
            </div>

            {/* Colleagues List */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                Danh bạ đồng nghiệp ({staffDirectory.length})
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                {staffDirectory
                  .filter((m) => {
                    if (Number(m.id) === Number(currentUser?.id)) return false;
                    if (roomGroupFilter !== 'ALL' && !matchesStaffGroup(m, roomGroupFilter)) return false;
                    if (!roomSearchQuery.trim()) return true;
                    const q = removeVietnameseTones(roomSearchQuery.trim().toLowerCase());
                    const name = removeVietnameseTones((m.displayName || '').toLowerCase());
                    const user = removeVietnameseTones((m.username || '').toLowerCase());
                    const role = removeVietnameseTones((m.role || '').toLowerCase());
                    return name.includes(q) || user.includes(q) || role.includes(q);
                  })
                  .map((m) => {
                    const isAdm = m.role?.toLowerCase().includes('admin');
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleSelectColleague(m)}
                        className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-500/10"
                        style={{ border: `1px solid ${borderColor}` }}
                      >
                        {renderUserAvatarNode({
                          name: m.displayName || m.username,
                          avatarUrl: m.avatarUrl,
                          staffId: m.id,
                          sizeClass: 'w-8 h-8',
                          textClass: 'text-xs',
                          bgStyle: isAdm ? '#a855f7' : '#3b82f6',
                          onlineDot: Boolean(m.isOnline),
                        })}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[12.5px] truncate">{m.displayName || m.username}</span>
                            <span
                              className="text-[9.5px] font-bold px-1.5 py-0.5 rounded leading-none shrink-0"
                              style={{
                                background: isAdm ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: isAdm ? '#c084fc' : '#60a5fa',
                              }}
                            >
                              {m.role || 'Nhân sự'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">@{m.username}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                Biểu tượng Emoji & Màu sắc Space
              </div>
              <MosChatSpaceEmojiColorPicker
                selectedEmoji={newRoomEmoji}
                selectedColor={newRoomColor}
                spaceName={newRoomName}
                onEmojiChange={setNewRoomEmoji}
                onColorChange={setNewRoomColor}
                size="large"
              />
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1">Tên Không gian (Space) *</div>
              <Input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="VD: ke-hoach-tuan-moi, chien-dich-tet"
              />
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1">Mục đích hoạt động (Tùy chọn)</div>
              <Input
                value={newRoomSubtitle}
                onChange={(e) => setNewRoomSubtitle(e.target.value)}
                placeholder="VD: Không gian trao đổi ban quản trị và trưởng bộ phận"
              />
            </div>

            {/* ================= 1-CLICK DEPARTMENT & TEAM / GROUP SELECTOR ================= */}
            <div
              className="p-2.5 rounded-xl space-y-2"
              style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={13} />
                  <span>Chọn nhanh theo Bộ phận (Department) & Nhóm</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedMemberIds(staffDirectory.map((s) => s.id))}
                    className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 cursor-pointer"
                  >
                    Chọn tất cả ({staffDirectory.length})
                  </button>
                  {selectedMemberIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const myId = Number(currentUser?.id);
                        setSelectedMemberIds(myId ? [myId] : []);
                      }}
                      className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
              </div>

              {/* Row 1: 4 Core Departments */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1">Bộ phận (Department):</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter((g) => g.category === 'department').map((dept) => {
                    const deptMembers = staffDirectory.filter((m) => matchesStaffGroup(m, dept.key));
                    const total = deptMembers.length;
                    const selectedCount = deptMembers.filter((m) => selectedMemberIds.includes(m.id)).length;
                    const isAllSelected = total > 0 && selectedCount === total;
                    const isPartial = selectedCount > 0 && selectedCount < total;

                    return (
                      <button
                        key={dept.key}
                        type="button"
                        onClick={() => handleToggleDepartmentOrTeam(dept)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-all"
                        style={{
                          background: isAllSelected ? `${dept.color}24` : isPartial ? `${dept.color}12` : canvasBg,
                          border: `1px solid ${isAllSelected || isPartial ? dept.color : borderColor}`,
                        }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-white"
                            style={{
                              background: isAllSelected || isPartial ? dept.color : 'transparent',
                              border: `1px solid ${isAllSelected || isPartial ? dept.color : '#64748b'}`,
                            }}
                          >
                            {isAllSelected ? (
                              <Check size={10} strokeWidth={3} />
                            ) : isPartial ? (
                              <Minus size={10} strokeWidth={3} />
                            ) : null}
                          </span>
                          <span className="text-[11.5px] font-bold truncate" style={{ color: token.colorText }}>
                            {dept.label}
                          </span>
                        </div>
                        <span
                          className="text-[10.5px] font-extrabold tabular-nums ml-1.5 shrink-0"
                          style={{ color: isAllSelected || isPartial ? dept.color : token.colorTextSecondary }}
                        >
                          {selectedCount}/{total}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: 8 Specialized Teams / Role Groups */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1">Nhóm chuyên môn (Team / Chức danh):</div>
                <div className="flex flex-wrap gap-1.5">
                  {SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter((g) => g.category === 'team').map((team) => {
                    const teamMembers = staffDirectory.filter((m) => matchesStaffGroup(m, team.key));
                    const total = teamMembers.length;
                    if (total === 0) return null;
                    const selectedCount = teamMembers.filter((m) => selectedMemberIds.includes(m.id)).length;
                    const isAllSelected = total > 0 && selectedCount === total;
                    const isPartial = selectedCount > 0 && selectedCount < total;

                    return (
                      <button
                        key={team.key}
                        type="button"
                        onClick={() => handleToggleDepartmentOrTeam(team)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all"
                        style={{
                          background: isAllSelected ? `${team.color}28` : isPartial ? `${team.color}14` : canvasBg,
                          border: `1px solid ${isAllSelected || isPartial ? team.color : borderColor}`,
                          color: isAllSelected || isPartial ? team.color : token.colorText,
                        }}
                      >
                        {isAllSelected && <Check size={11} strokeWidth={3} />}
                        <span>{team.label}</span>
                        <span className="text-[10px] opacity-80 tabular-nums">
                          ({selectedCount}/{total})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Chọn thành viên tham gia nhóm
                </span>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {selectedMemberIds.length}/{staffDirectory.length} người
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <Input
                  prefix={<Search size={13} className="text-slate-400 mr-1" />}
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  placeholder="Tìm thành viên..."
                  size="small"
                  className="flex-1"
                  allowClear
                />
                <Select
                  size="small"
                  value={roomGroupFilter}
                  onChange={setRoomGroupFilter}
                  className="w-44"
                  options={[
                    { value: 'ALL', label: `Tất cả bộ phận (${staffDirectory.length})` },
                    ...SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((g) => ({
                      value: g.key,
                      label: `${g.label} (${staffDirectory.filter((m) => matchesStaffGroup(m, g.key)).length})`,
                    })),
                  ]}
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {staffDirectory
                  .filter((m) => {
                    if (roomGroupFilter !== 'ALL' && !matchesStaffGroup(m, roomGroupFilter)) return false;
                    if (!roomSearchQuery.trim()) return true;
                    const q = removeVietnameseTones(roomSearchQuery.trim().toLowerCase());
                    const name = removeVietnameseTones((m.displayName || '').toLowerCase());
                    const user = removeVietnameseTones((m.username || '').toLowerCase());
                    const role = removeVietnameseTones((m.role || '').toLowerCase());
                    return name.includes(q) || user.includes(q) || role.includes(q);
                  })
                  .map((m) => {
                    const isSelected = selectedMemberIds.includes(m.id);
                    const isMe = Number(m.id) === Number(currentUser?.id);
                    const isAdm = m.role?.toLowerCase().includes('admin');
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (isMe) return;
                          setSelectedMemberIds((prev) =>
                            prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                          );
                        }}
                        className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors border ${
                          isSelected ? 'border-blue-500/50 bg-blue-500/10' : 'border-transparent hover:bg-slate-500/10'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border text-white shrink-0 ${
                            isSelected || isMe ? 'bg-blue-500 border-blue-500' : 'border-slate-400'
                          }`}
                        >
                          {(isSelected || isMe) && <Check size={11} strokeWidth={3} />}
                        </div>
                        {renderUserAvatarNode({
                          name: m.displayName || m.username,
                          avatarUrl: m.avatarUrl,
                          staffId: m.id,
                          sizeClass: 'w-6 h-6',
                          textClass: 'text-[10px]',
                          bgStyle: isAdm ? '#a855f7' : '#3b82f6',
                          onlineDot: Boolean(m.isOnline),
                        })}
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <span className="text-xs font-semibold truncate">
                            {m.displayName || m.username} {isMe && '(Bạn - Trưởng nhóm)'}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1 shrink-0">{m.role}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL: SPACE MEMBERS MANAGEMENT (GOOGLE CHAT WORKSPACE STYLE) ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={spaceMembersModalOpen}
        zIndex={1350}
        onCancel={() => setSpaceMembersModalOpen(false)}
        footer={null}
        title={
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-500" />
            <span className="text-[15px] font-extrabold">Thành viên Không gian · #{activeConversation?.name}</span>
          </div>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 520}
      >
        <div className="space-y-4 py-2">
          {/* Add member section */}
          <div className="p-3 rounded-xl border space-y-2.5" style={{ background: surfaceRaised, borderColor }}>
            <div className="text-[11.5px] font-bold text-slate-300 flex items-center gap-1.5">
              <UserPlus size={14} className="text-emerald-500" />
              <span>Thêm thành viên hoặc cả Bộ phận / Nhóm vào Không gian</span>
            </div>
            <div className="flex items-center gap-2">
              <Select
                showSearch
                className="flex-1"
                placeholder="Chọn đồng nghiệp để thêm..."
                value={addMemberSelectedStaffId}
                onChange={setAddMemberSelectedStaffId}
                filterOption={(input, option) => {
                  const normInput = removeVietnameseTones(input.trim().toLowerCase());
                  if (!normInput) return true;
                  const normLabel = removeVietnameseTones(String(option?.label || '').toLowerCase());
                  return normLabel.includes(normInput);
                }}
                options={staffDirectory
                  .filter((s) => !activeConversation?.memberIds?.includes(s.id))
                  .map((s) => ({
                    value: s.id,
                    label: `${s.displayName || s.username} (${s.role || 'NV'})`,
                  }))}
              />
              <button
                type="button"
                disabled={!addMemberSelectedStaffId}
                onClick={async () => {
                  if (addMemberSelectedStaffId) {
                    await handleAddMemberToSpace(addMemberSelectedStaffId);
                    setAddMemberSelectedStaffId(null);
                  }
                }}
                className="h-8 px-3 rounded-lg text-xs font-bold text-white transition-opacity disabled:opacity-40 cursor-pointer"
                style={{ background: '#10b981' }}
              >
                Thêm
              </button>
            </div>

            {/* 1-Click Add Entire Department / Team into Existing Space */}
            <div className="pt-1 border-t" style={{ borderColor }}>
              <div className="text-[10.5px] font-bold text-slate-400 mb-1.5">
                Thêm nhanh cả Bộ phận (Department) / Nhóm:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((grp) => {
                  const existingSet = new Set(activeConversation?.memberIds || []);
                  const missingCount = staffDirectory.filter(
                    (m) => matchesStaffGroup(m, grp.key) && !existingSet.has(m.id)
                  ).length;
                  if (missingCount === 0) return null;
                  return (
                    <button
                      key={grp.key}
                      type="button"
                      onClick={() => handleBulkAddGroupToSpace(grp)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] font-bold cursor-pointer transition-all hover:opacity-90"
                      style={{
                        background: `${grp.color}18`,
                        border: `1px solid ${grp.color}66`,
                        color: grp.color,
                      }}
                    >
                      <Plus size={11} />
                      <span>{grp.label}</span>
                      <span className="tabular-nums opacity-85">(+{missingCount})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Current members list */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Danh sách thành viên hiện tại</span>
              <span className="text-emerald-400 font-extrabold tabular-nums">
                {activeConversation?.memberCount || activeConversation?.memberIds?.length || 1} người
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {staffDirectory
                .filter(
                  (s) =>
                    activeConversation?.memberIds?.includes(s.id) ||
                    activeConversation?.members?.some((m) => m.id === s.id)
                )
                .map((m) => {
                  const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
                  const isMe = Number(m.id) === myStaffId;
                  const isAdm =
                    isDannyAccount || (currentUser?.role && currentUser.role.toLowerCase().includes('admin'));
                  const canEditNick = isMe || isAdm;
                  const nick = activeConversation?.memberNicknames?.[String(m.id)];
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-lg border transition-colors gap-2"
                      style={{ background: surfaceRaised, borderColor }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {renderUserAvatarNode({
                          name: nick || m.displayName || m.username,
                          avatarUrl: m.avatarUrl,
                          staffId: m.id,
                          sizeClass: 'w-8 h-8',
                          textClass: 'text-xs',
                          bgStyle: isAdm ? '#a855f7' : '#3b82f6',
                          onlineDot: Boolean(m.isOnline),
                        })}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {nick ? (
                              <>
                                <span className="font-extrabold text-[12.5px] text-emerald-400 truncate">{nick}</span>
                                <span className="text-[11px] text-slate-400 truncate font-normal">
                                  ({m.displayName || m.username})
                                </span>
                              </>
                            ) : (
                              <span className="font-bold text-[12.5px] truncate">{m.displayName || m.username}</span>
                            )}
                            {isMe && (
                              <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <span>{m.role || 'Nhân sự'}</span>
                            {nick && <span className="text-emerald-500/80 font-medium">· Đã đặt biệt danh</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {canEditNick && (
                          <Tooltip
                            title={
                              isMe
                                ? 'Đổi biệt danh của bạn trong Không gian này'
                                : `Đổi biệt danh cho ${m.displayName || m.username}`
                            }
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenNicknameModal(m.id)}
                              className="h-7 px-2 rounded-md inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:bg-amber-500/10 cursor-pointer transition-colors"
                            >
                              <Pencil size={11} />
                              <span>{nick ? 'Sửa biệt danh' : 'Đặt biệt danh'}</span>
                            </button>
                          </Tooltip>
                        )}

                        {/* Remove button */}
                        {!isMe && (
                          <Popconfirm
                            title="Xóa thành viên"
                            description={`Bạn có chắc muốn xóa ${m.displayName || m.username} khỏi Không gian này?`}
                            onConfirm={() => handleRemoveMemberFromSpace(m.id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <button
                              type="button"
                              aria-label={`Xóa ${m.displayName || m.username} khỏi nhóm`}
                              className="h-7 px-2 rounded-md inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                            >
                              <UserMinus size={13} />
                              <span>Xóa</span>
                            </button>
                          </Popconfirm>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: SPACE CONFIGURATION & EMOJI SELECTION (MOS-BUG-140) ================= */}
      <MosChatSpaceConfigModal
        open={spaceConfigModalOpen}
        conversation={activeConversation}
        onClose={() => setSpaceConfigModalOpen(false)}
        onUpdated={(updatedConv) => {
          setConversations((prev) =>
            prev.map((c) => (c.id === updatedConv.id ? { ...c, ...updatedConv } : c))
          );
          notifyLivePeers();
        }}
        onOpenMembersModal={() => setSpaceMembersModalOpen(true)}
      />

      {/* ================= MODAL: EDIT MEMBER NICKNAME IN GROUP (PER-SPACE NICKNAMES) ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={Boolean(editingNicknameTarget)}
        zIndex={1400}
        onCancel={() => {
          if (!isUpdatingNickname) {
            setEditingNicknameTarget(null);
            setNicknameInputVal('');
          }
        }}
        footer={null}
        width={420}
        title={
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-amber-500" />
            <span className="text-[14.5px] font-extrabold">
              {editingNicknameTarget?.isMe
                ? 'Đổi biệt danh của bạn'
                : `Đổi biệt danh cho ${editingNicknameTarget?.displayName || 'thành viên'}`}
            </span>
          </div>
        }
      >
        <div className="py-2 space-y-3">
          <div className="text-[12px] text-slate-400">
            Biệt danh này chỉ áp dụng riêng cho Không gian{' '}
            <strong className="text-amber-500 font-bold">#{activeConversation?.name}</strong>. Mọi người trong nhóm sẽ
            thấy tên này và có thể tag bạn bằng biệt danh này.
          </div>

          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-300">Biệt danh trong nhóm:</label>
            <Input
              autoFocus
              placeholder="Nhập biệt danh (VD: Danny Cực Chill, Bé Hoa Lash...)"
              value={nicknameInputVal}
              maxLength={40}
              onChange={(e) => setNicknameInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveNickname();
                }
              }}
              disabled={isUpdatingNickname}
            />
            <div className="text-[10.5px] text-slate-500 flex justify-between pt-0.5">
              <span>Để trống và bấm Lưu nếu muốn quay lại tên thật ban đầu.</span>
              <span className="tabular-nums">{nicknameInputVal.length}/40</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor }}>
            {editingNicknameTarget?.currentNickname && (
              <button
                type="button"
                disabled={isUpdatingNickname}
                onClick={() => handleSaveNickname('')}
                className="h-8 px-3 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors mr-auto"
              >
                Gỡ biệt danh
              </button>
            )}
            <button
              type="button"
              disabled={isUpdatingNickname}
              onClick={() => {
                setEditingNicknameTarget(null);
                setNicknameInputVal('');
              }}
              className="h-8 px-3 rounded-lg text-xs font-bold text-slate-400 hover:bg-white/5 cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isUpdatingNickname}
              onClick={() => handleSaveNickname(nicknameInputVal)}
              className="h-8 px-4 rounded-lg text-xs font-bold text-black transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
              style={{ background: '#d4a84b' }}
            >
              {isUpdatingNickname ? 'Đang lưu...' : 'Lưu biệt danh'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: ATTACH IMAGE FROM GOOGLE DRIVE / LOCAL DRIVE ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={driveLinkModalOpen}
        zIndex={1350}
        onCancel={() => setDriveLinkModalOpen(false)}
        onOk={handleConfirmDriveLink}
        okText="Đính kèm hình Drive"
        cancelText="Đóng"
        title={
          <span className="flex items-center gap-2 text-[14px] font-bold">
            <HardDrive size={16} className="text-amber-500" />
            <span>Tải hình từ Google Drive / Ổ đĩa</span>
          </span>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 430}
      >
        <div className="space-y-3 py-1">
          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-1">
              Cách 1: Dán đường dẫn hình ảnh trên Google Drive
            </div>
            <Input
              value={driveLinkInput}
              onChange={(e) => setDriveLinkInput(e.target.value)}
              onPressEnter={handleConfirmDriveLink}
              placeholder="https://drive.google.com/file/d/..."
            />
          </div>

          <div className="pt-1">
            <div className="text-[11px] font-bold text-slate-400 mb-1.5">
              Cách 2: Chọn tệp hình từ Google Drive Desktop / Máy tính
            </div>
            <button
              type="button"
              onClick={() => {
                setDriveLinkModalOpen(false);
                const target = uploadTargetRef.current;
                triggerFilePicker(target.scope, target.convId);
              }}
              className="w-full h-9 rounded-lg inline-flex items-center justify-center gap-2 text-[12px] font-bold cursor-pointer"
              style={{
                background: surfaceRaised,
                border: `1px dashed ${borderStrong}`,
                color: '#d4a84b',
              }}
            >
              <ImagePlus size={15} />
              <span>Chọn tệp ảnh từ Ổ đĩa / Google Drive...</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MOS CHAT & MAI COPILOT ACCESS CONTROL MODAL (DEPARTMENT / TEAM / INDIVIDUAL) ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={accessConfigModalOpen}
        zIndex={1350}
        onCancel={() => setAccessConfigModalOpen(false)}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 680}
        destroyOnClose
        title={
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2 text-[14px] font-extrabold">
              <ShieldCheck size={17} className="text-violet-400" />
              <span>Phân quyền truy cập mOS Chat & mOS AI (MAI)</span>
            </div>
            {savingAccessConfig && (
              <span className="text-[11px] font-bold text-amber-400 animate-pulse">Đang lưu cấu hình...</span>
            )}
          </div>
        }
      >
        {(() => {
          const isChatTab = accessConfigTab === 'chat';
          const activeGroupKeys = isChatTab
            ? accessConfig.allowedGroupKeys || []
            : accessConfig.aiCopilotAllowedGroupKeys || [];
          const activeStaffIds = isChatTab
            ? accessConfig.allowedStaffIds || []
            : accessConfig.aiCopilotAllowedStaffIds || [];

          const toggleGroupKey = (groupKey: string) => {
            const exists = activeGroupKeys.includes(groupKey);
            const nextGroups = exists ? activeGroupKeys.filter((k) => k !== groupKey) : [...activeGroupKeys, groupKey];
            if (isChatTab) {
              void persistAccessConfig(
                {
                  ...accessConfig,
                  allowAllStaff: false,
                  allowedGroupKeys: nextGroups,
                },
                true
              );
            } else {
              void persistAccessConfig(
                {
                  ...accessConfig,
                  aiCopilotAllowedGroupKeys: nextGroups,
                },
                true
              );
            }
          };

          const toggleIndividualStaff = (staffId: number) => {
            if (!staffId || staffId <= 0) return;
            const exists = activeStaffIds.includes(staffId);
            const nextStaffIds = exists ? activeStaffIds.filter((id) => id !== staffId) : [...activeStaffIds, staffId];
            if (isChatTab) {
              void persistAccessConfig(
                {
                  ...accessConfig,
                  allowedStaffIds: nextStaffIds,
                },
                true
              );
            } else {
              void persistAccessConfig(
                {
                  ...accessConfig,
                  aiCopilotAllowedStaffIds: nextStaffIds,
                },
                true
              );
            }
          };

          const totalAllowedCount = staffDirectory.filter((m) =>
            isChatTab
              ? isStaffMemberAllowedInChat(m, accessConfig).allowed
              : isStaffMemberAllowedInAi(m, accessConfig).allowed
          ).length;

          const q = removeVietnameseTones(accessStaffSearch.trim().toLowerCase());
          const filteredStaffForAccess = staffDirectory.filter((m) => {
            if (accessGroupFilter === 'ALLOWED_ONLY') {
              const allowed = isChatTab
                ? isStaffMemberAllowedInChat(m, accessConfig).allowed
                : isStaffMemberAllowedInAi(m, accessConfig).allowed;
              if (!allowed) return false;
            } else if (accessGroupFilter === 'INDIVIDUAL_ONLY') {
              if (!activeStaffIds.includes(m.id)) return false;
            } else if (accessGroupFilter !== 'ALL') {
              if (!matchesStaffGroup(m, accessGroupFilter)) return false;
            }
            if (!q) return true;
            const hay = removeVietnameseTones(`${m.displayName} ${m.username} ${m.role}`.toLowerCase());
            return hay.includes(q);
          });

          return (
            <div className="space-y-3.5 pt-2">
              {/* Top Mode Switcher: mOS Chat Access vs mOS AI (MAI) Access */}
              <div
                className="grid grid-cols-2 gap-2 p-1 rounded-xl"
                style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
              >
                <button
                  type="button"
                  onClick={() => setAccessConfigTab('chat')}
                  className="h-9 rounded-lg px-3 flex items-center justify-center gap-2 text-[12px] font-extrabold cursor-pointer transition-all"
                  style={{
                    background: isChatTab ? 'linear-gradient(135deg, #d4a84b, #b8860b)' : 'transparent',
                    color: isChatTab ? '#090d16' : token.colorTextSecondary,
                  }}
                >
                  <MessageSquare size={14} />
                  <span>
                    Quyền vào mOS Chat (
                    {staffDirectory.filter((m) => isStaffMemberAllowedInChat(m, accessConfig).allowed).length}/
                    {staffDirectory.length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccessConfigTab('ai')}
                  className="h-9 rounded-lg px-3 flex items-center justify-center gap-2 text-[12px] font-extrabold cursor-pointer transition-all"
                  style={{
                    background: !isChatTab ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent',
                    color: !isChatTab ? '#ffffff' : token.colorTextSecondary,
                  }}
                >
                  <Bot size={15} />
                  <span>
                    Quyền dùng mOS AI (MAI) (
                    {staffDirectory.filter((m) => isStaffMemberAllowedInAi(m, accessConfig).allowed).length}/
                    {staffDirectory.length})
                  </span>
                </button>
              </div>

              {/* Quick Presets Bar */}
              <div
                className="p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2"
                style={{
                  background: isChatTab ? 'rgba(212, 168, 75, 0.08)' : 'rgba(139, 92, 246, 0.08)',
                  border: isChatTab ? '1px solid rgba(212, 168, 75, 0.28)' : '1px solid rgba(139, 92, 246, 0.28)',
                }}
              >
                <div className="text-[11.5px] leading-relaxed" style={{ color: token.colorText }}>
                  {isChatTab ? (
                    <>
                      Chọn <b>Bộ phận / Đội nhóm</b> hoặc <b>Cá nhân</b> được phép nhìn thấy biểu tượng và truy cập{' '}
                      <b>mOS Chat</b>. (Admin & Danny luôn có toàn quyền).
                    </>
                  ) : (
                    <>
                      Chọn <b>Bộ phận / Đội nhóm</b> hoặc <b>Cá nhân</b> được phép chat 1-1 với <b>🤖 MAI</b> và gọi{' '}
                      <code>@MAI</code> trong nhóm Space.
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {isChatTab ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          void persistAccessConfig(
                            {
                              ...accessConfig,
                              allowAllStaff: false,
                              allowedGroupKeys: [],
                              allowedStaffIds: [],
                            },
                            true
                          )
                        }
                        className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                        style={{
                          background:
                            !accessConfig.allowAllStaff &&
                            accessConfig.allowedGroupKeys.length === 0 &&
                            accessConfig.allowedStaffIds.length === 0
                              ? '#d4a84b'
                              : surfaceBg,
                          color:
                            !accessConfig.allowAllStaff &&
                            accessConfig.allowedGroupKeys.length === 0 &&
                            accessConfig.allowedStaffIds.length === 0
                              ? '#090d16'
                              : token.colorTextSecondary,
                          border: `1px solid ${borderStrong}`,
                        }}
                      >
                        👑 Chỉ Admin / Danny
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void persistAccessConfig(
                            {
                              ...accessConfig,
                              allowAllStaff: false,
                              allowedGroupKeys: ['TEAM_ADMIN_MANAGER'],
                            },
                            true
                          )
                        }
                        className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                        style={{
                          background:
                            !accessConfig.allowAllStaff &&
                            accessConfig.allowedGroupKeys.length === 1 &&
                            accessConfig.allowedGroupKeys[0] === 'TEAM_ADMIN_MANAGER'
                              ? '#f59e0b'
                              : surfaceBg,
                          color:
                            !accessConfig.allowAllStaff &&
                            accessConfig.allowedGroupKeys.length === 1 &&
                            accessConfig.allowedGroupKeys[0] === 'TEAM_ADMIN_MANAGER'
                              ? '#090d16'
                              : token.colorTextSecondary,
                          border: `1px solid ${borderStrong}`,
                        }}
                      >
                        🛡️ Ban Quản Trị & Manager
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void persistAccessConfig(
                            {
                              ...accessConfig,
                              allowAllStaff: !accessConfig.allowAllStaff,
                            },
                            true
                          )
                        }
                        className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                        style={{
                          background: accessConfig.allowAllStaff ? '#10b981' : surfaceBg,
                          color: accessConfig.allowAllStaff ? '#052e16' : token.colorTextSecondary,
                          border: `1px solid ${accessConfig.allowAllStaff ? '#10b981' : borderStrong}`,
                        }}
                      >
                        🌐 {accessConfig.allowAllStaff ? 'Đang mở Toàn hệ thống (ON)' : 'Mở Toàn hệ thống'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          void persistAccessConfig(
                            {
                              ...accessConfig,
                              aiCopilotAllowedGroupKeys: [],
                              aiCopilotAllowedStaffIds: [],
                            },
                            true
                          )
                        }
                        className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                        style={{
                          background:
                            (accessConfig.aiCopilotAllowedGroupKeys || []).length === 0 &&
                            (accessConfig.aiCopilotAllowedStaffIds || []).length === 0
                              ? '#8b5cf6'
                              : surfaceBg,
                          color:
                            (accessConfig.aiCopilotAllowedGroupKeys || []).length === 0 &&
                            (accessConfig.aiCopilotAllowedStaffIds || []).length === 0
                              ? '#ffffff'
                              : token.colorTextSecondary,
                          border: `1px solid ${borderStrong}`,
                        }}
                      >
                        👑 Chỉ Admin / Danny
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void persistAccessConfig(
                            {
                              ...accessConfig,
                              aiCopilotAllowedGroupKeys: SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((g) => g.key),
                            },
                            true
                          )
                        }
                        className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                        style={{
                          background:
                            (accessConfig.aiCopilotAllowedGroupKeys || []).length ===
                            SPACE_DEPARTMENT_AND_TEAM_GROUPS.length
                              ? '#10b981'
                              : surfaceBg,
                          color:
                            (accessConfig.aiCopilotAllowedGroupKeys || []).length ===
                            SPACE_DEPARTMENT_AND_TEAM_GROUPS.length
                              ? '#052e16'
                              : token.colorTextSecondary,
                          border: `1px solid ${borderStrong}`,
                        }}
                      >
                        🤖 Mở AI cho tất cả Đội nhóm
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* SECTION 1: EXISTING DEPARTMENT & TEAM GROUPS CONFIGURATION */}
              <div
                className="p-3 rounded-xl space-y-2.5"
                style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-500">
                    1. Phân quyền theo Cấu hình Bộ Phận & Đội Nhóm có sẵn ({activeGroupKeys.length}/
                    {SPACE_DEPARTMENT_AND_TEAM_GROUPS.length} nhóm đang bật)
                  </span>
                  {activeGroupKeys.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isChatTab) {
                          void persistAccessConfig(
                            { ...accessConfig, allowAllStaff: false, allowedGroupKeys: [] },
                            true
                          );
                        } else {
                          void persistAccessConfig({ ...accessConfig, aiCopilotAllowedGroupKeys: [] }, true);
                        }
                      }}
                      className="text-[10.5px] font-bold text-rose-400 hover:underline cursor-pointer"
                    >
                      Bỏ chọn tất cả nhóm
                    </button>
                  )}
                </div>

                {/* 4 Core Departments */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    4 Bộ phận cốt lõi (Core Departments)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter((g) => g.category === 'department').map((group) => {
                      const count = staffDirectory.filter((m) => matchesStaffGroup(m, group.key)).length;
                      const isEnabled =
                        (isChatTab && accessConfig.allowAllStaff) || activeGroupKeys.includes(group.key);
                      return (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => toggleGroupKey(group.key)}
                          className="px-2.5 py-2 rounded-lg text-left flex items-center justify-between gap-2 cursor-pointer transition-all"
                          style={{
                            background: isEnabled ? `${group.color}1f` : surfaceBg,
                            border: isEnabled ? `1.5px solid ${group.color}` : `1px solid ${borderStrong}`,
                          }}
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: group.color }} />
                            <div className="min-w-0">
                              <div
                                className="text-[11.5px] font-extrabold truncate"
                                style={{ color: isEnabled ? group.color : token.colorText }}
                              >
                                {group.label}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{group.defaultSubtitle}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-extrabold tabular-nums"
                              style={{
                                background: isEnabled ? group.color : 'rgba(148,163,184,0.16)',
                                color: isEnabled ? '#090d16' : token.colorTextSecondary,
                              }}
                            >
                              {count} người
                            </span>
                            {isEnabled && <Check size={14} style={{ color: group.color }} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Specialized Teams */}
                <div className="pt-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Đội chuyên môn (Specialized Teams)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter((g) => g.category === 'team').map((group) => {
                      const count = staffDirectory.filter((m) => matchesStaffGroup(m, group.key)).length;
                      const isEnabled =
                        (isChatTab && accessConfig.allowAllStaff) || activeGroupKeys.includes(group.key);
                      return (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => toggleGroupKey(group.key)}
                          className="px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between gap-2 cursor-pointer transition-all"
                          style={{
                            background: isEnabled ? `${group.color}1f` : surfaceBg,
                            border: isEnabled ? `1.5px solid ${group.color}` : `1px solid ${borderStrong}`,
                          }}
                        >
                          <div className="min-w-0 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: group.color }} />
                            <span
                              className="text-[11px] font-bold truncate"
                              style={{ color: isEnabled ? group.color : token.colorText }}
                            >
                              {group.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className="px-1.5 py-0.2 rounded text-[9.5px] font-extrabold tabular-nums"
                              style={{
                                background: isEnabled ? group.color : 'rgba(148,163,184,0.16)',
                                color: isEnabled ? '#090d16' : token.colorTextSecondary,
                              }}
                            >
                              {count}
                            </span>
                            {isEnabled && <Check size={13} style={{ color: group.color }} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 2: INDIVIDUAL STAFF OVERRIDE & LIVE ACCESS STATUS */}
              <div
                className="p-3 rounded-xl space-y-2.5"
                style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-violet-400">
                    2. Phân quyền Đặc cách theo Cá Nhân ({activeStaffIds.length} cá nhân đặc cách · Tổng{' '}
                    {totalAllowedCount}/{staffDirectory.length} nhân sự được mở)
                  </span>
                  {activeStaffIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isChatTab) {
                          void persistAccessConfig({ ...accessConfig, allowedStaffIds: [] }, true);
                        } else {
                          void persistAccessConfig({ ...accessConfig, aiCopilotAllowedStaffIds: [] }, true);
                        }
                      }}
                      className="text-[10.5px] font-bold text-rose-400 hover:underline cursor-pointer shrink-0"
                    >
                      Xóa chọn cá nhân ({activeStaffIds.length})
                    </button>
                  )}
                </div>

                {/* Search + Filter Pills */}
                <div className="flex flex-col gap-2">
                  <Input
                    value={accessStaffSearch}
                    onChange={(e) => setAccessStaffSearch(e.target.value)}
                    placeholder="Tìm cá nhân theo tên, username hoặc chức danh..."
                    prefix={<Search size={13} className="text-slate-400" />}
                    allowClear
                  />
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {[
                      { key: 'ALL', label: `Tất cả (${staffDirectory.length})` },
                      { key: 'ALLOWED_ONLY', label: `Đang có quyền (${totalAllowedCount})` },
                      { key: 'INDIVIDUAL_ONLY', label: `Đặc cách cá nhân (${activeStaffIds.length})` },
                      ...SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((g) => ({
                        key: g.key,
                        label: g.shortLabel,
                      })),
                    ].map((pill) => {
                      const active = accessGroupFilter === pill.key;
                      return (
                        <button
                          key={pill.key}
                          type="button"
                          onClick={() => setAccessGroupFilter(pill.key)}
                          className="h-6 px-2 rounded-full text-[10px] font-extrabold whitespace-nowrap cursor-pointer shrink-0 transition-all"
                          style={{
                            background: active ? '#d4a84b' : surfaceBg,
                            color: active ? '#090d16' : token.colorTextSecondary,
                            border: `1px solid ${active ? '#d4a84b' : borderStrong}`,
                          }}
                        >
                          {pill.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Staff Member Rows */}
                <div
                  className="max-h-[230px] overflow-y-auto rounded-lg divide-y"
                  style={{
                    background: surfaceBg,
                    border: `1px solid ${borderStrong}`,
                    borderColor: borderStrong,
                  }}
                >
                  {filteredStaffForAccess.length === 0 ? (
                    <div className="py-6 text-center text-[11.5px] text-slate-400">
                      Không tìm thấy nhân sự phù hợp với bộ lọc.
                    </div>
                  ) : (
                    filteredStaffForAccess.map((member) => {
                      const status = isChatTab
                        ? isStaffMemberAllowedInChat(member, accessConfig)
                        : isStaffMemberAllowedInAi(member, accessConfig);
                      const isIndividualSelected = activeStaffIds.includes(member.id);
                      const rLower = String(member.role || '').toLowerCase();
                      const roleColor = rLower.includes('admin')
                        ? '#d4a84b'
                        : rLower.includes('manager') || rLower.includes('oc')
                          ? '#a855f7'
                          : rLower.includes('cc') || rLower.includes('tư vấn')
                            ? '#10b981'
                            : rLower.includes('telesale') || rLower.includes('booker')
                              ? '#0ea5e9'
                              : '#3b82f6';

                      return (
                        <div
                          key={member.id}
                          className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-amber-500/5 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {renderUserAvatarNode({
                              name: member.displayName || member.username,
                              avatarUrl: member.avatarUrl,
                              staffId: member.id,
                              sizeClass: 'w-8 h-8',
                              textClass: 'text-xs',
                              bgStyle: roleColor,
                              onlineDot: Boolean(member.isOnline),
                            })}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[12px] font-bold truncate" style={{ color: token.colorText }}>
                                  {member.displayName}
                                </span>
                                <span className="text-[10.5px] text-slate-400">@{member.username}</span>
                                <span
                                  className="px-1.5 py-0.2 rounded text-[9.5px] font-extrabold"
                                  style={{ background: `${roleColor}20`, color: roleColor }}
                                >
                                  {member.role}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {status.reason === 'admin' && (
                                  <span className="text-[10px] font-extrabold text-amber-400">
                                    👑 Luôn mở (Admin / Super Admin)
                                  </span>
                                )}
                                {status.reason === 'all' && (
                                  <span className="text-[10px] font-bold text-emerald-400">
                                    🌐 Đang mở theo chế độ Toàn hệ thống
                                  </span>
                                )}
                                {status.reason === 'group' && (
                                  <span className="text-[10px] font-bold text-emerald-400">
                                    ✓ Đã mở theo nhóm: {status.matchedGroups.map((g) => g.shortLabel).join(', ')}
                                  </span>
                                )}
                                {status.reason === 'individual' && (
                                  <span className="text-[10px] font-bold text-violet-400">
                                    ★ Được cấp quyền Đặc cách Cá nhân
                                    {status.matchedGroups.length > 0
                                      ? ` (+ nhóm ${status.matchedGroups.map((g) => g.shortLabel).join(', ')})`
                                      : ''}
                                  </span>
                                )}
                                {status.reason === 'none' && (
                                  <span className="text-[10px] text-slate-400">🔒 Chưa cấp quyền truy cập</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {status.reason === 'admin' ? (
                              <span
                                className="h-7 px-2.5 rounded-lg inline-flex items-center gap-1 text-[10.5px] font-extrabold"
                                style={{
                                  background: 'rgba(212, 168, 75, 0.16)',
                                  color: '#d4a84b',
                                  border: '1px solid rgba(212, 168, 75, 0.35)',
                                }}
                              >
                                <Check size={12} /> Mặc định
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleIndividualStaff(member.id)}
                                className="h-7 px-2.5 rounded-lg inline-flex items-center gap-1 text-[11px] font-extrabold cursor-pointer transition-all"
                                style={{
                                  background: isIndividualSelected
                                    ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                                    : status.allowed
                                      ? 'rgba(16, 185, 129, 0.14)'
                                      : surfaceRaised,
                                  color: isIndividualSelected
                                    ? '#ffffff'
                                    : status.allowed
                                      ? '#10b981'
                                      : token.colorTextSecondary,
                                  border: isIndividualSelected
                                    ? '1px solid #8b5cf6'
                                    : status.allowed
                                      ? '1px solid rgba(16, 185, 129, 0.35)'
                                      : `1px solid ${borderStrong}`,
                                }}
                              >
                                {isIndividualSelected ? (
                                  <>
                                    <Check size={12} />
                                    <span>Đã cấp cá nhân</span>
                                  </>
                                ) : status.allowed ? (
                                  <>
                                    <Check size={12} />
                                    <span>Đã mở theo Đội (+ Cá nhân)</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus size={12} />
                                    <span>+ Cấp quyền cá nhân</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Footer Summary */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-slate-400">
                  Mọi thay đổi được lưu tự động lên máy chủ và đồng bộ tức thì cho các thành viên.
                </div>
                <button
                  type="button"
                  onClick={() => setAccessConfigModalOpen(false)}
                  className="h-8 px-4 rounded-lg text-[12px] font-extrabold cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #d4a84b, #b8860b)',
                    color: '#090d16',
                  }}
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ================= FULL-SCREEN HIGH-RES IMAGE LIGHTBOX ZOOM VIEWER ================= */}
      {lightboxImage &&
        (() => {
          const totalItems = lightboxImage.items.length;
          const currentItem = lightboxImage.items[lightboxImage.currentIndex] || lightboxImage.items[0];
          if (!currentItem) return null;

          const goPrev = () => {
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
          };

          const goNext = () => {
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
          };

          return (
            <div
              role="dialog"
              aria-label="Xem phóng to hình ảnh"
              data-no-chat-autofocus="true"
              onClick={() => setLightboxImage(null)}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.25 : -0.25;
                setLightboxImage((prev) =>
                  prev
                    ? {
                        ...prev,
                        zoom: Math.min(4, Math.max(0.5, Number((prev.zoom + delta).toFixed(2)))),
                      }
                    : null
                );
              }}
              className="fixed inset-0 z-[2200] flex flex-col items-center justify-center select-none"
              style={{
                background: 'rgba(2, 6, 23, 0.92)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {/* Top Floating Lightbox Toolbar */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="fixed top-4 left-1/2 -translate-x-1/2 z-[2210] flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-2xl"
                style={{
                  background: 'rgba(15, 23, 42, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: '#f8fafc',
                }}
              >
                {totalItems > 1 && (
                  <div className="flex items-center gap-1 pr-2 border-r border-white/15">
                    <Tooltip title="Hình trước (Phím ←)">
                      <button
                        type="button"
                        aria-label="Hình trước"
                        onClick={goPrev}
                        className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
                      >
                        <ChevronLeft size={15} />
                      </button>
                    </Tooltip>
                    <span className="px-1.5 text-[11.5px] font-extrabold tabular-nums" style={{ color: '#fbbf24' }}>
                      {lightboxImage.currentIndex + 1} / {totalItems}
                    </span>
                    <Tooltip title="Hình tiếp theo (Phím →)">
                      <button
                        type="button"
                        aria-label="Hình tiếp theo"
                        onClick={goNext}
                        className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </Tooltip>
                  </div>
                )}

                <span className="text-[12px] font-bold max-w-[200px] truncate pr-2 border-r border-white/15">
                  {currentItem.name}
                </span>

                <Tooltip title="Thu nhỏ (-)">
                  <button
                    type="button"
                    aria-label="Thu nhỏ"
                    onClick={() =>
                      setLightboxImage((prev) =>
                        prev ? { ...prev, zoom: Math.max(0.5, Number((prev.zoom - 0.25).toFixed(2))) } : null
                      )
                    }
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
                  >
                    <ZoomOut size={15} />
                  </button>
                </Tooltip>

                <Tooltip title="Nhấn để đưa về 100%">
                  <button
                    type="button"
                    onClick={() => setLightboxImage((prev) => (prev ? { ...prev, zoom: 1, rotate: 0 } : null))}
                    className="px-2 h-6 rounded-md text-[11.5px] font-extrabold tabular-nums hover:bg-white/15 cursor-pointer"
                    style={{ color: '#fbbf24' }}
                  >
                    {Math.round(lightboxImage.zoom * 100)}%
                  </button>
                </Tooltip>

                <Tooltip title="Phóng to (+ hoặc lăn chuột)">
                  <button
                    type="button"
                    aria-label="Phóng to"
                    onClick={() =>
                      setLightboxImage((prev) =>
                        prev ? { ...prev, zoom: Math.min(4, Number((prev.zoom + 0.25).toFixed(2))) } : null
                      )
                    }
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
                  >
                    <ZoomIn size={15} />
                  </button>
                </Tooltip>

                <Tooltip title="Xoay ảnh 90°">
                  <button
                    type="button"
                    aria-label="Xoay ảnh 90 độ"
                    onClick={() =>
                      setLightboxImage((prev) => (prev ? { ...prev, rotate: (prev.rotate + 90) % 360 } : null))
                    }
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
                  >
                    <RotateCw size={14} />
                  </button>
                </Tooltip>

                <Tooltip title="Mở ảnh gốc trong tab mới">
                  <a
                    href={currentItem.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Mở ảnh gốc trong tab mới"
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
                  >
                    <ExternalLink size={14} />
                  </a>
                </Tooltip>

                <Tooltip title="Đóng (Esc)">
                  <button
                    type="button"
                    aria-label="Đóng trình xem ảnh"
                    onClick={() => setLightboxImage(null)}
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white cursor-pointer ml-1"
                  >
                    <X size={15} />
                  </button>
                </Tooltip>
              </div>

              {/* Large Left / Right Side Navigation Buttons when Reply has 2+ Images */}
              {totalItems > 1 && (
                <>
                  <Tooltip
                    title={`Hình trước (${((lightboxImage.currentIndex - 1 + totalItems) % totalItems) + 1}/${totalItems}) · Phím ←`}
                  >
                    <button
                      type="button"
                      aria-label="Hình trước"
                      onClick={(e) => {
                        e.stopPropagation();
                        goPrev();
                      }}
                      className="fixed left-5 top-1/2 -translate-y-1/2 z-[2210] w-11 h-11 rounded-full inline-flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-2xl"
                      style={{
                        background: 'rgba(15, 23, 42, 0.88)',
                        border: '1px solid rgba(251, 191, 36, 0.45)',
                        color: '#fbbf24',
                      }}
                    >
                      <ChevronLeft size={22} />
                    </button>
                  </Tooltip>

                  <Tooltip
                    title={`Hình tiếp theo (${((lightboxImage.currentIndex + 1) % totalItems) + 1}/${totalItems}) · Phím →`}
                  >
                    <button
                      type="button"
                      aria-label="Hình tiếp theo"
                      onClick={(e) => {
                        e.stopPropagation();
                        goNext();
                      }}
                      className="fixed right-5 top-1/2 -translate-y-1/2 z-[2210] w-11 h-11 rounded-full inline-flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-2xl"
                      style={{
                        background: 'rgba(15, 23, 42, 0.88)',
                        border: '1px solid rgba(251, 191, 36, 0.45)',
                        color: '#fbbf24',
                      }}
                    >
                      <ChevronRight size={22} />
                    </button>
                  </Tooltip>
                </>
              )}

              {/* Zoomable Image Canvas */}
              <div className="w-full h-full flex items-center justify-center overflow-auto p-8">
                <img
                  src={currentItem.url}
                  alt={currentItem.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImage((prev) => (prev ? { ...prev, zoom: prev.zoom > 1 ? 1 : 2 } : null));
                  }}
                  className={`max-w-[90vw] ${
                    totalItems > 1 ? 'max-h-[78vh]' : 'max-h-[86vh]'
                  } object-contain rounded-lg shadow-2xl transition-transform duration-150 ${
                    lightboxImage.zoom > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                  style={{
                    transform: `scale(${lightboxImage.zoom}) rotate(${lightboxImage.rotate}deg)`,
                    transformOrigin: 'center center',
                  }}
                />
              </div>

              {/* Bottom Thumbnail Filmstrip for Multi-Image Replies */}
              {totalItems > 1 && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[2210] flex items-center gap-2 px-3 py-2 rounded-2xl shadow-2xl max-w-[90vw] overflow-x-auto"
                  style={{
                    background: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                  }}
                >
                  {lightboxImage.items.map((item, idx) => {
                    const isActive = idx === lightboxImage.currentIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setLightboxImage((prev) => (prev ? { ...prev, currentIndex: idx, zoom: 1, rotate: 0 } : null))
                        }
                        className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 cursor-pointer transition-all"
                        style={{
                          border: isActive ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.2)',
                          opacity: isActive ? 1 : 0.55,
                          transform: isActive ? 'scale(1.06)' : 'scale(1)',
                        }}
                      >
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover block" />
                        <span
                          className="absolute bottom-0 right-0 px-1 text-[8.5px] font-extrabold tabular-nums"
                          style={{
                            background: isActive ? '#fbbf24' : 'rgba(0,0,0,0.75)',
                            color: isActive ? '#000' : '#fff',
                          }}
                        >
                          {idx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

      {/* ================= QUICK CREATE CUSTOM SECTION MODAL ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={quickCreateSectionModalOpen}
        onCancel={() => {
          setQuickCreateSectionModalOpen(false);
          setQuickCreateSectionTargetConvId(null);
        }}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 420}
        centered
        zIndex={1350}
        title={
          <div className="flex items-center gap-2">
            <FolderPlus size={16} className="text-sky-400" />
            <span className="font-extrabold text-[14px]">Tạo mục tuỳ chỉnh mới (Google Chat Section)</span>
          </div>
        }
      >
        <div className="space-y-3 pt-2">
          <div className="text-[12px] text-slate-400">
            Tạo mục riêng để nhóm các cuộc trò chuyện 1-1 hoặc #Spaces quan trọng theo ý của bạn (ví dụ:{' '}
            <span className="font-semibold text-amber-400">⭐ Ưu tiên</span>,{' '}
            <span className="font-semibold text-amber-400">📌 Ca hôm nay</span>,{' '}
            <span className="font-semibold text-amber-400">Khách VIP</span>).
          </div>
          <Input
            value={quickCreateSectionName}
            onChange={(e) => setQuickCreateSectionName(e.target.value)}
            placeholder="Nhập tên mục tuỳ chỉnh..."
            maxLength={40}
            autoFocus
            onPressEnter={(e) => {
              e.preventDefault();
              const name = quickCreateSectionName.trim();
              if (!name) return;
              setQuickCreateSectionName('');
              setQuickCreateSectionModalOpen(false);
              const target = quickCreateSectionTargetConvId;
              setQuickCreateSectionTargetConvId(null);
              handleCreateCustomSection(name, target);
            }}
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setQuickCreateSectionModalOpen(false);
                setQuickCreateSectionTargetConvId(null);
                setQuickCreateSectionName('');
              }}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer"
              style={{
                background: surfaceRaised,
                border: `1px solid ${borderColor}`,
                color: token.colorTextSecondary,
              }}
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const name = quickCreateSectionName.trim();
                if (!name) return;
                setQuickCreateSectionName('');
                setQuickCreateSectionModalOpen(false);
                const target = quickCreateSectionTargetConvId;
                setQuickCreateSectionTargetConvId(null);
                handleCreateCustomSection(name, target);
              }}
              className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              Tạo mục
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= PERSONAL SIDEBAR CUSTOMIZATION MODAL (GOOGLE CHAT WORKSPACE) ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={sidebarCustomizeModalOpen}
        onCancel={() => {
          setSidebarCustomizeModalOpen(false);
          setEditingSectionId(null);
        }}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 680}
        centered
        zIndex={1350}
        title={
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <FolderKanban size={17} style={{ color: '#d4a84b' }} />
              <span className="font-extrabold text-[14.5px]">Tuỳ chỉnh Danh sách Cá nhân (Google Chat Workspace)</span>
            </div>
            <span className="inline-flex items-center justify-center leading-none py-1 px-2.5 rounded-full text-[10.5px] font-bold bg-amber-500/15 text-amber-400">
              Lưu riêng cho {currentUser?.displayName || currentUser?.username || 'bạn'}
            </span>
          </div>
        }
      >
        <div className="space-y-3 pt-2">
          {/* Sub-navigation Tabs */}
          <div className="flex items-center justify-between gap-2">
            <div
              className="inline-flex p-1 rounded-xl gap-1"
              style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
            >
              <button
                type="button"
                onClick={() => setSidebarCustomizeTab('sections')}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5"
                style={{
                  background: sidebarCustomizeTab === 'sections' ? surfaceBg : 'transparent',
                  color: sidebarCustomizeTab === 'sections' ? '#d4a84b' : token.colorTextSecondary,
                }}
              >
                <FolderKanban size={14} />
                <span>1. Quản lý Mục & Thứ tự ({sidebarSections.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSidebarCustomizeTab('conversations')}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5"
                style={{
                  background: sidebarCustomizeTab === 'conversations' ? surfaceBg : 'transparent',
                  color: sidebarCustomizeTab === 'conversations' ? '#d4a84b' : token.colorTextSecondary,
                }}
              >
                <Sliders size={14} />
                <span>
                  2. Quản lý DIRECT MESSAGES & SPACES ({allUserConversations.length})
                  {(userPrefs.hiddenIds?.length || 0) > 0 ? ` · ${userPrefs.hiddenIds.length} đang ẩn` : ''}
                </span>
              </button>
            </div>

            <Popconfirm
              title="Khôi phục bố cục danh sách về mặc định?"
              description="Các mục tuỳ chỉnh, ghim và danh sách ẩn của bạn sẽ được đặt lại."
              onConfirm={handleResetSidebarPrefs}
              okText="Đặt lại"
              cancelText="Huỷ"
            >
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold inline-flex items-center gap-1 cursor-pointer hover:bg-rose-500/10 text-rose-400"
                style={{ border: `1px solid ${borderColor}` }}
              >
                <RotateCcw size={12} />
                <span>Đặt lại mặc định</span>
              </button>
            </Popconfirm>
          </div>

          {sidebarCustomizeTab === 'sections' ? (
            <div className="space-y-3">
              {/* Create new Custom Section Bar */}
              <div
                className="p-3 rounded-xl space-y-2"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                <div className="text-[12px] font-bold flex items-center gap-1.5">
                  <FolderPlus size={14} className="text-sky-400" />
                  <span>Tạo mục tuỳ chỉnh mới (Giống Custom Sections trên Google Chat)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={newSectionNameInput}
                    onChange={(e) => setNewSectionNameInput(e.target.value)}
                    placeholder="Ví dụ: ⭐ Quan trọng, 📌 Ca làm việc hôm nay, Dự án VIP..."
                    maxLength={40}
                    onPressEnter={(e) => {
                      e.preventDefault();
                      const name = newSectionNameInput.trim();
                      if (!name) return;
                      setNewSectionNameInput('');
                      handleCreateCustomSection(name);
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const name = newSectionNameInput.trim();
                      if (!name) return;
                      setNewSectionNameInput('');
                      handleCreateCustomSection(name);
                    }}
                    className="px-3.5 h-8 rounded-lg text-[12px] font-bold cursor-pointer bg-amber-500 text-slate-950 hover:bg-amber-400 shrink-0 inline-flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Thêm mục</span>
                  </button>
                </div>
              </div>

              {/* Ordered Sections List */}
              <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                {sidebarSections.map((sec, idx) => {
                  const isEditing = editingSectionId === sec.id;
                  return (
                    <div
                      key={sec.id}
                      className="px-3 py-2.5 rounded-xl flex items-center justify-between gap-2"
                      style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-[11px] font-extrabold bg-amber-500/15 text-amber-400 tabular-nums shrink-0">
                          {idx + 1}
                        </span>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <Input
                              size="small"
                              value={editingSectionName}
                              onChange={(e) => setEditingSectionName(e.target.value)}
                              onPressEnter={() => handleRenameCustomSection(sec.id, editingSectionName)}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameCustomSection(sec.id, editingSectionName)}
                              className="px-2 py-1 rounded bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSectionId(null)}
                              className="px-2 py-1 rounded text-[11px] text-slate-400 cursor-pointer"
                            >
                              Huỷ
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-[12.5px] uppercase tracking-wide truncate">
                                {sec.title}
                              </span>
                              <span
                                className="inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[10px] font-bold tabular-nums"
                                style={{
                                  background: sec.isCustom ? 'rgba(212, 168, 75, 0.16)' : 'rgba(59, 130, 246, 0.14)',
                                  color: sec.isCustom ? '#d4a84b' : '#60a5fa',
                                }}
                              >
                                {sec.isCustom ? 'Mục tuỳ chỉnh' : 'Mặc định'} · {sec.totalCount} hội thoại
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Tooltip title="Chỉ hiện cuộc trò chuyện có tin chưa đọc trong mục này">
                          <button
                            type="button"
                            onClick={() => toggleUnreadOnlySection(sec.id)}
                            className="px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                            style={{
                              background: sec.unreadOnly ? 'rgba(245, 158, 11, 0.18)' : surfaceBg,
                              border: `1px solid ${sec.unreadOnly ? 'rgba(245, 158, 11, 0.45)' : borderColor}`,
                              color: sec.unreadOnly ? '#fbbf24' : token.colorTextSecondary,
                            }}
                          >
                            <Mail size={12} />
                            <span>{sec.unreadOnly ? 'Chỉ chưa đọc' : 'Hiện tất cả'}</span>
                          </button>
                        </Tooltip>

                        <Tooltip title="Di chuyển mục lên">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSectionOrder(sec.id, 'up')}
                            className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                            style={{ background: surfaceBg, border: `1px solid ${borderColor}` }}
                          >
                            <ArrowUp size={13} />
                          </button>
                        </Tooltip>

                        <Tooltip title="Di chuyển mục xuống">
                          <button
                            type="button"
                            disabled={idx === sidebarSections.length - 1}
                            onClick={() => handleMoveSectionOrder(sec.id, 'down')}
                            className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                            style={{ background: surfaceBg, border: `1px solid ${borderColor}` }}
                          >
                            <ArrowDown size={13} />
                          </button>
                        </Tooltip>

                        {sec.isCustom && (
                          <>
                            <Tooltip title="Đổi tên mục">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSectionId(sec.id);
                                  setEditingSectionName(sec.title);
                                }}
                                className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer"
                                style={{ background: surfaceBg, border: `1px solid ${borderColor}` }}
                              >
                                <Pencil size={13} />
                              </button>
                            </Tooltip>
                            <Tooltip title="Xoá mục tuỳ chỉnh">
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomSection(sec.id)}
                                className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer text-rose-500 hover:bg-rose-500/10"
                                style={{ background: surfaceBg, border: `1px solid ${borderColor}` }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[410px] overflow-y-auto pr-1">
              {allUserConversations.map((conv) => {
                const isAiConv = conv.id === AI_COPILOT_CONV_ID;
                const isSpace = conv.type === 'space';
                const isPinned = (userPrefs.pinnedIds || []).includes(conv.id);
                const isMuted = (userPrefs.mutedIds || []).includes(conv.id);
                const isHidden = (userPrefs.hiddenIds || []).includes(conv.id);
                const assignedSec = (userPrefs.customSections || []).find((s) =>
                  (s.conversationIds || []).includes(conv.id)
                );

                return (
                  <div
                    key={conv.id}
                    className="px-3 py-2 rounded-xl flex items-center justify-between gap-2"
                    style={{
                      background: surfaceRaised,
                      border: `1px solid ${borderColor}`,
                      opacity: isHidden ? 0.65 : 1,
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {isSpace ? (
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${conv.color}22`, color: conv.color }}
                        >
                          <Hash size={15} />
                        </div>
                      ) : (
                        renderUserAvatarNode({
                          staffId: conv.isSelf ? currentUser?.id || 'me' : conv.participantStaffId,
                          name: conv.name,
                          rawAvatar: conv.avatar,
                          bgColor: conv.color || '#ec4899',
                          sizeClass: 'w-8 h-8',
                          roundedClass: 'rounded-full',
                          isAiBot: isAiConv,
                          isSelfBookmark: Boolean(conv.isSelf),
                        })
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[12.5px] truncate">{conv.name}</span>
                          <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-slate-500/15 text-slate-400 shrink-0">
                            {isSpace ? 'SPACE' : 'DIRECT MESSAGE'}
                          </span>
                          {isHidden && (
                            <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500/20 text-amber-400 shrink-0">
                              Đang ẩn
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{conv.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Section selector dropdown */}
                      <Select
                        size="small"
                        value={assignedSec ? assignedSec.id : 'default'}
                        onChange={(val) => moveConversationToSection(conv.id, val)}
                        style={{ width: 155 }}
                        options={[
                          {
                            value: 'default',
                            label: isSpace ? 'Mục: SPACES' : 'Mục: DIRECT MESSAGES',
                          },
                          ...(userPrefs.customSections || []).map((cs) => ({
                            value: cs.id,
                            label: `📁 ${cs.name}`,
                          })),
                        ]}
                      />

                      <Tooltip title={isPinned ? 'Bỏ ghim' : 'Ghim lên đầu mục'}>
                        <button
                          type="button"
                          onClick={() => togglePinConversation(conv.id)}
                          className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer"
                          style={{
                            background: isPinned ? 'rgba(212, 168, 75, 0.2)' : surfaceBg,
                            border: `1px solid ${isPinned ? '#d4a84b' : borderColor}`,
                            color: isPinned ? '#d4a84b' : token.colorTextSecondary,
                          }}
                        >
                          <Pin size={13} />
                        </button>
                      </Tooltip>

                      <Tooltip title={isMuted ? 'Bật thông báo' : 'Tắt thông báo'}>
                        <button
                          type="button"
                          onClick={() => toggleMuteConversation(conv.id)}
                          className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer"
                          style={{
                            background: isMuted ? 'rgba(239, 68, 68, 0.16)' : surfaceBg,
                            border: `1px solid ${isMuted ? 'rgba(239, 68, 68, 0.4)' : borderColor}`,
                            color: isMuted ? '#f87171' : token.colorTextSecondary,
                          }}
                        >
                          {isMuted ? <BellOff size={13} /> : <Bell size={13} />}
                        </button>
                      </Tooltip>

                      {!isAiConv && (
                        <Tooltip title={isHidden ? 'Hiện lại trên danh sách' : 'Ẩn khỏi danh sách'}>
                          <button
                            type="button"
                            onClick={() => toggleHideConversation(conv)}
                            className="px-2 h-7 rounded-md inline-flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer"
                            style={{
                              background: isHidden ? 'rgba(16, 185, 129, 0.16)' : surfaceBg,
                              border: `1px solid ${isHidden ? 'rgba(16, 185, 129, 0.4)' : borderColor}`,
                              color: isHidden ? '#34d399' : token.colorTextSecondary,
                            }}
                          >
                            {isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                            <span>{isHidden ? 'Hiện lại' : 'Ẩn'}</span>
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* ================= MESSAGE AUDIT & EDIT/DELETE HISTORY MODAL ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={historyModalOpen}
        onCancel={() => {
          setHistoryModalOpen(false);
          setHistoryModalMessage(null);
        }}
        footer={null}
        title={
          <div className="flex items-center gap-2 text-[14px] font-extrabold" style={{ color: '#d4a84b' }}>
            <History size={16} />
            <span>Lịch sử chỉnh sửa & xoá tin nhắn</span>
          </div>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 560}
        centered
        zIndex={1350}
        destroyOnClose
      >
        {historyModalMessage &&
          (() => {
            const isHistoryMsgMine = isMessageFromCurrentUser(historyModalMessage);
            const canManage = isHistoryMsgMine || isDannyAccount;
            return (
              <div className="py-2 space-y-4">
                {/* Message Metadata Header */}
                <div
                  className="p-3 rounded-xl flex items-center justify-between gap-2"
                  style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {renderUserAvatarNode({
                      staffId: historyModalMessage.senderId,
                      name: historyModalMessage.senderName,
                      rawAvatar: historyModalMessage.senderAvatar,
                      sizeClass: 'w-8 h-8',
                      roundedClass: 'rounded-full',
                    })}
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold truncate" style={{ color: token.colorText }}>
                        {historyModalMessage.senderName}
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        Gửi ban đầu lúc{' '}
                        {historyModalMessage.createdAt
                          ? dayjs(historyModalMessage.createdAt).format('HH:mm · DD/MM/YYYY')
                          : historyModalMessage.timeLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {historyModalMessage.isDeleted ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        Đã xoá
                      </span>
                    ) : historyModalMessage.editHistory && historyModalMessage.editHistory.length > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Đã sửa {historyModalMessage.editHistory.length} lần
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Bản gốc
                      </span>
                    )}

                    {/* Actions in Header */}
                    {canManage &&
                      (historyModalMessage.isDeleted ? (
                        <button
                          type="button"
                          onClick={() => handleRestoreMessage(historyModalMessage.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 cursor-pointer transition-all"
                        >
                          <RotateCcw size={12} />
                          <span>Khôi phục</span>
                        </button>
                      ) : (
                        <Popconfirm
                          title="Xoá tin nhắn này?"
                          description="Nội dung sẽ bị ẩn nhưng toàn bộ lịch sử chỉnh sửa & xoá vẫn được lưu lại an toàn."
                          onConfirm={() => handleDeleteMessage(historyModalMessage.id)}
                          okText="Xoá"
                          cancelText="Huỷ"
                          okButtonProps={{ danger: true }}
                          zIndex={1400}
                          overlayStyle={{ zIndex: 1400 }}
                        >
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 cursor-pointer transition-all"
                          >
                            <Trash2 size={12} />
                            <span>Xoá</span>
                          </button>
                        </Popconfirm>
                      ))}
                  </div>
                </div>

                {/* If Deleted: Notice Card */}
                {historyModalMessage.isDeleted && (
                  <div
                    className="p-3 rounded-xl border border-rose-500/30 text-[12px] space-y-2"
                    style={{ background: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-rose-400 flex items-center gap-1.5">
                        <Trash2 size={13} />
                        <span>Tin nhắn đã bị xoá</span>
                      </div>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleRestoreMessage(historyModalMessage.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 cursor-pointer"
                        >
                          <RotateCcw size={11} />
                          <span>Khôi phục tin nhắn này</span>
                        </button>
                      )}
                    </div>
                    <div className="text-slate-400 tabular-nums text-[11.5px]">
                      Người xoá:{' '}
                      <span className="font-semibold text-white/90">
                        {historyModalMessage.deletedByName || 'Người dùng'}
                      </span>{' '}
                      lúc{' '}
                      {historyModalMessage.deletedAt
                        ? dayjs(historyModalMessage.deletedAt).format('HH:mm:ss · DD/MM/YYYY')
                        : '—'}
                    </div>
                  </div>
                )}

                {/* Version Timeline */}
                <div className="space-y-3">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Nhật ký các phiên bản ({1 + (historyModalMessage.editHistory?.length || 0)} phiên bản)
                  </div>

                  {/* Current Version / Content before deletion */}
                  <div
                    className="p-3 rounded-xl space-y-1.5"
                    style={{
                      background: isDark ? 'rgba(212, 168, 75, 0.08)' : 'rgba(212, 168, 75, 0.06)',
                      border: '1px solid rgba(212, 168, 75, 0.3)',
                    }}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold" style={{ color: '#d4a84b' }}>
                        {historyModalMessage.isDeleted ? 'Nội dung trước khi xoá' : 'Phiên bản hiện tại (Mới nhất)'}
                      </span>
                      <span className="text-slate-400 tabular-nums">
                        {historyModalMessage.editedAt
                          ? dayjs(historyModalMessage.editedAt).format('HH:mm:ss · DD/MM/YYYY')
                          : historyModalMessage.createdAt
                            ? dayjs(historyModalMessage.createdAt).format('HH:mm:ss · DD/MM/YYYY')
                            : ''}
                      </span>
                    </div>
                    <div
                      className="text-[13px] leading-relaxed whitespace-pre-wrap break-words"
                      style={{ color: token.colorText }}
                    >
                      {historyModalMessage.text || historyModalMessage.originalText || '(Không có nội dung văn bản)'}
                    </div>
                  </div>

                  {/* Historical Edits (from newest to oldest) */}
                  {historyModalMessage.editHistory && historyModalMessage.editHistory.length > 0 && (
                    <div className="space-y-2.5">
                      {[...historyModalMessage.editHistory].reverse().map((item, idx) => {
                        const versionNum = historyModalMessage.editHistory!.length - idx;
                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl space-y-1.5"
                            style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                          >
                            <div className="flex items-center justify-between text-[11px] gap-2">
                              <span className="font-bold text-slate-300">Phiên bản #{versionNum} (Trước khi sửa)</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 tabular-nums">
                                  {dayjs(item.editedAt).format('HH:mm:ss · DD/MM/YYYY')}
                                  {item.editorName && ` · Sửa bởi ${item.editorName}`}
                                </span>
                                {canManage &&
                                  !historyModalMessage.isDeleted &&
                                  item.text &&
                                  item.text !== historyModalMessage.text && (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreVersion(historyModalMessage.id, item.text)}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-bold text-amber-400 hover:bg-amber-500/10 border border-amber-500/30 cursor-pointer"
                                    >
                                      <RotateCcw size={10} />
                                      <span>Khôi phục bản này</span>
                                    </button>
                                  )}
                              </div>
                            </div>
                            <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap break-words text-slate-300">
                              {item.text || '(Tin nhắn trống)'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Initial Original Version if different and preserved */}
                  {historyModalMessage.originalText &&
                    historyModalMessage.originalText !== historyModalMessage.text &&
                    (!historyModalMessage.editHistory || historyModalMessage.editHistory.length === 0) && (
                      <div
                        className="p-3 rounded-xl space-y-1.5"
                        style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-400">Nội dung gốc ban đầu</span>
                          <span className="text-slate-400 tabular-nums">
                            {historyModalMessage.createdAt
                              ? dayjs(historyModalMessage.createdAt).format('HH:mm:ss · DD/MM/YYYY')
                              : ''}
                          </span>
                        </div>
                        <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap break-words text-slate-300">
                          {historyModalMessage.originalText}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            );
          })()}
      </Modal>

      {/* ================= SUPER ADMIN DYNAMIC WORKFLOW ENGINE MODALS ================= */}
      {isStrictDannySuperAdmin && activeConversation && (
        <>
          <MosChatTriggerWorkflowModal
            open={triggerWorkflowModalOpen}
            isDark={isDark}
            conversationId={activeConversation.id}
            templates={workflowTemplates}
            staffDirectory={staffDirectory}
            initialTemplateCode={initialWorkflowCode}
            onClose={() => setTriggerWorkflowModalOpen(false)}
            onCreated={(res) => {
              if (res?.workflow) {
                setWorkflowInstances((prev) => [res.workflow, ...prev]);
              }
              if (res?.conversation) {
                setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
              }
              if (res?.task) {
                setTasks((prev) => [res.task!, ...prev]);
              }
              antdMessage.success(`Đã phát thẻ quy trình: ${res.workflow.title}`);
              notifyLivePeers();
            }}
          />

          <MosChatSaveThreadWorkflowModal
            open={saveThreadWorkflowModalOpen}
            isDark={isDark}
            conversationId={activeConversation.id}
            messageId={activeThreadMessage?.id ?? null}
            defaultName={
              activeThreadMessage?.text
                ? `Quy trình: ${activeThreadMessage.text.replace(/[*#_`]/g, '').slice(0, 48)}`
                : 'Quy trình Phối hợp Nội bộ Mới'
            }
            existingTemplates={workflowTemplates}
            onClose={() => setSaveThreadWorkflowModalOpen(false)}
            onSaved={(res) => {
              if (res?.template) {
                setWorkflowTemplates((prev) =>
                  prev.some((t) => t.code === res.template.code)
                    ? prev.map((t) => (t.code === res.template.code ? res.template : t))
                    : [res.template, ...prev]
                );
              }
              antdMessage.success(`Đã lưu & áp dụng Quy trình: ${res.template.name} (v${res.template.version})`);
              void fetchBootstrap(true);
              notifyLivePeers();
            }}
          />
        </>
      )}

      {/* MOS-FEAT-138: CKEditor Rich Editor Modal */}
      <MosChatRichEditorModal
        open={richEditorModalState.open}
        onClose={() => setRichEditorModalState((prev) => ({ ...prev, open: false }))}
        initialValue={richEditorModalState.scope === 'main' ? composerText : threadInput}
        initialMode={richEditorModalState.initialMode}
        onApply={(newText) => {
          if (richEditorModalState.scope === 'main') {
            setComposerText(newText);
            setTimeout(() => composerInputRef.current?.focus(), 50);
          } else {
            setThreadInput(newText);
            setTimeout(() => threadInputRef.current?.focus(), 50);
          }
        }}
        onSend={async (textToSend) => {
          if (richEditorModalState.scope === 'main') {
            if (activeConversation) {
              const attachmentsToSend = stagedAttachments;
              setComposerText('');
              setStagedAttachments([]);
              if (composerInputRef.current) composerInputRef.current.value = '';
              await handleSendMessage(activeConversation.id, textToSend, null, attachmentsToSend);
            }
          } else {
            if (activeConversation && activeThreadMsgId) {
              const attachmentsToSend = threadAttachments;
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
                text: textToSend,
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
            }
          }
        }}
        title={richEditorModalState.title}
        isDark={isDark}
        canUseAiCopilot={canUseAiCopilot}
      />
    </>
  );
};

export default MosGoogleChatPortal;

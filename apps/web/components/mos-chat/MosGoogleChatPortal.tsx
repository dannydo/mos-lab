'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Tooltip, Modal, Input, Select, Popover, Popconfirm, DatePicker, message as antdMessage, theme } from 'antd';
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
} from 'lucide-react';
import dayjs from 'dayjs';
import type {
  MosChatAccessConfig,
  MosChatConversation,
  MosChatCustomSection,
  MosChatCustomerCard,
  MosChatImageAttachment,
  MosChatImageMimeType,
  MosChatMessage,
  MosChatPresenceStatus,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatTaskPriority,
  MosChatUserSidebarPrefs,
  SafeAny,
} from '@mos-lab/shared';
import { isCanonicalSuperAdminIdentity, removeVietnameseTones } from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../lib/api-client';
import { resolveMediaUrl } from '../../lib/api-base-url';
import { speakText, stopSpeaking } from '../voice-assistant/speech-utils';

export const AI_COPILOT_CONV_ID = 'dm-wings-ai-copilot';
const AI_COPILOT_GROUP_ACCESS_KEY = 'mos_chat_ai_copilot_allowed_groups_v1';

const AI_QUICK_PROMPTS = [
  {
    label: 'Giải thích nhóm khách (Buckets)',
    prompt: 'Giải thích các nhóm khách hàng COMBO_LIVE, NOT_COMBO_LIVE, COMBO_DEAD và SINGLE trong hệ thống mOS.',
  },
  {
    label: 'Lọc khách NYC 60 chi tiêu > 1tr',
    prompt:
      'Lọc giúp tôi các khách hàng NYC 60 (31 đến 60 ngày chưa ghé) có tổng chi tiêu trên 1 triệu đồng để gọi nhắc dặm mi.',
  },
  {
    label: 'Khách hàng được giao cho tôi',
    prompt: 'Lọc danh sách khách hàng đang được phân bổ cho riêng tôi.',
  },
  {
    label: 'Tư vấn quy trình CSKH dặm mi',
    prompt: 'Tư vấn quy trình và thời điểm gọi chăm sóc khách hàng dặm mi chuẩn để tối ưu tỷ lệ quay lại.',
  },
] as const;

interface SpaceDepartmentOrTeamGroup {
  key: string;
  category: 'department' | 'team';
  label: string;
  shortLabel: string;
  color: string;
  defaultSlug: string;
  defaultSubtitle: string;
}

const SPACE_DEPARTMENT_AND_TEAM_GROUPS: SpaceDepartmentOrTeamGroup[] = [
  // 4 Core Departments (Bộ phận)
  {
    key: 'DEPT_SHOP',
    category: 'department',
    label: '🏢 Shop Operations',
    shortLabel: 'Shop Ops',
    color: '#d4a72c',
    defaultSlug: 'shop-operations',
    defaultSubtitle: 'Không gian vận hành cửa hàng · Tư Vấn CC · Chuyên Viên Mi · QA/QC',
  },
  {
    key: 'DEPT_GROWTH',
    category: 'department',
    label: '📈 Growth & Booking',
    shortLabel: 'Growth & Booking',
    color: '#fa8c16',
    defaultSlug: 'growth-booking',
    defaultSubtitle: 'Không gian điều phối lịch hẹn · Telesales · Booker · CS & Control',
  },
  {
    key: 'DEPT_ACADEMY',
    category: 'department',
    label: '🎓 Academy & Marketing',
    shortLabel: 'Academy',
    color: '#a855f7',
    defaultSlug: 'academy-marketing',
    defaultSubtitle: 'Không gian đào tạo Academy · Giảng Viên · Marketing & Sales',
  },
  {
    key: 'DEPT_BACK_OFFICE',
    category: 'department',
    label: '🛡️ Back Office & Quản Trị',
    shortLabel: 'Back Office',
    color: '#3b82f6',
    defaultSlug: 'back-office-quan-tri',
    defaultSubtitle: 'Không gian điều hành Ban Quản Trị · Quản lý · Nội bộ',
  },
  // 8 Specialized Teams / Roles (Nhóm chuyên môn)
  {
    key: 'TEAM_ADMIN_MANAGER',
    category: 'team',
    label: '👑 Ban Quản Trị & Manager',
    shortLabel: 'Admin / Manager',
    color: '#d4a84b',
    defaultSlug: 'ban-quan-tri-manager',
    defaultSubtitle: 'Không gian trao đổi Ban Giám Đốc, Admin và Quản lý',
  },
  {
    key: 'TEAM_CC',
    category: 'team',
    label: '💬 Tư Vấn Viên (CC)',
    shortLabel: 'Tư vấn CC',
    color: '#10b981',
    defaultSlug: 'tu-van-cc',
    defaultSubtitle: 'Không gian phối hợp đội ngũ Tư Vấn Viên Client Consultant',
  },
  {
    key: 'TEAM_CV',
    category: 'team',
    label: '✨ Chuyên Viên Mi (CV)',
    shortLabel: 'Chuyên Viên Mi',
    color: '#14b8a6',
    defaultSlug: 'chuyen-vien-mi-cv',
    defaultSubtitle: 'Không gian trao đổi đội ngũ Chuyên Viên Kỹ Thuật & Nghệ Nhân Mi',
  },
  {
    key: 'TEAM_TELESALES',
    category: 'team',
    label: '📞 Telesales & Booker',
    shortLabel: 'Telesales / Booker',
    color: '#0ea5e9',
    defaultSlug: 'telesales-booker',
    defaultSubtitle: 'Không gian chiến dịch gọi chăm sóc khách & đặt lịch Booker',
  },
  {
    key: 'TEAM_CS_CONTROL',
    category: 'team',
    label: '🎧 CS & Control',
    shortLabel: 'CS & Control',
    color: '#f59e0b',
    defaultSlug: 'cs-control',
    defaultSubtitle: 'Không gian chăm sóc khách hàng CS & Điều phối Control',
  },
  {
    key: 'TEAM_ACADEMY',
    category: 'team',
    label: '🎓 Giảng Viên Academy',
    shortLabel: 'Giảng viên',
    color: '#8b5cf6',
    defaultSlug: 'giang-vien-academy',
    defaultSubtitle: 'Không gian chuyên môn đội ngũ Giảng Viên & Đào tạo',
  },
  {
    key: 'TEAM_QA_QC',
    category: 'team',
    label: '🏅 QA / QC',
    shortLabel: 'QA / QC',
    color: '#ec4899',
    defaultSlug: 'qa-qc-chat-luong',
    defaultSubtitle: 'Không gian kiểm soát chất lượng dịch vụ & trải nghiệm khách hàng',
  },
  {
    key: 'TEAM_INTERNAL',
    category: 'team',
    label: '🏠 Vận Hành / Nội Bộ',
    shortLabel: 'Vận hành',
    color: '#64748b',
    defaultSlug: 'van-hanh-noi-bo',
    defaultSubtitle: 'Không gian phối hợp vận hành nội bộ & hậu cần',
  },
];

function matchesStaffGroup(member: MosChatStaffMember, groupKey: string): boolean {
  const role = String(member.role || '')
    .toLowerCase()
    .trim();
  const depts = (member.departmentCodes || []).map((d) => d.toUpperCase());
  const teams = (member.teamCodes || []).map((t) => t.toUpperCase());

  switch (groupKey) {
    case 'DEPT_SHOP':
      return (
        depts.includes('SHOP') || ['cc', 'coca', 'consultant', 'cv', 'lt', 'technician', 'ktv', 'qa_qc'].includes(role)
      );
    case 'DEPT_GROWTH':
      return depts.includes('GROWTH') || ['telesales', 'booker', 'oc', 'ls', 'cs', 'control'].includes(role);
    case 'DEPT_ACADEMY':
      return depts.includes('ACADEMY') || ['teacher', 'ht'].includes(role);
    case 'DEPT_BACK_OFFICE':
      return (
        depts.includes('BACK_OFFICE') ||
        [
          'super_admin',
          'admin',
          'boss',
          'manager',
          'fm',
          'cho',
          'staff',
          'office-cleaner',
          'security-guard',
          'rnd',
        ].includes(role)
      );
    case 'TEAM_ADMIN_MANAGER':
      return teams.includes('ADMIN_MANAGER') || ['super_admin', 'admin', 'boss', 'manager', 'fm', 'cho'].includes(role);
    case 'TEAM_CC':
      return teams.includes('CC') || ['cc', 'coca', 'consultant'].includes(role);
    case 'TEAM_CV':
      return teams.includes('CV') || ['cv', 'lt', 'technician', 'ktv'].includes(role);
    case 'TEAM_TELESALES':
      return (
        teams.includes('BK_TELESALES') || teams.includes('BK') || ['telesales', 'booker', 'oc', 'ls'].includes(role)
      );
    case 'TEAM_CS_CONTROL':
      return (
        teams.includes('BK_CS_CONTROL') ||
        teams.includes('BK_CS') ||
        teams.includes('BK_CONTROL') ||
        ['cs', 'control'].includes(role)
      );
    case 'TEAM_ACADEMY':
      return teams.includes('ACADEMY') || teams.includes('MARKETING_SALES') || ['teacher', 'ht'].includes(role);
    case 'TEAM_QA_QC':
      return teams.some((t) => t.startsWith('QA_QC')) || ['qa_qc'].includes(role);
    case 'TEAM_INTERNAL':
      return teams.includes('BACK_OFFICE_STAFF') || ['staff', 'office-cleaner', 'security-guard', 'rnd'].includes(role);
    default:
      return false;
  }
}

export interface MosGoogleChatPortalProps {
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
  currentUser?: SafeAny;
  onAccessChange?: (canAccess: boolean) => void;
  onUnreadCountChange?: (unreadCount: number, activeTaskCount: number) => void;
}

const FALLBACK_CONVERSATIONS: MosChatConversation[] = [
  {
    id: 'space-cc',
    type: 'space',
    name: 'tư-vấn-cc-ca-hôm-nay',
    subtitle: 'Phối hợp đón khách giữa Telesales Booker · Tư Vấn CC · Chuyên Viên Mi',
    roleTag: '12',
    color: '#10b981',
    memberCount: 12,
    unreadCount: 2,
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-seed-1',
        conversationId: 'space-cc',
        senderId: 'staff-tn',
        senderName: 'Tuyết Nhi',
        senderRole: 'Telesales',
        senderAvatar: 'TN',
        roleColor: '#0ea5e9',
        text: 'Chị Nguyễn Bích Ngọc (VIP Diamond) vừa báo sẽ tới sớm lúc 15:15 hôm nay để nối mi Anime Thiết Kế.',
        timeLabel: '14:42',
        createdAt: new Date().toISOString(),
        pinned: true,
        reactions: { '❤️': 3, '🔥': 2 },
        customerCard: {
          name: 'Chị Nguyễn Bích Ngọc',
          meta: 'VIP Diamond · 15:15 hôm nay',
          cvName: 'Chuyên Viên Minh Thư (CV+)',
        },
        thread: [
          {
            id: 'th-seed-1',
            senderId: 'staff-hm',
            senderName: 'Hà My',
            senderRole: 'Tư Vấn (CC)',
            senderAvatar: 'HM',
            text: 'Quầy CC tầng 1 đã nhận thông tin đón chị Ngọc.',
            timeLabel: '14:43',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'th-seed-2',
            senderId: 'staff-mt',
            senderName: 'Chuyên Viên Minh Thư',
            senderRole: 'Chuyên Viên Tự Chủ (CV+)',
            senderAvatar: 'MT',
            text: 'Giường VIP 02 đã khử khuẩn sẵn sàng đón khách.',
            timeLabel: '14:44',
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'msg-seed-2',
        conversationId: 'space-cc',
        senderId: 'staff-hm',
        senderName: 'Hà My',
        senderRole: 'Tư Vấn (CC)',
        senderAvatar: 'HM',
        roleColor: '#10b981',
        text: 'Nhờ chuẩn bị sẵn trà hoa cúc & kiểm tra hồ sơ dáng mi cũ của chị Ngọc trước 15:00.',
        timeLabel: '14:44',
        createdAt: new Date().toISOString(),
        reactions: { '👍': 2 },
        taskId: 'task-seed-101',
        thread: [],
      },
      {
        id: 'msg-seed-3',
        conversationId: 'space-cc',
        senderId: 'staff-mt',
        senderName: 'Chuyên Viên Minh Thư',
        senderRole: 'Chuyên Viên Tự Chủ (CV+)',
        senderAvatar: 'MT',
        roleColor: '#14b8a6',
        text: 'Em vừa xong ca trước, khay dụng cụ mi thiết kế đã khử khuẩn đầy đủ.',
        timeLabel: '14:46',
        createdAt: new Date().toISOString(),
        reactions: { '🎉': 4 },
        thread: [],
      },
    ],
  },
  {
    id: 'space-telesales',
    type: 'space',
    name: 'telesales-booker',
    subtitle: 'Chiến dịch gọi chăm sóc khách Combo Live & Khách cũ quay lại',
    roleTag: '8',
    color: '#f59e0b',
    memberCount: 8,
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-seed-tele-1',
        conversationId: 'space-telesales',
        senderId: 'staff-tn',
        senderName: 'Tuyết Nhi',
        senderRole: 'Telesales',
        senderAvatar: 'TN',
        roleColor: '#0ea5e9',
        text: 'Ca chiều còn 3 khung 16:30 của Chuyên Viên Kỹ Thuật, ưu tiên gọi tệp khách gần hạn dặm mi.',
        timeLabel: '14:15',
        createdAt: new Date().toISOString(),
        reactions: { '🔥': 5 },
        thread: [],
      },
    ],
  },
  {
    id: 'space-cv',
    type: 'space',
    name: 'chuyên-viên-mi-tầng-1',
    subtitle: 'Kênh điều phối tua và chuẩn bị dụng cụ của đội ngũ Chuyên Viên Mi',
    roleTag: '15',
    color: '#14b8a6',
    memberCount: 15,
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-seed-cv-1',
        conversationId: 'space-cv',
        senderId: 'staff-mt',
        senderName: 'Chuyên Viên Minh Thư',
        senderRole: 'Chuyên Viên Tự Chủ (CV+)',
        senderAvatar: 'MT',
        roleColor: '#14b8a6',
        text: 'Nhờ kho bổ sung thêm 5 khay mi cong C 0.07 dài 11mm lên tủ Chuyên Viên tầng 1 trước 16:00.',
        timeLabel: '13:50',
        createdAt: new Date().toISOString(),
        reactions: { '👍': 3 },
        taskId: 'task-seed-102',
        thread: [],
      },
    ],
  },
];

const FALLBACK_TASKS: MosChatTaskItem[] = [
  {
    id: 'task-seed-101',
    conversationId: 'space-cc',
    conversationName: 'tư-vấn-cc-ca-hôm-nay',
    sourceMessageId: 'msg-seed-2',
    sourceAuthorName: 'Hà My',
    title: 'Chuẩn bị trà hoa cúc & kiểm tra hồ sơ dáng mi chị Bích Ngọc',
    assigneeName: 'Hà My (CC)',
    creatorName: 'Danny Do',
    priority: 'URGENT',
    remindAt: new Date(Date.now() + 185 * 1000).toISOString(),
    done: false,
    fired: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-seed-102',
    conversationId: 'space-cv',
    conversationName: 'chuyên-viên-mi-tầng-1',
    sourceMessageId: 'msg-seed-cv-1',
    sourceAuthorName: 'Chuyên Viên Minh Thư',
    title: 'Bổ sung 5 khay mi cong C 0.07 dài 11mm lên tủ Chuyên Viên tầng 1',
    assigneeName: 'Khánh Linh (CS)',
    creatorName: 'Chuyên Viên Minh Thư',
    priority: 'HIGH',
    remindAt: new Date(Date.now() + 900 * 1000).toISOString(),
    done: false,
    fired: false,
    createdAt: new Date().toISOString(),
  },
];

const SAMPLE_CUSTOMER_CARDS: MosChatCustomerCard[] = [
  {
    name: 'Chị Nguyễn Bích Ngọc',
    meta: 'VIP Diamond · 15:15 hôm nay',
    cvName: 'Chuyên Viên Minh Thư (CV+)',
  },
  {
    name: 'Chị Trần Bảo Trân',
    meta: 'Khách Mới · 16:15 Mi Thiết Kế',
    cvName: 'Chuyên Viên Thanh Tâm (CV)',
  },
  {
    name: 'Chị Lê Hoàng Yến',
    meta: 'Cần xác nhận · 17:30 hôm nay',
    cvName: 'Chuyên Viên Ngọc Ánh (CV+)',
  },
];

interface ReminderPreset {
  id: string;
  label: string;
  seconds: number;
  getSeconds: () => number;
}

const REMINDER_PRESETS: ReminderPreset[] = [
  { id: '5s', label: '5 giây (Test)', seconds: 5, getSeconds: () => 5 },
  { id: '15m', label: '15 phút', seconds: 900, getSeconds: () => 900 },
  { id: '30m', label: '30 phút', seconds: 1800, getSeconds: () => 1800 },
  { id: '1h', label: '1 giờ', seconds: 3600, getSeconds: () => 3600 },
  {
    id: '1730',
    label: '17:30 hôm nay',
    seconds: 7200,
    getSeconds: () => {
      const now = dayjs();
      let target = now.hour(17).minute(30).second(0);
      if (target.isBefore(now)) {
        target = target.add(1, 'day');
      }
      return Math.max(10, target.diff(now, 'second'));
    },
  },
  {
    id: '0900',
    label: '09:00 sáng mai',
    seconds: 86400,
    getSeconds: () => {
      const now = dayjs();
      const target = now.add(1, 'day').hour(9).minute(0).second(0);
      return Math.max(10, target.diff(now, 'second'));
    },
  },
];

function playWebAudioReminderChime() {
  try {
    const AudioCtx = window.AudioContext || (window as SafeAny).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [587.33, 880, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.11 + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.11);
      osc.stop(ctx.currentTime + idx * 0.11 + 0.44);
    });
  } catch (_) {}
}

function formatCountdown(remindAtIso: string, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((new Date(remindAtIso).getTime() - nowMs) / 1000));
  if (diffSec <= 0) return '00:00';
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  if (mins >= 60) {
    return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}p`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseGoogleDriveImageFromText(rawText: string): MosChatImageAttachment | null {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return null;
  const match =
    trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{15,})/) ||
    trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]{15,})/) ||
    trimmed.match(/drive\.google\.com\/uc\?(?:export=\w+&)?id=([a-zA-Z0-9_-]{15,})/) ||
    trimmed.match(/drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]{15,})/);
  if (!match) return null;
  const fileId = match[1];
  return {
    id: `drive-${fileId.slice(0, 8)}-${Date.now()}`,
    url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
    name: `Google-Drive-${fileId.slice(0, 6)}.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes: 0,
    source: 'drive',
  };
}

async function readOrCompressImagePayload(
  file: File
): Promise<{ dataBase64: string; mimeType: MosChatImageMimeType; width?: number; height?: number }> {
  if (file.type === 'image/gif') {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Không thể đọc ảnh GIF'));
      reader.readAsDataURL(file);
    });
    return {
      dataBase64: dataUrl.replace(/^data:image\/gif;base64,/i, ''),
      mimeType: 'image/gif',
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Không thể giải mã hình ảnh'));
      el.src = objectUrl;
    });

    const maxDim = 1600;
    let width = img.naturalWidth || img.width || 800;
    let height = img.naturalHeight || img.height || 600;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không khởi tạo được bộ nén ảnh');
    ctx.drawImage(img, 0, 0, width, height);

    let targetMime: MosChatImageMimeType = file.type === 'image/png' ? 'image/png' : 'image/webp';
    let dataUrl = canvas.toDataURL(targetMime, 0.86);
    if (!dataUrl.startsWith(`data:${targetMime};base64,`)) {
      targetMime = 'image/jpeg';
      dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    }

    // If PNG is still > 2.5MB (e.g. Retina screenshot), compress to WebP/JPEG
    if (targetMime === 'image/png' && dataUrl.length > 3_200_000) {
      targetMime = 'image/webp';
      dataUrl = canvas.toDataURL('image/webp', 0.86);
      if (!dataUrl.startsWith('data:image/webp;base64,')) {
        targetMime = 'image/jpeg';
        dataUrl = canvas.toDataURL('image/jpeg', 0.86);
      }
    }

    return {
      dataBase64: dataUrl.replace(/^data:image\/(?:jpeg|png|webp);base64,/i, ''),
      mimeType: targetMime,
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const GOOGLE_CHAT_QUICK_EMOJIS = ['🪽', '💎', '❤️', '👍', '✅'] as const;

const WINGS_SIGNATURE_EMOJIS = [
  '🪽',
  '🪶',
  '🥚',
  '🐣',
  '🐥',
  '🐔',
  '🍗',
  '👼',
  '🍌',
  '💎',
  '👀',
  '🔮',
  '💃',
  '💰',
  '©️',
  '👍',
  '✅',
  '🟢',
  '⚫',
] as const;

const GOOGLE_CHAT_REACTION_EMOJIS = [
  '❤️',
  '🔥',
  '😂',
  '🎉',
  '👏',
  '🙏',
  '💯',
  '🚀',
  '😍',
  '🥰',
  '😎',
  '🤩',
  '🤝',
  '💪',
  '✨',
  '🌸',
  '👑',
  '🫡',
] as const;

export const MosGoogleChatPortal: React.FC<MosGoogleChatPortalProps> = ({
  open,
  onClose,
  onToggle,
  currentUser,
  onAccessChange,
  onUnreadCountChange,
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const isDark = themeMode === 'dark';

  const [conversations, setConversations] = useState<MosChatConversation[]>(FALLBACK_CONVERSATIONS);
  const [tasks, setTasks] = useState<MosChatTaskItem[]>(FALLBACK_TASKS);
  const [staffDirectory, setStaffDirectory] = useState<MosChatStaffMember[]>([]);
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
    const defaults = { panelWidth: 840, sidebarWidth: 264, maximized: false, activeConvId: 'space-cc' };
    if (typeof window === 'undefined') return defaults;
    try {
      const legacyKey = storageKey.replace('mos_chat_personal_layout_v2_', 'mos_chat_personal_layout_v1_');
      const raw =
        window.localStorage.getItem(storageKey) ||
        window.localStorage.getItem('mos_chat_personal_layout_v2_global') ||
        window.localStorage.getItem(legacyKey) ||
        window.localStorage.getItem('mos_chat_personal_layout_v1_default');
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as {
        panelWidth?: number;
        sidebarWidth?: number;
        maximized?: boolean;
        activeConvId?: string;
      };
      const maxAllowed = Math.max(520, (window.innerWidth || 1920) - 56);
      return {
        panelWidth:
          typeof parsed.panelWidth === 'number' && Number.isFinite(parsed.panelWidth)
            ? Math.max(520, Math.min(maxAllowed, Math.round(parsed.panelWidth)))
            : defaults.panelWidth,
        sidebarWidth:
          typeof parsed.sidebarWidth === 'number' && Number.isFinite(parsed.sidebarWidth)
            ? Math.max(190, Math.min(460, Math.round(parsed.sidebarWidth)))
            : defaults.sidebarWidth,
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
  const [isResizingTarget, setIsResizingTarget] = useState<'panel' | 'sidebar' | null>(null);
  const [hoverResizeHandle, setHoverResizeHandle] = useState<'panel' | 'sidebar' | null>(null);
  const [presence, setPresence] = useState<MosChatPresenceStatus>('active');
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });
  const [mobileActiveView, setMobileActiveView] = useState<'inbox' | 'conversation' | 'thread'>('inbox');
  const [mobileActionOpen, setMobileActionOpen] = useState<boolean>(false);

  useEffect(() => {
    setMobileActionOpen(false);
  }, [activeConvId]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const panelWidthRef = useRef<number>(panelWidth);
  const sidebarWidthRef = useRef<number>(sidebarWidth);
  const maximizedRef = useRef<boolean>(maximized);
  const activeConvIdRef = useRef<string>(activeConvId);

  useEffect(() => {
    panelWidthRef.current = panelWidth;
  }, [panelWidth]);
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);
  useEffect(() => {
    maximizedRef.current = maximized;
  }, [maximized]);
  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  const persistPersonalLayout = useCallback(
    (patch?: Partial<{ panelWidth: number; sidebarWidth: number; maximized: boolean; activeConvId: string }>) => {
      if (typeof window === 'undefined') return;
      const next = {
        panelWidth: patch?.panelWidth ?? panelWidthRef.current,
        sidebarWidth: patch?.sidebarWidth ?? sidebarWidthRef.current,
        maximized: patch?.maximized ?? maximizedRef.current,
        activeConvId: patch?.activeConvId ?? activeConvIdRef.current,
        updatedAt: Date.now(),
      };
      try {
        const serialized = JSON.stringify(next);
        window.localStorage.setItem(personalLayoutStorageKey, serialized);
        window.localStorage.setItem('mos_chat_personal_layout_v2_global', serialized);
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
      }
    };

    const handleMouseUp = () => {
      persistPersonalLayout();
      setIsResizingTarget(null);
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

  // ================= MOS CHAT & WINGS AI COPILOT ACCESS CONTROL (DEPARTMENT / TEAM / INDIVIDUAL) =================
  const isDannyAccount = useMemo(() => {
    const isCanon = isCanonicalSuperAdminIdentity({ username: currentUser?.username, email: currentUser?.email });
    const roleLower = String(currentUser?.role || '')
      .toLowerCase()
      .trim();
    return isCanon || roleLower === 'super_admin' || roleLower === 'admin';
  }, [currentUser?.username, currentUser?.email, currentUser?.role]);

  const [accessConfig, setAccessConfig] = useState<MosChatAccessConfig>({
    allowAllStaff: false,
    allowedGroupKeys: ['TEAM_ADMIN_MANAGER'],
    allowedStaffIds: [],
    aiCopilotAllowedGroupKeys: [],
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
  const aiHydratedRef = useRef<boolean>(false);

  const buildInitialAiWelcomeMessage = useCallback((): MosChatMessage => {
    const userDisplayName = currentUser?.displayName || currentUser?.username || 'Anh Danny';
    return {
      id: 'msg-ai-welcome',
      conversationId: AI_COPILOT_CONV_ID,
      senderId: 'wings-ai-copilot',
      senderName: '🤖 Wings AI Copilot',
      senderRole: 'AI Copilot',
      senderAvatar: 'AI',
      roleColor: '#8b5cf6',
      isAiBot: true,
      text:
        `Xin chào ${userDisplayName}! Tôi là **Wings AI Copilot** đã được tích hợp trực tiếp vào **mOS Chat**.\n` +
        '• **Kênh 1-1 riêng tư**: Mọi trao đổi và phân tích dữ liệu tại đây chỉ một mình bạn nhìn thấy.\n' +
        '• **Gọi @AI trong #Space**: Gõ `@AI` hoặc `@copilot` kèm câu hỏi trong bất kỳ nhóm Space nào để tôi phân tích và trả lời công khai cho cả nhóm.',
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
          setAiMessages(parsedAi.messages);
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

  // Mini Docked Pop-out Windows (Bottom right like Gmail)
  const [dockedConvIds, setDockedConvIds] = useState<string[]>([]);
  const [collapsedDockIds, setCollapsedDockIds] = useState<Record<string, boolean>>({});
  const [dockInputs, setDockInputs] = useState<Record<string, string>>({});
  const [dockAttachments, setDockAttachments] = useState<Record<string, MosChatImageAttachment[]>>({});

  // Image Upload / Google Drive Modal / Full-Screen Lightbox state
  const [uploadingCount, setUploadingCount] = useState<number>(0);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
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

  // Task & Reminder Creation Modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalSourceMsg, setTaskModalSourceMsg] = useState<MosChatMessage | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('Hà My (CC)');
  const [taskPriority, setTaskPriority] = useState<MosChatTaskPriority>('HIGH');
  const [taskRemindMode, setTaskRemindMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('5s');
  const [taskRemindSeconds, setTaskRemindSeconds] = useState<number>(5);
  const [customRemindDate, setCustomRemindDate] = useState<dayjs.Dayjs | null>(null);

  // New Space / DM Modal
  const [newRoomModalOpen, setNewRoomModalOpen] = useState(false);
  const [newRoomType, setNewRoomType] = useState<'space' | 'dm'>('space');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomSubtitle, setNewRoomSubtitle] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomGroupFilter, setRoomGroupFilter] = useState<string>('ALL');

  // Space Members Management Modal
  const [spaceMembersModalOpen, setSpaceMembersModalOpen] = useState(false);
  const [addMemberSelectedStaffId, setAddMemberSelectedStaffId] = useState<number | null>(null);

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
    setUserPrefs(readStoredUserSidebarPrefs(userSidebarPrefsStorageKey));
  }, [userSidebarPrefsStorageKey, readStoredUserSidebarPrefs]);

  // Live Reminder Alert Toast & IME Composition Guards
  const [activeAlertTask, setActiveAlertTask] = useState<MosChatTaskItem | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const firedTaskIdsRef = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  const threadInputRef = useRef<HTMLInputElement | null>(null);
  const dockInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const isComposingRef = useRef<boolean>(false);
  const lastCompositionEndMsRef = useRef<number>(0);
  const lastSentRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const lastVersionRef = useRef<number>(0);

  const notifyLivePeers = useCallback(() => {
    try {
      broadcastChannelRef.current?.postMessage({ type: 'MOS_CHAT_SYNC', ts: Date.now() });
    } catch (_) {}
  }, []);

  const updateUserSidebarPrefs = useCallback(
    (updater: (prev: MosChatUserSidebarPrefs) => MosChatUserSidebarPrefs) => {
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
        apiClient.chat.updateUserPrefs(next).catch(() => {});
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
        const res = await apiClient.chat.bootstrap(
          { sinceVersion: forceFull ? undefined : lastVersionRef.current || undefined },
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
            const serverTs = res.userPrefs?.updatedAt ? new Date(res.userPrefs.updatedAt).getTime() : 0;
            const localTs = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
            const hasServerCustomizations =
              (res.userPrefs?.pinnedIds?.length || 0) > 0 ||
              (res.userPrefs?.mutedIds?.length || 0) > 0 ||
              (res.userPrefs?.hiddenIds?.length || 0) > 0 ||
              (res.userPrefs?.customSections?.length || 0) > 0;
            if ((!prev.updatedAt && hasServerCustomizations) || (serverTs > localTs && hasServerCustomizations)) {
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
        if (res?.unchanged) {
          return;
        }
        if (res?.version) {
          lastVersionRef.current = res.version;
        }
        if (Array.isArray(res?.conversations)) {
          setConversations(res.conversations);
        }
        if (res?.tasks) {
          setTasks(res.tasks);
        }
        if (res?.staffDirectory) {
          setStaffDirectory(res.staffDirectory);
        }
      } catch (_) {
        // Fallback state already initialized
      }
    },
    [userSidebarPrefsStorageKey]
  );

  useEffect(() => {
    fetchBootstrap();
    const pollIntervalMs = open || dockedConvIds.length > 0 ? 4000 : 25000;
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchBootstrap();
      }
    }, pollIntervalMs);
    return () => clearInterval(interval);
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggle, lightboxImage]);

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
   * Strict Direct Message Privacy Guard:
   * - A 1-1 Direct Message (`type === 'dm'`) is ONLY visible to the 2 participants (`memberIds.includes(myStaffId)`).
   * - A Self-Chat (`isSelf`) is ONLY visible to its single owner.
   * - Other users are strictly prevented from seeing someone else's Direct Message.
   */
  const isConversationVisibleToCurrentUser = useCallback(
    (conv: MosChatConversation): boolean => {
      if (conv.type !== 'dm') return true;
      if (conv.id === AI_COPILOT_CONV_ID) return canUseAiCopilot;
      const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
      if (myStaffId <= 0) return false;
      const convIdStr = String(conv.id || '');
      if (convIdStr === 'dm-tuyetnhi' || convIdStr === 'dm-hamy') return false;
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
    },
    [canUseAiCopilot, currentUserStaffMember.id, currentUser?.id]
  );

  const visibleConversations = useMemo(
    () => conversations.filter(isConversationVisibleToCurrentUser),
    [conversations, isConversationVisibleToCurrentUser]
  );

  const getEffectiveUnreadCount = useCallback(
    (conv: MosChatConversation): number => {
      const manualUnread = (userPrefs.manualUnreadIds || []).includes(conv.id);
      if (manualUnread) return Math.max(1, conv.unreadCount || 0);
      return conv.unreadCount || 0;
    },
    [userPrefs.manualUnreadIds]
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

  // Listen to global custom event 'mos-chat:open' (e.g. clicking an online colleague avatar on Header)
  useEffect(() => {
    const handleGlobalChatOpen = async (ev: Event) => {
      const customEv = ev as CustomEvent<{
        conversationId?: string;
        participantStaffId?: number;
        participantName?: string;
        customerCard?: MosChatCustomerCard;
      }>;
      const detail = customEv.detail || {};
      if (detail.conversationId && visibleConversations.some((c) => c.id === detail.conversationId)) {
        setActiveConvId(detail.conversationId);
        setActiveSubtab('chat');
        if (isMobile) setMobileActiveView('conversation');
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

  // Report unread & active task counts up to Header
  useEffect(() => {
    const totalUnread = visibleConversations.reduce((sum, c) => {
      if ((userPrefs.mutedIds || []).includes(c.id)) return sum;
      return sum + getEffectiveUnreadCount(c);
    }, 0);
    const openTaskCount = tasks.filter((t) => !t.done).length;
    onUnreadCountChange?.(totalUnread, openTaskCount);
  }, [visibleConversations, tasks, userPrefs.mutedIds, getEffectiveUnreadCount, onUnreadCountChange]);

  const triggerTaskReminderAlert = useCallback(
    async (task: MosChatTaskItem) => {
      firedTaskIdsRef.current.add(task.id);
      const isConvMuted = (userPrefs.mutedIds || []).includes(task.conversationId);
      if (presence !== 'dnd' && !isConvMuted) {
        playWebAudioReminderChime();
      }
      setActiveAlertTask(task);
      const nowStr = dayjs().format('HH:mm');
      const reminderMsg: MosChatMessage = {
        id: `msg-rem-${Date.now()}`,
        conversationId: task.conversationId,
        senderId: 'system-reminder',
        senderName: 'mOS Reminder',
        senderRole: 'Auto',
        senderAvatar: 'AL',
        roleColor: '#f59e0b',
        text: `Đến giờ nhắc việc: "${task.title}" (@${task.assigneeName})`,
        timeLabel: nowStr,
        createdAt: new Date().toISOString(),
        taskId: task.id,
        isSystemReminder: true,
        reactions: {},
        thread: [],
      };

      setConversations((prev) =>
        prev.map((c) => (c.id === task.conversationId ? { ...c, messages: [...c.messages, reminderMsg] } : c))
      );

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
      tasks.forEach((t) => {
        if (!t.done && !t.fired && !firedTaskIdsRef.current.has(t.id)) {
          const remainMs = new Date(t.remindAt).getTime() - currentNow;
          if (remainMs <= 0) {
            triggerTaskReminderAlert(t);
          }
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [tasks, triggerTaskReminderAlert]);

  const aiCopilotConversation = useMemo<MosChatConversation | null>(() => {
    if (!canUseAiCopilot) return null;
    return {
      id: AI_COPILOT_CONV_ID,
      type: 'dm',
      name: '🤖 Wings AI Copilot',
      subtitle: 'Trợ lý AI Đa Nhiệm · Tra cứu dữ liệu & Phân tích riêng tư',
      roleTag: 'AI Copilot',
      color: '#8b5cf6',
      avatar: 'AI',
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

  const sortConversationsForSection = useCallback(
    (items: MosChatConversation[], sectionId: string): MosChatConversation[] => {
      const pinnedSet = new Set(userPrefs.pinnedIds || []);
      const orderArr = userPrefs.conversationOrder?.[sectionId] || [];
      const orderMap = new Map<string, number>();
      orderArr.forEach((id, idx) => orderMap.set(id, idx));

      return [...items].sort((a, b) => {
        const aPinned = pinnedSet.has(a.id) ? 1 : 0;
        const bPinned = pinnedSet.has(b.id) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
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

  const selectConversation = (convId: string) => {
    setActiveConvId(convId);
    setActiveSubtab('chat');
    if (isMobile) {
      setMobileActiveView('conversation');
    }
    if (convId !== AI_COPILOT_CONV_ID) {
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c)));
    }
    const targetConv = allUserConversations.find((c) => c.id === convId);
    if ((userPrefs.manualUnreadIds || []).includes(convId) || (userPrefs.hiddenIds || []).includes(convId)) {
      updateUserSidebarPrefs((prev) => ({
        ...prev,
        manualUnreadIds: (prev.manualUnreadIds || []).filter((id) => id !== convId),
        hiddenIds: (prev.hiddenIds || []).filter((id) => id !== convId),
        readMessageCountByConv: {
          ...(prev.readMessageCountByConv || {}),
          [convId]: targetConv?.messages?.length || 0,
        },
      }));
    }
  };

  // ================= GOOGLE CHAT WORKSPACE PERSONAL SIDEBAR ACTIONS =================
  const togglePinConversation = useCallback(
    (convId: string) => {
      updateUserSidebarPrefs((prev) => {
        const exists = (prev.pinnedIds || []).includes(convId);
        const nextPinned = exists
          ? (prev.pinnedIds || []).filter((id) => id !== convId)
          : [convId, ...(prev.pinnedIds || [])];
        antdMessage.success(exists ? 'Đã bỏ ghim cuộc trò chuyện' : 'Đã ghim cuộc trò chuyện lên đầu mục');
        return { ...prev, pinnedIds: nextPinned };
      });
    },
    [updateUserSidebarPrefs]
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
      const currentlyUnread = getEffectiveUnreadCount(conv) > 0;
      if (currentlyUnread) {
        setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)));
        updateUserSidebarPrefs((prev) => ({
          ...prev,
          manualUnreadIds: (prev.manualUnreadIds || []).filter((id) => id !== conv.id),
          readMessageCountByConv: {
            ...(prev.readMessageCountByConv || {}),
            [conv.id]: conv.messages.length,
          },
        }));
        antdMessage.success('Đã đánh dấu đã đọc');
      } else {
        updateUserSidebarPrefs((prev) => ({
          ...prev,
          manualUnreadIds: Array.from(new Set([...(prev.manualUnreadIds || []), conv.id])),
        }));
        antdMessage.success('Đã đánh dấu chưa đọc');
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
      updateUserSidebarPrefs((prev) => ({
        ...prev,
        conversationOrder: {
          ...(prev.conversationOrder || {}),
          [sectionId]: nextOrder,
        },
      }));
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

  const handleProcessImageFiles = useCallback(
    async (
      files: FileList | File[],
      source: 'clipboard' | 'drive' | 'upload',
      scope: 'main' | 'thread' | 'dock' = 'main',
      convId?: string
    ) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
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
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) pastedImages.push(file);
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
    antdMessage.success('Đã làm mới phiên hội thoại riêng tư với Wings AI Copilot');
  }, [buildInitialAiWelcomeMessage]);

  const handleExecuteAiAction = useCallback((action: NonNullable<MosChatMessage['aiAction']>, msgId: string) => {
    if (typeof window !== 'undefined' && action.payload) {
      window.dispatchEvent(new CustomEvent('mos-ai-copilot-apply-customer-filter', { detail: action.payload }));
    }
    setAppliedActionIds((prev) => ({ ...prev, [msgId]: true }));
    antdMessage.success(`Đã kích hoạt: ${action.label}`);
  }, []);

  const handleSpeakAiMessage = useCallback(
    (msg: MosChatMessage) => {
      if (speakingMsgId === msg.id) {
        stopSpeaking();
        setSpeakingMsgId(null);
        return;
      }
      stopSpeaking();
      setSpeakingMsgId(msg.id);
      speakText(msg.text, {
        onEnd: () => {
          setSpeakingMsgId((prev) => (prev === msg.id ? null : prev));
        },
      });
    },
    [speakingMsgId]
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

    // CASE 1: Private 1-1 Chat with 🤖 Wings AI Copilot (100% personal)
    if (targetConvId === AI_COPILOT_CONV_ID) {
      setAiMessages((prev) => [...prev, optimisticMsg]);
      setAiThinkingActive(true);
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
          senderName: '🤖 Wings AI Copilot',
          senderRole: 'AI Copilot',
          senderAvatar: 'AI',
          roleColor: '#8b5cf6',
          isAiBot: true,
          text: aiRes?.message?.content || 'Tôi đã xử lý yêu cầu của bạn.',
          aiThinking: aiRes?.message?.thinking || null,
          aiAction: aiRes?.message?.suggestedAction || null,
          timeLabel: dayjs().format('HH:mm'),
          createdAt: new Date().toISOString(),
          reactions: {},
          thread: [],
        };
        setAiMessages((prev) => [...prev, botMsg]);
      } catch (err: SafeAny) {
        const fallbackErr: MosChatMessage = {
          id: `msg-ai-err-${Date.now()}`,
          conversationId: AI_COPILOT_CONV_ID,
          senderId: 'wings-ai-copilot',
          senderName: '🤖 Wings AI Copilot',
          senderRole: 'AI Copilot',
          senderAvatar: 'AI',
          roleColor: '#8b5cf6',
          isAiBot: true,
          text: err?.response?.data?.message || 'Hiện kết nối AI đang bận, bạn vui lòng thử lại sau giây lát nhé.',
          timeLabel: dayjs().format('HH:mm'),
          createdAt: new Date().toISOString(),
          reactions: {},
          thread: [],
        };
        setAiMessages((prev) => [...prev, fallbackErr]);
      } finally {
        setAiThinkingActive(false);
      }
      return;
    }

    // CASE 2: Standard Space / 1-1 Conversation (plus @AI / @copilot trigger for authorized users)
    setConversations((prev) =>
      prev.map((c) => (c.id === targetConvId ? { ...c, messages: [...c.messages, optimisticMsg] } : c))
    );

    try {
      const res = await apiClient.chat.sendMessage({
        conversationId: targetConvId,
        text: optimisticMsg.text,
        customerCard: customerCard || null,
        attachments: cleanAttachments,
      });
      if (res?.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === targetConvId ? res.conversation : c)));
      }
      notifyLivePeers();
    } catch (_) {}

    // If user is authorized to use AI Copilot and tagged @AI or @copilot in the message, invoke AI and post reply publicly to this room!
    if (canUseAiCopilot && /(?:^|\s)@(?:ai|copilot)\b/i.test(text)) {
      const cleanedPrompt =
        text.replace(/(?:^|\s)@(?:ai|copilot)\b/gi, '').trim() || 'Hãy phân tích nội dung trên giúp nhóm.';
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
        const aiReplyText = aiRes?.message?.content || 'Tôi đã phân tích xong thông tin cho nhóm.';
        const postedAi = await apiClient.chat.sendMessage({
          conversationId: targetConvId,
          text: aiReplyText,
          isAiBot: true,
          aiThinking: aiRes?.message?.thinking || null,
          aiAction: aiRes?.message?.suggestedAction || null,
        });
        if (postedAi?.conversation) {
          setConversations((prev) => prev.map((c) => (c.id === targetConvId ? postedAi.conversation : c)));
        }
        notifyLivePeers();
      } catch (_) {
        // ignore space AI error
      } finally {
        setAiThinkingActive(false);
      }
    }
  };

  const handleSendMain = async () => {
    if (!activeConversation) return;
    const text = composerText;
    const attachmentsToSend = stagedAttachments;
    if (!text.trim() && attachmentsToSend.length === 0) return;

    setComposerText('');
    setStagedAttachments([]);
    if (composerInputRef.current) {
      composerInputRef.current.value = '';
    }
    await handleSendMessage(activeConversation.id, text, null, attachmentsToSend);
  };

  const handleSendQuickCustomerCard = async () => {
    if (!activeConversation) return;
    const card = SAMPLE_CUSTOMER_CARDS[sampleCardIndex % SAMPLE_CUSTOMER_CARDS.length];
    setSampleCardIndex((prev) => prev + 1);
    await handleSendMessage(activeConversation.id, `Lưu ý hỗ trợ chu đáo khách hàng ${card.name}:`, card);
    antdMessage.success(`Đã đính kèm thẻ khách hàng ${card.name}`);
  };

  const currentUserReactionKey = String(currentUser?.id || 'me');

  const hasUserReacted = (m: MosChatMessage | undefined, emoji: string): boolean => {
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

  const applyReactionToggleToMessage = (m: MosChatMessage, emoji: string): MosChatMessage => {
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

  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!activeConversation) return;
    if (activeConversation.id === AI_COPILOT_CONV_ID) {
      setAiMessages((prev) => prev.map((m) => (m.id === msgId ? applyReactionToggleToMessage(m, emoji) : m)));
      return;
    }
    const targetConvId = activeConversation.id;
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

  const handleOpenThread = (msgId: string) => {
    setActiveThreadMsgId(msgId);
    setThreadOpen(true);
    if (isMobile) {
      setMobileActiveView('thread');
    }
  };

  const handleSendThreadReply = async () => {
    const text = threadInput.trim();
    const attachmentsToSend = threadAttachments;
    if ((!text && attachmentsToSend.length === 0) || !activeConversation || !activeThreadMsgId) return;
    setThreadInput('');
    setThreadAttachments([]);

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
            m.id === activeThreadMsgId ? { ...m, thread: [...(m.thread || []), newReply] } : m
          ),
        };
      })
    );

    try {
      await apiClient.chat.sendThreadReply({
        conversationId: activeConversation.id,
        messageId: activeThreadMsgId,
        text,
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      });
      notifyLivePeers();
    } catch (_) {}
  };

  const openTaskModalFromMessage = (msg: MosChatMessage | null) => {
    setTaskModalSourceMsg(msg);
    setTaskTitle(msg ? msg.text : composerText.trim() || 'Kiểm tra lịch hẹn & chuẩn bị đón khách VIP');
    setTaskRemindMode('preset');
    setSelectedPresetId('5s');
    setTaskRemindSeconds(5);
    setCustomRemindDate(dayjs().add(1, 'hour').minute(0).second(0));
    setTaskModalOpen(true);
  };

  const handleConfirmCreateTask = async () => {
    const cleanTitle = taskTitle.trim();
    if (!cleanTitle || !activeConversation) return;

    let remindAtIso: string;
    let remindSecondsToSend: number;

    if (taskRemindMode === 'custom' && customRemindDate && customRemindDate.isValid()) {
      remindAtIso = customRemindDate.toISOString();
      const diffSec = customRemindDate.diff(dayjs(), 'second');
      remindSecondsToSend = Math.max(3, diffSec);
    } else {
      remindAtIso = new Date(Date.now() + taskRemindSeconds * 1000).toISOString();
      remindSecondsToSend = taskRemindSeconds;
    }

    const tempTaskId = `task-${Date.now()}`;
    const newTask: MosChatTaskItem = {
      id: tempTaskId,
      conversationId: activeConversation.id,
      conversationName: activeConversation.name,
      sourceMessageId: taskModalSourceMsg?.id || null,
      sourceAuthorName: taskModalSourceMsg?.senderName || currentUser?.displayName || 'Danny Do',
      title: cleanTitle,
      assigneeName: taskAssignee,
      creatorName: currentUser?.displayName || 'Danny Do',
      priority: taskPriority,
      remindAt: remindAtIso,
      done: false,
      fired: false,
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);
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
    } else {
      const taskMsg: MosChatMessage = {
        id: `msg-task-${Date.now()}`,
        conversationId: activeConversation.id,
        senderId: currentUser?.id || 'me',
        senderName: currentUser?.displayName || 'Danny Do',
        senderRole: 'Super Admin',
        senderAvatar: 'DD',
        roleColor: '#d4a84b',
        text: `Giao việc cho ${taskAssignee}:`,
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
    antdMessage.success(`Đã tạo Task & bật nhắc hẹn (${taskAssignee})`);

    try {
      await apiClient.chat.createTask({
        conversationId: activeConversation.id,
        sourceMessageId: taskModalSourceMsg?.id || null,
        title: cleanTitle,
        assigneeName: taskAssignee,
        priority: taskPriority,
        remindInSeconds: remindSecondsToSend,
        remindAt: remindAtIso,
      });
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
    setNewRoomModalOpen(false);
    setNewRoomName('');
    setNewRoomSubtitle('');
    const memberIds = [...selectedMemberIds];
    setSelectedMemberIds([]);
    try {
      const res = await apiClient.chat.createConversation({
        type: 'space',
        name: cleanName,
        subtitle: newRoomSubtitle.trim() || undefined,
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
      antdMessage.error('Không thể tạo Không gian');
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

  const activeThreadMessage = useMemo(() => {
    if (!activeConversation) return null;
    return (
      activeConversation.messages.find((m) => m.id === activeThreadMsgId) || activeConversation.messages[0] || null
    );
  }, [activeConversation, activeThreadMsgId]);

  const assigneeOptions = useMemo(() => {
    const defaults = [
      { value: 'Danny Do', label: 'Danny Do (Tôi)' },
      { value: 'Hà My (CC)', label: 'Hà My (Tư Vấn CC)' },
      { value: 'Tuyết Nhi', label: 'Tuyết Nhi (Telesales)' },
      { value: 'Chuyên Viên Minh Thư (CV+)', label: 'Chuyên Viên Minh Thư (CV+)' },
      { value: 'Khánh Linh (CS)', label: 'Khánh Linh (CSKH)' },
    ];
    const existingSet = new Set(defaults.map((d) => d.value));
    staffDirectory.forEach((s) => {
      if (!existingSet.has(s.displayName)) {
        existingSet.add(s.displayName);
        defaults.push({ value: s.displayName, label: `${s.displayName} (${s.role})` });
      }
    });
    return defaults;
  }, [staffDirectory]);

  const surfaceBg = isDark ? '#111827' : '#ffffff';
  const surfaceRaised = isDark ? '#1a2333' : '#f8fafc';
  const canvasBg = isDark ? '#0d1322' : '#ffffff';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';
  const borderStrong = isDark ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1';

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

  const renderStagedAttachmentsStrip = (
    items: MosChatImageAttachment[],
    scope: 'main' | 'thread' | 'dock',
    convId?: string
  ) => {
    const showUploading = scope === 'main' && uploadingCount > 0;
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

  const renderReactionPickerContent = (msgId: string, msgObj?: MosChatMessage) => (
    <div
      data-no-chat-autofocus="true"
      onClick={(e) => e.stopPropagation()}
      className="p-1.5 space-y-2 select-none"
      style={{ width: 316 }}
    >
      <div>
        <div className="px-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
          Nhóm Wings Đặc Trưng
        </div>
        <div className="grid grid-cols-9 gap-1">
          {WINGS_SIGNATURE_EMOJIS.map((emoji) => {
            const reactedByMe = hasUserReacted(msgObj, emoji);
            return (
              <Tooltip
                key={`wings-${emoji}`}
                title={reactedByMe ? `Đã thả ${emoji} · Nhấn để gỡ (Undo)` : `Thả ${emoji}`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleReaction(msgId, emoji)}
                  className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[18px] cursor-pointer transition-transform hover:scale-125 hover:bg-black/5 dark:hover:bg-white/10"
                  style={{
                    background: reactedByMe ? 'rgba(212, 168, 75, 0.22)' : 'transparent',
                    boxShadow: reactedByMe ? 'inset 0 0 0 1px rgba(212, 168, 75, 0.55)' : 'none',
                  }}
                >
                  {emoji}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${borderColor}` }} className="pt-1.5">
        <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Cảm xúc phổ biến</div>
        <div className="grid grid-cols-9 gap-1">
          {GOOGLE_CHAT_REACTION_EMOJIS.map((emoji) => {
            const reactedByMe = hasUserReacted(msgObj, emoji);
            return (
              <Tooltip
                key={`gchat-${emoji}`}
                title={reactedByMe ? `Đã thả ${emoji} · Nhấn để gỡ (Undo)` : `Thả ${emoji}`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleReaction(msgId, emoji)}
                  className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[18px] cursor-pointer transition-transform hover:scale-125 hover:bg-black/5 dark:hover:bg-white/10"
                  style={{
                    background: reactedByMe ? 'rgba(212, 168, 75, 0.22)' : 'transparent',
                    boxShadow: reactedByMe ? 'inset 0 0 0 1px rgba(212, 168, 75, 0.55)' : 'none',
                  }}
                >
                  {emoji}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderComposerEmojiPickerContent = () => (
    <div
      data-no-chat-autofocus="true"
      onClick={(e) => e.stopPropagation()}
      className="p-1.5 space-y-2 select-none"
      style={{ width: 316 }}
    >
      <div>
        <div className="px-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
          Chèn biểu tượng Wings
        </div>
        <div className="grid grid-cols-9 gap-1">
          {WINGS_SIGNATURE_EMOJIS.map((emoji) => (
            <button
              key={`comp-wings-${emoji}`}
              type="button"
              onClick={() => {
                setComposerText((prev) => `${prev}${emoji}`);
                composerInputRef.current?.focus();
              }}
              className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[18px] cursor-pointer transition-transform hover:scale-125 hover:bg-black/5 dark:hover:bg-white/10"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${borderColor}` }} className="pt-1.5">
        <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Cảm xúc phổ biến</div>
        <div className="grid grid-cols-9 gap-1">
          {GOOGLE_CHAT_REACTION_EMOJIS.map((emoji) => (
            <button
              key={`comp-gchat-${emoji}`}
              type="button"
              onClick={() => {
                setComposerText((prev) => `${prev}${emoji}`);
                composerInputRef.current?.focus();
              }}
              className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[18px] cursor-pointer transition-transform hover:scale-125 hover:bg-black/5 dark:hover:bg-white/10"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (!canUserAccessChat) {
    return null;
  }

  return (
    <>
      {/* Hidden File Input for Local Drive & Google Drive Desktop Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const target = uploadTargetRef.current;
            void handleProcessImageFiles(e.target.files, 'upload', target.scope, target.convId);
          }
        }}
      />

      {/* ================= GOOGLE CHAT RIGHT WORKSPACE PANEL (FHD, VECTOR ICONS + TOOLTIPS) ================= */}
      <section
        aria-label="mOS Google Chat Workspace"
        style={{
          position: 'fixed',
          top: isMobile ? 0 : 52,
          right: 0,
          bottom: 0,
          left: isMobile ? 0 : undefined,
          width: isMobile ? '100vw' : maximized ? 'calc(100vw - 224px)' : panelWidth,
          maxWidth: isMobile ? '100vw' : 'calc(100vw - 56px)',
          background: surfaceBg,
          borderLeft: isMobile
            ? 'none'
            : `1px solid ${isResizingTarget === 'panel' || hoverResizeHandle === 'panel' ? '#d4a84b' : borderStrong}`,
          boxShadow: isDark ? '0 24px 56px rgba(0, 0, 0, 0.65)' : '0 20px 48px rgba(15, 23, 42, 0.15)',
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
            title="Kéo sang trái/phải để thay đổi kích thước khung Chat (Tự động lưu riêng cho bạn · Nhấp đúp để đặt lại 840px)"
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
                maximizedRef.current = false;
                panelWidthRef.current = 840;
                setMaximized(false);
                setPanelWidth(840);
                persistPersonalLayout({ maximized: false, panelWidth: 840 });
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
                      ? '#d4a84b'
                      : isDark
                        ? 'rgba(148, 163, 184, 0.32)'
                        : 'rgba(100, 116, 139, 0.28)',
                  boxShadow: isResizingTarget === 'panel' ? '0 0 10px rgba(212, 168, 75, 0.65)' : 'none',
                }}
              />
              {isResizingTarget === 'panel' && (
                <div
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums shadow-lg pointer-events-none"
                  style={{
                    position: 'absolute',
                    left: -64,
                    background: '#111827',
                    color: '#d4a84b',
                    border: '1px solid rgba(212, 168, 75, 0.45)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {panelWidth}px
                </div>
              )}
            </div>
          </Tooltip>
        )}

        {/* LEFT COLUMN: NAVIGATION, FILTERS, 1-1 & SPACES */}
        <div
          style={{
            position: 'relative',
            width: isMobile ? '100%' : sidebarWidth,
            borderRight: isMobile
              ? 'none'
              : `1px solid ${
                  isResizingTarget === 'sidebar' || hoverResizeHandle === 'sidebar' ? '#d4a84b' : borderColor
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
                  }}
                  className="h-7 rounded-md inline-flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer"
                  style={{
                    background: sidebarFilter === 'all' && activeSubtab !== 'tasks' ? surfaceBg : 'transparent',
                    color: sidebarFilter === 'all' && activeSubtab !== 'tasks' ? '#d4a84b' : token.colorTextSecondary,
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
                  onClick={() => setActiveSubtab('tasks')}
                  className="h-7 rounded-md inline-flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer tabular-nums"
                  style={{
                    background: activeSubtab === 'tasks' ? surfaceBg : 'transparent',
                    color: activeSubtab === 'tasks' ? '#d4a84b' : token.colorTextSecondary,
                  }}
                >
                  <AlarmClock size={14} />
                  <span>{tasks.filter((t) => !t.done).length}</span>
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
                        <span className="text-[9.5px] text-slate-500 tabular-nums shrink-0">({sec.totalCount})</span>
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
                      sec.items.map((conv, itemIdx) => {
                        const isAiConv = conv.id === AI_COPILOT_CONV_ID;
                        const isSelfConv = Boolean(conv.isSelf || conv.id.startsWith('dm-self-'));
                        const isSpace = conv.type === 'space';
                        const lastMsg = conv.messages[conv.messages.length - 1];
                        const isSelected = conv.id === activeConversation?.id;
                        const isPinned = (userPrefs.pinnedIds || []).includes(conv.id);
                        const isMuted = (userPrefs.mutedIds || []).includes(conv.id);
                        const effUnread = getEffectiveUnreadCount(conv);
                        const isConvMenuOpen = openConvMenuId === conv.id;
                        const currentCustomSec = (userPrefs.customSections || []).find((cs) =>
                          (cs.conversationIds || []).includes(conv.id)
                        );
                        const previewText =
                          lastMsg?.text ||
                          (lastMsg?.attachments?.length ? `Hình ảnh (${lastMsg.attachments.length})` : conv.subtitle);

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
                              {effUnread > 0 ? <MailOpen size={13} /> : <Mail size={13} className="text-rose-500" />}
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
                          <div
                            key={conv.id}
                            onClick={() => selectConversation(conv.id)}
                            className="group/conv relative flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer mb-0.5 transition-colors"
                            style={{
                              background: isSelected
                                ? isAiConv
                                  ? 'rgba(139, 92, 246, 0.18)'
                                  : isSelfConv
                                    ? 'rgba(99, 102, 241, 0.18)'
                                    : 'rgba(59, 130, 246, 0.14)'
                                : isAiConv
                                  ? 'rgba(139, 92, 246, 0.07)'
                                  : isSelfConv
                                    ? 'rgba(99, 102, 241, 0.06)'
                                    : 'transparent',
                              border: isAiConv
                                ? '1px solid rgba(139, 92, 246, 0.28)'
                                : isSelfConv
                                  ? '1px solid rgba(99, 102, 241, 0.25)'
                                  : '1px solid transparent',
                              opacity: isMuted && !isSelected ? 0.72 : 1,
                            }}
                          >
                            {isSpace ? (
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: `${conv.color}22`, color: conv.color }}
                              >
                                <Hash size={16} />
                              </div>
                            ) : (
                              renderUserAvatarNode({
                                staffId: isSelfConv ? currentUser?.id || 'me' : conv.participantStaffId,
                                name: conv.name,
                                rawAvatar: conv.avatar,
                                bgColor: conv.color || '#ec4899',
                                sizeClass: 'w-8 h-8',
                                roundedClass: 'rounded-full',
                                isOnline: true,
                                isAiBot: isAiConv,
                                isSelfBookmark: isSelfConv,
                              })
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span
                                    className={`text-[12.5px] truncate ${
                                      effUnread > 0 || isAiConv || isSelfConv ? 'font-extrabold' : 'font-semibold'
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
                                    <Tooltip title="Đã ghim lên đầu mục">
                                      <Pin size={11} className="text-amber-400 shrink-0" />
                                    </Tooltip>
                                  )}
                                  {isMuted && (
                                    <Tooltip title="Đang tắt thông báo">
                                      <BellOff size={11} className="text-slate-400 shrink-0" />
                                    </Tooltip>
                                  )}
                                </div>

                                {/* Right side: Time / Badge OR Hover Quick Action Buttons (Pin + More ⋮) */}
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
                                    <Tooltip title={isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}>
                                      <button
                                        type="button"
                                        aria-label={isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                                        onClick={() => togglePinConversation(conv.id)}
                                        className="w-5 h-5 rounded inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer"
                                        style={{ color: isPinned ? '#d4a84b' : token.colorTextSecondary }}
                                      >
                                        <Pin size={11} />
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
                                <span
                                  className={`text-[11px] truncate ${
                                    effUnread > 0 ? 'font-bold text-slate-200 dark:text-slate-200' : 'text-slate-400'
                                  }`}
                                >
                                  {previewText}
                                </span>
                                {effUnread > 0 && (
                                  <span className="inline-flex items-center justify-center px-1.5 h-4 rounded-full bg-rose-500 text-white text-[10px] font-extrabold tabular-nums shrink-0">
                                    {effUnread}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
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
                  onClick={() => setMobileActiveView('inbox')}
                  className="w-7 h-7 -ml-1 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10 shrink-0"
                  style={{ color: token.colorText }}
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              {activeConversation?.type === 'space' ? (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0"
                  style={{
                    background: `${activeConversation?.color || '#10b981'}24`,
                    color: activeConversation?.color || '#10b981',
                  }}
                >
                  <Hash size={16} />
                </div>
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
                  isOnline: activeConversation?.id !== AI_COPILOT_CONV_ID,
                  isAiBot: activeConversation?.id === AI_COPILOT_CONV_ID,
                  isSelfBookmark: Boolean(activeConversation?.isSelf || activeConversation?.id.startsWith('dm-self-')),
                })
              )}
              <div className="min-w-0 flex items-center gap-1.5">
                <span className="font-extrabold text-[13.5px] truncate">{activeConversation?.name}</span>
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
              </div>
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
                  <span className="text-amber-500">{tasks.filter((t) => !t.done).length}</span>
                </button>
              </Tooltip>

              <Tooltip title="Tin nhắn đã ghim">
                <button
                  type="button"
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

            {/* 100% Icon-only Window Controls (Right-aligned close button invariant) */}
            <div className="flex items-center gap-1">
              {activeConversation?.id === AI_COPILOT_CONV_ID && (
                <Tooltip title="Làm mới phiên hội thoại riêng tư với Wings AI Copilot">
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
              className="flex-1 flex flex-col min-h-0 relative"
              onDragOver={(e) => {
                e.preventDefault();
                if (!isDraggingOver) setIsDraggingOver(true);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget === e.target) setIsDraggingOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer?.files?.length) {
                  void handleProcessImageFiles(e.dataTransfer.files, 'upload', 'main');
                }
              }}
            >
              {isDraggingOver && (
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

              <div className="flex-1 overflow-y-auto py-3">
                {activeConversation?.messages.map((m, idx) => {
                  const linkedTask = tasks.find((t) => t.id === m.taskId || t.sourceMessageId === m.id);
                  const isMine = isMessageFromCurrentUser(m);
                  const prevMsg = idx > 0 ? activeConversation.messages[idx - 1] : null;
                  const prevIsMine = prevMsg ? isMessageFromCurrentUser(prevMsg) : false;
                  const isCont = Boolean(
                    prevMsg &&
                    prevMsg.senderName === m.senderName &&
                    prevIsMine === isMine &&
                    !prevMsg.isSystemReminder &&
                    !m.isSystemReminder
                  );
                  const isAiMessage = Boolean(m.isAiBot || m.senderId === 'wings-ai-copilot');

                  return (
                    <div
                      key={m.id}
                      data-message-side={isMine ? 'right' : 'left'}
                      className={`group relative flex items-start gap-2.5 px-4 ${
                        isMine ? 'flex-row-reverse' : 'flex-row'
                      } ${
                        isCont ? 'py-0.5' : 'pt-2.5 pb-1'
                      } transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]`}
                      style={{
                        background: linkedTask ? 'rgba(212, 168, 75, 0.06)' : undefined,
                      }}
                    >
                      {isCont ? (
                        <div
                          className={`w-8 shrink-0 ${
                            isMine ? 'text-left pl-0.5' : 'text-right pr-0.5'
                          } pt-1 select-none`}
                        >
                          <span className="opacity-0 group-hover:opacity-100 text-[9.5px] text-slate-400 tabular-nums transition-opacity">
                            {m.timeLabel}
                          </span>
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
                          <div className={`flex items-center gap-1.5 mb-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className="text-[12.5px] font-bold">{m.senderName}</span>
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
                                <span>Quá trình suy luận của Wings AI</span>
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

                        {m.text && (
                          <div
                            className={`inline-block text-left px-3.5 py-2 rounded-2xl ${
                              isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'
                            } text-[13px] leading-relaxed whitespace-pre-wrap break-words max-w-[85%]`}
                            style={{
                              background: isMine
                                ? isDark
                                  ? 'rgba(212, 168, 75, 0.16)'
                                  : 'rgba(212, 168, 75, 0.14)'
                                : surfaceRaised,
                              border: `1px solid ${
                                isMine
                                  ? isDark
                                    ? 'rgba(212, 168, 75, 0.38)'
                                    : 'rgba(212, 168, 75, 0.35)'
                                  : borderColor
                              }`,
                              color: token.colorText,
                            }}
                          >
                            {m.text}
                          </div>
                        )}

                        {/* Suggested AI Action Button (e.g. APPLY_FILTER) */}
                        {m.aiAction && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => m.aiAction && handleExecuteAiAction(m.aiAction, m.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold cursor-pointer transition-all"
                              style={{
                                background: appliedActionIds[m.id]
                                  ? 'rgba(16, 185, 129, 0.16)'
                                  : 'rgba(139, 92, 246, 0.16)',
                                border: `1px solid ${
                                  appliedActionIds[m.id] ? 'rgba(16, 185, 129, 0.4)' : 'rgba(139, 92, 246, 0.4)'
                                }`,
                                color: appliedActionIds[m.id] ? '#10b981' : '#a78bfa',
                              }}
                            >
                              {appliedActionIds[m.id] ? <Check size={13} /> : <Sliders size={13} />}
                              <span>
                                {appliedActionIds[m.id] ? `Đã áp dụng: ${m.aiAction.label}` : m.aiAction.label}
                              </span>
                            </button>
                          </div>
                        )}

                        {/* Quick Voice Read-Aloud & Copy Bar for AI Bot Replies */}
                        {isAiMessage && m.text && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <Tooltip
                              title={speakingMsgId === m.id ? 'Dừng đọc giọng nói' : 'Đọc câu trả lời bằng giọng nói'}
                            >
                              <button
                                type="button"
                                aria-label="Đọc câu trả lời AI"
                                onClick={() => handleSpeakAiMessage(m)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold cursor-pointer"
                                style={{
                                  background: speakingMsgId === m.id ? 'rgba(139, 92, 246, 0.2)' : surfaceRaised,
                                  border: `1px solid ${borderColor}`,
                                  color: speakingMsgId === m.id ? '#a78bfa' : token.colorTextSecondary,
                                }}
                              >
                                {speakingMsgId === m.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                <span>{speakingMsgId === m.id ? 'Đang đọc' : 'Nghe'}</span>
                              </button>
                            </Tooltip>

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
                                {m.customerCard.name} · <span style={{ color: '#d4a84b' }}>{m.customerCard.meta}</span>
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

                        {/* Inline Task & Reminder Card */}
                        {linkedTask && (
                          <div
                            className="mt-1.5 px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 text-left max-w-[85%]"
                            style={{
                              background: surfaceBg,
                              border: `1px solid ${linkedTask.done ? 'rgba(16, 185, 129, 0.4)' : 'rgba(212, 168, 75, 0.45)'}`,
                              borderLeft: `3px solid ${linkedTask.done ? '#10b981' : '#d4a84b'}`,
                              opacity: linkedTask.done ? 0.8 : 1,
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Tooltip title={linkedTask.done ? 'Mở lại Task' : 'Đánh dấu hoàn thành'}>
                                <button
                                  type="button"
                                  aria-label="Đánh dấu hoàn thành Task"
                                  onClick={() => handleToggleTaskDone(linkedTask.id)}
                                  className="w-4 h-4 rounded flex items-center justify-center shrink-0 cursor-pointer"
                                  style={{
                                    border: `1.75px solid ${linkedTask.done ? '#10b981' : '#d4a84b'}`,
                                    background: linkedTask.done ? '#10b981' : 'transparent',
                                    color: '#000',
                                  }}
                                >
                                  {linkedTask.done && <Check size={11} strokeWidth={3} />}
                                </button>
                              </Tooltip>
                              <div className="min-w-0">
                                <div
                                  className={`text-[12px] font-bold truncate ${linkedTask.done ? 'line-through' : ''}`}
                                >
                                  {linkedTask.title}
                                </div>
                                <div className="text-[10.5px] text-slate-400 flex items-center gap-2">
                                  <span>{linkedTask.assigneeName}</span>
                                  <span>· {linkedTask.priority}</span>
                                  <span className="text-amber-500 font-bold tabular-nums">
                                    {linkedTask.done ? 'Xong' : formatCountdown(linkedTask.remindAt, nowMs)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Tooltip title="Test nổ chuông nhắc hẹn ngay">
                              <button
                                type="button"
                                aria-label="Test nổ chuông nhắc hẹn ngay"
                                onClick={() => triggerTaskReminderAlert(linkedTask)}
                                className="w-7 h-7 rounded-md inline-flex items-center justify-center shrink-0 cursor-pointer"
                                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                              >
                                <BellRing size={14} className="text-amber-400" />
                              </button>
                            </Tooltip>
                          </div>
                        )}

                        {/* Thread Chip */}
                        {m.thread && m.thread.length > 0 && (
                          <Tooltip title="Xem luồng trả lời bên phải">
                            <button
                              type="button"
                              onClick={() => handleOpenThread(m.id)}
                              className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer tabular-nums"
                              style={{
                                background: 'rgba(59, 130, 246, 0.14)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                color: '#60a5fa',
                              }}
                            >
                              <MessageSquareReply size={13} />
                              <span>{m.thread.length} trả lời</span>
                            </button>
                          </Tooltip>
                        )}

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
                                return (
                                  <Tooltip
                                    key={emoji}
                                    title={
                                      reactedByMe
                                        ? `Bạn đã thả ${emoji} · Nhấn để gỡ cảm xúc (Undo)`
                                        : `Nhấn để thả cùng ${emoji}`
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
                                      <span>{emoji}</span>
                                      <span>{count}</span>
                                    </button>
                                  </Tooltip>
                                );
                              })}

                          {/* Adjacent Quick Emoji & Action Bar (placed right next to reaction pills) */}
                          <div
                            className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto focus-within:pointer-events-auto transition-opacity inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full shadow-sm"
                            style={{
                              background: surfaceRaised,
                              border: `1px solid ${borderStrong}`,
                            }}
                          >
                            {GOOGLE_CHAT_QUICK_EMOJIS.map((emoji) => {
                              const reactedByMe = hasUserReacted(m, emoji);
                              return (
                                <Tooltip
                                  key={emoji}
                                  title={reactedByMe ? `Đã thả ${emoji} · Nhấn để gỡ (Undo)` : `Thả nhanh ${emoji}`}
                                >
                                  <button
                                    type="button"
                                    aria-label={reactedByMe ? `Gỡ cảm xúc ${emoji}` : `Thả nhanh ${emoji}`}
                                    onClick={() => handleToggleReaction(m.id, emoji)}
                                    className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[13px] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-transform hover:scale-110"
                                    style={{
                                      background: reactedByMe ? 'rgba(212, 168, 75, 0.22)' : 'transparent',
                                      boxShadow: reactedByMe ? 'inset 0 0 0 1px rgba(212, 168, 75, 0.55)' : 'none',
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
                          </div>
                        </div>
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
                      <span>Wings AI Copilot đang suy luận & phân tích dữ liệu... ({aiElapsedSec}s)</span>
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
                            setComposerText((prev) => `${prev}@Hà My `);
                            setMobileActionOpen(false);
                            composerInputRef.current?.focus();
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
                              setComposerText((prev) => (prev.includes('@AI') ? prev : `@AI ${prev}`));
                              setMobileActionOpen(false);
                              composerInputRef.current?.focus();
                            }}
                            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
                          >
                            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-purple-500/15 text-purple-400 border border-purple-500/30 overflow-hidden shrink-0">
                              <Bot size={16} />
                            </div>
                            <span
                              className="text-[10.5px] font-medium text-center leading-tight"
                              style={{ color: token.colorText }}
                            >
                              Gọi @AI
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Mobile Main Row */}
                    <div className="flex items-center gap-2">
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

                      {/* Text Input Pill (38px min-height) */}
                      <div
                        className="flex-1 min-h-[38px] rounded-2xl px-3 flex items-center gap-1.5"
                        style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
                      >
                        <input
                          ref={composerInputRef}
                          type="text"
                          value={composerText}
                          onChange={(e) => setComposerText(e.target.value)}
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
                          placeholder="Nhắn tin..."
                          className="flex-1 bg-transparent border-0 outline-none text-[13.5px]"
                          style={{ color: token.colorText }}
                        />

                        <Popover trigger="click" placement="topRight" content={renderComposerEmojiPickerContent()}>
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
                          background: composerText.trim() || stagedAttachments.length > 0 ? '#d4a84b' : surfaceRaised,
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
                  /* Desktop Layout with spacious 32px buttons and 17px icons */
                  <div
                    className="h-11 rounded-full pl-4 pr-1.5 flex items-center gap-1.5"
                    style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
                  >
                    <input
                      ref={composerInputRef}
                      type="text"
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value)}
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
                          ? 'Hỏi Wings AI Copilot, Paste hình (⌘V) hoặc yêu cầu phân tích khách hàng...'
                          : canUseAiCopilot
                            ? 'Nhắn tin, gõ @AI để gọi Copilot, Paste hình (⌘V)...'
                            : 'Nhắn tin, Paste hình (⌘V) hoặc dán link Google Drive...'
                      }
                      className="flex-1 bg-transparent border-0 outline-none text-[13px]"
                      style={{ color: token.colorText }}
                    />

                    <Popover trigger="click" placement="topRight" content={renderComposerEmojiPickerContent()}>
                      <Tooltip title="Chèn biểu tượng cảm xúc Wings">
                        <button
                          type="button"
                          aria-label="Chèn biểu tượng cảm xúc Wings"
                          className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-white/10 cursor-pointer"
                          style={{ color: token.colorTextSecondary }}
                        >
                          <SmilePlus size={17} />
                        </button>
                      </Tooltip>
                    </Popover>

                    <Tooltip title="Tải hình từ Ổ đĩa / Google Drive Desktop hoặc Paste ảnh (⌘V)">
                      <button
                        type="button"
                        aria-label="Tải hình từ ổ đĩa hoặc Google Drive"
                        onClick={() => triggerFilePicker('main')}
                        className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-white/10 cursor-pointer"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <ImagePlus size={17} />
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
                        className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-white/10 cursor-pointer"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <HardDrive size={17} />
                      </button>
                    </Tooltip>

                    <Tooltip title="Đính kèm thẻ Khách hàng / Booking mOS">
                      <button
                        type="button"
                        aria-label="Đính kèm thẻ Khách hàng"
                        onClick={handleSendQuickCustomerCard}
                        className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-white/10 cursor-pointer"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <UserRoundPlus size={17} />
                      </button>
                    </Tooltip>

                    {canUseAiCopilot && activeConversation?.id !== AI_COPILOT_CONV_ID && (
                      <Tooltip title="Gọi @AI để Wings AI Copilot phân tích & trả lời công khai vào nhóm này">
                        <button
                          type="button"
                          aria-label="Gọi @AI Copilot trong nhóm"
                          onClick={() => {
                            setComposerText((prev) => (prev.includes('@AI') ? prev : `@AI ${prev}`));
                            composerInputRef.current?.focus();
                          }}
                          className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-purple-500/15 cursor-pointer"
                          style={{ color: '#a78bfa' }}
                        >
                          <Bot size={17} />
                        </button>
                      </Tooltip>
                    )}

                    <Tooltip title="Nhắc tên đồng nghiệp (@)">
                      <button
                        type="button"
                        aria-label="Nhắc tên đồng nghiệp"
                        onClick={() => setComposerText((prev) => `${prev}@Hà My `)}
                        className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-white/10 cursor-pointer"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <AtSign size={17} />
                      </button>
                    </Tooltip>

                    <Tooltip title="Giao Task & Cài nhắc hẹn mới">
                      <button
                        type="button"
                        aria-label="Giao Task & Cài nhắc hẹn mới"
                        onClick={() => openTaskModalFromMessage(null)}
                        className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-white/10 cursor-pointer"
                        style={{ color: '#d4a84b' }}
                      >
                        <AlarmClockPlus size={17} />
                      </button>
                    </Tooltip>

                    <Tooltip title="Gửi tin nhắn (Enter)">
                      <button
                        type="button"
                        aria-label="Gửi tin nhắn"
                        onClick={handleSendMain}
                        className="w-8 h-8 rounded-full inline-flex items-center justify-center cursor-pointer shadow-sm"
                        style={{ background: '#d4a84b', color: '#000' }}
                      >
                        <SendHorizontal size={16} />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: TASKS & REMINDERS HUB */}
          {activeSubtab === 'tasks' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13.5px] font-extrabold">Công việc & Nhắc hẹn từ Tin nhắn</span>
                <div className="flex items-center gap-1.5">
                  <Tooltip title="Test nổ chuông nhắc hẹn ngay">
                    <button
                      type="button"
                      aria-label="Test nổ chuông nhắc hẹn ngay"
                      onClick={() => {
                        const firstOpen = tasks.find((t) => !t.done) || tasks[0];
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
                      className="w-7 h-7 rounded-lg inline-flex items-center justify-center cursor-pointer"
                      style={{ background: '#d4a84b', color: '#000' }}
                    >
                      <Plus size={15} />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-lg flex items-center justify-between gap-2"
                  style={{
                    background: surfaceBg,
                    border: `1px solid ${t.done ? 'rgba(16, 185, 129, 0.35)' : 'rgba(212, 168, 75, 0.45)'}`,
                    borderLeft: `3px solid ${t.done ? '#10b981' : '#d4a84b'}`,
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTaskDone(t.id)}
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0 cursor-pointer"
                      style={{
                        border: `1.75px solid ${t.done ? '#10b981' : '#d4a84b'}`,
                        background: t.done ? '#10b981' : 'transparent',
                        color: '#000',
                      }}
                    >
                      {t.done && <Check size={11} strokeWidth={3} />}
                    </button>
                    <div className="min-w-0">
                      <div className={`text-[12.5px] font-bold truncate ${t.done ? 'line-through opacity-70' : ''}`}>
                        {t.title}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{t.assigneeName}</span>
                        <span>· #{t.conversationName}</span>
                        <span className="text-amber-500 font-bold tabular-nums">
                          {t.done ? 'Xong' : formatCountdown(t.remindAt, nowMs)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Tooltip title="Test nổ chuông nhắc">
                      <button
                        type="button"
                        onClick={() => triggerTaskReminderAlert(t)}
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer"
                        style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                      >
                        <BellRing size={13} className="text-amber-400" />
                      </button>
                    </Tooltip>
                    <Tooltip title="Mở cuộc trò chuyện gốc">
                      <button
                        type="button"
                        onClick={() => selectConversation(t.conversationId)}
                        className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer"
                        style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                      >
                        <ExternalLink size={13} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VIEW 3: PINNED MESSAGES */}
          {activeSubtab === 'pinned' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-[13.5px] font-extrabold mb-2">Tin nhắn đã ghim</div>
              {activeConversation?.messages
                .filter((m) => m.pinned)
                .map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg text-[12.5px]"
                    style={{
                      background: surfaceBg,
                      border: `1px solid ${borderStrong}`,
                      borderLeft: '3px solid #d4a84b',
                    }}
                  >
                    <div className="text-[11px] font-bold mb-1">
                      {m.senderName} · <span className="text-slate-400 tabular-nums">{m.timeLabel}</span>
                    </div>
                    {m.text && <div>{m.text}</div>}
                    {renderMessageAttachments(m.attachments, true)}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDE THREAD PANE (Google Spaces Threading) */}
        {threadOpen && activeThreadMessage && (
          <aside
            data-chat-thread-pane="true"
            className={`${isMobile ? 'absolute inset-0 z-30 w-full' : 'w-[264px]'} flex flex-col shrink-0`}
            style={{
              background: surfaceBg,
              borderLeft: isMobile ? 'none' : `1px solid ${borderColor}`,
              display: isMobile && mobileActiveView !== 'thread' ? 'none' : 'flex',
            }}
          >
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
                  <MessageSquareReply size={14} className="shrink-0" />
                  <span>Luồng trả lời</span>
                </span>
              </div>
              <Tooltip title="Đóng luồng">
                <button
                  type="button"
                  aria-label="Đóng luồng"
                  onClick={() => {
                    setThreadOpen(false);
                    if (isMobile) setMobileActiveView('conversation');
                  }}
                  className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer"
                  style={{ color: token.colorTextSecondary }}
                >
                  <X size={15} />
                </button>
              </Tooltip>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              <div
                className="p-2.5 rounded-lg text-[12px]"
                style={{ background: surfaceRaised, borderLeft: '3px solid #d4a84b' }}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  {renderUserAvatarNode({
                    name: activeThreadMessage.senderName,
                    avatarUrl: activeThreadMessage.senderAvatar,
                    sizeClass: 'w-5 h-5',
                    textClass: 'text-[9px]',
                  })}
                  <span className="truncate">{activeThreadMessage.senderName}</span>
                  <span className="text-slate-400 text-[10.5px] tabular-nums">· {activeThreadMessage.timeLabel}</span>
                </div>
                {activeThreadMessage.text && <div>{activeThreadMessage.text}</div>}
                {renderMessageAttachments(activeThreadMessage.attachments, true)}
              </div>

              <div className="text-[10.5px] font-bold uppercase text-slate-400 tabular-nums">
                {activeThreadMessage.thread?.length || 0} câu trả lời
              </div>

              {(activeThreadMessage.thread || []).map((r) => {
                const isReplyMine = isMessageFromCurrentUser(r);
                return (
                  <div key={r.id} className={`flex gap-2 items-start ${isReplyMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {renderUserAvatarNode({
                      name: r.senderName,
                      avatarUrl: r.senderAvatar,
                      sizeClass: 'w-6 h-6 mt-0.5',
                      textClass: 'text-[9.5px]',
                      bgStyle: isReplyMine ? 'linear-gradient(135deg, #d4a84b 0%, #b45309 100%)' : '#2563eb',
                      textColor: isReplyMine ? '#000' : '#fff',
                    })}
                    <div
                      className={`max-w-[82%] p-2 rounded-xl text-[12px] ${
                        isReplyMine ? 'rounded-tr-sm text-right' : 'rounded-tl-sm text-left'
                      }`}
                      style={{
                        background: isReplyMine
                          ? isDark
                            ? 'rgba(212, 168, 75, 0.16)'
                            : 'rgba(245, 158, 11, 0.14)'
                          : canvasBg,
                        border: `1px solid ${
                          isReplyMine ? (isDark ? 'rgba(212, 168, 75, 0.35)' : 'rgba(217, 119, 6, 0.3)') : borderColor
                        }`,
                      }}
                    >
                      <div
                        className={`font-bold text-[10.5px] mb-0.5 flex items-center gap-1 ${
                          isReplyMine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span style={{ color: isReplyMine ? '#d4a84b' : token.colorText }}>{r.senderName}</span>
                        <span className="text-slate-400 tabular-nums">· {r.timeLabel}</span>
                      </div>
                      {r.text && <div className="text-left break-words">{r.text}</div>}
                      {renderMessageAttachments(r.attachments, true)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5" style={{ borderTop: `1px solid ${borderColor}` }}>
              {renderStagedAttachmentsStrip(threadAttachments, 'thread')}
              <div className="flex items-center gap-1">
                <input
                  ref={threadInputRef}
                  type="text"
                  value={threadInput}
                  onChange={(e) => setThreadInput(e.target.value)}
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
                  placeholder="Trả lời hoặc Paste hình (⌘V)..."
                  className="flex-1 min-h-[38px] rounded-2xl px-3.5 text-[13px] outline-none"
                  style={{
                    background: surfaceRaised,
                    border: `1px solid ${borderStrong}`,
                    color: token.colorText,
                  }}
                />
                <Tooltip title="Tải hình vào luồng">
                  <button
                    type="button"
                    aria-label="Tải hình vào luồng"
                    onClick={() => triggerFilePicker('thread')}
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer hover:bg-white/10 active:scale-95 transition-transform"
                    style={{ color: token.colorTextSecondary }}
                  >
                    <ImagePlus size={18} />
                  </button>
                </Tooltip>
                <Tooltip title="Gửi vào luồng">
                  <button
                    type="button"
                    aria-label="Gửi vào luồng"
                    onClick={handleSendThreadReply}
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform shadow-sm"
                    style={{ background: '#d4a84b', color: '#000' }}
                  >
                    <SendHorizontal size={16} />
                  </button>
                </Tooltip>
              </div>
            </div>
          </aside>
        )}
      </section>

      {/* ================= MINI DOCKED POP-OUT CHAT WINDOWS (BOTTOM RIGHT LIKE GMAIL) ================= */}
      {!isMobile && dockedConvIds.length > 0 && (
        <div className="fixed bottom-0 right-5 flex items-end gap-2.5 z-[990]" style={{ pointerEvents: 'none' }}>
          {dockedConvIds.map((cid) => {
            const conv = conversations.find((c) => c.id === cid);
            if (!conv) return null;
            const isCollapsed = Boolean(collapsedDockIds[cid]);
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
                  <div className="flex items-center gap-2 min-w-0">
                    {conv.type === 'dm' ? (
                      renderUserAvatarNode({
                        staffId: conv.participantStaffId,
                        name: conv.name,
                        avatarUrl: conv.avatar,
                        sizeClass: 'w-5 h-5',
                        textClass: 'text-[9px]',
                        isOnline: true,
                      })
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    <span className="text-[12px] font-extrabold truncate">{conv.name}</span>
                  </div>
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Mở rộng vào Bảng Chat">
                      <button
                        type="button"
                        onClick={() => {
                          selectConversation(cid);
                          onToggle();
                        }}
                        className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <Maximize2 size={13} />
                      </button>
                    </Tooltip>
                    <Tooltip title="Thu gọn / Bung ra">
                      <button
                        type="button"
                        onClick={() => setCollapsedDockIds((p) => ({ ...p, [cid]: !p[cid] }))}
                        className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <Minus size={13} />
                      </button>
                    </Tooltip>
                    <Tooltip title="Đóng cửa sổ nhỏ">
                      <button
                        type="button"
                        onClick={() => setDockedConvIds((prev) => prev.filter((id) => id !== cid))}
                        className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <X size={13} />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="h-[280px] flex flex-col" style={{ background: canvasBg }}>
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                      {recentMsgs.map((m) => {
                        const isDockMine = isMessageFromCurrentUser(m);
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
                                background: isDockMine
                                  ? isDark
                                    ? 'rgba(212, 168, 75, 0.16)'
                                    : 'rgba(245, 158, 11, 0.14)'
                                  : surfaceBg,
                                border: `1px solid ${
                                  isDockMine
                                    ? isDark
                                      ? 'rgba(212, 168, 75, 0.35)'
                                      : 'rgba(217, 119, 6, 0.3)'
                                    : borderColor
                                }`,
                              }}
                            >
                              <div
                                className={`flex items-center justify-between gap-2 mb-0.5 ${
                                  isDockMine ? 'flex-row-reverse' : 'flex-row'
                                }`}
                              >
                                <span className="text-[10.5px] font-bold" style={{ color: '#d4a84b' }}>
                                  {m.senderName} · <span className="tabular-nums">{m.timeLabel}</span>
                                </span>
                                <Tooltip title="Tạo Task & Nhắc hẹn">
                                  <button
                                    type="button"
                                    onClick={() => openTaskModalFromMessage(m)}
                                    className="w-5 h-5 rounded inline-flex items-center justify-center cursor-pointer"
                                    style={{ color: '#d4a84b' }}
                                  >
                                    <AlarmClockPlus size={12} />
                                  </button>
                                </Tooltip>
                              </div>
                              {m.text && <div className="break-words">{m.text}</div>}
                              {renderMessageAttachments(m.attachments, true)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="p-2" style={{ background: surfaceBg, borderTop: `1px solid ${borderColor}` }}>
                      {renderStagedAttachmentsStrip(dockStaged, 'dock', cid)}
                      <div className="flex items-center gap-1">
                        <input
                          ref={(el) => {
                            dockInputRefs.current[cid] = el;
                          }}
                          type="text"
                          value={dockInputs[cid] || ''}
                          onChange={(e) => setDockInputs((p) => ({ ...p, [cid]: e.target.value }))}
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
                              handleSendMessage(cid, val, null, atts);
                            }
                          }}
                          placeholder="Nhắn nhanh hoặc Paste hình (⌘V)..."
                          className="flex-1 h-7 rounded-full px-2.5 text-[12px] outline-none"
                          style={{
                            background: surfaceRaised,
                            border: `1px solid ${borderColor}`,
                            color: token.colorText,
                          }}
                        />
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
                          style={{ background: '#d4a84b', color: '#000' }}
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
          className="fixed top-16 right-5 w-[356px] rounded-xl p-3.5 shadow-2xl z-[1100]"
          style={{
            background: surfaceBg,
            border: '1.5px solid #d4a84b',
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-[12px] font-extrabold text-amber-400">
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
        open={taskModalOpen}
        zIndex={1350}
        onCancel={() => setTaskModalOpen(false)}
        onOk={handleConfirmCreateTask}
        okText="Lưu & Hẹn giờ"
        cancelText="Hủy"
        title={
          <span className="flex items-center gap-2 text-[14px] font-bold">
            <AlarmClockPlus size={16} className="text-amber-500" />
            <span>Giao Task & Hẹn Giờ Nhắc</span>
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

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1">Người phụ trách</div>
              <Select
                className="w-full"
                value={taskAssignee}
                onChange={setTaskAssignee}
                options={assigneeOptions}
                showSearch
                placeholder="Tìm hoặc chọn người phụ trách..."
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

      {/* ================= MODAL: CREATE NEW SPACE OR DM ================= */}
      <Modal
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
                onlineDot: true,
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
                  const isMe = Number(m.id) === Number(currentUser?.id);
                  const isAdm = m.role?.toLowerCase().includes('admin');
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-lg border transition-colors"
                      style={{ background: surfaceRaised, borderColor }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {renderUserAvatarNode({
                          name: m.displayName || m.username,
                          avatarUrl: m.avatarUrl,
                          staffId: m.id,
                          sizeClass: 'w-8 h-8',
                          textClass: 'text-xs',
                          bgStyle: isAdm ? '#a855f7' : '#3b82f6',
                          onlineDot: Boolean(m.isOnline),
                        })}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[12.5px] truncate">{m.displayName || m.username}</span>
                            {isMe && (
                              <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                Bạn
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">{m.role || 'Nhân sự'}</span>
                        </div>
                      </div>

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
                  );
                })}
            </div>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: ATTACH IMAGE FROM GOOGLE DRIVE / LOCAL DRIVE ================= */}
      <Modal
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

      {/* ================= MOS CHAT & WINGS AI COPILOT ACCESS CONTROL MODAL (DEPARTMENT / TEAM / INDIVIDUAL) ================= */}
      <Modal
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
              <span>Phân quyền truy cập mOS Chat & Wings AI Copilot</span>
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
              {/* Top Mode Switcher: mOS Chat Access vs Wings AI Copilot Access */}
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
                    Quyền dùng Wings AI Copilot (
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
                      Chọn <b>Bộ phận / Đội nhóm</b> hoặc <b>Cá nhân</b> được phép chat 1-1 với{' '}
                      <b>🤖 Wings AI Copilot</b> và gọi <code>@AI</code> trong nhóm Space.
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

                {/* 8 Specialized Teams */}
                <div className="pt-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    8 Đội chuyên môn (Specialized Teams)
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
        open={quickCreateSectionModalOpen}
        onCancel={() => {
          setQuickCreateSectionModalOpen(false);
          setQuickCreateSectionTargetConvId(null);
        }}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 420}
        centered
        zIndex={1130}
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
        open={sidebarCustomizeModalOpen}
        onCancel={() => {
          setSidebarCustomizeModalOpen(false);
          setEditingSectionId(null);
        }}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 680}
        centered
        zIndex={1120}
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
    </>
  );
};

export default MosGoogleChatPortal;

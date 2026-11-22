import dayjs from 'dayjs';
import { CheckCircle2, CircleDotDashed, MessageCircleQuestion, Sparkles, type LucideIcon } from 'lucide-react';
import type { GlobalToken } from 'antd';
import type { BugReportReporterState, MyBugReportItem } from '@mos-lab/shared';
import type { StatusTag } from '../ui';

export type ReporterTone = 'attention' | 'working' | 'done' | 'quiet';

export type ReporterToneVisual = {
  accent: string;
  border: string;
  background: string;
};

export const REPORTER_STATE_TONES: Record<BugReportReporterState, Parameters<typeof StatusTag>[0]['status']> = {
  RECEIVED: 'processing',
  REVIEWING: 'processing',
  IN_PROGRESS: 'cyan',
  WAITING_REPORTER: 'warning',
  READY_FOR_REVIEW: 'success',
  COMPLETED: 'success',
  NOT_PROCEEDING: 'default',
};

export const REPORTER_STATE_ICONS: Record<BugReportReporterState, LucideIcon> = {
  RECEIVED: CircleDotDashed,
  REVIEWING: CircleDotDashed,
  IN_PROGRESS: Sparkles,
  WAITING_REPORTER: MessageCircleQuestion,
  READY_FOR_REVIEW: CheckCircle2,
  COMPLETED: CheckCircle2,
  NOT_PROCEEDING: CircleDotDashed,
};

export const REPORTER_GROUPS: Array<{
  id: string;
  label: string;
  helper: string;
  tone: ReporterTone;
  states: BugReportReporterState[];
}> = [
  {
    id: 'needs-attention',
    label: 'Cần bạn chú ý',
    helper: 'Có việc cần bạn quyết định hoặc trả lời',
    tone: 'attention',
    states: ['WAITING_REPORTER', 'READY_FOR_REVIEW'],
  },
  {
    id: 'in-progress',
    label: 'mOS đang xử lý',
    helper: 'Bạn chưa cần làm gì lúc này',
    tone: 'working',
    states: ['RECEIVED', 'REVIEWING', 'IN_PROGRESS'],
  },
  {
    id: 'completed',
    label: 'Đã hoàn tất',
    helper: 'Những yêu cầu đã có kết quả',
    tone: 'done',
    states: ['COMPLETED', 'NOT_PROCEEDING'],
  },
];

export function elapsedSince(value: string): string {
  const minutes = Math.max(0, dayjs().diff(dayjs(value), 'minute'));
  if (minutes < 1) return 'vừa cập nhật';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export function toneForState(state: BugReportReporterState): ReporterTone {
  if (['WAITING_REPORTER', 'READY_FOR_REVIEW'].includes(state)) return 'attention';
  if (['COMPLETED', 'NOT_PROCEEDING'].includes(state)) return 'done';
  return 'working';
}

export function requestTypeLabel(report: MyBugReportItem): string {
  return report.requestType === 'FEATURE' ? 'Cải thiện' : 'Báo lỗi';
}

export function getReporterToneVisual(token: GlobalToken, tone: ReporterTone): ReporterToneVisual {
  if (tone === 'attention')
    return { accent: token.colorWarning, border: token.colorWarningBorder, background: token.colorWarningBg };
  if (tone === 'done')
    return { accent: token.colorSuccess, border: token.colorSuccessBorder, background: token.colorSuccessBg };
  if (tone === 'quiet')
    return {
      accent: token.colorTextTertiary,
      border: token.colorBorderSecondary,
      background: token.colorFillQuaternary,
    };
  return { accent: token.colorInfo, border: token.colorInfoBorder, background: token.colorInfoBg };
}

export function resolveFeatureUrl(item: {
  id?: number;
  key?: string;
  title?: string;
  description?: string | null;
  sourcePath?: string | null;
  resolution?: {
    releaseUrl?: string | null;
    changedFiles?: string[];
  } | null;
}): string | null {
  const rawReleaseUrl = item.resolution?.releaseUrl?.trim() || null;
  if (rawReleaseUrl) {
    try {
      const parsed = rawReleaseUrl.startsWith('http')
        ? new URL(rawReleaseUrl)
        : new URL(rawReleaseUrl, 'https://lab.masteros.app');
      const path = parsed.pathname;
      if (path !== '/dashboard/bug-reports' && path !== '/dashboard/inbox' && path !== '/dashboard' && path !== '/') {
        return rawReleaseUrl;
      }
    } catch {
      if (!rawReleaseUrl.includes('/dashboard/bug-reports') && !rawReleaseUrl.includes('/dashboard/inbox')) {
        return rawReleaseUrl;
      }
    }
  }

  // Next: check if title or description contains a specific feature route
  const textToScan = `${item.title || ''} ${item.description || ''}`;
  const routeMatch = textToScan.match(/(?:https?:\/\/[^\s"'`]+)?(\/dashboard\/[a-zA-Z0-9_\-/?=&#.]+)/i);
  if (routeMatch && routeMatch[1]) {
    const matchedPath = routeMatch[1].replace(/[.,;!?)]+$/, '');
    if (
      !matchedPath.startsWith('/dashboard/bug-reports') &&
      !matchedPath.startsWith('/dashboard/inbox') &&
      matchedPath !== '/dashboard'
    ) {
      return matchedPath;
    }
  }

  // Next: check sourcePath
  if (
    item.sourcePath &&
    item.sourcePath.startsWith('/') &&
    !item.sourcePath.startsWith('/dashboard/bug-reports') &&
    !item.sourcePath.startsWith('/dashboard/inbox') &&
    item.sourcePath !== '/'
  ) {
    return item.sourcePath;
  }

  // Next: check changedFiles
  if (item.resolution?.changedFiles && item.resolution.changedFiles.length > 0) {
    for (const file of item.resolution.changedFiles) {
      const match = file.match(/apps\/web\/app\/dashboard\/([a-zA-Z0-9_-]+)/);
      if (match && match[1] && match[1] !== 'bug-reports' && match[1] !== 'inbox') {
        const moduleName = match[1];
        if (moduleName === 'bk') {
          if (file.toLowerCase().includes('game') || textToScan.toLowerCase().includes('game')) {
            return '/dashboard/bk?tab=game';
          }
          return '/dashboard/bk';
        }
        return `/dashboard/${moduleName}`;
      }
    }
  }

  return null;
}

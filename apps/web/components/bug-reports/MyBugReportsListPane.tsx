'use client';

import { Input, Typography, theme } from 'antd';
import { ChevronRight, ImageIcon, Search } from 'lucide-react';
import type { MyBugReportItem } from '@mos-lab/shared';
import { AppIcon } from '../ui';
import { elapsedSince, getReporterToneVisual, toneForState, type ReporterTone } from './my-bug-reports.helpers';

const { Text } = Typography;

export type GroupedReporterSection = {
  id: string;
  label: string;
  helper: string;
  tone: ReporterTone;
  reports: MyBugReportItem[];
};

interface MyBugReportsListPaneProps {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  groupedReports: GroupedReporterSection[];
  hasMatches: boolean;
  selectedId: number | null;
  mobileView: 'list' | 'detail';
  onSelectReport: (key: string) => void;
}

export function MyBugReportsListPane({
  totalCount,
  search,
  onSearchChange,
  groupedReports,
  hasMatches,
  selectedId,
  mobileView,
  onSelectReport,
}: MyBugReportsListPaneProps) {
  const { token } = theme.useToken();

  return (
    <section
      className={`reporter-request-list lg:border-b ${mobileView === 'detail' ? 'hidden lg:block' : 'block'}`}
      style={{ borderColor: token.colorBorderSecondary }}
      aria-label="Danh sách yêu cầu của tôi"
    >
      <div className="px-5 pb-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Text strong className="text-lg">
              Yêu cầu của tôi
            </Text>
            <Text type="secondary" className="mt-0.5 block text-sm">
              Chỉ cần nói mOS cần giúp gì
            </Text>
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-xs"
            style={{ background: token.colorFillQuaternary, color: token.colorTextSecondary }}
          >
            {totalCount}
          </span>
        </div>
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          allowClear
          prefix={<AppIcon icon={Search} size="sm" />}
          placeholder="Tìm yêu cầu"
          aria-label="Tìm yêu cầu"
          className="mt-4"
        />
      </div>

      <div
        className="max-h-[612px] space-y-5 overflow-y-auto overscroll-contain px-3 pb-5"
        aria-label="Các nhóm yêu cầu"
      >
        {groupedReports
          .filter((group) => group.reports.length > 0)
          .map((group) => {
            const groupVisual = getReporterToneVisual(token, group.tone);
            return (
              <div key={group.id}>
                <div className="mb-2 flex items-start justify-between gap-2 px-2">
                  <div>
                    <Text strong className="text-sm" style={{ color: groupVisual.accent }}>
                      {group.label}
                    </Text>
                    <Text type="secondary" className="mt-0.5 block text-xs">
                      {group.helper}
                    </Text>
                  </div>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[11px]"
                    style={{ background: groupVisual.background, color: groupVisual.accent }}
                  >
                    {group.reports.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {group.reports.map((report) => {
                    const active = selectedId === report.id;
                    const visual = getReporterToneVisual(token, toneForState(report.reporterExperience.state));
                    return (
                      <button
                        key={report.id}
                        type="button"
                        aria-current={active ? 'true' : undefined}
                        className="group w-full rounded-xl border px-3 py-2.5 text-left transition-all hover:-translate-y-px"
                        style={{
                          borderColor: active ? visual.border : 'transparent',
                          background: active ? visual.background : token.colorFillQuaternary,
                          boxShadow: active ? `inset 3px 0 0 ${visual.accent}` : undefined,
                        }}
                        onClick={() => onSelectReport(report.key)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: visual.accent }} />
                            <Text strong className="truncate text-xs">
                              {report.key}
                            </Text>
                          </span>
                          <Text type="secondary" className="shrink-0 text-[11px]">
                            {elapsedSince(report.updatedAt)}
                          </Text>
                        </div>
                        <Text ellipsis={{ tooltip: report.title }} className="mt-1 block text-sm font-medium">
                          {report.title}
                        </Text>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <Text
                            type="secondary"
                            ellipsis={{ tooltip: report.reporterExperience.summary }}
                            className="min-w-0 text-xs"
                          >
                            {report.reporterExperience.summary}
                          </Text>
                          <span className="flex shrink-0 items-center gap-1">
                            {report.evidenceAttachments.length ? (
                              <span
                                className="inline-flex items-center gap-0.5 text-[11px]"
                                style={{ color: token.colorTextTertiary }}
                                title={`${report.evidenceAttachments.length} ảnh bạn đã gửi`}
                              >
                                <AppIcon icon={ImageIcon} size={12} />
                                {report.evidenceAttachments.length}
                              </span>
                            ) : null}
                            <AppIcon icon={ChevronRight} size="sm" style={{ color: token.colorTextTertiary }} />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        {!hasMatches ? (
          <Text type="secondary" className="block px-2 py-8 text-center text-sm">
            Không tìm thấy yêu cầu phù hợp.
          </Text>
        ) : null}
      </div>
    </section>
  );
}

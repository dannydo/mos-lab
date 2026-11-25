'use client';

import React from 'react';
import { Card, Table, Tag, Select, Space, Typography, Tooltip, Pagination, theme as antTheme } from 'antd';
import { TrophyOutlined, ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';
import { ChevronRight } from 'lucide-react';
import CcAvatar from '../../../cc/components/CcAvatar';
import { CvSpeedRanking, SpeedRating, ConfidenceLevel, LashServiceMode } from '@mos-lab/shared';
import { AppIcon, MobileRecordList } from '~/components/ui';
import { useCcMobilePortrait } from '~/app/dashboard/cc/components/useCcMobilePortrait';

const { Text } = Typography;

const LASH_STYLES = ['Classic', 'Mink', 'Volume', 'Ultralight', 'Hyperlight', 'Ivylight', 'Under Mink'];

const LASH_COUNTS = [30, 60, 70, 80, 90, 100, 120, 140];

export interface CvSpeedRankingSectionProps {
  rankingData: CvSpeedRanking[];
  loading: boolean;
  rankingStyle: string;
  rankingCount: number;
  rankingMode: LashServiceMode;
  rankingPage: number;
  rankingPageSize: number;
  onStyleChange: (style: string) => void;
  onCountChange: (count: number) => void;
  onModeChange: (mode: LashServiceMode) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onOpenDetail: (staffId: number) => void;
}

export function CvSpeedRankingSection({
  rankingData,
  loading,
  rankingStyle,
  rankingCount,
  rankingMode,
  rankingPage,
  rankingPageSize,
  onStyleChange,
  onCountChange,
  onModeChange,
  onPageChange,
  onPageSizeChange,
  onOpenDetail,
}: CvSpeedRankingSectionProps) {
  const { token } = antTheme.useToken();
  const { showMobilePortrait } = useCcMobilePortrait();
  const isMobile = showMobilePortrait;
  const mobileRankingData = rankingData.slice((rankingPage - 1) * rankingPageSize, rankingPage * rankingPageSize);

  const getRatingBadgeLabel = (rating: SpeedRating) => {
    if (rating === 'fast') return 'Nhanh (-10%)';
    if (rating === 'slow') return 'Chậm (+10%)';
    return 'Chuẩn';
  };

  const rankingColumns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      align: 'center' as const,
      render: (rank: number) => (
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold tabular-nums text-xs ${
            rank === 1
              ? 'bg-amber-400 text-black'
              : rank === 2
                ? 'bg-slate-300 text-black'
                : rank === 3
                  ? 'bg-amber-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
          }`}
        >
          #{rank}
        </span>
      ),
    },
    {
      title: 'Chuyên Viên',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (text: string, record: CvSpeedRanking) => (
        <a
          onClick={() => onOpenDetail(record.staffId)}
          className="font-semibold hover:underline cursor-pointer flex items-center gap-2"
          style={{ color: token.colorPrimary }}
        >
          <CcAvatar name={text} src={record.avatarUrl} size={24} />
          <span>{text}</span>
        </a>
      ),
    },
    {
      title: 'Dự Đoán Thời Gian',
      dataIndex: 'predictedTime',
      key: 'predictedTime',
      align: 'center' as const,
      render: (val: number, record: CvSpeedRanking) => {
        const cleanP = record.phaseBreakdown?.cleaning ?? Math.round(val * 0.15);
        const prepP = record.phaseBreakdown?.prepQc ?? Math.round(val * 0.1);
        const extP = record.phaseBreakdown?.extension ?? Math.max(1, val - cleanP - prepP);
        const sum = cleanP + extP + prepP || 1;

        const cleanPct = Math.round((cleanP / sum) * 100);
        const extPct = Math.round((extP / sum) * 100);
        const prepPct = Math.round((prepP / sum) * 100);

        const tooltipContent = (
          <div className="text-xs p-1">
            <div className="font-bold border-b border-slate-700 pb-1 mb-1">Phân bổ thời gian: {val}p</div>
            <div className="flex items-center gap-2 text-blue-400">
              🔵 Vệ sinh:{' '}
              <strong className="tabular-nums">
                {cleanP}p ({cleanPct}%)
              </strong>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              🟢 Nối mi:{' '}
              <strong className="tabular-nums">
                {extP}p ({extPct}%)
              </strong>
            </div>
            <div className="flex items-center gap-2 text-amber-400">
              🟠 Chuẩn bị & QC:{' '}
              <strong className="tabular-nums">
                {prepP}p ({prepPct}%)
              </strong>
            </div>
          </div>
        );

        return (
          <div className="flex flex-col items-center justify-center gap-1 py-0.5">
            <span className="font-extrabold text-sm tabular-nums" style={{ color: token.colorText }}>
              {val} phút
            </span>

            {/* 3-SEGMENT PROGRESS BAR */}
            <Tooltip title={tooltipContent} placement="top">
              <div className="w-28 flex h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner cursor-pointer">
                <div style={{ width: `${cleanPct}%`, backgroundColor: '#3b82f6' }} className="h-full" />
                <div style={{ width: `${extPct}%`, backgroundColor: '#22c55e' }} className="h-full" />
                <div style={{ width: `${prepPct}%`, backgroundColor: '#f59e0b' }} className="h-full" />
              </div>
            </Tooltip>

            {/* SMALL SUBTEXT BREAKDOWN */}
            <span className="text-[10px] text-slate-400 font-mono tabular-nums">
              {cleanP}p · {extP}p · {prepP}p
            </span>
          </div>
        );
      },
    },
    {
      title: 'Đánh Giá Tốc Độ',
      dataIndex: 'speedRating',
      key: 'speedRating',
      align: 'center' as const,
      render: (rating: SpeedRating) => (
        <Tag
          color={rating === 'fast' ? 'success' : rating === 'slow' ? 'error' : 'warning'}
          className="tabular-nums font-medium"
        >
          {getRatingBadgeLabel(rating)}
        </Tag>
      ),
    },
    {
      title: 'Độ Tin Cậy',
      dataIndex: 'confidence',
      key: 'confidence',
      align: 'center' as const,
      render: (level: ConfidenceLevel, record: CvSpeedRanking) => (
        <span>
          <Tag color={level === 'high' ? 'green' : level === 'medium' ? 'gold' : 'volcano'}>{level.toUpperCase()}</Tag>
          <Text type="secondary" className="text-xs tabular-nums block mt-0.5">
            ({record.sampleSize} mẫu)
          </Text>
        </span>
      ),
    },
    {
      title: 'Xu Hướng (3 Tháng)',
      dataIndex: 'trend',
      key: 'trend',
      align: 'center' as const,
      render: (trend: string) => {
        if (trend === 'improving') {
          return (
            <Tag color="green" icon={<ArrowUpOutlined />} className="tabular-nums">
              Cải thiện ↑
            </Tag>
          );
        }
        if (trend === 'declining') {
          return (
            <Tag color="red" icon={<ArrowDownOutlined />} className="tabular-nums">
              Giảm sút ↓
            </Tag>
          );
        }
        return (
          <Tag color="default" icon={<MinusOutlined />} className="tabular-nums">
            Ổn định →
          </Tag>
        );
      },
    },
  ];

  if (isMobile) {
    return (
      <section aria-label="Bảng xếp hạng tốc độ CV" className="space-y-2.5">
        <div className="rounded-2xl p-2.5 bg-white/95 dark:bg-white/[0.045] border border-slate-200/80 dark:border-white/[0.08] space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
            Xếp hạng tốc độ · {rankingData.length} CV
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Select
              id="ranking-lash-style-select"
              value={rankingStyle}
              onChange={onStyleChange}
              size="small"
              className="w-full"
              options={LASH_STYLES.map((s) => ({ value: s, label: s }))}
            />
            <Select
              id="ranking-lash-count-select"
              value={rankingCount}
              onChange={onCountChange}
              size="small"
              className="w-full"
              options={LASH_COUNTS.map((c) => ({ value: c, label: `${c} sợi` }))}
            />
            <Select
              id="ranking-service-mode-select"
              value={rankingMode}
              onChange={onModeChange}
              size="small"
              className="w-full"
              options={[
                { value: 'normal_clean', label: 'Mi Sạch' },
                { value: 'normal_removal', label: 'Tháo Mi' },
                { value: 'retain', label: 'Dặm Mi' },
              ]}
            />
          </div>
        </div>

        <MobileRecordList
          records={mobileRankingData}
          loading={loading}
          getKey={(record) => String(record.staffId)}
          className="space-y-2"
          recordClassName="!rounded-2xl !px-3.5 !py-3 !bg-white/95 dark:!bg-white/[0.045] !border !border-slate-200/80 dark:!border-white/[0.08] !shadow-xs"
          emptyDescription="Chưa có dữ liệu tốc độ CV"
          renderRecord={(record) => (
            <button
              type="button"
              className="w-full min-w-0 text-left cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => onOpenDetail(record.staffId)}
            >
              <div className="flex min-w-0 items-center justify-between gap-2.5">
                <div className="flex min-w-0 items-center gap-2.5 flex-1">
                  <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-500">
                    {record.rank === 1 ? '🥇' : record.rank === 2 ? '🥈' : record.rank === 3 ? '🥉' : `#${record.rank}`}
                  </span>
                  <CcAvatar name={record.staffName} src={record.avatarUrl} size={34} />
                  <div className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    {record.staffName}
                  </div>
                </div>
                <AppIcon icon={ChevronRight} size={16} className="text-slate-400/75 shrink-0" aria-hidden />
              </div>
              <dl className="mt-2.5 grid grid-cols-3 gap-2 border-t border-slate-200/75 pt-2 dark:border-white/[0.07]">
                <div>
                  <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Dự đoán</dt>
                  <dd className="text-[13.5px] font-bold tabular-nums text-sky-600 dark:text-sky-400">
                    {record.predictedTime}p
                  </dd>
                </div>
                <div>
                  <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Tốc độ</dt>
                  <dd
                    className={`truncate text-[13px] font-bold ${
                      record.speedRating === 'fast'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : record.speedRating === 'slow'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {getRatingBadgeLabel(record.speedRating)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10.5px] text-slate-500 dark:text-slate-400">Mẫu</dt>
                  <dd className="text-[13.5px] font-bold tabular-nums text-slate-700 dark:text-slate-200">
                    {record.sampleSize}
                  </dd>
                </div>
              </dl>
            </button>
          )}
        />
        {rankingData.length > rankingPageSize && (
          <div className="responsive-mobile-pagination">
            <Pagination
              simple
              current={rankingPage}
              pageSize={rankingPageSize}
              total={rankingData.length}
              onChange={onPageChange}
              showSizeChanger={false}
            />
          </div>
        )}
      </section>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span style={{ color: token.colorText }} className="flex items-center gap-2 font-bold">
            <TrophyOutlined style={{ color: '#D4A84B' }} /> Bảng Xếp Hạng Tốc Độ CV
          </span>
          <Space wrap size={6}>
            <Select
              id="ranking-lash-style-select"
              value={rankingStyle}
              onChange={onStyleChange}
              style={{ width: 120 }}
              options={LASH_STYLES.map((s) => ({ value: s, label: s }))}
            />
            <Select
              id="ranking-lash-count-select"
              value={rankingCount}
              onChange={onCountChange}
              style={{ width: 90 }}
              options={LASH_COUNTS.map((c) => ({ value: c, label: `${c} sợi` }))}
            />
            <Select
              id="ranking-service-mode-select"
              value={rankingMode}
              onChange={onModeChange}
              style={{ width: 130 }}
              options={[
                { value: 'normal_clean', label: 'Mi Sạch' },
                { value: 'normal_removal', label: 'Tháo Mi' },
                { value: 'retain', label: 'Dặm Mi' },
              ]}
            />
          </Space>
        </div>
      }
      variant="outlined"
      style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
    >
      <Table
        dataSource={rankingData}
        columns={rankingColumns}
        rowKey={(record, idx) => `ranking_row_${record.staffId}_${idx}`}
        loading={loading}
        bordered
        size="small"
        className="antd-custom-table"
        pagination={{
          current: rankingPage,
          pageSize: rankingPageSize,
          total: rankingData.length,
          onChange: (page, pSize) => {
            onPageChange(page);
            if (pSize && pSize !== rankingPageSize) {
              onPageSizeChange(pSize);
            }
          },
          onShowSizeChange: (current, size) => {
            onPageSizeChange(size);
            onPageChange(1);
          },
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => (
            <span className="tabular-nums text-xs text-gray-500">
              {range[0]}-{range[1]} / {total}
            </span>
          ),
        }}
      />
    </Card>
  );
}

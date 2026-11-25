'use client';

import { TableIndexHeader } from '~/components/ui';

import React from 'react';
import { Card, Table, Select, Button, Spin, Space, Tooltip, Input, Pagination, theme as antTheme } from 'antd';
import { ReloadOutlined, ThunderboltOutlined, SearchOutlined } from '@ant-design/icons';
import { ChevronRight } from 'lucide-react';
import { useTheme } from '../../../../../context/ThemeContext';
import CcAvatar from '../../../cc/components/CcAvatar';
import {
  CvSpeedMatrix,
  CvSpeedMatrixCell,
  CvSpeedMatrixRow,
  isCvRole,
  SpeedRating,
  LashServiceMode,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { AppIcon, MobileRecordList } from '~/components/ui';
import { useCcMobilePortrait } from '~/app/dashboard/cc/components/useCcMobilePortrait';

const LASH_STYLES = ['Classic', 'Mink', 'Volume', 'Ultralight', 'Hyperlight', 'Ivylight', 'Under Mink'];

const LASH_COUNTS = [30, 60, 70, 80, 90, 100, 120, 140];

export interface CvSpeedMatrixSectionProps {
  matrixData: CvSpeedMatrix | null;
  loading: boolean;
  seeding: boolean;
  serviceMode: LashServiceMode;
  lashStyle: string;
  searchCvName: string;
  matrixPage: number;
  matrixPageSize: number;
  onServiceModeChange: (mode: LashServiceMode) => void;
  onLashStyleChange: (style: string) => void;
  onSearchChange: (name: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSeed: () => void;
  onOpenDetail: (staffId: number) => void;
}

export function CvSpeedMatrixSection({
  matrixData,
  loading,
  seeding,
  serviceMode,
  lashStyle,
  searchCvName,
  matrixPage,
  matrixPageSize,
  onServiceModeChange,
  onLashStyleChange,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
  onSeed,
  onOpenDetail,
}: CvSpeedMatrixSectionProps) {
  const { themeMode } = useTheme();
  const { token } = antTheme.useToken();
  const { showMobilePortrait } = useCcMobilePortrait();
  const isMobile = showMobilePortrait;
  const [isCvUser, setIsCvUser] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('mos_user') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        setIsCvUser(isCvRole(parsed?.role));
      }
    } catch {
      // ignore
    }
  }, []);

  const getRatingBadge = (rating: SpeedRating) => {
    if (rating === 'fast') {
      return {
        color: '#52c41a',
        bg: themeMode === 'dark' ? 'rgba(82, 196, 26, 0.2)' : '#f6ffed',
        border: '#b7eb8f',
        label: 'Nhanh (-10%)',
      };
    }
    if (rating === 'slow') {
      return {
        color: '#ff4d4f',
        bg: themeMode === 'dark' ? 'rgba(255, 77, 79, 0.2)' : '#fff2f0',
        border: '#ffccc7',
        label: 'Chậm (+10%)',
      };
    }
    return {
      color: '#faad14',
      bg: themeMode === 'dark' ? 'rgba(250, 173, 20, 0.2)' : '#fffbe6',
      border: '#ffe58f',
      label: 'Chuẩn',
    };
  };

  const displayStyles = lashStyle === 'ALL' ? LASH_STYLES.slice(0, 5) : [lashStyle];

  const matrixColumns = [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      fixed: 'left' as const,
      width: 55,
      align: 'center' as const,
      render: (_: unknown, __: CvSpeedMatrixRow, index: number) => (
        <span className="tabular-nums font-semibold text-xs text-slate-500 dark:text-slate-400">
          {(matrixPage - 1) * matrixPageSize + index + 1}
        </span>
      ),
    },
    {
      title: 'Chuyên Viên (CV)',
      dataIndex: 'staffName',
      key: 'staffName',
      fixed: 'left' as const,
      width: 190,
      render: (text: string, record: CvSpeedMatrixRow) => (
        <a
          onClick={() => onOpenDetail(record.staffId)}
          className="font-medium hover:underline flex items-center gap-2 cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap"
          style={{ color: token.colorPrimary }}
        >
          <CcAvatar name={text} src={record.avatarUrl} size={24} />
          <span className="truncate">{text}</span>
        </a>
      ),
    },
    ...displayStyles.flatMap((style) =>
      LASH_COUNTS.map((count) => ({
        title: `${style} ${count}`,
        key: `${style}_${count}`,
        width: 85,
        align: 'center' as const,
        render: (_: unknown, record: CvSpeedMatrixRow) => {
          const cell: CvSpeedMatrixCell | undefined = record.profiles?.[`${style}_${count}`];
          if (!cell) return <span className="text-gray-400 tabular-nums">-</span>;

          const badge = getRatingBadge(cell.speedRating);
          return (
            <Tooltip
              title={`Thời gian: ${cell.totalMinutes}p | Layer ${cell.modelLayer} (${cell.confidence}) | Mẫu: ${cell.sampleSize} ca`}
            >
              <div
                onClick={() => onOpenDetail(record.staffId)}
                className="cursor-pointer py-1 px-1 rounded text-center text-xs font-semibold tabular-nums transition-transform hover:scale-105"
                style={{
                  color: badge.color,
                  backgroundColor: badge.bg,
                  border: `1px solid ${badge.border}`,
                }}
              >
                {cell.totalMinutes}p
              </div>
            </Tooltip>
          );
        },
      }))
    ),
  ];

  const filteredMatrixRows = React.useMemo(() => {
    if (!matrixData?.data) return [];
    if (!searchCvName.trim()) return matrixData.data;

    const query = removeVietnameseTones(searchCvName.trim().toLowerCase());
    return matrixData.data.filter((row) => removeVietnameseTones(row.staffName.toLowerCase()).includes(query));
  }, [matrixData, searchCvName]);
  const mobileMatrixRows = filteredMatrixRows.slice((matrixPage - 1) * matrixPageSize, matrixPage * matrixPageSize);
  const mobileStyles = lashStyle === 'ALL' ? [LASH_STYLES[0]] : displayStyles;

  const getMobileRatingClass = (rating: SpeedRating) => {
    if (rating === 'fast') {
      return 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
    }
    if (rating === 'slow') {
      return 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/30';
    }
    return 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30';
  };

  if (isMobile) {
    return (
      <section aria-label="Ma trận tốc độ CV" className="space-y-2.5">
        <div className="rounded-2xl p-2.5 bg-white/95 dark:bg-white/[0.045] border border-slate-200/80 dark:border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ma trận · {mobileStyles[0]} · {filteredMatrixRows.length} CV
            </span>
            {!isCvUser && (
              <Button size="small" icon={<ReloadOutlined spin={seeding} />} loading={seeding} onClick={onSeed}>
                Tính lại
              </Button>
            )}
          </div>
          <Input
            id="matrix-search-input"
            name="matrixSearchCvName"
            placeholder="Tìm tên CV..."
            prefix={<SearchOutlined />}
            value={searchCvName}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            size="small"
            className="rounded-xl"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <Select
              id="matrix-lash-style-select"
              value={lashStyle}
              onChange={onLashStyleChange}
              size="small"
              className="w-full"
              options={[{ value: 'ALL', label: 'Tất cả Dáng Mi' }, ...LASH_STYLES.map((s) => ({ value: s, label: s }))]}
            />
            <Select
              id="matrix-service-mode-select"
              value={serviceMode}
              onChange={onServiceModeChange}
              size="small"
              className="w-full"
              options={[
                { value: 'normal_clean', label: 'Mi Sạch (Làm mới)' },
                { value: 'normal_removal', label: 'Mi Cũ (Tháo mi)' },
                { value: 'retain', label: 'Dặm Mi (Retain)' },
              ]}
            />
          </div>
        </div>

        <Spin spinning={loading}>
          <MobileRecordList
            records={mobileMatrixRows}
            className="cv-speed-matrix-mobile-list space-y-2"
            recordClassName="!rounded-2xl !px-3.5 !py-3 !bg-white/95 dark:!bg-white/[0.045] !border !border-slate-200/80 dark:!border-white/[0.08] !shadow-xs"
            getKey={(record) => String(record.staffId)}
            emptyDescription="Chưa có dữ liệu ma trận tốc độ"
            renderRecord={(record) => (
              <div className="min-w-0">
                <button
                  type="button"
                  className="flex w-full min-w-0 items-center gap-2.5 text-left cursor-pointer active:scale-[0.99] transition-transform"
                  onClick={() => onOpenDetail(record.staffId)}
                >
                  <CcAvatar name={record.staffName} src={record.avatarUrl} size={34} />
                  <div className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    {record.staffName}
                  </div>
                  <AppIcon icon={ChevronRight} size={16} className="text-slate-400/75 shrink-0" aria-hidden />
                </button>
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-slate-200/75 pt-2.5 dark:border-white/[0.07]">
                  {mobileStyles.flatMap((style) =>
                    LASH_COUNTS.map((count) => {
                      const cell = record.profiles?.[`${style}_${count}`];
                      if (!cell) return null;
                      return (
                        <button
                          type="button"
                          key={`${style}_${count}`}
                          onClick={() => onOpenDetail(record.staffId)}
                          className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left cursor-pointer ${getMobileRatingClass(cell.speedRating)}`}
                        >
                          <span className="text-[11px] font-medium">
                            {style} {count}
                          </span>
                          <span className="text-xs font-bold tabular-nums">{cell.totalMinutes}p</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          />
          {filteredMatrixRows.length > matrixPageSize && (
            <div className="responsive-mobile-pagination mt-2">
              <Pagination
                simple
                current={matrixPage}
                pageSize={matrixPageSize}
                total={filteredMatrixRows.length}
                onChange={onPageChange}
                showSizeChanger={false}
              />
            </div>
          )}
        </Spin>
      </section>
    );
  }

  return (
    <Card
      className="cv-speed-matrix-card"
      title={
        <div className="cv-speed-matrix-heading flex items-center justify-between flex-wrap gap-2">
          <span style={{ color: token.colorText }} className="flex items-center gap-2 font-bold">
            <ThunderboltOutlined style={{ color: token.colorPrimary }} /> Ma Trận Tốc Độ CV (Logarithmic Model)
          </span>
          <Space className="cv-speed-matrix-controls" wrap>
            <Input
              id="matrix-search-input"
              name="matrixSearchCvName"
              placeholder="Tìm tên CV..."
              prefix={<SearchOutlined />}
              value={searchCvName}
              onChange={(e) => onSearchChange(e.target.value)}
              allowClear
              style={{ width: 160 }}
            />
            <Select
              id="matrix-lash-style-select"
              value={lashStyle}
              onChange={onLashStyleChange}
              style={{ width: 140 }}
              options={[{ value: 'ALL', label: 'Tất cả Dáng Mi' }, ...LASH_STYLES.map((s) => ({ value: s, label: s }))]}
            />
            <Select
              id="matrix-service-mode-select"
              value={serviceMode}
              onChange={onServiceModeChange}
              style={{ width: 170 }}
              options={[
                { value: 'normal_clean', label: 'Mi Sạch (Làm mới)' },
                { value: 'normal_removal', label: 'Mi Cũ (Tháo mi)' },
                { value: 'retain', label: 'Dặm Mi (Retain)' },
              ]}
            />
            {!isCvUser && (
              <Button type="primary" icon={<ReloadOutlined spin={seeding} />} loading={seeding} onClick={onSeed}>
                Tính Lại Tốc Độ
              </Button>
            )}
          </Space>
        </div>
      }
      variant="outlined"
      style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
    >
      <Spin spinning={loading}>
        <Table
          dataSource={filteredMatrixRows}
          columns={matrixColumns}
          rowKey={(record, idx) => `matrix_row_${record.staffId}_${idx}`}
          bordered
          scroll={{ x: 'max-content' }}
          size="small"
          className="antd-custom-table"
          pagination={{
            current: matrixPage,
            pageSize: matrixPageSize,
            total: filteredMatrixRows.length,
            onChange: (page, pSize) => {
              onPageChange(page);
              if (pSize && pSize !== matrixPageSize) {
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
                Hiển thị {range[0]}-{range[1]} / Tổng {total} CV
              </span>
            ),
          }}
        />
      </Spin>
    </Card>
  );
}

'use client';

import { TableIndexHeader } from '~/components/ui';

import React from 'react';
import { Card, Table, Select, Button, Spin, Space, Tooltip, Input, theme as antTheme } from 'antd';
import { ReloadOutlined, ThunderboltOutlined, UserOutlined, SearchOutlined } from '@ant-design/icons';
import { useTheme } from '../../../../../context/ThemeContext';
import {
  CvSpeedMatrix,
  CvSpeedMatrixCell,
  CvSpeedMatrixRow,
  SpeedRating,
  LashServiceMode,
  removeVietnameseTones,
} from '@mos-lab/shared';

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
  onServiceModeChange: (mode: LashServiceMode) => void;
  onLashStyleChange: (style: string) => void;
  onSearchChange: (name: string) => void;
  onPageChange: (page: number) => void;
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
  onServiceModeChange,
  onLashStyleChange,
  onSearchChange,
  onPageChange,
  onSeed,
  onOpenDetail,
}: CvSpeedMatrixSectionProps) {
  const { themeMode } = useTheme();
  const { token } = antTheme.useToken();

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
          {(matrixPage - 1) * 20 + index + 1}
        </span>
      ),
    },
    {
      title: 'Chuyên Viên (CV)',
      dataIndex: 'staffName',
      key: 'staffName',
      fixed: 'left' as const,
      width: 170,
      render: (text: string, record: CvSpeedMatrixRow) => (
        <a
          onClick={() => onOpenDetail(record.staffId)}
          className="font-medium hover:underline flex items-center gap-1.5 cursor-pointer"
          style={{ color: token.colorPrimary }}
        >
          <UserOutlined /> {text}
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

  return (
    <Card
      title={
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span style={{ color: token.colorText }} className="flex items-center gap-2 font-bold">
            <ThunderboltOutlined style={{ color: token.colorPrimary }} /> Ma Trận Tốc Độ CV (Logarithmic Model)
          </span>
          <Space wrap>
            <Input
              placeholder="Tìm tên CV..."
              prefix={<SearchOutlined />}
              value={searchCvName}
              onChange={(e) => onSearchChange(e.target.value)}
              allowClear
              style={{ width: 160 }}
            />
            <Select
              value={lashStyle}
              onChange={onLashStyleChange}
              style={{ width: 140 }}
              options={[{ value: 'ALL', label: 'Tất cả Dáng Mi' }, ...LASH_STYLES.map((s) => ({ value: s, label: s }))]}
            />
            <Select
              value={serviceMode}
              onChange={onServiceModeChange}
              style={{ width: 170 }}
              options={[
                { value: 'normal_clean', label: 'Mi Sạch (Làm mới)' },
                { value: 'normal_removal', label: 'Mi Cũ (Tháo mi)' },
                { value: 'retain', label: 'Dặm Mi (Retain)' },
              ]}
            />
            <Button type="primary" icon={<ReloadOutlined spin={seeding} />} loading={seeding} onClick={onSeed}>
              Tính Lại Mẫu Tốc Độ
            </Button>
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
          rowKey="staffId"
          bordered
          scroll={{ x: 'max-content' }}
          size="small"
          className="antd-custom-table"
          pagination={{
            current: matrixPage,
            pageSize: 10,
            total: filteredMatrixRows.length,
            onChange: onPageChange,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
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

'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, theme, Row, Col, Statistic, Input, Space, Button, Tooltip } from 'antd';
import {
  TrophyOutlined,
  DollarOutlined,
  SearchOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  FilterOutlined,
  SettingOutlined,
  CompressOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CvXoayRecord, removeVietnameseTones } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTableConfig } from '../../../../hooks/useTableConfig';
import { TableConfigDrawer } from '../../../../components/TableConfigDrawer';
import CcAvatar from '../../cc/components/CcAvatar';

export const formatStoreCode = (store?: string | null): string => {
  if (!store) return 'PXL';
  const s = String(store).toUpperCase().trim();
  if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
  if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
  if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
  return s;
};

interface CvXoayTabProps {
  loading?: boolean;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  selectedConsultant?: string;
}

interface CvLeaderboardRow {
  rank: number;
  techName: string;
  avatar?: string | null;
  store: string;
  techLevel: number;
  totalServices: number;
  totalPoints: number;
  totalBonus: number;
  maxPointsAccu: number;
}

export default function CvXoayTab({
  loading: parentLoading,
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant = 'ALL',
}: CvXoayTabProps) {
  const { token } = theme.useToken();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CvXoayRecord[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [summary, setSummary] = useState({
    totalServices: 0,
    totalBonus: 0,
    totalPoints: 0,
  });
  const [pageSize, setPageSize] = useState<number>(50);
  const [selectedCvName, setSelectedCvName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cv_xoay_page_size');
      if (saved) {
        setPageSize(parseInt(saved, 10));
      }
    }
  }, []);

  useEffect(() => {
    setSelectedCvName(null);
  }, [selectedConsultant]);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

      const res = await apiClient.kpi.getCvXoayReport({
        dateFrom,
        dateTo,
        storeId: selectedStore,
        consultantId: selectedConsultant,
      });

      if (res) {
        setData(res.data || []);
        setSummary(res.summary || { totalServices: 0, totalBonus: 0, totalPoints: 0 });
      }
    } catch (err) {
      console.error('Error fetching CV Xoay report:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedStore, selectedConsultant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate Leaderboard entries grouped by Technician
  const leaderboard = React.useMemo<CvLeaderboardRow[]>(() => {
    const map = new Map<
      string,
      {
        techName: string;
        avatar?: string | null;
        store: string;
        techLevel: number;
        totalServices: number;
        totalPoints: number;
        totalBonus: number;
        maxPointsAccu: number;
      }
    >();

    data.forEach((item) => {
      const name = item.techName || 'Chưa phân công';
      const existing = map.get(name) || {
        techName: name,
        avatar: item.avatar,
        store: item.store || 'PXL',
        techLevel: item.techLevel || 1,
        totalServices: 0,
        totalPoints: 0,
        totalBonus: 0,
        maxPointsAccu: 0,
      };

      if (!existing.avatar && item.avatar) {
        existing.avatar = item.avatar;
      }
      existing.totalServices += 1;
      existing.totalPoints += item.techPoints;
      existing.totalBonus += item.techBonus;
      if (item.pointsAccu > existing.maxPointsAccu) {
        existing.maxPointsAccu = item.pointsAccu;
      }
      if (item.techLevel > existing.techLevel) {
        existing.techLevel = item.techLevel;
      }
      map.set(name, existing);
    });

    const list = Array.from(map.values());
    list.sort((a, b) => b.totalBonus - a.totalBonus || b.totalPoints - a.totalPoints);

    return list.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));
  }, [data]);

  const filteredData = React.useMemo(() => {
    let result = data;
    if (selectedCvName) {
      result = result.filter((item) => item.techName.toLowerCase() === selectedCvName.toLowerCase());
    }
    if (searchText) {
      const q = removeVietnameseTones(searchText);
      result = result.filter(
        (item) =>
          removeVietnameseTones(item.techName).includes(q) ||
          removeVietnameseTones(item.clientName).includes(q) ||
          removeVietnameseTones(item.serviceName).includes(q) ||
          removeVietnameseTones(item.store).includes(q)
      );
    }
    return result;
  }, [data, selectedCvName, searchText]);

  const leaderboardColumns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <span style={{ fontSize: '18px' }}>🥇</span>;
        if (rank === 2) return <span style={{ fontSize: '18px' }}>🥈</span>;
        if (rank === 3) return <span style={{ fontSize: '18px' }}>🥉</span>;
        return <span className="tabular-nums font-semibold text-slate-500 text-xs">#{rank}</span>;
      },
    },
    {
      title: 'Chuyên Viên (CV)',
      dataIndex: 'techName',
      key: 'techName',
      render: (name: string, record: CvLeaderboardRow) => {
        const isSelected = searchText.toLowerCase() === name.toLowerCase();
        return (
          <Space className="cursor-pointer group whitespace-nowrap" size={8}>
            <CcAvatar name={name} src={record.avatar} size={32} isSelected={isSelected} />
            <div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className={`font-semibold text-xs transition-colors whitespace-nowrap ${
                    isSelected ? 'text-amber-400 underline underline-offset-2' : 'hover:text-amber-400'
                  }`}
                  style={{ color: isSelected ? undefined : token.colorText }}
                >
                  {name}
                </span>
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                  · {formatStoreCode(record.store)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">L{record.techLevel}</span>
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Cơ Sở',
      dataIndex: 'store',
      key: 'store',
      width: 80,
      render: (store: string) => (
        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">· {formatStoreCode(store)}</span>
      ),
    },
    {
      title: 'Lượt Ca Dịch Vụ',
      dataIndex: 'totalServices',
      key: 'totalServices',
      align: 'right' as const,
      render: (val: number) => <span className="tabular-nums font-semibold text-purple-400 text-xs">{val} ca</span>,
    },
    {
      title: 'Tổng Điểm Tích Luỹ',
      dataIndex: 'totalPoints',
      key: 'totalPoints',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-blue-400 text-xs">+{val.toLocaleString('vi-VN')} pts</span>
      ),
    },
    {
      title: 'Thưởng Ca CV (đ)',
      dataIndex: 'totalBonus',
      key: 'totalBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-emerald-400 text-sm">{val.toLocaleString('vi-VN')}đ</span>
      ),
    },
  ];

  const staticColumns = [
    {
      title: 'Thời Gian Check-in',
      dataIndex: 'checkin',
      key: 'checkin',
      width: 140,
      render: (text: string) => <span className="tabular-nums text-xs text-slate-400 font-medium">{text}</span>,
    },
    {
      title: 'Chuyên Viên (CV)',
      dataIndex: 'techName',
      key: 'techName',
      width: 160,
      render: (text: string, record: CvXoayRecord) => (
        <Space size={6} className="whitespace-nowrap">
          <CcAvatar name={text} src={record.avatar} size={24} />
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="font-semibold text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
              {text || 'N/A'}
            </span>
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">· L{record.techLevel}</span>
          </div>
        </Space>
      ),
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      width: 130,
      render: (text: string) => <span className="font-semibold text-xs text-sky-400">{text || 'Khách Vãng Lai'}</span>,
    },
    {
      title: 'Cơ Sở',
      dataIndex: 'store',
      key: 'store',
      width: 80,
      render: (text: string) => (
        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">· {formatStoreCode(text)}</span>
      ),
    },
    {
      title: 'Tên Dịch Vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 170,
      render: (text: string) => <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{text}</span>,
    },
    {
      title: 'FAL Rule',
      dataIndex: 'falRule',
      key: 'falRule',
      width: 80,
      render: (rule?: string) => {
        if (!rule) return <span className="text-slate-500 text-xs">-</span>;
        return (
          <Tag
            color={rule === 'Fix' ? 'error' : rule === 'Adjust' ? 'warning' : 'default'}
            className="font-semibold text-[10px] m-0 py-0 px-1"
          >
            {rule}
          </Tag>
        );
      },
    },
    {
      title: 'Bóc Tách Điểm (Class/Fan/Type/Lash/Design/Color)',
      key: 'pointBreakdown',
      width: 220,
      render: (_: unknown, record: CvXoayRecord) => (
        <div className="text-[10px] space-y-0.5 tabular-nums">
          <div className="flex gap-1 flex-wrap">
            {record.classPts > 0 && (
              <span className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded font-mono">
                Class +{record.classPts}
              </span>
            )}
            {record.fanPts > 0 && (
              <span className="text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded font-mono">Fan +{record.fanPts}</span>
            )}
            {record.typePts > 0 && (
              <span className="text-sky-400 bg-sky-500/10 px-1 py-0.5 rounded font-mono">Type +{record.typePts}</span>
            )}
            {record.lashPts > 0 && (
              <span className="text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded font-mono">Lash +{record.lashPts}</span>
            )}
            {record.designPts > 0 && (
              <span className="text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded font-mono">
                Design +{record.designPts}
              </span>
            )}
            {record.colorPts > 0 && (
              <span className="text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded font-mono">
                Color +{record.colorPts}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Điểm Ca (+pts)',
      dataIndex: 'techPoints',
      key: 'techPoints',
      width: 100,
      align: 'right' as const,
      render: (pts: number) => (
        <span className="tabular-nums font-bold text-xs text-cyan-400">+{pts.toLocaleString('vi-VN')} pts</span>
      ),
    },
    {
      title: 'Điểm Tích Luỹ (Accu)',
      dataIndex: 'pointsAccu',
      key: 'pointsAccu',
      width: 110,
      align: 'right' as const,
      render: (accu: number) => (
        <span className="tabular-nums font-semibold text-xs text-blue-400">{accu.toLocaleString('vi-VN')} pts</span>
      ),
    },
    {
      title: 'Thưởng Ca CV (đ)',
      dataIndex: 'techBonus',
      key: 'techBonus',
      width: 110,
      align: 'right' as const,
      render: (bonus: number) => (
        <span className="tabular-nums font-bold text-xs text-emerald-400">{bonus.toLocaleString('vi-VN')}đ</span>
      ),
    },
  ];

  const {
    loading: configLoading,
    columns: configuredColumns,
    rawConfig,
    configVisible,
    openConfig,
    closeConfig,
    saveConfig,
    resetConfig,
  } = useTableConfig('cv_xoay_table', staticColumns);

  return (
    <div className="flex flex-col gap-4">
      {/* 3 Top Summary Metrics */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={8}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="Tổng Lượt Ca Làm"
              value={summary.totalServices}
              suffix="lượt"
              valueStyle={{ color: '#1890ff', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="Tổng Điểm Tích Lũy (Points)"
              value={summary.totalPoints}
              suffix="pts"
              valueStyle={{ color: '#52c41a', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: '#d4a84b' }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="Tổng Thưởng Ca CV"
              value={summary.totalBonus}
              suffix="đ"
              valueStyle={{ color: '#d4a84b', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Leaderboard Card */}
      <Card
        className="full-bleed-card shadow-sm mb-4 rounded-xl"
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary, marginBottom: '16px' }}
        styles={{ body: { padding: 0 } }}
        title={
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <TrophyOutlined className="text-amber-500 text-lg" />
              <span style={{ color: token.colorText }} className="font-bold text-base">
                Bảng Xếp Hạng Báo Cáo Chuyên Viên (CV Leaderboard)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <FilterOutlined className="text-blue-500" />
              <span>Mẹo: Click vào dòng CV để lọc nhanh bảng chi tiết ca làm bên dưới</span>
            </div>
          </div>
        }
        extra={
          selectedCvName && (
            <Button type="dashed" size="small" onClick={() => setSelectedCvName(null)} className="text-xs font-medium">
              Bỏ lọc: {selectedCvName}
            </Button>
          )
        }
      >
        <Table
          dataSource={leaderboard}
          columns={leaderboardColumns}
          rowKey="techName"
          size="small"
          pagination={false}
          loading={loading || parentLoading}
          scroll={{ x: 'max-content' }}
          className="antd-custom-table"
          locale={{ emptyText: 'Chưa có dữ liệu xếp hạng Chuyên viên' }}
          onRow={(record) => ({
            onClick: () => {
              if (selectedCvName && selectedCvName.toLowerCase() === record.techName.toLowerCase()) {
                setSelectedCvName(null);
              } else {
                setSelectedCvName(record.techName);
              }
            },
          })}
          rowClassName={(record) =>
            selectedCvName && selectedCvName.toLowerCase() === record.techName.toLowerCase()
              ? 'bg-amber-500/10 dark:bg-amber-500/20 border-l-4 border-amber-500 font-bold cursor-pointer'
              : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }
        />
      </Card>

      {/* Main Detailed Service Table Card */}
      <Card
        className="full-bleed-card shadow-sm rounded-xl"
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: 0 } }}
        title={
          <div className="flex flex-wrap justify-between items-center gap-2 py-1">
            <div className="flex items-center gap-2">
              <SafetyCertificateOutlined className="text-blue-500 text-lg" />
              <span className="font-bold text-base" style={{ color: token.colorText }}>
                Bảng Báo Cáo Chi Tiết Ca Làm Chuyên Viên (CV Xoay)
              </span>
              {selectedCvName && (
                <Tag color="gold" className="font-bold text-xs ml-2">
                  Chuyên viên: {selectedCvName}
                </Tag>
              )}
            </div>

            <Space wrap>
              <Input
                placeholder="Tìm tên CV, khách hàng, dịch vụ..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ width: 250 }}
              />
              <Tooltip title={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}>
                <Button
                  icon={isCompact ? <ExpandOutlined /> : <CompressOutlined />}
                  onClick={() => setIsCompact(!isCompact)}
                  className={isCompact ? 'text-amber-500 border-amber-500/50' : ''}
                />
              </Tooltip>
              <Tooltip title="Làm mới dữ liệu">
                <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} />
              </Tooltip>
              <Tooltip title="Cấu hình cột">
                <Button icon={<SettingOutlined />} onClick={openConfig} />
              </Tooltip>
            </Space>
          </div>
        }
      >
        <Table
          dataSource={filteredData}
          columns={configuredColumns}
          rowKey="orderServiceId"
          loading={loading || parentLoading || configLoading}
          pagination={{
            pageSize: pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100', '200'],
            showTotal: (total) => `Tổng số ${total} ca làm dịch vụ`,
            onChange: (page, size) => {
              setPageSize(size);
              localStorage.setItem('cv_xoay_page_size', size.toString());
            },
          }}
          scroll={{ x: 1300 }}
          size="small"
          bordered
          className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
        />
      </Card>

      <TableConfigDrawer
        visible={configVisible}
        onClose={closeConfig}
        title="Cấu hình cột Báo Cáo CV Xoay"
        columns={rawConfig}
        onSave={saveConfig}
        onReset={resetConfig}
      />
    </div>
  );
}

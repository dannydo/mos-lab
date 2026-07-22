'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, theme, Row, Col, Statistic, Input, Space, Button } from 'antd';
import {
  TrophyOutlined,
  DollarOutlined,
  SearchOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  FilterOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CvXoayRecord } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTableConfig } from '../../../../hooks/useTableConfig';
import { TableConfigDrawer } from '../../../../components/TableConfigDrawer';

interface CvXoayTabProps {
  loading?: boolean;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  selectedConsultant?: string;
}

interface CvLeaderboardRow {
  rank: number;
  techName: string;
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
        store: item.store || 'PXL',
        techLevel: item.techLevel || 1,
        totalServices: 0,
        totalPoints: 0,
        totalBonus: 0,
        maxPointsAccu: 0,
      };

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
      const lower = searchText.toLowerCase();
      result = result.filter(
        (item) =>
          item.techName.toLowerCase().includes(lower) ||
          item.clientName.toLowerCase().includes(lower) ||
          item.serviceName.toLowerCase().includes(lower) ||
          item.store.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [data, selectedCvName, searchText]);

  const leaderboardColumns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <span style={{ fontSize: '20px' }}>🥇</span>;
        if (rank === 2) return <span style={{ fontSize: '20px' }}>🥈</span>;
        if (rank === 3) return <span style={{ fontSize: '20px' }}>🥉</span>;
        return <span className="tabular-nums font-semibold text-gray-500">#{rank}</span>;
      },
    },
    {
      title: 'Chuyên Viên (CV)',
      dataIndex: 'techName',
      key: 'techName',
      render: (name: string, record: CvLeaderboardRow) => {
        const isSelected = searchText.toLowerCase() === name.toLowerCase();
        return (
          <Space className="cursor-pointer">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                isSelected ? 'bg-blue-500 text-white shadow-md' : 'bg-blue-500/10 text-blue-500'
              }`}
            >
              {name.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: token.colorText }}>
                {name}
              </div>
              <Tag color="blue" className="text-[10px] m-0 tabular-nums">
                Level {record.techLevel}
              </Tag>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Cơ Sở',
      dataIndex: 'store',
      key: 'store',
      width: 90,
      render: (store: string) => <Tag color="cyan">{store}</Tag>,
    },
    {
      title: 'Lượt Ca Dịch Vụ',
      dataIndex: 'totalServices',
      key: 'totalServices',
      align: 'right' as const,
      render: (val: number) => <span className="tabular-nums font-bold text-purple-500">{val} ca</span>,
    },
    {
      title: 'Tổng Điểm Tích Luỹ',
      dataIndex: 'totalPoints',
      key: 'totalPoints',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-amber-500">+{val.toLocaleString('vi-VN')} pts</span>
      ),
    },
    {
      title: 'Thưởng Ca CV (đ)',
      dataIndex: 'totalBonus',
      key: 'totalBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
          {val.toLocaleString('vi-VN')}đ
        </span>
      ),
    },
  ];

  const staticColumns = [
    {
      title: 'Thời Gian Check-in',
      dataIndex: 'checkin',
      key: 'checkin',
      width: 155,
      render: (text: string) => <span className="tabular-nums font-mono text-xs">{text}</span>,
    },
    {
      title: 'Chuyên Viên (CV)',
      dataIndex: 'techName',
      key: 'techName',
      width: 150,
      render: (text: string, record: CvXoayRecord) => (
        <div>
          <div className="font-semibold text-sm" style={{ color: token.colorText }}>
            {text || 'N/A'}
          </div>
          <Tag color="blue" className="text-[10px] mt-0.5 tabular-nums">
            Level {record.techLevel}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      width: 140,
      render: (text: string) => <span className="font-medium text-xs">{text || 'Khách Vãng Lai'}</span>,
    },
    {
      title: 'Cơ Sở',
      dataIndex: 'store',
      key: 'store',
      width: 90,
      render: (text: string) => <Tag color="cyan">{text}</Tag>,
    },
    {
      title: 'Tên Dịch Vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 180,
      render: (text: string) => <span className="text-xs font-semibold">{text}</span>,
    },
    {
      title: 'FAL Rule',
      dataIndex: 'falRule',
      key: 'falRule',
      width: 100,
      render: (rule?: string) => {
        if (!rule) return <Tag color="default">-</Tag>;
        if (rule === 'Fix') return <Tag color="error">Fix</Tag>;
        if (rule === 'Adjust') return <Tag color="warning">Adjust</Tag>;
        if (rule === 'Log') return <Tag color="purple">Log</Tag>;
        return <Tag color="blue">{rule}</Tag>;
      },
    },
    {
      title: 'Bóc Tách Điểm (Class/Fan/Type/Lash/Design/Color)',
      key: 'pointBreakdown',
      width: 240,
      render: (_: unknown, record: CvXoayRecord) => (
        <div className="text-[11px] space-y-0.5 tabular-nums">
          <div className="flex gap-1 flex-wrap">
            {record.classPts > 0 && (
              <Tag color="green" className="m-0 text-[10px] tabular-nums">
                Class: +{record.classPts}
              </Tag>
            )}
            {record.fanPts > 0 && (
              <Tag color="gold" className="m-0 text-[10px] tabular-nums">
                Fan: +{record.fanPts}
              </Tag>
            )}
            {record.typePts > 0 && (
              <Tag color="geekblue" className="m-0 text-[10px] tabular-nums">
                Type: +{record.typePts}
              </Tag>
            )}
            {record.lashPts > 0 && (
              <Tag color="volcano" className="m-0 text-[10px] tabular-nums">
                Lash: +{record.lashPts}
              </Tag>
            )}
            {record.designPts > 0 && (
              <Tag color="magenta" className="m-0 text-[10px] tabular-nums">
                Design: +{record.designPts}
              </Tag>
            )}
            {record.colorPts > 0 && (
              <Tag color="purple" className="m-0 text-[10px] tabular-nums">
                Color: +{record.colorPts}
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Điểm Ca (+pts)',
      dataIndex: 'techPoints',
      key: 'techPoints',
      width: 110,
      align: 'right' as const,
      render: (pts: number) => (
        <span className="tabular-nums font-bold text-amber-500">+{pts.toLocaleString('vi-VN')} pts</span>
      ),
    },
    {
      title: 'Điểm Tích Luỹ (Accu)',
      dataIndex: 'pointsAccu',
      key: 'pointsAccu',
      width: 130,
      align: 'right' as const,
      render: (accu: number) => (
        <span className="tabular-nums font-semibold text-blue-500">{accu.toLocaleString('vi-VN')} pts</span>
      ),
    },
    {
      title: 'Thưởng Ca CV (đ)',
      dataIndex: 'techBonus',
      key: 'techBonus',
      width: 130,
      align: 'right' as const,
      render: (bonus: number) => (
        <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
          {bonus.toLocaleString('vi-VN')}đ
        </span>
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
    <div className="space-y-4">
      {/* Metrics Row */}
      <Row gutter={[16, 16]} className="mb-2">
        <Col xs={24} sm={8}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="Tổng Lượt Dịch Vụ CV"
              value={summary.totalServices}
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
              title="Tổng Điểm CV Tích Luỹ"
              value={summary.totalPoints}
              suffix="pts"
              valueStyle={{ color: '#faad14', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
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
        className="full-bleed-card shadow-sm mb-6 rounded-xl"
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary, marginBottom: '24px' }}
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
              <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
                Tải lại
              </Button>
              <Button icon={<SettingOutlined />} onClick={openConfig}>
                Cấu hình cột
              </Button>
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
          className="antd-custom-table"
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

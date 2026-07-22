'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  theme,
  Divider,
  Table,
  Tag,
  Button,
  Modal,
  Input,
  Space,
  Tooltip,
  Statistic,
  Spin,
} from 'antd';
import {
  WalletOutlined,
  DollarOutlined,
  SearchOutlined,
  EyeOutlined,
  UserOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  GiftOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { CcPaystubRecord, CcPaystubResponse, CcWorkLogDetailRecord, CcWorkLogDetailResponse } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import dayjs from 'dayjs';

const { Text } = Typography;

interface CcThuNhapTabProps {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
}

export default function CcThuNhapTab({ dateRange, selectedStore }: CcThuNhapTabProps) {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [paystubData, setPaystubData] = useState<CcPaystubRecord[]>([]);
  const [summary, setSummary] = useState({
    totalHourlyWage: 0,
    totalCcXoayBonus: 0,
    totalComboProductBonus: 0,
    totalMinigameBonus: 0,
    totalCcTipBonus: 0,
    totalDiamondBonus: 0,
    grandTotalIncome: 0,
  });

  const [searchText, setSearchText] = useState('');

  // Individual Paystub Detail Modal State
  const [selectedRecord, setSelectedRecord] = useState<CcPaystubRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Daily Work Log (Hourly Wage) Detail Modal State
  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);
  const [workLogLoading, setWorkLogLoading] = useState(false);
  const [workLogRecord, setWorkLogRecord] = useState<CcPaystubRecord | null>(null);
  const [workLogs, setWorkLogs] = useState<CcWorkLogDetailRecord[]>([]);
  const [workLogSummary, setWorkLogSummary] = useState({
    totalWorkDays: 0,
    totalWorkHours: 0,
    hourlyRate: 25000,
    totalWage: 0,
  });

  // Persistent Work Log Modal Width state (Default: 800px)
  const [modalWidth, setModalWidth] = useState<number>(800);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = React.useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 800 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('cc_worklog_modal_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 600 && parsed <= 1800) {
          setModalWidth(parsed);
        }
      }
    }
  }, []);

  const updateModalWidth = (newWidth: number) => {
    const clamped = Math.max(600, Math.min(1800, newWidth));
    setModalWidth(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cc_worklog_modal_width', clamped.toString());
    }
  };

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      dragStartRef.current = { startX: e.clientX, startWidth: modalWidth };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - dragStartRef.current.startX;
        const newWidth = dragStartRef.current.startWidth + deltaX * 2;
        const clamped = Math.max(600, Math.min(1800, newWidth));
        setModalWidth(clamped);
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        setIsResizing(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        const deltaX = upEvent.clientX - dragStartRef.current.startX;
        const finalWidth = Math.max(600, Math.min(1800, dragStartRef.current.startWidth + deltaX * 2));
        if (typeof window !== 'undefined') {
          localStorage.setItem('cc_worklog_modal_width', finalWidth.toString());
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [modalWidth]
  );

  const fetchPaystubData = async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined;
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined;
      const month = dateRange ? dateRange[0].format('YYYY-MM') : undefined;

      const [res, diamondRes] = await Promise.all([
        apiClient.kpi.getCcPaystub({
          dateFrom,
          dateTo,
          storeId: selectedStore,
        }),
        apiClient.kpi
          .getCcDiamondData({
            month,
            date_from: dateFrom,
            date_to: dateTo,
          })
          .catch(() => null),
      ]);

      const diamondMap = new Map<number, { thuong: number; cnt: number }>();
      if (diamondRes && diamondRes.data) {
        for (const item of diamondRes.data) {
          diamondMap.set(item.ccId, { thuong: item.thuongDiamond, cnt: item.soKhachDiamond });
        }
      }

      if (res && res.data) {
        let sumDiamond = 0;
        const enrichedData = res.data.map((r) => {
          const dInfo = diamondMap.get(r.consultantId) || { thuong: 0, cnt: 0 };
          sumDiamond += dInfo.thuong;
          const totalInc =
            (r.hourlyWage || 0) +
            (r.ccXoayBonus || 0) +
            (r.comboProductBonus || 0) +
            (r.ccTipBonus || 0) +
            (r.minigameBonus || 0) +
            dInfo.thuong;

          return {
            ...r,
            diamondBonus: dInfo.thuong,
            diamondCount: dInfo.cnt,
            totalIncome: totalInc,
          };
        });

        setPaystubData(enrichedData);

        if (res.summary) {
          setSummary({
            totalHourlyWage: res.summary.totalHourlyWage || 0,
            totalCcXoayBonus: res.summary.totalCcXoayBonus || 0,
            totalComboProductBonus: res.summary.totalComboProductBonus || 0,
            totalMinigameBonus: res.summary.totalMinigameBonus || 0,
            totalCcTipBonus: res.summary.totalCcTipBonus || 0,
            totalDiamondBonus: sumDiamond,
            grandTotalIncome: (res.summary.grandTotalIncome || 0) + sumDiamond,
          });
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu Paystub CC:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaystubData();
  }, [dateRange, selectedStore]);

  const filteredData = useMemo(() => {
    if (!searchText) return paystubData;
    const lower = searchText.toLowerCase();
    return paystubData.filter(
      (r) => r.displayName.toLowerCase().includes(lower) || r.store.toLowerCase().includes(lower)
    );
  }, [paystubData, searchText]);

  const handleOpenDetailModal = (record: CcPaystubRecord) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  const handleOpenWorkLogModal = async (record: CcPaystubRecord) => {
    setWorkLogRecord(record);
    setWorkLogModalOpen(true);
    setWorkLogLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined;
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined;

      const res = await apiClient.kpi.getCcWorkLogs({
        consultantId: record.consultantId,
        dateFrom,
        dateTo,
      });

      if (res && res.data) {
        setWorkLogs(res.data);
        if (res.summary) {
          setWorkLogSummary(res.summary);
        }
      }
    } catch (err) {
      console.error('Lỗi tải chi tiết ca làm việc IN/OUT:', err);
    } finally {
      setWorkLogLoading(false);
    }
  };

  const columns = [
    {
      title: 'Hạng / CC',
      dataIndex: 'displayName',
      key: 'displayName',
      width: 220,
      render: (name: string, record: CcPaystubRecord, index: number) => {
        return (
          <Space className="group cursor-pointer" onClick={() => handleOpenDetailModal(record)}>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 font-bold flex items-center justify-center text-xs group-hover:bg-amber-500 group-hover:text-black transition-all">
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: token.colorText }}>
                {name}
              </div>
              <Tag color={record.store === 'PXL' ? 'blue' : 'purple'} className="text-[10px] m-0">
                CN: {record.store}
              </Tag>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Lương Giờ',
      dataIndex: 'hourlyWage',
      key: 'hourlyWage',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        const rate = record.hourlyRate || 25000;
        return (
          <Tooltip
            title={`Click để xem Báo cáo Chi Tiết Ca Làm Việc IN/OUT (${record.totalWorkHours}h @ ${rate.toLocaleString('vi-VN')}đ/h)`}
          >
            <div
              className="text-right cursor-pointer group hover:bg-blue-500/10 p-1.5 rounded-lg transition-colors border border-transparent hover:border-blue-500/30"
              onClick={() => handleOpenWorkLogModal(record)}
            >
              <div className="tabular-nums font-bold text-blue-500 text-sm group-hover:underline underline-offset-2">
                +{Math.round(val || 0).toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[11px] text-gray-400 tabular-nums flex items-center justify-end gap-1">
                <span>
                  ({record.totalWorkHours}h @ {Math.round(rate / 1000)}k/h)
                </span>
                <EyeOutlined className="text-[10px] text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Thưởng CC Xoay',
      dataIndex: 'ccXoayBonus',
      key: 'ccXoayBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => (
        <Tooltip title={`${record.checkinCount} lượt check-in phục vụ`}>
          <div className="text-right">
            <span className="tabular-nums font-bold text-purple-500 text-sm">
              +{Math.round(val || 0).toLocaleString('vi-VN')} đ
            </span>
            <div className="text-[11px] text-gray-400 tabular-nums">({record.checkinCount} lượt)</div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Thưởng Combo & SP',
      dataIndex: 'comboProductBonus',
      key: 'comboProductBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => (
        <Tooltip title={`${record.comboCount} combo + ${record.productCount} sản phẩm`}>
          <div className="text-right">
            <span className="tabular-nums font-bold text-emerald-500 text-sm">
              +{Math.round(val || 0).toLocaleString('vi-VN')} đ
            </span>
            <div className="text-[11px] text-gray-400 tabular-nums">
              ({record.comboCount} combo / {record.productCount} SP)
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Thưởng CC Tip (20%)',
      dataIndex: 'ccTipBonus',
      key: 'ccTipBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => (
        <Tooltip title={`Nhận 20% tiền tip từ ${record.tippedVisitsCount || 0} lượt khách`}>
          <div className="text-right">
            <span className="tabular-nums font-bold text-amber-500 text-sm">
              +{Math.round(val || 0).toLocaleString('vi-VN')} đ
            </span>
            <div className="text-[11px] text-gray-400 tabular-nums">({record.tippedVisitsCount || 0} ca tip)</div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Thưởng Kim Cương',
      dataIndex: 'diamondBonus',
      key: 'diamondBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => (
        <Tooltip title={`Giới thiệu ${record.diamondCount || 0} khách hàng mới`}>
          <div className="text-right">
            <span className="tabular-nums font-bold text-cyan-500 text-sm">
              +{Math.round(val || 0).toLocaleString('vi-VN')} đ
            </span>
            <div className="text-[11px] text-gray-400 tabular-nums">({record.diamondCount || 0} khách 💎)</div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Thưởng Nóng Minigame',
      dataIndex: 'minigameBonus',
      key: 'minigameBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-amber-500 text-sm">
          +{Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Tổng Thu Nhập Tạm Tính',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-extrabold text-amber-500 text-base">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Thao Tác',
      key: 'action',
      align: 'center' as const,
      width: 140,
      render: (_: unknown, record: CcPaystubRecord) => (
        <Button
          size="small"
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleOpenDetailModal(record)}
          style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000', fontWeight: '500' }}
        >
          Xem Paystub
        </Button>
      ),
    },
  ];

  // Paystub detail modal breakdown items
  const modalPaystubDetails = selectedRecord
    ? [
        {
          key: 1,
          item: 'Lương Cứng Cơ Bản (Wage)',
          amount: selectedRecord.hourlyWage,
          note: `${selectedRecord.totalWorkHours} giờ làm việc @ ${(selectedRecord.hourlyRate || 25000).toLocaleString('vi-VN')}đ/h`,
        },
        {
          key: 2,
          item: 'Thưởng CC Xoay (Lượt Khách Check-in)',
          amount: selectedRecord.ccXoayBonus,
          note: `Bóc tách ${selectedRecord.checkinCount} lượt check-in`,
        },
        {
          key: 3,
          item: 'Thưởng Bán Combo & Sản Phẩm',
          amount: selectedRecord.comboProductBonus,
          note: `${selectedRecord.comboCount} combo + ${selectedRecord.productCount} sản phẩm`,
        },
        {
          key: 4,
          item: 'Thưởng CC Tip (20% Tip Share)',
          amount: selectedRecord.ccTipBonus || 0,
          note: `Thực nhận 20% tip từ ${selectedRecord.tippedVisitsCount || 0} lượt khách cho`,
        },
        {
          key: 5,
          item: 'Thưởng CT Kim Cương (Giới thiệu KH)',
          amount: selectedRecord.diamondBonus || 0,
          note: `Giới thiệu ${selectedRecord.diamondCount || 0} khách hàng mới`,
        },
        { key: 6, item: 'Thưởng Kỹ Thuật & Gamification Points', amount: 0, note: 'Điểm kỹ thuật quy đổi' },
        { key: 7, item: 'Thưởng Nóng Minigame', amount: selectedRecord.minigameBonus, note: 'Vượt mốc minigame tuần' },
      ]
    : [];

  return (
    <div>
      {/* SUMMARY STAT CARDS AT TOP */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={8} lg={4}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <Statistic
              title="Tổng Lương Giờ"
              value={summary.totalHourlyWage}
              suffix="đ"
              precision={0}
              valueStyle={{ fontSize: '15px', color: '#1890ff', fontVariantNumeric: 'tabular-nums' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <Statistic
              title="Tổng Thưởng CC Xoay"
              value={summary.totalCcXoayBonus}
              suffix="đ"
              precision={0}
              valueStyle={{ fontSize: '15px', color: '#722ed1', fontVariantNumeric: 'tabular-nums' }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <Statistic
              title="Tổng Thưởng Combo & SP"
              value={summary.totalComboProductBonus}
              suffix="đ"
              precision={0}
              valueStyle={{ fontSize: '15px', color: '#52c41a', fontVariantNumeric: 'tabular-nums' }}
              prefix={<GiftOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <Statistic
              title="Tổng Thưởng CC Tip (20%)"
              value={summary.totalCcTipBonus}
              suffix="đ"
              precision={0}
              valueStyle={{ fontSize: '15px', color: '#d4a84b', fontVariantNumeric: 'tabular-nums' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <Statistic
              title="Tổng Thưởng Minigame"
              value={summary.totalMinigameBonus}
              suffix="đ"
              precision={0}
              valueStyle={{ fontSize: '15px', color: '#faad14', fontVariantNumeric: 'tabular-nums' }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small" variant="outlined" style={{ background: token.colorBgContainer, borderColor: '#d4a84b' }}>
            <Statistic
              title="Tổng Thu Nhập Tất Cả CC"
              value={summary.grandTotalIncome}
              suffix="đ"
              precision={0}
              valueStyle={{
                fontSize: '15px',
                color: '#d4a84b',
                fontWeight: 'bold',
                fontVariantNumeric: 'tabular-nums',
              }}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* MAIN CC PAYSTUB TABLE CARD */}
      <Card
        title={
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <WalletOutlined className="text-amber-500 text-lg" />
              <span className="font-bold text-base" style={{ color: token.colorText }}>
                Bảng Tổng Hợp Thu Nhập Live Tất Cả CC (CC Live Paystub)
              </span>
            </div>

            <Input
              placeholder="Tìm tên CC, chi nhánh..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 220 }}
              size="small"
              allowClear
            />
          </div>
        }
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: '#d4a84b' }}
        className="shadow-sm rounded-xl mb-6"
      >
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="consultantId"
          loading={loading}
          pagination={false}
          size="middle"
          bordered
          className="antd-custom-table"
          locale={{ emptyText: 'Không tìm thấy dữ liệu thu nhập CC' }}
        />

        <Divider style={{ margin: '16px 0' }} />

        <div className="flex justify-between items-center px-4 flex-wrap gap-4">
          <div>
            <Text type="secondary" className="text-xs font-semibold">
              TỔNG THU NHẬP TẠM TÍNH (LIVE SALARY):
            </Text>
            <div className="text-xs text-gray-400">
              💡 Mẹo: Click vào cột Lương Giờ để xem Báo cáo Ca làm việc IN/OUT chi tiết theo từng ngày.
            </div>
          </div>
          <div className="tabular-nums text-2xl font-extrabold text-amber-500">
            {Math.round(summary.grandTotalIncome || 0).toLocaleString('vi-VN')} đ
          </div>
        </div>
      </Card>

      {/* INDIVIDUAL CC PAYSTUB DETAIL MODAL */}
      {selectedRecord && (
        <Modal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          width={700}
          title={
            <div className="flex items-center gap-2">
              <WalletOutlined className="text-amber-500 text-xl" />
              <span className="font-bold text-lg">Phiếu Lương Live - CC: {selectedRecord.displayName}</span>
              <Tag color={selectedRecord.store === 'PXL' ? 'blue' : 'purple'}>CN: {selectedRecord.store}</Tag>
            </div>
          }
          footer={[
            <Button
              key="close"
              type="primary"
              onClick={() => setModalOpen(false)}
              style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000' }}
            >
              Đóng Phiếu Lương
            </Button>,
          ]}
        >
          <Table
            dataSource={modalPaystubDetails}
            pagination={false}
            size="small"
            bordered
            className="antd-custom-table my-4"
            columns={[
              {
                title: 'Khoản Thu Nhập',
                dataIndex: 'item',
                key: 'item',
                render: (val: string) => <span className="font-semibold">{val}</span>,
              },
              {
                title: 'Số Tiền (đ)',
                dataIndex: 'amount',
                key: 'amount',
                align: 'right' as const,
                render: (val: number) => (
                  <span className="tabular-nums font-bold text-emerald-500">
                    +{Math.round(val || 0).toLocaleString('vi-VN')} đ
                  </span>
                ),
              },
              {
                title: 'Ghi Chú',
                dataIndex: 'note',
                key: 'note',
                render: (val: string) => (
                  <Text type="secondary" className="text-xs">
                    {val}
                  </Text>
                ),
              },
            ]}
          />

          <Divider style={{ margin: '16px 0' }} />

          <div className="flex justify-between items-center px-4 py-2 bg-amber-500/10 rounded-lg">
            <div>
              <Text type="secondary" className="text-xs font-bold uppercase text-amber-500">
                TỔNG THU NHẬP TẠM TÍNH (LIVE SALARY):
              </Text>
              <div className="text-xs text-gray-400">
                Bao gồm lương cứng ca làm, CC Bonus Xoay, thưởng Combo/SP, Points và Minigame
              </div>
            </div>
            <div className="tabular-nums text-2xl font-extrabold text-amber-500">
              {Math.round(selectedRecord.totalIncome || 0).toLocaleString('vi-VN')} đ
            </div>
          </div>
        </Modal>
      )}

      {/* HOURLY WAGE / DAILY WORK LOG IN-OUT MODAL */}
      {workLogRecord && (
        <Modal
          open={workLogModalOpen}
          onCancel={() => setWorkLogModalOpen(false)}
          width={modalWidth}
          style={{ top: 30 }}
          title={
            <div className="flex flex-wrap items-center justify-between gap-2 pr-6 select-none">
              <div className="flex items-center gap-2">
                <ClockCircleOutlined className="text-blue-500 text-xl" />
                <span className="font-bold text-lg">
                  Báo Cáo Ca Làm Việc & Lương Giờ (IN/OUT) - CC: {workLogRecord.displayName}
                </span>
                <Tag color={workLogRecord.store === 'PXL' ? 'blue' : 'purple'}>CN: {workLogRecord.store}</Tag>
              </div>

              {/* QUICK WIDTH PRESETS */}
              <div className="flex items-center gap-1">
                <Text type="secondary" className="text-xs mr-1">
                  Kích thước:
                </Text>
                <Button
                  size="small"
                  type={modalWidth === 800 ? 'primary' : 'default'}
                  onClick={() => updateModalWidth(800)}
                  className="text-xs"
                >
                  Vừa (800px)
                </Button>
                <Button
                  size="small"
                  type={modalWidth === 1100 ? 'primary' : 'default'}
                  onClick={() => updateModalWidth(1100)}
                  className="text-xs"
                >
                  Rộng (1100px)
                </Button>
                <Button
                  size="small"
                  type={modalWidth === 1400 ? 'primary' : 'default'}
                  onClick={() => updateModalWidth(1400)}
                  className="text-xs"
                >
                  Tối đa (1400px)
                </Button>
              </div>
            </div>
          }
          footer={[
            <div key="footer-row" className="flex items-center justify-between w-full">
              <Text type="secondary" className="text-xs italic">
                💡 Kéo mép phải để chỉnh rộng / hẹp ({modalWidth}px) — Tự động ghi nhớ khi F5
              </Text>
              <Button
                key="close-worklog"
                type="primary"
                onClick={() => setWorkLogModalOpen(false)}
                style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000' }}
              >
                Đóng Báo Cáo Ca Làm
              </Button>
            </div>,
          ]}
        >
          {/* DRAG RESIZE HANDLE ON RIGHT EDGE */}
          <div
            onMouseDown={handleMouseDown}
            className={`absolute top-0 right-0 bottom-0 w-3 cursor-col-resize hover:bg-blue-500/30 transition-colors z-50 flex items-center justify-center ${
              isResizing ? 'bg-blue-500/40' : ''
            }`}
            title="Kéo sang ngang để thay đổi chiều rộng Popup (Nhớ kích thước khi F5)"
          >
            <div className="w-1 h-8 bg-gray-400/50 rounded-full" />
          </div>
          {/* Top Stat summary for Work Log Modal */}
          <Row gutter={[12, 12]} className="my-4">
            <Col span={6}>
              <Card size="small" variant="outlined">
                <Statistic
                  title="Tổng Ngày Đi Làm"
                  value={workLogSummary.totalWorkDays}
                  suffix="ngày"
                  valueStyle={{ fontSize: '15px', color: '#1890ff', fontVariantNumeric: 'tabular-nums' }}
                  prefix={<CalendarOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" variant="outlined">
                <Statistic
                  title="Tổng Số Giờ Làm"
                  value={workLogSummary.totalWorkHours}
                  suffix="giờ"
                  valueStyle={{ fontSize: '15px', color: '#722ed1', fontVariantNumeric: 'tabular-nums' }}
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" variant="outlined">
                <Statistic
                  title="Đơn Giá Lương Giờ"
                  value={workLogSummary.hourlyRate}
                  suffix="đ/h"
                  valueStyle={{ fontSize: '15px', color: '#52c41a', fontVariantNumeric: 'tabular-nums' }}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" variant="outlined" style={{ borderColor: '#1890ff' }}>
                <Statistic
                  title="Tổng Lương Giờ Nhận"
                  value={workLogSummary.totalWage}
                  suffix="đ"
                  precision={0}
                  valueStyle={{
                    fontSize: '15px',
                    color: '#1890ff',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 'bold',
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Table
            dataSource={workLogs}
            rowKey="work_date"
            loading={workLogLoading}
            pagination={{ defaultPageSize: 10, showSizeChanger: true }}
            size="small"
            bordered
            className="antd-custom-table"
            columns={[
              {
                title: 'Ngày Làm Việc',
                dataIndex: 'work_date',
                key: 'work_date',
                width: 130,
                render: (val: string) => (
                  <Space size={4}>
                    <CalendarOutlined className="text-blue-500 text-xs" />
                    <span className="tabular-nums font-semibold">{val}</span>
                  </Space>
                ),
              },
              {
                title: 'Check-in Đầu (IN)',
                dataIndex: 'first_in',
                key: 'first_in',
                width: 140,
                align: 'center' as const,
                render: (val: string) => (
                  <Tag color="green" className="tabular-nums font-mono font-semibold">
                    <LoginOutlined className="mr-1" /> {val}
                  </Tag>
                ),
              },
              {
                title: 'Check-out Cuối (OUT)',
                dataIndex: 'last_out',
                key: 'last_out',
                width: 140,
                align: 'center' as const,
                render: (val: string) => (
                  <Tag color="volcano" className="tabular-nums font-mono font-semibold">
                    <LogoutOutlined className="mr-1" /> {val}
                  </Tag>
                ),
              },
              {
                title: 'Số Lượt Phục Vụ',
                dataIndex: 'service_count',
                key: 'service_count',
                align: 'right' as const,
                width: 130,
                render: (val: number) => (
                  <span className="tabular-nums font-semibold text-gray-700 dark:text-gray-300">{val} lượt</span>
                ),
              },
              {
                title: 'Số Giờ Tính Lương',
                dataIndex: 'total_hours',
                key: 'total_hours',
                align: 'right' as const,
                width: 130,
                render: (val: number) => <span className="tabular-nums font-bold text-blue-500">{val} giờ</span>,
              },
              {
                title: 'Lương Giờ Trong Ngày',
                dataIndex: 'daily_wage',
                key: 'daily_wage',
                align: 'right' as const,
                width: 150,
                render: (val: number) => (
                  <span className="tabular-nums font-bold text-emerald-500">
                    +{Math.round(val || 0).toLocaleString('vi-VN')} đ
                  </span>
                ),
              },
            ]}
          />
        </Modal>
      )}
    </div>
  );
}

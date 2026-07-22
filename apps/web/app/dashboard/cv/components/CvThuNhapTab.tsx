'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  theme,
  Table,
  Tag,
  Button,
  Modal,
  Input,
  Space,
  Statistic,
  Spin,
  Popover,
  InputNumber,
  message,
  Tooltip,
} from 'antd';
import {
  WalletOutlined,
  DollarOutlined,
  SearchOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  GiftOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  SaveOutlined,
  DeleteOutlined,
  PlusOutlined,
  CalendarOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { CvPaystubRecord, CvWorkLogDetailRecord } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import dayjs from 'dayjs';
import CcAvatar from '../../cc/components/CcAvatar';

const { Text } = Typography;

const formatHoursToHoursMinutes = (totalHours: number) => {
  if (!totalHours || totalHours <= 0) return '0 giờ';
  const hrs = Math.floor(totalHours);
  const mins = Math.round((totalHours - hrs) * 60);
  if (mins <= 0) return `${hrs} giờ`;
  return `${hrs} giờ ${mins} phút`;
};

interface CvThuNhapTabProps {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  currentUser?: Record<string, unknown> | null;
}

export default function CvThuNhapTab({ dateRange, selectedStore, currentUser }: CvThuNhapTabProps) {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [paystubData, setPaystubData] = useState<CvPaystubRecord[]>([]);
  const [summary, setSummary] = useState({
    totalHourlyWage: 0,
    totalCvXoayBonus: 0,
    totalCvTipBonus: 0,
    totalSeniorityBonus: 0,
    grandTotalIncome: 0,
  });

  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState<number>(20);

  // Seniority config state
  const [seniorityRules, setSeniorityRules] = useState<{ minMonths: number; bonusPercent: number }[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  // Resizable Popover settings & persistence
  const [popoverWidth, setPopoverWidth] = useState<number>(420);
  const observerRef = React.useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('cv_seniority_popover_width');
      if (savedWidth) {
        setPopoverWidth(parseInt(savedWidth, 10));
      }
    }
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const popoverRefCallback = React.useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width > 350) {
            setPopoverWidth(width);
            localStorage.setItem('cv_seniority_popover_width', Math.round(width).toString());
          }
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  // Persistent Work Log Modal Width state (Default: 800px)
  const [modalWidth, setModalWidth] = useState<number>(800);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = React.useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 800 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('cv_worklog_modal_width');
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
      localStorage.setItem('cv_worklog_modal_width', clamped.toString());
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
          localStorage.setItem('cv_worklog_modal_width', finalWidth.toString());
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [modalWidth]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cv_paystub_page_size');
      if (saved) {
        setPageSize(parseInt(saved, 10));
      }
    }
  }, []);

  // Individual Paystub Detail Modal State
  const [selectedRecord, setSelectedRecord] = useState<CvPaystubRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Daily Work Log Detail Modal State
  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);
  const [workLogLoading, setWorkLogLoading] = useState(false);
  const [workLogRecord, setWorkLogRecord] = useState<CvPaystubRecord | null>(null);
  const [workLogs, setWorkLogs] = useState<CvWorkLogDetailRecord[]>([]);
  const [workLogSummary, setWorkLogSummary] = useState({
    totalWorkDays: 0,
    totalWorkHours: 0,
    hourlyRate: 21500,
    totalWage: 0,
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

      const res = await apiClient.kpi.getCvPaystub({
        dateFrom,
        dateTo,
        storeId: selectedStore,
      });

      if (res) {
        setPaystubData(res.data || []);
        setSummary({
          totalHourlyWage: res.summary?.totalHourlyWage || 0,
          totalCvXoayBonus: res.summary?.totalCvXoayBonus || 0,
          totalCvTipBonus: res.summary?.totalCvTipBonus || 0,
          totalSeniorityBonus: res.summary?.totalSeniorityBonus || 0,
          grandTotalIncome: res.summary?.grandTotalIncome || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching CV Paystub data:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedStore]);

  const fetchSeniorityConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await apiClient.kpi.getCvSeniorityConfig();
      if (res) {
        setSeniorityRules([...res].sort((a, b) => a.minMonths - b.minMonths));
      }
    } catch (err) {
      console.error('Error fetching seniority config:', err);
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchSeniorityConfig();
  }, []);

  const handleSaveSeniorityConfig = async () => {
    setConfigSaving(true);
    try {
      const invalid = seniorityRules.some((r) => r.minMonths <= 0 || r.bonusPercent < 0);
      if (invalid) {
        message.error('Vui lòng nhập các mốc thời gian và tỷ lệ hợp lệ (thời gian > 0, tỷ lệ >= 0)!');
        return;
      }
      const res = await apiClient.kpi.updateCvSeniorityConfig(seniorityRules);
      if (res && res.success) {
        message.success('Đã lưu cấu hình thưởng thâm niên thành công!');
        fetchData();
      }
    } catch (err) {
      message.error('Không thể lưu cấu hình thưởng thâm niên.');
    } finally {
      setConfigSaving(false);
    }
  };

  const renderPopoverContent = () => {
    return (
      <div
        ref={popoverRefCallback}
        style={{
          width: `${popoverWidth}px`,
          minWidth: '380px',
          maxWidth: '650px',
          resize: 'horizontal',
          overflow: 'auto',
          paddingBottom: '8px',
        }}
        className="p-1 space-y-3"
      >
        <div className="border-b pb-2 mb-2">
          <Typography.Title level={5} style={{ margin: 0, fontSize: '14px' }}>
            Cấu hình tỷ lệ Thưởng Thâm Niên
          </Typography.Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Cộng thêm % tiền thưởng vào Thưởng Ca CV (Xoay)
          </Text>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {configLoading ? (
            <div className="flex justify-center p-4">
              <Spin size="small" />
            </div>
          ) : seniorityRules.length === 0 ? (
            <div className="text-center py-2 text-slate-400 text-xs">Chưa có mốc cấu hình nào.</div>
          ) : (
            seniorityRules.map((rule, idx) => (
              <Row
                key={idx}
                align="middle"
                justify="space-between"
                className="py-1 border-b border-dashed border-slate-100 dark:border-slate-800 last:border-b-0 pb-2"
              >
                <Col>
                  <Space size={4}>
                    <Text className="text-xs">Từ</Text>
                    <InputNumber
                      min={1}
                      max={120}
                      size="small"
                      value={rule.minMonths}
                      disabled={currentUser?.role !== 'admin'}
                      onChange={(val) => {
                        const updated = [...seniorityRules];
                        updated[idx].minMonths = val || 0;
                        setSeniorityRules(updated);
                      }}
                      style={{ width: 65 }}
                    />
                    <Text className="text-xs">tháng trở lên: Thưởng thêm</Text>
                    <InputNumber
                      min={0}
                      max={100}
                      size="small"
                      value={rule.bonusPercent}
                      disabled={currentUser?.role !== 'admin'}
                      onChange={(val) => {
                        const updated = [...seniorityRules];
                        updated[idx].bonusPercent = val || 0;
                        setSeniorityRules(updated);
                      }}
                      style={{ width: 60 }}
                    />
                    <Text className="text-xs">%</Text>
                  </Space>
                </Col>
                <Col>
                  {currentUser?.role === 'admin' && (
                    <Button
                      danger
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        setSeniorityRules((prev) => prev.filter((_, i) => i !== idx));
                      }}
                    />
                  )}
                </Col>
              </Row>
            ))
          )}
        </div>

        {currentUser?.role === 'admin' && (
          <div className="flex justify-between items-center pt-2 border-t mt-2">
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setSeniorityRules((prev) => [...prev, { minMonths: 6, bonusPercent: 5 }]);
              }}
            >
              Thêm
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              loading={configSaving}
              onClick={handleSaveSeniorityConfig}
              style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000', fontWeight: '600' }}
            >
              Lưu
            </Button>
          </div>
        )}
      </div>
    );
  };

  const filteredData = React.useMemo(() => {
    if (!searchText) return paystubData;
    const lower = searchText.toLowerCase();
    return paystubData.filter(
      (item) => item.staffName.toLowerCase().includes(lower) || item.store.toLowerCase().includes(lower)
    );
  }, [paystubData, searchText]);

  const handleOpenWorkLogs = async (record: CvPaystubRecord) => {
    setWorkLogRecord(record);
    setWorkLogModalOpen(true);
    setWorkLogLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

      const res = await apiClient.kpi.getCvWorkLogs({
        staffId: record.staffId,
        dateFrom,
        dateTo,
      });

      if (res) {
        setWorkLogs(res.data || []);
        setWorkLogSummary(
          res.summary || { totalWorkDays: 0, totalWorkHours: 0, hourlyRate: record.hourlyRate, totalWage: 0 }
        );
      }
    } catch (err) {
      console.error('Error fetching work logs:', err);
    } finally {
      setWorkLogLoading(false);
    }
  };

  const columns = [
    {
      title: 'CV',
      dataIndex: 'staffName',
      key: 'staffName',
      width: 220,
      render: (text: string, record: CvPaystubRecord, index: number) => {
        const initial = text ? text.trim().charAt(0).toUpperCase() : '?';
        const rank = index + 1;
        let rankBadge = null;
        if (rank === 1) {
          rankBadge = <span className="text-base shrink-0 w-6 text-center">🥇</span>;
        } else if (rank === 2) {
          rankBadge = <span className="text-base shrink-0 w-6 text-center">🥈</span>;
        } else if (rank === 3) {
          rankBadge = <span className="text-base shrink-0 w-6 text-center">🥉</span>;
        } else {
          rankBadge = (
            <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 w-6 text-center shrink-0">
              #{rank}
            </span>
          );
        }

        return (
          <div className="flex items-center gap-2">
            {rankBadge}
            <CcAvatar name={text} src={record.avatar} size={32} />
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-snug" style={{ color: token.colorText }}>
                {text}
              </span>
              <span className="inline-block mt-0.5">
                <Tag
                  color="blue"
                  className="m-0 text-[10px] font-bold px-1.5 py-0 rounded border-blue-300 dark:border-blue-800"
                >
                  Level {record.techLevel || 1}
                </Tag>
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Store',
      dataIndex: 'store',
      key: 'store',
      width: 90,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Công & Giờ Làm',
      key: 'workTime',
      width: 155,
      align: 'right' as const,
      render: (_: unknown, record: CvPaystubRecord) => {
        const val = record.totalWorkHours || 0;
        const days = record.activeDays || 0;
        const offDays = record.offDaysWorked || 0;
        const regularDays = Math.max(0, days - offDays);

        const hasOffWork = offDays > 0;

        const tagClass = hasOffWork
          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60'
          : days > 0
            ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30'
            : 'bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-600 border border-slate-200/40 dark:border-slate-800/40';

        const daysContent = hasOffWork ? (
          <Tooltip title={`Có ${offDays} ngày đi làm vào ngày nghỉ tuần (Được tính x2 lương giờ)`}>
            <span className="cursor-help">
              {regularDays}
              <span className="text-orange-600 dark:text-orange-400 font-extrabold ml-0.5">+{offDays}</span>
              <span> ngày</span>
            </span>
          </Tooltip>
        ) : (
          <span>{days} ngày</span>
        );

        return (
          <div className="flex flex-col items-end w-full text-right">
            <Button
              type="link"
              size="small"
              onClick={() => handleOpenWorkLogs(record)}
              className="p-0 font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:underline flex justify-end items-center w-full h-auto"
            >
              <ClockCircleOutlined className="text-blue-400 dark:text-blue-500 text-[11px] mr-1" />
              <span className="tabular-nums">{formatHoursToHoursMinutes(val)}</span>
            </Button>
            <span
              className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded mt-1 tabular-nums ${tagClass}`}
            >
              {daysContent}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Lương Giờ',
      dataIndex: 'hourlyWage',
      key: 'hourlyWage',
      width: 130,
      align: 'right' as const,
      render: (val: number) => <span className="tabular-nums font-semibold">{val.toLocaleString('vi-VN')}đ</span>,
    },
    {
      title: 'CV Xoay',
      dataIndex: 'cvXoayBonus',
      key: 'cvXoayBonus',
      width: 150,
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">
          +{val.toLocaleString('vi-VN')}đ
        </span>
      ),
    },
    {
      title: 'Thưởng Thâm Niên',
      key: 'seniorityBonus',
      width: 170,
      align: 'right' as const,
      render: (_: unknown, record: CvPaystubRecord) => {
        const months = record.seniorityMonths || 0;
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        const seniorityStr = years > 0 ? `${years} năm ${remainingMonths} th` : `${months} tháng`;
        const bonus = record.seniorityBonus || 0;
        const percent = record.seniorityBonusPercent || 0;

        let colorClass = 'text-slate-400 dark:text-slate-600';
        let subColorClass = 'text-slate-400/70 dark:text-slate-600/70';

        if (percent > 0) {
          if (percent <= 5) {
            colorClass = 'text-blue-500 dark:text-blue-400';
            subColorClass = 'text-blue-400/70 dark:text-blue-500/70';
          } else if (percent <= 10) {
            colorClass = 'text-teal-500 dark:text-teal-400';
            subColorClass = 'text-teal-400/70 dark:text-teal-500/70';
          } else if (percent <= 15) {
            colorClass = 'text-emerald-500 dark:text-emerald-400';
            subColorClass = 'text-emerald-400/70 dark:text-emerald-500/70';
          } else if (percent <= 20) {
            colorClass = 'text-orange-500 dark:text-orange-400';
            subColorClass = 'text-orange-400/70 dark:text-orange-500/70';
          } else {
            colorClass = 'text-purple-500 dark:text-purple-400';
            subColorClass = 'text-purple-400/70 dark:text-purple-500/70';
          }
        }

        return (
          <div>
            <span className={`tabular-nums font-bold block ${colorClass}`}>+{bonus.toLocaleString('vi-VN')}đ</span>
            <span className={`block text-[11px] font-medium tabular-nums ${subColorClass}`}>
              {seniorityStr} ({percent > 0 ? `+${percent}%` : '0%'})
            </span>
          </div>
        );
      },
    },
    {
      title: 'CV Tip',
      dataIndex: 'cvTipBonus',
      key: 'cvTipBonus',
      width: 150,
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-purple-600 dark:text-purple-400">
          +{val.toLocaleString('vi-VN')}đ
        </span>
      ),
    },
    {
      title: 'Tổng Thu Nhập',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      width: 170,
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-base">
          {val.toLocaleString('vi-VN')}đ
        </span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 110,
      align: 'center' as const,
      render: (_: unknown, record: CvPaystubRecord) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedRecord(record);
            setModalOpen(true);
          }}
        >
          Phiếu Lương
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={4} md={4} lg={4} xl={4}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="Tổng Lương Giờ"
              value={summary.totalHourlyWage}
              suffix="đ"
              valueStyle={{ color: '#1890ff', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={5} md={5} lg={5} xl={5}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="Tổng Thưởng Ca CV"
              value={summary.totalCvXoayBonus}
              suffix="đ"
              valueStyle={{ color: '#3f8600', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={5} md={5} lg={5} xl={5}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="Thưởng Thâm Niên"
              value={summary.totalSeniorityBonus || 0}
              suffix="đ"
              valueStyle={{ color: '#fa8c16', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={5} md={5} lg={5} xl={5}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="Thưởng CV Tip"
              value={summary.totalCvTipBonus}
              suffix="đ"
              valueStyle={{ color: '#722ed1', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<GiftOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={5} md={5} lg={5} xl={5}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: '#52c41a' }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="Tổng Thu Nhập"
              value={summary.grandTotalIncome}
              suffix="đ"
              valueStyle={{ color: '#52c41a', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Paystub Table */}
      <Card
        className="full-bleed-card shadow-sm rounded-xl"
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        title={
          <div className="flex flex-wrap justify-between items-center gap-2 py-1">
            <div className="flex items-center gap-2">
              <DollarOutlined className="text-emerald-500 text-lg" />
              <span className="font-bold text-base" style={{ color: token.colorText }}>
                Bảng Bóc Tách CV Thu Nhập
              </span>

              <Popover content={renderPopoverContent()} trigger="click" placement="bottomLeft">
                <Button
                  type="text"
                  shape="circle"
                  icon={<SettingOutlined className="text-slate-400 hover:text-orange-500 transition-colors" />}
                  title="Cấu hình tỷ lệ thưởng thâm niên"
                />
              </Popover>
            </div>

            <Space wrap>
              <Input
                placeholder="Tìm tên Chuyên viên..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ width: 250 }}
              />
              <Button icon={<ClockCircleOutlined />} onClick={fetchData} loading={loading}>
                Tải lại
              </Button>
            </Space>
          </div>
        }
      >
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="staffId"
          loading={loading}
          pagination={{
            pageSize: pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, size) => {
              setPageSize(size);
              localStorage.setItem('cv_paystub_page_size', size.toString());
            },
          }}
          scroll={{ x: 1000 }}
          size="small"
          className="antd-custom-table"
        />
      </Card>

      {/* Paystub Detail Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <WalletOutlined className="text-emerald-500" />
            <span>Phiếu Lương Live Chi Tiết - {selectedRecord?.staffName}</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedRecord && (
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg flex justify-between items-center">
              <div>
                <Typography.Text type="secondary" className="text-xs">
                  Nhân sự:
                </Typography.Text>
                <div className="font-bold text-base">
                  {selectedRecord.staffName} (ID: {selectedRecord.staffId})
                </div>
              </div>
              <Tag color="blue">{selectedRecord.store}</Tag>
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              {selectedRecord.offDaysWorked && selectedRecord.offDaysWorked > 0 ? (
                <>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      1. Lương Giờ Ngày Thường ({formatHoursToHoursMinutes(selectedRecord.regularHours || 0)} x{' '}
                      {selectedRecord.hourlyRate.toLocaleString('vi-VN')}đ/h):
                    </span>
                    <span className="tabular-nums font-semibold">
                      {(selectedRecord.regularHourlyWage || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b bg-amber-500/10 px-2 rounded">
                    <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                      2. Lương Đi Làm Ngày Nghỉ Tuần (x2) (
                      {formatHoursToHoursMinutes(selectedRecord.offDaysWorkHours || 0)} x{' '}
                      {selectedRecord.hourlyRate.toLocaleString('vi-VN')}đ/h x 2):
                    </span>
                    <span className="tabular-nums font-bold text-amber-600 dark:text-amber-400">
                      +{(selectedRecord.offDaysWorkWage || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-sm text-slate-600 dark:text-slate-400">3. Thưởng Ca CV (Xoay):</span>
                    <span className="tabular-nums font-semibold text-blue-500">
                      +{selectedRecord.cvXoayBonus.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      4. Thưởng Thâm Niên (
                      {(() => {
                        const months = selectedRecord.seniorityMonths || 0;
                        const years = Math.floor(months / 12);
                        const remainingMonths = months % 12;
                        return years > 0 ? `${years} năm ${remainingMonths} th` : `${months} tháng`;
                      })()}{' '}
                      - +{selectedRecord.seniorityBonusPercent || 0}%):
                    </span>
                    <span className="tabular-nums font-semibold text-orange-500">
                      +{(selectedRecord.seniorityBonus || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-sm text-slate-600 dark:text-slate-400">5. Thưởng CV Tip:</span>
                    <span className="tabular-nums font-semibold text-purple-500">
                      +{selectedRecord.cvTipBonus.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      1. Lương Giờ ({formatHoursToHoursMinutes(selectedRecord.totalWorkHours)} x{' '}
                      {selectedRecord.hourlyRate.toLocaleString('vi-VN')}đ/h):
                    </span>
                    <span className="tabular-nums font-semibold">
                      {selectedRecord.hourlyWage.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-sm text-slate-600 dark:text-slate-400">2. Thưởng Ca CV (Xoay):</span>
                    <span className="tabular-nums font-semibold text-blue-500">
                      +{selectedRecord.cvXoayBonus.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      3. Thưởng Thâm Niên (
                      {(() => {
                        const months = selectedRecord.seniorityMonths || 0;
                        const years = Math.floor(months / 12);
                        const remainingMonths = months % 12;
                        return years > 0 ? `${years} năm ${remainingMonths} th` : `${months} tháng`;
                      })()}{' '}
                      - +{selectedRecord.seniorityBonusPercent || 0}%):
                    </span>
                    <span className="tabular-nums font-semibold text-orange-500">
                      +{(selectedRecord.seniorityBonus || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b">
                    <span className="text-sm text-slate-600 dark:text-slate-400">4. Thưởng CV Tip:</span>
                    <span className="tabular-nums font-semibold text-purple-500">
                      +{selectedRecord.cvTipBonus.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center pt-2 font-bold text-base">
                <span>TỔNG THU NHẬP TẠM TÍNH:</span>
                <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                  {selectedRecord.totalIncome.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Work Logs Detail Modal */}
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
                  Báo Cáo Ca Làm Việc & Lương Giờ (IN/OUT) - CV: {workLogRecord.staffName}
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

          {workLogLoading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : (
            <div className="space-y-3 pt-2">
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
                      value={formatHoursToHoursMinutes(workLogSummary.totalWorkHours)}
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
                rowKey={(r) => `${r.date}-${r.checkInTime}`}
                bordered
                pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                size="small"
                className="antd-custom-table"
                columns={[
                  {
                    title: 'Ngày Làm Việc',
                    dataIndex: 'date',
                    key: 'date',
                    width: 130,
                    render: (val: string) => (
                      <Space size={4}>
                        <CalendarOutlined className="text-blue-500 text-xs" />
                        <span className="tabular-nums font-semibold">{val}</span>
                      </Space>
                    ),
                  },
                  {
                    title: 'Cơ Sở',
                    dataIndex: 'store',
                    key: 'store',
                    width: 100,
                    render: (text: string) => <Tag color="blue">{text}</Tag>,
                  },
                  {
                    title: 'Check-in Đầu (IN)',
                    dataIndex: 'checkInTime',
                    key: 'checkInTime',
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
                    dataIndex: 'checkOutTime',
                    key: 'checkOutTime',
                    width: 140,
                    align: 'center' as const,
                    render: (val: string) => (
                      <Tag color="volcano" className="tabular-nums font-mono font-semibold">
                        <LogoutOutlined className="mr-1" /> {val}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Số Giờ Tính Lương',
                    dataIndex: 'workHours',
                    key: 'workHours',
                    align: 'right' as const,
                    width: 130,
                    render: (val: number) => (
                      <span className="tabular-nums font-bold text-blue-500">{formatHoursToHoursMinutes(val)}</span>
                    ),
                  },
                  {
                    title: 'Lương Giờ Trong Ngày',
                    dataIndex: 'dailyWage',
                    key: 'dailyWage',
                    align: 'right' as const,
                    width: 170,
                    render: (val: number, record: CvWorkLogDetailRecord) => (
                      <div className="flex flex-col items-end">
                        <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                          +{Math.round(val || 0).toLocaleString('vi-VN')}đ
                        </span>
                        {record.notes && (
                          <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 dark:bg-orange-950/30 px-1 rounded border border-orange-100 dark:border-orange-900/30 mt-0.5 inline-block">
                            {record.notes}
                          </span>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

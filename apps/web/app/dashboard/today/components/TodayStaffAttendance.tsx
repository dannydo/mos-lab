'use client';

import { TableIndexHeader } from '~/components/ui';

import React from 'react';
import { Row, Col, Table, Space, Tag, Badge, Typography, Button } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { ShopCCData, ShopCVData } from '../hooks/useTodayData';
import { SectionCard, StatusTag } from '../../../../components/ui';
import { useTodaySandbox } from '../context/SandboxModeContext';

const { Text } = Typography;

interface TodayStaffAttendanceProps {
  themeMode?: 'light' | 'dark';
  token: SafeAny;
  ccList: ShopCCData[];
  cvList: ShopCVData[];
}

const TodayStaffAttendance = React.memo(
  function TodayStaffAttendance({ themeMode = 'light', token, ccList, cvList }: TodayStaffAttendanceProps) {
    const sandbox = useTodaySandbox();
    const tableRegionRef = React.useRef<HTMLDivElement>(null);
    const goldText = token?.colorPrimary || (themeMode === 'dark' ? '#D4A84B' : '#855b0e');
    const infoText = themeMode === 'dark' ? '#60a5fa' : '#1d4ed8';
    const mutedText = themeMode === 'dark' ? '#cbd5e1' : '#475569';

    React.useEffect(() => {
      const region = tableRegionRef.current;
      if (!region) return undefined;
      const labelScrollableTables = () => {
        const tables = [...region.querySelectorAll<HTMLElement>('.ant-table-content')].filter(
          (table) => table.scrollWidth > table.clientWidth
        );
        tables.forEach((table, index) => {
          table.tabIndex = 0;
          table.setAttribute('role', 'region');
          table.setAttribute(
            'aria-label',
            index === 0 ? 'Bảng chuyên viên, có thể cuộn ngang' : 'Bảng tư vấn viên, có thể cuộn ngang'
          );
        });
      };
      labelScrollableTables();
      const observer = new MutationObserver(labelScrollableTables);
      observer.observe(region, { childList: true, subtree: true });
      return () => observer.disconnect();
    }, []);
    const renderShiftAndAttendance = (
      shift: 'sáng' | 'chiều' | 'full' | 'off',
      attendance: 'none' | 'checked_in' | 'checked_out' | 'late'
    ) => {
      if (shift === 'off') {
        return (
          <span style={{ cursor: 'help' }}>
            <Space size={6}>
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#bfbfbf',
                  verticalAlign: 'middle',
                }}
              />
              <span style={{ fontSize: '12px', color: mutedText, fontWeight: 500 }}>Off</span>
            </Space>
          </span>
        );
      }

      let shiftText = '';
      if (shift === 'sáng') shiftText = 'Sáng';
      else if (shift === 'chiều') shiftText = 'Chiều';
      else if (shift === 'full') shiftText = 'Full';

      let attText = '';
      let dotColor = '#bfbfbf';
      if (attendance === 'checked_in') {
        attText = 'Đã check-in';
        dotColor = '#52c41a'; // Green
      } else if (attendance === 'checked_out') {
        attText = 'Đã check-out';
        dotColor = '#8c8c8c'; // Gray
      } else if (attendance === 'late') {
        attText = 'Đi trễ';
        dotColor = '#ff4d4f'; // Red
      } else {
        attText = 'Chưa check-in';
        dotColor = '#faad14'; // Orange/Amber
      }

      return (
        <span style={{ cursor: 'help' }} title={attText}>
          <Space size={6}>
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: dotColor,
                verticalAlign: 'middle',
              }}
            />
            <span style={{ fontSize: '12px', color: mutedText, fontWeight: 500 }}>{shiftText}</span>
          </Space>
        </span>
      );
    };

    const cvColumns = React.useMemo(
      () => [
        {
          title: <TableIndexHeader />,
          key: 'stt',
          width: 50,
          align: 'center' as const,
          render: (_: SafeAny, __: ShopCVData, idx: number) => (
            <span className="tabular-nums font-mono text-xs font-semibold" style={{ color: mutedText }}>
              #{idx + 1}
            </span>
          ),
        },
        {
          title: 'Ca',
          key: 'shift_attendance',
          render: (_: SafeAny, rec: ShopCVData) => renderShiftAndAttendance(rec.shift, rec.attendance),
        },
        {
          title: 'Tên CV',
          dataIndex: 'name',
          key: 'name',
          render: (t: string) => <strong>{t}</strong>,
        },
        {
          title: 'Chi nhánh',
          dataIndex: 'branchName',
          key: 'branchName',
          render: (b: string) => <StatusTag status="cyan" label={b || 'Đề Thám'} />,
        },
        {
          title: 'Đang làm gì?',
          dataIndex: 'doing',
          key: 'doing',
          render: (doing: string, rec: ShopCVData) => {
            if (rec.isOff || rec.shift === 'off') {
              const text = doing || rec.offReason || 'Nghỉ phép';
              const tagColor = text.includes('OFF Gấp') ? 'error' : text.includes('OFF Tuần') ? 'default' : 'volcano';
              return (
                <Tag color={tagColor} style={{ fontWeight: 500 }}>
                  {text}
                </Tag>
              );
            }
            if (rec.attendance === 'checked_out') {
              return <Tag color="default">{doing || 'Đã về'}</Tag>;
            }
            return <Badge status={rec.status === 'busy' ? 'warning' : 'success'} text={doing} />;
          },
        },
        {
          title: 'Khách hôm nay',
          dataIndex: 'clients',
          key: 'clients',
          align: 'center' as const,
          render: (_: number, rec: ShopCVData) => {
            const booked = rec.bookedCount ?? rec.clients ?? 0;
            const done = rec.doneCount ?? 0;
            if (rec.isOff || rec.shift === 'off') {
              return (
                <span className="text-xs font-mono" style={{ color: mutedText }}>
                  -
                </span>
              );
            }
            return (
              <span className="tabular-nums font-mono text-xs inline-flex items-center gap-1">
                <Tag color="success" style={{ margin: 0, padding: '0 4px', fontSize: '11px' }}>
                  {done} Done
                </Tag>
                <Tag color="processing" style={{ margin: 0, padding: '0 4px', fontSize: '11px' }}>
                  {booked} Book
                </Tag>
              </span>
            );
          },
        },
        ...(sandbox.mode === 'training'
          ? [
              {
                title: 'Thao tác Giả lập (Training)',
                key: 'sandbox_actions',
                render: (_: SafeAny, rec: ShopCVData) => {
                  const ov = sandbox.staffOverrides[rec.name] || {};
                  const isTimerRunning = Boolean(ov.timerStartedAt);
                  if (rec.attendance === 'none') {
                    return (
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        icon={<CheckCircleOutlined />}
                        onClick={() => sandbox.simulateStaffCheckIn(rec.name, 'CV')}
                        aria-label={`Giả lập check-in cho ${rec.name}`}
                      >
                        Check-in
                      </Button>
                    );
                  }
                  if (rec.attendance === 'checked_in') {
                    if (rec.status === 'busy' || isTimerRunning) {
                      return (
                        <Space size={6}>
                          <Tag color="processing" icon={<ClockCircleOutlined />} className="tabular-nums">
                            {sandbox.formatStaffTimerMMSS(rec.name)}
                          </Tag>
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => sandbox.simulateStaffStopTimer(rec.name)}
                            aria-label={`Hoàn tất phục vụ cho ${rec.name}`}
                          >
                            Xong mi (Check-out)
                          </Button>
                        </Space>
                      );
                    }
                    return (
                      <Space size={6}>
                        <Button
                          size="small"
                          className="border-amber-500 text-amber-600 dark:text-amber-400 hover:text-amber-700"
                          icon={<ClockCircleOutlined />}
                          onClick={() => sandbox.simulateStaffStartTimer(rec.name, 'Nối Mi Classic Thiết Kế (60p)', 60)}
                          aria-label={`Bấm giờ phục vụ cho ${rec.name}`}
                        >
                          Bấm giờ
                        </Button>
                        <Button
                          size="small"
                          danger
                          ghost
                          onClick={() => sandbox.simulateStaffCheckOut(rec.name, 'CV')}
                          aria-label={`Check-out ca cho ${rec.name}`}
                        >
                          Check-out ca
                        </Button>
                      </Space>
                    );
                  }
                  return (
                    <Space size={6}>
                      <Tag color="default">Đã về</Tag>
                      <Button
                        size="small"
                        type="link"
                        onClick={() => sandbox.simulateStaffCheckIn(rec.name, 'CV')}
                        aria-label={`Check-in lại cho ${rec.name}`}
                      >
                        Vào ca lại
                      </Button>
                    </Space>
                  );
                },
              },
            ]
          : []),
      ],
      [
        mutedText,
        sandbox.mode,
        sandbox.staffOverrides,
        sandbox.simulateStaffCheckIn,
        sandbox.simulateStaffCheckOut,
        sandbox.simulateStaffStartTimer,
        sandbox.simulateStaffStopTimer,
      ]
    );

    const ccColumns = React.useMemo(
      () => [
        {
          title: <TableIndexHeader />,
          key: 'stt',
          width: 50,
          align: 'center' as const,
          render: (_: SafeAny, __: ShopCCData, idx: number) => (
            <span className="tabular-nums font-mono text-xs font-semibold" style={{ color: mutedText }}>
              #{idx + 1}
            </span>
          ),
        },
        {
          title: 'Ca',
          key: 'shift_attendance',
          render: (_: SafeAny, rec: ShopCCData) => renderShiftAndAttendance(rec.shift, rec.attendance),
        },
        {
          title: 'Tên CC',
          dataIndex: 'name',
          key: 'name',
          render: (t: string) => <strong>{t}</strong>,
        },
        {
          title: 'Chi nhánh',
          dataIndex: 'branchName',
          key: 'branchName',
          render: (b: string) => (
            <Tag color="cyan" style={{ fontWeight: 'bold' }}>
              {b}
            </Tag>
          ),
        },
        {
          title: 'Đang làm gì?',
          dataIndex: 'doing',
          key: 'doing',
          render: (doing: string) => <Text type="secondary">{doing}</Text>,
        },
        {
          title: 'Khách hôm nay',
          dataIndex: 'clients',
          key: 'clients',
          align: 'center' as const,
          render: (n: number) => <strong className="tabular-nums font-mono">{n} khách</strong>,
        },
        {
          title: 'Combo bán được',
          dataIndex: 'combos',
          key: 'combos',
          align: 'center' as const,
          render: (n: number) => (
            <Tag color="success" className="tabular-nums font-mono">
              {n} Combo
            </Tag>
          ),
        },
        {
          title: '$ Combo',
          dataIndex: 'revCombo',
          key: 'revCombo',
          align: 'right' as const,
          render: (r: number) => (
            <span className="tabular-nums font-mono" style={{ color: goldText }}>
              {(r || 0).toLocaleString('vi-VN')} đ
            </span>
          ),
        },
        {
          title: '$ Single',
          dataIndex: 'revLe',
          key: 'revLe',
          align: 'right' as const,
          render: (r: number) => (
            <span className="tabular-nums font-mono" style={{ color: token.colorTextDescription }}>
              {(r || 0).toLocaleString('vi-VN')} đ
            </span>
          ),
        },
        {
          title: '$ Product',
          dataIndex: 'revProduct',
          key: 'revProduct',
          align: 'right' as const,
          render: (r: number) => (
            <span className="tabular-nums font-mono" style={{ color: '#52c41a' }}>
              {(r || 0).toLocaleString('vi-VN')} đ
            </span>
          ),
        },
        {
          title: 'Doanh số ngày',
          dataIndex: 'revenue',
          key: 'revenue',
          align: 'right' as const,
          render: (r: number) => (
            <strong className="tabular-nums font-mono" style={{ color: infoText }}>
              {(r || 0).toLocaleString('vi-VN')} đ
            </strong>
          ),
        },
        ...(sandbox.mode === 'training'
          ? [
              {
                title: 'Thao tác Giả lập (Training)',
                key: 'sandbox_actions',
                render: (_: SafeAny, rec: ShopCCData) => {
                  if (rec.attendance === 'none') {
                    return (
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        icon={<CheckCircleOutlined />}
                        onClick={() => sandbox.simulateStaffCheckIn(rec.name, 'CC')}
                        aria-label={`Giả lập check-in cho ${rec.name}`}
                      >
                        Check-in
                      </Button>
                    );
                  }
                  if (rec.attendance === 'checked_in') {
                    return (
                      <Button
                        size="small"
                        danger
                        ghost
                        onClick={() => sandbox.simulateStaffCheckOut(rec.name, 'CC')}
                        aria-label={`Check-out ca cho ${rec.name}`}
                      >
                        Check-out ca
                      </Button>
                    );
                  }
                  return (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => sandbox.simulateStaffCheckIn(rec.name, 'CC')}
                      aria-label={`Check-in lại cho ${rec.name}`}
                    >
                      Vào ca lại
                    </Button>
                  );
                },
              },
            ]
          : []),
      ],
      [
        goldText,
        infoText,
        mutedText,
        token.colorTextDescription,
        sandbox.mode,
        sandbox.simulateStaffCheckIn,
        sandbox.simulateStaffCheckOut,
      ]
    );

    return (
      <div ref={tableRegionRef}>
        {sandbox.mode === 'training' && (
          <div className="bg-emerald-50/70 dark:bg-slate-800/60 border border-emerald-200 dark:border-slate-700 rounded-md p-3 mb-4 flex justify-between items-center flex-wrap gap-2">
            <Space size={8}>
              <Tag color="processing" className="font-semibold">
                🧪 Phòng Tập Chấm Công & Bấm Giờ Phục Vụ
              </Tag>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Mục tiêu training quy trình: bấm check-in ca, bấm giờ làm mi và bấm check-out hoàn tất.
              </span>
            </Space>
            <Space size={8}>
              <Button
                size="small"
                type="primary"
                ghost
                icon={<CheckCircleOutlined />}
                onClick={() => sandbox.simulateBatchCheckInAll()}
              >
                ⚡ Check-in toàn bộ ca
              </Button>
              <Button
                size="small"
                className="border-amber-500 text-amber-600 dark:text-amber-400 hover:text-amber-700"
                icon={<ClockCircleOutlined />}
                onClick={() => sandbox.simulateBatchStartAllTimers()}
              >
                ⏱️ Bấm giờ đồng loạt
              </Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={sandbox.resetTrainingState}>
                🔄 Đặt lại phòng tập
              </Button>
            </Space>
          </div>
        )}
        <Row gutter={[24, 24]}>
          {/* CV list */}
          <Col xs={24} xl={12}>
            <SectionCard
              title={
                <Space>
                  <UserOutlined style={{ color: '#D4A84B' }} />
                  <span className="text-sm font-bold">CV đang làm gì?</span>
                </Space>
              }
              bodyPadding={0}
            >
              <Table
                dataSource={cvList}
                rowKey="name"
                rowClassName={(record) =>
                  record.shift === 'off' || record.attendance === 'checked_out' ? 'today-staff-inactive' : ''
                }
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
                columns={cvColumns}
                className="antd-custom-table"
              />
            </SectionCard>
          </Col>

          {/* CC list */}
          <Col xs={24} xl={12}>
            <SectionCard
              title={
                <Space>
                  <TeamOutlined style={{ color: '#D4A84B' }} />
                  <span className="text-sm font-bold">CC đang làm gì?</span>
                </Space>
              }
              bodyPadding={0}
            >
              <Table
                dataSource={ccList}
                rowKey="name"
                rowClassName={(record) =>
                  record.shift === 'off' || record.attendance === 'checked_out' ? 'today-staff-inactive' : ''
                }
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
                columns={ccColumns}
                className="antd-custom-table"
              />
            </SectionCard>
          </Col>
        </Row>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.ccList === nextProps.ccList &&
      prevProps.cvList === nextProps.cvList &&
      prevProps.themeMode === nextProps.themeMode
    );
  }
);

export default TodayStaffAttendance;

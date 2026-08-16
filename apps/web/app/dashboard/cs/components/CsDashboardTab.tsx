'use client';

import { TableIndexHeader } from '~/components/ui';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Space, theme, Spin, Progress, Table, Avatar, Tag, Badge, message } from 'antd';
import {
  PhoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useTheme } from '../../../../context/ThemeContext';
import { StatCard } from '../../../../components/ui/StatCard';
import { apiClient } from '../../../../lib/api-client';

const { Title, Text } = Typography;

interface CsDashboardTabProps {
  dateFrom?: string;
  dateTo?: string;
}

export default function CsDashboardTab({ dateFrom, dateTo }: CsDashboardTabProps) {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);

  const [stats, setStats] = useState({
    happyCall: {
      total: 0,
      completed: 0,
      completionRate: 0,
      noAnswer: 0,
    },
    ratings: {
      overallAverage: 0,
      technicianAverage: 0,
      staffAttitudeAverage: 0,
      facilityAverage: 0,
    },
    tickets: {
      total: 0,
      open: 0,
      resolved: 0,
      slaBreached: 0,
    },
    satisfactionBreakdown: {
      satisfied: 0,
      neutral: 0,
      dissatisfied: 0,
    },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { dateFrom, dateTo };

      const [statsRes, perfRes] = await Promise.all([
        apiClient.cs.getDashboardStats(params),
        apiClient.cs.getCsStaffPerformance(params),
      ]);

      if (statsRes && statsRes.success !== false) {
        const data = statsRes.data || statsRes;
        const happyCall = data.happyCall || { total: 0, completed: 0, completionRate: 0, noAnswer: 0 };
        const ratings = data.ratings || {
          overallAverage: 0,
          technicianAverage: 0,
          staffAttitudeAverage: 0,
          facilityAverage: 0,
        };
        const tickets = data.tickets || { total: 0, open: 0, resolved: 0, slaBreached: 0 };

        let satisfied = 0;
        let neutral = 0;
        let dissatisfied = 0;

        const breakdownList: { rating: number; count: number }[] = data.satisfactionBreakdown || [];
        const totalCount = breakdownList.reduce((acc, item) => acc + (item.count || 0), 0);

        if (totalCount > 0) {
          const satCount = breakdownList
            .filter((item) => item.rating >= 4)
            .reduce((acc, item) => acc + (item.count || 0), 0);
          const neuCount = breakdownList
            .filter((item) => item.rating === 3)
            .reduce((acc, item) => acc + (item.count || 0), 0);
          const disCount = breakdownList
            .filter((item) => item.rating <= 2)
            .reduce((acc, item) => acc + (item.count || 0), 0);

          satisfied = Math.round((satCount / totalCount) * 100);
          neutral = Math.round((neuCount / totalCount) * 100);
          dissatisfied = Math.round((disCount / totalCount) * 100);
        }

        setStats({
          happyCall: {
            total: happyCall.total || 0,
            completed: happyCall.completed || 0,
            completionRate: happyCall.completionRate || 0,
            noAnswer: happyCall.noAnswer || 0,
          },
          ratings: {
            overallAverage: Number(ratings.overallAverage || 0),
            technicianAverage: Number(ratings.technicianAverage || 0),
            staffAttitudeAverage: Number(ratings.staffAttitudeAverage || 0),
            facilityAverage: Number(ratings.facilityAverage || 0),
          },
          tickets: {
            total: tickets.total || 0,
            open: tickets.open || 0,
            resolved: tickets.resolved || 0,
            slaBreached: tickets.slaBreached || 0,
          },
          satisfactionBreakdown: {
            satisfied,
            neutral,
            dissatisfied,
          },
        });
      }

      if (perfRes && perfRes.data) {
        setStaffPerformance(perfRes.data);
      }
    } catch (error: any) {
      console.error('Error fetching CS dashboard data:', error);
      message.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tải thống kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  const performanceColumns = [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 55,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="tabular-nums text-xs text-slate-400 font-semibold">{index + 1}</span>
      ),
    },
    {
      title: 'Nhân viên CS',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (text: string, record: any) => (
        <div className="flex items-center gap-2.5">
          <Avatar
            src={record.avatarUrl || undefined}
            className="bg-sky-600 text-white font-bold flex-shrink-0"
            size={34}
          >
            {text?.[0]?.toUpperCase() || <UserOutlined />}
          </Avatar>
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">{text}</div>
            {record.email && <div className="text-xs text-slate-400">{record.email}</div>}
          </div>
        </div>
      ),
    },
    {
      title: 'Nhiệm vụ',
      dataIndex: 'totalTasks',
      key: 'totalTasks',
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums font-semibold">{val || 0}</span>,
    },
    {
      title: 'Hoàn thành',
      key: 'completedTasks',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <div className="flex flex-col items-center">
          <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
            {record.completedTasks || 0}{' '}
            <span className="text-xs text-slate-400 font-normal">({record.completionRate}%)</span>
          </span>
          <Progress
            percent={record.completionRate}
            size="small"
            showInfo={false}
            strokeColor={token.colorSuccess}
            className="w-20 mb-0"
          />
        </div>
      ),
    },
    {
      title: 'Không nghe / Nhắn tin',
      key: 'unreached',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <div className="flex items-center justify-center gap-1.5 tabular-nums text-xs">
          <Tag color="orange">{record.noAnswerTasks || 0} Không nghe</Tag>
          <Tag color="cyan">{record.messagedTasks || 0} Nhắn tin</Tag>
        </div>
      ),
    },
    {
      title: 'Điểm ĐG TB',
      dataIndex: 'avgOverallRating',
      key: 'avgOverallRating',
      align: 'center' as const,
      render: (val: number, record: any) => (
        <div className="flex items-center justify-center gap-1">
          <StarFilled className="text-amber-400" />
          <span className="tabular-nums font-bold text-slate-800 dark:text-slate-100">
            {val > 0 ? val.toFixed(1) : '-'}
          </span>
          <span className="text-xs text-slate-400">({record.surveyCount})</span>
        </div>
      ),
    },
    {
      title: 'Ticket phát sinh',
      dataIndex: 'ticketsCount',
      key: 'ticketsCount',
      align: 'center' as const,
      render: (val: number, record: any) => (
        <div>
          {val > 0 ? (
            <Badge count={record.urgentTicketsCount > 0 ? `${val} (Khẩn)` : val} overflowCount={99}>
              <Tag color={record.urgentTicketsCount > 0 ? 'red' : 'volcano'}>{val} Ticket</Tag>
            </Badge>
          ) : (
            <span className="text-slate-400 text-xs">-</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="∑ cuộc gọi"
              value={stats.happyCall.total}
              icon={<PhoneOutlined />}
              iconBgColor="rgba(24, 144, 255, 0.1)"
              trendText="Nhiệm vụ Happy Call"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="Hoàn thành"
              value={stats.happyCall.completed}
              icon={<CheckCircleOutlined />}
              iconBgColor="rgba(82, 196, 26, 0.1)"
              trendText={`Tỷ lệ ${Math.round(stats.happyCall.completionRate)}%`}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="Không nghe / Chờ"
              value={stats.happyCall.noAnswer || Math.max(0, stats.happyCall.total - stats.happyCall.completed)}
              icon={<ClockCircleOutlined />}
              iconBgColor="rgba(250, 173, 20, 0.1)"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="Ticket mở"
              value={stats.tickets.open}
              icon={<ExclamationCircleOutlined />}
              iconBgColor="rgba(245, 34, 45, 0.1)"
              trendText={stats.tickets.slaBreached > 0 ? `Trễ SLA: ${stats.tickets.slaBreached}` : undefined}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mt-4">
          <Col xs={24} lg={12}>
            <Card
              title="Đánh giá trung bình"
              variant="outlined"
              style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary, height: '100%' }}
              className="shadow-sm rounded-xl"
            >
              <div className="flex flex-col items-center justify-center h-full py-4">
                <div className="text-5xl font-bold tabular-nums text-amber-500 mb-2">
                  {stats.ratings.overallAverage > 0 ? stats.ratings.overallAverage.toFixed(1) : '0.0'}
                </div>
                <div className="text-lg text-slate-500 dark:text-slate-400 mb-6">/ 5.0</div>
                <Space size="large" className="w-full justify-around mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-semibold tabular-nums">
                      {stats.ratings.facilityAverage > 0 ? stats.ratings.facilityAverage.toFixed(1) : '0.0'}
                    </div>
                    <div className="text-xs text-slate-500">Chất lượng dịch vụ</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold tabular-nums">
                      {stats.ratings.technicianAverage > 0 ? stats.ratings.technicianAverage.toFixed(1) : '0.0'}
                    </div>
                    <div className="text-xs text-slate-500">Kỹ thuật KTV</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold tabular-nums">
                      {stats.ratings.staffAttitudeAverage > 0 ? stats.ratings.staffAttitudeAverage.toFixed(1) : '0.0'}
                    </div>
                    <div className="text-xs text-slate-500">Thái độ phục vụ</div>
                  </div>
                </Space>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title="Mức độ hài lòng"
              variant="outlined"
              style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary, height: '100%' }}
              className="shadow-sm rounded-xl"
            >
              <div className="flex flex-col gap-6 py-4 px-2">
                <div>
                  <div className="flex justify-between mb-1">
                    <Text>Hài lòng (4-5 sao)</Text>
                    <Text className="font-semibold">{stats.satisfactionBreakdown.satisfied}%</Text>
                  </div>
                  <Progress
                    percent={stats.satisfactionBreakdown.satisfied}
                    strokeColor={token.colorSuccess}
                    showInfo={false}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Text>Trung bình (3 sao)</Text>
                    <Text className="font-semibold">{stats.satisfactionBreakdown.neutral}%</Text>
                  </div>
                  <Progress
                    percent={stats.satisfactionBreakdown.neutral}
                    strokeColor={token.colorWarning}
                    showInfo={false}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Text>Không hài lòng (1-2 sao)</Text>
                    <Text className="font-semibold">{stats.satisfactionBreakdown.dissatisfied}%</Text>
                  </div>
                  <Progress
                    percent={stats.satisfactionBreakdown.dissatisfied}
                    strokeColor={token.colorError}
                    showInfo={false}
                  />
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Detailed CS Staff Performance Table */}
        <Card
          title="🏆 Bảng Hiệu Suất Nhân Sự CS"
          variant="outlined"
          style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          className="shadow-sm rounded-xl mt-4"
        >
          <Table
            columns={performanceColumns}
            dataSource={staffPerformance}
            rowKey="staffId"
            pagination={false}
            className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs"
          />
        </Card>
      </Spin>
    </div>
  );
}

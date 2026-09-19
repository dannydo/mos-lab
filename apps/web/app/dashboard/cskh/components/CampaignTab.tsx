'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Input,
  Space,
  Row,
  Col,
  Progress,
  Typography,
  Modal,
  Form,
  DatePicker,
  theme,
  message,
} from 'antd';
import { SearchOutlined, PlusOutlined, PlayCircleOutlined, TeamOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../../../context/ThemeContext';
import { apiClient } from '../../../../lib/api-client';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface CampaignTabProps {
  dateFrom?: string;
  dateTo?: string;
}

export default function CampaignTab({ dateFrom, dateTo }: CampaignTabProps) {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 12,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPageSize = localStorage.getItem('cs-campaign-pagesize');
      if (savedPageSize) {
        setPagination((prev) => ({ ...prev, pageSize: parseInt(savedPageSize, 10) }));
      }
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.cs.listCsCampaigns({
        page: pagination.current,
        pageSize: pagination.pageSize,
        search: search || undefined,
      });

      if (res && res.success !== false) {
        setData(res.data || []);
        setTotal(res.total || 0);
      } else {
        message.error('Không thể tải danh sách chiến dịch');
      }
    } catch (error: any) {
      console.error('Error listing campaigns:', error);
      message.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tải chiến dịch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize, search]);

  const handleActivate = async (id: number) => {
    setActivatingId(id);
    try {
      await apiClient.cs.activateCsCampaign(id);
      message.success('Kích hoạt chiến dịch thành công');
      fetchData();
    } catch (error: any) {
      console.error('Error activating campaign:', error);
      message.error(error?.response?.data?.message || 'Lỗi khi kích hoạt chiến dịch');
    } finally {
      setActivatingId(null);
    }
  };

  const handleCreateCampaign = async (values: any) => {
    setCreating(true);
    try {
      const [start, end] = values.dates || [];
      await apiClient.cs.createCsCampaign({
        name: values.name,
        description: values.description,
        startDate: start ? start.format('YYYY-MM-DD') : undefined,
        endDate: end ? end.format('YYYY-MM-DD') : undefined,
      });

      message.success('Tạo chiến dịch mới thành công');
      form.resetFields();
      setCreateModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      message.error(error?.response?.data?.message || 'Lỗi khi tạo chiến dịch');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Tag color="default">Bản nháp</Tag>;
      case 'ACTIVE':
        return <Tag color="blue">Đang chạy</Tag>;
      case 'PAUSED':
        return <Tag color="warning">Tạm dừng</Tag>;
      case 'COMPLETED':
        return <Tag color="green">Hoàn thành</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <Input
          placeholder="Tìm tên chiến dịch..."
          prefix={<SearchOutlined className="text-slate-400" />}
          style={{ width: 300 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: token.colorPrimary }}
          onClick={() => setCreateModalOpen(true)}
        >
          Tạo Chiến Dịch
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {data.map((campaign) => {
          const totalCust = campaign.totalCustomers ?? campaign.targetCustomerCount ?? 0;
          const completedCount = campaign.completed ?? campaign.completedCount ?? 0;
          const pendingCount = campaign.pending ?? campaign.pendingCount ?? Math.max(0, totalCust - completedCount);
          const progressPercent = totalCust > 0 ? Math.round((completedCount / totalCust) * 100) : 0;

          return (
            <Col xs={24} md={12} xl={8} key={campaign.id}>
              <Card
                hoverable
                variant="outlined"
                className="h-full rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
                styles={{ body: { padding: '20px' } }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div
                      className="font-semibold text-lg text-slate-800 dark:text-slate-100 line-clamp-1"
                      title={campaign.name}
                    >
                      {campaign.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {campaign.startDate ? dayjs(campaign.startDate).format('DD/MM/YYYY') : '-'} -{' '}
                      {campaign.endDate ? dayjs(campaign.endDate).format('DD/MM/YYYY') : '-'}
                    </div>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg text-center">
                    <TeamOutlined className="text-slate-400 mb-1" />
                    <div className="text-xs text-slate-500">∑ KH</div>
                    <div className="font-semibold tabular-nums">{totalCust}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center">
                    <CheckCircleOutlined className="text-green-500 mb-1" />
                    <div className="text-xs text-slate-500">Đã xong</div>
                    <div className="font-semibold text-green-600 dark:text-green-400 tabular-nums">
                      {completedCount}
                    </div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg text-center">
                    <PlayCircleOutlined className="text-orange-500 mb-1" />
                    <div className="text-xs text-slate-500">Chờ xử lý</div>
                    <div className="font-semibold text-orange-600 dark:text-orange-400 tabular-nums">
                      {pendingCount}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <Text type="secondary">Tiến độ</Text>
                    <Text className="font-medium">{progressPercent}%</Text>
                  </div>
                  <Progress percent={progressPercent} showInfo={false} strokeColor={token.colorPrimary} size="small" />
                </div>

                {campaign.status === 'DRAFT' && (
                  <Button
                    type="primary"
                    ghost
                    block
                    className="mt-4"
                    icon={<PlayCircleOutlined />}
                    loading={activatingId === campaign.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivate(campaign.id);
                    }}
                  >
                    Kích hoạt
                  </Button>
                )}
                {campaign.status === 'ACTIVE' && (
                  <Button block className="mt-4">
                    Xem danh sách Task
                  </Button>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>

      <Modal
        title="Tạo Chiến Dịch CSKH Mới"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateCampaign} className="mt-4">
          <Form.Item
            name="name"
            label="Tên chiến dịch"
            rules={[{ required: true, message: 'Vui lòng nhập tên chiến dịch' }]}
          >
            <Input placeholder="Ví dụ: CSKH Sinh Nhật Tháng 10..." />
          </Form.Item>

          <Form.Item
            name="dates"
            label="Thời gian diễn ra"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="description" label="Mô tả chiến dịch">
            <TextArea rows={3} placeholder="Mô tả chi tiết mục tiêu chiến dịch..." />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={creating}>
              Tạo chiến dịch
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

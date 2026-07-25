'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Card,
  Button,
  Row,
  Col,
  Badge,
  Tag,
  Spin,
  Input,
  Modal,
  Select,
  notification,
  message,
  Space,
  Form,
  Statistic,
} from 'antd';
import {
  FireOutlined,
  DashboardOutlined,
  SyncOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  MessageOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

interface Lead {
  id: string;
  name: string;
  phone: string;
  course: string;
  status: string;
  source: string;
  revenue: number;
  notes: string;
  is_hot: boolean;
  hot_marked_at?: string;
  hot_last_action?: string;
  hot_temperature?: number;
  created_at: string;
  updated_at?: string;
  follow_ups?: { date: string; text: string }[];
}

export default function HotLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ hotHours: 72, warmHours: 168 });
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Quick Log modal state
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [logType, setLogType] = useState<'call' | 'zalo' | 'note'>('call');
  const [logNote, setLogNote] = useState('');
  const [logVisible, setLogVisible] = useState(false);

  // Enroll modal state
  const [enrollLead, setEnrollLead] = useState<Lead | null>(null);
  const [enrollAmount, setEnrollAmount] = useState(1990000); // Default cọc
  const [enrollVisible, setEnrollVisible] = useState(false);

  const loadHotLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setLeads(
          data.map((l: any) => ({
            ...l,
            revenue: Number(l.revenue) || 0,
            follow_ups: Array.isArray(l.follow_ups) ? l.follow_ups : [],
          }))
        );
      }
    } catch (err: any) {
      console.error(err);
      message.error('Lỗi khi tải Hot Leads: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHotLeads();
  }, []);

  // Save quick log and reset countdown
  const handleSaveLog = async () => {
    if (!activeLead) return;

    const actionText =
      logType === 'call' ? '📞 Gọi điện tư vấn: ' : logType === 'zalo' ? '💬 Nhắn tin Zalo: ' : '📝 Ghi chú: ';
    const logText = actionText + logNote.trim();

    const newLog = {
      date: dayjs().format('YYYY-MM-DD HH:mm'),
      text: logText,
    };

    const updatedFollowUps = [newLog, ...(activeLead.follow_ups || [])];

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          follow_ups: updatedFollowUps,
          hot_marked_at: new Date().toISOString(), // Reset timer
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeLead.id);

      if (error) throw error;

      message.success('Đã lưu hành động & Cập nhật lại thời gian Cooldown!');
      setLogVisible(false);
      setLogNote('');
      loadHotLeads();
    } catch (err: any) {
      message.error('Lỗi khi lưu hành động: ' + err.message);
    }
  };

  // Convert/Enroll Lead
  const handleEnrollLead = async () => {
    if (!enrollLead) return;

    const newLog = {
      date: dayjs().format('YYYY-MM-DD HH:mm'),
      text: `✅ Học viên đã chốt học - Đóng cọc: ${new Intl.NumberFormat('vi-VN').format(enrollAmount)} đ`,
    };

    const updatedFollowUps = [newLog, ...(enrollLead.follow_ups || [])];

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status: 'converted',
          revenue: enrollAmount,
          follow_ups: updatedFollowUps,
          is_hot: false, // Remove from hot kanban
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollLead.id);

      if (error) throw error;

      message.success('Chúc mừng! Đã chốt thành công học viên 🎉');
      setEnrollVisible(false);
      loadHotLeads();
    } catch (err: any) {
      message.error('Lỗi khi chốt lead: ' + err.message);
    }
  };

  // Demote lead (remove from Kanban)
  const handleDemoteLead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          is_hot: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      message.info('Đã gỡ khỏi danh sách Hot Leads');
      loadHotLeads();
    } catch (err: any) {
      message.error('Lỗi khi gỡ Hot: ' + err.message);
    }
  };

  // Classify leads into Kanban Columns
  const getKanbanData = () => {
    const hotList: Lead[] = [];
    const warmList: Lead[] = [];
    const convertedList: Lead[] = [];

    leads.forEach((l) => {
      // Converted today
      if (l.status === 'converted' && l.updated_at && dayjs(l.updated_at).isAfter(dayjs().startOf('day'))) {
        convertedList.push(l);
        return;
      }

      if (!l.is_hot) return;

      const markedTime = l.hot_marked_at ? dayjs(l.hot_marked_at) : dayjs(l.created_at);
      const elapsedHours = dayjs().diff(markedTime, 'hour');

      if (elapsedHours < settings.hotHours) {
        hotList.push(l);
      } else if (elapsedHours < settings.warmHours) {
        warmList.push(l);
      }
    });

    return { hotList, warmList, convertedList };
  };

  const { hotList, warmList, convertedList } = getKanbanData();

  const getCountdownLabel = (markedAt?: string) => {
    if (!markedAt) return '';
    const diffMs = dayjs(markedAt).add(settings.hotHours, 'hour').diff(dayjs());
    if (diffMs <= 0) return 'Đã hết hạn Hot';

    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `Còn lại ${hours}h ${minutes}m`;
  };

  const renderCard = (l: Lead, isWarm = false) => {
    const timeLabel = isWarm
      ? `Đã trôi qua ${dayjs().diff(dayjs(l.hot_marked_at), 'hour')}h`
      : getCountdownLabel(l.hot_marked_at);

    return (
      <Card
        key={l.id}
        size="small"
        className="mb-3 hover:shadow-md transition-shadow border border-default"
        styles={{ body: { padding: '12px' } }}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="font-bold text-heading text-sm">{l.name}</span>
          <Tag color={isWarm ? 'orange' : 'red'} className="text-[10px] m-0 font-semibold uppercase">
            {isWarm ? 'Warm 🌡️' : 'Hot 🔥'}
          </Tag>
        </div>

        <div className="text-xs text-secondary flex flex-col gap-1 mb-3">
          <div>📞 SĐT: {l.phone || 'Chưa có'}</div>
          {l.course && <div>📚 Khóa học: {l.course}</div>}
          <div className="text-[10px] font-medium text-amber-500">{timeLabel}</div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-dashed border-default">
          <Button
            size="small"
            icon={<PhoneOutlined />}
            onClick={() => {
              setActiveLead(l);
              setLogType('call');
              setLogVisible(true);
            }}
          >
            Gọi
          </Button>
          <Button
            size="small"
            icon={<MessageOutlined />}
            onClick={() => {
              setActiveLead(l);
              setLogType('zalo');
              setLogVisible(true);
            }}
          >
            Zalo
          </Button>
          <Button
            size="small"
            type="primary"
            onClick={() => {
              setEnrollLead(l);
              setEnrollVisible(true);
            }}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
          >
            Chốt
          </Button>
          <Button size="small" type="text" danger onClick={() => handleDemoteLead(l.id)}>
            Hủy
          </Button>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-3">
        <Spin size="large" />
        <span className="text-xs font-semibold text-gray-500">Đang tải dữ liệu Hot Leads...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Stats cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card size="small" className="border-red-200 bg-red-500/5">
            <Statistic
              title={<span className="text-xs text-red-500 font-bold">Hot — Cần xử lý</span>}
              value={hotList.length}
              valueStyle={{ color: '#ef4444', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="border-amber-200 bg-amber-500/5">
            <Statistic
              title={<span className="text-xs text-amber-500 font-bold">Warm — Đang nguội</span>}
              value={warmList.length}
              valueStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="border-emerald-200 bg-emerald-500/5">
            <Statistic
              title={<span className="text-xs text-emerald-500 font-bold">Chốt hôm nay</span>}
              value={convertedList.length}
              valueStyle={{ color: '#10b981', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Settings bar */}
      <div className="flex justify-between items-center bg-container p-3 rounded-lg border border-default text-xs text-secondary">
        <div>
          ⏱️ Cooldown: 🔥 Hot tự chuyển sang Warm sau <strong>{settings.hotHours}h</strong> | 🌡️ Warm tự ẩn sau{' '}
          <strong>{settings.warmHours}h</strong>.
        </div>
        <Button size="small" icon={<SyncOutlined />} onClick={loadHotLeads}>
          Làm mới
        </Button>
      </div>

      {/* Kanban Board columns */}
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <div className="bg-container p-4 rounded-xl border border-default h-[650px] overflow-y-auto custom-scrollbar">
            <h3 className="font-bold text-sm text-red-500 mb-4 border-b border-default pb-2 flex justify-between">
              <span>🔥 Hot — Xử lý ngay</span>
              <Badge count={hotList.length} color="#ef4444" />
            </h3>
            {hotList.length > 0 ? (
              hotList.map((l) => renderCard(l, false))
            ) : (
              <div className="text-center py-10 text-gray-400 text-xs">Không có Hot lead</div>
            )}
          </div>
        </Col>

        <Col xs={24} md={8}>
          <div className="bg-container p-4 rounded-xl border border-default h-[650px] overflow-y-auto custom-scrollbar">
            <h3 className="font-bold text-sm text-amber-500 mb-4 border-b border-default pb-2 flex justify-between">
              <span>🌡️ Warm — Đang nguội dần</span>
              <Badge count={warmList.length} color="#f59e0b" />
            </h3>
            {warmList.length > 0 ? (
              warmList.map((l) => renderCard(l, true))
            ) : (
              <div className="text-center py-10 text-gray-400 text-xs">Không có Warm lead</div>
            )}
          </div>
        </Col>

        <Col xs={24} md={8}>
          <div className="bg-container p-4 rounded-xl border border-default h-[650px] overflow-y-auto custom-scrollbar">
            <h3 className="font-bold text-sm text-emerald-500 mb-4 border-b border-default pb-2 flex justify-between">
              <span>✅ Đã chốt — Hôm nay</span>
              <Badge count={convertedList.length} color="#10b981" />
            </h3>
            {convertedList.length > 0 ? (
              convertedList.map((l) => (
                <Card key={l.id} size="small" className="mb-3 border border-emerald-100 bg-emerald-50/5">
                  <div className="font-bold text-heading text-sm mb-1">{l.name}</div>
                  <div className="text-xs text-secondary">
                    <div>SĐT: {l.phone}</div>
                    {l.course && <div>Khóa học: {l.course}</div>}
                    <div className="text-emerald-500 font-semibold mt-1">
                      Đã đóng cọc: {new Intl.NumberFormat('vi-VN').format(l.revenue)} đ
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400 text-xs">Chưa có ai chốt hôm nay</div>
            )}
          </div>
        </Col>
      </Row>

      {/* Modal: Add consultation Log */}
      <Modal
        title={`Ghi chú hành động: ${activeLead?.name || ''}`}
        open={logVisible}
        onCancel={() => setLogVisible(false)}
        onOk={handleSaveLog}
        okText="Lưu & Reset Hạn Cooldown"
        cancelText="Hủy"
      >
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-xs text-secondary block mb-1">Loại hành động</span>
            <Select value={logType} onChange={setLogType} className="w-full">
              <Select.Option value="call">📞 Đã gọi điện tư vấn</Select.Option>
              <Select.Option value="zalo">💬 Đã nhắn tin Zalo</Select.Option>
              <Select.Option value="note">📝 Ghi chú thông tin khác</Select.Option>
            </Select>
          </div>
          <div>
            <span className="text-xs text-secondary block mb-1">Nội dung ghi chú</span>
            <Input.TextArea
              rows={3}
              placeholder="Nhập tóm tắt cuộc trao đổi..."
              value={logNote}
              onChange={(e) => setLogNote(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Enroll lead */}
      <Modal
        title={`Xác nhận Chốt học viên: ${enrollLead?.name || ''}`}
        open={enrollVisible}
        onCancel={() => setEnrollVisible(false)}
        onOk={handleEnrollLead}
        okText="Đăng ký & Chốt"
        cancelText="Hủy"
      >
        <div className="flex flex-col gap-4">
          <AlertOutlined style={{ fontSize: 24, color: '#10b981', display: 'block', margin: '0 auto' }} />
          <p className="text-sm text-center font-medium">
            Chuyển trạng thái của học viên sang Đã chốt và ghi nhận doanh thu cọc.
          </p>
          <div>
            <span className="text-xs text-secondary block mb-1">Số tiền cọc thực tế (VND)</span>
            <Input type="number" value={enrollAmount} onChange={(e) => setEnrollAmount(Number(e.target.value))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

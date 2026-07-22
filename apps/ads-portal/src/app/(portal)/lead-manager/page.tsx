'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Table,
  Button,
  Progress,
  Tabs,
  Badge,
  Tag,
  Input,
  Modal,
  Form,
  Select,
  DatePicker,
  InputNumber,
  notification,
  message,
  Drawer,
  Timeline,
  Card,
  Space,
  Avatar,
  Popover,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  SyncOutlined,
  PlayCircleOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  EditOutlined,
  SearchOutlined,
  CheckOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const TARGET_REVENUE = 100000000; // 100M VND

const COURSE_MAP: Record<string, string> = {
  Combo: 'Combo Pro (19.9M)',
  Basic: 'Nền Tảng (1.9M)',
  Advanced: 'Tinh Hoa (9.9M)',
  Volume: 'Volume (9.9M)',
  Design: 'Thiết Kế (9.9M)',
};

const COURSE_COLOR_MAP: Record<string, string> = {
  Combo: 'gold',
  Basic: 'blue',
  Advanced: 'purple',
  Volume: 'magenta',
  Design: 'cyan',
};

const STATUS_META: Record<string, { label: string; color: string; badge: string }> = {
  new: { label: 'Lead Mới', color: 'blue', badge: 'processing' },
  warm: { label: 'Khai Thác', color: 'orange', badge: 'warning' },
  scheduled: { label: 'Hẹn Test', color: 'purple', badge: 'processing' },
  tested: { label: 'Đã Test', color: 'pink', badge: 'default' },
  converted: { label: 'Đã Chốt', color: 'green', badge: 'success' },
  lost: { label: 'Từ Bỏ', color: 'gray', badge: 'error' },
};

const FLOW = ['new', 'warm', 'scheduled', 'tested', 'converted'];

interface FollowUp {
  date: string;
  text: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  course: string;
  status: string;
  goal: string;
  source: string;
  flight_date: string;
  schedule_date: string;
  schedule_time: string;
  revenue: number;
  notes: string;
  follow_ups: FollowUp[];
  no_show?: boolean;
  avatar_url?: string;
  created_at: string;
}

function renderLeadAvatar(lead: Lead) {
  const name = (lead.name || 'Lead').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  let initials = 'L';
  if (parts.length === 1) {
    initials = parts[0].substring(0, 2).toUpperCase();
  } else if (parts.length > 1) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const bgStyle = `hsl(${hue}, 65%, 45%)`;

  if (lead.avatar_url && lead.avatar_url.trim()) {
    return <Avatar src={lead.avatar_url.trim()} alt={name} size={34} className="shrink-0 font-bold" />;
  }

  return (
    <Avatar size={34} style={{ backgroundColor: bgStyle, color: '#fff' }} className="shrink-0 font-bold text-xs">
      {initials}
    </Avatar>
  );
}

export default function LeadManagerPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Drawer state for details & edit
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [newFollowUpText, setNewFollowUpText] = useState('');
  const [noteInputValue, setNoteInputValue] = useState('');

  // Sync noteInputValue when detailLead changes
  useEffect(() => {
    if (detailLead) {
      setNoteInputValue(detailLead.notes || '');
    }
  }, [detailLead?.id]);

  // Inline update notes to Supabase
  const handleUpdateNotes = async (leadId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, notes } : l)));
      if (detailLead && detailLead.id === leadId) {
        setDetailLead((prev) => (prev ? { ...prev, notes } : null));
      }
      message.success('Đã lưu ghi chú tư vấn');
    } catch (err: any) {
      message.error('Lỗi khi lưu ghi chú: ' + err.message);
    }
  };

  // Modal state for Add Lead
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Load leads from Supabase
  const loadLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const normalizedLeads = data.map((l: any) => ({
          ...l,
          revenue: Number(l.revenue) || 0,
          follow_ups: Array.isArray(l.follow_ups) ? l.follow_ups : [],
        }));
        setLeads(normalizedLeads);
      }
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      message.error('Lỗi khi tải dữ liệu leads: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  // Sync Pancake via trigger API
  const handlePancakeSync = async () => {
    setSyncing(true);
    notification.info({
      message: 'Bắt đầu đồng bộ',
      description: 'Hệ thống đang kết nối Chrome CDP và lấy lead từ Pancake. Vui lòng chờ...',
      placement: 'topRight',
    });
    try {
      const res = await fetch('/api/sync-pancake', { method: 'POST' });
      const data = await res.json();

      if (data.status === 'success') {
        notification.success({
          message: 'Đồng bộ thành công',
          description: `Đã xử lý ${data.total_processed} leads, thêm mới ${data.inserted} leads.`,
          duration: 6,
        });
        loadLeads();
      } else {
        throw new Error(data.message || 'Lỗi đồng bộ');
      }
    } catch (err: any) {
      console.error(err);
      notification.error({
        message: 'Đồng bộ thất bại',
        description: err.message || 'Lỗi không xác định khi kết nối script đồng bộ.',
      });
    } finally {
      setSyncing(false);
    }
  };

  // Add Lead
  const handleAddLead = async (values: any) => {
    try {
      const newLead = {
        name: values.name,
        phone: values.phone || '',
        course: values.course || '',
        goal: values.goal || '',
        source: values.source || 'Manual Academy',
        revenue: values.revenue || 0,
        notes: values.notes || '',
        status: 'new',
        follow_ups: values.notes ? [{ date: dayjs().format('YYYY-MM-DD'), text: 'Tạo lead mới: ' + values.notes }] : [],
        created_at: dayjs().toISOString(),
      };

      const { data, error } = await supabase.from('leads').insert([newLead]).select();

      if (error) throw error;

      message.success('Thêm học viên tiềm năng thành công!');
      setAddModalVisible(false);
      form.resetFields();
      loadLeads();
    } catch (err: any) {
      message.error('Lỗi khi thêm lead: ' + err.message);
    }
  };

  // Inline update status transition
  const handleStatusChange = async (leadId: string, currentStatus: string, targetStatus: string, checked: boolean) => {
    let nextStatus = currentStatus;

    if (checked) {
      // Move forward if target is further in the flow
      const currentIdx = FLOW.indexOf(currentStatus);
      const targetIdx = FLOW.indexOf(targetStatus);
      if (targetIdx > currentIdx) {
        nextStatus = targetStatus;
      }
    } else {
      // Move backward to the step before targetStatus
      const targetIdx = FLOW.indexOf(targetStatus);
      if (targetIdx > 0) {
        nextStatus = FLOW[targetIdx - 1];
      } else {
        nextStatus = 'new';
      }
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      message.success(`Đã cập nhật trạng thái thành ${STATUS_META[nextStatus].label}`);

      // Update local state directly for fast feedback
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l)));
      if (detailLead && detailLead.id === leadId) {
        setDetailLead((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (err: any) {
      message.error('Lỗi khi cập nhật trạng thái: ' + err.message);
    }
  };

  // Reschedule test date
  const handleReschedule = async (leadId: string, dateStr: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          schedule_date: dateStr,
          no_show: false,
          status: 'scheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      message.success('Đã cập nhật ngày hẹn test và chuyển trạng thái về Hẹn Test');
      loadLeads();
    } catch (err: any) {
      message.error('Lỗi khi hẹn lịch lại: ' + err.message);
    }
  };

  // Mark tested
  const handleMarkTested = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'tested', no_show: false, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      message.success('Đã xác nhận học viên đã đến test tay nghề');
      loadLeads();
    } catch (err: any) {
      message.error('Lỗi khi xác nhận test: ' + err.message);
    }
  };

  // Mark no-show (bùng test)
  const handleMarkNoShow = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ no_show: true, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      message.warning('Đã đánh dấu trạng thái Bùng hẹn');
      loadLeads();
    } catch (err: any) {
      message.error('Lỗi khi đánh dấu: ' + err.message);
    }
  };

  // Abandon lead (Từ bỏ)
  const handleAbandonLead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'lost', updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      message.info('Đã chuyển học viên sang mục Từ bỏ');
      loadLeads();
    } catch (err: any) {
      message.error('Lỗi khi hủy lead: ' + err.message);
    }
  };

  // Restore lead
  const handleRestoreLead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'new', updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      message.success('Khôi phục học viên thành công');
      loadLeads();
    } catch (err: any) {
      message.error('Lỗi khi khôi phục: ' + err.message);
    }
  };

  // Add Follow up log
  const handleAddFollowUp = async () => {
    if (!detailLead || !newFollowUpText.trim()) return;

    const newLog = {
      date: dayjs().format('YYYY-MM-DD'),
      text: newFollowUpText.trim(),
    };

    const updatedFollowUps = [newLog, ...detailLead.follow_ups];

    try {
      const { error } = await supabase
        .from('leads')
        .update({ follow_ups: updatedFollowUps, updated_at: new Date().toISOString() })
        .eq('id', detailLead.id);

      if (error) throw error;

      message.success('Đã lưu nhật ký tư vấn');
      setDetailLead((prev) => (prev ? { ...prev, follow_ups: updatedFollowUps } : null));
      setLeads((prev) => prev.map((l) => (l.id === detailLead.id ? { ...l, follow_ups: updatedFollowUps } : l)));
      setNewFollowUpText('');
    } catch (err: any) {
      message.error('Không thể lưu nhật ký: ' + err.message);
    }
  };

  // Calculated target revenue progress
  const totalRevenue = leads.filter((l) => l.status === 'converted').reduce((sum, l) => sum + (l.revenue || 0), 0);
  const revenuePct = Math.min(100, Math.round((totalRevenue / TARGET_REVENUE) * 1000) / 10);

  // Filtered lists for rendering in table
  const getFilteredData = () => {
    let list = [...leads];
    if (activeTab !== 'all') {
      if (activeTab === 'lost') {
        list = list.filter((l) => l.status === 'lost');
      } else {
        list = list.filter((l) => l.status === activeTab);
      }
    } else {
      // Exclude lost from all tab by default
      list = list.filter((l) => l.status !== 'lost');
    }

    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      list = list.filter(
        (l) =>
          (l.name || '').toLowerCase().includes(query) ||
          (l.phone || '').includes(query) ||
          (l.notes || '').toLowerCase().includes(query)
      );
    }
    return list;
  };

  const columns = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Khách hàng / Học viên',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Lead) => {
        const daysToFlight = record.flight_date ? dayjs(record.flight_date).diff(dayjs(), 'day') : -1;
        const flightWarning = daysToFlight >= 0 && daysToFlight <= 14;

        return (
          <div className="flex items-center gap-3">
            {renderLeadAvatar(record)}
            <div className="flex flex-col">
              <span
                className="font-bold text-sm cursor-pointer text-heading hover:text-[#b8941f] transition-colors"
                onClick={() => setDetailLead(record)}
              >
                {text}
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {flightWarning && (
                  <Tag color="red" className="text-[10px] py-0 px-1 font-semibold">
                    🛫 Bay {daysToFlight}d
                  </Tag>
                )}
                {record.status === 'scheduled' && record.no_show && (
                  <Tag color="error" className="text-[10px] py-0 px-1 font-bold">
                    ❌ Bùng hẹn
                  </Tag>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (text: string) => text || '—',
    },
    {
      title: 'Khóa học',
      dataIndex: 'course',
      key: 'course',
      render: (text: string) =>
        text ? (
          <Tag color={COURSE_COLOR_MAP[text] || 'default'} className="font-semibold">
            {COURSE_MAP[text] || text}
          </Tag>
        ) : (
          '—'
        ),
    },
    {
      title: 'Mục tiêu',
      dataIndex: 'goal',
      key: 'goal',
      render: (text: string) => text || '—',
    },
    // Checkbox columns when viewing All tab
    ...(activeTab === 'all'
      ? FLOW.map((status) => ({
          title: STATUS_META[status].label,
          key: status,
          align: 'center' as const,
          render: (_: any, record: Lead) => {
            const isChecked = FLOW.indexOf(record.status) >= FLOW.indexOf(status);
            return (
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => handleStatusChange(record.id, record.status, status, e.target.checked)}
                className="w-4.5 h-4.5 cursor-pointer accent-[#b8941f]"
              />
            );
          },
        }))
      : []),
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (val: number) =>
        val > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val) : '—',
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (text: string) => text || <span className="text-gray-400">Không có ghi chú</span>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: Lead) => {
        if (record.status === 'lost') {
          return (
            <Button size="small" type="link" onClick={() => handleRestoreLead(record.id)}>
              Khôi phục
            </Button>
          );
        }

        if (record.status === 'scheduled') {
          return (
            <Space>
              <Button
                size="small"
                type="primary"
                color="pink"
                variant="solid"
                onClick={() => handleMarkTested(record.id)}
              >
                Đã test
              </Button>
              <Button size="small" danger onClick={() => handleMarkNoShow(record.id)}>
                Bùng
              </Button>
              {record.no_show && (
                <DatePicker
                  size="small"
                  placeholder="Hẹn lại"
                  onChange={(_, dateStr) => handleReschedule(record.id, dateStr as string)}
                  style={{ width: 100 }}
                />
              )}
            </Space>
          );
        }

        return (
          <Button size="small" danger type="text" onClick={() => handleAbandonLead(record.id)}>
            Hủy
          </Button>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Target Revenue Progress Bar */}
      <Card className="shadow-sm border border-default" styles={{ body: { padding: '16px 24px' } }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-[#b8941f]">
              <CalendarOutlined style={{ fontSize: 20 }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-heading">Wings Lead Manager</h1>
              <p className="text-xs text-secondary">Học viện Đào tạo — Khai thác, Chốt sales & Lịch hẹn test</p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-1 max-w-md w-full">
            <div className="flex-1">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-heading">Mục tiêu cọc: 100M VND</span>
                <span className="text-[#b8941f]">{revenuePct}%</span>
              </div>
              <Progress
                percent={revenuePct}
                strokeColor="#b8941f"
                trailColor="rgba(148,163,184,0.15)"
                showInfo={false}
                size={{ height: 8 }}
              />
            </div>
            <div className="text-right">
              <span className="text-xs text-secondary block leading-none mb-1">Đã đóng</span>
              <span className="text-base font-bold text-emerald-500">
                {new Intl.NumberFormat('vi-VN').format(totalRevenue)} đ
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <Space className="w-full sm:w-auto">
          <Input
            placeholder="Tìm tên, SĐT, ghi chú..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full sm:w-64"
            allowClear
          />
          <Button icon={<SyncOutlined spin={loading} />} onClick={loadLeads}>
            Làm mới
          </Button>
        </Space>

        <Space className="w-full sm:w-auto justify-end">
          <Button type="default" icon={<SyncOutlined spin={syncing} />} loading={syncing} onClick={handlePancakeSync}>
            Đồng bộ Pancake
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ backgroundColor: '#b8941f', borderColor: '#b8941f' }}
            onClick={() => setAddModalVisible(true)}
          >
            Thêm Lead
          </Button>
        </Space>
      </div>

      {/* Leads Tabs list */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className="custom-tabs"
        items={[
          { key: 'all', label: 'Tất cả' },
          { key: 'new', label: 'Mới' },
          { key: 'warm', label: 'Khai Thác' },
          { key: 'scheduled', label: 'Hẹn Test' },
          { key: 'tested', label: 'Đã Test' },
          { key: 'converted', label: 'Đã Chốt' },
          { key: 'lost', label: 'Từ Bỏ' },
        ]}
      />

      {/* Drawer: Detailed view & Follow up history */}
      <Drawer
        title={detailLead ? `Chi tiết: ${detailLead.name}` : ''}
        placement="right"
        width={540}
        onClose={() => setDetailLead(null)}
        open={!!detailLead}
      >
        {detailLead && (
          <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1 custom-scrollbar">
            {/* Status & info tags */}
            <div className="flex flex-wrap items-center gap-2">
              <Tag
                color={STATUS_META[detailLead.status]?.color || 'default'}
                className="font-semibold text-sm px-3 py-1"
              >
                {STATUS_META[detailLead.status]?.label || detailLead.status}
              </Tag>
              {detailLead.course && (
                <Tag
                  color={COURSE_COLOR_MAP[detailLead.course] || 'default'}
                  className="font-semibold text-sm px-3 py-1"
                >
                  {COURSE_MAP[detailLead.course] || detailLead.course}
                </Tag>
              )}
              {detailLead.flight_date && (
                <Tag color="red" className="font-semibold text-sm px-3 py-1">
                  🛫 Bay ngày {dayjs(detailLead.flight_date).format('DD/MM/YYYY')}
                </Tag>
              )}
            </div>

            {/* Contact Info Card */}
            <Card size="small" title="Thông tin liên hệ" className="border-default">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-secondary text-xs block">Họ và tên</span>
                  <span className="font-semibold text-heading">{detailLead.name}</span>
                </div>
                <div>
                  <span className="text-secondary text-xs block">Số điện thoại</span>
                  <span className="font-semibold text-heading">{detailLead.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-secondary text-xs block">Nguồn Lead</span>
                  <span className="font-semibold text-heading">{detailLead.source || '—'}</span>
                </div>
                <div>
                  <span className="text-secondary text-xs block">Mục tiêu</span>
                  <span className="font-semibold text-heading">{detailLead.goal || '—'}</span>
                </div>
                {detailLead.schedule_date && (
                  <div>
                    <span className="text-secondary text-xs block">Ngày hẹn test</span>
                    <span className="font-semibold text-heading text-purple-600">
                      {dayjs(detailLead.schedule_date).format('DD/MM/YYYY')} {detailLead.schedule_time || ''}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-secondary text-xs block">Doanh thu cọc</span>
                  <span className="font-semibold text-emerald-500">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                      detailLead.revenue || 0
                    )}
                  </span>
                </div>
              </div>
            </Card>

            {/* Enlarged Consultation Notes Box */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Ghi chú tư vấn</label>
              <Input.TextArea
                rows={4}
                value={noteInputValue}
                onChange={(e) => setNoteInputValue(e.target.value)}
                onBlur={() => handleUpdateNotes(detailLead.id, noteInputValue)}
                placeholder="Nhập ghi chú tư vấn chi tiết tại đây (tự động lưu khi bấm ra ngoài)..."
                style={{ minHeight: 110, fontSize: 13 }}
                className="rounded-lg border-default"
              />
            </div>

            {/* Scrollable Zalo Sales Script Box */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
                📋 Kịch bản gợi ý chốt sales (Zalo)
              </label>
              <div className="max-h-[190px] overflow-y-auto pr-1.5 border border-default rounded-lg p-2.5 bg-hover flex flex-col gap-2.5 custom-scrollbar">
                {[
                  ...(detailLead.flight_date
                    ? [
                        {
                          title: '🛫 Kịch bản học viên đi định cư/nước ngoài',
                          icon: '🛫',
                          text: `Chị ${detailLead.name.split(' ').pop()} ơi, em thấy chị sắp có lịch đi nước ngoài nè. Khóa học Nối mi bên em thiết kế đặc biệt 1-1 cho các bạn chuẩn bị đi định cư, ra nghề làm được ngay để kiếm thu nhập tốt bên đó luôn á chị!`,
                        },
                      ]
                    : []),
                  {
                    title: '📖 Gửi câu chuyện thành công của học viên',
                    icon: '📖',
                    text: `Chị ${detailLead.name.split(' ').pop()} ơi, bạn học viên bên em ban đầu cũng sợ tay run mắt mỏi không làm được, mà học khoá Basic 2 buổi là tay vững vàng lên mẫu thật luôn á chị! 💪 Em gửi chị xem sản phẩm bạn làm nha. [Gửi kèm ảnh sản phẩm HV]`,
                  },
                  {
                    title: '📅 Mời qua test tay nghề trực tiếp',
                    icon: '📅',
                    text: `Bên em đang có chương trình khảo sát test tay nghề 1-1 miễn phí cùng giảng viên trong 30 phút. Giúp chị xem mình hợp kỹ thuật nào. Chiều nay hay sáng mai chị ghé được ạ? 🥰`,
                  },
                  {
                    title: '⏰ Tạo urgency giữ slot',
                    icon: '⏰',
                    text: `Chị ${detailLead.name.split(' ').pop()} ơi, slot test tay nghề 1-1 miễn phí tuần này bên em chỉ còn trống 2 chỗ thôi. Em giữ trước cho mình một slot nha chị? 🥺`,
                  },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    className="bg-container border border-default p-2.5 rounded-md flex flex-col gap-1.5 shadow-2xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-xs text-heading">{s.title}</span>
                      <Button
                        size="small"
                        type="primary"
                        icon={<CopyOutlined />}
                        style={{ backgroundColor: '#b8941f', borderColor: '#b8941f', fontSize: 11, height: 24 }}
                        onClick={() => {
                          navigator.clipboard.writeText(s.text);
                          message.success('Đã copy kịch bản!');
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-xs text-secondary whitespace-pre-wrap leading-relaxed max-h-[120px] overflow-y-auto pr-1">
                      {s.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline history logs */}
            <div className="flex-1 flex flex-col min-h-[180px]">
              <span className="font-bold text-xs uppercase tracking-wider text-secondary mb-2">
                📝 Lịch sử chăm sóc ({detailLead.follow_ups.length})
              </span>
              <div className="flex-1 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar border border-default p-3 rounded-lg bg-container">
                {detailLead.follow_ups.length > 0 ? (
                  <Timeline
                    items={detailLead.follow_ups.map((item, idx) => ({
                      color: idx === 0 ? 'blue' : 'gray',
                      children: (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-secondary font-medium">
                            {dayjs(item.date).format('DD/MM/YYYY')}
                          </span>
                          <span className="text-xs text-heading leading-snug">{item.text}</span>
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <div className="text-center py-6 text-gray-400 text-xs">Chưa ghi nhận nhật ký tư vấn nào.</div>
                )}
              </div>

              {/* Add Consultation log input */}
              {/* Add Consultation log input */}
              <div className="pt-3 flex gap-2">
                <Input
                  placeholder="Nhập ghi chú chăm sóc mới..."
                  value={newFollowUpText}
                  onChange={(e) => setNewFollowUpText(e.target.value)}
                  onPressEnter={handleAddFollowUp}
                />
                <Button
                  type="primary"
                  onClick={handleAddFollowUp}
                  style={{ backgroundColor: '#b8941f', borderColor: '#b8941f' }}
                >
                  + Ghi
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Modal: Add Lead */}
      <Modal
        title="Thêm học viên tiềm năng"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        onOk={() => form.submit()}
        okText="Thêm mới"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleAddLead}>
          <Form.Item
            name="name"
            label="Tên học viên"
            rules={[{ required: true, message: 'Vui lòng nhập tên học viên!' }]}
          >
            <Input placeholder="Chị Trâm" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại / Zalo">
            <Input placeholder="0901234567" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="course" label="Khóa học">
              <Select placeholder="Chọn khóa học">
                <Select.Option value="Combo">Combo 4 Khóa Pro (19.9M)</Select.Option>
                <Select.Option value="Basic">Nền Tảng Nối Mi (1.9M)</Select.Option>
                <Select.Option value="Advanced">Tinh Hoa Nối Mi (9.9M)</Select.Option>
                <Select.Option value="Volume">Volume & Mega (9.9M)</Select.Option>
                <Select.Option value="Design">Thiết Kế Phom Mi (9.9M)</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="goal" label="Mục tiêu học">
              <Select placeholder="Chọn mục tiêu">
                <Select.Option value="Đổi nghề">Đổi nghề</Select.Option>
                <Select.Option value="Kiếm thêm thu nhập">Kiếm thêm thu nhập</Select.Option>
                <Select.Option value="Nâng cấp tay nghề">Nâng cấp tay nghề</Select.Option>
                <Select.Option value="Mở tiệm riêng">Mở tiệm riêng</Select.Option>
                <Select.Option value="Học trước khi định cư">Học trước khi định cư</Select.Option>
              </Select>
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="source" label="Nguồn Lead" initialValue="Manual Academy">
              <Select>
                <Select.Option value="Manual Academy">Nhập tay</Select.Option>
                <Select.Option value="Facebook Academy">Quảng cáo Facebook</Select.Option>
                <Select.Option value="Pancake Academy">Đồng bộ Pancake</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="revenue" label="Số tiền cọc trước">
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0"
                min={0}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
              />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="Ghi chú chi tiết">
            <Input.TextArea placeholder="Ghi lại nhu cầu cụ thể của học viên..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

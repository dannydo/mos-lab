'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Table,
  Button,
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
  Space,
  Avatar,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SyncOutlined,
  CopyOutlined,
  EditOutlined,
  SearchOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  BookOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const TARGET_REVENUE = 100000000; // 100M VND Target

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

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  new: { label: 'Lead Mới', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' },
  warm: { label: 'Khai Thác', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  scheduled: { label: 'Hẹn Test', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' },
  tested: { label: 'Đã Test', color: '#ec4899', bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.25)' },
  converted: { label: 'Đã Chốt', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
  lost: { label: 'Từ Bỏ', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)' },
};

const FLOW = ['new', 'warm', 'scheduled', 'tested', 'converted'];

const TABS = [
  { id: 'all', label: '📋 Tệp Lead', desc: 'Toàn bộ lead Academy — Tick checkbox để chuyển trạng thái' },
  { id: 'new', label: '📩 Mới', desc: 'Lead mới từ Ads hoặc Pancake sync' },
  { id: 'warm', label: '🔥 Khai Thác', desc: 'Đã liên hệ/tư vấn, đang khai thác để mời test' },
  { id: 'scheduled', label: '📅 Hẹn Test', desc: 'Đã chốt lịch qua shop test tay nghề' },
  { id: 'tested', label: '✋ Đã Test', desc: 'Đã test tay nghề xong, đang chờ chốt đơn' },
  { id: 'converted', label: '✅ Đã Chốt', desc: 'Đã đóng cọc hoặc đóng full học phí' },
  { id: 'lost', label: '🚫 Từ Bỏ', desc: 'Lead đã từ bỏ hoặc không liên lạc được' },
  { id: 'calendar', label: '📆 Lịch Test', desc: 'Lịch hẹn test tay nghề của học viên theo tháng' },
];

const SAMPLE_SCRIPTS = [
  {
    title: '1. Kịch bản Khai thác Đầu Nhu cầu',
    text: 'Chào chị [Tên]! Em bên Wings Academy thấy chị quan tâm đến khóa học Nối mi. Chị đang tìm hiểu học để đổi nghề, mở salon hay kiếm thêm thu nhập ạ?',
  },
  {
    title: '2. Kịch bản Mời qua Test Tay nghề 1-1',
    text: 'Chị [Tên] ơi, cuối tuần này bên em có chương trình Khảo sát & Đánh giá năng khiếu nối mi 1-1 miễn phí cùng Master. Chị ghé qua 30p để cô test tay cầm nhíp và định hướng cho chị nhé!',
  },
  {
    title: '3. Kịch bản Chốt Cọc Giữ Ưu Đãi Cốp Đồ Nghề',
    text: 'Khoá học đợt này bên em tặng kèm Cốp đồ nghề hành nghề chuyên nghiệp trị giá 3.5M cho 3 bạn đăng ký đầu tiên. Chị cọc trước 1.000.000đ để giữ ưu đãi cốp nhé!',
  },
];

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
    return <Avatar src={lead.avatar_url.trim()} alt={name} size={32} className="shrink-0 font-bold" />;
  }

  return (
    <Avatar size={32} style={{ backgroundColor: bgStyle, color: '#fff' }} className="shrink-0 font-bold text-xs">
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

  // Quick inline add inputs
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickNotes, setQuickNotes] = useState('');

  // Drawer states
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [scriptDrawerOpen, setScriptDrawerOpen] = useState(false);
  const [colModalOpen, setColModalOpen] = useState(false);
  const [newFollowUpText, setNewFollowUpText] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);

  const [form] = Form.useForm();

  // Load leads from Supabase
  const loadLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const normalized = data.map((l: any) => ({
          ...l,
          revenue: Number(l.revenue) || 0,
          follow_ups: Array.isArray(l.follow_ups) ? l.follow_ups : [],
        }));
        setLeads(normalized);
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

  // Update lead status in Supabase & local state
  const handleStatusChange = async (leadId: string, currentStatus: string, targetStatus: string, checked: boolean) => {
    let newStatus = currentStatus;
    if (checked) {
      newStatus = targetStatus;
    } else {
      const idx = FLOW.indexOf(targetStatus);
      newStatus = idx > 0 ? FLOW[idx - 1] : 'new';
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
      message.success(`Đã chuyển trạng thái sang "${STATUS_META[newStatus]?.label || newStatus}"`);
    } catch (err: any) {
      message.error('Không thể cập nhật trạng thái: ' + err.message);
    }
  };

  // Quick inline lead add
  const handleQuickAdd = async () => {
    if (!quickName.trim()) {
      message.warning('Vui lòng nhập tên học viên!');
      return;
    }

    try {
      const newLead = {
        name: quickName.trim(),
        phone: quickPhone.trim(),
        notes: quickNotes.trim(),
        status: 'new',
        source: 'Manual Academy',
        course: 'Basic',
        goal: 'Chưa rõ',
        revenue: 0,
        follow_ups: [],
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('leads').insert([newLead]).select().single();
      if (error) throw error;

      if (data) {
        setLeads((prev) => [data, ...prev]);
        setQuickName('');
        setQuickPhone('');
        setQuickNotes('');
        message.success('Đã thêm lead mới thành công!');
      }
    } catch (err: any) {
      message.error('Lỗi khi thêm lead: ' + err.message);
    }
  };

  // Auto Merge duplicate leads
  const handleAutoMerge = async () => {
    message.loading({ content: 'Đang tìm kiếm và gộp lead trùng...', key: 'merge' });
    try {
      // Find duplicates by phone
      const phoneMap = new Map<string, Lead[]>();
      leads.forEach((l) => {
        if (l.phone && l.phone.trim()) {
          const norm = l.phone.replace(/\D/g, '');
          if (norm.length >= 8) {
            const arr = phoneMap.get(norm) || [];
            arr.push(l);
            phoneMap.set(norm, arr);
          }
        }
      });

      let mergedCount = 0;
      for (const [_, group] of phoneMap.entries()) {
        if (group.length > 1) {
          // Sort by created_at ascending
          group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          const master = group[0];
          const dups = group.slice(1);

          for (const dup of dups) {
            await supabase.from('leads').delete().eq('id', dup.id);
            mergedCount++;
          }
        }
      }

      if (mergedCount > 0) {
        message.success({ content: `Đã tự động gộp ${mergedCount} lead trùng lặp!`, key: 'merge' });
        loadLeads();
      } else {
        message.info({ content: 'Không tìm thấy lead trùng lặp nào.', key: 'merge' });
      }
    } catch (err: any) {
      message.error({ content: 'Lỗi gộp lead: ' + err.message, key: 'merge' });
    }
  };

  // Add Lead Modal submit
  const handleAddLead = async (values: any) => {
    try {
      const payload = {
        name: values.name,
        phone: values.phone || '',
        course: values.course || 'Basic',
        goal: values.goal || 'Chưa rõ',
        source: values.source || 'Manual Academy',
        revenue: Number(values.revenue) || 0,
        notes: values.notes || '',
        status: 'new',
        follow_ups: [],
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('leads').insert([payload]).select().single();
      if (error) throw error;

      if (data) {
        setLeads((prev) => [data, ...prev]);
        setAddModalVisible(false);
        form.resetFields();
        message.success('Đã tạo học viên mới!');
      }
    } catch (err: any) {
      message.error('Lỗi tạo lead: ' + err.message);
    }
  };

  // Calculate revenue & progress
  const totalRevenue = leads.filter((l) => l.status === 'converted').reduce((sum, l) => sum + (l.revenue || 0), 0);
  const revenuePct = Math.min(100, Math.round((totalRevenue / TARGET_REVENUE) * 1000) / 10);

  // Tab counts
  const getTabCount = (tabId: string) => {
    if (tabId === 'all') return leads.filter((l) => l.status !== 'lost').length;
    if (tabId === 'calendar') return leads.filter((l) => l.schedule_date).length;
    return leads.filter((l) => l.status === tabId).length;
  };

  // Filtered data for table
  const getFilteredData = () => {
    let list = [...leads];
    if (activeTab !== 'all') {
      if (activeTab === 'calendar') {
        list = list.filter((l) => l.schedule_date);
      } else {
        list = list.filter((l) => l.status === activeTab);
      }
    } else {
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
      width: 45,
      render: (_: any, __: any, index: number) => <span className="text-gray-400 font-mono text-xs">{index + 1}</span>,
    },
    {
      title: 'TÊN',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: Lead) => (
        <div className="flex items-center gap-2.5">
          {renderLeadAvatar(record)}
          <div className="flex flex-col min-w-0">
            <span
              className="font-bold text-xs text-gray-900 dark:text-gray-100 hover:text-[#b8941f] cursor-pointer truncate"
              onClick={() => setDetailLead(record)}
            >
              {text}
            </span>
            {record.phone && <span className="text-[11px] text-gray-500 font-mono">{record.phone}</span>}
          </div>
        </div>
      ),
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (phone: string) =>
        phone ? (
          <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{phone}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      title: 'KHÓA HỌC',
      dataIndex: 'course',
      key: 'course',
      width: 130,
      render: (c: string) =>
        c ? (
          <Tag color={COURSE_COLOR_MAP[c] || 'gold'} className="font-semibold text-[11px] px-2 py-0.5">
            {COURSE_MAP[c] || c}
          </Tag>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      title: 'MỤC TIÊU',
      dataIndex: 'goal',
      key: 'goal',
      width: 130,
      render: (g: string) => <span className="text-xs text-gray-600 dark:text-gray-300">{g || '—'}</span>,
    },
    // 5 Stage Checkboxes
    {
      title: <span className="text-[#3b82f6] text-[11px]">LEAD MỚI</span>,
      key: 'ck_new',
      align: 'center' as const,
      width: 85,
      render: (_: any, record: Lead) => (
        <input
          type="checkbox"
          checked={FLOW.indexOf(record.status) >= 0}
          onChange={(e) => handleStatusChange(record.id, record.status, 'new', e.target.checked)}
          className="w-4 h-4 accent-[#3b82f6] cursor-pointer"
        />
      ),
    },
    {
      title: <span className="text-[#f59e0b] text-[11px]">KHAI THÁC</span>,
      key: 'ck_warm',
      align: 'center' as const,
      width: 85,
      render: (_: any, record: Lead) => (
        <input
          type="checkbox"
          checked={FLOW.indexOf(record.status) >= 1}
          onChange={(e) => handleStatusChange(record.id, record.status, 'warm', e.target.checked)}
          className="w-4 h-4 accent-[#f59e0b] cursor-pointer"
        />
      ),
    },
    {
      title: <span className="text-[#8b5cf6] text-[11px]">HẸN TEST</span>,
      key: 'ck_scheduled',
      align: 'center' as const,
      width: 85,
      render: (_: any, record: Lead) => (
        <input
          type="checkbox"
          checked={FLOW.indexOf(record.status) >= 2}
          onChange={(e) => handleStatusChange(record.id, record.status, 'scheduled', e.target.checked)}
          className="w-4 h-4 accent-[#8b5cf6] cursor-pointer"
        />
      ),
    },
    {
      title: <span className="text-[#ec4899] text-[11px]">ĐÃ TEST</span>,
      key: 'ck_tested',
      align: 'center' as const,
      width: 85,
      render: (_: any, record: Lead) => (
        <input
          type="checkbox"
          checked={FLOW.indexOf(record.status) >= 3}
          onChange={(e) => handleStatusChange(record.id, record.status, 'tested', e.target.checked)}
          className="w-4 h-4 accent-[#ec4899] cursor-pointer"
        />
      ),
    },
    {
      title: <span className="text-[#10b981] text-[11px]">ĐÃ CHỐT</span>,
      key: 'ck_converted',
      align: 'center' as const,
      width: 85,
      render: (_: any, record: Lead) => (
        <input
          type="checkbox"
          checked={FLOW.indexOf(record.status) >= 4}
          onChange={(e) => handleStatusChange(record.id, record.status, 'converted', e.target.checked)}
          className="w-4 h-4 accent-[#10b981] cursor-pointer"
        />
      ),
    },
    {
      title: 'TRANG THÁI',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (st: string) => {
        const meta = STATUS_META[st] || {
          label: st,
          color: '#6b7280',
          bg: 'rgba(107,114,128,0.1)',
          border: 'transparent',
        };
        return (
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-block"
            style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}
          >
            {meta.label}
          </span>
        );
      },
    },
    {
      title: 'DOANH THU',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 110,
      render: (rev: number) =>
        rev > 0 ? (
          <span className="font-bold text-emerald-600 text-xs font-mono">
            {new Intl.NumberFormat('vi-VN').format(rev)}đ
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      title: 'GHI CHÚ',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (text: string) => (
        <span className="text-xs text-gray-500 dark:text-gray-400 italic">{text || 'Nhập ghi chú...'}</span>
      ),
    },
    {
      title: 'TÁC VỤ',
      key: 'actions',
      align: 'right' as const,
      width: 140,
      render: (_: any, record: Lead) => (
        <Space size={4}>
          <Button
            size="small"
            style={{
              backgroundColor: 'rgba(139,92,246,0.08)',
              color: '#8b5cf6',
              borderColor: 'rgba(139,92,246,0.3)',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 6,
            }}
            onClick={() => setDetailLead(record)}
          >
            ✨ Tổ chức
          </Button>
          <Button
            size="small"
            style={{
              backgroundColor: 'rgba(184,148,31,0.08)',
              color: '#b8941f',
              borderColor: 'rgba(184,148,31,0.3)',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 6,
            }}
            onClick={() => setDetailLead(record)}
          >
            Tư vấn
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full p-4 relative min-h-screen">
      {/* Floating Green Drawer Button on Right Edge */}
      <div
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-1.5 rounded-l-md shadow-lg flex flex-col items-center gap-1 transition-all"
        onClick={() => setScriptDrawerOpen(true)}
        title="Mở Kịch Bản Mẫu Tư Vấn Sales"
        style={{ writingMode: 'vertical-rl' }}
      >
        <BookOutlined className="text-sm mb-1" />
        <span>KỊCH BẢN MẪU</span>
      </div>

      {/* Title Header */}
      <div>
        <h1 className="text-xl font-extrabold text-heading tracking-tight flex items-center gap-2">
          📋 Wings Lead Manager
        </h1>
        <p className="text-xs text-secondary mt-0.5">Quản lý pipeline Academy — Khai thác, Hẹn test, Chốt đơn</p>
      </div>

      {/* Gold Capsule Progress Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#1e293b] border border-gold/30 rounded-xl p-3.5 shadow-sm">
        {/* Logo Left */}
        <div className="flex items-center gap-2 font-black text-[#b8941f] text-base tracking-tight shrink-0">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span>Wings Lead Manager</span>
        </div>

        {/* Capsule Progress Center */}
        <div className="flex items-center gap-3 flex-1 max-w-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-full px-4 py-1.5">
          <span className="text-xs font-bold text-heading whitespace-nowrap">
            {new Intl.NumberFormat('vi-VN').format(totalRevenue)}đ{' '}
            <span className="text-gray-400 font-normal">/ 100M</span>
          </span>
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#b8941f] to-[#d4af37] transition-all duration-500 rounded-full"
              style={{ width: `${revenuePct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[#b8941f] whitespace-nowrap">{revenuePct}%</span>
        </div>

        {/* Buttons Right */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="middle"
            icon={<SettingOutlined />}
            onClick={() => setColModalOpen(true)}
            className="font-bold text-xs"
          >
            ⚙️ Cột
          </Button>
          <Button
            size="middle"
            icon={<ThunderboltOutlined />}
            onClick={handleAutoMerge}
            className="font-bold text-xs text-[#b8941f] border-[#b8941f]/40 bg-[#b8941f]/10"
          >
            ⚡ Gộp Lead trùng
          </Button>
          <Button
            size="middle"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddModalVisible(true)}
            className="font-bold text-xs bg-[#b8941f] border-[#b8941f] text-white hover:bg-[#a3821a]"
          >
            + Thêm Lead
          </Button>
        </div>
      </div>

      {/* Pill Sub-tabs Navigation with Live Counts */}
      <div className="flex items-center gap-2 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-xl p-1.5 overflow-x-auto shadow-sm">
        {TABS.map((t) => {
          const count = getTabCount(t.id);
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#b8941f] text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Subheader Notice */}
      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium px-1">
        {TABS.find((t) => t.id === activeTab)?.desc || 'Quản lý pipeline lead Academy'}
      </div>

      {/* Main Table Card with Inline Quick Add Header */}
      <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        {/* Quick Add Row */}
        <div className="p-3 bg-gold/5 dark:bg-gold/10 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-3">
          <span className="text-[#b8941f] font-black text-sm">⚡</span>
          <Input
            placeholder="+ Nhập tên học viên mới"
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            className="w-48 text-xs font-semibold"
            size="small"
          />
          <Input
            placeholder="SĐT / Zalo..."
            value={quickPhone}
            onChange={(e) => setQuickPhone(e.target.value)}
            className="w-36 text-xs"
            size="small"
          />
          <span className="text-[11px] text-gray-400 italic flex-1 hidden md:inline">
            Chuyển trạng thái bằng checkbox sau khi tạo
          </span>
          <Input
            placeholder="Ghi chú..."
            value={quickNotes}
            onChange={(e) => setQuickNotes(e.target.value)}
            className="w-48 text-xs"
            size="small"
          />
          <Button
            size="small"
            type="primary"
            onClick={handleQuickAdd}
            className="bg-[#b8941f] border-[#b8941f] text-white font-bold text-xs"
          >
            + Thêm
          </Button>
        </div>

        {/* Ant Design Table */}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={getFilteredData()}
          loading={loading}
          pagination={{ pageSize: 30, showSizeChanger: true, showTotal: (total) => `Tổng ${total} lead` }}
          className="custom-table"
          size="middle"
          scroll={{ x: 1250 }}
        />
      </div>

      {/* Drawer: KỊCH BẢN MẪU (Sample Sales Scripts) */}
      <Drawer
        title="📚 Kịch Bản Mẫu Sales & Tư Vấn Academy"
        placement="right"
        width={420}
        onClose={() => setScriptDrawerOpen(false)}
        open={scriptDrawerOpen}
      >
        <div className="flex flex-col gap-4">
          {SAMPLE_SCRIPTS.map((script, idx) => (
            <div
              key={idx}
              className="p-3.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#b8941f]">{script.title}</span>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard.writeText(script.text);
                    message.success('Đã copy kịch bản!');
                  }}
                  className="text-[11px] font-bold text-[#b8941f] border-[#b8941f]/30"
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {script.text}
              </p>
            </div>
          ))}
        </div>
      </Drawer>

      {/* Drawer: Detail Lead View */}
      <Drawer
        title={detailLead ? `Chi tiết học viên: ${detailLead.name}` : ''}
        placement="right"
        width={500}
        onClose={() => setDetailLead(null)}
        open={!!detailLead}
      >
        {detailLead && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              {renderLeadAvatar(detailLead)}
              <div className="flex flex-col">
                <span className="font-bold text-base text-heading">{detailLead.name}</span>
                <span className="text-xs font-mono text-secondary">{detailLead.phone || 'Chưa có SĐT'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 border rounded-lg">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Khóa học</span>
                <span className="font-bold text-heading">
                  {COURSE_MAP[detailLead.course] || detailLead.course || '—'}
                </span>
              </div>
              <div className="p-2.5 border rounded-lg">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Mục tiêu</span>
                <span className="font-bold text-heading">{detailLead.goal || '—'}</span>
              </div>
              <div className="p-2.5 border rounded-lg">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Trạng thái</span>
                <span className="font-bold text-heading">
                  {STATUS_META[detailLead.status]?.label || detailLead.status}
                </span>
              </div>
              <div className="p-2.5 border rounded-lg">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Doanh thu cọc</span>
                <span className="font-bold text-emerald-600">
                  {detailLead.revenue ? `${new Intl.NumberFormat('vi-VN').format(detailLead.revenue)}đ` : '0đ'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-heading">Ghi chú chi tiết:</span>
              <p className="text-xs text-gray-600 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg whitespace-pre-wrap">
                {detailLead.notes || 'Không có ghi chú nào.'}
              </p>
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
          <Form.Item name="notes" label="Ghi chú chi tiết">
            <Input.TextArea placeholder="Ghi lại nhu cầu cụ thể của học viên..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

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
  message,
  Drawer,
  Space,
  Avatar,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  CopyOutlined,
  EditOutlined,
  SearchOutlined,
  BookOutlined,
  UnorderedListOutlined,
  MailOutlined,
  FireOutlined,
  CalendarOutlined,
  FormOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  StopOutlined,
  ScheduleOutlined,
  EyeOutlined,
  RocketOutlined,
  LeftOutlined,
  RightOutlined,
  RedoOutlined,
  UserOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const TARGET_REVENUE = 100000000; // 100M VND Target

const COURSE_MAP: Record<string, string> = {
  Combo: 'Combo Pro (19.9M)',
  Basic: 'Nền Tảng (1.9M)',
  Advanced: 'Tinh Hoa (9.9M)',
  Volume: 'Volume (9.9M)',
  Design: 'Thiết Kế (9.9M)',
  'Nền Tảng (1.9M)': 'Nền Tảng (1.9M)',
  'Tinh Hoa (9.9M)': 'Tinh Hoa (9.9M)',
  'Volume (9.9M)': 'Volume (9.9M)',
  'Thiết Kế (9.9M)': 'Thiết Kế (9.9M)',
  'Combo Pro (19.9M)': 'Combo Pro (19.9M)',
};

const COURSE_COLOR_MAP: Record<string, string> = {
  Combo: 'gold',
  Basic: 'blue',
  Advanced: 'purple',
  Volume: 'magenta',
  Design: 'cyan',
  'Nền Tảng (1.9M)': 'blue',
  'Tinh Hoa (9.9M)': 'purple',
  'Volume (9.9M)': 'magenta',
  'Thiết Kế (9.9M)': 'cyan',
  'Combo Pro (19.9M)': 'gold',
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> =
  {
    new: {
      label: 'Lead Mới',
      color: '#1d4ed8',
      bg: 'rgba(29,78,216,0.12)',
      border: 'rgba(29,78,216,0.4)',
      icon: <MailOutlined />,
    },
    warm: {
      label: 'Khai Thác',
      color: '#b45309',
      bg: 'rgba(180,83,9,0.12)',
      border: 'rgba(180,83,9,0.4)',
      icon: <FireOutlined />,
    },
    scheduled: {
      label: 'Hẹn Test',
      color: '#6d28d9',
      bg: 'rgba(109,40,217,0.12)',
      border: 'rgba(109,40,217,0.4)',
      icon: <CalendarOutlined />,
    },
    tested: {
      label: 'Đã Test',
      color: '#be185d',
      bg: 'rgba(190,24,93,0.12)',
      border: 'rgba(190,24,93,0.4)',
      icon: <FormOutlined />,
    },
    converted: {
      label: 'Đã Chốt',
      color: '#047857',
      bg: 'rgba(4,120,87,0.12)',
      border: 'rgba(4,120,87,0.4)',
      icon: <CheckCircleOutlined />,
    },
    lost: {
      label: 'Từ Bỏ',
      color: '#374151',
      bg: 'rgba(55,65,81,0.12)',
      border: 'rgba(55,65,81,0.4)',
      icon: <StopOutlined />,
    },
  };

const FLOW = ['new', 'warm', 'scheduled', 'tested', 'converted'];

const TABS = [
  {
    id: 'all',
    label: '📋 Tệp Lead',
    icon: <UnorderedListOutlined />,
    desc: 'Toàn bộ lead — Tick checkbox để chuyển trạng thái',
  },
  {
    id: 'warm',
    label: '🔥 Khai Thác',
    icon: <FireOutlined />,
    color: '#d97706',
    desc: 'Đã biết mục tiêu, đang khai thác để mời test',
  },
  {
    id: 'scheduled',
    label: '📅 Hẹn Test',
    icon: <CalendarOutlined />,
    color: '#7c3aed',
    desc: 'Đã chốt lịch qua shop test tay nghề',
  },
  {
    id: 'tested',
    label: '✋ Đã Test',
    icon: <FormOutlined />,
    color: '#db2777',
    desc: 'Đã test xong, đang chờ chốt đơn',
  },
  { id: 'converted', label: '✅ Đã Chốt', icon: <TrophyOutlined />, color: '#059669', desc: 'Đã đóng cọc / học phí' },
  {
    id: 'lost',
    label: '🚫 Từ Bỏ',
    icon: <StopOutlined />,
    color: '#4b5563',
    desc: 'Lead đã từ bỏ hoặc không liên lạc được',
  },
  {
    id: 'calendar',
    label: '📆 Lịch Test',
    icon: <ScheduleOutlined />,
    color: '#0891b2',
    desc: 'Lịch hẹn test theo tháng',
  },
];

interface FollowUp {
  date: string;
  text: string;
}

interface ScheduleHistory {
  date: string;
  time?: string;
  status: 'tested' | 'noShow';
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  course: string;
  status: string;
  goal: string;
  source: string;
  flight?: string;
  schedule?: string;
  scheduleTime?: string;
  revenue: number;
  notes: string;
  noShow?: boolean;
  scheduleHistory?: ScheduleHistory[];
  followUps?: FollowUp[];
  created_at?: string;
}

// Helpers
function todayStr() {
  return dayjs().format('YYYY-MM-DD');
}

function fmtDate(d?: string) {
  if (!d) return '';
  return dayjs(d).format('DD/MM');
}

function daysTo(d?: string) {
  if (!d) return 999;
  const target = dayjs(d).startOf('day');
  const now = dayjs().startOf('day');
  return target.diff(now, 'day');
}

function fmtMoney(n: number) {
  if (!n || n <= 0) return '0đ';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toString() + 'đ';
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

  return (
    <Avatar size={30} style={{ backgroundColor: bgStyle, color: '#fff' }} className="shrink-0 font-bold text-xs">
      {initials}
    </Avatar>
  );
}

// Sales script generator per lead status
function genScripts(l: Lead) {
  const fn = (l.name || '').trim().split(' ').pop() || 'chị';
  const sc: { icon: string; title: string; text: string }[] = [];

  if (l.status === 'new') {
    sc.push({
      icon: '💬',
      title: 'Chat khai thác lần đầu',
      text: `Chào chị ${fn}! 🌟 Để em tư vấn lộ trình phù hợp nhất, chị cho em hỏi mình đã học qua nối mi lần nào chưa ạ?`,
    });
    sc.push({
      icon: '🔄',
      title: 'Follow-up nếu im (4 tiếng)',
      text: `Chị ${fn} ơi, mình còn đó không ạ? 😊 Chị cứ nhắn em, em hướng dẫn nhanh nhé!`,
    });
    sc.push({
      icon: '📸',
      title: 'Follow-up nếu im (24 tiếng)',
      text: `Lớp thực hành sáng nay vui lắm nè chị ${fn} ơi! Chị có muốn em xếp lịch qua test tay thử không ạ? Free luôn nha 💕`,
    });
  }
  if (l.status === 'warm') {
    sc.push({
      icon: '📖',
      title: 'Gửi câu chuyện thành công',
      text: `Chị ${fn} ơi, bạn học viên bên em ban đầu cũng lo tay yếu, giờ ra nghề nhận khách tự tin luôn á! 💪\n\n[Gửi kèm ảnh sản phẩm HV]`,
    });
    sc.push({
      icon: '📅',
      title: 'Mời test tay nghề 1-1',
      text: `Bên em có buổi test tay miễn phí — 30 phút thôi, giảng viên kèm 1-1. Chiều nay hay sáng mai chị rảnh ạ? 🥰`,
    });
    sc.push({
      icon: '⏰',
      title: 'Tạo urgency suất test',
      text: `Chị ${fn} ơi, slot test miễn phí tuần này chỉ còn 2 chỗ. Em giữ cho mình không ạ? 🥺`,
    });
  }
  if (l.status === 'scheduled') {
    sc.push({
      icon: '🌙',
      title: 'Nhắc lịch tối hôm trước',
      text: `Chị ${fn} ơi, mai em hẹn gặp chị ở 159A Đề Thám nha. Giảng viên chuẩn bị sẵn rồi ạ 🥰`,
    });
    sc.push({
      icon: '☀️',
      title: 'Nhắc trước 2 tiếng',
      text: `Chị ${fn} ơi, em chuẩn bị nước mát chờ chị rồi nè. Chị đi đường cẩn thận nha! 💕`,
    });
    sc.push({
      icon: '🔄',
      title: 'Nếu cancel / bùng hẹn',
      text: `Dạ không sao chị ${fn} ơi! Để em dời sang mai hay Thứ 7 nha? Em sợ hết slot free á 😅`,
    });
  }
  if (l.status === 'tested') {
    sc.push({
      icon: '📞',
      title: 'Gọi hỏi thăm sau test',
      text: `Alo chị ${fn} ơi! Em bên Wings nè. Chị thấy buổi test hôm đó sao ạ? Cầm nhíp có khó không?\n\n→ Lắng nghe → Khen → Mời đăng ký`,
    });
    sc.push({
      icon: '💬',
      title: 'Zalo gửi lộ trình ưu đãi',
      text: `Em gửi lại chị ${fn} thông tin ưu đãi nha. Chỉ áp dụng đến hết tuần thôi nè chị ❤️`,
    });
    sc.push({
      icon: '💚',
      title: 'Nếu nói "Không phù hợp"',
      text: `Dạ em hiểu chị ${fn} 😊 Thực ra 100% HV ngày đầu ai cũng run tay mỏi mắt. Nối mi là kỹ thuật, không phải năng khiếu bẩm sinh. 2-3 buổi là tay vững ngay. Chị cứ suy nghĩ, khi nào muốn cứ nhắn em ❤️`,
    });
  }
  if (l.status === 'converted') {
    sc.push({
      icon: '🧾',
      title: 'Xác nhận cọc',
      text: `Wings xác nhận nhận ${l.revenue > 0 ? fmtMoney(l.revenue) : '[Số tiền]'} giữ ưu đãi khoá học chị ${fn} ạ 🥰`,
    });
    sc.push({
      icon: '📚',
      title: 'Gửi tài liệu đọc trước',
      text: `Chị ${fn} ơi, chị xem trước video phân biệt dáng mắt cơ bản này nha, để lên lớp bắt nhịp nhanh!\n\n[Gửi link]`,
    });
  }
  if (l.flight && daysTo(l.flight) <= 14 && daysTo(l.flight) >= 0) {
    sc.unshift({
      icon: '🛫',
      title: `GẤP — Còn ${daysTo(l.flight)} ngày trước bay`,
      text: `Chị ${fn} ơi, tới ${fmtDate(l.flight)} bay là chỉ còn ${daysTo(l.flight)} ngày. Bên đó thợ nối mi kiếm 80-150 USD/bộ 🤩 Khoá Nền Tảng 6 buổi, tranh thủ trước khi bay! Hôm nay chị rảnh lúc nào? 🔥`,
    });
  }
  return sc;
}

export default function LeadManagerPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Calendar State
  const [calYear, setCalYear] = useState<number>(dayjs().year());
  const [calMonth, setCalMonth] = useState<number>(dayjs().month());

  // Drawer / Modal states
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [newFollowUpText, setNewFollowUpText] = useState('');
  const [expandedScriptIdx, setExpandedScriptIdx] = useState<number | null>(null);

  const [form] = Form.useForm();

  // Load leads from Supabase
  const loadLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const normalized: Lead[] = data.map((l: any) => ({
          id: l.id,
          name: l.name,
          phone: l.phone || '',
          course: l.course || '',
          status: l.status || 'new',
          goal: l.goal || '',
          source: l.source || 'Facebook Ads',
          flight: l.flight_date || l.flight || '',
          schedule: l.schedule_date || l.schedule || '',
          scheduleTime: l.schedule_time || l.scheduleTime || '',
          revenue: Number(l.revenue) || 0,
          notes: l.notes || '',
          noShow: l.no_show || l.noShow || false,
          scheduleHistory: Array.isArray(l.schedule_history) ? l.schedule_history : [],
          followUps: Array.isArray(l.follow_ups) ? l.follow_ups : [],
          created_at: l.created_at,
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

  // Inline update helper
  const handleInlineUpdate = async (leadId: string, field: string, value: any) => {
    try {
      const dbFieldMap: Record<string, string> = {
        flight: 'flight_date',
        schedule: 'schedule_date',
        scheduleTime: 'schedule_time',
        noShow: 'no_show',
        followUps: 'follow_ups',
      };
      const dbKey = dbFieldMap[field] || field;

      const { error } = await supabase
        .from('leads')
        .update({ [dbKey]: value, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, [field]: value } : l)));
      message.success('Đã cập nhật!');
    } catch (err: any) {
      message.error('Lỗi cập nhật: ' + err.message);
    }
  };

  // Status Change via Stage Checkbox
  const handleStatusChange = async (leadId: string, targetStatus: string, checked: boolean) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    let newStatus = targetStatus;
    if (!checked) {
      const idx = FLOW.indexOf(targetStatus);
      newStatus = idx > 0 ? FLOW[idx - 1] : 'new';
    }

    const updatedFollowUps = [
      ...(lead.followUps || []),
      { date: todayStr(), text: `Chuyển → ${STATUS_META[newStatus]?.label || newStatus}` },
    ];

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          follow_ups: updatedFollowUps,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus, followUps: updatedFollowUps } : l))
      );
      message.success(`✅ ${lead.name} → ${STATUS_META[newStatus]?.label || newStatus}`);
    } catch (err: any) {
      message.error('Không thể cập nhật trạng thái: ' + err.message);
    }
  };

  // Mark Tested (Đã test)
  const handleMarkTested = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const newHistory = [...(lead.scheduleHistory || [])];
    if (lead.schedule) {
      newHistory.push({ date: lead.schedule, time: lead.scheduleTime, status: 'tested' });
    }

    const updatedFollowUps = [...(lead.followUps || []), { date: todayStr(), text: 'Đã đến test tay nghề' }];

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status: 'tested',
          no_show: false,
          schedule_history: newHistory,
          follow_ups: updatedFollowUps,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, status: 'tested', noShow: false, scheduleHistory: newHistory, followUps: updatedFollowUps }
            : l
        )
      );
      message.success(`✋ ${lead.name} → Đã Test`);
    } catch (err: any) {
      message.error('Lỗi khi đánh dấu Đã Test: ' + err.message);
    }
  };

  // Mark No-Show (Không đến)
  const handleMarkNoShow = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const newHistory = [...(lead.scheduleHistory || [])];
    if (lead.schedule) {
      newHistory.push({ date: lead.schedule, time: lead.scheduleTime, status: 'noShow' });
    }

    const updatedFollowUps = [...(lead.followUps || []), { date: todayStr(), text: '❌ Không đến test' }];

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          schedule_date: '',
          schedule_time: '',
          no_show: true,
          schedule_history: newHistory,
          follow_ups: updatedFollowUps,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                schedule: '',
                scheduleTime: '',
                noShow: true,
                scheduleHistory: newHistory,
                followUps: updatedFollowUps,
              }
            : l
        )
      );
      message.warning(`❌ ${lead.name} — Không đến, đã chuyển follow-up`);
    } catch (err: any) {
      message.error('Lỗi khi đánh dấu Không Đến: ' + err.message);
    }
  };

  // Reschedule date
  const handleReschedule = async (leadId: string, newDate: string) => {
    if (!newDate) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const updatedFollowUps = [
      ...(lead.followUps || []),
      { date: todayStr(), text: `Hẹn lại ngày ${fmtDate(newDate)}` },
    ];

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          schedule_date: newDate,
          schedule_time: '',
          no_show: false,
          status: 'scheduled',
          follow_ups: updatedFollowUps,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                schedule: newDate,
                scheduleTime: '',
                noShow: false,
                status: 'scheduled',
                followUps: updatedFollowUps,
              }
            : l
        )
      );
      message.success(`📅 ${lead.name} → Hẹn lại ngày ${fmtDate(newDate)}`);
    } catch (err: any) {
      message.error('Lỗi dời lịch: ' + err.message);
    }
  };

  // Copy No-Show Rebooking Script
  const copyNoShowScript = (lead: Lead) => {
    const fn = (lead.name || '').trim().split(' ').pop() || 'chị';
    const msg = `Dạ không sao chị ${fn} ơi! Bận việc đột xuất là bình thường nè. Để em dời slot cho mình sang Thứ 5 hay Thứ 7 nha chị? Để lâu em sợ hết chương trình free á chị 😅`;
    navigator.clipboard.writeText(msg);
    message.success('✅ Đã copy tin nhắn hẹn lại!');
  };

  // Add Follow-up Log
  const handleAddFollowUp = async (leadId: string) => {
    if (!newFollowUpText.trim()) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const updatedFollowUps = [...(lead.followUps || []), { date: todayStr(), text: newFollowUpText.trim() }];

    try {
      const { error } = await supabase
        .from('leads')
        .update({ follow_ups: updatedFollowUps, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, followUps: updatedFollowUps } : l)));
      setDetailLead((prev) => (prev ? { ...prev, followUps: updatedFollowUps } : null));
      setNewFollowUpText('');
      message.success('Đã lưu ghi chú!');
    } catch (err: any) {
      message.error('Lỗi lưu ghi chú: ' + err.message);
    }
  };

  // Add/Edit Lead Submit
  const handleSaveLead = async (values: any) => {
    try {
      if (editingLeadId) {
        const updatePayload = {
          name: values.name.trim(),
          phone: values.phone || '',
          course: values.course || '',
          goal: values.goal || '',
          source: values.source || 'Facebook Ads',
          revenue: Number(values.revenue) || 0,
          schedule_date: values.schedule ? dayjs(values.schedule).format('YYYY-MM-DD') : '',
          flight_date: values.flight ? dayjs(values.flight).format('YYYY-MM-DD') : '',
          notes: values.notes || '',
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('leads').update(updatePayload).eq('id', editingLeadId);
        if (error) throw error;
        setLeads((prev) =>
          prev.map((l) =>
            l.id === editingLeadId
              ? {
                  ...l,
                  ...updatePayload,
                  schedule: updatePayload.schedule_date,
                  flight: updatePayload.flight_date,
                }
              : l
          )
        );
        message.success('Đã cập nhật thông tin học viên!');
      } else {
        const createPayload = {
          name: values.name.trim(),
          phone: values.phone || '',
          course: values.course || '',
          goal: values.goal || '',
          source: values.source || 'Facebook Ads',
          revenue: Number(values.revenue) || 0,
          schedule_date: values.schedule ? dayjs(values.schedule).format('YYYY-MM-DD') : '',
          flight_date: values.flight ? dayjs(values.flight).format('YYYY-MM-DD') : '',
          notes: values.notes || '',
          status: 'new',
          follow_ups: [{ date: todayStr(), text: 'Tạo lead mới' }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase.from('leads').insert([createPayload]).select().single();
        if (error) throw error;

        if (data) {
          const normData: Lead = {
            id: data.id,
            name: data.name,
            phone: data.phone || '',
            course: data.course || '',
            status: data.status || 'new',
            goal: data.goal || '',
            source: data.source || 'Facebook Ads',
            flight: data.flight_date || '',
            schedule: data.schedule_date || '',
            revenue: Number(data.revenue) || 0,
            notes: data.notes || '',
            followUps: data.follow_ups || [],
          };
          setLeads((prev) => [normData, ...prev]);
          message.success('Đã thêm lead mới!');
        }
      }

      setAddModalVisible(false);
      setEditingLeadId(null);
      form.resetFields();
    } catch (err: any) {
      message.error('Lỗi khi lưu lead: ' + err.message);
    }
  };

  // Open Edit Modal
  const openEditModal = (lead: Lead) => {
    setEditingLeadId(lead.id);
    form.setFieldsValue({
      name: lead.name,
      phone: lead.phone,
      course: lead.course,
      goal: lead.goal,
      source: lead.source || 'Facebook Ads',
      revenue: lead.revenue,
      schedule: lead.schedule ? dayjs(lead.schedule) : null,
      flight: lead.flight ? dayjs(lead.flight) : null,
      notes: lead.notes,
    });
    setAddModalVisible(true);
  };

  // Calculate Revenue
  const totalRevenue = leads.filter((l) => l.status === 'converted').reduce((sum, l) => sum + (l.revenue || 0), 0);
  const revenuePct = Math.min(100, Math.round((totalRevenue / TARGET_REVENUE) * 1000) / 10);

  // Tab counts
  const getTabCount = (tabId: string) => {
    if (tabId === 'all') return leads.length;
    if (tabId === 'lost') return leads.filter((l) => l.status === 'lost').length;
    if (tabId === 'calendar') return leads.filter((l) => l.schedule).length;
    return leads.filter((l) => l.status === tabId).length;
  };

  // Filtered Leads
  const getFilteredLeads = () => {
    let list = [...leads];
    if (activeTab !== 'all') {
      if (activeTab === 'calendar') {
        list = list.filter((l) => l.schedule);
      } else {
        list = list.filter((l) => l.status === activeTab);
      }
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

    // Sort: Urgent flight first
    list.sort((a, b) => {
      const au = a.flight && daysTo(a.flight) <= 14 && daysTo(a.flight) >= 0;
      const bu = b.flight && daysTo(b.flight) <= 14 && daysTo(b.flight) >= 0;
      if (au && !bu) return -1;
      if (!au && bu) return 1;
      return a.name.localeCompare(b.name);
    });

    return list;
  };

  // Table Columns Setup
  const isAll = activeTab === 'all';
  const isSched = activeTab === 'scheduled';
  const isLost = activeTab === 'lost';

  const columns: any[] = [
    {
      title: '#',
      key: 'index',
      width: 40,
      render: (_: any, __: any, index: number) => (
        <span className="text-gray-400 font-mono text-xs tabular-nums">{index + 1}</span>
      ),
    },
    {
      title: 'TÊN HỌC VIÊN',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: Lead) => {
        const flightDays = record.flight ? daysTo(record.flight) : 999;
        const isUrgentFlight = flightDays >= 0 && flightDays <= 14;
        const isPhoneOnlyName = /^\d{9,11}$/.test((text || '').trim());
        const displayName = isPhoneOnlyName ? `Học viên ${text}` : text || 'Chưa có tên';

        return (
          <div className="flex items-center gap-2.5">
            {renderLeadAvatar(record)}
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="td-student-name cursor-pointer truncate hover:text-[#b8941f]"
                onClick={() => setDetailLead(record)}
              >
                {displayName}
              </span>
              {isUrgentFlight && (
                <Tag color="red" className="text-[10px] px-1 py-0 font-bold border-red-300">
                  🛫 {flightDays}d
                </Tag>
              )}
              {isSched && record.noShow && (
                <Tag color="volcano" className="text-[10px] px-1 py-0 font-bold">
                  Bùng
                </Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'SĐT / ZALO',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (phone: string, record: Lead) => {
        const phoneVal = phone || (record.name && /^\d{9,11}$/.test(record.name.trim()) ? record.name.trim() : '');
        return phoneVal ? (
          <Tooltip title="Nhấp để sao chép số điện thoại">
            <span
              className="td-phone-num font-mono tabular-nums cursor-pointer hover:underline flex items-center gap-1"
              onClick={() => {
                navigator.clipboard.writeText(phoneVal);
                message.success('Đã sao chép SĐT!');
              }}
            >
              {phoneVal}
              <CopyOutlined className="text-[10px] text-gray-500 opacity-80 hover:opacity-100" />
            </span>
          </Tooltip>
        ) : (
          <span className="text-[#a0a0ad] font-mono">—</span>
        );
      },
    },
    {
      title: 'KHÓA HỌC',
      dataIndex: 'course',
      key: 'course',
      width: 140,
      render: (c: string, record: Lead) => (
        <Select
          defaultValue={c || ''}
          size="small"
          bordered={false}
          className="text-xs font-semibold text-[#b8941f]"
          onChange={(val) => handleInlineUpdate(record.id, 'course', val)}
        >
          <Select.Option value="">— Chưa chọn —</Select.Option>
          <Select.Option value="Nền Tảng (1.9M)">Nền Tảng (1.9M)</Select.Option>
          <Select.Option value="Tinh Hoa (9.9M)">Tinh Hoa (9.9M)</Select.Option>
          <Select.Option value="Volume (9.9M)">Volume (9.9M)</Select.Option>
          <Select.Option value="Thiết Kế (9.9M)">Thiết Kế (9.9M)</Select.Option>
          <Select.Option value="Combo Pro (19.9M)">Combo Pro (19.9M)</Select.Option>
        </Select>
      ),
    },
    {
      title: 'MỤC TIÊU',
      dataIndex: 'goal',
      key: 'goal',
      width: 130,
      render: (g: string) => <span className="td-student-goal">{g || '—'}</span>,
    },
  ];

  // Specific Columns for Scheduled Tab
  if (isSched) {
    columns.push({
      title: '📅 NGÀY & GIỜ HẸN TEST',
      key: 'schedule_datetime',
      width: 220,
      render: (_: any, record: Lead) => {
        const dLeft = record.schedule ? daysTo(record.schedule) : null;
        let dateHint = '';
        if (dLeft !== null) {
          if (dLeft === 0) dateHint = ' (Hôm nay!)';
          else if (dLeft === 1) dateHint = ' (Ngày mai)';
          else if (dLeft > 1) dateHint = ` (Còn ${dLeft} ngày)`;
          else dateHint = ` (Đã qua ${Math.abs(dLeft)} ngày)`;
        }

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <input
              type="date"
              value={record.schedule || ''}
              onChange={(e) => handleInlineUpdate(record.id, 'schedule', e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 text-xs font-mono bg-gray-50 dark:bg-gray-800 text-purple-600 font-semibold cursor-pointer outline-none"
            />
            <input
              type="time"
              value={record.scheduleTime || ''}
              onChange={(e) => handleInlineUpdate(record.id, 'scheduleTime', e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 text-xs font-mono bg-gray-50 dark:bg-gray-800 text-purple-600 font-semibold cursor-pointer outline-none w-20"
            />
            <span
              className={`text-[11px] font-bold ${
                dLeft === 0 ? 'text-[#b8941f]' : dLeft && dLeft < 0 ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              {dateHint}
            </span>
          </div>
        );
      },
    });
  }

  // 5 Stage Checkbox Columns for "All" tab
  if (isAll) {
    const stageCols = [
      { key: 'new', label: '📩 Lead', color: '#1d4ed8' },
      { key: 'warm', label: '🔥 Khai Thác', color: '#b45309' },
      { key: 'scheduled', label: '📅 Hẹn Test', color: '#6d28d9' },
      { key: 'tested', label: '✋ Đã Test', color: '#be185d' },
      { key: 'converted', label: '✅ Chốt', color: '#047857' },
    ];

    stageCols.forEach((st) => {
      columns.push({
        title: (
          <Tooltip title={`Chuyển trạng thái: ${st.label}`}>
            <span className="text-[11px] font-bold" style={{ color: st.color }}>
              {st.label}
            </span>
          </Tooltip>
        ),
        key: `ck_${st.key}`,
        align: 'center' as const,
        width: 60,
        render: (_: any, record: Lead) => {
          const isChecked = FLOW.indexOf(record.status) >= FLOW.indexOf(st.key);
          return (
            <input
              type="checkbox"
              checked={isChecked}
              aria-label={`Trạng thái ${st.label} - ${record.name}`}
              onChange={(e) => handleStatusChange(record.id, st.key, e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-[#b8941f]"
            />
          );
        },
      });
    });

    columns.push({
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (st: string) => {
        const meta = STATUS_META[st] || { label: st, color: '#374151', bg: '#f3f4f6', icon: <MailOutlined /> };
        return (
          <span
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
            style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}
          >
            {meta.icon}
            {meta.label}
          </span>
        );
      },
    });
  }

  columns.push(
    {
      title: 'DOANH THU',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 110,
      render: (rev: number) => (
        <span className="font-bold text-emerald-600 text-xs font-mono tabular-nums">
          {rev > 0 ? fmtMoney(rev) : '—'}
        </span>
      ),
    },
    {
      title: 'GHI CHÚ',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text || 'Chưa có ghi chú'}>
          <span className="td-student-notes truncate block">{text || '—'}</span>
        </Tooltip>
      ),
    }
  );

  // Actions for Hẹn Test tab
  if (isSched) {
    columns.push({
      title: 'HÀNH ĐỘNG',
      key: 'sched_actions',
      align: 'center' as const,
      width: 220,
      render: (_: any, record: Lead) => {
        if (record.noShow) {
          return (
            <div className="flex items-center gap-1.5">
              <Tag color="error" className="text-[10px] font-bold">
                ❌ Không đến
              </Tag>
              <Button
                size="small"
                onClick={() => copyNoShowScript(record)}
                className="text-[11px] font-semibold text-[#b8941f] border-[#b8941f]/30 bg-[#b8941f]/10"
              >
                📎 Copy tin hẹn
              </Button>
              <input
                type="date"
                onChange={(e) => handleReschedule(record.id, e.target.value)}
                className="border border-emerald-400 rounded px-1 py-0.5 text-xs text-emerald-600 font-bold bg-emerald-50 cursor-pointer outline-none w-28"
                title="Chọn ngày hẹn lại"
              />
            </div>
          );
        }

        return (
          <Space size={4}>
            <Button
              size="small"
              onClick={() => handleMarkTested(record.id)}
              className="text-[11px] font-bold bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-600 hover:text-white"
            >
              ✋ Đã test
            </Button>
            <Button
              size="small"
              onClick={() => handleMarkNoShow(record.id)}
              className="text-[11px] font-semibold text-gray-500 border-gray-300 hover:bg-red-50 hover:text-red-600"
            >
              ✕ Không đến
            </Button>
          </Space>
        );
      },
    });
  } else {
    columns.push({
      title: 'TÁC VỤ',
      key: 'actions',
      align: 'right' as const,
      width: 100,
      render: (_: any, record: Lead) => (
        <Space size={2}>
          <Tooltip title="Chi tiết học viên">
            <Button
              size="small"
              type="text"
              icon={<EyeOutlined className="text-blue-500 hover:text-blue-600 text-sm" />}
              onClick={() => setDetailLead(record)}
            />
          </Tooltip>
          {isLost ? (
            <Tooltip title="Khôi phục lại lead">
              <Button
                size="small"
                type="text"
                icon={<RedoOutlined className="text-emerald-500 hover:text-emerald-600 text-sm" />}
                onClick={() => handleStatusChange(record.id, 'new', true)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Từ bỏ lead">
              <Button
                size="small"
                type="text"
                icon={<StopOutlined className="text-gray-400 hover:text-red-500 text-sm" />}
                onClick={() => handleStatusChange(record.id, 'lost', true)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    });
  }

  // Calendar Event Collectors
  const getCalendarEvents = () => {
    const events: Record<
      string,
      { id: string; name: string; phone: string; cls: string; time: string; noShow?: boolean }[]
    > = {};

    leads.forEach((l) => {
      if (l.schedule) {
        let cls = 'bg-purple-100 text-purple-700 border-l-4 border-purple-500';
        if (l.status === 'tested') cls = 'bg-emerald-100 text-emerald-700 border-l-4 border-emerald-500';
        else if (l.status === 'converted') cls = 'bg-emerald-100 text-emerald-700 border-l-4 border-emerald-500';
        else if (l.noShow) cls = 'bg-gray-100 text-gray-400 border-l-4 border-gray-400 line-through';

        if (!events[l.schedule]) events[l.schedule] = [];
        events[l.schedule].push({
          id: l.id,
          name: l.name,
          phone: l.phone,
          cls,
          time: l.scheduleTime || '',
          noShow: l.noShow,
        });
      }

      if (l.flight) {
        if (!events[l.flight]) events[l.flight] = [];
        events[l.flight].push({
          id: l.id,
          name: `${l.name} (Bay)`,
          phone: l.phone,
          cls: 'bg-red-100 text-red-700 border-l-4 border-red-500 font-bold',
          time: '',
        });
      }
    });

    return events;
  };

  // Calendar Month Navigation
  const handleCalPrev = () => {
    const d = dayjs().year(calYear).month(calMonth).subtract(1, 'month');
    setCalYear(d.year());
    setCalMonth(d.month());
  };

  const handleCalNext = () => {
    const d = dayjs().year(calYear).month(calMonth).add(1, 'month');
    setCalYear(d.year());
    setCalMonth(d.month());
  };

  const handleCalToday = () => {
    const d = dayjs();
    setCalYear(d.year());
    setCalMonth(d.month());
  };

  // Render Calendar Grid
  const renderCalendarView = () => {
    const startOfMonth = dayjs().year(calYear).month(calMonth).startOf('month');
    const daysInMonth = startOfMonth.daysInMonth();
    const startDow = startOfMonth.day(); // 0 is Sunday
    const events = getCalendarEvents();
    const today = todayStr();

    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const monthTitle = `Tháng ${calMonth + 1} ${calYear}`;

    const cells: React.ReactNode[] = [];

    // Empty start cells
    for (let i = 0; i < startDow; i++) {
      const prevDate = startOfMonth.subtract(startDow - i, 'day');
      cells.push(
        <div
          key={`prev-${i}`}
          className="min-h-[90px] p-1.5 border-b border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 opacity-40"
        >
          <span className="text-xs text-gray-400 font-medium">{prevDate.date()}</span>
        </div>
      );
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = dayjs().year(calYear).month(calMonth).date(d).format('YYYY-MM-DD');
      const isToday = dateStr === today;
      const dayEvents = events[dateStr] || [];

      cells.push(
        <div
          key={`day-${d}`}
          className={`min-h-[95px] p-1.5 border-b border-r border-gray-100 dark:border-gray-800 flex flex-col gap-1 transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-800/40 ${
            isToday ? 'bg-[#b8941f]/5 dark:bg-[#b8941f]/10' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                isToday ? 'bg-[#b8941f] text-white shadow-xs' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {d}
            </span>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] custom-scrollbar">
            {dayEvents.map((ev, idx) => (
              <div
                key={idx}
                onClick={() => {
                  const lead = leads.find((l) => l.id === ev.id);
                  if (lead) setDetailLead(lead);
                }}
                className={`text-[11px] px-1.5 py-0.5 rounded cursor-pointer truncate font-medium ${ev.cls}`}
                title={`${ev.time || '--:--'} - ${ev.name} ${ev.phone ? `(${ev.phone})` : ''}`}
              >
                {ev.time ? `${ev.time} ` : ''}
                {ev.name}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 glass-card rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm w-full">
        {/* Calendar Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <Button size="small" icon={<LeftOutlined />} onClick={handleCalPrev} />
            <span className="font-extrabold text-base text-heading w-36 text-center">{monthTitle}</span>
            <Button size="small" icon={<RightOutlined />} onClick={handleCalNext} />
          </div>
          <Button
            size="small"
            onClick={handleCalToday}
            className="font-bold text-xs text-[#b8941f] border-[#b8941f]/40"
          >
            Hôm nay
          </Button>
        </div>

        {/* Weekday Titles */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-t-lg">
          {weekdays.map((w, i) => (
            <div key={i} className="py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              {w}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 border-l border-t border-gray-100 dark:border-gray-800 rounded-b-lg overflow-hidden">
          {cells}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium text-gray-500 pt-2 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Hẹn Test
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Đã tới test / Chốt
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span> Không đến
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Lịch bay 🛫
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-full relative min-h-screen">
      {/* Sleek Floating Sales Script Button */}
      <Tooltip title="Kịch bản mẫu Sales & Tư vấn Academy" placement="left">
        <button
          aria-label="Kịch bản mẫu Sales & Tư vấn Academy"
          onClick={() => {
            if (leads.length > 0) setDetailLead(leads[0]);
          }}
          className="fixed right-5 bottom-8 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white p-3.5 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
        >
          <BookOutlined className="text-lg" />
        </button>
      </Tooltip>

      {/* Target Revenue Progress Bar & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-card rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-xs w-full">
        {/* Title & Revenue Progress Center */}
        <div className="flex items-center gap-4 flex-1 min-w-[280px]">
          <span className="font-extrabold text-sm text-heading whitespace-nowrap font-mono tabular-nums">
            {fmtMoney(totalRevenue)} <span className="text-[#a0a0ad] font-normal">/ 100M</span>
          </span>
          <div className="progress-track-bg flex-1 max-w-md h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#b8941f] to-[#d4af37] transition-all duration-500 rounded-full"
              style={{ width: `${revenuePct}%` }}
            />
          </div>
          <span className="progress-pct-num text-xs whitespace-nowrap font-mono tabular-nums">{revenuePct}%</span>
        </div>

        {/* Action Buttons Right */}
        <div className="flex items-center gap-2.5">
          <Input
            prefix={<SearchOutlined className="text-gray-400 text-xs" />}
            placeholder="Tìm tên, SĐT, ghi chú..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            size="middle"
            className="w-56 text-xs rounded-lg shadow-xs"
          />

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingLeadId(null);
              form.resetFields();
              setAddModalVisible(true);
            }}
            className="font-bold text-xs bg-[#b8941f] border-[#b8941f] text-white hover:bg-[#a3821a] rounded-lg shadow-xs"
          >
            + Thêm Lead
          </Button>
        </div>
      </div>

      {/* Underline Tabs Bar */}
      <div className="flex items-center gap-1 glass-card border-b border-gray-200 dark:border-gray-800 px-4 overflow-x-auto shadow-xs w-full">
        {TABS.map((t) => {
          const count = getTabCount(t.id);
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                isActive ? 'tab-btn-active' : 'tab-btn-inactive'
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`px-2 py-0.5 text-[11px] rounded-full font-mono tabular-nums ${
                  isActive ? 'tab-badge-active' : 'tab-badge-inactive'
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

      {/* Main Area: Table or Calendar */}
      {activeTab === 'calendar' ? (
        renderCalendarView()
      ) : (
        <div className="glass-card rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm w-full">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={getFilteredLeads()}
            loading={loading}
            pagination={{ pageSize: 25, showSizeChanger: true, showTotal: (total) => `Tổng ${total} lead` }}
            className="custom-table w-full"
            size="middle"
            scroll={{ x: 'max-content' }}
          />
        </div>
      )}

      {/* Modal: Add/Edit Lead */}
      <Modal
        title={editingLeadId ? 'Chỉnh Sửa Học Viên' : 'Thêm Lead Mới'}
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        onOk={() => form.submit()}
        okText="Lưu thông tin"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleSaveLead}>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="name" label="Tên học viên *" rules={[{ required: true, message: 'Nhập tên học viên!' }]}>
              <Input placeholder="Chị Trâm" prefix={<UserOutlined />} />
            </Form.Item>
            <Form.Item name="phone" label="SĐT / Zalo">
              <Input placeholder="0901 234 567" prefix={<PhoneOutlined />} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="course" label="Khóa học">
              <Select placeholder="— Chưa xác định —">
                <Select.Option value="Nền Tảng (1.9M)">Nền Tảng (1.9M)</Select.Option>
                <Select.Option value="Tinh Hoa (9.9M)">Tinh Hoa (9.9M)</Select.Option>
                <Select.Option value="Volume (9.9M)">Volume (9.9M)</Select.Option>
                <Select.Option value="Thiết Kế (9.9M)">Thiết Kế (9.9M)</Select.Option>
                <Select.Option value="Combo Pro (19.9M)">Combo Pro (19.9M)</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="goal" label="Mục tiêu học">
              <Select placeholder="— Chưa rõ —">
                <Select.Option value="Đổi nghề">Đổi nghề</Select.Option>
                <Select.Option value="Kiếm thêm thu nhập">Kiếm thêm thu nhập</Select.Option>
                <Select.Option value="Nâng cấp tay nghề">Nâng cấp tay nghề</Select.Option>
                <Select.Option value="Mở tiệm riêng">Mở tiệm riêng</Select.Option>
                <Select.Option value="Học trước khi định cư">Học trước khi định cư</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="source" label="Nguồn Lead">
              <Select defaultValue="Facebook Ads">
                <Select.Option value="Facebook Ads">Facebook Ads</Select.Option>
                <Select.Option value="Giới thiệu">Giới thiệu</Select.Option>
                <Select.Option value="TikTok">TikTok</Select.Option>
                <Select.Option value="Walk-in">Walk-in</Select.Option>
                <Select.Option value="Khác">Khác</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="revenue" label="Số tiền đã cọc/đóng">
              <InputNumber
                className="w-full"
                placeholder="0"
                min={0}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="schedule" label="Ngày hẹn test">
              <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="Chọn ngày" />
            </Form.Item>
            <Form.Item name="flight" label="🛫 Ngày bay (nếu có)">
              <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="Chọn ngày bay" />
            </Form.Item>
          </div>

          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea placeholder="Ghi lại thông tin quan trọng..." rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer: Detailed Lead View & Follow-up Scripts */}
      <Drawer
        title={detailLead ? `Hồ Sơ Học Viên: ${detailLead.name}` : ''}
        placement="right"
        width={540}
        onClose={() => setDetailLead(null)}
        open={!!detailLead}
      >
        {detailLead && (
          <div className="flex flex-col gap-4">
            {/* Urgent Flight Warning */}
            {detailLead.flight && daysTo(detailLead.flight) <= 14 && daysTo(detailLead.flight) >= 0 && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs font-bold text-red-600 flex items-center gap-2">
                <RocketOutlined className="text-sm" />
                <span>
                  🛫 Bay {fmtDate(detailLead.flight)} — Còn {daysTo(detailLead.flight)} ngày
                </span>
              </div>
            )}

            {/* Quick Profile Header */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                {renderLeadAvatar(detailLead)}
                <div className="flex flex-col">
                  <span className="font-extrabold text-base text-heading">{detailLead.name}</span>
                  <span className="text-xs font-mono font-bold text-[#b8941f] tabular-nums">
                    {detailLead.phone || 'Chưa có SĐT'}
                  </span>
                </div>
              </div>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditModal(detailLead)}
                className="font-semibold text-xs"
              >
                Chỉnh sửa
              </Button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-xl">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Trạng thái</span>
                <span className="font-bold text-[#b8941f]">
                  {STATUS_META[detailLead.status]?.label || detailLead.status}
                </span>
              </div>

              <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-xl">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Khóa học</span>
                <Select
                  value={detailLead.course || ''}
                  size="small"
                  bordered={false}
                  className="font-bold text-[#b8941f] p-0"
                  onChange={(val) => {
                    handleInlineUpdate(detailLead.id, 'course', val);
                    setDetailLead((prev) => (prev ? { ...prev, course: val } : null));
                  }}
                >
                  <Select.Option value="">— Chưa chọn —</Select.Option>
                  <Select.Option value="Nền Tảng (1.9M)">Nền Tảng (1.9M)</Select.Option>
                  <Select.Option value="Tinh Hoa (9.9M)">Tinh Hoa (9.9M)</Select.Option>
                  <Select.Option value="Volume (9.9M)">Volume (9.9M)</Select.Option>
                  <Select.Option value="Thiết Kế (9.9M)">Thiết Kế (9.9M)</Select.Option>
                  <Select.Option value="Combo Pro (19.9M)">Combo Pro (19.9M)</Select.Option>
                </Select>
              </div>

              <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-xl">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Mục tiêu</span>
                <span className="font-bold text-heading">{detailLead.goal || '—'}</span>
              </div>

              <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-xl">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Doanh thu cọc</span>
                <span className="font-bold text-emerald-600 font-mono tabular-nums">
                  {fmtMoney(detailLead.revenue)}
                </span>
              </div>
            </div>

            {/* Test Schedule Selector Box */}
            <div className="p-3.5 bg-purple-50/60 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl flex flex-col gap-2">
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase flex items-center gap-1.5">
                <CalendarOutlined /> 📅 Lịch hẹn test tay nghề
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={detailLead.schedule || ''}
                  onChange={(e) => {
                    handleReschedule(detailLead.id, e.target.value);
                    setDetailLead((prev) => (prev ? { ...prev, schedule: e.target.value, status: 'scheduled' } : null));
                  }}
                  className="flex-1 p-1.5 border border-purple-300 dark:border-purple-700 rounded-lg text-xs font-mono font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-gray-800 outline-none cursor-pointer"
                />
                <input
                  type="time"
                  value={detailLead.scheduleTime || ''}
                  onChange={(e) => {
                    handleInlineUpdate(detailLead.id, 'scheduleTime', e.target.value);
                    setDetailLead((prev) => (prev ? { ...prev, scheduleTime: e.target.value } : null));
                  }}
                  className="w-28 p-1.5 border border-purple-300 dark:border-purple-700 rounded-lg text-xs font-mono font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-gray-800 outline-none cursor-pointer"
                />
              </div>
              {detailLead.schedule ? (
                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                  ✅ Đã hẹn: {fmtDate(detailLead.schedule)}{' '}
                  {detailLead.scheduleTime ? `lúc ${detailLead.scheduleTime}` : ''}
                </span>
              ) : (
                <span className="text-[11px] text-gray-400">Chọn ngày + giờ → Tự động dời sang Hẹn Test</span>
              )}
            </div>

            {/* Quick Status Transition Buttons */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-gray-400">Chuyển trạng thái nhanh:</span>
              <div className="flex flex-wrap gap-1.5">
                {FLOW.map((st) => {
                  const sm = STATUS_META[st];
                  const isCurrent = detailLead.status === st;
                  return (
                    <button
                      key={st}
                      onClick={() => {
                        handleStatusChange(detailLead.id, st, true);
                        setDetailLead((prev) => (prev ? { ...prev, status: st } : null));
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer border ${
                        isCurrent
                          ? 'bg-[#b8941f] text-white border-[#b8941f] shadow-xs'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#b8941f]'
                      }`}
                    >
                      {sm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Sales Scripts */}
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                📋 Kịch bản mẫu Sales & Follow-up
              </span>
              {genScripts(detailLead).map((script, idx) => {
                const isOpen = expandedScriptIdx === idx;
                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <button
                      onClick={() => setExpandedScriptIdx(isOpen ? null : idx)}
                      className="w-full text-left p-2.5 bg-[#b8941f]/10 border border-[#b8941f]/20 rounded-lg text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between hover:bg-[#b8941f]/20 transition-all cursor-pointer"
                    >
                      <span>
                        {script.icon} {script.title}
                      </span>
                      <span className="text-[10px] text-[#b8941f]">{isOpen ? '▲ Thu gọn' : '▼ Xem kịch bản'}</span>
                    </button>

                    {isOpen && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap relative">
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => {
                            navigator.clipboard.writeText(script.text);
                            message.success('Đã copy kịch bản!');
                          }}
                          className="absolute right-2 top-2 text-[10px] font-bold text-[#b8941f] border-[#b8941f]/30"
                        >
                          Copy
                        </Button>
                        <div className="pr-16">{script.text}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Follow-up Log History */}
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[10px] uppercase font-bold text-gray-400">📝 Nhật ký Follow-up</span>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {(detailLead.followUps || [])
                  .slice()
                  .reverse()
                  .map((fu, i) => (
                    <div
                      key={i}
                      className="p-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-gray-800 flex items-start gap-2 text-xs"
                    >
                      <span className="text-gray-400 font-mono text-[10px] shrink-0">{fmtDate(fu.date)}</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{fu.text}</span>
                    </div>
                  ))}
              </div>

              {/* Add Follow-up Note */}
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Ghi chú follow-up..."
                  value={newFollowUpText}
                  onChange={(e) => setNewFollowUpText(e.target.value)}
                  onPressEnter={() => handleAddFollowUp(detailLead.id)}
                  size="small"
                  className="text-xs rounded-lg"
                />
                <Button
                  size="small"
                  type="primary"
                  onClick={() => handleAddFollowUp(detailLead.id)}
                  className="bg-[#b8941f] border-[#b8941f] text-white font-bold text-xs rounded-lg"
                >
                  + Ghi
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

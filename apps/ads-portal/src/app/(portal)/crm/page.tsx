'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Table,
  Button,
  Tabs,
  Badge,
  Tag,
  Input,
  Select,
  DatePicker,
  notification,
  message,
  Drawer,
  Card,
  Space,
  Row,
  Col,
  Statistic,
  Checkbox,
  Popover,
  Tooltip,
} from 'antd';
import {
  SyncOutlined,
  SearchOutlined,
  ClearOutlined,
  CalendarOutlined,
  FireOutlined,
  UserOutlined,
  SettingOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

interface Lead {
  id: string;
  name: string;
  phone: string;
  course: string;
  status: string;
  source: string;
  assigned_to: string;
  notes: string;
  created_at: string;
  is_hot?: boolean;
  hot_marked_at?: string;
  hot_last_action?: string;
  hot_temperature?: number;
  follow_ups?: { date: string; text: string }[];
}

const CRM_STATUS_MAP: Record<string, { label: string; color: string }> = {
  New: { label: '1. Mới', color: 'blue' },
  Contacted: { label: '2. Đã liên hệ', color: 'orange' },
  Consulted: { label: '3. Đã tư vấn', color: 'cyan' },
  Scheduled: { label: '4. Đã đặt hẹn', color: 'purple' },
  Visited: { label: '5. Đã đến shop', color: 'pink' },
  Deposited: { label: '6. Đã cọc', color: 'gold' },
  Registered: { label: '7. Đã chốt', color: 'green' },
  Studied: { label: '8. Đã học', color: 'geekblue' },
  Lost: { label: '9. Không nhu cầu', color: 'gray' },
  Unqualified: { label: '10. Không tiềm năng', color: 'red' },
  Spam: { label: '11. Click nhầm / Số ảo', color: 'red' },
};

const CRM_SOURCES = [
  'Facebook Academy',
  'Facebook Lashes',
  'Pancake Academy',
  'Pancake Lashes',
  'Wings Salon Referral',
  'Manual Import',
];

const STAFF_LIST = [
  { email: 'danhdo@gmail.com', name: 'Danny Do' },
  { email: 'hong.bui@wingslashes.com', name: 'Hồng Bùi' },
  { email: 'han.huynh@wingslashes.com', name: 'Hân Huỳnh' },
  { email: 'doan.pham@wingslashes.com', name: 'Đoan Phạm' },
  { email: 'khai.nguyen@wingslashes.com', name: 'Khải Nguyện' },
  { email: 'tam.nguyen@wingslashes.com', name: 'Tâm Nguyễn' },
  { email: 'nguyen.bui@wingslashes.com', name: 'Nguyên Bùi' },
];

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [subtab, setSubtab] = useState<'all' | 'lashes' | 'academy' | 'waitlist'>('academy');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    chatting: 0,
    newLeads: 0,
    consulting: 0,
    scheduled: 0,
    registered: 0,
    hot: 0,
  });

  // Filters State
  const [searchText, setSearchText] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(Object.keys(CRM_STATUS_MAP));
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedStaff, setSelectedStaff] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [hotOnly, setHotOnly] = useState(false);

  // Column Config State
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'phone',
    'status',
    'source',
    'assigned_to',
    'notes',
    'created_at',
    'actions',
  ]);

  // Lead details Drawer
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [newFollowUpText, setNewFollowUpText] = useState('');

  // Fetch leads and calculate stats
  const loadLeadsData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('leads').select('*');

      // Filter by subtab segment
      if (subtab === 'lashes') {
        query = query.ilike('source', '%lashes%');
      } else if (subtab === 'academy') {
        query = query.ilike('source', '%academy%');
      } else if (subtab === 'waitlist') {
        // Waitlist uses special status or tags
        query = query.eq('status', 'Scheduled');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const normLeads: Lead[] = data.map((l: any) => ({
          ...l,
          follow_ups: Array.isArray(l.follow_ups) ? l.follow_ups : [],
        }));
        setLeads(normLeads);

        // Compute metrics
        const total = normLeads.length;
        const chatting = normLeads.filter((l) => !l.phone).length;
        const newLeads = normLeads.filter((l) => l.phone && l.status === 'New').length;
        const consulting = normLeads.filter((l) => ['Contacted', 'Consulted'].includes(l.status)).length;
        const scheduled = normLeads.filter((l) => l.status === 'Scheduled').length;
        const registered = normLeads.filter((l) => ['Deposited', 'Registered', 'Studied'].includes(l.status)).length;
        const hot = normLeads.filter((l) => l.is_hot).length;

        setStats({ total, chatting, newLeads, consulting, scheduled, registered, hot });
      }
    } catch (err: any) {
      console.error(err);
      message.error('Lỗi khi tải dữ liệu CRM: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeadsData();
  }, [subtab]);

  // Save consultation note
  const handleAddFollowUp = async () => {
    if (!detailLead || !newFollowUpText.trim()) return;

    const newLog = {
      date: dayjs().format('YYYY-MM-DD HH:mm'),
      text: newFollowUpText.trim(),
    };

    const updatedFollowUps = [newLog, ...(detailLead.follow_ups || [])];

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
      message.error('Lỗi khi lưu nhật ký: ' + err.message);
    }
  };

  // Toggle lead Hot priority state
  const handleToggleHot = async (lead: Lead) => {
    const nextHot = !lead.is_hot;
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          is_hot: nextHot,
          hot_marked_at: nextHot ? new Date().toISOString() : null,
          hot_temperature: nextHot ? 75 : 0,
        })
        .eq('id', lead.id);

      if (error) throw error;

      message.success(nextHot ? 'Đã đánh dấu Lead Nóng 🔥' : 'Đã gỡ đánh dấu Lead Nóng');
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, is_hot: nextHot } : l)));
      if (detailLead && detailLead.id === lead.id) {
        setDetailLead((prev) => (prev ? { ...prev, is_hot: nextHot } : null));
      }
    } catch (err: any) {
      message.error('Không thể cập nhật trạng thái Hot: ' + err.message);
    }
  };

  // Assign staff
  const handleAssignStaff = async (leadId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ assigned_to: email, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      message.success('Đã phân bổ nhân sự phụ trách');
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, assigned_to: email } : l)));
    } catch (err: any) {
      message.error('Lỗi khi phân bổ: ' + err.message);
    }
  };

  // Filter Leads local lists
  const getFilteredLeads = () => {
    return leads.filter((l) => {
      // 1. Search Query
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const matchesQuery =
          (l.name || '').toLowerCase().includes(q) ||
          (l.phone || '').includes(q) ||
          (l.notes || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // 2. Statuses Checkbox
      if (!selectedStatuses.includes(l.status || 'New')) return false;

      // 3. Source Selection
      if (selectedSource !== 'ALL' && l.source !== selectedSource) return false;

      // 4. Staff Selection
      if (selectedStaff !== 'ALL') {
        if (selectedStaff === '__UNASSIGNED__' && l.assigned_to) return false;
        if (selectedStaff !== '__UNASSIGNED__' && l.assigned_to !== selectedStaff) return false;
      }

      // 5. Date Range Check
      if (dateRange[0] && dateRange[1]) {
        const created = dayjs(l.created_at);
        if (created.isBefore(dateRange[0].startOf('day')) || created.isAfter(dateRange[1].endOf('day'))) {
          return false;
        }
      }

      // 6. Hot Only Check
      if (hotOnly && !l.is_hot) return false;

      return true;
    });
  };

  const handleResetFilters = () => {
    setSearchText('');
    setSelectedStatuses(Object.keys(CRM_STATUS_MAP));
    setSelectedSource('ALL');
    setSelectedStaff('ALL');
    setDateRange([null, null]);
    setHotOnly(false);
    message.info('Đã xóa tất cả bộ lọc');
  };

  const columnsList = [
    {
      title: 'Học viên / KH',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Lead) => (
        <div className="flex flex-col">
          <span
            className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            onClick={() => setDetailLead(record)}
          >
            {text}
          </span>
          <div className="flex gap-1 items-center mt-1">
            {record.is_hot && (
              <Tag color="red" icon={<FireOutlined />} className="text-[10px] font-bold py-0 px-1">
                HOT
              </Tag>
            )}
            {record.course && (
              <Tag color="gold" className="text-[10px] py-0 px-1">
                {record.course}
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (text: string) => text || <span className="text-gray-400">Chưa có SĐT</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const meta = CRM_STATUS_MAP[status] || { label: status || 'Mới', color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Nguồn Lead',
      dataIndex: 'source',
      key: 'source',
      render: (text: string) => <span className="text-xs">{text || '—'}</span>,
    },
    {
      title: 'Phụ trách',
      dataIndex: 'assigned_to',
      key: 'assigned_to',
      render: (assigned: string, record: Lead) => (
        <Select
          size="small"
          value={assigned || '__UNASSIGNED__'}
          style={{ width: 140 }}
          onChange={(val) => handleAssignStaff(record.id, val === '__UNASSIGNED__' ? '' : val)}
        >
          <Select.Option value="__UNASSIGNED__">Chưa phân bổ</Select.Option>
          {STAFF_LIST.map((st) => (
            <Select.Option key={st.email} value={st.email}>
              {st.name}
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Ghi chú cuộc gọi',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (text: string) => text || <span className="text-gray-400">Không có ghi chú</span>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val: string) => dayjs(val).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: Lead) => (
        <Button
          size="small"
          type="text"
          icon={<FireOutlined style={{ color: record.is_hot ? '#ef4444' : '#94a3b8' }} />}
          onClick={() => handleToggleHot(record)}
        >
          {record.is_hot ? 'Gỡ Hot' : 'Báo Hot'}
        </Button>
      ),
    },
  ];

  const renderedColumns = columnsList.filter((col) => visibleColumns.includes(col.key));

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* CRM Sub-tabs */}
      <div className="flex items-center justify-between border-b border-default pb-2">
        <Tabs
          activeKey={subtab}
          onChange={(val) => setSubtab(val as any)}
          items={[
            { key: 'all', label: 'Tất cả nguồn' },
            { key: 'lashes', label: 'Wings Lashes' },
            { key: 'academy', label: 'Wings Academy (Đào tạo)' },
            { key: 'waitlist', label: '🔔 Danh sách Waitlist' },
          ]}
        />
        <Button icon={<SyncOutlined spin={loading} />} onClick={loadLeadsData}>
          Tải lại
        </Button>
      </div>

      {/* CRM Lead Stats Grid */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small" className="shadow-sm border border-default">
            <Statistic
              title={<span className="text-xs text-secondary">Tổng số Leads</span>}
              value={stats.total}
              valueStyle={{ fontSize: 18, fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small" className="shadow-sm border border-default">
            <Statistic
              title={<span className="text-xs text-secondary">Chưa SĐT</span>}
              value={stats.chatting}
              valueStyle={{ fontSize: 18, fontWeight: 'bold', color: '#0ea5e9' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small" className="shadow-sm border border-default">
            <Statistic
              title={<span className="text-xs text-secondary">Mới (Có SĐT)</span>}
              value={stats.newLeads}
              valueStyle={{ fontSize: 18, fontWeight: 'bold', color: '#f43f5e' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small" className="shadow-sm border border-default">
            <Statistic
              title={<span className="text-xs text-secondary">Đang tư vấn</span>}
              value={stats.consulting}
              valueStyle={{ fontSize: 18, fontWeight: 'bold', color: '#f59e0b' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card size="small" className="shadow-sm border border-default">
            <Statistic
              title={<span className="text-xs text-secondary">Đã hẹn test</span>}
              value={stats.scheduled}
              valueStyle={{ fontSize: 18, fontWeight: 'bold', color: '#8b5cf6' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            size="small"
            className="shadow-sm border border-default bg-red-500/5 border-red-500/10 cursor-pointer"
            onClick={() => setHotOnly(!hotOnly)}
          >
            <Statistic
              title={<span className="text-xs text-red-500 font-bold">🔥 Hot Leads</span>}
              value={stats.hot}
              valueStyle={{ fontSize: 18, fontWeight: 'bold', color: '#ef4444' }}
            />
          </Card>
        </Col>
      </Row>

      {/* CRM Actions & Filters */}
      <Card className="shadow-sm border border-default" styles={{ body: { padding: '12px 16px' } }}>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Tìm tên, SĐT, ghi chú..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 min-w-[200px]"
            allowClear
          />

          {/* Status select Popover */}
          <Popover
            content={
              <div className="flex flex-col gap-2 p-1 max-h-60 overflow-y-auto">
                {Object.keys(CRM_STATUS_MAP).map((status) => (
                  <Checkbox
                    key={status}
                    checked={selectedStatuses.includes(status)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStatuses([...selectedStatuses, status]);
                      } else {
                        setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
                      }
                    }}
                  >
                    {CRM_STATUS_MAP[status].label}
                  </Checkbox>
                ))}
              </div>
            }
            title="Chọn Trạng thái"
            trigger="click"
          >
            <Button icon={<SettingOutlined />}>Trạng thái ({selectedStatuses.length})</Button>
          </Popover>

          <Select value={selectedSource} onChange={setSelectedSource} className="w-[160px]">
            <Select.Option value="ALL">Tất cả Nguồn</Select.Option>
            {CRM_SOURCES.map((src) => (
              <Select.Option key={src} value={src}>
                {src}
              </Select.Option>
            ))}
          </Select>

          <Select value={selectedStaff} onChange={setSelectedStaff} className="w-[160px]">
            <Select.Option value="ALL">Tất cả Phụ trách</Select.Option>
            <Select.Option value="__UNASSIGNED__">Chưa phân bổ</Select.Option>
            {STAFF_LIST.map((st) => (
              <Select.Option key={st.email} value={st.email}>
                {st.name}
              </Select.Option>
            ))}
          </Select>

          <DatePicker.RangePicker
            value={dateRange}
            onChange={(val) => setDateRange(val ? [val[0], val[1]] : [null, null])}
            className="w-[260px]"
          />

          <Button
            danger={hotOnly}
            type={hotOnly ? 'primary' : 'default'}
            icon={<FireOutlined />}
            onClick={() => setHotOnly(!hotOnly)}
          >
            Hot only
          </Button>

          <Button icon={<ClearOutlined />} onClick={handleResetFilters}>
            Xóa lọc
          </Button>
        </div>
      </Card>

      {/* CRM Leads Table */}
      <div className="glass-card rounded-xl overflow-hidden border border-default shadow-sm w-full">
        <Table
          dataSource={getFilteredLeads()}
          columns={renderedColumns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 25, showSizeChanger: true, showTotal: (t) => `Tổng ${t} CRM leads` }}
          className="custom-table w-full"
          scroll={{ x: 'max-content' }}
        />
      </div>

      {/* Detailed Lead Drawer */}
      <Drawer
        title={detailLead ? `Hồ sơ CRM: ${detailLead.name}` : ''}
        placement="right"
        width={500}
        onClose={() => setDetailLead(null)}
        open={!!detailLead}
      >
        {detailLead && (
          <div className="flex flex-col gap-5 h-full">
            <div className="flex items-center gap-2">
              {detailLead.is_hot && <Tag color="red">LEAD NÓNG 🔥</Tag>}
              {detailLead.status && (
                <Tag color={CRM_STATUS_MAP[detailLead.status]?.color || 'default'}>
                  {CRM_STATUS_MAP[detailLead.status]?.label || detailLead.status}
                </Tag>
              )}
            </div>

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
                  <span className="text-secondary text-xs block">Nhân sự phụ trách</span>
                  <span className="font-semibold text-heading">
                    {STAFF_LIST.find((s) => s.email === detailLead.assigned_to)?.name || 'Chưa phân bổ'}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-dashed border-default">
                <span className="text-secondary text-xs block">Ghi chú hiện tại</span>
                <p className="text-heading text-sm bg-hover p-2.5 rounded mt-1 whitespace-pre-wrap">
                  {detailLead.notes || 'Không có ghi chú.'}
                </p>
              </div>
            </Card>

            <div className="flex-1 flex flex-col min-h-0">
              <span className="font-bold text-sm text-heading mb-2">
                Nhật ký tư vấn ({detailLead.follow_ups?.length || 0})
              </span>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {detailLead.follow_ups && detailLead.follow_ups.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {detailLead.follow_ups.map((item, idx) => (
                      <div key={idx} className="p-3 rounded bg-hover border border-default">
                        <div className="flex justify-between text-xs text-secondary mb-1">
                          <span>{item.date}</span>
                        </div>
                        <p className="text-sm text-heading font-medium m-0">{item.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-xs">Chưa ghi nhận nhật ký tư vấn nào.</div>
                )}
              </div>

              {/* Add consultation log */}
              <div className="pt-3 border-t border-default flex gap-2">
                <Input
                  placeholder="Thêm ghi chú cuộc gọi, tin nhắn..."
                  value={newFollowUpText}
                  onChange={(e) => setNewFollowUpText(e.target.value)}
                  onPressEnter={handleAddFollowUp}
                />
                <Button
                  type="primary"
                  onClick={handleAddFollowUp}
                  style={{ backgroundColor: '#b8941f', borderColor: '#b8941f' }}
                >
                  Lưu
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

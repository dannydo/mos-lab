'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Card,
  Table,
  Button,
  Badge,
  Tag,
  Input,
  Modal,
  DatePicker,
  Select,
  notification,
  message,
  Space,
  Checkbox,
  Row,
  Col,
  List,
  Form,
} from 'antd';
import {
  SyncOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  AlertOutlined,
  ClockCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

interface ActionItem {
  id: string;
  lead_id: string;
  lead_name: string;
  action_text: string;
  due_date: string;
  due_time?: string;
  pancake_link?: string;
  status: 'pending' | 'done';
  created_by?: string;
  created_at: string;
}

export default function FollowUpPage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'done' | 'all'>('pending');

  // Modal Add/Edit
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);
  const [formLeads, setFormLeads] = useState<{ id: string; name: string }[]>([]);
  const [form] = Form.useForm();

  const loadFollowupData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lead_actions')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActions(data || []);

      // Also load leads for dropdown selection
      const { data: leadsData } = await supabase.from('leads').select('id, name');
      if (leadsData) {
        setFormLeads(leadsData);
      }
    } catch (err: any) {
      console.error(err);
      message.error('Lỗi khi tải Follow-up actions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowupData();
  }, []);

  // Mark task done / pending
  const handleToggleStatus = async (item: ActionItem) => {
    const nextStatus = item.status === 'pending' ? 'done' : 'pending';
    try {
      const { error } = await supabase
        .from('lead_actions')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (error) throw error;

      message.success(nextStatus === 'done' ? 'Đã hoàn thành việc cần làm! ✅' : 'Đã khôi phục trạng thái chưa làm');
      setActions((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: nextStatus } : a)));
    } catch (err: any) {
      message.error('Lỗi khi cập nhật trạng thái: ' + err.message);
    }
  };

  // Delete Action
  const handleDeleteAction = async (id: string) => {
    try {
      const { error } = await supabase.from('lead_actions').delete().eq('id', id);
      if (error) throw error;

      message.success('Đã xóa hành động follow-up');
      setActions((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      message.error('Lỗi khi xóa hành động: ' + err.message);
    }
  };

  // Save new/edit action
  const handleSaveAction = async (values: any) => {
    try {
      const selectedLead = formLeads.find((l) => l.id === values.lead_id);

      const payload: any = {
        lead_id: values.lead_id,
        lead_name: selectedLead ? selectedLead.name : '',
        action_text: values.action_text,
        due_date: values.due_date ? dayjs(values.due_date).format('YYYY-MM-DD') : null,
        due_time: values.due_time ? dayjs(values.due_time).format('HH:mm') : null,
        pancake_link: values.pancake_link || null,
        status: 'pending',
        updated_at: new Date().toISOString(),
      };

      if (editingAction) {
        const { error } = await supabase.from('lead_actions').update(payload).eq('id', editingAction.id);
        if (error) throw error;
        message.success('Cập nhật follow-up thành công');
      } else {
        payload.created_at = new Date().toISOString();
        payload.status = 'pending';
        const { error } = await supabase.from('lead_actions').insert([payload]);
        if (error) throw error;
        message.success('Thêm mới việc cần làm thành công');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingAction(null);
      loadFollowupData();
    } catch (err: any) {
      message.error('Lỗi khi lưu việc cần làm: ' + err.message);
    }
  };

  // Date classification
  const classifyAction = (item: ActionItem) => {
    if (!item.due_date) return 'no-date';
    const today = dayjs().format('YYYY-MM-DD');
    if (item.due_date < today) return 'overdue';
    if (item.due_date === today) return 'today';
    return 'upcoming';
  };

  // Filter actions local lists
  const getFilteredActions = () => {
    return actions.filter((item) => {
      // Status filter
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;

      // Search text
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        return (item.lead_name || '').toLowerCase().includes(q) || (item.action_text || '').toLowerCase().includes(q);
      }
      return true;
    });
  };

  const filtered = getFilteredActions();
  const overdueItems = filtered.filter((item) => classifyAction(item) === 'overdue' && item.status === 'pending');
  const todayItems = filtered.filter((item) => classifyAction(item) === 'today' && item.status === 'pending');
  const upcomingItems = filtered.filter((item) => classifyAction(item) === 'upcoming' && item.status === 'pending');
  const doneItems = filtered.filter((item) => item.status === 'done');

  const renderListItem = (item: ActionItem) => (
    <List.Item
      key={item.id}
      actions={[
        <Button
          key="edit"
          size="small"
          type="link"
          onClick={() => {
            setEditingAction(item);
            form.setFieldsValue({
              lead_id: item.lead_id,
              action_text: item.action_text,
              due_date: item.due_date ? dayjs(item.due_date) : null,
              due_time: item.due_time ? dayjs(item.due_time, 'HH:mm') : null,
              pancake_link: item.pancake_link,
            });
            setModalVisible(true);
          }}
        >
          Sửa
        </Button>,
        <Button
          key="delete"
          size="small"
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteAction(item.id)}
        />,
      ]}
    >
      <div className="flex gap-3 items-start flex-1">
        <Checkbox checked={item.status === 'done'} onChange={() => handleToggleStatus(item)} className="mt-1" />
        <div className="flex flex-col gap-1">
          <span
            className={`text-sm ${item.status === 'done' ? 'line-through text-gray-400' : 'text-heading font-medium'}`}
          >
            {item.action_text}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <Tag color="blue">{item.lead_name}</Tag>
            {item.due_date && (
              <span
                className={`text-xs ${classifyAction(item) === 'overdue' && item.status === 'pending' ? 'text-red-500 font-bold' : 'text-secondary'}`}
              >
                📅 {dayjs(item.due_date).format('DD/MM/YYYY')} {item.due_time || ''}
              </span>
            )}
            {item.pancake_link && (
              <a
                href={item.pancake_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                <LinkOutlined /> Pancake Chat
              </a>
            )}
          </div>
        </div>
      </div>
    </List.Item>
  );

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header and sync button */}
      <div className="flex justify-between items-center border-b border-default pb-3">
        <div>
          <h1 className="text-xl font-bold text-heading">Follow-up Action Queue</h1>
          <p className="text-xs text-secondary">Quản lý và thực hiện các đầu việc nhắc hẹn, liên hệ lại học viên</p>
        </div>
        <Space>
          <Button icon={<SyncOutlined spin={loading} />} onClick={loadFollowupData}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ backgroundColor: '#b8941f', borderColor: '#b8941f' }}
            onClick={() => {
              setEditingAction(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            Thêm việc cần làm
          </Button>
        </Space>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <Input
          placeholder="Tìm theo tên học viên, việc cần làm..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full sm:w-80"
          allowClear
        />
        <Select value={filterStatus} onChange={setFilterStatus} className="w-[180px]">
          <Select.Option value="pending">Chưa hoàn thành</Select.Option>
          <Select.Option value="done">Đã hoàn thành</Select.Option>
          <Select.Option value="all">Tất cả việc</Select.Option>
        </Select>
      </div>

      {filterStatus === 'pending' ? (
        <Row gutter={[16, 16]}>
          {/* Overdue Queue */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <span className="text-red-500 font-bold flex items-center gap-2">
                  <AlertOutlined /> Quá hạn trễ hẹn ({overdueItems.length})
                </span>
              }
              className="shadow-sm border border-red-100 min-h-[500px]"
            >
              <List
                dataSource={overdueItems}
                renderItem={renderListItem}
                locale={{ emptyText: 'Không có việc quá hạn' }}
              />
            </Card>
          </Col>

          {/* Today Queue */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <span className="text-amber-500 font-bold flex items-center gap-2">
                  <ClockCircleOutlined /> Việc cần làm hôm nay ({todayItems.length})
                </span>
              }
              className="shadow-sm border border-default min-h-[500px]"
            >
              <List
                dataSource={todayItems}
                renderItem={renderListItem}
                locale={{ emptyText: 'Không có việc hôm nay' }}
              />
            </Card>
          </Col>

          {/* Upcoming Queue */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <span className="text-blue-500 font-bold flex items-center gap-2">
                  <CalendarOutlined /> Việc sắp tới ({upcomingItems.length})
                </span>
              }
              className="shadow-sm border border-default min-h-[500px]"
            >
              <List
                dataSource={upcomingItems}
                renderItem={renderListItem}
                locale={{ emptyText: 'Không có việc sắp tới' }}
              />
            </Card>
          </Col>
        </Row>
      ) : (
        <Card
          className="shadow-sm border border-default min-h-[500px]"
          title={filterStatus === 'done' ? 'Đầu việc đã hoàn thành' : 'Tất cả đầu việc'}
        >
          <List
            dataSource={filterStatus === 'done' ? doneItems : filtered}
            renderItem={renderListItem}
            locale={{ emptyText: 'Danh sách trống' }}
          />
        </Card>
      )}

      {/* Modal Add/Edit */}
      <Modal
        title={editingAction ? 'Cập nhật Follow-up Action' : 'Thêm việc cần làm (Follow-up Action)'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        okText="Lưu lại"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleSaveAction}>
          <Form.Item
            name="lead_id"
            label="Học viên liên kết"
            rules={[{ required: true, message: 'Vui lòng chọn học viên!' }]}
          >
            <Select showSearch placeholder="Tìm học viên..." optionFilterProp="label">
              {formLeads.map((l) => (
                <Select.Option key={l.id} value={l.id} label={l.name}>
                  {l.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="action_text"
            label="Nội dung đầu việc"
            rules={[{ required: true, message: 'Nhập nội dung cần làm!' }]}
          >
            <Input placeholder="Gọi lại hỏi xem học thử được hôm nào..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="due_date" label="Hạn ngày làm">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="due_time" label="Hạn giờ (không bắt buộc)">
              <DatePicker picker="time" format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item name="pancake_link" label="Đường dẫn cuộc chat Pancake (tùy chọn)">
            <Input placeholder="https://pages.fm/..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

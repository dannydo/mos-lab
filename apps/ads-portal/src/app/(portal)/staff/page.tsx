'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Card, Table, Button, Input, Select, Tag, Space, Spin, Modal, Form, Avatar, message } from 'antd';
import {
  SyncOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

interface StaffUser {
  id: string;
  email: string;
  role: 'admin' | 'partner' | 'teacher' | 'employee';
  display_name?: string;
  avatar_url?: string;
  created_at?: string;
}

export default function StaffPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal forms
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [form] = Form.useForm();

  const loadStaffList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('allowed_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Parse avatar url from composite display_name (format: Name|AvatarUrl)
        const parsed = data.map((u: any) => {
          let name = u.display_name;
          let avatar = undefined;
          if (name && name.includes('|')) {
            const parts = name.split('|');
            name = parts[0];
            avatar = parts[1];
          }
          return {
            ...u,
            display_name: name || undefined,
            avatar_url: avatar || undefined,
          };
        });
        setUsers(parsed);
      }
    } catch (err: any) {
      console.error(err);
      message.error('Lỗi khi tải danh sách nhân sự: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffList();
  }, []);

  const handleSaveUser = async (values: any) => {
    try {
      const displayName = values.display_name || '';
      const avatarUrl = editingUser?.avatar_url || '';
      const finalDisplayName = avatarUrl ? `${displayName}|${avatarUrl}` : displayName;

      const payload = {
        email: values.email,
        role: values.role,
        display_name: finalDisplayName || null,
        updated_at: new Date().toISOString(),
      };

      if (editingUser) {
        const { error } = await supabase.from('allowed_users').update(payload).eq('id', editingUser.id);

        if (error) throw error;
        message.success('Đã cập nhật thông tin nhân sự!');
      } else {
        const { error } = await supabase
          .from('allowed_users')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);

        if (error) throw error;
        message.success('Đã thêm nhân sự mới thành công!');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingUser(null);
      loadStaffList();
    } catch (err: any) {
      message.error('Lỗi khi lưu nhân sự: ' + err.message);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (email === 'danhdo@gmail.com') {
      message.error('Không thể xóa tài khoản Admin hệ thống!');
      return;
    }

    try {
      const { error } = await supabase.from('allowed_users').delete().eq('id', id);

      if (error) throw error;
      message.success('Đã xóa quyền truy cập của nhân sự!');
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      message.error('Lỗi khi xóa nhân sự: ' + err.message);
    }
  };

  const getRoleLabel = (role: string) => {
    const map = { admin: 'Admin', partner: 'Đối tác', teacher: 'Giáo viên', employee: 'Nhân viên' };
    return map[role as keyof typeof map] || role;
  };

  const getRoleColor = (role: string) => {
    const map = { admin: 'red', partner: 'orange', teacher: 'blue', employee: 'default' };
    return map[role as keyof typeof map] || 'default';
  };

  const columns = [
    {
      title: 'Tài khoản Email',
      dataIndex: 'email',
      key: 'email',
      render: (text: string, record: StaffUser) => (
        <div className="flex items-center gap-2.5">
          <Avatar src={record.avatar_url} icon={<UserOutlined />} />
          <span className="font-bold text-heading text-sm">{text}</span>
        </div>
      ),
    },
    {
      title: 'Tên hiển thị',
      dataIndex: 'display_name',
      key: 'display_name',
      render: (text?: string) => (
        <span>{text || <span className="text-gray-400 font-normal italic">Chưa đặt</span>}</span>
      ),
    },
    {
      title: 'Quyền hạn (Role)',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <Tag color={getRoleColor(role)}>{getRoleLabel(role)}</Tag>,
    },
    {
      title: 'Ngày cấp quyền',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text?: string) => (text ? dayjs(text).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: any, record: StaffUser) => {
        const isSelfAdmin = record.email === 'danhdo@gmail.com';
        return (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingUser(record);
                form.setFieldsValue({
                  email: record.email,
                  role: record.role,
                  display_name: record.display_name,
                });
                setModalVisible(true);
              }}
            >
              Sửa
            </Button>
            {!isSelfAdmin ? (
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteUser(record.id, record.email)}
              />
            ) : (
              <span className="text-xs text-secondary font-medium italic">Hệ thống</span>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-default pb-3">
        <div>
          <h1 className="text-xl font-bold text-heading">Team & Roster Management</h1>
          <p className="text-xs text-secondary">Quản lý tài khoản được cấp quyền truy cập cổng Wings Ads Portal</p>
        </div>
        <Space>
          <Button icon={<SyncOutlined spin={loading} />} onClick={loadStaffList}>
            Làm mới
          </Button>
          <Button
            type="primary"
            style={{ backgroundColor: '#b8941f', borderColor: '#b8941f' }}
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingUser(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            Cấp quyền Nhân sự mới
          </Button>
        </Space>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : (
        <Table
          rowKey={(record, index) => record.id || record.email || `staff-${index}`}
          columns={columns}
          dataSource={users}
          pagination={false}
          size="small"
        />
      )}

      {/* Form Modal */}
      <Modal
        title={editingUser ? 'Cập nhật Quyền Nhân sự' : 'Cấp quyền Nhân sự mới'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        okText="Lưu lại"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleSaveUser} initialValues={{ role: 'employee' }}>
          <Form.Item
            name="email"
            label="Địa chỉ Email"
            rules={[{ required: true, type: 'email', message: 'Vui lòng nhập Email hợp lệ!' }]}
          >
            <Input disabled={!!editingUser} placeholder="username@gmail.com" />
          </Form.Item>
          <Form.Item name="display_name" label="Tên hiển thị">
            <Input placeholder="Ví dụ: Bùi Sinh Nguyên" />
          </Form.Item>
          <Form.Item name="role" label="Cấp quyền truy cập">
            <Select>
              <Select.Option value="admin">Admin (Toàn quyền)</Select.Option>
              <Select.Option value="partner">Đối tác (Affiliate/Xem báo cáo)</Select.Option>
              <Select.Option value="teacher">Giáo viên (Chỉ đánh giá học thử)</Select.Option>
              <Select.Option value="employee">Nhân viên / Tư vấn viên (Sales)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

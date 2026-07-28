'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Card, Button, Space, Tag, Select, Typography, Row, Col, Spin, message } from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  TeamOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { apiClient } from '../../../../lib/api-client';

const { Text } = Typography;

import { removeVietnameseTones, vietnameseSearchFilter } from '@mos-lab/shared';
export { removeVietnameseTones };

export interface BookerTeamConfig {
  telesales: string[];
  control_cs: string[];
  other: string[];
}

export const DEFAULT_BOOKER_TEAMS: BookerTeamConfig = {
  telesales: [
    'Mỹ Diệu',
    'Hằng Ni',
    'Thanh Mai',
    'Ngọc Điệp',
    'Thuỳ Trang 🌸',
    'Bích Phượng',
    'Thực Nghi',
    'Cẩm Tiên',
    'Ánh Tuyết',
    'Khánh Cao',
    'Thảo Lý',
    'Kim Ngân',
    'Khanh Cao',
    'Nhung',
    'Ly Trần',
    'Thiên Thiên',
    'Kim Tiên',
    'Phụng',
    'Thuỳ (bác sĩ)',
    'Loan',
    'Yến Mai',
    'Cô Minh',
    'Scarlett Song',
    'Kiwi',
    'Hằng',
    'Tuyết Văn',
    'Ann Thảo',
    'Areum',
    'Trúc',
    'Bảo Anh',
    'Thư',
    'Vy',
  ],
  control_cs: ['Bảo Hân', 'Nguyễn Quang Khải', 'Quang Khải CC', 'Tuyên', 'Khải'],
  other: ['Khách tự đặt (WEB)', 'Trực tiếp', 'Hệ thống'],
};

interface BookerTeamConfigModalProps {
  open: boolean;
  onClose: () => void;
  teamConfig: BookerTeamConfig;
  onSave: (newConfig: BookerTeamConfig) => void;
  themeMode: 'light' | 'dark';
  token: SafeAny;
}

export default function BookerTeamConfigModal({
  open,
  onClose,
  teamConfig,
  onSave,
  themeMode,
  token,
}: BookerTeamConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<BookerTeamConfig>(DEFAULT_BOOKER_TEAMS);
  const [selectedStaffName, setSelectedStaffName] = useState<string | null>(null);
  const [newMemberTeam, setNewMemberTeam] = useState<'telesales' | 'control_cs' | 'other'>('telesales');
  const [hrStaffList, setHrStaffList] = useState<SafeAny[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalConfig(teamConfig && Object.keys(teamConfig).length > 0 ? teamConfig : DEFAULT_BOOKER_TEAMS);
      setLoadingStaff(true);
      apiClient.customers
        .getStaff()
        .then((res: SafeAny[]) => {
          // Rule #20: Deduplicate by trimmed displayName
          const seen = new Set<string>();
          const uniqueStaff = (res || []).filter((s) => {
            const name = (s.displayName || '').trim().toLowerCase();
            if (!name || seen.has(name)) return false;
            seen.add(name);
            return true;
          });
          setHrStaffList(uniqueStaff);
        })
        .catch((err) => {
          console.error('Failed to load HR staff list:', err);
        })
        .finally(() => setLoadingStaff(false));
    }
  }, [open, teamConfig]);

  // Combine real HR staff list + system sources
  const selectableStaffOptions = useMemo(() => {
    const list: { name: string; label: string; currentTeam?: string }[] = [];
    const addedNames = new Set<string>();

    // 1. HR staff
    hrStaffList.forEach((s) => {
      const name = (s.displayName || '').trim();
      if (!name || addedNames.has(name.toLowerCase())) return;
      addedNames.add(name.toLowerCase());

      let currentTeam = '';
      if (localConfig.telesales.some((n) => n.toLowerCase() === name.toLowerCase())) currentTeam = '🛡️ Telesales';
      else if (localConfig.control_cs.some((n) => n.toLowerCase() === name.toLowerCase()))
        currentTeam = '🎧 Control/CS';
      else if (localConfig.other.some((n) => n.toLowerCase() === name.toLowerCase())) currentTeam = '🌐 Khác';

      const usernameStr = s.username ? ` (@${s.username})` : '';
      const teamTag = currentTeam ? ` [${currentTeam}]` : ' [Chưa phân đội]';

      list.push({
        name,
        label: `${name}${usernameStr}${teamTag}`,
        currentTeam,
      });
    });

    // 2. System sources
    const systemSources = ['Khách tự đặt (WEB)', 'Trực tiếp', 'Hệ thống'];
    systemSources.forEach((src) => {
      if (addedNames.has(src.toLowerCase())) return;
      addedNames.add(src.toLowerCase());

      let currentTeam = '';
      if (localConfig.telesales.some((n) => n.toLowerCase() === src.toLowerCase())) currentTeam = '🛡️ Telesales';
      else if (localConfig.control_cs.some((n) => n.toLowerCase() === src.toLowerCase())) currentTeam = '🎧 Control/CS';
      else if (localConfig.other.some((n) => n.toLowerCase() === src.toLowerCase())) currentTeam = '🌐 Khác';

      const teamTag = currentTeam ? ` [${currentTeam}]` : ' [Chưa phân đội]';
      list.push({
        name: src,
        label: `${src}${teamTag}`,
        currentTeam,
      });
    });

    return list.map((item) => ({
      value: item.name,
      label: item.label,
    }));
  }, [hrStaffList, localConfig]);

  const handleAddMember = () => {
    if (!selectedStaffName) {
      message.warning('Vui lòng chọn nhân sự thật từ danh sách HR!');
      return;
    }

    const trimmed = selectedStaffName.trim();

    // Remove from other teams if already exists
    const updated: BookerTeamConfig = {
      telesales: localConfig.telesales.filter((n) => n.toLowerCase() !== trimmed.toLowerCase()),
      control_cs: localConfig.control_cs.filter((n) => n.toLowerCase() !== trimmed.toLowerCase()),
      other: localConfig.other.filter((n) => n.toLowerCase() !== trimmed.toLowerCase()),
    };

    updated[newMemberTeam] = [...updated[newMemberTeam], trimmed];
    setLocalConfig(updated);
    setSelectedStaffName(null);
    message.success(
      `Đã thêm "${trimmed}" vào ${newMemberTeam === 'telesales' ? 'Đội Telesales' : newMemberTeam === 'control_cs' ? 'Control / CS' : 'Khác'}`
    );
  };

  const handleMoveMember = (memberName: string, targetTeam: 'telesales' | 'control_cs' | 'other') => {
    const updated: BookerTeamConfig = {
      telesales: localConfig.telesales.filter((n) => n !== memberName),
      control_cs: localConfig.control_cs.filter((n) => n !== memberName),
      other: localConfig.other.filter((n) => n !== memberName),
    };

    updated[targetTeam] = [...updated[targetTeam], memberName];
    setLocalConfig(updated);
  };

  const handleRemoveMember = (memberName: string) => {
    setLocalConfig({
      telesales: localConfig.telesales.filter((n) => n !== memberName),
      control_cs: localConfig.control_cs.filter((n) => n !== memberName),
      other: localConfig.other.filter((n) => n !== memberName),
    });
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_BOOKER_TEAMS);
    message.info('Đã khôi phục cấu hình đội nhóm mặc định!');
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
    message.success('Đã lưu cấu hình phân đội nhóm thành công!');
  };

  const cardBg = themeMode === 'dark' ? '#141a29' : '#ffffff';
  const borderCol = themeMode === 'dark' ? '#26334d' : '#e2e8f0';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={900}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TeamOutlined style={{ color: '#D4A84B', fontSize: '18px' }} />
          <span>Cấu Hình Phân Đội Nhóm Booker & Telesales</span>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Khôi phục mặc định
          </Button>
          <Space>
            <Button onClick={onClose}>Hủy</Button>
            <Button
              type="primary"
              onClick={handleSave}
              style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000', fontWeight: 'bold' }}
            >
              Lưu cấu hình
            </Button>
          </Space>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
        {/* ADD MEMBER SELECT BAR */}
        <Card size="small" style={{ background: themeMode === 'dark' ? '#0f172a' : '#f8fafc', borderColor: borderCol }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Thêm nhân sự thật từ HR:</span>
            <Select
              showSearch
              loading={loadingStaff}
              placeholder="Tìm & chọn nhân sự HR thật..."
              value={selectedStaffName}
              onChange={setSelectedStaffName}
              filterOption={vietnameseSearchFilter}
              options={selectableStaffOptions}
              style={{ width: '320px' }}
              notFoundContent={loadingStaff ? <Spin size="small" /> : 'Không tìm thấy nhân sự'}
            />
            <Select
              value={newMemberTeam}
              onChange={setNewMemberTeam}
              options={[
                { value: 'telesales', label: '🛡️ Đội Telesales' },
                { value: 'control_cs', label: '🎧 Control / CS' },
                { value: 'other', label: '🌐 Khác (Web/Direct)' },
              ]}
              style={{ width: '170px' }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMember}>
              Thêm vào đội
            </Button>
          </div>
        </Card>

        {/* 3 TEAM COLUMNS */}
        <Row gutter={[16, 16]}>
          {/* COLUMN 1: TELESALES */}
          <Col xs={24} md={8}>
            <Card
              size="small"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#0284c7' }}>🛡️ Đội Telesales</span>
                  <Tag color="processing">{localConfig.telesales.length} người</Tag>
                </div>
              }
              style={{ background: cardBg, borderColor: borderCol, height: '100%' }}
              styles={{ body: { padding: '12px' } }}
            >
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}
              >
                {localConfig.telesales.length === 0 ? (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Chưa có nhân sự nào.
                  </Text>
                ) : (
                  localConfig.telesales.map((name) => (
                    <div
                      key={name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: themeMode === 'dark' ? '#1e293b' : '#f1f5f9',
                        border: `1px solid ${borderCol}`,
                        fontSize: '12px',
                      }}
                    >
                      <Space size="small">
                        <UserOutlined style={{ color: '#0284c7' }} />
                        <span style={{ fontWeight: '600' }}>{name}</span>
                      </Space>

                      <Space size="small">
                        <Select
                          size="small"
                          variant="borderless"
                          value="telesales"
                          onChange={(val) => handleMoveMember(name, val as 'telesales' | 'control_cs' | 'other')}
                          options={[
                            { value: 'telesales', label: 'Telesales' },
                            { value: 'control_cs', label: 'Control/CS' },
                            { value: 'other', label: 'Khác' },
                          ]}
                          style={{ width: '90px', fontSize: '11px' }}
                        />
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveMember(name)}
                          title="Xóa khỏi đội"
                        />
                      </Space>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </Col>

          {/* COLUMN 2: CONTROL / CS */}
          <Col xs={24} md={8}>
            <Card
              size="small"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#D4A84B' }}>🎧 Control / CS</span>
                  <Tag color="warning">{localConfig.control_cs.length} người</Tag>
                </div>
              }
              style={{ background: cardBg, borderColor: borderCol, height: '100%' }}
              styles={{ body: { padding: '12px' } }}
            >
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}
              >
                {localConfig.control_cs.length === 0 ? (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Chưa có nhân sự nào.
                  </Text>
                ) : (
                  localConfig.control_cs.map((name) => (
                    <div
                      key={name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: themeMode === 'dark' ? '#1e293b' : '#f1f5f9',
                        border: `1px solid ${borderCol}`,
                        fontSize: '12px',
                      }}
                    >
                      <Space size="small">
                        <UserOutlined style={{ color: '#D4A84B' }} />
                        <span style={{ fontWeight: '600' }}>{name}</span>
                      </Space>

                      <Space size="small">
                        <Select
                          size="small"
                          variant="borderless"
                          value="control_cs"
                          onChange={(val) => handleMoveMember(name, val as 'telesales' | 'control_cs' | 'other')}
                          options={[
                            { value: 'telesales', label: 'Telesales' },
                            { value: 'control_cs', label: 'Control/CS' },
                            { value: 'other', label: 'Khác' },
                          ]}
                          style={{ width: '90px', fontSize: '11px' }}
                        />
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveMember(name)}
                          title="Xóa khỏi đội"
                        />
                      </Space>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </Col>

          {/* COLUMN 3: KHÁC */}
          <Col xs={24} md={8}>
            <Card
              size="small"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#8c8c8c' }}>🌐 Khác (Web/Direct)</span>
                  <Tag>{localConfig.other.length} nguồn</Tag>
                </div>
              }
              style={{ background: cardBg, borderColor: borderCol, height: '100%' }}
              styles={{ body: { padding: '12px' } }}
            >
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}
              >
                {localConfig.other.length === 0 ? (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Chưa có mục nào.
                  </Text>
                ) : (
                  localConfig.other.map((name) => (
                    <div
                      key={name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: themeMode === 'dark' ? '#1e293b' : '#f1f5f9',
                        border: `1px solid ${borderCol}`,
                        fontSize: '12px',
                      }}
                    >
                      <Space size="small">
                        <UserOutlined style={{ color: '#8c8c8c' }} />
                        <span style={{ fontWeight: '600' }}>{name}</span>
                      </Space>

                      <Space size="small">
                        <Select
                          size="small"
                          variant="borderless"
                          value="other"
                          onChange={(val) => handleMoveMember(name, val as 'telesales' | 'control_cs' | 'other')}
                          options={[
                            { value: 'telesales', label: 'Telesales' },
                            { value: 'control_cs', label: 'Control/CS' },
                            { value: 'other', label: 'Khác' },
                          ]}
                          style={{ width: '90px', fontSize: '11px' }}
                        />
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveMember(name)}
                          title="Xóa khỏi đội"
                        />
                      </Space>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </Modal>
  );
}

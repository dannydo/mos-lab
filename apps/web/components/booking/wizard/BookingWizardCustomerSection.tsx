'use client';

import React from 'react';
import { Button, Card, Input, Radio, Select, Switch, Tag } from 'antd';
import { PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { CopyPhoneButton } from '../../ui';

interface BookingWizardCustomerSectionProps {
  themeMode: 'light' | 'dark';
  colorText: string;
  isNewLead: boolean;
  onChangeLeadMode: (isNew: boolean) => void;
  onOpenCreateCustomerModal: () => void;
  searchQuery: string;
  searchingCustomers: boolean;
  customerList: SafeAny[];
  selectedCustomer: SafeAny;
  onSearchCustomers: (val: string) => void;
  onSelectCustomer: (customer: SafeAny) => void;
  leadName: string;
  onChangeLeadName: (val: string) => void;
  leadPhone: string;
  onChangeLeadPhone: (val: string) => void;
  isForeignCustomer: boolean;
  onChangeForeignCustomer: (checked: boolean) => void;
}

export const BookingWizardCustomerSection: React.FC<BookingWizardCustomerSectionProps> = ({
  themeMode,
  colorText,
  isNewLead,
  onChangeLeadMode,
  onOpenCreateCustomerModal,
  searchQuery,
  searchingCustomers,
  customerList,
  selectedCustomer,
  onSearchCustomers,
  onSelectCustomer,
  leadName,
  onChangeLeadName,
  leadPhone,
  onChangeLeadPhone,
  isForeignCustomer,
  onChangeForeignCustomer,
}) => {
  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '13px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
            <UserOutlined /> THÔNG TIN KHÁCH HÀNG
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <Button size="small" type="dashed" icon={<UserOutlined />} onClick={onOpenCreateCustomerModal}>
              Thêm khách, chưa đặt lịch
            </Button>
            <Radio.Group
              size="small"
              value={isNewLead ? 'new' : 'existing'}
              onChange={(e) => onChangeLeadMode(e.target.value === 'new')}
            >
              <Radio.Button value="existing">Khách hàng cũ</Radio.Button>
              <Radio.Button value="new">Khách mới</Radio.Button>
            </Radio.Group>
          </div>
        </div>
      }
      styles={{ body: { padding: '16px' } }}
      style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff', borderColor: '#e5e7eb' }}
    >
      {!isNewLead ? (
        <div>
          <Select
            showSearch
            placeholder="Tìm kiếm khách hàng bằng tên hoặc SĐT..."
            filterOption={false}
            onSearch={onSearchCustomers}
            loading={searchingCustomers}
            style={{ width: '100%' }}
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            onChange={(val) => {
              const cust = customerList.find((c) => c.id === val);
              onSelectCustomer(cust);
            }}
            notFoundContent={searchQuery ? 'Không tìm thấy khách hàng nào' : null}
            options={customerList.map((c) => ({
              value: c.id,
              label: `${c.name} - ${c.phone} (Mã: ${c.id})`,
            }))}
          />

          {selectedCustomer && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px',
                background: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.05)' : '#fdf9f0',
                border: '1px solid #ffe58f',
                borderRadius: '6px',
              }}
            >
              <div style={{ fontWeight: 'bold', color: colorText }}>{selectedCustomer.name}</div>
              <div
                style={{ fontSize: '12px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}
                className="flex items-center gap-1"
              >
                <span>SĐT: {selectedCustomer.phone}</span>
                <CopyPhoneButton phone={selectedCustomer.phone} size="xs" />
                <span>| Phân loại:</span>
                <Tag color="warning">{selectedCustomer.bucket}</Tag>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Input
            placeholder="Tên khách hàng mới"
            prefix={<UserOutlined />}
            value={leadName}
            onChange={(e) => onChangeLeadName(e.target.value)}
          />
          <Input
            placeholder="Số điện thoại khách"
            prefix={<PhoneOutlined />}
            value={leadPhone}
            onChange={(e) => onChangeLeadPhone(e.target.value)}
          />
        </div>
      )}

      <div
        style={{
          marginTop: '10px',
          paddingTop: '8px',
          borderTop: `1px dashed ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 600, color: colorText }}>🌐 Khách nước ngoài</span>
        <Switch checked={isForeignCustomer} onChange={(checked) => onChangeForeignCustomer(checked)} size="small" />
      </div>
    </Card>
  );
};

'use client';

import React from 'react';
import { Modal, Table, Button, Input, Space, Tooltip, Popconfirm } from 'antd';
import { SettingOutlined, PlusOutlined, FilterOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { SafeAny } from '@mos-lab/shared';
import { renderSeverityDot } from '../../types/qa-shop.types';

interface ManageItemsModalProps {
  open: boolean;
  selectedBranch: string;
  activeTemplate: SafeAny | null;
  manageSearchText: string;
  onSearchChange: (text: string) => void;
  onAddNewItem: () => void;
  onEditItem: (record: SafeAny, sectionId?: string) => void;
  onDeleteItem: (itemId: string) => void;
  onClose: () => void;
}

export const ManageItemsModal: React.FC<ManageItemsModalProps> = ({
  open,
  selectedBranch,
  activeTemplate,
  manageSearchText,
  onSearchChange,
  onAddNewItem,
  onEditItem,
  onDeleteItem,
  onClose,
}) => {
  const dataSource = (activeTemplate?.sections
    ?.flatMap((sec: SafeAny) =>
      (sec.items || []).map((itm: SafeAny) => ({
        ...itm,
        key: itm.id,
        sectionId: sec.id,
        sectionTitle: sec.title,
      }))
    )
    .filter((itm: SafeAny) => {
      if (!manageSearchText) return true;
      const q = manageSearchText.toLowerCase();
      return (
        (itm.title || '').toLowerCase().includes(q) ||
        (itm.standardRequirement || '').toLowerCase().includes(q) ||
        (itm.sectionTitle || '').toLowerCase().includes(q) ||
        (itm.area || '').toLowerCase().includes(q)
      );
    }) || []) as SafeAny[];

  return (
    <Modal
      title={
        <div className="flex items-center justify-between pr-6">
          <span className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-200">
            <SettingOutlined className="text-blue-500" /> Bảng Quản Lý Tiêu Chí Kiểm Tra QA ({selectedBranch})
          </span>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={onAddNewItem}
            className="bg-emerald-600 hover:bg-emerald-500 font-medium text-xs"
          >
            Thêm Tiêu Chí Mới
          </Button>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnHidden
      getContainer={() => document.body}
    >
      <div className="space-y-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <Input
            placeholder="Tìm kiếm tiêu chí theo tên, mô tả, phân vùng..."
            prefix={<FilterOutlined className="text-slate-400 text-xs" />}
            value={manageSearchText}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            size="small"
            className="max-w-md text-xs"
          />
          <span className="text-xs text-slate-500 tabular-nums">
            Tổng số:{' '}
            {activeTemplate?.sections?.reduce((acc: number, s: SafeAny) => acc + (s.items?.length || 0), 0) || 0} tiêu
            chí
          </span>
        </div>

        <Table
          dataSource={dataSource}
          columns={[
            {
              title: 'Nhóm Tiêu Chí',
              dataIndex: 'sectionTitle',
              key: 'sectionTitle',
              width: 180,
              render: (val: string) => (
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{val}</span>
              ),
            },
            {
              title: 'Tên Tiêu Chí',
              dataIndex: 'title',
              key: 'title',
              render: (val: string, record: SafeAny) => (
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{val}</div>
                  {record.area && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
                      [{record.area}]
                    </span>
                  )}
                </div>
              ),
            },
            {
              title: 'Yêu Cầu Chuẩn',
              dataIndex: 'standardRequirement',
              key: 'standardRequirement',
              render: (val: string) => (
                <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{val || '-'}</span>
              ),
            },
            {
              title: 'Mức Độ',
              dataIndex: 'severity',
              key: 'severity',
              width: 110,
              render: (val: string) => renderSeverityDot(val),
            },
            {
              title: 'SL',
              dataIndex: 'unitQty',
              key: 'unitQty',
              width: 60,
              align: 'center',
              render: (val: number, record: SafeAny) => (
                <span className="text-xs font-bold tabular-nums">{val || record.weight || 1}</span>
              ),
            },
            {
              title: 'Hành Động',
              key: 'actions',
              width: 100,
              align: 'center',
              render: (_: any, record: SafeAny) => (
                <Space size="small">
                  <Tooltip title="Chỉnh sửa">
                    <Button
                      size="small"
                      type="text"
                      icon={<EditOutlined className="text-blue-600 text-xs" />}
                      onClick={() => onEditItem(record, record.sectionId)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="Xóa tiêu chí này?"
                    onConfirm={() => onDeleteItem(record.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true, size: 'small' }}
                    cancelButtonProps={{ size: 'small' }}
                  >
                    <Tooltip title="Xóa">
                      <Button size="small" type="text" danger icon={<DeleteOutlined className="text-xs" />} />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          pagination={{ pageSize: 8, size: 'small', showSizeChanger: false }}
          size="small"
          className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
        />
      </div>
    </Modal>
  );
};

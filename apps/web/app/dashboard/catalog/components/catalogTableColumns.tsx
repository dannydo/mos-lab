'use client';

import React from 'react';
import { Button, Popconfirm, Space, Switch, Tooltip, Typography } from 'antd';
import { Pencil, Trash2 } from 'lucide-react';
import type { CatalogProduct, CatalogService, CatalogServicePrice } from '@mos-lab/shared';
import { AppIcon, StatusTag, type StatusType } from '../../../../components/ui';
import { formatCatalogCurrency, getLashStyleStatusType, inferLashCount, inferLashStyle } from './catalogHelpers';
import catalogStyles from '../catalog.module.css';

const { Text } = Typography;

const SERVICE_TYPE_BADGE_MAP: Record<string, { status: StatusType; label: string }> = {
  Normal: { status: 'processing', label: 'Normal (Nối mới)' },
  Retain: { status: 'purple', label: 'Retain (Dặm mi)' },
  Fix: { status: 'orange', label: 'Fix (Sửa mi hỏng)' },
  Adjust: { status: 'warning', label: 'Adjust (Chỉnh dáng)' },
  Log: { status: 'cyan', label: 'Log (Ghi nhận)' },
  Removal: { status: 'error', label: 'Removal (Tháo mi)' },
  Product: { status: 'processing', label: 'Product' },
};

const isCatalogProductService = (record: CatalogService) =>
  record.serviceGroup === 'Product' || record.serviceType === 'Product' || record.serviceKey === 'any-service-product';

interface ServiceColumnHandlers {
  onToggleStatus: (id: number, currentDisabled: boolean) => void;
  onOpenDrawer: (record: CatalogService) => void;
  onDelete: (id: number) => void;
}

export function buildServiceColumns({ onToggleStatus, onOpenDrawer, onDelete }: ServiceColumnHandlers) {
  return [
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      width: 80,
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums font-semibold">{val}</span>,
    },
    {
      title: 'Tên dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      render: (text: string, record: CatalogService) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text || record.serviceKey}</Text>
          <Text type="secondary" className="text-xs">
            {record.serviceKey}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Loại dịch vụ',
      dataIndex: 'serviceType',
      key: 'serviceType',
      render: (type: string) => {
        const badge = SERVICE_TYPE_BADGE_MAP[type] || { status: 'processing' as const, label: type };
        return <StatusTag status={badge.status} label={badge.label} />;
      },
    },
    {
      title: 'Nhóm',
      dataIndex: 'serviceGroup',
      key: 'serviceGroup',
      render: (group: string) => <StatusTag status="processing" label={group} />,
    },
    {
      title: 'Dòng mi',
      dataIndex: 'lashStyle',
      key: 'lashStyle',
      render: (style: string, record: CatalogService) => {
        if (isCatalogProductService(record)) {
          return <span className="text-slate-400">-</span>;
        }
        const displayStyle = style || inferLashStyle(record.serviceKey, record.serviceName);
        return displayStyle ? (
          <StatusTag status={getLashStyleStatusType(displayStyle)} label={displayStyle} />
        ) : (
          <span className="text-slate-400">-</span>
        );
      },
    },
    {
      title: 'Số sợi mi',
      dataIndex: 'lashCount',
      key: 'lashCount',
      align: 'right' as const,
      render: (count: number | null, record: CatalogService) => {
        if (isCatalogProductService(record)) {
          return <span className="text-slate-400">-</span>;
        }
        const displayCount = count || inferLashCount(record.serviceKey, record.serviceName);
        return displayCount ? (
          <StatusTag status="processing" label={`${displayCount} sợi`} className="tabular-nums font-medium" />
        ) : (
          <span className="text-slate-400">-</span>
        );
      },
    },
    {
      title: 'Thời lượng (phút)',
      dataIndex: 'durationMinute',
      key: 'durationMinute',
      align: 'right' as const,
      render: (val: number) => <span className="tabular-nums">{val}</span>,
    },
    {
      title: 'Giá bán lẻ',
      key: 'servicePrice',
      align: 'right' as const,
      render: (_: unknown, record: CatalogService) => {
        const price = record.prices && record.prices.length > 0 ? record.prices[0].servicePrice : undefined;
        return (
          <span className={`tabular-nums font-semibold ${catalogStyles.retailPrice}`}>
            {formatCatalogCurrency(price)}
          </span>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isDisabled',
      key: 'isDisabled',
      align: 'center' as const,
      render: (isDisabled: boolean, record: CatalogService) => (
        <Switch checked={!isDisabled} size="small" onChange={() => onToggleStatus(record.id, isDisabled)} />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      width: 120,
      render: (_: unknown, record: CatalogService) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button type="link" icon={<AppIcon icon={Pencil} size="sm" />} onClick={() => onOpenDrawer(record)} />
          </Tooltip>
          <Popconfirm
            title="Vô hiệu hóa dịch vụ"
            description="Bạn có chắc chắn muốn vô hiệu hóa dịch vụ này không?"
            onConfirm={() => onDelete(record.id)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Tooltip title="Vô hiệu hóa">
              <Button
                type="text"
                danger
                icon={<AppIcon icon={Trash2} size="sm" />}
                aria-label="Xóa danh mục"
                title="Xóa danh mục"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];
}

interface ComboColumnHandlers {
  onToggleStatus: (id: number, currentDisabled: boolean) => void;
  onOpenDrawer: (record: CatalogServicePrice) => void;
  onDelete: (id: number) => void;
}

export function buildComboColumns({ onToggleStatus, onOpenDrawer, onDelete }: ComboColumnHandlers) {
  return [
    {
      title: 'Tên gói',
      dataIndex: 'servicePricePackageKey',
      key: 'servicePricePackageKey',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Loại giá',
      dataIndex: 'servicePriceType',
      key: 'servicePriceType',
      render: (type: string) => <StatusTag status="purple" label={type} />,
    },
    {
      title: 'Giá gói',
      dataIndex: 'servicePrice',
      key: 'servicePrice',
      align: 'right' as const,
      render: (val: number) => (
        <span className={`tabular-nums ${catalogStyles.comboPrice}`}>{formatCatalogCurrency(val)}</span>
      ),
    },
    {
      title: '✦ Lượt nối',
      key: 'normalCount',
      align: 'center' as const,
      render: (_: unknown, record: CatalogServicePrice) => {
        const hasBonus = (record.bonusNormalCount || 0) > 0;
        return (
          <Space direction="vertical" size={2} align="center">
            <span className="tabular-nums font-medium">
              {hasBonus ? `✦ ${record.normalCount} mua` : `✦ ${record.normalCount}`}
            </span>
            {hasBonus && <StatusTag status="success" label={`+✦ ${record.bonusNormalCount} tặng`} />}
          </Space>
        );
      },
    },
    {
      title: '↻ Lượt dặm',
      key: 'retainCount',
      align: 'center' as const,
      render: (_: unknown, record: CatalogServicePrice) => {
        const hasBonus = (record.bonusRetainCount || 0) > 0;
        return (
          <Space direction="vertical" size={2} align="center">
            <span className="tabular-nums font-medium">
              {hasBonus ? `↻ ${record.retainCount} mua` : `↻ ${record.retainCount}`}
            </span>
            {hasBonus && <StatusTag status="cyan" label={`+↻ ${record.bonusRetainCount} tặng`} />}
          </Space>
        );
      },
    },
    {
      title: 'Hạn (ngày)',
      dataIndex: 'expiryAfterDay',
      key: 'expiryAfterDay',
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums">{val}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isDisabled',
      key: 'isDisabled',
      align: 'center' as const,
      render: (isDisabled: boolean, record: CatalogServicePrice) => (
        <Switch checked={!isDisabled} size="small" onChange={() => onToggleStatus(record.id, isDisabled)} />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      width: 120,
      render: (_: unknown, record: CatalogServicePrice) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button type="link" icon={<AppIcon icon={Pencil} size="sm" />} onClick={() => onOpenDrawer(record)} />
          </Tooltip>
          <Popconfirm
            title="Vô hiệu hóa gói combo"
            description="Bạn có chắc chắn muốn vô hiệu hóa gói combo này không?"
            onConfirm={() => onDelete(record.id)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Tooltip title="Vô hiệu hóa">
              <Button type="text" danger icon={<AppIcon icon={Trash2} size="sm" />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];
}

interface ProductColumnHandlers {
  onToggleStatus: (id: number, currentDisabled: boolean) => void;
  onOpenDrawer: (record: CatalogProduct) => void;
  onDelete: (id: number) => void;
}

export function buildProductColumns({ onToggleStatus, onOpenDrawer, onDelete }: ProductColumnHandlers) {
  return [
    {
      title: 'SKU',
      dataIndex: 'productSku',
      key: 'productSku',
      render: (text: string) => <Text type="secondary">{text}</Text>,
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'productName',
      key: 'productName',
      render: (text: string, record: CatalogProduct) => <Text strong>{text || record.productSku}</Text>,
    },
    {
      title: 'Giá',
      dataIndex: 'productPrice',
      key: 'productPrice',
      align: 'right' as const,
      render: (val: number) => (
        <span className={`tabular-nums font-bold ${catalogStyles.retailPrice}`}>{formatCatalogCurrency(val)}</span>
      ),
    },
    {
      title: 'Tồn kho',
      dataIndex: 'inStockCount',
      key: 'inStockCount',
      align: 'center' as const,
      render: (inStock: number = 0, record: CatalogProduct) => {
        const total = record.totalStockCount || 0;
        if (inStock > 0) {
          return (
            <Tooltip title={`Tồn mới: ${inStock} / Tổng lịch sử nhập: ${total}`}>
              <StatusTag status="success" label={`${inStock} sẵn có`} className="font-semibold tabular-nums" />
            </Tooltip>
          );
        }
        return (
          <Tooltip title={`Đã hết tồn kho mới. Tổng lịch sử nhập: ${total}`}>
            <StatusTag status="default" label={`Hết hàng (${total})`} className="opacity-60 tabular-nums" />
          </Tooltip>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isDisabled',
      key: 'isDisabled',
      align: 'center' as const,
      render: (isDisabled: boolean, record: CatalogProduct) => (
        <Switch checked={!isDisabled} size="small" onChange={() => onToggleStatus(record.id, isDisabled)} />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      width: 120,
      render: (_: unknown, record: CatalogProduct) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button type="link" icon={<AppIcon icon={Pencil} size="sm" />} onClick={() => onOpenDrawer(record)} />
          </Tooltip>
          <Popconfirm
            title="Vô hiệu hóa sản phẩm"
            description="Bạn có chắc chắn muốn vô hiệu hóa sản phẩm này không?"
            onConfirm={() => onDelete(record.id)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Tooltip title="Vô hiệu hóa">
              <Button type="text" danger icon={<AppIcon icon={Trash2} size="sm" />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];
}

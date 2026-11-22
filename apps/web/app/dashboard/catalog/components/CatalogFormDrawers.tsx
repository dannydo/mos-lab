'use client';

import React from 'react';
import { Button, Col, Form, Input, InputNumber, Row, Select } from 'antd';
import type { FormInstance } from 'antd';
import {
  type CatalogProduct,
  type CatalogService,
  type CatalogServicePrice,
  type SafeAny,
  vietnameseSearchFilter,
} from '@mos-lab/shared';
import { AdaptiveDrawer } from '../../../../components/ui';
import {
  CATALOG_GROUP_LABELS,
  CATALOG_TYPE_LABELS,
  LASH_STYLE_OPTIONS,
  inferLashCount,
  inferLashStyle,
} from './catalogHelpers';
import catalogStyles from '../catalog.module.css';

const { TextArea } = Input;

interface CatalogServiceDrawerProps {
  open: boolean;
  saving: boolean;
  editingService: CatalogService | null;
  form: FormInstance;
  dynamicGroups: string[];
  dynamicTypes: string[];
  onClose: () => void;
  onFinish: (values: SafeAny) => void;
}

export function CatalogServiceDrawer({
  open,
  saving,
  editingService,
  form,
  dynamicGroups,
  dynamicTypes,
  onClose,
  onFinish,
}: CatalogServiceDrawerProps) {
  return (
    <AdaptiveDrawer
      intent="form"
      title={editingService ? 'Chỉnh sửa Dịch vụ' : 'Thêm Dịch Vụ Mới'}
      open={open}
      onClose={onClose}
      width={480}
      extra={
        <Button type="primary" loading={saving} onClick={() => form.submit()}>
          Lưu Dịch Vụ
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={(changedValues, allValues) => {
          const key = allValues.serviceKey;
          const name = allValues.serviceName;
          const type = allValues.serviceType;
          const group = allValues.serviceGroup;
          const isProd = group === 'Product' || type === 'Product' || key === 'any-service-product';

          if (isProd) {
            form.setFieldsValue({ lashStyle: undefined, lashCount: undefined });
            return;
          }

          if (
            changedValues.serviceKey !== undefined ||
            changedValues.serviceName !== undefined ||
            changedValues.serviceType !== undefined ||
            changedValues.serviceGroup !== undefined
          ) {
            const inferredStyle = changedValues.lashStyle || inferLashStyle(key, name);
            const inferredCount = inferLashCount(key, name);
            const updates: SafeAny = {};
            updates.lashStyle = inferredStyle || undefined;
            updates.lashCount = inferredCount || undefined;

            const noTouchupStyles = ['Mink', 'Ivylight', 'Flawless'];
            if (inferredStyle && noTouchupStyles.includes(inferredStyle) && type === 'Retain') {
              updates.durationMinute = 103;
              updates.durationMinuteStandard = 103;
            }

            form.setFieldsValue(updates);
          }
        }}
      >
        <Form.Item
          name="serviceName"
          label="Tên dịch vụ"
          rules={[{ required: true, message: 'Vui lòng nhập tên dịch vụ' }]}
        >
          <Input placeholder="Ví dụ: Classic 390" />
        </Form.Item>

        <Form.Item
          name="serviceKey"
          label="Mã SKU / Service Key"
          rules={[{ required: true, message: 'Vui lòng nhập mã key' }]}
        >
          <Input placeholder="Ví dụ: classic-390" disabled={!!editingService} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="serviceGroup" label="Nhóm dịch vụ" rules={[{ required: true }]}>
              <Select options={dynamicGroups.map((g) => ({ value: g, label: CATALOG_GROUP_LABELS[g] || g }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="serviceType" label="Loại dịch vụ" rules={[{ required: true }]}>
              <Select options={dynamicTypes.map((t) => ({ value: t, label: CATALOG_TYPE_LABELS[t] || t }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="lashStyle" label="Dòng mi">
              <Select options={LASH_STYLE_OPTIONS} placeholder="Chọn Dòng Mi" allowClear />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="durationMinute" label="Thời lượng (phút)" rules={[{ required: true }]}>
              <InputNumber min={5} max={300} className="w-full" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="lashCount" label="Số sợi mi">
              <Select
                options={[30, 60, 70, 80, 90, 100, 120, 140].map((c) => ({ value: c, label: `${c} sợi` }))}
                placeholder="Chọn số sợi"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="servicePrice" label="Giá bán lẻ (VNĐ)">
              <InputNumber
                min={0}
                step={10000}
                className="w-full"
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="serviceDescription" label="Mô tả chi tiết">
          <TextArea rows={3} placeholder="Nhập mô tả chi tiết dịch vụ..." />
        </Form.Item>
      </Form>
    </AdaptiveDrawer>
  );
}

interface CatalogComboDrawerProps {
  open: boolean;
  saving: boolean;
  editingCombo: CatalogServicePrice | null;
  form: FormInstance;
  services: CatalogService[];
  onClose: () => void;
  onFinish: (values: SafeAny) => void;
  onValuesChange: (changedValues: SafeAny, allValues: SafeAny) => void;
}

export function CatalogComboDrawer({
  open,
  saving,
  editingCombo,
  form,
  services,
  onClose,
  onFinish,
  onValuesChange,
}: CatalogComboDrawerProps) {
  return (
    <AdaptiveDrawer
      intent="form"
      title={editingCombo ? 'Chỉnh sửa Gói Combo' : 'Thêm Gói Combo Mới'}
      open={open}
      onClose={onClose}
      width={480}
      extra={
        <Button type="primary" loading={saving} onClick={() => form.submit()}>
          Lưu Gói Combo
        </Button>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={onValuesChange}>
        <Form.Item
          name="servicePricePackageKey"
          label="Tên gói Combo (Package Key)"
          rules={[{ required: true, message: 'Vui lòng nhập tên gói combo' }]}
        >
          <Input placeholder="Ví dụ: 7+3-classic-volume" />
        </Form.Item>

        <Form.Item
          name="serviceId"
          label="Dịch vụ áp dụng"
          rules={[{ required: true, message: 'Vui lòng chọn dịch vụ áp dụng' }]}
        >
          <Select
            showSearch
            placeholder="Chọn dịch vụ"
            filterOption={vietnameseSearchFilter}
            options={services.map((s) => ({
              value: s.id,
              label: `${s.serviceName || s.serviceKey} (${s.serviceGroup})`,
            }))}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Loại gói">
              <Input value="Gói Combo" disabled className={catalogStyles.comboPackageReadonly} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="servicePrice" label="Giá trọn gói (VNĐ)" rules={[{ required: true }]}>
              <InputNumber
                min={0}
                step={50000}
                className="w-full"
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="normalCount" label="Số lượt nối (Mua)" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} className="w-full" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="bonusNormalCount" label="Lượt nối tặng (+)">
              <InputNumber min={0} max={100} className="w-full" placeholder="0" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="retainCount" label="Số lượt dặm (Mua)" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} className="w-full" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="bonusRetainCount" label="Lượt dặm tặng (+)">
              <InputNumber min={0} max={100} className="w-full" placeholder="0" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="expiryAfterDay" label="Hạn sử dụng (ngày)" rules={[{ required: true }]}>
          <InputNumber min={1} max={1000} className="w-full" placeholder="Ví dụ: 180" />
        </Form.Item>
      </Form>
    </AdaptiveDrawer>
  );
}

interface CatalogProductDrawerProps {
  open: boolean;
  saving: boolean;
  editingProduct: CatalogProduct | null;
  form: FormInstance;
  onClose: () => void;
  onFinish: (values: SafeAny) => void;
}

export function CatalogProductDrawer({
  open,
  saving,
  editingProduct,
  form,
  onClose,
  onFinish,
}: CatalogProductDrawerProps) {
  return (
    <AdaptiveDrawer
      intent="form"
      title={editingProduct ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản Phẩm Mới'}
      open={open}
      onClose={onClose}
      width={480}
      extra={
        <Button type="primary" loading={saving} onClick={() => form.submit()}>
          Lưu Sản Phẩm
        </Button>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="productName"
          label="Tên sản phẩm"
          rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
        >
          <Input placeholder="Ví dụ: Lipstick Supreme Matte RD 144" />
        </Form.Item>

        <Form.Item
          name="productSku"
          label="Mã SKU sản phẩm"
          rules={[{ required: true, message: 'Vui lòng nhập mã SKU' }]}
        >
          <Input placeholder="Ví dụ: lipstick-144" disabled={!!editingProduct} />
        </Form.Item>

        <Form.Item name="productPrice" label="Giá bán lẻ (VNĐ)" rules={[{ required: true }]}>
          <InputNumber
            min={0}
            step={10000}
            className="w-full"
            formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          />
        </Form.Item>
      </Form>
    </AdaptiveDrawer>
  );
}

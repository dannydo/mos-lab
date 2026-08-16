'use client';

import React from 'react';
import { Card, Row, Col, Typography, theme } from 'antd';
import { ShopOutlined, AppstoreOutlined, ProjectOutlined, TagOutlined } from '@ant-design/icons';
import { CatalogReportSummary } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';

const { Text } = Typography;

interface CatalogReportHeaderProps {
  summary: CatalogReportSummary | null;
  loading?: boolean;
}

export default function CatalogReportHeader({ summary, loading = false }: CatalogReportHeaderProps) {
  const { themeMode } = useTheme();

  const isDark = themeMode === 'dark';

  return (
    <Row gutter={[16, 16]} className="mb-6">
      {/* Total Revenue Card */}
      <Col xs={24} sm={12} lg={6}>
        <Card
          loading={loading}
          size="small"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(180, 83, 9, 0.05) 100%)'
              : 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
          }}
          className="rounded-xl shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              ∑ Doanh Thu Catalog
            </Text>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
              <ShopOutlined className="text-base" />
            </div>
          </div>
          <div className="tabular-nums text-xl font-extrabold text-amber-500 dark:text-amber-400">
            {Math.round(summary?.totalRevenue || 0).toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
            <span>
              Đã bán:{' '}
              <strong className="tabular-nums text-slate-700 dark:text-slate-300">
                {summary?.totalUnitsSold || 0}
              </strong>{' '}
              lượt/món
            </span>
            <span>({summary?.totalOrdersCount || 0} mục có doanh số)</span>
          </div>
        </Card>
      </Col>

      {/* Single Service Revenue Card */}
      <Col xs={24} sm={12} lg={6}>
        <Card
          loading={loading}
          size="small"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(29, 78, 216, 0.05) 100%)'
              : 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
          }}
          className="rounded-xl shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Doanh Số Single
            </Text>
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
              <AppstoreOutlined className="text-base" />
            </div>
          </div>
          <div className="tabular-nums text-xl font-extrabold text-blue-500 dark:text-blue-400">
            {Math.round(summary?.singleServiceRevenue || 0).toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Dịch vụ làm lẻ trực tiếp tại tiệm</div>
        </Card>
      </Col>

      {/* Combo Revenue Card */}
      <Col xs={24} sm={12} lg={6}>
        <Card
          loading={loading}
          size="small"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(126, 34, 206, 0.05) 100%)'
              : 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
            borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : '#DDD6FE',
          }}
          className="rounded-xl shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Doanh Số Combo
            </Text>
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-500">
              <ProjectOutlined className="text-base" />
            </div>
          </div>
          <div className="tabular-nums text-xl font-extrabold text-purple-500 dark:text-purple-400">
            {Math.round(summary?.comboRevenue || 0).toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Khách đăng ký mua gói combo mới</div>
        </Card>
      </Col>

      {/* Product Revenue Card */}
      <Col xs={24} sm={12} lg={6}>
        <Card
          loading={loading}
          size="small"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(4, 120, 87, 0.05) 100%)'
              : 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
          }}
          className="rounded-xl shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Doanh Số Sản Phẩm
            </Text>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <TagOutlined className="text-base" />
            </div>
          </div>
          <div className="tabular-nums text-xl font-extrabold text-emerald-500 dark:text-emerald-400">
            {Math.round(summary?.productRevenue || 0).toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Bán lẻ sản phẩm & phụ kiện dưỡng</div>
        </Card>
      </Col>
    </Row>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { Card, Button, Input, Typography, Row, Col } from 'antd';
import {
  FlaskConical,
  Trophy,
  Sparkles,
  ShieldCheck,
  Share2,
  Search,
  PlusCircle,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader, StatCard, AppIcon, StatusTag, type StatusType } from '../../../components/ui';

const { Title, Text, Paragraph } = Typography;

interface LabProduct {
  id: string;
  name: string;
  category: 'gamification' | 'service_pilot' | 'finance' | 'architecture';
  categoryLabel: string;
  statusBadge: string;
  statusType: StatusType;
  icon: React.ReactNode;
  iconBgClass: string;
  path: string;
  headline: string;
  description: string;
  highlights: string[];
  targetAudience: string;
  leadMaintainer: string;
  version: string;
}

const LAB_PRODUCTS: LabProduct[] = [
  {
    id: 'career-path',
    name: 'Career Path (CV → CC → FM → CHO → BOSS)',
    category: 'gamification',
    categoryLabel: '🎮 Gamification & HR',
    statusBadge: 'Alpha · Simulation RPG',
    statusType: 'purple',
    icon: <AppIcon icon={Trophy} size="md" className="text-amber-500" />,
    iconBgClass: 'bg-amber-500/10 text-amber-500',
    path: '/dashboard/career-path',
    headline: 'Lộ trình thăng tiến nhân sự mô phỏng hoá theo phong cách Game RPG',
    description:
      'Hệ thống game hóa con đường sự nghiệp từ Chuyên Viên (CV) đến Tư Vấn (CC), Quản Lý Sàn (FM), Trưởng Bộ Phận Dịch Vụ (CHO), và BOSS. Tích hợp audio 8-bit, mô phỏng thu nhập theo sliders và ranking danh vọng.',
    highlights: ['5 Đảo Danh Vọng', 'Web Audio 8-bit RPG', 'Interactive Sliders', 'Simulation Engine'],
    targetAudience: 'Chuyên Viên (CV) · Tư Vấn (CC) · Quản Lý Sàn',
    leadMaintainer: 'Danny Do & AI Team',
    version: 'v0.9.2 Alpha',
  },
  {
    id: 'pilot-dark-lashes',
    name: 'Pilot Uốn Mi Đề Thám',
    category: 'service_pilot',
    categoryLabel: '⚡ Pilot Dịch Vụ',
    statusBadge: 'Live Pilot · Chi nhánh Đề Thám',
    statusType: 'cyan',
    icon: <AppIcon icon={Sparkles} size="md" className="text-emerald-500" />,
    iconBgClass: 'bg-emerald-500/10 text-emerald-500',
    path: '/dashboard/pilot-dark-lashes',
    headline: 'Thử nghiệm dịch vụ uốn mi kỹ thuật mới và đo lường công suất',
    description:
      'Chương trình thử nghiệm kỹ thuật uốn mi mới tại chi nhánh Đề Thám. Giúp theo dõi năng suất thực tế, trải nghiệm của khách hàng và thời gian phục vụ trước khi nhân rộng ra toàn chuỗi.',
    highlights: ['Theo dõi ca làm', 'Feedback khách hàng', 'Đo lường công suất', 'Đề Thám Branch'],
    targetAudience: 'Kỹ thuật viên · Tư vấn Đề Thám · Quản lý shop',
    leadMaintainer: 'Operations & R&D',
    version: 'v1.1.0 Pilot',
  },
  {
    id: 'payroll-pilot',
    name: 'Pilot Payroll CC (Bảng Lương Thời Gian Thực)',
    category: 'finance',
    categoryLabel: '💳 Tài Chính & Lương',
    statusBadge: 'Beta · Realtime Ledger',
    statusType: 'gold',
    icon: <AppIcon icon={ShieldCheck} size="md" className="text-amber-500" />,
    iconBgClass: 'bg-amber-500/10 text-amber-500',
    path: '/dashboard/payroll-pilot',
    headline: 'Hệ thống tự động tính lương & đối soát ca làm việc của CC',
    description:
      'Module tài chính tự động tính toán lương giờ, thưởng xoay tua, thưởng combo sản phẩm, minigame và tiền tip theo thời gian thực kết nối trực tiếp database ledger của legacy CRM.',
    highlights: ['Live Paystub', 'Đối soát 100% khớp từng đồng', 'Tự động trừ phạt FAL', 'Kế toán phê duyệt'],
    targetAudience: 'Ban Giám Đốc · Kế Toán · Client Consultant',
    leadMaintainer: 'Financial Engineering',
    version: 'v1.4.0 Beta',
  },
  {
    id: 'architecture',
    name: 'AI Architecture & Monorepo Map',
    category: 'architecture',
    categoryLabel: '🧠 Kiến Trúc Hệ Thống',
    statusBadge: 'Internal Tool · Live Map',
    statusType: 'processing',
    icon: <AppIcon icon={Share2} size="md" className="text-blue-500" />,
    iconBgClass: 'bg-blue-500/10 text-blue-500',
    path: '/dashboard/architecture',
    headline: 'Bản đồ trực quan hóa luồng dữ liệu 10 AI Agents và Fastify Backend',
    description:
      'Sơ đồ tương tác toàn diện trực quan hóa kiến trúc 10 AI Agents, Fastify APIs, Next.js web và quy trình dữ liệu monorepo của mos-lab.',
    highlights: ['10 AI Agents', 'Interactive Canvas', 'Monorepo Topology', 'Realtime Sync'],
    targetAudience: 'Ban Lãnh Đạo · Kỹ Sư Công Nghệ · Dev Team',
    leadMaintainer: 'Core Architecture',
    version: 'v2.0.0 Map',
  },
];

export default function LabsHubPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredProducts = useMemo(() => {
    return LAB_PRODUCTS.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.highlights.some((h) => h.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="MOS Labs · Sản Phẩm Đang Phát Triển"
        subtitle="Không gian R&D thử nghiệm, mô phỏng và ươm tạo các tính năng công nghệ mới của mos-lab trước khi đưa vào vận hành chính thức."
        icon={<AppIcon icon={FlaskConical} size="md" className="text-emerald-500" />}
        tag={<StatusTag status="success" label="R&D Incubator" />}
      />

      {/* Metrics Grid */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <StatCard
            title="Sản phẩm đang R&D"
            value="4"
            subValue="Đang phát triển"
            icon={<AppIcon icon={FlaskConical} size="sm" className="text-emerald-500" />}
            iconBgColor="rgba(16, 185, 129, 0.12)"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="Gamification & HR"
            value="1"
            subValue="Career Path (CV → BOSS)"
            icon={<AppIcon icon={Trophy} size="sm" className="text-purple-500" />}
            iconBgColor="rgba(168, 85, 247, 0.12)"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="Thử nghiệm Pilot"
            value="1"
            subValue="Chi nhánh Đề Thám"
            icon={<AppIcon icon={Sparkles} size="sm" className="text-cyan-500" />}
            iconBgColor="rgba(6, 182, 212, 0.12)"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="Tài chính Beta"
            value="1"
            subValue="Payroll CC Realtime"
            icon={<AppIcon icon={ShieldCheck} size="sm" className="text-amber-500" />}
            iconBgColor="rgba(245, 158, 11, 0.12)"
          />
        </Col>
      </Row>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Tất cả sản phẩm' },
              { key: 'gamification', label: '🎮 Gamification & HR' },
              { key: 'service_pilot', label: '⚡ Pilot Dịch Vụ' },
              { key: 'finance', label: '💳 Tài Chính & Lương' },
              { key: 'architecture', label: '🧠 Kiến Trúc' },
            ].map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === cat.key
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full md:w-72">
            <Input
              prefix={<Search className="w-4 h-4 text-slate-400" />}
              placeholder="Tìm kiếm sản phẩm R&D..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            onClick={() => router.push(product.path)}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between group cursor-pointer"
          >
            <div className="space-y-4">
              {/* Header: Icon, Tags, Version */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${product.iconBgClass}`}
                  >
                    {product.icon}
                  </div>
                  <div>
                    <StatusTag status={product.statusType} label={product.statusBadge} />
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">{product.version}</div>
                  </div>
                </div>

                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {product.categoryLabel}
                </span>
              </div>

              {/* Title & Headline */}
              <div>
                <Title
                  level={4}
                  className="!m-0 !mb-1 text-slate-900 dark:text-slate-100 group-hover:text-emerald-500 transition-colors"
                >
                  {product.name}
                </Title>
                <Text className="text-xs font-medium block text-slate-500 dark:text-slate-400">{product.headline}</Text>
              </div>

              {/* Description */}
              <Paragraph className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 !m-0 line-clamp-3">
                {product.description}
              </Paragraph>

              {/* Highlights Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {product.highlights.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer with Audience and CTA button */}
            <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="text-[11px] text-slate-400 dark:text-slate-500">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Đối tượng: </span>
                {product.targetAudience}
              </div>

              <Button
                type="primary"
                size="small"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                className="rounded-lg bg-emerald-500 hover:bg-emerald-600 border-none font-medium flex items-center gap-1 text-xs"
              >
                Mở sản phẩm
              </Button>
            </div>
          </div>
        ))}

        {/* Add New Product Card */}
        <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <StatusTag status="success" label="Quy trình R&D" />
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">Framework mở rộng</div>
              </div>
            </div>

            <div>
              <Title level={4} className="!m-0 !mb-1 text-slate-900 dark:text-slate-100">
                + Ươm Mầm Sản Phẩm Mới
              </Title>
              <Text className="text-xs font-medium block text-slate-500 dark:text-slate-400">
                Cách thêm sản phẩm mới vào vườn ươm MOS Labs
              </Text>
            </div>

            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Bước 1:</strong> Tạo giao diện tại{' '}
                  <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[11px]">
                    apps/web/app/dashboard/&lt;slug&gt;/page.tsx
                  </code>
                  .
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Bước 2:</strong> Khai báo route &amp; icon trong nhóm{' '}
                  <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[11px]">
                    labsItems
                  </code>{' '}
                  tại{' '}
                  <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[11px]">
                    sidebar.config.tsx
                  </code>
                  .
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Bước 3:</strong> Thêm định nghĩa vào{' '}
                  <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[11px]">
                    LAB_PRODUCTS
                  </code>{' '}
                  tại trang Hub này.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Sản phẩm sẽ tự động xuất hiện trên menu sidebar!</span>
            <StatusTag status="cyan" label="Zero-friction" />
          </div>
        </div>
      </div>

      {/* Incubator Philosophy / Playbook */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <Title level={4} className="!m-0 text-slate-900 dark:text-slate-100">
              Quy Chuẩn Ươm Mầm Sản Phẩm (MOS Labs Lifecycle)
            </Title>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Concept &amp; Prototype
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Mô phỏng trải nghiệm người dùng, kiểm thử sliders, âm thanh và giao diện thử nghiệm độc lập trong MOS
                Labs mà không làm ảnh hưởng đến dữ liệu sản xuất.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Live Pilot Thực Địa</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Triển khai có kiểm soát trên 1 chi nhánh (như Đề Thám) hoặc một nhóm nhỏ nhân sự được ủy quyền để đo
                lường công suất và phản hồi thực tế.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Tốt Nghiệp &amp; Rollout
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Khi đạt đầy đủ tiêu chí vận hành ổn định và được Danny duyệt, sản phẩm sẽ tốt nghiệp Labs và được chuyển
                thành phân hệ vận hành chính thức trong menu hệ thống.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

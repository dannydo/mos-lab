'use client';

import '../../suppress-warnings';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Typography, Space, Button } from 'antd';
import { Users, LayoutDashboard, BookOpen } from 'lucide-react';
import CbLiveTelemetryWidget from './components/CbLiveTelemetryWidget';

const { Title, Text, Paragraph } = Typography;

export default function CbDashboardPage() {
  const router = useRouter();

  return (
    <div className="responsive-page responsive-workspace cb-page w-full space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 m-0">
              Dashboard $CB
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Streaming 100% Real-Time
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-0">
            Đường truyền dữ liệu trực tiếp từ cơ sở dữ liệu lõi mOS Lab theo Điều răn Khoa học & Chân thành (MOS-002)
          </p>
        </div>

        {/* TOP QUICK NAVIGATION */}
        <Space wrap size={10}>
          <Button
            icon={<Users className="w-4 h-4" />}
            onClick={() => router.push('/dashboard/cc')}
            className="flex items-center gap-1.5"
          >
            Báo Cáo CC
          </Button>
          <Button
            type="primary"
            icon={<LayoutDashboard className="w-4 h-4" />}
            onClick={() => router.push('/dashboard/telesale-target')}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 border-none"
          >
            War Room Telesales
          </Button>
        </Space>
      </div>

      {/* CORE LIVE TELEMETRY PIPELINE WIDGET */}
      <CbLiveTelemetryWidget autoRefreshIntervalSec={15} />

      {/* BUSINESS CANON & TELEMETRY PROTOCOL NOTE */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm text-xs text-slate-600 dark:text-slate-400 space-y-2">
        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span>QUY CHUẨN ĐƯỜNG TRUYỀN DỮ LIỆU $CB LIVE (KINH THÁNH WINGS MOS-002)</span>
        </div>
        <p className="text-xs mb-0 text-slate-600 dark:text-slate-400 leading-relaxed">
          <strong>1. Doanh thu Gói & Sản phẩm Live:</strong> Tự động quét các đơn có trạng thái{' '}
          <code className="text-emerald-600 dark:text-emerald-400 font-mono">Completed</code> theo mốc{' '}
          <code className="font-mono">booking_date_start</code>. Bóc tách chuẩn xác:{' '}
          <code className="font-mono">total_price - tax_amount</code> của từng dòng{' '}
          <code className="font-mono">order_service_combo</code> và <code className="font-mono">order_product</code>. Không
          cộng ảo, không bị lệch pha với công nợ.
          <br />
          <strong>2. Động cơ Vòng Xanh Live (Green Funnel Pulse):</strong> Đếm thời gian thực số lịch Done vòng xanh tích
          lũy (so với mốc 540 Done). Lọc chuẩn xác số đơn gói phát sinh từ đúng các lịch Done này để tính Tỷ lệ Chốt Live{' '}
          <code className="text-emerald-600 dark:text-emerald-400 font-mono">[Đơn gói / Done vòng xanh]</code>, đối
          chiếu trực tiếp với vạch chuẩn 10,0%.
          <br />
          <strong>3. Động cơ Khách Đang Dùng Gói Live (Retention Pulse):</strong> Đếm thời gian thực số lịch Done có phát
          sinh giao dịch trừ lượt mi thực tế (
          <code className="text-fuchsia-600 dark:text-fuchsia-400 font-mono">user_service_balance_transaction_id</code>) so
          với mục tiêu 1.000 lượt (Target 1K) và số khách duy nhất (Unique Pax) Live.
        </p>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { CheckCircle2, ShoppingBag, Store, User, Users } from 'lucide-react';
import type { BranchStats } from '@mos-lab/shared';
import { AppIcon, StatCard } from '~/components/ui';

interface BranchStatsRowProps {
  stats: BranchStats | null;
  loading: boolean;
}

export function BranchStatsRow({ stats, loading }: BranchStatsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        title="∑ CHI NHÁNH"
        value={stats?.totalBranches || 0}
        icon={<AppIcon icon={Store} size="md" className="text-blue-500" />}
        loading={loading}
      />
      <StatCard
        title="ĐANG HOẠT ĐỘNG"
        value={stats?.activeBranches || 0}
        icon={<AppIcon icon={CheckCircle2} size="md" className="text-emerald-500" />}
        loading={loading}
      />
      <StatCard
        title="NHÂN SỰ SỞ TẠI"
        value={(stats?.totalStaff || 0).toLocaleString('vi-VN')}
        icon={<AppIcon icon={Users} size="md" className="text-purple-500" />}
        loading={loading}
      />
      <StatCard
        title="KHÁCH HÀNG THUỘC CN"
        value={(stats?.totalCustomers || 0).toLocaleString('vi-VN')}
        icon={<AppIcon icon={User} size="md" className="text-cyan-500" />}
        loading={loading}
      />
      <StatCard
        title="ĐƠN HOÀN TẤT CHI NHÁNH"
        value={(stats?.totalCompletedOrders || 0).toLocaleString('vi-VN')}
        icon={<AppIcon icon={ShoppingBag} size="md" className="text-amber-500" />}
        loading={loading}
      />
    </div>
  );
}

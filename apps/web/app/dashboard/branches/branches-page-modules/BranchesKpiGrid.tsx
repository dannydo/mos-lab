'use client';

import React from 'react';
import { Col, Row } from 'antd';
import { Briefcase, Building2, GraduationCap, Store, Users, type LucideIcon } from 'lucide-react';
import type { BranchStats } from '@mos-lab/shared';
import { AppIcon, StatCard } from '~/components/ui';

interface BranchesKpiGridProps {
  stats: BranchStats | null;
  statsLoading: boolean;
  branchesCount: number;
  activeSalonsCount: number;
  activeAcademiesCount: number;
  activeOfficesCount: number;
}

interface KpiCardConfig {
  key: string;
  lgSpan: number;
  title: string;
  value: number;
  icon: LucideIcon;
  iconClassName: string;
}

export function BranchesKpiGrid({
  stats,
  statsLoading,
  branchesCount,
  activeSalonsCount,
  activeAcademiesCount,
  activeOfficesCount,
}: BranchesKpiGridProps) {
  const cards: KpiCardConfig[] = [
    {
      key: 'total-branches',
      lgSpan: 4,
      title: 'TỔNG CHI NHÁNH',
      value: stats?.totalBranches ?? branchesCount,
      icon: Building2,
      iconClassName: 'text-emerald-500',
    },
    {
      key: 'salons',
      lgSpan: 5,
      title: 'SALON LÀM ĐẸP',
      value: activeSalonsCount,
      icon: Store,
      iconClassName: 'text-cyan-500',
    },
    {
      key: 'academies',
      lgSpan: 5,
      title: 'HỌC VIỆN ĐÀO TẠO',
      value: activeAcademiesCount,
      icon: GraduationCap,
      iconClassName: 'text-purple-500',
    },
    {
      key: 'offices',
      lgSpan: 5,
      title: 'TRỤ SỞ / VĂN PHÒNG',
      value: activeOfficesCount,
      icon: Briefcase,
      iconClassName: 'text-amber-500',
    },
    {
      key: 'staff',
      lgSpan: 5,
      title: 'TỔNG NHÂN SỰ GẮN LIỀN',
      value: stats?.totalStaff ?? 0,
      icon: Users,
      iconClassName: 'text-blue-500',
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {cards.map((card) => (
        <Col key={card.key} xs={12} sm={8} lg={card.lgSpan}>
          <StatCard
            title={card.title}
            value={card.value}
            loading={statsLoading}
            icon={<AppIcon icon={card.icon} size="md" className={card.iconClassName} />}
          />
        </Col>
      ))}
    </Row>
  );
}

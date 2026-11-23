'use client';

import React from 'react';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Clock,
  Crown,
  Eye,
  Flame,
  Gem,
  HandCoins,
  Heart,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { CareerProgressionStatus } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';

/**
 * Render icon đồng bộ cho 6 ải / 6 đỉnh Radar Career Path:
 * 0: Eye (Sản lượng bộ mi)
 * 1: Bug (Tỷ lệ bảo hành / sửa mi)
 * 2: HandCoins (Tỷ lệ tip - bàn tay nâng tiền boa)
 * 3: ShieldCheck (Kiểm định QA/QC)
 * 4: Heart (Teamwork HI Thả tim)
 * 5: Chuối Yêu Thương
 */
export const renderCareerNodeIcon = (index: number, className = 'w-4 h-4 shrink-0', bananaSizeClass = 'text-xs') => {
  switch (index) {
    case 0:
      return <Eye className={className} />;
    case 1:
      return <Bug className={className} />;
    case 2:
      return <HandCoins className={className} />;
    case 3:
      return <ShieldCheck className={className} />;
    case 4:
      return <Heart className={`${className} fill-current/20`} />;
    case 5:
    default:
      return <span className={`${bananaSizeClass} shrink-0 select-none`}>🍌</span>;
  }
};

interface SimulationStatusBadgeProps {
  hasFailedQa: boolean;
  isQaPassed: boolean;
  isOrdersPassed: boolean;
  isFixPassed: boolean;
  isTipPassed: boolean;
  careerStatus: CareerProgressionStatus;
}

export const SimulationStatusBadge: React.FC<SimulationStatusBadgeProps> = ({
  hasFailedQa,
  isQaPassed,
  isOrdersPassed,
  isFixPassed,
  isTipPassed,
  careerStatus,
}) => {
  if (hasFailedQa) {
    return (
      <StatusTag
        status="error"
        icon={<AlertCircle className="w-3 h-3" />}
        label="Khóa nâng cấp (Lỗi QA)"
        className="font-bold text-xs"
      />
    );
  }
  if (!isQaPassed && isOrdersPassed && isFixPassed && isTipPassed) {
    return (
      <StatusTag
        status="warning"
        icon={<Clock className="w-3 h-3" />}
        label="Cần kiểm tra QA định kỳ"
        className="font-bold text-xs"
      />
    );
  }
  switch (careerStatus) {
    case 'QUALIFIED':
      return (
        <StatusTag
          status="success"
          icon={<CheckCircle2 className="w-3 h-3" />}
          label="Đủ điều kiện thăng cấp"
          className="font-bold text-xs animate-pulse"
        />
      );
    case 'TRIAL_GATE':
      return (
        <StatusTag
          status="warning"
          icon={<Flame className="w-3 h-3 text-amber-500" />}
          label="Đang thử thách Ải Trùm"
          className="font-bold text-xs animate-pulse"
        />
      );
    case 'PROMOTED':
      return (
        <StatusTag
          status="purple"
          icon={<Crown className="w-3 h-3" />}
          label="Đã thăng hạng"
          className="font-bold text-xs"
        />
      );
    case 'SPECIALIST_PATH':
      return (
        <StatusTag
          status="cyan"
          icon={<Gem className="w-3 h-3" />}
          label="Nhánh Master Tech"
          className="font-bold text-xs"
        />
      );
    default:
      return (
        <StatusTag
          status="processing"
          icon={<Sparkles className="w-3 h-3 text-blue-500" />}
          label="Đang rèn luyện"
          className="font-bold text-xs"
        />
      );
  }
};

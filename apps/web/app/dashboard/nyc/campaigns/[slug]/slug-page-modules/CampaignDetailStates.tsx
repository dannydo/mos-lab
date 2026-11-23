'use client';

import React from 'react';
import { Button } from 'antd';
import { ArrowLeft, Clock } from 'lucide-react';
import { AppIcon } from '~/components/ui';

export function CampaignDetailLoadingState() {
  return (
    <div className="p-12 text-center">
      <Clock className="mx-auto mb-3 h-7 w-7 animate-spin text-amber-500" />
      <div className="font-medium text-slate-500 dark:text-slate-400">Đang tải chi tiết chiến dịch...</div>
    </div>
  );
}

export interface CampaignDetailNotFoundStateProps {
  slug: string;
  onBack: () => void;
}

export function CampaignDetailNotFoundState({ slug, onBack }: CampaignDetailNotFoundStateProps) {
  return (
    <div className="mx-auto my-12 max-w-md rounded-2xl border border-slate-200 bg-white/95 p-12 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-3 text-4xl">🔍</div>
      <h4 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">Không tìm thấy chiến dịch</h4>
      <p className="mb-6 block text-sm text-slate-600 dark:text-slate-400">
        Chiến dịch với đường dẫn &quot;<span className="font-mono text-amber-600 dark:text-amber-400">{slug}</span>
        &quot; không tồn tại hoặc đã bị xóa.
      </p>
      <Button
        type="primary"
        icon={<AppIcon icon={ArrowLeft} size={14} />}
        onClick={onBack}
        className="border-amber-700 bg-amber-700 font-bold text-white hover:bg-amber-600 dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
      >
        Quay lại danh sách chiến dịch
      </Button>
    </div>
  );
}

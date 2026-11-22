'use client';

import React from 'react';
import { Card, DatePicker, Input } from 'antd';
import { Settings } from 'lucide-react';
import dayjs from 'dayjs';
import type { TelesaleCompetencyConfigVersion } from '@mos-lab/shared';

interface VersionMetadataCardProps {
  currentConfig: TelesaleCompetencyConfigVersion;
  isDraft: boolean;
  onChangeConfig: React.Dispatch<React.SetStateAction<TelesaleCompetencyConfigVersion>>;
}

export function VersionMetadataCard({ currentConfig, isDraft, onChangeConfig }: VersionMetadataCardProps) {
  return (
    <Card
      title={
        <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
          <Settings className="w-4 h-4 text-indigo-500" />
          <span>Thông Tin Phiên Bản</span>
        </div>
      }
      className="rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900"
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-zinc-400 block mb-1">
            Tên phiên bản cấu hình
          </label>
          <Input
            value={currentConfig.name}
            disabled={!isDraft}
            onChange={(e) => onChangeConfig((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nhập tên phiên bản..."
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-zinc-400 block mb-1">
            Kỳ bắt đầu hiệu lực (YYYY-MM)
          </label>
          <DatePicker
            picker="month"
            value={dayjs(currentConfig.effectiveDate || '2026-11')}
            disabled={!isDraft}
            onChange={(d) =>
              d &&
              onChangeConfig((prev) => ({
                ...prev,
                effectiveDate: d.format('YYYY-MM'),
              }))
            }
            className="w-full"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-zinc-400 block mb-1">
            Ghi chú thay đổi (Changelog)
          </label>
          <Input.TextArea
            rows={3}
            value={currentConfig.changelog || ''}
            disabled={!isDraft}
            onChange={(e) => onChangeConfig((prev) => ({ ...prev, changelog: e.target.value }))}
            placeholder="Ghi chú nội dung cập nhật, lý do điều chỉnh..."
          />
        </div>

        <div className="pt-2 text-xs text-slate-500 dark:text-zinc-400 space-y-1">
          <div>Người tạo: {currentConfig.authorName || 'Ban Quản Trị'}</div>
          {currentConfig.publishedAt && (
            <div>
              Ban hành: {dayjs(currentConfig.publishedAt).format('DD/MM/YYYY HH:mm')} bởi{' '}
              {currentConfig.publishedByName || 'Admin'}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

'use client';

import React from 'react';
import { Button, Card, Select } from 'antd';
import { Copy, Plus, Trash2 } from 'lucide-react';
import type { TelesaleCompetencyConfigVersion } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import { getVersionBadgeMeta, getVersionStatusLabel } from './telesaleConfigHelpers';

interface VersionSelectorBarProps {
  versions: TelesaleCompetencyConfigVersion[];
  selectedVersionId: string;
  currentConfig: TelesaleCompetencyConfigVersion;
  loading: boolean;
  saving: boolean;
  isDraft: boolean;
  onSelectVersion: (versionId: string) => void;
  onCreateDraft: (cloneCurrent: boolean) => void;
  onOpenDeleteModal: () => void;
}

export function VersionSelectorBar({
  versions,
  selectedVersionId,
  currentConfig,
  loading,
  saving,
  isDraft,
  onSelectVersion,
  onCreateDraft,
  onOpenDeleteModal,
}: VersionSelectorBarProps) {
  const badgeMeta = getVersionBadgeMeta(currentConfig.status, currentConfig.effectiveDate);

  return (
    <Card className="rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Phiên bản cấu hình:</span>
          <Select
            value={selectedVersionId}
            onChange={onSelectVersion}
            loading={loading}
            className="w-72"
            options={versions.map((v) => ({
              value: v.versionId,
              label: (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{v.name}</span>
                  <span className="text-xs text-slate-500">({getVersionStatusLabel(v.status)})</span>
                </div>
              ),
            }))}
          />

          <StatusTag status={badgeMeta.status} label={badgeMeta.label} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button icon={<Plus className="w-3.5 h-3.5" />} onClick={() => onCreateDraft(false)} disabled={saving}>
            Tạo Bản Nháp Mới
          </Button>

          <Button icon={<Copy className="w-3.5 h-3.5" />} onClick={() => onCreateDraft(true)} disabled={saving}>
            Sao Chép Từ Bản Này
          </Button>

          {isDraft && (
            <Button danger icon={<Trash2 className="w-3.5 h-3.5" />} onClick={onOpenDeleteModal}>
              Xóa Bản Nháp
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

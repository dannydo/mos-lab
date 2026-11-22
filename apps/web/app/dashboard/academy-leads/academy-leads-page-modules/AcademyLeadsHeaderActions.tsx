'use client';

import { Button, Space, Tooltip } from 'antd';
import { Plus, RefreshCcw, RefreshCw } from 'lucide-react';
import { AppIcon, PagePrimaryIconAction } from '~/components/ui';

export interface AcademyLeadsHeaderActionsProps {
  isContentAdmin: boolean;
  isKnowledge: boolean;
  loading: boolean;
  onSyncPancake: () => void;
  onRefresh: () => void;
  onCreateLead: () => void;
}

export function AcademyLeadsHeaderActions({
  isContentAdmin,
  isKnowledge,
  loading,
  onSyncPancake,
  onRefresh,
  onCreateLead,
}: AcademyLeadsHeaderActionsProps) {
  return (
    <Space>
      {isContentAdmin && (
        <Tooltip title="Đồng bộ Pancake ngay">
          <Button aria-label="Đồng bộ Pancake Academy" icon={<AppIcon icon={RefreshCcw} />} onClick={onSyncPancake} />
        </Tooltip>
      )}
      <Tooltip title="Làm mới dữ liệu">
        <Button
          aria-label="Làm mới dữ liệu"
          icon={<AppIcon icon={RefreshCw} />}
          loading={loading}
          onClick={onRefresh}
        />
      </Tooltip>
      {!isKnowledge && (
        <PagePrimaryIconAction title="Tạo khách hàng Academy" icon={<AppIcon icon={Plus} />} onClick={onCreateLead} />
      )}
    </Space>
  );
}

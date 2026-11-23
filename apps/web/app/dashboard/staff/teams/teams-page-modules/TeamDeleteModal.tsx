'use client';

import React from 'react';
import type { Team } from '@mos-lab/shared';
import { AdaptiveModal } from '~/components/ui';

export interface TeamDeleteModalProps {
  teamPendingDelete: Team | null;
  savingTeam: boolean;
  onConfirmDelete: () => void;
  onCancel: () => void;
}

export function TeamDeleteModal({ teamPendingDelete, savingTeam, onConfirmDelete, onCancel }: TeamDeleteModalProps) {
  return (
    <AdaptiveModal
      intent="confirm"
      open={Boolean(teamPendingDelete)}
      title="Xóa team?"
      okText="Xóa team"
      cancelText="Hủy"
      okButtonProps={{ danger: true, loading: savingTeam }}
      onOk={onConfirmDelete}
      onCancel={onCancel}
    >
      <p>
        Bạn sắp xóa <strong>{teamPendingDelete?.name}</strong>. Chỉ team trống, không có thành viên và không có team
        trực thuộc mới xóa được; lịch sử nhân sự sẽ không bị xóa ngầm.
      </p>
    </AdaptiveModal>
  );
}

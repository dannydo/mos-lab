'use client';

import { Alert, Button, Select, Typography } from 'antd';
import { LoaderCircle, UserPlus } from 'lucide-react';
import type { AcademyLead } from '@mos-lab/shared';
import { AdaptiveModal, AdaptiveOverlayFooter, AppIcon } from '~/components/ui';

export interface AddExistingParticipantsModalProps {
  open: boolean;
  addLeadIds: number[];
  leadSearch: string;
  leadLoading: boolean;
  leadError: string | null;
  availableLeadOptions: AcademyLead[];
  busy: boolean;
  onAddExisting: () => void;
  onAddLeadIdsChange: (leadIds: number[]) => void;
  onLeadSearchChange: (search: string) => void;
  onClose: () => void;
  onOpenWalkInFromAdd: () => void;
}

export function AddExistingParticipantsModal({
  open,
  addLeadIds,
  leadSearch,
  leadLoading,
  leadError,
  availableLeadOptions,
  busy,
  onAddExisting,
  onAddLeadIdsChange,
  onLeadSearchChange,
  onClose,
  onOpenWalkInFromAdd,
}: AddExistingParticipantsModalProps) {
  return (
    <AdaptiveModal
      open={open}
      title="Thêm học viên có sẵn"
      intent="confirm"
      footer={
        <AdaptiveOverlayFooter>
          <Button onClick={onClose}>Hủy</Button>
          <Button
            type="primary"
            icon={<AppIcon icon={UserPlus} />}
            disabled={!addLeadIds.length}
            loading={busy}
            onClick={onAddExisting}
          >
            {addLeadIds.length ? `Thêm ${addLeadIds.length} học viên` : 'Thêm vào workshop'}
          </Button>
        </AdaptiveOverlayFooter>
      }
      onCancel={onClose}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary" className="!mb-3 !text-sm">
        Tìm theo họ tên, số điện thoại hoặc email. Có thể chọn nhiều học viên cùng lúc.
      </Typography.Paragraph>
      <Select
        mode="multiple"
        showSearch
        autoFocus
        filterOption={false}
        className="w-full"
        placeholder="Gõ tên, SĐT hoặc email học viên…"
        value={addLeadIds}
        onChange={onAddLeadIdsChange}
        onSearch={onLeadSearchChange}
        loading={leadLoading}
        maxTagCount="responsive"
        notFoundContent={
          leadLoading ? (
            <div className="flex items-center justify-center gap-2 py-3 text-sm opacity-70">
              <AppIcon icon={LoaderCircle} className="animate-spin" /> Đang tìm học viên…
            </div>
          ) : (
            leadError || (leadSearch ? 'Không tìm thấy học viên phù hợp.' : 'Chưa có học viên Academy có thể thêm.')
          )
        }
        options={availableLeadOptions.map((lead) => ({
          value: lead.id,
          label: `${lead.name} · ${lead.phone || lead.email || 'chưa có liên hệ'}`,
        }))}
      />
      {leadError ? <Alert className="mt-3" type="error" showIcon message={leadError} /> : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-inherit px-3 py-2.5">
        <div className="min-w-0 text-sm">
          <strong>Chưa có học viên?</strong>
          <Typography.Text type="secondary" className="block !text-xs">
            Tạo mới và cấp QR ngay trong workshop.
          </Typography.Text>
        </div>
        <Button type="text" icon={<AppIcon icon={UserPlus} />} onClick={onOpenWalkInFromAdd}>
          Tạo học viên mới
        </Button>
      </div>
    </AdaptiveModal>
  );
}

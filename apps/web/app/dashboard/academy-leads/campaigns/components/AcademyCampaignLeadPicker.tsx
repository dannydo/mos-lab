'use client';

import React from 'react';
import { Button, Select, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { RefreshCw } from 'lucide-react';
import {
  type AcademyLead,
  type AcademyLeadStatus,
  type AcademyStaffOption,
  vietnameseSearchFilter,
} from '@mos-lab/shared';
import { apiClient } from '../../../../../lib/api-client';
import {
  AdaptiveModal,
  AppIcon,
  CustomerIdentityCell,
  DataTable,
  SearchField,
  StatePanel,
  StatusTag,
  TableIndexHeader,
} from '../../../../../components/ui';

const LEAD_STATUS_LABELS: Record<AcademyLeadStatus, string> = {
  NEW: 'Mới',
  WARM: 'Đang tư vấn',
  SCHEDULED: 'Đã hẹn test',
  TESTED: 'Đã test',
  WON: 'Đã chốt',
  LOST: 'Không phù hợp',
};

const LEAD_STATUS_TONES: Record<AcademyLeadStatus, React.ComponentProps<typeof StatusTag>['status']> = {
  NEW: 'default',
  WARM: 'warning',
  SCHEDULED: 'processing',
  TESTED: 'purple',
  WON: 'success',
  LOST: 'error',
};

const EMPTY_LEAD_IDS: number[] = [];

export interface AcademyCampaignLeadPickerProps {
  open: boolean;
  title?: string;
  confirmLabel?: string;
  initialSelectedLeadIds?: number[];
  disabledLeadIds?: number[];
  staff: AcademyStaffOption[];
  onClose: () => void;
  onConfirm: (leadIds: number[]) => void | Promise<void>;
}

/**
 * A snapshot picker shared by campaign creation and later controlled additions.
 * It deliberately persists selected IDs while its paginated table moves between
 * pages, so no currently selected Academy lead can be silently lost.
 */
export function AcademyCampaignLeadPicker({
  open,
  title = 'Chọn tệp lead Academy',
  confirmLabel = 'Dùng tệp lead',
  initialSelectedLeadIds = EMPTY_LEAD_IDS,
  disabledLeadIds = EMPTY_LEAD_IDS,
  staff,
  onClose,
  onConfirm,
}: AcademyCampaignLeadPickerProps) {
  const [selectedIds, setSelectedIds] = React.useState<number[]>(initialSelectedLeadIds);
  const [leads, setLeads] = React.useState<AcademyLead[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<AcademyLeadStatus | 'ALL'>('ALL');
  const [ownerStaffId, setOwnerStaffId] = React.useState<number | 'ALL' | 'UNASSIGNED'>('ALL');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const requestVersionRef = React.useRef(0);
  const deferredSearch = React.useDeferredValue(search);
  // Callers may omit either prop. A literal default `[]` is a new reference on
  // every render; using stable, content-based inputs prevents the modal from
  // resetting its selection immediately after a checkbox click.
  const initialLeadIdsKey = initialSelectedLeadIds.join(',');
  const disabledLeadIdsKey = disabledLeadIds.join(',');
  const normalizedInitialLeadIds = React.useMemo(
    () => Array.from(new Set(initialSelectedLeadIds.map(Number))).filter((id) => Number.isInteger(id) && id > 0),
    [initialLeadIdsKey]
  );
  const normalizedDisabledLeadIds = React.useMemo(
    () => Array.from(new Set(disabledLeadIds.map(Number))).filter((id) => Number.isInteger(id) && id > 0),
    [disabledLeadIdsKey]
  );
  const disabledSet = React.useMemo(() => new Set(normalizedDisabledLeadIds), [normalizedDisabledLeadIds]);

  React.useEffect(() => {
    if (!open) return;
    setSelectedIds(normalizedInitialLeadIds.filter((id) => !disabledSet.has(id)));
    setPage(1);
    setSearch('');
    setStatus('ALL');
    setOwnerStaffId('ALL');
  }, [disabledSet, normalizedInitialLeadIds, open]);

  const load = React.useCallback(async () => {
    if (!open) return;
    const version = ++requestVersionRef.current;
    setLoading(true);
    try {
      const response = await apiClient.academySales.listLeads({
        page,
        limit: pageSize,
        search: deferredSearch || undefined,
        status,
        ownerStaffId,
      });
      if (version !== requestVersionRef.current) return;
      setLeads(response.data);
      setTotal(response.total);
      setError(null);
    } catch {
      if (version !== requestVersionRef.current) return;
      setError('Không thể tải danh sách lead Academy để tạo tệp chiến dịch.');
    } finally {
      if (version === requestVersionRef.current) setLoading(false);
    }
  }, [deferredSearch, open, ownerStaffId, page, pageSize, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const rowSelection = React.useMemo<TableRowSelection<AcademyLead>>(
    () => ({
      selectedRowKeys: selectedIds,
      preserveSelectedRowKeys: true,
      getCheckboxProps: (record) => ({ disabled: disabledSet.has(record.id) }),
      onChange: (keys) => {
        setSelectedIds(
          Array.from(new Set(keys.map(Number))).filter((id) => Number.isInteger(id) && id > 0 && !disabledSet.has(id))
        );
      },
    }),
    [disabledSet, selectedIds]
  );

  const columns = React.useMemo<ColumnsType<AcademyLead>>(
    () => [
      {
        key: 'stt',
        title: <TableIndexHeader />,
        width: 50,
        align: 'center',
        render: (_value, _record, index) => <span className="tabular-nums">{(page - 1) * pageSize + index + 1}</span>,
      },
      {
        key: 'lead',
        title: 'Khách hàng',
        width: 250,
        render: (_value, lead) => <CustomerIdentityCell name={lead.name} phone={lead.phone} avatar={lead.avatarUrl} />,
      },
      {
        key: 'status',
        title: 'Pipeline',
        width: 130,
        render: (_value, lead) => (
          <StatusTag status={LEAD_STATUS_TONES[lead.status]} label={LEAD_STATUS_LABELS[lead.status]} />
        ),
      },
      {
        key: 'course',
        title: 'Khóa học',
        width: 190,
        render: (_value, lead) => lead.course || 'Chưa chọn khóa',
      },
      {
        key: 'owner',
        title: 'Phụ trách',
        width: 150,
        render: (_value, lead) => lead.owner?.displayName || 'Chưa giao',
      },
      {
        key: 'source',
        title: 'Nguồn',
        width: 135,
        render: (_value, lead) => lead.source || 'Manual',
      },
    ],
    [page, pageSize]
  );

  const handleConfirm = React.useCallback(async () => {
    setConfirming(true);
    try {
      await onConfirm(selectedIds);
    } finally {
      setConfirming(false);
    }
  }, [onConfirm, selectedIds]);

  const selectedLabel = `${selectedIds.length.toLocaleString('vi-VN')} lead đã chọn`;

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      title={title}
      intent="data"
      destroyOnHidden
      footer={
        <Space wrap>
          <Button onClick={onClose}>Hủy</Button>
          <Button
            type="primary"
            disabled={!selectedIds.length}
            loading={confirming}
            onClick={() => void handleConfirm()}
          >
            {confirmLabel} ({selectedIds.length.toLocaleString('vi-VN')})
          </Button>
        </Space>
      }
    >
      <div className="space-y-4">
        <p className="m-0 text-sm opacity-70">
          Tệp được chốt tại thời điểm xác nhận; lead mới thỏa điều kiện sau này sẽ không tự động được thêm.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusTag status="processing" className="tabular-nums" label={selectedLabel} />
          {selectedIds.length > 0 && (
            <Button size="small" type="link" onClick={() => setSelectedIds([])}>
              Bỏ chọn tất cả
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <SearchField
            behavior="filter"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm tên, SĐT, nguồn hoặc khóa học…"
            allowClear
            className="min-w-[240px] flex-1"
          />
          <Select
            value={status}
            aria-label="Lọc pipeline lead"
            style={{ minWidth: 156 }}
            options={[
              { value: 'ALL', label: 'Mọi pipeline' },
              ...Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Select
            value={ownerStaffId}
            aria-label="Lọc người phụ trách lead"
            style={{ minWidth: 168 }}
            options={[
              { value: 'ALL', label: 'Mọi phụ trách' },
              { value: 'UNASSIGNED', label: 'Chưa giao' },
              ...staff.map((item) => ({ value: item.id, label: item.displayName })),
            ]}
            showSearch
            filterOption={vietnameseSearchFilter}
            onChange={(value) => {
              setOwnerStaffId(value);
              setPage(1);
            }}
          />
          <Button
            aria-label="Tải lại tệp lead"
            icon={<AppIcon icon={RefreshCw} />}
            loading={loading}
            onClick={() => void load()}
          />
        </div>

        {error ? (
          <StatePanel
            kind="error"
            title="Không tải được tệp lead"
            description={error}
            extra={<Button onClick={() => void load()}>Thử lại</Button>}
          />
        ) : (
          <DataTable<AcademyLead>
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={leads}
            rowSelection={rowSelection}
            stickyPrimaryColumn
            columnPriority={{
              lead: 'primary',
              status: 'secondary',
              course: 'secondary',
              owner: 'tertiary',
              source: 'tertiary',
            }}
            mobileRenderer={(lead) => (
              <div className="rounded-xl border border-inherit p-3">
                <CustomerIdentityCell name={lead.name} phone={lead.phone} avatar={lead.avatarUrl} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <StatusTag status={LEAD_STATUS_TONES[lead.status]} label={LEAD_STATUS_LABELS[lead.status]} />
                  <span className="text-xs opacity-70">{lead.course || 'Chưa chọn khóa'}</span>
                </div>
              </div>
            )}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (count, range) => `Hiển thị ${range[0]}-${range[1]} / ${count.toLocaleString('vi-VN')} lead`,
              onChange: (nextPage, nextPageSize) => {
                if (nextPageSize !== pageSize) {
                  setPageSize(nextPageSize);
                  setPage(1);
                  return;
                }
                setPage(nextPage);
              },
            }}
          />
        )}
      </div>
    </AdaptiveModal>
  );
}

export default AcademyCampaignLeadPicker;

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Input, Select } from 'antd';
import { ArrowLeft, Printer } from 'lucide-react';
import {
  groupInventoryLabelsByItem,
  INVENTORY_LABEL_PRINT_MODES,
  type InventoryLabelPrintMode,
  type InventoryPrintLabelItemDto,
} from '@mos-lab/shared';
import { AppIcon, StatePanel } from '../../../../../components/ui';
import { apiClient } from '../../../../../lib/api-client';
import { QrCodeImage } from '../../_components/QrCodeImage';
import { useInventoryAdminContext } from '../../_components/useInventoryAdminContext';
import printStyles from '../print.module.css';

export default function InventoryItemsLabelsPrintPage() {
  const searchParams = useSearchParams();
  const initialIds = searchParams?.get('ids') || '';
  const ctx = useInventoryAdminContext();

  const [idsInput, setIdsInput] = useState(initialIds);
  const [appliedIds, setAppliedIds] = useState(initialIds);
  const [showMode, setShowMode] = useState<InventoryLabelPrintMode>('102x28');
  const [items, setItems] = useState<InventoryPrintLabelItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLabels = useCallback(async () => {
    const parsedIds = appliedIds
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (parsedIds.length === 0) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.inventory.getItemPrintLabels(parsedIds, {
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      setItems(res.items || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tải được tem vật tư');
    } finally {
      setLoading(false);
    }
  }, [appliedIds, ctx.previewRole, ctx.previewStoreId]);

  useEffect(() => {
    void loadLabels();
  }, [loadLabels]);

  const itemPages = useMemo(() => groupInventoryLabelsByItem(items, showMode), [items, showMode]);

  return (
    <div className="p-4">
      <div
        className={`${printStyles.noPrint} mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/inventory/items">
            <Button icon={<AppIcon icon={ArrowLeft} size={14} />}>Quay lại</Button>
          </Link>
          <span className="font-semibold text-slate-900 dark:text-slate-100">In Tem QR Mã Vật Lý</span>
          <Input
            className="w-60"
            value={idsInput}
            onChange={(e) => setIdsInput(e.target.value)}
            onPressEnter={() => setAppliedIds(idsInput)}
            placeholder="Nhập danh sách ID cách nhau dấu phẩy..."
          />
          <Button onClick={() => setAppliedIds(idsInput)}>Tải Tem</Button>
        </div>
        <div className="flex items-center gap-2">
          <Select
            className="w-32"
            value={showMode}
            options={INVENTORY_LABEL_PRINT_MODES.map((m) => ({ value: m, label: m }))}
            onChange={(v) => setShowMode(v as InventoryLabelPrintMode)}
          />
          <Button type="primary" icon={<AppIcon icon={Printer} size={14} />} onClick={() => window.print()}>
            In Tem QR
          </Button>
        </div>
      </div>

      {loading ? (
        <StatePanel kind="loading" title="Đang tải tem QR vật tư..." />
      ) : error ? (
        <StatePanel kind="error" title="Không tải được tem" description={error} />
      ) : itemPages.length === 0 ? (
        <StatePanel
          kind="empty"
          title="Chưa có mã vật tư để in"
          description="Truyền ?ids=1,2 hoặc nhập ID ở thanh công cụ phía trên."
        />
      ) : (
        <div className="space-y-4">
          {itemPages.map((group, pIdx) => (
            <div key={pIdx} className={`${printStyles.thermalPage} flex flex-wrap gap-3 p-1`}>
              {group.map((lbl, cIdx) => {
                const lotRef = lbl.first_inventory_warehouse_order_item_id || lbl.inventory_warehouse_item_id;
                const displayName = lbl.item.is_temporary_brand
                  ? lbl.item.inventory_item_name
                  : `${lbl.item.inventory_item_name} - ${lbl.item.inventory_item_brand}`;
                if (showMode === '104x12') {
                  return (
                    <div
                      key={`${pIdx}-${cIdx}`}
                      className={`${printStyles.labelCard104x12} flex flex-col items-center justify-between text-center`}
                    >
                      <QrCodeImage text={lbl.scan_code} size={38} />
                      <div className="text-[8px] font-mono tabular-nums">#{lotRef}</div>
                    </div>
                  );
                }
                const isMid = showMode === '102x19';
                return (
                  <div
                    key={`${pIdx}-${cIdx}`}
                    className={`${isMid ? printStyles.labelCard102x19 : printStyles.labelCard102x28} flex flex-col justify-between leading-tight`}
                  >
                    <div>
                      <div className={`truncate font-medium ${isMid ? 'text-[9px]' : 'text-[11px]'}`}>
                        {displayName}
                      </div>
                      <div className="text-[8px] tabular-nums">#{lotRef}</div>
                      <div className="mt-1 flex items-start gap-1">
                        <QrCodeImage text={lbl.scan_code} size={isMid ? 38 : 60} />
                        <div className="min-w-0 text-[8px] leading-3">
                          {(lbl.item.inventory_item_attribute || '')
                            .split(' ')
                            .slice(0, 3)
                            .map((a, ai) => (
                              <div key={ai} className="truncate">
                                {a}
                              </div>
                            ))}
                          <div>#{lbl.item.inventory_item_id}</div>
                        </div>
                      </div>
                      <div className="text-[7px] tabular-nums">{lbl.date_created}</div>
                    </div>
                    <div className="truncate text-[9px]">
                      #{lbl.item.inventory_item_id} {lbl.item.inventory_item_attribute || ''}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

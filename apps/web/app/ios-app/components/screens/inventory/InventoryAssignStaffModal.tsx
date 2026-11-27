'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { removeVietnameseTones, type InventoryRolePreviewKey, type InventoryStaffOptionDto } from '@mos-lab/shared';
import { Check, ChevronDown, Search, Trash2, X } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';

interface InventoryAssignStaffModalProps {
  open: boolean;
  warehouseItemId: number | null;
  itemName: string;
  previewRole?: InventoryRolePreviewKey | null;
  previewStoreId?: number | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function InventoryAssignStaffModal({
  open,
  warehouseItemId,
  itemName,
  previewRole,
  previewStoreId,
  onClose,
  onSuccess,
}: InventoryAssignStaffModalProps) {
  const [staffList, setStaffList] = useState<InventoryStaffOptionDto[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<InventoryStaffOptionDto | null>(null);
  const [isStaffPickerOpen, setIsStaffPickerOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedStaff(null);
    setNote('');
    setErrorMsg('');
    setIsStaffPickerOpen(false);
    setStaffSearch('');

    let active = true;
    void apiClient.inventory
      .getOnboardStaff({
        previewRole: previewRole ?? undefined,
        previewStoreId: previewStoreId ?? undefined,
      })
      .then((res) => {
        if (active && res.success) setStaffList(res.staff);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [open, previewRole, previewStoreId]);

  const filteredStaff = useMemo(() => {
    const q = removeVietnameseTones(staffSearch).trim();
    if (!q) return staffList;
    return staffList.filter((s) =>
      removeVietnameseTones(`${s.full_name} ${s.username || ''} ${s.group_name || ''}`).includes(q)
    );
  }, [staffList, staffSearch]);

  if (!open || !warehouseItemId) return null;

  const handleAssign = async () => {
    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setErrorMsg('Vui lòng nhập Note.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await apiClient.inventory.assignItem({
        inventory_warehouse_item_id: warehouseItemId,
        assigned_staff_id: selectedStaff ? selectedStaff.user_id : null,
        assign_note: trimmedNote,
        previewRole: previewRole ?? undefined,
        previewStoreId: previewStoreId ?? undefined,
      });
      onSuccess(res.inventory_item?.message || 'Success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      setErrorMsg(message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      {isStaffPickerOpen ? (
        <div className="w-full max-w-[380px] h-[70dvh] bg-white text-black rounded-xl overflow-hidden flex flex-col shadow-2xl">
          <div className="bg-black text-[#FFB400] px-4 py-3 flex items-center justify-between">
            <span className="font-bold text-sm">Chọn Nhân Sự (Onboard)</span>
            <button
              type="button"
              onClick={() => setIsStaffPickerOpen(false)}
              className="p-1 cursor-pointer"
              aria-label="Đóng danh sách nhân sự"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-2.5 border-b border-neutral-200 bg-neutral-50">
            <div className="flex items-center gap-2 bg-white border border-neutral-300 rounded px-2.5 py-1.5">
              <Search className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Tìm tên nhân viên..."
                className="w-full text-xs text-black focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-200">
            <button
              type="button"
              onClick={() => {
                setSelectedStaff(null);
                setIsStaffPickerOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-xs text-neutral-500 hover:bg-neutral-50 cursor-pointer"
            >
              -- Bỏ gán (Unassign) --
            </button>
            {filteredStaff.map((s) => (
              <button
                key={s.user_id}
                type="button"
                onClick={() => {
                  setSelectedStaff(s);
                  setIsStaffPickerOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-amber-50 cursor-pointer"
              >
                <div>
                  <div className="text-sm font-medium text-neutral-900">{s.full_name}</div>
                  <div className="text-[11px] text-neutral-500">
                    {s.group_name || 'Staff'} · #{s.user_id}
                  </div>
                </div>
                {selectedStaff?.user_id === s.user_id && <Check className="w-4 h-4 text-[#FFB400]" />}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[360px] bg-white/20 p-2 rounded-lg shadow-2xl backdrop-blur-sm">
          <div className="bg-[#FFB400] p-4 rounded text-black flex flex-col gap-3">
            <div className="text-center font-bold text-base leading-tight text-black truncate">{itemName}</div>

            <button
              type="button"
              onClick={() => setIsStaffPickerOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white/80 rounded text-sm font-medium text-neutral-900 cursor-pointer"
            >
              <span className="truncate">{selectedStaff ? selectedStaff.full_name : 'Select'}</span>
              <ChevronDown className="w-4 h-4 text-neutral-600 shrink-0" />
            </button>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-800">Note</label>
                <button
                  type="button"
                  onClick={() => setNote('')}
                  className="text-neutral-700 hover:text-black p-0.5 cursor-pointer"
                  aria-label="Xóa ghi chú"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú bàn giao / khu vực..."
                className="w-full bg-white text-black text-sm rounded p-2 focus:outline-none resize-none"
              />
              {errorMsg && <div className="text-xs font-semibold text-red-700">{errorMsg}</div>}
            </div>

            <div className="flex items-center justify-center gap-6 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-[104px] h-9 rounded-full border border-white text-white text-sm font-semibold bg-transparent cursor-pointer disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={isSubmitting}
                className="w-[104px] h-9 rounded-full border border-white bg-black text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? '...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { evaluateLegacyInventoryPermissions } from '@mos-lab/shared';
import { InventoryAssignStaffModal } from '../inventory/InventoryAssignStaffModal';
import { InventoryWarehouseCheckScanScreen } from '../inventory/InventoryWarehouseCheckScanScreen';

const mockGetCheckScan = vi.fn();
const mockGetOnboardStaff = vi.fn();
const mockAssignItem = vi.fn();
const mockFinishCheck = vi.fn();
const mockResetCheck = vi.fn();

vi.mock('../../../../../lib/api-client', () => ({
  apiClient: {
    inventory: {
      getCheckScan: (...args: unknown[]) => mockGetCheckScan(...args),
      getOnboardStaff: (...args: unknown[]) => mockGetOnboardStaff(...args),
      assignItem: (...args: unknown[]) => mockAssignItem(...args),
      finishCheck: (...args: unknown[]) => mockFinishCheck(...args),
      resetCheck: (...args: unknown[]) => mockResetCheck(...args),
    },
  },
}));

const sampleWarehouse = {
  inventory_warehouse_id: 3,
  parent_inventory_warehouse_id: null,
  client_store_id: 6,
  inventory_warehouse_name: 'De Tham',
  inventory_warehouse_phone_number: null,
  inventory_warehouse_address: 'De Tham Q1',
  inventory_warehouse_type: 'Other' as const,
  is_check_needed: true,
  is_disabled: false,
  date_created: '2020-01-01 00:00:00',
};

describe('Inventory Wave 1 — Check Scan & Assign Modal 1:1 Fidelity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCheckScan.mockResolvedValue({
      success: true,
      inventory_check: {
        inventory_warehouse_check_id: 6062,
        inventory_warehouse_id: 3,
        item_state: 'New',
        check_state: 'New',
        total_quantity: 1276,
        total_quantity_checked: 608,
        total_quantity_using: 0,
        total_quantity_lost: 0,
        description: '',
        date_updated: null,
        date_created: '2026-11-01 00:00:00',
        inventory_warehouse: sampleWarehouse,
        inventory_item_summary: {
          total_quantity: 1276,
          total_quantity_checked: 608,
        },
        inventory_item: [
          {
            inventory_warehouse_id: 3,
            inventory_warehouse_item_id: 101,
            inventory_item_id: 10,
            first_inventory_warehouse_order_item_id: 9001,
            min_count: 0,
            max_count: 3,
            total_quantity: 1,
            total_quantity_checked: 0,
            item: {
              inventory_item_id: 10,
              inventory_item_name: 'Eyelash Brush Glitter',
              inventory_item_code: 'EBG',
              inventory_item_type: 'Support',
              inventory_item_unit: 'Pack',
              inventory_item_attribute: 'X5 X50',
              inventory_item_brand_id: 1,
              inventory_item_brand: 'Unknown',
            },
          },
          {
            inventory_warehouse_id: 3,
            inventory_warehouse_item_id: 102,
            inventory_item_id: 11,
            first_inventory_warehouse_order_item_id: 9002,
            min_count: 2,
            max_count: 5,
            total_quantity: 2,
            total_quantity_checked: 2,
            item: {
              inventory_item_id: 11,
              inventory_item_name: 'Glue Critical Red',
              inventory_item_code: 'GCR',
              inventory_item_type: 'Material',
              inventory_item_unit: 'Bottle',
              inventory_item_attribute: '5ml',
              inventory_item_brand_id: 2,
              inventory_item_brand: 'Wings',
            },
          },
        ],
      },
    });
  });

  it('renders De Tham 1.276 / 608 summary and exact yellow/red min_count highlights', async () => {
    const adminPerms = evaluateLegacyInventoryPermissions(7, null);
    render(
      <InventoryWarehouseCheckScanScreen
        warehouses={[sampleWarehouse]}
        selectedWarehouseId={3}
        permissions={adminPerms}
        isClientConsultant={false}
        refreshTick={0}
        onSelectWarehouse={vi.fn()}
        onOpenScanner={vi.fn()}
        onBackToMenu={vi.fn()}
        onSelectSku={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('1.276')).toBeInTheDocument();
      expect(screen.getByText('608')).toBeInTheDocument();
    });

    const yellowRow = screen.getByText('Eyelash Brush Glitter').closest('button');
    const redRow = screen.getByText('Glue Critical Red').closest('button');
    expect(yellowRow).toHaveStyle({ backgroundColor: 'rgba(255, 204, 0, 0.5)' });
    expect(redRow).toHaveStyle({ backgroundColor: 'rgba(250, 50, 50, 0.5)' });
    expect(screen.getByText('NEW')).toBeInTheDocument();
    expect(screen.getByText('USING')).toBeInTheDocument();
  });

  it('hides NEW Tier-1 tab when previewing client-consultant (CC)', async () => {
    const ccPerms = evaluateLegacyInventoryPermissions(5, null);
    render(
      <InventoryWarehouseCheckScanScreen
        warehouses={[sampleWarehouse]}
        selectedWarehouseId={3}
        permissions={ccPerms}
        isClientConsultant={true}
        refreshTick={0}
        onSelectWarehouse={vi.fn()}
        onOpenScanner={vi.fn()}
        onBackToMenu={vi.fn()}
        onSelectSku={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mockGetCheckScan).toHaveBeenCalledWith(expect.objectContaining({ itemState: 'Using' }));
    });
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
    expect(screen.getByText('USING')).toBeInTheDocument();
  });

  it('InventoryAssignStaffModal requires Note and submits assigned_staff_id', async () => {
    mockGetOnboardStaff.mockResolvedValue({
      success: true,
      staff: [
        {
          user_id: 46272,
          full_name: 'Thảo Ly',
          username: 'thaoly',
          avatar_url: null,
          user_group_id: 26,
          group_name: 'CVL',
          client_store_id: 6,
        },
      ],
    });
    mockAssignItem.mockResolvedValue({
      success: true,
      inventory_item: { id: 901, message: 'Using - 2026-11-27\nDe Tham - 999\nThảo Ly - 2026-11-27' },
    });

    const onSuccess = vi.fn();
    render(
      <InventoryAssignStaffModal
        open={true}
        warehouseItemId={901}
        itemName="Chai bọt vệ sinh mi"
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />
    );

    // Blank note blocked
    fireEvent.click(screen.getByText('Assign'));
    expect(screen.getByText('Vui lòng nhập Note.')).toBeInTheDocument();
    expect(mockAssignItem).not.toHaveBeenCalled();

    // Pick staff and fill note
    fireEvent.click(screen.getByText('Select'));
    await waitFor(() => expect(screen.getByText('Thảo Ly')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Thảo Ly'));
    fireEvent.change(screen.getByPlaceholderText('Nhập ghi chú bàn giao / khu vực...'), {
      target: { value: 'Giường 03 Đề Thám' },
    });
    fireEvent.click(screen.getByText('Assign'));

    await waitFor(() => {
      expect(mockAssignItem).toHaveBeenCalledWith(
        expect.objectContaining({
          inventory_warehouse_item_id: 901,
          assigned_staff_id: 46272,
          assign_note: 'Giường 03 Đề Thám',
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});

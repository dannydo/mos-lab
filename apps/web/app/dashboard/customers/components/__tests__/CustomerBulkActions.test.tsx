import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CustomerBulkActions from '../CustomerBulkActions';

interface MockModalProps {
  children?: React.ReactNode;
  open?: boolean;
  title?: React.ReactNode;
  onOk?: () => void;
  okText?: React.ReactNode;
  okButtonProps?: { disabled?: boolean };
}

vi.mock('antd', () => {
  const Button = ({
    children,
    disabled,
    onClick,
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
  type MockOption = { value: string | number; label: string };
  type MockGroup = { label: string; options: MockOption[] };
  const Select = ({
    options = [],
    value,
    onChange,
    placeholder,
    disabled,
  }: {
    options?: Array<MockOption | MockGroup>;
    value?: string | number;
    onChange?: (value: string | number | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
  }) => {
    const flat = options.flatMap((option) => ('options' in option ? option.options : [option]));
    return (
      <select
        aria-label={placeholder}
        disabled={disabled}
        value={value ?? ''}
        onChange={(event) => onChange?.(flat.find((option) => String(option.value) === event.target.value)?.value)}
      >
        <option value="">{placeholder}</option>
        {flat.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };
  return {
    Alert: ({ message, description }: { message: React.ReactNode; description: React.ReactNode }) => (
      <div>
        {message}
        {description}
      </div>
    ),
    Button,
    Dropdown: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Popconfirm: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Select,
    Space: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Typography: { Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span> },
  };
});

vi.mock('@ant-design/icons', () => ({
  TeamOutlined: () => null,
  DeleteOutlined: () => null,
  WarningOutlined: () => null,
  RocketOutlined: () => null,
  MoreOutlined: () => null,
}));

vi.mock('@mos-lab/shared', () => ({
  canManageCustomerAllocation: (role?: string) => role === 'admin' || role === 'manager',
  vietnameseSearchFilter: () => true,
}));

vi.mock('../../../../../lib/api-client', () => ({
  apiClient: {
    teams: {
      list: vi.fn().mockResolvedValue({
        departments: [],
        teams: [
          {
            id: 1,
            code: 'BK',
            name: 'Booking',
            isActive: true,
            department: { name: 'Kinh doanh' },
            activeStaffIds: [],
            children: [
              { id: 2, code: 'BK_TELESALES', name: 'Telesales A', isActive: true, activeStaffIds: [100, 200] },
              { id: 3, code: 'BK_CS', name: 'CS', isActive: true, activeStaffIds: [300] },
            ],
          },
        ],
      }),
    },
  },
}));
vi.mock('../RevokeAssignmentModal', () => ({ RevokeAssignmentModal: () => null }));
vi.mock('../RetainDataButton', () => ({ RetainDataButton: () => null }));
vi.mock('../../../../../components/campaign/AddToCampaignModal', () => ({ AddToCampaignModal: () => null }));
vi.mock('../../../../../components/icons/CampaignPlusIcon', () => ({ default: () => null }));
vi.mock('../../../../../components/ui', () => ({
  AdaptiveModal: ({ children, open, title, onOk, okText, okButtonProps }: MockModalProps) =>
    open ? (
      <section>
        <h2>{title}</h2>
        {children}
        <button type="button" disabled={okButtonProps?.disabled} onClick={onOk}>
          {okText}
        </button>
      </section>
    ) : null,
  ResponsiveFormField: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveFormGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../../../../hooks/useResponsiveTier', () => ({ useResponsiveTier: () => 'desktop' }));

const staff = [
  {
    id: 10,
    legacyStaffId: 100,
    username: 'bich.phuong',
    displayName: 'Bích Phượng',
    role: 'telesales' as const,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 20,
    legacyStaffId: 200,
    username: 'ngoc.diep',
    displayName: 'Ngọc Điệp',
    role: 'telesales' as const,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 30,
    legacyStaffId: 300,
    username: 'minh.manager',
    displayName: 'Minh',
    role: 'manager' as const,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 40,
    username: 'inactive',
    displayName: 'Đã nghỉ',
    role: 'telesales' as const,
    isActive: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

function AllocationHarness() {
  const [targetStaffId, setTargetStaffId] = useState<number | undefined>(undefined);
  return (
    <CustomerBulkActions
      themeMode="light"
      token={{ colorText: '#111' }}
      currentUser={{ role: 'admin' }}
      selectedRowKeys={[101, 102]}
      setSelectedRowKeys={vi.fn()}
      setAssignModalVisible={vi.fn()}
      bulkDeleteLoading={false}
      handleBulkDeleteCustomers={vi.fn().mockResolvedValue(undefined)}
      assignModalVisible
      targetStaffId={targetStaffId}
      setTargetStaffId={setTargetStaffId}
      staffList={staff}
      assigning={false}
      unassigning={false}
      handleAssignCustomers={vi.fn().mockResolvedValue(undefined)}
      handleUnassignCustomers={vi.fn().mockResolvedValue(undefined)}
    />
  );
}

describe('CustomerBulkActions allocation role/group selectors', () => {
  it('lists all active staff by default and enables confirm once a staff is chosen', async () => {
    render(<AllocationHarness />);

    const confirm = screen.getByRole('button', { name: 'Xác nhận Phân bổ' });
    const staffSelect = screen.getByLabelText('Tìm và chọn nhân sự...');

    expect(screen.getByRole('option', { name: 'Telesales Executive (2)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Quản lý (1)' })).toBeInTheDocument();
    expect(screen.queryByText(/Đã nghỉ/)).not.toBeInTheDocument();
    expect(staffSelect).toBeEnabled();
    expect(confirm).toBeDisabled();

    expect(await screen.findByRole('option', { name: 'Telesales A (2)' })).toBeInTheDocument();

    fireEvent.change(staffSelect, { target: { value: '10' } });
    expect(confirm).toBeEnabled();
  });

  it('narrows staff by role and group with cascading counts', async () => {
    render(<AllocationHarness />);
    await screen.findByRole('option', { name: 'Telesales A (2)' });

    fireEvent.change(screen.getByLabelText('Tất cả vai trò'), { target: { value: 'telesales' } });
    expect(
      screen.getByRole('option', { name: /Bích Phượng \(ID: 10\) · Telesales Executive · Telesales A/ })
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Minh \(ID: 30\)/ })).not.toBeInTheDocument();
    // Group list now only counts telesales role staff; CS group (manager only) disappears.
    expect(screen.queryByRole('option', { name: /^CS \(/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Tất cả nhóm'), { target: { value: '1' } });
    // Parent group includes sub-group members.
    expect(screen.getByRole('option', { name: 'Booking (2)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Ngọc Điệp/ })).toBeInTheDocument();
  });

  it('clears an invalid selected staff when the filters change', async () => {
    render(<AllocationHarness />);
    await screen.findByRole('option', { name: 'Telesales A (2)' });

    fireEvent.change(screen.getByLabelText('Tìm và chọn nhân sự...'), { target: { value: '10' } });
    expect(screen.getByRole('button', { name: 'Xác nhận Phân bổ' })).toBeEnabled();

    fireEvent.change(screen.getByLabelText('Tất cả vai trò'), { target: { value: 'manager' } });
    expect(screen.getByRole('button', { name: 'Xác nhận Phân bổ' })).toBeDisabled();
  });
});

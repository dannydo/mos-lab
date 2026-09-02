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
  const Select = ({
    options = [],
    value,
    onChange,
    placeholder,
    disabled,
  }: {
    options?: Array<{ value: string | number; label: string }>;
    value?: string | number;
    onChange?: (value: string | number) => void;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <select
      aria-label={placeholder}
      disabled={disabled}
      value={value ?? ''}
      onChange={(event) =>
        onChange?.(options.find((option) => String(option.value) === event.target.value)?.value || '')
      }
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
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
    username: 'bich.phuong',
    displayName: 'Bích Phượng',
    role: 'telesales' as const,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 20,
    username: 'ngoc.diep',
    displayName: 'Ngọc Điệp',
    role: 'telesales' as const,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 30,
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

describe('CustomerBulkActions allocation role selector', () => {
  it('requires a role and limits active staff options to that role', () => {
    render(<AllocationHarness />);

    const confirm = screen.getByRole('button', { name: 'Xác nhận Phân bổ' });
    const roleSelect = screen.getByLabelText('Chọn vai trò nhân sự...');
    const staffSelect = screen.getByLabelText('Chọn vai trò trước');

    expect(screen.getByRole('option', { name: 'Telesales Executive (2)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Quản lý (1)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Đã nghỉ/ })).not.toBeInTheDocument();
    expect(staffSelect).toBeDisabled();
    expect(confirm).toBeDisabled();

    fireEvent.change(roleSelect, { target: { value: 'telesales' } });

    const selectedRoleStaff = screen.getByLabelText('Tìm và chọn nhân sự...');
    expect(selectedRoleStaff).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Bích Phượng (ID: 10)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ngọc Điệp (ID: 20)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Minh (ID: 30)' })).not.toBeInTheDocument();

    fireEvent.change(selectedRoleStaff, { target: { value: '10' } });
    expect(confirm).toBeEnabled();
  });
});

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssignmentHistoryDrawer } from '../AssignmentHistoryDrawer';

vi.mock('antd', () => {
  const Drawer = ({ open, title, children }: { open: boolean; title: React.ReactNode; children: React.ReactNode }) =>
    open ? (
      <div>
        {title}
        {children}
      </div>
    ) : null;
  const Spin = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const Tag = ({ children }: { children: React.ReactNode }) => <span>{children}</span>;
  const Tooltip = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const Button = ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
  const Space = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const Table = () => null;
  const Pagination = () => null;
  const Input = ({
    placeholder,
    value,
    onChange,
  }: {
    placeholder?: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
  }) => <input placeholder={placeholder} value={value} onChange={onChange} />;
  const RadioGroup = ({
    children,
    onChange,
  }: {
    children: React.ReactNode;
    onChange?: (event: { target: { value: string } }) => void;
  }) => (
    <div>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement<{ value?: string }>(child)) return child;

        return React.cloneElement(child, {
          onClick: () => onChange?.({ target: { value: child.props.value ?? '' } }),
        });
      })}
    </div>
  );
  const RadioButton = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
  const Radio = { Group: RadioGroup, Button: RadioButton };
  const Typography = { Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span> };

  return { Drawer, Spin, Tag, Tooltip, Button, Space, Table, Pagination, Input, Radio, Typography };
});

vi.mock('@ant-design/icons', () => {
  const Icon = () => <span aria-hidden="true" />;
  return {
    HistoryOutlined: Icon,
    FilterOutlined: Icon,
    UndoOutlined: Icon,
    ClockCircleOutlined: Icon,
    SearchOutlined: Icon,
    DownOutlined: Icon,
    UpOutlined: Icon,
    ExclamationCircleOutlined: Icon,
    ReloadOutlined: Icon,
    CalendarOutlined: Icon,
    TeamOutlined: Icon,
    UserDeleteOutlined: Icon,
  };
});

const baseTime = new Date('2026-08-12T08:00:00.000Z');

const createProps = () => ({
  themeMode: 'light',
  token: { colorText: '#111', colorTextDescription: '#666' },
  open: true,
  onClose: vi.fn(),
  historyLoading: false,
  historyData: [
    {
      batchId: 'batch-1',
      assignedAt: baseTime.toISOString(),
      expiresAt: new Date(baseTime.getTime() + 30_000).toISOString(),
      assignedBy: 'Admin',
      newStaffName: 'Booker',
      customerCount: 10,
      isUndone: false,
      actionType: 'ASSIGN',
    },
  ],
  historyTotal: 1,
  historyPage: 1,
  expandedBatchId: null,
  batchDetailsLoading: false,
  batchDetails: [],
  undoingBatchId: null,
  revokingBatchId: null,
  fetchAssignmentHistory: vi.fn().mockResolvedValue(undefined),
  fetchBatchDetails: vi.fn().mockResolvedValue(undefined),
  setExpandedBatchId: vi.fn(),
  setBatchDetails: vi.fn(),
  applyFilterFromJson: vi.fn(),
  onOpenUndoModal: vi.fn(),
  onOpenRevokeBatchModal: vi.fn(),
  onOpenCustomerDetail: vi.fn(),
});

describe('AssignmentHistoryDrawer timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(baseTime);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('refreshes expiration status while the drawer remains open', () => {
    render(<AssignmentHistoryDrawer {...createProps()} />);

    expect(screen.getByText(/Hết hạn:/)).toBeInTheDocument();
    expect(screen.queryByText(/Đã hết hạn:/)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.getByText(/Đã hết hạn:/)).toBeInTheDocument();
  });

  it('cancels a pending search when the drawer closes', () => {
    const props = createProps();
    const { rerender } = render(<AssignmentHistoryDrawer {...props} />);

    fireEvent.change(screen.getByPlaceholderText(/Tìm theo tên Booker/i), { target: { value: 'Ngọc' } });
    rerender(<AssignmentHistoryDrawer {...props} open={false} />);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(props.fetchAssignmentHistory).not.toHaveBeenCalled();
  });

  it('cancels a pending search before applying a different action filter', () => {
    const props = createProps();
    render(<AssignmentHistoryDrawer {...props} />);

    fireEvent.change(screen.getByPlaceholderText(/Tìm theo tên Booker/i), { target: { value: 'Ngọc' } });
    fireEvent.click(screen.getByText('🟢 Phân bổ'));

    expect(props.fetchAssignmentHistory).toHaveBeenCalledOnce();
    expect(props.fetchAssignmentHistory).toHaveBeenLastCalledWith(1, 'Ngọc', 'ASSIGN');

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(props.fetchAssignmentHistory).toHaveBeenCalledOnce();
  });
});

import React, { act } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MosChatTaskInlineChecklist } from '../components/MosChatTaskInlineChecklist';
import type { MosChatTaskItem } from '@mos-lab/shared';

describe('MosChatTaskInlineChecklist UI Component', () => {
  const mockTask: MosChatTaskItem = {
    id: 'task-test-chk-1',
    conversationId: 'space-test',
    conversationName: 'Phòng Kỹ Thuật',
    title: 'BÊN HR CẦN ~57M ĐỂ ĐÓNG BHXH THÁNG 7-10/26',
    assigneeName: 'Danny Do',
    creatorName: 'Bảo Hân',
    priority: 'HIGH',
    remindAt: new Date().toISOString(),
    done: false,
    createdAt: new Date().toISOString(),
    checklist: [
      {
        id: 'chk-1',
        title: 'Kiểm tra sao kê ngân hàng và bảng tính lương HR',
        done: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'chk-2',
        title: 'Chuyển khoản 57M vào tài khoản BHXH quận',
        done: true,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  it('renders header, counts, and items correctly', () => {
    render(<MosChatTaskInlineChecklist task={mockTask} onUpdateTask={vi.fn()} isDark={false} />);

    expect(screen.getByText('Checklist đầu việc')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('(50%)')).toBeInTheDocument();
    expect(screen.getByText('Kiểm tra sao kê ngân hàng và bảng tính lương HR')).toBeInTheDocument();
    expect(screen.getByText('Chuyển khoản 57M vào tài khoản BHXH quận')).toBeInTheDocument();
  });

  it('calls onUpdateTask when toggling an item', async () => {
    const handleUpdate = vi.fn().mockResolvedValue({});
    render(<MosChatTaskInlineChecklist task={mockTask} onUpdateTask={handleUpdate} isDark={false} />);

    const toggleBtn = screen.getByLabelText('Đánh dấu hoàn thành');
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(handleUpdate).toHaveBeenCalledWith('task-test-chk-1', {
      checklistAction: 'toggle',
      checklistItemId: 'chk-1',
    });
  });

  it('calls onUpdateTask when deleting an item', async () => {
    const handleUpdate = vi.fn().mockResolvedValue({});
    render(<MosChatTaskInlineChecklist task={mockTask} onUpdateTask={handleUpdate} isDark={false} />);

    const deleteBtn = screen.getByLabelText('Xoá mục Kiểm tra sao kê ngân hàng và bảng tính lương HR');
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(handleUpdate).toHaveBeenCalledWith('task-test-chk-1', {
      checklistAction: 'delete',
      checklistItemId: 'chk-1',
    });
  });

  it('calls onUpdateTask when adding a new item', async () => {
    const handleUpdate = vi.fn().mockResolvedValue({});
    render(<MosChatTaskInlineChecklist task={mockTask} onUpdateTask={handleUpdate} isDark={false} />);

    const input = screen.getByPlaceholderText('Thêm đầu việc mới (nhấn Enter)...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Gửi ủy nhiệm chi cho kế toán' } });
    });

    const addBtn = screen.getByRole('button', { name: /Thêm/i });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    await waitFor(() => {
      expect(handleUpdate).toHaveBeenCalledWith('task-test-chk-1', {
        checklistAction: 'add',
        checklistItem: { title: 'Gửi ủy nhiệm chi cho kế toán' },
      });
    });
  });
});

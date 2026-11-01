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

    const addBtn = screen.getByRole('button', { name: /^Thêm$/i });
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

  it('renders task summary and triggers auto_summarize when clicking Tóm tắt & Thêm Checklist', async () => {
    const handleUpdate = vi.fn().mockResolvedValue({});
    const taskWithSummary: MosChatTaskItem = {
      ...mockTask,
      id: 'task-efe45',
      assigneeName: 'Bảo Hân',
      summary: '7 đầu việc (2 CS, 5 HR) · Tuần này: Triển khai 1 CV Lông ĐT',
      checklist: [],
    };

    render(<MosChatTaskInlineChecklist task={taskWithSummary} onUpdateTask={handleUpdate} isDark={true} />);

    expect(screen.getByText(/7 đầu việc \(2 CS, 5 HR\)/i)).toBeInTheDocument();

    const summarizeBtn = screen.getByLabelText('Tự động tóm tắt và thêm checklist');
    await act(async () => {
      fireEvent.click(summarizeBtn);
    });

    expect(handleUpdate).toHaveBeenCalledWith('task-efe45', {
      checklistAction: 'auto_summarize',
    });
  });

  it('supports inline editing, Xem thêm toggle for long text, and renders 20px assignee avatar', async () => {
    const handleUpdate = vi.fn().mockResolvedValue({});
    const longTitle =
      '[HR · Tháng 11] Đảm bảo các quy định về Off gấp/Đi trễ/Về sớm và Tác phong của Thiên thần shop, triển khai phạt bằng cách Đập chuối';
    const richTask: MosChatTaskItem = {
      ...mockTask,
      id: 'task-rich-1',
      assigneeName: 'Bảo Hân',
      checklist: [
        {
          id: 'chk-long-1',
          title: longTitle,
          done: false,
          deadline: '2026-11-30T11:00:00.000Z',
          assigneeName: 'Bảo Hân',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    render(<MosChatTaskInlineChecklist task={richTask} onUpdateTask={handleUpdate} isDark={true} />);

    // Renders parsed domain badge "HR" and timeframe badge "Tháng 11"
    expect(screen.getByText('HR')).toBeInTheDocument();
    expect(screen.getByText('Tháng 11')).toBeInTheDocument();

    // Renders "Xem thêm" button for long text and toggles to "Thu gọn"
    const moreBtn = screen.getByRole('button', { name: 'Xem thêm' });
    await act(async () => {
      fireEvent.click(moreBtn);
    });
    expect(screen.getByRole('button', { name: 'Thu gọn' })).toBeInTheDocument();

    // Renders 20px avatar initials "BH" for Bảo Hân
    expect(screen.getByText('BH')).toBeInTheDocument();

    // Clicks edit button and saves updated title
    const editBtn = screen.getByLabelText(`Sửa mục ${longTitle}`);
    await act(async () => {
      fireEvent.click(editBtn);
    });

    const saveBtn = screen.getByRole('button', { name: /Lưu \(Enter\)/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(handleUpdate).toHaveBeenCalledWith('task-rich-1', {
      checklistAction: 'edit',
      checklistItemId: 'chk-long-1',
      checklistItem: { title: longTitle },
    });
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MosChatThreadChecklist } from '../components/MosChatThreadChecklist';
import type { MosChatTaskItem, MosChatMessage } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    chat: {
      extractChecklist: vi.fn(),
    },
  },
}));

describe('MosChatThreadChecklist UI Component', () => {
  const mockTask: MosChatTaskItem = {
    id: 'task-test-chk-1',
    conversationId: 'space-test',
    conversationName: 'Phòng Kỹ Thuật',
    sourceMessageId: 'msg-root-1',
    title: 'Xây dựng tính năng Checklist từ Subthread',
    assigneeName: 'Danny Do',
    creatorName: 'Danny Do',
    priority: 'HIGH',
    remindAt: new Date().toISOString(),
    done: false,
    createdAt: new Date().toISOString(),
    checklist: [
      {
        id: 'chk-1',
        title: 'Thiết kế giao diện component checklist',
        done: false,
        assigneeName: 'Danny Do',
        sourceReplyId: 'reply-1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'chk-2',
        title: 'Viết unit test cho checklist',
        done: true,
        assigneeName: 'Khải',
        sourceReplyId: 'reply-2',
        createdAt: new Date().toISOString(),
      },
    ],
    activityLog: [
      {
        id: 'act-1',
        action: 'CREATE_TASK',
        actorName: 'Danny Do',
        description: 'Tạo công việc',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'act-2',
        action: 'TOGGLE_ITEM',
        actorName: 'Khải',
        description: 'Hoàn thành mục việc: "Viết unit test cho checklist"',
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const mockMsg: MosChatMessage = {
    id: 'msg-root-1',
    conversationId: 'space-test',
    senderId: '1',
    senderName: 'Danny Do',
    senderRole: 'Super Admin',
    text: 'Thảo luận nâng cấp Task với Checklist',
    timeLabel: '10:00',
    createdAt: new Date().toISOString(),
  };

  it('renders checklist header, progress, and all checklist items', () => {
    render(
      <MosChatThreadChecklist
        task={mockTask}
        activeThreadMessage={mockMsg}
        onToggleChecklistItem={vi.fn()}
        onAddChecklistItem={vi.fn()}
        onDeleteChecklistItem={vi.fn()}
        isDark={false}
      />
    );

    expect(screen.getByText('Checklist công việc')).toBeInTheDocument();
    expect(screen.getByText('1/2 (50%)')).toBeInTheDocument();
    expect(screen.getByText('Thiết kế giao diện component checklist')).toBeInTheDocument();
    expect(screen.getByText('Viết unit test cho checklist')).toBeInTheDocument();
  });

  it('triggers onToggleChecklistItem when clicking checkbox', () => {
    const handleToggle = vi.fn();
    render(
      <MosChatThreadChecklist
        task={mockTask}
        activeThreadMessage={mockMsg}
        onToggleChecklistItem={handleToggle}
        onAddChecklistItem={vi.fn()}
        onDeleteChecklistItem={vi.fn()}
        isDark={false}
      />
    );

    const buttons = screen.getAllByRole('button');
    // First item is unchecked
    fireEvent.click(buttons[3]); // Toggle button for item 1
    expect(handleToggle).toHaveBeenCalledWith('chk-1');
  });

  it('triggers onAddChecklistItem when typing and clicking Thêm', async () => {
    const handleAdd = vi.fn();
    render(
      <MosChatThreadChecklist
        task={mockTask}
        activeThreadMessage={mockMsg}
        onToggleChecklistItem={vi.fn()}
        onAddChecklistItem={handleAdd}
        onDeleteChecklistItem={vi.fn()}
        isDark={false}
      />
    );

    const input = screen.getByPlaceholderText('Thêm việc cần làm... (Enter để lưu)');
    fireEvent.change(input, { target: { value: 'Kiểm thử trên mobile' } });
    const addBtn = screen.getByRole('button', { name: 'Thêm' });
    fireEvent.click(addBtn);

    expect(handleAdd).toHaveBeenCalledWith('Kiểm thử trên mobile', null);
  });

  it('triggers onScrollToReply when clicking thread reply jump button', () => {
    const handleScroll = vi.fn();
    render(
      <MosChatThreadChecklist
        task={mockTask}
        activeThreadMessage={mockMsg}
        onToggleChecklistItem={vi.fn()}
        onAddChecklistItem={vi.fn()}
        onDeleteChecklistItem={vi.fn()}
        onScrollToReply={handleScroll}
        isDark={false}
      />
    );

    const jumpBtns = screen.getAllByRole('button', { name: 'Cuộn tới tin nhắn thảo luận gốc' });
    fireEvent.click(jumpBtns[0]);
    expect(handleScroll).toHaveBeenCalledWith('reply-1');
  });

  it('opens AI extraction preview modal when clicking AI trích xuất', async () => {
    (apiClient.chat.extractChecklist as any).mockResolvedValue({
      success: true,
      suggestions: [{ title: 'Tối ưu hiệu năng', assigneeName: 'Bảo Hân', sourceReplyId: 'reply-3' }],
    });

    render(
      <MosChatThreadChecklist
        task={mockTask}
        activeThreadMessage={mockMsg}
        onToggleChecklistItem={vi.fn()}
        onAddChecklistItem={vi.fn()}
        onDeleteChecklistItem={vi.fn()}
        isDark={false}
      />
    );

    const aiBtn = screen.getByRole('button', { name: 'AI trích xuất' });
    fireEvent.click(aiBtn);

    await waitFor(() => {
      expect(screen.getByText('AI Trích xuất Checklist từ Luồng Thảo Luận')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Tối ưu hiệu năng')).toBeInTheDocument();
    });
  });

  it('shows loading state when deleting a checklist item and disables button during deletion', async () => {
    let resolveDelete: () => void = () => {};
    const deletePromise = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    const handleDelete = vi.fn().mockReturnValue(deletePromise);

    render(
      <MosChatThreadChecklist
        task={mockTask}
        activeThreadMessage={mockMsg}
        onToggleChecklistItem={vi.fn()}
        onAddChecklistItem={vi.fn()}
        onDeleteChecklistItem={handleDelete}
        isDark={false}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: 'Xóa mục Thiết kế giao diện component checklist' });
    expect(deleteBtn).toBeInTheDocument();
    expect(deleteBtn).not.toBeDisabled();

    // Click delete
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith('chk-1');

    // While deletion is in-flight: button shows loading label and is disabled
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Đang xóa Thiết kế giao diện component checklist' })
      ).toBeDisabled();
    });

    // Clicking again while in-flight should NOT trigger another call (prevents double-click / timeout)
    fireEvent.click(screen.getByRole('button', { name: 'Đang xóa Thiết kế giao diện component checklist' }));
    expect(handleDelete).toHaveBeenCalledTimes(1);

    // Resolve deletion
    resolveDelete();
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Xóa mục Thiết kế giao diện component checklist' })
      ).not.toBeDisabled();
    });
  });

  it('shows loading spinner when toggling a checklist item and prevents double toggle', async () => {
    let resolveToggle: () => void = () => {};
    const togglePromise = new Promise<void>((resolve) => {
      resolveToggle = resolve;
    });
    const handleToggle = vi.fn().mockReturnValue(togglePromise);

    render(
      <MosChatThreadChecklist
        task={mockTask}
        activeThreadMessage={mockMsg}
        onToggleChecklistItem={handleToggle}
        onAddChecklistItem={vi.fn()}
        onDeleteChecklistItem={vi.fn()}
        isDark={false}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: 'Đánh dấu Thiết kế giao diện component checklist' });
    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalledWith('chk-1');

    // While toggling is in-flight: shows updating label and disabled
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Đang cập nhật Thiết kế giao diện component checklist' })
      ).toBeDisabled();
    });

    // Resolve toggle
    resolveToggle();
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Đánh dấu Thiết kế giao diện component checklist' })
      ).not.toBeDisabled();
    });
  });
});

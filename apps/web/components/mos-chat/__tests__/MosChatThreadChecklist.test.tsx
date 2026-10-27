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
});

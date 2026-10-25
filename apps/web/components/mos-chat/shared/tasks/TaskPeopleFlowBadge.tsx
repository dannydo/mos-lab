'use client';

import React from 'react';
import type { MosChatStaffMember, MosChatTaskItem } from '@mos-lab/shared';
import { MosChatAvatar } from '../../MosChatAvatar';
import { resolveTaskPeopleFlow } from '../../utils/chat-helpers';

export interface TaskPeopleFlowBadgeProps {
  task: MosChatTaskItem;
  staffDirectory: MosChatStaffMember[];
  isDark: boolean;
  compact?: boolean;
}

export const TaskPeopleFlowBadge: React.FC<TaskPeopleFlowBadgeProps> = ({
  task,
  staffDirectory,
  isDark,
  compact = false,
}) => {
  const peopleFlow = resolveTaskPeopleFlow(task, staffDirectory);
  const avatarSize = compact ? 15 : 16;

  return (
    <span
      className="inline-flex items-center leading-none"
      style={{
        gap: 4,
        padding: compact ? '2px 6px' : '2px 7px',
        borderRadius: 999,
        fontSize: compact ? 10.5 : 11,
        fontWeight: 600,
        background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
        border: `1px solid ${isDark ? '#27272a' : '#e2e8f0'}`,
        color: isDark ? '#e4e4e7' : '#334155',
      }}
      title={`Giao bởi: ${peopleFlow.assigner.name} → Phụ trách: ${peopleFlow.assignee.name}${
        peopleFlow.participants.length > 0
          ? ` · Liên quan: ${peopleFlow.participants.map((p) => p.name).join(', ')}`
          : ''
      }`}
    >
      <MosChatAvatar
        src={peopleFlow.assigner.avatar}
        name={peopleFlow.assigner.name}
        staffDirectory={staffDirectory}
        size={avatarSize}
        shape="circle"
      />
      <span style={{ opacity: 0.7 }}>{peopleFlow.assigner.name}</span>
      <span style={{ opacity: 0.5, fontSize: 10 }}>→</span>
      <MosChatAvatar
        src={peopleFlow.assignee.avatar}
        name={peopleFlow.assignee.name}
        staffDirectory={staffDirectory}
        size={avatarSize}
        shape="circle"
      />
      <span style={{ fontWeight: 700 }}>{peopleFlow.assignee.name}</span>

      {peopleFlow.participants.length > 0 && (
        <span
          className="inline-flex items-center leading-none"
          style={{
            marginLeft: 2,
            paddingLeft: 4,
            borderLeft: `1px solid ${isDark ? '#3f3f46' : '#cbd5e1'}`,
            gap: 2,
          }}
        >
          {peopleFlow.participants.slice(0, 3).map((part) => (
            <MosChatAvatar
              key={part.key}
              src={part.avatar}
              name={part.name}
              staffDirectory={staffDirectory}
              size={avatarSize - 2}
              shape="circle"
            />
          ))}
          {peopleFlow.participants.length > 3 && (
            <span className="tabular-nums" style={{ fontSize: 9.5, opacity: 0.75 }}>
              +{peopleFlow.participants.length - 3}
            </span>
          )}
        </span>
      )}
    </span>
  );
};

'use client';

import React from 'react';
import { Timeline, Typography } from 'antd';
import dayjs from 'dayjs';
import { StatusTag } from '~/components/ui';
import type { TicketCommentItem } from './types';

const { Title } = Typography;

export interface TicketCommentsTimelineProps {
  comments: TicketCommentItem[];
}

export function TicketCommentsTimeline({ comments }: TicketCommentsTimelineProps) {
  return (
    <div>
      <Title level={5}>Lịch sử trao đổi</Title>
      {comments.length > 0 ? (
        <Timeline
          items={comments.map((c, index) => {
            const isInternal = c.isInternal ?? c.internal ?? false;
            const author = c.userName || c.user || c.staffName || 'Hệ thống';
            const created = c.createdAt || c.time;
            return {
              key: c.id || index,
              color: isInternal ? 'gray' : 'blue',
              children: (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{author}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {created ? dayjs(created).format('DD/MM HH:mm') : ''}
                    </span>
                    {isInternal && <StatusTag status="default" label="Nội bộ" className="ml-2 border-dashed" />}
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{c.content}</div>
                </div>
              ),
            };
          })}
        />
      ) : (
        <div className="text-slate-500 dark:text-slate-400 text-sm italic">Chưa có bình luận/trao đổi nào</div>
      )}
    </div>
  );
}

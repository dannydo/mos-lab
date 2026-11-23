'use client';

import React from 'react';
import { StatusTag } from '../StatusTag';
import { COMMENT_CATEGORY_META, getAuthorAvatarClass } from './mermaidViewerConstants';
import type { NodeComment } from './mermaidViewerTypes';

export interface NodeCommentListProps {
  headerText: string;
  emptyText: string;
  comments: NodeComment[];
  variant: 'modal' | 'drawer';
}

export const NodeCommentList: React.FC<NodeCommentListProps> = ({ headerText, emptyText, comments, variant }) => {
  const isModal = variant === 'modal';

  return (
    <div>
      <div className={`flex items-center justify-between ${isModal ? 'mb-2' : 'mb-3'}`}>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 tabular-nums">
          {headerText} ({comments.length})
        </span>
      </div>

      {comments.length === 0 ? (
        <div
          className={`text-center rounded-xl text-slate-400 text-xs border border-dashed ${
            isModal
              ? 'p-5 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
              : 'p-6 border-slate-300 dark:border-slate-800'
          }`}
        >
          {emptyText}
        </div>
      ) : (
        <div className={isModal ? 'max-h-56 overflow-y-auto space-y-2.5 pr-1' : 'space-y-3'}>
          {comments.map((c) => {
            const categoryMeta = COMMENT_CATEGORY_META[c.category] || COMMENT_CATEGORY_META.technical;
            return (
              <div
                key={c.id}
                className={`${
                  isModal ? 'p-3 space-y-1.5' : 'p-3.5 space-y-2'
                } bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center rounded-full text-white font-extrabold shrink-0 shadow-xs ${
                        isModal ? 'w-[22px] h-[22px] text-xs' : 'w-6 h-6 text-xs'
                      } ${getAuthorAvatarClass(c.author)}`}
                    >
                      {c.author.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      {isModal ? (
                        <>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100">{c.author}</span>
                          <span className="text-[10px] text-slate-400 ml-2 tabular-nums">{c.createdAt}</span>
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{c.author}</div>
                          <div className="text-[10px] text-slate-400 tabular-nums">{c.createdAt}</div>
                        </>
                      )}
                    </div>
                  </div>

                  <StatusTag
                    status={categoryMeta.status}
                    bordered={false}
                    className="text-[10px] font-semibold"
                    label={categoryMeta.label}
                  />
                </div>

                <p className="m-0 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                  {c.content}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

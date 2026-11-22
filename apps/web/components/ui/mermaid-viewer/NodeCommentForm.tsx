'use client';

import React from 'react';
import { Button, Card, Input, Select } from 'antd';
import { Plus, User } from 'lucide-react';
import { COMMENT_CATEGORY_META } from './mermaidViewerConstants';
import type { CommentCategory } from './mermaidViewerTypes';

const { TextArea } = Input;

export interface NodeCommentFormProps {
  variant: 'modal' | 'drawer';
  authorName: string;
  commentCategory: CommentCategory;
  commentInput: string;
  onAuthorNameChange: (value: string) => void;
  onCategoryChange: (value: CommentCategory) => void;
  onCommentInputChange: (value: string) => void;
  onSubmit: () => void;
}

export const NodeCommentForm: React.FC<NodeCommentFormProps> = ({
  variant,
  authorName,
  commentCategory,
  commentInput,
  onAuthorNameChange,
  onCategoryChange,
  onCommentInputChange,
  onSubmit,
}) => {
  const isModal = variant === 'modal';
  const categoryOptions = (Object.keys(COMMENT_CATEGORY_META) as CommentCategory[]).map((key) => ({
    value: key,
    label: isModal ? COMMENT_CATEGORY_META[key].modalOptionLabel : COMMENT_CATEGORY_META[key].drawerOptionLabel,
  }));

  return (
    <Card
      title={
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          ✍️ Thêm Ghi Chú / Thảo Luận Mới
        </span>
      }
      size="small"
      className="shadow-xs rounded-xl dark:bg-slate-800/60 border-slate-200 dark:border-slate-800"
    >
      <div className="space-y-3">
        {isModal ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Người viết:
              </label>
              <Input
                size="small"
                value={authorName}
                onChange={(e) => onAuthorNameChange(e.target.value)}
                placeholder="Tên & Chức vụ..."
                prefix={<User size={12} className="text-slate-400" />}
              />
            </div>

            <div className="w-1/2">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Phân loại:
              </label>
              <Select
                size="small"
                className="w-full"
                value={commentCategory}
                onChange={onCategoryChange}
                getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                options={categoryOptions}
              />
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Người viết ghi chú:
              </label>
              <Input
                size="small"
                value={authorName}
                onChange={(e) => onAuthorNameChange(e.target.value)}
                placeholder="Tên & Chức vụ..."
                prefix={<User size={12} className="text-slate-400" />}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Phân loại ghi chú:
              </label>
              <Select
                size="small"
                className="w-full"
                value={commentCategory}
                onChange={onCategoryChange}
                getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                options={categoryOptions}
              />
            </div>
          </>
        )}

        <div>
          <label
            className={`${
              isModal ? 'text-[11px]' : 'text-xs'
            } font-semibold text-slate-600 dark:text-slate-400 block mb-1`}
          >
            {isModal ? 'Nội dung ghi chú:' : 'Nội dung chi tiết:'}
          </label>
          <TextArea
            rows={3}
            size={isModal ? 'small' : undefined}
            value={commentInput}
            onChange={(e) => onCommentInputChange(e.target.value)}
            placeholder={
              isModal
                ? 'Nhập hướng dẫn kịch bản hoặc lưu ý kỹ thuật cho bước này...'
                : 'Nhập hướng dẫn, lưu ý kịch bản hoặc lưu ý kỹ thuật cho bước này...'
            }
          />
        </div>

        <Button
          type="primary"
          icon={<Plus size={14} />}
          onClick={onSubmit}
          className="w-full bg-purple-600 hover:bg-purple-700 font-semibold border-none inline-flex items-center justify-center"
        >
          {isModal ? 'Lưu Ghi Chú Node' : 'Gửi Ghi Chú Node'}
        </Button>
      </div>
    </Card>
  );
};

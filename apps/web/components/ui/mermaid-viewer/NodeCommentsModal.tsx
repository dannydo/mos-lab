'use client';

import React from 'react';
import { Avatar } from 'antd';
import { AdaptiveModal } from '../AdaptiveOverlay';
import type { AvailableMermaidNode, CommentCategory, NodeComment, SelectedMermaidNode } from './mermaidViewerTypes';
import { NodeCommentForm } from './NodeCommentForm';
import { NodeCommentList } from './NodeCommentList';
import { NodeSelectorBanner } from './NodeSelectorBanner';

export interface NodeCommentsModalProps {
  open: boolean;
  onClose: () => void;
  availableNodes: AvailableMermaidNode[];
  selectedNode: SelectedMermaidNode | null;
  nodeComments: Record<string, NodeComment[]>;
  diagramId: string;
  currentNodeComments: NodeComment[];
  authorName: string;
  commentCategory: CommentCategory;
  commentInput: string;
  onSelectNode: (nodeId: string) => void;
  onAuthorNameChange: (value: string) => void;
  onCategoryChange: (value: CommentCategory) => void;
  onCommentInputChange: (value: string) => void;
  onSubmitComment: () => void;
}

export const NodeCommentsModal: React.FC<NodeCommentsModalProps> = ({
  open,
  onClose,
  availableNodes,
  selectedNode,
  nodeComments,
  diagramId,
  currentNodeComments,
  authorName,
  commentCategory,
  commentInput,
  onSelectNode,
  onAuthorNameChange,
  onCategoryChange,
  onCommentInputChange,
  onSubmitComment,
}) => {
  return (
    <AdaptiveModal
      intent="form"
      title={
        <div className="flex items-center gap-2 pr-6">
          <Avatar size="small" className="bg-purple-600 font-bold shrink-0">
            💬
          </Avatar>
          <div>
            <div className="font-extrabold text-base text-slate-800 dark:text-slate-100">Ghi Chú & Thảo Luận Step</div>
            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
              Node: {selectedNode?.title || 'Chọn một Node'}
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      zIndex={1050}
      centered
      className="dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="space-y-5 pt-2">
        <NodeSelectorBanner
          bannerLabel="📌 Đang Chọn Bước Quy Trình:"
          countSuffix="Ghi chú đã lưu"
          containerPaddingClass="p-3.5"
          availableNodes={availableNodes}
          selectedNode={selectedNode}
          nodeComments={nodeComments}
          diagramId={diagramId}
          currentCommentsCount={currentNodeComments.length}
          onSelectNode={onSelectNode}
        />

        <NodeCommentList
          headerText="💬 Ghi Chú Đã Lưu Cho Bước Này"
          emptyText="Chưa có ghi chú nào cho bước này. Hãy viết note mới đầu tiên ở dưới!"
          comments={currentNodeComments}
          variant="modal"
        />

        <NodeCommentForm
          variant="modal"
          authorName={authorName}
          commentCategory={commentCategory}
          commentInput={commentInput}
          onAuthorNameChange={onAuthorNameChange}
          onCategoryChange={onCategoryChange}
          onCommentInputChange={onCommentInputChange}
          onSubmit={onSubmitComment}
        />
      </div>
    </AdaptiveModal>
  );
};

'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { AdaptiveDrawer } from '../AdaptiveOverlay';
import type { AvailableMermaidNode, CommentCategory, NodeComment, SelectedMermaidNode } from './mermaidViewerTypes';
import { NodeCommentForm } from './NodeCommentForm';
import { NodeCommentList } from './NodeCommentList';
import { NodeSelectorBanner } from './NodeSelectorBanner';

export interface NodeCommentsDrawerProps {
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

export const NodeCommentsDrawer: React.FC<NodeCommentsDrawerProps> = ({
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
    <AdaptiveDrawer
      intent="form"
      title={
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-purple-500 shrink-0" />
          <div>
            <div className="font-extrabold text-base text-slate-800 dark:text-slate-100">Ghi Chú Quy Trình Step</div>
            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
              Node: {selectedNode?.title || 'Chọn một Node'}
            </div>
          </div>
        </div>
      }
      placement="right"
      width={460}
      onClose={onClose}
      open={open}
      getContainer={false}
      rootClassName="absolute z-[1050]"
      className="dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="space-y-6">
        <NodeSelectorBanner
          bannerLabel="📌 Chọn Node Quy Trình Thắc Mắc / Cần Ghi Chú:"
          countSuffix="Ghi chú đã đính kèm"
          containerPaddingClass="p-4"
          availableNodes={availableNodes}
          selectedNode={selectedNode}
          nodeComments={nodeComments}
          diagramId={diagramId}
          currentCommentsCount={currentNodeComments.length}
          onSelectNode={onSelectNode}
        />

        <NodeCommentForm
          variant="drawer"
          authorName={authorName}
          commentCategory={commentCategory}
          commentInput={commentInput}
          onAuthorNameChange={onAuthorNameChange}
          onCategoryChange={onCategoryChange}
          onCommentInputChange={onCommentInputChange}
          onSubmit={onSubmitComment}
        />

        <NodeCommentList
          headerText="💬 Các Ghi Chú Đã Lưu"
          emptyText="Chưa có ghi chú nào cho bước này. Hãy viết ghi chú đầu tiên ở trên!"
          comments={currentNodeComments}
          variant="drawer"
        />
      </div>
    </AdaptiveDrawer>
  );
};

'use client';

import React from 'react';
import { Select } from 'antd';
import { StatusTag } from '../StatusTag';
import type { AvailableMermaidNode, NodeComment, SelectedMermaidNode } from './mermaidViewerTypes';

export interface NodeSelectorBannerProps {
  bannerLabel: string;
  countSuffix: string;
  containerPaddingClass?: string;
  availableNodes: AvailableMermaidNode[];
  selectedNode: SelectedMermaidNode | null;
  nodeComments: Record<string, NodeComment[]>;
  diagramId: string;
  currentCommentsCount: number;
  onSelectNode: (nodeId: string) => void;
}

export const NodeSelectorBanner: React.FC<NodeSelectorBannerProps> = ({
  bannerLabel,
  countSuffix,
  containerPaddingClass = 'p-3.5',
  availableNodes,
  selectedNode,
  nodeComments,
  diagramId,
  currentCommentsCount,
  onSelectNode,
}) => {
  return (
    <div
      className={`${containerPaddingClass} bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2`}
    >
      <div className="text-xs font-bold text-purple-800 dark:text-purple-200 uppercase tracking-wider">
        {bannerLabel}
      </div>
      <Select
        className="w-full"
        value={selectedNode?.id}
        getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
        onChange={onSelectNode}
        options={availableNodes.map((n) => {
          const count = (nodeComments[`${diagramId}:${n.id}`] || []).length;
          return {
            value: n.id,
            label: `${count > 0 ? `💬 (${count}) ` : ''}Node: ${n.title}`,
          };
        })}
      />
      {selectedNode && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center justify-between">
          <span>
            ID Kỹ thuật: <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">{selectedNode.id}</code>
          </span>
          {currentCommentsCount > 0 && (
            <StatusTag
              status="purple"
              bordered={false}
              className="text-[10px] font-bold"
              label={
                <span className="tabular-nums">
                  {currentCommentsCount} {countSuffix}
                </span>
              }
            />
          )}
        </div>
      )}
    </div>
  );
};

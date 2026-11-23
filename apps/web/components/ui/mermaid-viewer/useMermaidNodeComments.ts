'use client';

import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { message } from 'antd';
import dayjs from 'dayjs';
import { DEFAULT_AUTHOR_NAME, DEFAULT_NODE_COMMENTS, NODE_COMMENTS_STORAGE_KEY } from './mermaidViewerConstants';
import { extractMermaidNodeInfo, syncSvgNodeDecorations } from './mermaidSvgUtils';
import type { AvailableMermaidNode, CommentCategory, NodeComment, SelectedMermaidNode } from './mermaidViewerTypes';

export interface UseMermaidNodeCommentsOptions {
  svgWrapperRef: React.RefObject<HTMLDivElement | null>;
  svgContent: string;
  loading: boolean;
  diagramId: string;
}

function loadInitialNodeComments(): Record<string, NodeComment[]> {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(NODE_COMMENTS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as Record<string, NodeComment[]>;
      }
    } catch (e) {
      console.error('Error parsing saved node comments:', e);
    }
  }
  return DEFAULT_NODE_COMMENTS;
}

function areAvailableNodesEqual(prev: AvailableMermaidNode[], next: AvailableMermaidNode[]): boolean {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (prev[i].id !== next[i].id || prev[i].title !== next[i].title) {
      return false;
    }
  }
  return true;
}

export function useMermaidNodeComments({
  svgWrapperRef,
  svgContent,
  loading,
  diagramId,
}: UseMermaidNodeCommentsOptions) {
  const [selectedNode, setSelectedNode] = useState<SelectedMermaidNode | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [availableNodes, setAvailableNodes] = useState<AvailableMermaidNode[]>([]);
  const [nodeComments, setNodeComments] = useState<Record<string, NodeComment[]>>(loadInitialNodeComments);

  const [commentInput, setCommentInput] = useState<string>('');
  const [commentCategory, setCommentCategory] = useState<CommentCategory>('training');
  const [authorName, setAuthorName] = useState<string>(DEFAULT_AUTHOR_NAME);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(NODE_COMMENTS_STORAGE_KEY, JSON.stringify(nodeComments));
      } catch (e) {
        console.error('Error saving node comments:', e);
      }
    }
  }, [nodeComments]);

  useEffect(() => {
    const wrapper = svgWrapperRef.current;
    if (!wrapper || loading) return;

    const extractedNodes = syncSvgNodeDecorations({
      wrapper,
      diagramId,
      nodeComments,
      selectedNode,
    });

    setAvailableNodes((prev) => (areAvailableNodesEqual(prev, extractedNodes) ? prev : extractedNodes));

    const handleWrapperClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | SVGElement;
      const nodeEl = target.closest('.node') as SVGGraphicsElement | null;
      if (!nodeEl) return;

      e.preventDefault();
      e.stopPropagation();

      const nodeInfo = extractMermaidNodeInfo(nodeEl);

      flushSync(() => {
        setSelectedNode(nodeInfo);
        setModalOpen(true);
      });
    };

    wrapper.addEventListener('click', handleWrapperClick);

    return () => {
      wrapper.removeEventListener('click', handleWrapperClick);
    };
  }, [svgWrapperRef, svgContent, loading, nodeComments, diagramId, selectedNode]);

  const handleAddComment = useCallback(() => {
    if (!selectedNode || !commentInput.trim()) {
      message.warning('Vui lòng nhập nội dung ghi chú');
      return;
    }

    const key = `${diagramId}:${selectedNode.id}`;
    const newComment: NodeComment = {
      id: `c_${Date.now()}`,
      author: authorName || 'Nhân sự CSKH',
      role: 'Chuyên viên CSKH',
      category: commentCategory,
      content: commentInput.trim(),
      createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    };

    setNodeComments((prev) => ({
      ...prev,
      [key]: [newComment, ...(prev[key] || [])],
    }));

    setCommentInput('');
    message.success(`Đã thêm ghi chú cho node [${selectedNode.title}]`);
  }, [authorName, commentCategory, commentInput, diagramId, selectedNode]);

  const handleOpenCommentsFromToolbar = useCallback(() => {
    if (!selectedNode && availableNodes.length > 0) {
      setSelectedNode({
        id: availableNodes[0].id,
        rawId: '',
        title: availableNodes[0].title,
      });
    }
    setModalOpen(true);
  }, [availableNodes, selectedNode]);

  const handleSelectNodeById = useCallback(
    (nodeId: string) => {
      const found = availableNodes.find((n) => n.id === nodeId);
      if (found) {
        setSelectedNode({
          id: found.id,
          rawId: '',
          title: found.title,
        });
      }
    },
    [availableNodes]
  );

  const currentNodeComments = useMemo(() => {
    if (!selectedNode) return [];
    const key = `${diagramId}:${selectedNode.id}`;
    return nodeComments[key] || [];
  }, [diagramId, nodeComments, selectedNode]);

  const totalCommentsCount = useMemo(
    () => Object.values(nodeComments).reduce((acc, arr) => acc + arr.length, 0),
    [nodeComments]
  );

  return {
    selectedNode,
    modalOpen,
    setModalOpen,
    drawerOpen,
    setDrawerOpen,
    availableNodes,
    nodeComments,
    commentInput,
    setCommentInput,
    commentCategory,
    setCommentCategory,
    authorName,
    setAuthorName,
    currentNodeComments,
    totalCommentsCount,
    handleAddComment,
    handleOpenCommentsFromToolbar,
    handleSelectNodeById,
  };
}

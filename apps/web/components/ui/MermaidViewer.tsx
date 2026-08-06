'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Space,
  Tooltip,
  Card,
  Typography,
  Spin,
  Tag,
  Drawer,
  Modal,
  Form,
  Input,
  Select,
  List,
  Avatar,
  message,
  Badge,
  Popover,
  Divider,
} from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ColumnWidthOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  DownloadOutlined,
  DesktopOutlined,
  CompressOutlined,
  MessageOutlined,
  UserOutlined,
  PlusOutlined,
  BookOutlined,
  CommentOutlined,
  SendOutlined,
  CloseOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../context/ThemeContext';

import { flushSync } from 'react-dom';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

export interface NodeComment {
  id: string;
  author: string;
  role: string;
  category: 'training' | 'operations' | 'technical';
  content: string;
  createdAt: string;
}

export const getAuthorColor = (name: string): string => {
  if (!name) return '#8b5cf6';
  if (name.includes('Phương Giao')) return '#a855f7'; // Purple
  if (name.includes('Ngọc Điệp')) return '#ec4899'; // Pink
  if (name.includes('Trưởng KTV')) return '#f59e0b'; // Amber
  if (name.includes('Tech Admin')) return '#06b6d4'; // Cyan
  return '#3b82f6'; // Blue
};

interface MermaidViewerProps {
  chart: string;
  title?: string;
  height?: string | number;
  showToolbar?: boolean;
  diagramId?: string;
}

// Initial pre-seeded training comments for key workflow steps
const DEFAULT_NODE_COMMENTS: Record<string, NodeComment[]> = {
  'cs-warranty:Start': [
    {
      id: 'c1',
      author: 'Phương Giao',
      role: 'CSKH Lead',
      category: 'operations',
      content:
        'Chỉ quét đơn có trạng thái order_state = Completed. Kiểm tra thời điểm actual_booking_date_start để tính hạn 72h bảo hành 3 ngày kiểu Úc.',
      createdAt: '2026-08-06 08:30',
    },
  ],
  'cs-warranty:TaskGen': [
    {
      id: 'c5',
      author: 'Ngọc Điệp',
      role: 'Telesales Leader',
      category: 'operations',
      content:
        'Hệ thống tự tạo Task Happy Call cho đội CSKH theo thuật toán phân bổ xoay vòng Round-Robin dựa trên danh sách ACTIVE_CS_STAFF_CONFIG.',
      createdAt: '2026-08-06 08:35',
    },
  ],
  'cs-warranty:Stage1': [
    {
      id: 'c2',
      author: 'Ngọc Điệp',
      role: 'Booking Leader',
      category: 'training',
      content:
        'CSKH tuyệt đối không hứa trước Fix/Adjust/Log khi gọi điện. Chỉ hỗ trợ Đặt Lịch Hẹn Đón Khách Đến Shop 0đ (Stage 1) để Trưởng KTV soi mi trực tiếp.',
      createdAt: '2026-08-06 08:45',
    },
  ],
  'cs-warranty:Stage2': [
    {
      id: 'c3',
      author: 'Trưởng KTV Store',
      role: 'Technical Lead',
      category: 'technical',
      content:
        'Soi mi trực tiếp dưới đèn tại tiệm. Nhập kết quả soi mi vào Sub-task (ví dụ: Chân mi bết keo ca cũ) trước khi phân công KTV Senior làm mới.',
      createdAt: '2026-08-06 09:00',
    },
  ],
  'cs-warranty:MidnightCron': [
    {
      id: 'c4',
      author: 'Tech Admin',
      role: 'System Architect',
      category: 'technical',
      content:
        'Cronjob OrderRegenerationService.php chạy tự động lúc 02:00 AM, 02:10 AM, 02:20 AM ICT quét 3 ngày lùi để làm sạch và thu hồi thưởng KTV/CC cũ.',
      createdAt: '2026-08-06 09:15',
    },
  ],
};

export const MermaidViewer: React.FC<MermaidViewerProps> = ({
  chart,
  title = 'Sơ Đồ Quy Trình Systems',
  height = '600px',
  showToolbar = true,
  diagramId = 'cs-warranty',
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);

  const [svgContent, setSvgContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Node Comments & Interactive Modal / Drawer State
  const [selectedNode, setSelectedNode] = useState<{ id: string; rawId: string; title: string } | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [availableNodes, setAvailableNodes] = useState<Array<{ id: string; title: string }>>([]);

  const [nodeComments, setNodeComments] = useState<Record<string, NodeComment[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_lab_node_comments_v1');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing saved node comments:', e);
        }
      }
    }
    return DEFAULT_NODE_COMMENTS;
  });

  // Comment Form State
  const [commentInput, setCommentInput] = useState<string>('');
  const [commentCategory, setCommentCategory] = useState<'training' | 'operations' | 'technical'>('training');
  const [authorName, setAuthorName] = useState<string>('Phương Giao (CSKH Lead)');

  // Save comments to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_lab_node_comments_v1', JSON.stringify(nodeComments));
    }
  }, [nodeComments]);

  // Dynamic Mermaid import & render
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function renderChart() {
      try {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'neutral',
          securityLevel: 'loose',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          flowchart: {
            useMaxWidth: false,
            htmlLabels: false,
            curve: 'basis',
            nodeSpacing: 90,
            rankSpacing: 100,
            padding: 24,
          },
          themeVariables: {
            fontSize: '13px',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            edgeLabelBackground: isDark ? '#1e293b' : '#ffffff',
          },
        });

        const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
        let { svg } = await mermaid.render(id, chart);

        // Inject clean native SVG styling for edge labels and clickable nodes
        const customStyle = `
          <style>
            #${id} {
              max-width: none !important;
            }
            #${id} .node {
              cursor: pointer !important;
              transition: all 0.2s ease-in-out;
            }
            #${id} .node:hover rect,
            #${id} .node:hover polygon,
            #${id} .node:hover circle,
            #${id} .node:hover path {
              stroke: #38bdf8 !important;
              stroke-width: 3.5px !important;
              filter: drop-shadow(0 0 12px rgba(56, 189, 248, 0.8));
            }
            #${id} .node-active rect,
            #${id} .node-active polygon,
            #${id} .node-active circle,
            #${id} .node-active path {
              stroke: #38bdf8 !important;
              stroke-width: 4px !important;
              filter: drop-shadow(0 0 15px rgba(56, 189, 248, 0.9));
            }
            #${id} .node-has-comments rect,
            #${id} .node-has-comments polygon,
            #${id} .node-has-comments circle,
            #${id} .node-has-comments path {
              stroke: #a855f7 !important;
              stroke-width: 2.5px !important;
            }
            #${id} .edgeLabel rect {
              fill: ${isDark ? '#1e293b' : '#ffffff'} !important;
              stroke: ${isDark ? '#475569' : '#cbd5e1'} !important;
              stroke-width: 1.5px !important;
              rx: 6px !important;
              ry: 6px !important;
              opacity: 0.95 !important;
            }
            #${id} .edgeLabel text,
            #${id} .edgeLabel tspan {
              fill: ${isDark ? '#f8fafc' : '#0f172a'} !important;
              font-family: Inter, system-ui, -apple-system, sans-serif !important;
              font-size: 12px !important;
              font-weight: 500 !important;
              text-anchor: middle !important;
              dominant-baseline: central !important;
              transform: translateY(-4px) !important;
            }
          </style>
        `;
        svg = svg.replace(/<style>([\s\S]*?)<\/style>/, `<style>$1\n${customStyle}</style>`);

        if (isMounted) {
          setSvgContent(svg);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setError(err.message || 'Lỗi render sơ đồ Mermaid');
          setLoading(false);
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, isDark]);

  // Attach SVG node click listeners and inject floating 💬 Badges directly on nodes
  useEffect(() => {
    if (!svgWrapperRef.current || loading) return;

    const nodes = svgWrapperRef.current.querySelectorAll('.node');
    const cleanupFns: Array<() => void> = [];
    const extractedNodes: Array<{ id: string; title: string }> = [];

    nodes.forEach((node) => {
      const element = node as SVGGraphicsElement;
      element.style.cursor = 'pointer';

      // Extract node ID and Text
      const rawId = element.id || '';
      const idMatch = rawId.match(/flowchart-([^-]+)-\d+/);
      const cleanNodeId = idMatch ? idMatch[1] : rawId.replace(/[^a-zA-Z0-9]/g, '') || 'Node';

      const textElements = Array.from(element.querySelectorAll('text, tspan, span, p'));
      const fullText =
        textElements
          .map((t) => t.textContent?.trim())
          .filter(Boolean)
          .join(' ') || cleanNodeId;

      extractedNodes.push({ id: cleanNodeId, title: fullText });

      const nodeKey = `${diagramId}:${cleanNodeId}`;
      const comments = nodeComments[nodeKey] || [];
      const commentsCount = comments.length;

      // Add visual class if node has comments
      if (commentsCount > 0) {
        element.classList.add('node-has-comments');
      } else {
        element.classList.remove('node-has-comments');
      }

      // Highlight active selected node
      if (selectedNode && selectedNode.id === cleanNodeId) {
        element.classList.add('node-active');
      } else {
        element.classList.remove('node-active');
      }

      // Remove existing badge group if re-rendering
      const existingBadge = element.querySelector('.node-comment-badge');
      if (existingBadge) {
        existingBadge.remove();
      }

      // Inject Native SVG Floating Author Avatar + Badge Directly onto Top-Right Corner of Node
      if (commentsCount > 0 && typeof element.getBBox === 'function') {
        try {
          const bBox = element.getBBox();
          const badgeX = bBox.x + bBox.width - 2;
          const badgeY = bBox.y + 2;

          const latestComment = comments[0];
          const authorName = latestComment?.author || 'User';
          const authorInitial = authorName.charAt(0).toUpperCase();
          const avatarColor = getAuthorColor(authorName);

          const badgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          badgeGroup.setAttribute('class', 'node-comment-badge');
          badgeGroup.setAttribute('style', 'cursor: pointer;');

          // 1. Author Avatar Circle
          const avatarCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          avatarCircle.setAttribute('cx', String(badgeX - 16));
          avatarCircle.setAttribute('cy', String(badgeY));
          avatarCircle.setAttribute('r', '11');
          avatarCircle.setAttribute('fill', avatarColor);
          avatarCircle.setAttribute('stroke', '#ffffff');
          avatarCircle.setAttribute('stroke-width', '1.5');
          avatarCircle.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))');

          // 2. Author Initial Text
          const avatarText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          avatarText.setAttribute('x', String(badgeX - 16));
          avatarText.setAttribute('y', String(badgeY + 4));
          avatarText.setAttribute('fill', '#ffffff');
          avatarText.setAttribute('font-size', '10');
          avatarText.setAttribute('font-weight', '900');
          avatarText.setAttribute('font-family', 'Inter, sans-serif');
          avatarText.setAttribute('text-anchor', 'middle');
          avatarText.textContent = authorInitial;

          // 3. Comment Count Badge Pill
          const countPill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          countPill.setAttribute('x', String(badgeX - 4));
          countPill.setAttribute('y', String(badgeY - 9));
          countPill.setAttribute('width', commentsCount > 9 ? '32' : '26');
          countPill.setAttribute('height', '18');
          countPill.setAttribute('rx', '9');
          countPill.setAttribute('fill', '#0f172a');
          countPill.setAttribute('stroke', avatarColor);
          countPill.setAttribute('stroke-width', '1.5');
          countPill.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))');

          // 4. Comment Count Text
          const countText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          countText.setAttribute('x', String(badgeX + (commentsCount > 9 ? 12 : 9)));
          countText.setAttribute('y', String(badgeY + 3));
          countText.setAttribute('fill', '#ffffff');
          countText.setAttribute('font-size', '10');
          countText.setAttribute('font-weight', '800');
          countText.setAttribute('font-family', 'Inter, sans-serif');
          countText.setAttribute('text-anchor', 'middle');
          countText.textContent = `💬${commentsCount}`;

          badgeGroup.appendChild(avatarCircle);
          badgeGroup.appendChild(avatarText);
          badgeGroup.appendChild(countPill);
          badgeGroup.appendChild(countText);
          element.appendChild(badgeGroup);
        } catch (e) {
          console.error('Error injecting SVG badge:', e);
        }
      }
    });

    setAvailableNodes(extractedNodes);

    // Event Delegation on SVG wrapper for 100% reliable node clicks
    const handleWrapperClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | SVGElement;
      const nodeEl = target.closest('.node') as SVGGraphicsElement | null;
      if (!nodeEl) return;

      e.preventDefault();
      e.stopPropagation();

      const rawId = nodeEl.id || '';
      const idMatch = rawId.match(/flowchart-([^-]+)-\d+/);
      const cleanNodeId = idMatch ? idMatch[1] : rawId.replace(/[^a-zA-Z0-9]/g, '') || 'Node';

      const textElements = Array.from(nodeEl.querySelectorAll('text, tspan, span, p'));
      const fullText =
        textElements
          .map((t) => t.textContent?.trim())
          .filter(Boolean)
          .join(' ') || cleanNodeId;

      flushSync(() => {
        setSelectedNode({
          id: cleanNodeId,
          rawId,
          title: fullText,
        });
        setModalOpen(true);
      });
    };

    const wrapper = svgWrapperRef.current;
    wrapper.addEventListener('click', handleWrapperClick);

    return () => {
      wrapper.removeEventListener('click', handleWrapperClick);
      cleanupFns.forEach((fn) => fn());
    };
  }, [svgContent, loading, nodeComments, diagramId, selectedNode]);

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.2));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Fit to Screen auto-scale handler
  const handleFitToScreen = () => {
    if (!containerRef.current || !svgWrapperRef.current) return;
    const svgEl = svgWrapperRef.current.querySelector('svg');
    if (!svgEl) return;

    const containerWidth = containerRef.current.clientWidth - 48;
    const containerHeight = containerRef.current.clientHeight - 80;

    let svgWidth = 1000;
    let svgHeight = 1200;

    const viewBox = svgEl.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        svgWidth = parts[2];
        svgHeight = parts[3];
      }
    }

    const scaleX = containerWidth / svgWidth;
    const scaleY = containerHeight / svgHeight;
    const fitScale = Math.min(scaleX, scaleY);

    setZoom(Math.max(fitScale, 0.15));
    setPan({ x: 0, y: 0 });
  };

  // Pan / Drag handlers (prevent drag if user clicked on a .node)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest && target.closest('.node')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev + 0.1, 3));
    } else {
      setZoom((prev) => Math.max(prev - 0.1, 0.15));
    }
  };

  // Fullscreen toggle with auto Fit to Screen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
          setTimeout(handleFitToScreen, 150);
        })
        .catch(console.error);
    } else {
      document
        .exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
          setTimeout(handleFitToScreen, 150);
        })
        .catch(console.error);
    }
  };

  // Open in standalone 4K popup window with real Next.js route URL
  const openIn4KWindow = () => {
    const standaloneUrl = `/dashboard/diagrams?standalone=true&id=${encodeURIComponent(diagramId)}`;
    window.open(standaloneUrl, '_blank', 'width=3840,height=2160,menubar=no,toolbar=no,location=no,status=no');
  };

  // Download SVG file
  const downloadSVG = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_diagram.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle adding a new comment to the selected node
  const handleAddComment = () => {
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
  };

  // Open modal/drawer from toolbar
  const handleOpenCommentsFromToolbar = () => {
    if (!selectedNode && availableNodes.length > 0) {
      setSelectedNode({
        id: availableNodes[0].id,
        rawId: '',
        title: availableNodes[0].title,
      });
    }
    setModalOpen(true);
  };

  // Current node comments
  const currentNodeKey = selectedNode ? `${diagramId}:${selectedNode.id}` : '';
  const currentNodeComments = currentNodeKey ? nodeComments[currentNodeKey] || [] : [];
  const totalCommentsCount = Object.values(nodeComments).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border transition-all relative overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 p-6 bg-slate-900 text-white' : ''
      } ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* Toolbar Header */}
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur z-20 shrink-0">
          <div className="flex items-center gap-2">
            <Text className="font-extrabold text-sm text-slate-800 dark:text-slate-100">📊 {title}</Text>
            <Tag color="cyan" className="font-semibold text-[11px] border-0">
              {Math.round(zoom * 100)}%
            </Tag>
            <Button
              size="small"
              type="primary"
              icon={<MessageOutlined />}
              onClick={handleOpenCommentsFromToolbar}
              className="bg-purple-600 hover:bg-purple-700 border-none font-medium text-xs flex items-center"
            >
              💬 Quản Lý Ghi Chú Node ({totalCommentsCount})
            </Button>
          </div>

          <Space size="small" className="flex-wrap">
            <Tooltip title="Fit to Screen (Tự động co vừa 100% màn 4K)">
              <Button
                size="small"
                type="primary"
                icon={<CompressOutlined />}
                onClick={handleFitToScreen}
                className="bg-emerald-600 hover:bg-emerald-700 border-none font-medium text-xs"
              >
                📐 Fit to Screen
              </Button>
            </Tooltip>

            <Tooltip title="Phóng to (Zoom In)">
              <Button size="small" icon={<ZoomInOutlined />} onClick={handleZoomIn} />
            </Tooltip>
            <Tooltip title="Thu nhỏ (Zoom Out)">
              <Button size="small" icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
            </Tooltip>
            <Tooltip title="Về chuẩn 100%">
              <Button size="small" icon={<ColumnWidthOutlined />} onClick={handleResetZoom}>
                Reset
              </Button>
            </Tooltip>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

            <Tooltip title="Mở Cửa Sổ Độc Lập Kéo Sang Màn 4K Thứ 2">
              <Button
                size="small"
                type="primary"
                icon={<DesktopOutlined />}
                onClick={openIn4KWindow}
                className="bg-indigo-600 hover:bg-indigo-700 border-none font-medium text-xs"
              >
                🖥️ Mở Cửa Sổ Riêng 4K
              </Button>
            </Tooltip>

            <Tooltip title={isFullscreen ? 'Thoát Toàn Màn Hình' : 'Toàn Màn Hình 4K'}>
              <Button
                size="small"
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={toggleFullscreen}
              />
            </Tooltip>

            <Tooltip title="Tải File SVG Sắc Nét">
              <Button size="small" icon={<DownloadOutlined />} onClick={downloadSVG} />
            </Tooltip>
          </Space>
        </div>
      )}

      {/* Main Interactive Diagram Canvas */}
      <div
        className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing select-none flex items-start justify-center pt-6 p-4"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 my-auto">
            <Spin size="large" />
            <Text type="secondary" className="text-xs">
              Đang render sơ đồ Mermaid SVG chuẩn 4K...
            </Text>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 text-xs my-auto">
            ⚠️ <strong>Lỗi render sơ đồ:</strong> {error}
          </div>
        )}

        {!loading && !error && (
          <div
            ref={svgWrapperRef}
            className="transition-transform duration-75 ease-out flex justify-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center top',
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>

      {/* Instant Interactive Node Comment Modal (100% Reliable Popover Centered Centric) */}
      <Modal
        title={
          <div className="flex items-center gap-2 pr-6">
            <Avatar size="small" className="bg-purple-600 font-bold shrink-0">
              💬
            </Avatar>
            <div>
              <div className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                Ghi Chú & Thảo Luận Step
              </div>
              <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                Node: {selectedNode?.title || 'Chọn một Node'}
              </div>
            </div>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={560}
        zIndex={1050}
        centered
        className="dark:bg-slate-900 dark:text-slate-100"
      >
        <div className="space-y-5 pt-2">
          {/* Node Selector Banner */}
          <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2">
            <div className="text-xs font-bold text-purple-800 dark:text-purple-200 uppercase tracking-wider">
              📌 Đang Chọn Bước Quy Trình:
            </div>
            <Select
              style={{ width: '100%' }}
              value={selectedNode?.id}
              getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
              onChange={(val) => {
                const found = availableNodes.find((n) => n.id === val);
                if (found) {
                  setSelectedNode({
                    id: found.id,
                    rawId: '',
                    title: found.title,
                  });
                }
              }}
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
                {currentNodeComments.length > 0 && (
                  <Tag color="purple" className="text-[10px] font-bold border-0">
                    {currentNodeComments.length} Ghi chú đã lưu
                  </Tag>
                )}
              </div>
            )}
          </div>

          {/* List of Existing Old Notes for this Node */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                💬 Ghi Chú Đã Lưu Cho Bước Này ({currentNodeComments.length})
              </span>
            </div>

            {currentNodeComments.length === 0 ? (
              <div className="text-center p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800">
                Chưa có ghi chú nào cho bước này. Hãy viết note mới đầu tiên ở dưới!
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
                {currentNodeComments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar
                          size={22}
                          style={{ backgroundColor: getAuthorColor(c.author) }}
                          className="font-extrabold text-xs shadow-xs"
                        >
                          {c.author.charAt(0).toUpperCase()}
                        </Avatar>
                        <div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100">{c.author}</span>
                          <span className="text-[10px] text-slate-400 ml-2">{c.createdAt}</span>
                        </div>
                      </div>

                      <Tag
                        color={c.category === 'training' ? 'blue' : c.category === 'operations' ? 'orange' : 'purple'}
                        className="text-[10px] border-0 font-semibold"
                      >
                        {c.category === 'training' ? 'Đào Tạo' : c.category === 'operations' ? 'Vận Hành' : 'Technical'}
                      </Tag>
                    </div>

                    <Paragraph className="!mb-0 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                      {c.content}
                    </Paragraph>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Add Note Form Inline at Node */}
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
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Người viết:
                  </label>
                  <Input
                    size="small"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Tên & Chức vụ..."
                    prefix={<UserOutlined className="text-slate-400" />}
                  />
                </div>

                <div className="w-1/2">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Phân loại:
                  </label>
                  <Select
                    size="small"
                    style={{ width: '100%' }}
                    value={commentCategory}
                    onChange={setCommentCategory}
                    getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                    options={[
                      { value: 'training', label: '📘 Đào Tạo' },
                      { value: 'operations', label: '⚡ Vận Hành' },
                      { value: 'technical', label: '⚙️ Technical' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Nội dung ghi chú:
                </label>
                <TextArea
                  rows={3}
                  size="small"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Nhập hướng dẫn kịch bản hoặc lưu ý kỹ thuật cho bước này..."
                />
              </div>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddComment}
                className="w-full bg-purple-600 hover:bg-purple-700 font-semibold border-none"
              >
                Lưu Ghi Chú Node
              </Button>
            </div>
          </Card>
        </div>
      </Modal>

      {/* Full Drawer Side Panel (Retained for Advanced Navigation) */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <CommentOutlined className="text-purple-500 text-lg" />
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
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        getContainer={false}
        rootStyle={{ position: 'absolute', zIndex: 1050 }}
        className="dark:bg-slate-900 dark:text-slate-100"
      >
        <div className="space-y-6">
          {/* Node Selector Banner */}
          <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2">
            <div className="text-xs font-bold text-purple-800 dark:text-purple-200 uppercase tracking-wider">
              📌 Chọn Node Quy Trình Thắc Mắc / Cần Ghi Chú:
            </div>
            <Select
              style={{ width: '100%' }}
              value={selectedNode?.id}
              getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
              onChange={(val) => {
                const found = availableNodes.find((n) => n.id === val);
                if (found) {
                  setSelectedNode({
                    id: found.id,
                    rawId: '',
                    title: found.title,
                  });
                }
              }}
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
                {currentNodeComments.length > 0 && (
                  <Tag color="purple" className="text-[10px] font-bold border-0">
                    {currentNodeComments.length} Ghi chú đã đính kèm
                  </Tag>
                )}
              </div>
            )}
          </div>

          {/* Form to Add New Comment */}
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
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Người viết ghi chú:
                </label>
                <Input
                  size="small"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Tên & Chức vụ..."
                  prefix={<UserOutlined className="text-slate-400" />}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Phân loại ghi chú:
                </label>
                <Select
                  size="small"
                  style={{ width: '100%' }}
                  value={commentCategory}
                  onChange={setCommentCategory}
                  getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                  options={[
                    { value: 'training', label: '📘 Lưu ý Đào Tạo & Kịch Bản' },
                    { value: 'operations', label: '⚡ Quy tắc Vận Hành Thực Tế' },
                    { value: 'technical', label: '⚙️ Cấu Hình Technical & Cronjob' },
                  ]}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Nội dung chi tiết:
                </label>
                <TextArea
                  rows={3}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Nhập hướng dẫn, lưu ý kịch bản hoặc lưu ý kỹ thuật cho bước này..."
                />
              </div>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddComment}
                className="w-full bg-purple-600 hover:bg-purple-700 font-semibold border-none"
              >
                Gửi Ghi Chú Node
              </Button>
            </div>
          </Card>

          {/* List of Existing Node Comments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                💬 Các Ghi Chú Đã Lưu ({currentNodeComments.length})
              </span>
            </div>

            {currentNodeComments.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                Chưa có ghi chú nào cho bước này. Hãy viết ghi chú đầu tiên ở trên!
              </div>
            ) : (
              <div className="space-y-3">
                {currentNodeComments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar
                          size="small"
                          style={{ backgroundColor: getAuthorColor(c.author) }}
                          className="font-extrabold shadow-xs"
                        >
                          {c.author.charAt(0).toUpperCase()}
                        </Avatar>
                        <div>
                          <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{c.author}</div>
                          <div className="text-[10px] text-slate-400">{c.createdAt}</div>
                        </div>
                      </div>

                      <Tag
                        color={c.category === 'training' ? 'blue' : c.category === 'operations' ? 'orange' : 'purple'}
                        className="text-[10px] border-0 font-semibold"
                      >
                        {c.category === 'training' ? 'Đào Tạo' : c.category === 'operations' ? 'Vận Hành' : 'Technical'}
                      </Tag>
                    </div>

                    <Paragraph className="!mb-0 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                      {c.content}
                    </Paragraph>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
};

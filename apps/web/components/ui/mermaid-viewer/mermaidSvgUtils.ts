import type { MermaidConfig } from 'mermaid';
import { getAuthorColor } from './mermaidViewerConstants';
import type { AvailableMermaidNode, NodeComment, SelectedMermaidNode } from './mermaidViewerTypes';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function buildMermaidViewerConfig(isDark: boolean): MermaidConfig {
  return {
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
      edgeLabelBackground: isDark ? 'rgb(30, 41, 59)' : 'rgb(255, 255, 255)',
    },
  };
}

export function stripSvgInlineMaxWidth(svgHtml: string): string {
  return svgHtml.replace(/(<svg\b[^>]*style=")([^"]*)(")/i, (_, before: string, styles: string, after: string) => {
    const cleaned = styles
      .split(';')
      .filter((decl: string) => !decl.trim().toLowerCase().startsWith('max-width'))
      .join(';');
    return `${before}${cleaned}${after}`;
  });
}

export function buildMermaidViewerSvgCss(svgId: string, isDark: boolean): string {
  const edgeBg = isDark ? 'rgb(30, 41, 59)' : 'rgb(255, 255, 255)';
  const edgeStroke = isDark ? 'rgb(71, 85, 105)' : 'rgb(203, 213, 225)';
  const edgeText = isDark ? 'rgb(248, 250, 252)' : 'rgb(15, 23, 42)';

  return `
    svg#${svgId} {
      max-width: none;
    }
    svg#${svgId} g.node,
    svg#${svgId} .node-comment-badge {
      cursor: pointer;
      transition: all 0.2s ease-in-out;
    }
    svg#${svgId} g.node:hover rect,
    svg#${svgId} g.node:hover polygon,
    svg#${svgId} g.node:hover circle,
    svg#${svgId} g.node:hover path {
      stroke: rgb(56, 189, 248);
      stroke-width: 3.5px;
      filter: drop-shadow(0 0 12px rgba(56, 189, 248, 0.8));
    }
    svg#${svgId} g.node.node-active rect,
    svg#${svgId} g.node.node-active polygon,
    svg#${svgId} g.node.node-active circle,
    svg#${svgId} g.node.node-active path {
      stroke: rgb(56, 189, 248);
      stroke-width: 4px;
      filter: drop-shadow(0 0 15px rgba(56, 189, 248, 0.9));
    }
    svg#${svgId} g.node.node-has-comments rect,
    svg#${svgId} g.node.node-has-comments polygon,
    svg#${svgId} g.node.node-has-comments circle,
    svg#${svgId} g.node.node-has-comments path {
      stroke: rgb(168, 85, 247);
      stroke-width: 2.5px;
    }
    svg#${svgId} g.edgeLabel rect {
      fill: ${edgeBg};
      stroke: ${edgeStroke};
      stroke-width: 1.5px;
      rx: 6px;
      ry: 6px;
      opacity: 0.95;
    }
    svg#${svgId} g.edgeLabel text,
    svg#${svgId} g.edgeLabel tspan {
      fill: ${edgeText};
      font-family: Inter, system-ui, -apple-system, sans-serif;
      font-size: 12px;
      font-weight: 500;
      text-anchor: middle;
      dominant-baseline: central;
      transform: translateY(-4px);
    }
  `;
}

export function injectCustomSvgStyles(rawSvg: string, svgId: string, isDark: boolean): string {
  const withoutMaxWidth = stripSvgInlineMaxWidth(rawSvg);
  const customCss = buildMermaidViewerSvgCss(svgId, isDark);
  if (/<style>([\s\S]*?)<\/style>/.test(withoutMaxWidth)) {
    return withoutMaxWidth.replace(/<style>([\s\S]*?)<\/style>/, `<style>$1\n${customCss}</style>`);
  }
  return withoutMaxWidth.replace(/(<svg\b[^>]*>)/i, `$1<style>${customCss}</style>`);
}

export function extractMermaidNodeInfo(element: SVGGraphicsElement): SelectedMermaidNode {
  const rawId = element.id || '';
  const idMatch = rawId.match(/flowchart-([^-]+)-\d+/);
  const cleanNodeId = idMatch ? idMatch[1] : rawId.replace(/[^a-zA-Z0-9]/g, '') || 'Node';

  const textElements = Array.from(element.querySelectorAll('text, tspan, span, p'));
  const fullText =
    textElements
      .map((t) => t.textContent?.trim())
      .filter(Boolean)
      .join(' ') || cleanNodeId;

  return {
    id: cleanNodeId,
    rawId,
    title: fullText,
  };
}

function createNodeCommentBadge(bBox: DOMRect, comments: NodeComment[]): SVGGElement {
  const badgeX = bBox.x + bBox.width - 2;
  const badgeY = bBox.y + 2;
  const commentsCount = comments.length;
  const authorName = comments[0]?.author || 'User';
  const authorInitial = authorName.charAt(0).toUpperCase();
  const avatarColor = getAuthorColor(authorName);

  const badgeGroup = document.createElementNS(SVG_NS, 'g');
  badgeGroup.setAttribute('class', 'node-comment-badge');

  const avatarCircle = document.createElementNS(SVG_NS, 'circle');
  avatarCircle.setAttribute('cx', String(badgeX - 16));
  avatarCircle.setAttribute('cy', String(badgeY));
  avatarCircle.setAttribute('r', '11');
  avatarCircle.setAttribute('fill', avatarColor);
  avatarCircle.setAttribute('stroke', 'rgb(255, 255, 255)');
  avatarCircle.setAttribute('stroke-width', '1.5');
  avatarCircle.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))');

  const avatarText = document.createElementNS(SVG_NS, 'text');
  avatarText.setAttribute('x', String(badgeX - 16));
  avatarText.setAttribute('y', String(badgeY + 4));
  avatarText.setAttribute('fill', 'rgb(255, 255, 255)');
  avatarText.setAttribute('font-size', '10');
  avatarText.setAttribute('font-weight', '900');
  avatarText.setAttribute('font-family', 'Inter, sans-serif');
  avatarText.setAttribute('text-anchor', 'middle');
  avatarText.textContent = authorInitial;

  const countPill = document.createElementNS(SVG_NS, 'rect');
  countPill.setAttribute('x', String(badgeX - 4));
  countPill.setAttribute('y', String(badgeY - 9));
  countPill.setAttribute('width', commentsCount > 9 ? '32' : '26');
  countPill.setAttribute('height', '18');
  countPill.setAttribute('rx', '9');
  countPill.setAttribute('fill', 'rgb(15, 23, 42)');
  countPill.setAttribute('stroke', avatarColor);
  countPill.setAttribute('stroke-width', '1.5');
  countPill.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))');

  const countText = document.createElementNS(SVG_NS, 'text');
  countText.setAttribute('x', String(badgeX + (commentsCount > 9 ? 12 : 9)));
  countText.setAttribute('y', String(badgeY + 3));
  countText.setAttribute('fill', 'rgb(255, 255, 255)');
  countText.setAttribute('font-size', '10');
  countText.setAttribute('font-weight', '800');
  countText.setAttribute('font-family', 'Inter, sans-serif');
  countText.setAttribute('text-anchor', 'middle');
  countText.textContent = `💬${commentsCount}`;

  badgeGroup.appendChild(avatarCircle);
  badgeGroup.appendChild(avatarText);
  badgeGroup.appendChild(countPill);
  badgeGroup.appendChild(countText);
  return badgeGroup;
}

export function syncSvgNodeDecorations({
  wrapper,
  diagramId,
  nodeComments,
  selectedNode,
}: {
  wrapper: HTMLDivElement;
  diagramId: string;
  nodeComments: Record<string, NodeComment[]>;
  selectedNode: SelectedMermaidNode | null;
}): AvailableMermaidNode[] {
  const nodes = wrapper.querySelectorAll('.node');
  const extractedNodes: AvailableMermaidNode[] = [];

  nodes.forEach((node) => {
    const element = node as SVGGraphicsElement;
    const nodeInfo = extractMermaidNodeInfo(element);
    extractedNodes.push({ id: nodeInfo.id, title: nodeInfo.title });

    const nodeKey = `${diagramId}:${nodeInfo.id}`;
    const comments = nodeComments[nodeKey] || [];

    if (comments.length > 0) {
      element.classList.add('node-has-comments');
    } else {
      element.classList.remove('node-has-comments');
    }

    if (selectedNode && selectedNode.id === nodeInfo.id) {
      element.classList.add('node-active');
    } else {
      element.classList.remove('node-active');
    }

    const existingBadge = element.querySelector('.node-comment-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    if (comments.length > 0 && typeof element.getBBox === 'function') {
      try {
        const bBox = element.getBBox();
        element.appendChild(createNodeCommentBadge(bBox, comments));
      } catch (err) {
        console.error('Error injecting SVG badge:', err);
      }
    }
  });

  return extractedNodes;
}

export function downloadMermaidSvg(svgContent: string, title: string): void {
  if (!svgContent) return;
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_diagram.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

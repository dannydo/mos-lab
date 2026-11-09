import React from 'react';
import { Feather } from 'lucide-react';

/**
 * Biểu tượng lông vũ Vector thanh thoát chuẩn Wings
 * Thay thế hoàn toàn emoji Unicode U+1FAB6 (bị hiển thị thành ổ bánh mì / baguette trên macOS / iOS)
 */
export function FeatherSvg({
  className = 'w-3 h-3 text-amber-400',
  flip = false,
  strokeWidth = 2.4,
}: {
  className?: string;
  flip?: boolean;
  strokeWidth?: number;
}) {
  return (
    <Feather
      className={`inline-block shrink-0 select-none ${flip ? '-scale-x-100' : ''} ${className}`}
      strokeWidth={strokeWidth}
    />
  );
}

/**
 * Hiển thị nhãn 🪶CV🪶 với 2 lông vũ hai bên cân xứng tuyệt đối
 */
export function CvFeather2Badge({
  className = '',
  featherClass = 'w-3 h-3 text-amber-400',
  textClass = '',
}: {
  className?: string;
  featherClass?: string;
  textClass?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-0.5 align-middle select-none font-black ${className}`}
    >
      <FeatherSvg className={featherClass} flip />
      <span className={textClass}>CV</span>
      <FeatherSvg className={featherClass} />
    </span>
  );
}

/**
 * Hiển thị nhãn CV🪶 với 1 lông vũ vector bên phải
 */
export function CvFeather1Badge({
  className = '',
  featherClass = 'w-3 h-3 text-amber-400',
  textClass = '',
}: {
  className?: string;
  featherClass?: string;
  textClass?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-0.5 align-middle select-none font-black ${className}`}
    >
      <span className={textClass}>CV</span>
      <FeatherSvg className={featherClass} />
    </span>
  );
}

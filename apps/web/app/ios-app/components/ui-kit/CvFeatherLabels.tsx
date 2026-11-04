import React from 'react';

/**
 * Hiển thị nhãn 🪶CV🪶 với lông trái được lật đối xứng ngang (-scale-x-100)
 * để tạo sự cân xứng tuyệt đối, thẩm mỹ theo chỉ đạo Danny.
 */
export function CvFeather2Badge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      <span className="inline-block -scale-x-100 transform select-none">🪶</span>
      <span>CV</span>
      <span className="inline-block select-none">🪶</span>
    </span>
  );
}

/**
 * Hiển thị nhãn CV🪶
 */
export function CvFeather1Badge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      <span>CV</span>
      <span className="inline-block select-none">🪶</span>
    </span>
  );
}

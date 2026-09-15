'use client';

import React, { useState } from 'react';

// Zero-lag native textarea for 195 items (0ms typing latency, direct ref sync)
export const ItemNoteInput: React.FC<{
  itemId: string;
  initialValue?: string;
  placeholder?: string;
  className?: string;
  notesRef: React.MutableRefObject<Record<string, string>>;
}> = React.memo(({ itemId, initialValue = '', placeholder, className, notesRef }) => {
  const [localVal, setLocalVal] = useState(() => notesRef.current[itemId] ?? initialValue);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalVal(val);
    notesRef.current[itemId] = val;
  };

  return (
    <textarea
      value={localVal}
      onChange={handleChange}
      placeholder={placeholder || 'Ghi chú lỗi chi tiết...'}
      rows={2}
      className={`w-full p-2 text-xs rounded-md border outline-none transition-colors resize-none ${
        className || 'bg-slate-950 text-white border-rose-900/60 focus:border-rose-500'
      }`}
    />
  );
});
ItemNoteInput.displayName = 'ItemNoteInput';

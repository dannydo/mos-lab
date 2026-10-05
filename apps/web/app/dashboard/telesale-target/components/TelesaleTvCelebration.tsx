'use client';

import React, { useEffect } from 'react';

export const TelesaleTvCelebration: React.FC<{ active: boolean; onComplete?: () => void }> = ({
  active,
  onComplete,
}) => {
  useEffect(() => {
    if (active) {
      onComplete?.();
    }
  }, [active, onComplete]);

  return null;
};

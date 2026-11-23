'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { OPEN_MOS_BIBLE_EVENT, type OpenMosBibleOptions } from '../../lib/mos-bible-launcher';

const MosBibleDrawer = dynamic(() => import('./MosBibleDrawer'), { ssr: false });

export function MosBibleSurface() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [targetCommandmentId, setTargetCommandmentId] = useState<string | undefined>();

  useEffect(() => {
    const handleOpenBible = (event: Event) => {
      const customEvent = event as CustomEvent<OpenMosBibleOptions | undefined>;
      setOpen(true);
      setTargetCommandmentId(customEvent.detail?.commandmentId);
    };
    window.addEventListener(OPEN_MOS_BIBLE_EVENT, handleOpenBible);
    return () => window.removeEventListener(OPEN_MOS_BIBLE_EVENT, handleOpenBible);
  }, []);

  if (!open) return null;

  return (
    <MosBibleDrawer
      open={open}
      pathname={pathname || '/'}
      targetCommandmentId={targetCommandmentId}
      onClose={() => {
        setOpen(false);
        setTargetCommandmentId(undefined);
      }}
    />
  );
}

export default MosBibleSurface;

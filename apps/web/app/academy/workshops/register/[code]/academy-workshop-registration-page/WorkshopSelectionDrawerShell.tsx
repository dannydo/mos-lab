'use client';

import React from 'react';
import { AdaptiveDrawer } from '~/components/ui';
import styles from '../AcademyWorkshopRegistration.module.css';
import { useBottomSheetDragToDismiss } from './useBottomSheetDragToDismiss';

export interface WorkshopSelectionDrawerShellProps {
  open: boolean;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}

export function WorkshopSelectionDrawerShell({ open, onClose, footer, children }: WorkshopSelectionDrawerShellProps) {
  const selectionSheetDrag = useBottomSheetDragToDismiss(onClose, open);
  const drawerStyles = React.useMemo(
    () => ({
      body: { display: 'flex', minHeight: 0, overflow: 'hidden', padding: 0 },
      content: selectionSheetDrag.contentStyle,
    }),
    [selectionSheetDrag.contentStyle]
  );

  return (
    <AdaptiveDrawer
      open={open}
      placement="bottom"
      closable={false}
      destroyOnHidden={false}
      forceRender
      rootClassName={styles.selectionDrawer}
      height="min(860px, calc(100dvh - 16px))"
      onClose={onClose}
      styles={drawerStyles}
    >
      <div className={`flex min-h-0 flex-1 flex-col ${styles.selectionSheet}`}>
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-3 pb-5 sm:px-5">
          <div className="mx-auto max-w-2xl">
            <div
              aria-label="Kéo xuống để đóng"
              className={`sticky top-0 z-10 -mx-3 flex h-11 touch-none items-center justify-center px-3 backdrop-blur sm:-mx-5 sm:h-9 sm:px-5 ${styles.selectionSheetGrip}`}
              {...selectionSheetDrag.dragHandleProps}
            >
              <span className="h-1.5 w-11 rounded-full bg-slate-300" aria-hidden="true" />
            </div>
            <section className={`mb-5 overflow-hidden rounded-3xl border ${styles.selectionSheetCard}`}>
              {children}
            </section>
          </div>
        </div>
        <div className={`shrink-0 border-t px-3 py-3 sm:px-5 ${styles.selectionSheetFooter}`}>
          <div className="mx-auto flex max-w-2xl items-center gap-3">{footer}</div>
        </div>
      </div>
    </AdaptiveDrawer>
  );
}

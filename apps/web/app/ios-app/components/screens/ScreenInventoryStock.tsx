'use client';

import React from 'react';
import { InventoryMobileShell } from './inventory/InventoryMobileShell';

interface ScreenInventoryStockProps {
  isAdmin?: boolean;
  defaultStoreId?: number;
  onOpenSettings?: () => void;
}

export function ScreenInventoryStock({
  isAdmin = true,
  defaultStoreId = 6,
  onOpenSettings,
}: ScreenInventoryStockProps) {
  return <InventoryMobileShell isAdmin={isAdmin} defaultStoreId={defaultStoreId} onOpenSettings={onOpenSettings} />;
}

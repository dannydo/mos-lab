'use client';

import React from 'react';
import { StatusTag } from '~/components/ui';
import { getPriorityTagMeta } from './helpers';

export interface TicketPriorityTagProps {
  priority?: string;
}

export function TicketPriorityTag({ priority }: TicketPriorityTagProps) {
  const { status, label } = getPriorityTagMeta(priority);
  return <StatusTag status={status} label={label} />;
}

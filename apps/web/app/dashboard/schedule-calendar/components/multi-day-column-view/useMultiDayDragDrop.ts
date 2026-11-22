'use client';

import { useState } from 'react';
import type React from 'react';
import type dayjs from 'dayjs';
import type { Appointment } from '@mos-lab/shared';
import { getAppointmentOrderId } from './multiDayColumnUtils';

export function useMultiDayDragDrop(onReschedule?: (appointment: Appointment, newDateStr?: string) => void) {
  const [draggedAppt, setDraggedAppt] = useState<Appointment | null>(null);
  const [activeDragOverSlotKey, setActiveDragOverSlotKey] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, appt: Appointment) => {
    try {
      e.dataTransfer.setData('application/json', JSON.stringify(appt));
    } catch {
      // Ignore serialization errors on non-serializable drag payloads.
    }
    e.dataTransfer.setData('text/plain', String(getAppointmentOrderId(appt)));
    setDraggedAppt(appt);
  };

  const handleDragEnterSlot = (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    setActiveDragOverSlotKey(slotKey);
  };

  const handleDragOverSlot = (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDragOverSlotKey !== slotKey) {
      setActiveDragOverSlotKey(slotKey);
    }
  };

  const handleDragLeaveSlot = (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    const currentTarget = e.currentTarget;
    const relatedTarget = e.relatedTarget as Node | null;
    if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
      return;
    }
    setActiveDragOverSlotKey((prev) => (prev === slotKey ? null : prev));
  };

  const handleDragEndCard = () => {
    setDraggedAppt(null);
    setActiveDragOverSlotKey(null);
  };

  const handleDrop = (e: React.DragEvent, targetDate: dayjs.Dayjs, targetHour: string) => {
    e.preventDefault();
    setActiveDragOverSlotKey(null);

    let apptToUse = draggedAppt;
    if (!apptToUse) {
      try {
        const rawJson = e.dataTransfer.getData('application/json');
        if (rawJson) {
          apptToUse = JSON.parse(rawJson);
        }
      } catch {
        // Ignore malformed JSON drop payload.
      }
    }

    if (!apptToUse) return;

    const [hourNum, minNum] = targetHour.split(':');
    const newDateTime = targetDate
      .clone()
      .hour(parseInt(hourNum || '0', 10))
      .minute(minNum ? parseInt(minNum, 10) : 0)
      .format('YYYY-MM-DD HH:mm:ss');

    if (onReschedule) {
      onReschedule(apptToUse, newDateTime);
    }
    setDraggedAppt(null);
  };

  return {
    draggedAppt,
    activeDragOverSlotKey,
    handleDragStart,
    handleDragEnterSlot,
    handleDragOverSlot,
    handleDragLeaveSlot,
    handleDragEndCard,
    handleDrop,
  };
}

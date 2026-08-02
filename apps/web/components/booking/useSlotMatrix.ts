import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { apiClient } from '../../lib/api-client';

export const useSlotMatrix = (selectedCN: SafeAny, selectedCV: SafeAny, initialDate: dayjs.Dayjs = dayjs()) => {
  const getNextAvailableDate = useCallback((baseDate: dayjs.Dayjs, cv: SafeAny) => {
    let target = baseDate;
    if (!cv) {
      if (target.isBefore(dayjs().startOf('day'))) {
        return dayjs();
      }
      return target;
    }

    const cvName = (cv.displayName || '').trim().toLowerCase();
    const cvNormalized = cvName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (let i = 0; i < 14; i++) {
      const dateStr = target.format('YYYY-MM-DD');
      const dayOfWeek = target.day();
      const dbDayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);

      const isApprovedOff = cv.approvedOffDates && cv.approvedOffDates.some((d: string) => d === dateStr);

      const isWeeklyOff = cv.offDays && cv.offDays.includes(dbDayStr);

      const isPast = target.isBefore(dayjs().startOf('day'));

      if (!isApprovedOff && !isWeeklyOff && !isPast) {
        return target;
      }
      target = target.add(1, 'day');
    }
    return baseDate;
  }, []);

  const [bookingDate, setBookingDateState] = useState<dayjs.Dayjs>(() => {
    return getNextAvailableDate(initialDate, selectedCV);
  });

  const setBookingDate = useCallback(
    (newDate: dayjs.Dayjs) => {
      if (!newDate) return;
      const sanitized = getNextAvailableDate(newDate, selectedCV);
      setBookingDateState(sanitized);
    },
    [selectedCV, getNextAvailableDate]
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slotMatrix, setSlotMatrix] = useState<{ [time: string]: { available: number; roster: number } }>({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchSlots = useCallback(
    async (customDate?: dayjs.Dayjs) => {
      if (!selectedCN) return;
      const targetDate = customDate || bookingDate;
      setLoadingSlots(true);
      try {
        const data = await apiClient.customers.getBookingSlots({
          date: targetDate.format('YYYY-MM-DD'),
          storeName: selectedCN.name,
          technicianId: selectedCV?.id || undefined,
        });
        setSlotMatrix((data as SafeAny) || {});
      } catch (err) {
        console.error('[SlotMatrix] Fetch slots failed:', err);
      } finally {
        setLoadingSlots(false);
      }
    },
    [selectedCN, selectedCV, bookingDate]
  );

  const getCategorizedSlots = useCallback(() => {
    const morning: string[] = [];
    const afternoon: string[] = [];
    const night: string[] = [];

    Object.keys(slotMatrix)
      .sort()
      .forEach((time) => {
        const hour = parseInt(time.split(':')[0], 10);
        if (hour < 12) {
          morning.push(time);
        } else if (hour < 18) {
          afternoon.push(time);
        } else {
          night.push(time);
        }
      });

    return { morning, afternoon, night };
  }, [slotMatrix]);

  return {
    bookingDate,
    setBookingDate,
    selectedSlot,
    setSelectedSlot,
    slotMatrix,
    setSlotMatrix,
    loadingSlots,
    fetchSlots,
    getNextAvailableDate,
    getCategorizedSlots,
  };
};

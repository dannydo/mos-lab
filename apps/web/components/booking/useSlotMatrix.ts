import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { apiClient } from '../../lib/api-client';

export const useSlotMatrix = (
  selectedCN: SafeAny,
  selectedCV: SafeAny,
  initialDate: dayjs.Dayjs = dayjs().add(1, 'day')
) => {
  const [bookingDate, setBookingDate] = useState<dayjs.Dayjs>(initialDate);
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

  const getNextAvailableDate = useCallback((baseDate: dayjs.Dayjs, cv: SafeAny) => {
    if (!cv || !cv.offDays || cv.offDays.length === 0) return baseDate;
    let target = baseDate;
    for (let i = 0; i < 14; i++) {
      const dayOfWeek = target.day();
      const dbDayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);
      if (!cv.offDays.includes(dbDayStr)) {
        return target;
      }
      target = target.add(1, 'day');
    }
    return baseDate;
  }, []);

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

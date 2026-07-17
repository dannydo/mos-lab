import { useState, useCallback } from 'react';
import { apiClient } from '../../lib/api-client';

export const useBookingStaff = (bookingDate: SafeAny, favoriteTechs: string[]) => {
  const [staffList, setStaffList] = useState<SafeAny[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const fetchStaff = useCallback(
    async (dateStr?: string) => {
      const targetDate = dateStr || (bookingDate ? bookingDate.format('YYYY-MM-DD') : undefined);
      setLoadingStaff(true);
      try {
        const data = await apiClient.customers.getStaff({ date: targetDate });
        setStaffList(data || []);
      } catch (err) {
        console.error('Failed to fetch staff:', err);
      } finally {
        setLoadingStaff(false);
      }
    },
    [bookingDate]
  );

  const getGroupedKTVs = useCallback(() => {
    const ktvs = staffList.filter(
      (s) => s.role === 'technician' || s.role === 'specialist' || s.notes?.includes('KTV')
    );
    const groups: { [storeName: string]: SafeAny[] } = {};

    ktvs.forEach((staff) => {
      const store = staff.notes || 'Khác';
      if (!groups[store]) {
        groups[store] = [];
      }
      groups[store].push(staff);
    });

    return groups;
  }, [staffList]);

  const getFavoriteKTVs = useCallback(() => {
    const ktvs = staffList.filter(
      (s) => s.role === 'technician' || s.role === 'specialist' || s.notes?.includes('KTV')
    );
    return ktvs.filter((staff) => {
      const name = staff.displayName?.trim();
      return name && favoriteTechs.some((fav) => fav?.trim() === name);
    });
  }, [staffList, favoriteTechs]);

  return {
    staffList,
    loadingStaff,
    fetchStaff,
    getGroupedKTVs,
    getFavoriteKTVs,
    setStaffList,
    setLoadingStaff,
  };
};

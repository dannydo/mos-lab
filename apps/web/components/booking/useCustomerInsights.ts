import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';
import { STORES } from './constants';

export const useCustomerInsights = (
  selectedCustomer: SafeAny,
  selectedCN: SafeAny,
  setSelectedCN: (branch: SafeAny) => void
) => {
  const [favoriteTechs, setFavoriteTechs] = useState<string[]>([]);
  const [comboBalances, setComboBalances] = useState<SafeAny[]>([]);
  const [suggestedServices, setSuggestedServices] = useState<string[]>([]);
  const [lastUsedServices, setLastUsedServices] = useState<string[]>([]);
  const [suggestedBranch, setSuggestedBranch] = useState<SafeAny>(null);
  const [customerLastVisit, setCustomerLastVisit] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCustomer?.id) {
      apiClient.customers
        .getDetailed(selectedCustomer.id)
        .then((data) => {
          const bookings = data.bookings || [];
          const balances = data.comboBalances || [];
          setComboBalances(balances);

          // Find last completed booking date for cycle calculation (Order Completed)
          let lastCompletedDate: string | null = null;
          const completedBooking = (bookings as SafeAny[]).find(
            (b: SafeAny) => b.orderState === 'ServiceCompleted' || b.orderState === 'Completed'
          );
          if (completedBooking?.bookingDate || completedBooking?.bookingDateStart) {
            lastCompletedDate = completedBooking.bookingDate || completedBooking.bookingDateStart;
          } else if ((data as SafeAny)?.customer?.lastCompletedVisit) {
            lastCompletedDate = (data as SafeAny).customer.lastCompletedVisit;
          } else if ((data as SafeAny)?.customer?.lastVisit) {
            lastCompletedDate = (data as SafeAny).customer.lastVisit;
          }
          setCustomerLastVisit(lastCompletedDate);

          const techCounts: { [key: string]: number } = {};
          bookings.forEach((b: SafeAny) => {
            const isCompleted = b.orderState === 'ServiceCompleted' || b.orderState === 'Completed';
            if (
              isCompleted &&
              b.technicianName &&
              b.technicianName !== 'Unknown' &&
              b.technicianName !== 'Kỹ thuật viên'
            ) {
              const name = b.technicianName.trim();
              if (!name.includes('(Đã nghỉ)')) {
                techCounts[name] = (techCounts[name] || 0) + 1;
              }
            }
          });
          const sorted = Object.entries(techCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
          setFavoriteTechs(sorted.slice(0, 2).map((t) => t.name));

          // Count services in completed bookings
          const srvCounts: { [key: string]: number } = {};
          bookings.forEach((b: SafeAny) => {
            const isCompleted = b.orderState === 'ServiceCompleted' || b.orderState === 'Completed';
            if (isCompleted && b.services) {
              b.services.forEach((sName: string) => {
                srvCounts[sName] = (srvCounts[sName] || 0) + 1;
              });
            }
          });
          const sortedSrvs = Object.entries(srvCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
          setSuggestedServices(sortedSrvs.slice(0, 1).map((s) => s.name));

          // Find last completed booking services
          let lastSrvs: string[] = [];
          for (const b of bookings as SafeAny[]) {
            const isCompleted = b.orderState === 'ServiceCompleted' || b.orderState === 'Completed';
            if (isCompleted && b.services && b.services.length > 0) {
              lastSrvs = b.services;
              break;
            }
          }
          setLastUsedServices(lastSrvs);

          // Count branches in bookings
          const branchCounts: { [key: number]: number } = {};
          bookings.forEach((b: SafeAny) => {
            const isCompleted = b.orderState === 'ServiceCompleted' || b.orderState === 'Completed';
            if (isCompleted && b.storeId) {
              const sId = Number(b.storeId);
              branchCounts[sId] = (branchCounts[sId] || 0) + 1;
            }
          });
          const sortedBranches = Object.entries(branchCounts)
            .map(([id, count]) => ({ id: Number(id), count }))
            .sort((a, b) => b.count - a.count);
          if (sortedBranches.length > 0) {
            const topStoreId = sortedBranches[0].id;
            const matchedStore = STORES.find((s) => s.id === topStoreId);
            if (matchedStore) {
              setSuggestedBranch(matchedStore);
              if (!selectedCN) {
                setSelectedCN(matchedStore);
              }
            }
          }
        })
        .catch((err) => console.error('Failed to fetch favorite technicians:', err));
    } else {
      setFavoriteTechs([]);
      setComboBalances([]);
      setSuggestedServices([]);
      setLastUsedServices([]);
      setSuggestedBranch(null);
      setCustomerLastVisit(null);
    }
  }, [selectedCustomer, selectedCN, setSelectedCN]);

  return {
    favoriteTechs,
    setFavoriteTechs,
    comboBalances,
    setComboBalances,
    suggestedServices,
    lastUsedServices,
    suggestedBranch,
    customerLastVisit,
  };
};

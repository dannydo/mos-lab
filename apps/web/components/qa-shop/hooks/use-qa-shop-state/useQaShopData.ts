'use client';

import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import type { SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import type { QaStaffMember } from '../../types/qa-shop.types';
import { deduplicateQaStaffMembers } from './qaShopChecklistHelpers';

/** Manage QA Shop remote datasets, filter state, and auditor / evaluated staff lookups. */
export function useQaShopData() {
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState<SafeAny[]>([]);
  const [tickets, setTickets] = useState<SafeAny[]>([]);
  const [templates, setTemplates] = useState<SafeAny[]>([]);
  const [analytics, setAnalytics] = useState<SafeAny | null>(null);

  const [auditorName, setAuditorName] = useState<string>('');
  const [qaStaffList, setQaStaffList] = useState<QaStaffMember[]>([]);
  const [evaluatedStaffId, setEvaluatedStaffId] = useState<number | null>(null);
  const [evaluatedStaffName, setEvaluatedStaffName] = useState<string>('');
  const [allStaffList, setAllStaffList] = useState<SafeAny[]>([]);

  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  // Fetch QA Staff List (Rule 20 Deduplicated)
  const fetchQaStaffList = useCallback(async () => {
    try {
      const detail = await apiClient.teams.getByCode('QA_QC_SHOP');
      const deduplicated = deduplicateQaStaffMembers(detail.members);

      setQaStaffList(deduplicated);
      if (deduplicated.length > 0) {
        setAuditorName(deduplicated[0].displayName);
      } else {
        setAuditorName('');
      }
    } catch (err) {
      console.error('Fetch QA staff error:', err);
      setQaStaffList([]);
      setAuditorName('');
    }
  }, []);

  useEffect(() => {
    fetchQaStaffList();
  }, [fetchQaStaffList]);

  // Fetch all staff for technician evaluation
  const fetchAllStaff = useCallback(async () => {
    try {
      const list = await apiClient.staff.list();
      setAllStaffList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Fetch all staff error:', err);
      setAllStaffList([]);
    }
  }, []);

  useEffect(() => {
    fetchAllStaff();
  }, [fetchAllStaff]);

  const handleSelectEvaluatedStaff = useCallback(
    (staffId: number | null) => {
      setEvaluatedStaffId(staffId);
      if (!staffId) {
        setEvaluatedStaffName('');
        return;
      }
      const found = allStaffList.find((s) => s.id === staffId);
      setEvaluatedStaffName(found ? found.displayName || found.username : `Nhân viên #${staffId}`);
    },
    [allStaffList]
  );

  // Fetch QA Shop Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [auditsRes, ticketsRes, templatesRes, analyticsRes] = await Promise.allSettled([
        apiClient.qaShop.getAudits({
          branchCode: branchFilter !== 'all' ? branchFilter : undefined,
          dateFrom: dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : undefined,
          dateTo: dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : undefined,
        }),
        apiClient.qaShop.getTickets({
          branchCode: branchFilter !== 'all' ? branchFilter : undefined,
          status: ticketStatusFilter !== 'all' ? ticketStatusFilter : undefined,
        }),
        apiClient.qaShop.getTemplates(),
        apiClient.qaShop.getAnalytics(),
      ]);

      if (auditsRes.status === 'fulfilled') setAudits(Array.isArray(auditsRes.value) ? auditsRes.value : []);
      if (ticketsRes.status === 'fulfilled') setTickets(Array.isArray(ticketsRes.value) ? ticketsRes.value : []);
      if (templatesRes.status === 'fulfilled')
        setTemplates(Array.isArray(templatesRes.value) ? templatesRes.value : []);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
    } catch (err) {
      console.error('Fetch QA Shop data error:', err);
      message.error('Không thể tải dữ liệu QA Shop Inspection');
    } finally {
      setLoading(false);
    }
  }, [branchFilter, ticketStatusFilter, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    loading,
    audits,
    tickets,
    templates,
    setTemplates,
    analytics,
    auditorName,
    setAuditorName,
    qaStaffList,
    evaluatedStaffId,
    setEvaluatedStaffId,
    evaluatedStaffName,
    setEvaluatedStaffName,
    handleSelectEvaluatedStaff,
    allStaffList,
    branchFilter,
    setBranchFilter,
    ticketStatusFilter,
    setTicketStatusFilter,
    dateRange,
    setDateRange,
    fetchData,
  };
}

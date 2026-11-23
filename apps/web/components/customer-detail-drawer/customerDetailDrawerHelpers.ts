import type { CustomerDetailCurrentUser } from './types';

export const CUSTOMER_DETAIL_ACTIVE_TAB_STORAGE_KEY = 'customer_detail_active_tab';

export function getStoredCurrentUser(): CustomerDetailCurrentUser | null {
  if (typeof window === 'undefined') return null;

  const userStr = localStorage.getItem('mos_user') || localStorage.getItem('user') || localStorage.getItem('crm_user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as CustomerDetailCurrentUser;
  } catch {
    return null;
  }
}

export function getActiveCustomerPhone(customer: SafeAny): string {
  if (!customer) return '';

  if (customer.phones && customer.phones.length > 0) {
    const enabled = customer.phones.find((p: SafeAny) => !p.is_disabled);
    if (enabled && enabled.phone_number) return enabled.phone_number;
    if (customer.phones[0] && customer.phones[0].phone_number) return customer.phones[0].phone_number;
  }

  return customer.phone || '';
}

export function getLegacyDomain(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
      return 'http://localhost';
    }
  }
  return 'https://wingslashes.com';
}

export function buildLegacyProfileUrl(customer: SafeAny, activePhone: string): string {
  const domain = getLegacyDomain();
  const phoneToUse = activePhone || customer?.phone || '';
  return phoneToUse
    ? `${domain}/admin/customer-support/user/customer?phone=${encodeURIComponent(phoneToUse)}`
    : `${domain}/admin/customer-support/user/customer?id=${customer?.id || ''}`;
}

export function getStoredCustomerDetailTab(): string {
  if (typeof window === 'undefined') return 'bookings';
  return localStorage.getItem(CUSTOMER_DETAIL_ACTIVE_TAB_STORAGE_KEY) || 'bookings';
}

export function persistCustomerDetailTab(tabKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOMER_DETAIL_ACTIVE_TAB_STORAGE_KEY, tabKey);
}

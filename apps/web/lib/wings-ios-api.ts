/**
 * WingsApi - Bit-by-bit 1:1 Implementation of iOS Swift Api.swift
 * Directly interacts with https://api.wingslashes.com/1/
 * Matches exact payload, session tokens, and response structures.
 */

export interface WingsUserSession {
  user_id: string;
  login_token: string;
  session_id?: string;
  client_business_id: string;
  client_store_id: string;
  full_name?: string;
  user_group_name?: string;
  avatar?: string;
  user_group_id?: string;
}

export interface WingsApiResponse<T = any> {
  status: 'success' | 'error';
  data: T;
  message?: string;
  code?: string;
}

export const DEFAULT_CC_SESSION: WingsUserSession = {
  user_id: '46092',
  login_token: 'S25YQl5SJHl4dll6OElIeXNnakJQcGU3KXV5QmxkQH1HZF5JLW1WfWE5I2tpbTFqXzJGLUNeMmVeRXVHWCkoaQ==',
  client_business_id: '1',
  client_store_id: '6', // 159A Đề Thám
  full_name: 'Quang Khải CC',
  user_group_name: 'Client Consultant',
  user_group_id: '14',
};

class WingsApiService {
  private apiUrl = 'https://api.wingslashes.com';
  private apiVersion = '1';
  private appVersion = '198';

  private getSession(): WingsUserSession {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('wings_user_session');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        // Fallback to default
      }
    }
    return DEFAULT_CC_SESSION;
  }

  public setSession(session: WingsUserSession) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wings_user_session', JSON.stringify(session));
    }
  }

  public clearSession() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wings_user_session');
    }
  }

  /**
   * Replicates setDefautPostData from Api.swift
   */
  private setDefaultPostData(dataPost: Record<string, any>): Record<string, any> {
    const session = this.getSession();

    const payload: Record<string, any> = {
      ...dataPost,
      client_business_id: dataPost.client_business_id || session.client_business_id || '1',
      client_store_id: dataPost.client_store_id || session.client_store_id || '6',
      language_code: 'vi-VN',
      app_version: this.appVersion,
      device_platform: 'Apple',
      device_os: '18.3',
    };

    if (session.user_id) {
      payload.user_id = session.user_id;
      payload.login_token = session.login_token;
      if (session.session_id) {
        payload.session_id = session.session_id;
      }
    }

    return payload;
  }

  /**
   * Bit-by-bit equivalent of Api.sharedInstance.post(requestUrl: ...)
   */
  public async post<T = any>(requestUrl: string, dataPost: Record<string, any> = {}): Promise<WingsApiResponse<T>> {
    const fullUrl = `${this.apiUrl}/${this.apiVersion}/${requestUrl}`;
    const payload = this.setDefaultPostData(dataPost);

    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          status: 'error',
          data: null as any,
          message: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const json: WingsApiResponse<T> = await response.json();
      return json;
    } catch (err: any) {
      return {
        status: 'error',
        data: null as any,
        message: err?.message || 'Network error',
      };
    }
  }

  /**
   * Equivalent of Api.sharedInstance.get(requestUrl: ...)
   */
  public async get<T = any>(requestUrl: string): Promise<WingsApiResponse<T>> {
    const fullUrl = `${this.apiUrl}/${this.apiVersion}/${requestUrl}`;
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      return await response.json();
    } catch (err: any) {
      return {
        status: 'error',
        data: null as any,
        message: err?.message || 'Network error',
      };
    }
  }

  // Common high-level endpoints used in WingsBeauty iOS app:

  /**
   * Booking incoming / servicing / done
   * Mirrors WingsBeauty/Booking/BookingVC.swift -> order/booking/get
   */
  public async getBookings(params: {
    date_from?: string;
    date_to?: string;
    order_state?: string[];
    service_state?: string;
    client_store_id?: string;
  }) {
    const today = new Date().toISOString().split('T')[0];
    const dataPost = {
      client_store_id: params.client_store_id || '6',
      date_from: params.date_from || today,
      date_to: params.date_to || today,
      order_state: params.order_state || ['New', 'Confirmed'],
      service_state: params.service_state || 'incoming',
    };
    return this.post('order/booking/get', dataPost);
  }

  /**
   * Check in an order
   * Mirrors WingsBeauty/Booking/BookingCheckInVC.swift
   */
  public async checkInOrder(orderId: string | number) {
    return this.post('order/service/check-in', { order_id: String(orderId) });
  }

  /**
   * Start servicing
   */
  public async startService(orderId: string | number, orderServiceId?: string | number) {
    return this.post('order/service/start', {
      order_id: String(orderId),
      order_service_id: orderServiceId ? String(orderServiceId) : undefined,
    });
  }

  /**
   * Complete servicing
   */
  public async completeService(orderId: string | number, orderServiceId?: string | number) {
    return this.post('order/service/complete', {
      order_id: String(orderId),
      order_service_id: orderServiceId ? String(orderServiceId) : undefined,
    });
  }

  /**
   * Cancel booking
   */
  public async cancelBooking(orderId: string | number, cancelReason: string) {
    return this.post('order/booking/cancel', {
      order_id: String(orderId),
      cancel_reason: cancelReason,
    });
  }

  /**
   * Staff list & working shift
   */
  public async getStaffWorkingShift(date?: string, storeId: string = '6') {
    const today = date || new Date().toISOString().split('T')[0];
    return this.post('staff/working-shift/get', {
      date: today,
      client_store_id: storeId,
    });
  }
}

export const wingsApi = new WingsApiService();

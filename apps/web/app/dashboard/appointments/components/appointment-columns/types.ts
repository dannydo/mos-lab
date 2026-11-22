import type { Appointment } from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';

export interface ColumnsOptions {
  themeMode: 'light' | 'dark';
  token: SafeAny;
  formatVND: (value: number) => string;
  openDetailModal: (customerId: number) => void;
  makeCall: (phone: string, name: string, id: number, avatar?: string) => void;
  setSelectedBookingForReschedule?: (booking: SafeAny) => void;
  setRescheduleModalVisible?: (visible: boolean) => void;
  handleCancelBooking?: (id: number) => void;
  setBookingInitialCustomer?: (customer: SafeAny) => void;
  setBookingWizardVisible?: (visible: boolean) => void;
  onOpenMissedReasonModal?: (record: Appointment) => void;
}

export type CompletedColumnsOptions = Omit<
  ColumnsOptions,
  'setSelectedBookingForReschedule' | 'setRescheduleModalVisible' | 'handleCancelBooking'
>;

export interface StatusLabelConfig {
  label: string;
  status: StatusType;
}

'use client';

import React from 'react';
import { SafeAny } from '@mos-lab/shared';
import RescheduleBookingModal from './RescheduleBookingModal';

interface UpdateBookingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  booking: SafeAny;
}

export const UpdateBookingModal: React.FC<UpdateBookingModalProps> = ({ visible, onClose, onSuccess, booking }) => {
  return <RescheduleBookingModal open={visible} onClose={onClose} onSuccess={onSuccess} booking={booking} />;
};


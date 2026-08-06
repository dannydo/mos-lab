-- Update historical booking audit log entries from CHANGE_KTV to CHANGE_CV
UPDATE crm_booking_logs SET action_type = 'CHANGE_CV' WHERE action_type = 'CHANGE_KTV';

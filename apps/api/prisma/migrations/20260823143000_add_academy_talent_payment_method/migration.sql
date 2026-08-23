-- Follow-up payments are reconciled differently for a bank transfer and cash.
-- Existing payment records predate method capture and are retained as transfers.
ALTER TABLE `crm_academy_talent_payments`
  ADD COLUMN `payment_method` VARCHAR(24) NOT NULL DEFAULT 'BANK_TRANSFER' AFTER `amount_vnd`;

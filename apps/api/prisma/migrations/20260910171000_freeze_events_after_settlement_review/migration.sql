-- Once a settlement review exists, its source event set is frozen. This is a
-- database backstop for every writer, not only the application service.
CREATE TRIGGER crm_payroll_ledger_events_no_insert_after_review
BEFORE INSERT ON crm_payroll_ledger_events
FOR EACH ROW
SET NEW.event_key = IF(
  EXISTS (
    SELECT 1
    FROM crm_payroll_settlements
    WHERE payroll_period_id = NEW.payroll_period_id
      AND status IN ('REVIEWING', 'LOCKED')
  ),
  NULL,
  NEW.event_key
);

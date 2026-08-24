-- Stores the explicit legacy service scope for an NYC fixed-final-price
-- promotion. This is CRM configuration data; legacy order values remain the
-- source of truth for the booked price and discount amount.
ALTER TABLE `crm_campaign_promotions`
  ADD COLUMN `eligible_service_ids` TEXT NULL AFTER `value`;

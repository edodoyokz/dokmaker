-- Additive migration: enforce intake-level dedup of Pakasir webhook events by
-- (provider, provider_event_id). provider_event_id is nullable, and Postgres
-- UNIQUE allows multiple NULLs, so pre-existing/legacy rows without an event id
-- remain valid. Non-null pairs are now unique, enabling the dedup check in
-- handlePakasirWebhook to short-circuit duplicate deliveries before any credit.
CREATE UNIQUE INDEX "payment_webhook_events_provider_provider_event_id_key"
  ON "payment_webhook_events" ("provider", "provider_event_id");

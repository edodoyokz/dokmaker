-- UniqueName: payment_webhook_events_provider_provider_event_id_key

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_events_provider_provider_event_id_key"
ON "payment_webhook_events"("provider", "provider_event_id");

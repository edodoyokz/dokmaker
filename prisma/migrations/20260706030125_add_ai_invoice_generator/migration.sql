-- CreateEnum
CREATE TYPE "AiGenerationSessionStatus" AS ENUM ('uploaded', 'analyzed', 'ready_to_generate', 'generating', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "AiGenerationOutputStatus" AS ENUM ('pending', 'generating', 'success', 'failed', 'refunded');

-- AlterEnum
ALTER TYPE "WalletLedgerEntryType" ADD VALUE 'ai_generation_debit';

-- DropIndex
DROP INDEX "payment_webhook_events_provider_provider_event_id_idx";

-- CreateTable
CREATE TABLE "ai_generation_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "AiGenerationSessionStatus" NOT NULL DEFAULT 'uploaded',
    "reference_image_storage_key" TEXT NOT NULL,
    "reference_image_mime_type" TEXT NOT NULL,
    "reference_image_size_bytes" INTEGER NOT NULL,
    "analysis_json" JSONB,
    "analysis_summary" TEXT,
    "latest_user_instruction" TEXT,
    "disclaimer_accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_generation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generation_outputs" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "AiGenerationOutputStatus" NOT NULL DEFAULT 'pending',
    "instruction_snapshot" TEXT NOT NULL,
    "analysis_snapshot" JSONB,
    "prompt_snapshot" TEXT NOT NULL,
    "output_image_storage_key" TEXT,
    "output_image_mime_type" TEXT,
    "charged_amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "wallet_ledger_entry_id" TEXT,
    "refund_ledger_entry_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'pollinations',
    "provider_request_id" TEXT,
    "provider_metadata" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_generation_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_generation_sessions_user_id_idx" ON "ai_generation_sessions"("user_id");

-- CreateIndex
CREATE INDEX "ai_generation_sessions_status_idx" ON "ai_generation_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_generation_outputs_idempotency_key_key" ON "ai_generation_outputs"("idempotency_key");

-- CreateIndex
CREATE INDEX "ai_generation_outputs_session_id_idx" ON "ai_generation_outputs"("session_id");

-- CreateIndex
CREATE INDEX "ai_generation_outputs_user_id_idx" ON "ai_generation_outputs"("user_id");

-- CreateIndex
CREATE INDEX "ai_generation_outputs_status_idx" ON "ai_generation_outputs"("status");

-- AddForeignKey
ALTER TABLE "ai_generation_sessions" ADD CONSTRAINT "ai_generation_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generation_outputs" ADD CONSTRAINT "ai_generation_outputs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_generation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generation_outputs" ADD CONSTRAINT "ai_generation_outputs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

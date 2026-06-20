-- AlterTable
ALTER TABLE "invoice_templates" ADD COLUMN "document_type" TEXT NOT NULL DEFAULT 'invoice';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "document_type" TEXT NOT NULL DEFAULT 'invoice',
ADD COLUMN "title" TEXT;

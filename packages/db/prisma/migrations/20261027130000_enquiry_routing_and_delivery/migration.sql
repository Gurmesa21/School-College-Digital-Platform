-- CreateEnum
CREATE TYPE "SubmissionDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'SIMULATED', 'SKIPPED');

-- AlterTable "forms"
ALTER TABLE "forms" ADD COLUMN "routingRules" JSONB;

-- AlterTable "form_submissions"
ALTER TABLE "form_submissions" ADD COLUMN "category" TEXT,
ADD COLUMN "routedTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "deliveryStatus" "SubmissionDeliveryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastDeliveryAttemptAt" TIMESTAMP(3),
ADD COLUMN "deliveryError" TEXT,
ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE INDEX "form_submissions_tenantId_category_idx" ON "form_submissions"("tenantId", "category");
CREATE INDEX "form_submissions_tenantId_deliveryStatus_idx" ON "form_submissions"("tenantId", "deliveryStatus");
CREATE INDEX "form_submissions_tenantId_formId_idempotencyKey_idx" ON "form_submissions"("tenantId", "formId", "idempotencyKey");

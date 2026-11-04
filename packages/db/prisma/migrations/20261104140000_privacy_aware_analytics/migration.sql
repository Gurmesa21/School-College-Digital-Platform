-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'CONTENT_VIEW', 'SEARCH', 'ENQUIRY_START', 'ENQUIRY_SUBMIT', 'DOCUMENT_DOWNLOAD');

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" "AnalyticsEventType" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "path" TEXT NOT NULL,
    "referrerDomain" TEXT,
    "deviceCategory" TEXT DEFAULT 'desktop',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_tenantId_createdAt_idx" ON "analytics_events"("tenantId", "createdAt");
CREATE INDEX "analytics_events_tenantId_eventType_createdAt_idx" ON "analytics_events"("tenantId", "eventType", "createdAt");
CREATE INDEX "analytics_events_tenantId_entityType_entityId_idx" ON "analytics_events"("tenantId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN "storagePolicy" TEXT NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'local';

-- CreateIndex
CREATE INDEX "media_assets_tenantId_storagePolicy_idx" ON "media_assets"("tenantId", "storagePolicy");

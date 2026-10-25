-- AlterEnum
ALTER TYPE "SectionType" ADD VALUE 'ACCORDION';
ALTER TYPE "SectionType" ADD VALUE 'CTA_BANNER';
ALTER TYPE "SectionType" ADD VALUE 'STATS_COUNTER';
ALTER TYPE "SectionType" ADD VALUE 'TESTIMONIALS';

-- AlterTable
ALTER TABLE "page_sections" ADD COLUMN "reusableSectionId" TEXT;

-- CreateTable
CREATE TABLE "reusable_sections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sectionType" "SectionType" NOT NULL,
    "category" TEXT,
    "config" JSONB NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "lastEditorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reusable_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reusable_sections_tenantId_slug_key" ON "reusable_sections"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "reusable_sections_tenantId_idx" ON "reusable_sections"("tenantId");

-- CreateIndex
CREATE INDEX "reusable_sections_sectionType_idx" ON "reusable_sections"("sectionType");

-- CreateIndex
CREATE INDEX "page_sections_reusableSectionId_idx" ON "page_sections"("reusableSectionId");

-- AddForeignKey
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_reusableSectionId_fkey" FOREIGN KEY ("reusableSectionId") REFERENCES "reusable_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reusable_sections" ADD CONSTRAINT "reusable_sections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reusable_sections" ADD CONSTRAINT "reusable_sections_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reusable_sections" ADD CONSTRAINT "reusable_sections_lastEditorId_fkey" FOREIGN KEY ("lastEditorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

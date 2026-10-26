-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "biography" TEXT,
    "departmentId" TEXT,
    "profileMediaId" TEXT,
    "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qualifications" TEXT,
    "officeLocation" TEXT,
    "consultationHours" TEXT,
    "publicEmail" TEXT,
    "publicPhone" TEXT,
    "displayEmail" BOOLEAN NOT NULL DEFAULT false,
    "displayPhone" BOOLEAN NOT NULL DEFAULT false,
    "websiteUrl" TEXT,
    "internalNotes" TEXT,
    "userId" TEXT,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalUrl" TEXT,
    "authorId" TEXT,
    "lastEditorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_tenantId_slug_key" ON "staff_profiles"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "staff_profiles_tenantId_status_isActive_idx" ON "staff_profiles"("tenantId", "status", "isActive");

-- CreateIndex
CREATE INDEX "staff_profiles_tenantId_departmentId_idx" ON "staff_profiles"("tenantId", "departmentId");

-- CreateIndex
CREATE INDEX "staff_profiles_tenantId_orderIndex_idx" ON "staff_profiles"("tenantId", "orderIndex");

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "academic_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_profileMediaId_fkey" FOREIGN KEY ("profileMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_lastEditorId_fkey" FOREIGN KEY ("lastEditorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('GENERAL', 'STUDENTS', 'PARENTS', 'STAFF');

-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "authorName" TEXT,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "featuredMediaId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalUrl" TEXT,
    "authorId" TEXT,
    "lastEditorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'GENERAL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT,
    "lastEditorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "location" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "coverMediaId" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "capacity" INTEGER,
    "isRegistrationOpen" BOOLEAN NOT NULL DEFAULT false,
    "registrationUrl" TEXT,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT,
    "lastEditorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "news_articles_tenantId_status_idx" ON "news_articles"("tenantId", "status");

-- CreateIndex
CREATE INDEX "news_articles_tenantId_publishedAt_idx" ON "news_articles"("tenantId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_tenantId_slug_key" ON "news_articles"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "announcements_tenantId_status_idx" ON "announcements"("tenantId", "status");

-- CreateIndex
CREATE INDEX "announcements_tenantId_priority_idx" ON "announcements"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "announcements_tenantId_startsAt_expiresAt_idx" ON "announcements"("tenantId", "startsAt", "expiresAt");

-- CreateIndex
CREATE INDEX "events_tenantId_status_idx" ON "events"("tenantId", "status");

-- CreateIndex
CREATE INDEX "events_tenantId_startsAt_idx" ON "events"("tenantId", "startsAt");

-- CreateIndex
CREATE INDEX "events_tenantId_endsAt_idx" ON "events"("tenantId", "endsAt");

-- CreateIndex
CREATE INDEX "events_tenantId_category_idx" ON "events"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "events_tenantId_slug_key" ON "events"("tenantId", "slug");

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_featuredMediaId_fkey" FOREIGN KEY ("featuredMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_lastEditorId_fkey" FOREIGN KEY ("lastEditorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_lastEditorId_fkey" FOREIGN KEY ("lastEditorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_lastEditorId_fkey" FOREIGN KEY ("lastEditorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

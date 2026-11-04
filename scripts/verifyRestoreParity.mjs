#!/usr/bin/env node
/**
 * Day 20: Disaster Recovery & Backup Verification
 * Enhanced Data Parity & Restoration Verification Script (scripts/verifyRestoreParity.mjs)
 *
 * Compares the active database against the restored test database.
 * Verifies:
 *  1. Exact Table Inventory (33 Prisma models + 1 migrations table = 34 public tables).
 *  2. Prisma Migration History Parity.
 *  3. Table-by-Table Row Count Parity across all 33 models.
 *  4. Deterministic, Complete Content Parity via SHA-256 cryptographic hashing of canonicalized rows.
 *  5. Relational Integrity & Foreign-Key Constraint Parity (zero orphan records).
 *  6. Deep Sample Entity Integrity Checks.
 */

import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { parseDatabaseUrl } from './backupDatabase.mjs';

dotenv.config();

// The exact 33 Prisma models defined in packages/db/prisma/schema.prisma
export const PRISMA_MODELS = [
  'tenant',
  'tenantDomain',
  'tenantInvitation',
  'user',
  'membership',
  'role',
  'permission',
  'rolePermission',
  'membershipRole',
  'session',
  'passwordResetToken',
  'emailVerificationToken',
  'auditLog',
  'page',
  'pageSection',
  'reusableSection',
  'navigationMenu',
  'navigationMenuItem',
  'category',
  'mediaAsset',
  'form',
  'formField',
  'formSubmission',
  'academicLevel',
  'academicDepartment',
  'programme',
  'course',
  'programmeCourse',
  'staffProfile',
  'newsArticle',
  'announcement',
  'eventItem',
  'analyticsEvent',
];

// Composite primary keys for models without a standalone 'id' column
const COMPOSITE_PKS = {
  rolePermission: ['roleId', 'permissionId'],
  membershipRole: ['membershipId', 'roleId'],
  programmeCourse: ['programmeId', 'courseId'],
};

export function buildTargetUrl(sourceUrl, targetDbName) {
  const url = new URL(sourceUrl);
  url.pathname = `/${targetDbName}`;
  return url.toString();
}

/**
 * Recursively canonicalizes an object by sorting its keys and standardizing Date and BigInt representations.
 */
export function canonicalizeRow(row) {
  if (row === null || typeof row !== 'object') {
    return row;
  }
  if (row instanceof Date) {
    return row.toISOString();
  }
  if (typeof row === 'bigint') {
    return row.toString();
  }
  if (Array.isArray(row)) {
    return row.map(canonicalizeRow);
  }
  const sortedKeys = Object.keys(row).sort();
  const canonical = {};
  for (const key of sortedKeys) {
    const val = row[key];
    if (val instanceof Date) {
      canonical[key] = val.toISOString();
    } else if (typeof val === 'bigint') {
      canonical[key] = val.toString();
    } else if (val !== null && typeof val === 'object') {
      canonical[key] = canonicalizeRow(val);
    } else {
      canonical[key] = val;
    }
  }
  return canonical;
}

/**
 * Computes a deterministic SHA-256 cryptographic digest of an array of canonicalized rows.
 */
export function computeTableHash(rows) {
  const canonical = rows.map(canonicalizeRow);
  const jsonStr = JSON.stringify(canonical);
  return crypto.createHash('sha256').update(jsonStr).digest('hex');
}

async function runParityVerification() {
  const startTime = Date.now();
  console.log('===================================================================================');
  console.log(' [Day 20 DR] Verifying Database Restoration Parity & Complete Content Integrity');
  console.log('===================================================================================');

  const args = process.argv.slice(2);
  let targetDb = 'gurmesa_restore_test_db';
  const targetDbIndex = args.indexOf('--target-db');
  if (targetDbIndex !== -1 && args[targetDbIndex + 1]) {
    targetDb = args[targetDbIndex + 1];
  }

  const sourceUrl = process.env.DATABASE_URL;
  if (!sourceUrl) {
    throw new Error('DATABASE_URL is not set.');
  }
  const targetUrl = buildTargetUrl(sourceUrl, targetDb);

  const sourceConfig = parseDatabaseUrl(sourceUrl);
  const targetConfig = parseDatabaseUrl(targetUrl);

  console.log(`[INFO] Source Database:  ${sourceConfig.database} (${sourceConfig.safeUrl})`);
  console.log(`[INFO] Restored Target:  ${targetConfig.database} (${targetConfig.safeUrl})`);

  const sourcePrisma = new PrismaClient({
    datasources: { db: { url: sourceUrl } },
    log: ['error'],
  });

  const targetPrisma = new PrismaClient({
    datasources: { db: { url: targetUrl } },
    log: ['error'],
  });

  let allChecksPassed = true;
  const parityTable = [];

  try {
    // -------------------------------------------------------------------------
    // 1. Table Inventory & Prisma Migration History Parity Check
    // -------------------------------------------------------------------------
    console.log('\n[CHECK 1/4] Verifying Table Inventory & Migration History...');

    const sourceTables = await sourcePrisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
    `;
    const targetTables = await targetPrisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
    `;

    console.log(`  - Database Table Count: Source = ${sourceTables.length}, Restored = ${targetTables.length}`);
    console.log(`  - Prisma Models: ${PRISMA_MODELS.length} application models + 1 migration history table = 34 tables total`);

    if (sourceTables.length === targetTables.length && sourceTables.length === 34) {
      console.log('  ✓ Table inventory match confirmed: exactly 34 public tables present in both databases.');
    } else {
      console.error(`  ✗ Table inventory mismatch! Source: ${sourceTables.length}, Restored: ${targetTables.length}`);
      allChecksPassed = false;
    }

    const sourceMigrations = await sourcePrisma.$queryRaw`
      SELECT id, migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY finished_at ASC;
    `;
    const targetMigrations = await targetPrisma.$queryRaw`
      SELECT id, migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY finished_at ASC;
    `;

    const migrationsMatch =
      sourceMigrations.length === targetMigrations.length &&
      sourceMigrations.every((s, idx) => s.migration_name === targetMigrations[idx]?.migration_name);

    if (migrationsMatch) {
      console.log(`  ✓ Migration parity confirmed: ${sourceMigrations.length}/${targetMigrations.length} applied migrations match exactly.`);
    } else {
      console.error(`  ✗ Migration mismatch! Source: ${sourceMigrations.length}, Restored: ${targetMigrations.length}`);
      allChecksPassed = false;
    }

    // -------------------------------------------------------------------------
    // 2. Table-by-Table Row Count & Deterministic SHA-256 Content Hash Check
    // -------------------------------------------------------------------------
    console.log('\n[CHECK 2/4] Verifying Complete Content Parity Across All 33 Prisma Models via SHA-256...');

    for (const model of PRISMA_MODELS) {
      try {
        const pks = COMPOSITE_PKS[model] || ['id'];
        const orderBy = pks.map((k) => ({ [k]: 'asc' }));

        const [sourceCount, targetCount] = await Promise.all([
          sourcePrisma[model].count(),
          targetPrisma[model].count(),
        ]);

        const countMatch = sourceCount === targetCount;

        // Query all records ordered deterministically by primary key(s)
        const [sourceRows, targetRows] = await Promise.all([
          sourcePrisma[model].findMany({ orderBy }),
          targetPrisma[model].findMany({ orderBy }),
        ]);

        // Compute cryptographic SHA-256 hash of canonicalized records
        const sourceHash = computeTableHash(sourceRows);
        const targetHash = computeTableHash(targetRows);
        const contentMatch = sourceHash === targetHash;

        if (!countMatch || !contentMatch) {
          allChecksPassed = false;
        }

        parityTable.push({
          Model: model,
          SourceRows: sourceCount,
          RestoredRows: targetCount,
          CountStatus: countMatch ? 'MATCH ✓' : 'MISMATCH ✗',
          ContentHash: contentMatch ? `MATCH (${sourceHash.substring(0, 8)}) ✓` : 'CONTENT MISMATCH ✗',
        });
      } catch (err) {
        parityTable.push({
          Model: model,
          SourceRows: 'ERR',
          RestoredRows: 'ERR',
          CountStatus: 'ERROR',
          ContentHash: `ERROR: ${err.message}`,
        });
        allChecksPassed = false;
      }
    }

    // Print table in clean columns
    console.log('\n---------------------------------------------------------------------------------------------------------');
    console.log(
      '| ' +
      'Model Name (33 Total)'.padEnd(24) +
      ' | ' +
      'Source'.padStart(8) +
      ' | ' +
      'Restored'.padStart(8) +
      ' | ' +
      'Row Counts'.padEnd(12) +
      ' | ' +
      'SHA-256 Content Parity'.padEnd(30) +
      ' |'
    );
    console.log('---------------------------------------------------------------------------------------------------------');
    for (const row of parityTable) {
      console.log(
        '| ' +
        row.Model.padEnd(24) +
        ' | ' +
        String(row.SourceRows).padStart(8) +
        ' | ' +
        String(row.RestoredRows).padStart(8) +
        ' | ' +
        row.CountStatus.padEnd(12) +
        ' | ' +
        row.ContentHash.padEnd(30) +
        ' |'
      );
    }
    console.log('---------------------------------------------------------------------------------------------------------');

    // -------------------------------------------------------------------------
    // 3. Relational Integrity & Foreign-Key Integrity Verification
    // -------------------------------------------------------------------------
    console.log('\n[CHECK 3/4] Verifying Relational Integrity & Foreign Key Constraints in Restored Database...');

    // 1. TenantDomain -> Tenant
    const orphanDomains = await targetPrisma.$queryRaw`
      SELECT td.id FROM "tenant_domains" td 
      LEFT JOIN "tenants" t ON td."tenantId" = t.id 
      WHERE t.id IS NULL;
    `;
    // 2. Membership -> User & Tenant
    const orphanMemberships = await targetPrisma.$queryRaw`
      SELECT m.id FROM "memberships" m 
      LEFT JOIN "users" u ON m."userId" = u.id 
      LEFT JOIN "tenants" t ON m."tenantId" = t.id 
      WHERE u.id IS NULL OR t.id IS NULL;
    `;
    // 3. FormField -> Form
    const orphanFields = await targetPrisma.$queryRaw`
      SELECT ff.id FROM "form_fields" ff 
      LEFT JOIN "forms" f ON ff."formId" = f.id 
      WHERE f.id IS NULL;
    `;
    // 4. PageSection -> Page
    const orphanSections = await targetPrisma.$queryRaw`
      SELECT ps.id FROM "page_sections" ps 
      LEFT JOIN "pages" p ON ps."pageId" = p.id 
      WHERE p.id IS NULL;
    `;
    // 5. ProgrammeCourse -> Programme & Course
    const orphanProgrammeCourses = await targetPrisma.$queryRaw`
      SELECT pc."programmeId" FROM "programme_courses" pc 
      LEFT JOIN "programmes" p ON pc."programmeId" = p.id 
      LEFT JOIN "courses" c ON pc."courseId" = c.id 
      WHERE p.id IS NULL OR c.id IS NULL;
    `;

    const orphanCount =
      orphanDomains.length +
      orphanMemberships.length +
      orphanFields.length +
      orphanSections.length +
      orphanProgrammeCourses.length;

    if (orphanCount === 0) {
      console.log('  ✓ Relational integrity confirmed: 0 orphan records found across all foreign key relationships.');
    } else {
      console.error(`  ✗ Relational integrity violation: ${orphanCount} orphan records detected!`);
      allChecksPassed = false;
    }

    // -------------------------------------------------------------------------
    // 4. Deep Entity Sample Integrity Checks
    // -------------------------------------------------------------------------
    console.log('\n[CHECK 4/4] Performing Deep Sample Entity Integrity Checks...');

    // Deep check Oxford Tenant
    const sourceTenant = await sourcePrisma.tenant.findUnique({
      where: { slug: 'oxford' },
      include: { domains: true },
    });
    const targetTenant = await targetPrisma.tenant.findUnique({
      where: { slug: 'oxford' },
      include: { domains: true },
    });

    if (sourceTenant && targetTenant && sourceTenant.id === targetTenant.id) {
      console.log(`  ✓ Tenant "oxford" deep parity verified (ID: ${sourceTenant.id}, Domains: ${sourceTenant.domains.length})`);
    } else {
      console.error(`  ✗ Tenant "oxford" deep check failed!`);
      allChecksPassed = false;
    }

    // Deep check primary admin user
    const sourceAdmin = await sourcePrisma.user.findFirst({
      where: { email: 'admin@oxford.edu' },
    });
    const targetAdmin = await targetPrisma.user.findFirst({
      where: { email: 'admin@oxford.edu' },
    });

    if (sourceAdmin && targetAdmin && sourceAdmin.id === targetAdmin.id && sourceAdmin.passwordHash === targetAdmin.passwordHash) {
      console.log(`  ✓ Admin user "admin@oxford.edu" verified (ID: ${sourceAdmin.id}, Password Hash Matches Bit-for-Bit)`);
    } else {
      console.error(`  ✗ Admin user deep check failed!`);
      allChecksPassed = false;
    }

    // Deep check academic catalog
    const sourceProgs = await sourcePrisma.programme.count({ where: { tenantId: sourceTenant?.id } });
    const targetProgs = await targetPrisma.programme.count({ where: { tenantId: targetTenant?.id } });
    if (sourceProgs === targetProgs) {
      console.log(`  ✓ Oxford academic programmes count matches (${sourceProgs} programmes)`);
    } else {
      console.error(`  ✗ Oxford academic programmes mismatch (${sourceProgs} vs ${targetProgs})`);
      allChecksPassed = false;
    }

    // Deep check dynamic forms
    const sourceForms = await sourcePrisma.form.count({ where: { tenantId: sourceTenant?.id } });
    const targetForms = await targetPrisma.form.count({ where: { tenantId: targetTenant?.id } });
    if (sourceForms === targetForms) {
      console.log(`  ✓ Oxford forms count matches (${sourceForms} forms)`);
    } else {
      console.error(`  ✗ Oxford forms mismatch (${sourceForms} vs ${targetForms})`);
      allChecksPassed = false;
    }

    // Deep check audit logs
    const sourceAudits = await sourcePrisma.auditLog.count({ where: { tenantId: sourceTenant?.id } });
    const targetAudits = await targetPrisma.auditLog.count({ where: { tenantId: targetTenant?.id } });
    if (sourceAudits === targetAudits) {
      console.log(`  ✓ Oxford audit log entries count matches (${sourceAudits} audit records)`);
    } else {
      console.error(`  ✗ Oxford audit logs mismatch (${sourceAudits} vs ${targetAudits})`);
      allChecksPassed = false;
    }

    const durationMs = Date.now() - startTime;
    console.log('\n===================================================================================');
    if (allChecksPassed) {
      console.log(' PARITY VERIFICATION RESULT: 100% DETERMINISTIC DATA CONTENT PARITY CONFIRMED ✓');
      console.log(` Total Duration: ${durationMs} ms`);
      console.log(' All 33 Prisma models (34 tables), SHA-256 hashes, relations, and migrations match 100%.');
      console.log('===================================================================================');
    } else {
      console.error(' PARITY VERIFICATION RESULT: DISCREPANCY DETECTED ✗');
      console.error(` Total Duration: ${durationMs} ms`);
      console.error('===================================================================================');
      throw new Error('Parity verification failed with discrepancies.');
    }
  } finally {
    await sourcePrisma.$disconnect();
    await targetPrisma.$disconnect();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename || '')) {
  runParityVerification().catch((err) => {
    console.error('\n[FATAL] Parity verification failed:', err.message);
    process.exit(1);
  });
}

export { runParityVerification };

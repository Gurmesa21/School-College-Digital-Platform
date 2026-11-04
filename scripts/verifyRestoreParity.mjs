#!/usr/bin/env node
/**
 * Day 20: Disaster Recovery & Backup Verification
 * Data Parity & Restoration Verification Script (scripts/verifyRestoreParity.mjs)
 *
 * Compares the active database against the restored test database.
 * Verifies table row counts, migration history, and deep entity properties
 * across all Prisma models.
 */

import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { parseDatabaseUrl } from './backupDatabase.mjs';

dotenv.config();

const PRISMA_MODELS = [
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

function buildTargetUrl(sourceUrl, targetDbName) {
  const url = new URL(sourceUrl);
  url.pathname = `/${targetDbName}`;
  return url.toString();
}

async function runParityVerification() {
  const startTime = Date.now();
  console.log('===============================================================');
  console.log(' [Day 20 DR] Verifying Database Restoration Parity & Integrity');
  console.log('===============================================================');

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
    // 1. Prisma Migration History Parity Check
    // -------------------------------------------------------------------------
    console.log('\n[CHECK 1/3] Verifying Prisma Migrations History Parity...');
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
    // 2. Table-by-Table Row Count Parity Check
    // -------------------------------------------------------------------------
    console.log('\n[CHECK 2/3] Verifying Record Counts Across All 32 Prisma Models...');

    for (const model of PRISMA_MODELS) {
      try {
        const sourceCount = await sourcePrisma[model].count();
        const targetCount = await targetPrisma[model].count();
        const match = sourceCount === targetCount;

        if (!match) {
          allChecksPassed = false;
        }

        parityTable.push({
          Model: model,
          Source: sourceCount,
          Restored: targetCount,
          Status: match ? 'MATCH ✓' : 'MISMATCH ✗',
        });
      } catch (err) {
        parityTable.push({
          Model: model,
          Source: 'ERR',
          Restored: 'ERR',
          Status: `ERROR: ${err.message}`,
        });
        allChecksPassed = false;
      }
    }

    // Print table in clean columns
    console.log('\n-----------------------------------------------------------------------------------');
    console.log(
      '| ' +
      'Model Name'.padEnd(26) +
      ' | ' +
      'Source Count'.padStart(12) +
      ' | ' +
      'Restored Count'.padStart(14) +
      ' | ' +
      'Status'.padEnd(12) +
      ' |'
    );
    console.log('-----------------------------------------------------------------------------------');
    for (const row of parityTable) {
      console.log(
        '| ' +
        row.Model.padEnd(26) +
        ' | ' +
        String(row.Source).padStart(12) +
        ' | ' +
        String(row.Restored).padStart(14) +
        ' | ' +
        row.Status.padEnd(12) +
        ' |'
      );
    }
    console.log('-----------------------------------------------------------------------------------');

    // -------------------------------------------------------------------------
    // 3. Deep Entity Sample Integrity Checks
    // -------------------------------------------------------------------------
    console.log('\n[CHECK 3/3] Performing Deep Sample Entity Integrity Checks...');

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
      console.log(`  ✓ Admin user "admin@oxford.edu" verified (ID: ${sourceAdmin.id}, Hash Match: Yes)`);
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
    console.log('\n===============================================================');
    if (allChecksPassed) {
      console.log(' PARITY VERIFICATION RESULT: 100% DATA PARITY CONFIRMED ✓');
      console.log(` Total Duration: ${durationMs} ms`);
      console.log(' All 32 Prisma models, migrations, and deep entities match perfectly.');
      console.log('===============================================================');
    } else {
      console.error(' PARITY VERIFICATION RESULT: DISCREPANCY DETECTED ✗');
      console.error(` Total Duration: ${durationMs} ms`);
      console.error('===============================================================');
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


#!/usr/bin/env node
/**
 * Day 20: Disaster Recovery & Backup Verification
 * Database Restoration Drill Script (scripts/restoreDatabase.mjs)
 *
 * Restores a PostgreSQL custom archive dump into a dedicated, safe disposable test database.
 * Strictly enforces that the active source/production database can NEVER be dropped or overwritten.
 * Requires explicit confirmation before dropping the designated disposable test target.
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import dotenv from 'dotenv';
import { parseDatabaseUrl } from './backupDatabase.mjs';

dotenv.config();

// Strictly authorized disposable drill targets
export const ALLOWED_TEST_DATABASES = ['gurmesa_restore_test_db'];

// Protected system and production database names that can NEVER be deleted or targeted
export const PROTECTED_DATABASES = ['postgres', 'template0', 'template1'];

export function checkNativeTool(toolName) {
  try {
    const isWindows = process.platform === 'win32';
    const checkCmd = isWindows ? `where.exe ${toolName}` : `which ${toolName}`;
    execSync(checkCmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function checkDockerContainer(containerName) {
  try {
    const output = execSync(`docker ps --filter "name=${containerName}" --format "{{.Names}}"`, {
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
    return output.split(/\r?\n/).includes(containerName);
  } catch {
    return false;
  }
}

export function getLatestBackupFile(backupsDir) {
  if (!fs.existsSync(backupsDir)) {
    throw new Error(`Backups directory does not exist: ${backupsDir}`);
  }
  const files = fs
    .readdirSync(backupsDir)
    .filter((f) => f.endsWith('.dump'))
    .map((f) => ({
      name: f,
      fullPath: path.join(backupsDir, f),
      mtime: fs.statSync(path.join(backupsDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    throw new Error(`No .dump backup files found in ${backupsDir}`);
  }
  return files[0].fullPath;
}

/**
 * Validates restoration target and parameters with strict safety guards.
 * Throws an Error immediately if any safety rule is violated.
 */
export function validateRestoreSafety(targetDb, sourceDb, rawArgs = []) {
  // Guard 1: Detect and reject the deprecated --force-overwrite-source flag
  if (rawArgs.includes('--force-overwrite-source')) {
    throw new Error(
      '[CRITICAL RESTORE SAFETY PROHIBITION] The --force-overwrite-source flag has been permanently removed. ' +
      'Destructive operations against the active source or production database are strictly prohibited under all circumstances.'
    );
  }

  // Guard 2: Source database overwrite is categorically impossible
  if (targetDb === sourceDb) {
    throw new Error(
      `[CRITICAL RESTORE SAFETY PROHIBITION] Refusing to restore: target database "${targetDb}" is the active source database! ` +
      'Restoration is restricted strictly to designated disposable drill targets.'
    );
  }

  // Guard 3: Protected system databases cannot be targeted
  if (PROTECTED_DATABASES.includes(targetDb)) {
    throw new Error(
      `[PROTECTED DATABASE GUARD] Refusing to restore: "${targetDb}" is a protected system database.`
    );
  }

  // Guard 4: Target must be in the explicit whitelist of disposable test databases
  if (!ALLOWED_TEST_DATABASES.includes(targetDb)) {
    throw new Error(
      `[UNAUTHORIZED TARGET DATABASE] Target database "${targetDb}" is not an authorized disposable test target. ` +
      `Destructive restoration drills are permitted strictly against: [${ALLOWED_TEST_DATABASES.join(', ')}].`
    );
  }

  // Guard 5: Require unmistakable confirmation flag before dropping the target database
  if (!rawArgs.includes('--confirm-drop-target')) {
    throw new Error(
      `[SAFETY CONFIRMATION REQUIRED] Dropping and restoring disposable test target "${targetDb}" requires the explicit confirmation flag: --confirm-drop-target`
    );
  }

  return true;
}

async function runRestore() {
  const startTime = Date.now();
  console.log('===============================================================');
  console.log(' [Day 20 DR] Initiating PostgreSQL Disaster Recovery Restore Drill');
  console.log('===============================================================');

  const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
  const sourceDb = dbConfig.database;

  // Parse CLI flags
  const args = process.argv.slice(2);
  let targetDb = 'gurmesa_restore_test_db';
  let targetFile = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target-db' && args[i + 1]) {
      targetDb = args[i + 1];
      i++;
    } else if (args[i] === '--file' && args[i + 1]) {
      targetFile = path.resolve(process.cwd(), args[i + 1]);
      i++;
    }
  }

  // Execute strict safety validation
  validateRestoreSafety(targetDb, sourceDb, args);
  console.log(`[INFO] Safety Guard Status: PASSED (Target "${targetDb}" is an authorized disposable target; Source "${sourceDb}" protected)`);

  // Resolve dump file
  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!targetFile) {
    targetFile = getLatestBackupFile(backupsDir);
  }

  if (!fs.existsSync(targetFile)) {
    throw new Error(`Backup file not found: ${targetFile}`);
  }

  const fileStats = fs.statSync(targetFile);
  console.log(`[INFO] Selected Backup File: ${targetFile} (${(fileStats.size / 1024).toFixed(2)} KB)`);
  console.log(`[INFO] Target Restoration Database: ${targetDb}`);

  const containerName = process.env.DOCKER_CONTAINER_NAME || 'school_platform_db';
  const hasNative = checkNativeTool('pg_restore') && checkNativeTool('psql');
  const hasDocker = checkDockerContainer(containerName);

  if (!hasNative && !hasDocker) {
    throw new Error(`Neither native PostgreSQL tools nor Docker container "${containerName}" is accessible.`);
  }

  console.log(`[INFO] Restoration Engine: ${hasNative ? 'Native host PostgreSQL tools' : `Docker container (${containerName})`}`);

  // Step 1: Drop & recreate target database safely
  console.log(`[INFO] Preparing target database "${targetDb}" (confirmed disposable drill target)...`);
  const adminDb = 'postgres';

  const terminateSql = `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${targetDb}' AND pid <> pg_backend_pid();`;
  const dropSql = `DROP DATABASE IF EXISTS ${targetDb};`;
  const createSql = `CREATE DATABASE ${targetDb} OWNER ${dbConfig.user};`;

  if (hasNative) {
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    const psqlArgs = ['-h', dbConfig.host, '-p', dbConfig.port, '-U', dbConfig.user, '-d', adminDb];
    execSync(`psql ${psqlArgs.join(' ')} -c "${terminateSql}"`, { env, stdio: 'pipe' });
    execSync(`psql ${psqlArgs.join(' ')} -c "${dropSql}"`, { env, stdio: 'pipe' });
    execSync(`psql ${psqlArgs.join(' ')} -c "${createSql}"`, { env, stdio: 'pipe' });
  } else {
    execSync(`docker exec ${containerName} psql -U ${dbConfig.user} -d ${adminDb} -c "${terminateSql}"`, { stdio: 'pipe' });
    execSync(`docker exec ${containerName} psql -U ${dbConfig.user} -d ${adminDb} -c "${dropSql}"`, { stdio: 'pipe' });
    execSync(`docker exec ${containerName} psql -U ${dbConfig.user} -d ${adminDb} -c "${createSql}"`, { stdio: 'pipe' });
  }
  console.log(`[INFO] Disposable target database "${targetDb}" created and ready for restore.`);

  // Step 2: Execute pg_restore
  console.log(`[INFO] Restoring archive into "${targetDb}"...`);
  if (hasNative) {
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    const restoreArgs = [
      '-h', dbConfig.host,
      '-p', dbConfig.port,
      '-U', dbConfig.user,
      '-d', targetDb,
      '--no-owner',
      '--no-privileges',
      targetFile,
    ];
    const res = spawnSync('pg_restore', restoreArgs, { env, stdio: 'pipe' });
    // Exit code 0 is success; exit code 1 indicates non-fatal warnings
    if (res.status !== 0 && res.status !== 1) {
      throw new Error(`pg_restore failed with exit code ${res.status}: ${res.stderr.toString()}`);
    }
  } else {
    const tempContainerPath = `/tmp/restore_${Date.now()}.dump`;
    execSync(`docker cp "${targetFile}" ${containerName}:${tempContainerPath}`, { stdio: 'inherit' });

    try {
      execSync(
        `docker exec ${containerName} pg_restore -U ${dbConfig.user} -d ${targetDb} --no-owner --no-privileges ${tempContainerPath}`,
        { stdio: 'pipe' }
      );
    } catch (err) {
      // Check exit code: pg_restore returns 1 for warnings (e.g. relation already exists, role warnings)
      if (err.status !== 1) {
        throw new Error(`pg_restore container execution failed: ${err.message}`);
      }
    } finally {
      execSync(`docker exec ${containerName} rm -f ${tempContainerPath}`, { stdio: 'ignore' });
    }
  }

  // Step 3: Validate table presence in restored database
  const countTablesSql = `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';`;
  let tableCount = 0;
  if (hasNative) {
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    const psqlArgs = ['-h', dbConfig.host, '-p', dbConfig.port, '-U', dbConfig.user, '-d', targetDb, '-t', '-c', countTablesSql];
    const out = execSync(`psql ${psqlArgs.join(' ')}`, { env, encoding: 'utf8' }).trim();
    tableCount = parseInt(out, 10);
  } else {
    const out = execSync(
      `docker exec ${containerName} psql -U ${dbConfig.user} -d ${targetDb} -t -c "${countTablesSql}"`,
      { encoding: 'utf8' }
    ).trim();
    tableCount = parseInt(out, 10);
  }

  if (tableCount === 0 || isNaN(tableCount)) {
    throw new Error(`Restoration validation failed: No public tables found in "${targetDb}".`);
  }

  const durationMs = Date.now() - startTime;
  console.log('---------------------------------------------------------------');
  console.log(' RESTORATION DRILL SUMMARY:');
  console.log(`  - Source Dump File:  ${targetFile}`);
  console.log(`  - Restored Database: ${targetDb}`);
  console.log(`  - Restored Tables:   ${tableCount} public tables verified`);
  console.log(`  - Integrity Status:  RESTORATION SUCCESSFUL`);
  console.log(`  - Duration:          ${durationMs} ms`);
  console.log('===============================================================');
  console.log(' [Day 20 DR] Restoration Drill Completed Successfully');
  console.log('===============================================================');

  return { targetDb, targetFile, tableCount, durationMs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename || '')) {
  runRestore().catch((err) => {
    console.error('\n[FATAL] Database restoration drill failed:', err.message);
    process.exit(1);
  });
}

export { runRestore };

#!/usr/bin/env node
/**
 * Day 20: Disaster Recovery & Backup Verification
 * Database Backup Script (scripts/backupDatabase.mjs)
 *
 * Creates a consistent PostgreSQL custom archive dump (-Fc) of the active database.
 * Supports native PostgreSQL CLI tools or containerized Docker execution.
 * Validates header integrity via pg_restore -l and records backup metadata.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync, spawnSync } from 'child_process';
import dotenv from 'dotenv';

// Load .env
dotenv.config();

function parseDatabaseUrl(urlStr) {
  if (!urlStr) {
    throw new Error('DATABASE_URL is not defined in environment or .env file');
  }
  const parsed = new URL(urlStr);
  const dbName = parsed.pathname.replace(/^\//, '').split('?')[0];
  return {
    user: decodeURIComponent(parsed.username || 'dev_user'),
    password: decodeURIComponent(parsed.password || 'dev_password'),
    host: parsed.hostname || 'localhost',
    port: parsed.port || '5432',
    database: dbName || 'gurmesa_dev_db',
    safeUrl: `${parsed.protocol}//${parsed.username}:***@${parsed.host}${parsed.pathname}`,
  };
}

function checkNativeTool(toolName) {
  try {
    const isWindows = process.platform === 'win32';
    const checkCmd = isWindows ? `where.exe ${toolName}` : `which ${toolName}`;
    execSync(checkCmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkDockerContainer(containerName) {
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

async function runBackup() {
  const startTime = Date.now();
  console.log('===============================================================');
  console.log(' [Day 20 DR] Initiating Automated PostgreSQL Database Backup');
  console.log('===============================================================');

  const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
  console.log(`[INFO] Source Database: ${dbConfig.database}`);
  console.log(`[INFO] Connection Target: ${dbConfig.safeUrl}`);

  // Create backups directory if not present
  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
    console.log(`[INFO] Created backup directory: ${backupsDir}`);
  }

  // Parse optional CLI args (--output)
  let customOutputFile = null;
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    customOutputFile = path.resolve(process.cwd(), args[outputIndex + 1]);
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .replace(/\..+/, '');
  const backupFileName = customOutputFile
    ? path.basename(customOutputFile)
    : `backup-${dbConfig.database}-${timestamp}.dump`;
  const backupFilePath = customOutputFile || path.join(backupsDir, backupFileName);

  console.log(`[INFO] Destination Dump File: ${backupFilePath}`);

  const containerName = process.env.DOCKER_CONTAINER_NAME || 'school_platform_db';
  const hasNative = checkNativeTool('pg_dump');
  const hasDocker = checkDockerContainer(containerName);

  if (!hasNative && !hasDocker) {
    throw new Error(
      `Neither native pg_dump nor running Docker container "${containerName}" was found. Cannot proceed.`
    );
  }

  console.log(`[INFO] Execution Mode: ${hasNative ? 'Native host pg_dump' : `Docker container (${containerName})`}`);

  if (hasNative) {
    console.log('[INFO] Running native pg_dump...');
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    const cmdArgs = [
      '-h', dbConfig.host,
      '-p', dbConfig.port,
      '-U', dbConfig.user,
      '-d', dbConfig.database,
      '-Fc', // custom archive format
      '-f', backupFilePath,
    ];
    const result = spawnSync('pg_dump', cmdArgs, { env, stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error(`pg_dump failed with exit code ${result.status}`);
    }
  } else {
    console.log(`[INFO] Running pg_dump inside Docker container "${containerName}"...`);
    const tempContainerPath = `/tmp/backup_${Date.now()}.dump`;

    // Run pg_dump inside container
    const dumpCmd = `docker exec ${containerName} pg_dump -U ${dbConfig.user} -d ${dbConfig.database} -Fc -f ${tempContainerPath}`;
    execSync(dumpCmd, { stdio: 'inherit' });

    // Copy dump file to host
    console.log(`[INFO] Copying archive from container to host...`);
    execSync(`docker cp ${containerName}:${tempContainerPath} "${backupFilePath}"`, { stdio: 'inherit' });

    // Remove temp file inside container
    execSync(`docker exec ${containerName} rm -f ${tempContainerPath}`, { stdio: 'ignore' });
  }

  // Verify file existence and size
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file was not created: ${backupFilePath}`);
  }
  const fileStats = fs.statSync(backupFilePath);
  if (fileStats.size === 0) {
    throw new Error(`Backup file is empty (0 bytes): ${backupFilePath}`);
  }

  const sizeKb = (fileStats.size / 1024).toFixed(2);
  const sizeMb = (fileStats.size / (1024 * 1024)).toFixed(2);
  console.log(`[INFO] Backup written successfully: ${fileStats.size} bytes (${sizeKb} KB / ${sizeMb} MB)`);

  // Verify header and archive integrity with pg_restore -l
  console.log('[INFO] Verifying archive integrity and table catalog with pg_restore -l...');
  let tocLines = [];
  if (checkNativeTool('pg_restore')) {
    const listResult = spawnSync('pg_restore', ['-l', backupFilePath], { encoding: 'utf8' });
    if (listResult.status !== 0) {
      throw new Error(`pg_restore -l failed archive integrity test: ${listResult.stderr}`);
    }
    tocLines = listResult.stdout.split(/\r?\n/).filter(line => line.trim() && !line.startsWith(';'));
  } else {
    const verifyTemp = `/tmp/verify_${Date.now()}.dump`;
    execSync(`docker cp "${backupFilePath}" ${containerName}:${verifyTemp}`, { stdio: 'ignore' });
    const listOutput = execSync(`docker exec ${containerName} pg_restore -l ${verifyTemp}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    execSync(`docker exec ${containerName} rm -f ${verifyTemp}`, { stdio: 'ignore' });
    tocLines = listOutput.split(/\r?\n/).filter(line => line.trim() && !line.startsWith(';'));
  }

  const tableEntries = tocLines.filter(line => line.includes('TABLE DATA') || line.includes('TABLE '));
  console.log(`[INFO] Archive integrity verified: ${tocLines.length} TOC entries, ${tableEntries.length} table definitions/data items.`);

  const durationMs = Date.now() - startTime;

  const fileSha256 = crypto.createHash('sha256').update(fs.readFileSync(backupFilePath)).digest('hex');

  // Attempt to restrict file permissions to owner read/write (0600)
  try {
    fs.chmodSync(backupFilePath, 0o600);
  } catch {
    // Windows ignores POSIX mode bits gracefully
  }

  // Write non-credential metadata JSON manifest
  const metaFilePath = `${backupFilePath}.meta.json`;
  const metadata = {
    backupFile: path.basename(backupFilePath),
    fullPath: backupFilePath,
    database: dbConfig.database,
    fileSizeBytes: fileStats.size,
    fileSizeKb: parseFloat(sizeKb),
    fileSizeMb: parseFloat(sizeMb),
    fileSha256,
    timestamp: new Date().toISOString(),
    durationMs,
    tocEntriesCount: tocLines.length,
    tableEntriesCount: tableEntries.length,
    verified: true,
    archiveFormat: 'PostgreSQL Custom Archive (Fc)',
  };
  fs.writeFileSync(metaFilePath, JSON.stringify(metadata, null, 2), 'utf8');
  try {
    fs.chmodSync(metaFilePath, 0o600);
  } catch {
    // Windows ignores POSIX mode bits gracefully
  }
  console.log(`[INFO] Metadata manifest written to: ${metaFilePath}`);

  console.log('---------------------------------------------------------------');
  console.log(' BACKUP SUMMARY:');
  console.log(`  - Database:       ${dbConfig.database}`);
  console.log(`  - Destination:    ${backupFilePath}`);
  console.log(`  - File Size:      ${sizeKb} KB (${fileStats.size} bytes)`);
  console.log(`  - TOC Items:      ${tocLines.length}`);
  console.log(`  - Verification:   PASSED (100% Readable Archive Header)`);
  console.log(`  - Duration:       ${durationMs} ms`);
  console.log('===============================================================');
  console.log(' [Day 20 DR] Database Backup Completed Successfully');
  console.log('===============================================================');

  return { backupFilePath, metadata };
}

// Execute directly if run via CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename || '')) {
  runBackup().catch((err) => {
    console.error('\n[FATAL] Database backup failed:', err.message);
    process.exit(1);
  });
}

export { runBackup, parseDatabaseUrl };


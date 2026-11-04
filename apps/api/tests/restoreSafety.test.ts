import { describe, it, expect } from 'vitest';
import {
  validateRestoreSafety,
  ALLOWED_TEST_DATABASES,
  PROTECTED_DATABASES,
} from '../../../scripts/restoreDatabase.mjs';

describe('Disaster Recovery: Restore Safety Guards', () => {
  const sourceDb = 'gurmesa_dev_db';
  const allowedTestDb = 'gurmesa_restore_test_db';

  it('strictly refuses to overwrite source database', () => {
    expect(() => {
      validateRestoreSafety(sourceDb, sourceDb, ['--confirm-drop-target']);
    }).toThrow(/Refusing to restore: target database .* is the active source database/);
  });

  it('rejects attempted source overwrite using the deprecated former force flag', () => {
    expect(() => {
      validateRestoreSafety(sourceDb, sourceDb, ['--force-overwrite-source', '--confirm-drop-target']);
    }).toThrow(/The --force-overwrite-source flag has been permanently removed/);
  });

  it('rejects any database restoration if --force-overwrite-source is passed', () => {
    expect(() => {
      validateRestoreSafety(allowedTestDb, sourceDb, ['--force-overwrite-source', '--confirm-drop-target']);
    }).toThrow(/The --force-overwrite-source flag has been permanently removed/);
  });

  it('strictly refuses to target protected system databases (e.g. postgres, template0, template1)', () => {
    for (const protectedDb of PROTECTED_DATABASES) {
      expect(() => {
        validateRestoreSafety(protectedDb, sourceDb, ['--confirm-drop-target']);
      }).toThrow(/is a protected system database/);
    }
  });

  it('rejects arbitrary unauthorized target databases not on the disposable whitelist', () => {
    const unauthorizedTargets = ['production_db', 'school_prod', 'random_target', 'test_db'];
    for (const target of unauthorizedTargets) {
      expect(() => {
        validateRestoreSafety(target, sourceDb, ['--confirm-drop-target']);
      }).toThrow(/is not an authorized disposable test target/);
    }
  });

  it('refuses restoration if the required --confirm-drop-target confirmation flag is omitted', () => {
    expect(() => {
      validateRestoreSafety(allowedTestDb, sourceDb, []);
    }).toThrow(/requires the explicit confirmation flag: --confirm-drop-target/);
  });

  it('permits restoration when targeting authorized disposable test target with confirmation flag', () => {
    const isSafe = validateRestoreSafety(allowedTestDb, sourceDb, ['--confirm-drop-target']);
    expect(isSafe).toBe(true);
    expect(ALLOWED_TEST_DATABASES).toContain(allowedTestDb);
  });
});


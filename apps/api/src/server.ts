import bcrypt from 'bcryptjs';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { InMemoryTenantRepository } from './repositories/tenantRepository.js';
import { InMemoryAuthRepository } from './repositories/authRepository.js';
import { InMemoryAuditRepository } from './repositories/auditRepository.js';
import { InMemoryEmailService } from './services/emailService.js';
import { PERMISSIONS } from '@school/shared';

function isPlaceholderDatabase(): boolean {
  const dbUrl = process.env.DATABASE_URL || '';
  return !dbUrl || dbUrl.includes('placeholder') || dbUrl.includes('postgres_placeholder');
}

async function startServer() {
  let app;

  if (isPlaceholderDatabase()) {
    console.log('[API] Notice: DATABASE_URL is unconfigured or placeholder.');
    console.log('[API] Initializing in-memory development repositories with baseline tenant and administrative data.');

    const tenantRepo = new InMemoryTenantRepository([
      {
        tenant: {
          id: 'tenant_oxford',
          slug: 'oxford',
          name: 'Oxford International School',
          institutionType: 'PRIMARY_SECONDARY',
          status: 'ACTIVE',
          timezone: 'UTC',
          defaultLocale: 'en',
          contactEmail: 'admin@oxford.school.example',
          matchedHostname: 'oxford.localhost',
          resolutionMethod: 'DOMAIN_MAPPING',
        },
        domains: ['oxford.localhost', 'oxford.local', 'localhost'],
      },
      {
        tenant: {
          id: 'tenant_greenwood',
          slug: 'greenwood',
          name: 'Greenwood Secondary School',
          institutionType: 'PRIMARY_SECONDARY',
          status: 'ACTIVE',
          timezone: 'UTC',
          defaultLocale: 'en',
          contactEmail: 'admin@greenwood.school.example',
          matchedHostname: 'greenwood.localhost',
          resolutionMethod: 'DOMAIN_MAPPING',
        },
        domains: ['greenwood.localhost', 'secondary.localhost'],
      },
    ]);

    const authRepo = new InMemoryAuthRepository();
    const auditRepo = new InMemoryAuditRepository();
    const emailService = new InMemoryEmailService();

    // Seed baseline tenant roles
    const adminRole = await authRepo.createRole({
      name: 'TENANT_ADMIN',
      displayName: 'Institutional Administrator',
      description: 'Full institutional management',
      isSystem: true,
      tenantId: 'tenant_oxford',
    });

    const tenantAdminPermissions = [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_INVITE,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.ROLES_ASSIGN,
      PERMISSIONS.AUDIT_READ,
    ];

    for (const permCode of tenantAdminPermissions) {
      await authRepo.assignPermissionToRole(adminRole.id, permCode);
    }

    const teacherRole = await authRepo.createRole({
      name: 'TEACHER',
      displayName: 'Teacher / Educator',
      description: 'Classroom and student management',
      isSystem: true,
      tenantId: 'tenant_oxford',
    });
    await authRepo.assignPermissionToRole(teacherRole.id, PERMISSIONS.USERS_READ);

    const superAdminRole = await authRepo.createRole({
      name: 'SUPER_ADMIN',
      displayName: 'Platform Super Administrator',
      description: 'Platform-level governance',
      isSystem: true,
      tenantId: null,
    });
    await authRepo.assignPermissionToRole(superAdminRole.id, PERMISSIONS.PLATFORM_ACCESS);
    await authRepo.assignPermissionToRole(superAdminRole.id, PERMISSIONS.AUDIT_READ);

    // Seed pre-registered administrator user (password: AdminPassword123!)
    const passwordHash = await bcrypt.hash('AdminPassword123!', 10);
    const adminUser = await authRepo.createUser({
      email: 'admin@oxford.edu',
      passwordHash,
      status: 'ACTIVE',
      firstName: 'Institutional',
      lastName: 'Administrator',
      isSuperAdmin: false,
    });
    await authRepo.updateUser(adminUser.id, { emailVerifiedAt: new Date() });

    const membership = await authRepo.createMembership({
      userId: adminUser.id,
      tenantId: 'tenant_oxford',
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(membership.id, adminRole.id);

    app = createApp({
      repository: tenantRepo,
      authRepository: authRepo,
      auditRepository: auditRepo,
      emailService,
    });
  } else {
    app = createApp();
  }

  const server = app.listen(config.PORT, () => {
    console.log(`[API] Server listening on http://localhost:${config.PORT}`);
    console.log(`[API] Health check available at http://localhost:${config.PORT}/health`);
    console.log(`[API] Versioned prefix active at http://localhost:${config.PORT}${config.API_PREFIX}/health`);
  });

  // Graceful shutdown handling
  function shutdown(signal: string) {
    console.log(`[API] Received ${signal}. Starting graceful shutdown...`);
    server.close((err) => {
      if (err) {
        console.error('[API] Error during server close:', err);
        process.exit(1);
      }
      console.log('[API] Server closed gracefully. Process exiting.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[API] Forceful shutdown initiated after timeout.');
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('[API] Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('[API] Uncaught Exception:', error);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('[API] Failed to start server:', err);
  process.exit(1);
});

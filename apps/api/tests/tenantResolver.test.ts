import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryTenantRepository } from '../src/repositories/tenantRepository.js';
import { ResolvedTenant, normalizeHostname } from '@school/shared';
import { EnvConfig } from '../src/config/env.js';

describe('Tenant Resolution & Multi-Tenant Security Suite', () => {
  let repository: InMemoryTenantRepository;

  const mockActiveTenant: ResolvedTenant = {
    id: 'tenant-active-1',
    slug: 'greenwood-secondary-school',
    name: 'Greenwood Secondary School',
    institutionType: 'PRIMARY_SECONDARY',
    status: 'ACTIVE',
    timezone: 'Africa/Addis_Ababa',
    defaultLocale: 'en',
    contactEmail: 'admissions@greenwood.school.example',
    matchedHostname: 'secondary.localhost',
    resolutionMethod: 'DOMAIN_MAPPING',
  };

  const mockSuspendedTenant: ResolvedTenant = {
    id: 'tenant-suspended-2',
    slug: 'heritage-academy-suspended',
    name: 'Heritage Academy (Suspended)',
    institutionType: 'PRIMARY_SECONDARY',
    status: 'SUSPENDED',
    timezone: 'Africa/Addis_Ababa',
    defaultLocale: 'en',
    contactEmail: 'billing@heritage.school.example',
    matchedHostname: 'suspended.localhost',
    resolutionMethod: 'DOMAIN_MAPPING',
  };

  const mockPendingTenant: ResolvedTenant = {
    id: 'tenant-pending-3',
    slug: 'summit-academy-pending',
    name: 'Summit Academy (Pending Activation)',
    institutionType: 'COLLEGE',
    status: 'PENDING',
    timezone: 'Africa/Addis_Ababa',
    defaultLocale: 'en',
    contactEmail: 'admin@summit.school.example',
    matchedHostname: 'pending.localhost',
    resolutionMethod: 'DOMAIN_MAPPING',
  };

  const baseConfig: EnvConfig = {
    NODE_ENV: 'test',
    APP_ENV: 'test',
    PORT: 4000,
    API_PREFIX: '/api/v1',
    CORS_ORIGIN: 'http://localhost:3000',
    ALLOW_DEV_TENANT_OVERRIDE: false,
    TRUST_PROXY: false,
  };

  beforeEach(() => {
    repository = new InMemoryTenantRepository([
      { tenant: mockActiveTenant, domains: ['secondary.localhost', 'greenwood.school.edu'] },
      { tenant: mockSuspendedTenant, domains: ['suspended.localhost'] },
      { tenant: mockPendingTenant, domains: ['pending.localhost'] },
    ]);
  });

  describe('1. Hostname Normalization Unit Tests', () => {
    it('normalizes uppercase characters to lowercase', () => {
      expect(normalizeHostname('Greenwood.School.Edu')).toBe('greenwood.school.edu');
    });

    it('strips standard port suffixes', () => {
      expect(normalizeHostname('secondary.localhost:3000')).toBe('secondary.localhost');
      expect(normalizeHostname('greenwood.school.edu:443')).toBe('greenwood.school.edu');
    });

    it('handles trailing FQDN dots', () => {
      expect(normalizeHostname('secondary.localhost.')).toBe('secondary.localhost');
      expect(normalizeHostname('greenwood.school.edu...')).toBe('greenwood.school.edu');
    });

    it('strips unintended protocol or path prefixes', () => {
      expect(normalizeHostname('http://secondary.localhost:8080/path')).toBe('secondary.localhost');
      expect(normalizeHostname('https://greenwood.school.edu?param=1')).toBe('greenwood.school.edu');
    });

    it('normalizes IPv6 loopback formatted in brackets', () => {
      expect(normalizeHostname('[::1]:3000')).toBe('::1');
    });
  });

  describe('2. Mapped Hostname Resolution (Production Mode)', () => {
    it('resolves a mapped hostname to the expected tenant', async () => {
      const app = createApp({ repository, envConfig: baseConfig });

      const res = await request(app)
        .get('/api/v1/tenant/current')
        .set('Host', 'secondary.localhost');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('tenant-active-1');
      expect(res.body.data.slug).toBe('greenwood-secondary-school');
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.matchedHostname).toBe('secondary.localhost');
      expect(res.body.data.resolutionMethod).toBe('DOMAIN_MAPPING');
    });

    it('resolves correctly when host contains mixed case and port number', async () => {
      const app = createApp({ repository, envConfig: baseConfig });

      const res = await request(app)
        .get('/api/v1/tenant/current')
        .set('Host', 'SECONDARY.LocalHost:8080');

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe('greenwood-secondary-school');
    });

    it('returns generic 404 Institution Not Found for unknown hostnames', async () => {
      const app = createApp({ repository, envConfig: baseConfig });

      const res = await request(app)
        .get('/api/v1/tenant/current')
        .set('Host', 'unmapped-school.example.com');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSTITUTION_NOT_FOUND');
      expect(res.body.error.message).toContain('Institution Not Found');
      expect(res.body.error.requestId).toBeDefined();
    });
  });

  describe('3. Institutional Status Enforcement', () => {
    it('rejects requests for suspended tenants with HTTP 403', async () => {
      const app = createApp({ repository, envConfig: baseConfig });

      const res = await request(app)
        .get('/api/v1/tenant/current')
        .set('Host', 'suspended.localhost');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSTITUTION_SUSPENDED');
      expect(res.body.error.message).toContain('suspended');
    });

    it('rejects requests for pending/inactive tenants with HTTP 403', async () => {
      const app = createApp({ repository, envConfig: baseConfig });

      const res = await request(app)
        .get('/api/v1/tenant/current')
        .set('Host', 'pending.localhost');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSTITUTION_INACTIVE');
    });
  });

  describe('4. Anti-Tampering & Security Headers', () => {
    it('ignores client-supplied x-tenant-id headers and resolves strictly via Host', async () => {
      const app = createApp({ repository, envConfig: baseConfig });

      const res = await request(app)
        .get('/api/v1/tenant/current')
        .set('Host', 'secondary.localhost')
        .set('x-tenant-id', 'attacker-controlled-tenant-id')
        .set('x-tenant-slug', 'attacker-slug');

      expect(res.status).toBe(200);
      // Must resolve to Host (Greenwood), NOT attacker-controlled header
      expect(res.body.data.slug).toBe('greenwood-secondary-school');
    });

    it('ignores X-Forwarded-Host when proxy trust is disabled', async () => {
      const untrustedProxyConfig: EnvConfig = { ...baseConfig, TRUST_PROXY: false };
      const app = createApp({ repository, envConfig: untrustedProxyConfig });

      const res = await request(app)
        .get('/api/v1/tenant/current')
        .set('Host', 'secondary.localhost')
        .set('X-Forwarded-Host', 'unmapped-spoofed.com');

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe('greenwood-secondary-school');
    });
  });

  describe('5. Local Development Query Override Rules', () => {
    it('allows query override on loopback host when explicitly enabled in dev environment', async () => {
      const devConfig: EnvConfig = {
        ...baseConfig,
        NODE_ENV: 'development',
        APP_ENV: 'development',
        ALLOW_DEV_TENANT_OVERRIDE: true,
      };
      const app = createApp({ repository, envConfig: devConfig });

      const res = await request(app)
        .get('/api/v1/tenant/current?tenant=greenwood-secondary-school')
        .set('Host', 'localhost:4000');

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe('greenwood-secondary-school');
      expect(res.body.data.resolutionMethod).toBe('DEVELOPMENT_OVERRIDE');
    });

    it('rejects query override in staging environment even if config was mistakenly set', async () => {
      const stagingConfig: EnvConfig = {
        ...baseConfig,
        NODE_ENV: 'production',
        APP_ENV: 'staging',
        ALLOW_DEV_TENANT_OVERRIDE: false, // Enforced by loadConfig
      };
      const app = createApp({ repository, envConfig: stagingConfig });

      const res = await request(app)
        .get('/api/v1/tenant/current?tenant=greenwood-secondary-school')
        .set('Host', 'staging.schoolplatform.example');

      // Since staging.schoolplatform.example is not a mapped domain, it must return 404
      // rather than honoring the ?tenant query parameter
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INSTITUTION_NOT_FOUND');
    });

    it('rejects query override in production environment', async () => {
      const prodConfig: EnvConfig = {
        ...baseConfig,
        NODE_ENV: 'production',
        APP_ENV: 'production',
        ALLOW_DEV_TENANT_OVERRIDE: false,
      };
      const app = createApp({ repository, envConfig: prodConfig });

      const res = await request(app)
        .get('/api/v1/tenant/current?tenant=greenwood-secondary-school')
        .set('Host', 'prod.schoolplatform.example');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INSTITUTION_NOT_FOUND');
    });

    it('enforces status checks during dev query override (cannot access suspended tenant)', async () => {
      const devConfig: EnvConfig = {
        ...baseConfig,
        NODE_ENV: 'development',
        APP_ENV: 'development',
        ALLOW_DEV_TENANT_OVERRIDE: true,
      };
      const app = createApp({ repository, envConfig: devConfig });

      const res = await request(app)
        .get('/api/v1/tenant/current?tenant=heritage-academy-suspended')
        .set('Host', 'localhost:4000');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSTITUTION_SUSPENDED');
    });

    it('returns 404 for invalid tenant slug during dev override', async () => {
      const devConfig: EnvConfig = {
        ...baseConfig,
        NODE_ENV: 'development',
        APP_ENV: 'development',
        ALLOW_DEV_TENANT_OVERRIDE: true,
      };
      const app = createApp({ repository, envConfig: devConfig });

      const res = await request(app)
        .get('/api/v1/tenant/current?tenant=non-existent-slug')
        .set('Host', 'localhost:4000');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INSTITUTION_NOT_FOUND');
    });
  });

  describe('6. Database Unavailability & Fail-Safe Handling', () => {
    it('returns 503 Service Unavailable when database lookup fails without silent fallback', async () => {
      const app = createApp({ repository, envConfig: baseConfig });

      // Simulate unexpected database crash/network drop
      repository.setSimulateFailure(true);

      const res = await request(app)
        .get('/api/v1/tenant/current')
        .set('Host', 'secondary.localhost');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_RESOLUTION_UNAVAILABLE');
      expect(res.body.error.message).toContain('unavailable');
    });
  });

  describe('7. Operational Health Probes', () => {
    it('health probes respond 200 without requiring tenant resolution', async () => {
      const app = createApp({ repository, envConfig: baseConfig });

      // Request /health without any mapped Host header
      const res = await request(app)
        .get('/health')
        .set('Host', 'unmapped-random-host.com');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
    });

    it('versioned health probe /api/v1/health responds 200 without requiring tenant resolution', async () => {
      const app = createApp({ repository, envConfig: baseConfig });

      const res = await request(app)
        .get('/api/v1/health')
        .set('Host', 'unmapped-random-host.com');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
    });
  });
});

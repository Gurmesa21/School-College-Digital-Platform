import { ITenantRepository, ResolvedTenant, normalizeHostname } from '@school/shared';
import { prisma } from '@school/db';

/**
 * Production Prisma implementation of Tenant Repository
 */
export class PrismaTenantRepository implements ITenantRepository {
  async findByHostname(rawHostname: string): Promise<ResolvedTenant | null> {
    const normalized = normalizeHostname(rawHostname);
    if (!normalized) return null;

    const record = await prisma.tenantDomain.findUnique({
      where: { hostname: normalized },
      include: { tenant: true },
    });

    if (!record || !record.isVerified || !record.tenant) {
      return null;
    }

    const t = record.tenant;
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      institutionType: t.institutionType,
      status: t.status,
      timezone: t.timezone,
      defaultLocale: t.defaultLocale,
      contactEmail: t.contactEmail,
      matchedHostname: record.hostname,
      resolutionMethod: 'DOMAIN_MAPPING',
    };
  }

  async findBySlug(rawSlug: string): Promise<ResolvedTenant | null> {
    const slug = rawSlug.trim().toLowerCase();
    if (!slug) return null;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: { domains: true },
    });

    if (!tenant) return null;

    const primaryDomain = tenant.domains.find((d) => d.isPrimary) || tenant.domains[0];

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      institutionType: tenant.institutionType,
      status: tenant.status,
      timezone: tenant.timezone,
      defaultLocale: tenant.defaultLocale,
      contactEmail: tenant.contactEmail,
      matchedHostname: primaryDomain ? primaryDomain.hostname : `${tenant.slug}.local`,
      resolutionMethod: 'DEVELOPMENT_OVERRIDE',
    };
  }
}

/**
 * In-Memory Tenant Repository for unit testing and offline development
 */
export class InMemoryTenantRepository implements ITenantRepository {
  private tenantsBySlug = new Map<string, ResolvedTenant>();
  private domainsToSlug = new Map<string, string>();
  private shouldFailNextLookup = false;

  constructor(initialTenants?: Array<{ tenant: ResolvedTenant; domains: string[] }>) {
    if (initialTenants) {
      for (const item of initialTenants) {
        this.addTenant(item.tenant, item.domains);
      }
    }
  }

  public setSimulateFailure(fail: boolean): void {
    this.shouldFailNextLookup = fail;
  }

  public addTenant(tenant: ResolvedTenant, domains: string[]): void {
    this.tenantsBySlug.set(tenant.slug.toLowerCase(), tenant);
    for (const domain of domains) {
      this.domainsToSlug.set(normalizeHostname(domain), tenant.slug.toLowerCase());
    }
  }

  async findByHostname(rawHostname: string): Promise<ResolvedTenant | null> {
    if (this.shouldFailNextLookup) {
      throw new Error('Simulated database connection failure');
    }

    const normalized = normalizeHostname(rawHostname);
    if (!normalized) return null;

    const slug = this.domainsToSlug.get(normalized);
    if (!slug) return null;

    const tenant = this.tenantsBySlug.get(slug);
    if (!tenant) return null;

    return {
      ...tenant,
      matchedHostname: normalized,
      resolutionMethod: 'DOMAIN_MAPPING',
    };
  }

  async findBySlug(rawSlug: string): Promise<ResolvedTenant | null> {
    if (this.shouldFailNextLookup) {
      throw new Error('Simulated database connection failure');
    }

    const slug = rawSlug.trim().toLowerCase();
    const tenant = this.tenantsBySlug.get(slug);
    if (!tenant) return null;

    return {
      ...tenant,
      resolutionMethod: 'DEVELOPMENT_OVERRIDE',
    };
  }
}

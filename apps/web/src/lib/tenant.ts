import { headers } from 'next/headers';
import type { ResolvedTenant, PublicAnnouncementDto } from '@school/shared';
import type { NavItem, PublicNavResponse } from './tenantTypes';

export * from './tenantTypes';

/**
 * Extracts normalized request host from incoming server request headers
 */
export async function getRequestHost(): Promise<string> {
  const headersList = await headers();
  return headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000';
}

/**
 * Resolves current tenant profile for the incoming host
 */
export async function fetchCurrentTenant(host?: string): Promise<ResolvedTenant | null> {
  const effectiveHost = host || (await getRequestHost());
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/current`, {
      headers: {
        Host: effectiveHost,
        'x-forwarded-host': effectiveHost,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    return json.success && json.data ? (json.data as ResolvedTenant) : null;
  } catch (err) {
    console.error(`[Tenant Discovery] Resolution failed for host "${effectiveHost}":`, err);
    return null;
  }
}

/**
 * Resolves public navigation menu items for HEADER or FOOTER
 */
export async function fetchPublicNav(host: string, location: 'HEADER' | 'FOOTER'): Promise<NavItem[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/navigation/${location}`, {
      headers: {
        Host: host,
        'x-forwarded-host': host,
      },
      cache: 'no-store',
    });

    if (!res.ok) return [];

    const json: PublicNavResponse = await res.json();
    if (json.success && json.data && Array.isArray(json.data.items)) {
      return json.data.items;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Resolves active public announcements for the institution
 */
export async function fetchAnnouncements(host: string): Promise<PublicAnnouncementDto[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/announcements`, {
      headers: {
        Host: host,
        'x-forwarded-host': host,
      },
      cache: 'no-store',
    });

    if (!res.ok) return [];

    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data as PublicAnnouncementDto[];
    }
    return [];
  } catch {
    return [];
  }
}

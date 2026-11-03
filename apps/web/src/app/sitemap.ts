import type { MetadataRoute } from 'next';
import { getRequestHost, fetchCurrentTenant, fetchSitemapEntries, getCanonicalBaseUrl } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const baseUrl = getCanonicalBaseUrl(tenant, host);
  const entries = await fetchSitemapEntries(host);

  if (!entries || entries.length === 0) {
    const fallbackRoutes = [
      { loc: '/', priority: 1.0, changefreq: 'daily' as const },
      { loc: '/academics', priority: 0.9, changefreq: 'weekly' as const },
      { loc: '/staff', priority: 0.8, changefreq: 'weekly' as const },
      { loc: '/news', priority: 0.8, changefreq: 'daily' as const },
      { loc: '/events', priority: 0.8, changefreq: 'daily' as const },
      { loc: '/admissions', priority: 0.8, changefreq: 'weekly' as const },
      { loc: '/contact', priority: 0.7, changefreq: 'monthly' as const },
    ];

    return fallbackRoutes.map((r) => ({
      url: `${baseUrl}${r.loc === '/' ? '' : r.loc}`,
      lastModified: new Date(),
      changeFrequency: r.changefreq,
      priority: r.priority,
    }));
  }

  return entries.map((entry) => ({
    url: `${baseUrl}${entry.loc === '/' ? '' : entry.loc}`,
    lastModified: entry.lastmod ? new Date(entry.lastmod) : new Date(),
    changeFrequency: entry.changefreq || 'weekly',
    priority: entry.priority !== undefined ? entry.priority : 0.5,
  }));
}


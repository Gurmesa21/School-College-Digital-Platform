import type { MetadataRoute } from 'next';
import { getRequestHost, fetchCurrentTenant, getCanonicalBaseUrl } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const baseUrl = getCanonicalBaseUrl(tenant, host);

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/og'],
      disallow: [
        '/admin',
        '/admin/',
        '/api/',
        '/_next/',
        '/forms/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}


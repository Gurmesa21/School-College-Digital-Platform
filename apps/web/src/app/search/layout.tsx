import React from 'react';
import type { Metadata } from 'next';
import { getRequestHost, fetchCurrentTenant, getCanonicalUrl } from '@/lib/tenant';

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const name = tenant?.name || 'Institutional Platform';
  const canonicalUrl = getCanonicalUrl(tenant, '/search', host);
  const title = `Search Directory & Content | ${name}`;
  const description = `Search programmes, faculty, campus news, events, pages, and official documents across ${name}.`;
  const ogImageUrl = `/api/og?title=${encodeURIComponent('Search Content & Directory')}&subtitle=${encodeURIComponent(name)}&type=search`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


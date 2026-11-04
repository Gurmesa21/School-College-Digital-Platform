import type { Metadata } from 'next';
import './globals.css';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import AnnouncementBanner from '../components/AnnouncementBanner';
import AnalyticsTracker from '../components/AnalyticsTracker';
import {
  getRequestHost,
  fetchCurrentTenant,
  fetchPublicNav,
  fetchAnnouncements,
  getCanonicalBaseUrl,
} from '@/lib/tenant';

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);

  const tenantName = tenant?.name || 'School Platform';
  const baseUrl = getCanonicalBaseUrl(tenant, host);

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: tenantName,
      template: `%s | ${tenantName}`,
    },
    description: `Official digital portal for ${tenantName}. Academic programmes, faculty directory, news, events, and admissions inquiries.`,
    alternates: {
      canonical: baseUrl,
    },
    openGraph: {
      title: tenantName,
      description: `Official digital portal for ${tenantName}. Explore academic programmes, faculty directory, news, events, and admissions.`,
      url: baseUrl,
      siteName: tenantName,
      locale: tenant?.defaultLocale || 'en_US',
      type: 'website',
      images: [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: `${tenantName} Official Portal`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: tenantName,
      description: `Official digital portal for ${tenantName}.`,
      images: ['/opengraph-image'],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const host = await getRequestHost();
  const [tenant, headerNav, footerNav, announcements] = await Promise.all([
    fetchCurrentTenant(host),
    fetchPublicNav(host, 'HEADER'),
    fetchPublicNav(host, 'FOOTER'),
    fetchAnnouncements(host),
  ]);

  return (
    <html lang={tenant?.defaultLocale || 'en'}>
      <body>
        <AnalyticsTracker />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <PublicHeader tenant={tenant} initialNav={headerNav} />
        <AnnouncementBanner initialAnnouncements={announcements} />
        <main id="main-content" className="container app-main-content">
          {children}
        </main>
        <PublicFooter tenant={tenant} initialNav={footerNav} />
      </body>
    </html>
  );
}

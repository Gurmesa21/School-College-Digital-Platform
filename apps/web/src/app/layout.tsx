import type { Metadata } from 'next';
import './globals.css';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import AnnouncementBanner from '../components/AnnouncementBanner';
import {
  getRequestHost,
  fetchCurrentTenant,
  fetchPublicNav,
  fetchAnnouncements,
} from '@/lib/tenant';

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);

  const tenantName = tenant?.name || 'School Platform';
  return {
    title: `${tenantName} | School Platform`,
    description: `Official digital portal for ${tenantName}. Academic programmes, faculty, news, events, and admissions inquiries.`,
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
    <html lang="en">
      <body>
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

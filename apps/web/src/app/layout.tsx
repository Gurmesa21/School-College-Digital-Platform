import type { Metadata } from 'next';
import './globals.css';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import AnnouncementBanner from '../components/AnnouncementBanner';

export const metadata: Metadata = {
  title: 'School Platform — Foundation Baseline',
  description: 'Private School & College Digital Website Platform development baseline',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <PublicHeader />
        <AnnouncementBanner />
        <main id="main-content" className="container app-main-content">
          {children}
        </main>
        <PublicFooter />
      </body>
    </html>
  );
}


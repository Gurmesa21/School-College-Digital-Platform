import type { Metadata } from 'next';
import './globals.css';

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
        <main id="main-content" className="container">
          {children}
        </main>
      </body>
    </html>
  );
}

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getRequestHost, fetchCurrentTenant, getCanonicalUrl } from '@/lib/tenant';

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const name = tenant?.name || 'Oxford International School';
  const canonicalUrl = getCanonicalUrl(tenant, '/terms', host);
  const title = `Terms of Service | ${name}`;
  const description = `Read the terms of service, acceptable use policies, and digital governance framework governing the ${name} platform.`;
  const ogImageUrl = `/api/og?title=${encodeURIComponent('Terms of Service')}&subtitle=${encodeURIComponent(name)}&type=page`;

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

export default async function TermsPage() {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const name = tenant?.name || 'Oxford International School';

  return (
    <main id="main-content" style={{ minHeight: '85vh', padding: '2.5rem 1rem' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: '2rem', fontSize: '0.875rem' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            &larr; Return to Home
          </Link>
          <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Terms of Service</span>
        </nav>

        {/* Page Header */}
        <header style={{ marginBottom: '3rem' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '0.35rem 1rem',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              color: 'var(--accent-primary)',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '1rem',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}
          >
            Institutional Platform Governance
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.2 }}>
            Terms of Service &mdash; {name}
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '800px' }}>
            These Terms of Service govern access to and use of the official website, public portals, admissions systems,
            and administrative digital services provided by {name}.
          </p>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Effective Date: November 2026 &bull; Version 1.2 &bull; Governing Body: Oxford International School Directorate
          </div>
        </header>

        {/* Policy Content Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Section 1: Acceptance */}
          <section
            className="card"
            style={{
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              1. Acceptance of Terms
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1rem' }}>
              By accessing, browsing, or submitting information through the {name} website or any related digital application,
              you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service, along with
              our{' '}
              <Link href="/privacy" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                Privacy Policy
              </Link>
              . If you do not agree with any portion of these terms, you should discontinue use of the platform immediately.
            </p>
          </section>

          {/* Section 2: Acceptable Use */}
          <section
            className="card"
            style={{
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              2. Acceptable Use Policy
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Our platform is intended solely for educational, admissions inquiry, campus community communication, and
              administrative management purposes. Users agree not to:
            </p>
            <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Engage in automated scraping, unauthorized probing, vulnerability scanning, or denial-of-service attempts.</li>
              <li>Submit fraudulent, deceptive, or malicious admissions applications or inquiry records.</li>
              <li>Bypass or attempt to circumvent authentication controls, cryptographic rate limiters, or role-based access barriers.</li>
              <li>Transmit harmful payloads, unsolicited promotional spam, or content that infringes upon third-party rights.</li>
            </ul>
          </section>

          {/* Section 3: Admissions & Form Submissions */}
          <section
            className="card"
            style={{
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              3. Admissions Inquiries &amp; Digital Submissions
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Submitting an admissions application or inquiry form does not constitute a guaranteed offer of admission.
              All admissions decisions remain subject to formal review by our Admissions Directorate, verification of prior
              academic transcripts, entrance evaluations, and space availability.
            </p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              Parents and guardians are responsible for ensuring that all biographical information, contact telephone numbers,
              and academic histories submitted through our online portals are accurate and up to date.
            </p>
          </section>

          {/* Section 4: Intellectual Property */}
          <section
            className="card"
            style={{
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              4. Intellectual Property &amp; Curricular Materials
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1rem' }}>
              All intellectual property, curriculum documentation, syllabi outlines, photography, crests, brand marks, and
              multimedia assets displayed on this site are the exclusive property of {name} or licensed affiliates.
            </p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              Prospectuses and publicly downloadable policy PDFs may be printed or downloaded for personal, non-commercial,
              evaluative family use only. Redistribution or commercial exploitation without prior written consent is strictly prohibited.
            </p>
          </section>

          {/* Section 5: Portal Security & Access */}
          <section
            className="card"
            style={{
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              5. Staff Portal &amp; Credential Governance
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Access to staff, faculty, and administrative portals is restricted to verified institutional account holders.
              Authorized users are responsible for maintaining the confidentiality of their credentials and session tokens.
            </p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              Administrative operations are tracked with immutable cryptographic audit logging to protect student privacy and
              ensure compliance with institutional governance policies.
            </p>
          </section>

          {/* Section 6: Contact & Inquiries */}
          <section
            className="card"
            style={{
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              6. Governance Contact &amp; Questions
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              For questions regarding these Terms of Service or institutional digital policies, please contact the campus office:
            </p>
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.25rem' }}>
                Campus Legal &amp; Institutional Affairs
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {name} &bull; Keble Road, Oxford, OX1 3PG, United Kingdom<br />
                Campus Desk: +44 1865 200100 &bull; Online Inquiry Form:{' '}
                <Link href="/contact" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                  Contact Directory
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}


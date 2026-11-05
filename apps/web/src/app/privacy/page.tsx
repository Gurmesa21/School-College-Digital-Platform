import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getRequestHost, fetchCurrentTenant, getCanonicalUrl } from '@/lib/tenant';

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const name = tenant?.name || 'Oxford International School';
  const canonicalUrl = getCanonicalUrl(tenant, '/privacy', host);
  const title = `Privacy Policy | ${name}`;
  const description = `Learn how ${name} safeguards student, parent, and institutional data with privacy-first digital governance and zero personal tracking.`;
  const ogImageUrl = `/api/og?title=${encodeURIComponent('Privacy Policy')}&subtitle=${encodeURIComponent(name)}&type=page`;

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

export default async function PrivacyPage() {
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
          <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Privacy Policy</span>
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
            Institutional Governance &amp; Data Protection
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.2 }}>
            Privacy Policy &mdash; {name}
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '800px' }}>
            {name} is committed to safeguarding the personal information, digital privacy, and confidentiality of our
            students, parents, guardians, faculty, and website visitors. This policy outlines our standards for collecting,
            processing, storing, and protecting your data.
          </p>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Effective Date: November 2026 &bull; Version 1.2 &bull; Governance Authority: Board of Governors &amp; IT Directorate
          </div>
        </header>

        {/* Policy Content Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Section 1: Core Commitment */}
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
              1. Our Institutional Privacy Commitment
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1rem' }}>
              We treat personal data with the highest degree of diligence. As an international educational institution,
              we adhere to global data protection principles, ensuring that data is gathered strictly for legitimate
              pedagogical, admissions, and institutional purposes, and processed with strict role-based authorization.
            </p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              We do not sell, license, rent, or trade student, parent, or applicant personal data to third parties or
              commercial advertising platforms under any circumstances.
            </p>
          </section>

          {/* Section 2: Privacy Shield & Analytics Minimization */}
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
              2. Privacy Shield &amp; Analytics Data Minimization
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Our digital platform operates under a strict privacy-first architecture:
            </p>
            <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>No Tracking Cookies:</strong> We do not deploy third-party
                ad-tracking pixels, fingerprinting scripts, or cross-site tracking cookies.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>IP Minimization:</strong> Web server visitor logs and telemetry
                are aggregated anonymously. Personal IP addresses are never permanently associated with student records.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Essential Cookies Only:</strong> Cookies used on this site
                are strictly restricted to functional session state and authentication tokens required for authenticated portal access.
              </li>
            </ul>
          </section>

          {/* Section 3: Information Collected */}
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
              3. Information We Collect
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Depending on how you interact with our platform, we collect information across three main categories:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
                  Admissions Inquiries
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Prospective student name, date of birth, grade applying for, parent/guardian contact info, and prior school history.
                </p>
              </div>

              <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
                  General Contact &amp; Visits
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Visitor full name, email address, telephone number, inquiry subject, and message content submitted through our online portal.
                </p>
              </div>

              <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
                  Portal Credentials
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Cryptographically hashed passwords, role assignments, multi-factor tokens, and audit session trails for authorized personnel.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Data Retention & Security */}
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
              4. Data Retention, Security &amp; Encryption
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1rem' }}>
              All data transmitted to and from our platform is encrypted in transit using Transport Layer Security (TLS 1.3).
              Data at rest is secured within isolated PostgreSQL database clusters with cryptographic tenant separation.
            </p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              In accordance with institutional data retention schedules, general web inquiries and analytics logs are
              subject to automated rolling retention windows (typically 90 days), after which telemetry is permanently purged.
              Statutory academic records are archived in compliance with educational governance regulations.
            </p>
          </section>

          {/* Section 5: Rights & Contact */}
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
              5. Rights of Parents, Guardians &amp; Students
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Parents, legal guardians, and adult students have the right to inspect personal information held by {name},
              request correction of inaccurate details, or request deletion of discretionary inquiry records where applicable.
            </p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              To exercise these rights or make a data protection inquiry, please contact our Institutional Administration:
            </p>
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.25rem' }}>
                Office of Information Governance &amp; Student Records
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {name} &bull; Oxford Campus, Kebele Road, Oxford, OX1 3PG<br />
                Telephone: +44 1865 200100 &bull; Online Inquiry Dispatch:{' '}
                <Link href="/contact" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                  Campus Contact Portal
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}


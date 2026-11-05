import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import DynamicPublicForm from '@/components/DynamicPublicForm';
import { getRequestHost, fetchCurrentTenant, getCanonicalUrl } from '@/lib/tenant';

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const name = tenant?.name || 'Institution';
  const canonicalUrl = getCanonicalUrl(tenant, '/contact', host);
  const title = `Contact Us & General Enquiries | ${name}`;
  const description = `Get in touch with ${name}. Reach out to admissions, academic leadership, and administration directly.`;
  const ogImageUrl = `/api/og?title=${encodeURIComponent('Contact Us & Enquiries')}&subtitle=${encodeURIComponent(name)}&type=contact`;

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

export default async function ContactPage() {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const name = tenant?.name || 'Our Institution';
  const tenantSlug = tenant?.slug || 'oxford';

  return (
    <main id="main-content" style={{ minHeight: '85vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: '2rem', fontSize: '0.875rem' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            &larr; Return to Home
          </Link>
          <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Contact & Enquiries</span>
        </nav>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Get in Touch With Us &mdash; {name}
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto' }}>
            Whether you have questions about admissions, our curriculum frameworks, or campus visits, our dedicated team is here to assist you.
          </p>
        </div>

        {/* Contact Info Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem',
          }}
        >
          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📍</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Campus Address</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
              {tenant?.address || `${name}\nBole Sub-City, Kebele 03/05\nAddis Ababa, Ethiopia`}
            </p>
          </div>

          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📞</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Telephone & Enquiries</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              {tenant?.contactPhone ? `Campus Desk: ${tenant.contactPhone}` : 'Main Office: +44 1865 200100'}
              <br />
              Hours: Mon - Fri (8:00 AM - 4:30 PM)
            </p>
          </div>

          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>✉️</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Direct Communications</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              {tenant?.contactEmail && !tenant.contactEmail.includes('.example') ? (
                <>Official: {tenant.contactEmail}<br /></>
              ) : (
                <>Online Inquiry: Direct dispatch via the secure form below<br /></>
              )}
              Response Window: Within 1 Business Day
            </p>
          </div>
        </div>

        {/* Embedded Dynamic Form */}
        <DynamicPublicForm slug="contact-us" tenantSlug={tenantSlug} isEmbedded />
      </div>
    </main>
  );
}

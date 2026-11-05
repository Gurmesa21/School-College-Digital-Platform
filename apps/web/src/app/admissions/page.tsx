import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import DynamicPublicForm from '@/components/DynamicPublicForm';
import { getRequestHost, fetchCurrentTenant, getCanonicalUrl } from '@/lib/tenant';

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const name = tenant?.name || 'Institution';
  const canonicalUrl = getCanonicalUrl(tenant, '/admissions', host);
  const title = `Admissions Inquiries & Campus Consultations | ${name}`;
  const description = `Submit an admissions inquiry or schedule a campus visit at ${name}. Formal admissions and document verification are completed in person on campus.`;
  const ogImageUrl = `/api/og?title=${encodeURIComponent('Admissions Inquiry & Visits')}&subtitle=${encodeURIComponent(name)}&type=admissions`;

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

export default async function AdmissionsPage() {
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
          <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Admissions Inquiry &amp; Visits</span>
        </nav>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '0.35rem 1rem',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--accent-primary, #3b82f6)',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            Prospective Student &amp; Family Inquiries
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Admissions Inquiries &amp; Campus Consultations &mdash; {name}
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: '720px', margin: '0 auto', lineHeight: '1.6' }}>
            Express interest, submit an admissions inquiry, or schedule a campus visit for the upcoming academic year.
            Please note: Submitting an online inquiry initiates your consultation. In accordance with institutional standards,
            the formal admissions process and documentation are completed during an in-person campus visit.
          </p>
        </div>

        {/* Institutional Policy Notice — Physical Visit & Documentation Requirement */}
        <div
          role="note"
          aria-label="Admissions Policy & Physical Visit Requirement"
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '10px',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            marginBottom: '2.5rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: '1.5rem', lineHeight: 1 }} aria-hidden="true">ℹ️</span>
          <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
              Admissions Policy Notice &mdash; In-Person Completion Required
            </strong>
            This online form is for preliminary admissions inquiries, consultation requests, and campus visit scheduling. Submitting this form does <strong>not</strong> constitute formal admission or guarantee enrollment. Prospective students and parents/guardians must physically visit the institution to submit required physical documentation, complete entrance evaluations, and finalize formal registration.
          </div>
        </div>

        {/* 3 Step Process Overview */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3.5rem',
          }}
        >
          <div
            className="card"
            style={{
              padding: '1.75rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
              Step 1
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Submit Online Inquiry</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Express interest for your child, select desired grade level, and request a campus visit or consultation.
            </p>
          </div>

          <div
            className="card"
            style={{
              padding: '1.75rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
              Step 2
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Admissions Review &amp; Consultation</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Our Admissions Directorate reviews your inquiry and contacts you to arrange an in-person campus visit, interview, and tour.
            </p>
          </div>

          <div
            className="card"
            style={{
              padding: '1.75rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
              Step 3
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>On-Campus Registration &amp; Documentation</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Visit our campus admissions office to provide official academic transcripts, complete physical paperwork, and finalize enrollment.
            </p>
          </div>
        </div>

        {/* Embedded Admissions Application Dynamic Form */}
        <DynamicPublicForm slug="admissions-application" tenantSlug={tenantSlug} isEmbedded />
      </div>
    </main>
  );
}

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import DynamicPublicForm from '@/components/DynamicPublicForm';

export const metadata: Metadata = {
  title: 'Admissions & Applications | Oxford International School',
  description:
    'Apply for admission at Oxford International School. Submit your student application for the 2026-2027 academic year.',
};

export default function AdmissionsPage() {
  return (
    <main id="main-content" style={{ minHeight: '85vh', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: '2rem', fontSize: '0.875rem' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            &larr; Return to Home
          </Link>
          <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Admissions & Enrollment</span>
        </nav>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
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
            Academic Year 2026-2027
          </span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>
            Admissions & Student Applications
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', maxWidth: '650px', margin: '0 auto' }}>
            Join our vibrant learning community. Complete the online application below to initiate your family’s admissions journey.
          </p>
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
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg, #ffffff)',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
              Step 1
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Online Application</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Fill in student biographical details, parent contact information, and academic background.
            </p>
          </div>

          <div
            className="card"
            style={{
              padding: '1.75rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg, #ffffff)',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
              Step 2
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Assessment & Review</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Our Admissions Committee reviews student records and schedules an assessment interview.
            </p>
          </div>

          <div
            className="card"
            style={{
              padding: '1.75rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg, #ffffff)',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
              Step 3
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Offer & Enrollment</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Successful candidates receive formal admission offers and onboarding information.
            </p>
          </div>
        </div>

        {/* Embedded Admissions Application Dynamic Form */}
        <DynamicPublicForm slug="admissions-application" tenantSlug="oxford" isEmbedded />
      </div>
    </main>
  );
}

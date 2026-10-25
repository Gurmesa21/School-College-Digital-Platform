import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import DynamicPublicForm from '@/components/DynamicPublicForm';

export const metadata: Metadata = {
  title: 'Contact Us & General Enquiries | Oxford International School',
  description:
    'Get in touch with Oxford International School. Reach out to admissions, academic leadership, and administration directly.',
};

export default function ContactPage() {
  return (
    <main id="main-content" style={{ minHeight: '85vh', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: '2rem', fontSize: '0.875rem' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            &larr; Return to Home
          </Link>
          <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Contact & Enquiries</span>
        </nav>

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>
            Get in Touch With Us
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', maxWidth: '650px', margin: '0 auto' }}>
            Whether you have questions about admissions, our international curriculum, or campus tours, our dedicated team is here to assist you.
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
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg, #ffffff)',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📍</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Campus Address</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Oxford International School<br />
              Bole Sub-City, Kebele 03/05<br />
              Addis Ababa, Ethiopia
            </p>
          </div>

          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg, #ffffff)',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📞</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Telephone & Enquiries</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Main Office: +251 11 661 2345<br />
              Admissions Desk: +251 91 123 4567<br />
              Hours: Mon - Fri (8:00 AM - 4:30 PM)
            </p>
          </div>

          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg, #ffffff)',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>✉️</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Email Communications</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Admissions: admissions@oxford.school.example<br />
              General Enquiries: info@oxford.school.example<br />
              Response Time: 1 Business Day
            </p>
          </div>
        </div>

        {/* Embedded Dynamic Form */}
        <DynamicPublicForm slug="contact-us" tenantSlug="oxford" isEmbedded />
      </div>
    </main>
  );
}

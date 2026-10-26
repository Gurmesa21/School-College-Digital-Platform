import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import type { PublicStaffProfileDto } from '@school/shared';

interface StaffDetailProps {
  params: Promise<{ slug: string }>;
}

async function fetchPublicStaffMember(slug: string, host: string): Promise<PublicStaffProfileDto | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/staff/${slug}`, {
      headers: {
        Host: host,
        'x-tenant-id': 'oxford',
      },
      cache: 'no-store',
    });

    if (res.status === 404 || !res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data.success || !data.data) {
      return null;
    }
    return data.data as PublicStaffProfileDto;
  } catch (err) {
    console.error(`[Public Staff Detail] Failed to fetch "${slug}":`, err);
    return null;
  }
}

export async function generateMetadata({ params }: StaffDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';

  const staff = await fetchPublicStaffMember(slug, host);
  if (!staff) {
    return {
      title: 'Staff Profile Not Found | Faculty Directory',
    };
  }

  return {
    title: staff.seoTitle || `${staff.fullName} - ${staff.roleTitle} | Faculty Directory`,
    description:
      staff.seoDescription ||
      staff.biography?.slice(0, 160) ||
      `Professional profile and public consultation hours for ${staff.fullName}.`,
  };
}

export default async function PublicStaffDetailPage({ params }: StaffDetailProps) {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';

  const staff = await fetchPublicStaffMember(slug, host);
  if (!staff) {
    notFound();
  }

  return (
    <article className="staff-profile-detail" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.75rem', fontSize: '0.875rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Home
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <Link href="/staff" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Faculty & Staff
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{staff.fullName}</span>
      </nav>

      {/* Main Profile Header Card */}
      <header
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '2rem',
          alignItems: 'center',
          padding: '2rem',
          borderRadius: '16px',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Profile Image */}
        {staff.profileMedia?.publicUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={staff.profileMedia.publicUrl}
            alt={staff.profileMedia.altText || `Photograph of ${staff.fullName}`}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid #38bdf8',
              boxShadow: '0 8px 24px rgba(56, 189, 248, 0.25)',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              border: '3px solid rgba(148, 163, 184, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              fontWeight: 700,
              color: '#94a3b8',
              flexShrink: 0,
            }}
          >
            {staff.fullName.charAt(0)}
          </div>
        )}

        <div style={{ flex: 1, minWidth: '260px' }}>
          {staff.department && (
            <div style={{ marginBottom: '0.4rem' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  display: 'inline-block',
                }}
              >
                🏛 {staff.department.name}
              </span>
            </div>
          )}

          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>
            {staff.fullName}
          </h1>

          <p style={{ fontSize: '1.15rem', color: '#94a3b8', margin: '0 0 0.5rem 0', fontWeight: 500 }}>
            {staff.roleTitle}
          </p>

          {staff.qualifications && (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
              🎓 {staff.qualifications}
            </p>
          )}
        </div>
      </header>

      {/* Two-Column Grid: Left Column (Bio & Subjects), Right Column (Contact & Consultation) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Biography & Teaching Expertise */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Biography Section */}
          {staff.biography && (
            <section
              className="card"
              aria-labelledby="bio-heading"
              style={{
                padding: '1.75rem',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h2 id="bio-heading" style={{ fontSize: '1.25rem', color: '#f8fafc', marginBottom: '1rem', fontWeight: 700 }}>
                Biography & Academic Overview
              </h2>
              <div
                style={{
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  fontSize: '1rem',
                  whiteSpace: 'pre-line',
                }}
              >
                {staff.biography}
              </div>
            </section>
          )}

          {/* Subjects & Expertise Section */}
          {staff.subjects && staff.subjects.length > 0 && (
            <section
              className="card"
              aria-labelledby="subjects-heading"
              style={{
                padding: '1.75rem',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h2 id="subjects-heading" style={{ fontSize: '1.25rem', color: '#f8fafc', marginBottom: '1rem', fontWeight: 700 }}>
                Areas of Expertise & Teaching
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {staff.subjects.map((sub, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      background: 'rgba(56, 189, 248, 0.1)',
                      color: '#7dd3fc',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                    }}
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Approved Public Contact & Office Info */}
        <aside
          className="card"
          aria-labelledby="contact-heading"
          style={{
            padding: '1.75rem',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
          }}
        >
          <h2 id="contact-heading" style={{ fontSize: '1.25rem', color: '#f8fafc', marginBottom: '1.25rem', fontWeight: 700 }}>
            Contact & Consultation
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Approved Public Email */}
            {staff.publicEmail ? (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                  Institutional Email
                </div>
                <a
                  href={`mailto:${staff.publicEmail}`}
                  style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem', wordBreak: 'break-all' }}
                >
                  ✉ {staff.publicEmail}
                </a>
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Email address is unlisted. Please contact department administration.
              </div>
            )}

            {/* Approved Public Phone */}
            {staff.publicPhone && (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                  Office Telephone
                </div>
                <a
                  href={`tel:${staff.publicPhone}`}
                  style={{ color: '#10b981', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem' }}
                >
                  📞 {staff.publicPhone}
                </a>
              </div>
            )}

            {/* Office Location */}
            {staff.officeLocation && (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                  Office Location
                </div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  📍 {staff.officeLocation}
                </div>
              </div>
            )}

            {/* Consultation Hours */}
            {staff.consultationHours && (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                  Consultation Hours
                </div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  🕒 {staff.consultationHours}
                </div>
              </div>
            )}

            {/* Website URL */}
            {staff.websiteUrl && (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                  Academic Profile / Website
                </div>
                <a
                  href={staff.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '0.95rem', wordBreak: 'break-all' }}
                >
                  🌐 Visit Academic Profile &rarr;
                </a>
              </div>
            )}
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
            <Link
              href="/staff"
              className="btn btn-secondary"
              style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '0.75rem' }}
            >
              &larr; Back to Faculty Directory
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}

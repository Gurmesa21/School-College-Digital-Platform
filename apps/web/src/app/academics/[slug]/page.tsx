import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import type { PublicProgrammeDto } from '@school/shared';

interface ProgrammeDetailProps {
  params: Promise<{ slug: string }>;
}

async function fetchPublicProgramme(slug: string, host: string): Promise<PublicProgrammeDto | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/academics/programmes/${slug}`, {
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
    return data.data as PublicProgrammeDto;
  } catch (err) {
    console.error(`[Public Programme Detail] Failed to fetch "${slug}":`, err);
    return null;
  }
}

export async function generateMetadata({ params }: ProgrammeDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';

  const programme = await fetchPublicProgramme(slug, host);
  if (!programme) {
    return {
      title: 'Programme Not Found | Academic Catalogue',
    };
  }

  return {
    title: programme.seoTitle || `${programme.title} | Academic Programmes`,
    description: programme.seoDescription || programme.summary || undefined,
  };
}

export default async function PublicProgrammeDetailPage({ params }: ProgrammeDetailProps) {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';

  const prog = await fetchPublicProgramme(slug, host);
  if (!prog) {
    notFound();
  }

  return (
    <article className="academic-programme-detail">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.75rem', fontSize: '0.875rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Home
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <Link href="/academics" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Academic Programmes
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{prog.title}</span>
      </nav>

      {/* Programme Header Section */}
      <header className="hero-section" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
          {prog.level?.name && (
            <span className="badge badge-level">{prog.level.name}</span>
          )}
          {prog.department?.name && (
            <span className="badge badge-secondary">{prog.department.name}</span>
          )}
          {prog.programmeType && (
            <span className="badge badge-info">{prog.programmeType}</span>
          )}
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2, marginBottom: '1rem' }}>
          {prog.title}
        </h1>

        {prog.summary && (
          <p className="hero-subheadline" style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: '840px', marginBottom: '1.75rem' }}>
            {prog.summary}
          </p>
        )}

        {/* Specifications Matrix Card */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginTop: '1.5rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Programme Duration</div>
            <div style={{ fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>{prog.duration || 'Flexible Timeline'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Qualification Awarded</div>
            <div style={{ fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>{prog.qualificationsAwarded || 'Accredited Certification'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Curriculum Framework</div>
            <div style={{ fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>{prog.curriculum || 'Standard Institutional Syllabus'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Department</div>
            <div style={{ fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>{prog.department?.name || 'General Academic Division'}</div>
          </div>
        </div>
      </header>

      {/* Main Content Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2.5rem', alignItems: 'start' }}>
        {/* Left Column: Description & Course Breakdown */}
        <div>
          {/* Detailed Description */}
          {prog.description && (
            <section aria-labelledby="overview-heading" style={{ marginBottom: '2.5rem' }}>
              <h2 id="overview-heading" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                Curriculum Overview & Academic Pathway
              </h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {prog.description}
              </div>
            </section>
          )}

          {/* Curriculum Courses / Subjects Table */}
          {prog.courses && prog.courses.length > 0 && (
            <section aria-labelledby="courses-heading" style={{ marginBottom: '2.5rem' }}>
              <h2 id="courses-heading" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                Included Courses & Core Modules ({prog.courses.length})
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Module Code & Title</th>
                      <th>Requirement</th>
                      <th>Term</th>
                      <th>Credits / Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prog.courses.map((c) => (
                      <tr key={c.courseId}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                            {c.code ? <strong>[{c.code}] </strong> : null}
                            {c.title}
                          </div>
                          {c.summary && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              {c.summary}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${c.isRequired ? 'badge-level' : 'badge-info'}`} style={{ fontSize: '0.72rem' }}>
                            {c.isRequired ? 'Core Requirement' : 'Elective'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {c.term || 'Full Year'}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {c.credits ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Entry Requirements Card */}
          {prog.entryRequirements && (
            <section aria-labelledby="entry-reqs-heading" style={{ marginBottom: '2.5rem' }}>
              <h2 id="entry-reqs-heading" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                Entry Criteria & Admissions Requirements
              </h2>
              <div className="card" style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>
                  {prog.entryRequirements}
                </p>
              </div>
            </section>
          )}
        </div>

        {/* Right Sidebar: Tuition (FR-ACAD-002) & Admissions CTA */}
        <aside aria-label="Admissions and Tuition Information">
          {/* Tuition Card (Rendered only when authorized via displayTuition === true) */}
          {prog.displayTuition && prog.tuitionFee !== null && prog.tuitionFee !== undefined && (
            <div
              className="card tuition-card"
              style={{
                marginBottom: '1.5rem',
                padding: '1.5rem',
                background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-success, #10b981)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Approved Tuition Fee
                </span>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Official Rate</span>
              </div>

              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.25rem' }}>
                {prog.tuitionCurrency || 'USD'} {prog.tuitionFee.toLocaleString()}
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Billing Period: <strong>{prog.tuitionPeriod ? prog.tuitionPeriod.replace('_', ' ') : 'Per Academic Year'}</strong>
              </div>

              {prog.tuitionDescription && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: '0 0 1rem 0' }}>
                  {prog.tuitionDescription}
                </p>
              )}

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
                * Approved institutional rate for the current academic session. Financial aid and payment plans may apply.
              </div>
            </div>
          )}

          {/* Action / Next Steps Card */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Begin Your Application
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Connect with our admissions committee or schedule an academic consultation to review requirements and placement.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link
                href="/admissions"
                className="btn btn-primary"
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                Apply Online &rarr;
              </Link>
              <Link
                href={`/contact?subject=Inquiry regarding ${encodeURIComponent(prog.title)}`}
                className="btn btn-secondary"
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                Inquire with Admissions
              </Link>
            </div>

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Questions? Speak with an academic advisor at <strong>admissions@oxford.edu</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}

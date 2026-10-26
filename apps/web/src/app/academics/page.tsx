import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import type { PublicProgrammeDto, AcademicLevelDto } from '@school/shared';

export const metadata: Metadata = {
  title: 'Academic Programmes & Curriculum | Digital Platform',
  description: 'Explore academic pathways, curriculum frameworks, qualifications, and accredited programmes.',
};

interface AcademicsPageProps {
  searchParams: Promise<{
    level?: string;
    search?: string;
  }>;
}

async function fetchPublicProgrammes(host: string, levelId?: string, search?: string): Promise<PublicProgrammeDto[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const query = new URLSearchParams();
  if (levelId) query.set('levelId', levelId);
  if (search) query.set('search', search);

  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/academics/programmes?${query.toString()}`, {
      headers: {
        Host: host,
        'x-tenant-id': 'oxford',
      },
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.items || []) as PublicProgrammeDto[];
  } catch (err) {
    console.error('[Academics Page] Failed to fetch programmes:', err);
    return [];
  }
}

async function fetchPublicLevels(host: string): Promise<AcademicLevelDto[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/academics/levels`, {
      headers: {
        Host: host,
        'x-tenant-id': 'oxford',
      },
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []) as AcademicLevelDto[];
  } catch (err) {
    console.error('[Academics Page] Failed to fetch levels:', err);
    return [];
  }
}

export default async function PublicAcademicsCataloguePage({ searchParams }: AcademicsPageProps) {
  const params = await searchParams;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';

  const [programmes, levels] = await Promise.all([
    fetchPublicProgrammes(host, params.level, params.search),
    fetchPublicLevels(host),
  ]);

  return (
    <div className="academics-catalogue-container">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          &larr; Return to Home
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Academic Programmes</span>
      </nav>

      {/* Hero Header Section */}
      <header className="hero-section" aria-label="Academic Catalogue Introduction" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <span className="badge badge-level">Accredited Curricula</span>
          <span className="badge badge-info">Holistic Pathways</span>
          <span className="badge badge-active">Certified Faculty</span>
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2, marginBottom: '0.75rem' }}>
          Academic Programmes & Qualifications
        </h1>
        <p className="hero-subheadline" style={{ maxWidth: '780px', color: 'var(--text-secondary)', fontSize: '1.1rem', margin: '0 0 1.5rem 0' }}>
          Explore comprehensive academic frameworks designed to foster intellectual curiosity, practical proficiency, and global qualification readiness.
        </p>

        {/* Quick Stats Pill Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{programmes.length}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Available Programmes</div>
          </div>
          <div className="card" style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>{levels.length}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Academic Stages</div>
          </div>
          <div className="card" style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-success, #10b981)' }}>100%</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verified Certification</div>
          </div>
        </div>
      </header>

      {/* Filter and Discovery Toolbar */}
      <section aria-label="Catalogue Search and Filter" style={{ marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid var(--border-subtle)',
            padding: '1.25rem',
            borderRadius: '12px',
          }}
        >
          {/* Level Filter Chips */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.25rem' }}>
              Level:
            </span>
            <Link
              href="/academics"
              className={`btn btn-sm ${!params.level ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textDecoration: 'none' }}
            >
              All Levels
            </Link>
            {levels.map((lvl) => {
              const isActive = params.level === lvl.id;
              return (
                <Link
                  key={lvl.id}
                  href={`/academics?level=${lvl.id}`}
                  className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ textDecoration: 'none' }}
                >
                  {lvl.name}
                </Link>
              );
            })}
          </div>

          {/* Search Bar */}
          <form method="GET" action="/academics" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {params.level && <input type="hidden" name="level" value={params.level} />}
            <input
              type="text"
              name="search"
              defaultValue={params.search || ''}
              placeholder="Search curriculum, subjects..."
              className="input"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.88rem', minWidth: '220px' }}
              aria-label="Search programmes"
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              Search
            </button>
            {(params.search || params.level) && (
              <Link href="/academics" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                Reset
              </Link>
            )}
          </form>
        </div>
      </section>

      {/* Catalogue Cards Grid */}
      <section aria-label="Available Academic Programmes">
        {programmes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📚</div>
            <h2 style={{ fontSize: '1.35rem', color: '#f8fafc', marginBottom: '0.5rem' }}>
              No Programmes Found
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
              No academic offerings matched your criteria. Try adjusting your level filter or search keywords.
            </p>
            <Link href="/academics" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              View All Programmes
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.75rem',
            }}
          >
            {programmes.map((p) => (
              <article
                key={p.id}
                id={`programme-card-${p.slug}`}
                className="academic-card card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.025)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
              >
                <div>
                  {/* Category and Level Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {p.level?.name && (
                        <span className="badge badge-level" style={{ fontSize: '0.75rem' }}>
                          {p.level.name}
                        </span>
                      )}
                      {p.department?.name && (
                        <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                          {p.department.name}
                        </span>
                      )}
                    </div>
                    {p.isFeatured && (
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                        ★ Featured
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.3 }}>
                    <Link
                      href={`/academics/${p.slug}`}
                      style={{ color: '#f8fafc', textDecoration: 'none' }}
                      className="programme-title-link"
                    >
                      {p.title}
                    </Link>
                  </h2>

                  {/* Duration and Qualifications Specifications */}
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                    {p.duration && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        ⏱ {p.duration}
                      </span>
                    )}
                    {p.qualificationsAwarded && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        🎓 {p.qualificationsAwarded}
                      </span>
                    )}
                  </div>

                  {/* Summary */}
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                    {p.summary || 'Comprehensive academic pathway providing rigor, practical exercises, and standard certification.'}
                  </p>
                </div>

                {/* Footer Section: Approved Tuition (FR-ACAD-002) and CTA */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: 'auto' }}>
                  {p.displayTuition && p.tuitionFee !== null && p.tuitionFee !== undefined ? (
                    <div style={{ marginBottom: '1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '6px', padding: '0.5rem 0.75rem' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Tuition & Academic Fees
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-success, #10b981)' }}>
                        {p.tuitionCurrency || 'USD'} {p.tuitionFee.toLocaleString()}
                        <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
                          / {p.tuitionPeriod ? p.tuitionPeriod.toLowerCase().replace('_', ' ') : 'term'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Tuition details provided upon admissions consultation
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link
                      href={`/academics/${p.slug}`}
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: 'none' }}
                    >
                      Curriculum & Details &rarr;
                    </Link>
                    <Link
                      href="/contact"
                      className="btn btn-secondary btn-sm"
                      style={{ textDecoration: 'none' }}
                    >
                      Inquire
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

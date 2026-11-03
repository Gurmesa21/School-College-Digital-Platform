import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  getRequestHost,
  fetchCurrentTenant,
  formatInstitutionType,
  getCanonicalUrl,
} from '@/lib/tenant';
import type {
  PublicProgrammeDto,
  PublicNewsArticleDto,
  PublicEventItemDto,
  PublicStaffProfileDto,
} from '@school/shared';

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const name = tenant?.name || 'School Platform';
  const canonicalUrl = getCanonicalUrl(tenant, '/', host);
  const institutionTypeLabel = formatInstitutionType(tenant?.institutionType);
  const ogImageUrl = `/api/og?title=${encodeURIComponent(name)}&subtitle=${encodeURIComponent(institutionTypeLabel)}&type=portal`;

  return {
    title: `${name} | School Platform — Private School & College Digital Website Platform`,
    description: `Official digital homepage for ${name}. Explore our academic pathways, faculty directory, campus news, and admissions.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: name,
      description: `Official digital homepage for ${name}. Explore our academic pathways, faculty directory, campus news, and admissions.`,
      url: canonicalUrl,
      siteName: name,
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${name} Homepage`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: name,
      description: `Official digital homepage for ${name}. Explore our academic pathways, faculty directory, campus news, and admissions.`,
      images: [ogImageUrl],
    },
  };
}

async function fetchHomeContent(host: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const headers = { Host: host, 'x-forwarded-host': host };

  try {
    const [programmesRes, newsRes, eventsRes, staffRes] = await Promise.all([
      fetch(`${apiUrl}/api/v1/tenant/public/academics/programmes?limit=3`, {
        headers,
        cache: 'no-store',
      }),
      fetch(`${apiUrl}/api/v1/tenant/public/news?limit=3`, {
        headers,
        cache: 'no-store',
      }),
      fetch(`${apiUrl}/api/v1/tenant/public/events?timeframe=upcoming&limit=3`, {
        headers,
        cache: 'no-store',
      }),
      fetch(`${apiUrl}/api/v1/tenant/public/staff?limit=4`, {
        headers,
        cache: 'no-store',
      }),
    ]);

    const programmes: PublicProgrammeDto[] = programmesRes.ok
      ? (await programmesRes.json()).data?.items || []
      : [];
    const news: PublicNewsArticleDto[] = newsRes.ok
      ? (await newsRes.json()).data?.items || []
      : [];
    const events: PublicEventItemDto[] = eventsRes.ok
      ? (await eventsRes.json()).data?.items || []
      : [];
    const staff: PublicStaffProfileDto[] = staffRes.ok
      ? (await staffRes.json()).data?.items || []
      : [];

    return { programmes, news, events, staff };
  } catch (err) {
    console.error('[Home Content] Error fetching home items:', err);
    return { programmes: [], news: [], events: [], staff: [] };
  }
}

export default async function HomePage() {
  const host = await getRequestHost();
  const tenant = await fetchCurrentTenant(host);
  const { programmes, news, events, staff } = await fetchHomeContent(host);

  const institutionName = tenant?.name || 'Oxford International School';
  const institutionTypeLabel = formatInstitutionType(tenant?.institutionType);
  const crestIcon =
    tenant?.institutionType === 'KINDERGARTEN'
      ? '🎨'
      : tenant?.institutionType === 'TVET_TRAINING_CENTRE'
        ? '⚙️'
        : '🏛️';

  return (
    <div className="institutional-homepage-container" style={{ padding: '1rem 0 3rem 0' }}>
      {/* 1. Institutional Hero Section */}
      <section
        className="hero-section"
        aria-label="Institutional Welcome"
        style={{
          marginBottom: '3rem',
          padding: '3rem 2rem',
          background: 'radial-gradient(ellipse at top, rgba(37, 99, 235, 0.12) 0%, rgba(15, 23, 42, 0) 70%)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <span className="badge badge-active">{institutionTypeLabel}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Timezone: {tenant?.timezone || 'UTC'} &bull; Locale: {tenant?.defaultLocale || 'en'}
          </span>
        </div>

        <h1
          style={{
            fontSize: '2.75rem',
            fontWeight: 800,
            color: '#f8fafc',
            lineHeight: 1.15,
            marginBottom: '1rem',
            letterSpacing: '-0.02em',
          }}
        >
          {crestIcon} {institutionName}
          <span
            style={{
              display: 'block',
              fontSize: '1.25rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
              marginTop: '0.5rem',
            }}
          >
            Private School &amp; College Digital Website Platform
          </span>
        </h1>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '1.2rem',
            maxWidth: '820px',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}
        >
          Welcome to {institutionName}. Dedicated to academic rigor, experiential discovery, holistic learner well-being, and accredited educational pathways.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/academics" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Explore Academic Programmes &rarr;
          </Link>
          <Link href="/admissions" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            Admissions & Applications
          </Link>
          <Link href="/contact" className="btn btn-outline" style={{ textDecoration: 'none' }}>
            Contact Campus Office
          </Link>
          <Link href="/search" className="btn btn-outline" style={{ textDecoration: 'none' }}>
            🔍 Search Directory
          </Link>
        </div>
      </section>

      {/* 2. Rapid Directory Navigation Grid */}
      <section aria-label="Institutional Quick Directory" style={{ marginBottom: '3.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          <Link
            href="/academics"
            className="card"
            style={{ textDecoration: 'none', padding: '1.25rem', transition: 'transform 0.2s, border-color 0.2s' }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📚</div>
            <strong style={{ display: 'block', color: '#f8fafc', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
              Academics
            </strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Degrees, levels & curricula
            </span>
          </Link>

          <Link
            href="/staff"
            className="card"
            style={{ textDecoration: 'none', padding: '1.25rem', transition: 'transform 0.2s, border-color 0.2s' }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>👥</div>
            <strong style={{ display: 'block', color: '#f8fafc', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
              Faculty & Staff
            </strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Leadership & educators
            </span>
          </Link>

          <Link
            href="/news"
            className="card"
            style={{ textDecoration: 'none', padding: '1.25rem', transition: 'transform 0.2s, border-color 0.2s' }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📰</div>
            <strong style={{ display: 'block', color: '#f8fafc', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
              News & Notices
            </strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Stories & advisories
            </span>
          </Link>

          <Link
            href="/events"
            className="card"
            style={{ textDecoration: 'none', padding: '1.25rem', transition: 'transform 0.2s, border-color 0.2s' }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📅</div>
            <strong style={{ display: 'block', color: '#f8fafc', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
              Events Calendar
            </strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Assemblies & open days
            </span>
          </Link>

          <Link
            href="/admissions"
            className="card"
            style={{ textDecoration: 'none', padding: '1.25rem', transition: 'transform 0.2s, border-color 0.2s' }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📝</div>
            <strong style={{ display: 'block', color: '#f8fafc', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
              Admissions
            </strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Inquiry & applications
            </span>
          </Link>

          <Link
            href="/contact"
            className="card"
            style={{ textDecoration: 'none', padding: '1.25rem', transition: 'transform 0.2s, border-color 0.2s' }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>✉️</div>
            <strong style={{ display: 'block', color: '#f8fafc', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
              Contact
            </strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Campus inquiries & desk
            </span>
          </Link>
        </div>
      </section>

      {/* 3. Academic Programme Highlights */}
      <section aria-labelledby="programmes-heading" style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 id="programmes-heading" style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
              Featured Academic Programmes
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Accredited pathways and curriculum stages offered at {institutionName}.
            </p>
          </div>
          <Link href="/academics" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
            View All Academic Catalog &rarr;
          </Link>
        </div>

        {programmes.length > 0 ? (
          <div className="grid">
            {programmes.map((prog) => (
              <article key={prog.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {prog.level && <span className="badge badge-level">{prog.level.name}</span>}
                    {prog.department && <span className="badge badge-secondary">{prog.department.name}</span>}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
                    {prog.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                    {prog.summary || 'Explore comprehensive curriculum requirements and qualification criteria.'}
                  </p>
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    ⏱️ {prog.duration || 'Full-time'}
                  </span>
                  <Link
                    href={`/academics/${prog.slug}`}
                    className="btn btn-sm btn-outline"
                    style={{ textDecoration: 'none' }}
                  >
                    Programme Details &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: '1rem' }}>No academic programmes are currently published for this institution.</p>
            <Link href="/contact" className="btn btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
              Contact Registrar Office
            </Link>
          </div>
        )}
      </section>

      {/* 4. Latest News & Announcements Highlights */}
      <section aria-labelledby="news-heading" style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 id="news-heading" style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
              Campus News & Discoveries
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Recent achievements, academic breakthroughs, and stories from our campus.
            </p>
          </div>
          <Link href="/news" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
            Read All News & Notices &rarr;
          </Link>
        </div>

        {news.length > 0 ? (
          <div className="grid">
            {news.map((item) => (
              <article key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                    </span>
                    {item.tags?.slice(0, 2).map((t) => (
                      <span key={t} className="badge badge-info" style={{ fontSize: '0.7rem' }}>#{t}</span>
                    ))}
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
                    {item.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                    {item.summary || (item.body ? `${item.body.slice(0, 120)}...` : 'Read full article details.')}
                  </p>
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <Link href={`/news/${item.slug}`} className="btn btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                    Read Story &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem', color: 'var(--text-muted)' }}>
            <p>No recent news articles published at this time.</p>
          </div>
        )}
      </section>

      {/* 5. Upcoming Campus Events */}
      <section aria-labelledby="events-heading" style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 id="events-heading" style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
              Upcoming Campus Events
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Academic milestones, athletics championships, and institutional open days.
            </p>
          </div>
          <Link href="/events" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
            Full Events Calendar &rarr;
          </Link>
        </div>

        {events.length > 0 ? (
          <div className="grid">
            {events.map((evt) => (
              <article key={evt.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="badge badge-role">{evt.category || 'EVENT'}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {new Date(evt.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
                    {evt.title}
                  </h3>
                  {evt.location && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      📍 {evt.location}
                    </p>
                  )}
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                    {evt.description?.slice(0, 120)}...
                  </p>
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <Link href={`/events/${evt.slug}`} className="btn btn-sm btn-outline" style={{ textDecoration: 'none' }}>
                    Event Details & iCal &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem', color: 'var(--text-muted)' }}>
            <p>No upcoming campus events scheduled at this time.</p>
          </div>
        )}
      </section>

      {/* 6. Faculty Highlights */}
      {staff.length > 0 && (
        <section aria-labelledby="staff-heading" style={{ marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 id="staff-heading" style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
                Faculty & Academic Leadership
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Meet distinguished educators and division leaders at {institutionName}.
              </p>
            </div>
            <Link href="/staff" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
              View Complete Staff Directory &rarr;
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {staff.map((person) => (
              <div key={person.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1rem',
                    }}
                  >
                    {person.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                      {person.fullName}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {person.roleTitle}
                    </span>
                  </div>
                </div>
                {person.department && (
                  <span className="badge badge-secondary" style={{ fontSize: '0.75rem', marginBottom: '0.75rem', display: 'inline-block' }}>
                    {person.department.name}
                  </span>
                )}
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                  {person.biography ? `${person.biography.slice(0, 90)}...` : 'Faculty scholar and academic mentor.'}
                </p>
                <Link href={`/staff/${person.slug}`} style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
                  View Profile &rarr;
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Institutional Admissions Banner */}
      <section
        style={{
          marginBottom: '3.5rem',
          padding: '2.5rem 2rem',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.75rem' }}>
          Begin Your Educational Journey With {institutionName}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '650px', margin: '0 auto 1.75rem auto' }}>
          Applications and family admissions inquiries are open. Discover academic pathways tailored to your student's future.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/admissions" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Submit Admissions Inquiry &rarr;
          </Link>
          <Link href="/contact" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            Speak With Admissions Office
          </Link>
        </div>
      </section>

      {/* 8. Platform Baseline & Environment Status (Preserves existing smoke test checks) */}
      <section className="card" aria-labelledby="status-heading" style={{ marginBottom: '2.5rem' }}>
        <h2 id="status-heading" style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>
          Environment & System Status
        </h2>
        <div className="grid">
          <div>
            <strong>Frontend App:</strong>
            <p style={{ color: 'var(--text-secondary)' }}>Next.js 16 (App Router) on port <code>3000</code></p>
          </div>
          <div>
            <strong>REST API Backend:</strong>
            <p style={{ color: 'var(--text-secondary)' }}>
              Node.js / Express on port <code>4000</code>
            </p>
          </div>
          <div>
            <strong>Database Schema:</strong>
            <p style={{ color: 'var(--text-secondary)' }}>PostgreSQL & Prisma ORM (<code>packages/db</code>)</p>
          </div>
          <div>
            <strong>Accessibility Target:</strong>
            <p style={{ color: 'var(--text-secondary)' }}>WCAG 2.2 AA compliant tokens & semantics</p>
          </div>
        </div>
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Institution Domain: <code>{host}</code> ({tenant ? `Resolved: ${tenant.slug}` : 'Default resolution'})
          </span>
          <Link href="/admin" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            Open Institutional Admin Console &rarr;
          </Link>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <p>Private School & College Digital Website Platform — Controlled 20-Day Implementation Plan</p>
      </footer>
    </div>
  );
}

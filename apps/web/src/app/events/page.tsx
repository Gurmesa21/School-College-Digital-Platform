import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import type { PublicEventItemDto } from '@school/shared';

export const metadata: Metadata = {
  title: 'Events Calendar | Institutional Digital Platform',
  description: 'Upcoming academic milestones, campus tours, athletic championships, guest lectures, and institutional assemblies.',
};

interface EventsPageProps {
  searchParams: Promise<{
    timeframe?: 'upcoming' | 'past' | 'all';
    category?: string;
    search?: string;
  }>;
}

async function fetchEvents(
  host: string,
  timeframe?: string,
  category?: string,
  search?: string
): Promise<PublicEventItemDto[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const query = new URLSearchParams();
  if (timeframe) query.set('timeframe', timeframe);
  if (category) query.set('category', category);
  if (search) query.set('search', search);
  query.set('limit', '50');

  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/events?${query.toString()}`, {
      headers: {
        Host: host,
        'x-tenant-id': 'oxford',
      },
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const json = await res.json();
    return (json.data?.items || []) as PublicEventItemDto[];
  } catch {
    return [];
  }
}

const CATEGORIES = ['ALL', 'ADMISSIONS', 'ACADEMIC', 'SPORTS', 'COMMUNITY', 'COMMENCEMENT'];

export default async function PublicEventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';

  const currentTimeframe = params.timeframe || 'upcoming';
  const events = await fetchEvents(host, currentTimeframe, params.category, params.search);

  return (
    <div className="events-page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          &larr; Return to Home
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Events Calendar</span>
      </nav>

      {/* Header Section */}
      <header style={{ marginBottom: '2.5rem' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            color: 'var(--accent-primary, #3b82f6)',
            marginBottom: '0.75rem',
          }}
        >
          Campus Calendar & Institutional Assemblies
        </span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.75rem' }}>
          Events & Academic Milestones
        </h1>
        <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '1.1rem', maxWidth: '750px' }}>
          Explore forthcoming open days, athletic tournaments, symposia, and historical school ceremonies with explicit timezone accuracy.
        </p>
      </header>

      {/* Timeframe & Category Navigation */}
      <section
        aria-label="Filter events"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '1.25rem',
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Timeframe Tab Switcher */}
          <div style={{ display: 'inline-flex', padding: '0.25rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
            <Link
              href={`/events?timeframe=upcoming${params.category ? `&category=${params.category}` : ''}`}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                backgroundColor: currentTimeframe === 'upcoming' ? 'var(--accent-primary, #3b82f6)' : 'transparent',
                color: '#ffffff',
              }}
            >
              Upcoming Events
            </Link>
            <Link
              href={`/events?timeframe=past${params.category ? `&category=${params.category}` : ''}`}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                backgroundColor: currentTimeframe === 'past' ? 'var(--accent-primary, #3b82f6)' : 'transparent',
                color: '#ffffff',
              }}
            >
              Past Events Archive
            </Link>
          </div>

          {/* Search Box */}
          <form method="GET" style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="hidden" name="timeframe" value={currentTimeframe} />
            {params.category && <input type="hidden" name="category" value={params.category} />}
            <input
              type="search"
              name="search"
              placeholder="Search events..."
              defaultValue={params.search || ''}
              className="input"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              Search
            </button>
          </form>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Category:</span>
          {CATEGORIES.map((cat) => {
            const isCatActive = (!params.category && cat === 'ALL') || params.category === cat;
            const href = cat === 'ALL'
              ? `/events?timeframe=${currentTimeframe}`
              : `/events?timeframe=${currentTimeframe}&category=${cat}`;

            return (
              <Link
                key={cat}
                href={href}
                style={{
                  padding: '0.2rem 0.65rem',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  backgroundColor: isCatActive ? 'var(--accent-primary, #3b82f6)' : 'rgba(255,255,255,0.06)',
                  color: isCatActive ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {cat}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Events Listing */}
      {events.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>📅</span>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
            No Events Scheduled
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
            {currentTimeframe === 'upcoming'
              ? 'There are no upcoming events currently listed under this category. Check the past archive or check back soon.'
              : 'There are no past events matching your filter.'}
          </p>
          <Link href={`/events?timeframe=${currentTimeframe === 'upcoming' ? 'past' : 'upcoming'}`} className="btn btn-secondary btn-sm">
            {currentTimeframe === 'upcoming' ? 'View Past Events Archive' : 'View Upcoming Events'}
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {events.map((event) => {
            const startDate = new Date(event.startsAt);
            const endDate = new Date(event.endsAt);

            const dayNum = startDate.getUTCDate();
            const monthStr = startDate.toLocaleDateString('en-GB', { month: 'short', timeZone: event.timezone }).toUpperCase();
            const yearNum = startDate.getUTCFullYear();

            const startTimeFormatted = startDate.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: event.timezone,
            });
            const endTimeFormatted = endDate.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: event.timezone,
            });

            const isMultiDay = startDate.getUTCDate() !== endDate.getUTCDate() || startDate.getUTCMonth() !== endDate.getUTCMonth();

            return (
              <article
                key={event.id}
                className="card event-card"
                style={{
                  display: 'flex',
                  gap: '1.5rem',
                  padding: '1.25rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                {/* Date Badge */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '80px',
                    height: '80px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary, #3b82f6)' }}>
                    {monthStr}
                  </span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
                    {dayNum}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {yearNum}
                  </span>
                </div>

                {/* Event Information */}
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {event.category}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary, #3b82f6)', fontWeight: 600 }}>
                      🕒 {startTimeFormatted} - {endTimeFormatted} ({event.timezone})
                    </span>
                    {isMultiDay && (
                      <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 600 }}>
                        Multi-day Event
                      </span>
                    )}
                  </div>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    <Link href={`/events/${event.slug}`} style={{ color: '#f8fafc', textDecoration: 'none' }}>
                      {event.title}
                    </Link>
                  </h2>

                  {event.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.4, margin: '0 0 0.5rem 0' }}>
                      {event.description.slice(0, 140)}...
                    </p>
                  )}

                  {event.location && (
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      📍 <span>{event.location}</span>
                    </div>
                  )}
                </div>

                {/* Actions & Registration Badge */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', flexShrink: 0 }}>
                  {event.isRegistrationOpen && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      Registration Open
                    </span>
                  )}
                  <Link href={`/events/${event.slug}`} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                    View Details &rarr;
                  </Link>
                  <a
                    href={`/api/v1/tenant/public/events/${event.slug}/ics`}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', textDecoration: 'none' }}
                    download={`${event.slug}.ics`}
                  >
                    📥 Add to Calendar (.ics)
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

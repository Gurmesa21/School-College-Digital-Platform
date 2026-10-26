import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import type { PublicEventItemDto } from '@school/shared';

interface EventDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function fetchEvent(host: string, slug: string): Promise<PublicEventItemDto | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/events/${slug}`, {
      headers: {
        Host: host,
        'x-tenant-id': 'oxford',
      },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as PublicEventItemDto) || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const event = await fetchEvent(host, slug);

  if (!event) {
    return {
      title: 'Event Not Found | Calendar',
    };
  }

  return {
    title: `${event.title} | Events Calendar`,
    description: event.description?.slice(0, 160) || 'Official institutional event details and registration.',
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';

  const event = await fetchEvent(host, slug);

  if (!event) {
    notFound();
  }

  const startDate = new Date(event.startsAt);
  const endDate = new Date(event.endsAt);

  const formattedDate = startDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: event.timezone,
  });

  const startTimeStr = startDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: event.timezone,
  });
  const endTimeStr = endDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: event.timezone,
  });

  const isMultiDay = startDate.getUTCDate() !== endDate.getUTCDate() || startDate.getUTCMonth() !== endDate.getUTCMonth();
  const endDateStr = isMultiDay
    ? endDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: event.timezone,
      })
    : null;

  return (
    <div className="event-detail-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '2rem', fontSize: '0.875rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Home
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <Link href="/events" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          Events Calendar
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
          {event.title}
        </span>
      </nav>

      {/* Main Event Article */}
      <article>
        <header style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--accent-primary, #3b82f6)',
              }}
            >
              {event.category}
            </span>
            {event.isRegistrationOpen && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                }}
              >
                Registration Open
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.25, marginBottom: '1.25rem' }}>
            {event.title}
          </h1>

          {/* Time & Venue Overview Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              padding: '1.25rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                📅 DATE & TIME
              </span>
              <strong style={{ fontSize: '1rem', color: '#f8fafc', display: 'block' }}>
                {formattedDate}
              </strong>
              {isMultiDay && endDateStr && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Through {endDateStr}
                </span>
              )}
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary, #3b82f6)' }}>
                {startTimeStr} - {endTimeStr} ({event.timezone})
              </span>
            </div>

            {event.location && (
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  📍 VENUE / LOCATION
                </span>
                <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>
                  {event.location}
                </strong>
              </div>
            )}
          </div>
        </header>

        {/* Cover Media */}
        {event.coverMedia && (
          <figure style={{ margin: '0 0 2.5rem 0' }}>
            <div style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: '#1e293b' }}>
              <img
                src={event.coverMedia.publicUrl}
                alt={event.coverMedia.altText || event.title}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
            {event.coverMedia.caption && (
              <figcaption style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                {event.coverMedia.caption}
              </figcaption>
            )}
          </figure>
        )}

        {/* Description Section */}
        <section aria-labelledby="about-event" style={{ marginBottom: '2.5rem' }}>
          <h2 id="about-event" style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
            About This Event
          </h2>
          <div style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#cbd5e1' }}>
            {event.description?.split('\n\n').map((paragraph, idx) => (
              <p key={idx} style={{ marginBottom: '1.25rem' }}>
                {paragraph}
              </p>
            )) || <p>No detailed description provided for this event.</p>}
          </div>
        </section>

        {/* Contact and Registration Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {/* Contact Card */}
          {(event.contactName || event.contactEmail || event.contactPhone) && (
            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'rgba(30, 41, 59, 0.4)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.75rem' }}>
                Event Inquiries & Coordination
              </h3>
              {event.contactName && (
                <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Coordinator: <strong>{event.contactName}</strong>
                </p>
              )}
              {event.contactEmail && (
                <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Email:{' '}
                  <a href={`mailto:${event.contactEmail}`} style={{ color: 'var(--accent-primary)' }}>
                    {event.contactEmail}
                  </a>
                </p>
              )}
              {event.contactPhone && (
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Phone: <strong>{event.contactPhone}</strong>
                </p>
              )}
            </div>
          )}

          {/* Registration Card */}
          <div className="card" style={{ padding: '1.25rem', backgroundColor: 'rgba(30, 41, 59, 0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>
                Participation & Attendance
              </h3>
              {event.capacity && (
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Capacity: <strong>{event.capacity} Attendees</strong>
                </p>
              )}
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {event.isRegistrationOpen
                  ? 'Registration is currently open for prospective attendees and community members.'
                  : 'Pre-registration is not required or has closed for this event.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {event.isRegistrationOpen && event.registrationUrl && (
                <Link href={event.registrationUrl} className="btn btn-primary btn-sm" style={{ textAlign: 'center', textDecoration: 'none' }}>
                  Register for Event Online &rarr;
                </Link>
              )}
              <a
                href={`/api/v1/tenant/public/events/${event.slug}/ics`}
                className="btn btn-secondary btn-sm"
                style={{ textAlign: 'center', textDecoration: 'none' }}
                download={`${event.slug}.ics`}
              >
                📅 Download iCalendar (.ics)
              </a>
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <footer style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between' }}>
          <Link href="/events" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            &larr; Back to Events Calendar
          </Link>
        </footer>
      </article>
    </div>
  );
}

import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import type { PublicStaffProfileDto, AcademicDepartmentDto } from '@school/shared';

export const metadata: Metadata = {
  title: 'Faculty & Staff Directory | Institution Platform',
  description: 'Meet our dedicated educators, department leadership, faculty researchers, and academic mentors.',
};

interface StaffDirectoryPageProps {
  searchParams: Promise<{
    department?: string;
    role?: string;
    subject?: string;
    search?: string;
  }>;
}

async function fetchPublicStaff(
  host: string,
  departmentId?: string,
  role?: string,
  subject?: string,
  search?: string
): Promise<PublicStaffProfileDto[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const query = new URLSearchParams();
  if (departmentId) query.set('departmentId', departmentId);
  if (role) query.set('roleTitle', role);
  if (subject) query.set('subject', subject);
  if (search) query.set('search', search);
  query.set('limit', '100');

  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/staff?${query.toString()}`, {
      headers: {
        Host: host,
        'x-tenant-id': 'oxford',
      },
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.items || []) as PublicStaffProfileDto[];
  } catch (err) {
    console.error('[Public Staff Directory] Failed to fetch staff:', err);
    return [];
  }
}

async function fetchPublicDepartments(host: string): Promise<AcademicDepartmentDto[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/api/v1/tenant/public/academics/departments`, {
      headers: {
        Host: host,
        'x-tenant-id': 'oxford',
      },
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []) as AcademicDepartmentDto[];
  } catch (err) {
    console.error('[Public Staff Directory] Failed to fetch departments:', err);
    return [];
  }
}

export default async function PublicStaffDirectoryPage({ searchParams }: StaffDirectoryPageProps) {
  const params = await searchParams;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';

  const [staffList, departments] = await Promise.all([
    fetchPublicStaff(host, params.department, params.role, params.subject, params.search),
    fetchPublicDepartments(host),
  ]);

  const hasActiveFilters = Boolean(params.department || params.role || params.subject || params.search);

  return (
    <div className="staff-directory-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          &larr; Return to Home
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Faculty & Staff Directory</span>
      </nav>

      {/* Hero / Header Section */}
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-block', marginBottom: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: 'rgba(56, 189, 248, 0.1)',
              color: '#38bdf8',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid rgba(56, 189, 248, 0.2)',
            }}
          >
            Academic Directory
          </span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.75rem', letterSpacing: '-0.025em' }}>
          Faculty & Professional Staff
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '750px', lineHeight: 1.6, margin: 0 }}>
          Meet our dedicated educators, academic department heads, vocational instructors, and research specialists committed to student success.
        </p>
      </header>

      {/* Search & Filter Controls */}
      <section aria-labelledby="filter-heading" style={{ marginBottom: '2.5rem' }}>
        <h2 id="filter-heading" className="sr-only" style={{ display: 'none' }}>
          Search and Filter Staff
        </h2>
        <form
          method="GET"
          action="/staff"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            alignItems: 'flex-end',
          }}
        >
          {/* Keyword Search */}
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="staff-search-input" className="form-label" style={{ fontSize: '0.8rem' }}>
              Search by Keyword
            </label>
            <input
              id="staff-search-input"
              name="search"
              type="text"
              defaultValue={params.search || ''}
              placeholder="Name, role, subject..."
              className="input"
            />
          </div>

          {/* Department Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="staff-dept-filter" className="form-label" style={{ fontSize: '0.8rem' }}>
              Filter by Department
            </label>
            <select
              id="staff-dept-filter"
              name="department"
              defaultValue={params.department || ''}
              className="input"
            >
              <option value="">All Academic Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.code ? `(${d.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="staff-subject-filter" className="form-label" style={{ fontSize: '0.8rem' }}>
              Filter by Subject / Expertise
            </label>
            <input
              id="staff-subject-filter"
              name="subject"
              type="text"
              defaultValue={params.subject || ''}
              placeholder="e.g. Physics, Math..."
              className="input"
            />
          </div>

          {/* Filter Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              id="staff-filter-submit-btn"
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, padding: '0.65rem 1rem' }}
            >
              Filter Directory
            </button>
            {hasActiveFilters && (
              <Link
                href="/staff"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.65rem 1rem',
                  textDecoration: 'none',
                }}
              >
                Clear
              </Link>
            )}
          </div>
        </form>
      </section>

      {/* Results Count & Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        <span>
          Showing <strong style={{ color: '#f8fafc' }}>{staffList.length}</strong> staff member{staffList.length === 1 ? '' : 's'}
        </span>
        {hasActiveFilters && (
          <span style={{ fontSize: '0.85rem', color: '#38bdf8' }}>Filtered results</span>
        )}
      </div>

      {/* Staff Grid or Empty State */}
      {staffList.length === 0 ? (
        /* Accessible Empty State */
        <div
          id="public-staff-empty-state"
          style={{
            textAlign: 'center',
            padding: '4rem 1.5rem',
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px dashed var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.8 }}>👥</div>
          <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', marginBottom: '0.5rem' }}>
            No staff profiles found
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto 1.5rem auto', lineHeight: 1.6, fontSize: '0.95rem' }}>
            {hasActiveFilters
              ? 'We could not find any faculty members matching your current filter selections. Try broadening your search or resetting filters.'
              : 'Our faculty and educator directory is currently being updated for the upcoming academic cycle. Please check back soon.'}
          </p>
          {hasActiveFilters && (
            <Link href="/staff" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              View All Faculty & Staff
            </Link>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {staffList.map((staff) => (
            <article
              key={staff.id}
              className="card staff-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.5rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                position: 'relative',
              }}
            >
              <div>
                {/* Photo & Identity Header */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                  {staff.profileMedia?.publicUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={staff.profileMedia.publicUrl}
                      alt={staff.profileMedia.altText || `Photograph of ${staff.fullName}`}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid rgba(56, 189, 248, 0.4)',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                        border: '2px solid rgba(148, 163, 184, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: '#94a3b8',
                        flexShrink: 0,
                      }}
                    >
                      {staff.fullName.charAt(0)}
                    </div>
                  )}

                  <div style={{ overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.25rem 0', lineHeight: 1.3 }}>
                      <Link
                        href={`/staff/${staff.slug}`}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {staff.fullName}
                      </Link>
                    </h3>
                    <p style={{ margin: 0, color: '#38bdf8', fontSize: '0.85rem', fontWeight: 500 }}>
                      {staff.roleTitle}
                    </p>
                  </div>
                </div>

                {/* Department Badge */}
                {staff.department && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-secondary)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      🏛 {staff.department.name}
                    </span>
                  </div>
                )}

                {/* Biography snippet */}
                {staff.biography && (
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {staff.biography}
                  </p>
                )}

                {/* Subject Badges */}
                {staff.subjects && staff.subjects.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
                    {staff.subjects.slice(0, 4).map((sub, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '0.75rem',
                          background: 'rgba(56, 189, 248, 0.1)',
                          color: '#7dd3fc',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        {sub}
                      </span>
                    ))}
                    {staff.subjects.length > 4 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        +{staff.subjects.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer: Approved Public Contacts & Detail Link */}
              <div
                style={{
                  marginTop: '1rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {/* Approved Public Contact Icons */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {staff.publicEmail && (
                    <a
                      href={`mailto:${staff.publicEmail}`}
                      title={`Send email to ${staff.fullName}`}
                      aria-label={`Send email to ${staff.fullName}`}
                      style={{
                        color: '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.1)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                      }}
                    >
                      ✉
                    </a>
                  )}
                  {staff.publicPhone && (
                    <a
                      href={`tel:${staff.publicPhone}`}
                      title={`Call office phone: ${staff.publicPhone}`}
                      aria-label={`Call office phone: ${staff.publicPhone}`}
                      style={{
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.1)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                      }}
                    >
                      📞
                    </a>
                  )}
                  {staff.websiteUrl && (
                    <a
                      href={staff.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Personal / Academic Website"
                      aria-label={`${staff.fullName}'s Website`}
                      style={{
                        color: '#a78bfa',
                        background: 'rgba(167, 139, 250, 0.1)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                      }}
                    >
                      🌐
                    </a>
                  )}
                </div>

                {/* View Profile Link */}
                <Link
                  href={`/staff/${staff.slug}`}
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#38bdf8',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  View Profile &rarr;
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PublicAnnouncementDto } from '@school/shared';

interface AnnouncementBannerProps {
  initialAnnouncements?: PublicAnnouncementDto[];
}

export default function AnnouncementBanner({ initialAnnouncements }: AnnouncementBannerProps) {
  const [announcements, setAnnouncements] = useState<PublicAnnouncementDto[]>(
    initialAnnouncements || []
  );
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(!initialAnnouncements);

  useEffect(() => {
    if (initialAnnouncements) {
      setAnnouncements(initialAnnouncements);
      setLoading(false);
      return;
    }

    async function fetchAnnouncements() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
        const res = await fetch(`${apiUrl}/api/v1/tenant/public/announcements`, {
          headers: {
            Host: host,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setAnnouncements(json.data);
          }
        }
      } catch {
        // Fall back gracefully
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();
  }, [initialAnnouncements]);

  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.id)
  );

  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  return (
    <aside
      aria-label="Institutional Announcements and Advisories"
      className="announcement-banner-container"
      style={{
        width: '100%',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '0.5rem 1rem',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {visibleAnnouncements.map((item) => {
          const isEmergency = item.priority === 'EMERGENCY' || item.priority === 'HIGH';
          return (
            <div
              key={item.id}
              role="status"
              className={`announcement-item ${isEmergency ? 'emergency-notice' : 'normal-notice'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '0.6rem 1rem',
                borderRadius: '6px',
                backgroundColor: isEmergency ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                borderLeft: isEmergency ? '4px solid #ef4444' : '4px solid #3b82f6',
                color: '#f8fafc',
                fontSize: '0.9rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: isEmergency ? '#dc2626' : '#2563eb',
                    color: '#ffffff',
                  }}
                >
                  {isEmergency ? '⚠️ Urgent Notice' : 'Notice'}
                </span>
                <span style={{ fontWeight: 600 }}>{item.title}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {item.content.length > 140 ? `${item.content.slice(0, 140)}...` : item.content}
                </span>
                <Link
                  href={`/news#announcement-${item.id}`}
                  style={{
                    color: isEmergency ? '#fca5a5' : '#93c5fd',
                    fontSize: '0.85rem',
                    textDecoration: 'underline',
                    fontWeight: 500,
                  }}
                >
                  Read details &rarr;
                </Link>
              </div>

              {!isEmergency && (
                <button
                  type="button"
                  onClick={() => handleDismiss(item.id)}
                  aria-label={`Dismiss announcement: ${item.title}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    lineHeight: 1,
                    padding: '0.25rem',
                  }}
                >
                  &times;
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PublicAnnouncementDto } from '@school/shared';
import { truncateWords } from '@/lib/formatters';

interface AnnouncementBannerProps {
  initialAnnouncements?: PublicAnnouncementDto[];
}

export default function AnnouncementBanner({ initialAnnouncements }: AnnouncementBannerProps) {
  const [announcements, setAnnouncements] = useState<PublicAnnouncementDto[]>(
    initialAnnouncements || []
  );
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [collapsedUrgent, setCollapsedUrgent] = useState<Record<string, boolean>>({});
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

  const toggleUrgentCollapse = (id: string) => {
    setCollapsedUrgent((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside
      aria-label="Institutional Announcements and Advisories"
      className="announcement-banner-container"
      style={{
        width: '100%',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0.4rem 1rem',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
        }}
      >
        {visibleAnnouncements.map((item) => {
          const isEmergency = item.priority === 'EMERGENCY' || item.priority === 'HIGH';
          const isCollapsed = Boolean(collapsedUrgent[item.id]);

          return (
            <div
              key={item.id}
              role="status"
              className={`announcement-item ${isEmergency ? 'emergency-notice' : 'normal-notice'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                backgroundColor: isEmergency ? 'rgba(239, 68, 68, 0.14)' : 'rgba(59, 130, 246, 0.1)',
                borderLeft: isEmergency ? '4px solid #ef4444' : '4px solid #3b82f6',
                color: '#f8fafc',
                fontSize: '0.875rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  flex: 1,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    backgroundColor: isEmergency ? '#dc2626' : '#2563eb',
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isEmergency ? '⚠️ Urgent Notice' : 'Notice'}
                </span>

                <span style={{ fontWeight: 600, color: '#f8fafc' }}>{item.title}</span>

                {!isCollapsed && (
                  <span style={{ color: '#e2e8f0', fontSize: '0.84rem' }}>
                    {truncateWords(item.content, 95)}
                  </span>
                )}

                <Link
                  href={`/news#announcement-${item.id}`}
                  aria-label={`Read details for announcement: ${item.title}`}
                  style={{
                    color: isEmergency ? '#fca5a5' : '#93c5fd',
                    fontSize: '0.84rem',
                    textDecoration: 'underline',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Read details &rarr;
                </Link>
              </div>

              {isEmergency ? (
                <button
                  type="button"
                  onClick={() => toggleUrgentCollapse(item.id)}
                  aria-expanded={!isCollapsed}
                  aria-label={
                    isCollapsed
                      ? `Expand urgent announcement: ${item.title}`
                      : `Minimize urgent announcement: ${item.title}`
                  }
                  title={isCollapsed ? 'Expand notice details' : 'Minimize notice'}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    color: '#fca5a5',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.45rem',
                    minHeight: '32px',
                    minWidth: '32px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isCollapsed ? '+ Details' : '− Minimize'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDismiss(item.id)}
                  aria-label={`Dismiss announcement: ${item.title}`}
                  title="Dismiss this notice"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    lineHeight: 1,
                    minHeight: '32px',
                    minWidth: '32px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
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

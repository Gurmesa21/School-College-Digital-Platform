'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PublicAnnouncementDto } from '@school/shared';
import { truncateWords } from '@/lib/formatters';

const DISMISS_STORAGE_KEY = 'school_dismissed_announcements';

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

  // Load persisted dismissed IDs on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setDismissedIds(parsed);
        }
      }
    } catch {
      // LocalStorage access may fail in private mode or SSR
    }
  }, []);

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
    setDismissedIds((prev) => {
      const updated = prev.includes(id) ? prev : [...prev, id];
      try {
        localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
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
                  <span className="announcement-body-text">
                    {truncateWords(item.content, 45)}
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
                  className="announcement-btn"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '6px',
                    color: '#fca5a5',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    padding: '0.35rem 0.65rem',
                    minHeight: '44px',
                    minWidth: '44px',
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
                  className="announcement-btn"
                  style={{
                    background: 'transparent',
                    border: '1px solid transparent',
                    borderRadius: '6px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1.4rem',
                    lineHeight: 1,
                    minHeight: '44px',
                    minWidth: '44px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

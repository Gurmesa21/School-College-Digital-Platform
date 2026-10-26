'use client';

import React, { useEffect, useState } from 'react';

interface PublicAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY';
  audience: 'GENERAL' | 'STUDENTS' | 'PARENTS' | 'STAFF';
  isPinned: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/v1/tenant/public/announcements?tenant=oxford`);
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
  }, []);

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
                <strong style={{ fontWeight: 600 }}>{item.title}</strong>
                <span style={{ color: 'rgba(248, 250, 252, 0.85)' }}>{item.content}</span>
                {item.audience && item.audience !== 'GENERAL' && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      color: '#cbd5e1',
                    }}
                  >
                    Audience: {item.audience}
                  </span>
                )}
              </div>

              {!isEmergency && (
                <button
                  type="button"
                  onClick={() => handleDismiss(item.id)}
                  aria-label={`Dismiss announcement: ${item.title}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '0.2rem 0.4rem',
                    lineHeight: 1,
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

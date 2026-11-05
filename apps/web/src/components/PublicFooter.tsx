'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ResolvedTenant } from '@school/shared';
import { NavItem } from '@/lib/tenantTypes';

interface PublicFooterProps {
  tenant?: ResolvedTenant | null;
  initialNav?: NavItem[];
}

const DEFAULT_FOOTER_ITEMS: NavItem[] = [
  { id: 'f-1', label: 'Academic Programmes', url: '/academics', orderIndex: 0 },
  { id: 'f-2', label: 'Faculty & Staff', url: '/staff', orderIndex: 1 },
  { id: 'f-3', label: 'News & Announcements', url: '/news', orderIndex: 2 },
  { id: 'f-4', label: 'Events Calendar', url: '/events', orderIndex: 3 },
  { id: 'f-5', label: 'Admissions & Inquiries', url: '/admissions', orderIndex: 4 },
  { id: 'f-6', label: 'Contact Directory', url: '/contact', orderIndex: 5 },
  { id: 'f-7', label: 'Search Portal', url: '/search', orderIndex: 6 },
];

export default function PublicFooter({ tenant, initialNav }: PublicFooterProps) {
  const [footerItems, setFooterItems] = useState<NavItem[]>(
    initialNav && initialNav.length > 0 ? initialNav : DEFAULT_FOOTER_ITEMS
  );

  useEffect(() => {
    if (initialNav && initialNav.length > 0) {
      setFooterItems(initialNav);
      return;
    }

    const fetchFooterNav = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/v1/tenant/public/navigation/FOOTER`, {
          headers: {
            Host: typeof window !== 'undefined' ? window.location.host : 'localhost:3000',
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && Array.isArray(json.data.items) && json.data.items.length > 0) {
            setFooterItems(json.data.items);
          }
        }
      } catch {
        // Fall back to DEFAULT_FOOTER_ITEMS
      }
    };

    fetchFooterNav();
  }, [initialNav]);

  const brandName = tenant?.name || 'School Platform';
  const crestIcon =
    tenant?.institutionType === 'KINDERGARTEN'
      ? '🎨'
      : tenant?.institutionType === 'TVET_TRAINING_CENTRE'
      ? '⚙️'
      : '🏛️';

  return (
    <footer role="contentinfo" className="public-footer-container">
      <div className="public-footer-inner container">
        <div className="public-footer-top">
          <div className="public-footer-brand">
            <div className="footer-crest-brand">
              <span className="footer-crest" aria-hidden="true">{crestIcon}</span>
              <span className="footer-title">{brandName}</span>
            </div>
            <p className="footer-tagline">
              Dedicated to academic excellence, innovative research, and student community empowerment.
            </p>
            {tenant?.address && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', whiteSpace: 'pre-line' }}>
                📍 {tenant.address}
              </p>
            )}
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {tenant?.contactPhone && <span>📞 {tenant.contactPhone}</span>}
              {tenant?.contactEmail && !tenant.contactEmail.endsWith('.example') ? (
                <span>✉️ {tenant.contactEmail}</span>
              ) : (
                <Link href="/contact" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>
                  ✉️ Admissions & Campus Inquiries
                </Link>
              )}
            </div>
          </div>

          <div className="public-footer-links-col">
            <h4 className="footer-links-title">Institutional Navigation</h4>
            <ul className="footer-links-list">
              {footerItems
                .filter((item) => !item.url.startsWith('/admin'))
                .map((item) => (
                  <li key={item.id}>
                    <Link href={item.url} target={item.target || '_self'} className="footer-nav-link">
                      {item.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          <div className="public-footer-links-col">
            <h4 className="footer-links-title">Governance &amp; Policies</h4>
            <ul className="footer-links-list">
              <li>
                <Link href="/privacy" className="footer-nav-link">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="footer-nav-link">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/admissions" className="footer-nav-link">
                  Admissions Guidelines
                </Link>
              </li>
              <li>
                <Link href="/contact" className="footer-nav-link">
                  Campus Directory
                </Link>
              </li>
            </ul>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: '1.45' }}>
              Dedicated to academic excellence, student pastoral care, and global leadership.
            </p>
          </div>
        </div>

        <div className="public-footer-bottom">
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
          <p className="footer-powered">
            Accredited International Education &bull; Holistic Student Development
          </p>
        </div>
      </div>
    </footer>
  );
}

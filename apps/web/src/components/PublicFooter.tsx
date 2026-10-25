'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface NavItem {
  id: string;
  label: string;
  url: string;
  target?: '_self' | '_blank';
  orderIndex: number;
}

interface PublicNavResponse {
  success: boolean;
  data?: {
    location: string;
    title: string;
    items: NavItem[];
  };
}

const DEFAULT_FOOTER_ITEMS: NavItem[] = [
  { id: 'f-1', label: 'Privacy Policy', url: '/privacy', orderIndex: 0 },
  { id: 'f-2', label: 'Terms of Service', url: '/terms', orderIndex: 1 },
  { id: 'f-3', label: 'Accessibility Statement', url: '/accessibility', orderIndex: 2 },
  { id: 'f-4', label: 'Contact Directory', url: '/contact', orderIndex: 3 },
];

export default function PublicFooter() {
  const [footerItems, setFooterItems] = useState<NavItem[]>(DEFAULT_FOOTER_ITEMS);

  useEffect(() => {
    const fetchFooterNav = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/v1/tenant/public/navigation/FOOTER`, {
          headers: {
            'x-tenant-id': 'oxford',
          },
        });
        if (res.ok) {
          const json: PublicNavResponse = await res.json();
          if (json.success && json.data && Array.isArray(json.data.items) && json.data.items.length > 0) {
            setFooterItems(json.data.items);
          }
        }
      } catch {
        // Fall back to DEFAULT_FOOTER_ITEMS
      }
    };

    fetchFooterNav();
  }, []);

  return (
    <footer role="contentinfo" className="public-footer-container">
      <div className="public-footer-inner container">
        <div className="public-footer-top">
          <div className="public-footer-brand">
            <div className="footer-crest-brand">
              <span className="footer-crest" aria-hidden="true">🏛️</span>
              <span className="footer-title">Oxford Institution</span>
            </div>
            <p className="footer-tagline">
              Dedicated to academic excellence, innovative research, and student community empowerment.
            </p>
          </div>

          <div className="public-footer-links-col">
            <h4 className="footer-links-title">Institutional Navigation</h4>
            <ul className="footer-links-list">
              {footerItems.map((item) => (
                <li key={item.id}>
                  <Link href={item.url} target={item.target || '_self'} className="footer-nav-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="public-footer-links-col">
            <h4 className="footer-links-title">Compliance & Security</h4>
            <p className="footer-compliance-text">
              WCAG 2.2 Level AA accessibility certified. Multi-tenant cryptographic isolation with strict role-based access control.
            </p>
            <div className="footer-badges">
              <span className="badge badge-active">WCAG 2.2 AA</span>
              <span className="badge badge-role">BR-001 ISOLATED</span>
            </div>
          </div>
        </div>

        <div className="public-footer-bottom">
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} Oxford Educational Institution. All rights reserved.
          </p>
          <p className="footer-powered">
            School & College Digital Platform &bull; Day 6 Architecture
          </p>
        </div>
      </div>
    </footer>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Privacy-Aware Client Analytics Tracker (FR-ANL-001, NFR-PRIV-001)
 * Records lightweight, anonymous page views without personal cookies, IP logging, or fingerprinting.
 * Non-blocking: Uses navigator.sendBeacon with graceful fetch fallback.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    // Exclude administrative, API, and Next.js internal routes
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname.startsWith('/_next')) {
      return;
    }

    // Prevent duplicate firing for the exact same path in React Strict Mode
    if (lastTrackedPath.current === pathname) {
      return;
    }
    lastTrackedPath.current = pathname;

    const payload = JSON.stringify({
      eventType: 'PAGE_VIEW',
      path: pathname,
      referrerDomain: typeof document !== 'undefined' && document.referrer ? document.referrer : null,
    });

    const endpoint = '/api/v1/tenant/public/analytics/event';

    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
      } else if (typeof fetch !== 'undefined') {
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // Non-blocking: Fail silently to ensure public browsing is never interrupted
        });
      }
    } catch {
      // Non-blocking
    }
  }, [pathname]);

  return null;
}


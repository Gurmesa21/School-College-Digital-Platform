import { Request, Response, NextFunction, RequestHandler } from 'express';
import { EnvConfig, config as defaultEnvConfig } from '../config/env.js';

/**
 * Day 18: Security Headers Middleware (NFR-SEC-001, OWASP ASVS)
 * Sets hardened HTTP response headers for all API requests.
 */
export function createSecurityHeaders(envConfig: EnvConfig = defaultEnvConfig): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Prevent browsers from MIME-sniffing the response
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent API endpoints from being embedded in frames / iframes
    res.setHeader('X-Frame-Options', 'DENY');

    // Modern browsers disable legacy vulnerable XSS auditor
    res.setHeader('X-XSS-Protection', '0');

    // Protect path privacy when navigating cross-origin
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Strict Content Security Policy for API responses: no execution, no framing
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");

    // Restrict Flash / PDF cross-domain policies
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Strict-Transport-Security in production or when connection is secure
    if (envConfig.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Remove fingerprinting header
    res.removeHeader('X-Powered-By');

    next();
  };
}


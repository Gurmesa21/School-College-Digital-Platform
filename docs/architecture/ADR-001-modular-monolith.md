# ADR-001: Modular Monolith Architecture (SRS Baseline Alignment)

## Status
Accepted (Approved Project Architecture)

## Context
The Private School & College Digital Website Platform is a configurable, multi-tenant digital experience platform serving kindergartens, primary/secondary schools, private colleges, and TVET institutions. The authoritative requirements baseline is defined in the Software Requirements Specification (SRS) Version 1.0, prepared on 19 October 2026.

Section 17.1 of the SRS explicitly recommends:
1. A multi-tenant modular monolith architecture with clear internal domain boundaries rather than microservices.
2. A server-rendering-capable public frontend (React with Next.js or equivalent).
3. A Node.js backend using an Express.js REST API with versioned endpoints (`/api/v1`) and domain-driven module boundaries.
4. PostgreSQL with Prisma ORM for relational data integrity, migrations, and tenant isolation.

## Decision
The platform adopts an npm-workspaces monorepo structure comprising:
- `apps/web`: Next.js App Router application providing server-side rendered (SSR) public institutional portals and protected administrative interfaces.
- `apps/api`: Node.js/Express.js service hosting the core REST API (`/api/v1`), centralizing business rules, server-side authorization, and tenant context resolution.
- `packages/db`: Dedicated database package encapsulating Prisma schema, migrations, and database client instantiation.
- `packages/shared`: Shared TypeScript types, Zod validation schemas, and common utility functions shared across frontend and backend.

## Consequences
- **Positive:**
  - Strict separation of concerns between presentation and business logic.
  - Public pages leverage Next.js SSR for optimal SEO and Core Web Vitals (LCP $\le$ 2.5s).
  - Business rules, validation, and multi-tenant security reside exclusively on the server, preventing client tampering.
  - Shared TypeScript types eliminate contract drift across network boundaries.
  - Single repository simplifies dependency management, cross-package refactoring, and local orchestration.
- **Negative / Operational Considerations:**
  - Requires orchestrating two development runtimes (`web` on port 3000, `api` on port 4000).
  - Cross-origin resource sharing (CORS) must be explicitly configured and maintained.

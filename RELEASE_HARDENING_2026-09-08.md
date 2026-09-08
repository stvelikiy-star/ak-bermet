# AK BERMET release hardening — 2026-09-08

Scope: release-quality hardening only. No booking, payment, pricing, room inventory, Supabase schema, or integration authority changes.

## Changes

- Remove the stale permanent `Демо-режим` badge from the authenticated manager header.
- Add conservative baseline security headers in Next.js:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Remove the obsolete `images.unsplash.com` runtime image allowlist; current public imagery is local/verified.
- Update the image README so it no longer documents the old demo/Unsplash workflow.
- Strengthen the standalone production HTTP smoke to verify:
  - security headers;
  - RU/KG/EN/KZ `html lang` behavior through `ak_locale`;
  - production availability fails closed when Supabase authority is unavailable;
  - production AI fails closed to human handoff when real calls are unavailable;
  - no silent fallback to mock AI.

## Explicitly deferred

- HSTS: enable only after final production domain/HTTPS and rollback are confirmed.
- CSP: requires a deliberate nonce/hash strategy because the root layout currently contains an inline bootstrap script.

## Acceptance

This branch is acceptable only after the full Production Readiness workflow passes, including production build, standalone HTTP smoke, generated-file hygiene, and Docker image build.

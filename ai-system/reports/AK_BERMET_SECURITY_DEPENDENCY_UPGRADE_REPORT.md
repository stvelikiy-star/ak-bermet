# AK BERMET Security Dependency Upgrade — Report

## 1. Starting Dependency Versions

Direct dependencies (`package.json`):

| Package | Before |
|---|---|
| `next` | 14.2.35 |
| `react` | ^18.3.1 |
| `react-dom` | ^18.3.1 |
| `googleapis` | ^140.0.1 |
| `openai` | ^4.67.3 |
| `eslint-config-next` | ^14.2.35 |
| `eslint` | ^8.57.0 |
| `postcss` | ^8.4.39 |
| `tailwindcss` | ^3.4.6 |
| `typescript` | ^5.5.3 |

Baseline `npm audit`: **9 vulnerabilities (4 high, 5 moderate)** — vulnerable `next` (multiple CVEs incl. DoS, cache poisoning, XSS), `glob` (command injection, via `eslint-config-next`), `postcss` (XSS, bundled inside `next`), `uuid`/`gaxios`/`googleapis-common` (buffer bounds check, via `googleapis`).

## 2. Final Dependency Versions

| Package | After | Change type |
|---|---|---|
| `next` | 15.5.20 | major (14 → 15) |
| `react` | ^18.3.1 (unchanged) | none — Next 15 supports React `^18.2.0`, so no major bump was required |
| `react-dom` | ^18.3.1 (unchanged) | none |
| `googleapis` | ^173.0.0 | major (140 → 173) |
| `eslint-config-next` | ^15.5.20 | major, kept in lockstep with `next` |
| `postcss` | ^8.4.39 → resolves to 8.5.15, applied everywhere via `overrides` | patch, forced onto `next`'s internally pinned copy |
| `eslint`, `openai`, `tailwindcss`, `typescript`, `@types/*` | unchanged | not implicated in the audit |

`next` and `eslint-config-next` were intentionally jumped to the **15.x** line rather than the suggested `npm audit fix --force` target of **16.2.10**, because 15.5.20 already resolves every flagged `next`/`glob` vulnerability while avoiding an unnecessary second major jump (Next 16 also raises the minimum Node engine to `>=20.9.0` and drops React 18 support in some tooling paths — none of that was needed here). This is the minimum safe supported version per the task's instructions.

`postcss` is not a direct vulnerability of our own dependency graph — `next@15.5.20` still pins an internal, unrelated copy at `postcss@8.4.31` (unfixed even in `next@16.2.10`). Since our own `postcss` devDependency (`^8.4.39`) already resolves higher, a `package.json` `"overrides": { "postcss": "$postcss" }` entry was added so npm forces `next`'s nested copy to the same resolved version as our root `postcss` instead of installing a second, vulnerable copy. This is a standard, non-forced npm mechanism (not `npm audit fix --force`), and resolves the remaining moderate vulnerability cleanly.

`googleapis` required a major bump (140 → 173) because the vulnerable `uuid`/`gaxios`/`googleapis-common` chain has no fix within the 140.x line. The public API surface used in this project (`google.auth.JWT`, `google.sheets({version:"v4", auth})`, `spreadsheets.values.get/append/batchUpdate`) is unchanged across this range.

## 3. Files Changed

- `package.json` — dependency version bumps + `overrides.postcss`
- `package-lock.json` — regenerated (`npm install` → `npm ci` verified)
- `next.config.mjs` — `experimental.serverComponentsExternalPackages` → top-level `serverExternalPackages` (renamed in Next 15)
- `tsconfig.json` — added `target: "ES2017"`, auto-suggested by Next 15's tooling for top-level `await` support
- `src/lib/manager-session.ts` — `isManagerAuthenticated()` made `async`; `cookies()` is now asynchronous in Next 15 (`await cookies()`)
- `src/app/api/manager/session/route.ts` — `await cookies()`
- `src/app/api/manager/leads/route.ts` — `await isManagerAuthenticated()`
- `src/app/api/manager/status/route.ts` — `await isManagerAuthenticated()`
- `src/app/api/manager/leads/[id]/route.ts` — `await isManagerAuthenticated()`; route `params` is now `Promise<{ id: string }>` in Next 15, awaited before use
- `src/app/rooms/[slug]/page.tsx` — `params` is now `Promise<{ slug: string }>` in Next 15 for both `generateMetadata` and the page component; both made `async` and `await params`
- `src/components/sections/HeroSection.tsx`, `src/components/sections/RoomsSection.tsx` — internal `<a href="/rooms">` navigation replaced with `next/link`'s `<Link>` to satisfy the `@next/next/no-html-link-for-pages` lint rule enforced by `eslint-config-next@15`; external WhatsApp links (`target="_blank"`) were left as plain `<a>` tags, unchanged

No files under `src/lib/google-sheets.ts`, `src/data/*`, business-rule data files, or pricing/room-content files were touched.

## 4. Compatibility Changes

- **Next.js App Router**: dynamic route `params` (and, by extension, `searchParams`) are asynchronous as of Next 15. Only the two dynamic segments in this project (`rooms/[slug]`, `api/manager/leads/[id]`) were affected and have been updated.
- **`next/headers` `cookies()`**: asynchronous as of Next 15. Two call sites updated (`manager-session.ts`, `api/manager/session/route.ts`); all callers of the now-`async` `isManagerAuthenticated()` were updated to `await` it. **Auth behavior itself (PIN verification, session hashing, cookie name/duration) was not modified** — only the async plumbing required by the Next 15 API change.
- **`next.config.mjs`**: `experimental.serverComponentsExternalPackages` renamed to `serverExternalPackages` (stable in Next 15); same two packages (`googleapis`, `openai`) still excluded from the server bundle.
- **Middleware**: `src/middleware.ts` uses no APIs affected by the upgrade; unchanged and confirmed working (manager route protection still compiles into the `ƒ Middleware` build entry).
- **ESLint**: `eslint-config-next@15` enforces `@next/next/no-html-link-for-pages` on internal same-origin hrefs more consistently; fixed by swapping two internal anchors for `next/link`. No visual, styling, or behavioral change — `Link` renders the same underlying `<a>` with client-side navigation.
- **googleapis**: no code changes required; `google.auth.JWT` and the Sheets v4 API surface used by `src/lib/google-sheets.ts` are unchanged across 140 → 173.

## 5. Audit Results

**Before:**
```
9 vulnerabilities (5 moderate, 4 high)
- @next/eslint-plugin-next / eslint-config-next — high (glob command injection)
- glob — high (command injection via -c/--cmd)
- next — high (multiple CVEs: DoS, cache poisoning, XSS, SSRF, HTTP smuggling)
- postcss — moderate (XSS via unescaped </style>)
- gaxios / googleapis-common / googleapis / uuid — moderate (buffer bounds check)
```

**After:**
```
found 0 vulnerabilities
```

`npm audit --audit-level=high` exits 0 with no findings at any severity.

## 6. Lint Result

`npm run lint` → **PASS** (`✔ No ESLint warnings or errors`, after fixing the two `no-html-link-for-pages` violations surfaced by `eslint-config-next@15`'s rule set). `next lint` itself prints a deprecation notice (removed in Next 16) — informational only, not a failure.

## 7. TypeScript Result

`npx tsc --noEmit` → **PASS**, exit code 0, no errors.

## 8. Build Result

`npm run build` → **PASS**. Production build compiles successfully; all 41 routes generated (static, SSG for `/rooms/[slug]` × 7 slugs via `generateStaticParams`, and dynamic API/manager routes), middleware bundled (34.4 kB). No build warnings related to deprecated APIs or migration issues.

## 9. Remaining Vulnerabilities

None. `npm audit` reports 0 vulnerabilities at all severities (critical/high/moderate/low) after the upgrade.

## 10. Google Sheets CRM Preservation Confirmation

- `src/lib/google-sheets.ts` (auth, lead append/read, status/comment updates, occupancy/rooms reads, lead history) — **unmodified**, present, and unchanged in `git diff`.
- `src/app/api/leads/route.ts` (public lead intake) — **unmodified**.
- `src/app/api/manager/leads/route.ts`, `src/app/api/manager/leads/[id]/route.ts` (manager lead list + status/comment update) — only the required `async`/`await` plumbing for Next 15's `cookies()`/`params` changes was applied; the Google Sheets calls and business logic are untouched.
- Manager authentication (`src/lib/manager-auth.ts`: PIN verification, session hashing, cookie config) — **unmodified**; only its Next-15-mandated async call sites changed.
- WhatsApp links (`WA.*` hrefs) — untouched, still plain `<a target="_blank">`.
- AI chat routes (`src/app/api/chat/*`) — untouched.
- Responsive design / Tailwind config / business data (`src/data/*`) — untouched.

## 11. Git Branch and Commit

- Branch: `fix/security-dependency-upgrade`
- Commit message: `fix: upgrade vulnerable dependencies`
- Commit hash: see Completion Output below (created after this report was written)
- No merge into `develop` or `main` was performed.

## 12. Final Recommendation

**PASS**

All acceptance criteria met: dependency installation succeeds (`npm ci`), lint passes, TypeScript passes, production build passes, `npm audit --audit-level=high` reports zero vulnerabilities at any severity, the Google Sheets CRM integration remains fully present and functionally unchanged, no secrets were touched or exposed, and no unrelated project behavior (business rules, pricing, room data, design) was changed.

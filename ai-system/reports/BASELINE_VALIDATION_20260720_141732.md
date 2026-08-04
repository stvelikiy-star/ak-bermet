# AK BERMET Baseline Validation

- Date: 2026-07-20T14:17:33+06:00
- Branch: develop
- Node.js: v24.18.0
- npm: 11.16.0
## npm ci
```text
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
npm warn deprecated @humanwhocodes/config-array@0.11.14: Use @eslint/config-array instead
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated uuid@9.0.1: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
npm warn deprecated glob@10.3.10: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated eslint@8.57.0: This version is no longer supported. Please see https://eslint.org/version-support for other options.

added 436 packages, and audited 437 packages in 44s

163 packages are looking for funding
  run `npm fund` for details

9 vulnerabilities (5 moderate, 4 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
npm warn allow-scripts 1 package has install scripts not yet covered by allowScripts:
npm warn allow-scripts   unrs-resolver@1.12.2 (postinstall: node postinstall.js)
npm warn allow-scripts
npm warn allow-scripts Run `npm approve-scripts --allow-scripts-pending` to review, or `npm approve-scripts <pkg>` to allow.
Exit code: 0
Duration: 44 seconds
```
## Lint
```text

> ak-bermet@1.0.0 lint
> next lint

Attention: Next.js now collects completely anonymous telemetry regarding usage.
This information is used to shape Next.js' roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
https://nextjs.org/telemetry

✔ No ESLint warnings or errors
Exit code: 0
Duration: 6 seconds
```
## TypeScript
```text
Exit code: 0
Duration: 15 seconds
```
## Production build
```text

> ak-bermet@1.0.0 build
> next build

  ▲ Next.js 14.2.35

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/41) ...
   Generating static pages (10/41) 
   Generating static pages (20/41) 
   Generating static pages (30/41) 
 ✓ Generating static pages (41/41)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    3.74 kB        99.7 kB
├ ○ /_not-found                          873 B          88.1 kB
├ ƒ /api/availability                    0 B                0 B
├ ƒ /api/chat                            0 B                0 B
├ ○ /api/chat/status                     0 B                0 B
├ ƒ /api/leads                           0 B                0 B
├ ƒ /api/manager/leads                   0 B                0 B
├ ƒ /api/manager/leads/[id]              0 B                0 B
├ ƒ /api/manager/login                   0 B                0 B
├ ƒ /api/manager/logout                  0 B                0 B
├ ƒ /api/manager/session                 0 B                0 B
├ ƒ /api/manager/status                  0 B                0 B
├ ○ /contacts                            3.54 kB         103 kB
├ ○ /events                              4.21 kB         104 kB
├ ○ /faq                                 2.08 kB        89.3 kB
├ ○ /food                                138 B          87.4 kB
├ ○ /garden                              603 B           105 kB
├ ○ /hot-springs                         141 B           103 kB
├ ○ /icon.svg                            0 B                0 B
├ ○ /legal/privacy                       182 B          96.1 kB
├ ○ /legal/public-offer                  182 B          96.1 kB
├ ○ /legal/refund                        183 B          96.1 kB
├ ○ /legal/terms                         182 B          96.1 kB
├ ○ /manager                             139 B          98.9 kB
├ ○ /manager/availability                139 B          98.9 kB
├ ○ /manager/leads                       5.79 kB         105 kB
├ ○ /manager/login                       2.87 kB        90.1 kB
├ ○ /manager/payments                    139 B          98.9 kB
├ ○ /manager/reports                     138 B          98.9 kB
├ ○ /manager/rooms                       138 B          98.9 kB
├ ○ /manager/settings                    139 B          98.9 kB
├ ○ /promos                              178 B           104 kB
├ ○ /robots.txt                          0 B                0 B
├ ○ /rooms                               615 B           105 kB
├ ● /rooms/[slug]                        602 B          96.6 kB
├   ├ /rooms/standard-building-1
├   ├ /rooms/standard-building-2
├   ├ /rooms/lux-building-2
├   └ [+4 more paths]
├ ○ /sitemap.xml                         0 B                0 B
└ ○ /spa                                 142 B           103 kB
+ First Load JS shared by all            87.3 kB
  ├ chunks/117-14dd35a9dd2203e1.js       31.7 kB
  ├ chunks/fd9d1056-e3d373074663785d.js  53.6 kB
  └ other shared chunks (total)          1.89 kB


ƒ Middleware                             26.7 kB

○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses getStaticProps)
ƒ  (Dynamic)  server-rendered on demand

Exit code: 0
Duration: 68 seconds
```
## Dependency audit
```text
# npm audit report

glob  10.2.0 - 10.4.5
Severity: high
glob CLI: Command injection via -c/--cmd executes matches with shell:true - https://github.com/advisories/GHSA-5j98-mcp5-4vw2
fix available via `npm audit fix --force`
Will install eslint-config-next@16.2.10, which is a breaking change
node_modules/glob
  @next/eslint-plugin-next  14.0.5-canary.0 - 15.0.0-rc.1
  Depends on vulnerable versions of glob
  node_modules/@next/eslint-plugin-next
    eslint-config-next  14.0.5-canary.0 - 15.0.0-rc.1
    Depends on vulnerable versions of @next/eslint-plugin-next
    node_modules/eslint-config-next

next  9.3.4-canary.0 - 16.3.0-canary.5
Severity: high
Next.js self-hosted applications vulnerable to DoS via Image Optimizer remotePatterns configuration - https://github.com/advisories/GHSA-9g9p-9gw9-jx7f
Next.js HTTP request deserialization can lead to DoS when using insecure React Server Components - https://github.com/advisories/GHSA-h25m-26qc-wcjf
Next.js: HTTP request smuggling in rewrites - https://github.com/advisories/GHSA-ggv3-7p47-pfv8
Next.js: Unbounded next/image disk cache growth can exhaust storage - https://github.com/advisories/GHSA-3x4c-7xq6-9pq8
Next.js has a Denial of Service with Server Components - https://github.com/advisories/GHSA-q4gf-8mx6-v5v3
Next.js Vulnerable to Denial of Service with Server Components - https://github.com/advisories/GHSA-8h8q-6873-q5fj
Next.js's Middleware / Proxy redirects can be cache-poisoned - https://github.com/advisories/GHSA-3g8h-86w9-wvmq
Next.js vulnerable to cross-site scripting in App Router applications using CSP nonces - https://github.com/advisories/GHSA-ffhc-5mcf-pf4q
Next.js vulnerable to cache poisoning via collisions in React Server Component cache-busting - https://github.com/advisories/GHSA-vfv6-92ff-j949
Next.js has cross-site scripting in beforeInteractive scripts with untrusted input - https://github.com/advisories/GHSA-gx5p-jg67-6x7h
Next.js has a Denial of Service in the Image Optimization API - https://github.com/advisories/GHSA-h64f-5h5j-jqjh
Next.js vulnerable to server-side request forgery in applications using WebSocket upgrades - https://github.com/advisories/GHSA-c4j6-fc7j-m34r
Next.js vulnerable to cache poisoning in React Server Component responses - https://github.com/advisories/GHSA-wfc6-r584-vfw7
Next.js has a Middleware / Proxy bypass in Pages Router applications using i18n - https://github.com/advisories/GHSA-36qx-fr4f-26g5
Depends on vulnerable versions of postcss
fix available via `npm audit fix --force`
Will install next@16.2.10, which is a breaking change
node_modules/next

postcss  <8.5.10
Severity: moderate
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output - https://github.com/advisories/GHSA-qx2v-qp2m-jg93
fix available via `npm audit fix --force`
Will install next@16.2.10, which is a breaking change
node_modules/next/node_modules/postcss

uuid  <11.1.1
Severity: moderate
uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided - https://github.com/advisories/GHSA-w5hq-g745-h8pq
fix available via `npm audit fix --force`
Will install googleapis@173.0.0, which is a breaking change
node_modules/uuid
  gaxios  6.4.0 - 6.7.1
  Depends on vulnerable versions of uuid
  node_modules/gaxios
  googleapis-common  <=7.2.0
  Depends on vulnerable versions of uuid
  node_modules/googleapis-common
    googleapis  33.0.0 - 149.0.0
    Depends on vulnerable versions of googleapis-common
    node_modules/googleapis

9 vulnerabilities (5 moderate, 4 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force
Exit code: 1
Duration: 3 seconds
```
## Git state after validation
```text
?? ai-system/reports/
?? tsconfig.tsbuildinfo
```

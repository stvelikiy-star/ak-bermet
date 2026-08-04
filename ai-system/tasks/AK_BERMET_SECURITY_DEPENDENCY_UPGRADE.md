# AK BERMET Security Dependency Upgrade

## Status

APPROVED

## Objective

Safely upgrade vulnerable dependencies in the AK BERMET project while preserving all existing functionality.

Project path:

`/home/agent/projects/ak-bermet`

## Mandatory Branch

Start from the latest `develop` branch.

Create and work only in:

`fix/security-dependency-upgrade`

Do not merge into `develop` or `main`.

## Current Verified Baseline

The following commands previously passed:

- `npm ci`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

The dependency audit currently reports:

- vulnerable Next.js dependencies;
- vulnerable `glob`;
- vulnerable `postcss`;
- vulnerable `uuid` through `googleapis`;
- 4 high-severity vulnerabilities;
- 5 moderate-severity vulnerabilities.

## Mandatory Restrictions

Do not:

- run `npm audit fix --force`;
- modify production environment variables;
- expose secret values;
- modify Google Sheets data;
- modify external services;
- deploy the application;
- merge branches;
- change business rules;
- remove the Google Sheets CRM integration;
- replace Google Sheets with Supabase during this task;
- redesign the website;
- change public content, prices, booking rules, or room data;
- introduce unrelated libraries or services.

## Required Work

1. Verify the repository is clean.
2. Update local references from `develop`.
3. Create `fix/security-dependency-upgrade`.
4. Inspect `package.json` and `package-lock.json`.
5. Identify the minimum safe supported dependency versions required to remove known high-severity vulnerabilities.
6. Upgrade dependencies deliberately rather than using a forced automatic migration.
7. Upgrade related packages together when required for compatibility, including:
   - `next`;
   - `react`;
   - `react-dom`;
   - `eslint-config-next`;
   - `googleapis`;
   - affected transitive dependencies.
8. Apply only the minimum code or configuration changes required by the dependency upgrades.
9. Preserve:
   - all public routes;
   - manager routes;
   - manager authentication behavior until the dedicated auth task;
   - Google Sheets lead storage;
   - lead status and comment updates;
   - WhatsApp links;
   - AI chat behavior;
   - existing responsive design;
   - existing business rules.

## Validation

Run exactly:

- `npm ci`;
- `npm run lint`;
- `npx tsc --noEmit`;
- `npm run build`;
- `npm audit --audit-level=high`.

Also inspect:

- changed dependency versions;
- changed application files;
- deprecated API warnings;
- Next.js migration warnings;
- middleware compatibility;
- App Router compatibility;
- Google Sheets integration compatibility;
- server-only environment separation.

## Acceptance Criteria

The task is PASS only when:

- dependency installation succeeds;
- lint passes;
- TypeScript passes;
- production build passes;
- no critical or high vulnerabilities remain;
- Google Sheets CRM code remains present;
- no secrets are exposed;
- no unrelated project behavior is changed;
- no merge into `develop` or `main` occurs.

Moderate or low vulnerabilities may remain only when clearly documented with dependency source, exploit relevance, and remediation plan.

If a safe upgrade cannot be completed without a large architectural migration, stop before destructive changes and return FAIL with a precise explanation.

## Git Rules

If all acceptance criteria pass:

- commit changes with:
  `fix: upgrade vulnerable dependencies`
- push only:
  `fix/security-dependency-upgrade`

Do not merge.

If validation fails:

- do not push broken changes;
- preserve the branch locally;
- write the report;
- describe the exact blocker.

## Required Report

Write:

`/home/agent/projects/ak-bermet/ai-system/reports/AK_BERMET_SECURITY_DEPENDENCY_UPGRADE_REPORT.md`

The report must include:

1. Starting dependency versions
2. Final dependency versions
3. Files changed
4. Compatibility changes
5. Audit results before and after
6. Lint result
7. TypeScript result
8. Build result
9. Remaining vulnerabilities
10. Google Sheets CRM preservation confirmation
11. Git branch and commit
12. Final recommendation: PASS or FAIL

## Completion Output

Print only:

- report path;
- branch name;
- final PASS or FAIL;
- remaining critical vulnerability count;
- remaining high vulnerability count;
- commit hash if created;
- confirmation that no merge or deployment occurred.

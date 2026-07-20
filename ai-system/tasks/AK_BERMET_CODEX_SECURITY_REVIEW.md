# AK BERMET Codex Security Review

## Status

APPROVED

## Objective

Perform an independent read-only review of the dependency security upgrade completed in:

`fix/security-dependency-upgrade`

Compare it against:

`develop`

Project path:

`/home/agent/projects/ak-bermet`

## Mandatory Restrictions

Do not:

- modify project files;
- modify package files;
- install or update dependencies;
- create commits;
- push changes;
- merge branches;
- deploy;
- modify environment variables;
- expose secrets;
- access or modify Google Sheets data;
- modify external services.

This task is review-only.

## Review Scope

Inspect:

1. Git diff between `develop` and `fix/security-dependency-upgrade`.
2. Dependency changes in:
   - `package.json`;
   - `package-lock.json`.
3. Next.js migration compatibility.
4. React and React DOM compatibility.
5. ESLint configuration compatibility.
6. TypeScript configuration changes.
7. Middleware and manager authentication compatibility.
8. App Router route compatibility.
9. Google Sheets CRM preservation.
10. AI chat preservation.
11. WhatsApp link preservation.
12. Public route preservation.
13. Manager route preservation.
14. Security regressions.
15. Unexpected business-logic changes.
16. Unrelated file changes.
17. Remaining dependency vulnerabilities.
18. Whether the branch is safe to merge into `develop`.

## Evidence

Record:

- branch names;
- commit hashes;
- changed files;
- important diff findings;
- commands executed;
- exit codes;
- security findings;
- confidence level.

Do not include secret values.

## Validation

You may run read-only or non-destructive validation commands, including:

- `git status`;
- `git log`;
- `git diff`;
- `git show`;
- `npm run lint`;
- `npx tsc --noEmit`;
- `npm run build`;
- `npm audit --audit-level=high`.

Do not install or update dependencies.

## Acceptance Criteria

Return PASS only when:

- no critical or high security issue remains;
- lint passes;
- TypeScript passes;
- production build passes;
- Google Sheets CRM remains present and compatible;
- no unrelated business logic was changed;
- no secret exposure exists;
- the branch is safe to merge into `develop`.

Return FAIL when:

- a critical or high issue exists;
- validation fails;
- Google Sheets CRM was broken or removed;
- unexpected behavior changes were introduced;
- the diff cannot be safely understood;
- the branch is not safe to merge.

## Required Report

Write the report outside the project working tree at:

`/home/agent/ai-prof-stack/ai-system/reports/AK_BERMET_CODEX_SECURITY_REVIEW_REPORT.md`

The report must include:

1. Executive summary
2. Reviewed branches and commits
3. Changed files
4. Dependency review
5. Next.js and React compatibility
6. TypeScript configuration review
7. Authentication and middleware review
8. Google Sheets CRM review
9. Public and manager route review
10. Security findings
11. Validation results
12. Critical issues
13. High-priority issues
14. Medium-priority issues
15. Merge recommendation
16. Final PASS or FAIL

## Completion Output

Print only:

- report path;
- final PASS or FAIL;
- critical issue count;
- high-priority issue count;
- merge recommendation;
- confirmation that no files, branches, remote repositories, or deployments were changed.

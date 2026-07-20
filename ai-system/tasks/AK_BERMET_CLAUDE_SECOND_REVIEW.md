# AK BERMET Second Read-Only Review

## Objective

Independently review the completed dependency security upgrade in:

`fix/security-dependency-upgrade`

Compare against:

`develop`

## Restrictions

Do not:

- modify any project file;
- install or update dependencies;
- create commits;
- push;
- merge;
- deploy;
- change branches;
- change environment variables;
- expose secrets;
- modify Google Sheets or external services.

## Review Scope

Verify:

- Git diff between `develop` and `fix/security-dependency-upgrade`;
- dependency changes;
- Next.js, React, TypeScript, and ESLint compatibility;
- middleware and manager authentication compatibility;
- Google Sheets CRM preservation;
- public routes;
- manager routes;
- AI chat and WhatsApp links;
- unrelated code changes;
- security regressions;
- current npm audit result;
- whether the branch is safe to merge into `develop`.

You may run:

- `git status`;
- `git diff develop...fix/security-dependency-upgrade`;
- `git show`;
- `npm run lint`;
- `npx tsc --noEmit`;
- `npm run build`;
- `npm audit --audit-level=high`.

Do not install dependencies.

## Required Report

Write the report to:

`/home/agent/ai-prof-stack/ai-system/reports/AK_BERMET_CLAUDE_SECOND_REVIEW_REPORT.md`

Include:

1. Executive summary
2. Reviewed branches and commits
3. Changed files
4. Dependency review
5. Compatibility review
6. Google Sheets CRM review
7. Authentication and middleware review
8. Public and manager route review
9. Security findings
10. Validation results
11. Critical issues
12. High-priority issues
13. Merge recommendation
14. Final PASS or FAIL

## PASS Rules

Return PASS only when:

- lint passes;
- TypeScript passes;
- build passes;
- no critical or high vulnerabilities remain;
- Google Sheets CRM is preserved;
- no unrelated or dangerous changes exist;
- the branch is safe to merge into `develop`.

## Completion Output

Print only:

- report path;
- final PASS or FAIL;
- critical issue count;
- high-priority issue count;
- merge recommendation;
- confirmation that no files, branches, remotes, or deployments were changed.

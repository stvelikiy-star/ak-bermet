# AK BERMET — Vercel cutover evidence — 2026-09-08

## Current project

- Vercel project: `ak-bermet-functional-preview-v2-20260829`
- Project ID: `prj_b3kaGYbW8gVtJg4o5PlP6K4kxaIV`
- Latest inspected production deployment: `dpl_2gK4i8pRPMgMwdcTUrcNuWK5FAK8`
- State: `READY`
- Target: `production`
- Source application SHA used by bootstrap: `e0407c32680929ff722ac1ee25816834dbc33a6c`
- Detected application Next.js: `15.5.21`

## Root cause of stale deployment

The existing Vercel project is not behaving as a normal Git-connected `main` deployment.

Build logs prove the deployment starts with only two deployment files, runs:

```text
node bootstrap.mjs
```

The bootstrap then creates a temporary Git repository and manually fetches the exact hard-coded SHA:

```text
From https://github.com/stvelikiy-star/ak-bermet
* branch e0407c32680929ff722ac1ee25816834dbc33a6c -> FETCH_HEAD
HEAD is now at e0407c3 Merge PR #61: add fail-closed production cutover gate
```

Therefore pushes/merges to GitHub `main` do not automatically update this Vercel deployment. On 2026-09-08 no new deployment was created after multiple successful merges to `main`.

## Node version clarification

The Vercel project metadata currently reports Node `24.x`, but this is not a release blocker.

Current Vercel documentation states that `package.json -> engines.node` overrides the Node version selected in project settings.

Current AK BERMET release package contains:

```json
"engines": { "node": "22.x" }
```

So the final deployment should use Node 22 from the repository contract.

## Security note on the old bootstrap

The old production build logs show the bootstrap wrapper's initial install reported 3 high-severity vulnerabilities before it cloned the AK BERMET repository. The subsequently cloned old application also reported high vulnerabilities. Current AK BERMET `main` has already repaired the repository dependency issues and current release CI reports no high vulnerabilities.

The preferred cutover is therefore to remove the stale hard-coded bootstrap path and connect/deploy the accepted repository revision directly. If a bootstrap wrapper must remain, its own dependencies must also pass the same dependency-security gate.

## Deployment Protection

The current Vercel deployment is protected. Read-only API requests to the deployment redirect to Vercel SSO even through the available temporary share-token path. As a result, anonymous browser/API UAT cannot currently be accepted as PASS.

## Required final action

Before public cutover:

1. Fix the deployment source so it uses the final accepted `main` SHA instead of hard-coded `e0407c3...`.
2. Prefer direct GitHub repository integration with production branch `main`, or create an explicit exact-SHA deployment through an authorized Vercel admin path.
3. Verify build logs show the accepted SHA and current Next.js/dependency set.
4. Verify Node 22 is selected from `package.json engines.node`.
5. Remove or appropriately configure Deployment Protection for anonymous final UAT.
6. Run browser/API/runtime smoke before changing `akbermet.kg`.

Do not switch the public domain while Vercel still serves the stale bootstrap SHA.

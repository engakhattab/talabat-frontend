# Verification Pipeline Contract

All commands run from `D:\link-dev\talabat-frontend\talabat-web` locally or the equivalent CI workspace. Each is an independent stage with inherited stdout/stderr and an unambiguous exit code. Do not replace this table with one chained `verify` command.

## Required stages

| Stage | Command | Budget | Pass contract |
|---|---|---:|---|
| OpenAPI tooling | `npm run test:openapi-tools` | 120s | Node tool tests and Maven generator tests pass |
| Generated client | `npm run api:verify` | 120s | Structural checks pass; temp regeneration has zero added/removed/changed files |
| Core config | `npx ng test core-config --watch=false` | 60s | All config/bootstrap-support tests pass |
| Core auth | `npx ng test core-auth --watch=false` | 60s | All OIDC/guard/interceptor tests pass |
| Core HTTP | `npx ng test core-http --watch=false` | 60s | All correlation/safe ProblemDetails tests pass |
| Shared UI | `npx ng test shared-ui --watch=false` | 60s | All primitive/dialog behavior tests pass |
| Shared util | `npx ng test shared-util --watch=false` | 60s | All formatter tests pass |
| Customer | `npx ng test customer --watch=false` | 90s | Full customer suite passes with native Vitest workers |
| Production build | `npm run build:customer:production` | 90s | Angular budgets pass; stats audit finds no feature source in main |
| E2E preflight | `npm run e2e:preflight` | 60s after services are ready | Hosts, credentials, baseline data, and reset/toggle capability pass |
| E2E execution | `npm run e2e` | 180s | Happy and negative live scenarios pass serially with zero retries |

Service startup/readiness is a separate CI step with a 180s ceiling and must print Identity, API, database migration, and SPA readiness diagnostics. A stage exceeding its budget fails; do not hide it with a larger aggregate timeout.

## Full contract regeneration workflow

Run only with a clean generated/contract baseline and an explicit backend root/ref:

```powershell
npm run api:copy
npm run api:generator:build
npm run api:gen:customer
npm run api:verify
git diff -- openapi projects/api-customer/src
```

Expected: copy and generator commands exit 0; verification exits 0; diff is empty when the backend contract is unchanged. If changed, review/commit contract and generated output separately before Phase 11 application changes.

## Timing/output requirements

- CI uses one named step per row and records wall-clock duration.
- Test reporters list files/tests and failures; customer tests must not buffer silently for minutes.
- Production build retains the Angular chunk table and stats summary.
- Generated verification lists relative changed paths on failure.
- E2E failure output includes the failed step, current safe URL, screenshot, and sanitized network/console summary. Never attach credentials, tokens, storage state, or raw authorization headers.
- Re-run a flaky stage only to diagnose; the Phase 11 gate requires a clean zero-retry E2E pass and three consecutive customer-unit passes after the worker fix.

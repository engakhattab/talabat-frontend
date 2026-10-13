# Customer Release Runbook

Operational and verification record for the standalone, zoneless Angular 22 customer application (`talabat-web`). This document is the Phase 11 evidence ledger: baseline measurements, independent stage commands, timing records, failure triage, artifact-redaction policy, and the manual acceptance matrix.

All commands run from `talabat-web/` unless stated otherwise. Never record tokens, passwords, connection strings, raw exception details, or customer PII in this file or in CI artifacts.

---

## Baseline (pre-Phase-11)

Recorded before the Phase 11 configuration changes so later changes remain reviewable.

### Observed timing evidence

| Measurement | Value | Context |
|---|---|---|
| Customer suite under obsolete single-worker config | exceeded 184s without progress; terminated | `maxWorkers: 1` in `projects/customer/vitest.config.ts`; configured command stalled silently |
| Customer suite, native Vitest workers | 26.6s | 31 files / 221 tests with `--no-runner-config` |
| Selected file under custom config | 60.1s (incl. 28.2s environment work) | Confirms bottleneck is the runner configuration, not test volume |
| OpenAPI Node tests | 3.2s | `test:openapi-tools` (copy/helper tests) |
| Structural `api:verify` | 1.2s | Pre-drift version (no temporary regeneration) |
| Generator clean/verify | 31.1s | Maven generator build + tests |
| core-config tests | 11.0s | `npx ng test core-config --watch=false` |
| core-auth tests | 12.3s | `npx ng test core-auth --watch=false` |
| core-http tests | 9.5s | `npx ng test core-http --watch=false` |
| shared-ui tests | 11.5s | `npx ng test shared-ui --watch=false` |
| shared-util tests | 10.0s | `npx ng test shared-util --watch=false` |
| Production build with stats | 24.7s | 425.38 kB raw initial total baseline |

### Production build baseline

| Metric | Value |
|---|---|
| Initial total (raw) | 425.38 kB |
| Main | 391.22 kB |
| Styles | 34.16 kB |
| Customer feature source in main | None (`app.ts`, `app.routes.ts`, `app.config.ts` only) |
| Initial budget warning | 500 kB / 1 MB |
| Component style budget | 4 kB / 8 kB |

### Owning configuration baseline

- **Scripts** (`talabat-web/package.json`): `ng`, `start`, `build`, `watch`, `test`, `api:copy`, `api:generator:build`, `api:gen:customer`, `api:gen`, `api:verify`, `test:openapi-tools`. No focused per-stage aliases, no E2E commands, no monolithic `verify` wrapper.
- **Obsolete customer runner** (`talabat-web/projects/customer/vitest.config.ts`): `test.maxWorkers: 1` referenced by `angular.json` → `customer.test.options.runnerConfig`. Removed by T003; Angular native Vitest worker defaults are used instead.
- **Angular budgets** (`talabat-web/angular.json` → `customer.build.configurations.production`): `initial` 500 kB warning / 1 MB error; `anyComponentStyle` 4 kB warning / 8 kB error. These thresholds are authoritative and unchanged.
- **Test boundaries**: libraries `core-config`, `core-auth`, `core-http`, `shared-ui`, `shared-util` each have a focused `test` architect target with `@angular/build:unit-test`; customer application test target is `customer`.

---

## Phase 11 measured evidence (T010)

Customer suite after T003 (native Vitest workers, no runner config), three consecutive runs:

| Run | Exit | Wall time | Result |
|---|---:|---:|---|
| 1 | 0 | 95.5s | 31 files / 221 tests passed |
| 2 | 0 | 52.7s | 31 files / 221 tests passed |
| 3 | 0 | 87.6s | 31 files / 221 tests passed |

The previous timeout cause is closed: no single-worker override, test progress is streamed, and the suite passes repeatedly. One intermediate worker crash (`Worker exited unexpectedly`) occurred under host memory pressure (1.3 GB free of 7.9 GB) and did not recur; it was not a cross-file isolation defect. No blanket serialization was restored.

Focused Angular/library stages (native builders):

| Stage | Exit | Wall time | Tests |
|---|---:|---:|---|
| core-config | 0 | 23.6s | 1 passed |
| core-auth | 0 | 15.8s | 54 passed |
| core-http | 0 | 11.0s | 15 passed |
| shared-ui | 0 | 10.2s | 5 passed |
| shared-util | 0 | 9.3s | 2 passed |

Timing records are appended after each gate run in the final evidence section (T039).

## Independent verification stages

Each stage is an independent command with inherited stdout/stderr and an unambiguous exit code. Run each separately and record exit code and duration. Do not replace the table with one chained `verify` command.

| Stage | Command | Budget | Pass contract |
|---|---:|---:|---|
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

Run only with a clean generated/contract baseline and an explicit backend root/ref. `api:copy` accepts `E2E_BACKEND_ROOT` for CI checkout layouts; the default is the sibling `D:\link-dev\talabat` checkout. `api:gen:customer` is the guarded sole writer of committed `projects/api-customer/src`; `api:verify` never rewrites committed source.

```powershell
npm run api:copy
npm run api:generator:build
npm run api:gen:customer
npm run api:verify
git diff -- openapi projects/api-customer/src
```

Expected: copy and generator commands exit 0; verification exits 0; diff is empty when the backend contract is unchanged. If changed, review/commit contract and generated output separately before Phase 11 application changes.

### Contract sync pinned workflow (T033)

1. Record the backend root/ref in the "Backend reference record" section below.
2. `npm run api:copy` byte-copies both committed specs (`customer-api.json`, `delivery-api.json`) from the explicit backend root.
3. `npm run api:generator:build` builds the custom generator and runs its Maven tests (including the deterministic double-generation test).
4. `npm run api:gen:customer` regenerates committed `projects/api-customer/src` (the only writer).
5. `npm run api:verify` runs structural checks plus a non-destructive temporary regeneration; it exits non-zero on any added/removed/changed file and cleans up its OS temp directory in `finally`.
6. `git diff -- openapi projects/api-customer/src` — reviewed/committed separately from Phase 11 application hardening.
7. `npm run test:openapi-tools` runs the Maven generator tests and the Node copy/drift tool tests.

## Live service startup

Start SQL Server and run migrations using the backend's documented Development/CI configuration. Start the HTTPS Customer API and Identity host, then the SPA:

```powershell
dotnet run --project D:\link-dev\talabat\src\Talabat\Talabat.API --launch-profile https
dotnet run --project D:\link-dev\talabat\src\Talabat\Talabat.Identity --launch-profile https
npx ng serve customer --configuration=production
```

Fixed topology:

| Service | Required URL | Readiness proof |
|---|---|---|
| Customer SPA | `http://localhost:4200` | `/assets/config.json` returns valid allowed public config |
| Identity | `https://localhost:7237` | `/.well-known/openid-configuration` returns metadata for this authority |
| Customer API | `https://localhost:7056` | `/health` returns healthy; public catalog returns fixture |

Set `E2E_CUSTOMER_EMAIL` and `E2E_CUSTOMER_PASSWORD` in the invoking process without printing them. Run preflight before the E2E suite. A successful preflight runs the backend-owned `prepare` operation against the real Development/E2E database and consumes its JSON metadata for the marker-owned restaurant, happy product, negative product, and baseline addresses. Do not create a local `prepare.json`, hardcode generated IDs, substitute personal credentials/mocks/SQL edits, or toggle shared developer catalog rows. If the provisioner is missing or invalid, stop: Phase 11 remains blocked.

## CI timing/failure convention (`.github/workflows/customer-ci.yml`)

- Fast PR validation runs one named step per stage (`Stage openapi-tools`, `Stage generated-client verify`, each library, `Stage customer tests`, `Stage production build and bundle audit`). No aggregate `verify` wrapper exists.
- Every step reports name, wall-clock duration (GitHub Actions step timing), exit code, warnings, and its own stdout/stderr. A step timeout (`timeout-minutes`) identifies the failed stage directly.
- The gated live-E2E job is separate, uses a shared-environment concurrency group to serialize the synthetic account, installs Chromium only, and never uploads credentials/tokens/storage state (failure artifacts are the sanitized report/trace only).
- Local recording: run each command below independently and append exit code/duration/evidence to the stage tables.

## Performance evidence (US5, T025/T026)

Recorded after `npm run build:customer:production` (builds with `--stats-json`, then runs the bundle audit):

| Metric | Value |
|---|---|
| Initial total | 415.43 kB (382.05 kB main + 33.38 kB styles) |
| Budgets | 500 kB / 1 MB initial; 4 kB / 8 kB component style — unchanged, no warning/error |
| Feature source in main | None — audit PASS |
| Route review | `app.routes.ts`/`layout/routes.ts` keep catalog, onboarding, cart, checkout, profile, orders, auth, not-found all lazy via `loadChildren`/`loadComponent` |
| Largest main inputs | `@angular/core` chunks, `@angular/router`, `oidc-client-ts`, `@angular/common` — no customer feature source; no optimization justified |

No optimization was made: the baseline remains within budget and feature-free in main.

## Regression coverage audit (US8, T035)

- `checkout.store.spec.ts` proves that a successful 201 clears the cart, clears the temporary address override, records the order ID, and navigates to that dynamic order; it also covers duplicate-submit suppression and default-address reconciliation when an override is removed.
- The profile/address store and page coverage prove profile reload/update behavior and that set-default dispatches through the authoritative store response. No duplicate assertion was added for test count.
- `order-confirmation.page.spec.ts` proves route-ID detail retrieval and reload safety: re-rendering reissues only the GET detail request.

Live add-with-default and set-default acceptance against SQL Server is intentionally separate in T036; unit coverage does not substitute for that backend gate.

## Failure triage

Diagnose each stage by its own log and exit code; never hide a failure behind an aggregate command or an inflated timeout.

- **Customer unit suite stalls without progress**: the obsolete single-worker override must not be reintroduced. Check for cross-file global/TestBed pollution and fix shared cleanup. A narrow documented exception is acceptable only for a proven test file.
- **E2E preflight fails with `blocked-preflight`**: the backend-owned Development/CI-only provisioner is missing, unversioned, or refused an operation. Do not substitute SQL, mocks, personal credentials, or a production HTTP endpoint. Record Phase 11 as **blocked**.
- **E2E flake**: `workers: 1` and zero retries are deliberate for the shared synthetic identity. Re-run only to diagnose; the Phase 11 gate requires a clean zero-retry pass.
- **Generated drift**: `api:verify` lists sorted relative changed paths. Repair by regenerating through the guarded `api:gen:customer` writer only; never edit `projects/api-customer/src`.
- **Budget warning/error**: compare against the recorded baseline before changing anything. Do not raise budgets to conceal a regression.

## Artifact-redaction policy

- Never attach credentials, tokens, storage state, raw authorization headers, or customer PII to logs or artifacts.
- Playwright failure output includes the failed step, current safe URL, screenshot, and sanitized network/console summary only.
- Failure artifacts are retained briefly and restricted to approved CI artifact access.
- A temporary generator comparison is excluded for `.openapi-generator/**` metadata only; sorted changed paths are safe.

## Backend reference record

Recorded per contract-sync/regeneration run:

- Backend root (explicit override or default sibling checkout):
- Backend ref / SHA:
- `api:copy` exit code / duration:
- Committed spec hashes (before/after):

## Manual acceptance matrix

Record pass/fail/blocked with browser version and environment. Do not record tokens, passwords, or raw customer PII. Completed by T023/T036/T038.

| Check | Viewport / setup | Result (pass/fail/blocked) | Safe evidence |
|---|---|---|---|
| Keyboard journey | Tab, Shift+Tab, Enter, Space, Arrow and Escape through catalog, forms, cart, checkout and dialogs | | Browser/version and route only |
| Real zoom | 200% browser zoom on ordering and profile/address flows | | Browser/version, viewport and visible issue summary |
| Screen reader | NVDA/VoiceOver: labels, form errors, dialog title and status/error announcements | | Assistive technology/version and route only |
| Color-independent state | Error, success, availability and default-address state remain understandable without color | | Route and status text/icon observed |
| Responsive primary controls | 320px, 768px and 1280px: no clipped or unreachable ordering action | | Browser/version, viewport and route |
| Reduced motion | Enable reduced motion; repeat dialog and navigation actions | | Browser/version and observed behavior |

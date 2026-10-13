# Implementation Plan: Release Hardening and Customer Milestone

**Branch**: `005-release-hardening` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Phase 11 specification plus direct inspection of `talabat-web/` and the sibling `D:\link-dev\talabat` backend.

## Summary

Harden the existing Angular 22 customer product without changing its business scope. The implementation will remove the obsolete single-worker Vitest bottleneck, make generated-client verification genuinely regenerative, add safe bootstrap/runtime-error behavior, close raw-error rendering gaps, preserve existing route and state architecture, and add a Chromium-only Playwright release proof through the live SPA, Identity, Customer API, application/domain/infrastructure layers, EF Core, and the real local Development/CI SQL Server database.

The browser suite cannot be declared complete against the current backend. The backend currently seeds roles and catalog rows only; it does not provision a dedicated customer/profile/address, and it has no safe Development/CI-only command to establish deterministic state in the real local Development/CI database or to change a product from available to unavailable after it has entered the cart. That command is an explicit backend-owned E2E prerequisite: it prepares only synthetic baseline rows, then the browser exercises the real persistence stack. Phase 11 must not substitute mocks, a personal account, direct ad-hoc SQL, or a production test endpoint.

## Technical Context

**Language/Version**: TypeScript 6.0.3 on Node.js 24.18.1/npm 11.16.0; Angular 22.1.x. Backend integration is .NET 10, Duende IdentityServer, EF Core, and SQL Server.

**Primary Dependencies**: Angular standalone/router/signals/zoneless, `oidc-client-ts` 3.5.0, Angular CDK 22.1.0, generated `@talabat/api-customer`, Vitest 4.1.10, jsdom 28.1.0. Add exact dev dependencies `@playwright/test@1.62.1` and `@axe-core/playwright@4.12.1`; install Chromium only.

**Storage**: Application tokens remain in memory. OIDC transaction state remains library-owned transient `sessionStorage`. E2E credentials are CI/local environment secrets. Test orders accumulate in the real local Development/CI SQL Server database for the dedicated synthetic account; the backend provisioner resets only transient cart/product state and repairs required baseline profile/address records.

**Testing**: Angular native `@angular/build:unit-test` with Vitest; Node test runner and Maven/JUnit for OpenAPI tooling; Playwright Test for live browser E2E; axe-core for automatable accessibility rules; documented manual acceptance for behavior automation cannot prove.

**Target Platform**: Responsive customer SPA at `http://localhost:4200`; Identity at `https://localhost:7237`; Customer API at `https://localhost:7056`; GitHub Actions on Ubuntu, matching the sibling backend's existing CI platform.

**Project Type**: Angular CLI workspace with a separately deployed Identity host and Customer API.

**Performance Goals**: Production initial bundle remains below the configured 500 kB warning/1 MB error budgets; component styles remain below 4/8 kB; all customer features remain lazy; verification stages stay within the budgets in [contracts/verification-pipeline.md](./contracts/verification-pipeline.md).

**Constraints**: Standalone Angular 22, zoneless, signals, generated API boundary, runtime config, current lazy boundaries, no application-owned token persistence, no state framework, no generated-source edits, no Delivery work, no new business capabilities, and no speculative optimization.

**Scale/Scope**: One customer app, five hand-written libraries, one generated API library, 31 customer spec files/221 current customer tests, five core-auth spec files/54 tests, and two critical live E2E scenarios.

## Current-State Findings

### Verification and tooling

- `talabat-web/package.json` exposes the required OpenAPI commands but no focused scripts for each Angular target and no E2E command.
- `projects/customer/vitest.config.ts` forces `maxWorkers: 1`. The configured customer test command exceeded 184 seconds without progress and had to be terminated. The same 31 files/221 tests passed in 26.6 seconds with Angular's native Vitest worker defaults (`--no-runner-config`). This is the reproduced timeout root cause.
- Current observed local timings: OpenAPI Node tests 3.2s; structural `api:verify` 1.2s; generator clean/verify 31.1s; core-config 11.0s; core-auth 12.3s; core-http 9.5s; shared-ui 11.5s; shared-util 10.0s; customer tests 26.6s with native workers; production build with stats 24.7s.
- `api:verify` validates tags, model placement, imports, types, and file counts, but it does not regenerate to a temporary directory and compare bytes with `projects/api-customer/src`. It therefore does not currently prove generated-client drift.
- The sibling backend and frontend OpenAPI JSON files currently have identical SHA-256 hashes. `api:copy` is still path-coupled to a sibling directory and needs an environment override for deterministic CI checkout layouts.
- The frontend repository has no CI workflow. The sibling backend already uses GitHub Actions with SQL Server, so GitHub Actions is the smallest consistent CI target.

### Angular architecture, build, and routes

- The workspace is Angular 22 standalone and zoneless. `app.routes.ts` lazily loads the shell; the shell lazily loads catalog, onboarding, cart, checkout, profile, orders, auth-check, and not-found pages/routes.
- The production build passes with a 425.38 kB raw initial total (391.22 kB main + 34.16 kB styles), below the 500 kB warning. The stats file shows only `app.ts`, `app.routes.ts`, and `app.config.ts` from customer application source in the main bundle; no `features/**` source is in main.
- Angular/router/OIDC dominate the main bundle. Generated service code is also visible, but current budgets and lazy feature evidence pass; no optimization is justified without a regression measurement.
- Runtime config contains the four expected public values only. The loader does not validate the JSON shape, and bootstrap failure is only logged to the console, leaving an empty `<app-root>` for missing, malformed, or invalid config.

### Authentication and security

- OIDC uses authorization code + PKCE. User storage is `InMemoryWebStorage`; library-owned transaction state uses prefixed `sessionStorage`; no application code persists tokens.
- Return URLs reject absolute, protocol-relative, backslash, multiply encoded, malformed, and callback destinations. Callback handling uses `history.replaceState` and router `replaceUrl`, but the page test does not assert URL cleanup.
- The interceptor uses parsed URL origin equality plus a bounded `/api/me` path derived from `customerApiBaseUrl`. This is stricter than a naive string prefix and already rejects look-alike hosts, Identity, assets, catalog, and foreign origins. Preserve it; do not replace it with a weaker `includes` or raw prefix check.
- 401 handling clears state once without replay; 403 does not trigger login loops. Existing unit coverage is strong.
- `problemDetailsInterceptor` currently copies backend `title` and `detail` into `AppError`, and several pages render them directly. Unknown ProblemDetails can therefore expose backend-supplied detail. This is a real Phase 11 security defect: unknown errors need safe fixed copy, and known codes need feature-owned messages rather than raw backend text.

### Regression coverage

- `ProfileStore` already tests automatic profile loading after authentication.
- `CheckoutStore` already tests address-override reset on 201, cart emptying, dynamic order navigation, and duplicate-submit suppression.
- Profile/address tests cover authoritative reload and direct set-default response reconciliation. Live set-default/add-with-default still needs manual acceptance against SQL Server.
- Order confirmation already tests route-ID validation and reload-safe GET behavior.
- `HeaderComponent` uses a computed profile/auth greeting, but its test only asserts that sign-out renders after authentication. Add one precise test proving the displayed name changes when the profile signal loads/updates; do not duplicate the other regression tests.

### Backend and test data

- `CatalogSeedData` deterministically seeds active restaurants 1/2 and available products 101/102/201/202.
- `IdentityDataSeeder` seeds roles only. The backend test factories seed users, but those factories host in-memory/integration test servers and cannot provision the required live HTTPS hosts.
- The real login Razor page is automatable by accessible Email/Password labels and completes the actual multi-origin OIDC redirect.
- No customer/profile/address E2E seed exists. No catalog-management endpoint exists, intentionally. All production catalog seed products are available. A Checkout Item Availability Failure cannot be induced safely and deterministically with the current live hosts.
- Required external resolution: backend owners provide an idempotent Development/CI-only startup seeder or CLI (not an HTTP production endpoint) that operates against the real local Development/CI SQL Server database. It must provision/repair the dedicated identity/profile/default address, reset that account's cart, and set/reset the designated negative-path product through backend-owned application/domain/infrastructure behavior. Until then, `e2e:preflight` must fail clearly and Phase 11 cannot exit.

## Constitution Check

*GATE before research: PASS for the planned architecture. Existing defects are remediation targets, not accepted exceptions.*

- Backend remains authoritative; E2E observes server order/cart outcomes and never calculates totals.
- Generated source remains read-only; drift verification changes tooling and temporary output only.
- Dependency direction remains unchanged. Playwright/axe live outside application runtime code.
- Existing feature routes remain lazy and guard order remains `authGuard`, then `profileGuard`.
- Angular remains standalone, zoneless, and signal-based; no state framework or NgModule is added.
- OIDC/PKCE, in-memory user storage, validated return URLs, and the current strict interceptor boundary remain intact.
- Runtime/public-error fixes stay in `core-config`, `core-http`, and owning feature UI; no direct feature `HttpClient` is added.
- Accessibility uses existing CDK behavior and FoodDash constraints; Angular Material is not introduced.
- Tests remain Vitest plus one live browser runner; no assertions are weakened or deleted to pass.
- Application-source baseline was clean before Spec Kit generated this feature directory. Implementation begins only after these planning artifacts are accepted as the Phase 11 baseline.

*Post-design re-check: PASS. No constitutional violation or complexity exception is required. The backend E2E provisioner is an external prerequisite and must follow the backend repository's own active-phase governance before it is implemented.*

## Selected Technical Decisions

### E2E runner

Choose Playwright Test 1.62.1 with Chromium only.

- Angular compatibility is black-box HTTP/browser compatibility; Playwright supports the workspace's Node 24 runtime and does not require an Angular builder/plugin.
- Browser navigation naturally crosses SPA and Identity origins. Cypress 15 supports this through `cy.origin`, but that adds an origin-specific command boundary to every OIDC interaction and more runner ceremony.
- A browser context can ignore the localhost development certificate only when the configured Identity URL is the exact loopback HTTPS origin. Staging/production must use trusted certificates.
- Playwright supplies isolated non-persistent contexts, auto-waiting locators/assertions, request/header observation, screenshots, and CI browser installation. Its tests use real HTTPS services and real EF Core/SQL Server persistence; the provisioner is setup only, never a persistence mock. Use `workers: 1` and zero retries for these two state-mutating live tests. Single-worker execution is correct for the shared E2E identity, unlike the unit-suite override being removed.
- Do not save `storageState`: the application deliberately keeps the OIDC user/access token in memory, and bypassing login would fail to prove the real callback lifecycle. Each scenario performs the actual UI redirect/login.
- Install only Chromium (`playwright install --with-deps chromium`) to minimize download and CI surface. Add Firefox/WebKit only after a separate compatibility requirement.
- Prefer roles, labels, and visible names. Add `data-testid` only where no stable accessible locator exists. Use small helpers/fixtures, not a page-object framework.

### Accessibility automation

Add `@axe-core/playwright` because Playwright's maintained accessibility guidance uses it and automated scans catch semantic/label/contrast defects. Run WCAG A/AA tags on stable loaded states and attach detailed results on failure. Do not suppress rules broadly or snapshot entire reports.

Axe does not prove keyboard order, focus trapping/restoration, zoom, touch size, responsive clipping, reduced motion, or comprehensible error recovery. Cover those with existing component/integration tests, targeted Playwright behavior checks, and the manual matrix in quickstart.

### Verification and CI

- Remove `projects/customer/vitest.config.ts` and its `runnerConfig` reference unless a later measured need requires a small documented config. Use Angular's supported native Vitest defaults.
- Add focused npm aliases for every stage; do not add a monolithic `verify` script. CI keeps each command as a separately timed step with its own log and timeout.
- Use GitHub Actions because both repositories are GitHub-hosted and the backend already defines an Ubuntu/SQL Server workflow. Split fast static/unit/build stages from the live-service E2E job.
- Do not make normal frontend PR validation depend on a floating backend branch. `api:verify` regenerates from the committed frontend contract. A manual/release contract-sync job checks out an explicit backend ref and runs copy/build/generate/verify.

### OpenAPI drift verification

Refactor the generator wrapper to accept an explicit output directory while retaining the guarded committed-output command. `api:verify` will:

1. run existing structural assertions;
2. ensure the committed contract is the intended input;
3. build the custom generator if its jar is absent;
4. generate into an OS temporary directory;
5. compare the complete deterministic file manifest/content with `projects/api-customer/src`, excluding generator metadata only; and
6. remove the temporary directory in `finally`.

It must report added, removed, and changed relative paths and never clean or rewrite committed generated source. The full release workflow remains copy -> generator build/tests -> committed regeneration -> drift verification -> `git diff` review.

### Runtime and safe errors

- Validate runtime config as an object with exactly the allowed public keys and valid absolute authority/API URLs plus non-empty client/scopes. Reject missing/extra/invalid values before providers consume them.
- Factor a tiny app-owned bootstrap-failure renderer called by `main.ts` on bootstrap rejection. It renders hard-coded accessible copy and a reload action without interpolating the caught error. This handles missing HTTP response, malformed JSON, and invalid shape without needing Angular to bootstrap.
- Change unknown ProblemDetails mapping to safe fixed public text with no backend `detail`. Audit feature templates/stores so known domain codes map to feature-owned messages; raw backend `title`, `detail`, `extensions`, correlation IDs, or tokens never reach templates. Retain `rawError` only for the typed checkout 422 adapter, and consume only its generated fields.
- Preserve auth architecture. Add assertions for callback URL/history cleanup, transaction-key cleanup after callback, PKCE settings, no persistent tokens, and exact origin/path interception. Use live network observation as confirmation, not as a replacement for unit tests.

### Performance evidence

Build with `--stats-json`. Add a dependency-free Node audit that prints initial/main/style sizes and largest inputs and fails if any `projects/customer/src/app/features/**` source is included in the main output. Angular budgets remain authoritative and unchanged. Record the 425.38 kB initial baseline; optimize only if a later result crosses a budget or shows a new eager feature/large dependency.

## Project Structure and File Ownership

```text
specs/005-release-hardening/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── e2e-environment.md
    └── verification-pipeline.md

talabat-web/
├── package.json                         # focused stage and E2E scripts
├── package-lock.json                    # exact Playwright/axe dependency lock
├── angular.json                         # remove obsolete customer runnerConfig only
├── playwright.config.ts                 # Chromium, serial live tests, localhost HTTPS guard
├── .gitignore                           # Playwright reports/results; no auth-state files
├── e2e/
│   ├── preflight.spec.ts                # hosts, config, credentials, profile/address/catalog fixture
│   ├── customer-order.spec.ts           # happy path and unavailable-item path
│   └── support/
│       ├── auth.ts                      # real OIDC UI redirect helper
│       ├── accessibility.ts             # shared axe configuration/report attachment
│       ├── network-audit.ts             # bearer/callback/storage assertions
│       └── test-data.ts                 # fixture contract; invokes only approved setup mechanism
├── tools/
│   ├── api-generator.mjs                # parameterized safe output target
│   ├── verify-generated-api.mjs         # structural + temporary regeneration diff
│   ├── verify-generated-api.test.mjs    # drift/add/remove/change regression tests
│   └── verify-customer-bundle.mjs       # stats report and lazy-feature assertion
├── projects/customer/
│   ├── vitest.config.ts                 # DELETE obsolete maxWorkers override
│   └── src/
│       ├── main.ts                      # safe bootstrap failure handoff
│       ├── bootstrap-failure.ts         # hard-coded accessible fallback + unit test
│       └── app/
│           ├── features/auth/signin-callback.page.spec.ts
│           ├── layout/header.component.spec.ts
│           └── **/*.spec.ts             # only evidence-driven regression/a11y fixes
├── projects/core-config/src/lib/
│   ├── provide-app-config.ts
│   └── provide-app-config.spec.ts       # fetch/JSON/schema/public-key failures
├── projects/core-auth/src/lib/*.spec.ts # security invariant additions only
├── projects/core-http/src/lib/
│   ├── problem-details.interceptor.ts
│   └── problem-details.interceptor.spec.ts
└── docs/customer-release-runbook.md     # deployment config, commands, failure and manual checks

.github/workflows/customer-ci.yml        # independent frontend stages and gated live E2E job
```

No file under `talabat-web/projects/api-customer/src` is manually edited. Any accessibility or runtime defect fix stays in its current owning feature/library. The approved backend-owned prerequisite is an early-exit CLI mode in `D:/link-dev/talabat/src/Talabat/Talabat.Identity/Program.cs`, with a Development/E2E-only provisioner under `Talabat.Infrastructure/Identity/E2E/`; it requires a separate backend-scope approval before implementation.

## E2E and Test-Data Strategy

### Preflight

`npm run e2e:preflight` starts/reuses only the SPA and fails fast before the ordering scenarios if any invariant is missing. It invokes the backend-owned provisioner in `prepare` mode against the real local Development/CI database before inspecting the browser-visible baseline:

- required credential environment variables exist without printing values;
- SPA config loads and matches the exact three loopback hosts;
- Identity discovery and Customer API `/health` respond;
- browser can complete the real Identity login with the dedicated account;
- callback finishes on an internal SPA URL with no `code`, `state`, `session_state`, or OIDC transaction key left;
- profile exists with the expected test marker and at least one saved default address;
- the marker-owned E2E restaurant and distinct happy/negative products returned by `prepare` metadata are present and initially available;
- a configured backend-owned Development/CI provisioner command is available, declares its supported version, and reports only safe fixture markers after it has prepared the real database.

Missing seed/setup support is a preflight failure, not a skipped test.

### Happy path

In a fresh browser context: use the backend-owned provisioner's `prepare` mode to reset only the dedicated account's transient cart and verify fixture availability in the real database; then browse anonymous restaurants/menu; start sign-in; fill the Identity Razor form from secrets; assert callback cleanup and authenticated header/profile; select deterministic product; add, view cart, checkout with baseline address, place exactly one order, capture the numeric ID from navigation, assert cart becomes empty, reload `/orders/:id`, and verify the details are fetched/rendered from the real API/persistence stack. Orders are not deleted.

### Checkout availability failure

In a separate fresh context and serial execution: invoke `prepare` to reset the dedicated cart/product state in the real database; sign in; capture the current order-ID set; add the designated product while available; invoke the backend-owned provisioner in `make-negative-product-unavailable` mode; submit checkout through the real API/domain/EF Core stack; assert the typed safe notice, authenticated header, preserved cart line/quantity, and unchanged order-ID set; invoke `restore` in `finally`. A run-start `prepare` must repair state left by a crashed prior run.

### Isolation and concurrency

- One dedicated account per CI environment; never a developer account.
- `workers: 1`, no retries, and a GitHub Actions concurrency group for the shared environment.
- Happy and negative products are distinct marker-owned E2E fixtures returned by the current `prepare` metadata. The browser never hardcodes their database IDs or mutates a developer restaurant/product.
- Do not persist browser auth state or credentials in files/artifacts.
- Profile/address remain baseline fixtures; orders accumulate; cart is reset before each scenario; product availability is restored even after assertion failure.

## Security Audit Strategy

1. Unit/integration: PKCE remains enabled; no client secret; transient transaction storage and in-memory user storage; safe return URL matrix; callback processes once and replaces sensitive URL state on success/failure; 401 clears once; 403 does not loop; strict origin plus `/api/me` boundary rejects look-alike hosts and foreign origins.
2. Static audit: search application-owned code for token/localStorage/sessionStorage writes, hard-coded environment URLs, credentials, generated-client access-token configuration, and direct feature `HttpClient` usage.
3. Browser audit: observe every request during OIDC and ordering. Fail if `Authorization` appears outside the exact Customer API origin/protected path. Inspect local/session storage after callback and sign-out for access/refresh tokens, user snapshots, client secrets, or stale PKCE transaction entries.
4. Failure audit: tampered return URL/state and unreachable Identity produce fixed actionable copy; callback URL/history is clean; no raw protocol/library error is rendered.
5. Runtime config audit: exact public-key allowlist, no credentials/private values, and loopback-only certificate bypass in test configuration.

## Accessibility Strategy

- Preserve existing semantic and form-association tests; add tests only for uncovered focus/error behavior.
- Run axe WCAG A/AA scans on stable anonymous catalog/menu, authenticated cart/checkout/profile/orders/detail, and opened modal/sheet states. Attach reports; do not blanket-disable rules.
- Use Playwright keyboard navigation to assert visible focus on core path controls, dialog initial focus, Tab containment, Escape close, and trigger focus restoration.
- At 320px, assert no primary-document horizontal overflow and that ordering controls remain in viewport. Measure representative primary buttons, quantity controls, address radios, and navigation targets at >=42px.
- Exercise `reducedMotion: 'reduce'` and verify dialogs/journey remain usable with effective animations suppressed.
- Keep 200% browser zoom, full keyboard route traversal, screen-reader announcement quality, color-independent meaning, and 768/1280 layouts as recorded manual acceptance because emulated viewport/device scale is not equivalent to browser zoom or assistive-technology use.

## OpenAPI Verification Strategy

- `test:openapi-tools` runs Node copy/helper tests and Maven `clean verify`, preserving the generator's existing deterministic-double-generation test.
- `api:verify` performs structural checks and non-destructive temporary regeneration comparison.
- `api:copy` accepts a configured backend root and byte-copies both committed specs. The release/manual workflow records the backend ref/SHA.
- `api:gen:customer` remains the only writer to generated source and keeps its path/symlink safety guards.
- After approved contract updates: copy, build generator, regenerate, inspect generated/contract diff, verify, test/build, then commit contract/generated changes separately from Phase 11 application hardening.

## Runtime Failure Checks

- Core-config tests: non-2xx response, rejected fetch, malformed JSON, non-object JSON, missing/extra keys, invalid URLs, empty client/scope, and valid config.
- Bootstrap fallback test: hard-coded heading/explanation/retry control renders into the host; caught error text is never included.
- Browser/manual: replace or block `assets/config.json` for missing/malformed cases; stop Customer API and verify retryable states on each server-driven route; stop Identity and verify safe sign-in failure; force 401 and verify one state clear plus re-auth action without looping; inject unknown ProblemDetails in an integration test and verify generic copy only.
- Do not automatically retry checkout after ambiguous transport failure.

## Implementation Order

1. **Baseline and scripts**: preserve baseline measurements; remove the customer single-worker override; add focused npm scripts; run the customer suite at least three times to expose hidden cross-file leakage rather than restoring serialization.
2. **OpenAPI tooling**: parameterize safe generation output; add temporary regeneration diff tests; make `api:verify` non-destructive and independently executable.
3. **Runtime/security fixes**: validate config, add bootstrap fallback, sanitize unknown/public errors, and add the smallest missing callback/storage/interceptor tests.
4. **Regression delta**: add the reactive profile-name header assertion; confirm existing checkout/address/cart/order tests are sufficient; do not duplicate them.
5. **Build evidence**: add stats audit, preserve budgets, and record the accepted baseline. Fix only a demonstrated eager import/asset regression.
6. **Playwright foundation**: add exact dependencies/config/scripts, Chromium install, loopback HTTPS guard, preflight, OIDC helper, network/storage audit, and axe fixture.
7. **External backend gate**: obtain a backend-approved, Development/CI-only provisioner command that prepares the dedicated synthetic records in the real local SQL Server database and resets/toggles only the designated transient state. Until it exists, stop with a failing preflight and report Phase 11 blocked.
8. **Live scenarios**: implement serial happy and availability-failure tests, cleanup/finally behavior, dynamic order-ID assertions, and security/a11y checks.
9. **CI and operations**: add independently timed GitHub Actions steps, live-service health/startup diagnostics, sensitive artifact policy, and the customer release runbook.
10. **Exit evidence**: run every contract command independently, complete the manual matrix, review generated/build diffs, and record objective pass/fail evidence.

## Rollback and Risk Considerations

- Playwright/axe are dev-only. If the runner proves incompatible, revert their package/config/e2e files without touching application runtime; Cypress remains rejected unless its multi-origin cost becomes justified by new evidence.
- Removing unit `maxWorkers: 1` may expose test pollution. Fix shared global/TestBed cleanup; do not reinstate a blanket single-worker workaround. A narrow documented exception is acceptable only for a proven test file.
- The shared E2E identity is vulnerable to concurrent runs and lockout. Serialize CI and make preflight identify state drift without printing credentials.
- A failed negative test can leave a product unavailable. The backend setup capability must reset at run start and restore in `finally`; without both operations the test remains blocked.
- Ignoring HTTPS errors is allowed only for the exact localhost Identity origin. Any non-loopback E2E environment requires a trusted certificate.
- Playwright traces/screenshots can contain customer data. Use synthetic data, never attach credentials/storage state, retain failure artifacts briefly, and restrict CI artifact access.
- A temporary generator comparison could be noisy if metadata is nondeterministic. Compare a sorted manifest excluding `.openapi-generator/**`, as the existing generator test already proves content determinism.
- Security message hardening can alter UX text. Keep typed error actions and update focused assertions; never re-expose raw detail for convenience.
- Bundle optimization rollback is simply no code change: budgets already pass. Do not change thresholds to hide regression.

## Manual Verification

Follow [quickstart.md](./quickstart.md). Required evidence covers real OIDC login/logout/back-button/callback tampering, exact request headers, storage, 401/403 behavior, profile/address/default management, cart/checkout/order reload, missing/malformed config, API/Identity outages, keyboard/focus/dialog behavior, 320/768/1280 widths, 200% zoom, touch targets, reduced motion, color-independent states, production stats, and full OpenAPI regeneration.

## Objective Phase 11 Exit Gate

Phase 11 exits only when all of the following are true:

1. Every independent command in the verification contract exits 0 inside its budget with interpretable output; customer tests pass repeatedly without the single-worker override.
2. Temporary regeneration produces a zero-file diff; the approved backend contract copy workflow is reproducible; no generated file was manually edited.
3. Production build emits no budget warning/error, stats contain no customer feature source in main, and no measured dependency/asset regression is unresolved.
4. Live preflight passes with a dedicated non-personal identity, baseline profile/default address, deterministic products, and approved reset/toggle support.
5. Playwright happy path completes through reload-safe dynamic order detail. The unavailable-item path proves safe notice, preserved session/cart, no new order, and restored fixture state.
6. OIDC callback, return URL, PKCE, storage, interceptor, runtime config, 401/403, and public-error invariants pass unit plus live/manual verification with zero bearer leakage.
7. Automated axe scans have no unsuppressed A/AA violations, targeted focus/keyboard/mobile/touch/reduced-motion tests pass, and the manual 200% zoom/keyboard/screen-reader-responsive matrix is signed off.
8. Existing regression coverage passes; the header profile-name gap is covered; address default flows pass live without 409; no Phase 5-10 defect remains unresolved.
9. Missing/malformed config, Customer API outage, Identity outage, unauthorized session, and unknown ProblemDetails all show safe actionable feedback rather than a blank screen or raw detail.
10. The backend test-data blocker is resolved through an approved non-production mechanism. If it is not, Phase 11 status is **blocked**, never partially complete.

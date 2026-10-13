---
description: "Dependency-ordered implementation tasks for Phase 11 release hardening"
---

# Tasks: Phase 11 — Release Hardening and Customer Milestone

**Input**: Design documents in `specs/005-release-hardening/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`

**Scope**: Harden the existing standalone, zoneless Angular 22 customer application. No Delivery work, business capabilities, state-management framework, manual generated-client edit, or authentication redesign is authorized.

**Critical external gate**: The sibling backend currently has no approved Development/CI-only provisioner for the dedicated identity/profile/address, cart reset, or product availability toggle. Tasks requiring that capability are explicitly blocked until backend owners deliver it; do not replace it with personal credentials, mocks, direct SQL, or a production HTTP endpoint.

## Format

Every checklist item states its owner/files, type, expected result, and dependencies in the detail beneath it. `[P]` denotes work that may proceed in parallel only after the named dependencies are complete.

---

## Phase 1: Baseline and Preflight (A)

**Purpose**: Preserve measured evidence, make the customer-test timeout diagnosable, and establish the release-runbook record before changing configuration.

- [X] T001 Record the independent baseline commands, exit codes, durations, configured budgets, current build sizes, and known `maxWorkers: 1` timeout in `talabat-web/docs/customer-release-runbook.md`.
  - **Type**: Documentation / manual verification
  - **Expected result**: The runbook records the observed 184s configured-suite stall, 26.6s native-worker customer result, 425.38 kB initial build baseline, and the independent-stage budget table without introducing a combined gate command.
  - **Dependencies**: None.

- [X] T002 [P] Capture the current owning configuration and test boundaries in `talabat-web/package.json`, `talabat-web/angular.json`, and `talabat-web/projects/customer/vitest.config.ts` in the release-runbook baseline section.
  - **Type**: Manual verification / documentation
  - **Expected result**: The baseline names the existing scripts, the obsolete customer runner configuration, and the Angular budget thresholds so later changes are reviewable.
  - **Dependencies**: None.

**Checkpoint**: Baseline evidence is preserved; no application behavior has changed.

---

## Phase 2: Foundational Release Infrastructure (A, B, C)

**Purpose**: Establish deterministic independent stages and a safe E2E foundation. This phase blocks browser-scenario implementation.

- [X] T003 Remove the obsolete single-worker customer runner configuration from `talabat-web/angular.json` and delete `talabat-web/projects/customer/vitest.config.ts`.
  - **Type**: Configuration
  - **Expected result**: `npx ng test customer --watch=false` uses Angular’s native Vitest workers, reports test progress, and passes three consecutive clean runs within the 90s contract budget; any exposed isolation defect is fixed narrowly rather than restoring blanket serialization.
  - **Dependencies**: T001, T002.

- [X] T004 Add focused independent stage aliases in `talabat-web/package.json` for production build, bundle audit, E2E preflight, and E2E execution; update `talabat-web/package-lock.json` only for declared dependencies.
  - **Type**: Configuration
  - **Expected result**: Each required contract stage has a single, directly runnable command with inherited stdout/stderr and exit status; no monolithic `verify` wrapper is added.
  - **Dependencies**: T003.

- [X] T005 Add exact dev dependencies `@playwright/test@1.62.1` and `@axe-core/playwright@4.12.1` in `talabat-web/package.json` and `talabat-web/package-lock.json`, and ignore only Playwright reports/results in `talabat-web/.gitignore`.
  - **Type**: Dependency / configuration
  - **Expected result**: Chromium-only browser tooling is locked as dev-only dependencies; no browser auth storage, credentials, or runtime dependency is added.
  - **Dependencies**: T004.

- [X] T006 Create `talabat-web/playwright.config.ts` with Chromium-only, `workers: 1`, zero retries, fixed loopback topology validation, and certificate bypass limited to the configured localhost Identity/API origins.
  - **Type**: Configuration
  - **Expected result**: E2E execution is serial and isolated, rejects remote/unexpected origins or broad TLS bypass, and emits safe failure artifacts without storage state.
  - **Dependencies**: T005.

- [X] T007 Create fail-fast topology/credential preflight in `talabat-web/e2e/preflight.spec.ts` and a non-invoking provisioner contract boundary in `talabat-web/e2e/support/test-data.ts`.
  - **Type**: Test infrastructure
  - **Expected result**: Preflight validates non-echoed credentials, SPA public config, Identity discovery, and Customer API health; it rejects a missing/unversioned backend provisioner contract as `blocked-preflight` without attempting SQL, mocks, personal data, or an invented command interface.
  - **Dependencies**: T004, T006.

- [X] T008 Obtain and record backend-owner delivery evidence for a Development/CI-only provisioner command in `specs/005-release-hardening/contracts/e2e-environment.md` and `talabat-web/docs/customer-release-runbook.md`.
  - **Type**: External dependency / manual verification
  - **Real-database constraint**: The backend-owned command has documented `prepare`, `make-negative-product-unavailable`, and `restore` operations against only the real local Development/CI SQL Server database. It prepares synthetic baseline rows, never mocks/replaces EF Core persistence, exposes no database credentials or SQL access to the frontend, and is unavailable outside Development/CI.
  - **Handoff interface**: The existing backend Identity host supplies `--e2e-provision <prepare|make-negative-product-unavailable|restore> --output json`; it requires `Development`/`E2E`, an explicit enable flag, E2E credential environment variables, and a migration/connection check. Its final stdout line is versioned safe fixture metadata, not a password, token, connection string, or raw exception.
  - **Expected result**: A Development/CI-only backend startup seeder or CLI can idempotently repair the dedicated synthetic identity/profile/default/alternate address baseline, reset that user's cart, create or repair marker-owned happy/negative catalog fixtures, set the metadata-returned negative fixture available, make that same fixture unavailable after cart insertion, and restore it in `finally`/next run; it exposes no production HTTP endpoint.
  - **Dependencies**: T007. **Blocked externally until backend owners complete their separately governed work.**

**Checkpoint**: Native customer tests are no longer artificially serialized, and E2E preflight fails safely until the backend prerequisite is real.

---

## Phase 3: User Story 1 — Verification Pipeline Proves Customer Build Health (Priority: P1) (A)

**Goal**: A release engineer can run each frontend verification stage independently, with timing and failure output that identify the failed stage.

**Independent Test**: Run the independent commands in `contracts/verification-pipeline.md`; each returns an unambiguous exit code inside its budget, with the customer suite run three times after T003.

- [X] T009 [US1] Define the named per-stage CI timing/failure convention in `.github/workflows/customer-ci.yml` and document local recording in `talabat-web/docs/customer-release-runbook.md` without adding an aggregate wrapper.
  - **Type**: Tooling / documentation
  - **Expected result**: Every stage reports name, wall-clock duration, exit code, warnings, and its own stdout/stderr; a timeout identifies the stage instead of hiding it behind an aggregate command or new timing abstraction.
  - **Dependencies**: T004.

- [X] T010 [US1] Execute and record three consecutive native-worker customer runs plus each focused Angular/library stage in `talabat-web/docs/customer-release-runbook.md`.
  - **Type**: Manual verification
  - **Expected result**: The previous timeout cause is closed with measured evidence; failures, if any, remain visible and are not solved by inflating timeouts.
  - **Dependencies**: T003, T009.

**Checkpoint**: The independent unit/build pipeline is reproducible and diagnosable before live E2E is enabled.

---

## Phase 4: User Story 2 — End-to-End Customer Ordering Proof (Priority: P1) (B, C, D, E)

**Goal**: Chromium proves the real anonymous-to-order journey using a dedicated, live OIDC account and deterministic backend state.

**Independent Test**: After T008 is satisfied, `npm run e2e:preflight` and `npm run e2e` pass serially against `http://localhost:4200`, `https://localhost:7237`, and `https://localhost:7056` with no retry.

- [X] T011 [US2] Implement real OIDC sign-in and callback-cleanup helpers in `talabat-web/e2e/support/auth.ts`.
  - **Type**: E2E test infrastructure
  - **Expected result**: Each fresh browser context signs in through the Identity Razor form using only environment secrets, reaches the requested internal SPA route, and never persists or logs credentials/auth state.
  - **Dependencies**: T006, T007, T008.

- [X] T012 [US2] Implement safe request, storage, callback, and failure-artifact helpers in `talabat-web/e2e/support/network-audit.ts`.
  - **Type**: E2E test infrastructure
  - **Expected result**: Browser tests can fail on bearer leakage outside the exact protected Customer API boundary and attach only sanitized URL/console/network diagnostics.
  - **Dependencies**: T006, T011.

- [X] T013 [US2] Implement the serial live happy-path scenario in `talabat-web/e2e/customer-order.spec.ts`.
  - **Type**: E2E test
  - **Expected result**: In a fresh context, the test invokes `prepare`, reads `catalog.restaurant` and `catalog.happyProduct` runtime metadata, then proves anonymous catalog/menu, OIDC login, header/profile/default address, cart, checkout, one 201 order, emptied cart, and reload-safe dynamic `/orders/:id` detail verification without hardcoded database IDs.
  - **Dependencies**: T007, T008, T011, T012.

- [X] T014 [US2] Implement the deterministic unavailable-item scenario in `talabat-web/e2e/customer-order.spec.ts` using `prepare.catalog.negativeProduct` metadata and `talabat-web/e2e/support/test-data.ts`.
  - **Type**: E2E test
  - **Expected result**: The test invokes `prepare`, adds the metadata-returned available negative fixture, invokes only the approved setup capability to make that same marker-owned fixture unavailable, asserts safe notice/authenticated session/preserved cart/no new order, and invokes `restore` in `finally` and next-run setup.
  - **Dependencies**: T007, T008, T011, T012, T013.

**Checkpoint**: Both state-mutating live scenarios pass once with zero retry; if T008 is absent, this story remains blocked rather than partially claimed complete.

---

## Phase 5: User Story 3 — Authentication and Security Hardening Audit (Priority: P1) (F)

**Goal**: Preserve the proven OIDC architecture while closing the raw-error disclosure gap and adding only missing invariant evidence.

**Independent Test**: Focused `core-auth`, `core-http`, callback-page, and E2E network/storage assertions prove PKCE, return URL, callback cleanup, storage, exact token scope, and safe auth failure behavior.

- [X] T015 [P] [US3] Add callback URL/history and scoped transaction-storage cleanup assertions in `talabat-web/projects/customer/src/app/features/auth/signin-callback.page.spec.ts` and the owning `talabat-web/projects/core-auth/src/lib/*.spec.ts` files.
  - **Type**: Unit / integration test
  - **Expected result**: Successful and failed callbacks remove `code`, `state`, and `session_state` from URL/history; only consumed/stale `talabat.oidc.transaction.*` state is removed from session storage. PKCE remains authorization-code-only, its verifier never appears in a URL, and no client secret is configured.
  - **Dependencies**: T003.

- [X] T016 [P] [US3] Extend return-URL, in-memory storage, exact-origin/path interceptor, 401-once, and 403-no-loop assertions in the relevant `talabat-web/projects/core-auth/src/lib/*.spec.ts` files.
  - **Type**: Unit test
  - **Expected result**: Existing strict protection remains intact: hostile redirects and look-alike/Identity/static/foreign URLs receive no bearer token; application-owned storage contains no token/user snapshot/secret; auth failures do not loop.
  - **Dependencies**: T003.

- [X] T017 [US3] Sanitize unknown ProblemDetails in `talabat-web/projects/core-http/src/lib/problem-details.interceptor.ts` and add focused cases in `talabat-web/projects/core-http/src/lib/problem-details.interceptor.spec.ts`.
  - **Type**: Code / unit test
  - **Expected result**: Unknown backend errors become fixed public copy with no raw title, detail, extensions, correlation ID, or token; the existing typed checkout 422 adapter retains only generated fields it needs.
  - **Dependencies**: T003.

- [X] T018 [US3] Audit and correct raw-error rendering only in `talabat-web/projects/customer/src/app/features/auth/auth-check.page.ts`, `talabat-web/projects/customer/src/app/features/profile/pages/profile.page.ts`, `talabat-web/projects/customer/src/app/features/orders/pages/orders.page.ts`, and `talabat-web/projects/customer/src/app/features/catalog/pages/restaurant-list.page.ts` with their owning focused specs.
  - **Type**: Code audit / targeted test
  - **Expected result**: Known domain failures use feature-owned messages and unknown failures cannot render backend-provided technical fields; no unrelated UI redesign or duplicate regression test is introduced.
  - **Dependencies**: T017.

- [X] T019 [US3] Add live OIDC/network/storage invariant assertions to `talabat-web/e2e/support/network-audit.ts` and invoke them from `talabat-web/e2e/customer-order.spec.ts`.
  - **Type**: E2E test
  - **Expected result**: The real redirect flow confirms a clean callback URL, no persisted sensitive values after callback/sign-out, and no bearer header outside the exact Customer API protected boundary.
  - **Dependencies**: T008, T012, T013, T014.

**Checkpoint**: No authentication redesign is present; all security invariants have focused unit evidence and live confirmation once E2E is unblocked.

---

## Phase 6: User Story 4 — Accessibility Audit (Priority: P2) (G)

**Goal**: Automate meaningful semantic/focus checks for the core journey and retain a manual matrix for human-only acceptance.

**Independent Test**: Axe A/AA scans and targeted keyboard/focus/viewport/reduced-motion checks pass; manual acceptance covers real zoom and assistive-technology behavior.

- [X] T020 [US4] Create the shared axe fixture/report helper in `talabat-web/e2e/support/accessibility.ts`.
  - **Type**: E2E test infrastructure
  - **Expected result**: Stable anonymous and authenticated route scans use WCAG A/AA rules, report actionable violations, and do not broadly suppress rules or snapshot entire reports.
  - **Dependencies**: T005, T006, T008.

- [X] T021 [US4] Add axe scans, keyboard/focus checks, and invalid-form association assertions to `talabat-web/e2e/customer-order.spec.ts` plus the focused existing specs for `talabat-web/projects/customer/src/app/features/onboarding/components/onboarding-form.component.ts` and `talabat-web/projects/customer/src/app/features/profile/pages/profile.page.ts`.
  - **Type**: E2E test
  - **Expected result**: Tests verify visible focus, dialog initial focus, Tab containment, Escape/close restoration, `aria-invalid`/`aria-describedby` associations for invalid onboarding/profile forms, semantic/error states, and no unsuppressed A/AA violations on stable states.
  - **Dependencies**: T013, T014, T020.

- [X] T022 [US4] Add 320px overflow/operability, representative >=42px touch-target, and reduced-motion behavior checks in `talabat-web/e2e/customer-order.spec.ts`.
  - **Type**: E2E test
  - **Expected result**: Primary ordering controls remain reachable without document horizontal overflow at 320px and remain usable under `reducedMotion: 'reduce'`; only representative controls are measured to avoid brittle cosmetic assertions.
  - **Dependencies**: T013, T014, T020.

- [X] T023 [US4] Add the non-automatable keyboard, real 200% zoom, screen-reader, color-independent-state, and 320/768/1280 manual matrix to `talabat-web/docs/customer-release-runbook.md`.
  - **Type**: Manual verification / documentation
  - **Expected result**: Release reviewers can record environment/browser, pass/fail/blocked, and safe evidence for behavior Playwright cannot faithfully prove.
  - **Dependencies**: T001.

**Checkpoint**: Automation validates behavior rather than superficial attributes; human acceptance remains required for zoom and assistive technology.

---

## Phase 7: User Story 5 — Performance and Build Hardening (Priority: P2) (I)

**Goal**: Keep current budgets and lazy feature boundaries evidence-based, with no premature optimization.

**Independent Test**: A production stats build has no budget warning/error and the audit reports no customer feature source in the main bundle.

- [X] T024 [US5] Create the dependency-free stats audit in `talabat-web/tools/verify-customer-bundle.mjs`.
  - **Type**: Tooling
  - **Expected result**: The tool reads Angular `--stats-json`, prints initial/main/styles sizes and largest inputs, and fails if any `projects/customer/src/app/features/**` source appears in main.
  - **Dependencies**: T004.

- [X] T025 [US5] Wire `build:customer:production` and bundle-audit scripts in `talabat-web/package.json` to retain Angular’s chunk/budget output and run the stats audit after a production build.
  - **Type**: Configuration
  - **Expected result**: Existing 500 kB/1 MB initial and 4 kB/8 kB component-style budgets remain unchanged; build evidence is independently interpretable.
  - **Dependencies**: T024.

- [X] T026 [US5] Review `talabat-web/projects/customer/src/app/app.routes.ts`, `talabat-web/projects/customer/src/app/layout/routes.ts`, and generated production stats; fix only a measured eager feature import, oversized asset, or budget regression if found.
  - **Type**: Code audit / manual verification
  - **Expected result**: Catalog, onboarding, cart, checkout, profile, and orders retain lazy boundaries; no optimization is made when the baseline remains within budget and feature-free in main.
  - **Dependencies**: T025.

**Checkpoint**: Performance evidence is recorded without changing budgets to conceal a regression.

---

## Phase 8: User Story 6 — Runtime Failure Behavior (Priority: P2) (H)

**Goal**: Invalid runtime configuration and infrastructure failures show safe actionable feedback instead of blank or raw-error UI.

**Independent Test**: Core-config/bootstrap tests cover invalid config; targeted route/auth tests and manual outage checks prove safe retry/re-auth behavior.

- [X] T027 [US6] Validate the exact public runtime-config schema in `talabat-web/projects/core-config/src/lib/provide-app-config.ts` and add failure/valid-input cases in `talabat-web/projects/core-config/src/lib/provide-app-config.spec.ts`.
  - **Type**: Code / unit test
  - **Expected result**: Non-2xx/rejected fetch, malformed/non-object JSON, missing/extra keys, invalid authority/API URLs, and empty client/scopes fail before provider use; only allowed public values are accepted.
  - **Dependencies**: T003.

- [X] T028 [US6] Add a hard-coded accessible bootstrap fallback in `talabat-web/projects/customer/src/bootstrap-failure.ts`, call it from `talabat-web/projects/customer/src/main.ts`, and add `talabat-web/projects/customer/src/bootstrap-failure.spec.ts`.
  - **Type**: Code / unit test
  - **Expected result**: Config/bootstrap rejection renders a meaningful heading, explanation, and reload action into the host without interpolating caught error text, tokens, or stack details.
  - **Dependencies**: T027.

- [X] T029 [US6] Verify and fill only demonstrated retry/error-state gaps in `talabat-web/projects/customer/src/app/features/catalog/pages/restaurant-list.page.ts`, `talabat-web/projects/customer/src/app/features/orders/pages/orders.page.ts`, `talabat-web/projects/customer/src/app/features/profile/pages/profile.page.ts`, and their focused specs.
  - **Type**: Targeted integration test / code
  - **Expected result**: Customer API outage produces a safe retryable state on each server-driven route, unknown ProblemDetails show the generic copy from T017, and checkout is not automatically resubmitted after ambiguous transport failure.
  - **Dependencies**: T017, T018, T028.

- [X] T030 [US6] Add safe Identity-unavailable and unauthorized-session assertions in the relevant `talabat-web/projects/core-auth/src/lib/*.spec.ts` and `talabat-web/projects/customer/src/app/features/auth/*.spec.ts` files.
  - **Type**: Unit / integration test
  - **Expected result**: Identity failure gives actionable non-protocol copy; 401 clears once and offers re-authentication without looping; 403 remains an authorization result.
  - **Dependencies**: T016, T028.

**Checkpoint**: Runtime failures are user-visible, sanitized, and recoverable where a retry/re-auth action is safe.

---

## Phase 9: User Story 7 — OpenAPI and Generated-Client Workflow (Priority: P2) (J)

**Goal**: Verify committed generated source by safe temporary regeneration and make cross-repository copy reproducible without writing generated source during verification.

**Independent Test**: Tool tests cover drift diagnostics; `api:verify` performs structural checks plus a zero-diff temporary generation against the committed contract.

- [X] T031 [US7] Parameterize safe generator output and backend-root resolution in `talabat-web/tools/api-generator.mjs` and `talabat-web/tools/copy-openapi.mjs`; extend `talabat-web/tools/copy-openapi.test.mjs`.
  - **Type**: Tooling / Node test
  - **Expected result**: `api:copy` can use an explicit backend root for CI, `api:gen:customer` remains the guarded sole writer of committed source, and temporary generation never cleans or rewrites the worktree.
  - **Dependencies**: T004.

- [X] T032 [US7] Implement non-destructive temporary regeneration manifest comparison in `talabat-web/tools/verify-generated-api.mjs` and add drift/add/remove/change cases in `talabat-web/tools/verify-generated-api.test.mjs`.
  - **Type**: Tooling / Node test
  - **Expected result**: `api:verify` runs structural checks, generates to an OS temporary directory, reports sorted relative changed paths, excludes only deterministic generator metadata, cleans up in `finally`, and exits non-zero on drift.
  - **Dependencies**: T031.

- [X] T033 [US7] Update `talabat-web/package.json` and `talabat-web/docs/customer-release-runbook.md` with the explicit copy → generator build → committed generation → verification → diff workflow.
  - **Type**: Configuration / documentation
  - **Expected result**: Contract sync is pinned to an explicit backend root/ref, reproducible, and clearly separates reviewed generated/contract changes from Phase 11 application changes.
  - **Dependencies**: T031, T032.

**Checkpoint**: Generated-client verification catches real drift without dirtying committed generated source.

---

## Phase 10: User Story 8 — Regression Coverage for Pre-Phase-11 Fixes (Priority: P3) (K)

**Goal**: Add only the identified coverage gap while retaining existing strong coverage for prior fixes.

**Independent Test**: Focused header/profile tests prove reactive display update; existing checkout/address/cart/order tests continue to prove their already-covered fixes.

- [X] T034 [US8] Add the reactive authenticated profile-name assertion in `talabat-web/projects/customer/src/app/layout/header.component.spec.ts`.
  - **Type**: Component test
  - **Expected result**: The header greeting updates when the profile signal loads or changes after authentication; the test complements, rather than duplicates, `ProfileStore` loading coverage.
  - **Dependencies**: T003.

- [X] T035 [US8] Review and record existing coverage in `talabat-web/projects/customer/src/app/features/checkout/checkout.store.spec.ts`, profile/address store specs, and order confirmation/detail specs in `talabat-web/docs/customer-release-runbook.md`.
  - **Type**: Test audit / documentation
  - **Expected result**: The record confirms checkout override reset, cart clear, duplicate-submit suppression, default-address reconciliation, and reload-safe order detail coverage; no duplicate test is added solely for count.
  - **Dependencies**: T034.

- [ ] T036 [US8] Perform the live/manual address-default acceptance in `talabat-web/docs/customer-release-runbook.md` after the backend test environment is available.
  - **Type**: Manual verification
  - **Expected result**: Add-with-default and set-default complete without a 409 Conflict against SQL Server; failure leaves the Phase 11 gate open rather than being hidden by unit tests.
  - **Dependencies**: T008, T023.

**Checkpoint**: Meaningful historical regressions are covered once, with the only identified test delta added.

---

## Phase 11: Final Release Acceptance and Operations (L)

**Purpose**: Make CI, release operation, manual evidence, and the Phase 11 exit decision objective.

- [X] T037 Create independently timed frontend validation and gated live-E2E jobs in `.github/workflows/customer-ci.yml`.
  - **Type**: CI configuration
  - **Expected result**: Fast PR validation runs one named step per OpenAPI/generated-client/library/customer/build stage on the committed contract; a separately gated live-E2E job starts services with diagnostics, installs Chromium only, serializes the synthetic-account environment, and never uploads credentials/tokens/storage state.
  - **Dependencies**: T004, T006, T009, T025, T032.

- [ ] T038 Finalize operator prerequisites, failure triage, artifact-redaction policy, backend-ref recording, and the manual acceptance matrix in `talabat-web/docs/customer-release-runbook.md`.
  - **Type**: Documentation / manual verification
  - **Expected result**: A release engineer can start the supported services, set secrets without echoing them, interpret each independent stage, diagnose timeouts, and record pass/fail/blocked evidence without sensitive data.
  - **Dependencies**: T010, T019, T023, T026, T029, T033, T035, T036, T037.

- [ ] T039 Execute the ordered Phase 11 gate from `specs/005-release-hardening/contracts/verification-pipeline.md` and record exit code, duration, warnings, and evidence in `talabat-web/docs/customer-release-runbook.md`.
  - **Type**: Final manual verification
  - **Expected result**: Independently run `npm run test:openapi-tools`, `npm run api:verify`, all focused Angular/library tests, `npm run build:customer:production`, `npm run e2e:preflight`, and `npm run e2e`; require zero retries, no budget warning, zero generated diff, and all required manual checks. A failed preflight or missing T008 records Phase 11 as **blocked**, not passed.
  - **Dependencies**: T010, T014, T019, T021, T022, T025, T029, T030, T032, T034, T036, T037, T038.

---

## Dependencies and Execution Order

```text
T001/T002
  └─ T003 ─ T004 ─┬─ T005 ─ T006 ─ T007 ─ T008 (external gate)
                  │                         ├─ T011 ─ T012 ─ T013 ─ T014
                  │                         └─ T020 ─ T021/T022
                  ├─ T009 ─ T010
                  ├─ T024 ─ T025 ─ T026
                  └─ T031 ─ T032 ─ T033

T003 ─┬─ T015/T016 ─ T017 ─ T018
       ├─ T027 ─ T028 ─ T029/T030
       └─ T034 ─ T035 ─ T036 (after T008)

All completed evidence ─ T037/T038 ─ T039
```

### User-story dependencies

- **US1 (Verification Pipeline)**: Starts after foundational scripts/configuration (T003–T004). It does not depend on live services.
- **US2 (E2E Customer Ordering)**: Starts only after T008; it is the release-blocking external dependency.
- **US3 (Security)**: Unit work begins after T003; live confirmation depends on US2’s unblocked scenarios.
- **US4 (Accessibility)**: Browser automation depends on the E2E foundation and T008; manual matrix setup does not.
- **US5 (Performance)**: Starts after focused stage scripts; does not depend on E2E.
- **US6 (Runtime Failure)**: Starts after T003 and runs independently of live E2E, except manual outage confirmation in the final gate.
- **US7 (OpenAPI)**: Starts after focused stage scripts; does not depend on E2E.
- **US8 (Regression)**: Header coverage starts after T003; live address-default acceptance depends on T008.

### Genuine parallel opportunities

- After T003, T015, T016, T027, and T034 touch distinct owners and can proceed in parallel.
- After T004, the OpenAPI chain (T031–T033), build-audit chain (T024–T026), and E2E dependency installation/configuration (T005–T007) can proceed in parallel.
- After T008, browser support/scenario work follows its shared-file dependencies; do not parallelize T013/T014/T021/T022 because they share the account, fixture state, and `customer-order.spec.ts`.

## Implementation Strategy

### MVP / release-blocker first

1. Complete baseline and foundational work (T001–T007), including the native-worker fix.
2. Complete US1, US3 unit fixes, US6 bootstrap/error safety, and US7 verification tooling without waiting for live E2E data.
3. Obtain and validate T008. If it cannot be delivered, report the milestone as blocked; do not fabricate test state.
4. Complete US2 live scenarios, their security/a11y checks, then run the final gate.

### Objective Phase 11 exit criterion

Phase 11 exits only when T039 records every independent stage as passing within its contract budget, the customer suite passes three consecutive native-worker runs, regeneration has a zero diff, production budgets/lazy audit pass, live preflight and both serial E2E scenarios pass using the approved synthetic data mechanism, security/a11y/runtime/manual evidence passes, and no sensitive information appears in output or artifacts. Otherwise the release remains **blocked**.

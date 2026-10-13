# Phase 11 Research

## R1: Customer test timeout

**Decision**: Remove the customer `maxWorkers: 1` Vitest override and use Angular's native unit-test runner defaults.

**Rationale**: The checked-in command exceeded 184 seconds with no progress. The same 31 files and 221 tests passed in 26.6 seconds with `--no-runner-config`. One selected file took 60.1 seconds under the custom config, including 28.2 seconds of environment work. The bottleneck is configuration, not test volume or OpenAPI tooling.

**Alternatives considered**: Increase the combined timeout (rejects diagnosability); split the customer suite permanently by folder (unnecessary after native parallelism); keep one worker for determinism (appropriate for shared-state E2E, not isolated unit files).

## R2: E2E framework

**Decision**: Add exact dev dependencies `@playwright/test@1.62.1` and `@axe-core/playwright@4.12.1`; execute Chromium only.

**Rationale**: Playwright officially supports current Node 24, bundles its runner/assertions/isolation/tracing, installs a selected browser for CI, supports web-server readiness and HTTPS-error configuration, and can observe cross-origin browser traffic. OIDC can follow the normal SPA -> Identity -> SPA redirect without a framework-specific origin callback. Browser contexts give clean non-persistent isolation. Playwright's maintained accessibility guide recommends axe and explicitly says manual assessment remains necessary.

**Alternatives considered**:

- Cypress 15.20 supports Node 24 and good isolation, but Cypress 14+ requires `cy.origin()` for cross-origin navigation. That is needless ceremony and maintenance for the core OIDC flow.
- WebdriverIO 9 supports Node >=18.20 but needs more runner/service/driver configuration and provides no repository-specific advantage for two browser journeys.
- Angular unit browser mode is not a full multi-origin E2E harness and does not own live service/test-data orchestration.
- Hand-written Playwright library scripts avoid one package layer but lose the integrated test runner, fixtures, assertions, reports, and isolation.

**Primary sources**:

- [Playwright installation and Node/system support](https://playwright.dev/docs/intro)
- [Playwright configuration and webServer](https://playwright.dev/docs/test-configuration)
- [Playwright CI guidance](https://playwright.dev/docs/ci)
- [Playwright browser-context isolation/authentication](https://playwright.dev/docs/auth)
- [Cypress cross-origin requirement](https://docs.cypress.io/api/commands/origin)
- [Cypress test isolation](https://docs.cypress.io/app/core-concepts/test-isolation)

## R3: Authentication strategy inside E2E

**Decision**: Perform real UI OIDC login in each scenario; do not save or inject Playwright `storageState`.

**Rationale**: The milestone must prove redirects, callback cleanup, PKCE transaction completion, and the in-memory auth store. Persisted browser state would not contain the application memory token and would bypass the most important integration boundary. Two serial scenarios keep repeated login cost acceptable.

**Alternatives considered**: API login (no suitable OAuth shortcut and would bypass Razor/OIDC); persisted storage state (conflicts with in-memory user storage and can contain sensitive impersonation data); one long test containing both scenarios (weak isolation and poor failure localization).

## R4: Test-data architecture

**Decision**: Treat backend provisioning/reset as a blocking prerequisite. Require an idempotent Development/CI-only startup seeder or CLI; forbid a production test endpoint, personal account, mocks for the happy path, or ad-hoc direct SQL from browser tests.

**Rationale**: The backend's `IdentityDataSeeder` creates roles only. Catalog migrations create stable available products, but no identity/profile/address. No public catalog mutation exists, so the required checkout-time availability transition cannot currently be created safely. Backend integration factories are not the live HTTPS hosts. Claiming determinism now would be false.

**Alternatives considered**: Register/onboard every run (cannot reset persistent identity safely and violates pre-seeded baseline); manual one-time account only (cannot support ephemeral CI or product toggle); SQL scripts (couple E2E to schema and bypass domain behavior); HTTP test controller (production attack surface); mocked network responses (violates live-backend requirement).

## R5: OpenAPI drift verification

**Decision**: Regenerate into an OS temp directory and compare a sorted content manifest with committed generated source.

**Rationale**: The current verifier checks architecture but cannot detect a stale generated file whose shape still satisfies assertions. The custom generator's JUnit test already proves two generated manifests are deterministic. A temp output protects the worktree and gives precise added/removed/changed diagnostics.

**Alternatives considered**: Regenerate committed source then use `git diff` (destructive and dirty-worktree dependent); compare only hashes recorded in a manifest (manifest can become stale with source); generate during normal build (slower and violates committed-generated-client decision).

## R6: CI platform and stage boundaries

**Decision**: Use independent GitHub Actions steps/jobs, matching the sibling backend repository; keep ordinary frontend validation based on the committed OpenAPI contract and reserve cross-repository `api:copy` for an explicit release/manual workflow pinned to a backend ref.

**Rationale**: The frontend has no CI yet; the backend already uses GitHub Actions, Ubuntu, .NET 10, and SQL Server. Independent steps preserve logs/timings and prevent a slow customer test from hiding OpenAPI/build results. A floating backend checkout would make frontend PRs nondeterministic.

**Alternatives considered**: One npm verify chain (recreates the diagnosed opacity); make every frontend PR clone the backend default branch (cross-repo drift/race); introduce a CI vendor (unnecessary dependency and operations cost).

## R7: Accessibility coverage

**Decision**: Combine existing Angular behavior tests, Playwright + axe scans, targeted browser behavior checks, and a manual matrix.

**Rationale**: Axe finds common semantic, label, ID, and contrast failures but cannot determine meaningful keyboard order, focus restoration, zoom usability, touch comfort, or whether error guidance makes sense. Playwright provides focus/viewport assertions and reduced-motion emulation; actual 200% zoom and assistive-technology behavior remain manual.

**Alternatives considered**: Axe-only (superficial); all-manual (not regression-friendly); broad DOM assertions such as “every element has aria-label” (incorrect semantics and brittle).

**Primary source**: [Playwright accessibility testing guidance](https://playwright.dev/docs/next/accessibility-testing).

## R8: Security hardening scope

**Decision**: Preserve the current auth design and fix only evidenced gaps: raw ProblemDetails display, missing callback-cleanup assertions, and visible bootstrap failure.

**Rationale**: PKCE, return URL validation, in-memory user storage, transaction cleanup path, strict origin/path token scoping, and 401/403 transitions already exist with focused tests. Replacing them would create risk. Backend `title`/`detail` are currently rendered directly, and bootstrap failure currently leaves a blank host; both violate the Phase 11 spec.

**Alternatives considered**: Replace `oidc-client-ts` (no evidence); broaden bearer matching to the entire API origin (unnecessary and weaker than current protected-path restriction); expose technical detail behind a debug flag (still risks browser disclosure).

## R9: Performance strategy

**Decision**: Preserve budgets and lazy architecture, add a stats-based evidence check, and do not optimize current dependencies.

**Rationale**: The measured initial bundle is 425.38 kB and contains no customer feature source in main. Angular, router, and OIDC are expected dominant inputs. The current evidence does not justify dependency rewrites or `@defer` changes.

**Alternatives considered**: Raise budgets (no need); split generated-client imports immediately (unmeasured micro-optimization); add a bundle-visualizer dependency (a small Node stats reader is sufficient for the required gate).

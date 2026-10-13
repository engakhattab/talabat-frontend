# Feature Specification: Release Hardening and Customer Milestone

**Feature Branch**: `005-release-hardening`

**Created**: 2026-08-09

**Status**: Draft / Spec Approved

**Input**: User description: "Phase 11 â€” Release Hardening and Customer Milestone. Prove that the completed Talabat Customer ordering journey is functionally reliable, secure, accessible, responsive, performant within existing budgets, regenerable from the OpenAPI contract, testable in CI, and operationally understandable. No new business features."

## Clarifications

### Session 2026-08-09

- Q: Should the E2E test suite execute against live local backend services (Identity and Customer API) using pre-seeded test customer credentials, or run using mocked API/OIDC HTTP responses? â†’ A: Live backend execution against real local services (`http://localhost:4200`, `https://localhost:7237`, `https://localhost:7056`) using a dedicated test customer identity (no mocks for the happy path).
- Q: Which primary negative scenario should be deterministically verified in the automated E2E test suite alongside the happy path? â†’ A: Checkout Item Availability Failure. The test must verify that an item availability error is rejected by the backend, displays a safe user-friendly notice without technical details, keeps the authenticated session valid, preserves cart state for recovery, and does not falsely record an order.
- Q: How should test data (such as orders placed and delivery addresses selected during E2E test runs) be managed across repeated automated executions? â†’ A: Dedicated Test Account with Cumulative History. Tests use a dedicated E2E test customer identity with pre-seeded baseline profile/address data; completed orders accumulate in order history without production-only cleanup endpoints. Transient state (cart, checkout address selection) is initialized deterministically before each run, and the order verification uses the dynamic order ID returned from checkout response navigation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 â€” Verification Pipeline Proves Customer Build Health (Priority: P1)

A release engineer runs a defined set of independent verification commands and receives clear, deterministic pass/fail results within agreed time budgets. Each command is independently executable and its output identifies specific failures without requiring manual interpretation.

**Why this priority**: Without a reliable verification pipeline, no other Phase 11 outcome can be objectively proven. The current baseline has a documented timeout issue with the combined verify/test/build command that must be diagnosed and resolved first.

**Independent Test**: Run each verification command independently with captured timing and output; every command must complete within its documented time budget and report pass/fail unambiguously.

**Acceptance Scenarios**:

1. **Given** the workspace is in a clean committed state, **When** each of the following commands is run independently: `npm run test:openapi-tools`, `npm run api:verify`, `npx ng test customer --watch=false`, `npx ng test core-config --watch=false`, `npx ng test core-auth --watch=false`, `npx ng test core-http --watch=false`, `npx ng test shared-ui --watch=false`, `npx ng build customer --configuration=production`, **Then** every command completes within its documented time budget and exits with code 0.
2. **Given** a previously timed-out combined command, **When** the root cause is investigated, **Then** the cause is identified and documented, the offending step is fixed or isolated, and no command masks a real failure by relying on an inflated timeout.
3. **Given** all verification commands pass, **When** results are reviewed, **Then** the pass/fail status, execution time, and any warnings are unambiguously interpretable by a person who did not write the tests.

---

### User Story 2 â€” End-to-End Customer Ordering Proof (Priority: P1)

A realistic browser test proves the complete authenticated customer happy path from anonymous catalog browsing through order confirmation. The test uses an isolated test identity â€” never a developer's personal account â€” and exercises the full SPA routing, OIDC flow, and backend interaction.

**Why this priority**: The customer ordering milestone cannot be declared without proving the integrated journey works in a real browser against the actual backend services.

**Independent Test**: Execute the E2E happy-path scenario against running Identity and Customer API services; the test must pass deterministically without manual intervention.

**Acceptance Scenarios**:

1. **Given** Identity and Customer API are running with deterministic catalog/seed data and a provisioned test identity, **When** the E2E happy path runs, **Then** the following steps complete successfully in sequence: anonymous catalog browsing â†’ OIDC sign-in â†’ authenticated customer state in the header â†’ profile and saved address available â†’ navigate to a restaurant menu â†’ add an item to the cart â†’ view cart â†’ proceed to checkout â†’ select delivery address â†’ place order â†’ 201 success â†’ navigate to order detail/confirmation page.
2. **Given** the happy-path test passes, **When** the test is run again without backend state changes, **Then** it produces the same result (deterministic).
3. **Given** a high-risk negative condition can be deterministically induced by the test environment (e.g., expired/unauthorized session or unavailable checkout item), **When** the negative-path E2E test runs, **Then** the SPA displays a meaningful user-facing error without exposing tokens, stack traces, or raw protocol details.

---

### User Story 3 â€” Authentication and Security Hardening Audit (Priority: P1)

A security reviewer can verify that the SPA's OIDC implementation, token handling, and network behavior meet the defined security invariants without finding credential exposure, token leakage, or open redirect vulnerabilities.

**Why this priority**: Security failures in authentication and token handling are high-severity defects that block any production release. These invariants must be verified before declaring the customer milestone.

**Independent Test**: Audit the SPA's OIDC flow, interceptor behavior, runtime configuration, and browser storage by inspecting code and observing live network behavior.

**Acceptance Scenarios**:

1. **Given** the customer SPA completes OIDC sign-in, **When** the callback page finishes processing, **Then** normal callback protocol values (`code`, `state`, `session_state`, and `iss` when supplied) no longer remain in the application URL or history. The PKCE `code_verifier` never appears in either URL and is removed from scoped transient OIDC transaction storage after code exchange.
2. **Given** an authenticated session, **When** HTTP requests are made, **Then** the bearer token is attached only to requests whose URL starts with the exact `customerApiBaseUrl` configured at runtime; requests to the Identity authority, static asset paths, and any other origin do not include the bearer token.
3. **Given** the customer SPA is loaded, **When** browser localStorage and sessionStorage are inspected, **Then** application-owned code stores no access token, refresh token, client secret, or user snapshot. During an in-progress authorization-code exchange, the OIDC library may use scoped transient transaction storage for the PKCE verifier; it is removed when consumed or stale and is never persisted by application-owned code.
4. **Given** the runtime configuration file (`config.json`) is inspected, **When** its contents are reviewed, **Then** it contains only public configuration values (authority URL, client ID, API base URL, scopes) and no secrets, private keys, or server credentials.
5. **Given** a sign-in flow, **When** the return URL is validated after callback, **Then** only validated internal application routes are accepted as redirection targets; external URLs or arbitrary query-parameter destinations are rejected.
6. **Given** a backend error occurs, **When** the error is displayed to the user, **Then** no raw backend stack trace, internal error detail, correlation ID, or token value is rendered in the UI.

---

### User Story 4 â€” Accessibility Audit (Priority: P2)

A user with assistive technology, keyboard-only input, or limited vision can complete the core customer ordering journey and manage their profile/addresses without encountering barriers. All completed customer routes meet baseline accessibility criteria.

**Why this priority**: Accessibility is a release quality gate, but its verification depends on the functional journey being complete and correct first.

**Independent Test**: Navigate all customer routes using keyboard-only, verify focus management, test at 200% zoom and 320px viewport, and verify color-independent meaning for status/error states.

**Acceptance Scenarios**:

1. **Given** any completed customer route, **When** a user navigates using keyboard only (Tab, Shift+Tab, Enter, Escape, Arrow keys), **Then** all interactive controls are reachable, a visible focus indicator is always present, and no focus trap occurs outside of modal/sheet overlays.
2. **Given** a modal or sheet overlay is opened, **When** the overlay appears, **Then** focus moves into the overlay; pressing Escape or the close action returns focus to the triggering element; Tab cannot leave the overlay while it is open.
3. **Given** a form (onboarding, profile edit, address create), **When** the form is submitted with invalid input, **Then** error messages are associated with their fields via `aria-describedby` or equivalent, and a screen reader announces the error state.
4. **Given** any customer route, **When** the browser viewport is set to 320px width, **Then** no content is clipped, horizontally scrolled, or overlapping; all interactive controls remain operable.
5. **Given** any customer route, **When** the browser zoom is set to 200%, **Then** text is readable, layout adapts gracefully, and no interactive control becomes unreachable or overlaps other content.
6. **Given** any status or error indicator, **When** its meaning is conveyed, **Then** color alone is not the sole differentiator; text, icon, or pattern also communicates the state.
7. **Given** any interactive control, **When** its touch target is measured, **Then** the minimum touch target height is at least 42px for the customer application.

---

### User Story 5 â€” Performance and Build Hardening (Priority: P2)

A build engineer can verify that the production build respects current bundle budgets, all features are lazy-loaded as designed, and no unnecessary heavy imports or redundant runtime work have been introduced.

**Why this priority**: Performance regressions in bundle size or eager loading could degrade the user experience and must be caught before release, but they are not blocking unless budgets are exceeded.

**Independent Test**: Run the production build and inspect bundle output for budget compliance, eager imports, and lazy-route boundaries.

**Acceptance Scenarios**:

1. **Given** the production build is run (`ng build customer --configuration=production`), **When** the build completes, **Then** no budget warning or error is emitted for the currently configured thresholds (initial: 500 kB warning / 1 MB error; component style: 4 kB warning / 8 kB error).
2. **Given** the route configuration in `app.routes.ts` and `layout/routes.ts`, **When** the lazy-loading boundaries are inspected, **Then** every feature route (catalog, onboarding, cart, checkout, profile, orders) loads via `loadChildren` or `loadComponent` and no feature module is eagerly imported in the main bundle.
3. **Given** the production bundle output, **When** the initial chunk composition is reviewed, **Then** no feature-specific code (cart, checkout, orders, profile, onboarding) appears in the initial/main JavaScript bundle.

---

### User Story 6 â€” Runtime Failure Behavior (Priority: P2)

When the runtime environment degrades or configuration is invalid, the customer SPA displays meaningful feedback to the user without exposing internal details, tokens, or stack traces.

**Why this priority**: Users and operators need predictable, safe behavior when infrastructure fails; raw errors or blank screens are unacceptable for a released product.

**Independent Test**: Simulate each failure condition and verify the user-facing behavior.

**Acceptance Scenarios**:

1. **Given** the runtime configuration file (`config.json`) is missing or unreachable, **When** the application starts, **Then** the application does not render a blank screen; it shows an understandable error message indicating configuration could not be loaded.
2. **Given** the runtime configuration file contains malformed JSON, **When** the application starts, **Then** the application fails fast with a meaningful message rather than rendering a partially functional or broken state.
3. **Given** the Customer API is completely unavailable, **When** any API-dependent route is visited, **Then** the route displays an error state with a retry option; no blank screen, unhandled promise rejection, or raw HTTP error is shown to the user.
4. **Given** the Identity authority is unreachable, **When** the user attempts to sign in, **Then** the application displays a meaningful error about the authentication service being unavailable; no OIDC protocol details or library stack traces are exposed.
5. **Given** an active authenticated session, **When** the session becomes unauthorized (401), **Then** the application clears authentication state, informs the user, and offers re-authentication without entering an infinite redirect loop.
6. **Given** a backend returns an unknown ProblemDetails response (an `errorCode` not mapped by the application), **When** the error is displayed, **Then** a safe generic error message is shown; the raw `errorCode`, `detail`, or `extensions` are never rendered directly.

---

### User Story 7 â€” OpenAPI and Generated-Client Workflow (Priority: P2)

An engineer can reproduce the full OpenAPI contract workflow (copy â†’ build generator â†’ generate â†’ verify) and confirm the generated client matches the committed backend contract without manual edits.

**Why this priority**: The generated client is the sole API access layer. If the workflow is broken or produces unexpected drift, all API-dependent features are at risk.

**Independent Test**: Run the contract workflow commands and verify generated output matches committed source.

**Acceptance Scenarios**:

1. **Given** the backend OpenAPI specification has not changed, **When** `npm run api:copy`, `npm run api:generator:build`, `npm run api:gen:customer`, and `npm run api:verify` are run in sequence, **Then** all commands exit successfully with code 0 and no unexpected diff is produced in `projects/api-customer/src`.
2. **Given** the generated client source in the repository, **When** `npm run api:verify` is executed, **Then** it confirms no drift between the committed generated source and the current contract.
3. **Given** the `npm run test:openapi-tools` command, **When** it is executed, **Then** all OpenAPI tooling tests pass.

---

### User Story 8 â€” Regression Coverage for Pre-Phase-11 Fixes (Priority: P3)

Defects fixed before Phase 11 are covered by tests that prevent their recurrence. No adequate existing test is duplicated solely to increase test count.

**Why this priority**: Known regressions are lower priority than proving the forward journey, but they must not silently re-emerge after a release.

**Independent Test**: Run the relevant unit test suites and verify that each known regression has explicit test coverage.

**Acceptance Scenarios**:

1. **Given** the fix for "customer profile/name does not appear immediately after sign-in" (ProfileStore reactive loading, HeaderComponent computed greeting), **When** the relevant unit tests in `profile.store.spec.ts` and `header.component.spec.ts` are run, **Then** they verify that authentication triggers automatic profile loading and the header greeting updates reactively.
2. **Given** the fix for "checkout temporary address override leaks into the next order" (CheckoutStore.overrideAddressIdState reset on 201), **When** the `checkout.store.spec.ts` test suite is run, **Then** it verifies that a non-default address selection is cleared after successful order placement and the next checkout session initializes from the profile default address.
3. **Given** the fix for "Set Default Address returns concurrency conflict" (backend sequential save), **When** address set-default and add-with-default operations are exercised in the E2E flow or manual acceptance, **Then** the operations complete successfully without 409 Conflict errors.
4. **Given** all pre-Phase-11 fixes have existing test coverage, **When** the unit test suite runs, **Then** no new duplicate tests are added for scenarios already adequately covered by existing assertions.

---

### Edge Cases

- What happens if the test identity's profile or addresses are deleted between E2E test runs?
- What happens if the backend catalog has no active restaurants during E2E execution?
- What happens if the Identity server's TLS certificate is expired or untrusted?
- What happens if a production build budget is exceeded after a Phase 5â€“10 dependency update?
- What happens if the OIDC library's session storage behavior changes in an update?
- What happens if the customer has no addresses and navigates directly to `/checkout`?
- What happens if only one address exists and it is removed?

## Requirements *(mandatory)*

### Functional Requirements

#### Verification Pipeline

- **FR-001**: The project MUST provide independently executable verification commands for: OpenAPI tooling tests, generated API client verification, each library's unit tests, customer application unit tests, and production build.
- **FR-002**: Each verification command MUST complete within a documented time budget and report pass/fail unambiguously via exit code.
- **FR-003**: The previously observed combined verification timeout MUST be diagnosed with a documented root cause and resolution.

#### End-to-End Proof

- **FR-004**: The project MUST include one automated browser E2E test covering the complete authenticated customer ordering happy path against live local services (`http://localhost:4200`, `https://localhost:7237`, `https://localhost:7056`): anonymous catalog â†’ OIDC sign-in â†’ authenticated state â†’ profile/address availability â†’ restaurant menu â†’ add item â†’ cart â†’ checkout â†’ order â†’ confirmation.
- **FR-005**: The E2E test MUST use a dedicated isolated test identity and marker-owned E2E catalog fixtures with pre-seeded baseline profile/address data — never a developer's personal account or shared developer catalog data. Runtime fixture IDs MUST come from backend `prepare` metadata; completed test orders MAY accumulate, and new order verification MUST use the dynamic order ID returned from checkout navigation.
- **FR-006**: The project MUST include an automated negative-path E2E test verifying a Checkout Item Availability Failure, proving that the backend rejection displays a safe user-friendly notice, retains the valid authenticated session, preserves cart state for recovery, and does not record an order.

#### Security Invariants

- **FR-007**: Authorization Code + PKCE flow MUST remain the sole authentication mechanism; no SPA-owned credential forms exist.
- **FR-008**: Callback protocol values (`code`, `state`, `session_state`, and `iss` when present) MAY appear in the authorization response URL but MUST be removed from the application URL/history after successful processing. The PKCE `code_verifier` MUST NEVER appear in an authorization or callback URL; it is temporary OIDC transaction state and only consumed/stale scoped `talabat.oidc.transaction.*` storage is cleaned.
- **FR-009**: Internal return destinations MUST be validated; open redirect to external URLs MUST be prevented.
- **FR-010**: No access token, refresh token, client secret, or application-owned user snapshot MUST appear in localStorage or sessionStorage. The OIDC library's scoped temporary PKCE transaction entry is permitted only during code exchange and MUST be removed when consumed or stale; the application MUST NOT clear unrelated sessionStorage.
- **FR-011**: Bearer token MUST be attached only to requests whose URL begins with the exact configured `customerApiBaseUrl`; Identity, assets, and all other origins MUST NOT receive the bearer token.
- **FR-012**: Runtime configuration MUST contain only public values (authority, client ID, base URL, scopes); no secrets or private keys.
- **FR-013**: Raw backend error details, stack traces, tokens, and protocol internals MUST NOT be rendered in the UI.

#### Accessibility

- **FR-014**: All completed customer routes MUST be operable by keyboard alone with visible focus indicators.
- **FR-015**: Modal and sheet overlays MUST trap focus, manage initial focus, and restore focus to the trigger on close.
- **FR-016**: Form validation errors MUST be programmatically associated with their fields.
- **FR-017**: The application MUST remain usable at 320px viewport width without horizontal scrolling of primary content.
- **FR-018**: The application MUST remain usable at 200% browser zoom without content loss or control overlap.
- **FR-019**: Color MUST NOT be the sole means of conveying status, error, or state information.
- **FR-020**: Interactive controls MUST meet the 42px minimum touch target height.
- **FR-021**: Where animations exist, `prefers-reduced-motion` MUST be respected.

#### Performance and Build

- **FR-022**: The production build MUST pass within currently configured bundle budgets (initial: 500 kB warning / 1 MB error; component style: 4 kB warning / 8 kB error) without budget relaxation unless measured evidence justifies a reviewed change.
- **FR-023**: All feature routes MUST remain lazy-loaded; no feature code MUST appear in the initial/main bundle.
- **FR-024**: No speculative optimization MUST be performed; changes are evidence-driven only.

#### Runtime Failure

- **FR-025**: Missing or malformed runtime configuration MUST produce a visible, understandable error message â€” not a blank screen.
- **FR-026**: Customer API unavailability MUST result in retryable error states on affected routes.
- **FR-027**: Identity unavailability MUST produce a meaningful authentication error without exposing OIDC internals.
- **FR-028**: Unauthorized sessions (401) MUST clear auth state and offer re-authentication without redirect loops.
- **FR-029**: Unknown ProblemDetails responses MUST display safe generic messages without rendering raw `errorCode`, `detail`, or `extensions`.

#### OpenAPI Workflow

- **FR-030**: The contract workflow (`api:copy` â†’ `api:generator:build` â†’ `api:gen:customer` â†’ `api:verify`) MUST complete successfully against the committed contract and produce no unexpected diff.
- **FR-031**: Generated client source under `projects/api-customer/src` MUST NOT be manually edited.
- **FR-032**: OpenAPI tooling tests (`npm run test:openapi-tools`) MUST pass.

#### Regression Coverage

- **FR-033**: Unit tests MUST exist covering the ProfileStore reactive authentication loading and HeaderComponent computed greeting reactivity.
- **FR-034**: Unit tests MUST exist covering CheckoutStore address override reset after successful order placement.
- **FR-035**: The address default/set-default flow MUST be verified as functional without concurrency conflicts.

### Key Entities

- **Verification Command**: An independently executable npm/ng command with defined time budget and pass/fail semantics.
- **Test Identity**: An isolated, provisioned OIDC user identity with customer profile and addresses, used exclusively for automated testing.
- **Bundle Budget**: Configured size threshold for production build output; currently initial 500 kB (warn) / 1 MB (error).
- **Security Invariant**: A property of the system that must hold true at all times; violation blocks release.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All verification pipeline commands pass independently and complete within their documented time budgets on a clean workspace.
- **SC-002**: The E2E customer ordering happy path completes successfully from anonymous browsing through order confirmation in a real browser using an isolated test identity.
- **SC-003**: No access token, refresh token, or PKCE verifier is found in browser persistent storage after complete sign-in/sign-out cycles.
- **SC-004**: Bearer tokens are observed only on requests to the configured Customer API origin; zero token leakage to other origins.
- **SC-005**: All completed customer routes are operable by keyboard with visible focus, and are usable at 320px width and 200% browser zoom.
- **SC-006**: The production build passes without budget warnings or errors at current thresholds.
- **SC-007**: The OpenAPI contract workflow reproduces cleanly with no drift detected by `api:verify`.
- **SC-008**: All pre-Phase-11 regression tests pass and cover the documented fix behaviors.
- **SC-009**: Runtime configuration failure, API unavailability, and unauthorized sessions produce user-facing feedback without exposing internal details.

## Assumptions

- Phases 5â€“10 have been completed and their exit criteria met before Phase 11 begins.
- Identity (`Talabat.Identity`) and Customer API (`Talabat.Customer.API`) are available as local or staging services for E2E testing.
- The backend `prepare` provisioner creates or repairs marker-owned E2E restaurant/products in the real Development/E2E database and returns their runtime IDs; shared development catalog rows are not E2E fixtures.
- A test identity can be provisioned through Identity server configuration or a backend seed mechanism; no runtime user-registration UI exists in the SPA.
- The OIDC library's browser-session behavior has been documented and its minimal transient storage (if any) is understood and accepted.
- Current production bundle budgets (500 kB / 1 MB initial, 4 kB / 8 kB component style) are appropriate unless measured evidence in this phase proves otherwise.
- No new business features, delivery app work, or speculative refactoring is in scope.
- The E2E framework selection is an implementation decision (not prescribed by this specification); the chosen framework must be compatible with the Angular 22 workspace.
- Backend error codes observed on the wire match expectations from previous phase implementations; any newly discovered mismatches are documented and fixed within Phase 5â€“10 scope.

## External Decision Gates

- **Test Identity Strategy**: How the isolated test user identity, customer profile, and delivery addresses are provisioned, maintained, and cleaned up between test runs must be decided before E2E tests can be reliable.
- **E2E Framework Selection**: The browser E2E runner (e.g., Playwright, Cypress, or another supported option) must be evaluated against Angular 22 workspace compatibility, CI environment constraints, and OIDC flow support before implementation.
- **Deterministic Backend Data**: The strategy for ensuring predictable catalog, restaurant, and product data exists during E2E execution must be established.
- **CI Runtime Constraints**: CI platform, available browser environment, and maximum execution time budgets must be agreed when defining the verification pipeline completion criteria.


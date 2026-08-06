# Implementation Plan: Phase 7 Customer Shell, Profile Gate, Onboarding, and Restaurant Menu

**Branch**: `001-customer-shell-onboarding-menu` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Clarified Phase 7 feature specification plus the latest planning instruction, which supersedes the specification's local fake-cart requirements.

## Summary

Phase 7 will turn the committed Phase 5 UI and Phase 6 authentication foundations into a lazy customer application shell with public restaurant list/menu routes, customer-app-owned profile session state, profile-aware routing, and accessible Signal Forms onboarding. All HTTP access remains through generated `@talabat/api-customer` services, all customer-domain state remains outside `core-auth`, and existing OIDC callback, token, interceptor, and return-URL behavior remains intact.

Repository evidence changes several specification assumptions. The generated menu operation is `CatalogApiService.getRestaurantMenu({ restaurantId })`, `MenuProductDto` exposes `isAvailable` and no image URL, and `CreateProfileRequest.phoneNumber` is required but nullable. The backend exposes no stable field-error dictionary and returns a noncanonical create-profile body when whitespace is normalized. The design therefore uses a root server-error summary, deliberately refetches the profile after successful creation, renders a stable product placeholder rather than inventing product images, and adds typed Phase 7 error codes only for owned user actions.

The latest user direction supersedes Q7/Q8, FR-014/FR-019, the local-cart entity, and related success criteria where they require fake local cart count, item state, or an "Added" success. Phase 7 exposes a narrow `CartEntryRequest` UI event but does not claim the item was added. The shell cart entry is labelled as an ordering preview and opens an informative CDK dialog/sheet describing that cart creation begins in Phase 8; it shows no fabricated count. Phase 8 must replace the coordinator with generated server-cart mutations and server-derived count/totals.

## Baseline And Preflight

Implementation is blocked until every item below passes and its evidence is committed:

1. Complete the pending live Phase 6 OIDC matrix in `docs/phase-6-secure-oidc-authentication-implementation-report.md`, including browser sign-in/callback, authenticated `GET /api/me/profile`, token scoping, browser storage, reload, sign-out, tampered callback, and refresh-failure evidence.
2. Commit the Phase 6 live-verification report/addendum before Phase 7 source work. Phase 6 implementation commit `4fb244e` exists, but the report at current HEAD still marks the live flow pending.
3. Establish the `001-customer-shell-onboarding-menu` feature branch from current HEAD, not the old Phase 5 baseline. Current inspected HEAD is `bf0c11c`; current checkout is `master` even though Spec Kit resolved the feature branch name above.
4. Commit or otherwise intentionally resolve the currently untracked `.specify/feature.json` and `specs/` planning artifacts. Require `git status --short` to be empty before application changes.
5. Rerun all commands in [quickstart.md](./quickstart.md). Do not use historical report results as substitutes.
6. Record `git rev-parse HEAD`, `git status --short`, command outputs, runtime versions, and live service endpoints in the Phase 7 implementation report.

Current planning-time baseline evidence:

- `npm run test:openapi-tools`: passed, 1/1.
- `npm run api:verify`: passed, 6 services, 25 models, 39 generated TypeScript files.
- `npx ng test core-auth --watch=false`: passed, 54/54.
- `npx ng test core-http --watch=false`: passed, 5/5.
- `npx ng test customer --watch=false`: passed on retry, 13/13; an earlier concurrent run had a Vitest worker exit and is retained as a tooling observation.
- `npx ng build core-auth`: passed.
- `npx ng build customer --configuration=production`: passed; 373.68 kB initial bundle, under the 1 MB error budget.
- Working tree: not clean (`.specify/feature.json` and `specs/` are untracked during planning).
- Live Phase 6 OIDC: Complete, verified, and committed in `docs/phase-6-secure-oidc-authentication-implementation-report.md`.

## Technical Context

**Language/Version**: TypeScript 6.0.2, HTML, CSS; Angular 22.1.x; Node.js 24.18.1 observed during verification

**Primary Dependencies**: Angular core/router/common/forms 22.1.x; `@angular/forms/signals`; `@angular/core/rxjs-interop` `rxResource()`; RxJS 7.8; generated `@talabat/api-customer`; `@talabat/core-auth`; `@talabat/core-http`; `@talabat/shared-ui`; Angular CDK 22.1; Tailwind CSS 4.3.3 CSS-first tokens; `oidc-client-ts` 3.5.0

**Storage**: No persistent Phase 7 application storage. OIDC authenticated session remains in memory; OIDC transaction correlation remains Phase 6-owned session storage. Profile cache is root-service memory scoped to the authenticated subject. No local cart, quantity, count, or total storage.

**Testing**: Angular `@angular/build:unit-test` with Vitest 4.x and jsdom; Angular TestBed, router testing, generated-service fakes/HTTP integration tests; manual browser/live API acceptance

**Target Platform**: Modern evergreen browsers, responsive customer SPA at 320 px, 768 px, and 1280 px, 200% zoom; zoneless Angular

**Project Type**: Angular CLI monorepo with one customer web application and independently buildable generated/core/shared libraries

**Performance Goals**: One profile probe per authenticated subject/session; concurrent callers share one request; route changes cancel stale menu subscriptions; no menu N+1 requests; cart-entry feedback begins within 100 ms without claiming mutation success; production build remains under configured budgets

**Constraints**: Generated clients read-only; no direct feature `HttpClient`; no `core-auth -> api-customer`; no feature barrels; all feature routes lazy via `loadChildren`; strict typing/no `any` or non-null assertions; no local fake cart or client-authoritative totals; public catalog remains anonymous; current OIDC behavior cannot regress

**Scale/Scope**: One customer shell, one profile store, two profile-related guards/orchestrators, one onboarding feature, one menu page with presentational components, one not-found feature, existing public restaurant list, and a narrow Phase 8 cart-entry event contract

## Constitution Check

*GATE: Evaluated before research and re-evaluated after design.*

| Principle | Design evidence | Gate |
|---|---|---|
| I. Backend authority | Profile and menu values come from generated responses. Client validation is UX-only. No cart state, quantity, price computation, or totals are created. | PASS |
| II. Generated API boundary | `CustomerApiService.getProfile/createProfile` and `CatalogApiService.getRestaurantMenu` are the only API calls. Runtime `BASE_PATH` remains unchanged. No generated edit is planned. | PASS |
| III. One-way dependencies | `ProfileStore` is customer-app-owned under `app/core/profile`; `core-auth` remains domain-neutral and imports no API client. Shared UI receives primitives only. | PASS |
| IV. Vertical slices/routing | App routes lazy-load layout/auth/onboarding/catalog/not-found route files. Public catalog is unguarded. Guard arrays use `[authGuard, profileGuard]`. Onboarding is profile-guard-exempt. | PASS |
| V. Angular 22 | Standalone, zoneless, signal state, `rxResource()`, function DI, native control flow, and installed Signal Forms APIs are used. No legacy forms/RxJS subject state is added. | PASS |
| VI. Authentication/security | Existing PKCE, callbacks, in-memory token policy, exact `/api/me` interceptor scope, and `safeReturnUrl()` remain intact. No app login form is introduced. | PASS |
| VII. HTTP/error model | Core interceptor stays ordered. Features receive `AppError`; typed owned-action codes are centralized; `Unknown` remains fallback. Async views cover loading/error/not-found/empty/populated. | PASS |
| VIII. Design/accessibility | Existing FoodDash tokens, shared primitives, CDK dialog/sheet, semantic landmarks, focus/error linkage, live regions, reduced motion, logical properties, safe areas, and 42 px targets are specified. | PASS |
| IX. Verification | Store, guards, forms, menu, shell, integration, core regressions, builds, OpenAPI verification, and live flows are required. Assertions may not be weakened. | PASS BY DESIGN |
| X. Git discipline | Phase 6 live OIDC acceptance testing complete and committed. Worktree clean baseline established. | PASS |

All constitutional gates satisfied. Source implementation for Phase 7 is fully approved to proceed.

### Post-Design Recheck

Phase 1 contracts and state models preserve every architecture boundary above. In particular, the cart handoff contract prevents client-authoritative data, the profile contract keeps `core-auth` independent, and the menu contract contains only generated DTO fields. No complexity exception is required.

## Architecture Decisions

### Profile State Ownership And Lifecycle

`ProfileStore` is a `providedIn: 'root'` service in `talabat-web/projects/customer/src/app/core/profile/profile.store.ts`. This is the final ownership decision. It may inject `CustomerApiService` and `AuthStore` because the customer application is above both libraries. `core-auth` receives no customer DTO, store, profile guard, or `api-customer` dependency.

The store uses private writable signals and readonly public signals:

- Private: `stateState`, `profileState`, `errorState`, and the current authenticated `subjectState`.
- Public readonly: `state`, `profile`, `error`.
- Public computed: `hasProfile`, `isMissing`, and `canRetry`.
- State union: `idle | loading | loaded | missing | error`, with the invariants in [data-model.md](./data-model.md).

`ensureLoaded()` behavior:

1. Read the current authenticated subject from `AuthStore.user()`; reject/return an error result if absent rather than issuing a protected request.
2. If the subject differs from the cached subject, synchronously reset the profile state before probing.
3. Return cached `loaded` or `missing` state for the same subject.
4. Return the same private in-flight promise when a probe is already running.
5. Call generated `CustomerApiService.getProfile()` once and convert the finite observable at this app-owned boundary.
6. Resolve 200 to `loaded`.
7. Resolve only `AppErrorCode.ProfileNotCreated` with status 404 to `missing`.
8. Resolve network, 401, 403, other 404, 5xx, and unexpected failures to `error`; never convert them to `missing`.
9. Clear the in-flight reference in `finally` so explicit retry can make a new request.

Cache lifetime is the authenticated subject/session, not a time-to-live. A small app-level auth/profile coordinator observes subject/authentication transitions and calls `reset()` when logout, expiry, unauthorized clearing, refresh failure, callback replacement, or subject change makes the previous cache invalid. The coordinator is customer-owned; `core-auth` is not modified to know about profiles. Tests prove logout/expiry reset behavior from public AuthStore signals.

After onboarding POST succeeds, call `ProfileStore.refreshAfterCreation()` rather than caching the raw POST body. The backend POST response echoes untrimmed request values while persistence normalizes them, so a deliberate generated `getProfile()` refetch is the canonical update. Keep the successful response type checked, prevent another guard probe from racing the refetch, and move to `loaded` only after the canonical response. A refetch failure leaves an explicit retryable error and does not falsely report onboarding complete.

### Profile Guards And Authentication Order

`profileGuard` is a functional `CanActivateFn` in the customer app. Route declaration order is always `[authGuard, profileGuard]`. It awaits `ensureLoaded()` and returns:

- `true` for `loaded`.
- `Router.createUrlTree(['/onboarding'], { queryParams: { returnUrl: safeReturnUrl(state.url) } })` for documented `missing`.
- An `UrlTree` to the lazy profile-load failure page for `error`, preserving a validated retry destination. The failure page retries `ensureLoaded({ force: true })`; 401 is already handled by Phase 6 auth behavior and retry requires authentication again.
- A safe fallback tree for impossible idle/loading terminal states.

`profileGuard` is never attached to callbacks, sign-out callback, public catalog, onboarding, or wildcard routes. It explicitly avoids generating `/onboarding?returnUrl=/onboarding`.

Because Phase 7 introduces no production cart/order/profile-edit route, the legitimate production authenticated route is `/onboarding` and it must not use `profileGuard`. The retained clarified `/auth-check` diagnostic is the only profile-required route in this phase and receives `[authGuard, profileGuard]`; it is omitted from shell navigation and is marked development diagnostic in route data/documentation. Future production protected routes must use the same guard array and will replace the diagnostic in a later phase.

A separate functional `onboardingGuard` is used after `authGuard` on `/onboarding`. It awaits the same deduplicated probe, allows only `missing`, redirects `loaded` users to the validated return URL or `/restaurants`, and routes failures to the profile-load failure view. This resolves the clarification contradiction that requested an already-profiled redirect while also exempting onboarding from `profileGuard`.

The sign-in callback keeps its Phase 6 validation and cleanup behavior but, after callback completion and before final navigation, invokes a customer-app onboarding coordinator for every successful authenticated session. It performs the once-per-subject probe, routes `missing` to onboarding with the validated callback destination as `returnUrl`, routes `loaded` to that destination, and routes probe failures to the recovery view without treating them as missing. This does not profile-guard public catalog: anonymous visitors and direct public navigation remain unprobed, while a user who explicitly signs in receives the required new-account onboarding check. The ordering intent is carried only as a safe internal return URL.

### Routing And Lazy Ownership

Top-level routing becomes a lazy shell plus explicit callback and not-found routes:

- `/` redirects to `/restaurants`.
- `/signin-callback` and `/signout-callback` remain lazy and profile-exempt.
- A pathless lazy `layout/routes.ts` owns `CustomerShellComponent` and lazy child feature route files.
- `/restaurants` remains public and its catalog child routes include `''` and `':restaurantId'`.
- `/onboarding` uses `[authGuard, onboardingGuard]`, never `profileGuard`.
- `/profile-unavailable` is auth-required, profile-guard-exempt, and retry-oriented.
- `/auth-check` remains a dev diagnostic using `[authGuard, profileGuard]` and has no public navigation link.
- `**` lazy-loads an explicit not-found page instead of silently redirecting.

Every feature entry uses `loadChildren`; page components inside feature route files use `loadComponent` so the root bundle does not eagerly import pages. Existing catalog `routes.ts` must stop statically importing `RestaurantListPage` and lazy-load both list and menu pages.

Restaurant IDs are parsed with a single customer utility local to the catalog feature: only canonical positive base-10 safe integers are accepted. Invalid, zero, negative, fractional, overflow, or whitespace-encoded values produce the menu page's accessible restaurant-not-found state without an API request. A valid missing ID is distinguished by typed `RestaurantNotFound`.

### Onboarding Signal Form

Use the exact installed Angular 22.1 API from `@angular/forms/signals`: `form()`, schema callbacks, `required()`, `min()`, custom `validate()` for integer age and trimmed name, `disabled(..., { when })`, `[formField]`, field `errors()/errorSummary()/submitting()/markAsTouched()/focusBoundControl()`, and `submit()`.

The model shape is `{ fullName: string; age: number | null; phoneNumber: string }` so native number parsing can represent blank/invalid input safely. Submission maps it to generated `CreateProfileRequest` by trimming full name, requiring a positive safe integer age, and converting a blank trimmed phone to `null`. No phone-format regex is added because backend/OpenAPI evidence establishes no such rule. The generated request must always include the `phoneNumber` key.

Use native labelled `<input [formField]>` controls in onboarding rather than forcing the existing output-based `tal-input` through a new custom Signal Forms control contract. Reuse `tal-button`, `tal-spinner`, and error-state visual tokens; do not modify shared UI solely for one form.

Submission uses Signal Forms `submit()`, whose installed API rejects concurrent submissions. Controls are disabled while `submitting()`, the button exposes a busy label/spinner, and the handler also exits if already submitting. Invalid submit marks all fields touched, focuses a programmatically focusable validation-summary heading, lists linked errors, and then focuses the first invalid bound control. Field messages use stable IDs through native `[formField]` bindings and explicit `aria-describedby` where custom summary text is added. Use `autocomplete="name"`, `inputmode="numeric"` for age, and `autocomplete="tel" inputmode="tel"` for phone.

The current backend returns `InvalidCustomerProfile` as one general `detail`, not a field dictionary. Map that owned action to a form-level server validation error/summary without parsing backend text to infer fields. Preserve field values. Map `ProfileAlreadyExists` to a safe refetch-and-redirect path. Network/Unknown are retryable summaries. 401 follows Phase 6 reauthentication behavior while the in-memory form model remains mounted when possible; no token behavior changes. Never display an untrusted raw backend string without an allowlisted, user-safe presentation mapping.

Successful create triggers the canonical profile refetch, then `safeReturnUrl()` validates the query destination before `Router.navigateByUrl(..., { replaceUrl: true })`; fallback is `/restaurants`.

### Customer Shell

Move structural layout ownership from root `App` into `projects/customer/src/app/layout/customer-shell.component.ts`. Root `App` remains only the top router outlet so callback/failure pages can render without shell nesting when appropriate.

The shell contains semantic `<header>`, labelled `<nav>`, and one `<main>` around the child `router-outlet`; a skip link targets the main content. It composes existing `AuthStore`, customer `ProfileStore`, `tal-button`, Router links/active state, and presentational cart entry controls. Greeting prefers the canonical profile full name, then Phase 6 display name, then neutral signed-in text. It owns sign-in/sign-out composition but no profile or cart mutation.

Desktop and mobile use the existing FoodDash `@theme`, 6 px scale, logical spacing, max-width container, 42 px targets, visible focus ring, and reduced motion. Main content receives block-end padding based on the fixed mobile cart-entry height plus `env(safe-area-inset-bottom)`. The fixed control uses `inset-inline`, not physical left/right properties. Verify no overlap at 320 px and 200% zoom.

The Phase 7 cart control is truthful:

- Label: `Ordering cart (available in Phase 8)` or equivalent approved copy.
- No badge or a neutral `Not started` status; never a numeric `0` presented as live server cart data.
- Activating it while anonymous starts sign-in with the validated current URL.
- Activating it while authenticated opens an accessible CDK dialog/sheet describing that no item has been added and cart creation is the next phase.
- Menu products emit the narrow `CartEntryRequest` to an app-level `CartEntryCoordinator`; the coordinator provides the same non-success explanation and never stores the request.
- No `Added!`, count increment, item summary, quantity, price calculation, or cart endpoint call exists.

### Restaurant Menu And Resource Adapter

Use one `rxResource()` adapter because generated services return cold observables. The menu page derives a `restaurantId` signal from the route parameter and configures:

- `params`: valid ID object or `undefined` for invalid IDs.
- `stream`: `CatalogApiService.getRestaurantMenu({ restaurantId })` only.
- `reload()`: retry action.

`rxResource()` is the installed Angular 22 observable resource API. When params change or the page is destroyed it unsubscribes from the generated HttpClient observable, which aborts the stale request. This is safer than `firstValueFrom()` because the current restaurant-list adapter does not propagate resource abort signals. Do not inject `HttpClient` or reconstruct the endpoint for `httpResource()`.

Render exactly:

- Loading/reloading: labelled spinner/live status.
- Retryable network/Unknown: typed safe error state with retry.
- Invalid route ID: restaurant-not-found with return link, no request.
- Typed `RestaurantNotFound`: same not-found presentation, no retry loop.
- Empty products: `tal-empty-state`.
- Populated: server restaurant name and presentational product list.
- Product `isAvailable === false`: `Unavailable` text/status and disabled order-entry control.

The generated menu DTO does not expose restaurant description/status/image or product image. Do not make an N+1 list request or rely on navigation state to fabricate them. Product cards use a stable, decorative FoodDash placeholder slot for every product; tests verify it remains present and accessible product text does not depend on an image. The generic image-failure behavior remains documented for the future contract but Phase 7 cannot test a nonexistent DTO field. Display `price.amount` and `price.currency` directly with locale formatting only; do not calculate totals.

Presentational `MenuHeaderComponent` and `MenuProductCardComponent` accept generated-compatible primitive/view inputs and emit `CartEntryRequest` for available items. They inject no API, profile, auth, or cart services.

### Error Model

Extend centralized `AppErrorCode` only with Phase 7 codes needed by owned UI actions:

- `ProfileNotCreated` remains existing.
- `InvalidCustomerProfile` for onboarding submit.
- `ProfileAlreadyExists` for onboarding race/idempotent recovery.
- `RestaurantNotFound` for menu not-found behavior.
- `Unknown` remains the fallback for network, unrecognized codes, framework errors, and non-owned backend errors.

Do not add broad backend-code mirroring. Status is used together with the documented `ProfileNotCreated` code only for the authoritative missing-profile decision; feature templates do not branch on raw status or message strings. Existing interceptor order and Phase 6 401/403 behavior remain unchanged, with regression tests.

## Phase 8 Cart-Entry Contract

The application-level contract is detailed in [contracts/application-contracts.md](./contracts/application-contracts.md):

```text
CartEntryRequest = { restaurantId: number; productId: number }
```

It intentionally contains no quantity, price, product DTO, item count, line total, or success state. The menu emits it only for an available server product. The Phase 7 coordinator returns/announces an explicit `deferred` outcome and discards the request.

Phase 8 must replace/connect this boundary by:

1. Creating a customer-app cart store/facade backed only by generated cart operations.
2. Sending the identifiers to the server add-item operation with server-required defaults.
3. Refreshing server cart state after mutation.
4. Driving shell badge/count and all totals from server `CartResponse`.
5. Replacing the deferred dialog with success/error feedback based on mutation outcome.
6. Preserving the menu component event shape unless the committed backend contract requires a narrow extension.

## Testing Strategy

Test behavior through public signals, DOM, guards, and generated-service boundaries; do not expose writable internals for tests.

### Profile Store

- 200 loaded profile.
- Exact 404 `ProfileNotCreated` missing state.
- Network, 401, 403, unrelated 404, 500, malformed/unexpected errors remain error.
- Same-subject cache avoids repeat GET.
- Concurrent callers share one request/promise.
- Retry after error issues one new request.
- Subject change, logout, token expiry, unauthorized clear, and refresh failure reset cache.
- Successful create path deliberately refetches and stores canonical response.
- Create refetch failure remains retryable and does not become loaded.

### Guards And Routing

- Router executes `authGuard` before `profileGuard` using route configuration/integration tests.
- Loaded allows diagnostic protected route.
- Missing returns onboarding `UrlTree` with validated return URL.
- Network/401/403/Unknown return failure/re-auth behavior, never onboarding.
- Onboarding is exempt from `profileGuard`; `onboardingGuard` allows missing and redirects loaded.
- No `/onboarding` self-loop; callback/public/wildcard paths are exempt.
- Guard concurrency shares one probe; failure retry can recover.
- All feature routes are lazy; wildcard renders explicit not-found.

### Onboarding

- Blank/whitespace name, blank/noninteger/nonpositive age, and valid nullable phone mapping.
- No invented phone-format rejection.
- Error summary, linked field messages, touched state, and focus-to-first-error.
- Native labels, autocomplete/inputmode, `aria-invalid`, `aria-describedby`.
- Signal Forms `submit()` duplicate suppression, disabled controls, busy spinner/live text.
- Network/typed server rejection preserves values and uses safe summary.
- `ProfileAlreadyExists` recovery.
- Success refetches cache and navigates only to validated internal destination.
- External/protocol-relative/malformed return destinations fall back to `/restaurants`.

### Menu

- Valid route changes unsubscribe stale request and render only latest response.
- Invalid/zero/negative/fractional/overflow ID makes no generated call.
- Loading/reloading, retry, network/Unknown, typed 404, empty, populated.
- Uses `isAvailable`; unavailable action is disabled.
- Stable placeholder and accessible name/description/price/availability.
- Product event contains identifiers only and never claims success.
- No N+1 request and no cart API request.

### Shell And Integration

- Semantic header/nav/main, skip link, active navigation, sign-in/out controls, profile greeting fallback.
- Cart entry has an accessible truthful label, no fake count, keyboard activation, CDK focus trap/restore, and safe-area spacing classes/styles.
- 320 px no-overlap behavior is covered with structural assertions and manual browser evidence.
- New account fake flow: sign-in intent -> one profile probe -> onboarding -> create -> canonical refetch -> menu destination.
- Existing profile fake flow: sign-in intent -> one 200 probe -> intended internal route.
- Failures and retries do not loop or duplicate requests.
- Existing Phase 6 callback, return URL, token interceptor, 401/403, and generated-auth integration tests remain green.

## Verification And Acceptance

Run all commands and manual scenarios in [quickstart.md](./quickstart.md). Any changed independently buildable library must receive both its project test and `ng build <library>` command. Expected changed library is `core-http` only if typed codes are added; customer-app profile/shell/menu code does not justify changes to `core-auth`, `api-customer`, or `shared-ui` unless implementation evidence forces a separately reviewed plan deviation.

Manual acceptance covers 320/768/1280 px, 200% zoom, keyboard-only use, screen-reader announcements, reduced motion, safe-area emulation, slow/offline network, route changes during menu load, and decorative placeholder behavior. Live verification must use Talabat.Identity and the Customer API and record evidence without token values or credentials.

## Project Structure

### Documentation (This Feature)

```text
specs/001-customer-shell-onboarding-menu/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── application-contracts.md
└── tasks.md                         # Created later by /speckit-tasks

docs/
└── phase-7-customer-shell-onboarding-menu-implementation-report.md
```

### Expected Source Ownership

```text
talabat-web/projects/customer/src/app/
├── app.config.ts
├── app.routes.ts
├── app.ts
├── app.html
├── core/
│   ├── cart-entry/
│   │   ├── cart-entry.contract.ts
│   │   ├── cart-entry-coordinator.service.ts
│   │   └── cart-entry-coordinator.service.spec.ts
│   └── profile/
│       ├── profile-session.coordinator.ts
│       ├── profile-session.coordinator.spec.ts
│       ├── profile.store.ts
│       ├── profile.store.spec.ts
│       ├── profile.guard.ts
│       ├── profile.guard.spec.ts
│       ├── onboarding.guard.ts
│       └── onboarding.guard.spec.ts
├── layout/
│   ├── routes.ts
│   ├── customer-shell.component.ts
│   ├── customer-shell.component.spec.ts
│   ├── cart-entry.component.ts
│   ├── cart-entry.component.spec.ts
│   └── cart-deferred-dialog.component.ts
├── features/
│   ├── auth/
│   │   ├── routes.ts
│   │   └── auth-check.page.ts
│   ├── catalog/
│   │   ├── routes.ts
│   │   ├── components/
│   │   │   ├── menu-header.component.ts
│   │   │   ├── menu-header.component.spec.ts
│   │   │   ├── menu-product-card.component.ts
│   │   │   └── menu-product-card.component.spec.ts
│   │   └── pages/
│   │       ├── restaurant-list.page.ts
│   │       ├── restaurant-list.page.spec.ts
│   │       ├── restaurant-menu.page.ts
│   │       └── restaurant-menu.page.spec.ts
│   ├── onboarding/
│   │   ├── routes.ts
│   │   ├── onboarding.page.ts
│   │   └── onboarding.page.spec.ts
│   └── not-found/
│       ├── routes.ts
│       ├── not-found.page.ts
│       └── not-found.page.spec.ts
└── testing/
    └── customer-profile-flow.integration.spec.ts

talabat-web/projects/core-http/src/lib/
├── app-error.ts
└── problem-details.interceptor.spec.ts
```

Exact filenames may be minimally consolidated during task generation, but ownership and dependency direction may not change. Do not add feature barrel files. Do not edit `talabat-web/projects/api-customer/**`. Do not refactor unrelated Phase 5/6 code.

**Structure Decision**: Keep customer-domain state, guards, and orchestration inside the customer application. Keep feature pages/components in vertical slices. Keep only domain-neutral error translation in `core-http`, authentication in `core-auth`, visual primitives in `shared-ui`, and generated DTO/services in `api-customer`.

## Implementation Sequence

1. Satisfy and commit preflight gates; capture clean baseline/current HEAD.
2. Add only needed typed AppError codes and interceptor tests; build/test `core-http`.
3. Implement customer-owned ProfileStore, auth-reset coordinator, guards, and tests.
4. Restructure root/shell lazy routes without changing callback semantics; add not-found and diagnostic profile-failure routes.
5. Implement onboarding Signal Form and generated create/refetch flow.
6. Implement menu route validation, `rxResource()` adapter, states, and presentational components.
7. Implement truthful `CartEntryRequest` coordinator and shell/dialog integration without local cart state.
8. Add integration tests and regressions; run all automated gates.
9. Complete live/manual acceptance matrix and accessibility/responsive review.
10. Write the Phase 7 implementation report, including file-by-file summary, decisions/deviations, command outputs, manual evidence, and Phase 8 readiness.
11. Verify generated source unchanged, working tree contains only intended Phase 7 changes, and create exactly one focused Phase 7 feature commit after all gates pass.

## Documentation And Handoff

The Phase 7 implementation report must include:

- Baseline and final commit IDs and clean-tree evidence.
- Phase 6 live OIDC report reference and completion evidence.
- File-by-file implementation summary.
- Final route/guard matrix and profile state transition diagram.
- Generated contract facts and every deviation from the original clarified spec.
- Explicit confirmation that no generated client, fake local cart, quantity, count, or total was added.
- Automated command results and production bundle sizes.
- Manual browser/live API matrix with date, browser, viewport, result, and nonsecret evidence.
- Accessibility and reduced-motion findings.
- Remaining risks and explicitly accepted deviations, if any.
- Phase 8 readiness decision.

Phase 8 is ready only when ProfileStore is stable across auth transitions, onboarding/profile guarding has no loops, menu identifiers are emitted through `CartEntryRequest`, all Phase 7 tests/builds/live checks pass, the implementation is committed, and the report states precisely that Phase 8 must connect the event to generated server cart mutations and server-derived badge/totals.

## Complexity Tracking

No constitution exception is requested. The additional onboarding guard and app-level coordinators are required to resolve route semantics and preserve the domain-neutral `core-auth` boundary; they do not create a new library or cross-feature dependency.

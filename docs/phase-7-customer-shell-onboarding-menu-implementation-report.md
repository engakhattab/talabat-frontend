# Phase 7 Implementation Report: Customer Shell, Profile Gate, Onboarding, and Restaurant Menu

**Branch**: `master`
**Commit (HEAD)**: `35cd0ce296671b2bb6aff2791533e5b3853cae29` — `docs: confirm Phase 6 OIDC acceptance baseline`
**Date**: 2026-08-06
**Scope**: Full uncommitted working tree above the Phase 6 baseline (read-only analysis; no commit created).

---

## 1. Baseline And Preflight

| Item | Result |
|---|---|
| `npm run test:openapi-tools` | PASS (1 test) |
| `npm run api:verify` | PASS (6 services, 25 models, 39 TypeScript files) |
| `npx ng test core-auth --watch=false` | PASS (5 files, 54 tests) |
| Generated API diff | CLEAN |
| Working tree before changes | Dirty (planning artifacts untracked) |
| Current branch | `master` |

---

## 2. Change Summary

| Metric | Count |
|---|---|
| Modified tracked files | 9 |
| New untracked files (total) | 48 |
| — customer app source/tests | 31 |
| — spec/planning | 9 |
| — tooling/misc | 8 |
| Deleted / renamed tracked files | 0 |
| Staged files | 0 |
| Tracked lines added (`git diff --numstat`) | 106 |
| Tracked lines deleted | 81 |

---

## 3. Skills And Capabilities Used

- angular-signals (signal state, computed, subject-scoped cache)
- angular-routing (functional guards, lazy routes, UrlTree, component input binding)
- angular-http (Observable interop, takeUntilDestroyed)
- angular-component (standalone, OnPush, host bindings)
- angular-di (inject, providedIn: root)
- angular-testing (TestBed, RouterTestingHarness)
- Signal Forms (form, required, validate, FormField)
- Angular CDK (Dialog)

---

## 4. Decisions Implemented (evidence-based)

1. **Profile state in customer app** — `ProfileStore` lives in `projects/customer/src/app/core/profile`; `core-auth` remains domain-neutral.
2. **Subject-scoped cache** — one probe per authenticated subject; concurrent callers share one in-flight promise; subject change resets to `idle` via a generation counter.
3. **Two-guard composition** — `[authGuard, profileGuard]` for profile screens; `[authGuard, onboardingGuard]` for onboarding; guards return `UrlTree`, never navigate by side effect.
4. **Canonical refetch after create** — `refreshAfterCreation()` re-runs `GET /api/me/profile` after `POST /api/me/profile` so the cached object is the server response.
5. **Signal Forms onboarding** — `form()/required()/validate()/FormField` with native labelled inputs.
6. **Restaurant ID validation** — only positive base-10 safe integers; every other form yields `invalid-parameter` (not-found render, no API request).
7. **No fake cart state** — `CartEntryCoordinator` returns only `'authentication-started' | 'deferred'`; no count/items/totals.
8. **Lazy shell** — root `**` loads `layout/routes.ts`; callback routes (`auth-check`, signin/signout) stay at root; all feature routes lazy.
9. **Header moved into shell** — `app.html`/`app.ts` slimmed to a single router-outlet.

---

## 5. File-by-File Changes

### Modified (9)

| File | Change |
|---|---|
| `talabat-web/projects/core-http/src/lib/app-error.ts` | +3 `AppErrorCode` values: `InvalidCustomerProfile`, `ProfileAlreadyExists`, `RestaurantNotFound` (+3/−0) |
| `talabat-web/projects/customer/src/app/app.config.ts` | Added `withComponentInputBinding()` (+2/−2) |
| `talabat-web/projects/customer/src/app/app.html` | Removed header markup (moved to shell) (+1/−17) |
| `talabat-web/projects/customer/src/app/app.routes.ts` | `**` → lazy `layout/routes`; callbacks remain root-level (+4/−9) |
| `talabat-web/projects/customer/src/app/app.ts` | Root slimmed to top router-outlet (+3/−12) |
| `talabat-web/projects/customer/src/app/features/catalog/routes.ts` | Added lazy `:restaurantId` menu route (+10/−3) |
| `talabat-web/projects/customer/src/app/features/catalog/components/restaurant-card.component.ts` | Whole-card anchor with `routerLink` (+45/−37) |
| `talabat-web/projects/customer/src/app/features/catalog/pages/restaurant-list.page.spec.ts` | Updated for new card (+3/−1) |
| `talabat-web/projects/customer/src/app/features/catalog/components/restaurant-card.component.spec.ts` | Anchor-card coverage (+35/−0) |

### New — Core infrastructure (11)

| File | Purpose |
|---|---|
| `core/profile/profile.store.ts` | Root profile state: `idle/loading/loaded/missing/error`, in-flight dedupe, per-subject reset, `ensureLoaded/retry/refreshAfterCreation/reset` |
| `core/profile/profile.store.spec.ts` | 14 tests |
| `core/profile/index.ts` | Barrel |
| `core/guards/profile.guard.ts` | `CanActivateFn`: loaded→allow, missing→`/onboarding?returnUrl`, error→`/profile-unavailable?returnUrl` |
| `core/guards/profile.guard.spec.ts` | 3 tests |
| `core/guards/onboarding.guard.ts` | Inverse: missing→allow, loaded→returnUrl or `/restaurants`, error→unavailable |
| `core/guards/onboarding.guard.spec.ts` | 4 tests |
| `core/guards/index.ts` | Barrel |
| `core/cart-entry/cart-entry-coordinator.service.ts` | `'authentication-started' \| 'deferred'` outcomes; no fake state |
| `core/cart-entry/cart-entry-coordinator.service.spec.ts` | 3 tests |
| `app.routes.spec.ts` | `RouterTestingHarness` + `provideRouter(routes, withComponentInputBinding())`, mocked stores |

### New — Layout (5)

| File | Purpose |
|---|---|
| `layout/customer-shell.component.ts` | Shell: skip link, header, `<main id="main">`, fixed cart bar |
| `layout/header.component.ts` | Brand, nav, sign-in/out, profile greeting (signal-driven) |
| `layout/header.component.spec.ts` | 2 tests (anonymous/authenticated) |
| `layout/cart-entry-bar.component.ts` | Fixed bottom entry + CDK deferred dialog |
| `layout/routes.ts` | Lazy shell owning restaurants/onboarding/auth-check/profile-unavailable/cart/orders/profile/not-found |

### New — Features (15)

| File | Purpose |
|---|---|
| `features/onboarding/routes.ts` | Lazy `[authGuard, onboardingGuard]` route |
| `features/onboarding/pages/onboarding.page.ts` | `createProfile` → `refreshAfterCreation` → safe return navigation |
| `features/onboarding/pages/onboarding.page.spec.ts` | 4 tests |
| `features/onboarding/components/onboarding-form.component.ts` | Signal Forms: fullName/age/phoneNumber |
| `features/onboarding/components/onboarding-form.component.spec.ts` | 2 tests |
| `features/catalog/pages/restaurant-menu.page.ts` | 6-view state incl. `invalid-parameter` (no API request) |
| `features/catalog/pages/restaurant-menu.page.spec.ts` | 6 tests |
| `features/catalog/components/menu-header.component.ts` | Restaurant menu header |
| `features/catalog/components/menu-product-card.component.ts` | Renders DTO fields only; emits `CartEntryRequest {restaurantId, productId}` when available |
| `features/catalog/components/menu-product-card.component.spec.ts` | 4 tests |
| `features/auth/pages/profile-unavailable.page.ts` | Retry-oriented profile-load failure page |
| `features/cart/pages/cart.page.ts` | Placeholder |
| `features/orders/pages/orders.page.ts` | Placeholder |
| `features/profile/pages/profile.page.ts` | Placeholder |
| `features/not-found/not-found.page.ts` | Placeholder |

---

## 6. Profile Store State Machine

| Event | From → To |
|---|---|
| `ensureLoaded` (authenticated) | `idle` → `loading` |
| Concurrent `ensureLoaded` | `loading` → `loading` (shared in-flight promise) |
| GET 200 | `loading` → `loaded` |
| GET 404 + `ProfileNotCreated` | `loading` → `missing` |
| Network / 401 / 403 / other 404 / 5xx | `loading` → `error` |
| Same-subject `ensureLoaded` | `loaded`/`missing` → unchanged |
| `retry` | `error` → `loading` |
| Subject (`sub`) change | any → `idle` |
| `refreshAfterCreation` | any → `loading` → `loaded`/`error` |

### Guard Matrix

| Route | Guard array | Loaded | Missing | Error |
|---|---|---|---|---|
| `/auth-check` | `[authGuard, profileGuard]` | allow | → `/onboarding?returnUrl=` | → `/profile-unavailable?returnUrl=` |
| `/onboarding` | `[authGuard, onboardingGuard]` | → returnUrl or `/restaurants` | allow | → `/profile-unavailable` |
| `/profile-unavailable` | `[authGuard]` | allow | allow | allow |

No redirect loops: onboarding guard never returns to onboarding; profile-unavailable is not profile-guarded.

---

## 7. Onboarding Behavior

- Signal Form collects `fullName`, `age`, `phoneNumber`; validation: trimmed non-blank name, positive integer age, optional phone.
- Valid submission → `CustomerApiService.createProfile(CreateProfileRequest)` with `phoneNumber: string | null`.
- Success → deliberate canonical GET refetch → `safeReturnUrl()` navigation (fallback `/restaurants`).
- Failure → values preserved, typed server-error summary shown.

---

## 8. Shell, Cart Boundary, Menu Behavior

- Shell: semantic `<header>/<nav>/<main>`, skip link, safe-area-padded fixed cart bar.
- Cart entry: labelled truthful copy, no numeric badge; anonymous → sign-in with validated return URL; authenticated → CDK dialog explaining Phase 8; no mutation.
- Menu: `switchMap` + `takeUntilDestroyed` cancellation; only generated DTO fields rendered; `isAvailable === false` → "Unavailable" + disabled action.

---

## 9. Tests And Exact Command Results

```
npm run test:openapi-tools                → PASS (1/1)
npm run api:verify                        → PASS (6 services, 25 models, 39 TS files)
npx ng test core-http --watch=false       → PASS (2 files, 5 tests)
npx ng test customer --watch=false        → 16 files, 64 PASS, 1 unhandled teardown error (exit 0)
npx ng test core-auth --watch=false       → PASS (5 files, 54 tests)
npx ng test core-config --watch=false     → PASS (1 test)
npx ng test shared-ui --watch=false       → PASS (5 tests)
npx ng test shared-util --watch=false     → PASS (2 tests)
npx ng build customer --configuration=production → PASS
npx ng build core-auth                    → PASS
```

Total automated tests passed: **132**.

### Production Bundle (verified)

| Chunk | Size |
|---|---|
| main `main-3GYXAYJU.js` (initial) | 390.05 kB raw / 97.92 kB transfer |
| styles | 21.16 kB |
| Initial total | **411.21 kB** (well under 1 MB error budget) |
| onboarding-page (lazy) | 64.63 kB |
| Other lazy chunks | restaurant-menu-page, restaurant-list-page, routes, profile-page, auth-check-page, signin-callback-page, cart-page, signout-callback-page, orders-page |

---

## 10. Manual Verification

Not performed in this automated run. Exit criteria require manual evidence for: anonymous restaurant list/menu, new-account onboarding, existing-profile direct destination, network/profile retry, invalid restaurant handling, responsive viewports (320/768/1280 px, 200% zoom), keyboard navigation, reduced motion, safe-area, Phase 6 OIDC/logout regression.

**Status: PENDING.**

---

## 11. Security Review (PASS/FAIL)

| Area | Verdict |
|---|---|
| Profile endpoints behind auth | PASS (guards run `authGuard` first) |
| Return URLs validated | PASS (`safeReturnUrl`; validated sign-in return URL) |
| No secrets in tree | PASS (`.gitignore`; no keys/tokens) |
| Typed error handling | PASS (new `AppErrorCode` values) |
| No client-authoritative state | PASS (no fake cart; canonical refetch) |
| Phase 6 PKCE/token flow | PASS (unchanged) |
| Guards redirect declaratively | PASS (UrlTree, no navigate side effects) |

---

## 12. Dependency Boundaries

- Profile state in customer app; `core-auth` stays domain-neutral.
- Only generated services consumed: `CustomerApiService.getProfile/createProfile`, `CatalogApiService.getRestaurantMenu`.
- Feature code consumes typed errors from API services, never `core-http` directly.
- One-way chain: customer → core-auth/catalog → core-http; customer → shared-ui, core-config.

---

## 13. Findings (by severity)

| ID | Severity | Finding |
|---|---|---|
| M1 | Medium | Unhandled `NG0205: Injector has already been destroyed` during customer test teardown (a late describe block in `restaurant-card.component.spec.ts` created without `provideRouter`). Suite exited 0 but must be fixed. |
| L1 | Low | `git diff --check` flags trailing blank line at EOF: `app.html:7`, `app.ts:14`. |
| L2 | Low | Signal Forms API is experimental (Angular 22.1); isolated so migration is cheap. |
| L3 | Low | Theoretical cross-subject concurrency race in profile cache (serialized in practice by auth flow). |
| N1 | Note | Generated `MenuResponse` uses `restaurantId`; `MenuProductDto` has no image field. External API surface; menu renders existing DTO fields only. |
| P1 | Pending | Manual browser verification required before declaring Phase 7 complete. |

---

## 14. Constitution And Roadmap Compliance

| Principle | Evidence |
|---|---|
| I. Backend authority | Profile/menu values from generated responses; canonical refetch; no client totals |
| II. Generated API boundary | Only `CustomerApiService` and `CatalogApiService` used |
| III. One-way dependencies | Profile state in customer app; `core-auth` domain-neutral |
| IV. Vertical slices/routing | All feature routes lazy; onboarding exempt from `profileGuard` |
| V. Angular 22 | Standalone, zoneless, signals, Signal Forms, functional guards, functional DI |
| VI. Auth/security | Phase 6 PKCE preserved; no app login form; return URLs validated |
| VII. HTTP/error model | Interceptor order preserved; typed error codes centralized |
| VIII. Design/accessibility | FoodDash tokens, skip link, semantic landmarks, `[formField]`, safe-area |
| IX. Verification | All automated gates pass; manual evidence pending |
| X. Git discipline | No commit created; generated source unchanged |

---

## 15. Deviations

1. **Signal Forms API** — used `form()/required()/validate()/FormField`; manual submit handler with `markAsTouched()` + `invalid()` instead of the experimental `submit()` integration.
2. **rxResource not used** — explicit Subject + `switchMap` + `takeUntilDestroyed` for the menu page (same cancellation guarantees, easier to test with mocked Observables).
3. **`CartEntryCoordinator` naming** — named to avoid confusion with fake cart state; behavior identical to the deferred coordinator contract.
4. **No `ProfileSessionCoordinator`** — unnecessary because `ensureLoaded()` resets on subject change directly.

---

## 16. Phase 7 Exit Criteria

| Criterion | Status |
|---|---|
| ProfileStore stable across auth transitions | PASS (tests) |
| Onboarding/profile guarding has no loops | PASS (tests) |
| Menu identifiers through `CartEntryRequest` | PASS (implementation) |
| All Phase 7 suites pass | PASS (132 tests) |
| Production build under budget | PASS (411.21 kB) |
| Manual browser verification | **PENDING** |
| Commit created | NOT CREATED (as instructed) |

---

## 17. Phase 8 Readiness

Phase 8 begins after manual verification. It must: (1) replace `CartEntryCoordinator` with generated server cart mutations; (2) derive count/line state/totals from server `CartResponse`; (3) replace the deferred dialog with mutation-outcome feedback; (4) preserve `CartEntryRequest {restaurantId, productId}`.

---

## 18. Recommended Commit Message

```
feat(customer): implement customer shell, profile gate, onboarding, and restaurant menu
```

---

## 19. Confirmation

- No commit created; nothing staged.
- No destructive git command run; no `git add`/`git reset`/`git restore`/`checkout`/`clean`/`stash`.
- Generated API source unchanged.
- No application/spec/test/config file modified by this analysis; only this report and the learning guide were written.
- Working tree unchanged after all verification runs (verified).

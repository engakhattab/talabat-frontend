# Phase 7 Quickstart And Manual Verification

This guide is for implementation validation. It does not authorize source work until the preflight gate passes.

## 1. Preconditions

1. Complete and commit all live Phase 6 checks in `docs/phase-6-secure-oidc-authentication-implementation-report.md` or a committed addendum.
2. Use the Phase 7 feature branch based on current HEAD, not the Phase 5 report baseline.
3. Confirm the active planning artifacts are committed and the working tree is clean.
4. Confirm no backend or generated-client edits are included in the Phase 7 application commit.

From repository root:

```powershell
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git status --short
git log --oneline --decorate -10
```

Expected before source implementation:

- Branch is the intended Phase 7 branch.
- `git status --short` has no output.
- Phase 6 implementation and live-verification evidence are committed.

## 2. Install And Contract Verification

From `talabat-web`:

```powershell
npm ci
npm run test:openapi-tools
npm run api:verify
```

Expected:

- OpenAPI copy tooling passes.
- Generated API verification reports the expected six services and no drift.
- `git status --short` remains clean after verification.

Do not run `npm run api:gen` unless the backend contract changed in a separately approved backend/contract workflow. Phase 7 assumes no contract change.

## 3. Automated Test Matrix

Run affected projects individually so a failure is attributable:

```powershell
npx ng test core-config --watch=false
npx ng test core-http --watch=false
npx ng test core-auth --watch=false
npx ng test shared-ui --watch=false
npx ng test shared-util --watch=false
npx ng test customer --watch=false
```

Required Phase 7 customer suites:

- ProfileStore 200, exact missing-profile 404, network, 401, 403, other 404, unexpected/500, cache, concurrency, retry, auth reset, create canonical refetch.
- Guard order, allow, onboarding tree, no loops, failure route, retry, and inverse onboarding guard.
- Onboarding Signal Forms validation, accessibility/focus, duplicate submit, rejection/value preservation, profile refresh, and safe navigation.
- Menu invalid ID, route changes/cancellation, loading, retry, typed 404, empty, success, unavailable products, stable placeholder, and identifiers-only event.
- Shell landmarks, navigation, auth controls, truthful cart access, dialog keyboard/focus behavior, and safe-area layout contract.
- New-account and existing-profile integration flows with generated-service/auth fakes.
- Existing Phase 6 callback/interceptor/return-URL regressions.

All tests must pass without deleting, skipping, weakening, or broadening assertions.

## 4. Build Matrix

Always run:

```powershell
npx ng build customer --configuration=production
```

Run independently buildable libraries changed by the implementation. Expected if only the planned error codes change outside the app:

```powershell
npx ng build core-http
```

Also retain the Phase 6 regression build:

```powershell
npx ng build core-auth
```

If `shared-ui`, `shared-util`, `core-config`, or another library changes despite the ownership plan, run its test/build and document why the deviation was necessary.

Expected:

- All builds pass.
- Customer initial and component style budgets pass.
- No generated source changes.

## 5. Start Live Services

Use the repository/backend documented launch procedure for:

- Talabat.Identity at configured authority (expected development port 7237).
- Talabat Customer API at configured base URL (expected development port 7056).
- Customer Angular application at port 4200.

From `talabat-web`:

```powershell
npx ng serve customer
```

Verify `projects/customer/public/assets/config.json` points to the running development services. Do not hardcode URLs in application source.

## 6. Live Phase 6 Gate

Before evaluating Phase 7, record these Phase 6 results:

| Scenario | Expected |
|---|---|
| Anonymous public `/restaurants` | Loads without Identity redirect. |
| Protected diagnostic | Redirects to Identity using Authorization Code + PKCE. |
| Sign-in callback | State validates, query is cleaned, internal destination restored. |
| Authenticated profile request | One bearer header reaches exact Customer API `/api/me/profile`. |
| Token scope | No bearer token reaches Identity, assets, catalog, foreign/lookalike origins. |
| Browser storage | No access, refresh, or ID token in local/session storage or cookies owned by the SPA. |
| Reload | Memory token is gone; protected access starts fresh authorization/SSO safely. |
| Sign-out | Identity end-session and sign-out callback complete; local auth/profile state clears. |
| Tampered callback | Safe failure, no destination injection. |
| Refresh failure | Session/profile cache clears and fresh sign-in is required. |

Do not record credentials or token values.

## 7. Phase 7 Browser Flows

### A. Anonymous catalog and menu

1. Open `/restaurants` signed out.
2. Open a valid `/restaurants/{id}`.
3. Confirm one menu request to `/api/catalog/restaurants/{id}/menu` and no `/api/me` request merely for browsing.
4. Confirm loading, restaurant name, products, direct server price/currency, and unavailable states.
5. Activate an available product ordering entry.
6. Confirm sign-in begins with the internal menu URL preserved.
7. Confirm no cart endpoint is called and no "Added" success/count appears.

### B. Invalid and missing restaurant

Try:

```text
/restaurants/invalid
/restaurants/0
/restaurants/-1
/restaurants/1.5
/restaurants/999999999999999999999
```

Expected: accessible `Restaurant not found`, return action, and no menu request for invalid parameter forms. For a valid positive nonexistent ID, expect one generated menu request and typed not-found presentation.

### C. Route-change cancellation

1. Throttle the network.
2. Navigate from a valid `/restaurants/1` to `/restaurants/2` before the first response completes.
3. Confirm the first request is canceled/unsubscribed and its late response never replaces ID 2.
4. Use retry after a simulated network failure and confirm exactly one new request.

### D. New account onboarding

1. Start sign-in from either the shell or an ordering intent and complete it with a fresh account.
2. Confirm one profile probe.
3. Confirm only 404 plus `ProfileNotCreated` navigates to `/onboarding`.
4. Submit blank/invalid values; confirm summary and first-invalid focus, linked field errors, and no request.
5. Enter valid name, positive integer age, and blank phone; confirm payload includes `phoneNumber: null`.
6. Double-activate submit; confirm one POST and disabled/busy controls.
7. Confirm POST success is followed by one canonical GET, cache greeting uses GET response, and validated menu destination is restored.

### E. Existing profile intended destination

1. Sign in with an existing-profile account from the shell or an ordering intent.
2. Confirm one profile GET returns 200.
3. Confirm onboarding is skipped and the validated intended destination loads.
4. Navigate directly to `/onboarding`; confirm the inverse guard redirects without form flash or loop.

### F. Profile error isolation and retry

Simulate network, 401, 403, 500, unrelated 404, and malformed responses.

Expected:

- None are treated as missing profile.
- 401 follows Phase 6 session behavior.
- Other failures show a safe retry route/state.
- Retry issues one new probe.
- Concurrent navigations never duplicate the in-flight probe.

### G. Truthful cart handoff

1. Activate the shell cart entry while authenticated.
2. Activate an available product entry while authenticated.
3. Confirm CDK dialog/sheet is keyboard operable, focus is trapped/restored, and copy explicitly states no item was added.
4. Confirm no count, quantity, total, item summary, local persisted state, or cart API request exists.
5. Confirm unavailable products have native disabled actions and emit no request.

## 8. Accessibility And Responsive Matrix

Run each shell/onboarding/list/menu/not-found state at:

| Viewport/setting | Checks |
|---|---|
| 320 px | No horizontal scroll; 42 px targets; fixed cart entry does not cover content; safe-area padding. |
| 768 px | Navigation and form remain readable; no clipped controls. |
| 1280 px | Max-width layout and navigation alignment use FoodDash tokens. |
| 200% zoom | No truncation, overlap, lost actions, or two-dimensional scrolling for normal content. |
| Keyboard only | Skip link, nav, form order, retry, dialog close, sign-in/out, product actions. |
| Screen reader | Landmarks/names, form summary, field descriptions, loading/status, unavailable text. |
| Reduced motion | Spinner/transition behavior follows existing reduced-motion rule; no essential motion. |
| Safe-area emulation | Bottom control remains reachable and content has sufficient block-end space. |
| Slow/offline | Polite loading, actionable safe errors, retry, no stale menu. |
| Decorative placeholder | Product name remains text; placeholder is ignored by assistive technology. |

Use logical CSS properties/classes only; search changed styles for prohibited physical left/right spacing.

## 9. Integrity Review

From repository root:

```powershell
git status --short
git diff --check
git diff --stat
git diff -- talabat-web/projects/api-customer
git diff -- talabat-web/openapi
```

Expected:

- No generated-client or OpenAPI diff.
- No unrelated refactor.
- No feature `index.ts` barrel.
- No direct `HttpClient` in customer features.
- No `LocalCartEntryService`, fake count/quantity/total, or "Added" success.
- No `core-auth` import from `api-customer`.

## 10. Implementation Report Evidence

Create `docs/phase-7-customer-shell-onboarding-menu-implementation-report.md` during implementation handoff. Include:

- Baseline/final commits and clean status.
- File-by-file summary.
- Decisions/deviations from [research.md](./research.md).
- Automated outputs and bundle sizes.
- Live/manual matrix with browser/date/result.
- OIDC/customer API evidence without secrets.
- Accessibility/responsive results.
- Generated-source integrity result.
- Exact Phase 8 replacement obligations from [application-contracts.md](./contracts/application-contracts.md).

Phase 8 is not ready until all rows pass, Phase 7 is one focused committed change, and the report explicitly confirms that the cart event is still deferred and must be connected to server-backed cart state.

# Phase 11 Validation Quickstart

## Prerequisites

1. Node.js 24, npm 11, Java 17+ for the generator, .NET 10, SQL Server, and a trusted local .NET development certificate (or Playwright's loopback-only certificate bypass).
2. Frontend repository at `D:\link-dev\talabat-frontend` and backend at `D:\link-dev\talabat`, or configure the approved backend-root override for OpenAPI copy.
3. Install dependencies with `npm ci` in `talabat-web` and Chromium with `npx playwright install --with-deps chromium` after Phase 11 dependencies land.
4. For live E2E, satisfy [contracts/e2e-environment.md](./contracts/e2e-environment.md). At present this is blocked by missing backend seed/toggle support.

## Independent automated stages

Run each command separately from `D:\link-dev\talabat-frontend\talabat-web` and record exit code/duration:

```powershell
npm run test:openapi-tools
npm run api:verify
npx ng test core-config --watch=false
npx ng test core-auth --watch=false
npx ng test core-http --watch=false
npx ng test shared-ui --watch=false
npx ng test shared-util --watch=false
npx ng test customer --watch=false
npm run build:customer:production
npm run e2e:preflight
npm run e2e
```

Expected command semantics and budgets are in [contracts/verification-pipeline.md](./contracts/verification-pipeline.md). Do not use a combined wrapper to decide the exit gate.

## Full OpenAPI reproduction

With an explicit, clean backend contract baseline:

```powershell
npm run api:copy
npm run api:generator:build
npm run api:gen:customer
npm run api:verify
git diff -- openapi projects/api-customer/src
```

Expected: no diff for an unchanged backend. Never repair drift by editing `projects/api-customer/src`.

## Live service startup

Start SQL Server and run migrations using the backend's documented Development/CI configuration. Start the HTTPS Customer API and Identity host, then the SPA:

```powershell
dotnet run --project D:\link-dev\talabat\src\Talabat\Talabat.API --launch-profile https
dotnet run --project D:\link-dev\talabat\src\Talabat\Talabat.Identity --launch-profile https
npx ng serve customer --configuration=production
```

Set `E2E_CUSTOMER_EMAIL` and `E2E_CUSTOMER_PASSWORD` in the invoking process without printing them. Run preflight before the E2E suite. A successful preflight runs the backend-owned `prepare` operation against the real Development/E2E database and consumes its JSON metadata for the marker-owned restaurant, happy product, negative product, and baseline addresses. Do not create a local `prepare.json`, hardcode generated IDs, substitute personal credentials/mocks/SQL edits, or toggle shared developer catalog rows. If the provisioner is missing or invalid, stop: Phase 11 remains blocked.

## Manual acceptance matrix

Record pass/fail/blocked with browser version and environment. Do not record tokens, passwords, or raw customer PII.

### Authentication/security

- Anonymous catalog/menu works; protected route returns through real Identity to the requested internal route.
- Callback address/history contains no code/state/session_state after success or failure; external/double-encoded return URLs are rejected.
- Local/session storage contains no access/refresh token, user snapshot, client secret, or stale PKCE transaction after callback/sign-out.
- Network tools show bearer only on the exact Customer API protected boundary, never Identity, config/assets, fonts, catalog, or foreign origins.
- 401 clears once and offers sign-in without a loop; 403 stays an authorization failure; Identity outage gives safe retry guidance.

### Customer regressions

- Authenticated profile name appears in the header immediately after profile load/update.
- Select a non-default checkout address, place an order, and confirm the next checkout defaults correctly.
- Add an address with default and set another default; neither operation returns 409.
- One successful checkout empties cart state and prevents rapid double submission.
- Reload the dynamic `/orders/:id` URL and verify order details return from the API.

### Accessibility/responsive behavior

- Traverse public and protected routes with Tab/Shift+Tab/Enter/Space/Arrow/Escape. Focus is always visible and logical.
- Open address, clear/remove, and cross-restaurant dialogs/sheets: initial focus enters; Tab stays inside; Escape/close restores trigger focus.
- Submit onboarding/profile/address forms invalid: associated error is announced and focus moves to summary/first invalid control where designed.
- At 320px, 768px, and 1280px: no primary horizontal overflow, overlap, clipped action, or hidden cart control.
- At actual browser zoom 200%: ordering, forms, dialog close, and navigation remain reachable and readable.
- Status/error meaning uses text/icon as well as color; representative interactive targets measure at least 42px.
- Enable reduced motion and repeat dialog/navigation actions without disruptive animation.

### Runtime failures

- Missing, non-200, malformed, wrong-shaped, and extra-key config produces the accessible bootstrap fallback and reload action; no caught error text is displayed.
- Stop Customer API: every API-driven route shows safe retryable error, not blank UI/unhandled rejection.
- Stop Identity: sign-in shows safe service-unavailable guidance without OIDC details.
- Unknown ProblemDetails fixture renders generic public copy only—no raw errorCode/detail/extensions/correlation ID.
- Ambiguous checkout network failure is not automatically resubmitted; order history/detail is offered for verification.

### Build/performance

- Production build has no warning/error at existing budgets.
- Stats audit prints current sizes/largest inputs and finds no `projects/customer/src/app/features/**` input in main.
- Compare against the 425.38 kB initial baseline; investigate only measured increases or new eager inputs/large assets.

## Exit result

Phase 11 passes only when every automated stage, live scenario, and required manual check passes. A missing backend E2E provisioner/toggle, unavailable service, failed security invariant, budget warning, generated drift, or unresolved accessibility/customer regression leaves the milestone blocked.

# Phase 6: Secure OIDC Authentication Implementation Report

## 1. Phase and scope

Phase 6 implements customer authentication for the Angular 22 customer SPA with OpenID Connect, OAuth 2.0 Authorization Code Flow, PKCE, runtime configuration, readonly signal state, functional routing and HTTP boundaries, callbacks, logout, refresh-failure handling, and focused automated security tests.

Phase 7 work was not started. There is no profile store, profile gate, onboarding, menu, cart, checkout, order, address, or full application shell implementation.

## 2. Baseline

- Branch: `master`
- Baseline commit: `7961990 feat(ui): establish FoodDash tokens and shared primitives`
- Initial working tree: clean (`git status --short` produced no output)
- Baseline verification: `git show --stat --oneline --summary HEAD` showed the committed Phase 5 Tailwind/CDK dependencies, FoodDash tokens, shared UI/util primitives, catalog restyling, tests, roadmap, and Phase 5 learning guide.
- No commit was created for Phase 6.

## 3. Documents and source inspected

- `talabat-angular-plan-v2.md`
- `talabat-angular-foundation-guide-phases-1-4.md`
- `docs/talabat-angular-roadmap-phases-5-to-completion.md`
- `docs/phase-5-fooddash-design-foundation-learning-guide.md`
- Angular workspace/package/TypeScript configuration and all relevant app/core library entry points
- Runtime `projects/customer/public/assets/config.json`
- Existing `core-config`, `core-http`, `core-auth`, `shared-ui`, catalog, and generated customer client source
- Backend `Talabat.Identity/IdentityServerConfig.cs` and `Program.cs`
- Backend `Talabat.API/Program.cs`, protected controllers, OpenAPI source, and identity configuration tests

Generated source under `projects/api-customer` was inspected but not modified.

## 4. Kilo Code environment

- No project `AGENTS.md`, `kilo.json`, `.kilo` directory, custom command, custom mode, agent rule, or MCP configuration exists in the frontend worktree.
- Global Kilo configuration at `C:\Users\ABDO\.config\kilo\kilo.jsonc` configures GPT-5.6 Sol and shell permission; it exposes no MCP server or custom workflow relevant to this phase.
- Loaded Kilo capabilities: `angular-di`, `angular-signals`, `angular-routing`, `angular-http`, `angular-testing`, `angular-component`, and `kilo-config`.
- Repository-aware Glob, Grep, Read, patch, shell, background-process, and package/document metadata capabilities were used.

## 5. Backend facts confirmed

| Setting | Confirmed value |
|---|---|
| Identity authority | `https://localhost:7237` |
| Customer API | `https://localhost:7056` |
| Customer SPA origin | `http://localhost:4200` |
| Client ID | `talabat-customer-spa` |
| Sign-in callback | `http://localhost:4200/signin-callback` |
| Sign-out callback | `http://localhost:4200/signout-callback` |
| Scopes | `openid profile roles customer.api offline_access` |
| Grant | Authorization Code |
| PKCE | Required |
| Client secret | Not required and not configured |
| API audience | `talabat.customer.api` |
| Access-token lifetime | 900 seconds |
| Refresh behavior | Sliding refresh expiration, 1,296,000 seconds; claims updated on refresh |
| API authorization | `/api/me/*` requires authentication and `customer.api`; most operations also require Customer role |
| Discovery/logout | Duende discovery and end-session behavior exposed by Identity |

The runtime frontend values remain in `APP_CONFIG`; auth infrastructure contains no environment authority, API base URL, client ID, or scope literals.

## 6. OIDC compatibility decision

### Evidence inspected

- `npm view angular-auth-oidc-client version peerDependencies dependencies engines --json`
- `npm view oidc-client-ts version peerDependencies dependencies engines --json`
- Package repository, exports, license, timestamps, and dry-run package contents
- Current official documentation and published TypeScript declarations
- `oidc-client-ts` `UserManagerSettings`, event, callback, storage, and refresh APIs
- Angular Auth OIDC Client standalone provider, startup, custom storage, and default storage documentation

### Selected: `oidc-client-ts` 3.5.0

Reasons:

- Published 2026-03-13, Node 18+, Apache-2.0, ESM/type exports, current maintenance.
- Framework-neutral and therefore compatible with Angular 22 standalone/zoneless execution without Angular peer coupling.
- `UserManager` implements discovery, code flow, PKCE by default (`disablePKCE: false`), state/nonce validation, callback processing, logout callback, refresh-token renewal, and lifecycle events.
- Its separate `stateStore` and `userStore` settings permit the required security split: transient redirect correlation in session storage, authenticated tokens only in memory.
- A narrow Angular adapter is straightforward to fake in tests and prevents protocol objects leaking into app UI.

### Rejected: `angular-auth-oidc-client` 21.0.2

- Its peer ranges technically include Angular 22 (`@angular/* >=20`), and it has standalone providers, code flow, PKCE, refresh-token support, and active maintenance.
- Its documented default storage is `sessionStorage`, and startup restoration explicitly restores authenticated sessions from storage. A custom memory provider is possible, but the package couples protocol behavior, Angular providers, RxJS state, and storage more tightly than required.
- The selected framework-neutral adapter gives more explicit control over token storage, callback boundaries, and test doubles with less framework coupling.

## 7. Storage and security trade-off

- `userStore`: library `WebStorageStateStore` backed by `InMemoryWebStorage`. Access, refresh, and ID tokens are lost on full reload and never enter application-managed persistent browser storage.
- `stateStore`: library `WebStorageStateStore` backed by `window.sessionStorage`, prefix `talabat.oidc.transaction.`. It contains only short-lived authorization transaction correlation required across the Identity redirect, including state, nonce, PKCE verifier, and request metadata. Stale state expires after 900 seconds and is cleared at initialization.
- Application code never directly reads or writes token values to storage.
- Reloading an authenticated page drops memory tokens. A later protected navigation starts a new authorization request; Identity may restore the user through its HttpOnly SSO session. This is intentional and preferable to persistent SPA tokens.
- The library logger is not connected to `console`; no token/protocol logging was introduced.

## 8. Architecture implemented

### `core-config`

`APP_CONFIG_READY` exposes the exact shared runtime-load promise. Both the existing config initializer and auth initializer await it, preventing auth from constructing an OIDC manager before runtime configuration exists.

### `core-auth`

- `AuthRuntimeConfig` is a structural token supplied by the customer composition root from `APP_CONFIG`. This keeps `core-auth` independently packageable without a source-level library leak.
- `OidcAdapter` is the replaceable/fakeable protocol boundary.
- `OidcClientAdapter` translates only verified claims into `AuthUser`, validates return state through the central validator, and delegates protocol validation/refresh/logout to `oidc-client-ts`.
- `AuthStore` uses private writable signals and public readonly signals/computed state.
- `authGuard` is functional, waits for initialization, rejects callback loops, preserves only a validated route, and prevents duplicate redirects through store operation locks.
- `authInterceptor` is functional and parses URLs by exact origin plus `/api/me` path boundary.
- No `core-auth -> api-customer`, app, feature, catalog, `shared-ui`, Material, or state-library dependency was added.

### Customer application

- Thin lazy sign-in/sign-out callback pages.
- Temporary `/auth-check` route, guarded only to prove authentication and generated `CustomerApiService.getProfile()` access. A valid 404 means authentication worked but the Phase 7 profile does not exist.
- Minimal header control for anonymous, busy, authenticated, safe error, sign-in, sign-out, and authentication-check states.
- Public `/restaurants` remains unguarded.

## 9. File-by-file summary

- `package.json`, `package-lock.json`: exact `oidc-client-ts` 3.5.0 dependency.
- `core-config/app-config.ts`, `provide-app-config.ts`: shared config readiness promise and test.
- `core-auth/auth.models.ts`: safe app-owned user/error/session contracts.
- `core-auth/return-url.ts`: centralized internal destination validation and fallback.
- `core-auth/oidc-config.ts`: runtime code/PKCE/storage configuration.
- `core-auth/oidc-adapter.ts`, `oidc-client.adapter.ts`: narrow protocol abstraction and implementation.
- `core-auth/auth.store.ts`: signal state and lifecycle operations.
- `core-auth/auth.guard.ts`: functional protected navigation.
- `core-auth/auth.interceptor.ts`: protected Customer API token and 401/403 boundary.
- `core-auth/provide-auth.ts`: ordered providers and initializer.
- `core-auth/public-api.ts`: deliberate exports; placeholder component removed.
- Customer `app.config.ts`: config/auth provider wiring and interceptor order.
- Customer `app.routes.ts`: callback and temporary protected routes.
- Customer `app.ts`, `app.html`: minimal accessible auth controls.
- Customer `features/auth/*`: callback/status pages, guarded check, tests, generated-service integration test.

## 10. Authentication state model

Public readonly signals: `initialized`, `busy`, `user`, `error`, and computed `isAuthenticated`. Token access is a method used by infrastructure rather than a writable/public token signal.

The store serializes initialization, sign-in, sign-out, and each callback; duplicate actions share the existing promise. Callback failures, expiry, refresh failure, logout completion, and 401 clear local token/user state. Errors are fixed safe application messages; raw OIDC errors are never exposed.

## 11. Flows

### Sign-in and guard

The guard awaits initialization. Authenticated users continue. Anonymous users call one `signinRedirect` with a validated internal destination in library custom state. Unsafe targets fall back to `/restaurants`; callback routes are redirected locally to avoid loops.

### Sign-in callback

One `signinRedirectCallback` call delegates code, state, nonce, and PKCE validation to the library. The store applies verified state; the page removes callback parameters with `history.replaceState` and performs replace navigation to the validated destination. Failure clears state and renders a retry action without protocol detail.

### Sign-out

Sign-out uses the discovered end-session endpoint. The callback validates the logout response where present, clears in-memory user state even on callback failure, strips callback parameters, and replaces navigation with `/restaurants`.

### Expiry and refresh

`automaticSilentRenew` uses the current in-memory refresh token and the library's single manager renewal lifecycle. Refresh-token rotation is accepted by replacing the complete library user object on `UserLoaded`; application code never reuses an old refresh token. Expiry or `SilentRenewError` removes the user and requires fresh authorization. Requests are never automatically replayed.

## 12. Return URL validation

Accepted values must be bounded strings beginning with one slash and parse as same-origin application paths. The validator repeatedly decodes to detect encoded protocol-relative forms. It rejects absolute/protocol-relative URLs, schemes, backslashes, malformed encoding, overlong values, and both callback routes (including query parameters). Fallback is `/restaurants`.

## 13. Interceptor ordering and scoping

Order: correlation ID -> authentication -> Problem Details.

- Correlation ID reaches every request.
- Auth attaches one bearer header only to the configured Customer API origin and exact `/api/me` path or descendants.
- Public `/api/catalog`, Identity, assets, foreign origins, lookalike hosts, and `/api/meevil` receive no token.
- Existing Authorization is not replaced or duplicated.
- Response unwinding lets Problem Details normalize an HTTP error before auth observes status and clears/retains state.
- 401 clears once and does not replay or redirect automatically.
- 403 retains the authenticated session and records a safe authorization error.

## 14. Tests added

- OIDC runtime mapping, code flow, PKCE, callbacks, scope/client/authority, no secret, memory/transient storage policy.
- Internal return URL acceptance and all requested attack cases.
- Store initialization, authenticated/anonymous restoration, duplicate sign-in/callback/sign-out, success/failure, cleanup, expiry, refresh success/failure, safe errors, one-time 401, and non-clearing 403.
- Guard initialization wait, authenticated allow, anonymous redirect, destination preservation/rejection, callback loops, and initialization failure.
- Token eligibility, lookalike hosts, path boundaries, no-token behavior, duplicate headers, body/query/header preservation, 401/403, and no replay.
- Callback loading, safe success navigation, safe error/retry, and exactly-once processing.
- Generated `CustomerApiService.getProfile()` integration for configured and lookalike base origins without generated-source edits.

## 15. Verification results

| Command | Result | Important output |
|---|---|---|
| `git status --short` (preflight) | Pass | Clean |
| `git branch --show-current` | Pass | `master` |
| `git log -1 --oneline` | Pass | `7961990 feat(ui): establish FoodDash tokens and shared primitives` |
| `node --version` | Pass | `v24.18.1` |
| `npm --version` | Pass | `11.16.0` |
| `npx ng version` | Pass | Angular CLI 22.1.2; Angular 22.1.0 |
| `npx ng test core-auth --watch=false` | Pass | 5 files, 54 tests |
| `npx ng test core-config --watch=false` | Pass | 1 file, 1 test |
| `npx ng test core-http --watch=false` | Pass | 2 files, 5 tests |
| `npx ng test customer --watch=false` | Pass | 6 files, 13 tests |
| `npm run test:openapi-tools` | Pass | 1 test |
| `npm run api:verify` | Pass | 6 services, 25 models, 39 TypeScript files |
| `npx ng build core-auth` | Pass | Angular package built |
| `npx ng build customer --configuration=production` | Pass | 373.68 kB initial; 92.71 kB estimated transfer |
| `npm audit --omit=dev --json` | Pass | 0 production vulnerabilities |
| `git diff --check` | Pass | No patch whitespace errors; Git only reported local LF/CRLF conversion warnings |

An initial `core-auth` build failed because the workspace alias included `core-config` source outside ng-packagr's root. This Phase 6 issue was fixed with structural runtime tokens supplied at the composition root; the rerun passed.

## 16. Live verification

Observed:

- Identity discovery: HTTP 200.
- Customer API Swagger: HTTP 200.
- Angular `/restaurants`: HTTP 200 after starting `ng serve customer`.
- Angular `/assets/config.json`: HTTP 200.
- Anonymous `GET /api/me/profile`: HTTP 401 as required.
- Anonymous catalog API curl did not return an HTTP response within the probe, despite Swagger being reachable; live data was not claimed.

Interactive browser automation was not available through this Kilo session. Credential entry, full redirect/callback, Network-panel bearer scoping, storage inspection, browser back behavior, callback tampering, logout round trip, and refresh-failure simulation remain manual checks. The Angular dev server was started at `http://localhost:4200/` for that verification.

## 17. Manual checks remaining

1. Browse `/restaurants` anonymously and confirm catalog data plus no bearer header.
2. Open `/auth-check`, authenticate through Talabat Identity, and confirm return to `/auth-check` with callback parameters removed.
3. Confirm `GET /api/me/profile` sends one bearer token and treats authenticated 404 as profile-not-created rather than auth failure.
4. Confirm Identity, config/static assets, foreign URLs, and lookalike origins receive no Customer API bearer token.
5. Reload and verify the documented memory-only behavior followed by fresh authorization/Identity SSO restoration.
6. Sign out and verify Identity logout, callback cleanup, stale/back navigation behavior, and no tokens in application-managed browser storage.
7. Tamper with callback state/code and simulate failed refresh; confirm safe error and fresh sign-in requirement.

## 18. Security search and review

Search terms: `localStorage`, `sessionStorage`, `Authorization`, `access_token`, `refresh_token`, `console.log`, `clientSecret`, `response_type=token`, `password grant`, and `includes('api')`.

Classification:

- Application-owned storage: no token persistence. One `sessionStorage` reference supplies library transient transaction state.
- Selected-library boundary: `user.access_token` is read inside the adapter and immediately hidden behind the store. Refresh tokens are never exposed by application contracts.
- Authorization production usage: exact-origin/path interceptor only.
- Generated usage: generated services contain dormant credential-header support but no `Configuration.accessToken` provider is configured; generated files are unchanged.
- Test-only usage: fixed synthetic bearer strings verify header presence/absence and are not real tokens.
- No `localStorage`, token logging, `console.log`, client secret, implicit flow, password grant, weak `includes('api')`, username/password form, or Phase 7 implementation was found.
- `core-auth` imports no customer feature, generated client, shared UI, Material, or state library.

## 19. Roadmap compliance

| Requirement | Status |
|---|---|
| Angular-22-compatible OIDC client evidence | Met |
| Authorization Code + PKCE | Met |
| Runtime `APP_CONFIG` mapping and ordered initialization | Met |
| Memory-only authenticated token storage | Met |
| Signal state, adapter, callbacks, guard, logout | Met |
| Validated internal return destination | Met |
| Exact Customer API `/api/me` bearer scoping | Met |
| 401/403 and refresh-failure safety | Met |
| Generated-client integration test | Met |
| Public catalog route remains unguarded | Met |
| Relevant tests and production build | Met |
| Full live browser OIDC flow | Pending |
| Phase 7 excluded | Met |

## 20. Deviations, risks, and exit decision

- The roadmap's raw `startsWith(baseUrl)` illustration was strengthened to URL parsing, exact origin, and `/api/me` path boundaries.
- Full-page reload does not restore tokens from browser storage by design. Identity SSO can restore through a new authorization redirect when protected navigation is requested.
- The temporary `/auth-check` route exists solely to prove guard and generated protected API integration and should be removed or replaced by legitimate Phase 7 protected routes.
- Live catalog behavior and the complete interactive OIDC round trip remain pending.

The automated Phase 6 implementation is complete, but the complete Phase 6 exit criterion remains pending live OIDC verification.

Phase 7 must not begin until the remaining live OIDC checks pass.

## 21. Recommended commit message

`feat(auth): add PKCE customer authentication and route guards`

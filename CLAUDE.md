# Talabat frontend — project context

Angular 22 SPAs for a Talabat-style food-delivery platform. Only the **Customer** app exists today.

- This repo: `D:\link-dev\talabat-frontend` → `github.com/engakhattab/talabat-frontend`, default branch `master`.
  The Angular CLI workspace lives in `talabat-web/` (run npm/ng commands there).
- Backend (system of record for every rule and contract): `D:\link-dev\talabat` →
  `github.com/engakhattab/Talabat_API` (`main`). Its `CLAUDE.md` and `PROJECT_STATUS_REPORT.md` describe the APIs.
- Governing rules: `.specify/memory/constitution.md` (v1.1.0). It wins over tutorials or general Angular habits;
  report conflicts to the user instead of working around them.

## Workspace (`talabat-web/angular.json`)

| Project | Path alias | Purpose |
|---|---|---|
| `customer` (app, port 4200) | — | Customer SPA: catalog, menu, onboarding, profile/addresses, cart, checkout, orders |
| `api-customer` | `@talabat/api-customer` | **Generated** client for the Customer API — never hand-edit |
| `core-config` | `@talabat/core-config` | Runtime config from `projects/customer/public/assets/config.json` (`APP_CONFIG`) |
| `core-auth` | `@talabat/core-auth` | `oidc-client-ts` Authorization Code + PKCE, in-memory token store, guard, interceptor |
| `core-http` | `@talabat/core-http` | Correlation-ID + ProblemDetails interceptors → typed `AppError` / `AppErrorCode` |
| `shared-ui` | `@talabat/shared-ui` | Domain-free primitives (Button, Card, Input, StatusChip, Spinner, Empty/ErrorState, DialogService) |
| `shared-util` | `@talabat/shared-util` | Money pipe, date formatting |

Customer app layout: `projects/customer/src/app/{core,layout,ui,features/<feature>}`, with lazy feature routes.

## Non-negotiable rules (summary of the constitution)

- **Backend is authoritative**: never compute prices, totals, permissions, or profile state client-side.
- **All HTTP goes through generated `api-*` services**; features never inject `HttpClient`. Base URLs come from runtime
  config, never hardcoded.
- **Dependency direction**: apps → features → `core-*` → `api-*` → nothing; `shared-*` are domain-free; features
  never import other features; `core-*` stay domain-neutral.
- **Angular 22 style**: standalone, zoneless, `@if/@for`, signals (`signal/computed/linkedSignal`, `resource`),
  `input()/output()`, `inject()`, Signal Forms. Prohibited: NgModule, `*ngIf/*ngFor`, `@Input/@Output`, constructor DI,
  Reactive Forms/FormBuilder, BehaviorSubject for local state, zone.js, Karma/Jasmine, Angular Material, NgRx.
- **Auth**: PKCE via `Talabat.Identity` (https://localhost:7237); no app-owned login/register UI; tokens in memory
  only; bearer token attached only for an exact origin + `/api/me` path-boundary match.
- **Errors**: features branch on typed `AppErrorCode` (from the ProblemDetails root `errorCode`), never on raw
  status or message text. Every server-driven view renders loading, error, empty/not-found, and data states.
- **Routing**: lazy routes; `authGuard` before `profileGuard`; guards return `UrlTree`. `GET /api/me/profile` 404 is
  the single "no profile" signal.
- **UI**: Tailwind v4 `@theme` tokens + Angular CDK only; logical CSS properties only (`ps/pe/ms/me`); responsive at
  320/768/1280px and 200% zoom; touch targets ≥ 42px (customer) / 56px (delivery). Design source:
  `fooddash-DESIGN.md` (`genesis-DESIGN.md` is parked).
- **Naming**: `*.page.ts`, `*.component.ts`, `*.store.ts`, `*.guard.ts`, `*.interceptor.ts`, `*.pipe.ts`; one public
  symbol per file; barrels only at library roots. Strict TS — no `any`, no non-null assertions on API data.
- **Git**: clean baseline before each phase; contract/client regeneration in its own commit, separate from features;
  Conventional Commits; never weaken or delete tests to pass a gate.
- **Git attribution (strict, permanent):** Never add Claude, Anthropic, or AI attribution as git commit author or via
  `Co-authored-by` trailer. All commits must strictly use the local git config user and email with zero AI
  co-authorship metadata.

## Commands (from `talabat-web/`)

```bash
npm ci
npx ng test customer --watch=false
npx ng test core-auth --watch=false
npm run build:customer:production
npm run api:gen
npm run api:verify
npm run e2e:preflight
```

- Library test targets: `core-config`, `core-auth`, `core-http`, `shared-ui`, `shared-util` (Vitest via
  `@angular/build:unit-test`). `npm run test:openapi-tools` tests the contract tooling.
- `api:gen` = `api:copy` (byte-copies `customer-api.json` and `delivery-api.json` from `../../talabat/src/...`, or
  `E2E_BACKEND_ROOT`) + builds the custom Maven generator in `tools/talabat-openapi-generator` (needs a **JDK**) +
  generates `projects/api-customer`. Only the Customer client is generated today; `openapi/delivery-api.json` is
  copied but unused, and there is no `admin-api.json` yet.
- `build:customer:production` also runs `tools/verify-customer-bundle.mjs` (bundle audit; budgets: initial 1MB error).
- Playwright E2E (`e2e/`) needs the backend running and credentials in `E2E_CUSTOMER_EMAIL` / `E2E_CUSTOMER_PASSWORD`
  (never commit them); endpoints are overridable with `E2E_IDENTITY_ORIGIN`, `E2E_CUSTOMER_API_ORIGIN`, `E2E_SPA_URL`.
  The runbook is `talabat-web/docs/customer-release-runbook.md`.
- CI: `.github/workflows/customer-ci.yml` (staged unit tests, client verify, prod build). Its `live-e2e` job runs
  only on manual dispatch and merely probes already-running services — it does not start the backend or SPA.
- GitHub: use `gh` (logged in as `engakhattab`); if Bash cannot find it, use `"/c/Program Files/GitHub CLI/gh.exe"`.

## Local environment gotchas

- **Node.js and a JDK are not installed on this machine** — nothing here can currently be built, tested, or
  regenerated. CI specifies Node 24. Do not claim frontend changes work without running them.
- Repos were copied from another machine: git reports "dubious ownership"; prefix git with `git -c safe.directory=*`.
- `.gitignore` ignores `*.log`, `dist/`, `node_modules/`, Playwright `test-results/` and `playwright-report/`.
- Line endings: the index is LF (`core.autocrlf=true`); never stage with `core.autocrlf=false`.

## Backend contract facts the UI depends on

- Checkout 422 is the typed `CheckoutUnavailableResponse` (`unavailableItems`) — the recovery flow parses it.
- Order list `itemCount` is the total quantity; list endpoints clamp `pageSize` to 1..50 and return real `totalCount`.
- `RestaurantSummaryDto.isActive` actually means "open now".
- Order confirmation copy "Order confirmed" / "Cash on Delivery" has no backend counterpart (no order status, no payment model).

## Current status and next work (2026-10-13)

- `master` @ `652c645`. Customer app phases 1–10 are committed; Phase 11 release hardening (`specs/005-release-hardening`)
  is committed but tasks T036 (manual address acceptance), T038 (runbook finalization) and T039 (ordered release gate)
  are open, and nothing has been re-verified since the move to this machine.
- The Delivery app is no longer blocked on the backend: applicant status/profile, agent status, Admin approval, and
  pickup data now exist. Plan: `docs/talabat-delivery-frontend-roadmap.md` (start with its Phase 1, app-neutral
  `core-*`; note the constitution's Scope Guard still lists `delivery` as deferred — confirm with the user).
- Admin and Restaurant Owner apps are out of scope per the constitution's Scope Guard.

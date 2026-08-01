# Spec-Kit Constitution Prompt — `Talabat_Web`

Run `/speckit.constitution` in the **`Talabat_Web`** repository and paste everything below the line.

Do **not** run this in `Talabat_API` — that repository has its own constitution (v3.0.1) governing
Domain, Application, Infrastructure, and the three API hosts. This one governs the Angular frontend
only.

---

Create the constitution for **Talabat_Web**, the Angular frontend for the Talabat food-ordering
platform. Set it as version 1.0.0, ratified today.

## Repository context

Two Angular 22 applications in one Angular CLI workspace, consuming three existing .NET backend
hosts. The backend is the authoritative source of all business rules; this repository contains no
business logic.

Backend hosts (already built and stable):
- `Talabat.Identity` — Duende IdentityServer + ASP.NET Core Identity, Razor login/register/logout
- `Talabat.Customer.API` — 16 operations, audience `talabat.customer.api`
- `Talabat.Delivery.API` — 13 operations, audience `talabat.delivery.api`

OIDC clients: `talabat-customer-spa` (origin `http://localhost:4200`, scopes
`openid profile roles customer.api offline_access`) and `talabat-delivery-spa` (origin
`http://localhost:4300`, scopes `openid profile roles delivery.api offline_access`). Both use
Authorization Code + PKCE with no client secret; access token lifetime 900s with refresh rotation.
Callback routes are `/signin-callback` and `/signout-callback`.

The governing implementation plan is `talabat-angular-plan-v2.md` at the repository root. The
constitution holds permanent rules; the plan holds sequencing. Reference it the way the backend
constitution references `PROJECT_IMPLEMENTATION_ROADMAP.md`.

## Core principles (permanent)

1. **The backend is authoritative.** Business rules, invariants, pricing, and authorization
   decisions live in the backend. The frontend MUST NOT re-implement, duplicate, or approximate a
   domain rule. Client-side validation is a UX affordance only; it never substitutes for server
   enforcement. Order totals MUST NOT be computed client-side and treated as authoritative. Cart
   items carry no price — displayed prices MUST come from current catalog data.

2. **API access is generated, never hand-written.** All HTTP calls go through TypeScript clients
   generated from the backend's committed OpenAPI documents. Generated libraries under
   `projects/api-*/` are build artifacts: never hand-edited, never manually reorganized, never
   partially copied. `HttpClient` MUST NOT be injected outside `core-http`. To change a contract,
   change the backend and regenerate.

3. **Dependency direction is one-way.** `apps → features → core-* → api-* → nothing`, with
   `shared-*` available to apps and features. Libraries under `core-*` and `shared-*` MUST NOT
   import from an application or a feature. Features MUST NOT import from each other. `shared-ui`
   components accept inputs and emit outputs and MUST NOT inject domain services.

4. **Features are vertical slices as folders, not libraries.** A feature owns its routes,
   components, and store within its application. A folder is promoted to a library only when a
   second application genuinely needs it. Angular MUST NOT mirror the backend's Clean Architecture
   layer names — no `domain/`, `application/`, or `infrastructure/` folders. The unit of
   architecture here is the library.

5. **Modern Angular only.** Standalone components; `@if`/`@for`/`@switch`/`@defer`;
   `input()`/`output()`/`model()`; `inject()`; signals; `httpResource`/`resource`; Signal Forms;
   zoneless change detection; Vitest. `NgModule`, structural directives (`*ngIf`, `*ngFor`,
   `*ngSwitch`), decorator-based `@Input()`/`@Output()`, constructor injection,
   `ReactiveFormsModule`/`FormBuilder`, `zone.js`, and Karma/Jasmine are prohibited in new code.

6. **Tokens live in memory only.** Access and refresh tokens MUST NOT be written to `localStorage`,
   `sessionStorage`, cookies, or any persistent store. Bearer tokens are attached by an interceptor
   matching the configured API base URL by exact prefix — never by substring matching — so a token
   scoped to one API can never reach another API or a third party. The SPA MUST NOT contain a login
   or registration form; authentication is a redirect to `Talabat.Identity`.

7. **One build, any environment.** Environment-specific values (API base URLs, OIDC authority,
   client id, scopes) are loaded at runtime from a configuration file fetched during application
   initialization. Angular's `environment.ts` MUST NOT hold environment-specific values, and URLs
   MUST NOT be hardcoded.

## Decided standards

- **Workspace**: single Angular CLI workspace. Not Nx (revisit at 3+ applications or 3+ developers).
- **Applications**: `customer` on port 4200 (responsive) and `delivery` on port 4300 (mobile-first,
  no desktop breakpoints).
- **Styling**: Tailwind v4 with CSS-first `@theme`, plus Angular CDK for behavioral primitives
  (Overlay, Dialog, A11yModule, BidiModule) and Angular Aria for accessible interaction patterns.
  **Angular Material MUST NOT be installed** — its Material Design 3 opinions conflict with the
  project's design tokens.
- **Design system**: `fooddash-DESIGN.md` governs both applications — one token foundation
  (6px spacing base, radius scale, elevation curve, Poppins/DM Sans/Roboto Mono) with a per-app skin
  overriding accent color, tap-target size, and body text size. Semantic status colors are identical
  across both apps. `genesis-DESIGN.md` is parked and MUST NOT be used without an amendment.
- **CSS direction**: logical properties only (`ps-*`, `pe-*`, `ms-*`, `me-*`). Physical
  left/right properties are prohibited so RTL remains possible.
- **State**: signals and services. A state-management library MUST NOT be introduced without a
  constitution amendment naming the specific problem it solves.
- **Error contract**: all API errors are RFC 9457 `ProblemDetails` with `errorCode` at the root, not
  nested under `extensions`. A single interceptor maps them to a typed application error; features
  branch on the typed code, never on a raw string or bare status number.
- **Profile gate**: `GET /api/me/profile` returning 404 is the single authoritative signal that no
  customer profile exists. Other `api/me/*` endpoints return 409 with the same error code; those are
  handled by the interceptor as defence in depth, not by the route guard.
- **Naming**: `*.page.ts`, `*.component.ts`, `*.store.ts`, `*.guard.ts`, `*.interceptor.ts`,
  `*.pipe.ts`. One public symbol per file. Barrel files at library roots only.
- **Every asynchronous view** renders loading, error, and empty states explicitly.
- **`any` and non-null assertions on API data are prohibited.** TypeScript strict mode is on.

## Scope guard (permanent until amended)

Out of scope: payments, notifications, coupons, reviews, admin dashboards, restaurant-owner
workflows, real-time tracking or SignalR, maps and live geolocation, search and recommendations,
internationalization and translation, server-side rendering, PWA and offline support, dark mode, and
native mobile applications.

The delivery application is deferred until the customer application is complete. It is additionally
blocked on a backend mechanism for approving a delivery-agent application, which does not yet exist.

## Quality gates

- The workspace builds and all tests pass before any phase is considered complete.
- Generated API clients are regenerated and committed whenever a backend contract changes, in a
  commit separate from feature work.
- Every feature route is lazy-loaded; bundle budgets fail the build when exceeded.
- Test priority: route guards, error mapping, stores, components with real logic, then one
  end-to-end happy path. Coverage percentage is not a gate — the frontend holds no business
  invariants.
- Each phase in the governing plan has an exit criterion that must be met and reported before the
  next phase begins.

## Governance

Amendments require an explicit written decision recording the change, the rationale, the rejected
alternatives, and the consequences. Semantic versioning applies: MAJOR for a redefined or removed
principle, MINOR for a new principle or standard, PATCH for clarification with no rule change.

When an AI coding agent finds that this constitution conflicts with an external example,
tutorial, or its own training data, the constitution wins and the conflict MUST be reported rather
than silently resolved. Ambiguity MUST be escalated, not guessed.

Include a Sync Impact Report comment block at the top of the generated file, matching the
convention used by the `Talabat_API` constitution.

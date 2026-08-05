<!--
Sync Impact Report:
- Version change: v1.0.0 -> v1.1.0
- Ratification: 2026-08-01
- Last Amended: 2026-08-06
- Modified principles:
  * Principle I: Authoritative Backend & Data Ownership (expanded to prohibit client-authoritative totals, cart/profile state, or permissions)
  * Principle II: Generated API Boundary & Client Isolation (expanded to enforce runtime config base paths and separate contract commits)
  * Principle III: Strict One-Way Dependency Hierarchy (expanded to mandate core infrastructure domain-neutrality and app-level customer state)
  * Principle IV: Vertical Feature Slices & Routing (expanded to require lazy routes, authGuard before profileGuard, UrlTree returns, and explicit callback/onboarding/404 handling)
  * Principle V: Angular 22 Platform & State Standards (expanded for Signal Forms, Zoneless execution, signal interop, and prohibition of BehaviorSubject/NgModule/constructor DI)
  * Principle VI: Authentication & Security Boundary (expanded for Authorization Code + PKCE, in-memory tokens, exact URL prefix matching, return URL/callback validation)
  * Principle VII: HTTP & Error Handling Infrastructure (expanded to prohibit direct HttpClient in features and require typed AppError handling and 4-state async views)
  * Principle VIII: FoodDash Design System, Accessibility & UI Boundaries (new principle for Tailwind v4 tokens, CDK overlay behaviors, 320/768/1280px responsiveness, 200% zoom, 42px touch targets, logical CSS properties)
  * Principle IX: Automated Testing & Verification Gates (new principle for Vitest test priority, mock boundaries, and non-weakening policy)
  * Principle X: Phase & Git Discipline (new principle for clean baselines, single phase execution, separate contract commits, and one commit per phase)
- Added sections:
  * Governance & Compliance Verification (formal amendment procedure, compliance requirements across spec/plan/tasks, MUST vs RECOMMENDATION distinction)
- Removed sections: None
- Deferred TODOs: None
-->

# Talabat_Web Constitution

## Core Principles

### I. Authoritative Backend & Data Ownership
Business rules, domain invariants, pricing calculations, cart/order totals, customer profile states, and authorization permissions live strictly on the backend. The frontend MUST NOT re-implement, duplicate, or approximate domain calculations. Client-side validation is a UX affordance only and never substitutes for server enforcement. Order totals and cart line totals MUST NOT be computed client-side and treated as authoritative. Cart items stored in frontend memory carry no authoritative price; displayed prices MUST come directly from current catalog server data.

### II. Generated API Boundary & Client Isolation
All HTTP communication MUST go through TypeScript services generated from the backend's committed OpenAPI specifications (`openapi/*.json`). Generated libraries under `projects/api-*/` are read-only build artifacts: developers and AI agents MUST NEVER hand-edit, reorganize, or manually copy files inside them. API base URLs MUST be supplied dynamically from runtime configuration (`APP_CONFIG`), never hardcoded. Backend contract changes MUST be executed on the backend first, regenerated via npm scripts (`npm run api:gen`), reviewed independently, and committed in a dedicated contract commit separate from feature implementations.

### III. Strict One-Way Dependency Hierarchy
Dependency direction MUST strictly adhere to the workspace hierarchy: `apps → features → core-* → api-* → nothing`, with `shared-*` available to applications and features. Core infrastructure libraries (`core-config`, `core-auth`, `core-http`) MUST remain strictly domain-neutral and independently buildable. Customer-domain state belongs inside the customer application (`projects/customer/src/app/features/...`) unless cross-application reuse is explicitly demonstrated. Shared UI (`projects/shared-ui`) MUST remain domain-free (accepting inputs and emitting outputs without injecting domain services or importing domain DTOs). Features MUST NOT import from other features. Generated API libraries (`projects/api-*`) MUST depend on nothing in the frontend repository.

### IV. Vertical Feature Slices & Routing
Features are structured as self-contained vertical slices (folders) owning their routes, components, and state stores within an application. Promoting feature code to a shared library is prohibited unless a second application genuinely requires it. The frontend MUST NOT mirror backend Clean Architecture layer names (`domain/`, `application/`, `infrastructure/`); the architectural unit in Angular is the library or feature folder. Every feature route MUST be lazy-loaded (`loadChildren`). Guard execution order MUST ALWAYS execute the authentication guard (`authGuard`) before the profile guard (`profileGuard`). Public catalog routes MUST remain accessible without authentication. Guards MUST return `UrlTree` redirection targets to prevent navigation loops. Callback (`/signin-callback`), onboarding (`/onboarding`), not-found (`**`), and failure routes MUST remain explicitly handled.

### V. Angular 22 Platform & State Standards
All application and library code MUST strictly adhere to modern Angular v22 standards:
- **Architecture**: Standalone components (`imports: [...]`), Zoneless execution (`provideZonelessChangeDetection()`), and modern control flow syntax (`@if`, `@for`, `@switch`, `@defer`).
- **Reactivity & DI**: Signal-based reactive state (`signal()`, `computed()`, `linkedSignal()`), server resources (`resource()`, `httpResource()`), signal inputs/outputs (`input()`, `input.required()`, `output()`), and function injection (`inject()`).
- **Forms**: Signal Forms (`@angular/forms/signals`) for all application form state.
- **Strictly Prohibited**: `NgModule`, legacy structural directives (`*ngIf`, `*ngFor`), decorator `@Input()`/`@Output()`, constructor parameter injection, `FormBuilder`/`ReactiveFormsModule`/`ControlValueAccessor`, `BehaviorSubject`/RxJS for component-local state, `zone.js`, Karma, and Jasmine.

### VI. Authentication & Security Boundary
Authentication MUST use Authorization Code Flow with PKCE via `Talabat.Identity` (port `:7237`). The SPA MUST NOT contain application-owned login, registration, consent, or logout forms or UI views. Access and refresh tokens MUST NOT be stored in `localStorage`, `sessionStorage`, cookies, or any persistent browser storage (in-memory storage only). Bearer tokens MUST be attached by an HTTP interceptor matching the configured API base URL by exact prefix match — substring matching is strictly prohibited to prevent token leakage to external origins. Frontend route guards and UI state checks MUST NEVER replace backend authorization enforcement. Return URLs (`redirect_uri`) and OAuth state parameters MUST remain strictly validated against open redirect vulnerabilities.

### VII. HTTP & Error Handling Infrastructure
Feature code MUST NEVER inject `HttpClient` directly; all data access MUST pass through generated `api-*` services. The core HTTP pipeline (`correlationIdInterceptor`, `authInterceptor`, `problemDetailsInterceptor`) MUST remain intact. All backend errors (RFC 9457 `ProblemDetails`) are mapped by `problemDetailsInterceptor` using root `errorCode` into typed application errors (`AppError`, `AppErrorCode`). Features MUST react to typed `AppErrorCode` values rather than raw status codes or backend message strings. Every server-driven view MUST explicitly implement loading, error, empty/not-found, and populated presentation states.

### VIII. FoodDash Design System, Accessibility & UI Boundaries
Tailwind CSS v4 CSS-first tokens (`@theme` in `styles.css`) represent the sole visual source of truth for colors, the 6px base spacing scale, radius tokens, and elevation curves. Angular CDK (`@angular/cdk/dialog`, `@angular/cdk/overlay`) supplies behavioral primitives; Angular Material is strictly prohibited due to Material 3 design token conflicts. All UI components MUST enforce:
- **Semantic Structure**: Semantic HTML tags (`<main>`, `<header>`, `<section>`, `<label>`, `<button>`).
- **Accessibility**: Visible focus indicators (`:focus-visible` using `--tal-focus-ring`), keyboard navigation, screen reader support (`.tal-visually-hidden`), reduced-motion support (`prefers-reduced-motion`), and accessible form error linking (`aria-invalid`, `aria-describedby`).
- **Responsive Layouts**: Customer UI MUST remain fully responsive at 320px, 768px, and 1280px viewports and fully usable at 200% browser zoom without layout breaking or text truncation.
- **Touch Targets**: Minimum touch target height MUST measure at least 42px for the `customer` application and 56px for the `delivery` application.
- **RTL & Logical Properties**: CSS logical properties MUST be used exclusively (`ps-*`, `pe-*`, `ms-*`, `me-*`). Physical directional properties (`pl-*`, `pr-*`, `ml-*`, `mr-*`) are strictly prohibited.

### IX. Automated Testing & Verification Gates
Automated unit/integration tests are mandatory for route guards, feature stores, error interceptor mapping, Signal Forms, routing behavior, and presentational components with custom logic. Tests MUST execute using the workspace Vitest configuration (`@angular/build:unit-test`). Mocks and unit test doubles do NOT substitute for live API contract or OIDC authentication verification. Every implementation phase requires: affected unit tests passing, production build passing (`ng build`), and documented manual acceptance evidence. Developers and AI agents MUST NOT weaken, skip, or delete test assertions to make a phase pass.

### X. Phase & Git Discipline
Developers and AI agents MUST implement only the single active phase. Starting subsequent phases automatically without user prompt is strictly forbidden. Every phase MUST begin from a clean, committed Git working baseline (`git status --short` clean). Generated API contract updates MUST be committed separately from feature application code. Completed phases MUST produce exactly one focused conventional commit (e.g., `feat(ui): establish FoodDash tokens and shared primitives`). Failing quality gates MUST be reported and resolved rather than bypassed or ignored.

## Decided Standards

- **Workspace Structure**: Single Angular CLI workspace. (Nx transition is deferred until 3+ applications or 3+ core developers).
- **Applications**: `customer` application on port 4200 (responsive web) and `delivery` application on port 4300 (mobile-first layout, no desktop breakpoints).
- **Styling Framework**: Tailwind CSS v4 with CSS-first `@theme`, alongside Angular CDK for behavioral primitives (`Overlay`, `Dialog`, `A11yModule`, `BidiModule`). **Angular Material MUST NOT be installed**.
- **Design System**: `fooddash-DESIGN.md` governs both applications using a unified token foundation (6px spacing base, radius scale, elevation curve, Poppins/DM Sans/Roboto Mono) with app-specific skins for accent color, tap-target size, and body text size. `genesis-DESIGN.md` is parked and MUST NOT be used without a formal amendment.
- **State Management**: Signals and services. Higher-level state management libraries (NgRx, SignalStore, Akita) MUST NOT be introduced without a formal constitution amendment.
- **Error Handling Contract**: All API errors conform to RFC 9457 `ProblemDetails` with `errorCode` at the root. A single interceptor maps them to typed application errors; features branch on typed codes.
- **Customer Profile Gate**: A `GET /api/me/profile` returning 404 is the single authoritative signal that no customer profile exists. Secondary 409 responses from `api/me/*` endpoints are handled defensively by the interceptor.
- **File & Symbol Naming**: Filenames MUST follow `*.page.ts`, `*.component.ts`, `*.store.ts`, `*.guard.ts`, `*.interceptor.ts`, `*.pipe.ts`. One public symbol per file. Barrel files (`index.ts`) are restricted to library roots only.
- **Strict Typing**: `any` and non-null assertions on API data are strictly prohibited. TypeScript strict mode is enabled.

## Scope Guard

- **Out of Scope**: Payments, notifications, coupons, reviews, admin dashboards, restaurant-owner workflows, real-time tracking / SignalR, maps and live geolocation, search and recommendations, internationalization / translation, server-side rendering (SSR), PWA / offline support, dark mode, and native mobile applications.
- **Deferred Work**: The `delivery` application is deferred until the `customer` application is complete and an upstream backend mechanism for approving delivery-agent applications is implemented.

## Quality Gates

1. The workspace MUST build cleanly without errors (`ng build`), and all unit tests MUST pass before any implementation phase is declared complete.
2. Generated API clients MUST be regenerated and committed whenever backend contracts change, using dedicated commits separate from feature code.
3. Every feature route MUST be lazy-loaded. Build bundle budgets MUST fail the build if exceeded.
4. Test priority order: Route guards → Error mapping → Stores → Components with business/display logic → End-to-End happy path.
5. Each implementation phase defined in `talabat-angular-plan-v2.md` MUST meet its exit criteria before the next phase begins.

## Governance & Compliance Verification

- **Amendment Policy**: Proposed amendments to this constitution require a written decision record documenting the change, technical rationale, rejected alternatives, and impact analysis.
- **Versioning Policy**: Semantic versioning rules govern constitution revisions:
  - **MAJOR (`X.0.0`)**: Redefined, relaxed, or removed principles or core architecture constraints.
  - **MINOR (`1.X.0`)**: Addition of new principles, structural standards, or significantly expanded governance rules.
  - **PATCH (`1.0.X`)**: Clarifications, formatting refinements, and non-semantic corrections.
- **Compliance Enforcement**: Every feature specification (`spec.md`), implementation plan (`plan.md`), task list (`tasks.md`), code implementation, and convergence review (`/speckit-converge`) MUST explicitly demonstrate compliance with this constitution.
- **MUST vs RECOMMENDATION**:
  - Requirements designated as **MUST** or **MUST NOT** represent strict, non-negotiable architectural gates. Any violation blocks phase completion.
  - Guidance designated as **SHOULD** or **RECOMMENDED** represents established best practices; any deviation requires explicit written justification in design artifacts.
- **AI Decision Priority**: When an AI coding agent encounters a conflict between this constitution and external tutorials, web examples, or LLM training data, this constitution MUST prevail. Conflicts MUST be reported to the user immediately.

---

**Version**: 1.1.0 | **Ratified**: 2026-08-01 | **Last Amended**: 2026-08-06

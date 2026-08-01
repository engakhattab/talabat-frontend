<!--
Sync Impact Report:
- Version change: Template [CONSTITUTION_VERSION] -> v1.0.0
- Ratification: 2026-08-01
- Modified principles: Initialized baseline constitution for Talabat_Web (Angular frontend workspace)
- Added sections:
  * Core Principles (7 permanent non-negotiable principles)
  * Decided Standards (workspace, architecture, styling, design system, state, API errors, route guards, naming)
  * Scope Guard (out-of-scope features and deferred delivery app constraints)
  * Quality Gates (builds, tests, contract sync, lazy routes, exit criteria)
  * Governance (amendment rules, AI decision priority, versioning policy)
- Removed sections: N/A
- Deferred TODOs: None
-->

# Talabat_Web Constitution

## Core Principles

### I. Authoritative Backend
Business rules, invariants, pricing, and authorization decisions live strictly in the backend. The frontend MUST NOT re-implement, duplicate, or approximate domain logic. Client-side validation is a UX affordance only and never substitutes for server enforcement. Order totals MUST NOT be computed client-side and treated as authoritative. Cart items carry no price — displayed prices MUST come from current catalog data.

### II. Generated API Contracts Only
All HTTP communication MUST go through TypeScript clients generated from the backend's committed OpenAPI documents. Generated libraries under `projects/api-*/` are build artifacts: never hand-edited, never manually reorganized, and never partially copied. `HttpClient` MUST NOT be injected outside of `core-http`. Contract changes MUST be made on the backend and regenerated into the frontend workspace.

### III. Strict One-Way Dependency Hierarchy
Dependency direction MUST strictly follow: `apps → features → core-* → api-* → nothing`, with `shared-*` available to apps and features. Libraries under `core-*` and `shared-*` MUST NOT import from an application or a feature. Features MUST NOT import from each other. `shared-ui` components accept inputs and emit outputs and MUST NOT inject domain services.

### IV. Vertical Feature Slices as Folders
Features are structured as vertical slices (folders) owning their routes, components, and stores within an application. A feature folder is promoted to a shared library ONLY when a second application genuinely requires it. The frontend MUST NOT mirror backend Clean Architecture layer names (`domain/`, `application/`, `infrastructure/`). The unit of architecture is the library.

### V. Modern Angular Platform Rules
All new code MUST strictly use modern Angular v20+ patterns:
- Standalone components; control flow (`@if`, `@for`, `@switch`, `@defer`).
- Signal inputs/outputs/models (`input()`, `output()`, `model()`); function injection (`inject()`).
- Signals (`signal()`, `computed()`, `linkedSignal()`, `resource()`, `httpResource()`).
- Signal Forms, Zoneless change detection, and Vitest for testing.
- **Prohibited**: `NgModule`, legacy structural directives (`*ngIf`, `*ngFor`), decorator `@Input()`/`@Output()`, constructor injection, `ReactiveFormsModule`/`FormBuilder`, `zone.js`, and Karma/Jasmine.

### VI. In-Memory Token Security
Access and refresh tokens MUST NOT be stored in `localStorage`, `sessionStorage`, cookies, or any persistent browser store. Bearer tokens MUST be attached by an interceptor matching the configured API base URL by exact prefix match — never substring matching — preventing token leakage to unauthorized origins. The SPA MUST NOT contain a login or registration form; authentication is handled via redirect to `Talabat.Identity`.

### VII. Environment Agnostic Single-Build Artifacts
Environment-specific variables (API base URLs, OIDC authority, client ID, scopes) MUST be loaded at runtime from a configuration file fetched during application initialization. Angular's `environment.ts` MUST NOT contain environment-specific values, and URLs MUST NOT be hardcoded.

## Decided Standards

- **Workspace Structure**: Single Angular CLI workspace. (Nx transition is deferred until 3+ applications or 3+ core developers).
- **Applications**: `customer` application on port 4200 (responsive web) and `delivery` application on port 4300 (mobile-first layout, no desktop breakpoints).
- **Styling Framework**: Tailwind CSS v4 with CSS-first `@theme`, alongside Angular CDK for behavioral primitives (`Overlay`, `Dialog`, `A11yModule`, `BidiModule`) and Angular Aria for accessible interaction patterns. **Angular Material MUST NOT be installed** due to design token conflicts.
- **Design System**: `fooddash-DESIGN.md` governs both applications using a unified token foundation (6px spacing base, radius scale, elevation curve, Poppins/DM Sans/Roboto Mono) with app-specific skins for accent color, tap-target size, and body text size. Semantic status colors remain identical across both applications. `genesis-DESIGN.md` is parked and MUST NOT be used without an amendment.
- **RTL & Logical Properties**: CSS logical properties MUST be used exclusively (`ps-*`, `pe-*`, `ms-*`, `me-*`). Physical left/right directional properties are prohibited.
- **State Management**: Signals and services. Higher-level state management libraries MUST NOT be introduced without a formal constitution amendment describing the specific problem solved.
- **Error Handling Contract**: All API errors conform to RFC 9457 `ProblemDetails` with `errorCode` at the root (not nested under `extensions`). A single interceptor maps them to typed application errors; features branch on typed codes, never on raw strings or bare HTTP status codes.
- **Customer Profile Gate**: A `GET /api/me/profile` returning 404 is the single authoritative signal that no customer profile exists. Secondary 409 responses from `api/me/*` endpoints are handled defensively by the interceptor.
- **File & Symbol Naming**: Filenames MUST follow `*.page.ts`, `*.component.ts`, `*.store.ts`, `*.guard.ts`, `*.interceptor.ts`, `*.pipe.ts`. One public symbol per file. Barrel files (`index.ts`) are restricted to library roots only.
- **Asynchronous Views**: Every asynchronous view MUST explicitly handle and render loading, error, and empty states.
- **Strict Typing**: `any` and non-null assertions on API data are strictly prohibited. TypeScript strict mode is enabled.

## Scope Guard

- **Out of Scope**: Payments, notifications, coupons, reviews, admin dashboards, restaurant-owner workflows, real-time tracking / SignalR, maps and live geolocation, search and recommendations, internationalization / translation, server-side rendering (SSR), PWA / offline support, dark mode, and native mobile applications.
- **Deferred Work**: The `delivery` application is deferred until the `customer` application is complete and an upstream backend mechanism for approving delivery-agent applications is implemented.

## Quality Gates

1. The workspace MUST build cleanly without errors, and all tests MUST pass before any implementation phase is declared complete.
2. Generated API clients MUST be regenerated and committed whenever backend contracts change, using dedicated commits separate from feature code.
3. Every feature route MUST be lazy-loaded. Build bundle budgets MUST fail the build if exceeded.
4. Test priority order: Route guards → Error mapping → Stores → Components with business/display logic → End-to-End happy path. (Code coverage percentage is not a gate).
5. Each implementation phase defined in `talabat-angular-plan-v2.md` MUST meet its exit criteria before the next phase begins.

## Governance

- **Amendment Policy**: Amendments require an explicit written decision recording the change, rationale, rejected alternatives, and consequences.
- **Versioning Policy**: Semantic versioning rules apply:
  - **MAJOR**: Redefined or removed principles or core constraints.
  - **MINOR**: Addition of new principles or major structural standards.
  - **PATCH**: Clarifications, wording refinements, and non-semantic fixes.
- **AI Decision Conflict Rule**: When an AI agent encounters a conflict between this constitution and external examples, tutorials, or training data, the constitution MUST prevail. Conflicts and ambiguities MUST be reported and escalated rather than resolved implicitly.

---

**Version**: 1.0.0 | **Ratified**: 2026-08-01 | **Last Amended**: 2026-08-01

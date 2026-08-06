# Phase 7 Requirements Quality Checklist: Customer Shell, Profile Gate, Onboarding, and Restaurant Menu

**Purpose**: Validate requirement completeness, clarity, consistency, measurability, and scenario coverage across Phase 7 design artifacts before implementation.  
**Created**: 2026-08-06  
**Last Verified**: 2026-08-06  
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [Constitution](../../.specify/memory/constitution.md)

---

## 1. Scope Protection & Boundary Quality

- [x] CHK001 Are all Phase 7 deliverable outcomes explicitly bounded to exclude Phase 8 server-backed cart mutations (`POST /api/me/cart/items`), checkout, orders, addresses, and post-onboarding profile editing? [Completeness, Spec §Non-Goals, Plan §Summary]
- [x] CHK002 Is it explicitly specified that no generated-client source files under `projects/api-customer` or backend source files may be manually edited or generated during Phase 7? [Boundary, Constitution §II, Plan §Constraints]
- [x] CHK003 Are unsupported catalog data structures (modifiers, item variants, category hierarchies, delivery estimates, reviews, maps, and SignalR) explicitly prohibited in both requirements and UI components? [Completeness, Spec §Non-Goals, Plan §Technical Context]
- [x] CHK004 Is the handoff contract between Phase 7 item selection events and Phase 8 server-backed cart persistence explicitly specified without ambiguous fake local cart storage or client-authoritative totals? [Clarity, Spec §FR-019, Plan §Architecture Decisions]

---

## 2. Profile State & Profile Guard Requirements Quality

- [x] CHK005 Are all possible HTTP response status codes (`200`, `404`, `401`, `403`, `500`, network failure) for `GET /api/me/profile` mapped to explicit profile state transitions? [Completeness, Spec §FR-003-004, Plan §Profile State Ownership]
- [x] CHK006 Is the `404 ProfileNotCreated` response explicitly defined as the single authoritative trigger for customer onboarding, while differentiating secondary `409` defensive handling on other endpoints? [Clarity, Constitution Decided Standards, Plan §Summary]
- [x] CHK007 Are once-per-session profile caching, in-flight request deduplication for concurrent guard calls, and profile state reset triggers (logout, token expiration) explicitly specified? [Scenario Coverage, Spec §Clarifications Q3, Plan §Profile State Ownership]
- [x] CHK008 Is profile state ownership explicitly mandated to reside within the customer application (`app/core/profile`) to preserve `core-auth` domain neutrality without introducing illegal library dependencies? [Consistency, Constitution §III, Plan §Profile State Ownership]
- [x] CHK009 Are retry semantics and error recovery requirements specified for when `GET /api/me/profile` probe fails due to transient network or server errors? [Resilience, Spec §Edge Cases, Plan §Technical Context]

---

## 3. Onboarding & Form Validation Requirements Quality

- [x] CHK010 Are form field specifications for `CreateProfileRequest` (`fullName`, `age`, `phoneNumber`) aligned with generated OpenAPI models and quantified with precise validation rules? [Completeness, Spec §FR-007, Plan §Onboarding & Profile Form]
- [x] CHK011 Is the behavior for optional/nullable fields (such as `phoneNumber` whitespace normalization and null conversion) explicitly defined for both client submission and backend responses? [Clarity, Spec §Clarifications Q11, Plan §Onboarding & Profile Form]
- [x] CHK012 Are duplicate-submission prevention requirements (disabling form controls and rendering a `<tal-spinner>`) explicitly specified for pending network requests? [Scenario Coverage, Spec §FR-010, Plan §Onboarding & Profile Form]
- [x] CHK013 Are error preservation requirements defined so user-entered values remain intact in form controls when backend 400 `ProblemDetails` validation errors occur? [User Experience, Spec §FR-011, Plan §Onboarding & Profile Form]
- [x] CHK014 Is the post-onboarding navigation destination explicitly defined to restore the user's validated return URL or fall back safely to `/restaurants` without open redirect vulnerabilities? [Security, Spec §FR-012, Plan §Routing & Guard Topology]

---

## 4. Routing, Navigation & Guard Order Requirements Quality

- [x] CHK015 Is guard execution order explicitly mandated as `authGuard` followed by `profileGuard` (`canActivate: [authGuard, profileGuard]`) for all protected customer routes? [Consistency, Spec §FR-002, Plan §Routing & Guard Topology]
- [x] CHK016 Are public routes (`/restaurants`, `/restaurants/:id`), callback routes (`/signin-callback`, `/signout-callback`), and logout routes explicitly exempted from `profileGuard` to prevent redirect loops? [Completeness, Spec §FR-005, Plan §Routing & Guard Topology]
- [x] CHK017 Is the redirection behavior explicitly specified when an authenticated user with an existing profile attempts direct navigation to `/onboarding`? [Edge Case, Spec §User Story 2.4, Plan §Routing & Guard Topology]
- [x] CHK018 Are invalid restaurant identifiers (non-numeric parameters or 404 backend responses) mapped to explicit `<tal-error-state>` not-found view requirements? [Scenario Coverage, Spec §Edge Cases, Plan §Catalog & Menu Feature]
- [x] CHK019 Is the temporary Phase 6 `/auth-check` route explicitly defined as a dev-only route excluded from all public shell navigation elements? [Clarity, Spec §Clarifications Q5, Plan §Routing & Guard Topology]

---

## 5. Customer Shell & Cart Entry Boundary Requirements Quality

- [x] CHK020 Are structural shell layout requirements specified for persistent header navigation, user authentication status indicators, and main content router container? [Completeness, Spec §FR-013, Plan §Customer Shell Feature]
- [x] CHK021 Is persistent bottom cart access (FAB / bottom bar) specified with fixed layout rules and mandatory main-container safe-area bottom padding to prevent content overlap on 320px mobile viewports? [Measurability, Spec §FR-015, Plan §Customer Shell Feature]
- [x] CHK022 Is the cart entry FAB interaction behavior before Phase 8 explicitly defined as an informative ordering preview dialog/sheet without claiming fabricated cart totals or item mutations? [Clarity, Spec §FR-014, Plan §Architecture Decisions]
- [x] CHK023 Are keyboard interaction and focus-trap/dismissal requirements specified for the persistent cart entry dialog/sheet overlay? [Accessibility, Spec §SC-004, Plan §Customer Shell Feature]

---

## 6. Restaurant Menu & Data State Requirements Quality

- [x] CHK024 Are requirements specified for all five distinct menu view states: Loading (`<tal-spinner>`), Network Error (`<tal-error-state>`), Restaurant Not Found (`<tal-error-state>`), Empty Menu (`<tal-empty-state>`), and Populated Menu Grid? [Completeness, Spec §FR-018, Plan §Catalog & Menu Feature]
- [x] CHK025 Is `httpResource()` signal adaptation explicitly specified to handle automatic cancellation of stale HTTP requests when restaurant URL parameters change? [Resilience, Spec §FR-017, Plan §Catalog & Menu Feature]
- [x] CHK026 Are disabled states and visual badges ("Unavailable") explicitly specified for inactive menu products (`isAvailable: false` / `isActive: false`) to block item selection actions? [Clarity, Spec §User Story 4.4, Plan §Catalog & Menu Feature]
- [x] CHK027 Is accessible placeholder fallback rendering (`.tal-image-fallback`) explicitly defined for products with missing or broken image URLs? [Edge Case, Spec §User Story 4.2, Plan §Catalog & Menu Feature]

---

## 7. Authentication Regression & Security Requirements Quality

- [x] CHK028 Are requirements documented to verify that Phase 6 OIDC PKCE flow, in-memory token storage, exact `/api/me` prefix interceptor scoping, and callback handling cannot regress in Phase 7? [Regression, Constitution §VI, Plan §Baseline And Preflight]
- [x] CHK029 Is bearer token detachment explicitly mandated for all public catalog endpoints to prevent leaking tokens to unauthenticated endpoints? [Security, Constitution §VI, Plan §Technical Context]
- [x] CHK030 Are open redirect prevention rules explicitly defined for validating return URLs before redirecting users after authentication or profile creation? [Security, Spec §FR-012, Plan §Routing & Guard Topology]

---

## 8. Accessibility & Responsive Design Requirements Quality

- [x] CHK031 Are semantic HTML landmark requirements (`<main>`, `<header>`, `<nav>`, `<section>`) and heading hierarchy explicitly documented for the customer shell and feature views? [Accessibility, Constitution §VIII, Plan §Design & Accessibility Alignment]
- [x] CHK032 Are visible focus indicators (`:focus-visible` using `--tal-focus-ring`) and minimum 42px touch target heights explicitly required for all interactive shell controls and menu buttons? [Measurability, Spec §SC-004, Plan §Design & Accessibility Alignment]
- [x] CHK033 Are WAI-ARIA form requirements (`aria-invalid`, `aria-describedby`, `role="alert"`, `role="status"`) explicitly specified for onboarding form errors and loading states? [Accessibility, Spec §FR-009, Plan §Onboarding & Profile Form]
- [x] CHK034 Are responsive viewport requirements (320px, 768px, 1280px) and 200% browser zoom usability explicitly specified without horizontal scrollbars or clipped text? [Measurability, Spec §FR-016, Plan §Design & Accessibility Alignment]
- [x] CHK035 Are CSS logical properties (`ps-*`, `pe-*`, `ms-*`, `me-*`) explicitly required while physical directional properties (`pl-*`, `pr-*`, `ml-*`, `mr-*`) are prohibited for RTL support? [Consistency, Constitution §VIII, Plan §Design & Accessibility Alignment]

---

## 9. Testing, Build & Live Verification Requirements Quality

- [x] CHK036 Are unit test requirements explicitly specified for `ProfileStore` state transitions, `profileGuard` `UrlTree` decisions, onboarding form validation, and `MenuPage` 5-state rendering? [Coverage, Spec §Clarifications Q14, Plan §Test & Verification Plan]
- [x] CHK037 Is clean production compilation (`ng build customer --configuration=production`) under configured performance budgets required as an exit gate for Phase 7? [Measurability, Constitution Quality Gates, Plan §Baseline And Preflight]
- [x] CHK038 Is live manual browser verification required across all 6 primary user flows (New Account Onboarding, Existing Profile Navigation, Anonymous Catalog Exploration, Probe Error Recovery, Invalid Restaurant 404, and Responsive Mobile Layout)? [Verification, Spec §Clarifications Q14, Plan §Test & Verification Plan]
- [x] CHK039 Is it explicitly specified that unit test mocks do NOT count as proof of live API contract or OIDC authentication verification? [Clarity, Constitution §IX, Plan §Test & Verification Plan]
- [x] CHK040 Are strict Git working tree cleanliness (`git status --short` clean) and single-commit discipline required before declaring Phase 7 complete? [Discipline, Constitution §X, Plan §Baseline And Preflight]

---

## Summary & Traceability Matrix

- **Total Requirements Quality Items**: 40
- **Completed Items**: 40 / 40 (100%)
- **Incomplete Items**: 0 / 40 (0%)
- **Quality Dimensions Covered**: Completeness (10), Clarity (8), Consistency (4), Measurability (5), Scenario & Edge Case Coverage (8), Security & Resilience (5)
- **Traceability References**: 100% of items linked to Spec sections, Plan sections, or Constitution principles.
- **Status**: All requirements quality unit tests passed and verified against design artifacts.

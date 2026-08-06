# Feature Specification: Phase 7 — Customer Shell, Profile Gate, Onboarding, and Restaurant Menu

**Feature Branch**: `001-customer-shell-onboarding-menu`  
**Created**: 2026-08-06  
**Last Clarified**: 2026-08-06  
**Status**: Clarified & Ready for Planning  
**Input**: User description: "Phase 7 — Customer Shell, Profile Gate, Onboarding, and Restaurant Menu"

---

## Executive Summary

Phase 7 delivers the core customer experience for the Talabat web application. It establishes the global application shell (layout grid, top navigation bar, authentication controls, active route container, and persistent cart access entry), automated profile gating with user onboarding, and full public/authenticated restaurant menu exploration.

By implementing explicit routing boundaries, anonymous users can freely discover restaurants and view menus, while authenticated users without a profile are seamlessly routed to onboarding without infinite loops. Furthermore, Phase 7 establishes the interactive add-to-cart entry boundary for Phase 8 without initiating premature server cart mutations.

---

## Clarifications

### Session 2026-08-06

- **Q1: Profile State Ownership**: Customer profile state (`ProfileStore` signals) belongs strictly to the `customer` application (`projects/customer/src/app/core/profile`). Core infrastructure (`core-auth`) remains 100% domain-neutral and depends on zero domain libraries (`api-customer`).
- **Q2: Profile Probe Semantics**: `GET /api/me/profile` HTTP 200 indicates an existing profile. HTTP 404 with `errorCode: "ProfileNotCreated"` is the single authoritative signal that no customer profile exists. Network failures, 401, 403, and 500 errors MUST NOT be treated as "no profile" (401 triggers re-auth; 500/network errors render error states). Secondary 409 responses on `api/me/*` endpoints are handled defensively by `problemDetailsInterceptor`.
- **Q3: Once-per-session Caching**: `ProfileStore.ensureLoaded()` probes `GET /api/me/profile` once per session. In-flight requests are cached and shared across concurrent route guards to prevent duplicate HTTP calls. Profile state is reset on explicit logout or token expiration, and updated immediately upon successful onboarding POST completion.
- **Q4: Guard Ordering & Loop Prevention**: Guard order MUST be `authGuard` then `profileGuard`. Public catalog routes (`/restaurants`, `/restaurants/:id`), callback routes (`/signin-callback`, `/signout-callback`), and logout routes have NO profile guard. `/onboarding` uses `authGuard` ONLY. If an onboarded user navigates to `/onboarding`, `profileGuard` redirects them to `/restaurants`.
- **Q5: Phase 6 `/auth-check` Status**: `/auth-check` is retained as a dev-only route in `app.routes.ts` for diagnostic testing but is omitted from all public shell navigation elements.
- **Q6: Protected Route Map**: Phase 7 routes comprise `/`, `/restaurants`, `/restaurants/:id`, `/onboarding`, `/signin-callback`, `/signout-callback`, `/auth-check`, and `**` (404/redirect). Future cart, checkout, orders, and profile editing routes are omitted from the route table until their respective phases.
- **Q7: Shell & Persistent Cart FAB Boundary**: The persistent cart access entry (FAB / bottom bar) displays the live item count badge (0, 1, 2...). In Phase 7, selecting the FAB displays an informative summary entry boundary without attempting server checkout or cart mutation API calls.
- **Q8: Menu Add Action Boundary**: Selecting "Add to cart" on an available menu product updates local reactive cart entry state (`LocalCartEntryService`), briefly displays visual feedback ("Added!"), and increments the shell cart badge counter. Anonymous users are redirected to sign-in. Server cart synchronization (`POST /api/me/cart/items`) is reserved for Phase 8.
- **Q9: Restaurant Route Parameters**: Restaurant URL parameter `:id` is validated as a positive integer identifier. Invalid parameters or backend 404 responses trigger `<tal-error-state>` ("Restaurant not found") with a return button. Parameter changes (e.g. `/restaurants/1` -> `/restaurants/2`) trigger signal re-evaluation, cleanly aborting in-flight requests.
- **Q10: Resource & Retry Adapter**: Data fetching uses Angular `httpResource()` / signal resources. Route parameter changes automatically abort stale requests. Retry buttons on `<tal-error-state>` trigger `.reload()`.
- **Q11: Onboarding Fields & Validation**: Onboarding form fields match generated `CreateProfileRequest`: `fullName` (required non-empty string), `age` (required positive integer), and `phoneNumber` (optional/nullable string). Form prevents duplicate submissions, displays client validation, and handles server 400 `ProblemDetails` validation errors on field controls (`aria-invalid`, `aria-describedby`).
- **Q12: Post-Profile Navigation**: Validated return URLs are stored prior to onboarding redirection. Upon profile creation, the user is navigated to their validated return URL (or `/restaurants` by default). External or unvalidated URLs are rejected to prevent open redirects.
- **Q13: Menu Product Action & Image Fallbacks**: Products with `isActive: false` have disabled "Add to cart" buttons and an "Unavailable" badge. Image load failures render accessible placeholder containers (`.tal-image-fallback`). Empty menus (`products.length === 0`) render `<tal-empty-state>`.
- **Q14: Verification & Acceptance Evidence**: Phase 8 readiness requires: Vitest unit tests passing (ProfileStore, guards, LocalCartEntryService, MenuPage), `ng build customer` passing cleanly, and manual verification of 6 key flows documented.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Anonymous Restaurant & Menu Exploration (Priority: P1)

As an anonymous customer visiting the Talabat web app,  
I want to browse available restaurants and view detailed restaurant menus without being forced to log in,  
So that I can explore food offerings and prices before deciding to create an account or sign in.

**Why this priority**: Discoverability is the primary entry point for food delivery. Forcing authentication prior to menu viewing creates friction and drops user conversion.

**Independent Test**: Can be fully verified by navigating to the home route (`/restaurants`), selecting any active restaurant card, and viewing its full menu items without being prompted for credentials.

**Acceptance Scenarios**:

1. **Given** an anonymous visitor on the restaurant directory,  
   **When** they select a restaurant card,  
   **Then** the application navigates to `/restaurants/:id` and renders its details and product listings.

2. **Given** an anonymous visitor viewing a restaurant menu,  
   **When** they select an "Add to cart" entry button or select the persistent cart FAB,  
   **Then** the application redirects them to `Talabat.Identity` for sign-in with a preserved, validated return destination.

3. **Given** an anonymous visitor attempting to access a direct menu link for an invalid or non-existent restaurant identifier,  
   **When** the menu page loads,  
   **Then** an accessible not-found error state (`<tal-error-state>`) is displayed with a clear action to return to `/restaurants`.

---

### User Story 2 — Automatic Profile Gating & New Customer Onboarding (Priority: P1)

As a newly registered or first-time authenticated customer,  
I want the application to detect that I do not yet have a customer profile and guide me through a simple onboarding form,  
So that my full name, age, and contact information are registered before I access protected ordering features.

**Why this priority**: Required customer profile details are a prerequisite for cart operations and order placement. Automated gating ensures data completeness without security or navigation loops.

**Independent Test**: Can be verified by authenticating a fresh test account (which returns `404 ProfileNotCreated` from `GET /api/me/profile`), verifying immediate redirection to `/onboarding`, submitting valid profile details, and confirming automatic progression to the intended destination.

**Acceptance Scenarios**:

1. **Given** an authenticated user who has not created a customer profile,  
   **When** they attempt to access any protected area or return from identity sign-in,  
   **Then** `profileGuard` detects the missing profile via `GET /api/me/profile` probe (HTTP 404) and routes them directly to `/onboarding` without triggering redirect loops.

2. **Given** a user on the onboarding page,  
   **When** they submit incomplete or invalid profile data (e.g. empty name, non-numeric age, or invalid phone format),  
   **Then** field-level validation errors are highlighted with accessible announcements (`aria-invalid`, `aria-describedby`), entered values are preserved, and submission is blocked.

3. **Given** a user submitting the onboarding form,  
   **When** submission is pending,  
   **Then** the submit button displays a `<tal-spinner>`, form controls are disabled to prevent duplicate submissions, and upon success, internal profile state updates to `loaded` and navigates to the stored return destination.

4. **Given** an authenticated user who already possesses a complete customer profile,  
   **When** they navigate to `/onboarding` directly,  
   **Then** `profileGuard` detects their existing profile and immediately redirects them to `/restaurants`.

---

### User Story 3 — Authenticated Customer Shell & Persistent Cart Access Entry (Priority: P2)

As a customer navigating the application on mobile or desktop,  
I want a consistent header layout with navigation controls, account status indicators, and a persistent cart access entry area,  
So that I always know my authentication status and can easily reach my cart entry point from any page.

**Why this priority**: The customer shell provides structural continuity, responsive navigation, and fixed action targets across viewports.

**Independent Test**: Can be verified by rendering the app on 320px mobile and 1280px desktop layouts, verifying that navigation links and account controls update based on authentication state, and confirming that page content is never hidden behind the bottom cart entry bar.

**Acceptance Scenarios**:

1. **Given** an anonymous user viewing the application shell,  
   **When** they observe the top header,  
   **Then** they see the brand logo and a "Sign In" button triggering redirection to identity authentication.

2. **Given** an authenticated user with a profile viewing the application shell,  
   **When** they observe the top header,  
   **Then** they see their profile name greeting, navigation links, and a "Sign Out" action.

3. **Given** any page rendered within the customer shell on a narrow mobile device (320px viewport),  
   **When** scrolling to the bottom of the page,  
   **Then** the persistent bottom cart entry bar remains fixed without overlapping or obscuring content elements.

---

### User Story 4 — Detailed Restaurant Menu Viewing & Interactive Product Selection (Priority: P2)

As a customer browsing a specific restaurant menu,  
I want to see the restaurant's header information and list of available products with image fallbacks and price displays,  
So that I can select products and see visual feedback that items are ready for my cart.

**Why this priority**: The menu page displays actionable products. Establishing item selection feedback validates the UI interaction contract before server cart integration in Phase 8.

**Independent Test**: Can be verified by opening a valid restaurant menu, observing product listings and prices, selecting "Add to cart" on an available product, and confirming that the local cart badge counter updates dynamically while unavailable products remain clearly disabled.

**Acceptance Scenarios**:

1. **Given** a customer on a restaurant menu page (`/restaurants/:id`),  
   **When** the menu loads via `httpResource()`,  
   **Then** the header displays the restaurant name, description, and status chip, followed by the product list.

2. **Given** a product in the menu listing that has no image or an un-loadable image URL,  
   **When** rendered on screen,  
   **Then** an accessible placeholder fallback container (`.tal-image-fallback`) is rendered with an `aria-hidden="true"` graphic role.

3. **Given** an available product on the menu (`isActive: true`),  
   **When** an authenticated user with a profile selects "Add to cart",  
   **Then** local reactive cart entry state updates, visual confirmation ("Added!") is displayed, and the persistent shell cart badge count increments by 1.

4. **Given** a product marked as inactive/unavailable (`isActive: false`),  
   **When** rendered on the menu,  
   **Then** the product card displays an "Unavailable" badge and its "Add to cart" button is disabled (`disabled` attribute).

---

### Edge Cases

- **Token Expired During Onboarding Submission**: If the authentication token expires while filling out onboarding, submission fails with an error alert and prompts re-authentication without losing entered field text.
- **Probe HTTP 500 / Network Error**: Network or server failures during `GET /api/me/profile` probe render an explicit `<tal-error-state>` with a retry button; they MUST NOT be misconstrued as "no profile".
- **Invalid Restaurant Identifier in URL**: Navigating to `/restaurants/invalid` renders `<tal-error-state>` ("Restaurant not found") with a primary CTA button to return to `/restaurants`.
- **Empty Menu Response**: If a restaurant is active but has zero products listed (`products.length === 0`), the menu page renders `<tal-empty-state title="No menu items available">`.
- **Route Parameter Change During Fetch**: Navigating from `/restaurants/1` to `/restaurants/2` triggers `httpResource()` parameter re-evaluation, cleanly aborting any in-flight request for ID 1.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Routing & Guard Hierarchy
- **FR-001**: The application MUST keep catalog routes (`/restaurants` and `/restaurants/:id`) publicly accessible to anonymous users.
- **FR-002**: Protected routes MUST execute authentication checking (`authGuard`) prior to profile checking (`profileGuard`).
- **FR-003**: The profile gate MUST probe `GET /api/me/profile`. A `404 ProfileNotCreated` response MUST redirect un-onboarded authenticated users to `/onboarding`.
- **FR-004**: Network errors, HTTP 401, 403, and 500 responses MUST NOT be treated as "no profile". 401 triggers re-authentication; 500/network errors render `<tal-error-state>`.
- **FR-005**: The `/onboarding` route MUST execute `authGuard` ONLY and remain exempt from `profileGuard` to prevent infinite redirect loops.
- **FR-006**: All route guards MUST return `UrlTree` instances for redirection targets.

#### Onboarding Experience
- **FR-007**: The onboarding form MUST align with the `CreateProfileRequest` contract: Full Name (`fullName`: string, required), Age (`age`: number, required positive integer), and Phone Number (`phoneNumber`: string | null, optional).
- **FR-008**: Form submission MUST validate client inputs prior to network transmission (non-empty `fullName`, positive integer `age`).
- **FR-009**: Form controls MUST link helper/error text using `aria-invalid` and `aria-describedby` for accessible announcements.
- **FR-010**: While profile creation is pending, the submission button MUST display a `<tal-spinner>` and form controls MUST be disabled to prevent duplicate submissions.
- **FR-011**: Failed submissions MUST preserve user-entered values in form fields and display server `ProblemDetails` validation messages on field controls.
- **FR-012**: Upon successful profile creation, `ProfileStore` state MUST update to `loaded` and navigate the user to their stored return destination (or `/restaurants` by default).

#### Customer Shell & Responsive Layout
- **FR-013**: The customer application shell MUST provide a persistent header containing brand identity, top-level navigation, and authentication action controls (Sign In / Sign Out / Profile name).
- **FR-014**: The shell MUST provide a persistent cart entry FAB / bottom bar displaying the live item count badge.
- **FR-015**: The shell layout MUST enforce bottom padding on main content containers to guarantee content is never obscured by the persistent cart entry bar on narrow mobile viewports (320px).
- **FR-016**: The application layout MUST remain usable and unclipped at 320px, 768px, and 1280px viewports and under 200% browser zoom.

#### Restaurant Menu Presentation & Cart Entry Boundary
- **FR-017**: The menu page MUST fetch restaurant details and menu items using the URL parameter identifier via `httpResource()` calling `GET /api/catalog/restaurants/{id}`.
- **FR-018**: The menu page MUST explicitly handle and render five distinct visual states: Loading (`<tal-spinner>`), Server/Network Error (`<tal-error-state>`), Restaurant Not Found (`<tal-error-state>`), Empty Menu (`<tal-empty-state>`), and Populated Menu Grid.
- **FR-019**: Selecting "Add to cart" on an available product (`isActive: true`) MUST update local reactive cart entry state (`LocalCartEntryService`) and increment the shell cart badge counter, WITHOUT making server-backed cart mutation API calls (which are reserved for Phase 8).

---

### Key Entities

- **Customer Profile**: Represents the registered user's personal details (`id`, `fullName`, `age`, `phoneNumber`, `addresses`).
- **CreateProfileRequest**: Represents the profile creation payload (`fullName`, `age`, `phoneNumber`).
- **Restaurant Detail**: Represents a single food vendor (`id`, `name`, `description`, `imageUrl`, `isActive`).
- **Menu Product**: Represents an individual orderable item belonging to a restaurant (`id`, `name`, `description`, `price`, `imageUrl`, `isActive`).
- **Local Cart Entry State**: Client-side reactive state tracking local product selection count and item summary for shell badge updates prior to Phase 8 server persistence.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **Zero Navigation Loops**: 100% of newly registered users with missing profiles are routed from sign-in to `/onboarding` and subsequently to their destination upon completion without encountering loop errors or blank screens.
- **SC-002**: **Responsive Integrity**: 100% of shell pages (catalog, menu, onboarding) render without horizontal scrollbars, text clipping, or overlapping buttons at 320px, 768px, and 1280px viewports.
- **SC-003**: **Interactive Item Selection**: Selecting an available product on a menu page updates the shell cart badge counter in under 100ms.
- **SC-004**: **Accessibility Compliance**: All interactive controls (buttons, form inputs, links, cart FAB) achieve 100% keyboard accessibility with visible focus rings (`:focus-visible`) and pass automated WCAG 2.1 AA audits.
- **SC-005**: **Graceful Error Handling**: 100% of invalid restaurant IDs or network failures display user-friendly error states with actionable retry/return triggers.

---

## Assumptions & Bounded Scope

### Assumptions
- Authentication tokens and OIDC authorization code flow infrastructure from Phase 6 are operational.
- The backend API (`Talabat.Customer.API` on port `:7056`) is running and serving restaurant catalog data and profile endpoints.
- All visual styling relies on the FoodDash design tokens (`styles.css`) and shared primitives (`@talabat/shared-ui`) established in Phase 5.

### Non-Goals & Explicit Exclusions
- **No Server Cart Persistence**: Phase 7 MUST NOT invoke backend cart API endpoints (e.g. `POST /api/me/cart`). Server cart synchronization, item quantity increments/decrements, cart drawer, and cart clear operations belong strictly to Phase 8.
- **No Checkout or Payment Processing**: Ordering, checkout forms, price calculations, and payment integrations are out of scope (Phases 9 & 10).
- **No Profile Editing Post-Onboarding**: Updating existing profile details after onboarding is out of scope (Phase 10).
- **No Address Management**: Adding or selecting delivery addresses is out of scope (Phase 10).
- **No Unsupported Catalog Data**: Modifiers, product options, allergens, categories, delivery time estimates, search filters, maps, SignalR, or reviews are strictly excluded.
- **No Direct Edits to Generated Code**: `projects/api-customer` generated files MUST NOT be hand-edited.

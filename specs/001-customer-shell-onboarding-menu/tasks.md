# Tasks: Phase 7 — Customer Shell, Profile Gate, Onboarding, and Restaurant Menu

**Input**: Design documents from `specs/001-customer-shell-onboarding-menu/` (`spec.md`, `plan.md`, `checklists/phase-7-requirements.md`, `constitution.md`)  
**Prerequisites**: Phase 6 OIDC baseline committed, clean working tree, verified backend contracts  
**Target Application**: `talabat-web/projects/customer`

---

## Task Format & Execution Rules

- **Checklist Format**: `- [ ] T### [P?] [US?] Description with exact repository-relative file path`
- **`[P]` Marker**: Task can be executed in parallel (operates on distinct files without incomplete dependencies).
- **`[US?]` Marker**: Maps to User Story 1 (`[US1]`), User Story 2 (`[US2]`), User Story 3 (`[US3]`), or User Story 4 (`[US4]`) from `spec.md`.
- **Verification Commands**: Every phase/group ends with an explicit, runnable verification command.

---

## Phase 1: Preflight & Baseline Verification

**Purpose**: Validate workspace health, test runner status, and generated OpenAPI contracts before modifying application code.

- [X] T001 Run OpenAPI contract validation script via `npm run test:openapi-tools` in `talabat-web/`
- [X] T002 Verify generated API client TypeScript exports in `talabat-web/projects/api-customer/src/model/models.ts` (`CreateProfileRequest`, `ProfileResponse`, `MenuProductDto`, `RestaurantListResponse`)
- [X] T003 Execute baseline unit test suites via `npx ng test core-auth --watch=false` and `npx ng test customer --watch=false`
- [X] T004 Run baseline production compilation check via `npx ng build customer --configuration=production` in `talabat-web/`

**Phase 1 Verification Checkpoint**:
```bash
cd d:\link-dev\talabat-frontend\talabat-web
npm run test:openapi-tools
npx ng test core-auth --watch=false
npx ng test customer --watch=false
npx ng build customer --configuration=production
```

---

## Phase 2: Foundational Profile State & Guard Infrastructure (Priority: P1)

**Purpose**: Establish customer-app-owned profile session state (`ProfileStore`), `profileGuard`, and `authGuard` composition without violating `core-auth` domain neutrality.

### Tests for Foundational Profile Infrastructure

- [X] T005 [P] Write unit tests for `ProfileStore` state transitions, probe caching, deduplication, and reset logic in `talabat-web/projects/customer/src/app/core/profile/profile.store.spec.ts`
- [X] T006 [P] Write unit tests for `profileGuard` `UrlTree` navigation decisions, 404 redirection to `/onboarding`, and existing-profile bypass in `talabat-web/projects/customer/src/app/core/guards/profile.guard.spec.ts`

### Implementation for Foundational Profile Infrastructure

- [X] T007 Implement customer-domain `ProfileStore` service (`providedIn: 'root'`) managing typed state (`idle | loading | loaded | missing | error`) in `talabat-web/projects/customer/src/app/core/profile/profile.store.ts`
- [X] T008 Implement `profileGuard` returning `UrlTree` targets using `ProfileStore` and `AuthStore` in `talabat-web/projects/customer/src/app/core/guards/profile.guard.ts`
- [X] T009 Export core profile primitives and guards from `talabat-web/projects/customer/src/app/core/profile/index.ts` and `talabat-web/projects/customer/src/app/core/guards/index.ts`

**Phase 2 Verification Checkpoint**:
```bash
cd d:\link-dev\talabat-frontend\talabat-web
npx ng test customer --include=src/app/core/**/*.spec.ts --watch=false
```

---

## Phase 3: User Story 2 — Automatic Profile Gating & New Customer Onboarding (Priority: P1) 🎯 MVP

**Goal**: Detect un-onboarded authenticated users (`404 ProfileNotCreated`) and guide them through an accessible Signal Form onboarding page collecting `fullName`, `age`, and `phoneNumber`.

**Independent Test**: Authenticate a test account without a profile, attempt navigation to a protected route, verify immediate redirection to `/onboarding`, submit valid form data, and confirm automatic navigation to the stored return destination.

### Tests for User Story 2

- [X] T010 [P] [US2] Write unit tests for onboarding form validation, duplicate submit disabling, and error alert rendering in `talabat-web/projects/customer/src/app/features/onboarding/pages/onboarding.page.spec.ts`

### Implementation for User Story 2

- [X] T011 [P] [US2] Implement presentational onboarding form component with Signal Forms controls (`fullName`, `age`, `phoneNumber`) in `talabat-web/projects/customer/src/app/features/onboarding/components/onboarding-form.component.ts`
- [X] T012 [US2] Implement `OnboardingPage` container handling `ProfileStore.createProfile()` invocation, loading spinner, and return URL redirection in `talabat-web/projects/customer/src/app/features/onboarding/pages/onboarding.page.ts`
- [X] T013 [US2] Define lazy-loaded onboarding feature routes with `canActivate: [authGuard]` in `talabat-web/projects/customer/src/app/features/onboarding/routes.ts`

**Phase 3 Verification Checkpoint**:
```bash
cd d:\link-dev\talabat-frontend\talabat-web
npx ng test customer --include=src/app/features/onboarding/**/*.spec.ts --watch=false
```

---

## Phase 4: User Story 3 — Authenticated Customer Shell & Persistent Cart Entry (Priority: P2)

**Goal**: Provide a responsive customer layout grid, top navigation header with authentication controls, active route outlet, and fixed bottom cart entry FAB/bar with safe-area padding.

**Independent Test**: Render the shell at 320px mobile and 1280px desktop viewports, verify that header links update based on authentication status, and confirm bottom content is never obscured by the persistent cart entry bar.

### Tests for User Story 3

- [X] T014 [P] [US3] Write unit tests for top header component authentication controls and profile greeting in `talabat-web/projects/customer/src/app/features/shell/components/header.component.spec.ts`
- [X] T015 [P] [US3] Write unit tests for persistent cart entry FAB/bar component and ordering preview overlay trigger in `talabat-web/projects/customer/src/app/features/shell/components/cart-entry-bar.component.spec.ts`
- [X] T016 [P] [US3] Write unit tests for main `CustomerShellComponent` layout grid and router container in `talabat-web/projects/customer/src/app/features/shell/customer-shell.component.spec.ts`

### Implementation for User Story 3

- [X] T017 [P] [US3] Implement header component displaying brand logo, navigation links, Sign In / Sign Out actions, and user profile greeting in `talabat-web/projects/customer/src/app/features/shell/components/header.component.ts`
- [X] T018 [P] [US3] Implement persistent cart entry FAB / bottom bar component with item count badge and safe-area spacing in `talabat-web/projects/customer/src/app/features/shell/components/cart-entry-bar.component.ts`
- [X] T019 [US3] Implement main `CustomerShellComponent` composing header, `<router-outlet>`, persistent cart bar, and mobile safe-area padding in `talabat-web/projects/customer/src/app/features/shell/customer-shell.component.ts`
- [X] T020 [US3] Register shell layout route wrapper in `talabat-web/projects/customer/src/app/app.routes.ts`

**Phase 4 Verification Checkpoint**:
```bash
cd d:\link-dev\talabat-frontend\talabat-web
npx ng test customer --include=src/app/features/shell/**/*.spec.ts --watch=false
```

---

## Phase 5: User Story 1 & 4 — Restaurant Catalog & Detailed Menu Viewing (Priority: P1 / P2)

**Goal**: Enable anonymous and authenticated users to browse restaurants (`/restaurants`) and view detailed restaurant menus (`/restaurants/:id`) displaying products, prices, badges, image fallbacks, and 5 visual states via `httpResource()`.

**Independent Test**: Navigate to `/restaurants`, select a restaurant card, verify transition to `/restaurants/:id`, view products and price displays, test image fallbacks, and confirm that invalid restaurant IDs render `<tal-error-state>`.

### Tests for User Story 1 & 4

- [X] T021 [P] [US4] Write unit tests for product card component, disabled state for unavailable items, and fallback images in `talabat-web/projects/customer/src/app/features/catalog/components/product-card.component.spec.ts`
- [X] T022 [P] [US4] Write unit tests for `RestaurantMenuPage` 5-state rendering (`<tal-spinner>`, error, 404, empty, populated) and `httpResource()` reload in `talabat-web/projects/customer/src/app/features/catalog/pages/restaurant-menu.page.spec.ts`

### Implementation for User Story 1 & 4

- [X] T023 [P] [US4] Implement presentational product card component (`product-card.component.ts`) with price formatting via `MoneyPipe`, status chips, and image fallback rendering (`.tal-image-fallback`) in `talabat-web/projects/customer/src/app/features/catalog/components/product-card.component.ts`
- [X] T024 [P] [US4] Implement restaurant menu header component displaying vendor name, description, and status in `talabat-web/projects/customer/src/app/features/catalog/components/restaurant-menu-header.component.ts`
- [X] T025 [US4] Implement `RestaurantMenuPage` consuming `CatalogApiService.getRestaurantMenu({ restaurantId })` via `httpResource()`, route parameter validation, and 5 UI states in `talabat-web/projects/customer/src/app/features/catalog/pages/restaurant-menu.page.ts`
- [X] T026 [US1] Register public menu route `/restaurants/:id` in `talabat-web/projects/customer/src/app/features/catalog/routes.ts`

**Phase 5 Verification Checkpoint**:
```bash
cd d:\link-dev\talabat-frontend\talabat-web
npx ng test customer --include=src/app/features/catalog/**/*.spec.ts --watch=false
```

---

## Phase 6: Phase 8 Cart Entry Boundary & Ordering Preview Overlay

**Goal**: Establish the local cart entry selection event boundary (`LocalCartEntryService`) and CDK overlay preview dialog/sheet without making server cart mutation API calls or faking server cart persistence.

### Tests for Cart Entry Boundary

- [X] T027 [P] Write unit tests for `LocalCartEntryService` local selection tracking and shell badge counter updates in `talabat-web/projects/customer/src/app/features/shell/services/local-cart-entry.service.spec.ts`
- [X] T028 [P] Write unit tests for CDK ordering preview overlay dialog/sheet component in `talabat-web/projects/customer/src/app/features/shell/components/cart-preview-dialog.component.spec.ts`

### Implementation for Cart Entry Boundary

- [X] T029 Implement `LocalCartEntryService` managing local item selection intent and badge count signals in `talabat-web/projects/customer/src/app/features/shell/services/local-cart-entry.service.ts`
- [X] T030 Implement CDK ordering preview overlay dialog component (`cart-preview-dialog.component.ts`) explaining Phase 8 server cart integration in `talabat-web/projects/customer/src/app/features/shell/components/cart-preview-dialog.component.ts`
- [X] T031 Connect "Add to cart" button click on `ProductCardComponent` to emit cart entry intent to `LocalCartEntryService` and trigger persistent cart FAB badge update in `talabat-web/projects/customer/src/app/features/catalog/components/product-card.component.ts`

**Phase 6 Verification Checkpoint**:
```bash
cd d:\link-dev\talabat-frontend\talabat-web
npx ng test customer --include=src/app/features/shell/**/*.spec.ts --watch=false
```

---

## Phase 7: Routes Cleanup & Phase 6 Auth Diagnostics Preservation

**Goal**: Retain `/auth-check` as a dev-only diagnostic route in `app.routes.ts` while omitting it from public shell navigation, and confirm all OIDC callback routes remain functional.

- [X] T032 [P] Clean up `app.routes.ts` route table structure to ensure `/auth-check` remains developer-accessible but excluded from header navigation links in `talabat-web/projects/customer/src/app/app.routes.ts`
- [X] T033 Verify OIDC callback route specs in `talabat-web/projects/customer/src/app/features/auth/signin-callback.page.spec.ts` and `signout-callback.page.spec.ts`

**Phase 7 Verification Checkpoint**:
```bash
cd d:\link-dev\talabat-frontend\talabat-web
npx ng test customer --watch=false
```

---

## Phase 8: Comprehensive Verification & Phase 6 Regression Checks

**Purpose**: Execute full automated test suites, production build budget checks, and document manual browser acceptance evidence across all 6 primary user flows.

- [X] T034 Run full workspace unit test suites via `npx ng test core-auth --watch=false` and `npx ng test customer --watch=false`
- [X] T035 Run production customer build check via `npx ng build customer --configuration=production` in `talabat-web/`
- [X] T036 Execute OpenAPI tooling & contract integrity checks via `npm run test:openapi-tools` and `npm run api:verify`
- [ ] T037 Perform live manual browser verification across 6 primary flows:
  1. New account onboarding flow (`/restaurants` -> login -> probe 404 -> `/onboarding` -> profile creation -> return destination).
  2. Existing profile flow (`/restaurants` -> login -> probe 200 -> direct menu destination).
  3. Anonymous catalog & menu flow (browse `/restaurants` -> open `/restaurants/:id` -> click Add -> redirect to login).
  4. Profile probe failure & retry flow (simulate network drop on probe -> `<tal-error-state>` -> retry).
  5. Invalid restaurant (404 / non-integer ID) and unavailable product presentation.
  6. Customer shell responsive behavior (320px, 768px, 1280px, 200% zoom, focus rings, safe-area padding).

**Phase 8 Verification Checkpoint**:
```bash
cd d:\link-dev\talabat-frontend\talabat-web
npm run test:openapi-tools
npm run api:verify
npx ng test core-auth --watch=false
npx ng test customer --watch=false
npx ng build customer --configuration=production
```

---

## Phase 9: Documentation & Implementation Reporting

**Purpose**: Create the formal Phase 7 implementation report capturing execution commands, test evidence, manual acceptance logs, and Phase 8 readiness.

- [X] T038 Create formal Phase 7 implementation report in `docs/phase-7-customer-shell-onboarding-menu-implementation-report.md`
- [X] T039 Verify `git status --short` cleanliness and prepare single conventional commit: `feat(customer): implement customer shell, profile gate, onboarding, and restaurant menu`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Preflight (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 preflight completion — BLOCKS all user stories.
- **User Story 2 / Onboarding (Phase 3)**: Depends on Phase 2 `ProfileStore` and `profileGuard` completion.
- **User Story 3 / Customer Shell (Phase 4)**: Can proceed in parallel with Phase 3 or immediately following Phase 2.
- **User Story 1 & 4 / Catalog & Menu (Phase 5)**: Depends on Phase 4 shell container completion.
- **Phase 8 Handoff Boundary (Phase 6)**: Depends on Phase 5 menu component completion.
- **Cleanup & Verification (Phases 7–9)**: Depends on all implementation phases complete.

### Parallel Opportunities

- All test writing tasks (`[P]`) can run in parallel with component creation when targeting distinct files.
- `HeaderComponent` (`T017`), `CartEntryBarComponent` (`T018`), `ProductCardComponent` (`T023`), and `RestaurantMenuHeaderComponent` (`T024`) can be developed in parallel as standalone presentational components.

---

## Implementation Strategy & MVP Scope

1. **MVP Incremental Target (User Story 2 & 3)**: Foundational `ProfileStore` + `profileGuard` + `OnboardingPage` + `CustomerShellComponent`.
2. **Catalog & Menu Expansion (User Story 1 & 4)**: `RestaurantMenuPage` + `ProductCardComponent` + `LocalCartEntryService`.
3. **Verification & Handoff**: 6 manual acceptance flows + production build gate (`ng build customer`) + Phase 7 report documentation.

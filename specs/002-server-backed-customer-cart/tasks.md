# Tasks: Server-Backed Customer Cart (Phase 8)

**Branch**: `002-server-backed-customer-cart` | **Date**: 2026-08-06  
**Input**: Design documents from `/specs/002-server-backed-customer-cart/`  
**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/cart-api-contract.md](./contracts/cart-api-contract.md), [quickstart.md](./quickstart.md)

---

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup & Prerequisite Verification

**Purpose**: Baseline verification and environment readiness before implementation

- [x] T001 Verify clean Git working directory and baseline state
- [x] T002 Verify generated `CartApiService` method signatures in `projects/api-customer/src/api/cart/cart-api.service.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core HTTP error code mapping and root-provided `CartStore` foundation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Expand `AppErrorCode` in `projects/core-http/src/lib/app-error.ts` with cart domain error codes (`CrossRestaurantCart`, `CartExpired`, `CartNotActive`, `CartItemNotFound`, `ProductUnavailable`, `RestaurantClosed`, `RestaurantInactive`, `InvalidQuantity`)
- [x] T004 [P] Create unit tests for problem details mapping of cart error codes in `projects/core-http/src/lib/problem-details.interceptor.spec.ts`
- [x] T005 Create root-provided Signal `CartStore` in `projects/customer/src/app/features/cart/cart.store.ts` (`providedIn: 'root'`) defining state interface, derived signals (`cart`, `items`, `total`, `totalItemCount`, `isEmpty`, `status`), and backend HTTP method bindings (`loadCart`, `addItem`, `updateQuantity`, `removeItem`, `clearCart`)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Viewing Server-Authoritative Cart & Badge Synchronization (Priority: P1) 🎯 MVP

**Goal**: Display active server cart contents, unit prices, line totals, and grand total on `/cart` page, and synchronize shell header badge and mobile FAB item counts across the customer shell.

**Independent Test**: Authenticate as a customer, view customer shell pages and `/cart` page; verify cart badge count and server total prices match backend `CartResponse` payload.

### Implementation & Tests for User Story 1

- [x] T006 [P] [US1] Create unit tests for `CartStore` initial load, empty state, and badge item count in `projects/customer/src/app/features/cart/cart.store.spec.ts`
- [x] T007 [P] [US1] Create presentational `CartSummaryComponent` for authoritative server total rendering in `projects/customer/src/app/features/cart/components/cart-summary.component.ts`
- [x] T008 [US1] Update `HeaderComponent` in `projects/customer/src/app/layout/header.component.ts` to consume `CartStore.totalItemCount()` and render reactive cart badge
- [x] T009 [US1] Update `CartEntryBarComponent` in `projects/customer/src/app/layout/cart-entry-bar.component.ts` to consume `CartStore.totalItemCount()` and navigate to `/cart`
- [x] T010 [US1] Update `CartPage` in `projects/customer/src/app/features/cart/pages/cart.page.ts` to render 4 presentation states (loading, error, empty state, populated state with items and `tal-cart-summary`)
- [x] T011 [US1] Create unit tests for `CartPage` view states in `projects/customer/src/app/features/cart/pages/cart.page.spec.ts`
- [x] T012 [US1] Execute foundational & US1 unit tests gate (`npx ng test customer --watch=false`)

**Checkpoint**: User Story 1 MVP fully functional and independently testable

---

## Phase 4: User Story 2 - Adding Products from Restaurant Menu & Enforcing Single-Restaurant Constraint (Priority: P1)

**Goal**: Allow customers to add available menu items from restaurant pages to their cart and present a cross-restaurant decision dialog when attempting to add an item from a different restaurant.

**Independent Test**: Select "Add to Cart" on a menu item; verify badge updates. Add item from a secondary restaurant; verify `CrossRestaurantDialogComponent` modal appears offering "Clear & Add" or "Keep Current" choices.

### Implementation & Tests for User Story 2

- [x] T013 [P] [US2] Create presentational `CrossRestaurantDialogComponent` (CDK Overlay modal) in `projects/customer/src/app/features/cart/components/cross-restaurant-dialog.component.ts`
- [x] T014 [US2] Update `CartStore` in `projects/customer/src/app/features/cart/cart.store.ts` to handle `addItem` and 409 `CrossRestaurantCart` domain error code, exposing conflict state and resolution methods
- [x] T015 [US2] Refactor `CartEntryCoordinator` in `projects/customer/src/app/core/cart-entry/cart-entry-coordinator.service.ts` and `RestaurantMenuPage` in `projects/customer/src/app/features/catalog/pages/restaurant-menu.page.ts` to delegate additions to `CartStore.addItem` and open `CrossRestaurantDialogComponent` on conflict
- [x] T016 [US2] Disable add-to-cart controls for unavailable products (`isAvailable: false`) in `projects/customer/src/app/features/catalog/components/menu-product-card.component.ts`
- [x] T017 [US2] Create unit tests for menu addition & cross-restaurant conflict prompt in `projects/customer/src/app/features/catalog/pages/restaurant-menu.page.spec.ts`

**Checkpoint**: User Story 2 fully functional and independently testable

---

## Phase 5: User Story 3 - Cart Quantity Management, Item Removal & Destructive Clear Confirmation (Priority: P2)

**Goal**: Allow customers to adjust item quantities (+ / -), remove items, or clear the entire cart after confirming via a CDK overlay confirmation dialog.

**Independent Test**: On `/cart` page, adjust item quantity, remove a line item, click "Clear Cart", confirm in dialog, and verify cart resets to empty state and server 204 No Content response is handled cleanly.

### Implementation & Tests for User Story 3

- [x] T018 [P] [US3] Create presentational `CartItemRowComponent` with +, -, and remove controls in `projects/customer/src/app/features/cart/components/cart-item-row.component.ts`
- [x] T019 [P] [US3] Create presentational `ClearCartDialogComponent` (CDK Overlay sheet) in `projects/customer/src/app/features/cart/components/clear-cart-dialog.component.ts`
- [x] T020 [US3] Update `CartStore` in `projects/customer/src/app/features/cart/cart.store.ts` with `updateQuantity`, `removeItem`, and `clearCart` (handling 204 No Content response)
- [x] T021 [US3] Integrate `CartItemRowComponent` and `ClearCartDialogComponent` into `CartPage` in `projects/customer/src/app/features/cart/pages/cart.page.ts`
- [x] T022 [US3] Create unit tests for quantity updates, line removals, and clear cart confirmation in `projects/customer/src/app/features/cart/cart.store.spec.ts`
- [x] T023 [US3] Execute US3 unit tests gate (`npx ng test customer --watch=false`)

**Checkpoint**: User Story 3 fully functional and independently testable

---

## Phase 6: User Story 4 - Handling Session Changes, Concurrency & Recoverable Failures (Priority: P3)

**Goal**: Ensure in-memory cart state clears immediately on logout/session expiry, mutation operations process sequentially to prevent race conditions, and network errors present clear recovery options.

**Independent Test**: Sign out while having items in cart; verify `CartStore` state is wiped and badge is reset to 0. Induce network offline error during quantity update; verify retry options.

### Implementation & Tests for User Story 4

- [x] T024 [US4] Wire `AuthStore` authentication signal listener in `CartStore` (`projects/customer/src/app/features/cart/cart.store.ts`) to automatically initialize cart on sign-in and invoke `reset()` on sign-out
- [x] T025 [P] [US4] Create unit tests for `CartStore` session reset on sign-out in `projects/customer/src/app/features/cart/cart.store.spec.ts`
- [x] T026 [US4] Implement request serialization in `CartStore` (`projects/customer/src/app/features/cart/cart.store.ts`) using sequence lock / `concatMap` to prevent out-of-order response overwrites
- [x] T027 [US4] Implement typed error handling and toast/banner recovery for domain errors (`ProductUnavailable`, `CartExpired`, `RestaurantClosed`) in `CartStore` and `CartPage`
- [x] T028 [US4] Execute session and concurrency unit tests gate (`npx ng test customer --watch=false`)

**Checkpoint**: User Story 4 fully functional and independently testable

---

## Phase 7: Polish & Verification Gates

**Purpose**: Accessibility, responsive touch targets, automated verification gates, build validation, and manual acceptance checks

- [x] T029 [P] Add visible focus indicators (`--tal-focus-ring`), keyboard focus traps, and ARIA labels (`aria-label="Increase quantity of [Product]"`) to cart controls and dialogs in `projects/customer/src/app/features/cart/`
- [x] T030 [P] Verify responsive layout rendering at 320px, 768px, 1280px viewports and 200% zoom across cart components
- [x] T031 [P] Verify minimum 42px touch target sizing on all cart buttons and interactive elements
- [x] T032 Execute full customer unit test suite gate (`npx ng test customer --watch=false`)
- [x] T033 Execute customer production build gate (`npx ng build customer --configuration=production`)
- [x] T034 Execute manual live acceptance journeys documented in `quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 - **BLOCKS all user stories**.
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion.
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion (can proceed after US1 or in parallel).
- **User Story 3 (Phase 5)**: Depends on Phase 2 & US1 completion.
- **User Story 4 (Phase 6)**: Depends on Phase 2 completion.
- **Polish & Verification Gates (Phase 7)**: Depends on all user story phases being complete.

---

## Requirement Coverage Traceability

| Requirement ID | Description | Primary Executable Task(s) |
|---|---|---|
| **FR-001** | Fetch server-backed cart on access | T005, T006, T010 |
| **FR-002** | Server total price authority | T005, T007, T010 |
| **FR-003** | Shell header & FAB badge sync | T008, T009 |
| **FR-004** | Enforce single-restaurant constraint | T014, T015 |
| **FR-005** | Cross-restaurant decision dialog | T013, T014, T015 |
| **FR-006** | Quantity adjustment & item removal | T018, T020, T021 |
| **FR-007** | Clear cart confirmation dialog | T019, T020, T021 |
| **FR-008** | 4-state cart page rendering | T010, T011 |
| **FR-009** | Product availability check | T016 |
| **FR-010** | Logout in-memory cart cleanup | T024, T025 |
| **FR-011** | Request concurrency serialization | T026 |
| **FR-012** | Typed `AppErrorCode` domain error handling | T003, T004, T027 |
| **FR-013** | Keyboard accessibility & ARIA labels | T029 |
| **FR-014** | Viewport responsiveness & 200% zoom | T030 |
| **FR-015** | Minimum 42px touch target sizing | T031 |
| **SC-001** | 100% server price match | T007, T010, T032 |
| **SC-002** | Badge sync within 1 second | T008, T009, T032 |
| **SC-003** | 100% cross-restaurant prompt trigger | T013, T015, T017 |
| **SC-004** | Sub-3-second quantity adjustment | T018, T020, T023 |
| **SC-005** | WCAG AA accessibility compliance | T029, T030, T031 |
| **SC-006** | 0% token/cart leakage on logout | T024, T025, T032 |

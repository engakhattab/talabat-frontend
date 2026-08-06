# Implementation Plan: Server-Backed Customer Cart (Phase 8)

**Branch**: `002-server-backed-customer-cart` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Approved specification and clarification decisions from `/specs/002-server-backed-customer-cart/spec.md`

---

## Summary

Phase 8 implements the full server-backed customer shopping cart for the Talabat Angular customer application (`projects/customer`). It replaces the temporary Phase 7 cart preview placeholders (`CartDeferredDialogComponent`, placeholder `CartPage`) with an authoritative, synchronized cart state managed by a root-provided Angular Signal store (`CartStore`). 

The technical approach integrates directly with `@talabat/api-customer` (`CartApiService`), maps RFC 9457 `ProblemDetails` domain error codes via an expanded `AppErrorCode` in `@talabat/core-http`, enforces strict server price authority (no client-side total calculations), handles single-restaurant domain conflicts via accessible CDK Overlay prompts, synchronizes shell/header cart badge counts, and ensures complete in-memory session cleanup on sign-out.

---

## Technical Context

- **Language / Platform**: TypeScript 5.7 / Angular 22.1 (Zoneless, Standalone Components, Signal Forms, Signals).
- **Primary Dependencies**: `@angular/core`, `@angular/router`, `@angular/cdk/overlay`, `@angular/cdk/dialog`, `@talabat/api-customer`, `@talabat/core-auth`, `@talabat/core-http`, `@talabat/shared-ui`.
- **State Management**: Signals and Root Injectable Services (`CartStore` provided in root). External state management packages (NgRx, SignalStore) are strictly prohibited.
- **HTTP Client**: Generated `CartApiService` in `@talabat/api-customer`. Direct `HttpClient` usage in features is strictly prohibited.
- **Testing Framework**: Vitest (`@angular/build:unit-test`).
- **Target Viewports**: Responsive customer application at 320px, 768px, 1280px and 200% browser zoom. Minimum touch target height: 42px.

---

## Constitution Check

*All gates evaluated against `.specify/memory/constitution.md` (v1.1.0)*

| Principle | Requirement | Compliance Status | Justification / Implementation Detail |
|---|---|---|---|
| **I. Data Ownership** | Server total authority | **PASS** | `CartResponse` and `CartLineItemDto` are sole sources of truth. No client price calculations. |
| **II. Generated API** | No manual API edits / No direct HttpClient | **PASS** | Uses generated `CartApiService` in `@talabat/api-customer`. |
| **III. Dependency Hierarchy** | One-way apps → features → core → api | **PASS** | `CartStore` resides in `projects/customer/src/app/features/cart/` provided in root. |
| **IV. Routing & Guards** | Lazy loading & `authGuard` before `profileGuard` | **PASS** | `/cart` route uses `canActivate: [authGuard, profileGuard]` and `loadComponent`. |
| **V. Angular 22 Standards** | Standalone, Zoneless, Signals, No `NgModule` / RxJS store | **PASS** | 100% standalone, Zoneless, Signal-based state. |
| **VI. Auth & Security** | In-memory token storage, exact prefix interceptor | **PASS** | Retains existing `core-auth` PKCE in-memory token lifecycle. Clear state on logout. |
| **VII. HTTP & Error Handling** | Mapped RFC 9457 `AppErrorCode` & 4-state views | **PASS** | `AppErrorCode` expanded in `core-http`. 4-state presentation on `/cart` page. |
| **VIII. Design & A11y** | Tailwind v4 tokens, CDK overlay, 42px touch targets | **PASS** | Follows FoodDash design tokens, CDK dialogs, 42px minimum touch targets, visible focus. |
| **IX. Testing & Verification** | Vitest priority order & no assertion weakening | **PASS** | Mandatory unit tests for `CartStore`, components, and shell integration. |
| **X. Phase Discipline** | Single phase, clean git baseline | **PASS** | Focuses strictly on Phase 8. Excludes Phase 9 checkout. |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-server-backed-customer-cart/
├── spec.md              # Approved feature specification & clarifications
├── plan.md              # Technical implementation plan
├── research.md          # Phase 0 technical research & rationale
├── data-model.md        # Phase 1 data models & state transition diagrams
├── quickstart.md        # Phase 1 validation and verification guide
├── contracts/
│   └── cart-api-contract.md  # API contract mappings
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code Layout (`projects/customer/src/app/`)

```text
projects/core-http/src/lib/
└── app-error.ts                      # EXPAND: Add cart domain error codes to AppErrorCode

projects/customer/src/app/
├── core/
│   └── cart-entry/
│       └── cart-entry-coordinator.service.ts  # UPDATE: Delegate menu additions to CartStore
├── layout/
│   ├── cart-entry-bar.component.ts   # UPDATE: Bind FAB badge to CartStore.totalItemCount()
│   ├── customer-shell.component.ts   # Maintain layout wrapper
│   └── header.component.ts           # UPDATE: Bind header cart badge to CartStore.totalItemCount()
└── features/
    └── cart/
        ├── cart.store.ts             # NEW: Root-provided Signal CartStore
        ├── cart.store.spec.ts        # NEW: Unit tests for CartStore
        ├── components/
        │   ├── cart-item-row.component.ts        # NEW: Line item row with + / - / remove controls
        │   ├── cart-summary.component.ts         # NEW: Authoritative server total display
        │   ├── cross-restaurant-dialog.component.ts # NEW: CDK overlay cross-restaurant conflict modal
        │   └── clear-cart-dialog.component.ts    # NEW: CDK overlay clear cart confirmation modal
        └── pages/
            ├── cart.page.ts          # UPDATE: 4-state cart page implementation
            └── cart.page.spec.ts     # NEW: Unit tests for CartPage
```

---

## Discovered Current-State Baseline

1. **Angular Platform**: Angular 22.1 Zoneless execution (`provideZonelessChangeDetection()`), standalone components, Tailwind v4 design tokens.
2. **API Library**: Generated `CartApiService` in `@talabat/api-customer` with full endpoint coverage (`getCart`, `addCartItem`, `updateCartItemQuantity`, `removeCartItem`, `clearCart`).
3. **HTTP Error Pipeline**: `problemDetailsInterceptor` in `@talabat/core-http` maps ProblemDetails `errorCode` string to `AppErrorCode`. Currently, `AppErrorCode` lacks cart domain error codes (`CrossRestaurantCart`, `CartExpired`, `CartNotActive`, `CartItemNotFound`, `ProductUnavailable`, `RestaurantClosed`, `RestaurantInactive`, `InvalidQuantity`).
4. **Shell & Layout**:
   - `HeaderComponent` renders static links without a live cart badge.
   - `CartEntryBarComponent` (FAB) displays placeholder "Available in Phase 8".
   - `CartEntryCoordinator` returns `'deferred'`.
   - `RestaurantMenuPage` opens `CartDeferredDialogComponent` when "Add to Cart" is clicked.
5. **Route Configuration**: `/cart` route is protected by `canActivate: [authGuard, profileGuard]` and lazy-loads placeholder `CartPage`.

---

## Architecture & Technical Decisions

1. **Root-Provided Signal `CartStore`**:
   - Resides in `projects/customer/src/app/features/cart/cart.store.ts` provided in root (`providedIn: 'root'`).
   - Exposes reactive signals: `cart`, `items`, `total`, `totalItemCount`, `isEmpty`, `status`, `error`, `isMutating`, `mutatingProductId`, `conflictAddRequest`.
   - Reacts to `AuthStore` authentication changes: automatically initializes cart on login and resets to empty on logout/session expiry.

2. **Expansion of `AppErrorCode`**:
   - Update `projects/core-http/src/lib/app-error.ts` to include:
     `CrossRestaurantCart`, `CartExpired`, `CartNotActive`, `CartItemNotFound`, `ProductUnavailable`, `RestaurantClosed`, `RestaurantInactive`, `InvalidQuantity`.

3. **Refactoring Menu & Cart Entry Flow**:
   - Update `CartEntryCoordinator` and `RestaurantMenuPage`:
     - Unauthenticated click: triggers `AuthStore.signIn(returnUrl)`.
     - Authenticated click: invokes `CartStore.addItem({ restaurantId, productId, quantity })`.
     - `CrossRestaurantCart` (409): `CartStore` sets `conflictAddRequest`, prompting `CrossRestaurantDialogComponent`.

4. **CDK Overlay Dialog Primitives**:
   - `CrossRestaurantDialogComponent`: CDK Overlay modal asking *"Clear existing cart from Restaurant A and add item from Restaurant B?"* Choices: "Clear & Add" or "Keep Current Cart".
   - `ClearCartDialogComponent`: CDK Overlay confirmation sheet asking *"Are you sure you want to clear your cart?"*

---

## Data & State Flows

### Initialization & Re-hydration Flow
```text
Customer Shell Init / Login -> CartStore.loadCart() -> CartApiService.getCart()
  |-- Success (200 OK): Store cart payload (populated or empty) -> Badge signal updates
  +-- Error: Store error signal -> Render error retry state if on /cart page
```

### Add to Cart & Conflict Resolution Flow
```text
Menu Item Click -> CartStore.addItem(req) -> CartApiService.addCartItem()
  |-- Success (200 OK): Store updated CartResponse -> Badge count updates -> Success feedback
  |-- Error 409 (CrossRestaurantCart): Store conflictAddRequest -> Open CrossRestaurantDialog
  |     |-- User selects "Clear & Add": CartApiService.clearCart() -> CartApiService.addCartItem()
  |     +-- User selects "Keep Current": Clear conflictAddRequest -> Retain existing cart
  +-- Error 422 (ProductUnavailable): Display error notification -> Refetch cart
```

### Quantity Adjustment & Item Removal Flow
```text
+ / - Click -> CartStore.updateQuantity(productId, newQty)
  |-- If newQty >= 1: CartApiService.updateCartItemQuantity() -> Update CartResponse
  +-- If newQty < 1 or Remove click: CartApiService.removeCartItem() -> Update CartResponse
```

---

## Route & Component Boundaries

- **`/cart` Route**: Protected by `canActivate: [authGuard, profileGuard]`.
- **`CartPage` (`features/cart/pages/cart.page.ts`)**:
  - `loading` state: `tal-spinner`
  - `error` state: `tal-error-state` with retry button calling `CartStore.reload()`
  - `empty` state: `tal-empty-state` with "Browse restaurants" action link
  - `populated` state: List of `tal-cart-item-row`, `tal-cart-summary`, "Clear Cart" button, "Proceed to Checkout" (disabled placeholder for Phase 9).

---

## Error & Recovery Strategy

- **`CrossRestaurantCart` (409)**: Handled via `CrossRestaurantDialogComponent` modal prompt.
- **`ProductUnavailable` (422) / `RestaurantClosed` (422)**: Display inline banner or toast, trigger `CartStore.loadCart()`.
- **`CartExpired` (409) / `CartNotActive` (409)**: Clear cart state, show informative message, prompt user to browse catalog.
- **`InvalidQuantity` (400) / `CartItemNotFound` (404)**: Display error notification, refresh cart state from server.
- **Network Failure (Status 0)**: Present retryable error view, preserve previous confirmed cart state.

---

## Concurrency & Stale Response Strategy

1. **Button Disabled / Busy States**: Interactive controls (`+`, `-`, remove, clear) set `[busy]="isMutating"` and disable target buttons while an HTTP call is in flight.
2. **Operation Serialization**: `CartStore` serializes mutation pipelines using rx-interop `concatMap` / sequence tracking, discarding out-of-order asynchronous responses.

---

## Accessibility & Responsive Strategy

- **Responsive Viewports**: Tested at 320px (mobile small), 768px (tablet), 1280px (desktop), and 200% browser zoom.
- **Touch Targets**: Minimum **42px** height for all buttons and interactive controls.
- **Focus Rings**: `:focus-visible` using `--tal-focus-ring`.
- **Screen Readers**: ARIA labels on quantity controls (`aria-label="Increase quantity of [Product]"`), `aria-live="polite"` for grand total announcements.
- **CDK Overlay Dialogs**: Trap focus inside modal, return focus to trigger on close, dismiss on `Escape`.

---

## Testing & Verification Strategy

1. **Unit Tests**:
   - `CartStore` (`cart.store.spec.ts`): Test load, add, update, remove, clear, 204 handling, error handling, cross-restaurant conflict, logout cleanup.
   - `CartPage` (`cart.page.spec.ts`): Test rendering 4 view states (loading, error, empty, populated).
   - `HeaderComponent` (`header.component.spec.ts`): Test cart badge count rendering.
   - `CartEntryBarComponent` (`cart-entry-bar.component.spec.ts`): Test FAB item count rendering.
2. **Verification Gates**:
   - `npx ng test customer --watch=false` (100% pass).
   - `npx ng build customer --configuration=production` (clean build).

---

## Implementation Prerequisites & Gates

- Git working tree must be clean prior to starting code tasks.
- No direct `HttpClient` usage in feature code.
- No editing of backend code or generated API libraries (`projects/api-customer`).
- Strict exclusion of Phase 9 checkout submission or payment processing.

---

## Risks & Unresolved Blockers

- *Risk*: `NG0205` teardown warnings during Angular test execution if click listeners trigger navigation post-teardown.
  - *Mitigation*: Defensive event handling in presentational component click handlers.
- *Blockers*: None detected. Backend `CartController` contracts and OpenAPI definitions are fully compatible.

---

## Exact Phase 8 Exit Criteria

1. 100% of cart total prices, line totals, and item quantities match server responses without client-side calculations.
2. Shell header badge and mobile FAB update within 1 second of any confirmed cart addition, update, removal, or clearing.
3. Attempting to add an item from a different restaurant presents `CrossRestaurantDialogComponent` modal with working "Clear & Add" and "Keep Current" options.
4. `/cart` page accurately displays loading, error, empty, and populated states based on server response.
5. Interactive controls meet 42px touch target minimums, visible focus rings, and ARIA labels.
6. Logging out clears all in-memory cart state and resets badge count to 0.
7. Automated unit tests pass cleanly (`npx ng test customer --watch=false`).
8. Production build succeeds without bundle budget errors (`npx ng build customer --configuration=production`).
9. Git working directory remains clean with a single focused commit for Phase 8.

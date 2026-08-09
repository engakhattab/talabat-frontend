# Implementation Plan: Account, Addresses, and Orders (Phase 10)

**Branch**: `004-account-addresses-orders` | **Date**: 2026-08-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-account-addresses-orders/spec.md`

## Summary

Phase 10 completes the customer self-service account journey: profile viewing/editing, delivery address management (add, set default, remove), order history with server-driven pagination, and order detail viewing. It extends the existing `ProfileStore` with mutation methods, extracts the checkout address form into a feature-neutral customer-app boundary, replaces the placeholder `OrdersPage`, and reuses the Phase 9 `OrderConfirmationPage` as the canonical order detail view.

## Technical Context

**Language/Version**: TypeScript 5.8+ / Angular 22.1

**Primary Dependencies**: `@angular/core` (signals, inject, resource), `@angular/forms/signals` (Signal Forms), `@angular/cdk/dialog` (dialog/overlay), `@talabat/api-customer` (generated services), `@talabat/core-http` (AppError), `@talabat/core-auth` (AuthStore, guards), `@talabat/shared-ui` (ButtonComponent, DialogService, SpinnerComponent, ErrorStateComponent, EmptyStateComponent, StatusChipComponent), `@talabat/shared-util` (MoneyPipe, formatDateTime)

**Storage**: N/A — all data is server-authoritative via generated API services

**Testing**: Vitest (`@angular/build:unit-test`)

**Target Platform**: Responsive web (320px–1280px+, 200% zoom)

**Project Type**: Angular SPA feature increment within `projects/customer`

**Performance Goals**: Profile/address mutations < 3s; order list load < 3s; page transitions < 2s

**Constraints**: Zoneless execution; no NgModules; no BehaviorSubject; no direct HttpClient; no manual edits to `api-customer`; no cross-feature imports; generated DTOs are authoritative

**Scale/Scope**: Single customer application; < 50 orders per customer typical; 5 address maximum assumed by UX constraints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Authoritative Backend | ✅ PASS | All mutations use generated API services; no client-side price calculation; ProfileStore replaces state from server responses |
| II. Generated API Boundary | ✅ PASS | All HTTP access through `CustomerApiService`, `AddressesApiService`, `OrdersApiService`; no manual HttpClient; no edits to `api-customer` |
| III. One-Way Dependency Hierarchy | ✅ PASS | ProfileStore stays in `core/profile`; features do not import each other; address form moves to app-level `ui/` (below features, above core) |
| IV. Vertical Feature Slices | ✅ PASS | Profile feature owns profile UI; Orders feature owns order list/detail; checkout feature retains its own state; all routes lazy-loaded; guards: authGuard → profileGuard |
| V. Angular 22 Platform | ✅ PASS | Standalone components; Signal Forms; signals; inject(); @if/@for; zoneless-safe |
| VI. Auth & Security | ✅ PASS | All Phase 10 routes already guarded by authGuard + profileGuard; no token changes |
| VII. HTTP & Error Handling | ✅ PASS | AppError/AppErrorCode pipeline preserved; all views implement 4-state async (loading/error/empty/populated) |
| VIII. FoodDash Design | ✅ PASS | Existing tokens, primitives, 42px targets, logical CSS properties, 320/768/1280px responsiveness |
| IX. Testing | ✅ PASS | Store mutations, form validation, page resource states, and guard behavior will be tested |
| X. Phase & Git Discipline | ✅ PASS | Single phase; no generated API changes; one focused commit |

No violations. No Complexity Tracking entries needed.

## Architecture Decisions

### AD-1: Why extend ProfileStore rather than creating a new store

`ProfileStore` (`core/profile/profile.store.ts`) already owns the `ProfileResponse` aggregate, which includes `addresses: AddressDto[]`. Addresses are part of the profile aggregate in the backend — `GET /api/me/profile` returns addresses inline. Creating a separate `AddressStore` would require either duplicating the address state or splitting a single server aggregate across two stores, creating synchronization complexity.

**Decision**: Extend `ProfileStore` with `updateProfile()`, `addAddress()`, `setDefaultAddress()`, and `removeAddress()` methods. ProfileStore's responsibility boundary remains "customer profile aggregate and its addresses" — not a general-purpose customer state container. Orders explicitly stay outside ProfileStore.

### AD-2: Why the address form must move out of checkout

`AddressFormModalComponent` currently lives at `features/checkout/components/` and injects `CheckoutStore` (line 11, 142, 214). If profile address management imported this component, it would create a `profile → checkout` feature-to-feature dependency, violating Constitution Principle III.

**Decision**: Move to `projects/customer/src/app/ui/address-form-modal.component.ts`. This is a new customer-application UI boundary — feature-neutral within the customer app, but not domain-neutral like `shared-ui`. The `app/ui/` location matches the roadmap's documented convention (`projects/customer/src/app/ui/`). Remove `CheckoutStore` injection; return `AddressResponse` through `dialogRef.close(created)`.

### AD-3: Why `app/ui/` is feature-neutral but not domain-neutral

`shared-ui` must remain domain-free (Constitution Principle III). `AddressFormModalComponent` depends on `AddressesApiService` (a customer domain service) and `ProfileStore` (customer app state). It cannot go in `shared-ui`. But it's reusable across multiple customer features (checkout, profile). The `app/ui/` directory sits at the customer app level, accessible to all features without creating feature-to-feature coupling.

### AD-4: Why OrderConfirmationPage remains the canonical detail view

Phase 9's `OrderConfirmationPage` at `features/orders/pages/order-confirmation.page.ts` already implements the complete order detail contract:
- Route: `/orders/:orderId` with `input.required<string>({ alias: 'orderId' })`
- Fetches `OrdersApiService.getOrderDetails({ orderId })`
- Renders all `OrderDetailResponse` fields
- Handles: loading, loaded, invalid route parameter (non-numeric), 404 not-found (non-retryable), network error (retryable)

Creating a second order detail page would duplicate all this logic. Both post-checkout and order-history navigation resolve to the same route.

**Minimal refinement**: The h1 heading currently says "Order Confirmation". Change it to "Order Details" to be neutral for both entry points. Add a "Back to orders" link alongside the existing "Back to restaurants" link.

### AD-5: Why order history does not require a store

Order history is a read-only, page-scoped server resource. The data is not shared across routes — navigating to `/orders/:orderId` fetches its own detail independently. Pagination state (`currentPage`) is component-local and resets on navigation.

**Decision**: `OrdersPage` owns a local `resource()` for the order list and a `signal(1)` for the current page. No `OrdersStore` is needed.

### AD-6: Server-authoritative reconciliation after each mutation

Verified generated API return types:

| Operation | API Method | Return Type | Reconciliation Strategy |
|-----------|-----------|-------------|------------------------|
| Update Profile | `CustomerApiService.updateProfile()` | `Observable<ProfileResponse>` | Replace `profileState` directly from response |
| Add Address | `AddressesApiService.addAddress()` | `Observable<AddressResponse>` | Returns only the new address, NOT full profile. **Reload profile** via `getProfile()` to get authoritative address list ordering and default flags |
| Set Default | `AddressesApiService.setDefaultAddress()` | `Observable<ProfileResponse>` | Replace `profileState` directly from response |
| Remove Address | `AddressesApiService.removeAddress()` | `Observable<void>` (204) | **Reload profile** via `getProfile()` after success |

## Project Structure

### Documentation (this feature)

```text
specs/004-account-addresses-orders/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
talabat-web/projects/customer/src/app/
├── core/
│   └── profile/
│       ├── profile.store.ts          # MODIFY — add mutation methods
│       ├── profile.store.spec.ts     # MODIFY — add mutation tests
│       └── index.ts                  # REUSE unchanged
├── ui/
│   └── address-form-modal.component.ts        # MOVE from features/checkout/components/
│   └── address-form-modal.component.spec.ts   # MOVE from features/checkout/components/
├── features/
│   ├── profile/
│   │   └── pages/
│   │       ├── profile.page.ts           # MODIFY — add edit form + address management
│   │       └── profile.page.spec.ts      # MODIFY — add edit/address tests
│   ├── orders/
│   │   ├── orders.routes.ts              # REUSE unchanged
│   │   └── pages/
│   │       ├── orders.page.ts            # MODIFY — replace placeholder with data-driven list + pagination
│   │       ├── orders.page.spec.ts       # CREATE — tests for order history
│   │       └── order-confirmation.page.ts     # MODIFY — change heading, add "Back to orders" link
│   │       └── order-confirmation.page.spec.ts # MODIFY — update heading test
│   └── checkout/
│       ├── checkout.store.ts             # MODIFY — safe address selection computed
│       ├── checkout.store.spec.ts        # MODIFY — dangling address test
│       ├── pages/
│       │   └── checkout.page.ts          # MODIFY — import from app/ui/, handle dialog result
│       │   └── checkout.page.spec.ts     # MODIFY — update import path
│       └── components/
│           ├── address-form-modal.component.ts       # DELETE (moved to app/ui/)
│           ├── address-form-modal.component.spec.ts  # DELETE (moved to app/ui/)
│           ├── address-selector.component.ts         # REUSE unchanged
│           └── checkout-summary.component.ts         # REUSE unchanged
└── layout/
    ├── routes.ts                         # REUSE unchanged
    └── header.component.ts               # REUSE unchanged
```

**Structure Decision**: Extend existing feature directories. Create `app/ui/` for the relocated address form. No new feature directories, stores, or routing configuration needed.

## File Change Classification

### REUSE (unchanged)

| File | Reason |
|------|--------|
| `core/profile/index.ts` | Barrel export still valid |
| `layout/routes.ts` | Routes already configured for `/profile`, `/orders` |
| `layout/header.component.ts` | Navigation links already present |
| `features/orders/orders.routes.ts` | Route map already correct |
| `features/checkout/components/address-selector.component.ts` | No changes needed |
| `features/checkout/components/checkout-summary.component.ts` | No changes needed |
| `features/checkout/checkout.routes.ts` | No changes needed |

### MODIFY

| File | Changes |
|------|---------|
| `core/profile/profile.store.ts` | Add `updateProfile()`, `addAddress()`, `setDefaultAddress()`, `removeAddress()` |
| `core/profile/profile.store.spec.ts` | Tests for new mutation methods |
| `features/checkout/checkout.store.ts` | Safe `selectedAddressId` computed with override validation |
| `features/checkout/checkout.store.spec.ts` | Test dangling override address fallback |
| `features/checkout/pages/checkout.page.ts` | Import address form from `app/ui/`, subscribe to dialog closed result |
| `features/checkout/pages/checkout.page.spec.ts` | Update import path |
| `features/profile/pages/profile.page.ts` | Add inline edit form + address management UI |
| `features/profile/pages/profile.page.spec.ts` | Tests for edit and address flows |
| `features/orders/pages/orders.page.ts` | Replace placeholder with data-driven order list + pagination |
| `features/orders/pages/order-confirmation.page.ts` | Change h1 to "Order Details", add "Back to orders" link |
| `features/orders/pages/order-confirmation.page.spec.ts` | Update heading assertion |

### MOVE

| From | To | Changes |
|------|----|---------|
| `features/checkout/components/address-form-modal.component.ts` | `ui/address-form-modal.component.ts` | Remove `CheckoutStore` import; close dialog with `AddressResponse` result |
| `features/checkout/components/address-form-modal.component.spec.ts` | `ui/address-form-modal.component.spec.ts` | Remove `CheckoutStore` mock; verify dialog close with result |

### CREATE

| File | Purpose |
|------|---------|
| `features/orders/pages/orders.page.spec.ts` | Tests for order history list, pagination, empty/error states |

## Data Flows

### Profile Update Flow

```
ProfilePage (edit mode)
  → user submits Signal Form
  → ProfilePage calls profileStore.updateProfile(request)
  → ProfileStore calls customerApi.updateProfile({ updateProfileRequest: request })
  → Server returns ProfileResponse
  → ProfileStore.profileState.set(response) — direct replacement
  → ProfilePage computed signals react → view returns to read mode
```

### Address Creation Flow (from Profile)

```
ProfilePage
  → user clicks "Add address"
  → ProfilePage opens AddressFormModalComponent via DialogService
  → User fills form, submits
  → AddressFormModalComponent calls profileStore.addAddress(request)
  → ProfileStore calls addressesApi.addAddress({ addAddressRequest: request })
  → Server returns AddressResponse (single address only)
  → ProfileStore calls customerApi.getProfile() to reload full aggregate
  → ProfileStore.profileState.set(reloadedProfile)
  → AddressFormModalComponent closes dialog with AddressResponse result
  → ProfilePage sees updated ProfileStore signals reactively
```

### Address Creation Flow (from Checkout)

```
CheckoutPage
  → user clicks "Add Delivery Address"
  → CheckoutPage opens AddressFormModalComponent via DialogService
  → User fills form, submits (same as above through ProfileStore)
  → AddressFormModalComponent closes dialog with AddressResponse result
  → CheckoutPage subscribes to dialogRef.closed
  → If result has an id, CheckoutStore.selectAddress(result.id)
  → CheckoutStore.addresses computed re-evaluates from ProfileStore reactively
```

### Set Default Address Flow

```
ProfilePage
  → user clicks "Set as default" on address card
  → ProfilePage calls profileStore.setDefaultAddress(addressId)
  → ProfileStore calls addressesApi.setDefaultAddress({ addressId })
  → Server returns ProfileResponse
  → ProfileStore.profileState.set(response) — direct replacement
  → UI reactively updates default indicators
```

### Remove Address Flow

```
ProfilePage
  → user clicks "Remove" on address card
  → Confirmation dialog/prompt appears
  → User confirms
  → ProfilePage calls profileStore.removeAddress(addressId)
  → ProfileStore calls addressesApi.removeAddress({ addressId })
  → Server returns void (204)
  → ProfileStore calls customerApi.getProfile() to reload full aggregate
  → ProfileStore.profileState.set(reloadedProfile)
  → Address disappears from list reactively
```

### Order History Flow

```
OrdersPage
  → resource() calls ordersApi.getOrders({ page: currentPage(), pageSize: 10 })
  → Server returns OrderListResponse { items, page, pageSize, totalCount }
  → Template renders order summary cards
  → User clicks prev/next → currentPage signal updates → resource reloads
  → User clicks an order card → router navigates to /orders/:orderId
```

### Order Detail Flow (unchanged from Phase 9)

```
OrderConfirmationPage (route: /orders/:orderId)
  → input signal reads orderId from route
  → effect() calls ordersApi.getOrderDetails({ orderId })
  → Template renders order detail or error/not-found state
```

## Checkout Address Safety

### Current Problem

`CheckoutStore.selectedAddressId` is:
```ts
readonly selectedAddressId = computed(
  () => this.overrideAddressIdState() ?? this.defaultAddressId(),
);
```

If the user removes an address (ID 5) via profile management while `overrideAddressIdState` is `5`, the computed returns `5` but `selectedAddress` computed returns `null` (address no longer in list). The "Place Order" button may appear enabled while pointing to a deleted address.

### Fix

Change `selectedAddressId` to validate the override exists:
```ts
readonly selectedAddressId = computed(() => {
  const overrideId = this.overrideAddressIdState();
  const currentAddresses = this.addresses();
  if (overrideId !== null && currentAddresses.some((a) => a.id === overrideId)) {
    return overrideId;
  }
  return this.defaultAddressId();
});
```

This ensures a dangling override silently falls back to the current default without any direct coupling between ProfileStore and CheckoutStore.

## Pagination Design

### Approach: Component-local signal pagination

- `OrdersPage` owns `currentPage = signal(1)` and `pageSize = 10` (constant)
- `resource()` request recomputes when `currentPage()` changes
- Total pages computed: `totalPages = computed(() => Math.ceil(response.totalCount / pageSize))`
- Previous button disabled when `currentPage() === 1`
- Next button disabled when `currentPage() >= totalPages()`
- Page context displayed: "Page {page} of {totalPages}"
- No URL/query-param pagination — unnecessary complexity for Phase 10; component-local state is simpler and resets naturally on navigation

### Edge Cases

- **Empty first page**: `totalCount === 0` → show EmptyStateComponent
- **Unexpectedly empty later page** (e.g., orders deleted between page loads): `items.length === 0 && page > 1` → reset `currentPage` to 1 and reload
- **Server returns fewer items than pageSize on last page**: Normal; UI handles variable `items.length`

## Error Strategy

### Existing Infrastructure

`problemDetailsInterceptor` converts all HTTP errors to `AppError { status, code, title, detail, isNetworkError, rawError }`. Features branch on `AppErrorCode` values, falling back to generic messaging for `Unknown`.

### Phase 10 Error Handling

| Scenario | Status | AppErrorCode | User Message | Retryable |
|----------|--------|-------------|--------------|-----------|
| Profile update validation error | 400/422 | `InvalidCustomerProfile` (if sent) or `Unknown` | Display `error.title` + `error.detail` in form alert | No (fix inputs) |
| Address add server error | 400/422 | `Unknown` (until verified) | Display `error.title` + `error.detail` in form alert | No (fix inputs) |
| Address remove failure | 4xx | `Unknown` | Display error toast/alert | Depends |
| Address set-default failure | 4xx | `Unknown` | Display error alert | Yes for network |
| Order list network error | 0 | `Unknown` | "Cannot reach the server" + retry button | Yes |
| Order list server error | 5xx | `Unknown` | Display `error.title` + retry button | Yes |
| Order detail 404 | 404 | `Unknown` | "We could not find this order" — no retry | No |
| Order detail network error | 0 | `Unknown` | "Check your connection" + retry | Yes |

**No new `AppErrorCode` values are added in Phase 10.** The existing `InvalidCustomerProfile` code already exists in `AppErrorCode` for profile errors. Address-specific codes (`DuplicateAddress`, `AddressNotFound`) and order-specific codes (`OrderNotFound`) are not verified against actual backend wire responses and will not be added speculatively. All unrecognized codes degrade safely through `Unknown`.

## Route Impact

**No routing changes required.** All routes are already configured:

| Route | Guard | Component | Status |
|-------|-------|-----------|--------|
| `/profile` | `authGuard`, `profileGuard` | `ProfilePage` | EXISTS — component will be modified |
| `/orders` | `authGuard`, `profileGuard` | `OrdersPage` | EXISTS — component will be replaced |
| `/orders/:orderId` | `authGuard`, `profileGuard` | `OrderConfirmationPage` | EXISTS — minor heading change |

## Accessibility Requirements

### Profile Edit Form
- Labels linked to inputs via `for`/`id`
- `autocomplete` attributes: `name`, `tel`
- `inputmode="numeric"` for age
- `aria-invalid` + `aria-describedby` for error linking
- Focus first invalid field on rejected submit
- Busy state on submit button prevents duplicate submission
- Success confirmation announced via `role="status"`

### Address Cards
- Semantic list (`<ul role="list">`)
- Each card contains: address text, default badge (text + visual), "Set as default" button, "Remove" button
- Default badge uses text "Default" (not color-only)
- Remove confirmation: accessible dialog/prompt, not a single-tap icon

### Address Form Modal (existing, moved)
- Already accessible: focus trap, `aria-invalid`, `aria-describedby`, field labels, busy state
- No accessibility changes needed for the move

### Order History
- Order list as `<ul role="list">` with meaningful link text
- Each order card: "Order #7 — {date}" as accessible link text
- Order ID in mono font
- Money values formatted via `MoneyPipe`
- Dates formatted via `formatDateTime`
- Pagination controls with `aria-label`: "Previous page", "Next page"
- Disabled controls use `aria-disabled`
- Empty state and error state components already accessible

### Order Detail
- Already accessible from Phase 9
- `role="list"` on line items

### Responsive
- All pages: 320px / 768px / 1280px tested
- 200% zoom compatibility
- 42px minimum touch targets
- Logical CSS properties (`ps-*`, `pe-*`, `ms-*`, `me-*`)

## Testing Strategy

### Priority (per Constitution Principle IX)

1. **Store mutation tests** (`profile.store.spec.ts`):
   - `updateProfile()`: success → state replaced; validation error → error set, state unchanged
   - `addAddress()`: success → profile reloaded; server error → error propagated
   - `setDefaultAddress()`: success → state replaced directly from response
   - `removeAddress()`: success → profile reloaded; error → error propagated

2. **Checkout safety** (`checkout.store.spec.ts`):
   - Dangling override address ID → falls back to default
   - Override still valid → retained

3. **Address form decoupling** (`ui/address-form-modal.component.spec.ts`):
   - Verify no `CheckoutStore` injection
   - Verify dialog closes with `AddressResponse` on success
   - Verify dialog closes with `undefined` on cancel

4. **Profile page** (`profile.page.spec.ts`):
   - View mode renders profile data
   - Edit mode pre-populates from ProfileStore
   - Form validation (required fullName, positive age)
   - Successful update → returns to view mode
   - Server error → form preserved in edit mode
   - Address list renders correctly
   - Add/remove/set-default trigger correct ProfileStore methods

5. **Orders page** (`orders.page.spec.ts`):
   - Loading/empty/error/populated states
   - Order summary cards render correct fields
   - Pagination controls: previous/next enabled/disabled correctly
   - Page navigation triggers resource reload
   - Click navigates to `/orders/:orderId`

6. **Order confirmation page** (`order-confirmation.page.spec.ts`):
   - Heading text updated
   - "Back to orders" link present

## Implementation Sequence

| Step | Description | Dependencies | Files Affected |
|------|-------------|--------------|----------------|
| 1 | Extend ProfileStore with mutation methods | None | `profile.store.ts`, `profile.store.spec.ts` |
| 2 | Move + decouple AddressFormModalComponent | Step 1 (needs ProfileStore mutations) | `ui/address-form-modal.component.ts`, `ui/address-form-modal.component.spec.ts` (create at new path); delete originals from `checkout/components/` |
| 3 | Update CheckoutPage to use relocated form + dialog result | Step 2 | `checkout/pages/checkout.page.ts`, `checkout.page.spec.ts` |
| 4 | Fix CheckoutStore dangling address selection | Step 1 (ProfileStore addr changes flow through) | `checkout.store.ts`, `checkout.store.spec.ts` |
| 5 | Implement ProfilePage inline editing | Step 1 | `profile/pages/profile.page.ts`, `profile.page.spec.ts` |
| 6 | Implement ProfilePage address management | Steps 1, 2 | `profile/pages/profile.page.ts`, `profile.page.spec.ts` |
| 7 | Implement OrdersPage with data-driven list + pagination | None (independent) | `orders/pages/orders.page.ts`, `orders.page.spec.ts` (create) |
| 8 | Refine OrderConfirmationPage heading + navigation | None (independent) | `orders/pages/order-confirmation.page.ts`, `order-confirmation.page.spec.ts` |
| 9 | Integration verification | Steps 1–8 | Manual acceptance testing |

## Backend Limitations (Documented Constraints)

- **No address editing (PUT)**: Only add, remove, set-default
- **No order cancellation**: No cancel endpoint
- **No order status field**: `OrderDetailResponse` has no `status`; "Order confirmed" chip is UX convention only
- **No restaurant name in orders**: `restaurantId` (number) only; no N+1 catalog lookup
- **`addAddress()` returns `AddressResponse` only**: Not the full profile; requires profile reload
- **`removeAddress()` returns `void` (204)**: Requires profile reload
- **`OrderSummaryDto.itemCount`**: May be `0`; render as-is (server-authoritative)
- **`OrderDetailResponse.customerId` / `restaurantId`**: Internal IDs; not displayed to customer

## Generated Services Involved

| Service | Methods Used | Library |
|---------|-------------|---------|
| `CustomerApiService` | `getProfile()`, `updateProfile()` | `@talabat/api-customer` |
| `AddressesApiService` | `addAddress()`, `setDefaultAddress()`, `removeAddress()` | `@talabat/api-customer` |
| `OrdersApiService` | `getOrders()`, `getOrderDetails()` | `@talabat/api-customer` |

# Feature Specification: Account, Addresses, and Orders (Phase 10)

**Feature Path**: `specs/004-account-addresses-orders`
**Target Module**: `projects/customer`
**Status**: Draft
**Created**: 2026-08-07

**Input**: Phase 10 — Complete the supported customer account and post-order experience: profile viewing/editing, address management (add, set default, remove), order history, and order detail.

---

## User Scenarios & Testing

### User Story 1 — View and Edit Profile (Priority: P1)

An authenticated customer navigates to their profile page and sees their current account information (full name, age, phone number). They can enter edit mode, change the editable fields, and save their changes. The profile reflects the update immediately.

**Why this priority**: Profile viewing and editing is the cornerstone of self-service account management. Every subsequent address and order feature depends on the customer having a profile. An editable profile completes the account lifecycle started by onboarding in Phase 7.

**Independent Test**: Can be tested by navigating to `/profile`, verifying displayed data matches `ProfileResponse`, editing a field, saving, and confirming the updated data persists after page refresh.

**Acceptance Scenarios**:

1. **Given** an authenticated customer with a completed profile, **When** they navigate to `/profile`, **Then** the page displays their `fullName`, `age`, and `phoneNumber` (or "Not provided" if null) as read-only information.
2. **Given** the customer is viewing their profile, **When** they activate the "Edit profile" action, **Then** the profile fields become editable form controls pre-populated with their current values.
3. **Given** the customer has modified profile fields, **When** they submit the form, **Then** the system sends `CustomerApiService.updateProfile()` with the updated `UpdateProfileRequest { fullName, age, phoneNumber }`.
4. **Given** the server accepts the update, **When** the response returns, **Then** the `ProfileStore` cache is updated with the new `ProfileResponse`, the form returns to read-only view, and a visible success confirmation appears.
5. **Given** the server rejects the update with a validation error, **When** the response returns, **Then** the form remains in edit mode with all entered values preserved, and an accessible error message is displayed near the affected field or as a summary.

---

### User Story 2 — Manage Delivery Addresses (Priority: P1)

An authenticated customer can view their saved delivery addresses, add a new address, set an address as the default, and remove an address. These changes are immediately reflected in the profile address list and remain consistent with checkout's address selection.

**Why this priority**: Delivery addresses are a hard prerequisite for checkout. Without address management, customers have no way to update their delivery information after initial creation during checkout. This is co-priority with profile editing because addresses are stored within the profile aggregate.

**Independent Test**: Can be tested by navigating to the addresses section, adding an address, verifying it appears in the list, setting it as default, removing a non-default address, and confirming all changes survive a page refresh.

**Acceptance Scenarios**:

1. **Given** an authenticated customer, **When** they navigate to their addresses (within the profile section), **Then** the page displays all addresses from `ProfileResponse.addresses`, each showing `street`, `buildingNumber`, `floor` (if present), `city`, and a visual default indicator for the address where `isDefault === true`.
2. **Given** the customer has no saved addresses, **When** they view the addresses section, **Then** an empty state is displayed with an "Add address" action.
3. **Given** the customer activates "Add address", **When** the address form appears, **Then** it presents fields for `street` (required), `city` (required), `buildingNumber` (required), `floor` (optional), and a `makeDefault` checkbox.
4. **Given** the customer fills out the address form and submits, **When** `AddressesApiService.addAddress()` succeeds, **Then** the profile state is refreshed from the server, the new address appears in the list, and the form closes.
5. **Given** the customer selects "Set as default" on a non-default address, **When** `AddressesApiService.setDefaultAddress({ addressId })` succeeds, **Then** the profile state is refreshed, the newly defaulted address is visually marked, and the previous default no longer shows the indicator.
6. **Given** the customer selects "Remove" on an address, **When** a confirmation prompt appears and the customer confirms, **Then** `AddressesApiService.removeAddress({ addressId })` is called. On success (204), the profile state is refreshed and the address disappears from the list.
7. **Given** the customer cancels address removal, **When** the confirmation is dismissed, **Then** no API call is made and the address remains unchanged.

---

### User Story 3 — View Order History (Priority: P2)

An authenticated customer can view a chronological list of their past orders, showing order ID, placement date, item count, and total amount. They can navigate from any order summary to its full detail page.

**Why this priority**: Order history completes the post-order experience. Customers need to verify past transactions and reference order details. This depends on having placed at least one order (Phase 9) but is independently valuable as a read-only view.

**Independent Test**: Can be tested by navigating to `/orders`, verifying the list displays all orders from `OrdersApiService.getOrders()`, and clicking an order row navigates to `/orders/:orderId`.

**Acceptance Scenarios**:

1. **Given** an authenticated customer with previous orders, **When** they navigate to `/orders`, **Then** the page displays a list of order summaries, each showing the `id`, `placedAt` formatted as a readable date, `itemCount`, and `total` (formatted via `MoneyPipe`).
2. **Given** the customer has no previous orders, **When** they navigate to `/orders`, **Then** an empty state is displayed with a message like "No orders yet" and a link to browse restaurants.
3. **Given** the order list is loading, **When** the customer views `/orders`, **Then** a loading indicator is visible.
4. **Given** a server error occurs while loading orders, **When** the response fails, **Then** a retryable error state is displayed.
5. **Given** the customer clicks on an order summary row, **When** the click is processed, **Then** the application navigates to `/orders/:orderId`.

---

### User Story 4 — View Order Details (Priority: P2)

An authenticated customer can view the complete details of a specific order, including delivery address snapshot, line items with quantities and prices, and the order total. This page is reload-safe and handles invalid or non-existent order IDs gracefully.

**Why this priority**: Order detail is the primary reference point for a placed order. Phase 9 already created an `OrderConfirmationPage` at `/orders/:orderId`; Phase 10 must evaluate and potentially enhance it to serve as the canonical order detail view accessible from order history, not only from post-checkout navigation.

**Independent Test**: Can be tested by navigating directly to `/orders/7` (a valid order), verifying all `OrderDetailResponse` fields are rendered, then navigating to `/orders/99999` (non-existent) and verifying a not-found state, and to `/orders/abc` (invalid) and verifying an invalid-parameter state.

**Acceptance Scenarios**:

1. **Given** a valid numeric order ID in the route, **When** the page loads, **Then** `OrdersApiService.getOrderDetails({ orderId })` is called and the page renders `id`, `placedAt`, `deliveryAddress` (street, buildingNumber, floor, city), `items` (productName, quantity, unitPrice, lineTotal), and `total`.
2. **Given** the order exists, **When** the page is refreshed, **Then** the order details are re-fetched and displayed without error.
3. **Given** an order ID that does not exist (server returns 404), **When** the page loads, **Then** a not-found state is displayed with a message like "We could not find this order for your account" and no retry button.
4. **Given** an invalid (non-numeric) order ID in the route, **When** the page loads, **Then** an invalid-parameter state is displayed with a message like "The order link is invalid" and no API call is made.
5. **Given** a network error occurs, **When** the page fails to load, **Then** a retryable error state is displayed.

---

### User Story 5 — Address Consistency with Checkout (Priority: P3)

When a customer adds, removes, or changes the default address through the profile/address management UI, the checkout address selector reflects these changes the next time the customer enters checkout.

**Why this priority**: Cross-feature consistency prevents data staleness bugs. This is lower priority because checkout already reads addresses from `ProfileStore`, so reconciliation should be mostly automatic if profile state is refreshed correctly after mutations.

**Independent Test**: Can be tested by adding a new address in the profile section, navigating to checkout, and verifying the new address appears in the checkout address selector.

**Acceptance Scenarios**:

1. **Given** the customer adds a new address via profile address management, **When** they navigate to `/checkout`, **Then** the new address is available for selection in the checkout address selector.
2. **Given** the customer sets a different default address via profile management, **When** they navigate to `/checkout`, **Then** the newly defaulted address is pre-selected.
3. **Given** the customer removes an address that was previously selected during checkout, **When** they return to `/checkout`, **Then** the removed address is no longer listed and the default (or first) remaining address is pre-selected.

---

### Edge Cases

- What happens when the customer submits a profile update and the server returns a validation error for `age` (e.g., below minimum)? The form preserves all entered values and displays the error near the age field.
- What happens when the customer tries to remove the only saved address? The address is removed, the list transitions to the empty state, and no crash occurs. Checkout guard behavior remains unchanged (the customer simply has no address to select at checkout).
- What happens when the customer tries to add a duplicate address? The server error (`DuplicateAddress` if returned) is displayed as a user-friendly message. The form preserves entered values.
- What happens when the customer navigates directly to `/orders/0` or `/orders/-1`? These are treated as invalid parameters (not positive integers) and the invalid-parameter error state is shown.
- What happens when `getOrders()` returns a list where `itemCount` is 0 for an order? The value `0` is rendered as-is; it is server-authoritative.
- What happens when the customer's session expires while editing their profile? The auth interceptor/guard infrastructure handles 401 as established by Phase 6.

## Requirements

### Functional Requirements

#### Profile

- **FR-001**: The `/profile` route MUST be guarded by `authGuard` followed by `profileGuard`.
- **FR-002**: The profile page MUST display the customer's `fullName`, `age`, and `phoneNumber` from the `ProfileStore` cache on initial load.
- **FR-003**: The profile page MUST provide an "Edit profile" action that transitions the view to an editable Signal Form pre-populated with the current profile values.
- **FR-004**: The profile edit form MUST send `CustomerApiService.updateProfile({ updateProfileRequest })` with fields `fullName` (required, non-blank), `age` (required, positive integer), and `phoneNumber` (nullable — empty string treated as null).
- **FR-005**: On successful profile update, the system MUST update the `ProfileStore` cache with the returned `ProfileResponse` and transition back to read-only view with a visible success indication.
- **FR-006**: On server validation error during profile update, the form MUST remain in edit mode with all entered values preserved, and the error MUST be displayed accessibly.
- **FR-007**: The profile page MUST prevent duplicate submission while an update is in progress (busy state on submit button).

#### Addresses

- **FR-008**: The profile page MUST display the customer's saved addresses from `ProfileResponse.addresses`, each showing `street`, `buildingNumber`, `floor` (when non-null), `city`, and a visual "Default" indicator when `isDefault === true`.
- **FR-009**: When the customer has no saved addresses, the addresses section MUST display an empty state with an "Add address" call to action.
- **FR-010**: The system MUST provide an "Add address" action that opens an address creation form. This form MUST be the same reusable address form boundary already created in Phase 9's checkout feature (`AddressFormModalComponent`), or a consolidated equivalent that both checkout and profile can consume without feature-to-feature coupling.
- **FR-011**: The address form MUST present fields matching `AddAddressRequest`: `street` (required), `city` (required), `buildingNumber` (required), `floor` (optional, sent as null when empty), and `makeDefault` (boolean checkbox).
- **FR-012**: On successful address creation (`AddressesApiService.addAddress()`), the system MUST refresh the profile state from the server so the new address appears in the list.
- **FR-013**: Each non-default address card MUST provide a "Set as default" action. Activating it MUST call `AddressesApiService.setDefaultAddress({ addressId })` and refresh the profile state from the returned `ProfileResponse` on success.
- **FR-014**: Each address card MUST provide a "Remove" action. Activating it MUST present a confirmation prompt before calling `AddressesApiService.removeAddress({ addressId })`. On success (204), the system MUST refresh the profile state.
- **FR-015**: Address removal confirmation MUST be an intentional, accessible interaction (not a single tap on a tiny icon). Cancelling confirmation MUST not trigger any API call.
- **FR-016**: After any address mutation (add, set default, remove), the `ProfileStore` MUST reconcile with the server to prevent stale address state.

#### Orders

- **FR-017**: The `/orders` route MUST be guarded by `authGuard` followed by `profileGuard`.
- **FR-018**: The order history page MUST call `OrdersApiService.getOrders()` and display a list of order summaries. Each summary MUST show `id`, `placedAt` (formatted as a readable date), `itemCount`, and `total` (formatted via `MoneyPipe`).
- **FR-019**: When the customer has no orders, the order history page MUST display an empty state with a message and a link to browse restaurants.
- **FR-020**: The order history page MUST implement loading, populated, empty, and error (with retry) states.
- **FR-021**: Each order summary MUST be a navigable link to `/orders/:orderId`.
- **FR-022**: The `/orders/:orderId` route MUST remain guarded by `authGuard` followed by `profileGuard`, exactly as established in Phase 9.
- **FR-023**: The order detail page MUST call `OrdersApiService.getOrderDetails({ orderId })` and render `id`, `placedAt`, `deliveryAddress` (street, buildingNumber, floor, city), `items` (productName, quantity, unitPrice, lineTotal), and `total`.
- **FR-024**: The order detail page MUST implement loading, populated, error (with retry for non-404), not-found (404 without retry), and invalid-parameter (non-numeric route ID without API call) states. This is the behavior already implemented in Phase 9's `OrderConfirmationPage`.

#### Pagination

- **FR-025**: The generated `OrdersApiService.getOrders()` accepts optional `page` and `pageSize` parameters, and `OrderListResponse` includes `page`, `pageSize`, and `totalCount`. The order history page MUST pass pagination parameters and render basic pagination controls (previous/next) when `totalCount` exceeds `pageSize`.
- **FR-026**: The pagination UI MUST display the current page context (e.g., "Page 1 of 3") and disable navigation controls at boundaries (first/last page).

#### Cross-Feature Consistency

- **FR-027**: Address mutations made through the profile address management MUST be reflected in the checkout address selector on subsequent navigation to `/checkout`, because both read from the same `ProfileStore` cache.
- **FR-028**: The Phase 9 `OrderConfirmationPage` MUST continue to function identically after Phase 10 changes. Phase 10 MUST NOT break the checkout → order confirmation flow.

#### Error Handling

- **FR-029**: Profile update errors MUST be handled through the established `AppError` / `AppErrorCode` infrastructure. Known codes (`InvalidCustomerProfile`) MUST produce specific user-facing messages; unknown errors MUST degrade to a generic retryable message.
- **FR-030**: Address mutation errors MUST be handled similarly. The system MUST react to typed `AppErrorCode` values when available rather than raw status codes. Server validation errors MUST preserve form values.
- **FR-031**: Order-related errors (list and detail) MUST use the same `AppError` infrastructure. A 404 on order detail MUST be treated as "order not found" (no retry). Network errors MUST be retryable.

#### Accessibility & Responsiveness

- **FR-032**: All Phase 10 pages MUST provide full keyboard accessibility, visible focus indicators, semantic HTML structure, and ARIA attributes as established in the FoodDash design system.
- **FR-033**: All pages MUST be responsive at 320px, 768px, and 1280px viewports and usable at 200% browser zoom.
- **FR-034**: All interactive elements MUST meet the 42px minimum touch target height.
- **FR-035**: Destructive actions (address removal) MUST require intentional confirmation and not be triggered by accidental interaction.
- **FR-036**: Form errors MUST be linked to their fields using `aria-invalid` and `aria-describedby`.

### Key Entities

- **ProfileResponse**: `id`, `fullName`, `age`, `phoneNumber` (nullable), `addresses` (array of `AddressDto`).
- **UpdateProfileRequest**: `fullName`, `age`, `phoneNumber` (nullable). Same fields as `CreateProfileRequest`.
- **AddressDto**: `id`, `street`, `city`, `buildingNumber`, `floor` (nullable), `isDefault`.
- **AddressResponse**: Same shape as `AddressDto`. Returned by `addAddress()`.
- **AddAddressRequest**: `street`, `city`, `buildingNumber`, `floor` (nullable), `makeDefault`.
- **OrderSummaryDto**: `id`, `restaurantId`, `total` (MoneyDto), `placedAt`, `itemCount`.
- **OrderListResponse**: `items` (array of `OrderSummaryDto`), `page`, `pageSize`, `totalCount`.
- **OrderDetailResponse**: `id`, `customerId`, `restaurantId`, `deliveryAddress` (OrderDeliveryAddressDto), `items` (array of OrderLineItemDto), `total` (MoneyDto), `placedAt`.
- **MoneyDto**: `amount`, `currency` (optional).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Customers can update their profile information and see the changes reflected within 2 seconds of server confirmation.
- **SC-002**: Customers can add, set default, and remove addresses with each operation completing in under 3 seconds and the address list accurately reflecting the change.
- **SC-003**: Order history loads and displays within 3 seconds for customers with up to 50 orders.
- **SC-004**: 100% of direct-navigation and refresh scenarios for `/orders/:orderId` render correct order details without triggering mutations.
- **SC-005**: All profile, address, and order pages render correctly at 320px, 768px, and 1280px viewports and at 200% zoom without content overflow or layout breakage.
- **SC-006**: Address changes made through profile management are reflected in checkout address selection on the next visit to `/checkout`, with 0% stale-data incidents.
- **SC-007**: Pagination controls correctly navigate between pages of order history, with accurate page context display and disabled boundary controls.

## Assumptions

- The existing `ProfileStore` (at `core/profile/profile.store.ts`) is the canonical source of profile and address state. Phase 10 will extend it with update capabilities rather than creating a separate store.
- The Phase 9 `AddressFormModalComponent` (at `features/checkout/components/address-form-modal.component.ts`) already implements a complete, accessible address form. Phase 10 must evaluate whether to move it to a shared customer-app boundary or keep it in checkout and re-open it from profile. The form currently has a hard dependency on `CheckoutStore` — this coupling must be broken for reuse.
- The Phase 9 `OrderConfirmationPage` (at `features/orders/pages/order-confirmation.page.ts`) already implements a complete order detail view with loading, error, not-found, and invalid-parameter states. Phase 10 should evaluate whether this component already serves as the canonical order detail page or needs enhancement.
- The existing `OrdersPage` (at `features/orders/pages/orders.page.ts`) is currently a static placeholder showing only "No orders yet". Phase 10 replaces it with a data-driven order history page.
- The backend does not support address editing (PUT) — only add, remove, and set-default. The specification does not include address editing.
- The `OrderSummaryDto.restaurantId` field is a numeric ID with no associated display name in the orders contract. The order history and detail pages MUST NOT attempt to resolve restaurant names from the catalog API. `restaurantId` is not displayed to the customer.
- `OrderDetailResponse.customerId` is not displayed to the customer — it is internal backend data.
- The generated `getOrders()` API accepts `page` and `pageSize` optional parameters and `OrderListResponse` includes `page`, `pageSize`, and `totalCount`, confirming server-side pagination is supported. The implementation should provide basic pagination controls.
- `AppErrorCode` already includes `InvalidCustomerProfile` but does not yet include address-specific or order-specific error codes. Those must be verified against actual backend wire responses before adding. If the backend returns `DuplicateAddress`, `AddressNotFound`, or `OrderNotFound` as `errorCode` values, corresponding `AppErrorCode` entries should be added.

## Architecture Evaluation

### Current State After Phase 9

1. **ProfileStore** (`core/profile/profile.store.ts`): Manages profile loading, caching, and state. Has `ensureLoaded()`, `retry()`, and `refreshAfterCreation()`. Does NOT have an `updateProfile()` method — this must be added for Phase 10.
2. **Profile Page** (`features/profile/pages/profile.page.ts`): Read-only display of profile data. No edit form, no address listing. Must be significantly expanded.
3. **Address Form** (`features/checkout/components/address-form-modal.component.ts`): Complete Signal Forms address creation modal. However, it has hard dependencies on both `ProfileStore` (acceptable) and `CheckoutStore` (creates feature coupling). The `this.checkoutStore.selectAddress(created.id)` call makes it checkout-specific.
4. **Address Selector** (`features/checkout/components/address-selector.component.ts`): Checkout-specific radio selector. Directly injects `CheckoutStore`. Not reusable for profile address listing.
5. **Orders Page** (`features/orders/pages/orders.page.ts`): Static placeholder with hardcoded "No orders yet" empty state. Must be replaced.
6. **Order Confirmation Page** (`features/orders/pages/order-confirmation.page.ts`): Fully functional order detail page with loading, error, not-found, and invalid-parameter states. This is already the canonical order detail view.
7. **Checkout Store** (`features/checkout/checkout.store.ts`): Reads addresses from `ProfileStore.profile()?.addresses`. Address changes flow through `ProfileStore` automatically.

### Architecture Decision: Address Form Reuse

The Phase 9 `AddressFormModalComponent` currently lives in `features/checkout/components/` and depends on `CheckoutStore.selectAddress()`. For Phase 10 to reuse it from `features/profile`, three options exist:

- **Option A**: Move the form to a neutral customer-app location (e.g., `core/` or a new `ui/` boundary) and parameterize the post-save callback. Both checkout and profile invoke it with their own callback.
- **Option B**: Keep the form in checkout and accept that profile cannot use it without feature-to-feature coupling (violates dependency rules).
- **Option C**: Create a separate address form in profile (duplicates the form — violates DRY and the Phase 9 spec's "single reusable address boundary" requirement).

**Recommendation**: Option A. Extract the address form to a neutral presentational component that accepts a callback output for post-save behavior. Checkout passes a handler that selects the address; profile passes a handler that closes the dialog. This is the smallest change that satisfies both consumers without feature coupling.

### Architecture Decision: Order Detail Page

The Phase 9 `OrderConfirmationPage` already implements the complete order detail view. Phase 10 should:
- Keep it as-is for the order detail route (already at `/orders/:orderId`).
- The order history page links to the same route.
- No new order detail page is needed.

### Unsupported Backend Capabilities (Documented Constraints)

- **No address editing**: The backend provides only `addAddress`, `removeAddress`, and `setDefaultAddress`. There is no `updateAddress` or `editAddress` endpoint.
- **No order cancellation**: No cancel endpoint exists.
- **No order status/tracking**: `OrderDetailResponse` has no `status` field. The order is implicitly "placed".
- **No restaurant display name in orders**: `OrderSummaryDto` and `OrderDetailResponse` have `restaurantId` (number) but no restaurant name. Resolving names via catalog lookup is not supported.

## Explicitly Excluded from Phase 10

- Address editing (only add/remove/set-default are supported by backend)
- Order cancellation
- Live order tracking or status timeline
- Restaurant name display in order history/detail
- Payment method management
- Delivery estimate or ETA display
- Push notifications, SMS, or email receipts
- Voucher or coupon management
- Account deletion
- Profile image/avatar
- Order re-ordering ("order again")
- Delivery app work (Phase 12)
- Phase 11 hardening work (test suites, e2e, production build auditing)

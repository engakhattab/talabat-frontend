# Feature Specification: Checkout and Order Confirmation (Phase 9)

**Feature Path**: `specs/003-checkout-order-confirmation`  
**Target Module**: `projects/customer`  
**Status**: Draft / Spec Approved  
**Date**: 2026-08-06  

---

## 1. Executive Summary & Overview

Phase 9 delivers the complete customer checkout and order confirmation experience for the Talabat Angular customer application (`projects/customer`). It bridges the server-backed cart baseline established in Phase 8 with order creation and confirmation fulfillment.

The feature enables authenticated, profiled customers with an active server cart to select a saved delivery address, review server-authoritative line items and totals, confirm payment via "Cash on Delivery", submit an order to the authoritative backend (`POST /api/me/checkout`), receive an order confirmation ID, and view a reload-safe order confirmation summary page (`GET /api/me/orders/:orderId`).

---

## 2. Clarifications

### Session 2026-08-06
- **Q**: How should the application handle customers who arrive at `/checkout` with zero saved delivery addresses? (FR-005) → **A**: Render an accessible inline address-creation dialog or bottom sheet directly within `/checkout` using `AddressesApiService.addAddress()`. The form must be designed as a single reusable address boundary for Phase 10. Upon successful address creation, reconcile profile address state, automatically select the newly created address, and keep the user on the checkout journey without full Phase 10 management UI (deletion, default toggling, or profile editing).
- **Q**: How do the generated address models and required fields reconcile with contract evidence? → **A**: The address request model `AddAddressRequest` requires `street` (string), `city` (string), `buildingNumber` (string), and `makeDefault` (boolean), with optional `floor` (string | null). `AddressResponse` returns `id`, `street`, `city`, `buildingNumber`, `floor`, and `isDefault`. The non-existent `district` field is removed, `building` is replaced by `buildingNumber`, and `isDefault` on creation request is `makeDefault`.
- **Q**: How does `OrderDetailResponse` reconcile with the checked-in OpenAPI contract? → **A**: `OrderDetailResponse` consists of `id` (number), `customerId` (number), `restaurantId` (number), `deliveryAddress` (`OrderDeliveryAddressDto`: `street`, `city`, `buildingNumber`, `floor`), `items` (`OrderLineItemDto`: `productName`, `unitPrice`, `quantity`, `lineTotal`), `total` (`MoneyDto`), and `placedAt` (ISO 8601 string). Non-existent API fields (`status`, `restaurantName`, `createdAt`, `district`, `building`, `productId`) are removed from specification descriptions.
- **Q**: How is the HTTP 422 `CheckoutUnavailableResponse` payload preserved in `@talabat/core-http`? → **A**: `AppError` in `@talabat/core-http` captures `rawError?: unknown`. When `POST /api/me/checkout` returns HTTP 422, `problemDetailsInterceptor` sets `status: 422` and attaches the `CheckoutUnavailableResponse` payload to `AppError.rawError`, allowing `CheckoutStore` to access `unavailableItems` for user-facing cart recovery without losing context or bypassing error pipeline rules.

---

## 3. User Stories & User Value

### User Story 1 — Checkout Summary & Address Selection
**As an** authenticated customer with items in my cart,  
**I want to** review my delivery address and order summary before placing an order,  
**So that** I am confident my food will be delivered to the correct location for the expected price.

#### Acceptance Criteria:
- Navigating to `/checkout` displays the customer's saved delivery addresses (highlighting the default address).
- Displays the server-authoritative line items, quantities, subtotal, delivery fee, and grand total from the active cart.
- Displays "Cash on Delivery" as the selected payment method.
- Provides a clear "Place Order" submit button.

---

### User Story 2 — Order Submission & Duplicate Prevention
**As a** customer placing an order,  
**I want** my order submission to be processed reliably without accidental duplicate charges or orders,  
**So that** I don't submit multiple orders if I click the submit button rapidly or experience network lag.

#### Acceptance Criteria:
- Clicking "Place Order" locks the submit button, enters a busy/loading state, and prevents subsequent clicks.
- Sends the selected `deliveryAddressId` to the server checkout endpoint.
- Upon successful order creation (`201 Created` containing `{ orderId }`), clears the in-memory cart state immediately.
- Navigates the customer automatically to `/orders/:orderId`.

---

### User Story 3 — Order Confirmation View & Reload Safety
**As a** customer who just placed an order,  
**I want to** see a clear order confirmation page with my order number and order details,  
**So that** I have proof of purchase and can refer back to it even if I refresh the page.

#### Acceptance Criteria:
- Navigating to or refreshing `/orders/:orderId` fetches the authoritative order details from the server (`GET /api/me/orders/:orderId`).
- Displays the Order ID (`id`), placement timestamp (`placedAt`), delivery address snapshot (`street`, `buildingNumber`, `city`, `floor`), line items (`productName`, `quantity`, `unitPrice`, `lineTotal`), and grand total (`total`).
- Browser refresh or direct bookmark access to `/orders/:orderId` safely renders the order details without re-triggering order submission.

---

### User Story 4 — Address Gaps, Unavailable Items, & Recovery
**As a** customer encountering an issue during checkout (e.g. no saved address or an item becoming unavailable),  
**I want** clear feedback and guidance on how to fix the problem,  
**So that** I can complete my order without losing my context.

#### Acceptance Criteria:
- If the customer has no saved delivery addresses, checkout presents a prominent "Add Address" prompt triggering an inline address-creation modal using `AddressesApiService.addAddress()`.
- If order submission returns an unavailable item response (HTTP 422 `CheckoutUnavailableResponse`), checkout displays a domain error banner listing the affected unavailable items, reloads server cart state, and returns the customer to `/cart` to review their updated cart.
- Handles network interruptions or server errors with a retryable error message.

---

## 3. Route Prerequisites & Navigation Rules

| Route | Guard / Protection | Prerequisite | Unmet Action |
|---|---|---|---|
| `/checkout` | `authGuard`, `profileGuard` | Customer authenticated, profile completed, active server cart contains >= 1 item | Redirect to `/cart` if cart is empty/null |
| `/orders/:orderId` | `authGuard`, `profileGuard` | Customer authenticated, valid numeric `orderId` parameter | Render order details or 404 error if order not found |

---

## 4. Functional Requirements (FR-001 – FR-016)

- **FR-001 (Route Guards)**: The `/checkout` route MUST be protected by `authGuard` and `profileGuard`. Anonymous users MUST be redirected to authentication; users without a profile MUST be redirected to onboarding.
- **FR-002 (Active Cart Gate)**: Accessing `/checkout` with an empty or null server cart MUST automatically redirect the user to `/cart` with an informative message.
- **FR-003 (Server Price & Item Authority)**: The checkout page MUST display line items, quantities, unit prices, and grand totals directly from the server-backed cart state without performing client-side price calculation.
- **FR-004 (Delivery Address Selection)**: The checkout page MUST render all saved delivery addresses associated with the customer profile, pre-selecting the default address if available. The customer MUST be able to select any of their saved addresses.
- **FR-005 (Missing Address Inline Dialog)**: If a customer has zero saved delivery addresses, checkout MUST present an accessible inline address-creation dialog or bottom sheet using `AddressesApiService.addAddress()`. The form controls MUST match `AddAddressRequest`: `street` (required), `city` (required), `buildingNumber` (required), `floor` (optional), and `makeDefault` (boolean). The form MUST preserve entered field values on server error, prevent duplicate submissions, manage focus traps, and upon successful creation, refresh profile state, select the new address automatically, and keep the user on `/checkout`. Full Phase 10 address management (listing, deletion, default switching) MUST remain excluded.
- **FR-006 (Payment Method Display)**: Checkout MUST display "Cash on Delivery" as the default and sole supported payment method.
- **FR-007 (Order Submission Contract)**: Order submission MUST invoke `CheckoutApiService.checkout()` passing the selected `deliveryAddressId`.
- **FR-008 (Duplicate Submission Lock)**: During order submission, the submission trigger MUST disable all interactive controls, set `aria-busy="true"`, and present a visual loading indicator to prevent duplicate submissions.
- **FR-009 (Cart Reset on Success)**: Upon successful order creation response (containing `orderId`), the system MUST immediately reset the client cart state to empty and navigate to `/orders/:orderId`.
- **FR-010 (Order Confirmation Display)**: The `/orders/:orderId` page MUST fetch order details via `OrdersApiService.getOrderDetails({ orderId })` and render details matching `OrderDetailResponse`:
  - Order ID (`id`) & placement timestamp (`placedAt`)
  - Delivery address snapshot (`street`, `buildingNumber`, `city`, `floor`)
  - Ordered line items (`productName`, `quantity`, `unitPrice`, `lineTotal`)
  - Grand total amount and currency (`total`)
  - Payment method ("Cash on Delivery")
- **FR-011 (Reload & Deep-Link Safety)**: Navigating directly to `/orders/:orderId` or refreshing the page MUST safely fetch and render order details via HTTP GET without re-executing order submission.
- **FR-012 (Unavailable Item Recovery)**: If order submission fails with HTTP 422 `CheckoutUnavailableResponse`, the application MUST extract unavailable items from `AppError.rawError`, present an error notification detailing unavailable items, reload the server cart state (`CartStore.loadCart()`), and redirect the customer to `/cart` to review their updated cart.
- **FR-013 (Typed Domain Error Infrastructure)**: All HTTP errors during checkout submission or order detail retrieval MUST be processed through `@talabat/core-http` `AppErrorCode` mapping, preserving `rawError` when present, and presented with actionable user recovery messages.
- **FR-014 (Accessibility & ARIA)**: All checkout components MUST provide full keyboard accessibility, visible focus rings (`--tal-focus-ring`), ARIA live announcements (`role="status"`, `role="alert"`), and proper heading hierarchy.
- **FR-015 (Responsive Viewport Support)**: The checkout summary and order confirmation pages MUST adapt seamlessly across mobile (320px), tablet (768px), and desktop (1280px+) viewports, supporting 200% browser zoom without layout overlap.
- **FR-016 (Touch Target Sizing)**: All buttons, address radio controls, and interactive elements MUST adhere to a minimum 42px touch target height.

---

## 5. Success Criteria (SC-001 – SC-006)

- **SC-001 (Authoritative Accuracy)**: 100% match between checkout summary totals, submitted order payload, and order confirmation totals.
- **SC-002 (Zero Duplicate Submissions)**: 0% duplicate order creation rate under rapid button clicks or simulated network delays up to 5 seconds.
- **SC-003 (State Synchronization)**: 100% synchronization of cart badge clearing and header state immediately following order creation.
- **SC-004 (Reload Safety)**: 100% successful page reloads on `/orders/:orderId` without triggering post/mutation side-effects.
- **SC-005 (Submission Latency)**: Sub-3-second end-to-end user experience from clicking "Place Order" to viewing the order confirmation summary.
- **SC-006 (Accessibility Compliance)**: 100% compliance with WCAG 2.1 AA keyboard navigation, focus trap, visible focus, and ARIA announcement standards.

---

## 6. Resolved Product & Scope Decisions

1. **Address Selection Behavior**:
   - Customers with multiple saved addresses can choose which address to use for delivery.
   - If the customer has only one address, it is selected by default.
   - If the customer has no saved addresses, an inline warning prompts them to create an address before proceeding.

2. **Payment Method Scope**:
   - Cash on Delivery (COD) is the single authoritative payment method supported in Phase 9.

3. **Order Confirmation Persistence**:
   - Order confirmation relies strictly on standard backend endpoints (`GET /api/me/orders/:orderId`). No temporary client-only state or localStorage cache is required for rendering order confirmation.

---

## 7. Explicit Exclusions

The following features are **strictly out of scope** for Phase 9:
- Online payment gateway integration (Stripe, PayPal, credit card inputs).
- Payment pre-authorization or tokenization.
- Delivery tipping / gratuity customization.
- Real-time GPS driver tracking or animated map routes.
- Delivery ETA countdown timers.
- Push notifications, SMS alerts, or email receipts.
- Voucher, promo code, or discount coupon input fields.
- PDF receipt generation or download.
- Order cancellation or order modification post-submission.
- Order history listing, pagination, or past order filtering (reserved for Phase 10).

---

## 8. Manual Acceptance Scenarios

### Scenario A — Standard Checkout & Confirmation
1. Authenticated user with items in cart navigates to `/checkout`.
2. Verifies delivery address and order items summary.
3. Clicks "Place Order".
4. Verifies submit button enters loading state.
5. System redirects to `/orders/:orderId`.
6. Verifies order number, delivery address, items, and total on confirmation page.
7. Verifies header cart badge count is reset to 0.

### Scenario B — Browser Refresh on Order Confirmation
1. User is on `/orders/123`.
2. Refreshes the browser page.
3. System loads and displays order #123 details without throwing errors or re-submitting an order.

### Scenario C — Checkout with Unavailable Items
1. User attempts to checkout with an item that has become unavailable on the backend.
2. Server returns `CheckoutUnavailableResponse`.
3. Application displays error banner identifying unavailable items and redirects user to `/cart` to review items.

# Implementation Plan: Checkout and Order Confirmation (Phase 9)

**Branch**: `003-checkout-order-confirmation` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

---

## 1. Summary & Reconciled Scope

Phase 9 implements customer checkout and order confirmation for the Talabat Angular application (`projects/customer`). It connects the server-backed cart baseline (`CartStore`) with order creation (`CheckoutApiService.checkout()`) and confirmation details (`OrdersApiService.getOrderDetails()`).

### Verified Contract Mapping
- **Order Submission**: `POST /api/me/checkout` taking `CheckoutRequest` `{ deliveryAddressId: number }` returning `201 Created` (`CheckoutSuccessResponse`: `{ orderId: number }`) or `422 Unprocessable Entity` (`CheckoutUnavailableResponse`: `{ status?: string, unavailableItems?: Array<UnavailableItemDto> }`).
- **Order Details**: `GET /api/me/orders/{orderId}` returning `200 OK` (`OrderDetailResponse`: `id`, `customerId`, `restaurantId`, `deliveryAddress`, `items`, `total`, `placedAt`).
- **Inline Address Creation**: `POST /api/me/addresses` taking `AddAddressRequest` (`street`, `city`, `buildingNumber`, `floor`, `makeDefault`) returning `201 Created` (`AddressResponse`: `id`, `street`, `city`, `buildingNumber`, `floor`, `isDefault`).

---

## 2. Technical Architecture & 422 Payload Strategy

### 422 Payload Architecture
To preserve typed `CheckoutUnavailableResponse` data without modifying generated API services or bypassing `@talabat/core-http`:
1. `AppError` in `@talabat/core-http` (`projects/core-http/src/lib/app-error.ts`) is updated to include `readonly rawError?: unknown`.
2. `problemDetailsInterceptor` in `@talabat/core-http` attaches `rawError: e.error` when mapping `HttpErrorResponse` to `AppError`.
3. When `POST /api/me/checkout` returns HTTP status 422, `CheckoutStore` receives an `AppError` with `status: 422` and reads `appError.rawError as CheckoutUnavailableResponse`.
4. `CheckoutStore` extracts `unavailableItems`, updates store state, calls `CartStore.loadCart()`, and navigates user to `/cart` with an informative toast notice.

### Component & Routing Architecture
- **`checkoutGuard`** (`projects/customer/src/app/core/guards/checkout.guard.ts`): Guarantees user is authenticated (`authGuard`), profile exists (`profileGuard`), and `CartStore.isEmpty() === false`. Empty carts redirect to `/cart`.
- **`CheckoutStore`** (`projects/customer/src/app/features/checkout/checkout.store.ts`): Signal-based root/feature store managing address selection, submission lock (`isSubmitting`), order creation outcome (`orderId`), and HTTP 422 recovery.
- **`CheckoutPage`** (`projects/customer/src/app/features/checkout/pages/checkout.page.ts`): Route component at `/checkout` rendering address selector, order summary, and submit trigger.
- **`AddressFormModalComponent`** (`projects/customer/src/app/features/checkout/components/address-form-modal.component.ts`): Inline dialog using `AddressesApiService.addAddress()`. Upon 201 Created, calls `ProfileStore.refreshAfterCreation()`, auto-selects address, and closes modal.
- **`OrderConfirmationPage`** (`projects/customer/src/app/features/orders/pages/order-confirmation.page.ts`): Route component at `/orders/:orderId` performing idempotent HTTP GET `OrdersApiService.getOrderDetails({ orderId })`.

---

## 3. Constitution & Governance Alignment

- **Immutable Generated API Services**: 100% compliant. Code uses generated `CheckoutApiService`, `OrdersApiService`, `AddressesApiService` directly without modifying generated files.
- **No Direct HttpClient in Features**: 100% compliant. Features communicate exclusively through generated API services.
- **Native Zoneless Signals**: 100% compliant. All state managed with Angular v20+ Signals (`signal()`, `computed()`).
- **Server Price Authority**: 100% compliant. Totals and line items rendered strictly from server models.
- **Zero Automatic Retries on Ambiguous Error**: 100% compliant. Network drops prompt manual order history review via a retryable modal.

---

## 4. Requirement Traceability Matrix

| Requirement | Implementation Component | Contract / API Method | Verification Strategy |
|---|---|---|---|
| **FR-001** | `checkoutGuard` | `authGuard`, `profileGuard` | Unit test in `checkout.guard.spec.ts` |
| **FR-002** | `checkoutGuard` | `CartStore.isEmpty()` | Unit test verifying empty cart redirect |
| **FR-003** | `CheckoutSummaryComponent` | `CartStore.cart()` | Component spec verifying server totals |
| **FR-004** | `AddressSelectorComponent` | `ProfileStore.profile()` | Component spec verifying radio selection |
| **FR-005** | `AddressFormModalComponent` | `AddressesApiService.addAddress()` | Component spec testing form submission & profile refresh |
| **FR-006** | `CheckoutSummaryComponent` | COD static badge | Component spec verifying badge rendering |
| **FR-007** | `CheckoutStore` | `CheckoutApiService.checkout()` | Store spec verifying request payload passing |
| **FR-008** | `CheckoutPage` | `isSubmitting` signal | Page spec verifying button disabling & ARIA busy |
| **FR-009** | `CheckoutStore` | `CartStore.applyEmptyCart()` | Store spec verifying cart reset on HTTP 201 |
| **FR-010** | `OrderConfirmationPage` | `OrdersApiService.getOrderDetails()` | Page spec verifying details rendering |
| **FR-011** | `OrderConfirmationPage` | `GET /api/me/orders/:orderId` | Spec proving GET idempotency & reload safety |
| **FR-012** | `CheckoutStore` | `CheckoutUnavailableResponse` | Store spec verifying 422 rawError parsing & redirect |
| **FR-013** | `@talabat/core-http` | `problemDetailsInterceptor` | Core-http spec verifying `rawError` preservation |
| **FR-014** | All UI Components | WCAG 2.1 AA | Focus ring, ARIA live, and keyboard audit |
| **FR-015** | All UI Components | CSS Grid / Flexbox | Viewport testing (320px–1280px+) |
| **FR-016** | Interactive elements | CSS `--tal-touch-target-min` | Minimum 42px touch target verification |

---

## 5. Next Steps

Regenerate `tasks.md` via `/speckit-tasks` to reconcile all executable task descriptions with the updated plan and contracts.

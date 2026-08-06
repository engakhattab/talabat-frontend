# Technical Research: Checkout and Order Confirmation (Phase 9)

## 1. Reconciled Technical Context & Contract Evidence

### 1.1 Baseline System Architecture & Dependencies
- **Target Application**: Customer Web Application (`projects/customer`) in Angular v20+ (Zoneless native Signals runtime).
- **State Management Architecture**: Signal-based store pattern (`signal()`, `computed()`, `effect()`).
- **Core Guard Stack**:
  - `authGuard`: Enforces OIDC session authentication.
  - `profileGuard`: Guarantees customer profile exists (handles `ProfileNotCreated` -> `/onboarding` redirect).
- **HTTP Interceptor Layer**:
  - `@talabat/core-http`: Transforms `HttpErrorResponse` into structured `AppError` objects.
  - `problemDetailsInterceptor`: Standardizes HTTP errors while capturing `rawError?: unknown` to preserve non-ProblemDetails wire payloads (such as HTTP 422 `CheckoutUnavailableResponse`).

### 1.2 Reconciled Generated API Services & Wire Models
- **`CheckoutApiService`**:
  - Endpoint: `POST /api/me/checkout`
  - Method: `checkout(requestParameters: { checkoutRequest: CheckoutRequest }): Observable<CheckoutSuccessResponse>`
  - Request Body (`CheckoutRequest`): `{ deliveryAddressId: number }`
  - Success Response (`CheckoutSuccessResponse`): `{ orderId: number, status?: string }` (HTTP 201 Created)
  - Unavailable Response (`CheckoutUnavailableResponse`): `{ status?: string, unavailableItems?: Array<UnavailableItemDto> }` (HTTP 422 Unprocessable Entity)
  - `UnavailableItemDto`: `{ productId: number, productName: string, reason: string }`
- **`OrdersApiService`**:
  - Endpoint: `GET /api/me/orders/{orderId}`
  - Method: `getOrderDetails(requestParameters: { orderId: number }): Observable<OrderDetailResponse>`
  - Response (`OrderDetailResponse`): `{ id: number, customerId: number, restaurantId: number, deliveryAddress: OrderDeliveryAddressDto, items: Array<OrderLineItemDto>, total: MoneyDto, placedAt: string }`
  - `OrderDeliveryAddressDto`: `{ street: string, city: string, buildingNumber: string, floor: string | null }`
  - `OrderLineItemDto`: `{ productName: string, unitPrice: MoneyDto, quantity: number, lineTotal: MoneyDto }`
- **`AddressesApiService`**:
  - Endpoint: `POST /api/me/addresses`
  - Method: `addAddress(requestParameters: { addAddressRequest: AddAddressRequest }): Observable<AddressResponse>`
  - Request Body (`AddAddressRequest`): `{ street: string, city: string, buildingNumber: string, floor: string | null, makeDefault: boolean }`
  - Response (`AddressResponse`): `{ id: number, street: string, city: string, buildingNumber: string, floor: string | null, isDefault: boolean }`

---

## 2. Research Decisions & Architectural Rationale

### Rationale 1: HTTP 422 Payload Preservation via `AppError.rawError`
- **Decision**: Update `AppError` in `@talabat/core-http` to include `readonly rawError?: unknown`.
- **Implementation**:
  - In `problem-details.interceptor.ts`, set `rawError: e.error` when transforming `HttpErrorResponse` into `AppError`.
  - When `POST /api/me/checkout` fails with HTTP status 422, `CheckoutStore` receives `AppError` (`status: 422`) and inspects `appError.rawError as CheckoutUnavailableResponse`.
  - Extracts `unavailableItems` (`productId`, `productName`, `reason`), sets `notice` state, triggers `CartStore.loadCart()` to refresh cart, and redirects user to `/cart`.
- **Alternatives Considered & Rejected**:
  - *Bypassing `core-http` interceptor in `CheckoutApiService`*: Rejected because it breaks global HTTP error handling conventions and requires custom HttpClient calls.
  - *Casting in components directly*: Rejected because components must remain decoupled from raw HTTP error instances.

### Rationale 2: Reconciled `OrderDetailResponse` Rendering & Absent Fields
- **Decision**: Render order confirmation details directly from real `OrderDetailResponse` properties.
- **Implementation**:
  - Order ID: `order.id`
  - Placement Time: `order.placedAt`
  - Delivery Address Snapshot: `order.deliveryAddress.street`, `order.deliveryAddress.buildingNumber`, `order.deliveryAddress.city`, `order.deliveryAddress.floor`
  - Line Items: `order.items` (`item.productName`, `item.quantity`, `item.unitPrice`, `item.lineTotal`)
  - Grand Total: `order.total` (`amount`, `currency`)
  - Payment Method: "Cash on Delivery"
  - *Absent fields*: `status`, `restaurantName`, `createdAt`, `district`, `building`, `productId` are absent from `OrderDetailResponse`. The confirmation UI strictly renders existing properties without inventing client fallback text.

### Rationale 3: Reconciled Address Form Model (`AddAddressRequest`)
- **Decision**: Build `AddressFormModalComponent` matching exact `AddAddressRequest` schema.
- **Form Controls**:
  - `street` (required string, min 3 chars)
  - `city` (required string, min 2 chars)
  - `buildingNumber` (required string, min 1 char)
  - `floor` (optional string | null)
  - `makeDefault` (required boolean, defaults to `true` when adding during checkout)
- **Reconciliation Effect**:
  - Upon successful creation, triggers `ProfileStore.refreshAfterCreation()`, automatically selects `response.id`, closes modal, and keeps user on `/checkout`.

### Rationale 4: Reload-Safe Order Confirmation
- **Decision**: `/orders/:orderId` performs an idempotent HTTP GET read request (`GET /api/me/orders/:orderId`).
- **Implementation**:
  - Pure read operation via `OrdersApiService.getOrderDetails({ orderId })`.
  - Reloading browser (F5) or bookmarking `/orders/1042` re-executes GET safely with 0 side effects and 0 risk of duplicate order creation.

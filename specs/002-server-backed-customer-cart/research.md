# Phase 0 Research: Server-Backed Customer Cart

**Feature Branch**: `002-server-backed-customer-cart`  
**Date**: 2026-08-06  
**Spec**: [spec.md](./spec.md)

---

## Technical Context & Decisions

### 1. State Management Architecture (`CartStore`)

- **Decision**: Implement a root-provided Angular Signal-based state store (`CartStore`) located in `projects/customer/src/app/features/cart/cart.store.ts`.
- **Rationale**: The cart state is consumed globally across multiple layout components (`HeaderComponent` badge, `CartEntryBarComponent` FAB) and feature pages (`RestaurantMenuPage`, `CartPage`). Under Constitution Principle III (One-Way Dependency Hierarchy), domain state for the customer app belongs in the customer app. Providing `CartStore` at the root (`providedIn: 'root'`) allows cross-component state sharing without introducing circular feature dependencies or violating library boundaries.
- **Alternatives Considered**:
  - *NgRx / SignalStore / Akita*: Rejected because Constitution Principle V explicitly prohibits introducing external state management libraries without a formal constitution amendment.
  - *RxJS `BehaviorSubject`*: Rejected because Constitution Principle V prohibits `BehaviorSubject`/RxJS for component-local and feature state in Angular 22.
  - *Component-local state only*: Rejected because cart badge in the header and menu page "Add to Cart" interactions require a synchronized, app-wide reactive state stream.

---

### 2. Server Data Authority & Price Computation

- **Decision**: Treat `CartResponse` and `CartLineItemDto` as the sole authoritative source of prices, line totals, and grand totals (`total.amount`). The frontend `CartStore` MUST NOT perform client-side sum calculations or override prices.
- **Rationale**: Constitution Principle I (Authoritative Backend & Data Ownership) strictly mandates that all business logic, domain invariants, pricing calculations, cart/order totals, and profile states live on the backend. Client-authoritative pricing or recalculations are non-compliant.
- **Alternatives Considered**:
  - *Client-side optimistic pricing calculation*: Rejected because prices, taxes, discounts, or stock adjustments must be enforced server-side. Local estimates create price mismatch vulnerabilities.

---

### 3. Empty Cart HTTP Semantics & 204 Handling

- **Decision**: Handle `GET /api/me/cart` returning `200 OK` with `status: "Empty"` and `items: []` as the valid empty cart state representation. Handle `DELETE /api/me/cart` returning `204 No Content` by resetting `CartStore` state to `empty` (`items: []`, `status: 'Empty'`, `totalItemCount: 0`).
- **Rationale**: Backend investigation of `GetCartHandler.cs` (lines 34–37) confirms that a customer with no active cart receives a `200 OK` response with `CartDetails.Empty()`, not a `404 Not Found`. `ClearCart` endpoint returns `204 No Content`, which emits an `Observable<void>` without a response body.
- **Alternatives Considered**:
  - *Treating empty cart as 404 error*: Rejected because backend `CartController` explicitly returns `200 OK` for empty carts.
  - *Expecting a JSON body on 204*: Rejected because HTTP 204 spec and generated OpenAPI client define `Observable<void>` for `clearCart`.

---

### 4. Typed Error Handling & `AppErrorCode` Expansion

- **Decision**: Expand `AppErrorCode` in `projects/core-http/src/lib/app-error.ts` to include cart domain error codes: `CrossRestaurantCart`, `CartExpired`, `CartNotActive`, `CartItemNotFound`, `ProductUnavailable`, `RestaurantClosed`, `RestaurantInactive`, and `InvalidQuantity`.
- **Rationale**: `problemDetailsInterceptor` maps RFC 9457 `ProblemDetails.errorCode` extension strings into `AppError.code` only if the key exists in `AppErrorCode`. Adding these codes allows feature components and `CartStore` to branch on typed error codes rather than raw status codes or backend message strings (Constitution Principle VII).
- **Alternatives Considered**:
  - *Branching on HTTP status codes (409, 422)*: Rejected because multiple distinct domain errors share status codes (e.g. 409 for `CrossRestaurantCart` and `CartExpired`).
  - *Parsing raw backend error strings*: Rejected because string matching is brittle and breaks localization/maintenance.

---

### 5. Single-Restaurant Constraint & Resolution Interaction

- **Decision**: When adding an item returns `409 Conflict` with `code: 'CrossRestaurantCart'`, `CartStore` exposes a conflict event or the UI presents `CrossRestaurantDialogComponent` (a CDK overlay modal). The modal offers two explicit choices:
  1. *"Clear Cart & Add New Item"*: Calls `CartApiService.clearCart()` followed by `CartApiService.addCartItem()`.
  2. *"Keep Current Cart"*: Cancels the pending addition and retains existing cart items.
- **Rationale**: Enforces single-restaurant backend domain rules while granting the user clear, non-destructive control over their basket state. Uses CDK Overlay for accessible focus containment and escape key dismissal (Constitution Principle VIII).
- **Alternatives Considered**:
  - *Implicitly clearing cart without prompt*: Rejected because silent data loss frustrates users.
  - *Blocking addition with a static error toast*: Rejected because it leaves the user stranded without an actionable resolution path.

---

### 6. Mutation Concurrency & Request Serialization

- **Decision**: Serialize all cart mutation requests in `CartStore` using an internal operation queue (or rx-interop pipeline lock) and disable interactive controls (`[busy]="isPending"`) during pending HTTP requests.
- **Rationale**: Rapid consecutive user taps (e.g., clicking `+` three times fast) can trigger concurrent asynchronous HTTP requests. If network latency varies, a response from an earlier request could arrive after a later request, corrupting the cart state.
- **Alternatives Considered**:
  - *Unserialized concurrent HTTP calls*: Rejected because out-of-order responses corrupt server-synchronized client state.
  - *Debouncing quantity clicks client-side*: Rejected because immediate UI feedback with locked controls provides better visual responsiveness and prevents race conditions.

---

### 7. Accessibility & Responsive Touch Boundaries

- **Decision**: Implement all interactive cart controls with:
  - Minimum touch target size of **42px** (Constitution Principle VIII).
  - ARIA attributes: `aria-label="Increase quantity of [Product Name]"`, `aria-label="Decrease quantity of [Product Name]"`, `aria-label="Remove [Product Name] from cart"`.
  - Visible focus indicators (`focus-visible:ring-2 focus-visible:ring-food-primary`).
  - Safe-area inset handling (`pb-[max(0.5rem,env(safe-area-inset-bottom))]`) for persistent cart FAB on mobile thumb zone.
  - Responsive container rendering cleanly at 320px, 768px, 1280px and 200% browser zoom.
- **Rationale**: Mandatory compliance with Constitution Principle VIII (FoodDash Design System & Accessibility).

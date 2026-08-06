# Feature Specification: Server-Backed Customer Cart

**Feature Branch**: `002-server-backed-customer-cart`

**Created**: 2026-08-06

**Status**: Draft


**Input**: User description: "Server-Backed Customer Cart"

## Clarifications

### Session 2026-08-06

- **Q: What HTTP status and payload does GET /api/me/cart return when a customer has no active cart?** → **A: The server returns `200 OK` with a valid `CartResponse` containing `id: null`, `restaurantId: null`, `status: "Empty"`, `items: []`, and `calculatedCurrentTotal: { amount: 0, currency: "EGP" }`. It does NOT return 404 for an empty cart.**
- **Q: How are 204 No Content responses from ClearCart handled by the frontend state?** → **A: `DELETE /api/me/cart` returns 204 No Content on success. Upon 204 completion, the frontend state sets the active cart to the empty state (`items: []`, count: 0, status: "Empty") without expecting a response body.**
- **Q: How does the application handle backend domain error codes for cart operations?** → **A: Problem Details extension `errorCode` values are mapped to typed application errors (`CrossRestaurantCart`, `CartExpired`, `CartNotActive`, `ProductUnavailable`, `RestaurantClosed`, `RestaurantInactive`, `InvalidQuantity`, `CartItemNotFound`). Feature components branch on these codes to present actionable user recovery.**
- **Q: What is the exact single-restaurant conflict resolution flow?** → **A: Adding an item from Restaurant B when Cart contains Restaurant A items returns a 409 Conflict with `errorCode: "CrossRestaurantCart"`. The UI presents a modal prompt with two explicit choices: "Clear Cart & Add New Item" (issues `DELETE /api/me/cart` then `POST /api/me/cart/items`) or "Keep Current Cart" (cancels addition).**
- **Q: How are quantity changes, item removals, and destructive clearing confirmed?** → **A: Increment (+) and decrement (-) controls update quantities directly. Decrementing from 1 or clicking remove calls `DELETE /api/me/cart/items/{productId}`. The destructive "Clear Cart" button triggers an accessible CDK overlay confirmation prompt before calling `DELETE /api/me/cart`.**


## User Scenarios & Testing *(mandatory)*

### User Story 1 - Viewing Server-Authoritative Cart & Badge Synchronization (Priority: P1)

As an authenticated customer with an active customer profile,
I want to view my current cart contents, total price, and item count seamlessly across the customer application,
So that I always have a clear, accurate, and synchronized understanding of my order before proceeding to checkout.

**Why this priority**: Cart visibility and accurate badge state form the primary feedback loop for all purchasing decisions. Customers must trust that the item counts and authoritative pricing shown in the shell header/badge and on the dedicated cart page strictly reflect server data without discrepancy.

**Independent Test**: Can be fully tested by authenticating as a customer, navigating the application shell and menu pages with an existing server cart, and verifying that the persistent cart badge and dedicated cart page accurately render server-calculated line totals, item counts, and grand totals across initial loads and reloads.

**Acceptance Scenarios**:

1. **Given** an authenticated customer with 3 items in their active server cart, **When** they view any page within the customer shell (e.g., catalog, profile), **Then** the persistent cart badge displays an item count of 3.
2. **Given** an authenticated customer navigating to the `/cart` page, **When** the page loads, **Then** it presents the full list of cart items, product names, unit prices, quantities, line totals, and the authoritative grand total provided directly by the server.
3. **Given** an authenticated customer with no active items in their cart (or no prior cart created), **When** they navigate to the `/cart` page, **Then** the system displays an accessible empty cart state with a clear call-to-action to browse available restaurants.
4. **Given** an authenticated customer who refreshes the browser while on the `/cart` page, **When** the page re-hydrates, **Then** the cart state and badge are revalidated against the server and correctly displayed without showing stale or cached local estimates.

---

### User Story 2 - Adding Products from Restaurant Menu & Enforcing Single-Restaurant Constraint (Priority: P1)

As an authenticated customer browsing a restaurant's menu,
I want to add available menu items to my cart and receive immediate feedback, including clear guidance if I attempt to add items from a different restaurant,
So that I can build my meal without invalidating vendor delivery constraints or losing my existing selection accidentally.

**Why this priority**: Adding items is the essential gateway to order creation. The single-restaurant constraint is a non-negotiable server domain rule that requires explicit user choice (clear existing cart or cancel) to prevent broken orders.

**Independent Test**: Can be tested independently by adding available items from a single restaurant to a cart, confirming the cart badge updates, and attempting to add an item from a secondary restaurant to trigger and resolve the cross-restaurant decision dialog.

**Acceptance Scenarios**:

1. **Given** an authenticated customer viewing a restaurant menu, **When** they select an available product to add to their cart, **Then** the system sends the request to the server, updates the cart badge count immediately upon confirmation, and displays a temporary success indication on the item card.
2. **Given** an item marked as unavailable by the restaurant, **When** the customer views the item on the menu, **Then** the add action is visually and interactively disabled with accessible status text indicating unavailability.
3. **Given** a customer with active items in their cart from Restaurant A, **When** they attempt to add an item from Restaurant B, **Then** the system prevents implicit overwriting and presents a modal/sheet prompt informing them that their cart contains items from another restaurant, offering explicit options to "Clear Cart & Add New Item" or "Keep Current Cart".
4. **Given** the cross-restaurant prompt, **When** the customer chooses "Clear Cart & Add New Item", **Then** the previous cart items are replaced on the server with the new product from Restaurant B, and the cart badge reflects the new restaurant selection.
5. **Given** the cross-restaurant prompt, **When** the customer chooses "Keep Current Cart", **Then** the addition is cancelled, and the existing cart items from Restaurant A remain intact.

---

### User Story 3 - Cart Quantity Management, Item Removal & Destructive Clear Confirmation (Priority: P2)

As an authenticated customer reviewing my cart on the cart page,
I want to adjust item quantities, remove unwanted items, or clear the entire cart with explicit confirmation,
So that I can refine my order accurately and prevent accidental deletion of my chosen items.

**Why this priority**: Quantity adjustments and item removals allow customers to fine-tune their selections. Safeguarding destructive actions (clearing the cart) prevents frustration and accidental data loss on mobile and desktop viewports.

**Independent Test**: Can be tested independently on the `/cart` page by incrementing and decrementing item quantities, removing a single line item, and executing a cart-clear action through the confirmation prompt.

**Acceptance Scenarios**:

1. **Given** an item with quantity 2 in the cart, **When** the customer clicks the increment control (+), **Then** the quantity increases to 3, the server re-calculates the line total and grand total, and the UI updates with the authoritative response.
2. **Given** an item with quantity 2 in the cart, **When** the customer clicks the decrement control (-), **Then** the quantity decreases to 1, and the total prices update accordingly.
3. **Given** an item with quantity 1 in the cart, **When** the customer clicks the decrement control (-) or the remove button, **Then** the item is removed from the cart, and the cart badge count decreases accordingly.
4. **Given** a populated cart, **When** the customer selects the "Clear Cart" action, **Then** an accessible confirmation sheet/dialog appears asking them to confirm the deletion.
5. **Given** the clear cart confirmation prompt, **When** the customer confirms the action, **Then** all items are removed from the server cart, the cart transitions to the empty state, and the badge count resets to 0.

---

### User Story 4 - Handling Session Changes, Concurrency & Recoverable Failures (Priority: P3)

As an authenticated customer,
I want my cart state to recover cleanly from session logouts, network interruptions, or backend validation errors,
So that I am never left with out-of-sync cart numbers or unhandled application states.

**Why this priority**: Network fluctuations, session expiration, and concurrent backend changes must be handled gracefully to protect data integrity and prevent user confusion.

**Independent Test**: Can be tested by signing out of an active session, inducing network offline states during cart operations, or triggering backend item stock/price conflicts to verify clean resets and informative recovery messages.

**Acceptance Scenarios**:

1. **Given** an authenticated customer with items in their cart, **When** they explicitly sign out or their session expires, **Then** all in-memory cart state is cleared immediately, and the cart badge is hidden/reset to 0.
2. **Given** an active cart page open on screen, **When** a network connectivity loss occurs during a quantity update, **Then** the system presents an accessible error state with a retry option and preserves the prior server-confirmed state.
3. **Given** a customer attempting to add an item that becomes unavailable on the server concurrently, **When** the request fails with an unavailability error, **Then** the system surfaces an informative error message explaining that the item is no longer available and refetches the latest cart state.
4. **Given** rapid consecutive clicks on quantity controls for a single item, **When** requests are sent to the server, **Then** the operations are processed sequentially so that out-of-order server responses cannot overwrite newer cart states.

---

### Edge Cases

- What happens when a user opens the cart page directly via direct URL navigation without a prior cart session? The system fetches the active server cart for the customer profile; if 404/empty is returned, it renders the empty cart state.
- What happens when a user attempts to update a cart item quantity to 0 or a negative number? The system interprets a quantity of 0 as an explicit item removal request or enforces client-side control minimums (minimum quantity 1).
- What happens when a product price changes on the server while it is in the cart? The server response returns the latest authoritative `lineTotal` and `total`; the frontend updates display values directly from the server payload without client price override.
- What happens if the customer's session token expires while editing the cart? The authentication system intercepts the request, clears in-memory customer cart state, and prompts re-authentication.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST fetch and display the customer's active server-backed cart upon authenticated access to the customer application shell and cart routes.
- **FR-002**: The system MUST treat server data as the sole authoritative source for item prices, line totals, grand totals, and item counts. The frontend MUST NOT compute or override cart totals as authoritative rules.
- **FR-003**: The system MUST maintain a persistent cart badge in the application shell header (and mobile thumb zone) displaying the total quantity of items currently held in the server cart.
- **FR-004**: The system MUST restrict cart items to a single restaurant at a time, enforcing the server-side single-restaurant constraint.
- **FR-005**: The system MUST present a clear cross-restaurant decision prompt when a customer attempts to add an item from a different restaurant, allowing the user to either cancel the addition or clear the existing cart and add the new item.
- **FR-006**: The system MUST allow customers to increment, decrement, and remove individual line items on the cart page.
- **FR-007**: The system MUST require explicit user confirmation before executing a destructive "Clear Cart" operation.
- **FR-008**: The system MUST display dedicated views for populated cart, empty cart, loading, and error states on the `/cart` page.
- **FR-009**: The system MUST disable add-to-cart controls for any product marked as unavailable (`isAvailable: false`).
- **FR-010**: The system MUST clear all in-memory cart state immediately upon user logout or session termination.
- **FR-011**: The system MUST serialize cart mutation operations so that stale asynchronous responses cannot overwrite newer cart states.
- **FR-012**: The system MUST display user-friendly, typed error messages for server domain errors (e.g., cross-restaurant conflict, product unavailable, expired/inactive cart) and provide clear recovery options.
- **FR-013**: The system MUST support accessible keyboard navigation, visible focus indicators, and screen reader announcements for all cart actions, dialogs, and quantity controls.
- **FR-014**: The cart UI MUST remain fully usable on viewports ranging from 320px to 1280px and at 200% browser zoom without text truncation or broken layouts.
- **FR-015**: Mobile cart interactions MUST adhere to minimum touch target sizing (at least 42px height) and keep primary cart action triggers within standard thumb reach.

---

### Key Entities

- **Cart**: Represents the customer's active shopping basket on the server. Attributes include unique identifier, customer identifier, associated restaurant identifier, status (Active, Cleared, CheckedOut), line items list, and calculated grand total.
- **CartItem (Line Item)**: Represents an individual product entry inside a cart. Attributes include product identifier, product name, unit price, quantity, and line total.
- **ProductSnapshot**: Catalog product details (identifier, name, unit price, restaurant identifier, availability) captured at the time of addition.
- **Money**: Value object for monetary amounts containing an exact numeric amount and currency symbol/code (e.g., EGP / USD).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of displayed cart prices, line totals, and grand totals match the server response exact values without client-side discrepancies.
- **SC-002**: Cart badge item counts in the application shell synchronize with server state within 1 second of any confirmed cart addition, update, or removal.
- **SC-003**: 100% of cross-restaurant item additions trigger the required confirmation decision prompt before any backend mutation occurs.
- **SC-004**: Users can complete a quantity adjustment or item removal on the cart page in under 3 seconds under normal network conditions.
- **SC-005**: All interactive cart controls meet minimum accessibility standards (WCAG 2.1 AA focus indicators, ARIA labels for quantity buttons, 42px touch targets, and full keyboard operability).
- **SC-006**: 0% token or cart memory leakage across customer user sessions upon logout or re-authentication.

---

## Assumptions

- **Target Audience & Prerequisites**: Users interacting with the cart are authenticated customers with an established customer profile.
- **Scope Boundary**: Cart functionality is strictly limited to viewing, adding, updating, removing, and clearing items. Checkout, delivery address selection, order placement, coupons, and payment processing belong strictly to Phase 9 and Phase 10.
- **Single Active Cart**: The backend supports exactly one active cart per customer at any given time.
- **Server Authority**: Product availability, pricing validation, and single-restaurant rules are strictly enforced by the backend API.
- **Currency & Formatting**: All cart monetary values are formatted using the system's standard currency formatting utility based on the server-provided currency code.

---

## Explicit Exclusions

- **Guest Carts / Offline Storage**: Guest cart persistence in `localStorage`, `sessionStorage`, or IndexedDB is explicitly out of scope.
- **Checkout & Payment**: Order placement, address selection, payment gateway integration, and tip calculations are out of scope for Phase 8.
- **Multi-Restaurant Carts**: Combining items from multiple restaurants into a single cart is prohibited by domain rules.
- **Item Customization & Modifiers**: Special instructions, item options, size selections, or toppings are not supported by the backend contract and are out of scope.
- **Coupons & Promo Codes**: Discount codes, promotion application, and loyalty points are out of scope.

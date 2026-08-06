# Quickstart & Verification Guide: Checkout and Order Confirmation (Phase 9)

## 1. Baseline Verification

Before starting Phase 9 work, verify that the Phase 8 cart baseline is clean and all 103 tests pass:

```powershell
# Navigate to repo root
cd d:\link-dev\talabat-frontend

# Run full customer unit test suite
npx ng test customer --watch=false
```

---

## 2. Key Test Verification Commands

### Execute Checkout Component & Guard Tests
```powershell
# Run checkout feature unit tests
npx ng test customer --include="**/features/checkout/**/*.spec.ts" --watch=false

# Run orders feature unit tests
npx ng test customer --include="**/features/orders/**/*.spec.ts" --watch=false

# Run checkout guard tests
npx ng test customer --include="**/core/guards/checkout.guard.spec.ts" --watch=false

# Run core-http interceptor tests (including 422 rawError payload test)
npx ng test core-http --watch=false
```

---

## 3. Key End-to-End Manual Verification Flows

### Flow 1: Standard Checkout & Confirmation Journey
1. Open customer application at `http://localhost:4200/`.
2. Authenticate as a customer user with a valid profile and saved addresses.
3. Add 2 items from a restaurant to the cart.
4. Click the cart icon in the header -> navigate to `/cart`.
5. Click "Proceed to Checkout" -> verify navigation to `/checkout`.
6. Verify saved delivery address list rendered; verify default address pre-selected.
7. Verify line items, subtotal, delivery fee, and grand total match server cart.
8. Verify payment method displays "Cash on Delivery".
9. Click "Place Order" -> verify button enters disabled state (`aria-busy="true"`).
10. System receives HTTP 201 Created -> automatically clears cart badge -> redirects to `/orders/:orderId`.
11. On `/orders/:orderId`, verify Order ID, placement timestamp, delivery address snapshot, line items, and grand total render correctly.
12. Press F5 (browser refresh) -> verify order confirmation re-renders safely without re-submitting an order.

### Flow 2: Zero Saved Addresses Inline Creation Flow
1. Authenticate as a user with 0 saved delivery addresses.
2. Add an item to cart and navigate to `/checkout`.
3. Verify warning prompt indicating no saved address; click "Add Delivery Address".
4. Inline modal opens; fill `street`, `city`, `buildingNumber`, optional `floor`, and check `makeDefault`.
5. Submit form -> `AddressesApiService.addAddress()` returns HTTP 201 Created.
6. Modal closes, profile address state refreshes, new address is auto-selected, and customer remains on `/checkout`.

### Flow 3: HTTP 422 Unavailable Items Recovery Flow
1. Navigate to `/checkout` with items in cart.
2. Trigger order submission where an item is out of stock (server returns HTTP 422 `CheckoutUnavailableResponse`).
3. `CheckoutStore` receives `AppError` (`status: 422`, `rawError` attached).
4. System displays notice listing unavailable item names, triggers `CartStore.loadCart()`, and redirects user back to `/cart`.

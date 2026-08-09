# Quickstart Validation Guide: Account, Addresses, and Orders (Phase 10)

**Date**: 2026-08-08 | **Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Prerequisites

1. Backend services running:
   - `Talabat.Identity` on port 7237
   - `Talabat.Customer.API` on port 7056
2. Frontend dev server: `ng serve customer` on port 4200
3. A customer account with:
   - Completed profile (created via onboarding)
   - At least one saved address (created via checkout)
   - At least one placed order (completed via checkout)

## Verification Commands

```powershell
cd D:\link-dev\talabat-frontend\talabat-web

# Run all affected tests
npx ng test customer --watch=false
npx ng test core-http --watch=false
npx ng test shared-ui --watch=false

# Production build
npx ng build customer --configuration=production
```

All commands must pass with zero failures.

## Manual Acceptance Scenarios

### Scenario 1: Profile View and Edit

1. Sign in and navigate to `/profile`
2. **Verify**: Profile displays `fullName`, `age`, `phoneNumber` (or "Not provided")
3. Click "Edit profile"
4. **Verify**: Form appears with current values pre-populated
5. Change `fullName` to a new value, submit
6. **Verify**: Form returns to read mode; updated name is displayed
7. Click "Edit profile" again, clear `fullName`, submit
8. **Verify**: Validation error appears near the field; form stays in edit mode with values preserved
9. Click "Cancel" (if present) or navigate away
10. **Verify**: Changes are discarded; original values shown

### Scenario 2: Address Management

1. Navigate to `/profile`
2. **Verify**: Saved addresses are listed with street, building, floor, city, and "Default" badge
3. Click "Add address"
4. **Verify**: Address form modal appears with street, city, building, floor, makeDefault fields
5. Fill all required fields, submit
6. **Verify**: Modal closes; new address appears in list
7. Click "Set as default" on a non-default address
8. **Verify**: Default badge moves to the selected address
9. Click "Remove" on a non-default address
10. **Verify**: Confirmation prompt appears
11. Confirm removal
12. **Verify**: Address disappears from list

### Scenario 3: Address-Checkout Consistency

1. Add a new address via `/profile`
2. Navigate to `/checkout` (with items in cart)
3. **Verify**: New address appears in checkout address selector
4. Set a different default address via `/profile`
5. Return to `/checkout`
6. **Verify**: Newly defaulted address is pre-selected

### Scenario 4: Order History

1. Navigate to `/orders`
2. **Verify**: Order list displays with order ID, date, item count, and total for each order
3. **Verify**: Orders are formatted with MoneyPipe and readable dates
4. If more than 10 orders exist:
   - **Verify**: Pagination controls (Previous/Next) appear
   - Click "Next"
   - **Verify**: Second page loads correctly
   - **Verify**: "Previous" becomes enabled; page context shows "Page 2 of N"
5. Click on an order row
6. **Verify**: Navigates to `/orders/:orderId` showing full order details

### Scenario 5: Order Detail (from History)

1. Navigate to `/orders`
2. Click any order
3. **Verify**: `/orders/:orderId` shows order ID, placed date, address, items, total
4. **Verify**: "Back to orders" link is present and works
5. Refresh the browser
6. **Verify**: Page reloads correctly without errors

### Scenario 6: Empty States

1. **Empty order history**: If no orders exist, navigate to `/orders`
   - **Verify**: Empty state with "No orders yet" message and "Browse restaurants" link
2. **Empty address list**: If no addresses exist (after removing all), navigate to `/profile`
   - **Verify**: Empty state with "Add address" call to action

### Scenario 7: Error States

1. Navigate to `/orders/99999` (non-existent order)
   - **Verify**: "We could not find this order" message; no retry button
2. Navigate to `/orders/abc` (invalid ID)
   - **Verify**: "The order link is invalid" message; no API call made
3. Disconnect backend, navigate to `/orders`
   - **Verify**: Network error with retry button
   - Reconnect backend, click retry
   - **Verify**: Order list loads

### Scenario 8: Responsive and Accessibility

1. Test `/profile` at 320px viewport width
   - **Verify**: All content readable; no horizontal overflow; touch targets ≥ 42px
2. Test `/orders` at 320px viewport width
   - **Verify**: Order cards stack vertically; pagination controls accessible
3. Tab through profile edit form
   - **Verify**: All fields reachable; focus visible; error messages linked to fields
4. Tab through address cards
   - **Verify**: "Set as default" and "Remove" buttons reachable by keyboard
5. Test at 200% browser zoom
   - **Verify**: No layout breakage or content overflow

## Expected Test Coverage

| Test File | Key Assertions |
|-----------|---------------|
| `profile.store.spec.ts` | updateProfile success/error; addAddress + reload; setDefaultAddress direct replace; removeAddress + reload |
| `ui/address-form-modal.component.spec.ts` | No CheckoutStore injection; dialog closes with AddressResponse; cancel closes with undefined |
| `checkout.store.spec.ts` | Dangling override falls back to default; valid override retained |
| `profile.page.spec.ts` | View/edit toggle; form validation; save success/error; address list/add/default/remove |
| `orders.page.spec.ts` | Loading/empty/error/populated states; pagination prev/next; order card navigation |
| `order-confirmation.page.spec.ts` | Updated heading; "Back to orders" link present |

## Definition of Done

- [ ] All unit tests pass (`npx ng test customer --watch=false`)
- [ ] Production build succeeds (`npx ng build customer --configuration=production`)
- [ ] Manual scenarios 1–8 pass
- [ ] No cross-feature imports (profile ↛ checkout, checkout ↛ profile)
- [ ] No manual edits to `api-customer`
- [ ] ProfileStore cache is consistent after all mutations
- [ ] Checkout address selector reflects profile changes

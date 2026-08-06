# Quickstart Validation Guide: Server-Backed Customer Cart

**Feature Branch**: `002-server-backed-customer-cart`  
**Date**: 2026-08-06  
**Spec**: [spec.md](./spec.md)

This document provides step-by-step instructions to validate and verify Phase 8 end-to-end functionality.

---

## 1. Prerequisites & Environment Setup

Ensure backend API (`Talabat.API`), Identity authority (`Talabat.Identity`), and the Angular customer app (`projects/customer`) are running.

```powershell
# Navigate to web application directory
cd D:\link-dev\talabat-frontend\talabat-web

# Run automated unit tests
npm test -- --watch=false

# Run customer application production build
npx ng build customer --configuration=production

# Serve application locally
npx ng serve customer
```

---

## 2. Automated Test Suite Execution

Run Vitest unit tests covering `CartStore`, `CartPage`, `CartItemRowComponent`, and integration with `HeaderComponent` and `RestaurantMenuPage`:

```powershell
npx ng test customer --watch=false
```

---

## 3. Manual Verification Journeys

### Scenario A: Cart Sync Across Shell Header & Menu Add
1. Launch `http://localhost:4200/restaurants` as an authenticated profiled customer.
2. Click on a restaurant card to view its menu (`/restaurants/:id`).
3. Click **Add to Cart** on an available menu item.
4. **Expected Outcome**:
   - Cart badge in `HeaderComponent` increments from 0 to 1 immediately upon server response.
   - Persistent `CartEntryBarComponent` (bottom FAB) displays 1 item.
   - Menu product card shows brief success feedback.

### Scenario B: Single-Restaurant Conflict Prompt
1. With items from Restaurant A in your cart, navigate back to `/restaurants`.
2. Open a menu for Restaurant B (`/restaurants/:otherId`).
3. Click **Add to Cart** on an available item from Restaurant B.
4. **Expected Outcome**:
   - `CrossRestaurantDialogComponent` modal appears with title *"Clear Cart & Add New Item?"*.
   - Selecting **Keep Current Cart** closes modal and leaves Restaurant A items intact.
   - Selecting **Clear Cart & Add** executes clear cart on server, adds Restaurant B item, and updates badge count to 1.

### Scenario C: Cart Page Quantity Adjustment & Removal
1. Click **View Cart** or navigate to `/cart`.
2. Increment an item quantity using `+`. Verify line total and grand total update with server payload.
3. Decrement an item quantity using `-`.
4. Decrement an item with quantity 1 or click **Remove**. Verify item is removed from list and badge count updates.

### Scenario D: Clear Cart Confirmation
1. On `/cart` page with items present, click **Clear Cart**.
2. **Expected Outcome**:
   - `ClearCartDialogComponent` confirmation sheet appears.
   - Confirming clear sends `DELETE /api/me/cart` (204 No Content), transitions cart to empty state view, and sets badge count to 0.

### Scenario E: Logout & Session Reset
1. With items in cart, click **Sign out** in header.
2. **Expected Outcome**:
   - In-memory `CartStore` is reset to empty state.
   - Cart badge is hidden / count reset to 0.

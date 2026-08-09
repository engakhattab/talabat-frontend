# Research: Account, Addresses, and Orders (Phase 10)

**Date**: 2026-08-08 | **Feature**: [spec.md](spec.md)

## Research Items

### R-1: Generated API return types for address mutations

**Decision**: Verified from generated `AddressesApiService`:
- `addAddress()` → `Observable<AddressResponse>` (single new address, NOT full profile)
- `setDefaultAddress()` → `Observable<ProfileResponse>` (full profile with updated defaults)
- `removeAddress()` → `Observable<void>` (204, no body)

**Rationale**: This determines reconciliation strategy. `setDefaultAddress` can replace profile state directly. `addAddress` and `removeAddress` require a profile reload because they don't return the full aggregate.

**Alternatives considered**: Optimistic local mutation was considered but rejected because backend may reorder addresses, change default flags, or apply normalization rules that the client cannot replicate.

### R-2: Generated API return type for profile update

**Decision**: `CustomerApiService.updateProfile()` → `Observable<ProfileResponse>`

**Rationale**: Full profile response allows direct state replacement in ProfileStore without a separate reload request.

**Alternatives considered**: None — the generated type is authoritative.

### R-3: Order pagination API support

**Decision**: `OrdersApiService.getOrders()` accepts optional `GetOrdersRequestParams { page?: number; pageSize?: number }` and returns `OrderListResponse { items, page, pageSize, totalCount }`.

**Rationale**: Server-side pagination is fully supported. Component-local pagination state is sufficient; no URL query params needed for Phase 10.

**Alternatives considered**: URL-driven pagination (query params) was considered but rejected as unnecessary complexity for Phase 10. The order list is not bookmarkable or shareable by pagination state.

### R-4: Address form `CheckoutStore` coupling analysis

**Decision**: `AddressFormModalComponent` imports `CheckoutStore` at line 11 and calls `this.checkoutStore.selectAddress(created.id)` at line 214. The `ProfileStore.refreshAfterCreation()` call at line 213 should become `ProfileStore.addAddress()` or profile reload.

**Rationale**: The CheckoutStore dependency is the only blocker to feature-neutral reuse. Removing it and closing the dialog with the created `AddressResponse` preserves all form logic while enabling both checkout and profile consumers.

**Alternatives considered**: 
- Keeping form in checkout and duplicating for profile → violates DRY and Phase 9 spec
- Injecting CheckoutStore optionally → anti-pattern; components should not have optional feature dependencies

### R-5: Existing `app/ui/` directory

**Decision**: `projects/customer/src/app/ui/` does not exist. It will be created by Phase 10.

**Rationale**: The roadmap document (`Phase 5`) explicitly identifies `projects/customer/src/app/ui/` as the location for "customer visual foundation and customer-only compositions". This is the documented convention.

**Alternatives considered**: Placing in `core/` was rejected because `core/` is for cross-feature state/guards, not presentational components. Placing in a `shared/` directory would create confusion with `shared-ui`.

### R-6: Existing Signal Forms pattern in the codebase

**Decision**: Two Signal Forms implementations exist:
1. `OnboardingFormComponent` (`features/onboarding/components/`) — uses `form()`, `required()`, `validate()`, `FormField`, `FieldTree`
2. `AddressFormModalComponent` (`features/checkout/components/`) — same pattern

Both use `signal<Model>()` for the form model, `form(model, validatorFn)` for the field tree, `[formField]="form.fieldName"` directive binding, and `this.form().markAsTouched()` + `this.form().invalid()` for submission guard.

**Rationale**: The profile edit form will follow this exact pattern for consistency.

**Alternatives considered**: None — Signal Forms is the constitutional requirement (Principle V).

### R-7: OrderConfirmationPage heading and navigation suitability

**Decision**: The existing page has:
- `<h1>Order Confirmation</h1>` — confirmation-specific heading
- `<a routerLink="/restaurants">Back to restaurants</a>` — only navigation link
- `<tal-status-chip label="Order confirmed" tone="success" />` — confirmation-specific chip

**Rationale**: Minimal changes needed:
1. Change h1 text to "Order Details" (generic for both entry points)
2. Add "Back to orders" link (for order history navigation)
3. Keep "Order confirmed" chip — it describes order status accurately from both entry points

**Alternatives considered**: Creating separate OrderDetailPage was rejected as duplication.

### R-8: `AppErrorCode` values for Phase 10 operations

**Decision**: Current `AppErrorCode` values:
```
ProfileNotCreated, InvalidCustomerProfile, ProfileAlreadyExists,
RestaurantNotFound, CrossRestaurantCart, CartExpired, CartNotActive,
CartItemNotFound, ProductUnavailable, RestaurantClosed, RestaurantInactive,
InvalidQuantity, Unknown
```

`InvalidCustomerProfile` already exists and may apply to profile update validation errors. No address-specific or order-specific codes exist.

**Rationale**: New codes (`DuplicateAddress`, `AddressNotFound`, `OrderNotFound`) are not added because their presence in backend wire responses has not been verified. All errors degrade safely to `Unknown` with `error.title` and `error.detail` display.

**Alternatives considered**: Speculatively adding codes was rejected per the specification instruction: "Do not invent error-code support because an old roadmap mentions a code."

### R-9: DialogService typed result mechanism

**Decision**: `DialogService.openModal<R, D, C>()` returns `DialogRef<R, C>`. The `DialogRef` from `@angular/cdk/dialog` exposes a `closed` observable that emits the result value passed to `dialogRef.close(result)`. If the dialog is dismissed without calling `close(result)`, `closed` emits `undefined`.

**Rationale**: This is the standard CDK dialog result mechanism. CheckoutPage will subscribe to `dialogRef.closed` and call `checkoutStore.selectAddress(result.id)` only when result is defined.

**Alternatives considered**: None — this is the existing infrastructure.

### R-10: Profile page address list vs separate address route

**Decision**: Addresses are displayed inline on the profile page, not on a separate `/addresses` route.

**Rationale**: 
- `ProfileResponse.addresses` is part of the profile aggregate — displaying them together is natural
- The backend has no separate "list addresses" endpoint; addresses come embedded in `getProfile()`
- Adding a separate `/addresses` route would require either passing data between routes or making redundant API calls
- The existing profile page layout (`max-w-2xl`) has room for an address section below profile details

**Alternatives considered**: Separate `/profile/addresses` child route was considered but rejected as over-engineering for a list of < 5 items.

# UI Contracts: Account, Addresses, and Orders (Phase 10)

**Date**: 2026-08-08

## Component Contracts

Phase 10 does not introduce new shared-ui primitives. It extends existing customer-app pages and creates one relocated customer-app-level component.

### AddressFormModalComponent (relocated to `app/ui/`)

**Before** (Phase 9): Injected `CheckoutStore`, called `selectAddress()` on success, closed with `void`.

**After** (Phase 10):

```typescript
// Dialog result type
type AddressFormDialogResult = AddressResponse | undefined;

// Component contract
@Component({ ... })
export class AddressFormModalComponent {
  // Dependencies (injected)
  private readonly dialogRef = inject<DialogRef<AddressResponse>>(DialogRef);
  private readonly profileStore = inject(ProfileStore);

  // No CheckoutStore dependency

  // On successful creation:
  //   1. Calls profileStore.addAddress(request)
  //   2. Closes dialog: dialogRef.close(createdAddress)
  
  // On cancel:
  //   Closes dialog: dialogRef.close() — result is undefined
}
```

**Consumer contract (Checkout)**:
```typescript
// CheckoutPage opens the modal and handles the result
const ref = this.dialog.openModal<AddressResponse>(AddressFormModalComponent, { ... });
ref.closed.subscribe((result) => {
  if (result) {
    this.store.selectAddress(result.id);
  }
});
```

**Consumer contract (Profile)**:
```typescript
// ProfilePage opens the modal; ProfileStore is already updated inside the modal
this.dialog.openModal<AddressResponse>(AddressFormModalComponent, { ... });
// No result handling needed — ProfileStore signals update reactively
```

### ProfileStore Extended API

```typescript
// New methods added to existing ProfileStore
class ProfileStore {
  // Existing (unchanged)
  readonly state: Signal<ProfileLoadState>;
  readonly profile: Signal<ProfileResponse | null>;
  readonly error: Signal<AppError | null>;
  ensureLoaded(): Promise<ProfileProbeResult>;
  retry(): Promise<ProfileProbeResult>;
  refreshAfterCreation(): Promise<ProfileProbeResult>;
  reset(): void;

  // New (Phase 10)
  updateProfile(request: UpdateProfileRequest): Promise<ProfileResponse>;
  addAddress(request: AddAddressRequest): Promise<AddressResponse>;
  setDefaultAddress(addressId: number): Promise<void>;
  removeAddress(addressId: number): Promise<void>;
}
```

Each mutation method:
- Throws `AppError` on failure (caught by the caller for UI display)
- Updates `profileState` on success (either from response or via reload)
- Is only callable when `state() === 'loaded'`

### ProfilePage View/Edit Contract

```typescript
// ProfilePage internal state
protected readonly isEditing = signal(false);
protected readonly isSaving = signal(false);
protected readonly saveError = signal<AppError | null>(null);

// Address operation state
protected readonly addressBusy = signal<number | null>(null); // addressId being mutated
protected readonly addressError = signal<AppError | null>(null);
```

### OrdersPage Resource Contract

```typescript
// OrdersPage internal state
protected readonly currentPage = signal(1);
protected readonly pageSize = 10; // constant

// Resource that re-fetches when currentPage changes
protected readonly ordersResource = resource({
  request: () => ({ page: this.currentPage(), pageSize: this.pageSize }),
  loader: ({ request }) => firstValueFrom(
    this.ordersApi.getOrders({ page: request.page, pageSize: request.pageSize })
  ),
});

// Derived pagination state
protected readonly totalPages = computed(() => {
  const response = this.ordersResource.value();
  if (!response) return 1;
  return Math.ceil(response.totalCount / this.pageSize);
});
```

## API Endpoints Consumed

All endpoints are consumed via generated `@talabat/api-customer` services. No direct HTTP calls.

| Endpoint | Method | Service Call | Phase 10 Feature |
|----------|--------|-------------|------------------|
| `GET /api/me/profile` | GET | `CustomerApiService.getProfile()` | Profile reload after address add/remove |
| `PUT /api/me/profile` | PUT | `CustomerApiService.updateProfile()` | Profile editing |
| `POST /api/me/addresses` | POST | `AddressesApiService.addAddress()` | Address creation |
| `PUT /api/me/addresses/{id}/default` | PUT | `AddressesApiService.setDefaultAddress()` | Set default address |
| `DELETE /api/me/addresses/{id}` | DELETE | `AddressesApiService.removeAddress()` | Remove address |
| `GET /api/me/orders` | GET | `OrdersApiService.getOrders()` | Order history list |
| `GET /api/me/orders/{id}` | GET | `OrdersApiService.getOrderDetails()` | Order detail (existing) |

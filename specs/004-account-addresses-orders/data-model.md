# Data Model: Account, Addresses, and Orders (Phase 10)

**Date**: 2026-08-08 | **Feature**: [spec.md](spec.md)

## Entities

All entities below are generated DTOs from `@talabat/api-customer`. They are NOT modified by Phase 10. This document maps them to Phase 10 usage.

### ProfileResponse (Read: profile view; Write: profile update, set-default response)

| Field | Type | Nullable | Phase 10 Usage |
|-------|------|----------|----------------|
| `id` | `number` | No | Internal; not displayed |
| `fullName` | `string` | No | Displayed + editable |
| `age` | `number` | No | Displayed + editable |
| `phoneNumber` | `string \| null` | Yes | Displayed ("Not provided" if null) + editable |
| `addresses` | `AddressDto[]` | No | Address list on profile page; checkout address selector |

### UpdateProfileRequest (Write: profile edit submit)

| Field | Type | Nullable | Validation |
|-------|------|----------|------------|
| `fullName` | `string` | No | Required, non-blank (client UX) |
| `age` | `number` | No | Required, positive integer (client UX) |
| `phoneNumber` | `string \| null` | Yes | Optional; empty string → null |

### AddressDto (Read: embedded in ProfileResponse.addresses)

| Field | Type | Nullable | Phase 10 Usage |
|-------|------|----------|----------------|
| `id` | `number` | No | Key for set-default/remove operations |
| `street` | `string` | No | Displayed on address card |
| `city` | `string` | No | Displayed on address card |
| `buildingNumber` | `string` | No | Displayed on address card |
| `floor` | `string \| null` | Yes | Displayed if present |
| `isDefault` | `boolean` | No | Visual "Default" badge; determines pre-selection |

### AddAddressRequest (Write: address creation form)

| Field | Type | Nullable | Validation |
|-------|------|----------|------------|
| `street` | `string` | No | Required, non-blank |
| `city` | `string` | No | Required, non-blank |
| `buildingNumber` | `string` | No | Required, non-blank |
| `floor` | `string \| null` | Yes | Optional; empty string → null |
| `makeDefault` | `boolean` | No | Checkbox; defaults to false |

### AddressResponse (Read: returned by addAddress)

| Field | Type | Nullable | Phase 10 Usage |
|-------|------|----------|----------------|
| `id` | `number` | No | Used to select address in checkout; passed as dialog close result |
| `street` | `string` | No | Not directly used (profile reload follows) |
| `city` | `string` | No | Not directly used |
| `buildingNumber` | `string` | No | Not directly used |
| `floor` | `string \| null` | Yes | Not directly used |
| `isDefault` | `boolean` | No | Not directly used |

### OrderSummaryDto (Read: order history list)

| Field | Type | Nullable | Phase 10 Usage |
|-------|------|----------|----------------|
| `id` | `number` | No | Displayed as "Order #7"; route param for detail link |
| `restaurantId` | `number` | No | NOT displayed (no restaurant name available) |
| `total` | `MoneyDto` | No | Displayed via MoneyPipe |
| `placedAt` | `string` | No | ISO 8601; formatted via formatDateTime |
| `itemCount` | `number` | No | Displayed as "{n} items"; rendered as-is even if 0 |

### OrderListResponse (Read: order history pagination)

| Field | Type | Nullable | Phase 10 Usage |
|-------|------|----------|----------------|
| `items` | `OrderSummaryDto[]` | No | Order summary list |
| `page` | `number` | No | Current page number for pagination context |
| `pageSize` | `number` | No | Items per page for pagination calculation |
| `totalCount` | `number` | No | Total orders for page count calculation |

### OrderDetailResponse (Read: order detail page — existing Phase 9)

| Field | Type | Nullable | Phase 10 Usage |
|-------|------|----------|----------------|
| `id` | `number` | No | Displayed as "Order #7" |
| `customerId` | `number` | No | NOT displayed |
| `restaurantId` | `number` | No | NOT displayed |
| `deliveryAddress` | `OrderDeliveryAddressDto` | No | Address snapshot displayed |
| `items` | `OrderLineItemDto[]` | No | Line item table |
| `total` | `MoneyDto` | No | Grand total via MoneyPipe |
| `placedAt` | `string` | No | Formatted via formatDateTime |

### MoneyDto (Read: prices and totals)

| Field | Type | Nullable | Phase 10 Usage |
|-------|------|----------|----------------|
| `amount` | `number` | No | Formatted by MoneyPipe |
| `currency` | `string` (optional) | Yes | Used by MoneyPipe if present |

## State Transitions

### ProfileStore State Machine (Extended for Phase 10)

```
idle → loading → loaded | missing | error
                    ↓         ↓        ↓
             [mutations]  [onboarding] [retry → loading]
                    ↓
            updating → loaded (success) | loaded + error notice (failure)
```

New states are not formal `ProfileLoadState` enum additions — they are operation-level busy/error signals within the existing `loaded` state. The profile aggregate is only mutated when state is `loaded`.

### Profile Edit Mode (Component-local)

```
view → editing (user clicks "Edit")
editing → submitting (user submits form)
submitting → view (server success)
submitting → editing + error (server failure)
editing → view (user cancels)
```

### Address Mutation States (Component-local)

```
idle → adding (user opens add dialog)
adding → idle (dialog closes)

idle → setting-default (user clicks "Set as default")
setting-default → idle (success or failure)

idle → confirm-remove (user clicks "Remove")
confirm-remove → removing (user confirms)
confirm-remove → idle (user cancels)
removing → idle (success or failure)
```

### Order List Page States

```
loading → populated | empty | error
populated → loading (page change)
error → loading (retry)
```

## Relationships

```
ProfileResponse ──contains──▸ AddressDto[] (addresses)
AddressDto      ──matches──▸ AddAddressRequest (creation shape)
AddressDto      ──matches──▸ AddressResponse (creation result shape)
OrderSummaryDto ──navigates──▸ OrderDetailResponse (via id → orderId route param)
OrderDetailResponse ──contains──▸ OrderLineItemDto[] (items)
OrderDetailResponse ──contains──▸ OrderDeliveryAddressDto (delivery address snapshot)
OrderLineItemDto ──contains──▸ MoneyDto (unitPrice, lineTotal)
OrderDetailResponse ──contains──▸ MoneyDto (total)
OrderSummaryDto ──contains──▸ MoneyDto (total)
```

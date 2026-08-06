# API Contract Mapping: Server-Backed Customer Cart

**Feature Branch**: `002-server-backed-customer-cart`  
**Date**: 2026-08-06  
**Spec**: [spec.md](../spec.md)

All HTTP interactions consume the generated `CartApiService` in `@talabat/api-customer`. Direct `HttpClient` usage in features is strictly prohibited.

---

## Endpoints Summary

| Method | Endpoint | Generated Method | Request Type | Success Response | Expected Error Codes |
|---|---|---|---|---|---|
| `GET` | `/api/me/cart` | `getCart()` | None | `200 CartResponse` | 401, 403, 404, 409 |
| `POST` | `/api/me/cart/items` | `addCartItem()` | `AddCartItemRequestParams` | `200 CartResponse` | 401, 403, 404, 409 (`CrossRestaurantCart`), 422 (`ProductUnavailable`) |
| `PUT` | `/api/me/cart/items/{productId}` | `updateCartItemQuantity()` | `UpdateCartItemQuantityRequestParams` | `200 CartResponse` | 400 (`InvalidQuantity`), 401, 403, 404 (`CartItemNotFound`), 409 |
| `DELETE` | `/api/me/cart/items/{productId}` | `removeCartItem()` | `RemoveCartItemRequestParams` | `200 CartResponse` | 401, 403, 404 (`CartItemNotFound`), 409 |
| `DELETE` | `/api/me/cart` | `clearCart()` | None | `204 No Content` | 401, 403, 409 |

---

## Detailed Payload Schemas

### 1. `GET /api/me/cart`

**Response (`200 OK`)**:
```json
{
  "id": 142,
  "customerId": 12,
  "restaurantId": 5,
  "status": "Active",
  "items": [
    {
      "productId": 101,
      "productName": "Super Chicken Burger",
      "unitPrice": { "amount": 150.0, "currency": "EGP" },
      "quantity": 2,
      "lineTotal": { "amount": 300.0, "currency": "EGP" }
    }
  ],
  "total": { "amount": 300.0, "currency": "EGP" }
}
```

**Empty Cart Response (`200 OK`)**:
```json
{
  "id": null,
  "customerId": 12,
  "restaurantId": null,
  "status": "Empty",
  "items": [],
  "total": { "amount": 0.0, "currency": "EGP" }
}
```

---

### 2. `POST /api/me/cart/items`

**Request Body (`AddCartItemRequest`)**:
```json
{
  "restaurantId": 5,
  "productId": 101,
  "quantity": 1
}
```

**Error Response (`409 Conflict - CrossRestaurantCart`)**:
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "Cross-restaurant cart conflict",
  "status": 409,
  "detail": "Cart contains items from another restaurant.",
  "errorCode": "CrossRestaurantCart"
}
```

---

### 3. `PUT /api/me/cart/items/{productId}`

**Request Body (`UpdateCartItemRequest`)**:
```json
{
  "quantity": 3
}
```

---

### 4. `DELETE /api/me/cart`

**Response (`204 No Content`)**:
Empty body. Frontend resets `CartStore` to `empty` state representation.

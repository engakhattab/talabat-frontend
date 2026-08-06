# API Contract: Checkout and Order Confirmation (Phase 9)

## 1. Endpoints Summary

| Feature Area | Method | Endpoint Path | Angular API Service |
|---|---|---|---|
| Order Submission | `POST` | `/api/me/checkout` | `CheckoutApiService` |
| Order Details | `GET` | `/api/me/orders/{orderId}` | `OrdersApiService` |
| Add Address | `POST` | `/api/me/addresses` | `AddressesApiService` |

---

## 2. Detailed Contract Definitions

### 2.1 `POST /api/me/checkout` (Order Submission)

- **Request**:
  - Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`
  - Payload (`CheckoutRequest`):
    ```json
    {
      "deliveryAddressId": 1042
    }
    ```

- **Responses**:
  - **`201 Created`** (`CheckoutSuccessResponse`):
    ```json
    {
      "orderId": 8901,
      "status": "Submitted"
    }
    ```
  - **`422 Unprocessable Entity`** (`CheckoutUnavailableResponse`):
    ```json
    {
      "status": "unavailable",
      "unavailableItems": [
        {
          "productId": 12,
          "productName": "Chicken Shawarma Deluxe",
          "reason": "Out of stock"
        }
      ]
    }
    ```
  - **`400 / 401 / 404 / 500`** (RFC 9457 `ProblemDetails`):
    ```json
    {
      "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
      "title": "Cart not found or empty",
      "status": 404,
      "errorCode": "CartNotActive"
    }
    ```

---

### 2.2 `GET /api/me/orders/{orderId}` (Order Confirmation Details)

- **Request**:
  - Path Parameter: `orderId` (number)
  - Headers: `Authorization: Bearer <token>`

- **Responses**:
  - **`200 OK`** (`OrderDetailResponse`):
    ```json
    {
      "id": 8901,
      "customerId": 42,
      "restaurantId": 101,
      "deliveryAddress": {
        "street": "123 El-Nasr Road",
        "city": "Cairo",
        "buildingNumber": "15B",
        "floor": "4th Floor, Apt 402"
      },
      "items": [
        {
          "productName": "Chicken Shawarma Deluxe",
          "unitPrice": {
            "amount": 120.00,
            "currency": "EGP"
          },
          "quantity": 2,
          "lineTotal": {
            "amount": 240.00,
            "currency": "EGP"
          }
        }
      ],
      "total": {
        "amount": 265.00,
        "currency": "EGP"
      },
      "placedAt": "2026-08-06T14:30:00Z"
    }
    ```
  - **`404 Not Found`** (`ProblemDetails`):
    ```json
    {
      "title": "Order not found",
      "status": 404
    }
    ```

---

### 2.3 `POST /api/me/addresses` (Inline Address Creation)

- **Request**:
  - Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`
  - Payload (`AddAddressRequest`):
    ```json
    {
      "street": "45 Al-Ahram Street",
      "city": "Giza",
      "buildingNumber": "12A",
      "floor": "2nd Floor",
      "makeDefault": true
    }
    ```

- **Responses**:
  - **`201 Created`** (`AddressResponse`):
    ```json
    {
      "id": 1043,
      "street": "45 Al-Ahram Street",
      "city": "Giza",
      "buildingNumber": "12A",
      "floor": "2nd Floor",
      "isDefault": true
    }
    ```

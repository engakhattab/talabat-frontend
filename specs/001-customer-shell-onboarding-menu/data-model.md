# Phase 7 Data And State Model

This document models frontend state and generated API data used by Phase 7. Backend entities remain authoritative and are not reimplemented.

## Customer Profile

**Source**: Generated `ProfileResponse` from `GET /api/me/profile`.

| Field | Type | Rules/meaning |
|---|---|---|
| `id` | `number` | Server identity/profile identifier; read-only. |
| `fullName` | `string` | Canonical server value used by shell greeting. |
| `age` | `number` | Server-validated positive integer. |
| `phoneNumber` | `string \| null` | Canonical normalized value. |
| `addresses` | `AddressDto[]` | Read-only in Phase 7; address management is deferred. |

No frontend mutation is permitted except replacing the cached response with a new generated response.

## Create Profile Form Model

The form model intentionally differs from the wire request to represent blank native inputs.

| Field | Form type | Client UX validation | Wire mapping |
|---|---|---|---|
| `fullName` | `string` | Required after trim; focusable field error. | Trim to `CreateProfileRequest.fullName`. |
| `age` | `number \| null` | Required, integer, > 0. Native parse errors remain invalid. | Valid integer to `CreateProfileRequest.age`. |
| `phoneNumber` | `string` | Optional; no invented format rule. | Trim; blank becomes `null`; key is always present. |

### Form States

```text
pristine -> editing -> invalid-submitted -> editing
                  -> submitting -> server-rejected -> editing
                               -> auth-interrupted -> reauthenticate/retry
                               -> create-succeeded -> canonical-refetch
                               -> canonical-refetch-failed -> retryable-error
                               -> loaded -> internal-navigation
```

Invariants:

- At most one `submit()` action runs.
- Failed submission never clears the model.
- Navigation occurs only after the profile cache contains a canonical GET response.
- Server text is not parsed to assign fields.

## Profile Session State

```typescript
type ProfileLoadState = 'idle' | 'loading' | 'loaded' | 'missing' | 'error';
```

Conceptual aggregate:

| Field | Type | Visibility | Invariant |
|---|---|---|---|
| `subject` | `string \| null` | private | Cache belongs only to this authenticated subject. |
| `state` | `ProfileLoadState` | readonly signal | Exactly one terminal state after a probe. |
| `profile` | `ProfileResponse \| null` | readonly signal | Non-null iff state is `loaded`. |
| `error` | `AppError \| null` | readonly signal | Non-null iff state is `error`. |
| `inFlight` | `Promise<ProfileProbeResult> \| undefined` | private non-signal | Shared by all concurrent callers; cleared in `finally`. |

### Profile Probe Result

```text
loaded(profile) | missing | error(appError)
```

The guard consumes this semantic result instead of inspecting raw HTTP errors.

### State Transitions

| From | Event | To | Notes |
|---|---|---|---|
| any | logout/expiry/unauthorized/refresh failure/subject change | `idle` | Clear profile, error, subject/in-flight generation. Ignore stale completion. |
| `idle` | `ensureLoaded()` with authenticated subject | `loading` | Create one generated GET request. |
| `loading` | concurrent `ensureLoaded()` | `loading` | Return same promise; no second request. |
| `loading` | GET 200 | `loaded` | Cache canonical `ProfileResponse`. |
| `loading` | GET 404 + `ProfileNotCreated` | `missing` | The only no-profile transition. |
| `loading` | network/401/403/other 404/5xx/unexpected | `error` | Preserve semantic error; do not redirect to onboarding. |
| `loaded`/`missing` | same-subject `ensureLoaded()` | unchanged | Return cached terminal result. |
| `error` | explicit retry | `loading` | Start one new request. |
| `missing` | create POST succeeds | `loading` | Canonical GET refetch. |
| `loading` | canonical GET 200 | `loaded` | Onboarding may navigate. |

Stale requests carry an internal generation/subject check so completion after reset cannot populate another session's state.

## Restaurant Menu

**Source**: Generated `MenuResponse` from `CatalogApiService.getRestaurantMenu({ restaurantId })`.

| Field | Type | Use |
|---|---|---|
| `restaurantId` | `number` | Track response and emit cart-entry identifiers. |
| `restaurantName` | `string` | Menu heading. |
| `products` | `MenuProductDto[]` | Empty/populated states. |

No restaurant description, status, or image exists in this response.

## Menu Product

| Field | Type | Use |
|---|---|---|
| `id` | `number` | Stable product identifier. |
| `name` | `string` | Accessible product heading/name. |
| `description` | `string` | Product description. |
| `price.amount` | `number` | Server catalog amount displayed directly; never totaled. |
| `price.currency` | `string \| undefined` | Display currency; use contract-safe fallback copy if absent, not a calculated value. |
| `isAvailable` | `boolean` | Controls unavailable badge and native disabled action. |

The UI supplies a decorative stable placeholder because the DTO has no image field. This placeholder is not data and conveys no product information.

## Restaurant Route Parameter

| Input | Result |
|---|---|
| Canonical positive safe base-10 integer string | Valid `restaurantId`; load resource. |
| Empty, nonnumeric, zero, negative, decimal, exponent, unsafe integer, or mixed string | Invalid state; no API request; display not-found. |
| Valid ID with generated response | Display menu states. |
| Valid ID with typed `RestaurantNotFound` | Display not-found. |

## Menu Resource State

```text
invalid-parameter
idle
loading
reloading
error-retryable
not-found
empty
populated
```

Transitions are driven by route-derived resource params. A new valid parameter unsubscribes the previous generated observable before starting the new one. Invalid params set resource params to undefined and cannot retain/render a stale menu as current.

## Cart Entry Request

```typescript
interface CartEntryRequest {
  readonly restaurantId: number;
  readonly productId: number;
}
```

Validation:

- Both identifiers come from the current generated menu response and must be positive integers.
- The emitting product must have `isAvailable === true`.
- Anonymous activation invokes validated sign-in return behavior before a request is processed.
- Phase 7 processing yields only `deferred`; it stores no request and emits no success.

Explicitly absent:

- Quantity.
- Price.
- Product/restaurant DTO snapshots.
- Item count.
- Cart lines.
- Subtotal/total.
- Mutation success.

## Validated Navigation Destination

**Source**: Existing `safeReturnUrl()` in `core-auth`.

Properties:

- Internal absolute path beginning with one `/`.
- Rejects protocol-relative, absolute-origin, callback, and unsafe values according to existing Phase 6 tests.
- Defaults to `/restaurants`.
- Used for auth intent, onboarding redirect, profile failure retry, and post-create navigation.

It is not persisted as unrestricted user-controlled text and is revalidated at every navigation boundary.

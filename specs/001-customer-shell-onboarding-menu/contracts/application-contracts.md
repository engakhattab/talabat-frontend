# Phase 7 Application-Level Contracts

These contracts define boundaries between customer application areas. They do not replace or modify the generated OpenAPI client.

## Route Contract

| Route | Visibility | Lazy owner | Guards | Result |
|---|---|---|---|---|
| `/` | Public | root | none | Redirect to `/restaurants`. |
| `/restaurants` | Public | catalog | none | Restaurant list. |
| `/restaurants/:restaurantId` | Public | catalog | none | Menu states; invalid ID makes no API request. |
| `/signin-callback` | Public callback | auth | none | Existing validated OIDC callback. |
| `/signout-callback` | Public callback | auth | none | Existing OIDC sign-out callback. |
| `/onboarding` | Authenticated, profile-exempt | onboarding | `[authGuard, onboardingGuard]` | Missing profile form; existing profile redirects safely. |
| `/profile-unavailable` | Authenticated recovery | auth/profile | `[authGuard]` | Retry profile probe without an onboarding false positive. |
| `/auth-check` | Development diagnostic | auth | `[authGuard, profileGuard]` | Retained clarification; absent from shell navigation. |
| `**` | Public | not-found | none | Explicit not-found page. |

Guard arrays are ordered contracts. `profileGuard` may not be moved before `authGuard` or attached to public/callback/onboarding/not-found routes.

After a successful sign-in callback has validated OIDC state and produced an authenticated subject, customer-app orchestration performs the once-per-subject profile probe before final destination navigation. `missing` routes to onboarding, `loaded` restores the validated destination, and `error` routes to profile recovery. The callback route itself remains unguarded to avoid a callback loop.

## ProfileStore Contract

### Public reads

```text
state(): idle | loading | loaded | missing | error
profile(): ProfileResponse | null
error(): AppError | null
hasProfile(): boolean
isMissing(): boolean
canRetry(): boolean
```

All are readonly signals/computed signals.

### Public actions

```text
ensureLoaded(): Promise<ProfileProbeResult>
retry(): Promise<ProfileProbeResult>
refreshAfterCreation(): Promise<ProfileProbeResult>
reset(): void
```

Behavior:

- `ensureLoaded` deduplicates and caches by authenticated subject.
- `retry` forces a new probe only after an error.
- `refreshAfterCreation` invalidates missing state and obtains the canonical GET response.
- `reset` clears all customer data synchronously and invalidates stale completion.
- No public method accepts arbitrary profile data for cache insertion.

### Probe result

```text
{ kind: 'loaded'; profile: ProfileResponse }
{ kind: 'missing' }
{ kind: 'error'; error: AppError }
```

Consumers branch on `kind`, not HTTP messages.

## Onboarding Submission Contract

### Generated call

```text
CustomerApiService.createProfile({ createProfileRequest })
```

Payload:

```json
{
  "fullName": "trimmed nonblank string",
  "age": 18,
  "phoneNumber": null
}
```

The phone property is always present. On successful POST, the application calls `ProfileStore.refreshAfterCreation()` before navigation.

### Error presentation

| App error | Owned behavior |
|---|---|
| `InvalidCustomerProfile` | Form-level safe server validation summary; values preserved. |
| `ProfileAlreadyExists` | Probe canonical profile; loaded redirects, failure is retryable. |
| `ProfileNotCreated` | Not expected from create; preserve `Unknown`-style safe fallback unless a documented action is added. |
| 401 | Existing Phase 6 unauthorized/session behavior; no false missing-profile state. |
| 403 | Safe authorization error; no onboarding loop. |
| Network/`Unknown` | Retryable form summary; values preserved. |

No backend detail string is parsed into field ownership.

## Menu Data Contract

### Generated call

```text
CatalogApiService.getRestaurantMenu({ restaurantId })
```

The page uses only:

```text
MenuResponse.restaurantId
MenuResponse.restaurantName
MenuResponse.products[]
MenuProductDto.id
MenuProductDto.name
MenuProductDto.description
MenuProductDto.price
MenuProductDto.isAvailable
```

The page must not assume restaurant description/status/image, product image/category/modifiers/allergens, search, or delivery estimates.

## Cart Entry Boundary

### UI event

```typescript
interface CartEntryRequest {
  readonly restaurantId: number;
  readonly productId: number;
}
```

### Phase 7 handling result

```typescript
type CartEntryOutcome = 'authentication-started' | 'deferred';
```

Semantics:

- Available product activation emits one request.
- Anonymous activation starts Phase 6 sign-in with a validated internal menu return URL and returns `authentication-started`.
- Authenticated activation returns `deferred` and opens an accessible message that no cart mutation occurred.
- The coordinator must not persist, count, combine, price, or replay requests.
- The shell cart control uses the same coordinator and presents no numeric badge.

### Phase 8 replacement obligation

Phase 8 must connect this boundary to generated server cart operations. It must derive count, line state, and totals from the returned/refetched server cart. Only after a successful server response may the UI announce an added item or display a live count. The Phase 7 deferred outcome and explanatory copy must then be replaced; leaving both would be misleading.

## Accessibility Contract

- Shell exposes one header, labelled navigation, one main landmark, and a skip link.
- All controls are native links/buttons/inputs or CDK-managed dialog controls.
- Minimum customer target size is 42 px.
- Focus indicators use `--tal-focus-ring`.
- Invalid submit focuses the summary then first invalid bound control.
- Loading/submission uses polite status; actionable errors use alert semantics without repeated announcements.
- Dialog/sheet traps focus, provides a heading/label, closes by keyboard, and restores focus.
- Fixed mobile UI reserves `env(safe-area-inset-bottom)` and never obscures main controls.
- Motion is nonessential and obeys existing `prefers-reduced-motion` rules.

## Error Code Contract

Recognized frontend codes after Phase 7:

```text
ProfileNotCreated
InvalidCustomerProfile
ProfileAlreadyExists
RestaurantNotFound
Unknown
```

Unknown backend codes remain `Unknown`. Feature code does not expand this list locally or compare raw backend strings.

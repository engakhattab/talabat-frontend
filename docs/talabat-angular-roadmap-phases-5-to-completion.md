# Talabat Angular Roadmap — Phases 5 to Completion

**Status:** implementation-ready roadmap  
**Scope:** customer application from the verified Phase 4 baseline to a production-ready customer ordering milestone  
**Out of scope for this roadmap:** a delivery application. Its current API is retained as a contract dependency, but delivery is a separately gated programme (see the decision gates below).

## 1. Executive summary

### Current verified baseline after Phases 1–4

The workspace is an Angular 22.1 standalone, zoneless, strict-TypeScript workspace. It contains one customer application (`projects/customer`) and five libraries: generated `api-customer`, `core-config`, `core-auth`, `core-http`, `shared-ui`, and `shared-util`. Only `api-customer`, `core-config`, and `core-http` have meaningful implementation.

The customer app bootstraps runtime configuration from `projects/customer/public/assets/config.json`, supplies the generated client's `BASE_PATH`, and registers correlation-ID and Problem Details interceptors. Its only feature route is a lazy-loaded public restaurant-list page at `/restaurants`. That page calls `CatalogApiService.getRestaurants()` and renders loading, error, empty, and populated states without production styling.

The checked-in customer and delivery OpenAPI documents byte-match the configured backend checkout at the time of this roadmap. The customer contract exposes all APIs required for a complete basic ordering flow: public catalog/menu; authenticated profile, addresses, cart, checkout, and order history/detail. The delivery contract exposes only an already-authorized agent's work queue, status, location, and delivery transitions.

### What remains

The remaining customer work is: introduce the FoodDash design foundation and reusable primitives; establish secure OIDC sign-in/sign-out and callback handling; add a profile gate and application shell; complete restaurant-menu, cart, checkout, order, profile, and address journeys; then prove the result with robust tests, accessibility, responsiveness, and release checks.

### Completion milestone

**Customer ordering milestone** means a user can discover public restaurants, sign in through Talabat.Identity, create and maintain the required customer profile and delivery addresses, add available items from exactly one restaurant to a server-backed cart, select an address, submit checkout, handle unavailable-item and domain-error outcomes, and view the resulting order history and details. The result uses the FoodDash system responsively, protects authenticated routes and tokens correctly, has explicit accessible loading/error/empty states, and passes the defined automated and manual verification checks.

This is intentionally not a claim of payments, live order tracking, notifications, coupons, search, maps, i18n/RTL content, SSR, PWA, or a delivery courier product; none is supported as a complete frontend workflow by the current scope and contracts.

## 2. Baseline verification

### Implemented in the repository

- `talabat-web` uses Angular 22.1, standalone bootstrapping, `provideZonelessChangeDetection()`, Vitest, and strict compiler flags including `noUncheckedIndexedAccess`.
- `customer` is the only configured application, served on port 4200. There is no delivery application project, `api-delivery` library, delivery generator configuration, or delivery runtime configuration.
- `api-customer` is generated, isolated under `projects/api-customer/src`, and exposes six services: `AddressesApiService`, `CartApiService`, `CatalogApiService`, `CheckoutApiService`, `CustomerApiService`, and `OrdersApiService`.
- `core-config` loads `identityAuthority`, `customerApiBaseUrl`, `clientId`, and `scopes` from `/assets/config.json` before exposing `APP_CONFIG`.
- `core-http` adds `X-Correlation-Id` and maps HTTP failures to an `AppError`. Tests cover the config provider, the correlation header, and representative Problem Details mapping.
- The catalog page uses `resource()` plus `firstValueFrom()` over the generated observable, and tests its loading, network-error, empty, and successful list states.
- The frontend worktree was clean when inspected. The backend checkout was on `feature/user-aggregate-refactor`; the frontend's checked-in OpenAPI documents matched its customer and delivery documents byte-for-byte.

### Missing, incomplete, inconsistent, or risky

- FoodDash tokens, Tailwind v4, Angular CDK, self-hosted fonts, shared UI primitives, and shared formatting utilities are absent. `shared-ui` and `shared-util` are CLI placeholder components.
- `core-auth` is also a placeholder component. There is no OIDC client, auth state, token acquisition/refresh, callback route, logout route, guard, profile guard, or auth interceptor.
- There is no authenticated shell, cart FAB, onboarding, menu, cart, checkout, order, profile, or address feature.
- `AppErrorCode` currently recognizes only `ProfileNotCreated` and `Unknown`, although backend domain errors include cart, address, availability, quantity, restaurant, and concurrency cases. A phase must deliberately map the subset it owns rather than branch on HTTP status or raw backend strings.
- The API's `ProblemDetails` schema omits `errorCode`; the backend source writes it as a Problem Details extension. The application must retain its defensive root-level extraction and verify the serialized payload against a live host before relying on a particular code path.
- The current page adapts the observable with `resource()` and `firstValueFrom()` instead of the architecture document's `httpResource()` example. Future server reads should use a single documented resource adapter or Angular-supported signal-resource approach; pages must not create ad-hoc promise/error conversions.
- The top-level router has no callback, logout, onboarding, authenticated feature, not-found, or error route. The catalog feature is lazy, but its page is directly referenced inside that feature route, which is acceptable within that lazy chunk.
- No e2e framework/target is configured. The README's generic `ng e2e` text is not evidence that e2e tests can run.
- A fresh combined API verification/test/build command did not finish within a 124-second local command limit, so this roadmap does not assert a newly observed green build or test run. Phase 11 owns a time-bounded investigation and CI-grade proof.

### Differences from the two planning documents

- The documents describe Phase 4 as a real live-data vertical slice and prescribe an `httpResource()` shape. The repository has the functional slice but implements it with `resource()`/`firstValueFrom()` and has no durable evidence in this inspection of a live backend run.
- The original Phase 5–12 outline includes a delivery app in Phase 12. The current customer milestone is complete without it, while the delivery contract lacks APIs to expose an agent's registration/approval state. Starting a delivery app now would force unsupported UI assumptions.
- The plan says the backend's `errorCode` is root-level in the wire payload. Backend code sets an ASP.NET Core `ProblemDetails.Extensions["errorCode"]`; ASP.NET's normal serialization normally flattens extensions, but this must be verified against the running service rather than inferred from code or schema.
- The original architecture illustrates status enums and a three-204-operation check. The current customer contract has status properties typed as `string` and exactly two customer `204` operations (`RemoveAddress`, `ClearCart`). The generated output is the authority.

### Contract and architecture constraints inherited by every phase

- Public: `CatalogApiService.getRestaurants()` and `getRestaurantMenu()`. Everything under `/api/me/*` is OAuth-protected using the `customer.api` scope.
- A missing profile is identified by `GET /api/me/profile` returning `404`; other profile-protected endpoints can return `409` with `ProfileNotCreated`. Route gating must probe the former once and handle the latter defensively.
- A cart is server authoritative and has one `restaurantId`; adding from a different restaurant can return `CrossRestaurantCart`. Cart prices/totals are server data, never client-calculated authority.
- Checkout returns `201 CheckoutSuccessResponse` or a typed `422 CheckoutUnavailableResponse` with unavailable items; other failures are Problem Details. The contract has no payment operation.
- Orders expose address, item snapshot, total, and placed time, but no restaurant display name, customer-visible order status, cancellation, tracking, or pagination query parameters in the generated method signatures. UI must not invent those capabilities.
- Core/shared libraries must not depend on apps or features; features must not import each other; generated libraries are never manually edited.

## 3. Roadmap overview

| Phase | Name | Primary outcome | Depends on | Main user/business value | Exit criterion |
|---|---|---|---|---|---|
| 5 | FoodDash design foundation | Tailwind v4 token layer and accessible shared primitives | Verified Phase 4 baseline | Consistent, usable responsive UI for all later journeys | Primitives and token contract are tested, documented, and used to restyle catalog |
| 6 | Secure OIDC authentication | Sign-in, callback, token lifecycle, logout, and guards | Phase 5; approved Angular-22-compatible OIDC package | Customers can safely authenticate with Identity | A protected API receives a correctly scoped token; callbacks/logout and negative paths pass |
| 7 | Customer shell, profile gate, and menu | Gated onboarding, responsive shell/cart FAB, and restaurant menu/add entry point | Phase 5–6 | A new or returning customer can reach an orderable menu | Profile gate and menu flow work with all state paths |
| 8 | Server-backed cart | Add, quantity update, remove, clear, and synchronized cart badge | Phase 7 | Customer can review and manage one restaurant's order | Cart remains consistent across menu, shell, and cart route under success/error cases |
| 9 | Checkout and confirmation | Address selection, server checkout, unavailable-item recovery, confirmation | Phase 8 | Customer can place an order without client-side price authority | 201 and 422 outcomes, duplicate submission protection, and route recovery are proven |
| 10 | Account, addresses, and orders | Profile editing, address management, order history and detail | Phase 9 | Customer can manage delivery data and review placed orders | All supported account/order contract flows have accessible states and tests |
| 11 | Release hardening and customer milestone | E2E proof, performance/accessibility/security quality gates, operations handoff | Phases 5–10 | Reliable, releasable customer ordering product | Production build, API verification, automated suites, and manual acceptance checks pass |

## 4. Detailed phase specifications

### Phase 5 — FoodDash design foundation

#### Purpose and user value

Establish the visual and interaction foundation before expanding feature scope. Users receive consistent controls, readable prices/times, clear status/error feedback, and responsive touch-friendly behavior rather than a sequence of one-off styled pages.

#### Scope

Included:

- Add Tailwind CSS v4 using its CSS-first setup; encode FoodDash colors, typography, 6px spacing, radii, elevation, semantic status colors, and logical-direction utilities in the customer global stylesheet.
- Add Angular CDK only for foundation capabilities required by primitives: a11y/focus utilities and dialog/overlay infrastructure. Do not add Angular Material.
- Add and self-host the specified Poppins, DM Sans, and Roboto Mono font assets only after licensing/source approval; include robust font fallbacks and font-display behavior.
- Replace placeholder `shared-ui` exports with standalone, domain-free Button, Card, Input, StatusChip, Spinner, EmptyState, ErrorState, Modal/Sheet, and focus/visually-hidden support. Implement only primitives required by catalog and forthcoming account/cart/checkout patterns.
- Restyle the existing restaurant list using presentational components and accessible image fallbacks; retain all current data states.
- Define `MoneyPipe` and date/identifier display utilities in `shared-util` only where their contract is stable and non-domain-specific.

Excluded/deferred:

- Authentication, menu/cart behavior, promotional banners, search/filtering, images fetched from a new service, dark mode, RTL content translation, and app-specific components.

#### Prerequisites and dependencies

Phase 4 source and generated customer types must compile. Confirm Tailwind v4 and the selected CDK APIs support the workspace's exact Angular 22.1 version before modifying dependencies. Font source/licensing is a decision gate; usable system fallbacks are permitted while that decision is pending.

#### Architecture and technical decisions

- `projects/customer/src/styles.css` owns the Tailwind import, `@theme`, global element baseline, font-face declarations, and CSS custom properties. Customer-specific red accent is set on the application shell; shared controls consume semantic CSS variables and therefore remain reusable by a future teal delivery app without a variant input.
- `shared-ui` remains presentational: typed `input()`/`output()` only, no generated client, app config, routing, auth, or domain-service injection. Overlay/dialog primitives use CDK and return typed results.
- `shared-util` may format a `MoneyDto` value passed in by a feature, but cannot decide currency conversion, calculate totals, or import `api-customer` if a plain structural input can avoid it.
- The catalog page owns its resource; a `RestaurantCardComponent` only renders data and emits navigation/selection intent. Do not move catalog state into `shared-ui`.

#### Expected folder/file ownership

- `projects/customer/src/styles.css`, `projects/customer/src/assets/fonts/`, and `projects/customer/src/app/ui/`: customer visual foundation and customer-only compositions.
- `projects/shared-ui/src/lib/{button,card,input,status-chip,spinner,empty-state,error-state,sheet,modal}/`: independent primitives, their specs, and public exports.
- `projects/shared-util/src/lib/{money.pipe,date-time-format}/`: generic display utilities and tests.
- `projects/customer/src/app/features/catalog/{components,pages}/`: catalog presentation only.

#### Step-by-step implementation sequence

1. Record the exact Tailwind/CDK versions selected and install only those approved dependencies; add a small build smoke test.
2. Create the CSS-first token contract and global reset with logical properties (`ps`, `pe`, `ms`, `me` equivalents) rather than left/right spacing.
3. Implement and test basic form/action/state primitives first, including disabled/busy handling and error retry emission.
4. Add CDK-based modal/sheet behavior with focus restoration, escape/backdrop rules, scroll containment, and reduced-motion-safe transitions.
5. Create generic money/date utilities with explicit null/undefined behavior; do not silently display a fabricated currency.
6. Refactor the restaurant list into page orchestration plus presentational card/state primitives, preserving its resource data flow and its loading/error/empty branches.
7. Exercise narrow, wide, touch, keyboard, and high-contrast/manual zoom layouts before closing the phase.

#### UX and design requirements

- Primary customer CTA red is interactive only; main actions are pill-shaped and at least 42px tall. Prices and delivery-time-like metadata must use body-sized or stronger text, never the `small` style.
- Use semantic headings, real buttons/links, text alternatives for images, visible keyboard focus, and `aria-live` only for dynamic status/error updates that warrant announcement.
- Restaurant cards use a stable image ratio and a neutral placeholder for null/broken `imageUrl`; no decorative image may block reading its restaurant name.
- The list must be usable at 320px viewport width and within a centered responsive container on larger screens. Respect `prefers-reduced-motion`.

#### Authentication and authorization behavior

None introduced. Public catalog remains public; primitives must not make assumptions about auth state.

#### API and contract considerations

Use only `CatalogApiService.getRestaurants()` and `RestaurantListResponse` already in use. Preserve `isActive`, nullable `imageUrl`, pagination fields, and existing `AppError` mapping; do not add manual HTTP access or reinterpret API status codes in components.

#### Testing strategy

- Unit-test token-sensitive primitive states (disabled, busy, error, selected status) and outputs.
- Test dialog/sheet focus trap, initial focus, escape dismissal, and focus restoration with Angular CDK test utilities or DOM-level assertions.
- Update catalog page/component tests for semantic list/card rendering and loading/error/empty/image-null paths.
- Perform an automated accessibility scan where an approved tool exists; otherwise document targeted keyboard and screen-reader manual checks for Phase 11.

#### Verification commands and manual checks

```powershell
cd D:\link-dev\talabat-frontend\talabat-web
npm test -- --watch=false
npx ng build customer --configuration=production
npx ng serve customer
```

Check `/restaurants` at 320px, 768px, and 1280px; tab through cards/retry controls; open and close each overlay primitive; test 200%, reduced-motion, and image-error behavior.

#### Definition of Done / exit criteria

Tailwind v4 builds; no Angular Material is added; shared primitives are domain-free and tested; catalog is FoodDash-styled while retaining explicit state handling; keyboard/focus/responsive checks pass.

#### Risks, assumptions, and decision gates

- **Gate:** approve a font source/license or accept a temporary system-font fallback.
- **Risk:** CSS utility use can bypass tokens. Mitigate through a documented token-first convention and component review.
- **Assumption:** no server-provided design assets are required for the milestone; restaurant `imageUrl` may be null.

#### Recommended Git commit message

`feat(ui): establish FoodDash tokens and shared primitives`

### Phase 6 — Secure OIDC authentication

#### Purpose and user value

Let customers sign in with the existing Identity host without exposing tokens to browser storage or untrusted origins, while making protected routes predictably return users to their intended destination.

#### Scope

Included:

- Select and verify one Angular-22-compatible OIDC authorization-code-with-PKCE client. Prefer a maintained library whose peer dependencies and callback/refresh behavior are proven against Angular 22; otherwise wrap `oidc-client-ts` in `core-auth`.
- Implement `AuthStore`, auth interceptor, callback and post-logout routes/pages, `authGuard`, sign-in/sign-out commands, state restoration, and startup/session restoration.
- Use runtime `APP_CONFIG` values for authority, client ID, scopes, and exact API-origin token attachment.
- Add customer app navigation affordances for sign in/sign out and authenticated status.

Excluded/deferred:

- Local username/password forms, token persistence in `localStorage`/`sessionStorage`, role-management UI, account registration UI, delivery authorization, and silent scope escalation.

#### Prerequisites and dependencies

Phase 5 must exit so user-visible auth state uses established primitives. The backend hosts and trusted development certificate must be available for live flow verification. Confirm the registered customer callback URLs are exactly `http://localhost:4200/signin-callback` and `/signout-callback`.

#### Architecture and technical decisions

- `core-auth` owns the OIDC integration and exposes readonly signals such as authentication state/access token plus methods, guards, and provider setup. It never imports an app feature or generated client.
- Access/refresh tokens live in memory and only in the OIDC library's minimum safe transient mechanism required for redirect completion; no application-owned browser persistence. Document the chosen library's redirect-state storage behavior and security rationale.
- `authInterceptor` is a functional interceptor. It must attach `Authorization: Bearer` only when `request.url.startsWith(APP_CONFIG.customerApiBaseUrl)`; identity, static assets, and all other origins receive no customer token.
- Route target is preserved in OIDC state or a validated internal return URL. Never redirect to an arbitrary URL from a query parameter.

#### Expected folder/file ownership

- `projects/core-auth/src/lib/{auth.store,auth.interceptor,auth.guard,oidc.provider,auth-callback}/` and `public-api.ts`: reusable auth infrastructure.
- `projects/customer/src/app/features/auth/pages/`: thin callback/signout status views and routes, if a component is needed.
- `projects/customer/src/app/layout/`: sign-in/out controls only; no token logic.
- `projects/customer/src/app/app.config.ts` and `app.routes.ts`: providers, interceptor ordering, and callback routes.

#### Step-by-step implementation sequence

1. Produce a short compatibility decision record with library version, Angular peer compatibility, PKCE, refresh-token rotation behavior, callback storage behavior, and test approach. Stop for an alternative if no safe client is viable.
2. Add auth configuration derived solely from `APP_CONFIG`; initialize the client after runtime config is ready.
3. Implement readonly signal auth state and command methods; normalize OIDC library events/errors to safe application messages.
4. Add sign-in callback route that processes exactly one response, validates state/nonce/PKCE, removes sensitive callback parameters from the address bar, and restores a validated internal destination.
5. Add guarded routes and sign-out callback; clear in-memory application auth state on failed refresh, callback validation failure, and completed logout.
6. Add the exact-prefix auth interceptor after correlation ID and before/alongside error normalization so generated-client requests receive the token and errors still become `AppError`.
7. Prove public catalog is usable anonymous, protected navigation prompts sign-in, and token leakage does not occur for identity/static/foreign URLs.

#### UX and design requirements

Use brief, accessible callback progress/error pages. Buttons must show busy state during redirects and avoid duplicate trigger clicks. Auth failures must say what the user can do (retry sign-in) without showing raw protocol errors, tokens, identity error descriptions, or correlation data.

#### Authentication and authorization behavior

- Customer scope is exactly runtime-configured `openid profile roles customer.api offline_access` for the registered `talabat-customer-spa` client.
- Authentication is required before any `/api/me/*` journey; catalog stays public.
- A 401/invalid session clears customer auth state once and offers reauthentication. A 403 is displayed as an authorization failure, not retried as login indefinitely.
- Token refresh must respect server refresh-token rotation. If refresh fails, require a fresh authorization redirect.

#### API and contract considerations

The generated services already know OAuth security but do not own token storage. Verify at runtime that a token reaches only customer API calls and that `GET /api/me/profile` is authorized. Do not edit `projects/api-customer` or configure generated `Configuration.accessToken` as a competing token path.

#### Testing strategy

- Unit-test config mapping, internal-return URL validation, guard decisions, auth-interceptor origin matching, expired/refresh-failure transitions, and logout cleanup with an OIDC adapter fake.
- Component-test callback/loading/error views.
- Add an integration test that a generated customer API request carries bearer auth only for the configured base prefix.
- Manual browser test: login, reload, expiry/failed refresh simulation, logout, back-button behavior, and callback tampering/error response.

#### Verification commands and manual checks

```powershell
cd D:\link-dev\talabat-frontend\talabat-web
npm test -- --watch=false
npx ng build customer --configuration=production
npx ng serve customer
```

With Identity and Customer API running, test anonymous `/restaurants`, protected route redirect/login/return, `/signin-callback`, sign out, and confirm in browser network tools that no bearer token is sent to Identity or non-customer origins.

#### Definition of Done / exit criteria

OIDC/PKCE sign-in, callback, refresh failure, logout, guard redirect, and exact-origin token scoping are tested and manually verified against local hosts. No token is written by application code to `localStorage` or `sessionStorage`.

#### Risks, assumptions, and decision gates

- **Gate:** an OIDC package must be confirmed safe and compatible with Angular 22 before installation; this is the highest-risk phase.
- **Gate:** Identity client registration, CORS, certificate trust, and redirect URLs must match the runtime config.
- **Risk:** refresh-token persistence requirements may conflict with memory-only policy; escalate rather than silently weakening token handling.

#### Recommended Git commit message

`feat(auth): add PKCE customer authentication and route guards`

### Phase 7 — Customer shell, profile gate, and menu

#### Purpose and user value

Turn the authenticated foundation into a coherent customer experience: new customers complete the mandatory profile once, returning customers reach the catalog, and either can view a restaurant menu and begin an order.

#### Scope

Included:

- Customer layout with accessible header/navigation, route outlet, mobile-safe persistent cart FAB, and user menu/sign-out composition.
- `ProfileStore` and profile guard that probes `GET /api/me/profile` once after authentication and caches the resulting profile/no-profile state.
- Onboarding form using Signal Forms to call `createProfile`; gated route behavior and recovery from `ProfileNotCreated`.
- Restaurant-menu route/page, `getRestaurantMenu()` resource, product list, availability state, and an add-to-cart entry interaction that delegates actual cart mutation to Phase 8's store boundary.
- An explicit handoff contract/UI affordance for adding the first product; a temporary disabled/non-mutating affordance is not acceptable at phase exit. Phase 8 implementation may begin only after this phase's route/UI/API boundaries are settled.

Excluded/deferred:

- Cart mutation logic, cart page, checkout, profile editing, addresses, restaurant search/filtering, reviews, delivery estimates, and direct checkout.

#### Prerequisites and dependencies

Phase 6 must pass live authenticated API verification. Phase 5 primitives must exist. Profile behavior is constrained by `GetProfile` 404 semantics and by profile-protected API endpoints returning 409/`ProfileNotCreated`.

#### Architecture and technical decisions

- `ProfileStore` belongs in `core-auth` because it is cross-feature authorization/onboarding state, but it may inject `CustomerApiService`; `core-auth` remains below app features and may depend on `api-customer` under the documented dependency direction. If that dependency is judged too broad, put a thin customer-profile boundary in the customer app and keep only the generic guard in core-auth; choose one and document it before coding.
- The profile guard runs after `authGuard`, invokes `ensureLoaded()` once per signed-in session, returns an `UrlTree` to `/onboarding`, and permits the onboarding/callback/logout routes to avoid loops.
- `catalog` remains feature-isolated. Its menu route owns server resource state. No cart page imports catalog components; menu supplies only stable product identifiers/restaurant identifier to an app-level cart façade introduced next phase.
- The shell owns the FAB placement and navigation only. It reads a readonly cart count signal; it must not contain cart mutation code.

#### Expected folder/file ownership

- `projects/core-auth/src/lib/profile.{store,guard}.ts`: profile-session boundary and tests, if the dependency decision above is accepted.
- `projects/customer/src/app/layout/`: shell, navigation, and cart FAB.
- `projects/customer/src/app/features/onboarding/`: routes, page, Signal Form, components.
- `projects/customer/src/app/features/catalog/{routes.ts,pages,components}/`: list/menu pages, cards, product components.
- `projects/customer/src/app/app.routes.ts`: lazy feature routes and guard composition.

#### Step-by-step implementation sequence

1. Define route map: public `/restaurants` and `/restaurants/:restaurantId`; callback routes; guarded `/onboarding`, `/cart`, `/checkout`, `/orders`, `/profile`; add an explicit wildcard/not-found route.
2. Implement profile state and once-only probe. Treat only the documented `GET profile` 404 as no profile; surface other errors with retry rather than redirecting blindly.
3. Add `authGuard` then `profileGuard` to profile-required features. Ensure onboarding is auth-required but profile-guard-exempt.
4. Build onboarding with Signal Forms, accessible validation, server-error mapping, submit busy protection, and post-success profile cache update followed by internal navigation.
5. Build the customer shell and only show the persistent FAB when cart state is meaningful; reserve safe-area space so it never hides controls.
6. Add restaurant-menu route/resource with not-found, loading, retry, empty, unavailable-product, image-alt/fallback, and keyboard behavior.
7. Specify and expose the narrow `add(product, restaurant)` action boundary consumed in Phase 8; verify it does not create a feature-to-feature import.

#### UX and design requirements

- Onboarding fields use labels, visible required/error text, correct input mode/autocomplete, focus the error summary/first invalid control on failed submit, and preserve entered values after a server error.
- Menu products use 1:1 image slots, accessible name/price/availability, no enabled add control for `isAvailable: false`, and touch controls at least 42px.
- The cart FAB is persistent, labelled with item count, reachable by keyboard, and does not obscure bottom content. On mobile it remains within thumb reach above safe-area insets.

#### Authentication and authorization behavior

Catalog list/menu are public. Onboarding and all features that mutate or read `/api/me/*` require authentication. Profile guard only redirects after the defined profile probe; an expired auth state first follows the auth guard path.

#### API and contract considerations

- `CustomerApiService.getProfile`, `createProfile`, `ProfileResponse`, `CreateProfileRequest` govern onboarding. Inputs are `fullName`, integer `age`, optional `phoneNumber`; field rules not expressible in the OpenAPI schema must be confirmed from backend validation before duplicating them client-side.
- `CatalogApiService.getRestaurantMenu({ restaurantId })` returns `MenuResponse` and can return 404. `MenuProductDto` supplies `id`, `name`, `description`, `price`, and `isAvailable`; no category, allergens, modifiers, or delivery estimate exists.
- Map `ProfileNotCreated` deliberately. Add typed application error codes only when a phase has a user action for them; retain `Unknown` fallback.

#### Testing strategy

- Unit-test profile-store cache/probe paths (200, 404, network, 401/403) and guard loop prevention.
- Test Signal Form validation, successful create/cache/navigation, server validation error, and duplicate submit handling.
- Component/integration-test menu resource states, unavailable product behavior, and route parameter changes.
- Test shell FAB accessibility and count rendering with a fake readonly cart signal.

#### Verification commands and manual checks

```powershell
cd D:\link-dev\talabat-frontend\talabat-web
npm test -- --watch=false
npx ng build customer --configuration=production
```

Manual: anonymous browse/list/menu; new account login → onboarding → menu; returning account login → requested protected route; direct `/onboarding` after profile; invalid restaurant; unavailable product; mobile FAB and keyboard navigation.

#### Definition of Done / exit criteria

New and returning authenticated flows reach their correct destination without redirect loops. Menu content comes solely from the generated client and presents all explicit state variants. The cart entry boundary is isolated and ready for Phase 8.

#### Risks, assumptions, and decision gates

- **Gate:** decide and document whether customer-specific `ProfileStore` belongs in `core-auth` or the customer app before adding a `core-auth → api-customer` dependency.
- **Assumption:** only a basic profile is needed before order journeys; no address is required at onboarding.
- **Risk:** backend `GetProfile` documents 404 but profile-required calls return 409; tests must retain both pathways.

#### Recommended Git commit message

`feat(customer): add profile-gated shell and restaurant menu`

### Phase 8 — Server-backed cart

#### Purpose and user value

Allow a customer to form and revise an order with a cart that remains truthful across menu, shell, and cart screens and respects the backend's one-restaurant rule.

#### Scope

Included:

- `CartStore` with private writable state, public readonly cart/count/operation signals, explicit load/add/update/remove/clear methods, and server-result replacement after every mutation.
- Cart route/page, item rows, quantity controls, remove/clear confirmation, empty state, and a shared cart FAB badge.
- Menu add-to-cart action, first-add loading/success/error feedback, and cross-restaurant conflict interaction.
- Revalidation/loading behavior after sign-in, profile creation, successful checkout, and recoverable mutation errors.

Excluded/deferred:

- Guest carts, offline persistence/synchronization, optimistic price/total authority, multiple restaurants, item notes/modifiers, coupons, payment, and direct checkout bypass.

#### Prerequisites and dependencies

Phase 7 establishes authenticated menu context/profile gate and shell FAB. Before this phase, inspect generated service parameter types for `getCart`, `addCartItem`, `updateCartItemQuantity`, `removeCartItem`, and `clearCart` so the store conforms to the generated shape, not a copied older example.

#### Architecture and technical decisions

- Put `CartStore` under `projects/customer/src/app/features/cart/cart.store.ts` because it is customer-app domain state, not shared infrastructure. It can be root-provided but its public API is readonly signals and methods only.
- Use generated `CartApiService`; adapt observable requests in one store-level helper with cancellation/operation serialization semantics, not in pages. Preserve server response as the source of cart item prices and total.
- Do not expose a mutable cart signal. Avoid fully optimistic mutations unless a documented rollback and conflict UX are introduced; server-confirmed replacement is safer for current operations.
- Catalog calls the cart store/facade through a stable API, but cart must not import catalog page/components. The shell reads cart count only.

#### Expected folder/file ownership

- `projects/customer/src/app/features/cart/{cart.store.ts,routes.ts,pages,components}/`: all cart state/UI/tests.
- `projects/customer/src/app/features/catalog/`: menu calls the public cart action but owns no cart display model.
- `projects/customer/src/app/layout/`: reads cart count/navigation only.
- `projects/shared-ui/`: reusable confirmation/error/empty primitives only, if an existing primitive needs a generic extension.

#### Step-by-step implementation sequence

1. Define CartStore state model for not-yet-loaded, loading, available, empty/no cart, mutation in progress, and latest recoverable error. Decide the treatment of `GetCart` 404 from the live contract before coding empty handling.
2. Load/reload cart on first authenticated protected entry and after successful profile onboarding; reset state on logout.
3. Wire menu add using `{ restaurantId, productId, quantity: 1 }`; disable duplicate presses while that product mutation is active and replace state from the response.
4. Implement cart page quantity change using `UpdateCartItemRequest`, remove, and clear confirmation. Serialize conflicting operations so a late response cannot overwrite newer state.
5. Map owned errors: `CrossRestaurantCart` to a user decision (keep current cart or clear then add), `ProductUnavailable` to an actionable product state, invalid quantity/item/cart errors to reload/retry messaging. Do not branch on a raw status.
6. Keep checkout CTA as a navigation handoff, not a checkout implementation. Update the FAB and route state after every server-confirmed result.

#### UX and design requirements

- Cart rows expose product name, unit price, quantity, line total, and accessible increment/decrement/remove controls. Use live announcements sparingly for confirmed quantity changes.
- Ensure destructive clear/remove actions require intentional confirmation where accidental data loss is likely; on mobile use an accessible bottom sheet.
- Empty cart provides a clear return to restaurants. Loading preserves layout enough to avoid abrupt FAB/page shifts. Mutation error gives retry/reload choices appropriate to its code.
- Display `CartResponse.total` and line totals, never a recalculated total presented as authoritative.

#### Authentication and authorization behavior

Cart route and mutations require `authGuard` then `profileGuard`. On a `ProfileNotCreated` defense-in-depth error, refresh profile state and send the user to onboarding only if the once-only profile probe confirms no profile; do not discard cart state silently.

#### API and contract considerations

- Relevant API: `CartApiService.getCart`, `addCartItem`, `updateCartItemQuantity`, `removeCartItem`, `clearCart`; `CartResponse`, `CartLineItemDto`, `AddCartItemRequest`, `UpdateCartItemRequest`.
- `AddCartItemRequest` requires restaurant/product IDs and quantity; a cart can reject cross-restaurant additions with 409 and unavailable products with 422.
- `ClearCart` and `RemoveCartItem` return `Observable<void>` on their 204 endpoints. Reload/refetch or deterministically update only after successful completion; never assume a response body.
- Confirm exact serialized error codes against the running backend. Add an `AppErrorCode` value only with its UI handling and test.

#### Testing strategy

- Unit-test store state transitions, operation serialization, server replacement, reset on logout, and each owned error mapping using generated-service fakes.
- Component-test quantity boundary/disabled behavior, remove/clear confirmations, empty/error/retry, and mobile FAB count.
- Integration-test menu add propagates to cart route/FAB without catalog-to-cart component imports.

#### Verification commands and manual checks

```powershell
cd D:\link-dev\talabat-frontend\talabat-web
npm test -- --watch=false
npx ng build customer --configuration=production
```

Manual: add one item; add again; change quantity; remove; clear; reload and revisit cart; attempt different restaurant; force unavailable product; sign out and confirm in-memory state clears.

#### Definition of Done / exit criteria

Cart count, page, and menu use the same server-backed state. All mutations have explicit pending/error behavior, enforce the one-restaurant backend rule, and leave no client-authored authoritative total.

#### Risks, assumptions, and decision gates

- **Gate:** establish actual `GetCart` behavior when no cart exists (200 empty vs 404) from a live service; the OpenAPI has 404 but no response body model.
- **Risk:** concurrent taps/requests can regress state; mutation sequencing must be covered by tests.
- **Assumption:** quantity bounds beyond integer validity are backend-owned until the contract exposes them.

#### Recommended Git commit message

`feat(cart): add server-backed customer cart`

### Phase 9 — Checkout and confirmation

#### Purpose and user value

Complete the order commitment flow with address selection, truthful server outcomes, and recovery from stock changes—without inventing payment or pricing logic.

#### Scope

Included:

- Guarded checkout route/page that reads the current cart and profile addresses, requires an existing address or directs the user to the supported address flow, and selects `deliveryAddressId`.
- Server checkout request, pending-submit lock, success confirmation route/view, cart refresh/reset, and navigation to order detail when supported.
- Explicit `422 CheckoutUnavailableResponse` display listing unavailable items/reasons and an action to return to/reload cart.
- Safe rendering and recovery for Problem Details such as empty cart, inactive/closed restaurant, expired/inactive cart, address not found, concurrency conflict, network failure, 401/403, and profile gate errors.

Excluded/deferred:

- Payments, payment authorization, gratuity, cancellation, delivery ETA/tracking, receipt download, notifications, and post-order recommendations.

#### Prerequisites and dependencies

Phase 8 cart behavior must exit. At least one address must be createable through Phase 10's shared address form boundary; if Phase 10 is not yet implemented, this phase may include the minimal address-create sheet strictly needed to unblock checkout, then Phase 10 consolidates it. Do not build a second address implementation.

#### Architecture and technical decisions

- Checkout stays in `features/checkout` with a local signal-based submission state. It reads the CartStore's readonly data and invokes `CheckoutApiService`; it does not calculate totals or change cart state directly except through documented CartStore refresh/reset commands after response.
- Address selection uses profile-held `AddressDto`/`AddressResponse` data. A reusable customer-app address form component can live under `features/profile/components` only if checkout consumes it through an app-level UI boundary rather than importing profile orchestration.
- Success route should accept only a validated numeric `orderId` returned by the response (route parameter or navigation state). It must be reload-safe by fetching `getOrderDetails`, not rely solely on transient navigation data.

#### Expected folder/file ownership

- `projects/customer/src/app/features/checkout/{routes.ts,pages,components,checkout.store.ts?}/`: checkout-specific state and views.
- `projects/customer/src/app/features/cart/cart.store.ts`: documented post-checkout refresh/reset methods.
- `projects/customer/src/app/features/profile/components/address-form.component.ts`: only if a reusable presentational address form is introduced; no checkout imports profile page/store.
- `projects/customer/src/app/features/orders/`: may be created now only for read-only success/detail handoff shared with Phase 10.

#### Step-by-step implementation sequence

1. Define checkout route guards and preconditions: authenticated profile, non-empty loaded cart, and a selected valid address. Provide deterministic redirects/return paths for each missing precondition.
2. Render server-supplied cart lines and total, address radio selection, and an inline route to add an address if none exists.
3. Submit exactly one `CheckoutRequest { deliveryAddressId }` while pending. Disable/label submit and block duplicate navigation submission.
4. On 201, capture `orderId`, invalidate/reload cart, announce confirmation, and navigate to reload-safe confirmation/order detail.
5. On 422, parse the generated unavailable response rather than treating it as `AppError`; show named items/reasons and return to cart/menu recovery.
6. Map relevant typed Problem Details to distinct safe actions; retain a general error/retry state for unknown/network failures.
7. Test rapid clicks, stale cart/address, browser refresh at success route, and back navigation.

#### UX and design requirements

- Checkout keeps the primary CTA in the mobile thumb zone, with a clear selected address, address change/add affordance, cart summary, and server total.
- Use radio semantics for address selection. Error summary must link/focus the missing selection/address action. Never imply payment was processed.
- Confirmation provides order ID in mono styling, a success status, and clear links to the supported order detail/history—not tracking promises.
- Unavailable results must preserve context and explain what changed; do not erase the cart before the user sees recovery choices.

#### Authentication and authorization behavior

Requires `authGuard` then `profileGuard`. Handle session loss mid-submit safely: no success UI without a 201 response. Do not retry a potentially successful checkout automatically after a network interruption; offer order-history verification/reload to avoid duplicate orders.

#### API and contract considerations

- `CheckoutApiService.checkout({ checkoutRequest })` (inspect generated parameter name before implementation) returns `CheckoutSuccessResponse` for 201 and has a generated response model for the explicit 422 outcome.
- The generated client may surface non-2xx 422 as an `HttpErrorResponse`; create one central, typed adapter at checkout boundary that recognizes the documented `CheckoutUnavailableResponse` without changing global Problem Details behavior.
- `CheckoutSuccessResponse` contains only `orderId` and `status`; do not derive confirmation totals/status from it.
- Current backend source attempts delivery creation after checkout but catches/logs delivery creation failures; the customer UI must treat checkout 201 as success and must not expose courier state.

#### Testing strategy

- Unit-test preconditions, submit lock, 201 cart invalidation/navigation, 422 unavailable parsing, all owned Problem Details mappings, and unknown/network outcome.
- Component-test radio/accessibility/error focus, no-address action, success/refresh-safe view, and unavailable item list.
- Integration-test cart → checkout → mocked 201 → order detail; test a repeated submit cannot issue two requests.

#### Verification commands and manual checks

```powershell
cd D:\link-dev\talabat-frontend\talabat-web
npm test -- --watch=false
npx ng build customer --configuration=production
```

Manual: no-cart/no-address redirects; selected address checkout; 201 confirmation/reload; induced 422; invalid address; duplicate click; offline/network interruption; browser back/refresh.

#### Definition of Done / exit criteria

Checkout sends only the selected address ID, treats backend totals/outcomes as authoritative, prevents duplicate submission, and offers clear verified recovery for unavailable and Problem Details outcomes.

#### Risks, assumptions, and decision gates

- **Gate:** inspect the generated checkout method's error-body behavior and prove 422 parsing with a real/mock contract fixture before final UI coding.
- **Gate:** decide whether a minimal address-create sheet ships here or Phase 10 precedes this phase; it must be one reusable form, not duplicate flows.
- **Risk:** a network timeout may follow a committed backend order. Never auto-resubmit.

#### Recommended Git commit message

`feat(checkout): place orders with unavailable-item recovery`

### Phase 10 — Account, addresses, and orders

#### Purpose and user value

Give customers the supported self-service tools to maintain order prerequisites and review their completed transactions.

#### Scope

Included:

- Profile page/edit form using `UpdateProfileRequest`, profile cache synchronization, and server validation handling.
- Address list/create/default/remove flows using generated address APIs; reuse the checkout-compatible address form and protect default/removal decisions.
- Order history and order-detail routes/pages with explicit loading, empty, error, and not-found states.
- Navigation between confirmation, history, and detail using numeric order IDs.

Excluded/deferred:

- Changing an address after an order, order cancellation/tracking/status timeline, pagination controls beyond what generated contract supports, restaurant detail/name lookup for orders, saved payment methods, notifications, and account deletion.

#### Prerequisites and dependencies

Phase 9 exits with a canonical checkout/address boundary. The generated client must remain the sole API access layer. Confirm actual backend response/error payloads for duplicate addresses, default/remove conflict, invalid profile/address, and order-not-found before finalizing user messages.

#### Architecture and technical decisions

- Keep account/profile/address orchestration under `features/profile`; keep orders under `features/orders`. They do not import each other. Checkout can consume only a presentational address-form component or route return contract.
- Use a ProfileStore cache mutation/refetch after profile/address success. Do not mirror every server resource globally: orders use their page resources and reload after navigation/mutation where needed.
- Order list currently has page/pageSize fields in its response but no documented generated query parameters. Render the returned list and do not expose paging controls until contract support is verified.
- Order DTOs have restaurant IDs but no restaurant display names/status. Display only what is known (order ID, placed time, item count, total; on detail, delivery address/items/total) rather than performing N+1 catalog lookups or fabricating labels.

#### Expected folder/file ownership

- `projects/customer/src/app/features/profile/{routes.ts,pages,components,profile.store.ts?}/`: profile and address UI/state.
- `projects/customer/src/app/features/orders/{routes.ts,pages,components}/`: list/detail read paths.
- `projects/customer/src/app/features/checkout/`: only the checkout return integration; no profile/page imports.
- `projects/shared-util/`: generic money/date formatting only.

#### Step-by-step implementation sequence

1. Define profile and order routes under the shell, all lazy and guarded in auth/profile order; preserve `orderId` route validation.
2. Build profile Signal Form pre-populated from cached/profile resource data. Submit update, refresh cache, handle server validation/unknown errors, and avoid discarding unsaved edits silently.
3. Build one address form with fields `street`, `city`, `buildingNumber`, optional `floor`, and `makeDefault`; use it for create plus checkout entry. Validate client-required fields and map field-level/server errors accessibly.
4. Add set-default and remove flows. Confirm before a destructive remove; if removal affects checkout selection, update route state explicitly.
5. Build order list resource with empty/error/retry and list semantics. Use response pagination metadata only as display/context until API query support exists.
6. Build order detail resource with not-found handling and snapshot items/address/total. Link from confirmation/history; no unsupported status/tracking UI.
7. Add profile-cache invalidation/refresh rules and test cross-route effects.

#### UX and design requirements

- Account forms have correct autocomplete hints and editable/read-only state announcements. Address cards mark default status visually and textually, never only by color.
- Order history is an accessible list with meaningful link names. IDs use mono styling; values use readable date/money formatting; empty history has a restaurant-browse CTA.
- Details use semantic headings/list/table patterns appropriate to mobile, with no horizontal overflow at 320px. An unavailable image or missing optional phone/floor is rendered gracefully.

#### Authentication and authorization behavior

All phase routes require valid auth and a customer profile. A 401 clears auth through shared behavior; a 404 order/detail is treated as a safe unavailable/not-found page with a history return; 403 is not exposed as a false not-found unless product security requires that wording.

#### API and contract considerations

- `CustomerApiService.updateProfile`, `AddressesApiService.addAddress/removeAddress/setDefaultAddress`, and `CustomerApiService.getProfile` are the account contract.
- `OrdersApiService.getOrders` and `getOrderDetails` supply the only order data. `OrderSummaryDto.itemCount` must be rendered as supplied (backend currently may return `0`); do not calculate it from unavailable detail data.
- `AddressResponse`/`AddressDto` shapes are similar but use the generated type per service response. `RemoveAddress` is 204; update local/cache state only after success then reconcile with profile reload.
- Expected relevant domain codes include `InvalidCustomerProfile`, `InvalidAddress`, `DuplicateAddress`, `AddressNotFound`, and `OrderNotFound`, but final mapping must be verified on actual wire responses before declaring code-specific UI complete.

#### Testing strategy

- Store/form tests for profile hydration/update, required field behavior, server field errors, and cache reconciliation.
- Address create/default/remove tests including 204 and confirmation cancellation.
- Order list/detail tests for response data, empty, retry/network, 404, invalid route ID, and link navigation.
- Integration tests covering new address → checkout selection and checkout confirmation → order detail/history.

#### Verification commands and manual checks

```powershell
cd D:\link-dev\talabat-frontend\talabat-web
npm test -- --watch=false
npx ng build customer --configuration=production
```

Manual: edit profile; add address/default/remove; complete checkout using address; empty and populated history; direct invalid/missing order URL; 200% zoom and keyboard/form checks.

#### Definition of Done / exit criteria

Profile, address, order-list, and order-detail functions only expose contract-supported data/actions, synchronize after successful changes, and provide complete accessible state handling and tests.

#### Risks, assumptions, and decision gates

- **Gate:** verify wire-level domain error codes for address/profile/order paths; the OpenAPI ProblemDetails schema alone is insufficient.
- **Assumption:** lack of order status/restaurant name is intentional current API scope; do not add catalog lookups without product approval.
- **Risk:** profile cache can become stale across address mutations; always reconcile from a returned response or explicit profile reload.

#### Recommended Git commit message

`feat(account): add addresses, profile, and order history`

### Phase 11 — Release hardening and customer milestone

#### Purpose and user value

Prove that the completed customer journeys are safe, accessible, performant, diagnosable, and deployable—not merely locally demoable.

#### Scope

Included:

- Establish an approved e2e runner and one critical authenticated customer-order happy path, with a safe seeded/test identity strategy.
- Resolve the baseline verification timeout and define CI commands/time budgets for unit, build, generated-client verification, and e2e checks.
- Audit routes, lazy chunks, production budgets, runtime config failure, error observability, accessibility, mobile responsiveness, keyboard behavior, security/token boundaries, and generated-client regeneration workflow.
- Document deployment/runtime-config handoff and regression checklist; fix defects discovered within Phases 5–10 scope only.

Excluded/deferred:

- New business features, performance work without measured evidence, SSR/PWA, analytics, monitoring vendor integration, delivery app implementation, and backend changes except a contract blocker formally escalated to backend owners.

#### Prerequisites and dependencies

All customer feature phases have met their own exit criteria. A test environment with Identity/Customer API, predictable catalog data, and a provisioned customer identity/profile/address is required for meaningful e2e coverage.

#### Architecture and technical decisions

- Keep unit/component/integration tests adjacent to source; place e2e tests in a single explicitly configured workspace location and add a package script/Angular target only after choosing the runner.
- Keep all features lazy from `app.routes.ts`; use `@defer` only for measured non-critical UI, never to hide a required state/error control.
- Preserve production budgets already configured (500 kB warning/1 MB error initial; 4/8 kB component-style) until measured evidence justifies a reviewed change.
- Runtime config remains a deployed asset. No build-time `environment.ts` substitutes, credentials, or environment-specific API URLs may be introduced.

#### Expected folder/file ownership

- `talabat-web/package.json`, `angular.json`, and a new explicit e2e config directory: test commands/targets only.
- `projects/customer/src/app/**/**/*.spec.ts`, library specs: regressions found in owned code.
- `docs/` is not expanded by this phase unless a release/operator runbook is explicitly requested; this roadmap is the execution contract.
- `openapi/`, `tools/`, generated source: only through the documented regeneration workflow for a backend-approved contract update.

#### Step-by-step implementation sequence

1. Diagnose the prior timed-out verify/test/build command separately: run API verify, customer unit test, and production build independently with captured timing/output. Fix only configuration/test defects relevant to current scope.
2. Select and configure an e2e runner compatible with the workspace and CI; document browser installation, base URL, backend seed/cleanup, and secrets handling. Do not use a developer's personal account.
3. Implement one order happy path: authenticate test user, ensure profile/address, add catalog item, view cart, checkout, confirm/order detail. Add a second negative path for a high-risk condition (expired/unauthorized session or unavailable checkout) if the environment can deterministically induce it.
4. Run accessibility checks on all routes and manually inspect keyboard focus, dialogs, form errors, zoom, touch targets, reduced motion, and responsive widths.
5. Audit security: only runtime config exposes public IDs/URLs; exact-prefix interceptor behavior; no browser token persistence; callback URL validation; no raw backend details in UI; no API client manual changes.
6. Run production build and inspect bundle/budget output. Address only concrete regressions (oversized imports, eager feature imports, unnecessary assets), then remeasure.
7. Exercise runtime-config missing/malformed/unreachable behavior, backend unavailable behavior, and correlation ID availability in network/log correlation.
8. Run regeneration checks (`api:copy`, generator build, generation/verify) only against a clean committed contract; ensure any generated diff is isolated and reviewed.

#### UX and design requirements

The complete route map must have no blank/stranded state: each async screen displays loading, retryable error where safe, and meaningful empty/not-found state. All touch controls meet minimum size; every modal/sheet has predictable focus and dismissal; no color-only status/error meaning; core ordering journey works at mobile viewport, desktop responsive layout, keyboard-only, and 200% zoom.

#### Authentication and authorization behavior

Verify the whole protected-route matrix: anonymous public catalog, sign-in return destination, authenticated no-profile onboarding, authenticated profiled feature access, expired-session cleanup, logout, forbidden behavior, and a proof that bearer tokens never leave the configured customer API prefix.

#### API and contract considerations

Run `npm run api:verify` as a guard. For a backend contract update, copy both OpenAPI specs, build the custom generator, regenerate customer code, inspect service/model/error changes, run verification/build/tests, and commit generated changes separately. Never repair a contract discrepancy by editing `projects/api-customer/src`.

#### Testing strategy

- Full unit suite for guards, errors, stores, and logic-bearing components.
- Route/component integration suite for core resource and form states.
- E2E happy path plus a deterministic high-risk negative path.
- Contract/regeneration tooling tests (`npm run test:openapi-tools`, `npm run api:verify`) and production build.
- Accessibility regression checks integrated where tool support is selected, augmented by manual acceptance checks.

#### Verification commands and manual checks

```powershell
cd D:\link-dev\talabat-frontend\talabat-web
npm run test:openapi-tools
npm run api:verify
npx ng test customer --watch=false
npx ng test core-config --watch=false
npx ng test core-auth --watch=false
npx ng test core-http --watch=false
npx ng test shared-ui --watch=false
npx ng build customer --configuration=production
# Run the approved e2e command added by this phase.
```

Run the full customer acceptance flow against local/staging hosts, including configuration failure, network loss, mobile/desktop/keyboard/zoom, and security network-header inspection.

#### Definition of Done / exit criteria

All verification commands complete within agreed CI time budgets; production build respects budgets; generated-client checks pass; e2e proves a realistic order journey; accessibility/security/manual acceptance checks pass; no unresolved Phase 5–10 defects remain. This exits at the customer ordering milestone.

#### Risks, assumptions, and decision gates

- **Gate:** choose an e2e runner and provide isolated test data/identity/cleanup before automated browser tests can be reliable.
- **Gate:** CI time budget and platform must be agreed when resolving the current timed-out verification.
- **Risk:** live backend availability/certificates make e2e flaky; use health preflight and deterministic seeded data rather than retries that mask defects.
- **Assumption:** existing production budgets remain appropriate until measurements prove otherwise.

#### Recommended Git commit message

`chore(customer): harden release quality gates`

## 5. Cross-cutting implementation standards

### Angular components and state

- Use standalone components, `inject()`, `input()`/`output()`/`model()`, `@if`/`@for`/`@switch`, signals, and zoneless-safe UI updates. Do not add NgModules, constructor injection, `BehaviorSubject` component state, or template method calls.
- Pages orchestrate resources/stores; presentational components take typed data and emit intents. One public symbol per file; no feature barrel files.
- Private writable signals; public readonly signals/computed state. Server reads use one consistent signal-resource adapter selected after Phase 4 review; server mutations live in a store/facade, never directly in a template or presentational component.
- Every asynchronous view explicitly renders loading, error, and empty/not-found states. Do not use non-null assertions on API values.

### Routing and lazy loading

- All features load lazily from `app.routes.ts`; feature routes own pages below their lazy boundary. Add explicit callback, logout, onboarding, not-found, and safe error outcomes.
- Guard order is always `authGuard`, then `profileGuard`. Public catalog/menu routes are never accidentally gated. Validate route parameters before use.
- Preserve only validated internal return URLs. Use route redirects/`UrlTree`, not imperative navigation from guards.

### Generated-client boundary

- `projects/api-*` is generated and immutable by hand. Feature/core code calls generated services only; no feature injects `HttpClient`.
- Configure `BASE_PATH` from runtime `APP_CONFIG`; never hardcode API URLs. API changes begin with backend contract change and regeneration, then isolated generated-code review.
- Do not duplicate generated DTOs as handwritten interfaces unless a feature-local UI view model is necessary; map it in the feature/store and keep the conversion explicit.

### Errors, loading, retry, and offline-aware behavior

- Global interceptor maps transport/Problem Details to `AppError`; feature code branches on typed owned `AppErrorCode` values, never raw code strings/status alone. Unknown codes remain safe generic errors.
- The documented checkout 422 response is not Problem Details and requires an explicit typed checkout adapter.
- Offer retry for idempotent reads and safe failed mutations where an automatic retry cannot duplicate a side effect. Never auto-retry checkout after ambiguous network failure.
- Status 0/network failure gets clear reconnect/retry messaging. Do not add offline queueing/persistence without a distinct requirement; this is not a PWA phase.

### Forms and validation

- Use Signal Forms only. Keep form model and field errors typed; validate required/basic format/number constraints client-side for usability, while backend remains authoritative.
- Display server validation near affected fields plus an accessible summary when appropriate. Preserve inputs after rejected submission; use `autocomplete`, input mode, labels, and real button semantics.

### Accessibility and responsive design

- Target semantic HTML, visible focus, keyboard operation, focus management for overlays, reduced motion, color-independent feedback, robust labels/errors, and appropriate live announcements.
- Use FoodDash tokens and CSS logical properties. Customer app is responsive/mobile-first through desktop; 42px minimum target, persistent cart access, and bottom safe-area spacing apply.
- Never use small typography for prices/times. Test at 320px, 768px, 1280px, keyboard-only, and 200% zoom for each feature phase.

### Tailwind and design token rules

- Tailwind v4 is CSS-first; tokens live centrally, and utilities/components consume tokenized values rather than arbitrary one-off values. Angular CDK supplies behavior only; Angular Material is excluded.
- Shared UI has no domain injection or app-specific variant flags. Customer-specific compositions belong in `projects/customer/src/app/ui` or layout/features.

### Testing and quality gates

- Priority: guards/error mapping → stores → components with behavior → feature integration → e2e happy path. Use Vitest with generated-service/OIDC fakes; avoid superficial text-only tests.
- Test business-visible states, race/concurrency behavior, auth boundaries, navigation, error mappings, and accessibility behavior. Every phase runs relevant affected library tests plus customer build.
- A phase cannot claim live API/auth verification from mocks alone.

### Runtime configuration and API regeneration

- `/assets/config.json` is deployment-owned runtime configuration. It contains public authority/base URLs/client ID/scopes only—never a client secret, token, or private key. Fail fast and visibly if it cannot load.
- For contract updates: `npm run api:copy`, `npm run api:generator:build`, `npm run api:gen:customer`, `npm run api:verify`, affected builds/tests. Review contract/generated changes separately from feature code.

### Security boundaries

- Authorization code + PKCE only; Identity owns login/register/logout UI. No SPA credentials form and no app-owned token persistence in local/session storage.
- Attach bearer tokens only to exact configured customer API base prefix. Validate callback state/nonce and return destinations; clear memory on logout/invalid session.
- Treat backend error details as untrusted display data: show safe user messages, never tokens/stack traces/raw protocol data. Do not use client-side totals, role claims, or guards as authorization substitutes for backend enforcement.

### Performance and Git discipline

- Maintain lazy features and production budgets; optimize only after build/runtime evidence identifies a problem. Avoid N+1 catalog calls, eager heavy assets, and unmeasured abstractions.
- One focused conventional commit per completed phase using the recommended message. Generated contract code always has a separate commit. Never mix formatting sweeps, dependency upgrades, and feature behavior without explicit reason.

## 6. Recommended execution order

Phase 5 first prevents divergent styling, overlay, form, and responsive patterns. Phase 6 then establishes the security boundary all `/api/me/*` work needs. Phase 7 adds the one-time profile gate and menu context that makes cart behavior meaningful. Phases 8 and 9 follow the natural server transaction sequence—cart before checkout—then Phase 10 completes supported customer self-service and post-order views. Phase 11 is deliberately last because it validates the integrated product rather than treating security/accessibility/e2e as vague cleanup.

Phase 5's generic primitives can be developed independently from the existing public catalog restyle once its public API is agreed. Phase 10's read-only orders UI can be prepared in parallel with late Phase 9 only after its route/data boundaries are agreed, but its address work must not duplicate the checkout address form. No cart mutation starts before Phase 7 fixes menu/profile/shell boundaries; checkout cannot start before Phase 8 exits; release hardening cannot claim the milestone before every customer feature exits.

External blockers are: an Angular-22-compatible OIDC choice plus live Identity/CORS/certificate configuration (Phase 6); font licensing/source (Phase 5, non-blocking if fallbacks are approved); observed wire error semantics and no-cart behavior (Phases 7–10); and isolated seeded identity/data plus e2e runner approval (Phase 11).

### Delivery follow-on decision gate

Do not start a delivery implementation from this roadmap. A later delivery roadmap becomes justified only after product/backend owners supply a complete agent journey: how an agent registers, how approval state is obtained, who changes it, role/scope behavior, seeded test identities, and expected handling of pending/rejected/unapproved users. The current delivery OpenAPI supports pending/active/history deliveries, location/status updates, and lifecycle actions only for an already-authorized agent; it cannot truthfully drive four approval states. When that gate exits, create `api-delivery`, a delivery app at port 4300, delivery runtime config/scope, and a separate mobile-first implementation plan.

## 7. Phase-by-phase handoff checklist

Before declaring any phase complete, the implementation agent must confirm:

- [ ] Scope matches this phase; deferred features were not introduced.
- [ ] New files live in the owning app/feature/core/shared location and dependency rules hold; no feature imports another feature.
- [ ] Generated source was not manually edited; all API calls use generated services and runtime base configuration.
- [ ] Loading, error, empty/not-found, retry, responsive, and keyboard/accessibility states are implemented for every changed async view.
- [ ] Auth/guard/token behavior is correct for changed routes and no secret/token is persisted or leaked to another origin.
- [ ] Forms use Signal Forms and backend/domain errors are mapped through typed `AppError` handling or a documented non-Problem-Details adapter.
- [ ] Unit/component/integration tests cover the phase's primary success, meaningful failure, and state-transition paths.
- [ ] Required verification commands pass, manual checks were performed against the relevant hosts, and any unverified external dependency is reported rather than assumed.
- [ ] Production build/budgets remain acceptable for applicable phases; generated-client verification is run when contracts/generator inputs changed.
- [ ] Working tree contains only intended changes; the phase has one focused conventional commit using the recommended message.

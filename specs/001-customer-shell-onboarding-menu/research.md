# Phase 7 Technical Research

**Date**: 2026-08-06  
**Sources**: Current frontend HEAD `bf0c11c`, active specification and clarifications, constitution v1.1.0, Phase 5/6 reports and source, installed Angular 22.1 declarations, generated customer client/OpenAPI, and adjacent backend source at `D:/link-dev/talabat` (read-only inspection).

All planning unknowns are resolved. The remaining Phase 6 live-verification and dirty-tree issues are implementation preflight gates, not technical clarifications.

## Decision 1: Customer Application Owns Profile State

**Decision**: Put `ProfileStore`, `profileGuard`, `onboardingGuard`, and auth/profile coordination under `talabat-web/projects/customer/src/app/core/profile`.

**Rationale**: Constitution Principle III places customer-domain state in the customer application. Current `core-auth` is domain-neutral and imports no generated customer API. App ownership permits injection of both `AuthStore` and `CustomerApiService` without reversing dependencies or making authentication depend on a business domain.

**Alternatives considered**:

- Put `ProfileStore` in `core-auth`: rejected because it creates `core-auth -> api-customer` and contradicts the current constitution, even though the older roadmap offered it as an option.
- Create a new profile library: rejected because only the customer app consumes it and no second-application reuse exists.

## Decision 2: Once-Per-Authenticated-Subject Profile Cache

**Decision**: Use a root app service with private writable signals, readonly public state, a cached subject, and one shared in-flight promise. Cache terminal loaded/missing states until auth subject/session changes; clear errors for explicit retry.

**Rationale**: `AuthStore` already exposes readonly `user` and `isAuthenticated` signals, but no public token signal or generic lifecycle output. Subject-scoped app coordination keeps the cache independent from tokens, avoids duplicate concurrent guard calls, and resets stale customer data after logout/expiry/session replacement.

**Alternatives considered**:

- Time-based cache: rejected because the clarification requires once per session and profile existence changes only through owned onboarding in this phase.
- Resource directly inside each guard/page: rejected because concurrent routes would duplicate requests and state would not be shared.
- Persisted profile cache: rejected for security/staleness and because no persistence is required.

## Decision 3: Missing Profile Requires Both Typed Code And Expected Status

**Decision**: Treat only `AppErrorCode.ProfileNotCreated` with HTTP 404 from `GET /api/me/profile` as `missing`.

**Rationale**: Backend `RequireCustomerProfileAttribute` emits exactly that shape. Other 404s such as `CustomerNotFound`, network failures, 401, 403, and 500 have different meanings and cannot safely start onboarding.

**Alternatives considered**:

- Any 404 means missing: rejected because current backend has other profile-related 404 paths.
- Raw backend-detail matching: rejected because it is unstable and prohibited by the constitution.

## Decision 4: Separate Normal Profile Guard And Onboarding Guard

**Decision**: Use `[authGuard, profileGuard]` for profile-required routes and `[authGuard, onboardingGuard]` for onboarding. Keep onboarding exempt from `profileGuard`.

**Rationale**: The clarification requires onboarding to avoid profile-guard loops but also requires existing-profile users to leave onboarding. One guard cannot both be absent and perform that redirect. A separate inverse guard reuses `ProfileStore.ensureLoaded()` without changing normal guard semantics.

**Alternatives considered**:

- Attach `profileGuard` to onboarding with route flags: rejected because it makes the guard dual-purpose and weakens the clear route invariant.
- Redirect from the onboarding component after render: rejected because protected routing behavior belongs in guards and would flash the form.

## Decision 5: Retain `/auth-check` As The Only Phase 7 Profile-Required Diagnostic

**Decision**: Keep `/auth-check` as clarified, remove it from public shell navigation, and apply `[authGuard, profileGuard]`. Do not invent `/cart`, `/orders`, `/checkout`, or profile-edit routes.

**Rationale**: Current Phase 7 production routes are public catalog/menu and auth-only onboarding. There is otherwise no legitimate profile-required destination to exercise guard ordering. The active clarification explicitly retains `/auth-check` as dev-only; Phase 8 or later protected routes replace it.

**Alternatives considered**:

- Add future protected placeholders: rejected as out-of-phase and deceptive.
- Profile-guard public menu/list: rejected because catalog must remain anonymous.
- Remove `/auth-check`: rejected because it conflicts with the recorded clarification and leaves no route-level profile guard consumer.

## Decision 6: Use Installed Angular 22.1 Signal Forms APIs

**Decision**: Use `form`, `required`, `min`, custom `validate`, `disabled({ when })`, `FormField`, `submit`, `markAsTouched`, `errorSummary`, and `focusBoundControl` from `@angular/forms/signals`.

**Rationale**: Installed declarations at `node_modules/@angular/forms/types/signals.d.ts` and `_structure-chunk.d.ts` mark these APIs public in Angular 22.0/22.1. `submit()` natively prevents concurrent submissions and integrates returned validation errors. Native `[formField]` controls avoid legacy reactive forms and a one-off custom-control adapter.

**Alternatives considered**:

- `FormBuilder`/Reactive Forms: constitutionally prohibited.
- Handwritten signals with `(input)`: rejected because the phase expressly requires Signal Forms.
- Retrofit `tal-input` as a Signal Forms custom control: rejected as unnecessary shared-library scope; current `tal-input` has value/output bindings rather than the installed custom-control contract.

## Decision 7: Validation Mirrors Only Confirmed Backend Rules

**Decision**: Require trimmed nonblank full name and positive integer age. Treat phone input as nullable text and always send `phoneNumber: string | null`. Do not add phone-format validation.

**Rationale**: Backend `Guard.RequiredText` trims/requires name, `Guard.Positive` requires age > 0, and `Guard.OptionalText` trims/nulls phone but validates no pattern. Generated TypeScript requires the phone key even when null.

**Alternatives considered**:

- Spec-invented phone regex: rejected because it is not an authoritative backend rule.
- Omit blank phone property: rejected because generated `CreateProfileRequest` requires it.
- Add a full-name max solely from EF column length: rejected for Phase 7 because it is absent from OpenAPI/domain rules; backend contract should be corrected separately if this becomes a user-facing validation requirement.

## Decision 8: Refetch Profile After Create

**Decision**: After generated `createProfile()` succeeds, deliberately call generated `getProfile()` and cache that canonical response.

**Rationale**: Backend persistence trims/null-normalizes values, but the POST response is constructed from the raw request. Caching it can display data that differs from the next GET. A refetch is deliberate, bounded, and not an N+1 menu pattern.

**Alternatives considered**:

- Cache POST response: rejected because it is observably noncanonical.
- Duplicate backend normalization in the frontend and cache: rejected because the backend remains authoritative and future normalization could change.

## Decision 9: General Server Validation Summary, Not Fabricated Field Errors

**Decision**: Map `InvalidCustomerProfile` to a safe form-level submission error/summary. Keep client-known validation on fields. Do not parse `detail` text to infer a field.

**Rationale**: Current backend returns a single code/detail and no stable errors dictionary or field identifier. Automatic `[ApiController]` model-state responses also do not guarantee the custom root code. Field mapping without a contract would depend on raw strings.

**Alternatives considered**:

- Parse exception text: rejected as brittle and unsafe.
- Attach every server error to every field: rejected as inaccurate and inaccessible.
- Backend edit: out of scope for this frontend planning phase.

## Decision 10: `rxResource()` Adapts Generated Menu Observable

**Decision**: Use `rxResource()` from `@angular/core/rxjs-interop` with route-derived params and `CatalogApiService.getRestaurantMenu({ restaurantId })`.

**Rationale**: The installed API is public in Angular 22 and accepts an Observable stream. Generated services return cold HttpClient observables. Resource replacement unsubscribes on param change/destroy, aborting stale HTTP; `.reload()` supplies retry. This keeps one signal/resource pattern without direct `HttpClient`.

**Alternatives considered**:

- `httpResource()` with a reconstructed URL: rejected because feature code would bypass the generated service boundary.
- `resource()` + `firstValueFrom()`: current list uses it, but it does not connect resource abort to observable cancellation.
- Manual subscriptions/effects: rejected due to more lifecycle state and weaker consistency.

## Decision 11: Render Only Actual Menu Contract Data

**Decision**: Render `restaurantName`, products, `price`, and `isAvailable`. Use a stable decorative placeholder slot for every product. Do not show restaurant description/status or attempt an image URL.

**Rationale**: Actual `MenuResponse` has `restaurantId`, `restaurantName`, and `products`; `MenuProductDto` has no image. The endpoint is `/api/catalog/restaurants/{restaurantId}/menu`, not the path written in FR-017. A list lookup would be an additional request and cannot safely support direct links or missing list entries.

**Alternatives considered**:

- N+1/list lookup: rejected by scope/performance and incomplete contract semantics.
- Navigation-state data: rejected because direct/reload navigation must work.
- Generated-client edit: prohibited.
- Backend contract change: potentially desirable later, but must be made/regenerated/committed separately and is not assumed by this phase.

## Decision 12: Centralize Only Owned Phase 7 Error Codes

**Decision**: Add `InvalidCustomerProfile`, `ProfileAlreadyExists`, and `RestaurantNotFound` to `AppErrorCode`; preserve `ProfileNotCreated` and `Unknown`.

**Rationale**: These codes drive owned onboarding/menu actions. The interceptor already maps recognized root codes centrally. Broader backend code mirroring is unnecessary.

**Alternatives considered**:

- Branch on statuses in each feature: rejected by constitution and loses semantic distinction.
- Add every backend code: rejected because Phase 7 has no owned action for most codes.

## Decision 13: No Fake Local Cart; Expose A Deferred Entry Request

**Decision**: Supersede specification Q7/Q8 and FR-019 where they require `LocalCartEntryService`, local count, item summary, or "Added" feedback. Expose `{ restaurantId, productId }` and give an explicit deferred/no-mutation response through a CDK dialog/sheet.

**Rationale**: The latest user instruction explicitly forbids server cart mutation, local fake cart, quantity state, and totals, while requiring no deceptive success or permanently dead action. An informative, interactive handoff is truthful and allows Phase 8 to connect the stable identifiers.

**Alternatives considered**:

- Local count/items: explicitly prohibited and deceptive.
- Server add in Phase 7: pulls Phase 8 business mutation into this phase and is prohibited.
- Permanently disabled/dead button: rejected because it fails the handoff requirement.
- "Added" toast without state: rejected as false success.

## Decision 14: Shell Uses Existing Tailwind/CDK Capabilities

**Decision**: Place shell layout in the customer app, reuse FoodDash tokens/shared primitives, and use existing CDK dialog/sheet behavior for deferred cart information.

**Rationale**: `@angular/cdk` and Tailwind v4 are installed, overlay CSS and reduced-motion rules already exist, and `DialogService` already provides focus trapping/restoration. Business mutation remains outside the shell.

**Alternatives considered**:

- Shared shell library: rejected because only customer uses it.
- Angular Material: constitutionally prohibited and not installed.
- Custom modal behavior: rejected because CDK already owns focus/overlay behavior.

## Decision 15: Implementation Preflight Is A Hard Gate

**Decision**: Finish planning but prohibit source implementation until Phase 6 live evidence is complete/committed and `git status --short` is empty.

**Rationale**: Current report explicitly says Phase 7 must not begin, and the current tree has untracked planning files. The user also made both conditions mandatory.

**Alternatives considered**:

- Trust historical automated Phase 6 results: rejected because live browser/API behavior is the stated exit criterion.
- Begin implementation in a dirty tree: rejected by constitution Principle X.

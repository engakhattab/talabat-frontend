# Talabat Frontend — Foundation Implementation Guide (Phases 1–4)

**Version:** 1.0 · **Date:** 2026-08-01
**Governs:** Phases 1–4 only. Phases 5–6 get their own guide; Phases 7+ run through spec-kit.
**Companion documents:** `talabat-angular-plan-v2.md` (architecture), constitution (rules).

**Goal of this guide:** end with real restaurant data from `https://localhost:7056` rendering at
`http://localhost:4200`. Deliberately unstyled. Styling is Phase 5.

**Rule for the agent:** complete one step, run its verification, report, then continue. Do not batch
steps. Do not skip verification. If a verification fails, stop and report — do not work around it.

---

## Prerequisites

```bash
node --version        # must satisfy Angular 22's floor
npm --version
java -version         # required by openapi-generator-cli
dotnet --version
```

Backend must run locally. From the backend repo:

```bash
dotnet dev-certs https --trust      # do this before Phase 4 or CORS errors will mislead you
```

Start all three hosts and confirm in a browser:
- `https://localhost:7237` — Identity
- `https://localhost:7056/swagger` — Customer API
- `https://localhost:7225/swagger` — Delivery API

Confirm `GET https://localhost:7056/api/catalog/restaurants` returns data without a token. If it
returns 401, catalog is not public and the rest of this guide will not work as written.

---

# Phase 1 — Workspace Foundation

**Exit criterion:** `ng serve customer` renders a placeholder; `ng build` and `ng test` pass.

## 1.1 Create the workspace

```bash
npm i -g @angular/cli@22
ng new talabat-web --no-create-application --package-manager=npm
cd talabat-web
git init && git add -A && git commit -m "chore: initialise workspace"
```

`--no-create-application` is deliberate: this is a multi-project workspace, so there must be no
application at the root.

## 1.2 Generate the customer application

```bash
ng generate application customer --routing --style=css --ssr=false
```

**`--style=css`, not scss.** Tailwind v4 is CSS-first; SCSS adds a compilation layer you will not
use and that complicates the `@theme` block.

**`--ssr=false`** — SSR is out of scope per the constitution.

## 1.3 Generate the libraries

```bash
ng generate library core-config  --prefix=tal
ng generate library core-auth    --prefix=tal
ng generate library core-http    --prefix=tal
ng generate library shared-ui    --prefix=tal
ng generate library shared-util  --prefix=tal
```

`api-customer` is **not** generated here — the OpenAPI generator creates it in Phase 2.

## 1.4 Path aliases

Confirm `tsconfig.json` contains a `paths` entry per library. The CLI adds these automatically;
verify rather than assume. Expected shape:

```
"@talabat/core-config": ["projects/core-config/src/public-api.ts"]
```

If the CLI used a different alias prefix, rename all five to `@talabat/*` for consistency.

## 1.5 Strict TypeScript

In the root `tsconfig.json`, under `compilerOptions`, ensure:

```
"strict": true,
"noImplicitOverride": true,
"noPropertyAccessFromIndexSignature": true,
"noImplicitReturns": true,
"noFallthroughCasesInSwitch": true,
"noUncheckedIndexedAccess": true
```

`noUncheckedIndexedAccess` is the important one — it forces you to handle `undefined` from array
indexing, which is where most runtime errors in API-driven UIs come from.

## 1.6 Dev server port

In `angular.json`, under `projects.customer.architect.serve.options`, set `"port": 4200`.
This must match the registered OIDC redirect URI and the backend CORS policy exactly.

## 1.7 Verify zoneless

Angular 22 scaffolds zoneless by default. Confirm both:

- `package.json` has **no** `zone.js` dependency
- `projects/customer/src/app/app.config.ts` contains `provideZonelessChangeDetection()`

If `zone.js` is present, the CLI fell back to zone-based change detection. Stop and report — do not
proceed, because every subsequent pattern in the plan assumes zoneless.

## 1.8 Verification

```bash
ng build customer
ng test customer --watch=false
ng serve customer
```

Open `http://localhost:4200`. A placeholder must render with no console errors.

```bash
git add -A && git commit -m "feat: workspace foundation with core and shared libraries"
```

**Do not** add Tailwind, Angular CDK, auth, or any feature code in this phase.

---

# Phase 2 — Generated API Clients

**Exit criterion:** six typed services compile; no `any` in any signature; enums are string unions.

## 2.1 Known issue — read before generating

The backend emits **OpenAPI 3.1**, and .NET 10 expresses integers as a union with a pattern:

```json
"id": { "type": ["integer", "string"], "format": "int32", "pattern": "^-?(?:0|[1-9]\\d*)$" }
```

A TypeScript generator will faithfully translate this to `id: number | string`. Every numeric field
in your client becomes a union, and arithmetic on it will not compile without casting.

**Preferred fix (backend, ~10 minutes):** configure both hosts to emit OpenAPI 3.0, which has no
union types, then regenerate and re-copy the documents. In each host's OpenAPI registration:

```csharp
options.OpenApiVersion = Microsoft.OpenApi.OpenApiSpecVersion.OpenApi3_0;
```

**Fallback (frontend):** generate against 3.1 and accept `number | string`, normalising at the
boundary. This is worse — it pushes a backend formatting artifact into every feature.

**Attempt the backend fix first.** If it is not possible, report and proceed with the fallback.

Second known issue: the `ProblemDetails` schema declares only `type`, `title`, `status`, `detail`,
`instance`. **`errorCode` is not in it** because it is an RFC 9457 extension member. The generated
interface will lack it. Phase 3 handles this by declaring an extended interface in `core-http` —
do not edit the generated file.

## 2.2 Copy the OpenAPI documents

```bash
mkdir -p openapi
cp ../Talabat_API/src/Talabat/Talabat.API/openapi/customer-api.json openapi/
cp ../Talabat_API/src/Talabat/Talabat.Delivery.API/openapi/delivery-api.json openapi/
```

Add an npm script so this is repeatable — adjust the relative path to match your layout:

```json
"api:copy": "cp ../Talabat_API/src/Talabat/Talabat.API/openapi/customer-api.json openapi/ && cp ../Talabat_API/src/Talabat/Talabat.Delivery.API/openapi/delivery-api.json openapi/"
```

## 2.3 Install the generator

```bash
npm i -D @openapitools/openapi-generator-cli
npx openapi-generator-cli version-manager set 7.11.0
```

Pinning the generator version matters: an unpinned generator regenerates differently on a different
machine, producing spurious diffs.

## 2.4 Generator config

`openapi/customer.config.json`:

```json
{
  "generatorName": "typescript-angular",
  "inputSpec": "openapi/customer-api.json",
  "output": "projects/api-customer/src",
  "additionalProperties": {
    "npmName": "@talabat/api-customer",
    "serviceSuffix": "ApiService",
    "stringEnums": true,
    "providedInRoot": true,
    "useSingleRequestParameter": true,
    "withInterfaces": false,
    "supportsES6": true,
    "fileNaming": "kebab-case",
    "enumPropertyNaming": "PascalCase"
  }
}
```

- `serviceSuffix: ApiService` prevents collisions with your own `CartStore` / `CatalogService`
- `stringEnums: true` produces string union types rather than TypeScript `enum`
- `providedInRoot: true` means no manual DI registration
- `useSingleRequestParameter: true` gives `addCartItem({ productId, quantity })` instead of
  positional arguments — far more readable and resilient to parameter reordering

## 2.5 Generate

```bash
npx openapi-generator-cli generate -c openapi/customer.config.json
```

Add npm scripts:

```json
"api:gen:customer": "openapi-generator-cli generate -c openapi/customer.config.json",
"api:gen": "npm run api:copy && npm run api:gen:customer"
```

## 2.6 Wire the library into the workspace

The generator writes source files but no Angular library scaffolding. Ensure:

- `projects/api-customer/ng-package.json` exists with `"lib": { "entryFile": "src/index.ts" }`
- A `projects.api-customer` entry exists in `angular.json` (copy the shape of another library)
- `tsconfig.json` has `"@talabat/api-customer": ["projects/api-customer/src/index.ts"]`

Create `projects/api-customer/README.md`:

```markdown
# api-customer — GENERATED, DO NOT EDIT
Generated from `openapi/customer-api.json` by `npm run api:gen`.
Any manual edit will be overwritten. To change this client, change the backend contract.
```

## 2.7 Verification

Expect exactly six services:

`CatalogApiService` · `CartApiService` · `CheckoutApiService` · `OrdersApiService` ·
`CustomerApiService` · `AddressesApiService`

Confirm the method names read as operation names, not path fragments:

| Service | Methods |
|---|---|
| `CatalogApiService` | `getRestaurants`, `getRestaurantMenu` |
| `CartApiService` | `getCart`, `clearCart`, `addCartItem`, `updateCartItemQuantity`, `removeCartItem` |
| `CheckoutApiService` | `checkout` |
| `OrdersApiService` | `getOrders`, `getOrderDetails` |
| `CustomerApiService` | `getProfile`, `createProfile`, `updateProfile` |
| `AddressesApiService` | `addAddress`, `removeAddress`, `setDefaultAddress` |

Then check:

```bash
grep -rn ": any" projects/api-customer/src/api/     # must return nothing
ng build api-customer
```

- [ ] `RestaurantSummaryDto` has `id: number` (not `number | string`) — confirms §2.1 was resolved
- [ ] `MoneyDto` has `amount: number`, `currency?: string`
- [ ] No `any` in any service signature

```bash
git add -A && git commit -m "feat: generate typed customer API client from OpenAPI"
```

**Commit generated code separately from feature work**, always. A contract change should be
reviewable on its own.

---

# Phase 3 — Runtime Configuration & HTTP Foundation

**Exit criterion:** a deliberately failing request produces a typed `AppError` and a visible message.

## 3.1 `core-config` — the config contract

`projects/core-config/src/lib/app-config.ts`:

```ts
export interface AppConfig {
  readonly identityAuthority: string;
  readonly customerApiBaseUrl: string;
  readonly clientId: string;
  readonly scopes: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
```

## 3.2 Startup loader

`projects/core-config/src/lib/provide-app-config.ts`:

```ts
export function provideAppConfig(): EnvironmentProviders {
  let config: AppConfig | undefined;
  return makeEnvironmentProviders([
    provideAppInitializer(async () => {
      const res = await fetch('/assets/config.json');
      if (!res.ok) throw new Error(`Config load failed: ${res.status}`);
      config = await res.json();
    }),
    {
      provide: APP_CONFIG,
      useFactory: () => {
        if (!config) throw new Error('APP_CONFIG read before initialisation');
        return config;
      },
    },
  ]);
}
```

Throwing on missing config is intentional. A silent default would let the app boot against the wrong
backend — a failure that surfaces much later and much more confusingly.

`projects/customer/public/assets/config.json`:

```json
{
  "identityAuthority": "https://localhost:7237",
  "customerApiBaseUrl": "https://localhost:7056",
  "clientId": "talabat-customer-spa",
  "scopes": "openid profile roles customer.api offline_access"
}
```

Add to `angular.json` assets if not already covered. **This file is deployed, not bundled** — that
is the entire point of runtime config.

## 3.3 `core-http` — the error contract

`projects/core-http/src/lib/app-error.ts`:

```ts
export const AppErrorCode = {
  ProfileNotCreated: 'ProfileNotCreated',
  Unknown: 'Unknown',
} as const;
export type AppErrorCode = typeof AppErrorCode[keyof typeof AppErrorCode];

/** ProblemDetails plus RFC 9457 root-level extension members. */
export interface TalabatProblemDetails {
  type?: string | null;
  title?: string | null;
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  errorCode?: string | null;
}

export interface AppError {
  readonly status: number;
  readonly code: AppErrorCode;
  readonly title: string;
  readonly detail?: string;
  readonly isNetworkError: boolean;
}
```

`errorCode` is declared here, not in the generated client, because it is an extension member absent
from the generated `ProblemDetails` interface (see §2.1).

## 3.4 The interceptor

`projects/core-http/src/lib/problem-details.interceptor.ts`:

```ts
export const problemDetailsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((e: HttpErrorResponse) => throwError(() => toAppError(e))));

function toAppError(e: HttpErrorResponse): AppError {
  if (e.status === 0) {
    return {
      status: 0,
      code: AppErrorCode.Unknown,
      title: 'Cannot reach the server',
      isNetworkError: true,
    };
  }
  const body = e.error as TalabatProblemDetails | null;
  const raw = body?.errorCode ?? undefined;
  const code: AppErrorCode =
    raw && raw in AppErrorCode ? (raw as AppErrorCode) : AppErrorCode.Unknown;

  return {
    status: e.status,
    code,
    title: body?.title ?? 'Something went wrong',
    detail: body?.detail ?? undefined,
    isNetworkError: false,
  };
}
```

Unrecognised codes degrade to `Unknown` rather than throwing. The backend will add error codes over
time; the frontend must not break when it does.

Status 0 is handled separately because it means network failure, CORS rejection, or an untrusted
certificate — none of which produce a ProblemDetails body, and all of which you will hit in Phase 4.

## 3.5 Correlation id

`projects/core-http/src/lib/correlation-id.interceptor.ts` — attach `X-Correlation-Id:
crypto.randomUUID()` to every request. Costs nothing now, and makes cross-host log correlation
possible when the backend adds structured logging.

## 3.6 Wire it up

`projects/customer/src/app/app.config.ts`:

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAppConfig(),
    provideHttpClient(withInterceptors([correlationIdInterceptor, problemDetailsInterceptor])),
    {
      provide: BASE_PATH,
      useFactory: () => inject(APP_CONFIG).customerApiBaseUrl,
    },
  ],
};
```

`BASE_PATH` comes from the generated client. **This is the only place an API URL appears.**

## 3.7 Verification

Temporarily point `customerApiBaseUrl` at a nonexistent port, call any endpoint, and confirm you
receive an `AppError` with `isNetworkError: true` — not a raw `HttpErrorResponse`. Restore the URL.

```bash
git add -A && git commit -m "feat: runtime config and typed HTTP error handling"
```

---

# Phase 4 — First Vertical Slice

**Exit criterion:** real restaurant data from `:7056` renders at `:4200`.

**This is the milestone.** It proves CORS, the dev certificate, runtime config, the generated
client, the error interceptor, signals, and the build — simultaneously. Keep it ugly.

## 4.1 Routes

`projects/customer/src/app/app.routes.ts`:

```ts
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'restaurants' },
  {
    path: 'restaurants',
    loadChildren: () => import('./features/catalog/routes').then(m => m.routes),
  },
];
```

`projects/customer/src/app/features/catalog/routes.ts`:

```ts
export const routes: Routes = [
  { path: '', component: RestaurantListPage },
];
```

Every feature route is lazy from the first one. Retrofitting lazy loading later means restructuring
every route file.

## 4.2 The page

`projects/customer/src/app/features/catalog/pages/restaurant-list.page.ts`:

```ts
@Component({
  selector: 'tal-restaurant-list-page',
  template: `
    <h1>Restaurants</h1>

    @if (restaurants.isLoading()) {
      <p>Loading…</p>
    } @else if (restaurants.error(); as err) {
      <p role="alert">{{ err.title }}</p>
    } @else if (restaurants.value()?.items?.length === 0) {
      <p>No restaurants available.</p>
    } @else {
      <ul>
        @for (r of restaurants.value()!.items; track r.id) {
          <li>
            <strong>{{ r.name }}</strong>
            <span>{{ r.description }}</span>
          </li>
        }
      </ul>
    }
  `,
})
export class RestaurantListPage {
  private readonly api = inject(CatalogApiService);
  readonly restaurants = httpResource(() => this.api.getRestaurants());
}
```

Four states rendered explicitly: loading, error, empty, data. This is mandatory for every async view
in the project — not a Phase 4 nicety.

`track r.id` is required by `@for`.

## 4.3 Verification

```bash
ng serve customer
```

Open `http://localhost:4200/restaurants`. Real restaurant names must render.

Then verify in DevTools:
- [ ] Network tab shows a request to `https://localhost:7056/api/catalog/restaurants`
- [ ] `X-Correlation-Id` is present on the request
- [ ] No `Authorization` header (catalog is public — this confirms nothing leaks a token later)
- [ ] Zero console errors
- [ ] Stopping the backend produces "Cannot reach the server", not a stack trace

```bash
git add -A && git commit -m "feat: restaurant list vertical slice"
```

---

## Phase 4 troubleshooting

Work through these in order. Most Phase 4 failures are one of the first three.

**`ERR_CERT_AUTHORITY_INVALID` / status 0.**
The dev certificate is untrusted. Run `dotnet dev-certs https --trust` and restart the browser.
Visiting `https://localhost:7056/swagger` once and accepting the warning also works, and is a useful
diagnostic on its own.

**CORS error in console.**
The backend allows `http://localhost:4200` exactly. Confirm you are on port 4200 and scheme `http`.
Angular on `https` or on port 4201 will be rejected. Check the backend's `SpaCorsPolicy`.

**`APP_CONFIG read before initialisation`.**
`config.json` is not being served. Confirm it resolves at
`http://localhost:4200/assets/config.json` in the browser. If it 404s, the assets entry in
`angular.json` is wrong.

**`NullInjectorError: No provider for BASE_PATH`.**
The generated client was built with `providedInRoot: true` but `BASE_PATH` was not provided. See
§3.6.

**Numeric fields typed `number | string`.**
The OpenAPI 3.1 union issue from §2.1 was not resolved. Fix the backend to emit 3.0, re-copy, and
regenerate.

**`restaurants.value()` is `undefined` on first render.**
Expected. `httpResource` starts undefined. The `@if` chain in §4.2 handles it — do not add `?.` and
`!` scattered through the template instead.

**Blank page, no errors.**
The route did not match. Confirm the redirect in §4.1 and that the lazy chunk loads in the Network
tab.

---

## Exit summary

At the end of Phase 4 you have:

- A multi-project workspace with five libraries and one application
- A fully typed, generated API client regenerable with one command
- Runtime configuration with one build per environment
- A single typed error contract for every HTTP failure
- One working lazy-loaded feature rendering live backend data

**Next:** Phase 5 (Tailwind + FoodDash tokens + `shared-ui` primitives) and Phase 6
(authentication). Both get their own guide, written after this one is complete — Phase 6 in
particular depends on what you learn here about certificates and CORS.

**Before starting Phase 6**, verify that your chosen OIDC library supports Angular 22. Check the
peer dependency range on `angular-auth-oidc-client`. If it lags, the fallback is `oidc-client-ts`
wrapped in a thin Angular service. Do not begin Phase 6 on an unverified library.

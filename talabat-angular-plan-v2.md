# Talabat Frontend — Angular Architecture & Implementation Plan (v2)

**Version:** 2.0 · **Date:** 2026-08-01 · **Supersedes:** v1.0
**Backend:** `Talabat_API` @ `feature/user-aggregate-refactor`
**Execution model:** Human architect + AI coding agent. This document is the agent's contract.

**Changes from v1.0:** D4 replaced — Tailwind + Angular CDK instead of Angular Material.
FoodDash tokens now govern both apps. Genesis parked. Sections 4–6 added: implementation
standards, code patterns, and agent operating rules.

---

## 0. Backend Facts (verified, do not re-derive)

| Host | HTTPS | Audience | Ops |
|---|---|---|---|
| `Talabat.Identity` | `:7237` | — | Duende, Razor login/register/logout |
| `Talabat.Customer.API` | `:7056` | `talabat.customer.api` | 16 |
| `Talabat.Delivery.API` | `:7225` | `talabat.delivery.api` | 13 |

| Client | Origin | Scopes |
|---|---|---|
| `talabat-customer-spa` | `http://localhost:4200` | `openid profile roles customer.api offline_access` |
| `talabat-delivery-spa` | `http://localhost:4300` | `openid profile roles delivery.api offline_access` |

Code + PKCE, no secret, access token 900s, refresh rotation on.
Callbacks: `/signin-callback`, `/signout-callback`.

**Contract guarantees:** 100% `operationId` + tag coverage · string enums · RFC 9457
`ProblemDetails` with `errorCode` at root · `api/catalog` public, `api/me/*` authenticated ·
`GET /api/me/profile` → **404** when no profile; all other `api/me/*` → **409**; both carry
`errorCode: "ProfileNotCreated"`.

---

## 1. Decisions

| ID | Decision | Rejected |
|---|---|---|
| D1 | **Angular 22** — zoneless, OnPush, Signal Forms, `httpResource`, Vitest all default | v20 LTS |
| D2 | **Angular CLI workspace**, not Nx | Nx (premature); multi-repo |
| D3 | **Customer app first**, delivery scaffolded not built | Both in parallel; customer-only |
| D4 | **Tailwind v4 + Angular CDK**, FoodDash tokens, no Angular Material | Material (M3 conflicts with FoodDash); PrimeNG |
| D5 | **Generated API clients**, committed | Hand-written interfaces; generate-on-build |
| D6 | **No state library** — signals + services | NgRx, SignalStore, Akita |
| D7 | **Separate repository** `Talabat_Web` | Folder inside `Talabat_API` |
| D8 | **FoodDash for both apps**; one token foundation, per-app skin | Genesis for delivery (wrong domain — desktop editorial) |
| D9 | **Delivery mobile-first, customer responsive** | Both responsive; both mobile-only |

### D4 rationale
Both design docs are token specifications, which is literally a Tailwind theme. FoodDash conflicts
with Material Design 3 at the foundation: pill CTAs, 6px spacing base (M3 assumes 4/8), its own
elevation curve. Angular CDK is a separate package from Angular Material and carries no design
language — it supplies `Overlay`, `Dialog`, `A11yModule`, `BidiModule`, plus Angular Aria (stable in
v22) for menu/dialog/combobox patterns.

### D8 rationale
FoodDash already encodes delivery-domain thinking: one-thumb reachability, tap-friendly components,
42–50px controls, and status chips mapped to preparing / on the way / delivered / cancelled — your
delivery lifecycle, pre-tokenized. Genesis describes a desktop editorial platform for browsing
design-system files (72px display type, 1280px container, ⌘K search); it does not fit a courier app.
**Genesis is parked, not deleted** — its published/pending/rejected chips map onto
`AgentApprovalStatus`, making it a candidate for a future admin approval dashboard (out of scope).

---

## 2. Workspace Structure

```
Talabat_Web/
├── openapi/
│   ├── customer-api.json          # copied from backend repo
│   ├── delivery-api.json
│   ├── customer.config.json       # generator config
│   └── delivery.config.json
├── projects/
│   ├── customer/                  # APP — port 4200, responsive
│   ├── delivery/                  # APP — port 4300, mobile-first (Phase 11)
│   ├── api-customer/              # LIB — GENERATED, never edit
│   ├── api-delivery/              # LIB — GENERATED (Phase 11)
│   ├── core-config/               # LIB — runtime config
│   ├── core-auth/                 # LIB — OIDC, guards, token access
│   ├── core-http/                 # LIB — interceptors, ProblemDetails mapping
│   ├── shared-ui/                 # LIB — themed primitives (see §3.3)
│   └── shared-util/               # LIB — pipes, formatters
```

### Dependency rules (agent MUST enforce)

```
apps → features → core-* → api-* → (nothing)
              ↘ shared-*
```

1. `core-*` and `shared-*` MUST NOT import from an app or a feature.
2. Features MUST NOT import from each other.
3. `api-*` depends on nothing in this repo.
4. `shared-ui` components take inputs, emit outputs, inject nothing domain-specific.
5. Features are **folders** inside an app, not libraries. Promote to a library only when a second
   app needs the code.

### App-internal layout (per app)

```
projects/customer/src/app/
├── app.config.ts            # providers
├── app.routes.ts            # top-level routes, all lazy
├── layout/                  # shell, nav, cart FAB
├── ui/                      # app-specific styled components
└── features/
    ├── catalog/  { routes.ts, pages/, components/, catalog.store.ts }
    ├── cart/
    ├── checkout/
    ├── orders/
    └── profile/
```

---

## 3. Design System

### 3.1 Shared token foundation (both apps)

Derived verbatim from `fooddash-DESIGN.md`. Declared in Tailwind v4 CSS-first `@theme`.

**Colors** — primary `#DC2626`, primary-hover `#B91C1C`, secondary `#EA580C`,
success `#16A34A`, warning `#D97706`, error `#EF4444`, info `#2563EB`,
background/surface `#FFFFFF`.
Neutrals: `#171717` `#404040` `#525252` `#A3A3A3` `#D4D4D4` `#E5E5E5` `#F5F5F5` `#FAFAFA`,
tint `#FEF2F2`.

**Typography** — Poppins (headings), DM Sans (body), Roboto Mono (mono). **Self-host all three.**
Scale: h1 28/34 bold · h2 22/28 semibold · h3 18/24 semibold · h4 15/20 semibold ·
body 14/22 · small 12/18 · mono 13/18.

**Spacing** — base **6px**: xs 3 · sm 6 · md 12 · lg 18 · xl 24 · 2xl 36 · 3xl 48.

**Radius** — sm 6 · md 12 · lg 16 · pill 9999.

**Elevation** — sm `0 1px 3px rgba(0,0,0,.08)` · md `0 4px 12px rgba(0,0,0,.12)` ·
lg `0 8px 24px rgba(0,0,0,.16)` · xl `0 12px 32px rgba(0,0,0,.20)` ·
focus `0 0 0 3px rgba(220,38,38,.25)`.

**Status chip mapping** — delivered `#DCFCE7`/`#16A34A` · preparing `#FEF3C7`/`#D97706` ·
cancelled `#FEE2E2`/`#EF4444` · on-the-way `#DBEAFE`/`#2563EB`.

### 3.2 Per-app skin

| Token | Customer | Delivery | Why |
|---|---|---|---|
| `--color-accent` | `#DC2626` | **`#0F766E`** (teal-700) — *confirm* | A courier must never confuse the two apps; FoodDash reserves red for customer-tappable |
| Min tap target | 42px (`md`) | **56px** | One-handed, outdoors, possibly gloved |
| Primary CTA height | 50px (`lg`) | **64px** | Lifecycle actions are high-stakes |
| Body text | 14px | **16px** | Sunlight legibility |
| Layout | Responsive, max-width container | **Mobile-only**, no desktop breakpoints | D9 |

Semantic colors (success/warning/error/info) are **identical across apps** — the same order status
must look the same to a customer and a courier.

### 3.3 `shared-ui` scope

Because both apps share one token foundation, these are genuinely shared:
`Button` · `Card` · `Input` · `Chip` / `StatusChip` · `ListRow` · `Checkbox` · `Radio` ·
`Tooltip` (CDK Overlay) · `Sheet` (CDK Dialog) · `Modal` (CDK Dialog) · `Spinner` ·
`EmptyState` · `ErrorState`.

Color comes from CSS variables, so the same component renders red in customer and teal in delivery
with **no variant prop**. Anything needing an app-specific variant prop belongs in that app's `ui/`
folder instead.

### 3.4 Design constraints that affect flow design

- **"No more than three taps from restaurant page to completed order."** The naive flow
  (menu → add → cart → checkout → confirm) is five. Resolve in Phase 7 design — likely an
  add-to-cart sheet offering direct checkout.
- **Persistent cart FAB** — required by FoodDash rule 10. Lives in `layout/`, not in `features/cart`.
- **Prices and delivery times never use `small`** — FoodDash rule 3.
- **Primary red is never decorative** — FoodDash rule 5.
- **RTL**: neither doc mentions Arabic. Use CSS **logical properties** from day one
  (`ps-*`/`pe-*`/`ms-*`/`me-*`, never `pl-*`/`ml-*`). Costs nothing; retrofitting is expensive.

---

## 4. Implementation Standards (agent MUST follow)

### 4.1 Angular 22 idioms — non-negotiable

| Use | Never |
|---|---|
| Standalone components | `NgModule` |
| `@if` `@for` `@switch` `@defer` | `*ngIf` `*ngFor` `*ngSwitch` |
| `input()` `output()` `model()` | `@Input()` `@Output()` |
| `inject()` | Constructor parameter injection |
| `signal()` `computed()` `linkedSignal()` | `BehaviorSubject` for component state |
| `httpResource()` / `resource()` | Manual `subscribe()` in components |
| Signal Forms (`@angular/forms/signals`) | `FormBuilder` `ReactiveFormsModule` |
| `provideZonelessChangeDetection()` | `zone.js` |
| Vitest | Karma, Jasmine |

**Most Angular material online is v16–v19 and will contradict this table. The table wins.**

### 4.2 Naming and file conventions

```
restaurant-list.page.ts        # routed component      → RestaurantListPage
restaurant-card.component.ts   # presentational        → RestaurantCardComponent
cart.store.ts                  # signal-based state    → CartStore
auth.guard.ts                  # CanActivateFn         → authGuard
problem-details.interceptor.ts # HttpInterceptorFn     → problemDetailsInterceptor
money.pipe.ts                  # pipe                  → MoneyPipe
```
One public symbol per file. Barrel `index.ts` at library root only, never inside features.

### 4.3 Component rules

- `ChangeDetectionStrategy.OnPush` is the v22 default — do not set it explicitly.
- Pages orchestrate and inject stores. Components are presentational: `input()` in,
  `output()` out, no injected domain services.
- Templates read signals as `count()`. Never call a method in a template.
- Every async view MUST render three states explicitly: loading, error, empty.
- No `any`. No non-null assertion (`!`) on API data.

### 4.4 State

- Component-local → `signal()` in the component.
- Feature-wide → a `*.store.ts` service, `providedIn: 'root'`, exposing **readonly** signals plus
  methods. Never expose a `WritableSignal`.
- Server data → `httpResource()` / `resource()`. Do not hand-roll loading flags.
- **Do not install a state library.** If one seems necessary, stop and escalate to the architect.

### 4.5 HTTP

- All HTTP goes through generated `api-*` services. **Never inject `HttpClient` in a feature.**
- `BASE_PATH` is provided from `core-config`. **Never hardcode a URL.**
- Every error is mapped to `AppError` by `problemDetailsInterceptor` before reaching a feature.
- Features branch on `AppErrorCode`, never on a raw string or a bare status number.

### 4.6 Testing (Vitest)

Priority order: guards → error mapping → stores → components with real logic → one E2E happy path.
Do not test that a template renders a string. Do not chase coverage percentages — business
invariants live in the backend, not here.

---

## 5. Code Patterns (agent MUST use these shapes)

### 5.1 Runtime config — `core-config`

```ts
// app-config.ts
export interface AppConfig {
  identityAuthority: string;
  customerApiBaseUrl: string;
  clientId: string;
  scopes: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

// app-config.loader.ts
export function provideAppConfig(): EnvironmentProviders {
  let loaded: AppConfig;
  return makeEnvironmentProviders([
    provideAppInitializer(async () => {
      loaded = await fetch('/assets/config.json').then(r => r.json());
    }),
    { provide: APP_CONFIG, useFactory: () => loaded },
  ]);
}
```
Config is fetched at startup so **one build deploys to every environment**. Never use
`environment.ts` for anything environment-specific.

### 5.2 Error mapping — `core-http`

```ts
export enum AppErrorCode {
  ProfileNotCreated = 'ProfileNotCreated',
  Unknown = 'Unknown',
}

export interface AppError {
  status: number;
  code: AppErrorCode;
  title: string;
  detail?: string;
}

export const problemDetailsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((e: HttpErrorResponse) =>
      throwError(() => toAppError(e))
    )
  );
```
`errorCode` sits at the **root** of the ProblemDetails body (RFC 9457), not under `extensions`.
Unrecognised codes map to `Unknown` — never crash on an unexpected code.

### 5.3 Auth interceptor — token scoping

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const cfg = inject(APP_CONFIG);
  const auth = inject(AuthStore);
  if (!req.url.startsWith(cfg.customerApiBaseUrl)) return next(req);   // exact prefix
  const token = auth.accessToken();
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};
```
**Match on the configured base URL prefix, never a substring like `includes('api')`.** A token
scoped to `customer.api` must never reach the delivery API or a third party.

### 5.4 Profile gate — `core-auth`

```ts
export const profileGuard: CanActivateFn = async () => {
  const profile = inject(ProfileStore);
  const router = inject(Router);
  if (await profile.ensureLoaded()) return true;
  return router.createUrlTree(['/onboarding']);
};
```
`ProfileStore.ensureLoaded()` probes `GET /api/me/profile` **once** and caches the result in a
signal. **404 means "no profile"** — that endpoint is the single unambiguous signal. The 409s
elsewhere are defence in depth handled by the interceptor, not by the guard.

### 5.5 Server data in a page

```ts
@Component({ /* ... */ })
export class RestaurantListPage {
  private readonly api = inject(CatalogApiService);
  readonly restaurants = httpResource(() => this.api.getRestaurants());
}
```
```html
@if (restaurants.isLoading()) { <app-spinner /> }
@else if (restaurants.error()) { <app-error-state [error]="restaurants.error()!" /> }
@else if (restaurants.value()?.length === 0) { <app-empty-state /> }
@else { @for (r of restaurants.value()!; track r.id) { <app-restaurant-card [restaurant]="r" /> } }
```
`track` is mandatory in `@for`.

### 5.6 Store

```ts
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly api = inject(CartApiService);
  private readonly _cart = signal<CartResponse | null>(null);

  readonly cart = this._cart.asReadonly();
  readonly itemCount = computed(() =>
    this._cart()?.items?.reduce((n, i) => n + i.quantity, 0) ?? 0);

  async addItem(productId: number, quantity: number): Promise<void> {
    this._cart.set(await firstValueFrom(this.api.addCartItem({ productId, quantity })));
  }
}
```
Writable signal private; readonly signal + `computed` public. **Never expose a `WritableSignal`.**
No cart item stores a price — display the current catalog price, always.

### 5.7 Signal Forms

```ts
export class OnboardingPage {
  readonly model = signal({ fullName: '', age: null as number | null, phoneNumber: '' });
  readonly form = form(this.model, (p) => {
    required(p.fullName);
    required(p.age);
    min(p.age, 18);
  });
}
```
Signal Forms only. No `FormBuilder`, no `FormGroup`, no `ControlValueAccessor`.

### 5.8 Route with lazy loading + guards

```ts
export const routes: Routes = [
  { path: 'restaurants', loadChildren: () => import('./features/catalog/routes').then(m => m.routes) },
  { path: 'cart', canActivate: [authGuard, profileGuard],
    loadChildren: () => import('./features/cart/routes').then(m => m.routes) },
];
```
Every feature route is lazy. Guard order is always `authGuard` then `profileGuard`.

---

## 6. Agent Operating Rules

1. **Never edit `projects/api-*/`.** Generated. To change it, change the backend contract and
   regenerate.
2. **Never install a package not named in this plan** without escalating.
3. **Never use `localStorage` or `sessionStorage` for tokens.** Memory only.
4. **Never write a login or registration form.** Those are Razor Pages on `Talabat.Identity`; the
   SPA only redirects.
5. **Never compute an order total client-side and treat it as authoritative.** The backend is the
   source of truth.
6. **Never mirror backend Clean Architecture layers** (`domain/`, `application/`) in Angular. The
   unit of architecture here is the library.
7. **Never add a feature not in the current phase.** Out of scope: payments, notifications, coupons,
   reviews, admin, restaurant-owner, SignalR, maps, search, i18n, SSR, PWA, dark mode.
8. **Stop at each phase exit criterion** and report. Do not begin the next phase unprompted.
9. **When the plan and a web example disagree, the plan wins.** Report the conflict.
10. **If a requirement is ambiguous, ask.** Do not guess and proceed.

---

## 7. Phases

Each phase has an exit criterion. Do not proceed until it is met.

| # | Phase | Exit criterion |
|---|---|---|
| 1 | Workspace foundation | `ng serve customer` renders a placeholder; build + test pass |
| 2 | Generated API clients | Six typed services compile; no `any`; enums are string unions |
| 3 | Config + HTTP foundation | A failing request yields a typed `AppError` and a visible message |
| 4 | **First vertical slice** | Real restaurant data from `:7056` renders at `:4200` — unstyled |
| 5 | Design system | FoodDash tokens in `@theme`; `shared-ui` primitives built and used |
| 6 | Authentication | Login → `:7237` → back authenticated; `api/me/*` returns 200 |
| 7 | Profile gate + shell | New account → onboarding → catalog; cart FAB present |
| 8 | Cart | Add / update / remove with badge in sync |
| 9 | Checkout | Order placed; price-change conflict path tested |
| 10 | Orders + profile | History, detail, profile, addresses, empty states |
| 11 | Hardening | Budgets enforced, tests pass, one E2E happy path |
| 12 | Delivery app | Four approval states; lifecycle transitions; mobile-only |

**Phase 4 is the milestone.** It proves CORS, the dev certificate, runtime config, the generated
client, the error interceptor, signals, and the build — all at once. Keep it deliberately ugly;
styling is Phase 5.

### Phase-specific notes

**Phase 2** — `openapi-generator-cli`, `typescript-angular`, `serviceSuffix: ApiService`,
`stringEnums: true`, `providedInRoot: true`. Verify the three 204 operations produce
`Observable<void>`.

**Phase 6 — highest risk.** Verify your OIDC library supports Angular 22 **before** starting.
Check `angular-auth-oidc-client` peer deps; fallback is `oidc-client-ts` wrapped in a thin service.
Do not proceed on an unverified library.

**Phase 12 — blocked on backend.** Nothing currently approves a delivery agent. Decide the
mechanism (seed, manual DB update, or new endpoint) before starting. Approval propagates on
**token refresh** — up to 15 minutes with a 900s token — so the pending screen must poll and force
a refresh.

---

## 8. Beginner Mistakes This Plan Prevents

| Mistake | Prevented by |
|---|---|
| NgRx on day one | D6, §4.4 |
| Hand-written API interfaces | D5, §4.5 |
| Tokens in `localStorage` | §6.3 |
| Auth logic in components | §5.3, §5.4 |
| Following v16-era tutorials | §4.1 |
| Mirroring Clean Architecture in Angular | §6.6 |
| Shared component library too early | §2 |
| `environment.ts` per environment | §5.1 |
| Editing generated code | §6.1 |
| Client-side order totals | §6.5 |
| Physical CSS properties breaking RTL | §3.4 |
